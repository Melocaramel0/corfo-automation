import { Page } from 'playwright';
import { CAMPOS_CORFO_MAPPING } from '../constants';
import { FieldValueGenerator } from './fieldValueGenerator';
import * as fs from 'fs/promises';
import * as path from 'path';

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
}

export class FieldCompleter {
    private valueGenerator: FieldValueGenerator;
    private archivosSubidosEnSesion: Set<string> = new Set();

    constructor(
        private page: Page,
        archivosSubidosEnSesion?: Set<string>
    ) {
        this.valueGenerator = new FieldValueGenerator(CAMPOS_CORFO_MAPPING);
        if (archivosSubidosEnSesion) {
            this.archivosSubidosEnSesion = archivosSubidosEnSesion;
        }
    }

    /**
     * Completa un campo del formulario con el valor apropiado
     */
    async completarCampo(elemento: any, info: FieldInfo): Promise<string | null> {
        try {
            const tipo = info.tipo.toLowerCase();
            const etiqueta = info.etiqueta || '';
            const opciones = info.opciones || [];
            const esMultiple = info.esMultiple || false;

            //  VERIFICAR SI EL CAMPO ES EDITABLE (NO READONLY/DISABLED)
            const esEditable = await elemento.evaluate((el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement) => {
                // Verificar atributos readonly y disabled
                const tieneReadonly = el.hasAttribute('readonly') || ('readOnly' in el && (el as HTMLInputElement | HTMLTextAreaElement).readOnly === true);
                const tieneDisabled = el.hasAttribute('disabled') || el.disabled === true;
                
                return !tieneReadonly && !tieneDisabled;
            });

            if (!esEditable) {
                console.log(`     ⏭️ Campo omitido (readonly/disabled): "${etiqueta}"`);
                return null;
            }

            //  MANEJO ESPECÍFICO DE SELECTS
            if (tipo === 'select') {
                return await this.completarSelectRobusto(elemento, info);
            }

            //  MANEJO DE INPUTS DE ARCHIVO
            if (tipo === 'file') {
                const resultadoArchivo = await this.subirArchivoPrueba(elemento, info);
                
                // Si el campo no tiene botón "Subir Archivo", no lo incluir en el reporte
                if (resultadoArchivo === 'sin_boton_subir_archivo') {
                    return null; // No incluir en el reporte
                }
                
                return resultadoArchivo;
            }

            //  GENERAR VALOR PARA OTROS TIPOS
            const valor = this.valueGenerator.generateValueForField(info);
            // Nota: Si valor está vacío, cada bloque específico de tipo aplicará su valor por defecto

            //  MANEJO DE CHECKBOXES
            if (tipo === 'checkbox') {
                const isChecked = await elemento.isChecked();
                if (!isChecked) {
                    await elemento.check();
                }
                return 'true';
            }

            //  MANEJO DE RADIO BUTTONS
            if (tipo === 'radio') {
                const isChecked = await elemento.isChecked();
                if (!isChecked) {
                    //  MEJORA: Manejo robusto para radio buttons con tooltips
                    try {
                        // Intentar cerrar tooltips activos antes del click
                        await this.page.evaluate(() => {
                            // Cerrar todos los tooltips visibles
                            const tooltips = document.querySelectorAll('[role="tooltip"], .tooltip, [id^="tooltip"]');
                            tooltips.forEach(tooltip => {
                                if (tooltip instanceof HTMLElement) {
                                    tooltip.style.display = 'none';
                                    tooltip.remove();
                                }
                            });
                        });
                        
                        await this.page.waitForTimeout(300);
                        
                        //  NUEVO: Intentar hacer click en el label asociado primero (más confiable)
                        const labelClickExitoso = await elemento.evaluate((el: HTMLInputElement) => {
                            // Buscar label asociado por 'for' o como padre
                            const labelFor = el.id ? document.querySelector(`label[for="${el.id}"]`) : null;
                            const labelPadre = el.closest('label');
                            const label = labelFor || labelPadre;
                            
                            if (label) {
                                try {
                                    (label as HTMLElement).click();
                                    return true;
                                } catch {
                                    return false;
                                }
                            }
                            return false;
                        });
                        
                        if (!labelClickExitoso) {
                            // Si no hay label, intentar click normal en el input
                            await elemento.click({ timeout: 5000 });
                        }
                    } catch (error) {
                        // Si falla, usar force:true para forzar el click
                        console.log(`     ⚠️ Click normal falló, forzando click en radio button...`);
                        try {
                            await elemento.click({ force: true, timeout: 3000 });
                        } catch (forceError) {
                            // Si aún falla, usar JavaScript click
                            console.log(`     ⚠️ Force click falló, usando JavaScript click...`);
                            await elemento.evaluate((el: HTMLInputElement) => el.click());
                        }
                    }
                    
                    //  CRÍTICO: Verificar que el clic fue exitoso
                    await this.page.waitForTimeout(500);
                    let quedoSeleccionado = await elemento.isChecked();
                    
                    //  NUEVO: Si aún no está seleccionado, intentar seleccionar el primer radio del grupo
                    if (!quedoSeleccionado) {
                        console.log(`     ⚠️ Radio button no quedó seleccionado, intentando seleccionar primer radio del grupo...`);
                        const nombreGrupo = await elemento.getAttribute('name');
                        if (nombreGrupo) {
                            try {
                                // Buscar el primer radio button del mismo grupo que sea visible y habilitado
                                const primerRadio = await this.page.$(`input[type="radio"][name="${nombreGrupo}"]:not([disabled])`);
                                if (primerRadio) {
                                    const esVisible = await primerRadio.isVisible();
                                    if (esVisible) {
                                        await primerRadio.click({ timeout: 3000 });
                                        await this.page.waitForTimeout(500);
                                        quedoSeleccionado = await primerRadio.isChecked();
                                        if (quedoSeleccionado) {
                                            console.log(`     ✅ Primer radio del grupo seleccionado exitosamente`);
                                        }
                                    }
                                }
                            } catch (errorGrupo) {
                                console.log(`     ⚠️ Error intentando seleccionar primer radio del grupo: ${(errorGrupo as Error).message}`);
                            }
                        }
                    }
                    
                    if (!quedoSeleccionado) {
                        console.log(`     ❌ Radio button NO quedó seleccionado después de múltiples intentos`);
                        // Retornar un valor especial que indique que NO se completó exitosamente
                        // pero que permita incluir el campo en el reporte con completado: false
                        return 'NO_SELECCIONADO';
                    }
                    
                    //  NUEVO: Esperar a que aparezcan campos condicionales si existen
                    // Muchos formularios CORFO usan data-condicional que muestra/oculta campos
                    const tieneCondicional = await elemento.evaluate((el: HTMLInputElement) => {
                        return el.hasAttribute('data-condicional') || el.hasAttribute('data-condicionalconfig');
                    });
                    
                    if (tieneCondicional) {
                        console.log(`     ⏳ Radio con campos condicionales, esperando campos dinámicos...`);
                        await this.page.waitForTimeout(1500); // Esperar a que aparezcan campos condicionales
                    }
                }
                return 'seleccionado';
            }

            //  MANEJO DE INPUTS DE TEXTO
            if (['text', 'email', 'tel', 'url', 'password'].includes(tipo)) {
                // Verificar si el valor está vacío y aplicar default
                const valorFinal = (!valor || valor.trim() === '') ? this.valueGenerator.getDefaultValue(tipo) : valor;
                
                if (!valor || valor.trim() === '') {
                    console.log(`     ℹ️ Campo de texto sin valor válido, usando valor por defecto`);
                }
                
                await elemento.fill('');
                await elemento.fill(valorFinal);
                return valorFinal;
            }

            //  MANEJO DE TEXTAREAS
            if (tipo === 'textarea') {
                // Verificar si el valor está vacío y aplicar default
                const valorFinal = (!valor || valor.trim() === '') ? this.valueGenerator.getDefaultValue(tipo) : valor;
                
                if (!valor || valor.trim() === '') {
                    console.log(`     ℹ️ Textarea sin valor válido, usando valor por defecto`);
                }
                
                await elemento.fill('');
                await elemento.fill(valorFinal);
                return valorFinal;
            }

            //  MANEJO DE INPUTS NUMÉRICOS
            if (tipo === 'number') {
                const numeroValor = typeof valor === 'string' ? valor.replace(/[^\d]/g, '') : valor;
                
                // Verificar si está vacío y aplicar default
                const numeroFinal = (!numeroValor || numeroValor.trim() === '') ? '0' : numeroValor;
                
                if (!numeroValor || numeroValor.trim() === '') {
                    console.log(`     ℹ️ Campo numérico sin valor válido, usando valor por defecto: 0`);
                }
                
                //  MEJORA: Para campos con inputmask (integer o decimal), usar estrategia diferente
                const tieneInputmask = info.dataInputmask && (info.dataInputmask.includes('integer') || info.dataInputmask.includes('decimal'));
                const esDecimal = info.dataInputmask && info.dataInputmask.includes('decimal');
                
                if (tieneInputmask) {
                    // Estrategia para campos con inputmask:
                    // 1. Click para activar el campo
                    await elemento.click();
                    await this.page.waitForTimeout(100);
                    
                    // 2. Limpiar con selectAll + delete
                    await elemento.press('Control+A');
                    await elemento.press('Backspace');
                    await this.page.waitForTimeout(100);
                    
                    // 3. Escribir carácter por carácter con type() para que inputmask lo procese
                    // Para decimales, agregar coma y decimales
                    const valorFinal = esDecimal ? `${numeroFinal},00` : numeroFinal;
                    await elemento.type(valorFinal, { delay: 50 });
                    await this.page.waitForTimeout(200);
                    
                    console.log(`     🔢 Campo inputmask ${esDecimal ? 'decimal' : 'integer'} completado: ${valorFinal}`);
                } else {
                    // Estrategia normal para campos sin inputmask
                    await elemento.fill('');
                    await elemento.fill(numeroFinal);
                }
                
                return numeroFinal;
            }

            //  MANEJO DE INPUTS DE FECHA
            if (tipo === 'date') {
                //  MEJORA: Para campos con datepicker e inputmask dd/mm/yyyy, usar estrategia especial
                const tieneInputmaskFecha = info.dataInputmask && 
                    (info.dataInputmask.includes('dd/mm/yyyy') || info.dataInputmask.includes('dd/mm/aaaa'));
                const tieneClaseDatepicker = info.className && info.className.includes('datepicker');
                
                if (tieneInputmaskFecha || tieneClaseDatepicker) {
                    // Estrategia para campos datepicker con inputmask:
                    // 1. Click para activar el campo
                    await elemento.click();
                    await this.page.waitForTimeout(100);
                    
                    // 2. Limpiar con selectAll + delete
                    await elemento.press('Control+A');
                    await elemento.press('Backspace');
                    await this.page.waitForTimeout(100);
                    
                    // 3. Escribir en formato dd/mm/yyyy carácter por carácter para que inputmask lo procese
                    const fechaFormato = CAMPOS_CORFO_MAPPING.FECHA_FORMATO_DDMMYYYY;
                    await elemento.type(fechaFormato, { delay: 50 });
                    await this.page.waitForTimeout(200);
                    
                    console.log(`     📅 Campo datepicker completado: ${fechaFormato}`);
                    return fechaFormato;
                } else {
                    // Estrategia normal para campos date HTML5
                    await elemento.fill('');
                    await elemento.fill('2024-12-31');
                    return '2024-12-31';
                }
            }

            // Si llegamos aquí, el tipo no fue manejado específicamente
            // Aplicar valor por defecto según el tipo
            const valorDefault = this.valueGenerator.getDefaultValue(tipo);
            try {
                if (['text', 'email', 'tel', 'url', 'password', 'textarea'].includes(tipo)) {
                    await elemento.fill('');
                    await elemento.fill(valorDefault);
                } else if (tipo === 'number') {
                    const numeroValor = valorDefault.replace(/[^\d]/g, '');
                    await elemento.fill('');
                    await elemento.fill(numeroValor);
                    return numeroValor;
                }
                return valorDefault;
            } catch (fillError) {
                // Si falla el fill, retornar el valor por defecto de todas formas
                console.log(`     ⚠️ No se pudo completar campo, pero se asignará valor por defecto: ${valorDefault}`);
                return valorDefault;
            }
        } catch (error) {
            console.log(`     ⚠️ Error completando campo ${info.etiqueta}:`, (error as Error).message);
            // En caso de error, aplicar valor por defecto según el tipo
            const tipo = (info.tipo || 'text').toLowerCase();
            const valorDefault = this.valueGenerator.getDefaultValue(tipo);
            try {
                // Intentar asignar el valor por defecto aunque haya habido error
                if (['text', 'email', 'tel', 'url', 'password', 'textarea'].includes(tipo)) {
                    await elemento.fill(valorDefault);
                } else if (tipo === 'number') {
                    const numeroValor = valorDefault.replace(/[^\d]/g, '');
                    await elemento.fill(numeroValor);
                    return numeroValor;
                }
                return valorDefault;
            } catch (defaultError) {
                // Si ni siquiera podemos asignar el default, retornarlo de todas formas
                console.log(`     ⚠️ No se pudo asignar valor por defecto, pero se retornará: ${valorDefault}`);
                return valorDefault;
            }
        }
    }

