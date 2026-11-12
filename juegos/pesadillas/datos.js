/* ============================================================
   PESADILLAS DE MICHI — datos del juego
   Michi se queda dormido y sueña que la casa es un laberinto:
   cinco pisos (cocina, baño, living, patio y tejado), cada uno
   con su jefe. Todo lo de aquí es contenido: el motor lo lee.
   ============================================================ */
const JUEGO = {
  clave: 'pesadillasRincon_v1',      // perfil (desbloqueos, colección, récords) + __<Persona>
  partida: 'pesadillasPartida_v1',   // la partida en curso, para seguirla después + __<Persona>
  resumen: 'pesadillasResumen',      // lo que lee la tarjeta del Rincón de juegos + __<Persona>
  rama: 'pesadillas',                // rama en Neon: datos.pesadillas
  api: '/api/estado',
  version: 1,
  marcadorCada: 120000,
  respaldoCada: 300000,
};

/* La sala por dentro mide N×N baldosas; las puertas quedan al medio de cada pared. */
const N = 11;

/* Lo que trae Michi al empezar (las balas son bolitas de lana). */
const BASE = { dano: 3.5, cadencia: 2.6, alcance: 6.5, velBala: 8, vel: 4.1, suerte: 0, tamBala: 1 };

/* Pelajes de Michi: los mismos de la casita (michi.js los necesita con este nombre). */
const PELAJES = [
  { id: 'crema',   c: { cuerpo: '#efdcb4', cabeza: '#f3e6c8', oscuro: '#e7d2a6', oreja: '#ecd3d8', ojo: '#3d3a33' } },
  { id: 'naranja', c: { cuerpo: '#f2b16b', cabeza: '#f6c58a', oscuro: '#e08f45', oreja: '#f6c9c4', ojo: '#3d3a33' } },
  { id: 'gris',    c: { cuerpo: '#b8bcc6', cabeza: '#cdd0d8', oscuro: '#9aa0ad', oreja: '#efcdd5', ojo: '#2f3340' } },
  { id: 'blanco',  c: { cuerpo: '#f4f1ea', cabeza: '#ffffff', oscuro: '#e2ddd2', oreja: '#f3cbd5', ojo: '#3a5a8a' } },
  { id: 'negro',   c: { cuerpo: '#4b4747', cabeza: '#5b5656', oscuro: '#373333', oreja: '#c98e9b', ojo: '#e3c45a' } },
  { id: 'rosa',    c: { cuerpo: '#f3bfd0', cabeza: '#f8d4e0', oscuro: '#e7a3bb', oreja: '#fde6ee', ojo: '#5a3a4a' } },
  { id: 'celeste', c: { cuerpo: '#b5d8f0', cabeza: '#cfe6f6', oscuro: '#94c2e3', oreja: '#f6d6e2', ojo: '#2c4a6a' } },
  { id: 'lila',    c: { cuerpo: '#cdb9ec', cabeza: '#ddd0f3', oscuro: '#b59fdf', oreja: '#f6d9e9', ojo: '#3f2f63' } },
  { id: 'dorado',  c: { cuerpo: '#e9c46a', cabeza: '#f2d68d', oscuro: '#d4a94a', oreja: '#f7d9c4', ojo: '#5a3d16' } },
];
/* Sombreros y accesorios de la casita (se dibujan como emoji encima de Michi). */
const ACCESORIOS = {
  'sombrero:flor': ['🌸', 'arriba'], 'sombrero:mono': ['🎀', 'arriba'], 'sombrero:gorro': ['🧢', 'arriba'],
  'sombrero:pamela': ['👒', 'arriba'], 'sombrero:vaquero': ['🤠', 'arriba'], 'sombrero:birrete': ['🎓', 'arriba'],
  'sombrero:sombrero': ['🎩', 'arriba'], 'sombrero:corona': ['👑', 'arriba'],
  'accesorio:gafas': ['👓', 'ojos'], 'accesorio:lentes': ['🕶️', 'ojos'], 'accesorio:cascabel': ['🔔', 'cuello'],
  'accesorio:collar': ['💐', 'cuello'], 'accesorio:bufanda': ['🧣', 'cuello'], 'accesorio:medalla': ['🏅', 'cuello'],
  'accesorio:corazon': ['💖', 'cuello'],
};

/* ============================================================
   PISOS
   ============================================================ */
