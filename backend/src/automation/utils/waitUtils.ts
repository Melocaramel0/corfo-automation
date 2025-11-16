import { Page } from 'playwright';

/**
 * Utilidades para esperar condiciones en Playwright
 */
export class WaitUtils {
    /**
     * Espera hasta que una condición se cumpla o se alcance el timeout
     * @param page Página de Playwright
     * @param condition Función que retorna una promesa con el resultado de la condición
     * @param timeoutMs Timeout en milisegundos
     * @returns true si la condición se cumplió, false si se alcanzó el timeout
     */
    static async waitForCondition(
        page: Page,
        condition: () => Promise<boolean>,
        timeoutMs: number
    ): Promise<boolean> {
        const inicio = Date.now();
        const intervalo = 100; // Verificar cada 100ms
        
        while (Date.now() - inicio < timeoutMs) {
            try {
                if (await condition()) {
                    const tiempoEspera = Date.now() - inicio;
                    if (tiempoEspera < timeoutMs * 0.5) {
                        console.log(`   ⚡ Condición cumplida en ${tiempoEspera}ms (ahorro: ${timeoutMs - tiempoEspera}ms)`);
                    }
                    return true;
                }
            } catch (error) {
                // Si falla la verificación, continuar esperando
            }
            await page.waitForTimeout(intervalo);
        }
        
        // Timeout alcanzado, continuar de todas formas (comportamiento actual)
        return false;
    }

    /**
     * Espera adaptativa después del login: verifica múltiples condiciones para asegurar
     * que la página está completamente cargada y lista para continuar
     * @param page Página de Playwright
     * @param timeoutMs Timeout máximo en milisegundos (default: 30000 = 30 segundos)
     * @returns true si la página está lista, false si se alcanzó el timeout
     */
    static async esperarPaginaListaPostLogin(
        page: Page,
        timeoutMs: number = 30000
    ): Promise<boolean> {
        const inicio = Date.now();
        const intervalo = 200; // Verificar cada 200ms
        let ultimaUrl = page.url();
        let contadorUrlEstable = 0;
        const REQUIERE_URL_ESTABLE = 3; // URL debe estar estable por 3 verificaciones consecutivas (600ms)
        
        console.log('⏳ Esperando carga completa de página post-login (adaptativo)...');
        
        while (Date.now() - inicio < timeoutMs) {
            try {
                // 1. Verificar que el DOM esté cargado
                const domReady = await page.evaluate(() => {
                    return document.readyState === 'complete';
                });
                
                if (!domReady) {
                    await page.waitForTimeout(intervalo);
                    continue;
                }
                
                // 2. Verificar que la URL esté estable (no cambiando)
                const urlActual = page.url();
                if (urlActual === ultimaUrl) {
                    contadorUrlEstable++;
                } else {
                    contadorUrlEstable = 0;
                    ultimaUrl = urlActual;
                }
                
                // 3. Verificar que no haya elementos de carga visibles
                const elementosCarga = await page.evaluate(() => {
                    const loaders = document.querySelectorAll(
                        '.loading, .spinner, .loader, [class*="loading"], [class*="spinner"], ' +
                        '[id*="loading"], [id*="spinner"], .fa-spinner, .fa-spin'
                    );
                    return Array.from(loaders).some(el => {
                        const rect = el.getBoundingClientRect();
                        const style = window.getComputedStyle(el);
                        return rect.width > 0 && rect.height > 0 && 
                               style.display !== 'none' && 
                               style.visibility !== 'hidden';
                    });
                });
                
                // 4. Verificar que haya contenido visible en la página
                const tieneContenido = await page.evaluate(() => {
                    const body = document.body;
                    if (!body) return false;
                    
                    const rect = body.getBoundingClientRect();
                    const tieneTexto = body.textContent && body.textContent.trim().length > 50;
                    const tieneElementos = body.children.length > 0;
                    
                    return rect.width > 0 && rect.height > 0 && tieneTexto && tieneElementos;
                });
                
                // 5. Intentar esperar networkidle (pero no bloquear si falla)
                let networkIdle = false;
                try {
                    await page.waitForLoadState('networkidle', { timeout: 1000 });
                    networkIdle = true;
                } catch {
                    // Si networkidle falla, continuar verificando otras condiciones
                    networkIdle = false;
                }
                
                // Si todas las condiciones se cumplen (o al menos las críticas)
                if (domReady && 
                    contadorUrlEstable >= REQUIERE_URL_ESTABLE && 
                    !elementosCarga && 
                    tieneContenido) {
                    
                    const tiempoEspera = Date.now() - inicio;
                    console.log(`✅ Página lista post-login en ${tiempoEspera}ms${networkIdle ? ' (networkidle OK)' : ' (networkidle timeout, pero página estable)'}`);
                    return true;
                }
                
            } catch (error) {
                // Si falla alguna verificación, continuar esperando
            }
            
            await page.waitForTimeout(intervalo);
        }
        
        const tiempoEspera = Date.now() - inicio;
        console.log(`⚠️ Timeout alcanzado después de ${tiempoEspera}ms, continuando de todas formas...`);
        return false;
    }

