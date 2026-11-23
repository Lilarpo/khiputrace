use anchor_lang::{
    error::Error, prelude::*, AccountDeserialize, AccountSerialize, AnchorDeserialize,
    AnchorSerialize,
};
use khiputrace::{
    domain::rules::{counters_after_creation, normalized_text, FindingCounters, ModelError},
    instructions::{create_audit::build_audit, create_finding::build_finding},
    state::{
        audit::Audit,
        finding::{Finding, FindingStatus, Severity},
        read::{read_audit, read_finding},
        seeds::{audit_address, finding_address},
    },
};
use std::collections::BTreeSet;

struct StoredAccount {
    key: Pubkey,
    owner: Pubkey,
    lamports: u64,
    data: Vec<u8>,
}

impl StoredAccount {
    fn new<T: AccountSerialize>(key: Pubkey, value: &T, space: usize) -> Self {
        let mut data = Vec::new();
        value
            .try_serialize(&mut data)
            .expect("serialización de fixture");
        assert!(data.len() <= space);
        data.resize(space, 0);
        Self {
            key,
            owner: khiputrace::ID,
            lamports: 1_000_000,
            data,
        }
    }

    fn info(&mut self) -> AccountInfo<'_> {
        AccountInfo::new(
            &self.key,
            false,
            false,
            &mut self.lamports,
            &mut self.data,
            &self.owner,
            false,
            0,
        )
    }
}

fn audit_fixture() -> (Pubkey, Audit) {
    let authority = Pubkey::new_from_array([7; 32]);
    let (address, bump) = audit_address(&authority, 42);
    let mut audit =
        build_audit(authority, 42, "  Auditoría sintética  ", bump).expect("auditoría válida");
    audit.next_finding_id = 1;
    audit.active_findings = 1;
    audit.open_findings = 1;
    (address, audit)
}

fn assert_error<T>(result: Result<T>, expected: &str) {
    match result {
        Err(Error::AnchorError(error)) => assert_eq!(error.error_name, expected),
        Err(other) => panic!("Error inesperado: {other:?}"),
        Ok(_) => panic!("Se esperaba el error {expected}"),
    }
}

#[test]
fn creation_initializes_only_allowed_fields_and_normalizes_text() {
    let authority = Pubkey::new_from_array([7; 32]);
    let (address, bump) = audit_address(&authority, 42);
    let audit = build_audit(authority, 42, " \nAuditoría\t ", bump).expect("creación base");
    assert_eq!(audit.authority, authority);
    assert_eq!(audit.audit_id, 42);
    assert_eq!(audit.version, 1);
    assert_eq!(audit.title, "Auditoría");
    assert_eq!(
        (
            audit.next_finding_id,
            audit.active_findings,
            audit.open_findings
        ),
        (0, 0, 0)
    );
    let (_, finding_bump) = finding_address(&address, 0);
    let finding = build_finding(
        address,
        0,
        " Hallazgo ",
        " Descripción sintética ",
        Severity::High,
        finding_bump,
    )
    .expect("hallazgo base");
    assert_eq!(finding.audit, address);
    assert_eq!(finding.finding_id, 0);
    assert_eq!(finding.title, "Hallazgo");
    assert_eq!(finding.description, "Descripción sintética");
    assert_eq!(finding.severity, Severity::High);
    assert_eq!(finding.status, FindingStatus::Open);
    assert_eq!(finding.remediation_note, "");
    assert_eq!(finding.bump, finding_bump);
}

#[test]
fn text_rules_reject_empty_and_oversize_utf8_without_truncation() {
    for text in ["", " \n\t", &"x".repeat(97), &"é".repeat(49)] {
        assert_error(build_audit(Pubkey::default(), 0, text, 1), "InvalidText");
    }
    assert_eq!(
        normalized_text(&"é".repeat(48), 96)
            .expect("96 bytes")
            .len(),
        96
    );
    for description in ["", "  ", &"x".repeat(513), &"é".repeat(257)] {
        assert_error(
            build_finding(
                Pubkey::default(),
                0,
                "Título",
                description,
                Severity::Low,
                1,
            ),
            "InvalidText",
        );
    }
    assert!(build_finding(
        Pubkey::default(),
        0,
        "Título",
        &"é".repeat(256),
        Severity::Low,
        1
    )
    .is_ok());
}

#[test]
fn creation_counters_preserve_sequence_and_reject_stale_ids_and_overflow() {
    let current = FindingCounters {
        next_finding_id: 7,
        active_findings: 4,
        open_findings: 2,
    };
    assert_eq!(
        counters_after_creation(current, 7),
        Ok(FindingCounters {
            next_finding_id: 8,
            active_findings: 5,
            open_findings: 3,
        })
    );
    assert_eq!(
        counters_after_creation(current, 6),
        Err(ModelError::UnexpectedFindingId)
    );
    assert_eq!(current.next_finding_id, 7); // La regla no muta el estado recibido.
    assert_eq!(
        counters_after_creation(
            FindingCounters {
                next_finding_id: u64::MAX,
                ..current
            },
            u64::MAX
        ),
        Err(ModelError::CounterOverflow)
    );
    assert_eq!(
        counters_after_creation(
            FindingCounters {
                next_finding_id: 2,
                active_findings: 3,
                open_findings: 0
            },
            2
        ),
        Err(ModelError::InvalidCounters)
    );
    assert_eq!(
        counters_after_creation(
            FindingCounters {
                next_finding_id: 3,
                active_findings: 2,
                open_findings: 3
            },
            3
        ),
        Err(ModelError::InvalidCounters)
    );
}

