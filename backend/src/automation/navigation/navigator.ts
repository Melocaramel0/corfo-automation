import { Page } from 'playwright';
import type { ResultadoNavegacion } from '../core/types';
import { ModalHandler } from './modalHandler';
import { WaitUtils } from '../utils/waitUtils';

export class Navigator {
    private page: Page;
    private modalHandler: ModalHandler;

    constructor(page: Page) {
        this.page = page;
        this.modalHandler = new ModalHandler(page);
    }

    async navegarAURLEspecifica(url: string): Promise<void> {
        console.log(`🌐 Navegando directamente a la URL: ${url}`);
        
        try {
            // Verificar si ya estamos en la URL objetivo
            const urlActual = this.page.url();
            if (urlActual === url || (urlActual.includes('Postulador.aspx') && !urlActual.includes('Borradores'))) {
                console.log('✅ Ya estamos en la URL objetivo o en el formulario real');
                return;
            }
            
            await this.page.goto(url, {
                waitUntil: 'domcontentloaded',
                timeout: 30000
            });
            
            await WaitUtils.esperarEstabilidadPagina(this.page, 10000);
            
            // Verificar si necesitamos hacer clic en "Inicia tu postulación"
            const botonIniciar = await this.page.$('a:has-text("Inicia tu postulación"), button:has-text("Inicia tu postulación")');
            if (botonIniciar) {
                console.log('🚀 Haciendo clic en "Inicia tu postulación"...');
                await Promise.all([
                    this.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {}),
                    botonIniciar.click()
                ]);
                await WaitUtils.esperarEstabilidadPagina(this.page, 10000);
                
                // Verificar si estamos en la página de borradores
                const urlDespuesClic = this.page.url();
                console.log(`📍 URL después del clic: ${urlDespuesClic}`);
                
                if (urlDespuesClic.includes('PostuladorBorradores.aspx')) {
                    console.log('📋 Estamos en página de borradores, navegando al formulario real...');
                    await this.navegarDeBorradoresAFormulario();
                } else {
                    console.log('✅ Ya estamos en el formulario real');
                }
            } else {
                console.log('✅ Ya estamos en el formulario');
            }
        } catch (error) {
            console.error(`❌ Error navegando a URL específica: ${error}`);
            throw error;
        }
    }

    async navegarDeBorradoresAFormulario(): Promise<void> {
        console.log('🔄 Navegando desde borradores al formulario real...');
        
        // Buscar botón "Nueva Postulación" con más selectores
        const selectoresNuevaPostulacion = [
            'button:has-text("Nueva Postulación")',
            'button:has-text("NUEVA POSTULACIÓN")',
            'button:has-text("Nueva Postulacion")',
            'a:has-text("Nueva Postulación")',
            'a:has-text("NUEVA POSTULACIÓN")',
            'a:has-text("Nueva Postulacion")',
            'input[value*="Nueva"]',
            'input[value*="nueva"]',
            '.btn:has-text("Nueva")',
            '.btn:has-text("NUEVA")',
            '[onclick*="nueva"]',
            '[onclick*="Nueva"]',
            'button[onclick*="nueva"]',
            'a[onclick*="nueva"]'
        ];
        
        let botonNuevaPostulacion = null;
        for (const selector of selectoresNuevaPostulacion) {
            try {
                botonNuevaPostulacion = await this.page.$(selector);
                if (botonNuevaPostulacion) {
                    const texto = await botonNuevaPostulacion.textContent();
                    console.log(`✅ Botón "Nueva Postulación" encontrado: ${selector} - Texto: "${texto}"`);
                    break;
                }
            } catch (error) {
                console.log(`   ⚠️ Error con selector ${selector}:`, (error as Error).message);
                continue;
            }
        }
        
        if (botonNuevaPostulacion) {
            console.log('🔄 Haciendo clic en "Nueva Postulación"...');
            await Promise.all([
                this.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => console.log('No hubo navegación')),
                botonNuevaPostulacion.click()
            ]);
            
            await WaitUtils.esperarEstabilidadPagina(this.page, 10000);
            
            const urlFinal = this.page.url();
            console.log(`📍 URL final del formulario: ${urlFinal}`);
            
            if (urlFinal.includes('Postulador.aspx') && !urlFinal.includes('Borradores')) {
                console.log('✅ Navegación exitosa al formulario real');
                // Buscar y hacer clic en el botón "Siguiente" o "Comenzar" para llegar al primer paso real
                await this.navegarAlPrimerPasoReal();
            } else {
                console.log('⚠️ Aún no estamos en el formulario real, intentando otras estrategias...');
            }
        } else {
            console.log('❌ No se encontró botón "Nueva Postulación"');
        }
    }

    async navegarAlPrimerPasoReal(): Promise<void> {
        console.log('🎯 Navegando al primer paso real del formulario...');
        
        await WaitUtils.esperarEstabilidadPagina(this.page, 10000);
        
        // Buscar botones que podrían llevarnos al primer paso
        const selectoresPrimerPaso = [
            'button:has-text("Siguiente")',
            'button:has-text("SIGUIENTE")', 
            'button:has-text("Comenzar")',
            'button:has-text("COMENZAR")',
            'button:has-text("Continuar")',
            'button:has-text("CONTINUAR")',
            'input[value*="iguiente"]',
            'input[value*="omenzar"]',
            'input[value*="ontinuar"]',
            'button[type="submit"]',
            '.btn:has-text("Siguiente")',
            '.btn:has-text("Comenzar")',
            '[onclick*="siguiente"]',
            '[onclick*="continuar"]'
        ];
        
        let botonEncontrado = false;
        for (const selector of selectoresPrimerPaso) {
            try {
                const boton = await this.page.$(selector);
                if (boton && await boton.isVisible()) {
                    console.log(`🔄 Haciendo clic en botón: ${selector}`);
                    
                    await boton.scrollIntoViewIfNeeded();
                    await WaitUtils.esperarAdaptativa(this.page, 200, 1000);
                    
                    const urlAntes = this.page.url();
                    await boton.click();
                    await WaitUtils.esperarDespuesDeClick(this.page, 5000, true);
                    
                    const urlDespues = this.page.url();
                    
                    // Verificar si aparecieron campos reales
                    const camposReales = await this.page.$$('input[type="radio"]:not([style*="display: none"]), input[type="text"]:not([style*="display: none"]), input[type="email"]:not([style*="display: none"]), select:not([style*="display: none"]), textarea:not([style*="display: none"])');
                    console.log(`   📝 Campos reales encontrados después del clic: ${camposReales.length}`);
                    
                    if (camposReales.length > 0 || urlAntes !== urlDespues) {
                        console.log(`✅ Navegación exitosa al primer paso real`);
                        console.log(`📍 Nueva URL: ${urlDespues}`);
                        botonEncontrado = true;
                        break;
                    } else {
                        console.log(`⚠️ No se encontraron campos reales después del clic`);
                    }
                }
            } catch (error) {
                console.log(`   ⚠️ Error con selector ${selector}:`, (error as Error).message);
                continue;
            }
        }
        
        if (!botonEncontrado) {
            console.log('ℹ️ No se encontró botón para navegar al primer paso, puede que ya estemos ahí');
            
            // Verificar si ya hay campos de formulario visibles
            const camposExistentes = await this.page.$$('input[type="radio"]:not([style*="display: none"]), input[type="text"]:not([style*="display: none"]), input[type="email"]:not([style*="display: none"]), select:not([style*="display: none"]), textarea:not([style*="display: none"])');
            if (camposExistentes.length > 0) {
                console.log(`✅ Ya hay ${camposExistentes.length} campos reales disponibles`);
            } else {
                console.log('⚠️ No se encontraron campos reales en la página actual');
                
                // Hacer scroll adicional para activar contenido dinámico
                console.log('📜 Haciendo scroll adicional para activar contenido...');
                await this.page.evaluate(() => {
                    window.scrollTo(0, document.body.scrollHeight);
                });
                await WaitUtils.esperarDespuesDeScroll(this.page, 3000);
                
                const camposPostScroll = await this.page.$$('input[type="radio"]:not([style*="display: none"]), input[type="text"]:not([style*="display: none"]), input[type="email"]:not([style*="display: none"]), select:not([style*="display: none"]), textarea:not([style*="display: none"])');
                console.log(`📝 Campos encontrados después del scroll: ${camposPostScroll.length}`);
            }
        }
    }

    async obtenerTituloPaso(): Promise<string> {
        try {
            const titulo = await this.page.$eval('h1, h2, h3', (el: Element) => el.textContent?.trim());
            return titulo || `Paso ${Date.now()}`;
        } catch {
            return `Paso ${Date.now()}`;
        }
    }

    /**
     * Navega al siguiente paso de manera definitiva, presionando "Sí" si aparece modal
     * Este método se usa después de completar todas las iteraciones de campos faltantes
     * @returns true si navegó exitosamente
     */
    async navegarAlSiguienteParaAvanzar(): Promise<boolean> {
        console.log('➡️ Navegación final: Avanzando al siguiente paso...');
        
        const selectores = [
            'button:has-text("SIGUIENTE")',
            'button:has-text("Siguiente")',
            'input[value*="iguiente"]',
            'input[value*="IGUIENTE"]',
            'button:has-text("CONTINUAR")',
            'button:has-text("Continuar")',
            'button[type="submit"]:not([value*="Enviar"]):not([value*="ENVIAR"])',
            'a:has-text("Siguiente")',
            'a:has-text("SIGUIENTE")',
            '.btn-next',
            '[class*="next"]'
        ];

        for (const selector of selectores) {
            try {
                const boton = await this.page.$(selector);
                if (boton && await boton.isVisible()) {
                    const texto = await boton.textContent() || '';
                    const value = await boton.getAttribute('value') || '';
                    
                    // Evitar botones de envío final
                    if (texto.toLowerCase().includes('enviar') || 
                        value.toLowerCase().includes('enviar') ||
                        texto.toLowerCase().includes('finalizar')) {
                        continue;
                    }
                    
                    console.log(`   🖱️ Haciendo clic en: "${texto || value}"`);
                    
                    await boton.scrollIntoViewIfNeeded();
                    await WaitUtils.esperarAdaptativa(this.page, 200, 1000);
                    
                    await boton.click();
                    await WaitUtils.esperarDespuesDeClick(this.page, 5000, true);
                    
                    //  NUEVO: Si aparece modal, presionar "Sí, estoy seguro" para forzar avance
                    const modalConfirmado = await this.modalHandler.confirmarModalParaAvanzar();
                    if (modalConfirmado) {
                        await WaitUtils.esperarDespuesDeClick(this.page, 3000);
                    }
                    
                    console.log('   ✅ Navegación final exitosa');
                    return true;
                }
            } catch (error) {
                console.log(`   ⚠️ Error con selector ${selector}:`, (error as Error).message);
                continue;
            }
        }

        console.log('   ❌ No se encontró botón para siguiente paso');
        return false;
    }

    /**
     * Intenta navegar al siguiente paso y retorna información sobre el modal si aparece
     * @returns ResultadoNavegacion con información sobre si navegó y el resultado del modal
     */
    async navegarAlSiguientePaso(): Promise<ResultadoNavegacion> {
        console.log('➡️ Intentando navegar al siguiente paso...');
        
        const selectores = [
            'button:has-text("SIGUIENTE")',
            'button:has-text("Siguiente")',
            'input[value*="iguiente"]',
            'input[value*="IGUIENTE"]',
            'button:has-text("CONTINUAR")',
            'button:has-text("Continuar")',
            'button[type="submit"]:not([value*="Enviar"]):not([value*="ENVIAR"])',
            'a:has-text("Siguiente")',
            'a:has-text("SIGUIENTE")',
            '.btn-next',
            '[class*="next"]'
        ];

        for (const selector of selectores) {
            try {
                const boton = await this.page.$(selector);
                if (boton && await boton.isVisible()) {
                    const texto = await boton.textContent() || '';
                    const value = await boton.getAttribute('value') || '';
                    
                    // Evitar botones de envío final
                    if (texto.toLowerCase().includes('enviar') || 
                        value.toLowerCase().includes('enviar') ||
                        texto.toLowerCase().includes('finalizar')) {
                        continue;
                    }
                    
                    console.log(`   🖱️ Haciendo clic en: "${texto || value}"`);
                    
                    // Hacer scroll al botón si es necesario
                    await boton.scrollIntoViewIfNeeded();
                    await WaitUtils.esperarAdaptativa(this.page, 150, 500);
                    
                    await boton.click();
                    // Espera adaptativa después de click de navegación
                    await WaitUtils.esperarDespuesDeClick(this.page, 5000, true);
                    
                    //  NUEVO: Capturar resultado del modal
                    const resultadoModal = await this.modalHandler.manejarModalConfirmacion();
                    if (resultadoModal.aparecio) {
                        await WaitUtils.esperarDespuesDeClick(this.page, 3000);
                    }
                    
                    console.log('   ✅ Navegación exitosa');
                    return {
                        navegoExitosamente: true,
                        resultadoModal: resultadoModal
                    };
                }
            } catch (error) {
                console.log(`   ⚠️ Error con selector ${selector}:`, (error as Error).message);
                continue;
            }
        }

        console.log('   ❌ No se encontró botón para siguiente paso');
        return {
            navegoExitosamente: false,
            resultadoModal: {
                aparecio: false,
                botonPresionado: 'ninguno',
                camposFaltantes: false
            }
        };
    }
}

