/* ============================================================
   INTERFAZ — trazar con el dedo, barras, menú, perfil y nube
   Cada persona tiene su perfil en el localStorage de su aparato
   (`metroRincon_v1__<Persona>`, más `_copia`) y su partida a medias
   (`metroPartida_v1__<Persona>`). A Neon sube la rama `datos.metro`.
   ============================================================ */
const $ = s => document.querySelector(s);
const PERSONAS = ['Catalina', 'Diego'];
const UI = { pantalla: 'menu', canvas: null, ctx: null, vel: 1, acum: 0, ultimoTs: 0, arrastre: null, modoToque: null, hudSucio: true, cuadro: 0, guardadoT: 0, pistaPaso: 0 };
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
const objeto = v => (v && typeof v === 'object' && !Array.isArray(v)) ? v : {};
const fmt = n => Math.round(n || 0).toLocaleString('es-CL');

/* ---------- sonidos (sintetizados, comparten el silencio del Rincón) ---------- */
const Sonido = {
  ctx: null, ultimo: {},
  mudo() { try { return localStorage.getItem('jxMute') === '1'; } catch (e) { return false; } },
  alternar() { const m = !this.mudo(); try { localStorage.setItem('jxMute', m ? '1' : '0'); } catch (e) { /* nada */ } return !m; },
  listo() {
    if (this.mudo()) return null;
    try { this.ctx = this.ctx || new (window.AudioContext || window.webkitAudioContext)(); if (this.ctx.state === 'suspended') this.ctx.resume(); return this.ctx; } catch (e) { return null; }
  },
  tono(f, dur, o = {}) {
    const c = this.listo(); if (!c) return;
    const { tipo = 'sine', vol = .08, cuando = 0, f2 = null } = o, t = c.currentTime + cuando;
    const os = c.createOscillator(), g = c.createGain();
    os.type = tipo; os.frequency.setValueAtTime(f, t); if (f2) os.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .008); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    os.connect(g); g.connect(c.destination); os.start(t); os.stop(t + dur + .03);
  },
  play(n) {
    if (this.mudo()) return;
    const ahora = performance.now(); if (ahora - (this.ultimo[n] || 0) < (n === 'entrega' ? 120 : 40)) return; this.ultimo[n] = ahora;
    const s = this;
    ({
      estacion: () => { s.tono(784, .25, { vol: .05 }); s.tono(1175, .3, { vol: .04, cuando: .08 }); },
      linea: () => s.tono(330, .22, { tipo: 'triangle', vol: .07, f2: 660 }),
      tramo: () => s.tono(660, .08, { tipo: 'triangle', vol: .06 }),
      quitar: () => s.tono(440, .12, { tipo: 'triangle', vol: .05, f2: 220 }),
      entrega: () => s.tono(1320 + Math.random() * 200, .06, { vol: .025 }),
      mejora: () => [523, 659, 784, 1047].forEach((f, i) => s.tono(f, .25, { tipo: 'triangle', vol: .06, cuando: i * .08 })),
      semana: () => [784, 988, 1175].forEach((f, i) => s.tono(f, .4, { vol: .05, cuando: i * .12 })),
      alerta: () => s.tono(220, .25, { tipo: 'square', vol: .03 }),
      fin: () => [523, 440, 349, 262].forEach((f, i) => s.tono(f, .35, { tipo: 'triangle', vol: .06, cuando: i * .14 })),
      error: () => s.tono(180, .14, { tipo: 'square', vol: .035 }),
      tap: () => s.tono(660, .05, { tipo: 'triangle', vol: .04 }),
    }[n] || (() => {}))();
  },
};

/* ============================================================
   PERFIL
   ============================================================ */
function normalizarPerfil(d) {
  d = objeto(d);
  const num = v => (Number.isFinite(v) ? v : 0);
  const r = objeto(d.records);
  return {
    v: 1, duenio: d.duenio || null, t: d.t || Date.now(), partidas: num(d.partidas), total: num(d.total), mejorDias: num(d.mejorDias),
    records: { normal: num(r.normal), tranquilo: num(r.tranquilo), diario: num(r.diario) },
    diario: objeto(d.diario), diarioIniciado: typeof d.diarioIniciado === 'string' ? d.diarioIniciado : null,
    ajustes: Object.assign({ modo: 'normal' }, objeto(d.ajustes)), tutorial: !!d.tutorial,
  };
}
function leerPerfil(p) {
  const k = claveDe(JUEGO.clave, p);
  for (const c of [k, k + '_copia']) { try { const b = localStorage.getItem(c); if (b) return normalizarPerfil(JSON.parse(b)); } catch (e) { /* sigue */ } }
  return null;
}
function guardarPerfil() {
  if (!PERFIL) return;
  PERFIL.t = Date.now();
  const q = quien(), k = claveDe(JUEGO.clave, q);
  try {
    const v = localStorage.getItem(k); if (v) localStorage.setItem(k + '_copia', v);
    localStorage.setItem(k, JSON.stringify(PERFIL));
    localStorage.setItem(claveDe(JUEGO.resumen, q), JSON.stringify({
      t: Date.now(), partidas: PERFIL.partidas, record: Math.max(PERFIL.records.normal, PERFIL.records.diario), mejorDias: PERFIL.mejorDias,
      total: PERFIL.total, enCurso: !!localStorage.getItem(claveDe(JUEGO.partida, q)),
    }));
  } catch (e) { /* nada */ }
}
const progresoDe = pf => pf ? pf.partidas * 2 + Math.floor(pf.total / 50) : 0;
function leerPartida() {
  try { const b = localStorage.getItem(claveDe(JUEGO.partida, quien())); if (!b) return null; const g = JSON.parse(b); return g && g.v === 1 && Array.isArray(g.estaciones) ? g : null; } catch (e) { return null; }
}
function guardarPartida() {
  const g = juegoParaGuardar();
  if (g) { try { localStorage.setItem(claveDe(JUEGO.partida, quien()), JSON.stringify(g)); } catch (e) { /* nada */ } }
  guardarPerfil();
}
function borrarPartida() { try { localStorage.removeItem(claveDe(JUEGO.partida, quien())); } catch (e) { /* nada */ } }
function regalarAMichi(monedas, xp) {
  try {
    const p = JSON.parse(localStorage.getItem('rinconMichiPendiente') || 'null') || { monedas: 0, xp: 0 };
    p.monedas = (p.monedas || 0) + monedas; p.xp = (p.xp || 0) + xp; p.de = 'Metro de Curicó';
    localStorage.setItem('rinconMichiPendiente', JSON.stringify(p));
  } catch (e) { /* nada */ }
}

