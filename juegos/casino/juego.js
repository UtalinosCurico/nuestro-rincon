/* ============================================================
   CASINO DEL RINCÓN — ruleta, rueda de la fortuna, cajas, cohete y
   doble o nada. Todo con fichas de juego (no es plata de verdad).
   Cada juego muestra sus porcentajes reales; todos tienen una ventaja
   chica para la casa, así que a la larga se pierde: se puede quedar en
   cero. Si eso pasa, Michi presta 200 fichas una vez al día.
   Cada persona tiene su casino en localStorage (`casinoRincon_v1__<Persona>`).
   No sube nada a Neon.
   ============================================================ */
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => Math.floor(n || 0).toLocaleString('es-CL');
const pct = p => (p * 100).toLocaleString('es-CL', { maximumFractionDigits: p < 0.01 ? 2 : 1 }) + '%';
/* azar con crypto: un número en [0, 1) */
function azar() { try { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] / 4294967296; } catch (e) { return Math.random(); } }
const elegirPeso = lista => { let r = azar() * lista.reduce((a, x) => a + x.p, 0); for (const x of lista) { r -= x.p; if (r < 0) return x; } return lista[lista.length - 1]; };

const INICIAL = 1000, RESCATE = 200;
const quien = () => { try { return localStorage.getItem('rinconQuien') || null; } catch (e) { return null; } };
const clave = () => 'casinoRincon_v1__' + (quien() || 'invitado');
function hoy() { try { return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date()); } catch (e) { return new Date().toISOString().slice(0, 10); } }
function leer() {
  for (const k of [clave(), clave() + '_copia']) { try { const d = JSON.parse(localStorage.getItem(k) || 'null'); if (d && Number.isFinite(d.fichas)) return Object.assign(nuevo(), d); } catch (e) { /* sigue */ } }
  return nuevo();
}
function nuevo() { return { fichas: INICIAL, mayor: INICIAL, apostado: 0, ganado: 0, jugadas: 0, quiebras: 0, rescate: null, inv: [], mejor: null }; }
let C = leer();
function guardar() {
  C.mayor = Math.max(C.mayor, C.fichas);
  try {
    const v = localStorage.getItem(clave()); if (v) localStorage.setItem(clave() + '_copia', v);
    localStorage.setItem(clave(), JSON.stringify(C));
    localStorage.setItem('casinoResumen__' + (quien() || 'invitado'), JSON.stringify({ t: Date.now(), fichas: C.fichas, mayor: C.mayor }));
  } catch (e) { /* nada */ }
  pintarFichas();
}
let fichasAntes = C.fichas;
function pintarFichas() {
  const f = $('#fichas'); f.textContent = '🪙 ' + fmt(C.fichas);
  f.classList.remove('sube', 'baja'); void f.offsetWidth;
  if (C.fichas > fichasAntes) f.classList.add('sube'); else if (C.fichas < fichasAntes) f.classList.add('baja');
  fichasAntes = C.fichas;
}
/* cobrar la apuesta al empezar; pagar lo ganado al final */
function apostar(m) { if (!(m > 0) || m > C.fichas) return false; C.fichas -= m; C.apostado += m; C.jugadas++; guardar(); return true; }
function pagar(m, apuesta) {
  m = Math.floor(m);
  if (m > 0) { C.fichas += m; C.ganado += m; }
  const neto = m - apuesta;
  if (!C.mejor || neto > C.mejor) C.mejor = neto;
  if (C.fichas <= 0) C.quiebras++;
  guardar();
  if (neto > 0) aviso('+' + fmt(neto) + ' 🪙', 'gana'); else if (m > 0) aviso('Recuperas ' + fmt(m) + ' 🪙'); else aviso('−' + fmt(apuesta) + ' 🪙', 'pierde');
  if (C.fichas <= 0) setTimeout(quiebra, 900);
}
function aviso(txt, tipo) {
  const c = $('#avisos'), d = document.createElement('div'); d.className = 'aviso ' + (tipo || ''); d.textContent = txt;
  c.appendChild(d); while (c.children.length > 3) c.firstChild.remove(); setTimeout(() => d.remove(), 2400);
}
function tarjeta(html) { $('#tarjeta').innerHTML = html; $('#velo').hidden = false; }
function cerrar() { $('#velo').hidden = true; }
function quiebra() {
  const puede = C.rescate !== hoy();
  tarjeta(`<div class="emo">💸</div><h3>Te quedaste sin fichas</h3><p>Lo perdiste todo. Así es la casa: a la larga siempre gana.</p>
    ${puede ? `<p>Michi te presta <b>${RESCATE} fichas</b> (una vez al día).</p><button class="grande" onclick="rescatar()">Aceptar el préstamo de Michi 🐱</button>` : '<p>Michi ya te prestó hoy. Vuelve mañana.</p><button class="grande" onclick="cerrar()">Ok</button>'}`);
}
function rescatar() { if (C.rescate === hoy() || C.fichas >= 10) return cerrar(); C.rescate = hoy(); C.fichas += RESCATE; guardar(); cerrar(); aviso('Michi te prestó ' + RESCATE + ' 🪙'); pintar(); }

