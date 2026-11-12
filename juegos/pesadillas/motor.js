/* ============================================================
   MOTOR — el sueño de Michi
   Pisos, piezas, Michi, enemigos, jefes, disparos y objetos.
   No toca el DOM: lee la entrada en M.entrada y avisa a la
   interfaz con los ganchos de Ev. Así se puede probar en Node.
   P = la partida (se guarda) · M = lo que pasa en la pieza actual
   ============================================================ */
const Ev = {
  sonido() {}, aviso() {}, banner() {}, item() {}, piso() {}, jefe() {}, fin() {}, temblor() {},
  vibrar() {}, sala() {}, hud() {}, contar() {}, guardar() {}, fondo() {}, antesDeCambiar() {}, texto() {},
};

let P = null;
let M = null;

/* ---------- azar con semilla (se puede guardar: es un objeto) ---------- */
function hashTxt(t) { let h = 2166136261; for (const c of String(t)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function rf(R) {
  let t = (R.s = (R.s + 0x6D2B79F5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const ri = (R, a, b) => a + Math.floor(rf(R) * (b - a + 1));
const rElegir = (R, arr) => arr[Math.floor(rf(R) * arr.length)];
function rBarajar(R, arr) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rf(R) * (i + 1)); const z = arr[i]; arr[i] = arr[j]; arr[j] = z; } return arr; }

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const distE = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/* ---------- geometría de la pieza ---------- */
const DIRS = ['arriba', 'abajo', 'izq', 'der'];
const PUERTA = {
  arriba: { c: 5, f: 0, dc: 0, df: -1, op: 'abajo' },
  abajo: { c: 5, f: 10, dc: 0, df: 1, op: 'arriba' },
  izq: { c: 0, f: 5, dc: -1, df: 0, op: 'der' },
  der: { c: 10, f: 5, dc: 1, df: 0, op: 'izq' },
};
const DIR4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const DIR8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
const BLOQ_BALA = 'RXMC';
const BLOQ_PIE = 'RXMCP';
const enSala = (c, f) => c >= 0 && f >= 0 && c < N && f < N;
const tile = (c, f) => enSala(c, f) ? M.g[f][c] : '#';
const kSala = (c, f) => c + ',' + f;

function transformarPlantilla(t, k) {
  const out = [];
  for (let f = 0; f < N; f++) {
    let fila = '';
    for (let c = 0; c < N; c++) {
      let x = c, y = f;
      if (k & 4) { const z = x; x = y; y = z; }
      if (k & 2) y = N - 1 - y;
      if (k & 1) x = N - 1 - x;
      fila += t[y][x];
    }
    out.push(fila);
  }
  return out;
}
/* Todas las puertas se tienen que poder alcanzar (las cajas cuentan como pasables: se rompen). */
function plantillaConectada(g) {
  const libre = (c, f) => enSala(c, f) && !'RXMP'.includes(g[f][c]);
  const vis = new Uint8Array(N * N); const cola = [[5, 0]]; vis[5] = 1;
  while (cola.length) {
    const [c, f] = cola.pop();
    for (const [dc, df] of DIR4) {
      const nc = c + dc, nf = f + df;
      if (!libre(nc, nf) || vis[nf * N + nc]) continue;
      vis[nf * N + nc] = 1; cola.push([nc, nf]);
    }
  }
  return !!(vis[10 * N + 5] && vis[5 * N] && vis[5 * N + 10]);
}

/* ============================================================
   PARTIDA NUEVA, OBJETOS DISPONIBLES
   ============================================================ */
/* modo: 'normal' | 'tranquilo' | 'diario' · pool: ids de objetos desbloqueados */
function nuevaPartida(modo, pool, fecha) {
  const semilla = modo === 'diario' ? hashTxt('pesadillas-' + fecha) : ((Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0);
  const tranquilo = modo === 'tranquilo';
  P = {
    v: 1, modo, fecha: fecha || null, semilla,
    rngMapa: { s: semilla }, rngCombate: { s: (semilla ^ 0x9e3779b9) >>> 0 },
    pool: modo === 'diario' ? ITEMS.map(x => x.id) : pool.slice(),
    vistos: [], pisoIdx: 0, t: 0, entradaDir: null,
    stats: { enemigos: 0, jefes: 0, salas: 0, danoPiso: false, golpes: 0, pisosSinDano: 0, monedasJuntadas: 0, secretas: 0, compras: 0 },
    J: {
      x: 5.5, y: 6.5, vx: 0, vy: 0, r: .33, maxRojos: tranquilo ? 8 : 6, rojos: tranquilo ? 8 : 6, sueno: 0,
      monedas: 0, llaves: tranquilo ? 1 : 0, petardos: 1, items: [], activo: null, vidas: 0, cd: 0, carga: 0, mira: 1,
    },
    mapa: null,
  };
  M = nuevoMundo();
  calcularStats();
  generarPiso(0);
  if (modo === 'diario') {
    const id = sacarItem('tesoro');
    if (id) darItemDirecto(id);
  }
  entrarSala(P.mapa.actual, null);
  Ev.piso(PISOS[0], 0);
  return P;
}
function seguirPartida(guardada) {
  P = guardada;
  M = nuevoMundo();
  calcularStats();
  entrarSala(P.mapa.actual, P.entradaDir, { restaurar: true });
  Ev.piso(PISOS[P.pisoIdx], P.pisoIdx);
  return P;
}
function nuevoMundo() {
  return {
    entrada: { mx: 0, my: 0, ax: 0, ay: 0, activo: false, petardo: false },
    apuntado: (M && M.apuntado) || 'asistido',
    enemigos: [], balas: [], particulas: [], efectos: [], peligros: [], petardos: [], familiares: [],
    g: null, flujo: new Int16Array(N * N), flujoT: 0, flujoC: -1, flujoF: -1, baba: new Float32Array(N * N),
    uid: 0, invul: 0, cajaT: 0, linterna: 0, empujeX: 0, empujeY: 0, apunteUlt: [0, -1],
    tiempo: 0, trans: null, pausa: false, fin: null, rc: P.rngCombate, S: null, jefe: null, succion: null,
    oscuro: false, atun: false, pose: null, disparoT: 0, rayo: null, ganar: 0, lento: 0, avisoT: 0,
    puertasCerradas: false, cajasHp: {}, rastro: [],
  };
}
function itemPermitido(id) { return P.pool.includes(id); }
function sacarItem(pool) {
  const R = P.rngMapa;
  const disp = ITEMS.filter(it => it.p.includes(pool) && itemPermitido(it.id) && !P.vistos.includes(it.id));
  if (!disp.length) return 'alfajor';
  const peso = q => [1, 1, .85, .55, .28][q] || .5;
  let total = 0; for (const it of disp) total += peso(it.q);
  let x = rf(R) * total;
  for (const it of disp) { x -= peso(it.q); if (x <= 0) { P.vistos.push(it.id); return it.id; } }
  const ult = disp[disp.length - 1]; P.vistos.push(ult.id); return ult.id;
}

/* ============================================================
   GENERAR UN PISO
   ============================================================ */
function generarPiso(idx) {
  const R = P.rngMapa, def = PISOS[idx];
  const objetivo = def.salas + (rf(R) < .5 ? 1 : 0);
  const vecinos = (set, c, f) => DIR4.filter(([dc, df]) => set.has(kSala(c + dc, f + df))).length;
  for (let intento = 0; intento < 400; intento++) {
    const set = new Set([kSala(4, 4)]); const cola = [[4, 4]];
    while (cola.length && set.size < objetivo) {
      const [c, f] = cola.shift();
      for (const [dc, df] of rBarajar(R, DIR4.slice())) {
        const nc = c + dc, nf = f + df;
        if (nc < 0 || nf < 0 || nc > 8 || nf > 8 || set.has(kSala(nc, nf))) continue;
        if (set.size >= objetivo) break;
        if (vecinos(set, nc, nf) > 1) continue;
        if (rf(R) < .5) continue;
        set.add(kSala(nc, nf)); cola.push([nc, nf]);
      }
    }
    if (set.size < objetivo) continue;
    /* distancias desde el inicio */
    const dist = {}; dist[kSala(4, 4)] = 0; const q = [[4, 4]];
    for (let i = 0; i < q.length; i++) {
      const [c, f] = q[i];
      for (const [dc, df] of DIR4) {
        const k = kSala(c + dc, f + df);
        if (set.has(k) && dist[k] === undefined) { dist[k] = dist[kSala(c, f)] + 1; q.push([c + dc, f + df]); }
      }
    }
    const celdas = [...set].map(s => s.split(',').map(Number));
    const finales = celdas.filter(([c, f]) => !(c === 4 && f === 4) && vecinos(set, c, f) === 1);
    if (finales.length < 3) continue;
    finales.sort((a, b) => dist[kSala(...b)] - dist[kSala(...a)]);
    const jefe = finales[0];
    if (dist[kSala(...jefe)] < 3) continue;
    const resto = rBarajar(R, finales.slice(1));
    const tipos = {};
    tipos[kSala(...jefe)] = 'jefe';
    tipos[kSala(...resto[0])] = 'tesoro';
    tipos[kSala(...resto[1])] = 'tienda';
    if (resto[2] && rf(R) < .7) tipos[kSala(...resto[2])] = 'camita';
    tipos[kSala(4, 4)] = 'inicio';
    /* la secreta: un hueco con 2 o más vecinos, lejos del jefe */
    let secreta = null, mejor = 1;
    for (let c = 0; c <= 8; c++) for (let f = 0; f <= 8; f++) {
      if (set.has(kSala(c, f))) continue;
      const nv = vecinos(set, c, f);
      if (nv < 2) continue;
      if (DIR4.some(([dc, df]) => kSala(c + dc, f + df) === kSala(...jefe))) continue;
      const pts = nv + rf(R) * .6;
      if (pts > mejor) { mejor = pts; secreta = [c, f]; }
    }
    P.mapa = { salas: {}, actual: kSala(4, 4), piso: idx };
    for (const [c, f] of celdas) {
      const k = kSala(c, f);
      P.mapa.salas[k] = crearSala(c, f, tipos[k] || 'normal', dist[k], idx);
    }
    if (secreta) P.mapa.salas[kSala(...secreta)] = crearSala(secreta[0], secreta[1], 'secreta', 9, idx);
    return;
  }
  throw new Error('No se pudo armar el piso');
}

function crearSala(c, f, tipo, prof, idx) {
  const R = P.rngMapa;
  const s = {
    c, f, tipo, prof, limpia: !(tipo === 'normal' || tipo === 'jefe'), visitada: false, vista: false,
    grid: null, enemigos: [], recogibles: [], pedestales: [], objetos: [], revelada: {}, cerrada: false,
  };
  if (tipo === 'normal') {
    let g = null;
    for (let i = 0; i < 30 && !g; i++) {
      const t = rElegir(R, PLANTILLAS);
      const cand = transformarPlantilla(t, ri(R, 0, 7));
      if (plantillaConectada(cand)) g = cand;
    }
    s.grid = g || PLANTILLA_LIBRE.slice();
    if (rf(R) < .08) {
      s.limpia = true; // una pieza tranquila: un regalo en la baldosa libre más cercana al centro
      const l = libreEnGrid(s.grid, 5.5, 5.5);
      s.recogibles.push(recogibleNuevo(rf(R) < .5 ? 'cofre' : 'moneda', l.x, l.y));
    } else s.enemigos = enemigosPara(PISOS[idx], idx, prof, R);
  } else if (tipo === 'jefe') {
    s.grid = PLANTILLA_JEFE.slice();
    s.itemJefe = sacarItem('jefe');
  } else {
    s.grid = PLANTILLA_LIBRE.slice();
  }
  if (tipo === 'tesoro') {
    s.pedestales.push({ x: 5.5, y: 5.5, item: sacarItem('tesoro') });
    s.cerrada = idx >= 1;
  }
  if (tipo === 'tienda') {
    s.pedestales.push({ x: 3.5, y: 6, item: sacarItem('tienda'), precio: 15 });
    const sueltos = rBarajar(R, TIENDA_SUELTOS.slice()).slice(0, 2);
    sueltos.forEach((x, i) => s.recogibles.push(recogibleNuevo(x.tipo, 5.5 + i * 2, 6, { precio: x.precio })));
  }
  if (tipo === 'secreta') {
    if (rf(R) < .55) s.pedestales.push({ x: 5.5, y: 5.5, item: sacarItem('secreta') });
    else for (let i = 0; i < 4; i++) s.recogibles.push(recogibleNuevo(i === 0 ? 'moneda5' : (rf(R) < .5 ? 'moneda' : 'petardo'), 4 + i, 5.5 + (i % 2)));
  }
  if (tipo === 'camita') s.objetos.push({ tipo: 'camita', x: 5.5, y: 5.2, usada: false });
  return s;
}

function libreEnGrid(g, x, y) {
  let mejor = { x: 5.5, y: 5.5 }, md = 1e9;
  for (let f = 0; f < N; f++) for (let c = 0; c < N; c++) {
    if (g[f][c] !== '.' && g[f][c] !== 'E') continue;
    const d = Math.hypot(c + .5 - x, f + .5 - y);
    if (d < md) { md = d; mejor = { x: c + .5, y: f + .5 }; }
  }
  return mejor;
}

function enemigosPara(def, idx, prof, R) {
  let presupuesto = 3 + idx * .9 + Math.min(3, prof * .5) + rf(R) * 1.5;
  const lista = def.enemigos;
  if (rf(R) < .22) {
    const baratos = lista.filter(t => ENEMIGOS[t].costo <= 2);
    const t = rElegir(R, baratos.length ? baratos : lista);
    const n = clamp(Math.floor(presupuesto / ENEMIGOS[t].costo), 2, 6);
    return Array(n).fill(t);
  }
  const out = [];
  while (presupuesto > .5 && out.length < 7) {
    const op = lista.filter(t => ENEMIGOS[t].costo <= presupuesto + .3);
    if (!op.length) break;
    const t = rElegir(R, op);
    out.push(t); presupuesto -= ENEMIGOS[t].costo;
  }
  return out;
}

/* ============================================================
   ESTADÍSTICAS DE MICHI
   ============================================================ */
const BANDERAS = ['perfora', 'explota', 'fuego', 'hielo', 'partir', 'cadena', 'bumeran', 'laser', 'ola', 'atras', 'vampiro', 'espectral', 'carga', 'iman', 'mapa', 'brujula', 'descuento', 'petardoGrande'];
function calcularStats() {
  const s = Object.assign({}, BASE, { n: 1, rebotes: 0, tele: 0, critico: 0, estrella: 0, mDano: 1, mCadencia: 1, fam: [] });
  for (const b of BANDERAS) s[b] = false;
  for (const id of P.J.items) {
    const it = ITEM[id]; if (!it) continue;
    const e = it.ef;
    for (const k of ['dano', 'cadencia', 'alcance', 'velBala', 'vel', 'suerte', 'tamBala']) if (e[k]) s[k] += e[k];
    if (e.mDano) s.mDano *= e.mDano;
    if (e.mCadencia) s.mCadencia *= e.mCadencia;
    if (e.n) s.n += e.n;
    if (e.rebotes) s.rebotes += e.rebotes;
    if (e.tele) s.tele = Math.min(1, s.tele + e.tele);
    if (e.critico) s.critico += e.critico;
    if (e.estrella) s.estrella += e.estrella;
    for (const b of BANDERAS) if (e[b]) s[b] = true;
    if (e.familiar) s.fam.push(e.familiar);
  }
  if (M && M.atun) s.mDano *= 1.5;
  s.dano = Math.max(.5, s.dano * s.mDano);
  s.cadencia = clamp(s.cadencia * s.mCadencia, .7, 9);
  s.alcance = clamp(s.alcance, 2.5, 15);
  s.velBala = clamp(s.velBala, 4, 15);
  s.vel = clamp(s.vel, 2.4, 7);
  s.tamBala = clamp(s.tamBala, .55, 2.6);
  s.n = Math.min(s.n, 6);
  M.S = s;
  return s;
}
function totalCorazones() { return P.J.maxRojos + P.J.sueno; }
function darItemDirecto(id) {
  const it = ITEM[id]; if (!it) return;
  const e = it.ef, J = P.J;
  if (e.activo) { J.activo = { id, carga: e.cargaMax }; }
  else {
    J.items.push(id);
    if (e.corazon) J.maxRojos = Math.min(24 - J.sueno, J.maxRojos + e.corazon * 2);
    if (e.cura) J.rojos = Math.min(J.maxRojos, J.rojos + e.cura);
    if (e.sueno) J.sueno = Math.max(0, Math.min(24 - J.maxRojos, J.sueno + e.sueno));
    if (e.monedas) J.monedas = Math.min(99, J.monedas + e.monedas);
    if (e.llaves) J.llaves = Math.min(99, J.llaves + e.llaves);
    if (e.petardos) J.petardos = Math.min(99, J.petardos + e.petardos);
    if (e.vidas) J.vidas += e.vidas;
  }
  calcularStats();
}

/* ============================================================
   ENTRAR A UNA PIEZA
   ============================================================ */
const salaActual = () => P.mapa.salas[P.mapa.actual];
function vecina(s, dir) { const p = PUERTA[dir]; return P.mapa.salas[kSala(s.c + p.dc, s.f + p.df)] || null; }

function entrarSala(clave, desde, o = {}) {
  const s = P.mapa.salas[clave];
  P.mapa.actual = clave; P.entradaDir = desde || null;
  M.puertasCerradas = false;
  s.visitada = true; s.vista = true;
  for (const d of DIRS) { const v = vecina(s, d); if (v && estadoPuerta(d, s) !== null) v.vista = true; }
  /* lo propio de cada pieza */
  M.enemigos = []; M.balas = []; M.efectos = []; M.peligros = []; M.petardos = [];
  M.baba.fill(0); M.jefe = null; M.succion = null; M.oscuro = false; M.rayo = null; M.linterna = 0;
  M.flujoT = 0; M.flujoC = -1; M.cajasHp = {};
  if (M.atun) { M.atun = false; calcularStats(); }
  M.g = s.grid.map(r => r.split(''));
  const J = P.J;
  if (desde) {
    const p = PUERTA[desde];
    J.x = p.c + .5 - p.dc * .2; J.y = p.f + .5 - p.df * .2;
  } else { J.x = 5.5; J.y = s.tipo === 'inicio' ? 6.5 : 5.5; }
  J.vx = 0; J.vy = 0; M.empujeX = 0; M.empujeY = 0;
  M.rastro = [];
  M.familiares.forEach(f => { f.x = J.x; f.y = J.y; });
  if (!s.limpia) {
    if (s.tipo === 'jefe') crearJefe(PISOS[P.pisoIdx].jefe);
    else ponerEnemigos(s, desde);
  }
  M.puertasCerradas = M.enemigos.some(e => !e.muerto);
  if (s.tipo === 'secreta' && !s.contada) { s.contada = true; P.stats.secretas++; Ev.contar('secretas', 1); }
  Ev.sala(s, o);
  Ev.fondo();
  Ev.hud();
  Ev.guardar();
}

function ponerEnemigos(s, desde) {
  const R = M.rc;
  const entrada = desde ? { x: PUERTA[desde].c + .5, y: PUERTA[desde].f + .5 } : { x: 5.5, y: 5.5 };
  const libres = [];
  for (let f = 0; f < N; f++) for (let c = 0; c < N; c++) {
    const ch = M.g[f][c];
    if (ch !== '.' && ch !== 'E') continue;
    const d = Math.hypot(c + .5 - entrada.x, f + .5 - entrada.y);
    libres.push({ c, f, d, e: ch === 'E' });
  }
  let lejos = libres.filter(x => x.d >= 3.6);
  if (lejos.length < s.enemigos.length) lejos = libres.filter(x => x.d >= 2.4);
  const ocupado = new Set(), cerca = new Set();
  for (const tipo of s.enemigos) {
    let cand = lejos.filter(x => !cerca.has(x.c + ',' + x.f));
    if (!cand.length) cand = lejos.filter(x => !ocupado.has(x.c + ',' + x.f));
    if (!cand.length) break;
    const pref = cand.filter(x => x.e);
    const sel = (pref.length && rf(R) < .6) ? rElegir(R, pref) : rElegir(R, cand);
    ocupado.add(sel.c + ',' + sel.f);
    for (let dc = -1; dc <= 1; dc++) for (let df = -1; df <= 1; df++) cerca.add((sel.c + dc) + ',' + (sel.f + df));
    crearEnemigo(tipo, sel.c + .5, sel.f + .5);
  }
}

function crearEnemigo(tipo, x, y, extra) {
  const d = ENEMIGOS[tipo];
  const hp = d.hp * VIDA_PISO[P.pisoIdx] * (P.modo === 'tranquilo' ? .85 : 1);
  const e = {
    tipo, d, x, y, vx: 0, vy: 0, kx: 0, ky: 0, r: d.r, hp, hpMax: hp, t: .4 + rf(M.rc) * .8, est: '', z: 0,
    flash: 0, lento: 0, congelado: 0, quema: 0, quemaDps: 0, quemaTick: 0, espera: .65, id: ++M.uid,
    sem: rf(M.rc) * 10, anim: 0, choco: false, muerto: false,
  };
  if (d.disparo && d.disparo.cada) e.t = d.disparo.cada * (.4 + rf(M.rc) * .8);
  if (d.ia === 'emboscada') { e.est = 'oculto'; e.oculto = true; }
  if (d.ia === 'fantasma') { e.est = 'visible'; e.t = 1.5 + rf(M.rc); }
  if (extra) Object.assign(e, extra);
  M.enemigos.push(e);
  return e;
}

function crearJefe(tipo) {
  const d = JEFES[tipo];
  const hp = d.hp * (P.modo === 'tranquilo' ? .8 : 1);
  const vuela = tipo === 'tina' || tipo === 'gatoSombra';
  const e = {
    tipo, d: Object.assign({ vuela }, d), jefe: true, x: 5.5, y: tipo === 'tina' ? 2.2 : 3.3, vx: 0, vy: 0, kx: 0, ky: 0,
    r: d.r, hp, hpMax: hp, t: 1.3, z: 0, flash: 0, lento: 0, congelado: 0, quema: 0, quemaDps: 0, quemaTick: 0,
    espera: 1.2, id: ++M.uid, ataque: null, ultimo: null, ta: 0, sub: 0, sem: 0, anim: 0, choco: false, muerto: false,
    objX: 5.5, alfa: 1,
  };
  M.enemigos.push(e); M.jefe = e;
  Ev.jefe('aparece', e);
  return e;
}

/* ============================================================
   PUERTAS
   null: no hay · 'abierta' · 'cerrada' (pelea) · 'llave' · 'jefe' · 'tesoro' · 'hoyo' (secreta)
   ============================================================ */
function estadoPuerta(dir, s = salaActual()) {
  const v = vecina(s, dir);
  if (!v) return null;
  if ((v.tipo === 'secreta' || s.tipo === 'secreta') && !s.revelada[dir]) return null;
  if (M && M.g && salaActual() === s && M.puertasCerradas) return 'cerrada';
  if (v.tipo === 'tesoro' && v.cerrada) return 'llave';
  if (v.tipo === 'secreta' || s.tipo === 'secreta') return 'hoyo';
  if (v.tipo === 'jefe' || s.tipo === 'jefe') return 'jefe';
  if (v.tipo === 'tesoro') return 'tesoro';
  return 'abierta';
}
const pasable = dir => { const e = estadoPuerta(dir); return e !== null && e !== 'cerrada' && e !== 'llave'; };

function revelarSecretas(x, y, radio) {
  const s = salaActual(); let algo = false;
  for (const d of DIRS) {
    const v = vecina(s, d);
    if (!v || s.revelada[d]) continue;
    if (v.tipo !== 'secreta' && s.tipo !== 'secreta') continue;
    const p = PUERTA[d];
    const px = p.c + .5 + p.dc * .5, py = p.f + .5 + p.df * .5;
    if (radio === Infinity || Math.hypot(px - x, py - y) < radio + 1.1) {
      s.revelada[d] = true; v.revelada[p.op] = true; v.vista = true; algo = true;
    }
  }
  if (algo) { Ev.aviso('🕳️', '¡Una pieza secreta!'); Ev.sonido('secreto'); Ev.fondo(); }
  return algo;
}

/* ============================================================
   EL PASO DEL TIEMPO (dt fijo, 1/60)
   ============================================================ */
function paso(dt) {
  if (!M || !P || M.fin) return;
  M.tiempo += dt;
  if (M.trans) { M.trans.t += dt; if (M.trans.t >= M.trans.dur) M.trans = null; return; }
  if (M.pausa) return;
  if (M.lento > 0) { M.lento -= dt; dt *= .35; }
  P.t += dt;
  if (M.disparoT > 0) M.disparoT -= dt;
  if (M.avisoT > 0) M.avisoT -= dt;
  actualizarJugador(dt);
  actualizarFamiliares(dt);
  actualizarFlujo(dt);
  for (const e of M.enemigos) if (!e.muerto) actualizarEnemigo(e, dt);
  actualizarBalas(dt);
  actualizarPetardos(dt);
  actualizarPeligros(dt);
  actualizarRecogibles(dt);
  actualizarPedestales();
  actualizarObjetos(dt);
  actualizarEfectos(dt);
  for (let i = 0; i < M.baba.length; i++) if (M.baba[i] > 0) M.baba[i] -= dt;
  if (M.enemigos.length > 40 || M.enemigos.some(e => e.muerto)) M.enemigos = M.enemigos.filter(e => !e.muerto || e.jefe);
  revisarLimpieza();
  if (M.ganar > 0) { M.ganar -= dt; if (M.ganar <= 0) terminar(true); return; }
  revisarSalida();
}

/* ---------- Michi ---------- */
function actualizarJugador(dt) {
  const J = P.J, S = M.S, en = M.entrada;
  if (M.invul > 0) M.invul -= dt;
  if (M.cajaT > 0) M.cajaT -= dt;
  if (M.linterna > 0) M.linterna -= dt;
  if (M.pose && (M.pose.t -= dt) <= 0) M.pose = null;
  let mx = en.mx || 0, my = en.my || 0;
  const m = Math.hypot(mx, my); if (m > 1) { mx /= m; my /= m; }
  let v = S.vel;
  const tc = Math.floor(J.x), tf = Math.floor(J.y);
  if (enSala(tc, tf) && M.baba[tf * N + tc] > 0) v *= .55;
  for (const pz of M.peligros) if (pz.tipo === 'polvo' && pz.cae <= 0 && distE(pz, J) < pz.r) v *= .6;
  const k = 1 - Math.exp(-dt * 16);
  J.vx += (mx * v - J.vx) * k; J.vy += (my * v - J.vy) * k;
  const fx = M.succion ? M.succion.fx : 0, fy = M.succion ? M.succion.fy : 0;
  ayudaPuerta(mx, my, dt);
  moverEntidad(J, (J.vx + fx + M.empujeX) * dt, (J.vy + fy + M.empujeY) * dt, { jugador: true });
  const ke = Math.exp(-dt * 10); M.empujeX *= ke; M.empujeY *= ke;
  if (Math.abs(mx) > .15) J.mira = mx > 0 ? 1 : -1;
  J.anda = m > .15;
  M.rastro.unshift({ x: J.x, y: J.y }); if (M.rastro.length > 40) M.rastro.length = 40;
  const tc2 = Math.floor(J.x), tf2 = Math.floor(J.y);
  if (enSala(tc2, tf2) && M.g[tf2][tc2] === 'S' && M.cajaT <= 0) danarJugador(1, 'Unas tachuelas');
  intentarAbrir(mx, my);
  apuntarYDisparar(dt);
  if (en.petardo) { en.petardo = false; ponerPetardo(); }
  if (en.activo) { en.activo = false; usarActivo(); }
  if (M.rayo) {
    M.rayo.t -= dt;
    if (M.disparando || M.entrada.ax || M.entrada.ay) M.rayo.ang = Math.atan2(M.apunteUlt[1], M.apunteUlt[0]);
    rayoDano(J.x, J.y - .15, M.rayo.ang, 16, .55, 34 * dt, true);
    if (M.rayo.t <= 0) M.rayo = null;
  }
}

function ayudaPuerta(mx, my, dt) {
  const J = P.J, paso = 3 * dt;
  if (my < -.5 && J.y < 1 && Math.abs(J.x - 5.5) < 1.15 && pasable('arriba')) J.x += clamp(5.5 - J.x, -paso, paso);
  if (my > .5 && J.y > N - 1 && Math.abs(J.x - 5.5) < 1.15 && pasable('abajo')) J.x += clamp(5.5 - J.x, -paso, paso);
  if (mx < -.5 && J.x < 1 && Math.abs(J.y - 5.5) < 1.15 && pasable('izq')) J.y += clamp(5.5 - J.y, -paso, paso);
  if (mx > .5 && J.x > N - 1 && Math.abs(J.y - 5.5) < 1.15 && pasable('der')) J.y += clamp(5.5 - J.y, -paso, paso);
}

function intentarAbrir(mx, my) {
  const J = P.J;
  const cerca = {
    arriba: my < -.5 && J.y < .75 && Math.abs(J.x - 5.5) < .9,
    abajo: my > .5 && J.y > N - .75 && Math.abs(J.x - 5.5) < .9,
    izq: mx < -.5 && J.x < .75 && Math.abs(J.y - 5.5) < .9,
    der: mx > .5 && J.x > N - .75 && Math.abs(J.y - 5.5) < .9,
  };
  for (const d of DIRS) {
    if (!cerca[d] || estadoPuerta(d) !== 'llave') continue;
    if (J.llaves > 0) {
      J.llaves--; vecina(salaActual(), d).cerrada = false;
      Ev.sonido('llave'); Ev.fondo(); Ev.hud();
    } else if (M.avisoT <= 0) { M.avisoT = 1.6; Ev.aviso('🔑', 'Necesitas una llave'); }
  }
}

function moverEntidad(e, dx, dy, o) {
  o = o || {};
  e.choco = false;
  const r = e.r * .92;
  const fantasma = o.espectral || (o.vuela && !o.jugador);
  e.x += dx;
  if (!fantasma && !o.vuela) resolverEje(e, r, true, dx);
  e.y += dy;
  if (!fantasma && !o.vuela) resolverEje(e, r, false, dy);
  limitesSala(e, r, o);
}
function resolverEje(e, r, ejeX, d) {
  if (!d) return;
  const c0 = Math.floor(e.x - r), c1 = Math.floor(e.x + r - 1e-6);
  const f0 = Math.floor(e.y - r), f1 = Math.floor(e.y + r - 1e-6);
  for (let f = f0; f <= f1; f++) for (let c = c0; c <= c1; c++) {
    if (!enSala(c, f) || !BLOQ_PIE.includes(M.g[f][c])) continue;
    if (ejeX) e.x = d > 0 ? c - r - 1e-4 : c + 1 + r + 1e-4;
    else e.y = d > 0 ? f - r - 1e-4 : f + 1 + r + 1e-4;
    e.choco = true;
    return;
  }
}
function limitesSala(e, r, o) {
  let x0 = r, x1 = N - r, y0 = r, y1 = N - r;
  if (o.jugador) {
    const holgura = .42;
    if (Math.abs(e.x - 5.5) < holgura) { if (pasable('arriba')) y0 = -1.5; if (pasable('abajo')) y1 = N + 1.5; }
    if (Math.abs(e.y - 5.5) < holgura) { if (pasable('izq')) x0 = -1.5; if (pasable('der')) x1 = N + 1.5; }
    if (e.y < r || e.y > N - r) { x0 = Math.max(x0, 5.5 - holgura); x1 = Math.min(x1, 5.5 + holgura); }
    if (e.x < r || e.x > N - r) { y0 = Math.max(y0, 5.5 - holgura); y1 = Math.min(y1, 5.5 + holgura); }
  }
  if (e.x < x0) { e.x = x0; e.choco = true; } else if (e.x > x1) { e.x = x1; e.choco = true; }
  if (e.y < y0) { e.y = y0; e.choco = true; } else if (e.y > y1) { e.y = y1; e.choco = true; }
}

function revisarSalida() {
  const J = P.J;
  if (J.y < -.35) cambiarSala('arriba');
  else if (J.y > N + .35) cambiarSala('abajo');
  else if (J.x < -.35) cambiarSala('izq');
  else if (J.x > N + .35) cambiarSala('der');
}
function cambiarSala(dir) {
  const s = salaActual(), p = PUERTA[dir];
  const clave = kSala(s.c + p.dc, s.f + p.df);
  if (!P.mapa.salas[clave]) { P.J.x = clamp(P.J.x, .4, N - .4); P.J.y = clamp(P.J.y, .4, N - .4); return; }
  Ev.antesDeCambiar(dir);
  entrarSala(clave, p.op);
  M.trans = { dir, t: 0, dur: .3 };
}

/* ---------- apuntar y disparar ---------- */
function hayEnemigos() { return M.enemigos.some(e => !e.muerto && !e.oculto && !e.invis); }
function blancoAuto() {
  const J = P.J; let mejor = null, md = 1e9, mejorVisto = null, mdv = 1e9;
  for (const e of M.enemigos) {
    if (e.muerto || e.oculto || e.invis) continue;
    const d = Math.hypot(e.x - J.x, e.y - J.y);
    if (d < md) { md = d; mejor = e; }
    if (d < mdv && lineaLibre(J.x, J.y, e.x, e.y, BLOQ_BALA)) { mdv = d; mejorVisto = e; }
  }
  return mejorVisto || mejor;
}
function asistir(ax, ay) {
  const J = P.J, a0 = Math.atan2(ay, ax);
  let mejor = null, md = .42;
  for (const e of M.enemigos) {
    if (e.muerto || e.oculto || e.invis) continue;
    const d = Math.hypot(e.x - J.x, e.y - J.y);
    if (d > M.S.alcance + 3) continue;
    let da = Math.abs(Math.atan2(e.y - J.y, e.x - J.x) - a0);
    if (da > Math.PI) da = Math.PI * 2 - da;
    if (da < md) { md = da; mejor = e; }
  }
  if (!mejor) return [ax, ay];
  const d = Math.hypot(mejor.x - J.x, mejor.y - J.y) || 1;
  return [(mejor.x - J.x) / d, (mejor.y - J.y) / d];
}
function apuntarYDisparar(dt) {
  const J = P.J, S = M.S, en = M.entrada;
  if (J.cd > 0) J.cd -= dt;
  let ax = en.ax || 0, ay = en.ay || 0;
  let quiere = Math.hypot(ax, ay) > .3;
  if (quiere) {
    const m = Math.hypot(ax, ay); ax /= m; ay /= m;
    if (M.apuntado !== 'manual') [ax, ay] = asistir(ax, ay);
  } else if (M.apuntado === 'auto' && hayEnemigos()) {
    const o = blancoAuto();
    if (o) { const d = Math.hypot(o.x - J.x, o.y - J.y) || 1; ax = (o.x - J.x) / d; ay = (o.y - J.y) / d; quiere = true; }
  }
  if (M.cajaT > 0 || M.pose) quiere = false;
  if (quiere) { M.apunteUlt = [ax, ay]; if (Math.abs(ax) > .2) J.mira = ax > 0 ? 1 : -1; }
  M.disparando = quiere;
  if (S.carga) {
    if (quiere) {
      J.carga = Math.min(1, (J.carga || 0) + dt * S.cadencia / 2.4);
      if (M.apuntado === 'auto' && J.carga >= 1) dispararCargado();
    } else if (J.carga > .12) dispararCargado();
    else J.carga = 0;
    return;
  }
  if (quiere && J.cd <= 0) disparar(ax, ay);
}
function disparar(ax, ay) {
  const S = M.S, J = P.J;
  M.disparoT = .18;
  if (S.laser) {
    J.cd = 1 / (S.cadencia * .55);
    const a = Math.atan2(ay, ax);
    rayoDano(J.x, J.y - .15, a, S.alcance * 1.7, .34, S.dano * 1.25, false);
    M.efectos.push({ tipo: 'laser', x: J.x, y: J.y - .15, ang: a, largo: largoRayo(J.x, J.y - .15, a, S.alcance * 1.7), t: .14, max: .14 });
    Ev.sonido('laser');
    return;
  }
  const a0 = Math.atan2(ay, ax), n = S.n;
  const abre = n > 1 ? Math.min(.62, .14 * (n - 1)) : 0;
  for (let i = 0; i < n; i++) crearBala(n === 1 ? a0 : a0 - abre / 2 + abre * i / (n - 1));
  if (S.atras) crearBala(a0 + Math.PI);
  J.cd = 1 / S.cadencia;
  Ev.sonido('disparo');
}
function dispararCargado() {
  const J = P.J, c = J.carga; J.carga = 0;
  const [ax, ay] = M.apunteUlt;
  const b = crearBala(Math.atan2(ay, ax));
  b.dano *= 1 + 2.6 * c; b.r *= 1 + .9 * c; if (c > .9) b.perfora = true;
  M.disparoT = .2;
  Ev.sonido(c > .9 ? 'cargaFull' : 'disparo');
}
function crearBala(a) {
  const S = M.S, J = P.J, R = M.rc;
  const b = {
    de: 'p', x: J.x + Math.cos(a) * .22, y: J.y - .15 + Math.sin(a) * .22,
    vx: Math.cos(a) * S.velBala + J.vx * .3, vy: Math.sin(a) * S.velBala + J.vy * .3,
    r: .16 * S.tamBala, dano: S.dano, alcance: S.alcance, recorrido: 0, t: 0,
    rebotes: S.rebotes, perfora: S.perfora, tele: S.tele, explota: S.explota, fuego: S.fuego, hielo: S.hielo,
    partir: S.partir, cadena: S.cadena, bumeran: S.bumeran, ola: S.ola, espectral: S.espectral,
  };
  if (S.critico && rf(R) < S.critico + S.suerte * .01) { b.dano *= 2.5; b.crit = true; b.r *= 1.2; }
  if (S.estrella && rf(R) < S.estrella) { b.estrella = true; b.perfora = true; b.tele = Math.max(b.tele, .8); b.dano *= 1.5; }
  if (b.ola) { b.bx = b.x; b.by = b.y; }
  M.balas.push(b);
  return b;
}
function girarHacia(b, objetivo, max) {
  const a = Math.atan2(b.vy, b.vx), sp = Math.hypot(b.vx, b.vy);
  let d = objetivo - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
  const na = a + clamp(d, -max, max);
  b.vx = Math.cos(na) * sp; b.vy = Math.sin(na) * sp;
}
function enemigoMasCercano(x, y, maxD) {
  let mejor = null, md = maxD;
  for (const e of M.enemigos) {
    if (e.muerto || e.oculto || e.invis) continue;
    const d = Math.hypot(e.x - x, e.y - y);
    if (d < md) { md = d; mejor = e; }
  }
  return mejor;
}
function lineaLibre(x0, y0, x1, y1, bloqueo) {
  const d = Math.hypot(x1 - x0, y1 - y0), n = Math.ceil(d / .2);
  for (let i = 1; i < n; i++) {
    const c = Math.floor(x0 + (x1 - x0) * i / n), f = Math.floor(y0 + (y1 - y0) * i / n);
    if (enSala(c, f) && bloqueo.includes(M.g[f][c])) return false;
  }
  return true;
}
function largoRayo(x, y, a, max) {
  const dx = Math.cos(a), dy = Math.sin(a);
  for (let l = 0; l < max; l += .1) {
    const px = x + dx * l, py = y + dy * l;
    if (px < 0 || py < 0 || px > N || py > N) return l;
  }
  return max;
}
/* Rayo: daña a todos los enemigos que toca (atraviesa). */
function rayoDano(x, y, a, max, ancho, dano, continuo) {
  const largo = largoRayo(x, y, a, max), dx = Math.cos(a), dy = Math.sin(a);
  for (const e of M.enemigos) {
    if (e.muerto || e.oculto || e.invis || e.z > .45) continue;
    const t = clamp((e.x - x) * dx + (e.y - y) * dy, 0, largo);
    const d = Math.hypot(x + dx * t - e.x, y + dy * t - e.y);
    if (d < e.r + ancho / 2) {
      danarEnemigo(e, dano, continuo ? {} : { kx: dx * 1.5, ky: dy * 1.5 });
      if (!continuo && Math.random() < .6) chispas(e.x, e.y, '#ff5a6e', 3);
    }
  }
  return largo;
}

/* ============================================================
   ENEMIGOS
   ============================================================ */
function objetivo(e) {
  if (M.cajaT > 0) {
    if (!e.vagarMeta || distE(e, e.vagarMeta) < .4) e.vagarMeta = { x: 1 + rf(M.rc) * 9, y: 1 + rf(M.rc) * 9 };
    return e.vagarMeta;
  }
  return P.J;
}
function actualizarFlujo(dt) {
  M.flujoT -= dt;
  const c = Math.floor(P.J.x), f = Math.floor(P.J.y);
  if (M.flujoT > 0 && c === M.flujoC && f === M.flujoF) return;
  M.flujoT = .3; M.flujoC = c; M.flujoF = f;
  const D = M.flujo; D.fill(9999);
  if (!enSala(c, f)) return;
  const cola = [f * N + c]; D[f * N + c] = 0;
  for (let i = 0; i < cola.length; i++) {
    const k = cola[i], kc = k % N, kf = (k / N) | 0;
    for (const [dc, df] of DIR4) {
      const nc = kc + dc, nf = kf + df;
      if (!enSala(nc, nf)) continue;
      const nk = nf * N + nc;
      if (D[nk] !== 9999 || BLOQ_PIE.includes(M.g[nf][nc])) continue;
      D[nk] = D[k] + 1; cola.push(nk);
    }
  }
}
const bloqPie = (c, f) => !enSala(c, f) || BLOQ_PIE.includes(M.g[f][c]);
function rumbo(e, tx, ty, vuela) {
  const directo = () => { const d = Math.hypot(tx - e.x, ty - e.y) || 1; return [(tx - e.x) / d, (ty - e.y) / d]; };
  if (vuela || lineaLibre(e.x, e.y, tx, ty, BLOQ_PIE)) return directo();
  /* el mapa de distancias apunta a Michi: para otro destino se va derecho */
  if (Math.abs(tx - P.J.x) > .01 || Math.abs(ty - P.J.y) > .01) return directo();
  const c = Math.floor(e.x), f = Math.floor(e.y);
  if (!enSala(c, f)) return directo();
  let mejor = null, mv = M.flujo[f * N + c];
  for (const [dc, df] of DIR8) {
    const nc = c + dc, nf = f + df;
    if (!enSala(nc, nf)) continue;
    if (dc && df && (bloqPie(c + dc, f) || bloqPie(c, f + df))) continue;
    const val = M.flujo[nf * N + nc];
    if (val < mv) { mv = val; mejor = [nc + .5, nf + .5]; }
  }
  if (!mejor) return directo();
  const d = Math.hypot(mejor[0] - e.x, mejor[1] - e.y) || 1;
  return [(mejor[0] - e.x) / d, (mejor[1] - e.y) / d];
}
function vagar(e, dt, v) {
  e.tm = (e.tm || 0) - dt;
  if (!e.meta || e.tm <= 0 || distE(e, e.meta) < .3) {
    for (let i = 0; i < 8; i++) {
      const c = clamp(Math.floor(e.x + (rf(M.rc) - .5) * 6), 0, N - 1), f = clamp(Math.floor(e.y + (rf(M.rc) - .5) * 6), 0, N - 1);
      if (!bloqPie(c, f)) { e.meta = { x: c + .5, y: f + .5 }; break; }
    }
    e.tm = 2 + rf(M.rc) * 1.5;
  }
  if (!e.meta) { e.vx = e.vy = 0; return; }
  const [dx, dy] = rumbo(e, e.meta.x, e.meta.y, e.d.vuela);
  e.vx = dx * v; e.vy = dy * v;
}
function dispararCada(e, dt) {
  e.t -= dt;
  if (e.t <= 0) {
    e.t = e.d.disparo.cada * (.85 + rf(M.rc) * .3);
    if (M.cajaT <= 0) { disparoPatron(e, e.d.disparo); e.anim = .25; }
  }
}
const danoBalaE = () => P.modo === 'tranquilo' ? 1 : (P.pisoIdx >= 3 ? 2 : 1);
function balaE(x, y, a, vel, o) {
  o = o || {};
  const mult = P.modo === 'tranquilo' ? .85 : 1;
  const b = {
    de: 'e', x, y, vx: Math.cos(a) * vel * mult, vy: Math.sin(a) * vel * mult, r: o.r || .19,
    dano: o.dano || danoBalaE(), alcance: o.alcance || 16, recorrido: 0, t: 0, tipo: o.tipo || 'normal',
    fuente: o.fuente || 'Un disparo',
  };
  if (o.teleE) b.teleE = o.teleE;
  if (o.vida) b.vida = o.vida;
  if (o.alMorir) b.alMorir = o.alMorir;
  M.balas.push(b);
  return b;
}
function anillo(x, y, n, vel, o) {
  o = o || {};
  const off = o.off || 0;
  for (let i = 0; i < n; i++) balaE(x, y, off + i * Math.PI * 2 / n, vel, o);
}
function abanico(e, n, apertura, vel, o) {
  const a0 = Math.atan2(P.J.y - e.y, P.J.x - e.x);
  for (let i = 0; i < n; i++) balaE(e.x, e.y, n === 1 ? a0 : a0 - apertura / 2 + apertura * i / (n - 1), vel, Object.assign({ fuente: e.d.n }, o));
}
function disparoPatron(e, d) {
  const a0 = Math.atan2(P.J.y - e.y, P.J.x - e.x), v = d.vel, o = { tipo: d.tipo, fuente: e.d.n };
  switch (d.patron) {
    case 'apuntado': balaE(e.x, e.y, a0, v, o); break;
    case 'apuntado3': for (const k of [-.26, 0, .26]) balaE(e.x, e.y, a0 + k, v, o); break;
    case 'rafaga3': for (const k of [1, .82, .66]) balaE(e.x, e.y, a0, v * k, o); break;
    case 'cruz': anillo(e.x, e.y, 4, v, o); break;
    case 'equis': anillo(e.x, e.y, 4, v, Object.assign({ off: Math.PI / 4 }, o)); break;
    case 'cruzEquis': e.alt = !e.alt; anillo(e.x, e.y, 4, v, Object.assign({ off: e.alt ? 0 : Math.PI / 4 }, o)); break;
    case 'anillo6': anillo(e.x, e.y, 6, v, o); break;
    case 'anillo8': anillo(e.x, e.y, 8, v, Object.assign({ off: rf(M.rc) }, o)); break;
  }
  Ev.sonido('disparoE');
}

const IA = {
  perseguir(e) { const o = objetivo(e); const [dx, dy] = rumbo(e, o.x, o.y, e.d.vuela); e.vx = dx * e.d.vel; e.vy = dy * e.d.vel; },
  revolotear(e, dt) {
    e.t += dt; const o = objetivo(e);
    const a = Math.atan2(o.y - e.y, o.x - e.x) + Math.sin(e.t * 3.1 + e.sem) * 1.15;
    e.vx = Math.cos(a) * e.d.vel; e.vy = Math.sin(a) * e.d.vel;
  },
  corretear(e, dt) {
    e.t -= dt;
    if (e.choco && e.est === 'corre') { e.est = 'quieto'; e.t = .3; }
    if (e.t <= 0) {
      if (e.est === 'corre') { e.est = 'quieto'; e.t = .3 + rf(M.rc) * .45; }
      else {
        e.est = 'corre'; e.t = .35 + rf(M.rc) * .3;
        const o = objetivo(e); const [dx, dy] = rumbo(e, o.x, o.y, false);
        const a = Math.atan2(dy, dx) + (rf(M.rc) - .5) * .9; e.dir = [Math.cos(a), Math.sin(a)];
      }
    }
    if (e.est === 'corre') { e.vx = e.dir[0] * e.d.vel; e.vy = e.dir[1] * e.d.vel; } else { e.vx = 0; e.vy = 0; }
  },
  torreta(e, dt) { e.vx = 0; e.vy = 0; dispararCada(e, dt); },
  deambularDisparar(e, dt) { vagar(e, dt, e.d.vel); dispararCada(e, dt); },
  flotar(e) { const o = objetivo(e); const d = distE(e, o) || 1; e.vx = (o.x - e.x) / d * e.d.vel; e.vy = (o.y - e.y) / d * e.d.vel; },
  flotarDisparar(e, dt) { IA.flotar(e); if (distE(e, P.J) < 2.2) { e.vx *= -.6; e.vy *= -.6; } dispararCada(e, dt); },
  saltar(e, dt) {
    const s = e.d.salto;
    if (e.est !== 'salto') {
      e.vx = 0; e.vy = 0; e.t -= dt;
      if (e.t <= 0) {
        const o = objetivo(e);
        const a = Math.atan2(o.y - e.y, o.x - e.x) + (rf(M.rc) - .5) * .6;
        const d = Math.min(s.dist, distE(e, o) + .4);
        let tx = clamp(e.x + Math.cos(a) * d, e.r, N - e.r), ty = clamp(e.y + Math.sin(a) * d, e.r, N - e.r);
        if (bloqPie(Math.floor(tx), Math.floor(ty))) { const l = libreCerca(tx, ty); if (l) { tx = l.x; ty = l.y; } else { tx = e.x; ty = e.y; } }
        e.salto = { x0: e.x, y0: e.y, x1: tx, y1: ty, t: 0, dur: s.dur };
        e.est = 'salto';
      }
    } else {
      e.vx = 0; e.vy = 0;
      e.salto.t += dt;
      const k = Math.min(1, e.salto.t / e.salto.dur);
      e.x = lerp(e.salto.x0, e.salto.x1, k); e.y = lerp(e.salto.y0, e.salto.y1, k);
      e.z = Math.sin(k * Math.PI) * .8;
      if (k >= 1) {
        e.z = 0; e.est = 'suelo'; e.t = s.espera * (.8 + rf(M.rc) * .4);
        if (s.alCaer && M.cajaT <= 0) disparoPatron(e, { patron: s.alCaer, vel: 4, tipo: 'agua' });
        Ev.sonido('plaf');
      }
    }
  },
  embestir(e, dt) {
    const J = P.J;
    if (e.est === 'aviso') { e.vx = 0; e.vy = 0; e.temblor = .3; e.t -= dt; if (e.t <= 0) { e.est = 'carga'; e.t = 2; } return; }
    if (e.est === 'carga') {
      e.vx = e.dir[0] * e.d.carga; e.vy = e.dir[1] * e.d.carga; e.t -= dt;
      if (e.choco || e.t <= 0) { e.est = 'aturdido'; e.t = .6; if (e.choco) Ev.sonido('golpeFuerte'); }
      return;
    }
    if (e.est === 'aturdido') { e.vx = 0; e.vy = 0; e.t -= dt; if (e.t <= 0) { e.est = 'camina'; e.t = 0; } return; }
    /* camina en línea recta y cambia de rumbo al chocar */
    if (!e.dir || e.choco || (e.t -= dt) <= 0) {
      const op = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      e.dir = rElegir(M.rc, op); e.t = 1.5 + rf(M.rc) * 1.5;
    }
    e.vx = e.dir[0] * e.d.vel; e.vy = e.dir[1] * e.d.vel;
    if (M.cajaT > 0) return;
    const dx = J.x - e.x, dy = J.y - e.y;
    if ((Math.abs(dx) < .45 || Math.abs(dy) < .45) && Math.hypot(dx, dy) < 9 && lineaLibre(e.x, e.y, J.x, J.y, BLOQ_PIE)) {
      e.dir = Math.abs(dx) < .45 ? [0, Math.sign(dy)] : [Math.sign(dx), 0];
      e.est = 'aviso'; e.t = .35; Ev.sonido('aviso');
    }
  },
  emboscada(e, dt) {
    const J = P.J;
    e.t -= dt;
    if (e.est === 'oculto') {
      e.vx = 0; e.vy = 0; e.oculto = true;
      /* sale si Michi se acerca, o solo después de un rato (así la pieza nunca queda trabada) */
      if (M.cajaT <= 0 && ((e.t <= 0 && distE(e, J) < 2.7) || e.t < -3.5)) { e.est = 'sale'; e.t = .35; e.oculto = false; Ev.sonido('susto'); Ev.texto(e.x, e.y - .6, '¡Bu!'); }
      return;
    }
    if (e.est === 'sale') { e.vx = 0; e.vy = 0; if (e.t <= 0) { e.est = 'persigue'; e.t = 3.2; } return; }
    if (e.est === 'persigue') { IA.perseguir(e); if (e.t <= 0) { e.est = 'esconde'; e.t = .4; } return; }
    if (e.est === 'esconde') { e.vx = 0; e.vy = 0; if (e.t <= 0) { e.est = 'oculto'; e.oculto = true; e.t = 1.4; } }
  },
  picada(e, dt) {
    const J = P.J;
    if (e.est !== 'picada') {
      e.ang = (e.ang || e.sem) + dt * 2.2;
      const tx = J.x + Math.cos(e.ang) * 2.4, ty = J.y + Math.sin(e.ang) * 2.4;
      const d = Math.hypot(tx - e.x, ty - e.y) || 1;
      e.vx = (tx - e.x) / d * e.d.vel * 1.3; e.vy = (ty - e.y) / d * e.d.vel * 1.3;
      e.t -= dt;
      if (e.t <= 0 && M.cajaT <= 0) { e.est = 'picada'; e.t = .55; const a = Math.atan2(J.y - e.y, J.x - e.x); e.dir = [Math.cos(a), Math.sin(a)]; }
    } else {
      e.vx = e.dir[0] * 6.5; e.vy = e.dir[1] * 6.5; e.t -= dt;
      if (e.t <= 0 || e.choco) { e.est = 'orbita'; e.t = 1.3 + rf(M.rc) * .8; }
    }
  },
  babosa(e, dt) {
    IA.perseguir(e);
    e.tb = (e.tb || 0) - dt;
    if (e.tb <= 0) { e.tb = .3; const c = Math.floor(e.x), f = Math.floor(e.y); if (enSala(c, f)) M.baba[f * N + c] = 4; }
  },
  fantasma(e, dt) {
    IA.flotar(e);
    e.t -= dt;
    if (e.est === 'visible' && e.t <= 0) { e.est = 'se va'; e.t = .4; }
    else if (e.est === 'se va') { e.alfa = e.t / .4; if (e.t <= 0) { e.est = 'invisible'; e.invis = true; e.alfa = 0; e.t = 1.3; } }
    else if (e.est === 'invisible' && e.t <= 0) { e.est = 'vuelve'; e.t = .4; }
    else if (e.est === 'vuelve') {
      e.alfa = 1 - e.t / .4;
      if (e.t <= 0) { e.est = 'visible'; e.invis = false; e.alfa = 1; e.t = 2.2; if (M.cajaT <= 0) disparoPatron(e, e.d.disparo); }
    }
  },
  perseguirSaltar(e, dt) {
    const J = P.J;
    if (e.est === 'agacha') { e.vx = 0; e.vy = 0; e.t -= dt; if (e.t <= 0) { e.est = 'brinco'; e.t = .32; } return; }
    if (e.est === 'brinco') { e.vx = e.dir[0] * 8.5; e.vy = e.dir[1] * 8.5; e.t -= dt; if (e.t <= 0 || e.choco) { e.est = ''; e.t = 2 + rf(M.rc); } return; }
    IA.perseguir(e);
    e.t -= dt;
    if (e.t <= 0 && distE(e, J) < 4.5 && M.cajaT <= 0) {
      const a = Math.atan2(J.y - e.y, J.x - e.x); e.dir = [Math.cos(a), Math.sin(a)];
      e.est = 'agacha'; e.t = .25;
    }
  },
  clon(e, dt) {
    vagar(e, dt, e.d.vel); dispararCada(e, dt);
    e.vida -= dt; if (e.vida <= 0) { e.sinPremio = true; matarEnemigo(e); }
  },
};

function libreCerca(x, y) {
  let mejor = null, md = 1e9;
  for (let f = 0; f < N; f++) for (let c = 0; c < N; c++) {
    if (bloqPie(c, f)) continue;
    const d = Math.hypot(c + .5 - x, f + .5 - y);
    if (d < md) { md = d; mejor = { x: c + .5, y: f + .5 }; }
  }
  return mejor;
}

function actualizarEnemigo(e, dt) {
  if (e.espera > 0) { e.espera -= dt; return; }
  if (e.flash > 0) e.flash -= dt;
  if (e.anim > 0) e.anim -= dt;
  if (e.temblor > 0) e.temblor -= dt;
  if (e.lento > 0) e.lento -= dt;
  if (e.congelado > 0) e.congelado -= dt;
  if (e.quema > 0) {
    e.quema -= dt; e.quemaTick -= dt;
    if (e.quemaTick <= 0) { e.quemaTick = .5; danarEnemigo(e, e.quemaDps * .5, {}); chispas(e.x, e.y - .2, '#ff9a3c', 2); if (e.muerto) return; }
  }
  let factor = e.congelado > 0 ? 0 : (e.lento > 0 ? .5 : 1);
  if (M.linterna > 0) factor = 0;
  const dtIA = dt * factor;
  if (dtIA > 0) {
    if (e.jefe) IA_JEFE[e.tipo](e, dtIA);
    else IA[e.d.ia](e, dtIA);
  } else { e.vx = 0; e.vy = 0; }
  if (e.muerto) return;
  const vuela = e.d.vuela || e.z > .05;
  moverEntidad(e, (e.vx * factor + e.kx) * dt, (e.vy * factor + e.ky) * dt, { vuela, espectral: e.d.espectral });
  const kd = Math.exp(-dt * 9); e.kx *= kd; e.ky *= kd;
  /* contacto con Michi */
  if (!e.oculto && !e.invis && e.z < .3 && M.cajaT <= 0) {
    const J = P.J;
    if ((J.x - e.x) ** 2 + (J.y - e.y) ** 2 < (e.r + J.r * .8) ** 2) danarJugador(e.d.dano, e.d.n, e);
  }
  /* las mariposas y la pluma lastiman al contacto */
  for (const f of M.familiares) {
    if (!f.contacto || f.cd > 0) continue;
    if ((f.x - e.x) ** 2 + (f.y - e.y) ** 2 < (e.r + f.r) ** 2) { danarEnemigo(e, f.contacto, {}); f.cd = .22; if (e.muerto) return; }
  }
}

function danarEnemigo(e, dano, o) {
  if (e.muerto || e.invis || e.oculto) return;
  e.hp -= dano; e.flash = .09;
  if (o && o.kx) { e.kx += o.kx; e.ky += o.ky; }
  if (e.hp <= 0) matarEnemigo(e);
  else if (e.jefe) Ev.jefe('vida', e);
}
const COLOR_ENEMIGO = {
  raton: '#a7a2ad', ratonGordo: '#9c96a3', mosca: '#4b4453', cucaracha: '#8a5a3c', tetera: '#e7d9c9', gota: '#7cc4ea', gotita: '#7cc4ea',
  burbuja: '#bfe6f7', patito: '#f6d34f', arana: '#3a3440', pelusa: '#c9c4cf', soldadito: '#d65a5a', polilla: '#d8c9a6', libro: '#7a5fb0',
  pepino: '#6fb35e', sapo: '#5fae5a', perrito: '#b98552', murcielago: '#6a4f8f', babosa: '#c3d36a', fantasma: '#f3f1f6', buho: '#a07a52',
  gatoNegro: '#3b3743', clonSombra: '#3b2d5c',
};
function matarEnemigo(e) {
  if (e.muerto) return;
  e.muerto = true;
  const color = e.jefe ? '#ffffff' : (COLOR_ENEMIGO[e.tipo] || '#ffffff');
  chispas(e.x, e.y, color, e.jefe ? 30 : 9);
  Ev.sonido(e.jefe ? 'jefeVencido' : 'muerte');
  if (e.jefe) { jefeVencido(e); return; }
  if (!e.sinPremio) { P.stats.enemigos++; Ev.contar('enemigos', 1); }
  const am = e.d.alMorir;
  if (am && am.dividir) for (let i = 0; i < am.n; i++) crearEnemigo(am.dividir, clamp(e.x + (i ? .3 : -.3), .4, N - .4), e.y, { espera: .15, sinPremio: e.sinPremio });
  if (am && am.anillo && M.cajaT <= 0) anillo(e.x, e.y, am.anillo, am.vel, { tipo: am.tipo, fuente: e.d.n });
  if (!e.sinPremio && rf(M.rc) < .05 + M.S.suerte * .012) soltar(rf(M.rc) < .72 ? 'moneda' : 'medio', e.x, e.y, { salto: true });
  if (M.S.vampiro && rf(M.rc) < .07 && P.J.rojos < P.J.maxRojos) { P.J.rojos++; Ev.texto(P.J.x, P.J.y - .8, '+♥'); Ev.hud(); }
}

/* ============================================================
   JEFES
   ============================================================ */
function jefeElegir(e, lista) {
  const op = lista.filter(a => a !== e.ultimo);
  const a = rElegir(M.rc, op.length ? op : lista);
  e.ultimo = a; e.ataque = a; e.ta = 0; e.sub = 0; e.choco = false;
}
/* En modo tranquilo los jefes respiran más entre ataque y ataque. */
function jefeFin(e, espera) { e.ataque = null; e.t = espera * (P.modo === 'tranquilo' ? 1.5 : 1); e.sub = 0; e.ta = 0; }
const fase2 = e => e.hp < e.hpMax / 2;
function apuntarA(e) { const a = Math.atan2(P.J.y - e.y, P.J.x - e.x); return [Math.cos(a), Math.sin(a)]; }

const IA_JEFE = {
  reyRaton(e, dt) {
    const f2 = fase2(e);
    if (!e.ataque) {
      const o = objetivo(e); const [dx, dy] = rumbo(e, o.x, o.y, false); const v = e.d.vel * (f2 ? 1.35 : 1);
      e.vx = dx * v; e.vy = dy * v; e.t -= dt;
      if (e.t <= 0) jefeElegir(e, e.d.ataques);
      return;
    }
    e.ta += dt; e.vx = 0; e.vy = 0;
    if (e.ataque === 'embestida') {
      if (e.sub === 0) { e.temblor = .6; if (e.ta > .6) { e.sub = 1; e.ta = 0; e.dir = apuntarA(e); e.choco = false; Ev.sonido('chillido'); } }
      else if (e.sub === 1) {
        const v = f2 ? 8.5 : 7.2; e.vx = e.dir[0] * v; e.vy = e.dir[1] * v;
        if ((e.choco && e.ta > .05) || e.ta > 1.8) { e.sub = 2; e.ta = 0; Ev.temblor(.4); Ev.sonido('golpeFuerte'); anillo(e.x, e.y, 8, 3.2, { tipo: 'queso', alcance: 3.8, dano: e.d.dano, fuente: e.d.n }); }
      } else if (e.ta > .6) jefeFin(e, f2 ? .7 : 1.2);
    } else if (e.ataque === 'quesos') {
      if (e.sub === 0 && e.ta > .45) { abanico(e, f2 ? 7 : 5, f2 ? 1.2 : .9, 4.6, { tipo: 'queso' }); e.sub = 1; e.ta = 0; }
      else if (e.sub === 1 && f2 && e.ta > .5) { abanico(e, 6, 1.1, 4.2, { tipo: 'queso' }); e.sub = 2; e.ta = 0; }
      else if (e.sub >= 1 && e.ta > .7) jefeFin(e, 1);
    } else if (e.ataque === 'llamar') {
      if (e.ta > .55) {
        const vivos = M.enemigos.filter(x => !x.muerto && !x.jefe).length;
        if (vivos < 4) for (let i = 0; i < 2; i++) crearEnemigo('raton', clamp(e.x + (i ? 1 : -1), 1, N - 1), clamp(e.y + .8, 1, N - 1), { espera: .4, sinPremio: true });
        Ev.sonido('chillido'); jefeFin(e, 1.1);
      }
    }
  },
  tina(e, dt) {
    const f2 = fase2(e);
    if (Math.abs(e.objX - e.x) < .25) e.objX = 2.6 + rf(M.rc) * 5.8;
    e.vx = Math.sign(e.objX - e.x) * e.d.vel; e.vy = (2.2 - e.y) * 2;
    if (!e.ataque) { e.t -= dt; if (e.t <= 0) jefeElegir(e, f2 ? e.d.ataques.concat('gotas') : e.d.ataques); return; }
    e.ta += dt;
    if (e.ataque === 'anillo') {
      if (e.sub === 0 && e.ta > .35) { anillo(e.x, e.y + .3, 12, 3.6, { tipo: 'agua', fuente: e.d.n }); e.sub = 1; e.ta = 0; Ev.sonido('agua'); }
      else if (e.sub === 1 && f2 && e.ta > .35) { anillo(e.x, e.y + .3, 12, 3.6, { tipo: 'agua', off: Math.PI / 12, fuente: e.d.n }); e.sub = 2; e.ta = 0; Ev.sonido('agua'); }
      else if (e.sub >= 1 && e.ta > .5) jefeFin(e, 1.3);
    } else if (e.ataque === 'burbujas') {
      if (e.sub < 3) {
        if (e.ta > .4 + e.sub * .35) {
          const a = Math.atan2(P.J.y - e.y, P.J.x - e.x) + (e.sub - 1) * .5;
          balaE(e.x, e.y + .4, a, 2.3, { tipo: 'burbuja', r: .3, teleE: 1.3, vida: 4.5, alMorir: 4, fuente: e.d.n });
          e.sub++; Ev.sonido('burbuja');
        }
      } else if (e.ta > 1.6) jefeFin(e, 1.2);
    } else if (e.ataque === 'ola') {
      const ola = () => {
        const hueco = 1 + rf(M.rc) * 7.4;
        for (let x = .35; x < N; x += .52) {
          if (x > hueco && x < hueco + 2.1) continue;
          const b = balaE(x, e.y + 1.1, Math.PI / 2, 3.1, { tipo: 'agua', alcance: 12, fuente: e.d.n }); b.ola0 = true;
        }
        Ev.sonido('ola');
      };
      if (e.sub === 0 && e.ta > .5) { ola(); e.sub = 1; e.ta = 0; }
      else if (e.sub === 1 && f2 && e.ta > 1.15) { ola(); e.sub = 2; e.ta = 0; }
      else if (e.sub >= 1 && e.ta > 1.2) jefeFin(e, 1.2);
    } else if (e.ataque === 'gotas') {
      if (e.ta > .5) {
        const vivos = M.enemigos.filter(x => !x.muerto && !x.jefe).length;
        if (vivos < 4) for (let i = 0; i < 2; i++) crearEnemigo('gotita', clamp(e.x + (i ? 1.2 : -1.2), 1, N - 1), e.y + 1.4, { espera: .3, sinPremio: true });
        jefeFin(e, 1);
      }
    }
  },
  aspiradora(e, dt) {
    const f2 = fase2(e);
    if (!e.ataque) {
      const o = objetivo(e); const [dx, dy] = rumbo(e, o.x, o.y, false);
      e.vx = dx * e.d.vel; e.vy = dy * e.d.vel; e.t -= dt;
      if (e.t <= 0) jefeElegir(e, e.d.ataques);
      return;
    }
    e.ta += dt; e.vx = 0; e.vy = 0;
    if (e.ataque === 'succion') {
      if (e.ta < .5) { e.temblor = .5; return; }
      const dx = e.x - P.J.x, dy = e.y - P.J.y, d = Math.hypot(dx, dy) || 1;
      const fuerza = (f2 ? 2.9 : 2.4) * Math.min(1, 3.5 / d + .3);
      M.succion = M.cajaT > 0 ? null : { fx: dx / d * fuerza, fy: dy / d * fuerza };
      e.giro = (e.giro || 0) + dt * (f2 ? 5 : 4);
      e.tb = (e.tb || 0) - dt;
      if (e.tb <= 0) {
        e.tb = .13; const brazos = f2 ? 3 : 2;
        for (let i = 0; i < brazos; i++) balaE(e.x, e.y, e.giro + i * Math.PI * 2 / brazos, 3.3, { tipo: 'polvo', fuente: e.d.n });
      }
      if (Math.random() < .5) M.particulas.push({ x: e.x + Math.cos(e.giro * 3) * 3, y: e.y + Math.sin(e.giro * 3) * 3, vx: -Math.cos(e.giro * 3) * 5, vy: -Math.sin(e.giro * 3) * 5, vida: .5, max: .5, color: '#d9d2c5', tam: .08 });
      if (e.ta > 3.1) { M.succion = null; jefeFin(e, 1.1); }
    } else if (e.ataque === 'embestida') {
      if (e.sub === 0) { e.temblor = .5; if (e.ta > .5) { e.sub = 1; e.ta = 0; e.dir = apuntarA(e); e.choco = false; Ev.sonido('motor'); } }
      else if (e.sub === 1) {
        const v = f2 ? 9 : 8; e.vx = e.dir[0] * v; e.vy = e.dir[1] * v;
        if ((e.choco && e.ta > .05) || e.ta > 1.6) {
          e.sub = 2; e.ta = 0; Ev.temblor(.4); Ev.sonido('golpeFuerte');
          M.peligros.push({ tipo: 'polvo', x: e.x, y: e.y, r: .9, t: 4, cae: 0 });
        }
      } else if (e.ta > .6) jefeFin(e, 1);
    } else if (e.ataque === 'nubes') {
      if (e.sub < 3 && e.ta > .4 + e.sub * .3) {
        const x = clamp(P.J.x + (rf(M.rc) - .5) * 3, 1, N - 1), y = clamp(P.J.y + (rf(M.rc) - .5) * 3, 1, N - 1);
        M.peligros.push({ tipo: 'polvo', x, y, r: .95, t: 5.5, cae: .5 }); e.sub++; Ev.sonido('puf');
      } else if (e.sub >= 3 && e.ta > 1.4) jefeFin(e, 1.2);
    }
  },
  perro(e, dt) {
    const f2 = fase2(e);
    if (e.aturdido > 0) { e.aturdido -= dt; e.vx = 0; e.vy = 0; return; }
    if (!e.ataque) {
      const o = objetivo(e); const [dx, dy] = rumbo(e, o.x, o.y, false);
      e.vx = dx * e.d.vel; e.vy = dy * e.d.vel; e.t -= dt;
      if (e.t <= 0) jefeElegir(e, e.d.ataques);
      return;
    }
    e.ta += dt; e.vx = 0; e.vy = 0;
    if (e.ataque === 'embestida') {
      if (e.sub === 0 || e.sub === 3) {
        e.temblor = .5;
        if (e.ta > (e.sub === 0 ? .5 : .35)) { e.sub = e.sub === 0 ? 1 : 4; e.ta = 0; e.dir = apuntarA(e); e.choco = false; Ev.sonido('ladrido'); }
      } else {
        e.vx = e.dir[0] * 9; e.vy = e.dir[1] * 9;
        if ((e.choco && e.ta > .05) || e.ta > 1.6) {
          Ev.temblor(.45); Ev.sonido('golpeFuerte');
          if (e.sub === 1 && f2) { e.sub = 3; e.ta = 0; }
          else { if (e.choco) e.aturdido = 1.2; jefeFin(e, 1); }
        }
      }
    } else if (e.ataque === 'ladrido') {
      if (e.sub === 0 && e.ta > .45) { anillo(e.x, e.y, 16, 4.2, { tipo: 'ladrido', off: rf(M.rc), fuente: e.d.n }); Ev.sonido('ladrido'); e.sub = 1; e.ta = 0; }
      else if (e.sub === 1 && f2 && e.ta > .4) { anillo(e.x, e.y, 16, 4.2, { tipo: 'ladrido', off: rf(M.rc) + Math.PI / 16, fuente: e.d.n }); Ev.sonido('ladrido'); e.sub = 2; e.ta = 0; }
      else if (e.sub >= 1 && e.ta > .6) jefeFin(e, 1.1);
    } else if (e.ataque === 'salto') {
      if (e.sub === 0) { e.objetivo = { x: P.J.x, y: P.J.y }; e.sombra = e.objetivo; e.x0 = e.x; e.y0 = e.y; e.sub = 1; e.ta = 0; Ev.sonido('salto'); }
      else if (e.sub === 1) {
        const k = Math.min(1, e.ta / .85);
        e.x = lerp(e.x0, e.objetivo.x, k); e.y = lerp(e.y0, e.objetivo.y, k); e.z = Math.sin(k * Math.PI) * 2.2;
        if (k >= 1) { e.z = 0; e.sombra = null; anillo(e.x, e.y, f2 ? 12 : 10, 3.8, { tipo: 'ladrido', fuente: e.d.n }); Ev.temblor(.5); Ev.sonido('golpeFuerte'); e.sub = 2; e.ta = 0; }
      } else if (e.ta > .6) jefeFin(e, 1.1);
    }
  },
  gatoSombra(e, dt) {
    const f2 = fase2(e);
    if (f2 && !e.oscurecio) { e.oscurecio = true; M.oscuro = true; Ev.banner('La luz se apagó', 'Sigue las bolitas brillantes'); Ev.sonido('jefe'); }
    if (!e.ataque) {
      e.orb = (e.orb || 0) + dt * .9;
      const tx = P.J.x + Math.cos(e.orb) * 3.2, ty = P.J.y + Math.sin(e.orb) * 3.2;
      const d = Math.hypot(tx - e.x, ty - e.y) || 1;
      e.vx = (tx - e.x) / d * e.d.vel; e.vy = (ty - e.y) / d * e.d.vel;
      e.t -= dt; if (e.t <= 0) jefeElegir(e, e.d.ataques);
      return;
    }
    e.ta += dt; e.vx = 0; e.vy = 0;
    if (e.ataque === 'espejo') {
      const tx = N - P.J.x, ty = N - P.J.y, d = Math.hypot(tx - e.x, ty - e.y);
      if (d > .1) { const v = Math.min(7, d * 6); e.vx = (tx - e.x) / d * v; e.vy = (ty - e.y) / d * v; }
      e.cd = (e.cd || 0) - dt;
      if (M.disparoT > 0 && e.cd <= 0 && e.ta > .3) { e.cd = f2 ? .28 : .38; abanico(e, f2 ? 2 : 1, .25, 5.2, { tipo: 'sombra' }); }
      if (e.ta > 3.6) jefeFin(e, .9);
    } else if (e.ataque === 'espiral') {
      if (e.sub === 0) { e.invis = true; e.alfa = Math.max(0, 1 - e.ta / .35); if (e.ta > .35) { e.x = 5.5; e.y = 5.5; e.sub = 1; e.ta = 0; } }
      else if (e.sub === 1) { e.alfa = Math.min(1, e.ta / .35); if (e.ta > .35) { e.invis = false; e.alfa = 1; e.sub = 2; e.ta = 0; e.giro = rf(M.rc) * 6; } }
      else {
        e.giro += dt * 2.4; e.tb = (e.tb || 0) - dt;
        if (e.tb <= 0) { e.tb = .11; const brazos = f2 ? 3 : 2; for (let i = 0; i < brazos; i++) balaE(e.x, e.y, e.giro + i * Math.PI * 2 / brazos, 3.4, { tipo: 'sombra', fuente: e.d.n }); }
        if (e.ta > 2.8) jefeFin(e, 1);
      }
    } else if (e.ataque === 'clones') {
      if (e.ta > .6) {
        const vivos = M.enemigos.filter(x => !x.muerto && x.tipo === 'clonSombra').length;
        for (let i = vivos; i < (f2 ? 3 : 2); i++) crearEnemigo('clonSombra', 2 + rf(M.rc) * 7, 2 + rf(M.rc) * 7, { espera: .5, vida: 7, sinPremio: true });
        Ev.sonido('magia'); jefeFin(e, 1.2);
      }
    } else if (e.ataque === 'zarpazo') {
      if (e.sub === 0) { e.temblor = .35; if (e.ta > .35) { e.dir = apuntarA(e); e.sub = 1; e.ta = 0; e.choco = false; Ev.sonido('bufido'); } }
      else if (e.sub === 1) {
        e.vx = e.dir[0] * 10; e.vy = e.dir[1] * 10; e.estela = true;
        if ((e.choco && e.ta > .05) || e.ta > .55) { e.estela = false; abanico(e, f2 ? 5 : 3, .7, 4.6, { tipo: 'sombra' }); e.sub = 2; e.ta = 0; }
      } else if (e.ta > .5) jefeFin(e, .9);
    }
  },
};

function jefeVencido(e) {
  M.succion = null; M.oscuro = false;
  P.stats.jefes++;
  Ev.contar('jefe', e.tipo);
  Ev.temblor(.7); Ev.vibrar(140);
  for (const x of M.enemigos) if (!x.muerto && !x.jefe) { x.muerto = true; chispas(x.x, x.y, '#ffffff', 6); }
  M.balas = M.balas.filter(b => b.de === 'p');
  M.lento = .9;
  Ev.jefe('vencido', e);
  const s = salaActual();
  if (P.pisoIdx === PISOS.length - 1) { M.ganar = 2.4; return; }
  if (s.itemJefe) { s.pedestales.push({ x: 5.5, y: 4.2, item: s.itemJefe }); s.itemJefe = null; }
  s.recogibles.push(recogibleNuevo('corazon', 3.6, 6.4, { salto: true }));
  s.objetos.push({ tipo: 'trampilla', x: 5.5, y: 7.2, t: 0 });
}

/* ============================================================
   BALAS
   ============================================================ */
function chocaBala(b, nx, ny) {
  if (nx < .05 || nx > N - .05) return { eje: 'x' };
  if (ny < .05 || ny > N - .05) return { eje: 'y' };
  if (b.espectral) return null;
  const c = Math.floor(nx), f = Math.floor(ny), ch = M.g[f][c];
  if (!BLOQ_BALA.includes(ch)) return null;
  return { eje: Math.floor(b.x) !== c ? 'x' : 'y', c, f, ch };
}
function actualizarBalas(dt) {
  const J = P.J;
  for (const b of M.balas) {
    if (b.muerta) continue;
    b.t += dt;
    if (b.de === 'p') {
      if (b.tele > 0 && !b.vuelta) { const o = enemigoMasCercano(b.x, b.y, 4.5); if (o) girarHacia(b, Math.atan2(o.y - b.y, o.x - b.x), b.tele * 7 * dt); }
      if (b.bumeran) {
        if (!b.vuelta && b.recorrido >= b.alcance * .55) b.vuelta = true;
        if (b.vuelta) { girarHacia(b, Math.atan2(J.y - b.y, J.x - b.x), 14 * dt); if (Math.hypot(J.x - b.x, J.y - b.y) < .45) { b.muerta = true; continue; } }
      }
    } else if (b.teleE) girarHacia(b, Math.atan2(J.y - b.y, J.x - b.x), b.teleE * dt);
    const sp = Math.hypot(b.vx, b.vy) || 1;
    let nx = b.x + b.vx * dt, ny = b.y + b.vy * dt;
    if (b.ola) {
      b.bx += b.vx * dt; b.by += b.vy * dt;
      const off = Math.sin(b.t * 13) * .32;
      nx = b.bx - b.vy / sp * off; ny = b.by + b.vx / sp * off;
    }
    const ch = chocaBala(b, nx, ny);
    if (ch) {
      if (b.de === 'p' && b.rebotes > 0 && !b.ola) {
        b.rebotes--;
        if (ch.eje === 'x') b.vx = -b.vx; else b.vy = -b.vy;
        if (ch.ch === 'C') golpearCaja(ch.c, ch.f, b.dano);
        continue;
      }
      b.muerta = true;
      if (ch.ch === 'C' && b.de === 'p') golpearCaja(ch.c, ch.f, b.dano);
      salpicar(b);
      if (b.explota) explotar(b.x, b.y, .9 + b.r, b.dano * .6, {});
      continue;
    }
    b.x = nx; b.y = ny;
    b.recorrido += sp * dt;
    if (b.vida !== undefined) {
      b.vida -= dt;
      if (b.vida <= 0) { b.muerta = true; if (b.alMorir) anillo(b.x, b.y, b.alMorir, 3, { tipo: 'agua', fuente: b.fuente }); salpicar(b); continue; }
    }
    if (b.bumeran ? b.recorrido >= b.alcance * 1.8 : b.recorrido >= b.alcance) {
      b.muerta = true; salpicar(b);
      if (b.explota) explotar(b.x, b.y, .9 + b.r, b.dano * .6, {});
      continue;
    }
    if (b.de === 'p') {
      for (const e of M.enemigos) {
        if (e.muerto || e.oculto || e.invis || e.z > .45 || e.espera > .3) continue;
        if ((e.x - b.x) ** 2 + (e.y - b.y) ** 2 > (e.r + b.r) ** 2) continue;
        if (b.golpe && b.golpe.has(e.id)) continue;
        golpearEnemigo(b, e);
        if (b.perfora) { if (!b.golpe) b.golpe = new Set(); b.golpe.add(e.id); }
        else { b.muerta = true; break; }
      }
    } else {
      for (const f of M.familiares) {
        if (f.bloquea && (f.x - b.x) ** 2 + (f.y - b.y) ** 2 < (f.r + b.r) ** 2) { b.muerta = true; chispas(b.x, b.y, '#fff6d8', 4); break; }
      }
      if (b.muerta) continue;
      const rj = J.r * .72;
      if ((J.x - b.x) ** 2 + (J.y - .12 - b.y) ** 2 < (rj + b.r) ** 2 && M.cajaT <= 0) { b.muerta = true; danarJugador(b.dano, b.fuente); }
    }
  }
  if (M.balas.length) M.balas = M.balas.filter(b => !b.muerta);
}
function golpearEnemigo(b, e) {
  let dano = b.dano; if (e.aturdido > 0) dano *= 1.5;
  const sp = Math.hypot(b.vx, b.vy) || 1, kb = (e.jefe ? .12 : 1) * (.8 + b.r * 2.4);
  danarEnemigo(e, dano, { kx: b.vx / sp * kb * 3, ky: b.vy / sp * kb * 3 });
  if (b.fuego) { e.quema = 3; e.quemaDps = Math.max(1, b.dano * .3); }
  if (b.hielo) { e.lento = 2; if (!e.jefe && rf(M.rc) < .1) e.congelado = 1.2; }
  if (b.cadena && !b.hija) cadena(e, b);
  if (b.partir && !b.hija) partirBala(b);
  if (b.explota) explotar(b.x, b.y, .9 + b.r, b.dano * .6, {});
  salpicar(b);
  Ev.sonido('golpe');
}
function cadena(e, b) {
  let actual = e;
  const tocados = new Set([e.id]);
  for (let i = 0; i < 2; i++) {
    let sig = null, md = 3.2;
    for (const x of M.enemigos) {
      if (x.muerto || tocados.has(x.id) || x.oculto || x.invis) continue;
      const d = distE(x, actual); if (d < md) { md = d; sig = x; }
    }
    if (!sig) break;
    M.efectos.push({ tipo: 'rayito', x0: actual.x, y0: actual.y, x1: sig.x, y1: sig.y, t: .18, max: .18 });
    danarEnemigo(sig, b.dano * .6, {});
    tocados.add(sig.id); actual = sig;
  }
}
function partirBala(b) {
  const a0 = Math.atan2(b.vy, b.vx);
  for (const k of [-.7, .7, Math.PI]) {
    const a = a0 + k, sp = Math.hypot(b.vx, b.vy) * .8;
    M.balas.push({ de: 'p', x: b.x, y: b.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: b.r * .6, dano: b.dano * .5, alcance: 2.6, recorrido: 0, t: 0, rebotes: 0, hija: true, golpe: new Set(b.golpe || []) });
  }
}
function golpearCaja(c, f, dano) {
  const k = c + ',' + f;
  M.cajasHp[k] = (M.cajasHp[k] === undefined ? 9 : M.cajasHp[k]) - dano;
  chispas(c + .5, f + .5, '#c9a06a', 3);
  if (M.cajasHp[k] <= 0) romperTile(c, f);
}
function romperTile(c, f) {
  const ch = M.g[f][c];
  if (!'RXC'.includes(ch)) return;
  M.g[f][c] = '.';
  salaActual().grid[f] = M.g[f].join('');
  M.flujoT = 0;
  chispas(c + .5, f + .5, ch === 'C' ? '#c9a06a' : '#b8aca0', 10);
  if (ch === 'X') soltar(rElegir(M.rc, ['llave', 'petardo', 'moneda5', 'cofre', 'corazon']), c + .5, f + .5, { salto: true });
  else if (ch === 'C' && rf(M.rc) < .22) soltar(rElegir(M.rc, ['moneda', 'moneda', 'medio', 'petardo']), c + .5, f + .5, { salto: true });
  if (ch !== 'C') Ev.contar('rocas', 1);
  Ev.fondo();
}
function salpicar(b) {
  const color = b.de === 'p' ? colorBala(b) : ({ agua: '#8fd0f2', queso: '#f6cf5a', polvo: '#cfc7ba', sombra: '#7b5cc4', ladrido: '#ffb35c', vapor: '#ffffff', papel: '#f2efe6', pluma: '#d8b98a', burbuja: '#bfe6f7' }[b.tipo] || '#ff8080');
  for (let i = 0; i < 4; i++) {
    const a = Math.random() * Math.PI * 2, v = 1 + Math.random() * 2;
    M.particulas.push({ x: b.x, y: b.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vida: .25, max: .25, color, tam: b.r * .45 });
  }
}
function colorBala(b) {
  if (b.estrella) return '#ffe27a';
  if (b.fuego) return '#ff9a3c';
  if (b.hielo) return '#9fe0ff';
  if (b.cadena) return '#ffe45c';
  if (b.explota) return '#e2554f';
  if (b.tele) return '#b48cf0';
  if (b.perfora) return '#f6f1ff';
  return '#ef7ba0';
}
function chispas(x, y, color, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, v = 1.2 + Math.random() * 3.2;
    M.particulas.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1, vida: .45 + Math.random() * .3, max: .75, color, tam: .06 + Math.random() * .07 });
  }
  if (M.particulas.length > 240) M.particulas.splice(0, M.particulas.length - 240);
}

