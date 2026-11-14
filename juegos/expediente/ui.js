/* ============================================================
   INTERFAZ — menú, expediente, registrar lugares, laboratorio,
   interrogatorios y arresto.
   Cada persona tiene su perfil en el localStorage de su aparato
   (`expedienteRincon_v1__<Persona>`, más `_copia`). A Neon sube la
   rama `datos.expediente` (marcador, diario y respaldo), releyendo
   justo antes de postear.
   ============================================================ */
const $ = s => document.querySelector(s);
const PERSONAS = ['Catalina', 'Diego'];
const UI = { caso: null, prog: null, b: null, escala: 1, reloj: 0 };
let PERFIL = null;

/* ---------- utilidades ---------- */
const FECHA_CHILE = (() => { try { return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit' }); } catch (e) { return null; } })();
function hoyClave(t = Date.now()) {
  const d = new Date(t);
  if (FECHA_CHILE) { try { const p = {}; for (const x of FECHA_CHILE.formatToParts(d)) p[x.type] = x.value; if (p.year && p.month && p.day) return `${p.year}-${p.month}-${p.day}`; } catch (e) { /* reloj del aparato */ } }
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function quien() { try { return localStorage.getItem('rinconQuien') || null; } catch (e) { return null; } }
const claveDe = (base, p) => base + '__' + (p || 'invitado');
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const objeto = v => (v && typeof v === 'object' && !Array.isArray(v)) ? v : {};
const azar = a => a[Math.floor(Math.random() * a.length)];
const mayus = s => s.charAt(0).toUpperCase() + s.slice(1);
const fmt = n => Math.round(n || 0).toLocaleString('es-CL');
const miG = () => (quien() === 'Diego' ? 'm' : 'f');
function compa() {
  const q = quien();
  if (q === 'Catalina') return { n: 'Diego', g: 'm' };
  if (q === 'Diego') return { n: 'Catalina', g: 'f' };
  return { n: 'Tomás', g: 'm' };
}
const caraCompa = () => retratoSVG({ n: compa().n, g: compa().g, rol: 'detective', ve: { lentes: false, sombrero: false, canas: false, barba: false } });
const caraMia = () => retratoSVG({ n: quien() || 'Detective', g: miG(), rol: 'detective', ve: { lentes: false, sombrero: false, canas: false, barba: false } });
const caraDe = s => retratoSVG({ n: s.n, g: s.g, rol: s.rol, edad: s.edad, ve: s.ve });
const textoRasgo = (t, valor, g) => conG(valor ? RASGOS[t].si : RASGOS[t].no, g || 'm');

/* ---------- sonidos (comparten el silencio del Rincón) ---------- */
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
  play(n, x) {
    if (this.mudo()) return;
    const ahora = performance.now(); if (ahora - (this.ultimo[n] || 0) < 40) return; this.ultimo[n] = ahora;
    const s = this;
    ({
      tap: () => s.tono(660, .05, { tipo: 'triangle', vol: .04 }),
      bien: () => { const f = 660 * Math.pow(1.06, Math.min(8, x || 0)); s.tono(f, .12, { tipo: 'triangle', vol: .07 }); s.tono(f * 1.5, .16, { vol: .04, cuando: .05 }); },
      mal: () => s.tono(170, .18, { tipo: 'square', vol: .035 }),
      pista: () => [880, 1175].forEach((f, i) => s.tono(f, .15, { vol: .05, cuando: i * .07 })),
      fin: () => [523, 659, 784, 1047].forEach((f, i) => s.tono(f, .3, { tipo: 'triangle', vol: .06, cuando: i * .09 })),
      tiempo: () => [523, 440, 349].forEach((f, i) => s.tono(f, .3, { tipo: 'triangle', vol: .06, cuando: i * .12 })),
      estrella: () => [988, 1319].forEach((f, i) => s.tono(f, .25, { vol: .05, cuando: i * .09 })),
      lab: () => [440, 554, 659].forEach((f, i) => s.tono(f, .2, { tipo: 'triangle', vol: .05, cuando: i * .08 })),
      rasgo: () => [392, 523, 659, 784].forEach((f, i) => s.tono(f, .26, { vol: .05, cuando: i * .08 })),
      arresto: () => { [262, 330, 392, 523].forEach((f, i) => s.tono(f, .4, { tipo: 'triangle', vol: .07, cuando: i * .13 })); s.tono(1047, .7, { vol: .04, cuando: .55 }); },
      frotar: () => s.tono(200 + Math.random() * 120, .04, { tipo: 'triangle', vol: .015 }),
    }[n] || (() => {}))();
  },
};
function vibrar(ms) { try { if (navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) navigator.vibrate(ms); } catch (e) { /* nada */ } }

/* ============================================================
   PERFIL Y GUARDADO
   ============================================================ */
function normalizarPerfil(d) {
  d = objeto(d);
  const num = v => (Number.isFinite(v) ? v : 0);
  return { v: 1, duenio: d.duenio || null, t: d.t || Date.now(), casos: objeto(d.casos), xp: num(d.xp), archivo: num(d.archivo), diario: objeto(d.diario), actual: typeof d.actual === 'string' ? d.actual : null, tutorial: !!d.tutorial };
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
    const act = PERFIL.actual && PERFIL.casos[PERFIL.actual] && !PERFIL.casos[PERFIL.actual].fin ? armarCaso(PERFIL.actual).titulo : null;
    localStorage.setItem(claveDe(JUEGO.resumen, q), JSON.stringify({ t: Date.now(), resueltos: resueltos(PERFIL), xp: PERFIL.xp, rango: rangoDe(PERFIL.xp, miG()).n, actual: act }));
  } catch (e) { /* almacenamiento lleno o bloqueado */ }
}
const progresoDe = pf => pf ? resueltos(pf) * 5 + Math.floor(pf.xp / 50) + Object.keys(pf.casos || {}).length : 0;
function regalarAMichi(monedas, xp) {
  try {
    const p = JSON.parse(localStorage.getItem('rinconMichiPendiente') || 'null') || { monedas: 0, xp: 0 };
    p.monedas = (p.monedas || 0) + monedas; p.xp = (p.xp || 0) + xp; p.de = 'Expediente Curicó';
    localStorage.setItem('rinconMichiPendiente', JSON.stringify(p));
  } catch (e) { /* nada */ }
}
function apariencia() {
  try { const r = JSON.parse(localStorage.getItem('michiResumen__' + (quien() || 'invitado')) || 'null'); if (r) return { pelaje: r.pelaje || 'crema', ropa: r.ropa || null, nombre: r.nombre || 'Michi' }; } catch (e) { /* por defecto */ }
  return { pelaje: 'crema', ropa: null, nombre: 'Michi' };
}
function guardarCaso() { if (UI.caso && UI.prog) PERFIL.casos[UI.caso.id] = UI.prog; guardarPerfil(); }

/* ============================================================
   NUBE — rama `datos.expediente`
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
  async subir(dia) {
    const q = quien(); if (!q || !PERFIL || this.enVuelo) return;
    this.enVuelo = true;
    try {
      await this.escribir(R => {
        R.marcador[q] = { t: Date.now(), resueltos: resueltos(PERFIL), xp: PERFIL.xp };
        if (dia) {
          const d = R.diario[dia.fecha] = objeto(R.diario[dia.fecha]);
          if (!d[q]) d[q] = { err: dia.err, min: dia.min, t: Date.now() };
          const f = Object.keys(R.diario).sort(); while (f.length > 21) delete R.diario[f.shift()];
        }
        const g = R.respaldo[q];
        if (!(progresoDe(PERFIL) < 4 && g && g.save && progresoDe(g.save) > progresoDe(PERFIL))) R.respaldo[q] = { t: Date.now(), v: 1, save: PERFIL };
      });
    } catch (e) { /* sin conexión: se intenta la próxima vez */ }
    finally { this.enVuelo = false; }
  },
  respaldoMejor() { const q = quien(); const g = q && this.remoto && this.remoto.respaldo[q]; return g && g.save && progresoDe(g.save) > progresoDe(PERFIL) + 6 ? normalizarPerfil(g.save) : null; },
  otro() { const q = quien(); return PERSONAS.find(p => p !== q) || null; },
};

/* ============================================================
   TARJETAS Y AVISOS
   ============================================================ */
