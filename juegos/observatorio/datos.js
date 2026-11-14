/* ============================================================
   DATOS DEL OBSERVATORIO
   Todo lo que define el juego y no cambia mientras se juega.
   Los montos están en pesos chilenos.
   ============================================================ */

const JUEGO = {
  version: 1,
  clave: 'observatorioRincon_v1',
  api: '/api/estado',
  rama: 'observatorio',
  dineroInicial: 5000000,
  // Reloj: una noche de 10 h dura ~4 min reales; el día pasa al doble de rápido.
  segPorHoraNoche: 24,
  segPorHoraDia: 11,
  horaInicio: 17,
  offlineTopeH: 6,        // horas reales que cuenta la ausencia
  offlineEficiencia: 0.3, // sin ustedes, el equipo rinde menos
  marcadorCada: 4 * 60000,
  respaldoCada: 9 * 60000,
  nivelesMax: 5,
};

/* Multiplicador de rendimiento y de costo de mejora por nivel (índice = nivel - 1). */
const NIVEL_RINDE = [1, 1.6, 2.3, 3.1, 4.0];
const NIVEL_COSTO = [0, 1.5, 3.2, 6.5, 13];   // costo para SUBIR desde ese nivel, × costo base

/* ------------------------------------------------------------
   SITIOS — de Elqui al Pacífico
   despejado: probabilidad de noche despejada por mes (ene → dic)
   ------------------------------------------------------------ */
const SITIOS = [
  {
    id: 'elqui', nombre: 'Valle del Elqui', lugar: 'Vicuña · Región de Coquimbo',
    lat: -30.03, lon: -70.70, utc: -3, altura: 1250,
    cielo: 0.72, turismo: 1.0, precioRef: 15000, costoLocal: 1.0,
    despejado: [0.84, 0.84, 0.82, 0.76, 0.64, 0.56, 0.56, 0.62, 0.70, 0.78, 0.82, 0.84],
    slots: 7, slotsIni: 3, costoSlot: 1.5e6, apertura: 0, requiere: null,
    paisaje: 'valle', soloRadio: false,
    texto: 'Cerros secos, parras de pisco y el cielo más famoso del país. Acá heredaron un terreno con la mejor vista del valle.',
  },
  {
    id: 'sanpedro', nombre: 'San Pedro de Atacama', lugar: 'Región de Antofagasta · 2.400 m',
    lat: -22.91, lon: -68.20, utc: -3, altura: 2400,
    cielo: 0.86, turismo: 1.35, precioRef: 26000, costoLocal: 1.3,
    despejado: [0.52, 0.56, 0.80, 0.90, 0.92, 0.93, 0.94, 0.94, 0.93, 0.92, 0.90, 0.80],
    slots: 8, slotsIni: 3, costoSlot: 18e6, apertura: 45e6, requiere: { capitulo: 3 },
    paisaje: 'volcan', soloRadio: false,
    texto: 'El desierto más seco del mundo, el Licancabur de fondo y turistas de todos lados. En enero y febrero llega el invierno altiplánico.',
  },
  {
    id: 'armazones', nombre: 'Cerro Armazones', lugar: 'Desierto de Atacama · 3.060 m',
    lat: -24.59, lon: -70.19, utc: -3, altura: 3060,
    cielo: 1.0, turismo: 0.22, precioRef: 55000, costoLocal: 1.6,
    despejado: [0.84, 0.86, 0.89, 0.91, 0.89, 0.86, 0.87, 0.89, 0.91, 0.93, 0.91, 0.87],
    slots: 6, slotsIni: 2, costoSlot: 600e6, apertura: 2.2e9, requiere: { capitulo: 5 },
    paisaje: 'cumbre', soloRadio: false,
    texto: 'Una cumbre aplanada en medio de la nada, con el aire más quieto del planeta. Aquí se construyen los gigantes.',
  },
  {
    id: 'chajnantor', nombre: 'Llano de Chajnantor', lugar: 'Altiplano · 5.000 m',
    lat: -23.02, lon: -67.75, utc: -3, altura: 5000,
    cielo: 0.95, turismo: 0.08, precioRef: 70000, costoLocal: 2.0,
    despejado: [0.55, 0.58, 0.78, 0.88, 0.90, 0.90, 0.92, 0.92, 0.90, 0.88, 0.86, 0.74],
    slots: 9, slotsIni: 3, costoSlot: 900e6, apertura: 7e9, requiere: { capitulo: 6 },
    paisaje: 'altiplano', soloRadio: true,
    texto: 'Tan alto que falta el aire. Las antenas de radio escuchan el universo de día, de noche y aunque esté nublado.',
  },
  {
    id: 'rapanui', nombre: 'Rapa Nui', lugar: 'Isla de Pascua · Pacífico',
    lat: -27.11, lon: -109.35, utc: -5, altura: 150,
    cielo: 0.9, turismo: 1.7, precioRef: 38000, costoLocal: 2.2,
    despejado: [0.70, 0.72, 0.70, 0.66, 0.60, 0.58, 0.60, 0.62, 0.66, 0.70, 0.72, 0.72],
    slots: 7, slotsIni: 3, costoSlot: 2.5e9, apertura: 25e9, requiere: { capitulo: 7 },
    paisaje: 'isla', soloRadio: false,
    texto: 'A 3.700 km del continente, sin una luz en el horizonte. Los navegantes rapa nui cruzaban el océano leyendo estas estrellas.',
  },
];
const SITIO = Object.fromEntries(SITIOS.map(s => [s.id, s]));

/* ------------------------------------------------------------
   EDIFICIOS
   cat: telescopio | turismo | infra
   publico: personas por noche que atiende en modo público
   ciencia: 🔬 por hora de noche despejada en modo ciencia
   venta:   $ por hora vendiendo tiempo de telescopio (modo ciencia)
   umbral:  🔬 acumulados para un descubrimiento
   tiempo:  segundos REALES de obra
   ------------------------------------------------------------ */
