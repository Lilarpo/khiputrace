import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './presentation/App';
import { createRuntime } from './composition/runtime';

const root = document.getElementById('root');
if (root === null) throw new Error('No se encontró el contenedor de la aplicación.');
const configuredId: unknown = import.meta.env.VITE_KHIPUTRACE_PROGRAM_ID;
const configuredCluster: unknown = import.meta.env.VITE_KHIPUTRACE_CLUSTER;
const configuredEndpoint: unknown = import.meta.env.VITE_KHIPUTRACE_RPC_URL;
const runtime = await createRuntime(typeof configuredId === 'string' ? configuredId : undefined, { ...(typeof configuredCluster === 'string' && configuredCluster ? { cluster: configuredCluster } : {}), ...(typeof configuredEndpoint === 'string' && configuredEndpoint ? { endpoint: configuredEndpoint } : {}) });
createRoot(root).render(<StrictMode><App findings={runtime.services?.findings ?? null} network={runtime.network} wallet={runtime.wallet} audits={runtime.services?.audits ?? null} configurationError={runtime.configurationError} /></StrictMode>);
if (import.meta.hot) import.meta.hot.dispose(runtime.dispose);
