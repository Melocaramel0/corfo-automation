/**
 * Detector de estructura del formulario
 */
import { Page } from 'playwright';
import { EstructuraFormularioDetectada } from './types';

/**
 * Clase para detectar automáticamente la estructura del formulario
 */
export class DetectorEstructura {
    private page: Page;
    
    constructor(page: Page) {
        this.page = page;
    }

    async detectarEstructuraCompleta(): Promise<EstructuraFormularioDetectada> {
        const url = this.page.url();
        let estructura: EstructuraFormularioDetectada = {
            totalPasos: 1,
            pasoActual: 1,
            esPaginaConfirmacion: false,
            esPaginaBorradores: false,
            tieneBarraProgreso: false,
            titulosPasos: [],
            urlActual: url,
            tipoDeteccion: 'fallback',
            confianza: 0
        };

        //  DETECCIÓN POR SLICK-SLIDER (CORFO)
        const deteccionSlick = await this.detectarPorSlickSlider();
        if (deteccionSlick.confianza && deteccionSlick.confianza > estructura.confianza) {
            estructura = { ...estructura, ...deteccionSlick };
        }

        // Detectar tipos especiales de página
        estructura.esPaginaConfirmacion = await this.esPaginaConfirmacion();
        estructura.esPaginaBorradores = await this.esPaginaBorradores();
        
        //  NUEVO: Detectar si es paso de introducción
        const esPasoIntroduccion = await this.esPasoIntroduccion();
        if (esPasoIntroduccion) {
            console.log('   📋 Paso de introducción detectado');
        }

        //  NUEVO: Detectar si es paso con botón AGREGAR+
        const esPasoConAgregar = await this.esPasoConBotonAgregar();
        if (esPasoConAgregar) {
            console.log('   📋 Paso con botón AGREGAR+ detectado');
        }

        //  NUEVO: Detectar si es paso Presupuesto
        const esPasoPresupuesto = await this.esPasoPresupuesto();
        if (esPasoPresupuesto) {
            console.log('   📋 Paso Presupuesto con tabs detectado');
        }

        return estructura;
    }

    private async detectarPorSlickSlider(): Promise<Partial<EstructuraFormularioDetectada>> {
        try {
            const resultado = await this.page.evaluate(() => {
                // DETECCIÓN ESPECÍFICA PARA SLICK-SLIDER (CORFO)
                const slickSliders = document.querySelectorAll('.slick-slider, .carousel.slick-initialized');
                
                for (const slider of Array.from(slickSliders)) {
                    // Buscar todos los elementos li con data-slick-index
                    const pasosSlick = slider.querySelectorAll('li[data-slick-index]');
                    
                    if (pasosSlick.length > 0) {
                        // Contar todos los pasos (visibles y ocultos)
                        const totalPasos = pasosSlick.length;
                        
                        // Detectar paso actual (elemento sin aria-hidden="true" o con clase active)
                            let pasoActual = 1;
                        for (let i = 0; i < pasosSlick.length; i++) {
                            const elemento = pasosSlick[i] as Element;
                            const ariaHidden = elemento.getAttribute('aria-hidden');
                            
                            // Si no está oculto o tiene clase active, es el paso actual
                            if (ariaHidden !== 'true' || 
                                elemento.classList.contains('active') || 
                                    elemento.classList.contains('current') ||
                                elemento.classList.contains('slick-current')) {
                                    pasoActual = i + 1;
                                    break;
                                }
                            }

                        // Extraer títulos de los pasos
                        const titulosPasos = Array.from(pasosSlick).map((paso: Element, index: number) => {
                            const texto = paso.textContent?.trim() || '';
                            const id = paso.id || '';
                            
                            if (texto.length > 0) {
                                return texto;
                            } else if (id.includes('Paso') || id.includes('BotonPaso')) {
                                return `Paso ${index + 1}`;
                            } else {
                                return `Paso ${index + 1}`;
                            }
                        });

                    return {
                            totalPasos: totalPasos,
                                pasoActual: pasoActual,
                            titulosPasos: titulosPasos,
                            tieneBarraProgreso: true,
                            esSlickSlider: true
                        };
                    }
                }

                return null;
            });

            if (resultado) {
                console.log(`   ✅ Slick Slider detectado: ${resultado.totalPasos} pasos`);
                console.log(`   📍 Paso actual: ${resultado.pasoActual}`);
                return {
                    ...resultado,
                    tipoDeteccion: 'barra_progreso',
                    confianza: 95
                };
            } else {
                console.log('   ⚠️ No se encontró Slick Slider');
            }

        } catch (error) {
            console.log('   ⚠️ Error en detección de Slick Slider:', (error as Error).message);
        }

        return { confianza: 0 };
    }


