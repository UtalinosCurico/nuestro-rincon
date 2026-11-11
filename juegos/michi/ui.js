/* ============================================================
   INTERFAZ — la casita, los cuidados y las ventanas
   ============================================================ */
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => Math.round(n).toLocaleString('es-CL');

const UI = {
  pieza: 'cocina', herramienta: null, tab: { vestidor: 'ropa', tienda: 'comida', logros: 'logros', decor: 'cocina' },
  claveMichi: '', cara: null, caraHasta: 0, comiendo: false, espuma: 0, espumaMax: 0, duchando: null, enjuagueSolo: false,
  ultimaFrase: 0, regalitoT: Date.now() + 8 * 60000, regalitosHoy: { d: '', n: 0 }, hoja: null, arrastre: null,
};
const EMOJI_PIEZA = { cocina: '🍳', bano: '🛁', dormitorio: '🌙', juegos: '🎮', vestidor: '👗' };

/* ============================================================
   MUEBLES (SVG simple, por pieza)
   ============================================================ */
const MUEBLES = {
  cocina: () => `
    <svg style="left:3%;bottom:24%;width:22%" viewBox="0 0 100 180"><rect x="4" y="4" width="92" height="172" rx="14" fill="#f4fafd" stroke="#bfd8e6" stroke-width="4"/><path d="M4 70 h92" stroke="#bfd8e6" stroke-width="4"/><rect x="76" y="24" width="8" height="30" rx="4" fill="#a9c6d6"/><rect x="76" y="86" width="8" height="40" rx="4" fill="#a9c6d6"/><path d="M28 38c-2-3.4-8-2.2-8 2.2 0 4 8 8.8 8 8.8s8-4.8 8-8.8c0-4.4-6-5.6-8-2.2z" fill="#ec7fa9"/><circle cx="36" cy="104" r="6" fill="#f0b43c"/><rect x="18" y="120" width="22" height="14" rx="3" fill="#bde3c8"/></svg>
    <svg style="right:3%;bottom:25%;width:27%" viewBox="0 0 120 92"><rect x="4" y="40" width="112" height="10" rx="5" fill="#c98f5f"/><rect x="14" y="50" width="8" height="40" rx="3" fill="#b57c4e"/><rect x="98" y="50" width="8" height="40" rx="3" fill="#b57c4e"/><path d="M34 40 q26 -26 52 0z" fill="#9fd3ef"/><circle cx="50" cy="24" r="9" fill="#f05a5a"/><circle cx="66" cy="22" r="9" fill="#f6c34a"/><circle cx="58" cy="12" r="8" fill="#8ccf6d"/></svg>`,
  bano: () => `
    <svg style="left:50%;transform:translateX(-50%);bottom:16%;width:94%;z-index:0" viewBox="0 0 200 80"><path d="M8 24 h184 q0 40 -30 46 h-124 q-30 -6 -30 -46z" fill="#fff" stroke="#bfe0ee" stroke-width="4"/><rect x="4" y="18" width="192" height="10" rx="5" fill="#d9f0f8"/><rect x="38" y="70" width="10" height="9" rx="3" fill="#c0c9cf"/><rect x="152" y="70" width="10" height="9" rx="3" fill="#c0c9cf"/><g fill="#fff" stroke="#d6eef7" stroke-width="1.5"><circle cx="30" cy="16" r="8"/><circle cx="44" cy="12" r="6"/><circle cx="162" cy="15" r="7"/><circle cx="174" cy="11" r="5"/></g></svg>
    <svg style="right:7%;top:0;width:15%" viewBox="0 0 60 130"><rect x="38" y="0" width="8" height="80" rx="4" fill="#b9c4cb"/><path d="M42 80 q0 10 -12 12 h-14" stroke="#b9c4cb" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M2 90 h30 l-4 14 h-22z" fill="#d3dde3"/><g fill="#9fd3ef"><circle cx="9" cy="112" r="2"/><circle cx="17" cy="116" r="2"/><circle cx="25" cy="112" r="2"/></g></svg>
    <svg style="left:5%;top:9%;width:19%" viewBox="0 0 80 100"><ellipse cx="40" cy="46" rx="34" ry="42" fill="#cfe9f5" stroke="#f0b43c" stroke-width="5"/><path d="M22 30 q8 -14 22 -14" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" opacity=".8"/></svg>`,
  dormitorio: () => {
    const h = new Date().getHours(), dia = h >= 7 && h < 20;
    return `
    <svg style="left:6%;top:7%;width:28%" viewBox="0 0 100 92"><rect x="4" y="4" width="92" height="84" rx="10" fill="${dia ? '#bfe6ff' : '#273163'}" stroke="#fff" stroke-width="6"/><path d="M50 4 v84 M4 46 h92" stroke="#fff" stroke-width="5"/>${dia
      ? '<circle cx="74" cy="24" r="10" fill="#ffe27a"/><g fill="#fff"><ellipse cx="26" cy="64" rx="12" ry="5"/><ellipse cx="34" cy="60" rx="8" ry="5"/></g>'
      : '<path d="M76 18a10 10 0 1 0 6 18 12 12 0 1 1 -6 -18z" fill="#f6efc8"/><g fill="#fff"><circle cx="22" cy="20" r="1.6"/><circle cx="34" cy="64" r="1.4"/><circle cx="70" cy="66" r="1.6"/><circle cx="24" cy="74" r="1.2"/></g>'}</svg>
    <svg style="right:2%;bottom:21%;width:36%" viewBox="0 0 160 100"><rect x="120" y="8" width="34" height="84" rx="10" fill="#c98f5f"/><rect x="6" y="50" width="146" height="34" rx="10" fill="#fff"/><path d="M6 60 h146 v22 q0 8 -10 8 h-126 q-10 0 -10 -8z" fill="#f4a9c4"/><g fill="#fff" opacity=".55"><circle cx="30" cy="72" r="3"/><circle cx="60" cy="80" r="3"/><circle cx="90" cy="72" r="3"/></g><ellipse cx="128" cy="48" rx="20" ry="11" fill="#fff" stroke="#f0d9e3" stroke-width="2"/><rect x="10" y="88" width="8" height="10" rx="2" fill="#b57c4e"/><rect x="140" y="88" width="8" height="10" rx="2" fill="#b57c4e"/></svg>
    <svg class="mueble-toque" data-acc="luz" style="left:3%;bottom:24%;width:17%" viewBox="0 0 60 150">${E && !E.durmiendo ? '<circle cx="30" cy="34" r="30" fill="#fff3b0" opacity=".55"/>' : ''}<path d="M8 50 L18 14 H42 L52 50z" fill="${E && !E.durmiendo ? '#ffd86b' : '#b8a37a'}"/><rect x="27" y="50" width="6" height="74" fill="#8b6d50"/><rect x="10" y="124" width="40" height="22" rx="6" fill="#c98f5f"/></svg>`;
  },
  juegos: () => `
    <svg class="mueble-toque" data-acc="arcade" style="left:3%;bottom:24%;width:23%" viewBox="0 0 100 150"><path d="M14 10 h72 l6 30 v104 h-84 v-104z" fill="#a98be0"/><rect x="20" y="22" width="60" height="44" rx="6" fill="#2d2a4a"/><path d="M42 34 l18 10 -18 10z" fill="#ffe27a"/><rect x="14" y="74" width="78" height="22" fill="#8c6bd1"/><circle cx="34" cy="85" r="6" fill="#ec7fa9"/><circle cx="56" cy="85" r="5" fill="#58b9dd"/><circle cx="70" cy="85" r="5" fill="#f0b43c"/><rect x="26" y="104" width="48" height="6" rx="3" fill="#7a5bc0"/></svg>
    <svg style="right:3%;bottom:24%;width:27%" viewBox="0 0 120 84"><rect x="4" y="30" width="112" height="52" rx="8" fill="#f0b43c"/><rect x="4" y="30" width="112" height="12" rx="6" fill="#e09a22"/><circle cx="34" cy="24" r="16" fill="#58b9dd"/><path d="M22 18 q12 8 24 0" stroke="#fff" stroke-width="3" fill="none"/><circle cx="80" cy="20" r="14" fill="#c98f5f"/><circle cx="70" cy="9" r="6" fill="#c98f5f"/><circle cx="90" cy="9" r="6" fill="#c98f5f"/><circle cx="80" cy="24" r="5" fill="#f3d3b0"/></svg>
    <svg style="right:8%;top:10%;width:20%" viewBox="0 0 80 100"><rect x="4" y="4" width="72" height="92" rx="6" fill="#fff" stroke="#f3c8d7" stroke-width="4"/><path d="M40 70 l-18 -18 a10 10 0 0 1 18 -14 a10 10 0 0 1 18 14z" fill="#ec7fa9"/><path d="M14 22 h52" stroke="#a98be0" stroke-width="5" stroke-linecap="round"/></svg>`,
  vestidor: () => `
    <svg style="left:2%;bottom:24%;width:29%" viewBox="0 0 110 190"><rect x="4" y="4" width="102" height="180" rx="10" fill="#d9a877"/><rect x="12" y="12" width="41" height="164" rx="6" fill="#e8bf93"/><rect x="57" y="12" width="41" height="164" rx="6" fill="#e8bf93"/><circle cx="48" cy="96" r="4" fill="#8b6d50"/><circle cx="62" cy="96" r="4" fill="#8b6d50"/><path d="M24 30 h14 M72 30 h14" stroke="#f6dcc0" stroke-width="4" stroke-linecap="round"/></svg>
    <svg style="right:4%;bottom:25%;width:21%" viewBox="0 0 80 160"><ellipse cx="40" cy="56" rx="32" ry="50" fill="#d9eef7" stroke="#f0b43c" stroke-width="6"/><path d="M22 34 q8 -16 22 -18" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" opacity=".85"/><rect x="36" y="106" width="8" height="40" fill="#c98f5f"/><rect x="18" y="144" width="44" height="10" rx="5" fill="#c98f5f"/></svg>`,
};

