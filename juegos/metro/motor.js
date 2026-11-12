/* ============================================================
   MOTOR — estaciones, líneas, trenes y la gente
   J es el juego entero (se guarda tal cual). RUTAS (el dibujo de
   cada línea) y DIST (cuántas paradas faltan para cada tipo de
   lugar) se recalculan cuando cambia la red. No toca el DOM.
   ============================================================ */
const Ev = { sonido() {}, aviso() {}, semana() {}, fin() {}, estacion() {}, entrega() {}, cambio() {}, dia() {} };
let J = null;
const EST = new Map();
const RUTAS = new Map();
let DIST = {};

/* ---------- azar con semilla (guardable) ---------- */
function hashTxt(t) { let h = 2166136261; for (const c of String(t)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function rf(R) {
  let t = (R.s = (R.s + 0x6D2B79F5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;

/* ============================================================
   GEOMETRÍA
   ============================================================ */
function orient(a, b, c) { return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]); }
function segInter(p, q, r, s) {
  const d1 = orient(r, s, p), d2 = orient(r, s, q), d3 = orient(p, q, r), d4 = orient(p, q, s);
  return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0));
}
function dentroPoligono(x, y, pol) {
  let dentro = false;
  for (let i = 0, j = pol.length - 1; i < pol.length; j = i++) {
    const [xi, yi] = pol[i], [xj, yj] = pol[j];
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) dentro = !dentro;
  }
  return dentro;
}
function distSeg(px, py, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy;
  const t = l2 ? clamp(((px - a[0]) * dx + (py - a[1]) * dy) / l2, 0, 1) : 0;
  return Math.hypot(px - (a[0] + dx * t), py - (a[1] + dy * t));
}
function distEstero(x, y) { let m = 1e9; for (let i = 0; i + 1 < GEO.estero.length; i++) m = Math.min(m, distSeg(x, y, GEO.estero[i], GEO.estero[i + 1])); return m; }
function centroCerro() { let x = 0, y = 0; for (const p of GEO.cerro) { x += p[0]; y += p[1]; } return { x: x / GEO.cerro.length, y: y / GEO.cerro.length }; }
function dentroCerro(x, y, margen) {
  if (dentroPoligono(x, y, GEO.cerro)) return true;
  if (!margen) return false;
  for (let i = 0, j = GEO.cerro.length - 1; i < GEO.cerro.length; j = i++) if (distSeg(x, y, GEO.cerro[j], GEO.cerro[i]) < margen) return true;
  return false;
}
/* Tramo octolineal, como en los planos de metro: recto y después en diagonal. */
function tramo(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, ax = Math.abs(dx), ay = Math.abs(dy), m = Math.min(ax, ay);
  if (m < 2 || Math.abs(ax - ay) < 2) return [[a.x, a.y], [b.x, b.y]];
  const c = ax >= ay ? [b.x - Math.sign(dx) * m, a.y] : [a.x, b.y - Math.sign(dy) * m];
  return [[a.x, a.y], c, [b.x, b.y]];
}
function costoTramo(a, b) {
  const p = tramo(a, b);
  let puentes = 0, tuneles = 0;
  for (let k = 0; k + 1 < p.length; k++) {
    for (let i = 0; i + 1 < GEO.estero.length; i++) if (segInter(p[k], p[k + 1], GEO.estero[i], GEO.estero[i + 1])) puentes = 1;
    const n = Math.ceil(Math.hypot(p[k + 1][0] - p[k][0], p[k + 1][1] - p[k][1]) / 8);
    for (let i = 0; i <= n && !tuneles; i++) if (dentroPoligono(lerp(p[k][0], p[k + 1][0], i / n), lerp(p[k][1], p[k + 1][1], i / n), GEO.cerro)) tuneles = 1;
  }
  return { puentes, tuneles };
}

/* ============================================================
   JUEGO NUEVO
   modo: 'normal' | 'tranquilo' (sin apuro: nada colapsa) | 'diario'
   ============================================================ */