    /**
     * Detecta si estamos en el paso final de confirmación
     * Criterio principal: Presencia del botón "Enviar" (id="BotonEnviar") en lugar de "Siguiente"
     */
    async esPaginaConfirmacion(): Promise<boolean> {
        return await this.page.evaluate(() => {
            // 🔴 DETECCIÓN PRINCIPAL: Botón "Enviar" con id="BotonEnviar"
            const botonEnviar = document.querySelector('#BotonEnviar, a[id*="BotonEnviar"], button[id*="BotonEnviar"]');
            if (botonEnviar) {
                const rect = botonEnviar.getBoundingClientRect();
                const esVisible = rect.width > 0 && rect.height > 0;
                if (esVisible) {
                    return true; // Si hay botón Enviar visible, ES confirmación
                }
            }
            
            // 🔴 VERIFICACIÓN SECUNDARIA: Si hay botón AGREGAR+, NO es confirmación
            const botonesAgregar = Array.from(document.querySelectorAll('button, a, input[type="button"]'));
            const tieneBotonAgregar = botonesAgregar.some(boton => {
                const texto = (boton.textContent?.trim() || '').toLowerCase();
                const id = boton.id?.toLowerCase() || '';
                const rect = boton.getBoundingClientRect();
                const esVisible = rect.width > 0 && rect.height > 0;
                return esVisible && (texto.includes('agregar') || id.includes('agregar'));
            });
            
            if (tieneBotonAgregar) {
                return false;
            }
            
            // 🔴 VERIFICACIÓN TERCIARIA: Si hay tabs de presupuesto, NO es confirmación
            const tabsContainer = document.querySelector('ul[id*="ul_tb_cuentas_"]');
            if (tabsContainer) {
                const tabs = tabsContainer.querySelectorAll('li a[data-toggle="tab"][data-cuenta]');
                if (tabs.length > 0) {
                    return false;
                }
            }
            
            return false;
        });
    }

    async esPasoIntroduccion(): Promise<boolean> {
        return await this.page.evaluate(() => {
            const textoCompleto = document.body.textContent?.toLowerCase() || '';
            
            // Indicadores específicos de pasos de introducción
            const indicadoresIntroduccion = [
                'introducción',
                'guía de postulación',
                'acepta condiciones',
                'autoriza notificaciones',
                'documentos de la convocatoria',
                'recomendaciones generales',
                'confirmación correo electrónico'
            ];
            
            // Verificar si tiene indicadores de introducción
            const tieneIndicadores = indicadoresIntroduccion.some(ind => textoCompleto.includes(ind));
            
            // Verificar si tiene radio buttons típicos de introducción
            const tieneRadioButtons = document.querySelectorAll('input[type="radio"]').length > 0;
            const tieneTextoSiNo = textoCompleto.includes('sí') || textoCompleto.includes('no');
            
            // Verificar si tiene campo de email (típico en pasos de introducción)
            const tieneCampoEmail = document.querySelectorAll('input[type="email"], input[name*="email"], input[id*="email"]').length > 0;
            
            return tieneIndicadores || (tieneRadioButtons && tieneTextoSiNo) || tieneCampoEmail;
        });
    }