/* ============================================================
   ARRANQUE
   ============================================================ */
function arrancar() {
  const q = quien();
  E = leerLocal(q) || estadoNuevo(q);
  E.duenio = q || E.duenio;
  const nuevo = !E.importado;
  const imp = importarDelRincon();
  avanzarTiempo();
  if (E.despertoSolo) { E.despertoSolo = false; setTimeout(() => decir(pick(FRASES.manana)), 900); }
  conectar();
  irAPieza(E.durmiendo ? 'dormitorio' : 'cocina', true);
  pintarTodo();
  guardar(true);
  setInterval(latido, 1000);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { guardar(true); Nube.sincronizar(true); }
    else { avanzarTiempo(); revisarRegalos(); pintarTodo(); }
  });
  window.addEventListener('pagehide', () => guardar(true));
  if (!q) { setTimeout(() => hojaQuien(), 400); }
  else if (nuevo) { setTimeout(() => hojaBienvenida(imp), 400); }
  else revisarRegalos();
  Nube.leer().then(() => {
    const mejor = Nube.respaldoMejor();
    if (mejor && !UI.hoja) hojaRespaldo(mejor);
    else Nube.sincronizar(true);
  }).catch(() => { /* sin conexión: el juego sigue en local */ });
}

function revisarRegalos() {
  const r = cobrarRegalos();
  if (r) {
    aviso('🎁', r.de + ' le mandó ' + fmt(r.monedas) + ' monedas a ' + E.nombre, r.xp ? '+' + r.xp + ' XP' : '', 'oro');
    Sonido.play('moneda'); saltarMonedas(); guardar(true); pintarBarra();
  }
}

/* ============================================================
   EL LATIDO (cada segundo)
   ============================================================ */
let segundos = 0;
function latido() {
  if (document.hidden || !E) return;
  segundos++;
  const estabaDurmiendo = E.durmiendo;
  avanzarTiempo();
  if (estabaDurmiendo && !E.durmiendo) {
    E.despertoSolo = false;
    aviso('☀️', E.nombre + ' despertó', 'Con toda la energía', 'oro');
    decir(pick(FRASES.manana)); pintarEscena(); pintarBandeja();
  }
  pintarNecesidades();
  pintarMichi();
  if (E.durmiendo && segundos % 2 === 0) zzz();
  if (!E.durmiendo && !UI.comiendo && !UI.duchando && Date.now() - UI.ultimaFrase > 26000 + Math.random() * 20000) fraseSola();
  if (segundos % 30 === 0) { guardar(); Nube.sincronizar(false); }
  if (Date.now() > UI.regalitoT) ponerRegalito();
}

/* ============================================================
   PINTAR
   ============================================================ */
function pintarTodo() { pintarBarra(); pintarNecesidades(); pintarEscena(); pintarMichi(true); pintarBandeja(); pintarAvisos(); }

function pintarBarra() {
  const pr = progresoNivel(E.xp);
  $('#nombreMichi').textContent = E.nombre;
  $('#nivelN').textContent = pr.nivel;
  $('#nivelTxt').textContent = 'Nivel ' + pr.nivel + ' · ' + pr.actual + '/' + pr.falta;
  $('#anilloNivel').style.setProperty('--p', (pr.actual / pr.falta * 100).toFixed(1));
  $('#monedasN').textContent = fmt(E.monedas);
}
function saltarMonedas() { const m = $('#btnMonedas'); m.classList.remove('salta'); void m.offsetWidth; m.classList.add('salta'); }

function pintarNecesidades() {
  const cont = $('#necesidades');
  if (!cont.children.length) {
    cont.innerHTML = NECESIDADES.map(n => `<div class="nec" id="nec-${n.id}"><div class="nec-aro" style="--c:${n.color}"><span>${n.emoji}</span></div><small>${n.nombre}</small></div>`).join('');
  }
  for (const n of NECESIDADES) {
    const el = document.getElementById('nec-' + n.id);
    const v = Math.round(E.nec[n.id]);
    el.querySelector('.nec-aro').style.setProperty('--p', v);
    el.classList.toggle('bajo', v < 25);
    el.title = n.nombre + ': ' + v + '%';
  }
}
function pintarAvisos() {
  const nd = (diarioDisponible() ? 1 : 0) + (ruletaDisponible() ? 1 : 0) + pendientesMisiones();
  const a = $('#avisoDiario'); a.hidden = !nd; a.textContent = nd;
  const nl = logrosPorCobrar();
  const b = $('#avisoLogros'); b.hidden = !nl; b.textContent = nl;
}

function pintarEscena() {
  const d = E.decor[UI.pieza];
  $('#pared').dataset.papel = d.papel;
  $('#piso').dataset.piso = d.piso;
  $('#muebles').innerHTML = MUEBLES[UI.pieza]();
  $('#escena').dataset.pieza = UI.pieza;
  $('#escena').classList.toggle('noche', E.durmiendo);
  const p = PIEZAS.find(x => x.id === UI.pieza);
  $('#piezaNombre').textContent = p.nombre;
  $('#piezaEmoji').textContent = EMOJI_PIEZA[UI.pieza];
  $('#puntosPieza').innerHTML = PIEZAS.map(x => `<i class="${x.id === UI.pieza ? 'activa' : ''}"></i>`).join('');
}

function visualMichi() {
  const n = E.nec;
  let ojos = 'normal', boca = 'sonrisa';
  if (E.durmiendo) { ojos = 'cerrados'; }
  else if (UI.cara && Date.now() < UI.caraHasta) { ojos = UI.cara.ojos; boca = UI.cara.boca; }
  else if (E.enfermo) { ojos = 'cansados'; boca = 'triste'; }
  else if (n.energia < 18) { ojos = 'cansados'; }
  else if (n.hambre < 20 || n.animo < 20 || n.limpieza < 15) { ojos = 'tristes'; boca = 'triste'; }
  else if (Math.min(n.hambre, n.animo, n.limpieza, n.energia) > 70) { boca = 'lengua'; }
  return {
    pelaje: E.efectos.arcoiris ? 'arcoiris' : E.pelaje,
    ropa: E.puesto.ropa, sombrero: E.puesto.sombrero, accesorio: E.puesto.accesorio,
    ojos, boca, enfermo: E.enfermo,
    sucio: n.limpieza >= 55 ? 0 : Math.round((55 - n.limpieza) / 55 * 10) / 10,
  };
}
function pintarMichi(forzar) {
  const v = visualMichi();
  const clave = JSON.stringify(v);
  const el = $('#michi');
  if (forzar || clave !== UI.claveMichi) { el.innerHTML = michiHTML(v); UI.claveMichi = clave; }
  el.classList.toggle('dormido', E.durmiendo);
  el.classList.toggle('enfermo', E.enfermo);
  const t = E.efectos.tamano ? E.efectos.tamano.v : 1;
  el.style.transform = 'scale(' + t + ')';
  pintarMoscas();
}
function pintarMoscas() {
  const fx = $('#efectos');
  const quiere = E.nec.limpieza < 28 && !E.durmiendo;
  const hay = fx.querySelectorAll('.mosca');
  if (quiere && !hay.length) {
    const r = rectRelativo($('#michi'), fx);
    for (let i = 0; i < 2; i++) {
      const m = document.createElement('span');
      m.className = 'mosca'; m.textContent = '•';
      m.style.cssText = `left:${r.x + r.w * (0.25 + i * 0.5)}px;top:${r.y + r.h * 0.15}px;animation-delay:${i * -1.1}s;color:#5a4a3a`;
      fx.appendChild(m);
    }
  } else if (!quiere && hay.length) hay.forEach(m => m.remove());
}

/* ============================================================
   PIEZAS Y BANDEJA
   ============================================================ */
function irAPieza(id, sinAnim) {
  UI.pieza = id; UI.herramienta = null; terminarDucha(); limpiarEspuma(true);
  $('#cursorHerramienta').hidden = true;
  pintarEscena(); pintarBandeja();
  if (!sinAnim) Sonido.play('tap');
}
function piezaRelativa(d) {
  const i = PIEZAS.findIndex(p => p.id === UI.pieza);
  irAPieza(PIEZAS[(i + d + PIEZAS.length) % PIEZAS.length].id);
}

