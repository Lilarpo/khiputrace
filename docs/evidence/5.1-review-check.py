"""Comprobaciones acotadas de revisión; no firma ni modifica cuentas Solana."""

import base64
import datetime
import hashlib
import json
import os
from pathlib import Path
import re
import urllib.request

ROOT = Path(__file__).resolve().parents[2]
os.chdir(ROOT)
EXCLUDED = {"node_modules", ".cache", "target", ".git", "__pycache__"}
PATTERNS = {
    "private_pem": re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
    "github_token": re.compile(r"\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{50,})\b"),
    "aws_access_id": re.compile(r"\bAKIA[A-Z0-9]{16}\b"),
}
report = {"checkedAtUtc": datetime.datetime.now(datetime.timezone.utc).isoformat(),
          "scope": "Archivos locales de texto, incluidos dist y .env; sin cachés, dependencias, target ni historial Git. Patrones limitados, no detección exhaustiva.",
          "secretCandidates": [], "textFilesScanned": 0}
for directory, folders, files in os.walk(ROOT):
    folders[:] = [name for name in folders if name not in EXCLUDED]
    for name in files:
        path = Path(directory) / name
        if path.is_symlink():
            continue
        relative = str(path.relative_to(ROOT))
        if name.endswith("-keypair.json") or name == "id.json":
            report["secretCandidates"].append({"path": relative, "kind": "keypair_filename"})
        try:
            text = path.read_text()
        except (UnicodeError, OSError):
            continue
        report["textFilesScanned"] += 1
        for kind, pattern in PATTERNS.items():
            if pattern.search(text):
                report["secretCandidates"].append({"path": relative, "kind": kind})
        if path.suffix == ".json":
            try:
                value = json.loads(text)
                if isinstance(value, list) and len(value) == 64 and all(type(n) is int and 0 <= n < 256 for n in value):
                    report["secretCandidates"].append({"path": relative, "kind": "possible_solana_keypair"})
            except ValueError:
                pass

manifest = json.loads(Path("docs/evidence/4.2-manifest.json").read_text())
historical = {name: expected for name, expected in manifest["sha256"].items() if name.startswith("docs/evidence/")}
previous = json.loads(Path("docs/evidence/4.1-deployed-manifest.json").read_text())
for name, expected in previous["sha256"].items():
    if name.startswith("docs/evidence/"):
        historical.setdefault(name, expected)
report["historicalEvidenceChecked"] = len(historical)
report["historicalEvidenceChanges"] = [name for name, expected in historical.items()
    if not Path(name).exists() or hashlib.sha256(Path(name).read_bytes()).hexdigest() != expected]
report["hasGitHistory"] = Path(".git").exists()
report["envVariableNames"] = {str(path): [line.split("=", 1)[0] for line in path.read_text().splitlines()
    if line and not line.startswith("#") and "=" in line]
    for path in Path("frontend").glob(".env*")}
idl = json.loads(Path("frontend/src/infrastructure/anchor/generated/khiputrace.json").read_text())
local = Path("target/sbf/khiputrace.so").read_bytes()
report["programId"] = idl["address"]
report["localElfSha256"] = hashlib.sha256(local).hexdigest()
report["sameElfAs42"] = report["localElfSha256"] == manifest["elfSha256"]

def rpc(method, params):
    request = urllib.request.Request("https://api.devnet.solana.com", data=json.dumps({
        "jsonrpc": "2.0", "id": 1, "method": method, "params": params}).encode(),
        headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(request, timeout=25) as response:
        result = json.load(response)
    if "error" in result:
        raise RuntimeError(str(result["error"]))
    return result["result"]

try:
    genesis = rpc("getGenesisHash", [])
    assert genesis == "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG"
    keys = [idl["address"], "26Ro9jtk13JNZtmigtZXSKH7BXPDY9i6LThWKgZeRiuz"]
    accounts = rpc("getMultipleAccounts", [keys, {"encoding": "base64", "commitment": "finalized"}])
    program, data = accounts["value"]
    loader = "BPFLoaderUpgradeab1e11111111111111111111111"
    assert program["executable"] and program["owner"] == loader and data["owner"] == loader
    raw_program = base64.b64decode(program["data"][0])
    raw_data = base64.b64decode(data["data"][0])
    assert int.from_bytes(raw_program[:4], "little") == 2
    assert int.from_bytes(raw_data[:4], "little") == 3
    # Identidades públicas; base58 sin dependencias adicionales.
    alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
    def public_bytes(value):
        number = 0
        for char in value:
            number = number * 58 + alphabet.index(char)
        return b"\0" * (len(value) - len(value.lstrip("1"))) + number.to_bytes((number.bit_length() + 7) // 8, "big")
    assert raw_program[4:36] == public_bytes(keys[1])
    assert raw_data[12] == 1 and raw_data[13:45] == public_bytes("Bd6Xa9JV3x3hZVkEnuGnH323MZxhYuCXuRe6DFSK3LKT")
    assert raw_data[45:] == local
    report["devnetReadOnly"] = {"status": "passed", "genesis": genesis, "slot": accounts["context"]["slot"],
        "programData": keys[1], "sameElf": True, "expectedUpgradeAuthority": True, "writes": 0}
except Exception as error:
    report["devnetReadOnly"] = {"status": "incomplete", "error": str(error), "writes": 0}

Path("docs/evidence/5.1-review-check.json").write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps(report, indent=2))
assert not report["secretCandidates"], "Revisar candidatos sin imprimir sus valores."
assert not report["historicalEvidenceChanges"]
assert report["sameElfAs42"]
