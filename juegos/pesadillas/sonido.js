/* ============================================================
   SONIDO — todo sintetizado con WebAudio, sin archivos.
   El silencio se comparte con el Rincón de juegos (`jxMute`).
   La música es una cajita de música que cambia de tono en cada
   piso y se pone tensa con los jefes.
   ============================================================ */
const Sonido = {
  ctx: null, maestro: null, ultimo: {},
  mudo() { try { return localStorage.getItem('jxMute') === '1'; } catch (e) { return false; } },
  alternar() {
    const m = !this.mudo();
    try { localStorage.setItem('jxMute', m ? '1' : '0'); } catch (e) { /* nada */ }
    if (m) Musica.parar(); else Musica.reanudar();
    return !m;
  },
  listo() {
    if (this.mudo()) return null;
    try {
      if (!this.ctx) {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.maestro = this.ctx.createGain(); this.maestro.gain.value = .9; this.maestro.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return this.ctx;
    } catch (e) { return null; }
  },
  tono(f, dur, o = {}) {
    const c = this.listo(); if (!c) return;
    const { tipo = 'sine', vol = .1, a = .006, f2 = null, cuando = 0, destino = null } = o;
    const t = c.currentTime + cuando;
    const os = c.createOscillator(), g = c.createGain();
    os.type = tipo; os.frequency.setValueAtTime(f, t);
    if (f2) os.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
    g.gain.setValueAtTime(.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + a);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    os.connect(g); g.connect(destino || this.maestro);
    os.start(t); os.stop(t + dur + .03);
  },
  ruido(dur, o = {}) {
    const c = this.listo(); if (!c) return;
    const { vol = .08, filtro = 1800, cuando = 0, q = .8, tipoFiltro = 'lowpass' } = o;
    const t = c.currentTime + cuando;
    const n = Math.max(1, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 1.6);
    const s = c.createBufferSource(); s.buffer = buf;
    const fl = c.createBiquadFilter(); fl.type = tipoFiltro; fl.frequency.value = filtro; fl.Q.value = q;
    const g = c.createGain(); g.gain.value = vol;
    s.connect(fl); fl.connect(g); g.connect(this.maestro);
    s.start(t);
  },
  /* Cada sonido tiene un respiro mínimo: con mucha cadencia no se amontonan. */
  play(nombre) {
    if (this.mudo()) return;
    const ahora = performance.now(), min = { disparo: 55, golpe: 45, disparoE: 90, muerte: 40, recoger: 40, moneda: 40, plaf: 80 }[nombre] || 25;
    if (ahora - (this.ultimo[nombre] || 0) < min) return;
    this.ultimo[nombre] = ahora;
    const S = SONIDOS[nombre]; if (S) try { S(this); } catch (e) { /* nada */ }
  },
};
const SONIDOS = {
  disparo: s => s.tono(520 + Math.random() * 80, .07, { tipo: 'triangle', vol: .05, f2: 360 }),
  disparoE: s => s.tono(300, .08, { tipo: 'sine', vol: .035, f2: 220 }),
  golpe: s => { s.tono(180, .07, { tipo: 'square', vol: .03, f2: 90 }); s.ruido(.05, { vol: .05, filtro: 1200 }); },
  muerte: s => { s.tono(660, .12, { tipo: 'triangle', vol: .06, f2: 1100 }); s.ruido(.09, { vol: .05, filtro: 2400 }); },
  dano: s => { s.tono(560, .22, { tipo: 'sawtooth', vol: .05, f2: 260 }); s.tono(700, .18, { tipo: 'triangle', vol: .04, f2: 380, cuando: .04 }); },
  moneda: s => { s.tono(988, .08, { tipo: 'square', vol: .035 }); s.tono(1319, .14, { tipo: 'square', vol: .035, cuando: .06 }); },
  llave: s => { s.tono(1175, .1, { tipo: 'triangle', vol: .06 }); s.tono(1568, .16, { tipo: 'triangle', vol: .05, cuando: .07 }); },
  recoger: s => s.tono(740, .09, { tipo: 'triangle', vol: .06, f2: 980 }),
  corazon: s => { s.tono(523, .1, { vol: .07 }); s.tono(784, .18, { vol: .06, cuando: .08 }); },
  compra: s => { s.tono(659, .08, { tipo: 'square', vol: .04 }); s.tono(988, .08, { tipo: 'square', vol: .04, cuando: .07 }); s.tono(1319, .16, { tipo: 'square', vol: .04, cuando: .14 }); },
  error: s => s.tono(196, .16, { tipo: 'square', vol: .04, f2: 150 }),
  item: s => [523, 659, 784, 1047, 1319].forEach((f, i) => s.tono(f, .3, { tipo: 'triangle', vol: .06, cuando: i * .07 })),
  activo: s => { s.tono(392, .18, { tipo: 'triangle', vol: .07, f2: 784 }); s.ruido(.2, { vol: .04, filtro: 3000 }); },
  limpio: s => [659, 784, 988].forEach((f, i) => s.tono(f, .22, { vol: .05, cuando: i * .08 })),
  explosion: s => { s.ruido(.5, { vol: .22, filtro: 700 }); s.tono(90, .4, { tipo: 'sine', vol: .14, f2: 40 }); },
  explosionChica: s => s.ruido(.18, { vol: .08, filtro: 1100 }),
  mecha: s => s.ruido(.35, { vol: .03, filtro: 5000, tipoFiltro: 'highpass' }),
  secreto: s => [784, 740, 622, 440, 415, 659, 831, 1047].forEach((f, i) => s.tono(f, .16, { tipo: 'triangle', vol: .05, cuando: i * .07 })),
  cofre: s => { s.ruido(.12, { vol: .05, filtro: 2000 }); [659, 880].forEach((f, i) => s.tono(f, .16, { vol: .05, cuando: .05 + i * .08 })); },
  jefe: s => { s.tono(110, .9, { tipo: 'sawtooth', vol: .07, f2: 70 }); s.ruido(.8, { vol: .06, filtro: 500 }); },
  jefeVencido: s => { s.ruido(.6, { vol: .16, filtro: 900 }); [392, 494, 587, 784, 988].forEach((f, i) => s.tono(f, .35, { tipo: 'triangle', vol: .07, cuando: .2 + i * .1 })); },
  chillido: s => s.tono(1400, .16, { tipo: 'square', vol: .03, f2: 2100 }),
  golpeFuerte: s => { s.ruido(.25, { vol: .14, filtro: 600 }); s.tono(70, .25, { vol: .1, f2: 40 }); },
  agua: s => { s.ruido(.3, { vol: .06, filtro: 1400, q: 4 }); s.tono(400, .2, { vol: .03, f2: 900 }); },
  burbuja: s => s.tono(300, .12, { vol: .06, f2: 900 }),
  ola: s => s.ruido(.6, { vol: .07, filtro: 900, q: 2 }),
  motor: s => s.tono(80, .5, { tipo: 'sawtooth', vol: .05, f2: 180 }),
  puf: s => s.ruido(.25, { vol: .06, filtro: 800 }),
  ladrido: s => { s.tono(320, .09, { tipo: 'sawtooth', vol: .07, f2: 180 }); s.tono(300, .1, { tipo: 'sawtooth', vol: .06, f2: 160, cuando: .12 }); },
  salto: s => s.tono(220, .3, { tipo: 'triangle', vol: .06, f2: 660 }),
  plaf: s => s.ruido(.08, { vol: .04, filtro: 900 }),
  aviso: s => s.tono(880, .07, { tipo: 'square', vol: .025 }),
  susto: s => { s.tono(500, .12, { tipo: 'square', vol: .05, f2: 900 }); s.ruido(.1, { vol: .05 }); },
  magia: s => [1047, 1319, 1568, 2093].forEach((f, i) => s.tono(f, .2, { vol: .035, cuando: i * .05 })),
  bufido: s => s.ruido(.3, { vol: .08, filtro: 3500, tipoFiltro: 'highpass' }),
  laser: s => s.tono(1700, .12, { tipo: 'sawtooth', vol: .025, f2: 900 }),
  cargaFull: s => { s.tono(260, .2, { tipo: 'triangle', vol: .08, f2: 120 }); s.ruido(.15, { vol: .06, filtro: 900 }); },
  vida: s => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => s.tono(f, .2, { tipo: 'triangle', vol: .06, cuando: i * .09 })),
  ronroneo: s => { for (let i = 0; i < 6; i++) s.tono(48, .12, { tipo: 'sawtooth', vol: .05, cuando: i * .13 }); },
  bajar: s => [784, 659, 523, 392, 330].forEach((f, i) => s.tono(f, .25, { tipo: 'triangle', vol: .05, cuando: i * .09 })),
  tap: s => s.tono(660, .05, { tipo: 'triangle', vol: .04 }),
};

