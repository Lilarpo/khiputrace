import { spawn } from 'node:child_process';
import WebSocket from 'ws';
import { resolve } from 'node:path';
const child = spawn('python3', ['tests/browser/local-rpc.py'], {
  stdio: 'inherit', env: { ...process.env, PYTHONPATH: resolve('.cache/sbf-tests/python') },
});
// ConfirmTransaction de web3.js usa WebSocket y polling HTTP. Esta conexión
// confirma únicamente firmas realmente procesadas por la VM, sin simular éxito.
const socket = new WebSocket.Server({ host: '127.0.0.1', port: 18900 });
socket.on('connection', (client) => {
  let timer;
  client.on('message', async (raw) => {
    const request = JSON.parse(raw.toString());
    client.send(JSON.stringify({ jsonrpc: '2.0', id: request.id, result: request.method === 'signatureSubscribe' ? 1 : true }));
    if (request.method !== 'signatureSubscribe') return;
    timer = setInterval(async () => {
      const response = await fetch('http://127.0.0.1:18899', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getSignatureStatuses', params: [[request.params[0]]] }) }).then((value) => value.json());
      const status = response.result?.value[0];
      if (status && client.readyState === 1) {
        clearInterval(timer);
        client.send(JSON.stringify({ jsonrpc: '2.0', method: 'signatureNotification', params: { subscription: 1, result: { context: { slot: status.slot }, value: { err: status.err } } } }));
      }
    }, 100);
  });
  client.on('close', () => clearInterval(timer));
});
const stop = () => { child.kill('SIGTERM'); socket.close(); process.exit(); };
process.on('SIGTERM', stop); process.on('SIGINT', stop);
child.on('exit', (code) => { if (code) process.exit(code); });
