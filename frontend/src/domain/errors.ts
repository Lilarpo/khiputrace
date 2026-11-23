export type RepositoryErrorCode =
  | 'configuration' | 'network' | 'programUnavailable' | 'invalidAccount'
  | 'walletUnavailable' | 'walletRejected' | 'programRejected'
  | 'transactionFailed' | 'confirmationUnknown';

export class RepositoryError extends Error {
  constructor(
    readonly code: RepositoryErrorCode,
    message: string,
    readonly reference: string | null = null,
    readonly programCode: number | null = null,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'RepositoryError';
  }
}
