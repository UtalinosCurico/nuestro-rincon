/* ============================================================
   INTERFAZ DEL OBSERVATORIO
   Guardado por persona, nube, pantallas y el bucle principal.
   ============================================================ */
const $ = s => document.querySelector(s);
const PERSONAS = ['Catalina', 'Diego'];
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let E = null;                 // la partida
const UI = { tab: 'sitio', filtro: 'todos', hoja: null, sucio: true, ultimoPanel: 0, ultimoGuardado: 0, ultimaPlata: 0, colaRevelar: [], informeT: null };

/* ============================================================
   QUIÉN JUEGA Y GUARDADO LOCAL
   Misma clave que la clínica y el invernadero: `rinconQuien`.
   ============================================================ */
function quien() { try { return localStorage.getItem('rinconQuien') || null; } catch (e) { return null; } }
function laOtra() { const q = quien(); return PERSONAS.find(p => p !== q) || null; }
function claveDe(p) { return JUEGO.clave + '__' + (p || 'invitado'); }

function leerLocal(p) {
  for (const k of [claveDe(p), claveDe(p) + '_copia']) {
    try {
      const bruto = localStorage.getItem(k);
      if (!bruto) continue;
      const d = JSON.parse(bruto);
      if (d && typeof d === 'object' && d.sitios) return normalizar(d);
    } catch (e) { /* corrupto: se prueba la copia */ }
  }
  return null;
}
function guardar(forzar) {
  if (!E) return;
  const ahora = Date.now();
  if (!forzar && ahora - UI.ultimoGuardado < 4000) return;
  UI.ultimoGuardado = ahora;
  E.t = ahora;
  const p = quien();
  try {
    const k = claveDe(p);
    const previo = localStorage.getItem(k);
    if (previo) localStorage.setItem(k + '_copia', previo);
    localStorage.setItem(k, JSON.stringify(E));
    localStorage.setItem('observatorioResumen__' + (p || 'invitado'), JSON.stringify({
      descubrimientos: E.stats.descubrimientos, rep: notaGeneral(), dinero: Math.round(E.dinero), capitulo: E.capitulo, t: ahora,
    }));
  } catch (e) { /* almacenamiento lleno o modo privado */ }
}
function notaGeneral() {
  let s = 0, n = 0;
  for (const x of SITIOS) { const st = E.sitios[x.id]; if (st.abierto && st.n > 0) { s += st.nota * st.n; n += st.n; } }
  return n ? s / n : E.sitios.elqui.nota;
}
/** Monedas y XP para Michi: la portada las cobra la próxima vez que se abre el Rincón de juegos. */
function regalarAMichi(monedas, xp) {
  if (!(monedas > 0 || xp > 0)) return;
  try {
    const p = JSON.parse(localStorage.getItem('rinconMichiPendiente') || 'null') || { monedas: 0, xp: 0 };
    p.monedas = (p.monedas || 0) + (monedas || 0);
    p.xp = (p.xp || 0) + (xp || 0);
    p.de = 'Observatorio';
    localStorage.setItem('rinconMichiPendiente', JSON.stringify(p));
  } catch (e) { /* nada */ }
}

/* ============================================================
   NUBE — rama `datos.observatorio`, separada por persona
   El API mezcla por clave de primer nivel: escribir aquí no toca
   fotos ni notas. Siempre se relee justo antes de postear.
   ============================================================ */
function progresoDe(x) {
  if (!x || !x.stats) return 0;
  return x.stats.noches + x.stats.descubrimientos * 2 + (x.capitulo || 0) * 60 + x.stats.visitantes / 120;
}
function paqueteRespaldo() {
  const copia = Object.assign({}, E);
  delete copia.registro; delete copia.resenas; delete copia.noche; delete copia.ultimoReporte;
  // el catálogo viaja resumido: bautizados, raros y los más nuevos
  copia.descubrimientos = E.descubrimientos.filter((d, i) => d.nombre || d.r >= 3 || i < 60).slice(0, 160);
  return { t: Date.now(), v: JUEGO.version, save: copia };
}
const Nube = {
  lista: false, remoto: null, estado: 'apagada', enVuelo: false, ultimoMarcador: 0, ultimoRespaldo: 0, firma: '',
  async leer() {
    const r = await fetch(JUEGO.api + '?claves=' + JUEGO.rama, { cache: 'no-store' });
    if (!r.ok) throw new Error('GET ' + r.status);
    const j = await r.json();
    const o = (j && j.data && j.data[JUEGO.rama] && typeof j.data[JUEGO.rama] === 'object') ? j.data[JUEGO.rama] : {};
    if (!o.marcador || typeof o.marcador !== 'object') o.marcador = {};
    if (!o.respaldo || typeof o.respaldo !== 'object') o.respaldo = {};
    if (!Array.isArray(o.cielo)) o.cielo = [];
    this.remoto = o; this.lista = true;
    return o;
  },
  async escribir(mutar) {
    if (!this.lista) return false;
    await this.leer();
    mutar(this.remoto);
    const r = await fetch(JUEGO.api, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: { [JUEGO.rama]: this.remoto } }),
    });
    if (!r.ok) throw new Error('POST ' + r.status);
    return true;
  },
  resumen() {
    const mejor = E.descubrimientos.reduce((m, d) => (!m || d.r > m.r) ? d : m, null);
    return {
      t: Date.now(), capitulo: E.capitulo, dinero: Math.round(E.dinero), visitantes: E.stats.visitantes,
      descubrimientos: E.stats.descubrimientos, tipos: Object.keys(E.tipos).length, nota: +notaGeneral().toFixed(2),
      sitios: SITIOS.filter(s => E.sitios[s.id].abierto).length, noches: E.stats.noches,
      mejor: mejor ? { t: mejor.t, r: mejor.r, s: mejor.s, n: mejor.n, nombre: nombreDe(mejor) } : null,
      generacion: (E.legado.generaciones || 0) + 1,
    };
  },
  async sincronizar(forzar) {
    const q = quien();
    if (!q) { this.estado = 'sinPersona'; return; }
    if (!this.lista || this.enVuelo || !E) return;
    const ahora = Date.now();
    const firma = [E.stats.noches, E.stats.descubrimientos, E.capitulo, Math.round(E.dinero / 1e5)].join('|');
    const tocaM = forzar || ahora - this.ultimoMarcador > JUEGO.marcadorCada;
    const tocaR = (forzar || ahora - this.ultimoRespaldo > JUEGO.respaldoCada) && firma !== this.firma;
    if (!tocaM && !tocaR) return;
    const guardado = this.remoto.respaldo[q];
    // una partida recién empezada nunca pisa un respaldo con más avance (lección del 29-jun-2026)
    const subirR = tocaR && !(progresoDe(E) < 40 && guardado && guardado.save && progresoDe(guardado.save) > progresoDe(E));
    this.enVuelo = true;
    try {
      const paquete = subirR ? paqueteRespaldo() : null;
      const res = this.resumen();
      const nuevos = cieloPendiente();
      await this.escribir(r => {
        r.marcador[q] = res;
        if (paquete) r.respaldo[q] = paquete;
        for (const x of nuevos) { const i = r.cielo.findIndex(y => y.id === x.id); if (i >= 0) r.cielo[i] = x; else r.cielo.push(x); }
        if (r.cielo.length > 150) r.cielo = r.cielo.slice(-150);
      });
      nuevos.forEach(x => { E.cieloSubido = E.cieloSubido || {}; E.cieloSubido[x.id] = x.fb || 1; });
      this.ultimoMarcador = ahora;
      if (subirR) { this.ultimoRespaldo = ahora; this.firma = firma; }
      this.estado = 'ok';
      revisarRegalos();
    } catch (e) { this.estado = 'error'; }
    finally { this.enVuelo = false; }
  },
  async arrancar() {
    const q = quien();
    if (!q) { this.estado = 'sinPersona'; return; }
    this.estado = 'leyendo';
    try { await this.leer(); } catch (e) { this.estado = 'error'; return; }
    this.estado = 'ok';
    const copia = this.remoto.respaldo[q];
    if (copia && copia.save && progresoDe(copia.save) > progresoDe(E) + 5) modalRestaurar(copia);
    else this.sincronizar(true);
    revisarRegalos();
    marcarSucio();
  },
};
/** Bautizos propios que todavía no suben a «Nuestro cielo». */
function cieloPendiente() {
  const q = quien(); if (!q) return [];
  const subidos = E.cieloSubido || {};
  return E.descubrimientos.filter(d => d.nombre && d.fb && subidos[q + '-' + d.n] !== d.fb).map(d => ({
    id: q + '-' + d.n, de: q, para: d.para || null, nombre: d.nombre, ded: d.ded || null, t: d.t, r: d.r, s: d.s, n: d.n, f: d.fb, fb: d.fb,
  }));
}
/** ¿Alguien me dedicó algo que no he visto? */
function revisarRegalos() {
  const q = quien(); if (!q || !Nube.remoto) return;
  E.regalosVistos = E.regalosVistos || {};
  const nuevos = Nube.remoto.cielo.filter(x => x.para === q && x.de !== q && !E.regalosVistos[x.id + ':' + x.f]);
  if (!nuevos.length) return;
  nuevos.forEach(x => { E.regalosVistos[x.id + ':' + x.f] = true; });
  guardar(true);
  const x = nuevos[nuevos.length - 1];
  const d = { s: x.s, t: TIPOS[x.t] ? x.t : 'variable', n: x.n || 1, r: x.r || 0, nombre: x.nombre };
  sonido('regalo'); vibrar([20, 60, 20]);
  abrirModal(`<div class="arte revela">${arteSVG(d)}</div>
    <span class="brillo-rareza" style="background:rgba(255,143,177,.18);color:var(--rosa)">💌 Para ti</span>
    <h2>${esc(x.de)} te dedicó «${esc(x.nombre)}»</h2>
    <p>${TIPOS[d.t].nombre}${x.ded ? '<br><br><i>«' + esc(x.ded) + '»</i>' : ''}</p>
    ${nuevos.length > 1 ? `<p class="mini" style="margin-top:8px">…y ${nuevos.length - 1} dedicatoria(s) más en «Nuestro cielo».</p>` : ''}
    <div class="botones"><button class="btn rosa" data-acc="irCielo">Verla en nuestro cielo</button><button class="btn sec" data-acc="cerrarModal">Gracias 💛</button></div>`);
  confeti(90);
}

/* ============================================================
   SONIDO Y VIBRACIÓN
   ============================================================ */
let audio = null;
function sonido(tipo) {
  if (!E || !E.ajustes.sonido) return;
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
    const t0 = audio.currentTime;
    const notas = {
      tap: [520], compra: [392, 587], obra: [440, 554, 659], mal: [200, 150], noche: [262, 330, 392],
      descubre: [523, 659, 784, 1047], epico: [392, 523, 659, 784, 1047, 1319], regalo: [659, 784, 988, 1319], capitulo: [392, 494, 587, 784, 988],
    }[tipo] || [440];
    notas.forEach((f, i) => {
      const o = audio.createOscillator(), g = audio.createGain();
      o.type = tipo === 'mal' ? 'triangle' : 'sine'; o.frequency.value = f;
      const ini = t0 + i * (tipo === 'epico' ? 0.11 : 0.085);
      g.gain.setValueAtTime(0, ini); g.gain.linearRampToValueAtTime(0.05, ini + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, ini + 0.35);
      o.connect(g); g.connect(audio.destination); o.start(ini); o.stop(ini + 0.4);
    });
  } catch (e) { /* sin audio */ }
}
function vibrar(p) {
  try {
    if (!navigator.vibrate) return;
    if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
    navigator.vibrate(p);
  } catch (e) {}
}

/* ============================================================
   AVISOS, INFORME, MODAL Y HOJA
   ============================================================ */
function avisar(emo, titulo, sub, tipo) {
  const cont = $('#avisos');
  const el = document.createElement('div');
  el.className = 'aviso ' + (tipo || '');
  el.innerHTML = `<span class="emo">${emo}</span><div>${titulo}${sub ? `<small>${sub}</small>` : ''}</div>`;
  cont.prepend(el);
  while (cont.children.length > 3) cont.lastChild.remove();
  setTimeout(() => { el.classList.add('sale'); setTimeout(() => el.remove(), 320); }, tipo === 'oro' ? 4200 : 3200);
}

