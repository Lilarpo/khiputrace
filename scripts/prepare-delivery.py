"""Prepara una copia pública local, sin sobrescribir, publicar ni leer wallets."""

import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parents[1]
DESTINATION = ROOT / ".cache/delivery/KhipuTrace"
ARCHIVE = ROOT / ".cache/delivery/KhipuTrace-WayLearn.zip"
FOLDERS = ("frontend", "programs", "tools", "scripts", "tests", "config", "docs")
EXCLUDED = {"node_modules", "target", "dist", ".cache", ".git", "__pycache__"}
ROOT_FILES = ("README.md", "AGENTS.md", ".gitignore", "Cargo.toml", "Cargo.lock", "Anchor.toml", "package.json", "package-lock.json")


def digest(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def sensitive_name(path: Path) -> bool:
    name = path.name.lower()
    return ((name == ".env" or name.startswith(".env.")) and name != ".env.example"
            or name.endswith(("-keypair.json", ".pem", ".key", ".p12", ".pfx"))
            or name in {"id.json", ".npmrc", ".netrc", "credentials"})


def check_text(text: str, path: Path) -> None:
    # Solo devolver ruta/tipo; nunca imprimir el valor de un candidato.
    patterns = (
        r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----",
        r"\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{50,})\b",
        r"\bAKIA[A-Z0-9]{16}\b",
        r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}",
    )
    if any(re.search(pattern, text) for pattern in patterns):
        raise RuntimeError(f"Candidato sensible o correo que requiere revisión: {path}")
    if path.suffix == ".json":
        try:
            value = json.loads(text)
        except ValueError:
            return
        if isinstance(value, list) and len(value) == 64 and all(type(n) is int and 0 <= n < 256 for n in value):
            raise RuntimeError(f"Posible keypair serializado: {path}")


def main() -> None:
    if DESTINATION.exists() or ARCHIVE.exists():
        raise SystemExit("La entrega ya existe; conservarla y revisar antes de preparar otra versión.")
    paths = [ROOT / name for name in ROOT_FILES]
    paths.extend(ROOT.glob("playwright*.ts"))
    for folder in FOLDERS:
        paths.extend(path for path in (ROOT / folder).rglob("*") if path.is_file()
                     and not any(part in EXCLUDED for part in path.relative_to(ROOT).parts))
    manifest = {"submodule": "5.2", "scope": "Copia de entrega local; sin commit, remote ni push",
                "privacy": "Rutas de usuario anonimizadas. Patrones limitados; no garantiza detección universal.",
                "redacted": {}, "excluded": [], "sha256": {}}
    DESTINATION.mkdir(parents=True)
    # Los marcadores son literales de metadatos, no comandos que deban ejecutarse.
    user_path = re.compile("/" + r"home/[^/\s\"'<>]+")
    for path in sorted(set(paths)):
        relative = path.relative_to(ROOT)
        if path.is_symlink():
            raise RuntimeError(f"Enlace simbólico fuera del alcance: {relative}")
        if sensitive_name(path):
            manifest["excluded"].append(str(relative))
            continue
        original = path.read_bytes()
        content = original
        try:
            text = original.decode("utf-8")
        except UnicodeError:
            # Los únicos binarios entregables son capturas PNG; sin archivos arbitrarios.
            if path.suffix != ".png" or not original.startswith(b"\x89PNG\r\n\x1a\n"):
                raise RuntimeError(f"Binario no previsto: {relative}")
        else:
            text = text.replace(str(ROOT), "${PROJECT_ROOT}")
            text = user_path.sub("${HOME}", text)
            check_text(text, relative)
            content = text.encode("utf-8")
        if content != original:
            manifest["redacted"][str(relative)] = {"originalSha256": digest(original), "deliverySha256": digest(content)}
        output = DESTINATION / relative
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_bytes(content)
        manifest["sha256"][str(relative)] = digest(content)
    manifest_path = DESTINATION / "docs/evidence/5.2-delivery-manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
    subprocess.run(["git", "init", "--initial-branch=main", "--quiet", str(DESTINATION)], check=True)
    subprocess.run(["git", "-C", str(DESTINATION), "add", "--all"], check=True)
    # El ZIP contiene solo archivos revisados; excluye .git y artefactos de instalación.
    with zipfile.ZipFile(ARCHIVE, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for relative in [*manifest["sha256"], "docs/evidence/5.2-delivery-manifest.json"]:
            archive.write(DESTINATION / relative, f"KhipuTrace/{relative}")
    print(json.dumps({"repository": ".cache/delivery/KhipuTrace", "archive": ".cache/delivery/KhipuTrace-WayLearn.zip",
                      "files": len(manifest["sha256"]), "redactedMetadataFiles": len(manifest["redacted"]),
                      "excluded": manifest["excluded"], "archiveSha256": digest(ARCHIVE.read_bytes()),
                      "git": "main, archivos staged, sin commits/remotes/push"}, indent=2))


if __name__ == "__main__":
    main()