    /**
     * Espera adaptativa para carga del formulario: verifica que los campos del formulario
     * estén disponibles y la página esté lista para interactuar
     * @param page Página de Playwright
     * @param timeoutMs Timeout máximo en milisegundos (default: 15000 = 15 segundos)
     * @param minCamposRequeridos Número mínimo de campos requeridos (default: 1)
     * @returns true si el formulario está listo, false si se alcanzó el timeout
     */
    static async esperarFormularioListo(
        page: Page,
        timeoutMs: number = 15000,
        minCamposRequeridos: number = 1
    ): Promise<boolean> {
        const inicio = Date.now();
        const intervalo = 200; // Verificar cada 200ms
        let ultimaUrl = page.url();
        let contadorUrlEstable = 0;
        const REQUIERE_URL_ESTABLE = 3; // URL debe estar estable por 3 verificaciones consecutivas
        
        console.log(`⏳ Esperando carga completa del formulario (adaptativo, mínimo ${minCamposRequeridos} campo(s))...`);
        
        while (Date.now() - inicio < timeoutMs) {
            try {
                // 1. Verificar que el DOM esté cargado
                const domReady = await page.evaluate(() => {
                    return document.readyState === 'complete';
                });
                
                if (!domReady) {
                    await page.waitForTimeout(intervalo);
                    continue;
                }
                
                // 2. Verificar que la URL esté estable
                const urlActual = page.url();
                if (urlActual === ultimaUrl) {
                    contadorUrlEstable++;
                } else {
                    contadorUrlEstable = 0;
                    ultimaUrl = urlActual;
                }
                
                // 3. Verificar que haya campos del formulario disponibles
                const camposDisponibles = await page.evaluate(() => {
                    const inputs = document.querySelectorAll(
                        'input:not([type="hidden"]):not([disabled]), ' +
                        'select:not([disabled]), ' +
                        'textarea:not([disabled])'
                    );
                    
                    let camposVisibles = 0;
                    inputs.forEach(input => {
                        const rect = input.getBoundingClientRect();
                        const style = window.getComputedStyle(input);
                        if (rect.width > 0 && rect.height > 0 && 
                            style.display !== 'none' && 
                            style.visibility !== 'hidden' &&
                            style.opacity !== '0') {
                            camposVisibles++;
                        }
                    });
                    
                    return camposVisibles;
                });
                
                // 4. Verificar que no haya elementos de carga visibles
                const elementosCarga = await page.evaluate(() => {
                    const loaders = document.querySelectorAll(
                        '.loading, .spinner, .loader, [class*="loading"], [class*="spinner"], ' +
                        '[id*="loading"], [id*="spinner"], .fa-spinner, .fa-spin'
                    );
                    return Array.from(loaders).some(el => {
                        const rect = el.getBoundingClientRect();
                        const style = window.getComputedStyle(el);
                        return rect.width > 0 && rect.height > 0 && 
                               style.display !== 'none' && 
                               style.visibility !== 'hidden';
                    });
                });
                
                // 5. Verificar que haya contenido visible
                const tieneContenido = await page.evaluate(() => {
                    const body = document.body;
                    if (!body) return false;
                    
                    const rect = body.getBoundingClientRect();
                    const tieneTexto = body.textContent && body.textContent.trim().length > 50;
                    
                    return rect.width > 0 && rect.height > 0 && tieneTexto;
                });
                
                // Si todas las condiciones se cumplen
                if (domReady && 
                    contadorUrlEstable >= REQUIERE_URL_ESTABLE && 
                    camposDisponibles >= minCamposRequeridos &&
                    !elementosCarga && 
                    tieneContenido) {
                    
                    const tiempoEspera = Date.now() - inicio;
                    console.log(`✅ Formulario listo en ${tiempoEspera}ms (${camposDisponibles} campos disponibles)`);
                    return true;
                }
                
            } catch (error) {
                // Si falla alguna verificación, continuar esperando
            }
            
            await page.waitForTimeout(intervalo);
        }
        
        const tiempoEspera = Date.now() - inicio;
        console.log(`⚠️ Timeout alcanzado después de ${tiempoEspera}ms, continuando de todas formas...`);
        return false;
    }

