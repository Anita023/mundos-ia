# mundos-ia

Programa de consola en Node.js que recibe una situación, un mundo y 5 colores,
y genera con inteligencia artificial la descripción de una imagen y la imagen.

## Requisitos

- Node.js 20.12 o superior (se usa `process.loadEnvFile`). Comprueba con `node --version`.
- Una cuenta en https://build.nvidia.com con una clave API (`nvapi-...`) para el texto.
- Una cuenta en https://dash.cloudflare.com con un token de Workers AI y tu ID de cuenta,
  para la imagen.

## Instalación

```bash
git clone https://github.com/Anita023/mundos-ia.git
cd mundos-ia
npm install
```

## Configuración

1. Copia la plantilla: `cp .env.example .env` (en Windows: `copy .env.example .env`).
2. Abre `.env` y rellena tus valores:

```
TEXTO_API_KEY=nvapi-tu_clave
TEXTO_URL=https://integrate.api.nvidia.com/v1/chat/completions
TEXTO_MODELO=nvidia/nemotron-3.5-bolt-e4b
IMAGEN_API_KEY=tu_token_de_cloudflare
IMAGEN_URL=https://api.cloudflare.com/client/v4/accounts/TU_ID_DE_CUENTA/ai/run/@cf/black-forest-labs/flux-1-schnell
```

- `TEXTO_API_KEY`: clave de NVIDIA (se crea en build.nvidia.com, sección Claves API).
- `IMAGEN_API_KEY`: token de Cloudflare (Workers AI, botón "REST API", "Create a Workers AI API Token").
- `TU_ID_DE_CUENTA`: el Account ID de Cloudflare, en la misma pantalla. Va dentro de la URL.

El archivo `.env` está en `.gitignore`. Nunca subas tus claves a git.

## Uso

```bash
npm start -- "<situación>" "<mundo>" <color1> <color2> <color3> <color4> <color5>
```

Ejemplo:

```bash
npm start -- "una tormenta" "ciudad flotante" rojo azul verde negro dorado
```

Reglas de los argumentos:

- Deben ser exactamente 7 y ninguno puede estar vacío.
- Los 5 colores deben ser distintos, sin distinguir mayúsculas
  (`Rojo` y `rojo` cuentan como repetidos).
- La situación y el mundo van entre comillas si tienen espacios.

## Qué hace

1. **Paso 1:** valida los argumentos y guarda `data/mundo_<id>.json`.
   El `<id>` son los primeros 8 caracteres del hash (object-hash) de
   `{ situacion, mundo, colores }`, así que los mismos datos dan siempre el mismo id.
2. **Paso 2:** relee ese JSON y pide a NVIDIA una descripción en inglés
   (un párrafo de 80 a 120 palabras). La guarda en `descripciones/mundo_<id>.txt`.
3. **Paso 3:** lee ese `.txt`, lo envía a Cloudflare Workers AI (FLUX.1-schnell)
   y guarda `imagenes/mundo_<id>.jpg`.

Si el `.txt` o la imagen ya existen, el programa lo avisa y no llama a la API.
Si un paso falla, los archivos de los pasos anteriores se conservan.

## Estructura

```
mundos-ia/
├── src/
│   ├── index.js     flujo principal (main con try/catch)
│   ├── mundo.js     crearMundo, guardarMundo, leerMundo
│   ├── texto.js     describirMundo
│   └── imagen.js    generarImagen
├── data/            JSON de cada mundo (se crea solo)
├── descripciones/   descripciones .txt (se crea solo)
├── imagenes/        imágenes .jpg (se crea solo)
├── .env.example     plantilla de variables de entorno
└── package.json
```

Las carpetas `data/`, `descripciones/` e `imagenes/` no se suben a git.

## Errores frecuentes

| Mensaje | Qué hacer |
|---|---|
| `No encontré el archivo .env` | Copia `.env.example` como `.env` y rellénalo. |
| `Faltan variables en .env` | Revisa que las 5 variables estén escritas y guardadas. |
| Clave o token inválido (401/403) | Revisa `TEXTO_API_KEY` o `IMAGEN_API_KEY`, o genera otro. |
| Límite de uso (402/429) | Espera un rato o revisa tu cuenta. |
| Modelo o URL incorrectos (404/410) | Revisa `TEXTO_MODELO`, `TEXTO_URL` e `IMAGEN_URL` (el ID de cuenta). |
| No hay conexión | Revisa tu internet. |
| Se agotó el tiempo | Intenta de nuevo más tarde. |