    /**
     * Completa un select de forma robusta
     */
    async completarSelectRobusto(elemento: any, info: FieldInfo): Promise<string | null> {
        try {
            const opciones = info.opciones || [];
            const esMultiple = info.esMultiple || false;
            const etiqueta = info.etiqueta || '';
            const dataCodigo = info.dataCodigo || '';
            
            console.log(`     🔍 Select: "${etiqueta}" (${opciones.length} opciones, múltiple: ${esMultiple})`);
            
            if (opciones.length === 0) {
                console.log(`     ⚠️ Select sin opciones, aplicando valor por defecto`);
                return CAMPOS_CORFO_MAPPING.SIN_OPCIONES_DISPONIBLES;
            }
            
            //  Filtrar opciones válidas (no placeholders)
            const opcionesValidas = opciones.filter((opt: any) => 
                opt.value && 
                opt.value !== '' && 
                opt.text && 
                opt.text.length > 0 &&
                !opt.disabled &&
                !opt.text.toLowerCase().includes('seleccionar') &&
                !opt.text.toLowerCase().includes('--') &&
                !opt.text.toLowerCase().includes('ninguno') &&
                !opt.text.toLowerCase().includes('seleccione') &&
                !opt.text.toLowerCase().includes('elija') &&
                !opt.text.toLowerCase().includes('choose') &&
                !opt.text.toLowerCase().includes('select') &&
                !opt.text.toLowerCase().includes('por favor')
            );
            
            console.log(`     📋 Opciones válidas: ${opcionesValidas.length}`);
            
            if (opcionesValidas.length === 0) {
                console.log(`     ⚠️ No hay opciones válidas, seleccionando primera opción disponible`);
                // Intentar seleccionar la primera opción aunque sea placeholder
                if (opciones.length > 0) {
                    try {
                        await elemento.selectOption(opciones[0].value);
                        return opciones[0].text;
                    } catch (selectError) {
                        console.log(`     ⚠️ No se pudo seleccionar primera opción`);
                        return CAMPOS_CORFO_MAPPING.PRIMERA_OPCION;
                    }
                }
                return CAMPOS_CORFO_MAPPING.PRIMERA_OPCION;
            }
            
            //  Selección inteligente basada en contexto
            let opcionSeleccionada = null;
            const contextoCompleto = `${etiqueta} ${dataCodigo}`.toLowerCase();
            
            // Selección por palabras clave específicas
            if (contextoCompleto.includes('región') || contextoCompleto.includes('region')) {
                opcionSeleccionada = opcionesValidas.find((opt: any) => 
                    opt.text.toLowerCase().includes('metropolitana') ||
                    opt.text.toLowerCase().includes('santiago') ||
                    opt.text.toLowerCase().includes('valparaíso') ||
                    opt.text.toLowerCase().includes('biobío') ||
                    opt.text.toLowerCase().includes('araucanía')
                );
            } else if (contextoCompleto.includes('sector') && contextoCompleto.includes('aplicación')) {
                opcionSeleccionada = opcionesValidas.find((opt: any) => 
                    opt.text.toLowerCase().includes('tecnología') ||
                    opt.text.toLowerCase().includes('innovación') ||
                    opt.text.toLowerCase().includes('medio ambiente') ||
                    opt.text.toLowerCase().includes('sustentabilidad') ||
                    opt.text.toLowerCase().includes('digital')
                );
            } else if (contextoCompleto.includes('sector') && contextoCompleto.includes('impacto')) {
                opcionSeleccionada = opcionesValidas.find((opt: any) => 
                    opt.text.toLowerCase().includes('económico') ||
                    opt.text.toLowerCase().includes('social') ||
                    opt.text.toLowerCase().includes('ambiental') ||
                    opt.text.toLowerCase().includes('territorial')
                );
            } else if (contextoCompleto.includes('tamaño') || contextoCompleto.includes('tamano')) {
                opcionSeleccionada = opcionesValidas.find((opt: any) => 
                    opt.text.toLowerCase().includes('mediana') ||
                    opt.text.toLowerCase().includes('pequeña') ||
                    opt.text.toLowerCase().includes('grande')
                );
            } else if (contextoCompleto.includes('tipo') && contextoCompleto.includes('documento')) {
                opcionSeleccionada = opcionesValidas.find((opt: any) => 
                    opt.text.toLowerCase().includes('cédula') ||
                    opt.text.toLowerCase().includes('identidad')
                );
            }
            
            // Si no se encontró por contexto, usar la primera opción válida
            if (!opcionSeleccionada) {
                opcionSeleccionada = opcionesValidas[0];
            }
            
            //  Seleccionar la opción
            if (esMultiple) {
                // Para selects múltiples, seleccionar solo una opción
                await elemento.selectOption(opcionSeleccionada.value);
                console.log(`     ✅ Select múltiple completado: "${opcionSeleccionada.text}"`);
            } else {
                // Para selects simples
                await elemento.selectOption(opcionSeleccionada.value);
                console.log(`     ✅ Select completado: "${opcionSeleccionada.text}"`);
            }
            
            return opcionSeleccionada.text;
            
        } catch (error) {
            console.log(`     ⚠️ Error completando select, aplicando valor por defecto:`, (error as Error).message);
            return CAMPOS_CORFO_MAPPING.OPCION_POR_DEFECTO;
        }
    }

