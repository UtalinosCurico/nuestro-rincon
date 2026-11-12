/* ============================================================
   INTERFAZ — menú, HUD, controles táctiles, perfil y nube
   Cada persona tiene su perfil en el localStorage de su aparato
   (`pesadillasRincon_v1__<Persona>`, más `_copia`) y su partida a
   medias (`pesadillasPartida_v1__<Persona>`). A Neon sube solo la
   rama `datos.pesadillas`: marcador, sueño del día y respaldo.
   ============================================================ */
const $ = s => document.querySelector(s);
const PERSONAS = ['Catalina', 'Diego'];
const TACTIL = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
const UI = {
  pantalla: 'menu', canvas: null, ctx: null, mapa: null, mapaCtx: null,
  sticks: { mover: null, apuntar: null }, raton: null, teclas: new Set(), radioStick: 56,
  hudSucio: true, mapaSucio: true, bannerT: null, bannerT2: null, ultimoFin: null,
};
let PERFIL = null;

/* ---------- utilidades ---------- */
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
function quien() { try { return localStorage.getItem('rinconQuien') || null; } catch (e) { return null; } }
const claveDe = (base, p) => base + '__' + (p || 'invitado');
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtTiempo = s => { s = Math.max(0, Math.round(s || 0)); const m = Math.floor(s / 60); return m + ':' + String(s % 60).padStart(2, '0'); };
const pick = a => a[Math.floor(Math.random() * a.length)];
const objeto = v => (v && typeof v === 'object' && !Array.isArray(v)) ? v : {};
const nombreMichi = () => (Arte.apariencia && Arte.apariencia.nombre) || 'Michi';
const conNombre = txt => String(txt).replace(/Michi/g, nombreMichi());
/* «El Rey Ratón» → «al Rey Ratón», «La Tina» → «a la Tina» */
const aQuien = n => n.startsWith('El ') ? 'al ' + n.slice(3) : n.startsWith('La ') ? 'a la ' + n.slice(3) : 'a ' + n;

/* ============================================================
   PERFIL
   ============================================================ */
function perfilNuevo(p) { return normalizarPerfil({ duenio: p || null, creado: Date.now() }); }
function normalizarPerfil(d) {
  d = objeto(d);
  const num = v => (Number.isFinite(v) ? v : 0);
  const out = {
    v: 1, duenio: d.duenio || null, creado: d.creado || Date.now(), t: d.t || Date.now(),
    partidas: num(d.partidas), victorias: num(d.victorias), victoriasTranquilo: num(d.victoriasTranquilo), victoriasPesadilla: num(d.victoriasPesadilla),
    mejorPiso: num(d.mejorPiso), mejorPuntaje: num(d.mejorPuntaje), mejorTiempo: Number.isFinite(d.mejorTiempo) ? d.mejorTiempo : null,
    enemigos: num(d.enemigos), rocas: num(d.rocas), cofres: num(d.cofres), compras: num(d.compras), secretas: num(d.secretas), sinDano: num(d.sinDano),
    rapido: !!d.rapido, diarioIniciado: typeof d.diarioIniciado === 'string' ? d.diarioIniciado : null,
    jefes: objeto(d.jefes), coleccion: objeto(d.coleccion), logros: objeto(d.logros), diario: objeto(d.diario),
    ajustes: Object.assign({ apuntado: TACTIL ? 'asistido' : 'manual', musica: true, vibrar: true, modo: 'normal' }, objeto(d.ajustes)),
    vistos: num(d.vistos),
  };
  if (!['manual', 'asistido', 'auto'].includes(out.ajustes.apuntado)) out.ajustes.apuntado = 'asistido';
  if (!['normal', 'tranquilo'].includes(out.ajustes.modo)) out.ajustes.modo = 'normal';
  for (const k of Object.keys(out.coleccion)) if (!ITEM[k]) delete out.coleccion[k];
  for (const k of Object.keys(out.logros)) if (!LOGROS.some(l => l.id === k)) delete out.logros[k];
  return out;
}
function leerPerfil(p) {
  const k = claveDe(JUEGO.clave, p);
  for (const clave of [k, k + '_copia']) {
    try { const b = localStorage.getItem(clave); if (b) { const d = JSON.parse(b); if (d && typeof d === 'object') return normalizarPerfil(d); } } catch (e) { /* sigue con la copia */ }
  }
  return null;
}
function guardarPerfil() {
  if (!PERFIL) return;
  PERFIL.t = Date.now();
  const q = quien(), k = claveDe(JUEGO.clave, q);
  try {
    const viejo = localStorage.getItem(k);
    if (viejo) localStorage.setItem(k + '_copia', viejo);
    localStorage.setItem(k, JSON.stringify(PERFIL));
    localStorage.setItem(claveDe(JUEGO.resumen, q), JSON.stringify({
      t: Date.now(), partidas: PERFIL.partidas, victorias: PERFIL.victorias, mejorPiso: PERFIL.mejorPiso, mejorPuntaje: PERFIL.mejorPuntaje,
      coleccion: Object.keys(PERFIL.coleccion).length, total: ITEMS.length, enCurso: !!localStorage.getItem(claveDe(JUEGO.partida, q)),
    }));
  } catch (e) { /* almacenamiento lleno o bloqueado */ }
}
const itemsDesbloqueados = () => ITEMS.filter(it => !it.b || PERFIL.logros[it.b]).map(it => it.id);
const progresoDe = pf => pf ? pf.partidas + pf.victorias * 5 + Object.keys(pf.logros || {}).length * 2 + Object.keys(pf.coleccion || {}).length : 0;
function leerApariencia(q) {
  try {
    const r = JSON.parse(localStorage.getItem('michiResumen__' + (q || 'invitado')) || 'null');
    if (r) return { pelaje: r.pelaje || 'crema', ropa: r.ropa || null, sombrero: r.sombrero || null, accesorio: r.accesorio || null, nombre: r.nombre || 'Michi' };
  } catch (e) { /* por defecto */ }
  return { pelaje: 'crema', ropa: null, sombrero: null, accesorio: null, nombre: 'Michi' };
}

/* ---------- la partida a medias ---------- */
function leerSueno() {
  try {
    const b = localStorage.getItem(claveDe(JUEGO.partida, quien()));
    if (!b) return null;
    const d = JSON.parse(b);
    if (!d || d.v !== 1 || !d.mapa || !d.J || !PISOS[d.pisoIdx]) return null;
    d.J.items = (d.J.items || []).filter(id => ITEM[id]);
    if (d.J.activo && !ITEM[d.J.activo.id]) d.J.activo = null;
    return d;
  } catch (e) { return null; }
}
function guardarSueno() {
  const g = partidaParaGuardar();
  if (g) { try { localStorage.setItem(claveDe(JUEGO.partida, quien()), JSON.stringify(g)); } catch (e) { /* nada */ } }
  guardarPerfil();
}
function borrarSueno() { try { localStorage.removeItem(claveDe(JUEGO.partida, quien())); } catch (e) { /* nada */ } }

