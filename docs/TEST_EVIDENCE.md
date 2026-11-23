# Evidencias de verificación

## Alcance

Resultado actual: **5.1**, revisión interna de seguridad/arquitectura y regresión local, con lectura del programa Devnet. Clasificación y límites en [SECURITY_REVIEW.md](SECURITY_REVIEW.md). La evidencia de 4.2 conserva sus 28 casos Devnet, 8 etapas UI, 19 rechazos y 16 transacciones finalized; no se reejecutaron escrituras Devnet en 5.1. Extensión real y entrega final siguen pendientes.

Registro iniciado en el submódulo 0.2. Las secciones de resultados son históricas y se identifican por submódulo. Hasta 3.3 no existían despliegues ni transacciones Devnet. En 4.1 se desplegó con autorización y se verificaron código remoto, autoridad y CreateAudit real, con ambas firmas finalized sin error. La preparación, fallos intermedios y resultado final se identifican por fecha/sección. El diagnóstico RPC de 0.1 está registrado en [PROGRESS.md](PROGRESS.md).

## Plan ejecutable del scaffold

| Comando | Qué verifica |
| --- | --- |
| `npm ci --ignore-scripts --no-fund` | Instalación local reproducible desde package-lock.json, sin ejecutar scripts de dependencias. |
| `npm run check:architecture` | Dependencias entre capas del frontend y any explícito. |
| `npm run test:scaffold` | Aceptación y rechazo de imports en el verificador. |
| `npm run typecheck` | TypeScript estricto, incluidas declaraciones de dependencias. |
| `npm run build` | Bundle Vite de la pantalla informativa. |
| `npm run check:rust` | Formato, compilación y tests Rust host con lockfile y dos jobs. |
| `npm run check:toolchain` | Versiones CLI Solana/Anchor; no instala ni despliega. |
| `npm run check:dependencies` | Informe npm audit, con salida fallida ante avisos moderados o superiores. |

## Resultados ejecutados de 0.2

Fecha: 21 de noviembre de 2026 (America/La_Paz). Entorno: Linux Mint 22.3 x86_64; Rust/Cargo 1.99.1, Node 24.22.0 y npm 11.19.1. No hay commit Git porque el repositorio aún no está inicializado.

| Comando ejecutado | Código de salida | Resultado observado |
| --- | --- | --- |
| `npm install --no-fund` | 0 | Dependencias locales y lockfile generados; avisos de seguridad visibles. |
| `cargo generate-lockfile` | 0 | 158 paquetes fijados, anchor-lang 0.32.2. |
| `npm install --save-dev --save-exact @types/bn.js@5.2.0 --workspace frontend --ignore-scripts --no-fund` | 0 | Corrección de las declaraciones faltantes de bn.js. |
| `npm ci --ignore-scripts --no-fund` | 0 | Instalación desde lockfile, sin scripts de dependencias. |
| `npm ls --depth=0` | 0 | Versiones directas concordantes, sin paquetes extraneous tras npm ci. |
| `cargo check --workspace --all-targets --locked -j 2` | 0 | Primera compilación host completada en 3 min 19 s. |
| `npm run verify`, ejecución final | 0 | Arquitectura OK; 3 tests Node aprobados; TypeScript y Vite OK; rustfmt/check/test host OK, 1 test Rust aprobado. |
| `npm run check:toolchain` | 1 | No disponibles anchor, solana, cargo-build-sbf ni solana-test-validator. Fallo pendiente esperado, no aprobación. |
| `npm audit --json` | 1 | 7 paquetes afectados: 5 moderados y 2 altos. |
| `npm run check:dependencies` | 1 | Confirma avisos transitivos; no se aplicó arreglo forzado. |

Hubo dos fallos corregidos antes del resultado final: TS7016 por declaraciones de bn.js ausentes y un cálculo manual erróneo del espacio de Finding (1284 frente a 1184 bytes reales). La verificación final se ejecutó después de ambas correcciones. No hay errores funcionales ocultados ni tests deshabilitados.

Prueba Rust ejecutada: `maximum_utf8_payload_fits_planned_account_allocation`. Serializa Audit/Finding con cadenas multibyte al máximo, comprueba el espacio reservado (174 y 1184 bytes con discriminator) y deserializa un Finding conservando u64::MAX y 512 bytes de acción. El ID máximo del fixture prueba serialización; no demuestra que el negocio permita emitirlo.

Bundle observado: `dist/index.html` 0.32 kB; JS 219.87 kB (68.78 kB gzip), 15 módulos transformados. No se realizó inspección visual ni prueba de navegador. Artefactos medidos: node_modules 107 MiB, target 607 MiB y frontend/dist 228 KiB; `/home` quedó con aproximadamente 23 GiB libres. Son mediciones del entorno actual, no requisitos mínimos garantizados.

Identificación de grafos de dependencias, SHA-256:

```text
Cargo.lock         a3ed6b6ff55e19b33bef3a6bb8409f824ba8162f202c2ce5cf1a6d33a2e638b8
package-lock.json  8085fa70faeb74559505429095180432d8c911f9132e98631645fac21861e9e5
```

La revisión documental verificó 47 archivos propios, sintaxis JSON/TOML, enlaces Markdown locales, bloques de código y espacios finales. Los avisos de dependencias y su tratamiento están en [SECURITY.md](SECURITY.md). No se ejecutó cargo-audit ni se afirma ausencia de vulnerabilidades Rust.

No ejecutados: build SBF, generación/verificación de IDL, Localnet, autorización y pertenencia de cuentas, transiciones, contadores, cierre, firma de wallet y transacciones Devnet. Requieren las herramientas y la implementación de submódulos posteriores.

## Resultados ejecutados de 1.1 — Modelos y creación/lectura base

Fecha: 22 de noviembre de 2026 (America/La_Paz). Entorno y toolchains host sin cambios. Datos sintéticos, sin firmas ni transacciones en una red. Código sin commit porque todavía no hay repositorio Git inicializado.

| Comprobación | Resultado observado |
| --- | --- |
| `cargo fmt --all -- --check` | Código 0, formato correcto. |
| `cargo check --workspace --all-targets --locked -j 2` | Código 0, sin errores ni warnings observados. |
| `cargo build --workspace --locked -j 2` | Código 0. `file target/debug/libkhiputrace.so` confirma ELF shared object x86-64, con símbolos de depuración: artefacto nativo, no SBF. |
| `cargo test --workspace --locked -j 2` | Código 0, 15 pruebas aprobadas, ninguna fallida/ignorada. Son 13 tests en models.rs, 1 en layout.rs y test_id generado por declare_id. Doc-tests: 0. |
| `ANCHOR_IDL_BUILD_PROGRAM_PATH="$PWD/programs/khiputrace" cargo check --workspace --features idl-build --locked -j 2` | Código 0; compilan las macros de cuentas y programa con soporte IDL. No es generación ni validación del IDL final. |
| `anchor build -- --tools-version v1.52 --arch v0` | Código 127, `/bin/bash: anchor: command not found`. No hay build SBF. |

Casos host ejecutados:

- Constructores de creación: títulos y descripción normalizados; Audit inicia counters/next ID a cero; Finding inicia Open sin remediation_note, con identidad y severidad previstas.
- Límites de texto: rechazo de vacío, blancos, 97 bytes de título, 513 de descripción y exceso multibyte; aceptación de los máximos UTF-8.
- Contadores: incremento correcto, rechazo de ID obsoleto, overflow e invariantes inconsistentes; la regla pura no muta su entrada al rechazar.
- Seeds: representación little-endian de 8 bytes contrastada con bytes literales y create_program_address; separación por autoridad, ID y Audit.
- Serialización: tamaños de 174/1184 bytes incluyendo discriminator; enums de un byte y rechazo de variantes desconocidas; round-trip de cuentas y payload multibyte máximo.
- Lectura: owner equivocado, discriminator/tipo incorrecto, dirección o bump incorrectos en Audit/Finding, PDA alternativa válida pero no canónica, auditoría ajena, versión desconocida, ID aún no emitido, contadores inválidos y datos truncados.
- Contextos Anchor generados de CreateAudit y CreateFinding: AccountNotSigner cuando authority no ha firmado. Esta prueba no se limita a invocar Signer directamente.

No ejecutados en 1.1: SBF, validador Localnet, CPI real de inicialización, reinicialización con la misma PDA, saldo/renta, rollback y concurrencia transaccionales, wallet ajena que sí firma, lectura por RPC y flujo frontend. No se generó IDL final ni cliente, no hubo despliegue ni operaciones Devnet. La relación entre cuentas se comprobó con fixtures serializados; no se presenta como prueba de cuentas existentes en un cluster para WayLearn.

Los hashes de Cargo.lock y package-lock.json coinciden con los registrados en 0.2. No se añadieron dependencias directas. El chequeo con feature IDL descargó paquetes del grafo ya fijado, sin mutar el lockfile. No se repitió la auditoría npm ni se ejecutó una auditoría de crates Rust.

La identidad `3ntLzGokkxHGrNX5BDskidyew4Cn3RqL29ECUDo2ZCy1` se usa únicamente como identidad provisional de desarrollo y pruebas; no tiene keypair generado ni despliegue asociado. Debe sustituirse por una identidad real autorizada antes de desplegar; los resultados actuales no prueban funcionamiento en Devnet.

## Resultados ejecutados de 1.2 — Cinco instrucciones Anchor

Fecha: 22 de noviembre de 2026 (America/La_Paz). Mismo toolchain host, identidad provisional y versiones fijadas. Sin transacciones, claves privadas ni cambios frontend. Los hashes de los lockfiles continúan siendo los registrados en 0.2.

| Comando | Salida y evidencia |
| --- | --- |
| `cargo check --workspace --all-targets --locked -j 2` | Código 0; las cinco instrucciones y sus contextos compilan. |
| `cargo fmt --all -- --check` | Código 0, formato correcto. |
| `cargo build --workspace --locked -j 2` | Código 0; file identifica libkhiputrace.so como ELF shared object x86-64 con símbolos de depuración. No es un artefacto SBF. |
| `cargo test --workspace --locked -j 2` | Código 0 en ejecución final: 24 aprobadas, 0 fallidas/ignoradas, 0 doc-tests. |
| `ANCHOR_IDL_BUILD_PROGRAM_PATH="$PWD/programs/khiputrace" cargo check --workspace --features idl-build --locked -j 2` | Código 0; macros y tipos de las cinco instrucciones compatibles con compilación IDL. No se generó IDL final ni cliente. |
| `anchor build -- --tools-version v1.52 --arch v0` | Código 127: anchor: command not found. No hay build SBF. |

Las 24 pruebas incluyen 13 de modelos, 1 de layout y test_id de 1.1, más 9 pruebas nuevas en `programs/khiputrace/tests/instructions.rs`:

1. Contextos generados de update, resolve y close aceptan las cuentas válidas y rechazan autoridad ajena con is_signer=true y autoridad sin firma; los rechazos probados conservan snapshots de bytes/lamports.
2. Rechazo en ambos tipos de cuenta de owner, discriminator, dirección PDA y bump persistido incorrectos.
3. Rechazo de relación ajena, versiones desconocidas e ID todavía no emitido.
4. Rechazo de estados ilegales y contadores inconsistentes; update acepta Audit/authority readonly, resolve exige Audit mutable y close exige autoridad receptora mutable. Finding siempre debe ser mutable.
5. Despacho nativo por el entry point generado de Anchor: update cambia y serializa contenido sin alterar Audit; resolve persiste la acción normalizada, cambia estado y actualiza solo open_findings; repetir resolución se rechaza.
6. Rechazos por contenido inválido y autoridad ajena a través del entry point nativo, comprobando conservación de bytes/saldos en esos casos.
7. Regla de acción correctiva: rechazo de vacío, blancos, 9 caracteres ASCII/acentos/emojis y exceso de 512 bytes; aceptación de 10 caracteres y de máximos UTF-8 de 512 bytes. Se distingue explícitamente caracteres de bytes.
8. Preparación de cierre: conserva next ID y abiertos, decrementa activos, rechaza Open, nota corta, overflow del saldo receptor, underflow e inconsistencia de contadores. El ID antiguo se rechaza en la siguiente creación y la secuencia admite el siguiente.
9. Rechazo de modificación/resolución en Resolved y underflow al resolver, sin mutar el modelo antes de fallar.

El dispatch nativo ejecuta código real de Anchor y de los handlers con AccountInfo sintéticos; no es una simulación del validador ni verifica firmas criptográficas. Las comprobaciones de estado conservado anteriores no prueban rollback del runtime ante un fallo tardío.

**Cierre físico pendiente:** se comprobaron sus constraints y prepare_close, incluida la protección del checked_add(...).unwrap() interno de Anchor, pero no se ejecutó AccountsExit de close sobre memoria host. La transferencia, reducción de datos y cambio de owner requieren el layout del runtime. No se presenta la preparación de contadores como prueba de destrucción de cuenta.

También pendientes: CPI de init, renta, creación/transacciones de ciclo completo, reinicialización de PDA cerrada, concurrencia, rollback de runtime, SBF, generación de IDL final, wallet y evidencias Devnet. No se instalaron herramientas ni dependencias nuevas para eludir estos límites.

Las pruebas de negocio previstas en SECURITY.md y AGENTS.md siguen pendientes. La prueba Rust de layout no comprueba autorización, PDAs, contadores ni transiciones; comprueba únicamente tamaño y serialización del esquema propuesto.


## Submódulo 1.3 — Ejecución SBF local del programa

Fecha: 22 de noviembre de 2026. **Resultado: 17 pruebas de integración aprobadas, 0 fallidas; 95 transacciones de KhipuTrace, 50 aceptadas y 45 rechazadas con el error esperado y estado intacto.** Además, 24 pruebas Rust host aprobadas, 0 fallidas/ignoradas. No hubo cambios al código del programa ni al frontend.

### Entorno y reproducción

Linux Mint 22.3 x86_64; Python 3.12.3; unittest estándar; solders 0.26.0 con LiteSVM. Cargo-build-sbf de Agave 2.3.0, platform-tools 1.52, Rust SBF 1.89.0-dev, arquitectura v0, dos jobs y Cargo.lock obligatorio. Los binarios y wheels se descargan en caché local con SHA-256 fijados en los scripts/requirements. Rust host permanece en stable 1.99.1; rustup no cambió.

```bash
npm run setup:program-tests
npm run test:program
cargo fmt --all -- --check
cargo check --workspace --all-targets --locked -j 2
cargo test --workspace --locked -j 2
```

| Verificación ejecutada | Resultado observado |
| --- | --- |
| Preparación local y repetición mediante setup:program-tests | Código 0; herramientas extraídas y wheels verificados sin instalaciones globales. |
| Build SBF inicial | Código 0; release optimizado en 6 min 10 s. |
| npm run test:program, ejecución final | Código 0; build incremental 0.75 s y 17 pruebas en 3.200 s. |
| cargo fmt --all -- --check | Código 0. |
| cargo check --workspace --all-targets --locked -j 2 | Código 0. |
| cargo test --workspace --locked -j 2 | Código 0; 1 test_id + 9 instrucciones + 1 layout + 13 modelos = 24 aprobadas. |
| python3 -m py_compile de ambos scripts y test_program.py | Código 0. |
| rustup show active-toolchain | stable-x86_64-unknown-linux-gnu (default), conservado. |

La primera preparación tuvo una incidencia de ruta: Agave distribuye el SDK bajo platform-tools-sdk/sbf, no sdk/sbf. Se corrigió la ruta antes del build. La repetición de pip detectó directorios locales ya existentes; el script ahora usa --upgrade únicamente dentro de su --target para reemplazarlos con las versiones/hash fijados. No se cambió el entorno Python global.

### Cobertura ejecutada

| Casos | Comprobaciones observadas |
| --- | --- |
| Ciclo completo | Crear Audit y Finding mediante CPI; leer owner, discriminator, espacios, versión, autoridad, relación, IDs, contenido, enums y bumps; modificar Open; resolver con nota; cerrar y reembolsar a autoridad. Contadores comprobados tras cada paso. |
| Secuencia y cierre | Cerrar deja next_finding_id intacto, decrementa active y conserva open; siguiente creación usa ID 1, PDA diferente. Intentar reabrir ID 0 cerrado devuelve UnexpectedFindingId y no deja cuenta creada. |
| Autoridad y firmas | Wallet ajena que sí firma rechazada al crear/modificar/resolver/cerrar Finding. Firma ausente rechazada por el programa en los cinco contextos. |
| Relaciones y PDAs | Finding existente combinado con otra Audit existente, misma autoridad: ConstraintSeeds en update/resolve/close. PDAs de creación incorrectas también rechazadas. Owner System Program rechazado para Finding. |
| Texto y tipos | Títulos vacíos, blancos y >96 bytes, descripciones vacías/>512 bytes, límites multibyte, severity 255 en create/update. Rechazo exacto InvalidText o InstructionDidNotDeserialize. |
| Estados y acción correctiva | Modificar o resolver otra vez un Resolved falla. Cerrar Open falla. Notas vacías/blancas/9 caracteres/9 emojis fallan; >512 bytes falla. Notas de 10 ASCII/acentos/emojis y 512 bytes multibyte se aceptan y normalizan con trim. |
| Límites controlados | next ID u64::MAX, contador de abiertos cero al resolver, contadores inconsistentes, reembolso que desbordaría u64, bump almacenado incorrecto y versión no admitida: errores específicos del programa. |
| Atomicidad | Resolve seguido de update inválido revierte resolución y contador. Close seguido de create con ID antiguo revierte cierre, reembolso y contadores; el Finding original sigue resuelto y activo. |

