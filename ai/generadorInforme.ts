import * as fs from 'fs/promises';
import * as path from 'path';
import dotenv from 'dotenv';
import { AzureOpenAI } from 'openai';
import { mdToPdf } from 'md-to-pdf';
import {
  compararCamposFundamentales,
  generarEstadisticasComparacion,
} from './comparadorCamposFundamentales';

// Cargar variables de entorno
dotenv.config();

/**
 * Interfaz para el resultado del agente (compatible con report_X.json y exec_X.json)
 */
interface ResultadoAgente {
  exito: boolean;
  mensaje?: string;
  estadisticas?: {
    totalPasos: number;
    totalCampos: number;
    camposCompletados: number;
    porcentajeExito: number;
    velocidadCamposPorSegundo?: number;
    tiempoPromedioPorPaso?: number;
  };
  titulo?: string;
  tituloProyecto?: string;
  codigoProyecto?: string;
  urlInicial?: string;
  fechaEjecucion?: string;
  tiempoTotal?: number;
  pasosCompletados?: Array<{
    numero: number;
    titulo: string;
    camposEncontrados: number;
    camposCompletados: number;
    tiempoTranscurrido: number;
    exito: boolean;
    detalles: Array<{
      etiqueta: string;
      tipo: string;
      valorAsignado: string;
      completado: boolean;
      esObligatorio: boolean;
      razonFallo?: string;
    }>;
  }>;
  errores?: Array<any>;
  urlFormularioEnviado?: string;
}

/**
 * Configurar el cliente de Azure OpenAI
 * Soporta múltiples versiones de API para compatibilidad
 */
export function configurarClienteAzure(): AzureOpenAI {
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;

  if (!apiKey || !endpoint || !deploymentName) {
    throw new Error(
      '❌ Faltan variables de entorno de Azure OpenAI.\n' +
      'Asegúrate de configurar en tu archivo .env:\n' +
      '  - AZURE_OPENAI_API_KEY\n' +
      '  - AZURE_OPENAI_ENDPOINT\n' +
      '  - AZURE_OPENAI_DEPLOYMENT_NAME'
    );
  }

  // Usar la versión más reciente por defecto, pero compatible con modelos antiguos
  // Esta versión soporta tanto max_tokens como max_completion_tokens dependiendo del modelo
  return new AzureOpenAI({
    apiKey,
    endpoint,
    apiVersion: '2024-08-01-preview',
  });
}

/**
 * Límites de tokens para control de costos
 * Estos límites protegen contra gastos inesperados
 * Nota: Para modelos con reasoning (como GPT-5-mini), se necesita un límite mayor
 * porque el modelo usa tokens de reasoning antes de generar el contenido real
 */
const LIMITES_TOKENS = {
  MAX_OUTPUT: 6000,      // Límite máximo de tokens de salida (informe generado)
  MAX_INPUT_CONTEXT: 8000, // Límite máximo de contexto de entrada (si es muy grande, se trunca)
  WARNING_INPUT: 5000,   // Mostrar advertencia si el input supera esto
} as const;

/**
 * Calcula un estimado aproximado de tokens en un texto
 * Aproximación: 1 token ≈ 4 caracteres (para español)
 */
function estimarTokens(texto: string): number {
  return Math.ceil(texto.length / 4);
}

/**
 * Crea una solicitud a Azure OpenAI con fallback automático para diferentes modelos
 * Incluye controles de costos y límites seguros
 */