    /**
     * Espera adaptativa después de una navegación: verifica que la página esté estable
     * @param page Página de Playwright
     * @param timeoutMs Timeout máximo en milisegundos (default: 10000 = 10 segundos)
     * @returns true si la página está estable, false si se alcanzó el timeout
     */
    static async esperarEstabilidadPagina(
        page: Page,
        timeoutMs: number = 10000
    ): Promise<boolean> {
        const inicio = Date.now();
        const intervalo = 200;
        let ultimaUrl = page.url();
        let contadorUrlEstable = 0;
        const REQUIERE_URL_ESTABLE = 3;
        
        while (Date.now() - inicio < timeoutMs) {
            try {
                const domReady = await page.evaluate(() => document.readyState === 'complete');
                if (!domReady) {
                    await page.waitForTimeout(intervalo);
                    continue;
                }
                
                const urlActual = page.url();
                if (urlActual === ultimaUrl) {
                    contadorUrlEstable++;
                } else {
                    contadorUrlEstable = 0;
                    ultimaUrl = urlActual;
                }
                
                if (contadorUrlEstable >= REQUIERE_URL_ESTABLE) {
                    const tiempoEspera = Date.now() - inicio;
                    if (tiempoEspera > 500) {
                        console.log(`   ⏳ Página estable en ${tiempoEspera}ms`);
                    }
                    return true;
                }
            } catch (error) {
                // Continuar esperando
            }
            await page.waitForTimeout(intervalo);
        }
        
        return false;
    }

    /**
     * Espera adaptativa después de un click: verifica que la acción se haya completado
     * @param page Página de Playwright
     * @param timeoutMs Timeout máximo en milisegundos (default: 5000 = 5 segundos)
     * @param verificarCambio Si true, verifica que algo haya cambiado en la página
     * @returns true si la acción se completó, false si se alcanzó el timeout
     */
    static async esperarDespuesDeClick(
        page: Page,
        timeoutMs: number = 5000,
        verificarCambio: boolean = false
    ): Promise<boolean> {
        const inicio = Date.now();
        const intervalo = 150;
        let estadoInicial: any = null;
        
        if (verificarCambio) {
            estadoInicial = await page.evaluate(() => ({
                url: window.location.href,
                elementosVisibles: document.querySelectorAll('input, select, textarea, button').length
            }));
        }
        
        while (Date.now() - inicio < timeoutMs) {
            try {
                const domReady = await page.evaluate(() => document.readyState === 'complete');
                if (!domReady) {
                    await page.waitForTimeout(intervalo);
                    continue;
                }
                
                if (verificarCambio && estadoInicial) {
                    const estadoActual = await page.evaluate(() => ({
                        url: window.location.href,
                        elementosVisibles: document.querySelectorAll('input, select, textarea, button').length
                    }));
                    
                    if (estadoActual.url !== estadoInicial.url || 
                        estadoActual.elementosVisibles !== estadoInicial.elementosVisibles) {
                        const tiempoEspera = Date.now() - inicio;
                        if (tiempoEspera > 300) {
                            console.log(`   ⏳ Cambio detectado en ${tiempoEspera}ms`);
                        }
                        return true;
                    }
                } else {
                    // Sin verificación de cambio, solo esperar estabilidad básica
                    const urlEstable = await this.esperarEstabilidadPagina(page, 1000);
                    if (urlEstable) {
                        const tiempoEspera = Date.now() - inicio;
                        if (tiempoEspera > 300) {
                            console.log(`   ⏳ Acción completada en ${tiempoEspera}ms`);
                        }
                        return true;
                    }
                }
            } catch (error) {
                // Continuar esperando
            }
            await page.waitForTimeout(intervalo);
        }
        
        return false;
    }

