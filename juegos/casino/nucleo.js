/* ============================================================
   NÚCLEO DEL CASINO — fichas, nube, vestíbulo y cuentas.
   Las fichas de cada persona viven en el localStorage de su
   teléfono (`casinoRincon_v1__<Persona>`, más `_copia`). A Neon
   sube la rama `datos.casino`:
     config   lo que fija Diego en el panel secreto (devolución,
              hora feliz, premios, patrón)
     canjes   los vales de premios de verdad (se ven en los dos teléfonos)
     regalos  fichas que alguien le regala a otra persona
     marcador / respaldo  por persona, con las guardas de siempre
   Siempre se relee justo antes de postear.
   ============================================================ */
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => Math.floor(n || 0).toLocaleString('es-CL');
const objeto = v => (v && typeof v === 'object' && !Array.isArray(v)) ? v : {};
function azar() { try { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] / 4294967296; } catch (e) { return Math.random(); } }
const uid = () => Date.now().toString(36) + Math.floor(azar() * 1e6).toString(36);

const PERSONAS = ['Catalina', 'Diego'];
const INICIAL = 1000, RESCATE = 200;
const API = '/api/estado', RAMA = 'casino';
const quien = () => { try { return localStorage.getItem('rinconQuien') || null; } catch (e) { return null; } };
const otraDe = p => PERSONAS.find(x => x !== p) || null;
const clave = () => 'casinoRincon_v1__' + (quien() || 'invitado');
const FECHA = (() => { try { return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }); } catch (e) { return null; } })();
const hoy = (t = Date.now()) => (FECHA ? FECHA.format(new Date(t)) : new Date(t).toISOString().slice(0, 10));

/* ============================================================
   FICHAS (local, por persona)
   ============================================================ */
function nuevo() { return { v: 2, fichas: INICIAL, mayor: INICIAL, apostado: 0, ganado: 0, jugadas: 0, quiebras: 0, rescate: null, inv: [], mejor: null, diario: { fecha: null, racha: 0 }, pendientes: [], canjeado: 0, regalado: 0, grandes: [] }; }
function leer() {
  for (const k of [clave(), clave() + '_copia']) {
    try {
      const d = JSON.parse(localStorage.getItem(k) || 'null');
      if (d && Number.isFinite(d.fichas)) {
        const c = Object.assign(nuevo(), d);
        for (const a of ['inv', 'pendientes', 'grandes']) if (!Array.isArray(c[a])) c[a] = [];
        c.diario = Object.assign({ fecha: null, racha: 0 }, objeto(c.diario));
        return c;
      }
    } catch (e) { /* sigue */ }
  }
  return nuevo();
}
let C = leer();
function guardar() {
  C.mayor = Math.max(C.mayor, C.fichas);
  C.t = Date.now();
  try {
    const v = localStorage.getItem(clave()); if (v) localStorage.setItem(clave() + '_copia', v);
    localStorage.setItem(clave(), JSON.stringify(C));
    localStorage.setItem('casinoResumen__' + (quien() || 'invitado'), JSON.stringify({ t: Date.now(), fichas: C.fichas, mayor: C.mayor, deben: valesQueDebo().length }));
  } catch (e) { /* nada */ }
  pintarFichas();
}
let fichasAntes = C.fichas;
function pintarFichas() {
  const f = $('#fichas'); if (!f) return;
  f.textContent = '🪙 ' + fmt(C.fichas);
  f.classList.remove('sube', 'baja'); void f.offsetWidth;
  if (C.fichas > fichasAntes) f.classList.add('sube'); else if (C.fichas < fichasAntes) f.classList.add('baja');
  fichasAntes = C.fichas;
}
/* se cobra la apuesta al empezar y se paga lo ganado al final */
function apostar(m, extra) {
  if (!(m > 0) || m > C.fichas) return false;
  C.fichas -= m; C.apostado += m; if (!extra) C.jugadas++;
  Sonido.play('ficha'); guardar(); return true;
}
function pagar(m, apuesta, juego) {
  m = Math.floor(m);
  if (m > 0) { C.fichas += m; C.ganado += m; }
  const neto = m - apuesta;
  if (C.mejor == null || neto > C.mejor) C.mejor = neto;
  if (C.fichas <= 0) C.quiebras++;
  const grande = neto >= Math.max(300, apuesta * 9);
  if (grande) { C.grandes.unshift({ e: juego ? juego.e : '🎰', n: juego ? juego.n : 'Casino', neto, t: Date.now() }); C.grandes = C.grandes.slice(0, 8); }
  guardar();
  if (grande) { Sonido.play('grande'); confeti(160); vibrar([30, 40, 60]); aviso('¡Premio grande! +' + fmt(neto) + ' 🪙', 'gana'); }
  else if (neto > 0) { Sonido.play('gana'); vibrar(20); aviso('+' + fmt(neto) + ' 🪙', 'gana'); }
  else if (m > 0) aviso('Recuperas ' + fmt(m) + ' 🪙');
  else { Sonido.play('pierde'); aviso('−' + fmt(apuesta) + ' 🪙', 'pierde'); }
  if (C.fichas <= 0) setTimeout(quiebra, 900);
  Nube.programar();
}

