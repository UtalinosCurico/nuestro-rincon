/* ============================================================
   PANEL SECRETO DE LA CASA (para Diego)
   La entrada es un easter egg: mantener apretado el contador de
   fichas (arriba a la derecha) unos 3 segundos. Mientras tanto no
   se ve nada, y en un teléfono donde no juega Diego no pasa nada:
   ni el gesto ni el panel se notan. Es un escondite, no seguridad
   de banco (el repo es público y el API no tiene usuarios).
   Lo que se cambia aquí se ve en los porcentajes del casino: las
   pantallas siempre muestran lo que de verdad paga cada juego.
   ============================================================ */
const MS_TOQUE_LARGO = 3000;
let toqueLargo = 0, secretoAbierto = false, borrador = null;
function engancharSecreto() {
  const chip = $('#fichas');
  const soltar = () => { clearTimeout(toqueLargo); toqueLargo = 0; };
  chip.addEventListener('pointerdown', () => {
    soltar();
    if (quien() !== 'Diego') return;
    toqueLargo = setTimeout(() => { toqueLargo = 0; abrirSecreto(); }, MS_TOQUE_LARGO);
  });
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) chip.addEventListener(ev, soltar);
  chip.addEventListener('contextmenu', e => e.preventDefault());
}
async function abrirSecreto() {
  if (estaOcupado() || quien() !== 'Diego') return;
  try { await Nube.leer(); } catch (e) { /* sin señal: usa la copia local de la config */ }
  secretoAbierto = true; borrador = null;
  vibrar(30); Sonido.play('premio');
  cerrar(); vista = 'secreto'; pintar(); scrollTo(0, 0);
}

/* ---------- el panel ---------- */
const PRESETS = [[85, 'Casa dura'], [97, 'Normal'], [110, 'Generosa'], [130, 'Muy generosa']];
function textoDev(v) { return `De cada 100 fichas apostadas vuelven ~${v} en promedio. ${v < 100 ? 'A la larga se pierde: los premios cuestan lo que dicen sus días de regalo.' : v === 100 ? 'Queda parejo.' : 'Ojo: sobre 100% las fichas crecen jugando y los premios salen mucho más seguido que lo que dicen sus días.'}`; }
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
    <h2>Premios</h2><p class="sub">Cómo ponerles precio: con la tasa bajo 100%, en promedio nadie saca en premios más fichas que las que recibe gratis (el regalo del día, de hasta ${fmt(REGALO_TOPE)}, el préstamo de Michi y lo que tú regales). Apostar todo de una vez cambia cuándo llega un premio, no cuántos. Por eso cada premio dice a cuántos días de regalo equivale: es cada cuánto sale, en promedio.</p>
    <div class="panel">${b.premios.map((p, i) => `<div class="fila-premio">
        <input type="checkbox" data-pr="${i}" data-campo="activo" ${p.activo ? 'checked' : ''} aria-label="Activo">
        <input class="e" value="${esc(p.e)}" data-pr="${i}" data-campo="e" aria-label="Emoji">
        <input class="n" value="${esc(p.n)}" data-pr="${i}" data-campo="n" aria-label="Nombre">
        <label>🪙<input type="number" min="1" value="${p.precio}" data-pr="${i}" data-campo="precio"></label>
        <label>🎡<input type="number" min="0" max="100" step="0.1" value="${p.peso}" data-pr="${i}" data-campo="peso">%</label>
        <button class="chip" data-quitar="${i}" aria-label="Quitar">🗑️</button><small class="dias" id="dias_${i}">≈ ${diasDe(p.precio)} días de regalo</small></div>`).join('')}
      <button class="chip" id="agregarPremio" style="margin-top:8px">＋ Agregar premio</button>
      <div class="fila" style="margin-top:12px"><span>Precio de un giro de la ruleta de antojos</span><input type="number" min="1" id="precioAntojo" value="${b.antojoPrecio}" style="width:100px"></div>
      <div class="fila"><span>Lo máximo que se gana en una jugada</span><input type="number" min="1000" step="1000" id="topeJugada" value="${b.tope}" style="width:110px"></div>
      <p class="sub" style="margin:0">Con ${fmt(b.tope)}, el premio mayor necesita al menos ${Math.max(1, Math.ceil((b.premios.reduce((a, p) => Math.max(a, p.activo ? p.precio : 0), 0)) / b.tope))} ${Math.ceil((b.premios.reduce((a, p) => Math.max(a, p.activo ? p.precio : 0), 0)) / b.tope) === 1 ? 'golpe' : 'golpes'} de suerte seguidos: ninguna jugada sola lo regala.</p>
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
    <div class="pie"><button id="salirPanel">🚪 Salir del panel</button></div>`;
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
      else if (c === 'precio') { p.precio = Math.max(1, Math.round(+inp.value || 1)); const d = $('#dias_' + inp.dataset.pr); if (d) d.textContent = '≈ ' + diasDe(p.precio) + ' días de regalo'; }
      else if (c === 'peso') p.peso = Math.max(0, Math.min(100, +inp.value || 0));
      else p[c] = inp.value;
      $('#resAntojos').textContent = resumenAntojos(b);
    };
    inp.oninput = leerCampo; inp.onchange = leerCampo;
  });
  document.querySelectorAll('[data-quitar]').forEach(x => x.onclick = () => { b.premios.splice(+x.dataset.quitar, 1); pintar(); });
  $('#agregarPremio').onclick = () => { b.premios.push({ id: 'p' + uid(), e: '🎁', n: 'Premio nuevo', d: '', precio: 5000, peso: 0, activo: true }); pintar(); };
  $('#precioAntojo').oninput = () => { b.antojoPrecio = Math.max(1, Math.round(+$('#precioAntojo').value || 1)); $('#resAntojos').textContent = resumenAntojos(b); };
  $('#topeJugada').onchange = () => { b.tope = Math.max(1000, Math.round(+$('#topeJugada').value || 50000)); pintar(); };
  $('#guardarPanel').onclick = () => {
    const limpio = b.premios.filter(p => String(p.n).trim()).map(p => Object.assign({}, p, { n: String(p.n).trim(), e: String(p.e).trim() || '🎁' }));
    guardarConfig(c => { c.devolucion = Object.assign({}, b.devolucion); c.premios = limpio; c.antojoPrecio = b.antojoPrecio; c.tope = b.tope; });
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
  $('#salirPanel').onclick = () => { secretoAbierto = false; borrador = null; vista = 'lobby'; pintar(); scrollTo(0, 0); };
}

/* arranque: todos los archivos ya se cargaron */
engancharSecreto();
arrancar();
