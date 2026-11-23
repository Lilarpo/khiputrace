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
pub struct UpdateFinding<'info> {
    pub authority: Signer<'info>,
    #[account(
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

use crate::{
    domain::{
        limits::{DESCRIPTION_MAX_BYTES, TITLE_MAX_BYTES},
        rules::{normalized_text, require_open},
    },
    state::finding::Severity,
};

pub fn apply_update(
    finding: &mut Finding,
    title: &str,
    description: &str,
    severity: Severity,
) -> Result<()> {
    require_open(finding.status.into()).map_err(BusinessError::from)?;
    let title = normalized_text(title, TITLE_MAX_BYTES).map_err(BusinessError::from)?;
    let description =
        normalized_text(description, DESCRIPTION_MAX_BYTES).map_err(BusinessError::from)?;
    finding.title = title.to_owned();
    finding.description = description.to_owned();
    finding.severity = severity;
    Ok(())
}

pub fn handle_update_finding(
    ctx: Context<UpdateFinding>,
    title: String,
    description: String,
    severity: Severity,
) -> Result<()> {
    apply_update(&mut ctx.accounts.finding, &title, &description, severity)
}