function pintarBandeja() {
  const b = $('#bandeja');
  const f = BANDEJAS[UI.pieza];
  b.innerHTML = f();
}
const BANDEJAS = {
  cocina() {
    const lista = COMIDAS.filter(c => E.comida[c.id] > 0);
    const chips = lista.map(c => `<button class="chip" data-comida="${c.id}" aria-label="${esc(c.nombre)}"><span class="cuenta">×${E.comida[c.id]}</span><span class="e">${c.emoji}</span><small>${esc(c.nombre)}</small></button>`).join('');
    return `<div class="fila" id="filaComida">${chips}<button class="chip tienda" data-acc="tienda" data-tab="comida"><span class="e">🛒</span><small>Comprar</small></button></div>
      <p class="nota-bandeja">${lista.length ? 'Toca una comida o arrástrala a su boca' : 'Se acabó la comida: compra más en la tienda 🛒'}</p>`;
  },
  bano() {
    const h = UI.herramienta;
    const pociones = POCIONES.filter(p => E.pociones[p.id] > 0);
    return `<div class="fila">
        <button class="chip ${h === 'jabon' ? 'activo' : ''}" data-herr="jabon"><span class="e">🧼</span><small>Jabón</small></button>
        <button class="chip ${h === 'ducha' ? 'activo' : ''}" data-herr="ducha"><span class="e">🚿</span><small>Ducha</small></button>
        ${pociones.map(p => `<button class="chip" data-pocion="${p.id}"><span class="cuenta">×${E.pociones[p.id]}</span><span class="e">${p.emoji}</span><small>${esc(p.nombre)}</small></button>`).join('')}
        <button class="chip tienda" data-acc="tienda" data-tab="botiquin"><span class="e">🧪</span><small>Botiquín</small></button>
      </div>
      <p class="nota-bandeja">${h === 'jabon' ? 'Frota a ' + esc(E.nombre) + ' con el dedo para hacer espuma' : h === 'ducha' ? 'Mantén apretado para enjuagar' : 'Elige el jabón y después la ducha'}</p>`;
  },
  dormitorio() {
    const e = Math.round(E.nec.energia);
    const falta = E.durmiendo ? Math.ceil((100 - E.nec.energia) / 34 * 60) : 0;
    return `<div class="acciones">
        <button class="boton-grande ${E.durmiendo ? '' : 'principal'}" data-acc="luz"><span class="e">${E.durmiendo ? '☀️' : '💡'}</span>${E.durmiendo ? 'Prender la luz' : 'Apagar la luz'}</button>
      </div>
      <p class="nota-bandeja">${E.durmiendo
        ? `Durmiendo · energía ${e}% · ${falta > 0 ? 'despierta solo en ' + (falta >= 60 ? Math.floor(falta / 60) + ' h ' + (falta % 60) + ' min' : falta + ' min') : 'casi listo'}`
        : `Energía ${e}%. ${e < 40 ? 'Tiene sueñito: apaga la luz' : 'Duerme aunque cierres la app'}`}</p>`;
  },
  juegos() {
    const nv = nivel();
    return `<div class="fila">${MINIJUEGOS.map(m => {
      const bloq = nv < m.nivel;
      return `<button class="chip juego-chip ${bloq ? 'bloq' : ''}" data-juego="${m.id}"><span class="e">${bloq ? '🔒' : m.emoji}</span><small>${esc(m.nombre)}</small>
        <span class="rec">${bloq ? 'Nivel ' + m.nivel : E.records[m.id] ? '🏆 ' + fmt(E.records[m.id]) : 'Nuevo'}</span></button>`;
    }).join('')}</div>`;
  },
  vestidor() {
    const tab = UI.tab.vestidor;
    const tabs = [['ropa', '👕', 'Ropa'], ['sombrero', '🎩', 'Sombreros'], ['accesorio', '🕶️', 'Accesorios'], ['pelaje', '🎨', 'Pelaje']];
    let items;
    if (tab === 'pelaje') {
      items = PELAJES.map(p => {
        const tiene = E.pelajes.includes(p.id), bloq = nivel() < p.nivel;
        return `<button class="chip ${E.pelaje === p.id ? 'activo' : ''} ${bloq && !tiene ? 'bloq' : ''}" data-pelaje="${p.id}">
          <span class="e"><span style="display:inline-block;width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,${p.c.cabeza},${p.c.oscuro});box-shadow:inset 0 0 0 2px rgba(0,0,0,.06)"></span></span>
          <small>${esc(p.nombre)}</small><span class="cuenta">${tiene ? '' : bloq ? '🔒' + p.nivel : '🪙' + p.precio}</span></button>`;
      }).join('');
    } else {
      items = ROPA.filter(r => r.slot === tab).map(r => {
        const tiene = E.ropa.includes(r.id), bloq = nivel() < r.nivel;
        return `<button class="chip ${E.puesto[r.slot] === r.id ? 'activo' : ''} ${bloq && !tiene ? 'bloq' : ''}" data-ropa="${r.id}">
          <span class="e">${r.emoji}</span><small>${esc(r.nombre)}</small><span class="cuenta">${tiene ? '' : bloq ? '🔒' + r.nivel : '🪙' + r.precio}</span></button>`;
      }).join('');
    }
    return `<div class="tabs">${tabs.map(t => `<button class="tab ${tab === t[0] ? 'activa' : ''}" data-tabves="${t[0]}"><span class="e">${t[1]}</span> ${t[2]}</button>`).join('')}</div>
      <div class="fila">${items}</div>`;
  },
};

/* ============================================================
   CONEXIONES (toques)
   ============================================================ */
function conectar() {
  $('#btnVolver').onclick = () => { guardar(true); Nube.sincronizar(true); location.href = '/#juegos'; };
  $('#piezaAnt').onclick = () => piezaRelativa(-1);
  $('#piezaSig').onclick = () => piezaRelativa(1);
  $('#btnMonedas').onclick = () => hojaTienda();
  $('#btnDiario').onclick = () => hojaDiario();
  $('#btnLogros').onclick = () => hojaLogros();
  $('#btnPerfil').onclick = () => hojaPerfil();
  document.addEventListener('keydown', ev => {
    if (!$('#mini').hidden || UI.hoja) return;
    if (ev.key === 'ArrowLeft') piezaRelativa(-1);
    if (ev.key === 'ArrowRight') piezaRelativa(1);
  });

  // bandeja (delegado)
  const b = $('#bandeja');
  b.addEventListener('click', ev => {
    const t = ev.target.closest('button'); if (!t) return;
    if (t.dataset.acc === 'tienda') return hojaTienda(t.dataset.tab);
    if (t.dataset.acc === 'luz') return alternarLuz();
    if (t.dataset.herr) return elegirHerramienta(t.dataset.herr);
    if (t.dataset.pocion) return tomarPocion(t.dataset.pocion);
    if (t.dataset.juego) return abrirJuego(t.dataset.juego);
    if (t.dataset.tabves) { UI.tab.vestidor = t.dataset.tabves; Sonido.play('tap'); return pintarBandeja(); }
    if (t.dataset.ropa) return tocarRopa(t.dataset.ropa);
    if (t.dataset.pelaje) return tocarPelaje(t.dataset.pelaje);
  });
  b.addEventListener('pointerdown', inicioArrastreComida);

  // muebles con acción
  $('#muebles').addEventListener('click', ev => {
    const t = ev.target.closest('[data-acc]'); if (!t) return;
    if (t.dataset.acc === 'luz') alternarLuz();
    if (t.dataset.acc === 'arcade') { const m = MINIJUEGOS.filter(x => x.nivel <= nivel()); abrirJuego(m[Math.floor(Math.random() * m.length)].id); }
  });

  // Michi y la escena
  const esc_ = $('#escena');
  esc_.addEventListener('pointerdown', escenaDown);
  esc_.addEventListener('pointermove', escenaMove);
  window.addEventListener('pointerup', escenaUp);
  window.addEventListener('pointercancel', escenaUp);
}

/* ---------- toques en la escena: cariño, jabón, ducha, deslizar ---------- */
let gesto = null;
function puntoEn(el, ev) { const r = el.getBoundingClientRect(); return { x: ev.clientX - r.left, y: ev.clientY - r.top, w: r.width, h: r.height }; }
function sobreMichi(ev) {
  const r = $('#michi').getBoundingClientRect();
  return ev.clientX > r.left + r.width * 0.08 && ev.clientX < r.right - r.width * 0.08 && ev.clientY > r.top && ev.clientY < r.bottom;
}
function escenaDown(ev) {
  if (ev.target.closest('.regalito') || ev.target.closest('.mueble-toque')) return;
  const p = puntoEn($('#escena'), ev);
  gesto = { x0: ev.clientX, y0: ev.clientY, t0: Date.now(), michi: sobreMichi(ev), movido: 0, ultimo: p };
  if (UI.herramienta === 'jabon') { moverCursor(p); if (gesto.michi) frotar(ev); }
  if (UI.herramienta === 'ducha') { moverCursor(p); empezarDucha(p.x); }
}
function escenaMove(ev) {
  if (UI.herramienta && !gesto) { moverCursor(puntoEn($('#escena'), ev)); return; }
  if (!gesto) return;
  const p = puntoEn($('#escena'), ev);
  gesto.movido = Math.max(gesto.movido, Math.hypot(ev.clientX - gesto.x0, ev.clientY - gesto.y0));
  if (UI.herramienta) moverCursor(p);
  if (UI.herramienta === 'jabon' && sobreMichi(ev)) frotar(ev);
  if (UI.herramienta === 'ducha' && UI.duchando) UI.duchando.x = p.x;
  if (!UI.herramienta && gesto.michi && gesto.movido > 25 && Math.hypot(p.x - gesto.ultimo.x, p.y - gesto.ultimo.y) > 40) {
    gesto.ultimo = p; acariciar(p, true);
  }
}
function escenaUp(ev) {
  if (!gesto) return;
  const g = gesto; gesto = null;
  if (UI.herramienta === 'ducha') terminarDucha();
  if (UI.herramienta) return;
  const dx = ev.clientX - g.x0, dy = ev.clientY - g.y0;
  if (!g.michi && Math.abs(dx) > 60 && Math.abs(dy) < 60) { piezaRelativa(dx < 0 ? 1 : -1); return; }
  if (g.michi && g.movido < 12) acariciar(puntoEn($('#escena'), ev), false);
}
function moverCursor(p) {
  const c = $('#cursorHerramienta');
  c.hidden = false; c.textContent = UI.herramienta === 'jabon' ? '🧼' : '🚿';
  c.style.left = p.x + 'px'; c.style.top = p.y + 'px';
}

