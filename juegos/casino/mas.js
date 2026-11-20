/* ============================================================
   MÁS JUEGOS — los más jugados en las plataformas de casino:
   lluvia de frutas (cascada), limbo, mayor o menor, torres, keno,
   baccarat y video póker. Reglas y pagos en reglas.js; los que
   tienen `jugarRapido` admiten la apuesta automática.
   ============================================================ */
const espera = t => new Promise(r => setTimeout(r, t));

/* ---------- LLUVIA DE FRUTAS (cascada 6×5) ---------- */
let casc = null, gridMuestra = null;
JUEGOS.push({
  id: 'cascada', e: '🍉', n: 'Lluvia de frutas', d: 'Cascadas, tiradas gratis y multiplicadores', col: '#6b2a5a', rtp: s => NORMAL * s,
  ocupado: () => !!(casc && casc.animando),
  alSalir() { if (casc && casc.animando) { casc.animando = false; pagar(casc.apuesta * casc.j.x, casc.apuesta, juegoDe('cascada')); } },
  vista() {
    const s = factor(), c = casc;
    if (!gridMuestra) gridMuestra = tiradaCascada(azar, 1, false).pasos[0].grid;
    const grid = c && c.grid ? c.grid : gridMuestra, gana = c && c.resaltar ? c.resaltar : [];
    let celdas = '';
    for (let r = 0; r < CASCADA.filas; r++) for (let k = 0; k < CASCADA.cols; k++) {
      const x = grid[k][r];
      celdas += `<span class="cc ${!x.m && gana.includes(x.e) ? 'gana' : ''} ${x.e === CASCADA.scatter.e ? 'scatter' : ''} ${x.m ? 'multi' : ''}">${x.e}${x.m ? `<b>×${x.m}</b>` : ''}</span>`;
    }
    return `<h2>🍉 Lluvia de frutas</h2><p class="sub">Paga con 8 o más frutas iguales en cualquier parte. Las que pagan desaparecen y caen otras, así que puede volver a pagar en la misma tirada. Con 4 o más 🍭 vienen ${CASCADA.gratis} tiradas gratis, y en ellas los 🌈 multiplican lo ganado.</p>
      ${c && c.enGratis ? `<div class="banner verde"><span class="emo">🍭</span><span><b>Tirada gratis ${c.gratisVa} de ${c.gratisTotal}</b><small>Llevas ${fmt(c.acumulado)} 🪙</small></span></div>` : ''}
      <div class="cascada">${celdas}</div>
      <div class="pozo">${c ? (c.x ? '+' + fmt(c.apuesta * c.x) + ' 🪙' : c.animando ? '…' : 'Sin premio') : ''}</div>
      <details class="panel"><summary><b>Tabla de pagos</b> · devuelve ~${pctDev(NORMAL * s)}</summary>
        ${tablaHTML(CASCADA.simbolos.map(sm => [sm.e, `${fmtX(pagoCascada(sm, 8, s))} · ${fmtX(pagoCascada(sm, 10, s))} · ${fmtX(pagoCascada(sm, 12, s))}`]))}
        <p class="sub" style="margin:8px 0 0">Con 8-9, 10-11 y 12 o más iguales. 🍭: 4 pagan ${fmtX(pagoScatter(4, s))}, 5 pagan ${fmtX(pagoScatter(5, s))} y 6 pagan ${fmtX(pagoScatter(6, s))}, más ${CASCADA.gratis} tiradas gratis (+${CASCADA.regratis} si salen 3 dentro). Medido en 800.000 jugadas simuladas: gana algo en ~${fmtP(CASCADA.stats.gana)} de las tiradas (muchas veces menos que lo apostado) y hay tiradas gratis ~1 de cada ${CASCADA.stats.gratisCada}.</p></details>
      <div class="panel">${selectorHTML()}<button class="grande" id="tirarCasc">Tirar</button></div>`;
  },
  conectar() { $('#tirarCasc').onclick = () => this.jugarRapido(revisarMonto()); },
  async jugarRapido(m) {
    if (!m || (casc && casc.animando) || !apostar(m)) return null;
    const s = factor(), j = jugadaCascada(azar, s), yo = juegoDe('cascada');
    const c = casc = { j, apuesta: m, animando: true, x: 0, acumulado: 0, grid: null, resaltar: [], enGratis: false, gratisVa: 0, gratisTotal: j.gratis };
    const ver = () => { if (vista === 'juego:cascada') pintar(); };
    for (let ti = 0; ti < j.tiradas.length && c.animando; ti++) {
      const t = j.tiradas[ti];
      if (ti === 1) { c.enGratis = true; Sonido.play('premio'); confeti(90); aviso(`🍭 ¡${j.gratis} tiradas gratis!`, 'gana'); await espera(ms(900)); }
      if (ti >= 1) c.gratisVa = ti;
      for (const paso of t.pasos) {
        if (!c.animando) break;
        c.grid = paso.grid; c.resaltar = paso.ganan.map(g => g.e); ver();
        if (paso.ganan.length) { Sonido.play('gana'); await espera(ms(650)); } else await espera(ms(ti ? 300 : 220));
      }
      if (t.mult > 1 && t.base > 0) { aviso(`🌈 Multiplicador ×${t.mult}`, 'gana'); await espera(ms(500)); }
      c.acumulado += Math.floor(m * t.x); c.x += t.x; ver();
    }
    if (!c.animando) return null;                         // ya se pagó al cerrar la página
    c.animando = false; c.resaltar = [];
    pagar(m * j.x, m, yo); ver();
    return { apuesta: m, pago: m * j.x };
  },
});

