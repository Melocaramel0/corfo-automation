import { Page } from 'playwright';

/**
 * Sistema interno de métricas para monitorear el rendimiento de los waits
 * Implementado de forma segura para no romper el flujo si falla
 */
class WaitMetrics {
    private static metrics: Map<string, number[]> = new Map();
    private static errors: Map<string, number> = new Map();

    static recordWaitTime(operation: string, timeMs: number): void {
        try {
            if (!this.metrics.has(operation)) {
                this.metrics.set(operation, []);
            }
            this.metrics.get(operation)!.push(timeMs);
        } catch {
            // Silenciosamente ignorar errores de métricas para no romper el flujo
        }
    }

    static recordError(operation: string): void {
        try {
            const current = this.errors.get(operation) || 0;
            this.errors.set(operation, current + 1);
        } catch {
            // Silenciosamente ignorar errores de métricas
        }
    }

    static getStats(operation: string): {
        count: number;
        average: number;
        min: number;
        max: number;
        total: number;
        errors: number;
    } | null {
        try {
            const times = this.metrics.get(operation) || [];
            const errors = this.errors.get(operation) || 0;
            
            if (times.length === 0) return null;

            const avg = times.reduce((a, b) => a + b, 0) / times.length;
            const min = Math.min(...times);
            const max = Math.max(...times);
            const total = times.reduce((a, b) => a + b, 0);

            return {
                count: times.length,
                average: Math.round(avg),
                min,
                max,
                total,
                errors
            };
        } catch {
            return null;
        }
    }

    static printAllStats(): void {
        try {
            if (this.metrics.size === 0) {
                return;
            }

            console.log('\n📊 ESTADÍSTICAS DE WAITS DINÁMICOS:');
            console.log('='.repeat(60));
            
            this.metrics.forEach((times, operation) => {
                const stats = this.getStats(operation);
                if (stats) {
                    console.log(`\n  🔹 ${operation}:`);
                    console.log(`     - Ejecuciones: ${stats.count}`);
                    console.log(`     - Tiempo promedio: ${stats.average}ms`);
                    console.log(`     - Tiempo mínimo: ${stats.min}ms`);
                    console.log(`     - Tiempo máximo: ${stats.max}ms`);
                    console.log(`     - Tiempo total: ${stats.total}ms (${(stats.total / 1000).toFixed(1)}s)`);
                    if (stats.errors > 0) {
                        console.log(`     - Errores: ${stats.errors}`);
                    }
                    
                    // Calcular ahorro estimado vs wait fijo (asumiendo 3s fijo)
                    const tiempoFijoEstimado = stats.count * 3000;
                    const ahorro = tiempoFijoEstimado - stats.total;
                    const porcentajeAhorro = (ahorro / tiempoFijoEstimado) * 100;
                    if (porcentajeAhorro > 0) {
                        console.log(`     - 💰 Ahorro estimado vs wait fijo: ${(ahorro / 1000).toFixed(1)}s (${porcentajeAhorro.toFixed(1)}%)`);
                    }
                }
            });
            
            console.log('\n' + '='.repeat(60));
        } catch {
            // Silenciosamente ignorar errores al imprimir métricas
        }
    }

    static reset(): void {
        try {
            this.metrics.clear();
            this.errors.clear();
        } catch {
            // Ignorar errores
        }
    }
}

/**
 * Circuit Breaker interno para monitorear problemas (SOLO REGISTRO, NUNCA BLOQUEA)
 * IMPORTANTE: Este circuit breaker SOLO registra problemas para métricas.
 * NUNCA detiene el proceso - el proceso siempre continúa hasta el final para
 * permitir capturar screenshots y generar informes completos.
 * Implementado de forma segura para no romper el flujo si falla
 */
class CircuitBreaker {
    private static failures: Map<string, number> = new Map();
    private static successes: Map<string, number> = new Map();
    private static readonly MAX_FAILURES = 10; // Máximo de fallos consecutivos para registro
    private static readonly RESET_THRESHOLD = 3; // Éxitos necesarios para resetear

    /**
     * @deprecated Este método ya no se usa - los circuit breakers nunca bloquean
     * Solo se mantiene por compatibilidad
     */
    static shouldBreak(operation: string): boolean {
        // NUNCA retornar true - los circuit breakers nunca bloquean el proceso
        return false;
    }

    static recordFailure(operation: string): void {
        try {
            const current = this.failures.get(operation) || 0;
            this.failures.set(operation, current + 1);
            this.successes.set(operation, 0);
            
            const totalFailures = current + 1;
            if (totalFailures >= this.MAX_FAILURES) {
                console.log(`   🔴 Circuit breaker ACTIVADO para "${operation}" (${totalFailures} fallos consecutivos)`);
            }
        } catch {
            // Ignorar errores
        }
    }