/* ============================================================
   LOGROS
   ============================================================ */
function avanceLogro(id, pf) {
  const nCol = Object.keys(pf.coleccion).length;
  switch (id) {
    case 'primerSueno': return [pf.partidas, 1];
    case 'reyRaton': case 'tina': case 'aspiradora': case 'perro': case 'gatoSombra': return [pf.jefes[id] || 0, 1];
    case 'sinDano': return [pf.sinDano, 1];
    case 'comprador': return [pf.compras, 10];
    case 'secretas': return [pf.secretas, 5];
    case 'coleccion10': return [nCol, 10];
    case 'coleccion25': return [nCol, 25];
    case 'cien': return [pf.enemigos, 100];
    case 'quinientos': return [pf.enemigos, 500];
    case 'diario': return [Object.keys(pf.diario).length, 1];
    case 'rapido': return [pf.rapido ? 1 : 0, 1];
    case 'petardos': return [pf.rocas, 30];
    case 'cofres': return [pf.cofres, 20];
    case 'tresVictorias': return [pf.victorias, 3];
    case 'tranquila': return [pf.victoriasTranquilo, 1];
    case 'pesadilla': return [pf.victoriasPesadilla, 1];
  }
  return [0, 1];
}
function revisarLogros() {
  if (!PERFIL) return;
  for (const l of LOGROS) {
    if (PERFIL.logros[l.id]) continue;
    const [a, b] = avanceLogro(l.id, PERFIL);
    if (a < b) continue;
    PERFIL.logros[l.id] = Date.now();
    const premio = l.premio && ITEM[l.premio];
    aviso('🏆', 'Logro: ' + l.n + (premio ? ' · se desbloqueó ' + premio.e + ' ' + premio.n : ''), 'oro');
    Sonido.play('magia');
  }
}
function contar(k, v) {
  if (!PERFIL) return;
  switch (k) {
    case 'enemigos': PERFIL.enemigos += v; break;
    case 'jefe': PERFIL.jefes[v] = (PERFIL.jefes[v] || 0) + 1; if (v === 'reyRaton' && P && P.t < 240) PERFIL.rapido = true; break;
    case 'item': PERFIL.coleccion[v] = (PERFIL.coleccion[v] || 0) + 1; break;
    case 'compras': PERFIL.compras += v; break;
    case 'rocas': PERFIL.rocas += v; break;
    case 'cofres': PERFIL.cofres += v; break;
    case 'secretas': PERFIL.secretas += v; break;
    case 'sinDano': PERFIL.sinDano += v; break;
  }
  revisarLogros();
}

/* Las monedas que gana Michi soñando le llegan a su casita. */
function regalarAMichi(monedas, xp) {
  if (!(monedas > 0 || xp > 0)) return;
  try {
    const p = JSON.parse(localStorage.getItem('rinconMichiPendiente') || 'null') || { monedas: 0, xp: 0 };
    p.monedas = (p.monedas || 0) + (monedas || 0);
    p.xp = (p.xp || 0) + (xp || 0);
    p.de = 'Pesadillas de Michi';
    localStorage.setItem('rinconMichiPendiente', JSON.stringify(p));
  } catch (e) { /* nada */ }
}

/* ============================================================
   NUBE — rama `datos.pesadillas`, separada por persona
   ============================================================ */
const Nube = {
  lista: false, remoto: null, enVuelo: false,
  async leer() {
    const r = await fetch(JUEGO.api + '?claves=' + JUEGO.rama, { cache: 'no-store' });
    if (!r.ok) throw new Error('GET ' + r.status);
    const j = await r.json();
    const o = objeto(j && j.data && j.data[JUEGO.rama]);
    o.marcador = objeto(o.marcador); o.diario = objeto(o.diario); o.respaldo = objeto(o.respaldo);
    this.remoto = o; this.lista = true;
    return o;
  },
  /* Relee justo antes de postear: así no se pisa lo que subió el otro aparato. */
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
      t: Date.now(), partidas: PERFIL.partidas, victorias: PERFIL.victorias, mejorPiso: PERFIL.mejorPiso, mejorPuntaje: PERFIL.mejorPuntaje,
      coleccion: Object.keys(PERFIL.coleccion).length, logros: Object.keys(PERFIL.logros).length, mejorTiempo: PERFIL.mejorTiempo,
    };
  },
  async subir(r) {
    const q = quien();
    if (!q || !PERFIL || this.enVuelo) return;
    this.enVuelo = true;
    try {
      await this.escribir(R => {
        R.marcador[q] = this.marcadorDe();
        if (r && r.modo === 'diario' && !r.practica && r.fecha) {
          const d = R.diario[r.fecha] = objeto(R.diario[r.fecha]);
          if (!d[q]) d[q] = { puntos: r.puntaje, piso: r.piso + 1, gano: r.gano, t: Date.now() };
          const fechas = Object.keys(R.diario).sort();
          while (fechas.length > 21) delete R.diario[fechas.shift()];
        }
        /* un perfil recién estrenado nunca pisa un respaldo con más avance */
        const g = R.respaldo[q];
        if (!(progresoDe(PERFIL) < 6 && g && g.save && progresoDe(g.save) > progresoDe(PERFIL))) R.respaldo[q] = { t: Date.now(), v: 1, save: PERFIL };
      });
    } catch (e) { /* sin conexión: se sube la próxima vez */ }
    finally { this.enVuelo = false; }
  },
  respaldoMejor() {
    const q = quien();
    const g = q && this.remoto && this.remoto.respaldo[q];
    if (!g || !g.save) return null;
    return progresoDe(g.save) > progresoDe(PERFIL) + 8 ? g.save : null;
  },
  otro() { const q = quien(); return PERSONAS.find(p => p !== q) || null; },
  diarioDe(fecha, persona) { const d = this.remoto && this.remoto.diario[fecha]; return d && d[persona] ? d[persona] : null; },
};

/* ============================================================
   PANTALLA Y CONTROLES
   ============================================================ */
