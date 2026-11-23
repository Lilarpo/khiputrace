import { useEffect, useRef, useSyncExternalStore } from 'react';
import type { WalletConnection } from '../../application/wallet';
import { useNotifications } from './useNotifications';
export function useWallet(connection: WalletConnection) {
  const snapshot = useSyncExternalStore(connection.subscribe, connection.getSnapshot);
  const notify = useNotifications();
  const previous = useRef(snapshot);
  useEffect(() => {
    if (snapshot.error && snapshot.error !== previous.current.error) notify(snapshot.error, 'error');
    if (snapshot.account?.address !== previous.current.account?.address && snapshot.account) notify('Wallet conectada. La conexión no solicita firmas.', 'success');
    if ((previous.current.account || previous.current.status === 'disconnecting') && snapshot.status === 'disconnected' && !snapshot.account && !snapshot.error) notify('Wallet desconectada de esta sesión.');
    previous.current = snapshot;
  }, [snapshot, notify]);
  return snapshot;
}