/* ============================================================
   SONIDOS (comparten el silencio del Rincón: jxMute)
   ============================================================ */
const Sonido = {
  ctx: null, ultimo: {},
  mudo() { try { return localStorage.getItem('jxMute') === '1'; } catch (e) { return false; } },
  alternar() { const m = !this.mudo(); try { localStorage.setItem('jxMute', m ? '1' : '0'); } catch (e) { /* nada */ } return !m; },
  listo() { if (this.mudo()) return null; try { this.ctx = this.ctx || new (window.AudioContext || window.webkitAudioContext)(); if (this.ctx.state === 'suspended') this.ctx.resume(); return this.ctx; } catch (e) { return null; } },
  tono(f, dur, o = {}) {
    const c = this.listo(); if (!c) return;
    const { tipo = 'sine', vol = .07, cuando = 0, f2 = null } = o, t = c.currentTime + cuando;
    const os = c.createOscillator(), g = c.createGain();
    os.type = tipo; os.frequency.setValueAtTime(f, t); if (f2) os.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .008); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    os.connect(g); g.connect(c.destination); os.start(t); os.stop(t + dur + .03);
  },
  play(n) {
    if (this.mudo()) return;
    const ahora = performance.now(); if (ahora - (this.ultimo[n] || 0) < 35) return; this.ultimo[n] = ahora;
    const s = this;
    ({
      tap: () => s.tono(660, .05, { tipo: 'triangle', vol: .035 }),
      ficha: () => { s.tono(1400, .04, { tipo: 'triangle', vol: .04 }); s.tono(1800, .05, { tipo: 'triangle', vol: .03, cuando: .04 }); },
      tic: () => s.tono(1100, .025, { tipo: 'square', vol: .015 }),
      gana: () => [659, 880, 1047].forEach((f, i) => s.tono(f, .18, { tipo: 'triangle', vol: .06, cuando: i * .07 })),
      grande: () => [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => s.tono(f, .3, { tipo: 'triangle', vol: .07, cuando: i * .09 })),
      pierde: () => s.tono(300, .3, { tipo: 'sawtooth', vol: .03, f2: 120 }),
      boom: () => { s.tono(120, .5, { tipo: 'sawtooth', vol: .07, f2: 40 }); s.tono(80, .6, { tipo: 'square', vol: .04, f2: 30, cuando: .05 }); },
      carta: () => s.tono(420 + azar() * 80, .05, { tipo: 'triangle', vol: .04 }),
      gema: () => s.tono(1320, .12, { vol: .05, f2: 1760 }),
      raspar: () => s.tono(200 + azar() * 150, .03, { tipo: 'triangle', vol: .012 }),
      premio: () => [784, 988, 1175, 1568].forEach((f, i) => s.tono(f, .4, { vol: .06, cuando: i * .12 })),
    }[n] || (() => {}))();
  },
};
function vibrar(ms) { try { if (navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) navigator.vibrate(ms); } catch (e) { /* nada */ } }

