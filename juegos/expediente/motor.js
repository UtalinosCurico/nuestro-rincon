/* ============================================================
   MOTOR — arma los casos a partir de un número y lleva la cuenta.
   No toca el DOM: se prueba en Node cargando datos.js, arte.js y
   este archivo.

   Un caso se arma siempre igual a partir de su id:
     h1…h36  la historia (12 por distrito, cada vez más difíciles)
     a1, a2… el archivo: casos que no se acaban
     d2026-11-14  el caso del día (el mismo para los dos)
   Del culpable se saben 4 o 5 rasgos; cada inocente falla al menos
   uno y cada rasgo descarta a alguien, así que hay un solo culpable
   y hace falta reunir todas las pistas para estar seguro.
   ============================================================ */
const CASOS_HISTORIA = 36;
const META_BUSQUEDA = 12;   // objetos que hay que encontrar en cada registro

const conG = (txt, g) => String(txt).replace(/@/g, g === 'f' ? 'a' : 'o');
function rolDe(v, g) { return v.rol === 'yerno o nuera' ? (g === 'f' ? 'nuera' : 'yerno') : conG(v.rol, g); }

function infoCaso(id) {
  const tipo = id[0];
  if (tipo === 'h') { const n = +id.slice(1); return { tipo, n, sem: 7919 * n + 101, amb: AMBIENTES[Math.min(2, Math.floor((n - 1) / 12))], nivel: (n - 1) % 12 }; }
  if (tipo === 'a') { const n = +id.slice(1); return { tipo, n, sem: 104729 * n + 7, amb: AMBIENTES[n % 3], nivel: 6 + (n % 6) }; }
  const s = semillaDe(id);
  return { tipo: 'd', n: 0, sem: s, amb: AMBIENTES[s % 3], nivel: 8 };
}

