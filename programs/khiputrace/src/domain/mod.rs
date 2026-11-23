pub mod limits;
pub mod rules;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum FindingStatus {
    Open,
    Resolved,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Severity {
    Low,
    Medium,
    High,
    Critical,
}