/* ============================================================
   LO QUE FIJA DIEGO (config) — se lee de la nube, con copia local
   ============================================================ */
const PREMIOS_BASE = [
  { id: 'sushi', e: '🍣', n: 'Sushi acevichado del Tokyo', d: 'El premio mayor', precio: 60000, peso: 0.4, activo: true },
  { id: 'sorpresa', e: '🎁', n: 'Premio sorpresa', d: 'Quien lo debe elige qué es', precio: 15000, peso: 2, activo: true },
  { id: 'masaje', e: '💆', n: 'Masaje de 15 minutos', d: 'Sin apuro', precio: 8000, peso: 3, activo: true },
  { id: 'cafe', e: '☕', n: 'Cafecito con algo dulce', d: 'Donde tú quieras', precio: 6000, peso: 4, activo: true },
  { id: 'helado', e: '🍦', n: 'Helado', d: 'Del sabor que elijas', precio: 5000, peso: 6, activo: true },
  { id: 'chocolate', e: '🍫', n: 'Chocolate', d: 'Uno rico, no de máquina', precio: 4000, peso: 8, activo: true },
  { id: 'pelicula', e: '🍿', n: 'Noche de película', d: 'Tú eliges la película', precio: 3000, peso: 6, activo: true },
];
function configBase() { return { v: 1, t: 0, patron: null, devolucion: { Catalina: NORMAL, Diego: NORMAL }, evento: null, premios: PREMIOS_BASE.map(p => Object.assign({}, p)), antojoPrecio: 2500 }; }
function normalizarConfig(c) {
  const b = configBase(); c = objeto(c);
  const num = (v, d, lo, hi) => (Number.isFinite(+v) ? Math.max(lo, Math.min(hi, +v)) : d);
  const out = { v: 1, t: num(c.t, 0, 0, 9e15), patron: typeof c.patron === 'string' ? c.patron : null, antojoPrecio: Math.round(num(c.antojoPrecio, b.antojoPrecio, 1, 1e7)) };
  out.devolucion = {}; for (const p of PERSONAS) out.devolucion[p] = num(objeto(c.devolucion)[p], NORMAL, 0.5, 1.6);
  const ev = objeto(c.evento);
  out.evento = ev.hasta > Date.now() ? { hasta: +ev.hasta, valor: num(ev.valor, 1.1, 0.5, 1.6), para: ['todos', ...PERSONAS].includes(ev.para) ? ev.para : 'todos' } : null;
  out.premios = (Array.isArray(c.premios) && c.premios.length ? c.premios : b.premios).filter(p => p && p.id && p.n).map(p => ({
    id: String(p.id).slice(0, 40), e: String(p.e || '🎁').slice(0, 8), n: String(p.n).slice(0, 60), d: String(p.d || '').slice(0, 80),
    precio: Math.round(num(p.precio, 5000, 1, 1e8)), peso: num(p.peso, 0, 0, 100), activo: p.activo !== false,
  }));
  return out;
}
function cacheConfig() { try { return JSON.parse(localStorage.getItem('casinoConfig_v1') || 'null'); } catch (e) { return null; } }
let CFG = normalizarConfig(cacheConfig());
function aplicarConfig(c) { CFG = normalizarConfig(c); try { localStorage.setItem('casinoConfig_v1', JSON.stringify(CFG)); } catch (e) { /* nada */ } }
function eventoPara(p) { const ev = CFG.evento; return ev && ev.hasta > Date.now() && (ev.para === 'todos' || ev.para === p) ? ev : null; }
/* la devolución que le toca a quien juega en este teléfono */
function devolucionDe(p) { const ev = eventoPara(p); return ev ? ev.valor : CFG.devolucion[p] || NORMAL; }
const factor = () => devolucionDe(quien() || 'Catalina') / NORMAL;