Los estados límite se inyectan únicamente como fixtures privilegiados de LiteSVM; el programa no ofrece ninguna instrucción para fijarlos. La comparación de estado se toma después de esa preparación. Los demás casos usan cuentas creadas por instrucciones reales del programa en la VM.

### Errores exactos observados

| Error | Código | Rechazos |
| --- | --- | --- |
| InvalidText | 6002 | 12 |
| ConstraintSeeds | 2006 | 5 |
| AccountNotSigner | 3010 | 5 |
| CorrectiveActionRequired | 6004 | 4 |
| Unauthorized | 6000 | 4 |
| InvalidTransition | 6003 | 3 |
| CounterOverflow | 6006 | 2 |
| InstructionDidNotDeserialize | 102 | 2 |
| UnexpectedFindingId | 6008 | 2 |
| CounterUnderflow | 6007 | 1 |
| InvalidCounters | 6009 | 1 |
| FindingNotResolved | 6005 | 1 |
| InvalidBump | 6011 | 1 |
| UnsupportedVersion | 6012 | 1 |
| AccountOwnedByWrongProgram | 3007 | 1 |

Cada rechazo verifica InstructionError con índice/código exactos, logs de invocación y fallo de este Program ID y nombre del error Anchor. Se comparan las cuentas completas observadas antes/después: bytes, owner, executable, rent_epoch y lamports, incluidas PDAs inexistentes y saldos de autoridad/atacante. El sponsor paga las comisiones y queda excluido de la igualdad; no se afirma que una transacción fallida carezca de comisión. Las transacciones con fallo en la segunda instrucción exigen índice 1.

### Evidencias y vínculo con el código

- [Log build SBF final](evidence/1.3-build.log).
- [Log de las 17 pruebas](evidence/1.3-tests.log).
- [Log de fmt/check y 24 pruebas host](evidence/1.3-host.log).
- [Informe de las 95 transacciones](evidence/1.3-sbf-transactions.json): fecha UTC, identidad, hash ELF, hash de fuentes Rust y del test, resultados, firmas locales, logs, compute units y cuentas antes/después. Los rechazos añaden hashes de snapshots y state_unchanged=true.

ELF en target/sbf/khiputrace.so, SHA-256: `6dee51ea9164dbd31aae844cd696e8475f41a6eda21d1d589b4f75dee5142e6f`. La identidad pública sigue siendo provisional y no tiene keypair de despliegue. Las claves que firman en la VM se generan en memoria y no se exportan; no se guardan secretos en evidencias.

Lockfiles conservados: Cargo.lock `a3ed6b6ff55e19b33bef3a6bb8409f824ba8162f202c2ce5cf1a6d33a2e638b8`; package-lock.json `8085fa70faeb74559505429095180432d8c911f9132e98631645fac21861e9e5`. No hay commit Git porque la carpeta sigue sin repositorio inicializado; los hashes vinculan esta ejecución al código y binario concretos.

### Avisos y límites

El build emite un aviso por lib+cdylib: impide LTO; se conservan ambos para las pruebas host existentes. También lista syscalls como desconocidas porque el syscalls.txt del archivo oficial Agave descargado está vacío. El listado estático no conoce ni las llamadas estándar de Solana. El log conserva el aviso; LiteSVM verificó/cargó el ELF y ejecutó correctamente CPI, logs, SHA/PDA y acceso a renta en los recorridos probados. No se silenció el aviso ni se modificó el programa para eludirlo.

Se ejecutó un runtime SVM local en memoria, **no solana-test-validator ni un servidor Localnet RPC**. No se probaron concurrencia, confirmaciones RPC, faucet, frontend/wallet, IDL final ni Devnet. Las firmas locales no existen en Explorer y no sirven como transacciones Devnet de entrega WayLearn. La versión Solana embebida en este runtime tampoco equivale a la del cluster remoto.

No se ejecutaron push ni despliegues. Los avisos npm previos siguen abiertos y deben resolverse antes de integrar el SDK operativo. No se repitieron pruebas frontend ni npm audit: sus archivos/dependencias no cambiaron. El resto de límites históricos de 1.1/1.2 queda superado únicamente donde lo demuestra esta sección.


## Submódulo 2.1 — Infraestructura TypeScript e IDL generado

Fecha: 22 de noviembre de 2026. **Resultado final: 15 pruebas de infraestructura, 3 del verificador de arquitectura y 24 Rust aprobadas; cero fallos.** IDL generado por Anchor y comparación de artefactos aprobada. Tipos estrictos, bundle del frontend y bundle independiente de infraestructura aprobados. npm audit final: cero vulnerabilidades conocidas.

### Entorno, generación y dependencias

Se conservaron Node 24.22.0, npm 11.19.1, Rust host 1.99.1, Anchor SDK/Rust 0.32.2 y web3.js 1.99.0. No se instalaron CLI globales ni se cambió rustup, PATH o configuración Solana.

La herramienta host tools/idl-generator usa IdlBuilder de anchor-lang-idl 0.1.4, con lint/resolution y --locked -j 2. Genera realmente el IDL a partir de las macros Rust; no se redacta a mano. El script copia el JSON original y usa convertIdlToCamelCase del SDK para emitir tipo literal y valor tipado. check:idl recompila y compara JSON/tipos guardados sin actualizarlos. Este procedimiento no equivale a haber ejecutado Anchor CLI, que sigue ausente.

Para corregir los 7 paquetes afectados del diagnóstico inicial se agregaron overrides limitados a toml 5.0.1 bajo Anchor y jayson 5.0.0 bajo web3.js. Se revisaron manifests y cambios de API; no se ejecutó audit fix --force. Buffer 6.0.3 ya estaba en el grafo y se declara directo para usarlo explícitamente en navegador. Cargo.lock agrega la utilidad host y sus dependencias ya resueltas; no se cambia el programa on-chain. Los hashes concretos están en el manifiesto de esta ejecución.

### Comandos y resultados reales

| Comando | Resultado |
| --- | --- |
| cargo check -p khiputrace-idl --offline -j 2 | Código 0; prepara la utilidad y actualización mínima del lockfile. |
| npm update toml jayson --ignore-scripts | Código 0; aplica overrides y elimina dependencias vulnerables del subgrafo. |
| npm run generate:idl | Código 0; builder oficial, primer build de generación 3 min 47 s; IDL/tipos escritos. |
| npm ci --ignore-scripts, ejecución final limpia | Código 0; 86 paquetes añadidos, audit integrado con cero avisos. |
| npm run check:idl, ejecución final | Código 0; comparación exacta del JSON original y TS generado frente a la regeneración desde Rust. |
| npm run verify, ejecución final | Código 0; límites de capas, 3 tests de arquitectura, 15 de infraestructura, tipos, ambos bundles y fmt/check/test Rust. |
| npm audit --json, ejecución final | Código 0; vulnerabilities vacío y total 0. |
| npm ls toml jayson | Código 0; toml 5.0.1 y jayson 5.0.0 como overridden, sin dependencias inválidas. |
| Comparación SHA-256 de fuentes Rust con evidencia 1.3 | Coincidencia exacta; el programa no se modificó. |

Los 24 tests Rust corresponden a 1 test_id + 9 instrucciones + 1 layout + 13 modelos. La utilidad host y doc-tests tienen 0 casos y no se contabilizan como pruebas funcionales adicionales. El builder ejecuta sus tests privados de IDL por separado, sin presentarlos como transacciones de Solana.

Bundle de infraestructura para navegador: 58 módulos, 643.60 kB sin comprimir / 160.90 kB gzip. Es un artefacto de verificación en caché: la UI informativa no importa todavía este cliente. El bundle UI conserva 15 módulos y 219.87 kB / 68.78 kB gzip. Compilar para navegador no acredita un recorrido manual de wallet ni una prueba visual.

### Cobertura de los 15 casos ejecutados

1. IDL: identidad coherente con declare_id, cinco instrucciones y discriminators SHA-256 correctos.
2. PDAs: u64 little-endian, namespaces separados, 0/1/256/2^53+1/u64::MAX; rechazo de IDs negativos/fuera de rango.
3. Mapeos: Audit y Finding, precisión bigint, enums, nota Open=null y Resolved válida; rechazo de versión/bump/contadores/texto/relación/estados/enums corruptos y límites Unicode.
4. Decodificación con IDL de cuentas reales guardadas por LiteSVM en la evidencia 1.3, incluidos Open y Resolved. No se usan como datos Devnet.
5. Repositorios de lectura y listados: filtros por padre/autoridad, ausencia real, validación de la respuesta y errores RPC que no se convierten en listas vacías.
6. Cuenta incorrecta: owner, executable, discriminator, tamaño y PDA inválidos.
7. Red/configuración: IDL/Program ID distintos, ID vacío, Mainnet/Testnet, URL no permitida y programa ausente; rechazo antes de enviar.
8. Cinco escrituras: API tipada del Program, contenido/IDs, cuentas PDA, firma externa y estrategia de confirmación con blockhash/altura de expiración.
9. Confirmación diferida: la promesa de escritura no se completa antes de que el gateway confirme sin error.
10. Fallo confirmado y timeout/transporte ambiguo: error correcto, firma preservada y ausencia de reenvío automático de la operación.
11. Errores de simulación Anchor, rechazo de wallet y wallet ausente: mapeados de forma diferenciada.
12. Mensaje modificado o cambio de red durante la firma: rechazo sin envío.
13. Cliente JSON-RPC real de web3.js con fetch controlado: request/response funcionan con jayson corregido; no se contacta una red externa.
14. Cambio de wallet, firma ausente o fallo de firma sin código 4001: rechazo sin envío.
15. Programa no ejecutable o loader incorrecto, genesis Devnet incorrecto y entradas inválidas: errores específicos, sin envío.

Los gateways/wallets de esta suite son dobles de prueba explícitos. Sus confirmaciones y errores son respuestas sintéticas que verifican la infraestructura, no nuevas pruebas del comportamiento on-chain del programa. La evidencia del programa permanece en 1.3 y no se vuelve a etiquetar como una ejecución 2.1.

### Incidencias corregidas

- npm install inicial conservó transitorios antiguos del lockfile pese a añadir overrides; npm ls detectó ambas versiones como invalid. npm update toml jayson los resolvió y npm ci final confirmó una instalación reproducible sin avisos.
- La comprobación inicial de tipos detectó InstructionError como unknown; se añadió validación estructural de su array, índice y Custom antes de leerlo.
- Las pruebas CommonJS necesitaron esModuleInterop para las declaraciones oficiales del SDK; se habilitó solo en tsconfig de tests, manteniendo strict y skipLibCheck=false.
- El contrato general InstructionCoder no expone decode; la prueba usa BorshInstructionCoder concreto del SDK para verificar instrucciones.
- La wallet se captura como interfaz con clave pública estable y delegado de firma, evitando que un objeto mutable o un cambio de conexión altere la identidad durante la operación. Los fallos de signTransaction sin código 4001 también se clasifican como firma rechazada, sin atribuirlos a RPC.

No quedan errores de compilación o tests en la ejecución final. Cero avisos npm no significa ausencia demostrada de vulnerabilidades desconocidas.

### Evidencias y reproducción

- [Instalación limpia](evidence/2.1-install.log).
- [Generación/comprobación de IDL](evidence/2.1-idl.log).
- [Verificación completa y tests](evidence/2.1-verify.log).
- [npm audit final](evidence/2.1-audit.json).
- [Manifiesto de versiones/hashes](evidence/2.1-manifest.json).

```bash
npm ci --ignore-scripts
npm run check:idl
npm run verify
npm run check:dependencies
```

Para actualizar artefactos después de un cambio autorizado en Rust: npm run generate:idl y volver a comprobarlos. No editar JSON/tipos manualmente ni sustituir solo su address. Las fuentes primarias y decisiones de compatibilidad están en ARCHITECTURE.md.

### Límites y pendientes

No existe Program ID desplegado ni se introduce uno ficticio en configuración. El IDL conserva la identidad de compilación previa porque corresponde al programa existente; no se presenta como un despliegue. El cliente exige ID explícito igual al IDL, red permitida y cuenta ejecutable antes de operar. Para integración real faltan identidad definitiva, sincronizar Rust/Anchor.toml/IDL y un despliegue expresamente autorizado.

No se ejecutaron transacciones RPC Localnet ni Devnet, confirmaciones de cluster, pruebas con una extensión wallet, interfaz operativa o despliegues. No se repitió la suite SBF 1.3 porque su código está intacto; se verificó su hash y la regresión Rust host. No se ejecutó cargo-audit. No hubo push, configuración global modificada ni claves privadas almacenadas. El siguiente submódulo propuesto es 2.2; no está iniciado.


## Submódulo 2.2 — Casos de uso Application

Fecha: 22 de noviembre de 2026. **Resultado final: 74 pruebas de Application, 15 de infraestructura, 3 de arquitectura y 24 Rust aprobadas; 0 fallidas.** Tipos estrictos y builds aprobados. El alcance no incluye pantallas ni operaciones de cluster.

### Comandos ejecutados

| Comando o comprobación | Resultado observado |
| --- | --- |
| npm run test:application, primera ejecución | Código 2: una aserción accedía a propiedades de unknown sin el guard instanceof RepositoryError. Se corrigió el test manteniendo strict. |
| npm run test:application, ejecución intermedia | Código 0; 72 pruebas aprobadas. Después se añadieron dos casos de direcciones con salto de línea y se verificaron en la ejecución final. |
| npm run verify, ejecución final | Código 0; límites de capas, 3 pruebas del verificador, 74 de Application, 15 de infraestructura, TypeScript, builds UI/infraestructura y fmt/check/test Rust. |
| Comparación de hashes de lockfiles, frontend/package.json e IDL contra evidencia 2.1 | Coinciden: no se cambiaron dependencias ni artefactos generados. |

La suite Application final tardó 713.33088 ms en node:test, sin contar su compilación TypeScript. Su tsconfig conserva strict, noUncheckedIndexedAccess, exactOptionalPropertyTypes, noUnusedLocals/Parameters y skipLibCheck=false; usa CommonJS únicamente para ejecutar las pruebas con Node. No agrega un framework ni instala dependencias.

Los 24 tests Rust siguen siendo 1 test_id + 9 instrucciones + 1 layout + 13 modelos. Los 0 tests de la utilidad IDL/doc-tests no se presentan como casos adicionales. El programa Rust, sus cuentas e IDL no se modificaron y no se repitió SBF/Devnet.

### Cobertura ejecutada

| Grupo | Evidencia |
| --- | --- |
| Siete casos | Una llamada al puerto correcto, entradas normalizadas, IDs sin pérdida de precisión y resultado original preservado. |
| Validaciones sin efectos | Error InputValidationError con field/code esperado y 0 llamadas al repositorio para entradas inválidas. |
| IDs | bigint, negativos, u64::MAX+1 y number accidental rechazados donde corresponde; 0, 2^53+1 y u64::MAX válidos como representación u64. La aplicabilidad de una secuencia concreta corresponde a Rust. |
| Texto y Unicode | Blancos incluidos U+0085, título 96/97 bytes, acentos multibyte, descripción/acción 512/513+ bytes, notas de 9/10 valores escalares y emojis; BOM preservado como en Rust y surrogates aislados rechazados. |
| Dirección y gravedad | Sintaxis base58/longitud, espacios/salto de línea, auditoría/autoridad vacías e identidades inválidas; gravedad fuera de la unión permitida. La decodificación completa de clave sigue en infraestructura. |
| Espera de escritura | Las cinco escrituras permanecen pendientes mientras la promesa del repositorio no resuelve; no fabrican recibos ni éxito anticipado. |
| Errores | Instancia, causa, firma y código de RepositoryError preservados; confirmationUnknown y programRejected no se convierten en validación UX, éxito o reintento. Errores inesperados tampoco se ocultan. |
| Consultas | Arrays originales y listas vacías legítimas, sin confundir un fallo con ausencia de datos. |
| Composición e inmutabilidad | Ensamblaje de los siete casos a partir de puertos, ejecución sin adaptadores/UI y DTO normalizado sin modificar el original congelado. |

Los repositorios simulados solo registran llamadas y retornan respuestas/promesas/errores controlados; no reimplementan estados ni autorización del programa. Las referencias de prueba están identificadas como sintéticas y no tienen Explorer. La espera del mock demuestra el contrato de Application; la confirmación real sigue correspondiendo al adaptador 2.1.

### Decisiones e incidencias

- Reutilizados los puertos de Domain, con Pick para inyectar solo métodos necesarios por caso. No hay imports de Anchor, React, RPC o Infrastructure en Application.
- Normalización e identidad compartidas en application/validation. Rango/límites y trim de Rust se centralizan en domain/constraints y se reutilizan en los dos helpers de infraestructura existentes, conservando sus exports previos.
- El chequeo de direcciones rechaza explícitamente caracteres ajenos a base58, incluido salto de línea; no usa un ancla de fin que pueda aceptar antes de un salto final.
- El contrato AppServices de scaffold se adapta a GetAudits/GetFindings y deja de exponer lectores directos; no tenía consumidores operativos. La UI no se conecta todavía.
- Los rechazos de estado, permiso, relación e ID obsoleto siguen correspondiendo al programa; no se añaden lecturas previas con datos potencialmente obsoletos para autorizarlos.

### Evidencia y reproducción

- [Log completo de verificación](evidence/2.2-verify.log).
- [Manifiesto de archivos y hashes](evidence/2.2-manifest.json).

```bash
npm run test:application
npm run verify
```