/* ---------- selector de apuesta (compartido) ---------- */
let monto = 50;
function selectorHTML() {
  return `<div class="apuesta"><div class="monto"><button class="chip" data-m="mitad">½</button><input id="monto" type="number" inputmode="numeric" min="1" value="${Math.min(monto, Math.max(1, C.fichas))}"><button class="chip" data-m="doble">×2</button></div>
    <div class="chips"><button class="chip" data-m="10">10</button><button class="chip" data-m="50">50</button><button class="chip" data-m="100">100</button><button class="chip" data-m="500">500</button><button class="chip todo" data-m="todo">Todo</button></div></div>`;
}
function conectarSelector() {
  const inp = $('#monto');
  const fijar = v => { monto = Math.max(1, Math.min(C.fichas || 1, Math.floor(v) || 1)); inp.value = monto; };
  inp.oninput = () => { monto = Math.floor(+inp.value) || 0; };
  inp.onblur = () => fijar(inp.value);
  document.querySelectorAll('[data-m]').forEach(b => b.onclick = () => {
    const m = b.dataset.m, v = +inp.value || 0;
    fijar(m === 'mitad' ? v / 2 : m === 'doble' ? v * 2 : m === 'todo' ? C.fichas : +m);
  });
}
const montoActual = () => { const v = Math.floor(+$('#monto').value) || 0; monto = v; return v; };
function revisarMonto() {
  const m = montoActual();
  if (m < 1) { aviso('Elige cuánto apostar'); return 0; }
  if (m > C.fichas) { aviso('No te alcanzan las fichas'); if (C.fichas <= 0) quiebra(); return 0; }
  return m;
}
let ocupado = false;

/* ============================================================
   RULETA (europea, un cero: la casa gana 2,7%)
   ============================================================ */