function abrirModal(html) {
  $('#modalCaja').innerHTML = html;
  $('#modal').classList.add('on');
}
function cerrarModal() {
  $('#modal').classList.remove('on');
  setTimeout(siguienteRevelacion, 250);
}
let hojaAnterior = null;
function abrirHoja(html, clave) {
  const h = $('#hoja');
  const misma = hojaAnterior === (clave || 'x') && h.classList.contains('on');
  const scroll = h.scrollTop;
  h.innerHTML = '<div class="asa"></div><button class="cerrar" data-acc="cerrarHoja" aria-label="Cerrar">✕</button>' + html;
  h.classList.add('on'); $('#velo').classList.add('on');
  UI.hoja = clave || 'x';
  hojaAnterior = UI.hoja;
  h.scrollTop = misma ? scroll : 0;
}
function cerrarHoja() {
  $('#hoja').classList.remove('on'); $('#velo').classList.remove('on');
  UI.hoja = null; hojaAnterior = null;
  UI.confirmaDemoler = null;
}
function refrescarHoja() {
  if (!UI.hoja) return;
  const [tipo, a, b] = UI.hoja.split(':');
  if (tipo === 'slot') hojaSlot(+a, true);
  else if (tipo === 'sitios') hojaSitios(true);
  else if (tipo === 'desc') hojaDescubrimiento(+a, true);
  void b;
}

/* ============================================================
   CABECERA, CHIPS Y FRANJA DE "ESTA NOCHE"
   ============================================================ */
function pintarHud() {
  const plata = $('#valPlata');
  const txt = fmtPlata(E.dinero);
  if (plata.textContent !== txt) {
    plata.textContent = txt;
    if (E.dinero > UI.ultimaPlata + 1) {
      plata.classList.remove('sube'); void plata.offsetWidth; plata.classList.add('sube');
      if (UI.plataLista) Vida.plata(E.dinero - UI.ultimaPlata);
    }
    UI.ultimaPlata = E.dinero; UI.plataLista = true;
  }
  $('#valCiencia').textContent = fmtNum(Math.floor(E.ciencia));
  const s = SITIO[E.sitioActual];
  $('#nomSitio').textContent = s.nombre;
  $('#subSitio').textContent = s.lugar;
  const h = E.reloj.hora;
  const noche = esHoraDeNoche(Math.floor(h));
  $('#chipReloj').innerHTML = `${noche ? '🌙' : (h >= 19 || h < 7 ? '🌇' : '☀️')} <b>${fmtHora(h)}</b> · Noche ${E.reloj.dia}${UI.vel > 1 ? ' · ⏩' : ''}`;
  const ns = E.noche && E.noche.sitios[E.sitioActual];
  const luna = lunaDeHoy();
  const fase = nombreFase({ fase: faseLunar(Date.now()).fase });
  let cielo;
  if (ns) cielo = { despejado: '✨ Despejado', parcial: '⛅ Medio nublado', nublado: '☁️ Nublado' }[ns.clima] + (ns.corte ? ' · 🔌 sin luz' : '');
  else cielo = fase.emo + ' ' + fase.nombre + ' (' + Math.round(luna * 100) + '%)';
  $('#chipCielo').textContent = cielo;
  $('#chipDecision').classList.toggle('oculto', !E.decision);
}

let ultimaFranja = '';
function pintarFranja() {
  const st = E.sitios[E.sitioActual], s = SITIO[E.sitioActual];
  const ns = E.noche && E.noche.sitios[E.sitioActual];
  const items = [];
  if (!s.soloRadio) {
    if (ns && E.noche.turismoListo) {
      items.push(['Visitantes hoy', `${fmtNum(ns.visitantes)}<span class="mini"> / ${fmtNum(ns.demanda)} querían</span>`]);
      if (ns.nota) items.push(['Nota de hoy', `<span class="oro">★ ${ns.nota.toFixed(1).replace('.', ',')}</span>`]);
    } else {
      const p = pronosticoSitio(E, E.sitioActual);
      items.push(['Vendrían hoy', `~${fmtNum(p.demanda)}`]);
      items.push(['Capacidad', `${fmtNum(p.capacidad)}${p.guias < p.fisica ? ' <span class="rojo" title="faltan guías">⚑</span>' : ''}`]);
    }
    items.push(['Nota del sitio', `<span class="oro">★ ${st.nota.toFixed(2).replace('.', ',')}</span>`]);
  }
  const f = fechaHoy();
  const lluvia = lluviaActiva(f);
  const temps = temporadasActivas(f);
  if (lluvia) items.push(['Lluvia de estrellas', '🌠 ' + lluvia.nombre]);
  temps.forEach(t => items.push(['Temporada', t.emo + ' ' + t.nombre]));
  for (const ev of E.eventos) {
    const d = EVENTOS.find(x => x.id === ev.id);
    if (d && (!ev.sitio || ev.sitio === E.sitioActual)) items.push(['Evento', d.emo + ' ' + ({ viento: 'Viento', polvo: 'Polvo', corte: 'Corte de luz', cometa: 'Cometa a la vista', eclipseLunar: 'Eclipse de Luna', aurora: 'Tormenta solar' }[d.id] || d.id)]);
  }
  items.push(['Gasto diario', '−' + fmtPlata(gastoDiario(E))]);
  const html = items.map(([a, b]) => `<div class="dato"><small>${a}</small><b>${b}</b></div>`).join('');
  if (html !== ultimaFranja) { $('#franja').innerHTML = html; ultimaFranja = html; }
}

/* Botones sobre los terrenos de la escena */
let firmaSlots = '';
function pintarSlots() {
  const st = E.sitios[E.sitioActual];
  const pos = Escena.posicionesSlots(st.slots.length);
  const guia = E.capitulo === 0 && contarEdificios(E, 'dobson') === 0 && !st.slots.some(Boolean);
  const firma = E.sitioActual + '|' + Escena.w + 'x' + Escena.h + '|' + st.slotsAbiertos + '|' + st.slots.map(sl => sl ? sl.id + sl.nivel + (sl.obra ? 'o' : '') + (sl.danado ? 'd' : '') : '-').join(',') + guia;
  if (firma === firmaSlots) return;
  firmaSlots = firma;
  $('#slots').innerHTML = pos.map((p, i) => {
    const sl = st.slots[i];
    const w = Math.round(p.s * 0.95), h = Math.round(p.s * 1.0);
    const estilo = `left:${p.x}px;top:${p.y}px;width:${w}px;height:${h}px`;
    if (i >= st.slotsAbiertos) return `<button class="slot bloq" style="${estilo}" data-acc="slot" data-i="${i}" aria-label="Terreno por comprar"><span class="mas">🔒</span></button>`;
    if (!sl) return `<button class="slot ${guia && i === 0 ? 'guia' : ''}" style="${estilo}" data-acc="slot" data-i="${i}" aria-label="Terreno libre: construir"><span class="mas">＋</span></button>`;
    const def = EDIFICIOS[sl.id];
    const nivel = sl.nivel >= 2 && !def.etapas ? `<span class="insignia">${'★'.repeat(Math.min(5, sl.nivel))}</span>` : '';
    const alerta = sl.danado ? '<span class="alerta">⚠️</span>' : '';
    return `<button class="slot" style="${estilo}" data-acc="slot" data-i="${i}" aria-label="${esc(def.nombre)}${sl.nivel >= 1 ? ', nivel ' + sl.nivel : ', en obra'}">${nivel}${alerta}</button>`;
  }).join('');
}

/* ============================================================
   PANEL: PESTAÑAS
   ============================================================ */
function marcarSucio() { UI.sucio = true; }
function pintarPanel(forzar) {
  if (!forzar && !UI.sucio) return;
  const ahora = performance.now();
  if (!forzar && ahora - UI.ultimoPanel < 300) return;
  UI.sucio = false; UI.ultimoPanel = ahora;
  const panel = $('#panel');
  const y = window.scrollY;
  const f = { sitio: panelSitio, equipo: panelEquipo, ciencia: panelCiencia, cielo: panelCielo, metas: panelMetas }[UI.tab];
  panel.innerHTML = f();
  if (Math.abs(window.scrollY - y) > 2) window.scrollTo(0, y);
  // puntos de aviso en las pestañas
  const puntos = {
    ciencia: INVESTIGACION.some(i => puedeInvestigar(E, i.id).ok),
    metas: !!E.decision || E.encargos.length > 0 && UI.tab !== 'metas' && E.encargos.some(x => !x.visto),
    equipo: SITIOS.some(s => E.sitios[s.id].abierto && E.sitios[s.id].ultima && E.sitios[s.id].ultima.guias < E.sitios[s.id].ultima.fisica && E.sitios[s.id].ultima.demanda > E.sitios[s.id].ultima.guias),
  };
  document.querySelectorAll('.tab').forEach(t => {
    let p = t.querySelector('.punto');
    const on = puntos[t.dataset.tab];
    if (on && !p) { p = document.createElement('i'); p.className = 'punto'; t.appendChild(p); }
    if (!on && p) p.remove();
  });
}

function estrellasNota(n) {
  const llenas = Math.round(n * 2) / 2;
  let s = '';
  for (let i = 1; i <= 5; i++) s += i <= llenas ? '★' : (i - 0.5 === llenas ? '⯪' : '☆');
  return s;
}

function proximaMeta() {
  if (E.capitulo >= CAPITULOS.length) return null;
  const cap = CAPITULOS[E.capitulo];
  const m = cap.metas.find(x => !x.f(E));
  return m ? { cap, m } : null;
}