/* ============================================================
   EXPLOSIONES Y PETARDOS
   ============================================================ */
function explotar(x, y, radio, dano, o) {
  o = o || {};
  for (const e of M.enemigos) {
    if (e.muerto || e.oculto || e.invis) continue;
    const d = Math.hypot(e.x - x, e.y - y);
    if (d < radio + e.r) danarEnemigo(e, dano, { kx: (e.x - x) / (d || 1) * 4, ky: (e.y - y) / (d || 1) * 4 });
  }
  if (o.daJugador && P.modo !== 'tranquilo' && Math.hypot(P.J.x - x, P.J.y - y) < radio + .15) danarJugador(2, 'Su propio petardo');
  if (o.rompe) {
    for (let f = 0; f < N; f++) for (let c = 0; c < N; c++) {
      if (!'RXC'.includes(M.g[f][c])) continue;
      if (Math.hypot(c + .5 - x, f + .5 - y) < radio + .35) romperTile(c, f);
    }
  }
  if (o.revela) revelarSecretas(x, y, radio);
  M.efectos.push({ tipo: 'boom', x, y, r: radio, t: .35, max: .35 });
  chispas(x, y, '#ffcf6b', o.rompe ? 18 : 8);
  if (o.rompe || radio > 1.4) { Ev.temblor(.4); Ev.sonido('explosion'); Ev.vibrar(45); }
  else Ev.sonido('explosionChica');
}
function ponerPetardo() {
  if (P.J.petardos <= 0) { if (M.avisoT <= 0) { M.avisoT = 1; Ev.aviso('🧨', 'No te quedan petardos'); } return; }
  if (M.cajaT > 0) return;
  P.J.petardos--;
  M.petardos.push({ x: P.J.x, y: P.J.y + .1, t: 1.5, vx: 0, vy: 0, r: .2 });
  Ev.sonido('mecha'); Ev.hud();
}
function actualizarPetardos(dt) {
  for (const p of M.petardos) {
    p.t -= dt;
    if (p.vx || p.vy) {
      moverEntidad(p, p.vx * dt, p.vy * dt, {});
      const k = Math.exp(-dt * 3); p.vx *= k; p.vy *= k;
    }
    if (p.t <= 0 && !p.listo) {
      p.listo = true;
      if (p.amigo) explotar(p.x, p.y, 1.9, 45 + P.pisoIdx * 8, { rompe: true, revela: true });
      else explotar(p.x, p.y, M.S.petardoGrande ? 2.1 : 1.6, 30 + P.pisoIdx * 6, { daJugador: true, rompe: true, revela: true });
    }
  }
  if (M.petardos.length) M.petardos = M.petardos.filter(p => !p.listo);
}
function actualizarPeligros(dt) {
  for (const z of M.peligros) {
    z.t -= dt;
    if (z.cae > 0) { z.cae -= dt; continue; }
    if (M.cajaT <= 0 && distE(z, P.J) < z.r * .85) danarJugador(1, 'Una nube de polvo');
  }
  if (M.peligros.length) M.peligros = M.peligros.filter(z => z.t > 0);
}

