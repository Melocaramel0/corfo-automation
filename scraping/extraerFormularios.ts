import { chromium, Browser, Page } from 'playwright';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

// Verificar que las credenciales estén definidas
if (!process.env.CORFO_USER || !process.env.CORFO_PASS) {
    throw new Error('Las credenciales CORFO_USER y CORFO_PASS deben estar definidas en el archivo .env');
}

// Interfaz para tipar los datos de los campos del formulario
export interface CampoFormulario {
    tipo: string;         // 'texto', 'select', 'checkbox', etc.
    label?: string;       // Etiqueta del campo
    nombre?: string;      // Atributo name o id
    requerido: boolean;   // Si es obligatorio
    opciones?: string[];  // Para selects/radios
}

// Interfaz para tipar los datos de los formularios
export interface Formulario {
    titulo: string;
    url: string;
    descripcion?: string;
    campos: CampoFormulario[];
}

/**
 * Interfaz para una fase del formulario
 */
export interface FaseFormulario {
    numero: number;
    titulo: string;
    campos: CampoFormulario[];
    esUltimaFase: boolean;
}

/**
 * Interfaz extendida para formularios multi-fase
 */
export interface FormularioMultiFase extends Formulario {
    fases: FaseFormulario[];
    totalFases: number;
}

/**
 * Interfaz para una sección expandible del formulario
 */
export interface SeccionExpandible {
    nombre: string;
    selector: string;
    expandida: boolean;
    campos: CampoFormulario[];
}

/**
 * Interfaz para un paso completo del formulario con análisis profundo
 */
export interface PasoFormularioProfundo {
    numero: number;
    nombre: string;
    url: string;
    camposDirectos: CampoFormulario[];
    seccionesExpandibles: SeccionExpandible[];
    totalCampos: number;
    completado: boolean;
}

/**
 * Interfaz para el análisis completo del formulario
 */
export interface AnalisisFormularioCompleto {
    titulo: string;
    urlInicial: string;
    fechaAnalisis: string;
    pasos: PasoFormularioProfundo[];
    totalPasos: number;
    totalCampos: number;
    camposPorTipo: { [tipo: string]: number };
    resumen: string;
}

/**
 * Mapeo de campos CORFO para autocompletado inteligente
 */
export const CAMPOS_CORFO_MAPPING = {
    // Datos de Persona Jurídica
    'RUT': '12345678-9',
    'RAZON_SOCIAL': 'Empresa de Prueba SpA',
    'OBJETO_SOCIAL': 'Desarrollo de tecnologías innovadoras para el sector agrícola',
    'TELEFONO': '+56912345678',
    'EMAIL': 'contacto@empresaprueba.cl',
    'DIRECCION_CALLE': 'Av. Providencia',
    'DIRECCION_NUMERO': '1234',
    'DIRECCION_DEPTO': 'Of. 567',
    'CODIGO_POSTAL': '7500000',
    'COMUNA': 'Providencia',
    'PROVINCIA': 'Santiago',
    'REGION': 'Región Metropolitana',
    
    // Datos de Persona Natural
    'NOMBRE': 'Juan Carlos',
    'APELLIDO_PATERNO': 'González',
    'APELLIDO_MATERNO': 'López',
    'NACIONALIDAD': 'Chilena',
    'GENERO': 'Masculino',
    'PUEBLO_INDIGENA': 'No pertenece',
    
    // Datos del Proyecto
    'TITULO_PROYECTO': 'Desarrollo de Sistema de Monitoreo Ambiental Inteligente',
    'OBJETIVO_GENERAL': 'Desarrollar una solución tecnológica innovadora para el monitoreo ambiental en tiempo real',
    'RESUMEN_PROYECTO': 'Este proyecto busca crear una plataforma integral de monitoreo ambiental que utilice sensores IoT y algoritmos de machine learning para proporcionar datos precisos sobre la calidad del aire, agua y suelo.',
    'DURACION_PROYECTO': '24',
    'COSTO_TOTAL': '50000000',
    'MONTO_SOLICITADO': '30000000',
    'APORTE_BENEFICIARIO': '20000000',
    'SECTOR_ECONOMICO': 'Tecnología',
    'SECTOR_APLICACION': 'Medio Ambiente',
    
    // Valores por defecto para diferentes tipos
    'FECHA': '2024-12-31',
    'NUMERO': '100',
    'PORCENTAJE': '25',
    'MONEDA': '1000000',
    'TEXTO_LARGO': 'Este es un texto de prueba para campos que requieren descripción detallada.',
    'TEXTO_CORTO': 'Texto de prueba',
    'BOOLEAN': true,
    'SELECT_DEFAULT': 'primera_opcion'
};

/**
 * Realiza el proceso de login en el sistema de CORFO
 * @param page Instancia de la página de Playwright
 */
async function login(page: Page): Promise<void> {
    console.log('Iniciando sesión en CORFO...');
    
    // Navegar a la página de login
    await page.goto('https://www.corfo.cl/sites/cpp/homecorfo#', {
        waitUntil: 'networkidle',
        timeout: 30000
    });


    // Esperar y cerrar el aviso inicial si existe
    console.log('Verificando si hay aviso inicial...');
    try {
        const avisoBtn = await page.waitForSelector('button:has-text("Cerrar mensaje e ingresar al sitio de CORFO")', {
            timeout: 7000,
            state: 'visible'
        });
        if (avisoBtn) {
            console.log('Cerrando aviso inicial...');
            await avisoBtn.click();
            await page.waitForTimeout(1000);
        }
    } catch (error) {
        console.log('No se encontró aviso inicial o ya está cerrado');
    }

    console.log('Buscando enlace de ingreso...');
    // Esperar y hacer click en el enlace de ingreso
    const loginButton = await page.waitForSelector('a:has-text("Ingreso usuario")', { 
        timeout: 10000,
        state: 'visible'
    });

    if (!loginButton) {
        throw new Error('No se pudo encontrar el enlace de "Ingreso usuario"');
    }

    // Intentar remover el overlay si existe
    console.log('Verificando si hay overlay...');
    try {
        await page.evaluate(() => {
            const overlay = document.getElementById('bg_mask');
            if (overlay) {
                overlay.remove();
            }
        });
    } catch (error) {
        console.log('No se pudo remover el overlay o no existe');
    }

    console.log('Haciendo click en el enlace de ingreso...');
    // Hacer click usando Promise.all para esperar la navegación
    await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle' }),
        page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('a'));
            const target = links.find(link => link.textContent?.trim() === 'Ingreso usuario');
            if (target) (target as HTMLElement).click();
        })
    ]);

    // Listar todos los iframes disponibles
    console.log('Listando todos los iframes disponibles:');
    const frames = await page.frames();
    frames.forEach((frame, index) => {
        console.log(`Frame ${index + 1}:`, frame.url());
    });

    // Esperar a que el iframe de login esté completamente cargado
    console.log('Esperando a que el iframe de login esté completamente cargado...');
    const loginFrame = frames.find(frame => frame.url().includes('login.corfo.cl'));
    
    if (!loginFrame) {
        throw new Error('No se pudo encontrar el iframe de login');
    }

    // Esperar a que el iframe esté completamente cargado
    await loginFrame.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);

    // Intentar llenar los campos directamente
    console.log('Intentando llenar los campos de login...');
    try {
        const user = process.env.CORFO_USER!;
        const pass = process.env.CORFO_PASS!;

        // Esperar a que los campos estén disponibles
        await loginFrame.waitForSelector('#rut', { state: 'visible' });
        await loginFrame.waitForSelector('#pass', { state: 'visible' });

        // Llenar los campos
        await loginFrame.fill('#rut', user);
        await loginFrame.fill('#pass', pass);

        // Verificar que los campos estén llenos
        const values = await loginFrame.evaluate(() => {
            return {
                rut: (document.getElementById('rut') as HTMLInputElement)?.value,
                pass: (document.getElementById('pass') as HTMLInputElement)?.value
            };
        });
        if (!values.rut || !values.pass) {
            throw new Error('Los campos de login no se llenaron correctamente');
        }

        // Esperar a que el botón de submit esté disponible (input con id 'ingresa_')
        await loginFrame.waitForSelector('#ingresa_', { state: 'visible', timeout: 10000 });

        // Forzar el click en el botón de submit (id #ingresa_)
        await loginFrame.evaluate(() => {
            const btn = document.getElementById('ingresa_') as HTMLElement;
            if (btn) btn.click();
        });

        // Esperar a que desaparezca el campo #rut (indicando que el login avanzó)
        await loginFrame.waitForSelector('#rut', { state: 'detached', timeout: 15000 });

        // Esperar a que la página se estabilice
        await page.waitForTimeout(2000);

        // Verificar si el login fue exitoso
        const errorMessage = await page.locator('.error-message, .alert-danger').count();
        if (errorMessage > 0) {
            throw new Error('Error en el login: Credenciales inválidas');
        }

        console.log('Login exitoso');

        // Esperar a que el botón "Volver al sitio Público" esté disponible
        console.log('Buscando botón "Volver al sitio Público"...');
        const volverButton = await page.waitForSelector('a:has-text("Volver al sitio Público")', { 
            state: 'visible',
            timeout: 10000
        });

        if (!volverButton) {
            throw new Error('No se pudo encontrar el botón "Volver al sitio Público"');
        }

        // Click en "Volver al sitio Público" y esperar la navegación
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle' }),
            volverButton.click()
        ]);

        // Esperar a que la página se estabilice
        await page.waitForTimeout(2000);

        // Cerrar el aviso que aparece al volver
        console.log('Verificando si hay aviso al volver...');
        try {
            const avisoBtn = await page.waitForSelector('button:has-text("Cerrar mensaje e ingresar al sitio de CORFO")', {
                timeout: 7000,
                state: 'visible'
            });
            if (avisoBtn) {
                console.log('Cerrando aviso al volver...');
                await avisoBtn.click();
                await page.waitForTimeout(1000);
            }
        } catch (error) {
            console.log('No se encontró aviso al volver o ya está cerrado');
        }

    } catch (error) {
        console.error('Error al interactuar con el formulario:', error);
        throw error;
    }

    console.log('Proceso de login completado');
}

/**
 * Extrae los campos de un formulario específico
 * @param page Instancia de la página de Playwright
 * @returns Promise<CampoFormulario[]> Array con los campos encontrados
 */