function panelSitio() {
  const s = SITIO[E.sitioActual], st = E.sitios[E.sitioActual];
  let h = '';
  const pm = proximaMeta();
  if (pm) {
    const hechas = pm.cap.metas.filter(x => x.f(E)).length;
    h += `<button class="tarjeta destacada" data-acc="tab" data-tab="metas" style="width:100%;text-align:left">
      <div class="fila entre"><small class="oro">📖 Capítulo ${E.capitulo + 1} · ${esc(pm.cap.titulo)}</small><small class="mini">${hechas}/${pm.cap.metas.length}</small></div>
      <div style="margin-top:4px">➜ ${esc(pm.m.txt)}</div></button>`;
  }
  if (E.decision) {
    const d = DECISIONES.find(x => x.id === E.decision.id);
    h += `<button class="tarjeta" data-acc="decision" style="width:100%;text-align:left;margin-top:10px;border-color:rgba(255,143,177,.5)">
      <div class="fila"><span style="font-size:1.6rem">${d.emo}</span><div><b>${esc(d.titulo)}</b><div class="mini">Toca para decidir</div></div></div></button>`;
  }
  // precio y negocio del sitio
  if (!s.soloRadio) {
    const ref = precioReferencia(E, E.sitioActual);
    const p = pronosticoSitio(E, E.sitioActual);
    const rel = st.precio / ref;
    const consejo = rel > 1.25 ? '<span class="rojo">Caro: viene menos gente y baja la nota</span>' : rel < 0.8 ? '<span class="verde">Barato: más gente y mejor nota, menos plata por cabeza</span>' : 'Precio justo para la zona';
    h += `<div class="titulo-sec"><h2>${esc(s.nombre)}</h2><small class="estrellas-nota">${estrellasNota(st.nota)} ${st.nota.toFixed(2).replace('.', ',')}</small></div>
      <div class="tarjeta">
        <p>${esc(s.texto)}</p>
        <div class="precio">
          <button data-acc="precio" data-d="-1" aria-label="Bajar precio">−</button>
          <div class="valor"><b>${fmtPlata(st.precio)}</b><small>entrada al tour · referencia ${fmtPlata(ref)}</small></div>
          <button data-acc="precio" data-d="1" aria-label="Subir precio">＋</button>
        </div>
        <p class="mini" style="text-align:center;margin-top:6px">${consejo}</p>
        <div style="margin-top:12px">
          <div class="fila entre mini"><span>Gente que quiere venir hoy</span><b class="num">~${fmtNum(p.demanda)}</b></div>
          <div class="fila entre mini" style="margin-top:4px"><span>Lo que pueden recibir</span><b class="num">${fmtNum(p.capacidad)}</b></div>
          <div class="barra" style="margin-top:6px"><i style="width:${Math.min(100, p.demanda ? p.capacidad / p.demanda * 100 : 0)}%"></i></div>
          <p class="mini" style="margin-top:6px">${p.guias < p.fisica ? '⚑ Faltan guías: contraten en «Equipo».' : p.capacidad < p.demanda ? 'Se queda gente afuera: construyan o mejoren telescopios y miradores.' : 'Les sobra espacio: suban la nota o el precio, o abran otro sitio.'}</p>
        </div>
      </div>`;
  } else {
    h += `<div class="titulo-sec"><h2>${esc(s.nombre)}</h2><small>solo ciencia</small></div><div class="tarjeta"><p>${esc(s.texto)}</p></div>`;
  }
  // edificios
  h += `<div class="titulo-sec"><h2>Terreno</h2><small>${st.slots.filter(Boolean).length}/${st.slotsAbiertos} usados</small></div><div class="grilla-ed">`;
  st.slots.forEach((sl, i) => {
    if (i >= st.slotsAbiertos) return;
    if (!sl) { h += `<button class="ed vacio" data-acc="slot" data-i="${i}">＋ Construir</button>`; return; }
    const def = EDIFICIOS[sl.id];
    let sub = '';
    if (sl.obra) sub = '🏗️ ' + fmtDuracion(sl.obra.fin - Date.now());
    else if (sl.danado) sub = '<span class="rojo">⚠️ Dañado</span>';
    else if (def.etapas && sl.nivel < 1) sub = 'Etapa ' + (sl.etapa || 0) + '/' + def.etapas.length;
    else sub = 'Nivel ' + sl.nivel + (sl.modo ? ' · ' + (sl.modo === 'ciencia' ? '🔬 ciencia' : '👥 público') : '');
    h += `<button class="ed ${sl.danado ? 'danado' : ''} ${sl.obra ? 'obra' : ''}" data-acc="slot" data-i="${i}"><span class="emo">${def.emo}</span><span class="col" style="gap:1px"><span class="nom">${esc(def.nombre)}</span><span class="sub">${sub}</span></span></button>`;
  });
  h += '</div>';
  if (st.slotsAbiertos < s.slots) h += `<button class="btn sec ancho" style="margin-top:10px" data-acc="terreno">🗺️ Comprar más terreno · ${fmtPlata(costoTerreno(E, E.sitioActual))}</button>`;
  // última noche
  if (st.ultima) {
    const u = st.ultima;
    h += `<div class="titulo-sec"><h2>Anoche</h2><small>noche ${u.dia}</small></div><div class="tarjeta"><div class="fila entre envuelve">
      <span>${{ despejado: '✨ Despejado', parcial: '⛅ Medio nublado', nublado: '☁️ Nublado' }[u.clima]}</span>
      <span>👥 ${fmtNum(u.visitantes)}</span><span class="oro">${u.nota ? '★ ' + u.nota.toFixed(1).replace('.', ',') : '—'}</span><span class="verde">${fmtPlata(u.ingresos)}</span>
      ${u.ciencia ? `<span class="azul">🔬 ${fmtNum(u.ciencia)}</span>` : ''}</div></div>`;
  }
  const res = E.resenas.filter(r => r.sitio === E.sitioActual).slice(0, 4);
  if (res.length) {
    h += `<div class="titulo-sec"><h2>Reseñas</h2></div><div class="tarjeta">` + res.map(r => `<div class="resena"><div class="estrellas-nota">${'★'.repeat(r.estrellas)}${'☆'.repeat(5 - r.estrellas)}</div><p>«${esc(r.texto)}»</p><small>— ${esc(r.quien)}</small></div>`).join('') + `</div>`;
  }
  return h;
}

function panelEquipo() {
  let h = '<div class="titulo-sec"><h2>Equipo</h2><small>sueldos por noche</small></div>';
  for (const s of SITIOS) {
    const st = E.sitios[s.id];
    if (!st.abierto) continue;
    const cupo = cupoPersonal(E, s.id), tot = totalPersonal(st);
    h += `<div class="tarjeta"><div class="fila entre"><h3>${esc(s.nombre)}</h3><small class="mini">${tot}/${cupo} personas</small></div>`;
    if (s.id === 'elqui') h += `<p class="mini" style="margin-top:4px">💞 Ustedes dos hacen de guías acá: ${CAPACIDAD_PAREJA} personas por noche, gratis.</p>`;
    for (const rol of Object.keys(PERSONAL)) {
      if (s.soloRadio && rol === 'guia') continue;
      const P = PERSONAL[rol];
      h += `<div class="rol"><span class="emo">${P.emo}</span><div><b>${P.nombre}</b><div class="mini">${fmtPlata(P.sueldo * (1 + (s.costoLocal - 1) * 0.5))} c/u · ${P.desc}</div></div>
        <div class="stepper"><button data-acc="despedir" data-s="${s.id}" data-r="${rol}" aria-label="Uno menos">−</button><b>${st.staff[rol]}</b><button data-acc="contratar" data-s="${s.id}" data-r="${rol}" aria-label="Contratar">＋</button></div></div>`;
    }
    const u = st.ultima;
    if (u && !s.soloRadio) h += `<p class="mini" style="margin-top:6px">Anoche: capacidad de guías ${fmtNum(u.guias)} · lugar físico ${fmtNum(u.fisica)} · querían venir ${fmtNum(u.demanda)}</p>`;
    h += `<p class="mini" style="margin-top:4px">Mantención ${fmtPlata(mantencionSitio(E, s.id))} + sueldos ${fmtPlata(sueldosSitio(E, s.id))} por noche</p></div>`;
  }
  h += `<p class="mini" style="margin:12px 4px">Contratar cuesta tres noches de sueldo. Para tener más gente en un sitio, construyan una residencia.</p>`;
  return h;
}

function panelCiencia() {
  let h = `<div class="titulo-sec"><h2>Ciencia</h2><small>🔬 ${fmtNum(Math.floor(E.ciencia))} disponibles</small></div>`;
  const val = valorPublicacion(E);
  h += `<div class="tarjeta"><div class="fila entre"><div><b>📰 Publicar un paper</b><div class="mini">Cada 🔬 publicado paga ${fmtPlata(val)}. Lo que no se publica, sirve para investigar.</div></div></div>
    <div class="fila" style="margin-top:10px;gap:8px">
      <button class="btn sec chico" data-acc="publicar" data-c="0.25" ${E.ciencia < 10 ? 'disabled' : ''}>25%</button>
      <button class="btn sec chico" data-acc="publicar" data-c="0.5" ${E.ciencia < 10 ? 'disabled' : ''}>Mitad</button>
      <button class="btn chico" data-acc="publicar" data-c="1" ${E.ciencia < 10 ? 'disabled' : ''}>Todo · ${fmtPlata(val * Math.floor(E.ciencia))}</button>
    </div></div>`;
  const ramas = { turismo: '🧭 Turismo', ciencia: '🔭 Instrumentos', operacion: '⚙️ Operación' };
  for (const r of Object.keys(ramas)) {
    h += `<div class="rama"><h3>${ramas[r]}</h3>`;
    INVESTIGACION.filter(i => i.rama === r).forEach(i => {
      const lista = !!E.inv[i.id];
      const p = puedeInvestigar(E, i.id);
      const bloq = !lista && (i.requiere || []).some(x => !E.inv[x]);
      h += `<div class="inv ${lista ? 'lista' : ''} ${bloq ? 'bloq' : ''}"><span class="emo">${i.emo}</span><div class="cuerpo"><div class="nom">${esc(i.nombre)}</div><div class="desc">${esc(i.desc)}</div>
        ${bloq ? `<div class="mini" style="margin-top:4px">Requiere: ${i.requiere.map(x => INV[x].nombre).join(', ')}</div>` : ''}</div>
        ${lista ? '' : `<button class="btn chico ${p.ok ? '' : 'off'}" data-acc="investigar" data-id="${i.id}">🔬 ${fmtNum(i.costo)}</button>`}</div>`;
    });
    h += '</div>';
  }
  return h;
}

const ORDEN_TIPOS = Object.keys(TIPOS);
function panelCielo() {
  const total = ORDEN_TIPOS.length, tengo = Object.keys(E.tipos).length;
  let h = `<div class="titulo-sec"><h2>Nuestro cielo</h2><small>${quien() ? 'dedicatorias de los dos' : ''}</small></div>
    <div class="tarjeta">${mapaCielo()}<p class="mini" style="text-align:center;margin-top:6px">El cielo austral, con el polo sur al centro y la Cruz del Sur muy cerca. Las luces rosadas las bautizó Catalina y las doradas Diego; la línea punteada es su propia constelación, en el orden en que las fueron nombrando. Toca una para leer su dedicatoria.</p></div>`;
  h += `<div class="titulo-sec"><h2>Álbum</h2><small>${tengo}/${total} tipos</small></div><div class="tarjeta"><div class="album">`;
  for (const id of ORDEN_TIPOS) {
    const n = E.tipos[id] || 0;
    const d = { s: 777 + id.length * 13 + id.charCodeAt(0), t: id, n: 1, r: RAREZA_IDX[TIPOS[id].rareza] };
    h += `<div class="album-it ${n ? '' : 'falta'}">${arteSVG(d)}<span>${n ? esc(TIPOS[id].nombre) + ' ×' + n : '???'}</span></div>`;
  }
  h += `</div></div>`;
  const filtros = [['todos', 'Todos'], ['nombrados', '💌 Bautizados'], ...RAREZAS.map((r, i) => [String(i), r.nombre])];
  h += `<div class="titulo-sec"><h2>Catálogo</h2><small>${fmtNum(E.stats.descubrimientos)} descubrimientos</small></div>
    <div class="filtros">${filtros.map(([k, n]) => `<button class="${UI.filtro === k ? 'activo' : ''}" data-acc="filtro" data-f="${k}">${n}</button>`).join('')}</div>`;
  let lista = E.descubrimientos;
  if (UI.filtro === 'nombrados') lista = lista.filter(d => d.nombre);
  else if (UI.filtro !== 'todos') lista = lista.filter(d => d.r === +UI.filtro);
  lista = lista.slice(0, 40);
  if (!lista.length) h += `<p class="mini" style="text-align:center;padding:24px">${E.stats.descubrimientos ? 'Nada con ese filtro.' : 'Pongan una cúpula en modo 🔬 ciencia y esperen la noche.'}</p>`;
  else h += `<div class="desc-lista">` + lista.map(d => {
    const r = RAREZAS[d.r];
    return `<button class="desc-card" data-acc="desc" data-n="${d.n}">${arteSVG(d)}<div class="info"><div class="nom">${d.nombre ? '💌 ' : ''}${esc(nombreDe(d))}</div><div class="tipo">${TIPOS[d.t].nombre}</div><span class="rareza" style="color:${r.color}">${r.nombre}</span></div></button>`;
  }).join('') + `</div>`;
  return h;
}

