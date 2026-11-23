# Checklist final WayLearn — submódulo 5.2

Fuentes oficiales consultadas de nuevo el 23 de noviembre de 2026 (UTC): [proyecto final y certificado](https://waylearn.gitbook.io/solana-engineering-track-advanced/proyecto-final-y-certificado), [pruebas y evidencias](https://waylearn.gitbook.io/solana-engineering-track-advanced/pruebas-y-evidencias). La aceptación final corresponde al equipo WayLearn.

Estado: **preparación local completada; entrega oficial aún pendiente**. Los checks técnicos no implican que se haya publicado un repositorio, ejecutado una demo humana o enviado un formulario.

| Estado | Criterio | Evidencia / acción pendiente |
| --- | --- | --- |
| [x] | Ruta de proyecto propio identificada | README: propósito, problema, solución, punto de partida y equivalencias con el ejemplo oficial. |
| [x] | Programa, frontend, IDL y cliente disponibles | Rust en programs/khiputrace, capas en frontend/src, IDL JSON/tipos generados. |
| [x] | Despliegue Devnet e identidad coherente | Program ID real en README; verificación de IDL y lectura remota 5.2. |
| [x] | Cuentas relacionadas y PDAs | Audit/authority/id y Finding/audit/id; u64 LE, bumps canónicos. |
| [x] | Crear, consultar y modificar | Casos de uso y flujo UI; cuentas/firmas registradas en 4.2. |
| [x] | Permisos, pertenencia y cierre condicionado en Rust | Rechazos sobre cuentas existentes, códigos/logs y snapshots antes/después; cierre solo Resolved. |
| [x] | Firma, confirmación, refresco y errores | Recorrido UI Devnet automatizado 4.2 y regresión local 5.1. |
| [x] | Aporte original positivo y negativo | Acción correctiva obligatoria y cierre con contadores/IDs monotónicos; notas inválidas e ID reutilizado rechazados. |
| [x] | Capturas o transacciones verificables | Capturas auténticas Devnet y enlaces Explorer con cluster=devnet en README/TEST_EVIDENCE. |
| [x] | Estado inicial, operación, esperado/observado y final documentados | TEST_EVIDENCE, JSON directos/UI y errores preflight sin firmas inventadas. |
| [x] | Instalación, configuración y ejecución documentadas | README y comprobación aislada de instalación/tipos/build registrada en 5.2. |
| [x] | Pruebas del proyecto ejecutadas | verify e IDL 5.2; 17 casos SBF y 30 de navegador ejecutados en 5.1, identificados por versión. |
| [x] | Arquitectura y decisiones de seguridad explicables | ARCHITECTURE, SECURITY y SECURITY_REVIEW; sin afirmar auditoría profesional. |
| [x] | Guion breve de demo y límites | DEMO.md: 5 minutos, datos sintéticos y registro manual pendiente. |
| [x] | Copia de entrega revisada sin archivos sensibles detectados | DELIVERY y manifiesto público: entornos/keypairs excluidos, rutas anonimizadas, escaneo acotado sin candidatos. Los originales históricos permanecen locales. |
| [ ] | Recorrido manual con extensión real | Ejecutar DEMO.md, comprobar aprobación/rechazo/cambio de cuenta y registrar resultados reales. La automatización no sustituye este paso. |
| [ ] | Repositorio accesible para revisión | Git inicializado en `main`, primera preparación local sin commit/remote/push. Cuenta autenticada `Lilarpo`; repositorio `khiputrace` todavía no existe. Publicación pendiente de autorización. |
| [ ] | Envío oficial e identificación | Entregar URL y datos de certificado/correo de registro por el formulario oficial; no incorporarlos al repositorio ni on-chain. |

No se requiere hosting contratado: la demo puede ejecutarse localmente contra Devnet. La documentación oficial indica plazo inicial **22/11/2026, 23:59 CDMX** y correcciones solicitadas hasta **30/11/2026, 23:59 CDMX**; comprobar vigencia en la fuente antes de enviar. Este archivo no acredita un envío dentro del plazo.

Riesgos residuales: extensión pendiente, autoridad de actualización única, bincode transitivo sin mantenimiento, ausencia de validación con validador completo/fuzzing/formal. La copia Git de entrega aún no tiene historial de commits ni acceso remoto; se conserva la revisión interna 5.1 como informe histórico, sin marcar todos sus pendientes resueltos.
