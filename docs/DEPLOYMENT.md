# Despliegue controlado Devnet — submódulo 4.1

## Estado final — 4.1 completado

Despliegue autorizado expresamente por el usuario («si autorizo»), ejecutado y verificado en **Devnet**, el 22 de noviembre de 2026 America/La_Paz (evidencias UTC del 23). Límite autorizado: 3 SOL Devnet; gasto neto observado de despliegue y una auditoría sintética: **1,39334556 SOL Devnet**, incluyendo rent y comisiones. Saldo final: **8,60665444 SOL Devnet**.

El programa es ejecutable y su owner es Upgradeable Loader. ProgramData, autoridad y hash remoto fueron comprobados; los 273.368 bytes coinciden exactamente con el ELF aprobado. Se confirmó una transacción real CreateAudit mediante Application e Infrastructure del frontend y se releyeron autoridad/título/ID/contadores correctos. No se desplegó ni publicó el frontend; no se realizó aún el recorrido con extensión de wallet real.

- [Programa en Explorer Devnet](https://explorer.solana.com/address/GV8SZn6i29tL4CmJMei5P3N3BLUxVZBWrG6hFQVSVSBv?cluster=devnet).
- [Despliegue confirmado](https://explorer.solana.com/tx/3UKwewKZn5yhuBvtiqLxVDMHRe3CM1Ws58bJuwh6H73fNQhEya2vuu9vqCrgUJxuLxaJ5F1HVGiLQuHPeY9kd2Fi?cluster=devnet), slot 525280825.
- [CreateAudit confirmado](https://explorer.solana.com/tx/3uoFNMRYuVwx8SGZzBGVa5nukookgXHqiY7NayWaEPzNNXYwfaZdGpc7WpwmEEnfy3FwW6chAMUgVmdnkcEC8Y3C?cluster=devnet), slot 525281228.
- [Verificación de bytes/cuentas](evidence/4.1-deployment-verification.json), [cuentas y transacción de negocio](evidence/4.1-devnet-smoke.json), [estados de firmas](evidence/4.1-signature-statuses.json).

### Historial de preparación

Inicialmente faltaban wallet/CLI y había saldo cero. El usuario autorizó crear las herramientas/claves; los dos airdrops CLI fallaron. Posteriormente se confirmaron 10 SOL Devnet y se solicitó la autorización de despliegue independiente exigida por el punto 5. Esa autorización fue recibida antes del primer deploy. Las evidencias de preparación se conservan por separado; las referencias a saldo cero/autorización pendiente en reportes anteriores son históricas.

## Identidades públicas y configuración

| Uso | Dirección |
| --- | --- |
| Wallet pagadora y upgrade authority | `Bd6Xa9JV3x3hZVkEnuGnH323MZxhYuCXuRe6DFSK3LKT` |
| Program ID desplegado y verificado | `GV8SZn6i29tL4CmJMei5P3N3BLUxVZBWrG6hFQVSVSBv` |
| Buffer utilizado y cerrado al completar deploy | `7gFUNQwYe6ofQwQeCJfwJ9gB8aRbC6BJawE3Y4DTq1mx` |
| RPC exclusivo | `https://api.devnet.solana.com` |
| Genesis comprobado | `EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG` |

Las claves fueron generadas mediante solana-keygen oficial con aleatoriedad del sistema, salida de seed desactivada y sin sobrescribir archivos. Están exclusivamente en `/home/dani/.local/share/khiputrace/devnet/`, directorio `700`, archivos `600`: `deployer-keypair.json`, `program-keypair.json` y `buffer-keypair.json`. No se imprimieron secretos ni se incorporaron claves al proyecto. Los archivos no están cifrados; sus permisos restringen el acceso al usuario. Una copia de respaldo, si se realiza, debe mantenerse fuera del repositorio y protegida. No usar estas claves en otras redes.

Rust, ambas secciones de programas de Anchor.toml, IDL JSON, tipos IDL, frontend/.env.local y .env.example apuntan al despliegue verificado. El ID anterior era exclusivamente provisional. El frontend verifica genesis y cuenta ejecutable antes de operar; su build local incluye la identidad correcta. `.env.local` contiene únicamente configuración pública y está ignorado. Anchor mantiene Localnet como provider predeterminado; cada comando Devnet exige URL y wallet explícitas.

## Herramientas y artefacto

Solana CLI/keygen 2.3.0 se extrajeron del archivo oficial ya descargado, con SHA-256 `56241fbe862495ff01b2b875195e44f94c22e9f2a504591a3ade1b9d82862730`. Sin instaladores remotos, PATH permanente ni cambios globales. Preparación reproducible desde esa caché:

```bash
python3 scripts/setup-devnet-cli.py
python3 scripts/prepare-devnet-keys.py
```

El segundo script conserva claves existentes y solo imprime direcciones/rutas/permisos. No ejecutarlo como sustituto de una copia de respaldo.

Anchor CLI sigue ausente. No es necesaria para este procedimiento: build SBF fijado, IDL mediante anchor-lang-idl oficial y despliegue mediante Solana CLI. No se afirma que el verificador global de toolchain pase. Devnet reporta solana-core 4.5.0-beta.0; la CLI local es 2.3.0, por la versión fijada del proyecto. Se comprobaron RPC/genesis/rent y el despliegue completo de este ELF, más CreateAudit real; no se desactivaron preflight ni feature verification. Esto acredita esta combinación ejecutada, sin afirmar compatibilidad universal entre versiones.

ELF preparado: `target/sbf/khiputrace.so`, 273.368 bytes, SHA-256 `c941ab95d5cbfc6ae9ec73683dec79e24b0a60f11c505e7a173555b44eb08f17`. Debe conservarse este hash hasta la autorización. Cualquier recompilación con cambios exige revisar nuevamente la identidad y el artefacto.

El build conserva avisos históricos de crate types y de clasificación de syscalls: el `syscalls.txt` incluido en el SDK tiene 0 bytes. El loader Devnet aceptó el ELF y CreateAudit ejecutó correctamente. No se suprime el aviso histórico ni se atribuye el resultado Devnet a la simulación local.

## Saldo y presupuesto

Consulta de rent RPC para Upgradeable Loader v3 y `--max-len 273368`:

| Cuenta | Bytes | Lamports |
| --- | --- | --- |
| Programa | 36 | 833.120 |
| ProgramData | 273.413 | 1.389.588.280 |
| Buffer temporal | 273.405 | 1.389.547.640 |
| Pico conservador antes de devolver buffer | — | 2.779.969.040 |

Reserva conservadora: **2,77996904 SOL Devnet más comisiones**. Tras liberar el buffer, rent persistente estimado: 1,3904214 SOL. No es una cotización fija ni incluye todas las comisiones/reintentos; solicitar al menos 3 SOL exclusivamente Devnet y volver a calcular antes de desplegar. No comprar ni transferir SOL Mainnet.

Las solicitudes CLI no obtuvieron fondos. El usuario puede solicitar SOL de prueba en el [faucet oficial](https://faucet.solana.com/) para la wallet pagadora. El sitio ofrece mayor límite con GitHub; esa sesión pertenece al usuario. No se instaló minería PoW ni se cambió de red para sortear el límite.

Diagnóstico de solo lectura, sin firma ni envío:

```bash
KHIPUTRACE_DEPLOYER_ADDRESS=Bd6Xa9JV3x3hZVkEnuGnH323MZxhYuCXuRe6DFSK3LKT node scripts/check-devnet.mjs
```

El reporte `docs/evidence/4.1-devnet-check.json` incluye coherencia de identidades, genesis, cuenta ejecutable, saldo, rent y hash. Un diagnóstico RPC exitoso no implica que existan saldo o programa.

## Primer comando ejecutado — fallo de escritura, código 1

Se comprobaron autorización explícita, saldo de 10 SOL, genesis, pruebas aprobadas, claves e identidad/hash. Este primer intento con --use-rpc terminó con «Data writes to account failed: Custom error: Max retries exceeded». Una lectura auxiliar recibió 429. Se comprobó programa ausente y buffer parcialmente escrito antes de reanudar. El buffer explícito evitó depender de una clave temporal cuya recuperación pudiera imprimirse en un error.

```bash
.cache/sbf-tests/tools/solana-release/bin/solana \
  --url https://api.devnet.solana.com \
  --keypair /home/dani/.local/share/khiputrace/devnet/deployer-keypair.json \
  --commitment confirmed \
  program deploy target/sbf/khiputrace.so \
  --program-id /home/dani/.local/share/khiputrace/devnet/program-keypair.json \
  --buffer /home/dani/.local/share/khiputrace/devnet/buffer-keypair.json \
  --upgrade-authority /home/dani/.local/share/khiputrace/devnet/deployer-keypair.json \
  --fee-payer /home/dani/.local/share/khiputrace/devnet/deployer-keypair.json \
  --max-len 273368 --use-rpc --max-sign-attempts 3
```

Se mantiene la posibilidad de actualización por la wallet indicada; no se ejecuta `--final`, no se transfiere autoridad ni se cierra ningún programa. Si el envío falla, conservar logs y consultar programa/buffer antes de reintentar: el despliegue usa varias transacciones y puede dejar un buffer financiado. No inferir fracaso total ni éxito solo por el código de salida.

## Reanudación ejecutada — código 0

Se reutilizaron el mismo buffer, Program ID, autoridades y ELF, sustituyendo `--use-rpc --max-sign-attempts 3` por **`--use-quic --max-sign-attempts 1`** en el comando anterior. Fue un cambio de transporte dentro del despliegue autorizado y del presupuesto, sin omitir verificaciones. QUIC registró avisos `sendmsg Input/output error` de offload UDP; el proceso finalizó con código 0 y firma real. La comprobación posterior de cuentas/bytes/transacción es la evidencia de éxito. No fue necesario instalar herramientas adicionales, crear otro buffer ni cambiar el RPC de red.

## Verificación posterior realizada

1. `program show` y lecturas RPC: owner Upgradeable Loader, executable true, ProgramData `26Ro9jtk13JNZtmigtZXSKH7BXPDY9i6LThWKgZeRiuz`, upgrade authority igual a la wallet pagadora y slot 525280825.
2. `program dump` y lectura directa de ProgramData: ambos hashes SHA-256 idénticos al ELF aprobado, `c941ab95d5cbfc6ae9ec73683dec79e24b0a60f11c505e7a173555b44eb08f17`. Comparación exacta, sin padding diferente. Buffer ausente tras completar el despliegue.
3. `npm run check:idl` y `npm run build`: código 0. Diagnóstico Devnet/cliente: identidades coherentes y programa ejecutable. .env.example contiene el ID real verificado. El frontend no se publicó ni se inicializó IDL on-chain.
4. Prueba operativa con Wallet.local oficial de Anchor, leyendo exclusivamente el keypair externo. Usa los mismos CreateAudit/GetAudit, repositorios, PDA y confirmación del frontend. No parsea claves manualmente ni las transmite al navegador.
5. CreateAudit: PDA `6dXLqe3dS9MtDvQspXyjF9FvEwP4BqGUXpZvF1a1Kaob`, ID `202611220401`, título sintético, estado anterior inexistente; posterior con autoridad correcta, ID/título persistidos y tres contadores en cero. Transacción con meta.err null, comisión 5.000 lamports y saldo posterior registrado. Las firmas se consultaron adicionalmente mediante getSignatureStatuses: ambas finalized, sin error.

Prueba operativa ejecutada una sola vez:

```bash
node scripts/check-devnet-smoke.mjs
ANCHOR_WALLET=/home/dani/.local/share/khiputrace/devnet/deployer-keypair.json node scripts/check-devnet-smoke.mjs --execute
```

El primer comando únicamente comprueba tipos/compila, sin cargar claves/contactar RPC. El segundo crea una cuenta real y no debe repetirse como si fuera una prueba unitaria: el runner rechaza ejecutar si ya existe el reporte, preservando evidencia y evitando cargar la wallet/contactar RPC. Además usa un ID fijo, comprueba ausencia y rechaza si la cuenta ya existe. No reenvía automáticamente ante confirmación incierta; conserva firma/error. La wallet oficial de Node es exclusiva del procedimiento operativo y no se incorpora a Presentation ni al bundle frontend.

Pendientes fuera de 4.1: recorrido de todas las operaciones con extensión real en Devnet y preparación de evidencias finales WayLearn, sin asumir autorización para el siguiente submódulo. No quedan fallos bloqueantes del despliegue; avisos e intento fallido conservados en los logs.

Procedimiento contrastado con la [documentación oficial de despliegue](https://solana.com/docs/programs/deploying) y la [referencia CLI](https://solana.com/docs/references/solana-cli); argumentos confirmados con `solana program deploy --help` de la versión local. La evidencia local previa no se convierte en evidencia Devnet por cambiar el Program ID.