async function extraerCamposFormulario(page: Page): Promise<CampoFormulario[]> {
    console.log('Analizando campos del formulario...');
    
    const campos: CampoFormulario[] = [];
    
    try {
        // Extraer todos los inputs, selects y textareas
        const elements = await page.$$eval('input, select, textarea, button[type="submit"]', (elements) => {
            return elements.map(el => {
                const element = el as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLButtonElement;
                
                // Buscar la etiqueta asociada
                let label = '';
                if (element.id) {
                    const labelEl = document.querySelector(`label[for="${element.id}"]`);
                    if (labelEl) {
                        label = labelEl.textContent?.trim() || '';
                    }
                }
                
                // Si no hay label por 'for', buscar el label padre o hermano anterior
                if (!label) {
                    const parentLabel = element.closest('label');
                    if (parentLabel) {
                        label = parentLabel.textContent?.replace(element.value || '', '').trim() || '';
                    } else {
                        // Buscar en elementos hermanos anteriores
                        let prevSibling = element.previousElementSibling;
                        while (prevSibling && !label) {
                            if (prevSibling.tagName === 'LABEL' || 
                                prevSibling.tagName === 'SPAN' || 
                                prevSibling.tagName === 'DIV') {
                                label = prevSibling.textContent?.trim() || '';
                                break;
                            }
                            prevSibling = prevSibling.previousElementSibling;
                        }
                    }
                }
                
                // Extraer opciones para selects
                let opciones: string[] = [];
                if (element.tagName === 'SELECT') {
                    const selectEl = element as HTMLSelectElement;
                    opciones = Array.from(selectEl.options).map(option => option.text);
                }
                
                return {
                    tipo: element.type || element.tagName.toLowerCase(),
                    tagName: element.tagName,
                    name: element.name || '',
                    id: element.id || '',
                    placeholder: (element as HTMLInputElement).placeholder || '',
                    required: ('required' in element && element.required) || element.hasAttribute('required'),
                    value: (element as HTMLInputElement).value || '',
                    label: label,
                    opciones: opciones.length > 0 ? opciones : undefined,
                    className: element.className || '',
                    visible: !element.hidden && 
                             window.getComputedStyle(element).display !== 'none' &&
                             window.getComputedStyle(element).visibility !== 'hidden'
                };
            });
        });
        
        // Filtrar solo elementos visibles y relevantes
        elements
            .filter(el => el.visible && el.tagName !== 'BUTTON')
            .forEach(el => {
                campos.push({
                    tipo: el.tipo,
                    label: el.label || el.placeholder || el.name || el.id,
                    nombre: el.name || el.id,
                    requerido: el.required,
                    opciones: el.opciones
                });
            });
        
        console.log(`Se encontraron ${campos.length} campos en el formulario`);
        
    } catch (error) {
        console.error('Error al extraer campos del formulario:', error);
    }
    
    return campos;
}

/**
 * Extrae información del primer formulario disponible de la página de Corfo
 * @returns Promise<Formulario | null> Datos del primer formulario encontrado o null si no se encuentra
 */
export async function extraerPrimerFormulario(): Promise<Formulario | null> {
    // Inicializar el navegador
    const browser: Browser = await chromium.launch({
        headless: false // Mantenemos visible para ver el proceso
    });

    try {
        // Crear una nueva página
        const page: Page = await browser.newPage();
        
        // Realizar login
        await login(page);
        
        console.log('Navegando a la página de convocatorias...');
        // Navegar a la página de convocatorias
        await page.goto('https://www.corfo.cl/sites/cpp/programasyconvocatorias', {
            waitUntil: 'networkidle',
            timeout: 30000
        });
        
        // Esperar a que la página cargue completamente
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        console.log('Entrando a la sección de Programas y Convocatorias. URL actual:', page.url());
        
        // Hacer scroll hasta el final de la página para cargar todos los elementos
        await page.evaluate(async () => {
            await new Promise<void>((resolve) => {
                let totalHeight = 0;
                const distance = 500;
                const timer = setInterval(() => {
                    const scrollHeight = document.body.scrollHeight;
                    window.scrollBy(0, distance);
                    totalHeight += distance;
                    if (totalHeight >= scrollHeight) {
                        clearInterval(timer);
                        resolve();
                    }
                }, 300);
            });
        });
        await page.waitForTimeout(2000);

        // Buscar el primer enlace "Más Información"
        const primerMasInfoLink = await page.$('div.foot-caja_result a');
        
        if (!primerMasInfoLink) {
            console.log('No se encontró ningún enlace "Más Información"');
            return null;
        }
        
        console.log('Procesando el primer formulario encontrado...');
        
        // Obtener el href del enlace
        const href = await primerMasInfoLink.getAttribute('href');
        if (!href) {
            console.log('No se encontró href en el primer enlace');
            return null;
        }
        
        const urlCompleta = href.startsWith('http') ? href : `https://www.corfo.cl${href}`;
        console.log('Navegando a:', urlCompleta);
        await page.goto(urlCompleta, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(2000);

        // Buscar y hacer clic en el enlace "Postular"
        const postularLink = await page.$('a[href*="javascript:disparo"][href*="Postular"]');
        if (!postularLink) {
            console.log('No se encontró el enlace "Postular" para este formulario');
            return null;
        }
        
        console.log('Enlace "Postular" encontrado. Accediendo al formulario...');
        
        // Hacer clic en el enlace "Postular"
        await postularLink.click();
        await page.waitForTimeout(3000); // Esperar a que cargue el formulario

        // Extraer información básica del formulario
        const titulo = await page.title();
        const url = page.url();
        const descripcion = await page.$eval('meta[name="description"]', el => el.getAttribute('content'))
            .catch(() => undefined) || undefined;

        // Extraer los campos del formulario
        const campos = await extraerCamposFormulario(page);

        const formulario: Formulario = {
            titulo,
            url,
            descripcion,
            campos
        };
        
        console.log(`\nFormulario extraído exitosamente:`);
        console.log(`Título: ${formulario.titulo}`);
        console.log(`URL: ${formulario.url}`);
        console.log(`Campos encontrados: ${formulario.campos.length}`);
        
        if (formulario.campos.length > 0) {
            console.log('\nCampos del formulario:');
            formulario.campos.forEach((campo, index) => {
                console.log(`${index + 1}. ${campo.label || 'Sin etiqueta'} (${campo.tipo}) - ${campo.requerido ? 'Obligatorio' : 'Opcional'}`);
                if (campo.opciones && campo.opciones.length > 0) {
                    console.log(`   Opciones: ${campo.opciones.join(', ')}`);
                }
            });
        }

        // Guardar el resultado en un archivo JSON
        const outputPath = path.join(__dirname, '../data/primer_formulario.json');
        await fs.writeFile(outputPath, JSON.stringify(formulario, null, 2), 'utf-8');
        console.log(`\nFormulario guardado en: ${outputPath}`);
        
        return formulario;
        
    } catch (error) {
        console.error('Error al extraer el primer formulario:', error);
        throw error;
    } finally {
        // Cerrar el navegador
        await browser.close();
    }
}

/**
 * Extrae los formularios disponibles de la página de Corfo
 * @returns Promise<Formulario[]> Array con los datos de los formularios encontrados
 */
export async function extraerFormularios(): Promise<Formulario[]> {
    // Para mantener compatibilidad, convertimos el primer formulario en un array
    const primerFormulario = await extraerPrimerFormulario();
    return primerFormulario ? [primerFormulario] : [];
}

/**
 * Navega por todas las fases del formulario y extrae información completa
 * @param page Instancia de la página de Playwright
 * @returns Promise<FormularioMultiFase> Formulario con todas sus fases
 */
async function extraerFormularioMultiFase(page: Page): Promise<FormularioMultiFase> {
    console.log('🔄 Iniciando extracción de formulario multi-fase...');
    
    // Primero, agregar logging detallado de lo que hay en la página
    console.log('📊 Estado inicial de la página:');
    console.log(`   URL actual: ${page.url()}`);
    console.log(`   Título: ${await page.title()}`);
    
    // Verificar si hay campos de formulario visibles
    const camposIniciales = await page.$$('input, select, textarea');
    console.log(`   Campos totales encontrados: ${camposIniciales.length}`);
    
    const camposVisibles = await page.$$('input:visible, select:visible, textarea:visible');
    console.log(`   Campos visibles encontrados: ${camposVisibles.length}`);
    
    // Si no hay campos visibles, analizar la página más a fondo
    if (camposVisibles.length === 0) {
        console.log('⚠️ No se encontraron campos visibles. Analizando página...');
        
        // Verificar si hay iframes
        const frames = page.frames();
        console.log(`   Frames encontrados: ${frames.length}`);
        for (let i = 0; i < frames.length; i++) {
            console.log(`   Frame ${i + 1}: ${frames[i].url()}`);
        }
        
        // Buscar elementos que podrían indicar un formulario
        const formularioPosibles = await page.$$('form, [class*="form"], [id*="form"]');
        console.log(`   Elementos tipo formulario encontrados: ${formularioPosibles.length}`);
        
        // Buscar botones que podrían iniciar el formulario
        const botonesPosibles = await page.$$('button, input[type="button"], input[type="submit"], a[href*="javascript"]');
        console.log(`   Botones/enlaces posibles encontrados: ${botonesPosibles.length}`);
        
        // Listar los primeros 5 botones para debugging
        for (let i = 0; i < Math.min(5, botonesPosibles.length); i++) {
            try {
                const texto = await botonesPosibles[i].textContent();
                const href = await botonesPosibles[i].getAttribute('href');
                const onclick = await botonesPosibles[i].getAttribute('onclick');
                console.log(`   Botón ${i + 1}: "${texto}" href="${href}" onclick="${onclick}"`);
            } catch (error) {
                console.log(`   Botón ${i + 1}: Error al obtener información`);
            }
        }
        
        // Intentar hacer scroll para activar contenido dinámico
        console.log('🔄 Haciendo scroll para activar contenido dinámico...');
        await page.evaluate(() => {
            window.scrollTo(0, document.body.scrollHeight);
        });
        await page.waitForTimeout(3000);
        
        // Verificar de nuevo después del scroll
        const camposPostScroll = await page.$$('input:visible, select:visible, textarea:visible');
        console.log(`   Campos visibles después del scroll: ${camposPostScroll.length}`);
    }
    
    const fases: FaseFormulario[] = [];
    let faseActual = 1;
    let hayMasFases = true;
    
    while (hayMasFases) {
        console.log(`\n📋 Procesando Fase ${faseActual}...`);
        
        // Esperar a que la fase cargue completamente
        await page.waitForTimeout(2000);
        
        // Verificar que aún estamos en una página con campos
        const camposFaseAntesDe = await page.$$('input, select, textarea');
        console.log(`   Campos totales en fase ${faseActual}: ${camposFaseAntesDe.length}`);
        
        if (camposFaseAntesDe.length === 0) {
            console.log(`⚠️ No se encontraron campos en la fase ${faseActual}. Finalizando extracción.`);
            break;
        }
        
        // Extraer el título de la fase actual
        const tituloFase = await page.evaluate(() => {
            // Buscar diferentes selectores posibles para el título de la fase
            const posiblesTitulos = [
                'h1', 'h2', 'h3', 
                '.step-title', '.phase-title', '.section-title',
                '[class*="titulo"]', '[class*="title"]'
            ];
            
            for (const selector of posiblesTitulos) {
                const elemento = document.querySelector(selector);
                if (elemento && elemento.textContent?.trim()) {
                    return elemento.textContent.trim();
                }
            }
            return `Fase ${document.location.href}`;
        });
        
        console.log(`📝 Título de la fase: ${tituloFase}`);
        
        // Extraer campos de la fase actual con logging detallado
        console.log(`🔍 Extrayendo campos de la fase ${faseActual}...`);
        const camposFase = await extraerCamposFase(page, faseActual);
        console.log(`✅ Campos encontrados en la fase: ${camposFase.length}`);
        
        // Mostrar detalles de los primeros campos encontrados
        for (let i = 0; i < Math.min(3, camposFase.length); i++) {
            const campo = camposFase[i];
            console.log(`   Campo ${i + 1}: ${campo.tipo} - "${campo.label}" (${campo.nombre}) - Req: ${campo.requerido}`);
        }
        
        // Intentar detectar campos obligatorios presionando "Siguiente" sin llenar
        console.log('🔍 Detectando campos obligatorios...');
        const camposObligatorios = await detectarCamposObligatorios(page, camposFase);
        console.log(`⚠️ Campos obligatorios detectados: ${camposObligatorios.length}`);
        
        if (camposObligatorios.length > 0) {
            console.log(`   Campos obligatorios: ${camposObligatorios.join(', ')}`);
        }
        
        // Marcar campos como obligatorios según la detección
        camposFase.forEach(campo => {
            if (camposObligatorios.includes(campo.nombre || campo.label || '')) {
                campo.requerido = true;
            }
        });
        
        // Verificar si hay más fases
        console.log('🔍 Verificando si hay más fases...');
        let tieneBotonSiguiente = null;
        
        // Buscar con múltiples estrategias
        const selectoresBotonesNavegacion = [
            'button:has-text("SIGUIENTE")',
            'button:has-text("Siguiente")', 
            'button:has-text("siguiente")',
            'input[value*="iguiente"]',
            'input[value*="IGUIENTE"]',
            '.btn-next',
            '[class*="next"]',
            'button[type="submit"]',
            'input[type="submit"]',
            'button:has-text("Continuar")',
            'button:has-text("CONTINUAR")',
            'a:has-text("Siguiente")',
            'a:has-text("SIGUIENTE")'
        ];
        
        for (const selector of selectoresBotonesNavegacion) {
            tieneBotonSiguiente = await page.$(selector);
            if (tieneBotonSiguiente) {
                console.log(`✅ Botón navegación encontrado: ${selector}`);
                break;
            }
        }
        
        // Si no encuentra con selectores, buscar por texto
        if (!tieneBotonSiguiente) {
            console.log('🔍 Buscando botones por texto...');
            const todosLosBotones = await page.$$('button, input[type="submit"], input[type="button"], a');
            console.log(`   Total de botones encontrados: ${todosLosBotones.length}`);
            
            for (const boton of todosLosBotones) {
                try {
                    const texto = await boton.textContent();
                    const value = await boton.getAttribute('value');
                    const textoBuscar = (texto || value || '').toLowerCase();
                    
                    if (textoBuscar.includes('siguiente') || 
                        textoBuscar.includes('continuar') ||
                        textoBuscar.includes('next') ||
                        textoBuscar.includes('submit')) {
                        tieneBotonSiguiente = boton;
                        console.log(`✅ Botón navegación por texto: "${texto || value}"`);
                        break;
                    }
                } catch (error) {
                    continue;
                }
            }
        }
        
        hayMasFases = tieneBotonSiguiente !== null;
        console.log(`📊 ¿Hay más fases?: ${hayMasFases}`);
        
        // Agregar la fase actual
        fases.push({
            numero: faseActual,
            titulo: tituloFase,
            campos: camposFase,
            esUltimaFase: !hayMasFases
        });
        
        // Si hay más fases, navegar a la siguiente
        if (hayMasFases) {
            console.log(`➡️ Preparando navegación a la siguiente fase...`);
            
            // Llenar campos mínimos para poder avanzar (solo los obligatorios)
            if (camposObligatorios.length > 0) {
                console.log('📝 Llenando campos obligatorios para avanzar...');
                await llenarCamposMinimos(page, camposObligatorios);
                console.log('✅ Campos obligatorios llenados');
            } else {
                console.log('ℹ️ No hay campos obligatorios que llenar');
            }
            
            // Hacer scroll al botón antes de hacer clic
            await tieneBotonSiguiente!.scrollIntoViewIfNeeded();
            await page.waitForTimeout(500);
            
            console.log('🖱️ Haciendo clic en botón siguiente...');
            
            // Hacer clic en siguiente con mejor manejo de errores
            try {
                await Promise.all([
                    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => console.log('⚠️ No hubo navegación completa')),
                    tieneBotonSiguiente!.click()
                ]);
                console.log('✅ Navegación exitosa');
            } catch (error) {
                console.log('⚠️ Error en navegación, intentando continuar...');
                console.log(`   Error: ${(error as Error).message}`);
                // Intentar hacer clic sin esperar navegación
                try {
                    await tieneBotonSiguiente!.click();
                    console.log('✅ Clic realizado sin esperar navegación');
                } catch (clickError) {
                    console.log(`❌ Error al hacer clic: ${(clickError as Error).message}`);
                    // Si no puede hacer clic, terminar el bucle
                    hayMasFases = false;
                }
            }
            
            if (hayMasFases) {
                await page.waitForTimeout(3000);
                faseActual++;
                
                console.log(`📍 Nueva página después de navegación: ${page.url()}`);
                
                // Limitar a 10 fases máximo para evitar bucles infinitos
                if (faseActual > 10) {
                    console.log('⚠️ Límite de fases alcanzado (10), terminando extracción');
                    break;
                }
            }
        } else {
            console.log('📍 Esta es la última fase del formulario');
        }
    }
    
    // Combinar todos los campos de todas las fases
    const todosCampos = fases.flatMap(fase => fase.campos);
    
    const formularioCompleto: FormularioMultiFase = {
        titulo: await page.title(),
        url: page.url(),
        descripcion: `Formulario multi-fase con ${fases.length} fases`,
        campos: todosCampos,
        fases: fases,
        totalFases: fases.length
    };
    
    console.log(`\n✅ Extracción completada:`);
    console.log(`   📊 Total de fases: ${fases.length}`);
    console.log(`   📝 Total de campos: ${todosCampos.length}`);
    console.log(`   ⚠️ Campos obligatorios: ${todosCampos.filter(c => c.requerido).length}`);
    
    // Mostrar resumen de cada fase
    fases.forEach((fase, index) => {
        console.log(`   📋 Fase ${index + 1}: "${fase.titulo}" - ${fase.campos.length} campos`);
    });
    
    return formularioCompleto;
}