/** Mapa circular del cielo austral (polo sur al centro) con las dedicatorias de los dos. */
function mapaCielo() {
  const R = 46;
  const proy = (raH, dec) => {
    const r = (dec + 90) / 100 * R; // -90 al centro, +10 en el borde
    const a = raH / 24 * Math.PI * 2;
    return [50 + Math.sin(a) * r, 50 - Math.cos(a) * r];
  };
  let s = `<svg class="mapa-cielo" viewBox="0 0 100 100" role="img" aria-label="Mapa del cielo austral"><defs><radialGradient id="mcf"><stop offset="0" stop-color="#1b2563"/><stop offset="1" stop-color="#070b1d"/></radialGradient></defs>
    <circle cx="50" cy="50" r="${R + 2}" fill="url(#mcf)" stroke="rgba(150,170,255,.25)" stroke-width=".4"/>`;
  for (const k of [30, 60]) s += `<circle cx="50" cy="50" r="${(k / 100) * R}" fill="none" stroke="rgba(150,170,255,.08)" stroke-width=".3"/>`;
  for (const fig of FIGURAS) {
    for (const [a, b] of fig.lineas) {
      const A = ESTRELLAS[a], B = ESTRELLAS[b];
      if (A[2] > 10 || B[2] > 10) continue;
      const [x1, y1] = proy(A[1], A[2]), [x2, y2] = proy(B[1], B[2]);
      s += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="rgba(160,190,255,.25)" stroke-width=".3"/>`;
    }
  }
  for (const e of ESTRELLAS) {
    if (e[2] > 10) continue;
    const [x, y] = proy(e[1], e[2]);
    s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${Math.max(0.25, 1 - e[3] * 0.25).toFixed(2)}" fill="#e8eeff" opacity=".85"/>`;
  }
  // las dedicatorias: mías (locales) + las de la nube
  const todas = [];
  const vistas = {};
  const q = quien();
  for (const x of (Nube.remoto && Nube.remoto.cielo) || []) { todas.push(x); vistas[x.id] = true; }
  for (const d of E.descubrimientos) if (d.nombre && d.fb) {
    const id = (q || 'yo') + '-' + d.n;
    if (!vistas[id]) todas.push({ id, de: q || 'yo', para: d.para, nombre: d.nombre, ded: d.ded, t: d.t, r: d.r, s: d.s, n: d.n, f: d.fb });
  }
  todas.sort((a, b) => (a.f || 0) - (b.f || 0));
  const puntos = todas.map(x => { const p = posicionDe({ s: x.s }); return { x, xy: proy(p.ra, p.dec) }; });
  if (puntos.length > 1) s += `<polyline points="${puntos.map(p => p.xy.map(v => v.toFixed(1)).join(',')).join(' ')}" fill="none" stroke="rgba(255,143,177,.35)" stroke-width=".35" stroke-dasharray="1 .8"/>`;
  puntos.forEach(p => {
    const [x, y] = p.xy;
    const col = p.x.de === 'Catalina' ? '#ff8fb1' : '#ffcf7a';
    s += `<g class="ded" data-acc="ded" data-id="${esc(p.x.id)}"><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.2" fill="${col}" opacity=".18"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.1" fill="${col}"/>
      <text x="${(x + 1.8).toFixed(1)}" y="${(y - 1.6).toFixed(1)}" font-size="2.4" fill="${col}" font-family="Playfair Display, serif">${esc(p.x.nombre).slice(0, 18)}</text></g>`;
  });
  s += `<text x="50" y="98.5" text-anchor="middle" font-size="2.4" fill="rgba(200,210,255,.5)">${todas.length ? todas.length + ' dedicatoria(s)' : 'Todavía no bautizan nada'}</text></svg>`;
  return s;
}

function panelMetas() {
  let h = '';
  E.encargos.forEach(x => { x.visto = true; });
  if (E.capitulo < CAPITULOS.length) {
    const cap = CAPITULOS[E.capitulo];
    h += `<div class="titulo-sec"><h2>Capítulo ${E.capitulo + 1}: ${esc(cap.titulo)}</h2></div><div class="tarjeta destacada"><p>${esc(cap.texto)}</p><div style="margin-top:8px">` +
      cap.metas.map(m => { const ok = m.f(E); return `<div class="meta ${ok ? 'hecha' : ''}"><span class="ok">✓</span><span>${esc(m.txt)}</span></div>`; }).join('') +
      `</div><p class="mini" style="margin-top:8px">Premio: ${[cap.premio.dinero ? fmtPlata(cap.premio.dinero) : '', cap.premio.ciencia ? cap.premio.ciencia + ' 🔬' : '', cap.premio.monedas ? cap.premio.monedas + ' 🪙 para Michi' : ''].filter(Boolean).join(' · ')}</p></div>`;
  } else {
    h += `<div class="titulo-sec"><h2>Legado</h2><small>✦ ${E.legado.puntos} polvo de estrellas</small></div><div class="tarjeta destacada">
      <p>Terminaron la historia: el Gigante ya mira el cielo. Pueden empezar una <b>nueva generación</b>: vuelven a Elqui con lo puesto, pero el catálogo, los bautizos y el polvo de estrellas se quedan para siempre.</p>
      <button class="btn ancho" style="margin-top:10px" data-acc="nuevaGen">♾️ Nueva generación (+${puntosLegado(E)} ✦)</button></div>`;
  }
  if (E.legado.puntos > 0 || E.legado.generaciones > 0) {
    h += `<div class="titulo-sec"><h2>Mejoras del legado</h2><small>✦ ${E.legado.puntos}</small></div><div class="tarjeta">` + LEGADO.map(l => {
      const n = (E.legado.mejoras[l.id] || 0), costo = l.costo * (n + 1);
      return `<div class="rol"><span class="emo">${l.emo}</span><div><b>${l.nombre}</b> <span class="mini">${n}/${l.max}</span><div class="mini">${l.desc}</div></div>
        ${n >= l.max ? '<span class="verde">✓</span>' : `<button class="btn chico ${E.legado.puntos >= costo ? '' : 'off'}" data-acc="legado" data-id="${l.id}">✦ ${costo}</button>`}</div>`;
    }).join('') + '</div>';
  }
  h += `<div class="titulo-sec"><h2>Encargos</h2><small>${E.encargos.length}/3</small></div>`;
  if (!E.encargos.length) h += `<p class="mini" style="padding:0 4px">Llegan solos, cada par de noches.</p>`;
  E.encargos.forEach(x => {
    const def = ENCARGOS.find(d => d.id === x.id);
    const meta = x.tipo === 'nota' ? 3 : x.meta;
    const txt = def.texto.replace('{meta}', x.tipo === 'nota' ? '' : fmtNum(x.meta)).replace('{sitio}', x.sitio ? SITIO[x.sitio].nombre : 'cualquier sitio').replace('{noches}', '3');
    const pct = Math.min(100, (x.prog / meta) * 100);
    const quedan = x.hasta - E.reloj.dia;
    h += `<div class="tarjeta"><div class="fila entre"><b>${def.emo} ${esc(def.titulo)}</b><small class="${quedan <= 1 ? 'rojo' : 'mini'}">${quedan <= 0 ? 'última noche' : quedan + ' noche(s)'}</small></div>
      <p style="margin-top:4px">${esc(txt)}</p><div class="barra" style="margin-top:8px"><i style="width:${pct}%"></i></div>
      <div class="fila entre mini" style="margin-top:4px"><span>${x.tipo === 'nota' ? x.prog + '/3 noches' : fmtNum(x.prog) + ' / ' + fmtNum(meta)}</span><span class="verde">${fmtPlata(x.premio)}${x.premioCiencia ? ' + ' + x.premioCiencia + ' 🔬' : ''}</span></div></div>`;
  });
  // marcador con la otra persona
  const otra = laOtra();
  const m = Nube.remoto && otra && Nube.remoto.marcador[otra];
  if (quien()) {
    const yo = Nube.lista ? Nube.resumen() : null;
    h += `<div class="titulo-sec"><h2>Los dos</h2><small>${Nube.estado === 'ok' ? '☁️ al día' : Nube.estado === 'error' ? '⚠️ sin conexión' : '…'}</small></div><div class="tarjeta">
      <table class="tabla"><tr><td></td><td style="text-align:right"><b>${esc(quien())}</b></td><td style="text-align:right"><b>${esc(otra || '')}</b></td></tr>
      ${[['Capítulo', x => x ? (x.capitulo + 1) : '—'], ['Visitantes', x => x ? fmtNum(x.visitantes) : '—'], ['Descubrimientos', x => x ? fmtNum(x.descubrimientos) : '—'],
         ['Tipos del álbum', x => x ? x.tipos + '/' + ORDEN_TIPOS.length : '—'], ['Nota', x => x ? '★ ' + String(x.nota).replace('.', ',') : '—'], ['Sitios', x => x ? x.sitios + '/5' : '—']]
        .map(([n, f]) => `<tr><td>${n}</td><td style="text-align:right">${f(yo)}</td><td style="text-align:right">${f(m)}</td></tr>`).join('')}
      </table>${m && m.mejor ? `<p class="mini" style="margin-top:8px">Lo más raro de ${esc(otra)}: <b>${esc(m.mejor.nombre)}</b> (${RAREZAS[m.mejor.r].nombre.toLowerCase()})</p>` : ''}</div>`;
  }
  h += `<div class="titulo-sec"><h2>Logros</h2><small>${Object.keys(E.logros).length}/${LOGROS.length}</small></div><div class="logros">` +
    LOGROS.map(l => `<div class="logro ${E.logros[l.id] ? 'ok' : ''}"><span class="emo">${l.emo}</span><b>${esc(l.nombre)}</b><div>${esc(l.txt)}</div></div>`).join('') + '</div>';
  const st = E.stats;
  h += `<div class="titulo-sec"><h2>Bitácora</h2></div><div class="tarjeta"><table class="tabla">
    <tr><td>Noches abiertas</td><td>${fmtNum(st.noches)}</td></tr><tr><td>Visitantes</td><td>${fmtNum(st.visitantes)}</td></tr>
    <tr><td>Ingresos totales</td><td>${fmtPlata(st.ingresos)}</td></tr><tr><td>Mejor noche</td><td>${fmtPlata(E.records.mejorNoche)}</td></tr>
    <tr><td>Ciencia producida</td><td>${fmtNum(st.cienciaTot)} 🔬</td></tr><tr><td>Papers publicados</td><td>${fmtNum(st.publicaciones || 0)}</td></tr>
    <tr><td>Encargos cumplidos</td><td>${fmtNum(st.encargos)}</td></tr>${E.mascota ? `<tr><td>Mascota</td><td>🐕 ${esc(E.mascota)}</td></tr>` : ''}
    </table><div class="registro" style="margin-top:10px">${E.registro.slice(0, 25).map(r => `<div class="${r.tipo}">N${r.dia} · ${r.txt}</div>`).join('')}</div></div>`;
  h += `<div class="titulo-sec"><h2>Ajustes</h2></div><div class="tarjeta">
    <div class="rol"><span class="emo">🔊</span><div><b>Sonido</b></div><button class="btn chico sec" data-acc="ajuste" data-k="sonido">${E.ajustes.sonido ? 'Encendido' : 'Apagado'}</button></div>
    <div class="rol"><span class="emo">🔋</span><div><b>Ahorro de batería</b><div class="mini">Menos estrellas y menos cuadros por segundo.</div></div><button class="btn chico sec" data-acc="ajuste" data-k="ahorro">${E.ajustes.ahorro ? 'Activado' : 'Apagado'}</button></div>
    <div class="rol"><span class="emo">👤</span><div><b>Quién juega aquí</b><div class="mini">${quien() ? esc(quien()) : 'Nadie elegido: no se respalda en la nube'}</div></div><button class="btn chico sec" data-acc="cambiarQuien">Cambiar</button></div>
    <div class="rol"><span class="emo">☁️</span><div><b>Respaldo en la nube</b><div class="mini">Se guarda solo cada pocos minutos.</div></div><button class="btn chico sec" data-acc="respaldar">Ahora</button></div>
    <button class="btn peligro ancho" style="margin-top:12px" data-acc="reiniciar">Empezar de cero</button></div>`;
  return h;
}

/* ============================================================
   HOJAS: terreno, sitios, descubrimiento, decisión
   ============================================================ */
function hojaSlot(i, refresco) {
  const st = E.sitios[E.sitioActual], s = SITIO[E.sitioActual];
  const sl = st.slots[i];
  UI.hoja = 'slot:' + i;
  if (i >= st.slotsAbiertos) {
    const c = costoTerreno(E, E.sitioActual);
    const html = `<div class="hoja-cab"><span class="emo">🗺️</span><div><h2>Terreno por comprar</h2><p class="mini">${esc(s.nombre)}</p></div></div>
      <p class="suave" style="margin-top:10px">Más terreno es más espacio para telescopios y servicios. Cada lote cuesta más que el anterior.</p>
      <div class="acciones"><button class="btn ancho ${E.dinero >= c ? '' : 'off'}" data-acc="terreno">Comprar · ${fmtPlata(c)}</button></div>`;
    return abrirHoja(html, UI.hoja);
  }
  if (!sl) {
    const ids = Object.keys(EDIFICIOS).filter(id => !EDIFICIOS[id].soloEn || EDIFICIOS[id].soloEn.includes(E.sitioActual));
    const grupos = { telescopio: '🔭 Telescopios', turismo: '🧭 Turismo', infra: '⚙️ Infraestructura' };
    let html = `<div class="hoja-cab"><span class="emo">🏗️</span><div><h2>¿Qué construimos?</h2><p class="mini">${esc(s.nombre)} · terreno ${i + 1}</p></div></div>`;
    for (const g of Object.keys(grupos)) {
      const lista = ids.filter(id => EDIFICIOS[id].cat === g);
      if (!lista.length) continue;
      html += `<h3 style="font-size:.86rem;color:var(--suave);margin:14px 2px 8px;font-family:Jost,sans-serif;text-transform:uppercase;letter-spacing:1px">${grupos[g]}</h3>`;
      lista.forEach(id => {
        const def = EDIFICIOS[id];
        const motivo = motivoNoConstruir(E, E.sitioActual, id);
        const costo = def.etapas ? Math.round(def.etapas[0].costo * factorRemoto(E, E.sitioActual)) : costoConstruir(E, E.sitioActual, id);
        const caro = E.dinero < costo;
        const detalles = [];
        if (def.publico) detalles.push('👥 ' + def.publico + (def.vip ? ' VIP' : ''));
        if (def.ciencia && !def.solar) detalles.push('🔬 ' + def.ciencia + '/h');
        if (def.venta) detalles.push('💵 ' + fmtPlata(def.venta) + '/h');
        if (def.gasto) detalles.push('+' + fmtPlata(def.gasto) + '/persona');
        if (def.camas) detalles.push('🛏️ ' + def.camas);
        if (def.publicoNublado) detalles.push('☁️ salva noches nubladas');
        if (def.tiempo) detalles.push('⏱️ ' + fmtDuracion(tiempoObra(E, E.sitioActual, id, 1)));
        html += `<button class="opcion-ed ${motivo ? 'no' : ''} ${caro && !motivo ? 'caro' : ''}" data-acc="${motivo ? 'nada' : 'construir'}" data-i="${i}" data-id="${id}">
          <span class="emo">${def.emo}</span><span class="cuerpo"><b>${esc(def.nombre)}</b><div class="mini">${esc(motivo || def.desc)}</div>${motivo ? '' : `<div class="mini" style="margin-top:3px">${detalles.join(' · ')}</div>`}</span>
          <span class="precio-ed">${motivo ? '🔒' : fmtPlata(costo)}</span></button>`;
      });
    }
    return abrirHoja(html, UI.hoja);
  }
  const def = EDIFICIOS[sl.id];
  let html = `<div class="hoja-cab"><span class="emo">${def.emo}</span><div><h2>${esc(def.nombre)}</h2><p class="mini">${esc(s.nombre)}${sl.nivel >= 1 && !def.etapas ? ' · nivel ' + sl.nivel + '/' + JUEGO.nivelesMax : ''}</p></div></div>
    <p class="suave" style="margin-top:10px">${esc(def.desc)}</p>`;
  const filas = [];
  const r = sl.nivel >= 1 ? NIVEL_RINDE[sl.nivel - 1] : 1;
  if (def.publico) filas.push(['Personas por noche', fmtNum(def.publico * r) + (def.vip ? ' (VIP, pagan el triple)' : '')]);
  if (def.publicoNublado) filas.push(['Si se nubla', fmtNum(def.publicoNublado * r) + ' personas']);
  if (def.publicoDia) filas.push(['Visitas de día', fmtNum(def.publicoDia * r)]);
  if (def.ciencia) filas.push(['Ciencia', fmtNum(def.ciencia * r) + ' 🔬 por hora' + (def.radio ? ' (día y noche)' : def.solar ? ' (de día)' : ' (de noche)')]);
  if (def.venta) filas.push(['Venta de tiempo', fmtPlata(def.venta * r) + ' por hora']);
  if (def.camas) filas.push(['Camas', fmtNum(Math.floor(def.camas * r)) + ' · ' + fmtPlata(def.tarifa) + ' la noche']);
  if (def.gasto) filas.push(['Gasto por visitante', fmtPlata(def.gasto * (1 + 0.35 * (sl.nivel - 1)))]);
  if (def.cupo) filas.push(['Cupo de personal', '+' + Math.floor(def.cupo * r)]);
  if (def.umbral && sl.nivel >= 1) filas.push(['Próximo descubrimiento', Math.min(99, Math.round(sl.prog / umbralDeUI(def) * 100)) + '%']);
  filas.push(['Mantención', fmtPlata(def.mant * (1 + 0.5 * Math.max(0, sl.nivel - 1))) + ' por noche']);
  if (def.astroMin) filas.push(['Necesita', def.astroMin + ' astrónomo(s)' + (def.ingMin ? ' y ' + def.ingMin + ' ingeniero(s)' : '')]);
  else if (def.ingMin) filas.push(['Necesita', def.ingMin + ' ingeniero(s)']);
  html += `<table class="tabla">${filas.map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join('')}</table>`;
  if (def.publico > 0 && def.ciencia > 0 && sl.nivel >= 1) {
    html += `<label class="etq">¿Para qué se usa de noche?</label><div class="seg">
      <button class="${sl.modo === 'publico' ? 'activo' : ''}" data-acc="modo" data-i="${i}" data-m="publico">👥 Turistas</button>
      <button class="${sl.modo === 'ciencia' ? 'activo' : ''}" data-acc="modo" data-i="${i}" data-m="ciencia">🔬 Ciencia</button></div>
      <p class="mini" style="margin-top:6px">${sl.modo === 'ciencia' ? 'Descubre cosas y vende tiempo de telescopio, pero no recibe turistas.' : 'Recibe turistas. En modo ciencia descubriría objetos para el catálogo.'}</p>`;
  }
  html += '<div class="acciones">';
  if (sl.obra) {
    const c = costoAcelerar(sl);
    html += `<button class="btn sec ancho" disabled>🏗️ Faltan ${fmtDuracion(sl.obra.fin - Date.now())}</button>
      <button class="btn ancho ${E.ciencia >= c ? '' : 'off'}" data-acc="acelerar" data-i="${i}">⚡ Terminar ya · ${c} 🔬</button>`;
  } else if (sl.danado) {
    const c = costoReparar(E, E.sitioActual, sl);
    html += `<button class="btn ancho ${E.dinero >= c ? '' : 'off'}" data-acc="reparar" data-i="${i}">🛠️ Reparar · ${fmtPlata(c)}</button>`;
  } else if (def.etapas && sl.nivel < 1) {
    const k = sl.etapa || 0;
    const et = def.etapas[k];
    const c = Math.round(et.costo * factorRemoto(E, E.sitioActual));
    html += `<p class="mini" style="grid-column:1/-1">Etapa ${k + 1} de ${def.etapas.length}: <b>${esc(et.nombre)}</b> · ⏱️ ${fmtDuracion(et.tiempo * 1000)}</p>
      <button class="btn ancho ${E.dinero >= c ? '' : 'off'}" data-acc="mejorar" data-i="${i}">Empezar etapa · ${fmtPlata(c)}</button>`;
  } else if (sl.nivel < JUEGO.nivelesMax && !def.etapas) {
    const c = costoMejora(E, E.sitioActual, sl);
    html += `<button class="btn ancho ${E.dinero >= c ? '' : 'off'}" data-acc="mejorar" data-i="${i}">⬆️ Mejorar a nivel ${sl.nivel + 1} · ${fmtPlata(c)}<small>&nbsp;(×${(NIVEL_RINDE[sl.nivel] / NIVEL_RINDE[sl.nivel - 1]).toFixed(2).replace('.', ',')})</small></button>`;
  }
  if (!def.etapas && !sl.obra) html += `<button class="btn peligro ancho" data-acc="demoler" data-i="${i}">Desarmar (devuelve ${fmtPlata(def.costo * 0.3 * Math.max(1, sl.nivel))})</button>`;
  html += '</div>';
  abrirHoja(html, UI.hoja);
}
function umbralDeUI(def) {
  const k = (E.descClase && E.descClase[def.clase]) || 0;
  return def.umbral * (1 - efecto(E, 'umbral')) * (1 + 0.08 * k);
}

function hojaSitios() {
  UI.hoja = 'sitios';
  let html = `<div class="hoja-cab"><span class="emo">🧭</span><div><h2>Sitios</h2><p class="mini">De Elqui al Pacífico</p></div></div>`;
  for (const s of SITIOS) {
    const st = E.sitios[s.id];
    const p = puedeAbrirSitio(E, s.id);
    const bloqueado = !st.abierto && s.requiere && E.capitulo < s.requiere.capitulo;
    html += `<button class="opcion-ed ${bloqueado ? 'no' : ''} ${E.sitioActual === s.id ? 'activo' : ''}" data-acc="${st.abierto ? 'irSitio' : 'abrirSitio'}" data-id="${s.id}" style="${E.sitioActual === s.id ? 'border-color:var(--oro)' : ''}">
      <span class="emo">${{ valle: '🍇', volcan: '🌋', cumbre: '⛰️', altiplano: '🦙', isla: '🗿' }[s.paisaje]}</span>
      <span class="cuerpo"><b>${esc(s.nombre)}</b><div class="mini">${esc(s.lugar)} · cielo ${Math.round(s.cielo * 100)}% · turismo ×${String(s.turismo).replace('.', ',')}</div>
      <div class="mini" style="margin-top:3px">${st.abierto ? (st.ultima ? '👥 ' + fmtNum(st.ultima.visitantes) + ' anoche · ★ ' + st.nota.toFixed(1).replace('.', ',') : 'Recién abierto') : bloqueado ? '🔒 Se desbloquea en el capítulo ' + (s.requiere.capitulo + 1) : esc(s.texto)}</div></span>
      <span class="precio-ed">${st.abierto ? (E.sitioActual === s.id ? 'Aquí' : 'Ir ›') : bloqueado ? '🔒' : fmtPlata(s.apertura)}</span></button>`;
    void p;
  }
  abrirHoja(html, 'sitios');
}

function hojaDescubrimiento(n) {
  const d = E.descubrimientos.find(x => x.n === n);
  if (!d) return;
  UI.hoja = 'desc:' + n;
  const t = TIPOS[d.t], r = RAREZAS[d.r];
  const ficha = fichaDe(d);
  const html = `<div style="text-align:center"><div class="arte" style="width:200px;height:200px;margin:0 auto;border-radius:20px;overflow:hidden">${arteSVG(d)}</div>
    <span class="brillo-rareza" style="margin-top:10px;background:rgba(255,255,255,.06);color:${r.color}">${r.nombre}</span>
    <h2 style="margin-top:6px">${esc(nombreDe(d))}</h2><p class="mini">${t.nombre} · ${esc(d.c)} · ${SITIO[d.si] ? esc(SITIO[d.si].nombre) : ''} · noche ${d.d}</p></div>
    <p class="suave" style="margin-top:12px">${esc(t.desc)}</p>
    <table class="tabla">${ficha.map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join('')}${d.premio ? `<tr><td>Premio al descubrirlo</td><td>${fmtPlata(d.premio)}</td></tr>` : ''}</table>
    ${d.nombre && d.ded ? `<div class="tarjeta" style="margin-top:12px;border-color:rgba(255,143,177,.4)"><p class="rosa" style="font-style:italic">«${esc(d.ded)}»</p>${d.para ? `<p class="mini">— para ${esc(d.para)}</p>` : ''}</div>` : ''}
    <div class="acciones"><button class="btn rosa ancho" data-acc="bautizar" data-n="${d.n}">💌 ${d.nombre ? 'Cambiar nombre o dedicatoria' : 'Bautizar y dedicar'}</button></div>`;
  abrirHoja(html, UI.hoja);
}

function hojaBautizar(n) {
  const d = E.descubrimientos.find(x => x.n === n);
  if (!d) return;
  const otra = laOtra();
  UI.hoja = 'bautizar:' + n;
  const html = `<div class="hoja-cab"><span class="emo">💌</span><div><h2>Bautizar</h2><p class="mini">${TIPOS[d.t].nombre} · ${esc(d.c)}</p></div></div>
    <label class="etq" for="fNombre">Nombre</label><input class="campo" id="fNombre" maxlength="40" value="${esc(d.nombre || '')}" placeholder="Ej: La estrella de los domingos" autocomplete="off">
    <label class="etq" for="fDed">Dedicatoria (opcional)</label><textarea class="campo" id="fDed" rows="3" maxlength="160" placeholder="Algo que quieras que lea cuando la vea">${esc(d.ded || '')}</textarea>
    ${otra ? `<label class="etq">¿Para quién?</label><div class="seg"><button class="${d.para === otra ? 'activo' : ''}" data-acc="para" data-p="${otra}">Para ${esc(otra)}</button><button class="${d.para !== otra ? 'activo' : ''}" data-acc="para" data-p="">Para nosotros</button></div>` : ''}
    <p class="mini" style="margin-top:8px">${otra ? `Si es para ${esc(otra)}, le va a aparecer como regalo la próxima vez que abra el Observatorio.` : 'Elijan quién juega en este teléfono (en Metas → Ajustes) para poder dedicarlo.'}</p>
    <div class="acciones"><button class="btn rosa ancho" data-acc="guardarNombre" data-n="${d.n}">Guardar</button></div>`;
  abrirHoja(html, UI.hoja);
  UI.paraElegido = d.para || '';
}

function hojaDecision() {
  if (!E.decision) return;
  const d = DECISIONES.find(x => x.id === E.decision.id);
  const sitio = SITIO[E.decision.sitio] ? SITIO[E.decision.sitio].nombre : 'el observatorio';
  UI.hoja = 'decision';
  const texto = d.texto.replace('{sitio}', sitio).replace('{costo}', E.decision.costo);
  const html = `<div class="hoja-cab"><span class="emo">${d.emo}</span><div><h2>${esc(d.titulo)}</h2><p class="mini">Vence en ${Math.max(1, E.decision.expira - E.reloj.dia)} noche(s)</p></div></div>
    <p class="suave" style="margin-top:12px">${esc(texto)}</p>
    <div style="margin-top:14px;display:flex;flex-direction:column;gap:8px">${d.opciones.map((o, k) => `<button class="btn ${k === 0 ? '' : 'sec'} ancho" data-acc="elegir" data-k="${k}">${esc(o.txt)}</button>`).join('')}</div>`;
  abrirHoja(html, 'decision');
}

/* ============================================================
   MODALES ESPECIALES
   ============================================================ */
function revelar(d) {
  UI.colaRevelar.push(d);
  if (!$('#modal').classList.contains('on')) siguienteRevelacion();
}
function siguienteRevelacion() {
  if ($('#modal').classList.contains('on')) return;
  const d = UI.colaRevelar.shift();
  if (!d) return;
  const r = RAREZAS[d.r], t = TIPOS[d.t];
  sonido(d.r >= 3 ? 'epico' : 'descubre'); vibrar(d.r >= 3 ? [30, 50, 30, 50, 60] : 30);
  if (d.r >= 3) confeti(d.r >= 4 ? 160 : 90);
  abrirModal(`<div class="arte revela">${arteSVG(d)}</div>
    <span class="brillo-rareza" style="background:rgba(255,255,255,.08);color:${r.color};box-shadow:0 0 18px ${r.color}55">${r.nombre}</span>
    <h2>¡${esc(t.nombre)}!</h2><p>${esc(t.desc)}</p>
    <p class="mini" style="margin-top:8px">${esc(d.c)} · ${SITIO[d.si] ? esc(SITIO[d.si].nombre) : ''}${d.premio ? ' · +' + fmtPlata(d.premio) : ''}</p>
    <div class="botones"><button class="btn rosa" data-acc="bautizarDesdeModal" data-n="${d.n}">💌 Bautizar y dedicar</button><button class="btn sec" data-acc="cerrarModal">Seguir mirando</button></div>`);
}

function modalCapitulo(i, cap, primeraVez) {
  sonido('capitulo'); vibrar([30, 40, 30, 40, 80]); confeti(170);
  const p = cap.premio;
  if (primeraVez && (p.monedas || p.xp)) regalarAMichi(p.monedas, p.xp);
  const sig = CAPITULOS[i + 1];
  const html = `<div style="font-size:3rem">📖</div><span class="brillo-rareza" style="background:rgba(255,207,122,.15);color:var(--oro)">Capítulo ${i + 1} completo</span>
    <h2>${esc(cap.titulo)}</h2>
    <p>${[p.dinero ? '+' + fmtPlata(p.dinero) : '', p.ciencia ? '+' + p.ciencia + ' 🔬' : '', primeraVez && p.monedas ? '+' + p.monedas + ' 🪙 para Michi' : ''].filter(Boolean).join(' · ')}</p>
    ${sig ? `<div class="tarjeta" style="margin-top:14px;text-align:left"><small class="oro">Lo que viene · Capítulo ${i + 2}</small><h3 style="margin-top:2px">${esc(sig.titulo)}</h3><p>${esc(sig.texto)}</p></div>` :
      `<p style="margin-top:12px">Terminaron la historia del observatorio. En Metas pueden empezar una nueva generación.</p>`}
    <div class="botones"><button class="btn" data-acc="cerrarModal">¡Vamos!</button></div>`;
  UI.colaModal = UI.colaModal || [];
  if ($('#modal').classList.contains('on')) UI.colaModal.push(html); else abrirModal(html);
}

function modalAusencia(a, nuevos) {
  const horas = a.cuenta / 3600000;
  const html = `<div style="font-size:2.6rem">🌙</div><h2>Mientras no estaban</h2>
    <p>Pasaron ${a.fuera >= 3600000 ? fmtNum(a.fuera / 3600000) + ' h' : Math.round(a.fuera / 60000) + ' min'}. El equipo siguió abriendo ${fmtNum(a.noches)} noche(s)${a.fuera > a.cuenta ? ` (se cuentan como máximo ${JUEGO.offlineTopeH} h)` : ''}, a medio ritmo.</p>
    <table class="tabla" style="margin-top:12px">
      <tr><td>Resultado</td><td class="${a.neto >= 0 ? 'verde' : 'rojo'}">${a.neto >= 0 ? '+' : ''}${fmtPlata(a.neto)}</td></tr>
      <tr><td>Visitantes</td><td>${fmtNum(a.visitas)}</td></tr><tr><td>Ciencia</td><td>${fmtNum(a.ciencia)} 🔬</td></tr>
      <tr><td>Descubrimientos</td><td>${nuevos.length}</td></tr></table>
    ${nuevos.length ? `<div class="desc-lista" style="margin-top:12px;grid-template-columns:repeat(3,1fr)">${nuevos.slice(0, 6).map(d => `<div class="desc-card">${arteSVG(d)}<div class="info"><div class="tipo">${TIPOS[d.t].nombre}</div></div></div>`).join('')}</div>` : ''}
    <div class="botones"><button class="btn" data-acc="cerrarModal">¡Bien!</button></div>`;
  void horas;
  abrirModal(html);
}

function modalQuien(alCambiar) {
  abrirModal(`<div style="font-size:2.6rem">🔭</div><h2>¿Quién mira las estrellas?</h2>
    <p>Cada uno tiene su propio observatorio. Lo que bauticen para el otro le llega como regalo.</p>
    <div class="quien"><button data-acc="quien" data-p="Catalina"><span>🌷</span>Catalina</button><button data-acc="quien" data-p="Diego"><span>🌿</span>Diego</button></div>
    ${alCambiar ? '<div class="botones"><button class="btn sec" data-acc="cerrarModal">Cancelar</button></div>' : ''}`);
}

function modalRestaurar(copia) {
  const s = copia.save;
  abrirModal(`<div style="font-size:2.4rem">☁️</div><h2>Hay un observatorio más avanzado en la nube</h2>
    <p>Probablemente jugaste en otro teléfono.</p>
    <table class="tabla" style="margin-top:10px"><tr><td></td><td><b>Aquí</b></td><td><b>Nube</b></td></tr>
    <tr><td>Capítulo</td><td>${E.capitulo + 1}</td><td>${(s.capitulo || 0) + 1}</td></tr>
    <tr><td>Descubrimientos</td><td>${fmtNum(E.stats.descubrimientos)}</td><td>${fmtNum(s.stats.descubrimientos)}</td></tr>
    <tr><td>Plata</td><td>${fmtPlata(E.dinero)}</td><td>${fmtPlata(s.dinero)}</td></tr></table>
    <div class="botones"><button class="btn" data-acc="restaurar">Traer el de la nube</button><button class="btn sec" data-acc="cerrarModal">Seguir con este</button></div>`);
  UI.copiaNube = copia;
}

function mostrarInforme(r) {
  const el = $('#informe');
  const nota = r.nota ? '★ ' + r.nota.toFixed(1).replace('.', ',') : '—';
  el.innerHTML = `<div class="fila entre"><b>🌅 Amaneció · noche ${r.dia}</b><small class="mini">toca para ver</small></div>
    <div class="datos-inf"><div><small>Gente</small><b>${fmtNum(r.visitantes)}</b></div><div><small>Nota</small><b class="oro">${nota}</b></div>
    <div><small>Neto</small><b class="${r.neto >= 0 ? 'verde' : 'rojo'}">${r.neto >= 0 ? '+' : ''}${fmtPlata(r.neto)}</b></div></div>
    ${r.descubrimientos.length ? `<div class="mini" style="margin-top:6px">🔭 ${r.descubrimientos.length} descubrimiento(s)</div>` : ''}
    ${r.lluvia ? `<div class="mini">🌠 ${r.lluvia}</div>` : ''}`;
  el.classList.add('on');
  UI.reporte = r;
  clearTimeout(UI.informeT);
  UI.informeT = setTimeout(() => el.classList.remove('on'), 7000);
}
function hojaInforme() {
  const r = UI.reporte || E.ultimoReporte;
  if (!r) return;
  $('#informe').classList.remove('on');
  const filas = [['🎟️ Entradas', r.ingresos.entradas], ['☕ Cafetería y tienda', r.ingresos.extras], ['🛏️ Alojamiento', r.ingresos.alojamiento], ['🔭 Venta de tiempo', r.ingresos.tiempo], ['🎒 Visitas de día', r.ingresos.dia]].filter(x => x[1] > 0);
  let html = `<div class="hoja-cab"><span class="emo">🌅</span><div><h2>Informe de la noche ${r.dia}</h2><p class="mini">${r.temporadas.length ? r.temporadas.join(' · ') : 'Noche normal'}${r.finde ? ' · fin de semana' : ''}</p></div></div>
    <table class="tabla">${filas.map(([a, b]) => `<tr><td>${a}</td><td class="verde">+${fmtPlata(b)}</td></tr>`).join('')}
    <tr><td>👷 Sueldos y mantención</td><td class="rojo">−${fmtPlata(r.gastos)}</td></tr>
    <tr><td><b>Resultado</b></td><td class="${r.neto >= 0 ? 'verde' : 'rojo'}"><b>${r.neto >= 0 ? '+' : ''}${fmtPlata(r.neto)}</b></td></tr>
    <tr><td>🔬 Ciencia</td><td>${fmtNum(r.ciencia)}</td></tr></table>`;
  for (const s of SITIOS) {
    const ns = r.sitios[s.id];
    if (!ns) continue;
    html += `<div class="tarjeta" style="margin-top:10px"><div class="fila entre"><b>${esc(s.nombre)}</b><span>${{ despejado: '✨', parcial: '⛅', nublado: '☁️' }[ns.clima]}${ns.corte ? ' 🔌' : ''}</span></div>
      ${s.soloRadio ? '' : `<p class="mini">👥 ${fmtNum(ns.visitantes)} de ${fmtNum(ns.demanda)} que querían venir · capacidad ${fmtNum(ns.capacidad)}${ns.nota ? ' · ★ ' + ns.nota.toFixed(1).replace('.', ',') : ''}${ns.huespedes ? ' · 🛏️ ' + ns.huespedes : ''}</p>`}
      ${ns.ciencia ? `<p class="mini">🔬 ${fmtNum(ns.ciencia)}${ns.desc ? ' · 🔭 ' + ns.desc + ' descubrimiento(s)' : ''}</p>` : ''}</div>`;
  }
  if (r.resenas.length) html += `<div class="tarjeta" style="margin-top:10px">${r.resenas.slice(0, 3).map(x => `<div class="resena"><div class="estrellas-nota">${'★'.repeat(x.estrellas)}${'☆'.repeat(5 - x.estrellas)}</div><p>«${esc(x.texto)}»</p><small>— ${esc(x.quien)}</small></div>`).join('')}</div>`;
  abrirHoja(html, 'informe');
}

/* ============================================================
   CONFETI
   ============================================================ */
function confeti(n) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cv = $('#confeti'), ctx = cv.getContext('2d');
  const dpr = Math.min(2, devicePixelRatio || 1);
  cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const cols = ['#ffcf7a', '#ff8fb1', '#8fb6ff', '#7fe0a8', '#ffffff'];
  const ps = Array.from({ length: n }, () => ({ x: innerWidth / 2 + (Math.random() - .5) * 120, y: innerHeight * .4, vx: (Math.random() - .5) * 9, vy: -5 - Math.random() * 8, s: 3 + Math.random() * 5, c: cols[Math.random() * cols.length | 0], r: Math.random() * 6, v: 0 }));
  (function paso() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    let vivos = 0;
    for (const p of ps) {
      p.v++; p.vy += 0.22; p.x += p.vx; p.y += p.vy; p.r += 0.2;
      const a = 1 - p.v / 110;
      if (a <= 0 || p.y > innerHeight + 20) continue;
      vivos++;
      ctx.globalAlpha = a; ctx.fillStyle = p.c;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * .6); ctx.restore();
    }
    if (vivos) requestAnimationFrame(paso); else ctx.clearRect(0, 0, innerWidth, innerHeight);
  })();
}

