/* ============================================================
   MOTOR DEL OBSERVATORIO
   Reglas, economía y simulación. Sin DOM: la interfaz se entera de lo
   que pasa por los ganchos de `Motor.avisar`, y este archivo también
   corre en Node para probar el balance (scripts de prueba).
   ============================================================ */

const Motor = {
  /* La interfaz reemplaza estos ganchos. */
  avisar: {
    log() {}, descubrimiento() {}, reporte() {}, decision() {}, capitulo() {},
    logro() {}, obra() {}, evento() {}, encargo() {},
  },
};

/* ---------- utilidades ---------- */
const azar = () => Math.random();
const entre = (a, b) => a + Math.random() * (b - a);
const elegir = arr => arr[Math.floor(Math.random() * arr.length)];
const limitar = (x, a, b) => Math.max(a, Math.min(b, x));

/** PRNG con semilla: el arte y los datos de cada descubrimiento salen de su semilla. */
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function elegirPonderado(pesos) {
  const total = pesos.reduce((a, b) => a + b, 0);
  if (total <= 0) return 0;
  let r = azar() * total;
  for (let i = 0; i < pesos.length; i++) { r -= pesos[i]; if (r <= 0) return i; }
  return pesos.length - 1;
}

/* ---------- fechas reales ---------- */
function fechaHoy(ms) {
  const d = new Date(ms == null ? Date.now() : ms);
  return { y: d.getFullYear(), m: d.getMonth(), d: d.getDate(), dow: d.getDay() };
}
function enRango(f, desde, hasta) {
  const v = (f.m + 1) * 100 + f.d;
  const a = desde[0] * 100 + desde[1], b = hasta[0] * 100 + hasta[1];
  return a <= b ? (v >= a && v <= b) : (v >= a || v <= b);
}
function temporadasActivas(f) { return TEMPORADAS.filter(t => enRango(f, t.desde, t.hasta)); }
function lluviaActiva(f) { return LLUVIAS.find(l => enRango(f, l.desde, l.hasta)) || null; }

/* ============================================================
   ESTADO
   ============================================================ */
function sitioNuevo(s) {
  return {
    abierto: false,
    slots: Array(s.slots).fill(null),
    slotsAbiertos: s.slotsIni,
    staff: { guia: 0, astro: 0, inge: 0 },
    precio: s.precioRef,
    nota: 3.6, n: 0,
    visitas: 0,
    ultima: null,
  };
}

function estadoNuevo(duenio) {
  const e = {
    v: JUEGO.version, duenio: duenio || null, creado: Date.now(), t: Date.now(),
    reloj: { dia: 1, hora: JUEGO.horaInicio },
    dinero: JUEGO.dineroInicial, ciencia: 0, fama: 0,
    sitios: {}, sitioActual: 'elqui',
    inv: {},
    encargos: [], encargoSig: 2,
    decision: null, eventos: [], efectos: [],
    descubrimientos: [], tipos: {}, seq: 1,
    capitulo: 0, premiados: {}, logros: {},
    stats: {
      visitantes: 0, ingresos: 0, gastos: 0, cienciaTot: 0, noches: 0, descubrimientos: 0,
      bautizados: 0, dedicados: 0, visitasNubladas: 0, nochesLluvia: 0, encargos: 0, sismos: 0, mejorRareza: -1,
      publicaciones: 0, deseos: 0, fotos: 0,
    },
    descClase: {},
    records: { mejorNoche: 0, mejorNota: 0, nocheSitio: {} },
    legado: { puntos: 0, mejoras: {}, generaciones: 0 },
    resenas: [], registro: [],
    noche: null, ultimoReporte: null,
    prom: { neto: 0, ciencia: 0, visitas: 0, desc: 0 },
    mascota: null, notaPermanente: 0,
    ajustes: { sonido: true, ahorro: false },
    aniversario: {},
    fondo: null,
    vida: null,
  };
  for (const s of SITIOS) e.sitios[s.id] = sitioNuevo(s);
  e.sitios.elqui.abierto = true;
  return e;
}

/** Rellena lo que falte en una partida guardada (versiones viejas, respaldos dañados). */
function normalizar(e) {
  const base = estadoNuevo(e && e.duenio);
  if (!e || typeof e !== 'object') return base;
  for (const k of Object.keys(base)) if (!(k in e)) e[k] = base[k];
  for (const k of Object.keys(base.stats)) if (typeof e.stats[k] !== 'number' || !isFinite(e.stats[k])) e.stats[k] = base.stats[k];
  for (const k of Object.keys(base.records)) if (!(k in e.records)) e.records[k] = base.records[k];
  for (const k of Object.keys(base.prom)) if (typeof e.prom[k] !== 'number' || !isFinite(e.prom[k])) e.prom[k] = 0;
  if (!e.legado || typeof e.legado !== 'object') e.legado = base.legado;
  if (!e.descClase || typeof e.descClase !== 'object') e.descClase = {};
  if (!e.legado.mejoras) e.legado.mejoras = {};
  for (const s of SITIOS) {
    let st = e.sitios[s.id];
    if (!st || typeof st !== 'object') st = e.sitios[s.id] = sitioNuevo(s);
    if (!Array.isArray(st.slots)) st.slots = [];
    while (st.slots.length < s.slots) st.slots.push(null);
    st.slots = st.slots.slice(0, s.slots).map(x => (x && EDIFICIOS[x.id]) ? x : null);
    st.slots.forEach(x => {
      if (!x) return;
      if (typeof x.nivel !== 'number' || !isFinite(x.nivel)) x.nivel = 1;
      if (typeof x.prog !== 'number' || !isFinite(x.prog)) x.prog = 0;
      if (!x.modo) x.modo = modoInicial(EDIFICIOS[x.id]);
    });
    if (!st.staff) st.staff = { guia: 0, astro: 0, inge: 0 };
    for (const r of Object.keys(PERSONAL)) if (typeof st.staff[r] !== 'number') st.staff[r] = 0;
    if (typeof st.nota !== 'number' || !isFinite(st.nota)) st.nota = 3.6;
    st.nota = limitar(st.nota, 1, 5);
    if (typeof st.precio !== 'number' || !isFinite(st.precio) || st.precio <= 0) st.precio = s.precioRef;
    if (typeof st.slotsAbiertos !== 'number') st.slotsAbiertos = s.slotsIni;
  }
  e.sitios.elqui.abierto = true;
  if (!SITIO[e.sitioActual] || !e.sitios[e.sitioActual].abierto) e.sitioActual = 'elqui';
  for (const k of Object.keys(e.inv)) if (!INV[k]) delete e.inv[k];
  e.descubrimientos = (e.descubrimientos || []).filter(d => d && TIPOS[d.t]);
  for (const k of Object.keys(e.tipos)) if (!TIPOS[k]) delete e.tipos[k];
  e.capitulo = limitar(e.capitulo | 0, 0, CAPITULOS.length);
  if (!isFinite(e.dinero)) e.dinero = 0;
  if (!isFinite(e.ciencia)) e.ciencia = 0;
  if (e.decision && !DECISIONES.some(d => d.id === e.decision.id)) e.decision = null;
  e.eventos = (e.eventos || []).filter(x => x && EVENTOS.some(v => v.id === x.id));
  e.encargos = (e.encargos || []).filter(x => x && ENCARGOS.some(v => v.id === x.id));
  if (e.reloj.hora < 0 || e.reloj.hora >= 24 || !isFinite(e.reloj.hora)) e.reloj.hora = JUEGO.horaInicio;
  if (e.t > Date.now()) e.t = Date.now();
  return e;
}

function modoInicial(def) {
  if (!def || def.cat !== 'telescopio') return null;
  if (def.publico > 0) return 'publico';
  return 'ciencia';
}

function log(e, txt, tipo) {
  e.registro.unshift({ txt, tipo: tipo || 'info', dia: e.reloj.dia, h: Math.floor(e.reloj.hora), t: Date.now() });
  if (e.registro.length > 60) e.registro.length = 60;
  Motor.avisar.log(txt, tipo);
}

/* ============================================================
   EFECTOS DE INVESTIGACIÓN Y LEGADO
   ============================================================ */
function efecto(e, clave) {
  let v = 0;
  for (const id of Object.keys(e.inv)) {
    const ef = INV[id] && INV[id].efecto;
    if (ef && typeof ef[clave] === 'number') v += ef[clave];
  }
  return v;
}
function tieneEfecto(e, clave) {
  return Object.keys(e.inv).some(id => INV[id] && INV[id].efecto && INV[id].efecto[clave]);
}
function nivelLegado(e, id) { return (e.legado.mejoras && e.legado.mejoras[id]) || 0; }

/* Efectos temporales (influencer, luces, etc.) */
function efectoTemporal(e, tipo, sitioId) {
  let v = 0;
  for (const x of e.efectos) {
    if (x.tipo !== tipo) continue;
    if (x.sitio && sitioId && x.sitio !== sitioId) continue;
    v += x.valor;
  }
  return v;
}

/* ============================================================
   COSTOS Y CAPACIDADES
   ============================================================ */
