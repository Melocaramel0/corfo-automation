import * as fs from 'fs/promises';
import * as path from 'path';
import * as readline from 'readline';
import {
  extraerMetadatosCampos,
  mapearCamposConIA,
  compararCamposFundamentales,
} from '../ai/comparadorCamposFundamentales';

/**
 * Interfaz para campos fundamentales (mismo que en comparadorCamposFundamentales.ts)
 */
interface CampoFundamental {
  valor?: string;
  tipo: string;
  obligatorio: boolean;
  descripcion: string;
  activo: boolean;
  esFundamental: boolean;
  numeroReferencia?: string;
  etiquetasReales?: string[];
}

interface CategoriaFundamental {
  nombre: string;
  descripcion: string;
  activo: boolean;
  campos: { [key: string]: CampoFundamental };
}

interface CamposFundamentalesJSON {
  metadatos: {
    version: string;
    ultimaModificacion: string;
    usuario: string;
    totalCamposFundamentales: number;
    descripcion: string;
    fuente: string;
  };
  categorias: {
    [categoria: string]: CategoriaFundamental;
  };
}

interface MapeoCampo {
  campoReal: {
    etiqueta: string;
    tipo: string;
    esObligatorio: boolean;
    completado: boolean;
    valorAsignado?: string;
  };
  campoFundamental?: {
    categoria: string;
    nombre: string;
    campo: CampoFundamental;
  };
  confianza: number;
  razon?: string;
}

/**
 * Crea interfaz readline para preguntas interactivas
 */
function crearReadline(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

/**
 * Pregunta al usuario de forma asíncrona
 */
function preguntar(rl: readline.Interface, pregunta: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(pregunta, (respuesta) => {
      resolve(respuesta.trim());
    });
  });
}

/**
 * Normaliza texto para comparación
 */
function normalizarTexto(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Procesa una ejecución y actualiza campos fundamentales
 */
async function procesarEjecucion(
  rutaEjecucion: string,
  camposFundamentales: CamposFundamentalesJSON,
  modoInteractivo: boolean = false
): Promise<void> {
  console.log(`\n📖 Procesando ejecución: ${path.basename(rutaEjecucion)}`);

  // Leer ejecución
  const contenido = await fs.readFile(rutaEjecucion, 'utf-8');
  const resultado = JSON.parse(contenido);

  // Extraer campos reales
  const camposReales = extraerMetadatosCampos(resultado);
  console.log(`   ✅ Extraídos ${camposReales.length} campos únicos`);

  // Mapear con IA
  console.log('   🤖 Iniciando mapeo con IA...');
  const mapeos = await mapearCamposConIA(camposReales, camposFundamentales);

  // Actualizar campos fundamentales con mapeos
  let actualizaciones = 0;
  let nuevosCampos = 0;

  for (const mapeo of mapeos) {
    if (mapeo.campoFundamental && mapeo.confianza > 0.5) {
      const { categoria, nombre } = mapeo.campoFundamental;
      const campo = camposFundamentales.categorias[categoria]?.campos[nombre];

      if (campo) {
        // Agregar etiqueta real si no existe
        if (!campo.etiquetasReales) {
          campo.etiquetasReales = [];
        }

        const etiquetaNormalizada = normalizarTexto(mapeo.campoReal.etiqueta);
        const yaExiste = campo.etiquetasReales.some((etiqueta) =>
          normalizarTexto(etiqueta) === etiquetaNormalizada
        );

        if (!yaExiste) {
          campo.etiquetasReales.push(mapeo.campoReal.etiqueta);
          actualizaciones++;
        }

        // Actualizar metadatos si hay diferencias
        if (campo.tipo !== mapeo.campoReal.tipo && mapeo.confianza > 0.8) {
          if (modoInteractivo) {
            const rl = crearReadline();
            const respuesta = await preguntar(
              rl,
              `\n   ¿Actualizar tipo de "${nombre}" de "${campo.tipo}" a "${mapeo.campoReal.tipo}"? (s/n): `
            );
            rl.close();

            if (respuesta.toLowerCase() === 's') {
              campo.tipo = mapeo.campoReal.tipo;
              actualizaciones++;
            }
          } else {
            // Modo automático: actualizar si la confianza es alta
            campo.tipo = mapeo.campoReal.tipo;
            actualizaciones++;
          }
        }

        if (campo.obligatorio !== mapeo.campoReal.esObligatorio && mapeo.confianza > 0.8) {
          if (modoInteractivo) {
            const rl = crearReadline();
            const respuesta = await preguntar(
              rl,
              `\n   ¿Actualizar obligatoriedad de "${nombre}" de ${campo.obligatorio} a ${mapeo.campoReal.esObligatorio}? (s/n): `
            );
            rl.close();

            if (respuesta.toLowerCase() === 's') {
              campo.obligatorio = mapeo.campoReal.esObligatorio;
              actualizaciones++;
            }
          } else {
            campo.obligatorio = mapeo.campoReal.esObligatorio;
            actualizaciones++;
          }
        }
      }
    } else if (modoInteractivo && mapeo.confianza < 0.3) {
      // Campo no mapeado: preguntar si se debe agregar como nuevo
      const rl = crearReadline();
      const respuesta = await preguntar(
        rl,
        `\n   Campo no mapeado encontrado: "${mapeo.campoReal.etiqueta}" (tipo: ${mapeo.campoReal.tipo})\n   ¿Deseas agregarlo como nuevo campo fundamental? (s/n): `
      );
      rl.close();

      if (respuesta.toLowerCase() === 's') {
        const categoriaRespuesta = await preguntar(
          crearReadline(),
          `   ¿En qué categoría? (personaJuridica/representanteLegal/directorProyecto/personaNatural/datosProyecto/ubicacionProyecto): `
        );

        const nombreCampo = mapeo.campoReal.etiqueta
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, '_')
          .replace(/_+/g, '_')
          .replace(/^_|_$/g, '');

        const nuevaCategoria = categoriaRespuesta.trim() || 'datosProyecto';
        if (!camposFundamentales.categorias[nuevaCategoria]) {
          console.log(`   ⚠️ Categoría "${nuevaCategoria}" no existe, usando "datosProyecto"`);
          camposFundamentales.categorias['datosProyecto'] = {
            nombre: 'Información del Proyecto',
            descripcion: 'Datos específicos del proyecto a postular',
            activo: true,
            campos: {},
          };
        }

        camposFundamentales.categorias[nuevaCategoria].campos[nombreCampo] = {
          valor: mapeo.campoReal.valorAsignado || '',
          tipo: mapeo.campoReal.tipo,
          obligatorio: mapeo.campoReal.esObligatorio,
          descripcion: mapeo.campoReal.etiqueta,
          activo: true,
          esFundamental: true,
          etiquetasReales: [mapeo.campoReal.etiqueta],
        };

        nuevosCampos++;
      }
    }
  }

  console.log(`   ✅ Actualizaciones: ${actualizaciones} campos actualizados, ${nuevosCampos} campos nuevos`);
}

