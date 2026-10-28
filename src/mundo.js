const fs = require('fs');
const path = require('path');
const hash = require('object-hash');

// paso 1: carpeta donde se guardan los JSON (se crea al guardar)
const carpetaData = path.join(__dirname, '..', 'data');

// paso 2: ruta del archivo JSON de un mundo a partir de su id
function rutaMundo(id) {
  return path.join(carpetaData, `mundo_${id}.json`);
}

// paso 3: validar los argumentos y armar el objeto del mundo
function crearMundo(argumentos) {
  // paso 3.1: deben ser exactamente 7
  if (argumentos.length !== 7) {
    throw new Error(
      `Se esperaban 7 argumentos y recibí ${argumentos.length}. ` +
      'Uso: npm start -- "<situación>" "<mundo>" <color1> <color2> <color3> <color4> <color5>'
    );
  }

  // paso 3.2: ninguno puede estar vacío
  for (let i = 0; i < argumentos.length; i++) {
    if (argumentos[i].trim() === '') {
      throw new Error(`El argumento ${i + 1} está vacío.`);
    }
  }

  const situacion = argumentos[0].trim();
  const mundo = argumentos[1].trim();
  const colores = [];
  for (let i = 2; i < argumentos.length; i++) {
    colores.push(argumentos[i].trim());
  }

  // paso 3.3: los 5 colores deben ser distintos, sin distinguir mayúsculas
  for (let i = 0; i < colores.length; i++) {
    for (let j = i + 1; j < colores.length; j++) {
      if (colores[i].toLowerCase() === colores[j].toLowerCase()) {
        throw new Error(`El color "${colores[i]}" está repetido. Los 5 colores deben ser distintos.`);
      }
    }
  }

  // paso 3.4: el id son los 8 primeros caracteres del hash (sin creadoEn)
  const id = hash({ situacion, mundo, colores }).slice(0, 8);

  // paso 3.5: devolver el objeto completo con la fecha de creación
  return { id, situacion, mundo, colores, creadoEn: new Date().toISOString() };
}

// paso 4: guardar el mundo en data/mundo_<id>.json
function guardarMundo(mundoObjeto) {
  fs.mkdirSync(carpetaData, { recursive: true });
  const ruta = rutaMundo(mundoObjeto.id);
  fs.writeFileSync(ruta, JSON.stringify(mundoObjeto, null, 2));
  return ruta;
}

// paso 5: leer el JSON desde el archivo y convertirlo en objeto
function leerMundo(id) {
  const ruta = rutaMundo(id);
  if (!fs.existsSync(ruta)) {
    throw new Error(`No encontré el archivo del mundo: ${ruta}`);
  }
  const texto = fs.readFileSync(ruta, 'utf-8');
  return JSON.parse(texto);
}

// paso 6: exportar las 3 funciones para usarlas en index.js
module.exports = { crearMundo, guardarMundo, leerMundo };