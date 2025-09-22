import { chromium, Browser, Page } from 'playwright';
import { CAMPOS_CORFO_MAPPING, CampoFormulario } from '../scraping/extraerFormularios';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

// Verificar credenciales
if (!process.env.CORFO_USER || !process.env.CORFO_PASS) {
    throw new Error('Las credenciales CORFO_USER y CORFO_PASS deben estar definidas en el archivo .env');
}

/**
 * Configuración para el MVP simplificado
 */
interface ConfiguracionMVP {
    autocompletar: boolean;
    soloObligatorios: boolean;
    velocidad: 'normal' | 'rapida' | 'maxima';
    mostrarProgreso: boolean;
}

/**
 * Resultado del MVP simplificado
 */
interface ResultadoMVP {
    exito: boolean;
    mensaje: string;
    tiempoEjecucion: number;
    pasosProcesados: number;
    totalCampos: number;
    camposAutocompletados: number;
    porcentajeCompletado: number;
    errores: string[];
    pasos: any[];
}

/**
 * MVP HÍBRIDO SIMPLIFICADO
 * Objetivo: Navegar al formulario real y extraer/autocompletar campos
 */
export async function ejecutarMVPSimplificado(configuracion: ConfiguracionMVP = {
    autocompletar: true,
    soloObligatorios: false,
    velocidad: 'normal',
    mostrarProgreso: true
}): Promise<ResultadoMVP> {
    
    console.log('🚀 INICIANDO MVP HÍBRIDO SIMPLIFICADO');
    console.log('====================================');
    console.log('🎯 Objetivo: Navegar al formulario real y procesar campos');
    console.log('⚡ Estrategia: Extracción + Autocompletado simultáneo');
    console.log('🛡️ Seguridad: NO envía formulario (solo testing)');
    console.log('');

    const inicioTiempo = Date.now();
    let browser: Browser | null = null;
    
    const resultado: ResultadoMVP = {
        exito: false,
        mensaje: '',
        tiempoEjecucion: 0,
        pasosProcesados: 0,
        totalCampos: 0,
        camposAutocompletados: 0,
        porcentajeCompletado: 0,
        errores: [],
        pasos: []
    };

    try {
        // PASO 1: Inicializar navegador
        console.log('🔧 Inicializando navegador...');
        browser = await chromium.launch({
            headless: false,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        page.setDefaultTimeout(30000);

        // PASO 2: Realizar login
        console.log('🔐 Realizando login...');
        await realizarLogin(page);
        console.log('✅ Login exitoso');

        // PASO 3: Navegar al formulario real
        console.log('📋 Navegando al formulario de postulación...');
        const formularioAccedido = await navegarAlFormularioReal(page);
        
        if (!formularioAccedido) {
            throw new Error('No se pudo acceder al formulario de postulación');
        }
        console.log('✅ Formulario accedido exitosamente');

        // PASO 4: Procesar pasos del formulario
        console.log('🔄 Procesando pasos del formulario...');
        
        let pasoActual = 1;
        let hayMasPasos = true;
        const limitePasos = 15;

        while (hayMasPasos && pasoActual <= limitePasos) {
            if (configuracion.mostrarProgreso) {
                console.log(`\n📋 Procesando Paso ${pasoActual}...`);
            }
            
            // Obtener información del paso
            const nombrePaso = await obtenerNombrePaso(page);
            if (configuracion.mostrarProgreso) {
                console.log(`   📝 Nombre: "${nombrePaso}"`);
            }

            // Hacer scroll para cargar contenido
            await scrollCompletoPagina(page);

            // Extraer campos del paso
            const camposPaso = await extraerCamposPaso(page);
            if (configuracion.mostrarProgreso) {
                console.log(`   🔍 Campos encontrados: ${camposPaso.length}`);
            }

            resultado.totalCampos += camposPaso.length;

            // Autocompletar campos si está habilitado
            let camposCompletados = 0;
            if (configuracion.autocompletar && camposPaso.length > 0) {
                if (configuracion.mostrarProgreso) {
                    console.log(`   ✏️ Autocompletando campos...`);
                }
                camposCompletados = await autocompletarCampos(page, camposPaso, configuracion);
                resultado.camposAutocompletados += camposCompletados;
                if (configuracion.mostrarProgreso) {
                    console.log(`   ✅ Campos autocompletados: ${camposCompletados}`);
                }
            }

            // Guardar información del paso
            resultado.pasos.push({
                numero: pasoActual,
                nombre: nombrePaso,
                url: page.url(),
                camposEncontrados: camposPaso.length,
                camposAutocompletados: camposCompletados
            });

            // Intentar navegar al siguiente paso
            if (pasoActual < limitePasos) {
                if (configuracion.mostrarProgreso) {
                    console.log(`   ➡️ Navegando al siguiente paso...`);
                }
                hayMasPasos = await navegarAlSiguientePaso(page);
                
                if (hayMasPasos) {
                    pasoActual++;
                    await page.waitForTimeout(2000);
                    if (configuracion.mostrarProgreso) {
                        console.log(`   ✅ Navegación exitosa al paso ${pasoActual}`);
                    }
                } else {
                    if (configuracion.mostrarProgreso) {
                        console.log(`   ℹ️ No hay más pasos o llegamos al final`);
                    }
                }
            } else {
                if (configuracion.mostrarProgreso) {
                    console.log(`   ℹ️ Límite de pasos alcanzado (${limitePasos})`);
                }
                hayMasPasos = false;
            }
        }

        resultado.pasosProcesados = pasoActual - 1;
        resultado.porcentajeCompletado = resultado.totalCampos > 0 ? 
            Math.round((resultado.camposAutocompletados / resultado.totalCampos) * 100) : 0;

        // Calcular tiempo total
        const tiempoTotal = (Date.now() - inicioTiempo) / 1000 / 60;
        resultado.tiempoEjecucion = tiempoTotal;
        resultado.exito = true;
        resultado.mensaje = `MVP completado exitosamente en ${tiempoTotal.toFixed(1)} minutos`;

        console.log('\n✅ MVP HÍBRIDO COMPLETADO');
        console.log(`📊 Resumen:`);
        console.log(`   • Pasos procesados: ${resultado.pasosProcesados}`);
        console.log(`   • Total campos: ${resultado.totalCampos}`);
        console.log(`   • Campos autocompletados: ${resultado.camposAutocompletados}`);
        console.log(`   • Porcentaje completado: ${resultado.porcentajeCompletado}%`);
        console.log(`   • Tiempo total: ${resultado.tiempoEjecucion.toFixed(1)} minutos`);

        return resultado;

    } catch (error) {
        const tiempoTotal = (Date.now() - inicioTiempo) / 1000 / 60;
        resultado.tiempoEjecucion = tiempoTotal;
        resultado.mensaje = `Error: ${(error as Error).message}`;
        resultado.errores.push((error as Error).message);
        
        console.error('❌ Error en MVP:', (error as Error).message);
        return resultado;
        
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

/**
 * Realiza el login a CORFO
 */
async function realizarLogin(page: Page): Promise<void> {
    await page.goto('https://www.corfo.cl/sites/cpp/homecorfo#', {
        waitUntil: 'networkidle',
        timeout: 30000
    });

    // Cerrar aviso inicial si existe
    try {
        const avisoBtn = await page.waitForSelector('button:has-text("Cerrar mensaje e ingresar al sitio de CORFO")', {
            timeout: 7000,
            state: 'visible'
        });
        if (avisoBtn) {
            await avisoBtn.click();
            await page.waitForTimeout(1000);
        }
    } catch (error) {
        // No hay aviso inicial
    }

    // Primera estrategia: Buscar el link "¿Tienes clave Corfo? Inicia sesión aquí"
    let loginButton = null;
    
    try {
        // Intentar encontrar el enlace específico para clave Corfo por ID
        loginButton = await page.waitForSelector('#mostrarCorfoLoginLink', { 
            timeout: 8000,
            state: 'visible'
        });
        
        if (loginButton) {
            console.log('Encontrado enlace "¿Tienes clave Corfo? Inicia sesión aquí"');
            
            // Hacer click en el enlace de clave Corfo (ejecuta JavaScript, no navega)
            await loginButton.click();
            
            // Esperar a que aparezca el formulario de login (el div se hace visible)
            console.log('Esperando a que aparezca el formulario de Clave Corfo...');
            await page.waitForSelector('#bloqueCorfoLogin', { 
                state: 'visible',
                timeout: 10000
            });
            
            console.log('Formulario de Clave Corfo ahora visible, procediendo con login...');
            
            // Llenar los campos directamente en la página actual (no hay iframe)
            const user = process.env.CORFO_USER!;
            const pass = process.env.CORFO_PASS!;

            await page.waitForSelector('#rut', { state: 'visible' });
            await page.waitForSelector('#pass', { state: 'visible' });

            // Llenar los campos
            await page.fill('#rut', user);
            await page.fill('#pass', pass);

            // Hacer clic en el botón de enviar
            await page.waitForSelector('#ingresa_', { state: 'visible', timeout: 10000 });
            await page.click('#ingresa_');
            
            // Esperar a que el login se procese
            await page.waitForTimeout(3000);
            
            console.log('Login con Clave Corfo completado');
            return; // Salir de la función porque ya hicimos login
        }
    } catch (error) {
        console.log('No se encontró el enlace de Clave Corfo, buscando "Ingreso usuario" directamente...');
        
        // Fallback: buscar directamente "Ingreso usuario" (compatibilidad con interfaz antigua)
        loginButton = await page.waitForSelector('a:has-text("Ingreso usuario")', { 
            timeout: 10000,
            state: 'visible'
        });
    }

    if (!loginButton) {
        throw new Error('No se pudo encontrar el enlace de ingreso');
    }

    await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle' }),
        loginButton.click()
    ]);

    // Esperar iframe de login
    const frames = await page.frames();
    const loginFrame = frames.find(frame => frame.url().includes('login.corfo.cl'));
    
    if (!loginFrame) {
        throw new Error('No se pudo encontrar el iframe de login');
    }

    await loginFrame.waitForLoadState('networkidle');

    // Llenar credenciales
    const user = process.env.CORFO_USER!;
    const pass = process.env.CORFO_PASS!;

    await loginFrame.fill('#rut', user);
    await loginFrame.fill('#pass', pass);

    // Hacer clic en submit
    await loginFrame.click('#ingresa_');
    await loginFrame.waitForSelector('#rut', { state: 'detached', timeout: 15000 });

    // Volver al sitio público
    const volverButton = await page.waitForSelector('a:has-text("Volver al sitio Público")', { 
        state: 'visible',
        timeout: 10000
    });

    await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle' }),
        volverButton.click()
    ]);
}