/* ============================================================
   NUBE — rama `datos.casino`
   ============================================================ */
function normalizarRemoto(o) {
  o = objeto(o);
  return { config: normalizarConfig(o.config), canjes: Array.isArray(o.canjes) ? o.canjes.filter(v => v && v.id) : [], seq: Number.isFinite(o.seq) ? o.seq : 0,
    regalos: objeto(o.regalos), marcador: objeto(o.marcador), respaldo: objeto(o.respaldo) };
}
const Nube = {
  lista: false, remoto: null, enVuelo: false, ultimaSubida: 0, timer: 0,
  async leer() {
    const r = await fetch(API + '?claves=' + RAMA, { cache: 'no-store' });
    if (!r.ok) throw new Error('GET ' + r.status);
    const j = await r.json();
    this.remoto = normalizarRemoto(j && j.data && j.data[RAMA]);
    this.lista = true;
    aplicarConfig(this.remoto.config);
    return this.remoto;
  },
  /* relee, aplica el cambio y postea la rama entera (el API mezcla por clave de primer nivel) */
  async escribir(mutar) {
    if (!this.lista) await this.leer();
    await this.leer();
    const res = mutar(this.remoto);
    const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: { [RAMA]: this.remoto } }) });
    if (!r.ok) throw new Error('POST ' + r.status);
    aplicarConfig(this.remoto.config);
    return res;
  },
  /* subir marcador y respaldo un rato después de jugar (no en cada jugada) */
  programar() { clearTimeout(this.timer); this.timer = setTimeout(() => sincronizar(true), 90000); },
};
const progresoDe = c => (c ? (c.jugadas || 0) + Math.floor((c.canjeado || 0) / 1000) : 0);
async function sincronizar(subir) {
  if (Nube.enVuelo) return;
  Nube.enVuelo = true;
  try {
    await Nube.leer();
    const q = quien();
    const regalos = q ? (Nube.remoto.regalos[q] || []) : [];
    const pend = C.pendientes.slice();
    if (q && (regalos.length || pend.length || subir || Date.now() - Nube.ultimaSubida > 10 * 60000)) {
      let tomados = [];
      await Nube.escribir(R => {
        tomados = Array.isArray(R.regalos[q]) ? R.regalos[q] : [];
        R.regalos[q] = [];
        for (const v of pend) if (!R.canjes.some(x => x.id === v.id)) { R.seq = (R.seq || 0) + 1; R.canjes.push(Object.assign({}, v, { num: R.seq })); }
        /* se guardan los últimos 150 vales; los cumplidos viejos se van primero */
        if (R.canjes.length > 150) { const fuera = R.canjes.filter(v => v.estado === 'cumplido').slice(0, R.canjes.length - 150).map(v => v.id); R.canjes = R.canjes.filter(v => !fuera.includes(v.id)); }
        R.marcador[q] = { t: Date.now(), fichas: C.fichas, mayor: C.mayor, jugadas: C.jugadas, canjeado: C.canjeado };
        const g = R.respaldo[q];
        if (!(progresoDe(C) < 5 && g && g.save && progresoDe(g.save) > progresoDe(C))) R.respaldo[q] = { t: Date.now(), v: 2, save: C };
      });
      C.pendientes = C.pendientes.filter(v => !pend.some(x => x.id === v.id));
      Nube.ultimaSubida = Date.now();
      if (tomados.length) {
        const total = tomados.reduce((a, x) => a + (+x.fichas || 0), 0);
        C.fichas += total; C.regalado += total;
        Sonido.play('premio'); confeti(100);
        tarjeta(`<div class="emo">💌</div><h3>Te regalaron fichas</h3>${tomados.map(x => `<p><b>+${fmt(x.fichas)} 🪙</b> de ${esc(x.de || 'alguien')}${x.msg ? `<br><i>«${esc(x.msg)}»</i>` : ''}</p>`).join('')}<button class="grande" onclick="cerrar()">¡Gracias!</button>`);
      }
      guardar();
    } else guardar();
    if (!estaOcupado() && vista !== 'secreto' && $('#velo').hidden) pintar();
  } catch (e) { /* sin conexión: se intenta después */ }
  finally { Nube.enVuelo = false; }
}
/* vales: los míos y los que debo cumplir */
function todosLosVales() {
  const remotos = Nube.remoto ? Nube.remoto.canjes : [];
  return remotos.concat(C.pendientes.filter(v => !remotos.some(x => x.id === v.id)).map(v => Object.assign({ subiendo: true }, v)));
}
const valesQueDebo = () => (quien() ? todosLosVales().filter(v => v.para === quien() && v.estado !== 'cumplido') : []);

