"""Genera claves Devnet fuera del repositorio sin imprimir secretos ni sobrescribir."""

import json
import os
from pathlib import Path
import stat
import subprocess

ROOT = Path(__file__).resolve().parents[1]
KEYGEN = ROOT / ".cache/sbf-tests/tools/solana-release/bin/solana-keygen"
DIRECTORY = Path.home() / ".local/share/khiputrace/devnet"


def main() -> None:
    os.umask(0o077)
    if DIRECTORY.is_symlink():
        raise SystemExit("No se permite un directorio de claves simbólico.")
    DIRECTORY.mkdir(mode=0o700, parents=True, exist_ok=True)
    if DIRECTORY.stat().st_uid != os.getuid():
        raise SystemExit("El directorio no pertenece al usuario actual.")
    DIRECTORY.chmod(0o700)
    report = {"network": "devnet", "directory": str(DIRECTORY), "keys": {}}
    for name in ("deployer", "program", "buffer"):
        path = DIRECTORY / f"{name}-keypair.json"
        if path.is_symlink():
            raise SystemExit("No se permiten archivos de claves simbólicos.")
        if not path.exists():
            subprocess.run([str(KEYGEN), "new", "--silent", "--no-bip39-passphrase", "--outfile", str(path)], check=True, stdout=subprocess.DEVNULL)
        if path.stat().st_uid != os.getuid() or not path.is_file():
            raise SystemExit("Archivo de claves inválido o ajeno.")
        path.chmod(0o600)
        address = subprocess.check_output([str(KEYGEN), "pubkey", str(path)], text=True).strip()
        report["keys"][name] = {"path": str(path), "publicKey": address, "permissions": oct(stat.S_IMODE(path.stat().st_mode))}
    destination = ROOT / "docs/evidence/4.1-identities.json"
    destination.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