#[test]
fn pda_ids_are_eight_byte_little_endian_and_namespaces_are_isolated() {
    let authority = Pubkey::new_from_array([7; 32]);
    let (audit, bump) = audit_address(&authority, 0x0102_0304_0506_0708);
    let expected = Pubkey::create_program_address(
        &[
            b"audit",
            authority.as_ref(),
            &[8, 7, 6, 5, 4, 3, 2, 1],
            &[bump],
        ],
        &khiputrace::ID,
    )
    .expect("PDA audit");
    assert_eq!(audit, expected);
    let (finding, finding_bump) = finding_address(&audit, 9);
    assert_eq!(
        finding,
        Pubkey::create_program_address(
            &[
                b"finding",
                audit.as_ref(),
                &[9, 0, 0, 0, 0, 0, 0, 0],
                &[finding_bump]
            ],
            &khiputrace::ID
        )
        .expect("PDA finding")
    );
    assert_ne!(
        audit,
        audit_address(&Pubkey::new_from_array([8; 32]), 0x0102_0304_0506_0708).0
    );
    assert_ne!(
        audit_address(&authority, 1).0,
        audit_address(&authority, 256).0
    );
    assert_ne!(
        finding_address(&audit, 0).0,
        finding_address(&Pubkey::new_from_array([8; 32]), 0).0
    );
}

#[test]
fn account_roundtrip_includes_discriminator_and_reads_publicly() {
    let (audit_address, audit) = audit_fixture();
    let mut audit_account = StoredAccount::new(audit_address, &audit, Audit::SPACE);
    let (finding_address, bump) = finding_address(&audit_address, 0);
    let finding = build_finding(
        audit_address,
        0,
        "Hallazgo",
        "Descripción",
        Severity::Critical,
        bump,
    )
    .expect("hallazgo");
    let mut finding_account = StoredAccount::new(finding_address, &finding, Finding::SPACE);
    assert_eq!(&audit_account.data[..8], Audit::DISCRIMINATOR);
    assert_eq!(&finding_account.data[..8], Finding::DISCRIMINATOR);
    assert_ne!(Audit::DISCRIMINATOR, Finding::DISCRIMINATOR);
    let audit_info = audit_account.info();
    let finding_info = finding_account.info();
    let decoded = read_audit(&audit_info).expect("lectura sin firmante");
    assert_eq!(decoded.title, "Auditoría sintética");
    let decoded = read_finding(&finding_info, &audit_info).expect("lectura relacionada");
    assert_eq!(decoded.finding_id, 0);
    assert_eq!(decoded.status, FindingStatus::Open);
}

#[test]
fn read_rejects_wrong_owner_discriminator_address_and_bump() {
    let (key, audit) = audit_fixture();
    let mut account = StoredAccount::new(key, &audit, Audit::SPACE);
    account.owner = Pubkey::new_from_array([9; 32]);
    assert_error(read_audit(&account.info()), "InvalidOwner");
    account.owner = khiputrace::ID;
    account.data[0] ^= 1;
    assert_error(read_audit(&account.info()), "AccountDiscriminatorMismatch");
    account = StoredAccount::new(key, &audit, Audit::SPACE);
    account.key = Pubkey::new_from_array([9; 32]);
    assert_error(read_audit(&account.info()), "InvalidPda");
    let mut bad_bump = audit;
    bad_bump.bump = bad_bump.bump.wrapping_sub(1);
    account = StoredAccount::new(key, &bad_bump, Audit::SPACE);
    assert_error(read_audit(&account.info()), "InvalidBump");
}

#[test]
fn read_rejects_valid_but_noncanonical_pda_pair() {
    let (canonical, mut audit) = audit_fixture();
    let alternate = (0..=u8::MAX)
        .filter(|b| *b != audit.bump)
        .find_map(|bump| {
            Pubkey::create_program_address(
                &[
                    b"audit",
                    audit.authority.as_ref(),
                    &audit.audit_id.to_le_bytes(),
                    &[bump],
                ],
                &khiputrace::ID,
            )
            .ok()
            .map(|address| (address, bump))
        })
        .expect("bump alternativo válido en fixture");
    assert_ne!(alternate.0, canonical);
    audit.bump = alternate.1;
    let mut account = StoredAccount::new(alternate.0, &audit, Audit::SPACE);
    assert_error(read_audit(&account.info()), "InvalidPda");
}