/* ============================================================
   ACCIONES (delegación de eventos)
   ============================================================ */
function resultado(r, okMsg) {
  if (r && r.ok) { sonido('compra'); vibrar(15); if (okMsg) avisar('✅', okMsg); }
  else if (r && r.msg) { sonido('mal'); avisar('⚠️', r.msg, '', 'malo'); }
  marcarSucio(); pintarPanel(true); pintarSlots(); guardar();
  return r && r.ok;
}
const ACCIONES = {
  nada() {},
  tab(el) { cambiarTab(el.dataset.tab); },
  slot(el) { sonido('tap'); hojaSlot(+el.dataset.i); },
  construir(el) {
    const r = construir(E, E.sitioActual, +el.dataset.i, el.dataset.id);
    if (resultado(r)) { cerrarHoja(); avisar('🏗️', 'Obra empezada', EDIFICIOS[el.dataset.id].nombre); }
  },
  mejorar(el) { if (resultado(mejorar(E, E.sitioActual, +el.dataset.i))) hojaSlot(+el.dataset.i); },
  acelerar(el) { if (resultado(acelerar(E, E.sitioActual, +el.dataset.i))) hojaSlot(+el.dataset.i); },
  reparar(el) { if (resultado(reparar(E, E.sitioActual, +el.dataset.i), 'Reparado')) hojaSlot(+el.dataset.i); },
  demoler(el) {
    const i = +el.dataset.i;
    if (UI.confirmaDemoler !== i) { UI.confirmaDemoler = i; el.textContent = '¿Seguro? Toca de nuevo para desarmar'; return; }
    UI.confirmaDemoler = null;
    if (resultado(demoler(E, E.sitioActual, i))) cerrarHoja();
  },
  modo(el) {
    const sl = E.sitios[E.sitioActual].slots[+el.dataset.i];
    if (sl && sl.modo !== el.dataset.m) resultado(cambiarModo(E, E.sitioActual, +el.dataset.i));
    hojaSlot(+el.dataset.i);
  },
  terreno() { if (resultado(comprarTerreno(E, E.sitioActual), 'Terreno comprado')) cerrarHoja(); },
  precio(el) {
    const st = E.sitios[E.sitioActual];
    const paso = st.precio < 20000 ? 1000 : st.precio < 60000 ? 2500 : 5000;
    fijarPrecio(E, E.sitioActual, st.precio + paso * (+el.dataset.d));
    sonido('tap'); marcarSucio(); pintarPanel(true);
  },
  contratar(el) { resultado(contratar(E, el.dataset.s, el.dataset.r)); },
  despedir(el) { resultado(despedir(E, el.dataset.s, el.dataset.r)); },
  investigar(el) {
    const id = el.dataset.id;
    if (resultado(investigar(E, id))) { avisar(INV[id].emo, 'Investigación lista', INV[id].nombre, 'oro'); sonido('obra'); }
  },
  publicar(el) {
    const r = publicar(E, Math.floor(E.ciencia * (+el.dataset.c)));
    if (resultado(r)) avisar('📰', 'Paper publicado', '+' + fmtPlata(r.monto), 'oro');
  },
  filtro(el) { UI.filtro = el.dataset.f; marcarSucio(); pintarPanel(true); },
  desc(el) { sonido('tap'); hojaDescubrimiento(+el.dataset.n); },
  bautizar(el) { hojaBautizar(+el.dataset.n); },
  bautizarDesdeModal(el) { $('#modal').classList.remove('on'); hojaBautizar(+el.dataset.n); },
  para(el) {
    UI.paraElegido = el.dataset.p;
    el.parentElement.querySelectorAll('button').forEach(b => b.classList.toggle('activo', b === el));
  },
  guardarNombre(el) {
    const n = +el.dataset.n;
    const r = bautizar(E, n, $('#fNombre').value, $('#fDed').value, UI.paraElegido || null);
    if (!r.ok) { avisar('⚠️', r.msg, '', 'malo'); return; }
    sonido('regalo'); vibrar([20, 40, 20]);
    avisar('💌', '«' + esc(r.d.nombre) + '»', r.d.para ? 'Le va a llegar a ' + esc(r.d.para) : 'Quedó en su cielo', 'oro');
    guardar(true); marcarSucio(); pintarPanel(true);
    hojaDescubrimiento(n);
    Nube.sincronizar(true);
  },
  sitios() { sonido('tap'); hojaSitios(); },
  irSitio(el) { E.sitioActual = el.dataset.id; firmaSlots = ''; cerrarHoja(); marcarSucio(); pintarPanel(true); pintarSlots(); sonido('tap'); guardar(); },
  abrirSitio(el) {
    const id = el.dataset.id;
    const r = abrirSitio(E, id);
    if (resultado(r)) { E.sitioActual = id; firmaSlots = ''; cerrarHoja(); confeti(80); avisar('🧭', '¡Nuevo sitio!', SITIO[id].nombre, 'oro'); pintarSlots(); }
  },
  decision() { hojaDecision(); },
  elegir(el) {
    const r = resolverDecision(E, +el.dataset.k);
    cerrarHoja();
    if (r.ok) avisar('📝', 'Decidido', esc(r.res));
    marcarSucio(); pintarPanel(true); guardar();
  },
  ded(el) {
    const id = el.getAttribute('data-id');
    const lista = ((Nube.remoto && Nube.remoto.cielo) || []).slice();
    const q = quien();
    E.descubrimientos.forEach(d => { if (d.nombre && d.fb) lista.push({ id: (q || 'yo') + '-' + d.n, de: q || 'yo', para: d.para, nombre: d.nombre, ded: d.ded, t: d.t, r: d.r, s: d.s, n: d.n, f: d.fb }); });
    const x = lista.find(y => y.id === id);
    if (!x) return;
    const d = { s: x.s, t: TIPOS[x.t] ? x.t : 'variable', n: x.n || 1, r: x.r || 0, nombre: x.nombre };
    abrirModal(`<div class="arte">${arteSVG(d)}</div><span class="brillo-rareza" style="color:${x.de === 'Catalina' ? 'var(--rosa)' : 'var(--oro)'};background:rgba(255,255,255,.06)">de ${esc(x.de)}${x.para ? ' para ' + esc(x.para) : ''}</span>
      <h2>${esc(x.nombre)}</h2><p>${TIPOS[d.t].nombre}${x.f ? ' · ' + new Date(x.f).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}</p>
      ${x.ded ? `<p style="margin-top:12px;font-style:italic;color:var(--rosa)">«${esc(x.ded)}»</p>` : ''}
      <div class="botones"><button class="btn sec" data-acc="cerrarModal">Cerrar</button></div>`);
  },
  irCielo() { cerrarModal(); cambiarTab('cielo'); },
  legado(el) { resultado(comprarLegado(E, el.dataset.id)); },
  nuevaGen(el) {
    if (UI.confirmaGen !== true) { UI.confirmaGen = true; el.textContent = '¿Seguro? Vuelven a Elqui. Toca de nuevo'; return; }
    UI.confirmaGen = false;
    const r = nuevaGeneracion(E);
    if (!r.ok) return resultado(r);
    E = r.estado; firmaSlots = ''; partidaCambiada();
    guardar(true); confeti(200); sonido('capitulo');
    avisar('♾️', 'Nueva generación', '+' + r.puntos + ' ✦ de polvo de estrellas', 'oro');
    marcarSucio(); pintarPanel(true); pintarSlots();
  },
  ajuste(el) {
    const k = el.dataset.k;
    E.ajustes[k] = !E.ajustes[k];
    if (k === 'ahorro') Escena.ahorro = E.ajustes.ahorro;
    guardar(true); marcarSucio(); pintarPanel(true);
  },
  cambiarQuien() { modalQuien(true); },
  quien(el) { fijarQuien(el.dataset.p); },
  respaldar() { Nube.sincronizar(true).then(() => avisar('☁️', Nube.estado === 'ok' ? 'Respaldo al día' : 'No se pudo subir', '', Nube.estado === 'ok' ? '' : 'malo')); },
  restaurar() {
    const c = UI.copiaNube;
    if (!c) return;
    E = normalizar(JSON.parse(JSON.stringify(c.save)));
    E.t = Date.now();
    firmaSlots = ''; partidaCambiada();
    guardar(true); cerrarModal(); marcarSucio(); pintarPanel(true); pintarSlots();
    avisar('☁️', 'Observatorio restaurado', '', 'oro');
  },
  reiniciar(el) {
    if (UI.confirmaReinicio !== true) { UI.confirmaReinicio = true; el.textContent = '¿Seguro? Se borra todo tu observatorio. Toca de nuevo'; return; }
    UI.confirmaReinicio = false;
    E = estadoNuevo(quien());
    firmaSlots = ''; partidaCambiada();
    guardar(true); marcarSucio(); pintarPanel(true); pintarSlots();
    avisar('🧹', 'Observatorio nuevo', 'De vuelta en Elqui');
  },
  cerrarModal() {
    if (UI.colaModal && UI.colaModal.length) { abrirModal(UI.colaModal.shift()); return; }
    cerrarModal();
  },
  cerrarHoja() { cerrarHoja(); },
  informe() { hojaInforme(); },
};
document.addEventListener('click', ev => {
  const el = ev.target.closest('[data-acc]');
  if (!el || el.disabled) return;
  const f = ACCIONES[el.dataset.acc];
  if (f) { ev.preventDefault(); f(el); }
});