No se ejecutaron npm audit, instalación limpia o regeneración de IDL en 2.2: las dependencias, lockfiles e IDL permanecen iguales a 2.1. Su audit de cero avisos es evidencia histórica de 2.1 y no se presenta como un análisis nuevo. No se ejecutó cargo-audit, navegador, wallet, RPC de cluster, SBF ni Devnet. No hubo push ni despliegue. Siguen pendientes identidad definitiva/despliegue autorizados, integración real y pantallas de 2.3.

## Submódulo 3.1 — Base visual React

Fecha de ejecución: 22 de noviembre de 2026. Linux Mint, Node 24.22.0, npm 11.19.1, Google Chrome 157.0.8103.78 ya instalado. No se descargó navegador, cambió configuración global, generó claves, firmó o desplegó. Esta evidencia cubre la base visual solicitada; no integración Devnet.

| Comando | Resultado observado |
| --- | --- |
| npm install --workspace frontend --save-exact @wallet-standard/app@1.1.1 @wallet-standard/base@1.1.1 @wallet-standard/features@1.1.1 --ignore-scripts | Código 0, dependencias locales y lockfile actualizados. |
| npm install --save-dev --save-exact @playwright/test@1.65.1 --ignore-scripts | Código 0; dependencia de pruebas local. |
| npm run verify | Código 0: límites de capas, 3 pruebas de arquitectura, 74 Application, 15 infraestructura y 24 Rust host; tipos y builds correctos. |
| npm run test:visual, ejecución final | Código 0: TypeScript estricto de pruebas/config y 11 casos Playwright, 0 fallos, 0 omitidos, 1 worker, sin retries; 46.3 segundos. |
| npm audit --json | Código 0, cero vulnerabilidades conocidas; informe conservado. |
| Inspección de capturas escritorio/móvil | Ejecutada; identidad, jerarquía, navegación y layout revisados. Test móvil sin overflow horizontal a 390 px. |

Evidencias: [verify](evidence/3.1-verify.log), [navegador](evidence/3.1-visual.log), [reporte estructurado](evidence/3.1-browser.json), [audit](evidence/3.1-audit.json), [escritorio](evidence/3.1-desktop.png), [móvil](evidence/3.1-mobile.png) y [manifiesto](evidence/3.1-manifest.json).

### Casos de navegador ejecutados

1. Escritorio 1440 × 1080: navegación de cuatro secciones, identidad propia, métricas «—» sin configuración, estado pendiente y ausencia de errores de página.
2. Móvil 390 × 844: sin overflow horizontal, selector nativo, ausencia de wallets y cierre con Escape.
3. Conexión con wallet controlada: dirección pública, copia/notificación, desconexión y almacenamiento local/session vacío.
4. Rechazo de conexión: error visible y notificación descartable.
5. Cancelación pendiente: aprobación posterior ignorada y ausencia de sesión activa.
6. Cambio de cuenta confirmado: dirección anterior retirada; cuenta incompatible posterior elimina sesión y muestra error.
7. Cuenta sin soporte Devnet: conexión rechazada sin sesión activa.
8. Fallo del proveedor al desconectar: sesión local cerrada y mensaje sin afirmar revocación de permisos.
9. Application e infraestructura reales: carga y lista vacía tras RPC interceptado; solo getGenesisHash, getAccountInfo y getProgramAccounts; métricas cero únicamente tras lectura correcta.
10. RPC inválido: error/reintento y respuesta pendiente ignorada después de desconectar; métricas vuelven a «—».
11. Wallet registrada después de iniciar la app: aparece sin recargar y conecta.

El servidor 4173 sirve el build de producción sin Program ID; 4174 sirve Vite con la identidad del IDL exclusivamente para pruebas con RPC interceptado. Se bloquea todo tráfico externo salvo las respuestas interceptadas por el propio test. La wallet sintética implementa el protocolo estándar, no contiene claves privadas y su método de firma falla si se invoca. No son cuentas o resultados Devnet. Estas pruebas no verifican la interacción con una extensión real.

### Incidencias y límites

El primer build agrupaba 727.41 kB de JavaScript y Vite avisaba de tamaño. Se separaron imports dinámicos de SDK/composición; el build final tiene chunk principal de 251.36 kB (78.66 gzip), CSS 18.19 kB y chunk diferido máximo 305.54 kB, sin advertencia de tamaño. No se aumentó el límite para ocultar el aviso.

Después de este cambio una ejecución tuvo 10 aprobadas y 1 fallida: el test de cambio de cuenta emitía un evento antes de completarse la conexión/validación asíncrona. Se añadió una aserción de dirección conectada antes del evento. No se relajaron las aserciones de cambio de cuenta, los tipos ni los timeouts. La ejecución final de los 11 casos pasa. Logs finales conservados; no se presenta la ejecución fallida como aprobada.

Playwright imprime un aviso de entorno NO_COLOR/FORCE_COLOR, sin impacto funcional; se conserva en el log. No se ejecutaron instalación limpia nueva, cargo-audit, regeneración de IDL, build SBF, validador RPC, extensión real ni operaciones Devnet en este submódulo. La evidencia anterior permanece histórica. No hay formularios completos ni acciones con firma habilitadas; falta probar el flujo real cuando exista un despliegue autorizado.

Reproducción: npm ci --ignore-scripts; npm run verify; npm run test:visual. Requiere Chrome instalado y puertos 4173/4174 libres. No usar la identidad provisional del test como configuración de un despliegue real.

## Submódulo 3.2 — Gestión de auditorías

Ejecución: 22 de noviembre de 2026, America/La_Paz (los reportes automáticos usan UTC). Entorno Node 24.22.0/npm 11.19.1, Google Chrome 157.0.8103.78, Playwright 1.65.1 y solders 0.26.0 de la caché local existente. Carpeta inspeccionada sin .env operativo ni despliegue Devnet configurado. No se instalaron CLI ni navegadores, cambió configuración global, desplegó o envió transacciones a una red pública.

### Comandos y resultados finales

| Comando | Resultado real |
| --- | --- |
| npm install --save-dev --save-exact ws@7.5.14 --package-lock-only --ignore-scripts | Código 0; se declara la misma versión de ws ya instalada transitivamente, sin modificar node_modules. |
| npm run verify | Código 0; límites de capas, 3 pruebas de arquitectura, 75 Application, 16 infraestructura y 24 Rust host; TypeScript estricto y builds aprobados. |
| KHIPUTRACE_EVIDENCE_PREFIX=3.2-base npm run test:visual | Código 0, 11 aprobadas, 0 fallos/omitidas/flaky, sin retries; 49.1 s. No sobrescribe evidencia 3.1. |
| npm run test:audits | Código 0, tipos estrictos de pruebas/config/componentes y 10 casos de navegador aprobados, 0 fallos/omitidas/flaky, sin retries; 51.0 s. |
| npm audit --json | Código 0; cero vulnerabilidades conocidas. |
| Inspección visual | Ejecutada sobre las capturas finales de escritorio, formulario móvil y detalle móvil; sin overflow horizontal de página a 390 px, tabla desplazable dentro de su contenedor. |

Regresión total: 118 pruebas de arquitectura/Application/infraestructura/Rust host y 21 de navegador. No se cuentan como pruebas nuevas los cero casos de IDL/doc-tests. GetAudit tiene una prueba que cubre resultado, dirección inválida sin llamada al puerto, ausencia y error preservado; la prueba nueva de infraestructura cambia wallet durante la última comprobación RPC y verifica que no se envía nada.

Build normal: chunk principal 262.05 kB (81.51 kB gzip), CSS 19.64 kB; SDK diferido máximo 305.54 kB. El build para el flujo local se guarda aparte en .cache/audit-preview. No se modifica frontend/dist con la configuración de pruebas local.

### Flujo con programa SBF real

Playwright sirve producción en 4175; una wallet controlada implementa Wallet Standard y genera Ed25519 no extraíble solo en memoria. Las transacciones legacy se firman en el navegador. El RPC/WebSocket mínimo en loopback (18899/18900) ejecuta/simula el ELF existente en LiteSVM, con verificación de firmas y blockhash. La señal de confirmación procede del resultado de esa VM, no de consenso de un cluster. No es un validador Solana ni prueba una extensión real.

ELF: target/sbf/khiputrace.so, SHA-256 `6dee51ea9164dbd31aae844cd696e8475f41a6eda21d1d589b4f75dee5142e6f`, idéntico al artefacto ejecutado en 1.3. No se recompiló SBF; Rust, IDL e identidad permanecen sin cambios.

| Estado inicial | Operación | Resultado esperado y observado |
| --- | --- | --- |
| Wallet efímera fondeada en la VM, sin auditorías | ID negativo/título vacío | Errores por campo; ninguna transacción enviada. |
| Sin auditoría, revisión con ID 9007199254740993 y título normalizado | Solicitar firma controlada y mantenerla pendiente | No hay ejecución ni éxito prematuro; envío deshabilitado. |
| Firma pendiente | Navegar a Resumen, aprobar y regresar a Auditorías | Programa crea la PDA real, recibo tras confirmación local y refresco; métrica 1 y fila única; ID sin pérdida de precisión. |
| Auditoría recién creada | Consultar detalle mediante GetAudit | Mismos ID/título/autoridad/PDA; activos 0, abiertos 0, siguiente ID 0. |
| Auditoría existente | Crear con mismo ID y título diferente para evitar firma idéntica | SBF rechaza durante preflight por cuenta ya existente; todas las cuentas observadas permanecen idénticas. No se envía ni se inventa confirmación. |
| Wallet nueva, sin auditorías | Rechazar firma | Error de wallet visible; ninguna transacción nueva ni fila creada. |
| Firma pendiente | Desconectar cuenta y aprobar tardíamente | Formulario/datos anteriores retirados; ninguna transacción nueva ni notificación de éxito. |
| Wallet nueva | Proveedor altera bytes del mensaje firmado | Adaptador rechaza antes del envío; ninguna transacción nueva. |

El informe SBF contiene **una ejecución exitosa** y **una simulación rechazada**, no dos transacciones confirmadas. La segunda referencia está etiquetada prepared_not_submitted: identifica bytes preparados para esa simulación, no una firma transmitida ni una transacción Explorer. Se guardan logs y cuentas antes/después; los airdrops son solo fondeo de la VM. Todo tráfico externo queda bloqueado. Los datos son sintéticos y las claves privadas nunca se exportan ni escriben.

### Componentes aislados

Servidor Vite en 4176, contratos Application controlados en tests/browser/components.tsx, fuera del bundle del producto. Las capturas muestran un aviso «Prueba de componentes · datos controlados, sin RPC ni transacciones». Se comprobaron seis escenarios:

- u64::MAX/overflow, precisión bigint, límite UTF-8 de emojis, revisión normalizada y retorno a editar sin firma; formulario móvil sin overflow.
- Resultado incierto: referencia conservada, mensaje explícito y nuevo envío bloqueado; sin Explorer para firmas locales/controladas.
- Confirmación seguida de error de refresco: recibo sigue visible y listado muestra error/reintento.
- Detalle existente con contadores 3/2/8, claramente controlados; no proceden del programa ni de Devnet.
- Cuenta no encontrada, diferenciada de error RPC.
- Error de detalle y botón de reintento.

### Incidencias corregidas y límites

1. El arnés inicialmente usó un export de ws incompatible con la versión CommonJS instalada. Se corrigió a su export Server y se declaró la versión existente como dependencia directa de desarrollo.
2. Una comprobación inicial de tipos detectó que faltaba propagar network a GuidePage; corregido sin relajar TypeScript.
3. El primer intento de flujo no llegó a enviar: faltaba Buffer global al construir transacciones legacy en navegador. Tres casos iniciales fallaron; se interrumpió el cuarto y cinco no se ejecutaron. Se diagnosticó mediante el log de causa y se añadió compatibilidad en Infrastructure con la dependencia buffer existente. La prueba focalizada posterior pasó; el flujo final pasa también en producción.
4. La regresión visual tuvo 10/11: un localizador de texto coincidía con un encabezado visible y otro de la página oculta que conserva la transacción al navegar. Se corrigió a getByRole('heading'), que respeta la visibilidad; final 11/11 sin retries.
5. Se corrigió el mensaje de conexión persistente para afirmar que la conexión no solicita firmas, sin afirmar después de una creación que nunca se firmó.

Avisos conservados: NO_COLOR/FORCE_COLOR del entorno y Vite indicando que .cache/audit-preview está fuera de la raíz frontend y no la vacía automáticamente. Es un directorio aislado de artefactos; se sirve el index recién generado. No son errores de compilación ni se aumentaron límites para ocultarlos.

No se ejecutaron instalación limpia nueva, regeneración de IDL, build SBF nuevo, suite completa LiteSVM de 1.3, cargo-audit, validador Solana, wallet de extensión real, despliegue o recorrido Devnet. Los límites de esas pruebas anteriores permanecen históricos. El pendiente Devnet requiere identidad/programa/IDL autorizados y un recorrido real posterior; este submódulo no autoriza desplegar. La UI de hallazgos no se implementó.

Evidencias: [verify](evidence/3.2-verify.log), [regresión base](evidence/3.2-base.log), [reporte base](evidence/3.2-base-browser.json), [componentes/flujo](evidence/3.2-visual.log), [reporte de navegador](evidence/3.2-browser.json), [cuentas/logs SBF](evidence/3.2-sbf-flow.json), [diagnóstico inicial](evidence/3.2-debug.log), [prueba focalizada](evidence/3.2-focused.log), [audit](evidence/3.2-audit.json) y [hashes](evidence/3.2-manifest.json). Capturas: [escritorio con creación real local](evidence/3.2-audits-desktop.png), [formulario móvil controlado](evidence/3.2-audit-form-mobile.png), [detalle móvil controlado](evidence/3.2-audits-mobile.png).

Reproducción, desde la raíz con la caché local y Chrome disponibles:

```bash
npm ci --ignore-scripts
npm run verify
KHIPUTRACE_EVIDENCE_PREFIX=3.2-base npm run test:visual
npm run test:audits
npm run check:dependencies
```

La instalación limpia del primer comando se ofrece para reproducir; no se ejecutó de nuevo en este submódulo. Los scripts de navegador terminan sus servidores; los puertos deben estar libres. Ningún comando despliega.

Cierre documental ejecutado: JSON/TOML y sintaxis Python correctos, enlaces locales existentes, comparación de hashes históricos y decodificación independiente de la cuenta Audit/PDA/bump/ID/contadores desde la evidencia SBF. El rechazo conserva todas las cuentas. Resultado estructurado: [comprobaciones finales](evidence/3.2-checks.json).

## Submódulo 3.3 — Flujo completo de hallazgos React

Fecha: 22 de noviembre de 2026, America/La_Paz; los reportes automáticos conservan UTC. Mismo entorno de 3.2 (Node 24.22.0, npm 11.19.1, Chrome 157.0.8103.78, Playwright 1.65.1 y solders 0.26.0 en caché). Sin dependencias nuevas, cambios globales, despliegue, claves en disco o transacciones externas.

### Verificaciones ejecutadas

| Comando | Resultado final |
| --- | --- |
| npm run typecheck, comprobación inicial | Código 0, TypeScript estricto. |
| npm run verify | Código 0: límites de capas, 3 pruebas de arquitectura, 75 Application, 16 infraestructura y 24 Rust host; tipos y builds aprobados. |
| KHIPUTRACE_EVIDENCE_PREFIX=3.3-base npm run test:visual | Código 0; 11/11, 0 omitidas/flaky, sin retries; 47.5 s. |
| KHIPUTRACE_EVIDENCE_PREFIX=3.3-audits npm run test:audits | Código 0; 10/10, 0 omitidas/flaky, sin retries; 54.0 s. |
| npm run test:findings | Código 0; tipos de pruebas/config, 9/9, 0 omitidas/flaky, sin retries; 68.1 s. |
| npm audit --json | Código 0; cero vulnerabilidades conocidas. |
| Inspección visual | Capturas finales de escritorio/móvil inspeccionadas; no hay overflow horizontal de página a 390 px. |
| Decodificación independiente de cuentas SBF | PDAs/bumps, título/gravedad/estado/acción, IDs, contadores, cierre y reembolso verificados desde los bytes del informe. |

Total ejecutado en las suites finales: **118 pruebas de regresión y 30 de navegador**. Los 9 casos nuevos incluyen 3 recorridos con SBF y 6 pruebas de componentes/estado. No se suman transacciones, cero casos de generador IDL o doc-tests como pruebas adicionales.

Build normal: JavaScript principal 279.17 kB (85.03 kB gzip), CSS 21.83 kB (5.69 gzip); SDK diferido máximo 305.54 kB. El build local de producción está separado en .cache/audit-preview y se limpia únicamente ese directorio antes de reconstruir. Se ejecutaron las suites secuencialmente con un worker; el aviso de outDir de 3.2 queda resuelto mediante --emptyOutDir en ese directorio aislado. Se conservan los avisos NO_COLOR/FORCE_COLOR del entorno.

### Recorridos con programa real en producción local

Se reutiliza el ELF target/sbf/khiputrace.so con SHA-256 `6dee51ea9164dbd31aae844cd696e8475f41a6eda21d1d589b4f75dee5142e6f`, igual al artefacto de 1.3. No se compila SBF nuevo. Wallet Ed25519 efímera no extraíble, firma en navegador, adapters Anchor y casos de uso reales, RPC/WebSocket temporal en loopback y ejecución/simulación LiteSVM. No es un validador ni confirmación por consenso de cluster.

