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
  manifest.webmanifest        Manifest PWA para instalar como app
  sw.js                       Service worker basico para app instalable/offline shell
  api/
    estado.js                 API Vercel serverless para Neon
    backups.js                Historial de respaldos en Neon
    upload.js                 Subida opcional de imagenes a Vercel Blob
  package.json                Dependencia del driver Neon
  package-lock.json
  .gitignore
  CONTEXTO-PARA-CLAUDE.md
```

## Cambios visuales aplicados desde Claude Design

Se uso `D:\Usuario\Downloads\Nuestro Rincon - Mejorado v2.html` como maqueta visual, no como reemplazo de la app. Se copiaron mejoras de apariencia en `index.html` y se sincronizo `catalina-y-diego.html`:

- luces suaves en el hero, brillo del boton de entrada y anillo animado del `&`;
- mejor espaciado de secciones, titulos, bajadas y contador;
- tarjetas, botones, inputs, fotos, canciones, notas, estados y pregunta del dia mas pulidos;
- ajuste mobile para que la pastilla de cancion respire mejor junto a los botones flotantes.

No se cambio la logica de Neon, Blob, PWA, respaldos, pregunta diaria, musica, APIs ni estructura del objeto `datos`.

## Pregunta del dia con respuestas

La pregunta del dia ahora vive en una seccion propia, separada del buzon de amor. El objeto `datos.preguntaDia` mantiene:

- `fecha`, `texto` y `usadas` para la pregunta diaria aleatoria sin repetirse.
- `respuestas`, un objeto por fecha con las respuestas de `Catalina` y `Diego`.

La pagina primero pinta sin guardar para no pisar Neon durante la carga inicial, y luego fija la pregunta si corresponde. Mantener esta precaucion si se toca `pintarPreguntaDia`.

## Musica recomendada

Para musica de fondo real, lo mas estable sigue siendo usar un archivo de audio propio en `assets/audio` y controlar el elemento `<audio>`. Spotify se debe tratar como reproductor embebido/playlist dentro de la pagina. Si se quiere reproduccion completa controlada desde la app con Spotify, se necesita OAuth + Spotify Web Playback SDK y una cuenta Spotify Premium; no es tan simple como pegar un link.

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
- momentosEspeciales
- regalosCatalina
- regalosDiego
- series
- lugares
- estados
- preguntaDia
- notas

## Estado funcional actualizado

Ademas de la pagina base, ya estan implementadas estas mejoras:

- Popups propios en vez de `prompt`, `confirm` y `alert`.
- Indicador de sincronizacion con mensajes como "Sincronizando...", "Guardado hace X" y "Cambios recibidos".
- Auto-sincronizacion con Neon cada 60 segundos y al volver a la pestana.
- Lightbox para ver fotos en grande.
- Botones de respaldo JSON local.
- Historial de respaldos en Neon con tabla `rincon_backups`.
- Botones en el footer para crear y restaurar respaldos de nube.
- Seccion "Momentos especiales" con fechas editables y proximo mes juntos automatico.
- Tema musical de fondo: `assets/audio/te-quiero-tanto-kevin-kaarl.mp3`.
- Estado visible de musica: "Sonando: Te Quiero Tanto - Kevin Kaarl".
- El boton de musica recuerda la preferencia e intenta retomar al entrar.
- Subida opcional de fotos a Vercel Blob mediante `/api/upload`.
- PWA instalable: manifest, iconos, service worker y metatags mobile.
- Pregunta del dia aleatoria compartida, con banco grande y sin repetir hasta agotar preguntas.

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

La pregunta diaria usa:

```js
datos.preguntaDia = {
  fecha: 'AAAA-MM-DD',
  texto: 'pregunta actual',
  usadas: ['pregunta ya usada', 'otra pregunta ya usada']
}
```

Reglas:

- No usar `Date.now() % preguntas.length`; eso repite.
- `pintarPreguntaDia()` elige una pregunta aleatoria solo si cambio el dia.
- La pregunta nueva se toma desde `PREGUNTAS_DIA` excluyendo todo lo que ya este en `usadas`.
- Cuando se agote el banco, no debe repetir: muestra aviso para agregar mas preguntas.
- El historial vive en Neon, asi Catalina y Diego ven la misma pregunta diaria.

Tabla de respaldos creada automaticamente:

```sql
CREATE TABLE IF NOT EXISTS rincon_backups (
  id BIGSERIAL PRIMARY KEY,
  estado_id TEXT NOT NULL,
  data JSONB NOT NULL,
  motivo TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

La API `POST /api/estado` crea un respaldo automatico antes de sobrescribir datos cuando no existe uno automatico reciente. La API `GET /api/backups` lista respaldos y `POST /api/backups` permite crear/restaurar.

## Vercel Blob opcional para fotos

El endpoint `/api/upload` usa `@vercel/blob` si existe esta variable en Vercel:

```text
BLOB_READ_WRITE_TOKEN
```

Si esa variable no existe, no se rompe nada: el frontend vuelve al metodo anterior y guarda la imagen comprimida como dataURL dentro del JSON de Neon.

Para activar Blob:

1. En Vercel, ir al proyecto.
2. Storage / Blob.
3. Crear o conectar un Blob Store al proyecto.
4. Confirmar que Vercel agrego `BLOB_READ_WRITE_TOKEN`.
5. Redeploy.

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

Para ver los ultimos commits reales:

```powershell
git log --oneline -5
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

Probar instalacion como app:

1. Abrir `https://nuestro-rincon-neon.vercel.app` desde Chrome/Edge Android o navegador de escritorio.
2. Buscar "Instalar app" / "Agregar a pantalla principal".
3. Confirmar que aparece como "Nuestro Rincon".
4. Abrir desde el icono instalado.

Notas:

- En iPhone se instala desde Safari -> Compartir -> Agregar a pantalla de inicio.
- El service worker cachea la carcasa de la app, manifest e iconos. No cachea APIs ni audio para evitar datos viejos o cache grande.

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

- Agregar versionado simple o historial en tabla aparte para recuperar estados anteriores.
- Agregar autenticacion simple para proteger `/api/estado`, `/api/backups` y `/api/upload`.
- Mejorar resolucion de conflictos cuando ambos editan exactamente al mismo tiempo.
- Mostrar un panel de uso de almacenamiento: peso estimado del JSON, fotos en Blob, cantidad de backups.

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