/* ============================================================
   MICHI RECIBE DAÑO
   ============================================================ */
function danarJugador(cant, fuente, quien) {
  const J = P.J;
  if (M.invul > 0 || M.cajaT > 0 || M.fin || M.ganar > 0) return;
  if (P.modo === 'tranquilo') cant = 1;
  let resto = cant;
  if (J.sueno > 0) { const q = Math.min(J.sueno, resto); J.sueno -= q; resto -= q; }
  if (resto > 0) J.rojos -= resto;
  M.invul = 1; P.stats.danoPiso = true; P.stats.golpes++;
  if (quien) { const d = distE(quien, J) || 1; M.empujeX = (J.x - quien.x) / d * 6; M.empujeY = (J.y - quien.y) / d * 6; }
  Ev.sonido('dano'); Ev.temblor(.3); Ev.vibrar(70);
  if (J.rojos <= 0 && J.sueno <= 0) morir(fuente);
  Ev.hud();
}
function morir(fuente) {
  const J = P.J;
  if (J.vidas > 0) {
    J.vidas--; J.rojos = Math.max(2, Math.min(4, J.maxRojos)); M.invul = 2.4;
    Ev.banner('¡Una de sus siete vidas!', 'Michi sigue soñando'); Ev.sonido('vida'); Ev.hud();
    return;
  }
  J.rojos = 0;
  terminar(false, fuente);
}
function puntajeDe(gano) {
  return P.pisoIdx * 1000 + P.stats.jefes * 500 + P.stats.enemigos * 10 + P.J.monedas * 5 + (gano ? 3000 + Math.max(0, Math.round(1800 - P.t)) : 0);
}
function terminar(gano, fuente) {
  if (M.fin) return;
  M.fin = { gano, por: fuente || null };
  Ev.fin({
    gano, por: fuente || null, piso: P.pisoIdx, pisoNombre: PISOS[P.pisoIdx].nombre, tiempo: P.t, enemigos: P.stats.enemigos,
    jefes: P.stats.jefes, items: P.J.items.slice(), activo: P.J.activo ? P.J.activo.id : null, monedas: P.J.monedas,
    puntaje: puntajeDe(gano), modo: P.modo, fecha: P.fecha, pisosCompletados: gano ? PISOS.length : P.pisoIdx,
  });
}

