/* ============================================================
   LOS JUEGOS — cada uno se registra en JUEGOS con su vista, su
   conexión y cuándo está ocupado (para no salir a mitad de jugada).
   Lo que paga sale siempre de reglas.js con el factor de suerte
   del momento en que se apostó.
   ============================================================ */
const tablaHTML = filas => `<table class="tabla">${filas.map(([a, b, c]) => `<tr><td>${a}</td>${c != null ? `<td>${c}</td>` : ''}<td>${b}</td></tr>`).join('')}</table>`;

/* ---------- RULETA ---------- */
let rApuesta = 'rojo', rNumero = null, rGiro = 0, rHist = [], rGirando = false;
function ruletaSVG() {
  const a = 360 / 37, R = 150, r2 = 108, c = 160, t = [];
  ORDEN.forEach((n, i) => {
    const a0 = (i * a - a / 2 - 90) * Math.PI / 180, a1 = (i * a + a / 2 - 90) * Math.PI / 180;
    const p = (rad, ang) => [c + rad * Math.cos(ang), c + rad * Math.sin(ang)].map(v => v.toFixed(2)).join(' ');
    t.push(`<path d="M${p(r2, a0)}L${p(R, a0)}A${R} ${R} 0 0 1 ${p(R, a1)}L${p(r2, a1)}A${r2} ${r2} 0 0 0 ${p(r2, a0)}Z" fill="${{ v: '#2fa565', r: '#d6463f', n: '#1d1d22' }[colorDe(n)]}" stroke="#c9a14a" stroke-width=".8"/>`);
    const am = (i * a - 90) * Math.PI / 180, x = c + 132 * Math.cos(am), y = c + 132 * Math.sin(am);
    t.push(`<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" fill="#fff" font-size="11" font-weight="700" text-anchor="middle" dominant-baseline="middle" transform="rotate(${(i * a).toFixed(2)} ${x.toFixed(1)} ${y.toFixed(1)})">${n}</text>`);
  });
  return `<svg viewBox="0 0 320 320"><circle cx="160" cy="160" r="158" fill="#6b4226"/><circle cx="160" cy="160" r="154" fill="#3d2414"/><g class="rueda-giro" id="giro" style="transform:rotate(${rGiro}deg)">${t.join('')}<circle cx="160" cy="160" r="108" fill="#24453a"/><circle cx="160" cy="160" r="40" fill="#c9a14a"/><circle cx="160" cy="160" r="30" fill="#6b4226"/></g></svg>`;
}
JUEGOS.push({
  id: 'ruleta', e: '🎡', n: 'Ruleta', d: 'Rojo, negro, docenas o tu número', col: '#6b2b2b', rtp: rtpRuleta, ocupado: () => rGirando,
  vista() {
    const s = factor(), sel = rNumero != null ? { n: 'Número ' + rNumero, casos: 1 } : APUESTAS.find(a => a.id === rApuesta);
    return `<h2>🎡 Ruleta</h2><p class="sub">Ruleta con un solo cero. Cada botón dice su probabilidad y lo que paga.</p>
      <div class="rueda-caja"><div class="puntero"></div>${ruletaSVG()}<div class="centro-res" id="resRuleta"></div></div>
      <div class="historial">${rHist.map(n => `<span class="num ${colorDe(n)}">${n}</span>`).join('')}</div>
      <div class="panel"><div class="opciones">${APUESTAS.map(a => `<button class="op ${a.c || ''} ${rNumero == null && rApuesta === a.id ? 'on' : ''}" data-ap="${a.id}"><b>${a.n}</b><small>${fmtP(a.casos / 37)} · paga ${fmtX(pagoRuleta(a.casos, s))}</small></button>`).join('')}</div>
        <p class="sub" style="margin:10px 2px 0">O a un número solo (${fmtP(1 / 37)} · paga ${fmtX(pagoRuleta(1, s))}):</p>
        <div class="numeros">${Array.from({ length: 37 }, (_, n) => `<button class="num ${colorDe(n)} ${rNumero === n ? 'on' : ''}" data-num="${n}">${n}</button>`).join('')}</div></div>
      <div class="panel">${selectorHTML()}<button class="grande" id="girar">Girar · ${esc(sel.n)} (${fmtP(sel.casos / 37)})</button></div>`;
  },
  conectar() {
    document.querySelectorAll('[data-ap]').forEach(b => b.onclick = () => { if (rGirando) return; rApuesta = b.dataset.ap; rNumero = null; Sonido.play('tap'); pintar(); });
    document.querySelectorAll('[data-num]').forEach(b => b.onclick = () => { if (rGirando) return; rNumero = +b.dataset.num; Sonido.play('tap'); pintar(); });
    $('#girar').onclick = () => {
      if (rGirando) return;
      const m = revisarMonto(); if (!m || !apostar(m)) return;
      rGirando = true; $('#girar').disabled = true;
      const s = factor(), n = Math.floor(azar() * 37), i = ORDEN.indexOf(n), a = 360 / 37;
      const casos = rNumero != null ? 1 : APUESTAS.find(x => x.id === rApuesta).casos;
      const gano = rNumero != null ? n === rNumero : APUESTAS.find(x => x.id === rApuesta).ok(n);
      rGiro = rGiro - (rGiro % 360) + 360 * 6 + (360 - i * a) % 360;
      $('#giro').style.transform = `rotate(${rGiro}deg)`;
      let tics = 0; const tic = setInterval(() => { Sonido.play('tic'); if (++tics > 22) clearInterval(tic); }, 140 + tics * 8);
      setTimeout(() => {
        clearInterval(tic);
        $('#resRuleta').innerHTML = `<span class="num ${colorDe(n)}" style="padding:6px 14px;border-radius:12px">${n}</span>`;
        rHist = [n].concat(rHist).slice(0, 12);
        rGirando = false;
        pagar(gano ? m * pagoRuleta(casos, s) : 0, m, this);
        setTimeout(() => { if (vista === 'juego:ruleta' && !rGirando) pintar(); }, 1100);
      }, 4700);
    };
  },
});

