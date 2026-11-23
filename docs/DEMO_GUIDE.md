# Guía breve de demostración

Guía práctica para presentar KhipuTrace en un recorrido manual en Solana Devnet.

## 1. Presentar el problema

Una auditoría debe registrar hallazgos, conservar su relación con la wallet responsable y evitar cambios después de resolverlos. KhipuTrace usa cuentas `Audit` y `Finding` derivadas por PDAs.

Usar datos sintéticos y no mostrar claves privadas, frases de recuperación, correos ni datos personales.

## 2. Explicar la solución

Mostrar el aporte principal:

- Resolver exige una acción correctiva válida.
- Cerrar exige que el hallazgo esté Resuelto.
- El cierre devuelve renta a la authority y no retrocede el siguiente ID.

## 3. Conectar la wallet

Abrir la aplicación local contra el Program ID `GV8SZn6i29tL4CmJMei5P3N3BLUxVZBWrG6hFQVSVSBv` en Devnet. Conectar una extensión compatible con Wallet Standard y comprobar la dirección pública.

Conectar no demuestra autorización sobre auditorías existentes.

## 4. Crear una auditoría

Crear una auditoría con un ID u64 nuevo para esa autoridad y un título sintético. Esperar confirmación y comprobar:

- La auditoría existe.
- La authority es la wallet conectada.
- `next_finding_id`, `active_findings` y `open_findings` comienzan en cero.

## 5. Registrar y modificar un hallazgo

Crear un hallazgo relacionado con título, descripción y gravedad sintéticos. Confirmar el estado Open.

Modificar título o descripción mientras siga Open y comprobar que conserva la misma PDA y relación.

## 6. Resolver con acción correctiva

Intentar resolver con una acción vacía, corta o solo espacios. La validación de UI no demuestra el rechazo Rust.

Usar una acción de al menos 10 caracteres Unicode después de trim y máximo 512 bytes UTF-8. Confirmar que:

- El estado pasa de Open a Resolved.
- La acción queda persistida.
- `open_findings` disminuye.

## 7. Demostrar un rechazo

Mantener una cuenta existente y probar una operación preparada:

- Cerrar un hallazgo todavía Open.
- Modificar un hallazgo Resolved.
- Resolver sin acción válida.
- Usar otra wallet.

Comprobar el código/error y que los datos y contadores no cambiaron. Si falla el preflight sin firma, conservar el error y no inventar una transacción.

## 8. Cerrar y comprobar el siguiente ID

Cerrar el hallazgo Resuelto y comprobar:

- La cuenta deja de existir.
- `active_findings` disminuye.
- `open_findings` permanece coherente.
- `next_finding_id` no retrocede.

Crear otro hallazgo en la misma auditoría y comprobar que obtiene el siguiente ID, no el cerrado.

## 9. Verificar en Solana Explorer

Abrir las firmas con `cluster=devnet`. Distinguir transacciones finalizadas, rechazos de simulación y evidencias automatizadas históricas.

## 10. Concluir

Cerrar mostrando controles on-chain, aportes propios, evidencias verificables y pendientes: recorrido con extensión real, publicación del repositorio y envío oficial.

No afirmar certificación ni auditoría profesional hasta que exista la revisión correspondiente.
