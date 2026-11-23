# Seguridad de KhipuTrace

## Alcance y estado

Actualizado en 2.2. Las cinco instrucciones validan firmas, autoridad, seeds, bump canónico, versión, estados, texto y contadores en Rust/Anchor. Hay pruebas host y 17 pruebas de transacciones SBF ejecutadas en LiteSVM local. Sus 45 rechazos verifican error del programa y estado intacto. No se acredita una auditoría independiente ni ejecución Devnet. Hay controles de red, cuentas, firma externa y confirmación en la infraestructura TypeScript; UI/wallet y pruebas finales de cluster siguen pendientes.

Activos: integridad de Audit/Finding, autoridad, contadores, secuencia de IDs, renta de cuentas, firmas y coherencia programa–IDL–cliente. Fronteras: navegador y wallet; adaptador y RPC; datos de instrucción y programa. Todo argumento y toda cuenta presentados por un cliente son entradas no confiables. El RPC puede fallar o entregar una vista obsoleta; la autorización final reside en Rust.

## Matriz de amenazas y controles

| Amenaza | Impacto | Control requerido | Evidencia de integración requerida |
| --- | --- | --- | --- |
| Wallet ajena intenta escribir | Alteración de auditorías y hallazgos | Signer y authority de Audit en cada instrucción; autoridad inmutable | Crear cuentas reales con A y operar con B: error específico y estado conservado. |
| Finding de otra auditoría | Corrupción entre agregados | owner, discriminator, PDA, seeds y referencia finding.audit | Combinar cuentas existentes de auditorías distintas. |
| PDA o bump manipulados | Sustitución o duplicación | init con bump canónico; validar seeds y bump persistido en escrituras | Dirección derivada con otra autoridad/ID; bump no canónico. |
| Reinicialización tras cierre | Reuso de identidad | No init_if_needed; next ID monotónico; Audit persistente | Crear, resolver, cerrar, intentar reutilizar el ID y crear el siguiente. |
| Resolución sin acción válida | Pérdida del aporte original | Solo Open; trim en Rust; mínimo 10 caracteres Unicode y máximo 512 bytes UTF-8 | Vacío, espacios, 9 caracteres ASCII/acentos/emojis, 513 bytes; aceptar 10 caracteres y 512 bytes. |
| Modificar resueltos o resolver dos veces | Transición ilegal | Estados explícitos y whitelist de transiciones | Repetir resolución y actualizar Resolved. |
| Cierre prematuro o renta desviada | Pérdida de cuenta/fondos | Solo Resolved; close hacia authority firmante | Cerrar Open y usar destinatario ajeno; conservar estado. |
| Overflow/underflow | IDs reutilizados o contadores corruptos | checked_add/sub; operación atómica; overflow-checks en release | Límites u64 y estados de prueba controlados, sin alterar cuentas Devnet arbitrariamente. |
| Strings demasiado grandes/multibyte | Serialización fallida o cómputo abusivo | Máximos UTF-8, espacio fijo con InitSpace y validación previa | ASCII, multibyte, vacío, espacios y límites de bytes. |
| Escritura concurrente con ID obsoleto | Hallazgo en identidad equivocada | Audit mutable y expected_next_id comparado en Rust | Dos solicitudes con mismo next ID: solo una prospera. |
| Owner/tipo de cuenta incorrecto | Lectura/escritura no válida | Account tipada y discriminador, System Program fijo para init | Sustituir por cuenta existente de otro tipo/programa. |
| Éxito visual antes de confirmar | Evidencia falsa o UI desactualizada | Confirmación con expiración y refresco; mostrar errores sin silenciarlos | Simular expiración, rechazo de firma y error RPC. |
| Programa o IDL equivocado | Firma de instrucción inesperada | Concordancia Program ID–IDL–cliente; configuración de red explícita | Rechazar IDL/dirección incompatibles antes de enviar. |
| Operación fuera de redes permitidas | Incumplimiento del alcance | Solo Localnet/Devnet; endpoint y genesis comprobados antes de escrituras | Rechazar red no permitida; nunca enviar a Mainnet. |
| Claves/seed phrase en archivos o evidencias | Compromiso de wallet | Wallet firma fuera del dominio; exclusiones Git; revisar diff y capturas | Comprobar archivos antes de commit; nunca usar una clave real como fixture. |
| Información sensible on-chain | Exposición irreversible | Datos sintéticos; advertencia y revisión del contenido de demo | Revisar datasets y capturas; no guardar reportes de seguridad reales. |
| Dependencia vulnerable o alterada | Compromiso de build/cliente | Versiones directas exactas, lockfiles y revisión de advisories | npm audit y revisión del grafo; no ejecutar audit fix --force a ciegas. |

