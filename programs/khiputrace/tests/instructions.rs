use std::collections::BTreeSet;

use anchor_lang::{
    error::Error, prelude::*, AccountDeserialize, AccountSerialize, InstructionData,
};
use khiputrace::{
    domain::rules::{counters_after_creation, FindingCounters},
    errors::BusinessError,
    instructions::{
        close_finding::prepare_close, create_audit::build_audit, create_finding::build_finding,
        resolve_finding::apply_resolution, update_finding::apply_update,
    },
    state::{
        audit::Audit,
        finding::{Finding, FindingStatus, Severity},
        seeds::{audit_address, finding_address},
    },
};

struct MemoryAccount {
    key: Pubkey,
    owner: Pubkey,
    lamports: u64,
    data: Vec<u8>,
    signer: bool,
    writable: bool,
}

impl MemoryAccount {
    fn model<T: AccountSerialize>(key: Pubkey, value: &T, space: usize) -> Self {
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
            signer: false,
            writable: true,
        }
    }

    fn info(&mut self) -> AccountInfo<'_> {
        AccountInfo::new(
            &self.key,
            self.signer,
            self.writable,
            &mut self.lamports,
            &mut self.data,
            &self.owner,
            false,
            0,
        )
    }
}

struct Fixture {
    accounts: [MemoryAccount; 3],
}

impl Fixture {
    fn new(status: FindingStatus) -> Self {
        let authority = Pubkey::new_from_array([7; 32]);
        let (audit_key, bump) = audit_address(&authority, 42);
        let mut audit = build_audit(authority, 42, "Auditoría sintética", bump).expect("audit");
        audit.next_finding_id = 1;
        audit.active_findings = 1;
        audit.open_findings = u64::from(status == FindingStatus::Open);
        let (finding_key, bump) = finding_address(&audit_key, 0);
        let mut finding = build_finding(
            audit_key,
            0,
            "Hallazgo",
            "Descripción sintética",
            Severity::High,
            bump,
        )
        .expect("finding");
        finding.status = status;
        if status == FindingStatus::Resolved {
            finding.remediation_note = "Corrección aplicada".to_owned();
        }
        Self {
            accounts: [
                MemoryAccount {
                    key: authority,
                    owner: anchor_lang::system_program::ID,
                    lamports: 2_000_000,
                    data: vec![],
                    signer: true,
                    writable: true,
                },
                MemoryAccount::model(audit_key, &audit, Audit::SPACE),
                MemoryAccount::model(finding_key, &finding, Finding::SPACE),
            ],
        }
    }

    fn infos(&mut self) -> [AccountInfo<'_>; 3] {
        let [authority, audit, finding] = &mut self.accounts;
        [authority.info(), audit.info(), finding.info()]
    }

    fn audit(&self) -> Audit {
        Audit::try_deserialize(&mut self.accounts[1].data.as_slice()).expect("decode audit")
    }

    fn finding(&self) -> Finding {
        Finding::try_deserialize(&mut self.accounts[2].data.as_slice()).expect("decode finding")
    }

    fn store_audit(&mut self, audit: &Audit) {
        self.accounts[1] = MemoryAccount::model(self.accounts[1].key, audit, Audit::SPACE);
    }

    fn store_finding(&mut self, finding: &Finding) {
        self.accounts[2] = MemoryAccount::model(self.accounts[2].key, finding, Finding::SPACE);
    }

    fn snapshot(&self) -> Vec<(Vec<u8>, u64)> {
        self.accounts
            .iter()
            .map(|a| (a.data.clone(), a.lamports))
            .collect()
    }
}

#[derive(Clone, Copy)]
enum Operation {
    Update,
    Resolve,
    Close,
}

fn validate<'info>(operation: Operation, infos: &'info [AccountInfo<'info>]) -> Result<()> {
    let mut remaining = infos;
    let mut reallocs = BTreeSet::new();
    match operation {
        Operation::Update => khiputrace::UpdateFinding::try_accounts(
            &khiputrace::ID,
            &mut remaining,
            &[],
            &mut khiputrace::UpdateFindingBumps::default(),
            &mut reallocs,
        )
        .map(|_| ()),
        Operation::Resolve => khiputrace::ResolveFinding::try_accounts(
            &khiputrace::ID,
            &mut remaining,
            &[],
            &mut khiputrace::ResolveFindingBumps::default(),
            &mut reallocs,
        )
        .map(|_| ()),
        Operation::Close => khiputrace::CloseFinding::try_accounts(
            &khiputrace::ID,
            &mut remaining,
            &[],
            &mut khiputrace::CloseFindingBumps::default(),
            &mut reallocs,
        )
        .map(|_| ()),
    }
}