    /**
     * Sube un archivo PDF de prueba al campo de archivo
     */
    async subirArchivoPrueba(elemento: any, info: FieldInfo): Promise<string | null> {
        try {
            const etiqueta = info.etiqueta || '';
            
            //  CRÍTICO: Generar ID igual al usado en procesamiento de campos para consistencia
            const campoId = `${info.etiqueta}_${info.tipo}_${info.name || info.id}`;
            
            //  1. Verificar PRIMERO si ya subimos un archivo para este campo en esta sesión
            if (this.archivosSubidosEnSesion.has(campoId)) {
                console.log(`     ℹ️ Campo file ya procesado en esta sesión: ${etiqueta}`);
                return 'archivo_ya_subido_en_sesion';
            }
            
            //  2. Verificar si YA HAY un archivo subido en el DOM
            const yaTieneArchivo = await this.verificarArchivoYaSubido(elemento);
            if (yaTieneArchivo) {
                console.log(`     ✅ Campo file ya tiene archivo subido: ${etiqueta}`);
                // Agregar al Set para no reprocesar
                this.archivosSubidosEnSesion.add(campoId);
                return 'archivo_ya_subido';
            }
            
            //  3. Verificar si este campo está asociado con un botón visible
            const tieneBotonSubirArchivo = await this.verificarBotonSubirArchivoVisible(elemento);
            if (!tieneBotonSubirArchivo) {
                console.log(`     ℹ️ Campo file sin botón visible, omitiendo: ${etiqueta}`);
                return 'sin_boton_subir_archivo';
            }
            
            // Buscar archivo PDF disponible
            const rutaArchivo = await this.obtenerArchivoPrueba();
            
            if (!rutaArchivo) {
                return 'archivo_no_encontrado';
            }
            
            // Subir el archivo PDF
            await elemento.setInputFiles(rutaArchivo);
            await this.page.waitForTimeout(1000);
            
            // Marcar como subido en esta sesión
            this.archivosSubidosEnSesion.add(campoId);
            
            const nombreArchivo = path.basename(rutaArchivo);
            console.log(`     ✅ Archivo PDF subido: ${nombreArchivo}`);
            return `archivo_subido: ${nombreArchivo}`;
            
        } catch (error) {
            return 'error_subida_archivo';
        }
    }