/**
 * Extrae los campos visibles en la fase actual
 */
async function extraerCamposFase(page: Page, numeroFase: number): Promise<CampoFormulario[]> {
    const campos: CampoFormulario[] = [];
    
    try {
        console.log(`🔍 Iniciando extracción de campos para fase ${numeroFase}...`);
        
        // Primero intentar con selectores más amplios
        const todosLosElementos = await page.$$('input, select, textarea');
        console.log(`   Total de elementos input/select/textarea: ${todosLosElementos.length}`);
        
        // También buscar en iframes si existen
        const frames = page.frames();
        if (frames.length > 1) {
            console.log(`   Verificando ${frames.length} frames...`);
            for (let i = 0; i < frames.length; i++) {
                try {
                    const frameElementos = await frames[i].$$('input, select, textarea');
                    if (frameElementos.length > 0) {
                        console.log(`   Frame ${i + 1} tiene ${frameElementos.length} campos`);
                    }
                } catch (error) {
                    console.log(`   Error al acceder al frame ${i + 1}`);
                }
            }
        }
        
        // Extraer información de todos los elementos encontrados
        const elements = await page.$$eval('input, select, textarea', (elements) => {
            return elements.map(el => {
                const element = el as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
                
                // Obtener información básica del elemento
                const rect = element.getBoundingClientRect();
                const computedStyle = window.getComputedStyle(element);
                
                // Verificar visibilidad con múltiples criterios
                const isDisplayed = computedStyle.display !== 'none';
                const isVisible = computedStyle.visibility !== 'hidden';
                const hasSize = rect.width > 0 && rect.height > 0;
                const isInViewport = rect.top >= 0 && rect.left >= 0;
                const opacity = parseFloat(computedStyle.opacity) > 0;
                
                // Considerar elemento como "disponible" si cumple algunos criterios básicos
                const isAvailable = isDisplayed && (hasSize || isInViewport);
                
                // Buscar la etiqueta asociada con múltiples estrategias
                let label = '';
                
                // Estrategia 1: Label con atributo 'for'
                if (element.id) {
                    const labelEl = document.querySelector(`label[for="${element.id}"]`);
                    if (labelEl) {
                        label = labelEl.textContent?.trim() || '';
                    }
                }
                
                // Estrategia 2: Label padre
                if (!label) {
                    const parentLabel = element.closest('label');
                    if (parentLabel) {
                        label = parentLabel.textContent?.replace(element.value || '', '').trim() || '';
                    }
                }
                
                // Estrategia 3: Texto anterior (hermano anterior)
                if (!label) {
                    let previous = element.previousElementSibling;
                    while (previous && !label) {
                        const text = previous.textContent?.trim();
                        if (text && text.length > 0 && text.length < 100) {
                            label = text;
                            break;
                        }
                        previous = previous.previousElementSibling;
                    }
                }
                
                // Estrategia 4: Placeholder como label
                if (!label && 'placeholder' in element) {
                    label = (element as HTMLInputElement).placeholder || '';
                }
                
                // Estrategia 5: Buscar en elementos padre cercanos
                if (!label) {
                    const parentContainer = element.closest('div, td, th, li');
                    if (parentContainer) {
                        const allText = parentContainer.textContent?.trim() || '';
                        // Extraer solo texto que no sea del input mismo
                        const inputText = element.value || (element as HTMLInputElement).placeholder || '';
                        const cleanText = allText.replace(inputText, '').trim();
                        if (cleanText.length > 0 && cleanText.length < 100) {
                            label = cleanText;
                        }
                    }
                }
                
                // Información del tipo de elemento
                let tipo = element.tagName.toLowerCase();
                if (tipo === 'input') {
                    tipo = (element as HTMLInputElement).type || 'text';
                }
                
                // Detectar si es requerido
                const required = element.hasAttribute('required') || 
                               element.getAttribute('aria-required') === 'true' ||
                               element.classList.contains('required') ||
                               (label.includes('*') || label.includes('obligatorio'));
                
                // Obtener opciones para selects
                let opciones: string[] = [];
                if (element.tagName.toLowerCase() === 'select') {
                    const selectElement = element as HTMLSelectElement;
                    opciones = Array.from(selectElement.options).map(option => option.text);
                }
                
                return {
                    tipo,
                    label: label || `Campo sin etiqueta (${element.tagName})`,
                    nombre: element.name || element.id || `campo_${Date.now()}_${Math.random()}`,
                    requerido: required,
                    opciones: opciones.length > 0 ? opciones : undefined,
                    // Información adicional para debugging
                    debug: {
                        tagName: element.tagName,
                        id: element.id,
                        name: element.name,
                        className: element.className,
                        isDisplayed,
                        isVisible,
                        hasSize,
                        isInViewport,
                        opacity,
                        isAvailable
                    }
                };
            }).filter(item => item !== null);
        });
        
        console.log(`   Elementos procesados: ${elements.length}`);
        
        // Filtrar elementos que están realmente disponibles
        const elementosDisponibles = elements.filter(el => el.debug.isAvailable);
        console.log(`   Elementos disponibles: ${elementosDisponibles.length}`);
        
        // Convertir a formato CampoFormulario
        elementosDisponibles.forEach((el, index) => {
            campos.push({
                tipo: el.tipo,
                label: el.label,
                nombre: el.nombre,
                requerido: el.requerido,
                opciones: el.opciones
            });
            
            // Log detallado de los primeros 5 campos
            if (index < 5) {
                console.log(`   Campo ${index + 1}: ${el.tipo} "${el.label}" (${el.nombre}) - Disponible: ${el.debug.isAvailable}`);
            }
        });
        
        // Si no se encontraron campos disponibles, intentar con criterios más flexibles
        if (campos.length === 0) {
            console.log('⚠️ No se encontraron campos disponibles, intentando con criterios más flexibles...');
            
            const elementosFlexibles = elements.filter(el => 
                el.debug.isDisplayed && // Solo que esté display != none
                !el.debug.className.includes('hidden') // Y no tenga clase hidden
            );
            
            console.log(`   Elementos con criterios flexibles: ${elementosFlexibles.length}`);
            
            elementosFlexibles.forEach(el => {
                campos.push({
                    tipo: el.tipo,
                    label: el.label,
                    nombre: el.nombre,
                    requerido: el.requerido,
                    opciones: el.opciones
                });
            });
        }
        
        console.log(`✅ Extracción completada: ${campos.length} campos encontrados en fase ${numeroFase}`);
        
    } catch (error) {
        console.error(`Error al extraer campos de la fase ${numeroFase}:`, error);
    }
    
    return campos;
}

