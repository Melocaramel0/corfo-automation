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

// Interfaz para tipar los datos de los formularios
interface Formulario {
    titulo: string;
    url: string;
    descripcion?: string;
}

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
 * Extrae los formularios disponibles de la página de Corfo
 * @returns Promise<Formulario[]> Array con los datos de los formularios encontrados
 */
export async function extraerFormularios(): Promise<Formulario[]> {
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

        // Encontrar todas las convocatorias
        const convocatorias = await page.$$('.views-row');
        console.log(`Se encontraron ${convocatorias.length} convocatorias`);
        
        const formularios: Formulario[] = [];
        
        // Procesar cada convocatoria
        for (let i = 0; i < convocatorias.length; i++) {
            try {
                console.log(`\nProcesando convocatoria ${i + 1} de ${convocatorias.length}`);
                
                // Click en "Más información"
                const masInfoButton = await convocatorias[i].$('button:has-text("Más información")');
                if (!masInfoButton) {
                    console.log('No se encontró el botón "Más información" para esta convocatoria');
                    continue;
                }
                
                await masInfoButton.click();
                await page.waitForLoadState('networkidle');
                await page.waitForTimeout(2000);
                
                // Click en "Inicia tu postulación"
                const postulacionButton = await page.$('button:has-text("Inicia tu postulación")');
                if (!postulacionButton) {
                    console.log('No se encontró el botón "Inicia tu postulación" para esta convocatoria');
                    await page.goBack();
                    continue;
                }
                
                await postulacionButton.click();
                await page.waitForLoadState('networkidle');
                await page.waitForTimeout(2000);
                
                // Extraer información del formulario
                const titulo = await page.title();
                const url = page.url();
                const descripcion = await page.$eval('meta[name="description"]', el => el.getAttribute('content'))
                    .catch(() => undefined) || undefined;
                
                formularios.push({
                    titulo,
                    url,
                    descripcion
                });
                
                console.log(`Formulario encontrado: ${titulo}`);
                
                // Regresar a la página anterior
                await page.goBack();
                await page.waitForLoadState('networkidle');
                await page.waitForTimeout(2000);
                
            } catch (error) {
                console.error(`Error procesando convocatoria ${i + 1}:`, error);
                // Intentar regresar a la página anterior en caso de error
                try {
                    await page.goBack();
                    await page.waitForLoadState('networkidle');
                } catch (e) {
                    console.error('Error al regresar a la página anterior:', e);
                }
            }
        }

        // Guardar los resultados en un archivo JSON
        const outputPath = path.join(__dirname, '../data/formularios.json');
        await fs.writeFile(outputPath, JSON.stringify(formularios, null, 2), 'utf-8');
        
        console.log(`\nSe encontraron ${formularios.length} formularios`);
        console.log(`Los resultados se han guardado en: ${outputPath}`);
        
        // Mostrar los primeros 3 formularios encontrados para debug
        if (formularios.length > 0) {
            console.log('\nPrimeros 3 formularios encontrados:');
            formularios.slice(0, 3).forEach((form, index) => {
                console.log(`\n${index + 1}. ${form.titulo}`);
                console.log(`   URL: ${form.url}`);
                if (form.descripcion) console.log(`   Descripción: ${form.descripcion}`);
            });
        }
        
        return formularios;
    } catch (error) {
        console.error('Error al extraer los formularios:', error);
        throw error;
    } finally {
        // Cerrar el navegador
        await browser.close();
    }
}

// Si el archivo se ejecuta directamente, ejecutar la función
if (require.main === module) {
    extraerFormularios()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error('Error:', error);
            process.exit(1);
        });
} 