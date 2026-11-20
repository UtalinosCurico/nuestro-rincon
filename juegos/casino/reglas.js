/* ============================================================
   REGLAS — probabilidades y pagos de cada juego del casino.
   Sin DOM: lo carga la página y también las pruebas en Node.

   `s` es el factor de suerte: 1 = normal (la casa devuelve ~97%).
   Lo fija Diego en el panel secreto (devolución ÷ 0,97). Cada juego
   lo aplica a lo que paga, y lo que se muestra en pantalla sale de
   las mismas funciones: los porcentajes y pagos que se ven son
   siempre los de verdad.
   ============================================================ */
const NORMAL = 0.97;
const redX = x => Math.floor(x * 100 + 1e-9) / 100;            // multiplicadores: 2 decimales, hacia abajo
const fmtX = x => '×' + (Math.round(x * 100) / 100).toLocaleString('es-CL', { maximumFractionDigits: 2 });
const fmtP = p => (p * 100).toLocaleString('es-CL', { maximumFractionDigits: p < 0.001 ? 3 : p < 0.01 ? 2 : 1 }) + '%';
const elegirPeso = (lista, az) => { let r = az() * lista.reduce((a, x) => a + x.p, 0); for (const x of lista) { r -= x.p; if (r < 0) return x; } return lista[lista.length - 1]; };

/* ---------- ruleta europea (un cero) ---------- */
const ORDEN = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
const ROJOS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const colorDe = n => (n === 0 ? 'v' : ROJOS.has(n) ? 'r' : 'n');
const APUESTAS = [
  { id: 'rojo', n: 'Rojo', ok: n => colorDe(n) === 'r', c: 'rojo' }, { id: 'negro', n: 'Negro', ok: n => colorDe(n) === 'n', c: 'negro' },
  { id: 'par', n: 'Par', ok: n => n > 0 && n % 2 === 0 }, { id: 'impar', n: 'Impar', ok: n => n % 2 === 1 },
  { id: 'bajo', n: '1 al 18', ok: n => n >= 1 && n <= 18 }, { id: 'alto', n: '19 al 36', ok: n => n >= 19 },
  { id: 'd1', n: '1ª docena', ok: n => n >= 1 && n <= 12 }, { id: 'd2', n: '2ª docena', ok: n => n >= 13 && n <= 24 }, { id: 'd3', n: '3ª docena', ok: n => n >= 25 },
];
APUESTAS.forEach(a => { a.casos = Array.from({ length: 37 }, (_, n) => n).filter(a.ok).length; });
const pagoRuleta = (casos, s) => redX(36 / casos * s);
const rtpRuleta = s => 18 / 37 * pagoRuleta(18, s);

/* ---------- rueda de la fortuna ---------- */
const RUEDA_BASE = [
  { x: 0, p: .46, c: '#3b3b44' }, { x: .5, p: .2, c: '#7a6a8a' }, { x: 1.5, p: .17, c: '#3f8f7a' },
  { x: 2, p: .1, c: '#4f8fd9' }, { x: 3, p: .05, c: '#c46ad0' }, { x: 10, p: .018, c: '#f2c14e' }, { x: 50, p: .002, c: '#ff4d6d' },
];
const rueda = s => RUEDA_BASE.map(g => Object.assign({}, g, { x: redX(g.x * s) }));
const rtpRueda = s => rueda(s).reduce((a, g) => a + g.p * g.x, 0);

