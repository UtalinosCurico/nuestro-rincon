/* ============================================================
   INVERNADERO DE NUESTRO RINCÓN
   Simulador de cruce genético de flores. JavaScript puro (ES6).

   Secciones:
     0. Constantes             7. Mundo, clima y tiempo
     1. Utilidades             8. Acciones de juego
     2. Genética               9. Interfaz
     3. Fenotipo y especies   10. Audio
     4. Dibujo de plantas     11. Fondo y partículas
     5. Contenido del juego   12. Arranque
     6. Estado y guardado
   ============================================================ */
'use strict';

/* ============================================================
   0. CONSTANTES
   ============================================================ */
const JUEGO = {
  version: '1.2.0',
  claveVieja: 'invernaderoRincon_v1',         // guardado anterior, sin dueño
  api: '/api/estado',
  marcadorCada: 60000,        // ms entre publicaciones del marcador
  respaldoCada: 300000,       // ms entre respaldos completos a la nube
  guardadoCada: 12000,        // ms entre autoguardados
  diaMs: 6 * 60 * 1000,       // duración real de un día del juego
  diasPorEstacion: 7,
  offlineMax: 14 * 60 * 60 * 1000,
  parcelasIniciales: 6,
  parcelasMax: 48,
  almacenInicial: 90,
  registroMax: 140,
};

/* El guardado es de la PERSONA, no del aparato. Antes había una sola clave y
   al cambiar de perfil se heredaba la partida del otro (y encima se subía a su
   nombre). Cada quien tiene la suya y cambiar de perfil cambia de invernadero. */
const claveDe = persona => JUEGO.claveVieja + '__' + (persona || 'invitado');
const claveCopiaDe = persona => claveDe(persona) + '_copia';

const ESTACIONES = [
  { id:'primavera', nombre:'Primavera', emo:'🌸', crec:1.15, agua:1.0,  mut:1.10, precio:1.00,
    cielo:['#bfdcf2','#dff0f4','#f6efdf'], colinas:['#c3d3b4','#a9bf9a','#8ba87e'] },
  { id:'verano',    nombre:'Verano',    emo:'☀️', crec:1.30, agua:1.55, mut:1.00, precio:1.08,
    cielo:['#a8d4f2','#d6eef2','#fbf0d5'], colinas:['#c8d69c','#aec37f','#8fa864'] },
  { id:'otono',     nombre:'Otoño',     emo:'🍂', crec:0.90, agua:0.85, mut:1.20, precio:1.14,
    cielo:['#e3c9a8','#f0dfc0','#f7edd9'], colinas:['#d6bd90','#c19f6f','#a3825a'] },
  { id:'invierno',  nombre:'Invierno',  emo:'❄️', crec:0.68, agua:0.55, mut:1.35, precio:1.22,
    cielo:['#cfdbe8','#e6edf3','#f4f2ee'], colinas:['#d3dde0','#b9c6cb','#9dabb2'] },
];

const CLIMAS = {
  soleado:  { nombre:'Soleado',  emo:'☀️', crec:1.10, agua:1.35, mut:1.00, precio:1.00, peso:34 },
  nublado:  { nombre:'Nublado',  emo:'☁️', crec:0.95, agua:0.85, mut:1.05, precio:1.00, peso:24 },
  lluvia:   { nombre:'Lluvia',   emo:'🌧️', crec:1.05, agua:0.10, mut:1.10, precio:0.94, peso:18 },
  tormenta: { nombre:'Tormenta', emo:'⛈️', crec:0.80, agua:0.05, mut:1.45, precio:0.90, peso:6 },
  niebla:   { nombre:'Niebla',   emo:'🌫️', crec:0.88, agua:0.55, mut:1.25, precio:1.06, peso:8 },
  viento:   { nombre:'Viento',   emo:'🍃', crec:0.98, agua:1.20, mut:1.15, precio:1.02, peso:7 },
  nieve:    { nombre:'Nieve',    emo:'🌨️', crec:0.55, agua:0.25, mut:1.40, precio:1.18, peso:3 },
};

const HORAS = { amanecer:[5,8], mañana:[8,12], tarde:[12,18], atardecer:[18,20], noche:[20,29] };

/* ============================================================
   1. UTILIDADES
   ============================================================ */
const $  = (s, c) => (c || document).querySelector(s);
const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));

/* Se calcula una vez: en el móvil se recorta calidad para no achicharrar
   la batería (menos fps, menos partículas, sin desenfoque de cristal). */
let _movil = null;
function esMovil() {
  if (_movil === null) {
    _movil = window.matchMedia('(max-width:820px)').matches ||
             /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '');
  }
  return _movil;
}

const lim   = (v, a, b) => v < a ? a : v > b ? b : v;
const azar  = (a, b) => a + Math.random() * (b - a);
const azarE = (a, b) => Math.floor(azar(a, b + 1));
const elige = arr => arr[Math.floor(Math.random() * arr.length)];
const suerte = p => Math.random() < p;

/** Elige un elemento según pesos: [{peso:n, …}] o un objeto {clave:{peso}} */
function elegirPeso(lista, campo) {
  const arr = Array.isArray(lista) ? lista : Object.keys(lista).map(k => ({ k, ...lista[k] }));
  const total = arr.reduce((s, x) => s + (campo ? x[campo] : x.peso), 0);
  let r = Math.random() * total;
  for (const x of arr) { r -= (campo ? x[campo] : x.peso); if (r <= 0) return x; }
  return arr[arr.length - 1];
}

let contadorId = 0;
const nuevoId = pre => (pre || 'x') + '_' + (Date.now().toString(36)) + (contadorId++).toString(36);

/** PRNG determinista sembrado desde un texto (para el mercado del día). */
function semilla(txt) {
  let h = 2166136261;
  for (let i = 0; i < txt.length; i++) { h ^= txt.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 100000) / 100000; };
}

function num(n) {
  n = Math.floor(n);
  if (n < 1000) return String(n);
  const u = ['', 'K', 'M', 'B', 'T', 'aa', 'ab', 'ac'];
  let i = 0;
  while (n >= 1000 && i < u.length - 1) { n /= 1000; i++; }
  return (n < 10 ? n.toFixed(2) : n < 100 ? n.toFixed(1) : Math.floor(n)) + u[i];
}
const monedas = n => num(n);

function tiempoCorto(ms) {
  if (ms <= 0) return 'ya';
  const s = Math.ceil(ms / 1000);
  if (s < 60) return s + 's';
  const m = Math.floor(s / 60);
  if (m < 60) return m + 'm ' + (s % 60) + 's';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h ' + (m % 60) + 'm';
  return Math.floor(h / 24) + 'd ' + (h % 24) + 'h';
}

const hoyClave = () => {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};
const semanaClave = () => {
  const d = new Date();
  const j = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  j.setUTCDate(j.getUTCDate() + 4 - (j.getUTCDay() || 7));
  const a = new Date(Date.UTC(j.getUTCFullYear(), 0, 1));
  return j.getUTCFullYear() + '-S' + Math.ceil(((j - a) / 86400000 + 1) / 7);
};

/* --- Color --- */
function hexHsl(hex) {
  const n = parseInt(hex.slice(1), 16);
  let r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  let h = 0, s = 0; const l = (mx + mn) / 2;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
  }
  return [h, s * 100, l * 100];
}
function hsl(h, s, l) {
  h = ((h % 360) + 360) % 360; s = lim(s, 0, 100) / 100; l = lim(l, 0, 100) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2;
  let r, g, b;
  if (h < 60)       [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else              [r, g, b] = [c, 0, x];
  const t = v => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return '#' + t(r) + t(g) + t(b);
}
/** Ajusta un hex moviendo tono, saturación y luminosidad. */
function tinte(hex, dh, ds, dl) {
  const [h, s, l] = hexHsl(hex);
  return hsl(h + (dh || 0), s + (ds || 0), l + (dl || 0));
}

/* ============================================================
   2. GENÉTICA
   Doce loci diploides. Cada planta guarda dos alelos por locus.
   Las reglas de expresión están en `fenotipo()`; el jugador puede
   deducirlas cruzando, que es justamente la gracia.
   ============================================================ */
const LOCI = [
  { id:'A', nombre:'Antocianina', tipo:'dosis', alelos:['A','a'], dom:'A',
    desc:'Pigmento azul-violeta. Cada copia de <b>A</b> suma una dosis de azul (0, 1 ó 2).' },
  { id:'B', nombre:'Betalaína', tipo:'dosis', alelos:['B','b'], dom:'B',
    desc:'Pigmento rojo. Cada copia de <b>B</b> suma una dosis de rojo.' },
  { id:'C', nombre:'Carotenoide', tipo:'dosis', alelos:['C','c'], dom:'C',
    desc:'Pigmento amarillo. Cada copia de <b>C</b> suma una dosis de amarillo.' },
  { id:'P', nombre:'Pigmentación', tipo:'dominante', alelos:['P','p'], dom:'P',
    desc:'<b>P</b> permite fabricar pigmento. <b>pp</b> da una flor albina, blanca pase lo que pase.' },
  { id:'S', nombre:'Saturación', tipo:'incompleta', alelos:['S','s'], dom:'S',
    desc:'Dominancia incompleta: <b>SS</b> intensa, <b>Ss</b> media, <b>ss</b> pastel.' },
  { id:'F', nombre:'Corola', tipo:'serie', alelos:['F1','F2','F3','f'], dom:'F1',
    desc:'Serie alélica con jerarquía: <b>F1</b> estrella &gt; <b>F2</b> copa &gt; <b>F3</b> campana &gt; <b>f</b> sencilla.' },
  { id:'H', nombre:'Hoja', tipo:'codominante', alelos:['Hc','Hp'], dom:'Hc',
    desc:'Codominancia: <b>HcHc</b> cordada, <b>HpHp</b> plumada, <b>HcHp</b> abanicada (las dos a la vez).' },
  { id:'T', nombre:'Talla', tipo:'dosis', alelos:['T','t'], dom:'T',
    desc:'Aditivo: cada <b>T</b> alarga el tallo. <b>tt</b> enana, <b>Tt</b> media, <b>TT</b> alta.' },
  { id:'G', nombre:'Vigor', tipo:'dominante', alelos:['G','g'], dom:'G',
    desc:'<b>G</b> acelera el crecimiento un 35%. <b>gg</b> crece lenta pero gasta menos agua.' },
  { id:'M', nombre:'Estabilidad', tipo:'dominante', alelos:['M','m'], dom:'M',
    desc:'<b>mm</b> desestabiliza el genoma: muta mucho más, pero es más frágil.' },
  { id:'X', nombre:'Luminiscencia', tipo:'dominante', alelos:['X','x'], dom:'X',
    desc:'Recesivo escondido: solo <b>xx</b> brilla en la oscuridad. Los portadores no se notan.' },
  { id:'N', nombre:'Néctar', tipo:'dominante', alelos:['N','n'], dom:'N',
    desc:'<b>N</b> produce néctar: la flor vale más y atrae clientes especiales.' },
  /* Los tres últimos loci son "dormidos": están en todas las plantas desde
     siempre, pero solo se expresan si la flor crece en su bioma. Por eso los
     guardados antiguos no cambian de fenotipo al actualizar. */
  { id:'Q', nombre:'Suculencia', tipo:'dominante', alelos:['Q','q'], dom:'Q', bioma:'desierto',
    desc:'Solo se nota en el <b>desierto</b>: hojas carnosas que guardan agua.' },
  { id:'R', nombre:'Aroma', tipo:'dominante', alelos:['R','r'], dom:'R', bioma:'tropical',
    desc:'Solo se nota en el <b>trópico</b>: la flor perfuma y se paga mucho mejor.' },
  { id:'W', nombre:'Escarcha', tipo:'dominante', alelos:['W','w'], dom:'W', bioma:'alpino',
    desc:'Solo se nota en el <b>alpino</b>: pétalos cubiertos de escarcha que no se derrite.' },
];

/* ---- Biomas: sectores del invernadero con su propio clima y su locus ---- */
const BIOMAS = {
  patio: { id:'patio', nombre:'Patio', emo:'🪴', locus:null, rasgo:null, precio:0, nivel:1,
    crec:1, agua:1, plaga:1, mut:1, rareza:0,
    desc:'El invernadero de toda la vida. Equilibrado y sin sorpresas.' },
  desierto: { id:'desierto', nombre:'Desierto', emo:'🏜️', locus:'Q', rasgo:'suculenta', precio:120000, nivel:8,
    crec:0.85, agua:0.30, plaga:0.5, mut:1.10, rareza:0,
    desc:'Casi no hay que regar y apenas hay plagas, pero todo crece más lento.' },
  tropical: { id:'tropical', nombre:'Trópico', emo:'🌴', locus:'R', rasgo:'perfumada', precio:450000, nivel:12,
    crec:1.40, agua:2.10, plaga:2.20, mut:1.15, rareza:0,
    desc:'Crece rapidísimo, bebe muchísimo y se llena de bichos.' },
  alpino: { id:'alpino', nombre:'Alpino', emo:'🏔️', locus:'W', rasgo:'escarchada', precio:1400000, nivel:16,
    crec:0.65, agua:0.55, plaga:0.25, mut:1.70, rareza:0.05,
    desc:'Frío y lento, pero es donde más muta la genética.' },
};
const ORDEN_BIOMAS = ['patio', 'desierto', 'tropical', 'alpino'];
const biomaDeParcela = p => (p && p.bioma && BIOMAS[p.bioma]) ? p.bioma : 'patio';

/* Rasgos que solo aparecen cultivando en el bioma correcto. */
const RASGOS_BIOMA = {
  suculenta:  { nombre:'Suculenta',  suf:'suc', adj:'suculenta',  emo:'🌵', puntos:4, precio:1.45 },
  perfumada:  { nombre:'Perfumada',  suf:'per', adj:'perfumada',  emo:'💮', puntos:5, precio:1.75 },
  escarchada: { nombre:'Escarchada', suf:'esc', adj:'escarchada', emo:'❄️', puntos:6, precio:2.10 },
};
const SUFIJOS_RASGO = {};
Object.keys(RASGOS_BIOMA).forEach(k => SUFIJOS_RASGO[RASGOS_BIOMA[k].suf] = k);

/* ---- Claves de inventario ----
   Una flor recuerda dónde creció, porque de eso depende su rasgo. Las semillas
   no: son solo genes. Formato: "<genotipo>@<bioma>", y sin "@" es el patio,
   así que todos los montones guardados antes siguen leyéndose igual. */
function claveItem(cod, bioma) {
  return (bioma && bioma !== 'patio') ? cod + '@' + bioma : cod;
}
const codDe = clave => String(clave).split('@')[0];
function biomaDe(clave) {
  const b = String(clave).split('@')[1];
  return (b && BIOMAS[b]) ? b : 'patio';
}
const LOCUS = {};
LOCI.forEach(l => LOCUS[l.id] = l);
const ORDEN_F = ['F1', 'F2', 'F3', 'f'];

/** Crea un genotipo a partir de un texto tipo "Aa BB cc PP Ss F1f HcHp Tt Gg Mm Xx Nn". */
function genDe(txt) {
  const partes = txt.trim().split(/\s+/);
  const g = {};
  LOCI.forEach((l, i) => {
    const p = partes[i] || (l.alelos[1] + l.alelos[1]);
    g[l.id] = leerPar(l, p);
  });
  return g;
}
function leerPar(locus, txt) {
  const encontrados = [];
  const ord = locus.alelos.slice().sort((a, b) => b.length - a.length);
  let resto = txt;
  while (resto.length && encontrados.length < 2) {
    const al = ord.find(a => resto.startsWith(a));
    if (!al) { resto = resto.slice(1); continue; }
    encontrados.push(al); resto = resto.slice(al.length);
  }
  while (encontrados.length < 2) encontrados.push(locus.alelos[locus.alelos.length - 1]);
  return ordenarPar(locus, encontrados);
}
function ordenarPar(locus, par) {
  const rango = a => locus.alelos.indexOf(a);
  return par.slice().sort((a, b) => rango(a) - rango(b));
}

/** Serializa/deserializa un genotipo de forma compacta para el guardado. */
const genCod = g => LOCI.map(l => g[l.id].join('')).join('.');
function genDec(cod) {
  const partes = String(cod).split('.');
  const g = {};
  LOCI.forEach((l, i) => g[l.id] = leerPar(l, partes[i] || l.alelos[1] + l.alelos[1]));
  return g;
}
const genIgual = (a, b) => genCod(a) === genCod(b);

/** Genotipo aleatorio con sesgo hacia alelos recesivos (plantas silvestres). */
function genSilvestre(fuerza) {
  const f = fuerza === undefined ? 0.22 : fuerza;
  const g = {};
  LOCI.forEach(l => {
    const par = [];
    for (let i = 0; i < 2; i++) {
      if (l.tipo === 'serie') par.push(suerte(f * 0.9) ? elige(ORDEN_F.slice(0, 3)) : 'f');
      else if (l.id === 'X') par.push(suerte(f * 0.28) ? 'x' : 'X');
      else if (l.id === 'M') par.push(suerte(f * 0.5) ? 'm' : 'M');
      else if (l.id === 'P') par.push(suerte(f * 0.35) ? 'p' : 'P');
      else if (l.id === 'H') par.push(suerte(0.5) ? 'Hc' : 'Hp');
      else par.push(suerte(f) ? l.alelos[0] : l.alelos[1]);
    }
    g[l.id] = ordenarPar(l, par);
  });
  return g;
}

/**
 * Meiosis: cada progenitor aporta un alelo al azar por locus.
 * `mutacion` es la probabilidad por locus de que el alelo cambie.
 * Devuelve { gen, mutados:[idLocus] } — nada de resultados mágicos:
 * si no hay mutación, todo alelo del hijo viene de alguno de los padres.
 */
function meiosis(gA, gB, mutacion) {
  const g = {}, mutados = [];
  LOCI.forEach(l => {
    let a = elige(gA[l.id]);
    let b = elige(gB[l.id]);
    // Un genoma inestable (mm en cualquiera de los padres) multiplica la mutación.
    let p = mutacion;
    if (!gA.M.includes('M') || !gB.M.includes('M')) p *= 3.2;
    if (suerte(p)) { a = mutar(l, a); mutados.push(l.id); }
    if (suerte(p)) { b = mutar(l, b); if (!mutados.includes(l.id)) mutados.push(l.id); }
    g[l.id] = ordenarPar(l, [a, b]);
  });
  return { gen: g, mutados };
}
function mutar(locus, alelo) {
  const otros = locus.alelos.filter(a => a !== alelo);
  if (!otros.length) return alelo;
  // En la serie alélica la mutación salta a un alelo vecino, no a cualquiera.
  if (locus.tipo === 'serie') {
    const i = ORDEN_F.indexOf(alelo);
    const cand = [ORDEN_F[i - 1], ORDEN_F[i + 1]].filter(Boolean);
    return elige(cand);
  }
  return elige(otros);
}

/** Autofecundación: una planta consigo misma. */
const autofecundar = (g, mut) => meiosis(g, g, mut);

/* --- Cuadro de Punnett para un locus (usado por la predicción) --- */
function punnett(parA, parB) {
  const res = {};
  parA.forEach(a => parB.forEach(b => {
    const clave = a + '/' + b;
    res[clave] = (res[clave] || 0) + 0.25;
  }));
  return res;
}

/* ============================================================
   3. FENOTIPO, ESPECIES, RAREZA Y PRECIO
   ============================================================ */

/* 28 colores: 27 combinaciones de dosis (azul, rojo, amarillo) + albina.
   La clave "abc" son las dosis: "102" = 1 azul, 0 rojo, 2 amarillo. */
const COLORES = {
  alb: { nombre:'Blanco Puro',      ep:'níveo',       hex:'#fdfbf3' },
  '000': { nombre:'Blanco Nube',    ep:'nubóso',      hex:'#f6f1e6' },
  '001': { nombre:'Amarillo Mantequilla', ep:'mantecoso', hex:'#f6e2a0' },
  '002': { nombre:'Ámbar Dorado',   ep:'ambarina',    hex:'#efc25f' },
  '010': { nombre:'Rosa Rubor',     ep:'ruborosa',    hex:'#f4b9c2' },
  '011': { nombre:'Melocotón',      ep:'melocotona',  hex:'#f6c39a' },
  '012': { nombre:'Naranja Atardecer', ep:'crepuscular', hex:'#f0a463' },
  '020': { nombre:'Carmesí',        ep:'carmesí',     hex:'#d9566e' },
  '021': { nombre:'Coral Ardiente', ep:'coralina',    hex:'#e87a5c' },
  '022': { nombre:'Fuego Ocre',     ep:'ígnea',       hex:'#e08a3c' },
  '100': { nombre:'Lavanda',        ep:'lavandina',   hex:'#c9bde8' },
  '101': { nombre:'Verde Menta',    ep:'mentolada',   hex:'#b6d9ae' },
  '102': { nombre:'Oliva Suave',    ep:'olivácea',    hex:'#9fbf6a' },
  '110': { nombre:'Malva',          ep:'malvácea',    hex:'#d3a8d8' },
  '111': { nombre:'Bruma Gris',     ep:'brumosa',     hex:'#cdbfb6' },
  '112': { nombre:'Caqui Rosado',   ep:'caquilla',    hex:'#cbb27e' },
  '120': { nombre:'Fucsia',         ep:'fucsina',     hex:'#d97ab0' },
  '121': { nombre:'Terracota',      ep:'terrosa',     hex:'#cf8f7f' },
  '122': { nombre:'Bronce Cálido',  ep:'broncínea',   hex:'#c4884f' },
  '200': { nombre:'Índigo',         ep:'indigóida',   hex:'#8aa8e0' },
  '201': { nombre:'Turquesa',       ep:'turquesa',    hex:'#79c7c0' },
  '202': { nombre:'Esmeralda',      ep:'esmeraldina', hex:'#4fa877' },
  '210': { nombre:'Violeta',        ep:'violácea',    hex:'#a678d4' },
  '211': { nombre:'Jade Suave',     ep:'jadeíta',     hex:'#86b39a' },
  '212': { nombre:'Musgo Dorado',   ep:'musgosa',     hex:'#93a75f' },
  '220': { nombre:'Magenta Real',   ep:'magenta',     hex:'#c05aa6' },
  '221': { nombre:'Ciruela',        ep:'ciruelina',   hex:'#a06a8e' },
  '222': { nombre:'Ónix Botánico',  ep:'onicina',     hex:'#4b4453' },
};
/* Ojo: `Object.keys(COLORES)` NO sirve aquí. Claves como '100' o '222' son
   índices de array válidos y el motor las devuelve primero y ordenadas a su
   manera, mientras que 'alb' o '000' quedan al final. El herbario salía
   desordenado. Se construye la lista a mano, por dosis de pigmento. */
const CLAVES_COLOR = ['alb'];
for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) for (let c = 0; c < 3; c++)
  CLAVES_COLOR.push('' + a + b + c);

const FORMAS = {
  F1: { id:'F1', nombre:'Estrella', genero:'Estelaria', emo:'✴️', rareza:3, precio:1.35 },
  F2: { id:'F2', nombre:'Copa',     genero:'Copelia',   emo:'🏵️', rareza:2, precio:1.20 },
  F3: { id:'F3', nombre:'Campana',  genero:'Campanela', emo:'🔔', rareza:1, precio:1.10 },
  f:  { id:'f',  nombre:'Sencilla', genero:'Florina',   emo:'🌼', rareza:0, precio:1.00 },
};
const HOJAS = {
  cordada:   { nombre:'Cordada',   adj:'cordada',   rareza:0, emo:'🍃' },
  plumada:   { nombre:'Plumada',   adj:'plumada',   rareza:1, emo:'🌿' },
  abanicada: { nombre:'Abanicada', adj:'abanicada', rareza:2, emo:'🍀' },
};
const SATURACIONES = ['pastel', 'media', 'intensa'];
const TALLAS = ['enana', 'media', 'alta'];

/* Los cortes están calibrados sobre el reparto real de `genSilvestre(0.22)`:
   una semilla de pradera sale común o poco común casi siempre, y hace falta
   cruzar en serio para subir de escalón. */
const RAREZAS = [
  { id:'comun',      nombre:'Común',      min:0,  color:'#a8b99a', mult:1.00, xp:1.0 },
  { id:'poco',       nombre:'Poco común', min:6,  color:'#89b7c9', mult:1.55, xp:1.4 },
  { id:'raro',       nombre:'Raro',       min:10, color:'#8f9fe0', mult:2.60, xp:2.1 },
  { id:'epico',      nombre:'Épico',      min:14, color:'#b98cd6', mult:4.80, xp:3.2 },
  { id:'legendario', nombre:'Legendario', min:18, color:'#e0a95c', mult:9.50, xp:5.0 },
  { id:'mitico',     nombre:'Mítico',     min:22, color:'#e07f9b', mult:19.0, xp:8.0 },
  { id:'divino',     nombre:'Divino',     min:25, color:'#7fd3c4', mult:38.0, xp:13.0 },
];
const rarezaPorId = id => RAREZAS.find(r => r.id === id) || RAREZAS[0];

/**
 * Cultivares secretos: combinaciones exactas que dan una flor con nombre propio.
 * Se comprueban en orden; la primera que encaje manda.
 */
const SECRETOS = [
  { id:'aurora',   nombre:'Aurora Boreal',      rareza:'divino',     emo:'🌌',
    pista:'Una esmeralda que brilla, en su forma más intensa.',
    cond:(f)=> f.brillo && f.color === '202' && f.sat === 2 },
  { id:'onix',     nombre:'Corazón de Ónix',    rareza:'divino',     emo:'🖤',
    pista:'Los tres pigmentos al máximo, luminiscente y en estrella.',
    cond:(f)=> f.brillo && f.color === '222' && f.forma === 'F1' },
  { id:'fantasma', nombre:'Fantasma de Cristal',rareza:'mitico',     emo:'👻',
    pista:'Albina y brillante a la vez.',
    cond:(f)=> f.brillo && f.color === 'alb' },
  { id:'quimera',  nombre:'Quimera Perfecta',   rareza:'divino',     emo:'🧬',
    pista:'Los doce loci heterocigotos al mismo tiempo.',
    cond:(f,g)=> LOCI.every(l => g[l.id][0] !== g[l.id][1]) },
  { id:'linaje',   nombre:'Linaje Puro',        rareza:'legendario', emo:'⚜️',
    pista:'Los doce loci homocigotos y ningún pigmento apagado.',
    cond:(f,g)=> LOCI.every(l => g[l.id][0] === g[l.id][1]) && f.color !== 'alb' },
  { id:'crepusculo',nombre:'Flor del Crepúsculo',rareza:'mitico',    emo:'🌆',
    pista:'Violeta intensa, en campana y con néctar.',
    cond:(f)=> f.color === '210' && f.sat === 2 && f.forma === 'F3' && f.nectar },
  { id:'sirena',   nombre:'Canto de Sirena',    rareza:'mitico',     emo:'🧜',
    pista:'Turquesa, hoja abanicada y luminiscente.',
    cond:(f)=> f.color === '201' && f.hoja === 'abanicada' && f.brillo },
  { id:'sol',      nombre:'Corona del Sol',     rareza:'legendario', emo:'👑',
    pista:'Ámbar intenso, alta y en estrella.',
    cond:(f)=> f.color === '002' && f.sat === 2 && f.talla === 2 && f.forma === 'F1' },
  { id:'luna',     nombre:'Lágrima de Luna',    rareza:'legendario', emo:'🌙',
    pista:'Blanco nube pastel, enana y brillante.',
    cond:(f)=> f.color === '000' && f.sat === 0 && f.talla === 0 && f.brillo },
  { id:'sangre',   nombre:'Rosa de Sangre',     rareza:'legendario', emo:'🩸',
    pista:'Carmesí intensa, genoma inestable y en copa.',
    cond:(f)=> f.color === '020' && f.sat === 2 && !f.estable && f.forma === 'F2' },
  { id:'bruma',    nombre:'Velo de Bruma',      rareza:'epico',      emo:'🌫️',
    pista:'Bruma gris pastel con hoja plumada.',
    cond:(f)=> f.color === '111' && f.sat === 0 && f.hoja === 'plumada' },
  { id:'miel',     nombre:'Gota de Miel',       rareza:'epico',      emo:'🍯',
    pista:'Melocotón con néctar y crecimiento vigoroso.',
    cond:(f)=> f.color === '011' && f.nectar && f.vigor },
  { id:'jade',     nombre:'Jade Imperial',      rareza:'mitico',     emo:'💚',
    pista:'Jade suave, alta, en estrella y con néctar.',
    cond:(f)=> f.color === '211' && f.talla === 2 && f.forma === 'F1' && f.nectar },
  { id:'cenizas',  nombre:'Flor de Cenizas',    rareza:'epico',      emo:'🌑',
    pista:'Ónix pastel: todo el pigmento, apagado.',
    cond:(f)=> f.color === '222' && f.sat === 0 },
  { id:'primera',  nombre:'Primera Nevada',     rareza:'epico',      emo:'❄️',
    pista:'Albina, enana y en campana.',
    cond:(f)=> f.color === 'alb' && f.talla === 0 && f.forma === 'F3' },
  { id:'fenix',    nombre:'Pluma de Fénix',     rareza:'mitico',     emo:'🔥',
    pista:'Fuego ocre intenso, hoja plumada, alta y vigorosa.',
    cond:(f)=> f.color === '022' && f.sat === 2 && f.hoja === 'plumada' && f.talla === 2 && f.vigor },
  { id:'nostalgia',nombre:'Nostalgia de Otoño', rareza:'legendario', emo:'🍂',
    pista:'Terracota media, hoja abanicada y genoma inestable.',
    cond:(f)=> f.color === '121' && f.sat === 1 && f.hoja === 'abanicada' && !f.estable },
  { id:'catalina', nombre:'Rincón de Catalina', rareza:'divino',     emo:'💌',
    pista:'Rosa rubor pastel, en copa, con néctar, luminiscente y enana.',
    cond:(f)=> f.color === '010' && f.sat === 0 && f.forma === 'F2' && f.nectar && f.brillo && f.talla === 0 },
  { id:'diego',    nombre:'Faro de Diego',      rareza:'divino',     emo:'🕯️',
    pista:'Índigo intenso, alta, en campana, luminiscente y estable.',
    cond:(f)=> f.color === '200' && f.sat === 2 && f.talla === 2 && f.forma === 'F3' && f.brillo && f.estable },
  { id:'cactus',   nombre:'Corazón del Desierto', rareza:'legendario', emo:'🌵',
    pista:'Suculenta y ámbar intensa: criada en el desierto.',
    cond:(f)=> f.rasgo === 'suculenta' && f.color === '002' && f.sat === 2 },
  { id:'orquidea', nombre:'Orquídea Fantasma',  rareza:'mitico',     emo:'💮',
    pista:'Perfumada, albina y con néctar, en el trópico.',
    cond:(f)=> f.rasgo === 'perfumada' && f.color === 'alb' && f.nectar },
  { id:'edelweiss',nombre:'Estrella de Escarcha',rareza:'mitico',    emo:'❄️',
    pista:'Escarchada, blanco nube y en estrella, criada en el alpino.',
    cond:(f)=> f.rasgo === 'escarchada' && f.color === '000' && f.forma === 'F1' },
  { id:'oasis',    nombre:'Flor del Oasis',     rareza:'mitico',     emo:'🏜️',
    pista:'Suculenta turquesa que además brilla.',
    cond:(f)=> f.rasgo === 'suculenta' && f.color === '201' && f.brillo },
  { id:'selva',    nombre:'Corona de la Selva', rareza:'divino',     emo:'🌴',
    pista:'Perfumada esmeralda intensa, alta y en copa.',
    cond:(f)=> f.rasgo === 'perfumada' && f.color === '202' && f.sat === 2 && f.talla === 2 && f.forma === 'F2' },
  { id:'ventisca', nombre:'Alma de Ventisca',   rareza:'divino',     emo:'🌨️',
    pista:'Escarchada índigo intensa, luminiscente y abanicada.',
    cond:(f)=> f.rasgo === 'escarchada' && f.color === '200' && f.sat === 2 && f.brillo && f.hoja === 'abanicada' },
  { id:'trinidad', nombre:'Trinidad Botánica',  rareza:'divino',     emo:'🔱',
    pista:'Los tres genes dormidos en homocigoto dominante (QQ, RR y WW) a la vez, y criada en un bioma.',
    // Homocigoto en los tres a propósito: con heterocigotos salía a cada rato
    // y una flor divina no puede ser lo más común del invernadero.
    cond:(f,g)=> !!f.rasgo && g.Q[0] === 'Q' && g.Q[1] === 'Q'
                 && g.R[0] === 'R' && g.R[1] === 'R' && g.W[0] === 'W' && g.W[1] === 'W' },
  { id:'eterna',   nombre:'Flor Eterna',        rareza:'divino',     emo:'♾️',
    pista:'Magenta real intensa, estrella, abanicada, alta, con néctar y brillo.',
    cond:(f)=> f.color === '220' && f.sat === 2 && f.forma === 'F1' && f.hoja === 'abanicada'
               && f.talla === 2 && f.nectar && f.brillo },
];

/**
 * Traduce un genotipo a todo lo observable. Es la única fuente de verdad
 * visual. `bioma` decide si se expresa el rasgo dormido correspondiente:
 * la misma semilla da una flor distinta en el desierto que en el trópico.
 */
function fenotipo(g, bioma) {
  const dosis = (id, al) => g[id].filter(x => x === al).length;
  const a = dosis('A', 'A'), b = dosis('B', 'B'), c = dosis('C', 'C');
  const albina = !g.P.includes('P');
  const color = albina ? 'alb' : '' + a + b + c;
  const sat = dosis('S', 'S');
  const forma = ORDEN_F.find(al => g.F.includes(al)) || 'f';
  const hoja = g.H[0] === g.H[1] ? (g.H[0] === 'Hc' ? 'cordada' : 'plumada') : 'abanicada';
  const talla = dosis('T', 'T');
  const f = {
    dosisA:a, dosisB:b, dosisC:c, albina, color, sat, forma, hoja, talla,
    vigor: g.G.includes('G'),
    estable: g.M.includes('M'),
    brillo: !g.X.includes('X'),
    nectar: g.N.includes('N'),
  };
  // Rasgo de bioma: solo se expresa donde corresponde y si lleva el dominante.
  f.bioma = (bioma && BIOMAS[bioma]) ? bioma : 'patio';
  const bio = BIOMAS[f.bioma];
  f.rasgo = (bio.locus && g[bio.locus] && g[bio.locus].includes(bio.locus)) ? bio.rasgo : null;
  f.hex = hexDe(f);
  f.hexHoja = hexHojaDe(f);
  f.puntos = puntosRareza(f, g);
  const sec = SECRETOS.find(s => s.cond(f, g));
  f.secreto = sec ? sec.id : null;
  f.rareza = sec ? sec.rareza : rarezaDePuntos(f.puntos);
  const suf = f.rasgo ? '-' + RASGOS_BIOMA[f.rasgo].suf : '';
  f.especie = sec ? 'sec-' + sec.id : `${f.forma}-${f.color}-${f.hoja}${suf}`;
  f.nombre = sec ? sec.nombre : nombreEspecie(f);
  f.cientifico = sec ? 'Cultivar «' + sec.nombre + '»' : cientificoDe(f);
  f.emo = sec ? sec.emo : (f.rasgo ? RASGOS_BIOMA[f.rasgo].emo : FORMAS[f.forma].emo);
  return f;
}

function hexDe(f) {
  const base = COLORES[f.color].hex;
  if (f.sat === 0) return tinte(base, 0, -22, 12);   // pastel: lavado
  if (f.sat === 2) return tinte(base, 0, 16, -11);   // intensa: profunda
  return base;
}
function hexHojaDe(f) {
  const base = f.hoja === 'plumada' ? '#7fa274' : f.hoja === 'abanicada' ? '#93b285' : '#6f9a63';
  const desvio = (f.dosisA - f.dosisC) * 7;          // el pigmento tiñe también la hoja
  return tinte(base, desvio, f.sat === 2 ? 8 : -4, f.sat === 0 ? 7 : 0);
}

function puntosRareza(f, g) {
  let p = 0;
  if (f.color === 'alb') p += 3;
  else {
    const suma = f.dosisA + f.dosisB + f.dosisC;
    const distintos = [f.dosisA, f.dosisB, f.dosisC].filter(x => x > 0).length;
    p += suma + Math.max(0, distintos - 1) * 2;
  }
  p += FORMAS[f.forma].rareza;
  p += HOJAS[f.hoja].rareza;
  p += f.sat === 1 ? 0 : f.sat === 0 ? 1 : 2;
  p += f.talla === 1 ? 0 : 1;
  if (f.brillo) p += 6;
  if (f.nectar) p += 1;
  if (!f.estable) p += 1;
  if (f.rasgo) p += RASGOS_BIOMA[f.rasgo].puntos;
  return p;
}
function rarezaDePuntos(p) {
  let r = RAREZAS[0];
  for (const x of RAREZAS) if (p >= x.min) r = x;
  return r.id;
}
function nombreEspecie(f) {
  const base = FORMAS[f.forma].genero + ' ' + COLORES[f.color].ep + ' ' + HOJAS[f.hoja].adj;
  return f.rasgo ? base + ' ' + RASGOS_BIOMA[f.rasgo].adj : base;
}
function cientificoDe(f) {
  const ep = COLORES[f.color].ep.replace(/[áéíóú]/g, m => 'aeiou'['áéíóú'.indexOf(m)]);
  return FORMAS[f.forma].genero.toLowerCase().replace(/^./, c => c.toUpperCase()) + ' ' +
         ep.toLowerCase() + ' var. ' + HOJAS[f.hoja].adj.toLowerCase() +
         (f.rasgo ? ' f. ' + RASGOS_BIOMA[f.rasgo].adj.toLowerCase() : '');
}

/** Lista completa de especies posibles (para el herbario). */
function todasLasEspecies() {
  const out = [];
  // Sin rasgo (patio) y una variante por cada rasgo de bioma.
  const rasgos = [null].concat(Object.keys(RASGOS_BIOMA));
  Object.keys(FORMAS).forEach(fo => {
    CLAVES_COLOR.forEach(col => {
      Object.keys(HOJAS).forEach(ho => {
        rasgos.forEach(ra => {
          const suf = ra ? '-' + RASGOS_BIOMA[ra].suf : '';
          out.push({ id:`${fo}-${col}-${ho}${suf}`, forma:fo, color:col, hoja:ho, rasgo:ra, secreto:false });
        });
      });
    });
  });
  SECRETOS.forEach(s => out.push({ id:'sec-' + s.id, secreto:true, ref:s }));
  return out;
}
const ESPECIES = todasLasEspecies();
const ESPECIES_TOTAL = ESPECIES.length;

/** Reconstruye un fenotipo "de muestra" desde un id de especie (para el herbario). */
function fenotipoDeEspecie(id) {
  if (id.startsWith('sec-')) {
    const s = SECRETOS.find(x => 'sec-' + x.id === id);
    return { secreto:s.id, nombre:s.nombre, rareza:s.rareza, emo:s.emo, forma:'F1',
             color:'222', hoja:'abanicada', sat:2, talla:1, brillo:true, nectar:true,
             estable:true, vigor:true, dosisA:2, dosisB:2, dosisC:2, albina:false, rasgo:null,
             hex:'#6b5f7a', hexHoja:'#7fa274', cientifico:'Cultivar «' + s.nombre + '»', puntos:22 };
  }
  let [forma, color, hoja, suf] = String(id).split('-');
  // Un guardado viejo o un respaldo dañado puede traer ids que ya no existen:
  // mejor devolver una ficha neutra que reventar el herbario entero.
  if (!FORMAS[forma]) forma = 'f';
  if (!COLORES[color]) color = '000';
  if (!HOJAS[hoja]) hoja = 'cordada';
  const rasgo = SUFIJOS_RASGO[suf] || null;
  const f = { forma, color, hoja, rasgo, sat:1, talla:1, brillo:false, nectar:false, estable:true,
              vigor:true, albina: color === 'alb',
              dosisA: color === 'alb' ? 0 : +color[0],
              dosisB: color === 'alb' ? 0 : +color[1],
              dosisC: color === 'alb' ? 0 : +color[2] };
  f.hex = hexDe(f); f.hexHoja = hexHojaDe(f);
  f.puntos = puntosRareza(f, null);
  f.rareza = rarezaDePuntos(f.puntos);
  f.nombre = nombreEspecie(f);
  f.cientifico = cientificoDe(f);
  f.emo = FORMAS[forma].emo;
  f.especie = id;
  return f;
}

/** Precio base de una flor, antes de mercado y bonos. */
function precioBase(f) {
  let p = 14 + Math.pow(f.puntos, 1.62) * 3.1;
  p *= rarezaPorId(f.rareza).mult;
  p *= FORMAS[f.forma].precio;
  p *= 1 + f.talla * 0.09;
  if (f.nectar) p *= 1.22;
  if (f.brillo) p *= 1.9;
  if (f.rasgo) p *= RASGOS_BIOMA[f.rasgo].precio;
  if (f.secreto) p *= 2.4;
  return Math.round(p);
}
/** XP que da cosechar esta flor. */
const xpDe = f => Math.round(3 + f.puntos * 1.1 + rarezaPorId(f.rareza).xp * 3.2);

/* ============================================================
   4. DIBUJO DE PLANTAS (SVG generado)
   Cinco etapas: semilla, brote, tallo, capullo y flor.
   ============================================================ */
const ETAPAS = [
  { id:'semilla', nombre:'Semilla', hasta:0.16 },
  { id:'brote',   nombre:'Brote',   hasta:0.40 },
  { id:'tallo',   nombre:'Tallo',   hasta:0.68 },
  { id:'capullo', nombre:'Capullo', hasta:0.92 },
  { id:'flor',    nombre:'En flor', hasta:1.01 },
];
const etapaDe = p => ETAPAS.findIndex(e => p < e.hasta) === -1 ? 4 : ETAPAS.findIndex(e => p < e.hasta);

function hojaPath(tipo, x, y, largo, lado) {
  const s = lado; // 1 derecha, -1 izquierda
  if (tipo === 'plumada') {
    let d = `M${x},${y}`;
    for (let i = 1; i <= 3; i++) {
      const px = x + s * largo * (i / 3), py = y - largo * 0.16 * i;
      d += ` q${s * largo * 0.16},${-largo * 0.3} ${s * largo * 0.33},${-largo * 0.06}`;
      d += ` q${-s * largo * 0.13},${largo * 0.22} ${-s * largo * 0.02},${largo * 0.04}`;
      if (i < 3) d += ` M${px},${py}`;
    }
    return d;
  }
  if (tipo === 'abanicada') {
    return `M${x},${y} q${s * largo * 0.5},${-largo * 0.62} ${s * largo},${-largo * 0.2}
            q${-s * largo * 0.42},${largo * 0.5} ${-s * largo},${largo * 0.2}Z`;
  }
  return `M${x},${y} q${s * largo * 0.55},${-largo * 0.52} ${s * largo * 0.92},${-largo * 0.04}
          q${-s * largo * 0.3},${largo * 0.52} ${-s * largo * 0.92},${largo * 0.04}Z`;
}

function petalosSVG(f, cx, cy, r) {
  const c1 = f.hex, c2 = tinte(f.hex, 0, 6, -13), c3 = tinte(f.hex, 0, -12, 17);
  let s = '';
  if (f.forma === 'F1') {                       // estrella: seis pétalos en punta
    for (let i = 0; i < 6; i++) {
      const ang = (i * 60) - 90;
      s += `<path d="M${cx},${cy} L${cx - r * 0.26},${cy - r * 0.5} L${cx},${cy - r * 1.12} L${cx + r * 0.26},${cy - r * 0.5}Z"
        fill="${i % 2 ? c1 : c2}" transform="rotate(${ang} ${cx} ${cy})" stroke="${c2}" stroke-width=".6" stroke-linejoin="round"/>`;
    }
  } else if (f.forma === 'F2') {                // copa: tres pétalos de tulipán
    const petalo = (giro, relleno, borde) =>
      `<path d="M${cx},${cy + r * 0.52} C${cx - r * 0.52},${cy + r * 0.18} ${cx - r * 0.48},${cy - r * 0.86} ${cx},${cy - r * 1.04}
        C${cx + r * 0.48},${cy - r * 0.86} ${cx + r * 0.52},${cy + r * 0.18} ${cx},${cy + r * 0.52}Z"
        fill="${relleno}" stroke="${borde}" stroke-width=".6" stroke-linejoin="round"
        transform="rotate(${giro} ${cx} ${cy + r * 0.5})"/>`;
    s += petalo(-30, c2, c2) + petalo(30, c2, c2) + petalo(0, c1, c2);
    s += `<path d="M${cx},${cy + r * 0.3} Q${cx - r * 0.14},${cy - r * 0.4} ${cx},${cy - r * 0.86}
      Q${cx + r * 0.14},${cy - r * 0.4} ${cx},${cy + r * 0.3}Z" fill="${c3}" opacity=".55"/>`;
  } else if (f.forma === 'F3') {                // campana colgante del extremo del tallo
    s += `<path d="M${cx - r * 0.18},${cy - r * 0.98} C${cx - r * 0.8},${cy - r * 0.5} ${cx - r * 0.76},${cy + r * 0.24} ${cx - r * 0.6},${cy + r * 0.58}
      Q${cx},${cy + r * 0.92} ${cx + r * 0.6},${cy + r * 0.58}
      C${cx + r * 0.76},${cy + r * 0.24} ${cx + r * 0.8},${cy - r * 0.5} ${cx + r * 0.18},${cy - r * 0.98}Z"
      fill="${c1}" stroke="${c2}" stroke-width=".7" stroke-linejoin="round"/>`;
    // Borde festoneado de la boca
    s += `<path d="M${cx - r * 0.6},${cy + r * 0.58} q${r * 0.2},${r * 0.26} ${r * 0.4},${r * 0.02}
      q${r * 0.2},${r * 0.26} ${r * 0.4},${r * 0.02} q${r * 0.2},${r * 0.26} ${r * 0.4},${-r * 0.04}"
      fill="none" stroke="${c2}" stroke-width="1.1" stroke-linecap="round"/>`;
    s += `<path d="M${cx},${cy + r * 0.7} l0,${r * 0.3}" stroke="${tinte(f.hex, 20, 12, 26)}" stroke-width="1.2" stroke-linecap="round"/>`;
    s += `<ellipse cx="${cx - r * 0.3}" cy="${cy - r * 0.3}" rx="${r * 0.16}" ry="${r * 0.4}" fill="${c3}" opacity=".5"/>`;
  } else {                                      // sencilla: cinco pétalos redondos
    for (let i = 0; i < 5; i++) {
      const ang = (i * 72) - 90;
      s += `<ellipse cx="${cx}" cy="${cy - r * 0.66}" rx="${r * 0.36}" ry="${r * 0.56}"
        fill="${i % 2 ? c1 : tinte(c1, 0, 0, 4)}" stroke="${c2}" stroke-width=".55"
        transform="rotate(${ang} ${cx} ${cy})"/>`;
    }
  }
  const centro = f.forma === 'F3' ? '' :
    `<circle cx="${cx}" cy="${cy}" r="${r * 0.3}" fill="${tinte(f.hex, 18, 10, 22)}"/>
     <circle cx="${cx}" cy="${cy}" r="${r * 0.17}" fill="${tinte(f.hex, 26, 18, 34)}"/>`;
  return s + centro;
}

/**
 * Dibuja una planta completa.
 * @param {object} f  fenotipo
 * @param {number} prog 0..1 progreso de crecimiento
 * @param {object} opt { escala, sombra, id }
 */
function svgPlanta(f, prog, opt) {
  opt = opt || {};
  const p = lim(prog === undefined ? 1 : prog, 0, 1);
  const et = etapaDe(p);
  const suelo = 92;
  const alturaMax = 30 + f.talla * 14;
  const alt = alturaMax * lim((p - 0.1) / 0.72, 0.06, 1);
  const tallo = f.hexHoja;
  const uid = opt.id || ('g' + Math.random().toString(36).slice(2, 7));
  let s = `<svg class="planta-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">`;

  if (opt.sombra !== false) {
    s += `<ellipse cx="50" cy="${suelo + 2}" rx="${16 + alt * 0.16}" ry="3.4" fill="rgba(70,52,32,.22)"/>`;
  }

  if (et === 0) {                                        // ---- semilla
    const asoma = p / 0.16;
    s += `<ellipse cx="50" cy="${suelo - 2}" rx="4.2" ry="5.4" fill="#a98357" transform="rotate(-12 50 ${suelo - 2})"/>`;
    s += `<path d="M46.4,${suelo - 4} q3.6,-2.4 7.2,0" stroke="#8a693f" stroke-width="1" fill="none"/>`;
    if (asoma > .55) s += `<path d="M50,${suelo - 6} q1,-4 3.6,-5.4" stroke="${tallo}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`;
    return s + '</svg>';
  }

  const cima = suelo - alt;
  // Tallo
  const curva = (f.talla - 1) * 3;
  s += `<path d="M50,${suelo} Q${50 + curva},${suelo - alt * 0.55} 50,${cima}"
     stroke="${tallo}" stroke-width="${2 + f.talla * 0.5}" fill="none" stroke-linecap="round"/>`;

  // Hojas: aparecen desde el brote y se multiplican con la altura
  const nHojas = et === 1 ? 2 : Math.min(6, 2 + Math.floor(alt / 13));
  for (let i = 0; i < nHojas; i++) {
    const y = suelo - (alt * (0.2 + 0.66 * (i / Math.max(1, nHojas - 1))));
    const lado = i % 2 ? 1 : -1;
    const largo = (9 + f.talla * 1.6) * (et === 1 ? 0.72 : 1) * (1 - i * 0.05);
    s += `<path d="${hojaPath(f.hoja, 50, y, largo, lado)}" fill="${f.hoja === 'plumada' ? 'none' : tinte(f.hexHoja, 0, 0, i % 2 ? 3 : -3)}"
      stroke="${tinte(f.hexHoja, 0, 4, -12)}" stroke-width="${f.hoja === 'plumada' ? 1.3 : 0.6}" stroke-linecap="round"/>`;
  }

  if (et === 1) return s + '</svg>';

  if (et === 2) {                                        // ---- tallo sin capullo
    s += `<circle cx="50" cy="${cima}" r="2" fill="${tinte(f.hexHoja, 0, 6, 10)}"/>`;
    return s + '</svg>';
  }

  if (et === 3) {                                        // ---- capullo
    const abre = (p - ETAPAS[2].hasta) / (ETAPAS[3].hasta - ETAPAS[2].hasta);
    const r = 4 + abre * 3;
    s += `<ellipse cx="50" cy="${cima - r * 0.4}" rx="${r * 0.78}" ry="${r}" fill="${tinte(f.hex, 0, -10, -6)}"/>`;
    s += `<path d="M${50 - r * 0.8},${cima + r * 0.3} q${r * 0.8},${-r * 0.7} ${r * 1.6},0"
       fill="none" stroke="${f.hexHoja}" stroke-width="1.4"/>`;
    if (abre > .55) s += `<path d="M50,${cima - r * 1.3} q1.5,-2 0,-3.4" stroke="${f.hex}" stroke-width="1.4" fill="none" stroke-linecap="round"/>`;
    return s + '</svg>';
  }

  // ---- flor abierta
  const r = 11 + f.talla * 1.6;
  // La campana cuelga del extremo del tallo; el resto se apoya encima.
  const cy = f.forma === 'F3' ? cima + r * 0.62 : cima - r * 0.38;
  if (f.brillo) {
    s += `<defs><radialGradient id="br${uid}"><stop offset="0%" stop-color="${tinte(f.hex, 0, 20, 26)}" stop-opacity=".85"/>
      <stop offset="100%" stop-color="${f.hex}" stop-opacity="0"/></radialGradient></defs>
      <circle cx="50" cy="${cy}" r="${r * 2.1}" fill="url(#br${uid})" class="halo"/>`;
  }
  s += petalosSVG(f, 50, cy, r);
  if (f.nectar) {
    s += `<circle cx="${50 + r * 0.42}" cy="${cy - r * 0.42}" r="1.5" fill="#fff5c8" opacity=".9"/>`;
  }
  return s + '</svg>';
}

/** Miniatura para fichas de inventario y herbario. */
function svgMini(f, tam) {
  const t = tam || 34;
  return `<span style="display:block;width:${t}px;height:${t}px">${svgPlanta(f, 1, { sombra:false })}</span>`;
}
/** Icono de semilla teñido con el color que dará. */
function svgSemilla(f) {
  return `<svg viewBox="0 0 100 100" class="planta-svg" aria-hidden="true">
    <ellipse cx="50" cy="56" rx="21" ry="27" fill="${tinte(f.hex, 0, -30, -14)}" transform="rotate(-14 50 56)"/>
    <ellipse cx="44" cy="46" rx="7" ry="10" fill="${tinte(f.hex, 0, -12, 22)}" opacity=".55" transform="rotate(-14 44 46)"/>
    <path d="M50,30 q3,-9 11,-13" stroke="${f.hexHoja}" stroke-width="4" fill="none" stroke-linecap="round"/>
  </svg>`;
}

/* ============================================================
   5. CONTENIDO DEL JUEGO
   ============================================================ */

/* ---------- 5.1 Semillas de la tienda ---------- */
const SEMILLAS = [
  { id:'silvestre', nombre:'Semilla silvestre', emo:'🌾', precio:30, nivel:1,
    desc:'De la pradera de al lado. Casi siempre sencilla, pero algo esconde.',
    gen:() => genSilvestre(0.20) },
  { id:'pradera', nombre:'Semilla de pradera', emo:'🌱', precio:140, nivel:3,
    desc:'Más variada: sube la probabilidad de alelos dominantes.',
    gen:() => genSilvestre(0.34) },
  { id:'azul', nombre:'Línea pura índigo', emo:'💙', precio:520, nivel:5,
    desc:'Homocigota AA: dos dosis de azul garantizadas.',
    gen:() => genDe('AA bb cc PP Ss ff HcHc Tt Gg MM XX Nn') },
  { id:'rojo', nombre:'Línea pura carmesí', emo:'❤️', precio:520, nivel:5,
    desc:'Homocigota BB: dos dosis de rojo garantizadas.',
    gen:() => genDe('aa BB cc PP Ss ff HcHc Tt Gg MM XX Nn') },
  { id:'amarillo', nombre:'Línea pura ámbar', emo:'💛', precio:520, nivel:5,
    desc:'Homocigota CC: dos dosis de amarillo garantizadas.',
    gen:() => genDe('aa bb CC PP Ss ff HcHc Tt Gg MM XX Nn') },
  { id:'estrella', nombre:'Estirpe estrellada', emo:'✴️', precio:1400, nivel:8, invest:'gen1',
    desc:'F1F1: corola en estrella fija, el alelo más dominante de la serie.',
    gen:() => genDe('Aa Bb cc PP Ss F1F1 HcHp Tt Gg MM XX Nn') },
  { id:'campana', nombre:'Estirpe acampanada', emo:'🔔', precio:900, nivel:6,
    desc:'F3F3: campanas colgantes, sin sorpresas de corola.',
    gen:() => genDe('aa Bb Cc PP Ss F3F3 HpHp Tt Gg MM XX Nn') },
  { id:'copa', nombre:'Estirpe de copa', emo:'🏵️', precio:1100, nivel:7,
    desc:'F2F2: la copa abierta, intermedia en la jerarquía.',
    gen:() => genDe('Aa bb Cc PP Ss F2F2 HcHp Tt Gg MM XX Nn') },
  { id:'albina', nombre:'Semilla albina', emo:'🤍', precio:760, nivel:6,
    desc:'pp: sin pigmento. Sirve para esconder color y soltarlo en la F2.',
    gen:() => genDe('Aa Bb Cc pp Ss ff HcHc Tt Gg MM XX Nn') },
  { id:'nectar', nombre:'Semilla melífera', emo:'🍯', precio:1600, nivel:9,
    desc:'NN: néctar asegurado. Vale más y atrae clientes especiales.',
    gen:() => genDe('Aa Bb Cc PP Ss ff HcHp Tt Gg MM XX NN') },
  { id:'gigante', nombre:'Semilla de talla alta', emo:'🌳', precio:1300, nivel:9,
    desc:'TT: tallo largo, más flor y más precio.',
    gen:() => genDe('Aa Bb Cc PP Ss ff HpHp TT Gg MM XX Nn') },
  { id:'inestable', nombre:'Semilla inestable', emo:'☢️', precio:2400, nivel:11, invest:'gen2',
    desc:'mm: el genoma se descuadra. Muta muchísimo más… y se enferma más.',
    gen:() => genDe('Aa Bb Cc PP Ss F2f HcHp Tt Gg mm Xx Nn') },
  { id:'portadora', nombre:'Portadora luminiscente', emo:'✨', precio:9500, nivel:14, invest:'gen3',
    desc:'Xx garantizado: no brilla, pero un cuarto de sus hijos con otra portadora sí.',
    gen:() => genDe('Aa Bb Cc PP Ss F2f HcHp Tt Gg MM Xx Nn') },
  { id:'exotica', nombre:'Semilla exótica', emo:'🎴', precio:6200, nivel:12, invest:'com2',
    desc:'Traída de lejos. Todo al azar y con los dominantes muy cargados.',
    gen:() => genSilvestre(0.62) },
  { id:'saturada', nombre:'Estirpe saturada', emo:'🎨', precio:3400, nivel:12,
    desc:'SS: saturación intensa fija. Los colores salen profundos.',
    gen:() => genDe('Aa Bb Cc PP SS F2f HcHp Tt Gg MM XX Nn') },
  { id:'pastel', nombre:'Estirpe pastel', emo:'🕊️', precio:2600, nivel:10,
    desc:'ss: colores lavados, muy buscados por los coleccionistas de tonos suaves.',
    gen:() => genDe('Aa Bb Cc PP ss F3f HcHc Tt Gg MM XX Nn') },
  { id:'triple', nombre:'Semilla tricolor', emo:'🌈', precio:14000, nivel:16, invest:'rar2',
    desc:'AaBbCc con todo activado: la base para buscar ónix y grises raros.',
    gen:() => genDe('Aa Bb Cc PP Ss F1F2 HcHp Tt Gg Mm Xx NN') },
  { id:'reliquia', nombre:'Semilla reliquia', emo:'🏺', precio:42000, nivel:20, invest:'rar4',
    desc:'Un genoma cargadísimo. Casi todo dominante y luminiscencia portada.',
    gen:() => genDe('AA Bb CC PP SS F1F1 HcHp TT GG Mm Xx NN') },
];
const semillaPorId = id => SEMILLAS.find(s => s.id === id);

/* ---------- 5.2 Árbol de investigación ---------- */
const RAMAS_INV = [
  { id:'bot', nombre:'Botánica',       emo:'🌿' },
  { id:'gen', nombre:'Genética',       emo:'🧬' },
  { id:'aut', nombre:'Automatización', emo:'⚙️' },
  { id:'com', nombre:'Comercio',       emo:'🛒' },
  { id:'inf', nombre:'Infraestructura',emo:'🏗️' },
  { id:'rar', nombre:'Arcano',         emo:'🔮' },
];
const INVESTIGACION = [
  // --- Botánica
  { id:'bot1', rama:'bot', nombre:'Compost casero', emo:'🍂', oro:400, ci:6, req:[],
    desc:'+20% de velocidad de crecimiento.' },
  { id:'bot2', rama:'bot', nombre:'Sustrato aireado', emo:'🪵', oro:2200, ci:18, req:['bot1'],
    desc:'+25% más de velocidad y la tierra retiene mejor el agua.' },
  { id:'bot3', rama:'bot', nombre:'Micorrizas', emo:'🍄', oro:9000, ci:44, req:['bot2'],
    desc:'+30% de velocidad y +1 semilla por cosecha.' },
  { id:'bot4', rama:'bot', nombre:'Hidroponía', emo:'💧', oro:36000, ci:110, req:['bot3'],
    desc:'+40% de velocidad; el agua baja la mitad de rápido.' },
  { id:'bot5', rama:'bot', nombre:'Fotosíntesis mejorada', emo:'🔆', oro:150000, ci:280, req:['bot4'],
    desc:'+55% de velocidad y las plantas ya no se enferman por sequía leve.' },
  { id:'bot6', rama:'bot', nombre:'Simbiosis total', emo:'🌍', oro:900000, ci:900, req:['bot5'],
    desc:'+80% de velocidad y +2 semillas por cosecha.' },
  // --- Genética
  { id:'gen1', rama:'gen', nombre:'Microscopio', emo:'🔬', oro:900, ci:10, req:[],
    desc:'Deja ver el ADN completo de cualquier planta o semilla.' },
  { id:'gen2', rama:'gen', nombre:'Cuadro de Punnett', emo:'📐', oro:4200, ci:26, req:['gen1'],
    desc:'Predice la descendencia de un cruce antes de hacerlo.' },
  { id:'gen3', rama:'gen', nombre:'Marcadores moleculares', emo:'🧪', oro:20000, ci:70, req:['gen2'],
    desc:'Muestra los alelos recesivos escondidos (portadores de brillo incluidos).' },
  { id:'gen4', rama:'gen', nombre:'Mutagénesis dirigida', emo:'⚡', oro:80000, ci:190, req:['gen3'],
    desc:'×2 de probabilidad de mutación en todos los cruces.' },
  { id:'gen5', rama:'gen', nombre:'Selección asistida', emo:'🎯', oro:260000, ci:420, req:['gen4'],
    desc:'Cada cruce produce una semilla extra y puedes descartar la peor.' },
  { id:'gen6', rama:'gen', nombre:'Edición fina', emo:'✂️', oro:1400000, ci:1200, req:['gen5'],
    desc:'Permite forzar un locus concreto al cruzar (una vez por cruce).' },
  // --- Automatización
  { id:'aut1', rama:'aut', nombre:'Regadera de goteo', emo:'🚿', oro:1500, ci:8, req:[],
    desc:'Riego automático lento en todas las parcelas.' },
  { id:'aut2', rama:'aut', nombre:'Aspersores', emo:'💦', oro:7000, ci:30, req:['aut1'],
    desc:'El riego automático es tres veces más rápido.' },
  { id:'aut3', rama:'aut', nombre:'Brazo cosechador', emo:'🦾', oro:30000, ci:85, req:['aut2'],
    desc:'Cosecha sola cualquier flor madura.' },
  { id:'aut4', rama:'aut', nombre:'Resiembra automática', emo:'🔁', oro:120000, ci:210, req:['aut3'],
    desc:'Al cosechar replanta sola: el mismo genotipo, o si no una semilla parecida del almacén.' },
  { id:'aut5', rama:'aut', nombre:'Invernadero autónomo', emo:'🤖', oro:520000, ci:560, req:['aut4'],
    desc:'Vende sola la cosecha corriente y, si el almacén se llena, lo más barato que haya.' },
  // --- Comercio
  { id:'com1', rama:'com', nombre:'Puesto en la feria', emo:'🏪', oro:600, ci:5, req:[],
    desc:'+15% al precio de venta.' },
  { id:'com2', rama:'com', nombre:'Cartera de clientes', emo:'📇', oro:5000, ci:24, req:['com1'],
    desc:'+25% al precio y aparecen clientes especiales más seguido.' },
  { id:'com3', rama:'com', nombre:'Denominación de origen', emo:'📜', oro:26000, ci:78, req:['com2'],
    desc:'+40% al precio y la demanda se recupera al doble de rápido.' },
  { id:'com4', rama:'com', nombre:'Exportación', emo:'🚢', oro:140000, ci:230, req:['com3'],
    desc:'+65% al precio y desbloquea contratos grandes.' },
  { id:'com5', rama:'com', nombre:'Casa de subastas', emo:'🔨', oro:700000, ci:640, req:['com4'],
    desc:'+110% al precio; lo épico o mejor paga el doble.' },
  // --- Infraestructura
  { id:'inf1', rama:'inf', nombre:'Estantería', emo:'🗄️', oro:700, ci:4, req:[],
    desc:'+60 de capacidad de almacén.' },
  { id:'inf2', rama:'inf', nombre:'Bodega fría', emo:'🧊', oro:4500, ci:20, req:['inf1'],
    desc:'+140 de capacidad y las semillas no se echan a perder.' },
  { id:'inf3', rama:'inf', nombre:'Cristales dobles', emo:'🪟', oro:18000, ci:60, req:['inf2'],
    desc:'El clima malo afecta la mitad.' },
  { id:'inf4', rama:'inf', nombre:'Control de clima', emo:'🌡️', oro:95000, ci:170, req:['inf3'],
    desc:'Puedes elegir el clima de mañana una vez al día.' },
  { id:'inf5', rama:'inf', nombre:'Domo geodésico', emo:'🔆', oro:420000, ci:480, req:['inf4'],
    desc:'+400 de almacén y la estación deja de penalizar el crecimiento.' },
  // --- Arcano
  { id:'rar1', rama:'rar', nombre:'Polen dorado', emo:'✨', oro:3000, ci:16, req:[],
    desc:'Las cosechas raras a veces dejan polen dorado.' },
  { id:'rar2', rama:'rar', nombre:'Cámara de esporas', emo:'🌫️', oro:16000, ci:55, req:['rar1'],
    desc:'+35% de mutación y desbloquea la semilla tricolor.' },
  { id:'rar3', rama:'rar', nombre:'Lente de rareza', emo:'🔍', oro:70000, ci:160, req:['rar2'],
    desc:'Una de cada veinte ventas se paga como si fuera de la rareza siguiente.' },
  { id:'rar4', rama:'rar', nombre:'Herbario ancestral', emo:'📕', oro:320000, ci:400, req:['rar3'],
    desc:'Revela la pista de los cultivares secretos aún no descubiertos.' },
  { id:'rar5', rama:'rar', nombre:'Jardín de luna', emo:'🌙', oro:1600000, ci:1100, req:['rar4'],
    desc:'De noche, la luminiscencia se hereda con el doble de facilidad.' },
];
const invPorId = id => INVESTIGACION.find(n => n.id === id);

/* ---------- 5.3 Empleados ---------- */
const ROLES = {
  jardinero:   { nombre:'Jardinero',    emo:'👨‍🌾', sueldo:120,  desc:'Riega solo las parcelas más secas.' },
  cientifico:  { nombre:'Científica',   emo:'👩‍🔬', sueldo:260,  desc:'Genera puntos de investigación con el tiempo.' },
  investigador:{ nombre:'Investigador', emo:'🧑‍🎓', sueldo:340,  desc:'Sube la probabilidad de mutación de tus cruces.' },
  vendedor:    { nombre:'Vendedora',    emo:'🧑‍💼', sueldo:300,  desc:'Mejora el precio de venta de todo.' },
  coleccionista:{nombre:'Coleccionista',emo:'🧑‍🎨', sueldo:420,  desc:'Encuentra semillas por su cuenta cada cierto tiempo.' },
  limpiador:   { nombre:'Limpiador',    emo:'🧹', sueldo:180,  desc:'Quita plagas y mantiene la salud de las plantas.' },
};
const NOMBRES_EMP = ['Amparo','Beltrán','Cielo','Dalia','Eneko','Frida','Gael','Hilda','Ignacio','Jazmín',
  'Kira','Lucero','Milena','Nuria','Olmo','Pilar','Quique','Rosalía','Simón','Tomás','Uma','Violeta','Wanda',
  'Ximena','Yago','Zoé','Adela','Bruno','Carmela','Damián','Elisa','Fausto','Greta','Hugo','Irene','Jorge',
  'Katia','Leandro','Marisol','Nicolás','Ofelia','Pablo','Renata','Salvador','Teresa','Ulises','Valeria'];
const HUMORES = [
  { min:80, emo:'😄', nombre:'Feliz',      mult:1.25 },
  { min:55, emo:'🙂', nombre:'Contento',   mult:1.05 },
  { min:30, emo:'😐', nombre:'Normal',     mult:0.90 },
  { min:12, emo:'😕', nombre:'Cansado',    mult:0.70 },
  { min:0,  emo:'😫', nombre:'Agotado',    mult:0.42 },
];
const humorDe = v => HUMORES.find(h => v >= h.min) || HUMORES[HUMORES.length - 1];

/* ---------- 5.4 Decoración ---------- */
const DECORACIONES = [
  { id:'maceta',  nombre:'Maceta pintada',   emo:'🪴', precio:400,     bono:'crec',   val:0.03, desc:'+3% de crecimiento.' },
  { id:'banco',   nombre:'Banco de madera',  emo:'🪑', precio:900,     bono:'animo',  val:4,    desc:'+4 de ánimo diario al equipo.' },
  { id:'farol',   nombre:'Farol de papel',   emo:'🏮', precio:1500,    bono:'crec',   val:0.05, desc:'+5% de crecimiento, también de noche.' },
  { id:'cartel',  nombre:'Cartel del vivero',emo:'🪧', precio:2200,    bono:'precio', val:0.05, desc:'+5% al precio de venta.' },
  { id:'fuente',  nombre:'Fuente de piedra', emo:'⛲', precio:5000,    bono:'agua',   val:0.20, desc:'El agua baja un 20% más lento.' },
  { id:'arbolito',nombre:'Arbolito bonsái',  emo:'🌳', precio:7500,    bono:'crec',   val:0.08, desc:'+8% de crecimiento.' },
  { id:'valla',   nombre:'Valla de mimbre',  emo:'🧺', precio:3200,    bono:'plaga',  val:0.25, desc:'−25% de plagas.' },
  { id:'camino',  nombre:'Camino de piedra', emo:'🛤️', precio:4200,    bono:'animo',  val:6,    desc:'+6 de ánimo diario al equipo.' },
  { id:'colmena', nombre:'Colmena',          emo:'🐝', precio:12000,   bono:'nectar', val:0.15, desc:'+15% al precio de las flores con néctar.' },
  { id:'estatua', nombre:'Estatua de jardín',emo:'🗿', precio:26000,   bono:'precio', val:0.12, desc:'+12% al precio de venta.' },
  { id:'invernaculo',nombre:'Cúpula de vidrio',emo:'🔮',precio:48000,  bono:'clima',  val:0.5,  desc:'El clima adverso pesa la mitad.' },
  { id:'reloj',   nombre:'Reloj de sol',     emo:'🕰️', precio:64000,   bono:'crec',   val:0.14, desc:'+14% de crecimiento.' },
  { id:'lampara', nombre:'Lámpara de cultivo',emo:'💡',precio:90000,   bono:'noche',  val:1,    desc:'De noche ya no se frena el crecimiento.' },
  { id:'mariposas',nombre:'Casa de mariposas',emo:'🦋',precio:130000,  bono:'mut',    val:0.20, desc:'+20% de mutación en los cruces.' },
  { id:'pajarera',nombre:'Pajarera',         emo:'🐦', precio:180000,  bono:'animo',  val:10,   desc:'+10 de ánimo diario al equipo.' },
  { id:'estanque',nombre:'Estanque de nenúfares',emo:'🪷',precio:260000,bono:'agua',  val:0.40, desc:'El agua baja un 40% más lento.' },
  { id:'cristal', nombre:'Cristal de cuarzo',emo:'💎', precio:420000,  bono:'rareza', val:0.05, desc:'+5% de que una venta se pague en la rareza siguiente.' },
  { id:'sauce',   nombre:'Sauce llorón',     emo:'🎋', precio:700000,  bono:'crec',   val:0.22, desc:'+22% de crecimiento.' },
  { id:'templete',nombre:'Templete',         emo:'⛩️', precio:1200000, bono:'precio', val:0.25, desc:'+25% al precio de venta.' },
  { id:'aurora',  nombre:'Aurora embotellada',emo:'🫙', precio:2600000, bono:'brillo', val:0.06, desc:'+6% de que un hijo herede luminiscencia.' },
  { id:'nube',    nombre:'Nube domesticada', emo:'☁️', precio:5000000, bono:'agua',   val:0.75, desc:'Prácticamente no hay que regar.' },
  { id:'meteorito',nombre:'Fragmento de meteorito',emo:'☄️',precio:12000000,bono:'mut',val:0.55,desc:'+55% de mutación.' },
];
const decoPorId = id => DECORACIONES.find(d => d.id === id);

/* ---------- 5.5 Eventos ---------- */
const EVENTOS = [
  { id:'lluvia', nombre:'Lluvia bendita', emo:'🌦️', peso:14, dura:2,
    txt:'Llueve suave sobre el invernadero. Nadie tiene que regar.',
    ef:{ agua:0 } },
  { id:'calor', nombre:'Ola de calor', emo:'🥵', peso:12, dura:2,
    txt:'El aire arde. Las plantas beben el doble y el crecimiento se resiente.',
    ef:{ agua:2.2, crec:0.85 } },
  { id:'festival', nombre:'Festival de las flores', emo:'🎪', peso:10, dura:2,
    txt:'El pueblo se llena de gente: todo se vende mucho más caro.',
    ef:{ precio:2.0 } },
  { id:'competencia', nombre:'Concurso botánico', emo:'🏆', peso:8, dura:3,
    txt:'Los jueces buscan rarezas: lo épico o mejor triplica su valor.',
    ef:{ precioRaro:3.0 } },
  { id:'mercader', nombre:'Mercader errante', emo:'🧙', peso:9, dura:1,
    txt:'Un mercader ofrece semillas extrañas a mitad de precio.',
    ef:{ semillas:0.5 } },
  { id:'dorada', nombre:'Semilla dorada', emo:'🌟', peso:6, dura:1,
    txt:'Alguien dejó una semilla dorada en la puerta. Ya está en tu almacén.',
    ef:{}, alEmpezar:() => regalarSemillaDorada() },
  { id:'mutacion', nombre:'Tormenta de mutaciones', emo:'⚡', peso:7, dura:2,
    txt:'El aire está cargado: los cruces mutan como locos.',
    ef:{ mut:4.0 } },
  { id:'enfermedad', nombre:'Brote de hongos', emo:'🦠', peso:8, dura:2,
    txt:'Un hongo recorre las parcelas. Revisa las plantas o perderás salud.',
    ef:{ plaga:3.0, crec:0.9 } },
  { id:'insectos', nombre:'Enjambre de insectos', emo:'🐛', peso:8, dura:2,
    txt:'Bichos por todas partes. Las plantas maduras corren peligro.',
    ef:{ plaga:4.0 } },
  { id:'meteoros', nombre:'Lluvia de meteoros', emo:'☄️', peso:5, dura:1,
    txt:'El cielo se llena de rayas de luz. Dicen que trae suerte con la rareza.',
    ef:{ mut:2.0, rareza:0.18 } },
  { id:'abejas', nombre:'Visita de las abejas', emo:'🐝', peso:9, dura:2,
    txt:'Las abejas polinizan solas: las flores con néctar valen el doble.',
    ef:{ nectar:2.0 } },
  { id:'nieblaR', nombre:'Niebla luminosa', emo:'🌫️', peso:4, dura:2,
    txt:'Una niebla rara cubre el valle. La luminiscencia se hereda mucho mejor.',
    ef:{ brillo:0.25 } },
];

/* ---------- 5.6 Clientes especiales ---------- */
const CLIENTES = [
  { id:'coleccionista', nombre:'Coleccionista de tonos', emo:'🎩',
    pide:() => { const c = elige(CLAVES_COLOR); return { tipo:'color', valor:c, txt:'una flor ' + COLORES[c].ep }; }, mult:2.4 },
  { id:'perfumista', nombre:'Perfumista', emo:'🧴',
    pide:() => ({ tipo:'nectar', valor:true, txt:'una flor con néctar' }), mult:2.0 },
  { id:'astrónomo', nombre:'Astrónoma', emo:'🔭',
    pide:() => ({ tipo:'brillo', valor:true, txt:'una flor luminiscente' }), mult:3.2 },
  { id:'arquitecta', nombre:'Arquitecta paisajista', emo:'📐',
    pide:() => { const f = elige(Object.keys(FORMAS)); return { tipo:'forma', valor:f, txt:'una corola de tipo ' + FORMAS[f].nombre.toLowerCase() }; }, mult:1.9 },
  { id:'boticario', nombre:'Boticario', emo:'⚗️',
    pide:() => { const h = elige(Object.keys(HOJAS)); return { tipo:'hoja', valor:h, txt:'hoja ' + HOJAS[h].adj }; }, mult:1.8 },
  { id:'novia', nombre:'Novia de primavera', emo:'👰',
    pide:() => ({ tipo:'color', valor:'alb', txt:'una flor albina, blanca de verdad' }), mult:2.6 },
  { id:'museo', nombre:'Museo botánico', emo:'🏛️',
    pide:() => { const r = elige(['epico','legendario','mitico']); return { tipo:'rareza', valor:r, txt:'algo de rareza ' + rarezaPorId(r).nombre.toLowerCase() + ' o superior' }; }, mult:2.8 },
  { id:'gigante', nombre:'Jardinero del castillo', emo:'🏰',
    pide:() => ({ tipo:'talla', valor:2, txt:'una planta de talla alta' }), mult:1.7 },
];

/* ---------- 5.7 Logros ---------- */
function familiaLogros(base, emo, tit, desc, stat, metas) {
  const rom = ['I','II','III','IV','V','VI','VII','VIII'];
  return metas.map((m, i) => ({
    id: base + (i + 1), emo,
    nombre: tit + ' ' + rom[i],
    desc: desc.replace('{n}', num(m)),
    cond: e => (e.stats[stat] || 0) >= m,
    prog: e => lim((e.stats[stat] || 0) / m, 0, 1),
    oro: Math.round(120 * Math.pow(4.2, i)),
  }));
}
const LOGROS = [].concat(
  familiaLogros('cos', '🧺', 'Manos de tierra', 'Cosecha {n} flores.', 'cosechas', [1, 25, 150, 750, 3000, 12000, 50000, 200000]),
  familiaLogros('pla', '🌱', 'Sembradora',      'Planta {n} semillas.', 'plantadas', [1, 30, 200, 1000, 5000, 20000, 80000]),
  familiaLogros('cru', '🧬', 'Genetista',       'Haz {n} cruces.', 'cruces', [1, 20, 120, 600, 2500, 10000, 40000]),
  familiaLogros('ven', '🪙', 'Comerciante',     'Gana {n} monedas en total.', 'oroGanado', [500, 10000, 120000, 1500000, 20000000, 300000000, 5000000000]),
  familiaLogros('esp', '📖', 'Herbolaria',      'Descubre {n} especies.', 'especies', [1, 10, 40, 100, 180, 260, 336]),
  familiaLogros('mut', '⚡', 'Mutágena',        'Provoca {n} mutaciones.', 'mutaciones', [1, 15, 90, 450, 2000, 9000]),
  familiaLogros('reg', '💧', 'Regadera',        'Riega {n} veces.', 'regadas', [10, 150, 900, 5000, 25000]),
  familiaLogros('niv', '⭐', 'Veterana',        'Llega a nivel {n}.', 'nivel', [5, 10, 20, 35, 50, 75, 100]),
  familiaLogros('sec', '🗝️', 'Cazadora de mitos','Descubre {n} cultivares secretos.', 'secretos', [1, 3, 6, 10, 15, 20]),
  familiaLogros('bri', '✨', 'Luz propia',      'Cultiva {n} flores luminiscentes.', 'brillos', [1, 10, 50, 250, 1200]),
  familiaLogros('cli', '🤝', 'Buena fama',      'Atiende {n} clientes especiales.', 'clientes', [1, 10, 50, 200, 800]),
  familiaLogros('mis', '📜', 'Cumplidora',      'Completa {n} misiones.', 'misiones', [1, 15, 75, 300, 1200]),
  familiaLogros('par', '🏡', 'Latifundista',    'Ten {n} parcelas abiertas.', 'parcelas', [8, 14, 22, 32, 48]),
  familiaLogros('inv', '🔬', 'Sabia',           'Compra {n} mejoras de investigación.', 'investigaciones', [1, 8, 18, 28, 36]),
  familiaLogros('emp', '👥', 'Jefa',            'Ten {n} personas contratadas.', 'empleados', [1, 3, 6, 10, 15]),
  familiaLogros('dec', '🏮', 'Decoradora',      'Coloca {n} decoraciones.', 'decoraciones', [1, 5, 11, 17, 22]),
  familiaLogros('dia', '📅', 'Constante',       'Sobrevive {n} días de invernadero.', 'dias', [7, 28, 100, 365, 1000]),
  [
    { id:'x1', emo:'🌈', nombre:'Todos los colores', desc:'Descubre las 28 claves de color.',
      cond:e => coloresDescubiertos(e) >= 28, prog:e => coloresDescubiertos(e) / 28, oro:150000 },
    { id:'x2', emo:'🔔', nombre:'Cuatro corolas', desc:'Descubre las cuatro formas florales.',
      cond:e => formasDescubiertas(e) >= 4, prog:e => formasDescubiertas(e) / 4, oro:20000 },
    { id:'x3', emo:'💎', nombre:'Primera divina', desc:'Cultiva una flor de rareza Divina.',
      cond:e => (e.stats.divinos || 0) >= 1, prog:e => lim(e.stats.divinos || 0, 0, 1), oro:400000 },
    { id:'x4', emo:'🧿', nombre:'Colección mítica', desc:'Cultiva 25 flores míticas.',
      cond:e => (e.stats.miticos || 0) >= 25, prog:e => lim((e.stats.miticos || 0) / 25, 0, 1), oro:250000 },
    { id:'x5', emo:'🏆', nombre:'Herbario completo', desc:'Descubre las 356 entradas del herbario.',
      cond:e => Object.keys(e.herbario).length >= ESPECIES_TOTAL,
      prog:e => Object.keys(e.herbario).length / ESPECIES_TOTAL, oro:5000000 },
    { id:'x6', emo:'♾️', nombre:'Árbol completo', desc:'Compra todas las investigaciones.',
      cond:e => e.invest.length >= INVESTIGACION.length, prog:e => e.invest.length / INVESTIGACION.length, oro:2000000 },
    { id:'x7', emo:'🌟', nombre:'Polen de oro', desc:'Reúne 100 de polen dorado.',
      cond:e => (e.stats.polenTotal || 0) >= 100, prog:e => lim((e.stats.polenTotal || 0) / 100, 0, 1), oro:300000 },
    { id:'x8', emo:'💌', nombre:'Nuestro rincón', desc:'Cultiva a la vez el «Rincón de Catalina» y el «Faro de Diego».',
      cond:e => e.herbario['sec-catalina'] && e.herbario['sec-diego'], prog:e =>
        ((e.herbario['sec-catalina'] ? .5 : 0) + (e.herbario['sec-diego'] ? .5 : 0)), oro:1000000 },
    { id:'x9', emo:'🧹', nombre:'Invernadero limpio', desc:'Cura 100 plagas.',
      cond:e => (e.stats.plagasCuradas || 0) >= 100, prog:e => lim((e.stats.plagasCuradas || 0) / 100, 0, 1), oro:60000 },
    { id:'x10', emo:'🕰️', nombre:'Una estación entera', desc:'Juega los cuatro cambios de estación.',
      cond:e => (e.stats.estaciones || 0) >= 4, prog:e => lim((e.stats.estaciones || 0) / 4, 0, 1), oro:40000 },
    { id:'x11', emo:'🎪', nombre:'Fiestera', desc:'Vive 20 eventos.',
      cond:e => (e.stats.eventos || 0) >= 20, prog:e => lim((e.stats.eventos || 0) / 20, 0, 1), oro:90000 },
    { id:'x12', emo:'🪙', nombre:'Millonaria', desc:'Ten 1.000.000 de monedas a la vez.',
      cond:e => e.oro >= 1000000, prog:e => lim(e.oro / 1000000, 0, 1), oro:200000 },
    { id:'x13', emo:'💰', nombre:'Magnate', desc:'Ten 1.000 millones a la vez.',
      cond:e => e.oro >= 1e9, prog:e => lim(e.oro / 1e9, 0, 1), oro:20000000 },
    { id:'x14', emo:'🌍', nombre:'Invernadero lleno', desc:'Ten las 48 parcelas ocupadas a la vez.',
      cond:e => e.parcelas.length >= 48 && e.parcelas.every(p => p.planta), prog:e =>
        e.parcelas.filter(p => p.planta).length / 48, oro:800000 },
  ]
);
const logroPorId = id => LOGROS.find(l => l.id === id);

/* ---------- 5.8 Misiones ---------- */
const PLANTILLAS_MISION = [
  { id:'cosechar', emo:'🧺', nom:'Cosecha del día', txt:n => `Cosecha ${n} flores.`,
    stat:'cosechas', base:6, esc:4 },
  { id:'plantar', emo:'🌱', nom:'A sembrar', txt:n => `Planta ${n} semillas.`,
    stat:'plantadas', base:6, esc:4 },
  { id:'regar', emo:'💧', nom:'Manos mojadas', txt:n => `Riega ${n} veces.`,
    stat:'regadas', base:10, esc:6 },
  { id:'cruzar', emo:'🧬', nom:'En el laboratorio', txt:n => `Haz ${n} cruces.`,
    stat:'cruces', base:3, esc:2 },
  { id:'vender', emo:'🪙', nom:'Buen negocio', txt:n => `Gana ${num(n)} monedas vendiendo.`,
    stat:'oroGanado', base:900, esc:900, oroEscala:true },
  { id:'especies', emo:'📖', nom:'Ojo de botánica', txt:n => `Descubre ${n} especies nuevas.`,
    stat:'especies', base:1, esc:1 },
  { id:'mutar', emo:'⚡', nom:'Algo se movió', txt:n => `Provoca ${n} mutaciones.`,
    stat:'mutaciones', base:1, esc:1 },
  { id:'clientes', emo:'🤝', nom:'Buen trato', txt:n => `Atiende ${n} clientes especiales.`,
    stat:'clientes', base:1, esc:1 },
  { id:'plagas', emo:'🧹', nom:'Sin bichos', txt:n => `Cura ${n} plagas.`,
    stat:'plagasCuradas', base:2, esc:2 },
];

/** Cadena permanente: 60 hitos crecientes que dan objetivos a largo plazo. */
const MISIONES_FIJAS = (() => {
  const out = [];
  const defs = [
    ['cosechas', '🧺', 'Cosechadora', n => `Cosecha ${num(n)} flores en total.`, [10, 60, 250, 900, 3000, 9000, 26000, 70000, 190000, 500000]],
    ['cruces', '🧬', 'Mano de cruce', n => `Completa ${num(n)} cruces.`, [5, 40, 180, 700, 2400, 7500, 22000, 60000, 160000, 420000]],
    ['especies', '📖', 'Herbario', n => `Ten ${num(n)} especies en el herbario.`, [5, 20, 50, 90, 140, 190, 240, 280, 315, 336]],
    ['oroGanado', '🪙', 'Fortuna', n => `Gana ${num(n)} monedas en total.`, [2000, 25000, 200000, 1500000, 9e6, 5e7, 3e8, 2e9, 1.2e10, 8e10]],
    ['nivel', '⭐', 'Escalafón', n => `Alcanza el nivel ${n}.`, [5, 10, 16, 24, 33, 44, 57, 72, 88, 100]],
    ['secretos', '🗝️', 'Leyendas', n => `Descubre ${n} cultivares secretos.`, [1, 2, 4, 6, 8, 11, 14, 16, 18, 20]],
  ];
  defs.forEach(([stat, emo, nom, txt, metas]) => metas.forEach((m, i) => {
    out.push({
      id: stat + '_f' + i, tipo:'permanente', emo, stat, meta:m,
      nombre: nom + ' ' + (i + 1), desc: txt(m),
      oro: Math.round(400 * Math.pow(3.4, i)), xp: Math.round(40 * Math.pow(2.1, i)),
      polen: i >= 4 ? Math.floor((i - 3) * 1.5) : 0,
    });
  }));
  return out;
})();

/* ---------- 5.9 Legado: el juego después del juego ----------
   Cuando ya no queda nada que comprar, se puede trasplantar el invernadero:
   se empieza de nuevo pero con esporas (✿), una moneda que NO se pierde nunca
   y compra mejoras permanentes. El herbario, los logros y los cultivares
   secretos tampoco se tocan: lo coleccionado es para siempre.            */
const MEJORAS_PERM = [
  { id:'vigor',     nombre:'Vigor ancestral',   emo:'🌱', max:8, costo:n => 3 + n * 3,
    desc:n => `+${n * 12}% de velocidad de crecimiento` },
  { id:'fama',      nombre:'Fama heredada',     emo:'🪙', max:8, costo:n => 4 + n * 4,
    desc:n => `+${n * 15}% al precio de venta` },
  { id:'bodega',    nombre:'Bodega ancestral',  emo:'📦', max:6, costo:n => 3 + n * 3,
    desc:n => `+${n * 80} de capacidad de almacén` },
  { id:'tierras',   nombre:'Tierras heredadas', emo:'🏡', max:6, costo:n => 6 + n * 6,
    desc:n => `empiezas con ${n * 2} parcelas abiertas de más` },
  { id:'semillero', nombre:'Semillero familiar',emo:'🌾', max:5, costo:n => 5 + n * 5,
    desc:n => `empiezas con ${n * 3} semillas de pradera` },
  { id:'memoria',   nombre:'Memoria genética',  emo:'🧬', max:6, costo:n => 4 + n * 5,
    desc:n => `+${n * 20}% de probabilidad de mutación` },
  { id:'sabiduria', nombre:'Sabiduría',         emo:'🔬', max:6, costo:n => 5 + n * 5,
    desc:n => `+${n * 25}% de ciencia y empiezas con ${n * 25} 🔬` },
  { id:'alcancia',  nombre:'Alcancía',          emo:'💰', max:6, costo:n => 4 + n * 4,
    desc:n => `empiezas con ${num(2000 * Math.pow(6, n))} monedas` },
  { id:'rocio',     nombre:'Rocío eterno',      emo:'💧', max:5, costo:n => 6 + n * 6,
    desc:n => `el agua baja un ${n * 14}% más lento` },
  { id:'linaje',    nombre:'Linaje luminoso',   emo:'✨', max:4, costo:n => 12 + n * 12,
    desc:n => `+${n * 4}% de que un hijo herede luminiscencia` },
];
const permPorId = id => MEJORAS_PERM.find(m => m.id === id);
const nivelPerm = id => (E.perm || {})[id] || 0;

/** Esporas que daría trasplantar ahora mismo. */
function esporasDeCosecha() {
  if (!E) return 0;
  const ganado = Math.max(0, (E.stats.oroGanado || 0) - (E.oroBase || 0));
  const porOro = Math.pow(ganado / 200000, 0.55);
  const porHerbario = Object.keys(E.herbario).length * 0.08;
  const porSecretos = (E.stats.secretos || 0) * 1.5;
  return Math.floor(porOro + porHerbario + porSecretos);
}
const TRASPLANTE_NIVEL = 15;
const puedeTrasplantar = () => E.nivel >= TRASPLANTE_NIVEL && esporasDeCosecha() >= 1;

/* ---------- 5.10 Encargos largos ----------
   Metas de varios días que dan esporas: cuando el dinero ya sobra, siguen
   dando algo concreto que perseguir.                                      */
const ENCARGOS = [
  { id:'color', emo:'🎨', dias:3, base:7,
    arma:() => { const c = elige(CLAVES_COLOR.filter(x => x !== 'alb')); return {
      dato:c, txt:'flores de color ' + COLORES[c].nombre, cumple:f => f.color === c }; } },
  { id:'rareza', emo:'💎', dias:4, base:3,
    arma:() => { const r = elige(['raro', 'epico', 'legendario']); const orden = RAREZAS.map(x => x.id); return {
      dato:r, txt:'flores de rareza ' + rarezaPorId(r).nombre.toLowerCase() + ' o mejor',
      cumple:f => orden.indexOf(f.rareza) >= orden.indexOf(r) }; } },
  { id:'forma', emo:'🏵️', dias:3, base:8,
    arma:() => { const fo = elige(Object.keys(FORMAS)); return {
      dato:fo, txt:'flores de corola ' + FORMAS[fo].nombre.toLowerCase(), cumple:f => f.forma === fo }; } },
  { id:'nectar', emo:'🍯', dias:3, base:6,
    arma:() => ({ dato:1, txt:'flores con néctar', cumple:f => !!f.nectar }) },
  { id:'brillo', emo:'✨', dias:5, base:2,
    arma:() => ({ dato:1, txt:'flores luminiscentes', cumple:f => !!f.brillo }) },
  { id:'hoja', emo:'🍃', dias:3, base:8,
    arma:() => { const h = elige(Object.keys(HOJAS)); return {
      dato:h, txt:'flores de hoja ' + HOJAS[h].adj, cumple:f => f.hoja === h }; } },
  { id:'bioma', emo:'🌵', dias:5, base:3, requiereBioma:true,
    arma:() => { const r = elige(Object.keys(RASGOS_BIOMA)); return {
      dato:r, txt:'flores ' + RASGOS_BIOMA[r].adj + 's', cumple:f => f.rasgo === r }; } },
];

/* ---------- 5.11 Concurso semanal ----------
   Un tema por semana, igual para los dos porque sale de la semana ISO.    */
const CONCURSOS = [
  { id:'azul',    nombre:'La más azul',       emo:'💙', mide:f => f.dosisA * 10 + f.puntos },
  { id:'roja',    nombre:'La más roja',       emo:'❤️', mide:f => f.dosisB * 10 + f.puntos },
  { id:'amarilla',nombre:'La más dorada',     emo:'💛', mide:f => f.dosisC * 10 + f.puntos },
  { id:'rara',    nombre:'La más rara',       emo:'💎', mide:f => f.puntos * 3 },
  { id:'alta',    nombre:'La más alta',       emo:'🌳', mide:f => f.talla * 14 + f.puntos },
  { id:'brillo',  nombre:'La más luminosa',   emo:'✨', mide:f => (f.brillo ? 40 : 0) + f.puntos },
  { id:'nectar',  nombre:'La más melosa',     emo:'🍯', mide:f => (f.nectar ? 25 : 0) + f.puntos },
  { id:'pastel',  nombre:'La más pastel',     emo:'🕊️', mide:f => (f.sat === 0 ? 30 : 0) + f.puntos },
  { id:'estrella',nombre:'La mejor estrella', emo:'✴️', mide:f => (f.forma === 'F1' ? 30 : 0) + f.puntos },
  { id:'exotica', nombre:'La más exótica',    emo:'🌵', mide:f => (f.rasgo ? 45 : 0) + f.puntos },
];
function concursoDeSemana(clave) {
  const r = semilla('concurso' + (clave || semanaClave()));
  return CONCURSOS[Math.floor(r() * CONCURSOS.length)];
}

/* ---------- 5.12 Decisiones: crisis con consecuencias ---------- */
const CRISIS = [
  { id:'hongo', emo:'🦠', titulo:'Hongo en el invernadero',
    txt:'Una mancha blanca avanza por las hojas. Si no haces nada, se llevará varias plantas.',
    ops:[
      { txt:'Fumigar', costo:0.18, efecto:'cura', desc:'Cuesta monedas pero lo corta en seco.' },
      { txt:'Podar a mano', efecto:'salud', desc:'Gratis, pero las plantas pierden salud.' },
      { txt:'No hacer nada', efecto:'plaga', desc:'A ver si pasa sola. Puede salir caro.' },
    ] },
  { id:'sequia', emo:'🥵', titulo:'Se cortó el agua',
    txt:'El pozo se secó. Sin riego, lo que está creciendo lo va a pasar mal.',
    ops:[
      { txt:'Comprar agua', costo:0.12, efecto:'riego', desc:'Riega todo al máximo ahora mismo.' },
      { txt:'Racionar', efecto:'lento', desc:'Gratis, pero todo crece más lento un rato.' },
      { txt:'Aguantar', efecto:'seco', desc:'El agua baja de golpe en todas las parcelas.' },
    ] },
  { id:'plagaBichos', emo:'🐛', titulo:'Orugas en las flores',
    txt:'Han aparecido orugas justo en lo que está a punto de florecer.',
    ops:[
      { txt:'Pagar al fumigador', costo:0.15, efecto:'cura', desc:'Se van todas de una vez.' },
      { txt:'Soltar mariquitas', efecto:'mariquitas', desc:'Tarda, pero deja el invernadero limpio un buen rato.' },
      { txt:'Quitarlas a mano', efecto:'salud', desc:'Gratis y algo funciona, pero maltrata las plantas.' },
    ] },
  { id:'granizo', emo:'🧊', titulo:'Aviso de granizo',
    txt:'Dicen que esta noche cae granizo. Puedes cubrir el invernadero o arriesgarte.',
    ops:[
      { txt:'Cubrir con mallas', costo:0.2, efecto:'nada', desc:'No pasa nada, pero se paga.' },
      { txt:'Cubrir solo lo raro', costo:0.06, efecto:'mixto', desc:'Salvas lo valioso; lo común se lleva el golpe.' },
      { txt:'Arriesgarse', efecto:'granizo', desc:'Si cae, se pierden plantas.' },
    ] },
  { id:'inspector', emo:'📋', titulo:'Inspección sanitaria',
    txt:'Un inspector quiere ver el invernadero. Si lo encuentra sucio, multa.',
    ops:[
      { txt:'Limpiar a fondo', costo:0.1, efecto:'cura', desc:'Todo impecable, sin multa.' },
      { txt:'Enseñar solo lo bonito', efecto:'suerte', desc:'Puede colar… o no.' },
      { txt:'Invitarle a un café', costo:0.03, efecto:'reputacion', desc:'Se va contento y trae clientes.' },
    ] },
];

/* ---------- 5.13 Mercado ---------- */
const FAMILIAS_COLOR = [
  { id:'blanco',  nombre:'Blancos',   emo:'🤍', claves:['alb', '000'] },
  { id:'amarillo',nombre:'Amarillos', emo:'💛', claves:['001', '002'] },
  { id:'rosa',    nombre:'Rosas',     emo:'🌸', claves:['010', '011', '020', '021'] },
  { id:'naranja', nombre:'Naranjas',  emo:'🧡', claves:['012', '022', '122'] },
  { id:'lila',    nombre:'Lilas',     emo:'💜', claves:['100', '110', '120', '210'] },
  { id:'verde',   nombre:'Verdes',    emo:'💚', claves:['101', '102', '202', '211', '212'] },
  { id:'azul',    nombre:'Azules',    emo:'💙', claves:['200', '201'] },
  { id:'tierra',  nombre:'Tierras',   emo:'🤎', claves:['111', '112', '121'] },
  { id:'oscuro',  nombre:'Oscuros',   emo:'🖤', claves:['220', '221', '222'] },
];
const familiaDeColor = c => (FAMILIAS_COLOR.find(f => f.claves.includes(c)) || FAMILIAS_COLOR[0]).id;

/* ============================================================
   6. ESTADO Y GUARDADO
   ============================================================ */
let E = null;                 // estado del juego
let sucio = false;            // hay cambios sin guardar
let bonosCache = null;        // se invalida con `tocar()`

function estadoNuevo() {
  const e = {
    v: 1,
    creado: Date.now(),
    t: Date.now(),
    oro: 250, polen: 0, ciencia: 0, xp: 0, nivel: 1,
    // Legado: sobrevive a los trasplantes. En guardados antiguos entran
    // con estos valores por defecto sin tocar nada de lo que ya había.
    esporas: 0, perm: {}, trasplantes: 0, oroBase: 0,
    biomas: [],        // sectores desbloqueados además del patio
    encargo: null,     // pedido largo en curso
    concurso: null,    // lo presentado esta semana
    crisis: null,      // decisión pendiente
    mundo: { ms: 8 * JUEGO.diaMs / 24, dia: 1, estacion: 0, clima: 'soleado', climaElegido: null },
    parcelas: [],
    semillas: [],
    flores: [],
    herbario: {},
    invest: [],
    empleados: [],
    deco: [],
    logros: {},
    misiones: { claveDia: '', claveSemana: '', diarias: [], semanales: [], perm: {} },
    mercado: { dia: '', demanda: {}, hist: {} },
    cliente: null,
    evento: null,
    registro: [],
    stats: {},
    ajustes: { musica: true, sfx: true, volMusica: 0.35, volSfx: 0.55, particulas: true,
               tema: 'auto', ahorro: false, autoDespejar: true },
  };
  for (let i = 0; i < JUEGO.parcelasMax; i++) {
    e.parcelas.push({ i, abierta: i < JUEGO.parcelasIniciales, planta: null, agua: 100, plaga: 0, bioma: 'patio' });
  }
  FAMILIAS_COLOR.forEach(f => { e.mercado.demanda[f.id] = 1; e.mercado.hist[f.id] = [1, 1, 1, 1, 1, 1, 1, 1]; });
  // Regalo de bienvenida: tres semillas silvestres para empezar.
  for (let i = 0; i < 3; i++) darSemilla(genSilvestre(0.2), 'regalo', e);
  return e;
}

function guardar(forzar) {
  if (!E) return;
  if (!forzar && !sucio) return;
  E.t = Date.now();
  E.duenio = quien() || null;
  try {
    const clave = claveDe(E.duenio);
    const txt = JSON.stringify(E);
    // Antes de pisar el guardado bueno se aparta una copia: si la escritura
    // se corta a medias o el estado se corrompe, queda de dónde volver.
    const previo = localStorage.getItem(clave);
    if (previo && previo.length > 40) localStorage.setItem(claveCopiaDe(E.duenio), previo);
    localStorage.setItem(clave, txt);
    sucio = false;
  } catch (err) {
    aviso('⚠️', 'No se pudo guardar', 'El almacenamiento del navegador está lleno.', 'malo');
  }
}

/** Carga el invernadero de una persona (o el del invitado si no hay perfil). */
function cargar(persona) {
  const leer = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  let bruto = leer(claveDe(persona));
  if (!bruto) bruto = leer(claveCopiaDe(persona));
  if (!bruto && persona) {
    // Migración: el guardado antiguo no tenía dueño. Se le entrega a la primera
    // persona que entre, y solo si ella todavía no tiene invernadero propio.
    const viejo = leer(JUEGO.claveVieja);
    if (viejo) {
      bruto = viejo;
      try {
        localStorage.setItem(claveDe(persona), viejo);
        localStorage.removeItem(JUEGO.claveVieja);
        localStorage.removeItem(JUEGO.claveVieja + '_copia');
      } catch (e) { /* sin sitio: se sigue igual */ }
    }
  }
  if (!bruto) return estadoNuevo();
  return revivir(bruto) || estadoNuevo();
}

/** ¿Esta persona ya tiene invernadero en este aparato? */
function tienePartida(persona) {
  try { return !!(localStorage.getItem(claveDe(persona)) || localStorage.getItem(claveCopiaDe(persona))); }
  catch (e) { return false; }
}
/** Convierte el texto guardado en un estado completo, o null si no se puede. */
function revivir(bruto) {
  try {
    const d = typeof bruto === 'string' ? JSON.parse(bruto) : bruto;
    if (!d || !d.parcelas) return null;
    const base = estadoNuevo();
    // Mezcla superficial: si el guardado es de una versión anterior, los
    // campos nuevos entran con su valor por defecto en vez de quedar undefined.
    const e = Object.assign(base, d);
    e.mundo = Object.assign(base.mundo, d.mundo || {});
    e.ajustes = Object.assign(base.ajustes, d.ajustes || {});
    e.misiones = Object.assign(base.misiones, d.misiones || {});
    e.mercado = Object.assign(base.mercado, d.mercado || {});
    e.stats = Object.assign({}, d.stats || {});
    if (!Array.isArray(e.parcelas) || e.parcelas.length !== JUEGO.parcelasMax) {
      const viejas = Array.isArray(d.parcelas) ? d.parcelas : [];
      e.parcelas = base.parcelas.map((p, i) => viejas[i] ? Object.assign(p, viejas[i]) : p);
    }
    FAMILIAS_COLOR.forEach(f => {
      if (typeof e.mercado.demanda[f.id] !== 'number') e.mercado.demanda[f.id] = 1;
      if (!Array.isArray(e.mercado.hist[f.id])) e.mercado.hist[f.id] = [1, 1, 1, 1, 1, 1, 1, 1];
    });
    return e;
  } catch (err) {
    console.warn('Guardado ilegible.', err);
    return null;
  }
}
const tocar = () => { sucio = true; bonosCache = null; };

/**
 * Vacía todo lo que se guarda en memoria entre partidas. Es imprescindible al
 * cambiar de perfil: `bonosCache` guardaba los multiplicadores del anterior,
 * así que la automatización y las mejoras de uno se le aplicaban al otro
 * hasta el siguiente `tocar()`. Los acumuladores de `auto` hacían lo mismo
 * con el riego y las ventas automáticas.
 */
function limpiarCachesDePartida() {
  bonosCache = null;
  cacheFen.clear();
  Object.keys(auto).forEach(k => auto[k] = 0);
  cacheParcela.length = 0;
  ultimoAvisoAlmacen = 0;
  sucio = true;
}

function exportarPartida() {
  guardar(true);
  const txt = btoa(unescape(encodeURIComponent(JSON.stringify(E))));
  const a = document.createElement('a');
  a.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(txt);
  a.download = 'invernadero-' + hoyClave() + '.txt';
  a.click();
  aviso('💾', 'Partida exportada', 'Guarda ese archivo en un lugar seguro.');
}
function importarPartida(txt) {
  try {
    const d = JSON.parse(decodeURIComponent(escape(atob(txt.trim()))));
    if (!d || !d.parcelas) throw new Error('formato');
    localStorage.setItem(claveDe(quien()), JSON.stringify(d));
    location.reload();
  } catch (err) {
    aviso('⚠️', 'Archivo inválido', 'Ese texto no es una partida de Invernadero.', 'malo');
  }
}

/* ---------- Inventario ---------- */
function darSemilla(gen, origen, estado) {
  const e = estado || E;
  const cod = genCod(gen);
  const p = e.semillas.find(s => s.cod === cod);
  if (p) p.n++;
  else e.semillas.push({ cod, n: 1, origen: origen || '?', fecha: Date.now() });
  tocar();
  return cod;
}
function quitarSemilla(cod, n) {
  const p = E.semillas.find(s => s.cod === cod);
  if (!p || p.n < (n || 1)) return false;
  p.n -= (n || 1);
  if (p.n <= 0) E.semillas = E.semillas.filter(s => s !== p);
  tocar();
  return true;
}
function darFlor(gen, bioma) {
  const cod = claveItem(genCod(gen), bioma);
  const p = E.flores.find(s => s.cod === cod);
  if (p) p.n++;
  else E.flores.push({ cod, n: 1, fecha: Date.now() });
  tocar();
  return cod;
}
function quitarFlor(cod, n) {
  const p = E.flores.find(s => s.cod === cod);
  if (!p || p.n < (n || 1)) return false;
  p.n -= (n || 1);
  if (p.n <= 0) E.flores = E.flores.filter(s => s !== p);
  tocar();
  return true;
}
const ocupado = () => E.semillas.reduce((s, x) => s + x.n, 0) + E.flores.reduce((s, x) => s + x.n, 0);
const capacidad = () => JUEGO.almacenInicial + bonos().almacen;
const hayEspacio = (n) => ocupado() + (n || 1) <= capacidad();

function regalarSemillaDorada() {
  const g = genSilvestre(0.75);
  g.X = ordenarPar(LOCUS.X, ['X', 'x']);      // portadora de brillo, siempre
  g.N = ordenarPar(LOCUS.N, ['N', 'n']);
  darSemilla(g, 'dorada');
  aviso('🌟', 'Semilla dorada', 'Alguien la dejó en la puerta. Es portadora de luminiscencia.', 'oro');
}

/* ---------- Estadísticas y nivel ---------- */
function sumar(stat, n) {
  E.stats[stat] = (E.stats[stat] || 0) + (n === undefined ? 1 : n);
  tocar();
}
/* Curva de nivel. Estaba floja: con 30 cosechas ya se iba por el nivel 5 y el
   juego se destapaba entero en una tarde. Sube más rápido con el nivel para
   que las semillas y las mejoras caras tarden en llegar. */
const xpNecesaria = niv => Math.round(140 * Math.pow(niv, 2.05));
function darXP(n) {
  E.xp += n;
  sumar('xpTotal', n);
  let subio = false;
  while (E.xp >= xpNecesaria(E.nivel)) {
    E.xp -= xpNecesaria(E.nivel);
    E.nivel++;
    subio = true;
    E.stats.nivel = E.nivel;
    // Polinómico a propósito: con una base exponencial, subir de nivel 70
    // pagaba más que todo lo vendido en la partida y rompía la economía.
    const premio = Math.round(200 * Math.pow(E.nivel, 2.1));
    E.oro += premio;
    E.ciencia += Math.max(1, Math.floor(E.nivel / 3));
    log(`Subiste a <b>nivel ${E.nivel}</b> (+${monedas(premio)} 🪙)`, 'evento');
  }
  if (subio) {
    aviso('⭐', 'Nivel ' + E.nivel, 'Nuevas semillas y mejoras a la vista.', 'oro');
    sonido('nivel');
    confeti();
  }
  tocar();
}
function darOro(n) {
  E.oro += n;
  if (n > 0) sumar('oroGanado', n);
  tocar();
}

/* ---------- Registro ---------- */
function log(txt, tipo) {
  const h = new Date();
  E.registro.unshift({
    t: h.getHours().toString().padStart(2, '0') + ':' + h.getMinutes().toString().padStart(2, '0'),
    txt, tipo: tipo || 'todo',
  });
  if (E.registro.length > JUEGO.registroMax) E.registro.length = JUEGO.registroMax;
  if (!window.__silencio) pintarRegistro();
  tocar();
}

/* ============================================================
   7. BONOS, MUNDO, CLIMA Y TIEMPO
   ============================================================ */
const tieneInv = id => E.invest.includes(id);
const tieneDeco = id => E.deco.includes(id);

/** Suma todos los modificadores activos. Se cachea hasta que algo cambie. */
function bonos() {
  if (bonosCache) return bonosCache;
  const b = {
    crec: 1, agua: 1, precio: 1, mut: 1, plaga: 1, rareza: 0, brillo: 0, ciencia: 1,
    almacen: 0, animo: 0, semillasExtra: 0, precioNectar: 1, climaSuave: 0,
  };
  // Investigación
  const crecInv = { bot1:.20, bot2:.25, bot3:.30, bot4:.40, bot5:.55, bot6:.80 };
  Object.keys(crecInv).forEach(k => { if (tieneInv(k)) b.crec += crecInv[k]; });
  if (tieneInv('bot3')) b.semillasExtra += 1;
  if (tieneInv('bot6')) b.semillasExtra += 2;
  if (tieneInv('bot4')) b.agua *= 0.5;
  const precioInv = { com1:.15, com2:.25, com3:.40, com4:.65, com5:1.10 };
  Object.keys(precioInv).forEach(k => { if (tieneInv(k)) b.precio += precioInv[k]; });
  if (tieneInv('gen4')) b.mut *= 2;
  if (tieneInv('rar2')) b.mut *= 1.35;
  if (tieneInv('rar3')) b.rareza += 0.05;
  if (tieneInv('inf1')) b.almacen += 60;
  if (tieneInv('inf2')) b.almacen += 140;
  if (tieneInv('inf5')) b.almacen += 400;
  if (tieneInv('inf3')) b.climaSuave += 0.5;
  // Decoración
  E.deco.forEach(id => {
    const d = decoPorId(id); if (!d) return;
    if (d.bono === 'crec') b.crec += d.val;
    else if (d.bono === 'precio') b.precio += d.val;
    else if (d.bono === 'agua') b.agua *= (1 - d.val);
    else if (d.bono === 'mut') b.mut += d.val;
    else if (d.bono === 'plaga') b.plaga *= (1 - d.val);
    else if (d.bono === 'rareza') b.rareza += d.val;
    else if (d.bono === 'brillo') b.brillo += d.val;
    else if (d.bono === 'animo') b.animo += d.val;
    else if (d.bono === 'nectar') b.precioNectar += d.val;
    else if (d.bono === 'clima') b.climaSuave += d.val;
  });
  // Legado (mejoras permanentes compradas con esporas)
  b.crec += nivelPerm('vigor') * 0.12;
  b.precio += nivelPerm('fama') * 0.15;
  b.almacen += nivelPerm('bodega') * 80;
  b.mut += nivelPerm('memoria') * 0.20;
  b.brillo += nivelPerm('linaje') * 0.04;
  b.agua *= Math.max(0.2, 1 - nivelPerm('rocio') * 0.14);
  b.ciencia = 1 + nivelPerm('sabiduria') * 0.25;
  // Empleados
  E.empleados.forEach(emp => {
    const ef = eficaciaEmp(emp);
    if (emp.rol === 'vendedor') b.precio += 0.09 * ef;
    if (emp.rol === 'investigador') b.mut += 0.16 * ef;
    if (emp.rol === 'limpiador') b.plaga *= Math.max(0.15, 1 - 0.16 * ef);
    if (emp.rol === 'jardinero') b.agua *= Math.max(0.3, 1 - 0.05 * ef);
  });
  // Estación, clima y evento
  const est = ESTACIONES[E.mundo.estacion];
  const cli = CLIMAS[E.mundo.clima];
  const suave = lim(b.climaSuave, 0, 0.9);
  const mezcla = (v) => 1 + (v - 1) * (1 - suave);
  b.crec *= tieneInv('inf5') ? 1 : mezcla(est.crec);
  b.crec *= mezcla(cli.crec);
  b.agua *= mezcla(est.agua) * mezcla(cli.agua);
  b.mut *= est.mut * cli.mut;
  b.precio *= est.precio * cli.precio;
  const ev = eventoActivo();
  if (ev) {
    const f = ev.ef || {};
    if (f.crec) b.crec *= f.crec;
    if (f.agua !== undefined) b.agua *= f.agua;
    if (f.precio) b.precio *= f.precio;
    if (f.mut) b.mut *= f.mut;
    if (f.plaga) b.plaga *= f.plaga;
    if (f.rareza) b.rareza += f.rareza;
    if (f.brillo) b.brillo += f.brillo;
    if (f.nectar) b.precioNectar *= f.nectar;
  }
  // Secuelas de una crisis reciente
  if (E.lento && Date.now() < E.lento.hasta) b.crec *= 0.6;
  if (E.mariquitas && Date.now() < E.mariquitas.hasta) b.plaga = 0;
  // Noche: sin luz artificial el crecimiento baja
  if (esNoche() && !tieneDeco('lampara')) b.crec *= 0.72;
  bonosCache = b;
  return b;
}
const eventoActivo = () => E.evento ? EVENTOS.find(x => x.id === E.evento.id) : null;

/* --- Reloj del mundo --- */
const horaDelDia = () => (E.mundo.ms % JUEGO.diaMs) / JUEGO.diaMs * 24;
function horaTexto() {
  const h = horaDelDia();
  return String(Math.floor(h)).padStart(2, '0') + ':' + String(Math.floor((h % 1) * 60)).padStart(2, '0');
}
const esNoche = () => { const h = horaDelDia(); return h < 5.5 || h >= 20; };
function franjaDia() {
  const h = horaDelDia();
  if (h < 5.5) return 'noche';
  if (h < 8) return 'amanecer';
  if (h < 12) return 'mañana';
  if (h < 18) return 'tarde';
  if (h < 20) return 'atardecer';
  return 'noche';
}

function nuevoDia() {
  E.mundo.dia++;
  sumar('dias');
  E.stats.dias = E.stats.dias || 0;
  // Clima
  E.mundo.clima = E.mundo.climaElegido || sorteoClima();
  E.mundo.climaElegido = null;
  // Estación
  if ((E.mundo.dia - 1) % JUEGO.diasPorEstacion === 0) {
    E.mundo.estacion = (E.mundo.estacion + 1) % 4;
    sumar('estaciones');
    const est = ESTACIONES[E.mundo.estacion];
    log(`Empieza el <b>${est.nombre}</b> ${est.emo}`, 'evento');
    aviso(est.emo, 'Cambio de estación', 'Llega ' + est.nombre.toLowerCase() + '. El clima y los precios cambian.', 'evento');
  }
  pagarSueldos();
  moverMercado();
  animoDiario();
  refrescarMisiones();
  revisarEncargo();
  // Una crisis cada tantos días: obliga a decidir, no solo a mirar.
  if (!E.crisis && E.mundo.dia > 3 && suerte(0.22)) lanzarCrisis();
  if (suerte(0.42)) sortearEvento();
  if (E.evento) { E.evento.quedan--; if (E.evento.quedan <= 0) terminarEvento(); }
  if (!E.cliente && suerte(tieneInv('com2') ? 0.55 : 0.32)) llegaCliente();
  log(`Día <b>${E.mundo.dia}</b> · ${CLIMAS[E.mundo.clima].nombre} ${CLIMAS[E.mundo.clima].emo}`, 'evento');
  tocar();
  aplicarAmbiente(true);
  if (vistaActual === 'mercado') pintarVista();
}
function sorteoClima() {
  // El invierno inclina la balanza hacia nieve y niebla; el verano hacia sol.
  const pesos = {};
  Object.keys(CLIMAS).forEach(k => pesos[k] = { peso: CLIMAS[k].peso, k });
  const est = ESTACIONES[E.mundo.estacion].id;
  if (est === 'invierno') { pesos.nieve.peso = 22; pesos.niebla.peso = 16; pesos.soleado.peso = 16; }
  if (est === 'verano') { pesos.soleado.peso = 48; pesos.nieve.peso = 0; pesos.tormenta.peso = 9; }
  if (est === 'otono') { pesos.lluvia.peso = 26; pesos.viento.peso = 16; pesos.nieve.peso = 1; }
  if (est === 'primavera') { pesos.lluvia.peso = 24; pesos.nieve.peso = 0; }
  return elegirPeso(pesos).k;
}
function sortearEvento() {
  const ev = elegirPeso(EVENTOS);
  E.evento = { id: ev.id, quedan: ev.dura };
  sumar('eventos');
  if (ev.alEmpezar) ev.alEmpezar();
  log(`<b>${ev.nombre}</b> ${ev.emo} — ${ev.txt}`, 'evento');
  aviso(ev.emo, ev.nombre, ev.txt, 'evento');
  sonido('evento');
  tocar();
}
function terminarEvento() {
  const ev = eventoActivo();
  if (ev) log(`Termina <b>${ev.nombre}</b>.`, 'evento');
  E.evento = null;
  tocar();
}

/* --- Sueldos y ánimo --- */
function pagarSueldos() {
  if (!E.empleados.length) return;
  const total = E.empleados.reduce((s, e) => s + sueldoDe(e), 0);
  E.oro -= total;
  if (E.oro < 0) {
    E.oro = 0;
    E.empleados.forEach(e => e.animo = lim(e.animo - 22, 0, 100));
    log(`No alcanzó para los sueldos (<b>${monedas(total)}</b> 🪙). El equipo está molesto.`, 'malo');
    aviso('💸', 'Sin dinero para sueldos', 'El ánimo del equipo bajó mucho.', 'malo');
  } else {
    log(`Pagaste <b>${monedas(total)}</b> 🪙 en sueldos.`, 'venta');
  }
  tocar();
}
function animoDiario() {
  const b = bonos();
  E.empleados.forEach(e => {
    e.animo = lim(e.animo - 9 + b.animo, 0, 100);
    e.exp += 10 + Math.floor(Math.random() * 8);
    while (e.exp >= expEmp(e.nivel)) { e.exp -= expEmp(e.nivel); e.nivel++; }
  });
  tocar();
}
const expEmp = niv => Math.round(60 * Math.pow(1.45, niv));
const sueldoDe = e => Math.round(ROLES[e.rol].sueldo * Math.pow(1.32, e.nivel - 1));
const eficaciaEmp = e => (0.6 + e.nivel * 0.22) * humorDe(e.animo).mult;

/* --- Mercado --- */
function moverMercado() {
  const r = semilla(hoyClave() + '|' + E.mundo.dia);
  FAMILIAS_COLOR.forEach(f => {
    const d = E.mercado.demanda[f.id];
    const objetivo = 0.55 + r() * 1.5;
    const vuelta = tieneInv('com3') ? 0.5 : 0.28;
    const nuevo = lim(d + (objetivo - d) * vuelta + (r() - 0.5) * 0.16, 0.35, 2.6);
    E.mercado.demanda[f.id] = nuevo;
    const h = E.mercado.hist[f.id];
    h.push(nuevo);
    if (h.length > 10) h.shift();
  });
  E.mercado.dia = hoyClave();
  tocar();
}
const demandaDe = colorClave => E.mercado.demanda[familiaDeColor(colorClave)] || 1;

/* --- Clientes especiales --- */
function llegaCliente() {
  const c = elige(CLIENTES);
  const p = c.pide();
  E.cliente = { id: c.id, tipo: p.tipo, valor: p.valor, txt: p.txt, mult: c.mult, expira: E.mundo.dia + 2 };
  log(`<b>${c.nombre}</b> ${c.emo} busca ${p.txt}.`, 'evento');
  aviso(c.emo, c.nombre, 'Busca ' + p.txt + '. Paga ×' + c.mult.toFixed(1) + '.', 'evento');
  tocar();
}
function clienteAcepta(f) {
  const c = E.cliente;
  if (!c) return false;
  if (c.tipo === 'color')  return f.color === c.valor;
  if (c.tipo === 'nectar') return !!f.nectar;
  if (c.tipo === 'brillo') return !!f.brillo;
  if (c.tipo === 'forma')  return f.forma === c.valor;
  if (c.tipo === 'hoja')   return f.hoja === c.valor;
  if (c.tipo === 'talla')  return f.talla === c.valor;
  if (c.tipo === 'rareza') {
    const orden = RAREZAS.map(r => r.id);
    return orden.indexOf(f.rareza) >= orden.indexOf(c.valor);
  }
  return false;
}

/* ---------- Misiones ---------- */
function refrescarMisiones() {
  const cd = hoyClave(), cs = semanaClave();
  if (E.misiones.claveDia !== cd) {
    E.misiones.claveDia = cd;
    E.misiones.diarias = generarMisiones(3, 'diaria', cd);
  }
  if (E.misiones.claveSemana !== cs) {
    E.misiones.claveSemana = cs;
    E.misiones.semanales = generarMisiones(2, 'semanal', cs);
  }
  tocar();
}
function generarMisiones(n, tipo, clave) {
  const r = semilla(clave + tipo);
  const pool = PLANTILLAS_MISION.slice();
  const out = [];
  const escala = tipo === 'semanal' ? 7 : 1;
  // El nivel deja de escalar los premios a partir del 30: si no, una misión
  // diaria de nivel 70 pagaba miles de millones y sobraba todo lo demás.
  const nivelTope = Math.min(E.nivel, 30);
  for (let i = 0; i < n && pool.length; i++) {
    const idx = Math.floor(r() * pool.length);
    const p = pool.splice(idx, 1)[0];
    const nivelF = 1 + (E.nivel - 1) * 0.35;
    let meta = Math.ceil((p.base + p.esc * Math.floor(r() * 4)) * escala * nivelF);
    if (p.oroEscala) meta = Math.ceil(meta * Math.pow(1.35, nivelTope - 1) / 10) * 10;
    out.push({
      id: p.id + '_' + tipo + '_' + i, tipo, plantilla: p.id, emo: p.emo,
      nombre: p.nom, desc: p.txt(meta), stat: p.stat, meta,
      base: E.stats[p.stat] || 0, cobrada: false,
      oro: Math.round((tipo === 'semanal' ? 4200 : 700) * Math.pow(1.28, nivelTope - 1)),
      xp: Math.round((tipo === 'semanal' ? 260 : 60) * Math.pow(1.16, nivelTope - 1)),
      polen: tipo === 'semanal' ? 3 : 0,
      semilla: tipo === 'semanal' && r() > 0.5,
    });
  }
  return out;
}
const progresoMision = m => m.tipo === 'permanente'
  ? lim((E.stats[m.stat] || 0) / m.meta, 0, 1)
  : lim(((E.stats[m.stat] || 0) - m.base) / m.meta, 0, 1);

function cobrarMision(m) {
  if (m.cobrada || progresoMision(m) < 1) return;
  m.cobrada = true;
  if (m.tipo === 'permanente') E.misiones.perm[m.id] = true;
  darOro(m.oro); darXP(m.xp);
  if (m.polen) { E.polen += m.polen; sumar('polenTotal', m.polen); }
  if (m.semilla) { if (hayEspacio()) darSemilla(genSilvestre(0.5), 'misión'); }
  sumar('misiones');
  log(`Misión cumplida: <b>${m.nombre}</b> (+${monedas(m.oro)} 🪙)`, 'evento');
  aviso('📜', 'Misión cumplida', m.nombre + ' · +' + monedas(m.oro) + ' 🪙', 'oro');
  sonido('mision');
  chispasEn(null);
  tocar();
  pintarVista(); pintarTop();
}
function misionesPermanentesActivas() {
  const out = [];
  const porStat = {};
  MISIONES_FIJAS.forEach(m => {
    if (E.misiones.perm[m.id]) return;
    if (porStat[m.stat]) return;               // solo el siguiente hito de cada línea
    porStat[m.stat] = true;
    out.push(m);
  });
  return out;
}

/* ---------- Logros ---------- */
function revisarLogros() {
  LOGROS.forEach(l => {
    if (E.logros[l.id]) return;
    let ok = false;
    try { ok = l.cond(E); } catch (err) { ok = false; }
    if (!ok) return;
    E.logros[l.id] = Date.now();
    darOro(l.oro);
    darXP(Math.min(6000, Math.round(l.oro / 20)));
    aviso(l.emo, '¡Logro! ' + l.nombre, l.desc + ' · +' + monedas(l.oro) + ' 🪙', 'logro');
    log(`Logro desbloqueado: <b>${l.nombre}</b>`, 'evento');
    sonido('logro');
    confeti();
  });
  tocar();
}
const coloresDescubiertos = e => {
  const s = new Set();
  Object.keys(e.herbario).forEach(id => { if (!id.startsWith('sec-')) s.add(id.split('-')[1]); });
  return s.size;
};
const formasDescubiertas = e => {
  const s = new Set();
  Object.keys(e.herbario).forEach(id => { if (!id.startsWith('sec-')) s.add(id.split('-')[0]); });
  return s.size;
};

/* ============================================================
   8. ACCIONES DE JUEGO
   ============================================================ */

/* Los fenotipos se calculan una vez por genotipo y se reutilizan:
   el bucle de simulación los consulta muchas veces por segundo. */
const cacheFen = new Map();
const CACHE_FEN_MAX = 4000;
function fen(clave) {
  let f = cacheFen.get(clave);
  if (!f) {
    // Cada genotipo distinto deja una entrada. En partidas muy largas son
    // decenas de miles, así que el caché se vacía al llegar al tope.
    if (cacheFen.size > CACHE_FEN_MAX) cacheFen.clear();
    f = fenotipo(genDec(codDe(clave)), biomaDe(clave));
    cacheFen.set(clave, f);
  }
  return f;
}
/** Fenotipo de una planta según la tierra donde está: el bioma lo pone la parcela. */
const fenEn = (cod, parcela) => fen(claveItem(codDe(cod), biomaDeParcela(parcela)));
/** Duración total del crecimiento de una flor, en ms. */
const duracionCrec = f => 55000 * (1 + f.puntos * 0.095);

/* ---------- Herbario ---------- */
function descubrir(f, cod) {
  const h = E.herbario[f.especie];
  if (h) { h.veces++; return false; }
  E.herbario[f.especie] = { fecha: Date.now(), veces: 1, vendidas: 0, mejor: 0, cod, gen: E.mundo.dia };
  E.stats.especies = Object.keys(E.herbario).filter(k => !k.startsWith('sec-')).length;
  E.stats.secretos = Object.keys(E.herbario).filter(k => k.startsWith('sec-')).length;
  darXP(18 + f.puntos * 2.2);
  log(`Nueva especie en el herbario: <b>${f.nombre}</b>`, 'genetica');
  aviso(f.emo, '¡Especie nueva!', f.nombre + ' · ' + rarezaPorId(f.rareza).nombre, f.secreto ? 'logro' : 'oro');
  sonido(f.secreto ? 'secreto' : 'descubrir');
  if (f.secreto) confeti();
  tocar();
  return true;
}

/* ---------- Parcelas ---------- */
const parcelasAbiertas = () => E.parcelas.filter(p => p.abierta).length;
const costoParcela = () => Math.round(600 * Math.pow(1.55, parcelasAbiertas() - JUEGO.parcelasIniciales));

function ampliarInvernadero() {
  const libre = E.parcelas.find(p => !p.abierta);
  if (!libre) { aviso('🏡', 'Invernadero completo', 'Ya tienes las 48 parcelas.'); return; }
  const c = costoParcela();
  if (E.oro < c) { aviso('🪙', 'Faltan monedas', 'Necesitas ' + monedas(c) + ' 🪙.', 'malo'); sonido('no'); return; }
  E.oro -= c;
  libre.abierta = true;
  E.stats.parcelas = parcelasAbiertas();
  log(`Abriste una parcela nueva por <b>${monedas(c)}</b> 🪙 (${parcelasAbiertas()} en total).`);
  sonido('compra');
  tocar(); pintarTodo();
}

/* ---------- Biomas ---------- */
const biomaAbierto = id => id === 'patio' || (E.biomas || []).includes(id);

function comprarBioma(id) {
  const b = BIOMAS[id];
  if (!b || biomaAbierto(id)) return;
  if (E.nivel < b.nivel) { aviso('🔒', 'Aún no', 'Necesitas nivel ' + b.nivel + '.', 'malo'); sonido('no'); return; }
  if (E.oro < b.precio) { aviso('🪙', 'Faltan monedas', 'Cuesta ' + monedas(b.precio) + ' 🪙.', 'malo'); sonido('no'); return; }
  E.oro -= b.precio;
  E.biomas = (E.biomas || []).concat(id);
  darXP(300);
  sonido('investigar');
  log(`Abriste el sector <b>${b.nombre}</b> ${b.emo}. Ahora se expresa el locus <b>${b.locus}</b>.`, 'evento');
  aviso(b.emo, 'Sector ' + b.nombre, 'Las flores que cultives ahí pueden salir ' + RASGOS_BIOMA[b.rasgo].adj + 's.', 'logro');
  confeti();
  tocar(); pintarTodo();
}

/** Cambia el clima de una parcela. La planta que hubiera se pierde. */
function cambiarBiomaParcela(idx, id) {
  const p = E.parcelas[idx];
  if (!p || !p.abierta || !biomaAbierto(id)) return;
  if (biomaDeParcela(p) === id) { cerrarModal(); return; }
  const aplicar = () => {
    p.bioma = id;
    p.planta = null; p.plaga = 0; p.fijada = null;
    p.agua = 100;
    tocar(); cerrarModal(); pintarTodo();
    log(`La parcela ${idx + 1} pasa a ser <b>${BIOMAS[id].nombre}</b> ${BIOMAS[id].emo}.`);
  };
  if (p.planta) confirmar('Cambiar el clima de la parcela',
    'Lo que hay plantado ahí se pierde. ¿Seguir?', aplicar);
  else aplicar();
}

function modalBiomas(idx) {
  const p = E.parcelas[idx];
  const actual = biomaDeParcela(p);
  modal(`<h3 class="modal-tit">Clima de la parcela ${idx + 1}</h3>
    <p class="modal-sub">Cada sector tiene su clima y despierta un locus dormido:
    la misma semilla da una flor distinta según dónde la siembres.</p>
    <div class="rejilla c2">
      ${ORDEN_BIOMAS.map(id => {
        const b = BIOMAS[id];
        const abierto = biomaAbierto(id);
        const esta = actual === id;
        return `<div class="mini-tarjeta ${esta ? 'hecho' : ''} ${abierto ? '' : 'bloq'}"
          data-bioma-parcela="${id}" data-idx="${idx}" style="text-align:left">
          <span class="mt-emo">${b.emo}</span>
          <span class="mt-nom">${b.nombre}${esta ? ' · aquí' : ''}</span>
          <span class="mt-sub">${b.desc}</span>
          ${b.locus ? `<span class="pastilla" style="margin-top:6px">locus ${b.locus} → ${RASGOS_BIOMA[b.rasgo].adj}</span>` : ''}
          <span class="mt-sub" style="margin-top:5px">${abierto ? '' :
            (E.nivel < b.nivel ? '🔒 Nivel ' + b.nivel : monedas(b.precio) + ' 🪙 — tócalo para abrirlo')}</span>
        </div>`;
      }).join('')}
    </div>`, true);
}

function plantar(idx, cod, silencio) {
  const p = E.parcelas[idx];
  if (!p || !p.abierta || p.planta) return false;
  if (!quitarSemilla(cod)) return false;
  p.planta = { cod, prog: 0, salud: 100, plantada: Date.now(), mimos: 0 };
  // Sembrar a mano fija la variedad de esa parcela: la resiembra automática
  // repetirá lo que tú elegiste, no lo que le sobre al almacén.
  if (!silencio) p.fijada = cod;
  p.plaga = 0;
  p.agua = Math.max(p.agua, 55);
  sumar('plantadas');
  tocar();
  // La resiembra automática planta muchas veces por minuto: repintar el
  // invernadero entero en cada una tiraba los fotogramas al suelo.
  if (silencio) return true;
  sonido('plantar');
  const el = $(`[data-parcela="${idx}"]`);
  if (el) { el.classList.add('plantando'); setTimeout(() => el.classList.remove('plantando'), 500); }
  pintarParcelas(); pintarInventario(); pintarDetalle();
  return true;
}

/**
 * Elige qué resembrar en una parcela recién cosechada. Manda lo que TÚ
 * sembraste ahí (`p.fijada`); si no queda, el mismo genotipo, luego la misma
 * especie y por último la semilla más repetida.
 * Sin esto, el invernadero se vaciaba solo: las hijas casi nunca comparten
 * genotipo exacto con la madre.
 */
function semillaParaResiembra(cod, parcela) {
  const hay = c => c && E.semillas.some(s => s.cod === c);
  if (parcela && hay(parcela.fijada)) return parcela.fijada;
  if (hay(cod)) return cod;
  if (parcela && parcela.fijada) {
    // La variedad elegida se acabó: al menos se sigue con su misma especie.
    const espFija = fen(parcela.fijada).especie;
    const pariente = E.semillas.find(s => fen(s.cod).especie === espFija);
    if (pariente) return pariente.cod;
  }
  const esp = fen(cod).especie;
  const misma = E.semillas.find(s => fen(s.cod).especie === esp);
  if (misma) return misma.cod;
  const abundante = E.semillas.slice().sort((a, b) => b.n - a.n)[0];
  return abundante ? abundante.cod : null;
}

function regar(idx, silencio) {
  const p = E.parcelas[idx];
  if (!p || !p.abierta) return false;
  if (p.agua >= 99) return false;
  p.agua = 100;
  if (p.planta) p.planta.mimos++;
  sumar('regadas');
  if (!silencio) { sonido('agua'); gotasEn(idx); }
  tocar();
  return true;
}
/** Vacía el almacén de lo más barato hasta dejarlo a media carga. */
function despejarAMano() {
  if (ocupado() < capacidad() * 0.35) {
    aviso('📦', 'Almacén holgado', 'Todavía tienes sitio de sobra.');
    return;
  }
  const antes = ocupado();
  const total = despejarAlmacen(0.5);
  if (!total) { aviso('📦', 'Nada que despejar', 'Guarda al menos ' + DESPEJE_RESERVA + ' montones de semillas.'); return; }
  sonido('moneda');
  flotar('+' + monedas(total) + ' 🪙', '#b08c3c');
  aviso('🧹', 'Almacén despejado', `Liberaste ${antes - ocupado()} espacios y ganaste ${monedas(total)} 🪙.`, 'oro');
  pintarTodo();
}
function regarTodo() {
  let n = 0;
  E.parcelas.forEach(p => { if (p.abierta && p.agua < 99) { if (regar(p.i, true)) n++; } });
  if (n) { sonido('agua'); log(`Regaste <b>${n}</b> parcela${n > 1 ? 's' : ''}.`); pintarParcelas(); }
  else aviso('💧', 'Todo regado', 'Ninguna parcela lo necesitaba.');
}

function curarPlaga(idx) {
  const p = E.parcelas[idx];
  if (!p || !p.plaga) return;
  p.plaga = 0;
  if (p.planta) p.planta.salud = lim(p.planta.salud + 12, 0, 100);
  sumar('plagasCuradas');
  sonido('limpiar');
  log('Limpiaste una plaga.', 'cosecha');
  tocar(); pintarParcelas(); pintarDetalle();
}

function cosechar(idx, silencio) {
  const p = E.parcelas[idx];
  if (!p || !p.planta || p.planta.prog < 1) return false;
  const pl = p.planta;
  const f = fenEn(pl.cod, p);
  const b = bonos();
  // Cosechar NUNCA se bloquea: la flor siempre se recoge. Antes, con el
  // almacén lleno no se podía cosechar nada y el juego se trababa entero.
  darFlor(genDec(pl.cod), biomaDeParcela(p));
  // Semillas: autofecundación, así que los recesivos se reparten de verdad.
  // Solo entran las que caben; si sobran, se avisa en vez de trabar la partida.
  let nSem = 1 + b.semillasExtra + (suerte(0.28) ? 1 : 0) + (pl.salud > 85 ? 1 : 0);
  if (pl.salud < 45) nSem = Math.max(0, nSem - 1);
  const mut = probMutacion();
  let perdidas = 0;
  for (let i = 0; i < nSem; i++) {
    if (!hayEspacio()) { perdidas = nSem - i; break; }
    const hijo = autofecundar(genDec(pl.cod), mut);
    darSemilla(hijo.gen, 'cosecha');
    if (hijo.mutados.length) sumar('mutaciones');
  }
  if (perdidas) avisarAlmacenLleno(perdidas);
  const xp = Math.round(xpDe(f) * (0.55 + pl.salud / 200));
  darXP(xp);
  sumar('cosechas');
  contarRareza(f);
  descubrir(f, pl.cod);
  if (tieneInv('rar1') && suerte(0.04 + (f.puntos > 12 ? 0.06 : 0))) {
    E.polen++; sumar('polenTotal');
    if (!silencio) aviso('✨', 'Polen dorado', 'Encontraste polen dorado en la corola.', 'oro');
  }
  p.planta = null;
  p.plaga = 0;
  if (!silencio) {
    sonido('cosechar');
    flotar(`+${xp} XP`, '#6f9d63', idx);
    chispasEn(idx, f.hex);
    log(`Cosechaste <b>${f.nombre}</b> (${rarezaPorId(f.rareza).nombre}).`, 'cosecha');
  }
  // Resiembra automática (se puede apagar; hay quien prefiere elegir a mano)
  if (tieneInv('aut4') && E.ajustes.autoResiembra !== false) {
    const siguiente = semillaParaResiembra(pl.cod, p);
    if (siguiente) plantar(idx, siguiente, true);
  }
  tocar();
  return true;
}
/* Un solo aviso cada tanto, con la solución a un toque, en vez de repetirlo
   en cada cosecha. */
let ultimoAvisoAlmacen = 0;
function avisarAlmacenLleno(perdidas) {
  sumar('semillasPerdidas', perdidas);
  // Con el auto-despeje encendido esto casi no pasa; y si pasa, no hace falta
  // repetirlo cada rato: el botón «Despejar» ya late en la cabecera.
  if (window.__silencio || E.ajustes.autoDespejar) return;
  const ahora = Date.now();
  if (ahora - ultimoAvisoAlmacen < 180000) return;
  ultimoAvisoAlmacen = ahora;
  aviso('📦', 'Almacén lleno', 'Las flores se siguen cosechando, pero las semillas de más se pierden. Toca «Despejar» o enciende el auto-despeje en Ajustes.', 'malo');
}
function cosecharTodo() {
  let n = 0;
  E.parcelas.forEach(p => { if (p.planta && p.planta.prog >= 1) { if (cosechar(p.i, true)) n++; } });
  if (n) { sonido('cosechar'); log(`Cosechaste <b>${n}</b> flores de una vez.`, 'cosecha'); confetiChico(); }
  else aviso('🧺', 'Nada maduro', 'Todavía no hay flores listas.');
  pintarTodo();
}
function contarRareza(f) {
  sumar('rar_' + f.rareza);
  if (f.rareza === 'divino') sumar('divinos');
  if (f.rareza === 'mitico') sumar('miticos');
  if (f.rareza === 'legendario') sumar('legendarios');
  if (f.brillo) sumar('brillos');
  if (f.secreto) sumar('secretosCultivados');
}
function probMutacion() {
  const b = bonos();
  let p = 0.012 * b.mut;
  if (tieneInv('rar5') && esNoche()) p *= 1.4;
  return lim(p, 0, 0.5);
}

/* ---------- Cruce ---------- */
function cruzar(codA, codB, forzar) {
  if (!codA || !codB) return null;
  if (!hayEspacio(2)) { aviso('📦', 'Almacén lleno', 'No caben más semillas.', 'malo'); return null; }
  const stA = E.flores.find(s => s.cod === codA);
  const stB = codA === codB ? stA : E.flores.find(s => s.cod === codB);
  if (!stA || !stB) return null;
  if (codA === codB && stA.n < 2) { aviso('🌸', 'Falta una flor', 'Necesitas dos flores para autofecundar.', 'malo'); return null; }
  quitarFlor(codA); quitarFlor(codB);

  const gA = genDec(codDe(codA)), gB = genDec(codDe(codB));
  const b = bonos();
  let n = 2 + (tieneInv('gen5') ? 1 : 0) + (suerte(0.28) ? 1 : 0);
  const mut = probMutacion();
  const hijos = [];
  for (let i = 0; i < n && hayEspacio(); i++) {
    const r = meiosis(gA, gB, mut);
    // La luminiscencia se hereda mejor con ciertas mejoras y de noche
    if (b.brillo > 0 && !r.gen.X.includes('x') && suerte(b.brillo)) {
      r.gen.X = ordenarPar(LOCUS.X, ['X', 'x']);
    }
    if (forzar && forzar.locus && forzar.alelo) {
      const l = LOCUS[forzar.locus];
      r.gen[l.id] = ordenarPar(l, [forzar.alelo, elige(gB[l.id])]);
    }
    const f = fenotipo(r.gen);
    darSemilla(r.gen, 'cruce');
    if (r.mutados.length) sumar('mutaciones');
    hijos.push({ gen: r.gen, cod: genCod(r.gen), fen: f, mutados: r.mutados });
  }
  sumar('cruces');
  darXP(12 + Math.round((fen(codA).puntos + fen(codB).puntos) * 0.9));
  sonido('cruce');
  const nuevos = hijos.filter(h => !E.herbario[h.fen.especie]);
  log(`Cruzaste <b>${fen(codA).nombre}</b> × <b>${fen(codB).nombre}</b> → ${hijos.length} semillas` +
      (hijos.some(h => h.mutados.length) ? ' <b>(¡mutación!)</b>' : '') + '.', 'genetica');
  if (hijos.some(h => h.mutados.length)) aviso('⚡', 'Mutación', 'Alguna semilla salió con un alelo cambiado.', 'evento');
  tocar();
  return { hijos, nuevos };
}

/* ---------- Venta ---------- */
function precioVenta(f, cantidad) {
  const b = bonos();
  let p = precioBase(f) * b.precio * demandaDe(f.color);
  if (f.nectar) p *= b.precioNectar;
  const ev = eventoActivo();
  if (ev && ev.ef && ev.ef.precioRaro) {
    const orden = RAREZAS.map(r => r.id);
    if (orden.indexOf(f.rareza) >= 3) p *= ev.ef.precioRaro;
  }
  if (tieneInv('com5')) {
    const orden = RAREZAS.map(r => r.id);
    if (orden.indexOf(f.rareza) >= 3) p *= 2;
  }
  return Math.max(1, Math.round(p)) * (cantidad || 1);
}
function vender(cod, n) {
  const st = E.flores.find(s => s.cod === cod);
  if (!st) return;
  n = lim(n || 1, 1, st.n);
  const f = fen(cod);
  const b = bonos();
  let total = 0;
  for (let i = 0; i < n; i++) {
    let p = precioVenta(f, 1);
    if (b.rareza > 0 && suerte(b.rareza)) {
      const orden = RAREZAS.map(r => r.id);
      const sig = RAREZAS[Math.min(RAREZAS.length - 1, orden.indexOf(f.rareza) + 1)];
      p = Math.round(p * sig.mult / rarezaPorId(f.rareza).mult);
    }
    total += p;
  }
  // Cliente especial
  let bonoCliente = 0;
  if (E.cliente && clienteAcepta(f)) {
    bonoCliente = Math.round(total * (E.cliente.mult - 1));
    total += bonoCliente;
    sumar('clientes');
    const c = CLIENTES.find(x => x.id === E.cliente.id);
    log(`<b>${c.nombre}</b> compró ${n} × ${f.nombre} y pagó de más.`, 'venta');
    aviso(c.emo, 'Cliente satisfecho', '+' + monedas(bonoCliente) + ' 🪙 de propina.', 'oro');
    E.cliente = null;
  }
  quitarFlor(cod, n);
  darOro(total);
  // Vender presiona la demanda de esa familia de color
  const fam = familiaDeColor(f.color);
  E.mercado.demanda[fam] = lim(E.mercado.demanda[fam] - 0.021 * n, 0.3, 3);
  const h = E.herbario[f.especie];
  if (h) { h.vendidas += n; h.mejor = Math.max(h.mejor || 0, Math.round(total / n)); }
  sumar('ventas', n);
  avanzarEncargo(f, n);
  darXP(Math.round(2 + f.puntos * 0.4) * n);
  sonido('moneda');
  flotar('+' + monedas(total) + ' 🪙', '#b08c3c');
  log(`Vendiste ${n} × <b>${f.nombre}</b> por <b>${monedas(total)}</b> 🪙.`, 'venta');
  tocar(); pintarTodo();
}
/* Las semillas también se venden, más baratas que la flor. Sin esta salida el
   almacén se tapona: cada cosecha devuelve más semillas de las que gasta. */
const precioSemillaVenta = f => Math.max(1, Math.round(precioVenta(f, 1) * 0.35));

function venderSemillas(cod, n) {
  const st = E.semillas.find(s => s.cod === cod);
  if (!st) return;
  n = lim(n || 1, 1, st.n);
  const f = fen(cod);
  const total = precioSemillaVenta(f) * n;
  quitarSemilla(cod, n);
  darOro(total);
  sumar('semillasVendidas', n);
  darXP(Math.round(1 + f.puntos * 0.15) * n);
  sonido('moneda');
  flotar('+' + monedas(total) + ' 🪙', '#b08c3c');
  log(`Vendiste ${n} semilla${n > 1 ? 's' : ''} de <b>${f.nombre}</b> por <b>${monedas(total)}</b> 🪙.`, 'venta');
  tocar(); pintarTodo();
}
/**
 * Despeja el almacén vendiendo siempre lo más barato que haya, semillas antes
 * que flores. Sin esto el invernadero autónomo se atascaba: al llenarse el
 * almacén ya no se podía cosechar y toda la automatización quedaba parada.
 */
const DESPEJE_RESERVA = 20;   // montones de semillas que nunca se malvenden
function despejarAlmacen(limite) {
  const tope = capacidad() * (limite || 0.82);
  if (ocupado() <= tope) return 0;
  let total = 0, piezas = 0;
  // Primero las flores más baratas: son el producto, las semillas son la herramienta.
  const flores = E.flores.slice().sort((a, b) => precioVenta(fen(a.cod), 1) - precioVenta(fen(b.cod), 1));
  for (const st of flores) {
    if (ocupado() <= tope) break;
    const n = st.n, p = precioVenta(fen(st.cod), 1) * n;
    quitarFlor(st.cod, n);
    total += p; piezas += n;
    sumar('ventas', n);
    const fam = familiaDeColor(fen(st.cod).color);
    E.mercado.demanda[fam] = lim(E.mercado.demanda[fam] - 0.014 * n, 0.3, 3);
  }
  // Después el sobrante de semillas, guardando siempre las más valiosas.
  // Se venden montones enteros: con genotipos únicos casi todos tienen una sola
  // semilla, así que exigir n>1 dejaba el almacén bloqueado para siempre.
  const sems = E.semillas.slice().sort((a, b) => precioSemillaVenta(fen(a.cod)) - precioSemillaVenta(fen(b.cod)));
  for (let i = 0; i < sems.length - DESPEJE_RESERVA; i++) {
    if (ocupado() <= tope) break;
    const st = sems[i], n = st.n, p = precioSemillaVenta(fen(st.cod)) * n;
    quitarSemilla(st.cod, n);
    total += p; piezas += n;
    sumar('semillasVendidas', n);
  }
  if (piezas) {
    darOro(total);
    log(`El invernadero autónomo despejó <b>${piezas}</b> piezas por <b>${monedas(total)}</b> 🪙.`, 'venta');
  }
  return total;
}

/** Vacía el excedente de semillas corrientes, dejando siempre unas cuantas. */
function venderSemillasSobrantes(rarezas, dejar) {
  let total = 0, n = 0;
  E.semillas.slice().forEach(st => {
    const f = fen(st.cod);
    if (rarezas && !rarezas.includes(f.rareza)) return;
    const cant = st.n - (dejar || 0);
    if (cant <= 0) return;
    total += precioSemillaVenta(f) * cant;
    n += cant;
    quitarSemilla(st.cod, cant);
  });
  if (!n) return 0;
  darOro(total);
  sumar('semillasVendidas', n);
  log(`Vendiste ${n} semillas sobrantes por <b>${monedas(total)}</b> 🪙.`, 'venta');
  return total;
}

function venderTodoDe(rarezas) {
  let total = 0, n = 0;
  E.flores.slice().forEach(st => {
    const f = fen(st.cod);
    if (rarezas && !rarezas.includes(f.rareza)) return;
    const cant = st.n;
    const p = precioVenta(f, cant);
    total += p; n += cant;
    quitarFlor(st.cod, cant);
    avanzarEncargo(f, cant);   // la venta en bloque también cuenta para el encargo
    const h = E.herbario[f.especie]; if (h) h.vendidas += cant;
    const fam = familiaDeColor(f.color);
    E.mercado.demanda[fam] = lim(E.mercado.demanda[fam] - 0.018 * cant, 0.3, 3);
  });
  if (!n) { aviso('🛒', 'Nada que vender', 'No hay flores de esa rareza.'); return; }
  darOro(total);
  sumar('ventas', n);
  darXP(Math.round(n * 3));
  sonido('moneda');
  flotar('+' + monedas(total) + ' 🪙', '#b08c3c');
  log(`Venta rápida: ${n} flores por <b>${monedas(total)}</b> 🪙.`, 'venta');
  tocar(); pintarTodo();
}

/* ---------- Compras ---------- */
function comprarSemilla(id, cantidad) {
  const s = semillaPorId(id);
  if (!s) return;
  const cant = cantidad || 1;
  const precio = precioSemilla(s) * cant;
  if (E.nivel < s.nivel) { aviso('🔒', 'Aún no', 'Necesitas nivel ' + s.nivel + '.', 'malo'); sonido('no'); return; }
  if (s.invest && !tieneInv(s.invest)) { aviso('🔒', 'Falta investigar', invPorId(s.invest).nombre + '.', 'malo'); sonido('no'); return; }
  if (E.oro < precio) { aviso('🪙', 'Faltan monedas', 'Cuesta ' + monedas(precio) + ' 🪙.', 'malo'); sonido('no'); return; }
  if (!hayEspacio(cant)) { aviso('📦', 'Almacén lleno', 'Amplía el almacén.', 'malo'); sonido('no'); return; }
  E.oro -= precio;
  for (let i = 0; i < cant; i++) darSemilla(s.gen(), s.id);
  sumar('semillasCompradas', cant);
  sonido('compra');
  log(`Compraste ${cant} × <b>${s.nombre}</b> por ${monedas(precio)} 🪙.`);
  tocar(); pintarTodo();
}
function precioSemilla(s) {
  const ev = eventoActivo();
  let p = s.precio;
  if (ev && ev.ef && ev.ef.semillas) p *= ev.ef.semillas;
  return Math.round(p);
}

function comprarInvestigacion(id) {
  const n = invPorId(id);
  if (!n || tieneInv(id)) return;
  if (!n.req.every(r => tieneInv(r))) { aviso('🔒', 'Falta un requisito', 'Investiga antes lo anterior.', 'malo'); return; }
  if (E.oro < n.oro || E.ciencia < n.ci) {
    aviso('🔬', 'No alcanza', `Cuesta ${monedas(n.oro)} 🪙 y ${n.ci} 🔬.`, 'malo'); sonido('no'); return;
  }
  E.oro -= n.oro; E.ciencia -= n.ci;
  E.invest.push(id);
  E.stats.investigaciones = E.invest.length;
  darXP(60 + n.ci * 3);
  sonido('investigar');
  log(`Investigación completada: <b>${n.nombre}</b>.`, 'evento');
  aviso(n.emo, 'Investigación lista', n.nombre + ' — ' + n.desc, 'oro');
  confetiChico();
  tocar(); pintarTodo();
}

function comprarDeco(id) {
  const d = decoPorId(id);
  if (!d || tieneDeco(id)) return;
  if (E.oro < d.precio) { aviso('🪙', 'Faltan monedas', 'Cuesta ' + monedas(d.precio) + ' 🪙.', 'malo'); sonido('no'); return; }
  E.oro -= d.precio;
  E.deco.push(id);
  E.stats.decoraciones = E.deco.length;
  darXP(40);
  sonido('compra');
  log(`Colocaste <b>${d.nombre}</b> ${d.emo} en el invernadero.`);
  tocar(); pintarTodo();
}

/* ---------- Encargos largos ---------- */
function nuevoEncargo() {
  const hayBioma = (E.biomas || []).length > 0;
  const pool = ENCARGOS.filter(x => !x.requiereBioma || hayBioma);
  const plantilla = elige(pool);
  const d = plantilla.arma();
  // Escala suave y por dificultad: pedir 40 flores legendarias no es un
  // encargo, es un muro.
  const base = plantilla.base || 5;
  const cant = Math.max(2, Math.round(base * (0.8 + Math.random() * 0.5) * (1 + E.nivel * 0.06)));
  E.encargo = {
    id: plantilla.id, emo: plantilla.emo, dato: d.dato, txt: d.txt,
    meta: cant, hechas: 0, vence: E.mundo.dia + plantilla.dias,
    oro: Math.round(4000 * Math.pow(1.22, Math.min(E.nivel, 30))),
    esporas: 1 + Math.floor(E.nivel / 12),
    xp: Math.round(180 * Math.pow(1.1, Math.min(E.nivel, 30))),
  };
  log(`Encargo nuevo: <b>${cant}</b> ${d.txt}.`, 'evento');
  aviso(plantilla.emo, 'Encargo nuevo', `${cant} ${d.txt}, antes del día ${E.encargo.vence}.`, 'evento');
  tocar();
}
const cumpleEncargo = f => {
  const e = E.encargo; if (!e) return false;
  const p = ENCARGOS.find(x => x.id === e.id); if (!p) return false;
  // Se rearma la condición desde el dato guardado, para no serializar funciones.
  switch (e.id) {
    case 'color':  return f.color === e.dato;
    case 'forma':  return f.forma === e.dato;
    case 'hoja':   return f.hoja === e.dato;
    case 'nectar': return !!f.nectar;
    case 'brillo': return !!f.brillo;
    case 'bioma':  return f.rasgo === e.dato;
    case 'rareza': { const o = RAREZAS.map(x => x.id); return o.indexOf(f.rareza) >= o.indexOf(e.dato); }
  }
  return false;
};
/** Cada flor vendida que encaje suma al encargo. */
function avanzarEncargo(f, n) {
  const e = E.encargo;
  if (!e || e.cobrado || !cumpleEncargo(f)) return;
  e.hechas += n || 1;
  if (e.hechas >= e.meta && !e.cobrado) {
    e.cobrado = true;
    darOro(e.oro); darXP(e.xp);
    E.esporas = (E.esporas || 0) + e.esporas;
    sumar('encargos');
    log(`Encargo completado: <b>${e.meta} ${e.txt}</b> (+${e.esporas} ✿).`, 'evento');
    aviso('📜', 'Encargo entregado', `+${monedas(e.oro)} 🪙 y +${e.esporas} ✿`, 'logro');
    sonido('logro'); confeti();
  }
  tocar();
}
function revisarEncargo() {
  if (!E.encargo) { if (E.nivel >= 4) nuevoEncargo(); return; }
  if (E.encargo.cobrado || E.mundo.dia > E.encargo.vence) {
    if (!E.encargo.cobrado) log(`El encargo de ${E.encargo.txt} venció.`, 'malo');
    E.encargo = null;
    if (E.nivel >= 4) nuevoEncargo();
  }
}

/* ---------- Injertos ---------- */
const COSTO_INJERTO = 3;
/**
 * Fuerza un locus a homocigoto usando un alelo que ya esté en la flor.
 * Cuesta esporas: es el atajo caro para cerrar una línea genética.
 */
function injertar(clave, locusId, alelo) {
  const st = E.flores.find(s => s.cod === clave);
  const l = LOCUS[locusId];
  if (!st || !l) return;
  if ((E.esporas || 0) < COSTO_INJERTO) {
    aviso('✿', 'Faltan esporas', 'El injerto cuesta ' + COSTO_INJERTO + ' ✿.', 'malo'); sonido('no'); return;
  }
  const g = genDec(codDe(clave));
  if (!g[locusId].includes(alelo)) {
    aviso('🧬', 'Ese alelo no está', 'Solo puedes fijar un alelo que la flor ya lleve.', 'malo'); return;
  }
  if (!hayEspacio()) { aviso('📦', 'Almacén lleno', 'Despeja antes de injertar.', 'malo'); return; }
  E.esporas -= COSTO_INJERTO;
  quitarFlor(clave);
  g[locusId] = ordenarPar(l, [alelo, alelo]);
  darSemilla(g, 'injerto');
  sumar('injertos');
  const f = fenotipo(g, biomaDe(clave));
  log(`Injerto: fijaste <b>${alelo}${alelo}</b> en ${l.nombre} → ${f.nombre}.`, 'genetica');
  aviso('🧬', 'Injerto hecho', `${l.nombre} queda ${alelo}${alelo} en la semilla nueva.`, 'oro');
  sonido('cruce'); chispasEn(null);
  tocar(); cerrarModal(); pintarTodo();
}
function modalInjerto(clave) {
  const g = genDec(codDe(clave));
  const f = fen(clave);
  modal(`<h3 class="modal-tit">🧬 Injerto</h3>
    <p class="modal-sub">Fija un locus de <b>${f.nombre}</b> en homocigoto. Se gasta la flor y
    <b>${COSTO_INJERTO} ✿</b>, y sale una semilla con ese par asegurado.
    Tienes ${E.esporas || 0} ✿.</p>
    <div class="lista-simple">
      ${LOCI.map(l => {
        const par = g[l.id];
        const unicos = par[0] === par[1] ? [par[0]] : par;
        return `<div class="item-lista">
          <span class="item-txt"><span class="item-nom">${l.nombre} <span class="pastilla">${par.join('')}</span></span>
          <span class="item-desc">${l.desc}</span></span>
          <span class="item-der" style="flex-direction:row;gap:5px">
            ${unicos.map(a => `<button class="btn ${par[0] === par[1] ? 'btn-suave' : 'btn-lila'} btn-mini"
              data-injerto="${clave}" data-locus="${l.id}" data-alelo="${a}"
              ${par[0] === par[1] ? 'disabled' : ''}>${a}${a}</button>`).join('')}
          </span></div>`;
      }).join('')}
    </div>`, true);
}

/* ---------- Concurso semanal ---------- */
function presentarAlConcurso(clave) {
  const q = quien();
  if (!q) { modalQuien(); return; }
  const st = E.flores.find(s => s.cod === clave);
  if (!st) return;
  const f = fen(clave);
  const c = concursoDeSemana();
  const puntaje = Math.round(c.mide(f));
  const sem = semanaClave();
  const previo = E.concurso && E.concurso.semana === sem ? E.concurso : null;
  if (previo && previo.puntaje >= puntaje) {
    aviso('🏆', 'Ya tienes algo mejor', `Tu ${previo.nombre} puntúa ${previo.puntaje}.`);
    return;
  }
  quitarFlor(clave);
  E.concurso = { semana: sem, tema: c.id, puntaje, nombre: f.nombre, emo: f.emo, rareza: f.rareza, cod: clave };
  sumar('concursos');
  log(`Presentaste <b>${f.nombre}</b> al concurso «${c.nombre}»: ${puntaje} puntos.`, 'evento');
  aviso(c.emo, 'Presentada al concurso', `${f.nombre} · ${puntaje} puntos`, 'oro');
  sonido('mision');
  tocar();
  Nube.sincronizar(true);
  pintarTodo();
}

/* ---------- Crisis con decisión ---------- */
function lanzarCrisis() {
  if (E.crisis) return;
  const c = elige(CRISIS);
  E.crisis = { id: c.id, t: Date.now() };
  tocar();
  modalCrisis();
}
function modalCrisis() {
  const c = CRISIS.find(x => x.id === (E.crisis || {}).id);
  if (!c) return;
  modal(`<h3 class="modal-tit">${c.emo} ${c.titulo}</h3>
    <p class="modal-sub">${c.txt}</p>
    <div class="lista-simple">
      ${c.ops.map((o, i) => {
        const cuesta = o.costo ? Math.round(E.oro * o.costo) : 0;
        return `<div class="item-lista" style="cursor:pointer" data-crisis="${i}">
          <span class="item-emo">${['①', '②', '③'][i]}</span>
          <span class="item-txt"><span class="item-nom">${o.txt}${cuesta ? ' · ' + monedas(cuesta) + ' 🪙' : ' · gratis'}</span>
          <span class="item-desc">${o.desc}</span></span></div>`;
      }).join('')}
    </div>`);
}
function resolverCrisis(i) {
  const c = CRISIS.find(x => x.id === (E.crisis || {}).id);
  if (!c) { cerrarModal(); return; }
  const o = c.ops[i];
  const cuesta = o.costo ? Math.round(E.oro * o.costo) : 0;
  if (cuesta > E.oro) { aviso('🪙', 'No te alcanza', 'Elige otra salida.', 'malo'); return; }
  E.oro -= cuesta;
  let txt = '';
  switch (o.efecto) {
    case 'cura':
      E.parcelas.forEach(p => { p.plaga = 0; });
      txt = 'El invernadero quedó limpio.'; break;
    case 'salud':
      E.parcelas.forEach(p => { p.plaga = 0; if (p.planta) p.planta.salud = lim(p.planta.salud - 28, 5, 100); });
      txt = 'Las plagas se fueron, pero las plantas quedaron tocadas.'; break;
    case 'plaga':
      E.parcelas.forEach(p => { if (p.planta && suerte(0.45)) p.plaga = 1; });
      txt = 'El hongo se extendió por varias parcelas.'; break;
    case 'riego':
      E.parcelas.forEach(p => { p.agua = 100; });
      txt = 'Todo regado hasta arriba.'; break;
    case 'lento':
      E.lento = { hasta: Date.now() + 300000 };
      txt = 'Racionando: todo crecerá más lento cinco minutos.'; break;
    case 'seco':
      E.parcelas.forEach(p => { p.agua = lim(p.agua - 55, 0, 100); });
      txt = 'Las parcelas se quedaron secas.'; break;
    case 'mariquitas':
      E.parcelas.forEach(p => { p.plaga = 0; });
      E.mariquitas = { hasta: Date.now() + 900000 };
      txt = 'Las mariquitas patrullan: quince minutos sin plagas.'; break;
    case 'nada':
      txt = 'Noche tranquila, ni un pétalo roto.'; break;
    case 'mixto': {
      let perdidas = 0;
      E.parcelas.forEach(p => {
        if (p.planta && ['comun', 'poco'].includes(fenEn(p.planta.cod, p).rareza) && suerte(0.5)) { p.planta = null; perdidas++; }
      });
      txt = perdidas ? `Se perdieron ${perdidas} plantas comunes, pero lo bueno se salvó.` : 'No se perdió nada.';
      break;
    }
    case 'granizo': {
      let perdidas = 0;
      E.parcelas.forEach(p => { if (p.planta && suerte(0.4)) { p.planta = null; perdidas++; } });
      txt = perdidas ? `El granizo se llevó ${perdidas} plantas.` : 'Al final no cayó nada.';
      break;
    }
    case 'suerte':
      if (suerte(0.5)) { const multa = Math.round(E.oro * 0.15); E.oro -= multa; txt = `Te multaron con ${monedas(multa)} 🪙.`; }
      else txt = 'Coló: el inspector no vio nada raro.';
      break;
    case 'reputacion':
      if (!E.cliente) llegaCliente();
      txt = 'El inspector se fue encantado y te mandó un cliente.'; break;
  }
  E.crisis = null;
  sumar('crisis');
  log(`<b>${c.titulo}</b>: ${o.txt}. ${txt}`, 'evento');
  aviso(c.emo, o.txt, txt, 'evento');
  tocar(); cerrarModal(); pintarTodo();
}

/* ---------- Legado y trasplante ---------- */
/** Reparte lo que dan las mejoras permanentes al empezar una partida nueva. */
function aplicarLegado(e) {
  const nv = id => (e.perm || {})[id] || 0;
  if (nv('alcancia')) e.oro += 2000 * Math.pow(6, nv('alcancia'));
  if (nv('sabiduria')) e.ciencia += nv('sabiduria') * 25;
  const extra = nv('tierras') * 2;
  for (let i = 0; i < extra && JUEGO.parcelasIniciales + i < JUEGO.parcelasMax; i++) {
    e.parcelas[JUEGO.parcelasIniciales + i].abierta = true;
  }
  const semillas = nv('semillero') * 3;
  for (let i = 0; i < semillas; i++) darSemilla(genSilvestre(0.34), 'legado', e);
  return e;
}

function comprarPerm(id) {
  const m = permPorId(id);
  if (!m) return;
  const nivel = nivelPerm(id);
  if (nivel >= m.max) { aviso('✿', 'Ya está al máximo', m.nombre + ' no sube más.'); return; }
  const costo = m.costo(nivel + 1);
  if ((E.esporas || 0) < costo) {
    aviso('✿', 'Faltan esporas', `${m.nombre} cuesta ${costo} ✿.`, 'malo'); sonido('no'); return;
  }
  E.esporas -= costo;
  E.perm = E.perm || {};
  E.perm[id] = nivel + 1;
  tocar();
  sonido('investigar');
  log(`Legado mejorado: <b>${m.nombre}</b> nivel ${nivel + 1}.`, 'evento');
  aviso(m.emo, m.nombre + ' ' + (nivel + 1), m.desc(nivel + 1), 'oro');
  confetiChico();
  pintarTodo();
}

function pedirTrasplante() {
  const gana = esporasDeCosecha();
  if (!puedeTrasplantar()) {
    modal(`<h3 class="modal-tit">🌰 Trasplantar</h3>
      <p class="modal-sub">Todavía no. Hace falta <b>nivel ${TRASPLANTE_NIVEL}</b> (vas por el ${E.nivel})
      y al menos 1 espora que ganar (ahora darían ${gana}).</p>
      <div class="modal-pie"><button class="btn btn-suave" data-cerrar>Entendido</button></div>`);
    return;
  }
  modal(`<h3 class="modal-tit">🌰 Trasplantar el invernadero</h3>
    <p class="modal-sub">Empiezas de nuevo, pero con <b>${gana} esporas ✿</b> para comprar mejoras
    que ya no se pierden nunca. Es la forma de seguir creciendo cuando ya no queda nada que comprar.</p>
    <div class="rejilla c2">
      <div class="tarjeta" style="border-left:4px solid var(--exito)">
        <div class="tarjeta-tit">✅ Se conserva</div>
        <div class="tarjeta-sub">Todo el herbario (${Object.keys(E.herbario).length} especies)<br>
        Los cultivares secretos<br>Los logros (${Object.keys(E.logros).length})<br>
        Las esporas y las mejoras de legado<br>El marcador y las estadísticas</div>
      </div>
      <div class="tarjeta" style="border-left:4px solid var(--alerta)">
        <div class="tarjeta-tit">🔄 Vuelve a empezar</div>
        <div class="tarjeta-sub">Monedas, nivel y experiencia<br>Parcelas, investigación y decoración<br>
        El equipo contratado<br>Semillas y flores del almacén</div>
      </div>
    </div>
    <p class="tarjeta-sub" style="margin-top:12px">Sería tu trasplante número <b>${(E.trasplantes || 0) + 1}</b>.
    Antes de reiniciar se guarda un respaldo, por si acaso.</p>
    <div class="modal-pie">
      <button class="btn btn-suave" data-cerrar>Ahora no</button>
      <button class="btn btn-verde" id="btnTrasplantar">🌰 Trasplantar por ${gana} ✿</button>
    </div>`, true);
  $('#btnTrasplantar').onclick = () => hacerTrasplante(gana);
}

function hacerTrasplante(gana) {
  // Red de seguridad: la partida anterior queda en la copia local antes de
  // tocar nada, y el respaldo de la nube se refresca en cuanto pueda.
  try { localStorage.setItem(claveCopiaDe(quien()), JSON.stringify(E)); } catch (e) { /* sin sitio */ }
  const nuevo = estadoNuevo();
  nuevo.herbario   = E.herbario;
  nuevo.logros     = E.logros;
  nuevo.stats      = E.stats;
  nuevo.ajustes    = E.ajustes;
  nuevo.mercado    = E.mercado;
  nuevo.registro   = E.registro;
  nuevo.duenio     = E.duenio;
  nuevo.creado     = E.creado;
  nuevo.esporas    = (E.esporas || 0) + gana;
  nuevo.perm       = E.perm || {};
  nuevo.trasplantes = (E.trasplantes || 0) + 1;
  nuevo.oroBase    = E.stats.oroGanado || 0;
  nuevo.stats.trasplantes = nuevo.trasplantes;
  aplicarLegado(nuevo);
  E = nuevo;
  limpiarCachesDePartida();
  sel = null;
  lab.a = lab.b = null; lab.ultimo = null;
  guardar(true);
  cerrarModal();
  log(`<b>Trasplante ${nuevo.trasplantes}</b>: el invernadero vuelve a empezar con ${gana} ✿ más.`, 'evento');
  aviso('🌰', 'Trasplante hecho', `+${gana} esporas. El herbario y los logros siguen contigo.`, 'logro');
  sonido('secreto');
  confeti();
  pintarParcelas(); pintarTodo();
  Nube.sincronizar(true);
}

function vistaLegado() {
  const gana = esporasDeCosecha();
  const listo = puedeTrasplantar();
  return cabecera('Legado', `${E.esporas || 0} esporas ✿ · ${E.trasplantes || 0} trasplantes`,
    `<button class="btn ${listo ? 'btn-verde' : 'btn-suave'}" data-trasplantar>🌰 Trasplantar</button>`) + `
  <div class="tarjeta">
    <div class="tarjeta-tit">🌰 ¿Qué es esto?</div>
    <div class="tarjeta-sub">Cuando ya te sobra el dinero y no queda nada que comprar, <b>trasplantas</b>:
    el invernadero vuelve a empezar, pero te llevas <b>esporas ✿</b> para comprar mejoras permanentes.
    Cada vuelta es más rápida que la anterior, y el herbario nunca se borra.
    <br><br>Ahora mismo el trasplante daría <b>${gana} ✿</b>${listo ? '' : ` (hace falta nivel ${TRASPLANTE_NIVEL}; vas por el ${E.nivel})`}.</div>
    <div class="barra oro" style="margin-top:10px"><i style="width:${lim(E.nivel / TRASPLANTE_NIVEL * 100, 0, 100)}%"></i></div>
  </div>
  <div class="tarjeta">
    <div class="tarjeta-tit">✿ Mejoras permanentes</div>
    <div class="tarjeta-sub">No se pierden nunca, ni al trasplantar. Tienes <b>${E.esporas || 0} ✿</b>.</div>
    <div class="lista-simple" style="margin-top:11px">
      ${MEJORAS_PERM.map(m => {
        const nv = nivelPerm(m.id);
        const tope = nv >= m.max;
        const costo = tope ? 0 : m.costo(nv + 1);
        const puede = !tope && (E.esporas || 0) >= costo;
        return `<div class="item-lista ${tope ? 'hecho' : ''}">
          <span class="item-emo">${m.emo}</span>
          <span class="item-txt">
            <span class="item-nom">${m.nombre} <span class="pastilla">${nv}/${m.max}</span></span>
            <span class="item-desc">${nv ? 'Ahora: ' + m.desc(nv) + '<br>' : ''}${tope ? '<b>Al máximo</b>' : 'Siguiente: ' + m.desc(nv + 1)}</span>
            <div class="barra" style="margin-top:5px"><i style="width:${nv / m.max * 100}%"></i></div>
          </span>
          <span class="item-der">
            ${tope ? '<span class="pastilla bien">✓</span>'
              : `<button class="btn ${puede ? 'btn-oro' : 'btn-suave'} btn-mini" data-perm="${m.id}">${costo} ✿</button>`}
          </span></div>`;
      }).join('')}
    </div>
  </div>`;
}

/* ---------- Equipo ---------- */
function costoContrato(rol) {
  const n = E.empleados.filter(e => e.rol === rol).length;
  return Math.round(ROLES[rol].sueldo * 12 * Math.pow(2.1, n));
}
function contratar(rol) {
  const c = costoContrato(rol);
  if (E.oro < c) { aviso('🪙', 'Faltan monedas', 'Contratar cuesta ' + monedas(c) + ' 🪙.', 'malo'); sonido('no'); return; }
  if (E.empleados.length >= 15) { aviso('👥', 'Equipo completo', 'No caben más de 15 personas.'); return; }
  E.oro -= c;
  E.empleados.push({
    id: nuevoId('emp'), rol, nombre: elige(NOMBRES_EMP), nivel: 1, exp: 0, animo: 80, desde: Date.now(),
  });
  E.stats.empleados = E.empleados.length;
  sonido('compra');
  log(`Contrataste a <b>${E.empleados[E.empleados.length - 1].nombre}</b> como ${ROLES[rol].nombre.toLowerCase()}.`);
  tocar(); pintarTodo();
}
function animarEmpleado(id) {
  const e = E.empleados.find(x => x.id === id);
  if (!e) return;
  const costo = Math.round(sueldoDe(e) * 1.6);
  if (E.oro < costo) { aviso('🪙', 'Faltan monedas', 'Un día libre cuesta ' + monedas(costo) + ' 🪙.', 'malo'); return; }
  E.oro -= costo;
  e.animo = lim(e.animo + 38, 0, 100);
  sonido('compra');
  log(`<b>${e.nombre}</b> tuvo un día libre. Vuelve con otra cara.`);
  tocar(); pintarVista(); pintarTop();
}
function entrenarEmpleado(id) {
  const e = E.empleados.find(x => x.id === id);
  if (!e) return;
  const costo = Math.round(sueldoDe(e) * 6 * Math.pow(1.4, e.nivel));
  if (E.oro < costo) { aviso('🪙', 'Faltan monedas', 'El curso cuesta ' + monedas(costo) + ' 🪙.', 'malo'); return; }
  E.oro -= costo;
  e.nivel++; e.exp = 0;
  sonido('nivel');
  log(`<b>${e.nombre}</b> subió a nivel ${e.nivel}.`);
  tocar(); pintarVista(); pintarTop();
}
function despedir(id) {
  const e = E.empleados.find(x => x.id === id);
  if (!e) return;
  confirmar('Despedir a ' + e.nombre, '¿Seguro? No se devuelve lo que pagaste por contratarle.', () => {
    E.empleados = E.empleados.filter(x => x.id !== id);
    E.stats.empleados = E.empleados.length;
    log(`<b>${e.nombre}</b> dejó el invernadero.`);
    tocar(); pintarTodo();
  });
}

/* ============================================================
   MOTOR: un tick simula todo lo que pasa en `dt` milisegundos
   ============================================================ */
const auto = { riego: 0, ciencia: 0, colecc: 0, cosecha: 0, venta: 0, despeje: 0 };

function motorTick(dt) {
  if (!E) return;
  const b = bonos();

  // --- Reloj del mundo
  E.mundo.ms += dt;
  let guardia = 0;
  while (E.mundo.ms >= JUEGO.diaMs && guardia++ < 400) {
    E.mundo.ms -= JUEGO.diaMs;
    nuevoDia();
  }

  // --- Parcelas
  const seg = dt / 1000;
  E.parcelas.forEach(p => {
    if (!p.abierta) return;
    // Cada bioma tiene su propio clima: el desierto casi no bebe, el trópico
    // devora agua y se llena de bichos, y el alpino va lento pero muta.
    const bio = BIOMAS[biomaDeParcela(p)];
    // Agua
    let gasto = 0.42 * b.agua * bio.agua * seg;
    if (tieneInv('aut1')) gasto -= (tieneInv('aut2') ? 1.5 : 0.5) * seg;
    p.agua = lim(p.agua - gasto, 0, 100);
    const pl = p.planta;
    if (!pl) return;
    const f = fenEn(pl.cod, p);
    // Plaga
    if (!p.plaga && pl.prog > 0.18) {
      const riesgo = 0.0022 * b.plaga * bio.plaga * seg * (f.estable ? 1 : 2.1);
      if (Math.random() < riesgo) {
        p.plaga = 1;
        log(`Apareció una plaga en <b>${f.nombre}</b>.`, 'malo');
      }
    }
    // Salud
    if (p.agua <= 1 && !tieneInv('bot5')) pl.salud -= 0.55 * seg;
    else if (p.plaga) pl.salud -= 0.42 * seg;
    else pl.salud = lim(pl.salud + 0.18 * seg, 0, 100);
    pl.salud = lim(pl.salud, 0, 100);
    // Crecimiento
    if (pl.prog < 1) {
      let v = b.crec * bio.crec * (f.vigor ? 1.35 : 1);
      if (p.agua <= 1) v *= 0.12;
      else if (p.agua < 22) v *= 0.55;
      if (p.plaga) v *= 0.5;
      v *= 0.55 + pl.salud / 220;
      pl.prog = lim(pl.prog + (dt / duracionCrec(f)) * v, 0, 1);
      if (pl.prog >= 1 && !pl.avisado) {
        pl.avisado = true;
        if (!tieneInv('aut3')) log(`<b>${f.nombre}</b> ya está en flor.`, 'cosecha');
      }
    }
  });

  // --- Personal automático
  const jardineros = E.empleados.filter(e => e.rol === 'jardinero');
  if (jardineros.length) {
    auto.riego += dt * jardineros.reduce((s, e) => s + eficaciaEmp(e), 0);
    while (auto.riego > 9000) {
      auto.riego -= 9000;
      const seca = E.parcelas.filter(p => p.abierta && p.agua < 70).sort((a, x) => a.agua - x.agua)[0];
      if (seca) { seca.agua = 100; sumar('regadas'); } else break;
    }
  }
  const cientificos = E.empleados.filter(e => e.rol === 'cientifico');
  if (cientificos.length) {
    E.ciencia += seg * 0.021 * b.ciencia * cientificos.reduce((s, e) => s + eficaciaEmp(e), 0);
  }
  const colecc = E.empleados.filter(e => e.rol === 'coleccionista');
  if (colecc.length) {
    auto.colecc += dt * colecc.reduce((s, e) => s + eficaciaEmp(e), 0);
    while (auto.colecc > 150000) {
      auto.colecc -= 150000;
      if (hayEspacio()) {
        darSemilla(genSilvestre(0.45 + Math.random() * 0.2), 'coleccionista');
        log('Tu coleccionista trajo una semilla nueva.', 'cosecha');
      }
    }
  }
  const limpiadores = E.empleados.filter(e => e.rol === 'limpiador');
  if (limpiadores.length) {
    auto.cosecha += dt * limpiadores.reduce((s, e) => s + eficaciaEmp(e), 0);
    while (auto.cosecha > 14000) {
      auto.cosecha -= 14000;
      const con = E.parcelas.find(p => p.plaga);
      if (con) { con.plaga = 0; sumar('plagasCuradas'); } else break;
    }
  }
  // Cosecha y venta automáticas
  if (tieneInv('aut3')) {
    E.parcelas.forEach(p => { if (p.planta && p.planta.prog >= 1) cosechar(p.i, true); });
  }
  if (tieneInv('aut5')) {
    auto.venta += dt;
    if (auto.venta > 20000) {
      auto.venta = 0;
      const baratas = E.flores.filter(s => ['comun', 'poco'].includes(fen(s.cod).rareza));
      if (baratas.length) venderTodoDe(['comun', 'poco']);
      // Si el almacén va apretado, se despacha el excedente de semillas
      // corrientes; guardando tres de cada una queda material para cruzar.
      if (ocupado() > capacidad() * 0.75) venderSemillasSobrantes(['comun', 'poco'], 3);
      // Y si aún así sigue lleno, se vende lo más barato para no atascarse.
      if (ocupado() > capacidad() * 0.82) despejarAlmacen();
    }
  }

  // --- Auto-despeje del almacén (gratis y de serie)
  // Antes esto solo llegaba con `aut5`, que cuesta medio millón: hasta
  // entonces el almacén se llenaba y el juego se trababa.
  if (E.ajustes.autoDespejar) {
    auto.despeje += dt;
    if (auto.despeje > 5000) {
      auto.despeje = 0;
      // Umbral y objetivo holgados: si solo baja al 70% vuelve a llenarse en
      // segundos y hay que estar vendiendo a mano todo el rato.
      if (ocupado() > capacidad() * 0.85) despejarAlmacen(0.55);
    }
  }

  // --- Cliente que se va
  if (E.cliente && E.mundo.dia > E.cliente.expira) {
    log('El cliente especial se fue sin comprar.', 'malo');
    E.cliente = null;
  }
}

/** Simula el tiempo que estuviste fuera, en pasos gruesos. */
function simularOffline(ms) {
  const total = Math.min(ms, JUEGO.offlineMax);
  if (total < 1500) return 0;
  const oroAntes = E.oro, cosechasAntes = E.stats.cosechas || 0;
  const paso = 5000;
  let restante = total;
  window.__silencio = true;   // sin avisos ni sonidos mientras se pone al día
  while (restante > 0) {
    motorTick(Math.min(paso, restante));
    restante -= paso;
  }
  window.__silencio = false;
  const ganado = E.oro - oroAntes;
  const cos = (E.stats.cosechas || 0) - cosechasAntes;
  return { ms: total, oro: ganado, cosechas: cos };
}

/* ============================================================
   9. INTERFAZ
   ============================================================ */
let vistaActual = 'invernadero';
let tabInv = 'semillas';
let sel = null;                  // { tipo:'semilla'|'flor'|'parcela'|'especie', … }
let filtroReg = 'todo';
const cacheParcela = [];         // evita repintar SVG que no cambiaron

/* ---------- Avisos, flotantes y partículas ---------- */
function aviso(emo, titulo, sub, clase) {
  if (window.__silencio) return;
  const cont = $('#avisos');
  const el = document.createElement('div');
  el.className = 'aviso ' + (clase || '');
  el.innerHTML = `<span class="aviso-emo">${emo}</span>
    <span class="aviso-txt"><b>${titulo}</b>${sub ? `<small>${sub}</small>` : ''}</span>`;
  cont.appendChild(el);
  if (cont.children.length > 5) cont.firstElementChild.remove();
  setTimeout(() => {
    el.classList.add('saliendo');
    setTimeout(() => el.remove(), 420);
  }, clase === 'logro' ? 6200 : 4600);
  el.onclick = () => el.remove();
}

function flotar(txt, color, idxParcela) {
  if (window.__silencio || !E.ajustes.particulas) return;
  const cont = $('#flotantes');
  const el = document.createElement('div');
  el.className = 'flota';
  el.textContent = txt;
  el.style.color = color || 'var(--tinta)';
  let x = window.innerWidth / 2, y = window.innerHeight / 2;
  if (idxParcela !== undefined && idxParcela !== null) {
    const p = $(`[data-parcela="${idxParcela}"]`);
    if (p) { const r = p.getBoundingClientRect(); x = r.left + r.width / 2; y = r.top + r.height / 3; }
  } else {
    const o = $('#statOro');
    if (o) { const r = o.getBoundingClientRect(); x = r.left + r.width / 2; y = r.bottom + 6; }
  }
  el.style.left = (x - 40) + 'px';
  el.style.top = y + 'px';
  cont.appendChild(el);
  setTimeout(() => el.remove(), 1300);
}

function chispasEn(idxParcela, color) {
  if (window.__silencio || !E.ajustes.particulas) return;
  const cont = $('#flotantes');
  let x = window.innerWidth / 2, y = window.innerHeight / 2;
  if (idxParcela !== undefined && idxParcela !== null) {
    const p = $(`[data-parcela="${idxParcela}"]`);
    if (p) { const r = p.getBoundingClientRect(); x = r.left + r.width / 2; y = r.top + r.height / 2; }
  }
  for (let i = 0; i < 14; i++) {
    const s = document.createElement('i');
    s.className = 'chispa';
    const t = 4 + Math.random() * 6;
    s.style.cssText = `left:${x}px;top:${y}px;width:${t}px;height:${t}px;background:${color || '#e8c97b'};` +
      `--dx:${(Math.random() - .5) * 150}px;--dy:${-30 - Math.random() * 110}px;animation-delay:${Math.random() * .15}s`;
    cont.appendChild(s);
    setTimeout(() => s.remove(), 1100);
  }
}
function gotasEn(idx) {
  if (window.__silencio || !E.ajustes.particulas) return;
  const p = $(`[data-parcela="${idx}"]`);
  if (!p) return;
  p.classList.add('humeda');
  chispasEn(idx, '#9ecbe8');
  setTimeout(() => p.classList.remove('humeda'), 2400);
}
function confeti(n) {
  if (window.__silencio || !E.ajustes.particulas) return;
  const cont = $('#flotantes');
  const colores = ['#f2bfc6', '#c9bde8', '#a8c6e8', '#efd79b', '#a8b99a', '#f5c9a8'];
  for (let i = 0; i < (n || 46); i++) {
    const s = document.createElement('i');
    s.className = 'chispa';
    const t = 6 + Math.random() * 8;
    s.style.cssText = `left:${window.innerWidth / 2}px;top:${window.innerHeight * .38}px;` +
      `width:${t}px;height:${t}px;border-radius:${Math.random() > .5 ? '50%' : '3px'};background:${elige(colores)};` +
      `--dx:${(Math.random() - .5) * 620}px;--dy:${(Math.random() - .35) * 520}px;` +
      `animation-duration:${.9 + Math.random() * .7}s;animation-delay:${Math.random() * .2}s`;
    cont.appendChild(s);
    setTimeout(() => s.remove(), 1900);
  }
}
const confetiChico = () => confeti(18);

/* ---------- Modal ---------- */
function modal(html, ancho) {
  const f = $('#modalFondo'), m = $('#modal');
  m.className = 'modal vidrio' + (ancho ? ' ancho' : '');
  m.innerHTML = `<button class="modal-cerrar" data-cerrar>✕</button>` + html;
  f.classList.add('abierto');
  m.scrollTop = 0;
  return m;
}
function cerrarModal() { $('#modalFondo').classList.remove('abierto'); }
function confirmar(titulo, texto, alSi) {
  const m = modal(`<h3 class="modal-tit">${titulo}</h3><p class="modal-sub">${texto}</p>
    <div class="modal-pie"><button class="btn btn-suave" data-cerrar>Cancelar</button>
    <button class="btn btn-rojo" id="modalSi">Sí, hacerlo</button></div>`);
  $('#modalSi', m).onclick = () => { cerrarModal(); alSi(); };
}

/* ---------- Tooltip ---------- */
const tip = $('#tooltip');
function mostrarTip(el) {
  const txt = el.dataset.tip;
  if (!txt) return;
  tip.innerHTML = txt;
  tip.classList.add('ver');
  const r = el.getBoundingClientRect();
  const t = tip.getBoundingClientRect();
  let x = r.left + r.width / 2 - t.width / 2;
  let y = r.top - t.height - 9;
  if (y < 8) y = r.bottom + 9;
  tip.style.left = lim(x, 8, window.innerWidth - t.width - 8) + 'px';
  tip.style.top = y + 'px';
}
const ocultarTip = () => tip.classList.remove('ver');

/* ---------- Barra superior ---------- */
function pintarTop() {
  if (!E) return;
  ponerNum('#valOro', Math.floor(E.oro));
  ponerNum('#valGema', Math.floor(E.polen));
  ponerNum('#valCiencia', Math.floor(E.ciencia));
  const chipEsp = $('#statEspora');
  if (chipEsp) {
    chipEsp.style.display = (E.esporas || E.trasplantes) ? '' : 'none';
    ponerNum('#valEspora', E.esporas || 0);
  }
  $('#valNivel').textContent = E.nivel;
  const nec = xpNecesaria(E.nivel);
  $('#barraXP').style.width = lim(E.xp / nec * 100, 0, 100) + '%';
  $('#txtXP').textContent = Math.floor(E.xp) + '/' + nec;
  const est = ESTACIONES[E.mundo.estacion];
  $('#chipEstacion').innerHTML = `<span>${est.emo}</span><b>${est.nombre}</b>`;
  $('#chipDia').innerHTML = `<span>📅</span><b>Día ${E.mundo.dia}</b>`;
  const cli = CLIMAS[E.mundo.clima];
  $('#chipClima').innerHTML = `<span>${cli.emo}</span><b>${cli.nombre}</b>`;
  $('#chipHora').innerHTML = `<span>${esNoche() ? '🌙' : '🕐'}</span><b>${horaTexto()}</b>`;
  const b = bonos();
  $('#datoTemp').textContent = cli.nombre;
  $('#datoRiego').textContent = tieneInv('aut2') ? 'Aspersores' : tieneInv('aut1') ? 'Goteo' :
    E.empleados.some(e => e.rol === 'jardinero') ? 'Jardinero' : 'Manual';
  $('#datoSuelo').textContent = tieneInv('bot4') ? 'Hidroponía' : tieneInv('bot2') ? 'Aireado' : tieneInv('bot1') ? 'Compost' : 'Tierra simple';
  $('#datoLuz').textContent = tieneDeco('lampara') ? 'Artificial' : tieneInv('inf5') ? 'Domo' : 'Natural';
  $('#datoVel').textContent = '×' + b.crec.toFixed(2);
  const ocu = ocupado(), cap = capacidad();
  $('#capacidadTxt').textContent = `Almacén ${ocu}/${cap}`;
  const barra = $('#capacidadBarra');
  barra.style.width = lim(ocu / cap * 100, 0, 100) + '%';
  barra.classList.toggle('lleno', ocu >= cap);
  // El botón de despejar se enciende cuando el almacén empieza a apretar.
  const bd = $('#btnDespejar');
  if (bd) {
    const apreta = ocu >= cap * 0.85;
    bd.classList.toggle('btn-oro', apreta);
    bd.classList.toggle('btn-suave', !apreta);
    bd.classList.toggle('urgente', apreta);
    bd.innerHTML = apreta ? `📦 Despejar · ${ocu}/${cap}` : '📦 Despejar';
  }
  $('#subInvernadero').textContent = subtituloInvernadero();
  const bc = $('#btnCrisis');
  if (bc) bc.style.display = E.crisis ? '' : 'none';
  $('#btnAmpliar').innerHTML = parcelasAbiertas() >= JUEGO.parcelasMax
    ? '🏡 Completo' : `＋ Ampliar · ${monedas(costoParcela())} 🪙`;
  $('#btnAmpliar').disabled = parcelasAbiertas() >= JUEGO.parcelasMax;
  marcarAvisosNav();
}
function ponerNum(sel2, v) {
  const el = $(sel2);
  const txt = num(v);
  if (el.textContent !== txt) {
    el.textContent = txt;
    const p = el.closest('.stat');
    if (p) { p.classList.remove('pulso'); void p.offsetWidth; p.classList.add('pulso'); }
  }
}
function subtituloInvernadero() {
  const maduras = E.parcelas.filter(p => p.planta && p.planta.prog >= 1).length;
  const secas = E.parcelas.filter(p => p.abierta && p.agua < 22).length;
  const plagas = E.parcelas.filter(p => p.plaga).length;
  const partes = [];
  if (maduras) partes.push(`${maduras} lista${maduras > 1 ? 's' : ''} para cosechar`);
  if (secas) partes.push(`${secas} sin agua`);
  if (plagas) partes.push(`${plagas} con plaga`);
  if (!partes.length) {
    const libres = E.parcelas.filter(p => p.abierta && !p.planta).length;
    return libres ? `${libres} parcela${libres > 1 ? 's' : ''} libre${libres > 1 ? 's' : ''}` : 'Todo en orden, todo creciendo';
  }
  return partes.join(' · ');
}
function marcarAvisosNav() {
  const hayMision = [...E.misiones.diarias, ...E.misiones.semanales, ...misionesPermanentesActivas()]
    .some(m => !m.cobrada && !E.misiones.perm[m.id] && progresoMision(m) >= 1);
  const hayInv = INVESTIGACION.some(n => !tieneInv(n.id) && n.req.every(r => tieneInv(r)) && E.oro >= n.oro && E.ciencia >= n.ci);
  $$('#navVistas .nav-btn').forEach(b => {
    const v = b.dataset.vista;
    const debe = (v === 'misiones' && hayMision) || (v === 'investigacion' && hayInv) ||
      (v === 'mercado' && !!E.cliente) || (v === 'invernadero' && !!E.crisis);
    let p = $('.punto', b);
    if (debe && !p) { p = document.createElement('i'); p.className = 'punto'; b.appendChild(p); }
    else if (!debe && p) p.remove();
  });
}

/* ---------- Inventario (panel izquierdo) ---------- */
function pintarInventario() {
  const c = $('#cuerpoInv');
  const busca = ($('#buscaInv').value || '').toLowerCase().trim();
  const orden = $('#ordenInv').value;
  let html = '';
  if (tabInv === 'semillas') html = listaSemillas(busca, orden);
  else if (tabInv === 'plantas') html = listaFlores(busca, orden);
  else html = listaColeccion(busca, orden);
  c.innerHTML = html;
}
/* Con el almacén ampliado puede haber cientos de montones distintos y cada
   ficha lleva su SVG: se pintan los primeros y se avisa del resto. */
const INV_MAX_FICHAS = 120;
function recorte(arr, html) {
  if (arr.length <= INV_MAX_FICHAS) return html;
  return html + `<div class="vacio" style="padding:14px">Y ${arr.length - INV_MAX_FICHAS} montones más.<br>
    <small>Usa el buscador o cambia el orden para encontrarlos.</small></div>`;
}
function ordenarStacks(arr, orden) {
  const rango = f => RAREZAS.findIndex(r => r.id === f.rareza);
  return arr.sort((a, b) => {
    const fa = fen(a.cod), fb = fen(b.cod);
    if (orden === 'nombre') return fa.nombre.localeCompare(fb.nombre);
    if (orden === 'precio') return precioBase(fb) - precioBase(fa);
    if (orden === 'nuevo') return (b.fecha || 0) - (a.fecha || 0);
    return rango(fb) - rango(fa) || precioBase(fb) - precioBase(fa);
  });
}
function listaSemillas(busca, orden) {
  let arr = E.semillas.slice();
  if (busca) arr = arr.filter(s => fen(s.cod).nombre.toLowerCase().includes(busca));
  if (!arr.length) return vacio('🌱', busca ? 'Nada con ese nombre.' : 'No tienes semillas.<br>Compra en el <b>Mercado</b> o cosecha una flor.');
  const orden2 = ordenarStacks(arr, orden);
  return recorte(orden2, orden2.slice(0, INV_MAX_FICHAS).map(s => {
    const f = fen(s.cod);
    // Sin microscopio, una semilla de una especie que aún no cultivaste es un misterio.
    const nueva = !E.herbario[f.especie] && !tieneInv('gen1');
    return `<div class="ficha rar-${f.rareza} ${sel && sel.tipo === 'semilla' && sel.cod === s.cod ? 'sel' : ''}"
      data-sem="${s.cod}">
      <span class="ficha-mini">${svgSemilla(f)}</span>
      <span class="ficha-txt">
        <span class="ficha-nom">${nueva ? '❓ Semilla misteriosa' : f.nombre}</span>
        <span class="ficha-sub">${nueva ? 'Aún no sabes qué dará' : rarezaPorId(f.rareza).nombre + ' · ' + COLORES[f.color].nombre}</span>
      </span>
      <span class="ficha-cant">×${s.n}</span>
    </div>`;
  }).join(''));
}
function listaFlores(busca, orden) {
  let arr = E.flores.slice();
  if (busca) arr = arr.filter(s => fen(s.cod).nombre.toLowerCase().includes(busca));
  if (!arr.length) return vacio('🌸', busca ? 'Nada con ese nombre.' : 'No hay flores cortadas.<br>Cosecha una planta madura.');
  const orden2 = ordenarStacks(arr, orden);
  return recorte(orden2, orden2.slice(0, INV_MAX_FICHAS).map(s => {
    const f = fen(s.cod);
    return `<div class="ficha rar-${f.rareza} ${sel && sel.tipo === 'flor' && sel.cod === s.cod ? 'sel' : ''}"
      data-flor="${s.cod}">
      <span class="ficha-mini">${svgMini(f)}</span>
      <span class="ficha-txt">
        <span class="ficha-nom">${f.emo} ${f.nombre}</span>
        <span class="ficha-sub">${rarezaPorId(f.rareza).nombre} · ${monedas(precioVenta(f, 1))} 🪙</span>
      </span>
      <span class="ficha-cant">×${s.n}</span>
    </div>`;
  }).join(''));
}
function listaColeccion(busca, orden) {
  let ids = Object.keys(E.herbario);
  if (busca) ids = ids.filter(id => fenotipoDeEspecie(id).nombre.toLowerCase().includes(busca));
  if (!ids.length) return vacio('📖', 'Todavía no descubres ninguna especie.<br>Cosecha tu primera flor.');
  const arr = ids.map(id => ({ id, f: fenotipoDeEspecie(id), h: E.herbario[id] }));
  arr.sort((a, b) => {
    if (orden === 'nombre') return a.f.nombre.localeCompare(b.f.nombre);
    if (orden === 'nuevo') return b.h.fecha - a.h.fecha;
    if (orden === 'precio') return precioBase(b.f) - precioBase(a.f);
    return RAREZAS.findIndex(r => r.id === b.f.rareza) - RAREZAS.findIndex(r => r.id === a.f.rareza);
  });
  return recorte(arr, arr.slice(0, INV_MAX_FICHAS).map(({ id, f, h }) => `<div class="ficha rar-${f.rareza}" data-esp="${id}">
      <span class="ficha-mini">${svgMini(f)}</span>
      <span class="ficha-txt">
        <span class="ficha-nom">${f.emo} ${f.nombre}</span>
        <span class="ficha-sub">${rarezaPorId(f.rareza).nombre} · cultivada ${h.veces}×</span>
      </span>
    </div>`).join(''));
}
const vacio = (emo, txt) => `<div class="vacio"><span class="vacio-emo">${emo}</span>${txt}</div>`;

/* ---------- Parcelas ---------- */
function pintarParcelas() {
  const cont = $('#parcelas');
  const abiertas = E.parcelas.filter(p => p.abierta).length;
  const mostrar = Math.min(JUEGO.parcelasMax, abiertas + 1);
  let html = '';
  for (let i = 0; i < mostrar; i++) {
    const p = E.parcelas[i];
    html += p.abierta ? htmlParcela(p) :
      `<div class="parcela bloqueada" data-abrir="${i}">
        <span class="candado">🔒<small style="display:block;font-size:.6rem;margin-top:4px">${monedas(costoParcela())} 🪙</small></span>
      </div>`;
    cacheParcela[i] = null;
  }
  cont.innerHTML = html;
  refrescarParcelas(true);
  pintarDeco();
}
function htmlParcela(p) {
  const bio = BIOMAS[biomaDeParcela(p)];
  return `<div class="parcela bio-${bio.id}" data-parcela="${p.i}">
    ${bio.id !== 'patio' ? `<span class="marca-bioma" title="${bio.nombre}">${bio.emo}</span>` : ''}
    <div class="tierra-humeda"></div>
    <div class="capa-planta"></div>
    <div class="etiqueta"></div>
    <span class="gota-agua"></span>
    <span class="insignia-plaga" style="display:none">🐛</span>
    <div class="barra-crec"><i></i></div>
  </div>`;
}
/** Actualiza sin reconstruir: solo cambia lo que se movió. */
function refrescarParcelas(forzar) {
  E.parcelas.forEach(p => {
    if (!p.abierta) return;
    const el = $(`[data-parcela="${p.i}"]`);
    if (!el) return;
    const pl = p.planta;
    const cod = pl ? pl.cod : null;
    const etapa = pl ? etapaDe(pl.prog) : -1;
    const c = cacheParcela[p.i] || {};
    const cambio = forzar || c.cod !== cod || c.etapa !== etapa;
    if (cambio) {
      const capa = $('.capa-planta', el);
      const eti = $('.etiqueta', el);
      if (pl) {
        const f = fenEn(cod, p);
        capa.innerHTML = (f.brillo && etapa === 4 ? '<div class="brillo-planta"></div>' : '') +
          svgPlanta(f, pl.prog, { id: 'p' + p.i });
        eti.innerHTML = `<span class="eti-rareza" style="background:${rarezaPorId(f.rareza).color}">${rarezaPorId(f.rareza).nombre}</span>`;
      } else { capa.innerHTML = ''; eti.innerHTML = ''; }
      cacheParcela[p.i] = { cod, etapa };
    }
    // Progreso, agua y estados
    const barra = $('.barra-crec i', el);
    if (pl) {
      barra.style.width = (pl.prog * 100).toFixed(1) + '%';
      barra.classList.toggle('madura', pl.prog >= 1);
      $('.barra-crec', el).style.display = '';
    } else {
      $('.barra-crec', el).style.display = 'none';
    }
    const gota = $('.gota-agua', el);
    gota.textContent = p.agua < 22 ? '🥵' : p.agua < 55 ? '💧' : '';
    gota.style.opacity = p.agua < 55 ? '1' : '0';
    $('.insignia-plaga', el).style.display = p.plaga ? '' : 'none';
    el.classList.toggle('seca', p.agua < 22);
    el.classList.toggle('lista', !!pl && pl.prog >= 1);
    el.classList.toggle('sel', !!sel && sel.tipo === 'parcela' && sel.idx === p.i);
  });
}
function pintarDeco() {
  const c = $('#decoEstante');
  if (!E.deco.length) { c.innerHTML = ''; return; }
  c.innerHTML = E.deco.map((id, i) => {
    const d = decoPorId(id);
    if (!d) return '';
    return `<span class="deco-pieza" style="animation-delay:${i * .35}s" data-tip="<b>${d.nombre}</b><br>${d.desc}">${d.emo}</span>`;
  }).join('');
}

/* ---------- Panel derecho: detalle ---------- */
function pintarDetalle() {
  const c = $('#cuerpoDetalle');
  if (!sel) { c.innerHTML = detalleResumen(); return; }
  if (sel.tipo === 'parcela') c.innerHTML = detalleParcela(sel.idx);
  else if (sel.tipo === 'semilla') c.innerHTML = detalleSemilla(sel.cod);
  else if (sel.tipo === 'flor') c.innerHTML = detalleFlor(sel.cod);
  else if (sel.tipo === 'especie') c.innerHTML = detalleEspecie(sel.id);
  else c.innerHTML = detalleResumen();
}
function detalleResumen() {
  const b = bonos();
  const ev = eventoActivo();
  const total = Object.keys(E.herbario).length;
  return `<div class="det-cabecera">
      <div class="det-lienzo">${svgPlanta(fenotipoDeEspecie('F1-210-abanicada'), 1, { sombra: false })}</div>
      <div class="det-nom">Tu invernadero</div>
      <div class="det-cien">Día ${E.mundo.dia} · ${ESTACIONES[E.mundo.estacion].nombre}</div>
    </div>
    ${ev ? `<div class="tarjeta" style="margin-bottom:10px;border-left:4px solid var(--lavanda)">
      <div class="tarjeta-tit">${ev.emo} ${ev.nombre}</div>
      <div class="tarjeta-sub">${ev.txt}<br><small>Quedan ${E.evento.quedan} día(s).</small></div></div>` : ''}
    ${E.cliente ? tarjetaCliente() : ''}
    <div class="det-seccion"><h4>Resumen</h4>
      <div class="det-fila"><span>Herbario</span><b>${total}/${ESPECIES_TOTAL} (${(total / ESPECIES_TOTAL * 100).toFixed(1)}%)</b></div>
      <div class="det-fila"><span>Parcelas</span><b>${parcelasAbiertas()}/${JUEGO.parcelasMax}</b></div>
      <div class="det-fila"><span>Equipo</span><b>${E.empleados.length} persona(s)</b></div>
      <div class="det-fila"><span>Cosechas</span><b>${num(E.stats.cosechas || 0)}</b></div>
      <div class="det-fila"><span>Cruces</span><b>${num(E.stats.cruces || 0)}</b></div>
    </div>
    <div class="det-seccion"><h4>Multiplicadores</h4>
      <div class="det-fila"><span>Crecimiento</span><b>×${b.crec.toFixed(2)}</b></div>
      <div class="det-fila"><span>Precio</span><b>×${b.precio.toFixed(2)}</b></div>
      <div class="det-fila"><span>Mutación</span><b>×${b.mut.toFixed(2)}</b></div>
      <div class="det-fila"><span>Gasto de agua</span><b>×${b.agua.toFixed(2)}</b></div>
      <div class="det-fila"><span>Riesgo de plaga</span><b>×${b.plaga.toFixed(2)}</b></div>
    </div>
    <div class="det-seccion"><h4>Atajos</h4>
      <div class="det-botones dos">
        <button class="btn btn-suave btn-mini" data-ir="laboratorio">🧬 Laboratorio</button>
        <button class="btn btn-suave btn-mini" data-ir="mercado">🛒 Mercado</button>
      </div>
    </div>
    <p class="tarjeta-sub" style="margin-top:14px;text-align:center">Toca una parcela, una semilla o una flor para ver su ficha.</p>`;
}
function tarjetaCliente() {
  const c = CLIENTES.find(x => x.id === E.cliente.id);
  return `<div class="cliente" style="margin-bottom:10px">
    <span class="cliente-cara">${c.emo}</span>
    <div><b style="font-size:.86rem">${c.nombre}</b>
    <div class="tarjeta-sub">Busca ${E.cliente.txt}. Paga <b>×${E.cliente.mult.toFixed(1)}</b>.</div></div></div>`;
}

function detalleParcela(idx) {
  const p = E.parcelas[idx];
  if (!p) return detalleResumen();
  if (!p.planta) {
    const semillas = E.semillas.length;
    return `<div class="det-cabecera">
        <div class="det-lienzo" style="font-size:3rem;display:grid;place-items:center">🕳️</div>
        <div class="det-nom">Parcela ${idx + 1}</div>
        <div class="det-cien">Vacía y esperando</div>
      </div>
      <div class="det-seccion"><h4>Estado</h4>
        <div class="det-fila"><span>Agua</span><b>${Math.round(p.agua)}%</b></div>
        <div class="barra agua"><i style="width:${p.agua}%"></i></div>
      </div>
      <div class="det-botones">
        <button class="btn btn-verde" data-sembrar="${idx}">🌱 Plantar aquí</button>
        <button class="btn btn-suave" data-regar="${idx}">💧 Regar</button>
        <button class="btn btn-suave btn-mini" data-bioma="${idx}">${BIOMAS[biomaDeParcela(p)].emo} Clima: ${BIOMAS[biomaDeParcela(p)].nombre}</button>
      </div>
      <p class="tarjeta-sub" style="margin-top:12px">${semillas ? 'Elige una semilla del almacén.' : 'No tienes semillas: compra en el mercado.'}</p>`;
  }
  const pl = p.planta;
  const f = fenEn(pl.cod, p);
  const et = ETAPAS[etapaDe(pl.prog)];
  const dur = duracionCrec(f);
  const b = bonos();
  const vel = b.crec * (f.vigor ? 1.35 : 1) * (p.agua <= 1 ? 0.12 : p.agua < 22 ? 0.55 : 1) * (p.plaga ? 0.5 : 1) * (0.55 + pl.salud / 220);
  const falta = pl.prog >= 1 ? 0 : (1 - pl.prog) * dur / Math.max(0.01, vel);
  return `<div class="det-cabecera">
      <div class="det-lienzo">${svgPlanta(f, pl.prog, { sombra: false, id: 'det' })}</div>
      <div class="det-nom">${f.emo} ${f.nombre}</div>
      <div class="det-cien">${f.cientifico}</div>
      <div style="margin-top:7px"><span class="pastilla" style="background:${rarezaPorId(f.rareza).color}33;color:${rarezaPorId(f.rareza).color}">${rarezaPorId(f.rareza).nombre}</span></div>
    </div>
    <div class="det-seccion"><h4>Crecimiento</h4>
      <div class="det-fila"><span>${et.nombre}</span><b>${(pl.prog * 100).toFixed(1)}%</b></div>
      <div class="barra ${pl.prog >= 1 ? 'oro' : ''} ${pl.prog < 1 ? 'animada' : ''}"><i style="width:${pl.prog * 100}%"></i></div>
      <div class="det-fila"><span>Falta</span><b>${pl.prog >= 1 ? '¡lista!' : tiempoCorto(falta)}</b></div>
      <div class="det-fila"><span>Agua</span><b>${Math.round(p.agua)}%</b></div>
      <div class="barra agua"><i style="width:${p.agua}%"></i></div>
      <div class="det-fila"><span>Salud</span><b>${Math.round(pl.salud)}%</b></div>
      <div class="barra"><i style="width:${pl.salud}%"></i></div>
      ${p.plaga ? '<div class="det-fila"><span>⚠️ Plaga</span><b style="color:#b06a6a">activa</b></div>' : ''}
    </div>
    ${bloqueFenotipo(f)}
    ${bloqueADN(pl.cod)}
    ${p.fijada ? `<p class="tarjeta-sub" style="margin-top:8px;text-align:center">
      🔒 Esta parcela repite <b>${fen(p.fijada).nombre}</b> al resembrar.</p>` : ''}
    <div class="det-botones dos">
      <button class="btn btn-suave" data-regar="${idx}" ${p.agua > 98 ? 'disabled' : ''}>💧 Regar</button>
      <button class="btn ${pl.prog >= 1 ? 'btn-oro' : 'btn-suave'}" data-cosechar="${idx}" ${pl.prog < 1 ? 'disabled' : ''}>🧺 Cosechar</button>
      ${p.plaga ? `<button class="btn btn-rojo" style="grid-column:1/-1" data-curar="${idx}">🧹 Quitar plaga</button>` : ''}
      <button class="btn btn-lila" style="grid-column:1/-1" data-cambiar="${idx}">🔄 Sembrar otra variedad aquí</button>
      <button class="btn btn-suave btn-mini" style="grid-column:1/-1" data-bioma="${idx}">${BIOMAS[biomaDeParcela(p)].emo} Clima: ${BIOMAS[biomaDeParcela(p)].nombre}</button>
      <button class="btn btn-suave btn-mini" style="grid-column:1/-1" data-arrancar="${idx}">🗑️ Arrancar</button>
    </div>`;
}
function detalleSemilla(cod) {
  const st = E.semillas.find(s => s.cod === cod);
  if (!st) { sel = null; return detalleResumen(); }
  const f = fen(cod);
  const conocida = !!E.herbario[f.especie] || tieneInv('gen1');
  return `<div class="det-cabecera">
      <div class="det-lienzo">${svgSemilla(f)}</div>
      <div class="det-nom">${conocida ? f.nombre : '❓ Semilla misteriosa'}</div>
      <div class="det-cien">${conocida ? f.cientifico : 'Plántala para saber qué es'}</div>
      <div style="margin-top:7px">
        <span class="pastilla">×${st.n} en el almacén</span>
        ${conocida ? `<span class="pastilla" style="background:${rarezaPorId(f.rareza).color}33;color:${rarezaPorId(f.rareza).color}">${rarezaPorId(f.rareza).nombre}</span>` : ''}
      </div>
    </div>
    ${conocida ? bloqueFenotipo(f) : ''}
    ${bloqueADN(cod)}
    <div class="det-seccion"><h4>Mercado</h4>
      <div class="det-fila"><span>Precio por semilla</span><b>${monedas(precioSemillaVenta(f))} 🪙</b></div>
      <div class="det-fila"><span>Todo el montón</span><b>${monedas(precioSemillaVenta(f) * st.n)} 🪙</b></div>
    </div>
    <div class="det-botones">
      <button class="btn btn-verde" data-plantar-sel="${cod}">🌱 Plantar en la primera libre</button>
      <div class="det-botones dos" style="margin:0">
        <button class="btn btn-oro btn-mini" data-vender-sem="${cod}">🪙 Vender 1</button>
        <button class="btn btn-oro btn-mini" data-vender-sem-todo="${cod}">🪙 Vender ${st.n}</button>
      </div>
      <button class="btn btn-suave btn-mini" data-tirar="${cod}">🗑️ Tirar una</button>
    </div>
    <p class="tarjeta-sub" style="margin-top:10px;text-align:center">O toca una parcela vacía para plantarla ahí.</p>`;
}
function detalleFlor(cod) {
  const st = E.flores.find(s => s.cod === cod);
  if (!st) { sel = null; return detalleResumen(); }
  const f = fen(cod);
  const p = precioVenta(f, 1);
  const gusta = E.cliente && clienteAcepta(f);
  return `<div class="det-cabecera">
      <div class="det-lienzo">${svgPlanta(f, 1, { sombra: false, id: 'flor' })}</div>
      <div class="det-nom">${f.emo} ${f.nombre}</div>
      <div class="det-cien">${f.cientifico}</div>
      <div style="margin-top:7px">
        <span class="pastilla">×${st.n}</span>
        <span class="pastilla" style="background:${rarezaPorId(f.rareza).color}33;color:${rarezaPorId(f.rareza).color}">${rarezaPorId(f.rareza).nombre}</span>
        ${gusta ? '<span class="pastilla oro">⭐ Cliente interesado</span>' : ''}
      </div>
    </div>
    <div class="det-seccion"><h4>Mercado</h4>
      <div class="det-fila"><span>Precio unitario</span><b>${monedas(p)} 🪙</b></div>
      <div class="det-fila"><span>Demanda del color</span><b>×${demandaDe(f.color).toFixed(2)}</b></div>
      <div class="det-fila"><span>Todo el montón</span><b>${monedas(p * st.n)} 🪙</b></div>
    </div>
    ${bloqueFenotipo(f)}
    ${bloqueADN(cod)}
    <div class="det-botones dos">
      <button class="btn btn-oro" data-vender="${cod}">🪙 Vender 1</button>
      <button class="btn btn-oro" data-vender-todo="${cod}">🪙 Vender ${st.n}</button>
      <button class="btn btn-lila" style="grid-column:1/-1" data-lab="${cod}">🧬 Llevar al laboratorio</button>
      <button class="btn btn-suave btn-mini" data-injertar="${cod}">🧬 Injertar · ${COSTO_INJERTO} ✿</button>
      <button class="btn btn-suave btn-mini" data-concurso="${cod}">🏆 Al concurso</button>
    </div>`;
}
function detalleEspecie(id) {
  const f = fenotipoDeEspecie(id);
  const h = E.herbario[id];
  const sec = id.startsWith('sec-') ? SECRETOS.find(s => 'sec-' + s.id === id) : null;
  return `<div class="det-cabecera">
      <div class="det-lienzo">${h ? svgPlanta(f, 1, { sombra: false, id: 'esp' }) : `<span style="font-size:3rem">${sec ? '🗝️' : '❔'}</span>`}</div>
      <div class="det-nom">${h ? f.nombre : (sec ? '???' : f.nombre)}</div>
      <div class="det-cien">${h ? f.cientifico : 'Sin descubrir'}</div>
      <div style="margin-top:7px"><span class="pastilla" style="background:${rarezaPorId(f.rareza).color}33;color:${rarezaPorId(f.rareza).color}">${rarezaPorId(f.rareza).nombre}</span></div>
    </div>
    ${sec ? `<div class="tarjeta" style="margin-bottom:10px"><div class="tarjeta-tit">🗝️ Cultivar secreto</div>
      <div class="tarjeta-sub">${h || tieneInv('rar4') ? sec.pista : 'Investiga el <b>Herbario ancestral</b> para ver la pista.'}</div></div>` : ''}
    ${h ? `<div class="det-seccion"><h4>Ficha</h4>
      <div class="det-fila"><span>Descubierta</span><b>${new Date(h.fecha).toLocaleDateString('es-CL')}</b></div>
      <div class="det-fila"><span>Cultivada</span><b>${h.veces} vez(ces)</b></div>
      <div class="det-fila"><span>Vendida</span><b>${h.vendidas || 0} vez(ces)</b></div>
      <div class="det-fila"><span>Mejor precio</span><b>${monedas(h.mejor || 0)} 🪙</b></div>
      <div class="det-fila"><span>Precio base</span><b>${monedas(precioBase(f))} 🪙</b></div>
    </div>` : `<p class="tarjeta-sub" style="text-align:center;padding:14px 0">Todavía no la tienes. Sigue cruzando.</p>`}
    ${h ? bloqueFenotipo(f) : ''}`;
}

function bloqueFenotipo(f) {
  return `<div class="det-seccion"><h4>Fenotipo</h4>
    <div class="det-fila"><span>Color</span><b><i style="display:inline-block;width:12px;height:12px;border-radius:4px;background:${f.hex};vertical-align:-1px;margin-right:5px"></i>${COLORES[f.color].nombre}</b></div>
    <div class="det-fila"><span>Saturación</span><b>${SATURACIONES[f.sat]}</b></div>
    <div class="det-fila"><span>Corola</span><b>${FORMAS[f.forma].nombre}</b></div>
    <div class="det-fila"><span>Hoja</span><b>${HOJAS[f.hoja].nombre}</b></div>
    <div class="det-fila"><span>Talla</span><b>${TALLAS[f.talla]}</b></div>
    <div class="det-fila"><span>Vigor</span><b>${f.vigor ? 'rápido' : 'lento'}</b></div>
    <div class="det-fila"><span>Néctar</span><b>${f.nectar ? 'sí' : 'no'}</b></div>
    <div class="det-fila"><span>Luminiscencia</span><b>${f.brillo ? '✨ sí' : 'no'}</b></div>
    <div class="det-fila"><span>Genoma</span><b>${f.estable ? 'estable' : '☢️ inestable'}</b></div>
    <div class="det-fila"><span>Puntos de rareza</span><b>${f.puntos}</b></div>
  </div>`;
}
function bloqueADN(cod) {
  if (!tieneInv('gen1')) {
    return `<div class="det-seccion"><h4>ADN</h4>
      <div class="adn-cerrado">🔬 Investiga el <b>Microscopio</b> para leer el genotipo.</div></div>`;
  }
  const g = genDec(codDe(cod));
  const f = fen(cod);
  const marcadores = tieneInv('gen3');
  const filas = LOCI.map(l => {
    const par = g[l.id];
    const alelos = par.map(a => {
      const esDom = a === l.dom || (l.tipo === 'serie' && ORDEN_F.indexOf(a) < ORDEN_F.indexOf(par[1]));
      const escondido = !marcadores && l.id === 'X' && a === 'x' && par.includes('X');
      return `<span class="alelo ${escondido ? 'oculto' : esDom ? 'dom' : 'rec'}">${escondido ? '?' : a}</span>`;
    }).join('');
    return `<div class="gen-fila" data-tip="<b>${l.nombre}</b><br>${l.desc}">
      <span class="gen-nom">${l.nombre}</span>
      <span class="gen-alelos">${alelos}</span>
      <span class="gen-fen">${textoLocus(l, f)}</span>
    </div>`;
  }).join('');
  return `<div class="det-seccion"><h4>ADN ${marcadores ? '· con marcadores' : ''}</h4><div class="adn">${filas}</div></div>`;
}
function textoLocus(l, f) {
  switch (l.id) {
    case 'A': return f.dosisA + '× azul';
    case 'B': return f.dosisB + '× rojo';
    case 'C': return f.dosisC + '× amarillo';
    case 'P': return f.albina ? 'albina' : 'con color';
    case 'S': return SATURACIONES[f.sat];
    case 'F': return FORMAS[f.forma].nombre.toLowerCase();
    case 'H': return HOJAS[f.hoja].adj;
    case 'T': return TALLAS[f.talla];
    case 'G': return f.vigor ? 'rápida' : 'lenta';
    case 'M': return f.estable ? 'estable' : 'inestable';
    case 'X': return f.brillo ? 'brilla' : 'opaca';
    case 'N': return f.nectar ? 'con néctar' : 'sin néctar';
  }
  return '';
}

/* ---------- Registro ---------- */
function pintarRegistro() {
  const c = $('#regLista');
  if (!c || !E) return;
  const arr = E.registro.filter(r => filtroReg === 'todo' || r.tipo === filtroReg);
  if (!arr.length) { c.innerHTML = `<div class="vacio" style="padding:14px">Nada por aquí todavía.</div>`; return; }
  c.innerHTML = arr.slice(0, 60).map(r =>
    `<div class="reg-linea ${r.tipo}"><span class="reg-hora">${r.t}</span><span class="reg-txt">${r.txt}</span></div>`).join('');
}

/* ============================================================
   9.b VISTAS CENTRALES
   ============================================================ */
const lab = { a: null, b: null, ultimo: null, forzar: null };

function irVista(v) {
  if (!$('#vista' + may(v))) return;
  vistaActual = v;
  $$('#navVistas .nav-btn').forEach(b => {
    const activa = b.dataset.vista === v;
    b.classList.toggle('activa', activa);
    // Con diez pestañas la barra se desplaza: que la activa quede a la vista.
    if (activa) b.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  });
  $$('.vista').forEach(s => s.classList.remove('activa'));
  $('#vista' + may(v)).classList.add('activa');
  pintarVista();
  sonido('tap');
}
const may = s => s.charAt(0).toUpperCase() + s.slice(1);

function pintarVista() {
  if (!E) return;
  switch (vistaActual) {
    case 'invernadero': pintarParcelas(); break;
    case 'laboratorio': $('#vistaLaboratorio').innerHTML = vistaLab(); break;
    case 'mercado': $('#vistaMercado').innerHTML = vistaMercado(); break;
    case 'investigacion': $('#vistaInvestigacion').innerHTML = vistaInvest(); break;
    case 'equipo': $('#vistaEquipo').innerHTML = vistaEquipo(); break;
    case 'misiones': $('#vistaMisiones').innerHTML = vistaMisiones(); break;
    case 'decoracion': $('#vistaDecoracion').innerHTML = vistaDeco(); break;
    case 'enciclopedia': $('#vistaEnciclopedia').innerHTML = vistaHerbario(); break;
    case 'logros': $('#vistaLogros').innerHTML = vistaLogros(); break;
    case 'vitrina': $('#vistaVitrina').innerHTML = vistaVitrina(); break;
    case 'legado': $('#vistaLegado').innerHTML = vistaLegado(); break;
  }
}
const cabecera = (tit, sub, extra) => `<div class="inv-cabecera vidrio">
  <div class="inv-titulo"><h2>${tit}</h2><p>${sub}</p></div>
  <div class="inv-acciones">${extra || ''}</div></div>`;

/* ---------- LABORATORIO ---------- */
function ranuraLab(lado) {
  const cod = lab[lado];
  if (!cod || !E.flores.find(s => s.cod === cod)) {
    lab[lado] = null;
    return `<div class="cruce-ranura" data-ranura="${lado}">
      <div class="cruce-vacia"><div style="font-size:2rem">➕</div>Elegir flor</div></div>`;
  }
  const f = fen(cod);
  return `<div class="cruce-ranura llena" data-ranura="${lado}">
    ${svgPlanta(f, 1, { sombra: false, id: 'lab' + lado })}
    <span class="cruce-nom">${f.nombre}</span></div>`;
}
function vistaLab() {
  const puedeP = tieneInv('gen2');
  const pred = (lab.a && lab.b && puedeP) ? predecir(genDec(codDe(lab.a)), genDec(codDe(lab.b))) : null;
  const listo = lab.a && lab.b;
  return cabecera('Laboratorio de cruce', 'Dos flores cortadas dan semillas con genes de las dos') + `
  <div class="tarjeta">
    <div class="cruce-mesa">
      ${ranuraLab('a')}
      <div style="text-align:center"><div class="cruce-simbolo">✕</div>
        <div class="helice"><i style="animation-delay:0s"></i><i style="animation-delay:.1s"></i><i style="animation-delay:.2s"></i><i style="animation-delay:.3s"></i><i style="animation-delay:.4s"></i></div>
      </div>
      ${ranuraLab('b')}
    </div>
    <div class="det-botones dos" style="margin-top:14px">
      <button class="btn btn-suave" data-lab-limpiar>↺ Vaciar mesa</button>
      <button class="btn btn-verde" data-cruzar ${listo ? '' : 'disabled'}>🧬 Cruzar</button>
    </div>
    ${listo ? `<p class="tarjeta-sub" style="margin-top:9px;text-align:center">
      Probabilidad de mutación por locus: <b>${(probMutacion() * 100).toFixed(1)}%</b></p>` : ''}
  </div>
  ${listo ? bloquePrediccion(pred, puedeP) : `<div class="tarjeta"><div class="tarjeta-tit">🧪 Cómo funciona</div>
    <div class="tarjeta-sub">Cada progenitor pasa <b>un alelo al azar por locus</b>. Si los dos tienen el mismo alelo, el hijo lo hereda seguro; si son distintos, es cara o cruz. Nada es mágico: lo que salga estaba en los padres, salvo que ocurra una mutación.
    <br><br>Cruza la misma flor consigo misma (necesitas dos ejemplares) para <b>autofecundar</b> y sacar los recesivos escondidos.</div></div>`}
  ${lab.ultimo ? bloqueResultado(lab.ultimo) : ''}
  <div class="tarjeta">
    <div class="tarjeta-tit">🌸 Flores disponibles</div>
    ${E.flores.length ? `<div class="rejilla c4" style="margin-top:10px">${E.flores.map(s => {
      const f = fen(s.cod);
      return `<div class="mini-tarjeta rar-${f.rareza}" data-lab-elegir="${s.cod}">
        <span class="mini-lienzo">${svgPlanta(f, 1, { sombra: false })}</span>
        <span class="mt-nom">${f.nombre.split(' ').slice(0, 2).join(' ')}</span>
        <span class="mt-sub">×${s.n} · ${rarezaPorId(f.rareza).nombre}</span></div>`;
    }).join('')}</div>` : vacio('🌸', 'No tienes flores cortadas. Cosecha alguna planta.')}
  </div>`;
}
function bloquePrediccion(pred, puede) {
  if (!puede) {
    return `<div class="tarjeta"><div class="tarjeta-tit">📐 Predicción bloqueada</div>
      <div class="tarjeta-sub">Investiga el <b>Cuadro de Punnett</b> (rama de Genética) para ver qué puede salir antes de gastar las flores.</div></div>`;
  }
  const colores = Object.entries(pred.colores).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const rarezas = pred.rarezas;
  return `<div class="tarjeta">
    <div class="tarjeta-tit">📐 Predicción</div>
    <div class="tarjeta-sub">Lo que puede salir de este cruce, calculado locus por locus.</div>
    <h4 style="font-size:.7rem;text-transform:uppercase;letter-spacing:.1em;color:var(--tinta-tenue);margin:12px 0 7px">Color</h4>
    <div class="prediccion">${colores.map(([c, p]) => `<div class="pred-fila">
      <i class="pred-color" style="background:${COLORES[c].hex}"></i>
      <span style="width:96px">${COLORES[c].nombre}</span>
      <div class="barra"><i style="width:${p * 100}%;background:${COLORES[c].hex}"></i></div>
      <b style="width:44px;text-align:right">${(p * 100).toFixed(1)}%</b></div>`).join('')}</div>
    <h4 style="font-size:.7rem;text-transform:uppercase;letter-spacing:.1em;color:var(--tinta-tenue);margin:12px 0 7px">Rareza</h4>
    <div class="prediccion">${RAREZAS.filter(r => rarezas[r.id] > 0.0005).map(r => `<div class="pred-fila">
      <i class="pred-color" style="background:${r.color}"></i>
      <span style="width:96px">${r.nombre}</span>
      <div class="barra"><i style="width:${rarezas[r.id] * 100}%;background:${r.color}"></i></div>
      <b style="width:44px;text-align:right">${(rarezas[r.id] * 100).toFixed(1)}%</b></div>`).join('')}</div>
    <div class="rejilla c2" style="margin-top:12px">
      <div class="det-fila"><span>Corola estrella</span><b>${(pred.formas.F1 * 100).toFixed(0)}%</b></div>
      <div class="det-fila"><span>Hoja abanicada</span><b>${(pred.hojas.abanicada * 100).toFixed(0)}%</b></div>
      <div class="det-fila"><span>Luminiscente</span><b>${(pred.brillo * 100).toFixed(1)}%</b></div>
      <div class="det-fila"><span>Con néctar</span><b>${(pred.nectar * 100).toFixed(0)}%</b></div>
      <div class="det-fila"><span>Talla alta</span><b>${(pred.tallas[2] * 100).toFixed(0)}%</b></div>
      <div class="det-fila"><span>Saturación intensa</span><b>${(pred.sats[2] * 100).toFixed(0)}%</b></div>
    </div>
    ${tieneInv('gen6') ? bloqueForzar() : ''}
  </div>`;
}
function bloqueForzar() {
  return `<div style="margin-top:12px;border-top:1px solid rgba(140,125,105,.16);padding-top:10px">
    <div class="tarjeta-tit" style="font-size:.9rem">✂️ Edición fina</div>
    <div class="tarjeta-sub">Fuerza un alelo del primer progenitor en todas las semillas de este cruce.</div>
    <div style="display:flex;gap:7px;margin-top:8px;flex-wrap:wrap">
      <select id="forzarLocus" style="padding:7px 12px;border-radius:99px;border:1px solid rgba(140,125,105,.22);background:var(--vidrio-2)">
        <option value="">— sin forzar —</option>
        ${LOCI.map(l => `<option value="${l.id}" ${lab.forzar && lab.forzar.locus === l.id ? 'selected' : ''}>${l.nombre}</option>`).join('')}
      </select>
      <select id="forzarAlelo" style="padding:7px 12px;border-radius:99px;border:1px solid rgba(140,125,105,.22);background:var(--vidrio-2)">
        ${(lab.forzar && LOCUS[lab.forzar.locus] ? LOCUS[lab.forzar.locus].alelos : []).map(a =>
          `<option value="${a}" ${lab.forzar && lab.forzar.alelo === a ? 'selected' : ''}>${a}</option>`).join('')}
      </select>
    </div></div>`;
}
function bloqueResultado(r) {
  return `<div class="tarjeta">
    <div class="tarjeta-tit">🌱 Último cruce · ${r.hijos.length} semillas</div>
    <div class="rejilla c4" style="margin-top:10px">${r.hijos.map(h => `
      <div class="mini-tarjeta rar-${h.fen.rareza}" data-esp-ver="${h.fen.especie}">
        <span class="mini-lienzo">${svgPlanta(h.fen, 1, { sombra: false })}</span>
        <span class="mt-nom">${h.fen.nombre.split(' ').slice(0, 2).join(' ')}</span>
        <span class="mt-sub">${rarezaPorId(h.fen.rareza).nombre}${h.mutados.length ? ' ⚡' : ''}</span>
      </div>`).join('')}</div>
    ${r.nuevos.length ? `<p class="tarjeta-sub" style="margin-top:9px">✨ <b>${r.nuevos.length}</b> de estas semillas darán especies que no tienes.</p>` : ''}
  </div>`;
}

/** Distribución de alelos que aporta un progenitor en un locus. */
function aporte(par) {
  const m = {};
  par.forEach(a => m[a] = (m[a] || 0) + 0.5);
  return m;
}
function predecir(gA, gB) {
  const p = {};
  LOCI.forEach(l => {
    const a = aporte(gA[l.id]), b = aporte(gB[l.id]);
    const combos = {};
    Object.keys(a).forEach(x => Object.keys(b).forEach(y => {
      const par = ordenarPar(l, [x, y]).join('');
      combos[par] = (combos[par] || 0) + a[x] * b[y];
    }));
    p[l.id] = combos;
  });
  // Dosis de pigmento
  const dosis = id => {
    const d = { 0: 0, 1: 0, 2: 0 };
    Object.entries(p[id]).forEach(([par, pr]) => {
      const n = (par.match(new RegExp(id, 'g')) || []).length;
      d[n] += pr;
    });
    return d;
  };
  const dA = dosis('A'), dB = dosis('B'), dC = dosis('C');
  const albina = p.P.pp || 0;
  const colores = {};
  [0, 1, 2].forEach(x => [0, 1, 2].forEach(y => [0, 1, 2].forEach(z => {
    const pr = dA[x] * dB[y] * dC[z] * (1 - albina);
    if (pr > 0) colores['' + x + y + z] = (colores['' + x + y + z] || 0) + pr;
  })));
  if (albina > 0) colores.alb = albina;
  // Forma: gana el alelo más dominante del par
  const formas = { F1: 0, F2: 0, F3: 0, f: 0 };
  Object.entries(p.F).forEach(([par, pr]) => {
    const al = ORDEN_F.find(x => par.startsWith(x)) || 'f';
    formas[al] += pr;
  });
  const hojas = { cordada: p.H.HcHc || 0, plumada: p.H.HpHp || 0, abanicada: p.H.HcHp || 0 };
  const sats = [p.S.ss || 0, p.S.Ss || 0, p.S.SS || 0];
  const tallas = [p.T.tt || 0, p.T.Tt || 0, p.T.TT || 0];
  const brillo = p.X.xx || 0;
  const nectar = 1 - (p.N.nn || 0);
  const vigor = 1 - (p.G.gg || 0);
  const estable = 1 - (p.M.mm || 0);
  const pred = { loci: p, colores, formas, hojas, sats, tallas, brillo, nectar, vigor, estable };
  pred.rarezas = distribucionRareza(pred);
  return pred;
}
/** Enumera el espacio de fenotipos posible y suma la probabilidad por rareza. */
function distribucionRareza(pred) {
  const out = {};
  RAREZAS.forEach(r => out[r.id] = 0);
  const cols = Object.entries(pred.colores).filter(([, p]) => p > 0);
  const fos = Object.entries(pred.formas).filter(([, p]) => p > 0);
  const hos = Object.entries(pred.hojas).filter(([, p]) => p > 0);
  for (const [color, pc] of cols) for (const [forma, pf] of fos) for (const [hoja, ph] of hos)
    for (let s = 0; s < 3; s++) { if (!pred.sats[s]) continue;
      for (let t = 0; t < 3; t++) { if (!pred.tallas[t]) continue;
        for (const bri of [true, false]) { const pb = bri ? pred.brillo : 1 - pred.brillo; if (!pb) continue;
          for (const nec of [true, false]) { const pn = nec ? pred.nectar : 1 - pred.nectar; if (!pn) continue;
            for (const est of [true, false]) { const pe = est ? pred.estable : 1 - pred.estable; if (!pe) continue;
              const f = { color, forma, hoja, sat: s, talla: t, brillo: bri, nectar: nec, estable: est,
                albina: color === 'alb',
                dosisA: color === 'alb' ? 0 : +color[0],
                dosisB: color === 'alb' ? 0 : +color[1],
                dosisC: color === 'alb' ? 0 : +color[2] };
              const r = rarezaDePuntos(puntosRareza(f, null));
              out[r] += pc * pf * ph * pred.sats[s] * pred.tallas[t] * pb * pn * pe;
            }}}}}
  return out;
}

/* ---------- MERCADO ---------- */
function vistaMercado() {
  const ev = eventoActivo();
  return cabecera('Mercado', 'Compra semillas, vende flores y mira cómo se mueve la demanda',
    `<button class="btn btn-suave" data-vender-rap="comun,poco">Vender flores comunes</button>
     <button class="btn btn-suave" data-vender-sem-rap>Despejar semillas</button>
     <button class="btn btn-oro" data-vender-rap="todo">Vender todas las flores</button>`) +
  (E.cliente ? `<div class="tarjeta">${tarjetaCliente()}</div>` : '') +
  (ev && ev.ef && (ev.ef.precio || ev.ef.semillas || ev.ef.precioRaro) ?
    `<div class="tarjeta" style="border-left:4px solid var(--lavanda)">
      <div class="tarjeta-tit">${ev.emo} ${ev.nombre}</div><div class="tarjeta-sub">${ev.txt}</div></div>` : '') + `
  <div class="tarjeta">
    <div class="tarjeta-tit">🌰 Tienda de semillas</div>
    <div class="rejilla c3" style="margin-top:11px">
      ${SEMILLAS.map(s => {
        const bloq = E.nivel < s.nivel || (s.invest && !tieneInv(s.invest));
        const precio = precioSemilla(s);
        return `<div class="mini-tarjeta ${bloq ? 'bloq' : ''}" data-comprar-sem="${s.id}"
          data-tip="<b>${s.nombre}</b><br>${s.desc}${bloq ? '<br><b>Nivel ' + s.nivel + '</b>' : ''}">
          <span class="mt-emo">${s.emo}</span>
          <span class="mt-nom">${s.nombre}</span>
          <span class="mt-sub">${bloq ? '🔒 Nivel ' + s.nivel : monedas(precio) + ' 🪙'}</span>
        </div>`;
      }).join('')}
    </div>
    <p class="tarjeta-sub" style="margin-top:9px">Con <b>Shift</b> pulsado compras 10 de una vez.</p>
  </div>
  <div class="tarjeta">
    <div class="tarjeta-tit">📈 Demanda por familia de color</div>
    <div class="tarjeta-sub">Cambia cada día. Vender mucho de un color hunde su precio; se recupera solo.</div>
    <div class="lista-simple" style="margin-top:11px">
      ${FAMILIAS_COLOR.map(f => {
        const d = E.mercado.demanda[f.id];
        const h = E.mercado.hist[f.id] || [];
        const ant = h.length > 1 ? h[h.length - 2] : d;
        const dif = (d - ant) / Math.max(0.01, ant) * 100;
        return `<div class="merc-fila">
          <span style="font-size:1.4rem">${f.emo}</span>
          <span><b style="font-size:.86rem">${f.nombre}</b>
            <div class="barra" style="margin-top:5px"><i style="width:${lim(d / 2.6 * 100, 3, 100)}%"></i></div></span>
          <span class="grafico">${h.slice(-8).map(v => `<i style="height:${lim(v / 2.6 * 32, 3, 32)}px"></i>`).join('')}</span>
          <span style="text-align:right"><b>×${d.toFixed(2)}</b>
            <div class="merc-tend ${dif >= 0 ? 'sube' : 'baja'}">${dif >= 0 ? '▲' : '▼'} ${Math.abs(dif).toFixed(1)}%</div></span>
        </div>`;
      }).join('')}
    </div>
  </div>
  <div class="tarjeta">
    <div class="tarjeta-tit">🌸 Tus flores</div>
    ${E.flores.length ? `<div class="lista-simple" style="margin-top:10px">${
      ordenarStacks(E.flores.slice(), 'rareza').map(s => {
        const f = fen(s.cod);
        const p = precioVenta(f, 1);
        const gusta = E.cliente && clienteAcepta(f);
        return `<div class="item-lista rar-${f.rareza}">
          <span class="item-lienzo">${svgPlanta(f, 1, { sombra: false })}</span>
          <span class="item-txt"><span class="item-nom">${f.nombre} ${gusta ? '⭐' : ''}</span>
            <span class="item-desc">${rarezaPorId(f.rareza).nombre} · ×${s.n} · ${monedas(p)} 🪙 c/u</span></span>
          <span class="item-der">
            <button class="btn btn-oro btn-mini" data-vender="${s.cod}">Vender 1</button>
            <button class="btn btn-suave btn-mini" data-vender-todo="${s.cod}">Vender ${s.n} · ${monedas(p * s.n)}</button>
          </span></div>`;
      }).join('')}</div>` : vacio('🌸', 'No tienes flores cortadas.')}
  </div>`;
}

/* ---------- INVESTIGACIÓN ---------- */
function vistaInvest() {
  return cabecera('Investigación', `${E.invest.length}/${INVESTIGACION.length} mejoras · ${Math.floor(E.ciencia)} 🔬 disponibles`,
    `<span class="pastilla">🔬 ${Math.floor(E.ciencia)}</span>`) + `
  <div class="tarjeta">
    <div class="tarjeta-sub">Los puntos de investigación 🔬 los generan las <b>científicas</b> del equipo y suben de nivel. Cada rama abre un estilo de juego distinto.</div>
  </div>` +
  RAMAS_INV.map(r => `<div class="tarjeta arbol-rama">
    <div class="rama-tit">${r.emo} ${r.nombre}<span class="linea"></span>
      <span class="pastilla">${INVESTIGACION.filter(n => n.rama === r.id && tieneInv(n.id)).length}/${INVESTIGACION.filter(n => n.rama === r.id).length}</span></div>
    <div class="nodos">${INVESTIGACION.filter(n => n.rama === r.id).map(n => {
      const comprado = tieneInv(n.id);
      const abierto = n.req.every(x => tieneInv(x));
      const puede = abierto && !comprado && E.oro >= n.oro && E.ciencia >= n.ci;
      return `<div class="nodo ${comprado ? 'comprado' : !abierto ? 'bloqueado' : puede ? 'disponible' : ''}"
        data-invest="${n.id}" data-tip="<b>${n.nombre}</b><br>${n.desc}">
        <div class="nodo-emo">${n.emo}</div>
        <div class="nodo-nom">${n.nombre}</div>
        <div class="nodo-desc">${n.desc}</div>
        ${comprado ? '<div class="nodo-costo" style="color:var(--exito)">Investigado</div>' :
          `<div class="nodo-costo"><span>${monedas(n.oro)} 🪙</span><span>${n.ci} 🔬</span></div>`}
      </div>`;
    }).join('')}</div>
  </div>`).join('');
}

/* ---------- EQUIPO ---------- */
function vistaEquipo() {
  const total = E.empleados.reduce((s, e) => s + sueldoDe(e), 0);
  return cabecera('Equipo', `${E.empleados.length}/15 personas · ${monedas(total)} 🪙 de sueldos al día`) + `
  <div class="tarjeta">
    <div class="tarjeta-tit">🤝 Contratar</div>
    <div class="rejilla c3" style="margin-top:11px">
      ${Object.keys(ROLES).map(k => {
        const r = ROLES[k], c = costoContrato(k);
        return `<div class="mini-tarjeta" data-contratar="${k}" data-tip="<b>${r.nombre}</b><br>${r.desc}<br>Sueldo base: ${r.sueldo} 🪙/día">
          <span class="mt-emo">${r.emo}</span>
          <span class="mt-nom">${r.nombre}</span>
          <span class="mt-sub">${monedas(c)} 🪙</span></div>`;
      }).join('')}
    </div>
  </div>
  <div class="tarjeta">
    <div class="tarjeta-tit">👥 Tu gente</div>
    ${E.empleados.length ? `<div class="lista-simple" style="margin-top:10px">${E.empleados.map(e => {
      const r = ROLES[e.rol], h = humorDe(e.animo);
      return `<div class="emp-tarjeta">
        <span class="emp-avatar">${r.emo}</span>
        <div class="emp-datos">
          <div class="emp-nom">${e.nombre} <span class="pastilla">Nv ${e.nivel}</span> <span class="humor">${h.emo} ${h.nombre}</span></div>
          <div class="emp-rol">${r.nombre} · ${r.desc}</div>
          <div class="emp-stats">
            <span class="emp-stat"><span>Eficacia</span><b>×${eficaciaEmp(e).toFixed(2)}</b></span>
            <span class="emp-stat"><span>Sueldo</span><b>${monedas(sueldoDe(e))} 🪙</b></span>
            <span class="emp-stat"><span>Ánimo</span><b>${Math.round(e.animo)}%</b></span>
            <span class="emp-stat"><span>Exp</span><b>${e.exp}/${expEmp(e.nivel)}</b></span>
          </div>
          <div class="barra" style="margin-top:6px"><i style="width:${e.animo}%"></i></div>
          <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">
            <button class="btn btn-suave btn-mini" data-animar="${e.id}">☕ Día libre · ${monedas(Math.round(sueldoDe(e) * 1.6))}</button>
            <button class="btn btn-verde btn-mini" data-entrenar="${e.id}">📚 Formar · ${monedas(Math.round(sueldoDe(e) * 6 * Math.pow(1.4, e.nivel)))}</button>
            <button class="btn btn-suave btn-mini" data-despedir="${e.id}">✖</button>
          </div>
        </div></div>`;
    }).join('')}</div>` : vacio('👥', 'Todavía trabajas sola.<br>Contrata a alguien para automatizar.')}
  </div>`;
}

/* ---------- MISIONES ---------- */
function vistaMisiones() {
  refrescarMisiones();
  const perm = misionesPermanentesActivas();
  return cabecera('Misiones', 'Diarias, semanales y una cadena de hitos que no se acaba') +
    bloqueEncargo() +
    seccionMisiones('☀️ Diarias', E.misiones.diarias, 'Se renuevan cada día.') +
    seccionMisiones('📆 Semanales', E.misiones.semanales, 'Se renuevan cada lunes.') +
    seccionMisiones('🏔️ Cadena permanente', perm, `Quedan ${MISIONES_FIJAS.length - Object.keys(E.misiones.perm).length} hitos.`);
}
/** Tarjeta del encargo largo en curso. */
function bloqueEncargo() {
  const e = E.encargo;
  if (!e) return `<div class="tarjeta"><div class="tarjeta-tit">📜 Encargos</div>
    <div class="tarjeta-sub">Llegan a partir del nivel 4. Son pedidos de varios días que pagan <b>esporas</b>.</div></div>`;
  const pr = lim(e.hechas / e.meta, 0, 1);
  const quedan = e.vence - E.mundo.dia;
  return `<div class="tarjeta" style="border-left:4px solid var(--lavanda)">
    <div class="tarjeta-tit">${e.emo} Encargo · ${e.meta} ${e.txt}</div>
    <div class="tarjeta-sub">Se cuentan al <b>venderlas</b>. Quedan ${quedan > 0 ? quedan + ' día(s)' : 'horas'}.</div>
    <div class="barra ${e.cobrado ? 'oro' : ''}" style="margin-top:9px"><i style="width:${pr * 100}%"></i></div>
    <div class="mision-prem" style="margin-top:8px">
      <span class="pastilla">${e.hechas}/${e.meta}</span>
      <span class="pastilla oro">+${monedas(e.oro)} 🪙</span>
      <span class="pastilla">+${e.esporas} ✿</span>
      <span class="pastilla">+${e.xp} XP</span>
      ${e.cobrado ? '<span class="pastilla bien">✓ entregado</span>' : ''}
    </div></div>`;
}

/** Panel del concurso semanal dentro de la Vitrina. */
function bloqueConcurso(marcador, yo) {
  const c = concursoDeSemana();
  const sem = semanaClave();
  const mio = (E.concurso && E.concurso.semana === sem) ? E.concurso : null;
  const otros = PERSONAS.filter(p => p !== yo);
  const rival = otros.length ? otros[0] : null;
  const suyo = rival && marcador[rival] && marcador[rival].concurso && marcador[rival].concurso.semana === sem
    ? marcador[rival].concurso : null;
  const mejor = mejorCandidata(c);
  let veredicto = 'Aún no ha presentado nadie.';
  if (mio && suyo) veredicto = mio.puntaje === suyo.puntaje ? 'Vais empatados.'
    : (mio.puntaje > suyo.puntaje ? '<b>Vas ganando tú.</b>' : `<b>${rival} va ganando.</b>`);
  else if (mio) veredicto = `Presentada. ${rival || 'La otra persona'} todavía no.`;
  else if (suyo) veredicto = `<b>${rival}</b> ya presentó. Te toca.`;
  return `<div class="tarjeta" style="border-left:4px solid var(--oro)">
    <div class="tarjeta-tit">${c.emo} Concurso de la semana · ${c.nombre}</div>
    <div class="tarjeta-sub">Presenta una flor cortada; se queda el jurado. Gana la de más puntos.
    <br>${veredicto}</div>
    <div class="rejilla c2" style="margin-top:10px">
      <div class="tarjeta" style="padding:11px">
        <div class="tarjeta-tit" style="font-size:.9rem">${yo || 'Tú'}</div>
        <div class="tarjeta-sub">${mio ? `${mio.emo} <b>${mio.nombre}</b><br><span class="pastilla oro">${mio.puntaje} puntos</span>`
          : 'Nada presentado todavía.'}</div>
      </div>
      <div class="tarjeta" style="padding:11px">
        <div class="tarjeta-tit" style="font-size:.9rem">${rival || 'La otra persona'}</div>
        <div class="tarjeta-sub">${suyo ? `${suyo.emo} <b>${suyo.nombre}</b><br><span class="pastilla">${suyo.puntaje} puntos</span>`
          : 'Nada presentado todavía.'}</div>
      </div>
    </div>
    ${mejor ? `<div class="item-lista" style="margin-top:10px">
      <span class="item-lienzo">${svgPlanta(mejor.f, 1, { sombra: false })}</span>
      <span class="item-txt"><span class="item-nom">Tu mejor candidata: ${mejor.f.nombre}</span>
      <span class="item-desc">Puntuaría <b>${mejor.puntaje}</b> en este tema.</span></span>
      <span class="item-der"><button class="btn btn-oro btn-mini" data-concurso="${mejor.clave}">🏆 Presentar</button></span>
    </div>` : '<p class="tarjeta-sub" style="margin-top:9px">No tienes flores cortadas para presentar.</p>'}
  </div>`;
}
/** La flor cortada que más puntuaría en el tema de esta semana. */
function mejorCandidata(c) {
  let mejor = null;
  E.flores.forEach(st => {
    const f = fen(st.cod);
    const p = Math.round(c.mide(f));
    if (!mejor || p > mejor.puntaje) mejor = { clave: st.cod, f, puntaje: p };
  });
  return mejor;
}

function seccionMisiones(tit, arr, sub) {
  return `<div class="tarjeta">
    <div class="tarjeta-tit">${tit}</div>
    <div class="tarjeta-sub">${sub}</div>
    <div class="lista-simple" style="margin-top:11px">
      ${arr.length ? arr.map(m => {
        const pr = progresoMision(m);
        const listo = pr >= 1 && !m.cobrada;
        const actual = m.tipo === 'permanente' ? (E.stats[m.stat] || 0) : (E.stats[m.stat] || 0) - m.base;
        return `<div class="mision ${listo ? 'lista' : ''} ${m.cobrada ? 'cobrada' : ''}">
          <span class="item-emo">${m.emo}</span>
          <span class="mision-txt">
            <span class="mision-nom">${m.nombre}</span>
            <span class="mision-desc">${m.desc}</span>
            <div class="barra ${listo ? 'oro' : ''}"><i style="width:${pr * 100}%"></i></div>
            <span class="mision-prem">
              <span class="pastilla oro">+${monedas(m.oro)} 🪙</span>
              <span class="pastilla">+${m.xp} XP</span>
              ${m.polen ? `<span class="pastilla">+${m.polen} ✨</span>` : ''}
              ${m.semilla ? '<span class="pastilla">+1 🌱</span>' : ''}
              <span class="pastilla">${num(Math.min(actual, m.meta))}/${num(m.meta)}</span>
            </span>
          </span>
          <span class="item-der">${m.cobrada ? '<span class="pastilla bien">✓</span>' :
            `<button class="btn ${listo ? 'btn-oro' : 'btn-suave'} btn-mini" data-mision="${m.id}" ${listo ? '' : 'disabled'}>Cobrar</button>`}</span>
        </div>`;
      }).join('') : vacio('📜', 'Nada por ahora.')}
    </div></div>`;
}

/* ---------- DECORACIÓN ---------- */
function vistaDeco() {
  return cabecera('Decoración', `${E.deco.length}/${DECORACIONES.length} piezas · cada una da un bono permanente`) + `
  <div class="tarjeta">
    <div class="tarjeta-tit">🏮 Catálogo</div>
    <div class="rejilla c3" style="margin-top:11px">
      ${DECORACIONES.map(d => {
        const tiene = tieneDeco(d.id);
        return `<div class="mini-tarjeta ${tiene ? 'hecho' : ''}" data-deco="${d.id}"
          data-tip="<b>${d.nombre}</b><br>${d.desc}">
          <span class="mt-emo">${d.emo}</span>
          <span class="mt-nom">${d.nombre}</span>
          <span class="mt-sub">${tiene ? '✓ Colocada' : monedas(d.precio) + ' 🪙'}</span>
          <span class="mt-sub" style="opacity:.8">${d.desc}</span>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}

/* ---------- HERBARIO ---------- */
let filtroHerb = { texto: '', rareza: '', forma: '', estado: '', rasgo: '' };
function vistaHerbario() {
  const desc = Object.keys(E.herbario).length;
  const pct = desc / ESPECIES_TOTAL * 100;
  let lista = ESPECIES.slice();
  if (filtroHerb.rareza) lista = lista.filter(e => fenotipoDeEspecie(e.id).rareza === filtroHerb.rareza);
  if (filtroHerb.forma) lista = lista.filter(e => e.forma === filtroHerb.forma);
  if (filtroHerb.rasgo) lista = lista.filter(e => (filtroHerb.rasgo === 'ninguno' ? !e.rasgo : e.rasgo === filtroHerb.rasgo));
  if (filtroHerb.estado === 'si') lista = lista.filter(e => E.herbario[e.id]);
  if (filtroHerb.estado === 'no') lista = lista.filter(e => !E.herbario[e.id]);
  if (filtroHerb.texto) {
    const t = filtroHerb.texto.toLowerCase();
    lista = lista.filter(e => fenotipoDeEspecie(e.id).nombre.toLowerCase().includes(t));
  }
  return cabecera('Herbario', `${desc} de ${ESPECIES_TOTAL} especies · ${pct.toFixed(1)}% completo`) + `
  <div class="tarjeta">
    <div class="enc-cabecera">
      <div class="enc-progreso">
        <div class="barra oro"><i style="width:${pct}%"></i></div>
        <div class="tarjeta-sub" style="margin-top:5px">${desc}/${ESPECIES_TOTAL} · ${SECRETOS.filter(s => E.herbario['sec-' + s.id]).length}/${SECRETOS.length} cultivares secretos</div>
      </div>
    </div>
    <div class="enc-filtros" style="margin-top:11px">
      <input type="search" id="herbTexto" placeholder="Buscar especie…" value="${filtroHerb.texto}">
      <select id="herbRareza"><option value="">Toda rareza</option>
        ${RAREZAS.map(r => `<option value="${r.id}" ${filtroHerb.rareza === r.id ? 'selected' : ''}>${r.nombre}</option>`).join('')}</select>
      <select id="herbForma"><option value="">Toda corola</option>
        ${Object.keys(FORMAS).map(k => `<option value="${k}" ${filtroHerb.forma === k ? 'selected' : ''}>${FORMAS[k].nombre}</option>`).join('')}</select>
      <select id="herbRasgo"><option value="">Todo rasgo</option>
        <option value="ninguno" ${filtroHerb.rasgo === 'ninguno' ? 'selected' : ''}>Sin rasgo</option>
        ${Object.keys(RASGOS_BIOMA).map(k => `<option value="${k}" ${filtroHerb.rasgo === k ? 'selected' : ''}>${RASGOS_BIOMA[k].nombre}</option>`).join('')}</select>
      <select id="herbEstado"><option value="">Todas</option>
        <option value="si" ${filtroHerb.estado === 'si' ? 'selected' : ''}>Descubiertas</option>
        <option value="no" ${filtroHerb.estado === 'no' ? 'selected' : ''}>Pendientes</option></select>
    </div>
  </div>
  <div class="tarjeta">
    <div class="enc-rejilla">
      ${lista.map(e => {
        const h = E.herbario[e.id];
        const f = fenotipoDeEspecie(e.id);
        if (!h) return `<div class="enc-celda oculta" data-esp-ver="${e.id}">
          <span class="enc-inter">${e.secreto ? '🗝️' : '❔'}</span>
          <span class="enc-nom">${e.secreto ? 'Cultivar secreto' : f.nombre}</span></div>`;
        return `<div class="enc-celda rar-${f.rareza}" data-esp-ver="${e.id}"
          style="border-color:${rarezaPorId(f.rareza).color}66">
          ${svgPlanta(f, 1, { sombra: false })}
          <span class="enc-nom">${f.nombre}</span></div>`;
      }).join('')}
    </div>
    ${!lista.length ? vacio('🔍', 'Ninguna especie con esos filtros.') : ''}
  </div>`;
}

/* ---------- LOGROS ---------- */
function vistaLogros() {
  const hechos = Object.keys(E.logros).length;
  return cabecera('Logros', `${hechos} de ${LOGROS.length} conseguidos`) + `
  <div class="tarjeta">
    <div class="barra oro"><i style="width:${hechos / LOGROS.length * 100}%"></i></div>
    <div class="tarjeta-sub" style="margin-top:6px">Cada logro paga monedas y experiencia al conseguirse.</div>
  </div>
  <div class="tarjeta">
    <div class="rejilla c3">
      ${LOGROS.map(l => {
        const ok = !!E.logros[l.id];
        let pr = 0;
        try { pr = lim(l.prog(E), 0, 1); } catch (err) { pr = 0; }
        return `<div class="logro-celda ${ok ? 'hecho' : pr > 0 ? '' : 'bloq'}">
          <span class="logro-emo">${l.emo}</span>
          <span class="logro-nom">${l.nombre}</span>
          <span class="logro-desc">${l.desc}</span>
          ${ok ? `<span class="pastilla oro" style="margin-top:6px">✓ ${monedas(l.oro)} 🪙</span>`
               : `<div class="barra" style="margin-top:7px"><i style="width:${pr * 100}%"></i></div>`}
        </div>`;
      }).join('')}
    </div>
  </div>`;
}

/* ---------- VITRINA: el marcador de los dos ---------- */
const ESTADO_NUBE = {
  apagada:   { emo:'☁️', txt:'Sin conectar' },
  sinPersona:{ emo:'👤', txt:'Falta decir quién juega aquí' },
  leyendo:   { emo:'🔄', txt:'Leyendo la nube…' },
  ok:        { emo:'✅', txt:'Al día' },
  error:     { emo:'⚠️', txt:'Sin conexión — todo sigue guardado aquí' },
};
function vistaVitrina() {
  const yo = quien();
  const marcador = (Nube.remoto && Nube.remoto.marcador) || {};
  // El propio siempre se muestra en vivo, aunque aún no haya subido.
  const datos = {};
  PERSONAS.forEach(p => { datos[p] = marcador[p] || null; });
  if (yo) datos[yo] = resumenPropio();
  const est = ESTADO_NUBE[Nube.estado] || ESTADO_NUBE.apagada;
  const campos = [
    ['Nivel', d => d.nivel, 'mayor'],
    ['Herbario', d => d.herbario + '/' + ESPECIES_TOTAL, 'mayor', d => d.herbario],
    ['Cultivares secretos', d => d.secretos + '/' + SECRETOS.length, 'mayor', d => d.secretos],
    ['Logros', d => d.logros + '/' + LOGROS.length, 'mayor', d => d.logros],
    ['Cosechas', d => num(d.cosechas), 'mayor', d => d.cosechas],
    ['Cruces', d => num(d.cruces), 'mayor', d => d.cruces],
    ['Monedas ganadas', d => monedas(d.oro), 'mayor', d => d.oro],
    ['Parcelas', d => d.parcelas + '/' + JUEGO.parcelasMax, 'mayor', d => d.parcelas],
    ['Días de invernadero', d => num(d.dia), 'mayor', d => d.dia],
  ];
  const cabeza = PERSONAS.map(p => {
    const d = datos[p];
    return `<th style="text-align:center;padding:8px 6px">
      <div style="font-size:1.5rem">${p === 'Catalina' ? '🌷' : '🌿'}</div>
      <div style="font-family:'Fraunces',serif;font-size:.94rem">${p}${p === yo ? ' <small style="opacity:.6">(tú)</small>' : ''}</div>
      <div style="font-size:.66rem;color:var(--tinta-tenue)">${d ? (p === yo ? 'en vivo' : 'hace ' + tiempoCorto(Date.now() - d.t)) : 'sin datos'}</div>
    </th>`;
  }).join('');
  const filas = campos.map(([etq, fmt, , val]) => {
    const v = PERSONAS.map(p => datos[p] ? (val ? val(datos[p]) : datos[p].nivel) : -1);
    const lider = v[0] === v[1] ? -1 : (v[0] > v[1] ? 0 : 1);
    return `<tr>
      <td style="padding:7px 8px;color:var(--tinta-tenue);font-size:.78rem">${etq}</td>
      ${PERSONAS.map((p, i) => `<td style="text-align:center;padding:7px 6px;font-weight:700;font-size:.84rem;
        ${i === lider ? 'color:var(--oro-osc)' : ''}">${datos[p] ? fmt(datos[p]) : '—'}${i === lider ? ' 👑' : ''}</td>`).join('')}
    </tr>`;
  }).join('');
  const totales = PERSONAS.map(p => datos[p] ? datos[p].puntos || progresoDe(datos[p]) : -1);
  const ganador = totales[0] === totales[1] ? null : (totales[0] > totales[1] ? PERSONAS[0] : PERSONAS[1]);

  return cabecera('Vitrina', 'Cada uno con su invernadero; aquí se ve cómo van los dos',
    `<button class="btn btn-suave" data-sync>🔄 Actualizar</button>
     <button class="btn btn-suave" data-elegir-quien>👤 ${yo || 'Elegir jugador'}</button>`) + `
  <div class="tarjeta">
    <div class="tarjeta-tit">${est.emo} ${est.txt}</div>
    <div class="tarjeta-sub">Tu partida se guarda <b>siempre</b> en este aparato. La nube solo lleva
    un resumen para el marcador y una copia de respaldo por si cambias de teléfono.
    ${Nube.ultimoRespaldo ? '<br>Último respaldo: hace ' + tiempoCorto(Date.now() - Nube.ultimoRespaldo) + '.' : ''}</div>
  </div>
  ${!yo ? `<div class="tarjeta" style="border-left:4px solid var(--oro)">
    <div class="tarjeta-tit">👤 ¿Quién eres?</div>
    <div class="tarjeta-sub">Dilo una vez y este aparato lo recuerda. Sin esto no hay marcador ni respaldo.</div>
    <div class="rejilla c2" style="margin-top:10px">
      ${PERSONAS.map(p => `<div class="mini-tarjeta" data-quien="${p}">
        <span class="mt-emo">${p === 'Catalina' ? '🌷' : '🌿'}</span>
        <span class="mt-nom">${p}</span></div>`).join('')}
    </div></div>` : ''}
  ${bloqueConcurso(marcador, yo)}
  <div class="tarjeta">
    <div class="tarjeta-tit">🏆 Marcador</div>
    ${ganador ? `<div class="tarjeta-sub">Por ahora va ganando <b>${ganador}</b>.</div>`
      : `<div class="tarjeta-sub">${totales[0] < 0 || totales[1] < 0 ? 'Falta que el otro juegue para comparar.' : 'Van empatados.'}</div>`}
    <div style="overflow-x:auto;margin-top:10px">
      <table style="width:100%;border-collapse:collapse;min-width:280px">
        <thead><tr><th></th>${cabeza}</tr></thead>
        <tbody>${filas}</tbody>
      </table>
    </div>
  </div>
  <div class="rejilla c2">
    ${PERSONAS.map(p => {
      const d = datos[p];
      if (!d || !d.mejor) return `<div class="tarjeta"><div class="tarjeta-tit">${p}</div>
        <div class="tarjeta-sub">Todavía no descubre nada.</div></div>`;
      return `<div class="tarjeta">
        <div class="tarjeta-tit">${d.mejor.emo} Lo más raro de ${p}</div>
        <div class="tarjeta-sub"><b>${d.mejor.nombre}</b><br>
        <span class="pastilla" style="background:${rarezaPorId(d.mejor.rareza).color}33;color:${rarezaPorId(d.mejor.rareza).color};margin-top:5px">${rarezaPorId(d.mejor.rareza).nombre}</span></div>
      </div>`;
    }).join('')}
  </div>`;
}

/* ---------- Modales auxiliares ---------- */
function modalElegirSemilla(idxParcela) {
  if (!E.semillas.length) {
    modal(`<h3 class="modal-tit">Sin semillas</h3>
      <p class="modal-sub">No tienes ninguna semilla. Compra en el mercado o cosecha una flor para conseguir más.</p>
      <div class="modal-pie"><button class="btn btn-verde" data-cerrar data-ir="mercado">Ir al mercado</button></div>`);
    return;
  }
  const html = ordenarStacks(E.semillas.slice(), 'rareza').map(s => {
    const f = fen(s.cod);
    const conocida = !!E.herbario[f.especie] || tieneInv('gen1');
    return `<div class="mini-tarjeta rar-${f.rareza}" data-elegir-sem="${s.cod}" data-parcela-destino="${idxParcela}">
      <span class="mini-lienzo" style="height:54px">${svgSemilla(f)}</span>
      <span class="mt-nom">${conocida ? f.nombre.split(' ').slice(0, 2).join(' ') : '❓ Misteriosa'}</span>
      <span class="mt-sub">×${s.n}${conocida ? ' · ' + rarezaPorId(f.rareza).nombre : ''}</span></div>`;
  }).join('');
  modal(`<h3 class="modal-tit">Elegir semilla</h3>
    <p class="modal-sub">Parcela ${idxParcela + 1}. Toca la semilla que quieres plantar.</p>
    <div class="rejilla c4">${html}</div>`, true);
}
function modalElegirFlor(lado) {
  if (!E.flores.length) {
    modal(`<h3 class="modal-tit">Sin flores</h3><p class="modal-sub">Necesitas flores cortadas para cruzar. Cosecha alguna planta madura.</p>`);
    return;
  }
  const html = ordenarStacks(E.flores.slice(), 'rareza').map(s => {
    const f = fen(s.cod);
    return `<div class="mini-tarjeta rar-${f.rareza}" data-elegir-flor="${s.cod}" data-lado="${lado}">
      <span class="mini-lienzo" style="height:54px">${svgPlanta(f, 1, { sombra: false })}</span>
      <span class="mt-nom">${f.nombre.split(' ').slice(0, 2).join(' ')}</span>
      <span class="mt-sub">×${s.n} · ${rarezaPorId(f.rareza).nombre}</span></div>`;
  }).join('');
  modal(`<h3 class="modal-tit">Elegir progenitor ${lado.toUpperCase()}</h3>
    <p class="modal-sub">Se gasta una flor por cruce.</p>
    <div class="rejilla c4">${html}</div>`, true);
}
function modalAjustes() {
  const a = E.ajustes;
  modal(`<h3 class="modal-tit">Ajustes</h3>
    <p class="modal-sub">Versión ${JUEGO.version} · guardado automático cada ${JUEGO.guardadoCada / 1000}s</p>
    <div class="ajuste-fila"><div class="ajuste-txt"><b>Música</b><small>Ambiente generado en el navegador</small></div>
      <div class="interruptor ${a.musica ? 'on' : ''}" data-toggle="musica"></div></div>
    <div class="ajuste-fila"><div class="ajuste-txt"><b>Volumen de música</b></div>
      <input type="range" min="0" max="100" value="${a.volMusica * 100}" data-vol="musica"></div>
    <div class="ajuste-fila"><div class="ajuste-txt"><b>Efectos de sonido</b></div>
      <div class="interruptor ${a.sfx ? 'on' : ''}" data-toggle="sfx"></div></div>
    <div class="ajuste-fila"><div class="ajuste-txt"><b>Volumen de efectos</b></div>
      <input type="range" min="0" max="100" value="${a.volSfx * 100}" data-vol="sfx"></div>
    <div class="ajuste-fila"><div class="ajuste-txt"><b>Partículas</b><small>Confeti, chispas y gotas</small></div>
      <div class="interruptor ${a.particulas ? 'on' : ''}" data-toggle="particulas"></div></div>
    <div class="ajuste-fila"><div class="ajuste-txt"><b>Resiembra automática</b>
      <small>Repite en cada parcela la variedad que tú sembraste ahí. Apágala si prefieres elegir cada vez.</small></div>
      <div class="interruptor ${a.autoResiembra !== false ? 'on' : ''}" data-toggle="autoResiembra"></div></div>
    <div class="ajuste-fila"><div class="ajuste-txt"><b>Auto-despejar el almacén</b>
      <small>Cuando se llena, vende solo lo más barato y guarda los ${DESPEJE_RESERVA} montones de semillas más valiosos.</small></div>
      <div class="interruptor ${a.autoDespejar ? 'on' : ''}" data-toggle="autoDespejar"></div></div>
    <div class="ajuste-fila"><div class="ajuste-txt"><b>Ahorro de batería</b>
      <small>Quita el fondo animado y los efectos. Si el teléfono se calienta, enciéndelo.</small></div>
      <div class="interruptor ${a.ahorro ? 'on' : ''}" data-toggle="ahorro"></div></div>
    <div class="ajuste-fila"><div class="ajuste-txt"><b>Tema</b><small>El fondo también cambia con la hora del juego</small></div>
      <select id="selTema" style="padding:7px 13px;border-radius:99px;border:1px solid rgba(140,125,105,.22);background:var(--vidrio-2)">
        <option value="auto" ${a.tema === 'auto' ? 'selected' : ''}>Automático</option>
        <option value="claro" ${a.tema === 'claro' ? 'selected' : ''}>Claro</option>
        <option value="oscuro" ${a.tema === 'oscuro' ? 'selected' : ''}>Oscuro</option>
      </select></div>
    <div class="ajuste-fila"><div class="ajuste-txt"><b>Jugador de este aparato</b>
      <small>Para el marcador compartido y el respaldo en la nube</small></div>
      <button class="btn btn-suave btn-mini" data-elegir-quien>👤 ${quien() || 'Elegir'}</button></div>
    <div class="det-seccion"><h4>Partida</h4>
      <div class="det-botones dos">
        <button class="btn btn-suave" data-exportar>💾 Exportar</button>
        <button class="btn btn-suave" data-importar>📂 Importar</button>
        <button class="btn btn-suave" data-ayuda>❓ Cómo se juega</button>
        <button class="btn btn-rojo" data-borrar>🗑️ Empezar de cero</button>
      </div>
    </div>`);
}
function modalAyuda() {
  modal(`<h3 class="modal-tit">Cómo se juega</h3>
    <p class="modal-sub">Un invernadero es paciencia: plantar, regar, cosechar y cruzar lo que te guste.</p>
    <div class="lista-simple">
      <div class="item-lista"><span class="item-emo">🌱</span><span class="item-txt">
        <span class="item-nom">1. Planta</span><span class="item-desc">Toca una parcela vacía y elige una semilla. Riega para que no se seque.</span></span></div>
      <div class="item-lista"><span class="item-emo">🧺</span><span class="item-txt">
        <span class="item-nom">2. Cosecha</span><span class="item-desc">Cuando la flor está abierta, cosecharla te da la flor cortada y semillas hijas (autofecundadas).</span></span></div>
      <div class="item-lista"><span class="item-emo">🧬</span><span class="item-txt">
        <span class="item-nom">3. Cruza</span><span class="item-desc">En el laboratorio, dos flores dan semillas nuevas. Cada padre aporta un alelo al azar por locus: eso es todo el secreto.</span></span></div>
      <div class="item-lista"><span class="item-emo">🎨</span><span class="item-txt">
        <span class="item-nom">Los colores se suman</span><span class="item-desc">Azul + amarillo = verde. Rojo + amarillo = naranja. Azul + rojo = violeta. Los tres a la vez dan grises y ónix.</span></span></div>
      <div class="item-lista"><span class="item-emo">👻</span><span class="item-txt">
        <span class="item-nom">Los recesivos se esconden</span><span class="item-desc">La luminiscencia solo aparece con <b>xx</b>. Dos padres opacos pueden tener una hija que brilla si ambos la llevaban.</span></span></div>
      <div class="item-lista"><span class="item-emo">📖</span><span class="item-txt">
        <span class="item-nom">Colecciona</span><span class="item-desc">Hay ${ESPECIES_TOTAL} entradas en el herbario, ${SECRETOS.length} de ellas cultivares secretos con condiciones exactas.</span></span></div>
    </div>`);
}
function modalImportar() {
  modal(`<h3 class="modal-tit">Importar partida</h3>
    <p class="modal-sub">Pega el texto que exportaste. Se reemplaza la partida actual.</p>
    <textarea id="txtImportar" style="width:100%;height:130px;border-radius:14px;padding:11px;border:1px solid rgba(140,125,105,.24);background:var(--vidrio-2);font-family:monospace;font-size:.72rem" placeholder="Pega aquí…"></textarea>
    <div class="modal-pie"><button class="btn btn-suave" data-cerrar>Cancelar</button>
      <button class="btn btn-verde" id="btnImportarOk">Importar</button></div>`);
  $('#btnImportarOk').onclick = () => importarPartida($('#txtImportar').value);
}
function modalBienvenida(off) {
  const partes = [];
  if (off && off.oro) partes.push(`ganaste <b>${monedas(off.oro)}</b> 🪙`);
  if (off && off.cosechas) partes.push(`se cosecharon <b>${off.cosechas}</b> flores`);
  modal(`<h3 class="modal-tit">🌿 Bienvenida de vuelta</h3>
    <p class="modal-sub">Estuviste fuera ${tiempoCorto(off.ms)}. Mientras tanto${partes.length ? ', ' + partes.join(' y ') : ' todo siguió creciendo'}.</p>
    <div class="modal-pie"><button class="btn btn-verde" data-cerrar>Seguir cultivando</button></div>`);
}

/* ============================================================
   10. AUDIO
   Todo sintetizado con WebAudio: no hace falta ningún archivo.
   ============================================================ */
const Audio2 = {
  ctx: null, maestro: null, canalMus: null, canalSfx: null,
  musTimer: null, paso: 0, listo: false,

  iniciar() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.maestro = this.ctx.createGain();
    this.maestro.gain.value = 1;
    this.maestro.connect(this.ctx.destination);
    this.canalMus = this.ctx.createGain();
    this.canalSfx = this.ctx.createGain();
    this.canalMus.connect(this.maestro);
    this.canalSfx.connect(this.maestro);
    this.aplicarVolumen();
    this.listo = true;
    this.musica();
  },
  aplicarVolumen() {
    if (!this.ctx || !E) return;
    this.canalMus.gain.value = E.ajustes.musica ? E.ajustes.volMusica * 0.5 : 0;
    this.canalSfx.gain.value = E.ajustes.sfx ? E.ajustes.volSfx : 0;
  },
  /** Nota simple con envolvente suave. */
  nota(freq, dur, tipo, gan, canal, retardo) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + (retardo || 0);
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = tipo || 'sine';
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gan === undefined ? 0.3 : gan, t + 0.014);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(canal || this.canalSfx);
    o.start(t); o.stop(t + dur + 0.05);
  },
  ruido(dur, gan, filtro) {
    if (!this.ctx) return;
    const n = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = this.ctx.createBufferSource();
    s.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = filtro || 1400; f.Q.value = 1.2;
    const g = this.ctx.createGain(); g.gain.value = gan === undefined ? 0.22 : gan;
    s.connect(f); f.connect(g); g.connect(this.canalSfx);
    s.start();
  },
  /** Bucle ambiental: arpegio lento en la escala de la estación. */
  musica() {
    if (this.musTimer) clearInterval(this.musTimer);
    const escalas = {
      primavera: [261.63, 293.66, 329.63, 392.00, 440.00],
      verano:    [293.66, 329.63, 369.99, 440.00, 493.88],
      otono:     [246.94, 277.18, 311.13, 369.99, 415.30],
      invierno:  [220.00, 261.63, 293.66, 329.63, 392.00],
    };
    this.musTimer = setInterval(() => {
      if (!this.ctx || !E || !E.ajustes.musica) return;
      if (document.hidden) return;
      const esc = escalas[ESTACIONES[E.mundo.estacion].id];
      const noche = esNoche();
      const base = esc[this.paso % esc.length];
      this.nota(base / 2, 3.4, 'sine', 0.16, this.canalMus, 0);
      this.nota(base, 2.2, 'triangle', 0.10, this.canalMus, 0.18);
      if (!noche) this.nota(esc[(this.paso + 2) % esc.length] * 2, 1.5, 'sine', 0.055, this.canalMus, 0.9);
      if (this.paso % 4 === 3) this.nota(esc[(this.paso + 1) % esc.length] * 2, 2.4, 'sine', 0.05, this.canalMus, 1.5);
      this.paso++;
    }, 2600);
  },
};
const SONIDOS = {
  tap:       () => Audio2.nota(660, 0.07, 'sine', 0.14),
  plantar:   () => { Audio2.nota(330, 0.13, 'triangle', 0.2); Audio2.nota(495, 0.16, 'sine', 0.12, null, 0.07); },
  agua:      () => Audio2.ruido(0.32, 0.12, 900),
  cosechar:  () => { [523, 659, 784].forEach((f, i) => Audio2.nota(f, 0.22, 'sine', 0.2, null, i * 0.06)); },
  moneda:    () => { Audio2.nota(988, 0.1, 'square', 0.1); Audio2.nota(1319, 0.16, 'sine', 0.12, null, 0.06); },
  compra:    () => { Audio2.nota(440, 0.1, 'triangle', 0.16); Audio2.nota(660, 0.14, 'triangle', 0.12, null, 0.08); },
  cruce:     () => { [392, 523, 659, 784].forEach((f, i) => Audio2.nota(f, 0.3, 'triangle', 0.14, null, i * 0.09)); },
  descubrir: () => { [523, 659, 784, 1047].forEach((f, i) => Audio2.nota(f, 0.4, 'sine', 0.18, null, i * 0.1)); },
  secreto:   () => { [523, 622, 784, 932, 1245].forEach((f, i) => Audio2.nota(f, 0.6, 'sine', 0.2, null, i * 0.12)); },
  logro:     () => { [659, 784, 988, 1319].forEach((f, i) => Audio2.nota(f, 0.5, 'triangle', 0.18, null, i * 0.11)); },
  nivel:     () => { [523, 659, 784, 1047, 1319].forEach((f, i) => Audio2.nota(f, 0.45, 'sine', 0.2, null, i * 0.08)); },
  investigar:() => { [440, 554, 659].forEach((f, i) => Audio2.nota(f, 0.35, 'sine', 0.16, null, i * 0.12)); },
  mision:    () => { [784, 988].forEach((f, i) => Audio2.nota(f, 0.3, 'triangle', 0.17, null, i * 0.1)); },
  limpiar:   () => Audio2.ruido(0.24, 0.14, 2400),
  evento:    () => { [330, 415, 494].forEach((f, i) => Audio2.nota(f, 0.5, 'sine', 0.15, null, i * 0.14)); },
  no:        () => Audio2.nota(150, 0.16, 'sawtooth', 0.1),
};
function sonido(id) {
  if (window.__silencio || !E || !E.ajustes.sfx || !Audio2.listo) return;
  const f = SONIDOS[id];
  if (f) try { f(); } catch (err) { /* audio no disponible */ }
}

/* ============================================================
   11. FONDO ANIMADO
   ============================================================ */
const Fondo = {
  lienzo: null, ctx: null, particulas: [], ancho: 0, alto: 0, ultimo: 0, nubes: [],

  iniciar() {
    this.lienzo = $('#lienzoClima');
    this.ctx = this.lienzo.getContext('2d');
    this.medir();
    window.addEventListener('resize', () => this.medir());
    this.crearNubes();
    this.crearHojas();
  },
  medir() {
    // Dibujar a 2× en un móvil es cuadruplicar píxeles para unas gotas de
    // lluvia: se recorta la resolución del lienzo, que no se nota y ahorra mucho.
    const d = Math.min(esMovil() ? 1.25 : 1.6, window.devicePixelRatio || 1);
    this.ancho = window.innerWidth; this.alto = window.innerHeight;
    this.lienzo.width = Math.round(this.ancho * d); this.lienzo.height = Math.round(this.alto * d);
    this.ctx.setTransform(d, 0, 0, d, 0, 0);
  },
  crearNubes() {
    const cont = $('#capaNubes');
    cont.innerHTML = '';
    this.nubes = [];
    for (let i = 0; i < 7; i++) {
      const el = document.createElement('div');
      el.className = 'nube';
      const esc = 0.5 + Math.random() * 1.1;
      el.innerHTML = `<svg width="${170 * esc}" height="${72 * esc}" viewBox="0 0 170 72">
        <path d="M28,58 Q4,58 8,42 Q10,28 28,30 Q32,10 56,14 Q72,0 92,12 Q116,6 124,26 Q150,24 152,44 Q154,60 132,58Z"/></svg>`;
      el.style.top = (4 + Math.random() * 34) + '%';
      el.style.opacity = 0.35 + Math.random() * 0.5;
      cont.appendChild(el);
      this.nubes.push({ el, x: Math.random() * 120 - 20, v: 0.0016 + Math.random() * 0.004, ancho: 170 * esc });
    }
  },
  crearHojas() {
    // Hojas sueltas del DOM: pocas y baratas, solo decorativas.
    const cont = $('#escena');
    for (let i = 0; i < 7; i++) {
      const el = document.createElement('div');
      el.className = 'hoja-viento';
      el.textContent = elige(['🍃', '🌿', '🍂']);
      el.style.left = Math.random() * 100 + '%';
      el.style.top = '-6%';
      cont.appendChild(el);
      this.hojas = this.hojas || [];
      this.hojas.push({ el, x: Math.random() * 100, y: Math.random() * 100, vy: 0.006 + Math.random() * 0.012, f: Math.random() * 6.28 });
    }
  },
  paso(dt) {
    if (!E) return;
    // Nubes
    const viento = E.mundo.clima === 'viento' || E.mundo.clima === 'tormenta' ? 3.2 : 1;
    this.nubes.forEach(n => {
      n.x += n.v * dt * viento * 0.06;
      if (n.x > 118) n.x = -18;
      n.el.style.transform = `translateX(${n.x}vw)`;
    });
    // Hojas
    (this.hojas || []).forEach(h => {
      h.f += dt * 0.001;
      h.y += h.vy * dt * 0.06 * viento;
      h.x += Math.sin(h.f) * 0.05 * viento;
      if (h.y > 104) { h.y = -6; h.x = Math.random() * 100; }
      h.el.style.transform = `translate(${Math.sin(h.f) * 22}px,0) rotate(${h.f * 40}deg)`;
      h.el.style.left = h.x + '%';
      h.el.style.top = h.y + '%';
      h.el.style.opacity = E.ajustes.particulas ? (E.mundo.estacion === 2 ? .85 : .5) : 0;
    });
    this.clima(dt);
  },
  clima(dt) {
    const c = this.ctx;
    c.clearRect(0, 0, this.ancho, this.alto);
    if (!E.ajustes.particulas || E.ajustes.ahorro) { this.particulas.length = 0; return; }
    const cl = E.mundo.clima;
    let objetivo = cl === 'lluvia' ? 140 : cl === 'tormenta' ? 240 : cl === 'nieve' ? 110 :
                   cl === 'niebla' ? 26 : cl === 'viento' ? 30 : E.mundo.estacion === 0 ? 26 : 0;
    if (esMovil()) objetivo = Math.round(objetivo * 0.4);
    // Ajusta la cantidad de partículas poco a poco
    while (this.particulas.length < objetivo) this.particulas.push(this.nueva(cl));
    while (this.particulas.length > objetivo) this.particulas.pop();
    const noche = esNoche();
    this.particulas.forEach(p => {
      p.y += p.vy * dt * 0.06;
      p.x += p.vx * dt * 0.06;
      if (p.y > this.alto + 20) { p.y = -20; p.x = Math.random() * this.ancho; }
      if (p.x > this.ancho + 20) p.x = -20;
      if (p.x < -20) p.x = this.ancho + 20;
      c.globalAlpha = p.a * (noche ? 0.6 : 1);
      if (p.tipo === 'lluvia') {
        c.strokeStyle = noche ? '#9fb6cc' : '#c8dcea';
        c.lineWidth = p.t;
        c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - p.vx * 3, p.y - p.vy * 3.4); c.stroke();
      } else if (p.tipo === 'nieve') {
        c.fillStyle = '#ffffff';
        c.beginPath(); c.arc(p.x, p.y, p.t, 0, 6.283); c.fill();
      } else if (p.tipo === 'niebla') {
        c.fillStyle = noche ? 'rgba(190,200,215,.5)' : 'rgba(255,255,255,.6)';
        c.beginPath(); c.arc(p.x, p.y, p.t, 0, 6.283); c.fill();
      } else {
        c.fillStyle = p.color;
        c.beginPath(); c.ellipse(p.x, p.y, p.t, p.t * 0.6, p.f += 0.02, 0, 6.283); c.fill();
      }
    });
    c.globalAlpha = 1;
  },
  nueva(cl) {
    const base = { x: Math.random() * this.ancho, y: Math.random() * this.alto, f: 0 };
    if (cl === 'lluvia' || cl === 'tormenta') {
      return Object.assign(base, { tipo: 'lluvia', vy: 13 + Math.random() * 9, vx: -1.6 - Math.random() * 1.6, t: 0.9 + Math.random(), a: .35 + Math.random() * .3 });
    }
    if (cl === 'nieve') {
      return Object.assign(base, { tipo: 'nieve', vy: 1 + Math.random() * 1.4, vx: (Math.random() - .5) * 1.2, t: 1.2 + Math.random() * 2.2, a: .55 + Math.random() * .4 });
    }
    if (cl === 'niebla') {
      return Object.assign(base, { tipo: 'niebla', vy: (Math.random() - .5) * .2, vx: .35 + Math.random() * .5, t: 30 + Math.random() * 70, a: .06 + Math.random() * .08 });
    }
    const petalos = ['#f2bfc6', '#f5c9a8', '#efd79b', '#c9bde8', '#ffffff'];
    return Object.assign(base, { tipo: 'petalo', vy: .6 + Math.random() * 1.1, vx: .5 + Math.random() * 1.4, t: 2.4 + Math.random() * 2.6, a: .45 + Math.random() * .35, color: elige(petalos) });
  },
};

/** Cielo, sol/luna y colinas según hora y estación. */
function aplicarAmbiente(forzar) {
  if (!E || window.__silencio) return;
  const est = ESTACIONES[E.mundo.estacion];
  const franja = franjaDia();
  const noche = franja === 'noche';
  const claro = E.ajustes.tema === 'claro';
  const oscuro = E.ajustes.tema === 'oscuro';
  document.body.classList.toggle('noche', oscuro || (noche && !claro));
  const cielo = $('#cielo');
  let grad;
  if (noche && !claro) grad = ['#1e2740', '#2b3550', '#3d4358'];
  else if (franja === 'amanecer') grad = ['#f7c9a8', '#f9dfc4', est.cielo[2]];
  else if (franja === 'atardecer') grad = ['#f0a97f', '#f6c9a4', est.cielo[2]];
  else grad = est.cielo;
  cielo.style.background = `linear-gradient(180deg,${grad[0]} 0%,${grad[1]} 42%,${grad[2]} 100%)`;
  $$('.colina').forEach((el, i) => {
    const p = $('path', el);
    if (p && !noche) p.style.fill = est.colinas[i];
    else if (p) p.style.fill = '';
  });
  // Sol o luna recorriendo el cielo
  const h = horaDelDia();
  const astro = $('#astro');
  const arco = noche ? lim((h < 5.5 ? h + 24 : h) - 20, 0, 9.5) / 9.5 : lim((h - 5.5) / 14.5, 0, 1);
  astro.style.left = (6 + arco * 80) + '%';
  astro.style.top = (34 - Math.sin(arco * Math.PI) * 26) + '%';
  astro.style.background = noche
    ? 'radial-gradient(circle at 42% 38%,#fdfbf0,#e3e6ef 46%,rgba(227,230,239,0) 72%)'
    : franja === 'amanecer' || franja === 'atardecer'
      ? 'radial-gradient(circle at 42% 38%,#fff1cd,#f6b075 48%,rgba(246,176,117,0) 74%)'
      : 'radial-gradient(circle at 42% 38%,#fff6d8,#f7dc95 46%,rgba(247,220,149,0) 72%)';
  astro.style.width = astro.style.height = noche ? '80px' : '120px';
  $('#rayos').style.opacity = noche || E.mundo.clima === 'nublado' || E.mundo.clima === 'lluvia' ? 0 : '';
  if (forzar) Fondo.crearNubes();
}

/* ============================================================
   12. NUBE: marcador compartido y respaldo
   Cada persona tiene SU invernadero: el estado completo vive en el
   localStorage de su aparato y no se mezcla nunca con el del otro. A Neon
   solo suben dos cosas, siempre bajo `datos.invernadero` y separadas por
   persona:
     · marcador → un resumen chico para picarse
     · respaldo → una copia del guardado, por si se pierde el teléfono
   El API mezcla por clave de primer nivel, así que escribir aquí no toca
   fotos, cartas ni notas.
   ============================================================ */
const PERSONAS = ['Catalina', 'Diego'];

/* Quién juega en ESTE aparato. Va en localStorage con la misma clave que usa
   la clínica, no en el estado compartido. */
function quien() {
  try { return localStorage.getItem('rinconQuien') || null; } catch (e) { return null; }
}
/**
 * Cambia de perfil. Cambiar de persona cambia de invernadero: se guarda el
 * actual bajo su dueño y se carga (o se estrena) el de la otra. Nunca se
 * hereda el progreso del otro, que era justo el error de la versión anterior.
 */
function fijarQuien(q) {
  const antes = quien();
  if (antes === q) { cerrarModal(); return; }
  if (E && antes) guardar(true);

  // Si estabas jugando sin decir quién eras, ese invernadero pasa a ser tuyo
  // en vez de quedar huérfano bajo «invitado».
  const adopta = !antes && E && progresoDe(E) > 25 && !tienePartida(q);
  try { localStorage.setItem('rinconQuien', q); } catch (e) { /* modo privado */ }
  if (adopta) {
    E.duenio = q;
    guardar(true);
    try { localStorage.removeItem(claveDe(null)); localStorage.removeItem(claveCopiaDe(null)); } catch (e) {}
    log(`Este invernadero pasa a ser de <b>${q}</b>.`, 'evento');
    cerrarModal();
    Nube.arrancar();
    pintarTodo();
    return;
  }

  if (E) {
    const estrena = !tienePartida(q);
    E = cargar(q);
    E.duenio = q;
    limpiarCachesDePartida();
    sel = null;
    lab.a = lab.b = null; lab.ultimo = null;
    Nube.lista = false; Nube.remoto = null; Nube.ultimoMarcador = 0; Nube.ultimoRespaldo = 0; Nube.firma = '';
    guardar(true);
    log(`Ahora juega <b>${q}</b>${estrena ? ' — invernadero nuevo' : ''}.`, 'evento');
    aviso(q === 'Catalina' ? '🌷' : '🌿', 'Hola, ' + q,
      estrena ? 'Este es tu invernadero, empieza de cero.' : 'Cargamos tu invernadero.', 'oro');
    pintarParcelas();
  }
  cerrarModal();
  Nube.arrancar();
  pintarTodo();
}

/** Borra por completo el invernadero de una persona, aquí y en la nube. */
function reiniciarPersona(persona) {
  confirmar('Reiniciar el invernadero de ' + persona,
    `Se borra la partida de <b>${persona}</b> en este aparato y su marcador y respaldo en la nube. ` +
    `No se toca la del otro. Esto no tiene vuelta atrás.`, async () => {
    try {
      localStorage.removeItem(claveDe(persona));
      localStorage.removeItem(claveCopiaDe(persona));
    } catch (e) { /* nada que borrar */ }
    try {
      if (!Nube.lista) await Nube.leer();
      await Nube.escribir(r => { delete r.marcador[persona]; delete r.respaldo[persona]; });
    } catch (e) {
      aviso('⚠️', 'La nube no respondió', 'Se borró aquí; la nube se limpia sola al volver la conexión.', 'malo');
    }
    if (quien() === persona) {
      E = estadoNuevo();
      E.duenio = persona;
      limpiarCachesDePartida(); sel = null;
      Nube.ultimoMarcador = 0; Nube.ultimoRespaldo = 0; Nube.firma = '';
      guardar(true);
      log(`Invernadero de <b>${persona}</b> reiniciado.`, 'evento');
      pintarParcelas();
    }
    aviso('🧹', 'Listo', 'El invernadero de ' + persona + ' quedó en cero.');
    pintarTodo();
  });
}

/** Puntuación bruta de una partida, para comparar cuál va más avanzada. */
function progresoDe(estado) {
  if (!estado) return 0;
  const s = estado.stats || {};
  return (s.cosechas || 0) + (s.cruces || 0) * 2 +
         Object.keys(estado.herbario || {}).length * 12 + (estado.nivel || 1) * 25;
}
/** La especie más rara del herbario, para lucirla en el marcador. */
function mejorEspecie(estado) {
  const ids = Object.keys((estado || {}).herbario || {});
  let mejor = null, rango = -1;
  ids.forEach(id => {
    let f;
    try { f = fenotipoDeEspecie(id); } catch (e) { return; }
    const r = RAREZAS.findIndex(x => x.id === f.rareza);
    if (r > rango) { rango = r; mejor = { nombre: f.nombre, rareza: f.rareza, emo: f.emo }; }
  });
  return mejor;
}
function resumenPropio() {
  return {
    nivel: E.nivel,
    herbario: Object.keys(E.herbario).length,
    secretos: Object.keys(E.herbario).filter(k => k.startsWith('sec-')).length,
    cosechas: E.stats.cosechas || 0,
    cruces: E.stats.cruces || 0,
    oro: Math.round(E.stats.oroGanado || 0),
    logros: Object.keys(E.logros).length,
    dia: E.mundo.dia,
    parcelas: parcelasAbiertas(),
    esporas: E.esporas || 0,
    trasplantes: E.trasplantes || 0,
    concurso: (E.concurso && E.concurso.semana === semanaClave()) ? E.concurso : null,
    mejor: mejorEspecie(E),
    puntos: progresoDe(E),
    t: Date.now(),
  };
}
/** Copia para la nube. La bitácora no es progreso, así que no viaja. */
function paqueteRespaldo() {
  const copia = Object.assign({}, E);
  delete copia.registro;
  return { t: Date.now(), v: JUEGO.version, save: copia };
}

const Nube = {
  lista: false,          // ya respondió una lectura: hasta entonces no se escribe
  remoto: null,
  estado: 'apagada',     // apagada | leyendo | ok | error | sinPersona
  ultimoMarcador: 0,
  ultimoRespaldo: 0,
  firma: '',
  enVuelo: false,

  async leer() {
    const r = await fetch(JUEGO.api, { cache: 'no-store' });
    if (!r.ok) throw new Error('respuesta ' + r.status);
    const j = await r.json();
    const d = (j && j.data) || {};
    const inv = (d.invernadero && typeof d.invernadero === 'object' && !Array.isArray(d.invernadero))
      ? d.invernadero : {};
    if (!inv.marcador || typeof inv.marcador !== 'object') inv.marcador = {};
    if (!inv.respaldo || typeof inv.respaldo !== 'object') inv.respaldo = {};
    this.remoto = inv;
    this.lista = true;
    return inv;
  },

  /** Relee justo antes de escribir para no pisar lo que subió el otro. */
  async escribir(mutar) {
    if (!this.lista) return false;
    await this.leer();
    mutar(this.remoto);
    const r = await fetch(JUEGO.api, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: { invernadero: this.remoto } }),
    });
    if (!r.ok) throw new Error('POST ' + r.status);
    return true;
  },

  async sincronizar(forzar) {
    const q = quien();
    if (!q) { this.estado = 'sinPersona'; return; }
    if (!this.lista || this.enVuelo || !E) return;
    const ahora = Date.now();
    const firma = [E.stats.cosechas || 0, E.stats.cruces || 0, Object.keys(E.herbario).length,
                   E.nivel, Math.round(E.oro)].join('|');
    const tocaMarcador = forzar || ahora - this.ultimoMarcador > JUEGO.marcadorCada;
    const tocaRespaldo = (forzar || ahora - this.ultimoRespaldo > JUEGO.respaldoCada) && firma !== this.firma;
    if (!tocaMarcador && !tocaRespaldo) return;

    // Salvaguarda: una partida recién empezada nunca pisa un respaldo con
    // progreso. Es la misma lección del borrado del 29-jun-2026.
    const mio = progresoDe(E);
    const guardado = this.remoto.respaldo[q];
    const subirRespaldo = tocaRespaldo &&
      !(mio < 60 && guardado && guardado.save && progresoDe(guardado.save) > mio);

    this.enVuelo = true;
    try {
      const paquete = subirRespaldo ? paqueteRespaldo() : null;
      const resumen = resumenPropio();
      await this.escribir(r => {
        r.marcador[q] = resumen;
        if (paquete) r.respaldo[q] = paquete;
      });
      this.ultimoMarcador = ahora;
      if (subirRespaldo) { this.ultimoRespaldo = ahora; this.firma = firma; }
      this.estado = 'ok';
    } catch (e) {
      this.estado = 'error';
    } finally {
      this.enVuelo = false;
    }
  },

  /** Lectura inicial: ofrece restaurar si en la nube hay más progreso. */
  async arrancar() {
    const q = quien();
    if (!q) { this.estado = 'sinPersona'; return; }
    this.estado = 'leyendo';
    pintarVista();
    try { await this.leer(); }
    catch (e) { this.estado = 'error'; pintarVista(); return; }
    this.estado = 'ok';
    const copia = this.remoto.respaldo[q];
    const aqui = progresoDe(E);
    const alla = copia && copia.save ? progresoDe(copia.save) : 0;
    if (copia && copia.save && alla > aqui) modalRestaurar(copia, aqui, alla);
    else this.sincronizar(true);
    pintarVista();
  },
};

function modalRestaurar(copia, aqui, alla) {
  const s = copia.save;
  const fecha = new Date(copia.t).toLocaleString('es-CL');
  const fila = (etq, a, b) => `<div class="det-fila"><span>${etq}</span><b>${a} → ${b}</b></div>`;
  modal(`<h3 class="modal-tit">☁️ Hay un invernadero guardado</h3>
    <p class="modal-sub">En la nube quedó una partida tuya <b>más avanzada</b> que la de este aparato,
    del ${fecha}. Nada se borra hasta que tú decidas.</p>
    <div class="tarjeta">
      <div class="tarjeta-tit">Aquí → en la nube</div>
      ${fila('Nivel', E.nivel, s.nivel || 1)}
      ${fila('Herbario', Object.keys(E.herbario).length, Object.keys(s.herbario || {}).length)}
      ${fila('Cosechas', num(E.stats.cosechas || 0), num((s.stats || {}).cosechas || 0))}
      ${fila('Cruces', num(E.stats.cruces || 0), num((s.stats || {}).cruces || 0))}
      ${fila('Monedas', monedas(E.oro), monedas(s.oro || 0))}
      ${fila('Puntos de avance', num(aqui), num(alla))}
    </div>
    <div class="modal-pie">
      <button class="btn btn-suave" data-cerrar>Seguir con esta</button>
      <button class="btn btn-verde" id="btnRestaurarNube">☁️ Traer la de la nube</button>
    </div>`);
  $('#btnRestaurarNube').onclick = () => {
    // El estado de este aparato se aparta antes de reemplazarlo.
    try { localStorage.setItem(claveCopiaDe(quien()), JSON.stringify(E)); } catch (e) { /* sin sitio */ }
    const nuevo = revivir(s);
    if (!nuevo) { aviso('⚠️', 'No se pudo restaurar', 'El respaldo llegó dañado.', 'malo'); return; }
    E = nuevo;
    E.registro = E.registro || [];
    guardar(true);
    cerrarModal();
    limpiarCachesDePartida();
    log('Restauraste tu invernadero desde la nube.', 'evento');
    aviso('☁️', 'Invernadero restaurado', 'Todo volvió a como estaba.', 'oro');
    pintarParcelas(); pintarTodo();
    confeti();
  };
}

function modalQuien(alCerrar) {
  modal(`<h3 class="modal-tit">¿Quién cultiva en este aparato?</h3>
    <p class="modal-sub">Cada uno tiene su propio invernadero: no se mezclan.
    Esto sirve para el <b>marcador compartido</b> y para guardar un respaldo tuyo en la nube.</p>
    <div class="rejilla c2">
      ${PERSONAS.map(p => `<div class="mini-tarjeta" data-quien="${p}">
        <span class="mt-emo">${p === 'Catalina' ? '🌷' : '🌿'}</span>
        <span class="mt-nom">${p}</span></div>`).join('')}
    </div>
    <div class="modal-pie"><button class="btn btn-suave" data-cerrar>Ahora no</button></div>`);
}

/* ============================================================
   13. INTERACCIÓN Y ARRANQUE
   ============================================================ */
function pintarTodo() {
  pintarTop();
  pintarInventario();
  pintarDetalle();
  pintarVista();
  pintarRegistro();
  if (vistaActual !== 'invernadero') pintarParcelas();
}

function seleccionar(s) {
  sel = s;
  pintarInventario();
  pintarDetalle();
  refrescarParcelas();
}

/* ---------- Delegación de clics ---------- */
function alPulsar(e) {
  const t = e.target;
  const d = (attr) => { const el = t.closest('[' + attr + ']'); return el ? el.getAttribute(attr) : null; };
  const el = (attr) => t.closest('[' + attr + ']');
  Audio2.iniciar();

  if (el('data-cerrar')) { cerrarModal(); if (!el('data-ir')) return; }

  let v;
  if ((v = d('data-ir')) !== null) { irVista(v); return; }

  // --- Invernadero
  if ((v = d('data-parcela')) !== null) {
    const idx = +v;
    const p = E.parcelas[idx];
    if (!p.planta && sel && sel.tipo === 'semilla') { plantar(idx, sel.cod); if (!E.semillas.find(s => s.cod === sel.cod)) sel = null; pintarInventario(); pintarDetalle(); return; }
    if (!p.planta) { seleccionar({ tipo: 'parcela', idx }); modalElegirSemilla(idx); return; }
    if (p.planta.prog >= 1) { seleccionar({ tipo: 'parcela', idx }); cosechar(idx); pintarTodo(); return; }
    seleccionar({ tipo: 'parcela', idx });
    return;
  }
  if ((v = d('data-abrir')) !== null) { ampliarInvernadero(); return; }
  if ((v = d('data-sembrar')) !== null) { modalElegirSemilla(+v); return; }
  if ((v = d('data-regar')) !== null) { regar(+v); refrescarParcelas(); pintarDetalle(); return; }
  if ((v = d('data-cosechar')) !== null) { cosechar(+v); pintarTodo(); return; }
  if ((v = d('data-curar')) !== null) { curarPlaga(+v); return; }
  if ((v = d('data-arrancar')) !== null) {
    const i = +v;
    confirmar('Arrancar la planta', 'Se pierde sin dar flor ni semillas.', () => {
      E.parcelas[i].planta = null; E.parcelas[i].plaga = 0; E.parcelas[i].fijada = null;
      tocar(); pintarTodo();
    });
    return;
  }
  // Cambiar lo que crece en una parcela: si está madura se cosecha antes, y
  // se suelta la variedad fijada para que la resiembra no vuelva a ponerla.
  if ((v = d('data-bioma')) !== null) { modalBiomas(+v); return; }
  if ((v = d('data-bioma-parcela')) !== null) {
    const idx = +el('data-bioma-parcela').getAttribute('data-idx');
    if (!biomaAbierto(v)) comprarBioma(v);
    else cambiarBiomaParcela(idx, v);
    return;
  }
  if ((v = d('data-cambiar')) !== null) {
    const i = +v, p = E.parcelas[i];
    const cambiar = () => { p.fijada = null; p.planta = null; p.plaga = 0; tocar(); modalElegirSemilla(i); };
    if (p.planta && p.planta.prog >= 1) { cosechar(i, true); p.fijada = null; pintarTodo(); modalElegirSemilla(i); }
    else if (p.planta) confirmar('Cambiar la variedad', 'La planta que hay ahora se pierde, todavía no está en flor.', cambiar);
    else { p.fijada = null; modalElegirSemilla(i); }
    return;
  }
  if ((v = d('data-elegir-sem')) !== null) {
    const destino = +el('data-elegir-sem').getAttribute('data-parcela-destino');
    cerrarModal(); plantar(destino, v); pintarTodo(); return;
  }

  // --- Inventario
  if ((v = d('data-sem')) !== null) { seleccionar({ tipo: 'semilla', cod: v }); sonido('tap'); return; }
  if ((v = d('data-flor')) !== null) { seleccionar({ tipo: 'flor', cod: v }); sonido('tap'); return; }
  if ((v = d('data-esp')) !== null) { seleccionar({ tipo: 'especie', id: v }); sonido('tap'); return; }
  if ((v = d('data-esp-ver')) !== null) { seleccionar({ tipo: 'especie', id: v }); abrirPanelMovil('der'); return; }
  if ((v = d('data-plantar-sel')) !== null) {
    const libre = E.parcelas.find(p => p.abierta && !p.planta);
    if (!libre) { aviso('🪴', 'Sin parcelas libres', 'Cosecha o amplía el invernadero.', 'malo'); return; }
    plantar(libre.i, v); pintarTodo(); return;
  }
  if ((v = d('data-tirar')) !== null) { quitarSemilla(v); if (!E.semillas.find(s => s.cod === v)) sel = null; pintarTodo(); return; }

  // --- Ventas
  if ((v = d('data-vender')) !== null) { vender(v, 1); return; }
  if ((v = d('data-vender-todo')) !== null) { const st = E.flores.find(s => s.cod === v); if (st) vender(v, st.n); return; }
  if ((v = d('data-vender-sem')) !== null) { venderSemillas(v, 1); return; }
  if ((v = d('data-vender-sem-todo')) !== null) { const st = E.semillas.find(s => s.cod === v); if (st) venderSemillas(v, st.n); return; }
  if ((v = d('data-vender-rap')) !== null) {
    if (v === 'todo') confirmar('Vender todo', 'Se venden todas las flores cortadas, incluidas las raras.', () => venderTodoDe(null));
    else venderTodoDe(v.split(','));
    return;
  }
  if (el('data-vender-sem-rap')) {
    confirmar('Despejar el almacén', 'Se venden las semillas comunes y poco comunes, dejando tres de cada una.', () => {
      const t = venderSemillasSobrantes(['comun', 'poco'], 3);
      if (!t) aviso('🌱', 'Nada que despejar', 'No sobran semillas corrientes.');
      else { sonido('moneda'); flotar('+' + monedas(t) + ' 🪙', '#b08c3c'); }
      pintarTodo();
    });
    return;
  }
  if ((v = d('data-comprar-sem')) !== null) { comprarSemilla(v, e.shiftKey ? 10 : 1); return; }

  // --- Laboratorio
  if ((v = d('data-lab')) !== null) { lab[lab.a ? 'b' : 'a'] = v; irVista('laboratorio'); return; }
  if ((v = d('data-ranura')) !== null) { modalElegirFlor(v); return; }
  if ((v = d('data-elegir-flor')) !== null) { lab[el('data-elegir-flor').getAttribute('data-lado')] = v; cerrarModal(); pintarVista(); return; }
  if ((v = d('data-lab-elegir')) !== null) { lab[lab.a ? (lab.b ? 'a' : 'b') : 'a'] = v; pintarVista(); return; }
  if (el('data-lab-limpiar')) { lab.a = lab.b = null; lab.ultimo = null; pintarVista(); return; }
  if (el('data-cruzar')) {
    const fz = lab.forzar && lab.forzar.locus ? lab.forzar : null;
    const r = cruzar(lab.a, lab.b, fz);
    if (r) { lab.ultimo = r; lab.a = lab.b = null; }
    pintarTodo();
    return;
  }

  // --- Investigación, equipo, misiones, decoración
  if ((v = d('data-invest')) !== null) { comprarInvestigacion(v); return; }
  if ((v = d('data-contratar')) !== null) { contratar(v); return; }
  if ((v = d('data-animar')) !== null) { animarEmpleado(v); return; }
  if ((v = d('data-entrenar')) !== null) { entrenarEmpleado(v); return; }
  if ((v = d('data-despedir')) !== null) { despedir(v); return; }
  if ((v = d('data-deco')) !== null) { comprarDeco(v); return; }
  if ((v = d('data-mision')) !== null) {
    const m = [...E.misiones.diarias, ...E.misiones.semanales, ...MISIONES_FIJAS].find(x => x.id === v);
    if (m) cobrarMision(m);
    return;
  }

  // --- Ajustes
  if ((v = d('data-toggle')) !== null) {
    E.ajustes[v] = !E.ajustes[v];
    el('data-toggle').classList.toggle('on', E.ajustes[v]);
    Audio2.aplicarVolumen();
    if (v === 'musica' && E.ajustes.musica) Audio2.musica();
    if (v === 'ahorro') { document.body.classList.toggle('ahorro', E.ajustes.ahorro); Fondo.medir(); }
    tocar(); actualizarBotonSonido();
    return;
  }
  // --- Encargos, injertos, concurso y crisis
  if ((v = d('data-crisis')) !== null) { resolverCrisis(+v); return; }
  if (el('data-ver-crisis')) { modalCrisis(); return; }
  if ((v = d('data-injertar')) !== null) { modalInjerto(v); return; }
  if ((v = d('data-injerto')) !== null) {
    const b = el('data-injerto');
    injertar(v, b.getAttribute('data-locus'), b.getAttribute('data-alelo'));
    return;
  }
  if ((v = d('data-concurso')) !== null) { presentarAlConcurso(v); return; }

  // --- Legado
  if ((v = d('data-perm')) !== null) { comprarPerm(v); return; }
  if (el('data-trasplantar')) { pedirTrasplante(); return; }

  // --- Nube y marcador
  if ((v = d('data-quien')) !== null) { fijarQuien(v); return; }
  if (el('data-elegir-quien')) { modalQuien(); return; }
  if (el('data-sync')) {
    if (!quien()) { modalQuien(); return; }
    aviso('🔄', 'Sincronizando', 'Subiendo tu marcador y bajando el del otro.');
    Nube.arrancar().then(() => pintarVista());
    return;
  }
  if (el('data-exportar')) { exportarPartida(); return; }
  if (el('data-importar')) { modalImportar(); return; }
  if (el('data-ayuda')) { modalAyuda(); return; }
  if (el('data-borrar')) {
    reiniciarPersona(quien() || 'invitado');
    return;
  }
  if ((v = d('data-reiniciar')) !== null) { reiniciarPersona(v); return; }
}

function abrirPanelMovil(cual) {
  if (window.innerWidth > 920) return;
  document.body.classList.remove('movil-izq', 'movil-der', 'movil-log');
  if (cual !== 'centro') document.body.classList.add('movil-' + cual);
  $$('#navMovil button').forEach(b => b.classList.toggle('activa', b.dataset.movil === cual));
}
function actualizarBotonSonido() {
  const on = E.ajustes.musica || E.ajustes.sfx;
  $('#btnSonido').textContent = on ? '🔊' : '🔇';
}

/* ---------- Enlaces de la interfaz ---------- */
function conectarUI() {
  document.addEventListener('click', alPulsar);

  $$('#navVistas .nav-btn').forEach(b => b.onclick = () => irVista(b.dataset.vista));
  $$('.ptab').forEach(b => b.onclick = () => {
    tabInv = b.dataset.inv;
    $$('.ptab').forEach(x => x.classList.toggle('activa', x === b));
    pintarInventario();
    sonido('tap');
  });
  $('#buscaInv').addEventListener('input', pintarInventario);
  $('#ordenInv').addEventListener('change', pintarInventario);

  $('#btnRegarTodo').onclick = regarTodo;
  $('#btnCosecharTodo').onclick = cosecharTodo;
  $('#btnDespejar').onclick = despejarAMano;
  $('#btnAmpliar').onclick = ampliarInvernadero;
  $('#btnAjustes').onclick = modalAjustes;
  $('#btnMenuMovil').onclick = modalAjustes;
  $('#btnSonido').onclick = () => {
    Audio2.iniciar();
    const on = E.ajustes.musica || E.ajustes.sfx;
    E.ajustes.musica = E.ajustes.sfx = !on;
    Audio2.aplicarVolumen();
    actualizarBotonSonido();
    tocar();
  };
  $('#btnInicio').onclick = () => {
    guardar(true);
    location.href = '../../index.html';
  };

  $('#regToggle').onclick = () => { document.body.classList.toggle('log-cerrado'); };
  $$('#regFiltros .rf').forEach(b => b.onclick = () => {
    filtroReg = b.dataset.f;
    $$('#regFiltros .rf').forEach(x => x.classList.toggle('activa', x === b));
    pintarRegistro();
  });
  $$('#navMovil button').forEach(b => b.onclick = () => abrirPanelMovil(b.dataset.movil));

  $('#modalFondo').addEventListener('click', ev => { if (ev.target.id === 'modalFondo') cerrarModal(); });

  // Cambios en controles que no son botones
  document.addEventListener('change', ev => {
    const t = ev.target;
    if (t.id === 'herbTexto' || t.id === 'herbRareza' || t.id === 'herbForma' || t.id === 'herbEstado' || t.id === 'herbRasgo') {
      filtroHerb = {
        texto: ($('#herbTexto') || {}).value || '',
        rareza: ($('#herbRareza') || {}).value || '',
        forma: ($('#herbForma') || {}).value || '',
        estado: ($('#herbEstado') || {}).value || '',
        rasgo: ($('#herbRasgo') || {}).value || '',
      };
      pintarVista();
      const c = $('#herbTexto'); if (c) { c.focus(); c.selectionStart = c.value.length; }
    }
    if (t.id === 'selTema') { E.ajustes.tema = t.value; tocar(); aplicarAmbiente(); }
    if (t.id === 'forzarLocus') {
      lab.forzar = t.value ? { locus: t.value, alelo: LOCUS[t.value].alelos[0] } : null;
      pintarVista();
    }
    if (t.id === 'forzarAlelo' && lab.forzar) lab.forzar.alelo = t.value;
    if (t.dataset && t.dataset.vol) {
      E.ajustes['vol' + may(t.dataset.vol)] = t.value / 100;
      Audio2.aplicarVolumen();
      tocar();
    }
  });
  document.addEventListener('input', ev => {
    const t = ev.target;
    if (t.id === 'herbTexto') {
      filtroHerb.texto = t.value;
      clearTimeout(t._tm);
      t._tm = setTimeout(() => { pintarVista(); const c = $('#herbTexto'); if (c) { c.focus(); c.selectionStart = c.value.length; } }, 260);
    }
    if (t.dataset && t.dataset.vol) {
      E.ajustes['vol' + may(t.dataset.vol)] = t.value / 100;
      Audio2.aplicarVolumen();
    }
  });

  // Tooltips
  document.addEventListener('mouseover', ev => {
    const el = ev.target.closest('[data-tip]');
    if (el) mostrarTip(el); else ocultarTip();
  });
  document.addEventListener('mouseout', ev => { if (ev.target.closest('[data-tip]')) ocultarTip(); });
  window.addEventListener('scroll', ocultarTip, true);

  // Atajos de teclado
  document.addEventListener('keydown', ev => {
    if (ev.target.matches('input,textarea,select')) return;
    const k = ev.key.toLowerCase();
    if (k === 'escape') { cerrarModal(); sel = null; pintarDetalle(); pintarInventario(); }
    if (k === 'r') regarTodo();
    if (k === 'c') cosecharTodo();
    if (k === 'l') irVista('laboratorio');
    if (k === 'm') irVista('mercado');
    if (k === 'i') irVista('invernadero');
    if (k === 'h') irVista('enciclopedia');
    if (k === 'g') { guardar(true); aviso('💾', 'Guardado', 'Tu invernadero está a salvo.'); }
    if (k >= '1' && k <= '9') {
      const b = $$('#navVistas .nav-btn')[+k - 1];
      if (b) irVista(b.dataset.vista);
    }
  });

  window.addEventListener('beforeunload', () => guardar(true));
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) return;
    guardar(true);
    // Al salir o cambiar de pestaña se aprovecha para dejar el respaldo al día.
    Nube.sincronizar(true);
  });
}

/* ---------- Bucle principal ---------- */
let ultimoReal = 0, acumUI = 0, acumGuardado = 0, acumLogros = 0, acumAmbiente = 0, acumNube = 0;
/* El bucle no necesita 60 fps: es un juego de plantas que crecen en minutos.
   Limitarlo baja muchísimo el trabajo de GPU y el calentamiento del teléfono. */
function fpsObjetivo() {
  if (!E || E.ajustes.ahorro) return 12;
  return esMovil() ? 24 : 40;
}
function bucle() {
  requestAnimationFrame(bucle);
  const ahora = Date.now();
  if (!ultimoReal) ultimoReal = ahora;
  let dt = ahora - ultimoReal;
  if (!E) { ultimoReal = ahora; return; }
  // Ojo con el orden: si la pestaña está oculta hay que salir SIN mover
  // `ultimoReal`, para que el tiempo se acumule y se recupere al volver.
  // Descontarlo aquí era tirar a la basura todo lo ocurrido en segundo plano.
  if (document.hidden) return;
  // Fotograma saltado: se acumula el tiempo y se sale sin tocar el DOM.
  if (dt < 1000 / fpsObjetivo()) return;
  ultimoReal = ahora;

  // Si la pestaña estuvo dormida, se pone al día de golpe y en silencio
  // en vez de perder ese tiempo: el reloj del mundo es real, no de frames.
  if (dt > 4000) {
    simularOffline(dt);
    dt = 0;
    pintarTodo();
  }

  if (dt > 0) motorTick(dt);
  Fondo.paso(Math.min(dt, 90));

  acumUI += dt;
  if (acumUI > (esMovil() ? 420 : 250)) {
    acumUI = 0;
    pintarTop();
    if (vistaActual === 'invernadero') refrescarParcelas();
    if (sel && sel.tipo === 'parcela') pintarDetalle();
  }
  acumAmbiente += dt;
  if (acumAmbiente > 2500) { acumAmbiente = 0; aplicarAmbiente(); }
  acumLogros += dt;
  if (acumLogros > 2500) { acumLogros = 0; revisarLogros(); }
  acumGuardado += dt;
  if (acumGuardado > JUEGO.guardadoCada) { acumGuardado = 0; guardar(); }
  acumNube += dt;
  if (acumNube > 30000) { acumNube = 0; Nube.sincronizar(); }
}

/* ---------- Arranque ---------- */
function arrancar() {
  E = cargar(quien());
  const fuera = Date.now() - (E.t || Date.now());
  refrescarMisiones();
  const off = simularOffline(fuera);
  E.stats.parcelas = parcelasAbiertas();
  E.stats.nivel = E.nivel;
  E.stats.empleados = E.empleados.length;
  E.stats.decoraciones = E.deco.length;
  E.stats.investigaciones = E.invest.length;
  E.stats.especies = Object.keys(E.herbario).filter(k => !k.startsWith('sec-')).length;
  E.stats.secretos = Object.keys(E.herbario).filter(k => k.startsWith('sec-')).length;

  document.body.classList.toggle('ahorro', !!E.ajustes.ahorro);
  Fondo.iniciar();
  conectarUI();
  actualizarBotonSonido();
  aplicarAmbiente(true);
  pintarParcelas();
  pintarTodo();

  const estreno = !E.registro.length;
  if (estreno) {
    log('Bienvenida a tu invernadero. Tienes tres semillas silvestres para empezar.', 'evento');
  }
  requestAnimationFrame(bucle);

  setTimeout(() => {
    $('#pantallaCarga').classList.add('fuera');
    setTimeout(() => { const p = $('#pantallaCarga'); if (p) p.remove(); }, 800);
    // Orden de los avisos de entrada: primero saber quién juega (de eso depende
    // poder rescatar un respaldo), después el resumen de lo que pasó fuera.
    if (!quien()) modalQuien();
    else if (off && off.ms > 120000) modalBienvenida(off);
    else if (estreno) modalAyuda();
    Nube.arrancar();
  }, 780);
}

document.addEventListener('DOMContentLoaded', arrancar);

