/* ============================================================
   LA CASITA DE MICHI — catálogo
   Todo lo que se puede comer, comprar, ponerse, ganar y jugar.
   Los ids de ropa, sombreros y accesorios son los mismos del
   Rincón de juegos (index.html), así la portada puede dibujar a
   Michi tal como está vestido aquí.
   ============================================================ */
const JUEGO = {
  clave: 'michiRincon_v1',
  rama: 'michi',
  api: '/api/estado',
  version: 1,
  marcadorCada: 90 * 1000,
  respaldoCada: 5 * 60 * 1000,
  monedasIniciales: 150,
};

/* Necesidades de 0 a 100 (100 = satisfecho). Cuánto bajan por hora. */
const NECESIDADES = [
  { id: 'hambre',   nombre: 'Comida',   emoji: '🍗', color: '#f29a52', despierto: 8, dormido: 3 },
  { id: 'limpieza', nombre: 'Limpieza', emoji: '🫧', color: '#58b9dd', despierto: 5, dormido: 1 },
  { id: 'energia',  nombre: 'Energía',  emoji: '⚡', color: '#f1c232', despierto: 6, dormido: -34 },
  { id: 'animo',    nombre: 'Ánimo',    emoji: '💖', color: '#ec7fa9', despierto: 9, dormido: 2 },
];
/* Si una necesidad pasa tanto rato en cero, Michi se enferma. */
const MIN_PARA_ENFERMAR = 120;

const PIEZAS = [
  { id: 'cocina',     nombre: 'Cocina',      papel: 'baldosa', piso: 'madera' },
  { id: 'bano',       nombre: 'Baño',        papel: 'azulejo', piso: 'damero' },
  { id: 'dormitorio', nombre: 'Pieza',       papel: 'estrellas', piso: 'alfombra' },
  { id: 'juegos',     nombre: 'Sala de juegos', papel: 'rayas', piso: 'madera' },
  { id: 'vestidor',   nombre: 'Vestidor',    papel: 'flores', piso: 'alfombra' },
];

/* llena: cuánto sube el hambre. animo/energia: extra. sucio: cuánto ensucia. */
const COMIDAS = [
  { id: 'leche',     nombre: 'Leche',              emoji: '🥛', precio: 4,  llena: 10, nivel: 1 },
  { id: 'manzana',   nombre: 'Manzana',            emoji: '🍎', precio: 5,  llena: 12, nivel: 1 },
  { id: 'pan',       nombre: 'Pan amasado',        emoji: '🍞', precio: 6,  llena: 15, nivel: 1 },
  { id: 'queso',     nombre: 'Queso',              emoji: '🧀', precio: 8,  llena: 18, nivel: 1 },
  { id: 'pescado',   nombre: 'Pescadito',          emoji: '🐟', precio: 9,  llena: 22, animo: 4, nivel: 1 },
  { id: 'frutilla',  nombre: 'Frutillas',          emoji: '🍓', precio: 7,  llena: 12, animo: 5, nivel: 2 },
  { id: 'helado',    nombre: 'Helado',             emoji: '🍦', precio: 10, llena: 10, animo: 12, sucio: 3, nivel: 2 },
  { id: 'te',        nombre: 'Tecito',             emoji: '🍵', precio: 5,  llena: 5,  animo: 4, energia: 6, nivel: 3 },
  { id: 'sushi',     nombre: 'Sushi',              emoji: '🍣', precio: 14, llena: 28, animo: 6, nivel: 3 },
  { id: 'pizza',     nombre: 'Pizza',              emoji: '🍕', precio: 15, llena: 32, animo: 5, sucio: 4, nivel: 3 },
  { id: 'empanada',  nombre: 'Empanada',           emoji: '🥟', precio: 12, llena: 30, animo: 4, sucio: 2, nivel: 4 },
  { id: 'cupcake',   nombre: 'Cupcake',            emoji: '🧁', precio: 11, llena: 12, animo: 10, sucio: 2, nivel: 4 },
  { id: 'cafe',      nombre: 'Cafecito',           emoji: '☕', precio: 8,  llena: 4,  energia: 14, nivel: 5 },
  { id: 'fideos',    nombre: 'Fettuccine',         emoji: '🍝', precio: 16, llena: 34, animo: 6, sucio: 5, nivel: 5 },
  { id: 'sandia',    nombre: 'Sandía',             emoji: '🍉', precio: 9,  llena: 16, animo: 6, sucio: 3, nivel: 5 },
  { id: 'miel',      nombre: 'Pastelito de miel',  emoji: '🍯', precio: 13, llena: 18, animo: 10, nivel: 6 },
  { id: 'torta',     nombre: 'Torta de cumple',    emoji: '🎂', precio: 30, llena: 40, animo: 20, sucio: 6, nivel: 6 },
  { id: 'pollo',     nombre: 'Pollito asado',      emoji: '🍗', precio: 18, llena: 40, animo: 4, sucio: 4, nivel: 7 },
];

