import * as fs from 'fs/promises';
import * as path from 'path';
import { createHash } from 'crypto';

/**
 * SISTEMA DE CACHE INTELIGENTE PARA FORMULARIOS CORFO
 */

export interface FormularioCache {
    id: string;
    hash: string;
    titulo: string;
    url: string;
    fechaCreacion: string;
    fechaUltimoUso: string;
    vecesUsado: number;
    estructura: EstructuraFormulario;
    estrategias: EstrategiaAutocompletado[];
}

export interface EstructuraFormulario {
    totalPasos: number;
    pasos: PasoCache[];
    caracteristicas: CaracteristicasFormulario;
}

export interface PasoCache {
    numero: number;
    titulo: string;
    selectoresNavegacion: string[];
    campos: CampoCache[];
}

export interface CampoCache {
    etiqueta: string;
    tipo: string;
    selectores: string[];
    esObligatorio: boolean;
    valorRecomendado: string;
    estrategiaCompletado: string;
    confianza: number;
}

export interface EstrategiaAutocompletado {
    tipo: 'rut' | 'email' | 'telefono' | 'empresa' | 'proyecto' | 'monto' | 'fecha' | 'texto' | 'select' | 'checkbox';
    patron: string;
    valor: string;
    condiciones: string[];
    exito: number;
}

export interface CaracteristicasFormulario {
    tipoConvocatoria: string;
    sector: string;
    dificultad: 'baja' | 'media' | 'alta';
    tiempoEstimado: number;
    camposCompletos: number;
    tasaExito: number;
}

export class CacheInteligente {
    private rutaCache: string;
    private cache: Map<string, FormularioCache>;
    private configurado: boolean = false;

    constructor(rutaCache?: string) {
        this.rutaCache = rutaCache || path.join(__dirname, '../data/cache');
        this.cache = new Map();
    }

    async inicializar(): Promise<void> {
        try {
            await fs.mkdir(this.rutaCache, { recursive: true });
            await this.cargarCache();
            this.configurado = true;
            console.log(`✅ Cache inteligente inicializado: ${this.cache.size} formularios cargados`);
        } catch (error) {
            console.error('❌ Error al inicializar cache:', error);
            this.configurado = false;
        }
    }

    async buscarFormularioSimilar(url: string, titulo: string): Promise<FormularioCache | null> {
        if (!this.configurado) {
            await this.inicializar();
        }

        console.log('🔍 Buscando formularios similares en cache...');

        for (const [id, formulario] of this.cache) {
            if (formulario.url === url) {
                console.log(`🎯 Formulario exacto encontrado: ${formulario.titulo}`);
                await this.actualizarUltimoUso(id);
                return formulario;
            }
        }

        const tituloLimpio = this.limpiarTexto(titulo);
        let mejorCoincidencia: FormularioCache | null = null;
        let mejorPuntuacion = 0;

        for (const [id, formulario] of this.cache) {
            const puntuacion = this.calcularSimilitud(tituloLimpio, this.limpiarTexto(formulario.titulo));
            
            if (puntuacion > 0.7 && puntuacion > mejorPuntuacion) {
                mejorPuntuacion = puntuacion;
                mejorCoincidencia = formulario;
            }
        }

        if (mejorCoincidencia) {
            console.log(`📊 Formulario similar encontrado: ${mejorCoincidencia.titulo} (${(mejorPuntuacion * 100).toFixed(1)}% similitud)`);
            await this.actualizarUltimoUso(mejorCoincidencia.id);
            return mejorCoincidencia;
        }

        console.log('❌ No se encontraron formularios similares en cache');
        return null;
    }

    async almacenarFormulario(
        url: string, 
        titulo: string, 
        estructura: EstructuraFormulario,
        estrategias: EstrategiaAutocompletado[]
    ): Promise<string> {
        if (!this.configurado) {
            await this.inicializar();
        }

        const id = this.generarId(url, titulo);
        const hash = this.generarHash(estructura);
        const ahora = new Date().toISOString();

        const formularioCache: FormularioCache = {
            id,
            hash,
            titulo,
            url,
            fechaCreacion: ahora,
            fechaUltimoUso: ahora,
            vecesUsado: 1,
            estructura,
            estrategias
        };

        this.cache.set(id, formularioCache);
        await this.guardarCache();

        console.log(`💾 Formulario almacenado en cache: ${titulo}`);
        console.log(`🆔 ID: ${id}`);
        console.log(`📊 Total formularios en cache: ${this.cache.size}`);

        return id;
    }