export async function crearCompletacionConFallback(
  cliente: AzureOpenAI,
  deploymentName: string,
  messages: Array<{ role: 'system' | 'user'; content: string }>,
  temperature: number = 0.2
): Promise<any> {
  // Calcular tokens de entrada aproximados para control de costos
  const inputTokens = messages.reduce((sum, msg) => sum + estimarTokens(msg.content), 0);
  
  if (inputTokens > LIMITES_TOKENS.WARNING_INPUT) {
    const costoEstimado = ((inputTokens / 1_000_000) * 0.15 + (LIMITES_TOKENS.MAX_OUTPUT / 1_000_000) * 0.60).toFixed(4);
    console.log(`⚠️ Advertencia: Input grande (~${inputTokens} tokens estimados). Costo estimado: ~$${costoEstimado}`);
  }

  // Limitar el tamaño del prompt si es muy grande (protección adicional)
  let messagesOptimizados = messages;
  if (inputTokens > LIMITES_TOKENS.MAX_INPUT_CONTEXT) {
    console.log(`⚠️ Contexto muy grande (${inputTokens} tokens), optimizando...`);
    // Truncar el mensaje del usuario si es muy grande
    const userMessage = messages.find(m => m.role === 'user');
    if (userMessage && estimarTokens(userMessage.content) > LIMITES_TOKENS.MAX_INPUT_CONTEXT - 500) {
      const maxChars = (LIMITES_TOKENS.MAX_INPUT_CONTEXT - 500) * 4;
      userMessage.content = userMessage.content.substring(0, maxChars) + '\n\n[Contexto truncado por tamaño...]';
      messagesOptimizados = messages.map(m => 
        m.role === 'user' ? userMessage : m
      );
    }
  }

  // Primero intentar con las opciones base incluyendo temperature
  // Si falla por temperature, intentar sin ese parámetro
  const crearRequest = (usarTemperature: boolean = true, usarMaxCompletion: boolean = true, usarMaxTokens: boolean = false) => {
    const base: any = {
      model: deploymentName,
      messages: messagesOptimizados,
    };
    
    if (usarTemperature) {
      base.temperature = temperature;
    }
    
    if (usarMaxCompletion) {
      base.max_completion_tokens = LIMITES_TOKENS.MAX_OUTPUT;
    } else if (usarMaxTokens) {
      base.max_tokens = LIMITES_TOKENS.MAX_OUTPUT;
    }
    
    return base;
  };

  // Estrategia 1: Intentar con max_completion_tokens y temperature
  // (modelos nuevos: GPT-4o, GPT-4o-mini, GPT-4 Turbo nuevos, GPT-5-mini)
  try {
    const respuesta1 = await cliente.chat.completions.create(crearRequest(true, true, false) as any);
    const outputTokens = respuesta1.usage?.completion_tokens || 0;
    console.log(`✅ Usando max_completion_tokens con temperature (${outputTokens} tokens generados)`);
    return respuesta1;
  } catch (error1: any) {
    const errorMsg1 = error1.message || '';
    
    // Si el error es sobre temperature, intentar sin temperature
    if (errorMsg1.includes('temperature') || errorMsg1.includes('Unsupported value')) {
      console.log('⚠️ Modelo no soporta temperature personalizado, usando valor por defecto...');
      
      try {
        const respuesta1b = await cliente.chat.completions.create(crearRequest(false, true, false) as any);
        const outputTokens = respuesta1b.usage?.completion_tokens || 0;
        console.log(`✅ Usando max_completion_tokens sin temperature (${outputTokens} tokens generados)`);
        return respuesta1b;
      } catch (error1b: any) {
        const errorMsg1b = error1b.message || '';
        
        // Si el error menciona max_completion_tokens, probar con max_tokens
        if (errorMsg1b.includes('max_completion_tokens') || errorMsg1b.includes('Unsupported parameter')) {
          console.log('⚠️ Modelo no soporta max_completion_tokens, intentando con max_tokens...');
          
          try {
            // Estrategia 2: Intentar con max_tokens (sin temperature)
            const respuesta2 = await cliente.chat.completions.create(crearRequest(false, false, true) as any);
            const outputTokens = respuesta2.usage?.completion_tokens || 0;
            console.log(`✅ Usando max_tokens sin temperature (${outputTokens} tokens generados)`);
            return respuesta2;
          } catch (error2: any) {
            const errorMsg2 = error2.message || '';
            
            // Si también falla max_tokens, intentar sin límites ni temperature
            if (errorMsg2.includes('max_tokens') || errorMsg2.includes('Unsupported parameter')) {
              console.log('⚠️ Modelo no soporta límites explícitos, usando configuración mínima...');
              
              try {
                // Estrategia 3: Solo modelo y mensajes (sin temperature ni límites)
                const respuesta3 = await cliente.chat.completions.create(crearRequest(false, false, false) as any);
                const outputTokens = respuesta3.usage?.completion_tokens || 0;
                
                // Advertencia si el output es muy grande (posible costo alto)
                if (outputTokens > LIMITES_TOKENS.MAX_OUTPUT) {
                  console.log(`⚠️ Advertencia: Respuesta grande (${outputTokens} tokens). Considera reducir el tamaño del contexto.`);
                }
                
                console.log(`✅ Generación completada con configuración mínima (${outputTokens} tokens generados)`);
                return respuesta3;
              } catch (error3: any) {
                // Si todo falla, lanzar el error más descriptivo
                throw new Error(
                  `❌ Error al generar completación con Azure OpenAI:\n` +
                  `   - Intentó con temperature y max_completion_tokens: ${errorMsg1}\n` +
                  `   - Intentó sin temperature, con max_completion_tokens: ${errorMsg1b}\n` +
                  `   - Intentó con max_tokens: ${errorMsg2}\n` +
                  `   - Intentó configuración mínima: ${error3.message}\n` +
                  `   Verifica tu configuración de Azure OpenAI y el modelo desplegado.`
                );
              }
            } else {
              // Error diferente, lanzarlo
              throw error2;
            }
          }
        } else {
          // Error diferente, lanzarlo
          throw error1b;
        }
      }
    } else if (errorMsg1.includes('max_completion_tokens') || errorMsg1.includes('Unsupported parameter')) {
      // Si el error original era sobre max_completion_tokens (no temperature)
      console.log('⚠️ Modelo no soporta max_completion_tokens, intentando con max_tokens...');
      
      try {
        // Estrategia 2: Intentar con max_tokens (con temperature)
        const respuesta2 = await cliente.chat.completions.create(crearRequest(true, false, true) as any);
        const outputTokens = respuesta2.usage?.completion_tokens || 0;
        console.log(`✅ Usando max_tokens con temperature (${outputTokens} tokens generados)`);
        return respuesta2;
      } catch (error2: any) {
        const errorMsg2 = error2.message || '';
        
        // Si falla por temperature, intentar sin temperature
        if (errorMsg2.includes('temperature') || errorMsg2.includes('Unsupported value')) {
          try {
            const respuesta2b = await cliente.chat.completions.create(crearRequest(false, false, true) as any);
            const outputTokens = respuesta2b.usage?.completion_tokens || 0;
            console.log(`✅ Usando max_tokens sin temperature (${outputTokens} tokens generados)`);
            return respuesta2b;
          } catch (error2b: any) {
            // Continuar con estrategia 3
            const errorMsg2b = error2b.message || '';
            if (errorMsg2b.includes('max_tokens') || errorMsg2b.includes('Unsupported parameter')) {
              try {
                const respuesta3 = await cliente.chat.completions.create(crearRequest(false, false, false) as any);
                const outputTokens = respuesta3.usage?.completion_tokens || 0;
                console.log(`✅ Generación completada con configuración mínima (${outputTokens} tokens generados)`);
                return respuesta3;
              } catch (error3: any) {
                throw new Error(
                  `❌ Error al generar completación con Azure OpenAI:\n` +
                  `   - Intentó max_completion_tokens: ${errorMsg1}\n` +
                  `   - Intentó max_tokens con temperature: ${errorMsg2}\n` +
                  `   - Intentó max_tokens sin temperature: ${errorMsg2b}\n` +
                  `   - Intentó configuración mínima: ${error3.message}`
                );
              }
            } else {
              throw error2b;
            }
          }
        } else if (errorMsg2.includes('max_tokens') || errorMsg2.includes('Unsupported parameter')) {
          // Intentar sin límites pero con temperature
          try {
            const respuesta3 = await cliente.chat.completions.create(crearRequest(true, false, false) as any);
            const outputTokens = respuesta3.usage?.completion_tokens || 0;
            console.log(`✅ Generación completada sin límites, con temperature (${outputTokens} tokens generados)`);
            return respuesta3;
          } catch (error3: any) {
            // Último intento: configuración mínima
            try {
              const respuesta4 = await cliente.chat.completions.create(crearRequest(false, false, false) as any);
              const outputTokens = respuesta4.usage?.completion_tokens || 0;
              console.log(`✅ Generación completada con configuración mínima (${outputTokens} tokens generados)`);
              return respuesta4;
            } catch (error4: any) {
              throw new Error(
                `❌ Error al generar completación con Azure OpenAI después de todos los intentos:\n${error4.message}`
              );
            }
          }
        } else {
          throw error2;
        }
      }
    } else {
      // Error diferente (no relacionado con parámetros), lanzarlo
      throw error1;
    }
  }
}

