# Revisión de seguridad y arquitectura — submódulo 5.1

Fecha: 22 de noviembre de 2026, America/La_Paz (logs UTC del 23). Revisión interna del código y sus pruebas; **no constituye una auditoría profesional, certificación ni garantía de ausencia de vulnerabilidades**.

No se identificaron defectos críticos o altos en el alcance revisado. Se registran dos riesgos medios y tres hallazgos/riesgos bajos; uno bajo está corregido. Los riesgos operativos y las carencias de validación se distinguen de vulnerabilidades explotables demostradas.

## Alcance y versión

Se revisaron programa Rust, modelos/reglas/contextos de las cinco instrucciones, cliente TypeScript, puertos, casos de uso, composición, Wallet Standard, hooks/formularios React, manifests/lockfiles y pruebas host, SBF, adaptadores, componentes y arneses Devnet. Las evidencias de 4.2 se conservan como ejecuciones históricas; en 5.1 se ejecuta regresión local y lectura Devnet, sin nuevas transacciones de negocio.

- Program ID: `GV8SZn6i29tL4CmJMei5P3N3BLUxVZBWrG6hFQVSVSBv`.
- SHA-256 ELF recompilado: `c941ab95d5cbfc6ae9ec73683dec79e24b0a60f11c505e7a173555b44eb08f17`.
- SHA-256 fuente Rust del arnés: `488328cd819be29b30d9c08195e10cfc48bd2808a00b667f50c0b2b520ff0227`.
- La lectura Devnet finalized verifica genesis, executable/owner, vínculo Program/ProgramData, autoridad de actualización y coincidencia byte a byte con ese ELF. Resultado reproducible en [5.1-review-check.json](evidence/5.1-review-check.json).
- No se modificaron Rust, frontend productivo, IDL ni dependencias. La corrección afecta al control estático y sus pruebas. Identidad de archivos en `evidence/5.1-manifest.json`; no hay commit Git disponible.

## Criterios de severidad

Crítico: eludir autoridad o comprometer de forma general fondos/estado. Alto: alterar estado de otra autoridad, romper relaciones/contadores de forma explotable o exponer claves. Medio: riesgo operativo o brecha de validación relevante que requiere condiciones adicionales. Bajo: mantenimiento, reproducibilidad o prevención de regresiones sin explotación actual demostrada.

## Hallazgos y riesgos

