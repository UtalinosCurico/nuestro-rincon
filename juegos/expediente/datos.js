/* ============================================================
   EXPEDIENTE CURICÓ — datos
   Un juego de detectives con objetos escondidos: se registra un
   lugar, se examinan las pistas, se interroga a los sospechosos y
   se arresta a quien calza con todo lo que se sabe del culpable.
   Personajes, casos y lugares son inventados.
   ============================================================ */
const JUEGO = { clave: 'expedienteRincon_v1', resumen: 'expedienteResumen', rama: 'expediente', api: '/api/estado', version: 1 };

/* Registrar un lugar: cuántas cosas hay, cuántas se piden y cómo se puntúa. */
const BUSCA = {
  objetos: 30, lista: 7, tiempo: 80,
  base: 100, comboSeg: 4, comboMax: 6, comboPaso: 0.5,   // cada acierto seguido suma medio multiplicador
  bonoSeg: 12, bonoLimpio: 300, costoPista: 120, esperaPista: 16, castigoSeg: 3,
  sombras: 1.25,                                          // la lista en sombras paga más
  diaLista: 10, diaTiempo: 100,
};
/* Puntos acumulados en un lugar para cada estrella. */
const ESTRELLAS = [900, 2600, 5000, 8200, 12000];
/* Lo que cuesta cada paso, en estrellas. */
const COSTO = { autopsia: 1, hablar: 1, lab: 1, hablar2: 1, apurar: 1 };
const ESPERA = { autopsia: 20, lab: 35 };                 // segundos del laboratorio

const RANGOS = [[0, 'Aspirante', 'Aspirante'], [300, 'Detective', 'Detective'], [900, 'Inspector', 'Inspectora'], [2000, 'Subcomisario', 'Subcomisaria'], [3600, 'Comisario', 'Comisaria'], [6000, 'Prefecto', 'Prefecta']];
const DISTRITOS = [
  { n: 'Curicó centro', e: '🏛️', d: 'La plaza, la estación, el mercado y el teatro.' },
  { n: 'Viñas y campo', e: '🍇', d: 'Bodegas, fundos y medialunas del valle.' },
  { n: 'Costa y cordillera', e: '🌊', d: 'De las caletas de Iloca a los cerros de Los Queñes.' },
];

/* Los pelajes de Michi (mismos de la casita): michi.js busca esta tabla con este nombre. */
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

/* ------------------------------------------------------------
   OBJETOS — id | emoji | nombre | dónde suele haber
   Solo emojis antiguos (hasta 2018), para que se vean en cualquier teléfono.
   ------------------------------------------------------------ */
