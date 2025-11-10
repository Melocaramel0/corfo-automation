import { Page } from 'playwright';

export interface FieldInfo {
    tipo: string;
    etiqueta: string;
    esObligatorio: boolean;
    name: string;
    id: string;
    value: string;
    className: string;
    placeholder: string;
    dataCodigo: string;
    dataOriginalTitle: string;
    title: string;
    dataControlId: string;
    dataExtensiones: string;
    dataTamanoMaximo: string;
    dataTipoControl: string;
    dataAdjuntoId: string;
    dataInputmask: string;
    opciones: Array<{ value: string; text: string; selected: boolean; disabled: boolean }>;
    esMultiple: boolean;
    debug?: {
        isDisplayed: boolean;
        isVisible: boolean;
        hasSize: boolean;
        isInDocument: boolean;
        isInteractuable: boolean;
    };
}

export class FieldExtractor {
    constructor(private page: Page) {}

    /**
     * Obtiene todos los campos del formulario que son visibles e interactuables
     */
    async obtenerTodosLosCampos(): Promise<any[]> {
        try {
            // Buscar todos los tipos de campos en una sola consulta
            const elementos = await this.page.$$('input:not([type="hidden"]), select, textarea');
            
            // Filtrar solo campos visibles e interactuables
            const camposValidos = [];
            
            for (const elemento of elementos) {
                try {
                    const isVisible = await elemento.isVisible();
                    const isEnabled = await elemento.isEnabled();
                    const tipo = await elemento.evaluate((el: Element) => (el as HTMLInputElement).type);
                    
                    //  NUEVO: Verificar si es un botón "Subir Archivo" (no un campo real)
                    const esBotonSubirArchivo = await elemento.evaluate((el: Element) => {
                        const texto = el.textContent?.trim().toLowerCase() || '';
                        const placeholder = (el as HTMLInputElement).placeholder?.toLowerCase() || '';
                        return texto.includes('subir archivo') || placeholder.includes('subir archivo');
                    });
                    
                    if (esBotonSubirArchivo) {
                        continue; // Excluir botones "Subir Archivo"
                    }
                    
                    //  CRÍTICO: Campos de archivo también deben verificarse
                    // NO capturar campos file de otros pasos o áreas ocultas
                    if (tipo === 'file') {
                        // Verificar que el campo file esté en un área visible/interactuable
                        const estaEnAreaVisible = await elemento.evaluate((el: HTMLElement) => {
                            // Buscar el contenedor del campo file
                            const contenedor = el.closest('div, fieldset, section');
                            if (!contenedor) return false;
                            
                            const rect = contenedor.getBoundingClientRect();
                            const style = window.getComputedStyle(contenedor);
                            
                            // Verificar que el contenedor sea visible
                            const isVisible = style.display !== 'none' && 
                                           style.visibility !== 'hidden' &&
                                           style.opacity !== '0';
                            
                            // Verificar que tenga tamaño (no colapsado)
                            const hasSize = rect.width > 0 && rect.height > 0;
                            
                            return isVisible && hasSize;
                        });
                        
                        if (estaEnAreaVisible) {
                            camposValidos.push(elemento);
                        }
                        continue;
                    }
                    
                    //  MEJORA CRÍTICA: Capturar TODOS los campos habilitados y visibles
                    // sin importar su posición, ya que el scroll progresivo los activó
                    // Solo verificar que estén habilitados y sean interactuables en el DOM
                    const esInteractuable = await elemento.evaluate((el: HTMLElement) => {
                        const style = window.getComputedStyle(el);
                        const rect = el.getBoundingClientRect();
                        return style.display !== 'none' && 
                               style.visibility !== 'hidden' && 
                               rect.width > 0 && 
                               rect.height > 0;
                    });
                    
                    if (isEnabled && esInteractuable) {
                        camposValidos.push(elemento);
                    }
                } catch (error) {
                    // Si hay error verificando, incluir el elemento de todas formas
                    camposValidos.push(elemento);
                }
            }
            
            return camposValidos;
            
        } catch (error) {
            console.log('   ⚠️ Error obteniendo campos:', (error as Error).message);
            return [];
        }
    }

