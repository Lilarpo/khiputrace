import { useEffect, useRef } from 'react';
import type { WalletConnection, WalletSnapshot } from '../../application/wallet';
import { Icon } from './Icon';
export function WalletDialog({ open, close, connection, wallet, network = 'Devnet' }: {
  open: boolean; close: () => void; connection: WalletConnection; wallet: WalletSnapshot; network?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (open && !dialog.current?.open) dialog.current?.showModal(); else if (!open) dialog.current?.close(); }, [open]);
  useEffect(() => { if (wallet.account) close(); }, [wallet.account, close]);
  const cancel = () => { if (wallet.status === 'connecting') void connection.disconnect(); close(); };
  return <dialog ref={dialog} className="wallet-dialog" aria-labelledby="wallet-title" onCancel={cancel} onClick={(event) => { if (event.target === event.currentTarget) cancel(); }}>
    <div className="dialog-content"><button className="icon-button dialog-close" aria-label="Cerrar selector de wallet" onClick={cancel}><Icon name="close" /></button>
      <span className="feature-icon"><Icon name="wallet" size={25} /></span>
      <p className="eyebrow">TU IDENTIDAD EN SOLANA</p><h2 id="wallet-title">Conecta tu wallet</h2>
      <p>Comparte tu dirección pública para consultar tus auditorías en {network}.</p>
      <div className="wallet-choices">
        {wallet.choices.length === 0 ? <div className="empty-wallet"><strong>No detectamos wallets compatibles</strong><p>Abre esta página en un navegador con una wallet que admita Wallet Standard y la red configurada.</p></div>
          : wallet.choices.map((choice) => <button key={choice.id} className="wallet-choice" disabled={wallet.status === 'connecting' || wallet.status === 'disconnecting'} onClick={() => void connection.connect(choice.id)}><span className="wallet-avatar"><Icon name="wallet" /></span><span>{choice.name}</span>{wallet.status === 'connecting' ? <span className="spinner" aria-label="Conectando" /> : <Icon name="arrow" size={18} />}</button>)}
      </div>
      {wallet.error && <p className="inline-error" role="alert">{wallet.error}</p>}
      {wallet.status === 'connecting' && <p role="status">Revisa la solicitud en tu wallet. <button className="text-button" onClick={cancel}>Cancelar conexión</button></p>}
      <div className="dialog-note"><Icon name="shield" /><span>Esta conexión no solicita firmas ni mueve fondos. La autorización de cada operación se verifica en el programa.</span></div>
    </div>
  </dialog>;
}