/* ---------- RUEDA DE LA FORTUNA ---------- */
let fGiro = 0, fPartes = [], fGirando = false;
function ruedaSVG(tabla) {
  const c = 160, R = 150, t = []; let ang = 0;
  const orden = [0, 2, 1, 3, 0, 4, 1, 5, 0, 2, 6, 3], partes = orden.map(k => ({ k, p: tabla[k].p / orden.filter(x => x === k).length }));
  fPartes = [];
  for (const s of partes) {
    const d = s.p * 360, a0 = (ang - 90) * Math.PI / 180, a1 = (ang + d - 90) * Math.PI / 180, g = tabla[s.k];
    const p = a => [c + R * Math.cos(a), c + R * Math.sin(a)].map(v => v.toFixed(2)).join(' ');
    t.push(`<path d="M${c} ${c}L${p(a0)}A${R} ${R} 0 ${d > 180 ? 1 : 0} 1 ${p(a1)}Z" fill="${g.c}" stroke="#15281f" stroke-width="1.5"/>`);
    if (d > 9) { const am = (ang + d / 2 - 90) * Math.PI / 180, x = c + 106 * Math.cos(am), y = c + 106 * Math.sin(am); t.push(`<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" fill="#fff" font-size="${d > 30 ? 15 : 11}" font-weight="700" text-anchor="middle" dominant-baseline="middle" transform="rotate(${(ang + d / 2).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})">${g.x ? fmtX(g.x) : 'Nada'}</text>`); }
    fPartes.push({ k: s.k, desde: ang, hasta: ang + d });
    ang += d;
  }
  return `<svg viewBox="0 0 320 320"><circle cx="160" cy="160" r="158" fill="#c9a14a"/><g class="rueda-giro" id="giroF" style="transform:rotate(${fGiro}deg)">${t.join('')}</g><circle cx="160" cy="160" r="22" fill="#c9a14a"/><circle cx="160" cy="160" r="12" fill="#6b4226"/></svg>`;
}
JUEGOS.push({
  id: 'rueda', e: '🎯', n: 'Rueda de la fortuna', d: 'Cada gajo mide lo que pesa', col: '#5a3f7a', rtp: rtpRueda, ocupado: () => fGirando,
  vista() {
    const t = rueda(factor());
    return `<h2>🎯 Rueda de la fortuna</h2><p class="sub">Cada gajo es del tamaño de su probabilidad: el más grande del final es esa rayita roja. Casi la mitad te deja sin nada.</p>
      <div class="rueda-caja"><div class="puntero"></div>${ruedaSVG(t)}<div class="centro-res" id="resRueda"></div></div>
      <div class="panel">${tablaHTML(t.map(g => [`<i style="background:${g.c}"></i>${g.x ? 'Multiplica ' + fmtX(g.x) : 'Pierdes lo apostado'}`, fmtP(g.p)]))}</div>
      <div class="panel">${selectorHTML()}<button class="grande" id="girarF">Girar la rueda</button></div>`;
  },
  conectar() {
    $('#girarF').onclick = () => {
      if (fGirando) return;
      const m = revisarMonto(); if (!m || !apostar(m)) return;
      fGirando = true; $('#girarF').disabled = true;
      const tabla = rueda(factor()), g = elegirPeso(tabla, azar), k = tabla.indexOf(g);
      const ops = fPartes.filter(s => s.k === k), sg = ops[Math.floor(azar() * ops.length)];
      const dentro = sg.desde + (sg.hasta - sg.desde) * (0.15 + azar() * 0.7);
      fGiro = fGiro - (fGiro % 360) + 360 * 6 + (360 - dentro) % 360;
      $('#giroF').style.transform = `rotate(${fGiro}deg)`;
      setTimeout(() => {
        $('#resRueda').textContent = g.x ? fmtX(g.x) : '✕';
        fGirando = false; pagar(m * g.x, m, this);
        setTimeout(() => { if (vista === 'juego:rueda' && !fGirando) pintar(); }, 1100);
      }, 4700);
    };
  },
});