const OBJETOS = `
llave|🔑|Llave|casa oficina
llaveVieja|🗝️|Llave antigua|casa vino
tijeras|✂️|Tijeras|oficina taller casa ropa
paraguas|☂️|Paraguas|casa viaje
camara|📷|Cámara|viaje oficina
linterna|🔦|Linterna|taller campo viaje
vela|🕯️|Vela|casa vino
libros|📚|Libros|oficina casa
libro|📖|Libro abierto|oficina casa
copaSombrero|🎩|Sombrero de copa|ropa fiesta musica
lentes|👓|Lentes|ropa oficina
lentesSol|🕶️|Lentes de sol|ropa viaje mar
zapato|👞|Zapato|ropa
zapatilla|👟|Zapatilla|ropa deporte
taco|👠|Zapato de taco|ropa fiesta
bota|👢|Bota|ropa campo
guantes|🧤|Guantes|ropa campo taller
bufanda|🧣|Bufanda|ropa casa
mochila|🎒|Mochila|viaje
cartera|👜|Cartera|ropa
maletin|💼|Maletín|oficina viaje
maleta|🧳|Maleta|viaje
reloj|⌚|Reloj de pulsera|ropa
celular|📱|Celular|oficina casa
notebook|💻|Notebook|oficina
teclado|⌨️|Teclado|oficina
impresora|🖨️|Impresora|oficina
telefono|☎️|Teléfono|oficina casa
tele|📺|Televisor|casa
radio|📻|Radio|casa campo taller
microfono|🎙️|Micrófono|musica fiesta
despertador|⏰|Despertador|casa
relojArena|⏳|Reloj de arena|oficina casa juego
pila|🔋|Pila|taller oficina
enchufe|🔌|Enchufe|taller oficina
ampolleta|💡|Ampolleta|taller casa
extintor|🧯|Extintor|taller cocina
tambor200|🛢️|Tambor de aceite|taller campo
bolsaPlata|💰|Bolsa de plata|oficina
tarjeta|💳|Tarjeta|oficina
diamante|💎|Diamante|fiesta ropa
llaveInglesa|🔧|Llave inglesa|taller
martillo|🔨|Martillo|taller campo
picota|⛏️|Picota|campo taller
perno|🔩|Perno|taller
engranaje|⚙️|Engranaje|taller
iman|🧲|Imán|taller oficina
microscopio|🔬|Microscopio|medico oficina
catalejo|🔭|Telescopio|viaje mar
jeringa|💉|Jeringa|medico
pastillas|💊|Pastillas|medico casa
tubo|🧪|Tubo de ensayo|medico vino
canasto|🧺|Canasto|casa campo
papelH|🧻|Papel higiénico|casa
jabon|🧼|Jabón|casa
esponja|🧽|Esponja|cocina casa
escoba|🧹|Escoba|casa taller
carro|🛒|Carro de compras|comida
anfora|🏺|Ánfora|vino casa
bola|🔮|Bola de cristal|fiesta juego
peluche|🧸|Osito|casa juego
cuadro|🖼️|Cuadro|casa oficina
hilo|🧵|Carrete de hilo|ropa casa
lana|🧶|Ovillo de lana|ropa casa
cinta|🎀|Cinta|fiesta ropa
regalo|🎁|Regalo|fiesta
globo|🎈|Globo|fiesta
sobre|✉️|Sobre|oficina
caja|📦|Caja de cartón|oficina taller
lapiz|✏️|Lápiz|oficina
pluma|🖋️|Pluma|oficina
pincel|🖌️|Pincel|taller musica
crayon|🖍️|Crayón|juego
nota|📝|Nota|oficina
carpeta|📁|Carpeta|oficina
calendario|📅|Calendario|oficina
chinche|📌|Chinche|oficina
clip|📎|Clip|oficina
regla|📏|Regla|oficina taller
basurero|🗑️|Basurero|oficina casa
candado|🔒|Candado|taller casa
cadena|⛓️|Cadena|taller campo
cajaHerr|🧰|Caja de herramientas|taller
cuchillo|🔪|Cuchillo|cocina
daga|🗡️|Daga|vino casa
cubiertos|🍴|Cubiertos|cocina comida
cuchara|🥄|Cuchara|cocina
plato|🍽️|Plato|cocina comida
brujula|🧭|Brújula|viaje mar
mapa|🗺️|Mapa|viaje oficina
quitasol|⛱️|Quitasol|mar
calabaza|🎃|Calabaza|campo fiesta
entrada|🎫|Entrada|fiesta musica
boleto|🎟️|Boleto|viaje fiesta
trofeo|🏆|Trofeo|deporte oficina
medalla|🏅|Medalla|deporte
pelota|⚽|Pelota|deporte juego
tenis|🎾|Pelota de tenis|deporte
guanteBox|🥊|Guante de box|deporte
cana|🎣|Caña de pescar|mar campo
diana|🎯|Diana|juego
bolaOcho|🎱|Bola ocho|juego
control|🎮|Control|juego casa
dado|🎲|Dado|juego
puzzle|🧩|Pieza de puzzle|juego
peon|♟️|Peón|juego
naipe|🃏|Naipe|juego
mascaras|🎭|Máscaras|musica fiesta
paleta|🎨|Paleta de pintor|musica taller
audifonos|🎧|Audífonos|musica
saxo|🎷|Saxofón|musica
guitarra|🎸|Guitarra|musica campo
trompeta|🎺|Trompeta|musica
violin|🎻|Violín|musica
bombo|🥁|Tambor|musica
claqueta|🎬|Claqueta|musica
manzana|🍎|Manzana|comida campo
pera|🍐|Pera|comida campo
naranja|🍊|Naranja|comida
limon|🍋|Limón|comida cocina
platano|🍌|Plátano|comida
sandia|🍉|Sandía|comida campo
uvas|🍇|Uvas|vino comida campo
frutilla|🍓|Frutilla|comida
cerezas|🍒|Cerezas|comida campo
durazno|🍑|Durazno|comida campo
pina|🍍|Piña|comida
tomate|🍅|Tomate|comida campo
palta|🥑|Palta|comida
choclo|🌽|Choclo|comida campo
zanahoria|🥕|Zanahoria|comida campo
aji|🌶️|Ají|comida cocina
pan|🍞|Pan|comida cocina
queso|🧀|Queso|comida cocina vino
huevo|🥚|Huevo|cocina comida campo
sarten|🍳|Sartén|cocina
completo|🌭|Completo|comida
hamburguesa|🍔|Hamburguesa|comida
pizza|🍕|Pizza|comida
sushi|🍣|Sushi|comida
helado|🍦|Helado|comida mar
dona|🍩|Dona|comida
galleta|🍪|Galleta|comida cocina
torta|🎂|Torta|comida fiesta cocina
pastel|🍰|Trozo de torta|comida cocina
chocolate|🍫|Chocolate|comida
dulce|🍬|Dulce|comida fiesta
koyak|🍭|Koyak|comida fiesta
miel|🍯|Miel|comida cocina campo
leche|🥛|Vaso de leche|cocina
cafe|☕|Café|cocina oficina
te|🍵|Té|cocina casa
botella|🍾|Botella|vino fiesta
copa|🍷|Copa de vino|vino comida
coctel|🍸|Cóctel|fiesta
cerveza|🍺|Cerveza|fiesta comida
vaso|🥃|Vaso|vino fiesta
bebida|🥤|Bebida|comida
salero|🧂|Salero|cocina
tarro|🥫|Tarro de conserva|cocina comida
palillos|🥢|Palillos|cocina
cactus|🌵|Cactus|natura casa
brote|🌱|Brote|natura campo
trebol|🍀|Trébol|natura campo
hoja|🍁|Hoja seca|natura campo
hongo|🍄|Hongo|natura campo
castana|🌰|Castaña|natura campo
concha|🐚|Concha|mar natura
ramo|💐|Ramo de flores|natura fiesta casa
tulipan|🌷|Tulipán|natura
rosa|🌹|Rosa|natura fiesta
girasol|🌻|Girasol|natura campo
caracol|🐌|Caracol|natura campo
mariposa|🦋|Mariposa|natura campo
abeja|🐝|Abeja|natura campo
chinita|🐞|Chinita|natura campo
arana|🕷️|Araña|natura casa taller
telarana|🕸️|Telaraña|casa taller vino
tortuga|🐢|Tortuga|natura mar
pez|🐟|Pescado|mar comida
jaiba|🦀|Jaiba|mar comida
pulpo|🐙|Pulpo|mar
hueso|🦴|Hueso|natura campo
huellas|🐾|Huellas de animal|natura campo
ancla|⚓|Ancla|mar
velero|⛵|Velero|mar juego
bici|🚲|Bicicleta|deporte campo viaje
skate|🛹|Skate|deporte juego
camisa|👔|Camisa con corbata|ropa oficina
polera|👕|Polera|ropa
jeans|👖|Jeans|ropa
calcetines|🧦|Calcetines|ropa casa
vestido|👗|Vestido|ropa fiesta
monedero|👛|Monedero|ropa
chupalla|👒|Sombrero de paja|ropa campo
birrete|🎓|Birrete|oficina
casco|⛑️|Casco|taller campo
corona|👑|Corona|fiesta
anillo|💍|Anillo|fiesta ropa
labial|💄|Lápiz labial|ropa fiesta
jockey|🧢|Jockey|ropa deporte
campana|🔔|Campana|campo casa
disco|💿|Disco|musica oficina
disquete|💾|Disquete|oficina
cinta8|📼|Cinta de video|casa musica
filmadora|📹|Filmadora|viaje
lupa|🔍|Lupa|oficina
relojMesa|🕰️|Reloj de mesa|casa
termometro|🌡️|Termómetro|medico cocina
ladrillo|🧱|Ladrillo|taller campo
balanza|⚖️|Balanza|oficina comida
timbre|🛎️|Timbre de mesa|oficina viaje
frasco|🧴|Frasco|casa medico
alfiler|🧷|Alfiler de gancho|ropa
cigarro|🚬|Cigarro|casa fiesta
diario|📰|Diario|oficina casa
`.trim().split('\n').map(l => { const [id, e, n, t] = l.split('|'); return { id, e, n, t: t.split(' ') }; });
const OBJETO = Object.fromEntries(OBJETOS.map(o => [o.id, o]));