/**
 * Detecta campos obligatorios intentando avanzar sin llenar y viendo qué campos se marcan en rojo
 */
async function detectarCamposObligatorios(page: Page, campos: CampoFormulario[]): Promise<string[]> {
    console.log('🔍 Detectando campos obligatorios...');
    
    try {
        // Buscar el botón siguiente con múltiples estrategias
        let botonSiguiente = null;
        
        // Primero, selectores específicos
        const selectoresBotones = [
            'button:has-text("SIGUIENTE")',
            'button:has-text("Siguiente")', 
            'button:has-text("siguiente")',
            'input[value*="iguiente"]',
            'input[value*="IGUIENTE"]',
            '.btn-next',
            '[class*="next"]',
            'button[type="submit"]',
            'input[type="submit"]',
            'button:has-text("Continuar")',
            'button:has-text("CONTINUAR")',
            'a:has-text("Siguiente")',
            'a:has-text("SIGUIENTE")'
        ];
        
        for (const selector of selectoresBotones) {
            botonSiguiente = await page.$(selector);
            if (botonSiguiente) {
                console.log(`✅ Botón encontrado con selector: ${selector}`);
                break;
            }
        }
        
        // Si no encuentra con selectores, buscar por texto
        if (!botonSiguiente) {
            const todosLosBotones = await page.$$('button, input[type="submit"], input[type="button"], a');
            for (const boton of todosLosBotones) {
                try {
                    const texto = await boton.textContent();
                    const value = await boton.getAttribute('value');
                    const textoBuscar = (texto || value || '').toLowerCase();
                    
                    if (textoBuscar.includes('siguiente') || 
                        textoBuscar.includes('continuar') ||
                        textoBuscar.includes('next') ||
                        textoBuscar.includes('submit') ||
                        textoBuscar.includes('enviar')) {
                        botonSiguiente = boton;
                        console.log(`✅ Botón encontrado por texto: "${texto || value}"`);
                        break;
                    }
                } catch (error) {
                    continue;
                }
            }
        }
        
        if (!botonSiguiente) {
            console.log('❌ No se encontró botón de navegación, asumiendo no hay validación visual');
            return [];
        } else {
            // Hacer scroll al botón si es necesario
            await botonSiguiente.scrollIntoViewIfNeeded();
            await page.waitForTimeout(500);
            
            // Verificar si el botón está visible antes de hacer clic
            const esVisible = await botonSiguiente.isVisible();
            if (!esVisible) {
                console.log('❌ El botón encontrado no es visible, asumiendo no hay validación visual');
                return [];
            }
            
            try {
                // Hacer clic en el botón sin llenar nada para provocar validación
                // pero con manejo especial para evitar navegaciones inesperadas
                await page.evaluate((element) => {
                    // Hacer clic usando JavaScript para evitar navegación completa
                    if (element && 'click' in element && typeof element.click === 'function') {
                        (element as HTMLElement).click();
                    }
                }, botonSiguiente);
                
                await page.waitForTimeout(2000); // Esperar a que aparezcan los errores
            } catch (error) {
                console.log('⚠️ Error al hacer clic en botón, posible navegación:', (error as Error).message);
                return [];
            }
        }
        
        // Buscar campos que ahora tienen indicadores de error
        const camposConError = await page.$$eval('input, select, textarea', (elements) => {
            return elements.map(el => {
                const element = el as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
                
                // Verificar diferentes formas de indicar error
                const tieneClaseError = element.classList.contains('error') || 
                                      element.classList.contains('invalid') || 
                                      element.classList.contains('has-error') ||
                                      element.classList.contains('field-error');
                
                // Verificar si el campo o su contenedor tiene estilos de error
                const style = window.getComputedStyle(element);
                const borderRojo = style.borderColor.includes('rgb(255') || 
                                  style.borderColor.includes('red') ||
                                  style.borderColor.includes('#f') ||
                                  style.borderColor.includes('#e') ||
                                  style.borderColor.includes('#d');
                
                // Verificar si hay un mensaje de error cercano
                const contenedor = element.closest('div') || element.parentElement;
                const hayMensajeError = contenedor?.querySelector('.error-message, .field-error, .invalid-feedback, [class*="error"]');
                
                if (tieneClaseError || borderRojo || hayMensajeError) {
                    return {
                        name: element.name || element.id || '',
                        id: element.id || '',
                        placeholder: (element as HTMLInputElement).placeholder || ''
                    };
                }
                
                return null;
            }).filter(el => el !== null);
        });
        
        // Extraer los nombres/identificadores de los campos con error
        const nombresCamposObligatorios: string[] = [];
        
        camposConError.forEach(campo => {
            if (campo) {
                // Buscar coincidencia con los campos que tenemos
                const campoCoincidente = campos.find(c => 
                    c.nombre === campo.name || 
                    c.nombre === campo.id ||
                    (campo.placeholder && c.label?.includes(campo.placeholder))
                );
                
                if (campoCoincidente && campoCoincidente.nombre) {
                    nombresCamposObligatorios.push(campoCoincidente.nombre);
                }
            }
        });
        
        console.log(`✅ Campos obligatorios detectados: ${nombresCamposObligatorios.length}`);
        
        return nombresCamposObligatorios;
        
    } catch (error) {
        console.error('Error al detectar campos obligatorios:', error);
        return [];
    }
}

/**
 * Llena campos mínimos para poder avanzar a la siguiente fase
 */
async function llenarCamposMinimos(page: Page, camposObligatorios: string[]): Promise<void> {
    console.log(`📝 Llenando ${camposObligatorios.length} campos obligatorios para avanzar...`);
    
    for (const nombreCampo of camposObligatorios) {
        try {
            // Buscar el campo por diferentes selectores
            const selectores = [
                `[name="${nombreCampo}"]`,
                `#${nombreCampo}`,
                `[id="${nombreCampo}"]`
            ];
            
            let elemento = null;
            for (const selector of selectores) {
                elemento = await page.$(selector);
                if (elemento) break;
            }
            
            if (elemento) {
                // Obtener el tipo de elemento
                const tipoElemento = await elemento.evaluate(el => el.tagName.toLowerCase());
                
                if (tipoElemento === 'select') {
                    // Para selects, elegir la primera opción válida
                    await elemento.selectOption({ index: 1 });
                } else if (tipoElemento === 'input') {
                    const tipoInput = await elemento.evaluate(el => (el as HTMLInputElement).type);
                    
                    if (tipoInput === 'text' || tipoInput === 'email') {
                        await elemento.fill('test@ejemplo.cl');
                    } else if (tipoInput === 'tel') {
                        await elemento.fill('+56912345678');
                    } else if (tipoInput === 'number') {
                        await elemento.fill('100');
                    } else if (tipoInput === 'date') {
                        await elemento.fill('2024-01-01');
                    } else if (tipoInput === 'checkbox') {
                        await elemento.check();
                    }
                } else if (tipoElemento === 'textarea') {
                    await elemento.fill('Texto de prueba para completar el campo obligatorio.');
                }
                
                await page.waitForTimeout(100); // Pequeña pausa entre campos
            }
            
        } catch (error) {
            console.error(`Error al llenar campo ${nombreCampo}:`, error);
        }
    }
}

/**
 * Extrae información del primer formulario disponible con manejo multi-fase
 * @returns Promise<FormularioMultiFase | null> Datos del primer formulario encontrado o null si no se encuentra
 */