function factorRemoto(e, sitioId) {
  const s = SITIO[sitioId];
  const base = s.costoLocal;
  return base > 1 ? 1 + (base - 1) * (1 - efecto(e, 'remoto')) : base;
}
function costoConstruir(e, sitioId, id) {
  const def = EDIFICIOS[id];
  return Math.round(def.costo * factorRemoto(e, sitioId));
}
function costoMejora(e, sitioId, slot) {
  const def = EDIFICIOS[slot.id];
  if (def.etapas || slot.nivel >= JUEGO.nivelesMax) return Infinity;
  return Math.round(def.costo * NIVEL_COSTO[slot.nivel] * factorRemoto(e, sitioId));
}
function costoTerreno(e, sitioId) {
  const s = SITIO[sitioId], st = e.sitios[sitioId];
  return Math.round(s.costoSlot * Math.pow(2.1, st.slotsAbiertos - s.slotsIni));
}
function costoReparar(e, sitioId, slot) {
  const def = EDIFICIOS[slot.id];
  const base = def.etapas ? def.etapas.reduce((a, x) => a + x.costo, 0) * 0.01 : def.costo * 0.12;
  return Math.round(base * (0.6 + 0.4 * slot.nivel) * factorRemoto(e, sitioId));
}
function factorObra(e, sitioId) {
  const st = e.sitios[sitioId];
  const inge = st ? st.staff.inge : 0;
  return 1 / ((1 + 0.15 * inge) * (1 + 0.15 * nivelLegado(e, 'obras')));
}
function tiempoObra(e, sitioId, id, nivelDestino) {
  const def = EDIFICIOS[id];
  const base = def.tiempo * (nivelDestino <= 1 ? 1 : 0.6 + 0.45 * nivelDestino);
  return Math.max(3, Math.round(base * factorObra(e, sitioId))) * 1000;
}
function cupoPersonal(e, sitioId) {
  const st = e.sitios[sitioId];
  let cupo = CUPO_PERSONAL_BASE;
  for (const sl of st.slots) if (sl && sl.id === 'residencia' && sl.nivel >= 1) cupo += EDIFICIOS.residencia.cupo * NIVEL_RINDE[sl.nivel - 1];
  return Math.floor(cupo);
}
function totalPersonal(st) { return st.staff.guia + st.staff.astro + st.staff.inge; }

function mantencionSitio(e, sitioId) {
  const st = e.sitios[sitioId];
  if (!st.abierto) return 0;
  let m = 0, ahorro = 0;
  for (const sl of st.slots) {
    if (!sl || sl.nivel < 1) continue;
    const def = EDIFICIOS[sl.id];
    m += def.mant * (1 + 0.5 * (sl.nivel - 1));
    if (def.ahorro) ahorro = Math.max(ahorro, def.ahorro + 0.03 * (sl.nivel - 1));
  }
  m *= (1 - ahorro) * (1 - efecto(e, 'mant')) * factorRemoto(e, sitioId);
  return Math.round(m);
}
function sueldosSitio(e, sitioId) {
  const st = e.sitios[sitioId];
  let s = 0;
  for (const r of Object.keys(PERSONAL)) s += st.staff[r] * PERSONAL[r].sueldo;
  return Math.round(s * (1 + (SITIO[sitioId].costoLocal - 1) * 0.5));
}
function gastoDiario(e) {
  let g = 0;
  for (const s of SITIOS) if (e.sitios[s.id].abierto) g += mantencionSitio(e, s.id) + sueldosSitio(e, s.id);
  return g;
}

/* ¿Se puede construir este edificio aquí? Devuelve null si sí, o el motivo. */
function motivoNoConstruir(e, sitioId, id) {
  const def = EDIFICIOS[id], s = SITIO[sitioId];
  if (!def) return 'No existe.';
  if (def.soloEn && !def.soloEn.includes(sitioId)) return 'Solo se puede en ' + def.soloEn.map(x => SITIO[x].nombre).join(', ') + '.';
  if (def.noEn && def.noEn.includes(sitioId)) return 'No se puede en ' + s.nombre + '.';
  if (s.soloRadio && def.cat === 'turismo') return 'En el altiplano no hay turismo.';
  if (def.cieloMin && s.cielo < def.cieloMin) return 'Necesita un cielo mejor que el de ' + s.nombre + '.';
  if (def.requiere) {
    if (def.requiere.capitulo && e.capitulo < def.requiere.capitulo) return 'Se desbloquea en el capítulo ' + (def.requiere.capitulo + 1) + '.';
    if (def.requiere.inv && !e.inv[def.requiere.inv]) return 'Requiere investigar «' + INV[def.requiere.inv].nombre + '».';
  }
  if (def.unico && contarTodos(e, id) > 0) return 'Ya hay uno.';
  return null;
}
function contarTodos(e, id) {
  let n = 0;
  for (const s of SITIOS) for (const sl of e.sitios[s.id].slots) if (sl && sl.id === id) n++;
  return n;
}
function edificiosEnSitio(e, sitioId, filtro) {
  return e.sitios[sitioId].slots.filter(sl => sl && sl.nivel >= 1 && (!filtro || filtro(sl, EDIFICIOS[sl.id])));
}
function tieneEnSitio(e, sitioId, id) {
  return e.sitios[sitioId].slots.some(sl => sl && sl.id === id && sl.nivel >= 1);
}
function mejorNivelEnSitio(e, sitioId, id) {
  let n = 0;
  for (const sl of e.sitios[sitioId].slots) if (sl && sl.id === id && sl.nivel > n) n = sl.nivel;
  return n;
}

/* ============================================================
   ACCIONES DEL JUGADOR
   Todas devuelven { ok:true } o { ok:false, msg }
   ============================================================ */
function construir(e, sitioId, idx, id) {
  const st = e.sitios[sitioId], def = EDIFICIOS[id];
  if (!st.abierto) return { ok: false, msg: 'El sitio está cerrado.' };
  if (idx >= st.slotsAbiertos) return { ok: false, msg: 'Ese terreno no es suyo todavía.' };
  if (st.slots[idx]) return { ok: false, msg: 'Ya hay algo construido ahí.' };
  const motivo = motivoNoConstruir(e, sitioId, id);
  if (motivo) return { ok: false, msg: motivo };
  if (def.etapas) {
    const costo = Math.round(def.etapas[0].costo * factorRemoto(e, sitioId));
    if (e.dinero < costo) return { ok: false, msg: 'Faltan ' + fmtPlata(costo - e.dinero) + '.' };
    e.dinero -= costo; e.stats.gastos += costo;
    st.slots[idx] = { id, nivel: 0, etapa: 0, modo: 'ciencia', prog: 0,
      obra: { fin: Date.now() + Math.round(def.etapas[0].tiempo * 1000 * factorObra(e, sitioId)), etapa: 1, total: def.etapas[0].tiempo * 1000 } };
    log(e, 'Empezó la obra del <b>Telescopio Gigante</b>: ' + def.etapas[0].nombre + '.', 'obra');
    return { ok: true };
  }
  const costo = costoConstruir(e, sitioId, id);
  if (e.dinero < costo) return { ok: false, msg: 'Faltan ' + fmtPlata(costo - e.dinero) + '.' };
  e.dinero -= costo; e.stats.gastos += costo;
  const dur = tiempoObra(e, sitioId, id, 1);
  st.slots[idx] = { id, nivel: 0, modo: modoInicial(def), prog: 0, obra: { fin: Date.now() + dur, nivel: 1, total: dur } };
  log(e, 'Empezó la obra: <b>' + def.nombre + '</b> en ' + SITIO[sitioId].nombre + '.', 'obra');
  return { ok: true };
}

function mejorar(e, sitioId, idx) {
  const st = e.sitios[sitioId], sl = st.slots[idx];
  if (!sl) return { ok: false, msg: 'No hay nada ahí.' };
  if (sl.obra) return { ok: false, msg: 'Ya está en obra.' };
  const def = EDIFICIOS[sl.id];
  if (def.etapas) {
    const etapa = sl.etapa || 0;
    if (etapa >= def.etapas.length) return { ok: false, msg: 'El Gigante ya está terminado.' };
    const costo = Math.round(def.etapas[etapa].costo * factorRemoto(e, sitioId));
    if (e.dinero < costo) return { ok: false, msg: 'Faltan ' + fmtPlata(costo - e.dinero) + '.' };
    e.dinero -= costo; e.stats.gastos += costo;
    const dur = Math.round(def.etapas[etapa].tiempo * 1000 * factorObra(e, sitioId));
    sl.obra = { fin: Date.now() + dur, etapa: etapa + 1, total: dur };
    log(e, 'Gigante: empezó «' + def.etapas[etapa].nombre + '».', 'obra');
    return { ok: true };
  }
  if (sl.nivel >= JUEGO.nivelesMax) return { ok: false, msg: 'Ya está al máximo.' };
  const costo = costoMejora(e, sitioId, sl);
  if (e.dinero < costo) return { ok: false, msg: 'Faltan ' + fmtPlata(costo - e.dinero) + '.' };
  e.dinero -= costo; e.stats.gastos += costo;
  const dur = tiempoObra(e, sitioId, sl.id, sl.nivel + 1);
  sl.obra = { fin: Date.now() + dur, nivel: sl.nivel + 1, total: dur };
  log(e, 'Mejorando <b>' + def.nombre + '</b> a nivel ' + (sl.nivel + 1) + '.', 'obra');
  return { ok: true };
}

/** Acelerar una obra pagando con ciencia (1 🔬 por cada 2 minutos que faltan). */
function costoAcelerar(sl) {
  if (!sl || !sl.obra) return 0;
  const falta = Math.max(0, sl.obra.fin - Date.now());
  return Math.max(1, Math.ceil(falta / 120000));
}
function acelerar(e, sitioId, idx) {
  const sl = e.sitios[sitioId].slots[idx];
  if (!sl || !sl.obra) return { ok: false, msg: 'No hay obra.' };
  const c = costoAcelerar(sl);
  if (e.ciencia < c) return { ok: false, msg: 'Faltan ' + Math.ceil(c - e.ciencia) + ' 🔬.' };
  e.ciencia -= c;
  sl.obra.fin = Date.now();
  revisarObras(e);
  return { ok: true };
}

function demoler(e, sitioId, idx) {
  const st = e.sitios[sitioId], sl = st.slots[idx];
  if (!sl) return { ok: false, msg: 'No hay nada ahí.' };
  const def = EDIFICIOS[sl.id];
  if (def.etapas) return { ok: false, msg: 'Al Gigante no se le toca.' };
  const devuelve = Math.round(def.costo * 0.3 * Math.max(1, sl.nivel));
  e.dinero += devuelve;
  st.slots[idx] = null;
  log(e, 'Se desarmó ' + def.nombre + ' (se recuperaron ' + fmtPlata(devuelve) + ').', 'info');
  return { ok: true, devuelve };
}

