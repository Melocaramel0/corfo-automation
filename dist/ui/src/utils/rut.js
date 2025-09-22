"use strict";
/**
 * Utilidades para validación de RUT chileno
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanRut = cleanRut;
exports.formatRut = formatRut;
exports.calculateDV = calculateDV;
exports.validateRut = validateRut;
exports.getRutErrorMessage = getRutErrorMessage;
// Limpia el RUT removiendo puntos y guiones
function cleanRut(rut) {
    return rut.replace(/[.-]/g, '').toUpperCase();
}
// Formatea el RUT con puntos y guión
function formatRut(rut) {
    const cleanedRut = cleanRut(rut);
    if (cleanedRut.length < 2)
        return cleanedRut;
    const body = cleanedRut.slice(0, -1);
    const dv = cleanedRut.slice(-1);
    // Agregar puntos cada 3 dígitos desde la derecha
    const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${formattedBody}-${dv}`;
}
// Calcula el dígito verificador de un RUT
function calculateDV(rutBody) {
    let sum = 0;
    let multiplier = 2;
    // Recorrer de derecha a izquierda
    for (let i = rutBody.length - 1; i >= 0; i--) {
        sum += parseInt(rutBody[i]) * multiplier;
        multiplier = multiplier === 7 ? 2 : multiplier + 1;
    }
    const remainder = sum % 11;
    const dv = 11 - remainder;
    if (dv === 11)
        return '0';
    if (dv === 10)
        return 'K';
    return dv.toString();
}
// Valida si un RUT es válido
function validateRut(rut) {
    const cleanedRut = cleanRut(rut);
    // Verificar formato básico
    if (!/^\d{7,8}[0-9K]$/.test(cleanedRut)) {
        return false;
    }
    const rutBody = cleanedRut.slice(0, -1);
    const providedDV = cleanedRut.slice(-1);
    const calculatedDV = calculateDV(rutBody);
    return providedDV === calculatedDV;
}
// Genera un mensaje de error para RUT inválido
function getRutErrorMessage(rut) {
    if (!rut.trim()) {
        return 'El RUT es obligatorio';
    }
    const cleanedRut = cleanRut(rut);
    if (cleanedRut.length < 8) {
        return 'El RUT debe tener al menos 8 caracteres';
    }
    if (!/^\d{7,8}[0-9K]$/.test(cleanedRut)) {
        return 'El RUT debe tener el formato correcto (ej: 12345678-9)';
    }
    if (!validateRut(rut)) {
        return 'El RUT ingresado no es válido';
    }
    return '';
}
