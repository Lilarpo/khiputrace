# Demo de KhipuTrace — 5 minutos

Guion preparado en 5.2. Es un plan reproducible; no declara una nueva demo ejecutada ni sustituye el recorrido humano con extensión pendiente. Las evidencias ya ejecutadas se identifican como 4.2/5.1.

## Preparación

1. Seguir instalación/configuración del README y abrir la app local conectada a Devnet.
2. Usar una wallet de prueba Wallet Standard con Devnet y firma legacy, sin importar la wallet CLI del proyecto. Solicitar fondos de prueba si es necesario. No mostrar claves, pantalla de recuperación, correo ni datos personales durante la grabación.
3. Elegir un ID de auditoría nuevo para esa wallet, por ejemplo `202611225201` si aún no existe. Usar título `Auditoría demo sintética`, hallazgo `Permiso excesivo de prueba`, descripción `Revisar un permiso sintético del entorno de demostración`, gravedad Alta y acción `Se restringió el permiso sintético y se verificó el acceso`.
4. Abrir los enlaces Explorer del README y el JSON de evidencia 4.2 antes de comenzar. Los IDs y contadores de abajo corresponden a una auditoría recién creada, no a las cuentas históricas existentes.

## Guion breve

| Tiempo | Acción y frase sugerida | Comprobación |
| --- | --- | --- |
| 0:00–0:35 | «KhipuTrace relaciona auditorías y hallazgos. La wallet responsable autoriza los cambios y Rust exige una corrección antes de resolver». Mostrar Devnet, conectar wallet y dirección pública. | Conectar no solicita una transacción; no concede autoridad sobre cuentas ajenas. |
| 0:35–1:20 | Crear auditoría, revisar red/wallet/ID/título y aprobar en la extensión. «Esperamos confirmación antes de mostrar éxito». Abrir el detalle. | Contadores: activos 0, abiertos 0, siguiente ID 0. Abrir firma en Explorer Devnet. |
| 1:20–2:10 | Ir a Hallazgos, seleccionar la auditoría y crear el hallazgo de prueba. Editarlo mientras está abierto. | Finding ID 0, estado Abierto; activos 1, abiertos 1, siguiente 1. Edición conserva la cuenta. |
| 2:10–3:00 | Mostrar acción demasiado corta en el formulario y su validación UX. Reemplazar por la acción válida, revisar y firmar resolución. | Resuelto y acción persistida; activos 1, abiertos 0, siguiente 1. **La validación del formulario no demuestra rechazo Rust**. |
| 3:00–3:45 | Cerrar el resuelto, explicar devolución del saldo a la autoridad, marcar confirmación y firmar. | Cuenta ausente, activos 0, abiertos 0, siguiente 1. El siguiente ID no retrocede. |
| 3:45–4:20 | Crear otro hallazgo en la misma auditoría. | ID 1, abierto; activos 1, abiertos 1, siguiente 2. No se reutiliza 0. |
| 4:20–5:00 | Abrir el reporte Devnet 4.2 y explicar un rechazo de nota inválida, autoridad o cierre abierto. «El programa lo rechazó en preflight y estos snapshots muestran estado conservado». | Código/logs del programa, cuentas existentes y estado antes/después; sin firma inventada para simulación rechazada. Cerrar mostrando arquitectura y limitaciones. |

La creación final deja un hallazgo abierto intencionadamente para demostrar el siguiente ID; no prometer limpieza que no se ejecutó. Cada operación nueva genera su propia firma: registrarla antes de incluirla en una evidencia nueva.

## Cómo mostrar los rechazos ya comprobados

Abrir `docs/evidence/4.2-devnet-acceptance.json` y buscar los casos por su id/descripción: wallet no autorizada (6000), auditoría incorrecta (2006 ConstraintSeeds), cierre abierto (6005), nota vacía/corta/espacios (6004), edición de resuelto (6003) e intento de reutilizar ID cerrado (6008). Confirmar los nombres reales y snapshots en el reporte, sin asociar esos códigos a una operación nueva que no se envió.

Estos rechazos provienen del programa Devnet y usan cuentas existentes. El error 2006 acredita la combinación/PDA incorrecta; no se presenta como 6001. Un fallo RPC o una cuenta inexistente no son pruebas de autorización. Puede mostrarse también la [captura auténtica del error UI](evidence/4.2-ui-devnet-error.png), señalando que corresponde al recorrido automatizado histórico.

Para regenerar rechazos sin fondos/wallet histórica, ejecutar la suite SBF local del README; sus resultados son locales. Los arneses 4.2 con --execute dependen de actores y cuentas históricos y no deben repetirse como una demo genérica. Un nuevo rechazo Devnet controlado necesita su propio caso/evidencia, fuera del guion visual si no se ha preparado.

## Registro manual pendiente

Registrar durante el recorrido humano: versión/manifiesto utilizado, wallet pública de prueba, ID/PDA Audit/Finding, operación, estado inicial/final, resultado esperado/observado y firma real o error. Revisar también rechazo voluntario de firma, desconexión y cambio de cuenta en la extensión. No marcarlo aprobado hasta ejecutarlo.

Si la confirmación queda incierta, conservar firma y consultar Explorer/cuentas antes de repetir. No volver a crear con otro ID para ocultar la incertidumbre. Si Devnet limita solicitudes, esperar y documentar el fallo; usar las evidencias históricas identificadas como tales.