| Estado/operación | Resultado esperado y observado |
| --- | --- |
| Crear auditoría, consultar Hallazgos | Auditoría propia seleccionable y contadores activos/abiertos/siguiente 0/0/0. |
| Crear hallazgo #0, gravedad Alta | Firma/confirmación, fila abierta y contadores 1/1/1 leídos del programa. |
| Modificar abierto | Título actualizado y gravedad Crítica; contadores sin cambio. |
| Resolver con acción corta | Error UX antes de firma; ningún registro nuevo en la VM. |
| Resolver con acción válida y espacios externos | Acción normalizada persistida, estado Resuelto y contadores 1/0/1. No aparecen Modificar/Resolver para el resuelto. |
| Abrir cierre sin aceptar y cancelar con Escape | Confirmación deshabilitada; no hay transacción de cierre. |
| Aceptar cierre y firmar | Cuenta sin datos, saldo 0 y owner System; desaparece del listado. Autoridad recibe reembolso neto local de 9,126,520 lamports después de la comisión. Contadores 0/0/1. |
| Crear después de cerrar | Nuevo hallazgo #1, PDA distinta, contadores 1/1/2. No se reutiliza #0; resumen global actualizado por consulta. |
| Formulario con ID siguiente obsoleto; otra transacción crea/resuelve/cierra #0 | Intento UI de crear #0 rechazado por SBF con 6008; mensaje/código visibles y todas las cuentas intactas. Refresco devuelve 0/0/1. |
| Cierre directo de abierto mediante transacción de prueba | Rechazo SBF 6005, con logs y todas las cuentas intactas. La UI no ofrece cerrar abiertos. |
| Formulario de edición abierto; otra transacción resuelve el mismo hallazgo | Edición UI rechazada por SBF con 6003; cuentas intactas. Refresco muestra resuelto y 1/0/1. |

Los estados obsoletos se producen mediante otras transacciones reales firmadas por la misma wallet, no editando directamente cuentas de la VM. El informe contiene **13 ejecuciones aceptadas** (incluye las transacciones concurrentes de preparación) y **3 simulaciones rechazadas**. Los rechazos son prepared_not_submitted: no se presentan como firmas publicadas o confirmaciones. Tráfico externo bloqueado; firmas locales sin Explorer.

La comprobación adicional inicialmente suponía que la cuenta cerrada sería null. La inspección mostró el comportamiento de LiteSVM: conserva un registro vacío con 0 lamports, owner System y sin datos. Se verificaron esas condiciones, la eliminación del listado y el reembolso; no se afirma que el registro bruto de la VM sea null ni se modificó el programa para ajustarlo a esa suposición.

### Componentes aislados

En 4176 se cargan contratos controlados, claramente etiquetados como prueba y fuera del bundle del producto:

1. Campos requeridos, título UTF-8 (25 emojis exceden 96 bytes), descripción de 514 bytes, acción de 9 caracteres o 513 bytes; mensajes y aria-invalid. Gravedad/estado textuales y foco inicial en Cancelar en el diálogo.
2. Transacción pendiente: botón de envío y selector bloqueados; navegar y completar conserva el recibo.
3. Resultado incierto: referencia visible, sin Explorer local y nuevos envíos bloqueados.
4. Refresco fallido después de confirmar: recibo y error de consulta coexistentes, sin convertir éxito en fracaso.
5. Consulta fallida diferenciada de lista vacía, con reintento.
6. Consulta pendiente seguida de desconexión: respuesta tardía no muestra hallazgos de la cuenta anterior.

### Incidencias y límites

La primera suite de hallazgos tuvo 7/8: la prueba de foco inicial detectó que autoFocus intentaba enfocar antes de showModal. Se corrigió con ref y foco explícito después de abrir, manteniendo la aserción. Después se añadió la prueba de consulta tardía; suite final 9/9 sin relajar strict, timeouts de aserciones o retries. Los recorridos largos SBF usan timeout de test 60/90 s desde su definición por contener varias transacciones; no se incrementaron para ocultar un fallo.

No se ejecutaron instalación limpia nueva, compilación SBF nueva, suite completa de 1.3, regeneración de IDL, cargo-audit, validador, extensión real o Devnet. Rust, Domain/Application, IDL, lockfiles/dependencias y evidencia 3.2 comparados sin cambios. La entrega final WayLearn y el recorrido real Devnet siguen pendientes de identidad y despliegue autorizados.

Evidencias: [verify](evidence/3.3-verify.log), [base](evidence/3.3-base.log), [base JSON](evidence/3.3-base-browser.json), [auditorías](evidence/3.3-audits.log), [auditorías JSON](evidence/3.3-audits-browser.json), [hallazgos](evidence/3.3-visual.log), [hallazgos JSON](evidence/3.3-browser.json), [SBF y snapshots](evidence/3.3-sbf-flow.json), [comprobación de cuentas](evidence/3.3-checks.json), [audit](evidence/3.3-audit.json), [manifiesto](evidence/3.3-manifest.json), [escritorio](evidence/4.1-final-findings-desktop.png) y [móvil](evidence/4.1-final-findings-mobile.png). Los prefijos conservan 3.1/3.2. Nota de 4.1: las rutas de las dos capturas eran fijas y la repetición las sobrescribió. Los enlaces de imágenes ahora señalan las capturas de 4.1; las imágenes originales de 3.3 no están disponibles y sus hashes originales siguen en su manifiesto. Los restantes reportes históricos permanecen conservados.

Reproducción con Chrome, caché local y puertos 4175/4176/18899/18900 libres:

```bash
npm ci --ignore-scripts
npm run verify
KHIPUTRACE_EVIDENCE_PREFIX=3.3-base npm run test:visual
KHIPUTRACE_EVIDENCE_PREFIX=3.3-audits npm run test:audits
npm run test:findings
npm run check:dependencies
```

npm ci se indica para reproducir desde el lockfile; no se ejecutó de nuevo en este submódulo. La preparación SBF/solders ya está documentada en 1.3/README si falta la caché. Estos comandos no despliegan ni necesitan una wallet personal.


## 4.1 — preparación Devnet, pendiente de financiación y autorización

Fecha local: 22 de noviembre de 2026; UTC de evidencias: 23. No se ejecutó ningún despliegue ni transacción de negocio Devnet. Las lecturas RPC identifican Devnet, genesis correcto, solana-core 4.5.0-beta.0 y ausencia de cuenta del programa. El saldo consultado es 0 SOL; dos solicitudes de airdrop fallaron sin firma. El error de CLI indica posible límite del faucet, sin probar una causa más específica.

### Artefacto e identidad final preparados

- Program ID real generado: `GV8SZn6i29tL4CmJMei5P3N3BLUxVZBWrG6hFQVSVSBv`; aún sin desplegar.
- ELF SBF v0: 273.368 bytes, SHA-256 `c941ab95d5cbfc6ae9ec73683dec79e24b0a60f11c505e7a173555b44eb08f17`.
- Wallet pagadora/upgrade authority: `Bd6Xa9JV3x3hZVkEnuGnH323MZxhYuCXuRe6DFSK3LKT`.
- Rust/Anchor/IDL/tipos/configuración frontend coherentes. Los archivos de claves están fuera del proyecto con permisos 600, directorio 700. Evidencias únicamente públicas.
- Rent consultado: programa 833.120 + ProgramData 1.389.588.280 + buffer 1.389.547.640 = pico conservador 2.779.969.040 lamports; comisiones no incluidas.

### Comandos ejecutados y resultados

| Comando | Resultado real |
| --- | --- |
| Extracción inicial de CLI/keygen desde archivo Agave 2.3.0 con SHA-256 verificado; después python3 scripts/setup-devnet-cli.py | Código 0. Dos binarios locales; sin configuración global. |
| python3 scripts/prepare-devnet-keys.py | Código 0. Claves oficiales aleatorias externas; sin seeds impresas. |
| Segunda ejecución del preparador y cmp de reportes públicos | Código 0. Identidades/rutas/permisos idénticos, sin sobrescritura de claves. |
| CLI balance con URL Devnet y keypair explícitos | Código 0; 0 SOL. |
| CLI airdrop 3 y airdrop 2 con URL Devnet/keypair explícitos | Ambos código 1. Solicitudes rechazadas; ninguna firma ni fondos obtenidos. |
| npm run verify, antes del cambio de identidad | Código 0; 118 pruebas, tipos/build/capas/Rust host. |
| KHIPUTRACE_EVIDENCE_PREFIX=4.1 npm run test:program | Código 0; 17 casos, 95 transacciones locales, identidad provisional anterior. |
| npm run check:idl, antes del cambio | Código 0. |
| KHIPUTRACE_EVIDENCE_PREFIX=4.1 npm run test:findings | Código 0; 9/9, 2.1 min, identidad anterior. |
| npm run generate:idl | Código 0; IDL/tipos regenerados desde Rust con identidad real nueva. |
| KHIPUTRACE_EVIDENCE_PREFIX=4.1-final npm run test:program | Código 0; build SBF nuevo y 17/17 casos, 95 transacciones: 50 aceptadas y 45 rechazadas por el programa con comprobación de estado. |
| Primer npm run verify con identidad nueva | Código 1: una prueba histórica filtraba cuentas 1.3 usando el nuevo Program ID. Se conserva el log de fallo. |
| npm run verify, después de corregir identidad histórica en prueba | Código 0; 3 scaffold/arquitectura + 75 Application + 16 infraestructura + 24 Rust host = 118; tipos, builds y formato aprobados. |
| npm run check:idl con identidad nueva | Código 0; JSON/tipos concordantes con Rust. |
| KHIPUTRACE_EVIDENCE_PREFIX=4.1-final npm run test:findings | Código 0; 9/9, 84.0 s, sin omisiones/retries/flaky. Flujo completo con nuevo ELF en LiteSVM; no es consenso Devnet. |
| KHIPUTRACE_DEPLOYER_ADDRESS=Bd6Xa9JV3x3hZVkEnuGnH323MZxhYuCXuRe6DFSK3LKT node scripts/check-devnet.mjs | Código 0; diagnóstico exclusivamente de lectura, coherencia de identidad, red, rent, cuenta ausente y saldo cero. No significa listo para desplegar. |
| KHIPUTRACE_EVIDENCE_PREFIX=4.1-capture-check npm run test:findings | Código 0; 9/9, 1.2 min; rutas nuevas comprobadas, sin sobrescribir las capturas anteriores. |
| npm audit --json | Código 0; cero vulnerabilidades conocidas. |
| PATH temporal con caché CLI, npm run check:toolchain | Código 1; Solana/cargo-build-sbf 2.3.0 disponibles. Anchor CLI y solana-test-validator ausentes. No se declara toolchain completo. |
| node --check del diagnóstico y python3 -m py_compile de scripts Python modificados/nuevos | Código 0. |

Los scripts SBF ahora admiten KHIPUTRACE_EVIDENCE_PREFIX, conservando 1.3 por defecto. La prueba histórica de mapeo usa el owner/PDAs/Program ID de su reporte original y el esquema IDL compatible; las validaciones productivas no cambiaron.

### Incidencias y límites

El build mantiene avisos anteriores de dos crate types y clasificación de syscalls; el SDK incluye syscalls.txt vacío. No se ocultaron. La VM ejecutó el ELF, pero aún no se verificó su aceptación por el loader Devnet con CLI 2.3.0. La versión del cluster difiere de la CLI fijada; no se declaró compatibilidad completa sin desplegar.

Incidencia de evidencia: las capturas de findings.spec.ts usaban rutas 3.3 fijas aunque JSON/RPC usaban el prefijo nuevo. Las dos imágenes originales fueron sobrescritas durante estas repeticiones y no pudieron recuperarse. Las capturas actuales se movieron a 4.1-final; se corrigió la ruta para respetar el prefijo y se actualizaron enlaces. El manifiesto 3.3 conserva los hashes originales y por tanto esas dos imágenes históricas ya no están disponibles. No se reescribieron logs/transacciones/manifiestos históricos para ocultarlo. La repetición posterior para verificar este arreglo se registra separadamente como 4.1-capture-check: 9/9, sin omisiones/flaky/retries y con ambas imágenes en rutas propias.

No se repitieron las suites separadas base visual/auditorías, instalación limpia o cargo-audit. Se verificó el ciclo auditoría/hallazgo completo mediante la suite de hallazgos, además de unidades/adaptadores/SBF. No hay extensión real, validador local ni firma Devnet confirmada que acreditar. Falta financiar y autorizar el despliegue, verificar código/owner/authority remoto y registrar una transacción de negocio real. No se avanzó a otro submódulo.

### Evidencias y reproducción

Procedimiento/comando exacto y verificaciones posteriores pendientes: [DEPLOYMENT.md](DEPLOYMENT.md). Logs: [verify final](evidence/4.1-final-verify.log), [fallo de prueba histórica](evidence/4.1-verify-identity-failure.log), [build SBF](evidence/4.1-final-build.log), [casos SBF](evidence/4.1-final-tests.log), [transacciones SBF](evidence/4.1-final-sbf-transactions.json), [IDL](evidence/4.1-final-idl-check.log), [UI final](evidence/4.1-final-findings.log), [JSON UI](evidence/4.1-final-browser.json), [RPC Devnet](evidence/4.1-devnet-check.json), [airdrop inicial](evidence/4.1-airdrop.log), [airdrop 2 SOL](evidence/4.1-airdrop-retry.log), [toolchain](evidence/4.1-toolchain.log), [identidades públicas](evidence/4.1-identities.json), [audit](evidence/4.1-audit.json). Versión sin commit Git: hashes y cambios en [manifiesto 4.1](evidence/4.1-manifest.json).

Revisión documental final: enlaces Markdown locales resueltos, hashes del manifiesto comprobados y ninguna ruta de keypair fuera de directorios ignorados de dependencias/build/caché en el proyecto. El reporte no contiene secretos: [comprobación documental](evidence/4.1-document-check.json). Las dos capturas históricas perdidas se identifican explícitamente.


### 4.1 — consulta de saldo tras financiación

Se ejecutó Node/fetch contra el RPC oficial: getGenesisHash y getBalance de la wallet pagadora, commitment confirmed. Código 0. Genesis Devnet correcto; slot 525279011; saldo **10 SOL Devnet**, sin firma/envío ni lectura de claves privadas. Fecha UTC 2026-11-23T02:20:27.580Z, 22 de noviembre America/La_Paz. [Respuesta pública](evidence/4.1-funded-wallet-check.json). No se repitieron pruebas/build porque no cambió código. Financiación resuelta; despliegue y transacción de negocio siguen pendientes de autorización. El manifiesto anterior conserva el estado previo; [manifiesto de esta actualización](evidence/4.1-funding-manifest.json) registra los documentos actuales y la evidencia de saldo.


## 4.1 — despliegue autorizado y verificado (resultado final)

Fecha local: **22 de noviembre de 2026, America/La_Paz**; UTC de evidencias: 23. El usuario respondió «si autorizo» a la solicitud concreta con límite de **3 SOL Devnet**. No se desplegó antes de esa respuesta. Preflight autorizado: genesis Devnet correcto, saldo 10 SOL, Program ID/IDL/cliente coincidentes, archivos externos 600 y ELF aprobado SHA-256 `c941ab95d5cbfc6ae9ec73683dec79e24b0a60f11c505e7a173555b44eb08f17`.

### Ejecución y comprobación

| Comando / operación | Resultado ejecutado |
| --- | --- |
| Diagnóstico Devnet y comprobación Python de presupuesto/hash/identidades/permisos | Código 0. Rent conservador más margen inferior a 3 SOL; saldo suficiente. |
| Primer solana program deploy, comando preparado con --use-rpc --max-sign-attempts 3 | Código 1: Data writes to account failed / Max retries exceeded. No se declaró éxito. Consulta auxiliar recibió RPC 429 Connection rate limits exceeded. |
| getGenesisHash, getAccountInfo de programa/buffer y getBalance tras fallo | Código 0. Programa ausente; buffer del loader existente, 273.405 bytes y 1.389.588.280 lamports; saldo 8.610.206.720 lamports. Se comprobó presupuesto antes de reanudar. |
| Reanudación del mismo comando, sustituyendo transporte por --use-quic --max-sign-attempts 1 | Código 0, mismo buffer/Program ID/autoridad/ELF. Sin saltar preflight/feature verification. Avisos sendmsg/offload UDP conservados; firma real devuelta. |
| solana program show, URL Devnet/wallet explícitas, --output json | Código 0. ID/owner/ProgramData/authority/slot/tamaño comprobados. |
| solana program dump, URL Devnet/wallet explícitas | Código 0. Archivo descargado idéntico byte por byte al ELF local. |
| Lectura directa RPC de Program y ProgramData, derivación PDA del loader, getTransaction y getBalance | Código 0. executable true, owner correcto, metadatos de loader/canonical ProgramData/authority correctos; hash remoto igual al ELF; meta.err null y buffer ausente. |
| npm run check:idl | Código 0. IDL/tipos generados concuerdan con Rust y programa real. |
| npm run build | Código 0. Build producción local; Program ID encontrado en config-Dw0u_cue.js e index-DGGHEvea.js. No se publicó frontend. |
| node scripts/check-devnet-smoke.mjs | Código 0. Compilación TypeScript estricta del comprobador y casos/adaptadores importados, sin transacción. |
| ANCHOR_WALLET externo, node scripts/check-devnet-smoke.mjs --execute | Código 0. Una CreateAudit real por Application/Infrastructure, firma/confirmación, getTransaction sin error y relectura de cuenta/PDA. Wallet.local oficial; código propio no parsea/imprime secretos. |
| Diagnóstico Devnet/cliente posterior | Código 0. IDL/Rust/Anchor/configuración coherentes, ejecutable presente y saldo final correcto. |
| getSignatureStatuses de despliegue y CreateAudit, searchTransactionHistory=true | Código 0. Ambas finalized, err null. |
| Repetición controlada de --execute con reporte ya existente | Rechazo esperado, código 1, antes de cargar wallet/contactar RPC; reporte y firma previos conservados. No es un rechazo del programa: es un guard operativo contra repetición/pérdida de evidencia. |
| node --check scripts/check-devnet-smoke.mjs | Código 0. |