    /**
     * Espera adaptativa después de completar un campo: verifica que el campo se actualizó
     * y que campos dinámicos aparezcan si es necesario
     * @param page Página de Playwright
     * @param timeoutMs Timeout máximo en milisegundos (default: 3000 = 3 segundos)
     * @param esperarCamposDinamicos Si true, espera a que aparezcan nuevos campos
     * @returns true si el campo se actualizó, false si se alcanzó el timeout
     */
    static async esperarDespuesDeCompletarCampo(
        page: Page,
        timeoutMs: number = 3000,
        esperarCamposDinamicos: boolean = false
    ): Promise<boolean> {
        const inicio = Date.now();
        const intervalo = 150;
        let camposIniciales = 0;
        
        if (esperarCamposDinamicos) {
            camposIniciales = await page.evaluate(() => {
                return document.querySelectorAll('input:not([disabled]), select:not([disabled]), textarea:not([disabled])').length;
            });
        }
        
        while (Date.now() - inicio < timeoutMs) {
            try {
                const domReady = await page.evaluate(() => document.readyState === 'complete');
                if (!domReady) {
                    await page.waitForTimeout(intervalo);
                    continue;
                }
                
                if (esperarCamposDinamicos) {
                    const camposActuales = await page.evaluate(() => {
                        return document.querySelectorAll('input:not([disabled]), select:not([disabled]), textarea:not([disabled])').length;
                    });
                    
                    // Si aparecieron nuevos campos, esperar un poco más para que se estabilicen
                    if (camposActuales > camposIniciales) {
                        await page.waitForTimeout(300);
                        const tiempoEspera = Date.now() - inicio;
                        console.log(`   ⏳ Campos dinámicos detectados en ${tiempoEspera}ms (${camposActuales - camposIniciales} nuevos)`);
                        return true;
                    }
                }
                
                // Verificar que no haya elementos de carga activos
                const elementosCarga = await page.evaluate(() => {
                    const loaders = document.querySelectorAll('.loading, .spinner, .loader, [class*="loading"], [class*="spinner"]');
                    return Array.from(loaders).some(el => {
                        const rect = el.getBoundingClientRect();
                        const style = window.getComputedStyle(el);
                        return rect.width > 0 && rect.height > 0 && 
                               style.display !== 'none' && 
                               style.visibility !== 'hidden';
                    });
                });
                
                if (!elementosCarga) {
                    const tiempoEspera = Date.now() - inicio;
                    if (tiempoEspera > 200) {
                        // Solo log si fue más de 200ms para no saturar logs
                    }
                    return true;
                }
            } catch (error) {
                // Continuar esperando
            }
            await page.waitForTimeout(intervalo);
        }
        
        return false;
    }

    /**
     * Espera adaptativa después de scroll: verifica que el contenido dinámico se haya activado
     * @param page Página de Playwright
     * @param timeoutMs Timeout máximo en milisegundos (default: 2000 = 2 segundos)
     * @returns true si el scroll se completó, false si se alcanzó el timeout
     */
    static async esperarDespuesDeScroll(
        page: Page,
        timeoutMs: number = 2000
    ): Promise<boolean> {
        const inicio = Date.now();
        const intervalo = 200;
        let alturaInicial = 0;
        
        try {
            alturaInicial = await page.evaluate(() => document.body.scrollHeight);
        } catch {
            // Si falla, continuar de todas formas
        }
        
        while (Date.now() - inicio < timeoutMs) {
            try {
                const alturaActual = await page.evaluate(() => document.body.scrollHeight);
                
                // Si la altura cambió, significa que se activó contenido dinámico
                if (alturaActual > alturaInicial) {
                    await page.waitForTimeout(300); // Esperar un poco más para que se estabilice
                    return true;
                }
                
                // Si no cambió pero ya pasó suficiente tiempo, continuar
                if (Date.now() - inicio > 500) {
                    return true;
                }
            } catch (error) {
                // Continuar esperando
            }
            await page.waitForTimeout(intervalo);
        }
        
        return false;
    }

    /**
     * Espera adaptativa para modales: verifica que el modal aparezca o desaparezca
     * @param page Página de Playwright
     * @param esperarAparicion Si true, espera a que aparezca el modal; si false, espera a que desaparezca
     * @param timeoutMs Timeout máximo en milisegundos (default: 5000 = 5 segundos)
     * @returns true si el modal está en el estado esperado, false si se alcanzó el timeout
     */
    static async esperarModal(
        page: Page,
        esperarAparicion: boolean = true,
        timeoutMs: number = 5000
    ): Promise<boolean> {
        const inicio = Date.now();
        const intervalo = 200;
        
        while (Date.now() - inicio < timeoutMs) {
            try {
                const modalVisible = await page.evaluate(() => {
                    const modals = document.querySelectorAll('.modal:not(.hide), [role="dialog"]:not([style*="display: none"]), .swal2-container:not([style*="display: none"])');
                    return Array.from(modals).some(modal => {
                        const rect = modal.getBoundingClientRect();
                        const style = window.getComputedStyle(modal);
                        return rect.width > 0 && rect.height > 0 && 
                               style.display !== 'none' && 
                               style.visibility !== 'hidden';
                    });
                });
                
                if (esperarAparicion && modalVisible) {
                    const tiempoEspera = Date.now() - inicio;
                    console.log(`   ⏳ Modal apareció en ${tiempoEspera}ms`);
                    return true;
                }
                
                if (!esperarAparicion && !modalVisible) {
                    const tiempoEspera = Date.now() - inicio;
                    if (tiempoEspera > 300) {
                        console.log(`   ⏳ Modal desapareció en ${tiempoEspera}ms`);
                    }
                    return true;
                }
            } catch (error) {
                // Continuar esperando
            }
            await page.waitForTimeout(intervalo);
        }
        
        return false;
    }