## Notas

- El catálogo de NVIDIA cambia: un modelo de texto que aparece en la lista puede
  responder 404. Si pasa, prueba otro modelo y cámbialo en `TEXTO_MODELO`.
- La imagen se genera con Cloudflare Workers AI. Se probó antes con NVIDIA
  FLUX.1-schnell, pero ese servicio devolvió errores 500 en el servidor de NVIDIA.
- El programa solo envía la descripción a la API de imagen, así que el resultado
  puede variar entre ejecuciones.

## Preguntas de reflexión

### 1. ¿Por qué el `id` se calcula sin la fecha? ¿Qué pasaría si la incluyeras?

El `id` sale del hash del contenido (`situacion`, `mundo` y `colores`). Si los datos son
los mismos, el id es el mismo, y eso permite reconocer que ese mundo ya se generó.
Si incluyera `creadoEn`, cada ejecución daría un id distinto aunque los datos fueran
iguales. Entonces el programa nunca encontraría el `.txt` ni el `.jpg` existentes,
llamaría a las APIs cada vez, gastaría cuota y dejaría archivos duplicados.

### 2. ¿Por qué se le pide al modelo de texto la descripción en inglés?

Los modelos de imagen como FLUX se entrenaron sobre todo con descripciones en inglés,
así que suelen entender mejor ese idioma. Por eso el prompt le pide al modelo de texto
que traduzca los colores y escriba todo en inglés.

**Comparación con español:** no llegué a probar una descripción en español, así que no
tengo una comparación propia de las imágenes. Lo esperable es que el resultado sea menos
fiel (por ejemplo, que ignore o cambie algún color o detalle de la escena), pero eso
habría que comprobarlo generando el mismo mundo con el prompt en español.

### 3. ¿Qué diferencia hay entre una respuesta JSON de texto y una con los bytes de una imagen? ¿Qué es base64?

Una respuesta de texto es JSON legible: la descripción llega en `choices[0].message.content`.
Una imagen son bytes binarios, que no se pueden meter directamente en un JSON.
**Base64** es una forma de escribir esos bytes usando solo letras, números y algunos
símbolos, para poder enviarlos como texto. La API de imagen devuelve el base64 en
`result.image`, y `Buffer.from(..., 'base64')` lo convierte de nuevo en los bytes originales.

### 4. ¿Qué pasaría si guardas la imagen con `'utf-8'`? ¿Por qué?

El archivo quedaría corrupto y no se abriría. La opción `'utf-8'` trata el contenido como
texto y altera o reemplaza los bytes que no son texto válido, y una imagen está hecha
de bytes binarios. Sin `'utf-8'`, `writeFileSync` escribe los bytes exactamente como
llegaron.

### 5. ¿Qué pasos consumen cuota gratuita y cómo evitaste repetirlos?

- **Paso 1** (validar y guardar el JSON): es local y no consume cuota.
- **Paso 2** (descripción con NVIDIA): consume cuota de texto.
- **Paso 3** (imagen con Cloudflare Workers AI): consume cuota de imagen.

Para no repetirlos, antes de llamar a cada API el programa revisa con `fs.existsSync`
si el `.txt` o el `.jpg` de ese `id` ya existen. Si existen, lo avisa y no llama a la API.
Como el `id` depende solo del contenido, los mismos datos siempre apuntan a los mismos
archivos. Además, los archivos se guardan solo cuando todo salió bien, así que un
paso fallido no deja archivos a medias.

### 6. Si usaste IA: ¿qué fue lo más difícil de pedirle y qué parte tuviste que corregir tú?

Usé IA como guía paso a paso: el enunciado que le di está al final de este README.

- **Lo más difícil de pedirle:** no fue difícil pedirle las cosas, porque la IA entendía
  lo que yo quería y sabía explicarlo bien.
- **Lo que tuve que corregir yo:** parte del código, sobre todo las exportaciones
  (`require` y `module.exports`) y la organización de la estructura. Algunas cosas
  estaban demasiado complejas y las quise más sencillas.

Cambios que hice durante el trabajo y que ya están en las notas: el modelo de texto de
NVIDIA respondía 404 y tuve que probar otro, y la imagen con NVIDIA FLUX.1-schnell
devolvía errores 500, así que pasé a Cloudflare Workers AI.

