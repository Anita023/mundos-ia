// 'fs' sirve para leer y escribir archivos
const fs = require('fs');
// 'path' sirve para armar rutas de archivos
const path = require('path');

// Paso 1: carpetas de entrada (descripciones .txt) y salida (imágenes .jpg)
const carpetaDescripciones = path.join(__dirname, '..', 'descripciones');
const carpetaImagenes = path.join(__dirname, '..', 'imagenes');

// Paso 2: convertir el código de estado HTTP en un mensaje en español
function mensajeSegunEstado(estado) {
  // 401 = no autenticado, 403 = sin permiso: el token es malo
  if (estado === 401 || estado === 403) {
    return 'El token de la API de imagen no es válido o no tiene permiso. Revisa IMAGEN_API_KEY en tu archivo .env.';
  }
  // 402 = pago requerido, 429 = demasiadas peticiones: límite de uso
  if (estado === 402 || estado === 429) {
    return 'Llegaste al límite de uso de la API de imagen. Espera un rato o revisa tu cuenta.';
  }
  // 404 = no encontrado, 410 = ya no existe: URL incorrecta
  if (estado === 404 || estado === 410) {
    return 'La URL de imagen es incorrecta o el servicio ya no existe. Revisa IMAGEN_URL en tu .env.';
  }
  // Cualquier otro código: mensaje genérico con el número
  return `La API de imagen respondió con el código ${estado}.`;
}

// Paso 3: generar la imagen y guardarla; devuelve la ruta del .jpg
async function generarImagen(id) {
  // Paso 3.1: rutas del .txt de entrada y del .jpg de salida
  const rutaTxt = path.join(carpetaDescripciones, `mundo_${id}.txt`);
  const rutaImagen = path.join(carpetaImagenes, `mundo_${id}.jpg`);

  // Paso 3.2: si la imagen ya existe, no se llama a la API
  if (fs.existsSync(rutaImagen)) {
    console.log(`Paso 3: la imagen ya existe (${rutaImagen}). No llamo a la API de imagen.`);
    return rutaImagen;
  }

  // Paso 3.3: leer la descripción desde el archivo .txt
  // Si el .txt no existe, no hay nada que enviar
  if (!fs.existsSync(rutaTxt)) {
    throw new Error(`No encontré la descripción: ${rutaTxt}`);
  }
  // Lee el texto y le quita espacios sobrantes
  const descripcion = fs.readFileSync(rutaTxt, 'utf-8').trim();
  // Si quedó vacío, tampoco sirve
  if (descripcion === '') {
    throw new Error('El archivo de descripción está vacío.');
  }

  // Paso 3.4: leer las variables del .env (sin imprimir sus valores)
  const clave = process.env.IMAGEN_API_KEY; // token secreto de la API
  const url = process.env.IMAGEN_URL;       // dirección de la API
  // Si falta alguna, no se puede continuar
  if (!clave || !url) {
    throw new Error('Faltan variables en .env: IMAGEN_API_KEY y IMAGEN_URL.');
  }

  // Paso 3.5: enviar la petición con timeout de 60000 ms (60 segundos)
  let respuesta; // se declara afuera para usarla después del try/catch
  try {
    // fetch hace la petición HTTP y await espera la respuesta
    respuesta = await fetch(url, {
      method: 'POST', // POST = enviar datos al servidor
      headers: {
        'Content-Type': 'application/json', // avisa que el cuerpo es JSON
        Authorization: `Bearer ${clave}`     // manda el token para autenticarse
      },
      // El cuerpo lleva solo el prompt: la descripción generada antes
      body: JSON.stringify({ prompt: descripcion }),
      // Cancela si pasan 60 segundos (generar imágenes tarda más que el texto)
      signal: AbortSignal.timeout(60000)
    });
  } catch (error) {
    // TimeoutError: se acabó el tiempo de espera
    if (error.name === 'TimeoutError') {
      throw new Error('Se agotó el tiempo (60 segundos) esperando la API de imagen. Intenta de nuevo.');
    }
    // TypeError: fetch lo lanza cuando no hay conexión
    if (error.name === 'TypeError') {
      throw new Error('No hay conexión con la API de imagen. Revisa tu internet y IMAGEN_URL.');
    }
    // Cualquier otro error se relanza sin cambios
    throw error;
  }

  // Paso 3.6: revisar que la respuesta sea ok (código 200-299)
  if (!respuesta.ok) {
    // Traduce el código de error a un mensaje en español
    throw new Error(mensajeSegunEstado(respuesta.status));
  }

  // Paso 3.7: leer el JSON y comprobar que Cloudflare dice success: true
  const datos = await respuesta.json();
  // Aunque el código HTTP sea correcto, la API puede indicar fallo con success distinto de true
  if (datos.success !== true) {
    throw new Error('La API de imagen no terminó bien (success no es true). Intenta de nuevo.');
  }

  // Paso 3.8: buscar la imagen en result.image
  if (!datos.result || !datos.result.image) {
    throw new Error('La API de imagen no devolvió datos de imagen (result.image vacío).');
  }

  // Paso 3.9: convertir el base64 en bytes y guardar el .jpg (sin 'utf-8')
  // La imagen llega como texto en base64; Buffer.from la convierte en los bytes reales
  const bytes = Buffer.from(datos.result.image, 'base64');
  // Crea la carpeta de imágenes si no existe
  fs.mkdirSync(carpetaImagenes, { recursive: true });
  // Se escribe sin 'utf-8' porque una imagen es binaria; como texto se dañaría
  fs.writeFileSync(rutaImagen, bytes);
  // Devuelve la ruta de la imagen creada
  return rutaImagen;
}

// Paso 4: exportar la función para usarla en index.js
module.exports = { generarImagen };