function disponer() {
  const W = innerWidth, H = innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const c = UI.canvas;
  c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
  Arte.dpr = dpr;
  const hud = $('#hud');
  const altoHud = hud.hidden ? 74 : hud.getBoundingClientRect().bottom;
  const top = Math.max(altoHud, 56) + 6;
  const vertical = H >= W;
  const area = vertical
    ? { x: 0, y: top, w: W, h: Math.min(W - 4, (H - top) * .64) }
    : { x: 0, y: top, w: W, h: H - top - 8 };
  Arte.disponer(W, H, area);
  UI.radioStick = Math.max(44, Math.min(68, Math.min(W, H) * .14));
  const m = UI.mapa, r = m.getBoundingClientRect();
  m.width = Math.max(1, Math.round(r.width * dpr)); m.height = Math.max(1, Math.round(r.height * dpr));
  UI.mapaSucio = true;
  document.documentElement.style.setProperty('--banner-top', Math.round(Arte.oy + Arte.T * 1.6) + 'px');
  $('#avisos').style.top = Math.round(Arte.oy + 8) + 'px';
  Arte.preparar().then(() => { Arte.fondoListo = false; });
}
function conectarControles() {
  const c = UI.canvas;
  c.addEventListener('pointerdown', e => {
    if (UI.pantalla !== 'juego' || !M || M.pausa || M.fin) return;
    Sonido.listo();
    if (e.pointerType === 'mouse') { UI.raton = { x: e.clientX, y: e.clientY }; return; }
    const lado = e.clientX < innerWidth / 2 ? 'mover' : 'apuntar';
    if (UI.sticks[lado]) return;
    UI.sticks[lado] = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY };
    try { c.setPointerCapture(e.pointerId); } catch (err) { /* nada */ }
    e.preventDefault();
  });
  c.addEventListener('pointermove', e => {
    if (e.pointerType === 'mouse') { if (UI.raton) { UI.raton.x = e.clientX; UI.raton.y = e.clientY; } return; }
    for (const k of ['mover', 'apuntar']) {
      const s = UI.sticks[k];
      if (!s || s.id !== e.pointerId) continue;
      s.x = e.clientX; s.y = e.clientY;
      const dx = s.x - s.x0, dy = s.y - s.y0, d = Math.hypot(dx, dy), R = UI.radioStick;
      if (d > R) { s.x0 = s.x - dx / d * R; s.y0 = s.y - dy / d * R; }
    }
  });
  const soltarDedo = e => {
    if (e.pointerType === 'mouse') { UI.raton = null; return; }
    for (const k of ['mover', 'apuntar']) if (UI.sticks[k] && UI.sticks[k].id === e.pointerId) UI.sticks[k] = null;
  };
  c.addEventListener('pointerup', soltarDedo);
  c.addEventListener('pointercancel', soltarDedo);
  c.addEventListener('lostpointercapture', soltarDedo);
  c.addEventListener('contextmenu', e => e.preventDefault());
  addEventListener('keydown', e => {
    if (UI.pantalla !== 'juego' || !M) return;
    if (e.code === 'Escape' || e.code === 'KeyP') { pausar(!M.pausa); e.preventDefault(); return; }
    if (M.pausa || e.repeat) { if (!M.pausa) UI.teclas.add(e.code); return; }
    if (e.code === 'Space' || e.code === 'KeyE') { M.entrada.activo = true; e.preventDefault(); return; }
    if (e.code === 'KeyQ' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') { M.entrada.petardo = true; return; }
    UI.teclas.add(e.code);
    if (e.code.startsWith('Arrow')) e.preventDefault();
  });
  addEventListener('keyup', e => UI.teclas.delete(e.code));
  addEventListener('blur', () => { UI.teclas.clear(); UI.sticks.mover = null; UI.sticks.apuntar = null; UI.raton = null; });
  const accion = (sel, f) => $(sel).addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); if (UI.pantalla === 'juego' && M && !M.pausa && !M.fin) f(); });
  accion('#btnActivo', () => { M.entrada.activo = true; });
  accion('#btnPetardo', () => { M.entrada.petardo = true; });
  $('#btnPausa').onclick = () => { if (UI.pantalla === 'juego') pausar(true); };
}
function vectorStick(s) {
  const dx = s.x - s.x0, dy = s.y - s.y0, d = Math.hypot(dx, dy), R = UI.radioStick;
  if (d < R * .12) return [0, 0];
  const k = Math.min(1, d / R) / d;
  return [dx * k, dy * k];
}
function aplicarEntrada() {
  const en = M.entrada, t = UI.teclas;
  let mx = 0, my = 0, ax = 0, ay = 0;
  if (t.has('KeyA')) mx -= 1; if (t.has('KeyD')) mx += 1; if (t.has('KeyW')) my -= 1; if (t.has('KeyS')) my += 1;
  if (t.has('ArrowLeft')) ax -= 1; if (t.has('ArrowRight')) ax += 1; if (t.has('ArrowUp')) ay -= 1; if (t.has('ArrowDown')) ay += 1;
  if (UI.sticks.mover) [mx, my] = vectorStick(UI.sticks.mover);
  if (UI.sticks.apuntar) [ax, ay] = vectorStick(UI.sticks.apuntar);
  if (UI.raton) {
    const dx = UI.raton.x - Arte.wx(P.J.x), dy = UI.raton.y - Arte.wy(P.J.y - .2), d = Math.hypot(dx, dy) || 1;
    ax = dx / d; ay = dy / d;
  }
  en.mx = mx; en.my = my; en.ax = ax; en.ay = ay;
}
function dibujarSticks(ctx) {
  const dpr = Arte.dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  for (const k of ['mover', 'apuntar']) {
    const s = UI.sticks[k]; if (!s) continue;
    const R = UI.radioStick, [vx, vy] = vectorStick(s);
    ctx.fillStyle = 'rgba(255,255,255,.1)'; ctx.beginPath(); ctx.arc(s.x0, s.y0, R, 0, 7); ctx.fill();
    ctx.strokeStyle = k === 'apuntar' ? 'rgba(239,123,160,.5)' : 'rgba(255,255,255,.28)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = k === 'apuntar' ? 'rgba(239,123,160,.55)' : 'rgba(255,255,255,.4)';
    ctx.beginPath(); ctx.arc(s.x0 + vx * R, s.y0 + vy * R, R * .42, 0, 7); ctx.fill();
  }
}

/* ============================================================
   EL BUCLE
   ============================================================ */
let ultimoTs = 0, acumulado = 0;
function bucle(ts) {
  requestAnimationFrame(bucle);
  const dt = Math.min(.1, Math.max(0, (ts - ultimoTs) / 1000)); ultimoTs = ts;
  if (UI.pantalla === 'menu' || !P || !M) return;
  if (UI.pantalla === 'juego' && !M.pausa && !M.fin) {
    aplicarEntrada();
    acumulado += dt;
    let n = 0;
    while (acumulado >= 1 / 60 && n < 6) { paso(1 / 60); acumulado -= 1 / 60; n++; }
    if (n >= 6) acumulado = 0;
  }
  Arte.dibujar(UI.ctx, UI.canvas);
  if (UI.pantalla === 'juego') dibujarSticks(UI.ctx);
  if (UI.hudSucio) pintarHud();
  if (UI.mapaSucio) { UI.mapaSucio = false; const r = UI.mapa.getBoundingClientRect(); Arte.mapa(UI.mapaCtx, r.width, r.height, Arte.dpr); }
}

/* ============================================================
   GANCHOS DEL MOTOR
   ============================================================ */