const POCIONES = [
  { id: 'medicina',  nombre: 'Jarabe',            emoji: '💊', precio: 35, desc: 'Cura a Michi cuando está enfermito', nivel: 1 },
  { id: 'energia',   nombre: 'Poción de energía', emoji: '⚡', precio: 40, desc: '+60 de energía al tiro', nivel: 2 },
  { id: 'espuma',    nombre: 'Espuma mágica',     emoji: '🧴', precio: 30, desc: 'Lo deja limpiecito sin bañarlo', nivel: 3 },
  { id: 'risa',      nombre: 'Poción de risa',    emoji: '🌈', precio: 45, desc: '+60 de ánimo', nivel: 4 },
  { id: 'gigante',   nombre: 'Poción gigante',    emoji: '🍄', precio: 60, desc: 'Michi crece por una hora', nivel: 5 },
  { id: 'mini',      nombre: 'Poción mini',       emoji: '🔹', precio: 60, desc: 'Michi se achica por una hora', nivel: 5 },
  { id: 'lonchera',  nombre: 'Lonchera completa', emoji: '🍱', precio: 70, desc: 'Pancita llena de una', nivel: 6 },
  { id: 'arcoiris',  nombre: 'Pelaje arcoíris',   emoji: '🦄', precio: 90, desc: 'Pelaje de colores por dos horas', nivel: 7 },
];

/* Ropa: se dibuja en SVG (michi.js). Sombreros y accesorios: emoji encima. */
const ROPA = [
  { id: 'ropa:sueter',   slot: 'ropa', nombre: 'Suéter',       emoji: '🧶', precio: 35,  nivel: 1 },
  { id: 'ropa:rayas',    slot: 'ropa', nombre: 'Polera',       emoji: '👕', precio: 40,  nivel: 1 },
  { id: 'ropa:pijama',   slot: 'ropa', nombre: 'Pijama',       emoji: '🌙', precio: 55,  nivel: 2 },
  { id: 'ropa:vestido',  slot: 'ropa', nombre: 'Vestido',      emoji: '👗', precio: 60,  nivel: 2 },
  { id: 'ropa:tutu',     slot: 'ropa', nombre: 'Tutú',         emoji: '🩰', precio: 70,  nivel: 3 },
  { id: 'ropa:abrigo',   slot: 'ropa', nombre: 'Abriguito',    emoji: '🧥', precio: 80,  nivel: 4 },
  { id: 'ropa:capa',     slot: 'ropa', nombre: 'Capa heroica', emoji: '🦸', precio: 95,  nivel: 5 },
  { id: 'ropa:esmoquin', slot: 'ropa', nombre: 'Esmoquin',     emoji: '🤵', precio: 120, nivel: 6 },
  { id: 'ropa:corazones', slot: 'ropa', nombre: 'Polerón de corazones', emoji: '💗', precio: 110, nivel: 7 },
  { id: 'ropa:futbol',   slot: 'ropa', nombre: 'Camiseta de fútbol', emoji: '⚽', precio: 90, nivel: 5 },
  { id: 'sombrero:flor',     slot: 'sombrero', donde: 'arriba', nombre: 'Flor',      emoji: '🌸', precio: 30,  nivel: 1 },
  { id: 'sombrero:mono',     slot: 'sombrero', donde: 'arriba', nombre: 'Moñito',    emoji: '🎀', precio: 35,  nivel: 1 },
  { id: 'sombrero:gorro',    slot: 'sombrero', donde: 'arriba', nombre: 'Jockey',    emoji: '🧢', precio: 50,  nivel: 2 },
  { id: 'sombrero:pamela',   slot: 'sombrero', donde: 'arriba', nombre: 'Pamela',    emoji: '👒', precio: 55,  nivel: 3 },
  { id: 'sombrero:vaquero',  slot: 'sombrero', donde: 'arriba', nombre: 'Vaquero',   emoji: '🤠', precio: 60,  nivel: 3 },
  { id: 'sombrero:birrete',  slot: 'sombrero', donde: 'arriba', nombre: 'Birrete',   emoji: '🎓', precio: 65,  nivel: 4 },
  { id: 'sombrero:sombrero', slot: 'sombrero', donde: 'arriba', nombre: 'Sombrero de copa', emoji: '🎩', precio: 70, nivel: 4 },
  { id: 'sombrero:corona',   slot: 'sombrero', donde: 'arriba', nombre: 'Corona',    emoji: '👑', precio: 150, nivel: 8 },
  { id: 'accesorio:gafas',   slot: 'accesorio', donde: 'ojos',   nombre: 'Lentes',     emoji: '👓', precio: 30, nivel: 1 },
  { id: 'accesorio:lentes',  slot: 'accesorio', donde: 'ojos',   nombre: 'Lentes de sol', emoji: '🕶️', precio: 35, nivel: 2 },
  { id: 'accesorio:cascabel', slot: 'accesorio', donde: 'cuello', nombre: 'Cascabel', emoji: '🔔', precio: 40, nivel: 1 },
  { id: 'accesorio:collar',  slot: 'accesorio', donde: 'cuello', nombre: 'Collar de flores', emoji: '💐', precio: 40, nivel: 2 },
  { id: 'accesorio:bufanda', slot: 'accesorio', donde: 'cuello', nombre: 'Bufanda',    emoji: '🧣', precio: 45, nivel: 3 },
  { id: 'accesorio:medalla', slot: 'accesorio', donde: 'cuello', nombre: 'Medalla',    emoji: '🏅', precio: 50, nivel: 4 },
  { id: 'accesorio:corazon', slot: 'accesorio', donde: 'cuello', nombre: 'Corazón',    emoji: '💖', precio: 55, nivel: 5 },
];

