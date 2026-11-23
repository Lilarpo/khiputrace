use anchor_lang::{prelude::Pubkey, AnchorDeserialize, AnchorSerialize, Space};
use khiputrace::state::{
    audit::Audit,
    finding::{Finding, FindingStatus, Severity},
};

#[test]
fn maximum_utf8_payload_fits_planned_account_allocation() {
    let audit = Audit {
        version: 1,
        authority: Pubkey::default(),
        audit_id: 0,
        title: "é".repeat(48),
        next_finding_id: 0,
        active_findings: 0,
        open_findings: 0,
        bump: 255,
    };
    let finding = Finding {
        version: 1,
        audit: Pubkey::default(),
        finding_id: u64::MAX,
        severity: Severity::Critical,
        status: FindingStatus::Resolved,
        title: "é".repeat(48),
        description: "é".repeat(256),
        remediation_note: "é".repeat(256),
        bump: 255,
    };
    let audit_bytes = audit.try_to_vec().expect("serialización de Audit");
    let finding_bytes = finding.try_to_vec().expect("serialización de Finding");
    assert_eq!(8 + Audit::INIT_SPACE, 174);
    assert_eq!(8 + Finding::INIT_SPACE, 1184);
    assert_eq!(audit_bytes.len(), Audit::INIT_SPACE);
    assert_eq!(finding_bytes.len(), Finding::INIT_SPACE);
    let decoded = Finding::try_from_slice(&finding_bytes).expect("deserialización de Finding");
    assert_eq!(decoded.finding_id, u64::MAX);
    assert_eq!(decoded.remediation_note.len(), 512);
}