## Política de datos, redes y privilegios

Solo texto sintético y mínimo on-chain. Las cuentas y el contenido pueden leerse públicamente; conectar una wallet no concede privacidad. No se almacena una lista creciente de referencias en Audit, documentos adjuntos ni datos personales. Cerrar una cuenta elimina su estado actual, pero no garantiza borrar el historial de la cadena.

El firmante es la authority de Audit. Solo al crear paga la renta; al cerrar recibe la renta. No hay roles administrativos, CPI de negocio, delegación, transferencias de autoridad ni operaciones sobre tokens. Las cuentas se marcan mutables únicamente si la instrucción lo requiere.

El scaffold configura Anchor en Localnet y no tiene scripts de deploy. `npm run verify` no firma ni contacta una red blockchain. La instalación futura puede usar cachés y toolchains de usuario; debe explicarse antes de cambiar configuración. Una exclusión `.gitignore` no protege claves ya versionadas: revisar archivos y diffs antes de cada publicación.

## Condiciones para habilitar operaciones reales

Implementar los contextos y validaciones, añadir pruebas positivas y negativas con cuentas válidas, comprobar estado tras cada rechazo y verificar el flujo en Localnet antes de pedir autorización para Devnet. Ningún botón deshabilitado ni error RPC cuenta como prueba de autoridad o pertenencia. Registrar firmas o errores de simulación sin inventar transacciones.

Pendientes conocidos: CLI Solana/Anchor/validador para integración RPC, integración wallet, evidencia Devnet y revisión de seguridad final. En 2.1 se generó IDL y se implementaron controles de red y cuenta ejecutable; se corrigieron los avisos npm mediante overrides probados. SBF y transacciones locales en LiteSVM se verificaron en 1.3. El detalle de verificaciones ejecutadas está en [TEST_EVIDENCE.md](TEST_EVIDENCE.md).

## Controles de creación y lectura implementados en 1.1

- Account<Audit>/Account<Finding> declaran owner y discriminator de KhipuTrace; no se usan cuentas de negocio sin tipo. System Program tiene su tipo Program<System>.
- CreateAudit exige authority firmante y pagadora. Usa init, espacio fijo y seeds con ID u64 de 8 bytes little-endian; guarda únicamente el bump obtenido del contexto.
- CreateFinding exige authority firmante, has_one contra Audit, PDA canónica de Audit, bump persistido canónico, versión compatible y ID igual a next_finding_id. Finding se crea con init y bump canónico, estado Open y remediation_note vacía. El cliente no puede elegir estado ni nota inicial.
- Las reglas puras validan título/description tras trim por bytes UTF-8 y calculan todos los incrementos con checked_add antes de escribir. Se rechazan contadores inconsistentes e IDs obsoletos. La atomicidad entre CPI y escrituras se apoya en la transacción Solana; falta comprobarla en un runtime local.
- La lectura es pública y no envía instrucciones: verifica owner, discriminator, versión, dirección canónica y bump. Finding también requiere una Audit válida, relación coincidente e ID ya emitido. La lectura no acredita por sí misma la procedencia de datos recibidos de un RPC; el adaptador futuro debe obtener cuentas del cluster permitido.
- Los constructores nativos preparan datos y no son instrucciones accesibles por una transacción. Desde 1.2 las instrucciones expuestas son create_audit, create_finding, update_finding, resolve_finding y close_finding; los constructores y helpers no son rutas adicionales de dispatch.
- La identidad provisional está claramente documentada y coincide en Rust/Anchor.toml. No es una dirección de un programa desplegado ni existe un keypair generado. Se debe sustituir por una identidad real autorizada antes de cualquier despliegue; esto cambiará también las PDAs.

