/* ============================================================
   ASTRO — el cielo de verdad
   Posiciones de estrellas, Sol y Luna para cualquier sitio y hora.
   Fórmulas de baja precisión (±1°), de sobra para un juego: el cielo
   que se ve en el Observatorio es el mismo que hay sobre Chile esa noche.
   Sin DOM: también corre en Node para las pruebas.
   ============================================================ */
const RAD = Math.PI / 180;
const OBLICUIDAD = 23.4397 * RAD;

/** Días desde J2000.0 (1 de enero de 2000, 12:00 UT). */
function diasJ2000(ms) { return ms / 86400000 - 10957.5; }

/** Tiempo sidéreo local, en grados. */
function sidereoLocal(ms, lonGrados) {
  const d = diasJ2000(ms);
  return ((280.46061837 + 360.98564736629 * d + lonGrados) % 360 + 360) % 360;
}

/** Ecuatoriales → horizontales. ra/dec en grados. Devuelve alt y az en grados (az desde el norte, hacia el este). */
function horizontales(raGr, decGr, latGr, lstGr) {
  const H = (lstGr - raGr) * RAD, dec = decGr * RAD, lat = latGr * RAD;
  const sinAlt = Math.sin(dec) * Math.sin(lat) + Math.cos(dec) * Math.cos(lat) * Math.cos(H);
  const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
  const y = -Math.sin(H) * Math.cos(dec);
  const x = Math.sin(dec) * Math.cos(lat) - Math.cos(dec) * Math.sin(lat) * Math.cos(H);
  let az = Math.atan2(y, x) / RAD;
  if (az < 0) az += 360;
  return { alt: alt / RAD, az };
}

function eclipticaAEcuatorial(lGr, bGr) {
  const l = lGr * RAD, b = bGr * RAD;
  const ra = Math.atan2(Math.sin(l) * Math.cos(OBLICUIDAD) - Math.tan(b) * Math.sin(OBLICUIDAD), Math.cos(l));
  const dec = Math.asin(Math.sin(b) * Math.cos(OBLICUIDAD) + Math.cos(b) * Math.sin(OBLICUIDAD) * Math.sin(l));
  return { ra: ((ra / RAD) % 360 + 360) % 360, dec: dec / RAD };
}