function acariciar(p, frotando) {
  if (E.durmiendo) { decir(pick(['zzz…', '5 minutitos más…', '*ronca suavecito*'])); return; }
  const subio = carino();
  Sonido.play(frotando ? 'ronroneo' : Math.random() < 0.3 ? 'miau' : 'ronroneo');
  vibrar(8);
  fx(p.x, p.y - 20, subio ? '💖' : '💗', 'font-size:26px');
  ponerCara('feliz', 'lengua', 1400);
  if (!frotando) saltar();
  if (Math.random() < 0.18) decir(pick(Math.random() < 0.5 ? FRASES.feliz : (quien() === 'Diego' ? FRASES.diego : FRASES.catalina)));
  pintarNecesidades(); pintarAvisos(); guardar();
}
function saltar() { const m = $('#michi'); m.classList.remove('salta'); void m.offsetWidth; m.classList.add('salta'); }
function sacudir() { const m = $('#michi'); m.classList.remove('sacude'); void m.offsetWidth; m.classList.add('sacude'); }
function ponerCara(ojos, boca, ms) { UI.cara = { ojos, boca }; UI.caraHasta = Date.now() + ms; pintarMichi(); }

/* ---------- comer ---------- */
function inicioArrastreComida(ev) {
  const chip = ev.target.closest('[data-comida]'); if (!chip) return;
  const id = chip.dataset.comida;
  const a = { id, chip, x0: ev.clientX, y0: ev.clientY, el: null };
  UI.arrastre = a;
  const mover = e => {
    const d = Math.hypot(e.clientX - a.x0, e.clientY - a.y0);
    if (!a.el && d > 10 && Math.abs(e.clientY - a.y0) > Math.abs(e.clientX - a.x0)) {
      a.el = document.createElement('div');
      a.el.textContent = COMIDAS.find(c => c.id === id).emoji;
      a.el.style.cssText = 'position:fixed;z-index:50;font-size:52px;pointer-events:none;transform:translate(-50%,-50%);font-family:var(--emoji);filter:drop-shadow(0 6px 8px rgba(0,0,0,.25))';
      document.body.appendChild(a.el);
      ponerCara('sorpresa', 'o', 4000);
    }
    if (a.el) { e.preventDefault(); a.el.style.left = e.clientX + 'px'; a.el.style.top = e.clientY + 'px'; }
  };
  const soltar = e => {
    window.removeEventListener('pointermove', mover);
    window.removeEventListener('pointerup', soltar);
    window.removeEventListener('pointercancel', soltar);
    UI.arrastre = null;
    if (a.el) {
      const sobre = sobreMichi(e);
      a.el.remove();
      if (sobre) darComida(id, null); else { UI.cara = null; pintarMichi(); }
    } else if (Math.hypot(e.clientX - a.x0, e.clientY - a.y0) < 10) {
      darComida(id, a.chip);
    }
  };
  window.addEventListener('pointermove', mover, { passive: false });
  window.addEventListener('pointerup', soltar);
  window.addEventListener('pointercancel', soltar);
}
function darComida(id, desde) {
  if (UI.comiendo) return;
  const r = comer(id);
  if (!r.ok) { sacudir(); decir(r.motivo); Sonido.play('error'); UI.cara = null; pintarMichi(); return; }
  UI.comiendo = true;
  const boca = rectRelativo($('#michi'), $('#efectos'));
  const bx = boca.x + boca.w * 0.5, by = boca.y + boca.h * 0.58;
  if (desde) volar(desde, r.c.emoji, bx, by);
  let n = 0;
  const masticar = () => {
    ponerCara('feliz', n % 2 ? 'masca' : 'abierta', 400);
    if (n % 2 === 0) { Sonido.play('comer'); for (let i = 0; i < 3; i++) fx(bx + (Math.random() - 0.5) * 50, by + 10, '•', `color:#c99a6a;font-size:${10 + Math.random() * 8}px`, 'cae'); }
    if (++n < 6) setTimeout(masticar, 190);
    else {
      UI.comiendo = false; ponerCara('feliz', 'lengua', 1200);
      fx(bx, by - 40, '+' + r.c.llena + ' 🍗', 'font-size:20px;color:#c46a1c');
      if (Math.random() < 0.35) decir(pick(['¡Ñam!', 'Qué rico 😋', 'Mmm…', '¡Gracias!']));
      Sonido.play('nam');
      pintarNecesidades(); pintarBandeja(); pintarAvisos(); guardar();
    }
  };
  setTimeout(masticar, desde ? 280 : 0);
}

/* ---------- baño ---------- */
function elegirHerramienta(h) {
  UI.herramienta = UI.herramienta === h ? null : h;
  if (!UI.herramienta) $('#cursorHerramienta').hidden = true;
  Sonido.play('tap'); pintarBandeja();
  if (E.durmiendo && UI.herramienta) { decir('Shh… está durmiendo'); UI.herramienta = null; pintarBandeja(); }
}
let ultimaBurbuja = null;
function frotar(ev) {
  if (E.durmiendo) return;
  const cont = $('#espuma');
  const p = puntoEn(cont, ev);
  if (ultimaBurbuja && Math.hypot(p.x - ultimaBurbuja.x, p.y - ultimaBurbuja.y) < 16) return;
  ultimaBurbuja = p;
  if (UI.espuma >= 46) return;
  const i = document.createElement('i');
  const s = 18 + Math.random() * 26;
  i.style.cssText = `left:${p.x - s / 2}px;top:${p.y - s / 2}px;width:${s}px;height:${s}px`;
  cont.appendChild(i);
  UI.espuma++; UI.espumaMax = Math.max(UI.espumaMax, UI.espuma);
  if (UI.espuma % 3 === 0) Sonido.play('burbuja');
  if (UI.espuma % 8 === 0) ponerCara('feliz', 'lengua', 900);
}
function empezarDucha(x) {
  if (E.durmiendo) return;
  UI.duchando = { x, t0: Date.now(), timer: null, sonido: 0 };
  ponerCara('cerrados', 'sonrisa', 60000);
  const d = UI.duchando;
  d.timer = setInterval(() => {
    const fxEl = $('#efectos');
    for (let k = 0; k < 3; k++) {
      const g = document.createElement('i');
      g.className = 'gota';
      g.style.left = (d.x + (Math.random() - 0.5) * 70) + 'px';
      g.style.top = (Math.random() * 30) + 'px';
      fxEl.appendChild(g);
      setTimeout(() => g.remove(), 620);
    }
    if (Date.now() - d.sonido > 480) { Sonido.play('ducha'); d.sonido = Date.now(); }
    const burbujas = [...$('#espuma').querySelectorAll('i:not(.chau)')];
    for (let k = 0; k < 2 && burbujas.length; k++) {
      const b = burbujas.splice(Math.floor(Math.random() * burbujas.length), 1)[0];
      b.classList.add('chau'); setTimeout(() => b.remove(), 420);
      UI.espuma = Math.max(0, UI.espuma - 1);
    }
    if (UI.espumaMax > 0 && UI.espuma === 0) terminarBano();
    else if (UI.espumaMax === 0 && Date.now() - d.t0 > 1600 && !UI.enjuagueSolo) {
      UI.enjuagueSolo = true;
      const r = banar(0.15);
      fx(d.x, 80, '+' + Math.round(r.subio) + ' 🫧', 'font-size:20px;color:#2a8fb5');
      decir('Mejor con jabón primero 🧼');
      pintarNecesidades(); guardar();
    }
  }, 80);
}
function terminarDucha() {
  if (!UI.duchando) return;
  clearInterval(UI.duchando.timer);
  UI.duchando = null; UI.enjuagueSolo = false;
  if (UI.cara && UI.cara.ojos === 'cerrados') { UI.cara = null; pintarMichi(); }
}
function terminarBano() {
  const cantidad = Math.min(1, UI.espumaMax / 30);
  UI.espumaMax = 0; UI.espuma = 0;
  terminarDucha();
  const r = banar(cantidad);
  const z = rectRelativo($('#michi'), $('#efectos'));
  fx(z.x + z.w / 2, z.y + 10, '+' + Math.round(r.subio) + ' 🫧', 'font-size:22px;color:#2a8fb5');
  if (r.completo) { decir(pick(['¡Quedé brillante! ✨', 'Huelo a flores 🌸', '¡Qué rico el agüita!'])); Sonido.play('bien'); saltar(); }
  ponerCara('feliz', 'lengua', 1600);
  pintarNecesidades(); pintarAvisos(); guardar();
}
function limpiarEspuma(todo) { if (todo) { $('#espuma').innerHTML = ''; UI.espuma = 0; UI.espumaMax = 0; } }