/* ------------------------------------------------------------
   RASGOS — lo que se llega a saber del culpable y de cada sospechoso.
   `ve`: se nota en el retrato, así que se sabe sin preguntar.
   `traza`: lo que deja ese rasgo en el arma (para los casos del archivo).
   ------------------------------------------------------------ */
const RASGOS = {
  zurdo:    { e: '✍️', si: 'Es zurd@', no: 'Es diestr@', cul: 'usa la mano izquierda', traza: 'Las huellas están marcadas con la mano izquierda.' },
  lentes:   { e: '👓', si: 'Usa lentes', no: 'No usa lentes', cul: 'usa lentes', ve: true, traza: 'Pegada, la plaqueta de unos lentes ópticos.' },
  barba:    { e: '🧔', si: 'Tiene barba', no: 'No tiene barba', cul: 'tiene barba', ve: true, soloM: true, traza: 'Tiene pegados pelos cortos y gruesos, de barba.' },
  sombrero: { e: '👒', si: 'Usa sombrero', no: 'No usa sombrero', cul: 'usa sombrero', ve: true, traza: 'Enganchada, una hebra de paja de sombrero.' },
  aros:     { e: '💎', si: 'Usa aros', no: 'No usa aros', cul: 'usa aros', ve: true, traza: 'Enganchado, el cierre dorado de un aro.' },
  canas:    { e: '🧓', si: 'Tiene canas', no: 'No tiene canas', cul: 'tiene canas', ve: true, traza: 'Hay cabellos blancos enredados.' },
  fuma:     { e: '🚬', si: 'Fuma', no: 'No fuma', cul: 'fuma', traza: 'Tiene ceniza de cigarro encima.' },
  te:       { e: '🍵', si: 'Toma té', no: 'No toma té', cul: 'toma té', traza: 'Tiene salpicaduras de té con canela.' },
  cafe:     { e: '☕', si: 'Toma café', no: 'No toma café', cul: 'toma café', traza: 'Tiene salpicaduras de café.' },
  vino:     { e: '🍷', si: 'Toma vino tinto', no: 'No toma vino', cul: 'toma vino tinto', traza: 'Tiene gotas de vino tinto.' },
  gato:     { e: '🐈', si: 'Tiene gato', no: 'No tiene gato', cul: 'tiene gato', traza: 'Tiene pelos de gato pegados.' },
  perro:    { e: '🐕', si: 'Tiene perro', no: 'No tiene perro', cul: 'tiene perro', traza: 'Tiene pelos de perro pegados.' },
  perfume:  { e: '🌸', si: 'Usa perfume', no: 'No usa perfume', cul: 'usa perfume', traza: 'Huele a perfume dulce.' },
  botas:    { e: '👢', si: 'Usa botas', no: 'No usa botas', cul: 'usa botas', traza: 'Al lado quedó marcada la suela de una bota.' },
  chicle:   { e: '🍬', si: 'Masca chicle', no: 'No masca chicle', cul: 'masca chicle', traza: 'Tiene un chicle de menta pegado.' },
  tatuaje:  { e: '🖊️', si: 'Tiene un tatuaje', no: 'No tiene tatuajes', cul: 'tiene un tatuaje' },
  maneja:   { e: '🚙', si: 'Maneja camioneta', no: 'No maneja', cul: 'maneja camioneta' },
  alto:     { e: '📏', si: 'Mide más de 1,75', no: 'Mide menos de 1,75', cul: 'mide más de 1,75' },
  nada:     { e: '🏊', si: 'Sabe nadar', no: 'No sabe nadar', cul: 'sabe nadar' },
  guitarra: { e: '🎸', si: 'Toca guitarra', no: 'No toca guitarra', cul: 'toca guitarra' },
  alergia:  { e: '🤧', si: 'Tiene alergia al polen', no: 'No tiene alergias', cul: 'tiene alergia al polen' },
};