function vibrar(ms) {
  try {
    if (!Musica.vibrar) return;
    if (navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) navigator.vibrate(ms);
  } catch (e) { /* nada */ }
}

/* ---------- la cajita de música ---------- */
const Musica = {
  activa: false, encendida: true, vibrar: true, timer: null, sig: 0, paso: 0, piso: 0, jefe: false, salida: null,
  iniciar(piso, jefe) {
    this.piso = piso; this.jefe = !!jefe;
    if (!this.encendida || Sonido.mudo()) return;
    const c = Sonido.listo(); if (!c) return;
    if (!this.salida) { this.salida = c.createGain(); this.salida.gain.value = .5; this.salida.connect(Sonido.maestro); }
    if (this.activa) return;
    this.activa = true; this.paso = 0; this.sig = c.currentTime + .15;
    this.timer = setInterval(() => this.programar(), 90);
  },
  cambiar(piso, jefe) { this.piso = piso; this.jefe = !!jefe; if (!this.activa) this.iniciar(piso, jefe); },
  parar() { this.activa = false; clearInterval(this.timer); this.timer = null; },
  reanudar() { if (this.encendida) this.iniciar(this.piso, this.jefe); },
  programar() {
    const c = Sonido.ctx; if (!c || !this.activa) return;
    if (document.hidden) return;
    const negra = this.jefe ? .3 : .42;
    while (this.sig < c.currentTime + .3) { this.nota(this.paso, this.sig, negra / 2); this.sig += negra / 2; this.paso++; }
  },
  /* Progresiones: I-vi-IV-V para soñar, i-VI-iv-V para los jefes. */
  nota(i, t, dur) {
    const base = 60 + (PISOS[this.piso] ? PISOS[this.piso].nota : 0) - (this.jefe ? 12 : 0);
    const acordes = this.jefe ? [[0, 3, 7], [-4, 0, 3], [5, 8, 12], [7, 11, 14]] : [[0, 4, 7], [-3, 0, 4], [5, 9, 12], [7, 11, 14]];
    const compas = Math.floor(i / 6) % 4, enCompas = i % 6, ac = acordes[compas];
    const patron = [0, 1, 2, 1, 2, 1];
    const semi = ac[patron[enCompas]] + (enCompas === 2 || enCompas === 4 ? 12 : 0);
    const f = 440 * Math.pow(2, (base + semi - 69) / 12);
    const vol = (enCompas === 0 ? .05 : .032) * (this.jefe ? 1.15 : 1);
    this.campana(f, t, dur * 3, vol);
    if (enCompas === 0) this.campana(f / 2, t, dur * 5, vol * .7);
    if (!this.jefe && i % 24 === 21) this.campana(f * 2, t, dur * 2, .018);
  },
  campana(f, t, dur, vol) {
    const c = Sonido.ctx; if (!c || !this.salida) return;
    for (const [mult, v] of [[1, 1], [2.01, .35], [3.98, .12]]) {
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'sine'; o.frequency.value = f * mult;
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol * v, t + .008); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      o.connect(g); g.connect(this.salida); o.start(t); o.stop(t + dur + .05);
    }
  },
};