const PISOS = [
  {
    id: 'cocina', nombre: 'La cocina', sub: 'huele a leche tibia', salas: 7,
    enemigos: ['raton', 'raton', 'ratonGordo', 'mosca', 'cucaracha', 'tetera'], jefe: 'reyRaton',
    c: { piso1: '#f6e6c8', piso2: '#ebd2a8', pared: '#cf9a74', paredOsc: '#a9714f', linea: '#b98a63', acento: '#e8735f', fondo: '#2a2238' },
    nota: 0, // tono de la música
  },
  {
    id: 'bano', nombre: 'El baño', sub: 'el lugar más temido', salas: 8,
    enemigos: ['gota', 'burbuja', 'patito', 'arana', 'mosca'], jefe: 'tina',
    c: { piso1: '#e3f3f8', piso2: '#cfe9f1', pared: '#8cc4d8', paredOsc: '#5c9db6', linea: '#a9d6e5', acento: '#52acd3', fondo: '#1d2640' },
    nota: 2,
  },
  {
    id: 'living', nombre: 'El living', sub: 'donde viven las pelusas', salas: 9,
    enemigos: ['pelusa', 'soldadito', 'polilla', 'libro', 'arana', 'raton'], jefe: 'aspiradora',
    c: { piso1: '#dcb88e', piso2: '#cfa77a', pared: '#b9a4cc', paredOsc: '#8e78a8', linea: '#b48c63', acento: '#e3a457', fondo: '#241f3a' },
    nota: 4,
  },
  {
    id: 'patio', nombre: 'El patio', sub: 'de noche todo da más miedo', salas: 10,
    enemigos: ['pepino', 'sapo', 'perrito', 'murcielago', 'babosa'], jefe: 'perro',
    c: { piso1: '#8fbf7f', piso2: '#84b574', pared: '#5d8450', paredOsc: '#3f6236', linea: '#76a466', acento: '#f2d06b', fondo: '#141f2e' },
    nota: 5,
  },
  {
    id: 'tejado', nombre: 'El tejado', sub: 'más cerca de la luna', salas: 11,
    enemigos: ['fantasma', 'buho', 'gatoNegro', 'murcielago', 'polilla'], jefe: 'gatoSombra',
    c: { piso1: '#a8705f', piso2: '#975f4f', pared: '#3b3f6e', paredOsc: '#252851', linea: '#7f4b3e', acento: '#f7e6a3', fondo: '#0c0f24' },
    nota: 7,
  },
];
/* Vida de los enemigos según el piso. */
const VIDA_PISO = [1, 1.25, 1.55, 1.85, 2.15];

/* ============================================================
   ENEMIGOS
   ia: cómo se mueven (ver IA en motor.js) · costo: cuánto "pesan" al armar una pieza
   dano en medios corazones · disparo: patrón de balas
   ============================================================ */
