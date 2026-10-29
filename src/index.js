const path = require('path');
const { crearMundo, guardarMundo, leerMundo } = require('./mundo');
const { describirMundo } = require('./texto');
const { generarImagen } = require('./imagen');

// función principal: todo el flujo va dentro de un try/catch
async function main() {
  try {
    // antes del paso 1: cargar las claves del .env (nunca se imprimen)
    try {
      process.loadEnvFile(path.join(__dirname, '..', '.env'));
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error('No encontré el archivo .env. Copia .env.example como .env y rellena tus valores.');
      }
      throw error;
    }

    // paso 1: validar los argumentos y guardar el JSON
    console.log('Paso 1: validando los argumentos y guardando el JSON...');
    const argumentos = process.argv.slice(2);
    const mundoCreado = crearMundo(argumentos);
    const rutaJson = guardarMundo(mundoCreado);
    console.log(`Paso 1: mundo ${mundoCreado.id} guardado en ${rutaJson}`);

    // paso 2: releer el JSON del archivo y pedir la descripción
    console.log('Paso 2: leyendo el JSON y pidiendo la descripción...');
    const mundoLeido = leerMundo(mundoCreado.id);
    const rutaTxt = await describirMundo(mundoLeido);
    console.log(`Paso 2: descripción lista en ${rutaTxt}`);

    // paso 3: leer el .txt y pedir la imagen (puede tardar hasta 60 segundos)
    console.log('Paso 3: leyendo la descripción y pidiendo la imagen...');
    const rutaImagen = await generarImagen(mundoCreado.id);
    console.log(`Paso 3: imagen lista en ${rutaImagen}`);

    console.log('Listo: el mundo quedó completo.');
  } catch (error) {
    // paso 4: mostrar el error en español y salir con código 1
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

main();