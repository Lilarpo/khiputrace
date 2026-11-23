# Matriz de cumplimiento WayLearn

Fuentes oficiales consultadas el 23 de noviembre de 2026:

- [Proyecto final y certificado](https://waylearn.gitbook.io/solana-engineering-track-advanced/proyecto-final-y-certificado)
- [Pruebas y evidencias](https://waylearn.gitbook.io/solana-engineering-track-advanced/pruebas-y-evidencias)

Estado general: **preparación técnica completada; recorrido humano, publicación del repositorio y envío oficial pendientes**. Esta matriz no acredita la revisión final de WayLearn.

| Requisito oficial | Implementación correspondiente | Archivo principal | Evidencia / prueba | Estado | Observaciones |
|---|---|---|---|---|---|
| Entregar repositorio revisable | Programa, frontend, IDL, cliente y documentación disponibles | `README.md`, `programs/`, `frontend/`, `docs/` | Revisión local y publicación GitHub | VERIFICADO | https://github.com/Lilarpo/khiputrace |
| Código Rust y Anchor | Programa Anchor con cuentas, instrucciones y reglas on-chain | `programs/khiputrace/src/` | `npm run verify`; LiteSVM; `npm run check:idl` | VERIFICADO | Evidencias históricas reproducibles. |
| Cuentas relacionadas y PDAs | `Audit` y `Finding`, seeds por autoridad/auditoría e ID u64 little-endian | `programs/khiputrace/src/state/` | Pruebas Rust/SBF y decodificación | VERIFICADO | No equivale a un despliegue nuevo. |
| Crear registros | Crear auditoría y hallazgo | `instructions/create_audit.rs`, `create_finding.rs` | Casos SBF 1.3 y 4.2 | VERIFICADO | Crear auditoría tiene una firma Devnet finalized. |
| Consultar registros | Lectura tipada de auditorías y hallazgos | `frontend/src/infrastructure/anchor/repositories.ts` | 16 pruebas de infraestructura y UI Devnet | VERIFICADO | Las consultas pueden quedar obsoletas; Rust conserva la autoridad final. |
| Modificar registros | Actualización exclusiva de hallazgos Open | `instructions/update_finding.rs` | Pruebas Rust/SBF y caso UI | VERIFICADO | Modificar un Resolved tiene rechazo probado. |
| Permisos mediante wallet | Wallet Standard firma fuera del programa; Rust exige authority y signer | `frontend/src/infrastructure/wallet/`, `instructions/` | Rechazos on-chain y Devnet controlados | VERIFICADO con límites | El recorrido con extensión real sigue pendiente. |
| Rechazo de wallet no autorizada | El programa exige authority de Audit y firma existente | `instructions/*.rs`, `errors.rs` | 4.2 Devnet y 1.3 LiteSVM | VERIFICADO | Rechazo conserva cuentas y estado. |
| Rechazo de relaciones ajenas | Owner, discriminator, PDA y relación `finding.audit == audit.key()` | `instructions/`, `state/read.rs` | Casos 1.3 y 4.2 | VERIFICADO | Se usaron cuentas existentes controladas. |
| Cierre condicionado | Cerrar solo Resolved y devolver renta a authority | `instructions/close_finding.rs` | LiteSVM y evidencia Devnet | VERIFICADO | No existe cierre de Audit. |
| Resolución con aporte propio | Mínimo 10 caracteres Unicode tras trim y máximo 512 bytes UTF-8 | `domain/rules.rs`, `resolve_finding.rs` | Rechazos positivos/negativos SBF y Devnet | VERIFICADO | La regla no juzga calidad técnica semántica. |
| Contadores e IDs | `next_finding_id`, `active_findings`, `open_findings` y aritmética comprobada | `state/audit.rs`, instrucciones | SBF 1.3 y snapshots 4.2 | VERIFICADO | Cerrar no retrocede la secuencia ni reutiliza IDs. |
| Cliente TypeScript | Repositorios Anchor tipados, mappers, PDAs y confirmación | `frontend/src/infrastructure/anchor/` | `npm run verify`; `npm run check:idl` | VERIFICADO | Usa bigint/BN y no sustituye reglas Rust. |
| Integración React y wallet | Formularios, wallet, estados de transacción y refresco | `frontend/src/presentation/`, `frontend/src/composition/` | Build y Playwright locales | VERIFICADO en navegador controlado | Las dobles no acreditan una extensión real. |
| Despliegue Devnet | ELF desplegado y Program ID real | `Anchor.toml`, `docs/DEPLOYMENT.md` | Lectura ProgramData/ELF y CreateAudit | VERIFICADO | Mainnet no se utilizó. |
| Firma, confirmación y errores | Preflight, blockhash, confirmación y mapeo de errores | `frontend/src/infrastructure/anchor/transactions.ts` | Casos 4.2 y pruebas de infraestructura | VERIFICADO con límites | Confirmación incierta no se muestra como éxito. |
| Evidencias verificables | Capturas, JSON, logs y enlaces Explorer Devnet | `docs/evidence/`, `docs/TEST_EVIDENCE.md` | 4.1, 4.2, 5.1 y 5.2 | VERIFICADO en lo ejecutado | No se inventaron firmas para rechazos de preflight. |
| README reproducible | Ruta propia, arquitectura, instalación, red, operaciones y límites | `README.md` | `npm run verify`, `npm run check:idl` | VERIFICADO | Publicación Git y recorrido humano pendientes. |
| Identificación WayLearn | Nombre y correo mediante el canal adecuado | Formulario oficial WayLearn | No incorporado al repositorio | PENDIENTE | No publicar datos personales on-chain ni innecesariamente. |

## Pendientes reales antes de enviar

1. Ejecutar el recorrido humano de [DEMO_GUIDE.md](DEMO_GUIDE.md) con una extensión real.
2. Inicializar Git, revisar el historial y publicar el repositorio con acceso de lectura.
3. Completar el registro final y enviar el enlace junto con el nombre/correo solicitados.
4. Registrar, si cambia el entorno, nuevas firmas y evidencias de la misma versión entregada.