export async function extraerPrimerFormularioMultiFase(): Promise<FormularioMultiFase | null> {
    // Inicializar el navegador
    const browser: Browser = await chromium.launch({
        headless: false // Mantenemos visible para ver el proceso
    });

    try {
        // Crear una nueva página
        const page: Page = await browser.newPage();
        
        // Realizar login
        await login(page);
        
        // Navegar a la página de convocatorias con manejo robusto
        await navegarAConvocatorias(page);
        
        // Buscar el primer enlace "Más Información" con scroll inteligente
        const primerMasInfoLink = await buscarPrimerMasInformacion(page);
        
        if (!primerMasInfoLink) {
            console.log('No se encontró ningún enlace "Más Información"');
            return null;
        }
        
        console.log('Procesando el primer formulario encontrado...');
        
        // Obtener el href del enlace
        const href = await primerMasInfoLink.getAttribute('href');
        if (!href) {
            console.log('No se encontró href en el primer enlace');
            return null;
        }
        
        const urlCompleta = href.startsWith('http') ? href : `https://www.corfo.cl${href}`;
        console.log('Navegando a:', urlCompleta);
        await page.goto(urlCompleta, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(2000);

        // Intentar acceder al formulario real de postulación
        const formularioAccedido = await accederAlFormulario(page);
        
        // Continuar independientemente para analizar lo que se encuentre
        console.log('📋 Procediendo con extracción de formulario...');

        // Extraer el formulario multi-fase
        const formulario = await extraerFormularioMultiFase(page);

        // Guardar el resultado en un archivo JSON
        const outputPath = path.join(__dirname, '../data/primer_formulario_multifase.json');
        await fs.writeFile(outputPath, JSON.stringify(formulario, null, 2), 'utf-8');
        console.log(`\nFormulario multi-fase guardado en: ${outputPath}`);
        
        return formulario;
        
    } catch (error) {
        console.error('Error al extraer el primer formulario multi-fase:', error);
        throw error;
    } finally {
        // Cerrar el navegador
        await browser.close();
    }
}

/**
 * Busca el primer enlace "Más Información" disponible con scroll inteligente
 */
async function buscarPrimerMasInformacion(page: Page) {
    console.log('🔄 Haciendo scroll para cargar todos los formularios...');
    
    // Hacer scroll progresivo para cargar contenido dinámico
    await page.evaluate(async () => {
        await new Promise<void>((resolve) => {
            let totalHeight = 0;
            const distance = 300; // Scroll más suave
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;
                if (totalHeight >= scrollHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 200); // Más lento para permitir carga
        });
    });
    
    // Esperar a que carguen los elementos después del scroll
    await page.waitForTimeout(3000);
    
    console.log('🔍 Buscando botón "Más Información"...');
    
    let primerMasInfoLink = null;
    const selectoresPosibles = [
        'div.foot-caja_result a', // Selector original
        'a:has-text("Más información")', // Por texto
        'a:has-text("Más Información")', // Con mayúscula
        'a[href*="Mas_Informacion"]', // Por href
        '.mas-info a', // Clase específica
        '.btn-mas-info', // Botón específico
        'a[title*="información"]', // Por atributo title
        '.resultado a', // En contenedor de resultado
        '.convocatoria a', // En contenedor de convocatoria
        'a[href*="DetalleProgramaConvocatoria"]' // URL específica de CORFO
    ];
    
    // Intentar con cada selector
    for (const selector of selectoresPosibles) {
        try {
            console.log(`   Probando selector: ${selector}`);
            primerMasInfoLink = await page.$(selector);
            if (primerMasInfoLink) {
                console.log(`✅ Encontrado con selector: ${selector}`);
                break;
            }
        } catch (error) {
            console.log(`   ❌ Error con selector ${selector}:`, (error as Error).message);
        }
    }
    
    // Si no encuentra con selectores específicos, buscar por texto visible
    if (!primerMasInfoLink) {
        console.log('🔍 Buscando por texto visible en la página...');
        
        // Hacer scroll adicional para asegurar que el contenido esté visible
        await page.evaluate(() => {
            window.scrollTo(0, document.body.scrollHeight * 0.3); // Scroll al 30% de la página
        });
        await page.waitForTimeout(2000);
        
        // Buscar enlaces que contengan "información" en su texto
        const enlaces = await page.$$('a');
        for (const enlace of enlaces) {
            try {
                const texto = await enlace.textContent();
                const href = await enlace.getAttribute('href');
                if (texto && (
                    texto.toLowerCase().includes('información') || 
                    texto.toLowerCase().includes('mas info') || 
                    texto.toLowerCase().includes('detalle') ||
                    (href && href.toLowerCase().includes('informacion'))
                )) {
                    primerMasInfoLink = enlace;
                    console.log(`✅ Encontrado por texto: "${texto}"`);
                    break;
                }
            } catch (error) {
                // Continuar con el siguiente enlace si hay error
                continue;
            }
        }
    }
    
    // Si aún no encuentra, intentar con scroll más específico
    if (!primerMasInfoLink) {
        console.log('🔍 Intentando scroll específico para encontrar formularios...');
        
        // Scroll hacia el área donde típicamente aparecen los resultados
        await page.evaluate(() => {
            const resultados = document.querySelector('.resultados, .contenido-resultados, .lista-programas');
            if (resultados) {
                resultados.scrollIntoView({ behavior: 'smooth' });
            } else {
                // Si no encuentra contenedor específico, scroll hacia abajo gradualmente
                window.scrollTo(0, window.innerHeight * 2);
            }
        });
        
        await page.waitForTimeout(3000);
        
        // Buscar de nuevo después del scroll específico
        const enlacesFinales = await page.$$('a');
        for (const enlace of enlacesFinales) {
            try {
                const texto = await enlace.textContent();
                const href = await enlace.getAttribute('href');
                if (texto && href && (
                    texto.toLowerCase().includes('información') || 
                    href.includes('DetalleProgramaConvocatoria') ||
                    href.includes('Mas_Informacion')
                )) {
                    primerMasInfoLink = enlace;
                    console.log(`✅ Encontrado con scroll específico: "${texto}"`);
                    break;
                }
            } catch (error) {
                continue;
            }
        }
    }
    
    return primerMasInfoLink;
}

/**
 * Navega a la página de convocatorias con manejo robusto de timeout
 */
async function navegarAConvocatorias(page: Page): Promise<void> {
    console.log('Navegando a la página de convocatorias...');
    
    try {
        // Navegar con timeout extendido y manejo menos estricto
        await page.goto('https://www.corfo.cl/sites/cpp/programasyconvocatorias', {
            waitUntil: 'domcontentloaded', // Menos estricto que 'networkidle'
            timeout: 60000 // 60 segundos
        });
        
        console.log('✅ Página cargada, esperando contenido...');
        
        // Intentar esperar networkidle pero sin fallar si toma demasiado tiempo
        try {
            await page.waitForLoadState('networkidle', { timeout: 30000 });
            console.log('✅ NetworkIdle alcanzado');
        } catch (error) {
            console.log('⚠️ NetworkIdle timeout, pero continuando (esto es normal en sitios lentos)...');
        }
        
        // Tiempo adicional para asegurar carga completa
        await page.waitForTimeout(5000);
        
        console.log('Entrando a la sección de Programas y Convocatorias. URL actual:', page.url());
        
    } catch (error) {
        console.error('❌ Error en navegación inicial:', (error as Error).message);
        throw error;
    }
}

/**
 * Busca y accede al formulario real de postulación con múltiples estrategias
 */
async function accederAlFormulario(page: Page): Promise<boolean> {
    console.log('🔍 Buscando enlaces de acceso al formulario...');
    
    let formularioAccedido = false;
    
        // Buscar el botón "Inicia tu postulación"
    console.log('🔍 Buscando botón "Inicia tu postulación"...');
    
    // Múltiples selectores para el botón "Inicia tu postulación"
    const selectoresIniciar = [
        'a:has-text("Inicia tu postulación")',
        'button:has-text("Inicia tu postulación")',
        'a:has-text("INICIA TU POSTULACIÓN")',
        'button:has-text("INICIA TU POSTULACIÓN")',
        'a:has-text("Inicia tu postulacion")', // Sin tilde
        'button:has-text("Inicia tu postulacion")', // Sin tilde
        '[onclick*="postulacion"]',
        '[href*="iniciar"]',
        '.btn-iniciar'
    ];
    
    let botonIniciarDirecto = null;
    for (const selector of selectoresIniciar) {
        botonIniciarDirecto = await page.$(selector);
        if (botonIniciarDirecto) {
            console.log(`✅ Botón encontrado con selector: ${selector}`);
            break;
        }
    }
    
    // Si no encuentra con selectores, buscar por texto
    if (!botonIniciarDirecto) {
        const todosLosEnlaces = await page.$$('a, button');
        for (const enlace of todosLosEnlaces) {
            try {
                const texto = await enlace.textContent();
                if (texto && (
                    texto.toLowerCase().includes('inicia tu postulacion') ||
                    texto.toLowerCase().includes('inicia tu postulación') ||
                    texto.toLowerCase().includes('iniciar postulacion') ||
                    texto.toLowerCase().includes('iniciar postulación')
                )) {
                    botonIniciarDirecto = enlace;
                    console.log(`✅ Botón encontrado por texto: "${texto}"`);
                    break;
                }
            } catch (error) {
                continue;
            }
        }
    }

    
    if (botonIniciarDirecto) {
        console.log('✅ Botón "Inicia tu postulación" encontrado! Haciendo clic...');
        
        try {
            await Promise.all([
                page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => console.log('No hubo navegación directa')),
                botonIniciarDirecto.click()
            ]);
            
            await page.waitForTimeout(5000);
            
            // VERIFICAR POSTULACIONES PREVIAS DESPUÉS DE HACER CLIC EN "INICIA TU POSTULACIÓN"
            console.log('🔍 Verificando si ya existe una postulación previa en la página de borradores...');
            console.log(`📍 URL actual: ${page.url()}`);
            
            // Verificar si estamos en la página de borradores (PostuladorBorradores.aspx)
            if (page.url().includes('PostuladorBorradores.aspx')) {
                console.log('📋 Estamos en la página de borradores, buscando postulaciones previas...');
                
                try {
                    // Buscar la tabla que muestra postulaciones existentes
                    const tablaPostulaciones = await page.$('table');
                    
                    if (tablaPostulaciones) {
                        console.log('📋 Tabla de postulaciones encontrada, verificando contenido...');
                        
                        // Buscar el icono de papelera específico de CORFO
                        console.log('🔍 Buscando icono de papelera específico de CORFO...');
                        
                        const selectoresPapelera = [
                            '.ico_sm_papelera',                    // Clase específica del icono
                            '.delPostulacion',                     // Clase del span de eliminar
                            'span.ico_sm_papelera',               // Span con clase papelera
                            'a[data-original-title*="Desistir"]', // Enlace con título "Desistir Postulación"
                            'a[title*="Desistir"]',               // Enlace con atributo title
                            '[data-original-title*="Desistir"]',  // Cualquier elemento con data-original-title
                            'span.delPostulacion'                 // Span con clase delPostulacion
                        ];
                        
                        let iconoPapelera = null;
                        for (const selector of selectoresPapelera) {
                            iconoPapelera = await page.$(selector);
                            if (iconoPapelera) {
                                console.log(`🗑️ Icono de papelera CORFO encontrado con selector: ${selector}`);
                                break;
                            }
                        }
                        
                        // Si no encuentra con selectores específicos, buscar manualmente elementos con data-postulacionid
                        if (!iconoPapelera) {
                            console.log('⚠️ No se encontró con selectores específicos, buscando manualmente...');
                            
                            // Verificar si hay elementos con data-postulacionid (específico de CORFO)
                            const elementosConDataPostulacion = await page.$$('[data-postulacionid]');
                            console.log(`📊 Elementos con data-postulacionid encontrados: ${elementosConDataPostulacion.length}`);
                            
                            for (const elemento of elementosConDataPostulacion) {
                                try {
                                    const dataTitle = await elemento.getAttribute('data-original-title');
                                    const className = await elemento.getAttribute('class');
                                    const tagName = await elemento.evaluate(el => el.tagName);
                                    const dataPostulacionId = await elemento.getAttribute('data-postulacionid');
                                    
                                    console.log(`   Elemento: ${tagName} - clase:"${className}" - título:"${dataTitle}" - postulacionId:"${dataPostulacionId}"`);
                                    
                                    if (dataTitle && dataTitle.includes('Desistir')) {
                                        iconoPapelera = elemento;
                                        console.log(`🗑️ ¡ENCONTRADO! Elemento desistir por data-original-title: ${dataTitle}`);
                                        break;
                                    }
                                    
                                    if (className && (className.includes('papelera') || className.includes('delPostulacion'))) {
                                        iconoPapelera = elemento;
                                        console.log(`🗑️ ¡ENCONTRADO! Elemento por clase: ${className}`);
                                        break;
                                    }
                                } catch (error) {
                                    continue;
                                }
                            }
                        }
                        
                        if (iconoPapelera) {
                            console.log('🗑️ Postulación previa detectada. Eliminando para crear nueva postulación...');
                            
                            // Hacer scroll al icono si es necesario
                            await iconoPapelera.scrollIntoViewIfNeeded();
                            await page.waitForTimeout(500);
                            
                            try {
                                // Hacer clic en el icono de papelera
                                await iconoPapelera.click();
                                console.log('✅ Clic en papelera realizado');
                                
                                // Esperar posible confirmación o modal
                                await page.waitForTimeout(2000);
                                
                                // Buscar y confirmar eliminación con el modal específico de CORFO
                                console.log('🔍 Buscando modal de confirmación de CORFO...');
                                const botonesConfirmacion = [
                                    'button:has-text("Sí, estoy seguro")',      // Botón específico del modal CORFO
                                    'button:has-text("SI, ESTOY SEGURO")',      // Variación en mayúsculas
                                    'button:has-text("Sí")',                    // Versión corta
                                    'button:has-text("SI")',                    // Versión corta en mayúsculas
                                    '.btn:has-text("Sí, estoy seguro")',       // Con clase btn
                                    '.btn:has-text("Sí")',                     // Botón con clase
                                    'input[value*="Sí, estoy seguro"]',        // Como input
                                    'input[value*="Sí"]',                      // Input versión corta
                                    '[onclick*="confirmar"]',                   // Elemento con onclick confirmar
                                    '.btn-danger',                              // Botón rojo de confirmación
                                    '.btn-primary:has-text("Sí")'              // Botón primario con Sí
                                ];
                                
                                let confirmacionEncontrada = false;
                                for (const selectorConfirm of botonesConfirmacion) {
                                    const botonConfirm = await page.$(selectorConfirm);
                                    if (botonConfirm) {
                                        console.log(`✅ Confirmando eliminación con: ${selectorConfirm}`);
                                        await botonConfirm.click();
                                        confirmacionEncontrada = true;
                                        break;
                                    }
                                }
                                
                                if (!confirmacionEncontrada) {
                                    console.log('ℹ️ No se encontró modal de confirmación, asumiendo eliminación directa');
                                }
                                
                                // Esperar a que se actualice la página después de eliminar
                                await page.waitForTimeout(3000);
                                
                                console.log('✅ Postulación previa eliminada exitosamente');
                                
                            } catch (error) {
                                console.log('❌ Error al eliminar postulación previa:', (error as Error).message);
                            }
                        } else {
                            console.log('ℹ️ No se encontró icono de papelera, no hay postulaciones previas para eliminar');
                        }
                    } else {
                        console.log('ℹ️ No se encontró tabla de postulaciones previas');
                    }
                } catch (error) {
                    console.log('⚠️ Error al verificar postulaciones previas:', (error as Error).message);
                }
                
                // Después de manejar postulaciones previas, buscar el botón "Nueva Postulación"
                console.log('🔍 Buscando botón "Nueva Postulación" o similar...');
                
                const selectoresNuevaPostulacion = [
                    'button:has-text("Nueva Postulación")',
                    'button:has-text("NUEVA POSTULACIÓN")',
                    'a:has-text("Nueva Postulación")',
                    'a:has-text("NUEVA POSTULACIÓN")',
                    'input[value*="Nueva"]',
                    'input[value*="NUEVA"]',
                    '.btn:has-text("Nueva")',
                    '[onclick*="nueva"]',
                    '[onclick*="NUEVA"]'
                ];
                
                let botonNuevaPostulacion = null;
                for (const selector of selectoresNuevaPostulacion) {
                    botonNuevaPostulacion = await page.$(selector);
                    if (botonNuevaPostulacion) {
                        console.log(`✅ Botón "Nueva Postulación" encontrado: ${selector}`);
                        break;
                    }
                }
                
                if (botonNuevaPostulacion) {
                    console.log('🔄 Haciendo clic en "Nueva Postulación"...');
                    await Promise.all([
                        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => console.log('No hubo navegación en Nueva Postulación')),
                        botonNuevaPostulacion.click()
                    ]);
                    
                    await page.waitForTimeout(5000);
                }
            }
            
            const camposDirectos = await page.$$('input, select, textarea');
            if (camposDirectos.length > 0) {
                console.log(`✅ Formulario accedido exitosamente! Campos encontrados: ${camposDirectos.length}`);
                return true;
            }
        } catch (error) {
            console.log('❌ Error al hacer clic en botón directo:', (error as Error).message);
        }
    }

     

    
    // Intentar diferentes formas de acceder al formulario
    const enlacesPosibles = [
        // Específico para el botón "Inicia tu postulación"
        'a:has-text("Inicia tu postulación")',
        'a:has-text("INICIA TU POSTULACIÓN")',
        'button:has-text("Inicia tu postulación")',
        'button:has-text("INICIA TU POSTULACIÓN")',
        '[onclick*="postulacion"]',
        '[href*="postulacion"]',
        '.btn:has-text("Inicia")',
        // Enlaces de postulación generales
        'a[href*="javascript:disparo"][href*="Postular"]',
        'a:has-text("Postular")',
        'a:has-text("POSTULAR")', 
        'a[href*="postulacion"]',
        'a[href*="formulario"]',
        '.btn-postular',
        'input[value*="Postular"]',
        'button:has-text("Postular")'
    ];
    
    for (const selector of enlacesPosibles) {
        try {
            console.log(`   Probando selector: ${selector}`);
            const enlace = await page.$(selector);
            if (enlace) {
                console.log(`✅ Enlace encontrado: ${selector}`);
                
                // Intentar hacer clic y esperar navegación
                await Promise.all([
                    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => console.log('No hubo navegación')),
                    enlace.click()
                ]);
                
                await page.waitForTimeout(5000);
                
                // Verificar si ahora hay campos de formulario
                let camposEncontrados = await page.$$('input, select, textarea');
                
                // Si no hay campos, buscar el botón "Inicia tu postulación"
                if (camposEncontrados.length === 0) {
                    console.log('🔍 Buscando botón "Inicia tu postulación"...');
                    
                    const botonIniciar = await page.$('a:has-text("Inicia tu postulación"), button:has-text("Inicia tu postulación"), a:has-text("INICIA TU POSTULACIÓN"), button:has-text("INICIA TU POSTULACIÓN")');
                    
                    if (botonIniciar) {
                        console.log('✅ Botón "Inicia tu postulación" encontrado! Haciendo clic...');
                        
                        await Promise.all([
                            page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => console.log('No hubo navegación al hacer clic en Inicia tu postulación')),
                            botonIniciar.click()
                        ]);
                        
                        await page.waitForTimeout(5000);
                        
                        // Verificar campos después de hacer clic en "Inicia tu postulación"
                        camposEncontrados = await page.$$('input, select, textarea');
                        console.log(`📝 Campos encontrados después de "Inicia tu postulación": ${camposEncontrados.length}`);
                    }
                }
                
                if (camposEncontrados.length > 0) {
                    console.log(`✅ Formulario accedido exitosamente! Campos encontrados: ${camposEncontrados.length}`);
                    formularioAccedido = true;
                    break;
                } else {
                    console.log(`⚠️ No se encontraron campos después de hacer clic en ${selector}`);
                }
            }
        } catch (error) {
            console.log(`   ❌ Error con selector ${selector}:`, (error as Error).message);
        }
    }
    
    // Si no accedió al formulario, intentar buscar iframes
    if (!formularioAccedido) {
        console.log('🔍 Buscando formulario en iframes...');
        
        const frames = page.frames();
        for (let i = 0; i < frames.length; i++) {
            try {
                const frame = frames[i];
                const frameUrl = frame.url();
                console.log(`   Revisando frame ${i + 1}: ${frameUrl}`);
                
                if (frameUrl.includes('formulario') || frameUrl.includes('postulacion')) {
                    const camposFrame = await frame.$$('input, select, textarea');
                    if (camposFrame.length > 0) {
                        console.log(`✅ Formulario encontrado en frame! Campos: ${camposFrame.length}`);
                        // Cambiar el contexto al frame
                        await frame.waitForLoadState('domcontentloaded');
                        formularioAccedido = true;
                        break;
                    }
                }
            } catch (error) {
                console.log(`   Error revisando frame ${i + 1}:`, (error as Error).message);
            }
        }
    }
    
    // Si aún no encuentra formulario, buscar elementos ocultos o dinámicos
    if (!formularioAccedido) {
        console.log('🔍 Buscando elementos de formulario ocultos o dinámicos...');
        
        // Intentar hacer scroll para activar contenido dinámico
        await page.evaluate(() => {
            window.scrollTo(0, document.body.scrollHeight);
        });
        await page.waitForTimeout(3000);
        
        // Buscar de nuevo
        const camposOcultos = await page.$$('input, select, textarea');
        if (camposOcultos.length > 0) {
            console.log(`✅ Campos encontrados después del scroll: ${camposOcultos.length}`);
            formularioAccedido = true;
        }
    }
    
    if (!formularioAccedido) {
        console.log('⚠️ No se pudo acceder al formulario real. Continuando con análisis de la página actual...');
    }
    
    return formularioAccedido;
}

