// 'fs' sirve para leer y escribir archivos
const fs = require('fs');
// 'path' sirve para armar rutas de archivos
const path = require('path');

// Paso 1: carpeta donde se guardan las descripciones (se crea al guardar)
const carpetaDescripciones = path.join(__dirname, '..', 'descripciones');

// Paso 2: convertir el código de estado HTTP en un mensaje en español
function mensajeSegunEstado(estado) {
  // 401 = no autenticado, 403 = sin permiso: casi siempre es una clave mala
  if (estado === 401 || estado === 403) {
    return 'La clave de la API de texto no es válida. Revisa TEXTO_API_KEY en tu archivo .env.';
  }
  // 402 = pago requerido, 429 = demasiadas peticiones: se llegó al límite
  if (estado === 402 || estado === 429) {
    return 'Llegaste al límite de uso de la API de texto. Espera un rato o revisa tu cuenta.';
  }
  // 404 = no encontrado, 410 = ya no existe: URL o modelo incorrectos
  if (estado === 404 || estado === 410) {
    return 'El modelo o la URL de texto son incorrectos. Revisa TEXTO_MODELO y TEXTO_URL en tu .env.';
  }
  // Cualquier otro código: mensaje genérico con el número
  return `La API de texto respondió con el código ${estado}.`;
}

// Paso 3: armar el prompt en inglés con los datos del mundo
function armarPrompt(mundoObjeto) {
  return (
    // Instrucción principal
    'Write a prompt for an AI image generator. ' +
    // Datos del usuario (están en español)
    `Situation (in Spanish): ${mundoObjeto.situacion}. ` +
    `World (in Spanish): ${mundoObjeto.mundo}. ` +
    // join(', ') une los 5 colores separados por coma
    `The 5 colors are: ${mundoObjeto.colores.join(', ')}. ` +
    // Reglas de formato y longitud de la respuesta
    'Rules: reply in English with a single paragraph of 80 to 120 words. ' +
    // Qué debe describir
    'Describe the scene, the lighting, the composition and the visual style. ' +
    // Pide que los colores salgan traducidos al inglés
    'Mention all 5 colors using their English names (translate them from Spanish). ' +
    // Evita markdown y texto dentro de la imagen
    'Do not use markdown. Do not put any text, letters or words inside the image. ' +
    // Que no agregue saludos ni explicaciones
    'Reply only with the paragraph.'
  );
}

// Paso 4: generar la descripción y guardarla; devuelve la ruta del .txt
async function describirMundo(mundoObjeto) {
  // Paso 4.1: ruta del archivo de descripción de este mundo
  const ruta = path.join(carpetaDescripciones, `mundo_${mundoObjeto.id}.txt`);

  // Paso 4.2: si ya existe, no se llama a la API (ahorra tiempo y dinero)
  if (fs.existsSync(ruta)) {
    console.log(`Paso 2: la descripción ya existe (${ruta}). No llamo a la API de texto.`);
    return ruta;
  }

  // Paso 4.3: leer las variables del .env (sin imprimir sus valores)
  const clave = process.env.TEXTO_API_KEY; // clave secreta de la API
  const url = process.env.TEXTO_URL;       // dirección de la API
  const modelo = process.env.TEXTO_MODELO; // nombre del modelo de IA
  // Si falta alguna, no se puede continuar
  if (!clave || !url || !modelo) {
    throw new Error('Faltan variables en .env: TEXTO_API_KEY, TEXTO_URL y TEXTO_MODELO.');
  }

  // Paso 4.4: enviar la petición con timeout de 30000 ms (30 segundos)
  let respuesta; // se declara afuera para usarla después del try/catch
  try {
    // fetch hace la petición HTTP y await espera la respuesta
    respuesta = await fetch(url, {
      method: 'POST', // POST = enviar datos al servidor
      headers: {
        'Content-Type': 'application/json',  // avisa que el cuerpo es JSON
        Authorization: `Bearer ${clave}`      // manda la clave para autenticarse
      },
      // El cuerpo se convierte a texto JSON
      body: JSON.stringify({
        model: modelo,                                               // modelo a usar
        messages: [{ role: 'user', content: armarPrompt(mundoObjeto) }], // mensaje del usuario
        max_tokens: 300,   // largo máximo de la respuesta
        temperature: 0.7   // creatividad: 0 = muy literal, 1 = muy creativo
      }),
      // Cancela la petición si pasan 30 segundos
      signal: AbortSignal.timeout(30000)
    });
  } catch (error) {
    // TimeoutError: se acabó el tiempo de espera
    if (error.name === 'TimeoutError') {
      throw new Error('Se agotó el tiempo (30 segundos) esperando la API de texto. Intenta de nuevo.');
    }
    // TypeError: fetch lo lanza cuando no hay conexión
    if (error.name === 'TypeError') {
      throw new Error('No hay conexión con la API de texto. Revisa tu internet y TEXTO_URL.');
    }
    // Cualquier otro error se relanza sin cambios
    throw error;
  }

  // Paso 4.5: revisar que la respuesta sea ok (código 200-299)
  if (!respuesta.ok) {
    // Traduce el código de error a un mensaje en español
    throw new Error(mensajeSegunEstado(respuesta.status));
  }

  // Paso 4.6: sacar el texto de choices[0].message.content
  // Convierte el cuerpo de la respuesta en un objeto
  const datos = await respuesta.json();
  let descripcion = '';
  // Verifica paso a paso que exista cada parte para no romperse si la respuesta viene distinta
  if (datos.choices && datos.choices[0] && datos.choices[0].message) {
    // String() asegura que sea texto; trim() quita espacios sobrantes
    descripcion = String(datos.choices[0].message.content || '').trim();
  }

  // Paso 4.7: si viene vacía, lanzar Error
  if (descripcion === '') {
    throw new Error('La API de texto devolvió una descripción vacía.');
  }

  // Paso 4.8: si pasa de 1500 caracteres, recortar y avisar
  if (descripcion.length > 1500) {
    // slice(0, 1500) se queda solo con los primeros 1500 caracteres
    descripcion = descripcion.slice(0, 1500);
    console.log('Aviso: la descripción pasaba de 1500 caracteres y la recorté.');
  }

  // Paso 4.9: guardar el .txt (solo si todo salió bien)
  // Crea la carpeta si no existe
  fs.mkdirSync(carpetaDescripciones, { recursive: true });
  // Escribe la descripción como texto UTF-8
  fs.writeFileSync(ruta, descripcion, 'utf-8');
  // Devuelve la ruta del archivo creado
  return ruta;
}

// Paso 5: exportar la función para usarla en index.js
module.exports = { describirMundo };