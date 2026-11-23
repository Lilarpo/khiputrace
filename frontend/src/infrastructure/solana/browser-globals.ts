import { Buffer } from 'buffer';

// El SDK legacy utiliza Buffer global al construir transacciones en navegador.
// Se reutiliza la dependencia ya fijada; Domain y Presentation no conocen este detalle.
if (typeof globalThis.Buffer === 'undefined') globalThis.Buffer = Buffer;