/**
 * FASE 1: ANÁLISIS PROFUNDO DEL FORMULARIO
 * Extrae todos los campos de todos los pasos y secciones expandibles
 */
export async function analizarFormularioCompleto(): Promise<AnalisisFormularioCompleto | null> {
    console.log('🔍 INICIANDO ANÁLISIS PROFUNDO DEL FORMULARIO');
    
    const browser: Browser = await chromium.launch({
        headless: false
    });

    try {
        const page: Page = await browser.newPage();
        
        // Realizar login y navegar al formulario
        await login(page);
        await navegarAConvocatorias(page);
        
        const primerMasInfoLink = await buscarPrimerMasInformacion(page);
        if (!primerMasInfoLink) {
            console.log('❌ No se encontró ningún formulario');
            return null;
        }
        
        // Acceder al formulario
        const href = await primerMasInfoLink.getAttribute('href');
        const urlCompleta = href!.startsWith('http') ? href! : `https://www.corfo.cl${href}`;
        await page.goto(urlCompleta, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(2000);
        
        await accederAlFormulario(page);
        
        console.log('📋 Iniciando análisis profundo de todos los pasos...');
        
        // Analizar todos los pasos del formulario
        const pasos = await analizarTodosLosPasos(page);
        
        // Generar estadísticas
        const totalCampos = pasos.reduce((total, paso) => total + paso.totalCampos, 0);
        const camposPorTipo = calcularCamposPorTipo(pasos);
        
        const analisis: AnalisisFormularioCompleto = {
            titulo: await page.title(),
            urlInicial: page.url(),
            fechaAnalisis: new Date().toISOString(),
            pasos: pasos,
            totalPasos: pasos.length,
            totalCampos: totalCampos,
            camposPorTipo: camposPorTipo,
            resumen: generarResumenAnalisis(pasos, totalCampos, camposPorTipo)
        };
        
        // Guardar reporte en texto
        await guardarReporteTexto(analisis);
        
        console.log('✅ ANÁLISIS PROFUNDO COMPLETADO');
        console.log(`📊 Total pasos analizados: ${pasos.length}`);
        console.log(`📝 Total campos encontrados: ${totalCampos}`);
        
        return analisis;
        
    } catch (error) {
        console.error('❌ Error en análisis profundo:', error);
        throw error;
    } finally {
        await browser.close();
    }
}

/**
 * Analiza todos los pasos del formulario de manera secuencial
 */
async function analizarTodosLosPasos(page: Page): Promise<PasoFormularioProfundo[]> {
    const pasos: PasoFormularioProfundo[] = [];
    let pasoActual = 1;
    let hayMasPasos = true;
    
    while (hayMasPasos) {
        console.log(`\n🔍 ANALIZANDO PASO ${pasoActual}`);
        
        // Obtener información del paso actual
        const nombrePaso = await obtenerNombrePasoActual(page);
        console.log(`📋 Paso ${pasoActual}: "${nombrePaso}"`);
        
        // Hacer scroll para cargar todo el contenido
        await scrollCompletoPagina(page);
        
        // Buscar y expandir todas las secciones
        const seccionesExpandibles = await buscarYExpandirSecciones(page);
        
        // Extraer campos directos (no en secciones expandibles)
        const camposDirectos = await extraerCamposDirectos(page);
        
        const totalCampos = camposDirectos.length + 
            seccionesExpandibles.reduce((total, seccion) => total + seccion.campos.length, 0);
        
        const paso: PasoFormularioProfundo = {
            numero: pasoActual,
            nombre: nombrePaso,
            url: page.url(),
            camposDirectos: camposDirectos,
            seccionesExpandibles: seccionesExpandibles,
            totalCampos: totalCampos,
            completado: true
        };
        
        pasos.push(paso);
        
        console.log(`✅ Paso ${pasoActual} completado:`);
        console.log(`   📝 Campos directos: ${camposDirectos.length}`);
        console.log(`   📂 Secciones expandibles: ${seccionesExpandibles.length}`);
        console.log(`   🔢 Total campos: ${totalCampos}`);
        
        // Verificar si hay más pasos
        hayMasPasos = await navegarAlSiguientePaso(page);
        if (hayMasPasos) {
            pasoActual++;
            await page.waitForTimeout(3000); // Esperar que cargue el siguiente paso
        }
        
        // Limitar a 20 pasos para evitar bucles infinitos
        if (pasoActual > 20) {
            console.log('⚠️ Límite de pasos alcanzado (20)');
            break;
        }
    }
    
    return pasos;
}

/**
 * Obtiene el nombre del paso actual del formulario
 */
async function obtenerNombrePasoActual(page: Page): Promise<string> {
    try {
        // Intentar diferentes selectores para obtener el nombre del paso
        const selectoresNombre = [
            'h1', 'h2', 'h3',
            '.step-title', '.phase-title', '.section-title',
            '.paso-actual', '.current-step',
            '[class*="titulo"]', '[class*="title"]',
            '.breadcrumb-item.active',
            '.nav-pills .active',
            '.nav-tabs .active'
        ];
        
        for (const selector of selectoresNombre) {
            const elemento = await page.$(selector);
            if (elemento) {
                const texto = await elemento.textContent();
                if (texto && texto.trim().length > 0 && texto.trim().length < 100) {
                    return texto.trim();
                }
            }
        }
        
                 // Si no encuentra título específico, buscar en el progreso visual
         const pasoVisual = await page.evaluate(() => {
             // Buscar elementos que podrían indicar el paso actual
             const elementos = document.querySelectorAll('.step, .phase, [class*="paso"], [class*="step"]');
             for (let i = 0; i < elementos.length; i++) {
                 const elemento = elementos[i];
                 if (elemento.classList.contains('active') || 
                     elemento.classList.contains('current') ||
                     elemento.classList.contains('selected')) {
                     return elemento.textContent?.trim() || '';
                 }
             }
             return '';
         });
        
        if (pasoVisual) return pasoVisual;
        
        // Fallback: usar título de la página o URL
        const titulo = await page.title();
        return titulo || `Paso ${Date.now()}`;
        
    } catch (error) {
        console.log('⚠️ Error al obtener nombre del paso:', (error as Error).message);
        return `Paso ${Date.now()}`;
    }
}

/**
 * Hace scroll completo de la página para cargar todo el contenido
 */
async function scrollCompletoPagina(page: Page): Promise<void> {
    console.log('📜 Haciendo scroll completo para cargar todo el contenido...');
    
    await page.evaluate(async () => {
        // Scroll hasta el final gradualmente
        await new Promise<void>((resolve) => {
            let totalHeight = 0;
            const distance = 200;
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;
                
                if (totalHeight >= scrollHeight) {
                    clearInterval(timer);
                    // Scroll de vuelta al inicio
                    window.scrollTo(0, 0);
                    setTimeout(resolve, 1000);
                }
            }, 100);
        });
    });
}