    /**
     * Verifica si el campo de archivo está asociado con un botón "Subir Archivo" visible
     */
    private async verificarBotonSubirArchivoVisible(elemento: any): Promise<boolean> {
        try {
            //  MEJORA: Estrategia más flexible y menos restrictiva
            
            // 1. Verificar si el campo de archivo en sí es visible
            const campoVisible = await elemento.evaluate((el: HTMLInputElement) => {
                const rect = el.getBoundingClientRect();
                return rect.width > 0 || rect.height > 0; // Campos file pueden estar ocultos
            });
            
            // 2. Buscar contenedor del campo
            const contenedor = await elemento.evaluateHandle((el: Element) => {
                return el.closest('.form-group, .field, fieldset, div[class*="file"], div[class*="upload"], .input-group') || 
                       el.closest('div');
            });
            
            if (contenedor) {
                // 3. Verificar si hay elementos interactivos relacionados con archivos
                const tieneElementosArchivo = await contenedor.evaluate((container: Element) => {
                    const texto = container.textContent?.toLowerCase() || '';
                    
                    // Buscar indicadores de campo de archivo
                    const tieneIndicadores = texto.includes('subir archivo') || 
                                            texto.includes('subir') ||
                                            texto.includes('adjuntar') ||
                                            texto.includes('archivo') ||
                                            texto.includes('upload') ||
                                            texto.includes('seleccionar archivo') ||
                                            texto.includes('formato');
                    
                    // Buscar elementos interactivos (botones, labels, spans)
                    const elementosInteractivos = container.querySelectorAll('button, span, a, label, div[class*="btn"]');
                    
                    // Si hay indicadores de archivo Y elementos interactivos, es válido
                    return tieneIndicadores && elementosInteractivos.length > 0;
                });
                
                if (tieneElementosArchivo) {
                    return true;
                }
            }
            
            // 4. Estrategia de respaldo: Si es un campo tipo file, asumimos que es válido
            // (mejor procesar de más que omitir campos válidos)
            return true;
            
        } catch (error) {
            // En caso de error, asumir que es válido (mejor intentar que omitir)
            return true;
        }
    }