/* ============================================================
   AVISOS, TARJETAS Y CONFETI
   ============================================================ */
function aviso(txt, tipo) {
  const c = $('#avisos'), d = document.createElement('div'); d.className = 'aviso ' + (tipo || ''); d.textContent = txt;
  c.appendChild(d); while (c.children.length > 3) c.firstChild.remove(); setTimeout(() => d.remove(), 2400);
}
function tarjeta(html) { $('#tarjeta').innerHTML = html; $('#velo').hidden = false; }
function cerrar() { $('#velo').hidden = true; }
function confeti(n = 120) {
  const cv = document.createElement('canvas'); cv.className = 'confeti'; cv.width = innerWidth; cv.height = innerHeight; document.body.appendChild(cv);
  const g = cv.getContext('2d'), cols = ['#f2c14e', '#d6463f', '#4f8fd9', '#2fa565', '#f6f1e4', '#f15bb5'];
  const ps = Array.from({ length: n }, () => ({ x: innerWidth / 2, y: innerHeight * .35, vx: (azar() - .5) * 13, vy: -azar() * 13 - 4, c: cols[Math.floor(azar() * cols.length)], r: azar() * 6, s: 4 + azar() * 5 }));
  let f = 0;
  (function paso() {
    g.clearRect(0, 0, cv.width, cv.height);
    for (const p of ps) { p.x += p.vx; p.y += p.vy; p.vy += .35; p.r += .2; g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.fillStyle = p.c; g.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); g.restore(); }
    if (++f < 150) requestAnimationFrame(paso); else cv.remove();
  })();
}
function quiebra() {
  const puede = C.rescate !== hoy();
  tarjeta(`<div class="emo">💸</div><h3>Te quedaste sin fichas</h3><p>Lo perdiste todo. Así es la casa: a la larga siempre gana.</p>
    ${puede ? `<p>Michi te presta <b>${RESCATE} fichas</b> (una vez al día).</p><button class="grande" onclick="rescatar()">Aceptar el préstamo de Michi 🐱</button>` : `<p>Michi ya te prestó hoy. ${C.diario.fecha !== hoy() ? 'Pero todavía puedes cobrar el regalo del día.' : 'Vuelve mañana.'}</p><button class="grande" onclick="cerrar();irA('lobby')">Ok</button>`}`);
}
function rescatar() { if (C.rescate === hoy() || C.fichas >= 10) return cerrar(); C.rescate = hoy(); C.fichas += RESCATE; guardar(); cerrar(); aviso('Michi te prestó ' + RESCATE + ' 🪙'); pintar(); }
function hojaQuien(alElegir) {
  tarjeta(`<div class="emo">🎰</div><h3>¿Quién juega?</h3><p>Cada uno tiene sus fichas en su teléfono. Los premios de verdad los cumple la otra persona.</p>
    ${PERSONAS.map(p => `<button class="grande" data-quien="${p}">${p}</button>`).join('')}`);
  document.querySelectorAll('[data-quien]').forEach(b => b.onclick = () => {
    guardar();
    try { localStorage.setItem('rinconQuien', b.dataset.quien); } catch (e) { /* nada */ }
    C = leer(); fichasAntes = C.fichas; cerrar(); guardar(); pintarCabecera(); pintar(); sincronizar(false);
    if (alElegir) alElegir();
  });
}