    /**
     * Espera adaptativa genérica: reemplazo inteligente para waitForTimeout
     * Verifica condiciones básicas de estabilidad antes de continuar
     * @param page Página de Playwright
     * @param tiempoMinimoMs Tiempo mínimo a esperar en milisegundos (default: 100)
     * @param timeoutMs Timeout máximo en milisegundos (default: 3000 = 3 segundos)
     * @returns true si se completó la espera, false si se alcanzó el timeout
     */
    static async esperarAdaptativa(
        page: Page,
        tiempoMinimoMs: number = 100,
        timeoutMs: number = 3000
    ): Promise<boolean> {
        const inicio = Date.now();
        const intervalo = 100;
        
        // Esperar al menos el tiempo mínimo
        while (Date.now() - inicio < tiempoMinimoMs) {
            await page.waitForTimeout(intervalo);
        }
        
        // Luego verificar estabilidad básica hasta el timeout máximo
        while (Date.now() - inicio < timeoutMs) {
            try {
                const domReady = await page.evaluate(() => document.readyState === 'complete');
                if (domReady) {
                    // Verificar que no haya elementos de carga activos
                    const elementosCarga = await page.evaluate(() => {
                        const loaders = document.querySelectorAll('.loading, .spinner, .loader');
                        return Array.from(loaders).some(el => {
                            const rect = el.getBoundingClientRect();
                            return rect.width > 0 && rect.height > 0;
                        });
                    });
                    
                    if (!elementosCarga) {
                        return true;
                    }
                }
            } catch (error) {
                // Continuar esperando
            }
            await page.waitForTimeout(intervalo);
        }
        
        return false;
    }

    /**
     * Verifica que no haya modales interceptando clicks antes de hacer una acción
     * Espera adaptativamente hasta que todos los modales hayan desaparecido completamente
     * @param page Página de Playwright
     * @param timeoutMs Timeout máximo en milisegundos (default: 10000 = 10 segundos)
     * @returns true si no hay modales interceptando, false si se alcanzó el timeout
     */
    static async esperarQueNoHayaModalesInterceptando(
        page: Page,
        timeoutMs: number = 10000
    ): Promise<boolean> {
        const inicio = Date.now();
        const intervalo = 200;
        
        console.log('   ⏳ Verificando que no haya modales interceptando...');
        
        while (Date.now() - inicio < timeoutMs) {
            try {
                const hayModalesInterceptando = await page.evaluate(() => {
                    // Buscar todos los tipos de modales posibles
                    const selectores = [
                        '.swal2-container.swal2-shown',
                        '.swal2-container.swal2-fade.swal2-shown',
                        '.modal.show',
                        '.modal.fade.show',
                        '[role="dialog"]:not([style*="display: none"])',
                        '.swal2-modal.swal2-show'
                    ];
                    
                    for (const selector of selectores) {
                        const elementos = document.querySelectorAll(selector);
                        for (const el of Array.from(elementos)) {
                            const rect = el.getBoundingClientRect();
                            const style = window.getComputedStyle(el);
                            
                            // Verificar si el modal está visible y puede interceptar clicks
                            if (rect.width > 0 && 
                                rect.height > 0 && 
                                style.display !== 'none' && 
                                style.visibility !== 'hidden' &&
                                style.opacity !== '0' &&
                                style.pointerEvents !== 'none') {
                                return true;
                            }
                        }
                    }
                    
                    return false;
                });
                
                if (!hayModalesInterceptando) {
                    const tiempoEspera = Date.now() - inicio;
                    if (tiempoEspera > 500) {
                        console.log(`   ✅ No hay modales interceptando (verificado en ${tiempoEspera}ms)`);
                    }
                    return true;
                }
            } catch (error) {
                // Continuar esperando
            }
            await page.waitForTimeout(intervalo);
        }
        
        console.log(`   ⚠️ Timeout esperando que desaparezcan modales (${timeoutMs}ms)`);
        return false;
    }
}

