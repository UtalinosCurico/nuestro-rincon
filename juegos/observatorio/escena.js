/* ============================================================
   ESCENA — el cielo de esta noche sobre el sitio, en un canvas.
   Estrellas, Sol y Luna salen de astro.js con la fecha real y la
   hora del juego: lo que se ve es lo que hay sobre Chile.
   ============================================================ */
const Escena = {
  cv: null, ctx: null, w: 0, h: 0, dpr: 1,
  visible: true, ahorro: false, movil: false,
  fondo: [], via: [], sprite: null, spriteNube: null,
  meteoros: [], ultimoDibujo: 0, t0: performance.now(),
  paisajes: {},
  figuras: false,
  horizonte: 0.7,

  iniciar(canvas) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.movil = matchMedia('(max-width: 820px), (pointer: coarse)').matches;
    // estrellas de fondo: fijas para siempre (semilla), repartidas en la esfera
    const r = mulberry32(20251228);
    const cuantas = this.movil ? 900 : 1300;
    for (let i = 0; i < cuantas; i++) {
      const dec = Math.asin(2 * r() - 1) / RAD;
      const ra = r() * 360;
      const mag = 3.4 + Math.pow(r(), 0.5) * 3.0;
      const tinte = r();
      const col = tinte < 0.15 ? [190, 210, 255] : tinte < 0.3 ? [255, 236, 200] : [240, 244, 255];
      this.fondo.push({ ra, dec, mag, col, tw: r() * 6.28 });
    }
    this.via = puntosViaLactea(170);
    this.sprite = this.crearSprite(64, [255, 255, 255]);
    this.spriteNube = this.crearSprite(96, [255, 255, 255], true);
    this.redimensionar();
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(ents => { this.visible = ents[0].isIntersecting; }, { threshold: 0.02 }).observe(canvas);
    }
  },

  crearSprite(n, rgb, suave) {
    const c = document.createElement('canvas');
    c.width = c.height = n;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
    grad.addColorStop(0, `rgba(${rgb},1)`);
    grad.addColorStop(suave ? 0.5 : 0.25, `rgba(${rgb},${suave ? 0.55 : 0.35})`);
    grad.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = grad; g.fillRect(0, 0, n, n);
    return c;
  },

  redimensionar() {
    const cv = this.cv;
    const rect = cv.getBoundingClientRect();
    const tope = this.movil ? 1.5 : 2;
    this.dpr = Math.min(tope, window.devicePixelRatio || 1);
    this.w = Math.max(200, Math.round(rect.width));
    this.h = Math.max(160, Math.round(rect.height));
    cv.width = Math.round(this.w * this.dpr);
    cv.height = Math.round(this.h * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  },

  fpsObjetivo() {
    if (this.ahorro) return 12;
    return this.movil ? 24 : 30;
  },

  /* ---------- proyección ---------- */
  fov() { return Math.max(100, Math.min(190, this.w / this.h * 115)); },
  proyectar(alt, az) {
    let d = az - 180;
    if (d > 180) d -= 360; if (d < -180) d += 360;
    const hz = this.h * this.horizonte;
    return { x: this.w / 2 + d / this.fov() * this.w, y: hz * (1 - alt / 78) };
  },

  /** Posiciones de los terrenos sobre el suelo (en px CSS). Dos filas para que quepan en el teléfono. */
  posicionesSlots(n) {
    const hz = this.h * this.horizonte;
    const suelo = this.h - hz;
    const atras = Math.floor(n / 2), adelante = n - atras;
    const pos = [];
    const margen = this.w * 0.07;
    for (let i = 0; i < n; i++) {
      const fila = i % 2 === 0 ? 0 : 1; // 0 = adelante
      const k = Math.floor(i / 2);
      const cuantos = fila === 0 ? adelante : atras;
      const ancho = this.w - margen * 2;
      const x = margen + ancho * (fila === 0 ? (k + 0.5) / cuantos : (k + 1) / (cuantos + 1));
      const y = fila === 0 ? hz + suelo * 0.82 : hz + suelo * 0.36;
      const esc = Math.min(fila === 0 ? 70 : 52, (this.w / Math.max(3, adelante)) * (fila === 0 ? 0.78 : 0.6));
      pos.push({ x, y, s: esc, fila });
    }
    return pos;
  },

  /* ---------- colores ---------- */
  mezclar(a, b, t) { return [0, 1, 2].map(i => Math.round(a[i] + (b[i] - a[i]) * t)); },
  rgb(c, a) { return a == null ? `rgb(${c[0]},${c[1]},${c[2]})` : `rgba(${c[0]},${c[1]},${c[2]},${a})`; },
  cieloPorSol(alt) {
    const K = [
      [-18, [3, 5, 14], [10, 16, 38]],
      [-10, [10, 16, 44], [44, 42, 92]],
      [-4, [34, 48, 104], [196, 104, 104]],
      [0, [60, 92, 160], [255, 158, 102]],
      [8, [70, 126, 200], [255, 214, 150]],
      [25, [56, 132, 214], [168, 214, 244]],
    ];
    if (alt <= K[0][0]) return { arriba: K[0][1], abajo: K[0][2] };
    for (let i = 1; i < K.length; i++) {
      if (alt <= K[i][0]) {
        const t = (alt - K[i - 1][0]) / (K[i][0] - K[i - 1][0]);
        return { arriba: this.mezclar(K[i - 1][1], K[i][1], t), abajo: this.mezclar(K[i - 1][2], K[i][2], t) };
      }
    }
    return { arriba: K[K.length - 1][1], abajo: K[K.length - 1][2] };
  },

  /* ---------- paisajes ---------- */
  paisaje(id) {
    if (this.paisajes[id]) return this.paisajes[id];
    const r = mulberry32(id.split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 7));
    const ruido = (n, amp, suav) => {
      const pts = []; let v = r();
      for (let i = 0; i <= n; i++) { v += (r() - 0.5) * suav; v = Math.max(0, Math.min(1, v)); pts.push(v * amp); }
      return pts;
    };
    const capas = [];
    switch (id) {
      case 'valle':
        capas.push({ pts: ruido(40, 0.16, 0.5).map((v, i, a) => v + 0.06 + Math.abs(i / a.length - 0.5) * 0.12), dia: [150, 128, 112], noche: [14, 16, 34] });
        capas.push({ pts: ruido(30, 0.1, 0.6).map((v, i, a) => v + 0.02 + Math.pow(Math.abs(i / a.length - 0.5) * 2, 2) * 0.14), dia: [176, 140, 98], noche: [9, 11, 24] });
        break;
      case 'volcan': {
        const base = ruido(50, 0.035, 0.4);
        const cono = base.map((v, i, a) => { const x = i / a.length; const d = Math.abs(x - 0.72); return v + Math.max(0, 0.27 - d * 1.15) + Math.max(0, 0.12 - Math.abs(x - 0.86) * 1.4); });
        capas.push({ pts: cono, dia: [168, 120, 108], noche: [16, 14, 34], nieve: true });
        capas.push({ pts: ruido(30, 0.04, 0.5).map(v => v + 0.01), dia: [196, 150, 104], noche: [10, 10, 24] });
        break;
      }
      case 'cumbre':
        capas.push({ pts: ruido(50, 0.06, 0.5).map(v => v + 0.015), dia: [170, 140, 128], noche: [16, 18, 38] });
        capas.push({ pts: ruido(10, 0.02, 0.2).map(v => v + 0.005), dia: [150, 112, 92], noche: [8, 9, 22] });
        break;
      case 'altiplano': {
        const conos = ruido(60, 0.02, 0.3).map((v, i, a) => { const x = i / a.length; return v + Math.max(0, 0.13 - Math.abs(x - 0.22) * 0.9) + Math.max(0, 0.1 - Math.abs(x - 0.64) * 0.8); });
        capas.push({ pts: conos, dia: [176, 150, 150], noche: [18, 18, 40], nieve: true });
        capas.push({ pts: ruido(10, 0.008, 0.2), dia: [196, 168, 128], noche: [10, 10, 26] });
        break;
      }
      case 'isla':
        capas.push({ pts: ruido(40, 0.07, 0.6).map((v, i, a) => i / a.length < 0.45 ? 0 : v + 0.02), dia: [104, 140, 96], noche: [10, 18, 30], mar: true });
        capas.push({ pts: ruido(20, 0.03, 0.4).map(v => v + 0.01), dia: [92, 128, 84], noche: [8, 12, 22], moai: true });
        break;
    }
    this.paisajes[id] = capas;
    return capas;
  },

  /* ============================================================
     DIBUJO
     ============================================================ */
  dibujar(e, opciones) {
    if (!this.cv || !this.visible || document.hidden) return false;
    const ahora = performance.now();
    if (ahora - this.ultimoDibujo < 1000 / this.fpsObjetivo() - 2) return false;
    const dt = Math.min(0.2, (ahora - (this.ultimoDibujo || ahora)) / 1000);
    this.ultimoDibujo = ahora;
    const t = (ahora - this.t0) / 1000;
    const ctx = this.ctx, w = this.w, h = this.h;
    const sitio = SITIO[e.sitioActual];
    const hora = e.reloj.hora;
    const f = fechaHoy();
    // la madrugada pertenece a la noche que empezó el día anterior
    const fecha = { y: f.y, m: f.m, d: f.d };
    const msCielo = hora < 12 ? msDeHoraLocal(fecha, hora + 24, sitio.utc) : msDeHoraLocal(fecha, hora, sitio.utc);
    const lst = sidereoLocal(msCielo, sitio.lon);
    const sol = solEn(msCielo);
    const solH = horizontales(sol.ra, sol.dec, sitio.lat, lst);
    const luna = lunaEn(msCielo);
    const lunaH = horizontales(luna.ra, luna.dec, sitio.lat, lst);
    const fase = faseLunar(msCielo);
    const ns = e.noche && e.noche.sitios[e.sitioActual];
    const clima = (ns && ns.clima) || 'despejado';
    const osc = Math.max(0, Math.min(1, (-solH.alt - 2) / 13));
    const hz = h * this.horizonte;

    // cielo
    const cc = this.cieloPorSol(solH.alt);
    let arriba = cc.arriba, abajo = cc.abajo;
    if (clima !== 'despejado') {
      const gris = osc > 0.5 ? [22, 24, 34] : [150, 158, 170];
      const k = clima === 'nublado' ? 0.65 : 0.3;
      arriba = this.mezclar(arriba, gris, k); abajo = this.mezclar(abajo, gris, k);
    }
    const g = ctx.createLinearGradient(0, 0, 0, hz);
    g.addColorStop(0, this.rgb(arriba));
    g.addColorStop(1, this.rgb(abajo));
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, hz + 2);

    // contaminación lumínica (un poco en Elqui, nada en las cumbres)
    if (osc > 0.3 && sitio.cielo < 0.9) {
      const lp = ctx.createLinearGradient(0, hz - h * 0.25, 0, hz);
      lp.addColorStop(0, 'rgba(255,170,90,0)');
      lp.addColorStop(1, `rgba(255,170,90,${0.12 * (1 - sitio.cielo) * osc * 3})`);
      ctx.fillStyle = lp; ctx.fillRect(0, hz - h * 0.25, w, h * 0.25);
    }

    if (osc > 0.6 && clima !== 'nublado') {
      const ag = ctx.createLinearGradient(0, hz - h * 0.22, 0, hz);
      ag.addColorStop(0, 'rgba(60,110,140,0)');
      ag.addColorStop(1, `rgba(60,110,140,${0.16 * osc})`);
      ctx.fillStyle = ag; ctx.fillRect(0, hz - h * 0.22, w, h * 0.22);
    }
    const luzLuna = lunaH.alt > 0 ? fase.fraccion : 0;
    const visibilidad = osc * (clima === 'nublado' ? 0.08 : clima === 'parcial' ? 0.55 : 1) * (1 - 0.35 * luzLuna);

    if (visibilidad > 0.02) {
      // Vía Láctea
      if (!this.ahorro && visibilidad > 0.25) {
        ctx.globalCompositeOperation = 'lighter';
        const a0 = 0.085 * visibilidad * (1 - 0.6 * luzLuna);
        for (const p of this.via) {
          const hh = horizontales(p.ra, p.dec, sitio.lat, lst);
          if (hh.alt < -3) continue;
          const pr = this.proyectar(hh.alt, hh.az);
          if (pr.x < -60 || pr.x > w + 60) continue;
          const tam = 40 * p.ancho * (this.w / 400 + 0.45);
          ctx.globalAlpha = a0 * p.brillo;
          ctx.drawImage(this.sprite, pr.x - tam / 2, pr.y - tam / 2, tam, tam);
        }
        // nubes de Magallanes y otros objetos que se ven a ojo
        for (const o of CIELO_PROFUNDO) {
          if (o.tipo === 'oscura') continue;
          const hh = horizontales(o.ra * 15, o.dec, sitio.lat, lst);
          if (hh.alt < 0) continue;
          const pr = this.proyectar(hh.alt, hh.az);
          const tam = Math.max(6, o.r * 7) * (this.w / 400 + 0.4);
          ctx.globalAlpha = (o.tipo === 'nube' ? 0.22 : 0.16) * visibilidad;
          ctx.drawImage(this.sprite, pr.x - tam / 2, pr.y - tam / 2, tam, tam * (o.tipo === 'nube' ? 0.8 : 1));
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
      }
      // estrellas de fondo
      const limiteMag = 3.6 + 2.9 * visibilidad;
      if (!this.ahorro) {
        for (const s of this.fondo) {
          if (s.mag > limiteMag) continue;
          const hh = horizontales(s.ra, s.dec, sitio.lat, lst);
          if (hh.alt < 0.5) continue;
          const pr = this.proyectar(hh.alt, hh.az);
          if (pr.x < 0 || pr.x > w) continue;
          const tw = 0.75 + 0.25 * Math.sin(t * 2.2 + s.tw);
          const a = Math.min(1, (limiteMag - s.mag) / 1.3) * visibilidad * tw * Math.min(1, hh.alt / 8 + 0.3);
          ctx.fillStyle = `rgba(${s.col[0]},${s.col[1]},${s.col[2]},${Math.min(1, a * 1.25).toFixed(3)})`;
          const tam = Math.max(0.9, 2.1 - s.mag * 0.2);
          ctx.fillRect(pr.x - tam / 2, pr.y - tam / 2, tam, tam);
        }
      }
      // figuras (si las pidieron)
      if (this.figuras && visibilidad > 0.3) {
        ctx.strokeStyle = 'rgba(160,190,255,0.28)'; ctx.lineWidth = 0.8;
        ctx.beginPath();
        for (const fig of FIGURAS) {
          for (const [a, b] of fig.lineas) {
            const A = ESTRELLAS[a], B = ESTRELLAS[b];
            const ha = horizontales(A[1] * 15, A[2], sitio.lat, lst), hb = horizontales(B[1] * 15, B[2], sitio.lat, lst);
            if (ha.alt < 0 || hb.alt < 0) continue;
            const pa = this.proyectar(ha.alt, ha.az), pb = this.proyectar(hb.alt, hb.az);
            if (Math.abs(pa.x - pb.x) > w * 0.5) continue;
            ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y);
          }
        }
        ctx.stroke();
      }
      // estrellas brillantes del catálogo real
      ctx.font = '600 9px Jost, sans-serif';
      for (let i = 0; i < ESTRELLAS.length; i++) {
        const st = ESTRELLAS[i];
        const hh = horizontales(st[1] * 15, st[2], sitio.lat, lst);
        if (hh.alt < 0.5) continue;
        const pr = this.proyectar(hh.alt, hh.az);
        if (pr.x < -10 || pr.x > w + 10) continue;
        const col = colorEstrella(st[4]);
        const ext = Math.min(1, hh.alt / 10 + 0.35);
        const tw = 0.82 + 0.18 * Math.sin(t * 3 + i);
        const a = Math.min(1, 1.25 - 0.18 * (st[3] + 1.5)) * visibilidad * ext * tw;
        if (a <= 0.02) continue;
        const tam = Math.max(1.5, 3.9 - 0.65 * st[3]);
        if (st[3] < 1.6 && !this.ahorro) {
          ctx.globalAlpha = a * 0.5;
          ctx.drawImage(this.sprite, pr.x - tam * 3, pr.y - tam * 3, tam * 6, tam * 6);
        }
        ctx.globalAlpha = a;
        ctx.fillStyle = this.rgb(col);
        ctx.beginPath(); ctx.arc(pr.x, pr.y, tam / 2, 0, 6.283); ctx.fill();
        if (this.figuras && st[3] < 1.3) { ctx.globalAlpha = a * 0.75; ctx.fillStyle = '#cfe0ff'; ctx.fillText(st[0], pr.x + 5, pr.y - 4); }
      }
      ctx.globalAlpha = 1;
      // nombres de las figuras famosas
      if (this.figuras && visibilidad > 0.3) {
        ctx.font = 'italic 600 10px "Playfair Display", serif';
        ctx.fillStyle = 'rgba(255,214,140,0.8)';
        for (const fig of FIGURAS) {
          const idx = fig.lineas[0][0];
          const A = ESTRELLAS[idx];
          const ha = horizontales(A[1] * 15, A[2], sitio.lat, lst);
          if (ha.alt < 3) continue;
          const pa = this.proyectar(ha.alt, ha.az);
          if (pa.x < 0 || pa.x > w) continue;
          ctx.fillText(fig.nombre, pa.x + 6, pa.y + 14);
        }
      }
      // meteoros
      this.meteorosPaso(e, dt, visibilidad);
    }

    // Sol
    if (solH.alt > -2) {
      const pr = this.proyectar(solH.alt, solH.az);
      if (pr.x > -40 && pr.x < w + 40) {
        ctx.globalAlpha = clima === 'nublado' ? 0.25 : 0.9;
        ctx.drawImage(this.sprite, pr.x - 40, pr.y - 40, 80, 80);
        ctx.fillStyle = '#fff6d8';
        ctx.beginPath(); ctx.arc(pr.x, pr.y, 7, 0, 6.283); ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
    // Luna, con su fase de verdad
    if (lunaH.alt > -1) {
      const pr = this.proyectar(lunaH.alt, lunaH.az);
      if (pr.x > -20 && pr.x < w + 20) this.dibujarLuna(pr.x, pr.y, 7.5, fase, clima, osc);
    }

    // nubes
    if (clima !== 'despejado') this.dibujarNubes(t, clima, osc, hz);

    // paisaje
    this.dibujarPaisaje(sitio, osc, hz, t);

    // suelo
    const suelo = ctx.createLinearGradient(0, hz, 0, h);
    const sd = this.mezclar([186, 150, 108], [16, 14, 26], osc);
    const sn = this.mezclar([150, 118, 84], [8, 8, 16], osc);
    if (sitio.paisaje === 'isla') { suelo.addColorStop(0, this.rgb(this.mezclar([108, 140, 90], [12, 18, 24], osc))); suelo.addColorStop(1, this.rgb(this.mezclar([86, 116, 72], [6, 10, 14], osc))); }
    else if (sitio.paisaje === 'valle') { suelo.addColorStop(0, this.rgb(this.mezclar([160, 138, 100], [16, 16, 28], osc))); suelo.addColorStop(1, this.rgb(this.mezclar([122, 108, 74], [8, 9, 18], osc))); }
    else { suelo.addColorStop(0, this.rgb(sd)); suelo.addColorStop(1, this.rgb(sn)); }
    ctx.fillStyle = suelo; ctx.fillRect(0, hz, w, h - hz);
    if (sitio.paisaje === 'valle') this.dibujarParras(hz, osc);

    // edificios
    const st = e.sitios[e.sitioActual];
    const pos = this.posicionesSlots(st.slots.length);
    const orden = pos.map((p, i) => i).sort((a, b) => pos[a].y - pos[b].y);
    const noche = osc > 0.45;
    for (const i of orden) {
      const p = pos[i];
      const sl = st.slots[i];
      if (i >= st.slotsAbiertos) { this.dibujarCerco(p, osc, true); continue; }
      if (!sl) { this.dibujarCerco(p, osc, false); continue; }
      this.dibujarEdificio(e, sl, p, t, noche, osc, ns);
    }
    // la vida del sitio: van, gente, bichos y los números que saltan
    if (typeof Vida !== 'undefined') { Vida.ahorro = this.ahorro; Vida.paso(ctx, e, { w, h, hz, t, dt, st, pos, ns, noche, osc, hora, sitio, clima }); }
    else if (noche && ns && ns.visitantes > 0 && (hora >= 20 || hora < 1.5)) this.dibujarTuristas(st, pos, ns, t);
    // viñeta suave
    if (!this.ahorro) {
      const vg = ctx.createRadialGradient(w / 2, h * 0.55, h * 0.3, w / 2, h * 0.55, h * 0.95);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.28)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h);
    }
    return true;
  },

  dibujarLuna(x, y, r, fase, clima, osc) {
    const ctx = this.ctx;
    ctx.globalAlpha = clima === 'nublado' ? 0.35 : 1;
    if (osc > 0.2) {
      ctx.globalAlpha *= 0.35 * fase.fraccion + 0.05;
      ctx.drawImage(this.sprite, x - r * 6, y - r * 6, r * 12, r * 12);
      ctx.globalAlpha = clima === 'nublado' ? 0.35 : 1;
    }
    ctx.fillStyle = 'rgba(40,44,60,0.85)';
    ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
    // parte iluminada: en el hemisferio sur, la creciente se ilumina por la izquierda
    const p = fase.fase; // 0 nueva, 0.5 llena
    const iluminaIzq = p < 0.5;
    const k = Math.cos(p * 2 * Math.PI); // 1 nueva → -1 llena
    ctx.fillStyle = '#f4f1e2';
    ctx.beginPath();
    if (iluminaIzq) {
      ctx.arc(x, y, r, Math.PI / 2, Math.PI * 1.5, false);
      ctx.ellipse(x, y, Math.abs(k) * r, r, 0, Math.PI * 1.5, Math.PI / 2, k > 0);
    } else {
      ctx.arc(x, y, r, Math.PI * 1.5, Math.PI / 2, false);
      ctx.ellipse(x, y, Math.abs(k) * r, r, 0, Math.PI / 2, Math.PI * 1.5, k > 0);
    }
    ctx.fill();
    ctx.globalAlpha = 1;
  },

  dibujarNubes(t, clima, osc, hz) {
    const ctx = this.ctx, w = this.w;
    const n = clima === 'nublado' ? (this.ahorro ? 6 : 12) : (this.ahorro ? 3 : 6);
    for (let i = 0; i < n; i++) {
      const vel = 4 + (i % 4) * 2;
      const x = ((i * 137 + t * vel) % (w + 240)) - 120;
      const y = hz * (0.12 + (i * 53 % 60) / 100);
      const tam = 110 + (i * 31 % 70);
      ctx.globalAlpha = (clima === 'nublado' ? 0.55 : 0.32) * (osc > 0.5 ? 0.9 : 1);
      ctx.drawImage(this.spriteNube, x - tam / 2, y - tam * 0.25, tam, tam * 0.5);
    }
    ctx.globalAlpha = 1;
  },

  dibujarPaisaje(sitio, osc, hz, t) {
    const ctx = this.ctx, w = this.w;
    const capas = this.paisaje(sitio.paisaje);
    capas.forEach((c, k) => {
      const col = this.mezclar(c.dia, c.noche, osc);
      if (c.mar) {
        // el Pacífico a la izquierda, con el reflejo
        const mar = ctx.createLinearGradient(0, hz - 2, 0, hz + 20);
        mar.addColorStop(0, this.rgb(this.mezclar([84, 140, 190], [10, 18, 40], osc)));
        mar.addColorStop(1, this.rgb(this.mezclar([60, 110, 160], [6, 10, 24], osc)));
        ctx.fillStyle = mar; ctx.fillRect(0, hz - 3, w * 0.5, 30);
      }
      ctx.fillStyle = this.rgb(col);
      ctx.beginPath();
      ctx.moveTo(0, hz + 2);
      const n = c.pts.length - 1;
      for (let i = 0; i <= n; i++) ctx.lineTo(i / n * w, hz - c.pts[i] * this.h);
      ctx.lineTo(w, hz + 2); ctx.closePath(); ctx.fill();
      if (c.nieve && osc < 0.85) {
        ctx.fillStyle = `rgba(255,255,255,${0.7 * (1 - osc)})`;
        for (let i = 1; i < n; i++) {
          const v = c.pts[i];
          if (v > 0.17 && v >= c.pts[i - 1] && v >= c.pts[i + 1]) {
            const x = i / n * w, y = hz - v * this.h;
            ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 9, y + 8); ctx.lineTo(x + 9, y + 8); ctx.closePath(); ctx.fill();
          }
        }
      }
      if (c.moai) this.dibujarMoais(hz, osc, w);
      void k; void t;
    });
  },

  dibujarMoais(hz, osc, w) {
    const ctx = this.ctx;
    const col = this.rgb(this.mezclar([80, 70, 64], [4, 6, 12], osc));
    ctx.fillStyle = col;
    const base = hz + 2, x0 = w * 0.56, paso = Math.max(9, w * 0.028);
    for (let i = 0; i < 7; i++) {
      const x = x0 + i * paso, alto = 15 + (i % 3) * 2;
      ctx.fillRect(x - 4, base - alto, 8, alto);
      ctx.fillRect(x - 5, base - alto - 2, 10, 4);
      ctx.fillRect(x - 6, base - 3, 12, 3);
    }
  },

  dibujarParras(hz, osc) {
    const ctx = this.ctx, w = this.w, h = this.h;
    ctx.strokeStyle = this.rgb(this.mezclar([96, 120, 64], [10, 14, 18], osc), 0.7);
    ctx.lineWidth = 1;
    for (let i = 0; i < 7; i++) {
      const y = hz + (h - hz) * (0.12 + i * 0.12);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y + 2); ctx.stroke();
    }
  },

  dibujarCerco(p, osc, bloqueado) {
    const ctx = this.ctx;
    ctx.globalAlpha = bloqueado ? 0.18 : 0.35;
    ctx.strokeStyle = osc > 0.5 ? '#8fa0d8' : '#6b5638';
    ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(p.x, p.y - 2, p.s * 0.42, p.s * 0.12, 0, 0, 6.283); ctx.stroke();
    ctx.setLineDash([]); ctx.globalAlpha = 1;
  },

  meteorosPaso(e, dt, vis) {
    const ctx = this.ctx;
    const lluvia = e.noche && e.noche.lluvia;
    const tasa = (lluvia ? 0.9 : 0.04) * vis;
    if (Math.random() < tasa * dt && this.meteoros.length < 6) {
      const x = Math.random() * this.w, y = Math.random() * this.h * this.horizonte * 0.5;
      const ang = Math.PI * (0.15 + Math.random() * 0.25) * (Math.random() < 0.5 ? 1 : -1) + Math.PI / 2;
      this.meteoros.push({ x, y, vx: Math.cos(ang) * 320, vy: Math.sin(ang) * 220, vida: 0, dura: 0.5 + Math.random() * 0.6 });
    }
    for (let i = this.meteoros.length - 1; i >= 0; i--) {
      const m = this.meteoros[i];
      m.vida += dt; m.x += m.vx * dt; m.y += m.vy * dt;
      if (m.vida > m.dura) { this.meteoros.splice(i, 1); continue; }
      const a = Math.sin(m.vida / m.dura * Math.PI);
      const gr = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * 0.12, m.y - m.vy * 0.12);
      gr.addColorStop(0, `rgba(255,255,255,${0.9 * a})`); gr.addColorStop(1, 'rgba(180,210,255,0)');
      ctx.strokeStyle = gr; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(m.x - m.vx * 0.12, m.y - m.vy * 0.12); ctx.stroke();
    }
  },

  /* ---------- edificios ---------- */
  dibujarEdificio(e, sl, p, t, noche, osc, ns) {
    const ctx = this.ctx;
    const def = EDIFICIOS[sl.id];
    const s = p.s * (1 + 0.05 * Math.max(0, (sl.nivel || 1) - 1));
    const x = p.x, y = p.y;
    const blanco = this.rgb(this.mezclar([238, 236, 228], [88, 92, 118], osc));
    const sombra = this.rgb(this.mezclar([150, 140, 128], [34, 36, 56], osc));
    const madera = this.rgb(this.mezclar([150, 104, 64], [44, 34, 40], osc));
    const luz = 'rgba(255,200,120,0.95)';
    const enObra = sl.nivel < 1 && sl.obra;
    // sombra en el suelo
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath(); ctx.ellipse(x, y, s * 0.4, s * 0.08, 0, 0, 6.283); ctx.fill();

    if (enObra && !def.etapas) { this.dibujarObra(x, y, s, sl, osc, t); return; }

    switch (sl.id) {
      case 'dobson': {
        ctx.fillStyle = madera; ctx.fillRect(x - s * 0.12, y - s * 0.18, s * 0.24, s * 0.18);
        ctx.save(); ctx.translate(x, y - s * 0.16); ctx.rotate(-0.75 + Math.sin(t * 0.1) * 0.05);
        ctx.fillStyle = blanco; ctx.fillRect(-s * 0.06, -s * 0.5, s * 0.12, s * 0.5);
        ctx.fillStyle = sombra; ctx.fillRect(-s * 0.075, -s * 0.52, s * 0.15, s * 0.05);
        ctx.restore();
        break;
      }
      case 'cupula': case 't1m': case 't4m': case 'planetario': {
        const k = { cupula: 0.32, t1m: 0.38, t4m: 0.44, planetario: 0.4 }[sl.id];
        const altoBase = { cupula: 0.2, t1m: 0.32, t4m: 0.5, planetario: 0.22 }[sl.id];
        const metal = sl.id === 't4m' ? this.rgb(this.mezclar([200, 206, 214], [70, 74, 96], osc)) : blanco;
        ctx.fillStyle = sl.id === 'planetario' ? this.rgb(this.mezclar([214, 184, 140], [60, 52, 60], osc)) : sombra;
        ctx.fillRect(x - s * k, y - s * altoBase, s * k * 2, s * altoBase);
        ctx.fillStyle = metal;
        ctx.beginPath(); ctx.arc(x, y - s * altoBase, s * k, Math.PI, 0); ctx.fill();
        if (sl.id === 'planetario') {
          ctx.strokeStyle = sombra; ctx.lineWidth = 1;
          for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.arc(x, y - s * altoBase, s * k * i / 4, Math.PI, 0); ctx.stroke(); }
          if (noche) { ctx.fillStyle = luz; ctx.fillRect(x - s * 0.06, y - s * 0.12, s * 0.12, s * 0.12); }
        } else {
          // la ranura: abierta de noche, gira despacio
          const abierta = noche && sl.modo && !sl.danado && (!ns || ns.clima !== 'nublado');
          const giro = Math.sin(t * 0.05 + x) * 0.5;
          ctx.save(); ctx.translate(x, y - s * altoBase); ctx.rotate(giro);
          ctx.fillStyle = abierta ? 'rgba(10,12,28,0.95)' : sombra;
          ctx.fillRect(-s * k * 0.13, -s * k * (abierta ? 1.0 : 0.95), s * k * 0.26, s * k * (abierta ? 1.0 : 0.95));
          ctx.restore();
          // láser de óptica adaptativa
          if (sl.id === 't4m' && abierta && sl.modo === 'ciencia' && e.inv.aoptica) this.dibujarLaser(x, y - s * (altoBase + k), t);
        }
        break;
      }
      case 't8m': {
        const metal = this.rgb(this.mezclar([214, 216, 222], [76, 80, 104], osc));
        ctx.fillStyle = metal;
        ctx.fillRect(x - s * 0.34, y - s * 0.62, s * 0.68, s * 0.62);
        ctx.fillStyle = sombra;
        ctx.fillRect(x - s * 0.34, y - s * 0.66, s * 0.68, s * 0.06);
        const abierta = noche && !sl.danado && (!ns || ns.clima !== 'nublado');
        ctx.fillStyle = abierta ? 'rgba(10,12,28,0.95)' : sombra;
        ctx.fillRect(x - s * 0.07, y - s * 0.62, s * 0.14, s * 0.42);
        if (abierta && sl.modo === 'ciencia' && e.inv.aoptica) this.dibujarLaser(x, y - s * 0.62, t);
        break;
      }
      case 'gigante': {
        const etapa = sl.nivel >= 1 ? 5 : (sl.etapa || 0);
        const metal = this.rgb(this.mezclar([226, 228, 232], [80, 84, 110], osc));
        const k = 0.62;
        if (etapa >= 1) { ctx.fillStyle = sombra; ctx.fillRect(x - s * 0.7, y - s * 0.06, s * 1.4, s * 0.06); }
        if (etapa >= 2) { ctx.fillStyle = metal; ctx.fillRect(x - s * k, y - s * 0.55, s * k * 2, s * 0.5); ctx.beginPath(); ctx.arc(x, y - s * 0.55, s * k, Math.PI, 0); ctx.fill(); }
        if (etapa >= 2 && etapa < 5) this.dibujarGrua(x + s * 0.7, y, s * 1.1, osc, t);
        if (etapa >= 5) {
          const abierta = noche && (!ns || ns.clima !== 'nublado');
          ctx.fillStyle = abierta ? 'rgba(10,12,28,0.95)' : sombra;
          ctx.fillRect(x - s * 0.12, y - s * 1.12, s * 0.24, s * 0.6);
          if (abierta && e.inv.aoptica) { this.dibujarLaser(x - s * 0.1, y - s * 1.1, t); this.dibujarLaser(x + s * 0.1, y - s * 1.1, t + 1.3); }
        }
        if (sl.obra) this.dibujarBarra(x, y + 6, s * 0.9, 1 - (sl.obra.fin - Date.now()) / (sl.obra.total || 1));
        break;
      }
      case 'antena': {
        ctx.fillStyle = sombra; ctx.fillRect(x - s * 0.05, y - s * 0.34, s * 0.1, s * 0.34);
        ctx.save(); ctx.translate(x, y - s * 0.38); ctx.rotate(-0.5 + Math.sin(t * 0.04 + x * 0.1) * 0.35);
        ctx.fillStyle = blanco;
        ctx.beginPath(); ctx.ellipse(0, 0, s * 0.32, s * 0.12, 0, 0, Math.PI); ctx.fill();
        ctx.strokeStyle = sombra; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(-s * 0.2, 0); ctx.lineTo(0, -s * 0.2); ctx.lineTo(s * 0.2, 0); ctx.stroke();
        ctx.restore();
        break;
      }
      case 'solar': {
        ctx.fillStyle = blanco; ctx.fillRect(x - s * 0.08, y - s * 0.6, s * 0.16, s * 0.6);
        ctx.fillStyle = sombra; ctx.beginPath(); ctx.arc(x, y - s * 0.62, s * 0.12, 0, 6.283); ctx.fill();
        if (!noche) { ctx.fillStyle = 'rgba(255,220,120,0.9)'; ctx.beginPath(); ctx.arc(x, y - s * 0.62, s * 0.05, 0, 6.283); ctx.fill(); }
        break;
      }
      case 'mirador': {
        ctx.strokeStyle = madera; ctx.lineWidth = 2;
        for (let i = -1; i <= 1; i++) {
          ctx.beginPath(); ctx.moveTo(x + i * s * 0.22 - s * 0.08, y - 2); ctx.lineTo(x + i * s * 0.22 + s * 0.08, y - s * 0.12); ctx.stroke();
        }
        break;
      }
      case 'cafeteria': case 'tienda': case 'hostal': case 'residencia': case 'taller': {
        const ancho = { cafeteria: 0.5, tienda: 0.44, hostal: 0.7, residencia: 0.6, taller: 0.5 }[sl.id];
        const alto = { cafeteria: 0.3, tienda: 0.26, hostal: 0.34, residencia: 0.5, taller: 0.28 }[sl.id];
        const muro = sl.id === 'hostal' ? this.rgb(this.mezclar([196, 150, 112], [58, 44, 48], osc)) :
          sl.id === 'cafeteria' ? this.rgb(this.mezclar([226, 200, 160], [62, 54, 62], osc)) : blanco;
        ctx.fillStyle = muro; ctx.fillRect(x - s * ancho / 2, y - s * alto, s * ancho, s * alto);
        ctx.fillStyle = sl.id === 'tienda' ? this.rgb(this.mezclar([214, 110, 110], [70, 36, 50], osc)) : madera;
        ctx.beginPath(); ctx.moveTo(x - s * ancho / 2 - 3, y - s * alto); ctx.lineTo(x, y - s * alto - s * 0.14); ctx.lineTo(x + s * ancho / 2 + 3, y - s * alto); ctx.closePath(); ctx.fill();
        const ventanas = sl.id === 'residencia' ? 6 : sl.id === 'hostal' ? 3 : 2;
        for (let i = 0; i < ventanas; i++) {
          const fila = sl.id === 'residencia' ? Math.floor(i / 3) : 0;
          const col = sl.id === 'residencia' ? i % 3 : i;
          const cols = sl.id === 'residencia' ? 3 : ventanas;
          const vx = x - s * ancho / 2 + s * ancho * (col + 0.5) / cols - s * 0.04;
          const vy = y - s * alto + s * 0.08 + fila * s * 0.18;
          ctx.fillStyle = noche ? luz : this.rgb(this.mezclar([120, 150, 180], [30, 30, 40], osc));
          ctx.fillRect(vx, vy, s * 0.08, s * 0.08);
        }
        if (sl.id === 'cafeteria' && !this.ahorro) {
          ctx.fillStyle = 'rgba(255,255,255,0.18)';
          for (let i = 0; i < 3; i++) { const yy = y - s * 0.5 - ((t * 8 + i * 10) % 30); ctx.beginPath(); ctx.arc(x + s * 0.12 + Math.sin(t + i) * 2, yy, 3, 0, 6.283); ctx.fill(); }
        }
        break;
      }
      case 'domos': {
        for (let i = -1; i <= 1; i += 2) {
          const cx = x + i * s * 0.2;
          ctx.fillStyle = noche ? 'rgba(255,190,120,0.55)' : 'rgba(230,240,255,0.7)';
          ctx.beginPath(); ctx.arc(cx, y, s * 0.17, Math.PI, 0); ctx.fill();
          ctx.strokeStyle = noche ? 'rgba(255,220,170,0.6)' : 'rgba(255,255,255,0.9)'; ctx.lineWidth = 0.8;
          ctx.beginPath(); ctx.arc(cx, y, s * 0.17, Math.PI, 0); ctx.stroke();
        }
        break;
      }
      case 'paneles': {
        ctx.fillStyle = this.rgb(this.mezclar([60, 84, 140], [20, 24, 44], osc));
        for (let i = 0; i < 3; i++) {
          const yy = y - i * s * 0.08;
          ctx.beginPath(); ctx.moveTo(x - s * 0.36, yy); ctx.lineTo(x + s * 0.36, yy); ctx.lineTo(x + s * 0.3, yy - s * 0.07); ctx.lineTo(x - s * 0.3, yy - s * 0.07); ctx.closePath(); ctx.fill();
        }
        break;
      }
    }
    if (sl.obra && !def.etapas) this.dibujarBarra(x, y + 6, s * 0.7, 1 - (sl.obra.fin - Date.now()) / (sl.obra.total || 1));
  },

  dibujarLaser(x, y, t) {
    const ctx = this.ctx;
    const ang = -Math.PI / 2 + Math.sin(t * 0.02) * 0.12;
    const L = this.h * 0.9;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(255,170,60,0.12)'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(ang) * L, y + Math.sin(ang) * L); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,190,90,0.55)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(ang) * L, y + Math.sin(ang) * L); ctx.stroke();
    ctx.restore();
  },

  dibujarObra(x, y, s, sl, osc, t) {
    const ctx = this.ctx;
    ctx.strokeStyle = this.rgb(this.mezclar([196, 150, 60], [120, 100, 60], osc));
    ctx.lineWidth = 1.2;
    const a = s * 0.32, b = s * 0.36;
    ctx.strokeRect(x - a, y - b, a * 2, b);
    ctx.beginPath(); ctx.moveTo(x - a, y); ctx.lineTo(x + a, y - b); ctx.moveTo(x + a, y); ctx.lineTo(x - a, y - b); ctx.stroke();
    this.dibujarGrua(x + a + 4, y, s * 0.8, osc, t);
    const prog = 1 - (sl.obra.fin - Date.now()) / (sl.obra.total || 1);
    this.dibujarBarra(x, y + 6, s * 0.7, prog);
    // chispas de soldadura
    if (!this.ahorro && Math.floor(t * 4) % 3 === 0) {
      ctx.fillStyle = 'rgba(255,226,140,0.95)';
      for (let i = 0; i < 3; i++) ctx.fillRect(x - a * 0.5 + ((t * 53 + i * 17) % (a * 1.2)), y - b * 0.35 - ((t * 31 + i * 11) % 6), 1.4, 1.4);
    }
  },
  dibujarGrua(x, y, s, osc, t) {
    const ctx = this.ctx;
    ctx.strokeStyle = this.rgb(this.mezclar([230, 170, 40], [140, 110, 50], osc));
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - s * 0.7); ctx.lineTo(x - s * 0.5, y - s * 0.7); ctx.moveTo(x, y - s * 0.7); ctx.lineTo(x + s * 0.15, y - s * 0.7); ctx.stroke();
    // el gancho sube y baja con su carga
    const baja = 0.25 + 0.14 * Math.sin((t || 0) * 1.1 + x);
    ctx.beginPath(); ctx.moveTo(x - s * 0.4, y - s * 0.7); ctx.lineTo(x - s * 0.4, y - s * 0.7 + s * baja); ctx.stroke();
    ctx.fillStyle = ctx.strokeStyle; ctx.fillRect(x - s * 0.4 - 2.5, y - s * 0.7 + s * baja, 5, 3.5);
  },
  dibujarBarra(x, y, ancho, prog) {
    const ctx = this.ctx;
    const p = Math.max(0, Math.min(1, prog || 0));
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(x - ancho / 2, y, ancho, 4);
    ctx.fillStyle = '#ffcf7a'; ctx.fillRect(x - ancho / 2, y, ancho * p, 4);
  },

  dibujarTuristas(st, pos, ns, t) {
    const ctx = this.ctx;
    const puntos = [];
    st.slots.forEach((sl, i) => {
      if (!sl || sl.nivel < 1) return;
      const def = EDIFICIOS[sl.id];
      if ((def.cat === 'telescopio' && sl.modo === 'publico' && def.publico > 0) || sl.id === 'mirador') puntos.push(pos[i]);
    });
    if (!puntos.length) return;
    const n = Math.min(this.ahorro ? 12 : 44, Math.ceil(ns.visitantes / 4));
    for (let i = 0; i < n; i++) {
      const p = puntos[i % puntos.length];
      const ang = (i * 2.399) % 6.283;
      const rad = p.s * (0.35 + (i % 5) * 0.07);
      const x = p.x + Math.cos(ang) * rad;
      const y = p.y + Math.sin(ang) * p.s * 0.08 + 2;
      ctx.fillStyle = 'rgba(20,22,40,0.95)';
      ctx.fillRect(x - 1, y - 6, 2.2, 5);
      ctx.beginPath(); ctx.arc(x + 0.1, y - 7.4, 1.3, 0, 6.283); ctx.fill();
      // linterna roja (en astroturismo se usa luz roja para no encandilar)
      if ((i + Math.floor(t * 1.3)) % 4 !== 0) {
        ctx.fillStyle = 'rgba(255,60,60,0.85)';
        ctx.fillRect(x + 1.5, y - 3.5, 1.6, 1.6);
      }
    }
  },
};