function tomarPocion(id) {
  const r = usarPocion(id);
  if (!r.ok) { decir(r.motivo); sacudir(); Sonido.play('error'); return; }
  Sonido.play('bien'); saltar();
  const z = rectRelativo($('#michi'), $('#efectos'));
  fx(z.x + z.w / 2, z.y + 20, r.p.emoji, 'font-size:34px');
  decir(id === 'medicina' ? 'Ya me siento mejor 💛' : id === 'gigante' ? '¡Soy gigante!' : id === 'mini' ? 'Soy chiquitito' : '¡Wiii!');
  pintarTodo(); guardar();
}

/* ---------- dormir ---------- */
function alternarLuz() {
  Sonido.play('luz');
  if (E.durmiendo) {
    dormir(false); decir(E.nec.energia < 40 ? 'Mmm… tenía sueño 😾' : pick(FRASES.manana));
  } else {
    if (E.nec.energia >= 95) { decir('¡No tengo sueño!'); sacudir(); return; }
    dormir(true); Sonido.play('bostezo'); decir('Buenas noches 💤');
    limpiarEspuma(true); UI.herramienta = null;
  }
  pintarTodo(); guardar();
}
function zzz() {
  const z = rectRelativo($('#michi'), $('#efectos'));
  const s = document.createElement('span');
  s.className = 'zzz'; s.textContent = 'z';
  s.style.left = (z.x + z.w * 0.62) + 'px'; s.style.top = (z.y + z.h * 0.12) + 'px';
  $('#efectos').appendChild(s);
  setTimeout(() => s.remove(), 2600);
}

/* ---------- vestidor ---------- */
function tocarRopa(id) {
  const r = ROPA.find(x => x.id === id);
  if (!E.ropa.includes(id)) return ofrecerCompra('ropa', r);
  ponerse(id); Sonido.play('tap'); saltar(); pintarMichi(); pintarBandeja(); guardar();
}
function tocarPelaje(id) {
  const p = PELAJES.find(x => x.id === id);
  if (!E.pelajes.includes(id)) return ofrecerCompra('pelaje', p);
  if (cambiarPelaje(id)) { Sonido.play('bien'); saltar(); pintarMichi(); pintarBandeja(); guardar(); }
}
function ofrecerCompra(tipo, x) {
  if (nivel() < x.nivel) { aviso('🔒', x.nombre, 'Se desbloquea en nivel ' + x.nivel); Sonido.play('error'); return; }
  const muestra = tipo === 'pelaje'
    ? `<div style="width:120px;margin:0 auto">${michiSVG({ pelaje: x.id, ojos: 'feliz', boca: 'lengua' })}</div>`
    : `<div style="width:120px;margin:0 auto;position:relative" class="michi">${michiHTML({ pelaje: E.pelaje, ropa: x.slot === 'ropa' ? x.id : E.puesto.ropa, sombrero: x.slot === 'sombrero' ? x.id : E.puesto.sombrero, accesorio: x.slot === 'accesorio' ? x.id : E.puesto.accesorio, ojos: 'feliz', boca: 'lengua' })}</div>`;
  abrirHoja(x.nombre, `<div class="centro">${muestra}
      <p class="texto-suave">${tipo === 'pelaje' ? 'Pelaje para siempre' : 'Se queda en su clóset para siempre'}</p>
      <div class="fila-botones"><button class="boton oro" data-comprar ${E.monedas < x.precio ? 'disabled' : ''}>Comprar por 🪙 ${x.precio}</button></div>
      ${E.monedas < x.precio ? `<p class="texto-suave">Te faltan ${x.precio - E.monedas} monedas. Juega minijuegos para ganar más 🎮</p>` : ''}</div>`,
  h => {
    const btn = h.querySelector('[data-comprar]');
    if (btn) btn.onclick = () => {
      const r = comprar(tipo, x.id);
      if (!r.ok) { aviso('🛍️', 'No se pudo', r.motivo); return; }
      if (tipo === 'ropa') ponerse(x.id); else cambiarPelaje(x.id);
      Sonido.play('compra'); saltarMonedas(); cerrarHoja();
      aviso('🛍️', '¡' + x.nombre + ' es suyo!', '−' + x.precio + ' monedas', 'oro');
      saltar(); pintarTodo(); guardar(true);
    };
  });
}

/* ---------- minijuegos ---------- */
function abrirJuego(id) {
  const m = MINIJUEGOS.find(x => x.id === id);
  if (nivel() < m.nivel) { aviso('🔒', m.nombre, 'Se desbloquea en nivel ' + m.nivel); Sonido.play('error'); return; }
  const p = puedeJugar();
  if (!p.ok) { decir(p.motivo); sacudir(); Sonido.play('error'); return; }
  Sonido.play('tap');
  Mini.abrir(m);
}
Mini.alTerminar = (m, puntos) => {
  const r = terminarMinijuego(m.id, puntos);
  pintarTodo(); guardar(true);
  if (r.record) Nube.sincronizar(true);
  return r;
};

/* ============================================================
   VENTANAS (hojas)
   ============================================================ */
function abrirHoja(titulo, html, alPintar) {
  UI.hoja = { titulo, alPintar };
  const h = $('#hoja');
  h.innerHTML = `<div class="hoja-cab"><h2>${titulo}</h2><button class="cerrar" data-cerrar aria-label="Cerrar">✕</button></div>${html}`;
  $('#hojaFondo').hidden = false;
  h.scrollTop = 0;
  h.querySelector('[data-cerrar]').onclick = cerrarHoja;
  $('#hojaFondo').onclick = ev => { if (ev.target.id === 'hojaFondo') cerrarHoja(); };
  if (alPintar) alPintar(h);
}
function cerrarHoja() {
  $('#hojaFondo').hidden = true; $('#hoja').innerHTML = '';
  const despues = UI.hoja && UI.hoja.despues;
  UI.hoja = null;
  pintarAvisos();
  if (despues) despues();
}

/* ---------- tienda ---------- */
function hojaTienda(tab) {
  if (tab) UI.tab.tienda = tab;
  const pintar = () => {
    const t = UI.tab.tienda, nv = nivel();
    const tabs = [['comida', '🍎', 'Comida'], ['botiquin', '🧪', 'Botiquín'], ['decor', '🖼️', 'Decoración']];
    let cuerpo = '';
    if (t === 'comida' || t === 'botiquin') {
      const lista = t === 'comida' ? COMIDAS : POCIONES;
      const inv = t === 'comida' ? E.comida : E.pociones;
      cuerpo = `<div class="grilla">${lista.map(x => {
        const bloq = nv < x.nivel;
        const efecto = t === 'comida' ? `+${x.llena} 🍗${x.animo ? ' +' + x.animo + ' 💖' : ''}${x.energia ? ' +' + x.energia + ' ⚡' : ''}` : x.desc;
        return `<button class="item ${bloq ? 'bloq' : ''}" data-comprar="${x.id}"><span class="e">${bloq ? '🔒' : x.emoji}</span><b>${esc(x.nombre)}</b>
          <small>${bloq ? 'Nivel ' + x.nivel : efecto}</small>${inv[x.id] ? `<span class="cinta">×${inv[x.id]}</span>` : ''}
          <span class="precio ${E.monedas < x.precio ? 'no' : ''}">🪙 ${x.precio}</span></button>`;
      }).join('')}</div><p class="texto-suave centro">Toca para comprar uno. Tienes 🪙 ${fmt(E.monedas)}</p>`;
    } else {
      const pz = UI.tab.decor;
      const d = E.decor[pz];
      const cuadro = (tipo, x) => {
        const tiene = decorTiene(E, tipo, x.id), bloq = nv < x.nivel && !tiene, puesto = d[tipo] === x.id;
        return `<button class="item ${tiene ? 'tiene' : ''} ${puesto ? 'puesto' : ''} ${bloq ? 'bloq' : ''}" data-decor="${tipo}:${x.id}">
          <span class="muestra ${tipo === 'papel' ? 'pared' : 'piso'}" style="position:relative" data-${tipo}="${x.id}"></span><b>${esc(x.nombre)}</b>
          <span class="precio">${puesto ? '✓ Puesto' : tiene ? 'Usar' : bloq ? '🔒 Nivel ' + x.nivel : '🪙 ' + x.precio}</span></button>`;
      };
      cuerpo = `<div class="tabs">${PIEZAS.map(p => `<button class="tab ${pz === p.id ? 'activa' : ''}" data-pz="${p.id}"><span class="e">${EMOJI_PIEZA[p.id]}</span> ${p.nombre}</button>`).join('')}</div>
        <div class="seccion-tit">Papel de la pared</div><div class="grilla">${PAPELES.map(x => cuadro('papel', x)).join('')}</div>
        <div class="seccion-tit">Piso</div><div class="grilla">${PISOS.map(x => cuadro('piso', x)).join('')}</div>
        <p class="texto-suave centro">Lo que compras sirve para todas las piezas.</p>`;
    }
    abrirHoja('Tienda', `<div class="tabs">${tabs.map(x => `<button class="tab ${t === x[0] ? 'activa' : ''}" data-tabt="${x[0]}"><span class="e">${x[1]}</span> ${x[2]}</button>`).join('')}</div>${cuerpo}`, h => {
      h.onclick = ev => {
        const b = ev.target.closest('button'); if (!b) return;
        if (b.dataset.tabt) { UI.tab.tienda = b.dataset.tabt; Sonido.play('tap'); return pintar(); }
        if (b.dataset.pz) { UI.tab.decor = b.dataset.pz; Sonido.play('tap'); return pintar(); }
        if (b.dataset.comprar) {
          const tipo = UI.tab.tienda === 'comida' ? 'comida' : 'pocion';
          const r = comprar(tipo, b.dataset.comprar, 1);
          if (!r.ok) { aviso('🛍️', 'No se pudo', r.motivo); Sonido.play('error'); return; }
          Sonido.play('compra'); saltarMonedas(); pintarBarra(); pintarBandeja(); guardar();
          const y = $('#hoja').scrollTop; pintar(); $('#hoja').scrollTop = y;
        }
        if (b.dataset.decor) {
          const [tipo, id] = b.dataset.decor.split(':');
          const x = (tipo === 'papel' ? PAPELES : PISOS).find(z => z.id === id);
          if (!decorTiene(E, tipo, id)) {
            const r = comprar(tipo, id);
            if (!r.ok) { aviso('🖼️', 'No se pudo', r.motivo); Sonido.play('error'); return; }
            Sonido.play('compra'); saltarMonedas(); aviso('🖼️', x.nombre + ' comprado', 'Ya está puesto en ' + PIEZAS.find(p => p.id === UI.tab.decor).nombre.toLowerCase(), 'oro');
          } else Sonido.play('tap');
          aplicarDecor(UI.tab.decor, tipo, id);
          if (UI.tab.decor !== UI.pieza) irAPieza(UI.tab.decor, true); else pintarEscena();
          pintarBarra(); guardar();
          const y = $('#hoja').scrollTop; pintar(); $('#hoja').scrollTop = y;
        }
      };
    });
  };
  pintar();
}