const CASOS_ARMADOS = {};
function armarCaso(id) {
  if (CASOS_ARMADOS[id]) return CASOS_ARMADOS[id];
  const inf = infoCaso(id), r = azarDe(inf.sem);
  const pick = a => a[Math.floor(r() * a.length)];
  const mezclar = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const nR = inf.nivel < 3 ? 4 : 5, nS = inf.nivel < 2 ? 4 : 5;
  const escenas = mezclar(inf.amb.escenas).slice(0, 3);
  const usados = new Set();
  const persona = g => {
    for (let k = 0; k < 60; k++) { const n = pick(NOMBRES[g]), a = pick(NOMBRES.ap); if (!usados.has(n) && !usados.has(a)) { usados.add(n); usados.add(a); return n + ' ' + a; } }
    return pick(NOMBRES[g]) + ' ' + pick(NOMBRES.ap);
  };

  const [vg, vrol] = pick(inf.amb.victimas);
  const victima = { n: persona(vg), g: vg, rol: vrol, edad: 38 + Math.floor(r() * 40) };
  const arma = pick(ARMAS);
  const culpG = r() < 0.5 ? 'f' : 'm';

  /* los rasgos del culpable: a lo más dos que se vean en la cara, y uno que deje rastro en el arma */
  let claves = Object.keys(RASGOS).filter(k => !(k === 'barba' && culpG === 'f'));
  if (inf.amb.id !== 'costa') claves = claves.filter(k => k !== 'nada');
  let T = [];
  for (let k = 0; k < 80; k++) {
    T = mezclar(claves).slice(0, nR);
    if (T.filter(x => RASGOS[x].ve).length <= 2 && T.some(x => RASGOS[x].traza)) break;
  }
  const rArma = pick(T.filter(x => RASGOS[x].traza));
  const resto = mezclar(T.filter(x => x !== rArma));
  const rAuto = resto[0], rPistas = resto.slice(1);

  const pistas = rPistas.map((t, k) => { const p = pick(PISTAS_DE[t]); return { key: 'p' + k, rasgo: t, obj: p.obj, como: p.como, txt: p.txt, esc: k }; });
  const pArma = { key: 'arma', rasgo: rArma, obj: arma.obj, como: pick(['polvo', 'limpiar', 'micro']), txt: 'Es el arma. ' + RASGOS[rArma].traza, esc: 2, arma: true };

  /* sospechosos */
  const ci = Math.floor(r() * nS);
  const vinc = mezclar(VINCULOS).slice(0, nS), coart = mezclar(COARTADAS);
  const sosp = [];
  for (let i = 0; i < nS; i++) {
    const g = i === ci ? culpG : (r() < 0.5 ? 'f' : 'm');
    sosp.push({ i, n: persona(g), g, edad: 24 + Math.floor(r() * 44), vin: vinc[i], rol: rolDe(vinc[i], g), coartada: coart[i], val: {}, ve: {}, culpable: i === ci });
  }
  const inoc = sosp.filter(s => !s.culpable);
  const orden = mezclar(T.map((_, k) => k));
  inoc.forEach((s, k) => { s.falsos = new Set([orden[k % nR]]); });
  for (let j = inoc.length; j < nR; j++) pick(inoc).falsos.add(orden[j]);
  inoc.forEach(s => { if (r() < 0.35) s.falsos.add(Math.floor(r() * nR)); });
  for (const s of sosp) {
    T.forEach((t, k) => { s.val[t] = s.culpable ? true : !s.falsos.has(k); if (t === 'barba' && s.g === 'f') s.val[t] = false; });
    delete s.falsos;
    for (const t of T) if (RASGOS[t].ve) s.ve[t] = s.val[t];
    if (s.val.canas) s.edad = Math.max(s.edad, 56); else if (T.includes('canas') && s.edad > 52) s.edad = 30 + (s.edad % 20);
    s.d1 = conG(s.vin.d1.replace(/\{v\}/g, victima.n.split(' ')[0]), s.g);
    s.d2 = conG(s.vin.d2.replace(/\{v\}/g, victima.n.split(' ')[0]), s.g);
    s.conf = conG(s.vin.conf, s.g);
  }

  /* los pasos, con lo que necesita cada uno */
  const s = mezclar(sosp.map(x => x.i));
  const tareas = [];
  const t = o => tareas.push(o);
  t({ id: 'L0', tipo: 'buscar', esc: 0, req: [] });
  t({ id: 'auto', tipo: 'autopsia', req: ['L0'] });
  t({ id: 'p0', tipo: 'examen', pista: 'p0', req: ['L0'] });
  t({ id: 'h0', tipo: 'hablar', sosp: s[0], req: ['L0'] });
  t({ id: 'h1', tipo: 'hablar', sosp: s[1], req: ['L0'], guia: 1 });
  t({ id: 'L1', tipo: 'buscar', esc: 1, req: ['h1'] });
  t({ id: 'p1', tipo: 'examen', pista: 'p1', req: ['L1'] });
  t({ id: 'h2', tipo: 'hablar', sosp: s[2], req: ['L1'], guia: 2 });
  t({ id: 'm0', tipo: 'hablar2', sosp: s[0], req: ['p1'] });
  t({ id: 'L2', tipo: 'buscar', esc: 2, req: ['h2', 'm0'] });
  if (pistas.length > 2) t({ id: 'p2', tipo: 'examen', pista: 'p2', req: ['L2'] });
  t({ id: 'arma', tipo: 'examen', pista: 'arma', req: ['L2'] });
  t({ id: 'h3', tipo: 'hablar', sosp: s[3], req: ['L2'] });
  if (nS > 4) t({ id: 'h4', tipo: 'hablar', sosp: s[4], req: ['arma'] });
  t({ id: 'm1', tipo: 'hablar2', sosp: s[3], req: ['arma', 'h3'] });
  t({ id: 'arresto', tipo: 'arresto', req: tareas.map(x => x.id) });

  const lugar0 = ESCENAS[escenas[0]].n.toLowerCase();
  const titulo = pick(TITULOS).replace('{a}', victima.n.split(' ')[0]).replace('{l}', articulo(escenas[0]));
  const caso = {
    id, tipo: inf.tipo, n: inf.n, nivel: inf.nivel, amb: inf.amb.id, titulo, escenas, victima, arma, rasgos: T, rAuto, rArma,
    pistas: pistas.concat([pArma]), sosp, culpable: ci, tareas,
    nota: { hora: 20 + Math.floor(r() * 4), min: pick(['00', '15', '30', '45']), lugar: ESCENAS[escenas[1]].n },
    clave: mezclar([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 4).join(''),
    huella: 1 + Math.floor(r() * 40), muestra: 1 + Math.floor(r() * 500),
  };
  caso.intro = `Encontraron a ${victima.n}, ${victima.rol}, sin vida en ${articulo(escenas[0])}.`;
  return (CASOS_ARMADOS[id] = caso);
}
/* «en la cocina», «en el muelle» */
const ARTICULO = { muelle: 'el muelle', mercado: 'el mercado', establo: 'el establo', taller: 'el galpón', bosque: 'el bosque', cafe: 'el café', teatro: 'el camarín', vinedo: 'el viñedo', plaza: 'la Plaza de Armas', estacion: 'la estación de trenes', bodega: 'la bodega de barricas' };
function articulo(esc) { return ARTICULO[esc] || 'la ' + ESCENAS[esc].n.toLowerCase(); }
function pistaDe(caso, key) { return caso.pistas.find(p => p.key === key); }
function tareaDe(caso, id) { return caso.tareas.find(t => t.id === id); }

/* ============================================================
   EL AVANCE DE UN CASO (lo que se guarda)
   ============================================================ */
function progresoNuevo(caso) {
  return { v: 1, hechas: {}, ex: {}, lab: {}, est: 0, lug: caso.escenas.map(() => ({ p: 0, v: 0 })), err: 0, ini: Date.now(), fin: null, bus: 0 };
}
function normalizarProgreso(caso, g) {
  const p = progresoNuevo(caso);
  if (!g || typeof g !== 'object') return p;
  for (const k of Object.keys(p)) if (k in g) p[k] = g[k];
  for (const k of ['hechas', 'ex', 'lab']) if (!p[k] || typeof p[k] !== 'object') p[k] = {};
  if (!Array.isArray(p.lug) || p.lug.length !== caso.escenas.length) p.lug = caso.escenas.map((_, i) => ({ p: (g.lug && g.lug[i] && g.lug[i].p) || 0, v: (g.lug && g.lug[i] && g.lug[i].v) || 0 }));
  p.est = Number.isFinite(p.est) ? Math.max(0, p.est) : 0;
  return p;
}
const hecha = (p, id) => !!p.hechas[id];
function disponible(caso, p, t) { return !hecha(p, t.id) && t.req.every(id => hecha(p, id)); }
function tareasDisponibles(caso, p) { return caso.tareas.filter(t => disponible(caso, p, t)); }
function lugarAbierto(caso, p, i) { const t = caso.tareas.find(x => x.tipo === 'buscar' && x.esc === i); return !!t && t.req.every(id => hecha(p, id)); }
function costoDe(t) { return { autopsia: COSTO.autopsia, hablar: COSTO.hablar, hablar2: COSTO.hablar2 }[t.tipo] || 0; }

/* Lo que se sabe del culpable. */
function rasgosConocidos(caso, p) {
  const r = [];
  if (hecha(p, 'auto')) r.push(caso.rAuto);
  for (const pi of caso.pistas) if (hecha(p, pi.key === 'arma' ? 'arma' : pi.key)) r.push(pi.rasgo);
  return caso.rasgos.filter(x => r.includes(x));
}
/* Sospechosos que ya aparecieron (su conversación está disponible o hecha). */
function sospechososVistos(caso, p) {
  const vistos = [];
  for (const t of caso.tareas) if (t.tipo === 'hablar' && (hecha(p, t.id) || disponible(caso, p, t))) vistos.push(t.sosp);
  return vistos.map(i => caso.sosp[i]);
}
function hablado(caso, p, i) { const t = caso.tareas.find(x => x.tipo === 'hablar' && x.sosp === i); return !!t && hecha(p, t.id); }
/* Lo que se sabe de un sospechoso para un rasgo: true / false / null (no se sabe). */
function valorVisto(caso, p, s, rasgo) {
  if (RASGOS[rasgo].ve || hablado(caso, p, s.i)) return s.val[rasgo];
  return null;
}
/* Quiénes siguen calzando con lo que se sabe. */
function calzan(caso, p) {
  const known = rasgosConocidos(caso, p);
  return sospechososVistos(caso, p).filter(s => known.every(r => valorVisto(caso, p, s, r) !== false));
}

/* ---------- pagar y avanzar ---------- */
function pagar(p, n) { if (p.est < n) return false; p.est -= n; return true; }
/* Autopsia y laboratorio: se paga, corre el reloj y después se ve el resultado. */
function mandarAlLab(caso, p, key, ahora) {
  const esAuto = key === 'auto';
  if (esAuto ? p.lab.auto != null || hecha(p, 'auto') : p.ex[key] !== 'examinada') return { ok: false };
  if (!pagar(p, esAuto ? COSTO.autopsia : COSTO.lab)) return { ok: false, motivo: 'estrellas' };
  p.lab[key] = (ahora || Date.now()) + (esAuto ? ESPERA.autopsia : ESPERA.lab) * 1000;
  if (!esAuto) p.ex[key] = 'lab';
  return { ok: true };
}
function labListo(p, key, ahora) { return p.lab[key] != null && (ahora || Date.now()) >= p.lab[key]; }
function apurar(p, key, ahora) {
  if (p.lab[key] == null || labListo(p, key, ahora)) return { ok: false };
  if (!pagar(p, COSTO.apurar)) return { ok: false, motivo: 'estrellas' };
  p.lab[key] = ahora || Date.now();
  return { ok: true };
}
/* Ver el resultado: cierra la tarea y entrega el rasgo. */
function verResultado(caso, p, key, ahora) {
  if (!labListo(p, key, ahora)) return { ok: false };
  delete p.lab[key];
  p.hechas[key] = 1;
  if (key !== 'auto') p.ex[key] = 'listo';
  const rasgo = key === 'auto' ? caso.rAuto : pistaDe(caso, key).rasgo;
  return { ok: true, rasgo };
}
function examinar(caso, p, key) {
  const t = tareaDe(caso, key);
  if (!t || !disponible(caso, p, t) || p.ex[key]) return { ok: false };
  p.ex[key] = 'examinada';
  return { ok: true };
}
function conversar(caso, p, id) {
  const t = tareaDe(caso, id);
  if (!t || !disponible(caso, p, t) || (t.tipo !== 'hablar' && t.tipo !== 'hablar2')) return { ok: false };
  if (!pagar(p, costoDe(t))) return { ok: false, motivo: 'estrellas' };
  p.hechas[id] = 1;
  return { ok: true, sosp: caso.sosp[t.sosp], segunda: t.tipo === 'hablar2', guia: t.guia };
}
function puedeArrestar(caso, p) { return disponible(caso, p, tareaDe(caso, 'arresto')); }
function arrestar(caso, p, i) {
  if (!puedeArrestar(caso, p)) return { ok: false };
  if (i !== caso.culpable) { p.err++; return { ok: true, acierto: false }; }
  p.hechas.arresto = 1; p.fin = Date.now();
  return { ok: true, acierto: true, puntos: puntosCaso(caso, p) };
}
function puntosCaso(caso, p) {
  const base = caso.tipo === 'h' ? 100 + caso.nivel * 10 : 140;
  return Math.max(40, base - p.err * 30 + Math.min(60, p.lug.reduce((a, l) => a + nivelLugar(l.p), 0) * 4));
}
/* monedas para Michi al cerrar un caso */
function monedasCaso(caso, p) { return Math.max(8, Math.min(30, 12 + caso.nivel + (p.err ? 0 : 6))); }

/* ============================================================
   REGISTRAR UN LUGAR
   ============================================================ */
function nivelLugar(puntos) { let n = 0; for (const u of ESTRELLAS) if (puntos >= u) n++; return n; }
/* 1 estrella siempre; 2 con un registro bueno; 3 con uno muy rápido y con rachas. */
function estrellasPorPuntos(puntos) { return 1 + (puntos >= 2200 ? 1 : 0) + (puntos >= 4000 ? 1 : 0); }
function modoBusqueda(veces) { return veces >= 2 && veces % 2 === 1 ? 'sombras' : 'palabras'; }

/* Reparte los objetos en el lugar. Siempre igual para una misma semilla. */
function colocarObjetos(escId, semilla, cuantos, obligados) {
  const esc = escenaArmada(escId), r = azarDe(semilla);
  const pick = a => a[Math.floor(r() * a.length)];
  const mezclar = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const delLugar = OBJETOS.filter(o => o.t.some(x => esc.amb.includes(x)));
  const otros = OBJETOS.filter(o => !o.t.some(x => esc.amb.includes(x)));
  const elegidos = [], vistos = new Set();
  for (const id of obligados || []) if (OBJETO[id] && !vistos.has(id)) { vistos.add(id); elegidos.push(OBJETO[id]); }
  for (const o of mezclar(delLugar).concat(mezclar(otros))) {
    if (elegidos.length >= cuantos + 10) break;
    if (vistos.has(o.id)) continue;
    if (elegidos.length - (obligados || []).length > cuantos * 0.72 && delLugar.includes(o) && r() < 0.5) continue;
    vistos.add(o.id); elegidos.push(o);
  }
  /* peso de cada zona según cuánto cabe */
  const zonas = esc.zonas.map(z => ({ z, peso: z.area ? (z.x2 - z.x1) * (z.y2 - z.y1) / 2400 : (z.x2 - z.x1) / 26 }));
  const total = zonas.reduce((a, b) => a + b.peso, 0);
  const cajas = [], puestos = [];
  for (const o of elegidos) {
    if (puestos.length >= cuantos) break;
    for (let intento = 0; intento < 40; intento++) {
      let k = r() * total, zz = zonas[0];
      for (const x of zonas) { k -= x.peso; if (k <= 0) { zz = x; break; } }
      const z = zz.z;
      let t, x, y;
      if (z.area) { y = z.y1 + r() * (z.y2 - z.y1); t = z.t1 + (z.t2 - z.t1) * (y - z.y1) / Math.max(1, z.y2 - z.y1); x = z.x1 + r() * Math.max(1, z.x2 - z.x1 - t); }
      else { t = z.t; y = z.y; if (z.x2 - z.x1 < t) continue; x = z.x1 + r() * (z.x2 - z.x1 - t); }
      t = Math.round(t * (0.88 + r() * 0.24));
      const c = [x + t * 0.12, y - t * 0.92, x + t * 0.88, y];
      const choca = cajas.some(b => { const w = Math.min(c[2], b[2]) - Math.max(c[0], b[0]), h = Math.min(c[3], b[3]) - Math.max(c[1], b[1]); return w > 0 && h > 0 && w * h > 0.18 * (c[2] - c[0]) * (c[3] - c[1]); });
      if (choca) continue;
      cajas.push(c);
      puestos.push({ id: o.id, x: Math.round(x), y: Math.round(y), t, rot: r() < 0.3 ? Math.round((r() - 0.5) * 50) : 0, flip: r() < 0.25 });
      break;
    }
  }
  /* la lista de lo que se pide: primero los obligados, después en orden al azar */
  const orden = (obligados || []).filter(id => puestos.some(p => p.id === id)).concat(mezclar(puestos.map(p => p.id).filter(id => !(obligados || []).includes(id))));
  return { objetos: puestos, orden };
}
function nuevaBusqueda(caso, p, i) {
  const lug = p.lug[i], semilla = semillaDe(caso.id + '|' + i + '|' + lug.v);
  const obligados = lug.v === 0 ? caso.pistas.filter(x => x.esc === i).map(x => x.obj) : [];
  const { objetos, orden } = colocarObjetos(caso.escenas[i], semilla, BUSCA.objetos, obligados);
  return { esc: caso.escenas[i], i, objetos, orden, modo: modoBusqueda(lug.v), tiempo: BUSCA.tiempo, meta: META_BUSQUEDA, primera: lug.v === 0 };
}
/* Puntaje de un acierto: base × multiplicador por racha. */
function puntosAcierto(combo, modo) {
  return Math.round(BUSCA.base * (1 + BUSCA.comboPaso * Math.min(combo, BUSCA.comboMax)) * (modo === 'sombras' ? BUSCA.sombras : 1));
}
function cerrarBusqueda(caso, p, i, b) {
  const bono = b.encontrados >= b.meta ? Math.round(Math.max(0, b.restante) * BUSCA.bonoSeg) + (b.errores ? 0 : BUSCA.bonoLimpio) : 0;
  const puntos = Math.max(0, Math.round(b.puntos + bono));
  const lug = p.lug[i], nivelAntes = nivelLugar(lug.p);
  lug.p += puntos; lug.v++;
  const gana = b.encontrados >= Math.ceil(b.meta / 2) ? estrellasPorPuntos(puntos) : 1;
  p.est += gana; p.bus = (p.bus || 0) + 1;
  const id = 'L' + i, primera = !hecha(p, id);
  if (primera) p.hechas[id] = 1;
  return { puntos, bono, gana, nivel: nivelLugar(lug.p), subio: nivelLugar(lug.p) > nivelAntes, primera };
}

/* ============================================================
   PERFIL — cuántos casos, rango
   ============================================================ */
function rangoDe(xp, g) { let r = RANGOS[0]; for (const x of RANGOS) if (xp >= x[0]) r = x; return { n: g === 'f' ? r[2] : r[1], desde: r[0], hasta: (RANGOS[RANGOS.indexOf(r) + 1] || [null])[0] }; }
function casoAbierto(perfil, id) {
  if (id[0] !== 'h') return true;
  const n = +id.slice(1);
  return n === 1 || !!(perfil.casos['h' + (n - 1)] && perfil.casos['h' + (n - 1)].fin);
}
function resueltos(perfil) { return Object.values(perfil.casos || {}).filter(c => c && c.fin).length; }

if (typeof module !== 'undefined') module.exports = {};