function cambiarTab(t) {
  UI.tab = t;
  document.querySelectorAll('.tab').forEach(b => { const on = b.dataset.tab === t; b.classList.toggle('activa', on); b.setAttribute('aria-selected', on); });
  marcarSucio(); pintarPanel(true);
  const panel = $('#panel');
  const top = panel.getBoundingClientRect().top + window.scrollY - 70;
  if (window.scrollY > top) window.scrollTo({ top, behavior: 'smooth' });
}

function fijarQuien(p) {
  const antes = quien();
  if (antes === p) { cerrarModal(); return; }
  if (E && antes) guardar(true);
  // si jugabas sin decir quién eras, ese observatorio pasa a ser tuyo
  const adopta = !antes && E && progresoDe(E) > 20 && !leerLocal(p);
  try { localStorage.setItem('rinconQuien', p); } catch (e) {}
  if (adopta) {
    E.duenio = p;
    try { localStorage.removeItem(claveDe(null)); localStorage.removeItem(claveDe(null) + '_copia'); } catch (e) {}
  } else {
    E = leerLocal(p) || estadoNuevo(p);
    E.duenio = p;
    partidaCambiada();
  }
  Nube.lista = false; Nube.remoto = null; Nube.ultimoMarcador = 0; Nube.ultimoRespaldo = 0; Nube.firma = '';
  guardar(true); firmaSlots = '';
  cerrarModal();
  avisar(p === 'Catalina' ? '🌷' : '🌿', 'Hola, ' + p, 'Este es tu observatorio');
  marcarSucio(); pintarPanel(true); pintarSlots();
  Nube.arrancar();
}