    /**
     * Verifica si ya hay un archivo subido en el campo
     */
    private async verificarArchivoYaSubido(elemento: any): Promise<boolean> {
        try {
            // 1. Verificar si el input file tiene valor (files.length > 0)
            const tieneArchivoEnInput = await elemento.evaluate((el: HTMLInputElement) => {
                return el.files && el.files.length > 0;
            });
            
            if (tieneArchivoEnInput) {
                return true;
            }
            
            // 2. Buscar el contenedor más cercano del campo de archivo
            const contenedor = await elemento.evaluateHandle((el: Element) => {
                // Buscar contenedor más específico primero
                return el.closest('.form-group, .field, .input-group, fieldset, div[class*="file"], div[class*="upload"]') || 
                       el.closest('div');
            });
            
            if (contenedor) {
                // 3. Verificar indicadores visuales de archivo ya subido en el contenedor ESPECÍFICO
                const tieneArchivoAdjunto = await contenedor.evaluate((container: Element) => {
                    const texto = container.textContent?.toLowerCase() || '';
                    const html = container.innerHTML?.toLowerCase() || '';
                    
                    // Verificar múltiples indicadores de archivo subido
                    const tieneIndicadorTexto = texto.includes('archivo adjunto:') || 
                                               texto.includes('fecha subida:') ||
                                               texto.includes('fecha de subida') ||
                                               html.includes('.pdf') ||
                                               html.includes('.docx') ||
                                               html.includes('.xlsx');
                    
                    // Buscar elementos que muestren nombre de archivo
                    const tieneNombreArchivo = container.querySelector('span[id*="nombre"], a[href*=".pdf"], a[href*=".docx"]');
                    
                    // Buscar iconos de archivo o basura (delete)
                    const tieneIconoArchivo = container.querySelector('i[class*="file"], i[class*="document"], button[class*="delete"], a[class*="delete"]');
                    
                    // Verificar que NO sea solo el botón "Subir Archivo"
                    const textoLimpio = texto.replace(/\s+/g, ' ').trim();
                    const esSoloBoton = textoLimpio === 'subir archivo' || 
                                       textoLimpio === 'seleccionar archivo' ||
                                       textoLimpio === 'formato';
                    
                    return (tieneIndicadorTexto || tieneNombreArchivo || tieneIconoArchivo) && !esSoloBoton;
                });
                
                if (tieneArchivoAdjunto) {
                    return true;
                }
            }
            
            return false;
            
        } catch (error) {
            return false;
        }
    }

    /**
     * Obtiene la ruta de un archivo PDF de prueba
     */
    private async obtenerArchivoPrueba(): Promise<string | null> {
        try {
            // Ir 4 niveles arriba desde dist/src/automation/fields/ hasta la raíz del proyecto
            const directorioArchivos = path.join(__dirname, '..', '..', '..', 'archivos_prueba');
            
            // Buscar archivos PDF disponibles
            const archivosDisponibles = [
                'documento_prueba.pdf',
                'archivo_prueba.pdf', 
                'test.pdf',
                'prueba.pdf'
            ];
            
            for (const archivo of archivosDisponibles) {
                const rutaCompleta = path.join(directorioArchivos, archivo);
                try {
                    await fs.access(rutaCompleta);
                    console.log(`     📄 Archivo PDF encontrado: ${archivo}`);
                    return rutaCompleta;
                } catch {
                    // Continuar con el siguiente archivo
                }
            }
            
            console.log(`     ⚠️ No se encontró archivo PDF en ${directorioArchivos}`);
            return null;
            
        } catch (error) {
            console.log(`     ⚠️ Error buscando archivo PDF:`, (error as Error).message);
            return null;
        }
    }
}

