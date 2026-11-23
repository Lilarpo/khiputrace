export interface TransactionState {
  readonly status: 'idle' | 'pending' | 'confirmed' | 'error' | 'unknown';
  readonly message: string;
  readonly reference?: string;
  readonly programCode?: number;
}
export function TransactionNotice({ state, network, confirmedTitle = 'Auditoría confirmada', errorTitle = 'No se pudo crear la auditoría' }: { state: TransactionState; network: string; confirmedTitle?: string; errorTitle?: string }) {
  if (state.status === 'idle') return null;
  return <section className={`transaction-notice ${state.status}`} role={state.status === 'error' || state.status === 'unknown' ? 'alert' : 'status'}>
    <strong>{state.status === 'pending' ? 'Firma y confirmación pendientes' : state.status === 'confirmed' ? confirmedTitle : state.status === 'unknown' ? 'Resultado de transacción incierto' : errorTitle}</strong>
    <p>{state.message}</p>
    {state.programCode !== undefined && <p>Código del programa: {state.programCode}</p>}
    {state.reference && <div><span>Firma de transacción</span><code>{state.reference}</code>{network === 'Devnet' ? <a href={`https://explorer.solana.com/tx/${encodeURIComponent(state.reference)}?cluster=devnet`} target="_blank" rel="noreferrer">Ver en Solana Explorer</a> : <small>Firma local; no está publicada en Explorer.</small>}</div>}
  </section>;
}
