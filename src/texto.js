const fs = require('fs');
const path = require('path');

// paso 1: carpeta donde se guardan las descripciones (se crea al guardar)
const carpetaDescripciones = path.join(__dirname, '..', 'descripciones');

// paso 2: convertir el código de estado HTTP en un mensaje en español
function mensajeSegunEstado(estado) {
  if (estado === 401 || estado === 403) {
    return 'La clave de la API de texto no es válida. Revisa TEXTO_API_KEY en tu archivo .env.';
  }
  if (estado === 402 || estado === 429) {
    return 'Llegaste al límite de uso de la API de texto. Espera un rato o revisa tu cuenta.';
  }
  if (estado === 404 || estado === 410) {
    return 'El modelo o la URL de texto son incorrectos. Revisa TEXTO_MODELO y TEXTO_URL en tu .env.';
  }
  return `La API de texto respondió con el código ${estado}.`;
}

// paso 3: armar el prompt en inglés con los datos del mundo
function armarPrompt(mundoObjeto) {
  return (
    'Write a prompt for an AI image generator. ' +
    `Situation (in Spanish): ${mundoObjeto.situacion}. ` +
    `World (in Spanish): ${mundoObjeto.mundo}. ` +
    `The 5 colors are: ${mundoObjeto.colores.join(', ')}. ` +
    'Rules: reply in English with a single paragraph of 80 to 120 words. ' +
    'Describe the scene, the lighting, the composition and the visual style. ' +
    'Mention all 5 colors using their English names (translate them from Spanish). ' +
    'Do not use markdown. Do not put any text, letters or words inside the image. ' +
    'Reply only with the paragraph.'
  );
}

// paso 4: generar la descripción y guardarla; devuelve la ruta del .txt
async function describirMundo(mundoObjeto) {
  // paso 4.1: ruta del archivo de descripción de este mundo
  const ruta = path.join(carpetaDescripciones, `mundo_${mundoObjeto.id}.txt`);

  // paso 4.2: si ya existe, no se llama a la API
  if (fs.existsSync(ruta)) {
    console.log(`Paso 2: la descripción ya existe (${ruta}). No llamo a la API de texto.`);
    return ruta;
  }

  // paso 4.3: leer las variables del .env (sin imprimir sus valores)
  const clave = process.env.TEXTO_API_KEY;
  const url = process.env.TEXTO_URL;
  const modelo = process.env.TEXTO_MODELO;
  if (!clave || !url || !modelo) {
    throw new Error('Faltan variables en .env: TEXTO_API_KEY, TEXTO_URL y TEXTO_MODELO.');
  }

  // paso 4.4: enviar la petición con timeout de 30000 ms
  let respuesta;
  try {
    respuesta = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${clave}`
      },
      body: JSON.stringify({
        model: modelo,
        messages: [{ role: 'user', content: armarPrompt(mundoObjeto) }],
        max_tokens: 300,
        temperature: 0.7
      }),
      signal: AbortSignal.timeout(30000)
    });
  } catch (error) {
    if (error.name === 'TimeoutError') {
      throw new Error('Se agotó el tiempo (30 segundos) esperando la API de texto. Intenta de nuevo.');
    }
    if (error.name === 'TypeError') {
      throw new Error('No hay conexión con la API de texto. Revisa tu internet y TEXTO_URL.');
    }
    throw error;
  }

  // paso 4.5: revisar que la respuesta sea ok
  if (!respuesta.ok) {
    throw new Error(mensajeSegunEstado(respuesta.status));
  }

  // paso 4.6: sacar el texto de choices[0].message.content
  const datos = await respuesta.json();
  let descripcion = '';
  if (datos.choices && datos.choices[0] && datos.choices[0].message) {
    descripcion = String(datos.choices[0].message.content || '').trim();
  }

  // paso 4.7: si viene vacía, lanzar Error
  if (descripcion === '') {
    throw new Error('La API de texto devolvió una descripción vacía.');
  }

  // paso 4.8: si pasa de 1500 caracteres, recortar y avisar
  if (descripcion.length > 1500) {
    descripcion = descripcion.slice(0, 1500);
    console.log('Aviso: la descripción pasaba de 1500 caracteres y la recorté.');
  }

  // paso 4.9: guardar el .txt (solo si todo salió bien)
  fs.mkdirSync(carpetaDescripciones, { recursive: true });
  fs.writeFileSync(ruta, descripcion, 'utf-8');
  return ruta;
}

// paso 5: exportar la función para usarla en index.js
module.exports = { describirMundo };