const ORDEN = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
const ROJOS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const colorDe = n => (n === 0 ? 'v' : ROJOS.has(n) ? 'r' : 'n');
const APUESTAS = [
  { id: 'rojo', n: 'Rojo', ok: n => colorDe(n) === 'r', c: 'rojo' }, { id: 'negro', n: 'Negro', ok: n => colorDe(n) === 'n', c: 'negro' },
  { id: 'par', n: 'Par', ok: n => n > 0 && n % 2 === 0 }, { id: 'impar', n: 'Impar', ok: n => n % 2 === 1 },
  { id: 'bajo', n: '1 al 18', ok: n => n >= 1 && n <= 18 }, { id: 'alto', n: '19 al 36', ok: n => n >= 19 },
  { id: 'd1', n: '1ª docena', ok: n => n >= 1 && n <= 12 }, { id: 'd2', n: '2ª docena', ok: n => n >= 13 && n <= 24 }, { id: 'd3', n: '3ª docena', ok: n => n >= 25 },
];
APUESTAS.forEach(a => { a.casos = Array.from({ length: 37 }, (_, n) => n).filter(a.ok).length; a.paga = 36 / a.casos; });
let rApuesta = 'rojo', rNumero = null, rGiro = 0, rHist = [];
function ruedaSVG() {
  const a = 360 / 37, R = 150, r2 = 108, c = 160, t = [];
  ORDEN.forEach((n, i) => {
    const a0 = (i * a - a / 2 - 90) * Math.PI / 180, a1 = (i * a + a / 2 - 90) * Math.PI / 180;
    const p = (rad, ang) => [c + rad * Math.cos(ang), c + rad * Math.sin(ang)].map(v => v.toFixed(2)).join(' ');
    const col = { v: '#2fa565', r: '#d6463f', n: '#1d1d22' }[colorDe(n)];
    t.push(`<path d="M${p(r2, a0)}L${p(R, a0)}A${R} ${R} 0 0 1 ${p(R, a1)}L${p(r2, a1)}A${r2} ${r2} 0 0 0 ${p(r2, a0)}Z" fill="${col}" stroke="#c9a14a" stroke-width=".8"/>`);
    const am = (i * a - 90) * Math.PI / 180, [x, y] = [c + 132 * Math.cos(am), c + 132 * Math.sin(am)];
    t.push(`<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" fill="#fff" font-size="11" font-weight="700" text-anchor="middle" dominant-baseline="middle" transform="rotate(${(i * a).toFixed(2)} ${x.toFixed(1)} ${y.toFixed(1)})">${n}</text>`);
  });
  return `<svg viewBox="0 0 320 320"><circle cx="160" cy="160" r="158" fill="#6b4226"/><circle cx="160" cy="160" r="154" fill="#3d2414"/><g class="rueda-giro" id="giro" style="transform:rotate(${rGiro}deg)">${t.join('')}<circle cx="160" cy="160" r="108" fill="#24453a"/><circle cx="160" cy="160" r="40" fill="#c9a14a"/><circle cx="160" cy="160" r="30" fill="#6b4226"/></g></svg>`;
}
function vistaRuleta() {
  const elegida = rNumero != null ? { n: 'Número ' + rNumero, casos: 1, paga: 36 } : APUESTAS.find(a => a.id === rApuesta);
  return `<h2>🎡 Ruleta</h2><p class="sub">Ruleta con un solo cero. Elige a qué le apuestas: la probabilidad y lo que paga están en cada botón.</p>
    <div class="rueda-caja"><div class="puntero"></div>${ruedaSVG()}<div class="centro-res" id="resRuleta"></div></div>
    <div class="historial">${rHist.map(n => `<span class="num ${colorDe(n)}">${n}</span>`).join('')}</div>
    <div class="panel"><div class="opciones">${APUESTAS.map(a => `<button class="op ${a.c || ''} ${rNumero == null && rApuesta === a.id ? 'on' : ''}" data-ap="${a.id}"><b>${a.n}</b><small>${pct(a.casos / 37)} · paga ×${a.paga}</small></button>`).join('')}</div>
      <p class="sub" style="margin:10px 2px 0">O a un número solo (${pct(1 / 37)} · paga ×36):</p>
      <div class="numeros">${Array.from({ length: 37 }, (_, n) => `<button class="num ${colorDe(n)} ${rNumero === n ? 'on' : ''}" data-num="${n}">${n}</button>`).join('')}</div></div>
    <div class="panel">${selectorHTML()}<button class="grande" id="girar">Girar · ${esc(elegida.n)} (${pct(elegida.casos / 37)})</button></div>`;
}
function conectarRuleta() {
  document.querySelectorAll('[data-ap]').forEach(b => b.onclick = () => { if (ocupado) return; rApuesta = b.dataset.ap; rNumero = null; pintar(); });
  document.querySelectorAll('[data-num]').forEach(b => b.onclick = () => { if (ocupado) return; rNumero = +b.dataset.num; pintar(); });
  $('#girar').onclick = () => {
    if (ocupado) return;
    const m = revisarMonto(); if (!m || !apostar(m)) return;
    ocupado = true; $('#girar').disabled = true;
    const n = Math.floor(azar() * 37), i = ORDEN.indexOf(n), a = 360 / 37;
    rGiro = rGiro - (rGiro % 360) + 360 * 6 + (360 - i * a) % 360;
    $('#giro').style.transform = `rotate(${rGiro}deg)`;
    setTimeout(() => {
      const gano = rNumero != null ? n === rNumero : APUESTAS.find(x => x.id === rApuesta).ok(n);
      const paga = rNumero != null ? 36 : APUESTAS.find(x => x.id === rApuesta).paga;
      $('#resRuleta').innerHTML = `<span class="num ${colorDe(n)}" style="padding:6px 14px;border-radius:12px">${n}</span>`;
      rHist = [n].concat(rHist).slice(0, 12);
      pagar(gano ? m * paga : 0, m);
      ocupado = false; setTimeout(pintar, 1100);
    }, 4700);
  };
}

/* ============================================================
   RUEDA DE LA FORTUNA (los gajos miden lo que pesa cada premio)
   ============================================================ */