#[test]
fn read_rejects_foreign_audit_and_unissued_finding_id() {
    let (audit_key, audit) = audit_fixture();
    let mut audit_account = StoredAccount::new(audit_key, &audit, Audit::SPACE);
    let foreign_audit = Pubkey::new_from_array([9; 32]);
    let (foreign_key, bump) = finding_address(&foreign_audit, 0);
    let finding = build_finding(
        foreign_audit,
        0,
        "Hallazgo",
        "Descripción",
        Severity::Low,
        bump,
    )
    .expect("fixture ajeno");
    let mut finding_account = StoredAccount::new(foreign_key, &finding, Finding::SPACE);
    assert_error(
        read_finding(&finding_account.info(), &audit_account.info()),
        "AuditMismatch",
    );
    let (unissued, bump) = finding_address(&audit_key, 1);
    let finding = build_finding(audit_key, 1, "Hallazgo", "Descripción", Severity::Low, bump)
        .expect("fixture no emitido");
    finding_account = StoredAccount::new(unissued, &finding, Finding::SPACE);
    assert_error(
        read_finding(&finding_account.info(), &audit_account.info()),
        "UnexpectedFindingId",
    );
}

#[test]
fn read_rejects_unknown_schema_inconsistent_counters_and_truncation() {
    let (key, mut audit) = audit_fixture();
    audit.version = 2;
    let mut account = StoredAccount::new(key, &audit, Audit::SPACE);
    assert_error(read_audit(&account.info()), "UnsupportedVersion");
    audit.version = 1;
    audit.open_findings = 2;
    account = StoredAccount::new(key, &audit, Audit::SPACE);
    assert_error(read_audit(&account.info()), "InvalidCounters");
    account.data.truncate(10);
    assert_error(read_audit(&account.info()), "AccountDidNotDeserialize");
}

#[test]
fn enum_encodings_are_stable_and_unknown_variants_fail() {
    for (index, severity) in [
        Severity::Low,
        Severity::Medium,
        Severity::High,
        Severity::Critical,
    ]
    .into_iter()
    .enumerate()
    {
        assert_eq!(severity.try_to_vec().expect("enum severity"), [index as u8]);
    }
    assert_eq!(FindingStatus::Open.try_to_vec().expect("open"), [0]);
    assert_eq!(FindingStatus::Resolved.try_to_vec().expect("resolved"), [1]);
    assert!(Severity::try_from_slice(&[4]).is_err());
    assert!(FindingStatus::try_from_slice(&[2]).is_err());
}

#[test]
fn creation_contexts_reject_a_missing_authority_signature() {
    let (key, audit) = audit_fixture();
    let mut account = StoredAccount::new(key, &audit, Audit::SPACE);
    let infos = [account.info()];
    let mut remaining = infos.as_slice();
    let mut audit_bumps = khiputrace::CreateAuditBumps::default();
    assert_error(
        khiputrace::CreateAudit::try_accounts(
            &khiputrace::ID,
            &mut remaining,
            &0_u64.to_le_bytes(),
            &mut audit_bumps,
            &mut BTreeSet::new(),
        ),
        "AccountNotSigner",
    );
    let mut remaining = infos.as_slice();
    let mut finding_bumps = khiputrace::CreateFindingBumps::default();
    assert_error(
        khiputrace::CreateFinding::try_accounts(
            &khiputrace::ID,
            &mut remaining,
            &0_u64.to_le_bytes(),
            &mut finding_bumps,
            &mut BTreeSet::new(),
        ),
        "AccountNotSigner",
    );
}

#[test]
fn read_finding_rejects_wrong_owner_pda_bump_and_version() {
    let (audit_key, audit) = audit_fixture();
    let mut audit_account = StoredAccount::new(audit_key, &audit, Audit::SPACE);
    let (key, bump) = finding_address(&audit_key, 0);
    let mut finding = build_finding(audit_key, 0, "Hallazgo", "Descripción", Severity::Low, bump)
        .expect("fixture");
    let mut account = StoredAccount::new(key, &finding, Finding::SPACE);
    account.owner = Pubkey::new_from_array([9; 32]);
    assert_error(
        read_finding(&account.info(), &audit_account.info()),
        "InvalidOwner",
    );
    account.owner = khiputrace::ID;
    account.key = Pubkey::new_from_array([9; 32]);
    assert_error(
        read_finding(&account.info(), &audit_account.info()),
        "InvalidPda",
    );
    finding.bump = bump.wrapping_sub(1);
    account = StoredAccount::new(key, &finding, Finding::SPACE);
    assert_error(
        read_finding(&account.info(), &audit_account.info()),
        "InvalidBump",
    );
    finding.bump = bump;
    finding.version = 2;
    account = StoredAccount::new(key, &finding, Finding::SPACE);
    assert_error(
        read_finding(&account.info(), &audit_account.info()),
        "UnsupportedVersion",
    );
}

#[test]
fn account_deserializer_rejects_a_finding_as_an_audit() {
    let (audit, _) = audit_fixture();
    let (key, bump) = finding_address(&audit, 0);
    let finding = build_finding(audit, 0, "Hallazgo", "Descripción", Severity::Medium, bump)
        .expect("fixture");
    let account = StoredAccount::new(key, &finding, Finding::SPACE);
    assert_error(
        Audit::try_deserialize(&mut account.data.as_slice()),
        "AccountDiscriminatorMismatch",
    );
}
