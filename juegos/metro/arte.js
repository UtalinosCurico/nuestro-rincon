/* ============================================================
   ARTE — el plano de Curicó dibujado en el lienzo
   Las líneas y las estaciones tienen un tamaño fijo en pantalla;
   el mapa se aleja de a poco a medida que crece la ciudad.
   ============================================================ */
const Arte = {
  W: 0, H: 0, dpr: 1, area: { x: 0, y: 0, w: 1, h: 1 }, escala: 1, escalaObj: 1,
  oscuro: false, efectos: [], arrastre: null, resaltar: null,
  colores() {
    return this.oscuro
      ? { papel: '#1c2130', calle: 'rgba(255,255,255,.05)', agua: '#2f5d82', aguaBorde: '#3f78a6', cerro: '#33513a', cerroLinea: 'rgba(160,210,150,.18)', plaza: '#2c4a32', texto: 'rgba(225,230,240,.55)', tinta: '#e9ecf3', estacion: '#22283a', vina: 'rgba(150,120,190,.35)', tren: 'rgba(220,220,230,.35)', fuera: 'rgba(0,0,0,.35)' }
      : { papel: '#f4efe4', calle: 'rgba(60,50,40,.06)', agua: '#a9d3ee', aguaBorde: '#7fb6dc', cerro: '#bcd7a0', cerroLinea: 'rgba(70,110,50,.18)', plaza: '#b5d79b', texto: 'rgba(60,52,44,.5)', tinta: '#2d2a32', estacion: '#ffffff', vina: 'rgba(120,80,140,.28)', tren: 'rgba(70,60,60,.32)', fuera: 'rgba(40,30,20,.08)' };
  },

  disponer(W, H, area, dpr) { this.W = W; this.H = H; this.area = area; this.dpr = dpr; this.ajustarCamara(true); },
  ajustarCamara(inmediato) {
    if (!J) return;
    const r = region(), m = 30;
    this.escalaObj = Math.min(this.area.w / (r.w + m * 2), this.area.h / (r.h + m * 2));
    if (inmediato) this.escala = this.escalaObj;
  },
  aPantalla(x, y) { return [this.area.x + this.area.w / 2 + x * this.escala, this.area.y + this.area.h / 2 + y * this.escala]; },
  aMundo(sx, sy) { return [(sx - this.area.x - this.area.w / 2) / this.escala, (sy - this.area.y - this.area.h / 2) / this.escala]; },

  /* ---------- un cuadro ---------- */
  dibujar(ctx, dt) {
    const c = this.colores(), dpr = this.dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = c.papel; ctx.fillRect(0, 0, this.W, this.H);
    if (!J) return;
    this.ajustarCamara(false);
    this.escala += (this.escalaObj - this.escala) * Math.min(1, dt * 1.5);
    const e = this.escala;
    ctx.save();
    ctx.translate(this.area.x + this.area.w / 2, this.area.y + this.area.h / 2);
    ctx.scale(e, e);
    this.mapa(ctx, c, e);
    this.lineas(ctx, c, e);
    ctx.restore();
    this.trenes(ctx, c);
    this.estaciones(ctx, c);
    this.vistaArrastre(ctx);
    this.dibujarEfectos(ctx, dt);
  },

  mapa(ctx, c, e) {
    const r = region(), x0 = r.x0 - 400, x1 = r.x1 + 400, y0 = r.y0 - 400, y1 = r.y1 + 400;
    /* calles */
    ctx.strokeStyle = c.calle; ctx.lineWidth = 1.2 / e;
    ctx.beginPath();
    for (let x = Math.floor(x0 / 60) * 60; x <= x1; x += 60) { ctx.moveTo(x, y0); ctx.lineTo(x, y1); }
    for (let y = Math.floor(y0 / 60) * 60; y <= y1; y += 60) { ctx.moveTo(x0, y); ctx.lineTo(x1, y); }
    ctx.stroke();
    /* viñas en las afueras */
    ctx.strokeStyle = c.vina; ctx.lineWidth = 2.2 / e; ctx.setLineDash([5 / e, 6 / e]);
    ctx.beginPath();
    for (let y = Math.floor(y0 / 26) * 26; y <= y1; y += 26) {
      for (const [a, b] of [[x0, -560], [560, x1]]) { if (b > a) { ctx.moveTo(a, y); ctx.lineTo(b, y); } }
    }
    ctx.stroke(); ctx.setLineDash([]);
    /* la línea del tren de verdad (la que va a Santiago) */
    ctx.strokeStyle = c.tren; ctx.lineWidth = 3 / e;
    ctx.beginPath(); GEO.tren.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
    ctx.lineWidth = 7 / e; ctx.setLineDash([1.5 / e, 9 / e]);
    ctx.beginPath(); GEO.tren.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); ctx.setLineDash([]);
    /* estero */
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = c.aguaBorde; ctx.lineWidth = GEO.esteroAncho + 4 / e;
    ctx.beginPath(); GEO.estero.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
    ctx.strokeStyle = c.agua; ctx.lineWidth = GEO.esteroAncho;
    ctx.stroke();
    /* cerro Condell */
    const cc = centroCerro();
    ctx.fillStyle = c.cerro;
    ctx.beginPath(); GEO.cerro.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = c.cerroLinea; ctx.lineWidth = 1.5 / e;
    for (const k of [.72, .46, .22]) {
      ctx.beginPath(); GEO.cerro.forEach(([x, y], i) => { const px = cc.x + (x - cc.x) * k, py = cc.y + (y - cc.y) * k; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }); ctx.closePath(); ctx.stroke();
    }
    /* Plaza de Armas */
    const p = GEO.plaza;
    ctx.fillStyle = c.plaza; ctx.fillRect(p.x - p.lado / 2, p.y - p.lado / 2, p.lado, p.lado);
    ctx.strokeStyle = c.cerroLinea; ctx.lineWidth = 2 / e;
    ctx.beginPath(); ctx.moveTo(p.x - p.lado / 2, p.y - p.lado / 2); ctx.lineTo(p.x + p.lado / 2, p.y + p.lado / 2); ctx.moveTo(p.x + p.lado / 2, p.y - p.lado / 2); ctx.lineTo(p.x - p.lado / 2, p.y + p.lado / 2); ctx.stroke();
    ctx.fillStyle = this.oscuro ? '#4f7a55' : '#7fb06a';
    for (const [dx, dy] of [[-.32, -.32], [.32, -.32], [-.32, .32], [.32, .32], [0, -.4], [0, .4], [-.4, 0], [.4, 0]]) { ctx.beginPath(); ctx.arc(p.x + dx * p.lado, p.y + dy * p.lado, 4.5, 0, 7); ctx.fill(); }
    ctx.fillStyle = this.oscuro ? '#c9b98f' : '#f6e7c3'; ctx.strokeStyle = c.texto; ctx.lineWidth = 1.2 / e;
    ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + Math.PI / 8; ctx.lineTo(p.x + Math.cos(a) * 8, p.y + Math.sin(a) * 8); } ctx.closePath(); ctx.fill(); ctx.stroke();
    /* nombres del mapa */
    ctx.fillStyle = c.texto; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `600 ${11 / e}px Fredoka, system-ui, sans-serif`;
    ctx.fillText('Plaza de Armas', p.x, p.y + p.lado / 2 + 12 / e);
    ctx.fillText('Cerro Condell', cc.x, cc.y);
    ctx.save(); ctx.translate(-470, -150); ctx.rotate(-.06); ctx.fillText('Estero Guaiquillo', 0, -GEO.esteroAncho / 2 - 9 / e); ctx.restore();
    ctx.save(); ctx.translate(-283, 420); ctx.rotate(-Math.PI / 2 + .02); ctx.fillText('línea del tren', 0, -11 / e); ctx.restore();
    ctx.font = `700 ${26 / e}px Fredoka, system-ui, sans-serif`; ctx.globalAlpha = .45;
    ctx.fillText('CURICÓ', 0, r.y1 - 26 / e); ctx.globalAlpha = 1;
    /* fuera de la ciudad, un poco más oscuro */
    ctx.fillStyle = c.fuera;
    ctx.beginPath(); ctx.rect(x0, y0, x1 - x0, y1 - y0); ctx.rect(r.x0, r.y0, r.w, r.h); ctx.fill('evenodd');
  },

  /* Cuántas líneas pasan por cada tramo, para dibujarlas lado a lado. */
  desplazamientos() {
    const uso = new Map();
    const clave = (a, b) => (a < b ? a + '-' + b : b + '-' + a);
    for (const l of J.lineas) {
      const e = l.est;
      const pares = []; for (let i = 0; i + 1 < e.length; i++) pares.push([e[i], e[i + 1]]);
      if (l.loop && e.length > 2) pares.push([e[e.length - 1], e[0]]);
      for (const [a, b] of pares) { const k = clave(a, b); if (!uso.has(k)) uso.set(k, []); uso.get(k).push(l.id); }
    }
    return { uso, clave };
  },
  lineas(ctx, c, e) {
    const ancho = 7 / e, { uso, clave } = this.desplazamientos();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const l of J.lineas) {
      const est = l.est.map(id => EST.get(id));
      const pares = []; for (let i = 0; i + 1 < est.length; i++) pares.push([est[i], est[i + 1]]);
      if (l.loop && est.length > 2) pares.push([est[est.length - 1], est[0]]);
      ctx.strokeStyle = LINEAS[l.c].color; ctx.lineWidth = ancho;
      for (const [a, b] of pares) {
        const lista = uso.get(clave(a.id, b.id)) || [l.id];
        const k = lista.indexOf(l.id) - (lista.length - 1) / 2;
        const p = tramo(a, b);
        ctx.beginPath();
        for (let i = 0; i < p.length; i++) {
          const q = p[Math.min(i + 1, p.length - 1)], o = p[Math.max(i - 1, 0)];
          const dx = q[0] - o[0], dy = q[1] - o[1], d = Math.hypot(dx, dy) || 1;
          const off = k * ancho * 1.05 * (a.id < b.id ? 1 : -1);
          const x = p[i][0] - dy / d * off, y = p[i][1] + dx / d * off;
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.stroke();
        const cost = costoTramo(a, b);
        if (cost.puentes) this.puentes(ctx, p, e);
      }
      if (!l.loop) this.manijas(ctx, l, est, e);
    }
    /* los tramos bajo el cerro se ven como túneles */
    ctx.globalAlpha = .62; ctx.fillStyle = c.cerro;
    ctx.beginPath(); GEO.cerro.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
  },
  puentes(ctx, p, e) {
    ctx.save(); ctx.strokeStyle = this.oscuro ? '#c9d2e3' : '#5b5560'; ctx.lineWidth = 2 / e;
    for (let k = 0; k + 1 < p.length; k++) for (let i = 0; i + 1 < GEO.estero.length; i++) {
      const A = p[k], B = p[k + 1], C = GEO.estero[i], D = GEO.estero[i + 1];
      if (!segInter(A, B, C, D)) continue;
      const d1 = orient(C, D, A), d2 = orient(C, D, B), t = d1 / (d1 - d2);
      const x = lerp(A[0], B[0], t), y = lerp(A[1], B[1], t), ang = Math.atan2(B[1] - A[1], B[0] - A[0]);
      const nx = -Math.sin(ang), ny = Math.cos(ang), lx = Math.cos(ang), ly = Math.sin(ang), L = 20, Wd = 8 / e;
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x - lx * L + nx * Wd * s, y - ly * L + ny * Wd * s); ctx.lineTo(x + lx * L + nx * Wd * s, y + ly * L + ny * Wd * s); ctx.stroke(); }
    }
    ctx.restore();
  },
  /* La manija de cada punta: de ahí se arrastra para alargar la línea. */
  manija(l, extremo) {
    const est = l.est.map(id => EST.get(id));
    const fin = extremo === 'fin' ? est[est.length - 1] : est[0];
    const prev = extremo === 'fin' ? est[est.length - 2] : est[1];
    const p = tramo(prev, fin), a = p[p.length - 2], b = p[p.length - 1];
    let dx = b[0] - a[0], dy = b[1] - a[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const L = 26 / this.escala;
    return { x: fin.x + dx * L, y: fin.y + dy * L, dx, dy, est: fin };
  },
  manijas(ctx, l, est, e) {
    for (const ext of ['ini', 'fin']) {
      const m = this.manija(l, ext);
      ctx.beginPath(); ctx.moveTo(m.est.x, m.est.y); ctx.lineTo(m.x, m.y); ctx.stroke();
      const w = 9 / e;
      ctx.beginPath(); ctx.moveTo(m.x - m.dy * w, m.y + m.dx * w); ctx.lineTo(m.x + m.dy * w, m.y - m.dx * w); ctx.stroke();
    }
  },

  trenes(ctx, c) {
    for (const t of J.trenes) {
      const l = J.lineas.find(x => x.id === t.linea); const ruta = RUTAS.get(t.linea);
      if (!l || !ruta) continue;
      const [wx, wy, ang] = puntoEn(ruta, t.pos);
      const [x, y] = this.aPantalla(wx, wy);
      const autos = 1 + (t.vag || 0);
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang + (t.dir < 0 ? Math.PI : 0));
      for (let k = 0; k < autos; k++) {
        const ox = -k * 21;
        ctx.fillStyle = LINEAS[l.c].color; ctx.strokeStyle = this.oscuro ? '#0f121b' : '#ffffff'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.roundRect ? ctx.roundRect(ox - 10, -6.5, 19, 13, k === 0 ? [3, 6, 6, 3] : 3) : ctx.rect(ox - 10, -6.5, 19, 13); ctx.fill(); ctx.stroke();
        const desde = k * TREN.capacidad, hasta = Math.min(t.carga.length, desde + TREN.capacidad);
        for (let i = desde; i < hasta; i++) {
          const j = i - desde, px = ox - 6 + (j % 3) * 5.5, py = -2.6 + Math.floor(j / 3) * 5.2;
          this.glifo(ctx, t.carga[i].d, px, py, 4.4, '#ffffff');
        }
      }
      ctx.restore();
    }
  },
  estaciones(ctx, c) {
    const t = J.t;
    for (const s of J.estaciones) {
      const [x, y] = this.aPantalla(s.x, s.y);
      const nace = clamp((t - s.nace) / .45, 0, 1), k = nace < 1 ? .4 + .6 * (1 - Math.pow(1 - nace, 3)) : 1;
      const r = (s.grande ? 15 : 11) * k;
      if (nace < 1) { ctx.strokeStyle = `rgba(242,169,59,${(1 - nace).toFixed(3)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 14 + nace * 22, 0, 7); ctx.stroke(); }
      if (s.colapso > 0) {
        const pulso = s.colapso > .6 ? 1 + Math.sin(t * 8) * .08 : 1;
        ctx.fillStyle = `rgba(226,85,79,${(.12 + s.colapso * .18).toFixed(3)})`; ctx.beginPath(); ctx.arc(x, y, (r + 9) * pulso, 0, 7); ctx.fill();
        ctx.strokeStyle = '#e2554f'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(x, y, (r + 7) * pulso, -Math.PI / 2, -Math.PI / 2 + s.colapso * Math.PI * 2); ctx.stroke();
      }
      if (this.resaltar === s.id) { ctx.strokeStyle = '#f2a93b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, r + 6 + Math.sin(t * 6) * 2, 0, 7); ctx.stroke(); }
      ctx.fillStyle = c.estacion; ctx.strokeStyle = c.tinta; ctx.lineWidth = s.grande ? 3.4 : 2.6;
      ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.stroke();
      if (s.grande) { ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, r - 4, 0, 7); ctx.stroke(); }
      this.glifo(ctx, s.tipo, x, y, r * 1.15, c.tinta);
      /* la gente que espera, al lado */
      const n = s.cola.length, porFila = 6, mostrar = Math.min(n, 12);
      for (let i = 0; i < mostrar; i++) {
        const px = x + r + 9 + (i % porFila) * 10, py = y - 5.5 + Math.floor(i / porFila) * 11;
        this.glifo(ctx, s.cola[i].d, px, py, 8, c.tinta);
      }
      if (n > 12) { ctx.fillStyle = c.tinta; ctx.font = '700 11px Fredoka, system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText('+' + (n - 12), x + r + 9 + porFila * 10, y + 5); }
      /* nombre de los lugares especiales y de sus casas */
      if (!TIPOS_BASE.includes(s.tipo) || s.nombre.startsWith('Casa de') || s.nombre === 'La U') {
        ctx.font = '600 10.5px Fredoka, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.lineWidth = 3; ctx.strokeStyle = c.papel; ctx.strokeText(s.nombre, x, y + r + 4);
        ctx.fillStyle = c.tinta; ctx.fillText(s.nombre, x, y + r + 4);
      }
    }
  },
  vistaArrastre(ctx) {
    const a = this.arrastre; if (!a || !a.desde) return;
    const [x0, y0] = this.aPantalla(a.desde.x, a.desde.y);
    ctx.save(); ctx.strokeStyle = a.color || '#888'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.setLineDash([2, 10]); ctx.globalAlpha = .85;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(a.x, a.y); ctx.stroke(); ctx.restore();
    if (a.mal) { ctx.fillStyle = '#e2554f'; ctx.font = '700 16px Fredoka, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('✕', a.x, a.y - 18); }
  },

  /* Íconos de cada tipo de lugar, dibujados a mano (se leen chiquititos). */
  glifo(ctx, tipo, x, y, s, color) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s / 10, s / 10);
    ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineWidth = 1.6; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath();
    switch (tipo) {
      case 'casa': ctx.moveTo(-4.5, 4.5); ctx.lineTo(-4.5, -.5); ctx.lineTo(0, -5); ctx.lineTo(4.5, -.5); ctx.lineTo(4.5, 4.5); ctx.closePath(); ctx.fill(); break;
      case 'estudio': ctx.moveTo(0, -5.5); ctx.lineTo(5.5, 0); ctx.lineTo(0, 5.5); ctx.lineTo(-5.5, 0); ctx.closePath(); ctx.fill(); break;
      case 'compras': ctx.moveTo(-5.5, -4.2); ctx.lineTo(5.5, -4.2); ctx.lineTo(3.6, 2); ctx.lineTo(-3.6, 2); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.arc(-2.4, 4.1, 1.5, 0, 7); ctx.arc(2.4, 4.1, 1.5, 0, 7); ctx.fill(); break;
      case 'hospital': ctx.fillRect(-1.6, -5, 3.2, 10); ctx.fillRect(-5, -1.6, 10, 3.2); break;
      case 'estadio': ctx.arc(0, 0, 4.8, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * Math.PI * 2 / 5; ctx.lineTo(Math.cos(a) * 2, Math.sin(a) * 2); } ctx.closePath(); ctx.fill(); break;
      case 'estacion': ctx.roundRect ? ctx.roundRect(-4, -5, 8, 8.5, 2) : ctx.rect(-4, -5, 8, 8.5); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillRect(-2.6, -3.6, 5.2, 2.6); ctx.fillStyle = color; ctx.fillRect(-3.4, 3.6, 1.6, 1.6); ctx.fillRect(1.8, 3.6, 1.6, 1.6); break;
      case 'plaza': ctx.arc(0, -1.5, 3.8, 0, 7); ctx.fill(); ctx.fillRect(-.9, 1.5, 1.8, 4); break;
      case 'vina': for (const [a, b] of [[-2.6, -2], [0, -2], [2.6, -2], [-1.3, .3], [1.3, .3], [0, 2.6]]) { ctx.moveTo(a + 1.4, b); ctx.arc(a, b, 1.4, 0, 7); } ctx.fill(); ctx.beginPath(); ctx.moveTo(0, -3.4); ctx.lineTo(1.5, -5.4); ctx.stroke(); break;
      case 'mirador': ctx.moveTo(-5.5, 4); ctx.lineTo(-1, -4.5); ctx.lineTo(1.5, -.5); ctx.lineTo(3, -2.5); ctx.lineTo(5.5, 4); ctx.closePath(); ctx.fill(); break;
      default: ctx.arc(0, 0, 4, 0, 7); ctx.fill();
    }
    ctx.restore();
  },

  /* ---------- pequeños efectos ---------- */
  efecto(tipo, x, y, extra) { this.efectos.push(Object.assign({ tipo, x, y, t: 0 }, extra || {})); if (this.efectos.length > 40) this.efectos.shift(); },
  dibujarEfectos(ctx, dt) {
    for (const f of this.efectos) {
      f.t += dt;
      const [x, y] = this.aPantalla(f.x, f.y);
      if (f.tipo === 'entrega') {
        const k = f.t / .7; if (k >= 1) continue;
        ctx.globalAlpha = 1 - k; ctx.strokeStyle = '#2fae74'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x, y, 12 + k * 14, 0, 7); ctx.stroke(); ctx.globalAlpha = 1;
      }
    }
    this.efectos = this.efectos.filter(f => f.t < 1);
  },
};