/* Pelajes permanentes (la poción arcoíris es temporal). */
const PELAJES = [
  { id: 'crema',   nombre: 'Crema',   precio: 0,   nivel: 1, c: { cuerpo: '#efdcb4', cabeza: '#f3e6c8', oscuro: '#e7d2a6', oreja: '#ecd3d8', ojo: '#3d3a33' } },
  { id: 'naranja', nombre: 'Atigrado', precio: 150, nivel: 2, c: { cuerpo: '#f2b16b', cabeza: '#f6c58a', oscuro: '#e08f45', oreja: '#f6c9c4', ojo: '#3d3a33' } },
  { id: 'gris',    nombre: 'Gris',    precio: 150, nivel: 3, c: { cuerpo: '#b8bcc6', cabeza: '#cdd0d8', oscuro: '#9aa0ad', oreja: '#efcdd5', ojo: '#2f3340' } },
  { id: 'blanco',  nombre: 'Blanco',  precio: 200, nivel: 4, c: { cuerpo: '#f4f1ea', cabeza: '#ffffff', oscuro: '#e2ddd2', oreja: '#f3cbd5', ojo: '#3a5a8a' } },
  { id: 'negro',   nombre: 'Negro',   precio: 250, nivel: 5, c: { cuerpo: '#4b4747', cabeza: '#5b5656', oscuro: '#373333', oreja: '#c98e9b', ojo: '#e3c45a' } },
  { id: 'rosa',    nombre: 'Rosado',  precio: 300, nivel: 6, c: { cuerpo: '#f3bfd0', cabeza: '#f8d4e0', oscuro: '#e7a3bb', oreja: '#fde6ee', ojo: '#5a3a4a' } },
  { id: 'celeste', nombre: 'Celeste', precio: 350, nivel: 7, c: { cuerpo: '#b5d8f0', cabeza: '#cfe6f6', oscuro: '#94c2e3', oreja: '#f6d6e2', ojo: '#2c4a6a' } },
  { id: 'lila',    nombre: 'Lila',    precio: 400, nivel: 8, c: { cuerpo: '#cdb9ec', cabeza: '#ddd0f3', oscuro: '#b59fdf', oreja: '#f6d9e9', ojo: '#3f2f63' } },
  { id: 'dorado',  nombre: 'Dorado',  precio: 600, nivel: 10, c: { cuerpo: '#e9c46a', cabeza: '#f2d68d', oscuro: '#d4a94a', oreja: '#f7d9c4', ojo: '#5a3d16' } },
];