const ENEMIGOS = {
  raton:      { n: 'Ratón', hp: 7, vel: 2.4, r: .32, ia: 'perseguir', dano: 1, costo: 1 },
  ratonGordo: { n: 'Ratón gordo', hp: 18, vel: 1.5, r: .44, ia: 'perseguir', dano: 1, costo: 2, alMorir: { dividir: 'raton', n: 2 } },
  mosca:      { n: 'Mosca', hp: 4, vel: 2.1, r: .24, ia: 'revolotear', vuela: true, dano: 1, costo: .8 },
  cucaracha:  { n: 'Cucaracha', hp: 9, vel: 5, r: .3, ia: 'corretear', dano: 1, costo: 1.5 },
  tetera:     { n: 'Tetera', hp: 16, vel: 0, r: .42, ia: 'torreta', dano: 1, costo: 2, disparo: { cada: 2.4, patron: 'cruzEquis', vel: 3.6, tipo: 'vapor' } },
  gota:       { n: 'Gota', hp: 12, r: .36, ia: 'saltar', dano: 1, costo: 1.5, salto: { espera: 1.1, dist: 2.4, dur: .45 }, alMorir: { dividir: 'gotita', n: 2 } },
  gotita:     { n: 'Gotita', hp: 4, r: .22, ia: 'saltar', dano: 1, costo: .5, salto: { espera: .8, dist: 1.6, dur: .35 } },
  burbuja:    { n: 'Burbuja', hp: 6, vel: 1.1, r: .34, ia: 'flotar', vuela: true, dano: 1, costo: 1.5, alMorir: { anillo: 6, vel: 3.4, tipo: 'agua' } },
  patito:     { n: 'Patito de goma', hp: 16, vel: 1.0, r: .38, ia: 'deambularDisparar', dano: 1, costo: 2, disparo: { cada: 1.9, patron: 'apuntado', vel: 5, tipo: 'agua' } },
  arana:      { n: 'Araña', hp: 10, r: .32, ia: 'saltar', dano: 1, costo: 1.5, salto: { espera: .55, dist: 2.1, dur: .3 } },
  pelusa:     { n: 'Pelusa', hp: 14, vel: .9, r: .38, ia: 'flotarDisparar', vuela: true, dano: 1, costo: 2, disparo: { cada: 2.3, patron: 'apuntado3', vel: 4, tipo: 'polvo' } },
  soldadito:  { n: 'Soldadito a cuerda', hp: 20, vel: 1.4, r: .38, ia: 'embestir', dano: 2, costo: 2, carga: 7.5 },
  polilla:    { n: 'Polilla', hp: 6, vel: 2.8, r: .26, ia: 'revolotear', vuela: true, dano: 1, costo: 1 },
  libro:      { n: 'Libro volador', hp: 14, vel: 1.1, r: .36, ia: 'flotarDisparar', vuela: true, dano: 1, costo: 2.5, disparo: { cada: 3, patron: 'anillo8', vel: 3.5, tipo: 'papel' } },
  pepino:     { n: 'Pepino', hp: 16, vel: 3.4, r: .36, ia: 'emboscada', dano: 2, costo: 2 },
  sapo:       { n: 'Sapo', hp: 22, r: .42, ia: 'saltar', dano: 2, costo: 2.5, salto: { espera: 1.3, dist: 3, dur: .55, alCaer: 'cruz' } },
  perrito:    { n: 'Perrito', hp: 22, vel: 1.6, r: .4, ia: 'embestir', dano: 2, costo: 2.5, carga: 8 },
  murcielago: { n: 'Murciélago', hp: 8, vel: 2.6, r: .3, ia: 'picada', vuela: true, dano: 1, costo: 1.5 },
  babosa:     { n: 'Babosa', hp: 16, vel: .9, r: .36, ia: 'babosa', dano: 1, costo: 1.5 },
  fantasma:   { n: 'Fantasma de sábana', hp: 18, vel: 1.2, r: .4, ia: 'fantasma', vuela: true, espectral: true, dano: 2, costo: 2.5, disparo: { patron: 'apuntado', vel: 4, tipo: 'sombra' } },
  buho:       { n: 'Búho', hp: 20, r: .4, ia: 'torreta', dano: 2, costo: 2.5, disparo: { cada: 2.6, patron: 'rafaga3', vel: 5.5, tipo: 'pluma' } },
  gatoNegro:  { n: 'Gato callejero', hp: 18, vel: 2.8, r: .36, ia: 'perseguirSaltar', dano: 2, costo: 2.5 },
  clonSombra: { n: 'Sombra', hp: 10, vel: 1.6, r: .34, ia: 'clon', vuela: true, dano: 2, costo: 0, disparo: { cada: 1.4, patron: 'apuntado', vel: 4.4, tipo: 'sombra' } },
};

/* ============================================================
   JEFES (uno por piso)
   ============================================================ */
const JEFES = {
  reyRaton:   { n: 'El Rey Ratón', sub: 'dueño de la despensa', hp: 140, r: .85, vel: 1.7, dano: 1, ataques: ['embestida', 'quesos', 'llamar'] },
  tina:       { n: 'La Tina', sub: 'nadie se escapa del baño', hp: 220, r: 1.15, vel: 1.2, dano: 1, ataques: ['anillo', 'burbujas', 'ola'] },
  aspiradora: { n: 'La Aspiradora', sub: 'se lo traga todo', hp: 330, r: .95, vel: 1.9, dano: 2, ataques: ['succion', 'embestida', 'nubes'] },
  perro:      { n: 'El Perro del Vecino', sub: 'ladra más de lo que muerde', hp: 420, r: 1.0, vel: 2.0, dano: 2, ataques: ['embestida', 'ladrido', 'salto'] },
  gatoSombra: { n: 'El Gato Sombra', sub: 'el miedo más grande de Michi', hp: 600, r: .8, vel: 2.6, dano: 2, ataques: ['espejo', 'espiral', 'clones', 'zarpazo'] },
};

