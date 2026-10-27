// Cliente de la API de EASYBUS: todas las peticiones del panel pasan por aquí.
// Agrega el token, interpreta la respuesta y traduce los errores a mensajes en español.

const BASE = '/api/v1';
const CLAVE_SESION = 'easybus.sesion';

// ---------- Sesión (token + usuario) en sessionStorage ----------
// sessionStorage se borra al cerrar la pestaña: más seguro que localStorage para un token.
export const sesion = {
  obtener() {
    try {
      return JSON.parse(sessionStorage.getItem(CLAVE_SESION));
    } catch {
      return null;
    }
  },
  guardar(datos) {
    try {
      sessionStorage.setItem(CLAVE_SESION, JSON.stringify(datos));
    } catch {
      /* navegación privada sin almacenamiento: la sesión dura solo mientras la página esté abierta */
    }
    memoria = datos;
  },
  borrar() {
    try {
      sessionStorage.removeItem(CLAVE_SESION);
    } catch {
      /* ignorar */
    }
    memoria = null;
  },
};
let memoria = null; // respaldo si sessionStorage no está disponible
const sesionActual = () => sesion.obtener() ?? memoria;

// ---------- Errores ----------
export class ApiError extends Error {
  constructor(status, mensaje, detalle) {
    super(mensaje);
    this.status = status;
    this.detalle = detalle;
  }
}

function mensajeDeError(status, datos) {
  const msgApi = Array.isArray(datos?.message) ? datos.message.join(' · ') : datos?.message;
  switch (status) {
    case 400:
      return `Datos inválidos: ${msgApi ?? 'revisa el formulario.'}`;
    case 401:
      return msgApi && msgApi !== 'Unauthorized'
        ? msgApi
        : 'Tu sesión no es válida o expiró. Inicia sesión de nuevo.';
    case 403:
      return 'No tienes permiso para realizar esta acción.';
    case 404:
      return msgApi ?? 'No se encontró el recurso solicitado.';
    case 409:
      return `No se pudo completar: ${msgApi ?? 'el registro entra en conflicto con otros datos.'}`;
    case 429:
      return 'Demasiadas peticiones seguidas. Espera un minuto e intenta de nuevo.';
    default:
      return status >= 500
        ? 'Error interno del servidor. Revisa la consola donde corre la API.'
        : (msgApi ?? `Error ${status}`);
  }
}

// Función que app.js registra para volver al login cuando la API responde 401
let alExpirarSesion = () => {};
export function onSesionExpirada(fn) {
  alExpirarSesion = fn;
}

// ---------- Petición genérica ----------
// publico: true -> no envía el token (para probar los endpoints del pasajero tal cual)
export async function api(metodo, ruta, cuerpo, { publico = false } = {}) {
  const headers = { Accept: 'application/json' };
  if (cuerpo !== undefined) headers['Content-Type'] = 'application/json';
  const token = sesionActual()?.token;
  if (token && !publico) headers.Authorization = `Bearer ${token}`;

  let respuesta;
  try {
    respuesta = await fetch(BASE + ruta, {
      method: metodo,
      headers,
      body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
    });
  } catch {
    throw new ApiError(0, 'No se pudo conectar con la API. ¿Está corriendo "npm run start:dev"?');
  }

  const texto = await respuesta.text();
  let datos = null;
  try {
    datos = texto ? JSON.parse(texto) : null;
  } catch {
    datos = texto;
  }

  if (!respuesta.ok) {
    const error = new ApiError(respuesta.status, mensajeDeError(respuesta.status, datos), datos);
    if (respuesta.status === 401 && !publico && ruta !== '/auth/login') alExpirarSesion(error);
    throw error;
  }
  return datos;
}

// Atajos
export const get = (ruta, opciones) => api('GET', ruta, undefined, opciones);
export const post = (ruta, cuerpo, opciones) => api('POST', ruta, cuerpo, opciones);
export const put = (ruta, cuerpo) => api('PUT', ruta, cuerpo);
export const patch = (ruta, cuerpo) => api('PATCH', ruta, cuerpo);
export const del = (ruta) => api('DELETE', ruta);

export { sesionActual };
