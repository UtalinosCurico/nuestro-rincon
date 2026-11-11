/* ============================================================
   ARTE — cada descubrimiento se dibuja a partir de su semilla.
   No se guarda ninguna imagen: con la semilla basta para que el
   mismo objeto se vea igual en los dos teléfonos y para siempre.
   ============================================================ */

const ARTE_GREEK = ['α', 'β', 'γ', 'δ', 'ε', 'ζ', 'η', 'θ'];

function hsl(h, s, l, a) { return a == null ? `hsl(${h | 0},${s | 0}%,${l | 0}%)` : `hsla(${h | 0},${s | 0}%,${l | 0}%,${a})`; }

/** Nombre automático cuando nadie lo ha bautizado. */
function nombreAuto(d) {
  const t = TIPOS[d.t];
  const num = String(d.n).padStart(4, '0');
  switch (t.arte) {
    case 'planeta': case 'gaseoso': case 'anillos': case 'habitable': case 'oceano':
      return 'RC-' + num + ' ' + 'bcdef'[d.s % 5];
    case 'espiral': case 'eliptica': case 'primeras': case 'lente': return 'RCG ' + num;
    case 'nebulosa': case 'planetaria': case 'molecular': return 'RCN ' + num;
    case 'pulsar': case 'magnetar': return 'PSR RC' + num;
    case 'frb': return 'FRB ' + (2026) + num;
    case 'cometa': return 'C/' + (2026) + ' R' + (d.n % 9 + 1);
    case 'asteroide': return '(' + (600000 + d.n * 7) + ') RC';
    case 'sol': return 'AR ' + (14000 + d.n);
    default: return 'RC ' + num;
  }
}
function nombreDe(d) { return d.nombre || nombreAuto(d); }

/** Datos "científicos" del objeto, inventados con la semilla pero verosímiles. */
function fichaDe(d) {
  const r = mulberry32(d.s ^ 0x5bd1e995);
  const t = TIPOS[d.t];
  const al = (a, b) => Math.round(a + r() * (b - a));
  const fmt = n => n.toLocaleString('es-CL');
  const filas = [];
  switch (t.arte) {
    case 'asteroide': filas.push(['Tamaño', al(1, 40) + ' km'], ['Vuelta al Sol', (2.5 + r() * 4).toFixed(1).replace('.', ',') + ' años']); break;
    case 'cometa': filas.push(['Núcleo', (1 + r() * 9).toFixed(1).replace('.', ',') + ' km'], ['Vuelve en', al(60, 4000) + ' años']); break;
    case 'planeta': case 'habitable': case 'oceano':
      filas.push(['Distancia', fmt(al(12, 900)) + ' años luz'], ['Tamaño', (0.6 + r() * 1.8).toFixed(2).replace('.', ',') + ' Tierras'], ['Año', al(8, 420) + ' días']); break;
    case 'gaseoso': case 'anillos':
      filas.push(['Distancia', fmt(al(40, 2000)) + ' años luz'], ['Masa', (0.1 + r() * 9).toFixed(1).replace('.', ',') + ' Júpiter'], ['Año', al(2, 900) + ' días']); break;
    case 'espiral': case 'eliptica': case 'lente':
      filas.push(['Distancia', fmt(al(8, 900)) + ' millones de años luz'], ['Estrellas', al(20, 900) + ' mil millones']); break;
    case 'primeras': filas.push(['Su luz salió hace', '13.' + al(100, 600) + ' millones de años']); break;
    case 'cuasar': case 'agujero': filas.push(['Masa', fmt(al(5, 9000)) + ' millones de soles'], ['Distancia', fmt(al(100, 9000)) + ' millones de años luz']); break;
    case 'pulsar': case 'magnetar': filas.push(['Gira', al(2, 700) + ' veces por segundo'], ['Distancia', fmt(al(500, 30000)) + ' años luz']); break;
    case 'nebulosa': case 'planetaria': case 'molecular': filas.push(['Distancia', fmt(al(800, 9000)) + ' años luz'], ['Ancho', al(1, 90) + ' años luz']); break;
    case 'sol': filas.push(['Tamaño', al(2, 14) + ' Tierras']); break;
    default: filas.push(['Distancia', fmt(al(20, 4000)) + ' años luz'], ['Magnitud', (6 + r() * 12).toFixed(1).replace('.', ',')]);
  }
  return filas;
}