/* ============================================================
   COSAS DEL SUELO: corazones, monedas, llaves, petardos, regalos
   ============================================================ */
function recogibleNuevo(tipo, x, y, o) {
  o = o || {};
  return { tipo, x, y, z: o.salto ? .35 : 0, vz: o.salto ? 3.6 : 0, vx: o.vx || 0, vy: o.vy || 0, r: .25, precio: o.precio || 0, abierto: false, t: 0 };
}
function soltar(tipo, x, y, o) {
  const r = recogibleNuevo(tipo, x, y, o);
  if (o && o.salto && !o.vx) { const a = Math.random() * Math.PI * 2; r.vx = Math.cos(a) * 1.2; r.vy = Math.sin(a) * 1.2; }
  salaActual().recogibles.push(r);
  return r;
}
function premioLimpieza() {
  const R = M.rc, suerte = M.S.suerte;
  if (rf(R) > .4 + suerte * .05) return;
  const l = libreCerca(5.5, 5.5) || { x: 5.5, y: 5.5 };
  const t = rf(R);
  let tipo = t < .28 ? 'corazon' : t < .62 ? 'moneda' : t < .74 ? 'llave' : t < .86 ? 'petardo' : t < .95 ? 'cofre' : 'sueno';
  if (tipo === 'corazon' && rf(R) < .4) tipo = 'medio';
  if (tipo === 'moneda' && rf(R) < .15) tipo = 'moneda5';
  if (tipo === 'cofre' && rf(R) < .25) tipo = 'cofreDorado';
  soltar(tipo, l.x, l.y, { salto: true });
}
const precioReal = p => M.S.descuento ? Math.max(1, Math.round(p * .7)) : p;
const ATRAIBLE = ['moneda', 'moneda5', 'llave', 'petardo', 'corazon', 'medio', 'sueno'];
function actualizarRecogibles(dt) {
  const J = P.J, s = salaActual();
  for (const r of s.recogibles) {
    if (r.tomado) continue;
    r.t += dt;
    if (r.vz || r.z > 0) {
      r.z += r.vz * dt; r.vz -= 14 * dt;
      if (r.z <= 0) { r.z = 0; r.vz = Math.abs(r.vz) > 1.5 ? -r.vz * .35 : 0; }
    }
    if (r.vx || r.vy) {
      moverEntidad(r, r.vx * dt, r.vy * dt, {});
      const k = Math.exp(-dt * 4); r.vx *= k; r.vy *= k;
      if (Math.abs(r.vx) + Math.abs(r.vy) < .02) { r.vx = 0; r.vy = 0; }
    }
    if (M.S.iman && !r.precio && ATRAIBLE.includes(r.tipo)) {
      const d = distE(r, J);
      if (d < 3.4 && d > .1) { r.x += (J.x - r.x) / d * 4.5 * dt; r.y += (J.y - r.y) / d * 4.5 * dt; }
    }
    if (r.z < .3 && (r.x - J.x) ** 2 + (r.y - J.y) ** 2 < .55 * .55 && M.cajaT <= 0) tocarRecogible(r);
  }
  if (s.recogibles.some(r => r.tomado)) s.recogibles = s.recogibles.filter(r => !r.tomado);
}
function tocarRecogible(r) {
  const J = P.J;
  if (r.tipo === 'cofre' || r.tipo === 'cofreDorado') { if (!r.abierto) abrirCofre(r); return; }
  if (r.precio) {
    const pr = precioReal(r.precio);
    if (J.monedas < pr) { if (M.avisoT <= 0) { M.avisoT = 1.4; Ev.aviso('🪙', 'Te faltan ' + (pr - J.monedas) + ' monedas'); } return; }
  }
  let sonido = 'recoger';
  switch (r.tipo) {
    case 'corazon': if (J.rojos >= J.maxRojos) return; J.rojos = Math.min(J.maxRojos, J.rojos + 2); sonido = 'corazon'; break;
    case 'medio': if (J.rojos >= J.maxRojos) return; J.rojos = Math.min(J.maxRojos, J.rojos + 1); sonido = 'corazon'; break;
    case 'sueno': if (totalCorazones() >= 24) return; J.sueno = Math.min(24 - J.maxRojos, J.sueno + 2); sonido = 'corazon'; break;
    case 'moneda': J.monedas = Math.min(99, J.monedas + 1); P.stats.monedasJuntadas++; sonido = 'moneda'; break;
    case 'moneda5': J.monedas = Math.min(99, J.monedas + 5); P.stats.monedasJuntadas += 5; sonido = 'moneda'; break;
    case 'llave': J.llaves = Math.min(99, J.llaves + 1); sonido = 'llave'; break;
    case 'petardo': J.petardos = Math.min(99, J.petardos + 1); sonido = 'recoger'; break;
    default: return;
  }
  if (r.precio) { J.monedas -= precioReal(r.precio); P.stats.compras++; Ev.contar('compras', 1); sonido = 'compra'; }
  r.tomado = true;
  Ev.sonido(sonido); Ev.hud();
}
function abrirCofre(r) {
  const J = P.J, R = M.rc;
  if (r.tipo === 'cofreDorado') {
    if (J.llaves <= 0) { if (M.avisoT <= 0) { M.avisoT = 1.4; Ev.aviso('🔑', 'Este regalo necesita una llave'); } return; }
    J.llaves--;
  }
  r.abierto = true;
  Ev.contar('cofres', 1); Ev.sonido('cofre');
  if (r.tipo === 'cofreDorado' && rf(R) < .35) {
    salaActual().pedestales.push({ x: r.x, y: r.y - .1, item: sacarItem('tesoro') });
    r.tomado = true;
  } else {
    const n = r.tipo === 'cofreDorado' ? ri(R, 3, 5) : ri(R, 2, 3);
    for (let i = 0; i < n; i++) soltar(rElegir(R, ['moneda', 'moneda', 'moneda5', 'corazon', 'llave', 'petardo', 'medio']), r.x, r.y, { salto: true });
  }
  Ev.hud();
}