/* ============================================================
   NUBE — rama `datos.metro`
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
  async escribir(mutar) {
    if (!this.lista) return false;
    await this.leer();
    mutar(this.remoto);
    const r = await fetch(JUEGO.api, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: { [JUEGO.rama]: this.remoto } }) });
    if (!r.ok) throw new Error('POST ' + r.status);
    return true;
  },
  async subir(res) {
    const q = quien(); if (!q || !PERFIL || this.enVuelo) return;
    this.enVuelo = true;
    try {
      await this.escribir(R => {
        R.marcador[q] = { t: Date.now(), partidas: PERFIL.partidas, record: Math.max(PERFIL.records.normal, PERFIL.records.diario), mejorDias: PERFIL.mejorDias, total: PERFIL.total };
        if (res && res.modo === 'diario' && !res.practica && res.fecha) {
          const d = R.diario[res.fecha] = objeto(R.diario[res.fecha]);
          if (!d[q]) d[q] = { pasajeros: res.pasajeros, dias: res.dias, t: Date.now() };
          const f = Object.keys(R.diario).sort(); while (f.length > 21) delete R.diario[f.shift()];
        }
        const g = R.respaldo[q];
        if (!(progresoDe(PERFIL) < 4 && g && g.save && progresoDe(g.save) > progresoDe(PERFIL))) R.respaldo[q] = { t: Date.now(), v: 1, save: PERFIL };
      });
    } catch (e) { /* sin conexión */ }
    finally { this.enVuelo = false; }
  },
  respaldoMejor() { const q = quien(); const g = q && this.remoto && this.remoto.respaldo[q]; return g && g.save && progresoDe(g.save) > progresoDe(PERFIL) + 6 ? g.save : null; },
  otro() { const q = quien(); return PERSONAS.find(p => p !== q) || null; },
  diarioDe(f, p) { const d = this.remoto && this.remoto.diario[f]; return d && d[p] ? d[p] : null; },
};

/* ============================================================
   PANTALLA
   ============================================================ */
