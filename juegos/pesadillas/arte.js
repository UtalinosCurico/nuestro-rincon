/* ============================================================
   ARTE — todo se dibuja con SVG propio (sin imágenes) y se pasa
   a lienzos chicos una vez por tamaño de baldosa. Michi sale de
   michiSVG() de la casita, con su pelaje y su ropa de verdad.
   ============================================================ */
const TINTA = '#3d2f3a';
const st = (w = 4) => `stroke="${TINTA}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
const svgDe = (cuerpo, vb = 100) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vb} ${vb}">${cuerpo}</svg>`;
const ojosSimples = (x1, x2, y, r = 4.5) => `<circle cx="${x1}" cy="${y}" r="${r}" fill="#2b2230"/><circle cx="${x2}" cy="${y}" r="${r}" fill="#2b2230"/><circle cx="${x1 + r * .35}" cy="${y - r * .35}" r="${r * .35}" fill="#fff"/><circle cx="${x2 + r * .35}" cy="${y - r * .35}" r="${r * .35}" fill="#fff"/>`;
const cejas = (x1, x2, y) => `<path d="M${x1 - 7} ${y - 4} l12 5 M${x2 + 7} ${y - 4} l-12 5" ${st(3.5)}/>`;
function puntas(cx, cy, r1, r2, n) {
  let d = '';
  for (let i = 0; i < n * 2; i++) {
    const a = i * Math.PI / n - Math.PI / 2, r = i % 2 ? r2 : r1;
    d += (i ? 'L' : 'M') + (cx + Math.cos(a) * r).toFixed(1) + ' ' + (cy + Math.sin(a) * r).toFixed(1) + ' ';
  }
  return d + 'Z';
}

