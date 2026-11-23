# AGENTS.md — Reglas permanentes de KhipuTrace

## Propósito y alcance

KhipuTrace es una aplicación descentralizada para gestionar auditorías y hallazgos de seguridad mediante Solana. Es un proyecto propio para WayLearn Solana Engineering Track: Advanced.

Priorizar un producto mínimo completo, seguro y verificable en Devnet. Estas reglas aplican a todo el proyecto y a cada submódulo. Las instrucciones explícitas del usuario determinan el alcance autorizado; no ampliar ese alcance por iniciativa propia.

## Flujo de trabajo obligatorio

1. Trabajar solamente en el módulo y submódulo solicitado. No implementar funciones de módulos futuros.
2. Leer este archivo, la documentación persistente disponible y el código relacionado antes de modificarlo.
3. Conservar las decisiones arquitectónicas documentadas. Explicar cualquier cambio necesario dentro del alcance actual.
4. Implementar la solución mínima mantenible. Evitar refactorizaciones ajenas al objetivo y dependencias innecesarias.
5. Escribir pruebas de la funcionalidad desarrollada, incluidas pruebas negativas de reglas críticas.
6. Ejecutar compilación, comprobación de tipos y pruebas aplicables al cambio. Para cambios exclusivamente documentales, revisar contenido y enlaces; no inventar verificaciones de software inexistente.
7. Registrar los resultados reales. No ocultar errores, limitaciones ni trabajo incompleto; no declarar como probado lo que no se ejecutó.
8. Actualizar la documentación persistente correspondiente al submódulo.
9. Entregar un resumen con decisiones, archivos modificados, comandos ejecutados y resultados, errores pendientes y siguiente submódulo propuesto.
10. Detenerse al terminar y esperar nuevas instrucciones. Identificar el siguiente submódulo no autoriza su ejecución.

No hacer push ni desplegar sin autorización explícita. Nunca desplegar en Mainnet, aunque exista autorización para desplegar en otra red.

## Arquitectura obligatoria

Aplicar Clean Architecture y Domain-Driven Design de forma pragmática, con dependencias hacia las capas internas:

| Capa | Responsabilidad | Restricciones |
| --- | --- | --- |
| Domain | Entidades, tipos, invariantes e interfaces del negocio | No depende de React, RPC, Anchor ni adaptadores concretos. |
| Application | Casos de uso y coordinación mediante interfaces internas | Depende de Domain; no de Presentation ni de implementaciones de Infrastructure. |
| Infrastructure | Repositorios concretos, cliente Anchor y acceso a Solana | Implementa los contratos internos; traduce los datos externos. |
| Presentation | Páginas, componentes y hooks React | Invoca casos de uso; no concentra reglas críticas del negocio. |

Realizar la composición e inyección de adaptadores en un punto explícito de ensamblaje. Mantener fuera del dominio los detalles de transporte y representación de los SDK. Las validaciones del cliente mejoran la experiencia; el programa debe imponer las invariantes de seguridad.

En Rust/Anchor:

- Mantener entry points pequeños y delegar en instrucciones separadas.
- Separar el estado y sus estructuras de los handlers.
- Extraer reglas de negocio reutilizables cuando aporten claridad, sin introducir abstracciones innecesarias.
- Declarar explícitamente validaciones de cuentas, relaciones y autorización.

## Calidad y convenciones

- Aplicar SOLID, DRY, KISS y separación de responsabilidades con interfaces pequeñas.
- Usar Rust y Anchor para el programa; TypeScript estricto, React y Vite para el cliente.
- Evitar `any`, `unwrap` inseguros, duplicación y silenciamiento de errores o comprobaciones de tipos.
- Mantener código legible y errores comprensibles. Agregar comentarios solo cuando expliquen decisiones o aspectos no evidentes.
- Escribir código, nombres de funciones y variables en inglés.
- Escribir explicaciones y documentación en español; presentar la interfaz de usuario en español.
- Revisar, comprender y probar el código incorporado, incluso cuando provenga de templates, librerías o IA. Documentar su procedencia cuando corresponda.

