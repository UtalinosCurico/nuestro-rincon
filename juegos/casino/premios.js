/* ============================================================
   PREMIOS DE VERDAD — fichas que se cambian por cosas reales.
   Un canje queda en la nube como vale (`datos.casino.canjes`): lo
   ven los dos teléfonos y lo marca cumplido quien lo debe.
   En la tienda las fichas se descuentan solo si el vale subió bien.
   En la ruleta de antojos el vale ganado se guarda primero en local
   (`C.pendientes`) y se sube en la próxima sincronización: así un
   premio nunca se pierde por falta de señal.
   ============================================================ */
function valeHTML(v, acciones) {
  const cumplido = v.estado === 'cumplido';
  return `<div class="vale ${cumplido ? 'cumplido' : ''}"><span class="emo">${esc(v.e)}</span><div class="v-txt"><small>VALE ${v.num ? 'N° ' + String(v.num).padStart(4, '0') : '· guardando…'}</small><b>${esc(v.n)}</b>
    <small>${esc(v.de)} → lo cumple ${esc(v.para || '—')} · ${new Date(v.t).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}${v.via === 'ruleta' ? ' · ganado en la ruleta' : ''}</small></div>
    <span class="v-estado">${cumplido ? '✅ cumplido' : '⏳ por cumplir'}</span>${acciones || ''}</div>`;
}
function vistaPremios() {
  const q = quien(), otro = otraDe(q), vales = todosLosVales().slice().reverse();
  const mios = vales.filter(v => v.de === q), debo = vales.filter(v => v.para === q && v.estado !== 'cumplido');
  const activos = CFG.premios.filter(p => p.activo);
  let h = `<h2>🍣 Premios de verdad</h2><p class="sub">Cambia fichas por cosas de verdad. ${otro ? esc(otro) + ' los cumple' : 'Tu pareja los cumple'} cuando le muestres el vale.${Nube.lista ? '' : ' <b>Sin conexión: para canjear hace falta internet.</b>'}</p>`;
  if (debo.length) h += `<div class="panel rosa"><b>🎟️ Tienes que cumplir ${debo.length === 1 ? 'este vale' : 'estos vales'}</b>${debo.map(v => valeHTML(v, `<button class="chip ok" data-cumplir="${esc(v.id)}">Ya lo cumplí</button>`)).join('')}</div>`;
  h += `<button class="banner dorado" data-j="antojos"><span class="emo">🎡</span><span><b>Ruleta de antojos · ${fmt(CFG.antojoPrecio)} 🪙</b><small>Gira y a lo mejor sale sushi, helado o chocolate</small></span><i>›</i></button>`;
  h += `<h2>Tienda</h2><div class="tienda">${activos.map(p => {
    const falta = p.precio - C.fichas;
    return `<div class="premio ${p.id === 'sushi' ? 'mayor' : ''}"><span class="emo">${esc(p.e)}</span><b>${esc(p.n)}</b><small>${esc(p.d)}</small>
      <div class="precio">${fmt(p.precio)} 🪙</div>${falta > 0 ? `<div class="falta"><i style="width:${Math.max(3, Math.min(100, C.fichas / p.precio * 100)).toFixed(0)}%"></i></div><small>te faltan ${fmt(falta)}</small>` : `<button class="chip ok" data-canjear="${esc(p.id)}">Canjear</button>`}</div>`;
  }).join('')}</div>`;
  h += `<h2>Mis vales</h2>${mios.length ? mios.map(v => valeHTML(v)).join('') : '<p class="sub">Todavía no canjeas nada.</p>'}`;
  return h;
}
function conectarPremios() {
  document.querySelectorAll('[data-canjear]').forEach(b => b.onclick = () => {
    const p = CFG.premios.find(x => x.id === b.dataset.canjear); if (!p) return;
    tarjeta(`<div class="emo">${esc(p.e)}</div><h3>¿Canjear ${esc(p.n.toLowerCase())}?</h3><p>Cuesta <b>${fmt(p.precio)} 🪙</b>. Te quedarían ${fmt(C.fichas - p.precio)}.</p>
      <button class="grande" id="siCanje">Canjear</button><button class="grande claro" onclick="cerrar()">Todavía no</button>`);
    $('#siCanje').onclick = () => canjear(p);
  });
  document.querySelectorAll('[data-cumplir]').forEach(b => b.onclick = () => cumplirVale(b.dataset.cumplir));
}
async function canjear(p) {
  const q = quien();
  if (!q) return hojaQuien();
  if (C.fichas < p.precio) { cerrar(); aviso('No te alcanzan las fichas'); return; }
  const btn = $('#siCanje'); if (btn) { btn.disabled = true; btn.textContent = 'Canjeando…'; }
  const vale = { id: uid(), premio: p.id, e: p.e, n: p.n, precio: p.precio, de: q, para: otraDe(q), t: Date.now(), estado: 'pendiente', via: 'tienda' };
  let num = 0;
  try {
    await Nube.escribir(R => { R.seq = (R.seq || 0) + 1; num = R.seq; R.canjes.push(Object.assign({}, vale, { num })); });
  } catch (e) { cerrar(); aviso('No se pudo canjear: revisa la conexión'); return; }
  C.fichas -= p.precio; C.canjeado += p.precio; guardar();
  vale.num = num;
  Sonido.play('premio'); confeti(180); vibrar([30, 40, 80]);
  tarjeta(`<div class="ticket"><small>VALE N° ${String(num).padStart(4, '0')}</small><div class="emo">${esc(p.e)}</div><h3>${esc(p.n)}</h3><p>Muéstraselo a <b>${esc(vale.para || 'tu pareja')}</b>: ya le aparece en su teléfono.</p></div>
    <button class="grande" onclick="cerrar();pintar()">¡Listo!</button>`);
}
async function cumplirVale(id) {
  const q = quien();
  try {
    await Nube.escribir(R => { const v = R.canjes.find(x => x.id === id); if (v && v.estado !== 'cumplido') { v.estado = 'cumplido'; v.tc = Date.now(); v.cumplio = q; } });
  } catch (e) { aviso('No se pudo guardar: revisa la conexión'); return; }
  Sonido.play('gana'); aviso('Vale cumplido ✅', 'gana'); guardar(); pintar();
}

