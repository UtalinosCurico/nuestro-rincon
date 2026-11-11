/* ============================================================
   SONIDOS — sintetizados con WebAudio, sin archivos.
   Comparte la preferencia de silencio con el Rincón de juegos
   (`jxMute` en localStorage).
   ============================================================ */
const Sonido = {
  ctx: null,
  mudo() { try { return localStorage.getItem('jxMute') === '1'; } catch (e) { return false; } },
  alternar() {
    const m = !this.mudo();
    try { localStorage.setItem('jxMute', m ? '1' : '0'); } catch (e) { /* nada */ }
    return !m;
  },
  listo() {
    if (this.mudo()) return null;
    try {
      this.ctx = this.ctx || new (window.AudioContext || window.webkitAudioContext)();
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return this.ctx;
    } catch (e) { return null; }
  },
  tono(f, dur, { tipo = 'sine', vol = 0.12, a = 0.008, f2 = null, cuando = 0 } = {}) {
    const c = this.listo(); if (!c) return;
    const t = c.currentTime + cuando;
    const o = c.createOscillator(), g = c.createGain();
    o.type = tipo; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination);
    o.start(t); o.stop(t + dur + 0.02);
  },
  ruido(dur, { vol = 0.08, filtro = 1800, cuando = 0, q = 0.8 } = {}) {
    const c = this.listo(); if (!c) return;
    const t = c.currentTime + cuando;
    const n = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = c.createBufferSource(); s.buffer = buf;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = filtro; bp.Q.value = q;
    const g = c.createGain(); g.gain.value = vol;
    s.connect(bp); bp.connect(g); g.connect(c.destination);
    s.start(t);
  },
  play(nombre) {
    switch (nombre) {
      case 'tap': this.tono(560, 0.06, { vol: 0.07 }); break;
      case 'comer': for (let i = 0; i < 3; i++) this.ruido(0.07, { vol: 0.16, filtro: 1400 + i * 300, cuando: i * 0.16 }); break;
      case 'nam': this.tono(320, 0.12, { tipo: 'triangle', f2: 220, vol: 0.1 }); break;
      case 'burbuja': this.tono(420 + Math.random() * 200, 0.09, { f2: 1100, vol: 0.06 }); break;
      case 'ducha': this.ruido(0.5, { vol: 0.05, filtro: 4200, q: 0.4 }); break;
      case 'moneda': this.tono(988, 0.07, { tipo: 'square', vol: 0.05 }); this.tono(1319, 0.14, { tipo: 'square', vol: 0.05, cuando: 0.07 }); break;
      case 'compra': this.tono(523, 0.08, { vol: 0.09 }); this.tono(784, 0.16, { vol: 0.09, cuando: 0.08 }); break;
      case 'nivel': [523, 659, 784, 1047, 1319].forEach((f, i) => this.tono(f, 0.22, { tipo: 'triangle', vol: 0.11, cuando: i * 0.09 })); break;
      case 'logro': [784, 988, 1175].forEach((f, i) => this.tono(f, 0.2, { tipo: 'triangle', vol: 0.1, cuando: i * 0.08 })); break;
      case 'error': this.tono(220, 0.18, { tipo: 'square', f2: 140, vol: 0.06 }); break;
      case 'ronroneo': {
        const c = this.listo(); if (!c) return;
        const t = c.currentTime, o = c.createOscillator(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
        o.type = 'triangle'; o.frequency.value = 58;
        lfo.frequency.value = 24; lg.gain.value = 0.05; lfo.connect(lg); lg.connect(g.gain);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.09, t + 0.08); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.75);
        o.connect(g); g.connect(c.destination); o.start(t); lfo.start(t); o.stop(t + 0.8); lfo.stop(t + 0.8);
        break;
      }
      case 'miau': this.tono(700, 0.12, { tipo: 'sawtooth', f2: 980, vol: 0.035 }); this.tono(980, 0.22, { tipo: 'sawtooth', f2: 620, vol: 0.035, cuando: 0.11 }); break;
      case 'bostezo': this.tono(420, 0.6, { tipo: 'triangle', f2: 180, vol: 0.06 }); break;
      case 'luz': this.tono(1500, 0.03, { tipo: 'square', vol: 0.04 }); break;
      case 'salto': this.tono(330, 0.14, { f2: 720, vol: 0.07 }); break;
      case 'resorte': this.tono(260, 0.25, { tipo: 'triangle', f2: 1200, vol: 0.09 }); break;
      case 'pop': this.tono(760, 0.08, { tipo: 'triangle', f2: 300, vol: 0.08 }); break;
      case 'bien': this.tono(660, 0.08, { vol: 0.08 }); this.tono(880, 0.12, { vol: 0.08, cuando: 0.07 }); break;
      case 'mal': this.tono(196, 0.25, { tipo: 'sawtooth', f2: 110, vol: 0.06 }); break;
      case 'gol': [523, 659, 784, 1047].forEach((f, i) => this.tono(f, 0.18, { tipo: 'square', vol: 0.05, cuando: i * 0.07 })); break;
      case 'atajada': this.ruido(0.12, { vol: 0.18, filtro: 500 }); break;
      case 'patada': this.ruido(0.06, { vol: 0.2, filtro: 900 }); break;
      case 'fin': [523, 440, 349].forEach((f, i) => this.tono(f, 0.2, { tipo: 'triangle', vol: 0.08, cuando: i * 0.12 })); break;
      case 'ruleta': this.tono(1200, 0.025, { tipo: 'square', vol: 0.03 }); break;
    }
  },
  nota(f, dur = 0.35) { this.tono(f, dur, { tipo: 'triangle', vol: 0.14, a: 0.01 }); },
};

function vibrar(ms) {
  try { if (navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) navigator.vibrate(ms); } catch (e) { /* nada */ }
}
