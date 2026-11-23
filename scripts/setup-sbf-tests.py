"""Prepara herramientas de pruebas en caché local, sin instaladores globales."""

from hashlib import file_digest
from pathlib import Path
import subprocess
import shutil
import sys
import tarfile
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / ".cache/sbf-tests"
ARCHIVES = (
    ("agave-2.3.0.tar.bz2", "https://github.com/anza-xyz/agave/releases/download/v2.3.0/solana-release-x86_64-unknown-linux-gnu.tar.bz2", "56241fbe862495ff01b2b875195e44f94c22e9f2a504591a3ade1b9d82862730"),
    ("platform-tools-1.52.tar.bz2", "https://github.com/anza-xyz/platform-tools/releases/download/v1.52/platform-tools-linux-x86_64.tar.bz2", "8b3861e93daf085ec12b65c4fac374d9bec4587a3de16871da6b08ab0c1d907e"),
)


def main() -> None:
    print("Caché local: Agave 2.3.0, platform-tools 1.52 y solders 0.26.0. Sin cambios globales.", flush=True)
    for name, url, digest in ARCHIVES:
        archive = CACHE / "downloads" / name
        archive.parent.mkdir(parents=True, exist_ok=True)
        if not archive.exists():
            print(f"Descargando {name}…", flush=True)
            partial = archive.with_suffix(".part")
            with urllib.request.urlopen(url, timeout=60) as source, partial.open("wb") as target:
                while chunk := source.read(1024 * 1024):
                    target.write(chunk)
            partial.replace(archive)
        with archive.open("rb") as source:
            if file_digest(source, "sha256").hexdigest() != digest:
                raise RuntimeError(f"Checksum incorrecto o descarga incompleta: {archive}")
        tools = CACHE / "tools"
        if name.startswith("agave"):
            expected = tools / "solana-release/bin/platform-tools-sdk/sbf/scripts/strip.sh"
            if not expected.exists():
                with tarfile.open(archive, "r:bz2") as contents:
                    for member in contents:
                        if member.name == "solana-release/bin/cargo-build-sbf" or member.name.startswith("solana-release/bin/platform-tools-sdk/"):
                            contents.extract(member, tools, filter="data")
        else:
            output = tools / "platform-tools-v1.52"
            if not (output / "rust/bin/rustc").exists():
                with tarfile.open(archive, "r:bz2") as contents:
                    contents.extractall(output, filter="data")
    original_sdk = CACHE / "tools/solana-release/bin/platform-tools-sdk/sbf"
    sdk = CACHE / "tools/sbf-sdk"
    (sdk / "scripts").mkdir(parents=True, exist_ok=True)
    shutil.copyfile(original_sdk / "syscalls.txt", sdk / "syscalls.txt")
    # El strip.sh oficial ejecuta install.sh y puede cambiar rustup global.
    # El adaptador local solo invoca llvm-objcopy de la versión ya verificada.
    strip = sdk / "scripts/strip.sh"
    strip.write_text('#!/usr/bin/env bash\nset -euo pipefail\ntask_sdk="$(cd -- "$(dirname -- "$0")/.." && pwd)"\nexec "$task_sdk/dependencies/platform-tools/llvm/bin/llvm-objcopy" --strip-all "$1" "$2"\n')
    strip.chmod(0o755)
    link = sdk / "dependencies/platform-tools"
    link.parent.mkdir(parents=True, exist_ok=True)
    if link.is_symlink():
        link.unlink()
    if not link.exists():
        link.symlink_to(CACHE / "tools/platform-tools-v1.52", target_is_directory=True)
    subprocess.run([sys.executable, "-m", "pip", "install", "--target", str(CACHE / "python"), "--upgrade", "--only-binary=:all:", "--require-hashes", "--disable-pip-version-check", "-r", str(ROOT / "tests/sbf/requirements.txt")], check=True)
    print("Herramientas preparadas. Ejecutar: python3 scripts/test-sbf.py", flush=True)


if __name__ == "__main__":
    main()
