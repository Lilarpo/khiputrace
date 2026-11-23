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
pub struct CloseFinding<'info> {
    #[account(mut)]
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
        close = authority,
        has_one = audit @ BusinessError::AuditMismatch,
        seeds = [FINDING_SEED, audit.key().as_ref(), &finding.finding_id.to_le_bytes()],
        bump,
        constraint = finding.bump == finding_address(&audit.key(), finding.finding_id).1 @ BusinessError::InvalidBump,
        constraint = finding.version == SCHEMA_VERSION @ BusinessError::UnsupportedVersion,
        constraint = finding.finding_id < audit.next_finding_id @ BusinessError::UnexpectedFindingId,
        constraint = finding.status == FindingStatus::Resolved @ BusinessError::FindingNotResolved
    )]
    pub finding: Account<'info, Finding>,
}

use crate::domain::rules::{
    counters_after_close, normalized_remediation, require_resolved, validate_refund_balance,
};

// Prepara los contadores; Anchor cierra la cuenta solo al salir sin error.
pub fn prepare_close(
    audit: &mut Audit,
    finding: &Finding,
    destination_lamports: u64,
    refund_lamports: u64,
) -> Result<()> {
    require_resolved(finding.status.into()).map_err(BusinessError::from)?;
    normalized_remediation(&finding.remediation_note).map_err(BusinessError::from)?;
    validate_refund_balance(destination_lamports, refund_lamports).map_err(BusinessError::from)?;
    let counters = counters_after_close(audit.counters()).map_err(BusinessError::from)?;
    audit.active_findings = counters.active_findings;
    Ok(())
}

pub fn handle_close_finding(ctx: Context<CloseFinding>) -> Result<()> {
    prepare_close(
        &mut ctx.accounts.audit,
        &ctx.accounts.finding,
        ctx.accounts.authority.to_account_info().lamports(),
        ctx.accounts.finding.to_account_info().lamports(),
    )
}