function abrirTarjeta(html, cerrable) {
  const v = $('#velo'), t = $('#tarjeta');
  t.innerHTML = html; v.hidden = false; t.scrollTop = 0;
  v.onclick = cerrable ? (e => { if (e.target === v) cerrarTarjeta(); }) : null;
  return t;
}
function cerrarTarjeta() { $('#velo').hidden = true; $('#tarjeta').innerHTML = ''; }
function avisar(emo, txt) {
  const c = $('#avisos'), d = document.createElement('div');
  d.className = 'aviso'; d.innerHTML = `<span class="emo">${emo}</span><span>${esc(txt)}</span>`;
  c.appendChild(d); while (c.children.length > 3) c.firstChild.remove();
  setTimeout(() => { d.classList.add('sale'); setTimeout(() => d.remove(), 320); }, 2600);
}
function burbuja(cara, quienHabla, txt, yo) { return `<div class="burbuja ${yo ? 'yo' : ''}"><div class="cara">${cara}</div><div class="txt"><small>${esc(quienHabla)}</small>${esc(txt)}</div></div>`; }
const diceCompa = txt => burbuja(caraCompa(), compa().n, txt);
function confeti(n = 120) {
  const cv = document.createElement('canvas'); cv.className = 'confeti'; cv.width = innerWidth; cv.height = innerHeight; document.body.appendChild(cv);
  const g = cv.getContext('2d'), cols = ['#f2b84b', '#d9534f', '#4f8fd9', '#3fa776', '#f4ecd8'];
  const ps = Array.from({ length: n }, () => ({ x: innerWidth / 2, y: innerHeight * .4, vx: (Math.random() - .5) * 12, vy: -Math.random() * 12 - 4, c: azar(cols), r: Math.random() * 6, s: 4 + Math.random() * 5 }));
  let f = 0;
  (function paso() {
    g.clearRect(0, 0, cv.width, cv.height);
    for (const p of ps) { p.x += p.vx; p.y += p.vy; p.vy += .35; p.r += .2; g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.fillStyle = p.c; g.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); g.restore(); }
    if (++f < 150) requestAnimationFrame(paso); else cv.remove();
  })();
}

/* ============================================================
   MENÚ
   ============================================================ */
function mostrar(id) { for (const p of ['pMenu', 'pCaso', 'pBuscar']) $('#' + p).hidden = p !== id; scrollTo(0, 0); }
function mostrarMenu() {
  UI.caso = null; UI.prog = null;
  mostrar('pMenu');
  const q = quien();
  if (!q) { hojaQuien(true); }
  const g = miG(), rg = rangoDe(PERFIL.xp, g), k = rg.hasta ? (PERFIL.xp - rg.desde) / (rg.hasta - rg.desde) : 1;
  const nRes = resueltos(PERFIL);
  const act = PERFIL.actual && PERFIL.casos[PERFIL.actual] && !PERFIL.casos[PERFIL.actual].fin ? armarCaso(PERFIL.actual) : null;
  let h = `<div class="portada"><h1>Expediente Curicó</h1><div class="sub" style="margin:0">Cada caso empieza en un lugar desordenado</div>
    <div class="rango"><div class="cara">${caraMia()}</div><div style="flex:1"><b>${esc(rg.n)} ${esc(q || '')}</b><small>${nRes} ${nRes === 1 ? 'caso resuelto' : 'casos resueltos'} · ${fmt(PERFIL.xp)} puntos</small><div class="xp"><i style="width:${Math.round(k * 100)}%"></i></div></div></div></div>`;
  if (act) h += `<button class="boton grande" data-caso="${act.id}"><span class="b-emo">📂</span><span class="b-txt"><b>Seguir: ${esc(act.titulo)}</b><small>${esc(act.victima.n)} · ⭐ ${(PERFIL.casos[act.id].est || 0)}</small></span></button>`;
  /* caso del día */
  const hoy = hoyClave(), dia = PERFIL.diario[hoy], cDia = armarCaso('d' + hoy);
  const otro = Nube.otro(), dOtro = otro && Nube.remoto && Nube.remoto.diario[hoy] && Nube.remoto.diario[hoy][otro];
  h += `<div class="dia"><b>🗓️ Caso del día · ${esc(cDia.titulo)}</b><div class="sub" style="color:var(--suave);margin:4px 0 8px">El mismo caso para los dos. Gana quien lo cierre con menos errores.</div>
    <div class="linea"><span>${esc(q || 'Tú')}</span><span>${dia ? (dia.err ? dia.err + ' errores' : '¡sin errores!') + ' · ' + dia.min + ' min' : (PERFIL.casos['d' + hoy] ? 'en curso' : 'sin empezar')}</span></div>
    ${otro ? `<div class="linea"><span>${esc(otro)}</span><span>${dOtro ? (dOtro.err ? dOtro.err + ' errores' : '¡sin errores!') + ' · ' + dOtro.min + ' min' : 'todavía no'}</span></div>` : ''}
    ${dia ? '' : `<button class="boton grande" data-caso="d${hoy}" style="margin-top:10px"><span class="b-emo">🔍</span><span class="b-txt"><b>${PERFIL.casos['d' + hoy] ? 'Seguir el caso del día' : 'Abrir el caso del día'}</b></span></button>`}</div>`;
  /* la historia, por distrito */
  DISTRITOS.forEach((d, di) => {
    const hechos = Array.from({ length: 12 }, (_, i) => PERFIL.casos['h' + (di * 12 + i + 1)]).filter(c => c && c.fin).length;
    h += `<h2>${d.e} ${esc(d.n)} · ${hechos}/12</h2><div class="sub">${esc(d.d)}</div><div class="grilla-casos">`;
    for (let i = 1; i <= 12; i++) {
      const id = 'h' + (di * 12 + i), c = PERFIL.casos[id], abierto = casoAbierto(PERFIL, id);
      const cls = c && c.fin ? 'hecho' : c ? 'actual' : abierto ? '' : 'cerrado';
      h += `<button class="caso-n ${cls}" data-caso="${id}" aria-label="Caso ${di * 12 + i}">${c && c.fin ? '✓' : abierto ? di * 12 + i : '🔒'}<small>${c && c.fin ? 'resuelto' : c ? 'en curso' : ''}</small></button>`;
    }
    h += '</div>';
  });
  /* el archivo */
  h += `<h2>🗄️ El archivo</h2><div class="sub">Casos que no se acaban nunca. ${nRes < 3 ? 'Se abre después de resolver 3 casos.' : 'Cada uno es distinto.'}</div>`;
  const nA = PERFIL.archivo + 1, cA = PERFIL.casos['a' + nA];
  h += `<button class="boton" data-caso="a${nA}" ${nRes < 3 ? 'disabled' : ''}><span class="b-emo">🗂️</span><span class="b-txt"><b>${cA ? 'Seguir' : 'Abrir'} el expediente N° ${nA}</b><small>${nRes < 3 ? 'Faltan ' + (3 - nRes) + ' casos' : esc(armarCaso('a' + nA).titulo)}</small></span></button>`;
  const copia = Nube.respaldoMejor();
  if (copia) h += `<button class="boton" id="mRestaurar"><span class="b-emo">☁️</span><span class="b-txt"><b>Hay un respaldo con más avance</b><small>${resueltos(copia)} casos resueltos en la nube</small></span></button>`;
  h += `<div class="pie"><button id="mAyuda">❓ Cómo se juega</button><button id="mQuien">👤 ${esc(q || 'Quién juega')}</button><button id="mSonido">${Sonido.mudo() ? '🔇' : '🔊'} Sonido</button><button id="mVolver">🏠 Volver al Rincón</button></div>`;
  const m = $('#pMenu'); m.innerHTML = h;
  m.querySelectorAll('[data-caso]').forEach(b => b.onclick = () => {
    Sonido.listo(); Sonido.play('tap');
    const id = b.dataset.caso;
    if (id[0] === 'h' && !casoAbierto(PERFIL, id)) { avisar('🔒', 'Primero resuelve el caso anterior'); return; }
    abrirCaso(id);
  });
  $('#mAyuda').onclick = hojaAyuda;
  $('#mQuien').onclick = () => hojaQuien(false);
  $('#mSonido').onclick = () => { Sonido.alternar(); mostrarMenu(); };
  $('#mVolver').onclick = () => { guardarPerfil(); location.href = '/#juegos'; };
  const r = $('#mRestaurar'); if (r) r.onclick = () => hojaRespaldo(copia);
}
function hojaQuien(obligatorio) {
  const t = abrirTarjeta(`<div class="gran-emo">🕵️</div><h3>¿Quién investiga?</h3><p class="centro">Cada uno lleva su propia carpeta de casos en este teléfono.</p>
    <div class="acciones">${PERSONAS.map(p => `<button class="acc ${p === quien() ? 'oro' : ''}" data-p="${p}">${p}</button>`).join('')}${obligatorio ? '' : '<button class="acc suave" id="qNo">Cancelar</button>'}</div>`, !obligatorio);
  t.querySelectorAll('[data-p]').forEach(b => b.onclick = () => {
    guardarPerfil();
    try { localStorage.setItem('rinconQuien', b.dataset.p); } catch (e) { /* nada */ }
    PERFIL = leerPerfil(b.dataset.p) || normalizarPerfil({ duenio: b.dataset.p });
    cerrarTarjeta(); guardarPerfil(); Nube.leer().then(mostrarMenu).catch(mostrarMenu); mostrarMenu();
  });
  const n = t.querySelector('#qNo'); if (n) n.onclick = cerrarTarjeta;
}
function hojaRespaldo(copia) {
  const t = abrirTarjeta(`<div class="gran-emo">☁️</div><h3>Respaldo en la nube</h3><p>En la nube hay una carpeta con <b>${resueltos(copia)} casos resueltos</b> y ${fmt(copia.xp)} puntos. En este teléfono tienes ${resueltos(PERFIL)} casos.</p>
    <div class="acciones"><button class="acc oro" id="rSi">Usar el respaldo</button><button class="acc suave" id="rNo">Dejar lo de este teléfono</button></div>`, true);
  t.querySelector('#rSi').onclick = () => { PERFIL = copia; guardarPerfil(); cerrarTarjeta(); avisar('☁️', 'Carpeta restaurada'); mostrarMenu(); };
  t.querySelector('#rNo').onclick = cerrarTarjeta;
}
function hojaAyuda() {
  abrirTarjeta(`<h3>Cómo se juega</h3>
    <p>🔍 <b>Registra los lugares.</b> Encuentra lo que pide la lista antes de que se acabe el tiempo. Tocar donde no hay nada te quita segundos. Si encadenas aciertos rápidos, el puntaje se multiplica.</p>
    <p>⭐ <b>Cada registro da estrellas</b> (más mientras mejor lo hagas). Con ellas pagas la autopsia, el laboratorio y los interrogatorios.</p>
    <p>🧪 <b>Examina las pistas</b> (limpiar, buscar huellas, armar un papel roto, abrir un celular o comparar muestras) y mándalas al laboratorio: cada resultado te dice algo del culpable.</p>
    <p>🗣️ <b>Interroga a los sospechosos.</b> En su ficha verás si calzan con lo que sabes del culpable.</p>
    <p>🚔 <b>Arresta</b> a quien calce con todo. Si te equivocas, cuenta como error.</p>
    <p>🐱 Si te pierdes, toca a ${esc(apariencia().nombre)}: olfatea uno de los objetos de la lista.</p>
    <div class="acciones"><button class="acc oro" onclick="cerrarTarjeta()">Entendido</button></div>`, true);
}

