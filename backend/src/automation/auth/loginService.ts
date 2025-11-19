import { Page, Frame } from 'playwright';
import * as dotenv from 'dotenv';
import { WaitUtils } from '../utils/waitUtils';
import * as path from 'path';
import * as fs from 'fs/promises';

dotenv.config();

export class LoginService {
    private page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    async realizarLogin(): Promise<void> {
        console.log('   🔍 Buscando interfaz de login...');
        
        // Verificar que las credenciales estén disponibles
        if (!process.env.CORFO_USER || !process.env.CORFO_PASS) {
            throw new Error('Variables de entorno CORFO_USER o CORFO_PASS no están definidas');
        }
        
        // SOLUCIÓN: Leer el .env directamente si existe (para Docker donde env_file puede truncar valores)
        const possibleEnvPaths = [
            '/app/.env',                                 // Ruta mapeada en Docker (prioridad)
            path.join(process.cwd(), '.env'),           // Ruta estándar
            path.join(process.cwd(), 'backend', '.env'), // Si estamos en la raíz del proyecto
            path.join('/app', 'backend', '.env')         // Ruta alternativa en Docker
        ];
        
        for (const envPath of possibleEnvPaths) {
            try {
                const envExists = await fs.access(envPath).then(() => true).catch(() => false);
                if (envExists) {
                    const envContent = await fs.readFile(envPath, 'utf-8');
                    const envLines = envContent.split('\n');
                    
                    // Buscar y actualizar CORFO_PASS si existe en el archivo
                    const corfoPassLine = envLines.find(line => line.trim().startsWith('CORFO_PASS=') && !line.trim().startsWith('#'));
                    if (corfoPassLine) {
                        const match = corfoPassLine.match(/CORFO_PASS\s*=\s*(.+)/);
                        if (match) {
                            let passFromFile = match[1].trim();
                            // Remover comillas si las hay
                            if ((passFromFile.startsWith('"') && passFromFile.endsWith('"')) ||
                                (passFromFile.startsWith("'") && passFromFile.endsWith("'"))) {
                                passFromFile = passFromFile.slice(1, -1);
                            }
                            // Solo actualizar si la longitud es diferente (indica que Docker truncó el valor)
                            if (passFromFile.length !== (process.env.CORFO_PASS || '').length) {
                                process.env.CORFO_PASS = passFromFile;
                            }
                        }
                    }
                    
                    // Buscar y actualizar CORFO_USER si existe en el archivo
                    const corfoUserLine = envLines.find(line => line.trim().startsWith('CORFO_USER=') && !line.trim().startsWith('#'));
                    if (corfoUserLine) {
                        const match = corfoUserLine.match(/CORFO_USER\s*=\s*(.+)/);
                        if (match) {
                            let userFromFile = match[1].trim();
                            if ((userFromFile.startsWith('"') && userFromFile.endsWith('"')) ||
                                (userFromFile.startsWith("'") && userFromFile.endsWith("'"))) {
                                userFromFile = userFromFile.slice(1, -1);
                            }
                            if (userFromFile.length !== (process.env.CORFO_USER || '').length) {
                                process.env.CORFO_USER = userFromFile;
                            }
                        }
                    }
                    break;
                }
            } catch (error) {
                // Continuar con la siguiente ruta
                continue;
            }
        }
        
        // Limpiar valores (eliminar espacios y saltos de línea)
        const userClean = (process.env.CORFO_USER || '').trim();
        const passClean = (process.env.CORFO_PASS || '').trim().replace(/[\n\r]/g, '');
        
        // MÉTODO 1: Interfaz nueva con enlace "¿Tienes clave Corfo?"
        // Esperar adaptativamente a que el enlace aparezca y esté visible
        try {
            console.log('   🔍 Intentando método 1: Enlace "¿Tienes clave Corfo?"...');
            const mostrarLink = await this.page.waitForSelector('#mostrarCorfoLoginLink', { 
                state: 'visible', 
                timeout: 10000 
            }).catch(() => null);
            
            if (mostrarLink) {
                console.log('   ✅ Enlace encontrado, haciendo clic...');
                await mostrarLink.click();
                
                // Espera adaptativa después del clic
                await WaitUtils.esperarDespuesDeClick(this.page, 3000);
                
                // Esperar a que aparezca el bloque de login
                console.log('   ⏳ Esperando que aparezca el bloque de login...');
                await this.page.waitForSelector('#bloqueCorfoLogin', { state: 'visible', timeout: 15000 });
                console.log('   ✅ Bloque de login visible');
                
                // Esperar a que los campos estén visibles
                await this.page.waitForSelector('#rut', { state: 'visible', timeout: 10000 });
                await this.page.waitForSelector('#pass', { state: 'visible', timeout: 10000 });
                
                console.log('   📝 Completando campos de login...');
                await this.page.fill('#rut', userClean);
                await this.page.fill('#pass', passClean);
                console.log('   ✅ Campos completados');
                
                // Esperar un momento para que los valores se establezcan completamente
                await this.page.waitForTimeout(500);
                
                console.log('   🔍 Esperando botón de login...');
                const botonLogin = await this.page.waitForSelector('#ingresa_', { state: 'visible', timeout: 10000 });
                console.log('   ✅ Botón de login encontrado');
                
                // Guardar URL antes del clic
                const urlAntesClic = this.page.url();
                
                // Intentar múltiples métodos para enviar el formulario
                console.log('   🔄 Enviando formulario de login...');
                
                // MÉTODO 1: Hacer clic en el botón (método estándar)
                let loginExitoso = false;
                try {
                    console.log('   🔄 Método 1: Clic en botón...');
                    
                    // Crear promesas para esperar diferentes indicadores de éxito
                    const promesasNavegacion = [
                        // Opción 1: Navegación completa
                        this.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => null),
                        // Opción 2: Cambio de URL
                        this.page.waitForFunction(
                            (urlAntes) => window.location.href !== urlAntes,
                            urlAntesClic,
                            { timeout: 10000 }
                        ).catch(() => null),
                        // Opción 3: Elementos de login desaparecen
                        this.page.waitForSelector('#bloqueCorfoLogin', { state: 'hidden', timeout: 10000 }).catch(() => null)
                    ];
                    
                    // Hacer clic y esperar navegación simultáneamente
                    await Promise.all([
                        Promise.race(promesasNavegacion),
                        botonLogin.click({ timeout: 5000 })
                    ]);
                    
                    // Verificar si funcionó
                    await this.page.waitForTimeout(2000);
                    const urlDespuesMetodo1 = this.page.url();
                    const tieneElementosLogin = await this.page.evaluate(() => {
                        return !!document.querySelector('#bloqueCorfoLogin');
                    });
                    
                    if (urlDespuesMetodo1 !== urlAntesClic || !tieneElementosLogin) {
                        loginExitoso = true;
                    }
                } catch (error) {
                    // Continuar con método 2
                }
                
                // MÉTODO 2: Si el método 1 falló, intentar submit del formulario directamente
                if (!loginExitoso) {
                    try {
                        
                        const submitResult = await this.page.evaluate(() => {
                            try {
                                const rutField = document.querySelector('#rut') as HTMLInputElement;
                                if (!rutField) return { success: false, error: 'Campo RUT no encontrado' };
                                
                                const form = rutField.closest('form');
                                if (!form) {
                                    // Si no hay form, intentar hacer clic en el botón directamente
                                    const boton = document.querySelector('#ingresa_') as HTMLButtonElement;
                                    if (boton) {
                                        // Crear un evento de click y dispararlo
                                        const clickEvent = new PointerEvent('click', {
                                            bubbles: true,
                                            cancelable: true,
                                            view: window
                                        });
                                        boton.dispatchEvent(clickEvent);
                                        return { success: true, error: null };
                                    }
                                    return { success: false, error: 'Formulario y botón no encontrados' };
                                }
                                
                                // Enviar el formulario
                                form.submit();
                                return { success: true, error: null };
                            } catch (error) {
                                return { success: false, error: (error as Error).message };
                            }
                        });
                        
                        if (submitResult.success) {
                            // Esperar respuesta
                            await Promise.race([
                                this.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => null),
                                this.page.waitForFunction(
                                    (urlAntes) => window.location.href !== urlAntes,
                                    urlAntesClic,
                                    { timeout: 15000 }
                                ).catch(() => null)
                            ]);
                            
                            await this.page.waitForTimeout(2000);
                            const urlDespuesMetodo2 = this.page.url();
                            const tieneElementosLogin2 = await this.page.evaluate(() => {
                                return !!document.querySelector('#bloqueCorfoLogin');
                            });
                            
                            if (urlDespuesMetodo2 !== urlAntesClic || !tieneElementosLogin2) {
                                loginExitoso = true;
                            }
                        }
                    } catch (error) {
                        // Continuar con método 3
                    }
                }
                
                // MÉTODO 3: Si ambos métodos fallaron, intentar presionar Enter
                if (!loginExitoso) {
                    try {
                        await this.page.focus('#pass');
                        await this.page.keyboard.press('Enter');
                        await this.page.waitForTimeout(3000);
                        
                        const urlDespuesMetodo3 = this.page.url();
                        const tieneElementosLogin3 = await this.page.evaluate(() => {
                            return !!document.querySelector('#bloqueCorfoLogin');
                        });
                        
                        if (urlDespuesMetodo3 !== urlAntesClic || !tieneElementosLogin3) {
                            loginExitoso = true;
                        }
                    } catch (error) {
                        // Todos los métodos fallaron
                    }
                }
                
                if (!loginExitoso) {
                    throw new Error('Todos los métodos de login fallaron. El formulario no se está enviando correctamente.');
                }
                
                // Esperar un momento para que el servidor procese
                await this.page.waitForTimeout(2000);
                
                // Verificar si hay mensajes de error
                const mensajeError = await this.page.evaluate(() => {
                    const errorElements = document.querySelectorAll('.error, .alert-danger, [class*="error"], [class*="alert"], [id*="error"], [id*="Error"], .mensaje-error, [class*="mensaje"]');
                    for (const el of Array.from(errorElements)) {
                        const texto = el.textContent?.trim();
                        if (texto && texto.length > 0 && !texto.includes('Cerrar') && !texto.includes('×')) {
                            return texto;
                        }
                    }
                    return null;
                });
                
                if (mensajeError) {
                    throw new Error(`Error en login: ${mensajeError}`);
                }
                
                console.log('   ⏳ Esperando que la página esté lista post-login...');
                await WaitUtils.esperarPaginaListaPostLogin(this.page, 30000);
                console.log('✅ Login completado');
                return;
            }
        } catch (error) {
            console.log(`   ⚠️ Método 1 falló: ${(error as Error).message}`);
        }

        // MÉTODO 2: Bloque de login ya visible (sin necesidad de hacer clic)
        try {
            console.log('   🔍 Intentando método 2: Bloque de login ya visible...');
            const bloqueVisible = await this.page.waitForSelector('#bloqueCorfoLogin', { 
                state: 'visible', 
                timeout: 5000 
            }).catch(() => null);
            
            if (bloqueVisible) {
                console.log('   ✅ Bloque de login ya está visible');
                
                await this.page.waitForSelector('#rut', { state: 'visible', timeout: 10000 });
                await this.page.waitForSelector('#pass', { state: 'visible', timeout: 10000 });
                
                console.log('   📝 Completando campos de login...');
                await this.page.fill('#rut', userClean);
                await this.page.fill('#pass', passClean);
                console.log('   ✅ Campos completados');
                
                await this.page.waitForSelector('#ingresa_', { state: 'visible', timeout: 10000 });
                await Promise.all([
                    this.page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => {}),
                    this.page.click('#ingresa_')
                ]);
                
                await WaitUtils.esperarPaginaListaPostLogin(this.page, 30000);
                console.log('✅ Login con bloque visible completado');
                return;
            }
        } catch (error) {
            console.log(`   ⚠️ Método 2 falló: ${(error as Error).message}`);
        }

        // MÉTODO 3: Interfaz antigua via iframe
        try {
            console.log('   🔍 Intentando método 3: Iframe de login...');
            
            // Esperar a que los frames se carguen
            await WaitUtils.esperarEstabilidadPagina(this.page, 5000);
            
            // Buscar el iframe de login
            const frames = this.page.frames();
            const loginFrame = frames.find((frame: Frame) => frame.url().includes('login.corfo.cl'));
            
            if (!loginFrame) {
                // Si no encontramos el iframe inmediatamente, esperar adaptativamente
                await WaitUtils.esperarEstabilidadPagina(this.page, 3000);
                const frames2 = this.page.frames();
                const loginFrame2 = frames2.find((frame: Frame) => frame.url().includes('login.corfo.cl'));
                
                if (!loginFrame2) {
                    throw new Error('Iframe de login no encontrado');
                }
                
                // Usar el iframe encontrado después de esperar
                await this.intentarLoginConIframe(loginFrame2, userClean, passClean);
                return;
            }
            
            await this.intentarLoginConIframe(loginFrame, userClean, passClean);
            return;
        } catch (error) {
            console.log(`   ⚠️ Método 3 falló: ${(error as Error).message}`);
        }

        throw new Error('No se encontró interfaz de login en la página actual');
    }

    /**
     * Intenta realizar login usando un iframe de login
     * @param loginFrame Frame del iframe de login
     * @param userClean Usuario limpio
     * @param passClean Contraseña limpia
     */
    private async intentarLoginConIframe(loginFrame: Frame, userClean: string, passClean: string): Promise<void> {
        console.log('   🔍 Iframe de login detectado, esperando que esté listo...');
        
        // Espera adaptativa para el iframe
        try {
            await loginFrame.waitForLoadState('networkidle', { timeout: 10000 });
        } catch {
            await loginFrame.waitForLoadState('domcontentloaded', { timeout: 5000 }).catch(() => {});
        }
        
        // Esperar adaptativamente a que los campos estén visibles
        // Usar una espera adaptativa personalizada en lugar de waitForSelector directo
        console.log('   ⏳ Esperando que los campos del iframe estén visibles (adaptativo)...');
        
        const camposVisibles = await WaitUtils.waitForCondition(
            this.page,
            async () => {
                try {
                    const rut = await loginFrame.$('#rut');
                    const pass = await loginFrame.$('#pass');
                    if (!rut || !pass) return false;
                    
                    const rutVisible = await rut.isVisible().catch(() => false);
                    const passVisible = await pass.isVisible().catch(() => false);
                    return rutVisible && passVisible;
                } catch {
                    return false;
                }
            },
            20000
        );
        
        if (!camposVisibles) {
            throw new Error('Los campos del iframe no se volvieron visibles después de esperar');
        }
        
            console.log('   ✅ Campos del iframe visibles, completando login...');

            await loginFrame.fill('#rut', userClean);
            await loginFrame.fill('#pass', passClean);
            console.log('   ✅ Campos iframe completados');
        
        await loginFrame.waitForSelector('#ingresa_', { state: 'visible', timeout: 10000 });
        await Promise.all([
            this.page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => {}),
            loginFrame.click('#ingresa_')
        ]);
        
        await loginFrame.waitForSelector('#rut', { state: 'detached', timeout: 15000 }).catch(() => {});
        await WaitUtils.esperarPaginaListaPostLogin(this.page, 30000);
        console.log('✅ Login con iframe completado');
    }
}