function disponer() {
  const W = innerWidth, H = innerHeight, dpr = Math.min(window.devicePixelRatio || 1, 2);
  UI.canvas.width = Math.round(W * dpr); UI.canvas.height = Math.round(H * dpr);
  const arriba = $('#arriba'), abajo = $('#abajo');
  const top = arriba.hidden ? 60 : arriba.getBoundingClientRect().bottom;
  const bot = abajo.hidden ? H - 90 : abajo.getBoundingClientRect().top;
  Arte.oscuro = !!(window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
  Arte.disponer(W, H, { x: 6, y: top + 4, w: W - 12, h: Math.max(100, bot - top - 8) }, dpr);
  $('#avisos').style.top = (top + 8) + 'px';
  $('#pista').style.bottom = (H - bot + 10) + 'px';
  $('#barraGoma').style.bottom = (H - bot + 10) + 'px';
}

/* ---------- tocar el mapa ---------- */
function estacionEn(sx, sy, radio) {
  let mejor = null, md = radio;
  for (const s of J.estaciones) { const [x, y] = Arte.aPantalla(s.x, s.y); const d = Math.hypot(x - sx, y - sy); if (d < md) { md = d; mejor = s; } }
  return mejor;
}
function manijaEn(sx, sy) {
  let mejor = null, md = 22;
  for (const l of J.lineas) {
    if (l.loop) continue;
    for (const ext of ['ini', 'fin']) {
      const m = Arte.manija(l, ext), [x, y] = Arte.aPantalla(m.x, m.y), d = Math.hypot(x - sx, y - sy);
      if (d < md) { md = d; mejor = { l, extremo: ext }; }
    }
  }
  return mejor;
}
function tramoEn(sx, sy) {
  const [wx, wy] = Arte.aMundo(sx, sy), lim = 13 / Arte.escala;
  let mejor = null, md = lim;
  for (const l of J.lineas) {
    const n = l.est.length, cuantos = l.loop ? n : n - 1;
    for (let i = 0; i < cuantos; i++) {
      const p = tramo(EST.get(l.est[i]), EST.get(l.est[(i + 1) % n]));
      for (let k = 0; k + 1 < p.length; k++) { const d = distSeg(wx, wy, p[k], p[k + 1]); if (d < md) { md = d; mejor = { l, i }; } }
    }
  }
  return mejor;
}
function motivo(m, a) {
  if (a.mal === m) return;
  a.mal = m;
  if (m === 'puente') aviso('🌉', 'Necesitas un puente para cruzar el estero');
  else if (m === 'tunel') aviso('⛰️', 'Necesitas un túnel para pasar el cerro');
  else if (m === 'linea') aviso('〰️', 'No te quedan líneas: llegan con las mejoras de la semana');
  Sonido.play('error');
}
function vistaArrastre() {
  const a = UI.arrastre;
  if (!a) { Arte.arrastre = null; return; }
  let desde = null, color = '#888';
  if (a.tipo === 'nueva') { desde = a.cadena[a.cadena.length - 1]; const c = colorLibre(); color = c >= 0 ? LINEAS[c].color : '#888'; }
  else if (a.tipo === 'extender') { const l = a.linea; desde = EST.get(a.extremo === 'fin' ? l.est[l.est.length - 1] : l.est[0]); color = LINEAS[l.c].color; }
  else if (a.tipo === 'insertar') { const l = a.linea; desde = EST.get(l.est[a.i]); color = LINEAS[l.c].color; }
  Arte.arrastre = { desde, x: a.x, y: a.y, color, mal: !!a.mal };
}
/* ---------- la goma ----------
   Se enciende con su botón, se toca una línea y la barra pregunta qué
   borrar: la línea entera o, si se tocó una punta (o es una vuelta),
   solo ese tramo. Después de borrar se apaga sola: si quedara encendida,
   el siguiente intento de trazar una línea elegiría otra para borrar. */
function lineasEn(sx, sy) {
  const [wx, wy] = Arte.aMundo(sx, sy), lim = 16 / Arte.escala, vistas = [];
  for (const l of J.lineas) {
    const n = l.est.length, cuantos = l.loop ? n : n - 1;
    let md = lim, mi = -1;
    for (let i = 0; i < cuantos; i++) {
      const p = tramo(EST.get(l.est[i]), EST.get(l.est[(i + 1) % n]));
      for (let k = 0; k + 1 < p.length; k++) { const d = distSeg(wx, wy, p[k], p[k + 1]); if (d < md) { md = d; mi = i; } }
    }
    if (mi >= 0) vistas.push({ l, i: mi, d: md });
  }
  return vistas.sort((a, b) => a.d - b.d);
}
const PISTA_GOMA = 'Goma: toca la línea que quieres borrar';
function soltarGoma() { UI.goma = null; Arte.goma = null; $('#barraGoma').hidden = true; }
function alternarGoma(on) {
  const puede = !!J && UI.pantalla === 'juego' && !J.fin && !J.eleccion;
  const activa = puede && (on == null ? UI.modoToque !== 'goma' : !!on);
  const estaba = UI.modoToque === 'goma';
  soltarGoma();
  if (activa) {
    UI.modoToque = 'goma'; UI.arrastre = null; vistaArrastre();
    pista(J.lineas.length ? PISTA_GOMA : 'Todavía no hay líneas que borrar');
  } else if (estaba) { UI.modoToque = null; ocultarPista(); }
  const b = $('#btnGoma'), si = UI.modoToque === 'goma';
  b.classList.toggle('on', si); b.setAttribute('aria-pressed', si ? 'true' : 'false');
  UI.hudSucio = true;
}
function tocarConGoma(x, y) {
  const cerca = lineasEn(x, y);
  if (!cerca.length) { if (UI.goma) { soltarGoma(); pista(PISTA_GOMA); } else alternarGoma(false); return; }
  /* si pasan varias líneas por el mismo tramo, tocar de nuevo elige la siguiente */
  let k = 0;
  if (UI.goma) { const ya = cerca.findIndex(c => c.l === UI.goma.l); if (ya >= 0 && cerca.length > 1) k = (ya + 1) % cerca.length; }
  const l = cerca[k].l, i = cerca[k].i, n = l.est.length;
  const tramoSolo = l.loop || (n > 2 && (i === 0 || i === n - 2));
  UI.goma = { l, i, tramo: tramoSolo };
  Arte.goma = { id: l.id, i, tramo: tramoSolo };
  Sonido.play('tap');
  barraGoma();
}
function barraGoma() {
  const g = UI.goma; if (!g) return;
  const l = g.l, col = LINEAS[l.c];
  ocultarPista();
  const el = $('#barraGoma');
  el.innerHTML = `<span class="bg-nombre"><i style="background:${col.color}"></i><b>Línea ${col.n}</b></span>
    ${g.tramo ? '<button class="bg-tramo" id="gTramo">Solo el tramo punteado</button>' : ''}
    <button class="bg-todo" id="gTodo">Borrar toda la línea</button>
    <button class="bg-no" id="gNo" aria-label="No borrar nada">✕</button>`;
  el.hidden = false;
  $('#gTodo').onclick = () => { borrarLinea(l); aviso('🧽', 'Línea ' + col.n + ' borrada: sus trenes quedaron libres'); alternarGoma(false); };
  const t = $('#gTramo');
  if (t) t.onclick = () => {
    if (l.loop) abrirVueltaEn(l, g.i); else recortarLinea(l, g.i === 0 ? 'ini' : 'fin');
    aviso('🧽', 'Tramo borrado'); alternarGoma(false);
  };
  $('#gNo').onclick = () => alternarGoma(false);
}
function conectarControles() {
  const c = UI.canvas;
  c.addEventListener('pointerdown', e => {
    if (UI.pantalla !== 'juego' || !J || J.fin || J.eleccion) return;
    Sonido.listo();
    const x = e.clientX, y = e.clientY;
    if (UI.modoToque === 'goma') { tocarConGoma(x, y); return; }
    if (UI.modoToque === 'intercambiador') {
      const s = estacionEn(x, y, 28);
      if (s && ponerIntercambiador(s)) aviso('⭕', s.nombre + ' ahora es intercambiador');
      UI.modoToque = null; ocultarPista(); UI.hudSucio = true; return;
    }
    const m = manijaEn(x, y);
    if (m) UI.arrastre = { tipo: 'extender', linea: m.l, extremo: m.extremo, x, y, id: e.pointerId };
    else {
      const s = estacionEn(x, y, 26);
      if (s) {
        if (colorLibre() < 0) { motivo('linea', {}); return; }
        UI.arrastre = { tipo: 'nueva', cadena: [s], x, y, id: e.pointerId };
      } else {
        const t = tramoEn(x, y);
        if (t) UI.arrastre = { tipo: 'insertar', linea: t.l, i: t.i, x, y, id: e.pointerId };
      }
    }
    if (UI.arrastre) { try { c.setPointerCapture(e.pointerId); } catch (err) { /* nada */ } vistaArrastre(); }
  });
  c.addEventListener('pointermove', e => {
    const a = UI.arrastre;
    if (!a || a.id !== e.pointerId || !J) return;
    a.x = e.clientX; a.y = e.clientY;
    const s = estacionEn(a.x, a.y, 22);
    if (!s) a.mal = false;
    if (a.tipo === 'nueva' && s && s !== a.cadena[0]) {
      const r = crearLinea(a.cadena[0], s);
      if (r.ok) { UI.arrastre = { tipo: 'extender', linea: r.linea, extremo: 'fin', x: a.x, y: a.y, id: a.id }; UI.hudSucio = true; revisarPistas(); }
      else motivo(r.motivo, a);
    } else if (a.tipo === 'extender') {
      const l = a.linea;
      if (!J.lineas.includes(l)) { UI.arrastre = null; vistaArrastre(); return; }
      const finId = a.extremo === 'fin' ? l.est[l.est.length - 1] : l.est[0];
      const prevId = a.extremo === 'fin' ? l.est[l.est.length - 2] : l.est[1];
      if (s && s.id !== finId) {
        if (s.id === prevId) { recortarLinea(l, a.extremo); if (!J.lineas.includes(l)) UI.arrastre = null; UI.hudSucio = true; }
        else {
          const r = extenderLinea(l, a.extremo, s);
          if (r.ok) { if (r.cerro) UI.arrastre = null; UI.hudSucio = true; revisarPistas(); }
          else if (r.motivo) motivo(r.motivo, a);
        }
      }
    } else if (a.tipo === 'insertar' && s && !a.linea.est.includes(s.id)) {
      const r = insertarEnLinea(a.linea, a.i, s);
      if (r.ok) { UI.arrastre = null; UI.hudSucio = true; revisarPistas(); } else if (r.motivo) motivo(r.motivo, a);
    }
    vistaArrastre();
  });
  const soltar = e => { if (UI.arrastre && UI.arrastre.id === e.pointerId) { UI.arrastre = null; vistaArrastre(); UI.hudSucio = true; } };
  c.addEventListener('pointerup', soltar);
  c.addEventListener('pointercancel', soltar);
  c.addEventListener('contextmenu', e => e.preventDefault());
  document.querySelectorAll('.velocidad [data-vel]').forEach(b => b.onclick = () => { UI.vel = +b.dataset.vel; Sonido.play('tap'); UI.hudSucio = true; });
  $('#btnMenu').onclick = () => pausa();
  $('#btnReloj').onclick = () => { UI.vel = UI.vel ? 0 : 1; UI.hudSucio = true; };
  $('#btnGoma').onclick = () => { Sonido.listo(); Sonido.play('tap'); alternarGoma(); };
  addEventListener('keydown', e => {
    if (UI.pantalla !== 'juego') return;
    if (e.code === 'Space') { UI.vel = UI.vel ? 0 : 1; UI.hudSucio = true; e.preventDefault(); }
    else if (e.code === 'Digit1') { UI.vel = 1; UI.hudSucio = true; }
    else if (e.code === 'Digit2') { UI.vel = 2; UI.hudSucio = true; }
    else if (e.code === 'KeyG') alternarGoma();
    else if (e.code === 'Escape') { if (UI.modoToque === 'goma') alternarGoma(false); else pausa(); }
  });
}

/* ============================================================
   BUCLE
   ============================================================ */
function bucle(ts) {
  requestAnimationFrame(bucle);
  const dt = clamp((ts - UI.ultimoTs) / 1000, 0, .1); UI.ultimoTs = ts;
  if (!J) return;
  if (UI.pantalla === 'juego' && !J.fin && !J.eleccion && UI.vel > 0) {
    UI.acum += dt * UI.vel;
    let n = 0;
    while (UI.acum >= TIEMPO.paso && n < 14) { pasoJuego(TIEMPO.paso); UI.acum -= TIEMPO.paso; n++; if (J.fin || J.eleccion) break; }
    if (n >= 14) UI.acum = 0;
    UI.guardadoT += dt;
    if (UI.guardadoT > 15) { UI.guardadoT = 0; guardarPartida(); }
  }
  if (UI.goma && !J.lineas.includes(UI.goma.l)) alternarGoma(false);
  Arte.dibujar(UI.ctx, dt);
  if (UI.hudSucio || ++UI.cuadro % 12 === 0) pintarHud();
}

/* ============================================================
   GANCHOS
   ============================================================ */
function conectarGanchos() {
  Ev.sonido = n => Sonido.play(n);
  Ev.aviso = (e, t) => aviso(e, t);
  Ev.estacion = s => { if (J.t > 1) { Sonido.play('estacion'); if (!TIPOS_BASE.includes(s.tipo) && J.conteo[s.tipo] === 1) aviso(TIPOS[s.tipo].e, 'Nueva estación: ' + s.nombre); } };
  Ev.entrega = s => { Sonido.play('entrega'); Arte.efecto('entrega', s.x, s.y); };
  Ev.cambio = () => { UI.hudSucio = true; };
  Ev.dia = () => { UI.hudSucio = true; Arte.ajustarCamara(false); };
  Ev.semana = op => { Sonido.play('semana'); mostrarSemana(op); };
  Ev.fin = f => finPartida(f);
}

/* ============================================================
   BARRAS
   ============================================================ */
function pintarHud() {
  UI.hudSucio = false;
  if (!J || UI.pantalla !== 'juego') return;
  const semana = Math.floor(J.dia / TIEMPO.semana) + 1, k = ((J.t / TIEMPO.dia) % TIEMPO.semana) / TIEMPO.semana;
  $('#txtDia').textContent = DIAS_SEMANA[J.dia % 7];
  $('#txtSemana').textContent = 'semana ' + semana;
  const C = 2 * Math.PI * 15, arco = $('#arcoSemana');
  arco.style.strokeDasharray = C.toFixed(1); arco.style.strokeDashoffset = (C * (1 - k)).toFixed(1);
  $('#txtGente').textContent = fmt(J.pasajeros);
  document.querySelectorAll('.velocidad [data-vel]').forEach(b => b.classList.toggle('on', +b.dataset.vel === UI.vel));
  /* líneas */
  let h = '';
  for (let i = 0; i < MAX_LINEAS; i++) {
    const l = J.lineas.find(x => x.c === i), col = LINEAS[i].color;
    if (i >= J.tengo.lineas) h += `<button class="chip-linea bloq" data-c="${i}" aria-label="Línea bloqueada"></button>`;
    else if (!l) h += `<button class="chip-linea libre" data-c="${i}" style="border-color:${col}" aria-label="Línea ${LINEAS[i].n} libre"></button>`;
    else { const n = J.trenes.filter(t => t.linea === l.id).length; h += `<button class="chip-linea" data-c="${i}" style="background:${col}" aria-label="Línea ${LINEAS[i].n}"><b>${n}🚆</b></button>`; }
  }
  const cl = $('#chipsLineas');
  if (cl.innerHTML !== h) { cl.innerHTML = h; cl.querySelectorAll('[data-c]').forEach(b => b.onclick = () => hojaLinea(+b.dataset.c)); }
  /* inventario */
  const d = disponible(), verTunel = J.tengo.tuneles > 0 && anchoRegion() > 480;
  const inv = [['trenes', '🚆', 'trenes libres'], ['vagones', '🚃', 'vagones'], ['puentes', '🌉', 'puentes'], verTunel ? ['tuneles', '⛰️', 'túneles'] : null, ['intercambiadores', '⭕', 'intercambiadores']].filter(Boolean)
    .filter(([k]) => k !== 'vagones' && k !== 'intercambiadores' || J.tengo[k] > 0);
  const hi = inv.map(([k, e, t]) => `<button class="inv ${d[k] > 0 ? '' : 'cero'} ${UI.modoToque === 'intercambiador' && k === 'intercambiadores' ? 'activo' : ''}" data-inv="${k}" aria-label="${t}"><i>${e}</i>${d[k]}</button>`).join('');
  const iv = $('#inventario');
  if (iv.innerHTML !== hi) { iv.innerHTML = hi; iv.querySelectorAll('[data-inv]').forEach(b => b.onclick = () => tocarInventario(b.dataset.inv)); }
}
function tocarInventario(k) {
  const d = disponible();
  Sonido.play('tap');
  if (k === 'trenes') aviso('🚆', d.trenes > 0 ? 'Toca una línea de abajo para sumarle un tren' : 'Cada domingo llega un tren nuevo');
  else if (k === 'vagones') aviso('🚃', d.vagones > 0 ? 'Toca una línea de abajo para sumarle un vagón' : 'Los vagones salen en las mejoras de la semana');
  else if (k === 'puentes') aviso('🌉', 'Los puentes se usan solos al cruzar el estero');
  else if (k === 'tuneles') aviso('⛰️', 'Los túneles se usan solos al pasar por el cerro');
  else if (k === 'intercambiadores') {
    if (d.intercambiadores <= 0) { aviso('⭕', 'No te quedan intercambiadores'); return; }
    if (UI.modoToque === 'goma') alternarGoma(false);
    UI.modoToque = UI.modoToque === 'intercambiador' ? null : 'intercambiador';
    if (UI.modoToque) pista('Toca la estación que quieres agrandar'); else ocultarPista();
    UI.hudSucio = true;
  }
}
function aviso(emo, txt) {
  const c = $('#avisos'), d = document.createElement('div');
  d.className = 'aviso'; d.innerHTML = `<i>${emo}</i><span>${esc(txt)}</span>`;
  c.appendChild(d); while (c.children.length > 3) c.firstChild.remove();
  setTimeout(() => { d.classList.add('sale'); setTimeout(() => d.remove(), 360); }, 2600);
}
function pista(txt) { const p = $('#pista'); p.innerHTML = txt; p.hidden = false; }
function ocultarPista() { $('#pista').hidden = true; }

/* El primer juego enseña con pistas. */
function revisarPistas() {
  if (PERFIL.tutorial || UI.pantalla !== 'juego' || !J) return;
  const [a, b, c] = J.estaciones;
  if (!J.lineas.length) { pista(`Arrastra el dedo desde <b>${esc(a.nombre)}</b> 🏠 hasta <b>${esc(b.nombre)}</b> 🎓 para trazar la primera línea`); Arte.resaltar = a.id; return; }
  const ady = vecinos();
  if (!ady.get(c.id).size) { pista(`¡Eso! El tren lleva a cada persona a su lugar. Ahora une también <b>${esc(c.nombre)}</b> 🛍️: arrastra desde la punta de la línea`); Arte.resaltar = c.id; return; }
  Arte.resaltar = null;
  pista('Si una estación junta demasiada gente, se repleta y se acaba el juego. Cada domingo la Muni te da un tren y una mejora 🎁');
  PERFIL.tutorial = true; guardarPerfil();
  setTimeout(ocultarPista, 7000);
}

/* ============================================================
   EMPEZAR, PAUSAR, SEMANA, FIN
   ============================================================ */
function empezar(modo, practica) {
  const ok = () => {
    borrarPartida();
    nuevoJuego(modo, hoyClave());
    if (modo === 'diario') { J.practica = !!practica; if (!practica) { PERFIL.diarioIniciado = J.fecha; guardarPerfil(); } }
    irAJuego();
    guardarPartida();
  };
  const g = leerPartida();
  if (g) hojaConfirmar('¿Empezar otra partida?', `Tienes una a medias (${fmt(g.pasajeros)} pasajeros, día ${g.dia + 1}). Si empiezas otra, esa se pierde.`, 'Empezar otra', ok);
  else ok();
}
function seguir() { const g = leerPartida(); if (!g) { mostrarMenu(); return; } cargarJuego(g); irAJuego(); }
function irAJuego() {
  UI.pantalla = 'juego'; UI.vel = 1; UI.acum = 0; UI.modoToque = null; UI.arrastre = null; Arte.resaltar = null; Arte.efectos = []; alternarGoma(false);
  $('#menu').hidden = true; $('#velo').hidden = true; cerrarHoja();
  $('#arriba').hidden = false; $('#abajo').hidden = false;
  UI.hudSucio = true; pintarHud();
  disponer(); Arte.ajustarCamara(true);
  ocultarPista(); revisarPistas();
  if (J.eleccion) mostrarSemana(J.eleccion);
}
function pausa() {
  if (UI.pantalla !== 'juego' || !J || J.fin) return;
  if (UI.modoToque === 'goma') alternarGoma(false);
  /* la elección de la semana ya detiene el juego: la pausa no la tapa */
  if (J.eleccion) { guardarPartida(); if ($('#velo').hidden) mostrarSemana(J.eleccion); return; }
  const velAntes = UI.vel; UI.vel = 0; UI.hudSucio = true;
  guardarPartida();
  const v = $('#velo');
  v.innerHTML = `<div class="tarjeta"><h2>Pausa</h2><p class="sub">Día ${J.dia + 1} · ${fmt(J.pasajeros)} pasajeros · ${J.estaciones.length} estaciones</p>
    <div class="botones">
      <button class="boton grande" id="pSeguir"><span class="b-emo">▶️</span><span class="b-txt"><b>Seguir</b></span></button>
      <button class="boton" id="pAyuda"><span class="b-emo">❓</span><span class="b-txt"><b>Cómo se juega</b></span></button>
      <button class="boton" id="pSonido"><span class="b-emo">${Sonido.mudo() ? '🔇' : '🔊'}</span><span class="b-txt"><b>Sonido ${Sonido.mudo() ? 'apagado' : 'encendido'}</b></span></button>
      <button class="boton" id="pSalir"><span class="b-emo">💾</span><span class="b-txt"><b>Guardar y salir</b><small>sigues después desde el menú</small></span></button>
      <button class="boton" id="pTerminar"><span class="b-emo">🏁</span><span class="b-txt"><b>Terminar aquí</b><small>cuenta como partida</small></span></button>
    </div></div>`;
  v.hidden = false;
  const cerrar = () => { v.hidden = true; UI.vel = velAntes || 1; UI.hudSucio = true; if (J && J.eleccion) mostrarSemana(J.eleccion); };
  $('#pSeguir').onclick = cerrar;
  $('#pAyuda').onclick = () => hojaAyuda();
  $('#pSonido').onclick = () => { Sonido.alternar(); pausa(); };
  $('#pSalir').onclick = () => { guardarPartida(); v.hidden = true; mostrarMenu(); };
  $('#pTerminar').onclick = () => hojaConfirmar('¿Terminar la partida?', 'Se guarda tu puntaje tal como va.', 'Terminar', () => { v.hidden = true; J.fin = { id: null, nombre: null, dias: J.dia, pasajeros: J.pasajeros, t: J.t, voluntario: true }; finPartida(J.fin); });
}
function mostrarSemana(op) {
  if (UI.modoToque === 'goma' || UI.goma) { UI.modoToque = null; soltarGoma(); ocultarPista(); $('#btnGoma').classList.remove('on'); $('#btnGoma').setAttribute('aria-pressed', 'false'); }
  const v = $('#velo'), sem = J.semanas;
  v.innerHTML = `<div class="tarjeta"><div style="font-family:var(--emoji);font-size:40px">🎁</div><h2>Fin de la semana ${sem}</h2>
    <p class="sub">La Muni aprobó un tren nuevo 🚆 y te deja elegir una mejora:</p>
    <div class="cartas">${op.map(id => `<button class="carta" data-m="${id}"><span class="c-emo">${MEJORAS[id].e}</span><b>${MEJORAS[id].n}</b><small>${MEJORAS[id].d}</small></button>`).join('')}</div></div>`;
  v.hidden = false;
  v.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { elegirMejora(b.dataset.m); v.hidden = true; UI.hudSucio = true; guardarPartida(); });
}
function finPartida(f) {
  if (UI.modoToque === 'goma' || UI.goma) { UI.modoToque = null; soltarGoma(); ocultarPista(); $('#btnGoma').classList.remove('on'); $('#btnGoma').setAttribute('aria-pressed', 'false'); }
  const res = { modo: J.modo, fecha: J.fecha, practica: !!J.practica, pasajeros: J.pasajeros, dias: J.dia + 1, estacion: f.nombre, voluntario: !!f.voluntario };
  borrarPartida();
  PERFIL.partidas++; PERFIL.total += res.pasajeros; PERFIL.mejorDias = Math.max(PERFIL.mejorDias, res.dias);
  const clave = res.modo === 'diario' ? 'diario' : res.modo;
  const record = res.pasajeros > (PERFIL.records[clave] || 0);
  PERFIL.records[clave] = Math.max(PERFIL.records[clave] || 0, res.pasajeros);
  if (res.modo === 'diario' && !res.practica && res.fecha && !PERFIL.diario[res.fecha]) {
    PERFIL.diario[res.fecha] = { pasajeros: res.pasajeros, dias: res.dias, t: Date.now() };
    const fs = Object.keys(PERFIL.diario).sort(); while (fs.length > 30) delete PERFIL.diario[fs.shift()];
  }
  guardarPerfil();
  const monedas = clamp(Math.round(res.pasajeros / 6), 3, 50);
  regalarAMichi(monedas, Math.round(monedas / 2));
  Nube.subir(res);
  Sonido.play('fin');
  UI.vel = 0; Arte.resaltar = f.id;
  setTimeout(() => mostrarFin(res, monedas, record), f.voluntario ? 50 : 1400);
}
function mostrarFin(res, monedas, record) {
  UI.pantalla = 'fin';
  const otro = Nube.otro(), suyo = res.modo === 'diario' && otro ? Nube.diarioDe(res.fecha, otro) : null;
  const v = $('#velo');
  v.innerHTML = `<div class="tarjeta"><div style="font-family:var(--emoji);font-size:42px">${res.voluntario ? '🏁' : '🚇'}</div>
    <h2>${res.voluntario ? 'Terminaste aquí' : 'Se repletó una estación'}</h2>
    <p class="sub">${res.voluntario ? 'Buen viaje' : `<b>${esc(res.estacion)}</b> juntó demasiada gente y el metro tuvo que cerrar`}</p>
    <div class="grande-num">${fmt(res.pasajeros)}</div>
    <p class="sub" style="margin:0">pasajeros llevados${record ? ' · ¡tu récord! 🎉' : ''}${res.modo === 'diario' ? (res.practica ? ' · práctica' : ' · desafío del día') : res.modo === 'tranquilo' ? ' · sin apuro' : ''}</p>
    <div class="stats"><div class="stat"><b>${res.dias}</b><small>días</small></div><div class="stat"><b>${J.estaciones.length}</b><small>estaciones</small></div><div class="stat"><b>${J.lineas.length}</b><small>líneas</small></div></div>
    ${res.modo === 'diario' && !res.practica && otro ? `<div class="contra">${suyo ? `${esc(otro)} llevó ${fmt(suyo.pasajeros)} hoy · ${suyo.pasajeros > res.pasajeros ? 'te ganó esta vez' : suyo.pasajeros < res.pasajeros ? '¡le ganaste! 🏆' : 'empate'}` : `${esc(otro)} todavía no juega el de hoy`}</div>` : ''}
    <div class="regalo-michi">🪙 Michi ganó <b>${monedas}</b> monedas para su casita</div>
    <div class="botones"><button class="boton grande" id="fOtra"><span class="b-emo">🚇</span><span class="b-txt"><b>Otra partida</b></span></button>
    <button class="boton" id="fMenu"><span class="b-emo">🏠</span><span class="b-txt"><b>Menú</b></span></button></div></div>`;
  v.hidden = false;
  $('#fOtra').onclick = () => { v.hidden = true; empezar(res.modo === 'diario' ? PERFIL.ajustes.modo : res.modo); };
  $('#fMenu').onclick = () => { v.hidden = true; mostrarMenu(); };
}