/* Objetos de pedestal (tesoro, tienda, jefe, secretas) */
function actualizarPedestales() {
  const J = P.J, s = salaActual();
  for (const p of s.pedestales) {
    if (!p.item) continue;
    const d = Math.hypot(p.x - J.x, p.y - J.y);
    if (p.bloqueo) { if (d > .95) p.bloqueo = false; continue; }
    if (d > .62 || M.cajaT > 0) continue;
    if (p.precio) {
      const pr = precioReal(p.precio);
      if (J.monedas < pr) { if (M.avisoT <= 0) { M.avisoT = 1.4; Ev.aviso('🪙', 'Te faltan ' + (pr - J.monedas) + ' monedas'); } continue; }
      J.monedas -= pr; p.precio = 0; P.stats.compras++; Ev.contar('compras', 1); Ev.sonido('compra');
    }
    tomarItem(p);
  }
}
function tomarItem(p) {
  const it = ITEM[p.item], J = P.J;
  if (!it) { p.item = null; return; }
  if (it.ef.activo) {
    const viejo = J.activo;
    J.activo = { id: it.id, carga: it.ef.cargaMax };
    p.item = viejo ? viejo.id : null;
    if (viejo) p.bloqueo = true;
  } else {
    p.item = null;
    darItemDirecto(it.id);
  }
  calcularStats();
  M.pose = { t: 1.1, item: it.id };
  Ev.item(it); Ev.sonido('item'); Ev.contar('item', it.id); Ev.hud();
}