/* ============================================================
   GANCHOS DEL MOTOR
   ============================================================ */
Motor.avisar.descubrimiento = d => {
  marcarSucio();
  // los comunes no interrumpen: van al informe. Desde raro, se celebran.
  if (d.r >= 2 || E.stats.descubrimientos <= 3 || d.t === 'estrella28' || d.t === 'granCometa') revelar(d);
  else avisar('🔭', TIPOS[d.t].nombre, RAREZAS[d.r].nombre + ' · ' + nombreAuto(d));
  if (d.r >= 4) regalarAMichi(d.r >= 5 ? 25 : 10, d.r >= 5 ? 20 : 8);
};
Motor.avisar.reporte = r => { sonido('noche'); mostrarInforme(r); marcarSucio(); guardar(true); Nube.sincronizar(false); };
Motor.avisar.capitulo = (i, cap, primeraVez) => { marcarSucio(); modalCapitulo(i, cap, primeraVez); guardar(true); Nube.sincronizar(true); };
Motor.avisar.logro = l => { avisar(l.emo, 'Logro: ' + l.nombre, l.txt, 'oro'); regalarAMichi(5, 4); marcarSucio(); };
Motor.avisar.obra = (sitio, i, sl) => {
  sonido('obra'); vibrar(20); marcarSucio(); firmaSlots = '';
  const def = EDIFICIOS[sl.id];
  avisar(def.emo, sl.nivel >= 1 ? (def.etapas ? '¡Primera luz!' : 'Listo: ' + def.nombre) : 'Etapa terminada', SITIO[sitio].nombre, 'oro');
  if (UI.hoja === 'slot:' + i && sitio === E.sitioActual) hojaSlot(i);
};
Motor.avisar.decision = () => { marcarSucio(); vibrar(25); };
Motor.avisar.evento = (def, sitio) => { avisar(def.emo, def.texto, sitio ? SITIO[sitio].nombre : '', def.id === 'sismo' ? 'malo' : ''); marcarSucio(); };
Motor.avisar.encargo = () => marcarSucio();