    obtenerEstrategiasCache(formularioCache: FormularioCache): EstrategiaAutocompletado[] {
        return formularioCache.estrategias.sort((a, b) => b.exito - a.exito);
    }

    obtenerSelectoresOptimizados(formularioCache: FormularioCache, paso: number): string[] {
        const pasoCache = formularioCache.estructura.pasos.find(p => p.numero === paso);
        if (!pasoCache) return [];

        return pasoCache.selectoresNavegacion.filter(selector => selector.trim().length > 0);
    }

    obtenerCamposEsperados(formularioCache: FormularioCache, paso: number): CampoCache[] {
        const pasoCache = formularioCache.estructura.pasos.find(p => p.numero === paso);
        if (!pasoCache) return [];

        return pasoCache.campos.sort((a, b) => b.confianza - a.confianza);
    }

    async actualizarEstrategia(formularioId: string, tipo: string, exito: boolean): Promise<void> {
        const formulario = this.cache.get(formularioId);
        if (!formulario) return;

        const estrategia = formulario.estrategias.find(e => e.tipo === tipo);
        if (estrategia) {
            const factor = exito ? 10 : -5;
            estrategia.exito = Math.max(0, Math.min(100, estrategia.exito + factor));
        }

        await this.guardarCache();
    }

    obtenerEstadisticas(): any {
        const formularios = Array.from(this.cache.values());
        
        return {
            totalFormularios: formularios.length,
            formulariosMasUsados: formularios
                .sort((a, b) => b.vecesUsado - a.vecesUsado)
                .slice(0, 5)
                .map(f => ({ titulo: f.titulo, usos: f.vecesUsado })),
            tiempoPromedioEstimado: formularios.reduce((sum, f) => sum + f.estructura.caracteristicas.tiempoEstimado, 0) / formularios.length,
            tasaExitoPromedio: formularios.reduce((sum, f) => sum + f.estructura.caracteristicas.tasaExito, 0) / formularios.length
        };
    }

    private async cargarCache(): Promise<void> {
        try {
            const archivos = await fs.readdir(this.rutaCache);
            
            for (const archivo of archivos) {
                if (archivo.endsWith('.json')) {
                    const rutaArchivo = path.join(this.rutaCache, archivo);
                    const contenido = await fs.readFile(rutaArchivo, 'utf-8');
                    const formulario: FormularioCache = JSON.parse(contenido);
                    this.cache.set(formulario.id, formulario);
                }
            }
        } catch (error) {
            // Cache vacío o no existe
        }
    }

    private async guardarCache(): Promise<void> {
        for (const [id, formulario] of this.cache) {
            const rutaArchivo = path.join(this.rutaCache, `${id}.json`);
            await fs.writeFile(rutaArchivo, JSON.stringify(formulario, null, 2), 'utf-8');
        }
    }

    private async actualizarUltimoUso(id: string): Promise<void> {
        const formulario = this.cache.get(id);
        if (formulario) {
            formulario.fechaUltimoUso = new Date().toISOString();
            formulario.vecesUsado++;
            await this.guardarCache();
        }
    }

    private generarId(url: string, titulo: string): string {
        const texto = `${url}-${titulo}`;
        return createHash('md5').update(texto).digest('hex').substring(0, 16);
    }

    private generarHash(estructura: EstructuraFormulario): string {
        const texto = JSON.stringify(estructura);
        return createHash('sha256').update(texto).digest('hex');
    }

    private limpiarTexto(texto: string): string {
        return texto.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    private calcularSimilitud(texto1: string, texto2: string): number {
        const palabras1 = texto1.split(' ');
        const palabras2 = texto2.split(' ');
        
        const interseccion = palabras1.filter(palabra => palabras2.includes(palabra));
        const union = [...new Set([...palabras1, ...palabras2])];
        
        return interseccion.length / union.length;
    }
}

export const cacheGlobal = new CacheInteligente(); 