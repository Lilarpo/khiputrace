"""RPC mínimo exclusivo de pruebas: ejecuta el ELF existente en LiteSVM.

No es un validador Solana ni un backend de la aplicación. Sin claves privadas;
solo escucha en loopback y desaparece al terminar Playwright.
"""
import base64
import hashlib
from http.server import BaseHTTPRequestHandler, HTTPServer
import json
import os
from pathlib import Path

from solders.litesvm import LiteSVM
from solders.pubkey import Pubkey
from solders.transaction import Transaction
from solders.transaction_metadata import FailedTransactionMetadata

ROOT = Path(__file__).resolve().parents[2]
IDL = json.loads((ROOT / 'frontend/src/infrastructure/anchor/generated/khiputrace.json').read_text())
PREFIX = os.environ.get('KHIPUTRACE_EVIDENCE_PREFIX', '3.2')
PROGRAM = Pubkey.from_string(IDL['address'])
ARTIFACT = ROOT / 'target/sbf/khiputrace.so'
SVM = LiteSVM().with_sigverify(True).with_blockhash_check(True)
SVM.add_program(PROGRAM, ARTIFACT.read_bytes())
ADDRESSES = {PROGRAM}
STATUSES = {}
EVIDENCE = {'environment': 'LiteSVM local; RPC mínimo de pruebas, no Devnet ni validador',
            'program': str(PROGRAM), 'sbf_sha256': hashlib.sha256(ARTIFACT.read_bytes()).hexdigest(), 'transactions': []}


def account(address):
    value = SVM.get_account(address)
    if value is None:
        return None
    return {'lamports': value.lamports, 'owner': str(value.owner), 'executable': value.executable,
            'rentEpoch': 0, 'data': [base64.b64encode(value.data).decode(), 'base64']}


def evidence_account(address):
    value = account(address)
    if value and value['executable']:
        # Conservar integridad del programa sin duplicar el ELF en cada snapshot.
        raw = base64.b64decode(value.pop('data')[0])
        value['data_sha256'] = hashlib.sha256(raw).hexdigest()
    return value


def decode58(value):
    number = 0
    for char in value:
        number = number * 58 + '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'.index(char)
    return bytes(len(value) - len(value.lstrip('1'))) + number.to_bytes((number.bit_length() + 7) // 8, 'big')


class RpcFailure(Exception):
    def __init__(self, data):
        self.data = data


def rpc(method, params):
    if method == 'getGenesisHash':
        # Identificador explícito del arnés local, jamás el genesis de una red pública.
        return str(Pubkey.from_bytes(hashlib.sha256(b'KhipuTrace-LiteSVM-test-only').digest()))
    if method == 'getAccountInfo':
        return {'context': {'slot': 1}, 'value': account(Pubkey.from_string(params[0]))}
    if method == 'getProgramAccounts':
        result = []
        for address in sorted(ADDRESSES, key=str):
            value = SVM.get_account(address)
            if not value or str(value.owner) != params[0]:
                continue
            valid = True
            for item in params[1].get('filters', []):
                if 'dataSize' in item:
                    valid &= len(value.data) == item['dataSize']
                else:
                    spec = item['memcmp']
                    expected = decode58(spec['bytes'])
                    valid &= value.data[spec['offset']:spec['offset'] + len(expected)] == expected
            if valid:
                result.append({'pubkey': str(address), 'account': account(address)})
        return result
    if method == 'getLatestBlockhash':
        return {'context': {'slot': 1}, 'value': {'blockhash': str(SVM.latest_blockhash()), 'lastValidBlockHeight': 1000}}
    if method == 'getBlockHeight':
        return 1
    if method == 'requestAirdrop':
        result = SVM.airdrop(Pubkey.from_string(params[0]), params[1])
        if isinstance(result, FailedTransactionMetadata):
            raise ValueError('Airdrop local falló')
        return str(result.signature())
    if method == 'getSignatureStatuses':
        return {'context': {'slot': 1}, 'value': [STATUSES.get(signature) for signature in params[0]]}
    if method == 'sendTransaction':
        transaction = Transaction.from_bytes(base64.b64decode(params[0]))
        signature = str(transaction.signatures[0])
        keys = list(transaction.message.account_keys)
        before = {str(key): evidence_account(key) for key in keys}
        simulation = SVM.simulate_transaction(transaction)
        preflight_failed = isinstance(simulation, FailedTransactionMetadata)
        result = simulation if preflight_failed else SVM.send_transaction(transaction)
        failed = isinstance(result, FailedTransactionMetadata)
        metadata = result.meta() if failed else result
        error = json.loads(result.to_json())['err'] if failed else None
        after = {str(key): evidence_account(key) for key in keys}
        EVIDENCE['transactions'].append({'signature': signature, 'signature_kind': 'prepared_not_submitted' if preflight_failed else 'executed_in_vm', 'error': error, 'logs': metadata.logs(), 'before': before, 'after': after})
        (ROOT / f'docs/evidence/{PREFIX}-sbf-flow.json').write_text(json.dumps(EVIDENCE, indent=2) + '\n')
        if failed:
            raise RpcFailure({'code': -32002, 'message': 'Transaction simulation failed', 'data': {'err': error, 'logs': metadata.logs()}})
        ADDRESSES.update(keys)
        STATUSES[signature] = {'slot': 1, 'confirmations': 1, 'err': None, 'confirmationStatus': 'confirmed'}
        return signature
    raise ValueError(f'Método fuera del arnés: {method}')


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_args):
        pass

    def headers_for(self):
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, solana-client')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.headers_for()

    def do_GET(self):
        self.send_response(200)
        self.headers_for()
        self.wfile.write(json.dumps(EVIDENCE if self.path == '/evidence' else {'ready': True}).encode())

    def do_POST(self):
        request = json.loads(self.rfile.read(int(self.headers['Content-Length'])))
        try:
            response = {'result': rpc(request['method'], request.get('params', []))}
        except RpcFailure as error:
            response = {'error': error.data}
        except Exception as error:
            response = {'error': {'code': -32603, 'message': str(error)}}
        self.send_response(200)
        self.headers_for()
        self.wfile.write(json.dumps({'jsonrpc': '2.0', 'id': request['id'], **response}).encode())


print('LiteSVM RPC local en 127.0.0.1:18899', flush=True)
HTTPServer(('127.0.0.1', 18899), Handler).serve_forever()