/**
 * Busca y expande todas las secciones expandibles en el paso actual
 */
async function buscarYExpandirSecciones(page: Page): Promise<SeccionExpandible[]> {
    console.log('🔍 Buscando secciones expandibles...');
    
    const secciones: SeccionExpandible[] = [];
    
    // Selectores para elementos expandibles
    const selectoresExpandibles = [
        // Accordions y collapsibles
        '.accordion-header', '.accordion-toggle',
        '.collapse-toggle', '.collapsible',
        '[data-toggle="collapse"]', '[data-bs-toggle="collapse"]',
        
        // Tabs y pestañas
        '.nav-tabs a', '.nav-pills a',
        '.tab-header', '.tab-toggle',
        
        // Botones de expansión
        'button[aria-expanded]', '[role="button"][aria-expanded]',
        '.expand-button', '.toggle-button',
        
        // Elementos clickeables con texto específico
        '*:has-text("RECOMENDACIONES")', '*:has-text("DOCUMENTOS")',
        '*:has-text("AUTORIZACIÓN")', '*:has-text("BASES")',
        '*:has-text("DETALLES")', '*:has-text("MÁS INFORMACIÓN")'
    ];
    
    const elementosExpandibles = await page.$$('button, a, div, span, h1, h2, h3, h4, h5, h6');
    
    for (const elemento of elementosExpandibles) {
        try {
            const texto = await elemento.textContent();
            const className = await elemento.getAttribute('class') || '';
            const dataToggle = await elemento.getAttribute('data-toggle') || '';
            const ariaExpanded = await elemento.getAttribute('aria-expanded');
            
            // Verificar si es un elemento expandible
            const esExpandible = 
                dataToggle.includes('collapse') ||
                className.includes('accordion') ||
                className.includes('collapse') ||
                className.includes('toggle') ||
                ariaExpanded !== null ||
                (texto && (
                    texto.includes('RECOMENDACIONES') ||
                    texto.includes('DOCUMENTOS') ||
                    texto.includes('AUTORIZACIÓN') ||
                    texto.includes('BASES') ||
                    texto.includes('DETALLES')
                ));
            
            if (esExpandible && texto && texto.trim().length > 0) {
                console.log(`   📂 Encontrada sección expandible: "${texto.trim()}"`);
                
                // Intentar expandir la sección
                const camposAntes = await page.$$('input, select, textarea');
                await elemento.click();
                await page.waitForTimeout(1500); // Esperar animación
                
                // Verificar si se expandió (comparar número de campos)
                const camposDespues = await page.$$('input, select, textarea');
                const seExpandio = camposDespues.length > camposAntes.length;
                
                if (seExpandio) {
                    // Extraer campos de la sección expandida
                    const camposSeccion = await extraerCamposDeSeccionExpandida(page, elemento);
                    
                    const seccion: SeccionExpandible = {
                        nombre: texto.trim(),
                        selector: await elemento.evaluate(el => el.tagName + (el.className ? '.' + el.className.replace(/\s+/g, '.') : '')),
                        expandida: true,
                        campos: camposSeccion
                    };
                    
                    secciones.push(seccion);
                    console.log(`   ✅ Sección expandida: ${camposSeccion.length} campos encontrados`);
                } else {
                    console.log(`   ⚠️ Sección no se expandió o ya estaba expandida`);
                }
            }
        } catch (error) {
            // Continuar con el siguiente elemento si hay error
            continue;
        }
    }
    
    console.log(`📂 Total secciones expandibles encontradas: ${secciones.length}`);
    return secciones;
}

/**
 * Extrae campos que no están en secciones expandibles
 */