/* ============================================================
   VELOCIDAD DEL TIEMPO Y COSAS QUE SE TOCAN EN LA ESCENA
   ============================================================ */
const VELOCIDADES = [1, 2, 4];
let deseoT = 0;
/* Al cambiar de partida (otra persona, restaurar, reiniciar, nueva generación):
   la escena parte de cero, la velocidad es la de esa partida y la diferencia
   de plata entre las dos partidas no salta como si fuera un ingreso. */
function partidaCambiada() {
  UI.plataLista = false;
  Vida.reiniciar();
  clearTimeout(deseoT); $('#chipDeseo').classList.add('oculto');
  fijarVelocidad(E.ajustes.vel || 1, true);
}
function fijarVelocidad(v, callado) {
  UI.vel = VELOCIDADES.includes(v) ? v : 1;
  if (E) E.ajustes.vel = UI.vel;
  Vida.vel = UI.vel;
  const b = $('#btnVel');
  b.textContent = '×' + UI.vel;
  b.classList.toggle('activo', UI.vel > 1);
  b.setAttribute('aria-label', 'Velocidad del tiempo: ' + (UI.vel === 1 ? 'normal' : 'por ' + UI.vel));
  if (!callado) { sonido('tap'); avisar(UI.vel === 1 ? '▶️' : '⏩', UI.vel === 1 ? 'Tiempo normal' : 'Tiempo ×' + UI.vel, UI.vel === 1 ? '' : 'Las noches, los días y las obras pasan ' + UI.vel + ' veces más rápido.'); }
  pintarHud();
}
/* Estrella fugaz: el chip dura unos segundos; si no se toca, se pierde. */
function mostrarDeseo() {
  const c = $('#chipDeseo');
  c.classList.remove('oculto');
  clearTimeout(deseoT);
  deseoT = setTimeout(() => c.classList.add('oculto'), 9000);
  sonido('regalo'); vibrar(15);
}
function cobrarDeseo() {
  clearTimeout(deseoT); $('#chipDeseo').classList.add('oculto');
  const r = pedirDeseo(E);
  if (!r.ok) return;
  sonido('descubre'); vibrar(25);
  avisar('🌠', 'Deseo pedido', 'Los turistas aplaudieron la fugaz: +' + fmtPlata(r.monto), 'oro');
  marcarSucio(); guardar(true);
}
const DATOS_BICHO = {
  zorro: ['🦊', 'Un zorro culpeo', 'Vive en todo el norte y se acerca a los campamentos por si cae algo.'],
  guanaco: ['🦙', 'Guanacos', 'Parientes silvestres de la llama: pueden pasar mucho tiempo sin tomar agua.'],
  caballo: ['🐎', 'Caballos de la isla', 'En Rapa Nui hay miles de caballos que andan sueltos.'],
  condor: ['🦅', 'Un cóndor', 'Con las alas abiertas mide más de tres metros y casi no aletea: planea.'],
  ave: ['🐦', 'Un manutara', 'El ave del Hombre Pájaro: cada primavera vuelve a anidar a los islotes.'],
  globo: ['🎈', 'Un globo aerostático', 'Desde arriba se ve todo el valle, con las parras en fila.'],
  satelite: ['🛰️', 'Un satélite', 'Se ve porque allá arriba todavía le da el Sol, aunque acá ya sea de noche.'],
  lechuza: ['🦉', 'Un tucúquere', 'El búho más grande de Chile. Caza de noche y vuela sin hacer ruido.'],
  ovni: ['🛸', '¿Un ovni?', 'Era Venus. Siempre es Venus.'],
};
function tocarEscena(ev) {
  if (!E || ev.target.closest('button')) return;
  const r = $('#lienzo').getBoundingClientRect();
  const b = Vida.tocar(ev.clientX - r.left, ev.clientY - r.top);
  const info = b && DATOS_BICHO[b.tipo];
  if (!info) return;
  const f = b.primera ? fotoDe(E, b.tipo) : { monto: 0 };
  sonido(f.monto ? 'compra' : 'tap');
  avisar(info[0], info[1] + (f.monto ? ' · foto del tour: +' + fmtPlata(f.monto) : ''), info[2], f.monto ? 'oro' : '');
  if (f.monto) { marcarSucio(); guardar(true); }
}

/* ============================================================
   BUCLE PRINCIPAL
   ============================================================ */
let ultimoFrame = performance.now();
let ultimoSeg = 0;
function bucle(ahora) {
  requestAnimationFrame(bucle);
  if (document.hidden || !E) { ultimoFrame = ahora; return; }
  const dt = Math.min(1000, ahora - ultimoFrame);
  ultimoFrame = ahora;
  const vel = UI.vel || 1;
  avanzar(E, dt * vel);
  if (vel > 1) adelantarObras(E, dt * (vel - 1));
  Escena.dibujar(E);
  if (ahora - (UI.ultimoHud || 0) > 180) { UI.ultimoHud = ahora; pintarHud(); }
  if (ahora - ultimoSeg > 1000) {
    ultimoSeg = ahora;
    pintarFranja();
    pintarSlots();
    // las cuentas regresivas de las obras se refrescan solas
    const hayObra = E.sitios[E.sitioActual].slots.some(sl => sl && sl.obra);
    if (hayObra && UI.tab === 'sitio') marcarSucio();
    if (UI.hoja && UI.hoja.startsWith('slot:')) {
      const sl = E.sitios[E.sitioActual].slots[+UI.hoja.split(':')[1]];
      if (sl && sl.obra) hojaSlot(+UI.hoja.split(':')[1]);
    }
    guardar();
    Nube.sincronizar(false);
  }
  pintarPanel(false);
}

/* Volver de otra pestaña: si pasó harto rato, se cobra la ausencia. */
let ocultoDesde = 0;
document.addEventListener('visibilitychange', () => {
  if (!E) return;
  if (document.hidden) { ocultoDesde = Date.now(); guardar(true); return; }
  if (ocultoDesde && Date.now() - ocultoDesde > 90000) {
    E.t = ocultoDesde;
    const a = calcularAusencia(E, Date.now());
    if (a) { const nuevos = aplicarAusencia(E, a); modalAusencia(a, nuevos); }
  }
  E.t = Date.now();
  ocultoDesde = 0;
  ultimoFrame = performance.now();
  marcarSucio();
});
window.addEventListener('pagehide', () => guardar(true));
window.addEventListener('resize', () => { Escena.redimensionar(); firmaSlots = ''; pintarSlots(); });

/* ============================================================
   ARRANQUE
   ============================================================ */
function arrancar() {
  const q = quien();
  E = leerLocal(q) || estadoNuevo(q);
  Escena.iniciar($('#lienzo'));
  Escena.ahorro = !!E.ajustes.ahorro;
  $('#btnVolver').onclick = () => { guardar(true); location.href = '/#juegos'; };
  $('#btnSitio').onclick = () => hojaSitios();
  $('#velo').onclick = cerrarHoja;
  $('#chipDecision').onclick = hojaDecision;
  $('#informe').onclick = hojaInforme;
  $('#modal').addEventListener('click', ev => { if (ev.target.id === 'modal') ACCIONES.cerrarModal(); });
  $('#btnFiguras').onclick = () => {
    Escena.figuras = !Escena.figuras;
    $('#btnFiguras').classList.toggle('activo', Escena.figuras);
    $('#btnFiguras').setAttribute('aria-pressed', Escena.figuras);
  };
  $('#btnVel').onclick = () => fijarVelocidad(VELOCIDADES[(VELOCIDADES.indexOf(UI.vel || 1) + 1) % VELOCIDADES.length]);
  $('#chipDeseo').onclick = cobrarDeseo;
  $('#escena').addEventListener('click', tocarEscena);
  Vida.puedeDeseo = () => !!E && puedeDeseo(E);
  Vida.alDeseo = mostrarDeseo;
  fijarVelocidad(E.ajustes.vel || 1, true);
  document.addEventListener('keydown', ev => {
    if (ev.key === 'Escape') { if ($('#modal').classList.contains('on')) ACCIONES.cerrarModal(); else cerrarHoja(); return; }
    /* 1, 2 y 3 cambian la velocidad, salvo que se esté escribiendo (bautizar una estrella) */
    const enTexto = /^(INPUT|TEXTAREA|SELECT)$/.test((ev.target && ev.target.tagName) || '');
    if (!enTexto && !ev.metaKey && !ev.ctrlKey && !ev.altKey && ['1', '2', '3'].includes(ev.key)) fijarVelocidad(VELOCIDADES[+ev.key - 1]);
  });
  document.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => cambiarTab(b.dataset.tab)));

  // ausencia: lo que pasó con la página cerrada
  const a = calcularAusencia(E, Date.now());
  const nuevos = a ? aplicarAusencia(E, a) : [];
  revisarObras(E);
  E.t = Date.now();
  pintarHud(); pintarFranja(); pintarSlots(); pintarPanel(true);
  requestAnimationFrame(bucle);
  setTimeout(() => {
    $('#carga').classList.add('fuera');
    if (!q) modalQuien(false);
    else if (a) modalAusencia(a, nuevos);
    else if (E.stats.noches === 0 && !E.vioIntro) {
      E.vioIntro = true;
      abrirModal(`<div style="font-size:2.6rem">🍇</div><h2>Un terreno en el Valle del Elqui</h2>
        <p>Heredaron un pedazo de cerro con la mejor vista del valle. Acá el cielo es tan limpio que la gente viaja de todo el mundo para mirarlo.</p>
        <p style="margin-top:10px">La idea: un <b>observatorio turístico</b>. Primero un telescopio y unas reposeras; después, quién sabe… quizás el telescopio más grande del mundo.</p>
        <p class="mini" style="margin-top:10px">El cielo que ven aquí es el de verdad: la Luna, las estrellas y las lluvias de estrellas son las de esta noche en Chile.</p>
        <div class="botones"><button class="btn" data-acc="cerrarModal">Empezar ✨</button></div>`);
      guardar(true);
    }
    Nube.arrancar();
  }, 450);
}
arrancar();
