// Importa 'path' para armar rutas de archivos sin importar el sistema operativo
const path = require('path');
// Importa las 3 funciones de mundo.js (los { } sacan solo esas funciones del objeto exportado)
const { crearMundo, guardarMundo, leerMundo } = require('./mundo');
// Importa la función que pide la descripción a la IA de texto
const { describirMundo } = require('./texto');
// Importa la función que pide la imagen a la IA de imagen
const { generarImagen } = require('./imagen');

// Función principal: es async porque usa await para esperar las APIs
async function main() {
  // Si algo falla dentro de este bloque, el control salta al catch del final
  try {
    // Cargar las claves del .env (nunca se imprimen)
    try {
      // Carga las variables del .env en process.env; '..' sube una carpeta desde este archivo
      process.loadEnvFile(path.join(__dirname, '..', '.env'));
    } catch (error) {
      // ENOENT = "el archivo no existe"
      if (error.code === 'ENOENT') {
        // Lanza un error claro en español
        throw new Error('No encontré el archivo .env. Copia .env.example como .env y rellena tus valores.');
      }
      // Si es otro tipo de error, lo relanza tal cual
      throw error;
    }

    // Paso 1: validar los argumentos y guardar el JSON
    console.log('Paso 1: validando los argumentos y guardando el JSON...');
    // process.argv trae todo lo escrito en la terminal; slice(2) quita 'node' y el nombre del script
    const argumentos = process.argv.slice(2);
    // Valida los 7 argumentos y arma el objeto del mundo (con su id)
    const mundoCreado = crearMundo(argumentos);
    // Guarda el objeto como archivo JSON y devuelve la ruta donde quedó
    const rutaJson = guardarMundo(mundoCreado);
    // Avisa qué mundo se guardó y dónde
    console.log(`Paso 1: mundo ${mundoCreado.id} guardado en ${rutaJson}`);

    // Paso 2: releer el JSON del archivo y pedir la descripción
    console.log('Paso 2: leyendo el JSON y pidiendo la descripción...');
    // Vuelve a leer el JSON desde el disco para comprobar que se guardó bien
    const mundoLeido = leerMundo(mundoCreado.id);
    // Pide la descripción a la IA de texto y espera; devuelve la ruta del .txt
    const rutaTxt = await describirMundo(mundoLeido);
    // Avisa dónde quedó la descripción
    console.log(`Paso 2: descripción lista en ${rutaTxt}`);

    // Paso 3: leer el .txt y pedir la imagen (puede tardar hasta 60 segundos)
    console.log('Paso 3: leyendo la descripción y pidiendo la imagen...');
    // Genera la imagen usando el id del mundo; devuelve la ruta del .jpg
    const rutaImagen = await generarImagen(mundoCreado.id);
    // Avisa dónde quedó la imagen
    console.log(`Paso 3: imagen lista en ${rutaImagen}`);

    // Mensaje final de éxito
    console.log('Listo: el mundo quedó completo.');
  } catch (error) {
    // Paso 4: mostrar el error en español
    console.error(`Error: ${error.message}`);
    // Código de salida 1 = el programa terminó con error
    process.exitCode = 1;
  }
}

// Ejecuta la función principal
main();