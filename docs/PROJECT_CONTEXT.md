# Contexto de KhipuTrace

Proyecto propio del bootcamp WayLearn Solana Engineering Track: Advanced. MVP de auditorías (`Audit`) y hallazgos (`Finding`), con autoridad por wallet y cuentas PDA en Solana. Redes permitidas: Localnet y Devnet; Mainnet prohibida.

El alcance mínimo, las reglas permanentes y la equivalencia con los casos oficiales están en [AGENTS.md](../AGENTS.md). La arquitectura usa Rust/Anchor y un cliente TypeScript estricto con React/Vite; no requiere backend ni base de datos.

El aporte original previsto es resolver únicamente con acción correctiva válida y cerrar únicamente resueltos, conservando contadores y sin reutilizar IDs. En 1.1 se implementaron los modelos y la creación/lectura base en Rust. En 1.2 se completaron las cinco instrucciones, con resolución condicionada a un mínimo de 10 caracteres Unicode y máximo 512 bytes tras trim. En 1.3 se ejecutó el ciclo completo en SBF mediante LiteSVM local, incluido cierre físico y rollback. Hay una identidad pública provisional para compilación/pruebas, sin clave privada ni despliegue asociado. Las pruebas generan claves solo en memoria y ejecutan transacciones locales; no hay claves en disco ni transacciones Devnet.

Entorno del usuario: Linux Mint 22.3, 12 GB de RAM declarados y VS Code. El diagnóstico observó aproximadamente 24 GiB libres en `/home`; usar compilaciones limitadas a dos jobs y evitar servicios simultáneos innecesarios. No cambiar configuración global sin explicar previamente el cambio.

Estado actual, 4.2: verificación automatizada contra criterios WayLearn ejecutada; 28 casos cliente/programa aprobados (18 rechazos) y 8 etapas UI de producción contra Devnet con otro rechazo Rust visible. 16 transacciones válidas finalized, snapshots antes/después y firmas/logs reales. Datos sintéticos y claves exclusivamente externas. No cambió el programa ni el frontend productivo. La revisión humana con extensión real y la entrega final siguen pendientes, sin presentar el proveedor Wallet Standard de pruebas como una extensión. Casos y estados: [TEST_EVIDENCE.md](TEST_EVIDENCE.md); equivalencia oficial en README. Siguiente propuesto 4.3, sin iniciar.

Resultado de 4.1: **completado**, después de autorización explícita del usuario con límite de 3 SOL Devnet. Programa `GV8SZn6i29tL4CmJMei5P3N3BLUxVZBWrG6hFQVSVSBv` desplegado y verificado: executable, owner, ProgramData/authority y hash remoto iguales al ELF local. Despliegue y CreateAudit real finalized sin error, mediante los casos de uso/adaptadores del cliente. Gasto neto total observado 1,39334556 SOL Devnet; saldo final 8,60665444 SOL. Claves exclusivamente fuera del proyecto con permisos restringidos. El primer intento RPC falló y se reanudó con QUIC sobre el mismo buffer; logs y firmas conservados. Detalles: [DEPLOYMENT.md](DEPLOYMENT.md). Pendiente de instrucciones: recorrido completo Devnet con extensión real y evidencias finales. Las secciones anteriores por submódulo conservan su estado histórico.

El usuario definió 0.2 como diseño y preparación de arquitectura; reemplaza la propuesta anterior de usar ese número para preparación del entorno. Las tareas futuras están en [ROADMAP.md](ROADMAP.md); no están autorizadas por figurar allí.

En 1.1 el usuario autorizó modelos Audit/Finding y únicamente la base para crear y leer ambas cuentas. Esta instrucción prevalece sobre la propuesta anterior de separar sus creaciones en 1.1/1.2. Se conservaron version y description del diseño, se adoptaron los nombres on-chain propuestos y no se modificó el frontend. El límite de herramientas de 1.1/1.2 se resolvió para pruebas en 1.3 con build-sbf y platform-tools en caché local, sin cambios globales. El programa se ejecutó en LiteSVM; no se ejecutó un servidor RPC ni validador persistente.

El alcance explícito de 1.2 reemplazó la propuesta previa de usar ese submódulo solo para integración: autoriza las cinco instrucciones, sin frontend. El mínimo de 10 caracteres sustituye el diseño previo de 12 bytes. No se cambiaron los tamaños de cuentas ni las dependencias.

El alcance de 1.3 es la suite positiva/negativa del programa. Resultado: 17 casos y 95 transacciones, con 45 rechazos del programa y estado intacto. Las herramientas de prueba son Python/unittest y solders 0.26.0 con LiteSVM, aisladas del frontend. No se cambiaron instrucciones ni reglas de negocio. El IDL se genera en 2.1; RPC/validador, integración con UI/wallet y Devnet siguen pendientes.

En 2.1 se implementa infraestructura TypeScript con Program<Khiputrace>, PDAs, mappers y los cuatro puertos de repositorio existentes. La firma la proporciona una wallet externa; Domain solo agrega errores del límite, sin SDK. En ese submódulo no se implementaron casos de uso ni UI operativa. El IDL oficial se genera mediante anchor-lang-idl, sin instalar Anchor CLI. Los overrides de toml/jayson corrigen los avisos npm y se verifican con instalación limpia y tests. No existe identidad desplegada: la configuración exige Program ID explícito coincidente con IDL y comprobación de programa ejecutable, y no presenta la identidad de compilación como Devnet.