const EDIFICIOS = {
  dobson: {
    nombre: 'Telescopio Dobson', emo: '🔭', cat: 'telescopio', clase: 0,
    costo: 1.0e6, mant: 12e3, tiempo: 12,
    publico: 14, ciencia: 0.3, venta: 0, umbral: null, nota: 0.05,
    noEn: ['armazones', 'chajnantor'],
    desc: 'Un tubo grande sobre una caja de madera. Robusto, barato y perfecto para mostrarle Saturno a la gente.',
  },
  cupula: {
    nombre: 'Cúpula de 40 cm', emo: '🛖', cat: 'telescopio', clase: 1,
    costo: 8e6, mant: 70e3, tiempo: 60,
    publico: 26, ciencia: 1.4, venta: 140e3, umbral: 12, nota: 0.25,
    noEn: ['chajnantor'], requiere: { capitulo: 1 },
    desc: 'Una cúpula blanca que gira. De noche muestra nebulosas a los turistas; en modo ciencia ya descubre asteroides y estrellas variables.',
  },
  t1m: {
    nombre: 'Telescopio de 1 metro', emo: '🏛️', cat: 'telescopio', clase: 2,
    costo: 110e6, mant: 650e3, tiempo: 420,
    publico: 12, vip: true, ciencia: 5.5, venta: 1.15e6, umbral: 38, nota: 0.45,
    noEn: ['chajnantor'], requiere: { inv: 'ccd' },
    desc: 'Un instrumento profesional. En modo público hace tours VIP (cobran el triple); en modo ciencia encuentra cometas y, con espectrógrafo, exoplanetas.',
  },
  t4m: {
    nombre: 'Telescopio de 4 metros', emo: '🗼', cat: 'telescopio', clase: 3,
    costo: 1.4e9, mant: 6e6, tiempo: 1500,
    publico: 0, ciencia: 18, venta: 9.5e6, umbral: 140, nota: 0,
    cieloMin: 0.85, astroMin: 1, noEn: ['chajnantor'], requiere: { capitulo: 5 },
    desc: 'Ciencia de primer nivel: nebulosas, galaxias y supernovas. Necesita al menos un astrónomo en el sitio y un cielo excelente.',
  },
  t8m: {
    nombre: 'Telescopio de 8 metros', emo: '🌌', cat: 'telescopio', clase: 4,
    costo: 15e9, mant: 52e6, tiempo: 4200,
    publico: 0, ciencia: 70, venta: 72e6, umbral: 480, nota: 0,
    cieloMin: 0.95, astroMin: 2, ingMin: 1, noEn: ['chajnantor'], requiere: { capitulo: 7 },
    desc: 'Uno de los ojos más grandes del planeta. Encuentra agujeros negros, cuásares y planetas en la zona habitable.',
  },
  antena: {
    nombre: 'Antena de radio', emo: '📡', cat: 'telescopio', clase: 'radio',
    costo: 650e6, mant: 2.2e6, tiempo: 900,
    publico: 0, ciencia: 6, venta: 3.6e6, umbral: 85, nota: 0,
    soloEn: ['chajnantor'], ingMin: 1, radio: true, requiere: { capitulo: 6 },
    desc: 'Una parábola de 12 metros. Trabaja de día y de noche, con nubes y con luna. Cada antena extra potencia a las demás.',
  },
  solar: {
    nombre: 'Telescopio solar', emo: '☀️', cat: 'telescopio', clase: 'solar',
    costo: 28e6, mant: 120e3, tiempo: 150,
    publico: 0, publicoDia: 16, ciencia: 2.2, venta: 260e3, umbral: 20, nota: 0.1, solar: true,
    noEn: ['chajnantor'], requiere: { capitulo: 3 },
    desc: 'Trabaja cuando los demás duermen: de día muestra manchas solares a los visitantes y estudia las tormentas del Sol.',
  },
  gigante: {
    nombre: 'Telescopio Gigante', emo: '✨', cat: 'telescopio', clase: 5,
    costo: 0, mant: 380e6, tiempo: 0, unico: true,
    etapas: [
      { nombre: 'Explanada en la cumbre', costo: 25e9, tiempo: 3600 },
      { nombre: 'La cúpula más grande del mundo', costo: 40e9, tiempo: 5400 },
      { nombre: 'Montura de 3.000 toneladas', costo: 55e9, tiempo: 7200 },
      { nombre: '798 segmentos de espejo', costo: 75e9, tiempo: 9000 },
      { nombre: 'Primera luz', costo: 95e9, tiempo: 10800 },
    ],
    publico: 0, ciencia: 400, venta: 560e6, umbral: 1800, nota: 0,
    soloEn: ['armazones'], astroMin: 3, ingMin: 2, requiere: { inv: 'gigante' },
    desc: 'Un espejo de 39 metros hecho de casi 800 piezas. Cuando abra su ojo, el mundo entero va a mirar hacia acá.',
  },

  mirador: {
    nombre: 'Mirador con reposeras', emo: '🪑', cat: 'turismo',
    costo: 400e3, mant: 4e3, tiempo: 8, publico: 10, nota: 0.10,
    noEn: ['chajnantor'],
    desc: 'Reposeras, mantas y un guía con puntero láser. Para ver la Vía Láctea a ojo pelado.',
  },
  cafeteria: {
    nombre: 'Cafetería Polvo de Estrellas', emo: '☕', cat: 'turismo',
    costo: 3e6, mant: 35e3, tiempo: 40, gasto: 3200, nota: 0.12,
    noEn: ['chajnantor'],
    desc: 'Chocolate caliente, sopaipillas y pisco sour sin alcohol para la medianoche. Cada visitante gasta un poco más.',
  },
  tienda: {
    nombre: 'Tienda de recuerdos', emo: '🛍️', cat: 'turismo',
    costo: 5e6, mant: 25e3, tiempo: 40, gasto: 4200, nota: 0.04,
    noEn: ['chajnantor'],
    desc: 'Poleras, imanes y láminas impresas con las fotos de SUS descubrimientos.',
  },
  domos: {
    nombre: 'Domos de glamping', emo: '⛺', cat: 'turismo',
    costo: 14e6, mant: 90e3, tiempo: 80, camas: 8, tarifa: 70000, nota: 0.10,
    noEn: ['armazones', 'chajnantor'],
    desc: 'Burbujas con techo transparente para dormir mirando las estrellas. Alojamiento caro y siempre pedido.',
  },
  hostal: {
    nombre: 'Hostal de adobe', emo: '🏡', cat: 'turismo',
    costo: 42e6, mant: 200e3, tiempo: 200, camas: 18, tarifa: 36000, nota: 0.05,
    noEn: ['armazones', 'chajnantor'],
    desc: 'Muros de barro, patio con algarrobo y desayuno con pan amasado.',
  },
  planetario: {
    nombre: 'Planetario', emo: '🪐', cat: 'turismo',
    costo: 85e6, mant: 320e3, tiempo: 360, publicoNublado: 45, publicoDia: 35, precioDia: 3500, nota: 0.15,
    noEn: ['chajnantor'], requiere: { capitulo: 3 },
    desc: 'Una cúpula de proyección: salva las noches nubladas y de día recibe colegios.',
  },

  paneles: {
    nombre: 'Paneles solares', emo: '🔆', cat: 'infra',
    costo: 18e6, mant: 0, tiempo: 60, ahorro: 0.3,
    desc: 'Energía propia: baja la mantención del sitio y los cortes de luz dejan de importar.',
  },
  taller: {
    nombre: 'Taller de óptica', emo: '🛠️', cat: 'infra',
    costo: 22e6, mant: 80e3, tiempo: 90, fallas: 0.55, cienciaExtra: 0.06,
    desc: 'Aluminizar espejos y arreglar monturas en casa: menos fallas y un poco más de ciencia.',
  },
  residencia: {
    nombre: 'Residencia', emo: '🏢', cat: 'infra',
    costo: 45e6, mant: 160e3, tiempo: 180, cupo: 6,
    desc: 'Piezas, comedor y una sala de juegos para el equipo. Permite contratar más gente en el sitio.',
  },
};

/* ------------------------------------------------------------
   PERSONAL (por sitio)
   ------------------------------------------------------------ */
const PERSONAL = {
  guia: { nombre: 'Guías', uno: 'guía', emo: '🧭', sueldo: 32000, desc: 'Cada guía atiende a 16 personas por noche. Sin guías suficientes, la gente se aburre.' },
  astro: { nombre: 'Astrónomos', uno: 'astrónomo', emo: '🔬', sueldo: 95000, desc: '+22% de ciencia en el sitio por cada uno (rinde menos pasado el doble de telescopios científicos).' },
  inge: { nombre: 'Ingenieros', uno: 'ingeniero', emo: '🔧', sueldo: 78000, desc: '−30% de fallas y obras 15% más rápidas por cada uno. Las antenas y los gigantes los exigen.' },
};
const CUPO_PERSONAL_BASE = 8;
const CAPACIDAD_GUIA = 16;
const CAPACIDAD_PAREJA = 24;   // en Elqui, al principio, los guías son ustedes dos

/* ------------------------------------------------------------
   INVESTIGACIÓN — se paga con 🔬
   ------------------------------------------------------------ */