function actualizarObjetos(dt) {
  const J = P.J, s = salaActual();
  for (const o of s.objetos) {
    if (o.tipo === 'trampilla') {
      o.t = (o.t || 0) + dt;
      if (o.t > 1 && distE(o, J) < .5) { bajarPiso(); return; }
    } else if (o.tipo === 'camita' && !o.usada && distE(o, J) < .7) {
      o.usada = true;
      if (J.rojos < J.maxRojos) J.rojos = Math.min(J.maxRojos, J.rojos + 2);
      else J.sueno = Math.min(24 - J.maxRojos, J.sueno + 2);
      M.pose = { t: 1.2, dormir: true };
      Ev.aviso('🛏️', 'Michi se echó una siestita'); Ev.sonido('ronroneo'); Ev.hud(); Ev.fondo();
    }
  }
}
function bajarPiso() {
  if (!P.stats.danoPiso) { P.stats.pisosSinDano++; Ev.contar('sinDano', 1); }
  P.stats.danoPiso = false;
  P.pisoIdx++;
  generarPiso(P.pisoIdx);
  Ev.antesDeCambiar('abajo');
  entrarSala(P.mapa.actual, null);
  M.trans = { dir: 'baja', t: 0, dur: .9 };
  Ev.piso(PISOS[P.pisoIdx], P.pisoIdx);
  Ev.sonido('bajar');
}