/* Decoración: papeles y pisos se compran una vez y se usan en cualquier pieza. */
const PAPELES = [
  { id: 'baldosa',   nombre: 'Baldosas',  precio: 0,   nivel: 1 },
  { id: 'azulejo',   nombre: 'Azulejos',  precio: 0,   nivel: 1 },
  { id: 'estrellas', nombre: 'Estrellas', precio: 0,   nivel: 1 },
  { id: 'rayas',     nombre: 'Rayas',     precio: 0,   nivel: 1 },
  { id: 'flores',    nombre: 'Flores',    precio: 0,   nivel: 1 },
  { id: 'lunares',   nombre: 'Lunares',   precio: 80,  nivel: 2 },
  { id: 'corazones', nombre: 'Corazones', precio: 120, nivel: 3 },
  { id: 'nubes',     nombre: 'Nubes',     precio: 120, nivel: 4 },
  { id: 'cuadrille', nombre: 'Cuadrillé', precio: 100, nivel: 4 },
  { id: 'palmeras',  nombre: 'Verano',    precio: 160, nivel: 6 },
  { id: 'noche',     nombre: 'Noche',     precio: 180, nivel: 7 },
];
const PISOS = [
  { id: 'madera',    nombre: 'Madera',    precio: 0,   nivel: 1 },
  { id: 'damero',    nombre: 'Damero',    precio: 0,   nivel: 1 },
  { id: 'alfombra',  nombre: 'Alfombra',  precio: 0,   nivel: 1 },
  { id: 'pasto',     nombre: 'Pasto',     precio: 90,  nivel: 3 },
  { id: 'nube',      nombre: 'Algodón',   precio: 120, nivel: 5 },
  { id: 'arena',     nombre: 'Arena',     precio: 110, nivel: 6 },
];

/* pago: monedas por punto. tope: máximo por partida. */
const MINIJUEGOS = [
  { id: 'lluvia',   nombre: 'Lluvia de comida', emoji: '🍓', nivel: 1, pago: 0.5,  tope: 60,
    desc: 'Atrapa la comida que cae. Esquiva los ajíes y las bombas.', como: 'Arrastra el dedo para mover a Michi' },
  { id: 'burbujas', nombre: 'Burbujas',         emoji: '🫧', nivel: 1, pago: 0.08, tope: 70,
    desc: 'Revienta grupos de dos o más burbujas del mismo color. Mientras más grande el grupo, más puntos.', como: 'Toca un grupo de burbujas' },
  { id: 'memoria',  nombre: 'Memoria',          emoji: '🃏', nivel: 1, pago: 0.22, tope: 60,
    desc: 'Encuentra las parejas antes de que se acabe el tiempo.', como: 'Toca dos cartas' },
  { id: 'nubes',    nombre: 'Hasta las nubes',  emoji: '☁️', nivel: 2, pago: 0.05, tope: 80,
    desc: 'Salta de nube en nube lo más alto que puedas. Las nubes grises se rompen.', como: 'Toca a la izquierda o derecha para moverte' },
  { id: 'color',    nombre: 'Toca el color',    emoji: '🎨', nivel: 3, pago: 0.6,  tope: 60,
    desc: 'Toca el color que DICE la palabra, no el color de la tinta.', como: 'Rápido: el tiempo se acorta' },
  { id: 'caida',    nombre: 'Caída libre',      emoji: '🪂', nivel: 4, pago: 0.06, tope: 70,
    desc: 'Michi cae entre ramas: pasa por los huecos y junta monedas.', como: 'Arrastra el dedo para moverte' },
  { id: 'penales',  nombre: 'Penales',          emoji: '⚽', nivel: 5, pago: 0.5,  tope: 60,
    desc: 'Diez penales contra el arquero. Las esquinas valen doble.', como: 'Desliza el dedo hacia el arco' },
  { id: 'dice',     nombre: 'Michi dice',       emoji: '🎵', nivel: 6, pago: 0.3,  tope: 60,
    desc: 'Repite la melodía. Cada ronda suma una nota.', como: 'Toca las patitas en orden' },
];