function reparar(e, sitioId, idx) {
  const sl = e.sitios[sitioId].slots[idx];
  if (!sl || !sl.danado) return { ok: false, msg: 'No está dañado.' };
  const c = costoReparar(e, sitioId, sl);
  if (e.dinero < c) return { ok: false, msg: 'Faltan ' + fmtPlata(c - e.dinero) + '.' };
  e.dinero -= c; e.stats.gastos += c;
  sl.danado = false;
  log(e, 'Reparado: ' + EDIFICIOS[sl.id].nombre + '.', 'bueno');
  return { ok: true };
}

function cambiarModo(e, sitioId, idx) {
  const sl = e.sitios[sitioId].slots[idx];
  if (!sl) return { ok: false };
  const def = EDIFICIOS[sl.id];
  if (!(def.publico > 0 && def.ciencia > 0)) return { ok: false, msg: 'Este telescopio tiene un solo modo.' };
  sl.modo = sl.modo === 'ciencia' ? 'publico' : 'ciencia';
  return { ok: true, modo: sl.modo };
}

function comprarTerreno(e, sitioId) {
  const s = SITIO[sitioId], st = e.sitios[sitioId];
  if (st.slotsAbiertos >= s.slots) return { ok: false, msg: 'No queda terreno.' };
  const c = costoTerreno(e, sitioId);
  if (e.dinero < c) return { ok: false, msg: 'Faltan ' + fmtPlata(c - e.dinero) + '.' };
  e.dinero -= c; e.stats.gastos += c;
  st.slotsAbiertos++;
  log(e, 'Compraron más terreno en ' + s.nombre + '.', 'obra');
  return { ok: true };
}

function puedeAbrirSitio(e, sitioId) {
  const s = SITIO[sitioId];
  if (e.sitios[sitioId].abierto) return { ok: false, msg: 'Ya está abierto.' };
  if (s.requiere && e.capitulo < s.requiere.capitulo) return { ok: false, msg: 'Se desbloquea en el capítulo ' + (s.requiere.capitulo + 1) + '.' };
  if (e.dinero < s.apertura) return { ok: false, msg: 'Faltan ' + fmtPlata(s.apertura - e.dinero) + '.' };
  return { ok: true };
}
function abrirSitio(e, sitioId) {
  const p = puedeAbrirSitio(e, sitioId);
  if (!p.ok) return p;
  const s = SITIO[sitioId];
  e.dinero -= s.apertura; e.stats.gastos += s.apertura;
  e.sitios[sitioId].abierto = true;
  log(e, '¡Nuevo sitio! <b>' + s.nombre + '</b>.', 'bueno');
  revisarCapitulo(e);
  return { ok: true };
}

function contratar(e, sitioId, rol) {
  const st = e.sitios[sitioId];
  if (!st.abierto) return { ok: false, msg: 'Sitio cerrado.' };
  if (totalPersonal(st) >= cupoPersonal(e, sitioId)) return { ok: false, msg: 'No hay dónde alojar a más gente: construye una residencia.' };
  const fee = PERSONAL[rol].sueldo * 3;
  if (e.dinero < fee) return { ok: false, msg: 'Faltan ' + fmtPlata(fee - e.dinero) + ' para la contratación.' };
  e.dinero -= fee; e.stats.gastos += fee;
  st.staff[rol]++;
  return { ok: true };
}
function despedir(e, sitioId, rol) {
  const st = e.sitios[sitioId];
  if (st.staff[rol] <= 0) return { ok: false };
  st.staff[rol]--;
  return { ok: true };
}
function fijarPrecio(e, sitioId, precio) {
  e.sitios[sitioId].precio = limitar(Math.round(precio / 500) * 500, 2000, 400000);
}
function precioReferencia(e, sitioId) {
  return SITIO[sitioId].precioRef * (1 + efecto(e, 'precio'));
}

/* Publicar: la ciencia que sobra se convierte en plata y fama. */
/* Tarifa fija por dato: si dependiera de los ingresos, la plata crecería al cuadrado. */
function valorPublicacion(e) {
  return Math.round(40000 * (1 + 0.05 * Math.min(10, Math.floor(e.stats.publicaciones / 5))));
}
function publicar(e, cantidad) {
  const c = Math.floor(Math.min(cantidad, e.ciencia));
  if (c < 10) return { ok: false, msg: 'Se necesitan al menos 10 🔬 para publicar.' };
  const monto = valorPublicacion(e) * c;
  e.ciencia -= c;
  e.dinero += monto; e.stats.ingresos += monto;
  e.fama += 0.0004 * Math.sqrt(c);
  e.stats.publicaciones++;
  log(e, '📰 Publicaron un paper con ' + c + ' 🔬 de datos. +' + fmtPlata(monto), 'bueno');
  return { ok: true, monto };
}

function puedeInvestigar(e, id) {
  const inv = INV[id];
  if (!inv) return { ok: false, msg: 'No existe.' };
  if (e.inv[id]) return { ok: false, msg: 'Ya está.' };
  const falta = (inv.requiere || []).filter(r => !e.inv[r]);
  if (falta.length) return { ok: false, msg: 'Primero: ' + falta.map(r => INV[r].nombre).join(', ') + '.' };
  if (e.ciencia < inv.costo) return { ok: false, msg: 'Faltan ' + Math.ceil(inv.costo - e.ciencia) + ' 🔬.' };
  return { ok: true };
}
function investigar(e, id) {
  const p = puedeInvestigar(e, id);
  if (!p.ok) return p;
  e.ciencia -= INV[id].costo;
  e.inv[id] = true;
  log(e, 'Investigación lista: <b>' + INV[id].nombre + '</b>.', 'bueno');
  revisarCapitulo(e);
  return { ok: true };
}

/* ============================================================
   OBRAS (corren en tiempo real, también con la página cerrada)
   ============================================================ */
function revisarObras(e) {
  const ahora = Date.now();
  for (const s of SITIOS) {
    const st = e.sitios[s.id];
    st.slots.forEach((sl, i) => {
      if (!sl || !sl.obra || sl.obra.fin > ahora) return;
      const def = EDIFICIOS[sl.id];
      if (def.etapas) {
        sl.etapa = sl.obra.etapa;
        sl.obra = null;
        if (sl.etapa >= def.etapas.length) {
          sl.nivel = 1;
          log(e, '✨ <b>¡Primera luz del Telescopio Gigante!</b> El mundo entero mira hacia Cerro Armazones.', 'epico');
          e.fama += 0.5;
        } else {
          log(e, 'Gigante: terminó «' + def.etapas[sl.etapa - 1].nombre + '».', 'obra');
        }
        Motor.avisar.obra(s.id, i, sl);
        return;
      }
      const eraNuevo = sl.nivel < 1;
      sl.nivel = sl.obra.nivel;
      sl.obra = null;
      log(e, (eraNuevo ? 'Listo: <b>' : 'Mejorado: <b>') + def.nombre + '</b>' + (eraNuevo ? '' : ' (nivel ' + sl.nivel + ')') + ' en ' + s.nombre + '.', 'obra');
      Motor.avisar.obra(s.id, i, sl);
    });
  }
  revisarCapitulo(e);
}

/* Con el tiempo acelerado, las obras también corren más rápido: se les
   adelanta la hora de término (siguen siendo relojes de tiempo real). */
function adelantarObras(e, ms) {
  if (!(ms > 0)) return;
  for (const s of SITIOS) for (const sl of e.sitios[s.id].slots) if (sl && sl.obra) sl.obra.fin -= ms;
}

/* ============================================================
   COSAS DE LA ESCENA — premios chicos por estar mirando
   ============================================================ */
const DESEOS_POR_NOCHE = 2;
/* La madrugada pertenece a la noche que empezó el día anterior. */
function nocheDeJuego(e) { return e.reloj.hora < 12 ? e.reloj.dia - 1 : e.reloj.dia; }
function vidaDeHoy(e) {
  const n = nocheDeJuego(e);
  if (!e.vida || e.vida.noche !== n || !e.vida.fotos) e.vida = { noche: n, deseos: 0, fotos: {} };
  return e.vida;
}
/* Un pedacito de lo que deja una noche normal, redondeado a mil. */
function premioChico(e, parte, minimo) { return Math.round(Math.max(minimo, (e.prom.neto > 0 ? e.prom.neto : 0) * parte) / 1000) * 1000; }
function puedeDeseo(e) { return vidaDeHoy(e).deseos < DESEOS_POR_NOCHE; }
function pedirDeseo(e) {
  const v = vidaDeHoy(e);
  if (v.deseos >= DESEOS_POR_NOCHE) return { ok: false };
  v.deseos++;
  const monto = premioChico(e, 0.04, 20000);
  e.dinero += monto; e.stats.ingresos += monto;
  e.stats.deseos = (e.stats.deseos || 0) + 1;
  return { ok: true, monto };
}
/* La primera foto de cada animal en la noche; solo la del zorro deja propina. */
function fotoDe(e, tipo) {
  const v = vidaDeHoy(e);
  if (v.fotos[tipo]) return { ok: true, monto: 0, repetida: true };
  v.fotos[tipo] = 1;
  const monto = tipo === 'zorro' ? premioChico(e, 0.02, 10000) : 0;
  if (monto) { e.dinero += monto; e.stats.ingresos += monto; }
  e.stats.fotos = (e.stats.fotos || 0) + 1;
  return { ok: true, monto };
}

/* ============================================================
   EL RELOJ
   ============================================================ */
