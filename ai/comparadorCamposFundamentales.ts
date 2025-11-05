import * as fs from 'fs/promises';
import * as path from 'path';
import dotenv from 'dotenv';
import { AzureOpenAI } from 'openai';
import { configurarClienteAzure, crearCompletacionConFallback } from './generadorInforme';

dotenv.config();

/**
 * Interfaz para campos fundamentales del JSON
 */
interface CampoFundamental {
  valor?: string;
  tipo: string;
  obligatorio: boolean;
  descripcion: string;
  activo: boolean;
  esFundamental: boolean;
  numeroReferencia?: string;
  etiquetasReales?: string[]; // Nuevo campo para almacenar etiquetas reales encontradas
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

/**
 * Interfaz para campos extraídos de ejecuciones
 */
interface CampoReal {
  etiqueta: string;
  tipo: string;
  esObligatorio: boolean;
  completado: boolean;
  valorAsignado?: string;
}

/**
 * Interfaz para resultado de mapeo con IA
 */
interface MapeoCampo {
  campoReal: CampoReal;
  campoFundamental?: {
    categoria: string;
    nombre: string;
    campo: CampoFundamental;
  };
  confianza: number; // 0-1
  razon?: string;
}

/**
 * Interfaz para resultado de comparación
 */
export interface ResultadoComparacion {
  estadisticas: {
    totalFundamentales: number;
    encontrados: number;
    faltantes: number;
    porcentajeCobertura: number;
  };
  porCategoria: {
    [categoria: string]: {
      total: number;
      encontrados: number;
      faltantes: number;
      porcentaje: number;
    };
  };
  camposFaltantes: Array<{
    categoria: string;
    nombre: string;
    descripcion: string;
    numeroReferencia?: string;
  }>;
  camposEncontrados: Array<{
    categoria: string;
    nombre: string;
    etiquetaReal: string;
    completado: boolean;
  }>;
}

/**
 * Extrae todos los campos únicos de una ejecución
 */
export function extraerMetadatosCampos(resultado: any): CampoReal[] {
  const camposUnicos = new Map<string, CampoReal>();

  if (resultado.pasosCompletados) {
    resultado.pasosCompletados.forEach((paso: any) => {
      if (paso.detalles) {
        paso.detalles.forEach((detalle: any) => {
          const etiqueta = detalle.etiqueta?.trim();
          if (etiqueta && !camposUnicos.has(etiqueta)) {
            camposUnicos.set(etiqueta, {
              etiqueta,
              tipo: detalle.tipo || 'text',
              esObligatorio: detalle.esObligatorio || false,
              completado: detalle.completado || false,
              valorAsignado: detalle.valorAsignado,
            });
          }
        });
      }
    });
  }

  return Array.from(camposUnicos.values());
}

/**
 * Normaliza texto para comparación
 */
function normalizarTexto(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
    .replace(/[^a-z0-9\s]/g, ' ') // Eliminar caracteres especiales
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calcula similitud básica entre dos textos (sin IA, para comparación rápida)
 */
function calcularSimilitudBasica(texto1: string, texto2: string): number {
  const normalizado1 = normalizarTexto(texto1);
  const normalizado2 = normalizarTexto(texto2);

  if (normalizado1 === normalizado2) return 1.0;

  // Palabras clave comunes
  const palabras1 = normalizado1.split(' ');
  const palabras2 = normalizado2.split(' ');

  const palabrasComunes = palabras1.filter(p => palabras2.includes(p));
  const todasLasPalabras = new Set([...palabras1, ...palabras2]);

  return palabrasComunes.length / todasLasPalabras.size;
}

/**
 * Mapea campos reales a campos fundamentales usando IA
 * Solo se usa cuando se actualiza el JSON de campos fundamentales
 */
export async function mapearCamposConIA(
  camposReales: CampoReal[],
  camposFundamentales: CamposFundamentalesJSON
): Promise<MapeoCampo[]> {
  console.log('🤖 Iniciando mapeo de campos con IA...');
  console.log(`   Campos reales a mapear: ${camposReales.length}`);

  const cliente = configurarClienteAzure();
  const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME!;

  // Construir lista de campos fundamentales para el prompt
  const listaFundamentales: Array<{
    categoria: string;
    nombre: string;
    descripcion: string;
    numeroReferencia?: string;
  }> = [];

  Object.entries(camposFundamentales.categorias).forEach(([categoria, cat]) => {
    Object.entries(cat.campos).forEach(([nombre, campo]) => {
      if (campo.activo && campo.esFundamental) {
        listaFundamentales.push({
          categoria,
          nombre,
          descripcion: campo.descripcion,
          numeroReferencia: campo.numeroReferencia,
        });
      }
    });
  });

  // Procesar en lotes para evitar prompts muy largos
  const tamañoLote = 20;
  const mapeos: MapeoCampo[] = [];

  for (let i = 0; i < camposReales.length; i += tamañoLote) {
    const lote = camposReales.slice(i, i + tamañoLote);
    console.log(`   Procesando lote ${Math.floor(i / tamañoLote) + 1}/${Math.ceil(camposReales.length / tamañoLote)}...`);

    const prompt = generarPromptMapeo(lote, listaFundamentales);
    
    try {
      const respuesta = await crearCompletacionConFallback(
        cliente,
        deploymentName,
        [
          {
            role: 'system',
            content: 'Eres un experto en formularios CORFO. Tu tarea es mapear etiquetas de campos reales encontrados en formularios a campos fundamentales de CORFO. Debes analizar el significado semántico de cada campo.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        0.2
      );

      // Registrar consumo de IA
      try {
        const { AIConsumptionService } = await import('../server/services/aiConsumptionService');
        const aiConsumptionService = AIConsumptionService.getInstance();
        const inputTokens = respuesta.usage?.prompt_tokens || 0;
        const outputTokens = respuesta.usage?.completion_tokens || 0;
        await aiConsumptionService.recordNLPRequest(inputTokens, outputTokens);
        await aiConsumptionService.recordTopicDetection(); // Mapeo de campos usa detección de temas
      } catch (error) {
        // Si falla el tracking, continuar sin registrar (no crítico)
        console.warn('⚠️ No se pudo registrar consumo de IA:', error);
      }

      const contenido = respuesta.choices[0]?.message?.content;
      if (contenido) {
        const mapeosLote = parsearRespuestaMapeo(contenido, lote, camposFundamentales);
        mapeos.push(...mapeosLote);
      }
    } catch (error: any) {
      console.error(`   ⚠️ Error mapeando lote: ${error.message}`);
      // Continuar con similitud básica como fallback
      lote.forEach(campoReal => {
        mapeos.push({
          campoReal,
          confianza: 0,
        });
      });
    }
  }

  console.log(`✅ Mapeo completado: ${mapeos.length} campos procesados`);
  return mapeos;
}

/**
 * Genera el prompt para mapeo con IA
 */
function generarPromptMapeo(
  camposReales: CampoReal[],
  camposFundamentales: Array<{
    categoria: string;
    nombre: string;
    descripcion: string;
    numeroReferencia?: string;
  }>
): string {
  const camposRealesStr = camposReales.map((c, idx) => 
    `${idx + 1}. "${c.etiqueta}" (tipo: ${c.tipo}, obligatorio: ${c.esObligatorio})`
  ).join('\n');

  const camposFundamentalesStr = camposFundamentales.map((c, idx) => 
    `${idx + 1}. [${c.categoria}] ${c.nombre} - ${c.descripcion}${c.numeroReferencia ? ` (Ref: ${c.numeroReferencia})` : ''}`
  ).join('\n');

  return `Analiza las siguientes etiquetas de campos encontrados en un formulario CORFO y mapea cada una al campo fundamental CORFO que corresponde semánticamente.

**CAMPOS REALES ENCONTRADOS:**
${camposRealesStr}

**CAMPOS FUNDAMENTALES CORFO DISPONIBLES:**
${camposFundamentalesStr}

**INSTRUCCIONES:**
- Para cada campo real, identifica el campo fundamental CORFO que representa el mismo concepto
- Considera sinónimos y variaciones de nombre (ej: "Nombre Proyecto" = "Título del Proyecto")
- Si un campo real NO corresponde a ningún campo fundamental, deja el mapeo vacío
- Asigna un nivel de confianza (0-1) para cada mapeo

**FORMATO DE RESPUESTA (JSON):**
[
  {
    "indice": 1,
    "etiqueta": "Datos Generales Proyecto Nombre Proyecto",
    "campoFundamental": "TITULO_PROYECTO",
    "categoria": "datosProyecto",
    "confianza": 0.95,
    "razon": "Corresponde claramente al título del proyecto"
  },
  {
    "indice": 2,
    "etiqueta": "Campo desconocido",
    "campoFundamental": null,
    "categoria": null,
    "confianza": 0.0,
    "razon": "No corresponde a ningún campo fundamental"
  }
]

Responde SOLO con el JSON, sin texto adicional:`;
}

/**
 * Parsea la respuesta de la IA y construye los mapeos
 */
function parsearRespuestaMapeo(
  contenido: string,
  camposReales: CampoReal[],
  camposFundamentales: CamposFundamentalesJSON
): MapeoCampo[] {
  const mapeos: MapeoCampo[] = [];

  try {
    // Intentar extraer JSON del contenido
    const jsonMatch = contenido.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No se encontró JSON en la respuesta');
    }

    const mapeosIA = JSON.parse(jsonMatch[0]);

    mapeosIA.forEach((mapeoIA: any) => {
      const indice = mapeoIA.indice - 1; // Los índices empiezan en 1
      if (indice >= 0 && indice < camposReales.length) {
        const campoReal = camposReales[indice];
        let campoFundamental = undefined;

        if (mapeoIA.campoFundamental && mapeoIA.categoria) {
          const categoria = camposFundamentales.categorias[mapeoIA.categoria];
          if (categoria && categoria.campos[mapeoIA.campoFundamental]) {
            campoFundamental = {
              categoria: mapeoIA.categoria,
              nombre: mapeoIA.campoFundamental,
              campo: categoria.campos[mapeoIA.campoFundamental],
            };
          }
        }

        mapeos.push({
          campoReal,
          campoFundamental,
          confianza: mapeoIA.confianza || 0,
          razon: mapeoIA.razon,
        });
      }
    });
  } catch (error: any) {
    console.error(`   ⚠️ Error parseando respuesta de IA: ${error.message}`);
    // Fallback: usar similitud básica
    camposReales.forEach(campoReal => {
      const mejorMapeo = encontrarMejorMapeoBasico(campoReal, camposFundamentales);
      mapeos.push(mejorMapeo);
    });
  }

  return mapeos;
}

/**
 * Encuentra el mejor mapeo usando similitud básica (fallback)
 */
function encontrarMejorMapeoBasico(
  campoReal: CampoReal,
  camposFundamentales: CamposFundamentalesJSON
): MapeoCampo {
  let mejorMapeo: MapeoCampo = {
    campoReal,
    confianza: 0,
  };

  Object.entries(camposFundamentales.categorias).forEach(([categoria, cat]) => {
    Object.entries(cat.campos).forEach(([nombre, campo]) => {
      if (campo.activo && campo.esFundamental) {
        // Comparar con descripción y nombre
        const similitudNombre = calcularSimilitudBasica(campoReal.etiqueta, nombre);
        const similitudDescripcion = calcularSimilitudBasica(campoReal.etiqueta, campo.descripcion);

        // También comparar con etiquetas reales ya guardadas
        let similitudEtiquetas = 0;
        if (campo.etiquetasReales && campo.etiquetasReales.length > 0) {
          const mejoresSimilitudes = campo.etiquetasReales.map(etiqueta =>
            calcularSimilitudBasica(campoReal.etiqueta, etiqueta)
          );
          similitudEtiquetas = Math.max(...mejoresSimilitudes);
        }

        const confianzaTotal = Math.max(similitudNombre, similitudDescripcion, similitudEtiquetas);

        if (confianzaTotal > mejorMapeo.confianza && confianzaTotal > 0.3) {
          mejorMapeo = {
            campoReal,
            campoFundamental: {
              categoria,
              nombre,
              campo,
            },
            confianza: confianzaTotal,
            razon: `Similitud basada en texto`,
          };
        }
      }
    });
  });

  return mejorMapeo;
}

/**
 * Compara campos de una ejecución con campos fundamentales (sin IA, rápido)
 */
export async function compararCamposFundamentales(
  resultado: any,
  rutaCamposFundamentales?: string
): Promise<ResultadoComparacion> {
  // Cargar campos fundamentales
  const ruta = rutaCamposFundamentales || path.join(__dirname, '../campos_fundamentales.json');
  const contenido = await fs.readFile(ruta, 'utf-8');
  const camposFundamentales: CamposFundamentalesJSON = JSON.parse(contenido);

  // Extraer campos reales de la ejecución
  const camposReales = extraerMetadatosCampos(resultado);

  // Crear mapa de etiquetas reales para búsqueda rápida
  const etiquetasRealesMap = new Map<string, CampoReal>();
  camposReales.forEach(campo => {
    etiquetasRealesMap.set(normalizarTexto(campo.etiqueta), campo);
  });

  const estadisticas = {
    totalFundamentales: 0,
    encontrados: 0,
    faltantes: 0,
    porcentajeCobertura: 0,
  };

  const porCategoria: { [key: string]: any } = {};
  const camposFaltantes: ResultadoComparacion['camposFaltantes'] = [];
  const camposEncontrados: ResultadoComparacion['camposEncontrados'] = [];

  // Recorrer todos los campos fundamentales
  Object.entries(camposFundamentales.categorias).forEach(([categoria, cat]) => {
    if (!cat.activo) return;

    porCategoria[categoria] = {
      total: 0,
      encontrados: 0,
      faltantes: 0,
      porcentaje: 0,
    };

    Object.entries(cat.campos).forEach(([nombre, campo]) => {
      if (!campo.activo || !campo.esFundamental) return;

      estadisticas.totalFundamentales++;
      porCategoria[categoria].total++;

      // Buscar coincidencia
      let encontrado = false;
      let mejorEtiqueta = '';
      let completado = false;

      // 1. Buscar coincidencia exacta en etiquetas reales guardadas
      if (campo.etiquetasReales && campo.etiquetasReales.length > 0) {
        for (const etiquetaGuardada of campo.etiquetasReales) {
          const etiquetaNormalizada = normalizarTexto(etiquetaGuardada);
          const campoEncontrado = etiquetasRealesMap.get(etiquetaNormalizada);
          if (campoEncontrado) {
            encontrado = true;
            mejorEtiqueta = etiquetaGuardada;
            completado = campoEncontrado.completado;
            break;
          }
        }
      }

      // 2. Si no hay coincidencia exacta, usar similitud básica
      if (!encontrado) {
        let mejorSimilitud = 0;
        for (const [etiquetaNormalizada, campoReal] of etiquetasRealesMap.entries()) {
          const similitud = calcularSimilitudBasica(campoReal.etiqueta, nombre) ||
                           calcularSimilitudBasica(campoReal.etiqueta, campo.descripcion);
          
          if (similitud > mejorSimilitud && similitud > 0.6) {
            mejorSimilitud = similitud;
            encontrado = true;
            mejorEtiqueta = campoReal.etiqueta;
            completado = campoReal.completado;
          }
        }
      }

      if (encontrado) {
        estadisticas.encontrados++;
        porCategoria[categoria].encontrados++;
        camposEncontrados.push({
          categoria,
          nombre,
          etiquetaReal: mejorEtiqueta,
          completado,
        });
      } else {
        estadisticas.faltantes++;
        porCategoria[categoria].faltantes++;
        camposFaltantes.push({
          categoria,
          nombre,
          descripcion: campo.descripcion,
          numeroReferencia: campo.numeroReferencia,
        });
      }
    });

    // Calcular porcentaje por categoría
    if (porCategoria[categoria].total > 0) {
      porCategoria[categoria].porcentaje = Math.round(
        (porCategoria[categoria].encontrados / porCategoria[categoria].total) * 100
      );
    }
  });

  // Calcular porcentaje total
  if (estadisticas.totalFundamentales > 0) {
    estadisticas.porcentajeCobertura = Math.round(
      (estadisticas.encontrados / estadisticas.totalFundamentales) * 100
    );
  }

  return {
    estadisticas,
    porCategoria,
    camposFaltantes,
    camposEncontrados,
  };
}

/**
 * Genera estadísticas formateadas para el informe
 */
export function generarEstadisticasComparacion(resultado: ResultadoComparacion): string {
  const { estadisticas, porCategoria, camposFaltantes, camposEncontrados } = resultado;

  const lineas: string[] = [];

  lineas.push('\n**ESTADÍSTICAS DE CAMPOS FUNDAMENTALES**:');
  lineas.push(`- Total campos fundamentales: ${estadisticas.totalFundamentales}`);
  lineas.push(`- Campos encontrados: ${estadisticas.encontrados} (${estadisticas.porcentajeCobertura}%)`);
  lineas.push(`- Campos faltantes: ${estadisticas.faltantes}`);

  if (Object.keys(porCategoria).length > 0) {
    lineas.push('\n**POR CATEGORÍA**:');
    Object.entries(porCategoria).forEach(([categoria, stats]) => {
      lineas.push(`- ${categoria}: ${stats.encontrados}/${stats.total} (${stats.porcentaje}%)`);
    });
  }

  if (camposEncontrados.length > 0) {
    lineas.push('\n**CAMPOS FUNDAMENTALES ENCONTRADOS**:');
    camposEncontrados.slice(0, 10).forEach(campo => {
      const icono = campo.completado ? '✅' : '⚠️';
      lineas.push(`${icono} ${campo.nombre} (${campo.etiquetaReal})`);
    });
    if (camposEncontrados.length > 10) {
      lineas.push(`... y ${camposEncontrados.length - 10} más`);
    }
  }

  if (camposFaltantes.length > 0) {
    lineas.push('\n**CAMPOS FUNDAMENTALES FALTANTES**:');
    camposFaltantes.slice(0, 10).forEach(campo => {
      lineas.push(`❌ ${campo.nombre} - ${campo.descripcion}`);
    });
    if (camposFaltantes.length > 10) {
      lineas.push(`... y ${camposFaltantes.length - 10} más`);
    }
  }

  return lineas.join('\n');
}

