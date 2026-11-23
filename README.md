# KhipuTrace

Repositorio público: [https://github.com/Lilarpo/khiputrace](https://github.com/Lilarpo/khiputrace)

Aplicación descentralizada para gestionar auditorías y hallazgos de seguridad en Solana. **Proyecto propio para WayLearn Solana Engineering Track: Advanced**. Programa desplegado en **Devnet**, frontend React ejecutable en local y evidencia verificable del ciclo completo.

**Estado de entrega:** documentación y código preparados; ejecución automatizada Devnet aprobada. Quedan pendientes el recorrido humano con extensión real, publicar un repositorio accesible para revisión y enviar el formulario oficial. No se declara certificación ni auditoría profesional.

## Problema y solución

Una auditoría necesita relacionar cada hallazgo con su responsable y distinguir entre un riesgo abierto, una corrección registrada y una cuenta cerrada. KhipuTrace conserva estas relaciones y transiciones en cuentas del programa, con autorización criptográfica de la wallet responsable.

La interfaz permite crear auditorías, registrar y modificar hallazgos abiertos, resolverlos con una acción correctiva y cerrar sus cuentas solo cuando estén resueltos. Los datos son públicos: la demo utiliza información sintética, sin secretos ni datos personales.

## Ruta elegida y aporte original

**Ruta: proyecto propio.** El proyecto partió de una carpeta vacía, según el registro inicial de [AGENTS.md](AGENTS.md). No es una adaptación del registro de ventas guiado. Utiliza bibliotecas y herramientas oficiales Anchor/Solana, React/Vite y Wallet Standard; IDL/tipos generados desde Rust y asistencia de IA durante el desarrollo, con revisión y pruebas registradas.

El aporte combina dos reglas comprobables:

1. Resolver exige una acción correctiva de **al menos 10 valores escalares Unicode después de trim y como máximo 512 bytes UTF-8**. Rust rechaza una nota vacía, corta o solo espacios, conservando estado y contadores.
2. Cerrar exige estado Resolved y devuelve el saldo de la cuenta exclusivamente a su autoridad. Disminuye los hallazgos activos, pero conserva la secuencia del siguiente ID. Crear otro hallazgo no reutiliza el ID cerrado.

La regla valida contenido y longitud; no certifica la calidad técnica de una corrección. Casos positivos y rechazos: [evidencias 4.2 y 5.1](docs/TEST_EVIDENCE.md).

## Programa e IDL de la entrega

| Elemento | Valor / archivo |
| --- | --- |
| Red | Solana Devnet; Mainnet prohibida |
| Program ID real | `GV8SZn6i29tL4CmJMei5P3N3BLUxVZBWrG6hFQVSVSBv` |
| Explorer | [Programa en Devnet](https://explorer.solana.com/address/GV8SZn6i29tL4CmJMei5P3N3BLUxVZBWrG6hFQVSVSBv?cluster=devnet) |
| IDL JSON | [khiputrace.json](frontend/src/infrastructure/anchor/generated/khiputrace.json) |
| IDL/tipos TypeScript | [khiputrace.ts](frontend/src/infrastructure/anchor/generated/khiputrace.ts) |
| Cliente y repositorios | [client.ts](frontend/src/infrastructure/anchor/client.ts), [repositories.ts](frontend/src/infrastructure/anchor/repositories.ts) |
| SHA-256 ELF verificado | `c941ab95d5cbfc6ae9ec73683dec79e24b0a60f11c505e7a173555b44eb08f17` |

Rust, Anchor.toml, IDL, cliente y plantilla de configuración coinciden. `npm run check:idl` compara los archivos generados con Rust; no publica un IDL on-chain. El binario se comparó byte a byte con ProgramData Devnet, incluyendo autoridad y estado executable. [Despliegue](docs/DEPLOYMENT.md), [comprobación 5.2 de solo lectura](docs/evidence/5.2-readonly-check.json).

## Funcionalidades y modelo

- Conectar/desconectar wallet Wallet Standard, mostrar dirección pública y red.
- Crear/listar auditorías de la wallet y consultar detalle/contadores.
- Crear/listar hallazgos relacionados; gravedad Low, Medium, High o Critical.
- Modificar únicamente hallazgos Open; resolver con acción correctiva válida; cerrar únicamente Resolved con confirmación explícita en la UI.
- Mostrar firma, espera, confirmación, errores del programa y resultado incierto; releer cuentas después de confirmar.
- Interfaz en español, adaptable a móvil y con navegación por teclado/etiquetas básicas.

Audit contiene autoridad, ID, título, versión, siguiente ID, contadores activos/abiertos y bump. Finding contiene auditoría, ID, título, descripción, gravedad, estado, acción correctiva, versión y bump. Título: 96 bytes UTF-8; descripción y acción: 512 cada una. Espacios incluidos discriminadores: Audit **174 bytes**, Finding **1184 bytes**.

PDAs canónicas:

```text
Audit   = [b"audit", authority_public_key, audit_id.to_le_bytes()]
Finding = [b"finding", audit_public_key, finding_id.to_le_bytes()]
```

Los IDs son u64 de ocho bytes little-endian; TypeScript usa bigint/BN para conservar precisión. No hay cierre de auditorías ni historial permanente de hallazgos cerrados en la UI.

## Arquitectura y seguridad

```text
frontend/src/
  domain/          Entidades, restricciones y puertos; sin React, Anchor ni RPC
  application/     Ocho casos de uso, validación UX y contratos internos
  infrastructure/  Anchor, PDAs, cuentas, RPC, confirmación y Wallet Standard
  composition/     Ensamblaje e inyección de adaptadores
  presentation/    Páginas, componentes, hooks y estilos React
programs/khiputrace/src/
  lib.rs           Entry points pequeños
  instructions/    Contextos de cuentas y handlers separados
  state/           Modelos, seeds y lectura
  domain/          Reglas y límites reutilizables
  errors.rs        Errores del programa
```

Las dependencias apuntan hacia el dominio. Los componentes invocan Application; no importan adaptadores ni SDKs blockchain. Los casos de uso dependen de puertos pequeños, con composición explícita y sin base de datos, backend, indexador o servicio adicional.

Rust impone firmantes, autoridad, owner/discriminator, PDAs/seeds/bumps canónicos, pertenencia Audit–Finding, versiones, enums, límites y transiciones. Los contadores usan checked_add/sub, el refund tiene destino autorizado y los errores de transacción revierten el estado. Las restricciones visuales solo mejoran UX.

El cliente comprueba IDL/Program ID, genesis y cuenta ejecutable; permite únicamente Localnet/Devnet y RPC oficial Devnet o HTTP loopback local. Verifica que la wallet no altere el mensaje firmado, utiliza preflight y confirma antes de devolver éxito. Ante incertidumbre conserva la firma y evita reenvío automático. No maneja ni almacena claves privadas.

Detalle: [arquitectura](docs/ARCHITECTURE.md), [seguridad](docs/SECURITY.md), [revisión interna y riesgos pendientes](docs/SECURITY_REVIEW.md).

## Stack y requisitos

| Componente | Versión utilizada |
| --- | --- |
| Rust host / mínimo | 1.99.1 observado / >=1.89 y rustfmt |
| Anchor Rust y cliente TypeScript | 0.32.2; transitivas fijadas en Cargo.lock |
| Solana/Agave CLI y SBF | 2.3.0; platform-tools 1.52, arquitectura v0 |
| Node.js / npm | 24.22.0 / 11.19.1 |
| TypeScript / React / Vite | 5.9.3 / 19.3.1 / 8.3.5 |
| web3.js / Wallet Standard | 1.99.0 / app, base y features 1.1.1 |
| Pruebas | Node test runner, Rust host, solders 0.26.0/LiteSVM, Playwright 1.65.1 |

Entorno comprobado: Linux Mint 22.3 x86_64, equipo de 12 GB de RAM. Las pruebas SBF usan dos jobs. El frontend contra el programa ya desplegado solo necesita Node/npm, navegador y wallet compatible. Rust se requiere para `verify` y generación del IDL. Las pruebas SBF requieren Python 3.12/pip; navegador usa Google Chrome instalado, sin descargarlo automáticamente.

## Instalación y ejecución en Devnet

Desde la raíz del repositorio recibido o de la copia de entrega descomprimida:

```bash
node --version
npm --version
npm ci --ignore-scripts
cp -n frontend/.env.example frontend/.env.local
npm run dev
```

Abrir la dirección local indicada por Vite, normalmente `http://localhost:5173`. La copia con `-n` conserva una configuración local existente; comprobar estos valores y reiniciar Vite si se editan:

```dotenv
VITE_KHIPUTRACE_PROGRAM_ID=GV8SZn6i29tL4CmJMei5P3N3BLUxVZBWrG6hFQVSVSBv
VITE_KHIPUTRACE_CLUSTER=devnet
VITE_KHIPUTRACE_RPC_URL=https://api.devnet.solana.com
```

Son valores públicos; `.env.local` se excluye de Git. La plantilla deja RPC vacío para usar ese endpoint oficial predeterminado. No poner claves, seed phrases ni tokens en variables VITE: se publican en el navegador.

Configurar una extensión Wallet Standard compatible con Devnet y firma de transacciones legacy. Conectarla desde la app y usar exclusivamente SOL de prueba; [faucet oficial](https://faucet.solana.com/). Cada operación consume comisiones y crear cuentas bloquea un depósito rent. No se necesita la wallet CLI de despliegue: cualquier wallet de prueba crea sus propias auditorías.

Para servir el build local de producción:

```bash
npm run build
npm run preview --workspace frontend -- --host 127.0.0.1
```

No se requiere contratar hosting. `Anchor.toml` conserva provider Localnet por seguridad y no controla la red del frontend. Estos pasos no despliegan, generan claves ni modifican configuración global. No ejecutar deploy para reproducir la demo.

## Pruebas y reproducción

Con Rust/rustfmt disponibles:

```bash
npm run verify
npm run check:idl
npm run check:dependencies
```

La última regresión 5.1 aprobó **119 pruebas** (4 scaffold, 75 Application, 16 Infrastructure y 24 Rust host), tipos estrictos, build y formato/check Rust. `verify` no ejecuta SBF ni navegador. `check:dependencies` consulta npm; bincode transitivo Rust conserva un aviso de fin de mantenimiento descrito en la revisión.

SBF, preparación opcional en Linux x86_64:

```bash
npm run setup:program-tests
KHIPUTRACE_EVIDENCE_PREFIX=demo-local npm run test:program
```

Descarga herramientas con hashes fijados en `.cache/sbf-tests`, aproximadamente 2,4 GiB; Cargo/target y dependencias requieren espacio adicional. No altera toolchains globales. Última ejecución 5.1: **17 casos, 95 transacciones locales**, 50 válidas y 45 rechazadas con estado comprobado. LiteSVM no es un validador completo ni consenso de cluster. El aviso histórico de syscalls del SDK local permanece documentado; el ELF se ejecutó y coincide con Devnet.

Pruebas de navegador (secuenciales, Google Chrome instalado):

```bash
KHIPUTRACE_EVIDENCE_PREFIX=demo-base npm run test:visual
KHIPUTRACE_EVIDENCE_PREFIX=demo-audits npm run test:audits
KHIPUTRACE_EVIDENCE_PREFIX=demo-findings npm run test:findings
```

Última ejecución 5.1: **11 + 10 + 9 aprobadas**. Combinan dobles de componentes/wallet y RPC mínimo con SBF local; sus firmas no son Devnet. Elegir prefijos nuevos para conservar evidencia previa.

`npm run test:devnet` y `npm run test:devnet-ui` **sin --execute** solo comprueban tipos. Los arneses operativos 4.1/4.2 están ligados a actores/IDs históricos y rechazan repetir reportes existentes; no son un comando de demo genérico. Para una demo nueva usar la UI, una wallet propia de prueba e IDs de auditoría nuevos, según [DEMO.md](docs/DEMO.md).

## Equivalencia de casos WayLearn y evidencia

La ruta propia utiliza estas equivalencias de competencias; no necesita implementar Registro/Cliente/Venta ni cierre de auditorías. Fuentes: [Pruebas y evidencias](https://waylearn.gitbook.io/solana-engineering-track-advanced/pruebas-y-evidencias), [proyecto final](https://waylearn.gitbook.io/solana-engineering-track-advanced/proyecto-final-y-certificado).

| Caso oficial | Caso equivalente KhipuTrace | Resultado comprobado |
| --- | --- | --- |
| Crear Registro y Cliente | Crear/leer Audit y Finding relacionado | Autoridad, relación y cuentas legibles |
| Registrar venta válida | Crear Finding | Contadores e ID siguiente incrementados |
| Corregir importe | Modificar Finding abierto | Misma cuenta/relación, contenido actualizado |
| Devolución válida | Resolver y cerrar Finding | Nota persistida, cuenta cerrada y contadores actualizados |
| Baja de cliente vacío, IDs no retroceden | Cerrar resuelto y crear siguiente Finding | ID cerrado no reutilizado; sin cierre de Audit adicional |
| Wallet no autorizada | Escribir en auditoría ajena | Rechazo Rust y datos intactos |
| Venta ajena al cliente | Combinar Finding y Audit ajenos existentes | Rechazo de relación/PDA y datos intactos |
| Baja con ventas activas | Intentar cerrar Finding abierto | Rechazo de precondición y cuenta conservada |
| Aporte propio y rechazo | Resolver con/sin acción válida | Resolve válido; nota inválida rechazada; IDs monotónicos tras cierre |

La evidencia Devnet 4.2 contiene **28 casos directos**, **8 etapas UI**, **19 rechazos de programa** y **16 transacciones válidas finalized**, incluyendo financiación del actor de prueba. El recorrido UI usó Wallet Standard de pruebas con firma oficial Node externa al navegador y RPC Devnet real; **no fue una extensión real**.

Ejemplos consultables:

- [Crear auditoría](https://explorer.solana.com/tx/5jndZYRjQf5pPTWyvGtHfoteXxUTBiUtvAHNyJBPJdKrm1m65Mz8ZHfwgSHU7UNRb7E94VKeYvjMWpqwfJpkCnCf?cluster=devnet).
- [Resolver con acción válida](https://explorer.solana.com/tx/2VRkLX7PBapVxGwCmTi4ffVV74krWe41EEWFPxDomACtHvP2kFiuFPi7vHFSj1VXB1vKkuWTsn8jAg72uZy3zWTC?cluster=devnet).
- [Cerrar resuelto](https://explorer.solana.com/tx/5zbJ1zrUhSRHqUMTRcPTZY33UjG9TWT8fxpAJ9UxXodrJt1TV4tPnTWmMv4EBSmVzJUqFh2bhpvDW2Qo1n3sDgEL?cluster=devnet).
- [Crear siguiente ID](https://explorer.solana.com/tx/3NUSLTr6oxyMXd3m78D1YfsU1sC9yYJB9Kr1Auzr7d3KSJfHEGhYVKWT72L3VLMSAsKXRuMjQzhSuYndxdUhZL32?cluster=devnet).

Los rechazos de preflight incluyen error/logs y estado inicial/final, sin inventar firma enviada. Las pruebas cubren además modificación de resuelto, nota inválida, longitudes/Unicode, owner/PDA/bump/firmas, overflows/underflows y rollback.

- [Registro completo y límites](docs/TEST_EVIDENCE.md).
- [Casos Devnet y snapshots](docs/evidence/4.2-devnet-acceptance.json), [UI Devnet](docs/evidence/4.2-ui-flow.json).
- [Captura Devnet escritorio](docs/evidence/4.2-ui-devnet-desktop.png), [móvil](docs/evidence/4.2-ui-devnet-mobile.png), [error del programa](docs/evidence/4.2-ui-devnet-error.png).
- [Resultados de revisión 5.1](docs/evidence/5.1-final-checks.json).

## Limitaciones y entrega

En Firefox se ha registrado una incidencia no reproducida ni corregida con Solflare: la extensión mostró “Network mismatch” a pesar de que el cliente usa RPC, genesis, blockhash y Program ID de Devnet. No se atribuye un defecto probado a Solflare ni al frontend, no se declaró una firma exitosa y no se implementó ningún workaround inseguro. El recorrido manual con otra wallet/extension compatible permanece pendiente.

Pendientes reales: recorrido humano con extensión, acceso remoto al repositorio y envío del formulario con identificación privada. No hay hosting publicado. No se hizo fuzzing, verificación formal ni revisión profesional independiente; no se ejecutó solana-test-validator/consenso. Anchor CLI/validador no están instalados en el entorno original; no hacen falta para usar el frontend contra Devnet. `check:toolchain` puede fallar por esas ausencias y no instala nada.

El programa sigue siendo actualizable por una sola wallet Devnet. bincode transitivo está sin mantenimiento. La lectura de múltiples cuentas puede quedar obsoleta; Rust sigue imponiendo autoridad, secuencia y estado. Los RPC públicos pueden limitar solicitudes. Devnet no ofrece conservación permanente garantizada de evidencias. Cerrar una cuenta no elimina el historial público de transacciones ni sus datos históricos.

La copia de entrega excluye wallets, entornos locales, cachés y dependencias; anonimiza rutas de usuario en metadatos históricos. Sus firmas/cuentas no se sustituyen. Los hashes históricos de archivos redactados describen originales locales; el manifiesto de entrega identifica los bytes efectivamente publicados. [Preparación y privacidad](docs/DELIVERY.md).

Documentos de entrega: [guion y reproducción de demo](docs/DEMO.md), [checklist final WayLearn](docs/DELIVERY_CHECKLIST.md), [progreso](docs/PROGRESS.md), [roadmap](docs/ROADMAP.md). Nombre del certificado y correo de registro se proporcionan únicamente por el [formulario oficial de entrega](https://airtable.com/appqcPkgPHDB6fyz7/pagtEQg4DjDOKDHIL/form).

Documentación final adicional: [matriz de cumplimiento WayLearn](docs/WAYLEARN_COMPLIANCE.md) y [guía breve de demostración](docs/DEMO_GUIDE.md).