/**
 * Extrae el contexto relevante del JSON de reporte para el prompt
 */
async function extraerContextoReporte(resultado: ResultadoAgente): Promise<string> {
  const ctx: string[] = [];

  // Información general
  if (resultado.titulo) ctx.push(`**Título**: ${resultado.titulo}`);
  if (resultado.tituloProyecto) ctx.push(`**Proyecto**: ${resultado.tituloProyecto}`);
  if (resultado.codigoProyecto) ctx.push(`**Código**: ${resultado.codigoProyecto}`);
  if (resultado.fechaEjecucion) {
    const fecha = new Date(resultado.fechaEjecucion).toLocaleString('es-CL');
    ctx.push(`**Fecha de Ejecución**: ${fecha}`);
  }

  // URL del formulario enviado (si existe)
  if (resultado.urlFormularioEnviado) {
    ctx.push(`**URL del Formulario Enviado**: ${resultado.urlFormularioEnviado}`);
  }

  // Calcular cantidad de campos obligatorios
  let totalCamposObligatorios = 0;
  if (resultado.pasosCompletados) {
    resultado.pasosCompletados.forEach((paso) => {
      paso.detalles.forEach((campo) => {
        if (campo.esObligatorio) {
          totalCamposObligatorios++;
        }
      });
    });
  }

  // Estadísticas clave
  if (resultado.estadisticas) {
    const est = resultado.estadisticas;
    ctx.push('\n**Estadísticas Generales**:');
    ctx.push(`- Total de pasos: ${est.totalPasos}`);
    ctx.push(`- Total de campos: ${est.totalCampos}`);
    ctx.push(`- Campos obligatorios: ${totalCamposObligatorios}`);
    ctx.push(`- Campos completados: ${est.camposCompletados}`);
    ctx.push(`- Porcentaje de éxito: ${est.porcentajeExito}%`);
    if (est.tiempoPromedioPorPaso) {
      ctx.push(`- Tiempo promedio por paso: ${est.tiempoPromedioPorPaso} segundos`);
    }
    if (resultado.tiempoTotal) {
      ctx.push(`- Tiempo total de ejecución: ${resultado.tiempoTotal} segundos`);
    }
  }

  // Resumen de pasos
  if (resultado.pasosCompletados && resultado.pasosCompletados.length > 0) {
    ctx.push('\n**Resumen por Pasos**:');
    resultado.pasosCompletados.forEach((paso) => {
      const statusIcon = paso.exito ? '✅' : '❌';
      ctx.push(
        `${statusIcon} Paso ${paso.numero}: ${paso.titulo} - ` +
        `${paso.camposCompletados}/${paso.camposEncontrados} campos (${paso.tiempoTranscurrido}s)`
      );
    });
  }

  // Campos no completados (errores)
  const camposNoCompletados: Array<{
    paso: string;
    etiqueta: string;
    tipo: string;
    razon: string;
    esObligatorio: boolean;
  }> = [];

  resultado.pasosCompletados?.forEach((paso) => {
    paso.detalles.forEach((campo) => {
      if (!campo.completado) {
        camposNoCompletados.push({
          paso: `${paso.numero}. ${paso.titulo}`,
          etiqueta: campo.etiqueta,
          tipo: campo.tipo,
          razon: campo.razonFallo || 'No especificado',
          esObligatorio: campo.esObligatorio,
        });
      }
    });
  });

  if (camposNoCompletados.length > 0) {
    ctx.push('\n**Campos No Completados**:');
    camposNoCompletados.forEach((campo) => {
      const obligatorio = campo.esObligatorio ? '[OBLIGATORIO]' : '[OPCIONAL]';
      ctx.push(
        `- ${obligatorio} ${campo.etiqueta} (${campo.tipo}) en "${campo.paso}": ${campo.razon}`
      );
    });
  }

  // Errores generales
  if (resultado.errores && resultado.errores.length > 0) {
    ctx.push('\n**Errores Generales**:');
    resultado.errores.forEach((error, idx) => {
      ctx.push(`${idx + 1}. ${JSON.stringify(error)}`);
    });
  }

  // Comparación con campos fundamentales
  try {
    const comparacion = await compararCamposFundamentales(resultado);
    const estadisticasCamposFundamentales = generarEstadisticasComparacion(comparacion);
    ctx.push('\n' + estadisticasCamposFundamentales);
  } catch (error: any) {
    console.warn(`⚠️ No se pudo realizar comparación de campos fundamentales: ${error.message}`);
    // Continuar sin la comparación si falla
  }

  return ctx.join('\n');
}