    /**
     * Realiza un scroll progresivo y suave para activar contenido dinámico
     * OPTIMIZADO: Scroll más rápido con esperas condicionales
     * Los campos se capturan después por obtenerTodosLosCampos()
     */
    async scrollProgresivoParaActivarContenido(): Promise<void> {
        console.log('     📜 Activando contenido dinámico con scroll progresivo...');
        
        // Obtener altura inicial del documento
        let alturaDocumento = await this.page.evaluate(() => document.body.scrollHeight);
        
        let posicionActual = 0;
        const distanciaPorScroll = 300; // OPTIMIZADO: Mayor distancia (era 200)
        const delayEntreScrolls = 80;   // OPTIMIZADO: Menor delay (era 150)
        
        let contadorScrolls = 0;
        
        while (posicionActual < alturaDocumento) {
            // Hacer scroll suave
            await this.page.evaluate((distance) => {
                window.scrollBy({ top: distance, behavior: 'smooth' });
            }, distanciaPorScroll);
            
            posicionActual += distanciaPorScroll;
            contadorScrolls++;
            
            // Esperar a que se active contenido dinámico
            await this.page.waitForTimeout(delayEntreScrolls);
            
            // Recalcular altura por si se activó contenido nuevo
            const nuevaAltura = await this.page.evaluate(() => document.body.scrollHeight);
            if (nuevaAltura > alturaDocumento) {
                console.log(`     📏 Contenido dinámico expandido: ${alturaDocumento}px → ${nuevaAltura}px`);
                alturaDocumento = nuevaAltura;
            }
        }
        
        console.log(`     ✅ Scroll completado (${contadorScrolls} scrolls) - Contenido activado`);
        
        // Scroll suave de vuelta al inicio
        await this.page.evaluate(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        
        // Esperar a que termine el scroll
        await this.page.waitForTimeout(500);
    }

    /**
     * Espera y captura campos dinámicos que aparecen después de completar selects
     */
    async esperarYCapturarCamposDinamicos(): Promise<void> {
        console.log(`     ⏳ Esperando campos dinámicos (2 segundos)...`);
        await this.page.waitForTimeout(2000);
        
        // Verificar si hay nuevos campos habilitados
        const nuevosCampos = await this.page.evaluate(() => {
            const campos = document.querySelectorAll('input, select, textarea');
            const camposHabilitados = Array.from(campos).filter(campo => {
                const element = campo as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
                return !element.disabled && element.offsetParent !== null; // Visible y habilitado
            });
            
            return camposHabilitados.length;
        });
        
        console.log(`     📊 Campos habilitados detectados: ${nuevosCampos}`);
    }

    /**
     * Extrae información detallada de un campo del formulario
     */
    async obtenerInfoCampoMejorada(elemento: any): Promise<FieldInfo | null> {
        try {
            return await elemento.evaluate((el: any) => {
                const tagName = el.tagName.toLowerCase();
                let type = el.type || tagName;
                
                //  NORMALIZAR TIPOS DE SELECT
                if (type === 'select-one' || type === 'select-multiple') {
                    type = 'select';
                }
                
                const id = el.id || '';
                const name = el.name || '';
                const className = el.className || '';
                const value = el.value || '';
                const placeholder = el.placeholder || '';
                
                //  NUEVO: Atributos específicos de CORFO
                const dataCodigo = el.getAttribute('data-codigo') || '';
                const dataOriginalTitle = el.getAttribute('data-original-title') || '';
                const title = el.getAttribute('title') || '';
                const dataControlId = el.getAttribute('data-controlid') || '';
                
                //  NUEVO: Atributos específicos para campos de archivo
                const dataExtensiones = el.getAttribute('data-extensiones') || '';
                const dataTamanoMaximo = el.getAttribute('data-tamano-maximo') || '';
                const dataTipoControl = el.getAttribute('data-tipo-control') || '';
                const dataAdjuntoId = el.getAttribute('data-adjuntoid') || '';
                
                //  NUEVO: Atributo para detectar campos numéricos con inputmask
                const dataInputmask = el.getAttribute('data-inputmask') || '';
                
                //  NUEVO: Detectar campos de email basándose en contexto (solo para inputs de texto)
                if (type === 'text' || type === 'input') {
                    const contextoCompleto = `${id} ${name} ${placeholder} ${dataCodigo} ${dataOriginalTitle} ${title}`.toLowerCase();
                    if (contextoCompleto.includes('email') || contextoCompleto.includes('correo') || 
                        contextoCompleto.includes('mail') || contextoCompleto.includes('electrónico') || 
                        contextoCompleto.includes('electronico')) {
                        type = 'email';
                    }
                }
                
                //  NUEVO: Detectar campos numéricos con inputmask integer o decimal
                if (type === 'text' && dataInputmask && (dataInputmask.includes('integer') || dataInputmask.includes('decimal'))) {
                    type = 'number';
                }
                
                //  NUEVO: Detectar campos fecha con datepicker o inputmask de fecha
                if (type === 'text' && (className.includes('datepicker') || 
                    (dataInputmask && (dataInputmask.includes('dd/mm/yyyy') || dataInputmask.includes('dd/mm/aaaa'))))) {
                    type = 'date';
                }

                // Verificar si el elemento está realmente disponible
                const rect = el.getBoundingClientRect();
                const style = window.getComputedStyle(el);
                const isDisplayed = style.display !== 'none';
                const isVisible = style.visibility !== 'hidden';
                const hasSize = rect.width > 0 && rect.height > 0;
                const isInDocument = document.contains(el);

                //  CORRECCIÓN: Para campos de archivo, aceptar incluso si están ocultos
                const isInteractuable = isDisplayed && isVisible && (hasSize || type === 'hidden' || type === 'file') && isInDocument;

                if (!isInteractuable && type !== 'hidden' && type !== 'file') return null;

                let etiqueta = '';
                
                //  ESTRATEGIA 1: data-codigo (específico de CORFO)
                if (dataCodigo) {
                    etiqueta = dataCodigo.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
                }

                //  ESTRATEGIA 2: data-original-title (específico de CORFO)
                if (!etiqueta && dataOriginalTitle) {
                    etiqueta = dataOriginalTitle;
                }

                //  ESTRATEGIA 3: title (específico de CORFO)
                if (!etiqueta && title) {
                    etiqueta = title;
                }

                //  ESTRATEGIA ESPECIAL PARA CAMPOS DE ARCHIVO: Buscar botón "Subir Archivo" cercano
                if (!etiqueta && type === 'file') {
                    // Buscar botón o span con texto "Subir Archivo" cerca del campo
                    const contenedor = el.closest('div, fieldset, .form-group, .field');
                    if (contenedor) {
                        const elementos = contenedor.querySelectorAll('span, button, a');
                        for (const elem of elementos) {
                            const texto = elem.textContent?.trim().toLowerCase() || '';
                            if (texto.includes('subir archivo') || texto.includes('subir') || texto.includes('archivo')) {
                                etiqueta = 'Campo de Archivo';
                                break;
                            }
                        }
                        
                        // Si no se encontró botón específico, buscar texto general
                        if (!etiqueta) {
                            const textoContenedor = contenedor.textContent?.toLowerCase() || '';
                            if (textoContenedor.includes('archivo') || textoContenedor.includes('adjuntar') || textoContenedor.includes('documento')) {
                                etiqueta = 'Campo de Archivo';
                            }
                        }
                    }
                }

                // Estrategia 4: Label con atributo 'for'
                if (!etiqueta && id) {
                    const labelEl = document.querySelector(`label[for="${id}"]`);
                    if (labelEl) etiqueta = labelEl.textContent?.trim() || '';
                }

                // Estrategia 5: Label padre
                if (!etiqueta) {
                    const parentLabel = el.closest('label');
                    if (parentLabel) {
                        etiqueta = parentLabel.textContent?.replace(value, '').trim() || '';
                    }
                }

                // Estrategia 6: Placeholder (solo si no es numérico)
                if (!etiqueta && placeholder && !placeholder.match(/^\d+$/) && !placeholder.includes('999999999')) {
                    etiqueta = placeholder;
                }

                // Estrategia 7: Texto anterior (hermanos anteriores)
                if (!etiqueta) {
                    let previous = el.previousElementSibling;
                    let attempts = 0;
                    while (previous && !etiqueta && attempts < 3) {
                        const text = previous.textContent?.trim();
                        if (text && text.length > 2 && text.length < 100 && 
                            !text.match(/^\d+$/) && 
                            !text.match(/^[^\w\s]+$/) && 
                            !text.match(/^[A-Z\s]+$/) &&
                            !text.includes('999999999')) {
                            etiqueta = text;
                            break;
                        }
                        previous = previous.previousElementSibling;
                        attempts++;
                    }
                }

                // Estrategia 8: Contenedor padre
                if (!etiqueta) {
                    const container = el.closest('div, td, th, li, fieldset');
                    if (container) {
                        const allText = container.textContent?.trim() || '';
                        const lines = allText.split('\n').map((line: string) => line.trim()).filter((line: string) => line.length > 0);
                        for (const line of lines) {
                            if (line.length > 2 && line.length < 100 &&
                                !line.match(/^\d+$/) && 
                                !line.match(/^[^\w\s]+$/) && 
                                !line.match(/^[A-Z\s]+$/) &&
                                !line.includes('999999999')) {
                                etiqueta = line;
                                break;
                            }
                        }
                    }
                }

                // Estrategia 9: Usar name o id como fallback (limpio)
                if (!etiqueta) {
                    const nameLimpio = name ? name.replace(/[^\w\s]/g, ' ').trim() : '';
                    const idLimpio = id ? id.replace(/[^\w\s]/g, ' ').trim() : '';
                    
                    if (nameLimpio && nameLimpio.length > 2) {
                        etiqueta = nameLimpio;
                    } else if (idLimpio && idLimpio.length > 2) {
                        etiqueta = idLimpio;
                    } else {
                        etiqueta = `Campo ${tagName}`;
                    }
                }

                //  NUEVO: Obtener opciones para selects
                let opciones: any[] = [];
                if (tagName === 'select') {
                    const options = el.querySelectorAll('option');
                    opciones = Array.from(options).map((opt: any) => ({
                        value: opt.value,
                        text: opt.textContent?.trim() || '',
                        selected: opt.selected,
                        disabled: opt.disabled
                    }));
                }

                // ✅ Detección precisa de campos obligatorios basada en estándares HTML5
                // Solo usar criterios válidos de obligatoriedad real
                const esObligatorio = el.hasAttribute('required') || 
                                    el.getAttribute('aria-required') === 'true' ||
                                    className.includes('required') ||
                                    className.includes('mandatory') ||
                                    className.includes('obligatorio') ||
                                    className.includes('is-required') ||
                                    className.includes('form-required') ||
                                    (etiqueta.includes('*') || etiqueta.includes('obligatorio')) ||
                                    (etiqueta.includes('(requerido)') || etiqueta.includes('(obligatorio)')) ||
                                    // Verificar en el contenedor padre (solo indicadores válidos)
                                    (() => {
                                        const contenedor = el.closest('div, fieldset, .form-group, .field');
                                        if (contenedor) {
                                            const textoContenedor = contenedor.textContent || '';
                                            const classContenedor = contenedor.className || '';
                                            return classContenedor.includes('required') || 
                                                   classContenedor.includes('mandatory') ||
                                                   classContenedor.includes('obligatorio') ||
                                                   textoContenedor.includes('*') ||
                                                   textoContenedor.includes('obligatorio');
                                        }
                                        return false;
                                    })();

                return {
                    tipo: type,
                    etiqueta: etiqueta,
                    esObligatorio,
                    name: name,
                    id: id,
                    value: value,
                    className: className,
                    placeholder: placeholder,
                    dataCodigo: dataCodigo,
                    dataOriginalTitle: dataOriginalTitle,
                    title: title,
                    dataControlId: dataControlId,
                    //  NUEVO: Atributos específicos para campos de archivo
                    dataExtensiones: dataExtensiones,
                    dataTamanoMaximo: dataTamanoMaximo,
                    dataTipoControl: dataTipoControl,
                    dataAdjuntoId: dataAdjuntoId,
                    //  NUEVO: Atributo para detectar campos numéricos con inputmask
                    dataInputmask: dataInputmask,
                    opciones: opciones,
                    esMultiple: el.multiple || false,
                    debug: {
                        isDisplayed,
                        isVisible,
                        hasSize,
                        isInDocument,
                        isInteractuable
                    }
                };
            });
        } catch (error) {
            return null;
        }
    }
}