Pruebas host: rechazos de firma ausente en ambos contextos generados; lectura con owner/tipo/PDA/bump incorrectos, bump alternativo válido pero no canónico, relación ajena, versión desconocida, ID no emitido y datos truncados; límites UTF-8, estados iniciales, aritmética y enums inválidos. Los fixtures están en memoria y no son cuentas existentes en Devnet. En 1.2 se añadió el rechazo de autoridad ajena marcada como firmante en contextos y dispatch nativo. Estos límites correspondían a 1.2. En 1.3 LiteSVM verifica firmas, CPI de creación, reembolso al cerrar, no reutilización de IDs y rollback. La concurrencia del validador permanece pendiente.

## Avisos históricos de dependencias encontrados en 0.2

`npm audit --json` devolvió 7 paquetes afectados (5 moderados y 2 altos), incluyendo propagación a Anchor y web3.js. Las causas transitivas son `toml`, `stream-json` y `uuid`; no equivalen a siete vulnerabilidades independientes. El informe propone cambios de major incompatibles o una versión `0.0.0` de Anchor como arreglo, por lo que no se aplica `audit fix --force`.

En 0.2 el scaffold importaba Anchor únicamente como tipos y no habilitó operaciones. Ese límite reducía la exposición sin resolver los avisos. En 2.1 se revisaron las versiones transitivas y se verificaron overrides compatibles con el uso del cliente; el audit final tiene cero avisos conocidos. La UI continúa informativa.