function esHoraDeNoche(h) { return h >= 20 || h < 6; }
function segPorHora(h) {
  const hi = Math.floor(h) % 24;
  if (hi === 19 || hi === 6) return (JUEGO.segPorHoraNoche + JUEGO.segPorHoraDia) / 2;
  return esHoraDeNoche(hi) ? JUEGO.segPorHoraNoche : JUEGO.segPorHoraDia;
}
function msPorDiaDeJuego() {
  let ms = 0;
  for (let h = 0; h < 24; h++) ms += segPorHora(h) * 1000;
  return ms;
}

/** Avanza el juego `dtMs` milisegundos reales. */
function avanzar(e, dtMs) {
  revisarObras(e);
  let resto = Math.max(0, dtMs);
  let vueltas = 0;
  while (resto > 0 && vueltas++ < 200) {
    const h = e.reloj.hora;
    const msHora = segPorHora(h) * 1000;
    const hastaProx = (Math.floor(h) + 1 - h) * msHora;
    if (resto < hastaProx) {
      e.reloj.hora += resto / msHora;
      resto = 0;
    } else {
      resto -= hastaProx;
      e.reloj.hora = Math.floor(h) + 1;
      if (e.reloj.hora >= 24) { e.reloj.hora -= 24; e.reloj.dia++; }
      procesarHora(e, Math.floor(e.reloj.hora));
    }
  }
  e.t = Date.now();
}

/* ============================================================
   LA NOCHE
   ============================================================ */
function contextoCielo(e, sitioId) {
  const s = SITIO[sitioId];
  const f = fechaHoy();
  let cielo = s.cielo;
  for (const ev of e.eventos) {
    const def = EVENTOS.find(x => x.id === ev.id);
    if (def && def.efecto.cielo && (!ev.sitio || ev.sitio === sitioId)) cielo += def.efecto.cielo;
  }
  cielo += efectoTemporal(e, 'cielo', sitioId);
  return { cielo: limitar(cielo, 0.2, 1.05), fecha: f };
}

/** Luna de esta noche (fracción iluminada a medianoche, hora real de Chile). */
function lunaDeHoy() {
  const f = fechaHoy();
  try {
    const ms = Date.UTC(f.y, f.m, f.d) + (24 + 3) * 3600000;
    return faseLunar(ms).fraccion;
  } catch (e) { return 0.5; }
}

function eventoActivo(e, id, sitioId) {
  return e.eventos.find(x => x.id === id && (!x.sitio || !sitioId || x.sitio === sitioId)) || null;
}

/** Prepara la noche: clima, eventos y cuánta gente viene. Se llama a las 19:00. */
function prepararNoche(e) {
  const f = fechaHoy();
  const luna = lunaDeHoy();
  const lluvia = lluviaActiva(f);
  const temporadas = temporadasActivas(f);
  const finde = f.dow === 5 || f.dow === 6;
  const noche = { dia: e.reloj.dia, luna, lluvia: lluvia ? lluvia.nombre : null, lluviaTasa: lluvia ? lluvia.tasa : 0,
    temporadas: temporadas.map(t => t.nombre), finde, sitios: {}, descubrimientos: [], eventos: e.eventos.map(x => x.id),
    ingresos: { entradas: 0, extras: 0, alojamiento: 0, tiempo: 0, dia: 0 }, ciencia: 0 };

  for (const s of SITIOS) {
    const st = e.sitios[s.id];
    if (!st.abierto) continue;
    const ctx = contextoCielo(e, s.id);
    const r = azar(), d = s.despejado[f.m];
    let clima = r < d ? 'despejado' : (r < d + (1 - d) * 0.45 ? 'parcial' : 'nublado');
    const corte = !!eventoActivo(e, 'corte', s.id) && !tieneEnSitio(e, s.id, 'paneles');
    const ns = { clima, corte, cielo: ctx.cielo, visitantes: 0, demanda: 0, capacidad: 0, nota: null, vip: 0,
      ingresos: { entradas: 0, extras: 0, alojamiento: 0, tiempo: 0, dia: 0 }, ciencia: 0, desc: 0, cerrado: false };
    noche.sitios[s.id] = ns;
    for (const sl of st.slots) if (sl) sl.descNoche = 0;
  }
  noche.ctx = { luna, lluvia, temporadas, finde };
  e.noche = noche;
  if (lluvia) e.stats.nochesLluvia++;
  // aniversario: una estrella especial, una vez al año
  if (temporadas.some(t => t.aniversario) && !e.aniversario[f.y]) {
    e.aniversario[f.y] = true;
    crearDescubrimiento(e, 'elqui', null, 'estrella28');
  }
}

function demandaSitio(e, sitioId, ctx) {
  const s = SITIO[sitioId], st = e.sitios[sitioId];
  const notaF = 0.3 + 0.7 * Math.pow(st.nota / 5, 2);
  const fama = 1 + e.fama + 0.45 * Math.log10(1 + e.stats.visitantes / 150);
  let temp = ctx.finde ? 1.2 : 1;
  for (const t of ctx.temporadas) {
    temp *= t.demanda;
    if (t.parejas && e.inv.parejas) temp *= t.parejas / 1.6;
  }
  const inv = 1 + efecto(e, 'demanda');
  let ev = 1 + efectoTemporal(e, 'demanda', sitioId);
  for (const x of e.eventos) {
    const def = EVENTOS.find(v => v.id === x.id);
    if (def && def.efecto.demanda && (!x.sitio || x.sitio === sitioId)) ev += def.efecto.demanda;
  }
  if (ctx.lluvia) ev += 0.6 * ctx.lluvia.tasa;
  const ref = precioReferencia(e, sitioId);
  const precioF = limitar(Math.exp(-1.5 * (st.precio / ref - 1)), 0.12, 2.2);
  const legado = 1 + 0.08 * nivelLegado(e, 'fama');
  return 70 * s.turismo * notaF * fama * temp * inv * ev * precioF * legado;
}

function calcularTurismo(e, sitioId, ns, ctx) {
  const s = SITIO[sitioId], st = e.sitios[sitioId];
  const D = demandaSitio(e, sitioId, ctx) * entre(0.88, 1.12);
  ns.demanda = Math.round(D);
  if (efectoTemporal(e, 'cerrar', sitioId) > 0) { ns.cerrado = true; ns.visitantes = 0; return; }

  // capacidad física
  let fisica = 0, vipCap = 0, mejorTel = 0, telesPublico = 0;
  for (const sl of st.slots) {
    if (!sl || sl.nivel < 1) continue;
    const def = EDIFICIOS[sl.id], rinde = NIVEL_RINDE[sl.nivel - 1];
    if (def.cat === 'telescopio' && sl.modo === 'publico' && def.publico > 0 && !sl.danado) {
      // sin luz solo funciona el Dobson, que es a mano
      if (ns.corte && sl.id !== 'dobson') continue;
      const cap = def.publico * rinde;
      if (def.vip) vipCap += cap; else fisica += cap;
      telesPublico++;
      mejorTel = Math.max(mejorTel, def.nota || 0);
    }
    if (sl.id === 'mirador') fisica += def.publico * rinde;
  }
  if (ns.clima === 'parcial') { fisica *= 0.6; vipCap *= 0.6; }
  let planetario = 0;
  for (const sl of st.slots) if (sl && sl.id === 'planetario' && sl.nivel >= 1) planetario += EDIFICIOS.planetario.publicoNublado * NIVEL_RINDE[sl.nivel - 1];
  if (ns.clima === 'nublado') { fisica = planetario; vipCap = 0; }
  else if (ns.clima === 'parcial') fisica += planetario * 0.5;

  const guias = st.staff.guia * CAPACIDAD_GUIA + (sitioId === 'elqui' ? CAPACIDAD_PAREJA : 0);
  const capacidad = Math.max(0, Math.min(fisica + vipCap, guias));
  ns.capacidad = Math.round(capacidad);
  ns.guias = guias; ns.fisica = Math.round(fisica + vipCap);
  let V = Math.floor(Math.min(D, capacidad));
  ns.visitantes = V;
  ns.vip = Math.min(V, Math.round(vipCap));

  // nota de la noche
  let nota = 3.4 + 0.9 * (ns.cielo - 0.6);
  if (ns.clima === 'parcial') nota -= 0.45;
  if (ns.clima === 'nublado') nota = planetario > 0 ? 3.7 : 2.0;
  const f = ctx.luna;
  if (ns.clima !== 'nublado') {
    if (tieneEfecto(e, 'lunaTour')) nota += 0.18 * f;
    else nota -= 0.8 * Math.max(0, f - 0.5);
  }
  const ref = precioReferencia(e, sitioId);
  const rp = st.precio / ref;
  nota -= 0.9 * Math.max(0, rp - 1);
  nota += 0.18 * Math.max(0, 1 - rp);
  // amenidades: cada tipo cuenta una vez, y su nivel suma un poco
  const vistos = {};
  for (const sl of st.slots) {
    if (!sl || sl.nivel < 1) continue;
    const def = EDIFICIOS[sl.id];
    if (def.cat !== 'turismo' || vistos[sl.id]) continue;
    vistos[sl.id] = true;
    let n = def.nota || 0;
    if (sl.id === 'planetario' && ns.clima !== 'despejado') n += 0.3;
    nota += n + 0.02 * (sl.nivel - 1);
  }
  nota += mejorTel;
  // repleto: filas largas en cada telescopio
  if (capacidad > 0 && V >= capacidad * 0.97 && D > capacidad * 1.25) nota -= 0.12;
  nota += efecto(e, 'nota') + e.notaPermanente + efectoTemporal(e, 'nota', sitioId);
  if (ctx.lluvia && ns.clima !== 'nublado') nota += 0.35 * ctx.lluvia.tasa;
  for (const x of e.eventos) {
    const def = EVENTOS.find(v => v.id === x.id);
    if (def && def.efecto.nota && (!x.sitio || x.sitio === sitioId)) nota += def.efecto.nota;
  }
  nota += entre(-0.15, 0.15);
  ns.nota = V > 0 ? limitar(nota, 1, 5) : null;
}