/* ============================================================
   OBJETOS
   p: dónde pueden salir (tesoro, jefe, tienda, secreta) · q: calidad 0-4
   ef: efectos (ver calcularStats y tomarItem en motor.js)
   b: logro que lo desbloquea (si no tiene, viene desde el principio)
   ============================================================ */
const ITEMS = [
  // --- comida y estadísticas ---
  { id: 'leche', n: 'Leche tibia', e: '🥛', d: 'Más daño', p: ['jefe', 'tienda'], q: 1, ef: { dano: .7 } },
  { id: 'sardina', n: 'Sardina', e: '🐟', d: '+1 corazón', p: ['jefe', 'tienda', 'tesoro'], q: 1, ef: { corazon: 1, cura: 2 } },
  { id: 'hierbaGatera', n: 'Hierba gatera', e: '🌿', d: 'Disparas más rápido y corres más', p: ['tesoro', 'jefe'], q: 2, ef: { cadencia: .6, vel: .3 } },
  { id: 'garras', n: 'Garras afiladas', e: '🐾', d: 'Mucho más daño', p: ['tesoro', 'jefe'], q: 2, ef: { dano: 1 } },
  { id: 'catalejo', n: 'Catalejo', e: '🔭', d: 'Tus bolitas llegan más lejos y más rápido', p: ['tesoro', 'jefe', 'tienda'], q: 1, ef: { alcance: 2.5, velBala: 1.2 } },
  { id: 'cascabel', n: 'Cascabel', e: '🔔', d: 'Más suerte: caen más cosas', p: ['tienda', 'tesoro'], q: 1, ef: { suerte: 1 } },
  { id: 'moteHuesillo', n: 'Mote con huesillo', e: '🥤', d: 'Corres más y disparas más rápido', p: ['jefe', 'tienda'], q: 1, ef: { vel: .5, cadencia: .3 } },
  { id: 'sopaipilla', n: 'Sopaipilla', e: '🫓', d: '+1 corazón y te cura entero', p: ['jefe', 'tienda'], q: 1, ef: { corazon: 1, cura: 99 } },
  { id: 'empanada', n: 'Empanada de pino', e: '🥟', d: '+1 corazón y más daño', p: ['jefe'], q: 2, ef: { corazon: 1, cura: 2, dano: .5 } },
  { id: 'completo', n: 'Completo', e: '🌭', d: 'Mucho daño, pero pesa', p: ['jefe', 'tesoro'], q: 2, ef: { dano: 1.4, vel: -.3 } },
  { id: 'panAmasado', n: 'Pan amasado', e: '🍞', d: 'Te cura y te abriga', p: ['tienda', 'jefe'], q: 1, ef: { cura: 4, sueno: 2 } },
  { id: 'kuchen', n: 'Kuchen', e: '🍰', d: 'Más suerte y un corazón de sueño', p: ['tienda'], q: 1, ef: { suerte: 1, sueno: 2 }, b: 'diario' },
  { id: 'sushi', n: 'Sushi', e: '🍣', d: 'Como en la primera cita: un poco de todo', p: ['tesoro'], q: 4, ef: { corazon: 1, cura: 99, dano: .5, cadencia: .3, vel: .2, alcance: 1, suerte: 1 } },
  { id: 'fettuccine', n: 'Fettuccine de Peppo', e: '🍝', d: 'Más daño y +1 corazón', p: ['jefe', 'tesoro'], q: 3, ef: { dano: .8, corazon: 1, cura: 2 } },
  { id: 'pastelito', n: 'Pastelito de miel', e: '🍯', d: 'Dos corazones de sueño y más suerte', p: ['tienda', 'tesoro'], q: 2, ef: { sueno: 4, suerte: .5 } },
  { id: 'alfajor', n: 'Alfajor', e: '🍪', d: 'Un poquito de todo', p: ['jefe', 'tienda'], q: 1, ef: { dano: .3, cadencia: .2, vel: .2, alcance: .5 } },
  { id: 'merken', n: 'Merkén', e: '🧂', d: 'Disparas mucho más rápido', p: ['tesoro', 'jefe'], q: 2, ef: { cadencia: .8 } },
  { id: 'cafe', n: 'Café de grano', e: '☕', d: 'Corres y disparas más rápido', p: ['tienda', 'jefe'], q: 2, ef: { vel: .4, cadencia: .4 }, b: 'rapido' },
  { id: 'zapatillas', n: 'Zapatillas', e: '👟', d: 'Corres mucho más', p: ['tesoro', 'tienda'], q: 1, ef: { vel: .7 } },

  // --- cómo disparas ---
  { id: 'ovilloDoble', n: 'Ovillo doble', e: '🧶', d: 'Disparas de a dos', p: ['tesoro'], q: 3, ef: { n: 1 } },
  { id: 'aguja', n: 'Aguja de tejer', e: '🪡', d: 'Disparas de a tres, pero más lento', p: ['tesoro'], q: 3, ef: { n: 2, mCadencia: .78 } },
  { id: 'pelotita', n: 'Pelotita saltarina', e: '🏐', d: 'Tus bolitas rebotan en las paredes', p: ['tesoro'], q: 2, ef: { rebotes: 2 } },
  { id: 'hilo', n: 'Hilo encerado', e: '🧵', d: 'Tus bolitas atraviesan enemigos', p: ['tesoro'], q: 3, ef: { perfora: true } },
  { id: 'lanaMagica', n: 'Lana mágica', e: '🔮', d: 'Tus bolitas buscan al enemigo', p: ['tesoro'], q: 3, ef: { tele: .6 } },
  { id: 'explosivas', n: 'Bolitas explosivas', e: '💥', d: 'Tus bolitas explotan al chocar', p: ['tesoro'], q: 3, ef: { explota: true, mDano: .9 } },
  { id: 'aji', n: 'Ají cacho de cabra', e: '🌶️', d: 'Tus bolitas queman', p: ['tesoro', 'jefe'], q: 2, ef: { fuego: true, dano: .3 } },
  { id: 'cubito', n: 'Cubito de hielo', e: '🧊', d: 'Tus bolitas frenan y a veces congelan', p: ['tesoro'], q: 2, ef: { hielo: true }, b: 'tina' },
  { id: 'tijeras', n: 'Tijeras', e: '✂️', d: 'Tus bolitas se parten al chocar', p: ['tesoro'], q: 3, ef: { partir: true }, b: 'coleccion10' },
  { id: 'cable', n: 'Cable pelado', e: '⚡', d: 'Tus bolitas dan la corriente a los de al lado', p: ['tesoro'], q: 3, ef: { cadena: true }, b: 'aspiradora' },
  { id: 'bumeran', n: 'Bumerán', e: '🪃', d: 'Tus bolitas van y vuelven', p: ['tesoro'], q: 2, ef: { bumeran: true, alcance: 1 }, b: 'perro' },
  { id: 'laser', n: 'Puntero láser', e: '🔴', d: 'El puntito rojo: disparas un rayo', p: ['tesoro'], q: 4, ef: { laser: true } },
  { id: 'lanaGruesa', n: 'Lana gruesa', e: '🧣', d: 'Bolitas grandes que pegan fuerte', p: ['tesoro', 'jefe'], q: 2, ef: { tamBala: .6, mDano: 1.4, mCadencia: .85 }, b: 'reyRaton' },
  { id: 'lanaFina', n: 'Lana fina', e: '🪢', d: 'Disparas muchísimo más rápido, pero más suave', p: ['tesoro'], q: 2, ef: { mCadencia: 1.55, mDano: .78, tamBala: -.25 } },
  { id: 'lentes', n: 'Lentes de sol', e: '🕶️', d: 'También disparas hacia atrás', p: ['tesoro'], q: 1, ef: { atras: true } },
  { id: 'ola', n: 'Lana ondulada', e: '🌊', d: 'Tus bolitas van en ondas y llegan más lejos', p: ['tesoro'], q: 1, ef: { ola: true, alcance: 1.5 } },
  { id: 'lupa', n: 'Lupa', e: '🔍', d: 'A veces das un golpe crítico', p: ['tesoro', 'tienda'], q: 2, ef: { critico: .12 } },
  { id: 'colmillo', n: 'Colmillito', e: '🦷', d: 'A veces, derrotar a alguien te cura', p: ['tesoro', 'secreta'], q: 2, ef: { vampiro: true } },
  { id: 'iman', n: 'Imán de refri', e: '🧲', d: 'Atrae monedas, llaves y corazones', p: ['tienda', 'secreta'], q: 1, ef: { iman: true } },
  { id: 'espejito', n: 'Espejito', e: '🪞', d: 'Tus bolitas atraviesan los obstáculos', p: ['tesoro'], q: 2, ef: { espectral: true } },
  { id: 'carga', n: 'Ronroneo largo', e: '🎐', d: 'Mantén apuntado: cargas una bolita enorme', p: ['tesoro'], q: 3, ef: { carga: true } },
  { id: 'estrella', n: 'Estrella fugaz', e: '🌠', d: 'A veces disparas una estrella que no falla', p: ['tesoro'], q: 3, ef: { estrella: .14 }, b: 'coleccion25' },

  // --- amigos ---
  { id: 'ratonCuerda', n: 'Ratón a cuerda', e: '🐭', d: 'Un amigo que dispara contigo', p: ['tesoro'], q: 2, ef: { familiar: 'raton' }, b: 'cien' },
  { id: 'pluma', n: 'Pluma', e: '🪶', d: 'Gira a tu alrededor y ataja disparos', p: ['tesoro'], q: 3, ef: { familiar: 'pluma' }, b: 'sinDano' },
  { id: 'pececito', n: 'Pececito', e: '🐠', d: 'Te sigue y tira burbujas que frenan', p: ['tesoro'], q: 2, ef: { familiar: 'pez' } },
  { id: 'luciernaga', n: 'Luciérnaga', e: '✨', d: 'Busca enemigos ella sola', p: ['tesoro'], q: 3, ef: { familiar: 'luciernaga' }, b: 'quinientos' },
  { id: 'mariposa', n: 'Mariposa', e: '🦋', d: 'Revolotea y lastima a los que se acercan', p: ['tesoro', 'secreta'], q: 2, ef: { familiar: 'mariposa' } },

  // --- protección y ayudas ---
  { id: 'cojin', n: 'Cojín', e: '🛋️', d: 'Dos corazones de sueño', p: ['tienda', 'jefe'], q: 1, ef: { sueno: 4 } },
  { id: 'mapa', n: 'Mapa de la casa', e: '🗺️', d: 'Ves todo el piso', p: ['tienda', 'secreta'], q: 1, ef: { mapa: true } },
  { id: 'brujula', n: 'Brújula', e: '🧭', d: 'Ves dónde están las piezas especiales', p: ['tienda', 'secreta'], q: 1, ef: { brujula: true } },
  { id: 'sieteVidas', n: 'Una de sus siete vidas', e: '🐈', d: 'Si te despiertan, sigues soñando', p: ['tesoro'], q: 4, ef: { vidas: 1 }, b: 'gatoSombra' },
  { id: 'monedero', n: 'Monedero', e: '👛', d: '+15 monedas y la tienda te hace precio', p: ['tienda'], q: 1, ef: { monedas: 15, descuento: true }, b: 'comprador' },
  { id: 'trebol', n: 'Trébol', e: '🍀', d: 'Mucha más suerte', p: ['tesoro', 'secreta'], q: 2, ef: { suerte: 2 }, b: 'cofres' },
  { id: 'bolsaPetardos', n: 'Bolsa de petardos', e: '🎆', d: '+5 petardos, y explotan más grande', p: ['tienda'], q: 1, ef: { petardos: 5, petardoGrande: true }, b: 'petardos' },
  { id: 'llavero', n: 'Llavero', e: '🗝️', d: '+2 llaves', p: ['tienda'], q: 1, ef: { llaves: 2 } },

  // --- para usar (se cargan limpiando piezas) ---
  { id: 'caja', n: 'Caja de cartón', e: '📦', d: 'Te escondes: nadie te ve ni te toca', p: ['tesoro', 'tienda'], q: 2, ef: { activo: 'caja', cargaMax: 3 } },
  { id: 'ronroneo', n: 'Ronroneo', e: '💤', d: 'Te cura un corazón', p: ['tienda', 'jefe'], q: 2, ef: { activo: 'ronroneo', cargaMax: 4 } },
  { id: 'maullido', n: 'Maullido', e: '📣', d: 'Empuja a todos y borra sus disparos', p: ['tesoro'], q: 2, ef: { activo: 'maullido', cargaMax: 2 } },
  { id: 'ovilloBomba', n: 'Ovillo bomba', e: '🎳', d: 'Lanza un ovillo que explota', p: ['tesoro'], q: 2, ef: { activo: 'ovilloBomba', cargaMax: 3 } },
  { id: 'linterna', n: 'Linterna', e: '🔦', d: 'Deja quietos a todos y muestra lo secreto', p: ['tesoro'], q: 2, ef: { activo: 'linterna', cargaMax: 3 }, b: 'secretas' },
  { id: 'rayoLuna', n: 'Rayo de luna', e: '🌙', d: 'Un rayo enorme hacia donde apuntas', p: ['tesoro'], q: 3, ef: { activo: 'rayoLuna', cargaMax: 4 }, b: 'tresVictorias' },
  { id: 'dado', n: 'Dado', e: '🎲', d: 'Cambia los objetos de la pieza', p: ['tienda', 'secreta'], q: 2, ef: { activo: 'dado', cargaMax: 6 } },
  { id: 'atun', n: 'Lata de atún', e: '🥫', d: 'Mucho más daño en esta pieza', p: ['tienda'], q: 1, ef: { activo: 'atun', cargaMax: 2 } },
];
const ITEM = Object.fromEntries(ITEMS.map(x => [x.id, x]));