const RUEDA = [
  { x: 0, p: .46, c: '#3b3b44', t: 'Nada' }, { x: .5, p: .2, c: '#7a6a8a', t: '×0,5' }, { x: 1.5, p: .17, c: '#3f8f7a', t: '×1,5' },
  { x: 2, p: .1, c: '#4f8fd9', t: '×2' }, { x: 3, p: .05, c: '#c46ad0', t: '×3' }, { x: 10, p: .018, c: '#f2c14e', t: '×10' }, { x: 50, p: .002, c: '#ff4d6d', t: '×50' },
];
let fGiro = 0;
function ruedaFortunaSVG() {
  const c = 160, R = 150, t = []; let ang = 0;
  /* el orden en la rueda alterna los premios para que se vea parejo */
  const orden = [0, 2, 1, 3, 0, 4, 1, 5, 0, 2, 6, 3], partes = orden.map(k => ({ k, p: RUEDA[k].p / orden.filter(x => x === k).length }));
  fortunaPartes = [];
  for (const s of partes) {
    const d = s.p * 360, a0 = (ang - 90) * Math.PI / 180, a1 = (ang + d - 90) * Math.PI / 180, g = RUEDA[s.k];
    const p = a => [c + R * Math.cos(a), c + R * Math.sin(a)].map(v => v.toFixed(2)).join(' ');
    t.push(`<path d="M${c} ${c}L${p(a0)}A${R} ${R} 0 ${d > 180 ? 1 : 0} 1 ${p(a1)}Z" fill="${g.c}" stroke="#15281f" stroke-width="1.5"/>`);
    if (d > 9) { const am = (ang + d / 2 - 90) * Math.PI / 180, x = c + 108 * Math.cos(am), y = c + 108 * Math.sin(am); t.push(`<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" fill="#fff" font-size="${d > 30 ? 16 : 12}" font-weight="700" text-anchor="middle" dominant-baseline="middle" transform="rotate(${(ang + d / 2).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})">${g.t}</text>`); }
    fortunaPartes.push({ k: s.k, desde: ang, hasta: ang + d });
    ang += d;
  }
  return `<svg viewBox="0 0 320 320"><circle cx="160" cy="160" r="158" fill="#c9a14a"/><g class="rueda-giro" id="giroF" style="transform:rotate(${fGiro}deg)">${t.join('')}</g><circle cx="160" cy="160" r="22" fill="#c9a14a"/><circle cx="160" cy="160" r="12" fill="#6b4226"/></svg>`;
}
let fortunaPartes = [];
function vistaRueda() {
  return `<h2>🎯 Rueda de la fortuna</h2><p class="sub">Cada gajo es del tamaño de su probabilidad: el ×50 es esa rayita roja. Casi la mitad de la rueda te deja sin nada.</p>
    <div class="rueda-caja"><div class="puntero"></div>${ruedaFortunaSVG()}<div class="centro-res" id="resRueda"></div></div>
    <div class="panel"><table class="tabla">${RUEDA.map(g => `<tr><td><i style="background:${g.c}"></i>${g.x ? 'Multiplica ' + g.t : 'Pierdes todo lo apostado'}</td><td>${pct(g.p)}</td></tr>`).join('')}</table></div>
    <div class="panel">${selectorHTML()}<button class="grande" id="girarF">Girar la rueda</button></div>`;
}
function conectarRueda() {
  $('#girarF').onclick = () => {
    if (ocupado) return;
    const m = revisarMonto(); if (!m || !apostar(m)) return;
    ocupado = true; $('#girarF').disabled = true;
    const g = elegirPeso(RUEDA), k = RUEDA.indexOf(g);
    const opciones = fortunaPartes.filter(s => s.k === k), s = opciones[Math.floor(azar() * opciones.length)];
    const dentro = s.desde + (s.hasta - s.desde) * (0.15 + azar() * 0.7);
    fGiro = fGiro - (fGiro % 360) + 360 * 6 + (360 - dentro) % 360;
    $('#giroF').style.transform = `rotate(${fGiro}deg)`;
    setTimeout(() => { $('#resRueda').textContent = g.t; pagar(m * g.x, m); ocupado = false; setTimeout(pintar, 1100); }, 4700);
  };
}

/* ============================================================
   CAJAS — se abren, sale una cosa con su rareza y se puede vender
   ============================================================ */