    async esPaginaBorradores(): Promise<boolean> {
        return await this.page.evaluate(() => {
            const url = window.location.href;
            const textoCompleto = document.body.textContent?.toLowerCase() || '';
            
            // Verificar URL - PRINCIPAL INDICADOR
            const urlEsBorradores = url.includes('Borradores') || 
                                  url.includes('borradores') ||
                                  url.includes('PostuladorBorradores');
            
            // Si la URL indica borradores, es definitivamente página de borradores
            if (urlEsBorradores) {
                return true;
            }
            
            // Si la URL indica que estamos en el formulario real, NO es borradores
            if (url.includes('Postulador.aspx') && !url.includes('Borradores')) {
                return false;
            }
            
            // Verificar texto específico de borradores (más restrictivo)
            const tieneTextoBorradores = textoCompleto.includes('borradores de postulación') ||
                                       textoCompleto.includes('mis borradores') ||
                                       textoCompleto.includes('postulaciones guardadas');
            
            // Verificar botón "Nueva Postulación" - solo si está claramente en contexto de borradores
            const botonesNuevaPostulacion = document.querySelectorAll('button, a, input[type="button"], input[type="submit"]');
            const tieneBotonNuevaPostulacion = Array.from(botonesNuevaPostulacion).some(boton => {
                const texto = boton.textContent?.toLowerCase() || '';
                const value = (boton as HTMLInputElement).value?.toLowerCase() || '';
                return (texto.includes('nueva postulación') || texto.includes('nueva postulacion') ||
                       value.includes('nueva postulación') || value.includes('nueva postulacion')) &&
                       // Solo considerar si hay contexto de borradores
                       (textoCompleto.includes('borradores') || textoCompleto.includes('guardadas'));
            });
            
            // Verificar tabla de borradores con indicadores más específicos
            const tieneTablaBorradores = !!document.querySelector('table') && 
                                       (textoCompleto.includes('identificador') || 
                                        textoCompleto.includes('fecha inicio') ||
                                        textoCompleto.includes('estado')) &&
                                       (textoCompleto.includes('borradores') || 
                                        textoCompleto.includes('guardadas') ||
                                        textoCompleto.includes('postulaciones'));
            
            return tieneTextoBorradores || tieneBotonNuevaPostulacion || tieneTablaBorradores;
        });
    }

    //  NUEVO: Validar completitud del paso actual
    async validarCompletitudPaso(): Promise<boolean> {
        console.log('✅ Validando completitud del paso actual...');
        
        try {
            const validacion = await this.page.evaluate(() => {
                // Buscar todos los campos de entrada
                const campos = document.querySelectorAll('input, select, textarea');
                let camposObligatorios = 0;
                let camposCompletados = 0;
                let camposConError = 0;
                
                campos.forEach(campo => {
                    const element = campo as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
                    
                    // Verificar si es obligatorio
                    const esObligatorio = element.hasAttribute('required') || 
                                        element.getAttribute('aria-required') === 'true' ||
                                        element.classList.contains('required') ||
                                        element.classList.contains('mandatory') ||
                                        element.classList.contains('obligatorio');
                    
                    if (esObligatorio) {
                        camposObligatorios++;
                        
                        // Verificar si está completado
                        const tieneValor = element.value && element.value.trim() !== '';
                        if (tieneValor) {
                            camposCompletados++;
                        }
                        
                        // Verificar si tiene error
                        const tieneError = element.classList.contains('error') || 
                                         element.classList.contains('invalid') ||
                                         element.getAttribute('aria-invalid') === 'true';
                        if (tieneError) {
                            camposConError++;
                        }
                    }
                });
                
                return {
                    camposObligatorios,
                    camposCompletados,
                    camposConError,
                    porcentajeCompletado: camposObligatorios > 0 ? Math.round((camposCompletados / camposObligatorios) * 100) : 100
                };
            });
            
            console.log(`   📊 Campos obligatorios: ${validacion.camposObligatorios}`);
            console.log(`   ✅ Campos completados: ${validacion.camposCompletados}`);
            console.log(`   ❌ Campos con error: ${validacion.camposConError}`);
            console.log(`   📈 Porcentaje completado: ${validacion.porcentajeCompletado}%`);
            
            return validacion.porcentajeCompletado === 100 && validacion.camposConError === 0;
            
        } catch (error) {
            console.log('   ⚠️ Error validando completitud:', (error as Error).message);
            return false;
        }
    }

