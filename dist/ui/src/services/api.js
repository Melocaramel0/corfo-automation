"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiService = void 0;
const axios_1 = __importDefault(require("axios"));
// Configuración base de Axios
const api = axios_1.default.create({
    baseURL: '/api',
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
});
// Interceptor para agregar token de autenticación
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});
// Interceptor para manejar respuestas y errores
api.interceptors.response.use((response) => response, (error) => {
    if (error.response?.status === 401) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        window.location.href = '/login';
    }
    return Promise.reject(error);
});
// Funciones auxiliares para las peticiones
exports.apiService = {
    // GET request
    async get(url, params) {
        const response = await api.get(url, { params });
        return response.data;
    },
    // GET request con paginación
    async getPaginated(url, params) {
        const response = await api.get(url, { params });
        return response.data;
    },
    // POST request
    async post(url, data) {
        const response = await api.post(url, data);
        return response.data;
    },
    // PUT request
    async put(url, data) {
        const response = await api.put(url, data);
        return response.data;
    },
    // PATCH request
    async patch(url, data) {
        const response = await api.patch(url, data);
        return response.data;
    },
    // DELETE request
    async delete(url) {
        const response = await api.delete(url);
        return response.data;
    },
    // Download file
    async downloadFile(url, filename) {
        const response = await api.get(url, { responseType: 'blob' });
        const blob = new Blob([response.data]);
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename || 'download';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
    }
};
exports.default = api;