/* ============================================================
   MENÚ Y HOJAS
   ============================================================ */
const PLANO_SVG = `<svg viewBox="0 0 320 190" aria-hidden="true"><rect x="0" y="0" width="320" height="190" rx="18" fill="var(--tarjeta)"/>
  <path d="M-10 52 Q60 40 110 58 T220 48 T330 56" stroke="#a9d3ee" stroke-width="12" fill="none"/>
  <path d="M232 112 q22 -34 54 -20 q24 16 10 46 q-22 24 -50 6 q-20 -12 -14 -32z" fill="#bcd7a0"/>
  <rect x="132" y="104" width="30" height="30" fill="#b5d79b"/>
  <g fill="none" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">
    <path d="M40 150 H110 L150 110 H210" stroke="#e2554f"/><path d="M60 30 V80 L100 120 V170" stroke="#3a7bd5"/><path d="M210 30 L170 70 H270" stroke="#f2a93b"/></g>
  <g fill="#fff" stroke="#2d2a32" stroke-width="3"><circle cx="40" cy="150" r="9"/><circle cx="210" cy="110" r="9"/><circle cx="60" cy="30" r="9"/><circle cx="100" cy="170" r="9"/><circle cx="210" cy="30" r="9"/><circle cx="270" cy="70" r="9"/><circle cx="100" cy="120" r="11"/></g>
  <g fill="#2d2a32"><path d="M35 154 v-5 l5 -5 l5 5 v5z"/><path d="M204 108 l6 -4 l6 4 l-6 4z M207 110 h6 v4 h-6z"/><rect x="55" y="28" width="10" height="7"/><path d="M95 174 v-5 l5 -5 l5 5 v5z"/><rect x="208" y="25" width="4" height="10"/><rect x="205" y="28" width="10" height="4"/><circle cx="270" cy="70" r="4"/></g></svg>`;
