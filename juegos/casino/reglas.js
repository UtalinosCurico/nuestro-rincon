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

/* ============================================================
   LOS JUEGOS MÁS JUGADOS EN LAS PLATAFORMAS DE CASINO
   ============================================================ */

/* ---------- limbo: eliges un objetivo, sale un número al instante ---------- */
const pLimbo = (T, s) => Math.min(1, NORMAL * s / T);
const resultadoLimbo = (u, s) => techoCohete(u, s);           // misma distribución que el cohete
const rtpLimbo = s => NORMAL * s;

/* ---------- torres: 8 pisos; en cada uno hay puertas seguras y una trampa ---------- */
const PISOS_TORRE = 8;
const MODOS_TORRE = {
  facil: { n: 'Fácil', puertas: 4, seguras: 3 }, normal: { n: 'Normal', puertas: 3, seguras: 2 },
  dificil: { n: 'Difícil', puertas: 2, seguras: 1 }, experto: { n: 'Experto', puertas: 3, seguras: 1 },
};
/* la ventaja de la casa se cobra una sola vez sobre el total, no en cada piso */
const multTorre = (k, modo, s) => (k ? redX(NORMAL * s * Math.pow(MODOS_TORRE[modo].puertas / MODOS_TORRE[modo].seguras, k)) : 1);
const pPiso = modo => MODOS_TORRE[modo].seguras / MODOS_TORRE[modo].puertas;
const rtpTorres = s => NORMAL * s;

/* ---------- mayor o menor: cartas del 2 al As (mazo infinito) ---------- */
const VALORES_HILO = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const pMayorIgual = v => (13 - v) / 13;                       // v = índice 0 (el 2) … 12 (el As)
const pMenorIgual = v => (v + 1) / 13;
/* `justo` es el producto de 1/p de los aciertos: la ventaja se cobra una vez, como en las minas */
const pagoHilo = (justo, s) => (justo > 1 ? redX(NORMAL * s * justo) : 1);
const rtpHilo = s => NORMAL * s;

/* ---------- keno: 40 números, se sacan 10; eliges de 1 a 10 ---------- */
const KENO_N = 40, KENO_SACA = 10;
const pKeno = (n, k) => (k > n || k > KENO_SACA || KENO_SACA - k > KENO_N - n ? 0 : COMB(n, k) * COMB(KENO_N - n, KENO_SACA - k) / COMB(KENO_N, KENO_SACA));
const KENO_MIN = [0, 1, 1, 2, 2, 3, 3, 3, 4, 4, 4];           // desde cuántos aciertos se paga
/* el 97% se reparte entre los aciertos que pagan, con más peso en los frecuentes:
   así hay premios chicos seguido y premios enormes muy de vez en cuando */
function tablaKeno(n, s) {
  const ks = []; for (let k = KENO_MIN[n]; k <= n; k++) ks.push(k);
  const pesos = ks.map(k => Math.sqrt(pKeno(n, k))), suma = pesos.reduce((a, b) => a + b, 0);
  return ks.map((k, i) => ({ k, p: pKeno(n, k), x: redX(NORMAL * s * (pesos[i] / suma) / pKeno(n, k)) }));
}
const rtpKeno = (s, n = 5) => tablaKeno(n, s).reduce((a, f) => a + f.p * f.x, 0);
function sorteoKeno(az) {
  const bolsa = Array.from({ length: KENO_N }, (_, i) => i + 1);
  for (let i = bolsa.length - 1; i > 0; i--) { const j = Math.floor(az() * (i + 1)); [bolsa[i], bolsa[j]] = [bolsa[j], bolsa[i]]; }
  return bolsa.slice(0, KENO_SACA);
}

