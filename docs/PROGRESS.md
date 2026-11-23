# Progreso de KhipuTrace

## Submódulo 0.1 — Diagnóstico del entorno

Fecha: 21 de noviembre de 2026 (America/La_Paz).

Estado: diagnóstico completado; entorno todavía no preparado para compilar programas Solana. No se instalaron herramientas, no se cambiaron configuraciones globales, no se generaron wallets y no se implementaron funcionalidades.

### Carpeta y sistema

- Ruta inspeccionada: `/home/dani/Documentos/PROYECTOS/KHIPUTRACE`.
- Al comenzar, el único archivo era `AGENTS.md`, leído antes del diagnóstico. No existían código, manifests, lockfiles, pruebas ni directorio `.git`.
- `git rev-parse --is-inside-work-tree` confirmó que la carpeta no es un repositorio Git (salida 128). Es un pendiente de inicialización, no un fallo de Git.
- Sistema observado: Linux Mint 22.3 Zena, base Ubuntu Noble, x86_64, kernel `6.8.0-149-generic`.
- El usuario indica 12 GB de RAM. `free -h` mostró aproximadamente 10 GiB utilizables por el sistema, 6.1 GiB disponibles y 9.6 GiB de swap sin uso en ese momento. Son magnitudes y mediciones distintas; no se verificó la capacidad física instalada.
- `df -h .`: partición de `/home` de 262 GiB, 225 GiB usados, 24 GiB disponibles, uso del 91 %. Evitar descargar toolchains y generar artefactos sin revisar el espacio.

### Inventario verificado

| Herramienta | Resultado | Ubicación o detalle |
| --- | --- | --- |
| Rust | `rustc 1.99.1 (58cf8f9c3 2026-10-13)` | `/home/dani/.cargo/bin/rustc` |
| Cargo | `cargo 1.99.1 (5f94df478 2026-08-27)` | `/home/dani/.cargo/bin/cargo` |
| rustup | Disponible | Toolchain único listado: `stable-x86_64-unknown-linux-gnu`, activo y predeterminado. |
| Solana CLI | No localizado | Ausente del `PATH`; tampoco existe el directorio habitual `~/.local/share/solana/install/active_release/bin`. |
| Solana keygen | No localizado | Ausente del `PATH`. |
| Compilador SBF | `cargo-build-sbf` no localizado | No se puede comprobar compilación on-chain todavía. |
| Validador local | `solana-test-validator` no localizado | No se ejecutó Localnet. |
| Anchor CLI | No localizado | Ausente del `PATH`. |
| AVM | No localizado | Ausente del `PATH`; tampoco existe `~/.avm/bin`. Es un gestor recomendado, no un requisito si se instala Anchor por otra vía. |
| Node.js | `v24.22.0` | `/home/dani/.nvm/versions/node/v24.22.0/bin/node` |
| npm | `11.19.1` | Mismo directorio de Node.js. |
| Git | `2.43.0` | `/usr/bin/git` |
| VS Code | `1.146.0`, x64 | `/usr/bin/code`; consulta CLI correcta, interfaz gráfica no comprobada. |
| Compilador C | GCC `13.3.0` | `/usr/bin/cc` |
| Make | GNU Make `4.3` | Disponible. |
| pkg-config | `1.8.1` | Detecta OpenSSL `3.0.13`. |
| OpenSSL | `3.0.13` | CLI y biblioteca disponibles. |
| curl | `8.5.0` | Consultas HTTPS/RPC correctas. |
| Python | `3.12.3` | Utilizado para revisión documental. |
| Clang / CMake | Instalados | Paquetes `clang 1:18.0-59~exp2` y `cmake 3.28.3-1build7`; ejecutables localizados. |
| Yarn / pnpm | No localizados | No instalarlos por defecto: se prioriza npm; revisar solo si la plantilla elegida los exige. |

`dpkg-query` confirmó `build-essential 12.10ubuntu1` y `libssl-dev 3.0.13-0ubuntu3.16`. No devolvió paquetes instalados para `libudev-dev`, `libclang-dev` y `protobuf-compiler`; `protoc` tampoco se localizó. Son dependencias potenciales de determinadas compilaciones, no bloqueos demostrados: verificar los requisitos de las versiones seleccionadas antes de proponer su instalación.

La búsqueda se limitó al `PATH` de esta sesión y a directorios habituales de Solana/AVM. No equivale a demostrar que no existan instalaciones en otras rutas del disco.

### Compatibilidad y límites de la conclusión

- Linux x86_64 corresponde a una plataforma de desarrollo cubierta por las instrucciones oficiales de instalación. No se certificó una combinación concreta de herramientas mediante compilación.
- Node.js `24.22.0` satisface el requisito de versión de la guía actual de Vite (`20.19+` o `22.12+`). Conservar Node y npm por ahora. No hay `package.json` para validar los requisitos de las dependencias finales.
- Rust y Cargo están disponibles dentro del mismo toolchain estable. El Rust del host no prueba la compatibilidad del compilador SBF: este usa herramientas específicas que aún faltan.
- No hay una incompatibilidad entre versiones instalada y demostrada. El bloqueo actual es la ausencia de Solana/Anchor/SBF, y la matriz Anchor–Agave–cliente sigue pendiente de selección y prueba.
- La referencia actual de Anchor CLI indica compilación predeterminada SBF `v3` con platform-tools `v1.57`; para ese modo exige platform-tools >= `v1.53` y `solana-test-validator` >= `4.0` (u otras herramientas compatibles). Esto aplica a la CLI documentada actualmente, no a todas las versiones históricas.
- La guía de instalación muestra ejemplos Anchor `1.2.2` y Agave `4.1.2`; no se adoptan como versiones del proyecto solo por aparecer en una guía. Tampoco se debe copiar un instalador `latest` o actualizar Rust automáticamente.
- WayLearn permite el recorrido con Playground y publica referencias de frontend; su preparación técnica no establece una matriz obligatoria de CLI locales para este proyecto propio. La página de preparación todavía marca el frontend como pendiente mientras la de plantillas ya enlaza una app: contrastar sus manifests antes de reutilizarla.
- RAM y disco son factores operativos, no fallos de compatibilidad demostrados. Como medida inicial, compilar secuencialmente y limitar jobs de Cargo por comando si hay presión de memoria; no cambiar swap ni configuración global ahora.

### Acceso a Devnet: comprobado por HTTPS JSON-RPC

Se realizaron tres solicitudes de lectura a `https://api.devnet.solana.com`, con `curl`, conexión máxima de 10 segundos y tiempo total máximo de 25 segundos por solicitud. Las tres respondieron sin error JSON-RPC; el proceso terminó con código 0.

| Método | Resultado observado |
| --- | --- |
| `getVersion` | `solana-core: 4.5.0-beta.0`, `feature-set: 1591744305` |
| `getGenesisHash` | `EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG` |
| `getSlot`, commitment `confirmed` | `524939797` |

La versión del nodo remoto no es una recomendación de versión para la CLI local. La prueba confirma acceso RPC de lectura desde esta sesión; no confirma WebSocket, faucet, firma, saldo de wallet, envío de transacciones ni despliegue. No se consultó Mainnet.

Comando reproducible para cada método, cambiando el cuerpo JSON según la tabla:

```bash
curl --silent --show-error --connect-timeout 10 --max-time 25 --fail-with-body \
  https://api.devnet.solana.com \
  -H 'Content-Type: application/json' \
  --data '{"jsonrpc":"2.0","id":1,"method":"getVersion"}'
```

Cuerpos adicionales ejecutados:

```json
{"jsonrpc":"2.0","id":2,"method":"getGenesisHash"}
{"jsonrpc":"2.0","id":3,"method":"getSlot","params":[{"commitment":"confirmed"}]}
```

### Comprobaciones ejecutadas y resultados

- Inspección: `cat AGENTS.md`, `ls -la`, `rg --files --hidden` con exclusiones de `.git`, `node_modules` y `target`; solamente existía `AGENTS.md` al inicio.
- Resolución de herramientas: `command -v` para todas las CLI principales y auxiliares indicadas; inspección de directorios habituales de Solana y AVM.
- Versiones: `rustc --version`, `cargo --version`, `rustup show active-toolchain`, `rustup toolchain list`, `node --version`, `npm --version`, `git --version`, `code --version`, `cc --version`, `make --version`, `pkg-config --version`, `curl --version`, `python3 --version`.
- Sistema: `uname -srmo`, `cat /etc/os-release`, `free -h`, `df -h .`.
- Dependencias nativas: `dpkg-query -W` para los paquetes indicados y `pkg-config --modversion openssl`.
- Incidencia corregida durante el diagnóstico: `openssl --version` no es una opción válida; se ejecutó `openssl version` y devolvió `3.0.13`.
- Fuentes oficiales consultadas por web. El índice `llms.txt` de WayLearn falló en el lector web y se recuperó correctamente mediante `curl`; las páginas relevantes sí se consultaron.
- Pruebas funcionales, compilación Rust/SBF, comprobación TypeScript y pruebas de aplicación: **no ejecutadas**, porque no existe implementación ni manifests y faltan las herramientas Solana/Anchor.

### Recomendaciones y pasos exactos para continuar

1. En el próximo submódulo, seleccionar y documentar versiones concretas de Anchor CLI, crates Anchor, Agave/Solana CLI, platform-tools y cliente TypeScript a partir de sus release notes y manifests compatibles. Conservar inicialmente Rust, Node y npm actuales; justificar cualquier cambio mediante un requisito comprobable.
2. Revisar el espacio libre antes de descargar o compilar. No borrar archivos automáticamente. Con la memoria disponible, comenzar con una compilación a la vez; si se necesita, usar `CARGO_BUILD_JOBS=2` por comando sin modificar la configuración global.
3. Antes de instalar, presentar la matriz elegida y los comandos exactos, indicando descargas, espacio previsto cuando sea conocido, dependencias nativas y cualquier cambio de `PATH` o archivos del shell. No hay comandos de instalación ejecutables en este diagnóstico porque todavía no se ha validado esa matriz; evitar instrucciones con versiones arbitrarias o canales móviles.
4. Una vez autorizado el submódulo de preparación, instalar únicamente lo faltante según ese plan. Preferir versiones explícitas y configuración del proyecto frente a cambios globales. No usar el instalador integral que reemplaza herramientas ya disponibles sin revisar su alcance.
5. Tras la instalación, ejecutar esta secuencia de lectura para verificar las herramientas y el acceso sin cambiar la red global:

   ```bash
   rustc --version
   cargo --version
   solana --version
   cargo-build-sbf --version
   solana-test-validator --version
   anchor --version
   node --version
   npm --version
   git --version
   solana --url https://api.devnet.solana.com cluster-version
   solana --url https://api.devnet.solana.com genesis-hash
   solana --url https://api.devnet.solana.com slot
   ```

6. En los submódulos correspondientes, inicializar Git con exclusiones de secretos, completar la documentación base y luego verificar build SBF y pruebas con las versiones fijadas. No ejecutar `anchor init`, generar claves ni crear frontend como parte del diagnóstico.

Siguiente submódulo propuesto: **0.2 — selección de versiones y plan de preparación del entorno**, pendiente de instrucciones. No se ha iniciado.

### Fuentes oficiales consultadas