const RAREZAS = [
  { id: 'comun', n: 'Común', c: '#9aa5b1', p: .55, v: .25 }, { id: 'poco', n: 'Poco común', c: '#4f8fd9', p: .25, v: .7 },
  { id: 'raro', n: 'Rara', c: '#9b5de5', p: .13, v: 1.5 }, { id: 'epico', n: 'Épica', c: '#f15bb5', p: .055, v: 4 }, { id: 'leyenda', n: 'Legendaria', c: '#f2c14e', p: .015, v: 15 },
];
const CAJAS = [
  { id: 'madera', n: 'Caja de madera', e: '📦', precio: 100, col: '#8a5a34',
    cosas: { comun: [['🧦', 'Calcetín sin par'], ['🥄', 'Cuchara doblada'], ['🧷', 'Alfiler'], ['🍬', 'Dulce derretido']], poco: [['🧸', 'Osito gastado'], ['🎈', 'Globo con helio']], raro: [['🎸', 'Guitarra de palo'], ['🕶️', 'Lentes de sol']], epico: [['⌚', 'Reloj del abuelo']], leyenda: [['💍', 'Anillo de compromiso']] } },
  { id: 'plata', n: 'Caja de plata', e: '🎁', precio: 500, col: '#7a8592',
    cosas: { comun: [['🍷', 'Copa del valle'], ['📻', 'Radio a pilas'], ['🧣', 'Bufanda tejida'], ['🌵', 'Cactus del norte']], poco: [['🎧', 'Audífonos'], ['📷', 'Cámara de rollo']], raro: [['🚲', 'Bicicleta de paseo'], ['🎻', 'Violín']], epico: [['🛹', 'Skate de colección']], leyenda: [['🏆', 'Copa de campeones']] } },
  { id: 'oro', n: 'Caja dorada', e: '👑', precio: 2000, col: '#c9a14a',
    cosas: { comun: [['🍾', 'Espumante de Curicó'], ['🧳', 'Maleta de viaje'], ['🎩', 'Sombrero de copa'], ['🍫', 'Chocolate suizo']], poco: [['💎', 'Piedra preciosa'], ['🛵', 'Scooter']], raro: [['⛵', 'Velero chico'], ['🎹', 'Piano de cola']], epico: [['🚗', 'Auto clásico']], leyenda: [['🏝️', 'Isla privada']] } },
];
let cajaSel = 'madera', abriendo = false;
function itemHTML(it) { const r = RAREZAS.find(x => x.id === it.r); return `<div class="item" style="border-color:${r.c}"><span class="emo">${it.e}</span>${esc(it.n)}<small style="color:${r.c}">${fmt(it.v)} 🪙</small></div>`; }
function sacarDe(caja) { const r = elegirPeso(RAREZAS), l = caja.cosas[r.id], [e, n] = l[Math.floor(azar() * l.length)]; return { e, n, r: r.id, v: Math.round(caja.precio * r.v * (0.85 + azar() * 0.3)), caja: caja.id }; }
function vistaCajas() {
  const caja = CAJAS.find(c => c.id === cajaSel), total = C.inv.reduce((a, x) => a + x.v, 0);
  return `<h2>📦 Cajas</h2><p class="sub">Abres una caja y sale algo al azar. Lo puedes vender por fichas o guardarlo. Casi siempre vale menos que la caja.</p>
    <div class="cajas">${CAJAS.map(c => `<button class="caja ${c.id === cajaSel ? 'on' : ''}" data-caja="${c.id}" style="background:${c.col}"><span class="emo">${c.e}</span><b>${c.n}</b><small>${fmt(c.precio)} 🪙</small></button>`).join('')}</div>
    <div class="tira-caja"><div class="tira" id="tira">${Array.from({ length: 6 }, () => itemHTML(sacarDe(caja))).join('')}</div></div>
    <div class="panel"><table class="tabla">${RAREZAS.map(r => `<tr><td><i style="background:${r.c}"></i>${r.n} · vale ~${fmt(caja.precio * r.v)} 🪙</td><td>${pct(r.p)}</td></tr>`).join('')}</table>
      <button class="grande" id="abrir">Abrir ${esc(caja.n.toLowerCase())} · ${fmt(caja.precio)} 🪙</button></div>
    <h2 style="margin-top:18px">🎒 Lo que tienes</h2><p class="sub">${C.inv.length ? C.inv.length + ' cosas · valen ' + fmt(total) + ' 🪙. Toca una para venderla.' : 'Todavía nada.'}</p>
    ${C.inv.length ? `<div class="inv">${C.inv.map((it, i) => `<button data-vender="${i}">${itemHTML(it)}</button>`).join('')}</div><button class="grande verde" id="venderTodo">Vender todo · ${fmt(total)} 🪙</button>` : ''}`;
}
function conectarCajas() {
  document.querySelectorAll('[data-caja]').forEach(b => b.onclick = () => { if (abriendo) return; cajaSel = b.dataset.caja; pintar(); });
  $('#abrir').onclick = () => {
    if (abriendo) return;
    const caja = CAJAS.find(c => c.id === cajaSel);
    if (C.fichas < caja.precio) { aviso('No te alcanzan las fichas'); if (C.fichas <= 0) quiebra(); return; }
    apostar(caja.precio); abriendo = true; ocupado = true; $('#abrir').disabled = true;
    const gana = sacarDe(caja), items = Array.from({ length: 44 }, (_, i) => (i === 38 ? gana : sacarDe(caja)));
    const tira = $('#tira'); tira.style.transition = 'none'; tira.style.transform = 'translateX(0)'; tira.innerHTML = items.map(itemHTML).join('');
    const ancho = $('.tira-caja').clientWidth, paso = 96, destino = 38 * paso + 45 - ancho / 2 + (azar() - 0.5) * 60;
    requestAnimationFrame(() => requestAnimationFrame(() => { tira.style.transition = 'transform 5.2s cubic-bezier(.08,.6,.12,1)'; tira.style.transform = `translateX(${-destino}px)`; }));
    setTimeout(() => {
      abriendo = false; ocupado = false;
      C.inv.unshift(gana); C.inv = C.inv.slice(0, 60); guardar();
      const r = RAREZAS.find(x => x.id === gana.r);
      tarjeta(`<div class="emo">${gana.e}</div><h3>${esc(gana.n)}</h3><p style="color:${r.c};font-weight:700">${r.n}</p><p>Vale <b>${fmt(gana.v)} 🪙</b> (la caja costó ${fmt(caja.precio)}).</p>
        <button class="grande verde" id="vAhora">Vender ahora · ${fmt(gana.v)} 🪙</button><button class="grande" style="background:#e8e1cf;box-shadow:none" id="vGuardar">Guardarlo</button>`);
      $('#vAhora').onclick = () => { const i = C.inv.indexOf(gana); if (i >= 0) C.inv.splice(i, 1); C.ganado += gana.v; C.fichas += gana.v; guardar(); cerrar(); pintar(); };
      $('#vGuardar').onclick = () => { cerrar(); pintar(); };
    }, 5400);
  };
  document.querySelectorAll('[data-vender]').forEach(b => b.onclick = () => {
    if (abriendo) return;
    const it = C.inv[+b.dataset.vender]; if (!it) return;
    C.inv.splice(+b.dataset.vender, 1); C.fichas += it.v; C.ganado += it.v; guardar(); aviso('Vendido: +' + fmt(it.v) + ' 🪙', 'gana'); pintar();
  });
  const vt = $('#venderTodo');
  if (vt) vt.onclick = () => { if (abriendo) return; const t = C.inv.reduce((a, x) => a + x.v, 0); C.inv = []; C.fichas += t; C.ganado += t; guardar(); aviso('Vendiste todo: +' + fmt(t) + ' 🪙', 'gana'); pintar(); };
}