/* ---------- baccarat (mazo infinito, reglas de tercera carta de siempre) ---------- */
const valorBac = c => (c.r === 'A' ? 1 : ['10', 'J', 'Q', 'K'].includes(c.r) ? 0 : +c.r);
function bancaPide(b, tercera) {                               // tercera = valor de la 3ª del jugador, o null
  if (tercera == null) return b <= 5;
  if (b <= 2) return true;
  if (b === 3) return tercera !== 8;
  if (b === 4) return tercera >= 2 && tercera <= 7;
  if (b === 5) return tercera >= 4 && tercera <= 7;
  if (b === 6) return tercera === 6 || tercera === 7;
  return false;
}
function jugarBaccarat(az) {
  const j = [nuevaCarta(az), nuevaCarta(az)], b = [nuevaCarta(az), nuevaCarta(az)];
  const tot = m => m.reduce((a, c) => a + valorBac(c), 0) % 10;
  if (tot(j) < 8 && tot(b) < 8) {
    let tercera = null;
    if (tot(j) <= 5) { j.push(nuevaCarta(az)); tercera = valorBac(j[2]); }
    if (bancaPide(tot(b), tercera)) b.push(nuevaCarta(az));
  }
  const tj = tot(j), tb = tot(b);
  return { j, b, tj, tb, gana: tj > tb ? 'jugador' : tb > tj ? 'banca' : 'empate' };
}
/* probabilidades exactas, recorriendo todas las manos (valor 0 pesa 4/13; del 1 al 9, 1/13 cada uno) */
let PROBS_BAC = null;
function probsBaccarat() {
  if (PROBS_BAC) return PROBS_BAC;
  const pv = v => (v === 0 ? 4 / 13 : 1 / 13), r = { jugador: 0, banca: 0, empate: 0 };
  for (let j1 = 0; j1 < 10; j1++) for (let j2 = 0; j2 < 10; j2++) for (let b1 = 0; b1 < 10; b1++) for (let b2 = 0; b2 < 10; b2++) {
    const p0 = pv(j1) * pv(j2) * pv(b1) * pv(b2), tj0 = (j1 + j2) % 10, tb0 = (b1 + b2) % 10;
    const fin = (tj, tb, p) => { r[tj > tb ? 'jugador' : tb > tj ? 'banca' : 'empate'] += p; };
    if (tj0 >= 8 || tb0 >= 8) { fin(tj0, tb0, p0); continue; }
    const conBanca = (tj, tercera, p) => {
      if (!bancaPide(tb0, tercera)) return fin(tj, tb0, p);
      for (let b3 = 0; b3 < 10; b3++) fin(tj, (tb0 + b3) % 10, p * pv(b3));
    };
    if (tj0 <= 5) for (let j3 = 0; j3 < 10; j3++) conBanca((tj0 + j3) % 10, j3, p0 * pv(j3));
    else conBanca(tj0, null, p0);
  }
  return (PROBS_BAC = r);
}
/* lo que devuelve cada apuesta (incluida la apuesta); en empate, jugador y banca recuperan lo apostado */
function pagosBaccarat(s) {
  const p = probsBaccarat(), R = NORMAL * s;
  return { jugador: redX((R - p.empate) / p.jugador), banca: redX((R - p.empate) / p.banca), empate: redX(R / p.empate) };
}
function rtpBaccarat(s, a = 'jugador') { const p = probsBaccarat(), x = pagosBaccarat(s)[a]; return a === 'empate' ? p.empate * x : p[a] * x + p.empate; }

