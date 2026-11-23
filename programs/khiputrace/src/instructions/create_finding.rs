use crate::domain::rules::validate_counters;
use anchor_lang::prelude::*;

use crate::{
    domain::{
        limits::{DESCRIPTION_MAX_BYTES, SCHEMA_VERSION, TITLE_MAX_BYTES},
        rules::{counters_after_creation, normalized_text},
    },
    errors::BusinessError,
    state::{
        audit::Audit,
        finding::{Finding, FindingStatus, Severity},
        seeds::{audit_address, AUDIT_SEED, FINDING_SEED},
    },
};

#[derive(Accounts)]
#[instruction(finding_id: u64)]
pub struct CreateFinding<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        mut,
        has_one = authority @ BusinessError::Unauthorized,
        seeds = [AUDIT_SEED, audit.authority.as_ref(), &audit.audit_id.to_le_bytes()],
        bump,
        constraint = audit.bump == audit_address(&audit.authority, audit.audit_id).1 @ BusinessError::InvalidBump,
        constraint = audit.version == SCHEMA_VERSION @ BusinessError::UnsupportedVersion,
        constraint = validate_counters(audit.counters()).is_ok() @ BusinessError::InvalidCounters,
        constraint = finding_id == audit.next_finding_id @ BusinessError::UnexpectedFindingId
    )]
    pub audit: Account<'info, Audit>,
    #[account(
        init,
        payer = authority,
        space = Finding::SPACE,
        seeds = [FINDING_SEED, audit.key().as_ref(), &finding_id.to_le_bytes()],
        bump
    )]
    pub finding: Account<'info, Finding>,
    pub system_program: Program<'info, System>,
}

pub fn build_finding(
    audit: Pubkey,
    finding_id: u64,
    title: &str,
    description: &str,
    severity: Severity,
    bump: u8,
) -> Result<Finding> {
    let title = normalized_text(title, TITLE_MAX_BYTES).map_err(BusinessError::from)?;
    let description =
        normalized_text(description, DESCRIPTION_MAX_BYTES).map_err(BusinessError::from)?;
    Ok(Finding {
        version: SCHEMA_VERSION,
        audit,
        finding_id,
        severity,
        status: FindingStatus::Open,
        title: title.to_owned(),
        description: description.to_owned(),
        remediation_note: String::new(),
        bump,
    })
}

pub fn handle_create_finding(
    ctx: Context<CreateFinding>,
    finding_id: u64,
    title: String,
    description: String,
    severity: Severity,
) -> Result<()> {
    let audit = &mut ctx.accounts.audit;
    let counters =
        counters_after_creation(audit.counters(), finding_id).map_err(BusinessError::from)?;
    let finding = build_finding(
        audit.key(),
        finding_id,
        &title,
        &description,
        severity,
        ctx.bumps.finding,
    )?;
    ctx.accounts.finding.set_inner(finding);
    audit.next_finding_id = counters.next_finding_id;
    audit.active_findings = counters.active_findings;
    audit.open_findings = counters.open_findings;
    Ok(())
}