/**
 * Navega desde la página actual al formulario real de postulación
 */
async function navegarAlFormularioReal(page: Page): Promise<boolean> {
    try {
        // PASO 1: Navegar a convocatorias
        await page.goto('https://www.corfo.cl/sites/cpp/programasyconvocatorias', {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });
        await page.waitForTimeout(3000);
        
        // PASO 2: Buscar primer formulario
        const primerMasInfoLink = await buscarPrimerMasInformacion(page);
        if (!primerMasInfoLink) {
            throw new Error('No se encontró enlace "Más Información"');
        }

        // PASO 3: Navegar a página de detalles
        const href = await primerMasInfoLink.getAttribute('href');
        const urlCompleta = href?.startsWith('http') ? href : `https://www.corfo.cl${href}`;
        
        await page.goto(urlCompleta, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(2000);

        // PASO 4: Buscar y hacer clic en "Inicia tu postulación"
        const botonIniciar = await buscarBotonIniciarPostulacion(page);
        if (!botonIniciar) {
            throw new Error('No se encontró botón "Inicia tu postulación"');
        }

        await Promise.all([
            page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {}),
            botonIniciar.click()
        ]);
        await page.waitForTimeout(3000);

        // PASO 5: Manejar página de borradores
        await crearNuevaPostulacion(page);

        // PASO 6: Verificar acceso al formulario
        const enFormulario = await verificarAccesoFormulario(page);
        return enFormulario;

    } catch (error) {
        console.error(`Error navegando al formulario: ${(error as Error).message}`);
        return false;
    }
}