Las 118 pruebas locales de verify, 17 casos SBF/95 transacciones y suites UI de preparación se ejecutaron antes de la autorización, sobre el mismo código de negocio y ELF que se desplegó. No se presentan como pruebas repetidas en esta fase. No se cambió negocio/frontend productivo durante el despliegue; se añadió el comprobador operativo y se actualizó .env.example con el ID realmente verificado. La prueba operativa importa los casos/repositorios existentes y verifica el límite total antes de crear la cuenta; conserva recibo/error si la confirmación quedara incierta.

### Identidad y transacciones reales

- Program ID: `GV8SZn6i29tL4CmJMei5P3N3BLUxVZBWrG6hFQVSVSBv`, [Explorer Devnet](https://explorer.solana.com/address/GV8SZn6i29tL4CmJMei5P3N3BLUxVZBWrG6hFQVSVSBv?cluster=devnet).
- Owner: `BPFLoaderUpgradeab1e11111111111111111111111`; executable true.
- ProgramData: `26Ro9jtk13JNZtmigtZXSKH7BXPDY9i6LThWKgZeRiuz`; upgrade authority `Bd6Xa9JV3x3hZVkEnuGnH323MZxhYuCXuRe6DFSK3LKT`.
- ELF local / dump / bytes de código ProgramData: **273.368 bytes, mismo SHA-256** `c941ab95d5cbfc6ae9ec73683dec79e24b0a60f11c505e7a173555b44eb08f17`.
- Despliegue: slot **525280825**, [transacción finalized sin error](https://explorer.solana.com/tx/3UKwewKZn5yhuBvtiqLxVDMHRe3CM1Ws58bJuwh6H73fNQhEya2vuu9vqCrgUJxuLxaJ5F1HVGiLQuHPeY9kd2Fi?cluster=devnet).
- CreateAudit: slot **525281228**, [transacción finalized sin error](https://explorer.solana.com/tx/3uoFNMRYuVwx8SGZzBGVa5nukookgXHqiY7NayWaEPzNNXYwfaZdGpc7WpwmEEnfy3FwW6chAMUgVmdnkcEC8Y3C?cluster=devnet), comisión 5.000 lamports.
- Estado inicial: PDA de auditoría inexistente. Operación: CreateAudit con ID `202611220401` y título `Verificación sintética KhipuTrace Devnet 4.1`. Resultado esperado/observado: PDA `6dXLqe3dS9MtDvQspXyjF9FvEwP4BqGUXpZvF1a1Kaob`, autoridad pagadora, ID/título iguales, nextFindingId/findingCount/openFindingCount en **0**. Los adaptadores validaron ownership/PDA/bump/estado al releer.

### Presupuesto observado

| Momento | Saldo pagador (lamports) |
| --- | --- |
| Preflight autorizado | 10.000.000.000 |
| Tras primer intento fallido, con buffer financiado | 8.610.206.720 |
| Tras despliegue completo y cierre del buffer | 8.608.193.600 |
| Tras CreateAudit | 8.606.654.440 |

Reducción neta total: **1.393.345.560 lamports = 1,39334556 SOL Devnet**, incluyendo rent persistente de programa/ProgramData/auditoría y comisiones de los intentos. Inferior al máximo autorizado de 3 SOL. El rent no es íntegramente una comisión consumida; el buffer temporal se cerró y devolvió fondos correctamente. Las claves se mantienen fuera del proyecto; no hay transferencia de autoridad ni programa inmutable.

### Límites y continuidad

El primer fallo RPC y los avisos QUIC quedan registrados, sin bloqueos remanentes del despliegue. La aceptación por el loader Devnet y CreateAudit real acreditan la combinación ejecutada CLI 2.3.0 / ELF / cluster observado; no prometen compatibilidad universal ni todas las operaciones Devnet. Anchor CLI y solana-test-validator siguen ausentes, sin afectar el procedimiento realizado. Sin push, Mainnet, frontend publicado o IDL on-chain. Sigue pendiente, fuera de 4.1, el recorrido completo de hallazgos y rechazos críticos con extensión real en Devnet y la entrega WayLearn. No se inició ese siguiente submódulo.

Nuevos archivos de verificación: scripts/check-devnet-smoke.mjs y scripts/devnet-smoke/{run.ts,tsconfig.json}. Configuración pública actualizada: frontend/.env.example. Estado/documentación: README, PROJECT_CONTEXT, ARCHITECTURE, SECURITY, ROADMAP, PROGRESS, DEPLOYMENT y este documento. Dumps/builds ignorados; evidencias públicas bajo docs/evidence/4.1-*. [Manifiesto final del despliegue](evidence/4.1-deployed-manifest.json).

Evidencia principal: [autorización](evidence/4.1-deployment-authorization.json), [preflight autorizado](evidence/4.1-authorized-preflight.json), [fallo inicial](evidence/4.1-deploy.log), [estado intermedio](evidence/4.1-after-first-attempt.json), [reanudación](evidence/4.1-deploy-resume.log), [program show](evidence/4.1-deployed-program.json), [dump](evidence/4.1-program-dump.log), [verificación independiente](evidence/4.1-deployment-verification.json), [prueba de negocio](evidence/4.1-devnet-smoke.json), [estados finalized](evidence/4.1-signature-statuses.json), [IDL](evidence/4.1-deployed-idl-check.log), [build frontend](evidence/4.1-deployed-frontend-build.log), [cliente/red](evidence/4.1-deployed-client-check.log), [guard de repetición](evidence/4.1-smoke-repeat-guard.log).


## 4.2 — verificación completa automatizada contra los criterios WayLearn

Fecha: **22 de noviembre de 2026, America/La_Paz**. Evidencias UTC del 23. Se consultó [Pruebas y evidencias](https://waylearn.gitbook.io/solana-engineering-track-advanced/pruebas-y-evidencias); la equivalencia con el proyecto propio está documentada en el README. Se verificaron operaciones válidas, autorización, relaciones, cierre condicionado y aporte propio, usando cuentas existentes y conservando errores de preflight. Los criterios manuales se distinguen expresamente.

### Resultado por estado

| Estado | Resultado |
| --- | --- |
| **Aprobadas** | 28 casos cliente/programa, incluidos 18 rechazos; 1 prueba Playwright con 8 etapas UI y otro rechazo Rust; 16 transacciones válidas finalized sin error; 118 pruebas de regresión; tipos/build, IDL e instalación aislada. |
| **Fallidas vigentes** | 0 entre los casos ejecutados. Los rechazos esperados son pruebas aprobadas. |
| **Incidencias superadas** | Primera ejecución interrumpida por lectura RPC después de modificación confirmada; firma/estado reconciliados sin reenvío. Errores iniciales TS corregidos. Reintentos de lectura/429 conservados. |
| **Pendientes** | Recorrido humano con extensión real; comprobación de su ventana de firma/rechazo/cambio de cuenta; entrega final del repositorio/README/certificación. No se presentan como aprobados. |

La UI se ejecutó como build de producción local contra el RPC público real de Devnet. Wallet Standard de pruebas delega la firma a Wallet.local oficial en Node con el keypair externo: **no es una extensión real**, no coloca claves privadas en navegador y no simula respuestas RPC. El firmante de pruebas solo acepta una instrucción del programa para la auditoría/PDAs previstas y limita el número de firmas.

### Versión y entorno comprobados

- Programa Devnet: [`GV8SZn6i29tL4CmJMei5P3N3BLUxVZBWrG6hFQVSVSBv`](https://explorer.solana.com/address/GV8SZn6i29tL4CmJMei5P3N3BLUxVZBWrG6hFQVSVSBv?cluster=devnet).
- RPC: `https://api.devnet.solana.com`; genesis `EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG`.
- Hash ELF probado/código on-chain: `c941ab95d5cbfc6ae9ec73683dec79e24b0a60f11c505e7a173555b44eb08f17`. No hubo cambios de programa ni nuevo despliegue en 4.2.
- IDL/tipos y cliente concordantes. Build UI producido desde el mismo frontend; versiones de fuentes, pruebas y artefactos en [manifiesto 4.2](evidence/4.2-manifest.json). Sin commit Git: el repositorio aún no está inicializado.
- Node 24.22.0, npm 11.19.1, TypeScript 5.9.3, Chrome 157.0.8103.78 y Playwright 1.65.1. Sin claves/seed phrases ni datos personales reales en evidencias.

### Preparación y actores

- Autoridad: `Bd6Xa9JV3x3hZVkEnuGnH323MZxhYuCXuRe6DFSK3LKT`.
- Wallet no autorizada: `H5iHtUYjBpKNQi6axDDJhC4iVFnXyu4B3ioY97da5Tqz`, keypair oficial externo `~/.local/share/khiputrace/devnet/4.2-unauthorized-keypair.json`, permisos 600. Se comprobó saldo inicial 0 y se financió con **0,03 SOL Devnet** para que la falta de fondos no enmascarara la regla.
- [Fondeo confirmado](https://explorer.solana.com/tx/2f3zg8Kz7D8pHDEK2deftiZfJinbkzbUcQED2uSCsG97aYeYtK1iXLyvSSdiW2GPi8zxAEk9uXyh2Pfnu55ypf6z?cluster=devnet), saldo del actor antes de los rechazos: 30000000 lamports.
- Auditoría A: `REBwx7FKtNwmVfE61R7Erg9ymbdN28HKir4cGFoGYFR`, ID 202611220420. Auditoría B: `8caAjv4e22auwC2M3ymPvMUWa7SUq8LyGfnpDtH9fFEC`, ID 202611220421; ambas de la autoridad principal. Hallazgo 0/1 derivados de A: `8DZ7x4iTNLXxkHoa3Fb8JfmyGwRDggBqHHS71c9RJW4P` / `8HM7bGE6qwogEF1cjCYhNZFHnyyc5Q7ArukszTp5BRhS`.

Las pruebas de relación combinan A/B/Finding existentes, con la misma autoridad válida; el rechazo 2006 ConstraintSeeds corresponde a la relación canónica de la PDA de Finding. No se confunde con una wallet ajena ni una cuenta inexistente. Los cuatro intentos no autorizados usan un firmante real financiado y reciben 6000 Unauthorized.

### Casos cliente/programa — estado inicial, operación, resultado y estado final

Datos completos, bytes base64/owner/lamports, slots de lectura, logs y decodificación por caso: [reporte ejecutado](evidence/4.2-devnet-acceptance.json). Los snapshots incluyen todas las cuentas de negocio vigiladas; cada rechazo compara exactamente datos, owner, lamports y ejecutabilidad antes/después. El orden de contadores en las descripciones es **siguiente / activos / abiertos**, salvo textos de UI que identifican su propio orden.

#### C01 — Crear auditoría (`create-audit`)
- **Inicial:** Audit inexistente; sin cuentas Finding.
- **Operación y esperado:** Crear auditoría con autoridad responsable y contadores 0/0/0.
- **Observado:** Transacción finalized sin error; slot 525284903, comisión 5000 lamports.
- **Final:** Audit: siguiente=0, activos=0, abiertos=0; sin cuentas Finding.
- **Firma/error:** [5jndZYRjQf5pPTWyvGtHfoteXxUTBiUtvAHNyJBPJdKrm1m65Mz8ZHfwgSHU7UNRb7E94VKeYvjMWpqwfJpkCnCf](https://explorer.solana.com/tx/5jndZYRjQf5pPTWyvGtHfoteXxUTBiUtvAHNyJBPJdKrm1m65Mz8ZHfwgSHU7UNRb7E94VKeYvjMWpqwfJpkCnCf?cluster=devnet)

#### C02 — Consultar auditoría y listado (`read-audit`)
- **Inicial:** Audit: siguiente=0, activos=0, abiertos=0; sin cuentas Finding.
- **Operación y esperado:** Consultar detalle/listado desde casos de uso y obtener la misma cuenta.
- **Observado:** Lectura RPC decodificada y comprobada mediante los casos de uso/repositorios; cuenta y pertenencia correctas.
- **Final:** Audit: siguiente=0, activos=0, abiertos=0; sin cuentas Finding.
- **Firma/error:** No aplica: lectura RPC, sin transacción.

#### C03 — Crear auditoría existente para comprobar pertenencia (`create-second-audit`)
- **Inicial:** Audit: siguiente=0, activos=0, abiertos=0; sin cuentas Finding.
- **Operación y esperado:** Crear otra auditoría existente de la misma autoridad para probar pertenencia.
- **Observado:** Transacción finalized sin error; slot 525284957, comisión 5000 lamports.
- **Final:** Audit: siguiente=0, activos=0, abiertos=0; sin cuentas Finding; auditoría B: siguiente=0, activos=0, abiertos=0.
- **Firma/error:** [VUqwdCKp4g6ZmGBn1UrMHspzrH1fGW1m9K7XpMPm9Lif2n54V82UJ5GQoQPPxm4RERCM23WKgi6xsrDJz8Pw4xz](https://explorer.solana.com/tx/VUqwdCKp4g6ZmGBn1UrMHspzrH1fGW1m9K7XpMPm9Lif2n54V82UJ5GQoQPPxm4RERCM23WKgi6xsrDJz8Pw4xz?cluster=devnet)

#### C04 — Crear hallazgo relacionado (`create-finding`)
- **Inicial:** Audit: siguiente=0, activos=0, abiertos=0; sin cuentas Finding; auditoría B: siguiente=0, activos=0, abiertos=0.
- **Operación y esperado:** Crear hallazgo 0 perteneciente a auditoría, abierto; contadores 1/1/1.
- **Observado:** Transacción finalized sin error; slot 525284975, comisión 5000 lamports.
- **Final:** Audit: siguiente=1, activos=1, abiertos=1; #0: open/high, sin acción; auditoría B: siguiente=0, activos=0, abiertos=0.
- **Firma/error:** [GDK7jeatTCWKUJMVX3GkivnTkRZncjCLSGaC9CFEy7b5SgcGHHSLyoL3eq7JaMY2xSKVE8x8eMDFSsWy8yCsTmm](https://explorer.solana.com/tx/GDK7jeatTCWKUJMVX3GkivnTkRZncjCLSGaC9CFEy7b5SgcGHHSLyoL3eq7JaMY2xSKVE8x8eMDFSsWy8yCsTmm?cluster=devnet)

#### C05 — Consultar hallazgos (`read-findings`)
- **Inicial:** Audit: siguiente=1, activos=1, abiertos=1; #0: open/high, sin acción; auditoría B: siguiente=0, activos=0, abiertos=0.
- **Operación y esperado:** Listar el hallazgo relacionado con gravedad alta.
- **Observado:** Lectura RPC decodificada y comprobada mediante los casos de uso/repositorios; cuenta y pertenencia correctas.
- **Final:** Audit: siguiente=1, activos=1, abiertos=1; #0: open/high, sin acción; auditoría B: siguiente=0, activos=0, abiertos=0.
- **Firma/error:** No aplica: lectura RPC, sin transacción.

#### C06 — Modificar hallazgo abierto (`update-open-finding`)
- **Inicial:** Audit: siguiente=1, activos=1, abiertos=1; #0: open/high, sin acción; auditoría B: siguiente=0, activos=0, abiertos=0.
- **Operación y esperado:** Modificar la misma PDA abierta; gravedad crítica y contadores conservados.
- **Observado:** Transacción finalized sin error; slot 525285006, comisión 5000 lamports.
- **Final:** Audit: siguiente=1, activos=1, abiertos=1; #0: open/critical, sin acción; auditoría B: siguiente=0, activos=0, abiertos=0.
- **Firma/error:** [57gpBWbcBt1y6nEjMNKUqDLgLX2aupXTbUkM5d6qGwua3bB697ieHQE9zSQmHfuTThxD2XeoKS4RDLp877pRkZLZ](https://explorer.solana.com/tx/57gpBWbcBt1y6nEjMNKUqDLgLX2aupXTbUkM5d6qGwua3bB697ieHQE9zSQmHfuTThxD2XeoKS4RDLp877pRkZLZ?cluster=devnet)
- **Incidencia:** consulta posterior interrumpida; se verificaron firma y estado ya confirmados, sin ejecutar otra modificación. El error original se conserva en reconciled y en el reporte del primer intento.

#### C07 — Wallet no autorizada: creación (`unauthorized-create`)
- **Inicial:** Audit: siguiente=1, activos=1, abiertos=1; #0: open/critical, sin acción; auditoría B: siguiente=0, activos=0, abiertos=0.
- **Operación y esperado:** Rechazo del programa 6000; todas las cuentas de negocio idénticas.
- **Observado:** Rechazo 6000 Unauthorized en el programa desplegado; cuentas de negocio intactas.
- **Final:** Audit: siguiente=1, activos=1, abiertos=1; #0: open/critical, sin acción; auditoría B: siguiente=0, activos=0, abiertos=0.
- **Firma/error:** Sin firma enviada: rechazo durante preflight de una transacción firmada. Error y logs auténticos en el JSON; sin enlace de transacción.

#### C08 — Wallet no autorizada: modificación (`unauthorized-update`)
- **Inicial:** Audit: siguiente=1, activos=1, abiertos=1; #0: open/critical, sin acción; auditoría B: siguiente=0, activos=0, abiertos=0.
- **Operación y esperado:** Rechazo del programa 6000; todas las cuentas de negocio idénticas.
- **Observado:** Rechazo 6000 Unauthorized en el programa desplegado; cuentas de negocio intactas.
- **Final:** Audit: siguiente=1, activos=1, abiertos=1; #0: open/critical, sin acción; auditoría B: siguiente=0, activos=0, abiertos=0.
- **Firma/error:** Sin firma enviada: rechazo durante preflight de una transacción firmada. Error y logs auténticos en el JSON; sin enlace de transacción.

#### C09 — Wallet no autorizada: resolución (`unauthorized-resolve`)
- **Inicial:** Audit: siguiente=1, activos=1, abiertos=1; #0: open/critical, sin acción; auditoría B: siguiente=0, activos=0, abiertos=0.
- **Operación y esperado:** Rechazo del programa 6000; todas las cuentas de negocio idénticas.
- **Observado:** Rechazo 6000 Unauthorized en el programa desplegado; cuentas de negocio intactas.
- **Final:** Audit: siguiente=1, activos=1, abiertos=1; #0: open/critical, sin acción; auditoría B: siguiente=0, activos=0, abiertos=0.
- **Firma/error:** Sin firma enviada: rechazo durante preflight de una transacción firmada. Error y logs auténticos en el JSON; sin enlace de transacción.

#### C10 — Wallet no autorizada: cierre (`unauthorized-close`)
- **Inicial:** Audit: siguiente=1, activos=1, abiertos=1; #0: open/critical, sin acción; auditoría B: siguiente=0, activos=0, abiertos=0.
- **Operación y esperado:** Rechazo del programa 6000; todas las cuentas de negocio idénticas.
- **Observado:** Rechazo 6000 Unauthorized en el programa desplegado; cuentas de negocio intactas.
- **Final:** Audit: siguiente=1, activos=1, abiertos=1; #0: open/critical, sin acción; auditoría B: siguiente=0, activos=0, abiertos=0.
- **Firma/error:** Sin firma enviada: rechazo durante preflight de una transacción firmada. Error y logs auténticos en el JSON; sin enlace de transacción.

#### C11 — Auditoría incorrecta: modificación (`wrong-audit-update`)
- **Inicial:** Audit: siguiente=1, activos=1, abiertos=1; #0: open/critical, sin acción; auditoría B: siguiente=0, activos=0, abiertos=0.
- **Operación y esperado:** Rechazo del programa 2006; todas las cuentas de negocio idénticas.
- **Observado:** Rechazo 2006 ConstraintSeeds en el programa desplegado; cuentas de negocio intactas.
- **Final:** Audit: siguiente=1, activos=1, abiertos=1; #0: open/critical, sin acción; auditoría B: siguiente=0, activos=0, abiertos=0.
- **Firma/error:** Sin firma enviada: rechazo durante preflight de una transacción firmada. Error y logs auténticos en el JSON; sin enlace de transacción.

#### C12 — Auditoría incorrecta: resolución (`wrong-audit-resolve`)
- **Inicial:** Audit: siguiente=1, activos=1, abiertos=1; #0: open/critical, sin acción; auditoría B: siguiente=0, activos=0, abiertos=0.
- **Operación y esperado:** Rechazo del programa 2006; todas las cuentas de negocio idénticas.
- **Observado:** Rechazo 2006 ConstraintSeeds en el programa desplegado; cuentas de negocio intactas.
- **Final:** Audit: siguiente=1, activos=1, abiertos=1; #0: open/critical, sin acción; auditoría B: siguiente=0, activos=0, abiertos=0.
- **Firma/error:** Sin firma enviada: rechazo durante preflight de una transacción firmada. Error y logs auténticos en el JSON; sin enlace de transacción.

#### C13 — Auditoría incorrecta: cierre (`wrong-audit-close`)
- **Inicial:** Audit: siguiente=1, activos=1, abiertos=1; #0: open/critical, sin acción; auditoría B: siguiente=0, activos=0, abiertos=0.
- **Operación y esperado:** Rechazo del programa 2006; todas las cuentas de negocio idénticas.
- **Observado:** Rechazo 2006 ConstraintSeeds en el programa desplegado; cuentas de negocio intactas.
- **Final:** Audit: siguiente=1, activos=1, abiertos=1; #0: open/critical, sin acción; auditoría B: siguiente=0, activos=0, abiertos=0.
- **Firma/error:** Sin firma enviada: rechazo durante preflight de una transacción firmada. Error y logs auténticos en el JSON; sin enlace de transacción.

#### C14 — Cerrar hallazgo abierto (`close-open-finding`)
- **Inicial:** Audit: siguiente=1, activos=1, abiertos=1; #0: open/critical, sin acción; auditoría B: siguiente=0, activos=0, abiertos=0.
- **Operación y esperado:** Rechazo del programa 6005; todas las cuentas de negocio idénticas.
- **Observado:** Rechazo 6005 FindingNotResolved en el programa desplegado; cuentas de negocio intactas.
- **Final:** Audit: siguiente=1, activos=1, abiertos=1; #0: open/critical, sin acción; auditoría B: siguiente=0, activos=0, abiertos=0.
- **Firma/error:** Sin firma enviada: rechazo durante preflight de una transacción firmada. Error y logs auténticos en el JSON; sin enlace de transacción.

#### C15 — Resolver sin acción correctiva (`resolve-empty-action`)
- **Inicial:** Audit: siguiente=1, activos=1, abiertos=1; #0: open/critical, sin acción; auditoría B: siguiente=0, activos=0, abiertos=0.
- **Operación y esperado:** Rechazo del programa 6004; todas las cuentas de negocio idénticas.
- **Observado:** Rechazo 6004 CorrectiveActionRequired en el programa desplegado; cuentas de negocio intactas.
- **Final:** Audit: siguiente=1, activos=1, abiertos=1; #0: open/critical, sin acción; auditoría B: siguiente=0, activos=0, abiertos=0.
- **Firma/error:** Sin firma enviada: rechazo durante preflight de una transacción firmada. Error y logs auténticos en el JSON; sin enlace de transacción.

#### C16 — Resolver con acción demasiado corta (`resolve-short-action`)
- **Inicial:** Audit: siguiente=1, activos=1, abiertos=1; #0: open/critical, sin acción; auditoría B: siguiente=0, activos=0, abiertos=0.
- **Operación y esperado:** Rechazo del programa 6004; todas las cuentas de negocio idénticas.
- **Observado:** Rechazo 6004 CorrectiveActionRequired en el programa desplegado; cuentas de negocio intactas.
- **Final:** Audit: siguiente=1, activos=1, abiertos=1; #0: open/critical, sin acción; auditoría B: siguiente=0, activos=0, abiertos=0.
- **Firma/error:** Sin firma enviada: rechazo durante preflight de una transacción firmada. Error y logs auténticos en el JSON; sin enlace de transacción.

#### C17 — Resolver con espacios y saltos de línea (`resolve-whitespace-action`)
- **Inicial:** Audit: siguiente=1, activos=1, abiertos=1; #0: open/critical, sin acción; auditoría B: siguiente=0, activos=0, abiertos=0.
- **Operación y esperado:** Rechazo del programa 6004; todas las cuentas de negocio idénticas.
- **Observado:** Rechazo 6004 CorrectiveActionRequired en el programa desplegado; cuentas de negocio intactas.
- **Final:** Audit: siguiente=1, activos=1, abiertos=1; #0: open/critical, sin acción; auditoría B: siguiente=0, activos=0, abiertos=0.
- **Firma/error:** Sin firma enviada: rechazo durante preflight de una transacción firmada. Error y logs auténticos en el JSON; sin enlace de transacción.

#### C18 — Resolver con más de 512 bytes (`resolve-oversized-action`)
- **Inicial:** Audit: siguiente=1, activos=1, abiertos=1; #0: open/critical, sin acción; auditoría B: siguiente=0, activos=0, abiertos=0.
- **Operación y esperado:** Rechazo del programa 6002; todas las cuentas de negocio idénticas.
- **Observado:** Rechazo 6002 InvalidText en el programa desplegado; cuentas de negocio intactas.
- **Final:** Audit: siguiente=1, activos=1, abiertos=1; #0: open/critical, sin acción; auditoría B: siguiente=0, activos=0, abiertos=0.
- **Firma/error:** Sin firma enviada: rechazo durante preflight de una transacción firmada. Error y logs auténticos en el JSON; sin enlace de transacción.

#### C19 — Modificar con título UTF-8 demasiado largo (`update-oversized-title`)
- **Inicial:** Audit: siguiente=1, activos=1, abiertos=1; #0: open/critical, sin acción; auditoría B: siguiente=0, activos=0, abiertos=0.
- **Operación y esperado:** Rechazo del programa 6002; todas las cuentas de negocio idénticas.
- **Observado:** Rechazo 6002 InvalidText en el programa desplegado; cuentas de negocio intactas.
- **Final:** Audit: siguiente=1, activos=1, abiertos=1; #0: open/critical, sin acción; auditoría B: siguiente=0, activos=0, abiertos=0.
- **Firma/error:** Sin firma enviada: rechazo durante preflight de una transacción firmada. Error y logs auténticos en el JSON; sin enlace de transacción.

#### C20 — Crear hallazgo con título vacío tras trim (`create-invalid-title`)
- **Inicial:** Audit: siguiente=1, activos=1, abiertos=1; #0: open/critical, sin acción; auditoría B: siguiente=0, activos=0, abiertos=0.
- **Operación y esperado:** Rechazo del programa 6002; todas las cuentas de negocio idénticas.
- **Observado:** Rechazo 6002 InvalidText en el programa desplegado; cuentas de negocio intactas.
- **Final:** Audit: siguiente=1, activos=1, abiertos=1; #0: open/critical, sin acción; auditoría B: siguiente=0, activos=0, abiertos=0.
- **Firma/error:** Sin firma enviada: rechazo durante preflight de una transacción firmada. Error y logs auténticos en el JSON; sin enlace de transacción.

#### C21 — Rollback de actualización seguida por resolución inválida (`atomic-rollback`)
- **Inicial:** Audit: siguiente=1, activos=1, abiertos=1; #0: open/critical, sin acción; auditoría B: siguiente=0, activos=0, abiertos=0.
- **Operación y esperado:** Rechazo del programa 6004; todas las cuentas de negocio idénticas.
- **Observado:** Rechazo 6004 CorrectiveActionRequired en el programa desplegado; cuentas de negocio intactas.
- **Final:** Audit: siguiente=1, activos=1, abiertos=1; #0: open/critical, sin acción; auditoría B: siguiente=0, activos=0, abiertos=0.
- **Firma/error:** Sin firma enviada: rechazo durante preflight de una transacción firmada. Error y logs auténticos en el JSON; sin enlace de transacción.

#### C22 — Resolver con acción válida (`resolve-valid-action`)
- **Inicial:** Audit: siguiente=1, activos=1, abiertos=1; #0: open/critical, sin acción; auditoría B: siguiente=0, activos=0, abiertos=0.
- **Operación y esperado:** Persistir acción correctiva válida; estado resolved y contadores 1/1/0.
- **Observado:** Transacción finalized sin error; slot 525286337, comisión 5000 lamports.
- **Final:** Audit: siguiente=1, activos=1, abiertos=0; #0: resolved/critical, acción='Corrección sintética aplicada y revisada'; auditoría B: siguiente=0, activos=0, abiertos=0.
- **Firma/error:** [2VRkLX7PBapVxGwCmTi4ffVV74krWe41EEWFPxDomACtHvP2kFiuFPi7vHFSj1VXB1vKkuWTsn8jAg72uZy3zWTC](https://explorer.solana.com/tx/2VRkLX7PBapVxGwCmTi4ffVV74krWe41EEWFPxDomACtHvP2kFiuFPi7vHFSj1VXB1vKkuWTsn8jAg72uZy3zWTC?cluster=devnet)

#### C23 — Modificar hallazgo resuelto (`update-resolved-finding`)
- **Inicial:** Audit: siguiente=1, activos=1, abiertos=0; #0: resolved/critical, acción='Corrección sintética aplicada y revisada'; auditoría B: siguiente=0, activos=0, abiertos=0.
- **Operación y esperado:** Rechazo del programa 6003; todas las cuentas de negocio idénticas.
- **Observado:** Rechazo 6003 InvalidTransition en el programa desplegado; cuentas de negocio intactas.
- **Final:** Audit: siguiente=1, activos=1, abiertos=0; #0: resolved/critical, acción='Corrección sintética aplicada y revisada'; auditoría B: siguiente=0, activos=0, abiertos=0.
- **Firma/error:** Sin firma enviada: rechazo durante preflight de una transacción firmada. Error y logs auténticos en el JSON; sin enlace de transacción.

#### C24 — Resolver por segunda vez (`resolve-resolved-finding`)
- **Inicial:** Audit: siguiente=1, activos=1, abiertos=0; #0: resolved/critical, acción='Corrección sintética aplicada y revisada'; auditoría B: siguiente=0, activos=0, abiertos=0.
- **Operación y esperado:** Rechazo del programa 6003; todas las cuentas de negocio idénticas.
- **Observado:** Rechazo 6003 InvalidTransition en el programa desplegado; cuentas de negocio intactas.
- **Final:** Audit: siguiente=1, activos=1, abiertos=0; #0: resolved/critical, acción='Corrección sintética aplicada y revisada'; auditoría B: siguiente=0, activos=0, abiertos=0.
- **Firma/error:** Sin firma enviada: rechazo durante preflight de una transacción firmada. Error y logs auténticos en el JSON; sin enlace de transacción.

#### C25 — Cerrar resuelto y devolver rent (`close-resolved-finding`)
- **Inicial:** Audit: siguiente=1, activos=1, abiertos=0; #0: resolved/critical, acción='Corrección sintética aplicada y revisada'; auditoría B: siguiente=0, activos=0, abiertos=0.
- **Operación y esperado:** Cerrar cuenta resuelta, devolver rent a autoridad y conservar nextId=1; activos=0/abiertos=0.
- **Observado:** Transacción finalized sin error; slot 525286368, comisión 5000 lamports.
- **Final:** Audit: siguiente=1, activos=0, abiertos=0; sin cuentas Finding; auditoría B: siguiente=0, activos=0, abiertos=0.
- **Firma/error:** [5zbJ1zrUhSRHqUMTRcPTZY33UjG9TWT8fxpAJ9UxXodrJt1TV4tPnTWmMv4EBSmVzJUqFh2bhpvDW2Qo1n3sDgEL](https://explorer.solana.com/tx/5zbJ1zrUhSRHqUMTRcPTZY33UjG9TWT8fxpAJ9UxXodrJt1TV4tPnTWmMv4EBSmVzJUqFh2bhpvDW2Qo1n3sDgEL?cluster=devnet)
- **Reembolso comprobado:** 6664960 lamports a la autoridad; diferencia neta de saldo igual al reembolso menos la comisión. Cuenta cerrada ausente; nextFindingId conservado.

#### C26 — Intentar reutilizar el ID cerrado (`reuse-closed-id`)
- **Inicial:** Audit: siguiente=1, activos=0, abiertos=0; sin cuentas Finding; auditoría B: siguiente=0, activos=0, abiertos=0.
- **Operación y esperado:** Rechazo del programa 6008; todas las cuentas de negocio idénticas.
- **Observado:** Rechazo 6008 UnexpectedFindingId en el programa desplegado; cuentas de negocio intactas.
- **Final:** Audit: siguiente=1, activos=0, abiertos=0; sin cuentas Finding; auditoría B: siguiente=0, activos=0, abiertos=0.
- **Firma/error:** Sin firma enviada: rechazo durante preflight de una transacción firmada. Error y logs auténticos en el JSON; sin enlace de transacción.

#### C27 — Crear siguiente ID monotónico (`create-next-finding`)
- **Inicial:** Audit: siguiente=1, activos=0, abiertos=0; sin cuentas Finding; auditoría B: siguiente=0, activos=0, abiertos=0.
- **Operación y esperado:** Crear ID 1/PDA diferente; no reutilizar 0; contadores 2/1/1.
- **Observado:** Transacción finalized sin error; slot 525286391, comisión 5000 lamports.
- **Final:** Audit: siguiente=2, activos=1, abiertos=1; #1: open/low, sin acción; auditoría B: siguiente=0, activos=0, abiertos=0.
- **Firma/error:** [3NUSLTr6oxyMXd3m78D1YfsU1sC9yYJB9Kr1Auzr7d3KSJfHEGhYVKWT72L3VLMSAsKXRuMjQzhSuYndxdUhZL32](https://explorer.solana.com/tx/3NUSLTr6oxyMXd3m78D1YfsU1sC9yYJB9Kr1Auzr7d3KSJfHEGhYVKWT72L3VLMSAsKXRuMjQzhSuYndxdUhZL32?cluster=devnet)

#### C28 — Consultar estado final y referencias (`read-final-state`)
- **Inicial:** Audit: siguiente=2, activos=1, abiertos=1; #1: open/low, sin acción; auditoría B: siguiente=0, activos=0, abiertos=0.
- **Operación y esperado:** Listado contiene solo ID 1; auditoría conserva secuencia y contadores correctos.
- **Observado:** Lectura RPC decodificada y comprobada mediante los casos de uso/repositorios; cuenta y pertenencia correctas.
- **Final:** Audit: siguiente=2, activos=1, abiertos=1; #1: open/low, sin acción; auditoría B: siguiente=0, activos=0, abiertos=0.
- **Firma/error:** No aplica: lectura RPC, sin transacción.

### Recorrido UI de producción sobre Devnet

[Reporte UI](evidence/4.2-ui-flow.json), [resultado Playwright](evidence/4.2-ui-browser.json), [log](evidence/4.2-ui.log), [decodificación/PDAs/contadores](evidence/4.2-ui-state-checks.json). Prueba única con 8 etapas aprobadas, sin omisiones/flaky/retries. Capturas reales, revisadas: [escritorio](evidence/4.2-ui-devnet-desktop.png), [móvil 390×844](evidence/4.2-ui-devnet-mobile.png), [error Rust 6003](evidence/4.2-ui-program-error.png). La captura móvil no presenta desbordamiento horizontal.

Auditoría UI: `6JabCgwqAsMU1JpmyvydWSkaSM8SvhJRGWyeJR3Kkmrr`, ID 202611220424. Se conectó el proveedor de pruebas, se revisaron formularios antes de firmar y se verificaron confirmación, actualización, gravedad/estado y cierre explícito. Las capturas muestran la wallet de pruebas; no se atribuyen a una extensión de terceros.

#### UI1 — `ui-create-audit`
- **Inicial:** Audit inexistente; sin cuentas Finding.
- **Operación y esperado:** Revisar, firmar y confirmar auditoría; detalle y contadores iniciales cero.
- **Observado:** etapa aprobada; UI y estado RPC decodificado concordantes.
- **Final:** Audit: siguiente=0, activos=0, abiertos=0; sin cuentas Finding.
- **Firma/error:** [ppCW7LZD8u5Pa8wuvDtqLruHtycQwLS8ndnT1yLGEXX3RuurjkxRpgBkoEBRBMGTnAS4JWbftrPP9LG1bpghZTK](https://explorer.solana.com/tx/ppCW7LZD8u5Pa8wuvDtqLruHtycQwLS8ndnT1yLGEXX3RuurjkxRpgBkoEBRBMGTnAS4JWbftrPP9LG1bpghZTK?cluster=devnet)

#### UI2 — `ui-create-finding`
- **Inicial:** Audit: siguiente=0, activos=0, abiertos=0; sin cuentas Finding.
- **Operación y esperado:** Crear ID 0, gravedad alta y contadores activos/abiertos/next=1/1/1.
- **Observado:** etapa aprobada; UI y estado RPC decodificado concordantes.
- **Final:** Audit: siguiente=1, activos=1, abiertos=1; #0: open/high, sin acción.
- **Firma/error:** [4uX7JiFaAJD7Bo7uw1vg9FEWfckEQGPLXKepdMAnw7vzCGgLN5vzLtSkAUFyHbfjx9iHH41JsQtpUAs5Q8s3XyuC](https://explorer.solana.com/tx/4uX7JiFaAJD7Bo7uw1vg9FEWfckEQGPLXKepdMAnw7vzCGgLN5vzLtSkAUFyHbfjx9iHH41JsQtpUAs5Q8s3XyuC?cluster=devnet)

#### UI3 — `ui-update-open`
- **Inicial:** Audit: siguiente=1, activos=1, abiertos=1; #0: open/high, sin acción.
- **Operación y esperado:** Modificar la misma PDA abierta y mostrar gravedad crítica.
- **Observado:** etapa aprobada; UI y estado RPC decodificado concordantes.
- **Final:** Audit: siguiente=1, activos=1, abiertos=1; #0: open/critical, sin acción.
- **Firma/error:** [Nn6zgHawmt86ir3QqT56bhMEjLAKMXAZVwAB23taUsZheSgmgbRp9QjQN79oFj8Gpbgee2Zn4cm5nHAfcsABXb4](https://explorer.solana.com/tx/Nn6zgHawmt86ir3QqT56bhMEjLAKMXAZVwAB23taUsZheSgmgbRp9QjQN79oFj8Gpbgee2Zn4cm5nHAfcsABXb4?cluster=devnet)

#### UI4 — `ui-resolve`
- **Inicial:** Audit: siguiente=1, activos=1, abiertos=1; #0: open/critical, sin acción.
- **Operación y esperado:** Resolver con acción correctiva y reflejar 1/0/1.
- **Observado:** etapa aprobada; UI y estado RPC decodificado concordantes.
- **Final:** Audit: siguiente=1, activos=1, abiertos=0; #0: resolved/critical, acción='Corrección UI Devnet aplicada y verificada'.
- **Firma/error:** [5aeHhmPMgRhRVcDgu8ej8Pxw4hiHodH8nirzfoatpHKM3SZu3HY9uTJScF3jnDT8hUmUDSquXtd7pjZhAiLnKvQR](https://explorer.solana.com/tx/5aeHhmPMgRhRVcDgu8ej8Pxw4hiHodH8nirzfoatpHKM3SZu3HY9uTJScF3jnDT8hUmUDSquXtd7pjZhAiLnKvQR?cluster=devnet)

#### UI5 — `ui-close-resolved`
- **Inicial:** Audit: siguiente=1, activos=1, abiertos=0; #0: resolved/critical, acción='Corrección UI Devnet aplicada y verificada'.
- **Operación y esperado:** Confirmar cierre explícito, cuenta ausente y contadores 0/0/1.
- **Observado:** etapa aprobada; UI y estado RPC decodificado concordantes.
- **Final:** Audit: siguiente=1, activos=0, abiertos=0; sin cuentas Finding.
- **Firma/error:** [23k7awEA9Gx29g69XHmHsdxBmpivakzmTeRuS9G3QxuV31Ae9WNZEaxdEUi4BB2ew83k17TUFbo6w3TQtiYKcWUb](https://explorer.solana.com/tx/23k7awEA9Gx29g69XHmHsdxBmpivakzmTeRuS9G3QxuV31Ae9WNZEaxdEUi4BB2ew83k17TUFbo6w3TQtiYKcWUb?cluster=devnet)

#### UI6 — `ui-monotonic-id`
- **Inicial:** Audit: siguiente=1, activos=0, abiertos=0; sin cuentas Finding.
- **Operación y esperado:** Nuevo hallazgo ID 1; no reutilizar 0, contadores 1/1/2.
- **Observado:** etapa aprobada; UI y estado RPC decodificado concordantes.
- **Final:** Audit: siguiente=2, activos=1, abiertos=1; #1: open/low, sin acción.
- **Firma/error:** [5HHbKFvbgAeSyVeFNYtsW3KzKNvrUb1UfJXdFwtBEeLFGQ5s3LfNt8GDEYDHFE7F2iEZ7wojogwFLTaDVHw1eUCq](https://explorer.solana.com/tx/5HHbKFvbgAeSyVeFNYtsW3KzKNvrUb1UfJXdFwtBEeLFGQ5s3LfNt8GDEYDHFE7F2iEZ7wojogwFLTaDVHw1eUCq?cluster=devnet)

#### UI7 — `ui-program-error`
- **Inicial:** Audit: siguiente=2, activos=1, abiertos=0; #1: resolved/low, acción='Resolución concurrente sintética Devnet UI'.
- **Operación y esperado:** Mostrar error Rust 6003 por edición obsoleta; cuentas sin cambios.
- **Observado:** etapa aprobada; UI y estado RPC decodificado concordantes.
- **Final:** Audit: siguiente=2, activos=1, abiertos=0; #1: resolved/low, acción='Resolución concurrente sintética Devnet UI'.
- **Firma/error:** Error real 6003 InvalidTransition, sin firma enviada. Logs del RPC y captura disponibles; datos de negocio idénticos antes/después.

#### UI8 — `ui-close-second`
- **Inicial:** Audit: siguiente=2, activos=1, abiertos=0; #1: resolved/low, acción='Resolución concurrente sintética Devnet UI'.
- **Operación y esperado:** Cerrar el segundo resuelto, devolver rent y conservar siguiente ID 2.
- **Observado:** etapa aprobada; UI y estado RPC decodificado concordantes.
- **Final:** Audit: siguiente=2, activos=0, abiertos=0; sin cuentas Finding.
- **Firma/error:** [vMUiQrfV3HAZmrxffBr3zVwsNp8BLBi8n6DCR59H3gUAnsmWUtXAGdrwbkEVpUsszWJnhJyWtqn7zGMkQDt1jhT](https://explorer.solana.com/tx/vMUiQrfV3HAZmrxffBr3zVwsNp8BLBi8n6DCR59H3gUAnsmWUtXAGdrwbkEVpUsszWJnhJyWtqn7zGMkQDt1jhT?cluster=devnet)

La preparación de UI7 resolvió el hallazgo 1 mediante otra transacción de la misma autoridad, después de que la UI preparara una modificación de abierto. [Resolución concurrente](https://explorer.solana.com/tx/QSQzwiXv5f3F4zznZvu7BEwRnkwdBrRgMS9kqjnF1YFf9XgxwnmvTPax1kihAvwFcXjDKQJHBQQDV53TmCDA4Gn?cluster=devnet). La edición obsoleta alcanzó Rust y se rechazó con 6003; la UI mostró el error. Después se refrescaron datos y cerró el resuelto. Estado final UI: siguiente 2, activos 0, abiertos 0; ambas cuentas Finding cerradas.

### Firmas y estado definitivo

Las **16 transacciones válidas** (7 operaciones del cliente, 7 de UI, 1 resolución concurrente y 1 fondeo) se consultaron mediante getTransaction y getSignatureStatuses: **todas finalized, meta.err/err null**. [Verificación final directa de Devnet](evidence/4.2-final-ledger-check.json). Los 18 rechazos directos más el rechazo UI son simulaciones previas reales con logs del programa; no tienen firma consultable y no se les inventó una.

| Slot | Firma real / Explorer Devnet | Comisión (lamports) |
| --- | --- | --- |
| 525284879 | [2f3zg8Kz7D8pHDEK2deftiZfJinbkzbUcQED2uSCsG97aYeYtK1iXLyvSSdiW2GPi8zxAEk9uXyh2Pfnu55ypf6z](https://explorer.solana.com/tx/2f3zg8Kz7D8pHDEK2deftiZfJinbkzbUcQED2uSCsG97aYeYtK1iXLyvSSdiW2GPi8zxAEk9uXyh2Pfnu55ypf6z?cluster=devnet) | 5000 |
| 525284903 | [5jndZYRjQf5pPTWyvGtHfoteXxUTBiUtvAHNyJBPJdKrm1m65Mz8ZHfwgSHU7UNRb7E94VKeYvjMWpqwfJpkCnCf](https://explorer.solana.com/tx/5jndZYRjQf5pPTWyvGtHfoteXxUTBiUtvAHNyJBPJdKrm1m65Mz8ZHfwgSHU7UNRb7E94VKeYvjMWpqwfJpkCnCf?cluster=devnet) | 5000 |
| 525284957 | [VUqwdCKp4g6ZmGBn1UrMHspzrH1fGW1m9K7XpMPm9Lif2n54V82UJ5GQoQPPxm4RERCM23WKgi6xsrDJz8Pw4xz](https://explorer.solana.com/tx/VUqwdCKp4g6ZmGBn1UrMHspzrH1fGW1m9K7XpMPm9Lif2n54V82UJ5GQoQPPxm4RERCM23WKgi6xsrDJz8Pw4xz?cluster=devnet) | 5000 |
| 525284975 | [GDK7jeatTCWKUJMVX3GkivnTkRZncjCLSGaC9CFEy7b5SgcGHHSLyoL3eq7JaMY2xSKVE8x8eMDFSsWy8yCsTmm](https://explorer.solana.com/tx/GDK7jeatTCWKUJMVX3GkivnTkRZncjCLSGaC9CFEy7b5SgcGHHSLyoL3eq7JaMY2xSKVE8x8eMDFSsWy8yCsTmm?cluster=devnet) | 5000 |
| 525285006 | [57gpBWbcBt1y6nEjMNKUqDLgLX2aupXTbUkM5d6qGwua3bB697ieHQE9zSQmHfuTThxD2XeoKS4RDLp877pRkZLZ](https://explorer.solana.com/tx/57gpBWbcBt1y6nEjMNKUqDLgLX2aupXTbUkM5d6qGwua3bB697ieHQE9zSQmHfuTThxD2XeoKS4RDLp877pRkZLZ?cluster=devnet) | 5000 |
| 525286337 | [2VRkLX7PBapVxGwCmTi4ffVV74krWe41EEWFPxDomACtHvP2kFiuFPi7vHFSj1VXB1vKkuWTsn8jAg72uZy3zWTC](https://explorer.solana.com/tx/2VRkLX7PBapVxGwCmTi4ffVV74krWe41EEWFPxDomACtHvP2kFiuFPi7vHFSj1VXB1vKkuWTsn8jAg72uZy3zWTC?cluster=devnet) | 5000 |
| 525286368 | [5zbJ1zrUhSRHqUMTRcPTZY33UjG9TWT8fxpAJ9UxXodrJt1TV4tPnTWmMv4EBSmVzJUqFh2bhpvDW2Qo1n3sDgEL](https://explorer.solana.com/tx/5zbJ1zrUhSRHqUMTRcPTZY33UjG9TWT8fxpAJ9UxXodrJt1TV4tPnTWmMv4EBSmVzJUqFh2bhpvDW2Qo1n3sDgEL?cluster=devnet) | 5000 |
| 525286391 | [3NUSLTr6oxyMXd3m78D1YfsU1sC9yYJB9Kr1Auzr7d3KSJfHEGhYVKWT72L3VLMSAsKXRuMjQzhSuYndxdUhZL32](https://explorer.solana.com/tx/3NUSLTr6oxyMXd3m78D1YfsU1sC9yYJB9Kr1Auzr7d3KSJfHEGhYVKWT72L3VLMSAsKXRuMjQzhSuYndxdUhZL32?cluster=devnet) | 5000 |
| 525286876 | [ppCW7LZD8u5Pa8wuvDtqLruHtycQwLS8ndnT1yLGEXX3RuurjkxRpgBkoEBRBMGTnAS4JWbftrPP9LG1bpghZTK](https://explorer.solana.com/tx/ppCW7LZD8u5Pa8wuvDtqLruHtycQwLS8ndnT1yLGEXX3RuurjkxRpgBkoEBRBMGTnAS4JWbftrPP9LG1bpghZTK?cluster=devnet) | 5000 |
| 525286900 | [4uX7JiFaAJD7Bo7uw1vg9FEWfckEQGPLXKepdMAnw7vzCGgLN5vzLtSkAUFyHbfjx9iHH41JsQtpUAs5Q8s3XyuC](https://explorer.solana.com/tx/4uX7JiFaAJD7Bo7uw1vg9FEWfckEQGPLXKepdMAnw7vzCGgLN5vzLtSkAUFyHbfjx9iHH41JsQtpUAs5Q8s3XyuC?cluster=devnet) | 5000 |
| 525286932 | [Nn6zgHawmt86ir3QqT56bhMEjLAKMXAZVwAB23taUsZheSgmgbRp9QjQN79oFj8Gpbgee2Zn4cm5nHAfcsABXb4](https://explorer.solana.com/tx/Nn6zgHawmt86ir3QqT56bhMEjLAKMXAZVwAB23taUsZheSgmgbRp9QjQN79oFj8Gpbgee2Zn4cm5nHAfcsABXb4?cluster=devnet) | 5000 |
| 525286964 | [5aeHhmPMgRhRVcDgu8ej8Pxw4hiHodH8nirzfoatpHKM3SZu3HY9uTJScF3jnDT8hUmUDSquXtd7pjZhAiLnKvQR](https://explorer.solana.com/tx/5aeHhmPMgRhRVcDgu8ej8Pxw4hiHodH8nirzfoatpHKM3SZu3HY9uTJScF3jnDT8hUmUDSquXtd7pjZhAiLnKvQR?cluster=devnet) | 5000 |
| 525287004 | [23k7awEA9Gx29g69XHmHsdxBmpivakzmTeRuS9G3QxuV31Ae9WNZEaxdEUi4BB2ew83k17TUFbo6w3TQtiYKcWUb](https://explorer.solana.com/tx/23k7awEA9Gx29g69XHmHsdxBmpivakzmTeRuS9G3QxuV31Ae9WNZEaxdEUi4BB2ew83k17TUFbo6w3TQtiYKcWUb?cluster=devnet) | 5000 |
| 525287019 | [5HHbKFvbgAeSyVeFNYtsW3KzKNvrUb1UfJXdFwtBEeLFGQ5s3LfNt8GDEYDHFE7F2iEZ7wojogwFLTaDVHw1eUCq](https://explorer.solana.com/tx/5HHbKFvbgAeSyVeFNYtsW3KzKNvrUb1UfJXdFwtBEeLFGQ5s3LfNt8GDEYDHFE7F2iEZ7wojogwFLTaDVHw1eUCq?cluster=devnet) | 5000 |
| 525287108 | [vMUiQrfV3HAZmrxffBr3zVwsNp8BLBi8n6DCR59H3gUAnsmWUtXAGdrwbkEVpUsszWJnhJyWtqn7zGMkQDt1jhT](https://explorer.solana.com/tx/vMUiQrfV3HAZmrxffBr3zVwsNp8BLBi8n6DCR59H3gUAnsmWUtXAGdrwbkEVpUsszWJnhJyWtqn7zGMkQDt1jhT?cluster=devnet) | 5000 |
| 525287060 | [QSQzwiXv5f3F4zznZvu7BEwRnkwdBrRgMS9kqjnF1YFf9XgxwnmvTPax1kihAvwFcXjDKQJHBQQDV53TmCDA4Gn](https://explorer.solana.com/tx/QSQzwiXv5f3F4zznZvu7BEwRnkwdBrRgMS9kqjnF1YFf9XgxwnmvTPax1kihAvwFcXjDKQJHBQQDV53TmCDA4Gn?cluster=devnet) | 5000 |

### Instalación, comandos y resultados

| Comando / comprobación | Resultado ejecutado |
| --- | --- |
| npm run verify | Código 0; 118 pruebas: 3 scaffold/arquitectura, 75 Application, 16 infraestructura y 24 Rust host; formato/tipos/build aprobados. |
| node scripts/check-devnet-acceptance.mjs | Compilación estricta final, código 0. Primera compilación: error de nulabilidad corregido sin suprimir tipos; log conservado. |
| node scripts/check-devnet-acceptance.mjs --execute | Primera ejecución: código 1 por lectura RPC posterior a actualización ya confirmada. Reporte/log originales conservados. |
| node scripts/check-devnet-acceptance.mjs --execute --resume | Código 0; reconciliación sin reenvío de la operación confirmada, omisión de casos ya aprobados y finalización de los 28 casos. Reintentos acotados solo para lecturas de evidencia. |
| node scripts/check-devnet-ui.mjs | Código 0 en comprobación final de tipos. Primer intento tuvo dos imports sin uso, corregidos sin relajar strict. |
| node scripts/check-devnet-ui.mjs --execute | Código 0; 1/1 Playwright, 8 etapas, sin retries/flaky/omisiones; build de producción local y RPC Devnet real. |
| npm run check:idl | Código 0; IDL/tipos concordantes con Rust. |
| npm ci --ignore-scripts --no-fund, en carpeta temporal con manifiestos/lockfile | Código 0; instalación aislada de dependencias, cero vulnerabilidades conocidas en su auditoría npm. |
| npm ci --ignore-scripts --no-fund; npm run typecheck; npm run build, en copia temporal del frontend y manifiestos | Todos código 0; instalación/tipos/build limpios desde fuentes/lockfile, sin copiar node_modules, dist o .env.local. Configuración Devnet pública por variables de proceso. Temporal eliminado. |
| Decodificación independiente de snapshots UI con AccountReader/mappers productivos | Código 0; 8 etapas, PDAs/owner/bumps/contadores/estados verificados sin nueva transacción. |
| getTransaction/getSignatureStatuses y lectura de ProgramData | Código 0; 16 firmas finalized sin error; hash remoto idéntico al ELF. Hubo 429/reintentos de lectura registrados. |
| node --check de ambos runners nuevos | Código 0. |

Se añadieron npm run test:devnet y npm run test:devnet-ui como accesos a los runners; sin -- --execute solo compilan/comprueban tipos. Las ejecuciones reales anteriores usaron sus rutas node equivalentes. No se incluyeron operaciones Devnet en verify. Los reportes existentes bloquean nuevas ejecuciones; revisar firmas y estado antes de reanudar. Sin reproducción automática de escrituras inciertas.

Logs: [regresión](evidence/4.2-verify.log), [tipos iniciales](evidence/4.2-acceptance-typecheck-initial.log), [tipos finales](evidence/4.2-acceptance-typecheck.log), [interrupción original](evidence/4.2-interrupted-attempt.log), [snapshot del intento interrumpido](evidence/4.2-interrupted-attempt.json), [reanudación](evidence/4.2-devnet-resume.log), [UI tipos iniciales](evidence/4.2-ui-typecheck-initial.log), [UI tipos finales](evidence/4.2-ui-typecheck.log), [IDL](evidence/4.2-idl-check.log), [dependencias limpias](evidence/4.2-clean-install.log), [frontend limpio](evidence/4.2-clean-frontend.log), [lecturas finales](evidence/4.2-final-ledger-check.log).

### Fondos y alcance

- Disminución de saldo de la wallet principal: **41347440 lamports (0,04134744 SOL Devnet)**.
- De ese importe, **30.000.000 lamports (0,03 SOL)** permanecen en la wallet secundaria del proyecto, con keypair externo conservado; son un traslado de fondos de prueba, no una comisión consumida.
- Disminución conjunta de ambas wallets: **11347440 lamports (0,01134744 SOL)**, por rent persistente y comisiones. Comisiones verificadas de las 16 transacciones: **80000 lamports**. Los rechazos previos no pagaron comisión on-chain.
- La reserva operativa de 0,1 SOL no se excedió. Los cierres devolvieron rent a la autoridad. Permanecen tres auditorías sintéticas de esta fase y el hallazgo 1 abierto de la auditoría A; en UI ambos hallazgos se cerraron. No se añadió cierre de auditorías.

### Pendientes de aceptación manual y entrega

1. Recorrido **humano con una extensión real** en Devnet: conexión/desconexión, revisión de ventana de firma, aceptación/rechazo y cambio de cuenta. La automatización Wallet Standard acredita UI/cliente/programa reales, pero no sustituye esa observación.
2. Reproducir desde un repositorio Git entregable cuando se inicialice/prepare esa entrega. Aquí sí se ejecutaron instalación/tipos/build del frontend en una copia temporal limpia; no se afirma clon Git ni nueva compilación SBF desde cero en este submódulo.
3. Cerrar README/entrega/certificado y revisión final de WayLearn bajo el submódulo que autorice el usuario. No se publicaron frontend, datos personales o secretos.

No se ejecutaron Mainnet, despliegue nuevo, push, cambios globales o funcionalidades futuras. Rust, Domain/Application, adaptadores y componentes productivos se conservaron; se incorporaron comprobadores de aceptación y documentación. Las incidencias superadas no se ocultan y las tareas manuales/entrega no se marcan aprobadas.


## Submódulo 5.1 — Revisión interna de seguridad y arquitectura

Fecha local: 22 de noviembre de 2026; ejecución UTC del 23. Informe con clasificación, evidencia por área y limitaciones: [SECURITY_REVIEW.md](SECURITY_REVIEW.md). No es una auditoría profesional. Sin críticos/altos identificados; dos riesgos medios y tres bajos, uno bajo corregido. No hubo cambios Rust/IDL/frontend productivo ni despliegues.

### Comandos ejecutados y resultados

| Comando / comprobación | Resultado observado | Evidencia |
| --- | --- | --- |
| `npm run verify` inicial | Código 0; 118 pruebas antes de añadir la nueva regresión; arquitectura, TypeScript, Vite, formato/check/tests Rust host aprobados. | [5.1-verify.log](evidence/5.1-verify.log) |
| `npm run verify` final | Código 0; **119 pruebas**: 4 scaffold, 75 Application, 16 Infrastructure y 24 Rust host; sin fallos. Incluye control nuevo de SDKs desde Presentation, strict TypeScript, Vite y Cargo locked. | [5.1-verify-final.log](evidence/5.1-verify-final.log) |
| `KHIPUTRACE_EVIDENCE_PREFIX=5.1 npm run test:program` | Código 0; compilación SBF y **17/17 casos** LiteSVM, **95 transacciones locales: 50 exitosas y 45 rechazadas** con comprobaciones de estado. | [build](evidence/5.1-build.log), [pruebas](evidence/5.1-tests.log), [transacciones](evidence/5.1-sbf-transactions.json) |
| `npm run check:idl` | Código 0; IDL y tipos coinciden con generación desde Rust, sin Anchor CLI ni despliegue. | [5.1-idl.log](evidence/5.1-idl.log) |
| `KHIPUTRACE_EVIDENCE_PREFIX=5.1-base npm run test:visual` | Código 0; **11/11**, sin omitidas, reintentos ni flaky. Wallet y RPC controlados, sin extensión real. | [log](evidence/5.1-base-run.log), [reporte](evidence/5.1-base-browser.json) |
| `KHIPUTRACE_EVIDENCE_PREFIX=5.1-audits npm run test:audits` | Código 0; **10/10**, sin omitidas ni flaky. Componentes y flujo local SBF/RPC mínimo. | [log](evidence/5.1-audits-run.log), [reporte](evidence/5.1-audits-browser.json), [cuentas/flujo](evidence/5.1-audits-sbf-flow.json) |
| `KHIPUTRACE_EVIDENCE_PREFIX=5.1-findings npm run test:findings` | Código 0; **9/9**, sin omitidas ni flaky. Incluye ciclo completo, ID obsoleto, modificación tras resolver y cierre abierto rechazados por Rust, conservación de estado, estados pending/unknown y desconexión. | [log](evidence/5.1-findings-run.log), [reporte](evidence/5.1-findings-browser.json), [cuentas/flujo](evidence/5.1-findings-sbf-flow.json) |
| `npm run test:devnet` y `npm run test:devnet-ui`, **sin --execute** | Ambos código 0; solo compilación/typecheck de arneses, no ejecuciones Devnet. | [directo](evidence/5.1-devnet-types.log), [UI](evidence/5.1-devnet-ui-types.log) |
| `npm run check:dependencies` | Código 0; npm audit: **0 vulnerabilidades conocidas**. | [5.1-npm-audit.log](evidence/5.1-npm-audit.log) |
| Consulta HTTPS `api.osv.dev/v1/querybatch`, ecosystem crates.io, versiones exactas de Cargo.lock | 158 entradas registry consultadas; 2 coincidencias brutas. Bincode: sin mantenimiento, pendiente bajo. Borsh 0.10.4: falso positivo contrastado con rango corregido de RustSec; no se declara scan limpio sin explicar los avisos. No se ejecutó cargo audit. | [resultado](evidence/5.1-rust-osv.json), [avisos](evidence/5.1-rust-advisories.json) |
| `cargo tree --locked -i bincode@1.3.3` y `cargo tree --locked -i borsh@0.10.4` | Código 0; dependencias transitivas verificadas sin cambiar lockfile. | [bincode](evidence/5.1-bincode-tree.log), [borsh](evidence/5.1-borsh-tree.log) |
| `python3 docs/evidence/5.1-review-check.py` | Código 0; patrones acotados de secretos sin candidatos; 88 evidencias históricas conservadas; ELF local igual al de 4.2. RPC Devnet finalized: genesis, owner/executable, vínculo ProgramData, autoridad y bytes ELF correctos. **Cero escrituras**. | [script reproducible](evidence/5.1-review-check.py), [resultado](evidence/5.1-review-check.json) |
| `stat -c '%a %n'` sobre directorio y keypairs externos | Directorio 700, cuatro keypairs 600. Solo metadatos; no se leyeron secretos para esta revisión. | [5.1-key-permissions.log](evidence/5.1-key-permissions.log) |
| `git rev-parse --is-inside-work-tree` | **Código 128**, no hay repositorio ni historial revisable. Pendiente bajo R-05. | [5.1-git-check.log](evidence/5.1-git-check.log) |

### Cobertura de seguridad y conservación de evidencia

Las 17 pruebas SBF reejecutadas comprueban ciclo de vida, refund, IDs no reutilizados, autoridad ajena, firma ausente, asociación incorrecta, seeds/owner/bump/version, campos UTF-8 y enums, modificaciones/resoluciones de resuelto, acción correctiva inválida, cierre de abierto, overflow/underflow y rollback de instrucciones posteriores, incluido cierre físico. Los fixtures corruptos de contadores/bump/version prueban defensas y se identifican como estado inyectado localmente; no se presentan como ataques que puedan crear arbitrariamente cuentas propiedad del programa en Devnet.

La brecha R-03 quedó reproducida antes del cambio en [5.1-architecture-gap-before.log](evidence/5.1-architecture-gap-before.log). La nueva prueba recorre 20 combinaciones de SDK/importación, más React e Infrastructure válidos. El verificador rechaza también export, import dinámico, require y tipo importado; no modifica el dominio ni adapta la UI a SDKs.

Los prefijos 5.1 evitan sobrescribir reportes y capturas anteriores. Se guardan capturas reales nuevas, generadas por los tests, con nombres 5.1-base, 5.1-audits y 5.1-findings; no se afirma inspección visual manual adicional. La comparación de hashes comprueba 88 archivos de evidencia cubiertos por los manifiestos finales 4.1/4.2. El incidente histórico de capturas 3.3 permanece documentado en 4.1 y no se declara recuperado.

### Fallos, avisos y pendientes

Ninguna prueba automatizada de 5.1 falló. El resultado Git 128 es una limitación real, no un check aprobado. El aviso SBF sobre syscalls desconocidas persiste por la tabla vacía del SDK local; se conserva íntegro en el log. El ELF fue ejecutado en LiteSVM y sus bytes coinciden con Devnet en esta revisión. Los avisos NO_COLOR/FORCE_COLOR del navegador no impidieron las pruebas. Una consulta exploratoria al raw de Borsh en GitHub devolvió 404; el contraste utilizó el aviso primario RustSec y la fuente 0.10.4 instalada, sin afirmar que aquella URL se hubiese obtenido.

Pendientes: recorrido humano con extensión real; concurrencia/consenso con validador completo; revisión independiente/fuzzing/verificación formal no ejecutados; riesgo de upgrade authority única y dependencia bincode sin mantenimiento; Git/entrega aún sin preparar. No se instalaron herramientas, cambiaron versiones/configuración global ni se usó Mainnet. Ninguna firma nueva se atribuye a Devnet: las transacciones 5.1 son locales; Devnet solo se consultó.

## Submódulo 5.2 — Verificación de documentación final

Fecha: 23 de noviembre de 2026 UTC. Alcance exclusivamente documental y de solo lectura; no se ejecutaron despliegues, firmas ni escrituras.

| Comprobación | Resultado observado |
|---|---|
| `npm run verify` | Código 0; 4 pruebas scaffold, 75 Application, 16 Infrastructure y 24 Rust host aprobadas; typecheck y build aprobados. |
| `npm run check:idl` | Código 0; Rust, IDL JSON y tipos TypeScript comprobados sin despliegue. |
| Consulta RPC `getGenesisHash` | Código 0; resultado `EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG`, cohérente con Devnet. |
| Fuentes WayLearn oficiales | Páginas de proyecto final/certificado y pruebas/evidencias consultadas; requisitos registrados sin supuestos posteriores. |
| Git | No existe repositorio; no se inició, comprometió ni publicó. |

Se creó documentación de cumplimiento y demostración; no se declaró como probado el recorrido humano ni el envío oficial. Las transacciones y capturas Devnet conservadas pertenecen a 4.1/4.2 y se mantienen identificadas como tales.

## Diagnóstico de red Devnet/Solflare

Fecha: 23 de noviembre de 2026 UTC. Alcance: diagnóstico de configuración y construcción de transacción; sin firma, envío, despliegue ni cambio de código.

### Evidencia de ejecución

| Comprobación | Resultado observado |
|---|---|
| Variables de entorno reales | Cluster Devnet; RPC oficial; Program ID `GV8SZn6i29tL4CmJMei5P3N3BLUxVZBWrG6hFQVSVSBv`. |
| Servidor Vite activo | Sirve `VITE_KHIPUTRACE_CLUSTER=devnet`, RPC oficial y Program ID esperado. |
| `getGenesisHash` RPC oficial | `EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG`. |
| Bloque reciente obtenido para construcción aislada | Blockhash `9f2Vb6kS5ZpAakZ3i2ejVqw9ZyHda2qSZ1QxPfLF4DXX`; altura `512419274`. |
| Program ID de instrucción | `GV8SZn6i29tL4CmJMei5P3N3BLUxVZBWrG6hFQVSVSBv`; una instrucción CreateAudit. |
| Wallet Standard | Cadena explícita `solana:devnet`; legacy requerida y firma por cuenta compatible. |
| Envío real con Solflare | NO ejecutado; no se puede atribuir el popup a una incompatibilidad probada ni afirmar que se corrigió. |
| Valores Mainnet | NO encontrados en el flujo productivo; la configuración rechaza Mainnet y testnet. |

### Causa y límite

La causa mostrada por Solflare no coincide con los datos construidos por el cliente: el frontend usa Devnet en configuración, RPC, genesis, blockhash, wallet chain y Program ID. No se encontró evidencia de un defecto funcional del cliente. Tampoco se encontró evidencia suficiente para atribuir definitivamente el mensaje a Solflare.

Queda como diagnóstico externo probable una discrepancia de clasificación/simulación de la extensión, caché o estado de red de Firefox. Debe verificarse en una solicitud real de firma. Hasta esa prueba no se habilitará una alternativa insegura ni se modificarán contratos, transacciones o redes.

## Preparación de publicación — estado Git y secretos

Git se inicializó en `main` y se preparó el primer commit para revisión local. La cuenta GitHub autenticada es `Lilarpo`; el repositorio `khiputrace` no existe todavía en esa cuenta.

Revisión sin lectura de claves privadas:

- `.env.local` excluido y no preparado.
- `.env.example` preparado únicamente con configuración pública.
- keypairs externos conservados fuera del workspace, permisos `600`.
- `node_modules`, `target`, `dist` y `.cache` excluidos.
- No se encontraron tokens, claves privadas, seed phrases ni credenciales en el índice con los patrones aplicados.

No se hizo commit ni push. Esta revisión no acredita ausencia universal de secretos ni reemplaza escaneo previo a una publicación.

## Publicación GitHub confirmada

- Repositorio público: [https://github.com/Lilarpo/khiputrace](https://github.com/Lilarpo/khiputrace).
- Rama `main` publicada.
- Commit `5f84c24`.
- GitHub API confirmó visibilidad pública y presencia de `README.md`.
- No se publicó una clave privada ni se creó un nuevo despliegue.
