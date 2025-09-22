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
exports.AgenteMultiFase = void 0;
const agente_1 = require("./agente");
/**
 * Agente especializado para formularios multi-fase con medición de rendimiento
 */
class AgenteMultiFase extends agente_1.AgenteFormularios {
    /**
     * Procesa un formulario multi-fase completo con medición de tiempos
     * @param formulario Formulario multi-fase a procesar
     * @returns Promise<ResultadoMultiFase> Resultado completo del procesamiento
     */
    async procesarFormularioMultiFase(formulario) {
        console.log('\n🚀 INICIANDO PROCESAMIENTO MULTI-FASE');
        console.log('=====================================');
        console.log(`📋 Formulario: ${formulario.titulo}`);
        console.log(`🔢 Total de fases: ${formulario.totalFases}`);
        console.log(`📝 Total de campos: ${formulario.campos.length}`);
        console.log(`⚠️ Campos obligatorios: ${formulario.campos.filter(c => c.requerido).length}\n`);
        const tiempoInicio = Date.now();
        const resultadosFases = [];
        // Procesar cada fase individualmente
        for (const fase of formulario.fases) {
            console.log(`\n📋 PROCESANDO FASE ${fase.numero}: ${fase.titulo}`);
            console.log('='.repeat(50));
            const resultadoFase = await this.procesarFaseIndividual(fase);
            resultadosFases.push(resultadoFase);
            // Mostrar resumen de la fase
            this.mostrarResumenFase(resultadoFase);
        }
        const tiempoFin = Date.now();
        // Calcular métricas generales
        const tiempos = this.calcularTiempos(resultadosFases, tiempoInicio, tiempoFin);
        const resumenGeneral = this.calcularResumenGeneral(resultadosFases);
        const recomendaciones = this.generarRecomendaciones(formulario, resultadosFases);
        const resultado = {
            formulario: {
                titulo: formulario.titulo,
                url: formulario.url,
                totalFases: formulario.totalFases,
                totalCampos: formulario.campos.length,
                totalCamposObligatorios: formulario.campos.filter(c => c.requerido).length
            },
            fases: resultadosFases,
            tiempos,
            resumenGeneral,
            recomendaciones
        };
        // Mostrar reporte final
        this.mostrarReporteFinal(resultado);
        return resultado;
    }
    /**
     * Procesa una fase individual del formulario
     */
    async procesarFaseIndividual(fase) {
        const camposObligatorios = fase.campos.filter(c => c.requerido).length;
        const camposOpcionales = fase.campos.length - camposObligatorios;
        console.log(`📊 Campos en esta fase: ${fase.campos.length} (${camposObligatorios} obligatorios, ${camposOpcionales} opcionales)`);
        // Crear un formulario temporal para esta fase
        const formularioFase = {
            titulo: fase.titulo,
            url: '',
            descripcion: `Fase ${fase.numero}`,
            campos: fase.campos
        };
        // Medir tiempo de autocompletado
        console.log('🤖 Iniciando autocompletado...');
        const tiempoInicioAutocompletado = Date.now();
        await this.autocompletarFormulario(formularioFase);
        const tiempoAutocompletado = Date.now() - tiempoInicioAutocompletado;
        // Medir tiempo de validación
        console.log('🔍 Iniciando validación...');
        const tiempoInicioValidacion = Date.now();
        const resultado = await this.revisarFormulario(formularioFase);
        const tiempoValidacion = Date.now() - tiempoInicioValidacion;
        return {
            numeroFase: fase.numero,
            titulo: fase.titulo,
            camposTotal: fase.campos.length,
            camposObligatorios,
            camposOpcionales,
            tiempoAutocompletado,
            tiempoValidacion,
            resultado
        };
    }
    /**
     * Calcula métricas de tiempo del procesamiento
     */
    calcularTiempos(resultados, tiempoInicio, tiempoFin) {
        const tiempoTotalAutocompletado = resultados.reduce((sum, r) => sum + r.tiempoAutocompletado, 0);
        const tiempoTotalValidacion = resultados.reduce((sum, r) => sum + r.tiempoValidacion, 0);
        const tiempoTotalProcesamiento = tiempoFin - tiempoInicio;
        const totalCampos = resultados.reduce((sum, r) => sum + r.camposTotal, 0);
        const tiempoPromedioPorCampo = totalCampos > 0 ? tiempoTotalProcesamiento / totalCampos : 0;
        const tiempoPromedioPorFase = resultados.length > 0 ? tiempoTotalProcesamiento / resultados.length : 0;
        return {
            tiempoTotalAutocompletado,
            tiempoTotalValidacion,
            tiempoTotalProcesamiento,
            tiempoPromedioPorCampo,
            tiempoPromedioPorFase
        };
    }
    /**
     * Calcula el resumen general del procesamiento
     */
    calcularResumenGeneral(resultados) {
        const fasesValidas = resultados.filter(r => r.resultado.esValido).length;
        const fasesConErrores = resultados.length - fasesValidas;
        const porcentajeExito = resultados.length > 0 ? Math.round((fasesValidas / resultados.length) * 100) : 0;
        const totalErrores = resultados.reduce((sum, r) => sum + r.resultado.errores.length, 0);
        const totalAdvertencias = resultados.reduce((sum, r) => sum + r.resultado.advertencias.length, 0);
        return {
            fasesValidas,
            fasesConErrores,
            porcentajeExito,
            totalErrores,
            totalAdvertencias
        };
    }
    /**
     * Genera recomendaciones basadas en el análisis
     */
    generarRecomendaciones(formulario, resultados) {
        const recomendaciones = [];
        // Análisis de rendimiento
        const tiempoTotal = resultados.reduce((sum, r) => sum + r.tiempoAutocompletado + r.tiempoValidacion, 0);
        const promedioMsPorCampo = tiempoTotal / formulario.campos.length;
        if (promedioMsPorCampo > 1000) {
            recomendaciones.push('⚡ Considerar optimización: El tiempo promedio por campo es alto (>1s)');
        }
        else if (promedioMsPorCampo < 200) {
            recomendaciones.push('🚀 Excelente rendimiento: Tiempo de procesamiento muy eficiente (<200ms por campo)');
        }
        // Análisis de errores
        const fasesConMuchosErrores = resultados.filter(r => r.resultado.errores.length > 5);
        if (fasesConMuchosErrores.length > 0) {
            recomendaciones.push(`🔧 Revisar validación en ${fasesConMuchosErrores.length} fase(s) con muchos errores`);
        }
        // Análisis de campos obligatorios
        const porcentajeObligatorios = (formulario.campos.filter(c => c.requerido).length / formulario.campos.length) * 100;
        if (porcentajeObligatorios > 80) {
            recomendaciones.push('📝 Alto porcentaje de campos obligatorios (>80%) - Verificar si es necesario');
        }
        // Análisis de fases
        if (formulario.totalFases > 5) {
            recomendaciones.push('📋 Formulario muy extenso (>5 fases) - Considerar simplificación');
        }
        return recomendaciones;
    }
    /**
     * Muestra resumen de una fase individual
     */
    mostrarResumenFase(resultado) {
        console.log(`\n📊 RESUMEN FASE ${resultado.numeroFase}:`);
        console.log(`   ⏱️ Autocompletado: ${resultado.tiempoAutocompletado}ms`);
        console.log(`   ⏱️ Validación: ${resultado.tiempoValidacion}ms`);
        console.log(`   📝 Campos: ${resultado.camposTotal} (${resultado.camposObligatorios} obligatorios)`);
        console.log(`   ${resultado.resultado.esValido ? '✅' : '❌'} Estado: ${resultado.resultado.esValido ? 'VÁLIDO' : 'INVÁLIDO'}`);
        console.log(`   🎯 Éxito: ${resultado.resultado.resumen.porcentajeExito}%`);
        if (resultado.resultado.errores.length > 0) {
            console.log(`   ❌ Errores: ${resultado.resultado.errores.length}`);
        }
        if (resultado.resultado.advertencias.length > 0) {
            console.log(`   ⚠️ Advertencias: ${resultado.resultado.advertencias.length}`);
        }
    }
    /**
     * Muestra el reporte final completo
     */
    mostrarReporteFinal(resultado) {
        console.log('\n🎯 REPORTE FINAL MULTI-FASE');
        console.log('==========================');
        console.log('\n📋 INFORMACIÓN GENERAL:');
        console.log(`   Formulario: ${resultado.formulario.titulo}`);
        console.log(`   Total de fases: ${resultado.formulario.totalFases}`);
        console.log(`   Total de campos: ${resultado.formulario.totalCampos}`);
        console.log(`   Campos obligatorios: ${resultado.formulario.totalCamposObligatorios}`);
        console.log('\n⏱️ MÉTRICAS DE TIEMPO:');
        console.log(`   Tiempo total: ${resultado.tiempos.tiempoTotalProcesamiento}ms (${(resultado.tiempos.tiempoTotalProcesamiento / 1000).toFixed(2)}s)`);
        console.log(`   Autocompletado: ${resultado.tiempos.tiempoTotalAutocompletado}ms`);
        console.log(`   Validación: ${resultado.tiempos.tiempoTotalValidacion}ms`);
        console.log(`   Promedio por campo: ${Math.round(resultado.tiempos.tiempoPromedioPorCampo)}ms`);
        console.log(`   Promedio por fase: ${Math.round(resultado.tiempos.tiempoPromedioPorFase)}ms`);
        console.log('\n📊 RESUMEN DE RESULTADOS:');
        console.log(`   Fases válidas: ${resultado.resumenGeneral.fasesValidas}/${resultado.formulario.totalFases}`);
        console.log(`   Fases con errores: ${resultado.resumenGeneral.fasesConErrores}`);
        console.log(`   Porcentaje de éxito: ${resultado.resumenGeneral.porcentajeExito}%`);
        console.log(`   Total de errores: ${resultado.resumenGeneral.totalErrores}`);
        console.log(`   Total de advertencias: ${resultado.resumenGeneral.totalAdvertencias}`);
        if (resultado.recomendaciones.length > 0) {
            console.log('\n💡 RECOMENDACIONES:');
            resultado.recomendaciones.forEach(rec => console.log(`   ${rec}`));
        }
        console.log('\n🏆 CAPACIDADES DEMOSTRADAS:');
        console.log('   ✅ Navegación automática por múltiples fases');
        console.log('   ✅ Detección automática de campos obligatorios');
        console.log('   ✅ Autocompletado inteligente por fase');
        console.log('   ✅ Validación detallada de cada fase');
        console.log('   ✅ Medición precisa de tiempos de procesamiento');
        console.log('   ✅ Análisis de rendimiento y recomendaciones');
        console.log('   ✅ Reporte completo sin envío del formulario');
    }
    /**
     * Genera un reporte JSON detallado para análisis posterior
     */
    async generarReporteJSON(resultado, rutaArchivo) {
        const fs = await Promise.resolve().then(() => __importStar(require('fs/promises')));
        const path = await Promise.resolve().then(() => __importStar(require('path')));
        const reporte = {
            ...resultado,
            metadatos: {
                fechaGeneracion: new Date().toISOString(),
                version: '1.0.0',
                tipoAnalisis: 'formulario-multifase'
            }
        };
        await fs.writeFile(rutaArchivo, JSON.stringify(reporte, null, 2), 'utf-8');
        console.log(`\n📄 Reporte JSON guardado en: ${rutaArchivo}`);
    }
}
exports.AgenteMultiFase = AgenteMultiFase;