const INVESTIGACION = [
  { id: 'relatos', rama: 'turismo', nombre: 'Relatos del cielo ancestral', emo: '🦙', costo: 8,
    efecto: { nota: 0.15 },
    desc: 'Los guías cuentan cómo veían el cielo los pueblos diaguita, likan antai y rapa nui: la Llama del cielo cuyos ojos son Alfa y Beta Centauri, o las Siete Cabritas. +0,15 de nota.' },
  { id: 'ccd', rama: 'ciencia', nombre: 'Cámara CCD', emo: '📷', costo: 12,
    efecto: { ciencia: 0.25 }, desc: 'Un sensor digital refrigerado: +25% de ciencia. Además permite construir el telescopio de 1 metro.' },
  { id: 'preventiva', rama: 'operacion', nombre: 'Mantención preventiva', emo: '🧰', costo: 15,
    efecto: { fallas: 0.4 }, desc: '−40% de fallas en todos los telescopios.' },
  { id: 'parejas', rama: 'turismo', nombre: 'Tour para enamorados', emo: '💞', costo: 22, requiere: ['relatos'],
    efecto: { demanda: 0.10, precio: 0.12 },
    desc: 'Mantas para dos, chocolate caliente y una estrella para cada pareja. +10% de demanda y +12% al precio de referencia. El 14 de febrero se repleta.' },
  { id: 'bilingue', rama: 'turismo', nombre: 'Guías bilingües', emo: '🗣️', costo: 30,
    efecto: { demanda: 0.15, precio: 0.08 }, desc: 'Llegan turistas de todo el mundo: +15% de demanda y +8% al precio de referencia.' },
  { id: 'espectro', rama: 'ciencia', nombre: 'Espectrógrafo', emo: '🌈', costo: 45, requiere: ['ccd'],
    efecto: { ciencia: 0.15 }, desc: 'Separa la luz en colores para leer de qué están hechas las cosas. +15% de ciencia y los telescopios de 1 m o más empiezan a encontrar exoplanetas.' },
  { id: 'luna', rama: 'turismo', nombre: 'Tour de luna llena', emo: '🌕', costo: 35,
    efecto: { lunaTour: true }, desc: 'Con luna llena se ven pocas estrellas… pero la Luna por telescopio es un espectáculo. La luna llena deja de bajar la nota.' },
  { id: 'filtros', rama: 'ciencia', nombre: 'Filtros de banda angosta', emo: '🎛️', costo: 70, requiere: ['ccd'],
    efecto: { lunaCiencia: 0.6 }, desc: 'Dejan pasar solo la luz del hidrógeno y el oxígeno: la Luna casi no molesta a la ciencia y aparecen nebulosas.' },
  { id: 'astrofoto', rama: 'turismo', nombre: 'Taller de astrofotografía', emo: '🖼️', costo: 60, requiere: ['bilingue'],
    efecto: { tienda: 0.6 }, desc: 'Los turistas se llevan la foto de la nebulosa que vieron. La tienda vende +60%.' },
  { id: 'escolar', rama: 'turismo', nombre: 'Programa escolar', emo: '🎒', costo: 80,
    efecto: { escolar: 1.0, fama: 0.05 }, desc: 'Los planetarios reciben el doble de cursos de día y el observatorio se hace conocido.' },
  { id: 'sismica', rama: 'operacion', nombre: 'Aislación sísmica', emo: '🏗️', costo: 110,
    efecto: { sismo: 0.7 }, desc: 'Las monturas flotan sobre amortiguadores: los temblores casi no hacen daño. Chile es así.' },
  { id: 'microrred', rama: 'operacion', nombre: 'Microrred solar', emo: '⚡', costo: 120,
    efecto: { mant: 0.15 }, desc: '−15% de mantención en todos los sitios.' },
  { id: 'reservas', rama: 'turismo', nombre: 'App de reservas', emo: '📱', costo: 140, requiere: ['bilingue'],
    efecto: { demanda: 0.18 }, desc: 'Reservas en línea y recordatorios: +18% de demanda.' },
  { id: 'transitos', rama: 'ciencia', nombre: 'Fotometría de tránsitos', emo: '📉', costo: 160, requiere: ['espectro'],
    efecto: { suerte: 0.15 }, desc: 'Medir cómo baja el brillo de una estrella cuando un planeta le pasa por delante. Descubrimientos más raros.' },
  { id: 'altura', rama: 'operacion', nombre: 'Logística de altura', emo: '🚙', costo: 800,
    efecto: { remoto: 0.2 }, desc: 'Turnos, oxígeno y camionetas 4x4: −20% en obras y mantención de los sitios remotos.' },
  { id: 'convenios', rama: 'operacion', nombre: 'Convenios internacionales', emo: '🤝', costo: 1400, requiere: ['transitos'],
    efecto: { venta: 0.3 }, desc: 'Universidades de todo el mundo compran tiempo de telescopio: +30% a la venta de tiempo.' },
  { id: 'redes', rama: 'turismo', nombre: 'Campaña en redes', emo: '✨', costo: 1100, requiere: ['reservas'],
    efecto: { demanda: 0.25 }, desc: 'Un video de la Vía Láctea sobre los domos se hace viral: +25% de demanda.' },
  { id: 'aoptica', rama: 'ciencia', nombre: 'Óptica adaptativa', emo: '🟠', costo: 2400, requiere: ['filtros', 'transitos'],
    efecto: { cienciaGrande: 0.6, laser: true }, desc: 'Un láser crea una estrella artificial y el espejo se deforma mil veces por segundo para corregir la atmósfera. +60% de ciencia en telescopios de 4 m o más.' },
  { id: 'interfer', rama: 'ciencia', nombre: 'Interferometría', emo: '🔗', costo: 3500, requiere: ['espectro'],
    efecto: { sinergia: 0.04 }, desc: 'Las antenas se combinan como si fueran un solo plato gigante: cada antena potencia más a las otras.' },
  { id: 'ia', rama: 'ciencia', nombre: 'Clasificación con IA', emo: '🧠', costo: 6000, requiere: ['aoptica'],
    efecto: { ciencia: 0.3, umbral: 0.2 }, desc: 'Una red neuronal revisa cada imagen: +30% de ciencia y descubrimientos más seguidos.' },
  { id: 'gigante', rama: 'operacion', nombre: 'Diseño del Telescopio Gigante', emo: '📐', costo: 11000, requiere: ['aoptica', 'convenios'],
    efecto: {}, desc: 'Los planos de un espejo de 39 metros. Permite empezar el Gigante en Cerro Armazones.' },
  { id: 'infrarrojo', rama: 'ciencia', nombre: 'Cámaras infrarrojas', emo: '🔴', costo: 18000, requiere: ['ia'],
    efecto: { suerte: 0.25 }, desc: 'Ver a través del polvo y hasta el principio del tiempo. Descubrimientos mucho más raros.' },
];
const INV = Object.fromEntries(INVESTIGACION.map(i => [i.id, i]));

/* ------------------------------------------------------------
   DESCUBRIMIENTOS
   ------------------------------------------------------------ */
const RAREZAS = [
  { id: 'comun', nombre: 'Común', color: '#a9bccf', valor: 1 },
  { id: 'poco', nombre: 'Poco común', color: '#7fd6a6', valor: 2.5 },
  { id: 'raro', nombre: 'Raro', color: '#74b8ff', valor: 6 },
  { id: 'epico', nombre: 'Épico', color: '#c592ff', valor: 15 },
  { id: 'legendario', nombre: 'Legendario', color: '#ffcb5c', valor: 40 },
  { id: 'mitico', nombre: 'Mítico', color: '#ff86bd', valor: 120 },
];
const RAREZA_IDX = Object.fromEntries(RAREZAS.map((r, i) => [r.id, i]));

/* Probabilidad de cada rareza según la clase del telescopio. */
const PESOS_RAREZA = {
  1: [70, 25, 5, 0, 0, 0],
  2: [48, 32, 15, 5, 0, 0],
  3: [28, 34, 24, 11, 3, 0],
  4: [14, 28, 30, 19, 8, 1],
  5: [4, 14, 28, 30, 18, 6],
  radio: [26, 30, 26, 13, 5, 0],
  solar: [62, 30, 8, 0, 0, 0],
};