Ejemplos contrastados con avisos primarios: [recursión no controlada en toml](https://github.com/advisories/GHSA-82x6-q7mm-w9cf) y [prototype pollution en toml](https://github.com/advisories/GHSA-h895-cgqg-jf52). No forzar una versión transitiva de otro major sin revisar la API que consume Anchor.

## Controles y pruebas añadidos en 1.2

Update exige Open y valida todo el contenido antes de asignarlo; no modifica identidad, nota ni contadores. Audit y authority no necesitan escritura para esta operación. Resolve exige Open y una nota tras trim de al menos 10 valores escalares Unicode (no 10 bytes), limitada además a 512 bytes; solo entonces persiste Resolved y decrementa open_findings. No se permite resolver dos veces.

Close exige Resolved, nota válida, auditoría de la autoridad y contadores consistentes. La autoridad firmante es el único receptor de lamports y debe ser mutable; no se recibe una dirección de reembolso en los argumentos. Se comprueba checked_add del saldo de destino antes de permitir la salida con close=authority, evitando el unwrap interno de Anchor para esa suma. La preparación decrementa solo active_findings; la secuencia nunca retrocede. Se rechazan underflow y estados que dejarían open_findings > active_findings.

Los tres contextos nuevos validan ambos tipos de cuenta, pertenencia, versión, PDAs y bumps canónicos; CreateFinding también comprueba contadores en su contexto. No hay UncheckedAccount, realloc, init_if_needed ni firmas delegadas. Los estados rechazados se prueban con snapshots de bytes y saldos, tanto en reglas como en dispatch nativo de update/resolve. Las pruebas de contextos demuestran rechazo de una authority ajena con is_signer=true; no verifican firmas criptográficas ni equivalen a transacciones de cluster.

El cierre físico se delega en Anchor. En 1.3 se ejecutó en LiteSVM, comprobando eliminación/vaciado de cuenta, reembolso íntegro a la autoridad, contadores y rollback. También se ejecutó CPI de creación. La concurrencia de un validador permanece pendiente. Los avisos npm permanecían abiertos al cerrar 1.3; se corrigieron en 2.1. La integración con UI/wallet sigue pendiente.

## Evidencia transaccional de 1.3

Las pruebas usan cuentas creadas por el programa y wallets efímeras que firman en memoria. Verifican autoridad ajena en las cuatro operaciones de Finding, firma ausente en los cinco contextos, auditoría ajena, seeds incorrectos, owner incorrecto, enum inválido, límites UTF-8, estados y acción correctiva. Cada rechazo exige error exacto y logs de KhipuTrace y compara datos, propietario y lamports de las cuentas observadas. El pagador independiente queda excluido de esa igualdad porque paga comisiones incluso cuando falla una transacción.

Los límites u64, contadores corruptos, saldo receptor máximo y bump/versión incorrectos se preparan con set_account del harness antes de enviar una transacción real al runtime. No se presentan como alteraciones disponibles a una wallet a través del programa. El estado comparado es el posterior a preparar el fixture y anterior al intento rechazado.

Se comprobaron rollback de resolución y rollback de cierre/reembolso ante un fallo posterior dentro de la misma transacción. El cierre exitoso mantiene next_finding_id y permite crear el siguiente ID; intentar volver a crear el ID cerrado falla y conserva el estado.

No se guardan claves privadas; las herramientas descargadas y las dependencias de pruebas permanecen en caché ignorada y se verifican mediante hashes. El harness no usa RPC ni tiene ruta de despliegue. El SDK oficial incluye syscalls.txt vacío y produce un aviso estático de syscalls desconocidas; el aviso se conserva en el log. El ELF se cargó y ejecutó correctamente en LiteSVM, incluidas esas llamadas en los recorridos probados. Esto no sustituye validar el entorno de despliegue futuro.

## Controles de infraestructura TypeScript — 2.1

| Amenaza | Control implementado | Límite |
| --- | --- | --- |
| Conectar a red no permitida | Configuración Localnet/Devnet; Devnet solo endpoint oficial; Localnet loopback; comprobación de genesis antes de operar y de nuevo tras firmar | Un RPC local que mienta queda fuera de la garantía; controlar el validador propio. |
| Program ID arbitrario o inexistente | Sin ID predeterminado; igualdad con IDL generado; cuenta executable con owner loader Solana admitido | La identidad actual solo es de compilación. No acredita programa desplegado; debe sincronizarse antes del despliegue autorizado. |
| Cuentas ajenas, versiones o enums inesperados | Owner, discriminator, tamaño, versión, PDA/bump, parent/autoridad, ID emitido, contadores y contenido comprobados al mapear | El RPC sigue siendo una fuente de confianza; no hay verificación criptográfica de su respuesta. |
| Pérdida de precisión en IDs | BN y bigint; u64 acotado; seeds little-endian de 8 bytes | No usar number para IDs ni contadores. |
| Falsos listados vacíos | Solo ausencia real devuelve null/lista vacía; RPC/decode/validaciones fallidas lanzan RepositoryError | Lecturas múltiples no constituyen snapshot atómico; refrescar si hay concurrencia. |
| Firma de mensaje modificado o wallet cambiada | Solo publicKey/signTransaction; mensaje comparado, firmas verificadas y wallet vigente comprobada | No sustituye revisión del usuario en su wallet. No se crean ni almacenan claves en producción. |
| Éxito prematuro o duplicación | Preflight activado; confirmación con blockhash y altura de expiración; err comprobado; firma conservada ante incertidumbre; sin reenvío automático con nuevo blockhash | Confirmed puede sufrir rollback; no equivale a finalized. Consultar la firma antes de repetir un resultado incierto. |
| Dependencias vulnerables | Overrides limitados: toml 5.0.1 y jayson 5.0.0; lockfile e instalación limpia; pruebas reales de SDK/transporte y bundle | npm audit solo refleja avisos conocidos; no certifica seguridad exhaustiva. |

El problema de dependencias descrito en 0.2/1.3 se corrigió en este submódulo sin cambiar las versiones directas Anchor/web3.js. Las incompatibilidades relevantes de las majors transitivas se revisan en ARCHITECTURE.md: TOML cambia el manejo de enteros grandes y límites de parsing, pero el frontend no analiza TOML de usuarios; el JSON-RPC de web3.js se prueba con el jayson nuevo. No se ejecutan instaladores npm mediante scripts y no se usa audit fix --force.

Las pruebas de adaptadores son locales: gateways/wallets controlados y respuestas sintéticas, más decodificación de cuentas realmente producidas por SBF en la evidencia 1.3. No simulan una confirmación Devnet como si fuera real ni publican firmas locales en Explorer. No se modifica el programa Rust, cuyos controles siguen siendo la autoridad definitiva. No se ejecutan despliegues, transacciones externas ni pruebas con datos personales.

## Validaciones de Application — 2.2

La capa Application valida entradas para UX antes de solicitar una operación: rango/tipo bigint, sintaxis de dirección, campos obligatorios, UTF-8, Unicode válido, gravedad y acción correctiva. Reutiliza límites y trim puros de Domain; Infrastructure mantiene sus comprobaciones de datos externos. La sintaxis de dirección en Application no acredita una clave pública de 32 bytes, ownership, PDA, existencia o autoridad.

Ningún caso decide permisos o transiciones mediante una lectura previa. Las operaciones que cambien un estado ya resuelto, intenten cerrar Open, usen un ID obsoleto o una wallet ajena deben seguir siendo rechazadas por Rust, aunque se omitan todas las validaciones UX. No se altera el programa ni se relajan controles del adaptador.

Los errores de validación identifican campo/código. Los errores del repositorio conservan firma y causa, incluida confirmación incierta; no se convierten en éxito, reintentos o listas vacías. Las cinco escrituras esperan la promesa del repositorio. Las pruebas con promesas controladas comprueban esa espera, sin presentar el recibo simulado como una confirmación de cluster.

No se agregan credenciales, claves, endpoints o Program IDs ni se habilita la UI operativa. Continúan pendientes identidad/despliegue autorizados, wallet y verificación real de integración. Las pruebas de Application no sustituyen las negativas on-chain de 1.3 ni las pruebas de infraestructura de 2.1.

## Amenazas y controles de la base visual — 3.1

| Amenaza | Control aplicado | Límite / verificación |
| --- | --- | --- |
| Confundir conexión con autorización | Mensaje previo explícito; no se solicita firma y Rust conserva permisos definitivos. | Conectar no acredita propiedad de cuentas ni autoriza escrituras. |
| Filtración de secretos/sesión | Solo dirección pública y nombre en memoria; sin almacenamiento web, claves, seed phrases o autoconexión. | Las extensiones tienen su propia gestión de permisos. |
| Cuenta o proveedor incompatible | Tres features estándar versionadas, soporte Devnet, publicKey de 32 bytes y correspondencia dirección/bytes. | Anunciar Devnet no prueba la red seleccionada en la extensión ni reemplaza la validación RPC. |
| Aprobación o lectura tardía tras cancelar/cambiar wallet | Tokens de conexión, revisión de eventos y generación de consultas; datos vinculados a autoridad actual. | Se ignora el resultado obsoleto; esto no revoca permisos concedidos en la extensión. |
| Fallo al desconectar | Sesión local se limpia antes de invocar proveedor; error explica revisar wallet/permisos. | No se afirma revocación de permisos de la extensión. |
| Red o programa equivocado | Red objetivo Devnet fija; ID explícito concordante con IDL, genesis y cuenta ejecutable comprobados en infraestructura. | No hay ID operativo predeterminado ni despliegue realizado. |
| Datos falsos o error presentado como cero | «—» hasta lectura correcta; error/reintento visibles; no mocks en runtime. | RPC sigue siendo fuente de confianza; las pruebas interceptadas no acreditan Devnet. |
| Firma accidental en base visual | Runtime sin firmante y UI solo de lectura mediante Application. | Antes de habilitar futuras escrituras se deberá informar operación/cuentas/efectos y probar firma/confirmación reales. |

El diálogo de conexión informa que no solicita firmas ni mueve fondos. El badge Devnet representa el destino de la aplicación, no la configuración actual de la wallet. Los datos on-chain son públicos: la guía pide usar contenido sintético y fondos de prueba. Títulos/direcciones se renderizan como texto React, sin HTML externo.

Las pruebas de navegador bloquean tráfico externo, usan cuentas públicas sintéticas y una feature de firma que falla si se invoca. Cubren rechazo, cancelación con aprobación tardía, cambio de cuenta, pérdida de soporte Devnet, desconexión fallida y lectura obsoleta. No se ejecutaron transacciones, una extensión real, pruebas nuevas SBF ni despliegues. npm audit reportó cero vulnerabilidades conocidas tras agregar las dependencias; no constituye una certificación de seguridad.

## Gestión de auditorías y firma — 3.2

La conexión sigue sin solicitar firma; crear exige una revisión explícita con red, wallet, ID, título y advertencia de comisión/rent y datos públicos. El usuario revisa los importes en su wallet. El programa continúa imponiendo firma, PDA, límites y unicidad; las validaciones UX reutilizadas no sustituyen Rust.

| Amenaza | Control de 3.2 | Límite |
| --- | --- | --- |
| Wallet solo de lectura tratada como firmante | Feature versionada con legacy y soporte en la cuenta; botón de creación deshabilitado si falta. | La wallet externa decide aprobar/rechazar. |
| Cambio de cuenta o mensaje durante la firma | Snapshot de proveedor/cuenta y tokens; comparación exacta de mensaje y firmas criptográficas; wallet revalidada tras la última espera RPC. | No cancela una transacción ya enviada; su firma permite consultar el resultado. |
| Doble envío o confirmación prematura | Bloqueo síncrono de envío en formulario; pendiente hasta resolver el caso de uso; recibo solo tras confirmación. | Cerrar la página no revierte una operación emitida. |
| Confirmación incierta | Firma y mensaje específicos; formulario no permite reenviar/editar esa operación, sin reintento automático. | Verificar firma antes de abrir otro intento. No hay reconciliación automática nueva. |
| Error de refresco interpretado como fallo de creación | Recibo separado del listado y refresco posterior explícito; no se oculta éxito confirmado. | Listado puede quedar temporalmente sin actualizar; muestra error/reintento. |
| ID con pérdida de precisión o texto inválido | Decimal a bigint, rango u64 y límites/trim UTF-8 reutilizados de Application; sin truncar. | Rust valida definitivamente al ejecutar. |
| Red o programa incorrecto | Cluster permitido y endpoint restringido; IDL/Program ID, genesis y cuenta ejecutable verificados antes de operar. | Sin despliegue Devnet configurado; no se certifica una extensión real. |
| Datos/recibos de otra wallet | Página y formulario ligados a autoridad; consultas obsoletas descartadas; detalle restringido visualmente a auditorías propias. | Leer cuentas públicas no constituye autorización para escribir. |

No se almacenan claves privadas o seed phrases en la aplicación. La wallet de pruebas genera Ed25519 en memoria con clave privada no extraíble y nunca la exporta; los fondos y cuentas existen solo en LiteSVM. El arnés escucha exclusivamente loopback, acepta preflight y ejecuta el programa real; no debe usarse como RPC público ni conectarse a wallets personales. Las evidencias contienen cuentas/firma públicas y logs, no secretos. Simulaciones rechazadas se etiquetan prepared_not_submitted; las firmas ejecutadas solo son locales, sin Explorer.

No se cambian reglas on-chain, no se añaden operaciones visuales de hallazgos, no se despliega ni se configura Mainnet. Extensión real, validador y transacciones Devnet quedan como limitaciones explícitas.

## Controles de hallazgos desde React — 3.3

| Amenaza | Control / comportamiento |
| --- | --- |
| Resolver sin corrección válida | Formulario valida mediante Application; Rust mantiene mínimo Unicode y límite UTF-8. No se solicita firma con entradas inválidas. |
| Edición de resuelto o cierre de abierto | Acciones visibles según estado leído; los controles definitivos siguen en Rust y se verifican con transacciones obsoletas/negativas. |
| Reutilización de IDs tras cerrar | Crear toma nextFindingId leído, no activeFindings ni longitud de la lista. El programa valida secuencia canónica. |
| Autoridad o auditoría cambiada | Espacios ligados a autoridad/auditoría, validación de firmante existente y consultas con tokens; respuesta tardía descartada. |
| Doble clic, navegación o estado pendiente | Guard síncrono de envío, acciones/selector bloqueados durante espera y página montada al navegar. No se declara éxito hasta recibir confirmación. |
| Confirmación incierta | Firma conservada, nuevos envíos bloqueados en el espacio, sin reenvío automático. Verificar el resultado antes de reiniciar/repetir. |
| Refresco fallido después de éxito | Recibo independiente de consulta, error/reintento visibles; no convierte éxito confirmado en fracaso ni incrementa/decrementa contadores locales. |
| Cierre accidental | Diálogo nativo, foco explícito en Cancelar, checkbox de aceptación y botón de confirmar/firma. Escape cancela antes del envío; durante la operación no cierra el diálogo. |
| Texto no confiable / accesibilidad | Render como texto React, sin HTML externo; etiquetas, mensajes por campo, aria-invalid, estados/alertas y gravedad/estado con texto además de color. |

La revisión previa explica los datos públicos, comisión y rent al crear. El cierre devuelve el saldo exclusivamente a la autoridad validada por Rust; la UI solo informa el efecto. Desconectar o cerrar una página no revierte una transacción ya emitida. Las lecturas separadas pueden quedar obsoletas y nunca se usan para sustituir autorización, pertenencia o transición del programa.

Las pruebas con programa real local incluyen ID obsoleto tras cerrar otra transacción, modificación de un hallazgo ya resuelto por otra transacción y cierre directo de un abierto; se comprueban logs/códigos del programa y cuentas intactas. Las transacciones concurrentes son firmadas por la misma wallet efímera mediante el protocolo de prueba y ejecutadas en SBF, sin manipular cuentas para fabricar rechazos. Los dobles de componentes se identifican por separado y no se presentan como datos Devnet.

No se modifica Rust/IDL, manejan secretos, añaden dependencias, publican datos reales, despliega o accede a Mainnet. La evidencia de LiteSVM no acredita consenso de cluster, validador o extensión real. Preparación de identidad y recorrido Devnet permanecen pendientes de instrucciones/autorización.


## Preparación del despliegue Devnet — 4.1

| Amenaza | Control aplicado / pendiente |
| --- | --- |
| Exposición o incorporación de secretos | keygen oficial con --silent; directorio externo ~/.local/share/khiputrace/devnet con 700 y archivos 600. Evidencia solo de direcciones/rutas/permisos. Sin claves en frontend, repositorio o logs. |
| Claves predecibles / sobrescritura | Aleatoriedad del keygen oficial; sin seed fija, --force ni claves de fixtures. Script idempotente conserva las existentes y rechaza enlaces simbólicos en archivos/directorio final. |
| Despliegue accidental o en otra red | No ejecutado. URL oficial Devnet y wallet explícitas; genesis comprobado; provider local conservado; autorización expresa antes de deploy. Mainnet prohibida. |
| Identidad compilada divergente del cliente | Clave pública real sincronizada en Rust/Anchor/IDL/tipos/frontend. Nuevo build SBF y comprobación RPC/identidad; cuenta ejecutable aún ausente. |
| Recuperación de buffer que exponga seed en errores | Buffer con keypair propio externo preparado y flag --buffer explícito en el comando propuesto; no depender de buffer efímero generado por CLI. |
| Pérdida de control de actualizaciones | Upgrade authority y fee payer explícitos: wallet Devnet del usuario. Sin --final, transferencias o cierre de programa. Copia de respaldo protegida fuera del proyecto si se realiza. |
| Saldo insuficiente / ejecución parcial | Saldo consultado: 0. Rent real consultado, reserva conservadora y comisiones separadas. No desplegar sin fondos; ante error consultar buffer/programa antes de reenviar. |
| Declaración de éxito sin evidencia | Program ID real preparado no equivale a programa desplegado. Pendientes owner/executable/ProgramData/authority/hash remoto y transacción confirmada con cuenta releída. |

Los archivos de claves no están cifrados; sus permisos restringen acceso al usuario actual y son exclusivamente Devnet. Las CLI están fijadas y verificadas en caché local, sin cambios globales. Anchor CLI continúa ausente y no es necesaria para el procedimiento documentado. El aviso histórico de syscalls del SDK vacío sigue registrado; LiteSVM ejecuta el ELF pero aún falta aceptación del loader Devnet. No se omiten preflight ni feature verification para ocultar incompatibilidades. Presupuesto, identidades y procedimiento: [DEPLOYMENT.md](DEPLOYMENT.md).


### Resultado autorizado y verificado — cierre de 4.1

El usuario autorizó expresamente el despliegue con límite de 3 SOL Devnet. La comprobación previa fijó genesis, ELF/hash, identidades, permisos y saldo de 10 SOL. Primer intento con --use-rpc: escritura parcial y fallo de reintentos, con 429 observado en lectura auxiliar. Se consultaron programa ausente, buffer y saldo antes de reanudar con QUIC/un intento, sin cambiar el programa, autoridad, clave de buffer ni ELF y sin omitir preflight/feature verification. Los avisos de offload UDP permanecen en el log.

Resultado remoto: executable true, owner Upgradeable Loader, ProgramData/upgrade authority correctos, hash directo y dump idénticos al binario aprobado; buffer cerrado y saldo devuelto por el loader. Despliegue y CreateAudit con estado finalized y err null. La prueba de negocio usa Application/Infrastructure existentes y Wallet.local oficial leyendo el archivo externo; no parsea secretos en código propio ni los pasa a React/navegador. Relee PDA/autoridad/título/ID/contadores y conserva firma ante incertidumbre. Gasto neto total 1,39334556 SOL Devnet, inferior al límite autorizado; saldo final 8,60665444 SOL.

El aviso histórico de clasificación de syscalls no impidió la aceptación por el loader ni CreateAudit real; no se oculta ni se presenta como garantía de todas las operaciones Devnet. Siguen pendientes el recorrido completo de hallazgos y pruebas negativas con extensión real en Devnet. No se tocó Mainnet, publicó frontend, transfirió autoridad o hizo inmutable el programa. Claves y configuración global conservan su protección. Evidencias públicas y límites en [DEPLOYMENT.md](DEPLOYMENT.md).


## Evidencias de aceptación Devnet — 4.2

18 solicitudes directas inválidas y una edición obsoleta desde UI alcanzaron el programa en el RPC Devnet. Se comprobaron logs/códigos esperados, estado inicial/final y datos/owner/lamports/executable idénticos en las cuentas de negocio. Wallet secundaria real financiada (no cuenta ausente), auditorías existentes con autoridad válida para las relaciones incorrectas, PDAs de hallazgos existentes y transiciones definidas. Los rechazos de preflight no tienen firma enviada ni se atribuyen a botones. Hay 16 transacciones válidas finalized verificadas directamente, cierre con refund a autoridad e IDs no reutilizados.

Se probó rollback de una transacción con actualización válida seguida por resolución inválida. El cierre conserva nextFindingId; intentar recrear el ID cerrado se rechaza con 6008. Corrección vacía/corta/espacios, límite UTF-8, edición/resolución de resuelto y cierre abierto se comprobaron en Rust, sin modificar el programa.

El proveedor Wallet Standard de pruebas utiliza firma oficial Node con keypair fuera del proyecto; no exporta claves privadas al navegador. Solo firma una instrucción del Program ID autorizado para la auditoría/PDAs de la prueba y con un máximo de firmas. No es una función del frontend productivo ni una extensión real. Revisión humana con extensión permanece pendiente. Un fallo de consulta posterior a una escritura confirmada se reconcilió por firma/estado, sin reenvío; lecturas de evidencia tienen reintentos acotados y logs de fallos/429.

Claves de actor no autorizado externas con permisos 600 y directorio 700; fondos exclusivamente Devnet, datos sintéticos. La wallet secundaria conserva 0,03 SOL de prueba, no considerados comisión. La disminución conjunta por rent/comisiones es 0,01134744 SOL; presupuesto operativo respetado. Sin Mainnet, despliegue nuevo, cambios de autoridad, secretos en evidencia, dependencias o configuración global nuevas. Matriz de casos y pendientes en [TEST_EVIDENCE.md](TEST_EVIDENCE.md).


## Estado actual: revisión interna 5.1

Prevalece el informe [SECURITY_REVIEW.md](SECURITY_REVIEW.md) sobre los pendientes históricos resueltos arriba. No se identificaron críticos/altos en el alcance revisado. Dos riesgos medios: cobertura con extensión real pendiente y autoridad de actualización concentrada en una wallet Devnet. Tres bajos: control estático de SDKs en Presentation (corregido con regresión), bincode transitivo sin mantenimiento y ausencia de historial Git revisable. Los cuatro riesgos pendientes no se ocultan ni se consideran corregidos.

Se contrastaron los 158 paquetes registry de Cargo.lock con OSV/RustSec; el aviso Borsh se descartó para 0.10.4 conforme al parche documentado por RustSec. El aviso informativo de bincode permanece, sin parche disponible; no se forzó una sustitución incompatible. npm audit no encontró vulnerabilidades conocidas en esta ejecución. Búsqueda acotada de patrones de secretos/archivos de keypair sin candidatos, permisos externos 700/600 verificados; no garantiza ausencia universal ni incluye historial inexistente.

Sin cambios de Rust, IDL o dependencias. El ELF recompilado conserva su hash y coincide byte a byte con ProgramData Devnet en una consulta finalized de solo lectura; autoridad y genesis correctos. No hubo despliegues, firmas ni escrituras Devnet en 5.1. Esta revisión interna no es una auditoría profesional ni certificación.

## Estado documental 5.2

La revisión final no encontró cambios de seguridad que requieran modificar el producto. Los controles presentados arriba siguen válidos; se mantienen como pendientes el recorrido humano con extensión real, el consenso/validador completo, el fuzzing, la verificación formal y la auditoría independiente.

Se verificaron de nuevo la coherencia del IDL/cliente/Program ID y el genesis Devnet mediante comprobaciones de solo lectura. No se enviaron instrucciones ni se cambió el estado on-chain.