/**
 * Busca el primer enlace "Más Información"
 */
async function buscarPrimerMasInformacion(page: Page): Promise<any> {
    // Hacer scroll para cargar contenido
    await page.evaluate(async () => {
        await new Promise<void>((resolve) => {
            let totalHeight = 0;
            const distance = 300;
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;
                if (totalHeight >= scrollHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 200);
        });
    });
    await page.waitForTimeout(3000);
    
    // Buscar con múltiples selectores
    const selectores = [
        'div.foot-caja_result a',
        'a:has-text("Más información")',
        'a:has-text("Más Información")',
        'a[href*="DetalleProgramaConvocatoria"]'
    ];
    
    for (const selector of selectores) {
        const elemento = await page.$(selector);
        if (elemento) {
            return elemento;
        }
    }
    return null;
}

/**
 * Busca el botón "Inicia tu postulación"
 */
async function buscarBotonIniciarPostulacion(page: Page): Promise<any> {
    const selectores = [
        'a:has-text("Inicia tu postulación")',
        'a:has-text("INICIA TU POSTULACIÓN")',
        'button:has-text("Inicia tu postulación")',
        'button:has-text("INICIA TU POSTULACIÓN")',
        '[onclick*="postulacion"]',
        '[href*="postulacion"]'
    ];
    
    for (const selector of selectores) {
        const elemento = await page.$(selector);
        if (elemento) {
            return elemento;
        }
    }
    return null;
}