/* ============================================================
   AMIGOS (familiares)
   ============================================================ */
function actualizarFamiliares(dt) {
  const J = P.J, quiero = M.S.fam;
  if (M.familiares.length !== quiero.length || M.familiares.some((f, i) => f.tipo !== quiero[i])) {
    M.familiares = quiero.map((tipo, i) => ({
      tipo, x: J.x, y: J.y, ang: i * 2.1, cd: .5 + i * .2, r: tipo === 'pluma' ? .3 : .24,
      bloquea: tipo === 'pluma', contacto: tipo === 'pluma' ? 3 : (tipo === 'mariposa' ? 4 : 0),
    }));
  }
  let seguidor = 0;
  for (const f of M.familiares) {
    f.cd -= dt;
    if (f.tipo === 'raton' || f.tipo === 'pez') {
      seguidor++;
      const p = M.rastro[Math.min(M.rastro.length - 1, seguidor * 9)] || J;
      f.x += (p.x - f.x) * Math.min(1, dt * 8); f.y += (p.y + .1 - f.y) * Math.min(1, dt * 8);
      if (f.tipo === 'raton' && M.disparoT > 0 && f.cd <= 0) {
        f.cd = .75; const [ax, ay] = M.apunteUlt;
        M.balas.push({ de: 'p', x: f.x, y: f.y, vx: ax * 7, vy: ay * 7, r: .12, dano: 3 + P.pisoIdx * .4, alcance: 6, recorrido: 0, t: 0, rebotes: 0, hija: true });
      }
      if (f.tipo === 'pez' && f.cd <= 0) {
        const o = enemigoMasCercano(f.x, f.y, 6);
        if (o) { f.cd = 1.6; const a = Math.atan2(o.y - f.y, o.x - f.x); M.balas.push({ de: 'p', x: f.x, y: f.y, vx: Math.cos(a) * 4.5, vy: Math.sin(a) * 4.5, r: .16, dano: 2.5, alcance: 6, recorrido: 0, t: 0, rebotes: 0, hielo: true, hija: true }); }
      }
    } else {
      const radio = f.tipo === 'pluma' ? 1.05 : (f.tipo === 'luciernaga' ? 1.5 : 1.9);
      const vel = f.tipo === 'pluma' ? 3 : (f.tipo === 'luciernaga' ? 2 : 3.6);
      f.ang += dt * vel;
      const tx = J.x + Math.cos(f.ang) * radio, ty = J.y - .1 + Math.sin(f.ang) * radio * (f.tipo === 'mariposa' ? .7 : 1);
      f.x += (tx - f.x) * Math.min(1, dt * 12); f.y += (ty - f.y) * Math.min(1, dt * 12);
      if (f.tipo === 'luciernaga' && f.cd <= 0) {
        const o = enemigoMasCercano(f.x, f.y, 6);
        if (o) { f.cd = 1.1; const a = Math.atan2(o.y - f.y, o.x - f.x); M.balas.push({ de: 'p', x: f.x, y: f.y, vx: Math.cos(a) * 6, vy: Math.sin(a) * 6, r: .11, dano: 2.5 + P.pisoIdx * .3, alcance: 7, recorrido: 0, t: 0, rebotes: 0, tele: .9, hija: true }); }
      }
    }
  }
}

