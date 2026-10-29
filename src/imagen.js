const fs = require('fs');
const path = require('path');

// paso 1: carpetas de entrada (descripciones) y salida (imagenes)
const carpetaDescripciones = path.join(__dirname, '..', 'descripciones');
const carpetaImagenes = path.join(__dirname, '..', 'imagenes');

// paso 2: convertir el código de estado HTTP en un mensaje en español
function mensajeSegunEstado(estado) {
  if (estado === 401 || estado === 403) {
    return 'El token de la API de imagen no es válido o no tiene permiso. Revisa IMAGEN_API_KEY en tu archivo .env.';
  }
  if (estado === 402 || estado === 429) {
    return 'Llegaste al límite de uso de la API de imagen. Espera un rato o revisa tu cuenta.';
  }
  if (estado === 404 || estado === 410) {
    return 'La URL de imagen es incorrecta o el servicio ya no existe. Revisa IMAGEN_URL en tu .env.';
  }
  return `La API de imagen respondió con el código ${estado}.`;
}

// paso 3: generar la imagen y guardarla; devuelve la ruta del .jpg
async function generarImagen(id) {
  // paso 3.1: rutas del .txt de entrada y del .jpg de salida
  const rutaTxt = path.join(carpetaDescripciones, `mundo_${id}.txt`);
  const rutaImagen = path.join(carpetaImagenes, `mundo_${id}.jpg`);

  // paso 3.2: si la imagen ya existe, no se llama a la API
  if (fs.existsSync(rutaImagen)) {
    console.log(`Paso 3: la imagen ya existe (${rutaImagen}). No llamo a la API de imagen.`);
    return rutaImagen;
  }

  // paso 3.3: leer la descripción desde el archivo .txt
  if (!fs.existsSync(rutaTxt)) {
    throw new Error(`No encontré la descripción: ${rutaTxt}`);
  }
  const descripcion = fs.readFileSync(rutaTxt, 'utf-8').trim();
  if (descripcion === '') {
    throw new Error('El archivo de descripción está vacío.');
  }

  // paso 3.4: leer las variables del .env (sin imprimir sus valores)
  const clave = process.env.IMAGEN_API_KEY;
  const url = process.env.IMAGEN_URL;
  if (!clave || !url) {
    throw new Error('Faltan variables en .env: IMAGEN_API_KEY y IMAGEN_URL.');
  }

  // paso 3.5: enviar la petición con timeout de 60000 ms
  let respuesta;
  try {
    respuesta = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${clave}`
      },
      body: JSON.stringify({ prompt: descripcion }),
      signal: AbortSignal.timeout(60000)
    });
  } catch (error) {
    if (error.name === 'TimeoutError') {
      throw new Error('Se agotó el tiempo (60 segundos) esperando la API de imagen. Intenta de nuevo.');
    }
    if (error.name === 'TypeError') {
      throw new Error('No hay conexión con la API de imagen. Revisa tu internet y IMAGEN_URL.');
    }
    throw error;
  }

  // paso 3.6: revisar que la respuesta sea ok
  if (!respuesta.ok) {
    throw new Error(mensajeSegunEstado(respuesta.status));
  }

  // paso 3.7: leer el JSON y comprobar que Cloudflare dice success: true
  const datos = await respuesta.json();
  if (datos.success !== true) {
    throw new Error('La API de imagen no terminó bien (success no es true). Intenta de nuevo.');
  }

  // paso 3.8: buscar la imagen en result.image
  if (!datos.result || !datos.result.image) {
    throw new Error('La API de imagen no devolvió datos de imagen (result.image vacío).');
  }

  // paso 3.9: convertir el base64 en bytes y guardar el .jpg (sin 'utf-8')
  const bytes = Buffer.from(datos.result.image, 'base64');
  fs.mkdirSync(carpetaImagenes, { recursive: true });
  fs.writeFileSync(rutaImagen, bytes);
  return rutaImagen;
}

// paso 4: exportar la función para usarla en index.js
module.exports = { generarImagen };