## Modelo y funcionalidad mínima

- `Audit`: auditoría asociada a una wallet responsable.
- `Finding`: hallazgo perteneciente a una auditoría.
- Las cuentas de ambas entidades utilizan PDAs.
- Permitir crear y consultar auditorías; crear y consultar hallazgos relacionados.
- Permitir modificar hallazgos únicamente mientras estén abiertos.
- Resolver un hallazgo exige una acción correctiva válida; el programa debe rechazar una resolución sin esa información.
- Cerrar una cuenta de hallazgo exige que esté resuelto.
- La wallet responsable es la autoridad de toda operación que modifique su auditoría o sus hallazgos.
- El cierre debe actualizar correctamente los contadores de la auditoría. Separar el conteo de cuentas existentes del identificador siguiente: cerrar una cuenta no hace retroceder la secuencia ni permite reutilizar IDs antiguos.
- Definir y documentar los límites de campos, las transiciones permitidas y qué constituye una acción correctiva válida en el submódulo correspondiente. No asumir que una cadena no vacía basta sin definir la regla.

El aporte original verificable combina la resolución condicionada por una acción correctiva válida y el cierre con contadores consistentes e IDs no reutilizables.

## Seguridad obligatoria

- Aplicar Security by Design y mínimo privilegio.
- Validar firmantes y autoridades en Rust para cada operación de escritura.
- Verificar propiedad de cuentas, tipos y relaciones entre auditoría, hallazgo y autoridad. Rechazar combinaciones de cuentas ajenas.
- Validar PDAs, seeds y canonical bumps; no confiar en direcciones ni bumps arbitrarios enviados por el cliente.
- Validar tipos, tamaños, longitudes y transiciones de estado antes de modificar datos. Considerar bytes UTF-8 al dimensionar texto on-chain.
- Utilizar aritmética comprobada para IDs y contadores; rechazar overflow y underflow sin cambios parciales del negocio.
- Garantizar que un rechazo conserve el estado del negocio. Al cerrar, validar también el destinatario autorizado de los fondos de la cuenta.
- No sustituir controles del programa por botones deshabilitados u otras restricciones visuales.
- No almacenar claves privadas ni seed phrases en el proyecto. Excluir secretos, archivos de wallet y credenciales de Git y de las evidencias.
- No utilizar datos personales reales on-chain. Usar datos sintéticos en pruebas y demos.
- Trabajar exclusivamente con Localnet y Devnet. Verificar la red antes de ejecutar operaciones; Mainnet está prohibida.

## Criterios de aceptación de WayLearn

Fuentes oficiales consultadas el 21 de noviembre de 2026:

