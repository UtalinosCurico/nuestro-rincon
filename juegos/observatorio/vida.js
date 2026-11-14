/* ============================================================
   VIDA — lo que se mueve en el sitio: la van de los turistas, la
   gente caminando con su linterna roja, el guía con el puntero
   láser, el equipo de día, zorros, guanacos, cóndores, satélites
   y los números que saltan cuando entra plata.

   Es solo dibujo: no cambia nada del estado del juego. Hacia
   afuera avisa una sola cosa, `Vida.alDeseo()`, cuando cruza una
   estrella fugaz de las que se pueden pedir. La van y las fugaces
   salen de la hora del juego, no de un cronómetro propio: así da
   lo mismo a qué velocidad corra el reloj.
   ============================================================ */
const Vida = {
  gente: [], bichos: [], flot: [], sitio: null, instante: true,
  vel: 1, ahorro: false, sigBicho: 5, sigEmo: 2, hAntes: null, ult: null, cuenta: 0,
  puedeDeseo: null, alDeseo: null,

  ROPA: [[214, 92, 92], [86, 140, 214], [240, 190, 80], [120, 190, 140], [190, 120, 200], [236, 236, 236], [230, 140, 90]],
  TOCABLES: { zorro: 26, guanaco: 28, caballo: 28, condor: 28, ave: 26, globo: 30, satelite: 26, lechuza: 26, ovni: 30 },

  mez(a, b, k) { k = Math.max(0, Math.min(1, k)); return 'rgb(' + [0, 1, 2].map(i => Math.round(a[i] + (b[i] - a[i]) * k)).join(',') + ')'; },
  /* azar repetible: la misma noche da las mismas horas de fugaces */
  ruido(n) { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); },
  elegir(l) { return l[Math.floor(Math.random() * l.length)]; },
  reiniciar() { this.gente = []; this.bichos = []; this.flot = []; this.hAntes = null; this.sigBicho = 4; this.instante = true; },

  /* ---------- dónde se para la gente ---------- */
  puntos(d) {
    const ver = [], comer = [], todos = [];
    d.st.slots.forEach((sl, i) => {
      if (!sl || sl.nivel < 1 || !d.pos[i]) return;
      const def = EDIFICIOS[sl.id]; if (!def) return;
      todos.push(d.pos[i]);
      if ((def.cat === 'telescopio' && sl.modo === 'publico' && def.publico > 0) || sl.id === 'mirador') ver.push(d.pos[i]);
      if (sl.id === 'cafeteria' || sl.id === 'tienda') comer.push(d.pos[i]);
    });
    return { ver, comer, todos };
  },
  lugarEn(p) {
    const a = Math.random() * 6.283, r = p.s * (0.34 + Math.random() * 0.3);
    return [p.x + Math.cos(a) * r, p.y + 2 + Math.sin(a) * p.s * 0.09];
  },
  sueloAlAzar(d) { return [d.w * (0.08 + Math.random() * 0.84), d.hz + (d.h - d.hz) * (0.3 + Math.random() * 0.6)]; },
  escalaEn(y, d) { return 0.72 + 0.5 * Math.max(0, Math.min(1, (y - d.hz) / Math.max(1, d.h - d.hz))); },
  destinoPara(p, d, pts) {
    if (p.tipo === 'turista') {
      const r = Math.random();
      if (r < 0.2 && pts.comer.length) return this.lugarEn(this.elegir(pts.comer));
      if (pts.ver.length) return this.lugarEn(this.elegir(pts.ver));
    }
    if (pts.todos.length && Math.random() < 0.75) return this.lugarEn(this.elegir(pts.todos));
    return this.sueloAlAzar(d);
  },
  nuevaPersona(tipo, d, pts, desde) {
    const p = { tipo, n: ++this.cuenta, x: 0, y: 0, tx: 0, ty: 0, v: 15 + Math.random() * 8, estado: 'camina', espera: 0, fase: Math.random() * 6, dir: 1,
      col: tipo === 'guia' ? [90, 200, 120] : this.elegir(this.ROPA), casco: false, sigue: null };
    const destino = tipo === 'guia' && pts.ver.length ? [pts.ver[0].x + pts.ver[0].s * 0.42, pts.ver[0].y + 3] : this.destinoPara(p, d, pts);
    p.tx = destino[0]; p.ty = destino[1];
    if (desde) { p.x = desde[0] + (Math.random() - 0.5) * 8; p.y = desde[1] + (Math.random() - 0.5) * 3; p.espera = Math.random() * 2.5; }
    else { p.x = p.tx; p.y = p.ty; p.estado = 'quieto'; p.espera = Math.random() * 9; }
    return p;
  },

  /* La van llega a las 20:00, espera y se va pasada la 1:30 (H cuenta la madrugada como 24, 25…). */
  vanX(H, w) {
    const para = Math.max(26, w * 0.075);
    if (H < 20 || H > 26.3) return null;
    if (H < 20.3) { const k = (H - 20) / 0.3; return -40 + (para + 40) * (1 - (1 - k) * (1 - k)); }
    if (H < 25.9) return para;
    const k = (H - 25.9) / 0.4; return para + (w + 50 - para) * k * k;
  },

  /* ============================================================
     UN CUADRO: mover y dibujar todo
     ============================================================ */
  paso(ctx, e, d) {
    if (this.sitio !== e.sitioActual) { this.sitio = e.sitioActual; this.reiniciar(); }
    this.ult = d;
    const real = Math.min(0.25, d.dt), dt = real * (this.vel || 1);
    const H = d.hora < 12 ? d.hora + 24 : d.hora;
    const pts = this.puntos(d);
    const hayVisita = !!d.ns && d.ns.visitantes > 0 && pts.ver.length > 0 && !d.sitio.soloRadio;
    const van = hayVisita ? this.vanX(H, d.w) : null, yVan = d.h - 6;

    /* --- turistas: bajan de la van, pasean y se van --- */
    const total = hayVisita ? Math.min(this.ahorro ? 9 : 30, Math.max(2, Math.ceil(d.ns.visitantes / 5))) : 0;
    const quiere = hayVisita && H >= 20.28 && H < 25.5 ? Math.round(total * Math.min(1, (H - 20.28) / 0.55)) : 0;
    const yaSeVan = hayVisita && H >= 25.5;
    const tur = this.gente.filter(p => p.tipo === 'turista');
    for (let i = tur.length; i < quiere; i++) this.gente.push(this.nuevaPersona('turista', d, pts, this.instante || van == null ? null : [van + 8, yVan]));
    if (!hayVisita || H >= 26.25 || H < 20) this.gente = this.gente.filter(p => p.tipo !== 'turista' && p.tipo !== 'guia');
    else if (yaSeVan) for (const p of this.gente) if ((p.tipo === 'turista' || p.tipo === 'guia') && p.estado !== 'sale') { p.estado = 'sale'; p.tx = (van == null ? -20 : van + 6); p.ty = yVan; p.espera = Math.random() * 3; }
    if (quiere > 0 && !this.gente.some(p => p.tipo === 'guia')) this.gente.push(this.nuevaPersona('guia', d, pts, this.instante || van == null ? null : [van + 8, yVan]));

    /* --- el equipo, de día (al principio son ustedes dos) --- */
    const deDia = d.hora >= 7 && d.hora < 19.4;
    const staff = d.st.staff ? d.st.staff.guia + d.st.staff.astro + d.st.staff.inge : 0;
    const quiereEq = deDia && pts.todos.length ? Math.min(this.ahorro ? 3 : 5, Math.max(2, staff)) : 0;
    const eq = this.gente.filter(p => p.tipo === 'equipo');
    for (let i = eq.length; i < quiereEq; i++) {
      const p = this.nuevaPersona('equipo', d, pts, this.instante ? null : [d.w + 10, d.hz + (d.h - d.hz) * 0.6]);
      if (staff === 0) { p.pareja = true; if (i === 1 && eq[0]) p.sigue = eq[0]; }
      else p.casco = d.st.staff.inge > 0 && i % 3 === 2;
      eq.push(p); this.gente.push(p);
    }
    if (!deDia) for (const p of eq) if (p.estado !== 'sale') { p.estado = 'sale'; p.sigue = null; p.tx = d.w + 24; p.ty = p.y; p.espera = Math.random() * 4; }

    /* --- la mascota del observatorio --- */
    const perro = this.gente.find(p => p.tipo === 'perro');
    if (e.mascota && !perro && pts.todos.length) { const p = this.nuevaPersona('perro', d, pts, null); p.v = 30; this.gente.push(p); }
    this.instante = false;

    /* --- mover --- */
    for (let i = this.gente.length - 1; i >= 0; i--) {
      const p = this.gente[i];
      if (p.sigue && this.gente.includes(p.sigue)) { p.tx = p.sigue.x - 7 * p.sigue.dir; p.ty = p.sigue.y + 1.5; if (Math.hypot(p.tx - p.x, p.ty - p.y) > 2.5) { p.estado = 'camina'; p.espera = 0; } }
      else if (p.sigue) p.sigue = null;
      if (p.espera > 0) { p.espera -= dt; continue; }
      if (p.estado === 'quieto') {
        if (p.tipo === 'guia') { p.espera = 4; continue; }
        if (p.tipo === 'perro' && this.gente.length > 1 && Math.random() < 0.6) { const otro = this.elegir(this.gente); if (otro !== p) { p.tx = otro.x + 6; p.ty = otro.y + 2; p.estado = 'camina'; continue; } }
        const destino = this.destinoPara(p, d, pts); p.tx = destino[0]; p.ty = destino[1]; p.estado = 'camina';
      }
      const dx = p.tx - p.x, dy = p.ty - p.y, dist = Math.hypot(dx, dy), avance = p.v * dt * this.escalaEn(p.y, d);
      if (dist <= avance + 0.5) {
        p.x = p.tx; p.y = p.ty;
        if (p.estado === 'sale') { this.gente.splice(i, 1); continue; }
        p.estado = 'quieto'; p.espera = p.sigue ? 0.4 : p.tipo === 'turista' ? 5 + Math.random() * 11 : p.tipo === 'perro' ? 1 + Math.random() * 3 : 3 + Math.random() * 6;
      } else { p.x += dx / dist * avance; p.y += dy / dist * avance; p.fase += dt * 9; p.dir = dx >= 0 ? 1 : -1; }
    }

    /* --- bichos y cosas del cielo --- */
    if (!this.ahorro) {
      this.sigBicho -= dt;
      if (this.sigBicho <= 0) { this.sigBicho = 9 + Math.random() * 14; if (this.bichos.length < 2) this.nuevoBicho(d); }
    }
    /* fugaces de los deseos: dos horas por noche */
    if (this.hAntes != null && d.noche && d.clima !== 'nublado' && H > this.hAntes && H - this.hAntes < 1.5) {
      const nocheId = d.hora < 12 ? e.reloj.dia - 1 : e.reloj.dia;
      for (let k = 0; k < 2; k++) {
        const hk = k === 0 ? 20.7 + this.ruido(nocheId * 3.1 + 1) * 2.8 : 24.3 + this.ruido(nocheId * 5.7 + 2) * 4.2;
        if (this.hAntes < hk && H >= hk && (!this.puedeDeseo || this.puedeDeseo())) this.lanzarFugaz(d);
      }
    }
    this.hAntes = H;
    for (let i = this.bichos.length - 1; i >= 0; i--) {
      const b = this.bichos[i];
      b.t += b.tipo === 'fugaz' ? real : dt; b.fase += dt * (b.tocado ? 16 : 8);
      if (b.tipo === 'fugaz') { b.x += b.vx * real; b.y += b.vy * real; if (b.t > b.dura) this.bichos.splice(i, 1); continue; }
      if (b.pausa > 0) { b.pausa -= dt; continue; }
      if (b.tipo === 'zorro' && !b.paro && !b.tocado && (b.x - b.mitad) * b.dir >= 0) { b.paro = true; b.pausa = 2.5 + Math.random() * 2; continue; }
      if ((b.tipo === 'guanaco' || b.tipo === 'caballo') && !b.tocado && Math.random() < dt * 0.12) { b.pausa = 2 + Math.random() * 3; continue; }
      b.x += b.dir * b.v * (b.tocado ? 2.6 : 1) * dt;
      if (b.vy) b.y += b.vy * dt;
      if (b.x < -60 || b.x > d.w + 60) this.bichos.splice(i, 1);
    }

    /* --- reacciones de la gente --- */
    if (!this.ahorro) {
      this.sigEmo -= real;
      if (this.sigEmo <= 0) {
        this.sigEmo = 1.8 + Math.random() * 2.6;
        const quietos = this.gente.filter(p => p.estado === 'quieto' && (p.tipo === 'turista' || p.pareja));
        if (quietos.length) {
          const p = this.elegir(quietos), k = this.escalaEn(p.y, d);
          const lista = p.pareja ? ['💕', '💞', '☕'] : d.clima === 'nublado' ? ['☁️', '😕', '🥶'] : (e.noche && e.noche.lluvia) ? ['🌠', '🤩', '😮', '✨'] : ['✨', '🤩', '😍', '🔭', '💫', '📷', '❤️', '😮'];
          this.flotar(this.elegir(lista), p.x, p.y - 12 * k, { tam: 11, dura: 1.7, vy: -11 });
        }
      }
    }

    /* --- dibujar: cielo, van, suelo, flotantes --- */
    for (const b of this.bichos) if (b.cielo) this.dibujarBicho(ctx, b, d);
    if (van != null) this.dibujarVan(ctx, van, yVan, d, H < 20.3 || H >= 25.9);
    const orden = this.gente.slice().sort((a, b) => a.y - b.y);
    for (const b of this.bichos) if (!b.cielo) this.dibujarBicho(ctx, b, d);
    const guia = this.gente.find(p => p.tipo === 'guia');
    if (guia && guia.estado === 'quieto' && d.noche && d.clima !== 'nublado' && ((d.t + guia.n) % 11) < 4.5) this.laserGuia(ctx, guia, d);
    for (const p of orden) (p.tipo === 'perro' ? this.dibujarPerro(ctx, p, d) : this.persona(ctx, p, d));
    this.dibujarFlot(ctx, real);
  },

  /* ---------- personas ---------- */
  persona(ctx, p, d) {
    const k = this.escalaEn(p.y, d) * 1.15, x = p.x, y = p.y, osc = d.osc * 1.05;
    const anda = p.estado !== 'quieto' && p.espera <= 0, s = anda ? Math.sin(p.fase) : 0;
    ctx.strokeStyle = this.mez([70, 66, 84], [12, 14, 28], osc); ctx.lineWidth = 1.2 * k; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - 0.7 * k, y - 3.2 * k); ctx.lineTo(x - 0.7 * k - s * 1.5 * k, y); ctx.moveTo(x + 0.7 * k, y - 3.2 * k); ctx.lineTo(x + 0.7 * k + s * 1.5 * k, y); ctx.stroke();
    ctx.fillStyle = this.mez(p.col, [18, 20, 38], osc); ctx.fillRect(x - 1.5 * k, y - 7.6 * k, 3 * k, 4.6 * k);
    ctx.fillStyle = this.mez([236, 200, 170], [24, 26, 44], osc); ctx.beginPath(); ctx.arc(x, y - 9 * k, 1.55 * k, 0, 6.283); ctx.fill();
    if (p.casco) { ctx.fillStyle = this.mez([240, 190, 40], [80, 66, 40], osc); ctx.beginPath(); ctx.arc(x, y - 9.4 * k, 1.75 * k, Math.PI, 0); ctx.fill(); }
    /* en astroturismo se usa luz roja para no encandilar */
    if (d.noche && p.tipo === 'turista' && (p.n + Math.floor(d.t * 1.3)) % 5 !== 0) { ctx.fillStyle = 'rgba(255,60,60,0.9)'; ctx.fillRect(x + p.dir * 1.9 * k, y - 4.4 * k, 1.5 * k, 1.5 * k); }
  },
  laserGuia(ctx, g, d) {
    const k = this.escalaEn(g.y, d) * 1.15, x0 = g.x + 2 * k, y0 = g.y - 7 * k;
    const x1 = g.x + Math.sin(d.t * 0.21 + g.n) * d.w * 0.24, y1 = d.hz * (0.2 + 0.12 * Math.cos(d.t * 0.17));
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(110,255,140,0.13)'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.strokeStyle = 'rgba(130,255,160,0.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.restore();
  },
  dibujarPerro(ctx, p, d) {
    const anda = p.estado !== 'quieto' && p.espera <= 0;
    this.cuadrupedo(ctx, p.x, p.y, this.escalaEn(p.y, d) * 0.95, p.dir, anda ? p.fase * 1.6 : 0, this.mez([200, 160, 110], [34, 32, 48], d.osc * 1.05),
      { L: 4.6, A: 3, G: 1.9, cuelloX: 1, cuelloY: 1.6, cabeza: 1.9, cola: 'fina', mueve: d.t * 14 });
  },

  /* ---------- la van ---------- */
  dibujarVan(ctx, x, y, d, andando) {
    const osc = d.osc, k = Math.max(0.9, Math.min(1.25, d.w / 420));
    ctx.save(); ctx.translate(x, y + (andando ? Math.sin(d.t * 22) * 0.4 : 0)); ctx.scale(k, k);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(0, 1, 17, 2.4, 0, 0, 6.283); ctx.fill();
    ctx.fillStyle = this.mez([244, 244, 240], [70, 74, 98], osc);
    ctx.beginPath(); ctx.moveTo(-15, -2); ctx.lineTo(-15, -10); ctx.quadraticCurveTo(-15, -13, -12, -13); ctx.lineTo(8, -13); ctx.quadraticCurveTo(13, -13, 15, -8); ctx.lineTo(15, -2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = this.mez([232, 140, 60], [90, 60, 50], osc); ctx.fillRect(-15, -6.2, 30, 1.8);
    ctx.fillStyle = osc > 0.45 ? 'rgba(255,214,150,0.85)' : this.mez([120, 160, 200], [40, 44, 60], osc);
    for (let i = 0; i < 3; i++) ctx.fillRect(-12.5 + i * 6.4, -11.4, 4.8, 3.6);
    ctx.fillRect(7.4, -11.4, 4.6, 3.6);
    ctx.fillStyle = this.mez([40, 40, 48], [10, 10, 18], osc);
    ctx.beginPath(); ctx.arc(-8.5, -1.6, 2.6, 0, 6.283); ctx.arc(8.5, -1.6, 2.6, 0, 6.283); ctx.fill();
    if (osc > 0.4 && andando) {
      const g = ctx.createLinearGradient(15, -5, 52, -3); g.addColorStop(0, 'rgba(255,236,170,0.5)'); g.addColorStop(1, 'rgba(255,236,170,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(15, -6); ctx.lineTo(54, -11); ctx.lineTo(54, 2); ctx.lineTo(15, -3.4); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  },

  /* ---------- animales ---------- */
  cuadrupedo(ctx, x, y, k, dir, fase, col, o) {
    ctx.save(); ctx.translate(x, y); ctx.scale(dir * k, k);
    ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineCap = 'round';
    const s = Math.sin(fase) * (o.zancada || 1.5), L = o.L, A = o.A, G = o.G, lomo = -A - G * 0.6;
    ctx.lineWidth = o.pata || 1.2;
    ctx.beginPath();
    ctx.moveTo(-L * 0.72, -A); ctx.lineTo(-L * 0.72 - s, 0); ctx.moveTo(-L * 0.42, -A); ctx.lineTo(-L * 0.42 + s, 0);
    ctx.moveTo(L * 0.42, -A); ctx.lineTo(L * 0.42 + s, 0); ctx.moveTo(L * 0.72, -A); ctx.lineTo(L * 0.72 - s, 0);
    ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, lomo, L, G, 0, 0, 6.283); ctx.fill();
    /* cuello y cabeza (o.baja: comiendo) */
    const hx = L * 0.8 + o.cuelloX, hy = o.baja ? -A * 0.35 : lomo - o.cuelloY;
    ctx.lineWidth = o.cuello || G * 0.9;
    ctx.beginPath(); ctx.moveTo(L * 0.7, lomo); ctx.lineTo(hx, hy); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(hx + o.cabeza * 0.55, hy, o.cabeza, o.cabeza * 0.68, 0.15, 0, 6.283); ctx.fill();
    ctx.beginPath(); ctx.moveTo(hx - o.cabeza * 0.3, hy - o.cabeza * 0.4); ctx.lineTo(hx - o.cabeza * 0.1, hy - o.cabeza * 1.6); ctx.lineTo(hx + o.cabeza * 0.45, hy - o.cabeza * 0.5); ctx.closePath(); ctx.fill();
    /* cola */
    if (o.cola === 'gruesa') { ctx.beginPath(); ctx.ellipse(-L - 3.4, lomo + 0.6, 4.6, 1.9, -0.45 + Math.sin(fase * 0.5) * 0.12, 0, 6.283); ctx.fill(); if (o.punta) { ctx.fillStyle = o.punta; ctx.beginPath(); ctx.arc(-L - 7, lomo - 1.2, 1.5, 0, 6.283); ctx.fill(); } }
    else if (o.cola === 'larga') { ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-L, lomo); ctx.quadraticCurveTo(-L - 4, lomo + 1 + Math.sin(fase * 0.4), -L - 3, lomo + A * 0.8); ctx.stroke(); }
    else if (o.cola === 'fina') { ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(-L, lomo); ctx.lineTo(-L - 2.4, lomo - 2.6 + Math.sin(o.mueve || 0) * 1.4); ctx.stroke(); }
    else { ctx.beginPath(); ctx.arc(-L - 0.4, lomo, 1.2, 0, 6.283); ctx.fill(); }
    if (o.ojo) { ctx.fillStyle = o.ojo; ctx.fillRect(hx + o.cabeza * 0.5, hy - o.cabeza * 0.4, 1, 1); }
    ctx.restore();
  },
  nuevoBicho(d) {
    const posibles = [], pais = d.sitio.paisaje, claro = d.clima !== 'nublado';
    if (d.noche) {
      if (claro) posibles.push('satelite', 'satelite');
      if (pais !== 'isla') posibles.push('zorro', 'zorro');
      posibles.push('lechuza');
      if (claro && Math.random() < 0.05) posibles.push('ovni');
    } else if (d.osc < 0.2) {
      if (pais === 'isla') posibles.push('caballo', 'caballo', 'ave');
      else { posibles.push('condor'); if (pais !== 'valle') posibles.push('guanaco', 'guanaco'); else if (claro) posibles.push('globo'); }
    }
    if (!posibles.length) return;
    const tipo = this.elegir(posibles);
    if (this.bichos.some(b => b.tipo === tipo)) return;
    const dir = Math.random() < 0.5 ? 1 : -1, suelo = d.h - d.hz;
    const b = { tipo, dir, t: 0, fase: Math.random() * 6, x: dir > 0 ? -30 : d.w + 30, y: 0, v: 0, vy: 0, pausa: 0, cielo: false };
    if (tipo === 'zorro') { b.y = d.hz + suelo * (0.17 + Math.random() * 0.12); b.v = 24; b.mitad = d.w * (0.3 + Math.random() * 0.4); }
    else if (tipo === 'guanaco' || tipo === 'caballo') { b.y = d.hz + suelo * (0.1 + Math.random() * 0.1); b.v = 8; b.n = 1 + Math.floor(Math.random() * 3); }
    else {
      b.cielo = true;
      if (tipo === 'condor' || tipo === 'ave') { b.y = d.hz * (0.22 + Math.random() * 0.3); b.v = 20; }
      else if (tipo === 'lechuza') { b.y = d.hz * (0.6 + Math.random() * 0.2); b.v = 44; }
      else if (tipo === 'globo') { b.y = d.hz * (0.28 + Math.random() * 0.2); b.v = 5; b.col = Math.floor(Math.random() * 3); }
      else if (tipo === 'satelite') { b.y = d.hz * (0.12 + Math.random() * 0.4); b.v = d.w / (9 + Math.random() * 6); b.vy = (Math.random() - 0.5) * 7; }
      else if (tipo === 'ovni') { b.y = d.hz * 0.3; b.v = 30; }
    }
    this.bichos.push(b);
  },
  lanzarFugaz(d) {
    const dir = Math.random() < 0.5 ? 1 : -1, x = d.w * (dir > 0 ? 0.12 + Math.random() * 0.3 : 0.58 + Math.random() * 0.3);
    this.bichos.push({ tipo: 'fugaz', cielo: true, dir, t: 0, fase: 0, dura: 1.7, x, y: d.hz * (0.08 + Math.random() * 0.12), vx: dir * d.w * 0.3, vy: d.hz * 0.2, pausa: 0 });
    if (this.alDeseo) this.alDeseo();
  },
  dibujarBicho(ctx, b, d) {
    const osc = d.osc * 1.05, x = b.x, y = b.y;
    switch (b.tipo) {
      case 'zorro':
        this.cuadrupedo(ctx, x, y, this.escalaEn(y, d) * 1.1, b.dir, b.pausa > 0 ? 0 : b.fase, this.mez([204, 112, 52], [44, 38, 54], osc),
          { L: 6.4, A: 3.6, G: 2.4, cuelloX: 0.6, cuelloY: 2.4, cabeza: 2.5, cola: 'gruesa', punta: this.mez([244, 236, 220], [96, 96, 116], osc), ojo: osc > 0.5 ? 'rgba(190,255,170,0.95)' : null });
        break;
      case 'guanaco': case 'caballo':
        for (let i = 0; i < (b.n || 1); i++) {
          const caballo = b.tipo === 'caballo', col = caballo ? this.mez(i % 2 ? [92, 62, 44] : [150, 104, 66], [24, 22, 34], osc) : this.mez([196, 150, 100], [30, 28, 40], osc);
          this.cuadrupedo(ctx, x - b.dir * i * 17, y + (i % 2) * 2.2, this.escalaEn(y, d) * (1.05 - i * 0.08), b.dir, b.pausa > 0 ? 0 : b.fase * 0.55 + i,
            col, caballo ? { L: 7.6, A: 6.4, G: 3, cuelloX: 2, cuelloY: 4.4, cabeza: 2.6, cola: 'larga', baja: b.pausa > 0 && i === 0, zancada: 2 }
              : { L: 6.6, A: 7, G: 2.7, cuelloX: 1.2, cuelloY: 7, cabeza: 2, cuello: 1.7, cola: 'corta', baja: b.pausa > 0 && i === 1, zancada: 1.8 });
        }
        break;
      case 'condor': case 'ave': case 'lechuza': {
        const lech = b.tipo === 'lechuza', cond = b.tipo === 'condor', e = cond ? 11 : lech ? 6 : 6.5;
        const bate = cond ? Math.sin(b.fase * 0.12) * 0.25 : Math.sin(b.fase * (lech ? 1.1 : 0.9)), yy = y + Math.sin(b.t * 0.7 + b.fase * 0.01) * 5;
        ctx.strokeStyle = lech ? 'rgba(226,220,204,0.75)' : this.mez(cond ? [34, 30, 34] : [70, 70, 84], [14, 14, 24], osc);
        ctx.lineWidth = cond ? 2 : 1.4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x - e, yy - bate * e * 0.42); ctx.quadraticCurveTo(x - e * 0.45, yy - e * 0.34 - bate * 1.5, x, yy); ctx.quadraticCurveTo(x + e * 0.45, yy - e * 0.34 - bate * 1.5, x + e, yy - bate * e * 0.42); ctx.stroke();
        if (cond) { ctx.fillStyle = 'rgba(240,240,236,0.9)'; ctx.beginPath(); ctx.arc(x + b.dir * 1.4, yy - 0.4, 1.2, 0, 6.283); ctx.fill(); }
        break;
      }
      case 'globo': {
        const yy = y + Math.sin(b.t * 0.5) * 4, R = 10, cols = [['#e8615a', '#f6c453'], ['#4f8fd9', '#f1f1ec'], ['#7fbf7a', '#f29e4c']][b.col || 0];
        ctx.fillStyle = cols[0]; ctx.beginPath(); ctx.arc(x, yy, R, 0, 6.283); ctx.fill();
        ctx.fillStyle = cols[1]; ctx.beginPath(); ctx.ellipse(x, yy, R * 0.42, R, 0, 0, 6.283); ctx.fill();
        ctx.fillStyle = cols[0]; ctx.beginPath(); ctx.ellipse(x, yy, R * 0.14, R, 0, 0, 6.283); ctx.fill();
        ctx.strokeStyle = 'rgba(60,50,40,0.7)'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(x - R * 0.55, yy + R * 0.82); ctx.lineTo(x - 2, yy + R + 6); ctx.moveTo(x + R * 0.55, yy + R * 0.82); ctx.lineTo(x + 2, yy + R + 6); ctx.stroke();
        ctx.fillStyle = '#8a5a34'; ctx.fillRect(x - 2.4, yy + R + 6, 4.8, 3.4);
        if (Math.floor(b.t * 2) % 3 === 0) { ctx.fillStyle = 'rgba(255,190,90,0.9)'; ctx.beginPath(); ctx.arc(x, yy + R + 3.6, 1.3, 0, 6.283); ctx.fill(); }
        break;
      }
      case 'satelite': {
        const k = Math.max(0, Math.min(1, b.x / d.w)), brillo = 0.45 + 0.5 * Math.pow(Math.sin(k * Math.PI), 6);
        ctx.strokeStyle = 'rgba(255,255,255,' + (brillo * 0.25).toFixed(3) + ')'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - b.dir * 12, y - (b.vy / b.v) * 12); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,' + brillo.toFixed(3) + ')'; ctx.beginPath(); ctx.arc(x, y, 1.1 + brillo * 0.8, 0, 6.283); ctx.fill();
        break;
      }
      case 'ovni': {
        const yy = y + Math.sin(b.t * 3.1) * 7, xx = x + Math.sin(b.t * 5.3) * 5;
        ctx.fillStyle = 'rgba(190,200,220,0.9)'; ctx.beginPath(); ctx.ellipse(xx, yy, 10, 3, 0, 0, 6.283); ctx.fill();
        ctx.fillStyle = 'rgba(150,230,255,0.85)'; ctx.beginPath(); ctx.arc(xx, yy - 1.6, 4, Math.PI, 0); ctx.fill();
        for (let i = -1; i <= 1; i++) { ctx.fillStyle = (Math.floor(b.t * 6) + i) % 3 === 0 ? '#ffe36b' : '#ff6b8f'; ctx.beginPath(); ctx.arc(xx + i * 5.5, yy + 0.8, 1, 0, 6.283); ctx.fill(); }
        break;
      }
      case 'fugaz': {
        const a = Math.sin(Math.min(1, b.t / b.dura) * Math.PI), L = 0.34;
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createLinearGradient(x, y, x - b.vx * L, y - b.vy * L);
        g.addColorStop(0, 'rgba(255,255,255,' + (0.95 * a).toFixed(3) + ')'); g.addColorStop(0.3, 'rgba(255,224,150,' + (0.5 * a).toFixed(3) + ')'); g.addColorStop(1, 'rgba(160,200,255,0)');
        ctx.strokeStyle = g; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - b.vx * L, y - b.vy * L); ctx.stroke();
        ctx.fillStyle = 'rgba(255,250,230,' + a.toFixed(3) + ')'; ctx.beginPath(); ctx.arc(x, y, 2.6, 0, 6.283); ctx.fill();
        ctx.fillStyle = 'rgba(255,230,170,' + (0.25 * a).toFixed(3) + ')'; ctx.beginPath(); ctx.arc(x, y, 8, 0, 6.283); ctx.fill();
        ctx.restore();
        break;
      }
    }
  },

  /* ---------- tocar algo de la escena ---------- */
  tocar(x, y) {
    let mejor = null, md = 1e9;
    for (const b of this.bichos) {
      const r = this.TOCABLES[b.tipo]; if (!r) continue;
      for (let i = 0; i < (b.n || 1); i++) {
        const dist = Math.hypot(b.x - b.dir * i * 17 - x, b.y - (b.cielo ? 0 : 5) - y);
        if (dist < r && dist < md) { md = dist; mejor = b; }
      }
    }
    if (!mejor) return null;
    const primera = !mejor.tocado; mejor.tocado = true; mejor.pausa = 0;
    return { tipo: mejor.tipo, x: mejor.x, y: mejor.y, primera };
  },

  /* ---------- lo que flota: plata, emojis ---------- */
  flotar(txt, x, y, o) {
    this.flot.push(Object.assign({ txt, x, y, vida: 0, dura: 1.9, vy: -15, col: '255,214,130', tam: 12 }, o || {}));
    if (this.flot.length > 16) this.flot.shift();
  },
  plata(monto) {
    const d = this.ult; if (!d || !(monto > 0)) return;
    const pts = this.puntos(d), lista = pts.comer.length && Math.random() < 0.35 ? pts.comer : (pts.ver.length ? pts.ver : pts.todos);
    const p = lista.length ? this.elegir(lista) : { x: d.w / 2, y: d.hz + (d.h - d.hz) * 0.5, s: 50 };
    this.flotar('+' + fmtPlata(monto), Math.max(34, Math.min(d.w - 34, p.x)), p.y - p.s * 0.8, { tam: 13, dura: 2.3, vy: -13 });
  },
  dibujarFlot(ctx, dt) {
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let i = this.flot.length - 1; i >= 0; i--) {
      const f = this.flot[i]; f.vida += dt; f.y += f.vy * dt;
      if (f.vida >= f.dura) { this.flot.splice(i, 1); continue; }
      const k = f.vida / f.dura, a = k < 0.15 ? k / 0.15 : 1 - Math.pow(Math.max(0, (k - 0.55) / 0.45), 2);
      ctx.globalAlpha = Math.max(0, Math.min(1, a));
      ctx.font = '700 ' + f.tam + 'px system-ui, -apple-system, "Segoe UI", sans-serif';
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(6,8,22,0.75)'; ctx.strokeText(f.txt, f.x, f.y);
      ctx.fillStyle = 'rgb(' + f.col + ')'; ctx.fillText(f.txt, f.x, f.y);
    }
    ctx.restore();
  },
};