| ID | Severidad / naturaleza | Evidencia e impacto | Estado / acción |
| --- | --- | --- | --- |
| R-01 | Medio; cobertura incompleta | `tests/browser/devnet.spec.ts` utiliza Wallet Standard de pruebas y firma oficial Node. No ejercita una extensión real, su ventana de aprobación/rechazo, cambio de red/cuenta ni su persistencia de permisos. Las dobles locales comprueban carreras, pero no acreditan la integración con una extensión. | Pendiente de recorrido humano con extensión en Devnet antes de entrega. No es una vulnerabilidad confirmada ni invalida las transacciones reales documentadas en 4.2. |
| R-02 | Medio; riesgo operativo | ProgramData conserva upgrade authority en una sola wallet Devnet. Comprometer esa clave permite sustituir el código y sus controles. La lectura 5.1 confirma la autoridad esperada; archivos externos tienen 600 y directorio 700, sin cifrado propio. | Riesgo conocido dentro del MVP Devnet. Proteger respaldo y acceso al equipo; revisar política de actualizaciones antes de otra fase. No transferir autoridad ni hacer inmutable el programa sin decisión/autorización explícita. |
| R-03 | Bajo; control de arquitectura | `scripts/check-architecture.mjs:20` permitía un import externo de Anchor desde Presentation porque solo controlaba imports externos de Domain/Application. Reproducción previa en [5.1-architecture-gap-before.log](evidence/5.1-architecture-gap-before.log): cero errores para el import prohibido. El frontend actual no contiene tal dependencia. | **Corregido**: bloquear SDKs `@anchor-lang/`, `@coral-xyz/`, `@solana/` y `@wallet-standard/` desde Presentation. Nueva regresión en `tests/scaffold/architecture.test.mjs:25`: import, export, import dinámico, require y tipos; React y adaptadores siguen permitidos. Es una barrera para esos SDKs conocidos, no un sandbox universal de imports. |
| R-04 | Bajo; dependencia sin mantenimiento | `bincode 1.3.3` llega transitivamente por Anchor/Solana; [árbol real](evidence/5.1-bincode-tree.log). [RUSTSEC-2025-0141](https://rustsec.org/advisories/RUSTSEC-2025-0141.html) declara fin de mantenimiento y ninguna versión parcheada; es un aviso informativo, sin vulnerabilidad concreta acreditada por esta revisión. | Abierto: vigilar el upstream. No introducir reemplazo/override de otro formato binario ni cambiar el stack Anchor para silenciar el aviso. |
| R-05 | Bajo; reproducibilidad y revisión limitada | `git rev-parse --is-inside-work-tree` devuelve 128: no hay repositorio ni historial examinable. No puede comprobarse una exposición histórica de secretos ni entregar un commit revisable. Los hashes fijan el contenido local revisado, pero no sustituyen Git. | Pendiente de preparación de entrega: inicializar/revisar exclusiones y cambios antes del primer commit, sin push automático. No se declara revisado un historial inexistente. |

Críticos encontrados: **0**. Altos encontrados: **0**. No hay correcciones críticas/altas que aplicar ni redespliegue derivado de esta revisión. Los riesgos abiertos anteriores no se presentan como resueltos.

## Resultado por área

| Área | Comprobación y conclusión dentro del alcance |
| --- | --- |
| Clean Architecture / SOLID | Domain contiene tipos, restricciones y puertos sin SDK/React; Application valida y coordina mediante interfaces pequeñas y un caso por operación. Infrastructure implementa puertos y traduce cuentas/errores. Presentation usa casos de uso y configuración interna; composición inyecta adaptadores en `composition/runtime.ts`. No se encontró inversión de dependencias en código actual. `AnchorRepositories` comparte la construcción de instrucciones sin introducir un backend. |
| Programa y cuentas | Entry points delegan en instrucciones separadas. `Account<T>` comprueba owner/discriminator; `Signer` exige firma; `has_one = authority` impone autorización. `init` y `Program<System>` limitan creación. No hay `UncheckedAccount`, `init_if_needed`, `realloc`, autoridad delegada ni instrucciones administrativas de negocio. |
| PDAs y pertenencia | IDs u64, ocho bytes little-endian. Seeds Audit/authority/id y Finding/audit/id; `bump` canónico del contexto, comprobación del bump guardado, versión y `has_one = audit`. El ID del hallazgo existente debe ser anterior a next. Combinaciones ajenas se rechazan en cuentas existentes, además de las pruebas de owner/firma/seed incorrectos. |
| Estados y contadores | Update/Resolve solo Open; Resolve valida trim, mínimo 10 escalares Unicode y máximo 512 bytes. Close solo Resolved, nota válida y refund únicamente a authority. Los cambios se preparan antes de asignar, con checked_add/sub y comprobación de suma del refund. Close decrementa activos; next nunca retrocede. Atomicidad y rechazo sin cambios se ejercitan en SBF, incluidos errores posteriores al cierre. |
| Tamaños y entrada | Espacios Audit 174 y Finding 1184 incluyen discriminator y longitudes Borsh. Límites 96/512/512 bytes UTF-8; enums binarios cerrados y versión explícita. No hay unwrap/unsafe en código Rust propio productivo; los expect encontrados son fixtures de pruebas. El cliente conserva u64 como bigint/BN, normaliza conforme a Rust y rechaza surrogates aislados. La validación cliente no sustituye al programa. |
| Firma y confirmación | SDK firma mediante wallet externa; verifica que mensaje/cuenta no cambien, firmas válidas y red permitida antes del envío. Preflight activo; confirmación con blockhash/altura y comprobación de err. Un resultado incierto conserva firma y no devuelve éxito ni reenvía automáticamente. Repositorios mapean errores; las pruebas incluyen wallet/mensaje/red cambiantes. |
| UI y obsolescencia | React escapa contenido; no se encontró inyección de HTML ni persistencia de secretos. Datos se releen después de confirmar, sin contabilizar optimistamente. Solicitudes antiguas se invalidan al cambiar cuenta. Lecturas múltiples no son una instantánea atómica y pueden quedar obsoletas; el programa rechaza IDs/transiciones incompatibles. Cierre requiere revisión explícita y confirmación accesible. |
| Dependencias / tipos | Versiones y lockfiles conservados; TypeScript strict y sin skipLibCheck. Dependencias directas corresponden a wallet/SDK/React/build/pruebas; buffer es necesario para SDK en navegador y ws para RPC local de pruebas. Sin base de datos/backend añadido. No se eliminan paquetes transitivos por intuición. |
| Secretos | Inspección de rutas/patrones en texto local, JSON de 64 bytes, nombres de keypair, variables de entorno públicas y artefactos dist. Sin candidatos en ese alcance. Se comprobaron permisos externos sin leer ni imprimir claves. El escáner tiene patrones limitados; no demuestra ausencia universal de secretos. |

## Dependencias Rust: contraste de avisos

Consulta exacta de las **158 entradas registry** de Cargo.lock a OSV: [resultado bruto](evidence/5.1-rust-osv.json), [avisos completos](evidence/5.1-rust-advisories.json). No se ejecutó `cargo audit`, no disponible; esta consulta no equivale a una revisión de código de dependencias ni garantiza que todas tengan avisos completos.

OSV devolvió `GHSA-fjx5-qpf4-xjf2` para `borsh 0.10.4` por un rango agregado anterior a 1.0. El [aviso primario RustSec RUSTSEC-2023-0033](https://rustsec.org/advisories/RUSTSEC-2023-0033.html) identifica expresamente `^0.10.4` como corregido, y la fuente instalada rechaza Vec de tipos de tamaño cero. La [ficha GitHub](https://github.com/advisories/GHSA-fjx5-qpf4-xjf2) también indica afectadas hasta 0.10.3. Se clasifica como falso positivo para la versión instalada, conservando el resultado bruto; no se silencia el escáner ni se cambia Anchor. El otro aviso es R-04, que permanece abierto. npm audit devolvió cero vulnerabilidades conocidas en esta ejecución, sin implicar ausencia de fallos desconocidos.

## Verificación y límites

Comandos, salidas y resultados en [TEST_EVIDENCE.md](TEST_EVIDENCE.md), sección 5.1. Las firmas generadas por LiteSVM son locales, sin enlace Explorer. Las evidencias Devnet 4.2 siguen separadas de la regresión 5.1.

Pendientes: extensión real y revisión humana de aprobaciones; concurrencia/consenso con validador completo; fuzzing, verificación formal y revisión independiente no realizados. No se instalaron Anchor CLI/validador/cargo-audit ni se hicieron cambios globales. El aviso SBF histórico de clasificación de syscalls, con `syscalls.txt` vacío del SDK local, permanece en los logs: el ELF sí compiló, ejecutó LiteSVM y coincide con el aceptado por Devnet. La corrección del verificador no cambia ese ELF.

Siguiente submódulo propuesto, **sin iniciar**: 5.2, cerrar pendientes de entrega con recorrido manual mediante extensión real y preparación de repositorio/documentación final; alcance sujeto a instrucciones del usuario.