/* ---------- video póker: Jotas o mejor, tabla 8/5 (~97,3% jugando perfecto) ---------- */
const MANOS_POKER = [
  { id: 'real', n: 'Escalera real', x: 800 }, { id: 'colorEsc', n: 'Escalera de color', x: 50 }, { id: 'poker', n: 'Póker', x: 25 },
  { id: 'full', n: 'Full', x: 8 }, { id: 'color', n: 'Color', x: 5 }, { id: 'escalera', n: 'Escalera', x: 4 },
  { id: 'trio', n: 'Trío', x: 3 }, { id: 'doble', n: 'Doble pareja', x: 2 }, { id: 'jotas', n: 'Pareja de jotas o más', x: 1 },
];
const valorPoker = c => ({ J: 11, Q: 12, K: 13, A: 14 }[c.r] || +c.r);
function evaluarPoker(cartas) {
  const vs = cartas.map(valorPoker).sort((a, b) => a - b);
  const color = cartas.every(c => c.p === cartas[0].p);
  const distintos = new Set(vs).size === 5;
  const escalera = distintos && (vs[4] - vs[0] === 4 || vs.join() === '2,3,4,5,14');
  const cuenta = {}; vs.forEach(v => { cuenta[v] = (cuenta[v] || 0) + 1; });
  const reps = Object.values(cuenta).sort((a, b) => b - a);
  let id = null;
  if (escalera && color) id = vs[0] === 10 ? 'real' : 'colorEsc';
  else if (reps[0] === 4) id = 'poker';
  else if (reps[0] === 3 && reps[1] === 2) id = 'full';
  else if (color) id = 'color';
  else if (escalera) id = 'escalera';
  else if (reps[0] === 3) id = 'trio';
  else if (reps[0] === 2 && reps[1] === 2) id = 'doble';
  else if (reps[0] === 2 && +Object.keys(cuenta).find(k => cuenta[k] === 2) >= 11) id = 'jotas';
  return id ? MANOS_POKER.find(m => m.id === id) : null;
}
function mazoBarajado(az) {
  const m = []; for (const p of PALOS) for (const r of RANGOS) m.push({ r, p });
  for (let i = m.length - 1; i > 0; i--) { const j = Math.floor(az() * (i + 1)); [m[i], m[j]] = [m[j], m[i]]; }
  return m;
}

/* ---------- lluvia de frutas: tragamonedas de cascada 6×5 ----------
   Paga por cantidad: 8 o más iguales en cualquier lugar. Los que pagan desaparecen,
   caen nuevos y se vuelve a revisar. Con 4 o más 🍭 hay tiradas gratis, y en ellas
   aparecen 🌈 que multiplican lo ganado. No se puede calcular exacto: K se ajustó
   simulando millones de tiradas para que devuelva 97% (ver pruebas en Node). */
