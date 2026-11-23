import { useEffect, useRef, useState } from 'react';
import type { Finding } from '../../domain/entities';
import type { FindingUseCases } from '../../application/contracts';
import type { useFindingMutation } from '../hooks/useFindingMutation';
export function CloseFindingDialog({ finding, authority, network, useCases, mutation, close }: {
  finding: Finding; authority: string; network: string; useCases: FindingUseCases;
  mutation: ReturnType<typeof useFindingMutation>; close: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const [accepted, setAccepted] = useState(false);
  useEffect(() => { if (!dialog.current?.open) dialog.current?.showModal(); cancel.current?.focus(); }, []);
  const submit = async () => {
    if (!accepted || mutation.locked || finding.status !== 'resolved') return;
    if (await mutation.run(() => useCases.close.execute({ audit: finding.audit, id: finding.id }), 'Cuenta de hallazgo cerrada')) close();
  };
  return <dialog ref={dialog} className="wallet-dialog close-finding-dialog" aria-labelledby="close-finding-title" aria-describedby="close-finding-impact" onCancel={(event) => { if (mutation.busy) event.preventDefault(); else close(); }}>
    <div className="dialog-content"><h2 id="close-finding-title">Cerrar cuenta de hallazgo</h2><h3>#{finding.id.toString()} · {finding.title}</h3>
      <p id="close-finding-impact">Se eliminará la cuenta del hallazgo resuelto y su contenido dejará de estar disponible desde la aplicación. El saldo de la cuenta se devolverá a la autoridad. El contador de activos disminuirá; el ID no se reutilizará. La transacción tiene una comisión de red.</p>
      <p>Red: <strong>{network}</strong></p><p>Autoridad y destinatario del saldo:<code className="block-address">{authority}</code></p>
      <label className="confirmation-checkbox"><input type="checkbox" checked={accepted} disabled={mutation.busy} onChange={(event) => setAccepted(event.target.checked)} />Entiendo que se cerrará la cuenta del hallazgo.</label>
      <div className="form-actions"><button ref={cancel} className="button secondary" disabled={mutation.busy} onClick={close}>Cancelar cierre</button><button className="button danger" disabled={!accepted || mutation.locked} onClick={() => void submit()}>{mutation.busy ? 'Cerrando hallazgo…' : 'Confirmar cierre y firmar'}</button></div>
      {mutation.state.status === 'error' || mutation.state.status === 'unknown' ? <p role="alert">{mutation.state.message}{mutation.state.programCode !== undefined && ` Código del programa: ${mutation.state.programCode}`}{mutation.state.reference && <code className="block-address">Firma: {mutation.state.reference}</code>}</p> : null}
    </div>
  </dialog>;
}
