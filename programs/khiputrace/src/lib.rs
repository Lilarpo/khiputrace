#![forbid(unsafe_code)]

//! Instrucciones de auditorías y ciclo de vida de hallazgos.

use anchor_lang::prelude::*;

// Identidad real preparada para Devnet; consultar el estado en docs/DEPLOYMENT.md.
declare_id!("GV8SZn6i29tL4CmJMei5P3N3BLUxVZBWrG6hFQVSVSBv");

pub mod domain;
pub mod errors;
pub mod instructions;
pub mod state;

pub use instructions::close_finding::*;
pub use instructions::create_audit::*;
pub use instructions::create_finding::*;
pub use instructions::resolve_finding::*;
pub use instructions::update_finding::*;

#[program]
pub mod khiputrace {
    use super::*;

    pub fn create_audit(ctx: Context<CreateAudit>, audit_id: u64, title: String) -> Result<()> {
        instructions::create_audit::handle_create_audit(ctx, audit_id, title)
    }

    pub fn create_finding(
        ctx: Context<CreateFinding>,
        finding_id: u64,
        title: String,
        description: String,
        severity: state::finding::Severity,
    ) -> Result<()> {
        instructions::create_finding::handle_create_finding(
            ctx,
            finding_id,
            title,
            description,
            severity,
        )
    }

    pub fn update_finding(
        ctx: Context<UpdateFinding>,
        title: String,
        description: String,
        severity: state::finding::Severity,
    ) -> Result<()> {
        instructions::update_finding::handle_update_finding(ctx, title, description, severity)
    }

    pub fn resolve_finding(ctx: Context<ResolveFinding>, remediation_note: String) -> Result<()> {
        instructions::resolve_finding::handle_resolve_finding(ctx, remediation_note)
    }

    pub fn close_finding(ctx: Context<CloseFinding>) -> Result<()> {
        instructions::close_finding::handle_close_finding(ctx)
    }
}