/* ============================================================
   COHETE — el multiplicador sube hasta que explota; hay que retirarse antes
   P(llegar a ×m) = 0,97 / m
   ============================================================ */
let vuelo = null;
function vistaCohete() {
  return `<h2>🚀 Cohete</h2><p class="sub">El multiplicador sube y en cualquier momento el cohete explota. Si te retiras antes, ganas tu apuesta por el multiplicador; si explota, la pierdes entera.</p>
    <div class="cielo" id="cielo"><div class="estrellitas"></div><span class="cohete" id="cohete">🚀</span><div class="mult" id="mult">×1,00</div></div>
    <div class="panel"><table class="tabla"><tr><td>Llegar a ×1,5</td><td>${pct(.97 / 1.5)}</td></tr><tr><td>Llegar a ×2</td><td>${pct(.97 / 2)}</td></tr><tr><td>Llegar a ×5</td><td>${pct(.97 / 5)}</td></tr><tr><td>Llegar a ×10</td><td>${pct(.97 / 10)}</td></tr><tr><td>Explota apenas despega</td><td>3%</td></tr></table></div>
    <div class="panel">${selectorHTML()}<button class="grande" id="despegar">Despegar</button></div>`;
}
function conectarCohete() {
  $('#despegar').onclick = () => {
    if (vuelo) { retirar(); return; }
    if (ocupado) return;
    const m = revisarMonto(); if (!m || !apostar(m)) return;
    ocupado = true;
    const u = azar(), techo = u < 0.03 ? 1 : Math.max(1, Math.floor(97 / (100 * (1 - u)) * 100) / 100);
    vuelo = { m, techo, t0: performance.now(), x: 1, fin: false };
    $('#cielo').classList.remove('boom');
    const b = $('#despegar'); b.textContent = 'Retirarse'; b.classList.add('verde');
    requestAnimationFrame(paso);
  };
}
function paso(ts) {
  const v = vuelo; if (!v || v.fin) return;
  const t = (ts - v.t0) / 1000;
  v.x = Math.floor(Math.exp(0.11 * t) * 100) / 100;
  const ce = $('#cohete'), mu = $('#mult');
  if (v.x >= v.techo) {
    v.fin = true; v.x = v.techo;
    if (mu) { mu.textContent = '💥 ×' + v.techo.toFixed(2).replace('.', ','); $('#cielo').classList.add('boom'); }
    if (ce) ce.textContent = '💥';
    terminarVuelo(0);
    return;
  }
  if (mu) mu.textContent = '×' + v.x.toFixed(2).replace('.', ',');
  if (ce) { const k = Math.min(1, Math.log(v.x) / Math.log(12)); ce.style.left = (12 + k * 66) + '%'; ce.style.bottom = (8 + k * 70) + '%'; }
  requestAnimationFrame(paso);
}
function retirar() { const v = vuelo; if (!v || v.fin) return; v.fin = true; terminarVuelo(v.m * v.x); }
function terminarVuelo(cobra) {
  const v = vuelo; vuelo = null;
  pagar(cobra, v.m);
  if (cobra) { const mu = $('#mult'); if (mu) mu.textContent = '✅ ×' + v.x.toFixed(2).replace('.', ','); }
  setTimeout(() => { ocupado = false; if (tab === 'cohete') pintar(); }, 1600);
}

