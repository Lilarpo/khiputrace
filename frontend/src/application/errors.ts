import { RepositoryError } from '../domain/errors';

export type InputField = 'id' | 'expectedNextId' | 'title' | 'description' | 'audit' | 'authority' | 'correctiveAction' | 'severity';
export type ValidationCode = 'required' | 'invalidId' | 'invalidAddress' | 'invalidSeverity' | 'invalidUnicode' | 'tooLong' | 'tooShort';

export class InputValidationError extends Error {
  constructor(readonly field: InputField, readonly code: ValidationCode, message: string) {
    super(message);
    this.name = 'InputValidationError';
  }
}

export type ApplicationError = InputValidationError | RepositoryError;

export function isApplicationError(error: unknown): error is ApplicationError {
  return error instanceof InputValidationError || error instanceof RepositoryError;
}
