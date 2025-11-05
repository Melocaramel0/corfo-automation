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
 * Formatea fecha en formato español: "dd-mm-yyyy, hh:mm:ss a. m."
 */
function formatearFechaEspanol(fecha: string): string {
  const date = new Date(fecha);
  const dia = String(date.getDate()).padStart(2, '0');
  const mes = String(date.getMonth() + 1).padStart(2, '0');
  const anio = date.getFullYear();
  
  let horas = date.getHours();
  const minutos = String(date.getMinutes()).padStart(2, '0');
  const segundos = String(date.getSeconds()).padStart(2, '0');
  const periodo = horas >= 12 ? 'p. m.' : 'a. m.';
  
  if (horas > 12) horas -= 12;
  if (horas === 0) horas = 12;
  
  const horasFormateadas = String(horas).padStart(2, '0');
  
  return `${dia}-${mes}-${anio}, ${horasFormateadas}:${minutos}:${segundos} ${periodo}`;
}

/**
 * Extrae el código sin el prefijo "Código Proyecto:"
 */
function extraerCodigo(codigoProyecto?: string): string {
  if (!codigoProyecto) return '';
  // Remover prefijo "Código Proyecto: " si existe
  return codigoProyecto.replace(/^Código Proyecto:\s*/i, '').trim();
}

/**
 * Formatea el nombre del campo fundamental para mostrarlo de forma legible
 * Basado en el formato de la imagen: "RUT DIRECTOR/ENCARGADO DEL PROYECTO"
 */
function formatearNombreCampo(nombre: string, categoria: string, descripcion?: string): string {
  // Si la descripción contiene información útil, construir nombre desde ella
  if (descripcion) {
    let nombreFormateado = descripcion.toUpperCase();
    
    // Reemplazos específicos para coincidir con el formato de la imagen
    nombreFormateado = nombreFormateado
      .replace(/DIRECTOR\/ENCARGADO DEL PROYECTO/g, 'DIRECTOR/ENCARGADO DEL PROYECTO')
      .replace(/RUT DEL/g, 'RUT')
      .replace(/NOMBRE\(S\) DEL/g, 'NOMBRE(S)')
      .replace(/PRIMER APELLIDO DEL/g, 'PRIMER APELLIDO')
      .replace(/SEGUNDO APELLIDO DEL/g, 'SEGUNDO APELLIDO')
      .replace(/GÉNERO DEL/g, 'GÉNERO')
      .replace(/CORREO ELECTRÓNICO DEL/g, 'CORREO ELECTRÓNICO')
      .replace(/NÚMERO TELÉFONO DEL/g, 'NÚMERO TELÉFONO')
      .replace(/DIRECCIÓN -/g, 'DIRECCIÓN –')
      .replace(/CÓDIGO POSTAL/g, 'CÓDIGO POSTAL');
    
    // Agregar contexto de categoría si es relevante (como en la imagen)
    if (categoria === 'personaJuridica') {
      nombreFormateado += ' (Persona Juridica)';
    }
    
    return nombreFormateado;
  }
  
  // Si no hay descripción, usar el nombre del campo
  let nombreFormateado = nombre
    .replace(/_/g, ' ')
    .split(' ')
    .map(palabra => palabra.toUpperCase())
    .join(' ');
  
  // Reemplazar palabras comunes con formato mejorado
  nombreFormateado = nombreFormateado
    .replace(/DIRECTOR PROYECTO/g, 'DIRECTOR/ENCARGADO DEL PROYECTO')
    .replace(/RUT /g, 'RUT ')
    .replace(/NOMBRE /g, 'NOMBRE(S) ')
    .replace(/PRIMER APELLIDO /g, 'PRIMER APELLIDO ')
    .replace(/SEGUNDO APELLIDO /g, 'SEGUNDO APELLIDO ')
    .replace(/GENERO /g, 'GÉNERO ')
    .replace(/CORREO /g, 'CORREO ELECTRÓNICO ')
    .replace(/TELEFONO /g, 'NÚMERO TELÉFONO ')
    .replace(/DIRECCION /g, 'DIRECCIÓN ')
    .replace(/CODIGO POSTAL/g, 'CÓDIGO POSTAL');
  
  // Agregar contexto de categoría si es relevante
  if (categoria === 'personaJuridica') {
    nombreFormateado += ' (Persona Juridica)';
  }
  
  return nombreFormateado;
}

/**
 * Genera tabla de campos fundamentales en formato: Número | Campo | SI/NO
 */
