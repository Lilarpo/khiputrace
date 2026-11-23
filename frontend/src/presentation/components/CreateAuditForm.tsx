import { useEffect, useRef, useState } from 'react';
import type { AuditUseCases } from '../../application/contracts';
import { InputValidationError, isApplicationError } from '../../application/errors';
import { normalizeTitle, validateId } from '../../application/validation';
import { RepositoryError } from '../../domain/errors';
import type { CreateAuditInput } from '../../domain/ports';
import { TransactionNotice } from './TransactionNotice';
import type { TransactionState } from './TransactionNotice';
import { useNotifications } from '../hooks/useNotifications';

export function CreateAuditForm({ useCases, authority, network, confirmed, close }: {
  useCases: AuditUseCases; authority: string; network: string; confirmed: () => void; close: () => void;
}) {
  const [id, setId] = useState('');
  const [title, setTitle] = useState('');
  const [errors, setErrors] = useState<Partial<Record<'id' | 'title', string>>>({});
  const [review, setReview] = useState<CreateAuditInput | null>(null);
  const [transaction, setTransaction] = useState<TransactionState>({ status: 'idle', message: '' });
  const pending = useRef(false);
  const alive = useRef(true);
  const notify = useNotifications();
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const prepare = () => {
    const next: typeof errors = {};
    let parsed = 0n;
    let normalized = '';
    try {
      if (!/^[0-9]+$/.test(id) || id.length > 20) throw new InputValidationError('id', 'invalidId', 'Introduce un ID decimal entre 0 y 18446744073709551615.');
      parsed = validateId(BigInt(id), 'id');
    } catch (cause) { next.id = isApplicationError(cause) ? cause.message : 'ID inválido.'; }
    try { normalized = normalizeTitle(title); }
    catch (cause) { next.title = isApplicationError(cause) ? cause.message : 'Título inválido.'; }
    setErrors(next);
    if (Object.keys(next).length === 0) setReview({ id: parsed, title: normalized });
  };
  const submit = async () => {
    if (!review || pending.current) return;
    pending.current = true;
    setTransaction({ status: 'pending', message: 'Revisa y aprueba la solicitud en tu wallet. Después esperaremos la confirmación de la red.' });
    try {
      const receipt = await useCases.create.execute(review);
      if (!alive.current) return;
      setTransaction({ status: 'confirmed', message: 'La transacción se confirmó. El listado se actualizará mediante una nueva consulta.', reference: receipt.reference });
      notify('Auditoría creada y confirmada.', 'success');
      confirmed();
    } catch (cause) {
      if (!alive.current) return;
      const reference = cause instanceof RepositoryError ? cause.reference : null;
      const unknown = cause instanceof RepositoryError && cause.code === 'confirmationUnknown';
      setTransaction({ status: unknown ? 'unknown' : 'error', message: isApplicationError(cause) ? cause.message : 'Ocurrió un error inesperado. Revisa tu wallet y la red.', ...(reference ? { reference } : {}) });
    } finally { pending.current = false; }
  };
  const locked = transaction.status === 'pending' || transaction.status === 'confirmed' || transaction.status === 'unknown';
  return <section className="panel audit-form-panel" aria-labelledby="create-audit-title"><div className="panel-heading"><h2 id="create-audit-title">Nueva auditoría</h2><button className="text-button" disabled={transaction.status === 'pending'} onClick={close}>Cerrar formulario</button></div>
    <form noValidate onSubmit={(event) => { event.preventDefault(); if (!review) prepare(); }}>
      {!review ? <><div className="form-grid"><div className="form-field"><label htmlFor="audit-id">ID de auditoría</label><input id="audit-id" inputMode="numeric" value={id} onChange={(event) => setId(event.target.value)} aria-invalid={!!errors.id} aria-describedby="audit-id-help audit-id-error" /><small id="audit-id-help">Entero u64 único para tu wallet. Puedes elegir 0 para la primera auditoría.</small>{errors.id && <p id="audit-id-error" role="alert">{errors.id}</p>}</div><div className="form-field"><label htmlFor="audit-title">Título</label><input id="audit-title" value={title} onChange={(event) => setTitle(event.target.value)} aria-invalid={!!errors.title} aria-describedby="audit-title-help audit-title-error" /><small id="audit-title-help">Máximo 96 bytes UTF-8. No incluyas datos personales ni secretos.</small>{errors.title && <p id="audit-title-error" role="alert">{errors.title}</p>}</div></div><button className="button primary" type="submit">Revisar auditoría</button></>
        : <div className="audit-review"><h3>Revisa antes de firmar</h3><dl><dt>Red</dt><dd>{network}</dd><dt>Wallet responsable</dt><dd className="mono">{authority}</dd><dt>ID</dt><dd>{review.id.toString()}</dd><dt>Título</dt><dd>{review.title}</dd></dl><p>Crearás una cuenta de auditoría pública. Tu wallet pagará la comisión de red y el depósito de almacenamiento (rent). Revisa los importes en tu wallet antes de aprobar.</p><p>El programa valida la autoridad y la PDA. Una conexión de wallet no concede permisos por sí sola.</p><div className="form-actions"><button className="button secondary" type="button" disabled={locked} onClick={() => { setReview(null); setTransaction({ status: 'idle', message: '' }); }}>Editar datos</button><button className="button primary" type="button" disabled={locked} onClick={() => void submit()}>{transaction.status === 'pending' ? 'Esperando confirmación…' : 'Firmar y crear auditoría'}</button></div></div>}
    </form><TransactionNotice state={transaction} network={network} />
  </section>;
}