/* ---------- LIMBO ---------- */
let lObjetivo = 2, lHist = [], lJugando = false;
const txtLimbo = () => `${fmtP(pLimbo(lObjetivo, factor()))} de ganar · paga ${fmtX(lObjetivo)}`;
JUEGOS.push({
  id: 'limbo', e: '📈', n: 'Limbo', d: 'Elige un objetivo: ¿llega o no?', col: '#2a3f6b', rtp: rtpLimbo, ocupado: () => lJugando,
  vista() {
    const u = lHist[0];
    return `<h2>📈 Limbo</h2><p class="sub">Eliges un multiplicador objetivo y sale un número al instante. Si llega a tu objetivo, ganas tu apuesta por el objetivo; si no, la pierdes. Mientras más alto, menos probable.</p>
      <div class="dado-num ${u ? (u.gano ? 'bien' : 'mal') : ''}" id="limboNum">${u ? fmtX(u.x) : '×1'}</div>
      ${historialHTML(lHist.map(h => ({ txt: fmtX(h.x), bien: h.gano })))}
      <div class="panel"><div class="fila"><span>Objetivo</span><input id="objetivo" type="number" inputmode="decimal" step="0.01" min="1.01" value="${lObjetivo}" style="width:120px"></div>
        <div class="chips">${[1.5, 2, 3, 10, 100].map(x => `<button class="chip ${x === lObjetivo ? 'sel' : ''}" data-obj="${x}">${fmtX(x)}</button>`).join('')}</div>
        <div class="pozo" id="txtLimbo">${txtLimbo()}</div></div>
      <div class="panel">${selectorHTML()}<button class="grande" id="jugarLimbo">Jugar</button></div>`;
  },
  conectar() {
    const inp = $('#objetivo');
    inp.oninput = () => { const v = +inp.value; if (v >= 1.01) { lObjetivo = Math.min(1e6, Math.round(v * 100) / 100); $('#txtLimbo').textContent = txtLimbo(); } };
    inp.onchange = () => pintar();
    document.querySelectorAll('[data-obj]').forEach(b => b.onclick = () => { lObjetivo = +b.dataset.obj; Sonido.play('tap'); pintar(); });
    $('#jugarLimbo').onclick = () => this.jugarRapido(revisarMonto());
  },
  async jugarRapido(m) {
    if (!m || lJugando || !apostar(m)) return null;
    lJugando = true;
    const s = factor(), T = lObjetivo, x = resultadoLimbo(azar(), s), gano = x >= T, el = $('#limboNum');
    if (el) {
      el.className = 'dado-num';
      for (let i = 1; i <= 10; i++) { el.textContent = fmtX(1 + (x - 1) * (i / 10) * (i / 10)); await espera(ms(38)); }
      el.textContent = fmtX(x); el.classList.add(gano ? 'bien' : 'mal');
    }
    lHist.unshift({ x, gano }); lHist = lHist.slice(0, 14);
    lJugando = false;
    const pago = gano ? m * T : 0;
    pagar(pago, m, juegoDe('limbo'));
    if (!auto) setTimeout(() => { if (!lJugando && vista === 'juego:limbo') pintar(); }, ms(500));
    return { apuesta: m, pago };
  },
});

