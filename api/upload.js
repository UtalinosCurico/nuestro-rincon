let put = null;

try {
  ({ put } = require("@vercel/blob"));
} catch {
  put = null;
}

function json(res, status, body) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.status(status).send(JSON.stringify(body));
}

async function leerBody(req) {
  if (req.body) {
    return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  }

  const partes = [];
  for await (const parte of req) {
    partes.push(parte);
  }
  const texto = Buffer.concat(partes).toString("utf8");
  return texto ? JSON.parse(texto) : {};
}

function extensionDesdeMime(mime) {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return json(res, 405, { error: "Metodo no permitido." });
  }

  if (!put || !process.env.BLOB_READ_WRITE_TOKEN) {
    return json(res, 501, { error: "Vercel Blob no esta configurado." });
  }

  try {
    const body = await leerBody(req);
    const dataUrl = String(body?.dataUrl || "");
    const carpeta = String(body?.carpeta || "fotos").replace(/[^a-z0-9-_]/gi, "").slice(0, 30) || "fotos";
    const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);

    if (!match) {
      return json(res, 400, { error: "Se esperaba una imagen en dataURL." });
    }

    const mime = match[1];
    const buffer = Buffer.from(match[2], "base64");
    if (buffer.length > 4 * 1024 * 1024) {
      return json(res, 413, { error: "La imagen comprimida supera 4 MB." });
    }

    const nombre = `rincon/${carpeta}/${Date.now()}.${extensionDesdeMime(mime)}`;
    const blob = await put(nombre, buffer, {
      access: "public",
      contentType: mime,
      addRandomSuffix: true,
    });

    return json(res, 200, { url: blob.url, pathname: blob.pathname });
  } catch (error) {
    console.error("[api/upload]", error);
    return json(res, 500, { error: "No se pudo subir la imagen." });
  }
};
