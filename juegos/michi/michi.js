/* ============================================================
   MICHI — el gatito, dibujado en SVG (viewBox 200×210)
   Es el mismo gatito crema del Rincón de juegos, ahora con caras,
   pelajes y suciedad. La ropa se recorta a la silueta del cuerpo
   con un clipPath, igual que en la portada.
   ============================================================ */
const ROPA_SVG = {
  'ropa:sueter': { cuerpo: `<g>
    <rect x="38" y="150" width="124" height="44" fill="#7fb0c4"/>
    <rect x="38" y="150" width="124" height="13" fill="#5b8aa6"/>
    <g stroke="#5b8aa6" stroke-width="2.4" opacity=".5" fill="none"><path d="M42 176 q58 7 116 0"/><path d="M42 189 q58 7 116 0"/></g>
    <rect x="38" y="188" width="124" height="6" fill="#5b8aa6"/></g>` },
  'ropa:rayas': { cuerpo: `<g>
    <rect x="38" y="150" width="124" height="44" fill="#f6f2e8"/>
    <g stroke="#365a8a" stroke-width="5" opacity=".9" fill="none"><path d="M38 168 h124"/><path d="M38 181 h124"/><path d="M38 194 h124"/></g>
    <rect x="38" y="150" width="124" height="12" fill="#c98e9b"/></g>` },
  'ropa:vestido': { cuerpo: `<g>
    <rect x="38" y="150" width="124" height="46" fill="#e8a3c0"/>
    <rect x="38" y="150" width="124" height="14" fill="#d579a4"/>
    <rect x="38" y="171" width="124" height="5" fill="#b85c8a"/>
    <g fill="#fff" opacity=".85"><circle cx="82" cy="188" r="2.2"/><circle cx="100" cy="196" r="2.2"/><circle cx="118" cy="188" r="2.2"/><circle cx="100" cy="182" r="2.2"/></g></g>` },
  'ropa:tutu': {
    cuerpo: `<g><rect x="38" y="152" width="124" height="30" fill="#d579a4"/><rect x="38" y="176" width="124" height="4" fill="#b85c8a"/></g>`,
    suelto: `<g><path d="M48 180 q52 -20 104 0 q-9 16 -24 18 q-9 -12 -12 -2 q-8 11 -17 1 q-9 10 -17 -1 q-3 -10 -12 2 q-15 -2 -24 -18z" fill="#f6b9d4"/>
      <path d="M48 180 q52 -18 104 0" stroke="#e896bf" stroke-width="2" fill="none"/></g>` },
  'ropa:pijama': { cuerpo: `<g>
    <rect x="38" y="150" width="124" height="44" fill="#a9c2e8"/>
    <rect x="38" y="150" width="124" height="13" fill="#8aa8d6"/>
    <line x1="100" y1="163" x2="100" y2="194" stroke="#8aa8d6" stroke-width="2"/>
    <g fill="#fff" opacity=".9"><circle cx="100" cy="172" r="1.7"/><circle cx="100" cy="183" r="1.7"/><circle cx="100" cy="194" r="1.7"/></g>
    <g fill="#fff" opacity=".7"><path d="M72 178 l1.5 3.2 3.2 .4 -2.4 2.3 .6 3.4 -3 -1.7 -3 1.7 .6 -3.4 -2.4 -2.3 3.2 -.4z"/>
      <path d="M126 190 l1.3 2.8 2.8 .3 -2 2 .5 2.9 -2.6 -1.4 -2.6 1.4 .5 -2.9 -2 -2 2.8 -.3z"/></g></g>` },
  'ropa:abrigo': { cuerpo: `<g>
    <rect x="38" y="152" width="124" height="44" fill="#8a6f4e"/>
    <path d="M100 158 v38" stroke="#6f583c" stroke-width="2.4"/>
    <ellipse cx="100" cy="157" rx="46" ry="10" fill="#f3ece0"/>
    <g fill="#5a4632"><circle cx="90" cy="178" r="2.6"/><circle cx="90" cy="192" r="2.6"/><circle cx="110" cy="178" r="2.6"/><circle cx="110" cy="192" r="2.6"/></g></g>` },
  'ropa:capa': {
    atras: `<path d="M66 148 q34 -9 68 0 l22 62 q-56 17 -112 0z" fill="#c0392b"/>`,
    cuerpo: `<g><path d="M82 148 l18 18 18 -18 q-18 -7 -36 0z" fill="#a32d22"/>
      <circle cx="100" cy="180" r="12" fill="#f4d35e"/>
      <path d="M100 171 l2.8 6 6.4 .7 -4.9 4.5 1.4 6.4 -5.7 -3.3 -5.7 3.3 1.4 -6.4 -4.9 -4.5 6.4 -.7z" fill="#e0a93b"/></g>` },
  'ropa:esmoquin': { cuerpo: `<g>
    <rect x="38" y="150" width="124" height="45" fill="#2b2b33"/>
    <path d="M88 150 h24 l-5 45 h-14z" fill="#f6f2e8"/>
    <path d="M88 150 l12 16 -17 7z" fill="#1a1a20"/><path d="M112 150 l-12 16 17 7z" fill="#1a1a20"/>
    <path d="M91 166 q9 -6 18 0 q-9 7 -18 0z" fill="#7a1f2b"/>
    <g fill="#2b2b33"><circle cx="100" cy="184" r="1.9"/><circle cx="100" cy="194" r="1.9"/></g></g>` },
  'ropa:corazones': { cuerpo: `<g>
    <rect x="38" y="150" width="124" height="46" fill="#c9a7e8"/>
    <rect x="38" y="150" width="124" height="12" fill="#b38ad9"/>
    <g fill="#fff" opacity=".9">
      <path d="M76 176c-1.6-2.6-6-1.6-6 1.6 0 3 6 6.6 6 6.6s6-3.6 6-6.6c0-3.2-4.4-4.2-6-1.6z"/>
      <path d="M124 182c-1.6-2.6-6-1.6-6 1.6 0 3 6 6.6 6 6.6s6-3.6 6-6.6c0-3.2-4.4-4.2-6-1.6z"/>
      <path d="M100 170c-1.3-2.1-4.8-1.3-4.8 1.3 0 2.4 4.8 5.3 4.8 5.3s4.8-2.9 4.8-5.3c0-2.6-3.5-3.4-4.8-1.3z"/></g>
    <path d="M80 150 q20 14 40 0" stroke="#9b72c6" stroke-width="3" fill="none"/></g>` },
  'ropa:futbol': { cuerpo: `<g>
    <rect x="38" y="150" width="124" height="46" fill="#d6363b"/>
    <rect x="38" y="150" width="124" height="10" fill="#fff"/>
    <path d="M90 150 l10 10 10 -10" fill="#1f3c88"/>
    <text x="100" y="188" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="20" fill="#fff">10</text></g>` },
};