/* ---------- MAYOR O MENOR ---------- */
let hilo = null;
const cartaHilo = az => { const v = Math.floor(az() * 13); return { v, r: VALORES_HILO[v], p: PALOS[Math.floor(az() * 4)] }; };
function cobrarHilo() {
  const h = hilo; if (!h || h.fin || h.justo <= 1) return;
  h.fin = true; h.gano = true;
  pagar(h.apuesta * pagoHilo(h.justo, h.s), h.apuesta, juegoDe('hilo'));
  if (vista === 'juego:hilo') pintar();
}
JUEGOS.push({
  id: 'hilo', e: '↕️', n: 'Mayor o menor', d: 'Adivina la próxima carta y encadena', col: '#4a2a6b', rtp: rtpHilo,
  ocupado: () => !!(hilo && !hilo.fin),
  alSalir() { if (hilo && !hilo.fin && hilo.justo > 1) cobrarHilo(); },
  vista() {
    const h = hilo, activa = h && !h.fin, carta = h ? h.carta : null;
    let acciones = '';
    if (activa) {
      const op = (dir, p, txt) => `<button class="op" data-dir="${dir}" ${p >= 1 ? 'disabled' : ''}><b>${txt}</b><small>${fmtP(p)} · ${p >= 1 ? 'segura: no sube' : 'pasa a ' + fmtX(pagoHilo(h.justo / p, h.s))}</small></button>`;
      acciones = `<div class="panel"><div class="opciones">${op('sube', pMayorIgual(carta.v), '⬆️ Mayor o igual')}${op('baja', pMenorIgual(carta.v), '⬇️ Menor o igual')}</div>
        <div class="botones3" style="margin-top:8px"><button class="grande claro" id="saltar">Saltar carta</button><button class="grande verde" id="cobrarHilo" ${h.justo > 1 ? '' : 'disabled'}>${h.justo > 1 ? 'Cobrar ' + fmt(h.apuesta * pagoHilo(h.justo, h.s)) : 'Cobrar'}</button></div></div>`;
    }
    return `<h2>↕️ Mayor o menor</h2><p class="sub">Sale una carta y adivinas si la próxima será mayor o menor (si sale igual, ganas igual). Cada acierto sube el premio; cobras cuando quieras o te saltas una carta que no te guste.</p>
      <div class="hilo-mesa"><div class="hilo-carta">${carta ? cartaHTML(carta) : '<div class="carta tapada"></div>'}</div>
        <div class="hilo-info">${activa ? `<b>${fmtX(pagoHilo(h.justo, h.s))}</b><small>${fmt(h.apuesta * pagoHilo(h.justo, h.s))} 🪙</small>` : h ? `<b>${h.gano ? '✅' : '❌'}</b>` : ''}</div></div>
      <div class="hilo-cadena">${h ? h.cadena.slice(-12).map(x => `<span class="${x.ok ? '' : 'mal'}">${x.r}${x.dir === 'sube' ? '⬆️' : x.dir === 'baja' ? '⬇️' : '⏭️'}</span>`).join('') : ''}</div>
      ${activa ? acciones : `<div class="panel">${selectorHTML()}<button class="grande" id="empezarHilo">Sacar la primera carta</button></div>`}`;
  },
  conectar() {
    const e = $('#empezarHilo');
    if (e) e.onclick = () => { const m = revisarMonto(); if (!m || !apostar(m)) return; hilo = { apuesta: m, s: factor(), carta: cartaHilo(azar), justo: 1, cadena: [], fin: false }; Sonido.play('carta'); pintar(); };
    document.querySelectorAll('[data-dir]').forEach(b => b.onclick = () => {
      const h = hilo; if (!h || h.fin) return;
      const dir = b.dataset.dir, v = h.carta.v, p = dir === 'sube' ? pMayorIgual(v) : pMenorIgual(v), n = cartaHilo(azar), ok = dir === 'sube' ? n.v >= v : n.v <= v;
      h.cadena.push({ r: h.carta.r, dir, ok }); h.carta = n; Sonido.play('carta');
      if (!ok) { h.fin = true; h.gano = false; vibrar(40); pagar(0, h.apuesta, juegoDe('hilo')); return pintar(); }
      h.justo /= p; Sonido.play('gema');
      if (h.apuesta * pagoHilo(h.justo, h.s) - h.apuesta >= CFG.tope) return cobrarHilo();
      pintar();
    });
    const sl = $('#saltar'); if (sl) sl.onclick = () => { const h = hilo; h.cadena.push({ r: h.carta.r, dir: 'salta', ok: true }); h.carta = cartaHilo(azar); Sonido.play('carta'); pintar(); };
    const c = $('#cobrarHilo'); if (c) c.onclick = cobrarHilo;
  },
});

