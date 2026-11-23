use anchor_lang::prelude::*;

use crate::domain::limits::{CORRECTIVE_ACTION_MAX_BYTES, DESCRIPTION_MAX_BYTES, TITLE_MAX_BYTES};

#[derive(AnchorSerialize, AnchorDeserialize, InitSpace, Clone, Copy, Debug, PartialEq, Eq)]
pub enum FindingStatus {
    Open,
    Resolved,
}

#[derive(AnchorSerialize, AnchorDeserialize, InitSpace, Clone, Copy, Debug, PartialEq, Eq)]
pub enum Severity {
    Low,
    Medium,
    High,
    Critical,
}

#[account]
#[derive(InitSpace, Debug)]
pub struct Finding {
    pub version: u8,
    pub audit: Pubkey,
    pub finding_id: u64,
    pub severity: Severity,
    pub status: FindingStatus,
    #[max_len(TITLE_MAX_BYTES)]
    pub title: String,
    #[max_len(DESCRIPTION_MAX_BYTES)]
    pub description: String,
    #[max_len(CORRECTIVE_ACTION_MAX_BYTES)]
    pub remediation_note: String,
    pub bump: u8,
}

impl Finding {
    pub const SPACE: usize = Self::DISCRIMINATOR.len() + Self::INIT_SPACE;
}

impl From<FindingStatus> for crate::domain::FindingStatus {
    fn from(value: FindingStatus) -> Self {
        match value {
            FindingStatus::Open => Self::Open,
            FindingStatus::Resolved => Self::Resolved,
        }
    }
}