const CASCADA = {
  cols: 6, filas: 5, min: 8, gratis: 10, regratis: 5, K: 1.77,
  simbolos: [
    { e: '❤️', p: 3, pagos: [10, 25, 50] }, { e: '💙', p: 5, pagos: [2.5, 10, 25] }, { e: '💜', p: 7, pagos: [2, 5, 15] },
    { e: '🍬', p: 9, pagos: [1.5, 2, 12] }, { e: '🍎', p: 12, pagos: [1, 1.5, 10] }, { e: '🍑', p: 14, pagos: [0.8, 1.2, 8] },
    { e: '🍉', p: 16, pagos: [0.5, 1, 5] }, { e: '🍇', p: 18, pagos: [0.4, 0.9, 4] }, { e: '🍌', p: 20, pagos: [0.25, 0.75, 2] },
  ],
  scatter: { e: '🍭', p: 2, pagos: { 4: 3, 5: 5, 6: 100 } },
  multi: { e: '🌈', p: 1.4, valores: [{ v: 2, p: 30 }, { v: 3, p: 20 }, { v: 4, p: 14 }, { v: 5, p: 12 }, { v: 8, p: 8 }, { v: 10, p: 7 }, { v: 15, p: 4 }, { v: 25, p: 3 }, { v: 50, p: 1.5 }, { v: 100, p: 0.5 }] },
  stats: { gana: 0.417, gratisCada: 207 },                     // medido en Node con 800.000 jugadas (aprox.)
};
const tramoCascada = n => (n >= 12 ? 2 : n >= 10 ? 1 : 0);
const pagoCascada = (sim, n, s) => redX(sim.pagos[tramoCascada(n)] * CASCADA.K * s);
const pagoScatter = (n, s) => redX((CASCADA.scatter.pagos[Math.min(6, n)] || 0) * CASCADA.K * s);
function celdaCascada(az, gratis) {
  const lista = CASCADA.simbolos.concat([CASCADA.scatter]).concat(gratis ? [CASCADA.multi] : []);
  const c = elegirPeso(lista, az);
  return c === CASCADA.multi ? { e: c.e, m: elegirPeso(CASCADA.multi.valores, az).v } : { e: c.e };
}
/* una tirada completa: devuelve los pasos (para animar) y lo ganado, en veces la apuesta */
function tiradaCascada(az, s, gratis) {
  const { cols, filas } = CASCADA;
  let grid = Array.from({ length: cols }, () => Array.from({ length: filas }, () => celdaCascada(az, gratis)));
  const pasos = [];
  let total = 0;
  for (let vuelta = 0; vuelta < 60; vuelta++) {
    const cuenta = {};
    grid.forEach(col => col.forEach(c => { if (!c.m && c.e !== CASCADA.scatter.e) cuenta[c.e] = (cuenta[c.e] || 0) + 1; }));
    const ganan = CASCADA.simbolos.filter(sm => (cuenta[sm.e] || 0) >= CASCADA.min).map(sm => ({ e: sm.e, n: cuenta[sm.e], x: pagoCascada(sm, cuenta[sm.e], s) }));
    if (!ganan.length) { pasos.push({ grid: grid.map(c => c.slice()), ganan: [] }); break; }
    const x = ganan.reduce((a, g) => a + g.x, 0);
    total += x;
    pasos.push({ grid: grid.map(c => c.slice()), ganan, x });
    const fuera = new Set(ganan.map(g => g.e));
    grid = grid.map(col => { const quedan = col.filter(c => !fuera.has(c.e) || c.m); while (quedan.length < filas) quedan.unshift(celdaCascada(az, gratis)); return quedan; });
  }
  const fin = pasos[pasos.length - 1].grid;
  const scatters = fin.reduce((a, col) => a + col.filter(c => c.e === CASCADA.scatter.e).length, 0);
  const multis = fin.reduce((a, col) => a + col.reduce((b, c) => b + (c.m || 0), 0), 0);
  const mult = total > 0 && multis > 0 ? multis : 1;
  return { pasos, base: total, mult, x: total * mult + (scatters >= 4 ? pagoScatter(scatters, s) : 0), scatters, gratis: !gratis && scatters >= 4 ? CASCADA.gratis : gratis && scatters >= 3 ? CASCADA.regratis : 0 };
}
/* una jugada entera, con sus tiradas gratis encadenadas */
function jugadaCascada(az, s) {
  const tiradas = [tiradaCascada(az, s, false)];
  let quedan = tiradas[0].gratis, x = tiradas[0].x;
  for (let i = 0; i < quedan && i < 200; i++) { const t = tiradaCascada(az, s, true); tiradas.push(t); x += t.x; quedan += t.gratis; }
  return { tiradas, x, gratis: tiradas.length - 1 };
}

/* devolución de cada juego para un factor de suerte (se muestra en Cuentas y en el panel) */
const DEVOLUCIONES = s => [
  ['Lluvia de frutas (medido)', NORMAL * s], ['Cohete', rtpCohete(s)], ['Minas', rtpMinas(s)], ['Plinko', rtpPlinko(s)], ['Limbo', rtpLimbo(s)], ['Mayor o menor', rtpHilo(s)],
  ['Ruleta', rtpRuleta(s)], ['Baccarat (jugador)', rtpBaccarat(s, 'jugador')], ['Tragamonedas', rtpTraga(s)], ['Keno (5 números)', rtpKeno(s, 5)], ['Rueda', rtpRueda(s)], ['Dados', rtpDados(s)],
  ['Torres', rtpTorres(s)], ['Doble o nada', rtpDoble(s)], ['Cajas', rtpCajas(s)], ['Raspe y gane', rtpRaspe(s)],
];

if (typeof module !== 'undefined') module.exports = {};
