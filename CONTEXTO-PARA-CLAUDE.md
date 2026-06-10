# Contexto para continuar el proyecto "Catalina & Diego - Nuestro Rincon"

## Resumen rapido

Proyecto: pagina romantica de pareja para Catalina y Diego.

Repositorio GitHub:

```text
https://github.com/UtalinosCurico/nuestro-rincon
```

Proyecto Vercel:

```text
https://nuestro-rincon-neon.vercel.app
```

Endpoint de estado compartido:

```text
https://nuestro-rincon-neon.vercel.app/api/estado
```

Estado confirmado al crear este documento:

```text
GET /api/estado -> 200
{"data":{},"updatedAt":"2026-06-10T20:33:26.505Z"}
```

La pagina ya esta desplegada en Vercel y conectada a Neon por medio de una API serverless. El repositorio local queda en:

```text
D:\Usuario\Downloads\nuestro-rincon
```

## Objetivo funcional

La pagina debe ser un rincon privado/romantico compartido. Permite editar textos, fotos, razones, notas, canciones, cartas, metas, estados y otros recuerdos. La prioridad es que sea facil de usar, emocional, bonita en celular y que los cambios se sincronicen entre dispositivos.

No es una app bancaria ni SaaS grande. El PIN existente es simbolico, no seguridad real.

## Arquitectura actual

```text
nuestro-rincon/
  index.html                  Pagina principal que Vercel sirve en /
  catalina-y-diego.html        Copia equivalente para abrir por nombre historico
  api/
    estado.js                 API Vercel serverless para Neon
  package.json                Dependencia del driver Neon
  package-lock.json
  .gitignore
  CONTEXTO-PARA-CLAUDE.md
```

## Datos y sincronizacion

El HTML mantiene un objeto global `datos` con toda la informacion de la pagina:

- frase
- fondoHero
- videoYoutube
- oscuro
- pin
- fotos
- antesAhora
- timeline
- razones
- canciones
- recuerdos
- cartas
- suenos
- metas
- proximoPlan
- regalosCatalina
- regalosDiego
- series
- lugares
- estados
- notas

Antes guardaba solo en `localStorage`. Ahora funciona asi:

1. Al cargar, primero lee `localStorage` como respaldo rapido.
2. Luego intenta `GET /api/estado`.
3. Si Neon responde con datos, mezcla esos datos en `datos` y repinta toda la pagina.
4. Cada `guardar()` escribe en `localStorage`.
5. Cada `guardar()` programa un `POST /api/estado` con debounce de 700 ms.

Constantes relevantes en `index.html`:

```js
const CLAVE_GUARDADO = 'nuestroRinconCyD_v2';
const API_ESTADO = '/api/estado';
```

Funciones relevantes:

```js
guardar()
cargar()
programarGuardadoRemoto()
guardarRemoto()
cargarRemoto()
repintarTodo()
```

## Neon

La API usa la variable de entorno:

```text
DATABASE_URL
```

Importante: la connection string real NO debe escribirse en el repo ni en este documento.

La variable `DATABASE_URL` se configura en Vercel:

```text
Project -> Settings -> Environment Variables -> DATABASE_URL
```

Tabla creada automaticamente por `api/estado.js`:

```sql
CREATE TABLE IF NOT EXISTS rincon_estado (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

La fila principal usa:

```text
id = catalina-diego
```

El objeto completo de la pagina se guarda en:

```text
rincon_estado.data
```

## Seguridad importante

La connection string de Neon fue pegada durante la conversacion original. Se recomienda rotar la contrasena/credencial en Neon y luego actualizar `DATABASE_URL` en Vercel.

No poner secretos en:

- `index.html`
- `catalina-y-diego.html`
- `api/estado.js`
- `package.json`
- archivos `.md`
- commits de Git

## Flujo de despliegue

Cada cambio se respalda asi:

```powershell
cd "D:\Usuario\Downloads\nuestro-rincon"
git status
git add .
git commit -m "Descripcion del cambio"
git push
```

Vercel redeploya automaticamente desde la rama:

```text
main
```

Ultimos commits al crear este documento:

```text
3d5c56f Agregar sincronizacion con Neon
2bc591b Primera version Catalina y Diego
```

## Verificacion rapida

Probar que la API responde:

```powershell
Invoke-WebRequest -Uri "https://nuestro-rincon-neon.vercel.app/api/estado" -UseBasicParsing
```

Resultado esperado:

```text
StatusCode: 200
Content: {"data":...,"updatedAt":"..."}
```

Probar sincronizacion:

1. Abrir `https://nuestro-rincon-neon.vercel.app`.
2. Agregar una nota, razon o meta.
3. Esperar 1 segundo.
4. Abrir la pagina en otro navegador/celular.
5. Confirmar que aparece el cambio.

## Reglas para futuras ediciones

- Mantener `index.html` como entrada principal.
- Si se cambia `index.html`, copiar el mismo contenido a `catalina-y-diego.html` para mantener ambas rutas equivalentes.
- Mantener `localStorage` como respaldo, no quitarlo.
- Mantener `/api/estado` como unica capa que habla con Neon.
- No conectar Neon directo desde el navegador.
- No commitear `node_modules`.
- No subir `.env`, `.env.local` ni `.vercel`.

## Riesgos actuales

- Guardar muchas fotos en base64 dentro de JSONB puede crecer rapido. Sirve para pocas fotos comprimidas, pero para muchas conviene usar Vercel Blob, Cloudinary o S3 y guardar solo URLs en Neon.
- La sincronizacion actual usa "ultimo guardado gana". Si dos personas editan al mismo tiempo desde dispositivos distintos, un cambio podria pisar otro.
- El PIN es simbolico. No protege datos sensibles contra alguien tecnico.

## Mejoras sugeridas despues

- Agregar indicador visual: "Guardado en la nube" / "Sin conexion".
- Agregar backups manuales: boton para descargar/exportar `datos` como JSON.
- Agregar importador JSON para restaurar respaldo.
- Pasar fotos a storage externo y dejar Neon solo para metadatos.
- Agregar versionado simple o historial en tabla aparte para recuperar estados anteriores.

## Comandos utiles

Instalar dependencias:

```powershell
npm install
```

Validar la API:

```powershell
node -c api\estado.js
```

Validar que el script embebido del HTML parsea:

```powershell
node -e "const fs=require('fs'); const html=fs.readFileSync('index.html','utf8'); const script=html.match(/<script>([\s\S]*)<\/script>/)[1]; new Function(script); console.log('HTML script parse OK');"
```

Ver estado Git:

```powershell
git status --short --branch
```

## Instruccion directa para Claude

Trabaja en este repo como proyecto independiente. Antes de editar, revisa `git status`. Haz cambios pequenos y commiteables. No expongas secretos. Si modificas persistencia, conserva compatibilidad con `localStorage` y con el objeto global `datos`. Si cambias el HTML principal, sincroniza `index.html` y `catalina-y-diego.html`. Al finalizar, valida con `node -c api\estado.js`, parseo del HTML y `GET /api/estado`, luego commitea y empuja a `main` si el usuario lo pide.