## Enunciado del proyecto

Este programa se construyó siguiendo el enunciado de abajo, escrito como un prompt
para una guía paso a paso. Está tal cual se escribió, con el espacio para la ficha
del servicio que se completó durante el trabajo.

```text
Quiero construir un programa de consola que se va llamar mundos-ia y quiero que me guies para hacerlo yo mismo
CONTEXTO: solo conozco process.argv, template literals, JavaScript básico,
JSON.stringify/parse, módulos con require (CommonJS), fs (writeFileSync,
readFileSync, existsSync, mkdirSync), path, npm (init, install, scripts),
el paquete object-hash, .env con process.loadEnvFile, async/await con
try/catch, fetch nativo, AbortSignal.timeout y Buffer.from.
OBJETIVO:
npm start -- "<situación>" "<mundo>" <color1> <color2> <color3> <color4> <color5>
1. Validar los argumentos (exactamente 7, ninguno vacío, 5 colores distintos
   sin distinguir mayúsculas) con mensajes en español y process.exitCode = 1.
   Guardar un JSON en data/mundo_<id>.json con: id, situacion, mundo, colores
   (arreglo de 5) y creadoEn (ISO). El id son los primeros 8 caracteres del
   hash de object-hash sobre { situacion, mundo, colores } (sin creadoEn).
2. Releer ese JSON del archivo y enviarlo con fetch a una API de texto para
   que genere la descripción de una imagen: un solo párrafo en inglés, 80 a
   120 palabras, con escena, iluminación, composición y estilo, mencionando
   los 5 colores, sin markdown ni texto dentro de la imagen. Si viene vacía,
   lanzar Error; si pasa de 1500 caracteres, recortar con slice y avisar.
   Guardar en descripciones/mundo_<id>.txt.
3. Leer ese .txt, enviarlo con fetch a una API de imágenes y guardar la
   imagen en imagenes/mundo_<id>.jpg (con writeFileSync, sin 'utf-8').

RESTRICCIONES:
- Prohibido: dotenv, axios, node-fetch, SDKs, readline, commander, yargs,
  frameworks, TypeScript. Solo object-hash como paquete externo.
- Código simple con comentarios en español numerados ("paso 1", "paso 2"...).
- Claves en .env (TEXTO_API_KEY, TEXTO_URL, TEXTO_MODELO, IMAGEN_API_KEY,
  IMAGEN_URL); nunca en el código ni impresas en consola o errores.
- Rutas con path.join(__dirname, '..', 'data'); crear carpetas con
  mkdirSync({ recursive: true }).
- Si el .txt o la imagen ya existen, no llamar a las APIs e informarlo.
  Si un paso falla, conservar los archivos anteriores.
- Timeouts: 30000 ms texto y 60000 ms imagen; revisar respuesta.ok.
  Con NVIDIA, verificar finishReason === "SUCCESS".
- Mensajes "Paso N: ..." en español y errores explicados en español:
  401/403 clave inválida, 402/429 límite de uso, 404/410 modelo o URL
  incorrectos, TypeError sin conexión, TimeoutError tiempo agotado.
- Archivos: src/index.js (async main con try/catch), src/mundo.js
  (crearMundo, guardarMundo, leerMundo), src/texto.js (describirMundo),
  src/imagen.js (generarImagen), .env.example, .gitignore (node_modules/,
  .env, data/, descripciones/, imagenes/), package.json (con script start)
  y README.md.

SERVICIOS: texto con <Groq o NVIDIA>, imagen con <NVIDIA FLUX.1-schnell o
Cloudflare>. (Pega aquí la ficha del servicio de la guía del taller.)

FORMA DE RESPONDER: guíame un archivo a la vez, espera a que yo diga
"siguiente", explica cada bloque en 2 líneas y no uses nada fuera del
CONTEXTO. Después de cada archivo dime cómo probarlo y qué commit hacer.
Empieza por la Parte 1: comandos de git/npm, package.json, .gitignore y
.env.example.
```

### Servicios que se usaron al final

- **Texto:** NVIDIA, con el modelo `nvidia/nemotron-3.5-bolt-e4b`.
- **Imagen:** Cloudflare Workers AI (FLUX.1-schnell). Se probó primero con NVIDIA
  FLUX.1-schnell, pero ese servicio devolvió errores 500 en el servidor de NVIDIA.