/**
 * Función principal del script
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('📋 Script de Actualización de Campos Fundamentales CORFO');
    console.log('');
    console.log('Uso:');
    console.log('  npx ts-node scripts/actualizarCamposFundamentales.ts <ruta-ejecucion> [--interactivo]');
    console.log('');
    console.log('Ejemplos:');
    console.log('  npx ts-node scripts/actualizarCamposFundamentales.ts data/execution_results/exec_1.json');
    console.log('  npx ts-node scripts/actualizarCamposFundamentales.ts data/execution_results/exec_1.json --interactivo');
    console.log('');
    console.log('Opciones:');
    console.log('  --interactivo    Solicita confirmación antes de actualizar cada campo');
    process.exit(1);
  }

  const rutaEjecucion = args[0];
  const modoInteractivo = args.includes('--interactivo');

  try {
    await fs.access(rutaEjecucion);
  } catch {
    console.error(`❌ Error: No se encontró el archivo ${rutaEjecucion}`);
    process.exit(1);
  }

  const rutaCamposFundamentales = path.join(__dirname, '../../campos_fundamentales.json');

  try {
    console.log('📖 Leyendo campos fundamentales...');
    const contenidoCampos = await fs.readFile(rutaCamposFundamentales, 'utf-8');
    const camposFundamentales: CamposFundamentalesJSON = JSON.parse(contenidoCampos);

    console.log(`   ✅ Cargados ${camposFundamentales.metadatos.totalCamposFundamentales} campos fundamentales`);

    // Procesar ejecución
    await procesarEjecucion(rutaEjecucion, camposFundamentales, modoInteractivo);

    // Actualizar metadatos
    camposFundamentales.metadatos.ultimaModificacion = new Date().toISOString();
    camposFundamentales.metadatos.usuario = modoInteractivo ? 'Usuario' : 'Sistema';
    
    // Recalcular total de campos fundamentales
    let total = 0;
    Object.values(camposFundamentales.categorias).forEach((categoria) => {
      if (categoria.activo) {
        Object.values(categoria.campos).forEach((campo) => {
          if (campo.activo && campo.esFundamental) {
            total++;
          }
        });
      }
    });
    camposFundamentales.metadatos.totalCamposFundamentales = total;

    // Guardar archivo actualizado
    console.log('\n💾 Guardando campos fundamentales actualizados...');
    await fs.writeFile(
      rutaCamposFundamentales,
      JSON.stringify(camposFundamentales, null, 2),
      'utf-8'
    );

    console.log('✅ Actualización completada exitosamente');
    console.log(`   📄 Archivo actualizado: ${rutaCamposFundamentales}`);
    console.log(`   📊 Total campos fundamentales: ${total}`);

    // Mostrar resumen de comparación
    console.log('\n📊 Generando resumen de comparación...');
    const resultado = JSON.parse(await fs.readFile(rutaEjecucion, 'utf-8'));
    const comparacion = await compararCamposFundamentales(resultado, rutaCamposFundamentales);
    
    console.log('\n📈 Estadísticas:');
    console.log(`   Total campos fundamentales: ${comparacion.estadisticas.totalFundamentales}`);
    console.log(`   Campos encontrados: ${comparacion.estadisticas.encontrados} (${comparacion.estadisticas.porcentajeCobertura}%)`);
    console.log(`   Campos faltantes: ${comparacion.estadisticas.faltantes}`);

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
}