/* ---------- CAJAS ---------- */
let cajaSel = 'madera', abriendo = false;
function itemHTML(it) { const r = RAREZAS.find(x => x.id === it.r) || RAREZAS[0]; return `<div class="item" style="border-color:${r.c}"><span class="emo">${it.e}</span>${esc(it.n)}<small style="color:${r.c}">${fmt(it.v)} 🪙</small></div>`; }
JUEGOS.push({
  id: 'cajas', e: '📦', n: 'Cajas', d: 'Ábrelas y vende lo que sale', col: '#7a5230', rtp: rtpCajas, ocupado: () => abriendo,
  vista() {
    const s = factor(), caja = CAJAS.find(c => c.id === cajaSel), total = C.inv.reduce((a, x) => a + x.v, 0);
    return `<h2>📦 Cajas</h2><p class="sub">Abres una caja y sale algo al azar. Lo vendes por fichas o lo guardas. Casi siempre vale menos que la caja… casi.</p>
      <div class="cajas">${CAJAS.map(c => `<button class="caja ${c.id === cajaSel ? 'on' : ''}" data-caja="${c.id}" style="background:${c.col}"><span class="emo">${c.e}</span><b>${c.n}</b><small>${fmt(c.precio)} 🪙</small></button>`).join('')}</div>
      <div class="tira-caja"><div class="tira" id="tira">${Array.from({ length: 6 }, () => itemHTML(sacarDeCaja(caja, s, azar))).join('')}</div></div>
      <div class="panel">${tablaHTML(RAREZAS.map(r => [`<i style="background:${r.c}"></i>${r.n} · vale ~${fmt(caja.precio * r.v * s)} 🪙`, fmtP(r.p)]))}
        <button class="grande" id="abrir">Abrir ${esc(caja.n.toLowerCase())} · ${fmt(caja.precio)} 🪙</button></div>
      <h2>🎒 Lo que tienes</h2><p class="sub">${C.inv.length ? C.inv.length + ' cosas · valen ' + fmt(total) + ' 🪙. Toca una para venderla.' : 'Todavía nada.'}</p>
      ${C.inv.length ? `<div class="inv">${C.inv.map((it, i) => `<button data-vender="${i}">${itemHTML(it)}</button>`).join('')}</div><button class="grande verde" id="venderTodo">Vender todo · ${fmt(total)} 🪙</button>` : ''}`;
  },
  conectar() {
    document.querySelectorAll('[data-caja]').forEach(b => b.onclick = () => { if (abriendo) return; cajaSel = b.dataset.caja; Sonido.play('tap'); pintar(); });
    $('#abrir').onclick = () => {
      if (abriendo) return;
      const caja = CAJAS.find(c => c.id === cajaSel);
      if (C.fichas < caja.precio) { aviso('No te alcanzan las fichas'); if (C.fichas <= 0) quiebra(); return; }
      apostar(caja.precio); abriendo = true; $('#abrir').disabled = true;
      const s = factor(), gana = sacarDeCaja(caja, s, azar), items = Array.from({ length: 44 }, (_, i) => (i === 38 ? gana : sacarDeCaja(caja, s, azar)));
      const tira = $('#tira'); tira.style.transition = 'none'; tira.style.transform = 'translateX(0)'; tira.innerHTML = items.map(itemHTML).join('');
      const ancho = $('.tira-caja').clientWidth, destino = 38 * 96 + 45 - ancho / 2 + (azar() - 0.5) * 60;
      requestAnimationFrame(() => requestAnimationFrame(() => { tira.style.transition = 'transform 5.2s cubic-bezier(.08,.6,.12,1)'; tira.style.transform = `translateX(${-destino}px)`; }));
      let tics = 0; const tic = setInterval(() => { Sonido.play('tic'); if (++tics > 30) clearInterval(tic); }, 120);
      setTimeout(() => {
        clearInterval(tic); abriendo = false;
        C.inv.unshift(gana); C.inv = C.inv.slice(0, 60); guardar();
        const r = RAREZAS.find(x => x.id === gana.r);
        if (gana.r === 'leyenda' || gana.r === 'epico') { confeti(gana.r === 'leyenda' ? 200 : 90); Sonido.play('grande'); } else Sonido.play('gana');
        tarjeta(`<div class="emo">${gana.e}</div><h3>${esc(gana.n)}</h3><p style="color:${r.c};font-weight:700">${r.n}</p><p>Vale <b>${fmt(gana.v)} 🪙</b> (la caja costó ${fmt(caja.precio)}).</p>
          <button class="grande verde" id="vAhora">Vender ahora · ${fmt(gana.v)} 🪙</button><button class="grande claro" id="vGuardar">Guardarlo</button>`);
        $('#vAhora').onclick = () => { const i = C.inv.indexOf(gana); if (i >= 0) C.inv.splice(i, 1); C.ganado += gana.v; C.fichas += gana.v; guardar(); cerrar(); pintar(); Nube.programar(); };
        $('#vGuardar').onclick = () => { cerrar(); pintar(); };
      }, 5400);
    };
    document.querySelectorAll('[data-vender]').forEach(b => b.onclick = () => {
      if (abriendo) return;
      const it = C.inv[+b.dataset.vender]; if (!it) return;
      C.inv.splice(+b.dataset.vender, 1); C.fichas += it.v; C.ganado += it.v; guardar(); Sonido.play('ficha'); aviso('Vendido: +' + fmt(it.v) + ' 🪙', 'gana'); pintar();
    });
    const vt = $('#venderTodo');
    if (vt) vt.onclick = () => { if (abriendo) return; const t = C.inv.reduce((a, x) => a + x.v, 0); C.inv = []; C.fichas += t; C.ganado += t; guardar(); Sonido.play('gana'); aviso('Vendiste todo: +' + fmt(t) + ' 🪙', 'gana'); pintar(); };
  },
});