/** Ingreso de esta hora de la noche (se reparte para que la plata suba de a poco). */
const REPARTO_ENTRADAS = { 20: 0.35, 21: 0.4, 22: 0.25 };
const REPARTO_EXTRAS = { 21: 0.3, 22: 0.3, 23: 0.25, 0: 0.15 };

function procesarHora(e, h) {
  if (h === 19) prepararNoche(e);
  // la gente se cuenta a las 20:00: lo que se termine de construir antes, alcanza a recibir
  if (h === 20 && e.noche) {
    for (const s of SITIOS) {
      const ns = e.noche.sitios[s.id];
      if (ns && !s.soloRadio && e.sitios[s.id].abierto) calcularTurismo(e, s.id, ns, e.noche.ctx);
    }
    e.noche.turismoListo = true;
  }
  const noche = e.noche;
  if (noche) {
    for (const s of SITIOS) {
      const st = e.sitios[s.id], ns = noche.sitios[s.id];
      if (!st.abierto || !ns) continue;
      if (REPARTO_ENTRADAS[h] && ns.visitantes > 0) {
        const comun = ns.visitantes - ns.vip;
        const monto = (comun * st.precio + ns.vip * st.precio * 3) * REPARTO_ENTRADAS[h];
        cobrar(e, monto, ns, noche, 'entradas');
      }
      if (REPARTO_EXTRAS[h] && ns.visitantes > 0) {
        cobrar(e, gastoExtra(e, s.id, ns) * REPARTO_EXTRAS[h], ns, noche, 'extras');
      }
      if (h === 23) cobrar(e, alojamiento(e, s.id, ns), ns, noche, 'alojamiento');
    }
  }
  // ciencia: de noche los ópticos, siempre la radio, de día el solar
  for (const s of SITIOS) {
    const st = e.sitios[s.id];
    if (!st.abierto) continue;
    st.slots.forEach((sl) => {
      if (!sl || sl.nivel < 1 || sl.danado) return;
      const def = EDIFICIOS[sl.id];
      if (def.cat !== 'telescopio' || sl.modo !== 'ciencia') return;
      const c = cienciaHora(e, s.id, sl, def, h);
      if (c.ciencia <= 0 && c.venta <= 0) return;
      e.ciencia += c.ciencia;
      e.stats.cienciaTot += c.ciencia;
      if (noche) {
        noche.ciencia += c.ciencia;
        if (noche.sitios[s.id]) noche.sitios[s.id].ciencia += c.ciencia;
      }
      cobrar(e, c.venta, noche && noche.sitios[s.id], noche, 'tiempo');
      for (const enc of e.encargos) if (enc.tipo === 'ciencia') enc.prog += c.ciencia;
      if (def.umbral) {
        sl.prog += c.ciencia;
        const umbral = umbralDe(e, def);
        // tope por noche y por telescopio: los grandes encuentran más, pero nunca una lluvia
        const tope = def.clase === 5 ? 2 : 1;
        if (sl.prog >= umbral && (sl.descNoche || 0) < tope) {
          sl.prog -= umbral;
          sl.descNoche = (sl.descNoche || 0) + 1;
          crearDescubrimiento(e, s.id, sl, null);
        }
        if (sl.prog > umbral * 2) sl.prog = umbral * 2;
      }
    });
  }
  // de día: planetario con colegios y telescopio solar con visitas
  if (h === 11) {
    for (const s of SITIOS) {
      const st = e.sitios[s.id];
      if (!st.abierto) continue;
      let monto = 0;
      for (const sl of st.slots) {
        if (!sl || sl.nivel < 1) continue;
        const def = EDIFICIOS[sl.id], rinde = NIVEL_RINDE[sl.nivel - 1];
        if (sl.id === 'planetario') monto += def.publicoDia * rinde * def.precioDia * (1 + efecto(e, 'escolar'));
        if (sl.id === 'solar' && !sl.danado) monto += def.publicoDia * rinde * st.precio * 0.4;
      }
      if (monto > 0) cobrar(e, monto, noche && noche.sitios[s.id], noche, 'dia');
    }
  }
  if (h === 6 && noche) cerrarNoche(e);
}

function cobrar(e, monto, ns, noche, tipo) {
  if (!(monto > 0)) return;
  e.dinero += monto;
  e.stats.ingresos += monto;
  if (ns) ns.ingresos[tipo] += monto;
  if (noche) noche.ingresos[tipo] += monto;
}

function gastoExtra(e, sitioId, ns) {
  const st = e.sitios[sitioId];
  let g = 0;
  const caf = mejorNivelEnSitio(e, sitioId, 'cafeteria');
  const tie = mejorNivelEnSitio(e, sitioId, 'tienda');
  if (caf) g += EDIFICIOS.cafeteria.gasto * (1 + 0.35 * (caf - 1));
  if (tie) g += EDIFICIOS.tienda.gasto * (1 + 0.35 * (tie - 1)) * (1 + efecto(e, 'tienda')) * (1 + Math.min(0.5, e.stats.descubrimientos * 0.002));
  const factorSitio = SITIO[sitioId].precioRef / 15000;
  return ns.visitantes * g * Math.sqrt(factorSitio) * (st.precio > 0 ? 1 : 0);
}
function alojamiento(e, sitioId, ns) {
  const st = e.sitios[sitioId];
  let monto = 0, camasTot = 0;
  const reservas = Math.round(ns.demanda * 0.35);
  let quedan = reservas;
  // primero los domos (más caros), después el hostal
  for (const id of ['domos', 'hostal']) {
    for (const sl of st.slots) {
      if (!sl || sl.id !== id || sl.nivel < 1 || quedan <= 0) continue;
      const def = EDIFICIOS[id];
      const camas = Math.floor(def.camas * NIVEL_RINDE[sl.nivel - 1]);
      const usa = Math.min(camas, quedan);
      quedan -= usa; camasTot += camas;
      monto += usa * def.tarifa * (1 + 0.12 * (sl.nivel - 1)) * Math.sqrt(SITIO[sitioId].precioRef / 15000);
    }
  }
  ns.huespedes = reservas - quedan;
  return monto;
}

/* Cada clase de telescopio encuentra primero lo fácil: el umbral sube con lo
   que esa clase ya descubrió, así un descubrimiento sigue siendo una noticia. */
function umbralDe(e, def) {
  const k = (e.descClase && e.descClase[def.clase]) || 0;
  return def.umbral * (1 - efecto(e, 'umbral')) * (1 + 0.08 * k);
}

/** Ciencia y venta de tiempo de un telescopio en una hora. */
function cienciaHora(e, sitioId, sl, def, h) {
  const s = SITIO[sitioId], st = e.sitios[sitioId];
  const noche = e.noche, ns = noche && noche.sitios[sitioId];
  const nocturna = esHoraDeNoche(h);
  let factor = 0;
  if (def.solar) {
    if (h < 8 || h > 18) return { ciencia: 0, venta: 0 };
    factor = (ns && ns.clima === 'nublado') ? 0.1 : 1;
  } else if (def.radio) {
    factor = nocturna ? 1 : 0.6;
    if (ns && ns.clima === 'nublado') factor *= 0.85;
  } else {
    if (!nocturna) return { ciencia: 0, venta: 0 };
    if (ns && ns.corte) return { ciencia: 0, venta: 0 };
    const clima = ns ? ns.clima : 'despejado';
    const cielo = ns ? ns.cielo : s.cielo;
    factor = cielo * (clima === 'despejado' ? 1 : clima === 'parcial' ? 0.45 : 0);
    const luna = noche ? noche.luna : 0.5;
    factor *= 1 - 0.5 * luna * (1 - efecto(e, 'lunaCiencia'));
    const viento = eventoActivo(e, 'viento', sitioId);
    if (viento) factor *= 0.5;
  }
  if (factor <= 0) return { ciencia: 0, venta: 0 };
  const rinde = NIVEL_RINDE[sl.nivel - 1];
  // personal: los astrónomos suben la ciencia; sin el mínimo, el instrumento rinde poco
  const cientificos = edificiosEnSitio(e, sitioId, (x, d) => d.cat === 'telescopio' && x.modo === 'ciencia').length || 1;
  const astro = Math.min(st.staff.astro, cientificos * 2);
  let personal = 1 + 0.22 * astro;
  if (def.astroMin && st.staff.astro < def.astroMin) personal *= 0.25;
  if (def.ingMin && st.staff.inge < def.ingMin) personal *= 0.4;
  let inv = (1 + efecto(e, 'ciencia')) * (typeof def.clase === 'number' && def.clase >= 3 ? 1 + efecto(e, 'cienciaGrande') : 1);
  if (tieneEnSitio(e, sitioId, 'taller')) inv *= 1 + EDIFICIOS.taller.cienciaExtra * mejorNivelEnSitio(e, sitioId, 'taller');
  inv *= 1 + 0.10 * nivelLegado(e, 'ciencia');
  let sinergia = 1;
  if (def.radio) {
    const n = edificiosEnSitio(e, sitioId, (x) => x.id === 'antena').length;
    sinergia = 1 + (0.03 + efecto(e, 'sinergia')) * Math.max(0, n - 1);
  }
  const ciencia = def.ciencia * rinde * factor * personal * inv * sinergia;
  const venta = def.venta * rinde * Math.min(1, factor / Math.max(0.4, s.cielo)) * (1 + efecto(e, 'venta')) * (def.astroMin && st.staff.astro < def.astroMin ? 0.25 : 1);
  return { ciencia, venta };
}

/* ============================================================
   DESCUBRIMIENTOS
   ============================================================ */