/* Lo que se vende suelto en la tienda (precio en monedas). */
const TIENDA_SUELTOS = [
  { tipo: 'corazon', precio: 3 }, { tipo: 'petardo', precio: 5 }, { tipo: 'llave', precio: 5 },
  { tipo: 'sueno', precio: 5 },
];

/* ============================================================
   LOGROS (cada uno desbloquea un objeto)
   ============================================================ */
const LOGROS = [
  { id: 'primerSueno', n: 'Primer sueño', d: 'Termina una partida', premio: null, e: '🌙' },
  { id: 'reyRaton', n: 'Se acabó el reinado', d: 'Vence al Rey Ratón', premio: 'lanaGruesa', e: '👑' },
  { id: 'tina', n: 'Sequito', d: 'Vence a la Tina', premio: 'cubito', e: '🛁' },
  { id: 'aspiradora', n: 'Desenchufada', d: 'Vence a la Aspiradora', premio: 'cable', e: '🔌' },
  { id: 'perro', n: 'Perro que ladra', d: 'Vence al Perro del Vecino', premio: 'bumeran', e: '🐕' },
  { id: 'gatoSombra', n: 'Sin miedo', d: 'Vence al Gato Sombra', premio: 'sieteVidas', e: '🌟' },
  { id: 'sinDano', n: 'Ni un rasguño', d: 'Termina un piso sin que te toquen', premio: 'pluma', e: '🪶' },
  { id: 'comprador', n: 'Buena clienta', d: 'Compra 10 cosas en la tienda', premio: 'monedero', e: '🛍️' },
  { id: 'secretas', n: 'Detective', d: 'Encuentra 5 piezas secretas', premio: 'linterna', e: '🔎' },
  { id: 'coleccion10', n: 'Coleccionista', d: 'Descubre 10 objetos distintos', premio: 'tijeras', e: '📖' },
  { id: 'coleccion25', n: 'Gran coleccionista', d: 'Descubre 25 objetos distintos', premio: 'estrella', e: '📚' },
  { id: 'cien', n: 'Cien', d: 'Derrota a 100 enemigos en total', premio: 'ratonCuerda', e: '💯' },
  { id: 'quinientos', n: 'Quinientos', d: 'Derrota a 500 enemigos en total', premio: 'luciernaga', e: '🏅' },
  { id: 'diario', n: 'Sueño del día', d: 'Juega un sueño del día', premio: 'kuchen', e: '📅' },
  { id: 'rapido', n: 'A la rápida', d: 'Vence al Rey Ratón antes de 4 minutos', premio: 'cafe', e: '⏱️' },
  { id: 'petardos', n: 'Año Nuevo', d: 'Rompe 30 obstáculos con petardos', premio: 'bolsaPetardos', e: '🎆' },
  { id: 'cofres', n: 'Abre regalos', d: 'Abre 20 regalos', premio: 'trebol', e: '🎁' },
  { id: 'tresVictorias', n: 'Dulces sueños', d: 'Gana 3 veces', premio: 'rayoLuna', e: '💫' },
  { id: 'tranquila', n: 'Siesta', d: 'Gana en modo tranquilo', premio: null, e: '😴' },
  { id: 'pesadilla', n: 'Valiente', d: 'Gana en modo pesadilla', premio: null, e: '🦁' },
];