/* ---------- enemigos (100×100) ---------- */
const SVG_ENEMIGOS = {
  raton: `<path d="M74 74 Q96 70 92 50" ${st(5)} fill="none"/>
    <ellipse cx="50" cy="70" rx="28" ry="20" fill="#aaa4b1" ${st()}/>
    <circle cx="28" cy="34" r="13" fill="#aaa4b1" ${st()}/><circle cx="28" cy="34" r="6.5" fill="#f3a9bd"/>
    <circle cx="72" cy="34" r="13" fill="#aaa4b1" ${st()}/><circle cx="72" cy="34" r="6.5" fill="#f3a9bd"/>
    <ellipse cx="50" cy="50" rx="24" ry="20" fill="#bdb7c4" ${st()}/>
    ${ojosSimples(41, 59, 47)}<circle cx="50" cy="58" r="4" fill="#f28ca5"/>
    <path d="M34 59 h-12 M34 64 h-11 M66 59 h12 M66 64 h11" ${st(1.8)}/>`,
  ratonGordo: `<path d="M80 76 Q100 72 96 50" ${st(6)} fill="none"/>
    <ellipse cx="50" cy="68" rx="38" ry="27" fill="#9b94a3" ${st()}/>
    <circle cx="26" cy="30" r="14" fill="#9b94a3" ${st()}/><circle cx="26" cy="30" r="7" fill="#f3a9bd"/>
    <circle cx="74" cy="30" r="14" fill="#9b94a3" ${st()}/><circle cx="74" cy="30" r="7" fill="#f3a9bd"/>
    <ellipse cx="50" cy="46" rx="25" ry="20" fill="#b2abb9" ${st()}/>
    ${ojosSimples(41, 59, 43)}<circle cx="50" cy="54" r="4.5" fill="#f28ca5"/>
    <ellipse cx="50" cy="76" rx="20" ry="11" fill="#c8c1ce"/>`,
  mosca: `<ellipse cx="30" cy="38" rx="19" ry="12" fill="#e9f3ff" fill-opacity=".85" ${st(3)} transform="rotate(-25 30 38)"/>
    <ellipse cx="70" cy="38" rx="19" ry="12" fill="#e9f3ff" fill-opacity=".85" ${st(3)} transform="rotate(25 70 38)"/>
    <circle cx="50" cy="58" r="22" fill="#4b4453" ${st()}/>
    <circle cx="41" cy="54" r="7.5" fill="#e2554f"/><circle cx="59" cy="54" r="7.5" fill="#e2554f"/>
    <circle cx="43" cy="51" r="2.4" fill="#fff"/><circle cx="61" cy="51" r="2.4" fill="#fff"/>`,
  cucaracha: `<g ${st(4)} fill="none"><path d="M30 50 L12 40 M30 62 L10 64 M32 74 L16 88 M70 50 L88 40 M70 62 L90 64 M68 74 L84 88"/>
    <path d="M44 26 Q36 8 24 6 M56 26 Q64 8 76 6" stroke-width="3"/></g>
    <ellipse cx="50" cy="60" rx="22" ry="30" fill="#8a5a3c" ${st()}/><path d="M50 36 V88" stroke="#6b4329" stroke-width="3"/>
    <ellipse cx="50" cy="32" rx="15" ry="11" fill="#6b4329" ${st()}/>
    <circle cx="44" cy="30" r="4" fill="#fff"/><circle cx="56" cy="30" r="4" fill="#fff"/><circle cx="44" cy="31" r="2" fill="#2b2230"/><circle cx="56" cy="31" r="2" fill="#2b2230"/>`,
  tetera: `<path d="M76 56 Q96 48 92 30" stroke="${TINTA}" stroke-width="12" fill="none" stroke-linecap="round"/>
    <path d="M76 56 Q96 48 92 30" stroke="#efe3d3" stroke-width="6" fill="none" stroke-linecap="round"/>
    <path d="M24 52 Q8 52 10 66 Q12 76 26 74" ${st(5)} fill="none"/>
    <ellipse cx="50" cy="64" rx="30" ry="25" fill="#efe3d3" ${st()}/>
    <path d="M30 42 Q50 28 70 42 Z" fill="#d97a6c" ${st()}/><circle cx="50" cy="31" r="5" fill="#d97a6c" ${st(3)}/>
    <path d="M26 70 Q50 80 74 70" stroke="#d97a6c" stroke-width="5" fill="none"/>
    ${cejas(42, 58, 56)}<circle cx="42" cy="60" r="4" fill="#2b2230"/><circle cx="58" cy="60" r="4" fill="#2b2230"/>`,
  gota: `<path d="M50 8 C62 30 82 46 82 66 A32 32 0 0 1 18 66 C18 46 38 30 50 8 Z" fill="#7cc4ea" ${st()}/>
    <ellipse cx="36" cy="54" rx="6" ry="11" fill="#fff" opacity=".6"/>
    ${ojosSimples(42, 58, 66)}<path d="M44 78 q6 5 12 0" ${st(3)} fill="none"/>`,
  burbuja: `<circle cx="50" cy="52" r="36" fill="#cfeefb" fill-opacity=".55" stroke="#6fb0cf" stroke-width="4"/>
    <path d="M28 38 q8 -14 24 -14" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round"/>
    ${ojosSimples(42, 58, 56, 4)}<path d="M45 67 q5 4 10 0" ${st(2.5)} fill="none"/>`,
  patito: `<ellipse cx="56" cy="70" rx="34" ry="21" fill="#f6d34f" ${st()}/>
    <path d="M72 62 q12 -4 16 6" stroke="#e2b336" stroke-width="5" fill="none" stroke-linecap="round"/>
    <circle cx="40" cy="42" r="21" fill="#f8dc63" ${st()}/>
    <path d="M20 44 q-14 2 -13 9 q9 4 17 0 z" fill="#f08a3c" ${st(3)}/>
    <circle cx="35" cy="37" r="4.5" fill="#2b2230"/><circle cx="36.5" cy="35.5" r="1.5" fill="#fff"/><circle cx="46" cy="47" r="4" fill="#f7a7a0"/>`,
  arana: `<g ${st(4)} fill="none"><path d="M36 52 Q18 36 8 44 M36 58 Q16 56 6 66 M38 64 Q22 76 14 88 M40 68 Q34 84 30 94"/>
    <path d="M64 52 Q82 36 92 44 M64 58 Q84 56 94 66 M62 64 Q78 76 86 88 M60 68 Q66 84 70 94"/></g>
    <circle cx="50" cy="58" r="21" fill="#3a3440" ${st()}/>
    <circle cx="43" cy="54" r="6" fill="#fff"/><circle cx="57" cy="54" r="6" fill="#fff"/><circle cx="43" cy="55.5" r="3" fill="#2b2230"/><circle cx="57" cy="55.5" r="3" fill="#2b2230"/>`,
  pelusa: `<path d="${puntas(50, 54, 40, 28, 14)}" fill="#c9c4cf" ${st(3)}/>
    <circle cx="50" cy="54" r="26" fill="#d6d2db"/>
    <circle cx="41" cy="51" r="8" fill="#fff" ${st(2.5)}/><circle cx="59" cy="51" r="8" fill="#fff" ${st(2.5)}/>
    <circle cx="42" cy="53" r="4" fill="#2b2230"/><circle cx="58" cy="53" r="4" fill="#2b2230"/>`,
  soldadito: `<path d="M68 62 h14 M82 54 v16" stroke="#c9a14a" stroke-width="5" stroke-linecap="round"/>
    <rect x="36" y="4" width="28" height="28" rx="6" fill="#2b2a4a" ${st()}/><rect x="36" y="24" width="28" height="5" fill="#f4d36b"/>
    <circle cx="50" cy="40" r="14" fill="#f4d3b4" ${st()}/>
    <rect x="31" y="52" width="38" height="30" rx="7" fill="#d65a5a" ${st()}/><path d="M50 55 V80" stroke="#f4d36b" stroke-width="3" stroke-dasharray="3 5"/>
    <rect x="35" y="80" width="12" height="15" rx="3" fill="#2b2a4a" ${st(3)}/><rect x="53" y="80" width="12" height="15" rx="3" fill="#2b2a4a" ${st(3)}/>
    <circle cx="45" cy="40" r="2.6" fill="#2b2230"/><circle cx="55" cy="40" r="2.6" fill="#2b2230"/><circle cx="42" cy="45" r="3" fill="#f29a9a"/><circle cx="58" cy="45" r="3" fill="#f29a9a"/>`,
  polilla: `<path d="M50 48 Q18 14 8 44 Q16 64 50 54 Z" fill="#e7dbbd" ${st(3)}/><path d="M50 48 Q82 14 92 44 Q84 64 50 54 Z" fill="#e7dbbd" ${st(3)}/>
    <path d="M50 56 Q26 64 24 82 Q40 84 50 62 Z" fill="#d8c9a6" ${st(3)}/><path d="M50 56 Q74 64 76 82 Q60 84 50 62 Z" fill="#d8c9a6" ${st(3)}/>
    <circle cx="28" cy="40" r="6" fill="#b79a6b"/><circle cx="72" cy="40" r="6" fill="#b79a6b"/>
    <ellipse cx="50" cy="56" rx="9" ry="20" fill="#a88b62" ${st(3)}/><path d="M46 38 Q40 24 34 22 M54 38 Q60 24 66 22" ${st(2.5)} fill="none"/>
    <circle cx="46" cy="44" r="2.6" fill="#2b2230"/><circle cx="54" cy="44" r="2.6" fill="#2b2230"/>`,
  libro: `<path d="M50 30 Q30 18 8 24 V78 Q30 72 50 82 Z" fill="#6c51a3" ${st()}/><path d="M50 30 Q70 18 92 24 V78 Q70 72 50 82 Z" fill="#8166b8" ${st()}/>
    <path d="M50 34 Q34 26 15 30 V72 Q34 67 50 76 Z" fill="#f6f1e4"/><path d="M50 34 Q66 26 85 30 V72 Q66 67 50 76 Z" fill="#fbf7ec"/>
    <path d="M22 62 h18 M22 68 h14 M60 62 h18 M64 68 h14" stroke="#c9bfa8" stroke-width="2.5"/>
    ${cejas(33, 67, 44)}<circle cx="33" cy="49" r="5" fill="#2b2230"/><circle cx="67" cy="49" r="5" fill="#2b2230"/>`,
  pepino: `<ellipse cx="50" cy="56" rx="21" ry="38" fill="#6fb35e" ${st()}/>
    <g fill="#4f9441"><circle cx="40" cy="30" r="2.5"/><circle cx="60" cy="74" r="2.5"/><circle cx="38" cy="72" r="2.5"/><circle cx="62" cy="34" r="2.5"/><circle cx="50" cy="84" r="2.5"/></g>
    ${cejas(43, 57, 44)}<circle cx="43" cy="49" r="4.5" fill="#2b2230"/><circle cx="57" cy="49" r="4.5" fill="#2b2230"/>
    <path d="M40 62 l5 4 l5 -4 l5 4 l5 -4" ${st(3)} fill="none"/>`,
  pepinoOculto: `<ellipse cx="50" cy="76" rx="32" ry="13" fill="#6f5235" ${st(3)}/><ellipse cx="50" cy="73" rx="24" ry="8" fill="#80603f"/>
    <path d="M43 70 q7 -20 14 0" fill="#6fb35e" ${st(3)}/>`,
  sapo: `<ellipse cx="50" cy="66" rx="35" ry="25" fill="#5fae5a" ${st()}/><ellipse cx="50" cy="76" rx="20" ry="9" fill="#a9d68f"/>
    <circle cx="31" cy="40" r="13" fill="#5fae5a" ${st()}/><circle cx="69" cy="40" r="13" fill="#5fae5a" ${st()}/>
    <circle cx="31" cy="40" r="6.5" fill="#2b2230"/><circle cx="69" cy="40" r="6.5" fill="#2b2230"/><circle cx="33" cy="38" r="2.2" fill="#fff"/><circle cx="71" cy="38" r="2.2" fill="#fff"/>
    <path d="M30 64 Q50 78 70 64" ${st(3)} fill="none"/>`,
  perrito: `<ellipse cx="50" cy="72" rx="27" ry="20" fill="#b98552" ${st()}/>
    <circle cx="50" cy="44" r="23" fill="#c99560" ${st()}/>
    <path d="M30 28 Q14 44 24 62 Q34 52 35 36 Z" fill="#8a5e37" ${st()}/><path d="M70 28 Q86 44 76 62 Q66 52 65 36 Z" fill="#8a5e37" ${st()}/>
    <ellipse cx="50" cy="54" rx="11" ry="8" fill="#f1dcc0"/><circle cx="50" cy="50" r="4.5" fill="#2b2230"/>
    ${cejas(41, 59, 38)}<circle cx="41" cy="42" r="3.6" fill="#2b2230"/><circle cx="59" cy="42" r="3.6" fill="#2b2230"/>
    <rect x="34" y="62" width="32" height="7" rx="3" fill="#e2554f"/>`,
  murcielago: `<path d="M50 50 L8 28 Q16 44 6 58 Q22 56 26 68 Q34 58 50 62 Z" fill="#6a4f8f" ${st()}/>
    <path d="M50 50 L92 28 Q84 44 94 58 Q78 56 74 68 Q66 58 50 62 Z" fill="#6a4f8f" ${st()}/>
    <path d="M40 42 L36 24 L48 38 Z M60 42 L64 24 L52 38 Z" fill="#7d61a3" ${st(3)}/>
    <circle cx="50" cy="52" r="15" fill="#7d61a3" ${st()}/>
    <circle cx="44" cy="50" r="3.6" fill="#ffe27a"/><circle cx="56" cy="50" r="3.6" fill="#ffe27a"/>
    <path d="M45 59 l2 4 l2 -4 M51 59 l2 4 l2 -4" fill="#fff" ${st(1.5)}/>`,
  babosa: `<path d="M10 80 Q12 58 40 56 Q70 52 86 64 Q94 76 80 82 Z" fill="#c3d36a" ${st()}/>
    <path d="M22 76 Q44 70 74 74" stroke="#a6b752" stroke-width="3" fill="none"/>
    <path d="M70 58 L74 34 M80 60 L88 38" ${st(4)}/>
    <circle cx="74" cy="32" r="6.5" fill="#fff" ${st(2.5)}/><circle cx="88" cy="36" r="6.5" fill="#fff" ${st(2.5)}/>
    <circle cx="75" cy="33" r="3" fill="#2b2230"/><circle cx="89" cy="37" r="3" fill="#2b2230"/>`,
  fantasma: `<path d="M20 88 V48 A30 30 0 0 1 80 48 V88 L70 79 L60 89 L50 79 L40 89 L30 79 Z" fill="#f3f1f6" ${st()}/>
    <ellipse cx="39" cy="48" rx="5.5" ry="8.5" fill="#2b2230"/><ellipse cx="61" cy="48" rx="5.5" ry="8.5" fill="#2b2230"/>
    <ellipse cx="50" cy="65" rx="6" ry="7.5" fill="#2b2230"/><circle cx="30" cy="58" r="4" fill="#f4c6d4"/><circle cx="70" cy="58" r="4" fill="#f4c6d4"/>`,
  buho: `<path d="M22 30 L30 10 L40 28 Z M78 30 L70 10 L60 28 Z" fill="#a07a52" ${st()}/>
    <ellipse cx="50" cy="58" rx="31" ry="35" fill="#a07a52" ${st()}/><ellipse cx="50" cy="68" rx="19" ry="21" fill="#dcc29b"/>
    <path d="M38 64 q4 4 8 0 M54 64 q4 4 8 0 M44 74 q4 4 8 0" stroke="#b39066" stroke-width="2.5" fill="none"/>
    <circle cx="37" cy="44" r="13" fill="#fff4c9" ${st()}/><circle cx="63" cy="44" r="13" fill="#fff4c9" ${st()}/>
    <circle cx="37" cy="45" r="6.5" fill="#2b2230"/><circle cx="63" cy="45" r="6.5" fill="#2b2230"/><circle cx="39" cy="43" r="2.2" fill="#fff"/><circle cx="65" cy="43" r="2.2" fill="#fff"/>
    <path d="M45 53 L50 62 L55 53 Z" fill="#f0a13c" ${st(3)}/>`,
  gatoNegro: `<path d="M76 74 Q98 66 90 44" stroke="#1e1b24" stroke-width="8" fill="none" stroke-linecap="round"/>
    <ellipse cx="50" cy="72" rx="28" ry="19" fill="#3b3743" stroke="#1e1b24" stroke-width="4"/>
    <path d="M27 40 L22 12 L44 28 Z M73 40 L78 12 L56 28 Z" fill="#3b3743" stroke="#1e1b24" stroke-width="4" stroke-linejoin="round"/>
    <ellipse cx="50" cy="45" rx="28" ry="23" fill="#46404f" stroke="#1e1b24" stroke-width="4"/>
    <ellipse cx="40" cy="45" rx="6.5" ry="7.5" fill="#f2d14c"/><ellipse cx="60" cy="45" rx="6.5" ry="7.5" fill="#f2d14c"/>
    <ellipse cx="40" cy="45" rx="2" ry="6" fill="#1e1b24"/><ellipse cx="60" cy="45" rx="2" ry="6" fill="#1e1b24"/>
    <path d="M46 56 l4 3 l4 -3" stroke="#e7a3b4" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
  clonSombra: `<ellipse cx="50" cy="72" rx="28" ry="19" fill="#3b2d5c" fill-opacity=".85"/>
    <path d="M27 40 L22 12 L44 28 Z M73 40 L78 12 L56 28 Z" fill="#45346b"/>
    <ellipse cx="50" cy="45" rx="28" ry="23" fill="#4a3972"/>
    <ellipse cx="40" cy="45" rx="7" ry="7" fill="#d7b8ff"/><ellipse cx="60" cy="45" rx="7" ry="7" fill="#d7b8ff"/>
    <circle cx="40" cy="45" r="2.5" fill="#fff"/><circle cx="60" cy="45" r="2.5" fill="#fff"/>`,
};
SVG_ENEMIGOS.gotita = SVG_ENEMIGOS.gota;

/* ---------- jefes (200×200) ---------- */
const SVG_JEFES = {
  reyRaton: `<path d="M44 118 Q18 182 62 192 H138 Q182 182 156 118 Z" fill="#b8324b" ${st(6)}/>
    <path d="M60 130 Q100 150 140 130" stroke="#f4c64e" stroke-width="6" fill="none"/>
    <ellipse cx="100" cy="142" rx="54" ry="42" fill="#9f99a7" ${st(6)}/>
    <circle cx="52" cy="58" r="27" fill="#9f99a7" ${st(6)}/><circle cx="52" cy="58" r="14" fill="#f3a9bd"/>
    <circle cx="148" cy="58" r="27" fill="#9f99a7" ${st(6)}/><circle cx="148" cy="58" r="14" fill="#f3a9bd"/>
    <ellipse cx="100" cy="94" rx="52" ry="42" fill="#b3adbb" ${st(6)}/>
    <path d="M66 56 L72 20 L88 40 L100 12 L112 40 L128 20 L134 56 Z" fill="#f4c64e" ${st(6)}/>
    <circle cx="100" cy="40" r="6" fill="#e2554f"/><circle cx="80" cy="46" r="4" fill="#5ab0d6"/><circle cx="120" cy="46" r="4" fill="#5ab0d6"/>
    <path d="M66 78 l22 9 M134 78 l-22 9" ${st(7)}/>
    <circle cx="80" cy="92" r="8" fill="#2b2230"/><circle cx="120" cy="92" r="8" fill="#2b2230"/><circle cx="82" cy="89" r="2.6" fill="#fff"/><circle cx="122" cy="89" r="2.6" fill="#fff"/>
    <circle cx="100" cy="110" r="8" fill="#f28ca5" ${st(4)}/>
    <rect x="90" y="120" width="9" height="13" rx="2" fill="#fff" ${st(3)}/><rect x="101" y="120" width="9" height="13" rx="2" fill="#fff" ${st(3)}/>
    <path d="M70 112 h-26 M70 120 h-24 M130 112 h26 M130 120 h24" ${st(3)}/>`,
  tina: `<circle cx="42" cy="176" r="12" fill="#f4c64e" ${st(5)}/><circle cx="158" cy="176" r="12" fill="#f4c64e" ${st(5)}/>
    <path d="M18 88 H182 Q178 160 130 170 H70 Q22 160 18 88 Z" fill="#f4f6fa" ${st(6)}/>
    <rect x="10" y="74" width="180" height="20" rx="10" fill="#ffffff" ${st(6)}/>
    <g fill="#e3f3fb" stroke="#9fd0e6" stroke-width="3"><circle cx="46" cy="66" r="14"/><circle cx="72" cy="58" r="17"/><circle cx="100" cy="64" r="15"/><circle cx="128" cy="56" r="18"/><circle cx="154" cy="66" r="13"/></g>
    <path d="M60 112 l26 10 M140 112 l-26 10" ${st(7)}/>
    <circle cx="76" cy="128" r="10" fill="#2b2230"/><circle cx="124" cy="128" r="10" fill="#2b2230"/><circle cx="79" cy="124" r="3.4" fill="#fff"/><circle cx="127" cy="124" r="3.4" fill="#fff"/>
    <path d="M84 150 Q100 140 116 150" ${st(5)} fill="none"/>`,
  aspiradora: `<path d="M150 96 Q194 86 188 44 Q182 18 152 24" stroke="${TINTA}" stroke-width="22" fill="none" stroke-linecap="round"/>
    <path d="M150 96 Q194 86 188 44 Q182 18 152 24" stroke="#8f8a96" stroke-width="12" fill="none" stroke-linecap="round" stroke-dasharray="6 6"/>
    <rect x="120" y="10" width="40" height="22" rx="8" fill="#5b5662" ${st(5)}/>
    <rect x="34" y="66" width="128" height="96" rx="44" fill="#e2554f" ${st(6)}/>
    <rect x="52" y="52" width="92" height="30" rx="14" fill="#f07a72" ${st(6)}/>
    <circle cx="60" cy="168" r="14" fill="#4b4453" ${st(5)}/><circle cx="140" cy="168" r="14" fill="#4b4453" ${st(5)}/>
    <path d="M62 98 l22 8 M138 98 l-22 8" ${st(7)}/>
    <circle cx="78" cy="112" r="10" fill="#fff" ${st(4)}/><circle cx="122" cy="112" r="10" fill="#fff" ${st(4)}/>
    <circle cx="80" cy="114" r="5" fill="#2b2230"/><circle cx="124" cy="114" r="5" fill="#2b2230"/>
    <rect x="74" y="132" width="52" height="18" rx="9" fill="#3a3440" ${st(4)}/><path d="M84 136 v10 M94 136 v10 M104 136 v10 M114 136 v10" stroke="#6b6474" stroke-width="3"/>`,
  perro: `<ellipse cx="100" cy="146" rx="58" ry="42" fill="#a8754a" ${st(6)}/>
    <circle cx="100" cy="88" r="50" fill="#bd8a58" ${st(6)}/>
    <path d="M56 50 Q24 82 44 124 Q62 104 64 72 Z" fill="#7e5332" ${st(6)}/><path d="M144 50 Q176 82 156 124 Q138 104 136 72 Z" fill="#7e5332" ${st(6)}/>
    <ellipse cx="100" cy="112" rx="26" ry="18" fill="#f1dcc0" ${st(4)}/><ellipse cx="100" cy="102" rx="11" ry="8" fill="#2b2230"/>
    <path d="M90 126 Q100 134 110 126" ${st(4)} fill="none"/>
    <path d="M62 66 l24 10 M138 66 l-24 10" ${st(7)}/>
    <circle cx="78" cy="82" r="8" fill="#2b2230"/><circle cx="122" cy="82" r="8" fill="#2b2230"/><circle cx="80" cy="79" r="2.6" fill="#fff"/><circle cx="124" cy="79" r="2.6" fill="#fff"/>
    <rect x="58" y="134" width="84" height="16" rx="7" fill="#3a3440" ${st(5)}/>
    <g fill="#d9d4de" ${st(3)}><path d="M70 134 l6 -12 l6 12 Z"/><path d="M94 134 l6 -12 l6 12 Z"/><path d="M118 134 l6 -12 l6 12 Z"/></g>
    <circle cx="100" cy="158" r="9" fill="#f4c64e" ${st(4)}/>`,
  gatoSombra: `<g opacity=".95"><path d="M150 168 Q196 150 184 96 Q178 72 160 76" stroke="#1d1530" stroke-width="16" fill="none" stroke-linecap="round"/>
    <ellipse cx="100" cy="150" rx="58" ry="40" fill="#2a2140"/>
    <path d="M52 86 L40 24 L88 58 Z M148 86 L160 24 L112 58 Z" fill="#2a2140"/>
    <ellipse cx="100" cy="94" rx="58" ry="48" fill="#33284f"/>
    <path d="M44 180 q10 -14 20 0 q10 -14 20 0 q10 -14 20 0 q10 -14 20 0 q10 -14 20 0 q10 -14 20 0" fill="none" stroke="#2a2140" stroke-width="10"/></g>
    <circle cx="76" cy="92" r="20" fill="#7d57d6" opacity=".35"/><circle cx="124" cy="92" r="20" fill="#7d57d6" opacity=".35"/>
    <ellipse cx="76" cy="92" rx="13" ry="14" fill="#d7b8ff"/><ellipse cx="124" cy="92" rx="13" ry="14" fill="#d7b8ff"/>
    <ellipse cx="76" cy="92" rx="3.5" ry="12" fill="#1d1530"/><ellipse cx="124" cy="92" rx="3.5" ry="12" fill="#1d1530"/>
    <path d="M88 122 l12 8 l12 -8" stroke="#b08ae8" stroke-width="5" fill="none" stroke-linecap="round"/>`,
};

/* ---------- cosas del suelo (100×100) ---------- */
const CORAZON_D = 'M50 84 C20 62 8 46 14 30 C20 16 40 14 50 30 C60 14 80 16 86 30 C92 46 80 62 50 84 Z';
const SVG_COSAS = {
  corazon: `<path d="${CORAZON_D}" fill="#ef4f6c" ${st(5)}/><ellipse cx="31" cy="33" rx="7" ry="5" fill="#fff" opacity=".6"/>`,
  medio: `<path d="M50 84 C20 62 8 46 14 30 C20 16 40 14 50 30 Z" fill="#ef4f6c"/><path d="${CORAZON_D}" fill="none" ${st(5)}/><ellipse cx="31" cy="33" rx="7" ry="5" fill="#fff" opacity=".6"/>`,
  sueno: `<defs><linearGradient id="gs" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b9c8ff"/><stop offset="1" stop-color="#8a74e6"/></linearGradient></defs>
    <path d="${CORAZON_D}" fill="url(#gs)" ${st(5)}/><path d="${puntas(50, 46, 12, 5, 5)}" fill="#fffbe0"/>`,
  moneda: `<circle cx="50" cy="50" r="32" fill="#f4c64e" stroke="#9a6c17" stroke-width="5"/><circle cx="50" cy="50" r="22" fill="none" stroke="#e0a92e" stroke-width="3"/>
    <g fill="#c98a1b"><ellipse cx="50" cy="56" rx="9" ry="7"/><circle cx="38" cy="44" r="4"/><circle cx="46" cy="39" r="4"/><circle cx="54" cy="39" r="4"/><circle cx="62" cy="44" r="4"/></g>`,
  moneda5: `<g stroke="#9a6c17" stroke-width="4"><ellipse cx="50" cy="74" rx="30" ry="12" fill="#e0a92e"/><ellipse cx="50" cy="64" rx="30" ry="12" fill="#eab43b"/><ellipse cx="50" cy="54" rx="30" ry="12" fill="#f4c64e"/></g>
    <circle cx="50" cy="38" r="22" fill="#f8d36a" stroke="#9a6c17" stroke-width="4"/><text x="50" y="47" text-anchor="middle" font-family="Arial Black, Arial" font-weight="900" font-size="26" fill="#9a6c17">5</text>`,
  llave: `<g stroke="${TINTA}" stroke-width="15" stroke-linecap="round" fill="none"><circle cx="32" cy="38" r="15"/><path d="M44 48 L84 78 M70 68 L78 58 M80 76 L88 66"/></g>
    <g stroke="#f4c64e" stroke-width="8" stroke-linecap="round" fill="none"><circle cx="32" cy="38" r="15"/><path d="M44 48 L84 78 M70 68 L78 58 M80 76 L88 66"/></g>`,
  petardo: `<path d="M50 32 Q50 16 64 12" ${st(4)} fill="none"/><circle cx="66" cy="11" r="5" fill="#ffb347"/>
    <rect x="32" y="32" width="36" height="54" rx="9" fill="#e2554f" ${st(5)}/><path d="M36 46 H64 M36 58 H64 M36 70 H64" stroke="#f6cf5a" stroke-width="4"/>`,
  cofre: `<rect x="16" y="46" width="68" height="42" rx="6" fill="#ec7fa9" ${st(5)}/><rect x="10" y="32" width="80" height="18" rx="5" fill="#f39cbd" ${st(5)}/>
    <rect x="44" y="32" width="12" height="56" fill="#f6cf5a"/><path d="M50 32 Q30 8 24 24 Q28 34 50 32 Q72 8 76 24 Q72 34 50 32" fill="#f6cf5a" ${st(4)}/>`,
  cofreAbierto: `<rect x="16" y="46" width="68" height="42" rx="6" fill="#ec7fa9" ${st(5)}/><rect x="44" y="46" width="12" height="42" fill="#f6cf5a"/>
    <rect x="22" y="18" width="80" height="18" rx="5" fill="#f39cbd" ${st(5)} transform="rotate(-24 22 36)"/><ellipse cx="50" cy="48" rx="30" ry="5" fill="#b65c84"/>`,
  cofreDorado: `<rect x="16" y="46" width="68" height="42" rx="6" fill="#f4c64e" ${st(5)}/><rect x="10" y="32" width="80" height="18" rx="5" fill="#f8d76e" ${st(5)}/>
    <rect x="44" y="32" width="12" height="56" fill="#e2554f"/><rect x="38" y="56" width="24" height="20" rx="4" fill="#8c8a94" ${st(4)}/><path d="M43 56 V50 a7 7 0 0 1 14 0 V56" ${st(4)} fill="none"/>`,
  pedestal: `<ellipse cx="50" cy="74" rx="42" ry="16" fill="#6f4c8f" ${st(5)}/><ellipse cx="50" cy="66" rx="40" ry="15" fill="#9a6fc0" ${st(5)}/>
    <ellipse cx="44" cy="62" rx="20" ry="5" fill="#b590d6"/><circle cx="12" cy="72" r="5" fill="#f4c64e"/><circle cx="88" cy="72" r="5" fill="#f4c64e"/>`,
  trampilla: `<ellipse cx="50" cy="56" rx="42" ry="32" fill="#1b1430" ${st(5)}/>
    <path d="M50 56 m-26 0 a26 18 0 1 1 52 0 a20 14 0 1 1 -40 0 a14 10 0 1 1 28 0 a8 6 0 1 1 -16 0" stroke="#b78cff" stroke-width="4" fill="none"/>
    <path d="${puntas(78, 26, 8, 3, 4)}" fill="#ffe7a3"/><path d="${puntas(22, 34, 6, 2.4, 4)}" fill="#ffe7a3"/>`,
  camita: `<ellipse cx="50" cy="68" rx="45" ry="23" fill="#7fb3d5" ${st(5)}/><ellipse cx="50" cy="64" rx="33" ry="14" fill="#d6ebf8"/>
    <ellipse cx="34" cy="58" rx="14" ry="8" fill="#fff" ${st(3)}/><path d="M60 58 q6 -6 12 0 q6 -6 12 0" stroke="#7fb3d5" stroke-width="3" fill="none"/>`,
  mapache: `<rect x="10" y="62" width="80" height="34" rx="6" fill="#b98a5d" ${st(5)}/><rect x="10" y="62" width="80" height="9" fill="#d3a676"/>
    <path d="M28 22 L24 4 L40 16 Z M72 22 L76 4 L60 16 Z" fill="#8f8a96" ${st(4)}/>
    <ellipse cx="50" cy="40" rx="28" ry="24" fill="#a39fab" ${st(4)}/>
    <path d="M24 40 Q36 30 46 40 Q36 48 24 40 Z M76 40 Q64 30 54 40 Q64 48 76 40 Z" fill="#3a3440"/>
    <circle cx="37" cy="40" r="3.4" fill="#fff"/><circle cx="63" cy="40" r="3.4" fill="#fff"/>
    <ellipse cx="50" cy="52" rx="10" ry="7" fill="#efe9f2"/><circle cx="50" cy="49" r="3.5" fill="#2b2230"/>
    <path d="M45 56 q5 4 10 0" ${st(2.5)} fill="none"/>`,
  caja: `<rect x="12" y="34" width="76" height="54" fill="#d8ad74" ${st(5)}/><path d="M12 34 L28 18 H72 L88 34" fill="#e8c28d" ${st(5)}/>
    <path d="M50 34 V88" stroke="#b58653" stroke-width="3"/><rect x="40" y="34" width="20" height="9" fill="#c9a06a"/>
    <path d="M22 70 h14 M64 70 h14" stroke="#b58653" stroke-width="3"/>`,
  marca: `<path d="${puntas(50, 50, 22, 8, 4)}" fill="#ffe7a3" stroke="#e0a92e" stroke-width="3"/>`,
};
/* Obstáculos de cada piso: roca (sale con petardos) y mueble (no se rompe). */
const SVG_OBST = {
  cocina: {
    roca: `<path d="M18 88 Q10 52 26 32 Q40 20 50 24 Q60 20 74 32 Q90 52 82 88 Z" fill="#f3ead8" ${st(5)}/>
      <path d="M36 26 Q50 14 64 26" ${st(4)} fill="none"/><rect x="28" y="56" width="44" height="14" rx="3" fill="#7fb3d5"/>`,
    mueble: `<rect x="12" y="38" width="76" height="50" rx="12" fill="#b9c2cc" ${st(5)}/><rect x="6" y="30" width="88" height="14" rx="7" fill="#d6dce2" ${st(5)}/>
      <path d="M2 54 h10 M88 54 h10" ${st(6)}/><circle cx="50" cy="24" r="6" fill="#8f98a3" ${st(4)}/><ellipse cx="34" cy="60" rx="8" ry="12" fill="#e5eaef"/>`,
  },
  bano: {
    roca: `<rect x="20" y="28" width="60" height="60" rx="10" fill="#fbfbff" ${st(5)}/><ellipse cx="50" cy="30" rx="30" ry="11" fill="#ffffff" ${st(5)}/>
      <ellipse cx="50" cy="30" rx="10" ry="4" fill="#cfc7ba"/><path d="M80 52 h10 v20" ${st(3)} fill="none"/>`,
    mueble: `<rect x="28" y="30" width="44" height="58" rx="14" fill="#f39cbd" ${st(5)}/><rect x="40" y="16" width="20" height="16" rx="4" fill="#fff" ${st(4)}/>
      <path d="M50 16 V6 H66" ${st(4)} fill="none"/><rect x="36" y="48" width="28" height="22" rx="5" fill="#fff" opacity=".85"/>`,
  },
  living: {
    roca: `<rect x="14" y="66" width="72" height="20" rx="4" fill="#5ab0d6" ${st(5)}/><rect x="20" y="46" width="62" height="20" rx="4" fill="#e2554f" ${st(5)}/>
      <rect x="18" y="26" width="58" height="20" rx="4" fill="#f4c64e" ${st(5)}/><path d="M26 76 h50 M30 56 h46 M28 36 h40" stroke="#fff" stroke-width="2.5" opacity=".7"/>`,
    mueble: `<rect x="10" y="40" width="80" height="44" rx="14" fill="#8e6fb3" ${st(5)}/><rect x="20" y="22" width="60" height="30" rx="12" fill="#a585c9" ${st(5)}/>
      <rect x="4" y="44" width="16" height="36" rx="7" fill="#7c5fa1" ${st(5)}/><rect x="80" y="44" width="16" height="36" rx="7" fill="#7c5fa1" ${st(5)}/>`,
  },
  patio: {
    roca: `<path d="M14 84 Q8 56 26 40 Q44 22 64 30 Q88 40 88 66 Q90 84 74 88 Z" fill="#a8a3ad" ${st(5)}/>
      <path d="M30 44 Q46 32 60 38" stroke="#c4bfc9" stroke-width="5" fill="none"/><path d="M20 80 q8 -10 18 -2 q8 -10 20 -2" fill="#79b06b"/>`,
    mueble: `<path d="M24 54 H76 L70 90 H30 Z" fill="#d97a4c" ${st(5)}/><rect x="18" y="46" width="64" height="12" rx="4" fill="#e89466" ${st(5)}/>
      <path d="M50 46 Q40 22 26 18 M50 46 Q56 18 70 12 M50 46 Q64 30 82 28" stroke="#4f9441" stroke-width="6" fill="none" stroke-linecap="round"/>
      <circle cx="26" cy="18" r="7" fill="#f39cbd"/><circle cx="70" cy="12" r="7" fill="#f6cf5a"/><circle cx="82" cy="28" r="6" fill="#f39cbd"/>`,
  },
  tejado: {
    roca: `<rect x="14" y="58" width="34" height="26" rx="3" fill="#b85c45" ${st(4)}/><rect x="52" y="58" width="34" height="26" rx="3" fill="#a9503b" ${st(4)}/>
      <rect x="30" y="32" width="34" height="26" rx="3" fill="#c46a52" ${st(4)}/>`,
    mueble: `<rect x="26" y="28" width="48" height="62" fill="#9a4e3c" ${st(5)}/><rect x="20" y="20" width="60" height="14" fill="#7d3d2f" ${st(5)}/>
      <path d="M26 46 h48 M26 64 h48 M50 34 v12 M38 46 v18 M62 46 v18 M50 64 v26" stroke="#7d3d2f" stroke-width="3"/>
      <circle cx="44" cy="10" r="7" fill="#d9d4de" opacity=".7"/><circle cx="58" cy="4" r="5" fill="#d9d4de" opacity=".5"/>`,
  },
};

/* ============================================================
   ARTE
   ============================================================ */
const Arte = {
  T: 30, dpr: 1, W: 0, H: 0, ox: 0, oy: 0, lado: 0,
  spr: {}, emojiCache: {}, listoT: 0,
  fondo: null, foto: null, temblorT: 0, temblorF: 0,
  michi: {}, apariencia: { pelaje: 'crema', ropa: null, sombrero: null, accesorio: null },
  estrellas: null, banner: null,

  /* Dónde va la pieza en la pantalla (lo calcula la interfaz). */
  disponer(W, H, area) {
    this.W = W; this.H = H;
    const T = Math.max(14, Math.floor(Math.min(area.w / 13, area.h / 13)));
    this.T = T; this.lado = T * 13;
    this.ox = Math.round(area.x + (area.w - this.lado) / 2);
    this.oy = Math.round(area.y + (area.h - this.lado) / 2);
    this.estrellas = null;
  },

  /* Pasa los SVG a lienzos del tamaño de baldosa actual. */
  async preparar() {
    const T = this.T, dpr = this.dpr;
    if (this.listoT === T * dpr) return;
    const tareas = [];
    const hacer = (id, svg, tam) => tareas.push(this.rasterizar(svg, tam * T * dpr).then(c => { this.spr[id] = c; }));
    for (const [id, s] of Object.entries(SVG_ENEMIGOS)) hacer('e_' + id, svgDe(s), ENEMIGOS[id] ? ENEMIGOS[id].r * 3.05 : 1);
    for (const [id, s] of Object.entries(SVG_JEFES)) hacer('j_' + id, svgDe(s, 200), JEFES[id].r * 2.7);
    for (const [id, s] of Object.entries(SVG_COSAS)) hacer('c_' + id, svgDe(s), 1);
    for (const [piso, o] of Object.entries(SVG_OBST)) { hacer('o_' + piso + '_roca', svgDe(o.roca), 1); hacer('o_' + piso + '_mueble', svgDe(o.mueble), 1); }
    tareas.push(this.prepararMichi());
    await Promise.all(tareas);
    this.listoT = T * dpr;
    this.emojiCache = {};
    if (P && M && M.g) this.hacerFondo();
  },
  rasterizar(svg, px) {
    return new Promise(ok => {
      const tam = Math.max(2, Math.round(px));
      const img = new Image();
      img.onload = () => { const c = document.createElement('canvas'); c.width = tam; c.height = tam; c.getContext('2d').drawImage(img, 0, 0, tam, tam); ok(c); };
      img.onerror = () => ok(null);
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    });
  },
  /* Michi con su pelaje, su ropa y sus accesorios, en cinco caras. */
  async prepararMichi() {
    const a = this.apariencia, T = this.T, dpr = this.dpr;
    const ancho = Math.round(1.55 * T * dpr), alto = Math.round(ancho * 210 / 200);
    const caras = {
      normal: { ojos: 'normal', boca: 'sonrisa' }, dispara: { ojos: 'normal', boca: 'o' }, dano: { ojos: 'cerrados', boca: 'triste' },
      feliz: { ojos: 'feliz', boca: 'lengua' }, duerme: { ojos: 'cerrados', boca: 'masca' },
    };
    const res = {};
    await Promise.all(Object.entries(caras).map(async ([k, cara]) => {
      if (typeof michiSVG !== 'function') return;
      const svg = michiSVG({ pelaje: a.pelaje, ropa: a.ropa, ojos: cara.ojos, boca: cara.boca });
      const img = await new Promise(ok => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); });
      if (!img) return;
      const c = document.createElement('canvas'); c.width = ancho; c.height = alto;
      const x = c.getContext('2d'); x.drawImage(img, 0, 0, ancho, alto);
      for (const id of [a.sombrero, a.accesorio]) {
        const acc = id && ACCESORIOS[id];
        if (!acc) continue;
        const [emo, donde] = acc;
        const fs = ancho * (donde === 'cuello' ? .17 : .3);
        x.font = `${fs}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
        x.textAlign = 'center'; x.textBaseline = 'top';
        const top = { arriba: -.08, ojos: .36, cuello: .62 }[donde] * alto;
        x.fillText(emo, ancho / 2, Math.max(0, top));
      }
      res[k] = c;
    }));
    this.michi = res;
  },
  emoji(e, px) {
    const k = e + '|' + px;
    if (this.emojiCache[k]) return this.emojiCache[k];
    const tam = Math.ceil(px * 1.25), c = document.createElement('canvas'); c.width = tam; c.height = tam;
    const x = c.getContext('2d');
    x.font = `${px}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(e, tam / 2, tam / 2 + px * .06);
    this.emojiCache[k] = c;
    return c;
  },

  temblor(f) { this.temblorT = Math.max(this.temblorT, .25 + f * .4); this.temblorF = Math.max(this.temblorF, f); },

  /* ---------- el fondo de la pieza (se rehace cuando cambia algo) ---------- */
  hacerFondo() {
    if (!P || !M || !M.g) return;
    const T = this.T, dpr = this.dpr, s = salaActual(), piso = PISOS[P.pisoIdx], c = piso.c;
    const cv = this.fondo || (this.fondo = document.createElement('canvas'));
    cv.width = Math.round(13 * T * dpr); cv.height = cv.width;
    const x = cv.getContext('2d');
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    const L = 13 * T;
    /* paredes */
    x.fillStyle = c.pared; x.fillRect(0, 0, L, L);
    this.patronPared(x, piso, L, T);
    /* suelo */
    x.save(); x.beginPath(); x.rect(T, T, 11 * T, 11 * T); x.clip();
    this.patronSuelo(x, piso, T, s);
    x.restore();
    /* sombra interior */
    const g1 = x.createLinearGradient(0, T, 0, T * 1.9); g1.addColorStop(0, 'rgba(30,20,40,.32)'); g1.addColorStop(1, 'rgba(30,20,40,0)');
    x.fillStyle = g1; x.fillRect(T, T, 11 * T, T * .9);
    const g2 = x.createLinearGradient(T, 0, T * 1.5, 0); g2.addColorStop(0, 'rgba(30,20,40,.2)'); g2.addColorStop(1, 'rgba(30,20,40,0)');
    x.fillStyle = g2; x.fillRect(T, T, T * .5, 11 * T);
    const g3 = x.createLinearGradient(12 * T, 0, 11.5 * T, 0); g3.addColorStop(0, 'rgba(30,20,40,.2)'); g3.addColorStop(1, 'rgba(30,20,40,0)');
    x.fillStyle = g3; x.fillRect(11.5 * T, T, T * .5, 11 * T);
    x.strokeStyle = c.paredOsc; x.lineWidth = Math.max(2, T * .1); x.strokeRect(T, T, 11 * T, 11 * T);
    /* decoración según el tipo de pieza */
    this.decorSala(x, s, piso, T);
    /* hoyos, tachuelas y obstáculos */
    for (let f = 0; f < N; f++) for (let cc = 0; cc < N; cc++) {
      const ch = M.g[f][cc], px = T + cc * T, py = T + f * T;
      if (ch === 'P') this.hoyo(x, px, py, T, cc, f);
      else if (ch === 'S') this.tachuelas(x, px, py, T);
    }
    for (let f = 0; f < N; f++) for (let cc = 0; cc < N; cc++) {
      const ch = M.g[f][cc], px = T + cc * T, py = T + f * T;
      let spr = null;
      if (ch === 'R' || ch === 'X') spr = this.spr['o_' + piso.id + '_roca'];
      else if (ch === 'M') spr = this.spr['o_' + piso.id + '_mueble'];
      else if (ch === 'C') spr = this.spr.c_caja;
      if (!spr) continue;
      x.fillStyle = 'rgba(20,10,30,.22)'; x.beginPath(); x.ellipse(px + T / 2, py + T * .86, T * .42, T * .14, 0, 0, Math.PI * 2); x.fill();
      x.drawImage(spr, px - T * .04, py - T * .1, T * 1.08, T * 1.08);
      if (ch === 'X' && this.spr.c_marca) x.drawImage(this.spr.c_marca, px + T * .3, py + T * .25, T * .45, T * .45);
    }
    /* puertas */
    for (const d of DIRS) this.puerta(x, d, estadoPuerta(d, s), T, piso, s);
    this.fondoListo = true;
  },
  patronPared(x, piso, L, T) {
    const c = piso.c;
    x.save();
    if (piso.id === 'cocina' || piso.id === 'bano') {
      const t = T / 2;
      x.strokeStyle = c.paredOsc; x.globalAlpha = .45; x.lineWidth = 1;
      for (let i = 0; i <= L; i += t) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, L); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(L, i); x.stroke(); }
    } else if (piso.id === 'living') {
      x.fillStyle = c.paredOsc; x.globalAlpha = .28;
      for (let i = 0; i < L; i += T * .6) x.fillRect(i, 0, T * .22, L);
    } else if (piso.id === 'patio') {
      x.fillStyle = c.paredOsc;
      for (let i = 0; i < 160; i++) { const a = (i * 97) % L, b = (i * 53 + (i % 7) * 31) % L; if (a > T * 1.1 && a < L - T * 1.1 && b > T * 1.1 && b < L - T * 1.1) continue; x.globalAlpha = .5; x.beginPath(); x.arc(a, b, T * (.16 + (i % 3) * .06), 0, 7); x.fill(); }
    } else {
      x.fillStyle = '#ffffff';
      for (let i = 0; i < 70; i++) { const a = (i * 131) % L, b = (i * 71 + i * i) % L; if (a > T && a < L - T && b > T && b < L - T) continue; x.globalAlpha = .3 + (i % 4) * .15; x.fillRect(a, b, 1.6, 1.6); }
    }
    x.restore();
  },
  patronSuelo(x, piso, T, s) {
    const c = piso.c, x0 = T, y0 = T, L = 11 * T;
    x.fillStyle = c.piso1; x.fillRect(x0, y0, L, L);
    if (piso.id === 'cocina') {
      x.fillStyle = c.piso2;
      for (let f = 0; f < 11; f++) for (let cc = 0; cc < 11; cc++) if ((f + cc) % 2) x.fillRect(x0 + cc * T, y0 + f * T, T, T);
    } else if (piso.id === 'bano') {
      x.strokeStyle = c.linea; x.lineWidth = 1;
      for (let i = 0; i <= 22; i++) { x.beginPath(); x.moveTo(x0 + i * T / 2, y0); x.lineTo(x0 + i * T / 2, y0 + L); x.stroke(); x.beginPath(); x.moveTo(x0, y0 + i * T / 2); x.lineTo(x0 + L, y0 + i * T / 2); x.stroke(); }
      x.fillStyle = c.piso2; for (let f = 0; f < 22; f += 2) for (let cc = (f / 2) % 2; cc < 22; cc += 2) x.fillRect(x0 + cc * T / 2 + 1, y0 + f * T / 2 + 1, T / 2 - 2, T / 2 - 2);
    } else if (piso.id === 'living') {
      x.strokeStyle = c.linea; x.lineWidth = 1.2;
      for (let f = 0; f < 22; f++) {
        const y = y0 + f * T / 2; x.beginPath(); x.moveTo(x0, y); x.lineTo(x0 + L, y); x.stroke();
        for (let k = (f % 3) * 1.3; k < 11; k += 3.6) { x.beginPath(); x.moveTo(x0 + k * T, y); x.lineTo(x0 + k * T, y + T / 2); x.stroke(); }
      }
      if (s.tipo === 'normal' && (s.c + s.f) % 2 === 0) {
        x.fillStyle = 'rgba(214,90,90,.35)'; x.beginPath(); x.ellipse(x0 + L / 2, y0 + L / 2, L * .3, L * .22, 0, 0, 7); x.fill();
        x.strokeStyle = 'rgba(244,211,107,.6)'; x.lineWidth = T * .12; x.stroke();
      }
    } else if (piso.id === 'patio') {
      x.fillStyle = c.piso2;
      for (let i = 0; i < 260; i++) { const a = x0 + ((i * 37) % 110) / 110 * L, b = y0 + ((i * 61 + i % 9 * 13) % 110) / 110 * L; x.fillRect(a, b, 2, T * .18); }
      x.fillStyle = '#f39cbd'; for (let i = 0; i < 9; i++) { x.beginPath(); x.arc(x0 + ((i * 53) % 100) / 100 * L, y0 + ((i * 29) % 100) / 100 * L, T * .07, 0, 7); x.fill(); }
      x.fillStyle = 'rgba(10,20,40,.18)'; x.fillRect(x0, y0, L, L);
    } else {
      x.strokeStyle = c.linea; x.lineWidth = 1.4;
      for (let f = 0; f < 22; f++) {
        const y = y0 + f * T / 2 + T / 2;
        for (let k = 0; k < 12; k++) { x.beginPath(); x.arc(x0 + k * T + (f % 2 ? T / 2 : 0), y - T / 4, T / 2, .15 * Math.PI, .85 * Math.PI); x.stroke(); }
      }
      x.fillStyle = 'rgba(247,230,163,.08)'; x.beginPath(); x.ellipse(x0 + L * .7, y0 + L * .3, L * .45, L * .35, -.5, 0, 7); x.fill();
    }
  },
  decorSala(x, s, piso, T) {
    const cx = T + 5.5 * T, cy = T + 5.5 * T;
    if (s.tipo === 'tesoro') {
      x.fillStyle = 'rgba(244,198,78,.28)'; x.beginPath(); x.ellipse(cx, cy + T * .2, T * 2.4, T * 1.6, 0, 0, 7); x.fill();
      x.strokeStyle = 'rgba(244,198,78,.65)'; x.lineWidth = T * .1; x.stroke();
    } else if (s.tipo === 'tienda') {
      if (this.spr.c_mapache) x.drawImage(this.spr.c_mapache, cx - T * 1.1, T + 1.6 * T, T * 2.2, T * 2.2);
      x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(T + 2.4 * T, T + 5.4 * T, 6.2 * T, 1.4 * T);
    } else if (s.tipo === 'secreta') {
      x.fillStyle = 'rgba(20,10,40,.35)'; x.fillRect(T, T, 11 * T, 11 * T);
    } else if (s.tipo === 'inicio' && P.pisoIdx === 0) {
      x.fillStyle = 'rgba(61,47,58,.28)'; x.textAlign = 'center';
      x.font = `600 ${Math.round(T * .42)}px Fredoka, system-ui, sans-serif`;
      const tactil = window.matchMedia && matchMedia('(pointer: coarse)').matches;
      x.fillText(tactil ? 'un dedo para moverte' : 'WASD para moverte', cx, cy - T * 2.4);
      x.fillText(tactil ? 'el otro para lanzar lana' : 'flechas para lanzar lana', cx, cy - T * 1.8);
      x.font = `600 ${Math.round(T * .34)}px Fredoka, system-ui, sans-serif`;
      x.fillText('derrota a todos para abrir las puertas', cx, cy + T * 2.6);
    } else if (s.tipo === 'jefe') {
      x.strokeStyle = 'rgba(61,47,58,.22)'; x.lineWidth = T * .08;
      for (const [a, b] of [[3, 3], [8, 7.5], [2.4, 8]]) for (let k = 0; k < 3; k++) { x.beginPath(); x.moveTo(T + a * T + k * T * .22, T + b * T); x.lineTo(T + a * T + k * T * .22 + T * .5, T + b * T + T * .8); x.stroke(); }
    }
  },
  hoyo(x, px, py, T, c, f) {
    const g = x.createRadialGradient(px + T / 2, py + T * .4, T * .1, px + T / 2, py + T / 2, T * .75);
    g.addColorStop(0, '#0b0714'); g.addColorStop(1, '#2a1f38');
    x.fillStyle = g;
    const izq = c > 0 && M.g[f][c - 1] === 'P', der = c < N - 1 && M.g[f][c + 1] === 'P', arr = f > 0 && M.g[f - 1][c] === 'P', aba = f < N - 1 && M.g[f + 1][c] === 'P';
    const m = T * .08;
    x.beginPath();
    x.roundRect ? x.roundRect(px + (izq ? 0 : m), py + (arr ? 0 : m), T - (izq ? 0 : m) - (der ? 0 : m), T - (arr ? 0 : m) - (aba ? 0 : m), T * .22) : x.rect(px + m, py + m, T - 2 * m, T - 2 * m);
    x.fill();
  },
  tachuelas(x, px, py, T) {
    x.fillStyle = 'rgba(0,0,0,.12)'; x.fillRect(px + 2, py + 2, T - 4, T - 4);
    for (const [a, b] of [[.28, .3], [.72, .3], [.5, .55], [.28, .78], [.72, .78]]) {
      x.fillStyle = '#9aa0ad'; x.beginPath(); x.arc(px + a * T, py + b * T, T * .1, 0, 7); x.fill();
      x.fillStyle = '#e7ebf0'; x.beginPath(); x.moveTo(px + a * T, py + b * T - T * .18); x.lineTo(px + a * T + T * .06, py + b * T); x.lineTo(px + a * T - T * .06, py + b * T); x.fill();
    }
  },
  puerta(x, d, estado, T, piso, s) {
    const p = PUERTA[d];
    const cx = T + (p.c + .5) * T + p.dc * T * .5, cy = T + (p.f + .5) * T + p.df * T * .5;
    const v = vecina(s, d);
    if (estado === null) {
      if (v && (v.tipo === 'secreta' || s.tipo === 'secreta')) {
        x.strokeStyle = 'rgba(30,20,40,.35)'; x.lineWidth = Math.max(1, T * .05);
        x.beginPath(); x.moveTo(cx - T * .2, cy - T * .25); x.lineTo(cx, cy); x.lineTo(cx - T * .1, cy + T * .2); x.moveTo(cx, cy); x.lineTo(cx + T * .22, cy + T * .05); x.stroke();
      }
      return;
    }
    x.save(); x.translate(cx, cy);
    const rot = { arriba: 0, abajo: Math.PI, izq: -Math.PI / 2, der: Math.PI / 2 }[d];
    x.rotate(rot);
    const w = T * 1.25, h = T * 1.05;
    const marco = estado === 'jefe' ? '#b8324b' : estado === 'tesoro' || estado === 'llave' ? '#e0a92e' : piso.c.paredOsc;
    if (estado === 'hoyo') {
      x.fillStyle = '#120b1e'; x.beginPath(); x.moveTo(-w * .45, h * .5); x.lineTo(-w * .38, -h * .1); x.lineTo(-w * .12, -h * .45); x.lineTo(w * .18, -h * .32); x.lineTo(w * .42, -h * .05); x.lineTo(w * .45, h * .5); x.closePath(); x.fill();
      x.restore(); return;
    }
    x.fillStyle = marco; x.beginPath(); x.roundRect ? x.roundRect(-w / 2 - T * .14, -h / 2 - T * .14, w + T * .28, h + T * .3, T * .3) : x.rect(-w / 2, -h / 2, w, h); x.fill();
    if (estado === 'cerrada' || estado === 'llave') {
      x.fillStyle = estado === 'llave' ? '#f4c64e' : '#8a5e37'; x.beginPath(); x.roundRect ? x.roundRect(-w / 2, -h / 2, w, h + T * .1, T * .22) : x.rect(-w / 2, -h / 2, w, h); x.fill();
      x.strokeStyle = 'rgba(0,0,0,.25)'; x.lineWidth = T * .05; x.beginPath(); x.moveTo(0, -h / 2); x.lineTo(0, h / 2); x.stroke();
      if (estado === 'llave') { x.fillStyle = '#6b6474'; x.beginPath(); x.arc(0, 0, T * .17, 0, 7); x.fill(); x.fillRect(-T * .05, 0, T * .1, T * .22); }
    } else {
      const g = x.createLinearGradient(0, -h / 2, 0, h / 2); g.addColorStop(0, '#0c0716'); g.addColorStop(1, '#3a2c4a');
      x.fillStyle = g; x.beginPath(); x.roundRect ? x.roundRect(-w / 2, -h / 2, w, h + T * .1, T * .22) : x.rect(-w / 2, -h / 2, w, h); x.fill();
    }
    if (estado === 'jefe') {
      x.fillStyle = '#f3ead8';
      for (const k of [-1, 1]) { x.beginPath(); x.ellipse(k * w * .62, -h * .38, T * .12, T * .08, 0, 0, 7); x.fill(); }
    }
    x.restore();
  },

  /* Copia de la pieza actual para el deslizamiento entre piezas. */
  sacarFoto(canvas) {
    const T = this.T, dpr = this.dpr;
    const c = this.foto || (this.foto = document.createElement('canvas'));
    c.width = Math.round(13 * T * dpr); c.height = c.width;
    try { c.getContext('2d').drawImage(canvas, this.ox * dpr, this.oy * dpr, c.width, c.height, 0, 0, c.width, c.height); } catch (e) { /* nada */ }
  },

  /* ============================================================
     DIBUJAR UN CUADRO
     ============================================================ */
  dibujar(ctx, canvas) {
    const T = this.T, dpr = this.dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const piso = P ? PISOS[P.pisoIdx] : PISOS[0];
    ctx.fillStyle = piso.c.fondo; ctx.fillRect(0, 0, this.W, this.H);
    this.cielo(ctx);
    if (!P || !M || !M.g) return;
    if (!this.fondoListo) this.hacerFondo();
    let sx = 0, sy = 0;
    if (this.temblorT > 0) {
      this.temblorT -= 1 / 60;
      const a = this.temblorF * T * .18 * Math.min(1, this.temblorT * 3);
      sx = (Math.random() - .5) * a; sy = (Math.random() - .5) * a;
      if (this.temblorT <= 0) this.temblorF = 0;
    }
    ctx.save(); ctx.translate(sx, sy);
    const tr = M.trans;
    if (tr && tr.dir !== 'baja') {
      const k = Math.min(1, tr.t / tr.dur), e = k * k * (3 - 2 * k), L = this.lado;
      const v = { arriba: [0, -1], abajo: [0, 1], izq: [-1, 0], der: [1, 0] }[tr.dir];
      if (this.foto) ctx.drawImage(this.foto, this.ox - v[0] * e * L, this.oy - v[1] * e * L, L, L);
      ctx.save(); ctx.translate(v[0] * (1 - e) * L, v[1] * (1 - e) * L);
      ctx.beginPath(); ctx.rect(this.ox, this.oy, L, L); ctx.clip();
      this.dibujarSala(ctx);
      ctx.restore();
    } else {
      this.dibujarSala(ctx);
      if (tr && tr.dir === 'baja') {
        const k = tr.t / tr.dur;
        ctx.fillStyle = `rgba(8,6,18,${(1 - k).toFixed(3)})`; ctx.fillRect(this.ox, this.oy, this.lado, this.lado);
      }
    }
    ctx.restore();
  },
  cielo(ctx) {
    if (!this.estrellas) {
      const a = []; for (let i = 0; i < 70; i++) a.push([(i * 137.5) % 1, ((i * 71.3) % 97) / 97, .5 + (i % 3) * .5]);
      this.estrellas = a;
    }
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    const t = M ? M.tiempo : 0;
    for (const [u, v, r] of this.estrellas) { ctx.globalAlpha = .25 + .25 * Math.sin(t * 1.3 + u * 40); ctx.fillRect(u * this.W, v * this.H, r, r); }
    ctx.globalAlpha = 1;
  },
  wx(x) { return this.ox + this.T + x * this.T; },
  wy(y) { return this.oy + this.T + y * this.T; },

  dibujarSala(ctx) {
    const T = this.T, s = salaActual();
    ctx.drawImage(this.fondo, this.ox, this.oy, this.lado, this.lado);
    /* baba y nubes de polvo */
    for (let i = 0; i < M.baba.length; i++) {
      if (M.baba[i] <= 0) continue;
      const c = i % N, f = (i / N) | 0;
      ctx.fillStyle = `rgba(190,214,96,${Math.min(.45, M.baba[i] * .15).toFixed(3)})`;
      ctx.beginPath(); ctx.ellipse(this.wx(c + .5), this.wy(f + .5), T * .48, T * .36, 0, 0, 7); ctx.fill();
    }
    for (const z of M.peligros) {
      const k = z.cae > 0 ? 1 - z.cae / .5 : 1;
      ctx.fillStyle = `rgba(207,199,186,${(.55 * k * Math.min(1, z.t)).toFixed(3)})`;
      ctx.beginPath(); ctx.arc(this.wx(z.x), this.wy(z.y), z.r * T * (z.cae > 0 ? .5 + k * .5 : 1 + Math.sin(M.tiempo * 4) * .04), 0, 7); ctx.fill();
    }
    /* objetos fijos del suelo */
    for (const o of s.objetos) {
      const spr = this.spr['c_' + o.tipo];
      if (!spr) continue;
      const tam = o.tipo === 'camita' ? 1.6 : 1.5;
      ctx.globalAlpha = o.tipo === 'camita' && o.usada ? .55 : 1;
      ctx.drawImage(spr, this.wx(o.x) - tam * T / 2, this.wy(o.y) - tam * T / 2, tam * T, tam * T);
      ctx.globalAlpha = 1;
    }
    /* lo que se ordena por altura: cosas, enemigos, Michi, amigos */
    const lista = [];
    for (const p of s.pedestales) lista.push({ y: p.y, f: () => this.pedestal(ctx, p, s) });
    for (const r of s.recogibles) lista.push({ y: r.y, f: () => this.recogible(ctx, r) });
    for (const p of M.petardos) lista.push({ y: p.y, f: () => this.petardo(ctx, p) });
    for (const e of M.enemigos) if (!e.muerto) lista.push({ y: e.y, f: () => this.enemigo(ctx, e) });
    for (const f of M.familiares) lista.push({ y: f.y, f: () => this.familiar(ctx, f) });
    lista.push({ y: P.J.y, f: () => this.jugador(ctx) });
    lista.sort((a, b) => a.y - b.y);
    for (const o of lista) o.f();
    /* balas */
    for (const b of M.balas) if (b.de === 'p') this.bala(ctx, b);
    for (const b of M.balas) if (b.de === 'e') this.balaE(ctx, b);
    this.efectos(ctx);
    if (M.rayo) this.rayo(ctx);
    if (M.oscuro) this.oscuridad(ctx);
    if (M.jefe && !M.jefe.muerto && M.jefe.espera <= 0) this.barraJefe(ctx, M.jefe);
    if (M.linterna > 0) { ctx.fillStyle = `rgba(255,248,214,${(Math.min(.18, M.linterna * .06)).toFixed(3)})`; ctx.fillRect(this.ox, this.oy, this.lado, this.lado); }
  },
  sombra(ctx, x, y, rx, alfa = .25) {
    ctx.fillStyle = `rgba(20,10,30,${alfa})`;
    ctx.beginPath(); ctx.ellipse(this.wx(x), this.wy(y), rx * this.T, rx * this.T * .38, 0, 0, 7); ctx.fill();
  },
  pedestal(ctx, p, s) {
    const T = this.T, x = this.wx(p.x), y = this.wy(p.y);
    if (this.spr.c_pedestal) ctx.drawImage(this.spr.c_pedestal, x - T * .55, y - T * .5, T * 1.1, T * 1.1);
    if (!p.item) return;
    const it = ITEM[p.item]; if (!it) return;
    const flota = Math.sin(M.tiempo * 3 + p.x) * T * .08;
    ctx.fillStyle = 'rgba(255,240,200,.25)'; ctx.beginPath(); ctx.arc(x, y - T * .55 + flota, T * .45, 0, 7); ctx.fill();
    const em = this.emoji(it.e, Math.round(T * .72 * this.dpr));
    ctx.drawImage(em, x - T * .45, y - T * 1.0 + flota, T * .9, T * .9);
    if (p.precio) this.precio(ctx, x, y + T * .38, precioReal(p.precio));
  },
  precio(ctx, x, y, n) {
    const T = this.T;
    ctx.font = `700 ${Math.round(T * .34)}px Fredoka, system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const txt = n + ' 🪙', w = ctx.measureText(txt).width + T * .3;
    ctx.fillStyle = 'rgba(61,47,58,.78)'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - w / 2, y - T * .2, w, T * .4, T * .2) : ctx.rect(x - w / 2, y - T * .2, w, T * .4); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillText(txt, x, y + 1);
  },
  recogible(ctx, r) {
    const T = this.T;
    let id = r.tipo;
    if (r.tipo === 'cofre' && r.abierto) id = 'cofreAbierto';
    if (r.tipo === 'cofreDorado' && r.abierto) id = 'cofreAbierto';
    const spr = this.spr['c_' + id]; if (!spr) return;
    const tam = { corazon: .62, medio: .62, sueno: .62, moneda: .5, moneda5: .62, llave: .6, petardo: .62, cofre: .85, cofreAbierto: .85, cofreDorado: .85 }[id] || .6;
    const brillo = (r.tipo === 'moneda' || r.tipo === 'llave') ? Math.sin(M.tiempo * 4 + r.x * 3) * .04 : 0;
    this.sombra(ctx, r.x, r.y + .22, tam * .45);
    const x = this.wx(r.x), y = this.wy(r.y) - r.z * T;
    ctx.drawImage(spr, x - tam * T / 2, y - tam * T * .6 - brillo * T, tam * T, tam * T);
    if (r.precio) this.precio(ctx, x, this.wy(r.y) + T * .38, precioReal(r.precio));
  },
  petardo(ctx, p) {
    const T = this.T, spr = this.spr.c_petardo; if (!spr) return;
    const latido = 1 + Math.sin(M.tiempo * (p.t < .6 ? 30 : 14)) * .06;
    this.sombra(ctx, p.x, p.y + .2, .25);
    const tam = (p.amigo ? .75 : .62) * latido;
    ctx.drawImage(p.amigo && this.emojiCache ? this.emoji('🧶', Math.round(T * .62 * this.dpr)) : spr, this.wx(p.x) - tam * T / 2, this.wy(p.y) - tam * T * .7, tam * T, tam * T);
    if (Math.random() < .5) M.particulas.push({ x: p.x + .12, y: p.y - .45, vx: (Math.random() - .5) * 2, vy: -1.5, vida: .25, max: .25, color: '#ffcf6b', tam: .05 });
  },
  enemigo(ctx, e) {
    const T = this.T;
    if (e.espera > 0) {
      const k = 1 - e.espera / (e.jefe ? 1.2 : .65);
      ctx.globalAlpha = Math.max(0, k);
    }
    const id = e.jefe ? 'j_' + e.tipo : (e.oculto && e.tipo === 'pepino' ? 'e_pepinoOculto' : 'e_' + e.tipo);
    const spr = this.spr[id];
    const tam = e.r * 3.05;
    const vuela = e.d.vuela && !e.jefe;
    const bob = vuela ? Math.sin(M.tiempo * 6 + e.sem) * .08 + .25 : 0;
    this.sombra(ctx, e.x, e.y + e.r * .7, e.r * .85, e.alfa !== undefined ? .25 * e.alfa : .25);
    if (e.sombra) { ctx.fillStyle = 'rgba(184,50,75,.35)'; ctx.beginPath(); ctx.ellipse(this.wx(e.sombra.x), this.wy(e.sombra.y), e.r * T * 1.1, e.r * T * .45, 0, 0, 7); ctx.fill(); }
    let x = this.wx(e.x), y = this.wy(e.y) - (e.z + bob) * T;
    if (e.temblor > 0) { x += (Math.random() - .5) * T * .12; y += (Math.random() - .5) * T * .08; }
    let ax = 1, ay = 1;
    if (e.anim > 0) { ax = 1 + e.anim * .5; ay = 1 - e.anim * .4; }
    if (e.est === 'salto' || e.z > .05) { ax = .9; ay = 1.12; }
    if (e.d.ia === 'perseguir' || e.d.ia === 'babosa') ay *= 1 + Math.sin(M.tiempo * 12 + e.sem) * .04;
    if (e.alfa !== undefined) ctx.globalAlpha = Math.min(ctx.globalAlpha, Math.max(0, e.alfa));
    if (e.estela) { ctx.save(); ctx.globalAlpha *= .3; if (spr) ctx.drawImage(spr, x - e.vx * T * .06 - tam * T / 2, y - e.vy * T * .06 - tam * T * .55, tam * T, tam * T); ctx.restore(); }
    const voltear = (e.vx < -.1 && !e.jefe) || (e.jefe && P.J.x < e.x - .3 && e.tipo !== 'tina' && e.tipo !== 'aspiradora');
    ctx.save(); ctx.translate(x, y);
    if (voltear) ctx.scale(-1, 1);
    if (spr) ctx.drawImage(spr, -tam * T * ax / 2, -tam * T * .55 * ay - (ay - 1) * tam * T * .2, tam * T * ax, tam * T * ay);
    else { ctx.fillStyle = '#c0a0ff'; ctx.beginPath(); ctx.arc(0, 0, e.r * T, 0, 7); ctx.fill(); }
    if (e.flash > 0 && spr) {
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= .55;
      ctx.drawImage(spr, -tam * T * ax / 2, -tam * T * .55 * ay - (ay - 1) * tam * T * .2, tam * T * ax, tam * T * ay);
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
    ctx.globalAlpha = 1;
    if (e.congelado > 0) { ctx.fillStyle = 'rgba(159,224,255,.45)'; ctx.beginPath(); ctx.arc(x, y - e.r * T * .2, e.r * T * 1.15, 0, 7); ctx.fill(); }
    else if (e.lento > 0) { ctx.fillStyle = 'rgba(159,224,255,.18)'; ctx.beginPath(); ctx.arc(x, y - e.r * T * .2, e.r * T, 0, 7); ctx.fill(); }
    if (e.quema > 0 && Math.random() < .4) M.particulas.push({ x: e.x + (Math.random() - .5) * e.r, y: e.y - e.r, vx: 0, vy: -1.6, vida: .35, max: .35, color: '#ff9a3c', tam: .07 });
    if (e.aturdido > 0) {
      ctx.fillStyle = '#ffe27a';
      for (let i = 0; i < 3; i++) { const a = M.tiempo * 5 + i * 2.1; ctx.beginPath(); ctx.arc(x + Math.cos(a) * e.r * T * .8, y - e.r * T * 1.4 + Math.sin(a) * T * .12, T * .08, 0, 7); ctx.fill(); }
    }
  },
  jugador(ctx) {
    const T = this.T, J = P.J;
    if (M.cajaT > 0) {
      this.sombra(ctx, J.x, J.y + .3, .45);
      if (this.spr.c_caja) ctx.drawImage(this.spr.c_caja, this.wx(J.x) - T * .55, this.wy(J.y) - T * .75, T * 1.1, T * 1.1);
      return;
    }
    if (M.invul > 0 && Math.floor(M.invul * 12) % 2 === 0 && !M.pose) return;
    let cara = 'normal';
    if (M.pose && M.pose.dormir) cara = 'duerme';
    else if (M.pose) cara = 'feliz';
    else if (M.invul > .55) cara = 'dano';
    else if (M.disparando) cara = 'dispara';
    const img = this.michi[cara] || this.michi.normal;
    this.sombra(ctx, J.x, J.y + .32, .42);
    const ancho = 1.55 * T, alto = ancho * 210 / 200;
    const paso = J.anda ? Math.abs(Math.sin(M.tiempo * 11)) * T * .08 : 0;
    const resp = 1 + Math.sin(M.tiempo * 2.4) * .015;
    const x = this.wx(J.x), y = this.wy(J.y) + T * .42 - paso;
    ctx.save(); ctx.translate(x, y);
    if (J.mira < 0) ctx.scale(-1, 1);
    if (J.carga > .05) { ctx.fillStyle = `rgba(239,123,160,${(J.carga * .35).toFixed(3)})`; ctx.beginPath(); ctx.arc(0, -alto * .45, ancho * (.45 + J.carga * .25), 0, 7); ctx.fill(); }
    if (img) ctx.drawImage(img, -ancho / 2, -alto * resp, ancho, alto * resp);
    else { ctx.fillStyle = '#f3e6c8'; ctx.beginPath(); ctx.arc(0, -T * .5, T * .45, 0, 7); ctx.fill(); }
    ctx.restore();
    if (M.pose && M.pose.item) {
      const it = ITEM[M.pose.item];
      if (it) { const em = this.emoji(it.e, Math.round(T * .7 * this.dpr)); ctx.drawImage(em, x - T * .42, y - alto - T * .75, T * .84, T * .84); }
    }
    if (M.pose && M.pose.dormir) { ctx.fillStyle = '#fff'; ctx.font = `700 ${Math.round(T * .4)}px Fredoka, sans-serif`; ctx.fillText('z', x + T * .45, y - alto - T * .1 * Math.sin(M.tiempo * 3)); }
  },
  familiar(ctx, f) {
    const T = this.T;
    const emo = { raton: '🐭', pluma: '🪶', pez: '🐠', luciernaga: '✨', mariposa: '🦋' }[f.tipo];
    if (f.tipo === 'luciernaga') { ctx.fillStyle = 'rgba(255,240,150,.35)'; ctx.beginPath(); ctx.arc(this.wx(f.x), this.wy(f.y), T * .35, 0, 7); ctx.fill(); }
    const em = this.emoji(emo, Math.round(T * .5 * this.dpr));
    ctx.drawImage(em, this.wx(f.x) - T * .3, this.wy(f.y) - T * .45, T * .6, T * .6);
  },
  bala(ctx, b) {
    const T = this.T, x = this.wx(b.x), y = this.wy(b.y), r = b.r * T;
    const color = colorBala(b);
    if (b.estrella) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(M.tiempo * 8);
      ctx.fillStyle = '#ffe27a'; ctx.beginPath();
      for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5, rr = i % 2 ? r * .5 : r * 1.3; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      ctx.closePath(); ctx.fill(); ctx.restore(); return;
    }
    ctx.fillStyle = 'rgba(20,10,30,.18)'; ctx.beginPath(); ctx.ellipse(x, y + T * .32, r * .9, r * .35, 0, 0, 7); ctx.fill();
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = Math.max(1, r * .22);
    ctx.beginPath(); ctx.arc(x - r * .2, y - r * .1, r * .62, -1.2, 1.3); ctx.stroke();
    ctx.beginPath(); ctx.arc(x + r * .25, y + r * .1, r * .5, 2, 4.4); ctx.stroke();
    ctx.strokeStyle = 'rgba(61,47,58,.45)'; ctx.lineWidth = Math.max(1, r * .14); ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke();
  },
  balaE(ctx, b) {
    const T = this.T, x = this.wx(b.x), y = this.wy(b.y), r = b.r * T;
    const col = { agua: ['#8fd0f2', '#e6f6ff'], queso: ['#f6cf5a', '#fff2b8'], polvo: ['#bdb4a6', '#efe9df'], sombra: ['#7b5cc4', '#e3d4ff'], ladrido: ['#ff9f43', '#ffe0b8'],
      vapor: ['#e9eef2', '#ffffff'], papel: ['#f2efe6', '#ffffff'], pluma: ['#c9a06a', '#f3e1c3'], burbuja: ['#bfe6f7', '#ffffff'] }[b.tipo] || ['#e2554f', '#ffd0d0'];
    if (M.oscuro || b.tipo === 'sombra') { ctx.fillStyle = 'rgba(200,170,255,.25)'; ctx.beginPath(); ctx.arc(x, y, r * 1.9, 0, 7); ctx.fill(); }
    ctx.fillStyle = col[0]; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    ctx.fillStyle = col[1]; ctx.beginPath(); ctx.arc(x - r * .3, y - r * .3, r * .38, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(61,47,58,.55)'; ctx.lineWidth = Math.max(1, r * .16); ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke();
  },
  efectos(ctx) {
    const T = this.T;
    for (const p of M.particulas) {
      ctx.globalAlpha = Math.max(0, p.vida / p.max);
      ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(this.wx(p.x), this.wy(p.y), Math.max(1, p.tam * T), 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const e of M.efectos) {
      const k = 1 - e.t / e.max;
      if (e.tipo === 'boom') {
        ctx.fillStyle = `rgba(255,214,120,${(.5 * (1 - k)).toFixed(3)})`; ctx.beginPath(); ctx.arc(this.wx(e.x), this.wy(e.y), e.r * T * (.4 + k * .7), 0, 7); ctx.fill();
        ctx.strokeStyle = `rgba(255,255,255,${(.8 * (1 - k)).toFixed(3)})`; ctx.lineWidth = T * .12; ctx.beginPath(); ctx.arc(this.wx(e.x), this.wy(e.y), e.r * T * (.5 + k * .6), 0, 7); ctx.stroke();
      } else if (e.tipo === 'onda') {
        ctx.strokeStyle = `rgba(255,236,170,${(.9 * (1 - k)).toFixed(3)})`; ctx.lineWidth = T * .18; ctx.beginPath(); ctx.arc(this.wx(e.x), this.wy(e.y), e.r * T * k, 0, 7); ctx.stroke();
      } else if (e.tipo === 'rayito') {
        ctx.strokeStyle = `rgba(255,236,92,${(1 - k).toFixed(3)})`; ctx.lineWidth = T * .07; ctx.beginPath();
        const n = 5; ctx.moveTo(this.wx(e.x0), this.wy(e.y0));
        for (let i = 1; i < n; i++) ctx.lineTo(this.wx(lerp(e.x0, e.x1, i / n)) + (Math.random() - .5) * T * .3, this.wy(lerp(e.y0, e.y1, i / n)) + (Math.random() - .5) * T * .3);
        ctx.lineTo(this.wx(e.x1), this.wy(e.y1)); ctx.stroke();
      } else if (e.tipo === 'laser') {
        const x0 = this.wx(e.x), y0 = this.wy(e.y), x1 = x0 + Math.cos(e.ang) * e.largo * T, y1 = y0 + Math.sin(e.ang) * e.largo * T;
        ctx.strokeStyle = `rgba(255,70,100,${(.35 * (1 - k)).toFixed(3)})`; ctx.lineWidth = T * .38; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
        ctx.strokeStyle = `rgba(255,220,225,${(1 - k).toFixed(3)})`; ctx.lineWidth = T * .1; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
        ctx.fillStyle = '#ff2d4b'; ctx.beginPath(); ctx.arc(x1, y1, T * .14, 0, 7); ctx.fill();
      } else if (e.tipo === 'flash') {
        ctx.fillStyle = `rgba(255,250,220,${(.5 * (1 - k)).toFixed(3)})`; ctx.fillRect(this.ox, this.oy, this.lado, this.lado);
      } else if (e.tipo === 'texto') {
        ctx.globalAlpha = Math.min(1, (1 - k) * 2);
        ctx.font = `700 ${Math.round(T * .5)}px Fredoka, system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = Math.max(2, T * .1); ctx.strokeStyle = 'rgba(40,24,50,.85)';
        const tx = this.wx(e.x), ty = this.wy(e.y) - k * T * .7;
        ctx.strokeText(e.txt, tx, ty); ctx.fillStyle = '#fff'; ctx.fillText(e.txt, tx, ty);
        ctx.globalAlpha = 1;
      }
    }
  },
  rayo(ctx) {
    const T = this.T, J = P.J;
    const largo = largoRayo(J.x, J.y - .15, M.rayo.ang, 16);
    const x0 = this.wx(J.x), y0 = this.wy(J.y - .15), x1 = x0 + Math.cos(M.rayo.ang) * largo * T, y1 = y0 + Math.sin(M.rayo.ang) * largo * T;
    ctx.strokeStyle = 'rgba(200,215,255,.35)'; ctx.lineWidth = T * .9; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = T * .25; ctx.stroke();
  },
  oscuridad(ctx) {
    const T = this.T, J = P.J, x = this.wx(J.x), y = this.wy(J.y - .3);
    const g = ctx.createRadialGradient(x, y, T * 1.4, x, y, T * 3.8);
    g.addColorStop(0, 'rgba(6,4,16,0)'); g.addColorStop(1, 'rgba(6,4,16,.92)');
    ctx.fillStyle = g; ctx.fillRect(this.ox, this.oy, this.lado, this.lado);
    for (const b of M.balas) if (b.de === 'e') this.balaE(ctx, b);
    const jf = M.jefe;
    if (jf && !jf.muerto && !jf.invis) {
      const jx = this.wx(jf.x), jy = this.wy(jf.y) - jf.r * T * .3;
      for (const k of [-1, 1]) { ctx.fillStyle = 'rgba(215,184,255,.85)'; ctx.beginPath(); ctx.ellipse(jx + k * jf.r * T * .32, jy - jf.r * T * .1, T * .1, T * .12, 0, 0, 7); ctx.fill(); }
    }
  },
  barraJefe(ctx, e) {
    const T = this.T, w = this.lado * .62, x = this.ox + (this.lado - w) / 2, y = this.oy + this.lado - T * .62;
    const k = Math.max(0, e.hp / e.hpMax);
    ctx.fillStyle = 'rgba(20,12,30,.72)'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - 4, y - 4, w + 8, T * .36 + 8, T * .2) : ctx.rect(x - 4, y - 4, w + 8, T * .36 + 8); ctx.fill();
    ctx.fillStyle = k < .5 ? '#ef4f6c' : '#f4c64e'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w * k, T * .36, T * .18) : ctx.rect(x, y, w * k, T * .36); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = `700 ${Math.round(T * .3)}px Fredoka, system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(e.d.n, x + w / 2, y + T * .19);
  },

  /* ---------- mapa del piso (para el rincón del HUD) ---------- */
  mapa(ctx, w, h, dpr) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    if (!P || !P.mapa) return;
    const salas = Object.values(P.mapa.salas), act = salaActual();
    const S = M ? M.S : {};
    const visibles = salas.filter(s => s.visitada || s.vista || (S.mapa && s.tipo !== 'secreta'));
    if (!visibles.length) return;
    const cel = Math.min(w / 7, h / 5, 14), gap = Math.max(1, cel * .14);
    const ox = w / 2 - (act.c + .5) * cel, oy = h / 2 - (act.f + .5) * cel;
    for (const s of visibles) {
      const x = ox + s.c * cel, y = oy + s.f * cel;
      if (x < -cel || y < -cel || x > w || y > h) continue;
      ctx.fillStyle = s === act ? '#ffffff' : s.visitada ? 'rgba(255,255,255,.62)' : 'rgba(255,255,255,.25)';
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x + gap / 2, y + gap / 2, cel - gap, cel - gap, 2) : ctx.rect(x + gap / 2, y + gap / 2, cel - gap, cel - gap); ctx.fill();
      const icono = { jefe: '😾', tesoro: '⭐', tienda: '🪙', camita: '🛏️', secreta: '🕳️' }[s.tipo];
      if (icono && (s.visitada || s.vista || S.brujula)) {
        ctx.font = `${Math.round(cel * .62)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(icono, x + cel / 2, y + cel / 2 + 1);
      }
    }
  },
};