function crearDescubrimiento(e, sitioId, sl, tipoForzado) {
  let tipo = tipoForzado, rIdx;
  const def = sl ? EDIFICIOS[sl.id] : null;
  if (!tipo) {
    const clase = def.clase;
    const pesos = (PESOS_RAREZA[clase] || PESOS_RAREZA[1]).slice();
    const suerte = efecto(e, 'suerte') + 0.08 * nivelLegado(e, 'suerte');
    for (let i = 0; i < pesos.length; i++) pesos[i] *= Math.pow(1 + suerte, i);
    rIdx = elegirPonderado(pesos);
    let candidatos = [];
    while (rIdx >= 0) {
      candidatos = Object.keys(TIPOS).filter(id => {
        const t = TIPOS[id];
        return t.clases.includes(clase) && RAREZA_IDX[t.rareza] === rIdx && (!t.requiere || e.inv[t.requiere]);
      });
      if (candidatos.length) break;
      rIdx--;
    }
    if (!candidatos.length) return null;
    // los tipos que todavía no tienen pesan el doble: el álbum avanza
    const pesosT = candidatos.map(id => e.tipos[id] ? 1 : 2);
    tipo = candidatos[elegirPonderado(pesosT)];
  }
  rIdx = RAREZA_IDX[TIPOS[tipo].rareza];
  const f = fechaHoy();
  const n = e.seq++;
  const d = {
    s: (Math.random() * 4294967296) >>> 0, t: tipo, r: rIdx, si: sitioId, d: e.reloj.dia, n,
    c: 'RC ' + f.y + '-' + String(n).padStart(4, '0'), f: Date.now(),
  };
  if (tipo === 'estrella28') { d.nombre = 'Estrella del 28'; d.c = 'RC ' + f.y + '-CYD'; }
  e.descubrimientos.unshift(d);
  podarCatalogo(e);
  e.tipos[tipo] = (e.tipos[tipo] || 0) + 1;
  e.stats.descubrimientos++;
  if (def) e.descClase[def.clase] = (e.descClase[def.clase] || 0) + 1;
  e.stats.mejorRareza = Math.max(e.stats.mejorRareza, rIdx);
  const valor = RAREZAS[rIdx].valor;
  const base = def ? Math.max(def.venta, 150000) : 2e6;
  const premio = Math.round(valor * base * 2.5);
  const cienciaExtra = valor * 2;
  e.dinero += premio; e.stats.ingresos += premio;
  e.ciencia += cienciaExtra; e.stats.cienciaTot += cienciaExtra;
  e.fama += 0.0015 * valor;
  d.premio = premio;
  if (e.noche) { e.noche.descubrimientos.push(d.n); if (e.noche.sitios[sitioId]) e.noche.sitios[sitioId].desc++; }
  for (const enc of e.encargos) if (enc.tipo === 'descubrimientos') enc.prog++;
  log(e, '🔭 <b>' + TIPOS[tipo].nombre + '</b> (' + RAREZAS[rIdx].nombre.toLowerCase() + ') en ' + SITIO[sitioId].nombre + '. +' + fmtPlata(premio), rIdx >= 3 ? 'epico' : 'bueno');
  Motor.avisar.descubrimiento(d);
  return d;
}

/** El catálogo guardado no crece sin fin: se quedan todos los bautizados, los raros y los 220 más nuevos. */
function podarCatalogo(e) {
  const L = e.descubrimientos;
  if (L.length <= 320) return;
  const quedan = [], resto = [];
  L.forEach((d, i) => ((d.nombre || d.r >= 3 || i < 220) ? quedan : resto).push(d));
  e.descubrimientos = quedan.slice(0, 600);
}

function bautizar(e, n, nombre, dedicatoria, para) {
  const d = e.descubrimientos.find(x => x.n === n);
  if (!d) return { ok: false, msg: 'No lo encuentro.' };
  const limpio = String(nombre || '').trim().slice(0, 40);
  if (!limpio) return { ok: false, msg: 'Falta el nombre.' };
  const primera = !d.nombre;
  d.nombre = limpio;
  d.ded = String(dedicatoria || '').trim().slice(0, 160) || null;
  d.para = para || null;
  d.fb = Date.now();
  if (primera) e.stats.bautizados++;
  if (para) e.stats.dedicados++;
  revisarCapitulo(e);
  return { ok: true, d };
}

/* ============================================================
   AL AMANECER
   ============================================================ */
function cerrarNoche(e) {
  const noche = e.noche;
  e.noche = null;
  const gastos = gastoDiario(e);
  e.dinero -= gastos;
  e.stats.gastos += gastos;
  let visitas = 0, notaSuma = 0, nublados = 0;
  const resenas = [];
  for (const s of SITIOS) {
    const st = e.sitios[s.id], ns = noche.sitios[s.id];
    if (!st.abierto || !ns) continue;
    const V = ns.visitantes;
    visitas += V;
    st.visitas += V;
    if (ns.clima === 'nublado') { nublados++; e.stats.visitasNubladas += V; }
    if (V > 0 && ns.nota != null) {
      const w = Math.min(st.n, 260);
      st.nota = limitar((st.nota * w + ns.nota * V) / (w + V), 1, 5);
      st.n += V;
      notaSuma += ns.nota * V;
      if (V >= 30) e.records.mejorNota = Math.max(e.records.mejorNota, ns.nota);
      e.records.nocheSitio[s.id] = Math.max(e.records.nocheSitio[s.id] || 0, V);
      const cuantas = V >= 8 ? (azar() < 0.55 ? 1 : 2) : (azar() < 0.4 ? 1 : 0);
      for (let i = 0; i < cuantas; i++) resenas.push(crearResena(ns.nota, s.id, ns));
    }
    st.ultima = { dia: noche.dia, clima: ns.clima, visitantes: V, demanda: ns.demanda, capacidad: ns.capacidad,
      nota: ns.nota, ingresos: Object.values(ns.ingresos).reduce((a, b) => a + b, 0), ciencia: ns.ciencia, guias: ns.guias, fisica: ns.fisica };
    for (const enc of e.encargos) {
      if (enc.sitio && enc.sitio !== s.id) continue;
      if (enc.tipo === 'visitasNoche' && V >= enc.meta && (ns.nota || 0) >= 4.0) enc.prog = enc.meta;
      if (enc.tipo === 'noches' && ns.clima === 'despejado' && V >= 10) enc.prog++;
      if (enc.tipo === 'nota' && V >= 10 && (ns.nota || 0) >= enc.meta) enc.prog++;
      if (enc.tipo === 'visitas') enc.prog += V;
    }
  }
  e.stats.visitantes += visitas;
  e.stats.noches++;
  e.resenas = resenas.concat(e.resenas).slice(0, 30);
  const ingresos = Object.values(noche.ingresos).reduce((a, b) => a + b, 0);
  const neto = ingresos - gastos;
  e.records.mejorNoche = Math.max(e.records.mejorNoche, ingresos);
  const a = e.stats.noches <= 1 ? 1 : 0.3;
  e.prom.neto = e.prom.neto * (1 - a) + neto * a;
  e.prom.ciencia = e.prom.ciencia * (1 - a) + noche.ciencia * a;
  e.prom.visitas = e.prom.visitas * (1 - a) + visitas * a;
  e.prom.desc = e.prom.desc * (1 - a) + noche.descubrimientos.length * a;

  // fallas al azar
  const fallas = [];
  for (const s of SITIOS) {
    const st = e.sitios[s.id];
    if (!st.abierto) continue;
    const taller = mejorNivelEnSitio(e, s.id, 'taller');
    st.slots.forEach(sl => {
      if (!sl || sl.nivel < 1 || sl.danado || EDIFICIOS[sl.id].cat !== 'telescopio' || sl.id === 'dobson') return;
      const p = 0.012 * (1 - efecto(e, 'fallas')) * (1 - (taller ? EDIFICIOS.taller.fallas : 0)) * Math.pow(0.7, st.staff.inge);
      if (azar() < p) { sl.danado = true; fallas.push({ sitio: s.id, nombre: EDIFICIOS[sl.id].nombre }); }
    });
  }
  fallas.forEach(x => log(e, '⚠️ Falla en ' + x.nombre + ' (' + SITIO[x.sitio].nombre + '). Hay que repararlo.', 'malo'));

  // efectos temporales que vencen
  e.efectos = e.efectos.filter(x => x.hasta > e.reloj.dia);
  e.eventos = e.eventos.filter(x => x.hasta > e.reloj.dia);

  // el fondo de investigación responde
  if (e.fondo && e.fondo.dia <= e.reloj.dia) {
    const f = e.fondo; e.fondo = null;
    if (azar() < f.prob) {
      e.dinero += f.monto; e.stats.ingresos += f.monto;
      log(e, '📜 ¡Ganaron el fondo de investigación! +' + fmtPlata(f.monto), 'bueno');
    } else log(e, '📜 El fondo no salió esta vez. Les dijeron que postulen de nuevo.', 'malo');
  }

  const reporte = {
    dia: noche.dia, luna: noche.luna, lluvia: noche.lluvia, temporadas: noche.temporadas, finde: noche.finde,
    visitantes: visitas, nota: visitas > 0 ? notaSuma / visitas : null, ingresos: noche.ingresos, ingresoTotal: ingresos,
    gastos, neto, ciencia: noche.ciencia, descubrimientos: noche.descubrimientos.slice(), resenas, sitios: noche.sitios,
    fallas, nublados,
  };
  e.ultimoReporte = reporte;

  revisarEncargos(e);
  sortearEventos(e);
  sortearDecision(e);
  nuevoEncargo(e);
  revisarCapitulo(e);
  revisarLogros(e);
  Motor.avisar.reporte(reporte);
}