/* ---------- COHETE ---------- */
let vuelo = null;
function pasoCohete(ts) {
  const v = vuelo; if (!v || v.fin) return;
  v.x = Math.floor(Math.exp(0.11 * (ts - v.t0) / 1000) * 100) / 100;
  const ce = $('#cohete'), mu = $('#mult'), bt = $('#despegar');
  if (v.x >= v.techo) {
    v.fin = true; v.x = v.techo;
    if (mu) { mu.textContent = '💥 ' + fmtX(v.techo); $('#cielo').classList.add('boom'); }
    if (ce) ce.textContent = '💥';
    Sonido.play('boom'); vibrar([60, 40, 90]);
    return terminarVuelo(0);
  }
  if (mu) mu.textContent = fmtX(v.x);
  if (bt) bt.textContent = 'Retirarse · ' + fmt(v.m * v.x) + ' 🪙';
  if (ce) { const k = Math.min(1, Math.log(v.x) / Math.log(12)); ce.style.left = (12 + k * 66) + '%'; ce.style.bottom = (8 + k * 70) + '%'; }
  if (v.auto && v.x >= v.auto) { v.fin = true; const mu2 = $('#mult'); if (mu2) mu2.textContent = '✅ ' + fmtX(v.x); return terminarVuelo(v.m * v.x); }
  requestAnimationFrame(pasoCohete);
}
function terminarVuelo(cobra) {
  const v = vuelo; vuelo = null;
  if (cobra) { const mu = $('#mult'); if (mu) mu.textContent = '✅ ' + fmtX(v.x); }
  pagar(cobra, v.m, juegoDe('cohete'));
  setTimeout(() => { if (vista === 'juego:cohete' && !vuelo) pintar(); }, 1600);
}
let autoRetiro = 0;
JUEGOS.push({
  id: 'cohete', e: '🚀', n: 'Cohete', d: 'Retírate antes de que explote', col: '#1c3350', rtp: rtpCohete, ocupado: () => !!vuelo,
  alSalir() { if (vuelo && !vuelo.fin) { vuelo.fin = true; terminarVuelo(vuelo.m * vuelo.x); } },
  vista() {
    const s = factor();
    return `<h2>🚀 Cohete</h2><p class="sub">El multiplicador sube y en cualquier momento el cohete explota. Si te retiras antes, ganas tu apuesta por el multiplicador; si explota, la pierdes entera.</p>
      <div class="cielo" id="cielo"><div class="estrellitas"></div><span class="cohete" id="cohete">🚀</span><div class="mult" id="mult">×1</div></div>
      <div class="panel">${tablaHTML([1.5, 2, 3, 5, 10, 50].map(m => ['Llegar a ' + fmtX(m), fmtP(pCohete(m, s))]).concat([['Explota apenas despega', fmtP(Math.max(0, 1 - pCohete(1.01, s)))]]))}</div>
      <div class="panel">${selectorHTML()}<div class="monto" style="margin-top:8px"><small style="flex:none;color:var(--tenue)">Retiro automático en</small><input id="auto" type="number" step="0.1" min="0" placeholder="no" value="${autoRetiro || ''}"></div>
        <button class="grande" id="despegar">Despegar</button></div>`;
  },
  conectar() {
    const au = $('#auto'); au.onchange = () => { autoRetiro = Math.max(0, +au.value || 0); if (autoRetiro && autoRetiro < 1.01) autoRetiro = 1.01; };
    $('#despegar').onclick = () => {
      if (vuelo) { if (!vuelo.fin) { vuelo.fin = true; Sonido.play('gana'); terminarVuelo(vuelo.m * vuelo.x); } return; }
      const m = revisarMonto(); if (!m || !apostar(m)) return;
      vuelo = { m, techo: techoCohete(azar(), factor()), t0: performance.now(), x: 1, fin: false, auto: autoRetiro };
      $('#cielo').classList.remove('boom');
      const b = $('#despegar'); b.classList.add('verde');
      requestAnimationFrame(pasoCohete);
    };
  },
});

/* ---------- DOBLE O NADA ---------- */
let pozo = 0, pozoInicial = 0, volteando = false;
function cobrarPozo() { const g = pozo; pozo = 0; pagar(g, pozoInicial, juegoDe('doble')); }
JUEGOS.push({
  id: 'doble', e: '🪙', n: 'Doble o nada', d: 'Tira la moneda y arriesga el pozo', col: '#7a6a2a', rtp: rtpDoble, ocupado: () => pozo > 0 || volteando,
  alSalir() { if (pozo) cobrarPozo(); },
  vista() {
    const p = pDoble(factor());
    return `<h2>🪙 Doble o nada</h2><p class="sub">Tiras la moneda: con ${fmtP(p)} doblas, con ${fmtP(1 - p)} pierdes todo. Si ganas, cobras o arriesgas el pozo entero otra vez.</p>
      <div class="moneda" id="moneda">${pozo ? '😺' : '🪙'}</div>
      ${pozo ? `<div class="pozo">Pozo: ${fmt(pozo)} 🪙</div><p class="sub" style="text-align:center">Doblar otra vez: ${fmtP(p)} de llegar a ${fmt(pozo * 2)}</p>
        <div class="panel"><button class="grande" id="doblar">Doblar · ${fmt(pozo * 2)} 🪙</button><button class="grande verde" id="cobrar">Cobrar ${fmt(pozo)} 🪙</button></div>`
        : `<div class="panel">${selectorHTML()}<button class="grande" id="tirar">Tirar la moneda</button></div>`}`;
  },
  conectar() {
    const tirar = base => {
      if (volteando) return;
      volteando = true; Sonido.play('tic');
      const mo = $('#moneda'); mo.classList.remove('gira'); void mo.offsetWidth; mo.classList.add('gira');
      const p = pDoble(factor());
      setTimeout(() => {
        volteando = false;
        if (azar() < p) { pozo = base * 2; Sonido.play('gana'); aviso('¡Doblaste! Pozo: ' + fmt(pozo) + ' 🪙', 'gana'); }
        else { pozo = 0; pagar(0, pozoInicial, juegoDe('doble')); }
        pintar();
      }, 950);
    };
    const t = $('#tirar'); if (t) t.onclick = () => { const m = revisarMonto(); if (!m || volteando || !apostar(m)) return; pozoInicial = m; tirar(m); };
    const d = $('#doblar'); if (d) d.onclick = () => tirar(pozo);
    const c = $('#cobrar'); if (c) c.onclick = () => { if (volteando) return; cobrarPozo(); pintar(); };
  },
});