function conectarGanchos() {
  Ev.sonido = n => Sonido.play(n);
  Ev.aviso = (emo, txt) => aviso(emo, txt);
  Ev.banner = (t, sub) => banner(`<div class="b-tit">${esc(t)}</div><div class="b-sub">${esc(sub || '')}</div>`, '', 2400);
  Ev.item = it => banner(`<div class="b-cinta"><div class="b-emo">${it.e}</div><div class="b-tit">${esc(it.n)}</div><div class="b-sub">${esc(it.d)}</div></div>`, 'item', 2600);
  Ev.piso = (def, i) => { banner(`<div class="b-tit">Piso ${i + 1} · ${esc(def.nombre)}</div><div class="b-sub">${esc(def.sub)}</div>`, 'piso', 2600); Musica.cambiar(i, false); UI.mapaSucio = true; };
  Ev.jefe = (tipo, e) => {
    if (tipo === 'aparece') { banner(`<div class="b-cinta"><div class="b-tit">${esc(e.d.n)}</div><div class="b-sub">${esc(e.d.sub)}</div></div>`, 'jefe', 2300); Sonido.play('jefe'); Musica.cambiar(P.pisoIdx, true); }
    else if (tipo === 'vencido') { Musica.cambiar(P.pisoIdx, false); aviso('✨', '¡Le ganaste ' + aQuien(e.d.n) + '!', 'oro'); }
  };
  Ev.fin = r => finPartida(r);
  Ev.temblor = f => Arte.temblor(f);
  Ev.vibrar = ms => vibrar(ms);
  Ev.sala = () => { UI.mapaSucio = true; };
  Ev.hud = () => { UI.hudSucio = true; };
  Ev.contar = (k, v) => contar(k, v);
  Ev.guardar = () => guardarSueno();
  Ev.fondo = () => Arte.hacerFondo();
  Ev.antesDeCambiar = () => Arte.sacarFoto(UI.canvas);
  Ev.texto = (x, y, txt) => M.efectos.push({ tipo: 'texto', x, y, txt, t: .9, max: .9 });
}

/* ============================================================
   HUD, CARTELES Y AVISOS
   ============================================================ */
const COR_D = 'M50 88 C20 66 4 50 10 30 C16 12 38 10 50 28 C62 10 84 12 90 30 C96 50 80 66 50 88 Z';
const COR_MEDIO_D = 'M50 88 C20 66 4 50 10 30 C16 12 38 10 50 28 Z';
const corazonSvg = (relleno, medio) => `<svg viewBox="0 0 100 92">${medio ? `<path d="${COR_D}" fill="rgba(0,0,0,.35)"/><path d="${COR_MEDIO_D}" fill="${relleno}"/>` : `<path d="${COR_D}" fill="${relleno}"/>`}<path d="${COR_D}" fill="none" stroke="#3d2f3a" stroke-width="7"/></svg>`;
function pintarHud() {
  UI.hudSucio = false;
  if (!P) return;
  const J = P.J;
  let h = '';
  for (let i = 0; i < J.maxRojos; i += 2) h += J.rojos >= i + 2 ? corazonSvg('#ef4f6c') : J.rojos === i + 1 ? corazonSvg('#ef4f6c', true) : corazonSvg('rgba(0,0,0,.35)');
  for (let i = 0; i < J.sueno; i += 2) h += J.sueno >= i + 2 ? corazonSvg('#9d8cf0') : corazonSvg('#9d8cf0', true);
  $('#corazones').innerHTML = h;
  $('#nMonedas').textContent = J.monedas; $('#nLlaves').textContent = J.llaves; $('#nPetardos').textContent = J.petardos;
  const b = $('#btnActivo'), arco = $('#arcoCarga'), C = 2 * Math.PI * 28;
  arco.style.strokeDasharray = C.toFixed(1);
  if (J.activo && ITEM[J.activo.id]) {
    const it = ITEM[J.activo.id], k = Math.min(1, J.activo.carga / it.ef.cargaMax);
    $('#emoActivo').textContent = it.e;
    arco.style.strokeDashoffset = (C * (1 - k)).toFixed(1);
    b.classList.toggle('listo', k >= 1); b.classList.remove('vacio');
  } else {
    $('#emoActivo').textContent = '';
    arco.style.strokeDashoffset = C.toFixed(1);
    b.classList.remove('listo'); b.classList.add('vacio');
  }
  $('#btnPetardo').style.opacity = J.petardos > 0 ? 1 : .35;
}
function banner(html, clase, dur) {
  const b = $('#banner');
  clearTimeout(UI.bannerT); clearTimeout(UI.bannerT2);
  b.className = 'banner ' + (clase || '');
  b.innerHTML = html; b.hidden = false;
  UI.bannerT = setTimeout(() => { b.classList.add('sale'); UI.bannerT2 = setTimeout(() => { b.hidden = true; }, 450); }, dur || 2200);
}
function aviso(emo, txt, clase) {
  const c = $('#avisos'), d = document.createElement('div');
  d.className = 'aviso ' + (clase || '');
  d.innerHTML = `<i>${emo}</i><span>${esc(txt)}</span>`;
  c.appendChild(d);
  while (c.children.length > 3) c.firstChild.remove();
  setTimeout(() => { d.classList.add('sale'); setTimeout(() => d.remove(), 360); }, 2600);
}

/* ============================================================
   EMPEZAR, SEGUIR, PAUSAR, TERMINAR
   ============================================================ */