/* Misiones diarias: se sortean tres cada día. */
const MISIONES = [
  { id: 'comer',   txt: n => `Dale de comer ${n} veces`, metas: [3, 4, 5], premio: 25 },
  { id: 'banar',   txt: n => n > 1 ? `Báñalo ${n} veces` : 'Dale un baño completo', metas: [1, 2], premio: 30 },
  { id: 'jugar',   txt: n => `Juega ${n} minijuegos`, metas: [2, 3, 4], premio: 30 },
  { id: 'mimos',   txt: n => `Hazle ${n} cariños`, metas: [10, 15, 20], premio: 20 },
  { id: 'monedas', txt: n => `Gana ${n} monedas en minijuegos`, metas: [50, 80, 120], premio: 35 },
  { id: 'record',  txt: () => 'Supera tu récord en un minijuego', metas: [1], premio: 40 },
  { id: 'dormir',  txt: () => 'Déjalo dormir hasta llenar su energía', metas: [1], premio: 30 },
  { id: 'vestir',  txt: () => 'Cámbiale la pinta', metas: [1], premio: 15 },
];

/* Regalo diario: se avanza un día por cada día seguido que entras. */
const DIARIO = [
  { monedas: 20 },
  { monedas: 30 },
  { monedas: 40, comida: 'pizza' },
  { monedas: 50 },
  { monedas: 70, pocion: 'energia' },
  { monedas: 90 },
  { monedas: 150, sorpresa: true },
];

const RULETA = [
  { tipo: 'monedas', n: 15,  emoji: '🪙', color: '#ffe3a3' },
  { tipo: 'comida',  n: 2,   emoji: '🍕', color: '#ffd1dc' },
  { tipo: 'monedas', n: 40,  emoji: '🪙', color: '#d6f0ff' },
  { tipo: 'pocion',  n: 1,   emoji: '🧪', color: '#e5dcff' },
  { tipo: 'monedas', n: 10,  emoji: '🪙', color: '#dff5d8' },
  { tipo: 'monedas', n: 25,  emoji: '🪙', color: '#ffe3a3' },
  { tipo: 'comida',  n: 3,   emoji: '🍣', color: '#ffd1dc' },
  { tipo: 'monedas', n: 100, emoji: '💰', color: '#ffe9b0' },
];

