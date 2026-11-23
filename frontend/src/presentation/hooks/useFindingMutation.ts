import { useEffect, useRef, useState } from 'react';
import type { MutationReceipt } from '../../domain/ports';
import { RepositoryError } from '../../domain/errors';
import { isApplicationError } from '../../application/errors';
import type { TransactionState } from '../components/TransactionNotice';
import { useNotifications } from './useNotifications';
export function useFindingMutation(confirmed: () => void) {
  const [state, setState] = useState<TransactionState>({ status: 'idle', message: '' });
  const [title, setTitle] = useState('Operación confirmada');
  const pending = useRef(false);
  const uncertain = useRef(false);
  const alive = useRef(true);
  const notify = useNotifications();
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const run = async (operation: () => Promise<MutationReceipt>, success: string): Promise<boolean> => {
    if (pending.current || uncertain.current) return false;
    pending.current = true;
    setState({ status: 'pending', message: 'Revisa la solicitud en tu wallet. Esperaremos la confirmación antes de actualizar los datos.' });
    try {
      const receipt = await operation();
      if (!alive.current) return false;
      setTitle(success);
      setState({ status: 'confirmed', message: 'Transacción confirmada. Consultando de nuevo los hallazgos y los contadores de la auditoría.', reference: receipt.reference });
      notify(success, 'success');
      confirmed();
      return true;
    } catch (cause) {
      if (!alive.current) return false;
      uncertain.current = cause instanceof RepositoryError && cause.code === 'confirmationUnknown';
      setState({ status: uncertain.current ? 'unknown' : 'error', message: isApplicationError(cause) ? cause.message : 'No se pudo completar la operación. Revisa tu wallet y la red.',
        ...(cause instanceof RepositoryError && cause.reference ? { reference: cause.reference } : {}),
        ...(cause instanceof RepositoryError && cause.programCode !== null ? { programCode: cause.programCode } : {}),
      });
      return false;
    } finally { pending.current = false; }
  };
  return { state, title, busy: state.status === 'pending', locked: state.status === 'pending' || state.status === 'unknown', run };
}
