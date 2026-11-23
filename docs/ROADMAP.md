# Roadmap de KhipuTrace

Cada submódulo necesita una instrucción del usuario. La numeración siguiente es una propuesta de continuidad; el alcance explícito del usuario prevalece sobre propuestas anteriores.

| Submódulo | Alcance | Estado |
| --- | --- | --- |
| Inicial | Reglas permanentes en AGENTS.md | Completado. |
| 0.1 | Diagnóstico del entorno y Devnet de lectura | Completado; faltan CLI. |
| 0.2 | Arquitectura, modelo, PDAs, contratos, amenazas, versiones y scaffold | Completado como scaffold; verify host aprobado. Avisos npm corregidos en 2.1; CLI pendientes. |
| 0.3 propuesto | Revisar avisos de dependencias, preparar toolchain local con versiones fijadas y Git con exclusiones; verificar compilación SBF e IDL al habilitar el programa mínimo | Parcial: herramientas SBF locales preparadas en 1.3. IDL y avisos npm resueltos en 2.1. Solana CLI añadida en 4.1; pendientes Anchor CLI/validador y Git; explicar cambios adicionales antes de ejecutarlos. |
| 1.1 | Modelos Audit/Finding, creación base y lectura validada; PDAs, espacio y reglas iniciales | Implementado; host/SBF aprobados y CreateAudit/lectura Devnet comprobados en 4.1; restantes operaciones Devnet pendientes. |
| 1.2 | Las cinco instrucciones Anchor y sus reglas; sin frontend | Implementadas; host y transacciones SBF locales verificadas en 1.3. |
| 1.3 | Pruebas positivas/negativas del programa en entorno local; CPI, cierre/reembolso, IDs y rollback | Completado en LiteSVM: 17 casos y 95 transacciones. No incluye concurrencia ni RPC/validador. |
| 2.1 | Infraestructura Anchor con IDL generado, cliente tipado, PDAs, mapeos, repositorios, red y confirmación | Implementada y verificada; 16 pruebas actuales. IDL/identidad/despliegue/CreateAudit Devnet comprobados en 4.1; extensión real pendiente. |
| 2.2 | Siete casos de uso, validaciones UX, errores tipados y composición | Completado; 74 pruebas unitarias y regresión aprobadas. Sin pantallas. |
| 2.3 propuesto | Formularios y flujo mínimo, refresco y estados de transacción | Cubierto en 3.1/3.2/3.3 por los alcances explícitos del usuario; recorrido Devnet pendiente. |
| 3.1 | Base visual React, navegación, dashboard, wallet, Devnet y estados/notificaciones | Completado y verificado en navegador; sin formularios ni firma. |
| Integración pendiente | Flujo completo en Localnet, pruebas críticas y revisión de seguridad | Flujo local con auditorías/hallazgos cubierto por LiteSVM/RPC mínimo en 3.3; extensión, validador e integración de cluster pendientes. |
| 3.2 | Gestión UI de auditorías: crear, listar, detalle, contadores, firma/confirmación/refresco y pruebas | Implementada; verificación local con SBF. Programa desplegado en 4.1; recorrido UI con extensión real pendiente. |
| 4.1 | Preparación y despliegue controlado Devnet, identidad/IDL/cliente coherentes y transacción real | Completado: autorizado, desplegado, bytes/autoridad/executable/IDL/cliente verificados y CreateAudit real finalized. Gasto 1,39334556 SOL Devnet, inferior al límite de 3. Evidencias en DEPLOYMENT.md. |
| 3.3 | Flujo UI de hallazgos, reglas reflejadas, firma/refresco y pruebas completas locales | Implementado; verificación local con SBF. Programa desplegado en 4.1; flujo completo de hallazgos Devnet pendiente. |
| 4.2 | Verificación contra WayLearn: flujos y rechazos Devnet, UI y evidencias | Automatización aprobada: 28 casos, 18 rechazos directos, 8 etapas UI y otro rechazo; 16 transacciones finalized. Revisión manual con extensión/entrega pendientes y explícitas en TEST_EVIDENCE.md. |
| 5.1 | Revisión final interna de seguridad, arquitectura, dependencias, secretos y pruebas | Completada; sin críticos/altos identificados. Dos riesgos medios y tres bajos, uno bajo corregido. Detalles y límites en SECURITY_REVIEW.md; no equivale a auditoría profesional. |
| Entrega pendiente | Recorrido Devnet, evidencias reproducibles y README final WayLearn | Pendiente; alcance anterior de 3.3 sustituido por instrucción del usuario. |
| 5.2 | Documentación final, matriz WayLearn, guía de demo y actualización de contexto | Completado como cierre documental. Pendientes externos: recorrido humano con extensión, publicación Git y formulario. |

La evidencia final debe cubrir la matriz de AGENTS.md y vincular la versión del código, Program ID, IDL y frontend utilizados. No se añade cierre de auditorías, roles, indexador, dashboard avanzado ni servicios externos al MVP. Mainnet queda excluida de todas las fases.

Continuidad actual: **revisión interna 5.1 ejecutada y documentada**, por instrucción explícita del usuario. La propuesta anterior 4.3 no se inició. Siguiente propuesto, pendiente de instrucciones: **5.2, cerrar pendientes de entrega con recorrido manual mediante extensión real y preparación de repositorio/documentación final**. No iniciado. El recorrido UI Devnet automatizado de 4.2 usa Wallet Standard de pruebas y firma oficial Node, sin simular RPC; no acredita extensión ni certificación. Las notas históricas siguientes no sustituyen este estado.

Actualización 1.3: el usuario pidió pruebas locales positivas y negativas; se ejecutaron sobre el ELF SBF en LiteSVM, sin instalar CLI globales ni iniciar un validador. Concurrencia, RPC e integración de cluster quedan pendientes de integración; 3.1 fue redefinido por el usuario. La base visual se implementó posteriormente en 3.1. La infraestructura se completó en 2.1 y los avisos npm/IDL se resolvieron. Application completada en 2.2. Actualización 3.1: base visual completada; no incluye formularios, integración completa ni operaciones Devnet. Actualización 3.2: gestión de auditorías implementada; no incluye operaciones visuales de hallazgos ni despliegue. Actualización 3.3: UI de hallazgos y flujo completo local implementados. Siguiente propuesto: preparar identidad/toolchain e integración Devnet, con numeración/alcance/autorización explícitos; no iniciado. Integración real requiere identidad y despliegue autorizados. Completar la preparación pendiente de 0.3 cuando sea necesaria. Esperar instrucciones.
