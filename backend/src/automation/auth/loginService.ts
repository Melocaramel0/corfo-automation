import { Page, Frame } from 'playwright';
import * as dotenv from 'dotenv';

dotenv.config();

export class LoginService {
    private page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    async realizarLogin(): Promise<void> {
        // 1) Intentar interfaz nueva en la página actual
        try {
            const mostrarLink = await this.page.$('#mostrarCorfoLoginLink');
            const bloqueVisible = await this.page.$('#bloqueCorfoLogin');

            if (mostrarLink) {
                await mostrarLink.click();
                await this.page.waitForSelector('#bloqueCorfoLogin', { state: 'visible', timeout: 10000 });
            } else if (!bloqueVisible) {
                // nada visible aún, continuar a verificar iframe
            }

            const hayBloque = await this.page.$('#bloqueCorfoLogin');
            if (hayBloque) {
                await this.page.waitForSelector('#rut', { state: 'visible' });
                await this.page.waitForSelector('#pass', { state: 'visible' });
                await this.page.fill('#rut', process.env.CORFO_USER!);
                await this.page.fill('#pass', process.env.CORFO_PASS!);
                await this.page.waitForSelector('#ingresa_', { state: 'visible', timeout: 10000 });
                await Promise.all([
                    this.page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => {}),
                    this.page.click('#ingresa_')
                ]);
                // Esperar a que se estabilice la red
                await this.page.waitForLoadState('networkidle').catch(() => {});
                console.log('Login con interfaz nueva completado');
                return;
            }
        } catch {}

        // 2) Intentar interfaz antigua via iframe en la página actual
        const frames = this.page.frames();
        const loginFrame = frames.find((frame: Frame) => frame.url().includes('login.corfo.cl'));
        if (loginFrame) {
            await loginFrame.waitForLoadState('networkidle');
            await this.page.waitForTimeout(2000);
            await loginFrame.fill('#rut', process.env.CORFO_USER!);
            await loginFrame.fill('#pass', process.env.CORFO_PASS!);
            await Promise.all([
                this.page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => {}),
                loginFrame.click('#ingresa_')
            ]);
            await loginFrame.waitForSelector('#rut', { state: 'detached', timeout: 15000 }).catch(() => {});
            await this.page.waitForLoadState('networkidle').catch(() => {});
            console.log('Login con iframe completado');
            return;
        }

        // 3) Si existe un enlace textual a login en la misma página, usarlo (sin ir al home)
        try {
            const enlaceLogin = await this.page.$('a:has-text("¿Tienes clave Corfo?"), a:has-text("Inicia sesión"), a:has-text("Ingreso usuario")');
            if (enlaceLogin) {
                await Promise.all([
                    this.page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => {}),
                    enlaceLogin.click()
                ]);

                // Reintentar interfaz nueva o iframe tras navegar
                const mostrarLink2 = await this.page.$('#mostrarCorfoLoginLink');
                if (mostrarLink2) {
                    await mostrarLink2.click();
                    await this.page.waitForSelector('#bloqueCorfoLogin', { state: 'visible', timeout: 10000 });
                    await this.page.fill('#rut', process.env.CORFO_USER!);
                    await this.page.fill('#pass', process.env.CORFO_PASS!);
                    await Promise.all([
                        this.page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => {}),
                        this.page.click('#ingresa_')
                    ]);
                    await this.page.waitForLoadState('networkidle').catch(() => {});
                    console.log('Login completado tras navegar al enlace de login');
                    return;
                }

                const frames2 = this.page.frames();
                const loginFrame2 = frames2.find((frame: Frame) => frame.url().includes('login.corfo.cl'));
                if (loginFrame2) {
                    await loginFrame2.waitForLoadState('networkidle');
                    await loginFrame2.fill('#rut', process.env.CORFO_USER!);
                    await loginFrame2.fill('#pass', process.env.CORFO_PASS!);
                    await Promise.all([
                        this.page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => {}),
                        loginFrame2.click('#ingresa_')
                    ]);
                    await loginFrame2.waitForSelector('#rut', { state: 'detached', timeout: 15000 }).catch(() => {});
                    await this.page.waitForLoadState('networkidle').catch(() => {});
                    console.log('Login con iframe tras navegar al enlace de login');
                    return;
                }
            }
        } catch {}

        throw new Error('No se encontró interfaz de login en la página actual');
    }
}