const TIPOS = {
  asteroide: { nombre: 'Asteroide', rareza: 'comun', clases: [1, 2, 3], arte: 'asteroide',
    desc: 'Una roca que da vueltas entre Marte y Júpiter. Ahora tiene número oficial y, si quieren, nombre.' },
  variable: { nombre: 'Estrella variable', rareza: 'comun', clases: [1, 2, 3, 4], arte: 'estrella',
    desc: 'Una estrella que late: su brillo sube y baja cada pocos días.' },
  doble: { nombre: 'Estrella doble', rareza: 'comun', clases: [1, 2], arte: 'doble',
    desc: 'Dos soles bailando uno alrededor del otro.' },
  cumulo: { nombre: 'Cúmulo abierto', rareza: 'poco', clases: [1, 2, 3], arte: 'cumulo',
    desc: 'Un puñado de estrellas hermanas que nacieron de la misma nube.' },
  cometa: { nombre: 'Cometa', rareza: 'raro', clases: [1, 2, 3], arte: 'cometa',
    desc: 'Una bola de hielo sucio que viene del borde del sistema solar con la cola encendida.' },
  globular: { nombre: 'Cúmulo globular', rareza: 'poco', clases: [2, 3, 4], arte: 'globular',
    desc: 'Cien mil estrellas viejísimas apretadas en una bola.' },
  planetaria: { nombre: 'Nebulosa planetaria', rareza: 'raro', clases: [2, 3, 4], arte: 'planetaria', requiere: 'filtros',
    desc: 'El último suspiro de una estrella como el Sol: una burbuja de gas de colores.' },
  rocoso: { nombre: 'Exoplaneta rocoso', rareza: 'poco', clases: [2, 3, 4], arte: 'planeta', requiere: 'espectro',
    desc: 'Un mundo de roca orbitando otra estrella.' },
  caliente: { nombre: 'Júpiter caliente', rareza: 'poco', clases: [2, 3, 4], arte: 'gaseoso', requiere: 'espectro',
    desc: 'Un gigante gaseoso pegado a su estrella: un año le dura tres días.' },
  minineptuno: { nombre: 'Mini-Neptuno', rareza: 'raro', clases: [3, 4], arte: 'gaseoso', requiere: 'espectro',
    desc: 'Más grande que la Tierra y más chico que Neptuno: el tipo de planeta más común… que no existe en nuestro sistema.' },
  anillos: { nombre: 'Planeta con anillos', rareza: 'epico', clases: [3, 4, 5], arte: 'anillos', requiere: 'espectro',
    desc: 'Un Saturno lejano, con anillos que se ven por la sombra que hacen.' },
  emision: { nombre: 'Nebulosa de emisión', rareza: 'raro', clases: [3, 4, 5], arte: 'nebulosa', requiere: 'filtros',
    desc: 'Una nube de hidrógeno brillando en rojo: una guardería de estrellas.' },
  marron: { nombre: 'Enana marrón', rareza: 'raro', clases: [3, 4], arte: 'marron',
    desc: 'Demasiado grande para ser planeta, demasiado chica para ser estrella.' },
  espiral: { nombre: 'Galaxia espiral', rareza: 'raro', clases: [3, 4, 5], arte: 'espiral',
    desc: 'Otra Vía Láctea, a millones de años luz, girando con sus brazos abiertos.' },
  eliptica: { nombre: 'Galaxia elíptica', rareza: 'poco', clases: [3, 4, 5], arte: 'eliptica',
    desc: 'Una galaxia vieja y redonda, sin brazos, llena de estrellas rojas.' },
  supernova: { nombre: 'Supernova', rareza: 'epico', clases: [3, 4, 5], arte: 'supernova',
    desc: 'Una estrella que explotó y por unas semanas brilla más que su galaxia entera.' },
  lente: { nombre: 'Lente gravitacional', rareza: 'epico', clases: [4, 5], arte: 'lente',
    desc: 'La gravedad de un cúmulo dobla la luz de una galaxia de atrás y la convierte en un anillo.' },
  cuasar: { nombre: 'Cuásar', rareza: 'epico', clases: [4, 5], arte: 'cuasar',
    desc: 'Un agujero negro devorando tanto que brilla más que mil galaxias.' },
  habitable: { nombre: 'Planeta en zona habitable', rareza: 'legendario', clases: [4, 5], arte: 'habitable', requiere: 'espectro',
    desc: 'A la distancia justa de su estrella para tener agua líquida. Quizás alguien mire hacia acá.' },
  agujero: { nombre: 'Agujero negro', rareza: 'legendario', clases: [4, 5], arte: 'agujero',
    desc: 'Nada se escapa, ni la luz. Se ve por el disco de gas que gira alrededor.' },
  oceano: { nombre: 'Mundo océano', rareza: 'mitico', clases: [5], arte: 'oceano',
    desc: 'Un planeta cubierto entero por un mar, con nubes y tormentas. El primero.' },
  primeras: { nombre: 'Galaxia del amanecer', rareza: 'mitico', clases: [5], arte: 'primeras', requiere: 'infrarrojo',
    desc: 'Una de las primeras galaxias del universo: su luz salió hace 13.400 millones de años.' },
  molecular: { nombre: 'Nube molecular', rareza: 'poco', clases: ['radio'], arte: 'molecular',
    desc: 'Una nube fría de gas y polvo donde todavía no prende ninguna estrella.' },
  pulsar: { nombre: 'Púlsar', rareza: 'raro', clases: ['radio'], arte: 'pulsar',
    desc: 'Una estrella de neutrones que gira cientos de veces por segundo, como un faro.' },
  disco: { nombre: 'Disco protoplanetario', rareza: 'epico', clases: ['radio'], arte: 'disco',
    desc: 'Un disco de polvo con surcos: ahí mismo se están formando planetas.' },
  magnetar: { nombre: 'Magnetar', rareza: 'epico', clases: ['radio'], arte: 'magnetar',
    desc: 'El imán más potente del universo.' },
  frb: { nombre: 'Ráfaga rápida de radio', rareza: 'legendario', clases: ['radio'], arte: 'frb',
    desc: 'Un destello de un milisegundo que viajó millones de años. Nadie sabe bien qué lo produce.' },
  agua: { nombre: 'Agua alrededor de una estrella joven', rareza: 'legendario', clases: ['radio'], arte: 'agua',
    desc: 'Vapor de agua en el disco donde nacen planetas. La receta de los océanos.' },
  mancha: { nombre: 'Grupo de manchas solares', rareza: 'comun', clases: ['solar'], arte: 'sol',
    desc: 'Zonas más frías del Sol, cada una más grande que la Tierra.' },
  fulguracion: { nombre: 'Fulguración solar', rareza: 'poco', clases: ['solar'], arte: 'sol',
    desc: 'Una explosión magnética en la superficie del Sol.' },
  eyeccion: { nombre: 'Eyección de masa coronal', rareza: 'raro', clases: ['solar'], arte: 'sol',
    desc: 'Mil millones de toneladas de plasma lanzadas al espacio. Si apunta a la Tierra, hay auroras.' },
  granCometa: { nombre: 'Gran cometa', rareza: 'legendario', clases: ['evento'], arte: 'cometa',
    desc: 'Un cometa que se ve a ojo pelado. Pasa una vez cada muchos años, y ustedes lo catalogaron.' },
  estrella28: { nombre: 'Estrella del 28 de diciembre', rareza: 'mitico', clases: ['evento'], arte: 'estrella28',
    desc: 'Aparece una sola vez al año, el día en que empezó todo. Las 17:50 de un domingo.' },
};

/* ------------------------------------------------------------
   CALENDARIO — fechas reales de Chile
   ------------------------------------------------------------ */
const LLUVIAS = [
  { nombre: 'Cuadrántidas', desde: [1, 1], hasta: [1, 5], tasa: 0.3 },
  { nombre: 'Líridas', desde: [4, 19], hasta: [4, 24], tasa: 0.4 },
  { nombre: 'Eta Acuáridas', desde: [5, 2], hasta: [5, 9], tasa: 1.0 },
  { nombre: 'Delta Acuáridas', desde: [7, 26], hasta: [8, 1], tasa: 0.6 },
  { nombre: 'Perseidas', desde: [8, 9], hasta: [8, 14], tasa: 0.5 },
  { nombre: 'Oriónidas', desde: [10, 18], hasta: [10, 24], tasa: 0.6 },
  { nombre: 'Leónidas', desde: [11, 14], hasta: [11, 19], tasa: 0.6 },
  { nombre: 'Gemínidas', desde: [12, 10], hasta: [12, 16], tasa: 0.8 },
];

