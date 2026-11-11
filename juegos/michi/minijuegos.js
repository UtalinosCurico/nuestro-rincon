/* ============================================================
   MINIJUEGOS — lienzo a pantalla completa
   Cada juego es un objeto con actualizar(dt), dibujar(ctx) y, si
   quiere, down/move/up(x, y) y tecla(nombre, apretada).
   ============================================================ */
const elegir = l => l[Math.floor(Math.random() * l.length)];
const entre = (a, b) => a + Math.random() * (b - a);
function barajar(l) { for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; } return l; }
function redondeado(c, x, y, w, h, r) {
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
function nube(c, x, y, w, h, color) {
  c.fillStyle = color;
  c.beginPath();
  c.ellipse(x + w * 0.5, y + h * 0.62, w * 0.5, h * 0.42, 0, 0, Math.PI * 2);
  c.ellipse(x + w * 0.32, y + h * 0.42, w * 0.24, h * 0.38, 0, 0, Math.PI * 2);
  c.ellipse(x + w * 0.62, y + h * 0.34, w * 0.26, h * 0.42, 0, 0, Math.PI * 2);
  c.fill();
}

const Mini = {
  m: null, juego: null, raf: 0, ultimo: 0, jugando: false, puntos: 0, alTerminar: null,
  canvas: null, ctx: null, dpr: 1, W: 0, H: 0, top: 70, sprites: new Map(), michi: null,

  async abrir(m) {
    this.m = m;
    $('#mini').hidden = false;
    this.canvas = $('#miniCanvas'); this.ctx = this.canvas.getContext('2d');
    this.medir();
    if (!this._conectado) this.conectar();
    this.jugando = false;
    $('#miniPuntos').textContent = '0'; $('#miniExtra').textContent = '';
    this.michi = await michiImagen({ pelaje: E.efectos.arcoiris ? 'arcoiris' : E.pelaje, ropa: E.puesto.ropa, ojos: 'normal', boca: 'lengua' });
    this.tarjetaInicio();
    this.fondoQuieto();
  },
  medir() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.W = window.innerWidth; this.H = window.innerHeight;
    this.canvas.width = Math.round(this.W * this.dpr); this.canvas.height = Math.round(this.H * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const hud = document.querySelector('.mini-hud');
    this.top = hud ? hud.getBoundingClientRect().bottom + 6 : 70;
  },
  conectar() {
    this._conectado = true;
    const pos = ev => { const r = this.canvas.getBoundingClientRect(); return [ev.clientX - r.left, ev.clientY - r.top]; };
    this.canvas.addEventListener('pointerdown', ev => { if (this.jugando && this.juego.down) { ev.preventDefault(); this.canvas.setPointerCapture(ev.pointerId); this.juego.down(...pos(ev)); } });
    this.canvas.addEventListener('pointermove', ev => { if (this.jugando && this.juego.move) this.juego.move(...pos(ev)); });
    const up = ev => { if (this.jugando && this.juego.up) this.juego.up(...pos(ev)); };
    this.canvas.addEventListener('pointerup', up);
    this.canvas.addEventListener('pointercancel', up);
    window.addEventListener('keydown', ev => { if (this.jugando && this.juego.tecla) { this.juego.tecla(ev.key, true); if (ev.key.startsWith('Arrow') || ev.key === ' ') ev.preventDefault(); } });
    window.addEventListener('keyup', ev => { if (this.jugando && this.juego.tecla) this.juego.tecla(ev.key, false); });
    window.addEventListener('resize', () => { if (!$('#mini').hidden) { this.medir(); if (!this.jugando) this.fondoQuieto(); } });
    $('#miniSalir').onclick = () => { if (this.jugando) this.fin(); else this.cerrar(); };
  },
  api() {
    const self = this;
    return {
      get W() { return self.W; }, get H() { return self.H; }, get top() { return self.top; },
      puntos(n) { self.puntos = n; $('#miniPuntos').textContent = fmt(n); },
      extra(t) { $('#miniExtra').textContent = t; },
      etiqueta(t) { $('#miniEtiqueta').textContent = t; },
      sonido(n) { Sonido.play(n); },
      nota(f, d) { Sonido.nota(f, d); },
      vibrar,
      fin() { self.fin(); },
      emoji: (ch, s) => self.emoji(ch, s),
      get michi() { return self.michi; },
    };
  },
  emoji(ch, s) {
    s = Math.round(s);
    const k = ch + '@' + s;
    if (this.sprites.has(k)) return this.sprites.get(k);
    const c = document.createElement('canvas');
    const px = Math.ceil(s * 1.3 * this.dpr);
    c.width = c.height = px;
    const x = c.getContext('2d');
    x.font = `${Math.round(s * this.dpr)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(ch, px / 2, px / 2 + s * 0.06 * this.dpr);
    const spr = { c, s: px / this.dpr };
    if (this.sprites.size > 400) this.sprites.clear();
    this.sprites.set(k, spr);
    return spr;
  },
  dibujarEmoji(ctx, ch, x, y, s, rot = 0, alpha = 1) {
    const sp = this.emoji(ch, s);
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); if (rot) ctx.rotate(rot);
    ctx.drawImage(sp.c, -sp.s / 2, -sp.s / 2, sp.s, sp.s); ctx.restore();
  },
  fondoQuieto() {
    const c = this.ctx, g = c.createLinearGradient(0, 0, 0, this.H);
    g.addColorStop(0, '#cfeaff'); g.addColorStop(1, '#fde7f0');
    c.fillStyle = g; c.fillRect(0, 0, this.W, this.H);
  },
  tarjetaInicio() {
    const m = this.m, rec = E.records[m.id] || 0;
    $('#miniTarjeta').innerHTML = `<div class="mini-caja"><div class="e">${m.emoji}</div><h2>${esc(m.nombre)}</h2>
      <p class="texto-suave">${esc(m.desc)}</p><div class="como">👆 ${esc(m.como)}</div>
      <p class="texto-suave">${rec ? 'Tu récord: <b>' + fmt(rec) + '</b>' : 'Todavía no tienes récord'}</p>
      <div class="fila-botones"><button class="boton claro" data-salir>Salir</button><button class="boton" data-jugar>▶ Jugar</button></div></div>`;
    $('#miniTarjeta').querySelector('[data-jugar]').onclick = () => this.empezar();
    $('#miniTarjeta').querySelector('[data-salir]').onclick = () => this.cerrar();
  },
  empezar() {
    $('#miniTarjeta').innerHTML = '';
    $('#miniEtiqueta').textContent = 'Puntos';
    this.medir();
    this.puntos = 0; $('#miniPuntos').textContent = '0'; $('#miniExtra').textContent = '';
    this.juego = JUEGOS[this.m.id](this.api());
    this.jugando = true; this.ultimo = performance.now();
    Sonido.play('tap');
    cancelAnimationFrame(this.raf);
    const bucle = t => {
      if (!this.jugando) return;
      let dt = (t - this.ultimo) / 1000; this.ultimo = t;
      if (dt > 0.05) dt = 0.05;
      if (!document.hidden) { this.juego.actualizar(dt); this.ctx.save(); this.juego.dibujar(this.ctx); this.ctx.restore(); }
      this.raf = requestAnimationFrame(bucle);
    };
    this.raf = requestAnimationFrame(bucle);
  },
  fin() {
    if (!this.jugando) return;
    this.jugando = false;
    cancelAnimationFrame(this.raf);
    Sonido.play('fin');
    const r = this.alTerminar ? this.alTerminar(this.m, this.puntos) : { monedas: 0, xp: 0, record: false, puntos: this.puntos };
    const p = puedeJugar();
    setTimeout(() => {
      $('#miniTarjeta').innerHTML = `<div class="mini-caja"><div class="e">${r.record && r.puntos ? '🏆' : this.m.emoji}</div>
        <h2>${r.record && r.puntos ? '¡Nuevo récord!' : '¡Bien jugado!'}</h2>
        <div class="grande">${fmt(r.puntos)}</div>
        ${r.record && r.anterior ? '<span class="nuevo">Antes: ' + fmt(r.anterior) + '</span>' : !r.record && E.records[this.m.id] ? '<p class="texto-suave">Récord: ' + fmt(E.records[this.m.id]) + '</p>' : ''}
        <div class="premios"><span>🪙 +${r.monedas}</span><span>⭐ +${r.xp} XP</span></div>
        ${p.ok ? '' : '<p class="texto-suave">' + esc(p.motivo) + '</p>'}
        <div class="fila-botones"><button class="boton claro" data-salir>Volver</button>${p.ok ? '<button class="boton" data-otra>↻ Otra vez</button>' : ''}</div></div>`;
      const t = $('#miniTarjeta');
      t.querySelector('[data-salir]').onclick = () => this.cerrar();
      const o = t.querySelector('[data-otra]'); if (o) o.onclick = () => this.empezar();
      if (r.record && r.puntos) confeti(['🏆', '⭐', '✨']);
    }, 350);
  },
  cerrar() {
    this.jugando = false; cancelAnimationFrame(this.raf);
    $('#mini').hidden = true; $('#miniTarjeta').innerHTML = '';
    this.juego = null;
    pintarTodo();
    if (colaNivel.length) setTimeout(mostrarNivel, 300);
  },
};

/* ============================================================
   LOS JUEGOS
   ============================================================ */
const JUEGOS = {
  /* ---------- Lluvia de comida ---------- */
  lluvia(api) {
    const BUENOS = ['🍎', '🍓', '🐟', '🧀', '🥛', '🍕', '🧁', '🍣', '🍪', '🍉'];
    const g = { x: api.W / 2, tx: api.W / 2, items: [], spawn: 0.4, pts: 0, vidas: 3, iman: 0, golpe: 0, salto: 0, izq: false, der: false, part: [] };
    const vidas = () => api.extra('❤️'.repeat(g.vidas) + '🤍'.repeat(3 - g.vidas));
    vidas();
    return {
      down(x) { g.tx = x; }, move(x, y) { g.tx = x; },
      tecla(k, ab) { if (k === 'ArrowLeft') g.izq = ab; if (k === 'ArrowRight') g.der = ab; },
      actualizar(dt) {
        const W = api.W, H = api.H, s = Math.min(64, W * 0.15);
        if (g.izq) g.tx -= 520 * dt; if (g.der) g.tx += 520 * dt;
        g.tx = clamp(g.tx, s, W - s);
        g.x += (g.tx - g.x) * Math.min(1, dt * 14);
        const dif = Math.min(1, g.pts / 90);
        g.spawn -= dt;
        if (g.spawn <= 0) {
          g.spawn = 0.8 - dif * 0.42 + Math.random() * 0.25;
          const malo = Math.random() < 0.16 + dif * 0.16;
          const oro = !malo && Math.random() < 0.05;
          g.items.push({ x: entre(30, W - 30), y: api.top - 30, ch: oro ? '⭐' : malo ? (Math.random() < 0.6 ? '🌶️' : '💣') : elegir(BUENOS), malo, oro, v: (175 + g.pts * 3) * entre(0.85, 1.15), rot: 0, vr: entre(-2, 2) });
        }
        const bocaY = H - s * 2.1;
        for (let i = g.items.length - 1; i >= 0; i--) {
          const it = g.items[i];
          it.y += it.v * dt; it.rot += it.vr * dt;
          if (g.iman > 0 && !it.malo) it.x += (g.x - it.x) * Math.min(1, dt * 3);
          if (it.y > bocaY - 14 && it.y < bocaY + s * 0.7 && Math.abs(it.x - g.x) < s * 0.95) {
            g.items.splice(i, 1);
            if (it.malo) {
              g.vidas--; api.sonido('mal'); api.vibrar(60); g.golpe = 0.45; vidas();
              if (g.vidas <= 0) { api.fin(); return; }
            } else {
              const n = it.oro ? 5 : it.ch === '🐟' ? 2 : 1;
              g.pts += n; api.puntos(g.pts); api.sonido(it.oro ? 'moneda' : 'pop'); g.salto = 0.18;
              if (it.oro) g.iman = 5;
              g.part.push({ x: it.x, y: bocaY - 20, t: 0.8, txt: '+' + n });
            }
          } else if (it.y > H + 40) g.items.splice(i, 1);
        }
        g.iman = Math.max(0, g.iman - dt); g.golpe = Math.max(0, g.golpe - dt); g.salto = Math.max(0, g.salto - dt);
        for (const p of g.part) { p.t -= dt; p.y -= 60 * dt; }
        g.part = g.part.filter(p => p.t > 0);
      },
      dibujar(c) {
        const W = api.W, H = api.H, s = Math.min(64, W * 0.15);
        const cielo = c.createLinearGradient(0, 0, 0, H);
        cielo.addColorStop(0, '#bfe6ff'); cielo.addColorStop(1, '#fff1d6');
        c.fillStyle = cielo; c.fillRect(0, 0, W, H);
        nube(c, W * 0.08, H * 0.18, 110, 50, 'rgba(255,255,255,.85)');
        nube(c, W * 0.62, H * 0.3, 130, 56, 'rgba(255,255,255,.75)');
        c.fillStyle = '#9fd68b'; c.fillRect(0, H - s * 0.55, W, s * 0.55);
        c.fillStyle = '#8bc977'; c.fillRect(0, H - s * 0.55, W, 6);
        for (const it of g.items) Mini.dibujarEmoji(c, it.ch, it.x, it.y, 42, it.rot);
        const sx = g.golpe > 0 ? Math.sin(g.golpe * 60) * 6 : 0;
        const mw = s * 2.2, mh = mw * 210 / 200;
        if (g.iman > 0) { c.fillStyle = 'rgba(255,215,90,.25)'; c.beginPath(); c.arc(g.x, H - mh * 0.55, mw * 0.75, 0, Math.PI * 2); c.fill(); }
        const my = H - mh - s * 0.25 - (g.salto > 0 ? 10 : 0);
        if (api.michi) c.drawImage(api.michi, g.x - mw / 2 + sx, my, mw, mh);
        c.font = '700 20px Fredoka, sans-serif'; c.textAlign = 'center'; c.fillStyle = '#c46a1c';
        for (const p of g.part) { c.globalAlpha = Math.min(1, p.t * 2); c.fillText(p.txt, p.x, p.y); }
        c.globalAlpha = 1;
      },
    };
  },

  /* ---------- Burbujas ---------- */
  burbujas(api) {
    const COLS = 7, FILAS = 9;
    const COL = ['#ff8fb3', '#6fc3f0', '#ffd166', '#82d48b', '#b99af0'];
    const g = { celdas: [], tiempo: 60, pts: 0, part: [], sacude: 0, txt: [] };
    const nuevaBurbuja = (c, y) => ({ col: Math.floor(Math.random() * COL.length), y, estrella: false });
    const geo = () => {
      const W = api.W, H = api.H, alto = H - api.top - 40;
      const t = Math.floor(Math.min((W - 20) / COLS, alto / FILAS));
      return { t, ox: (W - t * COLS) / 2, oy: api.top + 14 + (alto - t * FILAS) / 2 };
    };
    for (let c = 0; c < COLS; c++) { g.celdas[c] = []; for (let f = 0; f < FILAS; f++) g.celdas[c][f] = nuevaBurbuja(c, f - FILAS - 2); }
    const grupo = (c0, f0) => {
      const col = g.celdas[c0][f0].col, vis = new Set([c0 + ',' + f0]), pila = [[c0, f0]], out = [];
      while (pila.length) {
        const [c, f] = pila.pop(); out.push([c, f]);
        for (const [dc, df] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nc = c + dc, nf = f + df, k = nc + ',' + nf;
          if (nc < 0 || nf < 0 || nc >= COLS || nf >= FILAS || vis.has(k)) continue;
          const b = g.celdas[nc][nf];
          if (b && !b.estrella && b.col === col) { vis.add(k); pila.push([nc, nf]); }
        }
      }
      return out;
    };
    const caer = () => {
      for (let c = 0; c < COLS; c++) {
        const quedan = g.celdas[c].filter(Boolean);
        const faltan = FILAS - quedan.length;
        const nuevas = [];
        for (let i = 0; i < faltan; i++) nuevas.push(nuevaBurbuja(c, -1 - i));
        g.celdas[c] = [...nuevas.reverse(), ...quedan];
      }
    };
    const reventar = (lista, base) => {
      const { t, ox, oy } = geo();
      for (const [c, f] of lista) {
        const b = g.celdas[c][f]; if (!b) continue;
        for (let k = 0; k < 4; k++) g.part.push({ x: ox + (c + 0.5) * t, y: oy + (f + 0.5) * t, vx: entre(-120, 120), vy: entre(-160, 40), t: 0.6, col: b.estrella ? '#ffd166' : COL[b.col] });
        g.celdas[c][f] = null;
      }
      api.sonido('pop');
    };
    api.extra('⏱️ 60');
    return {
      down(x, y) {
        const { t, ox, oy } = geo();
        const c = Math.floor((x - ox) / t), f = Math.floor((y - oy) / t);
        if (c < 0 || f < 0 || c >= COLS || f >= FILAS) return;
        const b = g.celdas[c][f]; if (!b) return;
        if (b.estrella) {
          const lista = [];
          for (let i = 0; i < COLS; i++) lista.push([i, f]);
          for (let j = 0; j < FILAS; j++) if (j !== f) lista.push([c, j]);
          const n = lista.filter(([i, j]) => g.celdas[i][j]).length;
          reventar(lista); g.pts += n * 12; api.puntos(g.pts); api.sonido('moneda'); api.vibrar(30);
          g.txt.push({ x, y, t: 1, s: '⭐ +' + n * 12 });
          caer(); return;
        }
        const gr = grupo(c, f);
        if (gr.length < 2) { g.sacude = 0.25; api.sonido('error'); return; }
        const n = gr.length, gana = n * n * 2;
        reventar(gr);
        g.pts += gana; api.puntos(g.pts);
        if (n >= 6) g.tiempo += 2;
        g.txt.push({ x, y, t: 1, s: '+' + gana + (n >= 6 ? ' ⏱️+2' : '') });
        if (n >= 8) g.celdas[c][f] = { col: 0, y: f, estrella: true };
        caer();
        if (n >= 6) api.vibrar(20);
      },
      actualizar(dt) {
        g.tiempo -= dt;
        api.extra('⏱️ ' + Math.max(0, Math.ceil(g.tiempo)));
        if (g.tiempo <= 0) { api.fin(); return; }
        for (let c = 0; c < COLS; c++) for (let f = 0; f < FILAS; f++) {
          const b = g.celdas[c][f]; if (b) b.y += (f - b.y) * Math.min(1, dt * 11);
        }
        for (const p of g.part) { p.t -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 500 * dt; }
        g.part = g.part.filter(p => p.t > 0);
        for (const x of g.txt) { x.t -= dt; x.y -= 50 * dt; }
        g.txt = g.txt.filter(x => x.t > 0);
        g.sacude = Math.max(0, g.sacude - dt);
      },
      dibujar(c) {
        const W = api.W, H = api.H, { t, ox, oy } = geo();
        const fondo = c.createLinearGradient(0, 0, 0, H);
        fondo.addColorStop(0, '#efe6ff'); fondo.addColorStop(1, '#ffe7f1');
        c.fillStyle = fondo; c.fillRect(0, 0, W, H);
        const sx = g.sacude > 0 ? Math.sin(g.sacude * 80) * 4 : 0;
        c.save(); c.translate(sx, 0);
        c.fillStyle = 'rgba(255,255,255,.55)'; redondeado(c, ox - 8, oy - 8, t * COLS + 16, t * FILAS + 16, 18); c.fill();
        c.save(); c.beginPath(); c.rect(ox - 8, oy - 8, t * COLS + 16, t * FILAS + 16); c.clip();
        for (let cc = 0; cc < COLS; cc++) for (let f = 0; f < FILAS; f++) {
          const b = g.celdas[cc][f]; if (!b) continue;
          const x = ox + (cc + 0.5) * t, y = oy + (b.y + 0.5) * t, r = t * 0.44;
          if (b.estrella) { Mini.dibujarEmoji(c, '⭐', x, y, r * 2); continue; }
          const gr = c.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
          gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.25, COL[b.col]); gr.addColorStop(1, COL[b.col]);
          c.fillStyle = gr; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
          c.fillStyle = 'rgba(60,40,60,.55)';
          c.beginPath(); c.arc(x - r * 0.28, y + r * 0.05, r * 0.09, 0, Math.PI * 2); c.arc(x + r * 0.28, y + r * 0.05, r * 0.09, 0, Math.PI * 2); c.fill();
        }
        c.restore();
        for (const p of g.part) { c.globalAlpha = Math.max(0, p.t / 0.6); c.fillStyle = p.col; c.beginPath(); c.arc(p.x, p.y, 5, 0, Math.PI * 2); c.fill(); }
        c.globalAlpha = 1;
        c.font = '700 22px Fredoka, sans-serif'; c.textAlign = 'center'; c.fillStyle = '#7a4fc0';
        for (const x of g.txt) { c.globalAlpha = Math.min(1, x.t * 2); c.fillText(x.s, x.x, x.y); }
        c.globalAlpha = 1;
        c.restore();
      },
    };
  },

  /* ---------- Memoria ---------- */
  memoria(api) {
    const CARAS = ['🍓', '🐟', '🧁', '🍕', '🌸', '🎀', '🧶', '🍣', '⭐', '🌙', '🍦', '🎈', '🐾', '💛'];
    const PAREJAS = [6, 8, 10, 12];
    const g = { nivel: 0, cartas: [], abiertas: [], bloq: 0, tiempo: 75, pts: 0, racha: 0, pausa: 0, txt: [] };
    const repartir = () => {
      const n = PAREJAS[Math.min(g.nivel, PAREJAS.length - 1)];
      const caras = barajar([...CARAS]).slice(0, n);
      g.cartas = barajar([...caras, ...caras]).map(ch => ({ ch, abierta: false, hecha: false, giro: 0 }));
      g.abiertas = [];
    };
    const geo = () => {
      const n = g.cartas.length, cols = n <= 12 ? 3 : 4, filas = Math.ceil(n / cols);
      const W = api.W, H = api.H, alto = H - api.top - 30;
      const t = Math.min((W - 24) / cols, alto / filas * 0.78);
      const w = t - 10, h = w * 1.28;
      const totH = filas * (h + 10);
      return { cols, w, h, ox: (W - cols * t) / 2 + 5, oy: api.top + 10 + Math.max(0, (alto - totH) / 2), paso: t };
    };
    repartir();
    const hud = () => api.extra('⏱️ ' + Math.max(0, Math.ceil(g.tiempo)) + ' · Nivel ' + (g.nivel + 1));
    hud();
    return {
      down(x, y) {
        if (g.bloq > 0 || g.pausa > 0) return;
        const { cols, w, h, ox, oy, paso } = geo();
        const i = g.cartas.findIndex((cd, k) => {
          const cx = ox + (k % cols) * paso, cy = oy + Math.floor(k / cols) * (h + 10);
          return x >= cx && x <= cx + w && y >= cy && y <= cy + h;
        });
        if (i < 0) return;
        const cd = g.cartas[i];
        if (cd.hecha || cd.abierta) return;
        cd.abierta = true; g.abiertas.push(i); api.sonido('tap');
        if (g.abiertas.length === 2) {
          const [a, b] = g.abiertas.map(k => g.cartas[k]);
          if (a.ch === b.ch) {
            a.hecha = b.hecha = true; g.abiertas = [];
            const gana = 10 + g.racha * 5; g.racha++;
            g.pts += gana; api.puntos(g.pts); api.sonido('bien');
            if (g.cartas.every(cd2 => cd2.hecha)) { g.pts += 25; api.puntos(g.pts); g.tiempo += 12; g.pausa = 0.9; api.sonido('moneda'); g.txt.push({ t: 1.2, s: '¡Nivel listo! +25 · ⏱️+12' }); }
          } else { g.racha = 0; g.bloq = 0.75; api.sonido('error'); }
        }
      },
      actualizar(dt) {
        g.tiempo -= dt; hud();
        if (g.tiempo <= 0) { api.fin(); return; }
        if (g.bloq > 0) { g.bloq -= dt; if (g.bloq <= 0) { for (const k of g.abiertas) g.cartas[k].abierta = false; g.abiertas = []; } }
        if (g.pausa > 0) { g.pausa -= dt; if (g.pausa <= 0) { g.nivel++; repartir(); } }
        for (const cd of g.cartas) { const obj = cd.abierta || cd.hecha ? 1 : 0; cd.giro += (obj - cd.giro) * Math.min(1, dt * 16); }
        for (const x of g.txt) x.t -= dt;
        g.txt = g.txt.filter(x => x.t > 0);
      },
      dibujar(c) {
        const W = api.W, H = api.H;
        const f = c.createLinearGradient(0, 0, 0, H); f.addColorStop(0, '#fff3e2'); f.addColorStop(1, '#ffe1ec');
        c.fillStyle = f; c.fillRect(0, 0, W, H);
        const { cols, w, h, ox, oy, paso } = geo();
        g.cartas.forEach((cd, k) => {
          const cx = ox + (k % cols) * paso + w / 2, cy = oy + Math.floor(k / cols) * (h + 10) + h / 2;
          const esc_ = Math.abs(Math.cos(cd.giro * Math.PI));
          const frente = cd.giro > 0.5;
          c.save(); c.translate(cx, cy); c.scale(Math.max(0.04, esc_), 1);
          c.shadowColor = 'rgba(74,59,51,.18)'; c.shadowBlur = 8; c.shadowOffsetY = 3;
          c.fillStyle = frente ? (cd.hecha ? '#effaf1' : '#fff') : '#ec7fa9';
          redondeado(c, -w / 2, -h / 2, w, h, 12); c.fill();
          c.shadowColor = 'transparent';
          if (frente) Mini.dibujarEmoji(c, cd.ch, 0, 0, w * 0.55);
          else { c.globalAlpha = 0.5; Mini.dibujarEmoji(c, '🐾', 0, 0, w * 0.42); c.globalAlpha = 1; }
          c.restore();
        });
        for (const x of g.txt) {
          c.globalAlpha = Math.min(1, x.t * 2); c.font = '700 24px Fredoka, sans-serif'; c.textAlign = 'center'; c.fillStyle = '#c46a1c';
          c.fillText(x.s, W / 2, H * 0.5); c.globalAlpha = 1;
        }
      },
    };
  },

  /* ---------- Hasta las nubes ---------- */
  nubes(api) {
    const W0 = api.W, H0 = api.H;
    const g = { x: W0 / 2, y: H0 - 150, vx: 0, vy: -820, cam: 0, plats: [], mon: [], inicio: H0 - 150, minY: H0 - 150, dir: 0, kIzq: false, kDer: false, extraPts: 0, mira: 1 };
    let ultimaY = H0 - 40;
    const agregar = y => {
      const alt = Math.max(0, g.inicio - y);
      const dif = Math.min(1, alt / 9000);
      const r = Math.random();
      const tipo = alt < 400 ? 'normal' : r < 0.06 + dif * 0.04 ? 'resorte' : r < 0.18 + dif * 0.14 ? 'movil' : r < 0.28 + dif * 0.16 ? 'fragil' : 'normal';
      const w = Math.max(64, 92 - dif * 24);
      const p = { x: entre(10, api.W - w - 10), y, w, h: 18, tipo, vx: tipo === 'movil' ? (Math.random() < 0.5 ? -1 : 1) * entre(60, 110 + dif * 60) : 0, roto: false, caida: 0 };
      g.plats.push(p);
      if (tipo !== 'fragil' && Math.random() < 0.18) g.mon.push({ x: p.x + p.w / 2, y: y - 34, ok: false });
    };
    g.plats.push({ x: api.W / 2 - 60, y: H0 - 40, w: 120, h: 18, tipo: 'normal', vx: 0 });
    while (ultimaY > -H0) { const alt = Math.max(0, g.inicio - ultimaY); ultimaY -= entre(62, Math.min(150, 86 + alt / 120)); agregar(ultimaY); }
    const pts = () => Math.round(Math.max(0, g.inicio - g.minY) / 10) + g.extraPts;
    return {
      down(x) { g.dir = x < api.W / 2 ? -1 : 1; }, move(x) { g.dir = x < api.W / 2 ? -1 : 1; }, up() { g.dir = 0; },
      tecla(k, ab) { if (k === 'ArrowLeft') g.kIzq = ab; if (k === 'ArrowRight') g.kDer = ab; },
      actualizar(dt) {
        const W = api.W, H = api.H;
        const dir = g.dir || (g.kIzq ? -1 : g.kDer ? 1 : 0);
        g.vx += (dir * 400 - g.vx) * Math.min(1, dt * (dir ? 9 : 5));
        if (dir) g.mira = dir;
        const yAntes = g.y;
        g.vy += 1750 * dt; g.x += g.vx * dt; g.y += g.vy * dt;
        if (g.x < -25) g.x += W + 50; if (g.x > W + 25) g.x -= W + 50;
        for (const p of g.plats) {
          if (p.tipo === 'movil') { p.x += p.vx * dt; if (p.x < 6 || p.x + p.w > W - 6) p.vx *= -1; }
          if (p.roto) { p.caida += 900 * dt; p.y += p.caida * dt; continue; }
          const pies = 30;
          if (g.vy > 0 && yAntes + pies <= p.y && g.y + pies >= p.y && g.x > p.x - 14 && g.x < p.x + p.w + 14) {
            if (p.tipo === 'fragil') { p.roto = true; api.sonido('error'); continue; }
            g.y = p.y - pies;
            g.vy = p.tipo === 'resorte' ? -1500 : -880;
            api.sonido(p.tipo === 'resorte' ? 'resorte' : 'salto');
          }
        }
        for (const m of g.mon) if (!m.ok && Math.hypot(m.x - g.x, m.y - g.y) < 36) { m.ok = true; g.extraPts += 25; api.sonido('moneda'); }
        g.minY = Math.min(g.minY, g.y);
        const objetivo = g.y - H * 0.42;
        if (objetivo < g.cam) g.cam = objetivo;
        while (ultimaY > g.cam - 200) { const alt = Math.max(0, g.inicio - ultimaY); ultimaY -= entre(62, Math.min(150, 86 + alt / 120)); agregar(ultimaY); }
        g.plats = g.plats.filter(p => p.y < g.cam + H + 120);
        g.mon = g.mon.filter(m => m.y < g.cam + H + 60 && !m.ok);
        api.puntos(pts());
        if (g.y > g.cam + H + 80) { api.sonido('mal'); api.fin(); }
      },
      dibujar(c) {
        const W = api.W, H = api.H;
        const alt = Math.max(0, g.inicio - g.y);
        const k = Math.min(1, alt / 12000);
        const cielo = c.createLinearGradient(0, 0, 0, H);
        const mezcla = (a, b) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
        const arriba = mezcla([150, 210, 255], [40, 44, 92]), abajo = mezcla([220, 240, 255], [120, 90, 160]);
        cielo.addColorStop(0, `rgb(${arriba})`); cielo.addColorStop(1, `rgb(${abajo})`);
        c.fillStyle = cielo; c.fillRect(0, 0, W, H);
        if (k > 0.35) { c.fillStyle = `rgba(255,255,255,${(k - 0.35) * 1.2})`; for (let i = 0; i < 40; i++) { const sx = (i * 97) % W, sy = ((i * 53 - g.cam * 0.05) % H + H) % H; c.fillRect(sx, sy, 2, 2); } }
        c.save(); c.translate(0, -g.cam);
        for (const p of g.plats) {
          const col = p.tipo === 'movil' ? '#d8efff' : p.tipo === 'fragil' ? '#cfcfd6' : '#ffffff';
          c.save(); if (p.roto) c.globalAlpha = 0.5;
          nube(c, p.x - 6, p.y - 8, p.w + 12, p.h + 14, col);
          if (p.tipo === 'fragil') { c.strokeStyle = '#9a9aa6'; c.lineWidth = 2; c.beginPath(); c.moveTo(p.x + p.w * 0.4, p.y - 2); c.lineTo(p.x + p.w * 0.5, p.y + 8); c.lineTo(p.x + p.w * 0.45, p.y + 14); c.stroke(); }
          if (p.tipo === 'resorte') { c.strokeStyle = '#ec7fa9'; c.lineWidth = 4; c.beginPath(); const cx = p.x + p.w / 2; for (let i = 0; i < 4; i++) { c.moveTo(cx - 10, p.y - 4 - i * 5); c.lineTo(cx + 10, p.y - 6 - i * 5); } c.stroke(); }
          c.restore();
        }
        for (const m of g.mon) Mini.dibujarEmoji(c, '🪙', m.x, m.y, 28);
        const mw = 74, mh = mw * 210 / 200;
        if (api.michi) { c.save(); c.translate(g.x, g.y + 30 - mh * 0.5); c.scale(g.mira, 1); c.drawImage(api.michi, -mw / 2, -mh / 2, mw, mh); c.restore(); }
        c.restore();
      },
    };
  },

  /* ---------- Toca el color ---------- */
  color(api) {
    const C = [{ n: 'ROJO', c: '#ef4444' }, { n: 'AZUL', c: '#3b82f6' }, { n: 'VERDE', c: '#22c55e' }, { n: 'AMARILLO', c: '#eab308' }, { n: 'ROSADO', c: '#ec4899' }, { n: 'MORADO', c: '#8b5cf6' }];
    const g = { palabra: 0, tinta: 1, ops: [], limite: 2.6, resto: 2.6, vidas: 3, racha: 0, pts: 0, flash: 0, flashCol: '', inicio: 0.6 };
    const nueva = () => {
      g.palabra = Math.floor(Math.random() * C.length);
      do { g.tinta = Math.floor(Math.random() * C.length); } while (g.tinta === g.palabra && Math.random() < 0.8);
      const otros = barajar(C.map((_, i) => i).filter(i => i !== g.palabra && i !== g.tinta)).slice(0, g.tinta === g.palabra ? 3 : 2);
      g.ops = barajar([g.palabra, ...(g.tinta === g.palabra ? [] : [g.tinta]), ...otros]);
      g.resto = g.limite;
    };
    const vidas = () => api.extra('❤️'.repeat(g.vidas) + '🤍'.repeat(3 - g.vidas));
    const error = () => {
      g.vidas--; g.racha = 0; g.flash = 0.35; g.flashCol = 'rgba(239,68,68,.25)'; api.sonido('mal'); api.vibrar(50); vidas();
      if (g.vidas <= 0) { api.fin(); return true; }
      nueva(); return false;
    };
    const botones = () => {
      const W = api.W, H = api.H, m = 14, bw = (W - m * 3) / 2, bh = Math.min(120, (H * 0.36 - m * 3) / 2);
      const y0 = H - bh * 2 - m * 2 - 24;
      return g.ops.map((op, i) => ({ op, x: m + (i % 2) * (bw + m), y: y0 + Math.floor(i / 2) * (bh + m), w: bw, h: bh }));
    };
    nueva(); vidas();
    return {
      down(x, y) {
        if (g.inicio > 0) return;
        const b = botones().find(z => x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h);
        if (!b) return;
        if (b.op === g.palabra) {
          g.racha++; const gana = 1 + Math.floor(g.racha / 5);
          g.pts += gana; api.puntos(g.pts); api.sonido('bien');
          g.flash = 0.2; g.flashCol = 'rgba(34,197,94,.2)';
          g.limite = Math.max(0.9, g.limite - 0.05); nueva();
        } else error();
      },
      actualizar(dt) {
        if (g.inicio > 0) { g.inicio -= dt; return; }
        g.resto -= dt; g.flash = Math.max(0, g.flash - dt);
        if (g.resto <= 0) error();
      },
      dibujar(c) {
        const W = api.W, H = api.H;
        c.fillStyle = '#fffaf2'; c.fillRect(0, 0, W, H);
        if (g.flash > 0) { c.fillStyle = g.flashCol; c.fillRect(0, 0, W, H); }
        const cy = api.top + (H * 0.5 - api.top) * 0.45;
        c.textAlign = 'center'; c.textBaseline = 'middle';
        c.font = '600 18px Fredoka, sans-serif'; c.fillStyle = '#8a7a6e';
        c.fillText('Toca el color que DICE la palabra', W / 2, cy - 70);
        c.font = `700 ${Math.min(76, W * 0.17)}px Fredoka, sans-serif`;
        c.fillStyle = C[g.tinta].c; c.fillText(C[g.palabra].n, W / 2, cy);
        const bw = W * 0.7;
        c.fillStyle = '#f0e3d2'; redondeado(c, (W - bw) / 2, cy + 56, bw, 12, 6); c.fill();
        c.fillStyle = g.resto / g.limite < 0.3 ? '#ef4444' : '#f0b43c';
        redondeado(c, (W - bw) / 2, cy + 56, Math.max(12, bw * (g.resto / g.limite)), 12, 6); c.fill();
        c.font = '700 16px Fredoka, sans-serif'; c.fillStyle = '#8a7a6e';
        if (g.racha >= 5) c.fillText('Racha ' + g.racha + ' · ×' + (1 + Math.floor(g.racha / 5)), W / 2, cy + 96);
        for (const b of botones()) {
          c.shadowColor = 'rgba(0,0,0,.18)'; c.shadowBlur = 10; c.shadowOffsetY = 4;
          c.fillStyle = C[b.op].c; redondeado(c, b.x, b.y, b.w, b.h, 22); c.fill();
          c.shadowColor = 'transparent';
          c.fillStyle = 'rgba(255,255,255,.25)'; redondeado(c, b.x + 8, b.y + 8, b.w - 16, b.h * 0.32, 14); c.fill();
        }
        if (g.inicio > 0) { c.fillStyle = 'rgba(255,250,242,.7)'; c.fillRect(0, 0, W, H); c.fillStyle = '#4a3b33'; c.font = '700 40px Fredoka, sans-serif'; c.fillText('¡Atenta!', W / 2, H / 2); }
      },
    };
  },

  /* ---------- Caída libre ---------- */
  caida(api) {
    const g = { x: api.W / 2, tx: api.W / 2, vel: 230, dist: 0, filas: [], aves: [], mon: [], vidas: 3, inv: 0, sig: 260, monedas: 0, izq: false, der: false, t: 0 };
    const yM = () => api.top + (api.H - api.top) * 0.2;
    const vidas = () => api.extra('❤️'.repeat(g.vidas) + '🤍'.repeat(3 - g.vidas));
    vidas();
    const nuevaFila = () => {
      const W = api.W, hueco = Math.max(120, 200 - g.dist * 0.012), gx = entre(16, W - hueco - 16);
      g.filas.push({ y: api.H + 30, gx, hueco });
      if (Math.random() < 0.55) g.mon.push({ x: gx + hueco / 2, y: api.H + 30, ok: false });
      if (g.dist > 1500 && Math.random() < 0.3) g.aves.push({ x: Math.random() < 0.5 ? -30 : W + 30, y: api.H + 160, vx: 0 });
    };
    return {
      down(x) { g.tx = x; }, move(x) { g.tx = x; },
      tecla(k, ab) { if (k === 'ArrowLeft') g.izq = ab; if (k === 'ArrowRight') g.der = ab; },
      actualizar(dt) {
        const W = api.W, H = api.H, y = yM();
        g.t += dt;
        if (g.izq) g.tx -= 480 * dt; if (g.der) g.tx += 480 * dt;
        g.tx = clamp(g.tx, 26, W - 26);
        g.x += (g.tx - g.x) * Math.min(1, dt * 12);
        g.vel = Math.min(620, 230 + g.dist * 0.018);
        const d = g.vel * dt;
        g.dist += d; g.sig -= d;
        if (g.sig <= 0) { nuevaFila(); g.sig = Math.max(190, 280 - g.dist * 0.01); }
        for (const f of g.filas) f.y -= d;
        for (const m of g.mon) m.y -= d;
        for (const a of g.aves) { a.y -= d; if (!a.vx) a.vx = (a.x < 0 ? 1 : -1) * entre(90, 160); a.x += a.vx * dt; }
        g.filas = g.filas.filter(f => f.y > -40); g.mon = g.mon.filter(m => m.y > -40 && !m.ok); g.aves = g.aves.filter(a => a.y > -40 && a.x > -60 && a.x < W + 60);
        g.inv = Math.max(0, g.inv - dt);
        const R = 22;
        for (const m of g.mon) if (!m.ok && Math.hypot(m.x - g.x, m.y - y) < R + 16) { m.ok = true; g.monedas++; api.sonido('moneda'); }
        if (g.inv <= 0) {
          let choca = false;
          for (const f of g.filas) {
            if (Math.abs(f.y - y) < R + 11) { if (g.x - R < f.gx || g.x + R > f.gx + f.hueco) choca = true; }
          }
          for (const a of g.aves) if (Math.hypot(a.x - g.x, a.y - y) < R + 16) choca = true;
          if (choca) {
            g.vidas--; g.inv = 1.4; api.sonido('mal'); api.vibrar(60); vidas();
            if (g.vidas <= 0) { api.fin(); return; }
          }
        }
        api.puntos(Math.floor(g.dist / 40) + g.monedas * 5);
      },
      dibujar(c) {
        const W = api.W, H = api.H, y = yM();
        const f = c.createLinearGradient(0, 0, 0, H); f.addColorStop(0, '#9fdcff'); f.addColorStop(1, '#e8f7ff');
        c.fillStyle = f; c.fillRect(0, 0, W, H);
        const desp = (g.dist * 0.3) % (H + 200);
        nube(c, W * 0.1, H - desp, 120, 50, 'rgba(255,255,255,.7)');
        nube(c, W * 0.6, (H * 1.5 - desp) % (H + 200) - 100, 140, 56, 'rgba(255,255,255,.6)');
        for (const r of g.filas) {
          c.fillStyle = '#9c6b3f';
          redondeado(c, -10, r.y - 10, r.gx + 10, 20, 10); c.fill();
          redondeado(c, r.gx + r.hueco, r.y - 10, W - r.gx - r.hueco + 10, 20, 10); c.fill();
          c.fillStyle = '#7cc46a';
          for (let x = 10; x < r.gx - 10; x += 34) { c.beginPath(); c.ellipse(x, r.y - 12, 12, 7, -0.4, 0, Math.PI * 2); c.fill(); }
          for (let x = r.gx + r.hueco + 14; x < W; x += 34) { c.beginPath(); c.ellipse(x, r.y - 12, 12, 7, 0.4, 0, Math.PI * 2); c.fill(); }
        }
        for (const m of g.mon) Mini.dibujarEmoji(c, '🪙', m.x, m.y, 30);
        for (const a of g.aves) { c.save(); c.translate(a.x, a.y); if (a.vx > 0) c.scale(-1, 1); Mini.dibujarEmoji(c, '🐦', 0, 0, 34); c.restore(); }
        const parpadea = g.inv > 0 && Math.floor(g.inv * 10) % 2 === 0;
        if (!parpadea) {
          c.fillStyle = '#ec7fa9';
          c.beginPath(); c.ellipse(g.x, y - 62, 46, 26, 0, Math.PI, 0); c.fill();
          c.fillStyle = '#ffd1e1'; c.beginPath(); c.ellipse(g.x, y - 62, 46, 8, 0, Math.PI, 0); c.fill();
          c.strokeStyle = '#a07a5a'; c.lineWidth = 1.5;
          c.beginPath(); c.moveTo(g.x - 44, y - 62); c.lineTo(g.x - 14, y - 22); c.moveTo(g.x + 44, y - 62); c.lineTo(g.x + 14, y - 22); c.stroke();
          const mw = 62, mh = mw * 210 / 200;
          if (api.michi) c.drawImage(api.michi, g.x - mw / 2, y - mh / 2, mw, mh);
        }
      },
    };
  },

  /* ---------- Penales ---------- */
  penales(api) {
    const g = { tiros: 0, goles: 0, pts: 0, estado: 'listo', bola: null, arq: { x: 0.5, t: 0, vel: 1.2 }, msg: '', msgT: 0, rastro: [], ini: null };
    const geo = () => {
      const W = api.W, H = api.H;
      const ax = W * 0.1, aw = W * 0.8, ay = api.top + 30, ah = Math.min(H * 0.2, aw * 0.42);
      return { ax, aw, ay, ah, by: H - 130 };
    };
    const reset = () => { const { by } = geo(); g.bola = { x: api.W / 2, y: by, vx: 0, vy: 0, curva: 0, r: 26, z: 1 }; g.estado = 'listo'; g.rastro = []; };
    reset();
    const hud = () => api.extra('⚽ ' + Math.min(10, g.tiros + (g.estado === 'listo' ? 1 : 0)) + '/10 · ' + g.goles + ' goles');
    hud();
    return {
      down(x, y) { if (g.estado === 'listo') g.ini = { x, y, t: performance.now() }; },
      move(x, y) { if (g.ini) g.rastro.push({ x, y }); if (g.rastro.length > 14) g.rastro.shift(); },
      up(x, y) {
        if (!g.ini || g.estado !== 'listo') { g.ini = null; return; }
        const dx = x - g.ini.x, dy = y - g.ini.y, dt = Math.max(60, performance.now() - g.ini.t) / 1000;
        g.ini = null;
        if (dy > -40) { g.rastro = []; return; }
        const vy = clamp(dy / dt, -2600, -700);
        g.bola.vy = vy; g.bola.vx = clamp(dx / dt * 0.9, -1100, 1100); g.bola.curva = clamp(dx / dt * 0.15, -260, 260);
        g.estado = 'vuela'; g.tiros++; api.sonido('patada'); hud();
      },
      actualizar(dt) {
        const { ax, aw, ay, ah, by } = geo();
        g.arq.t += dt * g.arq.vel;
        g.arq.x = 0.5 + Math.sin(g.arq.t) * 0.38;
        const b = g.bola;
        if (g.estado === 'vuela') {
          b.x += b.vx * dt; b.y += b.vy * dt; b.vx += b.curva * dt * 2;
          b.z = clamp(0.45 + 0.55 * (b.y - ay) / (by - ay), 0.45, 1);
          if (b.y <= ay + ah * 0.55) {
            const arqX = ax + aw * g.arq.x, arqW = aw * 0.22;
            let res;
            if (b.x < ax + 8 || b.x > ax + aw - 8) res = 'afuera';
            else if (Math.abs(b.x - arqX) < arqW / 2 + b.r * 0.4) res = 'atajada';
            else res = 'gol';
            if (res === 'gol') {
              const esquina = b.x < ax + aw * 0.18 || b.x > ax + aw * 0.82;
              const gana = esquina ? 20 : 10;
              g.goles++; g.pts += gana; api.puntos(g.pts); api.sonido('gol'); api.vibrar(30);
              g.msg = esquina ? '¡GOLAZO! +20' : '¡GOL! +10';
              g.arq.vel = Math.min(3.2, g.arq.vel + 0.2);
            } else if (res === 'atajada') { g.msg = '¡Atajó!'; api.sonido('atajada'); }
            else { g.msg = 'Afuera…'; api.sonido('error'); }
            g.estado = 'resultado'; g.msgT = 1.1; hud();
          }
          if (b.y < -60 || b.x < -80 || b.x > api.W + 80) { g.estado = 'resultado'; g.msg = 'Afuera…'; g.msgT = 1; }
        } else if (g.estado === 'resultado') {
          g.msgT -= dt;
          if (g.msgT <= 0) { if (g.tiros >= 10) { api.fin(); return; } reset(); hud(); }
        }
      },
      dibujar(c) {
        const W = api.W, H = api.H, { ax, aw, ay, ah, by } = geo();
        for (let i = 0; i < 10; i++) { c.fillStyle = i % 2 ? '#7fcf6e' : '#8ad879'; c.fillRect(0, (H / 10) * i, W, H / 10 + 1); }
        c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 4;
        c.strokeRect(ax - 30, ay + ah, aw + 60, (by - ay - ah) * 0.55);
        c.beginPath(); c.arc(W / 2, by + 10, 4, 0, Math.PI * 2); c.stroke();
        c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(ax, ay, aw, ah);
        c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1;
        for (let x = ax; x <= ax + aw; x += 14) { c.beginPath(); c.moveTo(x, ay); c.lineTo(x, ay + ah); c.stroke(); }
        for (let y = ay; y <= ay + ah; y += 14) { c.beginPath(); c.moveTo(ax, y); c.lineTo(ax + aw, y); c.stroke(); }
        c.strokeStyle = '#fff'; c.lineWidth = 7; c.beginPath(); c.moveTo(ax, ay + ah); c.lineTo(ax, ay); c.lineTo(ax + aw, ay); c.lineTo(ax + aw, ay + ah); c.stroke();
        c.globalAlpha = 0.5;
        Mini.dibujarEmoji(c, '🎯', ax + aw * 0.09, ay + ah * 0.35, 28); Mini.dibujarEmoji(c, '🎯', ax + aw * 0.91, ay + ah * 0.35, 28);
        c.globalAlpha = 1;
        const arqX = ax + aw * g.arq.x;
        Mini.dibujarEmoji(c, '🐶', arqX, ay + ah * 0.62, Math.min(64, aw * 0.2));
        Mini.dibujarEmoji(c, '🧤', arqX - aw * 0.09, ay + ah * 0.5, 26); Mini.dibujarEmoji(c, '🧤', arqX + aw * 0.09, ay + ah * 0.5, 26);
        if (g.rastro.length > 1) { c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 6; c.lineCap = 'round'; c.beginPath(); g.rastro.forEach((p, i) => i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)); c.stroke(); }
        const b = g.bola;
        c.fillStyle = 'rgba(0,0,0,.18)'; c.beginPath(); c.ellipse(b.x, b.y + b.r * b.z, b.r * b.z, b.r * b.z * 0.35, 0, 0, Math.PI * 2); c.fill();
        Mini.dibujarEmoji(c, '⚽', b.x, b.y, b.r * 2 * b.z, b.y * 0.02);
        if (api.michi && g.estado === 'listo') c.drawImage(api.michi, W / 2 - 110, by - 30, 70, 74);
        if (g.estado === 'resultado') {
          c.font = '700 40px Fredoka, sans-serif'; c.textAlign = 'center'; c.fillStyle = '#fff';
          c.strokeStyle = 'rgba(74,59,51,.4)'; c.lineWidth = 6; c.strokeText(g.msg, W / 2, H * 0.52); c.fillText(g.msg, W / 2, H * 0.52);
        }
        if (g.estado === 'listo' && g.tiros === 0) { c.font = '600 18px Fredoka, sans-serif'; c.textAlign = 'center'; c.fillStyle = '#fff'; c.fillText('Desliza hacia arriba para patear ⬆️', W / 2, by + 70); }
      },
    };
  },

  /* ---------- Michi dice ---------- */
  dice(api) {
    const PADS = [{ c: '#ff8fb3', f: 330 }, { c: '#6fc3f0', f: 392 }, { c: '#ffd166', f: 494 }, { c: '#82d48b', f: 587 }];
    const g = { seq: [], i: 0, estado: 'espera', t: 0.8, luz: -1, luzT: 0, pts: 0, paso: 0.5, idx: 0, error: 0 };
    const pads = () => {
      const W = api.W, H = api.H, m = 16, lado = Math.min((W - m * 3) / 2, (H - api.top - 220) / 2);
      const ox = (W - lado * 2 - m) / 2, oy = H - lado * 2 - m - 40;
      return PADS.map((p, i) => ({ i, x: ox + (i % 2) * (lado + m), y: oy + Math.floor(i / 2) * (lado + m), w: lado, h: lado }));
    };
    const agregar = () => { g.seq.push(Math.floor(Math.random() * 4)); g.idx = 0; g.estado = 'muestra'; g.t = 0.6; g.paso = Math.max(0.24, 0.5 - g.seq.length * 0.02); api.extra('Ronda ' + g.seq.length); };
    const encender = (i, d) => { g.luz = i; g.luzT = d; api.nota(PADS[i].f, d); };
    agregar();
    return {
      down(x, y) {
        if (g.estado !== 'turno') return;
        const p = pads().find(z => x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h);
        if (!p) return;
        if (p.i === g.seq[g.i]) {
          encender(p.i, 0.25); g.i++;
          if (g.i >= g.seq.length) { g.pts = g.seq.length * 10; api.puntos(g.pts); g.estado = 'espera'; g.t = 0.9; api.vibrar(15); }
        } else {
          g.luz = p.i; g.luzT = 0.5; g.error = 0.8; api.sonido('mal'); api.vibrar(80); g.estado = 'fin'; g.t = 0.9;
        }
      },
      actualizar(dt) {
        g.luzT -= dt; if (g.luzT <= 0) g.luz = -1;
        g.error = Math.max(0, g.error - dt);
        g.t -= dt;
        if (g.estado === 'muestra' && g.t <= 0) {
          if (g.idx < g.seq.length) { encender(g.seq[g.idx], g.paso * 0.8); g.idx++; g.t = g.paso; }
          else { g.estado = 'turno'; g.i = 0; }
        } else if (g.estado === 'espera' && g.t <= 0) agregar();
        else if (g.estado === 'fin' && g.t <= 0) api.fin();
      },
      dibujar(c) {
        const W = api.W, H = api.H;
        const f = c.createLinearGradient(0, 0, 0, H); f.addColorStop(0, '#2d2a4a'); f.addColorStop(1, '#4b3f7a');
        c.fillStyle = f; c.fillRect(0, 0, W, H);
        if (g.error > 0) { c.fillStyle = `rgba(239,68,68,${g.error * 0.3})`; c.fillRect(0, 0, W, H); }
        const ps = pads();
        const mw = Math.min(130, W * 0.3), mh = mw * 210 / 200;
        if (api.michi) c.drawImage(api.michi, W / 2 - mw / 2, ps[0].y - mh - 30, mw, mh);
        c.font = '600 18px Fredoka, sans-serif'; c.textAlign = 'center'; c.fillStyle = '#fff';
        c.fillText(g.estado === 'muestra' ? 'Escucha…' : g.estado === 'turno' ? '¡Tu turno!' : g.estado === 'fin' ? 'Ups…' : '¡Bien!', W / 2, ps[0].y - 12);
        for (const p of ps) {
          const on = g.luz === p.i;
          c.shadowColor = on ? PADS[p.i].c : 'transparent'; c.shadowBlur = on ? 30 : 0;
          c.globalAlpha = on ? 1 : 0.55;
          c.fillStyle = PADS[p.i].c; redondeado(c, p.x, p.y, p.w, p.h, 28); c.fill();
          c.shadowColor = 'transparent'; c.globalAlpha = on ? 0.9 : 0.45;
          Mini.dibujarEmoji(c, '🐾', p.x + p.w / 2, p.y + p.h / 2, p.w * 0.38);
          c.globalAlpha = 1;
        }
      },
    };
  },
};
