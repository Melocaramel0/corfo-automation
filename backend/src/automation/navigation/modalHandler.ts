import { Page } from 'playwright';
import type { ResultadoModal } from '../core/types';

export class ModalHandler {
    private page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    /**
     * Helper: Busca un botón por texto en múltiples variaciones y selectores
     * @param textos Array de textos a buscar en los botones
     * @returns Elemento del botón encontrado o null
     */
    private async buscarBotonPorTexto(textos: string[]): Promise<any> {
        for (const texto of textos) {
            const selectores = [
                `button:has-text("${texto}")`,
                `a:has-text("${texto}")`,
                `input[value*="${texto}"]`,
                `[id*="${texto.replace(/\s+/g, '')}"]`
            ];
            
            for (const selector of selectores) {
                try {
                    const boton = await this.page.$(selector);
                    if (boton && await boton.isVisible()) {
                        return boton;
                    }
                } catch (error) {
                    continue;
                }
            }
        }
        return null;
    }

    /**
     * Helper: Cierra modal de confirmación buscando botones por texto
     * @param textoBotones Array de textos posibles para el botón de confirmación
     */
    async cerrarModalConfirmacion(textoBotones: string[]): Promise<void> {
        try {
            await this.page.waitForTimeout(1000);
            
            const boton = await this.buscarBotonPorTexto(textoBotones);
            if (boton) {
                await boton.click();
                // OPTIMIZADO: Espera reducida después de cerrar modal
                await this.page.waitForTimeout(800);
                console.log('   ✅ Modal confirmado');
            }
        } catch (error) {
            console.log('   ⚠️ Error cerrando modal:', (error as Error).message);
        }
    }

    /**
     * Confirma el modal presionando "Sí, estoy seguro" para forzar avance al siguiente paso
     * Se usa después de completar todas las iteraciones de campos faltantes
     * @returns true si se confirmó el modal
     */
    async confirmarModalParaAvanzar(): Promise<boolean> {
        try {
            await this.page.waitForTimeout(1000);
            
            const selectoresSi = [
                'button:has-text("Sí, estoy seguro")',
                'button:has-text("Sí")',
                'button:has-text("SI")',
                '.btn-primary:has-text("Sí")',
                '.btn-success:has-text("Sí")',
                '.swal2-confirm',
                'button[class*="confirm"]',
                'button[class*="primary"]'
            ];
            
            for (const selector of selectoresSi) {
                try {
                    const botonSi = await this.page.$(selector);
                    if (botonSi && await botonSi.isVisible()) {
                        const texto = await botonSi.textContent() || '';
                        console.log(`   ✅ Confirmando modal para avanzar: "${texto}"`);
                        await botonSi.click();
                        await this.page.waitForTimeout(1500);
                        return true;
                    }
                } catch (err) {
                    continue;
                }
            }
            
            // Si no hay modal, está bien (significa que no había campos faltantes)
            return false;
            
        } catch (error) {
            console.log('   ⚠️ Error confirmando modal:', (error as Error).message);
            return false;
        }
    }

    /**
     * Maneja el modal de confirmación que aparece cuando hay campos faltantes
     * CAMBIO IMPORTANTE: Ahora hace clic en "No" para que el sistema nos lleve a los campos faltantes
     * @returns ResultadoModal con información sobre si apareció el modal y qué botón se presionó
     */
    async manejarModalConfirmacion(): Promise<ResultadoModal> {
        try {
            await this.page.waitForTimeout(1000);
            
            //  NUEVO: Primero buscar el botón "No" para identificar campos faltantes
            const selectoresNo = [
                'button:has-text("No")',
                'button:has-text("NO")',
                '.btn-secondary:has-text("No")',
                '.swal2-cancel',
                'button[class*="cancel"]',
                'button[class*="secondary"]'
            ];
            
            console.log('   🔍 Verificando si apareció modal de campos faltantes...');
            
            for (const selector of selectoresNo) {
                try {
                    const botonNo = await this.page.$(selector);
                    if (botonNo && await botonNo.isVisible()) {
                        const texto = await botonNo.textContent() || '';
                        console.log(`   ⚠️ MODAL DETECTADO - Campos obligatorios faltantes`);
                        console.log(`   🔄 Haciendo clic en "No" para procesar campos faltantes: "${texto}"`);
                        
                        await botonNo.click();
                        await this.page.waitForTimeout(2000);
                        
                        return {
                            aparecio: true,
                            botonPresionado: 'no',
                            camposFaltantes: true
                        };
                    }
                } catch (err) {
                    // Continuar con el siguiente selector
                    continue;
                }
            }
            
            // Si no encontramos "No", buscar "Sí" (significa que todo está completo)
            const selectoresSi = [
                'button:has-text("Sí, estoy seguro")',
                'button:has-text("Sí")',
                '.btn-primary:has-text("Sí")',
                '.swal2-confirm'
            ];
            
            for (const selector of selectoresSi) {
                try {
                    const botonSi = await this.page.$(selector);
                    if (botonSi && await botonSi.isVisible()) {
                        console.log(`   ✅ Modal de confirmación - Todos los campos completos, avanzando...`);
                        await botonSi.click();
                        await this.page.waitForTimeout(2000);
                        
                        return {
                            aparecio: true,
                            botonPresionado: 'si',
                            camposFaltantes: false
                        };
                    }
                } catch (err) {
                    // Continuar con el siguiente selector
                    continue;
                }
            }
            
            // No se encontró ningún modal
            return {
                aparecio: false,
                botonPresionado: 'ninguno',
                camposFaltantes: false
            };
            
        } catch (error) {
            console.log('   ⚠️ Error manejando modal:', (error as Error).message);
            return {
                aparecio: false,
                botonPresionado: 'ninguno',
                camposFaltantes: false
            };
        }
    }

    /**
     * Busca un botón por texto (método público para uso externo)
     * @param textos Array de textos a buscar
     * @returns Elemento del botón encontrado o null
     */
    async buscarBotonPorTextoPublico(textos: string[]): Promise<any> {
        return await this.buscarBotonPorTexto(textos);
    }
}

