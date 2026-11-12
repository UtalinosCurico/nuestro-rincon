/* ============================================================
   METRO DE CURICÓ — datos del juego
   El metro que Curicó no tiene: van apareciendo estaciones y la
   gente quiere ir a otros lugares. Hay que unirlas con líneas
   antes de que alguna se repleta.
   ============================================================ */
const JUEGO = {
  clave: 'metroRincon_v1',        // perfil + __<Persona>
  partida: 'metroPartida_v1',     // la partida a medias + __<Persona>
  resumen: 'metroResumen',        // lo que lee la tarjeta del Rincón + __<Persona>
  rama: 'metro',                  // rama en Neon: datos.metro
  api: '/api/estado',
  version: 1,
};

/* El mapa es siempre del mismo tamaño en cualquier teléfono (así el
   desafío del día sale igual para los dos) y crece un poco cada día. */
const MUNDO = { aspecto: .62, anchoInicial: 400, anchoMax: 940, crecePorDia: 30, distMin: 82, margen: 36 };
const TIEMPO = { dia: 20, semana: 7, paso: 1 / 60 };
const TREN = { vel: 70, capacidad: 6, porVagon: 6, paradaBase: .4, porPasajero: .14 };
const ESTACION = { capacidad: 6, capacidadGrande: 12, colapso: 45, alivio: 15, maximo: 46 };
const INICIO = { lineas: 3, trenes: 3, vagones: 0, puentes: 2, tuneles: 1, intercambiadores: 0 };
const MAX_LINEAS = 7;

/* Colores de las líneas (se nombran en la hoja de cada línea). */
const LINEAS = [
  { color: '#e2554f', n: 'roja' }, { color: '#f2a93b', n: 'amarilla' }, { color: '#3a7bd5', n: 'azul' },
  { color: '#2fae74', n: 'verde' }, { color: '#9b59b6', n: 'morada' }, { color: '#ec7fa9', n: 'rosada' },
  { color: '#3d4a5c', n: 'gris' },
];

/* Tipos de lugar. Los tres primeros aparecen siempre; los especiales
   se abren con los días y son pocos (como el estadio, que hay uno). */
const TIPOS = {
  casa:     { n: 'Casas', e: '🏠', peso: 50, desde: 0, max: 999 },
  estudio:  { n: 'Estudios', e: '🎓', peso: 18, desde: 0, max: 999 },
  compras:  { n: 'Compras', e: '🛍️', peso: 18, desde: 0, max: 999 },
  hospital: { n: 'Hospital', e: '🏥', peso: 7, desde: 2, max: 2 },
  estadio:  { n: 'Estadio', e: '⚽', peso: 6, desde: 4, max: 1 },
  estacion: { n: 'Estación de trenes', e: '🚆', peso: 6, desde: 6, max: 1 },
  plaza:    { n: 'Plaza de Armas', e: '🌳', peso: 6, desde: 8, max: 1 },
  vina:     { n: 'Viñas', e: '🍇', peso: 5, desde: 11, max: 2 },
  mirador:  { n: 'Mirador', e: '⛰️', peso: 5, desde: 14, max: 1 },
};
const TIPOS_BASE = ['casa', 'estudio', 'compras'];

/* Nombres (inventados, salvo los lugares conocidos). Las dos primeras casas son las de ustedes. */
const NOMBRES = {
  casa: ['Casa de Catalina', 'Casa de Diego', 'Villa Las Rosas', 'Villa Los Aromos', 'Villa El Boldo', 'Villa Los Castaños', 'Villa Las Acacias',
    'Villa Los Olivos', 'Villa El Parrón', 'Villa Los Maitenes', 'Villa Las Camelias', 'Villa El Sauce', 'Villa Los Peumos', 'Villa Las Vertientes',
    'Villa Los Jazmines', 'Villa Los Laureles', 'Villa El Bosque', 'Villa Las Palmas', 'Villa Los Tilos', 'Villa Las Azucenas', 'Villa El Almendro',
    'Villa Los Quillayes', 'Villa Las Lilas', 'Villa El Roble', 'Villa Los Canelos'],
  estudio: ['La U', 'Liceo', 'Instituto', 'Colegio', 'Escuela', 'Jardín infantil', 'Biblioteca', 'Preuniversitario', 'Escuela de música'],
  compras: ['Mall', 'Supermercado', 'Feria', 'Mercado', 'Paseo peatonal', 'Ferretería', 'Panadería', 'Farmacia', 'Galería'],
  hospital: ['Hospital', 'Cesfam'],
  estadio: ['Estadio La Granja'],
  estacion: ['Estación Curicó'],
  plaza: ['Plaza de Armas'],
  vina: ['Viña del Valle', 'Viña Las Uvas'],
  mirador: ['Cerro Condell'],
};

/* Geografía (coordenadas del mapa: la Plaza de Armas queda cerca del centro). */
const GEO = {
  estero: [[-1600, -150], [-1100, -125], [-700, -175], [-380, -130], [-120, -190], [140, -150], [420, -205], [760, -160], [1100, -210], [1600, -170]],
  esteroAncho: 30,
  cerro: [[270, 40], [320, -10], [400, -6], [462, 48], [474, 128], [430, 196], [348, 210], [282, 168], [252, 104]],
  plaza: { x: -30, y: 70, lado: 74 },
  tren: [[-300, -1700], [-292, -700], [-270, -160], [-262, 300], [-284, 900], [-300, 1700]],
};

/* Mejoras de cada fin de semana: la Muni da un tren y deja elegir una de dos. */
const MEJORAS = {
  linea: { n: 'Línea nueva', d: 'Un color más para trazar', e: '〰️' },
  vagon: { n: 'Vagón', d: 'Un tren lleva 6 personas más', e: '🚃' },
  puente: { n: 'Dos puentes', d: 'Para cruzar el estero', e: '🌉' },
  tunel: { n: 'Túnel', d: 'Para pasar por debajo del cerro', e: '⛰️' },
  intercambiador: { n: 'Intercambiador', d: 'Una estación aguanta el doble y la gente sube más rápido', e: '⭕' },
};

const DIAS_SEMANA = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];