/* ============================================================
   EL EXPEDIENTE
   ============================================================ */
function abrirCaso(id) {
  const c = armarCaso(id), nuevo = !PERFIL.casos[id];
  UI.caso = c; UI.prog = normalizarProgreso(c, PERFIL.casos[id]);
  PERFIL.actual = id;
  guardarCaso();
  pintarCaso();
  if (nuevo) {
    const t = abrirTarjeta(`<div class="gran-emo">🚨</div><h3>${esc(c.titulo)}</h3><p class="centro">${esc(c.intro)}</p>
      <div class="dialogo">${diceCompa(azar(FRASES.inicio))}</div>
      <div class="acciones"><button class="acc oro" id="iIr">Registrar ${esc(articulo(c.escenas[0]))}</button><button class="acc suave" id="iVer">Ver el expediente</button></div>`);
    t.querySelector('#iIr').onclick = () => { cerrarTarjeta(); iniciarBusqueda(0); };
    t.querySelector('#iVer').onclick = cerrarTarjeta;
  }
}
const estrellasTxt = n => '★'.repeat(n) + '☆'.repeat(5 - n);
function pintarCaso() {
  const c = UI.caso, p = UI.prog;
  if (!c) return;
  mostrar('pCaso');
  const conocidos = rasgosConocidos(c, p);
  const ahora = Date.now();
  let h = `<div class="barra-sup"><button class="redondo" id="cVolver" aria-label="Volver">‹</button><h1>${esc(c.titulo)}</h1><span class="chip-est" id="cEst">⭐ ${p.est}</span></div>`;
  /* víctima y perfil */
  const v = c.victima;
  h += `<div class="ficha"><div class="victima"><div class="cara">${retratoSVG({ n: v.n, g: v.g, rol: v.rol, edad: v.edad })}</div><div><b>${esc(v.n)}</b><p>${esc(mayus(v.rol))}, ${v.edad} años. Sin vida en ${esc(articulo(c.escenas[0]))}.${hecha(p, 'auto') ? ' Causa: ' + esc(c.arma.causa) + '.' : ''}${hecha(p, 'arma') ? ' Arma: ' + OBJETO[c.arma.obj].e + ' ' + esc(OBJETO[c.arma.obj].n.toLowerCase()) + '.' : ''}</p></div></div>
    <div class="sub" style="color:var(--suave);margin:12px 0 0">Lo que sabemos del culpable</div><div class="perfil">`;
  for (const t of conocidos) h += `<span class="rasgo"><span class="emo">${RASGOS[t].e}</span>${esc(mayus(RASGOS[t].cul))}</span>`;
  for (let i = conocidos.length; i < c.rasgos.length; i++) h += '<span class="rasgo falta">?</span>';
  h += '</div></div>';
  /* qué hacer */
  h += '<h2>Qué hacer ahora</h2>';
  for (const t of tareasDisponibles(c, p)) h += tarjetaTarea(c, p, t, ahora);
  /* lugares */
  h += '<h2>Lugares</h2><div class="lugares">';
  c.escenas.forEach((e, i) => {
    const ab = lugarAbierto(c, p, i), lug = p.lug[i];
    h += `<button class="lugar ${ab ? '' : 'cerrado'}" data-lugar="${i}"><div class="mini">${escenaSVG(e)}</div><div class="l-info"><b>${esc(ESCENAS[e].n)}</b>${ab ? `<span class="l-est">${estrellasTxt(nivelLugar(lug.p))}</span><br>${lug.v ? 'Registrar de nuevo' : '¡Por registrar!'}` : 'Todavía no'}</div></button>`;
  });
  h += '</div>';
  /* sospechosos */
  const vistos = sospechososVistos(c, p);
  h += `<h2>Sospechosos</h2>${vistos.length ? '<div class="sospechosos">' + vistos.map(s => fichaSosp(c, p, s, conocidos)).join('') + '</div>' : '<div class="sub">Aparecerán al registrar los lugares.</div>'}`;
  /* pistas */
  const pistas = c.pistas.filter(x => p.ex[x.key] || disponible(c, p, tareaDe(c, x.key)));
  if (pistas.length || hecha(p, 'auto')) {
    h += '<h2>Pistas</h2>';
    if (hecha(p, 'auto')) h += `<div class="pista-item"><span class="emo">🩺</span><span><b>Autopsia.</b> ${esc(mayus(c.arma.causa))}. El culpable ${esc(RASGOS[c.rAuto].cul)}.</span></div>`;
    for (const x of pistas) {
      const o = OBJETO[x.obj], estado = p.ex[x.key];
      const txt = estado === 'listo' ? esc(x.txt) : estado === 'lab' ? 'En el laboratorio.' : estado === 'examinada' ? 'Examinada: falta mandarla al laboratorio.' : 'Sin examinar.';
      h += `<div class="pista-item"><span class="emo">${o.e}</span><span><b>${esc(o.n)}${x.arma ? ' (el arma)' : ''}.</b> ${txt}</span></div>`;
    }
  }
  const pc = $('#pCaso'); pc.innerHTML = h;
  $('#cVolver').onclick = () => { guardarCaso(); mostrarMenu(); };
  pc.querySelectorAll('[data-tarea]').forEach(b => b.onclick = () => { Sonido.listo(); accionTarea(b.dataset.tarea, b.dataset.acc); });
  pc.querySelectorAll('[data-lugar]').forEach(b => b.onclick = () => {
    Sonido.listo();
    const i = +b.dataset.lugar;
    if (!lugarAbierto(c, p, i)) { avisar('🔒', 'Todavía no hay razón para ir ahí'); return; }
    iniciarBusqueda(i);
  });
  pc.querySelectorAll('[data-sosp]').forEach(b => b.onclick = () => hojaSospechoso(+b.dataset.sosp));
}
function tarjetaTarea(c, p, t, ahora) {
  const card = (emo, titulo, sub, boton, acc, clase) => `<div class="tarea ${clase || ''}"><span class="t-emo">${emo}</span><span class="t-txt"><b>${titulo}</b><small>${sub}</small></span>${boton ? `<button class="t-btn ${acc === 'apurar' ? 'gris' : ''}" data-tarea="${t.id}" data-acc="${acc}">${boton}</button>` : ''}</div>`;
  const espera = key => `<span data-fin="${p.lab[key]}">${reloj(p.lab[key] - ahora)}</span>`;
  if (t.tipo === 'buscar') return card('🔍', 'Registrar ' + esc(articulo(c.escenas[t.esc])), t.esc === 0 ? 'Ahí encontraron a la víctima.' : 'Puede haber algo nuevo ahí.', 'Ir', 'buscar');
  if (t.tipo === 'autopsia') {
    if (p.lab.auto == null) return card('🩺', 'Pedir la autopsia', 'El forense dirá cómo murió y algo del culpable.', '⭐ ' + COSTO.autopsia, 'pagar');
    if (!labListo(p, 'auto', ahora)) return card('⏳', 'Autopsia en curso', 'Lista en ' + espera('auto'), '⭐ ' + COSTO.apurar + ' ya', 'apurar', 'espera');
    return card('🩺', 'La autopsia está lista', 'Ve el resultado.', 'Ver', 'ver');
  }
  if (t.tipo === 'examen') {
    const x = pistaDe(c, t.pista), o = OBJETO[x.obj], ex = EXAMENES[x.como];
    if (!p.ex[x.key]) return card(o.e, 'Examinar ' + esc(o.n.toLowerCase()) + (x.arma ? ' (el arma)' : ''), ex.e + ' ' + esc(ex.n), 'Examinar', 'examinar');
    if (p.ex[x.key] === 'examinada') return card('🧪', 'Mandar ' + esc(o.n.toLowerCase()) + ' al laboratorio', 'Nos dirá algo del culpable.', '⭐ ' + COSTO.lab, 'pagar');
    if (!labListo(p, x.key, ahora)) return card('⏳', esc(o.n) + ' en el laboratorio', 'Listo en ' + espera(x.key), '⭐ ' + COSTO.apurar + ' ya', 'apurar', 'espera');
    return card('🧪', 'Llegó el resultado: ' + esc(o.n.toLowerCase()), 'Ve qué encontraron.', 'Ver', 'ver');
  }
  if (t.tipo === 'hablar' || t.tipo === 'hablar2') {
    const s = c.sosp[t.sosp];
    return card(t.tipo === 'hablar' ? '🗣️' : '❗', (t.tipo === 'hablar' ? 'Hablar con ' : 'Volver a interrogar a ') + esc(s.n), esc(mayus(s.rol)) + ' de ' + esc(c.victima.n.split(' ')[0]) + (t.tipo === 'hablar2' ? ' · algo no cuadra' : ''), '⭐ ' + costoDe(t), 'hablar');
  }
  if (t.tipo === 'arresto') return card('🚔', 'Arrestar al culpable', 'Ya está todo: elige a quien calce con el perfil.', 'Elegir', 'arresto', 'arresto');
  return '';
}
function fichaSosp(c, p, s, conocidos) {
  const habl = hablado(c, p, s.i);
  const chips = conocidos.map(t => { const v = valorVisto(c, p, s, t); return `<span class="s-r ${v === true ? 'si' : v === false ? 'no' : 'nose'}">${RASGOS[t].e} ${v == null ? '?' : esc(textoRasgo(t, v, s.g))}</span>`; }).join('');
  return `<button class="sosp ${habl ? '' : 'sin-hablar'}" data-sosp="${s.i}"><div class="s-cab"><div class="cara">${caraDe(s)}</div><div><b>${esc(s.n)}</b><small>${esc(mayus(s.rol))} · ${s.edad} años</small></div></div><div class="s-rasgos">${chips || `<small>${habl ? 'Sin datos del culpable aún' : 'Sin interrogar'}</small>`}</div></button>`;
}
function reloj(ms) { const s = Math.max(0, Math.ceil(ms / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
/* las cuentas regresivas del laboratorio */
setInterval(() => {
  if ($('#pCaso').hidden || !UI.caso) return;
  let repintar = false;
  document.querySelectorAll('[data-fin]').forEach(el => { const f = +el.dataset.fin - Date.now(); el.textContent = reloj(f); if (f <= 0) repintar = true; });
  if (repintar && $('#velo').hidden) { Sonido.play('lab'); pintarCaso(); }
}, 1000);

function faltanEstrellas() {
  const c = UI.caso, p = UI.prog;
  const i = [0, 1, 2].filter(k => lugarAbierto(c, p, k)).sort((a, b) => p.lug[a].v - p.lug[b].v)[0];
  const t = abrirTarjeta(`<div class="gran-emo">⭐</div><h3>Faltan estrellas</h3><div class="dialogo">${diceCompa(azar(FRASES.faltan))}</div>
    <div class="acciones"><button class="acc oro" id="fIr">Registrar ${esc(articulo(c.escenas[i]))}</button><button class="acc suave" id="fNo">Después</button></div>`, true);
  t.querySelector('#fIr').onclick = () => { cerrarTarjeta(); iniciarBusqueda(i); };
  t.querySelector('#fNo').onclick = cerrarTarjeta;
}
function accionTarea(id, acc) {
  const c = UI.caso, p = UI.prog, t = tareaDe(c, id);
  if (!t) return;
  Sonido.play('tap');
  if (acc === 'buscar') return iniciarBusqueda(t.esc);
  if (acc === 'arresto') return hojaArresto();
  if (acc === 'hablar') {
    const r = conversar(c, p, id);
    if (!r.ok) return r.motivo === 'estrellas' ? faltanEstrellas() : null;
    guardarCaso(); pintarCaso(); return hojaCharla(r.sosp, r.segunda, r.guia);
  }
  const key = t.tipo === 'autopsia' ? 'auto' : t.pista;
  if (acc === 'examinar') return hojaExamen(key);
  if (acc === 'pagar') {
    const r = mandarAlLab(c, p, key);
    if (!r.ok) return r.motivo === 'estrellas' ? faltanEstrellas() : null;
    Sonido.play('lab'); guardarCaso(); pintarCaso();
    avisar(key === 'auto' ? '🩺' : '🧪', key === 'auto' ? 'El forense ya está trabajando' : 'Va camino al laboratorio');
    if (!PERFIL.tutorial) { PERFIL.tutorial = true; guardarPerfil(); abrirTarjeta(`<div class="gran-emo">⏳</div><h3>Mientras esperan</h3><div class="dialogo">${diceCompa(azar(FRASES.autopsia))}</div><div class="acciones"><button class="acc oro" onclick="cerrarTarjeta()">Ya</button></div>`, true); }
    return;
  }
  if (acc === 'apurar') {
    const r = apurar(p, key);
    if (!r.ok) return r.motivo === 'estrellas' ? faltanEstrellas() : null;
    guardarCaso(); pintarCaso(); return;
  }
  if (acc === 'ver') {
    const r = verResultado(c, p, key);
    if (!r.ok) return;
    Sonido.play('rasgo'); vibrar(30); guardarCaso(); pintarCaso();
    const x = key === 'auto' ? null : pistaDe(c, key);
    const cuerpo = key === 'auto'
      ? `<div class="gran-emo">🩺</div><h3>Resultado de la autopsia</h3><p>La causa de muerte fue ${esc(c.arma.causa)}. Por la forma de las lesiones y lo que había bajo las uñas, el forense está seguro de algo: el culpable ${esc(RASGOS[r.rasgo].cul)}.</p>`
      : `<div class="gran-emo">${OBJETO[x.obj].e}</div><h3>Resultado del laboratorio</h3><p>${esc(x.txt)}</p>`;
    const tt = abrirTarjeta(`${cuerpo}<div class="nuevo-rasgo"><span class="emo">${RASGOS[r.rasgo].e}</span><span><small>Nuevo dato del culpable</small><br><b>${esc(mayus(RASGOS[r.rasgo].cul))}</b></span></div>
      <div class="dialogo">${diceCompa(azar(FRASES.rasgo))}</div><div class="acciones"><button class="acc oro" id="vOk">Anotar</button></div>`);
    tt.querySelector('#vOk').onclick = () => { cerrarTarjeta(); pintarCaso(); };
  }
}

/* ---------- interrogatorios ---------- */
function hojaCharla(s, segunda, guia) {
  const c = UI.caso, p = UI.prog, nv = c.victima.n.split(' ')[0], yo = quien() || 'Detective';
  let d = '';
  if (!segunda) {
    d += burbuja(caraMia(), yo, `Buenas. Investigamos lo que le pasó a ${nv}. ¿Qué relación tenía con ${c.victima.g === 'f' ? 'ella' : 'él'}?`, true);
    d += burbuja(caraDe(s), s.n.split(' ')[0], s.d1);
    d += burbuja(caraMia(), yo, '¿Y dónde estaba esa noche?', true);
    d += burbuja(caraDe(s), s.n.split(' ')[0], s.coartada);
  } else {
    d += burbuja(caraMia(), yo, 'Encontramos algo que no cuadra con lo que nos dijo. Mejor cuéntenos todo.', true);
    d += burbuja(caraDe(s), s.n.split(' ')[0], s.d2);
  }
  if (guia) d += diceCompa(`Mencionó ${articulo(c.escenas[guia])}. Vamos a registrarlo.`);
  else d += diceCompa(azar(FRASES.hablar));
  const conocidos = rasgosConocidos(c, p);
  const datos = conocidos.length ? `<div class="sosp" style="margin-top:10px;background:#fff"><small>Lo que sabemos de ${esc(s.n.split(' ')[0])}</small><div class="s-rasgos">${conocidos.map(t => { const v = valorVisto(c, p, s, t); return `<span class="s-r ${v ? 'si' : 'no'}">${RASGOS[t].e} ${esc(textoRasgo(t, v, s.g))}</span>`; }).join('')}</div></div>` : '';
  const t = abrirTarjeta(`<div class="cara-grande">${caraDe(s)}</div><h3>${esc(s.n)}</h3><p class="centro" style="margin:0;color:var(--suave)">${esc(mayus(s.rol))} · ${s.edad} años</p><div class="dialogo">${d}</div>${datos}
    <div class="acciones"><button class="acc oro" id="hOk">Anotar en el expediente</button></div>`);
  t.querySelector('#hOk').onclick = () => { cerrarTarjeta(); pintarCaso(); };
}
function hojaSospechoso(i) {
  const c = UI.caso, p = UI.prog, s = c.sosp[i], habl = hablado(c, p, i);
  const segunda = c.tareas.find(t => t.tipo === 'hablar2' && t.sosp === i && hecha(p, t.id));
  const conocidos = rasgosConocidos(c, p);
  abrirTarjeta(`<div class="cara-grande">${caraDe(s)}</div><h3>${esc(s.n)}</h3><p class="centro" style="margin:0;color:var(--suave)">${esc(mayus(s.rol))} · ${s.edad} años</p>
    ${habl ? `<div class="dialogo">${burbuja(caraDe(s), s.n.split(' ')[0], s.d1)}${burbuja(caraDe(s), s.n.split(' ')[0], s.coartada)}${segunda ? burbuja(caraDe(s), s.n.split(' ')[0], s.d2) : ''}</div>` : '<p class="centro">Todavía no hablan con esta persona.</p>'}
    ${conocidos.length ? `<div class="s-rasgos" style="display:flex;flex-wrap:wrap;gap:5px;margin-top:10px">${conocidos.map(t => { const v = valorVisto(c, p, s, t); return `<span class="rasgo ${v == null ? 'falta' : ''}" style="${v === false ? 'background:#a8504a' : ''}"><span class="emo">${RASGOS[t].e}</span>${v == null ? '¿' + esc(RASGOS[t].cul) + '?' : esc(textoRasgo(t, v, s.g))}</span>`; }).join('')}</div>` : ''}
    <div class="acciones"><button class="acc suave" onclick="cerrarTarjeta()">Cerrar</button></div>`, true);
}

/* ---------- arresto ---------- */
function hojaArresto() {
  const c = UI.caso, p = UI.prog, conocidos = rasgosConocidos(c, p);
  let sel = null;
  const pintar = () => {
    const t = abrirTarjeta(`<div class="gran-emo">🚔</div><h3>¿Quién fue?</h3><div class="dialogo">${diceCompa(azar(FRASES.arresto))}</div>
      <div class="perfil" style="justify-content:center">${conocidos.map(r => `<span class="rasgo"><span class="emo">${RASGOS[r].e}</span>${esc(mayus(RASGOS[r].cul))}</span>`).join('')}</div>
      <div class="arrestar-lista">${sospechososVistos(c, p).map(s => fichaSosp(c, p, s, conocidos).replace('class="sosp', `class="sosp ${sel === s.i ? 'sel' : ''}`)).join('')}</div>
      <div class="acciones"><button class="acc ${sel == null ? 'suave' : 'oro'}" id="aSi" ${sel == null ? 'disabled' : ''}>${sel == null ? 'Toca a un sospechoso' : 'Arrestar a ' + esc(c.sosp[sel].n)}</button><button class="acc suave" id="aNo">Todavía no</button></div>`, true);
    t.querySelectorAll('[data-sosp]').forEach(b => b.onclick = () => { sel = +b.dataset.sosp; Sonido.play('tap'); pintar(); });
    t.querySelector('#aNo').onclick = cerrarTarjeta;
    t.querySelector('#aSi').onclick = () => { if (sel != null) resolverArresto(sel); };
  };
  pintar();
}
function resolverArresto(i) {
  const c = UI.caso, p = UI.prog, s = c.sosp[i];
  const r = arrestar(c, p, i);
  if (!r.ok) return;
  if (!r.acierto) {
    Sonido.play('mal'); vibrar([60, 40, 60]); guardarCaso();
    const falla = c.rasgos.find(t => !s.val[t]);
    const t = abrirTarjeta(`<div class="cara-grande">${caraDe(s)}</div><h3>No fue ${s.g === 'f' ? 'ella' : 'él'}</h3><p class="centro">${esc(s.n)} ${esc(textoRasgo(falla, false, s.g).toLowerCase())}, y el culpable ${esc(RASGOS[falla].cul)}. Tuvimos que dejarl${s.g === 'f' ? 'a' : 'o'} ir.</p>
      <div class="dialogo">${diceCompa(azar(FRASES.error))}</div><div class="acciones"><button class="acc oro" id="eOk">Volver a mirar</button></div>`);
    t.querySelector('#eOk').onclick = () => { cerrarTarjeta(); hojaArresto(); };
    return;
  }
  Sonido.play('arresto'); vibrar([40, 30, 80]); confeti(140);
  const monedas = monedasCaso(c, p), min = Math.max(1, Math.round((p.fin - p.ini) / 60000));
  PERFIL.xp += r.puntos;
  if (c.tipo === 'a') PERFIL.archivo = Math.max(PERFIL.archivo, c.n);
  let dia = null;
  if (c.tipo === 'd') { const fecha = c.id.slice(1); if (!PERFIL.diario[fecha]) { PERFIL.diario[fecha] = { err: p.err, min }; dia = { fecha, err: p.err, min }; } }
  if (PERFIL.actual === c.id) PERFIL.actual = null;
  regalarAMichi(monedas, Math.round(monedas / 2));
  guardarCaso(); Nube.subir(dia);
  const rg = rangoDe(PERFIL.xp, miG());
  const t = abrirTarjeta(`<div class="cara-grande">${caraDe(s)}</div><h3>${esc(s.n)}</h3>
    <div class="dialogo">${burbuja(caraDe(s), s.n.split(' ')[0], s.conf)}</div>
    <div class="gran-emo" style="margin-top:12px">🗂️</div><h3>Caso cerrado</h3>
    <p class="centro">${p.err ? p.err + (p.err === 1 ? ' error' : ' errores') : '¡Sin errores!'} · ${min} min · +${r.puntos} puntos<br>${esc(apariencia().nombre)} recibe 🪙 ${monedas} en su casita</p>
    <p class="centro" style="color:var(--suave)">Rango: ${esc(rg.n)}</p>
    <div class="dialogo">${diceCompa(azar(FRASES.cierre))}</div>
    <div class="acciones"><button class="acc oro" id="cOk">${siguienteCaso(c) ? 'Siguiente caso' : 'Volver a la carpeta'}</button><button class="acc suave" id="cMenu">Ver la carpeta</button></div>`);
  t.querySelector('#cOk').onclick = () => { cerrarTarjeta(); const sig = siguienteCaso(c); if (sig) abrirCaso(sig); else mostrarMenu(); };
  t.querySelector('#cMenu').onclick = () => { cerrarTarjeta(); mostrarMenu(); };
}
function siguienteCaso(c) {
  if (c.tipo === 'h' && c.n < CASOS_HISTORIA) return 'h' + (c.n + 1);
  if (c.tipo === 'a') return 'a' + (c.n + 1);
  return null;
}

/* ============================================================
   EXAMINAR PISTAS — los minijuegos
   ============================================================ */
function hojaExamen(key) {
  const c = UI.caso, x = pistaDe(c, key), o = OBJETO[x.obj], ex = EXAMENES[x.como];
  const t = abrirTarjeta(`<h3>${ex.e} ${esc(ex.n)}</h3><p class="centro" style="margin-top:0;color:var(--suave);font-size:14px">${esc(o.n)}${x.arma ? ' · el arma' : ''}. ${esc(ex.d)}</p><div id="juego"></div>
    <div class="acciones"><button class="acc suave" id="xNo">Después</button></div>`);
  t.querySelector('#xNo').onclick = () => { cerrarTarjeta(); pintarCaso(); };
  const area = t.querySelector('#juego');
  const listo = () => {
    examinar(c, UI.prog, key); guardarCaso(); Sonido.play('fin'); vibrar(25);
    const tt = abrirTarjeta(`<div class="gran-emo">${o.e}</div><h3>¡Listo!</h3><p class="centro">Ahora el laboratorio tiene con qué trabajar.</p>
      <div class="acciones"><button class="acc oro" id="xLab">Mandar al laboratorio · ⭐ ${COSTO.lab}</button><button class="acc suave" id="xDesp">Después</button></div>`);
    tt.querySelector('#xLab').onclick = () => { cerrarTarjeta(); accionTarea(key, 'pagar'); };
    tt.querySelector('#xDesp').onclick = () => { cerrarTarjeta(); pintarCaso(); };
  };
  const k = c.pistas.indexOf(x);
  if (x.como === 'limpiar') juegoFrotar(area, `<span class="emo">${o.e}</span>`, 'barro', listo);
  else if (x.como === 'polvo') juegoFrotar(area, `<span class="emo" style="opacity:.55">${o.e}</span><div class="f-huella">${huellaSVG(c.huella + k)}</div>`, 'polvo', () => juegoHuella(area, c.huella + k, listo));
  else if (x.como === 'micro') juegoMicro(area, c.muestra + k * 37, listo);
  else if (x.como === 'armar') juegoArmar(area, c, listo);
  else juegoClave(area, c.clave, o, listo);
}
/* frotar: limpiar barro o espolvorear para ver la huella */
function juegoFrotar(area, debajo, tipo, alFin) {
  area.innerHTML = `<div class="frotar"><div class="f-debajo">${debajo}</div><canvas width="260" height="260"></canvas></div><div class="avance"><i></i></div>`;
  const cv = area.querySelector('canvas'), g = cv.getContext('2d'), barra = area.querySelector('.avance i');
  if (tipo === 'barro') {
    g.fillStyle = '#7a5a3c'; g.fillRect(0, 0, 260, 260);
    for (let i = 0; i < 70; i++) { g.fillStyle = Math.random() < .5 ? 'rgba(60,40,24,.5)' : 'rgba(150,118,80,.45)'; g.beginPath(); g.arc(Math.random() * 260, Math.random() * 260, 6 + Math.random() * 22, 0, 7); g.fill(); }
  } else {
    g.fillStyle = '#e9e1cf'; g.fillRect(0, 0, 260, 260);
    for (let i = 0; i < 260; i++) { g.fillStyle = 'rgba(0,0,0,.04)'; g.fillRect(Math.random() * 260, Math.random() * 260, 2, 2); }
  }
  let ultimo = null, movs = 0, hecho = false;
  const frotar = e => {
    const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) * 260 / r.width, y = (e.clientY - r.top) * 260 / r.height;
    g.globalCompositeOperation = 'destination-out'; g.lineCap = 'round'; g.lineWidth = 44;
    g.beginPath(); if (ultimo) { g.moveTo(ultimo[0], ultimo[1]); g.lineTo(x, y); g.stroke(); } else { g.arc(x, y, 22, 0, 7); g.fill(); }
    ultimo = [x, y];
    if (++movs % 6 === 0) {
      Sonido.play('frotar');
      const d = g.getImageData(0, 0, 260, 260).data; let llenos = 0, total = 0;
      for (let yy = 4; yy < 260; yy += 10) for (let xx = 4; xx < 260; xx += 10) { total++; if (d[(yy * 260 + xx) * 4 + 3] > 40) llenos++; }
      const k = 1 - llenos / total; barra.style.width = Math.min(100, k / .82 * 100) + '%';
      if (k >= .82 && !hecho) { hecho = true; g.clearRect(0, 0, 260, 260); barra.style.width = '100%'; setTimeout(alFin, 450); }
    }
  };
  cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); ultimo = null; frotar(e); });
  cv.addEventListener('pointermove', e => { if (e.buttons || e.pointerType === 'touch') frotar(e); });
  cv.addEventListener('pointerup', () => { ultimo = null; });
}
/* después de revelar la huella: encontrarla entre cuatro */
function juegoHuella(area, tipo, alFin) {
  const ops = [tipo]; while (ops.length < 4) { const n = 1 + Math.floor(Math.random() * 60); if (!ops.includes(n)) ops.push(n); }
  ops.sort(() => Math.random() - .5);
  area.innerHTML = `<p class="centro" style="margin:4px 0"><b>¿Cuál es la misma huella?</b></p><div class="referencia">${huellaSVG(tipo)}</div><div class="opciones cuatro">${ops.map(n => `<button class="opcion" data-n="${n}">${huellaSVG(n)}</button>`).join('')}</div>`;
  area.querySelectorAll('[data-n]').forEach(b => b.onclick = () => {
    if (+b.dataset.n === tipo) { b.classList.add('bien'); Sonido.play('bien', 3); setTimeout(alFin, 350); }
    else { b.classList.remove('mal'); void b.offsetWidth; b.classList.add('mal'); Sonido.play('mal'); }
  });
}
function juegoMicro(area, sem, alFin) {
  const ops = [0, 1, 2, 3, 4, 5].sort(() => Math.random() - .5);
  area.innerHTML = `<p class="centro" style="margin:4px 0"><b>Busca la muestra idéntica</b></p><div class="referencia">${muestraSVG(sem, 0)}</div><div class="opciones">${ops.map(v => `<button class="opcion" data-v="${v}">${muestraSVG(sem, v)}</button>`).join('')}</div>`;
  area.querySelectorAll('[data-v]').forEach(b => b.onclick = () => {
    if (+b.dataset.v === 0) { b.classList.add('bien'); Sonido.play('bien', 3); setTimeout(alFin, 350); }
    else { b.classList.remove('mal'); void b.offsetWidth; b.classList.add('mal'); Sonido.play('mal'); vibrar(20); }
  });
}
function juegoArmar(area, c, alFin) {
  const n = c.nota;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><rect width="300" height="200" fill="#fffdf3"/>${[50, 90, 130, 170].map(y => `<path d="M0 ${y}h300" stroke="#b9cbe6" stroke-width="1.2"/>`).join('')}<path d="M34 0v200" stroke="#e8a3a3" stroke-width="1.4"/>
    <g font-family="Segoe Script, Bradley Hand, cursive" fill="#22336e" font-size="21"><text x="44" y="44">Te espero a las ${n.hora}:${n.min}</text><text x="44" y="84">en ${n.lugar.toLowerCase()}.</text><text x="44" y="124">Ven sin nadie.</text><text x="150" y="164" font-size="18">— ya sabes quién</text></g></svg>`;
  /* comillas simples: el url() va dentro de un atributo style="…" */
  const url = "url('data:image/svg+xml," + encodeURIComponent(svg).replace(/'/g, '%27') + "')";
  let orden = [0, 1, 2, 3, 4, 5];
  do { orden.sort(() => Math.random() - .5); } while (orden.every((v, i) => v === i));
  let sel = null;
  const pintar = () => {
    area.innerHTML = `<p class="centro" style="margin:4px 0"><b>Toca dos pedazos para cambiarlos de lugar</b></p><div class="rompe">${orden.map((v, i) => `<button class="trozo ${sel === i ? 'sel' : ''}" data-i="${i}" style="background-image:${url};background-position:${(v % 3) * 50}% ${Math.floor(v / 3) * 100}%"></button>`).join('')}</div>`;
    area.querySelectorAll('[data-i]').forEach(b => b.onclick = () => {
      const i = +b.dataset.i;
      if (sel == null) { sel = i; Sonido.play('tap'); pintar(); return; }
      [orden[sel], orden[i]] = [orden[i], orden[sel]]; sel = null; Sonido.play('tap');
      pintar();
      if (orden.every((v, k) => v === k)) { area.querySelector('.rompe').classList.add('listo'); Sonido.play('bien', 4); setTimeout(alFin, 900); }
    });
  };
  pintar();
}
function juegoClave(area, clave, o, alFin) {
  const intentos = [];
  let actual = '';
  const pintar = () => {
    const filas = intentos.map(x => `<div class="clave-fila">${x.split('').map((d, i) => `<span class="${clave[i] === d ? 'v' : clave.includes(d) ? 'a' : ''}">${d}</span>`).join('')}</div>`).join('');
    area.innerHTML = `<div class="pantalla-cel"><span class="emo" style="font-size:30px">${o.e}</span><br>Bloqueado: clave de 4 números distintos</div>
      <div class="clave-filas">${filas}<div class="clave-fila actual">${[0, 1, 2, 3].map(i => `<span>${actual[i] || ''}</span>`).join('')}</div></div>
      <div class="teclado">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(d => `<button data-d="${d}" class="${actual.includes(String(d)) ? 'usado' : ''}">${d}</button>`).join('')}<button class="ancho" id="kBorrar" style="grid-column:span 2;background:#fff;color:var(--tinta)">⌫</button><button class="ancho" id="kProbar" style="grid-column:span 3">Probar</button></div>`;
    area.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { if (actual.length < 4 && !actual.includes(b.dataset.d)) { actual += b.dataset.d; Sonido.play('tap'); pintar(); } });
    area.querySelector('#kBorrar').onclick = () => { actual = actual.slice(0, -1); pintar(); };
    area.querySelector('#kProbar').onclick = () => {
      if (actual.length < 4) return;
      intentos.push(actual);
      if (actual === clave) { actual = ''; pintar(); Sonido.play('bien', 5); setTimeout(alFin, 600); return; }
      actual = ''; Sonido.play('mal'); pintar();
      if (intentos.length === 4) avisar('💡', 'Verde: número en su lugar. Amarillo: está, pero en otro lugar.');
    };
  };
  pintar();
}

/* ============================================================
   REGISTRAR UN LUGAR
   ============================================================ */
function iniciarBusqueda(i) {
  const c = UI.caso, p = UI.prog;
  const b = nuevaBusqueda(c, p, i);
  UI.b = Object.assign(b, { puntos: 0, combo: 0, ultimo: -99, encontrados: 0, errores: 0, restante: b.tiempo, cola: b.orden.slice(), lista: [], pistaT: 0, pausado: false, fin: false, t: 0, quitados: new Set() });
  while (b.lista.length < 6 && b.cola.length) b.lista.push(b.cola.shift());
  b.meta = Math.min(b.meta, b.objetos.length);
  $('#bEscena').innerHTML = `<div class="capa">${escenaSVG(b.esc, 'fondo')}</div><div class="capa" id="bObjs">${b.objetos.map((o, k) => `<span class="obj" data-k="${k}" style="left:${o.x}px;top:${o.y - o.t}px;font-size:${(o.t * .9).toFixed(1)}px;width:${o.t}px;transform:rotate(${o.rot}deg)${o.flip ? ' scaleX(-1)' : ''}">${OBJETO[o.id].e}</span>`).join('')}</div><div class="capa frente">${escenaSVG(b.esc, 'frente')}</div>`;
  const a = apariencia();
  $('#bMichi').innerHTML = typeof michiSVG === 'function' ? michiSVG({ pelaje: a.pelaje, ropa: a.ropa, ojos: 'normal', boca: 'sonrisa' }) : '<span class="emo" style="font-size:34px">🐱</span>';
  $('.b-cuenta small').textContent = '/ ' + b.meta;
  mostrar('pBuscar');
  disponerBusqueda();
  pintarLista(true); pintarMarcador();
  UI.ultimoTs = performance.now();
  if (b.modo === 'sombras') avisar('🌑', 'Esta vez la lista viene en sombras: paga más');
  requestAnimationFrame(bucleBusqueda);
}
function disponerBusqueda() {
  const m = $('#bMarco').getBoundingClientRect(), e = $('#bEscena');
  const s = Math.min(m.width / 360, m.height / 480);
  UI.escala = s;
  e.style.transform = `translate(${((m.width - 360 * s) / 2).toFixed(1)}px, ${((m.height - 480 * s) / 2).toFixed(1)}px) scale(${s.toFixed(4)})`;
}
function pintarLista(todo) {
  const b = UI.b, l = $('#bLista');
  l.innerHTML = b.lista.map((id, k) => `<div class="b-item ${b.modo === 'sombras' ? 'sombra' : ''} ${todo ? '' : (k === b.nuevo ? 'nuevo' : '')}">${b.modo === 'sombras' ? OBJETO[id].e : esc(OBJETO[id].n)}</div>`).join('');
}
function pintarMarcador() {
  const b = UI.b;
  $('#bPuntos').textContent = fmt(b.puntos);
  $('#bCombo').textContent = b.combo > 0 ? '×' + (1 + BUSCA.comboPaso * Math.min(b.combo, BUSCA.comboMax)).toFixed(1).replace('.', ',') + ' racha' : '';
  $('#bCuenta').textContent = b.encontrados;
  const seg = Math.max(0, Math.ceil(b.restante));
  $('#bTiempo').textContent = seg;
  const C = 2 * Math.PI * 15, arco = $('#bArco');
  arco.style.strokeDasharray = C.toFixed(1); arco.style.strokeDashoffset = (C * (1 - Math.max(0, b.restante) / b.tiempo)).toFixed(1);
  $('.b-reloj').classList.toggle('poco', b.restante < 15);
  const carga = Math.max(0, b.pistaT) / BUSCA.esperaPista;
  $('#bPistaCarga').style.height = (carga * 100).toFixed(0) + '%';
  $('#bPista').classList.toggle('lista', b.pistaT <= 0);
}
function bucleBusqueda(ts) {
  const b = UI.b;
  if (!b || b.fin) return;
  const dt = Math.min(.25, (ts - UI.ultimoTs) / 1000); UI.ultimoTs = ts;
  if (!b.pausado) {
    b.restante -= dt; b.pistaT -= dt; b.t += dt;
    if (b.restante <= 0) { b.restante = 0; pintarMarcador(); terminarBusqueda(); return; }
    if (Math.floor(b.restante * 4) !== b.ultimoCuarto) { b.ultimoCuarto = Math.floor(b.restante * 4); pintarMarcador(); }
  }
  requestAnimationFrame(bucleBusqueda);
}
function tocarEscena(e) {
  const b = UI.b;
  if (!b || b.fin || b.pausado) return;
  Sonido.listo();
  const r = $('#bEscena').getBoundingClientRect(), x = (e.clientX - r.left) / UI.escala, y = (e.clientY - r.top) / UI.escala;
  let mejor = -1, md = 1e9;
  b.objetos.forEach((o, k) => {
    if (b.quitados.has(k)) return;
    const d = Math.hypot(o.x + o.t / 2 - x, o.y - o.t * .5 - y), lim = Math.max(o.t * .62, 15);
    if (d < lim && d < md) { md = d; mejor = k; }
  });
  /* si hay varios cerca, gana el que está en la lista */
  const enLista = b.objetos.map((o, k) => k).filter(k => !b.quitados.has(k) && b.lista.includes(b.objetos[k].id) && Math.hypot(b.objetos[k].x + b.objetos[k].t / 2 - x, b.objetos[k].y - b.objetos[k].t * .5 - y) < Math.max(b.objetos[k].t * .62, 15));
  if (enLista.length) mejor = enLista[0];
  const capa = $('#bObjs');
  if (mejor >= 0 && b.lista.includes(b.objetos[mejor].id)) {
    const o = b.objetos[mejor];
    b.combo = b.t - b.ultimo <= BUSCA.comboSeg ? b.combo + 1 : 0; b.ultimo = b.t;
    const pts = puntosAcierto(b.combo, b.modo);
    b.puntos += pts; b.encontrados++; b.quitados.add(mejor);
    const el = capa.querySelector(`[data-k="${mejor}"]`); if (el) el.classList.add('encontrado');
    const m = document.createElement('div'); m.className = 'marca-ok'; m.style.left = (o.x + o.t / 2) + 'px'; m.style.top = (o.y - o.t) + 'px'; m.textContent = '+' + pts; capa.appendChild(m); setTimeout(() => m.remove(), 800);
    const k = b.lista.indexOf(o.id);
    b.lista.splice(k, 1);
    while (b.cola.length && !b.objetos.some((x, j) => x.id === b.cola[0] && !b.quitados.has(j))) b.cola.shift();
    if (b.cola.length) { b.lista.splice(k, 0, b.cola.shift()); b.nuevo = k; } else b.nuevo = -1;
    Sonido.play('bien', b.combo); vibrar(12);
    pintarLista(false); pintarMarcador();
    if (b.encontrados >= b.meta || !b.lista.length) terminarBusqueda();
  } else {
    b.restante = Math.max(0, b.restante - BUSCA.castigoSeg); b.combo = 0; b.errores++;
    const m = document.createElement('div'); m.className = 'marca-error'; m.style.left = x + 'px'; m.style.top = y + 'px'; m.textContent = '✕'; capa.appendChild(m); setTimeout(() => m.remove(), 650);
    Sonido.play('mal'); vibrar(35); pintarMarcador();
  }
}
function pistaMichi() {
  const b = UI.b;
  if (!b || b.fin || b.pausado) return;
  if (b.pistaT > 0) { avisar('🐱', apariencia().nombre + ' está descansando la nariz'); return; }
  const ks = b.objetos.map((o, k) => k).filter(k => !b.quitados.has(k) && b.lista.includes(b.objetos[k].id));
  if (!ks.length) return;
  const k = azar(ks), el = $('#bObjs').querySelector(`[data-k="${k}"]`);
  b.pistaT = BUSCA.esperaPista; b.puntos = Math.max(0, b.puntos - BUSCA.costoPista); b.combo = 0;
  if (el) { el.classList.add('marcado'); setTimeout(() => el.classList.remove('marcado'), 3200); }
  Sonido.play('pista'); avisar('🐱', azar(MICHI_DICE)); pintarMarcador();
}
function terminarBusqueda() {
  const b = UI.b, c = UI.caso, p = UI.prog;
  if (!b || b.fin) return;
  b.fin = true;
  const completo = b.encontrados >= b.meta;
  Sonido.play(completo ? 'fin' : 'tiempo');
  const r = cerrarBusqueda(c, p, b.i, b);
  guardarCaso();
  setTimeout(() => Sonido.play('estrella'), 500);
  let hallazgo = '';
  if (r.primera) {
    const cosas = c.pistas.filter(x => x.esc === b.i).map(x => OBJETO[x.obj].e + ' ' + OBJETO[x.obj].n.toLowerCase());
    const sosp = c.tareas.filter(t => t.tipo === 'hablar' && t.req.includes('L' + b.i)).map(t => c.sosp[t.sosp].n);
    hallazgo = `<div class="sosp" style="background:#fff;margin-top:10px"><b>Encontraste</b><small style="font-size:13.5px;line-height:1.5">${b.i === 0 ? '🕯️ El cuerpo de ' + esc(c.victima.n) + '<br>' : ''}${cosas.map(esc).join('<br>')}${sosp.length ? '<br>🗣️ Hay que hablar con ' + esc(sosp.join(' y ')) : ''}</small></div>`;
  }
  const t = abrirTarjeta(`<div class="gran-emo">${completo ? '🔍' : '⏰'}</div><h3>${completo ? 'Lugar registrado' : 'Se acabó el tiempo'}</h3>
    <p class="centro" style="margin:0">${esc(ESCENAS[b.esc].n)} · ${b.encontrados} de ${b.meta} objetos${b.errores ? ' · ' + b.errores + (b.errores === 1 ? ' error' : ' errores') : ''}</p>
    <div class="gana">${fmt(r.puntos)} puntos${r.bono ? ` <small style="font-weight:500;color:var(--suave)">(+${fmt(r.bono)} de bono)</small>` : ''}</div>
    <div class="estrellas">${estrellasTxt(r.nivel)}</div>${r.subio ? '<p class="centro" style="margin:2px 0">¡El lugar subió de nivel!</p>' : ''}
    <div class="gana">+${r.gana} ⭐</div>${hallazgo}
    <div class="acciones"><button class="acc oro" id="tCaso">Volver al expediente</button><button class="acc suave" id="tOtra">Registrar de nuevo</button></div>`);
  t.querySelector('#tCaso').onclick = () => { cerrarTarjeta(); UI.b = null; pintarCaso(); const ce = $('#cEst'); if (ce) ce.classList.add('sube'); };
  t.querySelector('#tOtra').onclick = () => { cerrarTarjeta(); iniciarBusqueda(b.i); };
}
function salirBusqueda() {
  const b = UI.b; if (!b || b.fin) return;
  b.pausado = true;
  const t = abrirTarjeta(`<div class="gran-emo">⏸️</div><h3>Pausa</h3><p class="centro">Si sales ahora, este registro no cuenta.</p>
    <div class="acciones"><button class="acc oro" id="pSeguir">Seguir buscando</button><button class="acc suave" id="pSalir">Salir sin terminar</button></div>`);
  t.querySelector('#pSeguir').onclick = () => { cerrarTarjeta(); b.pausado = false; UI.ultimoTs = performance.now(); };
  t.querySelector('#pSalir').onclick = () => { cerrarTarjeta(); b.fin = true; UI.b = null; pintarCaso(); };
}

/* ============================================================
   ARRANQUE
   ============================================================ */
function arrancar() {
  PERFIL = leerPerfil(quien()) || normalizarPerfil({ duenio: quien() });
  $('#bEscena').addEventListener('pointerdown', tocarEscena);
  $('#bPista').onclick = () => { Sonido.listo(); pistaMichi(); };
  $('#bSalir').onclick = salirBusqueda;
  addEventListener('resize', () => { if (!$('#pBuscar').hidden) disponerBusqueda(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { guardarPerfil(); if (UI.b && !UI.b.fin && !UI.b.pausado) salirBusqueda(); }
  });
  addEventListener('pagehide', guardarPerfil);
  addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#velo').hidden && $('#velo').onclick) cerrarTarjeta(); });
  mostrarMenu();
  Nube.leer().then(() => { if (!$('#pMenu').hidden && $('#velo').hidden) mostrarMenu(); }).catch(() => { /* sin conexión: se juega igual */ });
}
arrancar();
