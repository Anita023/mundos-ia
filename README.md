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

-