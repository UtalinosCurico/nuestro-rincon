# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Romantic personal page for Catalina and Diego. Deployed at `https://nuestro-rincon-neon.vercel.app`. Syncs shared state across devices via a Neon PostgreSQL database through Vercel serverless functions.

## Commands

```bash
# Install dependencies
npm install

# Run locally (requires Vercel CLI)
npm run dev         # vercel dev

# Validate API file syntax
node -c api/estado.js

# Validate embedded HTML script parses
node -e "const fs=require('fs'); const html=fs.readFileSync('index.html','utf8'); const script=html.match(/<script>([\s\S]*)<\/script>/)[1]; new Function(script); console.log('OK');"

# Verify deployed API responds
curl https://nuestro-rincon-neon.vercel.app/api/estado

# Regenerate the clinical review doc from the data in index.html
node scripts/generar-revision.js
```

Deployment is automatic: push to `main` → Vercel redeploys.

## Architecture

Single-page app with no build step. All app logic lives in `index.html` as inline JS/CSS. `catalina-y-diego.html` is kept as an identical copy of `index.html` (historical alternate URL).

**State object** — a global `datos` in the HTML holds all page content (frase, fotos, canciones, cartas, razones, metas, estados, preguntaDia, notas, etc.).

**Persistence flow:**
1. On load: read `localStorage` first (fast), then `GET /api/estado` (Neon).
2. On save: write `localStorage` immediately + schedule `POST /api/estado` with 700 ms debounce.
3. Auto-sync: polls Neon every 60 s and on tab focus.

Key constants in `index.html`:
```js
const CLAVE_GUARDADO = 'nuestroRinconCyD_v2';
const API_ESTADO = '/api/estado';
```

Key functions: `guardar()`, `cargar()`, `programarGuardadoRemoto()`, `guardarRemoto()`, `cargarRemoto()`, `repintarTodo()`.

**API endpoints (Vercel serverless, `api/` folder):**
- `GET/POST /api/estado` — reads/writes the main `datos` object in Neon table `rincon_estado` (row `id = catalina-diego`). POST auto-creates a backup before overwriting.
- `GET/POST /api/backups` — lists and creates/restores backups from `rincon_backups`.
- `POST /api/upload` — optional image upload to Vercel Blob (gracefully skipped if `BLOB_READ_WRITE_TOKEN` is absent).

**Environment variables (configured in Vercel dashboard, never in code):**
- `DATABASE_URL` — Neon connection string (required).
- `BLOB_READ_WRITE_TOKEN` — Vercel Blob token (optional).

**PWA:** `manifest.webmanifest` + `sw.js` make it installable. The service worker caches the app shell only (no API calls, no audio).

**Rincón de juegos** (consola `jx*`, pantalla completa). Juegos actuales: Sudoku (`sd*`), Zip (`zip*`), 2048 (`dm*`), Snake (`sn*`), Nuestro Jardín (`jar*`, incremental) y Clínica Kinésica (`cl*`, con motor de diagnóstico y tratamiento por sesiones). Economía compartida: monedas + mascota + clóset. Se eliminaron Detective, Tres en raya y Memorice.

**Contenido clínico** — `KIN_CASOS` (41 casos, 7 de ellos `derivar:true` y 5 además `urgente:true`), `KIN_PRUEBAS` (33, con `sn`/`sp`), `KIN_MUSCULOS` (30), `KIN_RANGOS` (15), `CL_TTO_MAL` (distractores), `CL_AMARILLAS` y el motor de diferencial `KIN_DX` en `index.html` son la única fuente de verdad. `REVISION-KINESIOLOGIA.md` se **genera** desde esos datos, no se edita a mano: si cambia el contenido clínico, regenerar el documento. Pendiente de revisión por Catalina antes de publicar.

**El cuaderno** — el tablero de hipótesis ya NO lo calcula el juego. Cada hallazgo se anota a mano en `t.notas[accId][hipId]` (1 apoya / −1 descarta / 0 no aporta) y `clConfianzas()` sale de ahí. Al responder el tratamiento se pasa por la fase `revision`, donde `clCorregirCuaderno()` compara las marcas contra `KIN_DX` y `clResultadoPrueba()`. El porcentaje modula pago, reputación y el desbloqueo del álbum. **Nunca volver a mover `t.conf` desde `clHacerAccion()`**: eso reventaría la mecánica entera.

**Pruebas con Sn/Sp** — `clResultadoPrueba()` aplica SnNout (negativa con `sn ≥ KIN_SN_ALTA` descarta) y SpPin (positiva con `sp ≥ KIN_SP_ALTA` confirma). `KIN_PRUEBA_NEG` lista los casos cuya prueba de ficha sale **negativa**: sin eso, el Lasègue negativo del lumbago "confirmaría" un lumbago. `func:true` marca mediciones que no son pruebas diagnósticas (TM6M, Ashworth).

**Banderas amarillas** — `CL_AMARILLAS` se asigna por visita en `clFichaEspera()`. Solo se descubre con la acción `creencias`; si no se pregunta, viaja escondida al tratamiento y lo frena a la mitad (`factorAm`) sin que el jugador sepa por qué. Se limpia con la carga `amarilla`, que solo aparece si `pac.amarillaVista`.