/* ---------- TRAGAMONEDAS ---------- */
let tragaGirando = false, tragaUlt = ['🍒', '🔔', '💎'];
const ALTO_SIMB = 58;
const columnaHTML = (lista) => lista.map(e => `<div class="simb">${e}</div>`).join('');
JUEGOS.push({
  id: 'traga', e: '🎰', n: 'Tragamonedas', d: 'Tres iguales en la línea', col: '#7a2a4f', rtp: rtpTraga, ocupado: () => tragaGirando,
  vista() {
    const s = factor(), tabla = tablaTraga(s), algo = tabla.reduce((a, f) => a + f.p, 0);
    return `<h2>🎰 Tragamonedas</h2><p class="sub">Tres rodillos; paga la línea del medio. Las cerezas siempre devuelven algo.</p>
      <div class="traga"><div class="rodillos">${[0, 1, 2].map(i => `<div class="rodillo"><div class="tira-r" id="rod${i}">${columnaHTML([RODILLO[(i + 2) % 7].e, tragaUlt[i], RODILLO[(i + 4) % 7].e])}</div></div>`).join('')}</div><div class="linea-pago"></div></div>
      <div class="panel">${tablaHTML(tabla.map(f => [f.txt, fmtX(f.x), fmtP(f.p)]))}<p class="sub" style="margin:8px 0 0">Sale algo en ${fmtP(algo)} de las tiradas (a veces menos de lo apostado).</p></div>
      <div class="panel">${selectorHTML()}<button class="grande" id="palanca">Tirar la palanca</button></div>`;
  },
  conectar() {
    $('#palanca').onclick = () => {
      if (tragaGirando) return;
      const m = revisarMonto(); if (!m || !apostar(m)) return;
      tragaGirando = true; $('#palanca').disabled = true;
      const s = factor(), res = [giroRodillo(azar), giroRodillo(azar), giroRodillo(azar)];
      res.forEach((r, i) => {
        const tira = $('#rod' + i), lista = [];
        for (let k = 0; k < 18 + i * 6; k++) lista.push(RODILLO[Math.floor(azar() * 7)].e);
        lista.push(RODILLO[Math.floor(azar() * 7)].e, r, RODILLO[Math.floor(azar() * 7)].e);
        tira.style.transition = 'none'; tira.style.transform = 'translateY(0)'; tira.innerHTML = columnaHTML(lista);
        requestAnimationFrame(() => requestAnimationFrame(() => { tira.style.transition = `transform ${1.1 + i * .45}s cubic-bezier(.15,.7,.2,1.04)`; tira.style.transform = `translateY(${-(lista.length - 3) * ALTO_SIMB}px)`; }));
        setTimeout(() => Sonido.play('carta'), (1.1 + i * .45) * 1000);
      });
      setTimeout(() => {
        tragaUlt = res; tragaGirando = false;
        const x = pagoLinea(res[0], res[1], res[2], s);
        pagar(m * x, m, this);
        $('#palanca').disabled = false;
      }, 2150);
    };
  },
});

/* ---------- MINAS ---------- */
let minasN = 3, ronda = null;
function vistaGrillaMinas() {
  const r = ronda;
  return Array.from({ length: CASILLAS }, (_, i) => {
    if (r && r.abiertas.has(i)) return `<button class="casilla gema" disabled>💎</button>`;
    if (r && r.fin && r.minas.has(i)) return `<button class="casilla bomba ${r.pisada === i ? 'pisada' : ''}" disabled>💣</button>`;
    return `<button class="casilla" data-c="${i}" ${!r || r.fin ? 'disabled' : ''}></button>`;
  }).join('');
}
JUEGOS.push({
  id: 'minas', e: '💣', n: 'Minas', d: 'Destapa gemas sin pisar una mina', col: '#3a4a5a', rtp: rtpMinas, ocupado: () => !!(ronda && !ronda.fin),
  alSalir() { if (ronda && !ronda.fin && ronda.abiertas.size) cobrarMinas(); },
  vista() {
    const s = factor(), r = ronda && !ronda.fin ? ronda : null, k = r ? r.abiertas.size : 0, m = r ? r.m : minasN;
    return `<h2>💣 Minas</h2><p class="sub">25 casillas con minas escondidas. Cada gema sube el premio; si pisas una mina pierdes la apuesta. Cobra cuando quieras.</p>
      ${r ? '' : `<div class="panel"><small style="color:var(--tenue)">Cuántas minas</small><div class="chips" style="margin-top:6px">${[1, 3, 5, 10, 20].map(n => `<button class="chip ${n === minasN ? 'sel' : ''}" data-minas="${n}">${n}</button>`).join('')}</div>
        <p class="sub" style="margin:8px 0 0">Con ${m} ${m === 1 ? 'mina' : 'minas'}: la primera casilla es segura en un ${fmtP(pSegura(0, m))} y paga ${fmtX(multMinas(1, m, s))}; cinco seguidas pagan ${m <= 20 ? fmtX(multMinas(5, m, s)) : '—'}.</p></div>`}
      <div class="minas" id="grilla">${vistaGrillaMinas()}</div>
      ${r ? `<div class="panel centro"><div class="pozo">${k ? fmtX(multMinas(k, m, r.s)) + ' · ' + fmt(r.apuesta * multMinas(k, m, r.s)) + ' 🪙' : 'Elige una casilla'}</div>
        <p class="sub" style="text-align:center;margin:4px 0">Próxima casilla segura: ${fmtP(pSegura(k, m))} → ${fmtX(multMinas(k + 1, m, r.s))}</p>
        <button class="grande verde" id="cobrarMinas" ${k ? '' : 'disabled'}>Cobrar${k ? ' ' + fmt(r.apuesta * multMinas(k, m, r.s)) + ' 🪙' : ''}</button></div>`
        : `<div class="panel">${selectorHTML()}<button class="grande" id="empezarMinas">Empezar con ${minasN} ${minasN === 1 ? 'mina' : 'minas'}</button></div>`}`;
  },
  conectar() {
    document.querySelectorAll('[data-minas]').forEach(b => b.onclick = () => { minasN = +b.dataset.minas; Sonido.play('tap'); pintar(); });
    const e = $('#empezarMinas');
    if (e) e.onclick = () => {
      const m = revisarMonto(); if (!m || !apostar(m)) return;
      const minas = new Set(); while (minas.size < minasN) minas.add(Math.floor(azar() * CASILLAS));
      ronda = { m: minasN, apuesta: m, s: factor(), minas, abiertas: new Set(), fin: false };
      pintar();
    };
    document.querySelectorAll('[data-c]').forEach(b => b.onclick = () => {
      const r = ronda; if (!r || r.fin) return;
      const i = +b.dataset.c;
      if (r.minas.has(i)) { r.fin = true; r.pisada = i; Sonido.play('boom'); vibrar([70, 40, 90]); pagar(0, r.apuesta, this); pintar(); return; }
      r.abiertas.add(i); Sonido.play('gema'); vibrar(10);
      if (r.abiertas.size >= CASILLAS - r.m) return cobrarMinas();
      pintar();
    });
    const c = $('#cobrarMinas'); if (c) c.onclick = () => cobrarMinas();
  },
});
function cobrarMinas() {
  const r = ronda; if (!r || r.fin || !r.abiertas.size) return;
  r.fin = true;
  pagar(r.apuesta * multMinas(r.abiertas.size, r.m, r.s), r.apuesta, juegoDe('minas'));
  if (vista === 'juego:minas') pintar();
}