/* ============================================================
   PIEZAS (11 × 11)
   . suelo · R roca (sale con petardos) · X roca con premio · M mueble (no se rompe)
   C caja de cartón (se rompe a bolitazos) · P hoyo · S tachuelas · E buen lugar para enemigos
   Cada plantilla se gira y se refleja (8 versiones). El frente de cada puerta
   (la baldosa del medio de cada pared) tiene que quedar libre.
   ============================================================ */
const PLANTILLAS = [
  ['...........', '...........', '...........', '...........', '...........', '...........', '...........', '...........', '...........', '...........', '...........'],
  ['...........', '...........', '..R.....R..', '...........', '...........', '...........', '...........', '...........', '..R.....R..', '...........', '...........'],
  ['...........', '...........', '...........', '...........', '....RRR....', '....RXR....', '....RRR....', '...........', '...........', '...........', '...........'],
  ['...........', '.R.R...R.R.', '...........', '.R.......R.', '...........', '...........', '...........', '.R.......R.', '...........', '.R.R...R.R.', '...........'],
  ['...........', '...........', '..PPP.PPP..', '..P.....P..', '..P..E..P..', '...........', '..P..E..P..', '..P.....P..', '..PPP.PPP..', '...........', '...........'],
  ['...........', '...........', 'SSSS...SSSS', '...........', '...........', '..R.....R..', '...........', '...........', 'SSSS...SSSS', '...........', '...........'],
  ['...........', '.CC.....CC.', '.C.......C.', '...........', '....C.C....', '...........', '....C.C....', '...........', '.C.......C.', '.CC.....CC.', '...........'],
  ['...........', '.R.........', '..R........', '...R.......', '...........', '...........', '...........', '.......R...', '........R..', '.........R.', '...........'],
  ['...........', '...........', '..RRR......', '..R........', '..R........', '...........', '........R..', '........R..', '......RRR..', '...........', '...........'],
  ['...........', '...........', '...........', '..RRR.RRR..', '...........', '...........', '...........', '..RRR.RRR..', '...........', '...........', '...........'],
  ['...........', '.M.......M.', '...........', '...........', '....M.M....', '...........', '....M.M....', '...........', '...........', '.M.......M.', '...........'],
  ['...........', '...........', '...........', '....PPP....', '...PPPPP...', '...PPPPP...', '...PPPPP...', '....PPP....', '...........', '...........', '...........'],
  ['...........', '.S.S...S.S.', '...........', '.S.......S.', '...........', '...........', '...........', '.S.......S.', '...........', '.S.S...S.S.', '...........'],
  ['...........', '...R.......', '........R..', '.R.........', '......X....', '...........', '..R........', '.........R.', '....R......', '.......R...', '...........'],
  ['...........', '...........', '...RR.RR...', '..R.....R..', '..R..X..R..', '...........', '..R.....R..', '...RR.RR...', '...........', '...........', '...........'],
  ['PP.......PP', 'P.........P', '...........', '...........', '...........', '...........', '...........', '...........', '...........', 'P.........P', 'PP.......PP'],
  ['...........', '.RRR...RRR.', '.R.......R.', '.R.RR.RR.R.', '...........', '...R...R...', '...........', '.R.RR.RR.R.', '.R.......R.', '.RRR...RRR.', '...........'],
  ['...........', '...........', '...........', '...MMMMM...', '...MMMMM...', '...........', '...MMMMM...', '...MMMMM...', '...........', '...........', '...........'],
  ['...........', '...........', '.CCC...CCC.', '...........', '...........', '....SSS....', '...........', '...........', '.CCC...CCC.', '...........', '...........'],
  ['...........', '..S.....S..', '...........', '....RCR....', '...C...C...', '...R.X.R...', '...C...C...', '....RCR....', '...........', '..S.....S..', '...........'],
];
/* Plantillas para piezas especiales (sin enemigos). */
const PLANTILLA_JEFE = ['...........', '.R.......R.', '...........', '...........', '...........', '...........', '...........', '...........', '...........', '.R.......R.', '...........'];
const PLANTILLA_LIBRE = PLANTILLAS[0];

/* ============================================================
   TEXTOS
   ============================================================ */
const TEXTOS = {
  despierta: ['Michi despertó de un salto', 'Michi abrió los ojos de golpe', 'Michi se despertó con el corazón a mil', 'Un ruido despertó a Michi'],
  gana: ['¡Michi tuvo un sueño precioso!', 'Michi duerme tranquilo hasta mañana', 'Michi le ganó a sus miedos'],
  inicio: ['Shh… Michi se está quedando dormido', 'Esta noche, Michi sueña con su casa'],
};