/* ---------- TORRES ---------- */
let torreModo = 'normal', torre = null;
function cobrarTorre() {
  const t = torre; if (!t || t.fin || !t.piso) return;
  t.fin = true;
  pagar(t.apuesta * multTorre(t.piso, t.modo, t.s), t.apuesta, juegoDe('torres'));
  if (vista === 'juego:torres') pintar();
}
JUEGOS.push({
  id: 'torres', e: '🗼', n: 'Torres', d: 'Sube piso por piso sin caer', col: '#5a4a2a', rtp: rtpTorres,
  ocupado: () => !!(torre && !torre.fin),
  alSalir() { if (torre && !torre.fin && torre.piso) cobrarTorre(); },
  vista() {
    const s = factor(), t = torre, activa = t && !t.fin, modo = activa ? t.modo : torreModo, M = MODOS_TORRE[modo];
    let pisos = '';
    for (let k = PISOS_TORRE - 1; k >= 0; k--) {
      const actual = activa && t.piso === k;
      const puertas = Array.from({ length: M.puertas }, (_, i) => {
        let cls = 'puerta', txt = '';
        if (t && t.modo === modo && t.elegidas[k] === i) { const mala = t.trampas[k].includes(i); cls += mala ? ' trampa' : ' segura'; txt = mala ? '💀' : '💎'; }
        else if (t && t.fin && t.modo === modo && t.trampas[k].includes(i)) { cls += ' trampa vista'; txt = '💀'; }
        return `<button class="${cls}" ${actual ? `data-puerta="${i}"` : 'disabled'}>${txt}</button>`;
      }).join('');
      pisos += `<div class="piso ${actual ? 'actual' : ''} ${activa && k < t.piso ? 'pasado' : ''}"><span class="p-mult">${fmtX(multTorre(k + 1, modo, activa ? t.s : s))}</span><div class="puertas" style="grid-template-columns:repeat(${M.puertas},1fr)">${puertas}</div></div>`;
    }
    return `<h2>🗼 Torres</h2><p class="sub">Sube eligiendo una puerta en cada piso: ${M.seguras} de ${M.puertas} son seguras (${fmtP(pPiso(modo))} cada vez). Si eliges la trampa pierdes todo; puedes cobrar en cualquier piso.</p>
      ${activa ? '' : `<div class="chips cuatro">${Object.keys(MODOS_TORRE).map(id => `<button class="chip ${id === torreModo ? 'sel' : ''}" data-modo="${id}">${MODOS_TORRE[id].n}</button>`).join('')}</div>`}
      <div class="torre">${pisos}</div>
      ${activa ? `<button class="grande verde" id="cobrarTorre" ${t.piso ? '' : 'disabled'}>${t.piso ? 'Cobrar ' + fmt(t.apuesta * multTorre(t.piso, modo, t.s)) + ' 🪙' : 'Elige una puerta del primer piso'}</button>`
        : `<div class="panel">${selectorHTML()}<button class="grande" id="empezarTorre">Empezar · ${M.n}</button></div>`}`;
  },
  conectar() {
    document.querySelectorAll('[data-modo]').forEach(b => b.onclick = () => { torreModo = b.dataset.modo; torre = null; Sonido.play('tap'); pintar(); });
    const e = $('#empezarTorre');
    if (e) e.onclick = () => {
      const m = revisarMonto(); if (!m || !apostar(m)) return;
      const M = MODOS_TORRE[torreModo];
      const trampas = Array.from({ length: PISOS_TORRE }, () => {
        const idx = Array.from({ length: M.puertas }, (_, i) => i);
        for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(azar() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
        return idx.slice(0, M.puertas - M.seguras);
      });
      torre = { apuesta: m, s: factor(), modo: torreModo, piso: 0, trampas, elegidas: [], fin: false };
      pintar();
    };
    document.querySelectorAll('[data-puerta]').forEach(b => b.onclick = () => {
      const t = torre; if (!t || t.fin) return;
      const i = +b.dataset.puerta, k = t.piso; t.elegidas[k] = i;
      if (t.trampas[k].includes(i)) { t.fin = true; Sonido.play('boom'); vibrar([60, 40, 80]); pagar(0, t.apuesta, juegoDe('torres')); return pintar(); }
      t.piso++; Sonido.play('gema'); vibrar(10);
      if (t.piso >= PISOS_TORRE || t.apuesta * multTorre(t.piso, t.modo, t.s) - t.apuesta >= CFG.tope) return cobrarTorre();
      pintar();
    });
    const c = $('#cobrarTorre'); if (c) c.onclick = cobrarTorre;
  },
});

/* ---------- KENO ---------- */
let kenoSel = [], kenoUlt = null, kenoJugando = false;
JUEGOS.push({
  id: 'keno', e: '🔢', n: 'Keno', d: 'Elige números y mira cuántos salen', col: '#2a5a6b', rtp: s => rtpKeno(s, 5), ocupado: () => kenoJugando,
  vista() {
    const s = factor(), n = kenoSel.length, tabla = n ? tablaKeno(n, s) : [], u = kenoUlt;
    const celdas = Array.from({ length: KENO_N }, (_, i) => {
      const x = i + 1, sel = kenoSel.includes(x), sale = u && u.sacados.includes(x);
      return `<button class="kn ${sel ? 'sel' : ''} ${sale ? (sel ? 'acierto' : 'sale') : ''}" data-kn="${x}">${x}</button>`;
    }).join('');
    const pg = tabla.reduce((a, f) => a + f.p, 0), dev = tabla.reduce((a, f) => a + f.p * f.x, 0);
    return `<h2>🔢 Keno</h2><p class="sub">Elige de 1 a 10 números del 1 al 40 y salen 10 al azar: mientras más aciertes, más paga. Con pocos números ganas seguido; con muchos, puedes ganar enorme.</p>
      <div class="keno">${celdas}</div>
      <div class="fila" style="margin-top:8px"><span>${n} ${n === 1 ? 'número' : 'números'}${u ? ` · último: ${u.k} ${u.k === 1 ? 'acierto' : 'aciertos'}` : ''}</span><span><button class="chip" id="kAzar">Al azar</button> <button class="chip" id="kLimpiar">Limpiar</button></span></div>
      ${n ? `<div class="panel">${tablaHTML(tabla.slice().reverse().map(f => [`${f.k} ${f.k === 1 ? 'acierto' : 'aciertos'}`, fmtX(f.x), fmtP(f.p)]))}<p class="sub" style="margin:8px 0 0">Gana algo en ${fmtP(pg)} de las jugadas · devuelve ${pctDev(dev)}</p></div>` : ''}
      <div class="panel">${selectorHTML()}<button class="grande" id="jugarKeno" ${n ? '' : 'disabled'}>${n ? 'Jugar' : 'Elige al menos un número'}</button></div>`;
  },
  conectar() {
    document.querySelectorAll('[data-kn]').forEach(b => b.onclick = () => {
      if (kenoJugando || auto) return;
      const x = +b.dataset.kn, i = kenoSel.indexOf(x);
      if (i >= 0) kenoSel.splice(i, 1); else if (kenoSel.length < 10) kenoSel.push(x); else return aviso('Máximo 10 números');
      kenoUlt = null; Sonido.play('tap'); pintar();
    });
    $('#kAzar').onclick = () => { if (kenoJugando || auto) return; kenoSel = sorteoKeno(azar).slice(0, kenoSel.length || 5); kenoUlt = null; Sonido.play('tap'); pintar(); };
    $('#kLimpiar').onclick = () => { if (kenoJugando || auto) return; kenoSel = []; kenoUlt = null; pintar(); };
    const j = $('#jugarKeno'); if (j) j.onclick = () => this.jugarRapido(revisarMonto());
  },
  async jugarRapido(m) {
    if (!m || kenoJugando || !kenoSel.length || !apostar(m)) return null;
    kenoJugando = true;
    const sel = kenoSel.slice(), tabla = tablaKeno(sel.length, factor()), sacados = sorteoKeno(azar);
    document.querySelectorAll('[data-kn]').forEach(b => b.classList.remove('sale', 'acierto'));
    for (const x of sacados) {
      const b = document.querySelector(`[data-kn="${x}"]`); if (b) b.classList.add(sel.includes(x) ? 'acierto' : 'sale');
      Sonido.play(sel.includes(x) ? 'gema' : 'tic');
      await espera(ms(130));
    }
    const k = sel.filter(x => sacados.includes(x)).length, f = tabla.find(t => t.k === k), pago = f ? m * f.x : 0;
    kenoUlt = { sacados, k }; kenoJugando = false;
    pagar(pago, m, juegoDe('keno'));
    if (vista === 'juego:keno' && !auto) pintar();
    return { apuesta: m, pago };
  },
});

/* ---------- BACCARAT ---------- */
let bacApuesta = 'jugador', bacRoad = [], bacMano = null, bacJugando = false;
const NOMBRE_BAC = { jugador: 'Jugador', banca: 'Banca', empate: 'Empate' };
JUEGOS.push({
  id: 'baccarat', e: '🎴', n: 'Baccarat', d: 'Jugador, banca o empate', col: '#6b2a3a', rtp: s => rtpBaccarat(s, 'jugador'), ocupado: () => bacJugando,
  vista() {
    const s = factor(), p = probsBaccarat(), pg = pagosBaccarat(s), h = bacMano;
    const mano = (cartas, vis, tot, nom) => `<small>${nom}${tot != null ? ' · ' + tot : ''}</small><div class="mano">${cartas.slice(0, vis).map(c => cartaHTML(c)).join('')}</div>`;
    return `<h2>🎴 Baccarat</h2><p class="sub">Se reparten dos manos y gana la que más se acerque a 9 (solo cuenta la última cifra; las figuras y el 10 valen cero). Apuestas a Jugador, Banca o Empate; las cartas se piden solas.</p>
      <div class="mesa21">${mano(h ? h.j : [], h ? h.vj : 0, h && h.listo ? h.tj : null, 'Jugador')}${mano(h ? h.b : [], h ? h.vb : 0, h && h.listo ? h.tb : null, 'Banca')}${h && h.listo ? `<div class="res21">${h.gana === 'empate' ? 'Empate' : 'Gana ' + NOMBRE_BAC[h.gana]}</div>` : ''}</div>
      ${bacRoad.length ? `<div class="road">${bacRoad.map(r => `<i class="${r}">${r === 'jugador' ? 'J' : r === 'banca' ? 'B' : 'E'}</i>`).join('')}</div>` : ''}
      <div class="panel"><div class="opciones tres">${['jugador', 'banca', 'empate'].map(a => `<button class="op ${bacApuesta === a ? 'on' : ''}" data-bac="${a}"><b>${NOMBRE_BAC[a]}</b><small>${fmtP(p[a])} · paga ${fmtX(pg[a])}</small></button>`).join('')}</div>
        <p class="sub" style="margin:8px 0 0">Si sale empate y apostaste a Jugador o Banca, recuperas tu apuesta.</p></div>
      <div class="panel">${selectorHTML()}<button class="grande" id="repartirBac">Repartir · ${NOMBRE_BAC[bacApuesta]}</button></div>`;
  },
  conectar() {
    document.querySelectorAll('[data-bac]').forEach(b => b.onclick = () => { if (bacJugando || auto) return; bacApuesta = b.dataset.bac; Sonido.play('tap'); pintar(); });
    $('#repartirBac').onclick = () => this.jugarRapido(revisarMonto());
  },
  async jugarRapido(m) {
    if (!m || bacJugando || !apostar(m)) return null;
    bacJugando = true;
    const a = bacApuesta, r = jugarBaccarat(azar), pg = pagosBaccarat(factor());
    bacMano = Object.assign(r, { vj: 0, vb: 0, listo: false });
    const orden = [['vj', 1], ['vb', 1], ['vj', 2], ['vb', 2]];
    if (r.j.length > 2) orden.push(['vj', 3]);
    if (r.b.length > 2) orden.push(['vb', 3]);
    for (const [k, v] of orden) { bacMano[k] = v; Sonido.play('carta'); if (vista === 'juego:baccarat') pintar(); await espera(ms(380)); }
    bacMano.listo = true;
    bacRoad.push(r.gana); bacRoad = bacRoad.slice(-48);
    const pago = r.gana === a ? m * pg[a] : r.gana === 'empate' ? m : 0;
    bacJugando = false;
    pagar(pago, m, juegoDe('baccarat'));
    if (vista === 'juego:baccarat') pintar();
    return { apuesta: m, pago };
  },
});

/* ---------- VIDEO PÓKER (Jotas o mejor, 8/5) ---------- */
let vp = null;
function cambiarPoker() {
  const h = vp; if (!h || h.fase !== 'elegir') return;
  h.mano = h.mano.map((c, i) => (h.hold[i] ? c : h.mazo.shift()));
  h.res = evaluarPoker(h.mano); h.fase = 'fin';
  Sonido.play('carta');
  pagar(h.res ? h.apuesta * h.res.x : 0, h.apuesta, juegoDe('poker'));
  if (vista === 'juego:poker') pintar();
}
JUEGOS.push({
  id: 'poker', e: '♠️', n: 'Video póker', d: 'Jotas o mejor', col: '#2a2a6b', nota: 'jugando perfecto ~97,3%',
  ocupado: () => !!(vp && vp.fase === 'elegir'),
  alSalir() { if (vp && vp.fase === 'elegir') cambiarPoker(); },
  vista() {
    const h = vp, ahora = h ? (h.fase === 'fin' ? h.res : evaluarPoker(h.mano)) : null;
    return `<h2>♠️ Video póker</h2><p class="sub">Te tocan 5 cartas: toca las que quieres guardar y cambia las demás una sola vez. Paga según la mano final, desde una pareja de jotas. No cambia con la suerte del día: depende de cómo juegues.</p>
      <div class="panel"><table class="tabla vp">${MANOS_POKER.map(mn => `<tr class="${ahora && ahora.id === mn.id ? 'activa' : ''}"><td>${mn.n}</td><td>${fmtX(mn.x)}</td></tr>`).join('')}</table></div>
      <div class="vp-mano">${h ? h.mano.map((c, i) => `<button class="vp-carta ${h.hold[i] ? 'guardada' : ''}" data-hold="${i}" ${h.fase === 'elegir' ? '' : 'disabled'}>${cartaHTML(c)}<small>${h.hold[i] ? 'GUARDADA' : ''}</small></button>`).join('') : Array.from({ length: 5 }, () => '<div class="vp-carta"><div class="carta tapada"></div><small></small></div>').join('')}</div>
      ${h ? `<div class="res21">${h.fase === 'fin' ? (h.res ? h.res.n + ' · ' + fmtX(h.res.x) : 'Sin premio') : ahora ? 'Tienes: ' + ahora.n : 'Elige qué cartas guardar'}</div>` : ''}
      ${h && h.fase === 'elegir' ? '<button class="grande" id="cambiarVP">Cambiar las que no guardaste</button>' : `<div class="panel">${selectorHTML()}<button class="grande" id="repartirVP">Repartir</button></div>`}`;
  },
  conectar() {
    const r = $('#repartirVP');
    if (r) r.onclick = () => {
      const m = revisarMonto(); if (!m || !apostar(m)) return;
      const mazo = mazoBarajado(azar);
      vp = { apuesta: m, mazo, mano: mazo.splice(0, 5), hold: [false, false, false, false, false], fase: 'elegir', res: null };
      Sonido.play('carta'); pintar();
    };
    document.querySelectorAll('[data-hold]').forEach(b => b.onclick = () => { if (!vp || vp.fase !== 'elegir') return; const i = +b.dataset.hold; vp.hold[i] = !vp.hold[i]; Sonido.play('tap'); pintar(); });
    const c = $('#cambiarVP'); if (c) c.onclick = cambiarPoker;
  },
});
