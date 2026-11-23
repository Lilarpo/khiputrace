use anchor_lang::prelude::Pubkey;

pub const AUDIT_SEED: &[u8] = b"audit";
pub const FINDING_SEED: &[u8] = b"finding";

pub fn audit_address(authority: &Pubkey, audit_id: u64) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[AUDIT_SEED, authority.as_ref(), &audit_id.to_le_bytes()],
        &crate::ID,
    )
}

pub fn finding_address(audit: &Pubkey, finding_id: u64) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[FINDING_SEED, audit.as_ref(), &finding_id.to_le_bytes()],
        &crate::ID,
    )
}