/* Temporadas turísticas: [mes, día] inclusive. Se combinan multiplicando. */
const TEMPORADAS = [
  { nombre: 'Vacaciones de verano', desde: [1, 1], hasta: [2, 28], demanda: 1.45, emo: '🏖️' },
  { nombre: 'Fiestas de fin de año', desde: [12, 20], hasta: [12, 31], demanda: 1.35, emo: '🎆' },
  { nombre: 'Temporada baja', desde: [5, 1], hasta: [6, 30], demanda: 0.75, emo: '🍂' },
  { nombre: 'Vacaciones de invierno', desde: [7, 7], hasta: [7, 25], demanda: 1.3, emo: '🧣' },
  { nombre: 'Fiestas Patrias', desde: [9, 16], hasta: [9, 21], demanda: 1.6, emo: '🇨🇱' },
  { nombre: 'Día de los enamorados', desde: [2, 14], hasta: [2, 14], demanda: 1.6, parejas: 3, emo: '💘' },
  { nombre: 'Aniversario de Catalina y Diego', desde: [12, 28], hasta: [12, 28], demanda: 1.5, emo: '💛', aniversario: true },
];

/* ------------------------------------------------------------
   EVENTOS AL AZAR (se sortean al amanecer para la noche siguiente)
   ------------------------------------------------------------ */
const EVENTOS = [
  { id: 'viento', prob: 0.10, sitios: ['armazones', 'chajnantor'], noches: 1, emo: '🌬️',
    texto: 'Viento blanco en la cumbre: las cúpulas trabajan a medias.', efecto: { cienciaOptica: 0.5 } },
  { id: 'polvo', prob: 0.07, sitios: ['sanpedro'], noches: 1, emo: '🌪️',
    texto: 'Tormenta de polvo en el salar: el cielo se ve lechoso.', efecto: { cielo: -0.25 } },
  { id: 'corte', prob: 0.035, noches: 1, emo: '🔌',
    texto: 'Corte de luz en el pueblo. Sin paneles solares, la noche se pierde.', efecto: { corte: true } },
  { id: 'sismo', prob: 0.012, noches: 0, emo: '🫨',
    texto: 'Temblor grado 6,1. Chile es así: hay que revisar los telescopios.', efecto: { sismo: true } },
  { id: 'cometa', prob: 0.012, noches: 5, global: true, emo: '☄️',
    texto: 'Apareció un cometa brillante en el cielo del amanecer. La gente quiere verlo.', efecto: { demanda: 0.4, granCometa: true } },
  { id: 'eclipseLunar', prob: 0.006, noches: 1, global: true, emo: '🌘',
    texto: 'Esta noche hay eclipse de Luna: la Luna se pone roja.', efecto: { demanda: 0.8, nota: 0.3 } },
  { id: 'aurora', prob: 0.004, noches: 1, global: true, emo: '🌌', requiereEdificio: 'solar',
    texto: 'Una tormenta solar enorme: el telescopio solar la vio venir y sale en las noticias.', efecto: { fama: 0.04 } },
];

/* Decisiones: llegan como carta y hay que elegir. */
const DECISIONES = [
  { id: 'vip', prob: 0.05, minVisitas: 300, emo: '🎬',
    titulo: 'Una actriz quiere el observatorio para ella sola',
    texto: 'Pide un tour privado esta noche en {sitio}. Paga muy bien, pero hay que cancelar las reservas.',
    opciones: [
      { txt: 'Aceptar', efecto: { cerrarNoche: true, dineroNoches: 2.6, fama: 0.06 }, res: 'Se sacó fotos con la Cruz del Sur y nos etiquetó. +fama' },
      { txt: 'Rechazar con cariño', efecto: {}, res: 'Los turistas de esta noche ni se enteraron.' },
    ] },
  { id: 'influencer', prob: 0.06, minVisitas: 150, emo: '🤳',
    titulo: 'Un influencer pide entrar gratis',
    texto: 'Tiene 800 mil seguidores y promete un video. «Es por exposición».',
    opciones: [
      { txt: 'Que venga', efecto: { demandaNoches: [0.3, 3], nota: -0.05 }, res: 'El video anduvo bien: más reservas por unos días.' },
      { txt: 'Que pague como todos', efecto: { azar: [{ p: 0.5, fama: 0.02, res: 'Pagó y el video igual salió precioso.' }, { p: 0.5, nota: -0.1, res: 'Se enojó y nos dejó una reseña de una estrella.' }] } },
    ] },
  { id: 'perrito', prob: 0.04, unaVez: true, emo: '🐕',
    titulo: 'Un perrito adoptó el observatorio',
    texto: 'Llega todas las noches, se echa al lado del Dobson y los turistas lo aman.',
    opciones: [
      { txt: 'Adoptarlo (se llamará Cometa)', efecto: { mascota: 'Cometa', notaPermanente: 0.06, dinero: -150000 }, res: 'Cometa ya tiene placa, vacunas y una cama al lado de la cafetería. +nota para siempre.' },
      { txt: 'Buscarle una familia', efecto: { fama: 0.01 }, res: 'Se lo llevó una pareja de turistas de Talca. Mandan fotos.' },
    ] },
  { id: 'boda', prob: 0.035, minVisitas: 500, emo: '💍',
    titulo: 'Una pareja quiere casarse bajo las estrellas',
    texto: 'Ceremonia a medianoche en {sitio}, con 60 invitados y la Vía Láctea de testigo.',
    opciones: [
      { txt: '¡Sí, acepto!', efecto: { dineroNoches: 1.4, fama: 0.03, nota: 0.05 }, res: 'Lloramos todos. Hasta el guía.' },
      { txt: 'No organizamos eventos', efecto: {}, res: 'Se casaron en una viña cerca. Igual vinieron al tour.' },
    ] },
  { id: 'luces', prob: 0.035, minVisitas: 200, emo: '💡',
    titulo: 'Una empresa instaló focos cerca',
    texto: 'Unos reflectores nuevos apuntan al cielo y ensucian la noche en {sitio}. Chile tiene norma lumínica.',
    opciones: [
      { txt: 'Negociar luminarias apantalladas', efecto: { dineroNoches: -0.8 }, res: 'Cambiaron los focos. El cielo volvió a ser oscuro.' },
      { txt: 'Hacer la denuncia', efecto: { cieloNoches: [-0.12, 4] }, res: 'La autoridad tardó, pero los obligó a cambiarlos.' },
      { txt: 'No hacer nada', efecto: { cieloNoches: [-0.15, 14] }, res: 'El cielo quedó lechoso por dos semanas.' },
    ] },
  { id: 'colegio', prob: 0.05, emo: '🚌',
    titulo: 'Un colegio rural pide una visita',
    texto: 'Treinta niños de un pueblo cercano nunca han mirado por un telescopio. No tienen cómo pagar.',
    opciones: [
      { txt: 'Recibirlos gratis', efecto: { fama: 0.025, nota: 0.04, dinero: -80000 }, res: 'Una niña dijo que quiere ser astrónoma. Valió cada peso.' },
      { txt: 'Ofrecer precio rebajado', efecto: { fama: 0.008 }, res: 'Vinieron igual, con rifa y todo.' },
    ] },
  { id: 'pedida', prob: 0.04, minVisitas: 120, emo: '💍',
    titulo: 'Quiere pedirle matrimonio en el telescopio',
    texto: 'Un cabro reservó para dos en {sitio}. Quiere mostrarle Saturno y, cuando ella mire por el ocular, tener el anillo en la mano.',
    opciones: [
      { txt: 'Ayudarlo: que el guía le pase el anillo', efecto: { nota: 0.08, fama: 0.02 }, res: 'Dijo que sí. Aplaudieron todos y el guía lloró de nuevo.' },
      { txt: 'Que se las arregle solo', efecto: { azar: [{ p: 0.5, nota: 0.03, res: 'Dijo que sí igual, con los anillos de Saturno de testigos.' }, { p: 0.5, res: 'Se le cayó el anillo al pedregal. Lo encontramos al otro día con linterna roja.' }] } },
    ] },
  { id: 'cumple', prob: 0.045, minVisitas: 80, emo: '🎂',
    titulo: 'Cumpleaños bajo las estrellas',
    texto: 'Una familia quiere celebrar los 80 de la abuela en {sitio}: nunca ha visto la Luna por un telescopio.',
    opciones: [
      { txt: 'Ponemos la torta nosotros', efecto: { dinero: -60000, nota: 0.06, fama: 0.01 }, res: 'La abuela vio los cráteres y dijo «se parece al queque que se me quemó». Reseña de cinco estrellas.' },
      { txt: 'Solo el tour', efecto: { nota: 0.01 }, res: 'Trajeron su propia torta. Quedaron migas en el Dobson.' },
    ] },
  { id: 'ovni', prob: 0.04, minVisitas: 200, emo: '🛸',
    titulo: 'Llamaron del matinal por un «ovni»',
    texto: 'Un vecino jura que vio luces raras sobre {sitio}. El matinal quiere un despacho en vivo desde el observatorio.',
    opciones: [
      { txt: 'Explicar en vivo que era Venus', efecto: { azar: [{ p: 0.6, fama: 0.03, demandaNoches: [0.2, 2], res: 'El video «Siempre es Venus» se hizo viral. Más reservas.' }, { p: 0.4, nota: -0.03, res: 'El conductor quería marcianos. Cortaron el despacho a los dos minutos.' }] } },
      { txt: 'Seguirles el juego', efecto: { demandaNoches: [0.35, 2], nota: -0.08 }, res: 'Llegaron cazadores de ovnis. Se fueron desilusionados, pero pagaron la entrada.' },
      { txt: 'No dar entrevistas', efecto: {}, res: 'Fueron a entrevistar al vecino. Quedó famoso él.' },
    ] },
  { id: 'zorro', prob: 0.045, minVisitas: 100, emo: '🦊',
    titulo: 'Un zorro se está robando las sopaipillas',
    texto: 'Aparece todas las noches al lado de la cafetería de {sitio}. Los turistas le sacan fotos; la cocinera no lo quiere ni ver.',
    opciones: [
      { txt: 'Basureros con tapa y letreros', efecto: { dinero: -90000, nota: 0.04 }, res: 'El zorro sigue pasando, pero ahora solo a saludar.' },
      { txt: 'Dejarlo: es la estrella del tour', efecto: { azar: [{ p: 0.6, fama: 0.02, res: 'Ya tiene nombre: Sirio. Sale en todas las fotos.' }, { p: 0.4, nota: -0.06, res: 'Se llevó la once de una señora. Reseña de dos estrellas.' }] } },
    ] },
  { id: 'tesis', prob: 0.04, minCiencia: 10, emo: '🎓',
    titulo: 'Una estudiante pide noches para su tesis',
    texto: 'Estudia estrellas variables y no tiene telescopio. Pide unas horas en {sitio} antes de que cierre su plazo.',
    opciones: [
      { txt: 'Prestarle el telescopio', efecto: { dineroNoches: -0.3, fama: 0.03 }, res: 'Defendió con nota máxima y nos puso en los agradecimientos.' },
      { txt: 'Cobrarle el tiempo', efecto: { dineroNoches: 0.25 }, res: 'Pagó con lo que le quedaba de la beca. Ojalá le resulte.' },
    ] },
  { id: 'astrofotos', prob: 0.04, minVisitas: 250, emo: '📸',
    titulo: 'Un curso de astrofotografía pide apagar todo',
    texto: 'Veinte fotógrafos quieren una noche en {sitio} sin una sola luz: ni la cafetería, ni la tienda, ni los letreros.',
    opciones: [
      { txt: 'Apagar todo por una noche', efecto: { dineroNoches: -0.25, cieloNoches: [0.1, 1], nota: 0.05 }, res: 'Sacaron la mejor foto de la Vía Láctea que hemos visto. Nos regalaron una copia.' },
      { txt: 'No se puede', efecto: {}, res: 'Se fueron a un cerro vecino. Igual quedaron buenas.' },
    ] },
  { id: 'fondo', prob: 0.05, minCiencia: 20, emo: '📜',
    titulo: 'Se abrió un fondo de investigación',
    texto: 'Postular cuesta tiempo de los astrónomos ({costo} 🔬). Si sale, el fondo financia una buena parte de la operación.',
    opciones: [
      { txt: 'Postular', efecto: { postular: true }, res: 'Postulación enviada. La respuesta llega al amanecer.' },
      { txt: 'Ahora no', efecto: {}, res: 'Será para la próxima.' },
    ] },
];