async function generarTablaCamposFundamentales(resultado: ResultadoAgente): Promise<string> {
  try {
    const comparacion = await compararCamposFundamentales(resultado);
    const lineas: string[] = [];
    
    // Crear mapa de campos encontrados para búsqueda rápida
    const camposEncontradosMap = new Map<string, boolean>();
    comparacion.camposEncontrados.forEach(campo => {
      camposEncontradosMap.set(campo.nombre, campo.completado);
    });
    
    // Cargar campos fundamentales para obtener números de referencia
    const camposFundamentalesPath = path.join(__dirname, '../campos_fundamentales.json');
    const contenido = await fs.readFile(camposFundamentalesPath, 'utf-8');
    const camposFundamentales: any = JSON.parse(contenido);
    
    // Recorrer todos los campos fundamentales y crear tabla
    lineas.push('| Número | Campo Fundamental | SI/NO |');
    lineas.push('|--------|-------------------|-------|');
    
    Object.entries(camposFundamentales.categorias).forEach(([categoria, cat]: [string, any]) => {
      if (!cat.activo) return;
      
      Object.entries(cat.campos).forEach(([nombre, campo]: [string, any]) => {
        if (!campo.activo || !campo.esFundamental) return;
        
        const numeroRef = campo.numeroReferencia || '';
        const nombreCampo = formatearNombreCampo(nombre, categoria, campo.descripcion);
        const encontrado = camposEncontradosMap.has(nombre);
        const completado = encontrado ? camposEncontradosMap.get(nombre) : false;
        const estado = encontrado && completado ? 'SI' : 'NO';
        
        lineas.push(`| ${numeroRef} | ${nombreCampo} | ${estado} |`);
      });
    });
    
    return lineas.join('\n');
  } catch (error: any) {
    console.warn(`⚠️ No se pudo generar tabla de campos fundamentales: ${error.message}`);
    return 'No se pudo generar la tabla de campos fundamentales.';
  }
}

/**
 * Normaliza texto para comparación (minúsculas, sin espacios extra)
 */