**Sedes** — `c.sede` es el prestigio: `clAbrirSede()` resetea plata, equipo, personal, reputación y acreditaciones, pero conserva `dominados`, `hist`, `examen`, récords y misiones. Cada sede da `+CL_SEDE_PAGO` permanente vía `clMultPagoCaso()`, resta un punto de tiempo de consulta y agrega una hipótesis extra al diferencial en `clAccionesDe()`. La paleta del 3D cambia por sede.

**Pistas** — `clUsarPista()` se recarga sola cada `CL_PISTA_ESPERA` (5 min de reloj real, en `c.pistaT`). No revela el diagnóstico: corrige una anotación del cuaderno que esté mala o falte.

**Ciclo de un paciente** — sala de espera (`c.sala`, fichas con previsión, origen, rasgo, ánimo y acompañante que cambian en cada visita) → investigar con tiempo limitado → diagnóstico → tratamiento por sesiones hasta el alta. Cada paciente deja memoria en `c.hist[casoId]` (`veces`, `altas`, `recaidas`, `sesiones`) y al reaparecer se muestra su texto de `CL_REGRESO`.

**Personalidad** — `CL_RASGOS` toca la mecánica vía `clEfRasgo()`: `tiempo` (menos tiempo de consulta), `pistasPobres` (la anamnesis rinde la mitad), `pistaFalsa` (arranca con una hipótesis equivocada inflada), `adherencia`, `seAburre` y `pago`. `CL_ANIMOS` y `CL_ACOMP` son textura; el acompañante agrega la acción `acomp`, que revela una pista pendiente del `KIN_DX` del caso.

**Tratamiento** — cada paciente activo lleva `adh` (adherencia 0-100). La dosificación correcta rinde según `factorAdh`; bajo 35 puede faltar a la sesión. La carga `educar` no progresa tejido pero sube la adherencia. Con probabilidad `CL_ALARMA_PROB` aparece una `CL_ALARMAS` que exige decidir seguir/bajar/derivar. Los pacientes sin sesión por más de un día pierden adherencia y reputación (`clRevisarAbandonos()`).

**Eventos y urgencias** — `CL_EVENTOS` duran `CL_EVENTO_DURA` pacientes y se leen con `clEfEvento()`. El multiplicador de evento va en `clMultPagoCaso()` y **no** en `clMultPago()`, para que un evento no dispare la renta pasiva. `c.urgencia` es una ambulancia con reloj real (`CL_URGENCIA_SEG`); si expira cuesta 5 de reputación. El turno de noche (`c.noche`) encadena `CL_NOCHE_LARGO` pacientes sin elegir, paga `CL_NOCHE_PAGO`× y no deja pacientes en tratamiento.

**Economía** — hay costos fijos: `clGastoPorSegundo()` = arriendo + sueldos. Devuelve **0 mientras no haya personal contratado**; si no, un jugador nuevo entra en rojo desde el segundo cero. Caja negativa sostenida resta reputación. Una especialidad exige reputación **y** acreditación (`c.acred`, examen de 8 preguntas al 75%), y como la reputación baja, una especialidad también se cierra.

**Repaso** — cuatro solapas: Músculos, Rangos, Examen (20 preguntas contrarreloj generadas por `clBancoPreguntas()` desde el mismo contenido clínico) y Álbum (fichas de `c.dominados`). Las misiones diarias viven en `CL_MISIONES` y se avanzan con `clAvanzarMision(tipo, info)`.

## Rules for editing

- If `index.html` is modified, always sync the same change to `catalina-y-diego.html`.
- Sube `CACHE_NAME` en `sw.js` cada vez que cambie `index.html`, o los teléfonos siguen sirviendo el HTML viejo desde la caché.
- Keep `localStorage` as fallback — never remove it.
- Never connect to Neon directly from the browser; all DB access goes through `/api/`.
- **Nada escribe a Neon antes de que la primera lectura responda** (`cargaInicialLista`). Un dispositivo con localStorage vacío que suba su estado por defecto borra la página entera: ya pasó el 29-jun-2026.
- Los juegos que hacen tick continuo (jardín, clínica) guardan en localStorage seguido y a Neon solo en acciones concretas o cada 120 s. Nunca llamar `guardar()` en cada frame.
- Al usar `String.replace()` para insertar código, pasar una **función** de reemplazo: `$'`, `$&` y `` $` `` son patrones especiales y corrompen el texto insertado.
- `pintarPreguntaDia()` must only change the question when the date changes; it should not save to Neon during the initial paint to avoid overwriting data on load.
- The daily question bank (`PREGUNTAS_DIA`) excludes already-used entries stored in `datos.preguntaDia.usadas`; never use `Date.now() % length` to pick questions.
- Photos stored as base64 in Neon JSONB grow fast — prefer Vercel Blob for new image uploads.

## Known risks

- Last-write-wins sync: simultaneous edits from two devices can overwrite each other.
- PIN is symbolic (not real security).
- Large base64 photo payloads will bloat the Neon JSONB column.