/* ------------------------------------------------------------
   ENCARGOS — pedidos con plazo (en noches)
   ------------------------------------------------------------ */
const ENCARGOS = [
  { id: 'gala', emo: '🥂', titulo: 'Noche de gala',
    texto: 'Una agencia de viajes quiere {meta} visitantes en una sola noche en {sitio}, con nota 4,0 o más.',
    tipo: 'visitasNoche', noches: 4, metaBase: 1.15 },
  { id: 'asteroide', emo: '🪨', titulo: 'Seguimiento de un asteroide cercano',
    texto: 'Una agencia espacial necesita {meta} 🔬 de observaciones antes de que pase cerca de la Tierra.',
    tipo: 'ciencia', noches: 3, metaBase: 1.6, requiereCiencia: true },
  { id: 'catalogo', emo: '🗂️', titulo: 'Catálogo para una universidad',
    texto: 'Piden {meta} descubrimientos nuevos para un catálogo.',
    tipo: 'descubrimientos', noches: 5, metaBase: 1, requiereCiencia: true },
  { id: 'documental', emo: '🎥', titulo: 'Documental de la Vía Láctea',
    texto: 'Un equipo de televisión necesita {meta} noches despejadas con turistas en {sitio}.',
    tipo: 'noches', noches: 6, metaBase: 3 },
  { id: 'temporada', emo: '🎟️', titulo: 'Paquete turístico',
    texto: 'Una agencia vende un paquete de {meta} visitantes en total, repartidos en los próximos días.',
    tipo: 'visitas', noches: 5, metaBase: 3.2 },
  { id: 'campamento', emo: '🏕️', titulo: 'Campamento de astronomía',
    texto: 'Un club de aficionados trae su campamento de verano: {meta} visitantes en total, repartidos en los próximos días.',
    tipo: 'visitas', noches: 4, metaBase: 2.6 },
  { id: 'cometaNuevo', emo: '☄️', titulo: 'Confirmar un cometa',
    texto: 'Un aficionado cree haber visto un cometa nuevo. Hacen falta {meta} 🔬 de observaciones para confirmarlo antes que nadie.',
    tipo: 'ciencia', noches: 2, metaBase: 1.1, requiereCiencia: true },
  { id: 'resenas', emo: '⭐', titulo: 'Guía de viajes',
    texto: 'Una guía de viajes va a publicar sobre {sitio}: necesitan ver nota promedio de 4,4 o más durante {noches} noches.',
    tipo: 'nota', noches: 4, metaBase: 4.4 },
];

/* ------------------------------------------------------------
   CAPÍTULOS — la historia del observatorio
   ------------------------------------------------------------ */