/**
 * Crea nueva postulación desde borradores
 */
async function crearNuevaPostulacion(page: Page): Promise<void> {
    if (page.url().includes('PostuladorBorradores.aspx')) {
        // Eliminar postulaciones previas si existen
        const selectoresPapelera = [
            '.ico_sm_papelera',
            '.delPostulacion',
            'span.ico_sm_papelera',
            'a[data-original-title*="Desistir"]'
        ];
        
        for (const selector of selectoresPapelera) {
            const icono = await page.$(selector);
            if (icono) {
                await icono.click();
                await page.waitForTimeout(2000);
                
                // Confirmar eliminación
                const confirmar = await page.$('button:has-text("Sí, estoy seguro")') || 
                                 await page.$('button:has-text("Sí")');
                if (confirmar) {
                    await confirmar.click();
                    await page.waitForTimeout(2000);
                }
                break;
            }
        }
        
        // Buscar botón "Nueva Postulación"
        const selectoresNueva = [
            'button:has-text("Nueva Postulación")',
            'button:has-text("NUEVA POSTULACIÓN")',
            'a:has-text("Nueva Postulación")',
            'input[value*="Nueva"]'
        ];
        
        for (const selector of selectoresNueva) {
            const boton = await page.$(selector);
            if (boton) {
                await Promise.all([
                    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {}),
                    boton.click()
                ]);
                await page.waitForTimeout(3000);
                break;
            }
        }
    }
}

/**
 * Verifica que tenemos acceso al formulario real
 */
async function verificarAccesoFormulario(page: Page): Promise<boolean> {
    await page.waitForTimeout(3000);
    const campos = await page.$$('input, select, textarea');
    
    if (campos.length > 0) {
        const camposRelevantes = await page.$$eval('input, select, textarea', (elements) => {
            return elements.filter(el => {
                const element = el as HTMLInputElement;
                return element.type !== 'hidden' && 
                       !element.className.includes('search') &&
                       !element.name?.includes('search');
            }).length;
        });
        return camposRelevantes > 0;
    }
    return false;
}

/**
 * Obtiene el nombre del paso actual
 */
async function obtenerNombrePaso(page: Page): Promise<string> {
    try {
        const selectores = ['h1', 'h2', 'h3', '.step-title', '.phase-title'];
        
        for (const selector of selectores) {
            const elemento = await page.$(selector);
            if (elemento) {
                const texto = await elemento.textContent();
                if (texto && texto.trim().length > 0 && texto.trim().length < 100) {
                    return texto.trim();
                }
            }
        }
        
        const titulo = await page.title();
        return titulo || `Paso ${Date.now()}`;
        
    } catch (error) {
        return `Paso ${Date.now()}`;
    }
}

/**
 * Hace scroll completo para cargar contenido
 */
async function scrollCompletoPagina(page: Page): Promise<void> {
    await page.evaluate(async () => {
        await new Promise<void>((resolve) => {
            let totalHeight = 0;
            const distance = 200;
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;
                
                if (totalHeight >= scrollHeight) {
                    clearInterval(timer);
                    window.scrollTo(0, 0);
                    setTimeout(resolve, 1000);
                }
            }, 100);
        });
    });
}

/**
 * Extrae campos del paso actual
 */