/* ---------- PLINKO ---------- */
let bolas = [];
const DX = 100 / 15;
JUEGOS.push({
  id: 'plinko', e: '🔴', n: 'Plinko', d: 'La bolita cae entre los clavos', col: '#5a2a6b', rtp: rtpPlinko, ocupado: () => bolas.length > 0,
  alSalir() { for (const b of bolas) pagar(b.pago, b.apuesta, juegoDe('plinko')); bolas = []; },
  vista() {
    const mult = plinko(factor());
    let clavos = '';
    for (let r = 0; r < FILAS_PLINKO; r++) for (let j = 0; j < r + 3; j++) clavos += `<i class="clavo" style="left:${(50 + (j - (r + 2) / 2) * DX).toFixed(2)}%;top:${(5 + r * 6.6).toFixed(2)}%"></i>`;
    return `<h2>🔴 Plinko</h2><p class="sub">La bolita rebota a la izquierda o a la derecha en cada fila. Las orillas pagan mucho, pero casi nunca llega.</p>
      <div class="plinko" id="plinko">${clavos}<div class="casilleros">${mult.map((x, k) => `<span id="cas${k}" style="--h:${Math.min(1, Math.log10(x * 10 + 1) / 2.4)}">${fmtX(x).slice(1)}</span>`).join('')}</div></div>
      <div class="panel">${tablaHTML(mult.slice(0, 7).map((x, k) => [k === 6 ? 'Al medio' : `${6 - k} ${6 - k === 1 ? 'casillero' : 'casilleros'} del medio (cada lado)`, fmtX(x), fmtP(k === 6 ? pPlinko(6) : 2 * pPlinko(k))]))}</div>
      <div class="panel">${selectorHTML()}<button class="grande" id="soltar">Soltar una bolita</button><p class="sub" style="text-align:center;margin:6px 0 0">Puedes soltar varias seguidas.</p></div>`;
  },
  conectar() {
    $('#soltar').onclick = () => {
      if (bolas.length >= 8) { aviso('Espera que caigan algunas'); return; }
      const m = revisarMonto(); if (!m || !apostar(m)) return;
      const s = factor(), pasos = [], tablero = $('#plinko');
      let k = 0; for (let r = 0; r < FILAS_PLINKO; r++) { const der = azar() < 0.5; if (der) k++; pasos.push(der); }
      const b = { apuesta: m, pago: m * plinko(s)[k], k };
      bolas.push(b);
      const el = document.createElement('i'); el.className = 'bola'; el.style.left = '50%'; el.style.top = '0%'; tablero.appendChild(el);
      let x = 50, r = 0;
      const paso = () => {
        if (!document.body.contains(el)) return;
        if (r < FILAS_PLINKO) { x += (pasos[r] ? 1 : -1) * DX / 2; el.style.left = x.toFixed(2) + '%'; el.style.top = (5 + r * 6.6 + 3).toFixed(2) + '%'; r++; Sonido.play('tic'); setTimeout(paso, 135); return; }
        el.style.top = '86%';
        setTimeout(() => {
          el.remove(); const cas = $('#cas' + b.k); if (cas) { cas.classList.remove('cae'); void cas.offsetWidth; cas.classList.add('cae'); }
          const i = bolas.indexOf(b); if (i < 0) return; bolas.splice(i, 1);
          pagar(b.pago, b.apuesta, juegoDe('plinko'));
        }, 160);
      };
      setTimeout(paso, 60);
    };
  },
});

