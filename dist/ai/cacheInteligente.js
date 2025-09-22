"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheGlobal = exports.CacheInteligente = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const crypto_1 = require("crypto");
class CacheInteligente {
    constructor(rutaCache) {
        this.configurado = false;
        this.rutaCache = rutaCache || path.join(__dirname, '../data/cache');
        this.cache = new Map();
    }
    async inicializar() {
        try {
            await fs.mkdir(this.rutaCache, { recursive: true });
            await this.cargarCache();
            this.configurado = true;
            console.log(`✅ Cache inteligente inicializado: ${this.cache.size} formularios cargados`);
        }
        catch (error) {
            console.error('❌ Error al inicializar cache:', error);
            this.configurado = false;
        }
    }
    async buscarFormularioSimilar(url, titulo) {
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
        let mejorCoincidencia = null;
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
    async almacenarFormulario(url, titulo, estructura, estrategias) {
        if (!this.configurado) {
            await this.inicializar();
        }
        const id = this.generarId(url, titulo);
        const hash = this.generarHash(estructura);
        const ahora = new Date().toISOString();
        const formularioCache = {
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
    obtenerEstrategiasCache(formularioCache) {
        return formularioCache.estrategias.sort((a, b) => b.exito - a.exito);
    }
    obtenerSelectoresOptimizados(formularioCache, paso) {
        const pasoCache = formularioCache.estructura.pasos.find(p => p.numero === paso);
        if (!pasoCache)
            return [];
        return pasoCache.selectoresNavegacion.filter(selector => selector.trim().length > 0);
    }
    obtenerCamposEsperados(formularioCache, paso) {
        const pasoCache = formularioCache.estructura.pasos.find(p => p.numero === paso);
        if (!pasoCache)
            return [];
        return pasoCache.campos.sort((a, b) => b.confianza - a.confianza);
    }
    async actualizarEstrategia(formularioId, tipo, exito) {
        const formulario = this.cache.get(formularioId);
        if (!formulario)
            return;
        const estrategia = formulario.estrategias.find(e => e.tipo === tipo);
        if (estrategia) {
            const factor = exito ? 10 : -5;
            estrategia.exito = Math.max(0, Math.min(100, estrategia.exito + factor));
        }
        await this.guardarCache();
    }
    obtenerEstadisticas() {
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
    async cargarCache() {
        try {
            const archivos = await fs.readdir(this.rutaCache);
            for (const archivo of archivos) {
                if (archivo.endsWith('.json')) {
                    const rutaArchivo = path.join(this.rutaCache, archivo);
                    const contenido = await fs.readFile(rutaArchivo, 'utf-8');
                    const formulario = JSON.parse(contenido);
                    this.cache.set(formulario.id, formulario);
                }
            }
        }
        catch (error) {
            // Cache vacío o no existe
        }
    }
    async guardarCache() {
        for (const [id, formulario] of this.cache) {
            const rutaArchivo = path.join(this.rutaCache, `${id}.json`);
            await fs.writeFile(rutaArchivo, JSON.stringify(formulario, null, 2), 'utf-8');
        }
    }
    async actualizarUltimoUso(id) {
        const formulario = this.cache.get(id);
        if (formulario) {
            formulario.fechaUltimoUso = new Date().toISOString();
            formulario.vecesUsado++;
            await this.guardarCache();
        }
    }
    generarId(url, titulo) {
        const texto = `${url}-${titulo}`;
        return (0, crypto_1.createHash)('md5').update(texto).digest('hex').substring(0, 16);
    }
    generarHash(estructura) {
        const texto = JSON.stringify(estructura);
        return (0, crypto_1.createHash)('sha256').update(texto).digest('hex');
    }
    limpiarTexto(texto) {
        return texto.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }
    calcularSimilitud(texto1, texto2) {
        const palabras1 = texto1.split(' ');
        const palabras2 = texto2.split(' ');
        const interseccion = palabras1.filter(palabra => palabras2.includes(palabra));
        const union = [...new Set([...palabras1, ...palabras2])];
        return interseccion.length / union.length;
    }
}
exports.CacheInteligente = CacheInteligente;
exports.cacheGlobal = new CacheInteligente();