/* ---------- regalo diario, ruleta y misiones ---------- */
function hojaDiario() {
  const pintar = () => {
    const disp = diarioDisponible();
    const racha = E.diario.ultimo === hoyClave() || E.diario.ultimo === ayerClave() ? E.diario.racha : 0;
    const hoyIdx = disp ? racha % 7 : (racha - 1) % 7;
    const dias = DIARIO.map((d, i) => {
      const hecho = i < hoyIdx || (!disp && i === hoyIdx);
      const extra = d.sorpresa ? '🎁' : d.pocion ? '⚡' : d.comida ? '🍕' : '🪙';
      return `<div class="dia ${hecho ? 'hecho' : ''} ${disp && i === hoyIdx ? 'hoy' : ''}">Día ${i + 1}<span class="e">${hecho ? '✅' : extra}</span><b>${d.monedas}</b></div>`;
    }).join('');
    const ms = misionesDeHoy();
    const misiones = ms.lista.map((m, i) => {
      const def = MISIONES.find(x => x.id === m.id);
      const lista = m.progreso >= m.meta;
      return `<div class="mision ${m.cobrada ? 'cobrada' : lista ? 'lista' : ''}"><div class="txt">${esc(def.txt(m.meta))}
          <div class="barra-av"><i style="width:${Math.round(m.progreso / m.meta * 100)}%"></i></div><small class="texto-suave">${m.progreso}/${m.meta} · 🪙 ${def.premio}</small></div>
        ${m.cobrada ? '✅' : `<button class="boton oro" data-mision="${i}" ${lista ? '' : 'disabled'}>Cobrar</button>`}</div>`;
    }).join('');
    const seg = 360 / RULETA.length;
    const rueda = `conic-gradient(${RULETA.map((s, i) => `${s.color} ${i * seg}deg ${(i + 1) * seg}deg`).join(',')})`;
    const etiquetas = RULETA.map((s, i) => {
      const ang = (i + 0.5) * seg;
      return `<div style="position:absolute;inset:0;transform:rotate(${ang}deg)"><span style="position:absolute;top:8%;left:50%;transform:translateX(-50%);text-align:center;line-height:1.05;font-family:var(--emoji);font-size:20px">${s.emoji}${s.tipo === 'monedas' ? '<br><b style="font-family:var(--fuente);font-size:12px">' + s.n + '</b>' : ''}</span></div>`;
    }).join('');
    abrirHoja('Regalos', `
      <div class="seccion-tit">Regalo diario ${racha ? '· racha ' + racha + ' 🔥' : ''}</div>
      <div class="calendario">${dias}</div>
      <div class="fila-botones"><button class="boton oro" data-diario ${disp ? '' : 'disabled'}>${disp ? '🎁 Abrir el regalo de hoy' : 'Vuelve mañana por otro'}</button></div>
      <div class="seccion-tit">Ruleta de la suerte</div>
      <div class="ruleta-caja"><div class="ruleta-flecha"></div><div class="ruleta-rueda" id="rueda" style="background:${rueda};transform:rotate(${UI.anguloRueda || 0}deg)">${etiquetas}</div><div class="ruleta-centro">🐾</div></div>
      <div class="fila-botones"><button class="boton" data-girar ${ruletaDisponible() ? '' : 'disabled'}>${ruletaDisponible() ? 'Girar (gratis hoy)' : 'Ya giraste hoy'}</button></div>
      <div class="seccion-tit">Misiones de hoy</div>${misiones}
      <p class="texto-suave centro">${ms.bonus ? 'Cofre del día cobrado ✅' : 'Completa las tres y te ganas un cofre extra 🧰'}</p>`, h => {
      h.onclick = ev => {
        const b = ev.target.closest('button'); if (!b) return;
        if (b.hasAttribute('data-diario')) {
          const r = cobrarDiario(); if (!r) return;
          Sonido.play('logro'); saltarMonedas(); confeti(['🪙', '🎁', '💛']);
          aviso('🎁', 'Día ' + (r.dia + 1) + ': +' + r.monedas + ' monedas', r.extra.join(' · '), 'oro');
          pintarTodo(); guardar(true); pintar();
        }
        if (b.hasAttribute('data-girar')) girar(b, pintar);
        if (b.dataset.mision != null) {
          const r = cobrarMision(+b.dataset.mision); if (!r) return;
          Sonido.play('moneda'); saltarMonedas();
          aviso('✅', 'Misión cumplida', '+' + r.monedas + ' monedas', 'oro');
          if (r.bonus) { setTimeout(() => { confeti(['🧰', '🪙', '✨']); Sonido.play('nivel'); aviso('🧰', '¡Cofre del día!', '+' + r.bonus.monedas + ' monedas y 2 × ' + r.bonus.comida.emoji, 'oro'); }, 500); }
          pintarTodo(); guardar(true); pintar();
        }
      };
    });
  };
  pintar();
}
function girar(btn, repintar) {
  const r = girarRuleta(); if (!r) return;
  btn.disabled = true;
  const seg = 360 / RULETA.length;
  const objetivo = 360 - (r.i + 0.5) * seg;
  const base = Math.ceil((UI.anguloRueda || 0) / 360) * 360;
  UI.anguloRueda = base + 5 * 360 + objetivo;
  const rueda = $('#rueda');
  rueda.style.transform = `rotate(${UI.anguloRueda}deg)`;
  let tics = 0; const ticker = setInterval(() => { Sonido.play('ruleta'); if (++tics > 26) clearInterval(ticker); }, 140);
  setTimeout(() => {
    clearInterval(ticker);
    Sonido.play('logro'); confeti(['✨', '🪙']); saltarMonedas();
    aviso(RULETA[r.i].emoji, '¡Ruleta!', r.txt, 'oro');
    pintarTodo(); guardar(true); repintar();
  }, 4300);
}