/* Cómo se examina cada pista (los cinco minijuegos). */
const EXAMENES = {
  polvo:   { e: '🖐️', n: 'Buscar huellas', d: 'Pasa el dedo para espolvorear y después compara la huella.' },
  limpiar: { e: '🧽', n: 'Limpiar', d: 'Frota hasta que se vea lo que hay debajo.' },
  armar:   { e: '🧩', n: 'Armar el papel', d: 'Arrastra cada pedazo a su lugar.' },
  codigo:  { e: '🔢', n: 'Abrir la clave', d: 'Prueba claves: verde es número en su lugar, amarillo es número que está en otro lugar.' },
  micro:   { e: '🔬', n: 'Comparar muestras', d: 'Encuentra la muestra idéntica a la de referencia.' },
};

/* ------------------------------------------------------------
   Para los CASOS DEL ARCHIVO (se arman solos a partir de un número).
   ------------------------------------------------------------ */
const PISTAS_DE = {
  zurdo:    [{ obj: 'nota', como: 'armar', txt: 'La tinta está corrida hacia la derecha, como cuando escribe un zurdo. Esta nota la dejó el culpable.' }, { obj: 'tijeras', como: 'polvo', txt: 'Son tijeras para zurdos y tienen huellas frescas que no son de la víctima.' }],
  lentes:   [{ obj: 'lentes', como: 'limpiar', txt: 'Bajo el barro hay unos lentes ópticos con la patilla quebrada. No son de la víctima: se le cayeron al culpable.' }],
  barba:    [{ obj: 'bufanda', como: 'micro', txt: 'Entre las fibras hay pelos cortos y gruesos: de barba. La víctima no usaba.' }],
  sombrero: [{ obj: 'cinta', como: 'micro', txt: 'No es una cinta cualquiera: es el cintillo interior de un sombrero, con sudor reciente.' }],
  aros:     [{ obj: 'diamante', como: 'limpiar', txt: 'No es un diamante suelto: es la piedra de un aro. Se soltó en el forcejeo.' }],
  canas:    [{ obj: 'jockey', como: 'micro', txt: 'El jockey no es de la víctima y por dentro tiene cabellos blancos.' }],
  fuma:     [{ obj: 'cigarro', como: 'micro', txt: 'La colilla está fresca y la víctima no fumaba: el culpable esperó aquí fumando.' }],
  te:       [{ obj: 'te', como: 'micro', txt: 'Dos tazas servidas. Una tiene té con canela y la víctima solo tomaba café.' }],
  cafe:     [{ obj: 'cafe', como: 'micro', txt: 'Una taza de café cargado, todavía tibia. La víctima no tomaba café.' }],
  vino:     [{ obj: 'copa', como: 'polvo', txt: 'Dos copas de tinto. En una, huellas que no son de la víctima: alguien brindó antes.' }],
  gato:     [{ obj: 'guantes', como: 'micro', txt: 'Los guantes tienen pelos de gato pegados. La víctima no tenía gato.' }],
  perro:    [{ obj: 'huellas', como: 'limpiar', txt: 'Huellas de perro junto a las del culpable: vino con su perro o lo trae pegado en la ropa.' }],
  perfume:  [{ obj: 'sobre', como: 'micro', txt: 'El sobre huele a perfume dulce. Quien lo dejó se lo pone todos los días.' }],
  botas:    [{ obj: 'hoja', como: 'limpiar', txt: 'En la hoja quedó marcada la suela de una bota de trabajo.' }],
  chicle:   [{ obj: 'dulce', como: 'micro', txt: 'Es el envoltorio de un chicle de menta, con saliva fresca.' }],
  tatuaje:  [{ obj: 'celular', como: 'codigo', txt: 'En el celular hay una foto movida del atacante: se le ve un tatuaje en el antebrazo.' }, { obj: 'camara', como: 'codigo', txt: 'La última foto de la cámara muestra un brazo con un tatuaje.' }],
  maneja:   [{ obj: 'llave', como: 'limpiar', txt: 'Es la llave de una camioneta, con barro fresco. Se le cayó al culpable al irse.' }],
  alto:     [{ obj: 'cuadro', como: 'polvo', txt: 'El cuadro colgaba a dos metros y tiene huellas arriba: quien lo movió es alto.' }],
  nada:     [{ obj: 'polera', como: 'micro', txt: 'La polera está empapada y con algas: quien huyó lo hizo nadando.' }],
  guitarra: [{ obj: 'hilo', como: 'micro', txt: 'No es hilo: es una cuerda de guitarra cortada. El culpable la traía en el bolsillo.' }],
  alergia:  [{ obj: 'pastillas', como: 'limpiar', txt: 'Antialérgicos recién abiertos. La víctima no tenía alergias: se le cayeron al culpable.' }],
};
const ARMAS = [
  { obj: 'botella', causa: 'un golpe en la cabeza con una botella' },
  { obj: 'martillo', causa: 'un golpe con un martillo' },
  { obj: 'llaveInglesa', causa: 'un golpe con una llave inglesa' },
  { obj: 'trofeo', causa: 'un golpe con un trofeo' },
  { obj: 'anfora', causa: 'un golpe con un ánfora de greda' },
  { obj: 'cuchillo', causa: 'una herida de cuchillo' },
  { obj: 'daga', causa: 'una herida con una daga antigua' },
  { obj: 'cadena', causa: 'estrangulamiento con una cadena' },
  { obj: 'jeringa', causa: 'una inyección que le paró el corazón' },
  { obj: 'frasco', causa: 'un veneno disuelto en su bebida' },
  { obj: 'picota', causa: 'un golpe con una picota' },
  { obj: 'sarten', causa: 'un golpe con una sartén de fierro' },
];
const AMBIENTES = [
  { id: 'centro', escenas: ['plaza', 'oficina', 'cafe', 'teatro', 'biblioteca', 'estacion', 'mercado', 'cocina'],
    victimas: [['m', 'dueño de la relojería'], ['f', 'notaria'], ['f', 'directora del coro'], ['m', 'dueño del cine'], ['f', 'concejala'], ['m', 'dueño de la ferretería'], ['f', 'profesora jubilada'], ['m', 'locutor de la radio'], ['m', 'anticuario'], ['f', 'dueña de la botica']] },
  { id: 'campo', escenas: ['bodega', 'vinedo', 'taller', 'establo', 'huerta', 'cocina', 'cabana'],
    victimas: [['m', 'dueño del fundo'], ['f', 'enóloga'], ['m', 'capataz'], ['m', 'criador de caballos'], ['f', 'dueña de la quesería'], ['m', 'apicultor'], ['f', 'exportadora de cerezas'], ['m', 'dueño del vivero']] },
  { id: 'costa', escenas: ['muelle', 'cabana', 'bosque', 'cafe', 'mercado', 'taller'],
    victimas: [['m', 'dueño de la hostería'], ['m', 'buzo mariscador'], ['f', 'patrona de lancha'], ['m', 'guardaparque'], ['f', 'dueña del camping'], ['m', 'instructor de kayak'], ['f', 'dueña de la cocinería']] },
];
const NOMBRES = {
  f: ['Rosa', 'Marta', 'Elena', 'Carmen', 'Silvia', 'Gloria', 'Teresa', 'Paula', 'Javiera', 'Antonia', 'Fernanda', 'Camila', 'Valentina', 'Isidora', 'Francisca', 'Mónica', 'Verónica', 'Ximena', 'Daniela', 'Lorena', 'Patricia', 'Margarita', 'Luz', 'Bernardita'],
  m: ['Anselmo', 'Ramiro', 'Hernán', 'Gustavo', 'Ricardo', 'Sergio', 'Óscar', 'Patricio', 'Rodrigo', 'Matías', 'Benjamín', 'Tomás', 'Cristóbal', 'Ignacio', 'Felipe', 'Mauricio', 'Héctor', 'Jaime', 'Nelson', 'Rubén', 'Gonzalo', 'Eduardo', 'Lautaro', 'Clemente'],
  ap: ['Riquelme', 'Valdés', 'Poblete', 'Sepúlveda', 'Fuenzalida', 'Aravena', 'Cáceres', 'Bustamante', 'Leiva', 'Saavedra', 'Moraga', 'Vergara', 'Zúñiga', 'Navarrete', 'Urzúa', 'Bravo', 'Pavez', 'Olivares', 'Salinas', 'Cornejo', 'Maturana', 'Ibarra', 'Gajardo', 'Toledo', 'Farías', 'Henríquez', 'Villalobos', 'Cisternas'],
};
/* Quién era cada sospechoso para la víctima. {v} = nombre de la víctima. @ = o/a según quien habla. */
const VINCULOS = [
  { rol: 'soci@', d1: 'Con {v} fuimos soci@s quince años. Discutíamos, como todos los socios, pero el negocio era de los dos.', d2: 'Sí: {v} quería vender su parte a un tercero sin avisarme. Me enteré esa misma semana.', conf: 'Iba a vender todo a mis espaldas. Quince años de trabajo… No lo pensé: tomé lo primero que tuve a mano.' },
  { rol: 'sobrin@', d1: '{v} me crió. Yo le llevaba las cuentas y le hacía los trámites, nada más.', d2: 'Está bien: estoy endeudad@ hasta el cuello y la herencia me salvaba. Pero una cosa es necesitar plata…', conf: 'Cambió el testamento el martes. Me dejaba fuera después de todo lo que hice. No me iba a quedar sin nada.' },
  { rol: 'ex pareja', d1: 'Lo nuestro terminó hace años. Nos saludábamos en la feria y cada uno por su lado.', d2: 'Me seguía debiendo la mitad de la casa. Fui a cobrarle esa tarde, es verdad, pero cuando me fui estaba con vida.', conf: 'Se rió en mi cara cuando le pedí lo que era mío. Veinte años aguantando esa risa.' },
  { rol: 'emplead@ despedid@', d1: 'Trabajé ocho años ahí y me echaron con una carta. Rabia tengo, no lo voy a negar.', d2: 'Volví a buscar mis cosas esa noche. Nos gritamos. Pero yo me fui dando un portazo, nada más.', conf: 'Me echó para no pagarme los años de servicio y encima me trató de ladr@n delante de todos.' },
  { rol: 'vecin@', d1: 'Vecinos de toda la vida. Teníamos un lío por el deslinde, pero eso lo ven los abogados.', d2: 'Me corrió el cerco tres metros y me dejó sin agua para el riego. Fui a reclamarle, sí. Reclamar no es matar.', conf: 'Sin agua se me secaba todo. Fui a pedirle por las buenas y me cerró la puerta en la cara.' },
  { rol: 'competencia', d1: 'Tenemos el mismo rubro, así que amigos no éramos. Pero hay clientela para todos.', d2: 'Me estaba quitando los clientes con precios que no dan. Fui a decirle que así nos hundíamos los dos.', conf: 'Me arruinó el negocio de mi familia a propósito, y encima vino a ofrecerme comprarlo por nada.' },
  { rol: 'herman@', d1: 'Somos hermanos. Nos veíamos poco, para los cumpleaños y el dieciocho.', d2: 'Nunca me perdonó lo de la casa de la mamá. Esa noche fui a arreglar las cosas y terminamos peor.', conf: 'Se quedó con todo lo de los papás y me dejó firmar sin explicarme. Toda la vida igual.' },
  { rol: 'contador@', d1: 'Le llevo los libros desde el 2010. Todo en regla, puede revisar lo que quiera.', d2: 'Faltaba plata en la caja y {v} lo descubrió. Iba a devolverla, se lo juro, necesitaba un mes más.', conf: 'Iba a denunciarme el lunes. Con mi nombre en el diario no trabajaba nunca más en esta ciudad.' },
  { rol: 'ahijad@', d1: 'Es mi padrino de bautizo. Me ayudó a pagar los estudios; yo le debo mucho.', d2: 'Me prestó plata para el local y me la estaba cobrando con intereses de usurero. De padrino, poco.', conf: 'Me iba a quitar el local por tres cuotas atrasadas. Mi propio padrino.' },
  { rol: 'arrendatari@', d1: 'Le arriendo el galpón del fondo. Pago al día y no me meto con nadie.', d2: 'Me subió el arriendo al doble y me dio una semana para irme. Fui a pedirle más plazo.', conf: 'Una semana para sacar todo, con el invierno encima y los niños en el colegio. No me escuchó.' },
  { rol: 'amig@ de la juventud', d1: 'Nos conocemos del liceo. Jugábamos brisca todos los jueves.', d2: 'Hay algo de hace treinta años que {v} amenazaba con contar. Un accidente en el camino a Los Niches.', conf: 'Treinta años guardando ese secreto y quería contarlo ahora, por despecho. No podía dejar que hablara.' },
  { rol: 'yerno o nuera', d1: 'Soy de la familia política. Me trataba bien delante de la gente.', d2: 'Nunca me quiso en la familia. Estaba convenciendo a mi pareja de que me dejara y se llevara a los niños.', conf: 'Me iba a quitar a mi familia. Le pedí que parara y me dijo que ya había hablado con el abogado.' },
];
const COARTADAS = [
  'Esa noche estaba viendo el partido en la sede.', 'Tenía turno de noche; pregunte no más.', 'Estaba en misa de ocho, me vio medio pueblo.', 'Me quedé cuidando a mi mamá, que está enferma.',
  'Venía manejando desde Talca, llegué pasada la medianoche.', 'Estaba en un asado en Sarmiento.', 'Durmiendo: yo me levanto a las cinco.', 'En el bingo de los bomberos, hasta tarde.',
  'Cerrando la caja del local, solo.', 'En la once de mi comadre, en Romeral.', 'Arreglando la camioneta en el patio.', 'En el ensayo del conjunto folclórico.',
];
const TITULOS = ['Lo que calló {a}', 'La última noche de {a}', 'Nadie vio a {a}', 'Una deuda con {a}', 'El secreto de {a}', 'Cuentas pendientes', 'Puerta cerrada por dentro', 'Antes del amanecer', 'Silencio en {l}', 'Sombras en {l}', 'La llave que faltaba', 'Mentiras piadosas', 'A puertas cerradas', 'El testigo equivocado'];