fn fixture_for(operation: Operation) -> Fixture {
    Fixture::new(if matches!(operation, Operation::Close) {
        FindingStatus::Resolved
    } else {
        FindingStatus::Open
    })
}

fn assert_error<T>(result: Result<T>, expected: &str) {
    match result {
        Err(Error::AnchorError(error)) => assert_eq!(error.error_name, expected),
        Err(other) => panic!("Error inesperado: {other:?}"),
        Ok(_) => panic!("Se esperaba {expected}"),
    }
}

#[test]
fn all_mutation_contexts_accept_valid_accounts_and_reject_unauthorized_signers() {
    for operation in [Operation::Update, Operation::Resolve, Operation::Close] {
        let mut fixture = fixture_for(operation);
        assert!(validate(operation, &fixture.infos()).is_ok());
        fixture.accounts[0].key = Pubkey::new_from_array([8; 32]);
        let before = fixture.snapshot();
        assert_error(validate(operation, &fixture.infos()), "Unauthorized");
        assert_eq!(fixture.snapshot(), before);
        fixture.accounts[0].signer = false;
        assert_error(validate(operation, &fixture.infos()), "AccountNotSigner");
    }
}

#[test]
fn contexts_reject_wrong_owner_discriminator_pda_and_canonical_bumps() {
    for operation in [Operation::Update, Operation::Resolve, Operation::Close] {
        for index in [1, 2] {
            let mut fixture = fixture_for(operation);
            fixture.accounts[index].owner = Pubkey::new_from_array([9; 32]);
            assert_error(
                validate(operation, &fixture.infos()),
                "AccountOwnedByWrongProgram",
            );
            fixture.accounts[index].owner = khiputrace::ID;
            fixture.accounts[index].data[0] ^= 1;
            assert_error(
                validate(operation, &fixture.infos()),
                "AccountDiscriminatorMismatch",
            );
            let mut fixture = fixture_for(operation);
            fixture.accounts[index].key = Pubkey::new_from_array([9; 32]);
            assert_error(validate(operation, &fixture.infos()), "ConstraintSeeds");
        }
        let mut fixture = fixture_for(operation);
        let mut audit = fixture.audit();
        audit.bump = audit.bump.wrapping_sub(1);
        fixture.store_audit(&audit);
        assert_error(validate(operation, &fixture.infos()), "InvalidBump");
        let mut fixture = fixture_for(operation);
        let mut finding = fixture.finding();
        finding.bump = finding.bump.wrapping_sub(1);
        fixture.store_finding(&finding);
        assert_error(validate(operation, &fixture.infos()), "InvalidBump");
    }
}

#[test]
fn contexts_reject_foreign_relationship_unknown_versions_and_unissued_ids() {
    for operation in [Operation::Update, Operation::Resolve, Operation::Close] {
        let mut fixture = fixture_for(operation);
        let mut finding = fixture.finding();
        finding.audit = Pubkey::new_from_array([9; 32]);
        fixture.store_finding(&finding);
        assert_error(validate(operation, &fixture.infos()), "AuditMismatch");
        let mut fixture = fixture_for(operation);
        let mut finding = fixture.finding();
        finding.version = 2;
        fixture.store_finding(&finding);
        assert_error(validate(operation, &fixture.infos()), "UnsupportedVersion");
        let mut fixture = fixture_for(operation);
        let mut audit = fixture.audit();
        audit.version = 2;
        fixture.store_audit(&audit);
        assert_error(validate(operation, &fixture.infos()), "UnsupportedVersion");
        let mut fixture = fixture_for(operation);
        let mut finding = fixture.finding();
        finding.finding_id = 1;
        fixture.store_finding(&finding);
        fixture.accounts[2].key = finding_address(&fixture.accounts[1].key, 1).0;
        finding.bump = finding_address(&fixture.accounts[1].key, 1).1;
        fixture.store_finding(&finding);
        assert_error(validate(operation, &fixture.infos()), "UnexpectedFindingId");
    }
}