const ARCOIRIS = ['#f6a6b2', '#f9cf8f', '#f6ec9a', '#b5e3a6', '#a8d3f2', '#c9b3ef'];
let michiUid = 0;

function paletaDe(pelaje) {
  if (pelaje === 'arcoiris') return { cuerpo: 'url(#ARCO)', cabeza: 'url(#ARCO)', oscuro: '#f1b6c9', oreja: '#fde6ee', ojo: '#3d3a33', arcoiris: true };
  const p = PELAJES.find(x => x.id === pelaje) || PELAJES[0];
  return p.c;
}

/* o: { pelaje, ropa, ojos, boca, sucio (0..1), enfermo } */
function michiSVG(o = {}) {
  const P = paletaDe(o.pelaje || 'crema');
  const uid = 'm' + (++michiUid);
  const fill = c => c === 'url(#ARCO)' ? `url(#arco-${uid})` : c;
  const r = ROPA_SVG[o.ropa] || {};
  const ojo = P.ojo;
  const ojos = {
    normal: `<g class="m-ojos"><ellipse cx="79" cy="98" rx="9" ry="12" fill="${ojo}"/><ellipse cx="121" cy="98" rx="9" ry="12" fill="${ojo}"/>
      <circle cx="82" cy="93" r="3" fill="#fff"/><circle cx="124" cy="93" r="3" fill="#fff"/></g>`,
    feliz: `<g stroke="${ojo}" stroke-width="4.5" fill="none" stroke-linecap="round"><path d="M70 101 q9 -13 18 0"/><path d="M112 101 q9 -13 18 0"/></g>`,
    cerrados: `<g stroke="${ojo}" stroke-width="4" fill="none" stroke-linecap="round"><path d="M70 98 q9 8 18 0"/><path d="M112 98 q9 8 18 0"/></g>`,
    cansados: `<g><ellipse cx="79" cy="100" rx="9" ry="9" fill="${ojo}"/><ellipse cx="121" cy="100" rx="9" ry="9" fill="${ojo}"/>
      <path d="M67 86 h24 v12 h-24z M109 86 h24 v12 h-24z" fill="${fill(P.cabeza)}"/>
      <g stroke="${ojo}" stroke-width="3" stroke-linecap="round"><path d="M69 98 h20"/><path d="M111 98 h20"/></g></g>`,
    tristes: `<g class="m-ojos"><ellipse cx="79" cy="100" rx="8.5" ry="11" fill="${ojo}"/><ellipse cx="121" cy="100" rx="8.5" ry="11" fill="${ojo}"/>
      <circle cx="82" cy="96" r="3" fill="#fff"/><circle cx="124" cy="96" r="3" fill="#fff"/></g>
      <g stroke="${ojo}" stroke-width="3" stroke-linecap="round" opacity=".75"><path d="M68 80 l19 5"/><path d="M132 80 l-19 5"/></g>`,
    sorpresa: `<g><circle cx="79" cy="98" r="11" fill="${ojo}"/><circle cx="121" cy="98" r="11" fill="${ojo}"/>
      <circle cx="83" cy="93" r="3.6" fill="#fff"/><circle cx="125" cy="93" r="3.6" fill="#fff"/></g>`,
  }[o.ojos || 'normal'];
  const boca = {
    sonrisa: `<path d="M100 115 q-7 8 -15 4 M100 115 q7 8 15 4" stroke="#b9985a" stroke-width="2.4" fill="none" stroke-linecap="round"/>`,
    lengua: `<path d="M100 115 q-7 8 -15 4 M100 115 q7 8 15 4" stroke="#b9985a" stroke-width="2.4" fill="none" stroke-linecap="round"/>
      <path d="M95 119 q5 9 10 0z" fill="#ef8fa6"/>`,
    abierta: `<ellipse cx="100" cy="124" rx="11" ry="10" fill="#7a3b46"/><ellipse cx="100" cy="129" rx="7" ry="4.5" fill="#ef8fa6"/>`,
    masca: `<path d="M88 121 q12 7 24 0" stroke="#b9985a" stroke-width="3" fill="none" stroke-linecap="round"/>`,
    triste: `<path d="M88 125 q12 -8 24 0" stroke="#b9985a" stroke-width="2.4" fill="none" stroke-linecap="round"/>`,
    o: `<ellipse cx="100" cy="123" rx="6" ry="7" fill="#7a3b46"/>`,
  }[o.boca || 'sonrisa'];
  const sucio = Math.max(0, Math.min(1, o.sucio || 0));
  const manchas = sucio > 0.05 ? `<g fill="#8b6a4a" opacity="${(0.25 + sucio * 0.55).toFixed(2)}">
      <ellipse cx="76" cy="168" rx="9" ry="6"/><ellipse cx="128" cy="180" rx="7" ry="5"/><ellipse cx="104" cy="194" rx="6" ry="4"/>
      <ellipse cx="62" cy="88" rx="6" ry="4"/><ellipse cx="140" cy="76" rx="5" ry="4"/></g>` : '';
  const mejillas = o.enfermo ? '#b9dc9c' : '#f4c9d2';
  const defsArco = P.arcoiris ? `<linearGradient id="arco-${uid}" x1="0" y1="0" x2="1" y2="1">${ARCOIRIS.map((c, i) => `<stop offset="${(i / (ARCOIRIS.length - 1)).toFixed(2)}" stop-color="${c}"/>`).join('')}</linearGradient>` : '';
  return `<svg viewBox="0 0 200 210" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Michi">
    <defs><clipPath id="c-${uid}"><ellipse cx="100" cy="170" rx="52" ry="38"/></clipPath>${defsArco}</defs>
    <g class="m-cola"><path d="M150 176 q42 -6 36 -50 q-3 -22 -22 -20 q14 6 12 24 q-2 28 -36 32 z" fill="${fill(P.oscuro)}"/></g>
    ${r.atras || ''}
    <g class="m-cuerpo">
      <ellipse cx="100" cy="170" rx="52" ry="38" fill="${fill(P.cuerpo)}"/>
      <ellipse cx="78" cy="198" rx="15" ry="10" fill="${fill(P.cabeza)}"/>
      <ellipse cx="122" cy="198" rx="15" ry="10" fill="${fill(P.cabeza)}"/>
      ${r.cuerpo ? `<g clip-path="url(#c-${uid})">${r.cuerpo}</g>` : ''}
      ${r.suelto || ''}
    </g>
    <g class="m-cabeza">
      <path d="M55 72 L48 30 L90 58 Z" fill="${fill(P.cuerpo)}"/>
      <path d="M145 72 L152 30 L110 58 Z" fill="${fill(P.cuerpo)}"/>
      <path d="M60 64 L56 42 L80 57 Z" fill="${P.oreja}"/>
      <path d="M140 64 L144 42 L120 57 Z" fill="${P.oreja}"/>
      <ellipse cx="100" cy="100" rx="62" ry="54" fill="${fill(P.cabeza)}"/>
      <path d="M100 48 q-6 12 0 22 q6 -10 0 -22z" fill="${fill(P.oscuro)}"/>
      <path d="M76 54 q-3 12 3 21 q3 -12 -3 -21z" fill="${fill(P.oscuro)}"/>
      <path d="M124 54 q3 12 -3 21 q-3 -12 3 -21z" fill="${fill(P.oscuro)}"/>
      <circle cx="64" cy="113" r="11" fill="${mejillas}" opacity=".8"/>
      <circle cx="136" cy="113" r="11" fill="${mejillas}" opacity=".8"/>
      ${ojos}
      <path d="M96 110 h8 l-4 5 z" fill="#c98e9b"/>
      ${boca}
      <path d="M40 102 h26 M40 112 h24 M134 102 h26 M136 112 h24" stroke="${o.pelaje === 'negro' ? '#8c8585' : '#d8c08f'}" stroke-width="2" stroke-linecap="round"/>
      ${o.enfermo ? `<path d="M150 74 q-5 9 0 13 q5 -4 0 -13z" fill="#9fd3ef"/>` : ''}
    </g>
    ${manchas}
  </svg>`;
}

/* HTML de Michi: SVG + sombrero y accesorio (emoji) encima. */
function michiHTML(o = {}) {
  let acc = '';
  for (const id of [o.sombrero, o.accesorio]) {
    const c = id && ROPA.find(x => x.id === id);
    if (c) acc += `<span class="acc ${c.donde}">${c.emoji}</span>`;
  }
  return michiSVG(o) + acc;
}

/* Imagen de Michi para los minijuegos (canvas). */
function michiImagen(o = {}) {
  return new Promise(ok => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = () => ok(null);
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(michiSVG(o));
  });
}
