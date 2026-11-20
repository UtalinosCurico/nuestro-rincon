/* ============================================================
   PANEL SECRETO DE LA CASA (para Diego)
   Se abre tocando 7 veces seguidas el nombre del casino, solo en el
   teléfono donde juega Diego, y dibujando su patrón (3×3, como el
   desbloqueo del teléfono). El patrón se guarda como huella SHA-256
   en `datos.casino.config.patron`, nunca en el código.
   Es un escondite, no seguridad de banco: el repo es público y el
   API no tiene usuarios.
   Lo que se cambia aquí se ve en los porcentajes del casino: las
   pantallas siempre muestran lo que de verdad paga cada juego.
   ============================================================ */
let toquesTitulo = [], secretoAbierto = false, borrador = null;
function engancharSecreto() {
  $('#titulo').addEventListener('click', () => {
    if (quien() !== 'Diego') return;
    const ahora = Date.now();
    toquesTitulo = toquesTitulo.filter(t => ahora - t < 3000); toquesTitulo.push(ahora);
    if (toquesTitulo.length >= 7) { toquesTitulo = []; abrirSecreto(); }
  });
}
async function huella(seq) {
  const txt = 'casinoRincon|' + seq.join('-');
  try { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt)); return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join(''); }
  catch (e) { let h = 2166136261; for (let i = 0; i < txt.length; i++) { h ^= txt.charCodeAt(i); h = Math.imul(h, 16777619); } return 'f' + (h >>> 0).toString(16); }
}
async function abrirSecreto() {
  if (estaOcupado()) return;
  if (secretoAbierto) { vista = 'secreto'; pintar(); return; }
  try { await Nube.leer(); } catch (e) { /* usa la copia local de la config */ }
  if (!CFG.patron) crearPatron(false); else pedirPatron(0);
}
function entrarAlPanel() { cerrar(); secretoAbierto = true; borrador = null; Sonido.play('premio'); vista = 'secreto'; pintar(); scrollTo(0, 0); }

/* ---------- el patrón ---------- */
const centroP = i => [40 + (i % 3) * 80, 40 + Math.floor(i / 3) * 80];
function patronHTML(titulo, sub) {
  return `<div class="emo">🔐</div><h3>${titulo}</h3>${sub ? `<p>${sub}</p>` : ''}<div class="patron" id="patron"><svg id="patronSvg" viewBox="0 0 240 240"></svg>${Array.from({ length: 9 }, (_, i) => `<i data-p="${i}" style="left:${(centroP(i)[0] / 2.4).toFixed(2)}%;top:${(centroP(i)[1] / 2.4).toFixed(2)}%"></i>`).join('')}</div>
    <button class="grande claro" onclick="cerrar()">Cancelar</button>`;
}
function leerPatron(alTerminar) {
  const caja = $('#patron'), svg = $('#patronSvg');
  let seq = [], dibujando = false, cursor = null;
  const pos = e => { const r = caja.getBoundingClientRect(); return [(e.clientX - r.left) * 240 / r.width, (e.clientY - r.top) * 240 / r.height]; };
  const dibujar = () => {
    const pts = seq.map(centroP).concat(cursor && seq.length ? [cursor] : []);
    svg.innerHTML = pts.length > 1 ? `<polyline points="${pts.map(p => p.join(',')).join(' ')}" fill="none" stroke="#f2c14e" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" opacity=".85"/>` : '';
    caja.querySelectorAll('[data-p]').forEach(d => d.classList.toggle('on', seq.includes(+d.dataset.p)));
  };
  const tocar = (x, y) => {
    for (let i = 0; i < 9; i++) {
      const [cx, cy] = centroP(i);
      if (Math.hypot(cx - x, cy - y) > 30 || seq.includes(i)) continue;
      /* si se pasa por encima del punto del medio, ese también cuenta (como en el teléfono) */
      if (seq.length) {
        const [ax, ay] = centroP(seq[seq.length - 1]), medio = [0, 1, 2, 3, 4, 5, 6, 7, 8].find(j => centroP(j)[0] === (ax + cx) / 2 && centroP(j)[1] === (ay + cy) / 2);
        if (medio != null && !seq.includes(medio)) seq.push(medio);
      }
      seq.push(i); vibrar(8); Sonido.play('tic');
    }
  };
  caja.onpointerdown = e => { caja.setPointerCapture(e.pointerId); dibujando = true; seq = []; const [x, y] = pos(e); tocar(x, y); cursor = [x, y]; dibujar(); };
  caja.onpointermove = e => { if (!dibujando) return; const [x, y] = pos(e); tocar(x, y); cursor = [x, y]; dibujar(); };
  const soltar = () => { if (!dibujando) return; dibujando = false; cursor = null; dibujar(); if (seq.length) alTerminar(seq.slice()); };
  caja.onpointerup = soltar; caja.onpointercancel = soltar;
}
function crearPatron(cambiando) {
  tarjeta(patronHTML(cambiando ? 'Tu patrón nuevo' : 'Crea tu patrón secreto', 'Une al menos 4 puntos sin levantar el dedo. Con este patrón vas a entrar al panel.'));
  leerPatron(uno => {
    if (uno.length < 4) { aviso('Une al menos 4 puntos'); return crearPatron(cambiando); }
    tarjeta(patronHTML('Repítelo', 'Dibuja el mismo patrón otra vez.'));
    leerPatron(async dos => {
      if (dos.join() !== uno.join()) { aviso('No coincide: empecemos de nuevo'); return crearPatron(cambiando); }
      const h = await huella(uno);
      let existia = false;
      try { await Nube.escribir(R => { if (R.config.patron && !cambiando) { existia = true; return; } R.config.patron = h; R.config.t = Date.now(); }); }
      catch (e) { cerrar(); aviso('Para guardar el patrón hace falta internet'); return; }
      if (existia) return pedirPatron(0);
      aviso(cambiando ? 'Patrón cambiado' : 'Patrón guardado', 'gana');
      entrarAlPanel();
    });
  });
}
function pedirPatron(fallos) {
  tarjeta(patronHTML('', ''));
  leerPatron(async seq => {
    if (await huella(seq) === CFG.patron) return entrarAlPanel();
    vibrar([40, 30, 40]);
    if (fallos >= 2) { cerrar(); return; }
    pedirPatron(fallos + 1);
  });
}