/* ============================================================
   REGALO DEL DÍA (racha de hasta 7 días)
   ============================================================ */
const diarioDisponible = () => C.diario.fecha !== hoy();
function montoDiario() { const r = C.diario.fecha === hoy(Date.now() - 86400000) ? Math.min(7, C.diario.racha + 1) : 1; return { racha: r, m: 250 + 50 * (r - 1) }; }
function cobrarDiario() {
  if (!diarioDisponible()) return;
  const { racha, m } = montoDiario();
  C.diario = { fecha: hoy(), racha }; C.fichas += m; C.regalado += m;
  guardar(); Sonido.play('premio'); confeti(70);
  aviso(`Regalo del día: +${fmt(m)} 🪙 (racha ${racha})`, 'gana'); pintar();
}

/* ============================================================
   SELECTOR DE APUESTA (compartido)
   ============================================================ */
let monto = 50;
function selectorHTML() {
  return `<div class="apuesta"><div class="monto"><button class="chip" data-m="mitad">½</button><input id="monto" type="number" inputmode="numeric" min="1" value="${Math.max(1, Math.min(monto, C.fichas || 1))}"><button class="chip" data-m="doble">×2</button></div>
    <div class="chips"><button class="chip" data-m="10">10</button><button class="chip" data-m="50">50</button><button class="chip" data-m="100">100</button><button class="chip" data-m="500">500</button><button class="chip todo" data-m="todo">Todo</button></div></div>`;
}
function conectarSelector() {
  const inp = $('#monto'); if (!inp) return;
  const fijar = v => { monto = Math.max(1, Math.min(C.fichas || 1, Math.floor(v) || 1)); inp.value = monto; };
  inp.oninput = () => { monto = Math.floor(+inp.value) || 0; };
  inp.onblur = () => fijar(inp.value);
  document.querySelectorAll('[data-m]').forEach(b => b.onclick = () => {
    const m = b.dataset.m, v = +inp.value || 0; Sonido.play('tap');
    fijar(m === 'mitad' ? v / 2 : m === 'doble' ? v * 2 : m === 'todo' ? C.fichas : +m);
  });
}
function revisarMonto() {
  const inp = $('#monto'), m = Math.floor(+(inp && inp.value)) || 0; monto = m;
  if (m < 1) { aviso('Elige cuánto apostar'); return 0; }
  if (m > C.fichas) { aviso('No te alcanzan las fichas'); if (C.fichas <= 0) quiebra(); return 0; }
  return m;
}

/* ============================================================
   VESTÍBULO, NAVEGACIÓN Y CUENTAS
   ============================================================ */
