import { Page } from 'playwright';
import type { ResultadoModal, ResultadoErroresValidacion } from '../core/types';
import * as fs from 'fs/promises';
import * as path from 'path';

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

    /**
     * Detecta si aparece el modal de éxito después de enviar el formulario
     * @returns true si se detecta el modal de éxito, false en caso contrario
     */
    async detectarModalExito(): Promise<boolean> {
        try {
            await this.page.waitForTimeout(2000);
            
            const modalExito = await this.page.evaluate(() => {
                // Buscar modales visibles
                const modales = document.querySelectorAll('.modal:not([style*="display: none"]), [role="dialog"]:not([style*="display: none"]), .swal2-container:not([style*="display: none"])');
                const modalesArray = Array.from(modales);
                
                for (const modal of modalesArray) {
                    const texto = modal.textContent || '';
                    const textoLower = texto.toLowerCase();
                    
                    // Buscar indicadores de éxito
                    if (textoLower.includes('postulación realizada con éxito') ||
                        textoLower.includes('postulación realizada con exito') ||
                        textoLower.includes('enviado correctamente') ||
                        textoLower.includes('éxito') ||
                        textoLower.includes('exito') ||
                        (textoLower.includes('realizada') && textoLower.includes('éxito'))) {
                        return true;
                    }
                }
                return false;
            });
            
            return modalExito;
        } catch (error) {
            console.log(`   ⚠️ Error detectando modal de éxito: ${(error as Error).message}`);
            return false;
        }
    }

    /**
     * Detecta el modal de errores de validación que aparece al enviar el formulario
     * Extrae la lista de campos faltantes y toma un screenshot del modal
     * @param headless Si es true, no se tomará screenshot
     * @returns ResultadoErroresValidacion con información de los errores y ruta del screenshot
     */
    async detectarModalErroresValidacion(headless: boolean = false): Promise<ResultadoErroresValidacion> {
        try {
            // Esperar un poco para que el modal aparezca
            await this.page.waitForTimeout(3000);
            
            // Buscar el modal con el título "Postulación con errores de validación"
            // IMPORTANTE: Distinguir entre modal de éxito y modal de errores
            const tituloModal = await this.page.evaluate(() => {
                // Buscar modales visibles
                const modales = document.querySelectorAll('.modal:not([style*="display: none"]), [role="dialog"]:not([style*="display: none"]), .swal2-container:not([style*="display: none"])');
                
                // Convertir NodeListOf a Array para poder iterar
                const modalesArray = Array.from(modales);
                
                for (const modal of modalesArray) {
                    const texto = modal.textContent || '';
                    const textoLower = texto.toLowerCase();
                    
                    // PRIMERO: Verificar que NO sea el modal de éxito
                    if (textoLower.includes('postulación realizada con éxito') ||
                        textoLower.includes('postulación realizada con exito') ||
                        textoLower.includes('enviado correctamente') ||
                        textoLower.includes('éxito') ||
                        textoLower.includes('exito')) {
                        // Es modal de éxito, no de errores
                        continue;
                    }
                    
                    // Buscar el título del modal de errores
                    if (texto.includes('Postulación con errores de validación') || 
                        texto.includes('errores de validación') ||
                        texto.includes('Postulación con errores') ||
                        (textoLower.includes('error') && textoLower.includes('validación'))) {
                        return {
                            encontrado: true,
                            textoCompleto: texto
                        };
                    }
                }
                return { encontrado: false, textoCompleto: '' };
            });
            
            if (!tituloModal.encontrado) {
                // No se encontró el modal de errores
                return {
                    detectado: false,
                    camposFaltantes: []
                };
            }
            
            console.log('   ⚠️ MODAL DE ERRORES DE VALIDACIÓN DETECTADO');
            
            // Tomar screenshot del modal ANTES de extraer los campos (para asegurar que el modal esté visible)
            let rutaScreenshot: string | undefined = undefined;
            if (!headless) {
                try {
                    console.log('   📸 Tomando screenshot del modal de errores...');
                    
                    // Crear carpeta para screenshots si no existe
                    const { getDataSubPath } = require('../../server/utils/dataPath');
                    const screenshotsDir = getDataSubPath('debugg_results/validation_errors');
                    await fs.mkdir(screenshotsDir, { recursive: true });
                    
                    // Generar nombre único para el screenshot
                    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                    const nombreArchivo = `validation_errors_${timestamp}.png`;
                    const rutaCompleta = path.join(screenshotsDir, nombreArchivo);
                    
                    // Buscar el modal específico de errores usando múltiples selectores
                    let modalElement = await this.page.$('.modal.show:not([style*="display: none"]), .modal.in:not([style*="display: none"])');
                    
                    if (!modalElement) {
                        // Intentar con otros selectores
                        modalElement = await this.page.$('[role="dialog"]:not([style*="display: none"])');
                    }
                    
                    if (!modalElement) {
                        // Intentar con swal2
                        modalElement = await this.page.$('.swal2-container:not([style*="display: none"])');
                    }
                    
                    if (modalElement) {
                        // Verificar que el modal sea visible
                        const esVisible = await modalElement.isVisible();
                        if (esVisible) {
                            // Screenshot solo del modal
                            await modalElement.screenshot({ path: rutaCompleta });
                            console.log(`   📸 Screenshot del modal guardado: ${rutaCompleta}`);
                            rutaScreenshot = rutaCompleta;
                        } else {
                            // Si no es visible, tomar screenshot de toda la página
                            await this.page.screenshot({ path: rutaCompleta, fullPage: true });
                            console.log(`   📸 Screenshot de página completa guardado: ${rutaCompleta}`);
                            rutaScreenshot = rutaCompleta;
                        }
                    } else {
                        // Si no encontramos el modal específico, tomar screenshot de toda la página
                        await this.page.screenshot({ path: rutaCompleta, fullPage: true });
                        console.log(`   📸 Screenshot de página completa guardado (modal no encontrado): ${rutaCompleta}`);
                        rutaScreenshot = rutaCompleta;
                    }
                } catch (screenshotError) {
                    console.log(`   ⚠️ Error al tomar screenshot: ${(screenshotError as Error).message}`);
                    console.log(`   ⚠️ Stack: ${(screenshotError as Error).stack}`);
                }
            } else {
                console.log('   ℹ️ Modo headless activado, no se tomará screenshot');
            }
            
            // Extraer la lista de campos faltantes del modal
            const camposFaltantes = await this.page.evaluate(() => {
                const campos: string[] = [];
                
                // Buscar el modal visible
                const modales = document.querySelectorAll('.modal:not([style*="display: none"]), [role="dialog"]:not([style*="display: none"]), .swal2-container:not([style*="display: none"])');
                
                // Convertir NodeListOf a Array para poder iterar
                const modalesArray = Array.from(modales);
                
                for (const modal of modalesArray) {
                    const texto = modal.textContent || '';
                    if (texto.includes('Postulación con errores de validación') || 
                        texto.includes('errores de validación')) {
                        
                        // Buscar elementos de lista (li, div con números, etc.)
                        const elementosLista = modal.querySelectorAll('li, div[class*="error"], div[class*="campo"], p, span');
                        
                        // Convertir NodeListOf a Array y tipar el parámetro
                        Array.from(elementosLista).forEach((elemento: Element) => {
                            const textoElemento = elemento.textContent?.trim() || '';
                            
                            // Buscar patrones como "Campo: '...' en Sección: '...'"
                            if (textoElemento.includes('Campo:') || 
                                textoElemento.includes('requerido') ||
                                textoElemento.includes('no contiene adjuntos') ||
                                textoElemento.match(/^\d+\./)) { // Elementos numerados
                                
                                // Limpiar el texto
                                let textoLimpio = textoElemento
                                    .replace(/^\d+\.\s*/, '') // Remover numeración
                                    .trim();
                                
                                if (textoLimpio.length > 0 && !campos.includes(textoLimpio)) {
                                    campos.push(textoLimpio);
                                }
                            }
                        });
                        
                        // Si no encontramos campos en elementos de lista, buscar en el texto completo
                        if (campos.length === 0) {
                            const lineas = texto.split('\n');
                            lineas.forEach((linea: string) => {
                                const lineaLimpia = linea.trim();
                                if (lineaLimpia.includes('Campo:') || 
                                    lineaLimpia.includes('requerido') ||
                                    lineaLimpia.match(/^\d+\./)) {
                                    const textoLimpio = lineaLimpia.replace(/^\d+\.\s*/, '').trim();
                                    if (textoLimpio.length > 0 && !campos.includes(textoLimpio)) {
                                        campos.push(textoLimpio);
                                    }
                                }
                            });
                        }
                        
                        break;
                    }
                }
                
                return campos;
            });
            
            console.log(`   📋 Campos faltantes detectados: ${camposFaltantes.length}`);
            camposFaltantes.forEach((campo, index) => {
                console.log(`      ${index + 1}. ${campo}`);
            });
            
            return {
                detectado: true,
                camposFaltantes: camposFaltantes,
                rutaScreenshot: rutaScreenshot
            };
            
        } catch (error) {
            console.log(`   ⚠️ Error detectando modal de errores de validación: ${(error as Error).message}`);
            return {
                detectado: false,
                camposFaltantes: []
            };
        }
    }
}