const CAPITULOS = [
  { titulo: 'Primera luz', texto: 'Heredaron un terreno en el Valle del Elqui. Hay que armar el primer telescopio y recibir a la primera gente.',
    metas: [
      { id: 'c1a', txt: 'Construye un telescopio Dobson', f: e => contarEdificios(e, 'dobson') >= 1 },
      { id: 'c1b', txt: 'Arma un mirador con reposeras', f: e => contarEdificios(e, 'mirador') >= 1 },
      { id: 'c1c', txt: 'Recibe a tus primeros 40 visitantes', f: e => e.stats.visitantes >= 40 },
    ],
    premio: { dinero: 6e6, ciencia: 10, monedas: 30, xp: 25 } },
  { titulo: 'Noches de turismo', texto: 'El boca a boca empieza a funcionar. Hay que hacer que la gente se vaya feliz.',
    metas: [
      { id: 'c2a', txt: 'Contrata 2 guías en Elqui', f: e => e.sitios.elqui.staff.guia >= 2 },
      { id: 'c2b', txt: 'Abre la cafetería', f: e => contarEdificios(e, 'cafeteria') >= 1 },
      { id: 'c2c', txt: 'Llega a nota 4,0 en Elqui', f: e => e.sitios.elqui.nota >= 4.0 && e.sitios.elqui.n >= 60 },
      { id: 'c2d', txt: 'Suma 300 visitantes', f: e => e.stats.visitantes >= 300 },
    ],
    premio: { dinero: 25e6, ciencia: 15, monedas: 40, xp: 35 } },
  { titulo: 'Ciencia de verdad', texto: 'Un telescopio que no solo muestra: también descubre.',
    metas: [
      { id: 'c3a', txt: 'Construye la cúpula de 40 cm', f: e => contarEdificios(e, 'cupula') >= 1 },
      { id: 'c3b', txt: 'Investiga la cámara CCD', f: e => !!e.inv.ccd },
      { id: 'c3c', txt: 'Haz tu primer descubrimiento', f: e => e.stats.descubrimientos >= 1 },
      { id: 'c3d', txt: 'Bautiza un descubrimiento', f: e => e.stats.bautizados >= 1 },
    ],
    premio: { dinero: 40e6, ciencia: 25, monedas: 50, xp: 45 } },
  { titulo: 'El desierto más seco', texto: 'San Pedro de Atacama: más turistas, cielo más limpio y un volcán de fondo.',
    metas: [
      { id: 'c4a', txt: 'Abre el sitio de San Pedro de Atacama', f: e => e.sitios.sanpedro.abierto },
      { id: 'c4b', txt: 'Instala domos de glamping', f: e => contarEdificios(e, 'domos') >= 1 },
      { id: 'c4c', txt: 'Recibe 110 personas en una noche en San Pedro', f: e => (e.records.nocheSitio.sanpedro || 0) >= 110 },
      { id: 'c4d', txt: 'Construye un telescopio de 1 metro', f: e => contarEdificios(e, 't1m') >= 1 },
    ],
    premio: { dinero: 400e6, ciencia: 80, monedas: 60, xp: 55 } },
  { titulo: 'Otros mundos', texto: 'Con un espectrógrafo, la luz de una estrella cuenta si tiene planetas.',
    metas: [
      { id: 'c5a', txt: 'Investiga el espectrógrafo', f: e => !!e.inv.espectro },
      { id: 'c5b', txt: 'Descubre un exoplaneta', f: e => (e.tipos.rocoso || 0) + (e.tipos.caliente || 0) + (e.tipos.minineptuno || 0) + (e.tipos.anillos || 0) + (e.tipos.habitable || 0) >= 1 },
      { id: 'c5c', txt: 'Junta 25 descubrimientos', f: e => e.stats.descubrimientos >= 25 },
      { id: 'c5d', txt: 'Suma 6.000 visitantes', f: e => e.stats.visitantes >= 6000 },
    ],
    premio: { dinero: 1.2e9, ciencia: 200, monedas: 70, xp: 65 } },
  { titulo: 'La montaña', texto: 'Cerro Armazones: el mejor cielo del planeta, lejos de todo.',
    metas: [
      { id: 'c6a', txt: 'Abre el sitio de Cerro Armazones', f: e => e.sitios.armazones.abierto },
      { id: 'c6b', txt: 'Construye un telescopio de 4 metros', f: e => contarEdificios(e, 't4m') >= 1 },
      { id: 'c6c', txt: 'Descubre algo épico o mejor', f: e => e.stats.mejorRareza >= RAREZA_IDX.epico },
    ],
    premio: { dinero: 5e9, ciencia: 600, monedas: 80, xp: 75 } },
  { titulo: 'Cinco mil metros', texto: 'En el altiplano el aire es tan delgado que el universo se escucha mejor.',
    metas: [
      { id: 'c7a', txt: 'Abre el Llano de Chajnantor', f: e => e.sitios.chajnantor.abierto },
      { id: 'c7b', txt: 'Instala 4 antenas de radio', f: e => contarEdificios(e, 'antena') >= 4 },
      { id: 'c7c', txt: 'Descubre un púlsar', f: e => (e.tipos.pulsar || 0) >= 1 },
    ],
    premio: { dinero: 15e9, ciencia: 1500, monedas: 90, xp: 85 } },
  { titulo: 'El ombligo del mundo', texto: 'Rapa Nui: el cielo que guió a los navegantes polinésicos.',
    metas: [
      { id: 'c8a', txt: 'Abre el sitio de Rapa Nui', f: e => e.sitios.rapanui.abierto },
      { id: 'c8b', txt: 'Llega a nota 4,5 en Rapa Nui', f: e => e.sitios.rapanui.nota >= 4.5 && e.sitios.rapanui.n >= 150 },
      { id: 'c8c', txt: 'Construye un telescopio de 8 metros', f: e => contarEdificios(e, 't8m') >= 1 },
      { id: 'c8d', txt: 'Suma 35.000 visitantes', f: e => e.stats.visitantes >= 35000 },
    ],
    premio: { dinero: 60e9, ciencia: 3000, monedas: 110, xp: 95 } },
  { titulo: 'El Telescopio Gigante', texto: 'Un espejo de 39 metros. El proyecto de una vida.',
    metas: [
      { id: 'c9a', txt: 'Investiga el diseño del Gigante', f: e => !!e.inv.gigante },
      { id: 'c9b', txt: 'Termina el Telescopio Gigante', f: e => contarEdificios(e, 'gigante') >= 1 },
      { id: 'c9c', txt: 'Descubre algo mítico', f: e => e.stats.mejorRareza >= RAREZA_IDX.mitico },
    ],
    premio: { dinero: 0, ciencia: 0, monedas: 200, xp: 150, legado: true } },
];

/* ------------------------------------------------------------
   LEGADO — se compra con ✦ polvo de estrellas y no se pierde nunca
   ------------------------------------------------------------ */
const LEGADO = [
  { id: 'fama', nombre: 'Leyenda local', emo: '🗺️', costo: 1, max: 10, desc: '+8% de demanda turística por nivel.' },
  { id: 'ciencia', nombre: 'Escuela de astrónomos', emo: '🎓', costo: 1, max: 10, desc: '+10% de ciencia por nivel.' },
  { id: 'capital', nombre: 'Capital semilla', emo: '💰', costo: 1, max: 8, desc: 'Empiezan cada generación con el triple de plata por nivel.' },
  { id: 'obras', nombre: 'Constructora propia', emo: '🏗️', costo: 2, max: 5, desc: 'Obras 15% más rápidas por nivel.' },
  { id: 'memoria', nombre: 'Memoria del cielo', emo: '📚', costo: 3, max: 3, desc: 'Cada nivel conserva más investigaciones al empezar de nuevo.' },
  { id: 'suerte', nombre: 'Buena estrella', emo: '🍀', costo: 2, max: 5, desc: 'Descubrimientos más raros por nivel.' },
];

/* ------------------------------------------------------------
   LOGROS
   ------------------------------------------------------------ */