function empezar(modo, practica) {
  const ok = () => {
    borrarSueno();
    nuevaPartida(modo, itemsDesbloqueados(), hoyClave());
    if (modo === 'diario') { P.practica = !!practica; if (!practica) { PERFIL.diarioIniciado = P.fecha; guardarPerfil(); } }
    M.apuntado = PERFIL.ajustes.apuntado;
    irAJuego();
    guardarSueno();
  };
  const g = leerSueno();
  if (g) hojaConfirmar('¿Empezar otro sueño?', `Tienes uno a medias en el piso ${g.pisoIdx + 1}. Si empiezas otro, ese se pierde.`, 'Empezar otro', ok);
  else ok();
}
function seguirSueno() {
  const g = leerSueno(); if (!g) { mostrarMenu(); return; }
  seguirPartida(g);
  M.apuntado = PERFIL.ajustes.apuntado;
  irAJuego();
}
function irAJuego() {
  UI.pantalla = 'juego';
  $('#menu').hidden = true; $('#fin').hidden = true; $('#pausa').hidden = true;
  $('#hud').hidden = false; $('#acciones').hidden = false;
  cerrarHoja();
  disponer();
  Arte.fondoListo = false;
  UI.hudSucio = true; UI.mapaSucio = true;
  acumulado = 0;
  Musica.encendida = PERFIL.ajustes.musica;
  Musica.iniciar(P.pisoIdx, !!(M.jefe && !M.jefe.muerto));
}
function pausar(si) {
  if (!M || M.fin || UI.pantalla !== 'juego') return;
  M.pausa = si;
  UI.sticks.mover = null; UI.sticks.apuntar = null; UI.raton = null; UI.teclas.clear();
  Object.assign(M.entrada, { mx: 0, my: 0, ax: 0, ay: 0 });
  $('#pausa').hidden = !si;
  if (si) { guardarSueno(); pintarPausa(); Musica.parar(); }
  else if (PERFIL.ajustes.musica) Musica.iniciar(P.pisoIdx, !!(M.jefe && !M.jefe.muerto));
}
function pintarPausa() {
  const S = M.S, J = P.J;
  const val = (n, v) => `<div><b style="color:#fff;font-size:16px">${v}</b><br>${n}</div>`;
  const items = J.items.map(id => ITEM[id]).filter(Boolean);
  $('#pausa').innerHTML = `<div class="tarjeta">
    <h2>Pausa</h2>
    <p class="sub">Piso ${P.pisoIdx + 1} · ${esc(PISOS[P.pisoIdx].nombre)} · ${fmtTiempo(P.t)}</p>
    <div class="valores">${val('daño', S.dano.toFixed(1))}${val('disparos/s', S.cadencia.toFixed(1))}${val('alcance', S.alcance.toFixed(1))}${val('velocidad', S.vel.toFixed(1))}${val('suerte', S.suerte.toFixed(1))}${val('bolitas', S.n)}</div>
    ${items.length || J.activo ? `<div class="mochila" id="pMochila">${items.map((it, i) => `<span data-i="${i}">${it.e}</span>`).join('')}${J.activo ? `<span data-a="1" style="box-shadow:inset 0 0 0 2px var(--oro)">${ITEM[J.activo.id].e}</span>` : ''}</div>
      <div class="detalle" id="pDetalle">Toca un objeto para ver qué hace.</div>` : '<p class="sub">Todavía no tienes objetos.</p>'}
    <div class="botones">
      <button class="boton grande" id="pSeguir"><span class="b-emo">▶️</span><span class="b-txt"><b>Seguir</b></span></button>
      <button class="boton" id="pAjustes"><span class="b-emo">⚙️</span><span class="b-txt"><b>Ajustes</b><small>apuntado, música, vibración</small></span></button>
      <button class="boton" id="pMenu"><span class="b-emo">💾</span><span class="b-txt"><b>Guardar y salir</b><small>sigues después desde el menú</small></span></button>
      <button class="boton" id="pDespertar"><span class="b-emo">⏰</span><span class="b-txt"><b>Despertar</b><small>termina este sueño</small></span></button>
    </div></div>`;
  const m = $('#pMochila');
  if (m) m.onclick = e => {
    const s = e.target.closest('span'); if (!s) return;
    const it = s.dataset.a ? ITEM[J.activo.id] : items[+s.dataset.i];
    if (it) $('#pDetalle').innerHTML = `<b>${it.e} ${esc(it.n)}</b><br>${esc(it.d)}${it.ef.activo ? ' · se carga en ' + it.ef.cargaMax + ' piezas' : ''}`;
  };
  $('#pSeguir').onclick = () => pausar(false);
  $('#pAjustes').onclick = () => hojaAjustes();
  $('#pMenu').onclick = () => { guardarSueno(); M.pausa = false; mostrarMenu(); };
  $('#pDespertar').onclick = () => hojaConfirmar('¿Despertar a ' + nombreMichi() + '?', 'Este sueño termina aquí y cuenta como partida.', 'Despertar', () => { $('#pausa').hidden = true; M.pausa = false; terminar(false, 'Se despertó solito'); });
}

function finPartida(r) {
  r.practica = !!P.practica;
  borrarSueno();
  const pf = PERFIL;
  pf.partidas++;
  if (r.gano) {
    pf.victorias++;
    if (r.modo === 'tranquilo') pf.victoriasTranquilo++; else pf.victoriasPesadilla++;
    if (pf.mejorTiempo === null || r.tiempo < pf.mejorTiempo) pf.mejorTiempo = Math.round(r.tiempo);
  }
  pf.mejorPiso = Math.max(pf.mejorPiso, r.gano ? PISOS.length : r.piso + 1);
  const record = r.puntaje > pf.mejorPuntaje;
  pf.mejorPuntaje = Math.max(pf.mejorPuntaje, r.puntaje);
  let diarioNuevo = false;
  if (r.modo === 'diario' && !r.practica && r.fecha && !pf.diario[r.fecha]) {
    pf.diario[r.fecha] = { puntos: r.puntaje, piso: r.piso + 1, gano: r.gano, t: Date.now() };
    const fechas = Object.keys(pf.diario).sort();
    while (fechas.length > 30) delete pf.diario[fechas.shift()];
    diarioNuevo = true;
  }
  revisarLogros();
  guardarPerfil();
  const monedas = clamp(Math.round(r.pisosCompletados * 6 + r.jefes * 6 + (r.gano ? 20 : 0) + r.enemigos * .1), 3, 60);
  regalarAMichi(monedas, Math.round(monedas / 2));
  Nube.subir(r);
  Musica.parar();
  Sonido.play(r.gano ? 'vida' : 'bajar');
  setTimeout(() => mostrarFin(r, monedas, record, diarioNuevo), r.gano ? 300 : 900);
}
function mostrarFin(r, monedas, record, diarioNuevo) {
  UI.pantalla = 'fin';
  $('#hud').hidden = true; $('#acciones').hidden = true;
  const titulo = conNombre(r.gano ? pick(TEXTOS.gana) : pick(TEXTOS.despierta));
  const items = r.items.map(id => ITEM[id]).filter(Boolean);
  const otro = Nube.otro();
  const suyo = r.modo === 'diario' && otro ? Nube.diarioDe(r.fecha, otro) : null;
  const f = $('#fin');
  f.innerHTML = `<div class="tarjeta">
    <div style="font-family:var(--emoji);font-size:46px">${r.gano ? '🌟' : '⏰'}</div>
    <h2>${esc(titulo)}</h2>
    <p class="sub">${r.gano ? 'Ganó en ' + fmtTiempo(r.tiempo) : (r.por ? 'Lo despertó: ' + esc(r.por) + ' · ' : '') + 'Piso ' + (r.piso + 1) + ' · ' + esc(r.pisoNombre)}</p>
    <div class="puntaje">${r.puntaje.toLocaleString('es-CL')}</div>
    <p class="sub" style="margin:0">${record ? '¡Tu mejor puntaje! 🎉' : 'puntos'}${r.modo === 'diario' ? (r.practica ? ' · práctica, no cuenta' : ' · sueño del día') : r.modo === 'tranquilo' ? ' · modo tranquilo' : ''}</p>
    <div class="stats">
      <div class="stat"><b>${r.enemigos}</b><small>enemigos</small></div>
      <div class="stat"><b>${r.jefes}</b><small>jefes</small></div>
      <div class="stat"><b>${fmtTiempo(r.tiempo)}</b><small>soñando</small></div>
    </div>
    ${items.length ? `<div class="mochila">${items.map(it => `<span title="${esc(it.n)}">${it.e}</span>`).join('')}</div>` : ''}
    ${r.modo === 'diario' && !r.practica && otro ? `<div class="contra">${suyo ? `${esc(otro)} hizo ${suyo.puntos.toLocaleString('es-CL')} puntos hoy · ${suyo.puntos > r.puntaje ? 'te ganó esta vez 😼' : suyo.puntos < r.puntaje ? '¡le ganaste! 🏆' : 'empate'}` : `${esc(otro)} todavía no sueña el de hoy`}</div>` : ''}
    <div class="regalo-michi">🪙 ${nombreMichi()} ganó <b>${monedas}</b> monedas para su casita</div>
    <div class="botones">
      <button class="boton grande" id="fOtra"><span class="b-emo">💤</span><span class="b-txt"><b>Soñar otra vez</b></span></button>
      <button class="boton" id="fMenu"><span class="b-emo">🌙</span><span class="b-txt"><b>Menú</b></span></button>
    </div></div>`;
  f.hidden = false;
  $('#fOtra').onclick = () => empezar(r.modo === 'diario' ? PERFIL.ajustes.modo : r.modo);
  $('#fMenu').onclick = () => mostrarMenu();
  if (diarioNuevo) aviso('📅', 'Sueño del día guardado');
}