function crearResena(nota, sitioId, ns) {
  let est = Math.round(limitar(nota + entre(-0.6, 0.6), 1, 5));
  if (ns.clima === 'nublado' && est > 3) est = 3;
  const textos = RESENAS[est] || RESENAS[3];
  return { estrellas: est, texto: elegir(textos), quien: elegir(NOMBRES_VISITA), sitio: sitioId };
}

/* ============================================================
   EVENTOS, DECISIONES Y ENCARGOS
   ============================================================ */
function sitiosAbiertos(e) { return SITIOS.filter(s => e.sitios[s.id].abierto).map(s => s.id); }

function sortearEventos(e) {
  const abiertos = sitiosAbiertos(e);
  for (const def of EVENTOS) {
    if (e.eventos.some(x => x.id === def.id)) continue;
    if (def.requiereEdificio && contarEdificiosOp(e, def.requiereEdificio) === 0) continue;
    let sitio = null;
    if (!def.global) {
      const posibles = def.sitios ? abiertos.filter(id => def.sitios.includes(id)) : abiertos;
      if (!posibles.length) continue;
      sitio = elegir(posibles);
    }
    if (azar() >= def.prob) continue;
    if (def.efecto.sismo) { aplicarSismo(e); continue; }
    e.eventos.push({ id: def.id, sitio, hasta: e.reloj.dia + Math.max(1, def.noches) });
    if (def.efecto.fama) e.fama += def.efecto.fama;
    if (def.efecto.granCometa) {
      const tiene = SITIOS.some(s => e.sitios[s.id].slots.some(sl => sl && sl.nivel >= 1 && typeof EDIFICIOS[sl.id].clase === 'number' && EDIFICIOS[sl.id].clase >= 1 && sl.modo === 'ciencia'));
      if (tiene) crearDescubrimiento(e, sitio || 'elqui', null, 'granCometa');
    }
    log(e, def.emo + ' ' + def.texto + (sitio ? ' (' + SITIO[sitio].nombre + ')' : ''), 'evento');
    Motor.avisar.evento(def, sitio);
  }
}
function contarEdificiosOp(e, id) { return contarEdificios(e, id); }

function aplicarSismo(e) {
  e.stats.sismos++;
  const danados = [];
  const p0 = 0.22 * (1 - efecto(e, 'sismo'));
  for (const s of SITIOS) {
    const st = e.sitios[s.id];
    if (!st.abierto) continue;
    for (const sl of st.slots) {
      if (!sl || sl.nivel < 1 || sl.danado || EDIFICIOS[sl.id].cat !== 'telescopio') continue;
      if (azar() < p0 * Math.pow(0.85, st.staff.inge)) { sl.danado = true; danados.push(EDIFICIOS[sl.id].nombre); }
    }
  }
  log(e, '🫨 Temblor grado ' + entre(5.8, 6.9).toFixed(1) + '. ' +
    (danados.length ? 'Quedaron dañados: ' + danados.join(', ') + '.' : 'No pasó nada: Chile es así.'), danados.length ? 'malo' : 'evento');
  Motor.avisar.evento({ id: 'sismo', emo: '🫨', texto: danados.length ? 'Temblor: ' + danados.length + ' telescopio(s) dañado(s).' : 'Temblor fuerte, pero todo aguantó.' }, null);
}

function sortearDecision(e) {
  if (e.decision) {
    if (e.decision.expira <= e.reloj.dia) { e.decision = null; }
    else return;
  }
  const abiertos = sitiosAbiertos(e).filter(id => !SITIO[id].soloRadio);
  const posibles = DECISIONES.filter(d => {
    if (d.unaVez && e.decisionesVistas && e.decisionesVistas[d.id]) return false;
    if (d.minVisitas && e.stats.visitantes < d.minVisitas) return false;
    if (d.minCiencia && e.stats.cienciaTot < d.minCiencia) return false;
    if (d.id === 'perrito' && e.mascota) return false;
    if (d.id === 'fondo' && e.fondo) return false;
    return true;
  });
  for (const d of posibles) {
    if (azar() >= d.prob) continue;
    const sitio = abiertos.length ? elegir(abiertos) : 'elqui';
    const costo = Math.max(8, Math.round(e.prom.ciencia * 1.2));
    e.decision = { id: d.id, sitio, expira: e.reloj.dia + 2, costo };
    if (!e.decisionesVistas) e.decisionesVistas = {};
    e.decisionesVistas[d.id] = (e.decisionesVistas[d.id] || 0) + 1;
    Motor.avisar.decision(e.decision);
    return;
  }
}

function resolverDecision(e, idxOpcion) {
  const dec = e.decision;
  if (!dec) return { ok: false };
  const def = DECISIONES.find(d => d.id === dec.id);
  const op = def && def.opciones[idxOpcion];
  if (!op) return { ok: false };
  e.decision = null;
  let res = op.res || '';
  const ef = Object.assign({}, op.efecto || {});
  if (ef.azar) {
    let r = azar(), elegido = ef.azar[ef.azar.length - 1];
    for (const x of ef.azar) { r -= x.p; if (r <= 0) { elegido = x; break; } }
    Object.assign(ef, elegido); res = elegido.res || res;
  }
  const ingresoNoche = Math.max(800000, e.prom.neto > 0 ? e.prom.neto : 0);
  if (ef.cerrarNoche) e.efectos.push({ tipo: 'cerrar', valor: 1, sitio: dec.sitio, hasta: e.reloj.dia + 1 });
  if (ef.dineroNoches) {
    const m = Math.round(ingresoNoche * ef.dineroNoches);
    e.dinero += m;
    if (m > 0) e.stats.ingresos += m; else e.stats.gastos -= m;
  }
  if (typeof ef.dinero === 'number') { e.dinero += ef.dinero; if (ef.dinero < 0) e.stats.gastos -= ef.dinero; }
  if (ef.fama) e.fama += ef.fama;
  if (ef.nota) e.efectos.push({ tipo: 'nota', valor: ef.nota, sitio: dec.sitio, hasta: e.reloj.dia + 3 });
  if (ef.demandaNoches) e.efectos.push({ tipo: 'demanda', valor: ef.demandaNoches[0], sitio: null, hasta: e.reloj.dia + ef.demandaNoches[1] });
  if (ef.cieloNoches) e.efectos.push({ tipo: 'cielo', valor: ef.cieloNoches[0], sitio: dec.sitio, hasta: e.reloj.dia + ef.cieloNoches[1] });
  if (ef.mascota) { e.mascota = ef.mascota; e.notaPermanente += ef.notaPermanente || 0; }
  if (ef.postular) {
    if (e.ciencia < dec.costo) { res = 'No alcanzó la ciencia para postular (' + dec.costo + ' 🔬).'; }
    else {
      e.ciencia -= dec.costo;
      e.fondo = { dia: e.reloj.dia + 1, prob: 0.6, monto: Math.round(Math.max(3e6, ingresoNoche * 3.2)) };
    }
  }
  log(e, def.emo + ' ' + res, 'evento');
  revisarLogros(e);
  return { ok: true, res };
}

function nuevoEncargo(e) {
  if (e.encargos.length >= 3 || e.reloj.dia < e.encargoSig) return;
  const abiertos = sitiosAbiertos(e).filter(id => !SITIO[id].soloRadio);
  const hayCiencia = SITIOS.some(s => e.sitios[s.id].slots.some(sl => sl && sl.nivel >= 1 && sl.modo === 'ciencia' && EDIFICIOS[sl.id].umbral));
  const posibles = ENCARGOS.filter(x => (!x.requiereCiencia || hayCiencia) && !e.encargos.some(y => y.id === x.id));
  if (!posibles.length || e.stats.noches < 1) return;
  const def = elegir(posibles);
  const sitio = elegir(abiertos.length ? abiertos : ['elqui']);
  const st = e.sitios[sitio];
  let meta;
  switch (def.tipo) {
    case 'visitasNoche': meta = Math.max(20, Math.round(Math.max(st.ultima ? st.ultima.visitantes : 0, e.records.nocheSitio[sitio] || 0) * def.metaBase)); break;
    case 'ciencia': meta = Math.max(8, Math.round(e.prom.ciencia * def.metaBase * 1.4)); break;
    case 'descubrimientos': meta = Math.max(1, Math.min(12, Math.round(e.prom.desc * 3))); break;
    case 'noches': meta = 3; break;
    case 'visitas': meta = Math.max(60, Math.round(e.prom.visitas * def.metaBase)); break;
    case 'nota': meta = 4.4; break;
  }
  const escala = Math.max(1.2e6, e.prom.neto);
  const premio = Math.round(escala * (1.1 + 0.25 * def.noches));
  const premioCiencia = def.requiereCiencia ? Math.max(5, Math.round(e.prom.ciencia * 0.8)) : 0;
  e.encargos.push({ id: def.id, tipo: def.tipo, sitio: ['visitas', 'ciencia', 'descubrimientos'].includes(def.tipo) ? null : sitio,
    meta, prog: 0, hasta: e.reloj.dia + def.noches, premio, premioCiencia, noches: def.noches });
  e.encargoSig = e.reloj.dia + 1 + Math.floor(azar() * 3);
  log(e, def.emo + ' Nuevo encargo: <b>' + def.titulo + '</b>.', 'evento');
  Motor.avisar.encargo();
}

function revisarEncargos(e) {
  e.encargos = e.encargos.filter(enc => {
    const def = ENCARGOS.find(x => x.id === enc.id);
    const listo = enc.tipo === 'nota' ? enc.prog >= 3 : enc.prog >= enc.meta;
    if (listo) {
      e.dinero += enc.premio; e.stats.ingresos += enc.premio;
      e.ciencia += enc.premioCiencia;
      e.stats.encargos++;
      e.fama += 0.01;
      log(e, def.emo + ' ¡Encargo cumplido: ' + def.titulo + '! +' + fmtPlata(enc.premio) + (enc.premioCiencia ? ' y ' + enc.premioCiencia + ' 🔬' : ''), 'bueno');
      return false;
    }
    if (enc.hasta <= e.reloj.dia) {
      log(e, def.emo + ' Se venció el encargo «' + def.titulo + '».', 'malo');
      e.fama = Math.max(0, e.fama - 0.005);
      return false;
    }
    return true;
  });
}