const LOGROS = [
  { id: 'primera', emo: '🌙', nombre: 'Primera noche', txt: 'Termina tu primera noche.', f: e => e.stats.noches >= 1 },
  { id: 'cien', emo: '👥', nombre: 'Cien personas', txt: 'Suma 100 visitantes.', f: e => e.stats.visitantes >= 100 },
  { id: 'mil', emo: '🎟️', nombre: 'Mil miradas', txt: 'Suma 1.000 visitantes.', f: e => e.stats.visitantes >= 1000 },
  { id: 'diezmil', emo: '🏟️', nombre: 'Estadio lleno', txt: 'Suma 10.000 visitantes.', f: e => e.stats.visitantes >= 10000 },
  { id: 'cienmil', emo: '🌎', nombre: 'Medio mundo', txt: 'Suma 100.000 visitantes.', f: e => e.stats.visitantes >= 100000 },
  { id: 'cinco', emo: '⭐', nombre: 'Cinco estrellas', txt: 'Termina una noche con nota 4,9 o más y 30 visitantes.', f: e => e.records.mejorNota >= 4.9 },
  { id: 'millon', emo: '💵', nombre: 'Primer palo', txt: 'Gana un millón en una sola noche.', f: e => e.records.mejorNoche >= 1e6 },
  { id: 'milmillones', emo: '🏦', nombre: 'Mil millones', txt: 'Gana mil millones en una sola noche.', f: e => e.records.mejorNoche >= 1e9 },
  { id: 'descubre', emo: '🔎', nombre: '¡Eureka!', txt: 'Haz tu primer descubrimiento.', f: e => e.stats.descubrimientos >= 1 },
  { id: 'cincuenta', emo: '🗂️', nombre: 'Catálogo propio', txt: 'Junta 50 descubrimientos.', f: e => e.stats.descubrimientos >= 50 },
  { id: 'quinientos', emo: '📚', nombre: 'Enciclopedia', txt: 'Junta 500 descubrimientos.', f: e => e.stats.descubrimientos >= 500 },
  { id: 'legendario', emo: '🏆', nombre: 'Leyenda', txt: 'Descubre algo legendario.', f: e => e.stats.mejorRareza >= RAREZA_IDX.legendario },
  { id: 'album', emo: '🧩', nombre: 'Coleccionista', txt: 'Encuentra 15 tipos distintos de objetos.', f: e => Object.keys(e.tipos).length >= 15 },
  { id: 'albumTodo', emo: '👑', nombre: 'El cielo completo', txt: 'Encuentra todos los tipos de objetos.', f: e => Object.keys(e.tipos).length >= Object.keys(TIPOS).length },
  { id: 'bautizo', emo: '💌', nombre: 'Para ti', txt: 'Dedica un descubrimiento a la otra persona.', f: e => e.stats.dedicados >= 1 },
  { id: 'nublado', emo: '☁️', nombre: 'Plan B', txt: 'Atiende 100 personas en noches nubladas.', f: e => e.stats.visitasNubladas >= 100 },
  { id: 'lluvia', emo: '🌠', nombre: 'Pide un deseo', txt: 'Abre durante una lluvia de estrellas.', f: e => e.stats.nochesLluvia >= 1 },
  { id: 'sitios', emo: '🧭', nombre: 'De norte a isla', txt: 'Abre los cinco sitios.', f: e => SITIOS.every(s => e.sitios[s.id].abierto) },
  { id: 'investiga', emo: '🧪', nombre: 'Laboratorio', txt: 'Completa 10 investigaciones.', f: e => Object.keys(e.inv).length >= 10 },
  { id: 'encargos', emo: '📦', nombre: 'Cumplidores', txt: 'Completa 10 encargos.', f: e => e.stats.encargos >= 10 },
  { id: 'mascota', emo: '🐕', nombre: 'Cometa', txt: 'Adopta al perrito del observatorio.', f: e => !!e.mascota },
  { id: 'sismo', emo: '🫨', nombre: 'Chile es así', txt: 'Sobrevive a un temblor.', f: e => e.stats.sismos >= 1 },
  { id: 'gigante', emo: '✨', nombre: 'Primera luz', txt: 'Termina el Telescopio Gigante.', f: e => contarEdificios(e, 'gigante') >= 1 },
  { id: 'legado', emo: '♾️', nombre: 'Nueva generación', txt: 'Empieza una nueva generación.', f: e => (e.legado.generaciones || 0) >= 1 },
];

/* ------------------------------------------------------------
   RESEÑAS — lo que dejan escrito los visitantes
   ------------------------------------------------------------ */
const NOMBRES_VISITA = [
  'Javiera, Santiago', 'Tomás, Concepción', 'Ana y Pedro, Talca', 'Camila, Valparaíso', 'Matías, Temuco',
  'Fernanda, Antofagasta', 'Benjamín, La Serena', 'Josefa, Rancagua', 'Ignacio, Puerto Montt', 'Isidora, Curicó',
  'Martina y Vicente, Viña', 'Agustín, Arica', 'Florencia, Chillán', 'Joaquín, Iquique', 'Antonia, Valdivia',
  'Hannah, Alemania', 'Lucas, Argentina', 'Mei, Japón', 'Olivia, Australia', 'Pierre, Francia',
  'Sofía, Perú', 'Mateo, Uruguay', 'Emma, Canadá', 'Raúl, España', 'Ingrid, Noruega', 'Diego y Cata, Curicó',
];
const RESENAS = {
  5: [
    'Vimos los anillos de Saturno y mi pololo se puso a llorar. Diez de diez.',
    'El guía sabía las historias de las estrellas de los pueblos originarios. Se me apretó la guata.',
    'Nunca había visto la Vía Láctea así. Parecía que se podía tocar.',
    'Nos pedimos matrimonio debajo de la Cruz del Sur. Ya sé, cliché. No me importa.',
    'El chocolate caliente a las 2 de la mañana con ese cielo… no hay palabras.',
    'Mi hija de 8 años dice que va a ser astrónoma. Gracias por eso.',
    'We came for one night and stayed three. Best sky of our lives.',
    'Vimos una estrella fugaz enorme y todos gritamos al mismo tiempo.',
    'Las Tres Marías, las Siete Cabritas y las Nubes de Magallanes en una sola noche.',
    'Me mostraron una nebulosa que descubrieron ellos mismos. ¡Tiene nombre y todo!',
  ],
  4: [
    'Precioso, aunque hacía un frío que calaba los huesos. Lleven parka.',
    'Muy lindo todo, el café se acabó temprano no más.',
    'El guía muy simpático. Había harta gente pero igual alcanzamos a mirar.',
    'Saturno se veía chiquitito pero era SATURNO. Volvería.',
    'Buen tour, buen cielo. El camino de tierra un poco sacado.',
  ],
  3: [
    'Bonito, pero éramos demasiados para un solo telescopio.',
    'Correcto. Esperaba un poco más por lo que cuesta.',
    'La luna estaba tan brillante que casi no se veían estrellas.',
    'Tuvimos que esperar harto para mirar por el telescopio.',
  ],
  2: [
    'Se nubló y nos ofrecieron un video. No era lo mismo.',
    'Caro para lo que es. Media hora de fila para ver una mancha.',
    'El guía no daba abasto con tanta gente.',
  ],
  1: [
    'Se nubló entero y no nos devolvieron la plata. Indignado.',
    'Una hora de viaje para ver nubes. Nunca más.',
  ],
};

/* ------------------------------------------------------------
   Utilidades que usan las metas (sin estado propio)
   ------------------------------------------------------------ */
function contarEdificios(e, id) {
  let n = 0;
  for (const s of SITIOS) {
    const st = e.sitios[s.id];
    if (!st || !st.abierto) continue;
    for (const slot of st.slots) if (slot && slot.id === id && slot.nivel >= 1) n++;
  }
  return n;
}

if (typeof module !== 'undefined') {
  module.exports = { JUEGO, NIVEL_RINDE, NIVEL_COSTO, SITIOS, SITIO, EDIFICIOS, PERSONAL, CUPO_PERSONAL_BASE, CAPACIDAD_GUIA,
    CAPACIDAD_PAREJA, INVESTIGACION, INV, RAREZAS, RAREZA_IDX, PESOS_RAREZA, TIPOS, LLUVIAS, TEMPORADAS, EVENTOS, DECISIONES,
    ENCARGOS, CAPITULOS, LEGADO, LOGROS, NOMBRES_VISITA, RESENAS, contarEdificios };
}