function mostrarMenu() {
  UI.pantalla = 'menu';
  $('#arriba').hidden = true; $('#abajo').hidden = true; ocultarPista();
  const g = leerPartida(), pf = PERFIL, hoy = hoyClave(), mio = pf.diario[hoy], otro = Nube.otro(), suyo = otro ? Nube.diarioDe(hoy, otro) : null;
  const modo = pf.ajustes.modo;
  let txtDia = 'La misma ciudad para los dos · un intento';
  if (mio) txtDia = 'Hoy: ' + fmt(mio.pasajeros) + (suyo ? ' · ' + otro + ': ' + fmt(suyo.pasajeros) : '');
  else if (suyo) txtDia = otro + ' ya jugó: ' + fmt(suyo.pasajeros) + ' pasajeros';
  const m = $('#menu');
  m.innerHTML = `<div class="menu-caja">
    <div class="menu-arriba"><button class="volver" id="mVolver">‹ Rincón</button><button class="redondo" id="mSonido" aria-label="Sonido">${Sonido.mudo() ? '🔇' : '🔊'}</button></div>
    <div class="plano">${PLANO_SVG}</div>
    <h1 class="titulo">Metro de Curicó<span>el metro que Curicó no tiene</span></h1>
    <div class="botones">
      ${g ? `<button class="boton seguir" id="mSeguir"><span class="b-emo">🚇</span><span class="b-txt"><b>Seguir la partida</b><small>día ${g.dia + 1} · ${fmt(g.pasajeros)} pasajeros${g.modo === 'diario' ? ' · desafío del día' : ''}</small></span></button>` : ''}
      <button class="boton grande" id="mJugar"><span class="b-emo">🚆</span><span class="b-txt"><b>${g ? 'Partida nueva' : 'Jugar'}</b><small>${modo === 'tranquilo' ? 'Sin apuro: nada colapsa' : 'Une las estaciones antes de que se repleten'}</small></span></button>
      <div class="modos"><button class="modo ${modo === 'normal' ? 'on' : ''}" data-modo="normal">⏱️ Normal</button><button class="modo ${modo === 'tranquilo' ? 'on' : ''}" data-modo="tranquilo">☕ Sin apuro</button></div>
      <button class="boton" id="mDia"><span class="b-emo">📅</span><span class="b-txt"><b>Desafío del día</b><small>${esc(txtDia)}</small></span>${mio ? '' : '<span class="b-chip">hoy</span>'}</button>
      <div class="fila"><button class="chico" id="mAyuda"><span class="b-emo">❓</span>Cómo se juega</button><button class="chico" id="mRecords"><span class="b-emo">🏆</span>Récords</button></div>
    </div>
    <div class="pie">${pf.partidas ? `Récord: ${fmt(Math.max(pf.records.normal, pf.records.diario))} pasajeros · ${pf.partidas} ${pf.partidas === 1 ? 'partida' : 'partidas'}` : 'Arrastra el dedo de una estación a otra para trazar una línea'}${quien() ? ' · ' + esc(quien()) : ''}</div>
  </div>`;
  m.hidden = false;
  $('#mVolver').onclick = () => { guardarPerfil(); location.href = '/#juegos'; };
  $('#mSonido').onclick = () => { Sonido.alternar(); Sonido.play('tap'); mostrarMenu(); };
  if (g) $('#mSeguir').onclick = () => { Sonido.listo(); seguir(); };
  $('#mJugar').onclick = () => { Sonido.listo(); empezar(pf.ajustes.modo); };
  m.querySelectorAll('[data-modo]').forEach(b => b.onclick = () => { pf.ajustes.modo = b.dataset.modo; guardarPerfil(); Sonido.play('tap'); mostrarMenu(); });
  $('#mDia').onclick = () => hojaDia();
  $('#mAyuda').onclick = () => hojaAyuda();
  $('#mRecords').onclick = () => hojaRecords();
}
function abrirHoja(html) {
  const h = $('#hoja'); h.innerHTML = '<div class="asa"></div>' + html; $('#hojaFondo').hidden = false;
  $('#hojaFondo').onclick = e => { if (e.target.id === 'hojaFondo') cerrarHoja(); };
  return h;
}
function cerrarHoja() { $('#hojaFondo').hidden = true; $('#hoja').innerHTML = ''; }
function hojaConfirmar(titulo, texto, si, alSi) {
  const h = abrirHoja(`<h3>${esc(titulo)}</h3><p class="sub">${esc(texto)}</p><div class="botones-hoja">
    <button class="boton grande" id="cSi"><span class="b-txt"><b>${esc(si)}</b></span></button><button class="boton" id="cNo"><span class="b-txt"><b>Mejor no</b></span></button></div>`);
  h.querySelector('#cSi').onclick = () => { cerrarHoja(); alSi(); };
  h.querySelector('#cNo').onclick = cerrarHoja;
}
function hojaLinea(c) {
  if (!J || UI.pantalla !== 'juego') return;
  Sonido.play('tap');
  const l = J.lineas.find(x => x.c === c);
  if (c >= J.tengo.lineas) { aviso('🔒', 'Esa línea se abre con las mejoras de la semana'); return; }
  if (!l) { aviso('〰️', 'Arrastra desde una estación para trazar la línea ' + LINEAS[c].n); return; }
  const d = disponible(), trenes = J.trenes.filter(t => t.linea === l.id);
  const cap = trenes.reduce((a, t) => a + capacidadTren(t), 0);
  const h = abrirHoja(`<h3 style="color:${LINEAS[c].color}">Línea ${LINEAS[c].n}</h3>
    <p class="sub">${l.est.length} estaciones${l.loop ? ' · da la vuelta' : ''} · ${trenes.length} ${trenes.length === 1 ? 'tren' : 'trenes'} · caben ${cap} personas</p>
    <div class="botones-hoja">
      <button class="boton ${d.trenes > 0 ? 'grande' : ''}" id="lTren"><span class="b-emo">🚆</span><span class="b-txt"><b>Sumar un tren</b><small>${d.trenes > 0 ? 'te quedan ' + d.trenes : 'llega uno nuevo cada domingo'}</small></span></button>
      ${J.tengo.vagones ? `<button class="boton" id="lVagon"><span class="b-emo">🚃</span><span class="b-txt"><b>Sumar un vagón</b><small>${d.vagones > 0 ? 'te quedan ' + d.vagones : 'no te quedan'}</small></span></button>` : ''}
      ${trenes.length > 1 ? `<button class="boton" id="lQuitarTren"><span class="b-emo">↩️</span><span class="b-txt"><b>Quitar un tren</b><small>queda libre para otra línea</small></span></button>` : ''}
      ${l.loop ? `<button class="boton" id="lAbrir"><span class="b-emo">✂️</span><span class="b-txt"><b>Abrir la vuelta</b><small>vuelve a tener dos puntas</small></span></button>` : ''}
      <button class="boton" id="lBorrar"><span class="b-emo">🗑️</span><span class="b-txt"><b>Borrar la línea</b><small>sus trenes quedan libres</small></span></button>
    </div>`);
  h.querySelector('#lTren').onclick = () => { if (ponerTren(l)) { Sonido.play('tramo'); hojaLinea(c); } else aviso('🚆', 'No te quedan trenes'); };
  const v = h.querySelector('#lVagon'); if (v) v.onclick = () => { if (ponerVagon(l)) { Sonido.play('tramo'); hojaLinea(c); } else aviso('🚃', 'No te quedan vagones'); };
  const q = h.querySelector('#lQuitarTren'); if (q) q.onclick = () => { quitarTren(l); hojaLinea(c); };
  const a = h.querySelector('#lAbrir'); if (a) a.onclick = () => { recortarLinea(l, 'fin'); cerrarHoja(); };
  h.querySelector('#lBorrar').onclick = () => hojaConfirmar('¿Borrar la línea ' + LINEAS[c].n + '?', 'La gente que va arriba se baja en la estación más cercana.', 'Borrar', () => { borrarLinea(l); UI.hudSucio = true; });
}
function hojaAyuda() {
  abrirHoja(`<h3>Cómo se juega</h3><p class="sub">El metro que Curicó no tiene, y lo armas tú</p>
    <div class="paso"><span class="p-emo">👆</span><span><b>Traza líneas</b><small>Arrastra el dedo de una estación a otra. Puedes seguir de largo por varias estaciones en un solo trazo.</small></span></div>
    <div class="paso"><span class="p-emo">〰️</span><span><b>Alarga o acorta</b><small>Arrastra la punta de una línea (la rayita del final) hasta otra estación. Si vuelves a la estación anterior, se acorta. Si llegas a la primera, la línea da la vuelta.</small></span></div>
    <div class="paso"><span class="p-emo">➕</span><span><b>Mete una estación al medio</b><small>Toma un tramo de una línea y arrástralo hasta una estación.</small></span></div>
    <div class="paso"><span class="p-emo">🧽</span><span><b>Borra con la goma</b><small>Toca la goma de abajo y después la línea: se borra entera o, si tocaste una punta, solo ese tramo. Sus trenes, puentes y túneles vuelven a quedar libres.</small></span></div>
    <div class="paso"><span class="p-emo">🧍</span><span><b>La gente sabe adónde va</b><small>El ícono al lado de cada estación dice a qué tipo de lugar quiere ir. Sube al tren que la acerca y combina sola.</small></span></div>
    <div class="paso"><span class="p-emo">⚠️</span><span><b>Que no se repleten</b><small>Si una estación junta más de 6 personas, empieza a llenarse el círculo rojo. Si se completa, el metro cierra.</small></span></div>
    <div class="paso"><span class="p-emo">🎁</span><span><b>Cada domingo</b><small>La Muni te da un tren y eliges una mejora: línea, vagón, puentes, túnel o intercambiador. Toca una línea de abajo para sumarle trenes.</small></span></div>`);
}
function hojaRecords() {
  const pf = PERFIL, otro = Nube.otro(), m = Nube.remoto && otro ? Nube.remoto.marcador[otro] : null;
  abrirHoja(`<h3>Récords</h3><p class="sub">Pasajeros llevados en una partida</p>
    <table class="tabla"><tr><td></td><td><b>${esc(quien() || 'Tú')}</b></td><td><b>${esc(otro || 'La otra persona')}</b></td></tr>
    <tr><td>Mejor partida</td><td class="${m && Math.max(pf.records.normal, pf.records.diario) > m.record ? 'gana' : ''}">${fmt(Math.max(pf.records.normal, pf.records.diario))}</td><td class="${m && m.record > Math.max(pf.records.normal, pf.records.diario) ? 'gana' : ''}">${m ? fmt(m.record) : '–'}</td></tr>
    <tr><td>Más días</td><td>${pf.mejorDias || '–'}</td><td>${m ? (m.mejorDias || '–') : '–'}</td></tr>
    <tr><td>Partidas</td><td>${pf.partidas}</td><td>${m ? m.partidas : '–'}</td></tr>
    <tr><td>Total llevados</td><td>${fmt(pf.total)}</td><td>${m ? fmt(m.total) : '–'}</td></tr>
    <tr><td>Sin apuro</td><td>${fmt(pf.records.tranquilo) || '–'}</td><td></td></tr></table>`);
}
function hojaDia() {
  const hoy = hoyClave(), mio = PERFIL.diario[hoy], otro = Nube.otro(), q = quien() || 'Tú';
  const g = leerPartida(), enCurso = g && g.modo === 'diario' && g.fecha === hoy && !g.practica;
  const yaIntento = PERFIL.diarioIniciado === hoy && !enCurso && !mio;
  const filas = [];
  for (let i = 0; i < 7; i++) {
    const f = hoyClave(Date.now() - i * 86400000), a = PERFIL.diario[f], b = otro ? Nube.diarioDe(f, otro) : null;
    if (!a && !b && i > 0) continue;
    const pa = a ? a.pasajeros : null, pb = b ? b.pasajeros : null;
    filas.push(`<tr><td>${i === 0 ? 'Hoy' : i === 1 ? 'Ayer' : f.slice(8, 10) + '/' + f.slice(5, 7)}</td><td class="${pa !== null && (pb === null || pa > pb) ? 'gana' : ''}">${pa !== null ? fmt(pa) : '–'}</td><td class="${pb !== null && (pa === null || pb > pa) ? 'gana' : ''}">${pb !== null ? fmt(pb) : '–'}</td></tr>`);
  }
  let boton;
  if (enCurso) boton = `<button class="boton seguir" id="dSeguir"><span class="b-emo">🚇</span><span class="b-txt"><b>Seguir el de hoy</b><small>día ${g.dia + 1} · ${fmt(g.pasajeros)} pasajeros</small></span></button>`;
  else if (mio || yaIntento) boton = `<button class="boton" id="dPracticar"><span class="b-emo">🔁</span><span class="b-txt"><b>Practicar el de hoy</b><small>ya usaste tu intento: este no cuenta</small></span></button>`;
  else boton = `<button class="boton grande" id="dJugar"><span class="b-emo">📅</span><span class="b-txt"><b>Jugar el de hoy</b><small>un solo intento</small></span></button>`;
  const h = abrirHoja(`<h3>Desafío del día</h3><p class="sub">Hoy los dos juegan la misma ciudad: las estaciones aparecen en el mismo lugar y en el mismo orden.</p>
    <table class="tabla"><tr><td></td><td><b>${esc(q)}</b></td><td><b>${esc(otro || 'La otra persona')}</b></td></tr>${filas.join('') || '<tr><td colspan="3">Todavía nadie juega</td></tr>'}</table>
    <div class="botones-hoja">${boton}</div>`);
  const a = h.querySelector('#dJugar'); if (a) a.onclick = () => { cerrarHoja(); Sonido.listo(); empezar('diario', false); };
  const p = h.querySelector('#dPracticar'); if (p) p.onclick = () => { cerrarHoja(); Sonido.listo(); empezar('diario', true); };
  const s = h.querySelector('#dSeguir'); if (s) s.onclick = () => { cerrarHoja(); Sonido.listo(); seguir(); };
}
function hojaQuien() {
  const h = abrirHoja(`<h3>¿Quién va a jugar?</h3><p class="sub">Cada uno tiene sus récords.</p><div class="botones-hoja">${PERSONAS.map(p => `<button class="boton grande" data-p="${p}"><span class="b-emo">${p === 'Catalina' ? '🌸' : '🚆'}</span><span class="b-txt"><b>${p}</b></span></button>`).join('')}</div>`);
  h.querySelectorAll('[data-p]').forEach(b => b.onclick = () => {
    try { localStorage.setItem('rinconQuien', b.dataset.p); } catch (e) { /* nada */ }
    PERFIL = leerPerfil(b.dataset.p) || normalizarPerfil({ duenio: b.dataset.p });
    cerrarHoja(); mostrarMenu();
  });
}
function hojaRespaldo(save) {
  const pf = normalizarPerfil(save);
  const h = abrirHoja(`<h3>Encontré tu progreso en la nube</h3><p class="sub">${pf.partidas} partidas y un récord de ${fmt(Math.max(pf.records.normal, pf.records.diario))} pasajeros. En este teléfono tienes menos.</p>
    <div class="botones-hoja"><button class="boton grande" id="rTraer"><span class="b-emo">☁️</span><span class="b-txt"><b>Traerlo a este teléfono</b></span></button>
    <button class="boton" id="rNo"><span class="b-txt"><b>Dejar el de este teléfono</b></span></button></div>`);
  h.querySelector('#rTraer').onclick = () => { PERFIL = pf; guardarPerfil(); cerrarHoja(); mostrarMenu(); };
  h.querySelector('#rNo').onclick = cerrarHoja;
}