/** Posición del Sol (ra/dec en grados). */
function solEn(ms) {
  const d = diasJ2000(ms);
  const M = (357.5291 + 0.98560028 * d) * RAD;
  const C = (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
  const L = M / RAD + C + 102.9372 + 180;
  const eq = eclipticaAEcuatorial(L, 0);
  return { ra: eq.ra, dec: eq.dec, lon: ((L % 360) + 360) % 360 };
}

/** Posición de la Luna (ra/dec en grados) y distancia en km. */
function lunaEn(ms) {
  const d = diasJ2000(ms);
  const L = 218.316 + 13.176396 * d;
  const M = (134.963 + 13.064993 * d) * RAD;
  const F = (93.272 + 13.229350 * d) * RAD;
  const l = L + 6.289 * Math.sin(M);
  const b = 5.128 * Math.sin(F);
  const eq = eclipticaAEcuatorial(l, b);
  return { ra: eq.ra, dec: eq.dec, dist: 385001 - 20905 * Math.cos(M) };
}

/** Fracción iluminada de la Luna (0 nueva → 1 llena) y fase (0..1, 0.5 = llena). */
function faseLunar(ms) {
  const s = solEn(ms), m = lunaEn(ms);
  const sdist = 149598000;
  const sd = s.dec * RAD, md = m.dec * RAD, sr = s.ra * RAD, mr = m.ra * RAD;
  const phi = Math.acos(Math.max(-1, Math.min(1, Math.sin(sd) * Math.sin(md) + Math.cos(sd) * Math.cos(md) * Math.cos(sr - mr))));
  const inc = Math.atan2(sdist * Math.sin(phi), m.dist - sdist * Math.cos(phi));
  const ang = Math.atan2(Math.cos(sd) * Math.sin(sr - mr),
    Math.sin(sd) * Math.cos(md) - Math.cos(sd) * Math.sin(md) * Math.cos(sr - mr));
  const fraccion = (1 + Math.cos(inc)) / 2;
  const fase = 0.5 + 0.5 * inc * (ang < 0 ? -1 : 1) / Math.PI;
  return { fraccion, fase, creciente: ang < 0 };
}

function nombreFase(f) {
  const x = f.fase;
  if (x < 0.03 || x > 0.97) return { nombre: 'Luna nueva', emo: '🌑' };
  if (x < 0.22) return { nombre: 'Luna creciente', emo: '🌒' };
  if (x < 0.28) return { nombre: 'Cuarto creciente', emo: '🌓' };
  if (x < 0.47) return { nombre: 'Gibosa creciente', emo: '🌔' };
  if (x < 0.53) return { nombre: 'Luna llena', emo: '🌕' };
  if (x < 0.72) return { nombre: 'Gibosa menguante', emo: '🌖' };
  if (x < 0.78) return { nombre: 'Cuarto menguante', emo: '🌗' };
  return { nombre: 'Luna menguante', emo: '🌘' };
}

/* ------------------------------------------------------------
   Catálogo de estrellas brillantes (J2000).
   [nombre, ra (horas), dec (grados), magnitud, color B-V]
   Nombres como se conocen en Chile cuando hay uno popular.
   ------------------------------------------------------------ */
const ESTRELLAS = [
  ['Sirio', 6.752, -16.716, -1.46, 0.00],
  ['Canopus', 6.399, -52.696, -0.74, 0.15],
  ['Alfa Centauri', 14.660, -60.834, -0.27, 0.71],
  ['Arturo', 14.261, 19.182, -0.05, 1.23],
  ['Vega', 18.616, 38.784, 0.03, 0.00],
  ['Capella', 5.278, 45.998, 0.08, 0.80],
  ['Rigel', 5.242, -8.202, 0.13, -0.03],
  ['Proción', 7.655, 5.225, 0.34, 0.42],
  ['Achernar', 1.629, -57.237, 0.46, -0.16],
  ['Betelgeuse', 5.919, 7.407, 0.50, 1.85],
  ['Hadar', 14.064, -60.373, 0.61, -0.23],
  ['Altair', 19.846, 8.868, 0.77, 0.22],
  ['Acrux', 12.443, -63.099, 0.76, -0.24],
  ['Aldebarán', 4.598, 16.509, 0.86, 1.54],
  ['Antares', 16.490, -26.432, 0.96, 1.83],
  ['Espiga', 13.420, -11.161, 0.97, -0.23],
  ['Pólux', 7.755, 28.026, 1.14, 1.00],
  ['Fomalhaut', 22.961, -29.622, 1.16, 0.09],
  ['Deneb', 20.691, 45.280, 1.25, 0.09],
  ['Mimosa', 12.795, -59.689, 1.25, -0.23],
  ['Régulo', 10.140, 11.967, 1.39, -0.11],
  ['Adhara', 6.977, -28.972, 1.50, -0.21],
  ['Cástor', 7.577, 31.888, 1.58, 0.03],
  ['Gacrux', 12.519, -57.113, 1.63, 1.59],
  ['Shaula', 17.560, -37.104, 1.62, -0.22],
  ['Bellatrix', 5.419, 6.350, 1.64, -0.22],
  ['Elnath', 5.438, 28.608, 1.65, -0.13],
  ['Miaplacidus', 9.220, -69.717, 1.67, 0.00],
  ['Alnilam', 5.604, -1.202, 1.69, -0.18],
  ['Alnair', 22.137, -46.961, 1.74, -0.13],
  ['Alnitak', 5.679, -1.943, 1.77, -0.21],
  ['Regor', 8.159, -47.337, 1.83, -0.22],
  ['Wezen', 7.140, -26.393, 1.84, 0.68],
  ['Sargas', 17.622, -42.998, 1.86, 0.40],
  ['Kaus Australis', 18.403, -34.385, 1.85, -0.03],
  ['Avior', 8.375, -59.510, 1.86, 1.28],
  ['Atria', 16.811, -69.028, 1.91, 1.44],
  ['Alhena', 6.629, 16.399, 1.92, 0.00],
  ['Peacock', 20.428, -56.735, 1.94, -0.20],
  ['Alsephina', 8.745, -54.709, 1.96, 0.04],
  ['Mirzam', 6.378, -17.956, 1.98, -0.23],
  ['Alphard', 9.460, -8.659, 1.98, 1.44],
  ['Hamal', 2.120, 23.462, 2.00, 1.15],
  ['Algieba', 10.333, 19.842, 2.01, 1.13],
  ['Diphda', 0.727, -17.987, 2.04, 1.02],
  ['Nunki', 18.921, -26.297, 2.05, -0.22],
  ['Menkent', 14.111, -36.370, 2.06, 1.01],
  ['Saiph', 5.796, -9.670, 2.07, -0.17],
  ['Alpheratz', 0.140, 29.090, 2.07, -0.11],
  ['Tiaki', 22.711, -46.885, 2.07, 1.60],
  ['Rasalhague', 17.582, 12.560, 2.08, 0.15],
  ['Denébola', 11.818, 14.572, 2.14, 0.09],
  ['Muhlifain', 12.692, -48.960, 2.17, -0.01],
  ['Aspidiske', 9.285, -59.275, 2.21, 0.18],
  ['Suhail', 9.133, -43.433, 2.21, 1.66],
  ['Mintaka', 5.533, -0.299, 2.23, -0.22],
  ['Naos', 8.060, -40.003, 2.25, -0.27],
  ['Dschubba', 16.006, -22.622, 2.29, -0.12],
  ['Larawag', 16.836, -34.293, 2.29, 1.15],
  ['Épsilon Centauri', 13.665, -53.466, 2.30, -0.22],
  ['Alfa Lupi', 14.699, -47.388, 2.30, -0.15],
  ['Eta Centauri', 14.592, -42.158, 2.31, -0.19],
  ['Girtab', 17.708, -39.030, 2.39, -0.22],
  ['Ankaa', 0.438, -42.306, 2.40, 1.09],
  ['Sabik', 17.173, -15.725, 2.43, 0.06],
  ['Aludra', 7.402, -29.303, 2.45, -0.08],
  ['Markeb', 9.369, -55.011, 2.47, -0.18],
  ['Markab', 23.079, 15.205, 2.48, -0.04],
  ['Zeta Centauri', 13.926, -47.288, 2.55, -0.22],
  ['Delta Centauri', 12.139, -50.722, 2.58, -0.12],
  ['Gienah', 12.263, -17.542, 2.59, -0.11],
  ['Ascella', 19.044, -29.880, 2.60, 0.08],
  ['Acrab', 16.091, -19.806, 2.62, -0.07],
  ['Kraz', 12.573, -23.397, 2.65, 0.89],
  ['Lesath', 17.513, -37.296, 2.70, -0.22],
  ['Kaus Media', 18.350, -29.828, 2.70, 1.38],
  ['Tarazed', 19.771, 10.613, 2.72, 1.52],
  ['Iota Centauri', 13.343, -36.712, 2.75, 0.04],
  ['Imai', 12.252, -58.749, 2.79, -0.23],
  ['Kaus Borealis', 18.466, -25.422, 2.81, 1.04],
  ['Beta Trianguli', 15.919, -63.430, 2.85, 0.29],
  ['Alfa Hydri', 1.979, -61.570, 2.86, 0.28],
  ['Pi Scorpii', 15.981, -26.114, 2.89, -0.19],
  ['Sigma Scorpii', 16.353, -25.593, 2.89, 0.13],
  ['Gamma Trianguli', 15.315, -68.680, 2.89, 0.00],
  ['Tau Scorpii', 16.598, -28.216, 2.82, -0.25],
  ['Algorab', 12.498, -16.515, 2.95, -0.05],
  ['Alnasl', 18.097, -30.424, 2.98, 1.00],
  ['Mu Scorpii', 16.865, -38.047, 3.00, -0.20],
  ['Iota Scorpii', 17.793, -40.127, 3.00, 0.51],
  ['Minkar', 12.169, -22.620, 3.00, 1.33],
  ['Fi Sagittarii', 18.761, -26.991, 3.17, -0.11],
  ['Eta Scorpii', 17.203, -43.239, 3.33, 0.41],
  ['Tau Sagittarii', 19.116, -27.670, 3.32, 1.19],
  ['Meissa', 5.586, 9.934, 3.39, -0.16],
  ['Ginan', 12.356, -60.401, 3.59, 1.42],
  ['Zeta Scorpii', 16.910, -42.362, 3.62, 1.37],
  ['Beta Hydri', 0.429, -77.255, 2.80, 0.62],
];

/* Figuras: pares de índices de ESTRELLAS. Las que se reconocen en Chile. */
function idxEstrella(n) { return ESTRELLAS.findIndex(e => e[0] === n); }
const FIGURAS = [
  { nombre: 'Cruz del Sur', lineas: [['Acrux', 'Gacrux'], ['Mimosa', 'Imai']] },
  { nombre: 'Las Tres Marías', lineas: [['Mintaka', 'Alnilam'], ['Alnilam', 'Alnitak']] },
  { nombre: 'Orión', lineas: [['Betelgeuse', 'Alnitak'], ['Bellatrix', 'Mintaka'], ['Alnitak', 'Saiph'], ['Mintaka', 'Rigel'],
    ['Betelgeuse', 'Bellatrix'], ['Saiph', 'Rigel'], ['Betelgeuse', 'Meissa'], ['Bellatrix', 'Meissa']] },
  { nombre: 'Escorpión', lineas: [['Acrab', 'Dschubba'], ['Dschubba', 'Pi Scorpii'], ['Dschubba', 'Sigma Scorpii'],
    ['Sigma Scorpii', 'Antares'], ['Antares', 'Tau Scorpii'], ['Tau Scorpii', 'Larawag'], ['Larawag', 'Mu Scorpii'],
    ['Mu Scorpii', 'Zeta Scorpii'], ['Zeta Scorpii', 'Eta Scorpii'], ['Eta Scorpii', 'Sargas'], ['Sargas', 'Iota Scorpii'],
    ['Iota Scorpii', 'Girtab'], ['Girtab', 'Shaula'], ['Shaula', 'Lesath']] },
  { nombre: 'Centauro', lineas: [['Alfa Centauri', 'Hadar'], ['Hadar', 'Épsilon Centauri'], ['Épsilon Centauri', 'Zeta Centauri'],
    ['Zeta Centauri', 'Eta Centauri'], ['Épsilon Centauri', 'Muhlifain'], ['Muhlifain', 'Delta Centauri'],
    ['Zeta Centauri', 'Iota Centauri'], ['Iota Centauri', 'Menkent']] },
  { nombre: 'Can Mayor', lineas: [['Sirio', 'Mirzam'], ['Sirio', 'Wezen'], ['Wezen', 'Adhara'], ['Wezen', 'Aludra']] },
  { nombre: 'La Tetera', lineas: [['Kaus Australis', 'Kaus Media'], ['Kaus Media', 'Kaus Borealis'], ['Kaus Media', 'Alnasl'],
    ['Alnasl', 'Kaus Australis'], ['Kaus Media', 'Fi Sagittarii'], ['Kaus Borealis', 'Fi Sagittarii'],
    ['Fi Sagittarii', 'Nunki'], ['Nunki', 'Tau Sagittarii'], ['Tau Sagittarii', 'Ascella'], ['Ascella', 'Fi Sagittarii'],
    ['Ascella', 'Kaus Australis']] },
  { nombre: 'Triángulo Austral', lineas: [['Atria', 'Beta Trianguli'], ['Beta Trianguli', 'Gamma Trianguli'], ['Gamma Trianguli', 'Atria']] },
  { nombre: 'Cuervo', lineas: [['Gienah', 'Algorab'], ['Algorab', 'Kraz'], ['Kraz', 'Minkar'], ['Minkar', 'Gienah']] },
].map(f => ({ nombre: f.nombre, lineas: f.lineas.map(([a, b]) => [idxEstrella(a), idxEstrella(b)]).filter(([a, b]) => a >= 0 && b >= 0) }));

/* Objetos de cielo profundo que se ven a ojo en Chile. ra en horas. */
const CIELO_PROFUNDO = [
  { nombre: 'Gran Nube de Magallanes', ra: 5.39, dec: -69.75, r: 5.5, tipo: 'nube' },
  { nombre: 'Pequeña Nube de Magallanes', ra: 0.88, dec: -72.80, r: 2.6, tipo: 'nube' },
  { nombre: 'Las Siete Cabritas', ra: 3.79, dec: 24.12, r: 0.9, tipo: 'cumulo' },
  { nombre: 'Omega Centauri', ra: 13.45, dec: -47.48, r: 0.5, tipo: 'cumulo' },
  { nombre: 'Nebulosa de Orión', ra: 5.59, dec: -5.39, r: 0.6, tipo: 'nebulosa' },
  { nombre: 'Nebulosa de Carina', ra: 10.75, dec: -59.87, r: 1.2, tipo: 'nebulosa' },
  { nombre: 'Saco de Carbón', ra: 12.85, dec: -62.5, r: 3.0, tipo: 'oscura' },
];

/* Polo norte galáctico (J2000): para dibujar la Vía Láctea como un círculo máximo. */
const POLO_GALACTICO = { ra: 192.85948, dec: 27.12825 };
const CENTRO_GALACTICO = { ra: 266.40499, dec: -28.93617 };

/** Puntos (ra/dec en grados) a lo largo del plano galáctico, con intensidad relativa. */
function puntosViaLactea(n) {
  // Base ortonormal: z = polo galáctico, x = centro galáctico
  const v = (ra, dec) => [Math.cos(dec * RAD) * Math.cos(ra * RAD), Math.cos(dec * RAD) * Math.sin(ra * RAD), Math.sin(dec * RAD)];
  const z = v(POLO_GALACTICO.ra, POLO_GALACTICO.dec);
  let x = v(CENTRO_GALACTICO.ra, CENTRO_GALACTICO.dec);
  const dot = x[0] * z[0] + x[1] * z[1] + x[2] * z[2];
  x = [x[0] - dot * z[0], x[1] - dot * z[1], x[2] - dot * z[2]];
  const nx = Math.hypot(x[0], x[1], x[2]); x = x.map(c => c / nx);
  const y = [z[1] * x[2] - z[2] * x[1], z[2] * x[0] - z[0] * x[2], z[0] * x[1] - z[1] * x[0]];
  const pts = [];
  for (let i = 0; i < n; i++) {
    const l = i / n * 2 * Math.PI;
    // ancho y brillo: más gruesa y luminosa hacia el centro galáctico (Sagitario/Escorpión)
    const cerca = Math.cos(l);
    const brillo = 0.45 + 0.55 * Math.pow((1 + cerca) / 2, 1.6);
    for (const b of [-1, 0, 1]) {
      const bl = b * (4 + 4 * (1 + cerca) / 2) * RAD;
      const p = [0, 1, 2].map(k => Math.cos(bl) * (Math.cos(l) * x[k] + Math.sin(l) * y[k]) + Math.sin(bl) * z[k]);
      const dec = Math.asin(p[2]) / RAD;
      let ra = Math.atan2(p[1], p[0]) / RAD; if (ra < 0) ra += 360;
      pts.push({ ra, dec, brillo: brillo * (b === 0 ? 1 : 0.55), ancho: 0.8 + 0.6 * (1 + cerca) / 2 });
    }
  }
  return pts;
}

/** Color aproximado de una estrella a partir de su índice B-V. */
function colorEstrella(bv) {
  if (bv < -0.1) return [170, 195, 255];
  if (bv < 0.15) return [215, 228, 255];
  if (bv < 0.45) return [250, 248, 240];
  if (bv < 0.8) return [255, 240, 205];
  if (bv < 1.3) return [255, 214, 160];
  return [255, 180, 135];
}

/** Milisegundos UT de una hora local (decimal) en una fecha {y, m (0-11), d} y huso horario del sitio. */
function msDeHoraLocal(fecha, hora, utc) {
  return Date.UTC(fecha.y, fecha.m, fecha.d) + (hora - utc) * 3600000;
}

/** Altitud del Sol (grados) en un sitio a una hora local. */
function altitudSol(fecha, hora, sitio) {
  const ms = msDeHoraLocal(fecha, hora, sitio.utc);
  const s = solEn(ms);
  return horizontales(s.ra, s.dec, sitio.lat, sidereoLocal(ms, sitio.lon)).alt;
}

/** Hora local (decimal) de salida y puesta del Sol, aproximada a 5 minutos. */
function horasDeSol(fecha, sitio) {
  let sale = 6.5, pone = 19.8, prev = null;
  for (let m = 0; m <= 24 * 60; m += 5) {
    const alt = altitudSol(fecha, m / 60, sitio);
    if (prev !== null) {
      if (prev < -0.83 && alt >= -0.83) sale = m / 60;
      if (prev >= -0.83 && alt < -0.83) pone = m / 60;
    }
    prev = alt;
  }
  return { sale, pone };
}

if (typeof module !== 'undefined') {
  module.exports = { RAD, diasJ2000, sidereoLocal, horizontales, solEn, lunaEn, faseLunar, nombreFase,
    ESTRELLAS, FIGURAS, CIELO_PROFUNDO, puntosViaLactea, colorEstrella, horasDeSol, msDeHoraLocal, altitudSol };
}
