#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ModelError {
    InvalidText,
    InvalidCounters,
    UnexpectedFindingId,
    CounterOverflow,
    CounterUnderflow,
    InvalidTransition,
    CorrectiveActionRequired,
    FindingNotResolved,
}

pub fn normalized_remediation(value: &str) -> Result<&str, ModelError> {
    use super::limits::{CORRECTIVE_ACTION_MAX_BYTES, CORRECTIVE_ACTION_MIN_CHARS};
    let text = value.trim();
    if text.len() > CORRECTIVE_ACTION_MAX_BYTES {
        return Err(ModelError::InvalidText);
    }
    if text.chars().count() < CORRECTIVE_ACTION_MIN_CHARS {
        return Err(ModelError::CorrectiveActionRequired);
    }
    Ok(text)
}

pub fn require_open(status: super::FindingStatus) -> Result<(), ModelError> {
    if status != super::FindingStatus::Open {
        return Err(ModelError::InvalidTransition);
    }
    Ok(())
}

pub fn require_resolved(status: super::FindingStatus) -> Result<(), ModelError> {
    if status != super::FindingStatus::Resolved {
        return Err(ModelError::FindingNotResolved);
    }
    Ok(())
}

pub fn counters_after_resolution(current: FindingCounters) -> Result<FindingCounters, ModelError> {
    validate_counters(current)?;
    let next = FindingCounters {
        open_findings: current
            .open_findings
            .checked_sub(1)
            .ok_or(ModelError::CounterUnderflow)?,
        ..current
    };
    validate_counters(next)?;
    Ok(next)
}

pub fn counters_after_close(current: FindingCounters) -> Result<FindingCounters, ModelError> {
    validate_counters(current)?;
    let next = FindingCounters {
        active_findings: current
            .active_findings
            .checked_sub(1)
            .ok_or(ModelError::CounterUnderflow)?,
        ..current
    };
    validate_counters(next)?;
    Ok(next)
}

pub fn validate_refund_balance(destination: u64, refund: u64) -> Result<(), ModelError> {
    destination
        .checked_add(refund)
        .ok_or(ModelError::CounterOverflow)?;
    Ok(())
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct FindingCounters {
    pub next_finding_id: u64,
    pub active_findings: u64,
    pub open_findings: u64,
}

pub fn normalized_text(value: &str, max_bytes: usize) -> Result<&str, ModelError> {
    let text = value.trim();
    if text.is_empty() || text.len() > max_bytes {
        return Err(ModelError::InvalidText);
    }
    Ok(text)
}

pub fn validate_counters(counters: FindingCounters) -> Result<(), ModelError> {
    if counters.open_findings > counters.active_findings
        || counters.active_findings > counters.next_finding_id
    {
        return Err(ModelError::InvalidCounters);
    }
    Ok(())
}

pub fn counters_after_creation(
    current: FindingCounters,
    finding_id: u64,
) -> Result<FindingCounters, ModelError> {
    validate_counters(current)?;
    if finding_id != current.next_finding_id {
        return Err(ModelError::UnexpectedFindingId);
    }
    Ok(FindingCounters {
        next_finding_id: current
            .next_finding_id
            .checked_add(1)
            .ok_or(ModelError::CounterOverflow)?,
        active_findings: current
            .active_findings
            .checked_add(1)
            .ok_or(ModelError::CounterOverflow)?,
        open_findings: current
            .open_findings
            .checked_add(1)
            .ok_or(ModelError::CounterOverflow)?,
    })
}