/* ============================================================
   DOBLE O NADA — 48% de doblar; se puede seguir doblando o cobrar
   ============================================================ */
const P_DOBLE = 0.48;
let pozo = 0, pozoInicial = 0;
function vistaDoble() {
  return `<h2>🪙 Doble o nada</h2><p class="sub">Tiras la moneda: con ${pct(P_DOBLE)} doblas, con ${pct(1 - P_DOBLE)} pierdes todo. Si ganas puedes cobrar o arriesgar el pozo entero otra vez.</p>
    <div class="moneda" id="moneda">${pozo ? '😺' : '🪙'}</div>
    ${pozo ? `<div class="pozo">Pozo: ${fmt(pozo)} 🪙</div><p class="sub" style="text-align:center">Doblar de nuevo: ${pct(P_DOBLE)} de llegar a ${fmt(pozo * 2)}</p>
      <div class="panel"><button class="grande" id="doblar">Doblar · ${fmt(pozo * 2)} 🪙</button><button class="grande verde" id="cobrar">Cobrar ${fmt(pozo)} 🪙</button></div>`
      : `<div class="panel">${selectorHTML()}<button class="grande" id="tirar">Tirar la moneda</button></div>`}`;
}
function conectarDoble() {
  const tirar = base => {
    if (ocupado) return;
    ocupado = true;
    const mo = $('#moneda'); mo.classList.remove('gira'); void mo.offsetWidth; mo.classList.add('gira');
    setTimeout(() => {
      ocupado = false;
      if (azar() < P_DOBLE) { pozo = base * 2; aviso('¡Doblaste! Pozo: ' + fmt(pozo) + ' 🪙', 'gana'); }
      else { const perdido = pozoInicial; pozo = 0; pagar(0, perdido); }
      pintar();
    }, 950);
  };
  const t = $('#tirar');
  if (t) t.onclick = () => { const m = revisarMonto(); if (!m || ocupado || !apostar(m)) return; pozoInicial = m; tirar(m); };
  const d = $('#doblar'); if (d) d.onclick = () => tirar(pozo);
  const c = $('#cobrar'); if (c) c.onclick = () => { if (ocupado) return; const g = pozo; pozo = 0; pagar(g, pozoInicial); pintar(); };
}

