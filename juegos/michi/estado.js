/* ============================================================
   ESTADO — la partida, el paso del tiempo real y la nube
   Cada persona tiene su propio Michi en el localStorage de su
   aparato (`michiRincon_v1__<Persona>`, más `_copia`). A Neon sube
   solo la rama `datos.michi` con `marcador` (récords, para picarse)
   y `respaldo` (por si se cambia de teléfono).
   ============================================================ */
const PERSONAS = ['Catalina', 'Diego'];
let E = null;

/* Ganchos que llena la interfaz. */
const Ev = { nivel: () => {}, logro: () => {}, aviso: () => {} };

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* El día se cuenta en hora de Chile, como en la portada. */
const FECHA_CHILE = (() => {
  try { return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit' }); }
  catch (e) { return null; }
})();
function hoyClave(t = Date.now()) {
  const d = new Date(t);
  if (FECHA_CHILE) {
    try {
      const p = {};
      for (const x of FECHA_CHILE.formatToParts(d)) p[x.type] = x.value;
      if (p.year && p.month && p.day) return `${p.year}-${p.month}-${p.day}`;
    } catch (e) { /* cae al reloj del aparato */ }
  }
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
const ayerClave = () => hoyClave(Date.now() - 86400000);

function quien() { try { return localStorage.getItem('rinconQuien') || null; } catch (e) { return null; } }
function claveDe(p) { return JUEGO.clave + '__' + (p || 'invitado'); }

/* ---------- niveles ---------- */
function xpParaSubir(n) { return 40 + 25 * (n - 1); }
function progresoNivel(xp) {
  let n = 1, resto = Math.max(0, xp || 0);
  while (resto >= xpParaSubir(n)) { resto -= xpParaSubir(n); n++; }
  return { nivel: n, actual: resto, falta: xpParaSubir(n) };
}
const nivelDe = xp => progresoNivel(xp).nivel;
const nivel = () => nivelDe(E.xp);

/* ---------- azar con semilla (misiones iguales todo el día) ---------- */
function semilla(txt) { let h = 2166136261; for (const c of txt) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function azarCon(s) { return () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/* ============================================================
   CREAR, NORMALIZAR, GUARDAR
   ============================================================ */
function estadoNuevo(p) {
  const ahora = Date.now();
  return normalizar({
    v: 1, duenio: p || null, nombre: 'Michi', creado: ahora, t: ahora, ultimoTick: ahora,
    monedas: JUEGO.monedasIniciales, xp: 0,
    nec: { hambre: 82, limpieza: 85, energia: 80, animo: 85 },
    comida: { leche: 3, manzana: 3, pan: 2, pescado: 2 },
    pociones: { medicina: 1 },
  });
}

function normalizar(d) {
  const o = (v, def) => (v && typeof v === 'object' && !Array.isArray(v)) ? v : def;
  d = o(d, {});
  const ahora = Date.now();
  d.v = 1;
  if (typeof d.nombre !== 'string' || !d.nombre.trim()) d.nombre = 'Michi';
  d.nombre = d.nombre.slice(0, 16);
  for (const k of ['creado', 't', 'ultimoTick']) if (!(d[k] > 0)) d[k] = ahora;
  if (d.ultimoTick > ahora) d.ultimoTick = ahora;
  if (!(d.monedas >= 0)) d.monedas = 0;
  d.monedas = Math.floor(d.monedas);
  if (!(d.xp >= 0)) d.xp = 0;
  d.nec = o(d.nec, {});
  for (const n of NECESIDADES) d.nec[n.id] = clamp(Number.isFinite(d.nec[n.id]) ? d.nec[n.id] : 80, 0, 100);
  d.ceroDesde = o(d.ceroDesde, {});
  d.enfermo = !!d.enfermo;
  d.durmiendo = !!d.durmiendo;
  d.despertoSolo = !!d.despertoSolo;
  d.comida = o(d.comida, {});
  d.pociones = o(d.pociones, {});
  for (const k of Object.keys(d.comida)) if (!COMIDAS.some(c => c.id === k) || !(d.comida[k] > 0)) delete d.comida[k];
  for (const k of Object.keys(d.pociones)) if (!POCIONES.some(c => c.id === k) || !(d.pociones[k] > 0)) delete d.pociones[k];
  d.ropa = Array.isArray(d.ropa) ? [...new Set(d.ropa.filter(id => ROPA.some(r => r.id === id)))] : [];
  d.puesto = o(d.puesto, {});
  for (const s of ['ropa', 'sombrero', 'accesorio']) if (!d.ropa.includes(d.puesto[s])) d.puesto[s] = null;
  d.pelajes = Array.isArray(d.pelajes) ? d.pelajes.filter(id => PELAJES.some(p => p.id === id)) : [];
  if (!d.pelajes.includes('crema')) d.pelajes.unshift('crema');
  if (!d.pelajes.includes(d.pelaje)) d.pelaje = 'crema';
  d.decor = o(d.decor, {});
  d.decorComprada = Array.isArray(d.decorComprada) ? d.decorComprada : [];
  for (const p of PIEZAS) {
    d.decor[p.id] = o(d.decor[p.id], {});
    if (!decorTiene(d, 'papel', d.decor[p.id].papel)) d.decor[p.id].papel = p.papel;
    if (!decorTiene(d, 'piso', d.decor[p.id].piso)) d.decor[p.id].piso = p.piso;
  }
  d.efectos = o(d.efectos, {});
  d.stats = Object.assign({ comidas: 0, banos: 0, siestas: 0, carinos: 0, partidas: 0, monedasGanadas: 0 }, o(d.stats, {}));
  d.records = o(d.records, {});
  d.diario = Object.assign({ ultimo: null, racha: 0, mejorRacha: 0 }, o(d.diario, {}));
  d.ruleta = Object.assign({ ultimo: null }, o(d.ruleta, {}));
  d.logros = o(d.logros, {});
  d.carinosHora = Object.assign({ h: 0, n: 0 }, o(d.carinosHora, {}));
  d.ajustes = Object.assign({ sonido: true }, o(d.ajustes, {}));
  d.importado = !!d.importado;
  if (d.misiones && (!Array.isArray(d.misiones.lista) || typeof d.misiones.fecha !== 'string')) d.misiones = null;
  return d;
}
function decorTiene(d, tipo, id) {
  const lista = tipo === 'papel' ? PAPELES : PISOS;
  const x = lista.find(y => y.id === id);
  return !!x && (x.precio === 0 || d.decorComprada.includes(tipo + ':' + id));
}

function leerLocal(p) {
  for (const k of [claveDe(p), claveDe(p) + '_copia']) {
    try {
      const bruto = localStorage.getItem(k);
      if (!bruto) continue;
      const d = JSON.parse(bruto);
      if (d && typeof d === 'object' && d.nec) return normalizar(d);
    } catch (e) { /* corrupto: se prueba la copia */ }
  }
  return null;
}

let ultimoGuardado = 0, guardadoPendiente = null;
function guardar(forzar) {
  if (!E) return;
  const ahora = Date.now();
  if (!forzar && ahora - ultimoGuardado < 1500) {
    if (!guardadoPendiente) guardadoPendiente = setTimeout(() => { guardadoPendiente = null; guardar(true); }, 1600);
    return;
  }
  ultimoGuardado = ahora;
  E.t = ahora;
  const p = quien();
  try {
    const k = claveDe(p);
    const previo = localStorage.getItem(k);
    if (previo) localStorage.setItem(k + '_copia', previo);
    localStorage.setItem(k, JSON.stringify(E));
    localStorage.setItem('michiResumen__' + (p || 'invitado'), JSON.stringify(resumen()));
  } catch (e) { /* almacenamiento lleno o modo privado */ }
}
/* Lo que lee la portada para dibujar a Michi en el Rincón de juegos. */
function resumen() {
  return {
    nombre: E.nombre, nivel: nivel(), monedas: E.monedas, prendas: E.ropa.length,
    ropa: E.puesto.ropa, sombrero: E.puesto.sombrero, accesorio: E.puesto.accesorio, pelaje: E.pelaje,
    animo: Math.round(NECESIDADES.reduce((s, n) => s + E.nec[n.id], 0) / NECESIDADES.length),
    durmiendo: E.durmiendo, enfermo: E.enfermo, t: Date.now(),
  };
}

/* ============================================================
   EL TIEMPO PASA (también con la página cerrada)
   ============================================================ */
function avanzarTiempo(hasta = Date.now()) {
  if (!E) return;
  const PASO = 5 * 60 * 1000;
  let t = E.ultimoTick;
  if (hasta <= t) { E.ultimoTick = Math.min(t, hasta); return; }
  while (t < hasta) {
    const d = Math.min(PASO, hasta - t);
    pasoTiempo(d, t + d);
    t += d;
  }
  E.ultimoTick = hasta;
}
function pasoTiempo(ms, t) {
  const h = ms / 3600000;
  for (const n of NECESIDADES) {
    let tasa = E.durmiendo ? n.dormido : n.despierto;
    if (E.enfermo && n.id === 'animo') tasa *= 1.6;
    const v = clamp(E.nec[n.id] - tasa * h, 0, 100);
    E.nec[n.id] = v;
    if (v <= 0.01) { if (!E.ceroDesde[n.id]) E.ceroDesde[n.id] = t; } else delete E.ceroDesde[n.id];
  }
  for (const k of Object.keys(E.efectos)) if (E.efectos[k] && E.efectos[k].hasta <= t) delete E.efectos[k];
  if (E.durmiendo && E.nec.energia >= 99.5) {
    E.durmiendo = false; E.despertoSolo = true;
    E.stats.siestas++; avanzarMision('dormir', 1); ganarXp(8);
  }
  if (!E.enfermo) {
    for (const id in E.ceroDesde) {
      if (t - E.ceroDesde[id] >= MIN_PARA_ENFERMAR * 60000) { E.enfermo = true; break; }
    }
  }
}
function sumar(id, v) {
  E.nec[id] = clamp(E.nec[id] + v, 0, 100);
  if (E.nec[id] > 0.01) delete E.ceroDesde[id];
}

/* ============================================================
   MONEDAS, EXPERIENCIA, NIVELES
   ============================================================ */
function ganarMonedas(n) {
  n = Math.max(0, Math.round(n));
  E.monedas += n;
  E.stats.monedasGanadas += n;
}
function gastar(n) {
  if (E.monedas < n) return false;
  E.monedas -= n;
  return true;
}
function ganarXp(n) {
  const antes = nivel();
  E.xp += Math.max(0, Math.round(n));
  const despues = nivel();
  for (let lv = antes + 1; lv <= despues; lv++) {
    const premio = 25 + 10 * lv;
    ganarMonedas(premio);
    Ev.nivel(lv, premio, desbloqueosDe(lv));
  }
  if (despues > antes) revisarLogros();
}
function desbloqueosDe(lv) {
  const l = [];
  for (const x of MINIJUEGOS) if (x.nivel === lv) l.push(x.emoji + ' ' + x.nombre);
  for (const x of COMIDAS) if (x.nivel === lv) l.push(x.emoji + ' ' + x.nombre);
  for (const x of POCIONES) if (x.nivel === lv) l.push(x.emoji + ' ' + x.nombre);
  for (const x of ROPA) if (x.nivel === lv) l.push(x.emoji + ' ' + x.nombre);
  for (const x of PELAJES) if (x.nivel === lv && x.precio) l.push('🎨 Pelaje ' + x.nombre.toLowerCase());
  for (const x of PAPELES) if (x.nivel === lv && x.precio) l.push('🖼️ Papel ' + x.nombre.toLowerCase());
  for (const x of PISOS) if (x.nivel === lv && x.precio) l.push('🟫 Piso ' + x.nombre.toLowerCase());
  return l;
}

/* ============================================================
   CUIDADOS
   ============================================================ */
function comer(id) {
  if (E.durmiendo) return { ok: false, motivo: 'Está durmiendo 💤' };
  if (!(E.comida[id] > 0)) return { ok: false, motivo: 'No queda' };
  if (E.nec.hambre >= 97) return { ok: false, motivo: '¡Estoy lleno!' };
  const c = COMIDAS.find(x => x.id === id);
  E.comida[id]--; if (!E.comida[id]) delete E.comida[id];
  sumar('hambre', c.llena); sumar('animo', c.animo || 0); sumar('energia', c.energia || 0); sumar('limpieza', -(c.sucio || 0));
  E.stats.comidas++; ganarXp(2); avanzarMision('comer', 1); revisarLogros();
  return { ok: true, c };
}
/* cantidad: 0..1, lo que alcanzó a enjabonar antes de enjuagar */
function banar(cantidad) {
  const antes = E.nec.limpieza;
  sumar('limpieza', 100 * cantidad);
  if (cantidad >= 0.55) {
    E.stats.banos++; ganarXp(6); avanzarMision('banar', 1); sumar('animo', 4); revisarLogros();
    return { completo: true, subio: E.nec.limpieza - antes };
  }
  return { completo: false, subio: E.nec.limpieza - antes };
}
function dormir(si) {
  if (si) {
    if (E.durmiendo) return false;
    E.durmiendo = true; E.dormidoDesde = Date.now(); E.despertoSolo = false;
    return true;
  }
  if (!E.durmiendo) return false;
  E.durmiendo = false;
  if (E.nec.energia < 40) sumar('animo', -5);
  return true;
}
/* Los cariños suben el ánimo hasta 15 veces por hora; después solo ronronea. */
function carino() {
  const h = Math.floor(Date.now() / 3600000);
  if (E.carinosHora.h !== h) E.carinosHora = { h, n: 0 };
  E.stats.carinos++;
  avanzarMision('mimos', 1);
  if (E.carinosHora.n >= 15) { revisarLogros(); return false; }
  E.carinosHora.n++;
  sumar('animo', 3);
  if (E.stats.carinos % 3 === 0) ganarXp(1);
  revisarLogros();
  return true;
}
function usarPocion(id) {
  if (!(E.pociones[id] > 0)) return { ok: false, motivo: 'No te quedan' };
  const p = POCIONES.find(x => x.id === id);
  if (id === 'medicina' && !E.enfermo) return { ok: false, motivo: 'Está sanito, guárdalo para después' };
  E.pociones[id]--; if (!E.pociones[id]) delete E.pociones[id];
  const hasta = m => Date.now() + m * 60000;
  switch (id) {
    case 'medicina': E.enfermo = false; E.ceroDesde = {}; for (const n of NECESIDADES) sumar(n.id, 12); break;
    case 'energia': sumar('energia', 60); break;
    case 'espuma': sumar('limpieza', 100); break;
    case 'risa': sumar('animo', 60); break;
    case 'lonchera': sumar('hambre', 100); break;
    case 'gigante': E.efectos.tamano = { v: 1.3, hasta: hasta(60) }; break;
    case 'mini': E.efectos.tamano = { v: 0.72, hasta: hasta(60) }; break;
    case 'arcoiris': E.efectos.arcoiris = { hasta: hasta(120) }; break;
  }
  ganarXp(2);
  return { ok: true, p };
}

/* ============================================================
   TIENDA, ROPA, DECORACIÓN
   ============================================================ */
function comprar(tipo, id, cantidad = 1) {
  const lista = { comida: COMIDAS, pocion: POCIONES, ropa: ROPA, pelaje: PELAJES, papel: PAPELES, piso: PISOS }[tipo];
  const x = lista && lista.find(y => y.id === id);
  if (!x) return { ok: false, motivo: '¿Qué cosa?' };
  if (nivel() < x.nivel) return { ok: false, motivo: 'Se desbloquea en nivel ' + x.nivel };
  const total = x.precio * cantidad;
  if (tipo === 'ropa' && E.ropa.includes(id)) return { ok: false, motivo: 'Ya lo tienes' };
  if (tipo === 'pelaje' && E.pelajes.includes(id)) return { ok: false, motivo: 'Ya lo tienes' };
  if ((tipo === 'papel' || tipo === 'piso') && E.decorComprada.includes(tipo + ':' + id)) return { ok: false, motivo: 'Ya lo tienes' };
  if (!gastar(total)) return { ok: false, motivo: 'Te faltan ' + (total - E.monedas) + ' monedas' };
  if (tipo === 'comida') E.comida[id] = (E.comida[id] || 0) + cantidad;
  else if (tipo === 'pocion') E.pociones[id] = (E.pociones[id] || 0) + cantidad;
  else if (tipo === 'ropa') E.ropa.push(id);
  else if (tipo === 'pelaje') E.pelajes.push(id);
  else E.decorComprada.push(tipo + ':' + id);
  revisarLogros();
  return { ok: true, x, total };
}
function ponerse(id) {
  const x = ROPA.find(r => r.id === id);
  if (!x || !E.ropa.includes(id)) return false;
  E.puesto[x.slot] = E.puesto[x.slot] === id ? null : id;
  avanzarMision('vestir', 1);
  return true;
}
function cambiarPelaje(id) {
  if (!E.pelajes.includes(id) || E.pelaje === id) return false;
  E.pelaje = id; avanzarMision('vestir', 1);
  return true;
}
function aplicarDecor(pieza, tipo, id) {
  if (!decorTiene(E, tipo, id)) return false;
  E.decor[pieza][tipo] = id;
  return true;
}

/* ============================================================
   MINIJUEGOS
   ============================================================ */
function puedeJugar() {
  if (E.enfermo) return { ok: false, motivo: 'Está enfermito. Dale su jarabe 💊' };
  if (E.durmiendo) return { ok: false, motivo: 'Está durmiendo. Prende la luz para despertarlo' };
  if (E.nec.energia < 8) return { ok: false, motivo: 'Está muy cansado para jugar. Déjalo dormir un rato 💤' };
  return { ok: true };
}
function terminarMinijuego(id, puntos) {
  const mj = MINIJUEGOS.find(x => x.id === id);
  puntos = Math.max(0, Math.round(puntos));
  const monedas = puntos > 0 ? Math.max(1, Math.min(mj.tope, Math.round(puntos * mj.pago))) : 0;
  const xp = 4 + Math.min(16, Math.round(monedas / 3));
  const anterior = E.records[id] || 0;
  const record = puntos > anterior;
  if (record) E.records[id] = puntos;
  ganarMonedas(monedas); ganarXp(xp);
  sumar('energia', -5); sumar('animo', record ? 15 : 10); sumar('limpieza', -3); sumar('hambre', -2);
  E.stats.partidas++;
  avanzarMision('jugar', 1); avanzarMision('monedas', monedas);
  if (record && anterior > 0) avanzarMision('record', 1);
  revisarLogros();
  return { monedas, xp, record, anterior, puntos };
}

/* ============================================================
   MISIONES, REGALO DIARIO, RULETA, LOGROS
   ============================================================ */
function misionesDeHoy() {
  const hoy = hoyClave();
  if (!E.misiones || E.misiones.fecha !== hoy) {
    const rnd = azarCon(semilla(hoy + (quien() || '')));
    const pool = [...MISIONES];
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    E.misiones = {
      fecha: hoy, bonus: false,
      lista: pool.slice(0, 3).map(m => ({ id: m.id, meta: m.metas[Math.floor(rnd() * m.metas.length)], progreso: 0, cobrada: false })),
    };
  }
  return E.misiones;
}
function avanzarMision(id, n) {
  const ms = misionesDeHoy();
  for (const m of ms.lista) if (m.id === id && !m.cobrada) m.progreso = Math.min(m.meta, m.progreso + n);
}
function cobrarMision(i) {
  const ms = misionesDeHoy(), m = ms.lista[i];
  if (!m || m.cobrada || m.progreso < m.meta) return null;
  const def = MISIONES.find(x => x.id === m.id);
  m.cobrada = true;
  ganarMonedas(def.premio); ganarXp(15);
  let bonus = null;
  if (!ms.bonus && ms.lista.every(x => x.cobrada)) {
    ms.bonus = true;
    const c = comidaAlAzar();
    E.comida[c.id] = (E.comida[c.id] || 0) + 2;
    ganarMonedas(60); ganarXp(30);
    bonus = { monedas: 60, comida: c };
  }
  return { monedas: def.premio, bonus };
}
function pendientesMisiones() {
  const ms = misionesDeHoy();
  return ms.lista.filter(m => !m.cobrada && m.progreso >= m.meta).length;
}

function comidaAlAzar() { const l = COMIDAS.filter(c => c.nivel <= nivel()); return l[Math.floor(Math.random() * l.length)]; }
function pocionAlAzar() { const l = POCIONES.filter(c => c.nivel <= nivel()); return l[Math.floor(Math.random() * l.length)]; }

function diarioDisponible() { return E.diario.ultimo !== hoyClave(); }
function cobrarDiario() {
  if (!diarioDisponible()) return null;
  E.diario.racha = E.diario.ultimo === ayerClave() ? E.diario.racha + 1 : 1;
  E.diario.ultimo = hoyClave();
  E.diario.mejorRacha = Math.max(E.diario.mejorRacha || 0, E.diario.racha);
  const dia = (E.diario.racha - 1) % DIARIO.length;
  const pr = DIARIO[dia];
  ganarMonedas(pr.monedas);
  const extra = [];
  if (pr.comida) { E.comida[pr.comida] = (E.comida[pr.comida] || 0) + 1; const c = COMIDAS.find(x => x.id === pr.comida); extra.push(c.emoji + ' ' + c.nombre); }
  if (pr.pocion) { E.pociones[pr.pocion] = (E.pociones[pr.pocion] || 0) + 1; const c = POCIONES.find(x => x.id === pr.pocion); extra.push(c.emoji + ' ' + c.nombre); }
  if (pr.sorpresa) {
    const falta = ROPA.filter(r => !E.ropa.includes(r.id));
    if (falta.length) { const r = falta[Math.floor(Math.random() * falta.length)]; E.ropa.push(r.id); extra.push(r.emoji + ' ' + r.nombre + ' (sorpresa)'); }
    else { ganarMonedas(100); extra.push('🪙 100 monedas extra'); }
  }
  ganarXp(5 + dia * 2);
  revisarLogros();
  return { dia, racha: E.diario.racha, monedas: pr.monedas, extra };
}

function ruletaDisponible() { return E.ruleta.ultimo !== hoyClave(); }
const PESOS_RULETA = [16, 12, 12, 8, 18, 16, 10, 4];
function girarRuleta() {
  if (!ruletaDisponible()) return null;
  E.ruleta.ultimo = hoyClave();
  const total = PESOS_RULETA.reduce((a, b) => a + b, 0);
  let r = Math.random() * total, i = 0;
  while (r >= PESOS_RULETA[i]) { r -= PESOS_RULETA[i]; i++; }
  const s = RULETA[i];
  let txt;
  if (s.tipo === 'monedas') { ganarMonedas(s.n); txt = '+' + s.n + ' monedas'; }
  else if (s.tipo === 'comida') { const c = comidaAlAzar(); E.comida[c.id] = (E.comida[c.id] || 0) + s.n; txt = s.n + ' × ' + c.emoji + ' ' + c.nombre; }
  else { const p = pocionAlAzar(); E.pociones[p.id] = (E.pociones[p.id] || 0) + 1; txt = p.emoji + ' ' + p.nombre; }
  ganarXp(4);
  return { i, txt };
}

function avanceLogro(l) {
  if (l.cond) return l.cond(E) ? 1 : 0;
  return Math.min(1, (l.val(E) || 0) / l.meta);
}
function revisarLogros() {
  if (!E) return;
  for (const l of LOGROS) {
    if (!E.logros[l.id] && avanceLogro(l) >= 1) { E.logros[l.id] = 'listo'; Ev.logro(l); }
  }
}
function cobrarLogro(id) {
  const l = LOGROS.find(x => x.id === id);
  if (!l || E.logros[id] !== 'listo') return null;
  E.logros[id] = Date.now();
  ganarMonedas(l.premio); ganarXp(10);
  return l;
}
const logrosPorCobrar = () => LOGROS.filter(l => E.logros[l.id] === 'listo').length;

/* ============================================================
   REGALOS DE LOS OTROS JUEGOS E IMPORTACIÓN DEL RINCÓN
   ============================================================ */
/* El Observatorio, el Invernadero y la Clínica dejan monedas para Michi
   en `rinconMichiPendiente` (localStorage). Se cobran aquí. */
function cobrarRegalos() {
  let p = null;
  try { p = JSON.parse(localStorage.getItem('rinconMichiPendiente') || 'null'); } catch (e) { p = null; }
  if (!p || !(p.monedas > 0 || p.xp > 0)) return null;
  try { localStorage.removeItem('rinconMichiPendiente'); } catch (e) { /* nada */ }
  const monedas = clamp(Math.round(p.monedas || 0), 0, 5000);
  const xp = clamp(Math.round(p.xp || 0), 0, 2000);
  ganarMonedas(monedas); ganarXp(xp);
  return { monedas, xp, de: p.de || 'los juegos' };
}

/* La primera vez trae lo que Michi ya tenía en el Rincón de juegos:
   su nombre, su ropa y sus monedas (solo se lee, no se toca). */
function importarDelRincon() {
  if (E.importado) return null;
  E.importado = true;
  let d = null;
  try { d = JSON.parse(localStorage.getItem('nuestroRinconCyD_v2') || 'null'); } catch (e) { d = null; }
  const j = d && d.juegos;
  if (!j || typeof j !== 'object') return null;
  const monedas = clamp(Math.round(j.monedas || 0), 0, 3000);
  const prendas = (Array.isArray(j.comprados) ? j.comprados : []).filter(id => ROPA.some(r => r.id === id) && !E.ropa.includes(id));
  E.ropa.push(...prendas);
  const eq = j.mascota && j.mascota.equipado;
  if (eq) for (const s of ['ropa', 'sombrero', 'accesorio']) if (eq[s] && E.ropa.includes(eq[s])) E.puesto[s] = eq[s];
  if (j.mascota && typeof j.mascota.nombre === 'string' && j.mascota.nombre.trim()) E.nombre = j.mascota.nombre.trim().slice(0, 16);
  E.monedas += monedas;
  if (!monedas && !prendas.length) return null;
  return { monedas, prendas: prendas.length };
}

/* ============================================================
   NUBE — rama `datos.michi`, separada por persona
   El API mezcla por clave de primer nivel: escribir aquí no toca
   fotos ni notas. Siempre se relee justo antes de postear.
   ============================================================ */
function progresoDe(x) { return x && x.stats ? (x.xp || 0) + (x.stats.partidas || 0) * 5 : 0; }
const Nube = {
  lista: false, remoto: null, enVuelo: false, ultimoMarcador: 0, ultimoRespaldo: 0, firma: '',
  async leer() {
    const r = await fetch(JUEGO.api + '?claves=' + JUEGO.rama, { cache: 'no-store' });
    if (!r.ok) throw new Error('GET ' + r.status);
    const j = await r.json();
    const o = (j && j.data && j.data[JUEGO.rama] && typeof j.data[JUEGO.rama] === 'object') ? j.data[JUEGO.rama] : {};
    if (!o.marcador || typeof o.marcador !== 'object') o.marcador = {};
    if (!o.respaldo || typeof o.respaldo !== 'object') o.respaldo = {};
    this.remoto = o; this.lista = true;
    return o;
  },
  async escribir(mutar) {
    if (!this.lista) return false;
    await this.leer();
    mutar(this.remoto);
    const r = await fetch(JUEGO.api, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: { [JUEGO.rama]: this.remoto } }),
    });
    if (!r.ok) throw new Error('POST ' + r.status);
    return true;
  },
  marcadorDe() {
    return {
      t: Date.now(), nombre: E.nombre, nivel: nivel(), records: Object.assign({}, E.records),
      pelaje: E.pelaje, ropa: E.puesto.ropa, sombrero: E.puesto.sombrero, accesorio: E.puesto.accesorio,
      partidas: E.stats.partidas,
    };
  },
  async sincronizar(forzar) {
    const q = quien();
    if (!q || !this.lista || this.enVuelo || !E) return;
    const ahora = Date.now();
    const firma = [nivel(), E.stats.partidas, E.stats.comidas, E.monedas, JSON.stringify(E.records)].join('|');
    const tocaM = forzar || ahora - this.ultimoMarcador > JUEGO.marcadorCada;
    const tocaR = (forzar || ahora - this.ultimoRespaldo > JUEGO.respaldoCada) && firma !== this.firma;
    if (!tocaM && !tocaR) return;
    this.enVuelo = true;
    try {
      const m = this.marcadorDe();
      let subirR = false;
      await this.escribir(r => {
        r.marcador[q] = m;
        // se decide con la lectura recién hecha, no con la del arranque: un
        // Michi recién nacido nunca pisa un respaldo con más avance
        const guardado = r.respaldo[q];
        subirR = tocaR && !(progresoDe(E) < 30 && guardado && guardado.save && progresoDe(guardado.save) > progresoDe(E));
        if (subirR) r.respaldo[q] = { t: ahora, v: JUEGO.version, save: E };
      });
      this.ultimoMarcador = ahora;
      if (subirR) { this.ultimoRespaldo = ahora; this.firma = firma; }
    } catch (e) { /* sin conexión: se reintenta en el próximo ciclo */ }
    finally { this.enVuelo = false; }
  },
  respaldoMejor() {
    const q = quien();
    const g = q && this.remoto && this.remoto.respaldo[q];
    if (!g || !g.save || !g.save.nec) return null;
    return progresoDe(g.save) > progresoDe(E) + 20 ? g.save : null;
  },
  otro() {
    const q = quien();
    const o = PERSONAS.find(p => p !== q);
    return o && this.remoto ? Object.assign({ persona: o }, this.remoto.marcador[o] || {}) : null;
  },
};