/* ---------- logros y récords ---------- */
function hojaLogros() {
  const pintar = () => {
    const t = UI.tab.logros;
    let cuerpo;
    if (t === 'logros') {
      cuerpo = LOGROS.map(l => {
        const est = E.logros[l.id], av = avanceLogro(l);
        const cls = est === 'listo' ? 'listo' : est ? '' : 'bloq';
        return `<div class="logro ${cls}"><span class="e">${l.emoji}</span><div class="txt"><b>${esc(l.nombre)}</b><small>${esc(l.txt)} · 🪙 ${l.premio}</small>
          ${!est ? `<div class="barra-av"><i style="width:${Math.round(av * 100)}%"></i></div>` : ''}</div>
          ${est === 'listo' ? `<button class="boton oro" data-logro="${l.id}">Cobrar</button>` : est ? '✅' : ''}</div>`;
      }).join('');
    } else {
      const otro = Nube.otro();
      cuerpo = (otro && otro.records ? `<p class="texto-suave centro">Tus récords contra los de ${esc(otro.persona)}</p>` : `<p class="texto-suave centro">Cuando ${esc(PERSONAS.find(p => p !== quien()) || 'la otra persona')} juegue, aquí aparecen sus récords para picarse 😏</p>`) +
        MINIJUEGOS.map(m => {
          const yo = E.records[m.id] || 0, el = otro && otro.records ? otro.records[m.id] || 0 : null;
          return `<div class="record"><span class="e">${m.emoji}</span><span>${esc(m.nombre)}</span><span class="yo ${el != null && yo > el ? 'gana' : ''}">${yo ? fmt(yo) : '–'}${el != null && yo > el && yo ? ' 👑' : ''}</span>
            <span class="otro">${el != null ? (otro.persona[0] + ': ' + (el ? fmt(el) : '–')) : ''}</span></div>`;
        }).join('');
    }
    abrirHoja('Logros', `<div class="tabs"><button class="tab ${t === 'logros' ? 'activa' : ''}" data-tl="logros">🏆 Logros</button><button class="tab ${t === 'records' ? 'activa' : ''}" data-tl="records">🎮 Récords</button></div>${cuerpo}`, h => {
      h.onclick = ev => {
        const b = ev.target.closest('button'); if (!b) return;
        if (b.dataset.tl) { UI.tab.logros = b.dataset.tl; Sonido.play('tap'); return pintar(); }
        if (b.dataset.logro) {
          const l = cobrarLogro(b.dataset.logro); if (!l) return;
          Sonido.play('moneda'); saltarMonedas(); aviso(l.emoji, l.nombre, '+' + l.premio + ' monedas', 'oro');
          pintarTodo(); guardar(true);
          const y = $('#hoja').scrollTop; pintar(); $('#hoja').scrollTop = y;
        }
      };
    });
  };
  pintar();
}

/* ---------- perfil y ajustes ---------- */
function hojaPerfil() {
  const pr = progresoNivel(E.xp), q = quien();
  const dias = Math.max(1, Math.round((Date.now() - E.creado) / 86400000));
  abrirHoja(esc(E.nombre), `
    <div class="centro"><div class="michi" style="width:140px;margin:0 auto">${michiHTML(Object.assign(visualMichi(), { ojos: 'feliz', boca: 'lengua' }))}</div>
      <p class="texto-suave">Nivel ${pr.nivel} · ${pr.actual}/${pr.falta} XP para el siguiente<br>Juntos hace ${dias} día${dias === 1 ? '' : 's'} · ${E.stats.comidas} comidas · ${E.stats.banos} baños · ${E.stats.partidas} partidas</p></div>
    <div class="fila-botones"><button class="boton claro" data-renombrar>✏️ Cambiar nombre</button><button class="boton claro" data-sonido>${Sonido.mudo() ? '🔇 Sonido apagado' : '🔊 Sonido prendido'}</button></div>
    <div class="seccion-tit">Quién juega en este teléfono</div>
    <div class="fila-botones">${PERSONAS.map(p => `<button class="boton ${q === p ? '' : 'claro'}" data-quien="${p}">${p === 'Catalina' ? '🌷' : '🌿'} ${p}</button>`).join('')}</div>
    <p class="texto-suave centro">Cada uno tiene su propio Michi. Se guarda en este teléfono y en la nube.</p>
    <div class="fila-botones"><button class="boton claro" data-nube>☁️ Traer mi Michi de la nube</button></div>
    <div class="fila-botones"><button class="boton claro" data-reiniciar style="color:#c45">Empezar de cero</button></div>`, h => {
    h.querySelector('[data-renombrar]').onclick = () => hojaNombre();
    h.querySelector('[data-sonido]').onclick = ev => { Sonido.alternar(); ev.target.textContent = Sonido.mudo() ? '🔇 Sonido apagado' : '🔊 Sonido prendido'; Sonido.play('tap'); };
    h.querySelectorAll('[data-quien]').forEach(b => b.onclick = () => cambiarQuien(b.dataset.quien));
    h.querySelector('[data-nube]').onclick = async () => {
      try { await Nube.leer(); } catch (e) { aviso('☁️', 'Sin conexión', 'Intenta más tarde'); return; }
      const g = quien() && Nube.remoto.respaldo[quien()];
      if (!g || !g.save) { aviso('☁️', 'No hay respaldo', 'Todavía no hay un Michi tuyo en la nube'); return; }
      hojaRespaldo(g.save, true);
    };
    h.querySelector('[data-reiniciar]').onclick = () => {
      abrirHoja('¿Empezar de cero?', `<p class="texto-suave centro">${esc(E.nombre)} vuelve al nivel 1, sin monedas ni ropa. No se puede deshacer.</p>
        <div class="fila-botones"><button class="boton claro" data-no>Mejor no</button><button class="boton" data-si style="background:#d9534f">Sí, empezar de cero</button></div>`, h2 => {
        h2.querySelector('[data-no]').onclick = cerrarHoja;
        h2.querySelector('[data-si]').onclick = () => {
          E = estadoNuevo(quien()); E.importado = true; guardar(true); Nube.firma = ''; Nube.sincronizar(true);
          cerrarHoja(); irAPieza('cocina', true); pintarTodo(); aviso('🐣', 'Un nuevo comienzo', 'Michi está listo');
        };
      });
    };
  });
}
function hojaNombre() {
  abrirHoja('Nombre', `<input id="campoNombre" maxlength="16" value="${esc(E.nombre)}" style="width:100%;font:inherit;font-size:20px;padding:12px 14px;border-radius:16px;border:2px solid #f0d9c0;background:#fff;-webkit-user-select:text;user-select:text">
    <div class="fila-botones"><button class="boton" data-ok>Guardar</button></div>`, h => {
    const c = h.querySelector('#campoNombre'); c.focus(); c.select();
    const ok = () => { const v = c.value.trim(); if (v) { E.nombre = v.slice(0, 16); guardar(true); pintarBarra(); } cerrarHoja(); };
    h.querySelector('[data-ok]').onclick = ok;
    c.onkeydown = ev => { if (ev.key === 'Enter') ok(); };
  });
}
function hojaQuien() {
  abrirHoja('¿Quién juega?', `<div class="centro"><div class="michi" style="width:130px;margin:0 auto">${michiHTML(Object.assign(visualMichi(), { ojos: 'feliz', boca: 'lengua' }))}</div>
    <p class="texto-suave">Cada uno tiene su propio Michi en su teléfono.</p></div>
    <div class="fila-botones">${PERSONAS.map(p => `<button class="boton" data-quien="${p}">${p === 'Catalina' ? '🌷' : '🌿'} ${p}</button>`).join('')}</div>`, h => {
    h.querySelectorAll('[data-quien]').forEach(b => b.onclick = () => cambiarQuien(b.dataset.quien, true));
  });
}
function cambiarQuien(p, primeraVez) {
  const antes = quien();
  if (antes === p) { cerrarHoja(); return; }
  if (antes) guardar(true);
  const propio = leerLocal(p);
  const adopta = !antes && !propio && progresoDe(E) > 15;
  try { localStorage.setItem('rinconQuien', p); } catch (e) { /* nada */ }
  if (adopta) {
    E.duenio = p;
    try { localStorage.removeItem(claveDe(null)); localStorage.removeItem(claveDe(null) + '_copia'); } catch (e) { /* nada */ }
  } else {
    E = propio || estadoNuevo(p); E.duenio = p;
  }
  const imp = importarDelRincon();
  Nube.lista = false; Nube.remoto = null; Nube.ultimoMarcador = 0; Nube.ultimoRespaldo = 0; Nube.firma = '';
  avanzarTiempo(); guardar(true); cerrarHoja();
  irAPieza(E.durmiendo ? 'dormitorio' : 'cocina', true); pintarTodo();
  if (primeraVez || !propio) hojaBienvenida(imp);
  else aviso(p === 'Catalina' ? '🌷' : '🌿', 'Hola, ' + p, 'Este es tu Michi');
  Nube.leer().then(() => { const m = Nube.respaldoMejor(); if (m && !UI.hoja) hojaRespaldo(m); else Nube.sincronizar(true); }).catch(() => {});
}
function hojaBienvenida(imp) {
  const q = quien();
  abrirHoja('¡Hola' + (q ? ', ' + q : '') + '!', `<div class="centro"><div class="michi" style="width:150px;margin:0 auto">${michiHTML(Object.assign(visualMichi(), { ojos: 'feliz', boca: 'lengua' }))}</div>
    <p style="font-size:17px;line-height:1.45">Soy <b>${esc(E.nombre)}</b> y esta es mi casita. Dame de comer, báñame, hazme dormir y juguemos para ganar monedas 🪙</p>
    ${imp ? `<p class="tarjeta texto-suave">Me traje lo que tenía en el Rincón de juegos: ${imp.prendas ? imp.prendas + ' prenda' + (imp.prendas === 1 ? '' : 's') : ''}${imp.prendas && imp.monedas ? ' y ' : ''}${imp.monedas ? fmt(imp.monedas) + ' monedas' : ''} 💛</p>` : ''}
    <p class="texto-suave">Paso hambre y sueño aunque cierres la app, así que vuelve a verme seguido. Cada día hay un regalo 🎁</p></div>
    <div class="fila-botones"><button class="boton" data-ok>¡Vamos!</button></div>`, h => {
    h.querySelector('[data-ok]').onclick = () => { cerrarHoja(); Sonido.play('miau'); saltar(); revisarRegalos(); };
  });
}
function hojaRespaldo(save, pedido) {
  const lv = nivelDe(save.xp || 0);
  const hace = save.t ? Math.max(1, Math.round((Date.now() - save.t) / 60000)) : null;
  abrirHoja('Tu Michi en la nube', `<div class="centro"><div class="michi" style="width:130px;margin:0 auto">${michiHTML({ pelaje: save.pelaje, ropa: save.puesto && save.puesto.ropa, sombrero: save.puesto && save.puesto.sombrero, accesorio: save.puesto && save.puesto.accesorio, ojos: 'feliz', boca: 'lengua' })}</div>
    <p style="font-size:17px">${esc(save.nombre || 'Michi')} · nivel ${lv} · 🪙 ${fmt(save.monedas || 0)}</p>
    <p class="texto-suave">${hace ? 'Guardado hace ' + (hace >= 60 * 24 ? Math.round(hace / 1440) + ' días' : hace >= 60 ? Math.round(hace / 60) + ' h' : hace + ' min') + '. ' : ''}${pedido ? 'Si lo traes, reemplaza al Michi de este teléfono.' : 'Parece que jugaste en otro teléfono. ¿Lo traigo aquí?'}</p></div>
    <div class="fila-botones"><button class="boton claro" data-no>Dejar este</button><button class="boton" data-si>Traerlo</button></div>`, h => {
    h.querySelector('[data-no]').onclick = () => { cerrarHoja(); Nube.sincronizar(true); };
    h.querySelector('[data-si]').onclick = () => {
      E = normalizar(JSON.parse(JSON.stringify(save))); E.duenio = quien(); E.importado = true;
      avanzarTiempo(); guardar(true); cerrarHoja(); irAPieza(E.durmiendo ? 'dormitorio' : 'cocina', true); pintarTodo();
      aviso('☁️', 'Michi llegó', 'Nivel ' + nivel(), 'oro');
    };
  });
}

