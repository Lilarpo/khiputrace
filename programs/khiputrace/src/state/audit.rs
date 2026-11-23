use anchor_lang::prelude::*;

use crate::domain::limits::TITLE_MAX_BYTES;

#[account]
#[derive(InitSpace, Debug)]
pub struct Audit {
    pub version: u8,
    pub authority: Pubkey,
    pub audit_id: u64,
    #[max_len(TITLE_MAX_BYTES)]
    pub title: String,
    pub next_finding_id: u64,
    pub active_findings: u64,
    pub open_findings: u64,
    pub bump: u8,
}

impl Audit {
    pub const SPACE: usize = Self::DISCRIMINATOR.len() + Self::INIT_SPACE;

    pub fn counters(&self) -> crate::domain::rules::FindingCounters {
        crate::domain::rules::FindingCounters {
            next_finding_id: self.next_finding_id,
            active_findings: self.active_findings,
            open_findings: self.open_findings,
        }
    }
}
