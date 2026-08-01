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

**Contenido clínico** — `KIN_CASOS`, `KIN_PRUEBAS`, `KIN_MUSCULOS`, `KIN_RANGOS` en `index.html` son la única fuente de verdad, documentada en `REVISION-KINESIOLOGIA.md`. Pendiente de revisión por Catalina antes de publicar.

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
