const { neon } = require("@neondatabase/serverless");

const ESTADO_ID = "catalina-diego";

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

async function prepararTabla(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS rincon_estado (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`
    INSERT INTO rincon_estado (id, data)
    VALUES (${ESTADO_ID}, '{}'::jsonb)
    ON CONFLICT (id) DO NOTHING
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS rincon_backups (
      id BIGSERIAL PRIMARY KEY,
      estado_id TEXT NOT NULL,
      data JSONB NOT NULL,
      motivo TEXT NOT NULL DEFAULT 'automatico',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
}

async function crearBackupSiCorresponde(sql, dataActual) {
  if (!dataActual || Object.keys(dataActual).length === 0) return;

  const recientes = await sql`
    SELECT id
    FROM rincon_backups
    WHERE estado_id = ${ESTADO_ID}
      AND motivo = 'automatico'
      AND created_at > now() - interval '30 minutes'
    LIMIT 1
  `;

  if (recientes.length) return;

  await sql`
    INSERT INTO rincon_backups (estado_id, data, motivo)
    VALUES (${ESTADO_ID}, ${JSON.stringify(dataActual)}::jsonb, 'automatico')
  `;

  await sql`
    DELETE FROM rincon_backups
    WHERE id IN (
      SELECT id
      FROM rincon_backups
      WHERE estado_id = ${ESTADO_ID}
      ORDER BY created_at DESC
      OFFSET 30
    )
  `;
}

module.exports = async function handler(req, res) {
  if (!process.env.DATABASE_URL) {
    return json(res, 500, { error: "Falta configurar DATABASE_URL en Vercel." });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    await prepararTabla(sql);

    if (req.method === "GET") {
      const filas = await sql`
        SELECT data, updated_at
        FROM rincon_estado
        WHERE id = ${ESTADO_ID}
        LIMIT 1
      `;

      return json(res, 200, {
        data: filas[0]?.data || {},
        updatedAt: filas[0]?.updated_at || null,
      });
    }

    if (req.method === "POST") {
      const body = await leerBody(req);
      const data = body && typeof body.data === "object" ? body.data : null;

      if (!data || Array.isArray(data)) {
        return json(res, 400, { error: "El cuerpo debe ser { data: objeto }." });
      }

      const actuales = await sql`
        SELECT data
        FROM rincon_estado
        WHERE id = ${ESTADO_ID}
        LIMIT 1
      `;
      const dataActual = actuales[0]?.data || {};
      if (JSON.stringify(dataActual) !== JSON.stringify(data)) {
        await crearBackupSiCorresponde(sql, dataActual);
      }

      const filas = await sql`
        UPDATE rincon_estado
        SET data = ${JSON.stringify(data)}::jsonb,
            updated_at = now()
        WHERE id = ${ESTADO_ID}
        RETURNING updated_at
      `;

      return json(res, 200, { ok: true, updatedAt: filas[0]?.updated_at || null });
    }

    res.setHeader("Allow", "GET, POST");
    return json(res, 405, { error: "Metodo no permitido." });
  } catch (error) {
    console.error("[api/estado]", error);
    return json(res, 500, { error: "No se pudo acceder al estado compartido." });
  }
};
