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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 8000;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Store para el estado de las ejecuciones
const executionStore = new Map();
// Generar ID único para cada ejecución
const generateExecutionId = () => {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};
// Endpoint para ejecutar el MVP híbrido
app.post('/api/execute-mvp', (req, res) => {
    const { nombreConcurso, rutaFormulario, credencialesAcceso, configuracion = 'demo' } = req.body;
    if (!nombreConcurso || !rutaFormulario) {
        return res.status(400).json({
            error: 'Nombre del concurso y ruta del formulario son requeridos'
        });
    }
    const executionId = generateExecutionId();
    // Inicializar el estado de la ejecución
    executionStore.set(executionId, {
        status: 'running',
        progress: 0,
        logs: [`[${new Date().toISOString()}] Iniciando ejecución del MVP híbrido...`],
        startTime: Date.now()
    });
    // Configurar variables de entorno para el proceso hijo
    const env = {
        ...process.env,
        CORFO_URL: rutaFormulario,
        CORFO_USUARIO: credencialesAcceso?.usuario || '',
        CORFO_PASSWORD: credencialesAcceso?.password || '',
        EXECUTION_ID: executionId
    };
    // Ejecutar el MVP híbrido como proceso hijo
    const mvpProcess = (0, child_process_1.spawn)('npx', ['ts-node', 'ai/mvpHibrido.ts', configuracion], {
        cwd: path.join(__dirname, '..'),
        env,
        stdio: ['pipe', 'pipe', 'pipe']
    });
    // Manejar la salida del proceso
    mvpProcess.stdout?.on('data', (data) => {
        const output = data.toString();
        const execution = executionStore.get(executionId);
        if (execution) {
            execution.logs.push(`[${new Date().toISOString()}] ${output.trim()}`);
            // Detectar progreso basado en la salida
            if (output.includes('Paso ') && output.includes('completado')) {
                const match = output.match(/Paso (\d+)/);
                if (match) {
                    const currentStep = parseInt(match[1]);
                    execution.progress = Math.min((currentStep / 7) * 100, 90); // 7 pasos máximo, 90% hasta completar
                }
            }
            if (output.includes('✅ MVP HÍBRIDO COMPLETADO')) {
                execution.progress = 100;
            }
        }
    });
    mvpProcess.stderr?.on('data', (data) => {
        const error = data.toString();
        const execution = executionStore.get(executionId);
        if (execution) {
            execution.logs.push(`[${new Date().toISOString()}] ERROR: ${error.trim()}`);
        }
    });
    // Manejar finalización del proceso
    mvpProcess.on('close', (code) => {
        const execution = executionStore.get(executionId);
        if (execution) {
            if (code === 0) {
                execution.status = 'completed';
                execution.progress = 100;
                execution.logs.push(`[${new Date().toISOString()}] ✅ Ejecución completada exitosamente`);
                // Intentar leer el resultado del archivo generado
                try {
                    const dataDir = path.join(__dirname, '..', 'data');
                    const files = fs.readdirSync(dataDir);
                    const resultFile = files.find(f => f.startsWith('mvp_hibrido_') && f.endsWith('.json'));
                    if (resultFile) {
                        const resultPath = path.join(dataDir, resultFile);
                        const resultData = JSON.parse(fs.readFileSync(resultPath, 'utf8'));
                        execution.result = resultData;
                    }
                }
                catch (error) {
                    console.error('Error leyendo resultado:', error);
                }
            }
            else {
                execution.status = 'error';
                execution.error = `El proceso terminó con código de error: ${code}`;
                execution.logs.push(`[${new Date().toISOString()}] ❌ Error en la ejecución (código: ${code})`);
            }
        }
    });
    // Timeout de seguridad (10 minutos)
    setTimeout(() => {
        const execution = executionStore.get(executionId);
        if (execution && execution.status === 'running') {
            mvpProcess.kill();
            execution.status = 'error';
            execution.error = 'Timeout: La ejecución tardó más de 10 minutos';
            execution.logs.push(`[${new Date().toISOString()}] ⏰ Timeout: Ejecución cancelada por tiempo límite`);
        }
    }, 10 * 60 * 1000); // 10 minutos
    res.json({
        executionId,
        message: 'Ejecución iniciada',
        status: 'running'
    });
});
// Endpoint para obtener el estado de una ejecución
app.get('/api/execution/:id/status', (req, res) => {
    const { id } = req.params;
    const execution = executionStore.get(id);
    if (!execution) {
        return res.status(404).json({ error: 'Ejecución no encontrada' });
    }
    const response = {
        executionId: id,
        status: execution.status,
        progress: execution.progress,
        logs: execution.logs,
        startTime: execution.startTime,
        duration: Date.now() - execution.startTime,
        ...(execution.result && { result: execution.result }),
        ...(execution.error && { error: execution.error })
    };
    res.json(response);
});
// Endpoint para listar todas las ejecuciones
app.get('/api/executions', (req, res) => {
    const executions = Array.from(executionStore.entries()).map(([id, execution]) => ({
        executionId: id,
        status: execution.status,
        progress: execution.progress,
        startTime: execution.startTime,
        duration: Date.now() - execution.startTime,
        logsCount: execution.logs.length
    }));
    res.json(executions);
});
// Endpoint de salud
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        activeExecutions: executionStore.size
    });
});
// Limpiar ejecuciones antiguas cada hora
setInterval(() => {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    for (const [id, execution] of executionStore.entries()) {
        if (execution.startTime < oneHourAgo && execution.status !== 'running') {
            executionStore.delete(id);
        }
    }
}, 60 * 60 * 1000);
app.listen(PORT, () => {
    console.log(`🚀 Servidor backend ejecutándose en http://localhost:${PORT}`);
    console.log(`📊 API disponible en http://localhost:${PORT}/api`);
});
