import { createContext, useCallback, useContext, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Icon } from '../components/Icon';
interface Notice { id: number; message: string; tone: 'success' | 'error' | 'info' }
type Notify = (message: string, tone?: Notice['tone']) => void;
const NotificationContext = createContext<Notify>(() => undefined);
export function Notifications({ children }: { children: ReactNode }) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const sequence = useRef(0);
  const notify = useCallback<Notify>((message, tone = 'info') => {
    const id = ++sequence.current;
    setNotices((current) => [...current.slice(-3), { id, message, tone }]);
  }, []);
  return <NotificationContext.Provider value={notify}>{children}<div className="toasts" aria-label="Notificaciones">
    {notices.map((notice) => <div key={notice.id} className={`toast ${notice.tone}`} role={notice.tone === 'error' ? 'alert' : 'status'}>
      <Icon name={notice.tone === 'error' ? 'alert' : 'check'} /><span>{notice.message}</span>
      <button className="icon-button" aria-label="Cerrar notificación" onClick={() => setNotices((current) => current.filter((item) => item.id !== notice.id))}><Icon name="close" size={16} /></button>
    </div>)}
  </div></NotificationContext.Provider>;
}
export function useNotifications() { return useContext(NotificationContext); }