/* ============================================================
   MENÚ
   ============================================================ */
function mostrarMenu() {
  UI.pantalla = 'menu';
  $('#hud').hidden = true; $('#acciones').hidden = true; $('#pausa').hidden = true; $('#fin').hidden = true; $('#banner').hidden = true;
  Musica.parar();
  const g = leerSueno(), a = Arte.apariencia, pf = PERFIL, hoy = hoyClave();
  const mio = pf.diario[hoy], otro = Nube.otro(), suyo = otro ? Nube.diarioDe(hoy, otro) : null;
  const modo = pf.ajustes.modo;
  const nCol = Object.keys(pf.coleccion).length;
  const nuevos = nCol > pf.vistos;
  const m = $('#menu');
  let txtDia = 'El mismo sueño para los dos · un intento';
  if (mio) txtDia = 'Hoy: ' + mio.puntos.toLocaleString('es-CL') + ' puntos' + (suyo ? ' · ' + otro + ': ' + suyo.puntos.toLocaleString('es-CL') : '');
  else if (suyo) txtDia = otro + ' ya lo soñó: ' + suyo.puntos.toLocaleString('es-CL') + ' puntos';
  m.innerHTML = `<div class="menu-caja">
    <div class="menu-arriba"><button class="volver" id="mVolver">‹ Rincón</button><button class="redondo" id="mSonido" aria-label="Sonido">${Sonido.mudo() ? '🔇' : '🔊'}</button></div>
    <div class="luna"></div>
    <div class="michi-dormido"><div class="cojin"></div>${typeof michiSVG === 'function' ? michiSVG({ pelaje: a.pelaje, ropa: a.ropa, ojos: 'cerrados', boca: 'masca' }) : ''}${[a.sombrero, a.accesorio].map(id => ACCESORIOS[id] ? `<span class="acc ${ACCESORIOS[id][1]}">${ACCESORIOS[id][0]}</span>` : '').join('')}<span class="zzz">z</span><span class="zzz">z</span></div>
    <h1 class="titulo">Pesadillas<span>de ${esc(nombreMichi())}</span></h1>
    <p class="frase">${esc(conNombre(pick(TEXTOS.inicio)))}</p>
    <div class="botones">
      ${g ? `<button class="boton seguir" id="mSeguir"><span class="b-emo">🌙</span><span class="b-txt"><b>Seguir soñando</b><small>Piso ${g.pisoIdx + 1} · ${esc(PISOS[g.pisoIdx].nombre)} · ${fmtTiempo(g.t)}${g.modo === 'diario' ? ' · sueño del día' : ''}</small></span></button>` : ''}
      <button class="boton grande" id="mSonar"><span class="b-emo">💤</span><span class="b-txt"><b>${g ? 'Soñar uno nuevo' : 'A soñar'}</b><small>${modo === 'tranquilo' ? 'Más corazones y jefes con calma' : 'El sueño de verdad: cinco pisos y sus jefes'}</small></span></button>
      <div class="modos"><button class="modo ${modo === 'normal' ? 'on' : ''}" data-modo="normal">😼 Pesadilla</button><button class="modo ${modo === 'tranquilo' ? 'on' : ''}" data-modo="tranquilo">😴 Tranquilo</button></div>
      <button class="boton" id="mDia"><span class="b-emo">📅</span><span class="b-txt"><b>Sueño del día</b><small>${esc(txtDia)}</small></span>${mio ? '' : '<span class="b-chip">hoy</span>'}</button>
      <div class="fila">
        <button class="chico" id="mDiario"><span class="b-emo">📖</span>Diario${nuevos ? '<i class="punto"></i>' : ''}</button>
        <button class="chico" id="mLogros"><span class="b-emo">🏆</span>Logros</button>
        <button class="chico" id="mAjustes"><span class="b-emo">⚙️</span>Ajustes</button>
      </div>
    </div>
    <div class="pie">${pf.partidas ? `${pf.partidas} ${pf.partidas === 1 ? 'sueño' : 'sueños'} · ${pf.victorias} ${pf.victorias === 1 ? 'ganado' : 'ganados'} · mejor: ${pf.victorias ? 'ganó' : 'piso ' + (pf.mejorPiso || 1)}` : 'Dos dedos: uno para moverse, el otro para lanzar lana'}${quien() ? ' · ' + esc(quien()) : ''}</div>
  </div>`;
  m.hidden = false;
  $('#mVolver').onclick = () => { guardarPerfil(); location.href = '/#juegos'; };
  $('#mSonido').onclick = () => { Sonido.alternar(); Sonido.play('tap'); mostrarMenu(); };
  if (g) $('#mSeguir').onclick = () => { Sonido.listo(); seguirSueno(); };
  $('#mSonar').onclick = () => { Sonido.listo(); empezar(pf.ajustes.modo); };
  m.querySelectorAll('[data-modo]').forEach(b => b.onclick = () => { pf.ajustes.modo = b.dataset.modo; guardarPerfil(); Sonido.play('tap'); mostrarMenu(); });
  $('#mDia').onclick = () => hojaDia();
  $('#mDiario').onclick = () => hojaColeccion();
  $('#mLogros').onclick = () => hojaLogros();
  $('#mAjustes').onclick = () => hojaAjustes();
}

/* ============================================================
   HOJAS
   ============================================================ */