async function extraerCamposPaso(page: Page): Promise<CampoFormulario[]> {
    try {
        const campos = await page.$$eval('input, select, textarea', (elements) => {
            return elements.map(el => {
                const element = el as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
                
                // Verificar visibilidad
                const rect = element.getBoundingClientRect();
                const style = window.getComputedStyle(element);
                const isVisible = style.display !== 'none' && 
                                 style.visibility !== 'hidden' && 
                                 rect.width > 0 && rect.height > 0 &&
                                 parseFloat(style.opacity) > 0;
                
                if (!isVisible || element.type === 'hidden') return null;
                
                // Buscar etiqueta
                let label = '';
                
                if (element.id) {
                    const labelEl = document.querySelector(`label[for="${element.id}"]`);
                    if (labelEl) label = labelEl.textContent?.trim() || '';
                }
                
                if (!label) {
                    const parentLabel = element.closest('label');
                    if (parentLabel) {
                        label = parentLabel.textContent?.replace(element.value || '', '').trim() || '';
                    }
                }
                
                if (!label) {
                    let previous = element.previousElementSibling;
                    let attempts = 0;
                    while (previous && !label && attempts < 3) {
                        const text = previous.textContent?.trim();
                        if (text && text.length > 0 && text.length < 200) {
                            label = text;
                            break;
                        }
                        previous = previous.previousElementSibling;
                        attempts++;
                    }
                }
                
                if (!label && 'placeholder' in element) {
                    label = (element as HTMLInputElement).placeholder || '';
                }
                
                let tipo = element.tagName.toLowerCase();
                if (tipo === 'input') {
                    tipo = (element as HTMLInputElement).type || 'text';
                }
                
                let opciones: string[] = [];
                if (element.tagName.toLowerCase() === 'select') {
                    const selectEl = element as HTMLSelectElement;
                    opciones = Array.from(selectEl.options).map(option => option.text);
                }
                
                const required = element.hasAttribute('required') || 
                               element.getAttribute('aria-required') === 'true' ||
                               element.classList.contains('required') ||
                               (label.includes('*') || label.includes('obligatorio'));
                
                return {
                    tipo,
                    label: label || `Campo ${element.tagName} sin etiqueta`,
                    nombre: element.name || element.id || `campo_${Date.now()}_${Math.random()}`,
                    requerido: required,
                    opciones: opciones.length > 0 ? opciones : undefined
                };
            }).filter(item => item !== null);
        });
        
        return campos as CampoFormulario[];
        
    } catch (error) {
        console.error('Error extrayendo campos:', error);
        return [];
    }
}

/**
 * Autocompleta los campos de un paso
 */
async function autocompletarCampos(
    page: Page, 
    campos: CampoFormulario[], 
    configuracion: ConfiguracionMVP
): Promise<number> {
    let camposCompletados = 0;
    
    for (const campo of campos) {
        try {
            if (configuracion.soloObligatorios && !campo.requerido) {
                continue;
            }
            
            const valor = obtenerValorParaCampo(campo);
            if (valor !== null) {
                const completado = await completarCampo(page, campo, valor);
                if (completado) {
                    camposCompletados++;
                }
            }
            
        } catch (error) {
            // Continuar con el siguiente campo
        }
    }
    
    return camposCompletados;
}

/**
 * Obtiene el valor apropiado para un campo
 */
function obtenerValorParaCampo(campo: CampoFormulario): string | null {
    const label = campo.label?.toLowerCase() || '';
    const tipo = campo.tipo?.toLowerCase() || '';
    
    // Mapeo específico basado en la etiqueta
    if (label.includes('título') && label.includes('proyecto')) {
        return CAMPOS_CORFO_MAPPING.TITULO_PROYECTO;
    } else if (label.includes('resumen') && label.includes('proyecto')) {
        return CAMPOS_CORFO_MAPPING.RESUMEN_PROYECTO;
    } else if (label.includes('objetivo') && label.includes('general')) {
        return CAMPOS_CORFO_MAPPING.OBJETIVO_GENERAL;
    } else if (label.includes('rut')) {
        return CAMPOS_CORFO_MAPPING.RUT;
    } else if (label.includes('teléfono') || label.includes('telefono')) {
        return CAMPOS_CORFO_MAPPING.TELEFONO;
    } else if (label.includes('mail') || label.includes('email') || label.includes('correo')) {
        return CAMPOS_CORFO_MAPPING.EMAIL;
    } else if (label.includes('duración') && label.includes('mes')) {
        return CAMPOS_CORFO_MAPPING.DURACION_PROYECTO;
    } else if (label.includes('costo') || label.includes('monto')) {
        return CAMPOS_CORFO_MAPPING.MONTO_SOLICITADO;
    }
    
    // Mapeo por tipo
    switch (tipo) {
        case 'textarea':
            return CAMPOS_CORFO_MAPPING.TEXTO_LARGO;
        case 'text':
            if (label.includes('nombre')) return CAMPOS_CORFO_MAPPING.NOMBRE;
            if (label.includes('apellido')) return CAMPOS_CORFO_MAPPING.APELLIDO_PATERNO;
            return CAMPOS_CORFO_MAPPING.TEXTO_CORTO;
        case 'email':
            return CAMPOS_CORFO_MAPPING.EMAIL;
        case 'tel':
            return CAMPOS_CORFO_MAPPING.TELEFONO;
        case 'number':
            return CAMPOS_CORFO_MAPPING.NUMERO;
        case 'date':
            return CAMPOS_CORFO_MAPPING.FECHA;
        case 'select':
            return null; // Se maneja en completarCampo
        case 'radio':
        case 'checkbox':
            return 'true';
        default:
            return CAMPOS_CORFO_MAPPING.TEXTO_CORTO;
    }
}

