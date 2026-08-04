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

**Contenido clínico** — `KIN_CASOS` (53 casos, 9 de ellos `derivar:true` y 5 además `urgente:true`), `KIN_PRUEBAS` (39, con `sn`/`sp`), `KIN_MUSCULOS` (30), `KIN_RANGOS` (15), `CL_TTO_MAL` (distractores), `CL_AMARILLAS` y el motor de diferencial `KIN_DX` en `index.html` son la única fuente de verdad. Un caso nuevo necesita entrada en **seis** tablas: `KIN_CASOS`, `KIN_DX`, `CL_CORTO`, `CL_REGRESO`, `CL_TTO_MAL` y `CL_OCUPS` (más `CL_FEM` si la paciente es mujer).

**Pauta del docente** — el objetivo real del juego es que Catalina ensaye su **simulación clínica**: entra a una sala, un docente la observa y la evalúan por cómo conduce la atención, no solo por acertar. `CL_PAUTA` (17 ítems en cinco dominios: Trato, Anamnesis, Examen, Razonamiento, Plan) evalúa eso al cerrar el caso. Se prende con `clSimulacion()`, que vive en **localStorage** (`rinconSimulacion`), no en el estado compartido: ella practica con pauta mientras el otro juega el tycoon. Cada ítem tiene `aplica(t)` para que la pauta se adapte al caso — a un EPOC no se le exige movilidad pasiva. Los ítems se leen de `t.hechas`, así que **una acción nueva que la pauta evalúe tiene que quedar registrada ahí**.

**Motor de habla** — `CL_HABLAS` (9 registros: población, campo, barrio alto, adulto mayor, cabro chico, norte, sur, migrante, neutro) reescribe cómo habla cada persona sin tocar el contenido. `clConHabla()` aplica saludo, arranque, remate y cambios léxicos. **Las reglas van por frase ("el trabajo"), nunca por palabra suelta**: "trabajo" también es verbo y quedaba "me duele cuando la pega". Los pacientes de la ficha tienen habla fija en `CL_HABLA_CANON`; los generados la sortean por peso.

**Conversar** — la acción `charla` no aporta al diferencial: sube `t.rapport` (0-3), que se convierte en +8 de adherencia inicial por nivel. Cada persona trae una `vida` (familia, hobby, dato) que va saliendo. Con confianza ≥2 puede soltar sola la bandera amarilla.

**La consulta es un chat** — la anamnesis se muestra como conversación en `t.chat` (`clDecir()`): tus preguntas van como burbuja `kine`, las respuestas como `pac` o `acomp`, y los exámenes/pruebas como nota clínica (`nota`). `CL_SALUDO` abre según el ánimo y `CL_MULETILLA` remata según el rasgo.

**Mensajes entre sesiones** — `CL_MENSAJES` se sortea en `clSortearMensajes()` al entrar a la recepción, según el tiempo real desde la última sesión (`pac.visto`). El que va bien manda mensajes buenos, el que va mal manda problemas. Responder bien sube adherencia y reputación; `clCaducarMensajes()` castiga a los 20 min sin respuesta.

**Complicaciones** — `CL_COMPLICACIONES` (5% por sesión desde la 2ª) tuerce el caso: lo único correcto es derivar. Distinto de `CL_ALARMAS`, donde a veces corresponde seguir.

**Derivadores** — `CL_DERIVADORES` con `c.deriv[id].conf` (0-100). `clSortearDerivador()` pondera por confianza, así que resolver bien trae más pacientes de ese origen. Cada uno tiene su multiplicador de pago.

**Semana temática y resumen** — `clTemaSemana()` rota por semana ISO (igual para los dos); esos casos pagan 45% más. `clSemanaEstado()` acumula la semana y muestra el resumen del domingo con el tema más flojo del examen.

**Impaciencia** — `f.llegada` marca cuándo llegó cada uno; `clRevisarPaciencia()` los saca a los `CL_PACIENCIA` (6 min) y cuesta reputación.

**Tope de tratamiento** — `CL_ACTIVOS_MAX` (10). Pasado el tope el paciente se cierra igual pero queda con otro kinesiólogo en vez de entrar a `c.activos`: la lista llegaba a 44 y dejaba de ser jugable.

**Cuidado con reasignar arrays en `asegurarJuegos()`** — corre dentro de cada `clEstado()`. Si limpia con `k.sala = k.sala.filter(...)` y alguien está llenando la sala, `c.sala.push(clFichaEspera(...))` empuja al array viejo y no entra nadie. La limpieza de `sala` va **en sitio** con `splice`.

**Generador de pacientes** — el cuadro clínico es fijo, la persona no. `clGenPersona()` arma nombre, apellido, edad (±7 años del caso), oficio compatible (`CL_OCUPS`) y comuna: 5.460 nombres posibles. `clFichaEspera()` decide si llega el paciente **canónico** de la ficha (22%, o 50% si ya le diste el alta) o uno generado. Solo el canónico acumula `hist`, arco, notas y `fallidos` — un generado es otra persona con el mismo cuadro, no "el mismo que volvió". Para mostrar datos usar siempre `clPacNom/clPacEdad/clPacOcup`, nunca `caso.pac` directo. `REVISION-KINESIOLOGIA.md` se **genera** desde esos datos, no se edita a mano: si cambia el contenido clínico, regenerar el documento. Pendiente de revisión por Catalina antes de publicar.