/* Logros: cond(E) devuelve el avance (0..1). */
const LOGROS = [
  { id: 'primer_bocado', emoji: '🍼', nombre: 'Primer bocado', txt: 'Dale de comer por primera vez', premio: 10, cond: E => E.stats.comidas >= 1 },
  { id: 'gloton',        emoji: '🍕', nombre: 'Guatón feliz',  txt: 'Dale de comer 50 veces',  premio: 60, meta: 50, val: E => E.stats.comidas },
  { id: 'limpito',       emoji: '🛁', nombre: 'Limpiecito',    txt: 'Báñalo 10 veces',         premio: 50, meta: 10, val: E => E.stats.banos },
  { id: 'dormilon',      emoji: '😴', nombre: 'Dormilón',      txt: 'Déjalo dormir hasta llenarse 5 veces', premio: 50, meta: 5, val: E => E.stats.siestas },
  { id: 'regalon',       emoji: '🥰', nombre: 'Regalón',       txt: 'Hazle 100 cariños',       premio: 50, meta: 100, val: E => E.stats.carinos },
  { id: 'jugador',       emoji: '🎮', nombre: 'Jugador',       txt: 'Juega 25 minijuegos',     premio: 60, meta: 25, val: E => E.stats.partidas },
  { id: 'todos',         emoji: '🗺️', nombre: 'De todo un poco', txt: 'Juega los 8 minijuegos', premio: 80, meta: 8, val: E => Object.keys(E.records).filter(k => E.records[k] > 0).length },
  { id: 'nivel5',        emoji: '⭐', nombre: 'Nivel 5',       txt: 'Llega a nivel 5',         premio: 60, meta: 5, val: E => nivelDe(E.xp) },
  { id: 'nivel10',       emoji: '🌟', nombre: 'Nivel 10',      txt: 'Llega a nivel 10',        premio: 120, meta: 10, val: E => nivelDe(E.xp) },
  { id: 'nivel20',       emoji: '💫', nombre: 'Nivel 20',      txt: 'Llega a nivel 20',        premio: 250, meta: 20, val: E => nivelDe(E.xp) },
  { id: 'fashion',       emoji: '👗', nombre: 'Michi fashion', txt: 'Ten 10 prendas',          premio: 70, meta: 10, val: E => E.ropa.length },
  { id: 'coleccion',     emoji: '🧺', nombre: 'Clóset lleno',  txt: 'Ten toda la ropa, sombreros y accesorios', premio: 300, meta: ROPA.length, val: E => E.ropa.length },
  { id: 'pelaje',        emoji: '🎨', nombre: 'Cambio de look', txt: 'Compra un pelaje nuevo',   premio: 50, meta: 2, val: E => E.pelajes.length },
  { id: 'racha7',        emoji: '🔥', nombre: 'Una semana juntos', txt: 'Entra 7 días seguidos', premio: 100, meta: 7, val: E => E.diario.mejorRacha || 0 },
  { id: 'ahorrador',     emoji: '💰', nombre: 'Alcancía',      txt: 'Gana 2.000 monedas en total', premio: 100, meta: 2000, val: E => E.stats.monedasGanadas },
  { id: 'decorador',     emoji: '🖼️', nombre: 'Decorador',     txt: 'Compra 3 papeles o pisos nuevos', premio: 60, meta: 3, val: E => E.decorComprada.length },
  { id: 'r_lluvia',      emoji: '🍓', nombre: 'Atrapa todo',   txt: '60 puntos en Lluvia de comida', premio: 40, meta: 60, val: E => E.records.lluvia || 0 },
  { id: 'r_burbujas',    emoji: '🫧', nombre: 'Revienta-burbujas', txt: '700 puntos en Burbujas', premio: 40, meta: 700, val: E => E.records.burbujas || 0 },
  { id: 'r_memoria',     emoji: '🧠', nombre: 'Memoria de elefante', txt: '200 puntos en Memoria', premio: 40, meta: 200, val: E => E.records.memoria || 0 },
  { id: 'r_nubes',       emoji: '☁️', nombre: 'Por las nubes', txt: '800 puntos en Hasta las nubes', premio: 40, meta: 800, val: E => E.records.nubes || 0 },
  { id: 'r_color',       emoji: '🎨', nombre: 'Ojo de artista', txt: '40 puntos en Toca el color', premio: 40, meta: 40, val: E => E.records.color || 0 },
  { id: 'r_caida',       emoji: '🪂', nombre: 'Paracaidista',  txt: '600 puntos en Caída libre', premio: 40, meta: 600, val: E => E.records.caida || 0 },
  { id: 'r_penales',     emoji: '⚽', nombre: 'Goleador',      txt: '80 puntos en Penales',     premio: 40, meta: 80, val: E => E.records.penales || 0 },
  { id: 'r_dice',        emoji: '🎵', nombre: 'Oído de oro',   txt: 'Llega a 10 rondas en Michi dice', premio: 40, meta: 100, val: E => E.records.dice || 0 },
];

/* Lo que dice Michi. {n} = su nombre, {p} = quien juega. */
const FRASES = {
  hambre:   ['Tengo hambre…', 'Mi pancita suena 🍗', '¿Hay algo rico en el refri?', 'Un pescadito no me vendría mal'],
  limpieza: ['Huelo un poquito raro…', '¿Me bañas?', 'Tengo pelusas por todos lados'],
  energia:  ['Tengo sueñito…', '*bostezo*', 'Se me cierran los ojitos'],
  animo:    ['Me aburro…', '¿Jugamos a algo?', 'Hazme cariño 🥺'],
  enfermo:  ['No me siento bien…', 'Creo que necesito mi jarabe 💊'],
  feliz:    ['¡Miau! 💛', 'Te quiero mucho', '¡Eres mi persona favorita!', 'Qué rico estar aquí contigo', '¿Jugamos?', 'Prr prr prr…'],
  catalina: ['Catalina, eres la mejor 🌷', 'Diego te manda un abrazo grande 💛', '¿Sabías que Diego te quiere un montón?', 'Me encanta cuando vienes a verme'],
  diego:    ['Diego, ¿ya le dijiste a Catalina que la quieres hoy?', 'Hola, Diego 🌿'],
  noche:    ['Ya es tarde… ¿a dormir?', 'Las estrellas salieron ✨'],
  manana:   ['¡Buenos días! ☀️', 'Qué rico dormí'],
};
