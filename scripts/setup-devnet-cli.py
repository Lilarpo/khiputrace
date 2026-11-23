"""Extrae dos CLI fijadas de la caché verificada; no cambia PATH ni configuración."""

import hashlib
from pathlib import Path
import tarfile

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / ".cache/sbf-tests"
ARCHIVE = CACHE / "downloads/agave-2.3.0.tar.bz2"
EXPECTED = "56241fbe862495ff01b2b875195e44f94c22e9f2a504591a3ade1b9d82862730"


def main() -> None:
    if not ARCHIVE.is_file():
        raise SystemExit("Falta el archivo Agave 2.3.0; consultar scripts/setup-sbf-tests.py.")
    with ARCHIVE.open("rb") as source:
        if hashlib.file_digest(source, "sha256").hexdigest() != EXPECTED:
            raise SystemExit("Checksum Agave incorrecto; no se extrae ningún ejecutable.")
    needed = {"solana-release/bin/solana", "solana-release/bin/solana-keygen"}
    # Lectura secuencial para evitar varias descompresiones del archivo completo.
    with tarfile.open(ARCHIVE, "r|bz2") as contents:
        for member in contents:
            if member.name in needed:
                if not member.isfile():
                    raise SystemExit("El ejecutable no es un archivo regular.")
                contents.extract(member, CACHE / "tools", filter="data")
                needed.remove(member.name)
                if not needed:
                    break
    if needed:
        raise SystemExit(f"Faltan ejecutables: {sorted(needed)}")
    print("Solana CLI y keygen 2.3.0 preparados en caché local; sin cambios globales.")


if __name__ == "__main__":
    main()