/* ============================================================
   ARRANQUE
   ============================================================ */
function arrancar() {
  UI.canvas = $('#lienzo'); UI.ctx = UI.canvas.getContext('2d');
  const q = quien();
  PERFIL = leerPerfil(q) || normalizarPerfil({ duenio: q });
  conectarGanchos(); conectarControles();
  let espera = null;
  const reacomodar = () => { clearTimeout(espera); espera = setTimeout(disponer, 120); };
  addEventListener('resize', reacomodar); addEventListener('orientationchange', reacomodar);
  if (window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', disponer);
  disponer();
  mostrarMenu();
  requestAnimationFrame(bucle);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && UI.pantalla === 'juego' && J && !J.fin) { guardarPartida(); if (UI.vel) pausa(); }
  });
  addEventListener('pagehide', () => { if (UI.pantalla === 'juego') guardarPartida(); else guardarPerfil(); });
  if (!q) setTimeout(hojaQuien, 300);
  Nube.leer().then(() => {
    const mejor = Nube.respaldoMejor();
    if (mejor && !$('#hoja').innerHTML) hojaRespaldo(mejor);
    else if (UI.pantalla === 'menu' && !$('#hoja').innerHTML) mostrarMenu();
  }).catch(() => { /* sin conexión */ });
}
arrancar();