/* ============================================================
   CUENTAS
   ============================================================ */
function vistaCuentas() {
  const neto = C.ganado - C.apostado;
  return `<h2>📊 Tus cuentas</h2><p class="sub">${esc(quien() || 'Invitado')}: así va tu casino.</p>
    <div class="stats"><div><small>Fichas</small><b>${fmt(C.fichas)}</b></div><div><small>Lo más que tuviste</small><b>${fmt(C.mayor)}</b></div>
      <div><small>Jugadas</small><b>${fmt(C.jugadas)}</b></div><div><small>Mejor premio</small><b>${C.mejor > 0 ? '+' + fmt(C.mejor) : '—'}</b></div>
      <div><small>Apostado</small><b>${fmt(C.apostado)}</b></div><div><small>Ganancia total</small><b style="color:${neto >= 0 ? '#7fe0a8' : '#ff8d86'}">${neto >= 0 ? '+' : '−'}${fmt(Math.abs(neto))}</b></div>
      <div><small>Veces en cero</small><b>${C.quiebras}</b></div><div><small>Cosas guardadas</small><b>${C.inv.length}</b></div></div>
    <div class="panel"><b>¿Por qué se pierde a la larga?</b><p class="sub" style="margin:6px 0 0">Cada juego devuelve un poco menos de lo que se apuesta: la ruleta 97,3%, la rueda ~98,5%, las cajas ~95%, el cohete 97% y el doble o nada 96%. Ganar un rato es posible; seguir jugando hace que la casa gane.</p></div>
    <button class="grande rojo" id="reiniciar">Empezar de nuevo con ${fmt(INICIAL)} fichas</button>
    <p class="nota">Fichas de juego: no son plata de verdad ni se pueden cambiar por nada.</p>`;
}
function conectarCuentas() {
  $('#reiniciar').onclick = () => {
    tarjeta(`<div class="emo">🔄</div><h3>¿Empezar de nuevo?</h3><p>Se borran tus fichas, tus cosas y tus cuentas.</p><button class="grande rojo" id="rSi">Sí, de nuevo</button><button class="grande" style="background:#e8e1cf;box-shadow:none" onclick="cerrar()">Mejor no</button>`);
    $('#rSi').onclick = () => { C = nuevo(); fichasAntes = C.fichas; guardar(); cerrar(); pintar(); };
  };
}

/* ============================================================
   PESTAÑAS Y ARRANQUE
   ============================================================ */
const TABS = [['ruleta', '🎡', 'Ruleta', vistaRuleta, conectarRuleta], ['rueda', '🎯', 'Rueda', vistaRueda, conectarRueda], ['cajas', '📦', 'Cajas', vistaCajas, conectarCajas],
  ['cohete', '🚀', 'Cohete', vistaCohete, conectarCohete], ['doble', '🪙', 'Doble', vistaDoble, conectarDoble], ['cuentas', '📊', 'Cuentas', vistaCuentas, conectarCuentas]];
let tab = 'ruleta';
function pintar() {
  const t = TABS.find(x => x[0] === tab);
  $('#mesa').innerHTML = t[3]();
  if ($('#monto')) conectarSelector();
  t[4]();
  $('#tabs').innerHTML = TABS.map(x => `<button class="${x[0] === tab ? 'on' : ''}" data-tab="${x[0]}"><i>${x[1]}</i>${x[2]}</button>`).join('');
  document.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => {
    if (ocupado || vuelo) { aviso('Espera que termine la jugada'); return; }
    if (pozo) { aviso('Primero cobra o dobla tu pozo'); return; }
    tab = b.dataset.tab; pintar(); scrollTo(0, 0);
  });
}
$('#btnVolver').onclick = () => { if (pozo) { C.fichas += pozo; C.ganado += pozo; pozo = 0; } guardar(); location.href = '/#juegos'; };
$('#txtQuien').textContent = (quien() ? quien() + ' · ' : '') + 'fichas de juego';
$('#velo').onclick = e => { if (e.target.id === 'velo') cerrar(); };
/* si cierra con un pozo del doble o nada, se le cobra solo */
addEventListener('pagehide', () => { if (pozo) { C.fichas += pozo; C.ganado += pozo; pozo = 0; } if (vuelo && !vuelo.fin) { vuelo.fin = true; } guardar(); });
pintarFichas(); pintar();
if (C.fichas <= 0) quiebra();