async function extraerCamposDirectos(page: Page): Promise<CampoFormulario[]> {
    console.log('📝 Extrayendo campos directos...');
    
    const campos = await page.$$eval('input, select, textarea, button[type="submit"]', (elements) => {
        return elements.map(el => {
            const element = el as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLButtonElement;
            
            // Verificar si el elemento está visible
            const rect = element.getBoundingClientRect();
            const style = window.getComputedStyle(element);
            const isVisible = style.display !== 'none' && 
                             style.visibility !== 'hidden' && 
                             rect.width > 0 && rect.height > 0 &&
                             parseFloat(style.opacity) > 0;
            
            if (!isVisible || element.type === 'hidden') return null;
            
            // Buscar etiqueta asociada
            let label = '';
            
            // Estrategia 1: Label con 'for'
            if (element.id) {
                const labelEl = document.querySelector(`label[for="${element.id}"]`);
                if (labelEl) label = labelEl.textContent?.trim() || '';
            }
            
            // Estrategia 2: Label padre
            if (!label) {
                const parentLabel = element.closest('label');
                if (parentLabel) {
                    label = parentLabel.textContent?.replace(element.value || '', '').trim() || '';
                }
            }
            
            // Estrategia 3: Texto anterior
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
            
            // Estrategia 4: Placeholder
            if (!label && 'placeholder' in element) {
                label = (element as HTMLInputElement).placeholder || '';
            }
            
            // Estrategia 5: Contenedor padre
            if (!label) {
                const container = element.closest('div, td, th, li, fieldset');
                if (container) {
                    const allText = container.textContent?.trim() || '';
                    const lines = allText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
                    if (lines.length > 0) {
                        label = lines[0].substring(0, 100); // Limitar longitud
                    }
                }
            }
            
            // Determinar tipo
            let tipo = element.tagName.toLowerCase();
            if (tipo === 'input') {
                tipo = (element as HTMLInputElement).type || 'text';
            }
            
            // Extraer opciones para selects
            let opciones: string[] = [];
            if (element.tagName.toLowerCase() === 'select') {
                const selectEl = element as HTMLSelectElement;
                opciones = Array.from(selectEl.options).map(option => option.text);
            }
            
            // Detectar si es requerido
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
    
    console.log(`📝 Campos directos encontrados: ${campos.length}`);
    return campos as CampoFormulario[];
}

/**
 * Extrae campos de una sección que acaba de ser expandida
 */
async function extraerCamposDeSeccionExpandida(page: Page, elementoExpandido: any): Promise<CampoFormulario[]> {
    // Similar a extraerCamposDirectos pero enfocado en el área expandida
    // Por ahora retornamos campos generales, se puede refinar para buscar solo en el área específica
    await page.waitForTimeout(1000);
    return await extraerCamposDirectos(page);
}

/**
 * Intenta navegar al siguiente paso del formulario
 */
async function navegarAlSiguientePaso(page: Page): Promise<boolean> {
    console.log('➡️ Intentando navegar al siguiente paso...');
    
    const selectoresSiguiente = [
        'button:has-text("SIGUIENTE")', 'button:has-text("Siguiente")',
        'input[value*="iguiente"]', 'input[value*="IGUIENTE"]',
        'button:has-text("CONTINUAR")', 'button:has-text("Continuar")',
        'a:has-text("Siguiente")', 'a:has-text("SIGUIENTE")',
        '.btn-next', '[class*="next"]', '.siguiente',
        'button[type="submit"]:not([value*="Enviar"]):not([value*="ENVIAR"])'
    ];
    
    for (const selector of selectoresSiguiente) {
        try {
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
                
                console.log(`   🖱️ Haciendo clic en: "${texto || value}"`);
                
                const urlAntes = page.url();
                
                try {
                    await Promise.all([
                        page.waitForNavigation({ 
                            waitUntil: 'domcontentloaded', 
                            timeout: 10000 
                        }).catch(() => console.log('No hubo navegación')),
                        boton.click()
                    ]);
                } catch {
                    // Si no hay navegación, simplemente hacer clic
                    await boton.click();
                    await page.waitForTimeout(2000);
                }
                
                const urlDespues = page.url();
                
                // Verificar si cambió la página o el contenido
                if (urlAntes !== urlDespues) {
                    console.log('   ✅ Navegación exitosa a siguiente paso');
                    return true;
                }
                
                // Verificar si cambió el contenido aunque no haya cambiado la URL
                const tituloActual = await obtenerNombrePasoActual(page);
                if (tituloActual) {
                    console.log('   ✅ Contenido actualizado, siguiente paso cargado');
                    return true;
                }
            }
        } catch (error) {
            continue;
        }
    }
    
    console.log('   ℹ️ No se encontró botón para siguiente paso o llegamos al final');
    return false;
}

/**
 * Calcula estadísticas de campos por tipo
 */
function calcularCamposPorTipo(pasos: PasoFormularioProfundo[]): { [tipo: string]: number } {
    const contadores: { [tipo: string]: number } = {};
    
    for (const paso of pasos) {
        // Contar campos directos
        for (const campo of paso.camposDirectos) {
            contadores[campo.tipo] = (contadores[campo.tipo] || 0) + 1;
        }
        
        // Contar campos de secciones expandibles
        for (const seccion of paso.seccionesExpandibles) {
            for (const campo of seccion.campos) {
                contadores[campo.tipo] = (contadores[campo.tipo] || 0) + 1;
            }
        }
    }
    
    return contadores;
}

/**
 * Genera un resumen textual del análisis
 */
function generarResumenAnalisis(
    pasos: PasoFormularioProfundo[], 
    totalCampos: number, 
    camposPorTipo: { [tipo: string]: number }
): string {
    let resumen = '='.repeat(80) + '\n';
    resumen += 'RESUMEN DEL ANÁLISIS PROFUNDO DEL FORMULARIO CORFO\n';
    resumen += '='.repeat(80) + '\n\n';
    
    resumen += `📊 ESTADÍSTICAS GENERALES:\n`;
    resumen += `   • Total de pasos analizados: ${pasos.length}\n`;
    resumen += `   • Total de campos encontrados: ${totalCampos}\n`;
    resumen += `   • Fecha de análisis: ${new Date().toLocaleString()}\n\n`;
    
    resumen += `📈 DISTRIBUCIÓN POR TIPO DE CAMPO:\n`;
    for (const [tipo, cantidad] of Object.entries(camposPorTipo)) {
        resumen += `   • ${tipo}: ${cantidad} campos\n`;
    }
    resumen += '\n';
    
    resumen += `📋 DESGLOSE POR PASOS:\n`;
    for (const paso of pasos) {
        resumen += `   ${paso.numero}. ${paso.nombre}\n`;
        resumen += `      - Campos directos: ${paso.camposDirectos.length}\n`;
        resumen += `      - Secciones expandibles: ${paso.seccionesExpandibles.length}\n`;
        resumen += `      - Total campos: ${paso.totalCampos}\n`;
        if (paso.seccionesExpandibles.length > 0) {
            for (const seccion of paso.seccionesExpandibles) {
                resumen += `        📂 ${seccion.nombre}: ${seccion.campos.length} campos\n`;
            }
        }
        resumen += '\n';
    }
    
    return resumen;
}

/**
 * Guarda el reporte completo en formato texto
 */
async function guardarReporteTexto(analisis: AnalisisFormularioCompleto): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const nombreArchivo = `analisis_formulario_${timestamp}.txt`;
    const rutaArchivo = path.join(__dirname, '../data', nombreArchivo);
    
    let reporte = analisis.resumen;
    
    reporte += '\n' + '='.repeat(80) + '\n';
    reporte += 'DETALLE COMPLETO DE CAMPOS POR PASO\n';
    reporte += '='.repeat(80) + '\n\n';
    
    for (const paso of analisis.pasos) {
        reporte += `${'='.repeat(40)}\n`;
        reporte += `PASO ${paso.numero}: ${paso.nombre}\n`;
        reporte += `URL: ${paso.url}\n`;
        reporte += `${'='.repeat(40)}\n\n`;
        
        if (paso.camposDirectos.length > 0) {
            reporte += `📝 CAMPOS DIRECTOS (${paso.camposDirectos.length}):\n`;
            reporte += '-'.repeat(40) + '\n';
            for (let i = 0; i < paso.camposDirectos.length; i++) {
                const campo = paso.camposDirectos[i];
                reporte += `${i + 1}. [${campo.tipo.toUpperCase()}] ${campo.label}\n`;
                reporte += `   Nombre: ${campo.nombre}\n`;
                reporte += `   Requerido: ${campo.requerido ? 'Sí' : 'No'}\n`;
                if (campo.opciones && campo.opciones.length > 0) {
                    reporte += `   Opciones: ${campo.opciones.join(', ')}\n`;
                }
                reporte += '\n';
            }
        }
        
        for (const seccion of paso.seccionesExpandibles) {
            reporte += `📂 SECCIÓN: ${seccion.nombre} (${seccion.campos.length} campos)\n`;
            reporte += '-'.repeat(40) + '\n';
            for (let i = 0; i < seccion.campos.length; i++) {
                const campo = seccion.campos[i];
                reporte += `${i + 1}. [${campo.tipo.toUpperCase()}] ${campo.label}\n`;
                reporte += `   Nombre: ${campo.nombre}\n`;
                reporte += `   Requerido: ${campo.requerido ? 'Sí' : 'No'}\n`;
                if (campo.opciones && campo.opciones.length > 0) {
                    reporte += `   Opciones: ${campo.opciones.join(', ')}\n`;
                }
                reporte += '\n';
            }
        }
        
        reporte += '\n';
    }
    
    // Agregar información técnica
    reporte += '\n' + '='.repeat(80) + '\n';
    reporte += 'INFORMACIÓN TÉCNICA\n';
    reporte += '='.repeat(80) + '\n\n';
    reporte += `Archivo generado: ${nombreArchivo}\n`;
    reporte += `Timestamp: ${analisis.fechaAnalisis}\n`;
    reporte += `URL inicial: ${analisis.urlInicial}\n`;
    reporte += `Título del formulario: ${analisis.titulo}\n\n`;
    
    await fs.writeFile(rutaArchivo, reporte, 'utf-8');
    console.log(`📄 Reporte guardado en: ${rutaArchivo}`);
}

// Si el archivo se ejecuta directamente, verificar argumentos para decidir qué función ejecutar
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.includes('--analisis-profundo') || args.includes('--deep-analysis')) {
        console.log('🔍 Ejecutando análisis profundo del formulario...');
        analizarFormularioCompleto()
            .then((analisis) => {
                if (analisis) {
                    console.log('\n✅ Análisis profundo completado exitosamente');
                    console.log(`📊 Se analizaron ${analisis.totalPasos} pasos con ${analisis.totalCampos} campos`);
                } else {
                    console.log('\n❌ No se pudo realizar el análisis profundo');
                }
                process.exit(0);
            })
            .catch((error) => {
                console.error('❌ Error en análisis profundo:', error);
                process.exit(1);
            });
    } else {
        console.log('🔍 Ejecutando extracción básica del formulario...');
        console.log('💡 Para análisis profundo, use: npm run scraping -- --analisis-profundo');
        
        extraerPrimerFormularioMultiFase()
            .then((formulario) => {
                if (formulario) {
                    console.log('\n✅ Extracción completada exitosamente');
                } else {
                    console.log('\n❌ No se pudo extraer ningún formulario');
                }
                process.exit(0);
            })
            .catch((error) => {
                console.error('❌ Error:', error);
                process.exit(1);
            });
    }
} 