/* ============================================================
   CAPÍTULOS Y LOGROS
   ============================================================ */
function revisarCapitulo(e) {
  let cambio = false;
  while (e.capitulo < CAPITULOS.length) {
    const cap = CAPITULOS[e.capitulo];
    if (!cap.metas.every(m => m.f(e))) break;
    const p = cap.premio;
    const primeraVez = !e.premiados[e.capitulo];
    e.premiados[e.capitulo] = true;
    if (p.dinero) { e.dinero += p.dinero; e.stats.ingresos += p.dinero; }
    if (p.ciencia) e.ciencia += p.ciencia;
    log(e, '📖 <b>Capítulo completo: ' + cap.titulo + '</b>.', 'epico');
    Motor.avisar.capitulo(e.capitulo, cap, primeraVez);
    e.capitulo++;
    cambio = true;
  }
  return cambio;
}
function revisarLogros(e) {
  for (const l of LOGROS) {
    if (e.logros[l.id]) continue;
    let ok = false;
    try { ok = l.f(e); } catch (err) { ok = false; }
    if (ok) { e.logros[l.id] = Date.now(); Motor.avisar.logro(l); }
  }
}

/* ============================================================
   AUSENCIA — mientras la página estaba cerrada
   El reloj del juego no corre (el observatorio los espera), pero el
   equipo sigue atendiendo: se paga un resumen a eficiencia reducida.
   ============================================================ */
function calcularAusencia(e, ahora) {
  const fuera = Math.max(0, (ahora || Date.now()) - e.t);
  if (fuera < 90000 || e.stats.noches < 1) return null;
  const cuenta = Math.min(fuera, JUEGO.offlineTopeH * 3600000);
  const noches = cuenta / msPorDiaDeJuego();
  const ef = JUEGO.offlineEficiencia;
  let neto = e.prom.neto * noches * ef;
  // el equipo no gasta más plata de la que hay
  if (neto < 0) neto = Math.max(neto, -e.dinero * 0.5);
  const ciencia = Math.max(0, e.prom.ciencia * noches * ef);
  const visitas = Math.max(0, Math.round(e.prom.visitas * noches * ef));
  const esperados = Math.max(0, e.prom.desc * noches * ef);
  const desc = Math.min(25, Math.floor(esperados) + (azar() < esperados % 1 ? 1 : 0));
  return { fuera, cuenta, noches, neto: Math.round(neto), ciencia, visitas, desc };
}
function aplicarAusencia(e, a) {
  if (!a) return [];
  e.dinero += a.neto;
  if (a.neto > 0) e.stats.ingresos += a.neto; else e.stats.gastos -= a.neto;
  e.ciencia += a.ciencia; e.stats.cienciaTot += a.ciencia;
  e.stats.visitantes += a.visitas;
  const nuevos = [];
  // los descubrimientos salen de los telescopios científicos que haya
  const teles = [];
  for (const s of SITIOS) e.sitios[s.id].slots.forEach(sl => {
    if (sl && sl.nivel >= 1 && sl.modo === 'ciencia' && EDIFICIOS[sl.id].umbral && !sl.danado) teles.push({ s: s.id, sl });
  });
  for (let i = 0; i < a.desc && teles.length; i++) {
    const x = elegir(teles);
    const d = crearDescubrimiento(e, x.s, x.sl, null);
    if (d) nuevos.push(d);
  }
  e.t = Date.now();
  revisarCapitulo(e);
  revisarLogros(e);
  return nuevos;
}

/* ============================================================
   LEGADO
   ============================================================ */
function puntosLegado(e) {
  return Math.max(1, Math.floor(
    Math.sqrt(e.stats.cienciaTot / 4000) + Math.sqrt(e.stats.visitantes / 25000) + e.stats.descubrimientos / 60 + Object.keys(e.tipos).length / 4));
}
function puedeNuevaGeneracion(e) { return e.capitulo >= CAPITULOS.length; }
function nuevaGeneracion(e) {
  if (!puedeNuevaGeneracion(e)) return { ok: false, msg: 'Primero terminen el Telescopio Gigante.' };
  const puntos = puntosLegado(e);
  const conserva = {
    duenio: e.duenio, creado: e.creado, descubrimientos: e.descubrimientos, tipos: e.tipos, seq: e.seq,
    logros: e.logros, stats: e.stats, records: e.records, legado: e.legado, resenas: e.resenas, registro: e.registro,
    mascota: e.mascota, notaPermanente: e.notaPermanente, ajustes: e.ajustes, aniversario: e.aniversario,
    premiados: e.premiados, decisionesVistas: e.decisionesVistas,
  };
  conserva.legado.puntos += puntos;
  conserva.legado.generaciones = (conserva.legado.generaciones || 0) + 1;
  const memoria = nivelLegado(e, 'memoria');
  const invGuardadas = INVESTIGACION.filter(i => e.inv[i.id]).sort((a, b) => a.costo - b.costo).slice(0, memoria * 4);
  const nuevo = estadoNuevo(e.duenio);
  Object.assign(nuevo, conserva);
  nuevo.capitulo = 0;
  nuevo.dinero = JUEGO.dineroInicial * Math.pow(3, nivelLegado(nuevo, 'capital'));
  nuevo.fama = e.fama * 0.3;
  invGuardadas.forEach(i => { nuevo.inv[i.id] = true; });
  log(nuevo, '♾️ Empieza la generación ' + (nuevo.legado.generaciones + 1) + '. Se llevan ' + puntos + ' ✦ de polvo de estrellas.', 'epico');
  return { ok: true, estado: nuevo, puntos };
}
function comprarLegado(e, id) {
  const def = LEGADO.find(x => x.id === id);
  if (!def) return { ok: false };
  const nivel = nivelLegado(e, id);
  if (nivel >= def.max) return { ok: false, msg: 'Al máximo.' };
  const costo = def.costo * (nivel + 1);
  if (e.legado.puntos < costo) return { ok: false, msg: 'Faltan ' + (costo - e.legado.puntos) + ' ✦.' };
  e.legado.puntos -= costo;
  e.legado.mejoras[id] = nivel + 1;
  return { ok: true };
}

/* ============================================================
   RESUMEN DE "ESTA NOCHE" PARA LA INTERFAZ
   ============================================================ */
function pronosticoSitio(e, sitioId) {
  const f = fechaHoy();
  const ctx = { luna: lunaDeHoy(), lluvia: lluviaActiva(f), temporadas: temporadasActivas(f), finde: f.dow === 5 || f.dow === 6 };
  const ns = { clima: 'despejado', cielo: contextoCielo(e, sitioId).cielo, corte: false,
    ingresos: { entradas: 0, extras: 0, alojamiento: 0, tiempo: 0, dia: 0 } };
  const guardaAzar = Math.random;
  // sin ruido: el pronóstico tiene que ser estable mientras se mira
  Math.random = () => 0.5;
  try { calcularTurismo(e, sitioId, ns, ctx); }
  finally { Math.random = guardaAzar; }
  return ns;
}

/* ============================================================
   FORMATO
   ============================================================ */
function fmtPlata(x) {
  const neg = x < 0; x = Math.abs(x);
  let t;
  if (x < 1e6) t = '$' + Math.round(x).toLocaleString('es-CL');
  else if (x < 1e9) t = '$' + (x / 1e6).toLocaleString('es-CL', { maximumFractionDigits: x < 1e7 ? 1 : 0 }) + ' M';
  else if (x < 1e12) t = '$' + (x / 1e9).toLocaleString('es-CL', { maximumFractionDigits: x < 1e10 ? 2 : 1 }) + ' MM';
  else t = '$' + (x / 1e12).toLocaleString('es-CL', { maximumFractionDigits: 2 }) + ' B';
  return (neg ? '−' : '') + t;
}
function fmtNum(x) { return Math.round(x).toLocaleString('es-CL'); }
function fmtHora(h) {
  const hh = Math.floor(h) % 24, mm = Math.floor((h % 1) * 60);
  return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
}
function fmtDuracion(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  if (s < 60) return s + ' s';
  const m = Math.floor(s / 60);
  if (m < 60) return m + ' min' + (s % 60 && m < 10 ? ' ' + (s % 60) + ' s' : '');
  const h = Math.floor(m / 60);
  return h + ' h ' + (m % 60) + ' min';
}

if (typeof module !== 'undefined') {
  module.exports = { Motor, mulberry32, estadoNuevo, normalizar, construir, mejorar, demoler, reparar, cambiarModo, comprarTerreno,
    abrirSitio, puedeAbrirSitio, contratar, despedir, fijarPrecio, precioReferencia, investigar, puedeInvestigar, avanzar,
    procesarHora, prepararNoche, cerrarNoche, calcularAusencia, aplicarAusencia, bautizar, resolverDecision, nuevaGeneracion,
    puedeNuevaGeneracion, comprarLegado, publicar, valorPublicacion, puntosLegado, costoConstruir, costoMejora, costoTerreno, costoReparar, gastoDiario,
    mantencionSitio, sueldosSitio, cupoPersonal, totalPersonal, motivoNoConstruir, pronosticoSitio, fmtPlata, fmtNum, fmtHora,
    fmtDuracion, msPorDiaDeJuego, segPorHora, esHoraDeNoche, revisarObras, acelerar, costoAcelerar, lunaDeHoy, fechaHoy,
    temporadasActivas, lluviaActiva, efecto, demandaSitio, tiempoObra, contarTodos, crearDescubrimiento,
    adelantarObras, puedeDeseo, pedirDeseo, fotoDe, nocheDeJuego };
}