/* ---------- cajas ---------- */
const RAREZAS = [
  { id: 'comun', n: 'Común', c: '#9aa5b1', p: .55, v: .25 }, { id: 'poco', n: 'Poco común', c: '#4f8fd9', p: .25, v: .7 },
  { id: 'raro', n: 'Rara', c: '#9b5de5', p: .13, v: 1.5 }, { id: 'epico', n: 'Épica', c: '#f15bb5', p: .055, v: 4 }, { id: 'leyenda', n: 'Legendaria', c: '#f2c14e', p: .015, v: 15 },
];
const CAJAS = [
  { id: 'madera', n: 'Caja de madera', e: '📦', precio: 100, col: '#8a5a34',
    cosas: { comun: [['🧦', 'Calcetín sin par'], ['🥄', 'Cuchara doblada'], ['🧷', 'Alfiler'], ['🍬', 'Dulce derretido']], poco: [['🧸', 'Osito gastado'], ['🎈', 'Globo con helio']], raro: [['🎸', 'Guitarra de palo'], ['🕶️', 'Lentes de sol']], epico: [['⌚', 'Reloj del abuelo']], leyenda: [['💍', 'Anillo de compromiso']] } },
  { id: 'plata', n: 'Caja de plata', e: '🎁', precio: 500, col: '#7a8592',
    cosas: { comun: [['🍷', 'Copa del valle'], ['📻', 'Radio a pilas'], ['🧣', 'Bufanda tejida'], ['🌵', 'Cactus del norte']], poco: [['🎧', 'Audífonos'], ['📷', 'Cámara de rollo']], raro: [['🚲', 'Bicicleta de paseo'], ['🎻', 'Violín']], epico: [['🛹', 'Skate de colección']], leyenda: [['🏆', 'Copa de campeones']] } },
  { id: 'oro', n: 'Caja dorada', e: '👑', precio: 2000, col: '#c9a14a',
    cosas: { comun: [['🍾', 'Espumante de Curicó'], ['🧳', 'Maleta de viaje'], ['🎩', 'Sombrero de copa'], ['🍫', 'Chocolate suizo']], poco: [['💎', 'Piedra preciosa'], ['🛵', 'Scooter']], raro: [['⛵', 'Velero chico'], ['🎹', 'Piano de cola']], epico: [['🚗', 'Auto clásico']], leyenda: [['🏝️', 'Isla privada']] } },
];
/* el valor de cada cosa varía ±15% alrededor de precio × rareza × s */
function sacarDeCaja(caja, s, az) {
  const r = elegirPeso(RAREZAS, az), l = caja.cosas[r.id], [e, n] = l[Math.floor(az() * l.length)];
  return { e, n, r: r.id, v: Math.round(caja.precio * r.v * s * (0.85 + az() * 0.3)), caja: caja.id };
}
const rtpCajas = s => RAREZAS.reduce((a, r) => a + r.p * r.v, 0) * s;

/* ---------- cohete: P(llegar a ×m) = R / m ---------- */
function techoCohete(u, s) { const R = NORMAL * s; return Math.max(1, Math.floor(R / (1 - u) * 100) / 100); }
const pCohete = (m, s) => Math.min(1, NORMAL * s / m);
const rtpCohete = s => NORMAL * s;

/* ---------- doble o nada ---------- */
const pDoble = s => Math.min(0.95, 0.48 * s);
const rtpDoble = s => 2 * pDoble(s);

/* ---------- tragamonedas: 3 rodillos, se paga la línea del medio ---------- */
const RODILLO = [{ e: '🍒', p: 7 }, { e: '🍋', p: 6 }, { e: '🍊', p: 5 }, { e: '🍇', p: 4 }, { e: '🔔', p: 3 }, { e: '⭐', p: 2 }, { e: '💎', p: 1 }];
const TRIO = { '💎': 500, '⭐': 120, '🔔': 50, '🍇': 25, '🍊': 15, '🍋': 10, '🍒': 8 };
function pagoLinea(a, b, c, s) {
  if (a === b && b === c) return redX(TRIO[a] * s);
  const n = [a, b, c].filter(x => x === '🍒').length;
  return n === 2 ? redX(2.5 * s) : n === 1 ? redX(0.25 * s) : 0;
}
function tablaTraga(s) {
  const W = RODILLO.reduce((a, x) => a + x.p, 0), pc = 7 / W, filas = RODILLO.slice().reverse().map(x => ({ txt: x.e + x.e + x.e, p: Math.pow(x.p / W, 3), x: redX(TRIO[x.e] * s) }));
  filas.push({ txt: 'Dos 🍒', p: 3 * pc * pc * (1 - pc), x: redX(2.5 * s) }, { txt: 'Una 🍒', p: 3 * pc * (1 - pc) * (1 - pc), x: redX(0.25 * s) });
  return filas;
}
function rtpTraga(s) {
  const W = RODILLO.reduce((a, x) => a + x.p, 0); let t = 0;
  for (const a of RODILLO) for (const b of RODILLO) for (const c of RODILLO) t += a.p * b.p * c.p / (W * W * W) * pagoLinea(a.e, b.e, c.e, s);
  return t;
}
const giroRodillo = az => elegirPeso(RODILLO, az).e;

/* ---------- minas: 5×5, cada casilla segura multiplica ---------- */
const CASILLAS = 25;
function multMinas(k, m, s) { let f = 1; for (let i = 0; i < k; i++) f *= (CASILLAS - i) / (CASILLAS - m - i); return k ? redX(NORMAL * s * f) : 1; }
const pSegura = (k, m) => (CASILLAS - m - k) / (CASILLAS - k);
const rtpMinas = s => NORMAL * s;