/* ---------- subir de nivel y logros ---------- */
const colaNivel = [];
Ev.nivel = (lv, premio, desbloqueos) => { colaNivel.push({ lv, premio, desbloqueos }); setTimeout(mostrarNivel, 300); };
function mostrarNivel() {
  if (UI.hoja || !$('#mini').hidden || !colaNivel.length) { if (colaNivel.length) setTimeout(mostrarNivel, 1200); return; }
  const n = colaNivel.shift();
  Sonido.play('nivel'); vibrar(40); confeti(['⭐', '🎉', '💛', '🪙']);
  abrirHoja('¡Nivel ' + n.lv + '!', `<div class="centro"><div class="michi" style="width:140px;margin:0 auto">${michiHTML(Object.assign(visualMichi(), { ojos: 'feliz', boca: 'lengua' }))}</div>
    <p style="font-size:18px">${esc(E.nombre)} subió a nivel ${n.lv} 🎉<br><b>+${n.premio} monedas</b></p>
    ${n.desbloqueos.length ? `<div class="tarjeta" style="text-align:left"><b>Se desbloqueó:</b><br><span class="texto-suave">${n.desbloqueos.map(esc).join('<br>')}</span></div>` : ''}</div>
    <div class="fila-botones"><button class="boton" data-ok>¡Bien!</button></div>`, h => {
    h.querySelector('[data-ok]').onclick = cerrarHoja;
  });
  UI.hoja.despues = () => { pintarTodo(); if (colaNivel.length) setTimeout(mostrarNivel, 300); };
}
Ev.logro = l => { setTimeout(() => { aviso(l.emoji, '¡Logro: ' + l.nombre + '!', 'Cóbralo en 🏆 · ' + l.premio + ' monedas', 'oro'); Sonido.play('logro'); pintarAvisos(); }, 600); };

/* ============================================================
   EFECTOS, AVISOS, FRASES
   ============================================================ */
function rectRelativo(el, cont) {
  const a = el.getBoundingClientRect(), b = cont.getBoundingClientRect();
  return { x: a.left - b.left, y: a.top - b.top, w: a.width, h: a.height };
}
function fx(x, y, txt, estilo = '', clase = '') {
  const s = document.createElement('span');
  s.className = 'fx ' + clase; s.textContent = txt;
  s.style.cssText = `left:${x}px;top:${y}px;transform:translate(-50%,-50%);${estilo}`;
  $('#efectos').appendChild(s);
  setTimeout(() => s.remove(), 1400);
}
function volar(desde, emoji, x, y) {
  const a = desde.getBoundingClientRect(), b = $('#efectos').getBoundingClientRect();
  const s = document.createElement('span');
  s.textContent = emoji;
  s.style.cssText = `position:absolute;left:${a.left - b.left + a.width / 2}px;top:${a.top - b.top}px;font-size:40px;font-family:var(--emoji);transform:translate(-50%,-50%);transition:left .28s ease-in,top .28s cubic-bezier(.3,-.6,.6,1),transform .28s;z-index:9`;
  $('#efectos').appendChild(s);
  requestAnimationFrame(() => requestAnimationFrame(() => { s.style.left = x + 'px'; s.style.top = y + 'px'; s.style.transform = 'translate(-50%,-50%) scale(.5)'; }));
  setTimeout(() => s.remove(), 320);
}
function aviso(emoji, titulo, txt = '', clase = '') {
  const a = document.createElement('div');
  a.className = 'aviso ' + clase;
  a.innerHTML = `<span class="e">${emoji}</span><div><b>${esc(titulo)}</b>${txt ? esc(txt) : ''}</div>`;
  const cont = $('#avisos');
  cont.appendChild(a);
  while (cont.children.length > 3) cont.firstChild.remove();
  setTimeout(() => { a.classList.add('sale'); setTimeout(() => a.remove(), 320); }, 3200);
}
function confeti(emojis) {
  const c = $('#confeti');
  for (let i = 0; i < 26; i++) {
    const e = document.createElement('i');
    e.textContent = emojis[i % emojis.length];
    e.style.left = Math.random() * 100 + 'vw';
    e.style.animationDuration = (1.8 + Math.random() * 1.6) + 's';
    e.style.animationDelay = (Math.random() * 0.4) + 's';
    e.style.fontSize = (18 + Math.random() * 16) + 'px';
    c.appendChild(e);
    setTimeout(() => e.remove(), 4000);
  }
}
const pick = l => l[Math.floor(Math.random() * l.length)];
let dialogoT = null;
function decir(txt, ms = 3200) {
  const d = $('#dialogo');
  d.textContent = txt; d.hidden = false;
  d.style.animation = 'none'; void d.offsetWidth; d.style.animation = '';
  UI.ultimaFrase = Date.now();
  clearTimeout(dialogoT);
  dialogoT = setTimeout(() => { d.hidden = true; }, ms);
}
function fraseSola() {
  const n = E.nec;
  const bajas = NECESIDADES.filter(x => n[x.id] < 35).sort((a, b) => n[a.id] - n[b.id]);
  let lista;
  if (E.enfermo) lista = FRASES.enfermo;
  else if (bajas.length) lista = FRASES[bajas[0].id];
  else {
    const h = new Date().getHours();
    const q = quien();
    const r = Math.random();
    lista = (h >= 23 || h < 6) && r < 0.4 ? FRASES.noche : r < 0.35 && q ? (q === 'Diego' ? FRASES.diego : FRASES.catalina) : FRASES.feliz;
  }
  let txt = pick(lista);
  if (!bajas.length && !E.enfermo && Math.random() < 0.12) {
    const aniv = proximoAniversario();
    if (aniv.dias > 0 && aniv.dias <= 60) txt = `Faltan ${aniv.dias} días para su aniversario 💛`;
    else if (aniv.dias === 0) txt = '¡Hoy es su aniversario! 🎉💛';
  }
  decir(txt);
}
function proximoAniversario() {
  const hoy = hoyClave(); const [a, m, d] = hoy.split('-').map(Number);
  let obj = Date.UTC(a, 11, 28); const ahora = Date.UTC(a, m - 1, d);
  if (ahora > obj) obj = Date.UTC(a + 1, 11, 28);
  return { dias: Math.round((obj - ahora) / 86400000) };
}

/* ---------- regalitos que aparecen solos ---------- */
function ponerRegalito() {
  UI.regalitoT = Date.now() + (18 + Math.random() * 20) * 60000;
  const hoy = hoyClave();
  if (UI.regalitosHoy.d !== hoy) UI.regalitosHoy = { d: hoy, n: 0 };
  if (UI.regalitosHoy.n >= 4 || E.durmiendo || !$('#mini').hidden || document.querySelector('.regalito')) return;
  UI.regalitosHoy.n++;
  const r = document.createElement('button');
  r.className = 'regalito'; r.textContent = pick(['🎁', '🪙', '🧶', '🐟']);
  r.style.left = (8 + Math.random() * 70) + '%'; r.style.top = (12 + Math.random() * 35) + '%';
  r.onclick = ev => {
    ev.stopPropagation();
    const n = 5 + Math.floor(Math.random() * 16);
    ganarMonedas(n); Sonido.play('moneda'); saltarMonedas();
    const p = rectRelativo(r, $('#efectos'));
    fx(p.x + 20, p.y, '+' + n + ' 🪙', 'font-size:22px;color:#b07a10');
    r.remove(); pintarBarra(); guardar();
  };
  $('#escena').appendChild(r);
  setTimeout(() => r.remove(), 5 * 60000);
}

arrancar();