/**
 * Completa un campo específico
 */
async function completarCampo(page: Page, campo: CampoFormulario, valor: any): Promise<boolean> {
    try {
        const selectores = [
            `[name="${campo.nombre}"]`,
            `#${campo.nombre}`,
            `[id="${campo.nombre}"]`
        ];
        
        let elemento = null;
        for (const selector of selectores) {
            elemento = await page.$(selector);
            if (elemento) break;
        }
        
        if (!elemento) return false;
        
        const tipoElemento = await elemento.evaluate(el => el.tagName.toLowerCase());
        
        if (tipoElemento === 'select') {
            if (typeof valor === 'string' && campo.opciones) {
                const opcion = campo.opciones.find(opt => 
                    opt.toLowerCase().includes(valor.toLowerCase()) ||
                    valor.toLowerCase().includes(opt.toLowerCase())
                );
                if (opcion) {
                    await elemento.selectOption({ label: opcion });
                } else {
                    await elemento.selectOption({ index: 1 });
                }
            } else {
                await elemento.selectOption({ index: 1 });
            }
        } else if (tipoElemento === 'input') {
            const tipoInput = await elemento.evaluate(el => (el as HTMLInputElement).type);
            
            if (tipoInput === 'radio' || tipoInput === 'checkbox') {
                await elemento.check();
            } else {
                await elemento.fill(String(valor));
            }
        } else if (tipoElemento === 'textarea') {
            await elemento.fill(String(valor));
        }
        
        await page.waitForTimeout(100);
        return true;
        
    } catch (error) {
        return false;
    }
}

/**
 * Navega al siguiente paso
 */
async function navegarAlSiguientePaso(page: Page): Promise<boolean> {
    try {
        const selectores = [
            'button:has-text("SIGUIENTE")', 
            'button:has-text("Siguiente")',
            'input[value*="iguiente"]',
            'button:has-text("CONTINUAR")', 
            'button:has-text("Continuar")',
            '.btn-next',
            'button[type="submit"]:not([value*="Enviar"])'
        ];
        
        for (const selector of selectores) {
            const boton = await page.$(selector);
            if (boton) {
                const texto = await boton.textContent() || '';
                const value = await boton.getAttribute('value') || '';
                
                // Evitar botones de envío final
                if (texto.toLowerCase().includes('enviar') || 
                    value.toLowerCase().includes('enviar') ||
                    texto.toLowerCase().includes('finalizar')) {
                    continue;
                }
                
                try {
                    await boton.click();
                    await page.waitForTimeout(2000);
                    
                    // Manejar modal de confirmación
                    const confirmar = await page.$('button:has-text("Sí, estoy seguro")') || 
                                     await page.$('button:has-text("Sí")');
                    if (confirmar && await confirmar.isVisible()) {
                        await confirmar.click();
                        await page.waitForTimeout(2000);
                    }
                    
                    return true;
                    
                } catch (error) {
                    return false;
                }
            }
        }
        
        return false;
        
    } catch (error) {
        return false;
    }
}

// Script principal
if (require.main === module) {
    async function main() {
        console.log('🎯 MVP HÍBRIDO SIMPLIFICADO - PRUEBA DIRECTA');
        console.log('='.repeat(50));
        
        try {
            const resultado = await ejecutarMVPSimplificado({
                autocompletar: true,
                soloObligatorios: false,
                velocidad: 'normal',
                mostrarProgreso: true
            });
            
            // Guardar resultado
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const archivo = path.join(__dirname, '../data', `mvp_simplificado_${timestamp}.json`);
            await fs.writeFile(archivo, JSON.stringify(resultado, null, 2));
            
            console.log('\n📄 Resultado guardado en:', archivo);
            
            if (resultado.exito) {
                console.log('\n🎉 MVP EJECUTADO EXITOSAMENTE');
                process.exit(0);
            } else {
                console.log('\n❌ MVP FALLÓ');
                console.log('Errores:', resultado.errores);
                process.exit(1);
            }
            
        } catch (error) {
            console.error('❌ Error fatal:', error);
            process.exit(1);
        }
    }
    
    main();
} 