const JUEGOS = [];                       // cada archivo de juegos se registra aquí
const juegoDe = id => JUEGOS.find(j => j.id === id);
let vista = 'lobby';
const estaOcupado = () => JUEGOS.some(j => j.ocupado && j.ocupado());
const GRUPOS = [['Mesas', ['ruleta', 'veintiuno', 'dados']], ['Máquinas', ['traga', 'plinko', 'rueda']], ['Al límite', ['cohete', 'minas', 'doble']], ['Cajas y raspes', ['cajas', 'raspe']]];
const pctDev = s => Math.round(s * 1000) / 10 + '%';
function vistaLobby() {
  const s = factor(), q = quien(), ev = eventoPara(q || 'Catalina'), debo = valesQueDebo();
  let h = '';
  if (diarioDisponible()) { const d = montoDiario(); h += `<button class="banner oro" id="bDiario"><span class="emo">🎁</span><span><b>Regalo del día: +${fmt(d.m)} 🪙</b><small>Racha de ${d.racha} ${d.racha === 1 ? 'día' : 'días'}${d.racha < 7 ? ' · mañana da más' : ' · ¡racha máxima!'}</small></span></button>`; }
  if (ev) h += `<div class="banner verde"><span class="emo">🍀</span><span><b>¡Hora feliz!</b><small>La casa devuelve ${pctDev(ev.valor)} hasta las ${new Date(ev.hasta).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</small></span></div>`;
  if (debo.length) h += `<button class="banner rosa" data-ir="premios"><span class="emo">🎟️</span><span><b>Tienes ${debo.length} ${debo.length === 1 ? 'vale' : 'vales'} por cumplir</b><small>${esc(debo.map(v => v.n).slice(0, 3).join(', '))}</small></span></button>`;
  h += `<button class="banner dorado" data-ir="premios"><span class="emo">🍣</span><span><b>Premios de verdad</b><small>Cambia fichas por sushi, helado, chocolate y más</small></span><i>›</i></button>`;
  for (const [nom, ids] of GRUPOS) {
    h += `<h2>${nom}</h2><div class="lobby">`;
    for (const id of ids) {
      const j = juegoDe(id); if (!j) continue;
      h += `<button class="j-card" data-j="${id}" style="--c:${j.col || '#24453a'}"><span class="emo">${j.e}</span><b>${j.n}</b><small>${j.d}</small><i>${j.rtp ? 'devuelve ' + pctDev(j.rtp(s)) : j.nota || ''}</i></button>`;
    }
    h += '</div>';
  }
  if (C.grandes.length) h += `<h2>Tus premios grandes</h2><div class="grandes">${C.grandes.map(g => `<span><i class="emo">${g.e}</i>+${fmt(g.neto)}</span>`).join('')}</div>`;
  h += `<p class="nota">Fichas de juego: no son plata de verdad. Los premios los regala ${esc(otraDe(q) || 'tu pareja')}.</p>`;
  return h;
}
function vistaCuentas() {
  const neto = C.ganado - C.apostado, s = factor(), q = quien();
  return `<h2>📊 Tus cuentas</h2><p class="sub">${esc(q || 'Invitado')}: así va tu casino.</p>
    <div class="stats"><div><small>Fichas</small><b>${fmt(C.fichas)}</b></div><div><small>Lo más que tuviste</small><b>${fmt(C.mayor)}</b></div>
      <div><small>Jugadas</small><b>${fmt(C.jugadas)}</b></div><div><small>Mejor premio</small><b>${C.mejor > 0 ? '+' + fmt(C.mejor) : '—'}</b></div>
      <div><small>Apostado</small><b>${fmt(C.apostado)}</b></div><div><small>Ganancia en juegos</small><b style="color:${neto >= 0 ? '#7fe0a8' : '#ff8d86'}">${neto >= 0 ? '+' : '−'}${fmt(Math.abs(neto))}</b></div>
      <div><small>Regalado (diario y regalos)</small><b>${fmt(C.regalado)}</b></div><div><small>Gastado en premios</small><b>${fmt(C.canjeado)}</b></div>
      <div><small>Veces en cero</small><b>${C.quiebras}</b></div><div><small>Cosas guardadas</small><b>${C.inv.length}</b></div></div>
    <div class="panel"><b>Cuánto devuelve cada juego hoy</b><p class="sub" style="margin:6px 0 8px">De cada 100 fichas apostadas, en promedio vuelven:</p>
      <table class="tabla">${DEVOLUCIONES(s).map(([n, r]) => `<tr><td>${n}</td><td style="color:${r >= 1 ? '#7fe0a8' : 'inherit'}">${(Math.round(r * 1000) / 10).toLocaleString('es-CL')}</td></tr>`).join('')}<tr><td>Veintiuno (jugando bien)</td><td>~99</td></tr></table>
      <p class="sub" style="margin:8px 0 0">${s > 1.0001 ? '🍀 Hoy la casa está generosa.' : s < 0.9999 ? 'Hoy la casa está más dura que de costumbre.' : 'Debajo de 100 la casa gana a la larga: se puede perder todo.'}</p></div>
    <div class="pie"><button id="cSonido">${Sonido.mudo() ? '🔇 Sonido apagado' : '🔊 Sonido encendido'}</button><button id="cQuien">👤 ${esc(q || 'Quién juega')}</button></div>
    <button class="grande rojo" id="reiniciar">Empezar de nuevo con ${fmt(INICIAL)} fichas</button>
    <p class="nota">Fichas de juego: no son plata de verdad ni se pueden cambiar por plata.</p>`;
}
function conectarCuentas() {
  $('#cSonido').onclick = () => { Sonido.alternar(); pintar(); };
  $('#cQuien').onclick = () => hojaQuien();
  $('#reiniciar').onclick = () => {
    tarjeta(`<div class="emo">🔄</div><h3>¿Empezar de nuevo?</h3><p>Se borran tus fichas, tus cosas y tus cuentas. Los vales ya canjeados se mantienen.</p><button class="grande rojo" id="rSi">Sí, de nuevo</button><button class="grande claro" onclick="cerrar()">Mejor no</button>`);
    $('#rSi').onclick = () => { const pend = C.pendientes; C = nuevo(); C.pendientes = pend; fichasAntes = C.fichas; guardar(); cerrar(); pintar(); };
  };
}
function irA(v) {
  if (v === vista) return;
  if (estaOcupado()) { aviso('Espera que termine la jugada'); return; }
  vista = v; pintar(); scrollTo(0, 0);
}
function pintar() {
  const m = $('#mesa');
  if (vista === 'lobby') m.innerHTML = vistaLobby();
  else if (vista === 'cuentas') { m.innerHTML = vistaCuentas(); conectarCuentas(); }
  else if (vista === 'premios') { m.innerHTML = vistaPremios(); conectarPremios(); }
  else if (vista === 'secreto') { m.innerHTML = vistaSecreto(); conectarSecreto(); }
  else { const j = juegoDe(vista.slice(6)); if (!j) { vista = 'lobby'; return pintar(); } m.innerHTML = j.vista(); conectarSelector(); j.conectar(); }
  m.querySelectorAll('[data-j]').forEach(b => b.onclick = () => { Sonido.listo(); Sonido.play('tap'); irA('juego:' + b.dataset.j); });
  m.querySelectorAll('[data-ir]').forEach(b => b.onclick = () => { Sonido.listo(); irA(b.dataset.ir); });
  const d = $('#bDiario'); if (d) d.onclick = () => { Sonido.listo(); cobrarDiario(); };
  const actual = vista.startsWith('juego:') ? (juegoDe(vista.slice(6)) || {}).grupo === 'premios' ? 'premios' : 'lobby' : vista;
  $('#tabs').innerHTML = [['lobby', '🎰', 'Casino'], ['premios', '🍣', 'Premios'], ['cuentas', '📊', 'Cuentas']].map(([id, e, n]) => `<button class="${actual === id ? 'on' : ''}" data-tab="${id}"><i>${e}</i>${n}</button>`).join('');
  document.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { Sonido.listo(); irA(b.dataset.tab); });
  pintarCabecera();
}
function pintarCabecera() {
  $('#txtQuien').textContent = (quien() ? quien() + ' · ' : '') + (eventoPara(quien() || 'Catalina') ? '🍀 hora feliz' : 'fichas de juego');
  $('#btnVolver').setAttribute('aria-label', vista === 'lobby' ? 'Volver a Nuestro Rincón' : 'Volver al casino');
}
function arrancar() {
  $('#btnVolver').onclick = () => {
    if (vista !== 'lobby') { if (estaOcupado()) { aviso('Espera que termine la jugada'); return; } vista = 'lobby'; pintar(); scrollTo(0, 0); return; }
    guardar(); location.href = '/#juegos';
  };
  $('#velo').onclick = e => { if (e.target.id === 'velo' && !$('#tarjeta').querySelector('[data-quien]')) cerrar(); };
  addEventListener('pagehide', () => { JUEGOS.forEach(j => j.alSalir && j.alSalir()); guardar(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) sincronizar(false); else guardar(); });
  setInterval(() => { if (!document.hidden) sincronizar(false); }, 3 * 60000);
  pintarFichas(); pintar();
  if (!quien()) hojaQuien(); else if (C.fichas <= 0) quiebra();
  sincronizar(false);
}
