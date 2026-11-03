// 'fs' sirve para leer y escribir archivos
const fs = require('fs');
// 'path' sirve para armar rutas de archivos
const path = require('path');
// 'object-hash' (paquete de npm) convierte un objeto en un código único
const hash = require('object-hash');

// Paso 1: carpeta donde se guardan los JSON (una carpeta arriba de este archivo; se crea al guardar)
const carpetaData = path.join(__dirname, '..', 'data');

// Paso 2: ruta del archivo JSON de un mundo a partir de su id
function rutaMundo(id) {
  // Ejemplo de resultado: data/mundo_ab12cd34.json
  return path.join(carpetaData, `mundo_${id}.json`);
}

// Paso 3: validar los argumentos y armar el objeto del mundo
function crearMundo(argumentos) {
  // Paso 3.1: deben ser exactamente 7 (situación, mundo y 5 colores)
  if (argumentos.length !== 7) {
    // Si no son 7, lanza un error que explica cómo usar el programa
    throw new Error(
      `Se esperaban 7 argumentos y recibí ${argumentos.length}. ` +
      'Uso: npm start -- "<situación>" "<mundo>" <color1> <color2> <color3> <color4> <color5>'
    );
  }

  // Paso 3.2: ninguno puede estar vacío
  for (let i = 0; i < argumentos.length; i++) {
    // trim() quita espacios, así que "   " también cuenta como vacío
    if (argumentos[i].trim() === '') {
      // i + 1 porque las personas cuentan desde 1, no desde 0
      throw new Error(`El argumento ${i + 1} está vacío.`);
    }
  }

  // El primer argumento es la situación (sin espacios sobrantes)
  const situacion = argumentos[0].trim();
  // El segundo argumento es el mundo
  const mundo = argumentos[1].trim();
  // Arreglo donde se guardarán los 5 colores
  const colores = [];
  // Del tercer argumento (posición 2) en adelante son colores
  for (let i = 2; i < argumentos.length; i++) {
    // Agrega cada color al arreglo, sin espacios sobrantes
    colores.push(argumentos[i].trim());
  }

  // Paso 3.3: los 5 colores deben ser distintos, sin distinguir mayúsculas
  for (let i = 0; i < colores.length; i++) {
    // j empieza en i + 1 para no comparar un color consigo mismo ni repetir parejas
    for (let j = i + 1; j < colores.length; j++) {
      // Compara en minúsculas para que "Rojo" y "rojo" cuenten como iguales
      if (colores[i].toLowerCase() === colores[j].toLowerCase()) {
        throw new Error(`El color "${colores[i]}" está repetido. Los 5 colores deben ser distintos.`);
      }
    }
  }

  // Paso 3.4: el id son los 8 primeros caracteres del hash (sin creadoEn)
  // Los mismos datos siempre dan el mismo id; la fecha no entra para que el id no cambie
  const id = hash({ situacion, mundo, colores }).slice(0, 8);

  // Paso 3.5: devolver el objeto completo con la fecha de creación en formato ISO
  return { id, situacion, mundo, colores, creadoEn: new Date().toISOString() };
}

// Paso 4: guardar el mundo en data/mundo_<id>.json
function guardarMundo(mundoObjeto) {
  // Crea la carpeta data si no existe; recursive evita error si ya existe
  fs.mkdirSync(carpetaData, { recursive: true });
  // Calcula la ruta del archivo usando el id
  const ruta = rutaMundo(mundoObjeto.id);
  // Convierte el objeto a texto JSON con sangría de 2 espacios y lo escribe en el archivo
  fs.writeFileSync(ruta, JSON.stringify(mundoObjeto, null, 2));
  // Devuelve la ruta para poder mostrarla
  return ruta;
}

// Paso 5: leer el JSON desde el archivo y convertirlo en objeto
function leerMundo(id) {
  // Calcula la ruta del archivo a partir del id
  const ruta = rutaMundo(id);
  // Si el archivo no existe, lanza un error
  if (!fs.existsSync(ruta)) {
    throw new Error(`No encontré el archivo del mundo: ${ruta}`);
  }
  // Lee el contenido del archivo como texto
  const texto = fs.readFileSync(ruta, 'utf-8');
  // Convierte el texto JSON de vuelta en un objeto de JavaScript
  return JSON.parse(texto);
}

// Paso 6: exportar las 3 funciones para usarlas en index.js
module.exports = { crearMundo, guardarMundo, leerMundo };