#[test]
fn contexts_reject_illegal_states_and_enforce_least_write_privileges() {
    for operation in [Operation::Update, Operation::Resolve] {
        let mut fixture = Fixture::new(FindingStatus::Resolved);
        assert_error(validate(operation, &fixture.infos()), "InvalidTransition");
    }
    let mut fixture = Fixture::new(FindingStatus::Open);
    assert_error(
        validate(Operation::Close, &fixture.infos()),
        "FindingNotResolved",
    );
    let mut fixture = Fixture::new(FindingStatus::Open);
    fixture.accounts[0].writable = false;
    fixture.accounts[1].writable = false;
    assert!(validate(Operation::Update, &fixture.infos()).is_ok());
    assert_error(
        validate(Operation::Resolve, &fixture.infos()),
        "ConstraintMut",
    );
    let mut fixture = fixture_for(Operation::Close);
    fixture.accounts[0].writable = false;
    assert_error(
        validate(Operation::Close, &fixture.infos()),
        "ConstraintMut",
    );
    for operation in [Operation::Update, Operation::Resolve, Operation::Close] {
        let mut fixture = fixture_for(operation);
        fixture.accounts[2].writable = false;
        assert_error(validate(operation, &fixture.infos()), "ConstraintMut");
        let mut fixture = fixture_for(operation);
        let mut audit = fixture.audit();
        audit.open_findings = audit.active_findings + 1;
        fixture.store_audit(&audit);
        assert_error(validate(operation, &fixture.infos()), "InvalidCounters");
    }
}

#[test]
fn native_dispatch_updates_content_and_resolves_with_serialized_results() {
    let mut fixture = Fixture::new(FindingStatus::Open);
    fixture.accounts[0].writable = false;
    fixture.accounts[1].writable = false;
    let audit_before = fixture.accounts[1].data.clone();
    let data = khiputrace::instruction::UpdateFinding {
        title: " Nuevo título ".into(),
        description: " Descripción corregida ".into(),
        severity: Severity::Critical,
    }
    .data();
    khiputrace::entry(&khiputrace::ID, &fixture.infos(), &data).expect("dispatch update");
    assert_eq!(fixture.accounts[1].data, audit_before);
    assert_eq!(fixture.finding().title, "Nuevo título");
    assert_eq!(fixture.finding().severity, Severity::Critical);
    assert_eq!(fixture.finding().finding_id, 0);
    fixture.accounts[1].writable = true;
    let data = khiputrace::instruction::ResolveFinding {
        remediation_note: "  abcdefghij  ".into(),
    }
    .data();
    khiputrace::entry(&khiputrace::ID, &fixture.infos(), &data).expect("dispatch resolve");
    assert_eq!(fixture.finding().status, FindingStatus::Resolved);
    assert_eq!(fixture.finding().remediation_note, "abcdefghij");
    let audit = fixture.audit();
    assert_eq!(
        (
            audit.next_finding_id,
            audit.active_findings,
            audit.open_findings
        ),
        (1, 1, 0)
    );
    let before = fixture.snapshot();
    assert!(khiputrace::entry(&khiputrace::ID, &fixture.infos(), &data).is_err());
    assert_eq!(fixture.snapshot(), before);
}

#[test]
fn failed_native_dispatch_preserves_serialized_state() {
    let invalid_update = khiputrace::instruction::UpdateFinding {
        title: "x".repeat(97),
        description: "Descripción".into(),
        severity: Severity::Low,
    }
    .data();
    let invalid_resolution = khiputrace::instruction::ResolveFinding {
        remediation_note: "é".repeat(9),
    }
    .data();
    for data in [invalid_update, invalid_resolution] {
        let mut fixture = Fixture::new(FindingStatus::Open);
        let before = fixture.snapshot();
        assert!(khiputrace::entry(&khiputrace::ID, &fixture.infos(), &data).is_err());
        assert_eq!(fixture.snapshot(), before);
    }
    let mut fixture = Fixture::new(FindingStatus::Open);
    fixture.accounts[0].key = Pubkey::new_from_array([9; 32]);
    let before = fixture.snapshot();
    let data = khiputrace::instruction::ResolveFinding {
        remediation_note: "Corrección válida".into(),
    }
    .data();
    let expected: anchor_lang::solana_program::program_error::ProgramError =
        Error::from(BusinessError::Unauthorized).into();
    assert_eq!(
        khiputrace::entry(&khiputrace::ID, &fixture.infos(), &data),
        Err(expected)
    );
    assert_eq!(fixture.snapshot(), before);
}

