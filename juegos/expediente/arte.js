/* ============================================================
   ARTE — los lugares, los retratos y las muestras del laboratorio.
   Todo se dibuja con SVG armado como texto: no hay imágenes ni DOM,
   así que este archivo también se carga en Node para las pruebas.

   Un lugar se arma con piezas (repisa, mesa, barril, banca…). Cada
   pieza dibuja lo suyo y además anota dónde se pueden apoyar cosas
   (`zonas`): el motor reparte ahí los objetos escondidos.
   La escena mide siempre 360 × 480.
   ============================================================ */
const AE = { W: 360, H: 480 };

function Pincel() {
  const fondo = [], frente = [], zonas = [];
  let yPiso = 330;
  const add = s => { fondo.push(s); };
  const del = s => { frente.push(s); };
  const linea = (x1, x2, y, t) => { if (x2 - x1 >= t * 0.9) zonas.push({ x1, x2, y, t }); };
  const sombra = (cx, cy, rx) => add(`<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${Math.max(3, rx * 0.16)}" fill="#000" opacity=".16"/>`);
  const P = {
    fondo, frente, zonas, add, del, linea,
    piso() { return yPiso; },

    /* ---------- bases ---------- */
    interior(pared, piso, o = {}) {
      yPiso = o.y || 330;
      add(`<rect width="360" height="${yPiso}" fill="${pared}"/>`);
      if (o.franjas) for (let x = 0; x < 360; x += 30) add(`<rect x="${x}" width="15" height="${yPiso}" fill="#000" opacity=".04"/>`);
      if (o.tablas) for (let x = 0; x < 360; x += 24) add(`<rect x="${x}" width="1.5" height="${yPiso}" fill="#000" opacity=".13"/>`);
      add(`<rect width="360" height="70" fill="#000" opacity=".07"/>`);
      add(`<rect y="${yPiso}" width="360" height="${480 - yPiso}" fill="${piso}"/>`);
      for (let x = -165; x <= 525; x += 30) add(`<path d="M${180 + (x - 180) / 2.3} ${yPiso}L${x} 480" stroke="#000" stroke-opacity=".09" stroke-width="1.4"/>`);
      add(`<rect y="${yPiso - 9}" width="360" height="10" fill="${o.zocalo || '#3a2a22'}" opacity=".55"/>`);
      add(`<rect y="${yPiso}" width="360" height="22" fill="#000" opacity=".12"/>`);
      zonas.push({ x1: 18, x2: 342, y1: yPiso + 46, y2: 468, t1: 30, t2: 42, area: true });
    },
    exterior(cielo, suelo, o = {}) {
      yPiso = o.y || 250;
      add(`<rect width="360" height="${yPiso}" fill="${cielo}"/>`);
      add(`<rect y="${yPiso - 80}" width="360" height="80" fill="#fff" opacity=".16"/>`);
      add(`<rect y="${yPiso - 34}" width="360" height="34" fill="#fff" opacity=".14"/>`);
      if (o.sol) add(`<circle cx="${o.sol[0]}" cy="${o.sol[1]}" r="20" fill="${o.sol[2] || '#fff3c4'}" opacity=".9"/><circle cx="${o.sol[0]}" cy="${o.sol[1]}" r="32" fill="${o.sol[2] || '#fff3c4'}" opacity=".25"/>`);
      if (o.nubes) for (const [x, y, s] of o.nubes) add(`<g fill="#fff" opacity=".8"><ellipse cx="${x}" cy="${y}" rx="${26 * s}" ry="${9 * s}"/><ellipse cx="${x - 14 * s}" cy="${y - 6 * s}" rx="${13 * s}" ry="${8 * s}"/><ellipse cx="${x + 10 * s}" cy="${y - 8 * s}" rx="${16 * s}" ry="${10 * s}"/></g>`);
      if (o.cerros) add(`<path d="M0 ${yPiso}L0 ${yPiso - 58}Q50 ${yPiso - 96} 96 ${yPiso - 60}T190 ${yPiso - 74}T290 ${yPiso - 50}T360 ${yPiso - 70}L360 ${yPiso}Z" fill="${o.cerros}"/><path d="M0 ${yPiso}L0 ${yPiso - 30}Q70 ${yPiso - 56} 140 ${yPiso - 28}T280 ${yPiso - 34}T360 ${yPiso - 26}L360 ${yPiso}Z" fill="#000" opacity=".12"/>`);
      add(`<rect y="${yPiso}" width="360" height="${480 - yPiso}" fill="${suelo}"/>`);
      add(`<rect y="${yPiso}" width="360" height="30" fill="#000" opacity=".1"/>`);
      for (let i = 0; i < 26; i++) { const x = (i * 97) % 360, y = yPiso + 34 + ((i * 53) % (440 - yPiso)); add(`<ellipse cx="${x}" cy="${y}" rx="${9 + (i % 4) * 4}" ry="2.2" fill="#000" opacity=".07"/>`); }
      zonas.push({ x1: 18, x2: 342, y1: yPiso + 52, y2: 468, t1: 28, t2: 42, area: true });
    },

    /* ---------- muebles ---------- */
    repisa(x, y, w, col = '#7a5236') {
      add(`<rect x="${x}" y="${y}" width="${w}" height="6" rx="1.5" fill="${col}"/><rect x="${x}" y="${y + 6}" width="${w}" height="3" fill="#000" opacity=".2"/>`);
      add(`<path d="M${x + 10} ${y + 6}v12l10-12zM${x + w - 10} ${y + 6}v12l-10-12z" fill="${col}" opacity=".85"/>`);
      linea(x + 5, x + w - 5, y, 25);
    },
    estante(x, y, w, h, n, col = '#6b4630') {
      add(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${col}"/><rect x="${x + 5}" y="${y + 5}" width="${w - 10}" height="${h - 10}" fill="#000" opacity=".28"/>`);
      const paso = (h - 8) / n;
      for (let i = 1; i <= n; i++) {
        const yy = y + 4 + paso * i;
        add(`<rect x="${x + 3}" y="${yy - 4}" width="${w - 6}" height="5" fill="${col}"/><rect x="${x + 5}" y="${yy + 1}" width="${w - 10}" height="2.5" fill="#000" opacity=".25"/>`);
        linea(x + 8, x + w - 8, yy - 4, Math.min(25, paso * 0.72));
      }
    },
    mesa(x, y, w, col = '#8a5a3a', o = {}) {
      const base = o.hasta || yPiso + 26;
      sombra(x + w / 2, base + 2, w * 0.52);
      add(`<rect x="${x + 8}" y="${y + 6}" width="7" height="${base - y - 6}" fill="${col}"/><rect x="${x + w - 15}" y="${y + 6}" width="7" height="${base - y - 6}" fill="${col}"/>`);
      add(`<rect x="${x + 8}" y="${y + 6}" width="${w - 16}" height="9" fill="#000" opacity=".22"/>`);
      add(`<rect x="${x}" y="${y}" width="${w}" height="8" rx="2" fill="${col}"/><rect x="${x}" y="${y}" width="${w}" height="3" rx="1.5" fill="#fff" opacity=".18"/>`);
      if (o.mantel) add(`<path d="M${x + 6} ${y}h${w - 12}v22l-${(w - 12) / 6} -7 -${(w - 12) / 6} 7 -${(w - 12) / 6} -7 -${(w - 12) / 6} 7 -${(w - 12) / 6} -7 -${(w - 12) / 6} 7z" fill="${o.mantel}"/>`);
      linea(x + 8, x + w - 8, y, 28);
    },
    mostrador(x, y, w, h, col = '#7b5338', o = {}) {
      sombra(x + w / 2, y + h + 2, w * 0.54);
      add(`<rect x="${x}" y="${y + 6}" width="${w}" height="${h - 6}" fill="${col}"/>`);
      for (let i = 1; i < Math.round(w / 36); i++) add(`<rect x="${x + i * (w / Math.round(w / 36))}" y="${y + 10}" width="1.5" height="${h - 12}" fill="#000" opacity=".2"/>`);
      add(`<rect x="${x - 4}" y="${y}" width="${w + 8}" height="9" rx="2" fill="${o.cubierta || '#d9c9b0'}"/><rect x="${x - 4}" y="${y + 9}" width="${w + 8}" height="4" fill="#000" opacity=".2"/>`);
      linea(x + 4, x + w - 4, y, 28);
    },
    ventana(x, y, w, h, o = {}) {
      add(`<rect x="${x - 5}" y="${y - 5}" width="${w + 10}" height="${h + 10}" rx="3" fill="${o.marco || '#f1e7d6'}"/>`);
      add(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${o.cielo || '#bfe3f5'}"/>`);
      if (o.cerro !== false) add(`<path d="M${x} ${y + h}V${y + h * 0.62}Q${x + w * 0.3} ${y + h * 0.36} ${x + w * 0.55} ${y + h * 0.6}T${x + w} ${y + h * 0.5}V${y + h}Z" fill="${o.cerro || '#9bbf8a'}"/>`);
      add(`<path d="M${x + w / 2} ${y}v${h}M${x} ${y + h / 2}h${w}" stroke="${o.marco || '#f1e7d6'}" stroke-width="4"/>`);
      add(`<rect x="${x - 9}" y="${y + h + 4}" width="${w + 18}" height="6" rx="2" fill="${o.marco || '#f1e7d6'}"/><rect x="${x - 9}" y="${y + h + 10}" width="${w + 18}" height="3" fill="#000" opacity=".15"/>`);
      if (o.cortina) del(`<path d="M${x - 8} ${y - 9}h${w * 0.3}q-4 ${h * 0.5} -${w * 0.24} ${h + 12}h-${w * 0.06}z" fill="${o.cortina}" opacity=".95"/><path d="M${x + w + 8} ${y - 9}h-${w * 0.3}q4 ${h * 0.5} ${w * 0.24} ${h + 12}h${w * 0.06}z" fill="${o.cortina}" opacity=".95"/><rect x="${x - 12}" y="${y - 13}" width="${w + 24}" height="5" rx="2" fill="#5b4334"/>`);
      linea(x - 4, x + w + 4, y + h + 4, 22);
    },
    cuadro(x, y, w, h, col = '#c9a45a', tema = '#8fb7a0') {
      add(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="${col}"/><rect x="${x + 4}" y="${y + 4}" width="${w - 8}" height="${h - 8}" fill="${tema}"/>`);
      add(`<path d="M${x + 4} ${y + h - 4}l${(w - 8) * 0.35} -${(h - 8) * 0.5} ${(w - 8) * 0.25} ${(h - 8) * 0.3} ${(w - 8) * 0.15} -${(h - 8) * 0.2} ${(w - 8) * 0.25} ${(h - 8) * 0.4}z" fill="#000" opacity=".22"/>`);
    },
    puerta(x, y, w, h, col = '#6a4a35') {
      add(`<rect x="${x - 5}" y="${y - 5}" width="${w + 10}" height="${h + 5}" fill="#000" opacity=".25"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${col}"/>`);
      add(`<rect x="${x + 7}" y="${y + 8}" width="${w - 14}" height="${h * 0.38}" fill="#000" opacity=".16"/><rect x="${x + 7}" y="${y + h * 0.52}" width="${w - 14}" height="${h * 0.4}" fill="#000" opacity=".16"/><circle cx="${x + w - 9}" cy="${y + h * 0.52}" r="3" fill="#e2c26a"/>`);
    },
    alfombra(cx, cy, rx, ry, col = '#a8504a') {
      add(`<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${col}"/><ellipse cx="${cx}" cy="${cy}" rx="${rx * 0.78}" ry="${ry * 0.74}" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width="2.5" stroke-dasharray="7 5"/>`);
    },
    barril(x, y, w, h, col = '#8a5a34') {
      sombra(x + w / 2, y + h + 1, w * 0.6);
      add(`<path d="M${x + 3} ${y + 4}Q${x - 5} ${y + h / 2} ${x + 3} ${y + h}h${w - 6}Q${x + w + 5} ${y + h / 2} ${x + w - 3} ${y + 4}z" fill="${col}"/>`);
      add(`<path d="M${x} ${y + h * 0.26}h${w}M${x - 1} ${y + h * 0.74}h${w + 2}" stroke="#3a3a3e" stroke-width="3.5"/>`);
      for (let i = 1; i < 4; i++) add(`<path d="M${x + w * i / 4} ${y + 5}v${h - 6}" stroke="#000" stroke-opacity=".16" stroke-width="1.3"/>`);
      add(`<ellipse cx="${x + w / 2}" cy="${y + 4}" rx="${w / 2 - 2}" ry="5" fill="#a9764b"/>`);
      linea(x + 2, x + w - 2, y + 3, 26);
    },
    barricaEcho(x, y, r, col = '#8a5a34') {
      add(`<circle cx="${x}" cy="${y}" r="${r}" fill="${col}"/><circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="#3a3a3e" stroke-width="3"/><circle cx="${x}" cy="${y}" r="${r * 0.72}" fill="#a9764b"/><circle cx="${x}" cy="${y}" r="${r * 0.72}" fill="none" stroke="#000" stroke-opacity=".2" stroke-width="1.2"/><circle cx="${x}" cy="${y + r * 0.2}" r="2.5" fill="#3a2a22"/>`);
    },
    caja(x, y, w, h, col = '#b98a56') {
      sombra(x + w / 2, y + h + 1, w * 0.56);
      add(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="${col}"/>`);
      for (let i = 1; i < 3; i++) add(`<rect x="${x}" y="${y + h * i / 3 - 1}" width="${w}" height="2" fill="#000" opacity=".2"/>`);
      add(`<rect x="${x + 4}" y="${y}" width="5" height="${h}" fill="#000" opacity=".14"/><rect x="${x + w - 9}" y="${y}" width="5" height="${h}" fill="#000" opacity=".14"/>`);
      linea(x + 3, x + w - 3, y, 26);
    },
    planta(x, y, s = 1, maceta = '#b5654a') {
      add(`<path d="M${x - 11 * s} ${y - 20 * s}h${22 * s}l-${4 * s} ${20 * s}h-${14 * s}z" fill="${maceta}"/>`);
      del(`<g fill="#4f8a55"><ellipse cx="${x}" cy="${y - 38 * s}" rx="${7 * s}" ry="${20 * s}"/><ellipse cx="${x - 13 * s}" cy="${y - 32 * s}" rx="${6 * s}" ry="${17 * s}" transform="rotate(-28 ${x - 13 * s} ${y - 32 * s})"/><ellipse cx="${x + 13 * s}" cy="${y - 32 * s}" rx="${6 * s}" ry="${17 * s}" transform="rotate(28 ${x + 13 * s} ${y - 32 * s})"/></g><ellipse cx="${x}" cy="${y - 40 * s}" rx="${2.5 * s}" ry="${15 * s}" fill="#6fae6f"/>`);
    },
    lampara(x, largo, col = '#e9c46a') {
      add(`<rect x="${x - 0.8}" y="0" width="1.6" height="${largo}" fill="#2c2c30"/><path d="M${x - 15} ${largo + 13}l7 -13h16l7 13z" fill="${col}"/>`);
      del(`<path d="M${x - 15} ${largo + 13}h30l42 ${yPiso - largo - 13}h-114z" fill="#fff3c4" opacity=".08"/>`);
    },
    chimenea(x, y, w, h) {
      add(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#8f6a55"/>`);
      for (let j = 0; j < Math.floor(h / 14); j++) for (let i = 0; i < Math.ceil(w / 24); i++) add(`<rect x="${x + i * 24 + (j % 2) * 12 - 12}" y="${y + j * 14}" width="22" height="12" rx="1.5" fill="#000" opacity="${(i + j) % 3 ? 0.06 : 0.13}"/>`);
      add(`<path d="M${x + w * 0.2} ${y + h}V${y + h * 0.5}Q${x + w / 2} ${y + h * 0.26} ${x + w * 0.8} ${y + h * 0.5}V${y + h}z" fill="#241a18"/>`);
      add(`<path d="M${x + w * 0.38} ${y + h - 4}q${w * 0.06} -${h * 0.3} ${w * 0.12} -${h * 0.1}q${w * 0.04} -${h * 0.26} ${w * 0.1} ${h * 0.02}q${w * 0.04} ${h * 0.08} 0 ${h * 0.1}z" fill="#f2a03b"/>`);
      add(`<rect x="${x - 8}" y="${y - 7}" width="${w + 16}" height="9" rx="2" fill="#5d4034"/>`);
      linea(x - 4, x + w + 4, y - 7, 25);
    },
    sillon(x, y, w, col = '#8c5a6b') {
      sombra(x + w / 2, y + 46, w * 0.55);
      add(`<rect x="${x + 6}" y="${y - 34}" width="${w - 12}" height="46" rx="10" fill="${col}"/><rect x="${x}" y="${y}" width="${w}" height="34" rx="9" fill="${col}"/><rect x="${x}" y="${y}" width="${w}" height="34" rx="9" fill="#000" opacity=".12"/>`);
      add(`<rect x="${x - 6}" y="${y - 10}" width="16" height="48" rx="7" fill="${col}"/><rect x="${x + w - 10}" y="${y - 10}" width="16" height="48" rx="7" fill="${col}"/>`);
      linea(x + 14, x + w - 14, y + 4, 27);
    },
    espejo(x, y, w, h) {
      add(`<rect x="${x - 6}" y="${y - 6}" width="${w + 12}" height="${h + 12}" rx="5" fill="#d8b56a"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="#cfe6ee"/><path d="M${x + w * 0.15} ${y + h}L${x + w * 0.5} ${y}h${w * 0.14}L${x + w * 0.3} ${y + h}z" fill="#fff" opacity=".5"/>`);
      for (let i = 0; i <= 4; i++) add(`<circle cx="${x + w * i / 4}" cy="${y - 6}" r="4" fill="#fff6c9"/>`);
    },
    colgador(x, y, w, n) {
      add(`<rect x="${x}" y="${y}" width="${w}" height="5" rx="2.5" fill="#5b4334"/>`);
      for (let i = 0; i < n; i++) add(`<path d="M${x + 12 + i * (w - 24) / (n - 1)} ${y + 5}v6q0 4 4 4" stroke="#3a3a3e" stroke-width="2" fill="none"/>`);
      linea(x + 6, x + w - 6, y + 42, 27);
    },
    viga(y, col = '#5b4030') { add(`<rect y="${y}" width="360" height="12" fill="${col}"/><rect y="${y + 12}" width="360" height="4" fill="#000" opacity=".2"/>`); },
    pilar(x, col = '#5b4030') { del(`<rect x="${x}" y="0" width="13" height="${yPiso + 12}" fill="${col}"/><rect x="${x + 9}" y="0" width="4" height="${yPiso + 12}" fill="#000" opacity=".2"/>`); },

    /* ---------- exterior ---------- */
    arbol(x, y, s = 1, copa = '#5d9a5f') {
      sombra(x, y + 2, 24 * s);
      add(`<rect x="${x - 6 * s}" y="${y - 70 * s}" width="${12 * s}" height="${72 * s}" rx="3" fill="#6d4a34"/>`);
      add(`<g fill="${copa}"><circle cx="${x}" cy="${y - 96 * s}" r="${34 * s}"/><circle cx="${x - 26 * s}" cy="${y - 76 * s}" r="${24 * s}"/><circle cx="${x + 26 * s}" cy="${y - 78 * s}" r="${25 * s}"/></g><circle cx="${x - 10 * s}" cy="${y - 104 * s}" r="${18 * s}" fill="#fff" opacity=".1"/>`);
    },
    arbusto(x, y, s = 1, col = '#4f8a55') {
      del(`<g fill="${col}"><circle cx="${x}" cy="${y - 13 * s}" r="${17 * s}"/><circle cx="${x - 17 * s}" cy="${y - 7 * s}" r="${12 * s}"/><circle cx="${x + 17 * s}" cy="${y - 8 * s}" r="${13 * s}"/></g><circle cx="${x - 5 * s}" cy="${y - 18 * s}" r="${7 * s}" fill="#fff" opacity=".12"/>`);
    },
    banca(x, y, w, col = '#7a5236') {
      sombra(x + w / 2, y + 30, w * 0.52);
      add(`<rect x="${x + 6}" y="${y}" width="5" height="30" fill="#3a3a3e"/><rect x="${x + w - 11}" y="${y}" width="5" height="30" fill="#3a3a3e"/>`);
      add(`<rect x="${x}" y="${y - 26}" width="${w}" height="6" rx="2" fill="${col}"/><rect x="${x}" y="${y - 15}" width="${w}" height="6" rx="2" fill="${col}"/><rect x="${x}" y="${y}" width="${w}" height="8" rx="2" fill="${col}"/>`);
      linea(x + 5, x + w - 5, y, 27);
    },
    farol(x, y, h) {
      add(`<rect x="${x - 2}" y="${y - h}" width="4" height="${h}" fill="#33363d"/><rect x="${x - 6}" y="${y - 5}" width="12" height="6" rx="2" fill="#33363d"/>`);
      add(`<path d="M${x - 9} ${y - h}h18l-4 -17h-10z" fill="#ffeeb0"/><path d="M${x - 11} ${y - h - 17}h22l-11 -9z" fill="#33363d"/>`);
    },
    cerco(x1, x2, y, col = '#e9e0cf') {
      for (let x = x1; x <= x2; x += 15) add(`<path d="M${x} ${y}v-24l4 -6 4 6v24z" fill="${col}"/>`);
      add(`<rect x="${x1}" y="${y - 18}" width="${x2 - x1 + 8}" height="3.5" fill="${col}"/><rect x="${x1}" y="${y - 8}" width="${x2 - x1 + 8}" height="3.5" fill="${col}"/>`);
    },
    kiosco(x, y, w, h) {
      sombra(x + w / 2, y + 3, w * 0.6);
      add(`<rect x="${x}" y="${y - 20}" width="${w}" height="22" fill="#e6dccb"/><rect x="${x}" y="${y - 20}" width="${w}" height="5" fill="#000" opacity=".12"/>`);
      for (let i = 0; i <= 4; i++) add(`<rect x="${x + 4 + i * (w - 12) / 4}" y="${y - h}" width="4" height="${h - 20}" fill="#f4eee2"/>`);
      add(`<path d="M${x - 12} ${y - h}h${w + 24}L${x + w / 2} ${y - h - 40}z" fill="#5f8f7f"/><path d="M${x + w / 2} ${y - h - 40}L${x + w + 12} ${y - h}h-${w / 2 + 12}z" fill="#000" opacity=".13"/><circle cx="${x + w / 2}" cy="${y - h - 44}" r="4" fill="#e2c26a"/>`);
      for (let i = 0; i <= 8; i++) add(`<rect x="${x + 4 + i * (w - 10) / 8}" y="${y - 38}" width="2" height="18" fill="#f4eee2"/>`);
      add(`<rect x="${x + 2}" y="${y - 40}" width="${w - 4}" height="3" fill="#f4eee2"/>`);
      linea(x + 4, x + w - 4, y - 20, 24);
    },
    puesto(x, y, w, h, c1 = '#d9534f', c2 = '#f6f1e6') {
      sombra(x + w / 2, y + 3, w * 0.56);
      add(`<rect x="${x + 3}" y="${y - h}" width="4" height="${h}" fill="#6d4a34"/><rect x="${x + w - 7}" y="${y - h}" width="4" height="${h}" fill="#6d4a34"/>`);
      const n = Math.round(w / 16);
      for (let i = 0; i < n; i++) add(`<path d="M${x - 6 + i * (w + 12) / n} ${y - h}h${(w + 12) / n}v16q-${(w + 12) / n / 2} 9 -${(w + 12) / n} 0z" fill="${i % 2 ? c2 : c1}"/>`);
      add(`<rect x="${x - 6}" y="${y - h - 6}" width="${w + 12}" height="7" fill="${c1}"/>`);
      add(`<rect x="${x}" y="${y - 44}" width="${w}" height="46" fill="#a9764b"/><rect x="${x}" y="${y - 44}" width="${w}" height="6" fill="#c9965f"/><rect x="${x}" y="${y - 38}" width="${w}" height="4" fill="#000" opacity=".18"/>`);
      linea(x + 4, x + w - 4, y - 44, 26);
    },
    parra(y, o = {}) {
      for (let x = 14; x < 360; x += 82) add(`<rect x="${x}" y="${y - 62}" width="5" height="64" fill="#7a5a44"/>`);
      add(`<path d="M0 ${y - 54}h360M0 ${y - 34}h360" stroke="#5a4a3e" stroke-width="1.5"/>`);
      const s = [];
      for (let i = 0; i < 30; i++) { const x = (i * 43 + (o.d || 0)) % 372 - 6, yy = y - 60 + ((i * 29) % 40); s.push(`<ellipse cx="${x}" cy="${yy}" rx="${11 + (i % 3) * 3}" ry="${7 + (i % 2) * 3}" fill="${i % 4 ? '#5f9a52' : '#7fb565'}"/>`); }
      (o.frente ? del : add)(s.join(''));
      for (let i = 0; i < 6; i++) add(`<g fill="#6b3f73"><circle cx="${30 + i * 60}" cy="${y - 24}" r="4"/><circle cx="${26 + i * 60}" cy="${y - 18}" r="4"/><circle cx="${34 + i * 60}" cy="${y - 18}" r="4"/><circle cx="${30 + i * 60}" cy="${y - 12}" r="4"/></g>`);
    },
    colmena(x, y, col = '#e6c66a') {
      sombra(x + 17, y + 2, 22);
      add(`<rect x="${x + 3}" y="${y - 6}" width="5" height="8" fill="#6d4a34"/><rect x="${x + 26}" y="${y - 6}" width="5" height="8" fill="#6d4a34"/>`);
      add(`<rect x="${x}" y="${y - 40}" width="34" height="34" fill="${col}"/><rect x="${x}" y="${y - 24}" width="34" height="2" fill="#000" opacity=".2"/><rect x="${x + 11}" y="${y - 13}" width="12" height="4" rx="2" fill="#3a2a22"/><rect x="${x - 3}" y="${y - 45}" width="40" height="7" rx="2" fill="#f1e7d6"/>`);
      linea(x - 1, x + 35, y - 45, 24);
    },
    agua(y1, y2, col = '#6fb1c9') {
      add(`<rect y="${y1}" width="360" height="${y2 - y1}" fill="${col}"/>`);
      for (let i = 0; i < 14; i++) add(`<path d="M${(i * 71) % 340} ${y1 + 8 + ((i * 37) % Math.max(10, y2 - y1 - 14))}q8 -4 16 0t16 0" stroke="#fff" stroke-opacity=".35" stroke-width="1.6" fill="none"/>`);
    },
    muelle(x, y, w, h) {
      for (let i = 0; i < 3; i++) add(`<rect x="${x + 6 + i * (w - 18) / 2}" y="${y}" width="6" height="${h + 26}" fill="#5b4030"/>`);
      add(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#a57c55"/>`);
      for (let i = 1; i < Math.round(h / 11); i++) add(`<rect x="${x}" y="${y + i * 11}" width="${w}" height="1.5" fill="#000" opacity=".2"/>`);
      zonas.push({ x1: x + 12, x2: x + w - 12, y1: y + 26, y2: y + h - 4, t1: 27, t2: 34, area: true });
    },
    bote(x, y, w, col = '#c9574d') {
      add(`<path d="M${x} ${y - 16}h${w}l-${w * 0.14} 22h-${w * 0.72}z" fill="${col}"/><path d="M${x} ${y - 16}h${w}l-3 5h-${w - 6}z" fill="#f4eee2"/><rect x="${x + w * 0.3}" y="${y - 14}" width="${w * 0.4}" height="3" fill="#000" opacity=".2"/>`);
      linea(x + 10, x + w - 10, y - 14, 25);
    },
    roca(x, y, w, col = '#8d8f97') {
      sombra(x + w / 2, y + 1, w * 0.55);
      add(`<path d="M${x} ${y}q${w * 0.06} -${w * 0.42} ${w * 0.36} -${w * 0.46}q${w * 0.34} -${w * 0.06} ${w * 0.5} ${w * 0.16}q${w * 0.16} ${w * 0.14} ${w * 0.14} ${w * 0.3}z" fill="${col}"/><path d="M${x + w * 0.2} ${y - w * 0.36}q${w * 0.2} -${w * 0.08} ${w * 0.36} ${w * 0.02}" stroke="#fff" stroke-opacity=".35" stroke-width="2.5" fill="none"/>`);
      linea(x + w * 0.22, x + w * 0.82, y - w * 0.42, 25);
    },
    tronco(x, y, w) {
      sombra(x + w / 2, y + 2, w * 0.54);
      add(`<rect x="${x}" y="${y - 20}" width="${w}" height="22" rx="10" fill="#7a5236"/><ellipse cx="${x + w - 7}" cy="${y - 9}" rx="7" ry="11" fill="#c9a06c"/><ellipse cx="${x + w - 7}" cy="${y - 9}" rx="3.5" ry="6" fill="none" stroke="#7a5236" stroke-width="1.2"/>`);
      linea(x + 6, x + w - 16, y - 20, 26);
    },
    carpa(x, y, w, col = '#e08a3c') {
      sombra(x + w / 2, y + 2, w * 0.56);
      add(`<path d="M${x} ${y}L${x + w / 2} ${y - w * 0.62}L${x + w} ${y}z" fill="${col}"/><path d="M${x + w / 2} ${y - w * 0.62}L${x + w} ${y}h-${w * 0.2}z" fill="#000" opacity=".16"/><path d="M${x + w * 0.38} ${y}L${x + w / 2} ${y - w * 0.36}L${x + w * 0.62} ${y}z" fill="#3a2a22"/>`);
    },
    fogata(x, y) {
      add(`<g fill="#8d8f97"><circle cx="${x - 15}" cy="${y}" r="5"/><circle cx="${x + 15}" cy="${y}" r="5"/><circle cx="${x - 8}" cy="${y + 5}" r="5"/><circle cx="${x + 8}" cy="${y + 5}" r="5"/></g><path d="M${x - 12} ${y + 1}l24 -6M${x - 12} ${y - 5}l24 6" stroke="#6d4a34" stroke-width="5" stroke-linecap="round"/><path d="M${x - 8} ${y - 4}q-2 -16 8 -26q-1 10 6 14q4 6 0 12z" fill="#f2a03b"/><path d="M${x - 3} ${y - 4}q-1 -8 4 -13q0 6 3 8q2 3 0 5z" fill="#ffe08a"/>`);
    },
    cascada(x, y1, y2, w) {
      add(`<path d="M${x - 30} ${y1 - 12}h${w + 60}v${y2 - y1 + 12}h-${w + 60}z" fill="#77787f"/><path d="M${x - 30} ${y1 - 12}h${w + 60}v14h-${w + 60}z" fill="#5f8a55"/>`);
      add(`<rect x="${x}" y="${y1}" width="${w}" height="${y2 - y1}" fill="#cfeaf4"/>`);
      for (let i = 0; i < 5; i++) add(`<rect x="${x + 4 + i * (w - 8) / 5}" y="${y1}" width="3" height="${y2 - y1}" fill="#fff" opacity=".6"/>`);
      add(`<ellipse cx="${x + w / 2}" cy="${y2}" rx="${w * 0.9}" ry="9" fill="#fff" opacity=".7"/>`);
    },
    rieles(y) {
      add(`<rect y="${y - 6}" width="360" height="30" fill="#8a8580"/>`);
      for (let x = 6; x < 360; x += 26) add(`<rect x="${x}" y="${y - 2}" width="12" height="22" fill="#5b4030"/>`);
      add(`<rect y="${y + 1}" width="360" height="4" fill="#3a3a3e"/><rect y="${y + 14}" width="360" height="4" fill="#3a3a3e"/>`);
    },
    letrero(x, y, w, txt, col = '#2f4a6b') {
      add(`<rect x="${x}" y="${y}" width="${w}" height="24" rx="4" fill="${col}"/><text x="${x + w / 2}" y="${y + 17}" text-anchor="middle" font-family="Fredoka, system-ui, sans-serif" font-weight="600" font-size="13" fill="#fff" letter-spacing="1">${txt}</text>`);
    },
  };
  return P;
}

/* ------------------------------------------------------------
   LOS LUGARES. `amb` dice qué tipo de cosas suele haber ahí.
   ------------------------------------------------------------ */
const ESCENAS = {
  cocina: { n: 'Cocina', amb: ['cocina', 'comida', 'casa'], pinta(P) {
    P.interior('#e9d7b9', '#b98a5e', { franjas: true });
    P.ventana(132, 60, 96, 76, { cortina: '#d9695f' });
    P.repisa(14, 110, 100); P.repisa(246, 96, 100); P.repisa(246, 168, 100);
    P.colgador(14, 180, 100, 4);
    P.mostrador(0, 262, 150, 80, '#7f9a8f'); P.mostrador(212, 262, 148, 80, '#7f9a8f');
    P.add('<rect x="150" y="252" width="62" height="92" fill="#d8d3cc"/><rect x="156" y="282" width="50" height="46" rx="3" fill="#2c2c30"/><rect x="156" y="262" width="50" height="6" rx="3" fill="#8d8f97"/>');
    P.linea(152, 210, 252, 26);
    P.alfombra(180, 420, 96, 26, '#c9695b');
    P.planta(338, 262, 0.7);
  } },
  oficina: { n: 'Oficina', amb: ['oficina', 'casa', 'juego'], pinta(P) {
    P.interior('#c9d3cf', '#8f6b4d', {});
    P.estante(14, 52, 104, 232, 4);
    P.ventana(236, 60, 100, 96, { cortina: '#5f7f9a', cielo: '#cfe3ee' });
    P.cuadro(140, 70, 72, 54, '#b98a4a', '#a9c3b8');
    P.mesa(126, 262, 216, '#6b4630');
    P.add('<rect x="132" y="270" width="204" height="62" fill="#5b3a28"/><rect x="146" y="282" width="70" height="20" rx="2" fill="#000" opacity=".2"/><rect x="250" y="282" width="70" height="20" rx="2" fill="#000" opacity=".2"/>');
    P.lampara(180, 22);
    P.alfombra(200, 424, 110, 26, '#58708a');
    P.planta(26, 338, 0.8);
  } },
  cafe: { n: 'Café', amb: ['comida', 'cocina', 'fiesta', 'musica'], pinta(P) {
    P.interior('#d9b99a', '#7c5a44', { franjas: true });
    P.letrero(116, 22, 128, 'CAFÉ', '#6a4030');
    P.repisa(16, 92, 148); P.repisa(196, 92, 148); P.repisa(16, 150, 148); P.repisa(196, 150, 148);
    P.mostrador(16, 226, 328, 106, '#6a4030', { cubierta: '#e9dcc6' });
    P.mesa(26, 388, 104, '#8a5a3a', { hasta: 452, mantel: '#f1e7d6' });
    P.mesa(230, 396, 104, '#8a5a3a', { hasta: 458, mantel: '#f1e7d6' });
    P.lampara(96, 30); P.lampara(264, 30);
    P.planta(346, 226, 0.6);
  } },
  teatro: { n: 'Camarín', amb: ['musica', 'ropa', 'fiesta'], pinta(P) {
    P.interior('#8c5a6b', '#6d4a3a', {});
    P.espejo(120, 74, 120, 90);
    P.mesa(96, 208, 168, '#5b4030');
    P.colgador(14, 96, 86, 4); P.colgador(266, 96, 82, 4);
    P.estante(272, 190, 76, 144, 3, '#5b4030');
    P.sillon(14, 286, 96, '#b5564f');
    P.alfombra(190, 424, 100, 24, '#d9a441');
    P.del('<path d="M0 0h46q-12 110 -40 190h-6z" fill="#7a2f3a" opacity=".96"/><path d="M360 0h-46q12 110 40 190h6z" fill="#7a2f3a" opacity=".96"/>');
  } },
  biblioteca: { n: 'Biblioteca', amb: ['oficina', 'juego', 'casa'], pinta(P) {
    P.interior('#b9a58a', '#70523c', {});
    P.estante(10, 40, 108, 290, 5, '#5b3a28'); P.estante(126, 40, 108, 196, 3, '#5b3a28'); P.estante(242, 40, 108, 290, 5, '#5b3a28');
    P.mesa(110, 290, 150, '#7a5236');
    P.lampara(180, 14, '#8fbf9a');
    P.alfombra(184, 430, 104, 24, '#7a2f3a');
  } },
  bodega: { n: 'Bodega de barricas', amb: ['vino', 'taller', 'comida'], pinta(P) {
    P.interior('#6f6259', '#8a7462', { tablas: true, zocalo: '#2c2420' });
    P.viga(18);
    for (let j = 0; j < 2; j++) for (let i = 0; i < 4; i++) P.barricaEcho(48 + i * 60 + j * 30, 228 - j * 54, 30);
    P.linea(40, 250, 144, 24); P.linea(24, 234, 200, 22);
    P.repisa(262, 100, 86, '#4a342a'); P.repisa(262, 168, 86, '#4a342a');
    P.barril(274, 252, 62, 80);
    P.caja(18, 356, 78, 52); P.barril(150, 372, 58, 70);
    P.lampara(132, 30, '#d9a441');
    P.pilar(246);
  } },
  taller: { n: 'Galpón', amb: ['taller', 'campo', 'deporte'], pinta(P) {
    P.interior('#9aa3a1', '#878078', { tablas: true, zocalo: '#3a3a3e' });
    P.colgador(14, 60, 150, 6); P.repisa(190, 78, 156, '#5b5f66'); P.repisa(190, 146, 156, '#5b5f66');
    P.mesa(14, 232, 170, '#6d4a34');
    P.add('<rect x="22" y="240" width="154" height="94" fill="#59463a"/><rect x="34" y="254" width="60" height="26" rx="2" fill="#000" opacity=".22"/><rect x="104" y="254" width="60" height="26" rx="2" fill="#000" opacity=".22"/>');
    P.caja(214, 252, 66, 82, '#a97c4f'); P.caja(286, 284, 60, 50, '#b98a56');
    P.linea(288, 344, 284, 25);
    P.add('<g><circle cx="300" cy="420" r="34" fill="#2c2c30"/><circle cx="300" cy="420" r="18" fill="#8d8f97"/><circle cx="300" cy="420" r="6" fill="#2c2c30"/></g>');
    P.lampara(100, 26, '#c9ccd2');
  } },
  cabana: { n: 'Cabaña', amb: ['casa', 'viaje', 'campo', 'juego'], pinta(P) {
    P.interior('#a97c55', '#7a5236', { tablas: true, zocalo: '#3a2a22' });
    P.chimenea(120, 190, 120, 142);
    P.ventana(26, 84, 70, 70, { cortina: '#b5564f', cielo: '#9fc5d9', cerro: '#5f8a66' });
    P.repisa(256, 96, 92, '#5b3a28'); P.repisa(256, 160, 92, '#5b3a28');
    P.cuadro(146, 78, 68, 50, '#5b3a28', '#8fb7c9');
    P.sillon(254, 296, 96, '#6f8a6a');
    P.caja(16, 284, 70, 50, '#8a6a4a');
    P.alfombra(180, 420, 108, 28, '#b5564f');
  } },
  establo: { n: 'Establo', amb: ['campo', 'taller', 'natura'], pinta(P) {
    P.interior('#b08a62', '#c9a86f', { tablas: true, zocalo: '#5b4030' });
    P.viga(22); P.viga(96, '#6d4a34');
    P.add('<rect x="20" y="150" width="96" height="182" fill="#6d4a34"/><rect x="26" y="156" width="84" height="84" fill="#2c2420"/><path d="M26 246h84v80h-84zM26 246l84 80M110 246l-84 80" fill="#8a6244" stroke="#5b4030" stroke-width="4"/>');
    P.linea(26, 110, 246, 24);
    P.colgador(140, 130, 96, 4);
    P.repisa(254, 120, 92, '#5b4030');
    P.add('<g fill="#e2c26a"><rect x="250" y="250" width="96" height="84" rx="6"/><rect x="250" y="276" width="96" height="3" fill="#000" opacity=".2"/><rect x="250" y="304" width="96" height="3" fill="#000" opacity=".2"/></g>');
    P.linea(254, 342, 250, 26);
    P.barril(150, 262, 56, 72, '#7a5a44');
    P.del('<g fill="#e2c26a" opacity=".9"><ellipse cx="60" cy="470" rx="70" ry="14"/><ellipse cx="320" cy="474" rx="60" ry="12"/></g>');
  } },
  plaza: { n: 'Plaza de Armas', amb: ['natura', 'juego', 'comida', 'musica'], pinta(P) {
    P.exterior('#bfe3f5', '#c9c2b3', { y: 232, nubes: [[70, 46, 1], [270, 70, 0.8]], cerros: '#9bbf8a' });
    P.arbol(40, 250, 1.05, '#5d9a5f'); P.arbol(322, 248, 1.1, '#4f8a55');
    P.kiosco(124, 262, 112, 104);
    P.add('<path d="M96 262h168l44 218h-256z" fill="#d9d2c4"/><path d="M96 262h168l8 40h-184z" fill="#000" opacity=".06"/>');
    P.farol(22, 356, 96); P.farol(338, 356, 96);
    P.banca(22, 392, 104); P.banca(238, 392, 104);
    P.arbusto(180, 474, 1.2); P.arbusto(26, 476, 0.9, '#5d9a5f');
  } },
  estacion: { n: 'Estación de trenes', amb: ['viaje', 'oficina', 'comida'], pinta(P) {
    P.exterior('#cfe3ee', '#b9b3a8', { y: 268, nubes: [[250, 40, 0.9]], cerros: '#a9bfa0' });
    P.add('<rect x="0" y="74" width="360" height="196" fill="#e6d3a8"/><path d="M-10 78h380l-20 -34h-340z" fill="#a8504a"/><rect x="0" y="74" width="360" height="8" fill="#000" opacity=".15"/>');
    P.letrero(110, 92, 140, 'CURICÓ', '#2f4a6b');
    P.ventana(26, 136, 64, 70, { cielo: '#33485f', cerro: false, marco: '#f1e7d6' }); P.ventana(270, 136, 64, 70, { cielo: '#33485f', cerro: false, marco: '#f1e7d6' });
    P.puerta(150, 138, 60, 132, '#5b4030');
    P.add('<circle cx="180" cy="60" r="0" fill="none"/>');
    P.rieles(452);
    P.banca(20, 330, 110); P.caja(256, 300, 80, 44, '#8a6a4a'); P.caja(268, 262, 56, 38, '#a57c55');
    P.farol(214, 330, 110);
    P.del('<rect x="0" y="424" width="360" height="6" fill="#e9c46a"/>');
  } },
  mercado: { n: 'Mercado', amb: ['comida', 'campo', 'cocina', 'natura'], pinta(P) {
    P.exterior('#d9ecf5', '#bfb49f', { y: 214, nubes: [[90, 40, 0.9], [300, 60, 0.7]] });
    P.add('<rect x="0" y="120" width="360" height="96" fill="#d9c9a8"/><rect x="0" y="120" width="360" height="10" fill="#a8504a"/>');
    P.puesto(10, 262, 104, 108, '#d9534f'); P.puesto(128, 262, 104, 108, '#3f8f7a'); P.puesto(246, 262, 104, 108, '#e0a030');
    P.caja(20, 330, 64, 40); P.caja(96, 348, 58, 36, '#a57c55'); P.caja(206, 334, 62, 40); P.caja(284, 346, 60, 38, '#a57c55');
    P.barril(160, 300, 44, 50, '#7a5a44');
  } },
  vinedo: { n: 'Viñedo', amb: ['vino', 'campo', 'natura', 'comida'], pinta(P) {
    P.exterior('#f5d9b0', '#b99a66', { y: 220, sol: [290, 70, '#ffe9a8'], cerros: '#a58a6f' });
    P.parra(232, { d: 10 }); P.parra(296, { d: 30 });
    P.linea(20, 340, 246, 23);
    P.caja(24, 352, 66, 44); P.caja(270, 344, 70, 46, '#a57c55');
    P.barril(152, 330, 56, 70);
    P.parra(476, { frente: true, d: 50 });
  } },
  huerta: { n: 'Huerta', amb: ['campo', 'natura', 'comida', 'taller'], pinta(P) {
    P.exterior('#cfeaf4', '#8fae6a', { y: 226, nubes: [[80, 50, 1], [250, 34, 0.7]], cerros: '#7f9f72' });
    P.arbol(318, 246, 0.95, '#6aa35f');
    P.cerco(0, 352, 250);
    P.colmena(20, 300); P.colmena(70, 306, '#f1e7d6'); P.colmena(120, 300, '#9fc5d9');
    P.add('<g fill="#7a5a44"><rect x="190" y="286" width="150" height="16" rx="6"/><rect x="190" y="330" width="150" height="16" rx="6"/><rect x="190" y="374" width="150" height="16" rx="6"/></g>');
    P.linea(194, 336, 290, 24); P.linea(194, 336, 334, 26); P.linea(194, 336, 378, 28);
    P.tronco(30, 400, 96);
    P.arbusto(340, 478, 1.1); P.arbusto(170, 480, 0.8, '#6aa35f');
  } },
  muelle: { n: 'Muelle', amb: ['mar', 'viaje', 'comida', 'deporte'], pinta(P) {
    P.exterior('#bfe3f5', '#d9c79a', { y: 190, sol: [70, 56], nubes: [[230, 46, 1]] });
    P.agua(190, 480, '#6fb1c9');
    P.add('<path d="M0 480V376q60 -24 130 -8t230 -18v130z" fill="#e3d2a4"/>');
    P.zonas.length = 0;
    P.zonas.push({ x1: 18, x2: 150, y1: 414, y2: 468, t1: 32, t2: 40, area: true });
    P.muelle(150, 232, 96, 190);
    P.bote(22, 300, 104, '#c9574d'); P.bote(262, 286, 88, '#3f8f7a');
    P.roca(268, 440, 74); P.caja(170, 196, 54, 36, '#8a6a4a');
    P.del('<path d="M150 232v-52M246 232v-52" stroke="#5b4030" stroke-width="6"/><path d="M150 190q48 22 96 0" stroke="#e9e0cf" stroke-width="2.5" fill="none"/>');
  } },
  bosque: { n: 'Bosque', amb: ['natura', 'viaje', 'campo', 'deporte'], pinta(P) {
    P.exterior('#cfe6d9', '#7f9a66', { y: 214, cerros: '#6f8f7a' });
    P.cascada(150, 96, 226, 46);
    P.arbol(34, 262, 1.15, '#4f8a55'); P.arbol(330, 256, 1.2, '#3f7a4d'); P.arbol(106, 240, 0.8, '#5d9a5f');
    P.carpa(206, 330, 110);
    P.tronco(22, 356, 104); P.roca(112, 420, 70); P.roca(286, 400, 58, '#9a9ca3');
    P.fogata(196, 396);
    P.arbusto(24, 478, 1.2); P.arbusto(332, 480, 1.1, '#5d9a5f');
  } },
};
const ESCENAS_ARMADAS = {};
function escenaArmada(id) {
  if (ESCENAS_ARMADAS[id]) return ESCENAS_ARMADAS[id];
  const def = ESCENAS[id]; if (!def) return null;
  const P = Pincel(); def.pinta(P);
  return (ESCENAS_ARMADAS[id] = { id, n: def.n, amb: def.amb, fondo: P.fondo.join(''), frente: P.frente.join(''), zonas: P.zonas.slice() });
}
function escenaSVG(id, capa) {
  const e = escenaArmada(id);
  return `<svg viewBox="0 0 360 480" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${capa === 'frente' ? e.frente : e.fondo}</svg>`;
}

/* ------------------------------------------------------------
   RETRATOS — una cara distinta por persona, a partir de su nombre.
   Lo que se ve (lentes, barba, sombrero, aros, canas) manda sobre
   el azar: si el caso dice que usa lentes, el retrato los trae.
   ------------------------------------------------------------ */
const CARA = {
  piel: ['#f6d7bf', '#efc7a4', '#dba97f', '#bd875c', '#94603f'],
  pelo: ['#2b2320', '#3d2a1e', '#6b4226', '#a36a34', '#c79a52', '#a13d2b'],
  ropa: ['#3f6f8f', '#8a4a5a', '#4f8a6a', '#b0763a', '#5a5f8f', '#7a7f86', '#a8504a', '#3d6b66'],
  fondo: ['#e8ddc8', '#d6e3df', '#e6d3d3', '#d9dcea', '#e3e6cf'],
};
function semillaDe(txt) { let h = 2166136261; for (let i = 0; i < txt.length; i++) { h ^= txt.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function retratoSVG(p, o = {}) {
  let s = semillaDe(p.n + '|' + (p.rol || ''));
  const az = n => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return Math.floor(s / 4294967296 * n); };
  const v = p.ve || {}, mujer = p.g === 'f';
  const piel = CARA.piel[az(5)], canas = v.canas != null ? !!v.canas : az(6) === 0;
  const cPelo = canas ? '#d5d3ce' : CARA.pelo[az(6)], ropa = CARA.ropa[az(8)], fondo = CARA.fondo[az(5)];
  const estilo = mujer ? ['largo', 'melena', 'mono', 'rizos', 'corto'][az(5)] : ['corto', 'corto', 'ondas', 'rapado', 'calvo'][az(5)];
  const lentes = v.lentes != null ? !!v.lentes : az(5) === 0, barba = !mujer && (v.barba != null ? !!v.barba : az(4) === 0);
  const sombrero = v.sombrero != null ? !!v.sombrero : az(9) === 0, aros = v.aros != null ? !!v.aros : (mujer && az(3) === 0);
  const boca = az(3), ceja = az(3), sombra = '#000';
  const t = [];
  t.push(`<rect width="100" height="100" rx="14" fill="${o.fondo || fondo}"/>`);
  if (estilo === 'largo') t.push(`<path d="M22 46q0 -34 28 -34t28 34v38q-8 6 -14 -2v-30h-28v30q-6 8 -14 2z" fill="${cPelo}"/>`);
  if (estilo === 'melena') t.push(`<path d="M23 48q0 -35 27 -35t27 35v20q-7 5 -12 0v-18h-30v18q-5 5 -12 0z" fill="${cPelo}"/>`);
  if (estilo === 'rizos') t.push(`<g fill="${cPelo}"><circle cx="28" cy="38" r="11"/><circle cx="72" cy="38" r="11"/><circle cx="24" cy="54" r="10"/><circle cx="76" cy="54" r="10"/><circle cx="38" cy="22" r="12"/><circle cx="62" cy="22" r="12"/><circle cx="50" cy="18" r="12"/></g>`);
  if (estilo === 'mono') t.push(`<circle cx="50" cy="12" r="10" fill="${cPelo}"/>`);
  t.push(`<path d="M8 100q2 -24 28 -29h28q26 5 28 29z" fill="${ropa}"/>`);
  t.push(mujer ? `<path d="M40 71q10 12 20 0l-3 -2h-14z" fill="${piel}"/>` : `<path d="M40 71l10 12 10 -12l-4 -1h-12z" fill="#f4f1ea"/><path d="M47 76l3 5 3 -5 -3 -3z" fill="${sombra}" opacity=".5"/>`);
  t.push(`<rect x="43" y="60" width="14" height="13" fill="${piel}"/><rect x="43" y="62" width="14" height="7" fill="#000" opacity=".12"/>`);
  t.push(`<circle cx="27" cy="46" r="5" fill="${piel}"/><circle cx="73" cy="46" r="5" fill="${piel}"/>`);
  t.push(`<ellipse cx="50" cy="43" rx="22.5" ry="25.5" fill="${piel}"/>`);
  /* pelo de adelante */
  if (estilo === 'corto' && !mujer) t.push(`<path d="M27 40q-2 -24 23 -25q25 1 23 25q-5 -12 -12 -14q-12 5 -26 2q-6 4 -8 12z" fill="${cPelo}"/>`);
  if (estilo === 'corto' && mujer) t.push(`<path d="M26 46q-4 -31 24 -32q28 1 24 32q-4 -16 -10 -19q-14 8 -30 2q-6 6 -8 17z" fill="${cPelo}"/>`);
  if (estilo === 'ondas') t.push(`<path d="M26 44q-5 -30 24 -31q29 1 24 31q-3 -10 -8 -14q-7 4 -14 -1q-8 6 -16 1q-7 4 -10 14z" fill="${cPelo}"/>`);
  if (estilo === 'rapado') t.push(`<path d="M28 38q0 -22 22 -22t22 22q-8 -9 -22 -9t-22 9z" fill="${cPelo}" opacity=".75"/>`);
  if (estilo === 'calvo') t.push(`<path d="M27 46q-3 -8 1 -12q2 6 3 12zM73 46q3 -8 -1 -12q-2 6 -3 12z" fill="${cPelo}"/>`);
  if (estilo === 'largo' || estilo === 'melena') t.push(`<path d="M27 44q-3 -28 23 -29q26 1 23 29q-5 -15 -14 -18q-10 9 -24 4q-6 5 -8 14z" fill="${cPelo}"/>`);
  if (estilo === 'mono') t.push(`<path d="M27 42q-2 -25 23 -26q25 1 23 26q-6 -13 -23 -13t-23 13z" fill="${cPelo}"/>`);
  if (estilo === 'rizos') t.push(`<g fill="${cPelo}"><circle cx="36" cy="24" r="8"/><circle cx="50" cy="21" r="8"/><circle cx="64" cy="24" r="8"/></g>`);
  /* cara */
  const yc = ceja === 0 ? 0 : ceja === 1 ? -1 : 1;
  t.push(`<path d="M34 ${37 + yc}q5 -3 10 0M56 ${37}q5 -3 10 ${yc}" stroke="${canas ? '#9a9892' : '#3a2a22'}" stroke-width="2" fill="none" stroke-linecap="round"/>`);
  t.push(`<ellipse cx="39" cy="43" rx="2.6" ry="3" fill="#2b2320"/><ellipse cx="61" cy="43" rx="2.6" ry="3" fill="#2b2320"/><circle cx="39.8" cy="42" r=".9" fill="#fff"/><circle cx="61.8" cy="42" r=".9" fill="#fff"/>`);
  t.push(`<path d="M49 46q-3 6 0 8h3" stroke="#000" stroke-opacity=".28" stroke-width="1.6" fill="none" stroke-linecap="round"/>`);
  if (canas || (p.edad || 0) > 55) t.push(`<path d="M31 49q2 2 5 2M69 49q-2 2 -5 2M38 58q-2 3 -1 6M62 58q2 3 1 6" stroke="#000" stroke-opacity=".16" stroke-width="1.2" fill="none"/>`);
  if (barba) t.push(`<path d="M28 48q1 22 22 24q21 -2 22 -24q-4 9 -10 10q-12 -5 -24 0q-6 -1 -10 -10z" fill="${cPelo}"/><path d="M41 58q9 -4 18 0q-9 4 -18 0z" fill="${piel}" opacity=".55"/>`);
  t.push(boca === 0 ? `<path d="M43 60q7 4 14 0" stroke="#8a3d3d" stroke-width="2" fill="none" stroke-linecap="round"/>` : boca === 1 ? `<path d="M43 61h14" stroke="#8a3d3d" stroke-width="2" stroke-linecap="round"/>` : `<path d="M43 62q7 -3 14 0" stroke="#8a3d3d" stroke-width="2" fill="none" stroke-linecap="round"/>`);
  if (mujer && !barba) t.push(`<path d="M44 60q6 3 12 0" stroke="#c9574d" stroke-width="1.2" fill="none" opacity=".7"/>`);
  if (lentes) t.push(`<g fill="#fff" fill-opacity=".22" stroke="#2c2c30" stroke-width="2"><rect x="30" y="37.5" width="16" height="12" rx="5"/><rect x="54" y="37.5" width="16" height="12" rx="5"/></g><path d="M46 42h8M30 42l-4 -1M70 42l4 -1" stroke="#2c2c30" stroke-width="2"/>`);
  if (aros) t.push(`<circle cx="26.5" cy="52" r="2.6" fill="#e2c26a"/><circle cx="73.5" cy="52" r="2.6" fill="#e2c26a"/>`);
  if (sombrero) t.push(`<ellipse cx="50" cy="25" rx="36" ry="7" fill="#d9bf7c"/><path d="M31 25q0 -19 19 -19t19 19z" fill="#e6cf92"/><path d="M31 23q19 5 38 0v3q-19 5 -38 0z" fill="#5b4030"/>`);
  return `<svg viewBox="0 0 100 100" aria-hidden="true">${t.join('')}</svg>`;
}

/* ------------------------------------------------------------
   HUELLAS Y MUESTRAS — para los minijuegos del laboratorio.
   ------------------------------------------------------------ */
function azarDe(semilla) { let s = semilla >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
/* Una huella: arcos alrededor de un núcleo. `tipo` cambia el dibujo (arco, lazo, remolino…). */
function huellaSVG(tipo, color = '#3a2a22') {
  const r = azarDe(tipo * 7919 + 17), cx = 50 + (r() - 0.5) * 16, cy = 58 + (r() - 0.5) * 14;
  const giro = (r() - 0.5) * 50, estira = 0.62 + r() * 0.3, modo = tipo % 3, corte = 20 + Math.floor(r() * 40);
  const t = [];
  for (let i = 1; i <= 11; i++) {
    const rad = i * 4.3, a = 0.1 + r() * 0.5;
    if (modo === 0) t.push(`<ellipse cx="${cx}" cy="${cy}" rx="${rad * estira}" ry="${rad}" stroke-dasharray="${corte + i * 6} ${4 + (i % 3) * 3}"/>`);
    else if (modo === 1) t.push(`<path d="M${cx - rad * estira} ${cy + 46}V${cy}a${rad * estira} ${rad} 0 0 1 ${rad * estira * 2} 0V${cy + 46}" stroke-dasharray="${corte + i * 9} ${5 + (i % 2) * 4}"/>`);
    else t.push(`<path d="M${cx - rad * 1.2} ${cy + rad * a}Q${cx} ${cy - rad * 1.5} ${cx + rad * 1.2} ${cy + rad * a}" stroke-dasharray="${corte + i * 7} ${4 + (i % 4) * 2}"/>`);
  }
  return `<svg viewBox="0 0 100 120" aria-hidden="true"><defs><clipPath id="hc${tipo}"><ellipse cx="50" cy="60" rx="38" ry="54"/></clipPath></defs><g clip-path="url(#hc${tipo})" transform="rotate(${giro.toFixed(1)} 50 60)" fill="none" stroke="${color}" stroke-width="2.3" stroke-linecap="round">${t.join('')}</g></svg>`;
}
/* Una muestra al microscopio: fibras, granos o pelos según `tipo`; `variante` cambia un detalle. */
function muestraSVG(semilla, variante) {
  const r = azarDe(semilla * 104729 + 3);
  const tono = ['#b0763a', '#6b4f8a', '#3f8f7a', '#a8504a', '#4f6f9a'][Math.floor(r() * 5)], forma = Math.floor(r() * 3);
  const t = [`<circle cx="50" cy="50" r="48" fill="#eef3ea"/>`];
  const piezas = [];
  for (let i = 0; i < 7; i++) piezas.push({ x: 18 + r() * 64, y: 18 + r() * 64, a: r() * 180, s: 0.8 + r() * 0.7, c: i % 3 === 0 ? '#2c2c30' : tono });
  if (variante) {
    const v = azarDe(semilla * 31 + variante * 977), k = Math.floor(v() * piezas.length), modo = variante % 3;
    if (modo === 0) piezas[k].a += 70 + v() * 40;
    else if (modo === 1) { piezas[k].x = 18 + v() * 64; piezas[k].y = 18 + v() * 64; }
    else piezas[k].c = piezas[k].c === tono ? '#d9a441' : tono;
  }
  for (const p of piezas) {
    if (forma === 0) t.push(`<path d="M-14 0q7 -8 14 0t14 0" transform="translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${p.a.toFixed(0)}) scale(${p.s.toFixed(2)})" stroke="${p.c}" stroke-width="3" fill="none" stroke-linecap="round"/>`);
    else if (forma === 1) t.push(`<g transform="translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${p.a.toFixed(0)}) scale(${p.s.toFixed(2)})"><ellipse rx="8" ry="5" fill="${p.c}"/><ellipse cx="3" rx="2.5" ry="1.6" fill="#fff" opacity=".5"/></g>`);
    else t.push(`<path d="M-12 -2l8 4 6 -5 10 3" transform="translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${p.a.toFixed(0)}) scale(${p.s.toFixed(2)})" stroke="${p.c}" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`);
  }
  return `<svg viewBox="0 0 100 100" aria-hidden="true"><defs><clipPath id="mc${semilla}v${variante || 0}"><circle cx="50" cy="50" r="48"/></clipPath></defs><g clip-path="url(#mc${semilla}v${variante || 0})">${t.join('')}</g><circle cx="50" cy="50" r="48" fill="none" stroke="#2c2c30" stroke-width="4"/></svg>`;
}

if (typeof module !== 'undefined') module.exports = { ESCENAS, escenaArmada, escenaSVG, retratoSVG, huellaSVG, muestraSVG, semillaDe, azarDe };