function nuevoJuego(modo, fecha) {
  const semilla = modo === 'diario' ? hashTxt('metro-' + fecha) : ((Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0);
  J = {
    v: 1, modo, fecha: fecha || null, semilla, rngMapa: { s: semilla }, rngGente: { s: (semilla ^ 0x5bd1e995) >>> 0 },
    t: 0, dia: 0, pasajeros: 0, porTipo: {}, uid: 0,
    estaciones: [], lineas: [], trenes: [],
    tengo: Object.assign({}, INICIO), conteo: {}, nombres: {},
    proxEstacion: 9, eleccion: null, semanas: 0, fin: null,
  };
  EST.clear(); RUTAS.clear(); DIST = {};
  for (const tipo of TIPOS_BASE) crearEstacion(tipo);
  return J;
}
function cargarJuego(g) {
  J = g;
  EST.clear(); RUTAS.clear();
  for (const s of J.estaciones) EST.set(s.id, s);
  J.lineas = J.lineas.filter(l => l.est.length >= 2 && l.est.every(id => EST.has(id)));
  J.trenes = J.trenes.filter(t => J.lineas.some(l => l.id === t.linea));
  for (const l of J.lineas) RUTAS.set(l.id, rutaDe(l));
  recalcularDist();
  return J;
}

/* ---------- región visible ---------- */
function anchoRegion() { return Math.min(MUNDO.anchoMax, MUNDO.anchoInicial + J.dia * MUNDO.crecePorDia); }
function region() { const w = anchoRegion(), h = w / MUNDO.aspecto; return { x0: -w / 2, x1: w / 2, y0: -h / 2, y1: h / 2, w, h }; }

/* ============================================================
   ESTACIONES
   ============================================================ */
function sitioLibre(x, y) {
  const r = region(), m = MUNDO.margen;
  if (x < r.x0 + m || x > r.x1 - m || y < r.y0 + m * 1.4 || y > r.y1 - m) return false;
  if (distEstero(x, y) < GEO.esteroAncho / 2 + 30) return false;
  if (dentroCerro(x, y, 22)) return false;
  const p = GEO.plaza;
  if (Math.abs(x - p.x) < p.lado / 2 + 20 && Math.abs(y - p.y) < p.lado / 2 + 20) return false;
  for (const s of J.estaciones) if (Math.hypot(s.x - x, s.y - y) < MUNDO.distMin) return false;
  return true;
}
function nombreNuevo(tipo) {
  const lista = NOMBRES[tipo] || [];
  const n = J.nombres[tipo] = (J.nombres[tipo] || 0) + 1;
  return lista[n - 1] || (TIPOS[tipo].n + ' ' + n);
}
function crearEstacion(tipo) {
  const R = J.rngMapa, r = region();
  let pos = null;
  for (let i = 0; i < 260 && !pos; i++) {
    let x, y;
    if (tipo === 'plaza') { const p = GEO.plaza, a = rf(R) * Math.PI * 2; x = p.x + Math.cos(a) * (p.lado / 2 + 40); y = p.y + Math.sin(a) * (p.lado / 2 + 40); }
    else if (tipo === 'mirador') { const c = centroCerro(), a = rf(R) * Math.PI * 2; x = c.x + Math.cos(a) * 150; y = c.y + Math.sin(a) * 140; }
    else if (J.estaciones.length < 3) { x = (rf(R) - .5) * r.w * .55; y = (rf(R) - .1) * r.h * .42; }
    else { x = r.x0 + rf(R) * r.w; y = r.y0 + rf(R) * r.h; }
    if (sitioLibre(x, y)) pos = { x, y };
  }
  for (let i = 0; i < 500 && !pos; i++) {
    const x = r.x0 + rf(R) * r.w, y = r.y0 + rf(R) * r.h;
    if (sitioLibre(x, y)) pos = { x, y };
  }
  if (!pos) return null;
  const s = {
    id: ++J.uid, tipo, x: Math.round(pos.x), y: Math.round(pos.y), nombre: nombreNuevo(tipo), cola: [], colapso: 0,
    grande: false, nace: J.t, prox: 3 + rf(J.rngGente) * 5,
  };
  J.estaciones.push(s); EST.set(s.id, s);
  J.conteo[tipo] = (J.conteo[tipo] || 0) + 1;
  recalcularDist();
  Ev.estacion(s);
  return s;
}
function sorteoTipo() {
  const disp = Object.entries(TIPOS).filter(([id, t]) => J.dia >= t.desde && (J.conteo[id] || 0) < t.max);
  /* un lugar especial recién abierto tiene más chance de aparecer pronto */
  const nuevo = disp.find(([id, t]) => t.max < 99 && !J.conteo[id] && J.dia >= t.desde);
  if (nuevo && rf(J.rngMapa) < .35) return nuevo[0];
  let total = 0; for (const [, t] of disp) total += t.peso;
  let x = rf(J.rngMapa) * total;
  for (const [id, t] of disp) { x -= t.peso; if (x <= 0) return id; }
  return 'casa';
}
function destinoPara(s) {
  const tipos = Object.keys(J.conteo).filter(t => t !== s.tipo && J.conteo[t] > 0);
  if (!tipos.length) return null;
  const peso = t => (TIPOS_BASE.includes(t) ? 3 : 1.6);
  let total = 0; for (const t of tipos) total += peso(t);
  let x = rf(J.rngGente) * total;
  for (const t of tipos) { x -= peso(t); if (x <= 0) return t; }
  return tipos[0];
}
const intervaloEstacion = () => Math.max(7.5, 19 * Math.pow(.968, J.dia)) * (.75 + rf(J.rngMapa) * .5);
/* Una estación recién abierta recibe gente de a poco (como el barrio que se va enterando). */
const intervaloGente = s => {
  const nueva = clamp((J.t - s.nace) / 60, 0, 1);
  return Math.max(4, 25 * Math.pow(.966, J.dia)) * (.6 + rf(J.rngGente) * .8) * (s.tipo === 'casa' ? .85 : 1.12) * (1.6 - .6 * nueva);
};

/* ============================================================
   RED: distancias (en paradas) a cada tipo de lugar
   ============================================================ */
function vecinos() {
  const ady = new Map();
  for (const s of J.estaciones) ady.set(s.id, new Set());
  for (const l of J.lineas) {
    const e = l.est;
    for (let i = 0; i + 1 < e.length; i++) { ady.get(e[i]).add(e[i + 1]); ady.get(e[i + 1]).add(e[i]); }
    if (l.loop && e.length > 2) { ady.get(e[e.length - 1]).add(e[0]); ady.get(e[0]).add(e[e.length - 1]); }
  }
  return ady;
}
function recalcularDist() {
  const ady = vecinos();
  DIST = {};
  for (const tipo of Object.keys(J.conteo)) {
    const d = {}, cola = [];
    for (const s of J.estaciones) if (s.tipo === tipo) { d[s.id] = 0; cola.push(s.id); }
    for (let i = 0; i < cola.length; i++) {
      const id = cola[i];
      for (const v of ady.get(id) || []) if (d[v] === undefined) { d[v] = d[id] + 1; cola.push(v); }
    }
    DIST[tipo] = d;
  }
}
const faltan = (tipo, id) => { const d = DIST[tipo]; return d && d[id] !== undefined ? d[id] : Infinity; };

/* ---------- el trazado de cada línea ---------- */
function rutaDe(l) {
  const est = l.est.map(id => EST.get(id));
  const pares = [];
  for (let i = 0; i + 1 < est.length; i++) pares.push([est[i], est[i + 1]]);
  if (l.loop && est.length > 2) pares.push([est[est.length - 1], est[0]]);
  const pts = [[est[0].x, est[0].y]], acum = [0], paradas = [{ id: est[0].id, s: 0 }];
  let s = 0;
  for (const [a, b] of pares) {
    const p = tramo(a, b);
    for (let k = 1; k < p.length; k++) {
      const [x0, y0] = pts[pts.length - 1];
      s += Math.hypot(p[k][0] - x0, p[k][1] - y0);
      pts.push(p[k]); acum.push(s);
    }
    paradas.push({ id: b.id, s });
  }
  return { pts, acum, total: s, paradas, loop: !!(l.loop && est.length > 2) };
}
function puntoEn(ruta, s) {
  const { pts, acum } = ruta;
  if (s <= 0) return [pts[0][0], pts[0][1], angulo(pts[0], pts[1] || pts[0])];
  if (s >= ruta.total) { const n = pts.length - 1; return [pts[n][0], pts[n][1], angulo(pts[n - 1] || pts[n], pts[n])]; }
  let lo = 0, hi = acum.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (acum[m] <= s) lo = m; else hi = m; }
  const k = (s - acum[lo]) / ((acum[hi] - acum[lo]) || 1);
  return [lerp(pts[lo][0], pts[hi][0], k), lerp(pts[lo][1], pts[hi][1], k), angulo(pts[lo], pts[hi])];
}
const angulo = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]);
function sMasCercano(ruta, x, y) {
  let mejor = 0, md = 1e18;
  for (let i = 0; i + 1 < ruta.pts.length; i++) {
    const a = ruta.pts[i], b = ruta.pts[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy;
    const t = l2 ? clamp(((x - a[0]) * dx + (y - a[1]) * dy) / l2, 0, 1) : 0;
    const d = Math.hypot(x - (a[0] + dx * t), y - (a[1] + dy * t));
    if (d < md) { md = d; mejor = ruta.acum[i] + Math.sqrt(l2) * t; }
  }
  return mejor;
}

/* ============================================================
   INVENTARIO (lo que se tiene menos lo que está en uso)
   ============================================================ */
function usado() {
  let puentes = 0, tuneles = 0, vagones = 0;
  for (const l of J.lineas) {
    const e = l.est.map(id => EST.get(id));
    const pares = [];
    for (let i = 0; i + 1 < e.length; i++) pares.push([e[i], e[i + 1]]);
    if (l.loop && e.length > 2) pares.push([e[e.length - 1], e[0]]);
    for (const [a, b] of pares) { const c = costoTramo(a, b); puentes += c.puentes; tuneles += c.tuneles; }
  }
  for (const t of J.trenes) vagones += t.vag || 0;
  return { lineas: J.lineas.length, trenes: J.trenes.length, vagones, puentes, tuneles, intercambiadores: J.estaciones.filter(s => s.grande).length };
}
function disponible() {
  const u = usado(), d = {};
  for (const k of Object.keys(J.tengo)) d[k] = J.tengo[k] - (u[k] || 0);
  return d;
}

/* ============================================================
   EDITAR LA RED
   ============================================================ */
/* ¿Se puede agregar el tramo a→b? Devuelve el motivo si no. */
function puedeTramo(a, b) {
  if (!a || !b || a.id === b.id) return { ok: false };
  const c = costoTramo(a, b), d = disponible();
  if (c.puentes > d.puentes) return { ok: false, motivo: 'puente' };
  if (c.tuneles > d.tuneles) return { ok: false, motivo: 'tunel' };
  return { ok: true, c };
}
function colorLibre() {
  for (let i = 0; i < J.tengo.lineas; i++) if (!J.lineas.some(l => l.c === i)) return i;
  return -1;
}
function crearLinea(a, b) {
  const c = colorLibre();
  if (c < 0) return { ok: false, motivo: 'linea' };
  const p = puedeTramo(a, b); if (!p.ok) return p;
  const l = { id: ++J.uid, c, est: [a.id, b.id], loop: false };
  J.lineas.push(l);
  RUTAS.set(l.id, rutaDe(l));
  if (disponible().trenes > 0) ponerTren(l);
  else Ev.aviso('🚆', 'No te quedan trenes: llega uno nuevo cada semana');
  recalcularDist();
  Ev.sonido('linea'); Ev.cambio();
  return { ok: true, linea: l };
}
function cambiarRuta(l, f) {
  const vieja = RUTAS.get(l.id);
  const pos = J.trenes.filter(t => t.linea === l.id).map(t => [t, puntoEn(vieja, t.pos)]);
  f();
  const nueva = rutaDe(l);
  RUTAS.set(l.id, nueva);
  for (const [t, [x, y]] of pos) t.pos = sMasCercano(nueva, x, y);
  recalcularDist();
  Ev.cambio();
}
/* extremo: 'fin' o 'ini' */
function extenderLinea(l, extremo, s) {
  if (l.loop) return { ok: false };
  const finId = extremo === 'fin' ? l.est[l.est.length - 1] : l.est[0];
  const otroId = extremo === 'fin' ? l.est[0] : l.est[l.est.length - 1];
  if (s.id === otroId && l.est.length >= 3) {
    const p = puedeTramo(EST.get(finId), s); if (!p.ok) return p;
    cambiarRuta(l, () => { l.loop = true; });
    Ev.sonido('linea');
    return { ok: true, cerro: true };
  }
  if (l.est.includes(s.id)) return { ok: false };
  const p = puedeTramo(EST.get(finId), s); if (!p.ok) return p;
  cambiarRuta(l, () => { if (extremo === 'fin') l.est.push(s.id); else l.est.unshift(s.id); });
  Ev.sonido('tramo');
  return { ok: true };
}
function recortarLinea(l, extremo) {
  if (l.loop) { cambiarRuta(l, () => { l.loop = false; }); return { ok: true }; }
  if (l.est.length <= 2) { borrarLinea(l); return { ok: true, borrada: true }; }
  cambiarRuta(l, () => { if (extremo === 'fin') l.est.pop(); else l.est.shift(); });
  Ev.sonido('quitar');
  return { ok: true };
}
/* Mete la estación s entre la parada i y la siguiente (i es el índice del tramo). */
function insertarEnLinea(l, i, s) {
  if (l.est.includes(s.id)) return { ok: false };
  const n = l.est.length;
  const a = EST.get(l.est[i]), b = EST.get(l.est[(i + 1) % n]);
  if (!a || !b) return { ok: false };
  const viejo = costoTramo(a, b), c1 = costoTramo(a, s), c2 = costoTramo(s, b), d = disponible();
  if (c1.puentes + c2.puentes - viejo.puentes > d.puentes) return { ok: false, motivo: 'puente' };
  if (c1.tuneles + c2.tuneles - viejo.tuneles > d.tuneles) return { ok: false, motivo: 'tunel' };
  cambiarRuta(l, () => { l.est.splice(i + 1, 0, s.id); });
  Ev.sonido('tramo');
  return { ok: true };
}
function borrarLinea(l) {
  for (const t of J.trenes.filter(t => t.linea === l.id)) bajarTodos(t);
  J.trenes = J.trenes.filter(t => t.linea !== l.id);
  J.lineas = J.lineas.filter(x => x !== l);
  RUTAS.delete(l.id);
  recalcularDist();
  Ev.sonido('quitar'); Ev.cambio();
}
/* Cuando un tren sale de servicio, la gente se baja en la estación más cercana. */
function bajarTodos(t) {
  const ruta = RUTAS.get(t.linea);
  if (!ruta || !t.carga.length) { t.carga = []; return; }
  const [x, y] = puntoEn(ruta, t.pos);
  let mejor = null, md = 1e9;
  for (const p of ruta.paradas) { const s = EST.get(p.id); const d = Math.hypot(s.x - x, s.y - y); if (d < md) { md = d; mejor = s; } }
  if (mejor) for (const p of t.carga) if (p.d !== mejor.tipo) mejor.cola.push(p);
  t.carga = [];
}
function ponerTren(l) {
  if (disponible().trenes <= 0) return false;
  const ruta = RUTAS.get(l.id);
  const enLinea = J.trenes.filter(t => t.linea === l.id).length;
  const t = { id: ++J.uid, linea: l.id, pos: enLinea % 2 ? ruta.total : 0, dir: enLinea % 2 ? -1 : 1, carga: [], vag: 0, est: 'mueve', t: 0 };
  J.trenes.push(t);
  llegar(t, ruta, enLinea % 2 ? ruta.paradas.length - 1 : 0);
  Ev.cambio();
  return true;
}
function quitarTren(l) {
  const trenes = J.trenes.filter(t => t.linea === l.id);
  if (trenes.length <= 1) return false;
  const t = trenes[trenes.length - 1];
  bajarTodos(t);
  J.trenes = J.trenes.filter(x => x !== t);
  Ev.cambio();
  return true;
}
function ponerVagon(l) {
  if (disponible().vagones <= 0) return false;
  const trenes = J.trenes.filter(t => t.linea === l.id);
  if (!trenes.length) return false;
  trenes.sort((a, b) => (a.vag || 0) - (b.vag || 0))[0].vag = (trenes[0].vag || 0) + 1;
  Ev.cambio();
  return true;
}
function ponerIntercambiador(s) {
  if (s.grande || disponible().intercambiadores <= 0) return false;
  s.grande = true;
  Ev.sonido('mejora'); Ev.cambio();
  return true;
}
const capacidadTren = t => TREN.capacidad + (t.vag || 0) * TREN.porVagon;
const capacidadEst = s => s.grande ? ESTACION.capacidadGrande : ESTACION.capacidad;

/* ============================================================
   TRENES
   ============================================================ */
function proximaParada(ruta, t) {
  const P = ruta.paradas;
  if (t.dir > 0) { for (let i = 0; i < P.length; i++) if (P[i].s > t.pos + 1e-6) return i; return P.length - 1; }
  for (let i = P.length - 1; i >= 0; i--) if (P[i].s < t.pos - 1e-6) return i;
  return 0;
}
function moverTren(t, dt) {
  const ruta = RUTAS.get(t.linea);
  if (!ruta || ruta.total <= 0) return;
  if (t.est === 'para') { t.t -= dt; if (t.t > 0) return; t.est = 'mueve'; }
  let avance = TREN.vel * dt, vueltas = 0;
  while (avance > 1e-9 && vueltas++ < 8) {
    const i = proximaParada(ruta, t), s = ruta.paradas[i].s, d = Math.abs(s - t.pos);
    if (d <= avance) {
      t.pos = s; avance -= d;
      llegar(t, ruta, i);
      if (t.est === 'para') break;
    } else { t.pos += t.dir * avance; avance = 0; }
  }
}
function llegar(t, ruta, idx) {
  const P = ruta.paradas;
  if (ruta.loop && t.dir > 0 && idx === P.length - 1) { t.pos = 0; idx = 0; }
  if (ruta.loop && t.dir < 0 && idx === 0) { t.pos = ruta.total; idx = P.length - 1; }
  if (!ruta.loop) { if (t.dir > 0 && idx === P.length - 1) t.dir = -1; else if (t.dir < 0 && idx === 0) t.dir = 1; }
  let sig = idx + t.dir;
  if (ruta.loop) { if (sig >= P.length) sig = 1; if (sig < 0) sig = P.length - 2; }
  sig = clamp(sig, 0, P.length - 1);
  atender(t, EST.get(P[idx].id), EST.get(P[sig].id));
}
/* En cada parada: baja quien llegó o quien tiene que combinar, sube quien se acerca. */
function atender(t, S, Nx) {
  if (!S) return;
  let mov = 0;
  const quedan = [];
  for (const p of t.carga) {
    if (S.tipo === p.d) { entregar(p, S); mov++; continue; }
    if (!Nx || !(faltan(p.d, Nx.id) < faltan(p.d, S.id))) { S.cola.push(p); mov++; continue; }
    quedan.push(p);
  }
  t.carga = quedan;
  const cap = capacidadTren(t), espera = [];
  for (const p of S.cola) {
    if (t.carga.length < cap && Nx && Nx.id !== S.id && faltan(p.d, Nx.id) < faltan(p.d, S.id)) { t.carga.push(p); mov++; }
    else espera.push(p);
  }
  S.cola = espera;
  t.est = 'para';
  t.t = mov ? TREN.paradaBase + mov * TREN.porPasajero * (S.grande ? .5 : 1) : .12;
}
function entregar(p, S) {
  J.pasajeros++;
  J.porTipo[p.d] = (J.porTipo[p.d] || 0) + 1;
  Ev.entrega(S, p);
}

/* ============================================================
   EL PASO DEL TIEMPO (dt fijo)
   ============================================================ */
function pasoJuego(dt) {
  if (!J || J.fin || J.eleccion) return;
  J.t += dt;
  const dia = Math.floor(J.t / TIEMPO.dia);
  if (dia > J.dia) nuevoDia(dia);
  if (J.eleccion) return;
  /* estaciones nuevas */
  J.proxEstacion -= dt;
  if (J.proxEstacion <= 0) {
    J.proxEstacion = intervaloEstacion();
    if (J.estaciones.length < ESTACION.maximo) crearEstacion(sorteoTipo());
  }
  /* gente nueva */
  for (const s of J.estaciones) {
    s.prox -= dt;
    if (s.prox > 0) continue;
    s.prox = intervaloGente(s);
    const d = destinoPara(s);
    if (d) s.cola.push({ d, t: Math.round(J.t) });
  }
  /* trenes */
  for (const t of J.trenes) moverTren(t, dt);
  /* estaciones repletas */
  for (const s of J.estaciones) {
    const cap = capacidadEst(s);
    if (s.cola.length > cap) {
      s.colapso = Math.min(1, s.colapso + dt / ESTACION.colapso);
      if (s.colapso >= 1) {
        if (J.modo === 'tranquilo') { s.cola.splice(0, s.cola.length - cap); s.colapso = .7; Ev.aviso('🚶', 'En la estación ' + s.nombre + ' se aburrieron de esperar y se fueron caminando'); }
        else { J.fin = { id: s.id, nombre: s.nombre, tipo: s.tipo, dias: J.dia, pasajeros: J.pasajeros, t: J.t }; Ev.fin(J.fin); return; }
      }
    } else s.colapso = Math.max(0, s.colapso - dt / ESTACION.alivio);
  }
}
function nuevoDia(dia) {
  J.dia = dia;
  Ev.dia(dia);
  if (dia > 0 && dia % TIEMPO.semana === 0) {
    J.semanas++;
    J.tengo.trenes++;
    J.eleccion = sortearMejoras();
    Ev.semana(J.eleccion);
  }
}
function sortearMejoras() {
  const op = ['vagon', 'puente', 'intercambiador'];
  if (J.tengo.lineas < MAX_LINEAS) op.push('linea', 'linea');
  if (anchoRegion() > 520) op.push('tunel');
  const a = op[Math.floor(rf(J.rngMapa) * op.length)];
  const resto = op.filter(x => x !== a);
  const b = resto[Math.floor(rf(J.rngMapa) * resto.length)];
  return [a, b];
}
function elegirMejora(id) {
  if (!J.eleccion || !J.eleccion.includes(id)) return;
  if (id === 'linea') J.tengo.lineas = Math.min(MAX_LINEAS, J.tengo.lineas + 1);
  else if (id === 'vagon') J.tengo.vagones++;
  else if (id === 'puente') J.tengo.puentes += 2;
  else if (id === 'tunel') J.tengo.tuneles++;
  else if (id === 'intercambiador') J.tengo.intercambiadores++;
  J.eleccion = null;
  Ev.sonido('mejora'); Ev.cambio();
}
const juegoParaGuardar = () => (J && !J.fin ? JSON.parse(JSON.stringify(J)) : null);