/**
 * Genera el prompt para la IA
 */
function generarPrompt(contexto: string): string {
  return `Eres un asistente especializado en análisis de procesos de automatización de formularios.

A continuación te proporciono el resultado de una ejecución automatizada de un formulario CORFO.
Tu tarea es generar un **Informe de Resumen Ejecutivo** completo y profesional en formato **Markdown**.

El informe debe incluir las siguientes secciones:

## 1. RESUMEN EJECUTIVO
- Breve introducción sobre el proceso ejecutado
- Resultado general (éxito/fallo)
- Métricas clave destacadas (porcentaje de éxito, tiempo total, campos completados)

## 2. ESTADÍSTICAS CLAVE
- Tabla con las estadísticas principales (total de pasos, campos, campos obligatorios, éxito, tiempos)
- Incluir la URL del formulario enviado si está disponible

## 3. ANÁLISIS POR PASOS
- Para cada paso del formulario:
  - Título y número del paso
  - Resultados (campos completados vs encontrados)
  - Tiempo de ejecución
  - Estado (exitoso/con problemas)
  - Si hubo campos no completados, mencionarlos brevemente

## 4. CAMPOS PROBLEMÁTICOS
- Lista detallada de campos que NO se pudieron completar
- Indicar si son obligatorios u opcionales
- Razón del fallo
- Recomendaciones específicas para cada uno

## 5. ANÁLISIS DE CAMPOS FUNDAMENTALES
- Estadísticas generales de cobertura de campos fundamentales CORFO
- Porcentaje de campos fundamentales encontrados vs faltantes
- Desglose por categoría (Persona Jurídica, Representante Legal, Director Proyecto, etc.)
- Lista de campos fundamentales encontrados (indicar si fueron completados exitosamente)
- Lista de campos fundamentales faltantes (identificar qué campos requeridos no están presentes)
- Evaluación de completitud del formulario según estándares CORFO
- Recomendaciones sobre campos fundamentales que deben agregarse

## 6. CONCLUSIONES Y RECOMENDACIONES
- Evaluación general del proceso
- Identificación de patrones en los fallos (si existen)
- Recomendaciones técnicas para mejorar la tasa de éxito
- Análisis de la cobertura de campos fundamentales
- Próximos pasos sugeridos

---

**DATOS DEL REPORTE:**

${contexto}

---

**INSTRUCCIONES ADICIONALES:**
- Usa formato Markdown profesional con encabezados, listas, tablas y énfasis donde sea apropiado
- Sé conciso pero completo
- Usa lenguaje técnico pero comprensible
- Si no hubo errores, destaca el éxito del proceso
- Si hubo errores, sé constructivo en las recomendaciones
- Incluye emojis sutiles para mejorar la legibilidad (✅, ❌, ⚠️, 📊, 🔍, 💡)

Genera el informe ahora:`;
}

