#!/usr/bin/env node
/* Servidor local para probar la página SIN tocar Neon.
   Sirve los archivos estáticos y simula /api/estado, /api/backups y
   /api/upload en memoria, con la misma mezcla por clave de primer nivel
   que el API real ({ ...dataActual, ...data }).

   Uso:
     node scripts/servidor-local.js                 # estado vacío
     node scripts/servidor-local.js copia.json      # arranca con un estado guardado
     PORT=5178 node scripts/servidor-local.js

   El archivo de arranque puede ser la respuesta de GET /api/estado
   ({ data, updatedAt }) o directamente el objeto `data`. Nunca se escribe
   de vuelta: al cerrar el servidor, todo lo cambiado se pierde. */
const http = require('http');
const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..');
const PUERTO = Number(process.env.PORT) || 5178;

let estado = {};
let actualizado = new Date().toISOString();
const respaldos = [];

const semilla = process.argv[2];
if (semilla) {
  try {
    const bruto = JSON.parse(fs.readFileSync(path.resolve(semilla), 'utf8'));
    estado = bruto && bruto.data && typeof bruto.data === 'object' ? bruto.data : bruto;
    console.log('Estado inicial cargado desde', semilla, '·', Object.keys(estado).length, 'claves');
  } catch (e) {
    console.error('No se pudo leer el estado inicial:', e.message);
  }
}

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.woff2': 'font/woff2',
};

function json(res, status, cuerpo) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(cuerpo));
}

function leerCuerpo(req) {
  return new Promise((ok, mal) => {
    const partes = [];
    req.on('data', (p) => partes.push(p));
    req.on('end', () => {
      const texto = Buffer.concat(partes).toString('utf8');
      try { ok(texto ? JSON.parse(texto) : {}); } catch (e) { mal(e); }
    });
    req.on('error', mal);
  });
}

function listaDeClaves(texto) {
  if (!texto) return [];
  return String(texto).split(',').map((x) => x.trim()).filter((x) => /^[A-Za-z0-9_]{1,40}$/.test(x)).slice(0, 20);
}

async function api(req, res, ruta, consulta) {
  if (ruta === '/api/estado') {
    if (req.method === 'GET') {
      if (consulta.get('solo') === 'fecha') return json(res, 200, { updatedAt: actualizado });
      let data = estado;
      const claves = listaDeClaves(consulta.get('claves'));
      const sin = listaDeClaves(consulta.get('sin'));
      if (claves.length) {
        data = {};
        for (const k of claves) if (k in estado) data[k] = estado[k];
      } else if (sin.length) {
        data = { ...estado };
        for (const k of sin) delete data[k];
      }
      return json(res, 200, { data, updatedAt: actualizado });
    }
    if (req.method === 'POST') {
      let cuerpo;
      try { cuerpo = await leerCuerpo(req); } catch (e) { return json(res, 400, { error: 'JSON inválido' }); }
      const data = cuerpo && typeof cuerpo.data === 'object' && !Array.isArray(cuerpo.data) ? cuerpo.data : null;
      if (!data) return json(res, 400, { error: 'El cuerpo debe ser { data: objeto }.' });
      const bytes = Buffer.byteLength(JSON.stringify(cuerpo));
      console.log('POST /api/estado', Object.keys(data).join(','), '·', bytes, 'bytes');
      guardarRespaldo('automatico');
      estado = { ...estado, ...data };
      actualizado = new Date().toISOString();
      return json(res, 200, { ok: true, updatedAt: actualizado });
    }
    return json(res, 405, { error: 'Método no permitido.' });
  }
  if (ruta === '/api/backups') {
    if (req.method === 'GET') {
      const id = consulta.get('id');
      if (id) {
        const r = respaldos.find((x) => x.id === id);
        if (!r) return json(res, 404, { error: 'No existe ese respaldo.' });
        return json(res, 200, { id: r.id, motivo: r.motivo, createdAt: r.createdAt, data: r.data });
      }
      return json(res, 200, {
        backups: respaldos.map((r) => ({
          id: r.id, motivo: r.motivo, createdAt: r.createdAt,
          fotos: (r.data.fotos || []).length, notas: (r.data.notas || []).length, momentos: (r.data.timeline || []).length,
        })),
      });
    }
    if (req.method === 'POST') {
      const cuerpo = await leerCuerpo(req).catch(() => ({}));
      const accion = (cuerpo && cuerpo.accion) || 'crear';
      if (accion === 'crear') {
        const r = guardarRespaldo(String((cuerpo && cuerpo.motivo) || 'manual').slice(0, 80));
        return json(res, 200, { ok: true, id: r.id, createdAt: r.createdAt });
      }
      if (accion === 'restaurar') {
        const r = respaldos.find((x) => x.id === String(cuerpo.id || ''));
        if (!r) return json(res, 404, { error: 'No existe ese respaldo.' });
        guardarRespaldo('antes de restaurar');
        estado = JSON.parse(JSON.stringify(r.data));
        actualizado = new Date().toISOString();
        return json(res, 200, { ok: true, data: estado });
      }
      return json(res, 400, { error: 'Accion no reconocida.' });
    }
  }
  if (ruta === '/api/upload') {
    // Igual que en producción sin BLOB_READ_WRITE_TOKEN: el cliente vuelve a dataURL.
    return json(res, 501, { error: 'Subida de imágenes desactivada en local.' });
  }
  return json(res, 404, { error: 'No existe.' });
}

let siguienteId = 1;
function guardarRespaldo(motivo) {
  const r = { id: String(siguienteId++), motivo, createdAt: new Date().toISOString(), data: JSON.parse(JSON.stringify(estado)) };
  respaldos.unshift(r);
  respaldos.length = Math.min(respaldos.length, 20);
  return r;
}

function estatico(req, res, ruta) {
  let archivo = path.normalize(path.join(RAIZ, decodeURIComponent(ruta)));
  if (!archivo.startsWith(RAIZ)) { res.writeHead(403); return res.end('Prohibido'); }
  if (fs.existsSync(archivo) && fs.statSync(archivo).isDirectory()) archivo = path.join(archivo, 'index.html');
  if (!fs.existsSync(archivo)) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('No encontrado'); }
  const tipo = TIPOS[path.extname(archivo).toLowerCase()] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': tipo, 'Cache-Control': 'no-cache' });
  fs.createReadStream(archivo).pipe(res);
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const ruta = url.pathname;
  try {
    if (ruta.startsWith('/api/')) return await api(req, res, ruta, url.searchParams);
    return estatico(req, res, ruta);
  } catch (e) {
    console.error(e);
    if (!res.headersSent) json(res, 500, { error: 'Error del servidor local' });
  }
}).listen(PUERTO, () => {
  console.log('Nuestro Rincón en http://localhost:' + PUERTO + '  (API simulada, no toca Neon)');
});