#[test]
fn remediation_counts_unicode_characters_and_also_limits_utf8_bytes() {
    for note in [
        "".to_owned(),
        " \n\t ".to_owned(),
        "x".repeat(9),
        "é".repeat(9),
        "🦙".repeat(9),
        "x".repeat(513),
        "é".repeat(257),
    ] {
        let fixture = Fixture::new(FindingStatus::Open);
        let mut audit = fixture.audit();
        let mut finding = fixture.finding();
        let before = (
            audit.try_to_vec().expect("audit"),
            finding.try_to_vec().expect("finding"),
        );
        assert!(apply_resolution(&mut audit, &mut finding, &note).is_err());
        assert_eq!(
            (
                audit.try_to_vec().expect("audit"),
                finding.try_to_vec().expect("finding")
            ),
            before
        );
    }
    for note in [
        "x".repeat(10),
        "é".repeat(10),
        "🦙".repeat(10),
        "x".repeat(512),
        "é".repeat(256),
        "🦙".repeat(128),
    ] {
        let fixture = Fixture::new(FindingStatus::Open);
        let mut audit = fixture.audit();
        let mut finding = fixture.finding();
        apply_resolution(&mut audit, &mut finding, &note).expect("nota válida");
        assert_eq!(finding.remediation_note, note);
        assert_eq!(audit.open_findings, 0);
    }
}

#[test]
fn close_preparation_preserves_sequence_and_rejects_open_or_corrupt_accounts() {
    let fixture = Fixture::new(FindingStatus::Resolved);
    let mut audit = fixture.audit();
    let finding = fixture.finding();
    prepare_close(&mut audit, &finding, 10, 20).expect("preparación de cierre");
    assert_eq!(
        (
            audit.next_finding_id,
            audit.active_findings,
            audit.open_findings
        ),
        (1, 0, 0)
    );
    let counters = FindingCounters {
        next_finding_id: audit.next_finding_id,
        active_findings: audit.active_findings,
        open_findings: audit.open_findings,
    };
    assert!(counters_after_creation(counters, 0).is_err());
    assert_eq!(
        counters_after_creation(counters, 1)
            .expect("siguiente ID")
            .next_finding_id,
        2
    );
    let fixture = Fixture::new(FindingStatus::Open);
    assert_error(
        prepare_close(&mut fixture.audit(), &fixture.finding(), 0, 0),
        "FindingNotResolved",
    );
    let fixture = Fixture::new(FindingStatus::Resolved);
    let mut audit = fixture.audit();
    assert_error(
        prepare_close(&mut audit, &fixture.finding(), u64::MAX, 1),
        "CounterOverflow",
    );
    assert_eq!(audit.active_findings, 1);
    audit.active_findings = 0;
    assert_error(
        prepare_close(&mut audit, &fixture.finding(), 0, 0),
        "CounterUnderflow",
    );
    audit.active_findings = 1;
    audit.open_findings = 1;
    assert_error(
        prepare_close(&mut audit, &fixture.finding(), 0, 0),
        "InvalidCounters",
    );
    let mut finding = fixture.finding();
    finding.remediation_note = "breve".into();
    let mut audit = fixture.audit();
    assert_error(
        prepare_close(&mut audit, &finding, 0, 0),
        "CorrectiveActionRequired",
    );
    assert_eq!(audit.active_findings, 1);
}

#[test]
fn update_and_resolution_reject_invalid_state_and_counter_underflow_before_mutation() {
    let fixture = Fixture::new(FindingStatus::Resolved);
    let mut finding = fixture.finding();
    assert_error(
        apply_update(&mut finding, "Cambio", "Descripción", Severity::Low),
        "InvalidTransition",
    );
    assert_error(
        apply_resolution(&mut fixture.audit(), &mut finding, "Corrección aplicada"),
        "InvalidTransition",
    );
    let fixture = Fixture::new(FindingStatus::Open);
    let mut audit = fixture.audit();
    audit.open_findings = 0;
    let mut finding = fixture.finding();
    assert_error(
        apply_resolution(&mut audit, &mut finding, "Corrección aplicada"),
        "CounterUnderflow",
    );
    assert_eq!(finding.status, FindingStatus::Open);
    assert_eq!(finding.remediation_note, "");
    assert_eq!(audit.active_findings, 1);
}