/* ---------- RASPE Y GANE ---------- */
let carton = null;
JUEGOS.push({
  id: 'raspe', e: '🎟️', n: 'Raspe y gane', d: 'Tres iguales ganan', col: '#2a6b5a', rtp: rtpRaspe, ocupado: () => !!(carton && !carton.listo),
  alSalir() { if (carton && !carton.listo) terminarRaspe(); },
  vista() {
    const t = raspe(factor()), pg = t.reduce((a, r) => a + r.p, 0);
    return `<h2>🎟️ Raspe y gane</h2><p class="sub">Compras un cartón y raspas: si aparecen tres símbolos iguales, ganas lo que vale ese símbolo.</p>
      <div class="carton" id="carton">${carton ? carton.celdas.map(e => `<span>${e}</span>`).join('') : Array.from({ length: 9 }, () => '<span>❔</span>').join('')}<canvas id="capa" width="300" height="300" ${carton && !carton.listo ? '' : 'hidden'}></canvas></div>
      ${carton && !carton.listo ? '<button class="grande claro" id="rasparTodo">Raspar todo</button>' : ''}
      <div class="panel">${tablaHTML(t.map(r => ['Tres ' + r.e, fmtX(r.x), fmtP(r.p)]).concat([['Sin premio', '—', fmtP(1 - pg)]]))}</div>
      ${carton && !carton.listo ? '' : `<div class="panel">${selectorHTML()}<button class="grande" id="comprarCarton">Comprar un cartón</button></div>`}`;
  },
  conectar() {
    const comprar = $('#comprarCarton');
    if (comprar) comprar.onclick = () => {
      const m = revisarMonto(); if (!m || !apostar(m)) return;
      carton = Object.assign(sortearRaspe(factor(), azar), { apuesta: m, listo: false });
      pintar();
    };
    const cv = $('#capa');
    if (cv && !cv.hidden) {
      const g = cv.getContext('2d');
      const grad = g.createLinearGradient(0, 0, 300, 300); grad.addColorStop(0, '#c9ccd2'); grad.addColorStop(.5, '#eef0f3'); grad.addColorStop(1, '#a9adb5');
      g.fillStyle = grad; g.fillRect(0, 0, 300, 300);
      g.fillStyle = 'rgba(0,0,0,.25)'; g.font = '700 22px system-ui'; g.textAlign = 'center'; g.fillText('RASPA AQUÍ', 150, 158);
      let ult = null, movs = 0;
      const raspar = e => {
        const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) * 300 / r.width, y = (e.clientY - r.top) * 300 / r.height;
        g.globalCompositeOperation = 'destination-out'; g.lineCap = 'round'; g.lineWidth = 46;
        g.beginPath(); if (ult) { g.moveTo(ult[0], ult[1]); g.lineTo(x, y); g.stroke(); } else { g.arc(x, y, 23, 0, 7); g.fill(); }
        ult = [x, y];
        if (++movs % 5 === 0) {
          Sonido.play('raspar');
          const d = g.getImageData(0, 0, 300, 300).data; let llenos = 0, total = 0;
          for (let yy = 5; yy < 300; yy += 12) for (let xx = 5; xx < 300; xx += 12) { total++; if (d[(yy * 300 + xx) * 4 + 3] > 40) llenos++; }
          if (1 - llenos / total > .62) terminarRaspe();
        }
      };
      cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); ult = null; raspar(e); });
      cv.addEventListener('pointermove', e => { if (e.buttons || e.pointerType === 'touch') raspar(e); });
      cv.addEventListener('pointerup', () => { ult = null; });
    }
    const todo = $('#rasparTodo'); if (todo) todo.onclick = terminarRaspe;
  },
});
function terminarRaspe() {
  const c = carton; if (!c || c.listo) return;
  c.listo = true;
  pagar(c.premio ? c.apuesta * c.premio.x : 0, c.apuesta, juegoDe('raspe'));
  if (vista === 'juego:raspe') {
    pintar();
    if (c.premio) document.querySelectorAll('#carton span').forEach(s => { if (s.textContent === c.premio.e) s.classList.add('brilla'); });
  }
}

/* ---------- DADOS ---------- */
let dChance = 50, dDir = 'menor', dTirando = false, dUlt = null;
const fmtD = n => (n / 100).toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
JUEGOS.push({
  id: 'dados', e: '🎲', n: 'Dados', d: 'Tú eliges la probabilidad', col: '#2a4f6b', rtp: rtpDados, ocupado: () => dTirando,
  vista() {
    const s = factor(), limite = dDir === 'menor' ? dChance : 100 - dChance;
    return `<h2>🎲 Dados</h2><p class="sub">Sale un número del 0,00 al 99,99. Tú eliges el límite: mientras menos probable, más paga.</p>
      <div class="dado-num ${dUlt ? (dUlt.gano ? 'bien' : 'mal') : ''}" id="dadoNum">${dUlt ? fmtD(dUlt.n) : '—'}</div>
      <div class="panel"><div class="opciones"><button class="op ${dDir === 'menor' ? 'on' : ''}" data-dir="menor"><b>Menor que ${dChance}</b><small>gana si sale 0 a ${fmtD(dChance * 100 - 1)}</small></button><button class="op ${dDir === 'mayor' ? 'on' : ''}" data-dir="mayor"><b>Mayor que ${100 - dChance}</b><small>gana si sale ${fmtD((100 - dChance) * 100)} o más</small></button></div>
        <input type="range" id="chance" min="2" max="95" value="${dChance}" style="width:100%;margin-top:12px">
        <div class="pozo" id="txtChance">${dChance}% de ganar · paga ${fmtX(pagoDados(dChance, s))}</div><p class="sub" style="text-align:center;margin:0">Límite: ${dDir === 'menor' ? 'menor que' : 'mayor o igual a'} ${limite}</p></div>
      <div class="panel">${selectorHTML()}<button class="grande" id="tirarDados">Tirar</button></div>`;
  },
  conectar() {
    document.querySelectorAll('[data-dir]').forEach(b => b.onclick = () => { if (dTirando) return; dDir = b.dataset.dir; Sonido.play('tap'); pintar(); });
    const r = $('#chance');
    r.oninput = () => { dChance = +r.value; $('#txtChance').textContent = `${dChance}% de ganar · paga ${fmtX(pagoDados(dChance, factor()))}`; };
    r.onchange = () => pintar();
    $('#tirarDados').onclick = () => {
      if (dTirando) return;
      const m = revisarMonto(); if (!m || !apostar(m)) return;
      dTirando = true;
      const s = factor(), n = Math.floor(azar() * 10000), gano = dDir === 'menor' ? n < dChance * 100 : n >= (100 - dChance) * 100, pago = pagoDados(dChance, s);
      const el = $('#dadoNum'); el.className = 'dado-num';
      let k = 0; const t = setInterval(() => { el.textContent = fmtD(Math.floor(azar() * 10000)); Sonido.play('tic'); if (++k > 12) { clearInterval(t); fin(); } }, 55);
      const fin = () => { dUlt = { n, gano }; el.textContent = fmtD(n); el.classList.add(gano ? 'bien' : 'mal'); dTirando = false; pagar(gano ? m * pago : 0, m, this); };
    };
  },
});

