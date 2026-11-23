use anchor_lang::prelude::*;

use crate::domain::rules::ModelError;

#[error_code]
pub enum BusinessError {
    #[msg("La wallet no es la autoridad de la auditoría.")]
    Unauthorized,
    #[msg("El hallazgo no pertenece a la auditoría indicada.")]
    AuditMismatch,
    #[msg("El texto está vacío o excede su límite de bytes UTF-8.")]
    InvalidText,
    #[msg("La transición de estado no está permitida.")]
    InvalidTransition,
    #[msg("Se requiere una acción correctiva válida.")]
    CorrectiveActionRequired,
    #[msg("El hallazgo debe estar resuelto.")]
    FindingNotResolved,
    #[msg("El contador no puede incrementarse.")]
    CounterOverflow,
    #[msg("El contador no puede decrementarse.")]
    CounterUnderflow,
    #[msg("El ID no coincide con el siguiente hallazgo de la auditoría.")]
    UnexpectedFindingId,
    #[msg("Los contadores de la auditoría son inconsistentes.")]
    InvalidCounters,
    #[msg("La cuenta no corresponde a su PDA canónica.")]
    InvalidPda,
    #[msg("El bump almacenado no es canónico.")]
    InvalidBump,
    #[msg("La versión del esquema no es compatible.")]
    UnsupportedVersion,
    #[msg("La cuenta no pertenece al programa KhipuTrace.")]
    InvalidOwner,
}

impl From<ModelError> for BusinessError {
    fn from(value: ModelError) -> Self {
        match value {
            ModelError::InvalidText => Self::InvalidText,
            ModelError::InvalidCounters => Self::InvalidCounters,
            ModelError::UnexpectedFindingId => Self::UnexpectedFindingId,
            ModelError::CounterOverflow => Self::CounterOverflow,
            ModelError::CounterUnderflow => Self::CounterUnderflow,
            ModelError::InvalidTransition => Self::InvalidTransition,
            ModelError::CorrectiveActionRequired => Self::CorrectiveActionRequired,
            ModelError::FindingNotResolved => Self::FindingNotResolved,
        }
    }
}