En 2.2 se implementaron CreateAudit, GetAudits, CreateFinding, GetFindings, UpdateFinding, ResolveFinding y CloseFinding, cada uno con puertos estrechos inyectados. Application valida entradas para UX, normaliza texto y propaga errores/recibos sin SDK, consultas previas para autorizar ni reintentos. Los límites y trim compartidos viven en Domain; las reglas definitivas de estado/autoridad continúan en Rust. La composición expone solo casos de uso. Resultado: 74 pruebas unitarias con repositorios simulados, más regresión de infraestructura/arquitectura/Rust. La UI permanece informativa; no se agregan dependencias, endpoints, Program IDs ni claves. Siguiente propuesto: 2.3, pendiente de instrucciones.

## Actualización 3.1: base visual

El usuario asignó 3.1 a la base visual React; este alcance sustituye la propuesta anterior de integración completa en Localnet. Se implementan layout, navegación, dashboard, wallet, Devnet, carga/errores y notificaciones, sin formularios completos ni operaciones de escritura desde la UI. La integración completa continúa pendiente.

La identidad visual es propia: marca inspirada en cuerdas/nudos de un khipu, SVG nativo y paleta azul oscuro/menta. Sin servicios externos, fuentes remotas, backend o base de datos. Wallet Standard conecta solo la identidad pública; Application permanece independiente de SDK y los componentes reciben casos de uso por composición. Sin ID configurado se informa esa limitación, sin resultados inventados. Las pruebas de navegador utilizan wallets y RPC controlados, no una extensión ni Devnet real. Siguiente propuesto: formularios de auditorías, con numeración y alcance sujetos a nueva instrucción.

## Actualización 3.2: gestión de auditorías

El alcance explícito del usuario reemplaza la propuesta de usar 3.2 para desplegar Devnet. Autoriza crear/listar/consultar auditorías, contadores, validación, transacciones y refresco, con pruebas locales si no hay despliegue. No autoriza desplegar ni añadir operaciones visuales de hallazgos.

Se añade GetAudit sobre el puerto AuditReader existente; la UI usa audits.create/list/get. La composición habilita firma únicamente para crear auditorías. El adaptador Wallet Standard serializa transacciones legacy y recibe la firma externa; no maneja secretos. La configuración distingue Localnet/Devnet y conserva restricciones de RPC e identidad. No hay archivos .env operativos ni despliegue Devnet configurado en la carpeta inspeccionada.

La ejecución local usa el ELF de 1.3 en LiteSVM, con transporte RPC/WebSocket temporal exclusivo de pruebas y wallet Ed25519 no extraíble generada dentro del navegador. El producto no recibe un backend nuevo. Estas transacciones locales no tienen enlaces Explorer; el rechazo de preflight no se presenta como firma enviada. Extensión real, validador Solana e integración Devnet continúan pendientes. Siguiente propuesto: gestión visual de hallazgos, con alcance/numeración por nueva instrucción.

## Actualización 3.3: flujo de hallazgos React

El usuario redefine 3.3 como UI de hallazgos y revisión del flujo completo; sustituye la propuesta anterior de usar ese número para recorrido Devnet/entrega final. No autoriza desplegar, publicar o añadir funciones ajenas al MVP.

Se conectan los cinco casos de uso de Finding existentes. La composición reutiliza un único mecanismo de firma externa para auditorías y hallazgos. La UI incorpora selección de auditoría, formularios, revisión, lista con gravedad/estado, acción correctiva y confirmación de cierre. Estado del programa y contadores se vuelven a leer después de confirmar, sin cambios optimistas ni cálculo de IDs por cantidad de cuentas.

Se mantiene el mismo programa/IDL y entorno LiteSVM local; no hay migración de estado ni dependencias nuevas. El flujo de producción local usa firmas efímeras y programa real. Los errores por estado obsoleto llegan desde SBF, se presentan con mensaje/código y se verifica conservación de cuentas. Extensión, validador y Devnet siguen pendientes. Siguiente propuesto: preparar identidad/toolchain e integración Devnet, con autorización y alcance explícitos; no iniciado.


## Actualización 5.1: revisión interna final

El usuario autorizó revisar seguridad/arquitectura y corregir defectos críticos o altos; no autorizó nuevas operaciones de producto ni despliegues. No se identificaron críticos/altos dentro del alcance revisado. Se reforzó únicamente el verificador de arquitectura para impedir imports directos de SDKs blockchain en Presentation y se añadió su regresión. Programa, frontend productivo, IDL y dependencias se conservaron.

Dos riesgos medios y tres bajos documentados (un bajo corregido); detalles, contraste de avisos transitivos, cobertura y límites en [SECURITY_REVIEW.md](SECURITY_REVIEW.md). La aceptación automatizada Devnet 4.2 se conserva; en 5.1 hay regresión local y lectura remota del ELF, sin transacciones nuevas. Extensión real, historial Git y preparación de entrega siguen pendientes. Siguiente propuesto 5.2, sujeto a instrucciones; detenido al terminar 5.1. No es auditoría profesional.

## Actualización 5.2: documentación final

Se consultaron de nuevo las fuentes oficiales de proyecto final y pruebas/evidencias. Se completó la documentación final permitida sin modificar Rust, TypeScript, React, IDL, contratos, dependencias, configuraciones de despliegue ni Program IDs.

Se añadieron la matriz WayLearn y la guía breve de demostración, y se actualizaron el README y los documentos de seguimiento. `npm run verify` y `npm run check:idl` aprobaron; una consulta HTTPS confirmó el genesis Devnet `EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG`.

El recorrido humano con una extensión real, el acceso público al repositorio y el envío del formulario siguen pendientes. No se creó Git ni se hicieron commits, push o despliegues en 5.2.
