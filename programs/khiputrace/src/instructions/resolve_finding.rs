use crate::domain::rules::validate_counters;
use anchor_lang::prelude::*;

use crate::{
    domain::limits::SCHEMA_VERSION,
    errors::BusinessError,
    state::{
        audit::Audit,
        finding::{Finding, FindingStatus},
        seeds::{audit_address, finding_address, AUDIT_SEED, FINDING_SEED},
    },
};

#[derive(Accounts)]
pub struct ResolveFinding<'info> {
    pub authority: Signer<'info>,
    #[account(
        mut,
        has_one = authority @ BusinessError::Unauthorized,
        seeds = [AUDIT_SEED, audit.authority.as_ref(), &audit.audit_id.to_le_bytes()],
        bump,
        constraint = audit.bump == audit_address(&audit.authority, audit.audit_id).1 @ BusinessError::InvalidBump,
        constraint = audit.version == SCHEMA_VERSION @ BusinessError::UnsupportedVersion,
        constraint = validate_counters(audit.counters()).is_ok() @ BusinessError::InvalidCounters
    )]
    pub audit: Account<'info, Audit>,
    #[account(
        mut,
        has_one = audit @ BusinessError::AuditMismatch,
        seeds = [FINDING_SEED, audit.key().as_ref(), &finding.finding_id.to_le_bytes()],
        bump,
        constraint = finding.bump == finding_address(&audit.key(), finding.finding_id).1 @ BusinessError::InvalidBump,
        constraint = finding.version == SCHEMA_VERSION @ BusinessError::UnsupportedVersion,
        constraint = finding.finding_id < audit.next_finding_id @ BusinessError::UnexpectedFindingId,
        constraint = finding.status == FindingStatus::Open @ BusinessError::InvalidTransition
    )]
    pub finding: Account<'info, Finding>,
}

use crate::domain::rules::{counters_after_resolution, normalized_remediation, require_open};

pub fn apply_resolution(
    audit: &mut Audit,
    finding: &mut Finding,
    remediation_note: &str,
) -> Result<()> {
    require_open(finding.status.into()).map_err(BusinessError::from)?;
    let note = normalized_remediation(remediation_note).map_err(BusinessError::from)?;
    let counters = counters_after_resolution(audit.counters()).map_err(BusinessError::from)?;
    finding.remediation_note = note.to_owned();
    finding.status = FindingStatus::Resolved;
    audit.open_findings = counters.open_findings;
    Ok(())
}

pub fn handle_resolve_finding(
    ctx: Context<ResolveFinding>,
    remediation_note: String,
) -> Result<()> {
    apply_resolution(
        &mut ctx.accounts.audit,
        &mut ctx.accounts.finding,
        &remediation_note,
    )
}