**Se juega a ciegas** — no hay tablero de hipótesis, ni porcentajes, ni marcar cada hallazgo con flechitas: Catalina probó esa versión y no se entendía. Ahora solo se ve contra qué cuadros compite el paciente y la consulta; ella razona en su cabeza y decide, como en la estación. `clLecturaHallazgos()` cierra el caso mostrando qué significaba cada hallazgo y qué se quedó sin buscar; su `pct` es **cobertura** (cuántos de los hallazgos que discriminaban alcanzó a buscar), no una nota de anotación.

**Horario de la clínica** — abre `CL_HORA_ABRE` (09:00), cierra `CL_HORA_CIERRA` (18:00) y hay `CL_AGENDA_DIA` (10) horas dadas. Cada paciente llega **a su hora** (`clLlenarSala()` compara `cita.min` con `ag.reloj`), no de golpe. El reloj corre `CL_MIN_POR_SEG` mientras está en la sala y **se detiene mientras atiende**, para no apurarla; cada consulta consume `CL_MIN_POR_CONSULTA`. A las 18:00 el día termina y hay que abrir el siguiente. La sala es de **4 personas máximo** a propósito: con más, se agobia. Urgencias y accidentes (`ef.llena`) se saltan la agenda.

**Pruebas con Sn/Sp** — `clResultadoPrueba()` aplica SnNout (negativa con `sn ≥ KIN_SN_ALTA` descarta) y SpPin (positiva con `sp ≥ KIN_SP_ALTA` confirma). `KIN_PRUEBA_NEG` lista los casos cuya prueba de ficha sale **negativa**: sin eso, el Lasègue negativo del lumbago "confirmaría" un lumbago. `func:true` marca mediciones que no son pruebas diagnósticas (TM6M, Ashworth).

**Banderas amarillas** — `CL_AMARILLAS` se asigna por visita en `clFichaEspera()`. Solo se descubre con la acción `creencias`; si no se pregunta, viaja escondida al tratamiento y lo frena a la mitad (`factorAm`) sin que el jugador sepa por qué. Se limpia con la carga `amarilla`, que solo aparece si `pac.amarillaVista`.

**Sedes** — `c.sede` es el prestigio: `clAbrirSede()` resetea plata, equipo, personal, reputación y acreditaciones, pero conserva `dominados`, `hist`, `examen`, récords y misiones. Cada sede da `+CL_SEDE_PAGO` permanente vía `clMultPagoCaso()`, resta un punto de tiempo de consulta y agrega una hipótesis extra al diferencial en `clAccionesDe()`. La paleta del 3D cambia por sede.

**Pistas** — `clUsarPista()` se recarga sola cada `clEsperaPista()` (5 min de reloj real, 3 con la habilidad `intuicion`; marca en `c.pistaT`). No revela el diagnóstico: avisa qué falta explorar, o recuerda qué hallazgo descartaba algo.

**Caso del día** — `clFichaDia(fecha)` sortea paciente **y** ficha completa con `clRngDia()`, un PRNG sembrado desde la fecha: los dos dispositivos obtienen exactamente el mismo caso sin coordinarse. Una pasada al día, sin reintentos (`t.diario` corta el reintento en `clResponderDx` y `clResponderTto`). Puntaje sobre 100 en `clPuntajeDiario()` y racha en `c.diario`. El marcador compartido vive en `c.diarioComp[persona]`; **quién juega en este aparato va en localStorage** (`rinconQuien`, vía `clQuien()`), no en el estado sincronizado.

**Habilidades** — `CL_HABILIDADES` se compra con `c.pxHabil` (1 punto por alta, acreditación y caso del día) y **no se pierde al abrir sede**. Los efectos se leen con `clTieneHabil()` y están repartidos: costo de acciones en `clAccionesDe()`, tiempo en `clTiempoTotal()`, costos en `clGastoPorSegundo()`, adherencia inicial en `clCerrarCaso()`, prueba gratis en `clHacerAccion()`, banderas amarillas en `clIniciarCaso()`.

**Arcos y errores** — `CL_ARCOS[casoId]` es un array de capítulos que `clCapitulo()` sirve según `hist.veces`, con `CL_REGRESO` de respaldo. `c.fallidos[casoId]` guarda lo que salió mal (`clAnotarFallo`); si el paciente vuelve y esta vez se cierra bien, `clSaldarFallo()` lo borra y devuelve reputación.

**Notas escondidas** — `c.notasCaso[casoId]` guarda un mensaje con su autor. `clNotaDeOtro()` **solo se lo muestra al otro**, nunca a quien la escribió. Se dejan desde el álbum.

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
