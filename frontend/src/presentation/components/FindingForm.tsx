import { useState } from 'react';
import type { Audit, Finding, Severity } from '../../domain/entities';
import type { FindingContent } from '../../domain/ports';
import type { FindingUseCases } from '../../application/contracts';
import { InputValidationError } from '../../application/errors';
import { normalizeContent, normalizeCorrectiveAction } from '../../application/validation';
import type { useFindingMutation } from '../hooks/useFindingMutation';
import { severityLabel, severityOptions } from '../config/findings';

export type FindingEditorRequest = { readonly kind: 'create' } | { readonly kind: 'update' | 'resolve'; readonly finding: Finding };
type Review = { readonly kind: 'content'; readonly content: FindingContent } | { readonly kind: 'resolution'; readonly action: string };
export function FindingForm({ request, audit, authority, network, useCases, mutation, close }: {
  request: FindingEditorRequest; audit: Audit; authority: string; network: string; useCases: FindingUseCases;
  mutation: ReturnType<typeof useFindingMutation>; close: () => void;
}) {
  const finding = request.kind === 'create' ? null : request.finding;
  const [title, setTitle] = useState(finding?.title ?? '');
  const [description, setDescription] = useState(finding?.description ?? '');
  const [severity, setSeverity] = useState<Severity>(finding?.severity ?? 'medium');
  const [action, setAction] = useState('');
  const [review, setReview] = useState<Review | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [expectedId] = useState(audit.nextFindingId);
  const heading = request.kind === 'create' ? 'Crear hallazgo' : request.kind === 'update' ? 'Modificar hallazgo' : 'Resolver hallazgo';
  const prepare = () => {
    try {
      setErrors({});
      setReview(request.kind === 'resolve' ? { kind: 'resolution', action: normalizeCorrectiveAction(action) }
        : { kind: 'content', content: normalizeContent({ title, description, severity }) });
    } catch (cause) {
      if (cause instanceof InputValidationError) setErrors({ [cause.field]: cause.message });
      else setErrors({ form: 'No se pudo validar el formulario.' });
    }
  };
  const submit = async () => {
    if (!review || mutation.locked) return;
    let successful = false;
    if (request.kind === 'resolve' && review.kind === 'resolution') {
      successful = await mutation.run(() => useCases.resolve.execute({ audit: audit.address, id: request.finding.id, correctiveAction: review.action }), 'Hallazgo resuelto');
    } else if (review.kind === 'content') {
      successful = request.kind === 'create'
        ? await mutation.run(() => useCases.create.execute({ audit: audit.address, expectedNextId: expectedId, ...review.content }), 'Hallazgo creado')
        : await mutation.run(() => useCases.update.execute({ audit: audit.address, id: request.finding.id, ...review.content }), 'Hallazgo actualizado');
    }
    if (successful) close();
  };
  return <section className="panel audit-form-panel" aria-labelledby="finding-form-title">
    <div className="panel-heading"><h2 id="finding-form-title">{heading}</h2><button className="text-button" disabled={mutation.busy} onClick={close}>Cerrar formulario de hallazgo</button></div>
    <form noValidate onSubmit={(event) => { event.preventDefault(); if (!review) prepare(); }}>
      {!review ? <>
        {request.kind === 'resolve' ? <div className="form-field"><label htmlFor="finding-action">Acción correctiva</label><textarea id="finding-action" rows={5} value={action} onChange={(event) => setAction(event.target.value)} aria-invalid={!!errors.correctiveAction} aria-describedby="finding-action-help finding-action-error" /><small id="finding-action-help">Describe la corrección aplicada: al menos 10 caracteres Unicode y máximo 512 bytes UTF-8, después de quitar espacios de los extremos.</small>{errors.correctiveAction && <p id="finding-action-error" role="alert">{errors.correctiveAction}</p>}</div>
          : <div className="finding-fields">
            <div className="form-field"><label htmlFor="finding-title">Título del hallazgo</label><input id="finding-title" value={title} onChange={(event) => setTitle(event.target.value)} aria-invalid={!!errors.title} aria-describedby="finding-title-help finding-title-error" /><small id="finding-title-help">Obligatorio. Máximo 96 bytes UTF-8.</small>{errors.title && <p id="finding-title-error" role="alert">{errors.title}</p>}</div>
            <div className="form-field"><label htmlFor="finding-severity">Gravedad</label><select id="finding-severity" value={severity} onChange={(event) => { const option = severityOptions.find((entry) => entry.value === event.target.value); if (option) setSeverity(option.value); }}>{severityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>{errors.severity && <p role="alert">{errors.severity}</p>}</div>
            <div className="form-field"><label htmlFor="finding-description">Descripción del hallazgo</label><textarea id="finding-description" rows={5} value={description} onChange={(event) => setDescription(event.target.value)} aria-invalid={!!errors.description} aria-describedby="finding-description-help finding-description-error" /><small id="finding-description-help">Obligatoria. Máximo 512 bytes UTF-8. Usa datos sintéticos; no publiques secretos.</small>{errors.description && <p id="finding-description-error" role="alert">{errors.description}</p>}</div>
          </div>}
        {errors.form && <p role="alert">{errors.form}</p>}<button className="button primary finding-review-button" type="submit" disabled={mutation.locked}>Revisar hallazgo</button>
      </> : <div className="audit-review"><h3>Revisa el hallazgo antes de firmar</h3><dl>
        <dt>Operación</dt><dd>{heading}</dd><dt>Red</dt><dd>{network}</dd><dt>Wallet responsable</dt><dd className="mono">{authority}</dd>
        <dt>Auditoría</dt><dd>{audit.title}<code className="block-address">{audit.address}</code></dd><dt>ID de hallazgo</dt><dd>{finding ? finding.id.toString() : expectedId.toString()}</dd>
        {review.kind === 'content' ? <><dt>Título</dt><dd>{review.content.title}</dd><dt>Descripción</dt><dd className="preserve-lines">{review.content.description}</dd><dt>Gravedad</dt><dd>{severityLabel(review.content.severity)}</dd></> : <><dt>Acción correctiva</dt><dd className="preserve-lines">{review.action}</dd></>}
      </dl><p>Los datos serán públicos. Tu wallet pagará la comisión de red{request.kind === 'create' ? ' y el depósito de almacenamiento de la nueva cuenta (rent)' : ''}. Revisa la solicitud antes de aprobar. El programa verifica autoridad, pertenencia, estado y secuencia de IDs.</p>
        <div className="form-actions"><button className="button secondary" type="button" disabled={mutation.locked} onClick={() => setReview(null)}>Editar hallazgo antes de firmar</button><button className="button primary" type="button" disabled={mutation.locked} onClick={() => void submit()}>{mutation.busy ? 'Esperando confirmación del hallazgo…' : 'Firmar operación del hallazgo'}</button></div>
      </div>}
    </form>
  </section>;
}