/* Lo que dice tu compañero o compañera en cada momento. {c} = quien juega. */
const FRASES = {
  inicio: ['Llegó un caso nuevo. Vamos antes de que alguien toque algo.', 'Nos llamaron recién. Parte por registrar el lugar: yo tomo nota.', 'Otro expediente para la carpeta. Ojos abiertos.'],
  autopsia: ['Mientras el laboratorio trabaja, registra de nuevo un lugar: cada estrella nos sirve.', 'El doctor se demora un poco. Yo iría sumando estrellas.'],
  rasgo: ['Eso achica la lista. Mira las fichas.', 'Anotado en el perfil del culpable.', 'Un dato más. Ya casi lo tenemos.'],
  hablar: ['Yo pregunto, tú mírale las manos.', 'A ver qué dice. No le creas todo.', 'Tranquilidad no más: que hable.'],
  faltan: ['Nos faltan estrellas. Vuelve a registrar un lugar: mientras mejor lo hagas, más suman.', 'Sin estrellas no avanzamos. Un registro más y seguimos.'],
  arresto: ['Si calza con todo lo del perfil, es. Tú decides.', 'Revisa bien las fichas antes: un arresto equivocado nos cuesta caro.'],
  error: ['No calza. Volvamos a mirar el perfil con calma.', 'Ese no era. Nos faltó revisar un dato.'],
  cierre: ['Caso cerrado. Buen trabajo.', 'Otro expediente resuelto. Te invito un café.', 'Así da gusto. A la carpeta de resueltos.'],
};
const MICHI_DICE = ['Miau… por allá huele raro.', 'Michi olfateó algo.', '¡Prrr! Ahí.'];

if (typeof module !== 'undefined') module.exports = { JUEGO, BUSCA, ESTRELLAS, COSTO, ESPERA, RANGOS, DISTRITOS, OBJETOS, OBJETO, RASGOS, EXAMENES, PISTAS_DE, ARMAS, AMBIENTES, NOMBRES, VINCULOS, COARTADAS, TITULOS, FRASES };