/* ---------- plinko: 12 filas, 13 casilleros ---------- */
const FILAS_PLINKO = 12;
const PLINKO_BASE = [24, 9, 3.5, 1.8, 1.1, 0.7, 0.3, 0.7, 1.1, 1.8, 3.5, 9, 24];
const COMB = (n, k) => { let r = 1; for (let i = 1; i <= k; i++) r = r * (n - k + i) / i; return r; };
const pPlinko = k => COMB(FILAS_PLINKO, k) / Math.pow(2, FILAS_PLINKO);
const plinko = s => PLINKO_BASE.map(x => redX(x * s));
const rtpPlinko = s => plinko(s).reduce((a, x, k) => a + x * pPlinko(k), 0);

/* ---------- raspe y gana: tres iguales ganan ---------- */
const RASPE_BASE = [{ e: '🍋', x: 1, p: .16 }, { e: '🍒', x: 2, p: .12 }, { e: '🔔', x: 4, p: .06 }, { e: '⭐', x: 10, p: .015 }, { e: '💎', x: 50, p: .0035 }];
const RASPE_SEÑUELOS = ['🍀', '🎈', '🍬'];
const raspe = s => RASPE_BASE.map(r => Object.assign({}, r, { x: redX(r.x * s) }));
const rtpRaspe = s => raspe(s).reduce((a, r) => a + r.p * r.x, 0);
function sortearRaspe(s, az) {
  const tabla = raspe(s), pGana = tabla.reduce((a, r) => a + r.p, 0);
  const u = az();
  let premio = null;
  if (u < pGana) { let k = u; for (const r of tabla) { k -= r.p; if (k < 0) { premio = r; break; } } premio = premio || tabla[tabla.length - 1]; }
  /* nueve casillas: si gana, el símbolo ganador va 3 veces y ningún otro llega a 3 */
  const celdas = [], cuenta = {};
  if (premio) { for (let i = 0; i < 3; i++) celdas.push(premio.e); cuenta[premio.e] = 3; }
  const pool = RASPE_BASE.map(r => r.e).concat(RASPE_SEÑUELOS).filter(e => !premio || e !== premio.e);
  while (celdas.length < 9) { const e = pool[Math.floor(az() * pool.length)]; if ((cuenta[e] || 0) < 2) { cuenta[e] = (cuenta[e] || 0) + 1; celdas.push(e); } }
  for (let i = celdas.length - 1; i > 0; i--) { const j = Math.floor(az() * (i + 1)); [celdas[i], celdas[j]] = [celdas[j], celdas[i]]; }
  return { celdas, premio };
}

/* ---------- dados: un número del 0,00 al 99,99 ---------- */
const pagoDados = (chance, s) => redX(NORMAL * s * 100 / chance);   // chance en %
const rtpDados = s => NORMAL * s;

/* ---------- veintiuno (mazo infinito, la banca se planta en 17, blackjack paga 3:2) ---------- */
const PALOS = ['♠', '♥', '♦', '♣'], RANGOS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const nuevaCarta = az => ({ r: RANGOS[Math.floor(az() * 13)], p: PALOS[Math.floor(az() * 4)] });
function valorMano(m) {
  let t = 0, ases = 0;
  for (const c of m) { if (c.r === 'A') { ases++; t += 1; } else t += ['J', 'Q', 'K'].includes(c.r) ? 10 : +c.r; }
  const blanda = ases > 0 && t + 10 <= 21;
  return { t: blanda ? t + 10 : t, blanda };
}
const esBlackjack = m => m.length === 2 && valorMano(m).t === 21;

/* ---------- ruleta de antojos (premios de verdad) ---------- */
function gajosAntojos(premios) {
  const activos = premios.filter(p => p.activo && p.peso > 0), suma = activos.reduce((a, p) => a + p.peso, 0);
  const k = suma > 100 ? 100 / suma : 1;
  const gajos = activos.map(p => ({ premio: p, p: p.peso * k / 100 }));
  const nada = Math.max(0, 1 - gajos.reduce((a, g) => a + g.p, 0));
  if (nada > 0) gajos.push({ premio: null, p: nada });
  return gajos;
}
/* cuánto devuelve, medido en precio de tienda */
const rtpAntojos = (premios, precio) => gajosAntojos(premios).reduce((a, g) => a + (g.premio ? g.p * g.premio.precio : 0), 0) / Math.max(1, precio);

/* devolución de cada juego para un factor de suerte (se muestra en Cuentas y en el panel) */
const DEVOLUCIONES = s => [
  ['Ruleta', rtpRuleta(s)], ['Rueda', rtpRueda(s)], ['Cajas', rtpCajas(s)], ['Cohete', rtpCohete(s)], ['Doble o nada', rtpDoble(s)],
  ['Tragamonedas', rtpTraga(s)], ['Minas', rtpMinas(s)], ['Plinko', rtpPlinko(s)], ['Raspe y gane', rtpRaspe(s)], ['Dados', rtpDados(s)],
];

if (typeof module !== 'undefined') module.exports = {};