function normalizarTexto(texto: string): string {
  return texto.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Extrae el nombre del campo eliminando redundancias del paso y prefijos comunes
 */
function extraerNombreCampo(etiqueta: string, tituloPaso: string): string {
  let nombreCampo = etiqueta.trim();
  const pasoNormalizado = normalizarTexto(tituloPaso);
  const etiquetaNormalizada = normalizarTexto(etiqueta);
  
  // Eliminar el nombre del paso del inicio de la etiqueta
  if (etiquetaNormalizada.startsWith(pasoNormalizado)) {
    // Buscar el índice exacto en el texto original (case-insensitive)
    const indice = nombreCampo.toLowerCase().indexOf(pasoNormalizado.toLowerCase());
    if (indice === 0) {
      // Eliminar el paso y espacios siguientes
      const resto = nombreCampo.substring(tituloPaso.length).trim();
      nombreCampo = resto;
    }
  }
  
  // Prefijos comunes a eliminar (ordenados de mayor a menor longitud)
  // Estos prefijos aparecen frecuentemente en las etiquetas pero no son parte del nombre real del campo
  const prefijosComunes = [
    'Datos Gestion Genero Empresa Mujer',
    'Datos Gestion Genero Empresa Hombre',
    'Datos Gestion Genero Empresa',
    'Datos Gestion',
    'Persona Juridica Representante Legal',
    'Persona Jurídica Representante Legal',
    'Persona Juridica Direccion',
    'Persona Jurídica Dirección',
    'Persona Juridica Contacto',
    'Persona Juridica Adjuntos',
    'Persona Juridica',
    'Persona Jurídica',
    'Persona Natural',
    'Representante Legal',
    'Tipo Entidad Participante',
    'Tipo Identificador',
    'Tipo Persona',
    'Direccion',
    'Dirección',
    'Contacto',
    'Adjuntos',
    'Archivo',
  ];
  
  // Eliminar prefijos comunes de manera iterativa
  let cambioRealizado = true;
  let iteraciones = 0;
  const maxIteraciones = 10; // Prevenir loops infinitos
  
  while (cambioRealizado && iteraciones < maxIteraciones) {
    iteraciones++;
    cambioRealizado = false;
    const nombreNormalizado = normalizarTexto(nombreCampo);
    
    for (const prefijo of prefijosComunes) {
      const prefijoNormalizado = normalizarTexto(prefijo);
      
      // Si el nombre del campo comienza con el prefijo, eliminarlo
      if (nombreNormalizado.startsWith(prefijoNormalizado)) {
        // Buscar el índice en el texto original (case-insensitive)
        const indiceOriginal = nombreCampo.toLowerCase().indexOf(prefijoNormalizado.toLowerCase());
        if (indiceOriginal === 0) {
          // Eliminar el prefijo y espacios siguientes
          nombreCampo = nombreCampo.substring(prefijo.length).trim();
          cambioRealizado = true;
          break; // Reiniciar el bucle con el nuevo nombre
        } else if (indiceOriginal > 0 && nombreCampo[indiceOriginal - 1] === ' ') {
          // El prefijo está después de un espacio, eliminarlo también
          nombreCampo = (nombreCampo.substring(0, indiceOriginal - 1) + nombreCampo.substring(indiceOriginal + prefijo.length)).trim();
          cambioRealizado = true;
          break; // Reiniciar el bucle con el nuevo nombre
        }
      }
    }
  }
  
  // Si después de eliminar todo el nombre está vacío, usar la etiqueta original
  if (!nombreCampo || nombreCampo.length === 0) {
    return etiqueta;
  }
  
  return nombreCampo;
}

/**
 * Retorna el nombre del paso como ruta de sección
 * No tenemos información de subsecciones almacenada, solo el nombre del paso
 */
function construirRutaSeccion(etiqueta: string, tituloPaso: string): string {
  // Retornar solo el nombre del paso, ya que no tenemos información de subsecciones
  return tituloPaso;
}

/**
 * Genera lista de campos obligatorios
 */
function generarListaCamposObligatorios(resultado: ResultadoAgente): string {
  const camposObligatorios: Array<{ nombreCampo: string; rutaSeccion: string }> = [];
  
  if (resultado.pasosCompletados) {
    resultado.pasosCompletados.forEach((paso) => {
      paso.detalles.forEach((campo) => {
        if (campo.esObligatorio) {
          const nombreCampo = extraerNombreCampo(campo.etiqueta, paso.titulo);
          const rutaSeccion = construirRutaSeccion(campo.etiqueta, paso.titulo);
          camposObligatorios.push({
            nombreCampo,
            rutaSeccion,
          });
        }
      });
    });
  }
  
  if (camposObligatorios.length === 0) {
    return 'No hay campos obligatorios registrados.';
  }
  
  const lineas: string[] = [];
  camposObligatorios.forEach((campo, index) => {
    lineas.push(`${index + 1}. Campo: '${campo.nombreCampo}' en Sección: '${campo.rutaSeccion}'`);
  });
  
  return lineas.join('\n');
}

/**
 * Genera lista de campos no obligatorios
 */
function generarListaCamposNoObligatorios(resultado: ResultadoAgente): string {
  const camposNoObligatorios: Array<{ nombreCampo: string; rutaSeccion: string }> = [];
  
  if (resultado.pasosCompletados) {
    resultado.pasosCompletados.forEach((paso) => {
      paso.detalles.forEach((campo) => {
        if (!campo.esObligatorio) {
          const nombreCampo = extraerNombreCampo(campo.etiqueta, paso.titulo);
          const rutaSeccion = construirRutaSeccion(campo.etiqueta, paso.titulo);
          camposNoObligatorios.push({
            nombreCampo,
            rutaSeccion,
          });
        }
      });
    });
  }
  
  if (camposNoObligatorios.length === 0) {
    return 'No hay campos no obligatorios registrados.';
  }
  
  const lineas: string[] = [];
  camposNoObligatorios.forEach((campo, index) => {
    lineas.push(`${index + 1}. Campo: '${campo.nombreCampo}' en Sección: '${campo.rutaSeccion}'`);
  });
  
  return lineas.join('\n');
}

/**
 * Extrae el contexto relevante del JSON de reporte para el prompt
 */
async function extraerContextoReporte(resultado: ResultadoAgente): Promise<string> {
  const ctx: string[] = [];

  // PARTE 1: Información del Proyecto
  ctx.push('**PARTE 1 - INFORMACIÓN DEL PROYECTO:**');
  if (resultado.titulo) ctx.push(`**Formulario:** ${resultado.titulo}`);
  if (resultado.tituloProyecto) ctx.push(`**Proyecto:** ${resultado.tituloProyecto}`);
  if (resultado.codigoProyecto) {
    const codigo = extraerCodigo(resultado.codigoProyecto);
    ctx.push(`**Código:** ${codigo}`);
  }
  if (resultado.fechaEjecucion) {
    const fecha = formatearFechaEspanol(resultado.fechaEjecucion);
    ctx.push(`**Fecha ejecución:** ${fecha}`);
  }
  if (resultado.urlFormularioEnviado) {
    ctx.push(`**URL envío:** ${resultado.urlFormularioEnviado}`);
  } else {
    ctx.push(`**URL envío:** Envío no disponible`);
  }

  // PARTE 2: Estadísticas clave (Análisis General)
  ctx.push('\n**PARTE 2 - ANÁLISIS GENERAL (Estadísticas Clave):**');
  if (resultado.estadisticas) {
    const est = resultado.estadisticas;
    
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

  // PARTE 3: Campos Fundamentales
  ctx.push('\n**PARTE 3 - CAMPOS FUNDAMENTALES:**');
  const tablaCamposFundamentales = await generarTablaCamposFundamentales(resultado);
  ctx.push(tablaCamposFundamentales);

  // PARTE 4: Campos No Obligatorios
  ctx.push('\n**PARTE 4 - CAMPOS NO OBLIGATORIOS:**');
  const listaCamposNoObligatorios = generarListaCamposNoObligatorios(resultado);
  ctx.push(listaCamposNoObligatorios);

  return ctx.join('\n');
}

/**
 * Genera el prompt para la IA
 */
function generarPrompt(contexto: string): string {
  return `Eres un asistente especializado en análisis de procesos de automatización de formularios.

A continuación te proporciono el resultado de una ejecución automatizada de un formulario CORFO.
Tu tarea es generar un **Informe de Resumen Ejecutivo** completo y profesional en formato **Markdown**.

El informe debe incluir EXACTAMENTE las siguientes secciones en este orden, con líneas de separación entre ellas:

# Informe de Resumen Ejecutivo — Automatización Formulario CORFO

---

## 1. INFORMACIÓN DEL PROYECTO

Usa EXACTAMENTE el formato siguiente con los datos proporcionados en la PARTE 1:

**Formulario:** [valor del formulario]
**Proyecto:** [valor del proyecto]
**Código:** [código sin prefijo "Código Proyecto:"]
**Fecha ejecución:** [fecha en formato dd-mm-yyyy, hh:mm:ss a. m.]
**URL envío:** [URL como hipervínculo en markdown, o "Envío no disponible" si no hay URL]

---

## 2. ANÁLISIS GENERAL (Estadísticas Clave)

Presenta una tabla con las estadísticas proporcionadas en la PARTE 2. Usa formato de tabla Markdown con dos columnas: "Métrica" y "Valor".

| Métrica | Valor |
|---------|-------|
| Total de pasos | [valor] |
| Total de campos | [valor] |
| Campos obligatorios | [valor] |
| Campos completados | [valor] |
| Porcentaje de éxito | [valor]% |
| Tiempo promedio por paso | [valor] segundos |
| Tiempo total de ejecución | [valor] segundos |

---

## 3. CAMPOS FUNDAMENTALES

Usa EXACTAMENTE la tabla proporcionada en la PARTE 3. La tabla ya está formateada con:
- Columna "Número": número de referencia del campo
- Columna "Campo Fundamental": nombre del campo
- Columna "SI/NO": indica si el campo fue encontrado y completado (SI) o no (NO)

NO modifiques la tabla, solo inclúyela tal cual se proporciona.

---

## 4. CAMPOS NO OBLIGATORIOS

Lista los campos no obligatorios proporcionados en la PARTE 4. **COPIA EXACTAMENTE** el formato que se te proporciona, sin modificar nada:
1. Campo: 'Nombre del Campo' en Sección: 'Nombre del Paso'
2. Campo: 'Otro Campo' en Sección: 'Otro Paso'
...

**IMPORTANTE:** NO modifiques los nombres de los campos ni los nombres de los pasos. Copia exactamente lo que aparece en la PARTE 4.

---

**DATOS DEL REPORTE:**

${contexto}

---

**INSTRUCCIONES CRÍTICAS:**
- El título principal del documento DEBE ser: "Informe de Resumen Ejecutivo — Automatización Formulario CORFO"
- DEBE incluir líneas de separación (---) entre cada sección principal
- La Parte 1 DEBE usar el formato exacto con **Label:** Valor (cada línea)
- La Parte 2 DEBE usar formato de tabla con columnas "Métrica" y "Valor"
- La Parte 3 DEBE incluir la tabla tal cual, sin modificaciones
- La Parte 4 DEBE usar el formato numerado con "Campo: 'X' en Sección: 'Y'"
- La Parte 4 DEBE copiar EXACTAMENTE los campos y nombres de pasos proporcionados en la PARTE 4, sin modificar nada
- NO agregues secciones adicionales
- NO agregues análisis adicionales como "RESUMEN EJECUTIVO"
- Sé conciso y directo
- Usa formato Markdown profesional con encabezados y énfasis donde sea apropiado

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

