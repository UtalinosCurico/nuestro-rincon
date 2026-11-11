/* ============================================================
   CLÍNICA KINÉSICA — se carga aparte desde la portada (jxCargarClinica)
   Este archivo comparte el ámbito global con index.html: usa datos,
   guardar(), avisar(), confirmar(), jxSonido(), jxRecompensar(), etc.
   y la portada llama a clAsegurar(), clMostrar(), clAsentar(),
   clGuardar(), c3Destruir() y c3Ajustar() solo si ya existen.
   ============================================================ */

/* Normaliza datos.juegos.clinica (antes vivía dentro de asegurarJuegos). */
function clAsegurar(j){
  if(!j.clinica || typeof j.clinica !== 'object') j.clinica = clDefault();
  const k = j.clinica, kb = clDefault();
  for(const x of ['dinero','reputacion','atendidos','aciertos','fallos','salas','t','altas']){
    if(typeof k[x] !== 'number' || !isFinite(k[x]) || k[x] < 0) k[x] = kb[x];
  }
  if(!Array.isArray(k.equipos)) k.equipos = [];
  if(!Array.isArray(k.personal)) k.personal = [];
  if(!Array.isArray(k.dominados)) k.dominados = [];
  if(!Array.isArray(k.activos)) k.activos = [];
  if(typeof k.altas !== 'number' || !isFinite(k.altas) || k.altas < 0) k.altas = 0;
  if(!k.vistos || typeof k.vistos !== 'object' || Array.isArray(k.vistos)) k.vistos = {};
  // sala de espera, memoria de pacientes y evento del día (se agregaron después)
  if(!Array.isArray(k.sala)) k.sala = [];
  // OJO: se limpia EN SITIO, sin crear un array nuevo. asegurarJuegos() corre
  // dentro de cada clEstado(), así que reasignar k.sala acá dejaba huérfano el
  // array que estuviera usando quien llenara la sala, y no entraba nadie.
  for(let i = k.sala.length - 1; i >= 0; i--){
    const x = k.sala[i];
    if(!x || typeof x !== 'object' || !KIN_CASOS.some(c => c.id === x.id)) k.sala.splice(i, 1);
  }
  if(!k.hist || typeof k.hist !== 'object' || Array.isArray(k.hist)) k.hist = {};
  for(const id of Object.keys(k.hist)){
    const h = k.hist[id];
    if(!h || typeof h !== 'object' || !KIN_CASOS.some(c => c.id === id)){ delete k.hist[id]; continue; }
    for(const campo of ['veces','altas','recaidas','sesiones','ultima']){
      if(typeof h[campo] !== 'number' || !isFinite(h[campo]) || h[campo] < 0) h[campo] = 0;
    }
  }
  if(k.evento && (typeof k.evento !== 'object' || !CL_EVENTOS.some(e => e.id === k.evento.id) ||
     typeof k.evento.restantes !== 'number' || k.evento.restantes <= 0)) k.evento = null;
  if(typeof k.evRoll !== 'number' || !isFinite(k.evRoll)) k.evRoll = -1;
  if(typeof k.evUltimo !== 'number' || !isFinite(k.evUltimo)) k.evUltimo = 0;
  // urgencias, turno de noche, acreditación, misiones y examen
  if(k.urgencia && (typeof k.urgencia !== 'object' || !KIN_CASOS.some(c => c.id === k.urgencia.id))) k.urgencia = null;
  if(typeof k.urRoll !== 'number' || !isFinite(k.urRoll)) k.urRoll = -1;
  // caso del día, árbol de habilidades, errores y notas escondidas
  if(!k.diario || typeof k.diario !== 'object') k.diario = { fecha:null, puntaje:0, racha:0, mejorRacha:0, jugados:0 };
  for(const campo of ['puntaje','racha','mejorRacha','jugados']){
    if(typeof k.diario[campo] !== 'number' || !isFinite(k.diario[campo]) || k.diario[campo] < 0) k.diario[campo] = 0;
  }
  if(!k.diarioComp || typeof k.diarioComp !== 'object' || Array.isArray(k.diarioComp)) k.diarioComp = {};
  if(!Array.isArray(k.habil)) k.habil = [];
  k.habil = k.habil.filter(h => CL_HABILIDADES.some(x => x.id === h));
  if(typeof k.pxHabil !== 'number' || !isFinite(k.pxHabil) || k.pxHabil < 0) k.pxHabil = 0;
  if(!k.fallidos || typeof k.fallidos !== 'object' || Array.isArray(k.fallidos)) k.fallidos = {};
  for(const id of Object.keys(k.fallidos)){
    if(!KIN_CASOS.some(c => c.id === id)) delete k.fallidos[id];
  }
  if(!k.notasCaso || typeof k.notasCaso !== 'object' || Array.isArray(k.notasCaso)) k.notasCaso = {};
  if(!k.deriv || typeof k.deriv !== 'object' || Array.isArray(k.deriv)) k.deriv = {};
  CL_DERIVADORES.forEach(d => {
    const v = k.deriv[d.id];
    if(!v || typeof v !== 'object' || typeof v.conf !== 'number' || !isFinite(v.conf))
      k.deriv[d.id] = { conf:50, enviados:0 };
    else k.deriv[d.id].conf = Math.max(0, Math.min(100, v.conf));
  });
  if(!k.agenda || typeof k.agenda !== 'object' || !Array.isArray(k.agenda.citas) ||
     typeof k.agenda.reloj !== 'number' || !isFinite(k.agenda.reloj)){
    k.agenda = { dia:1, reloj:CL_HORA_ABRE, citas:clArmarCitas(), t:Date.now(), atendidos:0 };
  }else{
    k.agenda.reloj = Math.max(CL_HORA_ABRE, Math.min(CL_HORA_CIERRA, k.agenda.reloj));
    if(typeof k.agenda.dia !== 'number' || !isFinite(k.agenda.dia) || k.agenda.dia < 1) k.agenda.dia = 1;
    if(typeof k.agenda.t !== 'number' || !isFinite(k.agenda.t) || k.agenda.t > Date.now()) k.agenda.t = Date.now();
    k.agenda.citas = k.agenda.citas.filter(x => x && typeof x.min === 'number');
    if(!k.agenda.citas.length) k.agenda.citas = clArmarCitas();
  }
  if(k.semana && (typeof k.semana !== 'object' || typeof k.semana.n !== 'number')) k.semana = null;
  k.activos.forEach(pac => {
    if(pac.msg && (typeof pac.msg !== 'object' || !CL_MENSAJES.some(m => m.id === pac.msg.id))) pac.msg = null;
    if(pac.compl && !CL_COMPLICACIONES.some(x => x.id === pac.compl)) pac.compl = null;
    if(!pac.med || typeof pac.med !== 'object') pac.med = { dolor:6, rango:50, hito:0 };
    pac.med.hito = Math.max(0, Math.min(4, pac.med.hito || 0));
  });
  k.sala.forEach(f => { if(typeof f.llegada !== 'number' || !isFinite(f.llegada)) f.llegada = Date.now(); });
  if(typeof k.sede !== 'number' || !isFinite(k.sede) || k.sede < 0) k.sede = 0;
  k.sede = Math.min(k.sede, CL_SEDES.length - 1);
  if(!Array.isArray(k.fundadas)) k.fundadas = [];
  if(!Array.isArray(k.acred)) k.acred = ['trauma'];
  if(!k.acred.includes('trauma')) k.acred.push('trauma');
  k.acred = k.acred.filter(x => CL_ESPECIALIDADES[x]);
  // ojo: `quedan === 0` es válido — es el turno recién terminado que todavía
  // no pasa por clCerrarNoche(). Si se borra acá, el récord nunca se guarda.
  if(k.noche && (typeof k.noche !== 'object' || typeof k.noche.quedan !== 'number' || k.noche.quedan < 0)) k.noche = null;
  for(const campo of ['nocheMejor','racha','mejorRacha','rojo','pistaT']){
    if(typeof k[campo] !== 'number' || !isFinite(k[campo]) || k[campo] < 0) k[campo] = 0;
  }
  if(k.pistaT > Date.now()) k.pistaT = 0;   // reloj movido hacia atrás
  if(!k.examen || typeof k.examen !== 'object') k.examen = { mejor:0, intentos:0, tema:{} };
  if(typeof k.examen.mejor !== 'number' || !isFinite(k.examen.mejor)) k.examen.mejor = 0;
  if(typeof k.examen.intentos !== 'number' || !isFinite(k.examen.intentos)) k.examen.intentos = 0;
  if(!k.examen.tema || typeof k.examen.tema !== 'object') k.examen.tema = {};
  if(!k.misiones || typeof k.misiones !== 'object') k.misiones = { dia:null, lista:[] };
  if(!Array.isArray(k.misiones.lista)) k.misiones.lista = [];
  // los pacientes en tratamiento ganaron adherencia y rasgo después
  k.activos.forEach(pac => {
    if(typeof pac.adh !== 'number' || !isFinite(pac.adh)) pac.adh = CL_ADH_INICIAL;
    pac.adh = Math.max(0, Math.min(100, pac.adh));
    if(pac.rasgo && !CL_RASGOS.some(r => r.id === pac.rasgo)) pac.rasgo = null;
    if(pac.alarma && !CL_ALARMAS.some(a => a.id === pac.alarma)) pac.alarma = null;
    if(pac.amarilla && !CL_AMARILLAS.some(a => a.id === pac.amarilla)) pac.amarilla = null;
    if(typeof pac.amarillaVista !== 'boolean') pac.amarillaVista = false;
    if(typeof pac.faltas !== 'number' || !isFinite(pac.faltas) || pac.faltas < 0) pac.faltas = 0;
    if(typeof pac.visto !== 'number' || !isFinite(pac.visto)) pac.visto = Date.now();
  });
  clReforma(k);
}

/* Reforma de la economía (nov-2026). Corre una sola vez por clínica:
   - recalcula lo que rinde cada kinesiólogo con la fórmula nueva,
   - deja el equipo en el tope de dos por box,
   - ordena la caja (los miles de millones salían de la renta exponencial),
   - y rescata a los pacientes que quedaron en 0% por estar lejos.
   No toca reputación, álbum, habilidades, historia ni récords.
   Ojo: no llamar nada que use clEstado() acá adentro (recursión). */
function clReforma(k){
  if((k.reforma || 0) >= 2) return;
  k.reforma = 2;
  let salas = 1;
  CL_EQUIPOS.forEach(e => { if(e.ef.salas && k.equipos.includes(e.id)) salas += e.ef.salas; });
  if(k.personal.length > salas * 2) k.personal.length = salas * 2;
  k.personal.forEach((pe, i) => { pe.renta = clRentaKine(i); });
  const sedeCosto = Math.round(CL_SEDE_COSTO * Math.pow(2.2, k.sede || 0));
  const caja = Math.max(20000, sedeCosto * 2);
  const antes = k.dinero;
  if(k.dinero > caja) k.dinero = caja;
  const ahora = Date.now();
  let rescatados = 0;
  k.activos.forEach(pac => { if(pac.adh < 45){ pac.adh = 45; rescatados++; } pac.visto = ahora; pac.msg = null; });
  k.t = ahora;
  if(antes > caja || rescatados) k.avisoReforma = { antes: Math.round(antes), despues: Math.round(k.dinero), rescatados };
}


/* ============================================================
   CONTENIDO CLÍNICO — kinesiología
   ------------------------------------------------------------
   TODO este bloque es contenido de estudio y está pendiente de
   revisión por Catalina. Si algo está mal, se corrige ACÁ y el
   juego entero queda corregido: es la única fuente de verdad.

   Criterio de lo que se incluyó: anatomía y semiología estables
   y ampliamente aceptadas. Se evitó todo lo que cambia según
   autor, escuela o guía clínica.

   Ojo con dos cosas al revisar:
   - Los rangos articulares varían según la fuente (acá se usó
     AAOS). Si en la U usan otra referencia, cambian los números.
   - Las pruebas ortopédicas orientan, no diagnostican solas.
     En el juego se simplifican a "positiva = sugiere X" para que
     la mecánica funcione.
   ============================================================ */

/* `sn` y `sp` son valores de referencia aproximados de la literatura:
   varían bastante entre estudios y poblaciones, así que sirven para
   razonar con las reglas SnNout / SpPin, no para citarlos en un informe.
   `func:true` marca lo que NO es una prueba diagnóstica sino una medición:
   describe cómo está el paciente, no dice qué tiene. */
const KIN_PRUEBAS = [
  { id:'neer',      nom:'Neer',                 zona:'hombro',   sn:0.79, sp:0.53, como:'Elevación pasiva del brazo en rotación interna, estabilizando la escápula.', sug:'pinzamiento subacromial' },
  { id:'hawkins',   nom:'Hawkins-Kennedy',      zona:'hombro',   sn:0.79, sp:0.59, como:'Hombro y codo a 90°, se lleva a rotación interna.',                          sug:'pinzamiento subacromial' },
  { id:'jobe',      nom:'Jobe (lata vacía)',    zona:'hombro',   sn:0.69, sp:0.62, como:'Brazo a 90° de abducción, 30° de flexión horizontal y pulgar hacia abajo; se resiste.', sug:'compromiso del supraespinoso' },
  { id:'patte',     nom:'Patte',                zona:'hombro',   sn:0.72, sp:0.60, como:'Rotación externa resistida con el brazo a 90° de abducción.',                sug:'compromiso del infraespinoso y redondo menor' },
  { id:'gerber',    nom:'Gerber (lift-off)',    zona:'hombro',   sn:0.62, sp:0.92, como:'Mano en la zona lumbar, se pide separarla de la espalda.',                   sug:'compromiso del subescapular' },
  { id:'speed',     nom:'Speed',                zona:'hombro',   sn:0.68, sp:0.55, como:'Flexión anterior resistida del hombro con el codo extendido y antebrazo supinado.', sug:'tendinopatía de la porción larga del bíceps' },
  { id:'aprension', nom:'Aprensión anterior',   zona:'hombro',   sn:0.72, sp:0.96, como:'Abducción y rotación externa progresiva del hombro.',                        sug:'inestabilidad anterior de hombro' },
  { id:'cozen',     nom:'Cozen',                zona:'codo',     sn:0.84, sp:0.50, como:'Extensión resistida de muñeca con el codo en extensión y antebrazo pronado.', sug:'epicondilalgia lateral' },
  { id:'golf',      nom:'Epitrocleítis (flexión resistida)', zona:'codo', sn:0.65, sp:0.81, como:'Flexión de muñeca resistida con el codo extendido.',                 sug:'epicondilalgia medial' },
  { id:'phalen',    nom:'Phalen',               zona:'muñeca',   sn:0.68, sp:0.73, como:'Flexión palmar máxima de ambas muñecas sostenida cerca de un minuto.',        sug:'síndrome del túnel carpiano' },
  { id:'tinel',     nom:'Tinel',                zona:'muñeca',   sn:0.50, sp:0.77, como:'Percusión sobre el trayecto del nervio (en el túnel del carpo, sobre el mediano).', sug:'irritación del nervio percutido' },
  { id:'finkel',    nom:'Finkelstein',          zona:'muñeca',   sn:0.81, sp:0.50, como:'Pulgar dentro del puño y desviación cubital de la muñeca.',                  sug:'tenosinovitis de De Quervain' },
  { id:'lasegue',   nom:'Lasègue (elevación de pierna recta)', zona:'lumbar', sn:0.91, sp:0.26, como:'En decúbito supino se eleva la pierna extendida.',               sug:'compromiso radicular lumbar' },
  { id:'slump',     nom:'Slump',                zona:'lumbar',   sn:0.84, sp:0.83, como:'Sentado, se suma flexión cervical, extensión de rodilla y dorsiflexión.',    sug:'tensión neural adversa' },
  { id:'thomas',    nom:'Thomas',               zona:'cadera',   sn:0.89, sp:0.92, como:'Se lleva una cadera a flexión máxima y se observa la contraria.',            sug:'acortamiento de flexores de cadera' },
  { id:'ober',      nom:'Ober',                 zona:'cadera',   sn:0.61, sp:0.60, como:'En decúbito lateral se abduce y extiende el muslo y se deja caer.',          sug:'tensión de la banda iliotibial' },
  { id:'faber',     nom:'FABER (Patrick)',      zona:'cadera',   sn:0.60, sp:0.75, como:'Flexión, abducción y rotación externa de cadera, con la pierna en 4.',       sug:'compromiso de cadera o sacroilíaca' },
  { id:'trendel',   nom:'Trendelenburg',        zona:'cadera',   sn:0.55, sp:0.72, como:'Apoyo monopodal; se observa el descenso de la pelvis contralateral.',         sug:'insuficiencia del glúteo medio' },
  { id:'lachman',   nom:'Lachman',              zona:'rodilla',  sn:0.85, sp:0.94, como:'Rodilla a 20-30° de flexión, se traslada la tibia hacia anterior.',           sug:'lesión del ligamento cruzado anterior' },
  { id:'cajon_a',   nom:'Cajón anterior',       zona:'rodilla',  sn:0.62, sp:0.88, como:'Rodilla a 90°, se tracciona la tibia hacia anterior.',                        sug:'lesión del ligamento cruzado anterior' },
  { id:'mcmurray',  nom:'McMurray',             zona:'rodilla',  sn:0.61, sp:0.84, como:'Desde flexión máxima se extiende la rodilla con rotación de la tibia.',       sug:'lesión meniscal' },
  { id:'valgo',     nom:'Estrés en valgo',      zona:'rodilla',  sn:0.86, sp:0.72, como:'Fuerza en valgo con la rodilla a 0° y a 30°.',                                sug:'lesión del ligamento colateral medial' },
  { id:'thompson',  nom:'Thompson',             zona:'tobillo',  sn:0.96, sp:0.93, como:'En prono se comprime la pantorrilla y se observa la flexión plantar.',        sug:'rotura completa del tendón de Aquiles' },
  { id:'cajon_ant', nom:'Cajón anterior de tobillo', zona:'tobillo', sn:0.78, sp:0.75, como:'Se tracciona el retropié hacia anterior con el tobillo en leve flexión plantar.', sug:'insuficiencia del ligamento peroneoastragalino anterior' },
  { id:'windlass',  nom:'Windlass',             zona:'pie',      sn:0.32, sp:1.00, como:'Extensión pasiva del hallux en carga.',                                       sug:'fascitis plantar' },
  { id:'spurling',  nom:'Spurling',             zona:'cervical', sn:0.30, sp:0.93, como:'Extensión, inclinación y rotación cervical hacia el lado sintomático, con compresión axial suave.', sug:'radiculopatía cervical' },
  { id:'distracc',  nom:'Distracción cervical', zona:'cervical', sn:0.44, sp:0.90, como:'Se tracciona suavemente la cabeza hacia arriba y se pregunta si alivia.',      sug:'origen radicular cervical (si alivia)' },
  { id:'noble',     nom:'Noble',                zona:'rodilla',  sn:0.65, sp:0.70, como:'Se comprime el cóndilo femoral lateral mientras se extiende la rodilla desde 90°.', sug:'síndrome de la cintilla iliotibial' },
  { id:'thessaly',  nom:'Thessaly',             zona:'rodilla',  sn:0.75, sp:0.87, como:'En apoyo monopodal con 20° de flexión, el paciente rota el cuerpo sobre la rodilla.', sug:'lesión meniscal' },
  { id:'iso90',     nom:'Flexión resistida 90-90', zona:'muslo', sn:0.70, sp:0.75, como:'Cadera y rodilla a 90°; se resiste la flexión de rodilla y se compara con el otro lado.', sug:'lesión de isquiotibiales' },
  { id:'tm6m',      nom:'Test de marcha de 6 minutos', zona:'respiratorio', func:true, como:'Se mide la distancia caminada en seis minutos, con saturación y disnea antes y después.', sug:'la tolerancia al esfuerzo (es una medición, no un diagnóstico)' },
  { id:'ashworth',  nom:'Escala de Ashworth modificada', zona:'neurológico', func:true, como:'Se moviliza pasivamente el segmento a velocidad rápida y se gradúa la resistencia.', sug:'el grado de espasticidad (es una escala, no un diagnóstico)' },
  { id:'pulltest',  nom:'Pull test (retropulsión)', zona:'neurológico', sn:0.75, sp:0.60, como:'De pie y avisado, se tracciona al paciente hacia atrás desde los hombros y se observa la reacción.', sug:'alteración de los reflejos posturales' },
  { id:'dixhall',   nom:'Dix-Hallpike',         zona:'neurológico', sn:0.79, sp:0.75, como:'Sentado, se gira la cabeza 45° y se lleva rápido a decúbito con la cabeza colgando; se observa el nistagmo.', sug:'vértigo posicional paroxístico benigno del canal posterior' },
  { id:'lagER',     nom:'Lag de rotación externa', zona:'hombro', sn:0.70, sp:0.94, como:'Se lleva pasivamente el hombro a rotación externa máxima y se suelta: se observa si la mano se devuelve.', sug:'rotura del infraespinoso' },
  { id:'mulder',    nom:'Signo de Mulder',      zona:'pie',      sn:0.62, sp:0.71, como:'Se comprime el antepié transversalmente mientras se presiona el espacio intermetatarsiano; se busca un clic doloroso.', sug:'neuroma de Morton' },
  { id:'talon',     nom:'Elevación de talones monopodal', zona:'pie', sn:0.72, sp:0.85, como:'De pie en un pie, se pide subir el talón varias veces y se mira si el retropié va a varo.', sug:'disfunción del tibial posterior' },
  { id:'spurling2', nom:'Compresión foraminal sostenida', zona:'cervical', sn:0.35, sp:0.92, como:'Extensión e inclinación cervical sostenidas 15 segundos, buscando síntomas en el brazo.', sug:'radiculopatía cervical' },
  { id:'romberg',   nom:'Romberg',              zona:'neurológico', sn:0.60, sp:0.80, como:'De pie, pies juntos, se comparan ojos abiertos y cerrados.', sug:'compromiso propioceptivo o vestibular' },
];

/* Umbrales para las reglas clásicas. Con sensibilidad alta, una NEGATIVA
   descarta (SnNout). Con especificidad alta, una POSITIVA confirma (SpPin). */
const KIN_SN_ALTA = 0.85, KIN_SP_ALTA = 0.85;

/* Casos cuya prueba de ficha sale NEGATIVA (o no se puede realizar). Sin
   esto el motor daría por positiva toda prueba que aparezca en la ficha, y
   el Lasègue negativo del lumbago pasaría a "confirmar" un lumbago.
   Va explícito a propósito: deducirlo del texto del hallazgo es frágil. */
const KIN_PRUEBA_NEG = ['minero','basquetbol','capsulitis','lumbago','aquiles',
  'cervicalgia','artrosis','latigazo','tvp','cardiaco','septica'];

/* Cada caso es un paciente del juego. El jugador elige prueba,
   luego diagnóstico, luego tratamiento según la fase. */
const KIN_CASOS = [
  {
    id:'huaso', pac:'Ramón', ava:'🤠', nom:'Rigidez de muñeca tras fractura de radio distal', esp:'trauma', zona:'Muñeca', dif:2,
    edad:58, ocup:'huaso, trabaja con animales', motivo:'Después de que le sacaron el yeso no puede mover bien la muñeca',
    mecanismo:'Se cayó del caballo hace dos meses y apoyó la mano. Estuvo seis semanas con yeso.',
    sintomas:['La muñeca está rígida en todas las direcciones','La mano se ve algo hinchada y con la piel distinta','Le cuesta agarrar las riendas y girar la muñeca'],
    prueba:null, hallazgo:'Rango pasivo y activo limitados por igual, sin dolor puntual en un tendón.',
    fase:'subaguda',
    tto:'Movilización progresiva de muñeca y antebrazo, y ejercicio de agarre; volver de a poco a las tareas del campo.',
    ttoMal:['Seguir inmovilizando hasta que deje de doler','Forzar el rango con movilizaciones bruscas','Solo calor local sin ejercicio'],
    dato:'Tras una inmovilización larga lo que limita no es el dolor sino la rigidez: el tratamiento es recuperar movimiento y carga, no seguir protegiendo.',
  },
  {
    id:'minero', pac:'Nelson', ava:'👷', nom:'Lumbago crónico ocupacional', esp:'trauma', zona:'Lumbar', dif:2,
    edad:46, ocup:'minero, turnos de doce horas', motivo:'Le duele la espalda hace más de un año y ya no sabe qué hacer',
    mecanismo:'Sin un accidente puntual. Años de turnos largos, vibración y levantar peso.',
    sintomas:['Dolor lumbar de más de tres meses, que va y viene','Peor al final del turno y los días de más carga','Sin dolor irradiado ni hormigueos'],
    prueba:'lasegue', hallazgo:'Negativo: no reproduce dolor por debajo de la rodilla.',
    fase:'crónica',
    tto:'Ejercicio progresivo de fuerza y resistencia de tronco, educación en dolor persistente y ajuste de la carga del turno.',
    ttoMal:['Reposo hasta que el dolor desaparezca','Faja lumbar permanente','Reposo laboral prolongado sin ejercicio'],
    dato:'En dolor lumbar persistente el reposo y la faja empeoran el pronóstico: lo que funciona es moverse, ganar fuerza y entender el dolor.',
  },
  {
    id:'basquetbol', pac:'Ignacio', ava:'⛹️', nom:'Tendinopatía rotuliana (rodilla de saltador)', esp:'deporte', zona:'Rodilla', dif:2,
    edad:21, ocup:'jugador de básquetbol', motivo:'Dolor justo bajo la rótula al saltar',
    mecanismo:'Aumentó los entrenamientos con muchos saltos antes del campeonato.',
    sintomas:['Dolor puntual en el polo inferior de la rótula','Duele al saltar y al caer, no al estar sentado','Rigidez al empezar a entrenar que cede al entrar en calor'],
    prueba:'mcmurray', hallazgo:'Negativo: sin chasquido ni dolor en la interlínea.',
    fase:'crónica',
    tto:'Carga progresiva del tendón rotuliano con isométricos y luego excéntricos, ajustando el volumen de saltos.',
    ttoMal:['Parar del todo hasta el campeonato','Estirar fuerte el cuádriceps antes de cada partido','Infiltrar para poder seguir jugando igual'],
    dato:'El dolor puntual en el polo inferior de la rótula al saltar es el sello de la tendinopatía rotuliana: se trata cargando el tendón, no descansándolo.',
  },
  {
    id:'carrete', pac:'Sebastián', ava:'🕺', nom:'Luxación de hombro (primer episodio)', esp:'trauma', zona:'Hombro', dif:3,
    edad:24, ocup:'estudiante', motivo:'Se le salió el hombro en una caída el fin de semana',
    mecanismo:'Se cayó carreteando y apoyó el brazo estirado hacia atrás. En urgencias se lo pusieron en su lugar.',
    sintomas:['Sensación de que el hombro se le va a volver a salir','Miedo a levantar el brazo hacia atrás','Fuerza disminuida por el dolor y la aprensión'],
    prueba:'aprension', hallazgo:'Aprensión clara al llevar el hombro a abducción y rotación externa.',
    fase:'subaguda',
    tto:'Fortalecimiento del manguito rotador y estabilizadores de escápula, ganando control antes de volver a los rangos de riesgo.',
    ttoMal:['Cabestrillo hasta que se le pase el miedo','Forzar la rotación externa para "soltar" el hombro','Volver a jugar apenas no le duela'],
    dato:'Tras una primera luxación el riesgo mayor es que se repita, sobre todo en gente joven: el trabajo es ganar estabilidad, no recuperar rango a la fuerza.',
  },
  {
    id:'banderas', ava:'🧓', pac:'Nelson', nom:'Dolor lumbar con banderas rojas', esp:'trauma', zona:'Lumbar', dif:3, derivar:true,
    edad:64, ocup:'jubilado', motivo:'Dolor lumbar que no se le pasa con nada',
    mecanismo:'Sin trauma. Lleva dos meses y va empeorando.',
    sintomas:['Dolor que no cede con el reposo ni cambia de posición','Ha bajado de peso sin proponérselo','Dolor nocturno que lo despierta'],
    prueba:null, hallazgo:'El dolor no se modifica con ninguna posición ni movimiento.',
    fase:'aguda',
    tto:'Derivar a evaluación médica antes de cualquier tratamiento kinésico.',
    ttoMal:['Iniciar ejercicio progresivo de tronco','Manipulación lumbar','Ultrasonido y calor local'],
    dato:'Dolor que no cede con el reposo, baja de peso no buscada y dolor nocturno son banderas rojas: acá lo correcto es derivar, no tratar.',
  },
  {
    id:'pinzamiento', ava:'🧑‍🎨', pac:'Rodrigo', nom:'Síndrome de pinzamiento subacromial', esp:'trauma', zona:'Hombro', dif:1,
    edad:42, ocup:'pintor', motivo:'Dolor en el hombro derecho al levantar el brazo',
    mecanismo:'Meses trabajando con los brazos sobre la cabeza, sin golpe previo.',
    sintomas:['Dolor entre los 60° y 120° de abducción (arco doloroso)','Duele más de noche al acostarse sobre ese lado','Sin pérdida de fuerza importante'],
    prueba:'neer', hallazgo:'Dolor al elevar pasivamente el brazo en rotación interna.',
    fase:'subaguda',
    tto:'Corregir el ritmo escapulohumeral y fortalecer manguito rotador y estabilizadores de escápula, evitando el trabajo sobre la cabeza al inicio.',
    ttoMal:['Inmovilizar el hombro tres semanas','Elongar solo el pectoral y volver al trabajo','Movilización pasiva forzada en abducción máxima'],
    dato:'El arco doloroso entre 60° y 120° orienta a compromiso subacromial: es el rango donde el espacio se estrecha.',
  },
  {
    id:'capsulitis', ava:'👩‍💼', pac:'Marcela', nom:'Capsulitis adhesiva (hombro congelado)', esp:'trauma', zona:'Hombro', dif:2,
    edad:55, ocup:'contadora', motivo:'El hombro se le fue poniendo rígido hace meses',
    mecanismo:'Sin trauma. Antecedente de diabetes tipo 2.',
    sintomas:['Pérdida de movilidad ACTIVA y PASIVA','La rotación externa es la más limitada','Dolor que fue disminuyendo mientras aumentaba la rigidez'],
    prueba:'aprension', hallazgo:'No hay aprensión, pero la movilidad pasiva está claramente restringida en todos los planos.',
    fase:'crónica',
    tto:'Movilización articular progresiva y ejercicio en rangos tolerados, con educación sobre lo prolongado del cuadro.',
    ttoMal:['Reposo absoluto hasta que ceda el dolor','Fortalecimiento intenso del manguito desde la primera sesión','Ultrasonido como único tratamiento'],
    dato:'La clave que la distingue del pinzamiento: acá la limitación es TAMBIÉN pasiva, y la rotación externa es la más comprometida.',
  },
  {
    id:'manguito', ava:'🏊‍♀️', pac:'Javiera', nom:'Tendinopatía del supraespinoso', esp:'trauma', zona:'Hombro', dif:2,
    edad:38, ocup:'nadadora', motivo:'Dolor al hacer el gesto de brazada',
    mecanismo:'Aumento brusco del volumen de entrenamiento.',
    sintomas:['Dolor con la abducción resistida','Debilidad leve al sostener peso con el brazo separado','Sin rigidez pasiva'],
    prueba:'jobe', hallazgo:'Dolor y debilidad al resistir con el brazo en abducción y pulgar hacia abajo.',
    fase:'subaguda',
    tto:'Carga progresiva del tendón con ejercicio isométrico y luego excéntrico, ajustando el volumen de entrenamiento.',
    ttoMal:['Reposo deportivo completo por seis semanas','Estiramiento agresivo del tendón','Infiltrar y seguir entrenando igual'],
    dato:'El supraespinoso inicia la abducción; por eso se evalúa resistiendo en ese rango.',
  },
  {
    id:'epicondilalgia', ava:'🪚', pac:'Luis', nom:'Epicondilalgia lateral (codo de tenista)', esp:'trauma', zona:'Codo', dif:1,
    edad:45, ocup:'carpintero', motivo:'Dolor en la cara externa del codo al tomar cosas',
    mecanismo:'Uso repetido de herramientas con la muñeca en extensión.',
    sintomas:['Dolor al apretar la mano o levantar una taza','Duele en el epicóndilo lateral a la palpación','Empeora con la extensión de muñeca'],
    prueba:'cozen', hallazgo:'Dolor en el epicóndilo lateral al resistir la extensión de muñeca.',
    fase:'crónica',
    tto:'Ejercicio excéntrico de extensores de muñeca con carga progresiva y corrección del gesto de trabajo.',
    ttoMal:['Reposo e inmovilización con férula por un mes','Masaje profundo como único tratamiento','Fortalecer flexores de muñeca'],
    dato:'Compromete el origen de los extensores de muñeca, sobre todo el segundo radial externo.',
  },
  {
    id:'tunel', ava:'⌨️', pac:'Paola', nom:'Síndrome del túnel carpiano', esp:'trauma', zona:'Muñeca', dif:2,
    edad:36, ocup:'digitadora', motivo:'Se le duermen los dedos, sobre todo de noche',
    mecanismo:'Trabajo prolongado en teclado; embarazo reciente.',
    sintomas:['Hormigueo en pulgar, índice, medio y mitad del anular','Despierta de noche y necesita sacudir la mano','En casos avanzados, atrofia de la eminencia tenar'],
    prueba:'phalen', hallazgo:'Reproduce el hormigueo en el territorio del nervio mediano al sostener la flexión.',
    fase:'subaguda',
    tto:'Férula nocturna en posición neutra, deslizamiento neural del mediano y ajuste ergonómico del puesto.',
    ttoMal:['Fortalecer la musculatura de la mano con pelota antiestrés','Estiramiento intenso en flexión de muñeca','Ultrasonido sobre el túnel sin cambiar nada más'],
    dato:'El territorio respeta el meñique: si también se duerme el meñique, hay que pensar en el nervio cubital, no en el mediano.',
  },
  {
    id:'dequervain', ava:'🤱', pac:'Camila', nom:'Tenosinovitis de De Quervain', esp:'trauma', zona:'Muñeca', dif:2,
    edad:31, ocup:'mamá reciente', motivo:'Dolor en el lado del pulgar al tomar a la guagua',
    mecanismo:'Sostener al bebé de forma repetida con el pulgar separado.',
    sintomas:['Dolor en la estiloides radial','Duele al agarrar y al desviar la muñeca','Puede haber inflamación local visible'],
    prueba:'finkel', hallazgo:'Dolor intenso en la estiloides radial al desviar la muñeca con el pulgar dentro del puño.',
    fase:'aguda',
    tto:'Reposo relativo del gesto doloroso, órtesis de pulgar y carga progresiva cuando cede el dolor.',
    ttoMal:['Seguir con la actividad igual y solo aplicar hielo','Fortalecimiento máximo del pulgar desde el inicio','Movilización forzada en desviación cubital'],
    dato:'Compromete los tendones del abductor largo y extensor corto del pulgar en el primer compartimento dorsal.',
  },
  {
    id:'lumbago', ava:'📦', pac:'Cristián', nom:'Lumbago mecánico inespecífico', esp:'trauma', zona:'Lumbar', dif:1,
    edad:34, ocup:'bodeguero', motivo:'Dolor lumbar tras levantar una caja',
    mecanismo:'Levantó peso con la espalda flectada y en rotación.',
    sintomas:['Dolor lumbar que NO baja de la rodilla','Sin déficit neurológico','Duele más con ciertos movimientos y alivia con otros'],
    prueba:'lasegue', hallazgo:'Negativo: no reproduce dolor irradiado por debajo de la rodilla.',
    fase:'aguda',
    tto:'Mantener actividad dentro de lo tolerable, educación en dolor y progresión de ejercicio; evitar el reposo en cama.',
    ttoMal:['Reposo en cama por una semana','Corsé rígido permanente','Imágenes urgentes antes de cualquier tratamiento'],
    dato:'Es el cuadro lumbar más frecuente. La evidencia es consistente en que el reposo en cama empeora el pronóstico.',
  },
  {
    id:'radiculopatia', ava:'🚚', pac:'Héctor', nom:'Radiculopatía lumbar', esp:'trauma', zona:'Lumbar', dif:3,
    edad:47, ocup:'chofer', motivo:'Dolor que baja por la pierna hasta el pie',
    mecanismo:'Instalación progresiva, empeora al sentarse mucho.',
    sintomas:['Dolor irradiado por debajo de la rodilla siguiendo un dermatoma','Hormigueo y a veces debilidad','Empeora al toser o pujar'],
    prueba:'lasegue', hallazgo:'Positivo: reproduce el dolor irradiado entre los 30° y 70° de elevación.',
    fase:'subaguda',
    tto:'Ejercicio con preferencia direccional, deslizamiento neural y educación; derivar si aparece déficit progresivo.',
    ttoMal:['Manipulación de alta velocidad en fase irritativa','Reposo absoluto hasta que pase','Fortalecimiento máximo de tronco desde el día uno'],
    dato:'Lo que la separa del lumbago simple es el patrón por dermatoma y el compromiso neural, no la intensidad del dolor.',
  },
  {
    id:'trocanterico', ava:'👩‍🏫', pac:'Verónica', nom:'Síndrome de dolor trocantérico', esp:'trauma', zona:'Cadera', dif:2,
    edad:52, ocup:'profesora', motivo:'Dolor en el costado de la cadera al acostarse de ese lado',
    mecanismo:'Sin trauma; aumentó las caminatas hace poco.',
    sintomas:['Dolor sobre el trocánter mayor','Duele al dormir de ese lado y al subir escaleras','Puede haber Trendelenburg'],
    prueba:'trendel', hallazgo:'Descenso de la pelvis contralateral en apoyo monopodal.',
    fase:'subaguda',
    tto:'Fortalecimiento progresivo de abductores de cadera y corrección de posiciones que comprimen el tendón (evitar cruzar la pierna).',
    ttoMal:['Estiramiento en aducción sostenido, que comprime el tendón','Infiltración y reposo sin ejercicio','Trabajo de flexores de cadera'],
    dato:'Hoy se entiende como tendinopatía de glúteo medio y menor más que como bursitis pura.',
  },
  {
    id:'lca', ava:'⚽', pac:'Antonia', nom:'Lesión del ligamento cruzado anterior', esp:'deporte', zona:'Rodilla', dif:3,
    edad:24, ocup:'jugadora de fútbol', motivo:'Se le dobló la rodilla en un cambio de dirección',
    mecanismo:'Giro con el pie fijo, sintió un chasquido y se hinchó rápido.',
    sintomas:['Derrame articular en las primeras horas','Sensación de que la rodilla "se va"','Dificultad para apoyar'],
    prueba:'lachman', hallazgo:'Aumento del desplazamiento anterior de la tibia con tope blando.',
    fase:'aguda',
    tto:'Control del derrame, recuperar la extensión completa y activar el cuádriceps antes de progresar la carga.',
    ttoMal:['Fortalecer en cadena abierta con carga máxima de inmediato','Inmovilizar en flexión','Volver a entrenar cuando baje el dolor'],
    dato:'El derrame en las primeras horas orienta a lesión intraarticular con sangrado. Lachman es más sensible que el cajón anterior.',
  },
  {
    id:'menisco', ava:'🥅', pac:'Matías', nom:'Lesión meniscal', esp:'deporte', zona:'Rodilla', dif:2,
    edad:29, ocup:'futbolista amateur', motivo:'Dolor en la interlínea y sensación de bloqueo',
    mecanismo:'Giro con el pie apoyado y la rodilla flectada.',
    sintomas:['Dolor en la interlínea articular','Bloqueos o chasquidos','Derrame de instalación lenta'],
    prueba:'mcmurray', hallazgo:'Chasquido doloroso al extender la rodilla con rotación.',
    fase:'subaguda',
    tto:'Ejercicio progresivo con control de la carga en rotación, fortalecimiento de cuádriceps y trabajo propioceptivo.',
    ttoMal:['Cirugía inmediata en toda lesión meniscal','Reposo hasta que desaparezca el chasquido','Trabajo forzado en flexión máxima con giro'],
    dato:'El derrame lento (horas o días) diferencia al menisco del LCA, que se hincha rápido.',
  },
  {
    id:'patelofemoral', ava:'🏃‍♀️', pac:'Isidora', nom:'Síndrome de dolor patelofemoral', esp:'deporte', zona:'Rodilla', dif:2,
    edad:22, ocup:'estudiante corredora', motivo:'Dolor delante de la rodilla al bajar escaleras',
    mecanismo:'Aumentó los kilómetros de trote muy rápido.',
    sintomas:['Dolor peripatelar difuso','Duele al estar mucho rato sentada (signo del cine)','Sin derrame ni bloqueos'],
    prueba:'trendel', hallazgo:'Control deficiente de la pelvis y valgo dinámico en apoyo monopodal.',
    fase:'crónica',
    tto:'Fortalecimiento de cuádriceps y de abductores/rotadores externos de cadera, con ajuste de la carga de carrera.',
    ttoMal:['Reposo total hasta que no duela nada','Solo elongar el cuádriceps','Vendaje como tratamiento único'],
    dato:'El "signo del cine" (dolor al estar mucho rato sentada con la rodilla flectada) es bien característico.',
  },
  {
    id:'aquiles', ava:'🏃', pac:'Pablo', nom:'Tendinopatía aquiliana', esp:'deporte', zona:'Tobillo', dif:2,
    edad:41, ocup:'corredor aficionado', motivo:'Dolor en el tendón de Aquiles al empezar a correr',
    mecanismo:'Aumento del volumen y cambio a zapatillas más planas.',
    sintomas:['Dolor y rigidez matinal en el tendón','Mejora al entrar en calor y reaparece después','Engrosamiento palpable'],
    prueba:'thompson', hallazgo:'Negativo: se conserva la flexión plantar al comprimir la pantorrilla (descarta rotura completa).',
    fase:'crónica',
    tto:'Carga progresiva del tendón con trabajo excéntrico e isométrico, ajustando el volumen de carrera.',
    ttoMal:['Reposo completo hasta que no duela','Estiramiento intenso y masaje profundo diario','Volver al volumen previo apenas mejore'],
    dato:'La rigidez matinal que cede al entrar en calor es el patrón típico de tendinopatía.',
  },
  {
    id:'esguince', ava:'🏀', pac:'Benjamín', nom:'Esguince lateral de tobillo', esp:'deporte', zona:'Tobillo', dif:1,
    edad:19, ocup:'jugador de básquetbol', motivo:'Se torció el tobillo al caer de un salto',
    mecanismo:'Inversión forzada con el pie en flexión plantar.',
    sintomas:['Dolor e inflamación en la cara lateral','Hematoma','Dificultad para apoyar el primer día'],
    prueba:'cajon_ant', hallazgo:'Aumento del desplazamiento anterior del retropié comparado con el otro lado.',
    fase:'aguda',
    tto:'Carga precoz protegida y trabajo propioceptivo temprano, progresando a fuerza de peroneos.',
    ttoMal:['Inmovilizar con yeso tres semanas','Reposo sin apoyo hasta que baje toda la inflamación','Volver a jugar apenas camine sin dolor'],
    dato:'El ligamento que se lesiona primero es el peroneoastragalino anterior. La propiocepción temprana reduce la recurrencia.',
  },
  {
    id:'fascitis', ava:'🛒', pac:'Gloria', nom:'Fascitis plantar', esp:'trauma', zona:'Pie', dif:1,
    edad:48, ocup:'vendedora', motivo:'Dolor en el talón con los primeros pasos de la mañana',
    mecanismo:'Muchas horas de pie sobre superficie dura.',
    sintomas:['Dolor en la zona medial del talón','Peor con los primeros pasos del día','Mejora al caminar un rato y empeora al final del día'],
    prueba:'windlass', hallazgo:'Dolor al extender pasivamente el hallux en carga.',
    fase:'crónica',
    tto:'Ejercicio de fortalecimiento de la musculatura intrínseca del pie y del tríceps sural, más manejo de la carga diaria.',
    ttoMal:['Reposo absoluto','Solo plantillas, sin ejercicio','Infiltración repetida como primera opción'],
    dato:'El dolor de los primeros pasos de la mañana es el rasgo más característico del cuadro.',
  },
  {
    id:'cervicalgia', ava:'💻', pac:'Daniela', nom:'Cervicalgia mecánica', esp:'trauma', zona:'Cervical', dif:1,
    edad:33, ocup:'teleoperadora', motivo:'Dolor de cuello y hombros al final del día',
    mecanismo:'Muchas horas frente al computador, sin trauma.',
    sintomas:['Dolor cervical que no baja del codo','Sin déficit neurológico','Mejora con movimiento y empeora con posturas sostenidas'],
    prueba:'slump', hallazgo:'Negativo: no reproduce síntomas neurales a distancia.',
    fase:'subaguda',
    tto:'Ejercicio de resistencia de flexores profundos y musculatura escapular, más pausas activas en la jornada.',
    ttoMal:['Collar cervical de uso permanente','Reposo y evitar mover el cuello','Manipulación cervical sin evaluación previa'],
    dato:'Sin signos neurológicos ni banderas rojas, se maneja como dolor mecánico: movimiento y carga, no inmovilización.',
  },
  {
    id:'epoc', ava:'🚬', pac:'Óscar', nom:'EPOC reagudizado', esp:'respi', zona:'Respiratorio', dif:3,
    edad:68, ocup:'jubilado, ex fumador', motivo:'Se ahoga más que lo habitual y tiene mucha secreción',
    mecanismo:'Cuadro respiratorio de una semana sobre una EPOC conocida.',
    sintomas:['Aumento de la disnea habitual','Tos con secreción difícil de eliminar','Uso de musculatura accesoria'],
    prueba:null, hallazgo:'Auscultación con ruidos agregados y espiración prolongada.',
    fase:'aguda',
    tto:'Técnicas de higiene bronquial para movilizar secreciones, reeducación del patrón respiratorio y ejercicio dosificado según tolerancia.',
    ttoMal:['Reposo absoluto hasta que ceda la disnea','Ejercicio aeróbico intenso desde el ingreso','Solo aerosolterapia, sin kinesiterapia'],
    dato:'En EPOC el objetivo kinésico es la permeabilidad de la vía aérea y la tolerancia al esfuerzo, no "curar" la obstrucción.',
  },
  {
    id:'acv', ava:'👵', pac:'Rosa', nom:'ACV con hemiparesia', esp:'neuro', zona:'Neurológico', dif:3,
    edad:71, ocup:'jubilada', motivo:'Debilidad de un lado del cuerpo tras un accidente cerebrovascular',
    mecanismo:'ACV isquémico hace dos semanas.',
    sintomas:['Debilidad de hemicuerpo','Alteración del control postural y del equilibrio','Riesgo de hombro doloroso en el lado afectado'],
    prueba:null, hallazgo:'Disminución del control motor selectivo del lado afectado.',
    fase:'subaguda',
    tto:'Entrenamiento orientado a tareas funcionales con alta repetición, trabajo de equilibrio y cuidado del hombro afectado.',
    ttoMal:['Esperar a que se recupere solo antes de intervenir','Trabajar solo fuerza analítica en camilla','Movilizar el hombro afectado en abducción sin control escapular'],
    dato:'La evidencia favorece el entrenamiento orientado a tareas con muchas repeticiones por sobre el trabajo analítico aislado.',
  },

  /* ---------- respiratorio ---------- */
  {
    id:'bronquiolitis', ava:'👶', pac:'Emilia', nom:'Bronquiolitis por VRS', esp:'respi', zona:'Respiratorio', dif:2,
    edad:1, edadTxt:'8 meses', ocup:'lactante, control en la sala IRA', motivo:'Lleva tres días con tos y ahora respira agitada y come poco',
    mecanismo:'Cuadro viral en pleno invierno; el hermano mayor llegó resfriado del jardín.',
    sintomas:['Sibilancias y espiración prolongada','Retracción costal y aleteo nasal','Se cansa al mamar y come menos de la mitad'],
    prueba:null, hallazgo:'Auscultación con sibilancias difusas y crepitaciones finas en ambos campos.',
    fase:'aguda',
    tto:'Kinesiterapia respiratoria con técnicas de flujo espiratorio lento adaptadas al lactante, educación a la mamá en signos de alarma y control en 24 horas.',
    ttoMal:['Percusión y vibración enérgicas sobre el tórax','Nebulizar y mandarla a la casa sin control','Ejercicios de soplo dirigido'],
    dato:'La vía aérea del lactante es pequeña y colapsable: se trabaja con flujo espiratorio lento, no con percusiones. Y lo que más cambia el desenlace es que la mamá reconozca los signos de alarma.',
  },
  {
    id:'neumonia', ava:'🫁', pac:'Hugo', nom:'Neumonía adquirida en la comunidad', esp:'respi', zona:'Respiratorio', dif:2,
    edad:74, ocup:'jubilado, tiene una huerta en Chillán', motivo:'Fiebre, tos con desgarro y se ahoga al caminar hasta el baño',
    mecanismo:'Cuatro días de fiebre alta; llegó al SAPU y quedó hospitalizado.',
    sintomas:['Fiebre y tos productiva','Crepitaciones localizadas en la base derecha','Baja la saturación al mínimo esfuerzo'],
    prueba:null, hallazgo:'Crepitaciones localizadas en la base derecha y menor entrada de aire en esa zona.',
    fase:'aguda',
    tto:'Movilización precoz fuera de la cama, permeabilización de la vía aérea según secreción y reentrenamiento progresivo al esfuerzo.',
    ttoMal:['Reposo en cama hasta que ceda la fiebre','Entrenamiento aeróbico intenso el primer día','Solo aerosolterapia, sin sacarlo de la cama'],
    dato:'En el paciente hospitalizado el reposo en cama es un factor de riesgo por sí solo: la movilización precoz acorta la estadía y frena la pérdida de masa muscular.',
  },
  {
    id:'postuci', ava:'🛏️', pac:'Marisol', nom:'Debilidad adquirida en UCI', esp:'respi', zona:'Respiratorio', dif:3,
    edad:58, ocup:'profesora, estuvo tres semanas en la UCI', motivo:'Salió de la UCI y no puede levantarse sola de la silla',
    mecanismo:'Neumonía grave con veinte días de ventilación mecánica y sedación.',
    sintomas:['Debilidad simétrica y proximal en las cuatro extremidades','Se agota al hablar o al sentarse en el borde de la cama','Perdió mucha masa muscular'],
    prueba:'tm6m', hallazgo:'Camina poco más de 200 metros en seis minutos y debe detenerse dos veces por fatiga.',
    fase:'subaguda',
    tto:'Reentrenamiento de fuerza progresivo y trabajo aeróbico dosificado por síntomas, avanzando de sedente a bípedo y a la marcha.',
    ttoMal:['Esperar a que recupere fuerza sola antes de intervenir','Entrenamiento de alta intensidad desde la primera sesión','Solo ejercicios respiratorios en la cama'],
    dato:'La debilidad adquirida en UCI es simétrica y proximal, y compromete también al diafragma. Se revierte con carga progresiva, nunca con reposo.',
  },

  /* ---------- neurológico ---------- */
  {
    id:'parkinson', ava:'🧑‍🦳', pac:'Guillermo', nom:'Enfermedad de Parkinson', esp:'neuro', zona:'Neurológico', dif:3,
    edad:69, ocup:'jubilado, fue relojero', motivo:'Camina a pasitos y se le traban los pies al pasar por la puerta',
    mecanismo:'Instalación lenta en dos años. Ya tiene diagnóstico neurológico y toma levodopa.',
    sintomas:['Marcha a pasos cortos que se van acelerando','Bloqueos al pasar por lugares estrechos','Menos braceo y giros en bloque'],
    prueba:'pulltest', hallazgo:'Da más de dos pasos hacia atrás para recuperarse: reflejos posturales alterados.',
    fase:'crónica',
    tto:'Entrenamiento de marcha con claves externas auditivas y visuales, trabajo de equilibrio y ejercicio de alta amplitud, sostenido en el tiempo.',
    ttoMal:['Esperar a que la medicación haga todo el trabajo','Fuerza analítica en camilla, sin entrenar la marcha','Restringir la marcha para que no se caiga'],
    dato:'Las claves externas —una cumbia con pulso marcado, líneas en el suelo— saltan el circuito que está fallando y alargan el paso al instante.',
  },
  {
    id:'facial', ava:'😐', pac:'Constanza', nom:'Parálisis facial periférica (de Bell)', esp:'neuro', zona:'Neurológico', dif:2,
    edad:34, ocup:'peluquera', motivo:'Amaneció con media cara caída y no puede cerrar un ojo',
    mecanismo:'Apareció de un día para otro, sin trauma. Días antes tuvo un cuadro viral.',
    sintomas:['No logra cerrar el ojo ni levantar la ceja del lado afectado','Se le escapa el líquido por la comisura','Sin debilidad en el brazo ni en la pierna'],
    prueba:null, hallazgo:'La debilidad compromete TODA la hemicara, incluida la frente.',
    fase:'aguda',
    tto:'Protección ocular, reeducación motora facial frente al espejo con movimientos suaves y educación sobre el pronóstico habitualmente favorable.',
    ttoMal:['Electroestimulación intensa desde el primer día','Ejercicios faciales máximos y forzados','Empezar los ejercicios sin proteger el ojo'],
    dato:'La clave está en la frente: si NO puede levantar la ceja, la lesión es periférica. Si la frente se mueve, hay que pensar en una lesión central, y eso es una urgencia.',
  },

  /* ---------- traumatológico ---------- */
  {
    id:'artrosis', ava:'🧺', pac:'Elba', nom:'Artrosis de rodilla', esp:'trauma', zona:'Rodilla', dif:2,
    edad:63, ocup:'feriante, atiende un puesto en la Vega', motivo:'Le duelen las rodillas al pararse y al bajar la escalera',
    mecanismo:'Dolor de años que ha ido aumentando de a poco, sin ningún golpe que lo explique.',
    sintomas:['Rigidez matinal corta, de menos de treinta minutos','Crujidos y dolor que aumenta con la actividad del día','Rodillas algo aumentadas de volumen, sin derrame caliente'],
    prueba:'mcmurray', hallazgo:'Negativo: sin chasquido ni dolor localizado en la interlínea al rotar.',
    fase:'crónica',
    tto:'Ejercicio terapéutico de fuerza de cuádriceps y cadera, educación y manejo de la carga diaria y del peso.',
    ttoMal:['Reposo y evitar las escaleras','Esperar la operación sin hacer nada mientras tanto','Solo ultrasonido y calor local'],
    dato:'En artrosis de rodilla el ejercicio y la educación son primera línea, antes que cualquier fármaco o cirugía: mejoran dolor y función aunque la radiografía no cambie nada.',
  },
  {
    id:'cadera', ava:'🩼', pac:'Olga', nom:'Prótesis total de cadera tras fractura', esp:'trauma', zona:'Cadera', dif:3,
    edad:78, ocup:'jubilada, vive con su hija en Puente Alto', motivo:'La operaron de la cadera hace dos semanas y tiene miedo de caminar',
    mecanismo:'Se cayó en el baño y se fracturó la cadera. Le pusieron una prótesis por el GES.',
    sintomas:['Camina con andador y muy poca confianza','Debilidad de abductores del lado operado','Miedo declarado a volver a caerse'],
    prueba:'trendel', hallazgo:'Descenso de la pelvis contralateral al apoyar sobre el lado operado.',
    fase:'subaguda',
    tto:'Carga progresiva según indicación quirúrgica, fuerza de abductores y cuádriceps, reeducación de la marcha y entrenamiento del equilibrio para prevenir caídas.',
    ttoMal:['Reposo hasta que se sienta segura','Flexión de cadera sobre 90° con aducción y rotación interna','Sacarle el andador de una vez para que se acostumbre'],
    dato:'Después de una prótesis de cadera el objetivo no es solo volver a caminar: es que no se vuelva a caer. Y al inicio hay que cuidar las posiciones que luxan la prótesis.',
  },
  {
    id:'latigazo', ava:'🚌', pac:'Felipe', nom:'Esguince cervical (latigazo)', esp:'trauma', zona:'Cervical', dif:2,
    edad:29, ocup:'estudiante, iba en la micro', motivo:'Le duele el cuello desde que chocaron la micro',
    mecanismo:'La micro fue chocada por atrás; el cuello se le fue hacia atrás y adelante. En el SAPU descartaron fractura.',
    sintomas:['Dolor y rigidez cervical que aparecieron horas después del choque','Cefalea que parte de la nuca','Sin hormigueo ni debilidad en los brazos'],
    prueba:'spurling', hallazgo:'Negativo: no reproduce dolor irradiado al brazo.',
    fase:'aguda',
    tto:'Reactivación temprana, movilidad cervical dentro de lo tolerable y educación tranquilizadora sobre la buena evolución habitual.',
    ttoMal:['Collar cervical por tres semanas','Reposo y evitar mover el cuello','Manipulación cervical de alta velocidad en la primera sesión'],
    dato:'En el latigazo la evidencia es contundente: seguir con la vida normal gana. El collar y el reposo alargan los síntomas.',
  },
  {
    id:'epimedial', ava:'⛏️', pac:'Jorge', nom:'Epicondilalgia medial (codo de golfista)', esp:'trauma', zona:'Codo', dif:2,
    edad:39, ocup:'maestro albañil', motivo:'Dolor en la cara interna del codo al usar la pala',
    mecanismo:'Semanas moviendo tierra, apretando la pala con la muñeca en flexión.',
    sintomas:['Dolor en la epitróclea a la palpación','Duele al apretar y al flectar la muñeca contra resistencia','Sin hormigueo en el meñique'],
    prueba:'golf', hallazgo:'Dolor en la epitróclea al resistir la flexión de muñeca.',
    fase:'crónica',
    tto:'Carga progresiva de los flexopronadores con trabajo excéntrico y corrección del gesto y del agarre de la herramienta.',
    ttoMal:['Férula y reposo por un mes','Fortalecer los extensores de muñeca','Masaje profundo como único tratamiento'],
    dato:'Compromete el origen de los flexopronadores. Ojo con el nervio cubital, que pasa justo por detrás de la epitróclea: si hay hormigueo en el meñique, el cuadro es otro.',
  },

  /* ---------- deportivo ---------- */
  {
    id:'isquios', ava:'🏃‍♂️', pac:'Nicolás', nom:'Lesión muscular de isquiotibiales', esp:'deporte', zona:'Muslo', dif:2,
    edad:26, ocup:'juega en la liga del barrio', motivo:'Sintió un tirón atrás del muslo corriendo a buscar la pelota',
    mecanismo:'Sprint en el segundo tiempo. Sintió un tirón brusco y tuvo que salir.',
    sintomas:['Dolor puntual en la parte posterior del muslo','Le cuesta acelerar y extender la rodilla con la cadera flectada','Equimosis que apareció a los dos días'],
    prueba:'iso90', hallazgo:'Dolor y debilidad al resistir la flexión de rodilla, comparado con el otro lado.',
    fase:'aguda',
    tto:'Carga progresiva precoz con ejercicio excéntrico a longitudes largas y reintroducción dosificada de la carrera antes de volver a competir.',
    ttoMal:['Reposo hasta que no duela nada','Elongación pasiva intensa desde el primer día','Volver a jugar apenas pueda trotar'],
    dato:'Los isquiotibiales se rompen frenando excéntricamente el sprint. Por eso lo que baja la recurrencia es el trabajo excéntrico a longitudes largas, no elongar.',
  },
  {
    id:'cintilla', ava:'🥾', pac:'Fernanda', nom:'Síndrome de la cintilla iliotibial', esp:'deporte', zona:'Rodilla', dif:2,
    edad:31, ocup:'corredora de cerro', motivo:'Dolor por fuera de la rodilla que aparece siempre en el mismo kilómetro',
    mecanismo:'Preparando un trail subió mucho el volumen de bajadas.',
    sintomas:['Dolor lateral de rodilla que aparece a los 20-30 minutos de correr','Peor en las bajadas','No duele al estar sentada ni caminando despacio'],
    prueba:'noble', hallazgo:'Dolor en el cóndilo femoral lateral alrededor de los 30° de flexión.',
    fase:'crónica',
    tto:'Fuerza de abductores y rotadores externos de cadera, ajuste temporal del volumen y de las bajadas, y progresión ordenada de vuelta a la carrera.',
    ttoMal:['Elongar fuerte la banda iliotibial','Reposo total hasta que no duela','Rodillera y seguir con el mismo plan de entrenamiento'],
    dato:'La cintilla iliotibial casi no se elonga: es tejido muy poco extensible. Lo que cambia el cuadro es el control de cadera y la dosis de carrera.',
  },
  {
    id:'canillera', ava:'🎖️', pac:'Bastián', nom:'Síndrome de estrés tibial medial', esp:'deporte', zona:'Tobillo', dif:1,
    edad:19, ocup:'conscripto, instrucción todos los días', motivo:'Le duelen las canillas desde que empezaron a trotar en la mañana',
    mecanismo:'Pasó de no entrenar nada a trotar todos los días con borceguíes sobre pavimento.',
    sintomas:['Dolor difuso en el borde interno de la tibia, a lo largo de varios centímetros','Duele al empezar a trotar y cede algo al entrar en calor','No hay un punto único de hueso que duela'],
    prueba:null, hallazgo:'Dolor difuso a la palpación del borde posteromedial de la tibia, sin punto exquisito.',
    fase:'subaguda',
    tto:'Bajar y redistribuir la carga de impacto, fortalecer tríceps sural y musculatura intrínseca del pie, y progresar la carrera de forma controlada.',
    ttoMal:['Seguir con el mismo volumen y solo poner hielo','Reposo absoluto hasta que no duela','Infiltrar para poder seguir la instrucción'],
    dato:'Si el dolor se concentra en UN punto de la tibia y aparece en reposo o de noche, hay que pensar en fractura por estrés y derivar: eso ya no es canillera.',
  },

  /* ---------- banderas rojas: acá lo correcto es NO tratar ----------
     `derivar:true` marca que la respuesta correcta es derivar.
     `urgente:true` los habilita para llegar en ambulancia con reloj. */
  {
    id:'cauda', ava:'🚨', pac:'Sergio', nom:'Síndrome de cauda equina', esp:'trauma', zona:'Lumbar', dif:3, derivar:true, urgente:true,
    edad:44, ocup:'chofer de camión', motivo:'Le bajó la fuerza en las dos piernas y no siente bien cuando orina',
    mecanismo:'Dolor lumbar de una semana que ayer cambió: se le durmió la zona de la entrepierna.',
    sintomas:['Adormecimiento en la zona de la entrepierna (silla de montar)','Dificultad para orinar y para darse cuenta de que lo hace','Debilidad que aparece en las DOS piernas'],
    prueba:'lasegue', hallazgo:'Positivo bilateral, y con déficit motor en ambas piernas.',
    fase:'aguda',
    tto:'Derivar de inmediato a urgencia: es una emergencia quirúrgica con ventana de horas.',
    ttoMal:['Ejercicio con preferencia direccional','Deslizamiento neural y educación en dolor','Reposo relativo y control en una semana'],
    dato:'Anestesia en silla de montar, retención urinaria y déficit bilateral son cauda equina: de las poquísimas urgencias quirúrgicas reales que llegan a kinesiología. Cada hora cuenta.',
  },
  {
    id:'tvp', ava:'🩸', pac:'Mónica', nom:'Trombosis venosa profunda', esp:'trauma', zona:'Tobillo', dif:3, derivar:true, urgente:true,
    edad:56, ocup:'costurera, volvió hace poco de un viaje largo', motivo:'Se le hinchó la pantorrilla y le duele al caminar',
    mecanismo:'Tres semanas con bota inmovilizadora por un esguince, más un viaje en bus de veinte horas.',
    sintomas:['Pantorrilla hinchada, roja y caliente','Dolor que no cede con el reposo','Diámetro claramente mayor que el de la otra pierna'],
    prueba:'thompson', hallazgo:'Negativo: se conserva la flexión plantar. Pero la pantorrilla está tensa y caliente.',
    fase:'aguda',
    tto:'Derivar a evaluación médica urgente antes de cualquier masaje, movilización o ejercicio.',
    ttoMal:['Masaje descontracturante de la pantorrilla','Elongación sostenida del tríceps sural','Ejercicio excéntrico progresivo de gemelos'],
    dato:'Pantorrilla hinchada, caliente y con antecedente de inmovilización o viaje largo: TVP hasta demostrar lo contrario. Masajear ahí puede soltar el trombo.',
  },
  {
    id:'compartimental', ava:'🦵', pac:'Ítalo', nom:'Síndrome compartimental agudo', esp:'deporte', zona:'Tobillo', dif:3, derivar:true, urgente:true,
    edad:23, ocup:'jugador de rugby', motivo:'Le pegaron una patada en la canilla y ahora el dolor es insoportable',
    mecanismo:'Golpe directo en la pierna hace seis horas. El dolor fue subiendo en vez de bajar.',
    sintomas:['Dolor desproporcionado al golpe, que va en aumento','Dolor brutal al estirar pasivamente los dedos del pie','Pierna tensa como tabla y hormigueo en el dorso del pie'],
    prueba:null, hallazgo:'El estiramiento pasivo de los dedos dispara un dolor desproporcionado.',
    fase:'aguda',
    tto:'Derivar de inmediato a urgencia: sin fasciotomía a tiempo el músculo se necrosa.',
    ttoMal:['Hielo, compresión y elevación','Movilización suave y descarga con bastones','Vendaje compresivo y control mañana'],
    dato:'Dolor desproporcionado que aumenta y que se dispara al estirar pasivamente: síndrome compartimental. Ojo, comprimir y poner hielo lo empeoran, y el pulso puede estar normal igual.',
  },
  {
    id:'cardiaco', ava:'❤️‍🩹', pac:'Raúl', nom:'Dolor torácico de origen cardíaco', esp:'trauma', zona:'Cervical', dif:3, derivar:true, urgente:true,
    edad:61, ocup:'maestro panadero', motivo:'Le duele entre los omóplatos y el brazo izquierdo cuando camina rápido',
    mecanismo:'Sin trauma. Aparece con el esfuerzo y se le pasa cuando se detiene.',
    sintomas:['El dolor aparece con el esfuerzo y cede con el reposo','Se acompaña de sudoración fría y falta de aire','Hipertenso y fumador de años'],
    prueba:'spurling', hallazgo:'Negativo: no reproduce el dolor ni lo irradia al brazo.',
    fase:'aguda',
    tto:'Derivar a evaluación médica urgente: el patrón es de origen cardíaco, no musculoesquelético.',
    ttoMal:['Masaje y calor en la musculatura dorsal','Ejercicio de movilidad torácica','Punción seca de trapecio y romboides'],
    dato:'Dolor que aparece con el esfuerzo, cede con el reposo y trae sudoración o disnea NO es musculoesquelético. Que ningún movimiento lo reproduzca es el dato que lo delata.',
  },
  {
    id:'fxestres', ava:'🩻', pac:'Trinidad', nom:'Fractura por estrés de tibia', esp:'deporte', zona:'Tobillo', dif:2, derivar:true,
    edad:20, ocup:'bailarina de ballet', motivo:'Le duele un punto de la canilla y ahora también en la noche',
    mecanismo:'Subió mucho los ensayos para el examen de fin de año. Empezó como canillera y fue empeorando.',
    sintomas:['Dolor en UN punto exacto de la tibia','Ahora duele también en reposo y de noche','Duele al saltar en un pie'],
    prueba:null, hallazgo:'Dolor exquisito en un punto único del borde tibial, con dolor al salto monopodal.',
    fase:'aguda',
    tto:'Derivar para estudio de imagen y descarga: no se sigue cargando una fractura por estrés.',
    ttoMal:['Bajar el volumen y seguir ensayando','Fortalecer el tríceps sural y progresar la carga','Plantillas y hielo después de cada ensayo'],
    dato:'La canillera duele difuso y mejora al entrar en calor; la fractura por estrés duele en un punto, en reposo y de noche. Esa es la línea entre tratar y derivar.',
  },
  {
    id:'septica', ava:'🌡️', pac:'Manuel', nom:'Artritis séptica de rodilla', esp:'trauma', zona:'Rodilla', dif:3, derivar:true, urgente:true,
    edad:67, ocup:'jubilado, diabético', motivo:'Se le hinchó la rodilla de un día para otro y anda con fiebre',
    mecanismo:'Sin golpe. Hace tres días le pusieron una infiltración en esa rodilla.',
    sintomas:['Rodilla caliente, roja y muy dolorosa','Fiebre y compromiso del estado general','No tolera nada de movimiento'],
    prueba:'mcmurray', hallazgo:'No se puede realizar: cualquier movimiento provoca dolor intenso.',
    fase:'aguda',
    tto:'Derivar de inmediato: articulación caliente con fiebre es artritis séptica hasta demostrar lo contrario.',
    ttoMal:['Drenaje linfático y movilización suave','Ejercicio isométrico de cuádriceps','Hielo, reposo y control en una semana'],
    dato:'Monoartritis aguda, caliente, con fiebre y antecedente de punción: artritis séptica. En horas destruye el cartílago, no es un cuadro para tratar en box.',
  },

  /* ---------- tanda nueva: más cuadros para que no se repita tanto ---------- */
  {
    id:'radicervical', ava:'💢', pac:'Fabián', nom:'Radiculopatía cervical C6', esp:'trauma', zona:'Cervical', dif:3,
    edad:47, ocup:'soldador', motivo:'Le baja un corrientazo por el brazo hasta el pulgar',
    mecanismo:'Empezó hace tres semanas sin golpe, y va peor al mirar hacia arriba trabajando.',
    sintomas:['Dolor que baja del cuello al brazo y llega al pulgar','Hormigueo en pulgar e índice','Se le durmió la mano un par de veces en la noche'],
    prueba:'spurling', hallazgo:'Positivo: reproduce el corrientazo que le baja al brazo.',
    fase:'subaguda',
    tto:'Descarga cervical y deslizamiento neural, ejercicio en la dirección que centraliza los síntomas y control de la postura de trabajo.',
    ttoMal:['Fortalecimiento cervical con carga alta para estabilizar el segmento','Tracción cervical mantenida como único tratamiento','Movilización agresiva hacia la extensión para "abrir" el foramen'],
    dato:'El territorio manda: C6 llega al pulgar, C7 al dedo medio, C8 al meñique. Y ojo, el túnel carpiano también hormiguea el pulgar, pero no duele el cuello.',
  },
  {
    id:'cubital', ava:'🤙', pac:'Renato', nom:'Síndrome del túnel cubital', esp:'trauma', zona:'Codo', dif:2,
    edad:38, ocup:'chofer de camión', motivo:'Se le duermen el meñique y el anular cuando maneja',
    mecanismo:'Muchas horas con el codo flectado apoyado en la ventana.',
    sintomas:['Hormigueo en meñique y mitad del anular','Peor con el codo doblado mucho rato','Le cuesta separar los dedos'],
    prueba:'golf', hallazgo:'Negativo: no duele la epitróclea al resistir la flexión de muñeca.',
    fase:'subaguda',
    tto:'Evitar la flexión mantenida de codo, férula nocturna en extensión y deslizamiento del nervio cubital, más ajuste de la postura al manejar.',
    ttoMal:['Fortalecimiento de flexopronadores con carga progresiva','Deslizamiento neural en tensión máxima varias veces al día','Órtesis de contrafuerza en el antebrazo'],
    dato:'Meñique dormido es cubital, no mediano. El cubital pasa por detrás de la epitróclea, y por eso empeora justo con el codo doblado.',
  },
  {
    id:'estenosis', ava:'🚶', pac:'Nibaldo', nom:'Estenosis raquídea lumbar', esp:'trauma', zona:'Lumbar', dif:3,
    edad:71, ocup:'jubilado', motivo:'Camina dos cuadras y tiene que sentarse porque se le duermen las piernas',
    mecanismo:'Progresivo en dos años, sin ningún golpe.',
    sintomas:['Dolor y pesadez en las piernas al caminar, que cede al sentarse','Camina mejor inclinado sobre el carro del supermercado','En bicicleta no le pasa nada'],
    prueba:'lasegue', hallazgo:'Negativo: la elevación de la pierna recta no reproduce nada.',
    fase:'crónica',
    tto:'Ejercicio en flexión y descarga, entrenamiento progresivo de la marcha con pausas y fortalecimiento global; educación sobre el patrón de síntomas.',
    ttoMal:['Ejercicio en extensión lumbar para recuperar la lordosis','Caminata continua de treinta minutos diarios desde el inicio','Tracción lumbar y reposo hasta que ceda la pesadez'],
    dato:'La clave es la postura: la claudicación neurógena mejora al flectarse (carro del súper, bicicleta) y la vascular no. Y el Lasègue suele ser negativo.',
  },
  {
    id:'coxartrosis', ava:'🦴', pac:'Lidia', nom:'Artrosis de cadera', esp:'trauma', zona:'Cadera', dif:2,
    edad:68, ocup:'jubilada', motivo:'Le duele la ingle al pararse y ya no puede ponerse los calcetines',
    mecanismo:'Dolor de años que fue aumentando de a poco, sin trauma.',
    sintomas:['Dolor en la INGLE, no en el costado','Perdió rotación interna de cadera','Rigidez de menos de treinta minutos en la mañana'],
    prueba:'faber', hallazgo:'Positivo: reproduce el dolor inguinal y el rango está claramente limitado.',
    fase:'crónica',
    tto:'Ejercicio de fuerza de cadera y educación como primera línea, más manejo de la carga diaria y ayuda técnica si hace falta.',
    ttoMal:['Estiramiento de flexores y rotadores como eje del tratamiento','Reposo de las caminatas hasta que ceda el dolor inguinal','Terapia manual de cadera sin programa de ejercicio'],
    dato:'Dolor de cadera de verdad duele en la INGLE. Si duele en el costado sobre el trocánter, es tendinopatía glútea. La rotación interna limitada es el hallazgo más precoz.',
  },
  {
    id:'pubalgia', ava:'⚽', pac:'Maicol', nom:'Dolor inguinal del deportista', esp:'deporte', zona:'Cadera', dif:2,
    edad:25, ocup:'futbolista de club amateur', motivo:'Le duele la ingle al patear y al acelerar',
    mecanismo:'Empezó de a poco en pretemporada, con mucho cambio de dirección y remate.',
    sintomas:['Dolor en la ingle al patear, correr y hacer abdominales','Duele a la palpación del aductor largo','Sin dolor a la rotación pasiva de cadera'],
    prueba:'faber', hallazgo:'Negativo: la rotación pasiva de cadera no reproduce el dolor.',
    fase:'subaguda',
    tto:'Programa progresivo de fuerza de aductores y core (tipo Copenhagen), con retorno gradual al gesto deportivo.',
    ttoMal:['Reposo deportivo hasta que no duela y luego volver a entrenar','Estiramiento intenso de aductores todos los días','Fortalecimiento de abductores y glúteo medio'],
    dato:'Lo que separa la pubalgia de la artrosis de cadera es que acá la movilidad pasiva está intacta: duele el gesto, no la articulación.',
  },
  {
    id:'rotura', ava:'💪', pac:'Aliro', nom:'Rotura del manguito rotador', esp:'trauma', zona:'Hombro', dif:3,
    edad:63, ocup:'maestro carpintero', motivo:'No puede levantar el brazo desde que se cayó del andamio',
    mecanismo:'Caída con apoyo del brazo hace tres semanas. Antes ya le molestaba el hombro.',
    sintomas:['No logra mantener el brazo levantado: se le cae','Debilidad clara en rotación externa','Dolor nocturno intenso'],
    prueba:'lagER', hallazgo:'Positivo: al soltar, la mano se devuelve sola. No sostiene la rotación externa.',
    fase:'subaguda',
    tto:'Fortalecimiento del deltoides y del manguito remanente con trabajo en rangos tolerados y educación; derivar a evaluación quirúrgica por la magnitud del déficit.',
    ttoMal:['Carga progresiva del manguito como en una tendinopatía','Movilización pasiva forzada para recuperar la elevación','Isométricos de rotación externa a carga máxima'],
    dato:'La tendinopatía duele; la rotura DEBILITA. Si el brazo se cae al soltarlo o el lag es positivo, ya no es un problema de carga, es de continuidad del tendón.',
  },
  {
    id:'escafoides', ava:'🖐️', pac:'Kevin', nom:'Fractura de escafoides', esp:'trauma', zona:'Muñeca', dif:3, derivar:true,
    edad:21, ocup:'estudiante, anda en skate', motivo:'Se cayó con la mano estirada y le duele la muñeca del lado del pulgar',
    mecanismo:'Caída con la mano en extensión hace cinco días. En urgencias le dijeron que era esguince.',
    sintomas:['Dolor en la tabaquera anatómica','Duele al apretar y al mover el pulgar','La radiografía inicial no mostró nada'],
    prueba:'finkel', hallazgo:'Negativo para De Quervain, pero duele exquisitamente la tabaquera anatómica.',
    fase:'aguda',
    tto:'Derivar para inmovilización y nueva imagen: una radiografía normal no descarta escafoides en los primeros días.',
    ttoMal:['Movilización progresiva de muñeca como rigidez post-traumática','Órtesis de pulgar y ejercicio de agarre progresivo','Reposo relativo y control en tres semanas'],
    dato:'El escafoides es el hueso que se pasa por alto: la primera radiografía sale normal hasta en un tercio de los casos. Si duele la tabaquera, se trata como fractura hasta demostrar lo contrario, porque se necrosa.',
  },
  {
    id:'tibialpost', ava:'🦶', pac:'Berta', nom:'Disfunción del tibial posterior', esp:'trauma', zona:'Pie', dif:2,
    edad:56, ocup:'auxiliar de aseo', motivo:'Se le está aplanando el pie y le duele por dentro del tobillo',
    mecanismo:'Progresivo en un año, con muchas horas de pie.',
    sintomas:['Dolor por dentro del tobillo, bajo el maléolo medial','El arco se le fue cayendo','No puede pararse en la punta de ese pie'],
    prueba:'talon', hallazgo:'Positivo: no logra elevar el talón en un pie y el retropié no va a varo.',
    fase:'crónica',
    tto:'Fortalecimiento progresivo del tibial posterior y de la musculatura intrínseca, con órtesis de apoyo del arco y control de la carga diaria.',
    ttoMal:['Fortalecer los peroneos y la musculatura lateral','Plantillas solamente, sin programa de ejercicio','Estiramiento del tríceps sural como eje del tratamiento'],
    dato:'Que no pueda pararse en la punta de un pie es el signo que lo delata. Si se deja pasar, el pie plano se vuelve rígido y ahí ya no hay ejercicio que lo devuelva.',
  },
  {
    id:'morton', ava:'👟', pac:'Solange', nom:'Neuroma de Morton', esp:'trauma', zona:'Pie', dif:2,
    edad:44, ocup:'vendedora de tienda', motivo:'Siente que anda con una piedra en el zapato y se le duermen los dedos',
    mecanismo:'Meses con zapato angosto y taco, muchas horas de pie.',
    sintomas:['Ardor entre el tercer y cuarto dedo','Sensación de piedra o pliegue en el calcetín','Alivia al sacarse el zapato y masajear el pie'],
    prueba:'mulder', hallazgo:'Positivo: clic doloroso al comprimir el antepié con presión en el espacio intermetatarsiano.',
    fase:'crónica',
    tto:'Cambio de calzado a horma ancha y sin taco, almohadilla metatarsiana y fortalecimiento de la musculatura intrínseca del pie.',
    ttoMal:['Plantilla con apoyo bajo las cabezas metatarsianas','Movilización y masaje transverso del antepié en cada sesión','Fortalecimiento del tríceps sural con elevaciones de talón'],
    dato:'El dato que lo distingue de la metatarsalgia común: acá hay síntoma NEURAL —ardor y adormecimiento entre los dedos— y alivia al descalzarse.',
  },
  {
    id:'vppb', ava:'🌀', pac:'Herminia', nom:'Vértigo posicional paroxístico benigno', esp:'neuro', zona:'Neurológico', dif:2,
    edad:64, ocup:'dueña de casa', motivo:'Se le da vuelta todo cuando se da vuelta en la cama',
    mecanismo:'Empezó de un día para otro hace una semana, al levantarse en la mañana.',
    sintomas:['Vértigo intenso de menos de un minuto al cambiar de posición','Se gatilla al acostarse, darse vuelta o mirar hacia arriba','Sin pérdida de audición ni síntomas neurológicos'],
    prueba:'dixhall', hallazgo:'Positivo: nistagmo con latencia corta que se agota, junto con el vértigo.',
    fase:'aguda',
    tto:'Maniobra de reposicionamiento canalicular (Epley) y educación; controlar y repetir si persiste.',
    ttoMal:['Ejercicios de habituación vestibular progresivos por seis semanas','Reposo en cama evitando los movimientos que lo gatillan','Fortalecimiento cervical y terapia manual del cuello'],
    dato:'Es de los pocos cuadros que se resuelven en UNA sesión con la maniobra correcta. Dura segundos, se gatilla con la posición y el nistagmo se agota: eso lo separa de una causa central.',
  },
  {
    id:'esclerosis', ava:'🧩', pac:'Yasna', nom:'Esclerosis múltiple', esp:'neuro', zona:'Neurológico', dif:3,
    edad:34, ocup:'profesora de historia', motivo:'Anda con las piernas pesadas y se cansa con nada desde hace meses',
    mecanismo:'Brotes: hace dos años perdió visión de un ojo por unas semanas y se recuperó.',
    sintomas:['Fatiga desproporcionada, peor con el calor','Espasticidad y pesadez en ambas piernas','Episodios previos que aparecieron y se fueron'],
    prueba:'ashworth', hallazgo:'Resistencia aumentada al movimiento pasivo rápido en ambos miembros inferiores.',
    fase:'crónica',
    tto:'Ejercicio aeróbico y de fuerza dosificado por fatiga, trabajo de equilibrio y marcha, evitando el sobrecalentamiento; programa sostenido en el tiempo.',
    ttoMal:['Entrenamiento intensivo continuo para ganar resistencia rápido','Solo elongación y manejo de la espasticidad','Reposo en los períodos de más fatiga hasta que pase'],
    dato:'Lo que la delata es el patrón: síntomas neurológicos separados en tiempo y espacio. Y ojo con el calor: sube la temperatura y los síntomas empeoran (fenómeno de Uhthoff).',
  },
  {
    id:'fxvertebral', ava:'🧓', pac:'Amelia', nom:'Fractura vertebral por osteoporosis', esp:'trauma', zona:'Lumbar', dif:3, derivar:true,
    edad:76, ocup:'jubilada', motivo:'Le empezó un dolor fuerte en la espalda después de agacharse a recoger algo',
    mecanismo:'Sin caída: solo se agachó. El dolor apareció de inmediato y no cede.',
    sintomas:['Dolor dorsolumbar intenso que apareció de golpe con un esfuerzo mínimo','Duele muchísimo al pasar de acostada a sentada','Perdió estatura y anda más encorvada este último año'],
    prueba:null, hallazgo:'Dolor exquisito a la percusión de una apófisis espinosa, muy localizado.',
    fase:'aguda',
    tto:'Derivar para imagen y manejo médico del dolor y de la osteoporosis antes de cualquier programa kinésico.',
    ttoMal:['Ejercicio de extensión dorsal para corregir la cifosis','Movilización y terapia manual de la zona dolorosa','Faja y reposo relativo con control en dos semanas'],
    dato:'Fractura con trauma mínimo en una adulta mayor es fractura por fragilidad hasta demostrar lo contrario. El dolor puntual a la percusión y la pérdida de estatura son las señales.',
  },
];

/* Distractores de tratamiento. Los de las fichas eran absurdos ("reposo
   absoluto", "infiltrar y seguir igual") y se descartaban sin pensar.
   Estos son razonables pero equivocados: la intervención correcta en la
   fase equivocada, la dosis mal puesta, el tratamiento del cuadro que
   competía, o algo bien hecho pero incompleto. Hay que leer la fase. */
const CL_TTO_MAL = {
  huaso:['Movilización pasiva agresiva en rangos máximos para ganar rango rápido','Fortalecimiento de agarre con carga alta desde la primera sesión','Órtesis de muñeca y ejercicio isométrico suave, sin progresar el rango'],
  minero:['Control motor aislado del transverso, sin progresar nunca la carga','Programa de fuerza de tronco de alta intensidad desde la primera semana','Educación en dolor y reposo relativo hasta que baje la intensidad'],
  basquetbol:['Isométricos de cuádriceps manteniendo el reposo deportivo hasta que no duela','Excéntricos a carga máxima tres veces al día desde el inicio','Trabajo de cadera y core, sin cargar el tendón rotuliano'],
  carrete:['Movilidad pasiva a rotación externa máxima para recuperar el rango','Manguito en cadena abierta con carga alta en los rangos de riesgo','Cabestrillo cuatro semanas más y después empezar el ejercicio'],
  banderas:['Ejercicio progresivo de tronco con educación en dolor persistente','Movilización lumbar suave y control motor mientras llega la imagen','Reposo relativo y control en dos semanas para ver cómo evoluciona'],
  pinzamiento:['Fortalecimiento del manguito sobre 90° de abducción desde el inicio','Movilización glenohumeral en todos los planos, sin trabajo escapular','Solo control escapular y educación, sin llegar a cargar el manguito'],
  capsulitis:['Movilización pasiva forzada hasta el rango máximo tolerable cada sesión','Fortalecimiento del manguito rotador como eje del tratamiento','Ejercicio pendular y calor local, esperando que el cuadro se resuelva solo'],
  manguito:['Isométricos indefinidos, sin progresar nunca a carga dinámica','Volver al volumen de nado completo apenas ceda el dolor','Corrección escapular y estiramiento capsular posterior, sin cargar el tendón'],
  epicondilalgia:['Excéntricos de extensores a carga máxima desde la primera sesión','Órtesis de contrafuerza y reposo del gesto, sin ejercicio progresivo','Fortalecimiento global de hombro y escápula, sin cargar los extensores'],
  tunel:['Deslizamiento neural en tensión máxima, varias veces al día','Férula nocturna sola, sin cambiar nada del puesto de trabajo','Fortalecimiento de la musculatura tenar como eje del tratamiento'],
  dequervain:['Excéntricos del abductor largo a carga alta desde el primer día','Órtesis de pulgar permanente seis semanas, sin reintroducir carga','Masaje transverso profundo del primer compartimento todos los días'],
  lumbago:['Control motor específico antes de retomar la actividad normal','Reposo relativo tres días y reevaluar antes de empezar a mover','Programa de fuerza de tronco de alta carga desde la primera sesión'],
  radiculopatia:['Ejercicio en la dirección que aumenta los síntomas, para "soltar" la raíz','Tracción lumbar mecánica como tratamiento principal','Fuerza de tronco en carga alta, postergando el trabajo neural'],
  trocanterico:['Estiramiento sostenido de banda iliotibial y glúteo en aducción','Abductores en máquina con carga alta desde la primera sesión','Reposo de las caminatas hasta que deje de dolerle al dormir'],
  lca:['Cuádriceps en cadena abierta con carga alta para frenar la atrofia','Trabajo propioceptivo y de agilidad en cancha desde la primera semana','Inmovilizar y esperar la cirugía sin intervención kinésica'],
  menisco:['Trabajo en flexión profunda con rotación para recuperar el rango completo','Reposo deportivo hasta que desaparezcan los chasquidos','Cuádriceps isométrico únicamente, sin progresar a carga dinámica'],
  patelofemoral:['Cuádriceps en cadena abierta a 90° con carga alta','Vendaje rotuliano y elongación de cintilla, con el mismo volumen de trote','Suspender la carrera seis semanas y volver al mismo kilometraje'],
  aquiles:['Excéntricos a carga máxima dos veces al día desde la primera sesión','Elongación sostenida del tríceps sural como eje del tratamiento','Talonera y reposo de la carrera hasta que no duela nada'],
  esguince:['Reposo con descarga total hasta que baje todo el edema','Peroneos en carga alta antes de recuperar el apoyo completo','Movilización y propiocepción, postergando el apoyo a la segunda semana'],
  fascitis:['Estiramiento de fascia plantar y gemelo, sin fortalecer nada','Plantillas personalizadas y reposo, esperando que ceda solo','Trabajo intrínseco con saltos y carga alta desde el inicio'],
  cervicalgia:['Fortalecimiento cervical con carga alta desde la primera sesión','Masaje y calor local en trapecios, más pausas activas','Solo flexores profundos, sin trabajo escapular ni ajuste de la jornada'],
  epoc:['Fuerza de extremidades inferiores como eje del manejo del ingreso','Higiene bronquial solamente, sin reentrenar la tolerancia al esfuerzo','Espirometría incentivada y reposo hasta que baje la disnea'],
  acv:['Facilitación neuromuscular en camilla, sin tareas funcionales','Marcha en suspensión únicamente, sin trabajo de extremidad superior','Fortalecimiento analítico del hemicuerpo antes de entrenar tareas'],
  bronquiolitis:['Aspiración nasofaríngea repetida como único manejo','Espiración lenta prolongada más nebulización de rutina cada cuatro horas','Kinesiterapia diaria intensiva hasta que desaparezcan las sibilancias'],
  neumonia:['Higiene bronquial tres veces al día, con reposo entre sesiones','Entrenamiento aeróbico en cicloergómetro desde el ingreso','Movilización precoz solamente, sin trabajar la vía aérea'],
  postuci:['Electroestimulación neuromuscular como único tratamiento','Fuerza al 80% de 1RM desde la primera semana','Movilización pasiva y posicionamiento hasta que recupere fuerza sola'],
  parkinson:['Fuerza progresiva sin trabajar marcha ni claves externas','Marcha en cinta a velocidad fija, sin claves auditivas ni visuales','Amplitud y equilibrio por seis semanas y después el alta'],
  facial:['Electroestimulación de la musculatura facial desde la primera sesión','Ejercicios faciales a máxima intensidad, varias veces al día','Protección ocular y esperar la resolución, sin reeducación motora'],
  artrosis:['Ejercicio de fuerza más terapia manual y ultrasonido cada sesión','Cuádriceps solamente, sin trabajar cadera ni educar sobre la carga','Bajar el impacto: suspender escaleras y caminatas mientras duela'],
  cadera:['Abductores en decúbito, postergando el entrenamiento de marcha','Marcha sin andador desde la primera sesión para ganar confianza','Movilidad de cadera en todos los rangos para recuperar el arco completo'],
  latigazo:['Collar blando las primeras dos semanas y después movilizar','Fuerza cervical progresiva desde la primera sesión','Terapia manual y masaje cervical, sin educación ni reactivación'],
  epimedial:['Órtesis de contrafuerza y reposo del gesto por un mes','Excéntricos de flexopronadores a carga máxima desde el inicio','Fortalecimiento de extensores de muñeca y movilidad de codo'],
  isquios:['Excéntricos a longitudes largas con carga máxima desde el primer día','Reposo y elongación suave hasta caminar sin dolor, y ahí correr','Isométricos solamente, sin reintroducir la carrera antes del alta'],
  cintilla:['Liberación miofascial de la banda iliotibial en cada sesión','Abductores de cadera sin ajustar el volumen ni las bajadas','Suspender la carrera seis semanas y volver al mismo plan'],
  canillera:['Reposo de la instrucción hasta que no duela y después retomar igual','Tríceps sural con saltos desde la primera semana','Plantillas y cambio de calzado, con el mismo volumen de trote'],
  cauda:['Ejercicio con preferencia direccional y deslizamiento neural','Reposo relativo, analgesia y control en 48 horas','Tracción lumbar y educación, con la derivación programada'],
  tvp:['Movilización activa suave de tobillo y compresión elástica','Reposo con elevación de la extremidad y control en una semana','Isométricos de gemelos, evitando el masaje de la zona'],
  compartimental:['Descarga con bastones, hielo intermitente y control en 24 horas','Movilización activa suave de tobillo y dedos para bajar el edema','Vendaje elástico no compresivo y reevaluación por la tarde'],
  cardiaco:['Ejercicio de movilidad torácica y educación postural','Terapia manual dorsal suave y control en una semana','Reentrenamiento aeróbico progresivo supervisado'],
  fxestres:['Bajar el volumen a la mitad y mantener el trabajo de fuerza','Descarga con bota tres semanas y después progresar la carrera','Fortalecer tríceps sural y musculatura del pie, sin correr'],
  septica:['Crioterapia, descarga y movilización pasiva suave','Isométricos de cuádriceps y compresión para bajar el derrame','Reposo, elevación y control en 48 horas'],
  radicervical:['Fortalecimiento cervical con carga alta para estabilizar el segmento','Tracción cervical mantenida como único tratamiento','Movilización hacia la extensión para abrir el foramen'],
  cubital:['Carga progresiva de los flexopronadores','Deslizamiento neural en tensión máxima varias veces al día','Órtesis de contrafuerza en el antebrazo'],
  estenosis:['Ejercicio en extensión lumbar para recuperar la lordosis','Caminata continua de treinta minutos diarios desde el inicio','Tracción lumbar y reposo hasta que ceda la pesadez'],
  coxartrosis:['Estiramiento de flexores y rotadores como eje del tratamiento','Reposo de las caminatas hasta que ceda el dolor inguinal','Terapia manual de cadera sin programa de ejercicio'],
  pubalgia:['Reposo deportivo hasta que no duela y ahí volver a entrenar','Estiramiento intenso de aductores todos los días','Fortalecimiento de abductores y glúteo medio'],
  rotura:['Carga progresiva del manguito como en una tendinopatía','Movilización pasiva forzada para recuperar la elevación','Isométricos de rotación externa a carga máxima'],
  escafoides:['Movilización progresiva de muñeca como rigidez post-traumática','Órtesis de pulgar y ejercicio de agarre progresivo','Reposo relativo y control en tres semanas'],
  tibialpost:['Fortalecer peroneos y musculatura lateral del tobillo','Plantillas solamente, sin programa de ejercicio','Estiramiento del tríceps sural como eje del tratamiento'],
  morton:['Plantilla con apoyo bajo las cabezas metatarsianas','Movilización y masaje transverso del antepié cada sesión','Elevaciones de talón para fortalecer el tríceps sural'],
  vppb:['Ejercicios de habituación vestibular progresivos por seis semanas','Reposo evitando los movimientos que lo gatillan','Terapia manual cervical y fortalecimiento del cuello'],
  esclerosis:['Entrenamiento intensivo continuo para ganar resistencia rápido','Solo elongación y manejo de la espasticidad','Reposo en los períodos de más fatiga hasta que pase'],
  fxvertebral:['Ejercicio de extensión dorsal para corregir la cifosis','Movilización y terapia manual de la zona dolorosa','Faja y reposo relativo con control en dos semanas'],
};

/* Etiquetas cortas para el cuaderno: los nombres completos no caben
   en una fila de marcas y hay que poder leerlos de un vistazo. */
const CL_CORTO = {
  huaso:'Rigidez post-yeso', minero:'Lumbago crónico', basquetbol:'Tend. rotuliana',
  carrete:'Luxación hombro', banderas:'Banderas rojas', pinzamiento:'Pinzamiento',
  capsulitis:'Capsulitis', manguito:'Tend. supraespinoso', epicondilalgia:'Epicondilalgia lat.',
  tunel:'Túnel carpiano', dequervain:'De Quervain', lumbago:'Lumbago mecánico',
  radiculopatia:'Radiculopatía', trocanterico:'Dolor trocantérico', lca:'LCA',
  menisco:'Menisco', patelofemoral:'Patelofemoral', aquiles:'Tend. aquiliana',
  esguince:'Esguince tobillo', fascitis:'Fascitis plantar', cervicalgia:'Cervicalgia',
  epoc:'EPOC', acv:'ACV', bronquiolitis:'Bronquiolitis', neumonia:'Neumonía',
  postuci:'Debilidad UCI', parkinson:'Parkinson', facial:'Parálisis facial',
  artrosis:'Artrosis rodilla', cadera:'Prótesis cadera', latigazo:'Latigazo',
  epimedial:'Epicondilalgia med.', isquios:'Isquiotibiales', cintilla:'Cintilla iliotibial',
  canillera:'Canillera', cauda:'Cauda equina', tvp:'TVP', compartimental:'Compartimental',
  cardiaco:'Dolor cardíaco', fxestres:'Fx por estrés', septica:'Artritis séptica',
  radicervical:'Radiculopatía C6', cubital:'Túnel cubital', estenosis:'Estenosis lumbar',
  coxartrosis:'Artrosis cadera', pubalgia:'Pubalgia', rotura:'Rotura manguito',
  escafoides:'Fx escafoides', tibialpost:'Tibial posterior', morton:'Neuroma Morton',
  vppb:'VPPB', esclerosis:'Esclerosis múltiple', fxvertebral:'Fx vertebral',
};

/* Lo que dicen los pacientes cuando vuelven a la clínica. La gracia del
   juego no es solo acertar: es que la gente vuelva y uno se acuerde. */
const CL_REGRESO = {
  huaso:'Volvió con una bolsa de nueces del campo. Ya ensilla solo, pero quiere que le revisen la muñeca otra vez.',
  minero:'Bajó del turno derecho a la clínica. "Esta vez vine antes de que se pusiera fea", dice.',
  basquetbol:'Ganaron el campeonato. Trajo la foto del equipo y también la rodilla reclamando de nuevo.',
  carrete:'Volvió con el mismo hombro y la misma cara de susto. Esta vez fue jugando a la pelota.',
  banderas:'Volvió con los exámenes en la mano y quiere que se los expliquen con calma.',
  pinzamiento:'Terminó de pintar la casa entera. Adivina qué hombro le está doliendo.',
  capsulitis:'Ahora viene por el otro hombro. Sabe lo que le espera y trajo anotados sus ejercicios.',
  manguito:'Clasificó al nacional de aguas abiertas. Quiere ajustar la carga antes de que el hombro reclame.',
  epicondilalgia:'Trajo un banquito de madera que hizo él para la sala de espera.',
  tunel:'La guagua ya camina. Ahora es la otra mano la que se le duerme.',
  dequervain:'La guagua pesa cuatro kilos más y el pulgar volvió a reclamar.',
  lumbago:'Lo ascendieron a jefe de bodega. Levanta menos cajas y anda con menos susto.',
  radiculopatia:'Le cambiaron el asiento de la micro y viene a control. La pierna ya no le baja hasta el pie.',
  trocanterico:'Se compró zapatillas nuevas y volvió a caminar el cerro. La cadera se hizo notar.',
  lca:'Vuelve con la orden de rehabilitación en la mano y muchas ganas de volver a la cancha.',
  menisco:'Sigue jugando los domingos. Dice que la rodilla "le avisa" antes de bloquearse.',
  patelofemoral:'Se inscribió en la maratón de Santiago y viene a que la ayuden a llegar entera.',
  aquiles:'Volvió a las zapatillas viejas y el tendón volvió a hablar.',
  esguince:'Segundo esguince del mismo tobillo. Esta vez sí quiere hacer la propiocepción completa.',
  fascitis:'Cambió de local y ahora está de pie sobre cerámica. El talón lo notó altiro.',
  cervicalgia:'Quedó en teletrabajo permanente. Trajo una foto de su escritorio para que se lo revisen.',
  epoc:'Lleva ocho meses sin fumar y lo cuenta apenas entra por la puerta.',
  acv:'Llegó caminando con bastón y saludó con la mano que antes no levantaba.',
  bronquiolitis:'La misma guagua, un invierno después. La mamá ya reconoce sola los signos de alarma.',
  neumonia:'Salió del hospital y volvió a su huerta. Viene a que le controlen la tolerancia al esfuerzo.',
  postuci:'Volvió a hacer clases. Todavía se cansa, pero ya sube sola los dos pisos del colegio.',
  parkinson:'Trajo la lista de canciones que usa para caminar. Dice que con cueca le sale mejor.',
  facial:'La cara volvió a su lugar. Viene por otra cosa y, de paso, a dar las gracias.',
  artrosis:'Sigue en la Vega, pero ahora con un piso alto para no estar tantas horas parada.',
  cadera:'Entró sin andador, con su hija atrás muerta de nervios.',
  latigazo:'Otro choque, otra micro. Esta vez llegó a la semana y no al mes.',
  isquios:'Volvió a jugar y volvió el tirón, en el mismo muslo. Ahora quiere hacerlo bien.',
  cintilla:'Terminó el trail de 30K. Viene a preparar el siguiente sin dolor.',
  epimedial:'Le cambió el mango a la pala. El codo se lo agradeció.',
  canillera:'Terminó el servicio militar. Ahora corre por gusto y quiere hacerlo sin dolerse.',
  cauda:'Lo operaron esa misma noche. Vuelve caminando, a rehabilitar y a agradecer que lo mandaran altiro.',
  tvp:'Estuvo anticoagulada tres meses. Recién ahora viene a rehabilitar el tobillo, con el alta del internista en la mano.',
  compartimental:'Alcanzaron a hacerle la fasciotomía. Muestra la cicatriz como trofeo y quiere volver al rugby.',
  cardiaco:'Le pusieron dos stents. Viene derivado a rehabilitación cardíaca y trae pan amasado para todos.',
  fxestres:'Ocho semanas sin bailar. Volvió preguntando por la carga antes de subirla, que es lo que había que aprender.',
  septica:'Le hicieron aseo quirúrgico y salvó la rodilla. Vuelve a recuperar rango, con la glicemia bajo control.',
  radicervical:'Le pasó el corrientazo del brazo. Ahora viene por el hombro del otro lado, de tanto compensar.',
  cubital:'Cambió la postura al manejar y dejó de dormírsele el meñique. Vuelve a control, agradecido.',
  estenosis:'Sigue saliendo a caminar, pero ahora con bastones y pausas. Llega mucho más lejos que antes.',
  coxartrosis:'Se puso los calcetines sola por primera vez en un año y vino a contarlo.',
  pubalgia:'Volvió a jugar y aguantó la temporada entera. Ahora trae a un compañero con lo mismo.',
  rotura:'Lo operaron y volvió con la orden de rehabilitación. Trajo un banquito que hizo con la mano buena.',
  escafoides:'Estuvo ocho semanas con yeso, pero consolidó. Vuelve a recuperar la muñeca, y sin skate por ahora.',
  tibialpost:'Con las plantillas y los ejercicios el pie aguantó. Ya se para en la punta de ese pie.',
  morton:'Botó los tacos y anda con zapatilla ancha. Dice que fue el mejor consejo que le han dado.',
  vppb:'Le volvió el vértigo del otro lado. Esta vez llegó al día siguiente en vez de aguantar una semana.',
  esclerosis:'Tuvo un brote y lo remontó. Sigue haciendo clases y viene a ajustar el programa.',
  fxvertebral:'Consolidó y está en tratamiento de la osteoporosis. Viene ahora sí a hacer ejercicio, con calma.',
};

/* Músculos para el modo de repaso. Origen/inserción resumidos.
   La inervación lleva las raíces entre paréntesis: en la prueba
   preguntan el nervio, pero en clínica lo que sirve es la raíz. */
const KIN_MUSCULOS = [
  { nom:'Supraespinoso',        origen:'Fosa supraespinosa de la escápula',            insercion:'Troquíter (tubérculo mayor del húmero)',   nervio:'Supraescapular (C5-C6)',    accion:'Abducción de hombro (inicia el movimiento)' },
  { nom:'Infraespinoso',        origen:'Fosa infraespinosa de la escápula',            insercion:'Troquíter',                                 nervio:'Supraescapular (C5-C6)',    accion:'Rotación externa de hombro' },
  { nom:'Subescapular',         origen:'Fosa subescapular',                            insercion:'Troquín (tubérculo menor del húmero)',      nervio:'Subescapulares superior e inferior (C5-C6)',accion:'Rotación interna de hombro' },
  { nom:'Redondo menor',        origen:'Borde lateral de la escápula',                 insercion:'Troquíter',                                 nervio:'Axilar (C5-C6)',            accion:'Rotación externa de hombro' },
  { nom:'Deltoides',            origen:'Clavícula lateral, acromion y espina escapular',insercion:'Tuberosidad deltoidea del húmero',         nervio:'Axilar (C5-C6)',            accion:'Abducción de hombro; flexión y extensión según porción' },
  { nom:'Pectoral mayor',       origen:'Clavícula, esternón y cartílagos costales',    insercion:'Labio lateral del surco intertubercular',    nervio:'Pectorales lateral y medial (C5-T1)',accion:'Aducción, rotación interna y flexión de hombro' },
  { nom:'Dorsal ancho',         origen:'Apófisis espinosas T7-L5, sacro y cresta ilíaca',insercion:'Surco intertubercular del húmero',        nervio:'Toracodorsal (C6-C8)',      accion:'Aducción, extensión y rotación interna de hombro' },
  { nom:'Trapecio',             origen:'Occipital, ligamento nucal y apófisis espinosas C7-T12',insercion:'Clavícula, acromion y espina de la escápula',nervio:'Accesorio (XI); aporte sensitivo de C3-C4',accion:'Elevación, retracción y rotación superior de escápula' },
  { nom:'Serrato anterior',     origen:'Caras laterales de las costillas 1 a 9',       insercion:'Borde medial de la escápula',               nervio:'Torácico largo (C5-C7)',    accion:'Protracción y rotación superior de escápula' },
  { nom:'Bíceps braquial',      origen:'Tubérculo supraglenoideo y apófisis coracoides',insercion:'Tuberosidad del radio',                    nervio:'Musculocutáneo (C5-C6)',    accion:'Flexión de codo y supinación del antebrazo' },
  { nom:'Tríceps braquial',     origen:'Tubérculo infraglenoideo y cara posterior del húmero',insercion:'Olécranon',                          nervio:'Radial (C6-C8)',            accion:'Extensión de codo' },
  { nom:'Braquial',             origen:'Cara anterior distal del húmero',              insercion:'Tuberosidad del cúbito',                    nervio:'Musculocutáneo (C5-C6), con aporte del radial',accion:'Flexión de codo (es el flexor puro, no depende de la posición del antebrazo)' },
  { nom:'Psoas mayor',          origen:'Cuerpos y apófisis transversas de T12-L5',     insercion:'Trocánter menor del fémur',                 nervio:'Ramos anteriores directos del plexo lumbar (L1-L3)',accion:'Flexión de cadera' },
  { nom:'Glúteo mayor',         origen:'Ilion posterior, sacro y cóccix',              insercion:'Tuberosidad glútea y tracto iliotibial',    nervio:'Glúteo inferior (L5-S2)',   accion:'Extensión y rotación externa de cadera' },
  { nom:'Glúteo medio',         origen:'Cara externa del ilion',                       insercion:'Trocánter mayor',                           nervio:'Glúteo superior (L4-S1)',   accion:'Abducción de cadera y estabilización de la pelvis' },
  { nom:'Piriforme',            origen:'Cara anterior del sacro',                      insercion:'Borde superior del trocánter mayor',        nervio:'Nervio del piriforme (S1-S2)',accion:'Rotación externa de cadera (y abducción con la cadera flectada)' },
  { nom:'Tensor de la fascia lata',origen:'Espina ilíaca anterosuperior',              insercion:'Tracto iliotibial',                         nervio:'Glúteo superior (L4-S1)',   accion:'Abducción y flexión de cadera' },
  { nom:'Recto femoral',        origen:'Espina ilíaca anteroinferior',                 insercion:'Tuberosidad tibial vía tendón rotuliano',   nervio:'Femoral (L2-L4)',           accion:'Extensión de rodilla y flexión de cadera' },
  { nom:'Vasto medial',         origen:'Línea intertrocantérica y labio medial de la línea áspera',insercion:'Tuberosidad tibial vía tendón rotuliano',nervio:'Femoral (L2-L4)',    accion:'Extensión de rodilla' },
  { nom:'Bíceps femoral',       origen:'Cabeza larga en la tuberosidad isquiática; cabeza corta en la línea áspera',insercion:'Cabeza del peroné',nervio:'Ciático: cabeza larga por la división tibial, cabeza corta por la peronea común (L5-S2)',accion:'Flexión de rodilla y extensión de cadera' },
  { nom:'Semitendinoso',        origen:'Tuberosidad isquiática',                       insercion:'Pata de ganso (tibia medial)',              nervio:'Ciático, división tibial (L5-S2)',accion:'Flexión de rodilla y extensión de cadera' },
  { nom:'Sartorio',             origen:'Espina ilíaca anterosuperior',                 insercion:'Pata de ganso',                             nervio:'Femoral (L2-L3)',           accion:'Flexión, abducción y rotación externa de cadera' },
  { nom:'Gastrocnemio',         origen:'Cóndilos femorales',                           insercion:'Calcáneo vía tendón de Aquiles',            nervio:'Tibial (S1-S2)',            accion:'Flexión plantar de tobillo y flexión de rodilla' },
  { nom:'Sóleo',                origen:'Línea del sóleo en la tibia y cabeza del peroné',insercion:'Calcáneo vía tendón de Aquiles',          nervio:'Tibial (S1-S2)',            accion:'Flexión plantar de tobillo (el que trabaja con la rodilla flectada)' },
  { nom:'Tibial anterior',      origen:'Cóndilo lateral y cara lateral de la tibia',   insercion:'Primera cuña y base del primer metatarsiano',nervio:'Peroneo profundo (L4-L5)', accion:'Dorsiflexión e inversión del pie' },
  { nom:'Tibial posterior',     origen:'Membrana interósea, tibia y peroné',           insercion:'Escafoides, cuñas y bases de los metatarsianos 2 a 4',nervio:'Tibial (L4-L5)',  accion:'Flexión plantar e inversión del pie; sostiene el arco medial' },
  { nom:'Recto abdominal',      origen:'Pubis',                                        insercion:'Cartílagos costales 5-7 y apéndice xifoides',nervio:'Toracoabdominales T7-T11 y subcostal T12',accion:'Flexión de tronco' },
  { nom:'Transverso del abdomen',origen:'Cresta ilíaca, fascia toracolumbar y cartílagos costales',insercion:'Línea alba y pubis',            nervio:'Toracoabdominales T7-T12, iliohipogástrico e ilioinguinal (L1)',accion:'Compresión abdominal y estabilización lumbopélvica' },
  { nom:'Cuadrado lumbar',      origen:'Cresta ilíaca y ligamento iliolumbar',         insercion:'Duodécima costilla y apófisis transversas lumbares',nervio:'Subcostal (T12) y ramos del plexo lumbar (L1-L4)',accion:'Inclinación lateral de tronco' },
  { nom:'Diafragma',            origen:'Apéndice xifoides, últimas costillas y vértebras lumbares',insercion:'Centro frénico',                nervio:'Frénico (C3-C5)',           accion:'Principal músculo de la inspiración' },
];

/* Rangos articulares de referencia (AAOS). Si en la U usan otra
   fuente, se cambian estos números y el juego queda consistente. */
const KIN_RANGOS = [
  { art:'Hombro',  mov:'Flexión',            grados:180 },
  { art:'Hombro',  mov:'Abducción',          grados:180 },
  { art:'Hombro',  mov:'Rotación externa',   grados:90 },
  { art:'Hombro',  mov:'Rotación interna',   grados:70 },
  { art:'Codo',    mov:'Flexión',            grados:150 },
  { art:'Antebrazo',mov:'Pronación',         grados:80 },
  { art:'Antebrazo',mov:'Supinación',        grados:80 },
  { art:'Muñeca',  mov:'Flexión',            grados:80 },
  { art:'Muñeca',  mov:'Extensión',          grados:70 },
  { art:'Cadera',  mov:'Flexión',            grados:120 },
  { art:'Cadera',  mov:'Abducción',          grados:45 },
  { art:'Cadera',  mov:'Extensión',          grados:30 },
  { art:'Rodilla', mov:'Flexión',            grados:135 },
  { art:'Tobillo', mov:'Dorsiflexión',       grados:20 },
  { art:'Tobillo', mov:'Flexión plantar',    grados:50 },
];

/* ============================================================
   MOTOR DE DIAGNÓSTICO — datos del diferencial
   ------------------------------------------------------------
   Revisado por Catalina (31-jul-2026). Si algo hay que corregir,
   se corrige acá y el juego entero queda corregido.
   Ver REVISION-KINESIOLOGIA.md.

   Para cada caso: qué hipótesis compiten (dif) y qué revela cada
   acción (c). En cada pista, `s` son las hipótesis que la pista
   apoya y `n` las que vuelve menos probables.
   La gracia está en las pistas que DISCRIMINAN: si una pista sube
   todas las hipótesis por igual, no sirve para decidir.
   ============================================================ */

/* Acciones que se pueden hacer con un paciente. `t` es el tiempo que
   consume; las imágenes además cuestan plata. */
const CL_ACC = [
  { id:'presentarse', g:'anam', n:'Presentarse y confirmar quién es', t:1 },
  { id:'inicio',  g:'anam', n:'¿Cómo y cuándo empezó?',        t:1 },
  { id:'trauma',  g:'anam', n:'¿Hubo golpe o caída?',          t:1 },
  { id:'noche',   g:'anam', n:'¿Le duele de noche?',           t:1 },
  { id:'irradia', g:'anam', n:'¿El dolor se corre a otra parte?', t:1 },
  { id:'agrava',  g:'anam', n:'¿Qué lo empeora y qué lo alivia?', t:1 },
  { id:'antec',   g:'anam', n:'Antecedentes de salud',         t:1 },
  { id:'alarma',  g:'anam', n:'Preguntar por síntomas de alarma', t:1 },
  { id:'creencias', g:'anam', n:'¿Qué cree que tiene y qué espera?', t:1 },
  { id:'charla',  g:'anam', n:'Conversar un poco, romper el hielo', t:1 },
  { id:'consentimiento', g:'exam', n:'Pedir permiso antes de examinar', t:1 },
  { id:'insp',    g:'exam', n:'Inspección',                    t:1 },
  { id:'palp',    g:'exam', n:'Palpación',                     t:1 },
  { id:'activo',  g:'exam', n:'Rango de movimiento activo',    t:2 },
  { id:'pasivo',  g:'exam', n:'Rango de movimiento pasivo',    t:2 },
  { id:'fuerza',  g:'exam', n:'Fuerza muscular',               t:2 },
  { id:'neuro',   g:'exam', n:'Tamizaje neurológico',          t:2 },
  { id:'imgRx',   g:'img',  n:'Radiografía',                   t:3, plata:12000 },
  { id:'imgEco',  g:'img',  n:'Ecografía',                     t:3, plata:22000 },
];

const CL_TIEMPO_BASE = 13;   // unidades de tiempo por paciente

/* ============================================================
   PAUTA DEL DOCENTE
   En la simulación de la U no la evalúan solo por acertar el cuadro:
   la evalúan por cómo condujo la atención. Esta es esa pauta, y se
   prende con el interruptor de modo simulación (no cambia nada del
   juego normal: es una capa de evaluación encima).

   `aplica` hace que la pauta se adapte al caso: no se le exige medir
   movilidad pasiva en un paciente respiratorio.
   ============================================================ */
const CL_PAUTA = [
  { id:'presenta', dom:'Trato', pts:5,  txt:'Se presentó y confirmó con quién estaba hablando',
    ok:t => t.hechas.indexOf('presentarse') !== -1 },
  { id:'consent',  dom:'Trato', pts:5,  txt:'Pidió permiso antes de poner las manos',
    ok:t => t.hechas.indexOf('consentimiento') !== -1 },
  { id:'vinculo',  dom:'Trato', pts:4,  txt:'Se tomó un momento para conocer al paciente',
    ok:t => (t.rapport || 0) > 0 },

  { id:'inicio',   dom:'Anamnesis', pts:8,  txt:'Indagó cómo y cuándo empezó',
    ok:t => t.hechas.indexOf('inicio') !== -1 },
  { id:'alarma',   dom:'Anamnesis', pts:12, txt:'Preguntó por banderas rojas',
    ok:t => t.hechas.indexOf('alarma') !== -1 },
  { id:'antec',    dom:'Anamnesis', pts:7,  txt:'Recogió antecedentes de salud',
    ok:t => t.hechas.indexOf('antec') !== -1 },
  { id:'amarilla', dom:'Anamnesis', pts:7,  txt:'Exploró creencias y expectativas',
    ok:t => t.hechas.indexOf('creencias') !== -1 || !!t.amarillaVista },

  { id:'insp',     dom:'Examen', pts:6, txt:'Inspeccionó antes de palpar',
    aplica:t => clPautaTiene(t, 'insp'),
    ok:t => t.hechas.indexOf('insp') !== -1 &&
            (t.hechas.indexOf('palp') === -1 || t.hechas.indexOf('insp') < t.hechas.indexOf('palp')) },
  { id:'palp',     dom:'Examen', pts:5, txt:'Palpó la zona comprometida',
    aplica:t => clPautaTiene(t, 'palp'), ok:t => t.hechas.indexOf('palp') !== -1 },
  { id:'rom',      dom:'Examen', pts:8, txt:'Midió movilidad activa y pasiva',
    aplica:t => clPautaTiene(t, 'activo') || clPautaTiene(t, 'pasivo'),
    ok:t => t.hechas.indexOf('activo') !== -1 && t.hechas.indexOf('pasivo') !== -1 },
  { id:'fuerza',   dom:'Examen', pts:6, txt:'Evaluó fuerza',
    aplica:t => clPautaTiene(t, 'fuerza'), ok:t => t.hechas.indexOf('fuerza') !== -1 },
  { id:'neuro',    dom:'Examen', pts:7, txt:'Hizo el tamizaje neurológico',
    aplica:t => clPautaTiene(t, 'neuro'), ok:t => t.hechas.indexOf('neuro') !== -1 },
  { id:'prueba',   dom:'Examen', pts:8, txt:'Eligió una prueba especial pertinente',
    aplica:t => !!t.caso.prueba,
    ok:t => t.hechas.indexOf('test_' + t.caso.prueba) !== -1 },

  { id:'dx',       dom:'Razonamiento', pts:15, txt:'Llegó al diagnóstico correcto',
    ok:t => t.errores === 0 && !t.dxFallado },
  { id:'cobertura', dom:'Razonamiento', pts:10, txt:'Buscó los hallazgos que discriminaban',
    ok:t => (t.correccion ? t.correccion.pct : 0) >= 70 },

  { id:'tto',      dom:'Plan', pts:12, txt:'Indicó el manejo correcto para la fase',
    ok:t => !t.ttoFallado },
  { id:'derivar',  dom:'Plan', pts:10, txt:'Reconoció que correspondía derivar',
    aplica:t => !!t.caso.derivar, ok:t => !!t.derivado },
];

/* Acciones que no aportan al diferencial y por lo tanto no se anotan. */
const CL_NO_ANOTA = ['creencias','charla','presentarse','consentimiento'];

/* Un ítem de examen solo se exige si el caso lo contempla. */
function clPautaTiene(t, k){
  const dx = KIN_DX[t.caso.id];
  return !!(dx && dx.c && dx.c[k]);
}

/* El interruptor va por aparato, no en el estado compartido: ella puede
   practicar con pauta mientras el otro juega el tycoon tranquilo. */
function clSimulacion(){
  try{ return localStorage.getItem('rinconSimulacion') === '1'; }catch(e){ return false; }
}
function clFijarSimulacion(v){
  try{ localStorage.setItem('rinconSimulacion', v ? '1' : '0'); }catch(e){}
  jxSonido('tap');
  clPanel();
}

function clEvaluarPauta(t){
  const items = CL_PAUTA.filter(x => !x.aplica || x.aplica(t));
  const doms = {};
  let obt = 0, tot = 0;
  const faltó = [];
  items.forEach(x => {
    const cumple = !!x.ok(t);
    tot += x.pts;
    if(cumple) obt += x.pts; else faltó.push(x);
    if(!doms[x.dom]) doms[x.dom] = { obt:0, tot:0 };
    doms[x.dom].tot += x.pts;
    if(cumple) doms[x.dom].obt += x.pts;
  });
  return { items, doms, obt, tot, pct: tot ? Math.round(obt / tot * 100) : 100, faltó };
}

/* atajo para escribir menos: p(texto, sube, baja) */
const p = (t, s, n) => ({ t, s: s ? s.split(' ') : [], n: n ? n.split(' ') : [] });

const KIN_DX = {
  huaso: {
    dif:['huaso','dequervain','tunel'],
    c:{
      inicio:  p('Empezó al sacarle el yeso, hace dos semanas.','huaso','dequervain tunel'),
      trauma:  p('Caída del caballo con apoyo de la mano, hace dos meses.','huaso','dequervain tunel'),
      antec:   p('Seis semanas inmovilizado con yeso.','huaso','dequervain'),
      activo:  p('Rango ACTIVO limitado en todas las direcciones.','huaso','dequervain'),
      pasivo:  p('El rango PASIVO está igual de limitado: la articulación está rígida.','huaso','dequervain tunel'),
      palp:    p('Molestia difusa, sin dolor puntual en la estiloides ni en un tendón.','huaso','dequervain'),
      neuro:   p('Sin hormigueo ni pérdida de sensibilidad.','huaso','tunel'),
      insp:    p('Mano algo hinchada y con la piel distinta, típico tras inmovilización.','huaso',''),
    },
  },
  minero: {
    dif:['minero','radiculopatia','lumbago'],
    c:{
      inicio:  p('Más de un año, va y viene, sin un accidente que lo explique.','minero','lumbago'),
      trauma:  p('Ningún golpe ni esfuerzo puntual.','minero','lumbago'),
      irradia: p('El dolor se queda en la zona lumbar, no baja de la rodilla.','minero lumbago','radiculopatia'),
      neuro:   p('Tamizaje neurológico normal.','minero lumbago','radiculopatia'),
      agrava:  p('Peor al final del turno de doce horas y los días de más carga.','minero','lumbago'),
      alarma:  p('Sin banderas rojas.','minero lumbago',''),
      antec:   p('Años de turnos largos, vibración y levantar peso.','minero','lumbago'),
    },
  },
  basquetbol: {
    dif:['basquetbol','patelofemoral','menisco'],
    c:{
      inicio:  p('Subió mucho los saltos en los entrenamientos antes del campeonato.','basquetbol','menisco'),
      trauma:  p('Sin torsión ni golpe.','basquetbol patelofemoral','menisco'),
      palp:    p('Dolor PUNTUAL en el polo inferior de la rótula.','basquetbol','patelofemoral menisco'),
      agrava:  p('Duele al saltar y al caer; estar sentado no le molesta.','basquetbol','patelofemoral'),
      insp:    p('Sin derrame articular.','basquetbol patelofemoral','menisco'),
      activo:  p('Rigidez al partir que cede al entrar en calor, sin bloqueos.','basquetbol','menisco'),
    },
  },
  carrete: {
    dif:['carrete','pinzamiento','manguito'],
    c:{
      inicio:  p('Episodio agudo el fin de semana: se le salió el hombro y se lo redujeron en urgencias.','carrete','pinzamiento manguito'),
      trauma:  p('Caída con el brazo estirado hacia atrás.','carrete','pinzamiento manguito'),
      agrava:  p('Siente que el hombro se le va a volver a salir al levantar el brazo hacia atrás.','carrete','pinzamiento manguito'),
      fuerza:  p('Fuerza limitada por dolor y por miedo, no por debilidad real.','carrete','manguito'),
      activo:  p('Evita activamente la rotación externa en abducción.','carrete','pinzamiento'),
      insp:    p('Sin atrofia ni deformidad tras la reducción.','carrete','manguito'),
    },
  },
  banderas: {
    dif:['banderas','lumbago','radiculopatia'],
    c:{
      inicio:  p('Dos meses, progresivo, sin ningún esfuerzo que lo explique.','banderas','lumbago'),
      alarma:  p('BAJA DE PESO no buscada y dolor nocturno que lo despierta.','banderas','lumbago radiculopatia'),
      agrava:  p('No cede con el reposo ni cambia con la posición.','banderas','lumbago'),
      trauma:  p('Ningún golpe ni esfuerzo previo.','banderas','lumbago'),
      neuro:   p('Sin déficit focal por ahora.','banderas lumbago','radiculopatia'),
      irradia: p('Dolor lumbar profundo, no sigue un dermatoma.','banderas lumbago','radiculopatia'),
    },
  },
  /* ---------- hombro: tres cuadros que se confunden en serio ---------- */
  pinzamiento: {
    dif:['pinzamiento','manguito','capsulitis','cervicalgia'],
    c:{
      inicio:  p('Progresivo, varios meses, sin un episodio claro.','pinzamiento manguito capsulitis','cervicalgia'),
      trauma:  p('Ningún golpe ni caída.','pinzamiento manguito capsulitis',''),
      noche:   p('Sí, sobre todo al acostarse sobre ese lado.','pinzamiento manguito capsulitis','cervicalgia'),
      agrava:  p('Empeora al trabajar con los brazos sobre la cabeza.','pinzamiento manguito','capsulitis cervicalgia'),
      irradia: p('Se queda en el hombro, no baja del codo.','pinzamiento manguito capsulitis','cervicalgia'),
      activo:  p('Arco doloroso entre 60° y 120° de abducción.','pinzamiento manguito','capsulitis'),
      pasivo:  p('Rango pasivo CONSERVADO en todos los planos.','pinzamiento manguito','capsulitis'),
      fuerza:  p('Fuerza prácticamente conservada.','pinzamiento','manguito'),
      neuro:   p('Sin alteraciones neurológicas.','pinzamiento manguito capsulitis','cervicalgia'),
    },
  },
  manguito: {
    dif:['manguito','pinzamiento','capsulitis','cervicalgia'],
    c:{
      inicio:  p('Tras subir bruscamente el volumen de entrenamiento.','manguito pinzamiento','capsulitis'),
      trauma:  p('Sin trauma, fue por sobrecarga.','manguito pinzamiento capsulitis',''),
      agrava:  p('Duele justo en el gesto de brazada.','manguito pinzamiento','capsulitis'),
      activo:  p('Dolor en abducción, sin bloqueo del rango.','manguito pinzamiento','capsulitis'),
      pasivo:  p('Rango pasivo completo.','manguito pinzamiento','capsulitis'),
      fuerza:  p('DEBILIDAD clara en abducción resistida.','manguito','pinzamiento capsulitis'),
      palp:    p('Dolor a la palpación del troquíter.','manguito pinzamiento','cervicalgia'),
      imgEco:  p('Engrosamiento del tendón supraespinoso, sin rotura completa.','manguito','pinzamiento capsulitis cervicalgia'),
    },
  },
  capsulitis: {
    dif:['capsulitis','pinzamiento','manguito','cervicalgia'],
    c:{
      inicio:  p('Se fue poniendo rígido de a poco durante meses.','capsulitis','manguito'),
      trauma:  p('Sin trauma.','capsulitis pinzamiento manguito',''),
      antec:   p('Diabetes tipo 2 en tratamiento.','capsulitis','pinzamiento manguito'),
      noche:   p('Dolor nocturno que fue cediendo mientras aumentaba la rigidez.','capsulitis','pinzamiento'),
      activo:  p('Movilidad ACTIVA muy limitada en todos los planos.','capsulitis','pinzamiento manguito'),
      pasivo:  p('La movilidad PASIVA también está restringida; la rotación externa es la peor.','capsulitis','pinzamiento manguito cervicalgia'),
      fuerza:  p('Fuerza conservada en lo poco que puede mover.','capsulitis','manguito'),
      neuro:   p('Sin compromiso neurológico.','capsulitis','cervicalgia'),
    },
  },
  cervicalgia: {
    dif:['cervicalgia','pinzamiento','radiculopatia','capsulitis'],
    c:{
      inicio:  p('Molestia que aparece al final de la jornada, hace meses.','cervicalgia','pinzamiento'),
      trauma:  p('Sin trauma ni accidente.','cervicalgia pinzamiento','radiculopatia'),
      agrava:  p('Empeora con posturas sostenidas y mejora al moverse.','cervicalgia','pinzamiento capsulitis'),
      irradia: p('Molestia difusa de cuello y hombros, NO baja del codo.','cervicalgia','radiculopatia'),
      neuro:   p('Tamizaje neurológico normal.','cervicalgia','radiculopatia'),
      activo:  p('Rango cervical algo limitado por dolor, hombro libre.','cervicalgia','pinzamiento capsulitis'),
      palp:    p('Musculatura cervical y de trapecios sensible.','cervicalgia','pinzamiento'),
      alarma:  p('Sin banderas rojas.','cervicalgia',''),
    },
  },

  /* ---------- codo y muñeca ---------- */
  epicondilalgia: {
    dif:['epicondilalgia','tunel','dequervain'],
    c:{
      inicio:  p('Progresivo, por uso repetido de herramientas.','epicondilalgia','tunel'),
      agrava:  p('Duele al apretar la mano o levantar una taza.','epicondilalgia','tunel dequervain'),
      palp:    p('Dolor puntual en el epicóndilo LATERAL.','epicondilalgia','tunel dequervain'),
      fuerza:  p('Dolor con la extensión de muñeca resistida.','epicondilalgia','tunel dequervain'),
      neuro:   p('Sin hormigueos ni alteración de la sensibilidad.','epicondilalgia','tunel'),
      noche:   p('No despierta de noche.','epicondilalgia dequervain','tunel'),
    },
  },
  tunel: {
    dif:['tunel','epicondilalgia','cervicalgia'],
    c:{
      inicio:  p('Hormigueo progresivo, peor de noche.','tunel','epicondilalgia'),
      noche:   p('Despierta de noche y necesita sacudir la mano.','tunel','epicondilalgia'),
      irradia: p('Compromete pulgar, índice, medio y mitad del anular. El meñique NO.','tunel','cervicalgia epicondilalgia'),
      antec:   p('Embarazo reciente y trabajo prolongado en teclado.','tunel',''),
      neuro:   p('Alteración de la sensibilidad en el territorio del nervio mediano.','tunel','epicondilalgia'),
      insp:    p('Leve atrofia de la eminencia tenar.','tunel','cervicalgia epicondilalgia'),
    },
  },
  dequervain: {
    dif:['dequervain','tunel','epicondilalgia'],
    c:{
      inicio:  p('Empezó después de sostener repetidamente a la guagua.','dequervain',''),
      palp:    p('Dolor e inflamación en la estiloides RADIAL.','dequervain','tunel epicondilalgia'),
      agrava:  p('Duele al agarrar y al desviar la muñeca.','dequervain','tunel'),
      neuro:   p('Sin hormigueo ni compromiso sensitivo.','dequervain epicondilalgia','tunel'),
      insp:    p('Aumento de volumen sobre el primer compartimento dorsal.','dequervain','tunel'),
    },
  },

  /* ---------- lumbar: lo importante es separar mecánico de radicular ---------- */
  lumbago: {
    dif:['lumbago','radiculopatia','trocanterico'],
    c:{
      inicio:  p('Empezó de golpe al levantar una caja.','lumbago radiculopatia',''),
      trauma:  p('Sin caída; fue el esfuerzo de levantar peso mal.','lumbago radiculopatia',''),
      irradia: p('El dolor NO baja de la rodilla.','lumbago','radiculopatia'),
      neuro:   p('Sin déficit neurológico ni alteración de reflejos.','lumbago','radiculopatia'),
      agrava:  p('Duele con ciertos movimientos y alivia con otros.','lumbago','radiculopatia'),
      alarma:  p('Sin banderas rojas: no hay fiebre, baja de peso ni compromiso de esfínteres.','lumbago radiculopatia',''),
      palp:    p('Dolor en la musculatura paravertebral; el trocánter mayor NO duele.','lumbago','radiculopatia trocanterico'),
    },
  },
  radiculopatia: {
    dif:['radiculopatia','lumbago','trocanterico'],
    c:{
      inicio:  p('Instalación progresiva, empeora al estar sentado mucho rato.','radiculopatia','lumbago'),
      irradia: p('El dolor BAJA de la rodilla siguiendo un dermatoma.','radiculopatia','lumbago trocanterico'),
      neuro:   p('Hormigueo y debilidad en el territorio de la raíz comprometida.','radiculopatia','lumbago'),
      agrava:  p('Empeora al toser y al pujar.','radiculopatia','lumbago'),
      alarma:  p('Sin compromiso de esfínteres ni anestesia en silla de montar.','radiculopatia lumbago',''),
      fuerza:  p('Debilidad segmentaria concordante con la raíz.','radiculopatia','lumbago trocanterico'),
    },
  },
  trocanterico: {
    dif:['trocanterico','radiculopatia','lumbago'],
    c:{
      inicio:  p('Apareció tras aumentar las caminatas, sin trauma.','trocanterico',''),
      noche:   p('Duele al dormir sobre ese lado.','trocanterico','lumbago'),
      palp:    p('Dolor puntual SOBRE el trocánter mayor.','trocanterico','lumbago radiculopatia'),
      irradia: p('Puede bajar por la cara lateral del muslo, pero no sigue un dermatoma.','trocanterico','radiculopatia'),
      neuro:   p('Sin déficit neurológico.','trocanterico lumbago','radiculopatia'),
      agrava:  p('Empeora al subir escaleras y al cruzar la pierna.','trocanterico','lumbago'),
    },
  },

  /* ---------- rodilla ---------- */
  lca: {
    dif:['lca','menisco','patelofemoral'],
    c:{
      inicio:  p('Giro con el pie fijo; sintió un chasquido y se hinchó en pocas horas.','lca','patelofemoral'),
      trauma:  p('Mecanismo de torsión en cambio de dirección.','lca menisco','patelofemoral'),
      insp:    p('Derrame articular INSTALADO EN LAS PRIMERAS HORAS.','lca','menisco patelofemoral'),
      agrava:  p('Sensación de que la rodilla “se va” al apoyar.','lca','patelofemoral'),
      activo:  p('Limitación por dolor y derrame, sin bloqueo mecánico.','lca','menisco'),
      fuerza:  p('Inhibición del cuádriceps.','lca menisco',''),
    },
  },
  menisco: {
    dif:['menisco','lca','patelofemoral'],
    c:{
      inicio:  p('Giro con el pie apoyado y la rodilla flectada.','menisco lca','patelofemoral'),
      insp:    p('Derrame de instalación LENTA, en días.','menisco','lca'),
      agrava:  p('Se le bloquea la rodilla y siente chasquidos.','menisco','lca patelofemoral'),
      palp:    p('Dolor en la interlínea articular.','menisco','patelofemoral lca'),
      activo:  p('Bloqueo mecánico a la extensión completa.','menisco','patelofemoral'),
    },
  },
  patelofemoral: {
    dif:['patelofemoral','menisco','lca'],
    c:{
      inicio:  p('Apareció al subir muy rápido los kilómetros de trote.','patelofemoral','lca menisco'),
      trauma:  p('Sin trauma ni torsión.','patelofemoral','lca menisco'),
      agrava:  p('Duele al bajar escaleras y al estar mucho rato sentada.','patelofemoral','menisco'),
      insp:    p('Sin derrame articular.','patelofemoral','lca menisco'),
      palp:    p('Dolor peripatelar difuso, interlínea indolora.','patelofemoral','menisco'),
      activo:  p('Valgo dinámico y mal control de la pelvis en apoyo monopodal.','patelofemoral','menisco lca'),
    },
  },

  /* ---------- tobillo y pie ---------- */
  aquiles: {
    dif:['aquiles','esguince','fascitis'],
    c:{
      inicio:  p('Progresivo, tras subir volumen y cambiar de zapatillas.','aquiles','esguince'),
      trauma:  p('Sin torcedura ni episodio agudo.','aquiles fascitis','esguince'),
      agrava:  p('Rigidez matinal en el tendón que cede al entrar en calor.','aquiles','esguince fascitis'),
      palp:    p('Engrosamiento y dolor en el tercio medio del tendón.','aquiles','fascitis esguince'),
      insp:    p('Sin hematoma ni inflamación lateral.','aquiles fascitis','esguince'),
    },
  },
  esguince: {
    dif:['esguince','aquiles','fascitis'],
    c:{
      inicio:  p('Se torció el tobillo al caer de un salto.','esguince','aquiles fascitis'),
      trauma:  p('Inversión forzada con el pie en flexión plantar.','esguince','aquiles fascitis'),
      insp:    p('Inflamación y hematoma en la cara LATERAL del tobillo.','esguince','aquiles fascitis'),
      palp:    p('Dolor sobre el ligamento peroneoastragalino anterior.','esguince','aquiles'),
      imgRx:   p('Sin fractura.','esguince','')
    },
  },
  fascitis: {
    dif:['fascitis','aquiles','esguince'],
    c:{
      inicio:  p('Progresivo, tras muchas horas de pie sobre superficie dura.','fascitis','esguince'),
      agrava:  p('Duele con los PRIMEROS PASOS de la mañana y mejora al caminar un rato.','fascitis','aquiles esguince'),
      palp:    p('Dolor puntual en la zona medial del talón.','fascitis','aquiles esguince'),
      trauma:  p('Sin torcedura.','fascitis aquiles','esguince'),
      insp:    p('Sin hematoma ni deformidad.','fascitis aquiles','esguince'),
    },
  },

  /* ---------- respiratorio y neurológico ---------- */
  epoc: {
    dif:['epoc','acv'],
    c:{
      inicio:  p('Aumento de la disnea habitual en la última semana.','epoc','acv'),
      antec:   p('EPOC conocida, ex fumador de larga data.','epoc','acv'),
      insp:    p('Uso de musculatura accesoria y espiración prolongada.','epoc','acv'),
      agrava:  p('Tos con secreción difícil de eliminar.','epoc','acv'),
      neuro:   p('Sin déficit motor.','epoc','acv'),
    },
  },
  acv: {
    dif:['acv','epoc','facial','postuci'],
    c:{
      inicio:  p('Instalación brusca hace dos semanas.','acv facial','epoc postuci'),
      antec:   p('Accidente cerebrovascular isquémico reciente.','acv','epoc postuci'),
      neuro:   p('Debilidad de HEMICUERPO completo y pérdida del control motor selectivo.','acv','epoc facial postuci'),
      insp:    p('Alteración del control postural; hombro afectado en riesgo.','acv','epoc facial'),
      fuerza:  p('Fuerza disminuida en brazo y pierna del mismo lado.','acv','epoc facial postuci'),
    },
  },

  /* ---------- respiratorio: lo que separa los tres es la edad y el patrón ---------- */
  bronquiolitis: {
    dif:['bronquiolitis','neumonia','epoc'],
    c:{
      inicio:  p('Tres días de tos y coriza; hoy empezó a respirar agitada.','bronquiolitis neumonia','epoc'),
      antec:   p('Ocho meses, sana hasta ahora; el hermano llegó resfriado del jardín.','bronquiolitis','neumonia epoc'),
      insp:    p('Retracción costal, aleteo nasal y espiración prolongada.','bronquiolitis','neumonia'),
      agrava:  p('Se cansa al mamar y toma menos de la mitad.','bronquiolitis neumonia',''),
      alarma:  p('Sin fiebre alta mantenida; la saturación se mantiene sobre 93%.','bronquiolitis','neumonia'),
      palp:    p('Tórax sin dolor; se palpan las retracciones intercostales.','bronquiolitis',''),
      neuro:   p('Activa y reactiva, sin compromiso de conciencia.','bronquiolitis',''),
    },
  },
  neumonia: {
    dif:['neumonia','bronquiolitis','epoc','postuci'],
    c:{
      inicio:  p('Cuatro días de fiebre alta, tos con desgarro y decaimiento.','neumonia','epoc bronquiolitis postuci'),
      antec:   p('74 años, sin EPOC conocida; hospitalizado desde ayer.','neumonia','epoc bronquiolitis'),
      insp:    p('Crepitaciones LOCALIZADAS en la base derecha, no sibilancias difusas.','neumonia','epoc bronquiolitis'),
      alarma:  p('Fiebre de 38,9° y la saturación cae al caminar.','neumonia','epoc postuci'),
      agrava:  p('Se ahoga al caminar hasta el baño y necesita sentarse.','neumonia epoc',''),
      fuerza:  p('Fuerza global algo disminuida por los días en cama, sin foco.','neumonia','epoc'),
    },
  },
  postuci: {
    dif:['postuci','neumonia','acv'],
    c:{
      inicio:  p('Salió de la UCI hace cuatro días; la debilidad se instaló durante la hospitalización.','postuci','acv neumonia'),
      antec:   p('Veinte días de ventilación mecánica y sedación.','postuci','acv'),
      fuerza:  p('Debilidad SIMÉTRICA y proximal en las cuatro extremidades.','postuci','acv'),
      neuro:   p('Sin asimetría ni compromiso de un hemicuerpo; reflejos disminuidos de forma global.','postuci','acv'),
      insp:    p('Pérdida evidente de masa muscular; sin uso de musculatura accesoria en reposo.','postuci','neumonia'),
      alarma:  p('Ya sin fiebre y con la neumonía tratada.','postuci','neumonia'),
      agrava:  p('Se agota al hablar o al sentarse en el borde de la cama.','postuci neumonia',''),
    },
  },

  /* ---------- neurológico ---------- */
  parkinson: {
    dif:['parkinson','acv','postuci'],
    c:{
      inicio:  p('Instalación LENTA en dos años, no de un día para otro.','parkinson','acv postuci'),
      antec:   p('Diagnóstico neurológico ya hecho, en tratamiento con levodopa.','parkinson','acv postuci'),
      insp:    p('Marcha a pasos cortos, poco braceo y giros en bloque.','parkinson','acv postuci'),
      neuro:   p('Rigidez en rueda dentada y temblor de reposo, SIN hemiparesia.','parkinson','acv'),
      fuerza:  p('Fuerza conservada y simétrica: el problema es el control, no la fuerza.','parkinson','acv postuci'),
      agrava:  p('Se bloquea al iniciar la marcha y al pasar por lugares estrechos.','parkinson','acv'),
    },
  },
  facial: {
    dif:['facial','acv'],
    c:{
      inicio:  p('Amaneció con la cara caída, de un día para otro.','facial acv',''),
      antec:   p('Cuadro viral días antes; sin hipertensión ni antecedentes vasculares.','facial','acv'),
      insp:    p('Compromete TODA la hemicara: no levanta la ceja ni cierra el ojo.','facial','acv'),
      neuro:   p('Sin debilidad de brazo ni pierna, sin alteración del habla.','facial','acv'),
      fuerza:  p('Fuerza normal en las cuatro extremidades.','facial','acv'),
      alarma:  p('Sin cefalea brusca ni compromiso de conciencia.','facial','acv'),
    },
  },

  /* ---------- rodilla: se suma la artrosis y la cintilla ---------- */
  artrosis: {
    dif:['artrosis','menisco','patelofemoral'],
    c:{
      inicio:  p('Dolor de AÑOS que fue aumentando de a poco, sin un episodio que lo marque.','artrosis','menisco patelofemoral'),
      trauma:  p('Ningún golpe ni torsión.','artrosis patelofemoral','menisco'),
      agrava:  p('Duele al pararse de la silla y al bajar la escalera; mejora con el reposo.','artrosis patelofemoral','menisco'),
      activo:  p('Rigidez matinal breve, de menos de treinta minutos, y crujidos al mover.','artrosis','patelofemoral menisco'),
      insp:    p('Rodillas aumentadas de volumen, sin derrame caliente.','artrosis','menisco patelofemoral'),
      palp:    p('Molestia difusa en la interlínea, sin punto exquisito ni bloqueo.','artrosis','menisco'),
      imgRx:   p('Disminución del espacio articular y osteofitos.','artrosis','menisco patelofemoral'),
    },
  },
  cintilla: {
    dif:['cintilla','patelofemoral','menisco'],
    c:{
      inicio:  p('Apareció al subir el volumen de bajadas preparando el trail.','cintilla patelofemoral','menisco'),
      trauma:  p('Sin torsión ni golpe.','cintilla patelofemoral','menisco'),
      palp:    p('Dolor puntual en el cóndilo femoral LATERAL, un poco sobre la interlínea.','cintilla','patelofemoral menisco'),
      agrava:  p('Aparece siempre al mismo rato de correr y empeora en las bajadas.','cintilla','patelofemoral menisco'),
      insp:    p('Sin derrame ni aumento de volumen.','cintilla patelofemoral','menisco'),
      activo:  p('Rango completo y sin bloqueos; el dolor aparece cerca de los 30° de flexión.','cintilla','menisco'),
    },
  },

  /* ---------- cadera, cervical, codo, muslo y pierna ---------- */
  cadera: {
    dif:['cadera','trocanterico','radiculopatia'],
    c:{
      inicio:  p('Fractura de cadera hace dos semanas, operada con prótesis.','cadera','trocanterico radiculopatia'),
      trauma:  p('Caída en el baño, con fractura y cirugía.','cadera','trocanterico radiculopatia'),
      insp:    p('Cicatriz quirúrgica en vías de cierre y marcha con andador.','cadera','trocanterico radiculopatia'),
      fuerza:  p('Debilidad marcada de los abductores del lado operado.','cadera trocanterico','radiculopatia'),
      neuro:   p('Sin déficit sensitivo ni dolor irradiado bajo la rodilla.','cadera trocanterico','radiculopatia'),
      palp:    p('Molestia peri-quirúrgica; no hay dolor puntual sobre el trocánter mayor.','cadera','trocanterico'),
      agrava:  p('Le da miedo apoyar y por eso camina menos cada día.','cadera',''),
    },
  },
  latigazo: {
    dif:['latigazo','cervicalgia','pinzamiento'],
    c:{
      inicio:  p('Empezó tras el choque; el dolor apareció HORAS después.','latigazo','cervicalgia pinzamiento'),
      trauma:  p('La micro fue chocada por atrás, con el cuello en latigazo.','latigazo','cervicalgia pinzamiento'),
      alarma:  p('En el SAPU descartaron fractura; sin déficit ni mareo persistente.','latigazo',''),
      irradia: p('Cefalea que parte de la nuca; no baja del codo ni sigue un dermatoma.','latigazo cervicalgia','pinzamiento'),
      activo:  p('Rango cervical limitado en todas las direcciones por dolor y por miedo a moverse.','latigazo','cervicalgia pinzamiento'),
      neuro:   p('Tamizaje neurológico normal.','latigazo cervicalgia',''),
      palp:    p('Musculatura cervical y trapecios muy sensibles; el hombro no duele.','latigazo cervicalgia','pinzamiento'),
    },
  },
  epimedial: {
    dif:['epimedial','epicondilalgia','tunel'],
    c:{
      inicio:  p('Progresivo, tras semanas de palear tierra.','epimedial epicondilalgia','tunel'),
      palp:    p('Dolor puntual en la EPITRÓCLEA, en la cara interna del codo.','epimedial','epicondilalgia tunel'),
      fuerza:  p('Duele con la FLEXIÓN de muñeca resistida; la extensión resistida no molesta.','epimedial','epicondilalgia'),
      neuro:   p('Sin hormigueo en el meñique ni en el territorio del mediano.','epimedial epicondilalgia','tunel'),
      agrava:  p('Duele al apretar la herramienta y al girar el antebrazo.','epimedial epicondilalgia',''),
      noche:   p('No lo despierta de noche.','epimedial epicondilalgia','tunel'),
    },
  },
  isquios: {
    dif:['isquios','radiculopatia','trocanterico'],
    c:{
      inicio:  p('Tirón BRUSCO durante un sprint; tuvo que salir de la cancha.','isquios','radiculopatia trocanterico'),
      trauma:  p('Sin golpe: fue el gesto de acelerar.','isquios','trocanterico'),
      palp:    p('Dolor puntual en el vientre posterior del muslo.','isquios','radiculopatia trocanterico'),
      irradia: p('El dolor se queda en el muslo posterior; no sigue un dermatoma ni llega al pie.','isquios','radiculopatia'),
      neuro:   p('Tamizaje neurológico normal, sin hormigueo.','isquios trocanterico','radiculopatia'),
      fuerza:  p('Dolor y debilidad en la flexión de rodilla resistida.','isquios','radiculopatia trocanterico'),
      insp:    p('Equimosis en la cara posterior del muslo, aparecida a los dos días.','isquios','radiculopatia trocanterico'),
    },
  },
  canillera: {
    dif:['canillera','aquiles','fascitis'],
    c:{
      inicio:  p('Pasó de no entrenar nada a trotar todos los días con borceguíes.','canillera aquiles','fascitis'),
      palp:    p('Dolor DIFUSO a lo largo del borde posteromedial de la tibia, sin punto exquisito.','canillera','aquiles fascitis'),
      agrava:  p('Duele al empezar a trotar, cede algo al entrar en calor y vuelve al terminar.','canillera aquiles','fascitis'),
      trauma:  p('Sin torcedura ni episodio agudo.','canillera aquiles fascitis',''),
      insp:    p('Sin hematoma ni deformidad; calzado rígido y muy usado.','canillera',''),
      alarma:  p('Sin dolor nocturno ni dolor en un punto único de hueso: no impresiona fractura por estrés.','canillera',''),
    },
  },

  /* ---------- banderas rojas ----------
     Acá la pista que importa casi siempre está en "síntomas de alarma".
     Quien nunca pregunta por banderas rojas, tarde o temprano trata una. */
  cauda: {
    dif:['cauda','radiculopatia','lumbago'],
    c:{
      inicio:  p('Dolor lumbar de una semana que AYER cambió: se le durmió la entrepierna.','cauda','lumbago radiculopatia'),
      alarma:  p('ANESTESIA EN SILLA DE MONTAR y dificultad para orinar.','cauda','lumbago radiculopatia'),
      neuro:   p('Déficit motor y sensitivo en AMBAS piernas, con reflejos alterados.','cauda','lumbago radiculopatia'),
      irradia: p('El dolor y el adormecimiento bajan por las DOS piernas, no por una.','cauda','radiculopatia lumbago'),
      fuerza:  p('Debilidad bilateral que fue progresando en horas.','cauda','lumbago radiculopatia'),
      agrava:  p('No hay posición ni movimiento que lo alivie.','cauda','lumbago'),
    },
  },
  tvp: {
    dif:['tvp','canillera','aquiles'],
    c:{
      inicio:  p('Se hinchó la pantorrilla en dos días, sin correr ni entrenar.','tvp','canillera aquiles'),
      antec:   p('Tres semanas con bota inmovilizadora y un viaje en bus de veinte horas.','tvp','canillera aquiles'),
      insp:    p('Pantorrilla ROJA, hinchada y de mayor diámetro que la otra.','tvp','canillera aquiles'),
      palp:    p('Pantorrilla CALIENTE y tensa, con dolor difuso a la compresión.','tvp','canillera aquiles'),
      agrava:  p('El dolor no cede con el reposo ni cambia al entrar en calor.','tvp','canillera aquiles'),
      trauma:  p('Sin golpe ni torcedura reciente.','tvp canillera',''),
      alarma:  p('Refiere que anda más ahogada al subir escaleras desde ayer.','tvp','canillera aquiles'),
    },
  },
  compartimental: {
    dif:['compartimental','canillera','esguince'],
    c:{
      inicio:  p('Golpe hace seis horas y el dolor fue SUBIENDO en vez de bajar.','compartimental','canillera esguince'),
      trauma:  p('Patada directa en la cara anterior de la pierna.','compartimental esguince','canillera'),
      agrava:  p('Dolor desproporcionado al golpe, que aumenta hora a hora.','compartimental','canillera esguince'),
      palp:    p('Compartimento anterior TENSO como tabla.','compartimental','canillera esguince'),
      pasivo:  p('El estiramiento pasivo de los dedos dispara un dolor brutal.','compartimental','canillera esguince'),
      neuro:   p('Hormigueo en el dorso del pie, aparecido en la última hora.','compartimental','canillera'),
    },
  },
  cardiaco: {
    dif:['cardiaco','cervicalgia','latigazo'],
    c:{
      inicio:  p('Aparece al caminar rápido o subir la cuesta, y cede al detenerse.','cardiaco','cervicalgia latigazo'),
      trauma:  p('Sin golpe ni accidente.','cardiaco cervicalgia','latigazo'),
      agrava:  p('NINGÚN movimiento ni posición lo reproduce ni lo alivia: solo el esfuerzo.','cardiaco','cervicalgia latigazo'),
      alarma:  p('Sudoración fría y falta de aire cuando aparece el dolor.','cardiaco','cervicalgia latigazo'),
      antec:   p('Hipertenso y fumador de años.','cardiaco','cervicalgia'),
      irradia: p('Se corre al brazo izquierdo y a la mandíbula.','cardiaco','cervicalgia latigazo'),
      palp:    p('La musculatura dorsal no está sensible y no reproduce el dolor.','cardiaco','cervicalgia'),
    },
  },
  fxestres: {
    dif:['fxestres','canillera','aquiles'],
    c:{
      inicio:  p('Empezó como canillera y fue empeorando pese a bajar la carga.','fxestres','canillera'),
      palp:    p('Dolor EXQUISITO en un punto único del borde tibial.','fxestres','canillera aquiles'),
      agrava:  p('Ahora duele en reposo y DE NOCHE.','fxestres','canillera aquiles'),
      activo:  p('Dolor al salto monopodal, justo en el sitio exacto.','fxestres','canillera'),
      antec:   p('Subió mucho los ensayos; bailarina, con menstruaciones irregulares.','fxestres','canillera aquiles'),
      insp:    p('Sin hematoma; se palpa un pequeño abultamiento en el hueso.','fxestres','canillera'),
      alarma:  p('Dolor nocturno que la despierta, en un punto fijo.','fxestres','canillera aquiles'),
    },
  },
  septica: {
    dif:['septica','artrosis','menisco'],
    c:{
      inicio:  p('Se hinchó de un día para otro, sin ningún golpe.','septica','artrosis menisco'),
      antec:   p('Diabético, con una infiltración en esa rodilla hace tres días.','septica','artrosis menisco'),
      alarma:  p('FIEBRE de 38,5° y compromiso del estado general.','septica','artrosis menisco'),
      insp:    p('Rodilla roja, brillante y con derrame a tensión.','septica','artrosis menisco'),
      palp:    p('Piel CALIENTE al tacto y dolor extremo a la palpación.','septica','artrosis menisco'),
      activo:  p('No tolera ningún grado de movimiento.','septica','artrosis'),
    },
  },

  /* ---------- tanda nueva ---------- */
  radicervical: {
    dif:['radicervical','tunel','cervicalgia'],
    c:{
      inicio:  p('Tres semanas, sin golpe, y empeora al mirar hacia arriba trabajando.','radicervical','tunel'),
      irradia: p('El dolor BAJA del cuello al brazo y llega al PULGAR.','radicervical','cervicalgia tunel'),
      neuro:   p('Hipoestesia en pulgar e índice y reflejo braquiorradial disminuido.','radicervical','cervicalgia tunel'),
      fuerza:  p('Debilidad de bíceps y de extensión de muñeca del lado sintomático.','radicervical','cervicalgia tunel'),
      agrava:  p('Empeora con la extensión cervical y alivia al poner la mano sobre la cabeza.','radicervical','tunel cervicalgia'),
      noche:   p('A veces despierta con la mano dormida, pero le duele el cuello igual.','radicervical tunel',''),
      activo:  p('Rango cervical limitado y doloroso hacia el lado comprometido.','radicervical cervicalgia','tunel'),
    },
  },
  cubital: {
    dif:['cubital','epimedial','tunel'],
    c:{
      inicio:  p('Hormigueo progresivo con el codo doblado apoyado en la ventana.','cubital','epimedial'),
      irradia: p('Compromete el MEÑIQUE y la mitad del anular. El pulgar no.','cubital','tunel epimedial'),
      neuro:   p('Alteración sensitiva en territorio cubital y debilidad de los interóseos.','cubital','epimedial'),
      palp:    p('Molestia al percutir el canal epitrocleoolecraneano; la epitróclea misma no duele.','cubital','epimedial'),
      agrava:  p('Peor con el codo flectado mucho rato, mejor al estirarlo.','cubital','epimedial tunel'),
      fuerza:  p('Le cuesta separar los dedos y sostener un papel entre pulgar e índice.','cubital','epimedial tunel'),
    },
  },
  estenosis: {
    dif:['estenosis','radiculopatia','lumbago'],
    c:{
      inicio:  p('Progresivo en dos años, sin ningún esfuerzo que lo explique.','estenosis','lumbago'),
      agrava:  p('Camina dos cuadras y debe sentarse; inclinado sobre el carro del súper anda mucho mejor.','estenosis','radiculopatia lumbago'),
      irradia: p('Pesadez y adormecimiento en AMBAS piernas, no en una sola.','estenosis','radiculopatia lumbago'),
      antec:   p('71 años, con artrosis de columna en las radiografías.','estenosis','lumbago'),
      neuro:   p('Tamizaje casi normal en reposo, pero aparece déficit después de caminar.','estenosis','lumbago'),
      activo:  p('La extensión lumbar reproduce los síntomas y la flexión los alivia.','estenosis','radiculopatia'),
    },
  },
  coxartrosis: {
    dif:['coxartrosis','trocanterico','radiculopatia'],
    c:{
      inicio:  p('Dolor de años que fue aumentando de a poco, sin trauma.','coxartrosis trocanterico','radiculopatia'),
      irradia: p('Duele en la INGLE y a veces baja a la rodilla por delante.','coxartrosis','trocanterico radiculopatia'),
      pasivo:  p('Rotación interna de cadera claramente limitada y dolorosa.','coxartrosis','trocanterico radiculopatia'),
      palp:    p('El trocánter mayor NO duele a la palpación.','coxartrosis','trocanterico'),
      agrava:  p('Le cuesta ponerse los calcetines y pararse de la silla.','coxartrosis','trocanterico'),
      activo:  p('Rigidez matinal breve y rango de cadera reducido en todos los planos.','coxartrosis','trocanterico radiculopatia'),
      neuro:   p('Sin déficit neurológico.','coxartrosis trocanterico','radiculopatia'),
    },
  },
  pubalgia: {
    dif:['pubalgia','coxartrosis','isquios'],
    c:{
      inicio:  p('Apareció de a poco en pretemporada, con mucho remate y cambio de dirección.','pubalgia','coxartrosis'),
      irradia: p('Duele en la INGLE, por delante y hacia el aductor.','pubalgia coxartrosis','isquios'),
      palp:    p('Dolor a la palpación del origen del aductor largo.','pubalgia','coxartrosis isquios'),
      pasivo:  p('Movilidad pasiva de cadera COMPLETA e indolora.','pubalgia','coxartrosis'),
      fuerza:  p('Dolor y debilidad en la aducción resistida.','pubalgia','coxartrosis isquios'),
      agrava:  p('Duele al patear, al acelerar y al hacer abdominales.','pubalgia','coxartrosis'),
    },
  },
  rotura: {
    dif:['rotura','manguito','capsulitis'],
    c:{
      inicio:  p('Caída con apoyo del brazo hace tres semanas, sobre un hombro que ya molestaba.','rotura','capsulitis'),
      trauma:  p('Caída del andamio con apoyo del brazo.','rotura','manguito capsulitis'),
      fuerza:  p('DEBILIDAD marcada: no sostiene el brazo elevado y se le cae.','rotura','manguito capsulitis'),
      activo:  p('No logra mantener la elevación activa, pero deja que se la lleven pasivamente.','rotura','capsulitis'),
      pasivo:  p('Rango PASIVO conservado: la articulación no está rígida.','rotura manguito','capsulitis'),
      noche:   p('Dolor nocturno intenso que no lo deja dormir de ese lado.','rotura manguito capsulitis',''),
      insp:    p('Atrofia visible de la fosa infraespinosa.','rotura','manguito capsulitis'),
    },
  },
  escafoides: {
    dif:['escafoides','dequervain','huaso'],
    c:{
      inicio:  p('Caída con la mano estirada hace cinco días.','escafoides','dequervain'),
      trauma:  p('Cayó de un skate con la muñeca en extensión forzada.','escafoides','dequervain huaso'),
      palp:    p('Dolor EXQUISITO en la tabaquera anatómica.','escafoides','dequervain huaso'),
      agrava:  p('Duele al apretar y al cargar peso con esa mano.','escafoides dequervain',''),
      imgRx:   p('Radiografía sin fractura evidente, pero el dolor sigue localizado en el escafoides.','escafoides','dequervain'),
      alarma:  p('En urgencias se lo tomaron como esguince y le dijeron que se moviera.','escafoides','dequervain'),
      insp:    p('Leve aumento de volumen sobre la tabaquera, sin deformidad.','escafoides','huaso'),
    },
  },
  tibialpost: {
    dif:['tibialpost','fascitis','aquiles'],
    c:{
      inicio:  p('Progresivo en un año, con muchas horas de pie.','tibialpost fascitis','aquiles'),
      palp:    p('Dolor por DENTRO del tobillo, bajo el maléolo medial, siguiendo el tendón.','tibialpost','fascitis aquiles'),
      insp:    p('Arco caído y "demasiados dedos" visibles al mirar el pie por detrás.','tibialpost','fascitis aquiles'),
      fuerza:  p('No puede elevar el talón parada en un pie.','tibialpost','fascitis aquiles'),
      agrava:  p('Peor al final del día y al caminar en superficie irregular.','tibialpost fascitis',''),
      activo:  p('Inversión resistida débil y dolorosa.','tibialpost','fascitis'),
    },
  },
  morton: {
    dif:['morton','fascitis','tibialpost'],
    c:{
      inicio:  p('Meses con zapato angosto y taco, muchas horas de pie.','morton fascitis',''),
      palp:    p('Dolor al comprimir el espacio entre el tercer y cuarto metatarsiano.','morton','fascitis tibialpost'),
      irradia: p('Ardor y adormecimiento que se corre hacia los dedos.','morton','fascitis tibialpost'),
      agrava:  p('Siente una piedra en el zapato y alivia al descalzarse y masajear.','morton','fascitis'),
      neuro:   p('Hipoestesia entre el tercer y cuarto dedo.','morton','fascitis tibialpost'),
      insp:    p('Sin deformidad del arco ni signos inflamatorios en el talón.','morton','fascitis tibialpost'),
    },
  },
  vppb: {
    dif:['vppb','acv','esclerosis'],
    c:{
      inicio:  p('Empezó de un día para otro al levantarse; dura menos de un minuto cada vez.','vppb','acv esclerosis'),
      agrava:  p('Se gatilla SOLO al cambiar de posición: acostarse, darse vuelta, mirar hacia arriba.','vppb','acv esclerosis'),
      neuro:   p('Sin déficit motor, sensitivo ni de pares craneales.','vppb','acv esclerosis'),
      alarma:  p('Sin cefalea, sin pérdida de audición y sin compromiso de conciencia.','vppb','acv'),
      antec:   p('Sana, sin antecedentes vasculares ni episodios neurológicos previos.','vppb','acv esclerosis'),
      insp:    p('Marcha normal entre los episodios, sin ataxia.','vppb','acv esclerosis'),
    },
  },
  esclerosis: {
    dif:['esclerosis','acv','postuci'],
    c:{
      inicio:  p('Meses de fatiga y piernas pesadas, con brotes que van y vienen.','esclerosis','acv postuci'),
      antec:   p('Hace dos años perdió visión de un ojo por semanas y se recuperó sola.','esclerosis','acv postuci'),
      neuro:   p('Compromiso en distintos territorios y en distintos momentos, no de un hemicuerpo.','esclerosis','acv'),
      agrava:  p('Todo empeora con el calor y con el ejercicio prolongado.','esclerosis','acv postuci'),
      fuerza:  p('Debilidad en ambas piernas con espasticidad, más que un hemicuerpo débil.','esclerosis','acv'),
      insp:    p('Marcha espástica y fatigable, sin patrón hemipléjico.','esclerosis','acv'),
    },
  },
  fxvertebral: {
    dif:['fxvertebral','lumbago','estenosis'],
    c:{
      inicio:  p('Dolor que apareció DE GOLPE al agacharse a recoger algo, sin caída.','fxvertebral','estenosis'),
      alarma:  p('76 años, con trauma mínimo y pérdida de estatura en el último año.','fxvertebral','lumbago estenosis'),
      palp:    p('Dolor EXQUISITO a la percusión de una apófisis espinosa.','fxvertebral','lumbago estenosis'),
      agrava:  p('Duele muchísimo al pasar de acostada a sentada y no cede en ninguna posición.','fxvertebral','lumbago'),
      insp:    p('Cifosis dorsal aumentada respecto al año pasado.','fxvertebral','lumbago estenosis'),
      antec:   p('Menopausia temprana y una fractura de muñeca hace dos años.','fxvertebral','lumbago'),
      neuro:   p('Sin déficit neurológico por ahora.','fxvertebral lumbago','estenosis'),
    },
  },
};

/* ============================================================
   PERSONALIDAD, ÁNIMO Y ACOMPAÑANTES
   El mismo cuadro se juega distinto según quién lo trae. Los
   rasgos tocan la mecánica; el ánimo y el acompañante dan textura.
   ============================================================ */
const CL_RASGOS = [
  { id:'ansioso',    nom:'Ansioso',        emo:'😰', desc:'Pregunta mucho y le cuesta soltarse',
    aviso:'Se demora en contestar y vuelve a preguntar lo mismo: te queda menos tiempo.', ef:{ tiempo:-3 } },
  { id:'minimiza',   nom:'Minimizador',    emo:'😶', desc:'"No es nada, si aguanto bien"',
    aviso:'Le quita importancia a todo: lo que preguntes va a rendir la mitad.', ef:{ pistasPobres:true } },
  { id:'informado',  nom:'Llega leído',    emo:'🔎', desc:'Buscó en internet y trae su diagnóstico',
    aviso:'Llega convencido de lo que tiene. Ojo con dejarte llevar.', ef:{ pistaFalsa:true } },
  { id:'cumplidor',  nom:'Cumplidor',      emo:'📋', desc:'Anota todo y lo hace en la casa',
    aviso:'Va a cumplir con lo que le indiques.', ef:{ adherencia:22 } },
  { id:'porfiado',   nom:'Porfiado',       emo:'😤', desc:'Hace las cosas a su manera',
    aviso:'Va a hacer lo que él crea: la adherencia parte baja.', ef:{ adherencia:-22 } },
  { id:'impaciente', nom:'Impaciente',     emo:'⚡', desc:'Quiere volver a lo suyo ya mismo',
    aviso:'Presiona por el alta: se aburre rápido y abandona.', ef:{ adherencia:-12, seAburre:true } },
  { id:'conversador',nom:'Conversador',    emo:'💬', desc:'Se va por las ramas, pero recomienda a todo el mundo',
    aviso:'Te va a robar tiempo, pero después habla bien de la clínica.', ef:{ tiempo:-2, pago:1.25 } },
  { id:'estoico',    nom:'Aguantador',     emo:'🪨', desc:'No se queja aunque le duela',
    aviso:'Cuesta que reconozca el dolor, pero hace todo lo que le pidas.', ef:{ pistasPobres:true, adherencia:14 } },
];

const CL_ANIMOS = [
  { id:'adolorido',   nom:'adolorido',   emo:'😖', frase:'Viene con cara de haber dormido mal.' },
  { id:'esperanzado', nom:'esperanzado', emo:'🙂', frase:'Llega con ganas de que esto por fin se solucione.' },
  { id:'desconfiado', nom:'desconfiado', emo:'🤨', frase:'Ya pasó por otros dos kinesiólogos y no le resultó.' },
  { id:'agradecido',  nom:'agradecido',  emo:'😊', frase:'Lo mandó una amiga que quedó feliz con la clínica.' },
  { id:'apurado',     nom:'apurado',     emo:'⏱️', frase:'Dejó el auto en doble fila y lo dice apenas entra.' },
  { id:'asustado',    nom:'asustado',    emo:'😟', frase:'Tiene miedo de que sea algo grave.' },
];

const CL_ACOMP = [
  { nom:'su hija',      emo:'👩' }, { nom:'su mamá',    emo:'👩‍🦰' },
  { nom:'su pareja',    emo:'🧑' }, { nom:'su entrenador', emo:'🧢' },
  { nom:'su hijo',      emo:'👦' }, { nom:'una vecina', emo:'👵' },
];

/* ---------- árbol de habilidades ----------
   Progresión tuya, no de la clínica: sobrevive a las sedes. Se paga con
   puntos que dan las altas, las acreditaciones y el caso del día. */
const CL_HABILIDADES = [
  { id:'oreja',     nom:'Buena oreja',      emo:'👂',  costo:1, desc:'Preguntar cuesta un tiempo menos' },
  { id:'ojo',       nom:'Ojo clínico',      emo:'👁️',  costo:1, desc:'Las pruebas ortopédicas cuestan un tiempo menos' },
  { id:'memoria',   nom:'Buena memoria',    emo:'🧠',  costo:1, desc:'Dos unidades más de tiempo con cada paciente' },
  { id:'mano',      nom:'Mano firme',       emo:'🖐️',  costo:2, desc:'La primera prueba de cada paciente sale gratis' },
  { id:'empatia',   nom:'Empatía',          emo:'🤝',  costo:2, desc:'Los pacientes parten con +15 de adherencia' },
  { id:'imagen',    nom:'Convenio de imágenes', emo:'📷', costo:2, desc:'Radiografías y ecografías no cuestan plata' },
  { id:'gestion',   nom:'Gestión',          emo:'📊',  costo:2, desc:'Arriendo y sueldos cuestan un cuarto menos' },
  { id:'psico',     nom:'Mirada psicosocial', emo:'🟡', costo:3, desc:'Ves las banderas amarillas sin tener que preguntar' },
  { id:'intuicion', nom:'Intuición',        emo:'💡',  costo:3, desc:'La pista se recarga en 3 minutos en vez de 5' },
  { id:'docente',   nom:'Docencia',         emo:'🎓',  costo:3, desc:'Un tercio más de experiencia en todo' },
];

/* ---------- arcos ----------
   Pacientes que dejan de ser un caso suelto: cada vez que vuelven hay un
   capítulo nuevo. Cuando se acaban los capítulos cae de vuelta a CL_REGRESO. */
const CL_ARCOS = {
  huaso:[
    'Volvió con una bolsa de nueces. La muñeca anda, pero ahora le tira el hombro de tanto compensar arreando.',
    'Trajo a su hijo, que se cayó del mismo caballo. "Si a mí me resultó, a él también", dice.',
    'Vino solo a saludar y a dejar un queso. Ya ensilla, ordeña y no se acuerda de la muñeca.',
  ],
  basquetbol:[
    'Ganaron el campeonato. Trajo la foto del equipo y la rodilla molestando otra vez.',
    'Lo llamaron de un club grande. Está aterrado de que la rodilla lo deje afuera justo ahora.',
    'Firmó contrato. Viene una vez al mes a control y le manda saludos a toda la clínica.',
  ],
  dequervain:[
    'La guagua pesa cuatro kilos más y el pulgar volvió a reclamar.',
    'Volvió al trabajo y ahora carga a la niña con una mano y el bolso con la otra. Adivina qué pasó.',
    'La niña ya camina sola. Vino a decir que por fin puede tomarla sin pensarlo.',
  ],
  epoc:[
    'Lleva ocho meses sin fumar y lo cuenta apenas entra por la puerta.',
    'Se metió al grupo de caminata del consultorio. Anda con podómetro y lo muestra.',
    'Cumplió dos años sin fumar. Trajo torta para la sala de espera.',
  ],
  acv:[
    'Llegó caminando con bastón y saludó con la mano que antes no levantaba.',
    'Volvió a cocinar. Cuenta que picar cebolla fue el día más importante del año.',
    'Camina sin bastón hasta la feria. Dice que va lento, pero que va.',
  ],
  lca:[
    'Vuelve de la operación con la orden de rehabilitación y muchas ganas.',
    'Está a un mes del alta deportiva y tiene pánico de volver a girar.',
    'Volvió a jugar. Metió un gol y vino a contarlo antes que a nadie.',
  ],
  esguince:[
    'Segundo esguince del mismo tobillo. Esta vez sí quiere hacer la propiocepción completa.',
    'Tercer esguince. Ahora sí entendió y viene preguntando por el programa completo.',
    'Un año sin torcerse. Sigue haciendo los ejercicios y convenció al equipo entero.',
  ],
  cadera:[
    'Entró sin andador, con su hija atrás muerta de nervios.',
    'Se cambió sola de casa al primer piso. Dice que no quiere volver a caerse nunca.',
    'Vino a mostrar las fotos del matrimonio de su nieta: bailó dos canciones.',
  ],
  parkinson:[
    'Trajo la lista de canciones que usa para caminar. Dice que con cueca le sale mejor.',
    'Se cayó en la casa y volvió asustado, pero vino igual. Eso ya es una victoria.',
    'Lleva un año sin caídas. Le enseñó el truco de las claves a dos vecinos.',
  ],
  minero:[
    'Bajó del turno derecho a la clínica. "Esta vez vine antes de que se pusiera fea."',
    'Lo cambiaron a un turno más corto y hace los ejercicios en el casino. Anda distinto.',
    'Lo ascendieron a supervisor. Ahora manda a su gente a la clínica antes de que les duela.',
  ],
};

/* ---------- banderas amarillas ----------
   Factores psicosociales. No cambian el diagnóstico, pero mandan en el
   pronóstico: si no se detectan y no se abordan, el tratamiento rinde
   mucho menos y el jugador no entiende por qué. Se descubren preguntando
   por creencias y expectativas, y se tratan con una sesión dedicada. */
const CL_AMARILLAS = [
  { id:'kinesiofobia', nom:'Kinesiofobia', emo:'🚷',
    dice:'“Me da miedo moverme, siento que se me va a salir algo.”',
    abordaje:'Exposición gradual al movimiento con educación: mostrarle que moverse es seguro.',
    ensena:'El miedo al movimiento predice peor resultado que la lesión misma. Se trata exponiendo, no protegiendo.' },
  { id:'catastrofismo', nom:'Catastrofismo', emo:'🌧️',
    dice:'“Esto no se va a mejorar nunca, voy a terminar en silla de ruedas.”',
    abordaje:'Educación en dolor y metas cortas y alcanzables que le devuelvan control.',
    ensena:'El catastrofismo es de los predictores más fuertes de cronicidad. Se aborda con educación y logros concretos, no con más terapia pasiva.' },
  { id:'estructural', nom:'Creencia estructural', emo:'🦴',
    dice:'“Tengo una vértebra fuera de lugar, hay que ponerla en su sitio.”',
    abordaje:'Explicar qué significa de verdad el hallazgo y correr el foco a la función.',
    ensena:'Creer que algo está “fuera de lugar” lleva a buscar el arreglo pasivo eterno. Los hallazgos de imagen son frecuentes en gente sin dolor.' },
  { id:'laboral', nom:'Conflicto laboral', emo:'📄',
    dice:'“Estoy peleando con la mutual, la licencia depende de esto.”',
    abordaje:'Ser transparente con el objetivo funcional y coordinar el retorno laboral gradual.',
    ensena:'El conflicto laboral y el litigio empeoran el pronóstico. No se ignora ni se juzga: se conversa y se planifica el retorno.' },
  { id:'expectativa', nom:'Baja expectativa', emo:'🤷',
    dice:'“La verdad no creo que la kine sirva, vengo porque me mandaron.”',
    abordaje:'Alinear expectativas y mostrar un cambio medible en las primeras sesiones.',
    ensena:'Lo que el paciente espera de la terapia predice lo que va a conseguir. Un cambio objetivo temprano da vuelta la expectativa.' },
  { id:'hipervigilancia', nom:'Hipervigilancia', emo:'🔍',
    dice:'“Ando midiendo el dolor todo el día, del uno al diez, a cada rato.”',
    abordaje:'Sacar el foco del dolor y ponerlo en hitos de función y en la dosis del día.',
    ensena:'Vigilar el dolor todo el día lo amplifica. El norte pasa a ser lo que puede hacer, no cuánto le duele.' },
  { id:'aislamiento', nom:'Sin red de apoyo', emo:'🏚️',
    dice:'“Vivo solo y no tengo quién me ayude con los ejercicios.”',
    abordaje:'Simplificar el programa a lo mínimo que se pueda hacer sin ayuda y asegurar seguimiento.',
    ensena:'Un programa que el paciente no puede ejecutar en su contexto real no sirve, por bien prescrito que esté.' },
];
const CL_AMARILLA_PROB = 0.45;

/* ============================================================
   MENSAJES ENTRE SESIONES
   El paciente te escribe cuando NO estás jugando. Al abrir la clínica
   hay mensajes sin leer y hay que contestarlos: la respuesta correcta
   sube la adherencia, ignorarlos la hunde. `ok` es la opción correcta.
   ============================================================ */
const CL_MENSAJES = [
  { id:'duele', txt:'Doctora, me duele más desde ayer en la noche. ¿Voy igual mañana?',
    ops:[
      { txt:'Vaya igual, vemos juntos qué pasó y ajustamos la carga.', ok:true,
        dice:'Un aumento de dolor no es motivo para suspender: es motivo para reevaluar y ajustar.' },
      { txt:'Mejor descanse y nos vemos la próxima semana.', ok:false,
        dice:'Suspender ante cada molestia enseña que moverse es peligroso y rompe la adherencia.' },
      { txt:'Tómese un analgésico y siga con los mismos ejercicios.', ok:false,
        dice:'Sin reevaluar no sabes si es respuesta normal a la carga o algo nuevo.' },
    ] },
  { id:'tirante', txt:'Hice los ejercicios pero me quedó tirante la zona al otro día. ¿Está bien eso?',
    ops:[
      { txt:'Sí, es normal si va cediendo solo. Siga igual y me cuenta.', ok:true,
        dice:'El dolor muscular tardío que cede es respuesta esperable a la carga.' },
      { txt:'Pare los ejercicios hasta la próxima sesión.', ok:false,
        dice:'Frenar por una molestia normal retrasa todo el proceso.' },
      { txt:'Súbale las repeticiones para que se acostumbre más rápido.', ok:false,
        dice:'Subir la dosis sin haberlo evaluado es cómo se llega a la recaída.' },
    ] },
  { id:'falto', txt:'Disculpe que no fui el martes, se me complicó la pega. ¿Perdí lo que llevaba?',
    ops:[
      { txt:'No perdió nada. Retomamos donde íbamos, lo importante es que vuelva.', ok:true,
        dice:'Culpar al paciente por faltar es la forma más rápida de que no vuelva nunca.' },
      { txt:'Sí, hay que empezar casi de cero. Trate de no faltar más.', ok:false,
        dice:'Es falso y además lo desmotiva: la adaptación no se pierde en una semana.' },
      { txt:'No se preocupe, deje el tratamiento y vuelva cuando pueda.', ok:false,
        dice:'Soltarle la mano cuando falla es abandonarlo, no acompañarlo.' },
    ] },
  { id:'internet', txt:'Vi un video que dice que esto se arregla con una infiltración. ¿No sería más rápido?',
    ops:[
      { txt:'Conversémoslo en la sesión, le explico qué dice la evidencia para su caso.', ok:true,
        dice:'No se descalifica lo que trae el paciente: se conversa, si no se va a buscarlo por su cuenta.' },
      { txt:'No haga caso a lo que ve en internet.', ok:false,
        dice:'Cerrarle la puerta rompe la confianza y no cambia lo que cree.' },
      { txt:'Puede ser, pregúntele al médico y vemos.', ok:false,
        dice:'Lavarse las manos deja al paciente sin la información que sí le puedes dar.' },
    ] },
  { id:'trabajo', txt:'En el trabajo me están apurando para que vuelva al turno completo. ¿Qué hago?',
    ops:[
      { txt:'Volvamos por etapas: le armo un plan de reintegro y lo conversamos con la mutual.', ok:true,
        dice:'El retorno laboral gradual y coordinado es parte del tratamiento, no un trámite aparte.' },
      { txt:'Dígales que no puede hasta que le dé el alta.', ok:false,
        dice:'Alargar la licencia sin plan empeora el pronóstico y el conflicto laboral.' },
      { txt:'Vuelva nomás, total el ejercicio lo puede hacer igual.', ok:false,
        dice:'Volver de golpe a la carga completa es la receta de la recaída.' },
    ] },
  { id:'mejor', txt:'Estoy mucho mejor, casi no me duele. ¿Ya puedo dejar de ir?',
    ops:[
      { txt:'Que no duela no es el alta: falta recuperar fuerza y tolerancia. Sigamos un poco más.', ok:true,
        dice:'El dolor cede mucho antes que la capacidad. Ahí es donde se producen las recaídas.' },
      { txt:'Sí, si ya no le duele podemos darle el alta.', ok:false,
        dice:'Dar el alta por ausencia de dolor es la causa más común de recaída.' },
      { txt:'Siga viniendo igual, hay que completar las diez sesiones.', ok:false,
        dice:'El alta es por criterios, no por un número fijo de sesiones.' },
    ] },
  { id:'noche', txt:'Anoche me despertó el dolor y no se me pasó con nada. Nunca me había pasado.',
    ops:[
      { txt:'Eso hay que verlo antes de seguir. Véngase mañana y si hace falta lo derivo.', ok:true,
        dice:'Dolor nocturno nuevo que no cede es bandera roja: se reevalúa antes de seguir cargando.' },
      { txt:'Puede ser por la carga de la última sesión, vamos a bajarla.', ok:false,
        dice:'Asumir que es la carga sin evaluar es cómo se pasan por alto las banderas rojas.' },
      { txt:'Tómese algo para el dolor y nos vemos en la sesión programada.', ok:false,
        dice:'Postergar un síntoma de alarma nunca es la respuesta.' },
    ] },
  { id:'gracias', txt:'Solo quería contarle que hoy subí las escaleras sin agarrarme del pasamanos 🙌',
    ops:[
      { txt:'¡Qué bueno! Eso es exactamente lo que estábamos buscando. Anótelo.', ok:true,
        dice:'Reconocer los hitos funcionales sube la adherencia más que cualquier técnica.' },
      { txt:'Bien, pero no se confíe todavía.', ok:false,
        dice:'Bajarle el logro apaga justo lo que estaba funcionando.' },
      { txt:'Perfecto, entonces ya podemos darle el alta.', ok:false,
        dice:'Un hito no es el alta: hay que consolidarlo.' },
    ] },
];
/* Con baja probabilidad el caso se tuerce de verdad: lo que parecía una
   cosa era otra, y hay que atreverse a frenar y derivar aunque el
   tratamiento viniera bien. Enseña que el diagnóstico no es para siempre. */
const CL_COMPLICACIONES = [
  { id:'rotura', txt:'Venía mejorando, pero esta semana perdió fuerza de golpe y ya no sostiene el brazo elevado.',
    dice:'Lo que se estaba tratando como tendinopatía terminó siendo una rotura. La pérdida brusca de fuerza no es evolución: es lesión nueva.' },
  { id:'tvp', txt:'Llega con la pantorrilla hinchada, roja y caliente después de dos semanas de poca actividad.',
    dice:'Post inmovilización o reposo prolongado, una pantorrilla caliente e hinchada es TVP hasta demostrar lo contrario.' },
  { id:'roja', txt:'A la tercera sesión aparece dolor nocturno que no cede y ha bajado de peso sin proponérselo.',
    dice:'Las banderas rojas pueden aparecer DESPUÉS. Por eso se reevalúa en cada sesión, no solo al principio.' },
  { id:'infeccion', txt:'La zona operada está caliente, con secreción y él anda con fiebre desde ayer.',
    dice:'Signos de infección en un post operado: se frena todo y se deriva el mismo día.' },
  { id:'fractura', txt:'El dolor se concentró en un punto exacto del hueso y ahora también le duele en reposo.',
    dice:'Dolor que se localiza en un punto y aparece en reposo: fractura por estrés. Seguir cargando la completa.' },
];
const CL_COMPL_PROB = 0.05;

const CL_MSG_PROB = 0.5;           // probabilidad de que escriba, si corresponde
const CL_MSG_ESPERA = 3 * 60000;   // no escriben antes de tres minutos de la última sesión

/* Alarmas que aparecen en plena sesión de tratamiento.
   `ok` es la decisión correcta: seguir, bajar o derivar. */
const CL_ALARMAS = [
  { id:'peorNoche', txt:'Cuenta que desde la última sesión el dolor lo despierta todas las noches y no cede con nada.',
    ok:'derivar', dice:'Dolor nocturno que no cede es bandera roja: se frena y se deriva, aunque el tratamiento venía bien.' },
  { id:'agujetas', txt:'Llega con dolor muscular difuso que apareció al día siguiente y ya va cediendo.',
    ok:'seguir', dice:'Dolor muscular tardío que va cediendo es respuesta normal a la carga: no hay que bajar nada.' },
  { id:'derrame', txt:'La articulación amaneció hinchada y caliente después de la sesión anterior.',
    ok:'bajar', dice:'Un derrame reactivo dice que la dosis fue mucha: se baja la carga, no se suspende ni se deriva.' },
  { id:'hormigueo', txt:'Apareció hormigueo nuevo y pérdida de fuerza en el pie que antes no tenía.',
    ok:'derivar', dice:'Déficit neurológico NUEVO y progresivo se deriva siempre: eso ya no se maneja en box.' },
  { id:'dolorGuia', txt:'Durante los ejercicios refiere dolor 4/10 que desaparece apenas termina la serie.',
    ok:'seguir', dice:'Dolor tolerable que cede al terminar está dentro del rango aceptable: se puede seguir cargando.' },
  { id:'fiebre', txt:'Llega con fiebre, decaído, y la zona está más roja que la semana pasada.',
    ok:'derivar', dice:'Fiebre más signos inflamatorios locales obliga a descartar infección antes de seguir.' },
  { id:'reagudiza', txt:'Dice que el dolor volvió al nivel del primer día tras hacer los ejercicios en la casa.',
    ok:'bajar', dice:'Si la carga reagudiza el cuadro, se retrocede un escalón y se progresa más lento.' },
  { id:'mareo', txt:'Se marea al pasar a bípedo y hay que sentarlo un rato.',
    ok:'bajar', dice:'Mareo ortostático: se baja la exigencia y se controla, sin abandonar la movilización.' },
];

/* ============================================================
   CLÍNICA EN 3D — Three.js cargado bajo demanda
   La librería (182 KB gzip) NO baja con la página: se importa recién
   cuando se abre la clínica, así el resto del rincón sigue abriendo
   instantáneo. Toda la geometría es low-poly generada por código: no
   hay modelos que descargar ni licencias que revisar.
   ============================================================ */
let THREE = null, c3Cargando = null;
let c3Escena = null, c3Cam = null, c3Rend = null, c3Loop = null, c3Reloj = 0;
let c3Personal = [], c3Pacientes = [], c3Camillas = [], c3Muebles = [];
let c3Rayo = null, c3Seleccionado = null, c3Piso = null, c3Anillo = null;

async function c3Cargar(){
  if(THREE) return THREE;
  if(c3Cargando) return c3Cargando;
  c3Cargando = import('/assets/lib/three.module.min.js')
    .then(m => { THREE = m; return m; })
    .catch(e => { c3Cargando = null; throw e; });
  return c3Cargando;
}

/* ---------- materiales low-poly, planos y coherentes ---------- */
function c3Mat(color, opc){
  return new THREE.MeshLambertMaterial(Object.assign({ color, flatShading:true }, opc || {}));
}

const C3_PALETA = {
  piso:0xe6ddd2, muro:0xf3efe7, muroBajo:0xdcd3c6,
  camilla:0xfdfbf7, patas:0xa6b2ae, sabana:0xbfd8e4,
  piel:0xe8c3a0, pelo:0x4a3b33, tunica:0x7fae96, ropa:[0xc8956d,0x6d9fc8,0xc86d8f,0x9b7fc8,0xd8b45f],
  planta:0x6f9c5a, macetero:0xc98f6d, mueble:0xd8c3a5, parche:0x1f4e79,
  silla:0xc9ab82, alfEspera:0xe9d9bd, alfGym:0xcfe0e6, biombo:0xdfeae3, tv:0x2f3a44,
};

/* ---------- personas ----------
   El kinesiólogo lleva túnica, credencial y un parche en la manga.
   El parche es un color plano a propósito: si Diego pasa la imagen real
   del escudo, se reemplaza por una textura y queda de verdad. */
function c3Persona(colorRopa, esKine){
  const g = new THREE.Group();
  const colorCuerpo = esKine ? C3_PALETA.tunica : colorRopa;
  const cuerpo = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.34, 3, 6), c3Mat(colorCuerpo));
  cuerpo.position.y = 0.42; cuerpo.castShadow = true;
  const cabeza = new THREE.Mesh(new THREE.IcosahedronGeometry(0.15, 0), c3Mat(C3_PALETA.piel));
  cabeza.position.y = 0.78; cabeza.castShadow = true;
  const pelo = new THREE.Mesh(new THREE.SphereGeometry(0.155, 6, 4, 0, Math.PI*2, 0, Math.PI/2), c3Mat(C3_PALETA.pelo));
  pelo.position.y = 0.80;
  const piernas = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.3, 6), c3Mat(esKine ? 0xf0f2f4 : 0x53606b));
  piernas.position.y = 0.15;
  g.add(cuerpo, cabeza, pelo, piernas);

  if(esKine){
    // cuello en V de la túnica
    const v = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.07, 0.02), c3Mat(C3_PALETA.piel));
    v.position.set(0, 0.60, 0.16); g.add(v);
    // parche institucional en la manga
    const parche = new THREE.Mesh(new THREE.CircleGeometry(0.045, 8), c3Mat(C3_PALETA.parche));
    parche.position.set(-0.165, 0.50, 0.045); parche.rotation.y = -Math.PI/2.2; g.add(parche);
    // credencial colgando
    const cred = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, 0.012), c3Mat(0xfdfdfd));
    cred.position.set(0.07, 0.40, 0.165); g.add(cred);
  }
  return g;
}

/* ---------- equipamiento: cada compra tiene su modelo ---------- */
function c3Ecografo(){
  const g = new THREE.Group();
  const carro = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.6, 0.36), c3Mat(0xeef1f3));
  carro.position.y = 0.42; carro.castShadow = true;
  const pantalla = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.05), c3Mat(0x2f4858));
  pantalla.position.set(0, 0.88, 0.02);
  const brillo = new THREE.Mesh(new THREE.PlaneGeometry(0.33, 0.22), c3Mat(0x7fd4e8));
  brillo.position.set(0, 0.88, 0.055);
  for(const x of [-0.15, 0.15]) for(const z of [-0.13, 0.13]){
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.05, 6), c3Mat(0x53606b));
    r.rotation.z = Math.PI/2; r.position.set(x, 0.06, z); g.add(r);
  }
  g.add(carro, pantalla, brillo);
  return g;
}
function c3TENS(){
  const g = new THREE.Group();
  const mesa = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.06, 0.34), c3Mat(C3_PALETA.mueble));
  mesa.position.y = 0.62; mesa.castShadow = true;
  for(const [x,z] of [[-0.17,-0.12],[0.17,-0.12],[-0.17,0.12],[0.17,0.12]]){
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.02,0.6,5), c3Mat(0x9fb0bc));
    p.position.set(x,0.31,z); g.add(p);
  }
  const eq = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.14, 0.2), c3Mat(0xf2e9d8));
  eq.position.y = 0.72; eq.castShadow = true;
  const luz = new THREE.Mesh(new THREE.CircleGeometry(0.025, 6), c3Mat(0x7fd48f));
  luz.position.set(0, 0.74, 0.101);
  g.add(mesa, eq, luz);
  return g;
}
function c3Gimnasio(){
  const g = new THREE.Group();
  // colchoneta
  const col = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.06, 0.7), c3Mat(0x6d9fc8));
  col.position.set(0, 0.03, 0.5); col.receiveShadow = true;
  // rack con mancuernas
  const rack = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.26), c3Mat(C3_PALETA.mueble));
  rack.position.set(0, 0.25, -0.35); rack.castShadow = true;
  g.add(col, rack);
  for(let i = 0; i < 3; i++){
    const barra = new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.02,0.22,5), c3Mat(0x53606b));
    barra.rotation.z = Math.PI/2; barra.position.set(-0.24 + i*0.24, 0.55, -0.35);
    const d1 = new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,0.04,6), c3Mat(0x3c4360));
    d1.rotation.z = Math.PI/2; d1.position.set(-0.24 + i*0.24 - 0.12, 0.55, -0.35);
    const d2 = d1.clone(); d2.position.x += 0.24;
    g.add(barra, d1, d2);
  }
  // pelota de kinesiología
  const bola = new THREE.Mesh(new THREE.IcosahedronGeometry(0.24, 1), c3Mat(0xc86d8f));
  bola.position.set(0.72, 0.24, 0.45); bola.castShadow = true;
  g.add(bola);
  return g;
}
function c3Plataforma(){
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 0.5), c3Mat(0x3c4360));
  base.position.y = 0.04; base.receiveShadow = true;
  const tapa = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.02, 0.44), c3Mat(0x7fd4e8));
  tapa.position.y = 0.09;
  const poste = new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.03,0.9,6), c3Mat(0x9fb0bc));
  poste.position.set(0.3, 0.45, -0.2);
  const mon = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.22, 0.04), c3Mat(0x2f4858));
  mon.position.set(0.3, 0.95, -0.2);
  g.add(base, tapa, poste, mon);
  return g;
}
function c3Hidro(){
  const g = new THREE.Group();
  const borde = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.34, 1.0), c3Mat(0xdcd3c6));
  borde.position.y = 0.17; borde.castShadow = true; borde.receiveShadow = true;
  const agua = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.04, 0.82), c3Mat(0x5fc0dd, { transparent:true, opacity:0.82 }));
  agua.position.y = 0.33; agua.name = 'agua';
  const esc = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.5), c3Mat(0xf0f2f4));
  esc.position.set(0.9, 0.2, 0);
  g.add(borde, agua, esc);
  return g;
}

/* ---------- muebles de la sala de espera ---------- */
function c3Silla(){
  const g = new THREE.Group();
  const asiento = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.06, 0.42), c3Mat(C3_PALETA.silla));
  asiento.position.y = 0.40; asiento.castShadow = true;
  const respaldo = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.48, 0.06), c3Mat(C3_PALETA.silla));
  respaldo.position.set(0, 0.66, 0.19); respaldo.castShadow = true;
  for(const [x, z] of [[-0.19,-0.16],[0.19,-0.16],[-0.19,0.16],[0.19,0.16]]){
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.38, 5), c3Mat(C3_PALETA.patas));
    p.position.set(x, 0.19, z); g.add(p);
  }
  g.add(asiento, respaldo);
  return g;
}
function c3Biombo(){
  const g = new THREE.Group();
  const tela = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.25, 1.9), c3Mat(C3_PALETA.biombo));
  tela.position.y = 0.78; tela.castShadow = true;
  for(const z of [-0.8, 0.8]){
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.18, 5), c3Mat(C3_PALETA.patas));
    p.position.set(0, 0.09, z); g.add(p);
  }
  g.add(tela);
  return g;
}

/* ============================================================
   PLANO DE LA CLÍNICA — tres zonas sobre un mismo piso
   Izquierda: recepción y sala de espera. Centro: salas de
   atención con camillas. Derecha: gimnasio terapéutico, donde
   aparece el equipamiento comprado. La cámara recorre las salas.
   ============================================================ */
const C3_ANCHO = 15.2, C3_FONDO = 9.4;   // dimensiones del piso

/* Sillas de la espera (posiciones fijas; los pacientes se sientan en orden) */
const C3_SILLAS = [
  [-6.6, 1.9], [-5.8, 1.9], [-5.0, 1.9], [-4.2, 1.9],
  [-6.6, 3.1], [-5.8, 3.1], [-5.0, 3.1], [-4.2, 3.1],
];

/* Dónde va cada equipo comprado, todos en el gimnasio. */
const C3_LUGARES = {
  tens:       { hacer:c3TENS,       pos:[ 3.35, 0, -3.05], rotY:-0.35 },
  eco:        { hacer:c3Ecografo,   pos:[ 4.75, 0, -3.25], rotY: 0.15 },
  gym:        { hacer:c3Gimnasio,   pos:[ 4.60, 0,  0.60], rotY:-0.50 },
  plataforma: { hacer:c3Plataforma, pos:[ 6.25, 0, -1.30], rotY: 0.60 },
  hidro:      { hacer:c3Hidro,      pos:[ 5.55, 0,  2.60], rotY:-0.30 },
};

/* Paradas del recorrido de cámara: nombre, posición y hacia dónde mira. */
const C3_TOUR = [
  { nom:'Tu clínica',            pos:[ 0.6, 11.6, 11.6], mira:[ 0.0, 0.0, -0.6] },
  { nom:'Sala de espera',        pos:[-5.2,  3.4,  6.4], mira:[-5.2, 0.6,  0.4] },
  { nom:'Salas de atención',     pos:[ 0.0,  3.4,  4.8], mira:[ 0.0, 0.7, -2.4] },
  { nom:'Gimnasio terapéutico',  pos:[ 5.3,  3.5,  5.8], mira:[ 4.4, 0.5, -0.9] },
];
const C3_TOUR_SEG = 8, C3_TOUR_MOV = 2.6;   // segundos por parada / de viaje

function c3Poblar(){
  if(!c3Escena) return;
  [...c3Camillas, ...c3Personal, ...c3Pacientes, ...c3Muebles].forEach(o => c3Escena.remove(o));
  c3Camillas = []; c3Personal = []; c3Pacientes = []; c3Muebles = [];
  const c = clEstado();
  const salas = clSalas();

  // salas de atención: una camilla por sala comprada, en la zona central
  for(let i = 0; i < salas; i++){
    const x = -1.7 + i * 1.7;
    const cam = c3Camilla(); cam.position.set(x, 0, -2.7);
    c3Escena.add(cam); c3Camillas.push(cam);

    // biombo entre una camilla y la siguiente: cada sala se siente sala
    if(i > 0){
      const b = c3Biombo();
      b.position.set(x - 0.85, 0, -2.7);
      b.userData = { tipo:'deco' };
      c3Escena.add(b); c3Muebles.push(b);
    }

    if(i < c.personal.length){
      const k = c3Persona(null, true);
      k.position.set(x + 0.72, 0, -2.7);
      k.rotation.y = -Math.PI / 2;
      k.userData = { tipo:'kine', idx:i, nom:c.personal[i].nom, esp:c.personal[i].esp,
                     renta:c.personal[i].renta, destino:null, base:new THREE.Vector3(x + 0.72, 0, -2.7) };
      c3Escena.add(k); c3Personal.push(k);

      const p = c3Persona(C3_PALETA.ropa[i % C3_PALETA.ropa.length], false);
      p.position.set(x, 0.72, -2.6);
      p.rotation.x = -Math.PI / 2;
      p.scale.setScalar(0.92);
      p.userData = { tipo:'acostado' };
      c3Escena.add(p); c3Pacientes.push(p);
    }
  }

  // el equipamiento comprado aparece en el gimnasio
  Object.keys(C3_LUGARES).forEach(id => {
    if(!clTieneEquipo(id)) return;
    const L = C3_LUGARES[id];
    const m = L.hacer();
    m.position.set(L.pos[0], L.pos[1], L.pos[2]);
    m.rotation.y = L.rotY;
    m.userData = { tipo:'equipo', id };
    c3Escena.add(m); c3Muebles.push(m);
  });

  // sala de espera: la gente que se ve sentada es la que está en la ficha
  const esperando = Math.max(1, Math.min(C3_SILLAS.length, (c.sala || []).length + Math.floor(c.reputacion / 30)));
  for(let i = 0; i < esperando; i++){
    const [sx, sz] = C3_SILLAS[i];
    const s = c3Persona(C3_PALETA.ropa[i % C3_PALETA.ropa.length], false);
    s.position.set(sx, 0.24, sz - 0.04);   // sentado sobre la silla, mirando a recepción
    s.rotation.y = Math.PI;
    s.scale.setScalar(0.94);
    s.userData = { tipo:'espera', fase:i * 1.3, destino:null,
                   base:new THREE.Vector3(sx, 0, sz - 0.04) };
    c3Escena.add(s); c3Pacientes.push(s);
  }
}

/* ---------- interacción: tocar para seleccionar, tocar el piso para mover ---------- */
function c3PrepararToques(lienzo){
  c3Rayo = new THREE.Raycaster();
  const ndc = new THREE.Vector2();

  const alTocar = (ev) => {
    const r = lienzo.getBoundingClientRect();
    ndc.x = ((ev.clientX - r.left) / r.width) * 2 - 1;
    ndc.y = -((ev.clientY - r.top) / r.height) * 2 + 1;
    c3Rayo.setFromCamera(ndc, c3Cam);

    // ¿tocó a alguien?
    const gente = [...c3Personal, ...c3Pacientes.filter(p => p.userData.tipo === 'espera')];
    const hitGente = c3Rayo.intersectObjects(gente, true);
    if(hitGente.length){
      let o = hitGente[0].object;
      while(o.parent && !o.userData.tipo) o = o.parent;
      c3Seleccionar(o);
      return;
    }
    // ¿tocó un equipo?
    const hitEq = c3Rayo.intersectObjects(c3Muebles, true);
    if(hitEq.length){
      let o = hitEq[0].object;
      while(o.parent && !o.userData.tipo) o = o.parent;
      const eq = CL_EQUIPOS.find(e => e.id === o.userData.id);
      if(eq) avisar(eq.emo + ' ' + eq.nom + ' · ' + eq.desc);
      jxSonido('tap');
      return;
    }
    // tocó el piso: si hay alguien elegido, lo mando para allá
    if(c3Seleccionado && c3Piso){
      const hitPiso = c3Rayo.intersectObject(c3Piso);
      if(hitPiso.length){
        const p = hitPiso[0].point;
        c3Seleccionado.userData.destino = new THREE.Vector3(
          Math.max(-7.0, Math.min(7.0, p.x)), 0, Math.max(-3.9, Math.min(4.2, p.z)));
        jxSonido('tap'); jxVibrar(8);
        return;
      }
    }
    c3Seleccionar(null);
  };
  lienzo.addEventListener('pointerdown', alTocar);
}

function c3Seleccionar(obj){
  c3Seleccionado = obj;
  if(c3Anillo) c3Anillo.visible = !!obj;
  const caja = document.getElementById('cl3dSel');
  if(!caja) return;
  if(!obj){ caja.classList.remove('on'); return; }
  jxSonido('tap');
  const u = obj.userData;
  if(u.tipo === 'kine'){
    const e = CL_ESPECIALIDADES[u.esp];
    caja.innerHTML = '<b>' + u.nom + '</b><span>' + e.emo + ' ' + e.nom + ' · ' + clPlata(u.renta * clMultPago()) + '/s</span>' +
                     '<small>Toca el piso para moverlo</small>';
  }else{
    caja.innerHTML = '<b>Paciente en espera</b><span>Esperando ser atendido</span>' +
                     '<small>Toca el piso para moverlo</small>';
  }
  caja.classList.add('on');
}

function c3Camilla(){
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.1, 1.9), c3Mat(C3_PALETA.camilla));
  base.position.y = 0.62; base.castShadow = true; base.receiveShadow = true;
  const sab = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.04, 1.2), c3Mat(C3_PALETA.sabana));
  sab.position.set(0, 0.69, 0.3);
  for(const [x, z] of [[-0.3,-0.8],[0.3,-0.8],[-0.3,0.8],[0.3,0.8]]){
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.57, 5), c3Mat(C3_PALETA.patas));
    p.position.set(x, 0.29, z); g.add(p);
  }
  g.add(base, sab);
  return g;
}

function c3Planta(){
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.26, 6), c3Mat(C3_PALETA.macetero));
  m.position.y = 0.13; m.castShadow = true;
  for(let i = 0; i < 5; i++){
    const h = new THREE.Mesh(new THREE.IcosahedronGeometry(0.17, 0), c3Mat(C3_PALETA.planta));
    h.position.set((Math.random()-0.5)*0.22, 0.36 + Math.random()*0.22, (Math.random()-0.5)*0.22);
    h.scale.setScalar(0.6 + Math.random()*0.5); h.castShadow = true;
    g.add(h);
  }
  g.add(m);
  return g;
}

function c3Construir(lienzo){
  const esc = new THREE.Scene();
  esc.background = new THREE.Color(0xeef2f0);
  esc.fog = new THREE.Fog(0xeef2f0, 18, 38);

  // luces: una cálida principal con sombra, más relleno frío
  esc.add(new THREE.HemisphereLight(0xffffff, 0xc8d4dc, 1.05));
  const sol = new THREE.DirectionalLight(0xfff2dc, 1.5);
  sol.position.set(6, 9, 5); sol.castShadow = true;
  sol.shadow.mapSize.set(1024, 1024);
  sol.shadow.camera.left = -10; sol.shadow.camera.right = 10;
  sol.shadow.camera.top = 10; sol.shadow.camera.bottom = -10;
  esc.add(sol);

  // piso completo y anillo de selección
  // cada sede tiene su propia paleta: se nota que cambiaste de ciudad
  const sede = clSede();
  const piso = new THREE.Mesh(new THREE.BoxGeometry(C3_ANCHO, 0.2, C3_FONDO), c3Mat(sede.piso));
  piso.position.y = -0.1; piso.receiveShadow = true; esc.add(piso);
  c3Piso = piso;
  c3Anillo = new THREE.Mesh(new THREE.RingGeometry(0.24, 0.3, 20), c3Mat(0xf5c542, { transparent:true, opacity:0.9 }));
  c3Anillo.rotation.x = -Math.PI/2; c3Anillo.position.y = 0.02; c3Anillo.visible = false; esc.add(c3Anillo);

  // muro del fondo y muros laterales
  const muroF = new THREE.Mesh(new THREE.BoxGeometry(C3_ANCHO, 3.2, 0.2), c3Mat(sede.muro));
  muroF.position.set(0, 1.6, -C3_FONDO/2 + 0.1); muroF.receiveShadow = true; esc.add(muroF);
  for(const lado of [-1, 1]){
    const muroL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.2, C3_FONDO), c3Mat(C3_PALETA.muroBajo));
    muroL.position.set(lado * (C3_ANCHO/2 - 0.1), 1.6, 0); muroL.receiveShadow = true; esc.add(muroL);
  }

  // tabiques que separan las tres zonas (dejan el pasillo del frente libre)
  for(const x of [-2.55, 2.55]){
    const tab = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.7, 3.6), c3Mat(C3_PALETA.muroBajo));
    tab.position.set(x, 0.85, -C3_FONDO/2 + 2.0);
    tab.castShadow = true; tab.receiveShadow = true; esc.add(tab);
  }

  // ventanales: uno sobre la espera y otro sobre el gimnasio
  for(const x of [-5.2, 4.9]){
    const vent = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.4, 0.06), c3Mat(0xbfe0f0, { transparent:true, opacity:0.75 }));
    vent.position.set(x, 1.9, -C3_FONDO/2 + 0.24); esc.add(vent);
  }

  // --- sala de espera: alfombra, recepción, tele y sillas ---
  const alfE = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.02, 3.2), c3Mat(C3_PALETA.alfEspera));
  alfE.position.set(-5.4, 0.01, 2.3); alfE.receiveShadow = true; esc.add(alfE);
  const meson = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.95, 0.6), c3Mat(C3_PALETA.mueble));
  meson.position.set(-5.4, 0.48, -3.6); meson.castShadow = true; meson.receiveShadow = true; esc.add(meson);
  const tv = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.66, 0.07), c3Mat(C3_PALETA.tv));
  tv.position.set(-3.0, 1.9, -C3_FONDO/2 + 0.24); esc.add(tv);
  const tvLuz = new THREE.Mesh(new THREE.PlaneGeometry(1.02, 0.54), c3Mat(0x9fd0e8));
  tvLuz.position.set(-3.0, 1.9, -C3_FONDO/2 + 0.285); esc.add(tvLuz);
  C3_SILLAS.forEach(([x, z]) => {
    const s = c3Silla(); s.position.set(x, 0, z); s.rotation.y = Math.PI; esc.add(s);
  });

  // --- gimnasio: alfombra de goma ---
  const alfG = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.02, 6.2), c3Mat(C3_PALETA.alfGym));
  alfG.position.set(5.0, 0.01, -0.4); alfG.receiveShadow = true; esc.add(alfG);

  // plantas repartidas por los rincones
  for(const [x, z] of [[-7.0, -3.6], [7.0, -3.6], [-2.9, 3.9], [2.9, 3.9]]){
    const p = c3Planta(); p.position.set(x, 0, z); esc.add(p);
  }

  const cam = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  const rend = new THREE.WebGLRenderer({ canvas:lienzo, antialias:true, alpha:false });
  rend.shadowMap.enabled = true;
  rend.shadowMap.type = THREE.PCFSoftShadowMap;

  return { esc, cam, rend };
}

async function c3Iniciar(lienzo){
  await c3Cargar();
  const { esc, cam, rend } = c3Construir(lienzo);
  c3Escena = esc; c3Cam = cam; c3Rend = rend;
  c3Poblar();
  c3PrepararToques(lienzo);
  c3Ajustar();
  c3Animar();
}

function c3Ajustar(){
  if(!c3Rend || !c3Cam) return;
  const l = c3Rend.domElement, r = l.getBoundingClientRect();
  if(!r.width || !r.height) return;
  c3Rend.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  c3Rend.setSize(r.width, r.height, false);
  c3Cam.aspect = r.width / r.height;
  c3Cam.updateProjectionMatrix();
}

function c3Animar(){
  if(c3Loop) cancelAnimationFrame(c3Loop);
  const paso = (t) => {
    if(jxPantalla !== 'clinica' || !document.getElementById('jxApp')?.classList.contains('abierta')){
      c3Loop = null; return;
    }
    c3Reloj = t / 1000;
    // recorrido de cámara: se detiene en cada sala y viaja suave a la siguiente
    const ciclo = C3_TOUR.length * C3_TOUR_SEG;
    const tt = c3Reloj % ciclo;
    const idx = Math.floor(tt / C3_TOUR_SEG);
    const fseg = tt - idx * C3_TOUR_SEG;
    const A = C3_TOUR[idx], B = C3_TOUR[(idx + 1) % C3_TOUR.length];
    let k = 0;
    if(fseg > C3_TOUR_SEG - C3_TOUR_MOV) k = (fseg - (C3_TOUR_SEG - C3_TOUR_MOV)) / C3_TOUR_MOV;
    k = k * k * (3 - 2 * k);   // smoothstep: parte y llega sin frenazos
    const mz = (a, b) => a + (b - a) * k;
    // vaivén chico encima del recorrido, para que la escena respire
    const sw = Math.sin(c3Reloj * 0.4) * 0.10, sv = Math.sin(c3Reloj * 0.27) * 0.08;
    c3Cam.position.set(mz(A.pos[0], B.pos[0]) + sw, mz(A.pos[1], B.pos[1]) + sv, mz(A.pos[2], B.pos[2]));
    c3Cam.lookAt(mz(A.mira[0], B.mira[0]), mz(A.mira[1], B.mira[1]), mz(A.mira[2], B.mira[2]));
    // letrero con la sala que se está mirando
    const zonaEl = document.getElementById('cl3dZona');
    if(zonaEl){
      const nomZona = (k > 0.5 ? B : A).nom;
      if(zonaEl.textContent !== nomZona) zonaEl.textContent = nomZona;
    }
    // el personal trabaja: leve balanceo
    c3Personal.forEach((k, i) => { if(!k.userData.destino) k.position.y = Math.abs(Math.sin(c3Reloj * 1.7 + i)) * 0.045; });
    // quien tenga destino camina hacia allá, con pasitos
    [...c3Personal, ...c3Pacientes].forEach(o => {
      const u = o.userData; if(!u || !u.destino) return;
      const d = u.destino.clone().sub(o.position); d.y = 0;
      const dist = d.length();
      if(dist < 0.06){ u.destino = null; o.position.y = 0; return; }
      d.normalize().multiplyScalar(Math.min(0.03, dist));
      o.position.add(d);
      o.rotation.y = Math.atan2(d.x, d.z);
      o.position.y = Math.abs(Math.sin(c3Reloj * 11)) * 0.04;
    });
    if(c3Anillo && c3Seleccionado){ c3Anillo.position.set(c3Seleccionado.position.x, 0.02, c3Seleccionado.position.z); }
    // los que esperan se mueven apenas en su silla, mirando a recepción
    c3Pacientes.forEach(p => {
      if(p.userData.fase === undefined || p.userData.destino) return;
      p.rotation.y = Math.PI + Math.sin(c3Reloj * 0.5 + p.userData.fase) * 0.24;
    });
    c3Rend.render(c3Escena, c3Cam);
    c3Loop = requestAnimationFrame(paso);
  };
  c3Loop = requestAnimationFrame(paso);
}

function c3Detener(){
  if(c3Loop){ cancelAnimationFrame(c3Loop); c3Loop = null; }
}

/* Libera la memoria de la GPU: sin esto, abrir y cerrar la clínica
   muchas veces va dejando texturas y geometrías colgando. */
function c3Destruir(){
  c3Detener();
  if(c3Escena){
    c3Escena.traverse(o => {
      if(o.geometry) o.geometry.dispose();
      if(o.material){ (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose()); }
    });
  }
  if(c3Rend) c3Rend.dispose();
  c3Escena = null; c3Cam = null; c3Rend = null;
  c3Personal = []; c3Pacientes = []; c3Camillas = []; c3Muebles = [];
  c3Seleccionado = null; c3Piso = null; c3Anillo = null; c3Rayo = null;
}

/* ============================================================
   CLÍNICA KINÉSICA — tycoon
   Llegan pacientes, hay que evaluarlos, diagnosticarlos y tratarlos.
   Acertar da plata y reputación; con eso se contrata gente, se compra
   equipamiento y se abren especialidades. El personal contratado atiende
   solo y renta con la página cerrada, igual que el jardín.
   El contenido clínico vive en KIN_CASOS / KIN_PRUEBAS (ver
   REVISION-KINESIOLOGIA.md): acá solo está la mecánica.
   ============================================================ */

const CL_ESPECIALIDADES = {
  trauma:  { nom:'Traumatológica', emo:'🦴', rep:0,  color:'#c8956d' },
  deporte: { nom:'Deportiva',      emo:'⚽', rep:15, color:'#6d9fc8' },
  respi:   { nom:'Respiratoria',   emo:'🫁', rep:40, color:'#c86d8f' },
  neuro:   { nom:'Neurológica',    emo:'🧠', rep:70, color:'#9b7fc8' },
};

const CL_EQUIPOS = [
  { id:'camilla2', nom:'Segunda camilla',      emo:'🛏️', costo:600,    desc:'Una sala más para atender en paralelo', ef:{salas:1} },
  { id:'tens',     nom:'Equipo de TENS',       emo:'⚡', costo:1800,   desc:'+15% de ingreso por paciente',          ef:{pago:0.15} },
  { id:'eco',      nom:'Ecógrafo',             emo:'📡', costo:5200,   desc:'Muestra una pista extra en la evaluación', ef:{pista:true} },
  { id:'camilla3', nom:'Tercera camilla',      emo:'🛏️', costo:9000,   desc:'Otra sala más',                          ef:{salas:1} },
  { id:'gym',      nom:'Sala de ejercicio',    emo:'🏋️', costo:16000,  desc:'+25% de ingreso por paciente',           ef:{pago:0.25} },
  { id:'plataforma',nom:'Plataforma de fuerza',emo:'📊', costo:42000,  desc:'+1 reputación extra por acierto perfecto', ef:{rep:1} },
  { id:'hidro',    nom:'Hidroterapia',         emo:'💧', costo:120000, desc:'+40% de ingreso por paciente',            ef:{pago:0.40} },
  /* --- segunda tanda: cuando la clínica ya anda y se acababa qué comprar --- */
  { id:'ficha',    nom:'Ficha clínica electrónica', emo:'💻', costo:220000,  desc:'La ficha llega hecha: +2 de tiempo con cada paciente', ef:{tiempo:2} },
  { id:'camilla4', nom:'Cuarto box',           emo:'🛏️', costo:380000,   desc:'Otra sala más',                          ef:{salas:1} },
  { id:'espera',   nom:'Sala de espera nueva', emo:'🛋️', costo:600000,  desc:'Caben tres pacientes más en la fila',     ef:{espera:3} },
  { id:'iso',      nom:'Dinamómetro isocinético', emo:'🦾', costo:900000, desc:'+2 de reputación extra por acierto perfecto', ef:{rep:2} },
  { id:'crio',     nom:'Cámara de crioterapia', emo:'🧊', costo:1400000,  desc:'+60% de ingreso por paciente',           ef:{pago:0.60} },
  { id:'camilla5', nom:'Quinto box',           emo:'🛏️', costo:2000000,  desc:'Otra sala más',                          ef:{salas:1} },
  { id:'marcha',   nom:'Laboratorio de marcha', emo:'👣', costo:3000000, desc:'+3 de tiempo y +25% de ingreso',         ef:{tiempo:3, pago:0.25} },
  { id:'resonador',nom:'Convenio de resonancia', emo:'🧲', costo:4200000, desc:'Las imágenes salen gratis y dan más información', ef:{img:true} },
  { id:'cardio',   nom:'Unidad de rehabilitación cardíaca', emo:'🫀', costo:6000000, desc:'+90% de ingreso por paciente', ef:{pago:0.90} },
  { id:'exo',      nom:'Exoesqueleto de marcha', emo:'🤖', costo:8500000, desc:'+4 de reputación extra y +50% de ingreso', ef:{rep:4, pago:0.50} },
  { id:'docencia', nom:'Campo clínico universitario', emo:'🎓', costo:12000000, desc:'Los internos atienden: +6 de tiempo con cada paciente', ef:{tiempo:6} },
  { id:'ala',      nom:'Ala nueva de la clínica', emo:'🏛️', costo:18000000, desc:'Dos salas más y +100% de ingreso',    ef:{salas:2, pago:1.0} },
];

const CL_NOMBRES = ['Fernanda','Matías','Camila','Joaquín','Antonia','Vicente','Josefa','Benjamín','Isidora','Tomás','Florencia','Agustín'];

/* ============================================================
   GENERADOR DE PACIENTES
   El contenido clínico son 55 cuadros revisados, pero la GENTE se arma
   sola: nombre, apellido, edad, oficio y comuna. Así el mismo cuadro
   llega mil veces sin que se sienta el mismo paciente.
   Los pacientes con nombre propio (los de la ficha) se reservan para
   los que vuelven: esos sí tienen historia y arco.
   ============================================================ */
const CL_NOM_F = ['Camila','Valentina','Javiera','Francisca','Constanza','Antonia','Isidora','Josefa','Fernanda',
  'Martina','Florencia','Trinidad','Emilia','Sofía','Amanda','Rocío','Daniela','Carolina','Paulina','Marcela',
  'Verónica','Patricia','Gloria','Elba','Rosa','Olga','Mónica','Ximena','Soledad','Pilar','Nicole','Bárbara',
  'Denisse','Yasna','Millaray','Antonella','Ignacia','Magdalena','Catalina','Andrea','Claudia','Jacqueline'];
const CL_NOM_M = ['Matías','Benjamín','Vicente','Joaquín','Agustín','Tomás','Cristóbal','Sebastián','Felipe',
  'Nicolás','Ignacio','Gabriel','Martín','Bastián','Álvaro','Rodrigo','Cristián','Marcelo','Patricio','Jorge',
  'Luis','Héctor','Manuel','Óscar','Nelson','Hernán','Guillermo','Ramón','Pablo','Andrés','Camilo','Esteban',
  'Rubén','Alonso','Maximiliano','Lautaro','Emilio','Gonzalo','Mauricio','Ricardo','Sergio','Iván'];
const CL_APELLIDOS = ['González','Muñoz','Rojas','Díaz','Pérez','Soto','Contreras','Silva','Martínez','Sepúlveda',
  'Morales','Rodríguez','López','Fuentes','Hernández','Torres','Araya','Flores','Espinoza','Valenzuela','Castillo',
  'Tapia','Reyes','Gutiérrez','Castro','Vargas','Álvarez','Vásquez','Sánchez','Ramírez','Carrasco','Gómez','Cortés',
  'Herrera','Núñez','Jara','Vergara','Rivera','Figueroa','Riquelme','Bravo','Miranda','Orellana','Aguilera',
  'Sandoval','Guzmán','Salazar','Vera','Campos','Fernández','Ortiz','Molina','Navarro','Pizarro','Cárdenas',
  'Godoy','Ahumada','Zúñiga','Peña','Leiva','Catalán','Huenchul','Millán','Paillal','Curihual'];
const CL_COMUNAS = ['La Florida','Puente Alto','Maipú','Curicó','Talca','Rancagua','Chillán','Temuco','Valdivia',
  'Osorno','Concepción','Talcahuano','Valparaíso','Viña del Mar','Quilpué','La Serena','Coquimbo','Antofagasta',
  'Calama','Iquique','Arica','Punta Arenas','Puerto Montt','Castro','Linares','San Fernando','Melipilla','Buin',
  'Peñaflor','Renca','Recoleta','Ñuñoa','Macul','Quinta Normal','Estación Central','El Bosque','La Pintana',
  'Colina','Lampa','Molina','Parral','Cauquenes','Angol','Villarrica','Ovalle','Illapel','Los Ángeles'];

/* Oficios intercambiables por caso: tienen que seguir calzando con el
   mecanismo de la ficha (el pintor y el estucador trabajan igual sobre la
   cabeza; el minero y el portuario levantan el mismo peso). */
const CL_OCUPS = {
  huaso:['agricultor','temporero de la fruta','arriero'],
  minero:['portuario','operador de maquinaria','conductor de camión minero'],
  basquetbol:['voleibolista','jugador de balonmano','atleta de salto alto'],
  carrete:['universitario','garzón','estudiante de pedagogía'],
  banderas:['pensionado','ex funcionario público','jubilado de la construcción'],
  pinzamiento:['estucador','maestro eléctrico','instalador de cielos','pintor de brocha gorda'],
  capsulitis:['administrativa','profesora básica','cajera de banco'],
  manguito:['nadadora máster','entrenadora de natación','waterpolista'],
  epicondilalgia:['gásfiter','mueblista','soldador'],
  tunel:['secretaria','cajera de supermercado','transcriptora'],
  dequervain:['mamá de guagua','educadora de párvulos','cuidadora de adulto mayor'],
  lumbago:['reponedor de supermercado','mudancista','operario de bodega'],
  radiculopatia:['conductor de micro','taxista','camionero de larga distancia'],
  trocanterico:['profesora','enfermera','vendedora de tienda'],
  lca:['jugadora de fútbol','handbolista','esquiadora'],
  menisco:['futbolista de barrio','árbitro','jugador de baby fútbol'],
  patelofemoral:['corredora aficionada','estudiante de educación física','trotadora de parque'],
  aquiles:['corredor de calle','profesor de gimnasia','maratonista aficionado'],
  esguince:['basquetbolista','voleibolista','jugador de fútsal'],
  fascitis:['vendedora ambulante','peluquera','garzona'],
  cervicalgia:['programadora','call center','diseñadora gráfica'],
  epoc:['ex minero','ex soldador','jubilado fumador de años'],
  acv:['dueña de casa','jubilada','ex comerciante'],
  bronquiolitis:['lactante','guagua de sala cuna','bebé de ocho meses'],
  neumonia:['jubilado del campo','pensionado','adulto mayor que vive solo'],
  postuci:['profesora','contadora','funcionaria municipal'],
  parkinson:['jubilado','ex relojero','ex profesor de matemáticas'],
  facial:['peluquera','vendedora','manicurista'],
  artrosis:['feriante','comerciante de la vega','dueña de almacén'],
  cadera:['jubilada','pensionada','abuela que cuida nietos'],
  latigazo:['estudiante','oficinista','vendedora'],
  epimedial:['albañil','jardinero','maestro de obra'],
  isquios:['jugador de liga de barrio','velocista','jugador de rugby'],
  cintilla:['corredora de trail','ciclista de montaña','montañista'],
  canillera:['conscripto','recluta de carabineros','bombero voluntario'],
  cauda:['camionero','operario','bodeguero'],
  tvp:['costurera','tejedora','modista'],
  compartimental:['rugbista','futbolista','jugador de hockey césped'],
  cardiaco:['panadero','maestro pastelero','feriante'],
  fxestres:['bailarina de ballet','gimnasta','bailarina de danza contemporánea'],
  septica:['jubilado diabético','pensionado','adulto mayor con diabetes'],
  radicervical:['maestro eléctrico','pintor de altura','instalador de cielos'],
  cubital:['taxista','conductor de bus','operador de grúa'],
  estenosis:['jubilado','pensionado','ex funcionario municipal'],
  coxartrosis:['jubilada','dueña de casa','ex temporera'],
  pubalgia:['futbolista de liga','jugador de rugby','mediocampista de club'],
  rotura:['maestro mueblista','pintor','estucador'],
  escafoides:['estudiante','repartidor en bicicleta','skater'],
  tibialpost:['auxiliar de aseo','manipuladora de alimentos','vendedora de local'],
  morton:['vendedora de tienda','recepcionista','garzona'],
  vppb:['dueña de casa','jubilada','cuidadora'],
  esclerosis:['profesora','educadora diferencial','bibliotecaria'],
  fxvertebral:['jubilada','pensionada','abuela que vive sola'],
};

/* ---------- la clínica como lugar ----------
   Contexto que cambia en cada visita: no es lo mismo un paciente que
   viene del SAPU que uno derivado por la mutual. Es decoración honesta,
   no afecta el diagnóstico, pero hace que la sala de espera se sienta
   un lugar y no una cola de fichas. */
const CL_PREVISION = ['Fonasa B','Fonasa C','Fonasa D','Isapre','Mutual','GES'];

/* Quién te manda los pacientes. Es una relación: si les resuelves bien te
   mandan más y mejor pagados; si les devuelves gente mal manejada, dejan
   de derivarte. Explica de dónde sale el flujo en vez de que aparezcan
   de la nada. */
const CL_DERIVADORES = [
  { id:'cesfam',  nom:'CESFAM del sector',   emo:'🏥', pago:0.85, desc:'Manda mucha gente, paga poco y agradece harto' },
  { id:'mutual',  nom:'Mutual de seguridad', emo:'🦺', pago:1.55, desc:'Accidentes del trabajo: pagan bien y piden informe' },
  { id:'trauma',  nom:'Traumatólogo del barrio', emo:'🩻', pago:1.30, desc:'Post operados y casos ya estudiados' },
  { id:'club',    nom:'Club deportivo',      emo:'⚽', pago:1.20, desc:'Deportistas que necesitan volver a jugar' },
  { id:'hospital',nom:'Hospital regional',   emo:'🏨', pago:1.0,  desc:'Altas complejas que necesitan seguimiento' },
  { id:'boca',    nom:'Boca a boca',         emo:'💬', pago:1.15, desc:'Los que llegan porque alguien habló bien de ti' },
];
const CL_ORIGEN = ['derivado del CESFAM','viene del SAPU','derivado del hospital','viene por su cuenta',
  'derivado por el traumatólogo','viene de la posta rural','derivado del policlínico de la mutual','lo mandó su médico de cabecera'];
const CL_ESPERA_FRASE = ['Lleva 20 minutos en la sala','Llegó antes de la hora','Pidió hora hace tres semanas',
  'Vino acompañado','Vino directo del trabajo','Alcanzó a llegar entre turnos','Se tomó dos micros para llegar'];

/* Eventos que duran unos pacientes y cambian cómo se trabaja. */
const CL_EVENTOS = [
  { id:'operativo', emo:'🚐', nom:'Operativo rural',
    desc:'Se atiende en una posta a dos horas de la ciudad. Paga poco, pero el pueblo lo cuenta.',
    ef:{ rep:2, pago:0.7 } },
  { id:'mutual', emo:'🦺', nom:'Convenio con la mutual',
    desc:'Llegaron accidentes del trabajo derivados: pagan bastante mejor.',
    ef:{ pago:1.6 } },
  { id:'invierno', emo:'🌧️', nom:'Campaña de invierno',
    desc:'La sala IRA está llena. Por ahora llegan puros cuadros respiratorios.',
    ef:{ esp:'respi', tiempo:2 } },
  { id:'interna', emo:'🎓', nom:'Llegó una interna en práctica',
    desc:'Toma la anamnesis mientras tú evalúas: rinde mucho más el tiempo con cada paciente.',
    ef:{ tiempo:4 } },
  { id:'corte', emo:'💡', nom:'Corte de luz en el sector',
    desc:'No hay imágenes ni equipos. Hay que decidir con las manos y la cabeza.',
    ef:{ sinImg:true, pago:1.2 } },
  { id:'prensa', emo:'📰', nom:'Vino la tele a grabar',
    desc:'Un reportaje sobre la clínica. El acierto limpio suma el doble; el error también se ve.',
    ef:{ rep:2, castigo:true } },
  { id:'congreso', emo:'🏅', nom:'Semana del congreso',
    desc:'Media clínica está en el congreso: menos tiempo por paciente, pero lo que llega paga más.',
    ef:{ pago:1.4, tiempo:-3 } },

  /* --- lo que pasa en Chile y le pega a la clínica --- */
  { id:'temporal', emo:'⛈️', nom:'Temporal en la zona',
    desc:'Lluvia con viento hace dos días. Se cortó la luz en el sector y la mitad no llegó a su hora.',
    ef:{ sinImg:true, tiempo:-2, pago:0.85 } },
  { id:'terremoto', emo:'🏚️', nom:'Terremoto anoche',
    desc:'Un 7,2 a las tres de la mañana. Llegan caídas, golpes y mucha gente con el cuello agarrotado del susto.',
    ef:{ rep:2.5, tiempo:-3, pago:0.8 } },
  { id:'protestas', emo:'📢', nom:'Protestas en el centro',
    desc:'Cortaron la alameda. Los que llegan vienen tarde, alterados y algunos con lesiones de la marcha.',
    ef:{ tiempo:-2, rep:1.6 } },
  { id:'paro', emo:'🚌', nom:'Paro de la locomoción',
    desc:'No hay micros. Llega poca gente, pero la que llega caminó una hora y no se quiere ir sin ser atendida.',
    ef:{ pago:1.5, tiempo:2 } },
  { id:'sanitaria', emo:'😷', nom:'Alerta sanitaria',
    desc:'Circular del Minsal: se priorizan los cuadros respiratorios y se refuerza la sala IRA.',
    ef:{ esp:'respi', pago:1.3 } },
  { id:'calor', emo:'🥵', nom:'Ola de calor',
    desc:'38 grados y el aire acondicionado murió. Nadie rinde igual, ni los pacientes ni tú.',
    ef:{ tiempo:-2, pago:1.1 } },
  { id:'dieciocho', emo:'🇨🇱', nom:'Semana del dieciocho',
    desc:'Fondas, cueca y asado. Llegan esguinces de baile, lumbagos de empanada y mucha gente de buen ánimo.',
    ef:{ pago:1.7, rep:1.3, tiempo:-1 } },
  { id:'smog', emo:'🌫️', nom:'Preemergencia ambiental',
    desc:'Restricción vehicular y aire pesado. Se disparan las consultas respiratorias y la gente anda ahogada.',
    ef:{ esp:'respi', tiempo:-1, rep:1.4 } },
  { id:'aluvion', emo:'🌊', nom:'Aluvión en la quebrada',
    desc:'Se cortó el agua en media ciudad. Operativo de emergencia: paga poco y se trabaja incómodo, pero la gente no lo olvida.',
    ef:{ rep:2.2, pago:0.6, sinImg:true } },
  { id:'maraton', emo:'🏃', nom:'Maratón de la ciudad',
    desc:'Corrieron diez mil personas el domingo. El lunes la sala se llenó de rodillas, tendones y canillas.',
    ef:{ esp:'deporte', pago:1.35 } },
  { id:'invierno2', emo:'❄️', nom:'Heladas',
    desc:'Amaneció con escarcha. Llegan caídas de adultos mayores y todo el mundo entra rígido.',
    ef:{ tiempo:-1, rep:1.5, pago:1.15 } },

  /* --- sucesos con anécdota: traen un relato y la sala se llena de golpe --- */
  { id:'choque', emo:'🚗', nom:'Choque múltiple en la ruta',
    desc:'Se chocaron cuatro autos en la curva de la salida norte.',
    relato:'Llegó primero la mamá con la guagua, después el camionero caminando solo, y al rato los bomberos ' +
           'trajeron a dos más. La sala quedó llena en veinte minutos y todos con el cuello duro.',
    ef:{ llena:6, tiempo:-2, rep:2, pago:1.2 } },
  { id:'derrumbe', emo:'⛏️', nom:'Derrumbe en la mina',
    desc:'Colapsó una galería en el turno de noche.',
    relato:'Salieron todos, pero salieron mal: golpes, aplastamientos y mucha gente que estuvo horas en una ' +
           'posición imposible. La mutual mandó a todos para acá y dijo que no reparáramos en gastos.',
    ef:{ llena:5, pago:2.2, rep:2.5, tiempo:-1 } },
  { id:'incendio', emo:'🔥', nom:'Incendio forestal',
    desc:'El humo llegó hasta la ciudad y no se ve el cerro.',
    relato:'Los brigadistas llegan quemados de sol y con las manos destrozadas de la pala, y detrás vienen ' +
           'los vecinos ahogándose con el humo. Nadie pregunta cuánto cuesta.',
    ef:{ llena:5, esp:'respi', rep:2.4, pago:0.9 } },
  { id:'final', emo:'🏆', nom:'Final del campeonato',
    desc:'Jugó el equipo de la ciudad y ganó en los penales.',
    relato:'El lunes amaneció con media cancha en la sala de espera: dos esguinces, un desgarro y un tipo que ' +
           'celebró tan fuerte que se sacó el hombro. Vinieron todos con la camiseta puesta.',
    ef:{ llena:5, esp:'deporte', pago:1.6, rep:1.5 } },
  { id:'micro', emo:'🚐', nom:'Volcó una micro rural',
    desc:'Se salió de la carretera camino a la costa, con veinte pasajeros.',
    relato:'No hubo muertos, de milagro. Llegaron de a poco durante todo el día, la mayoría caminando y ' +
           'diciendo que estaban bien, y a las horas empezaron a agarrotarse todos.',
    ef:{ llena:6, rep:2.2, tiempo:-2 } },
  { id:'fabrica', emo:'🏭', nom:'Accidente en la fábrica',
    desc:'Falló una prensa en el turno de la mañana.',
    relato:'La empresa mandó a todo el turno a control preventivo, más los tres que salieron lesionados de ' +
           'verdad. Pagan ellos, y pagan bien, pero quieren informe de cada uno.',
    ef:{ llena:4, pago:2.0, tiempo:-1 } },
];
const CL_EVENTO_DURA = 4;
/* Bajados a propósito: la jornada normal tiene que sentirse normal, y el
   evento tiene que ser un suceso y no la rutina. */
const CL_EVENTO_PROB = 0.10;
const CL_EVENTO_ESPERA = 6;   // pacientes mínimos entre un evento y el siguiente
const CL_ESPERA_MAX = 3;

/* Urgencias que llegan en ambulancia: hay un reloj real y si se acaba,
   el paciente se va derivado por otro lado y la clínica pierde prestigio. */
const CL_URGENCIA_SEG = 100;
const CL_URGENCIA_PROB = 0.09;

/* Costos fijos. Sin esto la plata solo sube y contratar no es una decisión.
   Ojo con el balance: mientras atiendes tú solo no hay planilla ni local que
   pagar (gasto 0). Desde el primer contratado corren arriendo y sueldos, y
   cada kinesiólogo deja ganancia, pero delgada: llenarse de salas sin gente
   que las use deja la caja en rojo. */
const CL_ARRIENDO_BASE = 0.8;      // $/s
const CL_ARRIENDO_SALA = 0.5;      // $/s por sala abierta
const CL_SUELDO_PROP  = 0.35;      // fracción de la renta que se va en sueldo

/* Turno de noche: pacientes seguidos, sin elegir y con menos tiempo. */
const CL_NOCHE_REP = 50;           // reputación que lo desbloquea
const CL_NOCHE_LARGO = 5;
const CL_NOCHE_PAGO = 2.6;
const CL_NOCHE_TIEMPO = -4;

/* Tope de pacientes en tratamiento a la vez. Sin esto la lista crecía sin
   freno (llegó a 44) y dejaba de ser manejable: no se puede seguir a esa
   cantidad de gente, y el juego pierde el sentido de cerrar los casos. */
const CL_ACTIVOS_MAX = 10;

/* Cuánto aguanta alguien en la sala antes de irse a otra clínica. */
const CL_PACIENCIA = 6 * 60000;

/* Zonas que rotan como tema de la semana. */
const CL_TEMAS = ['Hombro','Rodilla','Lumbar','Cervical','Tobillo','Muñeca','Cadera','Pie','Codo','Respiratorio','Neurológico','Muslo'];

const CL_ADH_INICIAL = 60;
const CL_ALARMA_PROB = 0.20;

/* Pista de emergencia: una cada cinco minutos reales. No regala el
   diagnóstico, corrige el cuaderno de un hallazgo que ya conseguiste. */
const CL_PISTA_ESPERA = 5 * 60 * 1000;

/* ---------- sedes ----------
   El problema de que el juego se termine: la clínica se completaba y ahí
   moría. Ahora, cuando la tienes andando, puedes abrir una sede nueva en
   otra ciudad. Se parte de cero en plata, equipo y reputación, pero te
   llevas TODO lo aprendido (álbum, pacientes conocidos, récords y
   acreditaciones) y cada sede paga más y exige más: menos tiempo por
   paciente, diferenciales más largos y más urgencias. */
const CL_SEDES = [
  { nom:'Curicó',      emo:'🌻', muro:0xf3efe7, piso:0xe6ddd2 },
  { nom:'Talca',       emo:'🍇', muro:0xeef1f5, piso:0xe0dcd4 },
  { nom:'Rancagua',    emo:'⛏️', muro:0xf5efe3, piso:0xe4d9c8 },
  { nom:'Concepción',  emo:'🌊', muro:0xe9f0f2, piso:0xdde3e2 },
  { nom:'Valparaíso',  emo:'🚋', muro:0xfaeee6, piso:0xe8d9cc },
  { nom:'Santiago',    emo:'🏙️', muro:0xf0f0f2, piso:0xdedee2 },
  { nom:'Antofagasta', emo:'🏜️', muro:0xf7f0e2, piso:0xe9dcc2 },
  { nom:'Chiloé',      emo:'🌧️', muro:0xe8efe9, piso:0xd9e0d8 },
  { nom:'Punta Arenas',emo:'🐧', muro:0xeef2f6, piso:0xdce2e8 },
];
const CL_SEDE_REP = 100;        // reputación base para poder expandirse
const CL_SEDE_COSTO = 250000;   // plata base
const CL_SEDE_PAGO = 0.30;      // +30% de pago permanente por sede abierta

const CL_TOPE_OFFLINE = 6 * 3600 * 1000;
const CL_TASA_OFFLINE = 0.3;

let clLoop = null, clCanvas = null, clCtx = null, clFiguras = [], clUltimoLocal = 0, clUltimoCheck = 0;
let clVista = 'recepcion', clTurno = null, clMostrado = 0, clSesionAbierta = null;

function clEstado(){ asegurarJuegos(); return datos.juegos.clinica; }

function clDefault(){
  return {
    dinero:0, reputacion:0, atendidos:0, aciertos:0, fallos:0,
    salas:1, equipos:[], personal:[], vistos:{}, dominados:[], activos:[], altas:0,
    sala:[],      // quién está esperando ahora, con su contexto de esta visita
    hist:{},      // memoria de cada paciente: cuántas veces vino, cómo le fue
    evento:null,  // { id, restantes }
    evRoll:-1,    // con qué número de atendidos se sorteó el último evento
    urgencia:null,// { id, hasta, ficha } — ambulancia con reloj corriendo
    urRoll:-1,
    acred:['trauma'],   // especialidades con el examen aprobado
    noche:null,         // turno de noche en curso
    nocheMejor:0,
    racha:0, mejorRacha:0,
    examen:{ mejor:0, intentos:0, tema:{} },
    pistaT:0,           // cuándo se usó la última pista (se recarga cada 5 min)
    sede:0,             // en qué sede vas: sube el pago y la dificultad
    fundadas:[],        // nombres de las sedes que dejaste andando
    diario:{ fecha:null, puntaje:0, racha:0, mejorRacha:0, jugados:0 },
    diarioComp:{},      // marcador compartido del caso del día, por persona
    habil:[],           // habilidades desbloqueadas (sobreviven a las sedes)
    pxHabil:0,          // puntos para gastar en el árbol
    fallidos:{},        // casos que se te fueron, con lo que pasó
    notasCaso:{},       // mensajes escondidos en un caso para el otro
    deriv:{},           // confianza de cada derivador
    semana:null,
    misiones:{ dia:null, lista:[] },
    rojo:0,             // segundos acumulados con la caja en negativo
    t:0,
  };
}

/* ---------- eventos ---------- */
function clEvento(){
  const e = clEstado().evento;
  if(!e) return null;
  const d = CL_EVENTOS.find(x => x.id === e.id);
  return d ? Object.assign({}, d, { restantes:e.restantes }) : null;
}
function clEfEvento(k, def){
  const e = clEvento();
  return e && e.ef[k] !== undefined ? e.ef[k] : def;
}
function clSortearEvento(){
  const c = clEstado();
  if(c.evento && c.evento.restantes > 0) return;
  c.evento = null;
  if(c.atendidos < 5) return;                 // los primeros pacientes, sin sobresaltos
  if(c.evRoll === c.atendidos) return;        // un sorteo por paciente, no uno por repintado
  if(c.evUltimo && c.atendidos - c.evUltimo < CL_EVENTO_ESPERA){ c.evRoll = c.atendidos; return; }
  c.evRoll = c.atendidos;
  if(Math.random() > CL_EVENTO_PROB) return;
  const abiertas = clEspecialidadesAbiertas();
  const posibles = CL_EVENTOS.filter(e => !e.ef.esp || abiertas.includes(e.ef.esp));
  if(!posibles.length) return;
  const e = posibles[Math.floor(Math.random() * posibles.length)];
  c.evento = { id:e.id, restantes:CL_EVENTO_DURA };
  c.evUltimo = c.atendidos;
  if(e.ef.esp) c.sala = [];                   // la sala se rehace con lo que trae el evento
  // los sucesos con anécdota llenan la sala de golpe: llegan todos juntos
  if(e.ef.llena){
    // un accidente no pide hora: llegan juntos y fuera de la agenda
    clLlegadaDeGolpe(Math.min(e.ef.llena, clEsperaMax() + 2));
    jxVibrar(40);
  }
  avisar(e.emo + ' ' + e.nom + ' · ' + e.desc);
}
function clGastarEvento(){
  const c = clEstado();
  if(!c.evento) return;
  c.evento.restantes--;
  if(c.evento.restantes <= 0){
    const e = CL_EVENTOS.find(x => x.id === c.evento.id);
    c.evento = null;
    c.sala = [];
    if(e) avisar('Terminó ' + e.nom.toLowerCase() + '. La clínica vuelve a la normalidad.');
  }
}

/* ---------- memoria de cada paciente ---------- */
function clHist(id){ return clEstado().hist[id] || null; }
function clHistCrear(id){
  const c = clEstado();
  if(!c.hist[id]) c.hist[id] = { veces:0, altas:0, recaidas:0, sesiones:0, ultima:0 };
  return c.hist[id];
}
/* El capítulo que toca según cuántas veces vino. Si el arco se acaba,
   cae de vuelta al texto genérico de CL_REGRESO. */
function clCapitulo(casoId, veces){
  const arco = CL_ARCOS[casoId];
  if(arco && veces >= 1 && arco[veces - 1]) return arco[veces - 1];
  return CL_REGRESO[casoId] || 'Vuelve a la clínica.';
}

/* Lo que se le dice al jugador cuando reconoce a alguien que ya atendió. */
function clResumenHist(h){
  if(!h || !h.veces) return '';
  const partes = [];
  partes.push(h.veces === 1 ? 'Ya vino una vez' : 'Ya vino ' + h.veces + ' veces');
  if(h.altas) partes.push(h.altas === 1 ? 'le diste el alta' : 'le diste el alta ' + h.altas + ' veces');
  if(h.altas && h.sesiones) partes.push('en ' + h.sesiones + ' sesiones en total');
  if(h.recaidas) partes.push(h.recaidas === 1 ? 'tuvo una recaída' : 'tuvo ' + h.recaidas + ' recaídas');
  else if(h.altas) partes.push('sin recaídas');
  return partes.join(' · ');
}

/* ============================================================
   LA CONSULTA COMO CONVERSACIÓN
   La anamnesis deja de ser una lista de botones y pasa a ser un chat:
   tú preguntas, el paciente contesta. El rasgo y el ánimo cambian CÓMO
   contesta, no solo qué dice, así que dos pacientes con el mismo cuadro
   se sienten dos personas distintas.
   ============================================================ */

/* ============================================================
   MOTOR DE HABLA
   No es una IA de verdad: es un reescritor. El hallazgo clínico es
   siempre el mismo, pero cada persona lo dice a su manera. Las reglas
   solo tocan palabras de todos los días (mucho, trabajo, auto) y nunca
   términos clínicos, números ni anatomía: el contenido no se toca.
   Ojo con las reglas: van por frase ("el trabajo"), no por palabra suelta,
   porque "trabajo" también es verbo y quedaba "me duele cuando la pega".
   ============================================================ */
const CL_HABLAS = [
  { id:'neutro', nom:'Habla neutra', emo:'🙂', peso:5,
    saludo:['Hola, buenas tardes.', 'Hola, ¿cómo está?'],
    pre:['', '', 'Mire,'], post:['.', '.', '.'],
    sw:[] },
  { id:'pobla', nom:'De población', emo:'🧢', peso:4,
    saludo:['Wena doctora.', 'Ya, buenas.', 'Hola, ¿cómo estamos?'],
    pre:['Ya po,', 'Es que mire,', 'Oiga,', 'Sipo,'],
    post:[' po.', ', cachai.', ', si o no.', ' na que ver.'],
    sw:[[/\bmucho\b/gi,'caleta'], [/\bmuy\b/gi,'súper'], [/\bel trabajo\b/gi,'la pega'],
        [/\bmi trabajo\b/gi,'mi pega'], [/\bdel trabajo\b/gi,'de la pega'], [/\bal trabajo\b/gi,'a la pega'],
        [/\bel auto\b/gi,'el carro'], [/\bnada\b/gi,'na'], [/\bamigo\b/gi,'compadre']] },
  { id:'huaso', nom:'De campo', emo:'🤠', peso:3,
    saludo:['Buenas tardes, patrona.', 'Con permiso, señorita.', 'Buenas, que le vaya bien.'],
    pre:['Fíjese que', 'Le cuento que', 'Mire usted,'],
    post:[', pues.', ', sí señorita.', ' nomás.', ', así es la cosa.'],
    sw:[[/\bmucho\b/gi,'harto'], [/\bel trabajo\b/gi,'la pega'], [/\bel auto\b/gi,'la camioneta'],
        [/\brápido\b/gi,'ligerito'], [/\bpoco\b/gi,'poquito']] },
  { id:'cuico', nom:'Del barrio alto', emo:'🎾', peso:2,
    saludo:['Hola, ¿cómo estái?', 'Hola, qué tal.', 'Buenas, gracias por recibirme.'],
    pre:['O sea,', 'Mira,', 'La verdad es que', 'Te cuento que'],
    post:['.', ', ¿cachái?', ', tipo.', ', o sea.'],
    sw:[[/\bmucho\b/gi,'bastante'], [/\bmuy\b/gi,'demasiado'], [/\bel trabajo\b/gi,'la oficina'],
        [/\bla pega\b/gi,'el trabajo']] },
  { id:'mayor', nom:'De adulto mayor', emo:'👵', peso:3,
    saludo:['Hola, mijita linda.', 'Buenas tardes, doctorcita.', 'Hola, qué amable.'],
    pre:['Le voy a contar,', 'Ay, fíjese que', 'Mire, hijita,'],
    post:[', mijita.', ', ¿ya?', ' nomás, gracias a Dios.', ', qué le digo yo.'],
    sw:[[/\bmucho\b/gi,'harto'], [/\bpoco\b/gi,'poquito'], [/\bcansado\b/gi,'cansadito']] },
  { id:'joven', nom:'De cabro chico', emo:'🎧', peso:3,
    saludo:['Hola, ¿todo bien?', 'Hola, qué tal.', 'Buenaaas.'],
    pre:['O sea,', 'Es como que', 'La wea es que… perdón,'],
    post:[', literal.', ' jaja.', ', o sea.', ', obvio.'],
    sw:[[/\bmucho\b/gi,'caleta'], [/\bmuy\b/gi,'demasiado'], [/\bel trabajo\b/gi,'la pega']] },
  { id:'nortino', nom:'Del norte', emo:'🏜️', peso:2,
    saludo:['Buenas, oiga.', 'Hola, ¿cómo le va?'],
    pre:['Oiga,', 'Le comento que', 'Mire,'],
    post:[', ya.', ' oiga.', ', así nomás.'],
    sw:[[/\bmucho\b/gi,'harto'], [/\bel trabajo\b/gi,'la faena'], [/\ben el trabajo\b/gi,'en la faena']] },
  { id:'sureno', nom:'Del sur', emo:'🌧️', peso:2,
    saludo:['Buenas tardes.', 'Hola, buenas.', 'Con permiso.'],
    pre:['Le cuento que', 'Fíjese que', 'Resulta que'],
    post:[', ¿ve?', ' nomás.', ', así es.'],
    sw:[[/\bmucho\b/gi,'harto'], [/\bpoco\b/gi,'poquito']] },
  { id:'migrante', nom:'De afuera', emo:'🌎', peso:2,
    saludo:['Hola, mi amor, buenas tardes.', 'Buenas tardes, doctora, ¿cómo está?'],
    pre:['Mira,', 'Fíjate que', 'Te cuento que'],
    post:[', ¿verdad?', ', mi amor.', ', ¿sí me entiendes?'],
    sw:[[/\bmucho\b/gi,'demasiado'], [/\bel trabajo\b/gi,'la chamba'], [/\bel auto\b/gi,'el carro']] },
];

/* Cada persona trae algo suyo. Sale conversando, no preguntando por el dolor,
   y es lo que hace que el paciente deje de ser un cuadro clínico. */
const CL_VIDA = {
  familia:['tiene tres hijos y el más chico recién entró al colegio','vive con su mamá, que está delicada',
    'es abuelo hace dos meses y anda con las fotos en el teléfono','se separó hace poco y todavía le cuesta',
    'cría a su sobrina desde que la hermana se fue al norte','vive solo y no le gusta molestar a nadie',
    'tiene una hija en la universidad, la primera de la familia','se casa en marzo y anda con eso en la cabeza'],
  hobby:['juega a la pelota los domingos en la cancha del barrio','canta en el coro de la iglesia',
    'tiene un huerto y le va bien con los tomates','sale a pescar cuando puede',
    'baila cueca y este año compitió','anda en bici hasta la pega todos los días',
    'teje y vende por internet','arregla autos viejos en el patio'],
  dato:['es hincha de Colo-Colo y no lo esconde','trabaja desde los quince años',
    'es el que cocina en la casa','llegó del sur hace veinte años y no volvería',
    'está estudiando de noche para terminar cuarto medio','tiene una perra que se llama Luna',
    'nunca en la vida había ido al kinesiólogo','le tiene miedo a las agujas, lo dice al tiro'],
};
function clGenVida(){
  const al = a2 => a2[Math.floor(Math.random() * a2.length)];
  return { familia: al(CL_VIDA.familia), hobby: al(CL_VIDA.hobby), dato: al(CL_VIDA.dato) };
}

/* Los pacientes de la ficha tienen su habla fija: es parte de quiénes son. */
const CL_HABLA_CANON = {
  huaso:'huaso', minero:'nortino', basquetbol:'joven', carrete:'joven', banderas:'mayor',
  pinzamiento:'pobla', capsulitis:'cuico', manguito:'cuico', epicondilalgia:'pobla',
  tunel:'neutro', dequervain:'neutro', lumbago:'pobla', radiculopatia:'pobla',
  trocanterico:'neutro', lca:'joven', menisco:'pobla', patelofemoral:'cuico',
  aquiles:'neutro', esguince:'joven', fascitis:'pobla', cervicalgia:'neutro',
  epoc:'mayor', acv:'mayor', bronquiolitis:'neutro', neumonia:'sureno', postuci:'neutro',
  parkinson:'mayor', facial:'pobla', artrosis:'pobla', cadera:'mayor', latigazo:'joven',
  epimedial:'pobla', isquios:'pobla', cintilla:'cuico', canillera:'joven',
  cauda:'pobla', tvp:'sureno', compartimental:'joven', cardiaco:'huaso',
  fxestres:'cuico', septica:'mayor', radicervical:'pobla', cubital:'nortino',
  estenosis:'mayor', coxartrosis:'mayor', pubalgia:'joven', rotura:'huaso',
  escafoides:'joven', tibialpost:'pobla', morton:'cuico', vppb:'mayor',
  esclerosis:'neutro', fxvertebral:'mayor',
};

function clHabla(id){ return CL_HABLAS.find(h => h.id === id) || CL_HABLAS[0]; }
function clSortearHabla(){
  const total = CL_HABLAS.reduce((a,h) => a + h.peso, 0);
  let r = Math.random() * total;
  for(const h of CL_HABLAS){ r -= h.peso; if(r <= 0) return h.id; }
  return 'neutro';
}

/* Reescribe una frase en el habla de la persona. Solo cambia el registro:
   los hallazgos, los números y los términos clínicos quedan intactos. */
function clConHabla(hablaId, txt, i){
  const h = clHabla(hablaId);
  if(!h || h.id === 'neutro') return txt;
  let t = txt;
  h.sw.forEach(([re, a]) => { t = t.replace(re, a); });
  // el remate va de vez en cuando, si no cansa
  if(h.post.length && Math.random() < 0.5 && /[.!?]$/.test(t)){
    t = t.replace(/[.]$/, h.post[Math.floor(Math.random() * h.post.length)]);
  }
  // y el arranque solo en la primera frase de la respuesta
  if(i === 0 && h.pre.length && Math.random() < 0.45){
    const pre = h.pre[Math.floor(Math.random() * h.pre.length)];
    if(pre) t = pre + ' ' + t.charAt(0).toLowerCase() + t.slice(1);
  }
  return t;
}

/* Lo primero que dicen al sentarse, según cómo llegan de ánimo. */
const CL_SALUDO = {
  adolorido:   ['Hola… disculpe, ando con dolor desde anoche.', 'Casi no dormí, la verdad.'],
  esperanzado: ['¡Hola! Qué bueno que me pudo atender.', 'A ver si por fin le achuntamos a esto.'],
  desconfiado: ['Buenas.', 'Le aviso al tiro: ya fui a otros dos y no me resultó nada.'],
  agradecido:  ['¡Hola! Me mandó una amiga que quedó feliz acá.', 'Vengo con toda la fe.'],
  apurado:     ['Hola, disculpe, dejé el auto en doble fila.', '¿Nos demoramos mucho?'],
  asustado:    ['Hola…', 'Le voy a ser sincero: tengo miedo de que sea algo grave.'],
};

/* Cómo remata cada respuesta según la personalidad. `null` = no agrega nada. */
const CL_MULETILLA = {
  ansioso:    ['¿Eso es normal?', 'Pero eso no es grave, ¿cierto?', 'Perdón que pregunte tanto.'],
  minimiza:   ['Pero tampoco es para tanto.', 'Igual uno se acostumbra.', 'No sé si valga la pena contarlo.'],
  informado:  ['Yo estuve leyendo y puede ser algo del nervio.', 'Vi un video que decía otra cosa.', '¿No habría que hacer una resonancia?'],
  cumplidor:  ['Lo tengo anotado, si quiere se lo muestro.', 'Hice todo lo que me dijeron la vez pasada.'],
  porfiado:   ['Aunque a mí me dijeron otra cosa.', 'Yo lo hago a mi manera igual.', 'Mi cuñado dice que es de la columna.'],
  impaciente: ['¿Y cuánto me va a tomar esto?', 'Yo necesito volver a entrenar esta semana.', '¿No hay algo más rápido?'],
  conversador:['…y eso me pasó justo cuando estábamos con mi señora en Pichilemu, le contaba.', 'Perdón, me fui por las ramas.'],
  estoico:    ['Pero uno aguanta nomás.', 'Nunca he faltado al trabajo por esto.'],
};

/* Cómo se anuncia cada examen: se escribe como nota clínica, no como chat. */
const CL_VOZ_EXAM = {
  insp:   'Lo miras con calma',
  palp:   'Palpas la zona',
  activo: 'Le pides que mueva',
  pasivo: 'Mueves tú el segmento',
  fuerza: 'Evalúas la fuerza',
  neuro:  'Haces el tamizaje neurológico',
  imgRx:  'Pides una radiografía',
  imgEco: 'Pides una ecografía',
};

function clHora(){
  const d = new Date();
  return String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
}

/* Arma la respuesta del paciente: el hallazgo, dicho por él, con su tono. */
function clVozPaciente(t, txt){
  const habla = t.ficha && t.ficha.habla;
  const msgs = [clConHabla(habla, txt, 0)];
  const r = t.ficha && t.ficha.rasgo;
  const m = CL_MULETILLA[r];
  // no en todas: si rematara siempre, cansa
  if(m && Math.random() < 0.55) msgs.push(clConHabla(habla, m[Math.floor(Math.random() * m.length)], 1));
  return msgs;
}

function clDecir(t, de, txt, extra){
  t.chat.push(Object.assign({ de, txt, hora: clHora() }, extra || {}));
}

/* ---------- generador de personas ----------
   Los cuadros clínicos con nombre propio (Ramón, Rosa, Marcela) se
   reservan para cuando VUELVEN: esos tienen historia, arco y notas.
   El resto de las veces llega otra persona con el mismo cuadro. */
const CL_FEM = ['capsulitis','manguito','dequervain','trocanterico','lca','patelofemoral','fascitis',
  'cervicalgia','acv','bronquiolitis','postuci','facial','artrosis','cadera','cintilla','tvp','fxestres',
  'coxartrosis','tibialpost','morton','vppb','esclerosis','fxvertebral'];

function clGenPersona(caso){
  const al = a => a[Math.floor(Math.random() * a.length)];
  const fem = CL_FEM.indexOf(caso.id) !== -1;
  const nom = al(fem ? CL_NOM_F : CL_NOM_M) + ' ' + al(CL_APELLIDOS);
  let edad = caso.edad, edadTxt = caso.edadTxt || null;
  if(!edadTxt){
    const r = caso.edad >= 60 ? 9 : caso.edad <= 22 ? 4 : 7;
    edad = Math.max(15, caso.edad + Math.floor(Math.random() * (r * 2 + 1)) - r);
  }
  const ocups = [caso.ocup].concat(CL_OCUPS[caso.id] || []);
  return { nom, edad, edadTxt, ocup: al(ocups), comuna: al(CL_COMUNAS), fem };
}

/* Datos que se muestran: los del generado si lo hay, si no los de la ficha. */
function clPacNom(caso, ficha){ return (ficha && ficha.gen) ? ficha.gen.nom : caso.pac; }
function clPacOcup(caso, ficha){ return (ficha && ficha.gen) ? ficha.gen.ocup : caso.ocup; }
function clPacEdad(caso, ficha){
  if(ficha && ficha.gen) return ficha.gen.edadTxt || (ficha.gen.edad + ' años');
  return clEdad(caso);
}
/* Solo el paciente de la ficha acumula historia, arco y notas: los
   generados son otra persona, no "el mismo que volvió". */
function clEsCanon(ficha){ return !(ficha && ficha.gen); }

/* ---------- personalidad ---------- */
function clRasgo(id){ return CL_RASGOS.find(r => r.id === id) || null; }
function clAnimo(id){ return CL_ANIMOS.find(a => a.id === id) || null; }
function clEfRasgo(rasgoId, k, def){
  const r = clRasgo(rasgoId);
  return r && r.ef[k] !== undefined ? r.ef[k] : def;
}

/* ---------- sala de espera ---------- */
function clFichaEspera(caso){
  const al = a => a[Math.floor(Math.random() * a.length)];
  // los muy chicos y los muy grandes casi siempre llegan acompañados
  const probAcomp = (caso.edad <= 15 || caso.edad >= 70) ? 0.85 : 0.28;
  // en los cuadros persistentes lo psicosocial pesa más y aparece más seguido
  const probAmarilla = caso.fase === 'crónica' ? CL_AMARILLA_PROB + 0.2 : CL_AMARILLA_PROB;
  // el paciente de la ficha vuelve seguido si ya le diste el alta; si no,
  // casi siempre llega otra persona distinta con el mismo cuadro
  const h = clHist(caso.id);
  const canon = (h && h.altas > 0) ? Math.random() < 0.5 : Math.random() < 0.22;
  return {
    id: caso.id,
    llegada: Date.now(),
    gen: canon ? null : clGenPersona(caso),
    prev: al(CL_PREVISION),
    deriv: clSortearDerivador(),
    origen: al(CL_ORIGEN),
    espera: al(CL_ESPERA_FRASE),
    habla: canon ? (CL_HABLA_CANON[caso.id] || 'neutro') : clSortearHabla(),
    vida: clGenVida(),
    rasgo: al(CL_RASGOS).id,
    animo: al(CL_ANIMOS).id,
    acomp: Math.random() < probAcomp ? al(CL_ACOMP) : null,
    amarilla: Math.random() < probAmarilla ? al(CL_AMARILLAS).id : null,
  };
}
/* Llega quien tenía hora, cuando le toca y si hay espacio en la sala.
   Ya no se llena de golpe hasta el tope. */
function clLlenarSala(){
  const c = clEstado(), ag = clAgenda();
  if(!Array.isArray(c.sala)) c.sala = [];
  const tope = clEsperaMax();
  let llegaron = 0;
  ag.citas.forEach(cita => {
    if(cita.llego || cita.min > ag.reloj) return;
    if(c.sala.length >= tope) return;            // sala llena: espera su turno afuera
    const caso = clSiguienteCaso(c.sala.map(x => x.id));
    if(!caso) return;
    const f = clFichaEspera(caso);
    f.hora = cita.min;
    c.sala.push(f);
    cita.llego = true;
    llegaron++;
  });
  return llegaron;
}
/* Mete gente de golpe saltándose la agenda: accidentes y catástrofes. */
function clLlegadaDeGolpe(n){
  const c = clEstado();
  let v = 0;
  while(c.sala.length < n && v++ < 40){
    const caso = clSiguienteCaso(c.sala.map(x => x.id));
    if(!caso) break;
    c.sala.push(clFichaEspera(caso));
  }
}
/* ---------- la jornada, con horario ----------
   El problema no era solo cuánta gente llegaba: era que el día no
   terminaba nunca. Ahora la clínica tiene horario. Abre a las 9, cierra
   a las 18, y cada paciente viene con hora dada. El reloj corre mientras
   estás en la sala (no mientras atiendes, para no apurarla) y cada
   consulta consume su rato. Cuando dan las 18 se acabó: no llega nadie
   más y hay que cerrar el día. */
const CL_HORA_ABRE = 9 * 60;        // 09:00
const CL_HORA_CIERRA = 18 * 60;     // 18:00
const CL_AGENDA_DIA = 10;           // horas dadas por jornada
const CL_MIN_POR_SEG = 0.75;        // minutos de reloj por segundo real en la sala
const CL_MIN_POR_CONSULTA = 30;     // lo que consume atender a alguien

function clHoraTxt(min){
  const h = Math.floor(min / 60), m = Math.floor(min % 60);
  return String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0');
}
/* Las horas del día, repartidas parejo y con algo de desorden. */
function clArmarCitas(){
  const libre = CL_HORA_CIERRA - CL_HORA_ABRE - 40;
  const paso = libre / CL_AGENDA_DIA;
  const citas = [];
  for(let i = 0; i < CL_AGENDA_DIA; i++){
    const base = CL_HORA_ABRE + 10 + Math.round(i * paso);
    const desorden = Math.round((Math.random() - 0.5) * paso * 0.5);
    citas.push({ min: Math.max(CL_HORA_ABRE, Math.min(CL_HORA_CIERRA - 15, base + desorden)), llego:false });
  }
  citas.sort((a,b) => a.min - b.min);
  return citas;
}
function clAgenda(){
  const c = clEstado();
  const a = c.agenda;
  if(!a || typeof a !== 'object' || !Array.isArray(a.citas) || typeof a.reloj !== 'number'){
    c.agenda = { dia:1, reloj:CL_HORA_ABRE, citas:clArmarCitas(), t:Date.now(), atendidos:0 };
  }
  return c.agenda;
}
function clCerrada(){ return clAgenda().reloj >= CL_HORA_CIERRA; }
/* El reloj corre solo en la sala: no mientras está con un paciente. */
function clAvanzarReloj(){
  const ag = clAgenda();
  const ahora = Date.now();
  if(!ag.t || ag.t > ahora) ag.t = ahora;
  const seg = (ahora - ag.t) / 1000;
  ag.t = ahora;
  if(clTurno || clSesionAbierta !== null) return;
  if(ag.reloj < CL_HORA_CIERRA) ag.reloj = Math.min(CL_HORA_CIERRA, ag.reloj + seg * CL_MIN_POR_SEG);
}
function clConsumirConsulta(){
  const ag = clAgenda();
  ag.reloj = Math.min(CL_HORA_CIERRA, ag.reloj + CL_MIN_POR_CONSULTA);
  ag.atendidos = (ag.atendidos || 0) + 1;
}
function clProxCita(){
  const ag = clAgenda();
  const p = ag.citas.filter(x => !x.llego).sort((a,b) => a.min - b.min)[0];
  return p ? p.min : null;
}
function clJornadaTerminada(){ return clCerrada() && !clTurno; }
function clNuevaJornada(){
  const c = clEstado(), ag = clAgenda();
  c.sala.length = 0;                 // los que quedaron esperando se reagendan
  ag.dia = (ag.dia || 1) + 1;
  ag.reloj = CL_HORA_ABRE;
  ag.citas = clArmarCitas();
  ag.t = Date.now();
  ag.atendidos = 0;
  jxSonido('gana'); jxVibrar(20);
  clGuardar(true);
  clPanel();
}

function clJornada(){
  const c = clEstado(), ag = clAgenda();
  if(c.noche) return { dia: ag.dia, nom:'turno de noche', emo:'🌙' };
  const tarde = ag.reloj >= 13 * 60;
  return { dia: ag.dia, nom: tarde ? 'jornada de la tarde' : 'jornada de la mañana', emo: tarde ? '🌇' : '🌤️' };
}

/* ---------- derivadores ---------- */
function clDerivador(id){ return CL_DERIVADORES.find(d => d.id === id) || CL_DERIVADORES[0]; }
/* Elige quién manda al paciente, con peso por la confianza que te tienen. */
function clSortearDerivador(){
  const c = clEstado();
  const pesos = CL_DERIVADORES.map(d => 5 + (c.deriv[d.id] ? c.deriv[d.id].conf : 50));
  const total = pesos.reduce((a2,b2) => a2+b2, 0);
  let r = Math.random() * total;
  for(let i = 0; i < CL_DERIVADORES.length; i++){
    r -= pesos[i];
    if(r <= 0) return CL_DERIVADORES[i].id;
  }
  return CL_DERIVADORES[0].id;
}
function clMoverConfianza(id, n){
  const c = clEstado();
  if(!id || !c.deriv[id]) return;
  c.deriv[id].conf = Math.max(0, Math.min(100, c.deriv[id].conf + n));
}

/* ---------- semana temática ----------
   Rota por semana ISO, así que a los dos les toca la misma zona. */
function clSemanaN(){
  const d = new Date();
  const ini = new Date(d.getFullYear(), 0, 1);
  return Math.floor(((d - ini) / 86400000 + ini.getDay()) / 7);
}
function clTemaSemana(){ return CL_TEMAS[clSemanaN() % CL_TEMAS.length]; }
function clEsTema(caso){ return caso && caso.zona === clTemaSemana(); }

/* ---------- la gente se aburre de esperar ----------
   Con la sala de hasta doce, tomarlos con calma uno por uno ya no va:
   hay que decidir a quién atiendes primero. */
function clEsperaMin(f){
  return Math.floor((Date.now() - (f.llegada || Date.now())) / 60000);
}
function clRevisarPaciencia(){
  const c = clEstado();
  const ahora = Date.now();
  const antes = c.sala.length;
  const idos = [];
  for(let i = c.sala.length - 1; i >= 0; i--){
    const f = c.sala[i];
    if(!f.llegada) { f.llegada = ahora; continue; }
    if(ahora - f.llegada < CL_PACIENCIA) continue;
    const k = KIN_CASOS.find(x => x.id === f.id);
    idos.push(k ? clPacNom(k, f).split(' ')[0] : 'alguien');
    c.sala.splice(i, 1);
  }
  if(idos.length){
    c.reputacion = Math.max(0, c.reputacion - idos.length);
    avisar('🚪 Se cansaron de esperar y se fueron: ' + idos.join(', ') + '. −' + idos.length + ' de reputación.');
  }
  return antes - c.sala.length;
}

/* ---------- resumen semanal ---------- */
function clSemanaEstado(){
  const c = clEstado();
  if(!c.semana || typeof c.semana !== 'object') c.semana = null;
  const n = clSemanaN();
  if(!c.semana || c.semana.n !== n){
    const previa = c.semana;
    c.semana = { n, atendidos:0, aciertos:0, altas:0, derivados:0, puntos:0, previa: previa || null, vista:false };
  }
  return c.semana;
}
function clSumarSemana(campo, n){
  const w = clSemanaEstado();
  w[campo] = (w[campo] || 0) + (n || 1);
}

/* ---------- urgencias con reloj ----------
   Llega una ambulancia con un caso que hay que resolver antes de que
   se acabe el tiempo. Si expira, se lo llevan a otra parte y duele. */
function clCasosUrgentes(){
  const abiertas = clEspecialidadesAbiertas();
  return KIN_CASOS.filter(c => c.urgente && abiertas.includes(c.esp));
}
function clSortearUrgencia(){
  const c = clEstado();
  if(c.urgencia || c.noche || clTurno) return;
  if(c.atendidos < 8) return;
  if(c.urRoll === c.atendidos) return;
  c.urRoll = c.atendidos;
  if(Math.random() > CL_URGENCIA_PROB) return;
  const pool = clCasosUrgentes();
  if(!pool.length) return;
  const caso = pool[Math.floor(Math.random() * pool.length)];
  const ficha = clFichaEspera(caso);
  ficha.origen = 'llegó en ambulancia';
  ficha.espera = 'lo están estabilizando';
  c.urgencia = Object.assign(ficha, { hasta: Date.now() + CL_URGENCIA_SEG * 1000 });
  jxSonido('mal'); jxVibrar(40);
  avisar('🚨 ¡Urgencia! Llegó ' + clPacNom(caso, c.urgencia) + ' en ambulancia. Tienes poco tiempo.');
}
function clSegUrgencia(){
  const c = clEstado();
  if(!c.urgencia) return 0;
  return Math.max(0, Math.ceil((c.urgencia.hasta - Date.now()) / 1000));
}
function clVencerUrgencia(){
  const c = clEstado();
  if(!c.urgencia || clSegUrgencia() > 0) return false;
  const ficha = c.urgencia;
  const caso = KIN_CASOS.find(x => x.id === ficha.id);
  c.urgencia = null;
  c.reputacion = Math.max(0, c.reputacion - 5);
  c.racha = 0;
  jxSonido('mal'); jxVibrar(60);
  avisar('🚑 Se llevaron a ' + (caso ? clPacNom(caso, ficha) : 'el paciente') + ' a otra clínica. −5 de reputación.');
  return true;
}

/* ---------- turno de noche ----------
   Pacientes seguidos, sin elegir, con menos tiempo y mejor pago.
   No quedan en tratamiento: se resuelven y salen. */
function clNocheDisponible(){
  const c = clEstado();
  return c.reputacion >= CL_NOCHE_REP && !c.noche && !clTurno;
}
function clEmpezarNoche(){
  const c = clEstado();
  if(!clNocheDisponible()) return;
  c.noche = { quedan: CL_NOCHE_LARGO, aciertos:0, plata:0, total:CL_NOCHE_LARGO };
  c.urgencia = null;
  jxSonido('gana'); jxVibrar(25);
  avisar('🌙 Turno de noche: ' + CL_NOCHE_LARGO + ' pacientes seguidos, sin elegir y con menos tiempo.');
  clIniciarCaso();
}
function clCasoDeNoche(){
  const abiertas = clEspecialidadesAbiertas();
  const pool = KIN_CASOS.filter(x => abiertas.includes(x.esp));
  const urg = pool.filter(x => x.urgente || x.derivar);
  // de noche llegan más cuadros complicados, pero no solo esos
  if(urg.length && Math.random() < 0.45) return urg[Math.floor(Math.random() * urg.length)];
  return pool[Math.floor(Math.random() * pool.length)];
}
function clCerrarNoche(){
  const c = clEstado();
  const n = c.noche;
  if(!n) return;
  c.noche = null;
  const record = n.aciertos > (c.nocheMejor || 0);
  if(record) c.nocheMejor = n.aciertos;
  const r = jxRecompensar(6 + n.aciertos * 3, 30 + n.aciertos * 8, { desde:document.getElementById('jxScreenClinica') });
  clGuardar(true);
  jxCelebrar({
    titulo: record ? '¡Mejor turno hasta ahora! 🌙' : 'Fin del turno de noche 🌙',
    sub: n.aciertos + ' de ' + n.total + ' resueltos bien · ' + clPlata(n.plata) + ' en caja' +
         (record ? ' · nuevo récord' : ' · tu récord es ' + c.nocheMejor),
    monedas: 6 + n.aciertos * 3, xp: 30 + n.aciertos * 8,
    subioNivel:r.subioNivel, nivel:r.nivel, textoNext:'Volver a la clínica',
    onNext:()=>{ clVista='recepcion'; clSesionAbierta=null; clPanel(); },
  });
}

/* ---------- misiones del día ---------- */
const CL_MISIONES = [
  { id:'zonaHombro', nom:'Tres de hombro',        desc:'Atiende 3 pacientes que consulten por hombro', meta:3, premio:15, zona:'Hombro' },
  { id:'zonaRodilla',nom:'Tres de rodilla',       desc:'Atiende 3 pacientes que consulten por rodilla', meta:3, premio:15, zona:'Rodilla' },
  { id:'zonaLumbar', nom:'Tres de lumbar',        desc:'Atiende 3 pacientes que consulten por lumbar',  meta:3, premio:15, zona:'Lumbar' },
  { id:'altaLimpia', nom:'Alta sin recaídas',     desc:'Lleva a un paciente al alta sin ninguna recaída', meta:1, premio:20, tipo:'alta' },
  { id:'perfectos',  nom:'Tres seguidos',         desc:'Acierta 3 diagnósticos seguidos sin errores',   meta:3, premio:25, tipo:'racha' },
  { id:'sinImagen',  nom:'Ojo clínico',           desc:'Cierra 2 casos perfectos sin pedir imágenes',   meta:2, premio:20, tipo:'sinImg' },
  { id:'derivar',    nom:'Saber parar',           desc:'Deriva correctamente 1 caso con banderas rojas', meta:1, premio:25, tipo:'derivar' },
  { id:'atender',    nom:'Jornada completa',      desc:'Atiende 5 pacientes hoy',                       meta:5, premio:15, tipo:'atender' },
  { id:'sesiones',   nom:'Constancia',            desc:'Haz 6 sesiones de tratamiento',                 meta:6, premio:15, tipo:'sesion' },
];

function clMisiones(){
  const c = clEstado();
  const hoy = jxHoyClave();
  if(c.misiones.dia !== hoy){
    const mezcla = clMezclar(CL_MISIONES).slice(0, 3);
    c.misiones = { dia:hoy, lista: mezcla.map(m => ({ id:m.id, n:0, cobrada:false })) };
  }
  return c.misiones.lista;
}
function clMisionDef(id){ return CL_MISIONES.find(m => m.id === id); }
/* Suma avance a las misiones que calcen. `datos` trae zona, tipo, etc. */
function clAvanzarMision(tipo, info){
  const lista = clMisiones();
  let algo = false;
  lista.forEach(ms => {
    const d = clMisionDef(ms.id);
    if(!d || ms.cobrada || ms.n >= d.meta) return;
    let calza = false;
    if(d.zona && tipo === 'atender' && info && info.zona === d.zona) calza = true;
    else if(d.tipo === tipo) calza = true;
    if(!calza) return;
    ms.n = Math.min(d.meta, ms.n + (info && info.n ? info.n : 1));
    if(ms.n >= d.meta) algo = true;
  });
  if(algo) avisar('🎯 Completaste una misión del día. Pasa a cobrarla.');
}
function clCobrarMision(id){
  const c = clEstado();
  const ms = clMisiones().find(x => x.id === id);
  const d = clMisionDef(id);
  if(!ms || !d || ms.cobrada || ms.n < d.meta) return;
  ms.cobrada = true;
  const r = jxRecompensar(d.premio, d.premio * 2, { desde:document.getElementById('jxScreenClinica') });
  c.reputacion += 1;
  jxSonido('gana'); jxVibrar(20);
  clGuardar(true);
  avisar('🎯 ' + d.nom + ' · +' + d.premio + ' monedas y +1 reputación');
  clPanel();
}

/* ---------- economía ---------- */
/* Una especialidad se abre con reputación Y con el examen aprobado.
   La reputación puede bajar, así que una especialidad también se cierra. */
function clEspecialidadesAbiertas(){
  const c = clEstado();
  return Object.keys(CL_ESPECIALIDADES).filter(k =>
    c.reputacion >= CL_ESPECIALIDADES[k].rep && c.acred.includes(k));
}
function clEspecialidadConRep(){
  const c = clEstado();
  return Object.keys(CL_ESPECIALIDADES).filter(k => c.reputacion >= CL_ESPECIALIDADES[k].rep);
}
function clTieneEquipo(id){ return clEstado().equipos.includes(id); }
function clSalas(){
  let n = 1;
  CL_EQUIPOS.forEach(e => { if(e.ef.salas && clTieneEquipo(e.id)) n += e.ef.salas; });
  return n;
}
function clMultPago(){
  let x = 1;
  CL_EQUIPOS.forEach(e => { if(e.ef.pago && clTieneEquipo(e.id)) x += e.ef.pago; });
  return x;
}
function clRepExtra(){
  let n = 0;
  CL_EQUIPOS.forEach(e => { if(e.ef.rep && clTieneEquipo(e.id)) n += e.ef.rep; });
  return n;
}
/* ============================================================
   CASO DEL DÍA
   Un paciente al día, el MISMO para los dos: se sortea desde la fecha,
   así que no depende de quién ni de qué dispositivo. Una sola pasada,
   sin reintentos, y una racha que se corta si fallas o si no entras.
   ============================================================ */
function clRngDia(fecha){
  const s = String(fecha).replace(/[^0-9]/g, '');
  let h = 2166136261;
  for(let i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  let x = (h >>> 0) || 1;
  return () => {
    x ^= x << 13; x >>>= 0;
    x ^= x >> 17;
    x ^= x << 5;  x >>>= 0;
    return x / 4294967296;
  };
}

/* La ficha del día también es determinista: mismo rasgo, mismo ánimo y
   misma bandera amarilla para los dos, si no el marcador no se compara. */
function clFichaDia(fecha){
  const r = clRngDia(fecha);
  const el = a => a[Math.floor(r() * a.length)];
  const caso = el(KIN_CASOS);
  return {
    id: caso.id,
    prev: el(CL_PREVISION),
    origen: el(CL_ORIGEN),
    espera: el(CL_ESPERA_FRASE),
    habla: CL_HABLA_CANON[caso.id] || 'neutro',
    vida: { familia: el(CL_VIDA.familia), hobby: el(CL_VIDA.hobby), dato: el(CL_VIDA.dato) },
    rasgo: el(CL_RASGOS).id,
    animo: el(CL_ANIMOS).id,
    acomp: r() < 0.35 ? el(CL_ACOMP) : null,
    amarilla: r() < 0.5 ? el(CL_AMARILLAS).id : null,
  };
}

function clDiarioHecho(){
  const c = clEstado();
  return c.diario.fecha === jxHoyClave();
}

/* Quién está jugando en ESTE aparato. Va en localStorage, no en el estado
   compartido: el marcador es de los dos, pero cada teléfono sabe quién es. */
function clQuien(){
  try{ return localStorage.getItem('rinconQuien') || null; }catch(e){ return null; }
}
function clFijarQuien(q){
  try{ localStorage.setItem('rinconQuien', q); }catch(e){}
  clPanel();
}

function clEmpezarDiario(){
  const c = clEstado();
  if(clDiarioHecho() || clTurno) return;
  const hoy = jxHoyClave();
  const ficha = clFichaDia(hoy);
  const caso = KIN_CASOS.find(x => x.id === ficha.id);
  if(!caso) return;

  let { lista, dif } = clAccionesDe(caso);
  if(ficha.acomp) lista.push({ id:'acomp', g:'anam', n:'Preguntarle a ' + ficha.acomp.nom, t:1 });
  const conf = {}; dif.forEach(d => conf[d] = 0);
  const tot = clTiempoTotal(ficha.rasgo);
  clTurno = {
    caso, ficha, acciones:lista, dif, conf, creencia:null,
    hechas:[], pistas:[], imagenes:0, notas:{}, chat:[],
    tiempo: tot, tiempoMax: tot,
    fase:'investigar', errores:0, grupo:'anam',
    hist: clHist(caso.id) ? Object.assign({}, clHist(caso.id)) : null,
    noche:false, urgente:false,
    diario:true,                       // sin reintentos y con puntaje
    amarillaVista: clTieneHabil('psico'),
    amarilla: clTieneHabil('psico') ? ficha.amarilla : null,
  };
  clAbrirConversacion(clTurno);
  jxSonido('tap');
  clVista = 'recepcion'; clSesionAbierta = null;
  clPanel();
}

/* Puntaje sobre 100: razonar bien pesa más que acertar. */
function clPuntajeDiario(t){
  const cuad = t.correccion || clLecturaHallazgos(t);
  const razon = Math.round(cuad.pct * 0.4);
  const dx = t.dxFallado ? 0 : 30;
  const tto = t.ttoFallado ? 0 : 20;
  const tiempo = Math.round(Math.min(1, (t.tiempo || 0) / (t.tiempoMax || 1)) * 10);
  return { razon, dx, tto, tiempo, total: razon + dx + tto + tiempo, cuad };
}

function clCerrarDiario(){
  const t = clTurno, c = clEstado();
  const hoy = jxHoyClave();
  const p = clPuntajeDiario(t);
  const ayer = new Date(Date.now() - 86400000);
  const claveAyer = ayer.getFullYear() + '-' + String(ayer.getMonth()+1).padStart(2,'0') + '-' + String(ayer.getDate()).padStart(2,'0');

  // la racha sigue si ayer jugaste y hoy aprobaste
  if(p.total >= 50) c.diario.racha = (c.diario.fecha === claveAyer ? c.diario.racha : 0) + 1;
  else c.diario.racha = 0;
  if(c.diario.racha > c.diario.mejorRacha) c.diario.mejorRacha = c.diario.racha;
  c.diario.fecha = hoy;
  c.diario.puntaje = p.total;
  c.diario.jugados++;
  c.pxHabil++;                                   // el caso del día siempre da un punto

  const quien = clQuien();
  if(quien) c.diarioComp[quien] = { fecha:hoy, puntaje:p.total, racha:c.diario.racha, caso:t.caso.id };

  const monedas = Math.round(p.total / 5);
  const r = jxRecompensar(monedas, clXp(p.total), { desde:document.getElementById('jxScreenClinica') });
  clTurno = null;
  clGuardar(true);
  jxCelebrar({
    titulo: p.total >= 85 ? '¡Caso del día impecable! 🌟' : p.total >= 50 ? 'Caso del día resuelto' : 'Caso del día, con tropiezos',
    sub: p.total + '/100 · razonamiento ' + p.razon + '/40 · diagnóstico ' + p.dx + '/30 · tratamiento ' + p.tto + '/20 · tiempo ' + p.tiempo + '/10' +
         (c.diario.racha ? ' · 🔥 racha de ' + c.diario.racha + (c.diario.racha === 1 ? ' día' : ' días') : ' · se te cortó la racha'),
    monedas, xp:clXp(p.total), subioNivel:r.subioNivel, nivel:r.nivel,
    textoNext:'Ver el marcador',
    onNext:()=>{ clVista='recepcion'; clSesionAbierta=null; clPanel(); },
  });
}

/* ---------- habilidades ---------- */
function clTieneHabil(id){ return clEstado().habil.indexOf(id) !== -1; }
function clXp(n){ return Math.round(n * (clTieneHabil('docente') ? 1.34 : 1)); }
function clComprarHabil(id){
  const c = clEstado();
  const h = CL_HABILIDADES.find(x => x.id === id);
  if(!h || clTieneHabil(id) || c.pxHabil < h.costo){ jxSonido('mal'); return; }
  c.pxHabil -= h.costo;
  c.habil.push(id);
  jxSonido('compra'); jxVibrar(20);
  clGuardar(true);
  avisar(h.emo + ' ' + h.nom + ' · ' + h.desc);
  clPanel();
}

/* ---------- notas escondidas ----------
   Un mensaje pegado a un caso: le aparece al OTRO cuando le toque ese
   paciente. La gracia es que no sabes cuándo va a salir. */
function clNotaDeOtro(casoId){
  const c = clEstado();
  const n = c.notasCaso[casoId];
  if(!n || !n.texto) return null;
  const yo = clQuien();
  if(yo && n.de === yo) return null;      // la tuya no te la muestro
  return n;
}
function clGuardarNota(casoId, texto){
  const c = clEstado();
  const yo = clQuien() || 'Alguien';
  if(!texto || !texto.trim()){ delete c.notasCaso[casoId]; }
  else c.notasCaso[casoId] = { texto: texto.trim().slice(0, 240), de: yo, fecha: Date.now() };
  clGuardar(true);
  jxSonido('bien');
  clPanel();
}

/* ---------- casos que se te fueron ---------- */
function clAnotarFallo(casoId, motivo){
  const c = clEstado();
  const f = c.fallidos[casoId] || (c.fallidos[casoId] = { veces:0, motivo:'', cuando:0 });
  f.veces++; f.motivo = motivo; f.cuando = Date.now();
}
function clSaldarFallo(casoId){
  const c = clEstado();
  if(c.fallidos[casoId]){ delete c.fallidos[casoId]; return true; }
  return false;
}

/* ---------- sedes ---------- */
function clSede(){ const c = clEstado(); return CL_SEDES[Math.min(c.sede || 0, CL_SEDES.length - 1)]; }
function clMultSede(){ return 1 + CL_SEDE_PAGO * (clEstado().sede || 0); }
function clSedeSiguiente(){ const c = clEstado(); return CL_SEDES[(c.sede || 0) + 1] || null; }
function clSedeCosto(){ return Math.round(CL_SEDE_COSTO * Math.pow(2.2, clEstado().sede || 0)); }
function clSedeRep(){ return CL_SEDE_REP + 25 * (clEstado().sede || 0); }
function clPuedeAbrirSede(){
  const c = clEstado();
  return !!clSedeSiguiente() && c.reputacion >= clSedeRep() && c.dinero >= clSedeCosto() && !clTurno && !c.noche;
}

/* Se parte de cero en el negocio, pero el conocimiento se conserva. */
function clAbrirSede(){
  const c = clEstado();
  if(!clPuedeAbrirSede()) return;
  const nueva = clSedeSiguiente();
  const anterior = clSede();
  c.fundadas.push(anterior.nom);
  c.sede++;
  // el negocio vuelve a empezar
  c.dinero = 0; c.reputacion = 0; c.equipos = []; c.personal = [];
  c.salas = 1; c.sala = []; c.activos = []; c.evento = null; c.evRoll = -1;
  c.urgencia = null; c.urRoll = -1; c.noche = null; c.racha = 0; c.rojo = 0;
  c.acred = ['trauma'];
  c.t = Date.now();
  // lo aprendido se queda: dominados, hist, examen, récords y misiones
  jxSonido('gana'); jxVibrar(40);
  const r = jxRecompensar(40, 150, { desde:document.getElementById('jxScreenClinica') });
  clGuardar(true);
  c3Destruir();
  jxCelebrar({
    titulo:'Abriste la sede de ' + nueva.nom + ' ' + nueva.emo,
    sub:'Dejaste andando ' + anterior.nom + ' y partes de nuevo acá: sin plata, sin equipo y sin reputación. ' +
        'Te llevas el álbum, los pacientes que ya conoces y tus récords. ' +
        'Desde ahora todo paga ' + Math.round(clMultSede() * 100) + '% y los casos vienen más difíciles.',
    monedas:40, xp:150, subioNivel:r.subioNivel, nivel:r.nivel,
    textoNext:'Empezar en ' + nueva.nom,
    onNext:()=>{ clVista='recepcion'; clSesionAbierta=null; clMostrar(); },
  });
}

/* Efectos de la segunda tanda de equipamiento. */
function clTiempoEquipo(){
  let n = 0;
  CL_EQUIPOS.forEach(e => { if(e.ef.tiempo && clTieneEquipo(e.id)) n += e.ef.tiempo; });
  return n;
}
/* Chica a propósito: con la sala repleta se agobia y deja de ser una
   consulta. Con horario, además, no hace falta que sea grande. */
function clEsperaMax(){
  let n = CL_ESPERA_MAX;
  CL_EQUIPOS.forEach(e => { if(e.ef.espera && clTieneEquipo(e.id)) n += 1; });
  return Math.min(4, n);
}
function clImgGratis(){
  return clTieneHabil('imagen') || CL_EQUIPOS.some(e => e.ef.img && clTieneEquipo(e.id));
}

/* Lo que paga un paciente atendido a mano: el equipamiento, el evento del día
   y el bono permanente de las sedes que llevas abiertas.
   La renta pasiva del equipo NO se toca, para que un evento no dispare el idle. */
function clMultPagoCaso(){ return clMultPago() * clEfEvento('pago', 1) * clMultSede(); }
/* Economía 2.0 (nov-2026): antes cada contratado rentaba 2,35 veces más que
   el anterior y la caja llegó a decenas de miles de millones, así que la
   plata dejó de significar algo. Ahora la renta crece de a poco, el costo
   sube más rápido y cada box da para dos kinesiólogos. */
function clCostoKine(){
  const c = clEstado();
  return Math.ceil(2500 * Math.pow(1.85, c.personal.length));
}
function clRentaKine(i){ return Math.round((3 + 2.2 * i) * 10) / 10; }
function clTopeKine(){ return clSalas() * 2; }
/* Cada kinesiólogo atiende pacientes de rutina por su cuenta. */
function clIngresoPorSegundo(){
  const c = clEstado();
  let s = 0;
  c.personal.forEach(p => { s += p.renta; });
  return s * clMultPago();
}
/* Lo que sale todos los segundos: arriendo del local más sueldos.
   Sin nadie contratado la clínica no tiene costos: eres tú en tu box. */
function clGastoPorSegundo(){
  const c = clEstado();
  if(!c.personal.length) return 0;
  let g = CL_ARRIENDO_BASE + CL_ARRIENDO_SALA * clSalas();
  c.personal.forEach(p => { g += p.renta * CL_SUELDO_PROP; });
  if(clTieneHabil('gestion')) g *= 0.75;
  return g;
}
function clNetoPorSegundo(){ return clIngresoPorSegundo() - clGastoPorSegundo(); }

function clAsentar(){
  const c = clEstado();
  const ahora = Date.now();
  if(!c.t || c.t > ahora) c.t = ahora;
  let ms = ahora - c.t;
  if(ms <= 0){ c.t = ahora; return 0; }
  let tasa = 1;
  if(ms > 60000){ ms = Math.min(ms, CL_TOPE_OFFLINE); tasa = CL_TASA_OFFLINE; }
  const seg = ms / 1000;
  // los ingresos rinden menos con la página cerrada; el arriendo se paga igual
  const ganado = clIngresoPorSegundo() * seg * tasa - clGastoPorSegundo() * seg;
  c.dinero += ganado;
  c.t = ahora;
  // estar en rojo mucho rato cuesta prestigio: no se puede sostener una clínica así
  if(c.dinero < 0){
    c.rojo += seg;
    while(c.rojo >= 60 && c.reputacion > 0){ c.rojo -= 60; c.reputacion = Math.max(0, c.reputacion - 1); }
  }else if(c.rojo){ c.rojo = 0; }
  return ganado;
}

function clGuardar(inmediato){
  const ahora = Date.now();
  if(inmediato){ clUltimoLocal = ahora; clUltimoCheck = ahora; guardar(); return; }
  if(ahora - clUltimoLocal > 5000){
    clUltimoLocal = ahora;
    try{ localStorage.setItem(CLAVE_GUARDADO, JSON.stringify(datos)); }catch(e){}
  }
  if(ahora - clUltimoCheck > 120000){ clUltimoCheck = ahora; guardar(); }
}

function clPlata(n){
  const signo = n < 0 ? '−' : '';
  const a = Math.abs(n);
  if(a < 1000) return signo + '$' + Math.floor(a);
  if(a < 1e6) return signo + '$' + (a/1000).toFixed(a < 10000 ? 1 : 0) + 'K';
  if(a < 1e9) return signo + '$' + (a/1e6).toFixed(a < 1e7 ? 2 : 1) + 'M';
  return signo + '$' + (a/1e9).toFixed(2) + ' mil M';
}

/* ---------- selección de casos ----------
   Prioriza los que se han visto menos, para que funcione como repaso
   y no salga siempre el mismo. */
function clCasosDisponibles(){
  const abiertas = clEspecialidadesAbiertas();
  let pool = KIN_CASOS.filter(c => abiertas.includes(c.esp));
  const forz = clEfEvento('esp', null);        // un evento puede llenar la sala de una especialidad
  if(forz && pool.some(c => c.esp === forz)) pool = pool.filter(c => c.esp === forz);
  return pool;
}
function clSiguienteCaso(excluir){
  const c = clEstado();
  const fuera = excluir || [];
  let pool = clCasosDisponibles().filter(x => !fuera.includes(x.id));
  if(!pool.length) return null;
  // de vez en cuando vuelve alguien que ya pasó por la clínica, con su historia
  const conocidos = pool.filter(x => c.hist[x.id] && c.hist[x.id].altas > 0);
  if(conocidos.length && Math.random() < 0.28) pool = conocidos;
  const minimo = Math.min(...pool.map(x => c.vistos[x.id] || 0));
  const menosVistos = pool.filter(x => (c.vistos[x.id] || 0) === minimo);
  return menosVistos[Math.floor(Math.random() * menosVistos.length)];
}

function clMezclar(a){
  const r = a.slice();
  for(let i = r.length - 1; i > 0; i--){ const j = Math.floor(Math.random()*(i+1)); [r[i],r[j]]=[r[j],r[i]]; }
  return r;
}

/* ---------- pantalla ---------- */
function clMostrar(){
  const ganado = clAsentar();
  const c = clEstado();
  clMostrado = c.dinero;
  const el = document.getElementById('jxScreenClinica');
  el.innerHTML =
    '<div class="cl-top">' +
      '<canvas id="clLienzo" class="cl-lienzo"></canvas>' +
      '<div class="cl-cargando" id="cl3dCargando">Cargando la clínica…</div>' +
      '<div class="cl-zona" id="cl3dZona"></div>' +
      '<div class="cl-sel" id="cl3dSel"></div>' +
      '<div class="cl-hud">' +
        '<div class="cl-plata"><span id="clDinero">$0</span></div>' +
        '<div class="cl-sub"><span id="clRenta">0</span>/s · ⭐ <span id="clRep">0</span> reputación</div>' +
      '</div>' +
    '</div>' +
    '<div class="cl-tabs">' +
      '<button class="cl-tab activa" data-cv="recepcion">🩺 Atender</button>' +
      '<button class="cl-tab" data-cv="gestion">🏥 Clínica</button>' +
      '<button class="cl-tab" data-cv="repaso">📚 Repaso</button>' +
    '</div>' +
    '<div class="cl-panel" id="clPanel"></div>';
  clCanvas = document.getElementById('clLienzo');
  const aviso3d = document.getElementById('cl3dCargando');
  c3Iniciar(clCanvas).then(() => { if(aviso3d) aviso3d.remove(); })
    .catch(err => {
      console.warn('No se pudo cargar el 3D', err);
      if(aviso3d) aviso3d.textContent = 'No se pudo cargar la vista 3D';
    });
  el.querySelectorAll('.cl-tab').forEach(b => b.onclick = () => {
    el.querySelectorAll('.cl-tab').forEach(x => x.classList.remove('activa'));
    b.classList.add('activa');
    clVista = b.dataset.cv;
    jxSonido('tap');
    clPanel();
  });
  clPanel();
  clBucle();
  if(c.avisoReforma){
    const r = c.avisoReforma;
    delete c.avisoReforma;
    clGuardar(true);
    jxCelebrar({
      titulo:'La clínica se ordenó 🩺',
      sub:(r.antes > r.despues ? 'La caja tenía ' + clPlata(r.antes) + ': era la renta del equipo creciendo sin freno, y la plata ya no servía para nada. ' +
            'Quedó en ' + clPlata(r.despues) + ', justo para abrir una sede nueva cuando quieras. ' : '') +
          'Ahora cada kinesiólogo rinde de forma realista y caben dos por box. ' +
          (r.rescatados ? 'Llamaste a ' + r.rescatados + ' paciente(s) que se estaban yendo y volvieron a sus sesiones. ' : '') +
          'Tu reputación, el álbum, las habilidades y la historia de cada paciente siguen intactos.',
      monedas:0, xp:0, textoNext:'Entendido',
    });
    return;
  }
  if(ganado >= 1) avisar('🏥 Mientras no estabas, tu equipo atendió y juntó ' + clPlata(ganado));
  else if(ganado <= -1) avisar('🏥 Mientras no estabas se pagó ' + clPlata(-ganado) + ' de arriendo y sueldos');
}

function clAjustar(){
  if(!clCanvas) return;
  const r = clCanvas.getBoundingClientRect();
  const d = Math.min(window.devicePixelRatio || 1, 2);
  clCanvas.width = Math.max(1, Math.round(r.width * d));
  clCanvas.height = Math.max(1, Math.round(r.height * d));
  clCtx.setTransform(d, 0, 0, d, 0, 0);
}

function clPanel(){
  const cont = document.getElementById('clPanel');
  if(!cont) return;
  // las solapas de arriba se mantienen en sintonía con clVista
  document.querySelectorAll('#jxScreenClinica .cl-tab[data-cv]').forEach(b =>
    b.classList.toggle('activa', b.dataset.cv === clVista));
  if(clVista === 'recepcion'){
    if(clTurno) clPanelCaso(cont);
    else if(clSesionAbierta !== null) clPanelSesion(cont, clSesionAbierta);
    else clPanelRecepcion(cont);
  }
  else if(clVista === 'gestion') clPanelGestion(cont);
  else clPanelRepaso(cont);
}

/* ---------- recepción ---------- */
function clEdad(caso){ return caso.edadTxt || (caso.edad + ' años'); }

function clPanelRecepcion(cont){
  const c = clEstado();
  // red de seguridad: si el turno quedó a medio cerrar (por salir de la app
  // justo al terminar), se liquida acá en vez de bloquear los siguientes.
  if(c.noche && c.noche.quedan <= 0 && !clTurno){ clCerrarNoche(); return; }
  clAvanzarReloj();
  clVencerUrgencia();
  clRevisarPaciencia();
  clCaducarMensajes();
  clSortearMensajes();
  clRevisarAbandonos();
  clSortearEvento();
  clSortearUrgencia();
  clLlenarSala();
  const ev = clEvento();
  const j = clJornada();
  const abiertas = clEspecialidadesAbiertas();
  const prox = Object.keys(CL_ESPECIALIDADES).find(k => !abiertas.includes(k));
  const precision = c.atendidos ? Math.round(c.aciertos / (c.aciertos + c.fallos) * 100) : 0;

  const sede = clSede();
  let html = '<div class="cl-recep">' +
    '<div class="cl-jornada">' +
      '<div class="cl-jornada-dia">' + sede.emo + ' Sede ' + sede.nom + ' · día ' + j.dia +
        '<small><span id="clReloj">' + clHoraTxt(clAgenda().reloj) + '</span> · ' + j.nom + ' · ' +
        c.sala.length + ' en la sala' +
        (c.racha > 1 ? ' · 🔥 ' + c.racha + ' seguidos' : '') +
        (c.sede ? ' · pago ×' + clMultSede().toFixed(2).replace('.', ',') : '') + '</small></div>' +
      '<div class="cl-jornada-sol">' + j.emo + '</div>' +
    '</div>' +
    '<div class="cl-tema-sem">📌 Semana de <b>' + clTemaSemana() + '</b> · esos casos pagan 45% más</div>' +
    '<div style="display:none">' +
      '<div class="cl-jornada-sol">' + j.emo + '</div>' +
    '</div>';

  if(c.dinero < 0){
    html += '<div class="cl-rojo">🔴 La clínica está en rojo: ' + clPlata(c.dinero) +
      '. El arriendo y los sueldos corren igual, y cada minuto así te cuesta reputación.</div>';
  }

  // urgencia con reloj: manda sobre todo lo demás
  if(c.urgencia){
    const uc = KIN_CASOS.find(x => x.id === c.urgencia.id);
    if(uc){
      html += '<button class="cl-urgencia" data-urgencia="1">' +
        '<div class="cl-urgencia-top"><span>🚨 Urgencia</span>' +
          '<span class="cl-urgencia-reloj" id="clUrReloj">' + clSegUrgencia() + 's</span></div>' +
        '<div class="cl-urgencia-cuerpo">' +
          '<div class="cl-pac-emo urg">' + (uc.ava || '🧍') + '</div>' +
          '<div class="cl-pac-info"><div class="cl-pac-nom">' + clPacNom(uc, c.urgencia) + ', ' + clPacEdad(uc, c.urgencia) + '</div>' +
          '<div class="cl-pac-mot">“' + uc.motivo + '”</div>' +
          '<div class="cl-pac-meta">Llegó en ambulancia · atiéndelo antes de que se lo lleven</div></div>' +
        '</div></button>';
    }
  }

  /* Orden pensado para el teléfono: lo que se hace (sala de espera) va
     arriba; lo demás se junta abajo. Los bloques se arman igual que antes y
     se recortan del html para moverlos. */
  const corteSim = html.length;
  // --- interruptor de modo simulación ---
  const sim = clSimulacion();
  html += '<button class="cl-sim' + (sim ? ' on' : '') + '" id="clSim">' +
    '<div><b>🧑‍🏫 Modo simulación ' + (sim ? '· puesto' : '· apagado') + '</b>' +
    '<small>' + (sim
      ? 'Al cerrar cada caso aparece la pauta del docente: trato, anamnesis, examen, razonamiento y plan.'
      : 'Préndelo para que te evalúen la atención completa, como en la estación de la U.') + '</small></div>' +
    '<span class="cl-sim-luz">' + (sim ? '●' : '○') + '</span></button>';

  const corteResumen = html.length;
  // --- resumen de la semana pasada ---
  const w = clSemanaEstado();
  if(w.previa && !w.vista && w.previa.atendidos){
    const pv = w.previa;
    const prec = pv.atendidos ? Math.round(pv.aciertos / pv.atendidos * 100) : 0;
    const ex = c.examen.tema, temas = Object.keys(ex).filter(k => ex[k].n);
    const flojo = temas.sort((a2,b2) => (ex[a2].ok/ex[a2].n) - (ex[b2].ok/ex[b2].n))[0];
    html += '<div class="cl-resumen"><div class="cl-resumen-tit">📅 Cómo les fue la semana pasada</div>' +
      '<div class="cl-stats">' +
        '<div><b>' + pv.atendidos + '</b><span>atendidos</span></div>' +
        '<div><b>' + prec + '%</b><span>perfectos</span></div>' +
        '<div><b>' + pv.altas + '</b><span>altas</span></div>' +
      '</div>' +
      (pv.derivados ? '<p>Derivaste bien ' + pv.derivados + ' caso' + (pv.derivados === 1 ? '' : 's') + ' de bandera roja.</p>' : '') +
      (flojo ? '<p>Donde más fallas en el examen es <b>' + flojo + '</b>: ahí conviene apuntar esta semana.</p>' : '') +
      '<button class="cl-btn-grande" id="clCerrarResumen">Empezar la semana</button></div>';
  }

  const corteMensajes = html.length;
  // --- mensajes sin responder ---
  const pend = clMensajesPendientes();
  if(pend){
    html += '<div class="cl-msg-aviso"><b>💬 ' + pend + ' mensaje' + (pend === 1 ? '' : 's') + ' sin responder</b>' +
      '<small>Te escribieron entre sesiones. Si no contestas, se desmotivan.</small></div>';
  }

  // --- caso del día ---
  const hoy = jxHoyClave();
  const yo = clQuien();
  const hecho = clDiarioHecho();
  if(!yo){
    html += '<div class="cl-diario"><div class="cl-diario-tit">🗓️ Caso del día</div>' +
      '<p>Un paciente al día, el mismo para los dos. ¿Quién está jugando en este teléfono?</p>' +
      '<div class="cl-quien"><button data-quien="Catalina">Catalina</button><button data-quien="Diego">Diego</button></div></div>';
  }else if(!hecho){
    html += '<button class="cl-diario listo" id="clDiario">' +
      '<div class="cl-diario-tit">🗓️ Caso del día</div>' +
      '<p>Un paciente, una sola pasada, sin reintentos. El mismo para los dos.</p>' +
      (c.diario.racha ? '<div class="cl-diario-racha">🔥 llevas ' + c.diario.racha +
        (c.diario.racha === 1 ? ' día' : ' días') + ' seguidos</div>' : '') +
      '</button>';
  }else{
    const otros = Object.keys(c.diarioComp).filter(q => c.diarioComp[q].fecha === hoy);
    html += '<div class="cl-diario hecho"><div class="cl-diario-tit">🗓️ Caso del día · listo</div>' +
      '<div class="cl-marcador">' + otros.map(q => {
        const d = c.diarioComp[q];
        return '<div class="cl-marcador-fila' + (q === yo ? ' yo' : '') + '">' +
          '<span>' + q + (q === yo ? ' (tú)' : '') + '</span>' +
          '<b>' + d.puntaje + '</b><small>🔥 ' + d.racha + '</small></div>';
      }).join('') + '</div>' +
      (otros.length < 2 ? '<p>Falta que juegue el otro. Vuelve más rato a ver cómo le fue.</p>'
                        : '<p>Mañana hay uno nuevo.</p>') +
      '<div class="cl-diario-racha">Tu mejor racha: ' + c.diario.mejorRacha + ' · ' + c.diario.jugados + ' casos del día jugados</div>' +
      '</div>';
  }

  if(ev){
    html += '<div class="cl-evento"><div class="cl-evento-emo">' + ev.emo + '</div><div>' +
      '<div class="cl-evento-nom">' + ev.nom + '</div>' +
      '<div class="cl-evento-desc">' + ev.desc + '</div>' +
      (ev.relato ? '<div class="cl-evento-relato">' + ev.relato + '</div>' : '') +
      '<div class="cl-evento-quedan">Quedan ' + ev.restantes + ' paciente' + (ev.restantes === 1 ? '' : 's') + '</div>' +
    '</div></div>';
  }

  const corteMisiones = html.length;
  // misiones del día
  const ms = clMisiones();
  html += '<div class="cl-sec">Misiones del día</div><div class="cl-misiones">';
  ms.forEach(m => {
    const d = clMisionDef(m.id);
    if(!d) return;
    const lista = m.n >= d.meta;
    html += '<div class="cl-mision' + (m.cobrada ? ' cobrada' : lista ? ' lista' : '') + '"' +
      (lista && !m.cobrada ? ' data-mision="' + m.id + '"' : '') + '>' +
      '<div class="cl-mision-info"><b>' + d.nom + '</b><small>' + d.desc + '</small>' +
      '<div class="cl-barra-mini"><div style="width:' + Math.round(m.n / d.meta * 100) + '%"></div></div></div>' +
      '<div class="cl-mision-premio">' + (m.cobrada ? '✓' : lista ? 'Cobrar' : m.n + '/' + d.meta) + '</div></div>';
  });
  html += '</div>';

  if(c.reputacion >= CL_NOCHE_REP){
    html += '<button class="cl-noche-btn" id="clNoche">🌙 Tomar turno de noche' +
      '<small>' + CL_NOCHE_LARGO + ' pacientes seguidos, sin elegir y con menos tiempo. Paga ' + CL_NOCHE_PAGO + '×' +
      (c.nocheMejor ? ' · tu récord: ' + c.nocheMejor + '/' + CL_NOCHE_LARGO : '') + '</small></button>';
  }

  const bloqueSim = html.slice(corteSim, corteResumen);
  const bloqueResumen = html.slice(corteResumen, corteMensajes);
  const bloqueHoy = html.slice(corteMensajes, corteMisiones);
  const bloqueMisiones = html.slice(corteMisiones);
  html = html.slice(0, corteSim) + bloqueResumen;

  if(clJornadaTerminada()){
    const ag = clAgenda();
    html += '<div class="cl-jornada-fin"><div class="cl-jornada-fin-tit">🌙 Cerró la clínica</div>' +
      '<p>Son las ' + clHoraTxt(CL_HORA_CIERRA) + ' y terminó el día ' + ag.dia + '. ' +
      'Atendiste a ' + (ag.atendidos || 0) + '. Mañana hay ' + CL_AGENDA_DIA + ' horas dadas de nuevo.</p>' +
      '<button class="cl-btn-grande" id="clNuevaJornada">Abrir el día ' + (ag.dia + 1) + '</button></div>';
  }

  html += '<div class="cl-sec">Sala de espera</div>';
  if(!c.sala.length){
    const px = clProxCita();
    html += '<div class="cl-vacio">' + (clCerrada()
      ? 'La clínica ya cerró por hoy.'
      : px !== null
        ? 'Sala vacía. El próximo tiene hora a las <b>' + clHoraTxt(px) + '</b>.'
        : 'No queda nadie más en la agenda de hoy.') + '</div>';
  }else{
    html += '<div class="cl-espera">' + c.sala.map((f, i) => {
      const caso = KIN_CASOS.find(x => x.id === f.id);
      if(!caso) return '';
      const h = clHist(caso.id);
      const canon = clEsCanon(f);
      const vuelve = canon && !!(h && h.veces);
      const esp = CL_ESPECIALIDADES[caso.esp];
      const ra = clRasgo(f.rasgo), an = clAnimo(f.animo);
      return '<button class="cl-pac' + (vuelve ? ' vuelve' : '') + '" data-atender="' + i + '">' +
        '<div class="cl-pac-emo"' + (vuelve ? ' style="background:#f6ead4"' : '') + '>' + (caso.ava || '🧍') + '</div>' +
        '<div class="cl-pac-info">' +
          '<div class="cl-pac-nom">' + clPacNom(caso, f) + ', ' + clPacEdad(caso, f) +
            (an ? '<span class="cl-badge sobrio">' + an.emo + ' ' + an.nom + '</span>' : '') +
            (ra ? '<span class="cl-badge sobrio">' + ra.emo + ' ' + ra.nom + '</span>' : '') +
            (clEsTema(caso) ? '<span class="cl-badge azul">📌 tema</span>' : '') +
            (vuelve ? '<span class="cl-badge oro">vuelve</span>' : '') +
            (canon && c.dominados.includes(caso.id) ? '<span class="cl-badge verde">dominado</span>' : '') +
          '</div>' +
          '<div class="cl-pac-mot">“' + caso.motivo + '”</div>' +
          '<div class="cl-pac-meta">' + (f.hora !== undefined ? '<b>🕐 hora ' + clHoraTxt(f.hora) + '</b> · ' : '') +
            (clEsperaMin(f) >= 3 ? '<b class="cl-espera-alerta">⏱ ' + clEsperaMin(f) + ' min esperando</b> · ' : '') +
            esp.emo + ' ' + clPacOcup(caso, f) +
            (f.gen ? ' · ' + f.gen.comuna : '') + ' · ' + f.prev +
            (f.deriv ? ' · ' + clDerivador(f.deriv).emo + ' ' + clDerivador(f.deriv).nom : '') +
            ' · ' + f.espera +
            (f.acomp ? ' · ' + f.acomp.emo + ' con ' + f.acomp.nom : '') + '</div>' +
        '</div></button>';
    }).join('') + '</div>';
  }

  html += bloqueHoy;

  html += '<div class="cl-chips">' +
      abiertas.map(k => '<span class="cl-chip" style="background:' + CL_ESPECIALIDADES[k].color + '">' +
        CL_ESPECIALIDADES[k].emo + ' ' + CL_ESPECIALIDADES[k].nom + '</span>').join('') +
      (prox ? '<span class="cl-chip off">🔒 ' + CL_ESPECIALIDADES[prox].nom + ' · ⭐' + CL_ESPECIALIDADES[prox].rep + '</span>' : '') +
    '</div>' +
    '<div class="cl-stats">' +
      '<div><b>' + c.atendidos + '</b><span>pacientes</span></div>' +
      '<div><b>' + precision + '%</b><span>de acierto</span></div>' +
      '<div><b>' + (c.altas || 0) + '</b><span>altas dadas</span></div>' +
    '</div>';

  if(c.activos.length){
    const lleno = c.activos.length >= CL_ACTIVOS_MAX;
    html += '<div class="cl-sec">En tratamiento (' + c.activos.length + ' de ' + CL_ACTIVOS_MAX + ')</div>' +
      (lleno ? '<div class="cl-rojo">📋 Agenda llena. Los pacientes nuevos van a quedar con otro kinesiólogo ' +
               'hasta que le des el alta a alguien.</div>' : '') +
      '<div class="cl-lista">' +
      c.activos.map((p, i) => {
        const cs = KIN_CASOS.find(x => x.id === p.id);
        if(!cs) return '';
        const f = clFaseDe(p.progreso);
        const adh = Math.round(p.adh);
        return '<button class="cl-item puede' + (p.alarma ? ' alerta' : '') + '" data-sesion="' + i + '">' +
          '<div class="cl-item-emo" style="background:#e8f0f4">' + (p.alarma ? '⚠️' : (cs.ava || '🧍')) + '</div>' +
          '<div class="cl-item-info"><div class="cl-item-nom">' + clPacNom(cs, p) +
            (p.compl ? ' <span class="cl-badge roja">🚨 se torció</span>' : p.msg ? ' <span class="cl-badge azul">💬 te escribió</span>' : p.alarma ? ' <span class="cl-badge roja">algo cambió</span>' : adh < 35 ? ' <span class="cl-badge roja">va a abandonar</span>' : '') + '</div>' +
          '<div class="cl-item-desc">' + cs.nom + ' · fase ' + f.nom + ' · adherencia ' + adh + '%</div>' +
          '<div class="cl-barra-mini"><div style="width:' + p.progreso + '%"></div></div></div>' +
          '<div class="cl-item-costo">' + Math.round(p.progreso) + '%</div></button>';
      }).join('') + '</div>';
  }

  if(c.personal.length){
    html += '<div class="cl-sec">Tu equipo</div><div class="cl-lista">' + c.personal.map(p =>
      '<div class="cl-item listo"><div class="cl-item-emo" style="background:' + CL_ESPECIALIDADES[p.esp].color + '33">' + p.emo + '</div>' +
      '<div class="cl-item-info"><div class="cl-item-nom">' + p.nom + '</div>' +
      '<div class="cl-item-desc">' + CL_ESPECIALIDADES[p.esp].nom + ' · ' + clPlata(p.renta * clMultPago()) + '/s</div></div></div>'
    ).join('') + '</div>';
  }

  html += '<div class="cl-sec">Más para hoy</div>' + bloqueMisiones + bloqueSim;

  cont.innerHTML = html + '</div>';
  cont.querySelectorAll('[data-atender]').forEach(b => b.onclick = () => clIniciarCaso(parseInt(b.dataset.atender, 10)));
  cont.querySelectorAll('[data-sesion]').forEach(b => b.onclick = () => { clSesionAbierta = parseInt(b.dataset.sesion, 10); jxSonido('tap'); clPanel(); });
  cont.querySelectorAll('[data-urgencia]').forEach(b => b.onclick = () => clIniciarCaso('urgencia'));
  cont.querySelectorAll('[data-mision]').forEach(b => b.onclick = () => clCobrarMision(b.dataset.mision));
  cont.querySelectorAll('[data-quien]').forEach(b => b.onclick = () => clFijarQuien(b.dataset.quien));
  const bd = document.getElementById('clDiario');
  if(bd) bd.onclick = clEmpezarDiario;
  const bnj = document.getElementById('clNuevaJornada');
  if(bnj) bnj.onclick = clNuevaJornada;
  const bsim = document.getElementById('clSim');
  if(bsim) bsim.onclick = () => clFijarSimulacion(!clSimulacion());
  const br = document.getElementById('clCerrarResumen');
  if(br) br.onclick = () => { clSemanaEstado().vista = true; jxSonido('tap'); clGuardar(true); clPanel(); };
  const bn = document.getElementById('clNoche');
  if(bn) bn.onclick = clEmpezarNoche;
}

/* ---------- el caso, paso a paso ---------- */
/* ---------- el caso: investigar, deducir, tratar ----------
   No hay alternativas que adivinar. Se juntan pistas con tiempo
   limitado y el tablero muestra cómo se mueven las hipótesis. */

/* ---------- resultado de una prueba ortopédica ----------
   Ya no es "la correcta confirma y las demás no dicen nada". Cada prueba
   informa según sus propiedades: una NEGATIVA en un test muy sensible
   descarta (SnNout) y una POSITIVA en uno muy específico confirma (SpPin).
   Lo demás orienta y poco más, que es justo lo que hay que aprender. */
function clResultadoPrueba(pruebaId, caso, dif){
  const pr = KIN_PRUEBAS.find(x => x.id === pruebaId);
  if(!pr) return { t:'Esa prueba no está disponible.', s:[], n:[] };

  if(pr.func){
    return { t:(caso.prueba === pruebaId && caso.hallazgo ? caso.hallazgo + ' ' : '') +
                'Es una medición funcional, no una prueba diagnóstica: te dice cómo está, no qué tiene.',
             s:[], n:[] };
  }

  // hipótesis del diferencial para las que ESTA prueba saldría positiva
  const apunta = dif.filter(d => {
    const k = KIN_CASOS.find(x => x.id === d);
    return k && k.prueba === pruebaId && KIN_PRUEBA_NEG.indexOf(d) === -1;
  });
  const esSuya = caso.prueba === pruebaId;
  const positiva = esSuya && KIN_PRUEBA_NEG.indexOf(caso.id) === -1;
  const hall = esSuya && caso.hallazgo ? caso.hallazgo + ' ' : '';
  const sn = pr.sn || 0, sp = pr.sp || 0;
  const fmt = v => v.toFixed(2).replace('.', ',');

  if(positiva){
    if(sp >= KIN_SP_ALTA){
      return { t:hall + 'Especificidad ' + fmt(sp) + ': con una positiva acá puedes CONFIRMAR (SpPin).',
               s:[caso.id], n:dif.filter(d => d !== caso.id) };
    }
    return { t:hall + 'Pero ojo: especificidad ' + fmt(sp) +
               ', da hartos falsos positivos. Orienta, no confirma por sí sola.',
             s:[caso.id], n:[] };
  }

  const cabeza = hall || 'Negativa. ';
  if(!apunta.length){
    return { t:cabeza + 'Esa prueba evalúa ' + pr.sug + ', que no está en juego en este diferencial: no aporta.',
             s:[], n:[] };
  }
  if(sn >= KIN_SN_ALTA){
    return { t:cabeza + 'Sensibilidad ' + fmt(sn) + ': una negativa acá DESCARTA (SnNout) ' +
               apunta.map(clCorto).join(' y ') + '.',
             s:[], n:apunta };
  }
  return { t:cabeza + 'Pero con sensibilidad ' + fmt(sn) +
             ' se le escapan muchos casos: una negativa NO permite descartar.',
           s:[], n:[] };
}

function clAccionesDe(caso){
  const dx = KIN_DX[caso.id];
  // las habilidades abaratan acciones: buena oreja preguntar, ojo clínico probar
  const lista = CL_ACC.map(a => {
    const b = Object.assign({}, a);
    if(a.g === 'anam' && clTieneHabil('oreja')) b.t = Math.max(1, a.t - 1);
    if(a.g === 'img' && clImgGratis()) b.plata = 0;
    return b;
  });
  // pruebas ortopédicas de la zona (más un par de otras zonas, para que
  // elegir la prueba correcta signifique algo)
  const zona = (caso.zona || '').toLowerCase();
  const propias = KIN_PRUEBAS.filter(p => zona.startsWith(p.zona.slice(0,4)) || p.id === caso.prueba);
  const otras = KIN_PRUEBAS.filter(p => !propias.includes(p)).slice(0, 3);
  // desde la segunda sede el diferencial trae hipótesis de más: hay que
  // descartar cuadros que ni siquiera venían servidos en la lista
  let dif = dx ? dx.dif.slice() : [caso.id];
  const extra = Math.min(clEstado().sede || 0, 3);
  if(extra){
    const candidatos = clMezclar(KIN_CASOS.filter(x =>
      x.zona === caso.zona && dif.indexOf(x.id) === -1));
    dif = dif.concat(candidatos.slice(0, extra).map(x => x.id));
  }
  const costoTest = clTieneHabil('ojo') ? 1 : 2;
  [...propias, ...otras].forEach(p => lista.push({
    id:'test_'+p.id, g:'test', n:'Prueba de '+p.nom, t:costoTest, prueba:p.id,
    // las propiedades van a la vista: elegir la prueba se decide con esto
    meta: p.func ? 'medición funcional'
                 : 'Sn ' + p.sn.toFixed(2).replace('.', ',') + ' · Sp ' + p.sp.toFixed(2).replace('.', ','),
  }));
  return { lista, dif };
}

function clTiempoTotal(rasgoId){
  const c = clEstado();
  let t = CL_TIEMPO_BASE + (clTieneEquipo('eco') ? 2 : 0) + clTiempoEquipo() + clEfEvento('tiempo', 0);
  if(c.noche) t += CL_NOCHE_TIEMPO;
  t += clEfRasgo(rasgoId, 'tiempo', 0);
  t -= (c.sede || 0);              // cada sede aprieta un poco más la consulta
  if(clTieneHabil('memoria')) t += 2;
  return Math.max(6, t);
}

/* `i` es la posición en la sala de espera; 'urgencia' atiende la ambulancia.
   Sin argumento se atiende al primero de la fila. */
function clIniciarCaso(i){
  const c = clEstado();
  let ficha = null;

  if(i === 'urgencia'){
    if(!c.urgencia || clVencerUrgencia()){ clPanel(); return; }
    ficha = c.urgencia; c.urgencia = null;
  }else if(c.noche){
    ficha = clFichaEspera(clCasoDeNoche());
    ficha.origen = 'llegó al turno de noche';
  }else{
    clLlenarSala();
    const pos = (typeof i === 'number' && c.sala[i]) ? i : 0;
    ficha = c.sala.splice(pos, 1)[0];
  }
  if(!ficha){ avisar('No hay nadie esperando todavía'); clPanel(); return; }
  const caso = KIN_CASOS.find(x => x.id === ficha.id);
  if(!caso){ clPanel(); return; }

  let { lista, dif } = clAccionesDe(caso);
  if(clEfEvento('sinImg', false)) lista = lista.filter(a => a.g !== 'img');
  if(ficha.acomp) lista.push({ id:'acomp', g:'anam', n:'Preguntarle a ' + ficha.acomp.nom, t:1 });

  const conf = {}; dif.forEach(d => conf[d] = 0);
  // "llega leído": parte convencido de un diagnóstico que no es el suyo.
  // Ya no infla el tablero (ahora el tablero es tuyo): te lo dice a la cara
  // para ver si te dejas llevar.
  let creencia = null;
  if(clEfRasgo(ficha.rasgo, 'pistaFalsa', false)){
    const otras = dif.filter(d => d !== caso.id);
    if(otras.length) creencia = otras[Math.floor(Math.random() * otras.length)];
  }
  const h = clHist(caso.id);
  const tot = clTiempoTotal(ficha.rasgo);
  clTurno = {
    caso, ficha, acciones:lista, dif, conf, creencia,
    hechas:[], pistas:[], imagenes:0,
    notas:{},                  // el cuaderno: lo que el jugador anota de cada hallazgo
    chat:[],                   // la consulta como conversación
    tiempo: tot, tiempoMax: tot,
    fase:'investigar', errores:0, grupo:'anam',
    hist: h ? Object.assign({}, h) : null,
    noche: !!c.noche,
    urgente: i === 'urgencia',
    // mirada psicosocial: la bandera amarilla se ve sin tener que preguntar
    amarillaVista: clTieneHabil('psico'),
    amarilla: clTieneHabil('psico') ? ficha.amarilla : null,
    // historia, deudas y notas son del paciente de la ficha, no de un generado
    fallo: clEsCanon(ficha) ? (c.fallidos[caso.id] || null) : null,
    nota: clEsCanon(ficha) ? clNotaDeOtro(caso.id) : null,
  };
  if(!clEsCanon(ficha)) clTurno.hist = null;
  clAbrirConversacion(clTurno);
  jxSonido('tap');
  clVista = 'recepcion'; clSesionAbierta = null;
  clPanel();
}

/* El paciente saluda y cuenta a qué viene, antes de que preguntes nada. */
function clAbrirConversacion(t){
  if(!t) return;
  const an = clAnimo(t.ficha && t.ficha.animo);
  const habla = t.ficha && t.ficha.habla;
  const h = clHabla(habla);
  // primero saluda como saluda él, después cuenta a qué viene con su ánimo
  clDecir(t, 'pac', h.saludo[Math.floor(Math.random() * h.saludo.length)]);
  const saludo = (an && CL_SALUDO[an.id]) || [];
  saludo.slice(1).forEach((x, i) => clDecir(t, 'pac', clConHabla(habla, x, i)));
  clDecir(t, 'pac', clConHabla(habla, t.caso.motivo + '.', 0));
  if(t.ficha && t.ficha.acomp) clDecir(t, 'acomp', 'Yo lo acompaño, cualquier cosa pregúnteme a mí también.');
}

/* ---------- el cuaderno ----------
   El juego ya no calcula solo qué tan probable es cada hipótesis: eso lo
   marca el jugador. Cada hallazgo se anota como ↑ (apoya), ↓ (descarta)
   o – (no aporta), y el tablero refleja SU razonamiento, no la verdad.
   Al cerrar el caso se corrige la anotación, que es donde se aprende. */
function clMarcar(accId, hip){
  const t = clTurno;
  if(!t || t.fase !== 'investigar') return;
  if(!t.notas[accId]) t.notas[accId] = {};
  const actual = t.notas[accId][hip] || 0;
  t.notas[accId][hip] = actual === 0 ? 1 : actual === 1 ? -1 : 0;
  jxSonido('tap');
  clPanel();
}

/* Reparte 100% entre las hipótesis según lo que anotó el jugador. */
function clConfianzas(){
  const t = clTurno;
  const vals = t.dif.map(d => {
    let v = 0;
    Object.keys(t.notas).forEach(k => {
      const m = t.notas[k][d] || 0;
      if(m === 1) v += 2; else if(m === -1) v -= 3;
    });
    return v;
  });
  const min = Math.min(...vals);
  const desp = vals.map(v => v - min + 1);
  const suma = desp.reduce((a,b) => a+b, 0);
  const r = {};
  t.dif.forEach((d,i) => r[d] = desp[i] / suma * 100);
  return r;
}

/* Qué decía de verdad cada hallazgo, para corregir el cuaderno. */
function clVerdadPista(t, accId){
  const dx = KIN_DX[t.caso.id];
  if(accId && accId.indexOf('test_') === 0) return clResultadoPrueba(accId.slice(5), t.caso, t.dif);
  if(dx && dx.c[accId]) return dx.c[accId];
  return { s:[], n:[] };
}

/* Ya no se corrige una anotación: se le muestra qué significaba cada
   hallazgo que consiguió y qué se quedó sin buscar. El porcentaje es
   COBERTURA —cuánto de lo que discriminaba alcanzó a explorar—, que es
   un número que sí se entiende, a diferencia del de las flechitas. */
function clLecturaHallazgos(t){
  const filas = [];
  t.pistas.forEach(p => {
    if(!p.accId || CL_NO_ANOTA.indexOf(p.accId) !== -1) return;
    const v = clVerdadPista(t, p.accId);
    if(!v.s.length && !v.n.length) return;
    filas.push({ acc:p.acc, apoya:v.s.map(clCorto), descarta:v.n.map(clCorto) });
  });
  const dx = KIN_DX[t.caso.id];
  const claves = dx ? Object.keys(dx.c) : [];
  const faltaron = [];
  let hechas = 0, total = claves.length;
  claves.forEach(k => {
    if(t.hechas.indexOf(k) !== -1) hechas++;
    else { const acc = CL_ACC.find(a => a.id === k); if(acc) faltaron.push(acc.n); }
  });
  if(t.caso.prueba){
    total++;
    if(t.hechas.indexOf('test_' + t.caso.prueba) !== -1) hechas++;
    else {
      const pr = KIN_PRUEBAS.find(x => x.id === t.caso.prueba);
      if(pr) faltaron.push('Prueba de ' + pr.nom);
    }
  }
  return { filas, hechas, total, pct: total ? Math.round(hechas / total * 100) : 100, faltaron };
}

function clNombreDx(id){
  const c = KIN_CASOS.find(x => x.id === id);
  return c ? c.nom : id;
}
function clCorto(id){ return CL_CORTO[id] || clNombreDx(id); }

/* ---------- pista con recarga ----------
   Se recarga sola cada cinco minutos de reloj real. No dice el
   diagnóstico: toma un hallazgo que ya conseguiste y te lo anota bien
   en el cuaderno, explicando por qué. Es una corrección, no una respuesta. */
function clEsperaPista(){ return clTieneHabil('intuicion') ? 3 * 60 * 1000 : CL_PISTA_ESPERA; }
function clPistaLista(){
  const c = clEstado();
  return Date.now() - (c.pistaT || 0) >= clEsperaPista();
}
function clPistaSegundos(){
  const c = clEstado();
  return Math.max(0, Math.ceil((clEsperaPista() - (Date.now() - (c.pistaT || 0))) / 1000));
}
function clUsarPista(){
  const t = clTurno, c = clEstado();
  if(!t || t.fase !== 'investigar') return;
  if(!clPistaLista()){
    const s = clPistaSegundos();
    avisar('💡 La pista se recarga en ' + Math.floor(s/60) + ':' + String(s % 60).padStart(2,'0'));
    jxSonido('mal');
    return;
  }
  // primero: algo que discrimina y que todavía no ha ido a buscar
  const dx = KIN_DX[t.caso.id];
  const pendientes = dx ? Object.keys(dx.c).filter(k => t.hechas.indexOf(k) === -1) : [];
  c.pistaT = Date.now();
  t.pistasUsadas = (t.pistasUsadas || 0) + 1;
  jxSonido('bien'); jxVibrar(15);

  if(pendientes.length){
    const k = pendientes[Math.floor(Math.random() * pendientes.length)];
    const acc = CL_ACC.find(a => a.id === k);
    avisar('💡 Te falta algo que acá cambia el diferencial: ' + (acc ? '“' + acc.n + '”' : k) + '.');
  }else{
    // si ya exploró todo, se le recuerda qué hallazgo pesaba más
    const fuertes = [];
    t.pistas.forEach(p => {
      if(!p.accId || CL_NO_ANOTA.indexOf(p.accId) !== -1) return;
      const v = clVerdadPista(t, p.accId);
      if(v.n.length) fuertes.push('“' + p.acc + '” descartaba ' + v.n.map(clCorto).join(' y '));
    });
    avisar(fuertes.length
      ? '💡 ' + fuertes[Math.floor(Math.random() * fuertes.length)] + '.'
      : '💡 Ya exploraste lo que había. Con eso alcanza para decidir.');
  }
  clGuardar(true);
  clPanel();
}

function clHacerAccion(accId){
  const t = clTurno, caso = t.caso;
  if(t.hechas.includes(accId)) return;
  const acc = t.acciones.find(a => a.id === accId);
  if(!acc) return;
  // mano firme: la primera prueba ortopédica de cada paciente sale gratis
  const gratis = acc.g === 'test' && clTieneHabil('mano') && !t.usoMano;
  const costo = gratis ? 0 : acc.t;
  if(t.tiempo < costo){ jxSonido('mal'); avisar('⏳ No te queda tiempo para eso'); return; }
  if(gratis) t.usoMano = true;
  if(acc.plata){
    const c = clEstado();
    if(c.dinero < acc.plata){ jxSonido('mal'); avisar('No alcanza la plata para ese examen'); return; }
    clAsentar(); c.dinero -= acc.plata;
  }
  t.tiempo -= costo;
  t.hechas.push(accId);
  if(acc.g === 'img') t.imagenes++;

  const dx = KIN_DX[caso.id];
  let pista = null, etiqueta = acc.n, accIdPista = acc.id;

  if(acc.id === 'presentarse'){
    const n = clPacNom(caso, t.ficha).split(' ')[0];
    pista = { t:'“Sí, ' + n + ', mucho gusto. Vengo por lo que le contaba.”', s:[], n:[] };
    jxSonido('bien');
  }else if(acc.id === 'consentimiento'){
    pista = { t:'“Sí, dale nomás. Avíseme si algo me va a doler.”', s:[], n:[] };
    jxSonido('bien');
  }else if(acc.id === 'charla'){
    // no aporta al diferencial, pero el paciente se suelta y confía
    const v = (t.ficha && t.ficha.vida) || clGenVida();
    const cuenta = [v.familia, v.hobby, v.dato][Math.min(t.rapport || 0, 2)];
    t.rapport = (t.rapport || 0) + 1;
    let txt = 'Le cuenta, de pasada, que ' + cuenta + '.';
    // cuando ya hay confianza, sale solo lo que no habría dicho preguntando
    if(t.rapport >= 2 && t.ficha && t.ficha.amarilla && !t.amarillaVista){
      const am = CL_AMARILLAS.find(a2 => a2.id === t.ficha.amarilla);
      if(am){
        t.amarillaVista = true; t.amarilla = am.id;
        txt += ' Y ya con más confianza suelta: “' + am.dice + '”';
      }
    }
    pista = { t:txt, s:[], n:[] };
    jxSonido('bien');
  }else if(acc.id === 'creencias'){
    // acá se pesca (o no) la bandera amarilla: si no preguntas, el
    // tratamiento después rinde la mitad y no vas a saber por qué
    const am = t.ficha && t.ficha.amarilla ? CL_AMARILLAS.find(a => a.id === t.ficha.amarilla) : null;
    t.amarillaVista = true;
    if(am){
      t.amarilla = am.id;
      pista = { t: am.dice + ' — bandera amarilla: ' + am.nom.toLowerCase() + '.', s:[], n:[] };
      jxSonido('mal'); jxVibrar(20);
    }else{
      pista = { t:'Entiende lo que le pasa, no tiene miedo a moverse y espera mejorar. Sin banderas amarillas.', s:[], n:[] };
      jxSonido('bien');
    }
  }else if(acc.id === 'acomp'){
    // el acompañante cuenta algo que el paciente no había dicho
    const pendientes = dx ? Object.keys(dx.c).filter(k => !t.hechas.includes(k)) : [];
    if(pendientes.length){
      const k = pendientes[Math.floor(Math.random() * pendientes.length)];
      t.hechas.push(k);
      const base = dx.c[k];
      pista = { t:'“' + base.t + '”', s:base.s, n:base.n };
      etiqueta = 'Dice ' + t.ficha.acomp.nom;
      accIdPista = k;              // se anota como el hallazgo que revela
      jxSonido('bien');
    }else{
      pista = { t:'Confirma lo que ya te contó el paciente.', s:[], n:[] };
      jxSonido('tap');
    }
  }else if(acc.g === 'test'){
    pista = clResultadoPrueba(acc.prueba, caso, t.dif);
    jxSonido(pista.s.length || pista.n.length ? 'bien' : 'tap');
  }else if(dx && dx.c[accId]){
    pista = dx.c[accId];
    jxSonido('bien');
  }else if(acc.g === 'anam'){
    // que conteste como persona, no como ficha clínica
    const nada = ['No, nada de eso.', 'Mmm… no, la verdad no.', 'No que yo me acuerde.',
                  'No, eso no me ha pasado.', 'No, nada raro por ese lado.'];
    pista = { t: nada[Math.floor(Math.random() * nada.length)], s:[], n:[] };
    jxSonido('tap');
  }else{
    pista = { t:'Sin hallazgos que aporten al caso.', s:[], n:[] };
    jxSonido('tap');
  }

  // el minimizador y el aguantador entregan la mitad de lo que preguntas
  const pobre = clEfRasgo(t.ficha && t.ficha.rasgo, 'pistasPobres', false) && acc.g === 'anam' && acc.id !== 'acomp';
  // OJO: acá ya no se toca t.conf. El tablero sale del cuaderno del jugador.
  const aMedias = pobre && pista.s.length > 0;
  const textoFinal = pista.t + (aMedias ? ' (te lo cuenta a medias)' : '');
  t.pistas.push({
    accId: accIdPista,
    acc: etiqueta,
    txt: textoFinal,
    util: pista.s.length + pista.n.length > 0,
    amarilla: (acc.id === 'creencias' || acc.id === 'charla') && !!t.amarilla,
  });
  t.ultima = accIdPista;

  // y lo mismo, contado como conversación
  if(acc.g === 'anam'){
    clDecir(t, 'kine', acc.n);
    const quien = acc.id === 'acomp' ? 'acomp' : 'pac';
    clVozPaciente(t, pista.t).forEach((m, i) => {
      clDecir(t, quien, m, i === 0 ? { accId:accIdPista, amarilla: acc.id === 'creencias' && !!t.amarilla } : null);
    });
    if(aMedias) clDecir(t, 'nota', 'Te lo cuenta a medias: hay que insistir para sacarle algo más.');
  }else{
    const voz = acc.id === 'consentimiento' ? 'Le explicas qué le vas a hacer y pides permiso'
      : CL_VOZ_EXAM[acc.id] || (acc.g === 'test' ? 'Le haces la ' + (acc.n || '').replace('Prueba de ', 'prueba de ') : acc.n);
    clDecir(t, 'nota', voz + ': ' + textoFinal, { accId:accIdPista });
  }

  if(t.tiempo <= 0){
    t.tiempo = 0;
    avisar('⏳ Se acabó el tiempo con este paciente: hay que decidir');
    t.fase = 'diagnostico';
  }
  clPanel();
}

function clPanelCaso(cont){
  const t = clTurno, c = t.caso;
  const pctTiempo = t.tiempo / (t.tiempoMax || clTiempoTotal()) * 100;
  const f = t.ficha || {};
  const ev = clEvento();

  const ra = clRasgo(f.rasgo), an = clAnimo(f.animo);

  let html = '';
  if(t.urgente) html += '<div class="cl-urgente-banner">🚨 Urgencia · resuélvelo ya</div>';
  if(t.noche) html += '<div class="cl-noche-banner">🌙 Turno de noche · quedan ' + (clEstado().noche ? clEstado().noche.quedan : 0) + '</div>';

  html +=
    '<div class="cl-ficha' + (t.urgente ? ' urgente' : '') + '">' +
      '<div class="cl-ficha-top">' +
        '<div class="cl-ficha-avatar">' + (c.ava || '🧍') + '</div>' +
        '<div><div class="cl-ficha-nom">' + clPacNom(c, f) + ', ' + clPacEdad(c, f) + '</div>' +
        '<div class="cl-ficha-ocu">' + clPacOcup(c, f) + (f.gen ? ' · de ' + f.gen.comuna : '') +
        ' · consulta por ' + c.zona.toLowerCase() + '</div></div>' +
      '</div>' +
      '<div class="cl-ficha-motivo">“' + c.motivo + '”</div>' +
      (an ? '<div class="cl-animo">' + an.emo + ' ' + an.frase + '</div>' : '') +
      (f.prev ? '<div class="cl-ficha-ctx"><span>' + f.prev + '</span>' +
        (f.deriv ? '<span>' + clDerivador(f.deriv).emo + ' ' + clDerivador(f.deriv).nom + '</span>' : '<span>' + f.origen + '</span>') +
        '<span>' + CL_ESPECIALIDADES[c.esp].emo + ' ' + CL_ESPECIALIDADES[c.esp].nom + '</span>' +
        (f.acomp ? '<span>' + f.acomp.emo + ' viene con ' + f.acomp.nom + '</span>' : '') + '</div>' : '') +
      (t.rapport ? '<div class="cl-ficha-ctx"><span>🤝 confianza ' + '●'.repeat(t.rapport) + '</span></div>' : '') +
      (ra ? '<div class="cl-rasgo"><span class="cl-rasgo-emo">' + ra.emo + '</span>' +
        '<div><b>' + ra.nom + '</b><small>' + ra.aviso + '</small></div></div>' : '') +
      (t.creencia ? '<div class="cl-creencia">Llega convencido de que tiene <b>' + clNombreDx(t.creencia) + '</b>. Ojo con eso.</div>' : '') +
      (t.hist && t.hist.veces
        ? '<div class="cl-historia"><b>' + (CL_ARCOS[c.id] && CL_ARCOS[c.id][t.hist.veces - 1]
            ? 'Capítulo ' + (t.hist.veces + 1) : 'Ya lo conoces') + '</b>' +
          '<p>' + clCapitulo(c.id, t.hist.veces) + '</p>' +
          '<em>' + clResumenHist(t.hist) + '</em></div>'
        : '') +
      (t.fallo
        ? '<div class="cl-fallo"><b>⚠️ La última vez no te resultó</b><p>' + t.fallo.motivo + '</p>' +
          '<em>Si esta vez lo haces bien, queda saldado.</em></div>'
        : '') +
      (t.nota
        ? '<div class="cl-nota-carta"><b>💌 ' + t.nota.de + ' te dejó algo en este caso</b><p>' + t.nota.texto + '</p></div>'
        : '') +
      '<div class="cl-tiempo"><div class="cl-tiempo-barra"><div style="width:' + pctTiempo + '%"></div></div>' +
        '<span>⏳ ' + t.tiempo + '</span></div>' +
      (ev ? '<div class="cl-ficha-ctx"><span>' + ev.emo + ' ' + ev.nom + '</span></div>' : '') +
    '</div>';

  // Sin tablero ni porcentajes: se razona a ciegas, como en la estación.
  // Lo único que se recuerda es contra qué cuadros compite este paciente.
  if(t.fase === 'investigar'){
    html += '<div class="cl-compite"><b>Tienes que decidir entre</b>' +
      t.dif.map(d => '<span>' + clCorto(d) + '</span>').join('') + '</div>';
  }

  // la consulta, como conversación
  if(t.chat && t.chat.length){
    html += '<div class="cl-sec">La consulta</div>';
    const nomPac = clPacNom(c, f).split(' ')[0];
    html += '<div class="cl-chat">';
    t.chat.forEach(m => {
      if(m.de === 'nota'){
        html += '<div class="cl-msg nota' + (m.accId === t.ultima ? ' nueva' : '') + '">' + m.txt;
      }else{
        const quien = m.de === 'kine' ? 'Tú' : m.de === 'acomp' ? (f.acomp ? f.acomp.nom : 'Acompañante') : nomPac;
        html += '<div class="cl-msg ' + m.de + (m.amarilla ? ' amarilla' : '') +
          (m.accId === t.ultima ? ' nueva' : '') + '">' +
          '<span class="cl-msg-de">' + quien + '</span>' + m.txt +
          '<span class="cl-msg-hora">' + m.hora + '</span>';
      }
      html += '</div>';
    });
    html += '</div>';
  }

  if(t.fase === 'investigar'){
    const grupos = { anam:'Preguntar', exam:'Examinar', test:'Pruebas', img:'Imágenes' };
    const conAcciones = Object.keys(grupos).filter(g => t.acciones.some(a => a.g === g));
    if(!conAcciones.includes(t.grupo)) t.grupo = conAcciones[0];
    html += '<div class="cl-sec">¿Qué haces?</div><div class="cl-grupos">';
    conAcciones.forEach(g => html += '<button class="cl-grupo' + (t.grupo === g ? ' on' : '') + '" data-g="' + g + '">' + grupos[g] + '</button>');
    html += '</div><div class="cl-acciones">';
    t.acciones.filter(a => a.g === t.grupo).forEach(a => {
      const ya = t.hechas.includes(a.id);
      const caro = a.plata ? ' · ' + clPlata(a.plata) : '';
      html += '<button class="cl-acc' + (ya ? ' ya' : '') + '"' + (ya ? '' : ' data-acc="' + a.id + '"') + '>' +
        '<span>' + a.n + (a.meta ? '<i>' + a.meta + '</i>' : '') + '</span>' +
        '<small>' + (ya ? 'ya lo hiciste' : '⏳ ' + a.t + caro) + '</small></button>';
    });
    html += '</div>';
    const lista = clPistaLista();
    const s = clPistaSegundos();
    html += '<button class="cl-pista-btn' + (lista ? ' lista' : '') + '" id="clPista">' +
      (lista ? '💡 Usar una pista' : '💡 Pista en ' + Math.floor(s/60) + ':' + String(s % 60).padStart(2,'0')) +
      '<small>' + (lista ? 'Te corrige una anotación del cuaderno y te explica por qué' : 'Se recarga sola cada 5 minutos') + '</small></button>';
    html += '<button class="cl-btn-grande" id="clCerrarDx">🧠 Ya sé qué tiene · dar diagnóstico</button>';
    html += '<button class="cl-btn-derivar" id="clDerivar">↗ Derivar a médico</button>';
  }

  if(t.fase === 'diagnostico'){
    html += '<div class="cl-preg">¿Cuál es tu diagnóstico?</div><div class="cl-opciones">';
    clMezclar(t.dif.slice()).forEach(d =>
      html += '<button class="cl-opc" data-dx="' + d + '"><b>' + clNombreDx(d) + '</b></button>');
    html += '</div>';
  }

  if(t.fase === 'tratamiento'){
    html += '<div class="cl-preg">¿Qué tratamiento indicas? <small>Fase ' + c.fase + '</small></div><div class="cl-opciones">' +
      t.opcTto.map((x,i) => '<button class="cl-opc larga" data-tto="' + i + '">' + x.txt + '</button>').join('') +
      '</div>';
  }

  // repaso del caso: qué decía cada hallazgo y qué se quedó sin buscar
  if(t.fase === 'revision'){
    const r = t.correccion;
    const nota = r.pct >= 85 ? 'Evaluación completa' : r.pct >= 60 ? 'Te faltó explorar algo' : 'Decidiste con muy poco';
    html += '<div class="cl-revision"><div class="cl-revision-tit">' + nota + '</div>' +
      '<div class="cl-revision-pct">' + r.pct + '%</div>' +
      '<div class="cl-revision-sub">Encontraste ' + r.hechas + ' de los ' + r.total +
      ' hallazgos que discriminaban</div></div>';
    if(r.filas.length){
      html += '<div class="cl-sec">Qué decía cada cosa</div><div class="cl-pistas">';
      r.filas.forEach(fi => {
        html += '<div class="cl-pista-item"><b>' + fi.acc + '</b>' +
          (fi.apoya.length ? '<span class="cl-lee sube">↑ apoyaba ' + fi.apoya.join(', ') + '</span>' : '') +
          (fi.descarta.length ? '<span class="cl-lee baja">↓ descartaba ' + fi.descarta.join(', ') + '</span>' : '') +
          '</div>';
      });
      html += '</div>';
    }
    if(r.faltaron.length){
      html += '<div class="cl-sec">Lo que no alcanzaste a buscar</div>' +
        '<div class="cl-nota izq">' + r.faltaron.join(' · ') + '</div>';
    }
    // el docente, solo si está puesto el modo simulación
    if(clSimulacion()){
      const pa = clEvaluarPauta(t);
      const nota = pa.pct >= 80 ? 'Aprobada con holgura' : pa.pct >= 60 ? 'Aprobada, con observaciones' : 'Reprobada: faltó lo básico';
      html += '<div class="cl-pauta"><div class="cl-pauta-tit">🧑‍🏫 Pauta del docente</div>' +
        '<div class="cl-pauta-nota">' + pa.pct + '%</div>' +
        '<div class="cl-pauta-sub">' + nota + ' · ' + pa.obt + ' de ' + pa.tot + ' puntos</div>' +
        '<div class="cl-temas">' + Object.keys(pa.doms).map(d => {
          const v = pa.doms[d], pc = Math.round(v.obt / v.tot * 100);
          return '<div class="cl-tema"><span>' + d + '</span>' +
            '<div class="cl-tema-barra"><div class="' + (pc < 50 ? 'mal' : pc < 80 ? 'medio' : '') + '" style="width:' + pc + '%"></div></div>' +
            '<b>' + pc + '%</b></div>';
        }).join('') + '</div>';
      if(pa.faltó.length){
        html += '<div class="cl-pauta-falto"><b>Lo que el docente te habría marcado</b><ul>' +
          pa.faltó.map(x => '<li>' + x.txt + '</li>').join('') + '</ul></div>';
      }else{
        html += '<div class="cl-pauta-falto"><b>No te marcó nada. Estación completa.</b></div>';
      }
      html += '</div>';
    }
    html += '<button class="cl-btn-grande" id="clCerrarRev">Cerrar el caso</button>';
  }

  cont.innerHTML = html;
  const cr = document.getElementById('clCerrarRev');
  if(cr) cr.onclick = () => (clTurno && clTurno.diario) ? clCerrarDiario() : clCerrarCaso();
  cont.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { t.grupo = b.dataset.g; jxSonido('tap'); clPanel(); });
  cont.querySelectorAll('[data-acc]').forEach(b => b.onclick = () => clHacerAccion(b.dataset.acc));
  cont.querySelectorAll('[data-dx]').forEach(b => b.onclick = () => clResponderDx(b.dataset.dx));
  cont.querySelectorAll('[data-tto]').forEach(b => b.onclick = () => clResponderTto(parseInt(b.dataset.tto,10)));
  const cd = document.getElementById('clCerrarDx');
  if(cd) cd.onclick = () => { t.fase = 'diagnostico'; jxSonido('tap'); clPanel(); };
  const dv = document.getElementById('clDerivar');
  if(dv) dv.onclick = clDerivarPaciente;
  const bp = document.getElementById('clPista');
  if(bp) bp.onclick = clUsarPista;
}

function clDerivarPaciente(){
  const t = clTurno, c = t.caso, e = clEstado();
  t.derivado = true;
  const urgente = t.urgente || c.urgente;
  if(c.derivar){
    // caso con banderas rojas: derivar ERA lo correcto
    const rep = Math.round((urgente ? 7 : 4) * clEfEvento('rep', 1));
    const plata = Math.round((urgente ? 900 : 400) * c.dif * clMultPagoCaso());
    e.reputacion += rep;
    e.dinero += plata;
    e.atendidos++; e.aciertos++;
    clConsumirConsulta();
    e.racha++; if(e.racha > e.mejorRacha) e.mejorRacha = e.racha;
    e.vistos[c.id] = (e.vistos[c.id] || 0) + 1;
    if(!e.dominados.includes(c.id) && (e.vistos[c.id] || 0) >= 1) e.dominados.push(c.id);
    const h = clHistCrear(c.id); h.veces++; h.ultima = Date.now();
    clGastarEvento();
    clAvanzarMision('derivar'); clAvanzarMision('atender', { zona:c.zona });
    clSumarSemana('atendidos'); clSumarSemana('derivados');
    if(t.noche && e.noche){ e.noche.aciertos++; e.noche.plata += plata; e.noche.quedan--; }
    const r = jxRecompensar(urgente ? 16 : 10, urgente ? 40 : 25, { desde:document.getElementById('jxScreenClinica') });
    const seguir = t.noche;
    clTurno = null; clGuardar(true);
    jxCelebrar({ titulo: urgente ? '¡Derivación a tiempo! 🚑' : 'Derivación correcta 🚑',
      sub:c.dato, monedas: urgente ? 16 : 10, xp: urgente ? 40 : 25,
      subioNivel:r.subioNivel, nivel:r.nivel, textoNext: seguir ? 'Siguiente paciente' : 'Volver a la sala',
      onNext:()=>{ clVista='recepcion'; clSesionAbierta=null;
                   if(seguir && e.noche && e.noche.quedan > 0) clIniciarCaso();
                   else if(seguir) clCerrarNoche();
                   else clPanel(); } });
  }else{
    e.reputacion = Math.max(0, e.reputacion - (clEfEvento('castigo', false) ? 4 : 2));
    e.atendidos++; e.fallos++; e.racha = 0;
    clGastarEvento();
    if(t.noche && e.noche) e.noche.quedan--;
    const seguir = t.noche && e.noche;
    clTurno = null; clGuardar(true);
    jxSonido('mal');
    avisar('Era un cuadro que podías tratar tú: derivar sin necesidad te resta reputación');
    clVista = 'recepcion';
    if(seguir && e.noche.quedan > 0) clIniciarCaso();
    else if(seguir) clCerrarNoche();
    else clPanel();
  }
}

function clResponderDx(id){
  const t = clTurno, c = t.caso, e = clEstado();
  if(id !== c.id){
    t.errores++;
    jxSonido('mal'); jxVibrar(30);
    // en el caso del día no hay segunda oportunidad: se sigue igual
    if(t.diario){
      t.dxFallado = true;
      avisar('❌ Era ' + c.nom + '. En el caso del día no hay reintentos.');
      t.opcTto = clMezclar([{ txt:c.tto, ok:true }, ...clTtoMal(c).map(x => ({ txt:x, ok:false }))]);
      t.fase = 'tratamiento';
      clPanel();
      return;
    }
    e.reputacion = Math.max(0, e.reputacion - (clEfEvento('castigo', false) ? 2 : 1));
    e.racha = 0;
    const pan = document.getElementById('clPanel');
    pan.classList.remove('cl-error'); void pan.offsetWidth; pan.classList.add('cl-error');
    avisar('❌ Ese diagnóstico no explica todos los hallazgos · −1 reputación');
    return;
  }
  jxSonido('bien');
  t.opcTto = clMezclar([{ txt:c.tto, ok:true }, ...clTtoMal(c).map(x => ({ txt:x, ok:false }))]);
  t.fase = 'tratamiento';
  clPanel();
}

/* Los distractores plausibles reemplazan a los de la ficha. */
function clTtoMal(caso){ return CL_TTO_MAL[caso.id] || caso.ttoMal; }

function clResponderTto(i){
  const t = clTurno, e = clEstado();
  if(!t.opcTto[i].ok){
    // en el caso del día tampoco hay reintento acá
    if(t.diario){
      t.errores++; t.ttoFallado = true;
      jxSonido('mal'); jxVibrar(30);
      avisar('❌ Lo correcto era: ' + t.caso.tto);
      t.correccion = clLecturaHallazgos(t);
      t.fase = 'revision';
      clPanel();
      return;
    }
    // elegir mal el manejo cuesta lo mismo que errar el diagnóstico:
    // se puede reintentar, pero el caso ya no cierra perfecto
    t.errores++;
    e.reputacion = Math.max(0, e.reputacion - (clEfEvento('castigo', false) ? 2 : 1));
    e.racha = 0;
    jxSonido('mal'); jxVibrar(30);
    const pan = document.getElementById('clPanel');
    if(pan){ pan.classList.remove('cl-error'); void pan.offsetWidth; pan.classList.add('cl-error'); }
    avisar('❌ Ese manejo no corresponde para la fase ' + t.caso.fase + ' · −1 reputación');
    clPanel();
    return;
  }
  jxSonido('gana');
  // antes de cerrar, se corrige el cuaderno
  t.correccion = clLecturaHallazgos(t);
  t.fase = 'revision';
  clPanel();
}

function clCerrarCaso(){
  const t = clTurno, c = t.caso, e = clEstado();
  const perfecto = t.errores === 0;
  const eficiencia = 1 + (t.tiempo || 0) / 20;   // llegar con tiempo de sobra paga más
  const base = 130 * c.dif;
  const vuelve = !!(t.hist && t.hist.veces);
  const confianza = vuelve ? 1.15 : 1;           // el que ya te conoce llega con la ficha hecha
  const gracia = clEfRasgo(t.ficha && t.ficha.rasgo, 'pago', 1);  // el conversador recomienda
  const noche = t.noche && e.noche ? CL_NOCHE_PAGO : 1;
  const tema = clEsTema(c) ? 1.45 : 1;   // la zona de la semana paga más
  const der = t.ficha && t.ficha.deriv ? clDerivador(t.ficha.deriv) : null;
  const pagoDer = der ? der.pago : 1;
  // el cuaderno pesa: acertar de suerte paga la mitad que razonar bien
  const cuad = t.correccion || clLecturaHallazgos(t);
  const razon = 0.6 + (cuad.pct / 100) * 0.6;    // entre 0,6x y 1,2x
  const dinero = Math.round(base * clMultPagoCaso() * (perfecto ? 1.5 : 1) * eficiencia * confianza * gracia * noche * razon * tema * pagoDer);
  let rep = perfecto ? 2 + clRepExtra() : 1;
  if(perfecto && cuad.pct >= 85) rep += 1;       // razonar bien también suma prestigio
  if(!perfecto && clEfEvento('castigo', false)) rep = 0;   // con la tele mirando, el error no suma
  rep = Math.round(rep * clEfEvento('rep', 1));
  const monedas = perfecto ? 8 : 4;

  e.dinero += dinero;
  e.reputacion += rep;
  e.atendidos++;
  if(perfecto){ e.aciertos++; e.racha++; if(e.racha > e.mejorRacha) e.mejorRacha = e.racha; }
  else { e.aciertos++; e.fallos += t.errores; e.racha = 0; }
  e.vistos[c.id] = (e.vistos[c.id] || 0) + 1;
  // la ficha del álbum ahora exige acertar Y haber razonado bien
  if(perfecto && cuad.pct >= 70 && (e.vistos[c.id] || 0) >= 2 && !e.dominados.includes(c.id)) e.dominados.push(c.id);
  // solo el paciente de la ficha suma historia: los generados son otra persona
  const canon = clEsCanon(t.ficha);
  if(canon){ const h = clHistCrear(c.id); h.veces++; h.ultima = Date.now(); }
  clConsumirConsulta();
  clGastarEvento();

  clAvanzarMision('atender', { zona:c.zona });
  clSumarSemana('atendidos'); if(perfecto) clSumarSemana('aciertos');
  if(der){ clMoverConfianza(der.id, perfecto ? 4 : -5); e.deriv[der.id].enviados++; }
  if(clEsTema(c)) clSumarSemana('puntos', 2);
  if(perfecto){
    clAvanzarMision('racha');
    if(!t.imagenes) clAvanzarMision('sinImg');
  }

  // memoria de errores: si te equivocaste queda anotado; si esta vez
  // lo hiciste bien y venías debiendo, queda saldado
  let saldado = false;
  if(canon){
    if(!perfecto){
      clAnotarFallo(c.id, 'Te equivocaste ' + t.errores + (t.errores === 1 ? ' vez' : ' veces') +
        ' antes de dar con el cuadro, y ' + c.pac + ' se fue con un tratamiento que empezó torcido.');
    }else if(cuad.pct >= 70 && clSaldarFallo(c.id)){
      saldado = true;
      e.reputacion += 2;
    }
  }

  const antes = clEspecialidadesAbiertas().length;
  const r = jxRecompensar(monedas, 12 * c.dif, { desde: document.getElementById('jxScreenClinica') });
  const nuevas = clEspecialidadesAbiertas().length > antes;

  // en el turno de noche no hay seguimiento: se resuelve y sale
  const enNoche = t.noche && e.noche;
  if(enNoche){ if(perfecto) e.noche.aciertos++; e.noche.plata += dinero; e.noche.quedan--; }

  // fuera del turno, el paciente queda EN TRATAMIENTO hasta el alta.
  // Los de bandera roja no: esos se van derivados igual.
  let sub = c.dato;
  const agendaLlena = e.activos.length >= CL_ACTIVOS_MAX;
  if(!enNoche && !c.derivar && agendaLlena){
    sub += ' · Tu agenda de tratamiento está llena (' + CL_ACTIVOS_MAX + '), así que ' +
           clPacNom(c, t.ficha) + ' queda con otro kinesiólogo del equipo. Dale de alta a alguien para poder seguirlos tú.';
  }else if(!enNoche && !c.derivar){
    e.activos.push({
      id:c.id, sesion:0, progreso:0, recaidas:0, nota:'', ultimaCarga:null,
      adh: Math.max(15, Math.min(95, CL_ADH_INICIAL + clEfRasgo(t.ficha && t.ficha.rasgo, 'adherencia', 0) +
           (clTieneHabil('empatia') ? 15 : 0) + (t.rapport || 0) * 8)),
      rasgo: t.ficha ? t.ficha.rasgo : null, alarma:null, faltas:0, visto:Date.now(),
      // si no preguntaste por creencias, la bandera amarilla viaja escondida
      amarilla: t.ficha ? t.ficha.amarilla : null,
      amarillaVista: !!t.amarillaVista,
      gen: t.ficha ? t.ficha.gen : null,      // quién es, para no perderlo en el tratamiento
      // mediciones que se van moviendo sesión a sesión
      med: { dolor: 6 + Math.floor(Math.random()*3), rango: 45 + Math.floor(Math.random()*20), hito:0 },
      compl: null,
    });
    sub += ' · ' + clPacNom(c, t.ficha) + ' queda en tratamiento: llévalo hasta el alta.';
  }else if(c.derivar){
    sub += ' · Acertaste el cuadro, pero ojo: acá lo correcto era derivar sin tratar.';
  }
  if(nuevas) sub += ' · ¡Se abrió una especialidad nueva!';

  const seguir = enNoche;
  clTurno = null;
  clGuardar(true);
  c3Poblar();

  sub = 'Razonamiento ' + cuad.pct + '%. ' + sub;
  if(saldado) sub = '✓ Le devolviste la mano a ' + c.pac + ', que se te había ido antes. ' + sub;
  jxCelebrar({
    titulo: perfecto ? '¡Diagnóstico certero! 🎯' : 'Diagnóstico cerrado',
    sub, monedas, xp: 12 * c.dif, subioNivel: r.subioNivel, nivel: r.nivel,
    textoNext: seguir ? 'Siguiente paciente' : 'Ver la clínica',
    onNext: () => {
      clVista = 'recepcion'; clSesionAbierta = null;
      if(seguir && e.noche && e.noche.quedan > 0) clIniciarCaso();
      else if(seguir) clCerrarNoche();
      else clPanel();
    },
  });
}

/* ---------- tratamiento por sesiones ----------
   Diagnosticar ya no cierra el caso: el paciente queda EN TRATAMIENTO y
   hay que llevarlo sesión a sesión hasta el alta. La fase avanza sola
   con el progreso y la carga correcta cambia con ella, así que no sirve
   elegir siempre lo mismo: hay que ir leyendo en qué fase está. */

const CL_FASES = [
  { desde:0,  nom:'Aguda',    carga:'suave',
    nota:'En fase aguda manda el control del dolor y la inflamación: carga baja y movimiento tolerable.' },
  { desde:35, nom:'Subaguda', carga:'moderada',
    nota:'Ya bajó la irritabilidad: toca subir la carga de a poco y empezar a recuperar función.' },
  { desde:70, nom:'Retorno',  carga:'intensa',
    nota:'Fase de retorno: sin carga alta el tejido no se adapta y el alta no se sostiene.' },
];
const CL_CARGAS = [
  { id:'suave',    nom:'Carga suave',    emo:'🌱', desc:'Dolor controlado, rangos libres, isométricos' },
  { id:'moderada', nom:'Carga moderada', emo:'⚖️', desc:'Fuerza progresiva y trabajo funcional' },
  { id:'intensa',  nom:'Carga intensa',  emo:'🔥', desc:'Pliometría, velocidad y gesto deportivo' },
];

function clFaseDe(prog){
  let f = CL_FASES[0];
  CL_FASES.forEach(x => { if(prog >= x.desde) f = x; });
  return f;
}
function clIdxCarga(id){ return CL_CARGAS.findIndex(c => c.id === id); }

/* Los pacientes que quedan botados pierden adherencia y te cuestan prestigio. */
/* Los que llevan días sin sesión se desmotivan. Pero si TÚ estuviste fuera
   varios días (vacaciones, pruebas), no se castiga como abandono: hicieron
   ejercicios en casa y vuelven un poco más flojos. Antes, volver después de
   un mes dejaba a todos en 0% y la reputación por el suelo. */
function clRevisarAbandonos(){
  const c = clEstado();
  const ahora = Date.now();
  let olvidados = 0, enCasa = 0;
  c.activos.forEach(pac => {
    if(!pac.visto){ pac.visto = ahora; return; }
    const dias = Math.floor((ahora - pac.visto) / 86400000);
    if(dias < 1) return;
    if(dias >= 3){
      pac.adh = Math.max(30, pac.adh - 15);
      enCasa++;
    }else{
      pac.adh = Math.max(0, pac.adh - 12 * dias);
      olvidados++;
    }
    pac.visto = ahora;
  });
  if(olvidados){
    c.reputacion = Math.max(0, c.reputacion - 1);
    avisar('📉 ' + olvidados + ' paciente(s) llevaban días sin sesión: bajó su adherencia.');
  }
  if(enCasa) avisar('🏠 Volviste: ' + enCasa + ' paciente(s) siguieron con ejercicios en casa. Llegan un poco más desmotivados.');
}

/* ---------- mensajes entre sesiones ----------
   Se generan al volver a la clínica, según el tiempo real que pasó desde
   la última sesión. El que está peor escribe más seguido. */
function clSortearMensajes(){
  const c = clEstado();
  const ahora = Date.now();
  c.activos.forEach(pac => {
    if(pac.msg || pac.alarma) return;
    if(ahora - (pac.visto || 0) < CL_MSG_ESPERA) return;
    if(Math.random() > CL_MSG_PROB) return;
    // el que va bien manda el mensaje bueno; el que va mal, uno de problema
    const buenos = ['gracias','mejor','tirante'];
    const malos  = ['duele','falto','internet','trabajo','noche'];
    const pool = (pac.adh >= 65 && pac.progreso >= 40) ? buenos : malos;
    const id = pool[Math.floor(Math.random() * pool.length)];
    pac.msg = { id, cuando: ahora };
  });
}
function clMensajesPendientes(){
  return clEstado().activos.filter(p => p.msg).length;
}
function clResponderMensaje(idx, op){
  const c = clEstado();
  const pac = c.activos[idx];
  if(!pac || !pac.msg) return;
  const m = CL_MENSAJES.find(x => x.id === pac.msg.id);
  const o = m && m.ops[op];
  if(!o) return;
  pac.msg = null;
  pac.visto = Date.now();
  if(o.ok){
    pac.adh = Math.min(100, pac.adh + 12);
    c.reputacion += 1;
    jxSonido('bien'); jxVibrar(12);
    avisar('💬 ' + o.dice);
  }else{
    pac.adh = Math.max(0, pac.adh - 14);
    jxSonido('mal'); jxVibrar(25);
    avisar('💬 ' + o.dice);
  }
  clGuardar(true);
  clPanel();
}
/* Si no le contestas, el paciente se desmotiva solo. */
function clCaducarMensajes(){
  const c = clEstado();
  const ahora = Date.now();
  let ignorados = 0;
  c.activos.forEach(pac => {
    if(!pac.msg) return;
    const edad = ahora - pac.msg.cuando;
    if(edad < 20 * 60000) return;   // veinte minutos sin respuesta
    pac.msg = null;
    // un mensaje de hace días es de cuando no estabas jugando: se archiva sin castigo
    if(edad > 12 * 3600000) return;
    pac.adh = Math.max(0, pac.adh - 10);
    ignorados++;
  });
  if(ignorados) avisar('💬 ' + ignorados + ' mensaje(s) quedaron sin responder y bajó la adherencia.');
}

function clPagarSesion(caso){
  const c = clEstado();
  clAsentar();
  c.dinero += Math.round(38 * caso.dif * clMultPagoCaso());
}

function clAlta(idx){
  const c = clEstado();
  const pac = c.activos[idx];
  const caso = KIN_CASOS.find(x => x.id === pac.id);
  const limpio = pac.recaidas === 0;
  const bono = Math.round(240 * caso.dif * clMultPagoCaso() * (limpio ? 1.6 : 1));
  c.dinero += bono;
  c.reputacion += Math.round((limpio ? 3 + clRepExtra() : 1) * clEfEvento('rep', 1));
  c.altas = (c.altas || 0) + 1;
  clSumarSemana('altas');
  c.pxHabil++;                                    // cada alta da un punto de habilidad
  if(limpio && !c.dominados.includes(caso.id)) c.dominados.push(caso.id);
  if(!limpio && !pac.gen) clAnotarFallo(caso.id, caso.pac + ' llegó al alta con ' + pac.recaidas +
    (pac.recaidas === 1 ? ' recaída' : ' recaídas') + ' en el camino: la dosificación se te fue de las manos.');
  else clSaldarFallo(caso.id);
  const h = clHistCrear(caso.id);
  h.altas++; h.sesiones += pac.sesion; h.recaidas += pac.recaidas; h.ultima = Date.now();
  c.activos.splice(idx, 1);
  clSesionAbierta = null;
  if(limpio) clAvanzarMision('alta');
  const r = jxRecompensar(limpio ? 12 : 6, 20 * caso.dif, { desde:document.getElementById('jxScreenClinica') });
  clGuardar(true); c3Poblar();
  jxCelebrar({
    titulo: limpio ? '¡Alta sin recaídas! 🎉' : 'Paciente de alta',
    sub: clPacNom(caso, pac) + ' terminó su tratamiento en ' + pac.sesion + ' sesiones. ' + caso.dato +
         (h.altas > 1 ? ' Es la ' + h.altas + 'ª vez que le das el alta.' : ''),
    monedas: limpio ? 12 : 6, xp: 20 * caso.dif,
    subioNivel:r.subioNivel, nivel:r.nivel, textoNext:'Seguir',
    onNext:()=>{ clVista='recepcion'; clPanel(); },
  });
}

/* Alta cuando llega a 100. Cada sesión paga algo; el alta paga el grueso.
   La adherencia manda: sin ella la mejor dosificación no rinde. */
function clSesion(idx, cargaId){
  const c = clEstado();
  const pac = c.activos[idx];
  if(!pac) return;
  const caso = KIN_CASOS.find(x => x.id === pac.id);
  if(!caso){ c.activos.splice(idx, 1); clSesionAbierta = null; clPanel(); return; }
  const fase = clFaseDe(pac.progreso);
  pac.visto = Date.now();

  // sesión dedicada a la bandera amarilla: solo se puede si la detectaste
  if(cargaId === 'amarilla'){
    const am = CL_AMARILLAS.find(a => a.id === pac.amarilla);
    if(!am || !pac.amarillaVista) return;
    pac.sesion++;
    pac.amarilla = null;
    pac.adh = Math.min(100, pac.adh + 18);
    pac.progreso = Math.min(100, pac.progreso + 6);
    pac.nota = '🟡 Abordaste ' + am.nom.toLowerCase() + '. ' + am.ensena + ' Desde ahora el tratamiento rinde completo.';
    jxSonido('bien'); jxVibrar(15);
    clPagarSesion(caso);
    clAvanzarMision('sesion');
    clGuardar(true); clPanel();
    return;
  }

  // sesión de educación: no carga tejido, pero recupera al paciente
  if(cargaId === 'educar'){
    pac.sesion++;
    pac.adh = Math.min(100, pac.adh + 26);
    pac.progreso = Math.min(100, pac.progreso + 4);
    pac.nota = '📘 Sesión de educación. Entendió qué le pasa y por qué se trata así: vuelve más comprometido.';
    pac.ultimaCarga = cargaId;
    jxSonido('bien');
    clPagarSesion(caso);
    clAvanzarMision('sesion');
    clGuardar(true); clPanel();
    return;
  }

  // con la adherencia por el suelo, simplemente no llega
  if(pac.adh < 35 && Math.random() < 0.45){
    pac.faltas++;
    pac.adh = Math.max(0, pac.adh - 4);
    pac.progreso = Math.max(0, pac.progreso - 3);
    pac.nota = '📵 No llegó a la sesión' + (pac.faltas > 1 ? ' (van ' + pac.faltas + ')' : '') +
               '. Con la adherencia tan baja el tratamiento no avanza: toca educar antes que cargar.';
    jxSonido('mal'); jxVibrar(20);
    clGuardar(true); clPanel();
    return;
  }

  const dist = Math.abs(clIdxCarga(cargaId) - clIdxCarga(fase.carga));
  const factorAdh = 0.55 + (pac.adh / 100) * 0.65;   // entre 0,55x y 1,2x
  // una bandera amarilla sin abordar frena el tratamiento, la hayas visto o no
  const factorAm = pac.amarilla ? 0.5 : 1;
  pac.sesion++;
  clAvanzarMision('sesion');
  let nota, delta;
  if(dist === 0){
    delta = Math.round((16 + Math.floor(Math.random() * 6)) * factorAdh * factorAm);
    nota = '✓ Buena dosificación. ' + fase.nota;
    pac.adh = Math.min(100, pac.adh + 6);
    jxSonido('bien');
    if(pac.amarilla){
      // la pista sin regalar la respuesta: la dosis estaba bien y no avanza
      nota += pac.amarillaVista
        ? ' Pero la bandera amarilla sigue ahí y le está frenando el progreso.'
        : ' Aun así avanza mucho menos de lo que debería: algo no está en el tejido.';
      pac.adh = Math.max(0, pac.adh - 5);
    }
  }else if(dist === 1){
    delta = Math.round((5 + Math.floor(Math.random() * 4)) * factorAdh * factorAm);
    nota = '~ Avanza, pero la carga no era la ideal para fase ' + fase.nom.toLowerCase() + '. ' + fase.nota;
    pac.adh = Math.max(0, pac.adh - 7);
    jxSonido('tap');
  }else{
    delta = -14;
    pac.recaidas++;
    pac.adh = Math.max(0, pac.adh - 16);
    nota = '✗ Recaída. ' + fase.nota;
    jxSonido('mal'); jxVibrar(30);
  }
  if(clEfRasgo(pac.rasgo, 'seAburre', false)) pac.adh = Math.max(0, pac.adh - 5);
  pac.progreso = Math.max(0, Math.min(100, pac.progreso + delta));
  // las mediciones siguen al progreso: el dolor baja y el rango sube
  if(!pac.med) pac.med = { dolor:6, rango:50, hito:0 };
  pac.med.dolor = Math.max(0, Math.round((10 - pac.progreso / 12) * 10) / 10);
  pac.med.rango = Math.min(100, Math.round(45 + pac.progreso * 0.55));
  pac.med.hito = Math.floor(pac.progreso / 25);
  pac.nota = nota;
  pac.ultimaCarga = cargaId;
  clPagarSesion(caso);

  // muy de vez en cuando el caso se tuerce de verdad y hay que derivar
  if(pac.progreso < 100 && !pac.compl && pac.sesion >= 2 && Math.random() < CL_COMPL_PROB){
    pac.compl = CL_COMPLICACIONES[Math.floor(Math.random() * CL_COMPLICACIONES.length)].id;
    jxSonido('mal'); jxVibrar(50);
    clGuardar(true); clPanel();
    return;
  }

  // a veces aparece un signo nuevo y hay que decidir en el momento
  if(pac.progreso < 100 && !pac.alarma && Math.random() < CL_ALARMA_PROB){
    pac.alarma = CL_ALARMAS[Math.floor(Math.random() * CL_ALARMAS.length)].id;
    jxSonido('mal'); jxVibrar(35);
    clGuardar(true); clPanel();
    return;
  }

  if(pac.progreso >= 100){ clAlta(idx); return; }
  clGuardar(true);
  clPanel();
}

/* La complicación solo tiene una salida correcta: frenar y derivar. */
function clResponderComplicacion(idx, decision){
  const c = clEstado();
  const pac = c.activos[idx];
  if(!pac || !pac.compl) return;
  const co = CL_COMPLICACIONES.find(x => x.id === pac.compl);
  const caso = KIN_CASOS.find(x => x.id === pac.id);
  pac.compl = null;
  if(decision === 'derivar'){
    c.reputacion += 4;
    c.activos.splice(idx, 1);
    clSesionAbierta = null;
    clSumarSemana('derivados');
    const r = jxRecompensar(14, clXp(35), { desde:document.getElementById('jxScreenClinica') });
    clGuardar(true); c3Poblar();
    jxCelebrar({ titulo:'Lo pescaste a tiempo 🚑',
      sub:(caso ? clPacNom(caso, pac) : 'El paciente') + ' quedó con el médico. ' + co.dice,
      monedas:14, xp:clXp(35), subioNivel:r.subioNivel, nivel:r.nivel,
      textoNext:'Volver a la clínica', onNext:()=>{ clVista='recepcion'; clPanel(); } });
    return;
  }
  // seguir tratando algo que ya no es lo que creías
  c.reputacion = Math.max(0, c.reputacion - 5);
  pac.recaidas++;
  pac.adh = Math.max(0, pac.adh - 20);
  pac.progreso = Math.max(0, pac.progreso - 25);
  pac.nota = '✗ Seguiste tratando y el cuadro empeoró. ' + co.dice;
  if(!pac.gen) clAnotarFallo(pac.id, 'Se te torció el caso y seguiste tratando igual. ' + co.dice);
  jxSonido('mal'); jxVibrar(40);
  clGuardar(true); clPanel();
}

/* Alarma en plena sesión: seguir, bajar la carga o derivar. */
function clResponderAlarma(idx, decision){
  const c = clEstado();
  const pac = c.activos[idx];
  if(!pac || !pac.alarma) return;
  const al = CL_ALARMAS.find(a => a.id === pac.alarma);
  const caso = KIN_CASOS.find(x => x.id === pac.id);
  pac.alarma = null;
  if(al.ok === decision){
    c.reputacion += 2;
    pac.adh = Math.min(100, pac.adh + 8);
    pac.nota = '✓ ' + al.dice;
    jxSonido('bien'); jxVibrar(15);
    if(decision === 'derivar'){
      c.activos.splice(idx, 1);
      clSesionAbierta = null;
      clGuardar(true); c3Poblar();
      jxCelebrar({ titulo:'Frenaste a tiempo 🚑',
        sub:(caso ? clPacNom(caso, pac) : 'El paciente') + ' quedó en manos del médico. ' + al.dice,
        monedas:10, xp:25, textoNext:'Volver a la clínica',
        onNext:()=>{ clVista='recepcion'; clPanel(); } });
      jxRecompensar(10, 25, { desde:document.getElementById('jxScreenClinica') });
      return;
    }
    if(decision === 'bajar') pac.progreso = Math.max(0, pac.progreso - 4);
  }else{
    c.reputacion = Math.max(0, c.reputacion - 2);
    pac.recaidas++;
    pac.adh = Math.max(0, pac.adh - 12);
    pac.progreso = Math.max(0, pac.progreso - 12);
    pac.nota = '✗ No era la decisión correcta. ' + al.dice;
    jxSonido('mal'); jxVibrar(30);
  }
  clGuardar(true); clPanel();
}

function clPanelSesion(cont, idx){
  const c = clEstado();
  const pac = c.activos[idx];
  if(!pac){ clSesionAbierta = null; clPanel(); return; }
  const caso = KIN_CASOS.find(x => x.id === pac.id);
  const fase = clFaseDe(pac.progreso);
  const h = clHist(caso.id);
  const ra = clRasgo(pac.rasgo);
  const adh = Math.round(pac.adh);
  const adhNom = adh >= 70 ? 'comprometido' : adh >= 45 ? 'irregular' : 'a punto de abandonar';
  const alarma = pac.alarma ? CL_ALARMAS.find(a => a.id === pac.alarma) : null;

  let html =
    '<div class="cl-ficha">' +
      '<div class="cl-ficha-top">' +
        '<div class="cl-ficha-avatar">' + (caso.ava || '🧍') + '</div>' +
        '<div><div class="cl-ficha-nom">' + clPacNom(caso, pac) + ', ' + clPacEdad(caso, pac) + '</div>' +
        '<div class="cl-ficha-ocu">' + caso.nom + '</div></div>' +
      '</div>' +
      (h && h.altas ? '<div class="cl-ficha-ctx"><span>Ya lo trataste antes · ' + clResumenHist(h) + '</span></div>' : '') +
      (ra ? '<div class="cl-rasgo chico"><span class="cl-rasgo-emo">' + ra.emo + '</span><div><b>' + ra.nom + '</b><small>' + ra.desc + '</small></div></div>' : '') +
      '<div class="cl-fase">Sesión ' + (pac.sesion + 1) + ' · fase <b>' + fase.nom + '</b>' +
        (pac.recaidas ? ' · ' + pac.recaidas + ' recaída(s)' : '') +
        (pac.faltas ? ' · ' + pac.faltas + ' falta(s)' : '') + '</div>' +
      '<div class="cl-prog"><div style="width:' + pac.progreso + '%"></div></div>' +
      '<div class="cl-prog-n">' + Math.round(pac.progreso) + '% recuperado</div>' +
      '<div class="cl-adh-fila"><span>Adherencia</span>' +
        '<div class="cl-adh"><div class="' + (adh < 35 ? 'baja' : adh < 70 ? 'media' : '') + '" style="width:' + adh + '%"></div></div>' +
        '<span>' + adh + '% · ' + adhNom + '</span></div>' +
      (pac.med ? '<div class="cl-medidas">' +
        '<div><b>' + pac.med.dolor.toFixed(1).replace('.', ',') + '</b><span>dolor / 10</span></div>' +
        '<div><b>' + pac.med.rango + '%</b><span>del rango</span></div>' +
        '<div><b>' + ['—','se viste solo','sube escaleras','camina 30 min','vuelve a lo suyo'][pac.med.hito] + '</b><span>hito logrado</span></div>' +
        '</div>' : '') +
      (pac.nota ? '<div class="cl-nota-sesion">' + pac.nota + '</div>' : '') +
    '</div>';

  // solo se ve si preguntaste por creencias durante la evaluación
  const am = (pac.amarilla && pac.amarillaVista) ? CL_AMARILLAS.find(a => a.id === pac.amarilla) : null;
  if(am){
    html += '<div class="cl-amarilla"><b>' + am.emo + ' Bandera amarilla: ' + am.nom + '</b>' +
      '<p>' + am.dice + '</p><em>' + am.abordaje + '</em></div>';
  }

  // el caso se torció: hay que decidir antes que nada
  const compl = pac.compl ? CL_COMPLICACIONES.find(x => x.id === pac.compl) : null;
  if(compl){
    html += '<div class="cl-alarma grave"><b>🚨 Esto ya no es lo que creías</b><p>' + compl.txt + '</p></div>' +
      '<div class="cl-preg">¿Qué haces?</div><div class="cl-opciones">' +
      '<button class="cl-opc" data-compl="derivar"><b>🚑 Frenar y derivar hoy mismo</b><small>Esto se salió de lo kinésico</small></button>' +
      '<button class="cl-opc" data-compl="seguir"><b>▶️ Seguir con el tratamiento</b><small>Puede ser parte de la evolución</small></button>' +
      '</div><button class="cl-btn-derivar" id="clVolverRecep">‹ Volver a la clínica</button>';
    cont.innerHTML = html;
    cont.querySelectorAll('[data-compl]').forEach(b2 => b2.onclick = () => clResponderComplicacion(idx, b2.dataset.compl));
    document.getElementById('clVolverRecep').onclick = () => { clSesionAbierta = null; jxSonido('tap'); clPanel(); };
    return;
  }

  // mensaje sin responder: manda sobre todo lo demás
  const msg = pac.msg ? CL_MENSAJES.find(x => x.id === pac.msg.id) : null;
  if(msg){
    html += '<div class="cl-chat" style="margin-bottom:12px">' +
      '<div class="cl-msg pac"><span class="cl-msg-de">' + clPacNom(caso, pac) + '</span>' + msg.txt +
      '<span class="cl-msg-hora">' + new Date(pac.msg.cuando).getHours().toString().padStart(2,'0') + ':' +
      new Date(pac.msg.cuando).getMinutes().toString().padStart(2,'0') + '</span></div></div>' +
      '<div class="cl-preg">¿Qué le contestas?</div><div class="cl-opciones">' +
      msg.ops.map((o, i) => '<button class="cl-opc larga" data-msg="' + i + '">' + o.txt + '</button>').join('') +
      '</div><button class="cl-btn-derivar" id="clVolverRecep">‹ Volver a la clínica</button>';
    cont.innerHTML = html;
    cont.querySelectorAll('[data-msg]').forEach(b => b.onclick = () => clResponderMensaje(idx, parseInt(b.dataset.msg, 10)));
    document.getElementById('clVolverRecep').onclick = () => { clSesionAbierta = null; jxSonido('tap'); clPanel(); };
    return;
  }

  if(alarma){
    html += '<div class="cl-alarma"><b>⚠️ Algo cambió</b><p>' + alarma.txt + '</p></div>' +
      '<div class="cl-preg">¿Qué haces?</div><div class="cl-opciones">' +
      '<button class="cl-opc" data-al="seguir"><b>▶️ Seguir con el plan</b><small>Es una respuesta esperable a la carga</small></button>' +
      '<button class="cl-opc" data-al="bajar"><b>🌡️ Bajar la carga y controlar</b><small>Nos pasamos de dosis, hay que retroceder</small></button>' +
      '<button class="cl-opc" data-al="derivar"><b>🚑 Frenar y derivar al médico</b><small>Esto ya no se maneja acá</small></button>' +
      '</div>';
  }else{
    html += '<div class="cl-preg">¿Qué le haces esta sesión?</div><div class="cl-opciones">' +
      CL_CARGAS.map(x => '<button class="cl-opc" data-carga="' + x.id + '"><b>' + x.emo + ' ' + x.nom + '</b><small>' + x.desc + '</small></button>').join('') +
      '<button class="cl-opc educar" data-carga="educar"><b>📘 Educar y reforzar</b>' +
      '<small>No carga tejido, pero sube fuerte la adherencia. Vale oro cuando está por abandonar.</small></button>' +
      (am ? '<button class="cl-opc amarilla" data-carga="amarilla"><b>' + am.emo + ' Abordar ' + am.nom.toLowerCase() + '</b>' +
            '<small>' + am.abordaje + '</small></button>' : '') +
      '</div>';
  }
  html += '<button class="cl-btn-derivar" id="clVolverRecep">‹ Volver a la clínica</button>';

  cont.innerHTML = html;
  cont.querySelectorAll('[data-carga]').forEach(b => b.onclick = () => clSesion(idx, b.dataset.carga));
  cont.querySelectorAll('[data-al]').forEach(b => b.onclick = () => clResponderAlarma(idx, b.dataset.al));
  document.getElementById('clVolverRecep').onclick = () => { clSesionAbierta = null; jxSonido('tap'); clPanel(); };
}

/* ---------- gestión ---------- */
function clPanelGestion(cont){
  const c = clEstado();
  const costoKine = clCostoKine();
  const abiertas = clEspecialidadesAbiertas();
  let html = '<div class="cl-sec">Contratar</div>' +
    '<button class="cl-item accion' + (c.dinero >= costoKine && c.personal.length < clTopeKine() ? ' puede' : '') + '" id="clContratar">' +
      '<div class="cl-item-emo" style="background:#e8f0e4">🧑‍⚕️</div>' +
      '<div class="cl-item-info"><div class="cl-item-nom">Contratar kinesiólogo</div>' +
      '<div class="cl-item-desc">' + (c.personal.length >= clTopeKine()
        ? 'Equipo completo: ' + c.personal.length + ' de ' + clTopeKine() + ' (dos por box). Compra otro box para crecer.'
        : 'Atiende pacientes de rutina solo · rendiría ' + clPlata(clRentaKine(c.personal.length) * clMultPago()) + '/s · ' + c.personal.length + ' de ' + clTopeKine() + ' (dos por box)') + '</div></div>' +
      '<div class="cl-item-costo">' + (c.personal.length >= clTopeKine() ? '🔒' : clPlata(costoKine)) + '</div>' +
    '</button>' +
    '<div class="cl-sec">Equipamiento</div><div class="cl-lista">';
  // lo que falta comprar va primero; lo comprado se resume al final
  const faltan = CL_EQUIPOS.filter(eq => !clTieneEquipo(eq.id));
  const tengo = CL_EQUIPOS.filter(eq => clTieneEquipo(eq.id));
  if(!faltan.length) html += '<div class="cl-vacio">Tienes todo el equipamiento. Lo que sigue es abrir otra sede.</div>';
  faltan.forEach(eq => {
    const puede = c.dinero >= eq.costo;
    html += '<button class="cl-item' + (puede ? ' puede' : '') + '" data-eq="' + eq.id + '">' +
      '<div class="cl-item-emo" style="background:#f2ebdc">' + eq.emo + '</div>' +
      '<div class="cl-item-info"><div class="cl-item-nom">' + eq.nom + '</div>' +
      '<div class="cl-item-desc">' + eq.desc + '</div></div>' +
      '<div class="cl-item-costo">' + clPlata(eq.costo) + '</div></button>';
  });
  if(tengo.length){
    html += '<details class="cl-comprados"><summary>✓ Ya tienes ' + tengo.length + ' equipo' + (tengo.length === 1 ? '' : 's') + '</summary>' +
      tengo.map(eq => '<div class="cl-item listo"><div class="cl-item-emo" style="background:#f2ebdc">' + eq.emo + '</div>' +
        '<div class="cl-item-info"><div class="cl-item-nom">' + eq.nom + '</div><div class="cl-item-desc">' + eq.desc + '</div></div>' +
        '<div class="cl-item-costo">✓</div></div>').join('') + '</details>';
  }
  html += '</div><div class="cl-sec">Especialidades</div>' +
    '<div class="cl-nota izq">Cada especialidad pide reputación <b>y</b> aprobar su acreditación: ' +
    '8 preguntas sobre sus casos y el contenido de repaso, se aprueba con 6.</div><div class="cl-lista">';
  Object.keys(CL_ESPECIALIDADES).forEach(k => {
    const e = CL_ESPECIALIDADES[k];
    const conRep = c.reputacion >= e.rep;
    const acreditada = c.acred.includes(k);
    const abierta = conRep && acreditada;
    const n = KIN_CASOS.filter(x => x.esp === k).length;
    let desc;
    if(abierta) desc = n + ' casos disponibles';
    else if(!conRep && !acreditada) desc = 'Necesita ⭐' + e.rep + ' de reputación y la acreditación';
    else if(!conRep) desc = 'Acreditada ✓ · falta llegar a ⭐' + e.rep + ' de reputación';
    else desc = 'Reputación lista · falta rendir la acreditación';
    html += '<div class="cl-item' + (abierta ? ' listo' : conRep && !acreditada ? ' puede' : '') + '">' +
      '<div class="cl-item-emo" style="background:' + e.color + '33">' + (abierta ? e.emo : acreditada ? '⭐' : '🔒') + '</div>' +
      '<div class="cl-item-info"><div class="cl-item-nom">' + e.nom + '</div>' +
      '<div class="cl-item-desc">' + desc + '</div></div>' +
      (conRep && !acreditada ? '<div class="cl-item-costo"><span class="cl-acred-btn" data-acred="' + k + '">Rendir</span></div>' : '') +
      '</div>';
  });
  html += '</div>';

  // --- árbol de habilidades: es tuyo, no de la clínica ---
  html += '<div class="cl-sec">Tus habilidades</div>' +
    '<div class="cl-px">Tienes <b>' + c.pxHabil + '</b> punto' + (c.pxHabil === 1 ? '' : 's') +
    '. Se ganan con cada alta, cada acreditación y cada caso del día. No se pierden al abrir una sede nueva.</div>' +
    '<div class="cl-lista">';
  CL_HABILIDADES.forEach(h => {
    const tiene = clTieneHabil(h.id);
    const puede = !tiene && c.pxHabil >= h.costo;
    html += '<button class="cl-item' + (tiene ? ' listo' : puede ? ' puede' : '') + '"' +
      (puede ? ' data-habil="' + h.id + '"' : '') + '>' +
      '<div class="cl-item-emo" style="background:#efeaf7">' + (tiene ? '✓' : h.emo) + '</div>' +
      '<div class="cl-item-info"><div class="cl-item-nom">' + h.nom + '</div>' +
      '<div class="cl-item-desc">' + h.desc + '</div></div>' +
      '<div class="cl-item-costo">' + (tiene ? 'Tuya' : h.costo + ' pto' + (h.costo === 1 ? '' : 's')) + '</div></button>';
  });
  html += '</div>';

  // --- casos que se te fueron ---
  const deudas = Object.keys(c.fallidos);
  if(deudas.length){
    html += '<div class="cl-sec">Casos que se te fueron (' + deudas.length + ')</div>' +
      '<div class="cl-nota izq">Si vuelven y esta vez lo haces bien, queda saldado y recuperas reputación.</div>' +
      '<div class="cl-lista">';
    deudas.forEach(id => {
      const k = KIN_CASOS.find(x => x.id === id);
      if(!k) return;
      html += '<div class="cl-item alerta"><div class="cl-item-emo" style="background:#fadbd7">' + (k.ava || '🧍') + '</div>' +
        '<div class="cl-item-info"><div class="cl-item-nom">' + k.pac + ' · ' + clCorto(id) + '</div>' +
        '<div class="cl-item-desc">' + c.fallidos[id].motivo + '</div></div></div>';
    });
    html += '</div>';
  }

  // --- quiénes te derivan ---
  html += '<div class="cl-sec">Quiénes te derivan</div>' +
    '<div class="cl-nota izq">Resuélveles bien y te mandan más gente. Devuélveles pacientes mal manejados y dejan de derivarte.</div>' +
    '<div class="cl-lista">';
  CL_DERIVADORES.forEach(d => {
    const v = c.deriv[d.id] || { conf:50, enviados:0 };
    const nivel = v.conf >= 75 ? 'te tienen fe' : v.conf >= 45 ? 'relación normal' : v.conf >= 20 ? 'desconfían' : 'casi no te mandan';
    html += '<div class="cl-item listo"><div class="cl-item-emo" style="background:#eef4f8">' + d.emo + '</div>' +
      '<div class="cl-item-info"><div class="cl-item-nom">' + d.nom + '</div>' +
      '<div class="cl-item-desc">' + d.desc + ' · paga ×' + d.pago.toFixed(2).replace('.', ',') + '</div>' +
      '<div class="cl-barra-mini"><div style="width:' + v.conf + '%"></div></div></div>' +
      '<div class="cl-item-costo">' + Math.round(v.conf) + '%<br><small style="font-size:.6rem">' + nivel + '</small></div></div>';
  });
  html += '</div>';

  // --- expansión: abrir una sede nueva ---
  const prox = clSedeSiguiente();
  const sedeAct = clSede();
  html += '<div class="cl-sec">Expansión</div>';
  if(!prox){
    html += '<div class="cl-vacio">Ya tienes clínica de Curicó a Punta Arenas. No queda dónde crecer: ahora es puro oficio.</div>';
  }else{
    const puede = clPuedeAbrirSede();
    const faltaRep = Math.max(0, clSedeRep() - c.reputacion);
    const faltaPlata = Math.max(0, clSedeCosto() - c.dinero);
    html += '<div class="cl-sede' + (puede ? ' puede' : '') + '"' + (puede ? ' id="clAbrirSede"' : '') + '>' +
      '<div class="cl-sede-top"><span class="cl-sede-emo">' + prox.emo + '</span>' +
        '<div><b>Abrir sede en ' + prox.nom + '</b>' +
        '<small>Dejas ' + sedeAct.nom + ' andando y partes de cero acá: sin plata, sin equipo, sin reputación.</small></div></div>' +
      '<div class="cl-sede-gana"><b>Te llevas</b> el álbum, los pacientes que ya conoces, tus récords del examen y las acreditaciones rendidas. ' +
        'Cada sede paga <b>+' + Math.round(CL_SEDE_PAGO * 100) + '%</b> para siempre.</div>' +
      '<div class="cl-sede-cuesta"><b>Y cuesta más:</b> un minuto menos de consulta por paciente y un diagnóstico extra en cada diferencial.</div>' +
      '<div class="cl-sede-req">' +
        (puede ? '✓ Listo para abrir · toca acá'
               : (faltaRep ? 'Faltan ⭐' + faltaRep + ' de reputación' : '✓ reputación') + ' · ' +
                 (faltaPlata ? 'faltan ' + clPlata(faltaPlata) : '✓ plata')) +
      '</div></div>';
  }
  if(c.fundadas.length){
    html += '<div class="cl-nota izq">Sedes que dejaste andando: ' + c.fundadas.join(' · ') + '.</div>';
  }

  cont.innerHTML = html;
  document.getElementById('clContratar').onclick = clContratar;
  cont.querySelectorAll('[data-eq]').forEach(b => b.onclick = () => clComprarEquipo(b.dataset.eq));
  const bs = document.getElementById('clAbrirSede');
  if(bs) bs.onclick = clAbrirSede;
  cont.querySelectorAll('[data-habil]').forEach(b => b.onclick = () => clComprarHabil(b.dataset.habil));
  cont.querySelectorAll('[data-acred]').forEach(b => b.onclick = (ev) => {
    ev.stopPropagation();
    clRepasoTipo = 'examen'; clVista = 'repaso';
    clEmpezarExamen(b.dataset.acred);
  });
}

function clContratar(){
  const c = clEstado();
  const costo = clCostoKine();
  if(c.personal.length >= clTopeKine()){
    jxSonido('mal');
    avisar('🛏️ Cada box da para dos kinesiólogos. Compra otra camilla o box para contratar más.');
    return;
  }
  if(c.dinero < costo){ jxSonido('mal'); return; }
  clAsentar();
  c.dinero -= costo;
  const abiertas = clEspecialidadesAbiertas();
  const esp = abiertas[Math.floor(Math.random() * abiertas.length)];
  c.personal.push({
    nom: CL_NOMBRES[Math.floor(Math.random() * CL_NOMBRES.length)],
    esp, emo:'🧑‍⚕️',
    renta: clRentaKine(c.personal.length),
  });
  jxSonido('compra'); jxVibrar(20);
  clGuardar(true);
  c3Poblar();
  clPanel();
}

function clComprarEquipo(id){
  const c = clEstado();
  const eq = CL_EQUIPOS.find(e => e.id === id);
  if(!eq || clTieneEquipo(id) || c.dinero < eq.costo){ jxSonido('mal'); return; }
  clAsentar();
  c.dinero -= eq.costo;
  c.equipos.push(id);
  jxSonido('bien'); jxVibrar(20);
  clGuardar(true);
  c3Poblar();
  clPanel();
  avisar('🏥 ' + eq.nom + ' · ' + eq.desc);
}

/* ============================================================
   EXAMEN CONTRARRELOJ
   Las preguntas se arman solas desde el mismo contenido clínico:
   si se corrige un músculo o una prueba, el examen queda corregido.
   El mismo motor sirve para acreditar una especialidad.
   ============================================================ */
let clEx = null;

function clOpciones(correcta, pool, n){
  const otras = clMezclar(pool.filter(x => x !== correcta)).slice(0, n - 1);
  return clMezclar([correcta, ...otras]);
}

function clBancoPreguntas(esp){
  const q = [];
  const nervios = [...new Set(KIN_MUSCULOS.map(m => m.nervio))];
  const acciones = [...new Set(KIN_MUSCULOS.map(m => m.accion))];
  const origenes = [...new Set(KIN_MUSCULOS.map(m => m.origen))];
  KIN_MUSCULOS.forEach(m => {
    const n = m.nom.toLowerCase();
    q.push({ tema:'Músculos', p:'¿Cuál es la inervación del ' + n + '?', ok:m.nervio, pool:nervios });
    q.push({ tema:'Músculos', p:'¿Cuál es la acción del ' + n + '?', ok:m.accion, pool:acciones });
    q.push({ tema:'Músculos', p:'¿Dónde se origina el ' + n + '?', ok:m.origen, pool:origenes });
  });
  const sugs = [...new Set(KIN_PRUEBAS.map(p => p.sug))];
  const noms = KIN_PRUEBAS.map(p => p.nom);
  KIN_PRUEBAS.forEach(p => {
    q.push({ tema:'Pruebas', p:'Una prueba de ' + p.nom + ' positiva sugiere…', ok:p.sug, pool:sugs });
    q.push({ tema:'Pruebas', p:'¿Qué prueba evalúa ' + p.sug + '?', ok:p.nom, pool:noms });
  });
  const grados = [...new Set(KIN_RANGOS.map(r => r.grados + '°'))];
  KIN_RANGOS.forEach(r => {
    q.push({ tema:'Rangos', p:'Según AAOS, ¿cuánto es la ' + r.mov.toLowerCase() + ' normal de ' + r.art.toLowerCase() + '?',
             ok:r.grados + '°', pool:grados });
  });
  const ttos = KIN_CASOS.map(c => c.tto);
  const casos = esp ? KIN_CASOS.filter(c => c.esp === esp) : KIN_CASOS;
  casos.forEach(c => {
    if(c.prueba){
      const pr = KIN_PRUEBAS.find(x => x.id === c.prueba);
      if(pr) q.push({ tema:'Casos', p:'En ' + c.nom.toLowerCase() + ', ¿qué prueba orienta el diagnóstico?', ok:pr.nom, pool:noms });
    }
    q.push({ tema:'Casos', p:'¿Cuál es el manejo correcto en ' + c.nom.toLowerCase() + ', en fase ' + c.fase + '?', ok:c.tto, pool:ttos });
  });
  return q;
}

function clEmpezarExamen(esp){
  const total = esp ? 8 : 20;
  let banco = clBancoPreguntas(esp);
  if(esp){
    // la acreditación pregunta sobre todo por los casos de esa especialidad
    const propias = banco.filter(x => x.tema === 'Casos');
    const resto = clMezclar(banco.filter(x => x.tema !== 'Casos')).slice(0, 4);
    banco = [...propias, ...resto];
  }
  const sel = clMezclar(banco).slice(0, total).map(x => ({
    tema:x.tema, p:x.p, ok:x.ok, opciones: clOpciones(x.ok, x.pool, 4),
  }));
  clEx = {
    preg:sel, idx:0, aciertos:0, esp:esp || null, elegida:null,
    hasta: Date.now() + (esp ? 150 : 240) * 1000, terminado:false, tema:{},
  };
  jxSonido('tap');
  clPanel();
}

function clExResponder(op){
  if(!clEx || clEx.elegida !== null || clEx.terminado) return;
  const q = clEx.preg[clEx.idx];
  clEx.elegida = op;
  const bien = op === q.ok;
  if(!clEx.tema[q.tema]) clEx.tema[q.tema] = { ok:0, n:0 };
  clEx.tema[q.tema].n++;
  if(bien){ clEx.aciertos++; clEx.tema[q.tema].ok++; jxSonido('bien'); }
  else { jxSonido('mal'); jxVibrar(25); }
  clPanel();
}

function clExSiguiente(){
  if(!clEx) return;
  clEx.elegida = null;
  clEx.idx++;
  if(clEx.idx >= clEx.preg.length) clExTerminar();
  else clPanel();
}

function clExTerminar(){
  if(!clEx || clEx.terminado) return;
  clEx.terminado = true;
  const c = clEstado();
  const total = clEx.preg.length;
  const pct = Math.round(clEx.aciertos / total * 100);

  if(clEx.esp){
    // examen de acreditación: se aprueba con 75%
    const aprobo = clEx.aciertos >= Math.ceil(total * 0.75);
    const e = CL_ESPECIALIDADES[clEx.esp];
    if(aprobo && !c.acred.includes(clEx.esp)) c.acred.push(clEx.esp);
    clGuardar(true);
    jxCelebrar({
      titulo: aprobo ? '¡Acreditación aprobada! ' + e.emo : 'No alcanzó esta vez',
      sub: clEx.aciertos + ' de ' + total + ' correctas. ' +
        (aprobo ? 'Ya puedes atender pacientes de ' + e.nom.toLowerCase() + '.'
                : 'Necesitas ' + Math.ceil(total * 0.75) + ' de ' + total + '. Repasa y vuelve a intentarlo, no cuesta nada.'),
      monedas: aprobo ? 20 : 0, xp: aprobo ? 60 : 10,
      textoNext:'Volver', onNext:()=>{ clEx = null; clVista='gestion'; clPanel(); },
    });
    if(aprobo) jxRecompensar(20, 60, { desde:document.getElementById('jxScreenClinica') });
    return;
  }

  c.examen.intentos++;
  const record = pct > (c.examen.mejor || 0);
  if(record) c.examen.mejor = pct;
  Object.keys(clEx.tema).forEach(t => {
    if(!c.examen.tema[t]) c.examen.tema[t] = { ok:0, n:0 };
    c.examen.tema[t].ok += clEx.tema[t].ok;
    c.examen.tema[t].n += clEx.tema[t].n;
  });
  const monedas = Math.round(clEx.aciertos * 1.5);
  const r = jxRecompensar(monedas, clEx.aciertos * 5, { desde:document.getElementById('jxScreenClinica') });
  clGuardar(true);
  jxCelebrar({
    titulo: record ? '¡Nuevo récord! 📈' : 'Examen terminado',
    sub: clEx.aciertos + ' de ' + total + ' correctas (' + pct + '%)' +
         (record ? ' · mejor que tu marca anterior' : ' · tu récord es ' + c.examen.mejor + '%'),
    monedas, xp: clEx.aciertos * 5, subioNivel:r.subioNivel, nivel:r.nivel,
    textoNext:'Ver el detalle', onNext:()=>{ clPanel(); },
  });
}

function clPanelExamen(cont){
  const c = clEstado();
  if(!clEx || clEx.terminado){
    const t = c.examen.tema;
    const temas = Object.keys(t).filter(k => t[k].n);
    cont.innerHTML =
      '<div class="cl-examen-portada">' +
        '<div class="cl-examen-emo">📝</div>' +
        '<div class="cl-examen-tit">Examen contrarreloj</div>' +
        '<p>20 preguntas en 4 minutos sobre los ' + KIN_MUSCULOS.length + ' músculos, las ' +
          KIN_PRUEBAS.length + ' pruebas, los rangos AAOS y el manejo de los ' + KIN_CASOS.length + ' casos.</p>' +
        (c.examen.intentos
          ? '<div class="cl-stats"><div><b>' + c.examen.mejor + '%</b><span>tu récord</span></div>' +
            '<div><b>' + c.examen.intentos + '</b><span>intentos</span></div></div>'
          : '') +
        (temas.length
          ? '<div class="cl-sec">Cómo vas por tema</div><div class="cl-temas">' +
            temas.map(k => {
              const pc = Math.round(t[k].ok / t[k].n * 100);
              return '<div class="cl-tema"><span>' + k + '</span>' +
                '<div class="cl-tema-barra"><div class="' + (pc < 50 ? 'mal' : pc < 75 ? 'medio' : '') + '" style="width:' + pc + '%"></div></div>' +
                '<b>' + pc + '%</b></div>';
            }).join('') + '</div>'
          : '') +
        '<button class="cl-btn-grande" id="clExIr">Empezar el examen</button>' +
      '</div>';
    document.getElementById('clExIr').onclick = () => clEmpezarExamen(null);
    return;
  }

  const q = clEx.preg[clEx.idx];
  const seg = Math.max(0, Math.ceil((clEx.hasta - Date.now()) / 1000));
  const esp = clEx.esp ? CL_ESPECIALIDADES[clEx.esp] : null;
  cont.innerHTML =
    '<div class="cl-ex-top">' +
      '<span>' + (esp ? 'Acreditación ' + esp.nom : 'Pregunta') + ' ' + (clEx.idx + 1) + '/' + clEx.preg.length + '</span>' +
      '<span class="cl-ex-reloj' + (seg < 30 ? ' poco' : '') + '" id="clExReloj">' + seg + 's</span>' +
    '</div>' +
    '<div class="cl-ex-barra"><div style="width:' + (clEx.idx / clEx.preg.length * 100) + '%"></div></div>' +
    '<div class="cl-ex-tema">' + q.tema + '</div>' +
    '<div class="cl-ex-preg">' + q.p + '</div>' +
    '<div class="cl-opciones">' +
      q.opciones.map(o => {
        let cls = 'cl-opc';
        if(clEx.elegida !== null){
          if(o === q.ok) cls += ' correcta';
          else if(o === clEx.elegida) cls += ' incorrecta';
        }
        return '<button class="' + cls + '" data-op="' + encodeURIComponent(o) + '">' + o + '</button>';
      }).join('') +
    '</div>' +
    (clEx.elegida !== null
      ? '<button class="cl-btn-grande" id="clExSig">' + (clEx.idx + 1 >= clEx.preg.length ? 'Ver resultado' : 'Siguiente') + '</button>'
      : '');
  cont.querySelectorAll('[data-op]').forEach(b => b.onclick = () => clExResponder(decodeURIComponent(b.dataset.op)));
  const s = document.getElementById('clExSig');
  if(s) s.onclick = clExSiguiente;
}

/* ---------- álbum de fichas clínicas ---------- */
function clPanelAlbum(cont){
  const c = clEstado();
  const zonas = [...new Set(KIN_CASOS.map(x => x.zona))];
  let html = '<div class="cl-album-cab">Fichas conseguidas: <b>' + c.dominados.length + ' de ' + KIN_CASOS.length + '</b>' +
    '<div class="cl-prog"><div style="width:' + (c.dominados.length / KIN_CASOS.length * 100) + '%"></div></div>' +
    '<small>Una ficha se desbloquea al cerrar el caso sin errores o al darle el alta sin recaídas.</small></div>';
  zonas.forEach(z => {
    const casos = KIN_CASOS.filter(x => x.zona === z);
    html += '<div class="cl-sec">' + z + ' (' + casos.filter(x => c.dominados.includes(x.id)).length + '/' + casos.length + ')</div>' +
      '<div class="cl-album">';
    casos.forEach(x => {
      const tiene = c.dominados.includes(x.id);
      html += '<button class="cl-ficha-mini' + (tiene ? '' : ' bloqueada') + '"' + (tiene ? ' data-ficha="' + x.id + '"' : '') + '>' +
        '<span class="cl-ficha-mini-emo">' + (tiene ? x.ava : '🔒') + '</span>' +
        '<span class="cl-ficha-mini-nom">' + (tiene ? x.pac : '???') + '</span>' +
        '<span class="cl-ficha-mini-dx">' + (tiene ? x.nom : 'sin conseguir') + '</span>' +
        // la etiqueta solo va en las conseguidas: en las bloqueadas sería un spoiler
        (tiene && x.derivar ? '<span class="cl-badge roja">derivar</span>' : '') +
      '</button>';
    });
    html += '</div>';
  });
  cont.innerHTML = html;
  cont.querySelectorAll('[data-ficha]').forEach(b => b.onclick = () => {
    const x = KIN_CASOS.find(k => k.id === b.dataset.ficha);
    const pr = x.prueba ? KIN_PRUEBAS.find(p => p.id === x.prueba) : null;
    const mia = c.notasCaso[x.id];
    jxSonido('tap');
    jxCelebrar({
      titulo: x.ava + ' ' + x.nom,
      sub: x.pac + ', ' + clEdad(x) + ' · ' + x.ocup + '. ' +
           (pr ? 'Prueba: ' + pr.nom + '. ' : '') + x.dato +
           (mia ? ' · 💌 Hay una nota de ' + mia.de + ' en este caso.' : ''),
      monedas:0, xp:0,
      textoNext: clQuien() ? '💌 Dejar una nota' : 'Cerrar',
      onNext: () => {
        if(!clQuien()) return;
        const actual = mia ? mia.texto : '';
        const txt = prompt('Mensaje para ' + (clQuien() === 'Catalina' ? 'Diego' : 'Catalina') +
          ', escondido en este caso. Le va a aparecer cuando le toque este paciente:', actual);
        if(txt !== null) clGuardarNota(x.id, txt);
      },
    });
  });
}

/* ---------- repaso ---------- */
let clRepasoTipo = 'musculos', clRepasoIdx = 0, clRepasoAbierta = false;
function clPanelRepaso(cont){
  const solapas = '<div class="cl-tabs chicas">' +
    [['musculos','Músculos'],['rangos','Rangos'],['examen','Examen'],['album','Álbum']].map(([id, nom]) =>
      '<button class="cl-tab' + (clRepasoTipo === id ? ' activa' : '') + '" data-rp="' + id + '">' + nom + '</button>').join('') +
    '</div>';

  const colgarSolapas = () => cont.querySelectorAll('[data-rp]').forEach(b => b.onclick = () => {
    clRepasoTipo = b.dataset.rp; clRepasoIdx = 0; clRepasoAbierta = false; jxSonido('tap'); clPanel();
  });

  if(clRepasoTipo === 'examen' || clRepasoTipo === 'album'){
    cont.innerHTML = solapas;
    const caja = document.createElement('div');
    cont.appendChild(caja);
    if(clRepasoTipo === 'examen') clPanelExamen(caja); else clPanelAlbum(caja);
    colgarSolapas();
    return;
  }

  const esMusculo = clRepasoTipo === 'musculos';
  const lista = esMusculo ? KIN_MUSCULOS : KIN_RANGOS;
  if(clRepasoIdx >= lista.length) clRepasoIdx = 0;
  const x = lista[clRepasoIdx];
  cont.innerHTML =
    solapas +
    '<div class="cl-carta' + (clRepasoAbierta ? ' abierta' : '') + '" id="clCarta">' +
      (esMusculo
        ? '<div class="cl-carta-tit">' + x.nom + '</div>' +
          (clRepasoAbierta
            ? '<div class="cl-carta-cuerpo">' +
                '<div><b>Origen</b><span>' + x.origen + '</span></div>' +
                '<div><b>Inserción</b><span>' + x.insercion + '</span></div>' +
                '<div><b>Inervación</b><span>' + x.nervio + '</span></div>' +
                '<div><b>Acción</b><span>' + x.accion + '</span></div>' +
              '</div>'
            : '<div class="cl-carta-pista">Toca para ver origen, inserción, inervación y acción</div>')
        : '<div class="cl-carta-tit">' + x.art + ' · ' + x.mov + '</div>' +
          (clRepasoAbierta
            ? '<div class="cl-carta-grados">' + x.grados + '°</div>'
            : '<div class="cl-carta-pista">Toca para ver el rango normal</div>')
      ) +
    '</div>' +
    '<div class="cl-repaso-nav">' +
      '<button class="jx-btn ghost" id="clRepAnt">‹ Anterior</button>' +
      '<span>' + (clRepasoIdx + 1) + ' / ' + lista.length + '</span>' +
      '<button class="jx-btn ghost" id="clRepSig">Siguiente ›</button>' +
    '</div>' +
    '<div class="cl-nota">Contenido clínico revisado por Catalina · detalle en REVISION-KINESIOLOGIA.md</div>';
  cont.querySelectorAll('[data-rp]').forEach(b => b.onclick = () => {
    clRepasoTipo = b.dataset.rp; clRepasoIdx = 0; clRepasoAbierta = false; jxSonido('tap'); clPanel();
  });
  document.getElementById('clCarta').onclick = () => { clRepasoAbierta = !clRepasoAbierta; jxSonido('tap'); clPanel(); };
  document.getElementById('clRepAnt').onclick = () => { clRepasoIdx = (clRepasoIdx - 1 + lista.length) % lista.length; clRepasoAbierta = false; clPanel(); };
  document.getElementById('clRepSig').onclick = () => { clRepasoIdx = (clRepasoIdx + 1) % lista.length; clRepasoAbierta = false; clPanel(); };
}

/* ---------- lienzo: la clínica ---------- */
function clBucle(){
  if(clLoop) cancelAnimationFrame(clLoop);
  const paso = (ahora) => {
    if(jxPantalla !== 'clinica' || !document.getElementById('jxApp')?.classList.contains('abierta')){
      clLoop = null; clAsentar(); clGuardar(true); return;
    }
    clAsentar();
    const c = clEstado();
    clMostrado += (c.dinero - clMostrado) * 0.15;
    if(Math.abs(c.dinero - clMostrado) < 0.5) clMostrado = c.dinero;
    const d = document.getElementById('clDinero');
    if(d){ d.textContent = clPlata(clMostrado); d.classList.toggle('rojo', c.dinero < 0); }
    const neto = clNetoPorSegundo();
    const r = document.getElementById('clRenta');
    if(r){ r.textContent = (neto >= 0 ? '+' : '') + clPlata(neto); r.classList.toggle('rojo', neto < 0); }
    const rp = document.getElementById('clRep'); if(rp) rp.textContent = c.reputacion;
    // el reloj de la urgencia corre en tiempo real, aunque no repintes el panel
    if(c.urgencia){
      const reloj = document.getElementById('clUrReloj');
      const seg = clSegUrgencia();
      if(reloj) reloj.textContent = seg + 's';
      if(seg <= 0 && clVencerUrgencia() && clVista === 'recepcion' && !clTurno) clPanel();
    }
    // el reloj de la clínica corre y la gente va llegando a su hora
    if(clVista === 'recepcion' && !clTurno && clSesionAbierta === null){
      const cerradaAntes = clCerrada();
      clAvanzarReloj();
      if(clLlenarSala() || clCerrada() !== cerradaAntes) clPanel();
      else {
        const rl = document.getElementById('clReloj');
        if(rl) rl.textContent = clHoraTxt(clAgenda().reloj);
      }
    }
    // reloj del examen
    if(clEx && !clEx.terminado){
      const seg = Math.max(0, Math.ceil((clEx.hasta - Date.now()) / 1000));
      const rel = document.getElementById('clExReloj');
      if(rel){ rel.textContent = seg + 's'; rel.classList.toggle('poco', seg < 30); }
      if(seg <= 0) clExTerminar();
    }
    clGuardar(false);
    clLoop = requestAnimationFrame(paso);
  };
  clLoop = requestAnimationFrame(paso);
}

function clPintar(t){
  if(!clCtx || !clCanvas) return;
  const b = clCanvas.getBoundingClientRect(), w = b.width, h = b.height, ctx = clCtx;
  const c = clEstado();

  // pared y piso
  const pared = ctx.createLinearGradient(0, 0, 0, h);
  pared.addColorStop(0, '#eaf0f4'); pared.addColorStop(1, '#dbe5ec');
  ctx.fillStyle = pared; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#cdd8e0'; ctx.fillRect(0, h * 0.72, w, h * 0.28);
  ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 1;
  for(let i = 1; i < 5; i++){ ctx.beginPath(); ctx.moveTo(w*i/5, h*0.72); ctx.lineTo(w*i/5 - 14, h); ctx.stroke(); }

  // ventana
  ctx.fillStyle = '#bfe0f0'; ctx.fillRect(w*0.06, h*0.12, w*0.2, h*0.3);
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.strokeRect(w*0.06, h*0.12, w*0.2, h*0.3);

  // camillas, una por sala
  const salas = clSalas();
  for(let i = 0; i < salas; i++){
    const x = w * (0.34 + i * 0.21), y = h * 0.58;
    const ocupada = i < Math.min(c.personal.length, salas) || (clTurno && i === 0);
    ctx.fillStyle = '#f5f7f8';
    ctx.beginPath(); ctx.roundRect(x - 26, y, 52, 16, 5); ctx.fill();
    ctx.fillStyle = '#9fb4c2';
    ctx.fillRect(x - 24, y + 16, 4, 12); ctx.fillRect(x + 20, y + 16, 4, 12);
    if(ocupada){
      // paciente acostado
      ctx.fillStyle = '#e8c9a8';
      ctx.beginPath(); ctx.arc(x - 16, y - 5, 6, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#cfe0ea';
      ctx.beginPath(); ctx.roundRect(x - 10, y - 9, 30, 9, 4); ctx.fill();
      // kine trabajando, se mece un poco
      const s = Math.sin(t/380 + i) * 2;
      ctx.fillStyle = '#7fa88c';
      ctx.beginPath(); ctx.roundRect(x + 14, y - 30 + s, 12, 24, 5); ctx.fill();
      ctx.fillStyle = '#e8c9a8';
      ctx.beginPath(); ctx.arc(x + 20, y - 35 + s, 6, 0, Math.PI*2); ctx.fill();
    }
  }

  // gente esperando
  const esperando = Math.min(4, 1 + Math.floor(c.reputacion / 12));
  for(let i = 0; i < esperando; i++){
    const x = w * 0.09 + i * 17, y = h * 0.88 + Math.sin(t/700 + i*2) * 1.5;
    ctx.fillStyle = ['#c8956d','#6d9fc8','#c86d8f','#9b7fc8'][i % 4];
    ctx.beginPath(); ctx.roundRect(x - 5, y - 16, 10, 18, 4); ctx.fill();
    ctx.fillStyle = '#e8c9a8';
    ctx.beginPath(); ctx.arc(x, y - 20, 5, 0, Math.PI*2); ctx.fill();
  }
}