/* ============================================================
   OBJETOS PARA USAR
   ============================================================ */
function usarActivo() {
  const A = P.J.activo; if (!A) return;
  const def = ITEM[A.id], s = salaActual();
  if (A.carga < def.ef.cargaMax) { Ev.sonido('error'); return; }
  let ok = true;
  const [ax, ay] = M.apunteUlt;
  switch (def.ef.activo) {
    case 'caja': M.cajaT = 4; break;
    case 'ronroneo': if (P.J.rojos >= P.J.maxRojos) { ok = false; Ev.aviso('💤', 'Michi ya está sanito'); break; } P.J.rojos = Math.min(P.J.maxRojos, P.J.rojos + 2); break;
    case 'maullido':
      for (const e of M.enemigos) {
        if (e.muerto) continue;
        const d = distE(e, P.J);
        if (d < 4.6) danarEnemigo(e, 12 + M.S.dano * 2, { kx: (e.x - P.J.x) / (d || 1) * (e.jefe ? 1 : 7), ky: (e.y - P.J.y) / (d || 1) * (e.jefe ? 1 : 7) });
      }
      M.balas = M.balas.filter(b => b.de === 'p');
      M.efectos.push({ tipo: 'onda', x: P.J.x, y: P.J.y, r: 4.6, t: .45, max: .45 });
      break;
    case 'ovilloBomba': M.petardos.push({ x: P.J.x + ax * .5, y: P.J.y + ay * .5, vx: ax * 7, vy: ay * 7, t: .8, r: .25, amigo: true }); break;
    case 'linterna': M.linterna = 3; revelarSecretas(P.J.x, P.J.y, Infinity); M.efectos.push({ tipo: 'flash', t: .3, max: .3 }); break;
    case 'rayoLuna': M.rayo = { t: 1.2, ang: Math.atan2(ay, ax) }; break;
    case 'dado': {
      const con = s.pedestales.filter(p => p.item);
      if (!con.length) { ok = false; Ev.aviso('🎲', 'Aquí no hay nada que cambiar'); break; }
      const pool = s.tipo === 'tienda' ? 'tienda' : s.tipo === 'jefe' ? 'jefe' : s.tipo === 'secreta' ? 'secreta' : 'tesoro';
      for (const p of con) p.item = sacarItem(pool);
      break;
    }
    case 'atun': M.atun = true; calcularStats(); break;
  }
  if (!ok) { Ev.sonido('error'); return; }
  A.carga = 0;
  Ev.sonido('activo'); Ev.hud();
}

/* ---------- efectos visuales ---------- */
function actualizarEfectos(dt) {
  for (const p of M.particulas) { p.vida -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .92; p.vy *= .92; }
  if (M.particulas.length) M.particulas = M.particulas.filter(p => p.vida > 0);
  for (const e of M.efectos) e.t -= dt;
  if (M.efectos.length) M.efectos = M.efectos.filter(e => e.t > 0);
}

/* ---------- pieza limpia ---------- */
function revisarLimpieza() {
  const s = salaActual();
  if (s.limpia) return;
  if (M.enemigos.some(e => !e.muerto)) return;
  s.limpia = true; M.puertasCerradas = false;
  P.stats.salas++;
  if (P.J.activo) { const max = ITEM[P.J.activo.id].ef.cargaMax; P.J.activo.carga = Math.min(max, P.J.activo.carga + 1); }
  if (s.tipo === 'normal') premioLimpieza();
  Ev.sonido('limpio'); Ev.fondo(); Ev.hud(); Ev.guardar();
}

/* ---------- para guardar la partida ---------- */
function partidaParaGuardar() {
  if (!P || (M && M.fin)) return null;
  return JSON.parse(JSON.stringify(P, (k, v) => (v instanceof Set ? undefined : v)));
}