    //  NUEVO: Detectar si el paso requiere hacer clic en botón AGREGAR+
    async esPasoConBotonAgregar(): Promise<boolean> {
        console.log('   🔍 Verificando si es paso con botón AGREGAR+...');
        
        try {
            const resultado = await this.page.evaluate(() => {
            // Verificar label duración
            const labels = Array.from(document.querySelectorAll('label'));
            let labelEncontrado = '';
            const tieneLabelDuracion = labels.some(label => {
                const texto = label.textContent?.toLowerCase() || '';
                if (texto.includes('duración') || texto.includes('duracion')) {
                    labelEncontrado = label.textContent?.trim() || '';
                    return true;
                }
                return false;
            });
            
            // Verificar campo disabled visible
            const camposDisabled = Array.from(document.querySelectorAll('input[disabled], select[disabled]'));
            let campoDisabledEncontrado = '';
            const tieneCampoDisabled = camposDisabled.some(campo => {
                const rect = campo.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                    const el = campo as HTMLInputElement | HTMLSelectElement;
                    campoDisabledEncontrado = `${el.tagName} id="${el.id}" value="${el.value}"`;
                    return true;
                }
                return false;
            });
            
            // Verificar botón AGREGAR+ visible
            const botones = Array.from(document.querySelectorAll('button, a, input[type="button"]'));
            let botonEncontrado = '';
            const tieneBotonAgregar = botones.some(boton => {
                const texto = (boton.textContent?.trim() || '').toLowerCase();
                const id = boton.id?.toLowerCase() || '';
                const rect = boton.getBoundingClientRect();
                const esVisible = rect.width > 0 && rect.height > 0;
                const contieneAgregar = texto.includes('agregar') || id.includes('agregar');
                
                if (esVisible && contieneAgregar) {
                    botonEncontrado = `texto="${boton.textContent?.trim()}" id="${boton.id}"`;
                    return true;
                }
                return false;
            });
            
            // SIMPLIFICACIÓN: Solo verificar label duración + botón AGREGAR+
            // El campo disabled puede tener readonly en lugar de disabled, así que no es confiable
            return {
                cumple: tieneLabelDuracion && tieneBotonAgregar,
                tieneLabelDuracion,
                tieneCampoDisabled,
                tieneBotonAgregar,
                labelEncontrado,
                campoDisabledEncontrado,
                botonEncontrado
            };
        });
        
            // Logging detallado para debugging
            console.log(`   🔍 Verificando condiciones para botón AGREGAR+:`);
            console.log(`      ✓ Label duración: ${resultado.tieneLabelDuracion} ${resultado.labelEncontrado ? `- "${resultado.labelEncontrado}"` : ''}`);
            console.log(`      ✓ Campo disabled: ${resultado.tieneCampoDisabled} ${resultado.campoDisabledEncontrado ? `- ${resultado.campoDisabledEncontrado}` : ''}`);
            console.log(`      ✓ Botón AGREGAR+: ${resultado.tieneBotonAgregar} ${resultado.botonEncontrado ? `- ${resultado.botonEncontrado}` : ''}`);
            console.log(`      → Resultado final: ${resultado.cumple} (label duración + botón AGREGAR+)`);
            
            return resultado.cumple;
        } catch (error) {
            console.log(`   ⚠️ Error verificando botón AGREGAR+:`, (error as Error).message);
            return false;
        }
    }

    //  NUEVO: Detectar si el paso es Presupuesto con tabs dinámicos
    async esPasoPresupuesto(): Promise<boolean> {
        return await this.page.evaluate(() => {
            // Buscar contenedor de tabs con patrón ul_tb_cuentas_*
            const tabsContainer = document.querySelector('ul[id*="ul_tb_cuentas_"]');
            
            // Verificar que tenga tabs dentro
            if (tabsContainer) {
                const tabs = tabsContainer.querySelectorAll('li a[data-toggle="tab"][data-cuenta]');
                return tabs.length > 0;
            }
            
            return false;
        });
    }
}


