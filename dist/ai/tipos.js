"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TipoAdvertencia = exports.TipoError = void 0;
/**
 * Tipos de errores de validación
 */
var TipoError;
(function (TipoError) {
    TipoError["CAMPO_OBLIGATORIO"] = "campo_obligatorio";
    TipoError["FORMATO_INVALIDO"] = "formato_invalido";
    TipoError["LONGITUD_INVALIDA"] = "longitud_invalida";
    TipoError["VALOR_FUERA_DE_RANGO"] = "valor_fuera_de_rango";
    TipoError["FORMATO_EMAIL"] = "formato_email";
    TipoError["FORMATO_TELEFONO"] = "formato_telefono";
    TipoError["FORMATO_RUT"] = "formato_rut";
})(TipoError || (exports.TipoError = TipoError = {}));
/**
 * Tipos de advertencias de validación
 */
var TipoAdvertencia;
(function (TipoAdvertencia) {
    TipoAdvertencia["CAMPO_OPCIONAL_VACIO"] = "campo_opcional_vacio";
    TipoAdvertencia["LONGITUD_RECOMENDADA"] = "longitud_recomendada";
    TipoAdvertencia["FORMATO_RECOMENDADO"] = "formato_recomendado";
    TipoAdvertencia["VALOR_INUSUAL"] = "valor_inusual";
})(TipoAdvertencia || (exports.TipoAdvertencia = TipoAdvertencia = {}));
