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

async function prepararTablas(sql) {
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
      motivo TEXT NOT NULL DEFAULT 'manual',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
}

async function limpiarBackupsAntiguos(sql) {
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
    await prepararTablas(sql);

    if (req.method === "GET") {
      const filas = await sql`
        SELECT
          id::text,
          motivo,
          created_at,
          jsonb_array_length(COALESCE(data->'fotos', '[]'::jsonb)) AS fotos,
          jsonb_array_length(COALESCE(data->'notas', '[]'::jsonb)) AS notas,
          jsonb_array_length(COALESCE(data->'timeline', '[]'::jsonb)) AS momentos
        FROM rincon_backups
        WHERE estado_id = ${ESTADO_ID}
        ORDER BY created_at DESC
        LIMIT 12
      `;

      return json(res, 200, {
        backups: filas.map((fila) => ({
          id: fila.id,
          motivo: fila.motivo,
          createdAt: fila.created_at,
          fotos: Number(fila.fotos || 0),
          notas: Number(fila.notas || 0),
          momentos: Number(fila.momentos || 0),
        })),
      });
    }

    if (req.method === "POST") {
      const body = await leerBody(req);
      const accion = body?.accion || "crear";

      if (accion === "crear") {
        const actual = await sql`
          SELECT data
          FROM rincon_estado
          WHERE id = ${ESTADO_ID}
          LIMIT 1
        `;
        const data = actual[0]?.data || {};
        const motivo = String(body?.motivo || "manual").slice(0, 80);
        const filas = await sql`
          INSERT INTO rincon_backups (estado_id, data, motivo)
          VALUES (${ESTADO_ID}, ${JSON.stringify(data)}::jsonb, ${motivo})
          RETURNING id::text, created_at
        `;
        await limpiarBackupsAntiguos(sql);
        return json(res, 200, { ok: true, id: filas[0].id, createdAt: filas[0].created_at });
      }

      if (accion === "restaurar") {
        const id = String(body?.id || "");
        const backup = await sql`
          SELECT data
          FROM rincon_backups
          WHERE estado_id = ${ESTADO_ID}
            AND id::text = ${id}
          LIMIT 1
        `;

        if (!backup.length) {
          return json(res, 404, { error: "No existe ese respaldo." });
        }

        const actual = await sql`
          SELECT data
          FROM rincon_estado
          WHERE id = ${ESTADO_ID}
          LIMIT 1
        `;

        await sql`
          INSERT INTO rincon_backups (estado_id, data, motivo)
          VALUES (${ESTADO_ID}, ${JSON.stringify(actual[0]?.data || {})}::jsonb, 'antes de restaurar')
        `;

        await sql`
          UPDATE rincon_estado
          SET data = ${JSON.stringify(backup[0].data)}::jsonb,
              updated_at = now()
          WHERE id = ${ESTADO_ID}
        `;

        await limpiarBackupsAntiguos(sql);
        return json(res, 200, { ok: true, data: backup[0].data });
      }

      return json(res, 400, { error: "Accion no reconocida." });
    }

    res.setHeader("Allow", "GET, POST");
    return json(res, 405, { error: "Metodo no permitido." });
  } catch (error) {
    console.error("[api/backups]", error);
    return json(res, 500, { error: "No se pudo acceder al historial de respaldos." });
  }
};