    static recordSuccess(operation: string): void {
        try {
            const currentSuccesses = (this.successes.get(operation) || 0) + 1;
            this.successes.set(operation, currentSuccesses);
            
            if (currentSuccesses >= this.RESET_THRESHOLD) {
                const previousFailures = this.failures.get(operation) || 0;
                if (previousFailures > 0) {
                    this.failures.set(operation, 0);
                    this.successes.set(operation, 0);
                }
            }
        } catch {
            // Ignorar errores
        }
    }

    static reset(operation: string): void {
        try {
            this.failures.delete(operation);
            this.successes.delete(operation);
        } catch {
            // Ignorar errores
        }
    }
}

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
        const operation = 'waitForCondition';
        const inicio = Date.now();
        const intervalo = 100; // Verificar cada 100ms
        let erroresConsecutivos = 0; // Solo contar errores reales, no condiciones que aún no se cumplen
        const MAX_ERRORES_CONSECUTIVOS = 50; // Solo activar circuit breaker con muchos errores reales
        
        while (Date.now() - inicio < timeoutMs) {
            try {
                if (await condition()) {
                    const tiempoEspera = Date.now() - inicio;
                    
                    // Registrar éxito en circuit breaker
                    try {
                        CircuitBreaker.recordSuccess(operation);
                    } catch {}
                    
                    // Registrar métrica
                    try {
                        WaitMetrics.recordWaitTime(operation, tiempoEspera);
                    } catch {}
                    
                    if (tiempoEspera < timeoutMs * 0.5) {
                        console.log(`   ⚡ Condición cumplida en ${tiempoEspera}ms (ahorro: ${timeoutMs - tiempoEspera}ms)`);
                    }
                    return true;
                }
                // Si la condición retorna false, es normal, no es un error - continuar esperando
            } catch (error) {
                // Solo aquí contamos como error real (excepción)
                erroresConsecutivos++;
                if (erroresConsecutivos >= MAX_ERRORES_CONSECUTIVOS) {
                    try {
                        CircuitBreaker.recordFailure(operation);
                        WaitMetrics.recordError(operation);
                    } catch {}
                    console.log(`   ⚠️ Circuit breaker: ${erroresConsecutivos} errores consecutivos detectados (continuando de todas formas)`);
                    // NO retornar false - solo registrar el problema pero continuar
                }
            }
            await page.waitForTimeout(intervalo);
        }
        
        // Timeout alcanzado, continuar de todas formas (comportamiento actual)
        const tiempoEspera = Date.now() - inicio;
        try {
            WaitMetrics.recordWaitTime(operation, tiempoEspera);
            // Solo registrar como error si hubo errores reales durante la espera
            if (erroresConsecutivos > 0) {
                WaitMetrics.recordError(operation);
            }
        } catch {}
        
        return false;
    }

    /**
     * Verifica si estamos actualmente en la página de login
     * @param page Página de Playwright
     * @returns true si estamos en la página de login, false en caso contrario
     */
    static async esPaginaLogin(page: Page): Promise<boolean> {
        try {
            // Verificar elementos de login en el DOM principal
            const tieneElementosLogin = await page.evaluate(() => {
                const bloqueLogin = document.querySelector('#bloqueCorfoLogin');
                const campoRut = document.querySelector('#rut');
                const campoPass = document.querySelector('#pass');
                const botonIngresar = document.querySelector('#ingresa_');
                const mostrarLink = document.querySelector('#mostrarCorfoLoginLink');
                
                const elementosLogin = [bloqueLogin, campoRut, campoPass, botonIngresar, mostrarLink];
                return elementosLogin.some(el => {
                    if (!el) return false;
                    const rect = el.getBoundingClientRect();
                    const style = window.getComputedStyle(el);
                    return rect.width > 0 && rect.height > 0 && 
                           style.display !== 'none' && 
                           style.visibility !== 'hidden';
                });
            });
            
            if (tieneElementosLogin) return true;
            
            // Verificar iframes de login
            const hayIframeLogin = page.frames().some(frame => {
                try {
                    const frameUrl = frame.url();
                    return frameUrl.includes('login.corfo.cl');
                } catch {
                    return false;
                }
            });
            
            if (hayIframeLogin) return true;
            
            // Verificar URL
            const urlActual = page.url();
            const urlContieneLogin = urlActual.includes('login.corfo.cl') || 
                                    urlActual.includes('Login.aspx') ||
                                    /\/login(\?|$|\/)/i.test(urlActual);
            
            return urlContieneLogin;
        } catch {
            // Si hay algún error, asumir que no estamos en login para no bloquear
            return false;
        }
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
        const operation = 'esperarPaginaListaPostLogin';
        const inicio = Date.now();
        const intervalo = 200; // Verificar cada 200ms
        let ultimaUrl = page.url();
        let contadorUrlEstable = 0;
        const REQUIERE_URL_ESTABLE = 3; // URL debe estar estable por 3 verificaciones consecutivas (600ms)
        let erroresConsecutivos = 0; // Solo contar errores reales (excepciones)
        const MAX_ERRORES_CONSECUTIVOS = 50; // Solo activar circuit breaker con muchos errores reales
        
        console.log('⏳ Esperando carga completa de página post-login (adaptativo)...');
        
        while (Date.now() - inicio < timeoutMs) {
            try {
                // 1. Verificar que el DOM esté cargado
                const domReady = await page.evaluate(() => {
                    return document.readyState === 'complete';
                });
                
                if (!domReady) {
                    // No es un error, simplemente aún no está listo - continuar esperando
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
                
                // 4. CRÍTICO: Verificar que NO estamos en la página de login
                // Esto es esencial para Docker donde la redirección puede ser más lenta
                const esPaginaLogin = await this.esPaginaLogin(page);
                
                if (esPaginaLogin) {
                    // Aún estamos en la página de login, continuar esperando
                    if (contadorUrlEstable === 0) { // Solo loggear ocasionalmente para no saturar
                        console.log(`   ⏳ Esperando redirección post-login... (URL: ${urlActual.substring(0, 80)})`);
                    }
                    await page.waitForTimeout(intervalo);
                    continue;
                }
                
                // 5. Verificar que haya contenido visible en la página
                const tieneContenido = await page.evaluate(() => {
                    const body = document.body;
                    if (!body) return false;
                    
                    const rect = body.getBoundingClientRect();
                    const tieneTexto = body.textContent && body.textContent.trim().length > 50;
                    const tieneElementos = body.children.length > 0;
                    
                    return rect.width > 0 && rect.height > 0 && tieneTexto && tieneElementos;
                });
                
                // 6. Intentar esperar networkidle (pero no bloquear si falla)
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
                    !esPaginaLogin &&
                    tieneContenido) {
                    
                    const tiempoEspera = Date.now() - inicio;
                    
                    // Registrar éxito y métrica
                    try {
                        CircuitBreaker.recordSuccess(operation);
                        WaitMetrics.recordWaitTime(operation, tiempoEspera);
                    } catch {}
                    
                    console.log(`✅ Página lista post-login en ${tiempoEspera}ms${networkIdle ? ' (networkidle OK)' : ' (networkidle timeout, pero página estable)'}`);
                    console.log(`   📍 URL final: ${urlActual.substring(0, 100)}`);
                    return true;
                }
                // Si las condiciones no se cumplen aún, es normal - continuar esperando
                
            } catch (error) {
                // Solo aquí contamos como error real (excepción)
                erroresConsecutivos++;
                if (erroresConsecutivos >= MAX_ERRORES_CONSECUTIVOS) {
                    try {
                        CircuitBreaker.recordFailure(operation);
                        WaitMetrics.recordError(operation);
                    } catch {}
                    console.log(`   ⚠️ Circuit breaker: ${erroresConsecutivos} errores consecutivos detectados (continuando de todas formas)`);
                    // NO retornar false - solo registrar el problema pero continuar
                }
            }
            
            await page.waitForTimeout(intervalo);
        }
        
        const tiempoEspera = Date.now() - inicio;
        
        // Registrar métricas
        try {
            WaitMetrics.recordWaitTime(operation, tiempoEspera);
            // Solo registrar como error si hubo errores reales durante la espera
            if (erroresConsecutivos > 0) {
                WaitMetrics.recordError(operation);
            }
        } catch {}
        
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
        const operation = 'esperarFormularioListo';
        const inicio = Date.now();
        const intervalo = 200; // Verificar cada 200ms
        let ultimaUrl = page.url();
        let contadorUrlEstable = 0;
        const REQUIERE_URL_ESTABLE = 3; // URL debe estar estable por 3 verificaciones consecutivas
        let erroresConsecutivos = 0; // Solo contar errores reales (excepciones)
        const MAX_ERRORES_CONSECUTIVOS = 50;
        
        console.log(`⏳ Esperando carga completa del formulario (adaptativo, mínimo ${minCamposRequeridos} campo(s))...`);
        
        while (Date.now() - inicio < timeoutMs) {
            try {
                // 1. Verificar que el DOM esté cargado
                const domReady = await page.evaluate(() => {
                    return document.readyState === 'complete';
                });
                
                if (!domReady) {
                    // No es un error, simplemente aún no está listo - continuar esperando
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
                    try {
                        CircuitBreaker.recordSuccess(operation);
                        WaitMetrics.recordWaitTime(operation, tiempoEspera);
                    } catch {}
                    console.log(`✅ Formulario listo en ${tiempoEspera}ms (${camposDisponibles} campos disponibles)`);
                    return true;
                }
                // Si las condiciones no se cumplen aún, es normal - continuar esperando
                
            } catch (error) {
                // Solo aquí contamos como error real (excepción)
                erroresConsecutivos++;
                if (erroresConsecutivos >= MAX_ERRORES_CONSECUTIVOS) {
                    try {
                        CircuitBreaker.recordFailure(operation);
                        WaitMetrics.recordError(operation);
                    } catch {}
                    console.log(`   ⚠️ Circuit breaker: ${erroresConsecutivos} errores consecutivos detectados (continuando de todas formas)`);
                    // NO retornar false - solo registrar el problema pero continuar
                }
            }
            
            await page.waitForTimeout(intervalo);
        }
        
        const tiempoEspera = Date.now() - inicio;
        try {
            WaitMetrics.recordWaitTime(operation, tiempoEspera);
            // Solo registrar como error si hubo errores reales durante la espera
            if (erroresConsecutivos > 0) {
                WaitMetrics.recordError(operation);
            }
        } catch {}
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
        const operation = 'esperarQueNoHayaModalesInterceptando';
        const inicio = Date.now();
        const intervalo = 200;
        let erroresConsecutivos = 0; // Solo contar errores reales (excepciones)
        const MAX_ERRORES_CONSECUTIVOS = 50;
        
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
                    try {
                        CircuitBreaker.recordSuccess(operation);
                        WaitMetrics.recordWaitTime(operation, tiempoEspera);
                    } catch {}
                    if (tiempoEspera > 500) {
                        console.log(`   ✅ No hay modales interceptando (verificado en ${tiempoEspera}ms)`);
                    }
                    return true;
                }
                // Si aún hay modales, es normal - continuar esperando
                
            } catch (error) {
                // Solo aquí contamos como error real (excepción)
                erroresConsecutivos++;
                if (erroresConsecutivos >= MAX_ERRORES_CONSECUTIVOS) {
                    try {
                        CircuitBreaker.recordFailure(operation);
                        WaitMetrics.recordError(operation);
                    } catch {}
                    console.log(`   ⚠️ Circuit breaker: ${erroresConsecutivos} errores consecutivos detectados (continuando de todas formas)`);
                    // NO retornar false - solo registrar el problema pero continuar
                }
            }
            await page.waitForTimeout(intervalo);
        }
        
        const tiempoEspera = Date.now() - inicio;
        try {
            WaitMetrics.recordWaitTime(operation, tiempoEspera);
            // Solo registrar como error si hubo errores reales durante la espera
            if (erroresConsecutivos > 0) {
                WaitMetrics.recordError(operation);
            }
        } catch {}
        console.log(`   ⚠️ Timeout esperando que desaparezcan modales (${timeoutMs}ms)`);
        return false;
    }

    /**
     * Imprime todas las métricas acumuladas de los waits dinámicos
     * Útil para llamar al final de la ejecución del agente
     */
    static imprimirMetricas(): void {
        WaitMetrics.printAllStats();
    }

    /**
     * Resetea todas las métricas y circuit breakers
     * Útil para testing o reinicios
     */
    static resetearMetricas(): void {
        try {
            WaitMetrics.reset();
            // Resetear circuit breakers también
            CircuitBreaker.reset('waitForCondition');
            CircuitBreaker.reset('esperarPaginaListaPostLogin');
            CircuitBreaker.reset('esperarFormularioListo');
            CircuitBreaker.reset('esperarEstabilidadPagina');
            CircuitBreaker.reset('esperarDespuesDeClick');
            CircuitBreaker.reset('esperarDespuesDeCompletarCampo');
            CircuitBreaker.reset('esperarDespuesDeScroll');
            CircuitBreaker.reset('esperarModal');
            CircuitBreaker.reset('esperarQueNoHayaModalesInterceptando');
            CircuitBreaker.reset('esperarAdaptativa');
        } catch {
            // Ignorar errores al resetear
        }
    }
}