/* ---------- el panel ---------- */
const PRESETS = [[85, 'Casa dura'], [97, 'Normal'], [110, 'Generosa'], [130, 'Muy generosa']];
function textoDev(v) { return `De cada 100 fichas apostadas vuelven ~${v} en promedio. ${v < 100 ? 'A la larga se pierde.' : v === 100 ? 'Queda parejo.' : 'A la larga se gana.'}`; }
function resumenAntojos(b) {
  const g = gajosAntojos(b.premios), pg = g.filter(x => x.premio).reduce((a, x) => a + x.p, 0);
  return `Gana algo en ${fmtP(pg)} de los giros · devuelve ${Math.round(rtpAntojos(b.premios, b.antojoPrecio) * 100)}% del precio, medido en precios de tienda.`;
}
function vistaSecreto() {
  if (!secretoAbierto) { vista = 'lobby'; return vistaLobby(); }
  if (!borrador) borrador = JSON.parse(JSON.stringify(CFG));
  const b = borrador, ev = CFG.evento && CFG.evento.hasta > Date.now() ? CFG.evento : null;
  const marc = Nube.remoto ? Nube.remoto.marcador : {};
  const vales = todosLosVales().slice().reverse();
  return `<h2>🕹️ Panel de la casa</h2><p class="sub">Solo tú entras aquí. Lo que cambies llega a los dos teléfonos al abrir el casino (o en unos minutos) y se ve en los porcentajes de cada juego.</p>
    <div class="stats">${PERSONAS.map(p => { const m = marc[p] || {}; return `<div><small>${p}</small><b>${m.fichas != null ? fmt(m.fichas) + ' 🪙' : '—'}</b><small>${m.jugadas ? fmt(m.jugadas) + ' jugadas · ' + fmt(m.canjeado || 0) + ' en premios' : 'sin datos aún'}</small></div>`; }).join('')}</div>
    <h2>Tasa de ganancia</h2>
    ${PERSONAS.map(p => { const v = Math.round(b.devolucion[p] * 100); return `<div class="panel"><div class="fila"><b>${p}</b><span class="pozo" style="font-size:22px;margin:0" id="lbl_${p}">${v}%</span></div>
      <input type="range" min="50" max="150" step="1" value="${v}" data-dev="${p}" style="width:100%">
      <div class="chips cuatro">${PRESETS.map(([n, t]) => `<button class="chip ${v === n ? 'sel' : ''}" data-preset="${p}|${n}">${t}<br><small>${n}%</small></button>`).join('')}</div>
      <p class="sub" style="margin:8px 0 0" id="txt_${p}">${textoDev(v)}</p></div>`; }).join('')}
    <h2>Premios</h2><div class="panel">${b.premios.map((p, i) => `<div class="fila-premio">
        <input type="checkbox" data-pr="${i}" data-campo="activo" ${p.activo ? 'checked' : ''} aria-label="Activo">
        <input class="e" value="${esc(p.e)}" data-pr="${i}" data-campo="e" aria-label="Emoji">
        <input class="n" value="${esc(p.n)}" data-pr="${i}" data-campo="n" aria-label="Nombre">
        <label>🪙<input type="number" min="1" value="${p.precio}" data-pr="${i}" data-campo="precio"></label>
        <label>🎡<input type="number" min="0" max="100" step="0.1" value="${p.peso}" data-pr="${i}" data-campo="peso">%</label>
        <button class="chip" data-quitar="${i}" aria-label="Quitar">🗑️</button></div>`).join('')}
      <button class="chip" id="agregarPremio" style="margin-top:8px">＋ Agregar premio</button>
      <div class="fila" style="margin-top:12px"><span>Precio de un giro de la ruleta de antojos</span><input type="number" min="1" id="precioAntojo" value="${b.antojoPrecio}" style="width:100px"></div>
      <p class="sub" id="resAntojos" style="margin:8px 0 0">${resumenAntojos(b)}</p></div>
    <button class="grande" id="guardarPanel">Guardar cambios</button>
    <h2>Hora feliz</h2><div class="panel">${ev ? `<p>🍀 Activa para <b>${ev.para === 'todos' ? 'los dos' : esc(ev.para)}</b>: devuelve ${Math.round(ev.valor * 100)}% hasta las ${new Date(ev.hasta).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}.</p><button class="grande claro" id="quitarEvento">Terminarla ya</button>` : `
      <p class="sub" style="margin:0 0 8px">Un rato en que la casa devuelve más. A quien le toque le aparece «¡Hora feliz!» en el casino.</p>
      <div class="fila"><span>Para</span><select id="evPara"><option value="Catalina">Catalina</option><option value="Diego">Diego</option><option value="todos">Los dos</option></select></div>
      <div class="fila"><span>Devuelve <b id="evLbl">120%</b></span><input type="range" id="evValor" min="100" max="160" value="120"></div>
      <div class="fila"><span>Dura</span><select id="evDura"><option value="30">30 minutos</option><option value="60" selected>1 hora</option><option value="180">3 horas</option><option value="dia">Hasta medianoche</option></select></div>
      <button class="grande verde" id="empezarEvento">Empezar la hora feliz</button>`}</div>
    <h2>Regalar fichas</h2><div class="panel">
      <div class="fila"><span>Para</span><select id="regPara">${PERSONAS.map(p => `<option ${p === 'Catalina' ? 'selected' : ''}>${p}</option>`).join('')}</select></div>
      <div class="fila"><span>Fichas</span><input type="number" id="regMonto" min="1" value="1000" style="width:110px"></div>
      <input id="regMsg" placeholder="Un mensajito (opcional)" maxlength="120" style="width:100%;margin-top:6px">
      <button class="grande verde" id="regalar">Enviar el regalo</button><p class="sub" style="margin:6px 0 0">Le llega la próxima vez que abra el casino.</p></div>
    <h2>Vales</h2>${vales.length ? vales.map(v => valeHTML(v, v.estado !== 'cumplido' && !v.subiendo ? `<button class="chip ok" data-cumplir="${esc(v.id)}">Cumplido</button>` : '')).join('') : '<p class="sub">Nadie ha canjeado nada todavía.</p>'}
    <div class="pie"><button id="cambiarPatron">🔐 Cambiar el patrón</button><button id="salirPanel">🚪 Salir del panel</button></div>`;
}
async function guardarConfig(mutar, txt) {
  try { await Nube.escribir(R => { mutar(R.config); R.config.t = Date.now(); }); }
  catch (e) { aviso('No se pudo guardar: revisa la conexión'); return false; }
  borrador = null; Sonido.play('gana'); aviso(txt || 'Guardado ✓', 'gana'); pintar(); return true;
}
function conectarSecreto() {
  if (!secretoAbierto) return;
  const b = borrador;
  document.querySelectorAll('[data-dev]').forEach(r => r.oninput = () => {
    const p = r.dataset.dev, v = +r.value; b.devolucion[p] = v / 100;
    $('#lbl_' + p).textContent = v + '%'; $('#txt_' + p).textContent = textoDev(v);
  });
  document.querySelectorAll('[data-preset]').forEach(x => x.onclick = () => { const [p, v] = x.dataset.preset.split('|'); b.devolucion[p] = +v / 100; Sonido.play('tap'); pintar(); });
  document.querySelectorAll('[data-pr]').forEach(inp => {
    const leerCampo = () => {
      const p = b.premios[+inp.dataset.pr], c = inp.dataset.campo;
      if (c === 'activo') p.activo = inp.checked;
      else if (c === 'precio') p.precio = Math.max(1, Math.round(+inp.value || 1));
      else if (c === 'peso') p.peso = Math.max(0, Math.min(100, +inp.value || 0));
      else p[c] = inp.value;
      $('#resAntojos').textContent = resumenAntojos(b);
    };
    inp.oninput = leerCampo; inp.onchange = leerCampo;
  });
  document.querySelectorAll('[data-quitar]').forEach(x => x.onclick = () => { b.premios.splice(+x.dataset.quitar, 1); pintar(); });
  $('#agregarPremio').onclick = () => { b.premios.push({ id: 'p' + uid(), e: '🎁', n: 'Premio nuevo', d: '', precio: 5000, peso: 0, activo: true }); pintar(); };
  $('#precioAntojo').oninput = () => { b.antojoPrecio = Math.max(1, Math.round(+$('#precioAntojo').value || 1)); $('#resAntojos').textContent = resumenAntojos(b); };
  $('#guardarPanel').onclick = () => {
    const limpio = b.premios.filter(p => String(p.n).trim()).map(p => Object.assign({}, p, { n: String(p.n).trim(), e: String(p.e).trim() || '🎁' }));
    guardarConfig(c => { c.devolucion = Object.assign({}, b.devolucion); c.premios = limpio; c.antojoPrecio = b.antojoPrecio; });
  };
  const ev = $('#empezarEvento');
  if (ev) {
    $('#evValor').oninput = () => { $('#evLbl').textContent = $('#evValor').value + '%'; };
    ev.onclick = () => {
      const d = $('#evDura').value, ahora = new Date();
      const hasta = d === 'dia' ? new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 23, 59, 59).getTime() : Date.now() + (+d) * 60000;
      guardarConfig(c => { c.evento = { hasta, valor: +$('#evValor').value / 100, para: $('#evPara').value }; }, 'Hora feliz activada 🍀');
    };
  }
  const q = $('#quitarEvento'); if (q) q.onclick = () => guardarConfig(c => { c.evento = null; }, 'Hora feliz terminada');
  $('#regalar').onclick = async () => {
    const para = $('#regPara').value, m = Math.round(+$('#regMonto').value || 0), msg = $('#regMsg').value.trim().slice(0, 120);
    if (m < 1) return aviso('¿Cuántas fichas?');
    try { await Nube.escribir(R => { if (!Array.isArray(R.regalos[para])) R.regalos[para] = []; R.regalos[para].push({ id: uid(), fichas: m, msg, de: quien() || 'Diego', t: Date.now() }); }); }
    catch (e) { return aviso('No se pudo enviar: revisa la conexión'); }
    Sonido.play('premio'); aviso(`Regalo enviado: ${fmt(m)} 🪙 para ${para}`, 'gana'); $('#regMsg').value = '';
    if (para === quien()) sincronizar(true);
  };
  document.querySelectorAll('[data-cumplir]').forEach(x => x.onclick = () => cumplirVale(x.dataset.cumplir));
  $('#cambiarPatron').onclick = () => crearPatron(true);
  $('#salirPanel').onclick = () => { secretoAbierto = false; borrador = null; vista = 'lobby'; pintar(); scrollTo(0, 0); };
}

/* arranque: todos los archivos ya se cargaron */
engancharSecreto();
arrancar();