function abrirHoja(html) {
  const h = $('#hoja');
  h.innerHTML = '<div class="asa"></div>' + html;
  $('#hojaFondo').hidden = false;
  $('#hojaFondo').onclick = e => { if (e.target.id === 'hojaFondo') cerrarHoja(); };
  return h;
}
function cerrarHoja() { $('#hojaFondo').hidden = true; $('#hoja').innerHTML = ''; }
function hojaConfirmar(titulo, texto, si, alSi) {
  const h = abrirHoja(`<h3>${esc(titulo)}</h3><p class="sub">${esc(texto)}</p>
    <div class="botones-hoja"><button class="boton grande" id="cSi"><span class="b-txt"><b>${esc(si)}</b></span></button>
    <button class="boton" id="cNo"><span class="b-txt"><b>Mejor no</b></span></button></div>`);
  h.querySelector('#cSi').onclick = () => { cerrarHoja(); alSi(); };
  h.querySelector('#cNo').onclick = cerrarHoja;
}
function hojaDia() {
  const hoy = hoyClave(), mio = PERFIL.diario[hoy], otro = Nube.otro(), q = quien() || 'Tú';
  const g = leerSueno();
  const enCurso = g && g.modo === 'diario' && g.fecha === hoy && !g.practica;
  const yaIntento = PERFIL.diarioIniciado === hoy && !enCurso && !mio;
  const filas = [];
  for (let i = 0; i < 7; i++) {
    const f = hoyClave(Date.now() - i * 86400000), a = PERFIL.diario[f], b = otro ? Nube.diarioDe(f, otro) : null;
    if (!a && !b && i > 0) continue;
    const pa = a ? a.puntos : null, pb = b ? b.puntos : null;
    filas.push(`<tr><td>${i === 0 ? 'Hoy' : i === 1 ? 'Ayer' : f.slice(8, 10) + '/' + f.slice(5, 7)}</td><td class="${pa !== null && (pb === null || pa > pb) ? 'gana' : ''}">${pa !== null ? pa.toLocaleString('es-CL') : '–'}</td><td class="${pb !== null && (pa === null || pb > pa) ? 'gana' : ''}">${pb !== null ? pb.toLocaleString('es-CL') : '–'}</td></tr>`);
  }
  let boton;
  if (enCurso) boton = `<button class="boton seguir" id="dSeguir"><span class="b-emo">🌙</span><span class="b-txt"><b>Seguir el de hoy</b><small>lo dejaste en el piso ${g.pisoIdx + 1}</small></span></button>`;
  else if (mio || yaIntento) boton = `<button class="boton" id="dPracticar"><span class="b-emo">🔁</span><span class="b-txt"><b>Practicar el de hoy</b><small>ya usaste tu intento: este no cuenta</small></span></button>`;
  else boton = `<button class="boton grande" id="dSonar"><span class="b-emo">📅</span><span class="b-txt"><b>Soñar el de hoy</b><small>un solo intento · empiezas con un objeto sorpresa</small></span></button>`;
  const h = abrirHoja(`<h3>Sueño del día</h3>
    <p class="sub">Hoy los dos sueñan exactamente la misma casa, con los mismos objetos. Gana quien llegue más lejos.</p>
    <table class="tabla"><tr><td></td><td><b>${esc(q)}</b></td><td><b>${esc(otro || 'La otra persona')}</b></td></tr>${filas.join('') || '<tr><td colspan="3">Todavía nadie sueña</td></tr>'}</table>
    <div class="botones-hoja">${boton}</div>`);
  const s = h.querySelector('#dSonar'); if (s) s.onclick = () => { cerrarHoja(); Sonido.listo(); empezar('diario', false); };
  const p = h.querySelector('#dPracticar'); if (p) p.onclick = () => { cerrarHoja(); Sonido.listo(); empezar('diario', true); };
  const c = h.querySelector('#dSeguir'); if (c) c.onclick = () => { cerrarHoja(); Sonido.listo(); seguirSueno(); };
}
function hojaColeccion() {
  const col = PERFIL.coleccion, n = Object.keys(col).length;
  PERFIL.vistos = n; guardarPerfil();
  const fichas = ITEMS.map(it => {
    const bloq = it.b && !PERFIL.logros[it.b], visto = !!col[it.id];
    return `<button class="ficha ${visto ? '' : 'no'} ${bloq ? 'bloq' : ''}" data-id="${it.id}"><span class="f-emo">${bloq ? '🔒' : visto ? it.e : '❔'}</span>${visto ? esc(it.n) : bloq ? 'bloqueado' : '???'}</button>`;
  }).join('');
  const jefes = Object.entries(JEFES).map(([id, j]) => `<div class="ficha ${PERFIL.jefes[id] ? '' : 'no'}"><span class="f-emo">${PERFIL.jefes[id] ? ({ reyRaton: '👑', tina: '🛁', aspiradora: '🌀', perro: '🐕', gatoSombra: '🐈‍⬛' })[id] : '❔'}</span>${PERFIL.jefes[id] ? esc(j.n) + '<br>×' + PERFIL.jefes[id] : '???'}</div>`).join('');
  const h = abrirHoja(`<h3>Diario de sueños</h3><p class="sub">${n} de ${ITEMS.length} objetos descubiertos</p>
    <div class="rejilla" id="cRejilla">${fichas}</div>
    <div class="detalle" id="cDetalle">Toca un objeto para ver qué hace.</div>
    <h3 style="margin-top:16px;font-size:18px">Jefes</h3><div class="rejilla">${jefes}</div>`);
  h.querySelector('#cRejilla').onclick = e => {
    const b = e.target.closest('[data-id]'); if (!b) return;
    h.querySelectorAll('.ficha.sel').forEach(x => x.classList.remove('sel')); b.classList.add('sel');
    const it = ITEM[b.dataset.id], bloq = it.b && !PERFIL.logros[it.b];
    const logro = bloq && LOGROS.find(l => l.id === it.b);
    h.querySelector('#cDetalle').innerHTML = bloq ? `🔒 Se desbloquea con el logro <b>${esc(logro.n)}</b>: ${esc(logro.d.toLowerCase())}.`
      : col[it.id] ? `<b>${it.e} ${esc(it.n)}</b> · ${esc(it.d)}${it.ef.activo ? ' · se carga en ' + it.ef.cargaMax + ' piezas' : ''}<br><small>Lo has tomado ${col[it.id]} ${col[it.id] === 1 ? 'vez' : 'veces'}</small>`
        : 'Todavía no lo encuentras. Sigue soñando.';
  };
}
function hojaLogros() {
  const n = Object.keys(PERFIL.logros).length;
  const filas = LOGROS.map(l => {
    const ok = !!PERFIL.logros[l.id], [a, b] = avanceLogro(l.id, PERFIL), premio = l.premio && ITEM[l.premio];
    return `<div class="logro ${ok ? '' : 'no'}"><span class="l-emo">${l.e}</span><span class="l-txt"><b>${esc(l.n)}</b><small>${esc(l.d)}${ok ? ' · ✓' : b > 1 ? ' · ' + Math.min(a, b) + '/' + b : ''}</small></span>${premio ? `<span class="l-premio" title="${esc(premio.n)}">${ok ? premio.e : '🔒'}</span>` : ''}</div>`;
  }).join('');
  abrirHoja(`<h3>Logros</h3><p class="sub">${n} de ${LOGROS.length} · cada logro con candado desbloquea un objeto nuevo</p><div class="lista">${filas}</div>`);
}
function hojaAjustes() {
  const a = PERFIL.ajustes, q = quien();
  const chips = (nombre, ops, val) => `<div class="chips">${ops.map(([v, t]) => `<button class="chip ${val === v ? 'on' : ''}" data-aj="${nombre}" data-v="${v}">${t}</button>`).join('')}</div>`;
  const h = abrirHoja(`<h3>Ajustes</h3>
    <div class="ajuste"><div><b>Apuntar</b><small>${{ asistido: 'Apuntas tú y la lana se acomoda al enemigo más cercano', manual: 'La lana va justo adonde apuntas', auto: 'Michi dispara solo al enemigo más cercano' }[a.apuntado]}</small></div>
      ${chips('apuntado', [['asistido', 'Asistido'], ['manual', 'Manual'], ['auto', 'Solo']], a.apuntado)}</div>
    <div class="ajuste"><div><b>Música</b><small>la cajita de música</small></div>${chips('musica', [['1', 'Sí'], ['0', 'No']], a.musica ? '1' : '0')}</div>
    <div class="ajuste"><div><b>Sonido</b><small>se comparte con el Rincón de juegos</small></div>${chips('sonido', [['1', 'Sí'], ['0', 'No']], Sonido.mudo() ? '0' : '1')}</div>
    <div class="ajuste"><div><b>Vibración</b><small>al recibir golpes y explosiones</small></div>${chips('vibrar', [['1', 'Sí'], ['0', 'No']], a.vibrar ? '1' : '0')}</div>
    <div class="ajuste"><div><b>¿Quién sueña?</b><small>cada uno tiene su propio progreso</small></div>${chips('quien', PERSONAS.map(p => [p, p]), q)}</div>
    <p class="sub" style="margin-top:12px">Con teclado: WASD para moverte, flechas para lanzar, E para usar el objeto, Q para el petardo, P para pausar.</p>`);
  h.onclick = e => {
    const b = e.target.closest('[data-aj]'); if (!b) return;
    const k = b.dataset.aj, v = b.dataset.v;
    if (k === 'apuntado') { a.apuntado = v; if (M) M.apuntado = v; }
    else if (k === 'musica') { a.musica = v === '1'; Musica.encendida = a.musica; if (!a.musica) Musica.parar(); }
    else if (k === 'sonido') { if ((v === '1') === Sonido.mudo()) Sonido.alternar(); }
    else if (k === 'vibrar') { a.vibrar = v === '1'; Musica.vibrar = a.vibrar; }
    else if (k === 'quien') { if (v !== quien()) { cambiarPersona(v); return; } }
    guardarPerfil(); Sonido.play('tap');
    hojaAjustes();
  };
}
function cambiarPersona(p) {
  if (UI.pantalla === 'juego' && M && !M.fin) guardarSueno();
  guardarPerfil();
  try { localStorage.setItem('rinconQuien', p); } catch (e) { /* nada */ }
  PERFIL = leerPerfil(p) || perfilNuevo(p);
  Musica.encendida = PERFIL.ajustes.musica; Musica.vibrar = PERFIL.ajustes.vibrar;
  Arte.apariencia = leerApariencia(p); Arte.listoT = 0;
  cerrarHoja();
  P = null; M = null;
  Arte.preparar();
  mostrarMenu();
  Nube.leer().then(() => { const mejor = Nube.respaldoMejor(); if (mejor) hojaRespaldo(mejor); else if (UI.pantalla === 'menu') mostrarMenu(); }).catch(() => { /* sin conexión */ });
}
function hojaQuien() {
  const h = abrirHoja(`<h3>¿Quién va a soñar?</h3><p class="sub">Cada uno tiene su propio progreso y sus récords.</p>
    <div class="botones-hoja">${PERSONAS.map(p => `<button class="boton grande" data-p="${p}"><span class="b-emo">${p === 'Catalina' ? '🌸' : '🌙'}</span><span class="b-txt"><b>${p}</b></span></button>`).join('')}</div>`);
  h.querySelectorAll('[data-p]').forEach(b => b.onclick = () => cambiarPersona(b.dataset.p));
}
function hojaRespaldo(save) {
  const pf = normalizarPerfil(save);
  const h = abrirHoja(`<h3>Encontré tu progreso en la nube</h3>
    <p class="sub">${pf.partidas} sueños, ${pf.victorias} ganados, ${Object.keys(pf.logros).length} logros y ${Object.keys(pf.coleccion).length} objetos descubiertos. En este teléfono tienes menos.</p>
    <div class="botones-hoja"><button class="boton grande" id="rTraer"><span class="b-emo">☁️</span><span class="b-txt"><b>Traerlo a este teléfono</b></span></button>
    <button class="boton" id="rNo"><span class="b-txt"><b>Dejar el de este teléfono</b></span></button></div>`);
  h.querySelector('#rTraer').onclick = () => { PERFIL = pf; guardarPerfil(); cerrarHoja(); aviso('☁️', 'Progreso recuperado'); mostrarMenu(); };
  h.querySelector('#rNo').onclick = cerrarHoja;
}