/* ---------- VEINTIUNO ---------- */
let mano = null;
const cartaHTML = (c, tapada) => tapada ? '<div class="carta tapada"></div>' : `<div class="carta ${c.p === '♥' || c.p === '♦' ? 'roja' : ''}"><b>${c.r}</b><i>${c.p}</i></div>`;
function vistaMano() {
  const h = mano, tapada = h && !h.fin && !h.bancaJuega;
  const vb = h ? (tapada ? valorMano([h.b[0]]).t : valorMano(h.b).t) : '', vj = h ? valorMano(h.j) : null;
  return `<div class="mesa21"><small>Banca ${h ? '· ' + vb + (tapada ? ' + ?' : '') : ''}</small><div class="mano">${h ? h.b.map((c, i) => cartaHTML(c, tapada && i === 1)).join('') : ''}</div>
    <small>${esc(quien() || 'Tú')} ${h ? '· ' + vj.t + (vj.blanda && vj.t < 21 ? ' (o ' + (vj.t - 10) + ')' : '') : ''}</small><div class="mano">${h ? h.j.map(c => cartaHTML(c)).join('') : ''}</div>
    ${h && h.res ? `<div class="res21">${h.res}</div>` : ''}</div>`;
}
function resolver21() {
  const h = mano, vj = valorMano(h.j).t, vb = valorMano(h.b).t;
  let pago = 0;
  if (vj > 21) { h.res = 'Te pasaste'; }
  else if (esBlackjack(h.j) && !esBlackjack(h.b)) { pago = h.apuesta * 2.5; h.res = '¡Veintiuno a la primera! Paga 3 a 2'; }
  else if (esBlackjack(h.b) && !esBlackjack(h.j)) { h.res = 'La banca sacó veintiuno'; }
  else if (vb > 21) { pago = h.apuesta * 2; h.res = 'La banca se pasó'; }
  else if (vj > vb) { pago = h.apuesta * 2; h.res = 'Ganaste'; }
  else if (vj === vb) { pago = h.apuesta; h.res = 'Empate'; }
  else h.res = 'Gana la banca';
  h.fin = true;
  pagar(pago, h.apuesta, juegoDe('veintiuno'));
}
function bancaJuega(sincrono) {
  const h = mano; h.bancaJuega = true;
  const sigue = () => valorMano(h.j).t <= 21 && valorMano(h.b).t < 17;
  if (sincrono) { while (sigue()) h.b.push(nuevaCarta(azar)); return resolver21(); }
  const paso = () => {
    if (mano !== h) return;
    if (sigue()) { h.b.push(nuevaCarta(azar)); Sonido.play('carta'); pintar(); return setTimeout(paso, 550); }
    resolver21(); if (vista === 'juego:veintiuno') pintar();
  };
  pintar(); setTimeout(paso, 550);
}
JUEGOS.push({
  id: 'veintiuno', e: '🃏', n: 'Veintiuno', d: 'Acércate a 21 sin pasarte', col: '#1d4a36', nota: 'no cambia con la suerte', ocupado: () => !!(mano && !mano.fin),
  alSalir() { if (mano && !mano.fin) bancaJuega(true); },
  vista() {
    const h = mano, activa = h && !h.fin && !h.bancaJuega;
    return `<h2>🃏 Veintiuno</h2><p class="sub">Pide cartas para acercarte a 21 sin pasarte. La banca pide hasta 17. Veintiuno a la primera paga 3 a 2. Este juego no cambia con la suerte del día: depende de cómo juegues.</p>
      ${vistaMano()}
      ${activa ? `<div class="panel botones3"><button class="grande" id="pedir">Pedir</button><button class="grande verde" id="plantarse">Plantarse</button>${h.j.length === 2 && C.fichas >= h.apuesta ? `<button class="grande claro" id="doblar21">Doblar (+${fmt(h.apuesta)})</button>` : ''}</div>`
        : `<div class="panel">${selectorHTML()}<button class="grande" id="repartir">Repartir</button></div>`}`;
  },
  conectar() {
    const r = $('#repartir');
    if (r) r.onclick = () => {
      const m = revisarMonto(); if (!m || !apostar(m)) return;
      mano = { j: [nuevaCarta(azar), nuevaCarta(azar)], b: [nuevaCarta(azar), nuevaCarta(azar)], apuesta: m, fin: false };
      Sonido.play('carta');
      if (esBlackjack(mano.j) || esBlackjack(mano.b)) { mano.bancaJuega = true; resolver21(); }
      pintar();
    };
    const p = $('#pedir');
    if (p) p.onclick = () => { mano.j.push(nuevaCarta(azar)); Sonido.play('carta'); if (valorMano(mano.j).t > 21) { mano.bancaJuega = true; resolver21(); } else if (valorMano(mano.j).t === 21) return bancaJuega(); pintar(); };
    const pl = $('#plantarse'); if (pl) pl.onclick = () => bancaJuega();
    const d = $('#doblar21');
    if (d) d.onclick = () => {
      if (!apostar(mano.apuesta, true)) return;
      mano.apuesta *= 2; mano.j.push(nuevaCarta(azar)); Sonido.play('carta');
      if (valorMano(mano.j).t > 21) { mano.bancaJuega = true; resolver21(); pintar(); } else bancaJuega();
    };
  },
});
