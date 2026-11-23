use anchor_lang::prelude::*;

use crate::{
    domain::{
        limits::{SCHEMA_VERSION, TITLE_MAX_BYTES},
        rules::normalized_text,
    },
    errors::BusinessError,
    state::{audit::Audit, seeds::AUDIT_SEED},
};

#[derive(Accounts)]
#[instruction(audit_id: u64)]
pub struct CreateAudit<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        space = Audit::SPACE,
        seeds = [AUDIT_SEED, authority.key().as_ref(), &audit_id.to_le_bytes()],
        bump
    )]
    pub audit: Account<'info, Audit>,
    pub system_program: Program<'info, System>,
}

pub fn build_audit(authority: Pubkey, audit_id: u64, title: &str, bump: u8) -> Result<Audit> {
    let title = normalized_text(title, TITLE_MAX_BYTES).map_err(BusinessError::from)?;
    Ok(Audit {
        version: SCHEMA_VERSION,
        authority,
        audit_id,
        title: title.to_owned(),
        next_finding_id: 0,
        active_findings: 0,
        open_findings: 0,
        bump,
    })
}

pub fn handle_create_audit(ctx: Context<CreateAudit>, audit_id: u64, title: String) -> Result<()> {
    ctx.accounts.audit.set_inner(build_audit(
        ctx.accounts.authority.key(),
        audit_id,
        &title,
        ctx.bumps.audit,
    )?);
    Ok(())
}