/** Posición en el cielo (ra en horas, dec en grados), para el mapa de «Nuestro cielo». */
function posicionDe(d) {
  const r = mulberry32(d.s ^ 0x2c1b3c6d);
  // casi todo en el cielo austral, que es el que ven
  const dec = -90 + Math.acos(1 - r() * 1.15) / Math.PI * 180 * 0.95;
  return { ra: r() * 24, dec: Math.max(-88, Math.min(15, dec)) };
}

/* ---------- piezas ---------- */
function fondoEstrellado(r, id, n) {
  let s = `<rect width="100" height="100" fill="url(#bg${id})"/>`;
  for (let i = 0; i < (n || 26); i++) {
    const x = r() * 100, y = r() * 100, rad = 0.2 + r() * 0.6;
    s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rad.toFixed(2)}" fill="#fff" opacity="${(0.35 + r() * 0.6).toFixed(2)}"/>`;
  }
  return s;
}
function brillo(id, color) {
  return `<radialGradient id="gl${id}"><stop offset="0" stop-color="#fff"/><stop offset=".25" stop-color="${color}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>`;
}

/** SVG completo del descubrimiento. */
function arteSVG(d, clase) {
  const t = TIPOS[d.t];
  const r = mulberry32(d.s || 1);
  const id = 'a' + (d.s % 1e9).toString(36) + Math.floor(Math.random() * 1e6).toString(36);
  const h = Math.floor(r() * 360);
  let defs = `<radialGradient id="bg${id}" cx=".5" cy=".45" r=".75"><stop offset="0" stop-color="${hsl(230 + r() * 40, 45, 12)}"/><stop offset="1" stop-color="#03040c"/></radialGradient>`;
  let cuerpo = '';
  const estrellas = () => fondoEstrellado(r, id, 30);

  switch (t.arte) {
    case 'asteroide': {
      let p = '';
      const n = 14;
      for (let i = 0; i < n; i++) {
        const a = i / n * Math.PI * 2, rr = 22 + r() * 10;
        p += (i ? 'L' : 'M') + (50 + Math.cos(a) * rr).toFixed(1) + ' ' + (50 + Math.sin(a) * rr * 0.8).toFixed(1);
      }
      defs += `<radialGradient id="as${id}" cx=".35" cy=".3"><stop offset="0" stop-color="${hsl(30, 12, 62)}"/><stop offset="1" stop-color="${hsl(25, 10, 22)}"/></radialGradient>`;
      cuerpo = estrellas() + `<path d="${p}Z" fill="url(#as${id})"/>`;
      for (let i = 0; i < 6; i++) cuerpo += `<circle cx="${(36 + r() * 28).toFixed(1)}" cy="${(40 + r() * 20).toFixed(1)}" r="${(1.5 + r() * 4).toFixed(1)}" fill="#000" opacity=".25"/>`;
      break;
    }
    case 'estrella': case 'estrella28': {
      const col = t.arte === 'estrella28' ? '#ffd27a' : hsl(r() < 0.5 ? 25 + r() * 30 : 200 + r() * 30, 90, 70);
      defs += brillo(id, col);
      cuerpo = estrellas() + `<circle cx="50" cy="50" r="34" fill="url(#gl${id})"/>`;
      const rayos = t.arte === 'estrella28' ? 8 : 4;
      for (let i = 0; i < rayos; i++) {
        const a = i / rayos * Math.PI;
        cuerpo += `<line x1="${50 - Math.cos(a) * 40}" y1="${50 - Math.sin(a) * 40}" x2="${50 + Math.cos(a) * 40}" y2="${50 + Math.sin(a) * 40}" stroke="${col}" stroke-width=".6" opacity=".7"/>`;
      }
      if (t.arte === 'estrella28') cuerpo += `<path d="M50 44c-2.6-4-9-2.6-9 2.4 0 4.6 9 9.8 9 9.8s9-5.2 9-9.8c0-5-6.4-6.4-9-2.4z" fill="#ff8fb1" opacity=".95"/>`;
      break;
    }
    case 'doble': {
      const c1 = hsl(30 + r() * 20, 95, 68), c2 = hsl(205 + r() * 20, 90, 72);
      defs += brillo(id + 'a', c1) + brillo(id + 'b', c2);
      cuerpo = estrellas() + `<ellipse cx="50" cy="50" rx="22" ry="8" fill="none" stroke="#fff" stroke-opacity=".15" transform="rotate(-20 50 50)"/>` +
        `<circle cx="38" cy="54" r="20" fill="url(#gl${id}a)"/><circle cx="64" cy="46" r="14" fill="url(#gl${id}b)"/>`;
      break;
    }
    case 'cumulo': case 'globular': {
      cuerpo = estrellas();
      const n = t.arte === 'globular' ? 160 : 34;
      for (let i = 0; i < n; i++) {
        const a = r() * Math.PI * 2;
        const dist = t.arte === 'globular' ? Math.pow(r(), 1.8) * 30 : r() * 34;
        const x = 50 + Math.cos(a) * dist, y = 50 + Math.sin(a) * dist;
        const col = t.arte === 'globular' ? hsl(35 + r() * 20, 80, 75) : hsl(205 + r() * 20, 80, 80);
        cuerpo += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(0.4 + r() * (t.arte === 'globular' ? 0.9 : 1.6)).toFixed(2)}" fill="${col}"/>`;
      }
      if (t.arte === 'globular') { defs += brillo(id, '#ffe2a8'); cuerpo += `<circle cx="50" cy="50" r="18" fill="url(#gl${id})" opacity=".55"/>`; }
      break;
    }
    case 'cometa': {
      const a = -25 - r() * 30;
      defs += `<linearGradient id="co${id}" x1="0" x2="1"><stop offset="0" stop-color="#bfe8ff" stop-opacity=".95"/><stop offset="1" stop-color="#7fb7ff" stop-opacity="0"/></linearGradient>` + brillo(id, '#d8f3ff');
      cuerpo = estrellas() + `<g transform="rotate(${a.toFixed(0)} 30 62)"><path d="M30 62 Q70 54 104 44 L104 80 Q70 70 30 62Z" fill="url(#co${id})" opacity=".85"/>` +
        `<path d="M30 62 Q70 60 104 58" stroke="#fff" stroke-opacity=".5" stroke-width=".8" fill="none"/></g><circle cx="30" cy="62" r="9" fill="url(#gl${id})"/>`;
      break;
    }
    case 'planeta': case 'habitable': case 'oceano': case 'marron': {
      let c1, c2, c3;
      if (t.arte === 'habitable' || t.arte === 'oceano') { c1 = hsl(205, 70, 45); c2 = hsl(140, 45, 38); c3 = '#fff'; }
      else if (t.arte === 'marron') { c1 = hsl(15, 55, 30); c2 = hsl(330, 40, 22); c3 = hsl(20, 60, 45); }
      else { c1 = hsl(h, 35, 45); c2 = hsl((h + 30) % 360, 30, 28); c3 = hsl((h + 180) % 360, 25, 60); }
      defs += `<radialGradient id="pl${id}" cx=".35" cy=".32" r=".8"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></radialGradient>` +
        `<clipPath id="cp${id}"><circle cx="50" cy="52" r="28"/></clipPath>` +
        `<radialGradient id="sh${id}" cx=".72" cy=".7" r=".7"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".75"/></radialGradient>`;
      cuerpo = estrellas() + `<circle cx="50" cy="52" r="31" fill="${c1}" opacity=".12"/><circle cx="50" cy="52" r="28" fill="url(#pl${id})"/><g clip-path="url(#cp${id})">`;
      if (t.arte === 'habitable' || t.arte === 'oceano') {
        for (let i = 0; i < (t.arte === 'oceano' ? 2 : 5); i++) cuerpo += `<ellipse cx="${(30 + r() * 40).toFixed(1)}" cy="${(35 + r() * 34).toFixed(1)}" rx="${(4 + r() * 9).toFixed(1)}" ry="${(3 + r() * 6).toFixed(1)}" fill="${c2}" opacity=".85"/>`;
        for (let i = 0; i < 7; i++) cuerpo += `<path d="M${(20 + r() * 50).toFixed(0)} ${(30 + r() * 44).toFixed(0)} q8 -3 16 0" stroke="#fff" stroke-width="${(1 + r() * 2).toFixed(1)}" opacity=".7" fill="none" stroke-linecap="round"/>`;
      } else {
        for (let i = 0; i < 9; i++) cuerpo += `<circle cx="${(26 + r() * 48).toFixed(1)}" cy="${(30 + r() * 44).toFixed(1)}" r="${(1 + r() * 4).toFixed(1)}" fill="${c3}" opacity=".25"/>`;
      }
      cuerpo += `<circle cx="50" cy="52" r="28" fill="url(#sh${id})"/></g>`;
      if (t.arte !== 'marron') { defs += brillo(id, '#ffe9b0'); cuerpo += `<circle cx="88" cy="14" r="10" fill="url(#gl${id})"/>`; }
      break;
    }
    case 'gaseoso': case 'anillos': {
      const base = r() < 0.5 ? 25 + r() * 25 : 180 + r() * 40;
      defs += `<clipPath id="cp${id}"><circle cx="50" cy="52" r="24"/></clipPath>` +
        `<radialGradient id="sh${id}" cx=".7" cy=".7" r=".7"><stop offset=".5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".7"/></radialGradient>`;
      cuerpo = estrellas();
      const anillo = (atras) => `<ellipse cx="50" cy="52" rx="42" ry="10" fill="none" stroke="${hsl(base, 30, 75)}" stroke-width="${atras ? 5 : 4}" opacity="${atras ? 0.35 : 0.7}" transform="rotate(-14 50 52)" ${atras ? '' : `stroke-dasharray="66 200" stroke-dashoffset="-66"`}/>`;
      if (t.arte === 'anillos') cuerpo += anillo(true);
      cuerpo += `<g clip-path="url(#cp${id})"><rect x="20" y="20" width="60" height="70" fill="${hsl(base, 45, 55)}"/>`;
      for (let i = 0; i < 8; i++) cuerpo += `<rect x="20" y="${(28 + i * 6 + r() * 3).toFixed(1)}" width="60" height="${(2 + r() * 4).toFixed(1)}" fill="${hsl(base + r() * 20 - 10, 40 + r() * 20, 35 + r() * 35)}" opacity=".8"/>`;
      cuerpo += `<circle cx="50" cy="52" r="24" fill="url(#sh${id})"/></g>`;
      if (t.arte === 'anillos') cuerpo += anillo(false);
      break;
    }
    case 'nebulosa': case 'planetaria': case 'molecular': {
      const paleta = t.arte === 'nebulosa' ? [350, 330, 20, 190] : t.arte === 'planetaria' ? [170, 200, 300, 20] : [260, 230, 290, 200];
      cuerpo = estrellas();
      if (t.arte === 'planetaria') {
        defs += `<radialGradient id="pn${id}"><stop offset=".35" stop-color="${hsl(paleta[0], 80, 55)}" stop-opacity=".1"/><stop offset=".7" stop-color="${hsl(paleta[1], 85, 60)}" stop-opacity=".85"/><stop offset="1" stop-color="${hsl(paleta[2], 80, 50)}" stop-opacity="0"/></radialGradient>` + brillo(id, '#dff7ff');
        cuerpo += `<ellipse cx="50" cy="50" rx="${(28 + r() * 8).toFixed(0)}" ry="${(22 + r() * 8).toFixed(0)}" fill="url(#pn${id})" transform="rotate(${(r() * 180).toFixed(0)} 50 50)"/><circle cx="50" cy="50" r="5" fill="url(#gl${id})"/>`;
      } else {
        for (let i = 0; i < 9; i++) {
          const c = paleta[i % paleta.length] + r() * 20;
          defs += `<radialGradient id="nb${id}${i}"><stop offset="0" stop-color="${hsl(c, 75, t.arte === 'molecular' ? 35 : 58)}" stop-opacity="${t.arte === 'molecular' ? 0.7 : 0.55}"/><stop offset="1" stop-color="${hsl(c, 70, 40)}" stop-opacity="0"/></radialGradient>`;
          cuerpo += `<ellipse cx="${(25 + r() * 50).toFixed(1)}" cy="${(25 + r() * 50).toFixed(1)}" rx="${(14 + r() * 22).toFixed(1)}" ry="${(10 + r() * 18).toFixed(1)}" fill="url(#nb${id}${i})" transform="rotate(${(r() * 180).toFixed(0)} 50 50)"/>`;
        }
        if (t.arte === 'molecular') cuerpo += `<path d="M10 70 Q40 40 90 62" stroke="#000" stroke-width="10" opacity=".45" fill="none"/>`;
        for (let i = 0; i < 5; i++) cuerpo += `<circle cx="${(20 + r() * 60).toFixed(1)}" cy="${(20 + r() * 60).toFixed(1)}" r="${(0.8 + r() * 1.2).toFixed(1)}" fill="#fff"/>`;
      }
      break;
    }
    case 'espiral': case 'primeras': {
      const col = t.arte === 'primeras' ? 15 : 40 + r() * 180;
      const giro = r() * 180;
      defs += brillo(id, hsl(40, 90, 80));
      cuerpo = estrellas() + `<g transform="rotate(${giro.toFixed(0)} 50 50) scale(1 ${t.arte === 'primeras' ? 0.8 : 0.55 + r() * 0.35}) translate(0 ${t.arte === 'primeras' ? 12 : 22})">`;
      const brazos = t.arte === 'primeras' ? 2 : 2 + Math.floor(r() * 2);
      for (let b = 0; b < brazos; b++) {
        for (let i = 0; i < 70; i++) {
          const k = i / 70, a = k * 4.2 + b * Math.PI * 2 / brazos;
          const rad = 3 + k * 32;
          const x = 50 + Math.cos(a) * rad + (r() - 0.5) * 4, y = 50 + Math.sin(a) * rad + (r() - 0.5) * 4;
          cuerpo += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(0.6 + r() * 1.4 * (1 - k)).toFixed(2)}" fill="${hsl(col + r() * 30, 70, 70 + r() * 20)}" opacity="${(0.5 + r() * 0.5).toFixed(2)}"/>`;
        }
      }
      cuerpo += `<circle cx="50" cy="50" r="10" fill="url(#gl${id})"/></g>`;
      if (t.arte === 'primeras') cuerpo = `<g opacity=".85" filter="url(#bl${id})">${cuerpo}</g>`, defs += `<filter id="bl${id}"><feGaussianBlur stdDeviation=".8"/></filter>`;
      break;
    }
    case 'eliptica': {
      defs += `<radialGradient id="el${id}"><stop offset="0" stop-color="#fff6dc"/><stop offset=".3" stop-color="${hsl(35, 70, 70)}" stop-opacity=".8"/><stop offset="1" stop-color="${hsl(25, 60, 40)}" stop-opacity="0"/></radialGradient>`;
      cuerpo = estrellas() + `<ellipse cx="50" cy="50" rx="${(26 + r() * 10).toFixed(0)}" ry="${(16 + r() * 10).toFixed(0)}" fill="url(#el${id})" transform="rotate(${(r() * 180).toFixed(0)} 50 50)"/>`;
      break;
    }
    case 'supernova': case 'pulsar': case 'magnetar': {
      const col = t.arte === 'magnetar' ? '#c79bff' : t.arte === 'pulsar' ? '#9fe3ff' : '#ffd7a0';
      defs += brillo(id, col);
      cuerpo = estrellas();
      if (t.arte === 'supernova') {
        for (let i = 0; i < 16; i++) {
          const a = r() * Math.PI * 2, l = 18 + r() * 26;
          cuerpo += `<line x1="50" y1="50" x2="${(50 + Math.cos(a) * l).toFixed(1)}" y2="${(50 + Math.sin(a) * l).toFixed(1)}" stroke="${hsl(20 + r() * 30, 95, 70)}" stroke-width="${(0.5 + r()).toFixed(1)}" opacity=".7"/>`;
        }
        cuerpo += `<circle cx="50" cy="50" r="36" fill="url(#gl${id})"/>`;
      } else {
        const a = r() * 180;
        cuerpo += `<g transform="rotate(${a.toFixed(0)} 50 50)"><path d="M50 50 L44 0 L56 0Z M50 50 L44 100 L56 100Z" fill="${col}" opacity=".45"/></g>`;
        if (t.arte === 'magnetar') for (let i = 1; i <= 3; i++) cuerpo += `<ellipse cx="50" cy="50" rx="${8 + i * 7}" ry="${4 + i * 9}" fill="none" stroke="${col}" stroke-opacity=".35"/>`;
        cuerpo += `<circle cx="50" cy="50" r="16" fill="url(#gl${id})"/>`;
      }
      break;
    }
    case 'lente': {
      defs += brillo(id, '#ffe1a8') + `<radialGradient id="ar${id}"><stop offset=".72" stop-color="#9fd0ff" stop-opacity="0"/><stop offset=".8" stop-color="#bfe0ff" stop-opacity=".9"/><stop offset=".9" stop-color="#9fd0ff" stop-opacity="0"/></radialGradient>`;
      cuerpo = estrellas() + `<circle cx="50" cy="50" r="30" fill="url(#ar${id})"/><circle cx="50" cy="50" r="8" fill="url(#gl${id})"/>`;
      break;
    }
    case 'cuasar': case 'agujero': {
      defs += `<radialGradient id="ad${id}"><stop offset=".25" stop-color="#000"/><stop offset=".32" stop-color="#ffefc2"/><stop offset=".55" stop-color="#ff9a3d" stop-opacity=".8"/><stop offset="1" stop-color="#ff5a1f" stop-opacity="0"/></radialGradient>`;
      cuerpo = estrellas();
      if (t.arte === 'cuasar') cuerpo += `<path d="M50 50 L46 0 L54 0Z M50 50 L46 100 L54 100Z" fill="#9fd8ff" opacity=".55"/>`;
      cuerpo += `<ellipse cx="50" cy="50" rx="40" ry="${t.arte === 'agujero' ? 13 : 16}" fill="url(#ad${id})"/><circle cx="50" cy="50" r="${t.arte === 'agujero' ? 9 : 6}" fill="#000"/>`;
      if (t.arte === 'agujero') cuerpo += `<circle cx="50" cy="50" r="11" fill="none" stroke="#ffd79a" stroke-width="1.2" opacity=".9"/>`;
      break;
    }
    case 'disco': case 'agua': {
      defs += `<radialGradient id="ds${id}"><stop offset="0" stop-color="#fff2c8"/><stop offset=".12" stop-color="${t.arte === 'agua' ? '#7fd3ff' : '#ffb35c'}"/><stop offset="1" stop-color="${t.arte === 'agua' ? '#2a5aa8' : '#7a2a10'}" stop-opacity=".2"/></radialGradient>`;
      cuerpo = estrellas() + `<g transform="rotate(${(r() * 60 - 30).toFixed(0)} 50 50)"><ellipse cx="50" cy="50" rx="42" ry="24" fill="url(#ds${id})"/>`;
      for (let i = 0; i < 3; i++) { const rx = 14 + i * 9 + r() * 3; cuerpo += `<ellipse cx="50" cy="50" rx="${rx.toFixed(1)}" ry="${(rx * 0.57).toFixed(1)}" fill="none" stroke="#000" stroke-width="${(1 + r() * 1.4).toFixed(1)}" opacity=".55"/>`; }
      cuerpo += `</g>`;
      break;
    }
    case 'frb': {
      cuerpo = `<rect width="100" height="100" fill="#050816"/>`;
      for (let i = 0; i < 8; i++) cuerpo += `<line x1="0" y1="${12 * i + 4}" x2="100" y2="${12 * i + 4}" stroke="#1d2a55" stroke-width=".4"/>`;
      let p = 'M0 60';
      for (let x = 0; x <= 100; x += 2) {
        const pico = Math.exp(-Math.pow((x - 52) / 3.2, 2));
        p += ' L' + x + ' ' + (60 - pico * 46 - (r() - 0.5) * 4).toFixed(1);
      }
      cuerpo += `<path d="${p}" stroke="#7ff0d0" stroke-width="1.4" fill="none"/><path d="${p}" stroke="#7ff0d0" stroke-width="5" opacity=".18" fill="none"/>`;
      break;
    }
    case 'sol': {
      defs += `<radialGradient id="so${id}" cx=".45" cy=".45"><stop offset="0" stop-color="#fff3b0"/><stop offset=".7" stop-color="#ffb02e"/><stop offset="1" stop-color="#e2611a"/></radialGradient>`;
      cuerpo = `<rect width="100" height="100" fill="#120806"/><circle cx="50" cy="50" r="38" fill="url(#so${id})"/>`;
      for (let i = 0; i < 6; i++) cuerpo += `<circle cx="${(30 + r() * 40).toFixed(1)}" cy="${(30 + r() * 40).toFixed(1)}" r="${(1 + r() * 3).toFixed(1)}" fill="#5a1d05" opacity=".8"/>`;
      if (d.t !== 'mancha') cuerpo += `<path d="M78 34 q16 -10 10 -26" stroke="#ff7a2e" stroke-width="3" fill="none" opacity=".85"/>`;
      break;
    }
    default:
      defs += brillo(id, '#fff');
      cuerpo = estrellas() + `<circle cx="50" cy="50" r="20" fill="url(#gl${id})"/>`;
  }
  return `<svg class="${clase || ''}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${TIPOS[d.t].nombre}"><defs>${defs}</defs>${cuerpo}</svg>`;
}

/** Silueta para los tipos del álbum que todavía no tienen. */
function siluetaSVG(tipoId) {
  const d = { s: 12345 + tipoId.length * 977, t: tipoId, n: 1 };
  return arteSVG(d, 'silueta');
}
