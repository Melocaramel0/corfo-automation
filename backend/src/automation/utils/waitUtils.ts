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
}