/* ============================================================
   ARRANQUE
   ============================================================ */
function arrancar() {
  UI.canvas = $('#lienzo'); UI.ctx = UI.canvas.getContext('2d');
  UI.mapa = $('#minimapa'); UI.mapaCtx = UI.mapa.getContext('2d');
  const q = quien();
  PERFIL = leerPerfil(q) || perfilNuevo(q);
  Musica.encendida = PERFIL.ajustes.musica; Musica.vibrar = PERFIL.ajustes.vibrar;
  Arte.apariencia = leerApariencia(q);
  conectarGanchos();
  conectarControles();
  let espera = null;
  const reacomodar = () => { clearTimeout(espera); espera = setTimeout(() => { disponer(); if (UI.pantalla === 'juego') Arte.fondoListo = false; }, 120); };
  addEventListener('resize', reacomodar);
  addEventListener('orientationchange', reacomodar);
  disponer();
  mostrarMenu();
  requestAnimationFrame(bucle);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (UI.pantalla === 'juego' && M && !M.fin && !M.pausa) pausar(true);
      guardarSueno(); Musica.parar();
    }
  });
  addEventListener('pagehide', () => { if (UI.pantalla === 'juego') guardarSueno(); else guardarPerfil(); });
  if (!q) setTimeout(hojaQuien, 300);
  Nube.leer().then(() => {
    const mejor = Nube.respaldoMejor();
    if (mejor && !$('#hoja').innerHTML) hojaRespaldo(mejor);
    else if (UI.pantalla === 'menu' && !$('#hoja').innerHTML) mostrarMenu();
  }).catch(() => { /* sin conexión: se juega en local */ });
}
arrancar();
