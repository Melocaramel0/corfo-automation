import { Page, Frame } from 'playwright';
import * as dotenv from 'dotenv';
import { WaitUtils } from '../utils/waitUtils';

dotenv.config();

export class LoginService {
    private page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    async realizarLogin(): Promise<void> {
        console.log('   🔍 Buscando interfaz de login...');
        
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
                await this.page.fill('#rut', process.env.CORFO_USER!);
                await this.page.fill('#pass', process.env.CORFO_PASS!);
                
                await this.page.waitForSelector('#ingresa_', { state: 'visible', timeout: 10000 });
                await Promise.all([
                    this.page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => {}),
                    this.page.click('#ingresa_')
                ]);
                
                await WaitUtils.esperarPaginaListaPostLogin(this.page, 30000);
                console.log('✅ Login con interfaz nueva completado');
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
                await this.page.fill('#rut', process.env.CORFO_USER!);
                await this.page.fill('#pass', process.env.CORFO_PASS!);
                
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
                await this.intentarLoginConIframe(loginFrame2);
                return;
            }
            
            await this.intentarLoginConIframe(loginFrame);
            return;
        } catch (error) {
            console.log(`   ⚠️ Método 3 falló: ${(error as Error).message}`);
        }

        throw new Error('No se encontró interfaz de login en la página actual');
    }

    /**
     * Intenta realizar login usando un iframe de login
     * @param loginFrame Frame del iframe de login
     */
    private async intentarLoginConIframe(loginFrame: Frame): Promise<void> {
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
        
        await loginFrame.fill('#rut', process.env.CORFO_USER!);
        await loginFrame.fill('#pass', process.env.CORFO_PASS!);
        
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