- [Instalación de Anchor](https://www.anchor-lang.com/docs/installation).
- [Referencia de Anchor CLI y requisitos SBF](https://www.anchor-lang.com/docs/references/cli).
- [Instalación local de Solana](https://solana.com/docs/intro/installation).
- [Clusters y endpoint público Devnet](https://solana.com/docs/references/clusters).
- [Requisitos Node.js de Vite](https://vite.dev/guide/).
- [Preparación técnica de WayLearn](https://waylearn.gitbook.io/solana-engineering-track-advanced/inicio/preparacion-tecnica).
- [Ejemplos y plantillas de WayLearn](https://waylearn.gitbook.io/solana-engineering-track-advanced/recursos/ejemplos-y-plantillas).

### Archivos modificados y pendientes

- Creado: `docs/PROGRESS.md` (este diagnóstico). `AGENTS.md` permanece sin cambios.
- Pendientes: Solana CLI, Anchor CLI y herramientas SBF/localnet; matriz de versiones validada; preparación del repositorio y restantes documentos persistentes.
- El diagnóstico está completo; la preparación y la compatibilidad efectiva del proyecto siguen pendientes. No hay funcionalidades implementadas ni despliegues.

## Submódulo 0.2 — Arquitectura y preparación del scaffold

Fecha: 21 de noviembre de 2026 (America/La_Paz). El usuario definió el alcance de 0.2 como arquitectura y scaffold, sustituyendo la propuesta previa de selección/preparación de entorno.

### Trabajo realizado

- Definida Clean Architecture con Domain puro, contratos de Application, contexto del adaptador Anchor, Presentation React y composición explícita.
- Diseñadas Audit y Finding, sus campos y tamaños máximos, PDAs, autoridad, relación entre cuentas y operaciones. La acción correctiva exige 12–512 bytes UTF-8 tras trim; esto es validación técnica prevista, no evaluación semántica ni regla ya implementada.
- Separados next_finding_id, finding_count y open_finding_count. Se documentó el cierre sin retroceso de IDs, sin cerrar Audit y sin listas crecientes de referencias.
- Preparados módulos Rust por instrucción, límites de dominio, esquemas Anchor/Borsh y catálogo de errores. No hay handlers, contextos de cuentas, Program ID, IDL ni entry point desplegable.
- Preparado frontend con TypeScript estricto, interfaces de lectura/escritura, contratos de casos de uso y pantalla informativa en español. No hay conexión RPC ni wallet.
- Creada matriz de amenazas, controles requeridos y pruebas negativas futuras.
- Seleccionadas versiones directas exactas, config/toolchain.json y lockfiles npm/Cargo. Anchor 0.32.2, Agave 2.3.0 y cliente @anchor-lang/core 0.32.2 con web3.js 1.99.0. React 19.3.1, Vite 8.3.5 y TypeScript 5.9.3. Se conserva Rust/Node/npm del equipo.
- Detectado que platform-tools v1.48 por defecto en Agave usa Rust 1.84.1, insuficiente para el mínimo 1.89 del crate. Seleccionado override v1.52 con arquitectura v0 y documentado el comando futuro; no se instaló ni ejecutó SBF.
- Preparados scripts de arquitectura, tests, tipos, bundle, Rust host, comprobación de CLI y auditoría npm. Se limita Cargo a dos jobs por comando.
- Completados los documentos persistentes de contexto y evidencias como parte del diseño y seguimiento del scaffold.

### Verificación e incidencias

- `npm install --no-fund`: completado; generó package-lock.json. Reportó 7 paquetes afectados y advertencias de extensiones nativas opcionales. No se aprobaron sus scripts.
- `cargo fmt --all` y `cargo generate-lockfile`: completados. Cargo fijó 158 paquetes; algunas macros transitivas Anchor son 0.32.3, permitidas por el crate directo 0.32.2 y registradas en Cargo.lock.
- Primera ejecución de `npm run verify`: falló en TypeScript por falta de declaraciones de bn.js (TS7016). Se corrigió con `@types/bn.js 5.2.0` como dependencia de desarrollo exacta. No se relajó strict ni skipLibCheck.
- `npm ci --ignore-scripts --no-fund`: completado desde el lockfile. `npm ls --depth=0` posterior confirmó las dependencias sin paquetes extraneous.
- `npm run typecheck && npm run build`: completado. Bundle JS de 219.87 kB, 68.78 kB gzip; pantalla informativa, sin SDK operativo.
- `cargo check --workspace --all-targets --locked -j 2`: completado, código 0, en 3 min 19 s en la primera compilación host.
- Revisión documental y de configuración mediante Python: 47 archivos revisados, JSON/TOML válidos, enlaces locales Markdown existentes, bloques de código equilibrados y sin espacios finales.
- Verificación integral final `npm run verify`: resultados finales en TEST_EVIDENCE.md.
- La siguiente ejecución integral llegó a la prueba Rust y falló con código 101: el cálculo manual esperado de Finding era 1284 bytes, pero InitSpace devolvió 1184. Se corrigieron la expectativa y la documentación; el esquema serializado no cambió. Se repite la verificación completa tras esta corrección.
- Resultado final de `npm run verify`: **código 0**, arquitectura correcta, 3 pruebas Node y 1 prueba Rust aprobadas, TypeScript estricto, bundle, rustfmt y cargo check/test host correctos. Los fallos iniciales quedaron corregidos y verificados.
- `npm run check:toolchain`: código 1; faltan anchor, solana, cargo-build-sbf y solana-test-validator. No instaladas en 0.2.
- `npm audit --json` y `npm run check:dependencies`: código 1; 7 paquetes afectados (5 moderados, 2 altos), con causas en toml, stream-json y uuid y propagación a SDK. No se ejecutó audit fix --force. Ver SECURITY.md.
- No ejecutados: build SBF, generación de IDL, Localnet, pruebas de negocio, pruebas de wallet/navegador, transacciones o despliegue. No hay código de negocio que permita ejecutarlos todavía.

### Archivos creados o modificados

Modificado: `docs/PROGRESS.md`. `AGENTS.md` se conserva sin cambios. Creados:

```text
.gitignore
.nvmrc
README.md
package.json
package-lock.json
Cargo.toml
Cargo.lock
Anchor.toml
config/toolchain.json
docs/PROJECT_CONTEXT.md
docs/ARCHITECTURE.md
docs/SECURITY.md
docs/ROADMAP.md
docs/TEST_EVIDENCE.md
frontend/package.json
frontend/tsconfig.json
frontend/vite.config.ts
frontend/index.html
frontend/src/main.tsx
frontend/src/domain/entities.ts
frontend/src/domain/ports.ts
frontend/src/application/contracts.ts
frontend/src/infrastructure/anchor/contracts.ts
frontend/src/composition/contracts.ts
frontend/src/presentation/App.tsx
programs/khiputrace/Cargo.toml
programs/khiputrace/src/lib.rs
programs/khiputrace/src/domain/mod.rs
programs/khiputrace/src/domain/limits.rs
programs/khiputrace/src/state/mod.rs
programs/khiputrace/src/state/audit.rs
programs/khiputrace/src/state/finding.rs
programs/khiputrace/src/state/seeds.rs
programs/khiputrace/src/errors.rs
programs/khiputrace/src/instructions/mod.rs
programs/khiputrace/src/instructions/create_audit.rs
programs/khiputrace/src/instructions/create_finding.rs
programs/khiputrace/src/instructions/update_finding.rs
programs/khiputrace/src/instructions/resolve_finding.rs
programs/khiputrace/src/instructions/close_finding.rs
programs/khiputrace/tests/layout.rs
scripts/check-architecture.mjs
scripts/check-rust.mjs
scripts/check-toolchain.mjs
tests/scaffold/architecture.test.mjs
```

Artefactos locales excluidos por .gitignore: node_modules, target y frontend/dist. No se inicializó Git, no se hicieron commits/push, no se desplegó ni se cambió configuración global. Las descargas usan dependencias locales y la caché estándar de Cargo/npm.

### Pendientes y continuidad

El scaffold no habilita seguridad on-chain ni operaciones reales. Deben resolverse los avisos de dependencias antes de integrar el SDK operativo, preparar las CLI y validar SBF/IDL y Localnet. No se ocultaron los checks fallidos ni se sustituyeron por pruebas de UI.

Estado de 0.2: **completado en su alcance de diseño y scaffold, con verificación host aprobada**. Permanecen abiertos los checks de CLI y dependencias. Espacio observado al cierre: aproximadamente 23 GiB libres; node_modules 107 MiB, target 607 MiB y dist 228 KiB, excluidos de Git.

Siguiente submódulo propuesto: **0.3 — revisión de dependencias y preparación del toolchain local**. Explicar antes los cambios de instalación y configuración que sean necesarios. Detenerse al cerrar 0.2 y esperar instrucciones.

## Submódulo 1.1 — Modelos on-chain y base de creación/lectura

Fecha de cierre: 22 de noviembre de 2026 (America/La_Paz). Alcance definido por el usuario: modelos Audit y Finding y exclusivamente la base necesaria para crear y leer ambas cuentas. Esta instrucción sustituye la división previa del roadmap entre creación de Audit en 1.1 y Finding en 1.2.

### Implementación y decisiones

- Se inspeccionaron AGENTS.md, arquitectura, seguridad, roadmap, progreso, esquemas, módulos de instrucciones, manifests, pruebas y herramientas disponibles antes de modificar código.
- Audit y Finding ahora usan `#[account]`, discriminator Anchor, `InitSpace` y constante `SPACE`: **174 y 1184 bytes**, respectivamente. Se adoptaron audit_id/finding_id, active_findings/open_findings y remediation_note. Se conservaron version y description del diseño anterior; no hay cuentas desplegadas que requieran migración.
- IDs y contadores son u64; direcciones son Pubkey; bump y versión son u8. Los IDs de seeds tienen exactamente 8 bytes little-endian. Estados Open/Resolved y severidades Low/Medium/High/Critical tienen variantes serializadas explícitamente comprobadas.
- Implementadas únicamente create_audit y create_finding, con entry points pequeños y handlers separados. La creación de Finding fuerza Open y nota vacía; incrementa next ID y ambos contadores con aritmética comprobada. El dominio valida trim y máximos UTF-8 sin depender de Anchor.
- Los contextos exigen Signer, init, pagador responsable, System Program tipado, autoridad de Audit, PDAs/bump canónicos, versión compatible e ID esperado. La creación de un hallazgo no permite seleccionar un ID antiguo o arbitrario.
- Implementadas utilidades Rust de lectura sin transacciones: validan owner/discriminator/versión, PDA y bump, contadores de Audit y relación/ID emitido de Finding. No se implementaron listados RPC ni adaptadores frontend.
- Anchor necesita una identidad de programa para las cuentas y el dispatch. Se declaró una identidad pública provisional de desarrollo reproducible desde SHA-256, compartida por Rust y Anchor.toml. No hay keypair ni despliegue asociado. Debe sustituirse antes de desplegar y derivar cuentas de una red real.
- La biblioteca ahora produce lib y cdylib. Se agregaron las features estándar de Anchor y se declaró el cfg de plataforma Solana para comprobar correctamente las macros. No se relajaron tipos ni validaciones.
- Los módulos update_finding, resolve_finding y close_finding permanecen sin implementación. No se cambió el frontend ni se añadieron dependencias directas.

### Comprobaciones ejecutadas

| Comando | Resultado |
| --- | --- |
| `cargo fmt --all` y `cargo fmt --all -- --check` | Código 0. |
| `cargo check --workspace --all-targets --locked -j 2` | Código 0; compilación host de cuentas, contextos y entry points. |
| `cargo build --workspace --locked -j 2` | Código 0; libkhiputrace.so nativa x86-64, no SBF. |
| `cargo test --workspace --locked -j 2` | Código 0 en la ejecución final: 13 tests de modelos + 1 de layout + 1 test_id generado por Anchor; 15 aprobados, 0 fallidos. |
| `ANCHOR_IDL_BUILD_PROGRAM_PATH="$PWD/programs/khiputrace" cargo check --workspace --features idl-build --locked -j 2` | Código 0; compatibilidad de compilación con la feature IDL. No genera/verifica el IDL final. |
| `anchor build -- --tools-version v1.52 --arch v0` | Código 127: anchor no está instalado. Build SBF no ejecutado. |

Las pruebas cubren inicialización y texto, espacio y serialización, enums, seeds little-endian, namespace de PDAs, secuencia y overflow, contadores inválidos, lectura de datos truncados, owner/tipo/PDA/bump/versión incorrectos, bump alternativo no canónico, auditoría ajena, ID no emitido y firma ausente en ambos contextos generados. Todos los fixtures son datos sintéticos en memoria; no se presentan como evidencia de transacciones de un cluster.

La comprobación IDL descargó dependencias ya resueltas en Cargo.lock; no modificó los lockfiles ni la configuración global. Las ejecuciones Cargo compartieron temporalmente un lock de compilación/caché y continuaron correctamente, sin errores ocultados.

### Archivos modificados

```text
Anchor.toml
README.md
programs/khiputrace/Cargo.toml
programs/khiputrace/src/lib.rs
programs/khiputrace/src/domain/mod.rs
programs/khiputrace/src/domain/rules.rs (nuevo)
programs/khiputrace/src/errors.rs
programs/khiputrace/src/state/mod.rs
programs/khiputrace/src/state/audit.rs
programs/khiputrace/src/state/finding.rs
programs/khiputrace/src/state/seeds.rs
programs/khiputrace/src/state/read.rs (nuevo)
programs/khiputrace/src/instructions/mod.rs
programs/khiputrace/src/instructions/create_audit.rs
programs/khiputrace/src/instructions/create_finding.rs
programs/khiputrace/tests/layout.rs
programs/khiputrace/tests/models.rs (nuevo)
docs/PROJECT_CONTEXT.md
docs/ARCHITECTURE.md
docs/SECURITY.md
docs/ROADMAP.md
docs/TEST_EVIDENCE.md
docs/PROGRESS.md
```

AGENTS.md, frontend, scripts y lockfiles permanecen sin cambios. No se inicializó Git, no se instalaron CLI, no se generaron claves ni se enviaron transacciones, push o despliegues. target quedó en aproximadamente 860 MiB y /home con 23 GiB libres.

### Estado, límites y siguiente paso

Implementación base y compilación host de 1.1 completadas. **La compilación SBF sigue bloqueada por herramientas ausentes**. No se acreditan creación mediante CPI, renta, rollback, reinicialización ni concurrencia en un validador. Tampoco se acredita todavía el rechazo transaccional de una wallet ajena que sí firma; el control has_one está en el código y necesita esa prueba de integración.

Los avisos npm de 0.2 continúan pendientes de tratamiento; no se repitió npm audit ni pruebas frontend en este submódulo porque no se modificaron esas capas. No se ejecutó cargo-audit.

Siguiente propuesto: preparar el toolchain pendiente de **0.3** (explicando antes los cambios) y realizar **1.2 — pruebas de creación/lectura en Localnet**, sin avanzar a modificar, resolver ni cerrar. Detenerse y esperar instrucciones.

## Submódulo 1.2 — Instrucciones seguras del programa

Fecha: 22 de noviembre de 2026 (America/La_Paz). Alcance explícito del usuario: las cinco instrucciones Anchor, sin comenzar frontend. Prevalece sobre la propuesta anterior de dedicar 1.2 solo a pruebas Localnet.

### Cambios y decisiones

- Revisadas create_audit y create_finding existentes: firma, autoridad, init, PDAs canónicas, identidad monotónica y contadores. CreateFinding comprueba también la consistencia de los contadores en su contexto y utiliza la instantánea Audit::counters para las reglas puras.
- Implementada update_finding: exige autoridad y relación correctas, estado Open, texto normalizado y límites de título/descripción. Conserva identidad, nota y contadores. Audit y authority son de solo lectura; Finding es mutable.
- Implementada resolve_finding: exige Open y acción correctiva válida. Persiste la nota y Resolved y reduce solamente open_findings, con checked_sub.
- Por instrucción del usuario, el mínimo de la nota cambia de los 12 bytes del diseño a **10 caracteres Unicode tras trim**, contados como valores escalares mediante chars().count(). Se mantiene el máximo de 512 bytes UTF-8 y el espacio de almacenamiento existente. Se probaron acentos y emojis para distinguir caracteres de bytes.
- Implementada close_finding: exige Resolved, nota válida y contadores consistentes; prepara únicamente el decremento de active_findings. Anchor ejecuta close=authority al salir sin error. Authority es firmante, autoridad de Audit y única receptora mutable de lamports. next_finding_id y open_findings permanecen intactos.
- Revisado el código local de cierre de anchor-lang 0.32.2: su suma de lamports termina en unwrap. Se añadió comprobación previa de checked_add antes de cambiar contadores; no hay CPI ni cambios de saldo entre el precheck y la salida del handler.
- Los contextos nuevos validan owner/discriminator mediante Account tipada, has_one, seeds, bumps canónicos y almacenados, versión, ID emitido y estado. Audit y Finding permanecen separados de los handlers y las reglas reutilizables no dependen de Anchor.
- Todas las comprobaciones de contenido y aritmética se completan antes de asignar el estado. No se añadieron operaciones, redes, dependencias ni servicios externos. El frontend permanece sin cambios.

### Comprobaciones ejecutadas

| Comando | Resultado |
| --- | --- |
| `cargo check --workspace --all-targets --locked -j 2` | Código 0 tras implementar las cinco instrucciones. |
| `cargo fmt --all -- --check` | Código 0 en la revisión final. |
| `cargo build --workspace --locked -j 2` | Código 0; artefacto nativo x86-64, no SBF. |
| `cargo test --workspace --locked -j 2` | Código 0 en la ejecución final; 24 aprobadas, 0 fallidas/ignoradas: 9 nuevas de instrucciones + 13 de modelos + 1 de layout + test_id generado por Anchor. |
| `ANCHOR_IDL_BUILD_PROGRAM_PATH="$PWD/programs/khiputrace" cargo check --workspace --features idl-build --locked -j 2` | Código 0; soporte de compilación IDL de las cinco instrucciones. No genera el IDL final. |
| `anchor build -- --tools-version v1.52 --arch v0` | Código 127: anchor no está instalado. Build SBF no ejecutado. |

Pruebas nuevas: contextos reales generados de update/resolve/close con autoridad ajena marcada como firmante y firma ausente; owner, discriminator, PDA, bump, relación, versión, estado, ID y mutabilidad incorrectos; contadores corruptos; despacho nativo completo de update/resolve con serialización; rechazo conservando bytes y saldos en los casos probados; notas de 9/10 caracteres y 512/513 bytes ASCII/acentos/emojis; underflow y overflow; preparación de cierre sin retroceso de IDs ni cambios en abiertos. El detalle está en TEST_EVIDENCE.md.

### Archivos modificados

```text
README.md
programs/khiputrace/src/lib.rs
programs/khiputrace/src/domain/limits.rs
programs/khiputrace/src/domain/rules.rs
programs/khiputrace/src/errors.rs
programs/khiputrace/src/state/audit.rs
programs/khiputrace/src/state/finding.rs
programs/khiputrace/src/instructions/mod.rs
programs/khiputrace/src/instructions/create_finding.rs
programs/khiputrace/src/instructions/update_finding.rs
programs/khiputrace/src/instructions/resolve_finding.rs
programs/khiputrace/src/instructions/close_finding.rs
programs/khiputrace/tests/instructions.rs (nuevo)
docs/PROJECT_CONTEXT.md
docs/ARCHITECTURE.md
docs/SECURITY.md
docs/ROADMAP.md
docs/TEST_EVIDENCE.md
docs/PROGRESS.md
```

### Resultado y pendientes

Las cinco instrucciones están implementadas y comprobadas en host; no se acredita todavía su ejecución SBF ni en un cluster. Las pruebas de cierre cubren contexto y preparación de contadores/saldo, **no transferencia ni destrucción física**: AccountInfo::resize/assign necesitan el layout del runtime y no se emulan sobre fixtures host. También siguen pendientes CPI de creación, renta real, rollback transaccional, concurrencia y reinicialización tras cierre en Localnet.

No se modificaron AGENTS.md, frontend, Anchor.toml, manifests ni lockfiles. No se instalaron CLI, no se cambiaron configuraciones globales, no se generaron claves, no hubo push ni despliegue. La identidad pública provisional y los avisos de dependencias npm de 0.2 continúan pendientes de tratamiento antes de integración real; no se repitió esa auditoría ni pruebas frontend.

Siguiente propuesto: preparar las herramientas pendientes de **0.3** y ejecutar **1.3 — integración Localnet del ciclo completo**, sin comenzar frontend. Detenerse y esperar instrucciones.


## Submódulo 1.3 — Pruebas del programa Anchor

Fecha: 22 de noviembre de 2026. **Completado: 17 pruebas SBF locales y 24 pruebas Rust host aprobadas, sin fallos.** Alcance solicitado: pruebas positivas y negativas, sin frontend. No se alteraron reglas ni instrucciones del programa.

### Decisiones y trabajo realizado

- Inspeccionados AGENTS.md, documentación, scripts y programa existente antes de preparar pruebas.
- Elegido LiteSVM mediante solders 0.26.0 y unittest para ejecutar el ELF SBF localmente sin compilar un runtime Rust adicional ni mantener un validador/RPC en este equipo. Las pruebas están separadas del frontend.
- Explicadas las descargas locales de herramientas fijadas antes de realizarlas. Descargados y verificados Agave 2.3.0 y platform-tools 1.52; extraídas solo las herramientas necesarias a caché ignorada. Wheels Python con versión y SHA-256 exactos. Sin cambios globales de Rust, Python, PATH o Solana.
- Preparados scripts setup/test: compilación SBF v0 con Rust 1.89.0-dev, dos jobs y lockfile; SDK local mínimo para evitar instaladores globales. Un archivo vacío temporal impide la generación automática de keypair por build-sbf. Solo se conserva el ELF; las wallets de prueba existen en memoria.
- Añadidas pruebas de ciclo completo, lectura de cuentas, contenidos, relación, estados, bumps, contadores e IDs. Verificados cierre físico, reembolso íntegro a autoridad y creación posterior con otro ID/PDA.
- Ejecutadas 95 transacciones: 50 aceptadas y 45 rechazadas. Cada rechazo exige el código y nombre exactos de Anchor, logs del programa e igualdad de cuentas/saldos antes/después; pagador separado para las comisiones.
- Cubiertos autoridad ajena, firma ausente, auditoría ajena, seeds erróneos, owner incorrecto, tipo enum inválido, campos/nota inválidos y límites UTF-8, estados ilegales, IDs antiguos, overflow/underflow, contadores inconsistentes y bump/versión inválidos.
- Probado rollback de una resolución y del cierre/reembolso cuando falla una instrucción posterior de la misma transacción. Los estados numéricos imposibles en una práctica normal se preparan explícitamente con el harness privilegiado de la VM.
- Guardados logs de build, pruebas SBF y regresión host y un informe JSON con hashes, transacciones, logs y estados inicial/final. No se inventan firmas de cluster ni enlaces Explorer.

### Comandos ejecutados y resultados

| Comando | Resultado |
| --- | --- |
| python3 scripts/setup-sbf-tests.py y repetición npm run setup:program-tests | Código 0; herramientas locales verificadas. |
| python3 scripts/test-sbf.py y repetición final npm run test:program | Código 0; build SBF y 17 pruebas aprobadas en ambas ejecuciones. Final: 3.200 s para la suite. |
| cargo fmt --all -- --check | Código 0. |
| cargo check --workspace --all-targets --locked -j 2 | Código 0. |
| cargo test --workspace --locked -j 2 | Código 0; 24 aprobadas, 0 fallidas/ignoradas. |
| python3 -m py_compile scripts/setup-sbf-tests.py scripts/test-sbf.py tests/sbf/test_program.py | Código 0. |
| sha256sum de lockfiles y ELF | Lockfiles conservados; ELF 6dee51ea9164dbd31aae844cd696e8475f41a6eda21d1d589b4f75dee5142e6f. |
| rustup show active-toolchain | stable-x86_64-unknown-linux-gnu (default), sin cambios. |
| Revisión final Python de sintaxis, documentos/enlaces y coherencia de evidencia | Código 0; hashes de fuentes/test/ELF y snapshots coincidentes, 17 casos aprobados y 45 rechazos intactos. |

La evidencia detallada, tabla de errores exactos y reproducción están en [TEST_EVIDENCE.md](TEST_EVIDENCE.md). `target/sbf/khiputrace.so` es el binario probado; target y caché no se incorporan al proyecto versionado. La caché ocupa unos 2.4 GiB; /home conserva aproximadamente 20 GiB libres en esta sesión.

### Incidencias, avisos y límites

- Corregida la ruta del SDK en el script: el archivo Agave usa platform-tools-sdk/sbf. Corregidas advertencias de reinstalación pip usando --upgrade únicamente en el target local.
- El build mantiene el aviso lib+cdylib sin LTO y el de syscalls desconocidas, debido a syscalls.txt vacío en el SDK oficial descargado. Logs conservados. LiteSVM cargó/ejecutó el ELF sin errores en las operaciones probadas; no se ocultó el aviso.
- No se encontraron fallos del programa en esta suite; no fue necesario modificar Rust ni los lockfiles. No se presenta esto como auditoría independiente o cobertura exhaustiva.
- Se ejecutó LiteSVM en memoria, no solana-test-validator ni servidor RPC Localnet. No se probaron concurrencia del validador, confirmaciones RPC, IDL generado, wallet/frontend ni Devnet. Estas evidencias locales no sustituyen la entrega WayLearn en Devnet.
- Continúan pendientes CLI/validador/IDL para integración RPC, identidad definitiva antes de despliegue, revisión de avisos npm y Git. No se ejecutó cargo-audit, npm audit ni pruebas frontend en este submódulo.

### Archivos modificados

```text
.gitignore
package.json
scripts/setup-sbf-tests.py (nuevo)
scripts/test-sbf.py (nuevo)
tests/sbf/requirements.txt (nuevo)
tests/sbf/test_program.py (nuevo)
docs/evidence/1.3-build.log (nuevo)
docs/evidence/1.3-tests.log (nuevo)
docs/evidence/1.3-host.log (nuevo)
docs/evidence/1.3-sbf-transactions.json (nuevo)
README.md
docs/PROJECT_CONTEXT.md
docs/ARCHITECTURE.md
docs/SECURITY.md
docs/ROADMAP.md
docs/TEST_EVIDENCE.md
docs/PROGRESS.md
```

AGENTS.md, programa Rust, frontend, Anchor.toml y lockfiles permanecen sin cambios. No hubo push ni despliegues ni claves privadas en disco.

Siguiente propuesto: **2.1 — adaptadores Anchor**, comenzando por revisar los avisos del SDK y generar/verificar IDL, y completando la preparación pendiente de 0.3 cuando corresponda. No iniciado. Detenerse y esperar instrucciones.


## Submódulo 2.1 — Infraestructura TypeScript

Fecha: 22 de noviembre de 2026. **Implementado y verificado localmente: 15 pruebas de infraestructura + 3 de arquitectura + 24 Rust aprobadas, sin fallos en la ejecución final.** La integración con un despliegue real queda explícitamente pendiente de identidad definitiva y despliegue autorizado.

### Trabajo y decisiones

- Inspeccionados AGENTS.md, contratos internos, programa, scripts y pendientes de arquitectura/seguridad antes de implementar.
- Generado el IDL real mediante IdlBuilder oficial de anchor-lang-idl 0.1.4. Una utilidad host reutiliza el grafo Rust existente; no se instala Anchor CLI. El JSON original y los tipos/valor camelCase se guardan en infraestructura. generate:idl actualiza y check:idl regenera/compara sin sobrescribir artefactos versionados.
- Cliente Program<Khiputrace> tipado y construcción de las cinco instrucciones mediante accountsStrict. Domain permanece independiente de Anchor/RPC; conserva sus contratos y agrega únicamente RepositoryError.
- Implementadas PDAs con IDs u64 little-endian de 8 bytes, sin conversiones bigint/BN a number.
- Implementados mappers y lectura individual/listados de Audit/Finding. Validaciones explícitas de owner, discriminator, tamaño, esquema, PDA/bump, pertenencia, IDs emitidos, texto, enums y contadores. Lecturas inexistentes se distinguen de errores RPC.
- La wallet externa aporta solo publicKey y signTransaction. Se verifican mensaje, firmas y continuidad de wallet/red. El envío conserva firma y usa preflight y confirmación con blockhash/lastValidBlockHeight; solo retorna MutationReceipt tras confirmación sin err. Resultados inciertos conservan referencia y no repiten la operación automáticamente con nuevo blockhash.
- Centralizada la red: Devnet oficial y Localnet loopback; comprobación de genesis y cuenta ejecutable. No se inventó una identidad de despliegue ni se configuró un ID por defecto. El IDL refleja el declare_id provisional existente, únicamente válido como identidad de compilación hasta sincronizar y desplegar con autorización.
- Corregidos avisos npm con overrides limitados de toml 5.0.1 y jayson 5.0.0, después de revisar sus manifests/cambios. Conservadas las versiones directas Anchor/web3.js. Buffer ya transitivo se declara directo para evitar un global Node implícito en navegador. Instalación limpia y audit final aprobados.
- Añadidas pruebas node:test con TypeScript estricto, sin framework adicional. Cubren mapeos, cuentas SBF previas, instrucciones, configuración/red, wallet, confirmación y errores; las respuestas del gateway son explícitamente sintéticas. Se compila además el entry point de infraestructura para navegador y se incorpora el check al verify habitual.

### Verificación ejecutada

| Comando o comprobación | Resultado |
| --- | --- |
| cargo check -p khiputrace-idl --offline -j 2 | Código 0. |
| npm run generate:idl | Código 0; IDL construido por Anchor desde Rust. |
| npm ci --ignore-scripts | Código 0, instalación limpia con overrides aplicados. |
| npm run check:idl | Código 0; JSON y tipos coinciden exactamente con la regeneración. |
| npm run verify, ejecución final tras revisión de errores de firma | Código 0; límites de capas, 3 tests del verificador, 15 tests de infraestructura, tipos estrictos, builds UI/infraestructura y fmt/check/test Rust. |
| npm audit --json | Código 0; total 0 vulnerabilidades conocidas. |
| npm ls toml jayson | Código 0; versiones corregidas, sin dependencias invalid. |
| Hash de fuentes del programa contra evidencia SBF 1.3 | Coincidencia exacta; programa intacto. |
| Revisión final de documentos/enlaces, JSON/TOML y hashes de evidencia | Código 0; manifiesto, copia del IDL y resultados coherentes con los archivos actuales. |

La suite Rust conserva sus 24 pruebas. La utilidad IDL no agrega casos funcionales ficticios por tener 0 tests propios. No se repitió la suite SBF porque no se cambió el programa. El resultado no se presenta como ejecución RPC/Devnet o prueba manual de wallet.

Logs y manifiesto de versiones/hashes en [TEST_EVIDENCE.md](TEST_EVIDENCE.md). El bundle UI no cambió; el bundle de infraestructura se genera únicamente para verificar su compilación y todavía no se carga desde la pantalla informativa.

### Incidencias corregidas y pendientes

- npm install no actualizó inicialmente los transitorios anteriores del lockfile con los nuevos overrides. npm ls detectó versiones invalid; npm update toml jayson y npm ci final resolvieron y verificaron el grafo.
- Tipos detectaron InstructionError desconocido, interop de declaraciones CommonJS y decode ausente del contrato general del coder. Se añadieron guards estructurales, interop solo para tests y BorshInstructionCoder concreto, sin desactivar strict/skipLibCheck.
- Se fijó la clave pública de la wallet capturada y se clasifican correctamente los fallos de signTransaction incluso sin código 4001, con prueba de rechazo sin envío.
- No quedan errores de compilación/tests en la verificación final. Los avisos npm iniciales se resolvieron; cero avisos conocidos no certifica seguridad exhaustiva.
- Pendientes: identidad definitiva/despliegue autorizado para integración real, CLI/validador si se requiere RPC local, wallet/UI, concurrencia y recorrido Devnet. No se ejecutaron transacciones externas ni cargo-audit.

### Archivos modificados

```text
Cargo.toml
Cargo.lock
package.json
package-lock.json
frontend/package.json
frontend/src/domain/errors.ts (nuevo)
frontend/src/infrastructure/anchor/contracts.ts
frontend/src/infrastructure/anchor/client.ts (nuevo)
frontend/src/infrastructure/anchor/accounts.ts (nuevo)
frontend/src/infrastructure/anchor/mappers.ts (nuevo)
frontend/src/infrastructure/anchor/errors.ts (nuevo)
frontend/src/infrastructure/anchor/repositories.ts (nuevo)
frontend/src/infrastructure/anchor/generated/khiputrace.json (nuevo, generado)
frontend/src/infrastructure/anchor/generated/khiputrace.ts (nuevo, generado)
frontend/src/infrastructure/solana/config.ts (nuevo)
frontend/src/infrastructure/solana/gateway.ts (nuevo)
frontend/src/infrastructure/solana/pdas.ts (nuevo)
frontend/src/infrastructure/solana/session.ts (nuevo)
frontend/src/infrastructure/solana/transactions.ts (nuevo)
tools/idl-generator/Cargo.toml (nuevo)
tools/idl-generator/src/main.rs (nuevo)
scripts/generate-idl.mjs (nuevo)
scripts/test-infrastructure.mjs (nuevo)
tests/infrastructure/tsconfig.json (nuevo)
tests/infrastructure/adapters.test.ts (nuevo)
docs/evidence/2.1-install.log (nuevo)
docs/evidence/2.1-idl.log (nuevo)
docs/evidence/2.1-verify.log (nuevo)
docs/evidence/2.1-audit.json (nuevo)
docs/evidence/2.1-manifest.json (nuevo)
README.md
docs/PROJECT_CONTEXT.md
docs/ARCHITECTURE.md
docs/SECURITY.md
docs/ROADMAP.md
docs/TEST_EVIDENCE.md
docs/PROGRESS.md
```

AGENTS.md, Anchor.toml, programa on-chain, entidades/puertos internos existentes, casos de uso y presentación permanecen sin cambios. No se implementaron módulos futuros, no hubo push/despliegues ni configuración global modificada. No se almacenaron claves privadas.

Siguiente propuesto: **2.2 — casos de uso y consultas con errores y confirmación**. No iniciado; detenerse y esperar instrucciones.


## Submódulo 2.2 — Capa Application

Fecha: 22 de noviembre de 2026. **Completado: 74 pruebas Application, 15 de infraestructura, 3 de arquitectura y 24 Rust aprobadas, sin fallos en la ejecución final.** No se desarrollaron pantallas.

### Trabajo y decisiones

- Revisados AGENTS.md, contratos de Domain/Application/composición, adaptadores, límites Rust, scripts y documentación de continuidad antes de modificar código.
- Implementadas las clases CreateAudit, GetAudits, CreateFinding, GetFindings, UpdateFinding, ResolveFinding y CloseFinding, una operación y archivo por caso. Dependencias inyectadas mediante interfaces/Pick, sin imports de SDK, React, RPC o adaptadores concretos en Application.
- Añadidos DTO de consulta y contratos list para GetAudits/GetFindings. Se mantienen entidades y puertos de repositorio de Domain.
- Añadidas validaciones UX de IDs bigint/u64, sintaxis de direcciones, título/descripción, gravedad y acción correctiva. Se normaliza con trim equivalente a Rust, se cuentan bytes UTF-8 y valores escalares Unicode y se rechazan surrogates aislados antes de codificar.
- Centralizados límites y trim puros en domain/constraints. Los helpers de mappers/PDAs consumen esas definiciones y mantienen sus exports anteriores; no hay cambios de seeds ni reglas de cuenta. Este ajuste limitado evita duplicar las reglas compartidas con Application.
- InputValidationError expone campo/código/mensaje. ApplicationError/isApplicationError distinguen errores esperables; RepositoryError conserva instancia, causa, código y referencia. Errores inesperados se propagan sin ocultarlos.
- Las cinco escrituras esperan y devuelven el recibo del repositorio; no fabrican confirmaciones, no refrescan automáticamente después de escribir ni reintentan resultados inciertos. Las consultas son explícitas.
- Los casos no hacen lecturas previas para autorizar ni cambian contadores/IDs localmente. Rust conserva la validación definitiva de firma, pertenencia, autoridad, estado, secuencia y aritmética.
- Implementada composición createAppServices a partir de puertos. El contrato AppServices, antes sin consumidor operativo, expone únicamente casos de uso y reemplaza lectores directos por las dos consultas Application. No se conecta la pantalla.
- Añadidas pruebas unitarias con repositorios simulados que registran llamadas y retornan promesas/errores controlados. test:application se incluye en verify; no se agregan dependencias ni frameworks.

### Verificaciones ejecutadas

| Comando o comprobación | Resultado |
| --- | --- |
| npm run test:application, primera ejecución | Código 2 por guard de tipos faltante en una aserción de test; corregido sin relajar strict. |
| npm run test:application, ejecución intermedia | Código 0; 72 pruebas. Posteriormente añadidos dos casos de salto de línea, ejecutados en verify final. |
| npm run verify, ejecución final | Código 0; límites de capas, 3 pruebas de arquitectura, 74 de Application, 15 de infraestructura, TypeScript estricto, builds UI/infraestructura y fmt/check/test Rust. |
| Comparación de hashes con manifiesto 2.1 | Programa Rust, lockfiles, frontend/package.json e IDL sin cambios. |
| Revisión final de documentación/enlaces, JSON, hashes y evidencia 2.2 | Código 0; archivos y resultados coherentes con el manifiesto. |

Los 74 casos nuevos comprueban los siete puertos/casos, entradas normalizadas, ausencia de llamadas ante errores UX, IDs y límites Unicode/UTF-8, gravedad y direcciones inválidas, promesas pendientes en cinco escrituras, preservación de errores, consultas vacías legítimas, composición y DTO inmutable. Las 24 pruebas Rust siguen siendo las existentes; no se cuentan los 0 casos del generador IDL/doc-tests como pruebas adicionales.

Evidencia: [TEST_EVIDENCE.md](TEST_EVIDENCE.md), [log completo](evidence/2.2-verify.log) y [manifiesto de hashes](evidence/2.2-manifest.json).

### Incidencias y pendientes

- La primera compilación detectó una aserción sobre unknown que necesitaba instanceof RepositoryError. Se corrigió el test y la verificación final pasó.
- La validación sintáctica de direcciones rechaza todos los caracteres ajenos a base58, incluido salto final; el adaptador mantiene la decodificación de clave pública de 32 bytes. No se añade otro codec a Application.
- No quedan errores de compilación/pruebas en este submódulo. No se ejecutaron instalación limpia, npm audit o regeneración de IDL porque dependencias/lockfiles/IDL permanecen iguales a 2.1. Tampoco SBF, RPC/Devnet, wallet, navegador o cargo-audit; no se atribuyen resultados nuevos a esas comprobaciones.
- Pendientes generales: identidad definitiva/despliegue autorizados e integración de wallet/cluster. Los recibos de los mocks son sintéticos; no son evidencia Devnet. La seguridad definitiva sigue en Rust.

### Archivos modificados

```text
package.json
frontend/src/domain/constraints.ts (nuevo)
frontend/src/application/contracts.ts
frontend/src/application/errors.ts (nuevo)
frontend/src/application/validation.ts (nuevo)
frontend/src/application/use-cases/create-audit.ts (nuevo)
frontend/src/application/use-cases/get-audits.ts (nuevo)
frontend/src/application/use-cases/create-finding.ts (nuevo)
frontend/src/application/use-cases/get-findings.ts (nuevo)
frontend/src/application/use-cases/update-finding.ts (nuevo)
frontend/src/application/use-cases/resolve-finding.ts (nuevo)
frontend/src/application/use-cases/close-finding.ts (nuevo)
frontend/src/composition/contracts.ts
frontend/src/composition/create-services.ts (nuevo)
frontend/src/infrastructure/anchor/mappers.ts
frontend/src/infrastructure/solana/pdas.ts
scripts/test-application.mjs (nuevo)
tests/application/tsconfig.json (nuevo)
tests/application/use-cases.test.ts (nuevo)
docs/evidence/2.2-verify.log (nuevo)
docs/evidence/2.2-manifest.json (nuevo)
README.md
docs/PROJECT_CONTEXT.md
docs/ARCHITECTURE.md
docs/SECURITY.md
docs/ROADMAP.md
docs/TEST_EVIDENCE.md
docs/PROGRESS.md
```

AGENTS.md, programa, Anchor.toml, entidades/puertos existentes, IDL, dependencias y lockfiles permanecen sin cambios. Presentation conserva su pantalla informativa. No hubo instalaciones globales, generación de claves, push ni despliegue.

Siguiente propuesto: **2.3 — UI en español para el flujo mínimo, refresco y estados de transacción**. No iniciado; detenerse y esperar instrucciones.

## 3.1 — Base visual React (completado)

El usuario redefinió 3.1 como base visual; la integración completa propuesta antes con esa numeración continúa pendiente. Se inspeccionaron AGENTS.md, documentación y capas existentes antes de modificar código.

### Resultado y decisiones

- Identidad propia inspirada en khipus, SVG nativo, paleta azul oscuro/menta y layout responsive con navegación Resumen/Auditorías/Hallazgos/Guía. Sin fuentes externas ni UI kit.
- Dashboard con métricas derivadas de lecturas reales, listado de auditorías y estados desconectado, configuración pendiente, carga, error/reintento y vacío confirmado. No hay datos de demostración en runtime ni ceros antes de leer.
- Conexión/desconexión Wallet Standard, dirección pública/copia y registro dinámico de proveedores compatibles. Sin persistencia, autoconexión, secretos o firmas. Se distinguen sesión local y permisos de la extensión.
- Puerto WalletConnection independiente de SDK en Application, implementación en Infrastructure y ensamblaje en composition/runtime. Páginas/componentes/hooks/config separados; componentes sin imports Anchor. La consulta utiliza GetAudits existente.
- Respuestas obsoletas, cambios de cuenta fuera de orden y aprobaciones tardías se descartan; se ocultan datos anteriores mientras se valida otra cuenta.
- Devnet como destino explícito; sin Program ID operativo predeterminado. La configuración existente verifica red/IDL/programa ejecutable. El runtime no habilita firmante. Mensaje previo explica conexión sin firma y autorización definitiva en Rust.
- Nuevas dependencias locales exactas Wallet Standard 1.1.1 y Playwright 1.65.1 para pruebas. Sin cambios globales. Carga diferida reduce el chunk principal a 251.36 kB (78.66 gzip), sin advertencia final de tamaño.

### Verificación e incidencias

- npm run verify: código 0; tipos, builds, capas y 116 pruebas existentes (3 arquitectura + 74 Application + 15 infraestructura + 24 Rust host).
- npm run test:visual: código 0 final; tipos estrictos de pruebas y 11 casos de navegador con wallets/RPC controlados. Producción en escritorio/móvil y lecturas reales de Application contra transporte interceptado.
- npm audit --json: código 0, cero vulnerabilidades conocidas.
- Capturas escritorio/móvil inspeccionadas; sin overflow horizontal a 390 px. Pruebas de teclado/modal, notificaciones y errores ejecutadas.
- Se corrigieron el aviso inicial de bundle grande y una carrera del test que emitía cambio de cuenta antes de acabar la conexión. Hubo una ejecución de 10/11 antes de corregir la espera; la final pasa 11/11 sin retries. El log conserva avisos NO_COLOR/FORCE_COLOR sin efecto funcional.
- No quedan fallos observados de tipos, build o pruebas del submódulo. Pendientes generales: identidad/despliegue autorizados, extensión real, formularios/firma/confirmación desde UI y flujo Devnet. Las pruebas interceptadas no acreditan esos pendientes.

Evidencia reproducible, comandos y límites: [TEST_EVIDENCE.md](TEST_EVIDENCE.md). Hashes y lista completa de archivos: [manifiesto](evidence/3.1-manifest.json).

### Archivos modificados

```text
package.json
package-lock.json
frontend/package.json
frontend/index.html
frontend/.env.example (nuevo)
frontend/public/favicon.svg (nuevo)
frontend/src/main.tsx
frontend/src/application/wallet.ts (nuevo)
frontend/src/composition/runtime.ts (nuevo)
frontend/src/infrastructure/wallet/standard-wallet.ts (nuevo)
frontend/src/presentation/App.tsx
frontend/src/presentation/styles.css
frontend/src/presentation/config/navigation.ts (nuevo)
frontend/src/presentation/components/Icon.tsx (nuevo)
frontend/src/presentation/components/KhipuArt.tsx (nuevo)
frontend/src/presentation/components/AuditList.tsx (nuevo)
frontend/src/presentation/components/WalletDialog.tsx (nuevo)
frontend/src/presentation/hooks/usePage.ts (nuevo)
frontend/src/presentation/hooks/useAudits.ts (nuevo)
frontend/src/presentation/hooks/useWallet.ts (nuevo)
frontend/src/presentation/hooks/useNotifications.tsx (nuevo)
frontend/src/presentation/pages/DashboardPage.tsx (nuevo)
frontend/src/presentation/pages/AuditsPage.tsx (nuevo)
frontend/src/presentation/pages/GuidePage.tsx (nuevo)
playwright.config.ts (nuevo)
tests/browser/tsconfig.json (nuevo)
tests/browser/base.spec.ts (nuevo)
docs/evidence/3.1-verify.log (nuevo)
docs/evidence/3.1-visual.log (nuevo)
docs/evidence/3.1-browser.json (nuevo)
docs/evidence/3.1-audit.json (nuevo)
docs/evidence/3.1-desktop.png (nuevo)
docs/evidence/3.1-mobile.png (nuevo)
docs/evidence/3.1-manifest.json (nuevo)
README.md
docs/PROJECT_CONTEXT.md
docs/ARCHITECTURE.md
docs/SECURITY.md
docs/ROADMAP.md
docs/TEST_EVIDENCE.md
docs/PROGRESS.md
```

AGENTS.md, Rust, reglas de negocio, entidades de Domain, casos de uso, IDL y adaptadores Anchor existentes sin cambios. No hubo push, despliegue ni configuración global. Siguiente propuesto: **formularios de auditorías**, numeración y alcance pendientes de nueva instrucción. Submódulo terminado; detenerse.

## 3.2 — Gestión de auditorías (completado)

El usuario define 3.2 como UI de auditorías; sustituye la propuesta anterior de despliegue, que sigue pendiente y sin autorización. Se revisaron AGENTS.md, documentos, composición, puertos/casos de uso, wallet, transacciones y pruebas existentes. No había .env operativo ni programa Devnet configurado; sí un ELF SBF local de 1.3.

### Resultado y decisiones

- Crear auditorías con ID decimal bigint/u64 y título normalizado de hasta 96 bytes UTF-8. Validaciones reutilizadas de Application, revisión previa con red/wallet/datos y comisión/rent; firma explícita y confirmación antes de declarar éxito.
- Listado por wallet y detalle consultado mediante el nuevo GetAudit sobre AuditReader existente. Se muestran PDA, autoridad, ID, título, activos, abiertos y siguiente ID; carga, ausencia, error y reintento diferenciados.
- Recibo de transacción independiente del listado: se conserva ante fallos de refresco; incertidumbre conserva firma y bloquea reenviar desde ese formulario. Sin incrementos optimistas de contadores ni lógica de blockchain en componentes.
- Página de auditorías montada al navegar para conservar operación/recibo; se elimina al cambiar autoridad. Respuestas obsoletas ignoradas y doble clic bloqueado de forma síncrona.
- Firma legacy mediante Wallet Standard dentro de infraestructura, sin secretos. Se exige soporte de proveedor y cuenta. Runtime habilita solo creación de auditorías; hallazgos conserva sus operaciones visuales pendientes.
- Red/endpoint públicos centralizados en composición con guardas existentes: Devnet por defecto, Localnet explícito, sin Mainnet ni Program ID operativo predeterminado. Badge/mensajes/Explorer distinguen la red; firma local no se enlaza como Devnet.
- Se corrigió Buffer global ausente usando la dependencia existente, y se añadió comprobación de wallet tras la última espera RPC antes del envío.
- Pruebas locales de producción con firma Ed25519 efímera y SBF real en LiteSVM mediante RPC temporal de pruebas. No se incorpora backend al producto. Se declara ws 7.5.14 dev, versión ya presente; sin modificar node_modules ni herramientas globales.

### Verificación ejecutada

| Comando/comprobación | Resultado final |
| --- | --- |
| npm run verify | Código 0: capas, tipos, builds y 118 pruebas (3 arquitectura, 75 Application, 16 infraestructura, 24 Rust host). |
| KHIPUTRACE_EVIDENCE_PREFIX=3.2-base npm run test:visual | Código 0, 11/11, sin retries ni omisiones; 49.1 s. Evidencia 3.1 preservada. |
| npm run test:audits | Código 0, tipos de tests/config y 10/10 casos, sin retries ni omisiones; 51.0 s. |
| npm audit --json | Código 0, cero vulnerabilidades conocidas. |
| Revisión visual | Capturas finales escritorio/formulario móvil/detalle móvil inspeccionadas; sin overflow de página a 390 px. |

El flujo usa el build de producción aislado: creación con ID >2^53, firma, ejecución SBF, confirmación derivada de la VM, refresco al navegar y lectura de detalle/contadores. La creación duplicada es rechazada por SBF en preflight y conserva todas las cuentas. Otros casos cubren firma rechazada, mensaje modificado y desconexión pendiente sin envío; componentes aislados cubren límites/edición, incertidumbre, refresco fallido y detalle normal/ausente/con error. Hay una ejecución real local y una simulación negativa en el informe, no transacciones Devnet.

### Incidencias y pendientes

- Corregidos export de ws CommonJS, prop network faltante, Buffer global y localizador de prueba ambiguo por página oculta. Hubo ejecuciones fallidas/interrumpidas antes de corregirlos; se describen en TEST_EVIDENCE.md. Todas las suites finales pasan sin relajar strict ni retries.
- Persisten avisos informativos del entorno NO_COLOR/FORCE_COLOR y de Vite por outDir de pruebas fuera de frontend; se conservan/documentan. No quedan errores observados de compilación, tipos o pruebas del submódulo.
- No se ejecutaron compilación SBF nueva, suite completa 1.3, instalación limpia nueva, IDL nuevo, cargo-audit, extensión real ni validador/Devnet. El ELF reutilizado coincide con el hash de 1.3; no se alteraron Rust/IDL/reglas/PDA.
- Devnet sigue pendiente: no hay identidad/despliegue operativo configurado ni autorización para desplegar. El RPC mínimo confirma resultados de LiteSVM, no consenso de cluster. La interfaz de hallazgos queda fuera del alcance.

Evidencia y pasos exactos de reproducción: [TEST_EVIDENCE.md](TEST_EVIDENCE.md). Lista completa y hashes: [manifiesto](evidence/3.2-manifest.json).

Revisión final de enlaces, JSON/TOML/Python, hashes y cuenta SBF/PDA/bump/contadores: correcta. Resultado: [comprobaciones](evidence/3.2-checks.json).

### Archivos modificados

```text
package.json
package-lock.json
frontend/.env.example
frontend/src/main.tsx
frontend/src/application/contracts.ts
frontend/src/application/wallet.ts
frontend/src/application/use-cases/get-audit.ts (nuevo)
frontend/src/composition/create-services.ts
frontend/src/composition/runtime.ts
frontend/src/infrastructure/wallet/standard-wallet.ts
frontend/src/infrastructure/solana/browser-globals.ts (nuevo)
frontend/src/infrastructure/solana/transactions.ts
frontend/src/presentation/App.tsx
frontend/src/presentation/styles.css
frontend/src/presentation/components/AuditList.tsx
frontend/src/presentation/components/WalletDialog.tsx
frontend/src/presentation/components/CreateAuditForm.tsx (nuevo)
frontend/src/presentation/components/AuditDetail.tsx (nuevo)
frontend/src/presentation/components/TransactionNotice.tsx (nuevo)
frontend/src/presentation/hooks/useWallet.ts
frontend/src/presentation/pages/AuditsPage.tsx
frontend/src/presentation/pages/DashboardPage.tsx
frontend/src/presentation/pages/GuidePage.tsx
playwright.config.ts
playwright.audit.config.ts (nuevo)
tests/application/use-cases.test.ts
tests/infrastructure/adapters.test.ts
tests/browser/tsconfig.json
tests/browser/base.spec.ts
tests/browser/audits.spec.ts (nuevo)
tests/browser/components.tsx (nuevo)
tests/browser/local-rpc.py (nuevo)
tests/browser/local-server.mjs (nuevo)
docs/evidence/3.2-* (logs, JSON, capturas y manifiesto nuevos)
README.md
docs/PROJECT_CONTEXT.md
docs/ARCHITECTURE.md
docs/SECURITY.md
docs/ROADMAP.md
docs/TEST_EVIDENCE.md
docs/PROGRESS.md
```

AGENTS.md, Rust, Domain, IDL, adaptadores de cuentas/PDAs y casos de negocio existentes conservados. Sin push, despliegue, claves en disco o configuración global. Siguiente propuesto: **gestión visual de hallazgos**, numeración/alcance por nueva instrucción. Submódulo terminado; detenerse.

## 3.3 — Flujo de hallazgos React (completado)

El usuario redefine 3.3 como completar la UI de hallazgos y revisar el flujo; no como entrega/despliegue Devnet. Revisados AGENTS.md, documentación, casos/puertos, composición, estado/transacciones, UI de auditorías y arnés local antes de implementar.

### Resultado y decisiones

- Sección Hallazgos con selección de auditoría propia, consultas mediante Application y contadores leídos de la cuenta. Creación con título/descripción/gravedad; ID derivado de nextFindingId leído, nunca del conteo de activos.
- Modificar y resolver únicamente ofrecidos para abiertos. Resolución con acción correctiva válida, normalización compartida y contenido persistido visible en resueltos.
- Cierre de resueltos con diálogo nativo, foco en Cancelar, Escape, checkbox y confirmación/firma; efectos sobre cuenta, saldo y secuencia explicados antes de aprobar.
- Estado pendiente y guard síncrono contra doble envío; selección/acciones bloqueadas, recibos conservados al navegar y ante error de refresco. Incertidumbre conserva firma y bloquea reenvíos en el espacio de auditoría.
- Refresco tras confirmación de hallazgos, cuenta de auditoría y resumen. useAudits retiene únicamente lecturas previas de la misma wallet durante carga/error para no desmontar el espacio y perder el recibo; estados siguen visibles y otras wallets nunca ven esa caché.
- Mensajes del programa y código en notificación reutilizable; componentes sin SDK/PDAs/instrucciones. Se reutilizan los casos y validaciones existentes; Rust conserva todas las reglas definitivas.
- Composición habilita las cuatro escrituras de hallazgos con el mecanismo de firma externa existente, ahora compartido con auditorías. Sin secretos, dependencias nuevas, cambios globales o cambios on-chain.
- Formularios/tarjetas responsive con etiquetas, ayuda/error por campo, aria-invalid, estados/alertas y gravedad/estado textuales. Capturas finales revisadas y ausencia de overflow horizontal a 390 px comprobada.
- Wallet de pruebas extraída a fixture compartida; prefijos conservan evidencia previa. Estado obsoleto producido mediante transacciones reales concurrentes, no manipulando cuentas.

### Verificación final ejecutada

| Comando | Resultado |
| --- | --- |
| npm run verify | Código 0; capas, tipos, builds y 118 pruebas (3 arquitectura, 75 Application, 16 infraestructura, 24 Rust host). |
| KHIPUTRACE_EVIDENCE_PREFIX=3.3-base npm run test:visual | Código 0; 11/11, sin omisiones/flaky/retries; 47.5 s. |
| KHIPUTRACE_EVIDENCE_PREFIX=3.3-audits npm run test:audits | Código 0; 10/10, sin omisiones/flaky/retries; 54.0 s. |
| npm run test:findings | Código 0; tipos de pruebas/config y 9/9, sin omisiones/flaky/retries; 68.1 s. |
| npm audit --json | Código 0; cero vulnerabilidades conocidas. |
| Decodificación de evidencia SBF | PDAs/bumps, IDs 0→1, gravedad/acción/estado, contadores, cierre/reembolso y 3 rechazos con cuentas intactas comprobados. |

Total: 118 pruebas de regresión y 30 de navegador. Se revisó producción local con el ELF existente en LiteSVM: 13 ejecuciones aceptadas incluyendo preparación concurrente, 3 rechazos en preflight (6008/6005/6003), contadores correctos e IDs no reutilizados. Sin Devnet ni consenso de cluster.

### Incidencias y pendientes

- Primera suite 7/8 por foco del diálogo antes de showModal; corregido mediante ref/foco explícito sin relajar la prueba. La suite final incluye un caso adicional de consulta tardía y pasa 9/9.
- La revisión independiente de cuentas inicialmente esperaba null al cerrar. LiteSVM conserva una cuenta vacía con saldo 0 y owner System; se comprobaron esas condiciones, ausencia en listados y devolución neta a autoridad, sin alterar Rust.
- Sin errores observados pendientes de tipos/build/pruebas. Avisos NO_COLOR/FORCE_COLOR conservados; el outDir de pruebas se limpia explícitamente y ya no genera el aviso anterior.
- Pendientes generales: identidad/toolchain y despliegue autorizados, extensión real, validador/cluster y recorrido Devnet/entrega WayLearn. No se ejecutaron SBF nuevo, suite 1.3 completa, IDL nuevo, instalación limpia nueva o cargo-audit. El binario coincide con 1.3; evidencia y código de negocio anteriores conservados.

Comandos, resultados y reproducción en [TEST_EVIDENCE.md](TEST_EVIDENCE.md); hashes/lista completa en [manifiesto](evidence/3.3-manifest.json).

### Archivos modificados

```text
package.json
frontend/src/main.tsx
frontend/src/composition/runtime.ts
frontend/src/presentation/App.tsx
frontend/src/presentation/styles.css
frontend/src/presentation/components/TransactionNotice.tsx
frontend/src/presentation/components/FindingForm.tsx (nuevo)
frontend/src/presentation/components/FindingList.tsx (nuevo)
frontend/src/presentation/components/CloseFindingDialog.tsx (nuevo)
frontend/src/presentation/config/findings.ts (nuevo)
frontend/src/presentation/hooks/useAudits.ts
frontend/src/presentation/hooks/useFindings.ts (nuevo)
frontend/src/presentation/hooks/useFindingMutation.ts (nuevo)
frontend/src/presentation/pages/FindingsPage.tsx (nuevo)
playwright.audit.config.ts
playwright.finding.config.ts (nuevo)
tests/browser/tsconfig.json
tests/browser/audits.spec.ts
tests/browser/components.tsx
tests/browser/wallet-fixture.ts (nuevo)
tests/browser/findings.spec.ts (nuevo)
tests/browser/local-rpc.py
docs/evidence/3.3-* (logs, reportes, snapshots, capturas y manifiesto nuevos)
README.md
docs/PROJECT_CONTEXT.md
docs/ARCHITECTURE.md
docs/SECURITY.md
docs/ROADMAP.md
docs/TEST_EVIDENCE.md
docs/PROGRESS.md
```

AGENTS.md, Rust, Domain/Application, IDL, dependencias/lockfiles y adaptadores existentes de cuentas/PDAs/transacciones sin cambios. Sin push, despliegue o claves persistidas. Siguiente propuesto: **preparar identidad/toolchain e integración Devnet**, con numeración, alcance y autorización explícitos; no iniciado. Submódulo terminado; detenerse.


## 4.1 — preparación de despliegue Devnet (en curso; no desplegado)

Fecha local: 22 de noviembre de 2026; evidencias UTC del 23. Alcance: compilar/probar, preparar identidad/wallet/cliente y despliegue, solicitar autorización y verificar posteriormente programa/transacción real. No autoriza otro submódulo ni Mainnet.

### Preparación realizada

- Solana CLI/keygen 2.3.0 extraídos del archivo oficial previamente verificado; caché local, sin cambiar configuración global. Anchor CLI/validador siguen ausentes; no son necesarios para el procedimiento CLI directo e IDL oficial preparado.
- Tras consultar al usuario por la wallet ausente, autorizó crear lo necesario. Se generaron wallet Devnet, clave de programa y buffer fuera del proyecto: ~/.local/share/khiputrace/devnet, directorio 700, archivos 600. Sin semillas/claves impresas ni secretos en evidencias.
- Wallet pagadora y upgrade authority: Bd6Xa9JV3x3hZVkEnuGnH323MZxhYuCXuRe6DFSK3LKT.
- Program ID real preparado: GV8SZn6i29tL4CmJMei5P3N3BLUxVZBWrG6hFQVSVSBv. Aún sin cuenta en Devnet; no se presenta como desplegado.
- Rust, programas de Anchor.toml, IDL/tipos regenerados y configuración pública frontend sincronizados. Provider conserva Localnet, con ruta a wallet existente; comandos Devnet con URL/wallet explícitas.
- Nuevo ELF SBF: 273.368 bytes; SHA-256 c941ab95d5cbfc6ae9ec73683dec79e24b0a60f11c505e7a173555b44eb08f17.
- RPC Devnet identificado por genesis correcto; rent real consultado. Pico conservador: 2,77996904 SOL de prueba antes de reembolso del buffer, más comisiones. Se necesitan al menos 3 SOL Devnet para preparar margen, sujeto a recalcular antes del envío.
- Saldo 0 SOL; solicitudes CLI de 3 y 2 SOL rechazadas, sin firma. Se pidió al usuario financiar mediante el faucet oficial. No se compró SOL ni se usó otra red.
- Comando concreto y comprobación posterior documentados en [DEPLOYMENT.md](DEPLOYMENT.md). **No se ejecutó deploy; pendiente de autorización explícita del usuario y fondos.**

### Verificaciones ejecutadas

| Verificación con identidad final | Resultado |
| --- | --- |
| npm run verify | Código 0; tipos, builds, capas, formato y 118 pruebas: 3 + 75 + 16 + 24. |
| KHIPUTRACE_EVIDENCE_PREFIX=4.1-final npm run test:program | Código 0; compilación SBF y 17 casos / 95 transacciones, 50 aceptadas y 45 rechazos del programa. |
| npm run generate:idl y npm run check:idl | Código 0; generados y comprobados desde Rust. |
| KHIPUTRACE_EVIDENCE_PREFIX=4.1-final npm run test:findings | Código 0; 9/9, 84.0 s, con ELF de identidad nueva en LiteSVM. |
| Diagnóstico Devnet de solo lectura | Código 0; identidad frontend coherente, genesis correcto, programa ausente y saldo 0. |
| Preparador de claves repetido y comparación de reportes públicos | Código 0; mismas claves/permisos, sin sobrescritura. |
| npm audit --json | Código 0; cero vulnerabilidades conocidas. |
| check:toolchain con PATH temporal a CLI local | Código 1; faltan Anchor CLI y solana-test-validator. |
| Sintaxis de scripts JS/Python | Código 0. |

También se ejecutaron verify/SBF/IDL/UI antes del cambio de identidad, con resultados aprobados y logs separados. No confundir esas ejecuciones con las finales. Evidencias/comandos/fallos y límites en [TEST_EVIDENCE.md](TEST_EVIDENCE.md).

### Incidencias y bloqueos

1. Un verify inicial con identidad nueva falló porque la prueba de mapeos históricos filtraba por el Program ID actual. Corregida para usar la identidad original del reporte 1.3, sin modificar evidencia histórica ni controles productivos; verify final aprobado. Log de fallo conservado.
2. Las dos capturas históricas 3.3 fueron sobrescritas porque sus rutas eran fijas en la prueba, pese al prefijo de los otros reportes. No se recuperaron los originales. Imágenes actuales renombradas 4.1-final, enlaces actualizados y rutas corregidas para respetar prefijo. El manifiesto 3.3 conserva hashes originales; las dos capturas originales ya no están disponibles. Logs/transacciones/manifiestos anteriores conservados. Repetición separada 4.1-capture-check: código 0, 9/9, ambas imágenes en rutas propias; sin sobrescribir las capturas finales anteriores.
3. Avisos históricos de crate types y clasificación de syscalls (SDK con syscalls.txt vacío) conservados. SBF probado en VM; aceptación real por loader Devnet pendiente. CLI 2.3.0 y cluster 4.5.0-beta.0 no se declaran plenamente compatibles antes de la verificación de despliegue.
4. Bloqueos de ejecución: saldo 0 y autorización de despliegue pendiente. No hay ProgramData, firma de despliegue, hash remoto o transacción de negocio Devnet que registrar aún.

### Archivos modificados/preparados

```text
Anchor.toml
programs/khiputrace/src/lib.rs (solo identidad y comentario)
frontend/src/infrastructure/anchor/generated/khiputrace.json
frontend/src/infrastructure/anchor/generated/khiputrace.ts
frontend/.env.local (configuración pública local, ignorada)
scripts/test-sbf.py
tests/sbf/test_program.py (prefijos de evidencia)
tests/infrastructure/adapters.test.ts (identidad de evidencia histórica)
tests/browser/findings.spec.ts (prefijo de capturas)
scripts/setup-devnet-cli.py (nuevo)
scripts/prepare-devnet-keys.py (nuevo)
scripts/check-devnet.mjs (nuevo; solo lectura)
docs/DEPLOYMENT.md (nuevo)
README.md
docs/PROJECT_CONTEXT.md
docs/ARCHITECTURE.md
docs/SECURITY.md
docs/ROADMAP.md
docs/TEST_EVIDENCE.md
docs/PROGRESS.md
docs/evidence/4.1-* (logs, cuentas públicas, capturas, reportes y manifiesto)
docs/evidence/3.3-findings-{desktop,mobile}.png (originales perdidos; actuales movidos a 4.1-final)
target/sbf/khiputrace.so (artefacto recompilado; ignorado)
```

También se prepararon binarios en .cache y claves exclusivamente fuera del proyecto. No cambiaron reglas/instrucciones/modelos, Domain/Application, componentes productivos, dependencias/lockfiles ni AGENTS.md. Sin Git inicializado, sin push y sin despliegue. **Siguiente paso: continuar este mismo 4.1 al disponer de fondos y autorización explícita**, comprobar programa remoto y una transacción real; no iniciar un submódulo futuro. No se marca 4.1 como completado.


### 4.1 — financiación confirmada, autorización pendiente

El usuario informó haber financiado la wallet. Consulta RPC de solo lectura: genesis Devnet correcto, commitment confirmed, slot 525279011, **10.000.000.000 lamports = 10 SOL Devnet**; saldo observado mayor que los 5 SOL estimados por el usuario. Evidencia UTC 2026-11-23T02:20:27.580Z (22 de noviembre local): [saldo confirmado](evidence/4.1-funded-wallet-check.json). El bloqueo de fondos queda resuelto. No se interpreta el aviso de financiación como autorización de despliegue: permanece pendiente el punto 5 de la solicitud y la regla de AGENTS.md. No se ejecutaron transacciones, despliegue, compilación o pruebas nuevas en esta consulta; solo lectura RPC y revisión documental. Archivos actualizados: DEPLOYMENT.md, PROGRESS.md, TEST_EVIDENCE.md, ROADMAP.md, README.md y evidencias públicas de financiación. Siguiente paso: obtener autorización para el comando/artefacto preparado, con límite de 3 SOL Devnet, y continuar el mismo 4.1.


### 4.1 — autorización y ejecución controlada en curso

El usuario respondió «si autorizo» a la solicitud de despliegue con límite de 3 SOL Devnet. Preflight autorizado: genesis correcto, saldo 10 SOL, IDL/frontend/identidades coherentes, claves 600 y ELF aprobado sin cambios. Primer comando exacto preparado ejecutado: código 1, «Data writes to account failed: Custom error: Max retries exceeded». Consulta auxiliar obtuvo 429 «Connection rate limits exceeded». Comprobación posterior: programa ausente, buffer existente del Upgradeable Loader (273.405 bytes, 1.389.588.280 lamports), saldo pagador 8.610.206.720 lamports. Sin declarar éxito.

Se reanuda reutilizando el mismo buffer, programa, pagador/autoridad, ELF y límite de gasto, con transporte QUIC por TPU en lugar de --use-rpc y un único intento de firma (--max-sign-attempts 1). Adaptación operativa para evitar la saturación del RPC público; sin omitir preflight ni feature verification. Evidencias: 4.1-authorized-preflight.json, 4.1-deployment-authorization.json, 4.1-deploy.log, 4.1-after-first-attempt.json y 4.1-deploy-resume.log. Resultado final remoto aún pendiente.


### 4.1 — completado: despliegue y transacción real verificados

Resultado final, 22 de noviembre de 2026 America/La_Paz: **programa desplegado y verificado en Devnet**, después de autorización explícita del usuario y respetando el límite de 3 SOL Devnet. No se ejecutó ningún módulo posterior.

- Program ID: **GV8SZn6i29tL4CmJMei5P3N3BLUxVZBWrG6hFQVSVSBv**.
- Slot de despliegue 525280825. Owner Upgradeable Loader, executable true, ProgramData y upgrade authority comprobados. Hash de ELF aprobado, dump y código leído de ProgramData idénticos: c941ab95d5cbfc6ae9ec73683dec79e24b0a60f11c505e7a173555b44eb08f17.
- Primer deploy RPC: código 1, escritura parcial/Max retries exceeded; 429 observado en consulta auxiliar. Programa/buffer/saldo consultados antes de reanudar. Segundo intento con QUIC, mismo buffer/identidad/ELF: código 0. Avisos UDP conservados; el resultado se comprobó independientemente en Devnet.
- Buffer cerrado por el loader, fondos devueltos. Firma real de despliegue finalized sin error.
- CreateAudit/GetAudit por Application/Infrastructure existentes: una transacción real finalized, slot 525281228, PDA/autoridad/título/ID correctos y contadores cero tras relectura. Datos sintéticos, no mock. Firma: 3uoFNMRYuVwx8SGZzBGVa5nukookgXHqiY7NayWaEPzNNXYwfaZdGpc7WpwmEEnfy3FwW6chAMUgVmdnkcEC8Y3C.
- Gasto neto observado, con rent y comisiones de ambos intentos y auditoría: **1,39334556 SOL Devnet**, inferior al límite de 3. Saldo final **8,60665444 SOL Devnet**.
- Rust/Anchor/IDL/tipos/configuración y build frontend concordantes. Plantilla .env.example actualizada con el ID real verificado. Sin frontend publicado ni IDL on-chain.

Verificaciones en esta fase: preflight (0), primer deploy (1), consulta de estado intermedio (0), reanudación (0), program show/dump (0), comparación directa RPC/ELF/autoridad/tx (0), check:idl (0), build frontend (0), comprobador TypeScript estricto (0), CreateAudit y relectura (0), diagnóstico cliente/red (0), ambas firmas finalized err null. Guard contra repetir la prueba con reporte existente: rechazo esperado (1), sin nueva wallet/RPC/transacción y preservando evidencia. Las 118 pruebas unitarias/host, 17 casos SBF y suites UI de preparación ya aprobadas corresponden al mismo ELF; no se afirman repetidas en esta fase.

Archivos adicionales de esta continuación: scripts/check-devnet-smoke.mjs, scripts/devnet-smoke/run.ts y tsconfig.json; frontend/.env.example; README.md; docs/PROJECT_CONTEXT.md, ARCHITECTURE.md, SECURITY.md, ROADMAP.md, DEPLOYMENT.md, TEST_EVIDENCE.md, PROGRESS.md; nuevos logs/reportes/manifiesto docs/evidence/4.1-*. Se conservan estados y manifiestos anteriores como históricos; el manifiesto final registra el estado desplegado. Datos binarios públicos descargados/builds en target/frontend/dist ignorados. Claves siempre externas, sin cambios globales, push, Mainnet o transferencia de autoridad.

No quedan errores bloqueantes de 4.1. Se conservan el fallo RPC, avisos QUIC y aviso histórico de clasificación de syscalls; el loader y CreateAudit real ejecutaron correctamente. La pérdida de dos capturas antiguas de 3.3 sigue documentada y no se presenta como recuperada. Anchor CLI/validador/Git siguen pendientes generales, sin impedir este procedimiento.

Siguiente submódulo propuesto: **4.2, recorrido completo de auditorías/hallazgos y rechazos críticos con extensión real en Devnet, y preparación de evidencias finales**. Pendiente de instrucciones; no iniciado. Este despliegue y una transacción no equivalen a la entrega completa WayLearn. Procedimiento y enlaces verificables: [DEPLOYMENT.md](DEPLOYMENT.md); comandos/evidencias: [TEST_EVIDENCE.md](TEST_EVIDENCE.md). **Detenerse al finalizar 4.1.**


## 4.2 — verificación automatizada completa Devnet; pendientes manuales documentados

Fecha: 22 de noviembre de 2026 America/La_Paz (evidencias UTC del 23). Alcance explícito: contrastar criterios WayLearn, ejecutar flujos válidos y rechazos del programa en Devnet, verificar estados y generar TEST_EVIDENCE. No se desplegó de nuevo ni implementó negocio futuro.

### Resultado

- Fuente oficial Pruebas y evidencias consultada nuevamente; correspondencia de proyecto propio documentada en README.
- **28 casos aprobados** de Application/Infrastructure y solicitudes Anchor directas, **18 rechazos esperados del programa**, con snapshots raw/decodificados de todas las cuentas de negocio antes/después y conservación exacta.
- Permisos: create/update/resolve/close con wallet secundaria real financiada, todos 6000 Unauthorized. Asociación: dos auditorías existentes de la misma autoridad con un hallazgo ajeno, tres rechazos 2006 ConstraintSeeds sobre la PDA de Finding.
- Reglas: cierre abierto 6005; corrección vacía/corta/espacios 6004; textos largos 6002; edición/doble resolución de resuelto 6003; reutilización de ID cerrado 6008; transacción de dos instrucciones con rollback de la modificación anterior. Ningún rechazo se acredita mediante un botón o fallo RPC.
- Positivos: crear/consultar auditorías y hallazgos, editar abierto, resolver con acción válida persistida, cerrar resuelto con devolución de rent a autoridad, crear siguiente ID y consultar listado correcto. Contadores siguiente/activos/abiertos: 0/0/0 → 1/1/1 → 1/1/0 → 1/0/0 → 2/1/1.
- **UI de producción real en Devnet: 1/1 Playwright con 8 etapas aprobadas**, incluida edición obsoleta que alcanza Rust, muestra 6003 y conserva cuentas. Capturas reales de escritorio, móvil y error. Validación posterior de 8 estados mediante AccountReader/mappers/PDAs productivos; en UI se cerraron ambos hallazgos y se conservó siguiente ID=2.
- **16 transacciones válidas finalized, sin error**: 7 operaciones del cliente, 7 de UI, 1 resolución concurrente y 1 fondeo del actor. 19 rechazos en total sumando el de UI, todos preflight firmado con logs del programa; sin firmas inventadas.
- ELF/local/remoto e IDL/cliente coherentes; programa continúa siendo GV8SZn6i29tL4CmJMei5P3N3BLUxVZBWrG6hFQVSVSBv, sin cambios de bytecode.

### Verificaciones y comandos ejecutados

| Comando / comprobación | Resultado |
| --- | --- |
| npm run verify | Código 0; 118 pruebas, tipos/build/formato/capas. |
| node scripts/check-devnet-acceptance.mjs | Tipos finales código 0. Primera compilación tuvo un error de nulabilidad corregido. |
| node scripts/check-devnet-acceptance.mjs --execute | Primera ejecución código 1 por lectura RPC tras modificación ya confirmada. Firma y estado conservados. |
| node scripts/check-devnet-acceptance.mjs --execute --resume | Código 0; firma/estado reconciliados sin reenvío; casos aprobados omitidos y recorrido completado. |
| node scripts/check-devnet-ui.mjs | Tipos finales código 0. Dos imports sin uso corregidos en el primer intento. |
| node scripts/check-devnet-ui.mjs --execute | Código 0; 1/1, 8 etapas, sin retries/flaky/omisiones; producción local y Devnet real. |
| npm run check:idl | Código 0. |
| npm ci aislado desde manifiestos/lockfile | Código 0; cero vulnerabilidades conocidas reportadas. |
| Instalación limpia + npm run typecheck + npm run build en copia temporal del frontend | Todos código 0; sin copiar node_modules/dist/.env.local; temporal eliminado. |
| Decodificación de snapshots UI | Código 0; 8 estados, owner/PDA/bumps/transiciones/contadores. |
| Verificación final RPC de 16 transacciones y ProgramData | Código 0; todas finalized sin error, código remoto idéntico al ELF. |
| node --check de runners nuevos | Código 0. |

### Incidencias, recursos y pendientes

- Interrupción de lectura de evidencia tras UpdateFinding confirmado: no se repitió la escritura. Se conservan el reporte/log inicial y la reconciliación de su firma/estado. No hay fallo de negocio vigente en los casos ejecutados.
- RPC público produjo 429/reintentos registrados. El comprobador reintenta lecturas acotadas; no reenvía escrituras inciertas. La UI pasó con los adaptadores productivos existentes, sin cambios para ocultar errores.
- Wallet secundaria oficial exclusiva Devnet creada fuera del proyecto, permisos 600: H5iHtUYjBpKNQi6axDDJhC4iVFnXyu4B3ioY97da5Tqz. Conserva 0,03 SOL transferidos para demostrar firmante existente/con fondos. No son comisiones consumidas.
- Disminución de wallet principal: 0,04134744 SOL Devnet. Disminución conjunta de principal/secundaria por rent/comisiones: 0,01134744 SOL; comisiones de 16 transacciones: 80.000 lamports. Reserva operativa de 0,1 SOL no excedida.
- Proveedor Wallet Standard de pruebas con firma oficial Node externa al navegador, limitado a la auditoría/PDAs de este recorrido y número de firmas. No es una extensión real; no hay mocks de RPC ni claves privadas en el navegador.
- **Pendientes, no aprobados:** recorrido humano con extensión real y ventanas de firma/rechazo/cambio de cuenta; clon/entrega Git y preparación final de certificación. La instalación/tipos/build del frontend desde copia limpia sí se ejecutó. No se afirma nueva compilación SBF limpia en 4.2.

### Archivos modificados

```text
package.json (scripts de comprobación explícita Devnet, fuera de verify)
scripts/check-devnet-acceptance.mjs (nuevo)
scripts/devnet-acceptance/run.ts (nuevo)
scripts/devnet-acceptance/tsconfig.json (nuevo)
scripts/check-devnet-ui.mjs (nuevo)
playwright.devnet.config.ts (nuevo)
tests/browser/devnet.spec.ts (nuevo)
tests/browser/tsconfig.json (incluye config nueva)
README.md (estado, equivalencia WayLearn, reproducción)
docs/TEST_EVIDENCE.md (28 fichas cliente/programa, 8 UI, firmas y estados de aceptación)
docs/PROGRESS.md
docs/ROADMAP.md
docs/PROJECT_CONTEXT.md
docs/ARCHITECTURE.md
docs/SECURITY.md
docs/evidence/4.2-* (reportes, logs, capturas, verificación final y manifiesto)
```

Sin cambios de Rust, Domain/Application, adaptadores/Presentation productivos, IDL, versiones/dependencias/lockfiles o AGENTS.md. Claves externas, sin secretos en evidencia, Mainnet, push, nuevo despliegue o frontend publicado. La pérdida histórica de dos capturas 3.3 sigue documentada; evidencia anterior restante conservada.

Siguiente propuesto: **4.3, revisión manual con extensión real y preparación de entrega final**, solo bajo nuevas instrucciones. No iniciado. La verificación automatizada solicitada está ejecutada y documentada; no se declara aceptación final de WayLearn mientras existan pendientes manuales/entrega. Detenerse al finalizar 4.2.


## Submódulo 5.1 — Revisión interna final de seguridad y arquitectura

Fecha: 22 de noviembre de 2026 (America/La_Paz); logs UTC del 23. **Completado dentro del alcance solicitado**. No es una auditoría profesional ni una certificación.

Resultado: cero defectos críticos/altos identificados; dos riesgos medios y tres bajos, uno bajo corregido. Clasificación y evidencias concretas en [SECURITY_REVIEW.md](SECURITY_REVIEW.md): extensión real pendiente (medio), upgrade authority única (medio), brecha del verificador de imports (bajo corregido), bincode transitivo sin mantenimiento (bajo pendiente) y ausencia de historial Git (bajo pendiente).

### Cambios y decisiones

- Se revisaron capas/dependencias, puertos/casos de uso/composición, firma/confirmación/errores y estado UI; contextos Anchor, owner/discriminator, autoridad, PDAs/bumps/relaciones, límites UTF-8, enums, transiciones, aritmética, refund y atomicidad.
- Se reprodujo que el verificador aceptaba SDKs externos desde Presentation. El código actual no incumplía esa regla. Corrección mínima en el verificador y regresión para cuatro familias SDK y cinco formas de importación; sin refactorizaciones de producto.
- Consulta OSV sobre 158 entradas registry Rust: bincode sin mantenimiento permanece abierto. Borsh 0.10.4 fue contrastado con RustSec, que lo identifica como corregido; se conserva la discrepancia del resultado bruto de OSV. npm audit sin vulnerabilidades conocidas. Sin upgrades forzados ni dependencias nuevas.
- Escaneo acotado de secretos sin candidatos; env solo con nombres de configuración pública. Metadatos externos: directorio 700/keypairs 600, sin leer claves. Historial Git no disponible, por tanto no revisado.
- Rust, IDL, frontend productivo y lockfiles conservados. El ELF recompilado tiene el mismo hash de 4.2 y coincide byte a byte con la lectura Devnet finalized; sin escrituras, firma, despliegue, Mainnet ni cambios globales.
- Se verificaron 88 archivos históricos de evidencia contra manifiestos finales 4.1/4.2. Los prefijos 5.1 separan los nuevos reportes y capturas.

### Archivos modificados o creados

- `scripts/check-architecture.mjs`: rechazo de SDKs blockchain conocidos desde Presentation.
- `tests/scaffold/architecture.test.mjs`: regresión de la brecha y controles positivos.
- `docs/SECURITY_REVIEW.md`: nuevo informe clasificado, alcance, referencias primarias y límites.
- `docs/ARCHITECTURE.md`, `docs/SECURITY.md`, `docs/PROJECT_CONTEXT.md`: decisión y resultado actual de la revisión.
- `docs/TEST_EVIDENCE.md`, `docs/PROGRESS.md`, `docs/ROADMAP.md`: comandos/resultados, pendientes y continuidad.
- `docs/evidence/5.1-*`: logs, JSON/capturas reales de regresión, consulta de avisos, árbol transitivo, reproducción previa, comprobador reproducible de solo lectura, resumen y manifiesto de hashes. No contienen claves privadas.

### Verificación ejecutada

| Comando / comprobación | Resultado |
| --- | --- |
| `npm run verify`, inicial y final | Ambos código 0. Inicial 118; final **119 pruebas**: 4 scaffold + 75 Application + 16 Infrastructure + 24 Rust host. Arquitectura, strict TypeScript, build Vite, formato/check/tests Rust locked aprobados. |
| `KHIPUTRACE_EVIDENCE_PREFIX=5.1 npm run test:program` | Código 0; ELF SBF compilado; **17/17**, 95 transacciones LiteSVM, 50 válidas/45 rechazos con verificación de cuentas. |
| `npm run check:idl` | Código 0; IDL/tipos generados coherentes con Rust. |
| `KHIPUTRACE_EVIDENCE_PREFIX=5.1-base npm run test:visual` | Código 0; **11/11** navegador. |
| `KHIPUTRACE_EVIDENCE_PREFIX=5.1-audits npm run test:audits` | Código 0; **10/10** navegador/componentes/flujo local. |
| `KHIPUTRACE_EVIDENCE_PREFIX=5.1-findings npm run test:findings` | Código 0; **9/9** navegador/componentes/flujo local. |
| `npm run test:devnet`, `npm run test:devnet-ui` sin --execute | Códigos 0; solo typecheck de los arneses, no nuevas pruebas transaccionales Devnet. |
| `npm run check:dependencies`; OSV querybatch de Cargo.lock y `cargo tree --locked -i ...` | npm código 0/ningún aviso conocido; 158 paquetes Rust consultados, dos coincidencias brutas con clasificación explícita. cargo audit no ejecutado. |
| `python3 docs/evidence/5.1-review-check.py` | Código 0; búsqueda acotada y hashes históricos sin incidencias, binario/autoridad/identidad Devnet comprobados mediante lectura. |
| `stat -c '%a %n'` para claves externas | Permisos 700/600 correctos. |
| `git rev-parse --is-inside-work-tree` | **128**, sin repositorio; limitación pendiente R-05. |

Logs y resultados estructurados completos en [TEST_EVIDENCE.md](TEST_EVIDENCE.md), sección 5.1. No fallaron pruebas automatizadas. Persiste el aviso histórico de clasificación de syscalls del SDK local; se conserva el log y se distingue de la ejecución SBF/Devnet realmente comprobada. Un raw URL exploratorio de Borsh devolvió 404; el contraste usó RustSec y la fuente instalada.

### Pendientes y detención

Pendientes medios/bajos abiertos según el informe. Extensión real y recorrido humano no ejecutados; sin validador completo/consenso, fuzzing o verificación formal. No se instaló Anchor CLI/validador/cargo-audit ni se inició Git. No hay correcciones críticas/altas ni redespliegue requerido por los cambios de este submódulo.

Siguiente propuesto: **5.2, cerrar pendientes de entrega con recorrido manual mediante extensión real y preparación de repositorio/documentación final**, sujeto a alcance e instrucciones explícitas. No iniciado. Se detiene el trabajo al completar 5.1.

## Submódulo 5.2 — Documentación final

Fecha: 23 de noviembre de 2026 (UTC). Alcance: recuperación del contexto, revisión de fuentes/código, documentación WayLearn y verificaciones de solo lectura. No se modificó código funcional ni configuración.

### Trabajo realizado

- Consultadas las páginas oficiales de proyecto final/certificado y pruebas/evidencias.
- Revisados README, documentos persistentes, configuración, programa Rust, cliente, composición, presentación, IDL, pruebas y evidencias.
- Creada `docs/WAYLEARN_COMPLIANCE.md` con requisitos oficiales, implementación, archivos, pruebas, evidencia y estado.
- Creada `docs/DEMO_GUIDE.md` con un recorrido breve adaptado al proyecto existente.
- Actualizado `README.md` y el contexto persistente.
- Confirmado que no se modificaron archivos de código, manifests, IDL, dependencias ni despliegue.

### Verificaciones ejecutadas

| Comando / comprobación | Resultado |
|---|---|
| `npm run verify` | Código 0: arquitectura, 4 pruebas scaffold, 75 Application, 16 Infrastructure, typecheck, build y 24 pruebas Rust host aprobados. |
| `npm run check:idl` | Código 0: IDL y tipos comprobados desde Rust, sin despliegue. |
| Consulta HTTPS JSON-RPC `getGenesisHash` | Código 0: `EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG`. |
| Revisión de fuentes oficiales WayLearn | Requisitos recuperados y documentados sin asumir cambios posteriores no publicados. |
| Git/status | No existe repositorio Git; no se inicializó ni se hizo commit/push. |

### Pendientes para entrega oficial

- Recorrido manual con una extensión real y registro de aprobaciones/rechazos.
- Inicialización/revisión del repositorio, revisión de secretos y publicación con acceso.
- Envío del formulario WayLearn con enlace y datos de identificación por el canal oficial.
- Si cambia el código/IDL/frontend o se vuelve a desplegar, repetir coherencia y evidencias.

No se realizaron despliegues, escrituras Devnet, cambios de configuración, commits, push ni modificaciones de código.

Estado de 5.2: **documentación final completada dentro del alcance autorizado**. No se declara entrega oficial ni certificación.

## Diagnóstico 2026-11-23 — incompatibilidad reportada de Solflare con Devnet

Estado: **causa externa no demostrada como defecto del cliente**.

Al intentar crear una auditoría desde Firefox, Solflare presentó «Network mismatch. Your current network is set to devnet, but this transaction is for mainnet». Se realizó un diagnóstico de solo lectura y construcción local, sin firmar ni enviar:

- `.env.local` usa `VITE_KHIPUTRACE_CLUSTER=devnet`, `VITE_KHIPUTRACE_RPC_URL=https://api.devnet.solana.com` y el Program ID real desplegado.
- El endpoint activo de Vite es el RPC oficial Devnet.
- `networkConfig` solo acepta el RPC oficial Devnet o HTTP loopback para Localnet.
- `ChainSession.assertReady` exige el genesis de Devnet y un programa ejecutable con owner de loader admisible.
- `TransactionSender` obtiene el reciente blockhash y altura de expiración mediante la conexión Devnet.
- `feePayer` se asigna a la public key de la wallet conectada.
- La instrucción `createAudit` utiliza el mismo IDL/Program ID desplegado y deriva el PDA de auditoría por authority e ID.
- Wallet Standard pasa explícitamente `chain: 'solana:devnet'` y exige una cuenta/feature de firma compatible con esa cadena.
- No existe un valor Mainnet hardcodeado en el flujo productivo. Las menciones a Mainnet presentes en bibliotecas/build son catálogos internos del SDK o casos negativos de pruebas.

Una construcción aislada obtuvo:

```text
endpoint: https://api.devnet.solana.com
genesis: EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG
programId: GV8SZn6i29tL4CmJMei5P3N3BLUxVZBWrG6hFQVSVSBv
recentBlockhash: 9f2Vb6kS5ZpAakZ3i2ejVqw9ZyHda2qSZ1QxPfLF4DXX
lastValidBlockHeight: 512419274
instructionCount: 1
instructionProgramId: GV8SZn6i29tL4CmJMei5P3N3BLUxVZBWrG6hFQVSVSBv
```

Por las evidencias disponibles, el cliente no construye ni envía una transacción Mainnet. No se encontró un defecto comprobable en TypeScript, Anchor, blockhash, fee payer ni IDL que justifique modificar el smart contract o el flujo de firma. No se ejecutó la firma real con Solflare en esta sesión; por tanto no se acredita una reparación ni se declara incompatibilidad definitiva.

Hipótesis de trabajo: compatibilidad del popup/simulador de Solflare con la transacción legacy, o estado/cache de la extensión Firefox. Debe probarse una transacción real sin introducir bypasses, endpoints alternativos o mensajes falsos. No se cambió código ni se agregaron dependencias.

## Preparación de publicación — revisión de secretos y Git

Se inicializó Git en la rama `main`. La cuenta autenticada en GitHub CLI es `Lilarpo`; el repositorio deseado `khiputrace` todavía no existe en esa cuenta.

Auditoría ejecutada:

- `frontend/.env.local` está excluido por `.gitignore`.
- `node_modules`, `target`, `dist`, `.cache` y entornos locales están excluidos.
- Los keypairs externos están fuera del workspace, con permisos `600`, sin impresión ni lectura de contenido.
- Ningún keypair o `.env.local` aparece entre los archivos preparados.
- No se encontró un token, clave privada o credencial en el índice mediante patrones comunes de secretos.
- El escaneo no sustituye una revisión independiente ni un escaneo contra el historial publicado.

No se realizó commit ni push durante esta preparación. La publicación pública requiere una confirmación explícita posterior a revisar el resumen de seguridad.

## Publicación GitHub

Fecha: 23 de noviembre de 2026 UTC.

- Cuenta autenticada: `Lilarpo`.
- Repositorio público: [https://github.com/Lilarpo/khiputrace](https://github.com/Lilarpo/khiputrace).
- Rama publicada: `main`.
- Commit inicial/publicado: `5f84c24`.
- Visibilidad comprobada mediante GitHub CLI: `PUBLIC`.
- README comprobado desde GitHub API.
- No se realizaron escrituras, despliegues, airdrops ni transacciones adicionales.