/**
 * Función principal: Genera un informe PDF desde un archivo JSON de reporte
 * 
 * @param rutaJsonReporte - Ruta al archivo JSON del reporte (report_X.json o exec_X.json)
 * @param rutaPdfSalida - Ruta donde se guardará el PDF generado
 */
export async function generarInformePDF(
  rutaJsonReporte: string,
  rutaPdfSalida: string
): Promise<void> {
  console.log('\n📄 Iniciando generación de informe PDF...');
  console.log(`   Origen: ${path.basename(rutaJsonReporte)}`);
  console.log(`   Destino: ${path.basename(rutaPdfSalida)}`);

  try {
    // 1. Leer y parsear el JSON
    console.log('📖 Leyendo archivo JSON...');
    const contenidoJson = await fs.readFile(rutaJsonReporte, 'utf-8');
    const resultado: ResultadoAgente = JSON.parse(contenidoJson);

    // 2. Extraer contexto relevante
    console.log('🔍 Extrayendo contexto del reporte...');
    const contexto = await extraerContextoReporte(resultado);

    // 3. Configurar cliente Azure OpenAI
    console.log('🔧 Configurando Azure OpenAI...');
    const cliente = configurarClienteAzure();
    const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME!;

    // 4. Generar prompt y solicitar informe a la IA usando fallback automático
    console.log('🤖 Generando informe con IA...');
    const prompt = generarPrompt(contexto);

    const respuesta = await crearCompletacionConFallback(
      cliente,
      deploymentName,
      [
        {
          role: 'system',
          content: 'Eres un analista experto en procesos de automatización y generación de reportes ejecutivos.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      0.2
    );

    const informeMarkdown = respuesta.choices[0]?.message?.content;

    if (!informeMarkdown) {
      console.error('❌ Respuesta de la IA:', JSON.stringify(respuesta, null, 2));
      console.error('❌ Choices disponibles:', respuesta.choices?.length || 0);
      if (respuesta.choices && respuesta.choices.length > 0) {
        console.error('❌ Primer choice:', JSON.stringify(respuesta.choices[0], null, 2));
      }
      throw new Error('La IA no generó contenido para el informe. Ver logs anteriores para detalles.');
    }

    console.log('✅ Informe generado por IA (longitud:', informeMarkdown.length, 'caracteres)');

    // 5. Asegurar que la carpeta de destino existe
    const directorioSalida = path.dirname(rutaPdfSalida);
    await fs.mkdir(directorioSalida, { recursive: true });

    // 6. Convertir Markdown a PDF
    console.log('📑 Convirtiendo Markdown a PDF...');
    
    const pdf = await mdToPdf(
      { content: informeMarkdown },
      {
        dest: rutaPdfSalida,
        pdf_options: {
          format: 'A4',
          margin: {
            top: '20mm',
            right: '20mm',
            bottom: '20mm',
            left: '20mm',
          },
          printBackground: true,
        },
      }
    );

    if (pdf && pdf.filename) {
      console.log('✅ PDF generado exitosamente:', path.basename(rutaPdfSalida));
      console.log('📊 Informe completo guardado\n');
    } else {
      throw new Error('No se pudo generar el archivo PDF');
    }
  } catch (error: any) {
    console.error('❌ Error generando informe PDF:', error.message);
    throw error;
  }
}

/**
 * Script CLI para uso directo desde terminal
 * Uso: npx ts-node ai/generadorInforme.ts <ruta-json> <ruta-pdf-salida>
 */
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('❌ Uso: npx ts-node ai/generadorInforme.ts <ruta-json> <ruta-pdf-salida>');
    console.error('   Ejemplo: npx ts-node ai/generadorInforme.ts data/debugg_results/report_6.json data/informes/report_6.pdf');
    process.exit(1);
  }

  const [rutaJson, rutaPdf] = args;

  generarInformePDF(rutaJson, rutaPdf)
    .then(() => {
      console.log('✅ Proceso completado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error:', error.message);
      process.exit(1);
    });
}

