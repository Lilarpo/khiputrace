use anchor_lang::prelude::*;

use crate::{
    domain::{
        limits::SCHEMA_VERSION,
        rules::{validate_counters, FindingCounters},
    },
    errors::BusinessError,
    state::{
        audit::Audit,
        finding::Finding,
        seeds::{audit_address, finding_address},
    },
};

pub fn read_audit(info: &AccountInfo<'_>) -> Result<Audit> {
    require_keys_eq!(*info.owner, crate::ID, BusinessError::InvalidOwner);
    let data = info.try_borrow_data()?;
    let audit = Audit::try_deserialize(&mut data.as_ref())?;
    require_eq!(
        audit.version,
        SCHEMA_VERSION,
        BusinessError::UnsupportedVersion
    );
    let (address, bump) = audit_address(&audit.authority, audit.audit_id);
    require_keys_eq!(*info.key, address, BusinessError::InvalidPda);
    require_eq!(audit.bump, bump, BusinessError::InvalidBump);
    validate_counters(FindingCounters {
        next_finding_id: audit.next_finding_id,
        active_findings: audit.active_findings,
        open_findings: audit.open_findings,
    })
    .map_err(BusinessError::from)?;
    Ok(audit)
}

pub fn read_finding(info: &AccountInfo<'_>, audit_info: &AccountInfo<'_>) -> Result<Finding> {
    let audit = read_audit(audit_info)?;
    require_keys_eq!(*info.owner, crate::ID, BusinessError::InvalidOwner);
    let data = info.try_borrow_data()?;
    let finding = Finding::try_deserialize(&mut data.as_ref())?;
    require_eq!(
        finding.version,
        SCHEMA_VERSION,
        BusinessError::UnsupportedVersion
    );
    require_keys_eq!(finding.audit, *audit_info.key, BusinessError::AuditMismatch);
    require!(
        finding.finding_id < audit.next_finding_id,
        BusinessError::UnexpectedFindingId
    );
    let (address, bump) = finding_address(audit_info.key, finding.finding_id);
    require_keys_eq!(*info.key, address, BusinessError::InvalidPda);
    require_eq!(finding.bump, bump, BusinessError::InvalidBump);
    Ok(finding)
}