- [Proyecto final y certificado](https://waylearn.gitbook.io/solana-engineering-track-advanced/proyecto-final-y-certificado).
- [Pruebas y evidencias](https://waylearn.gitbook.io/solana-engineering-track-advanced/pruebas-y-evidencias).

Tratar estos requisitos como criterios de aceptación de la entrega completa, no como autorización para implementar módulos futuros. Volver a consultar las fuentes antes de la entrega para detectar cambios.

- Entregar repositorio revisable con programa, frontend con wallet, IDL y cliente concordantes; documentar instalación, ejecución, ruta propia y aporte en el README.
- Identificar el Program ID en Devnet y demostrar el flujo completo, con firma, confirmación, actualización de datos y manejo de errores.
- Aportar capturas o una transacción verificable y permitir reproducir los resultados.
- Documentar en el README la equivalencia entre los casos oficiales y los casos de KhipuTrace.
- Proporcionar los datos de identificación requeridos por el bootcamp mediante el canal de entrega adecuado, sin publicarlos on-chain ni incorporarlos innecesariamente al repositorio.

La siguiente matriz adapta las competencias oficiales al proyecto propio; no exige implementar entidades del ejemplo guiado ni añadir cierre de auditorías:

| Caso de KhipuTrace | Resultado requerido |
| --- | --- |
| Crear y consultar una auditoría y sus hallazgos | Cuentas legibles con autoridad y pertenencia correctas. |
| Crear un hallazgo válido | Relación preservada y contadores e ID siguiente actualizados. |
| Modificar un hallazgo abierto | Misma cuenta y relación, con cambios permitidos. |
| Resolver con acción correctiva válida | Transición correcta y acción persistida. |
| Resolver sin acción correctiva válida | Rechazo de la regla y estado conservado. |
| Cerrar un hallazgo resuelto y crear otro | Cuenta cerrada, contadores consistentes e ID antiguo no reutilizado. |
| Escribir con wallet no autorizada | Rechazo de autorización y estado conservado. |
| Combinar hallazgo y auditoría ajenos | Rechazo de pertenencia y estado conservado. |
| Cerrar un hallazgo abierto | Rechazo de la precondición y cuenta conservada. |
| Modificar un hallazgo resuelto | Rechazo de transición y estado conservado. |

Para permisos y pertenencia, usar cuentas existentes y solicitudes controladas que alcancen la validación correspondiente. Un fallo de RPC o una cuenta inexistente no prueban el rechazo buscado.

Cada evidencia debe indicar estado inicial, operación, resultado esperado y observado, comprobación de cuentas y firma o error pertinente. Vincular transacciones a Solana Explorer con `cluster=devnet`. Si la simulación rechaza antes del envío, guardar el error y verificar la conservación del estado; no inventar una firma. Identificar la versión del código, programa y frontend. Antes de entregar, comprobar instalación reproducible, coherencia IDL/cliente/Program ID, pruebas y recorrido manual en Devnet.

## Documentación persistente

Crear y mantener estos archivos de forma incremental, dentro del submódulo autorizado:

| Archivo | Contenido esperado |
| --- | --- |
| `AGENTS.md` | Reglas permanentes para trabajar en el proyecto. |
| `docs/PROJECT_CONTEXT.md` | Propósito, alcance, criterios de aceptación y decisiones de contexto. |
| `docs/ARCHITECTURE.md` | Capas, dependencias, modelo y decisiones arquitectónicas. |
| `docs/SECURITY.md` | Invariantes, amenazas, controles y riesgos pendientes. |
| `docs/PROGRESS.md` | Submódulos completados, archivos modificados, resultados y bloqueos. |
| `docs/ROADMAP.md` | Módulos, submódulos y siguiente paso pendiente de autorización. |
| `docs/TEST_EVIDENCE.md` | Comandos ejecutados, entorno, resultados y evidencias reproducibles. |

No marcar tareas futuras como terminadas. Diferenciar pruebas planificadas, ejecutadas, fallidas y no ejecutadas.

## Estado inicial y continuidad

- Submódulo inicial: análisis de instrucciones y creación de `AGENTS.md`.
- Directorio inspeccionado: vacío, sin código previo ni repositorio Git inicializado.
- Único archivo creado en este submódulo: `AGENTS.md`.
- Decisiones: conservar la arquitectura y el alcance indicados; usar los requisitos oficiales como aceptación y la matriz anterior como adaptación al proyecto propio.
- Verificación aplicable: revisión documental y consulta de las dos fuentes oficiales. No hay compilación, tipos ni pruebas de software aplicables todavía.
- Pendientes: restantes documentos persistentes e inicialización del proyecto; no hay implementación ni evidencia funcional aún.
- Siguiente submódulo propuesto: crear la documentación base de contexto, arquitectura, seguridad, progreso, roadmap y evidencias, sin implementar contrato ni frontend. Esperar instrucciones del usuario.

Cuando existan los documentos de seguimiento, registrar allí el progreso posterior y mantener este archivo centrado en reglas permanentes.
