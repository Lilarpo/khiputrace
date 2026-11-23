"""Compila SBF y ejecuta transacciones LiteSVM; falla ante cualquier error."""

import hashlib
import os
import re
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / ".cache/sbf-tests"
EVIDENCE = ROOT / "docs/evidence"
PREFIX = os.environ.get("KHIPUTRACE_EVIDENCE_PREFIX", "1.3")
if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9.-]*", PREFIX):
    raise SystemExit("Prefijo de evidencia inválido")


def run_logged(command: list[str], environment: dict[str, str], filename: str) -> None:
    with (EVIDENCE / filename).open("w") as log:
        process = subprocess.Popen(command, cwd=ROOT, env=environment, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
        assert process.stdout is not None
        for line in process.stdout:
            print(line, end="", flush=True)
            log.write(line)
        if process.wait() != 0:
            raise SystemExit(process.returncode)


def main() -> None:
    tools = CACHE / "tools"
    compiler = tools / "solana-release/bin/cargo-build-sbf"
    rust = tools / "platform-tools-v1.52/rust/bin"
    sdk = tools / "sbf-sdk"
    if not compiler.exists() or not (rust / "rustc").exists() or not (CACHE / "python/solders").is_dir():
        raise SystemExit("Faltan herramientas locales. Ejecutar primero: python3 scripts/setup-sbf-tests.py")
    environment = os.environ.copy()
    environment.update({
        "PATH": f"{rust}:{environment.get('PATH', '')}",
        "RUSTC": str(rust / "rustc"),
        "RUSTDOC": str(rust / "rustdoc"),
        "CARGO_BUILD_JOBS": "2",
        "PYTHONPATH": str(CACHE / "python"),
    })
    EVIDENCE.mkdir(parents=True, exist_ok=True)
    # build-sbf genera un keypair si no existe este nombre. El archivo vacío,
    # temporal y fuera del proyecto evita generar claves: la VM solo necesita ELF.
    with tempfile.TemporaryDirectory(prefix="khiputrace-sbf-") as temporary:
        (Path(temporary) / "khiputrace-keypair.json").touch()
        command = [
            str(compiler),
            "--manifest-path", str(ROOT / "programs/khiputrace/Cargo.toml"),
            "--sbf-sdk", str(sdk),
            "--skip-tools-install", "--no-rustup-override",
            "--arch", "v0", "--jobs", "2",
            "--sbf-out-dir", temporary, "--", "--locked",
        ]
        run_logged(command, environment, f"{PREFIX}-build.log")
        artifact = ROOT / "target/sbf/khiputrace.so"
        artifact.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(Path(temporary) / "khiputrace.so", artifact)
    print(f"SBF SHA-256: {hashlib.sha256(artifact.read_bytes()).hexdigest()}", flush=True)
    environment["KHIPUTRACE_SBF"] = str(artifact)
    run_logged(
        [sys.executable, "-m", "unittest", "discover", "-s", "tests/sbf", "-p", "test_program.py", "-v"],
        environment,
        f"{PREFIX}-tests.log",
    )


if __name__ == "__main__":
    main()