/* ---------- la ruleta de antojos ---------- */
let aGiro = 0, aPartes = [], aGirando = false;
const COLORES_ANTOJO = ['#d6463f', '#4f8fd9', '#2fa565', '#f2c14e', '#c46ad0', '#f29e4c', '#3fb5b0', '#e76f9b', '#7a6a8a'];
function antojosSVG(gajos) {
  const c = 160, R = 150, t = []; let ang = 0;
  aPartes = [];
  gajos.forEach((g, i) => {
    const d = g.p * 360; if (d <= 0) return;
    const a0 = (ang - 90) * Math.PI / 180, a1 = (ang + d - 90) * Math.PI / 180;
    const p = a => [c + R * Math.cos(a), c + R * Math.sin(a)].map(v => v.toFixed(2)).join(' ');
    const col = g.premio ? COLORES_ANTOJO[i % COLORES_ANTOJO.length] : '#3b3b44';
    t.push(d >= 359.9 ? `<circle cx="${c}" cy="${c}" r="${R}" fill="${col}"/>` : `<path d="M${c} ${c}L${p(a0)}A${R} ${R} 0 ${d > 180 ? 1 : 0} 1 ${p(a1)}Z" fill="${col}" stroke="#15281f" stroke-width="1.5"/>`);
    if (d > 7) { const am = (ang + d / 2 - 90) * Math.PI / 180, x = c + 110 * Math.cos(am), y = c + 110 * Math.sin(am); t.push(`<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="${d > 40 ? 15 : 20}" text-anchor="middle" dominant-baseline="middle" fill="#fff" font-weight="700">${g.premio ? esc(g.premio.e) : 'Nada'}</text>`); }
    aPartes.push({ i, desde: ang, hasta: ang + d });
    ang += d;
  });
  return `<svg viewBox="0 0 320 320"><circle cx="160" cy="160" r="158" fill="#c9a14a"/><g class="rueda-giro" id="giroA" style="transform:rotate(${aGiro}deg)">${t.join('')}</g><circle cx="160" cy="160" r="22" fill="#c9a14a"/><circle cx="160" cy="160" r="12" fill="#6b4226"/></svg>`;
}
JUEGOS.push({
  id: 'antojos', e: '🎡', n: 'Ruleta de antojos', d: 'Premios de verdad', grupo: 'premios', ocupado: () => aGirando,
  vista() {
    const gajos = gajosAntojos(CFG.premios), pg = gajos.filter(g => g.premio).reduce((a, g) => a + g.p, 0);
    return `<h2>🎡 Ruleta de antojos</h2><p class="sub">Cada giro cuesta ${fmt(CFG.antojoPrecio)} 🪙. Si cae en un premio, te llevas el vale y ${esc(otraDe(quien()) || 'tu pareja')} lo cumple. Los gajos miden lo que pesa cada premio.</p>
      <div class="rueda-caja"><div class="puntero"></div>${antojosSVG(gajos)}<div class="centro-res" id="resAntojo"></div></div>
      <div class="panel">${tablaHTML(gajos.map(g => [g.premio ? `${esc(g.premio.e)} ${esc(g.premio.n)}` : 'Nada', fmtP(g.p)]))}<p class="sub" style="margin:8px 0 0">Ganas algo en ${fmtP(pg)} de los giros.</p></div>
      <button class="grande" id="girarA" ${C.fichas < CFG.antojoPrecio ? 'disabled' : ''}>Girar · ${fmt(CFG.antojoPrecio)} 🪙</button>
      ${C.fichas < CFG.antojoPrecio ? `<p class="sub" style="text-align:center">Te faltan ${fmt(CFG.antojoPrecio - C.fichas)} fichas.</p>` : ''}`;
  },
  conectar() {
    $('#girarA').onclick = () => {
      if (aGirando) return;
      if (!quien()) return hojaQuien();
      const precio = CFG.antojoPrecio;
      if (!apostar(precio)) { aviso('No te alcanzan las fichas'); return; }
      aGirando = true; $('#girarA').disabled = true;
      const gajos = gajosAntojos(CFG.premios), g = elegirPeso(gajos, azar), k = gajos.indexOf(g);
      const parte = aPartes.find(x => x.i === k) || aPartes[0];
      const dentro = parte.desde + (parte.hasta - parte.desde) * (0.15 + azar() * 0.7);
      aGiro = aGiro - (aGiro % 360) + 360 * 7 + (360 - dentro) % 360;
      $('#giroA').style.transform = `rotate(${aGiro}deg)`;
      let tics = 0; const tic = setInterval(() => { Sonido.play('tic'); if (++tics > 24) clearInterval(tic); }, 150);
      setTimeout(() => {
        clearInterval(tic); aGirando = false;
        if (!g.premio) {
          $('#resAntojo').textContent = '✕'; pagar(0, precio, this);
          setTimeout(() => { if (vista === 'juego:antojos' && !aGirando) pintar(); }, 1100);
          return;
        }
        const p = g.premio, q = quien();
        const vale = { id: uid(), premio: p.id, e: p.e, n: p.n, precio: p.precio, de: q, para: otraDe(q), t: Date.now(), estado: 'pendiente', via: 'ruleta' };
        C.pendientes.push(vale); C.ganado += 0; guardar();
        $('#resAntojo').textContent = p.e;
        Sonido.play('premio'); confeti(200); vibrar([30, 40, 80]);
        tarjeta(`<div class="ticket"><small>¡GANASTE UN VALE!</small><div class="emo">${esc(p.e)}</div><h3>${esc(p.n)}</h3><p>Ya quedó en <b>Mis vales</b>. ${esc(vale.para || 'Tu pareja')} lo verá en su teléfono.</p></div>
          <button class="grande" onclick="cerrar();irA('premios')">Ver mis vales</button><button class="grande claro" onclick="cerrar();pintar()">Seguir girando</button>`);
        sincronizar(true);
      }, 4800);
    };
  },
});
