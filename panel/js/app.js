// Punto de entrada del panel: inicio de sesión, menú lateral y navegación entre secciones.
// La navegación usa el "hash" de la URL (#/inicio, #/rutas...), así no hace falta un servidor especial.

import { post, sesion, sesionActual, onSesionExpirada } from './api.js';
import { esc, toast } from './ui.js';
import inicio from './views/inicio.js';
import embarcaderos from './views/embarcaderos.js';
import rutas from './views/rutas.js';
import horarios from './views/horarios.js';
import festivos from './views/festivos.js';
import reportes from './views/reportes.js';
import auditoria from './views/auditoria.js';
import pasajero from './views/pasajero.js';

// Secciones del menú. Las que no tienen "vista" todavía muestran "en construcción".
// Cada vista tiene render(contenedor) y, opcionalmente, alMostrar() y alSalir().
const SECCIONES = [
  { id: 'inicio', titulo: 'Inicio', vista: inicio },
  { separador: 'Gestión' },
  { id: 'embarcaderos', titulo: 'Embarcaderos', vista: embarcaderos },
  { id: 'rutas', titulo: 'Rutas', vista: rutas },
  { id: 'horarios', titulo: 'Horarios', vista: horarios },
  { id: 'festivos', titulo: 'Festivos', vista: festivos },
  { separador: 'Seguimiento' },
  { id: 'reportes', titulo: 'Reportes', vista: reportes },
  { id: 'auditoria', titulo: 'Auditoría', vista: auditoria },
  { separador: 'Consulta' },
  { id: 'pasajero', titulo: 'Vista pasajero', vista: pasajero },
];

const $ = (id) => document.getElementById(id);
const pantallaLogin = $('pantalla-login');
const pantallaApp = $('pantalla-app');
const contenido = $('contenido');
const mensajeLogin = $('login-mensaje');

// ---------- Inicio de sesión ----------

function mostrarLogin(mensaje) {
  pantallaApp.hidden = true;
  pantallaLogin.hidden = false;
  mensajeLogin.hidden = !mensaje;
  mensajeLogin.textContent = mensaje ?? '';
  $('form-login').password.focus();
}

$('form-login').addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const form = evento.currentTarget;
  const boton = form.querySelector('button[type="submit"]');
  mensajeLogin.hidden = true;
  boton.disabled = true;
  boton.textContent = 'Ingresando…';

  try {
    const respuesta = await post('/auth/login', {
      correo: form.correo.value.trim(),
      password: form.password.value,
    });
    // El panel es solo para administradores: un pasajero no puede entrar
    if (respuesta.usuario.rol !== 'administrador') {
      mostrarLogin('Acceso solo para administradores.');
      return;
    }
    sesion.guardar({ token: respuesta.accessToken, usuario: respuesta.usuario });
    form.password.value = '';
    entrar();
  } catch (error) {
    mostrarLogin(error.message);
  } finally {
    boton.disabled = false;
    boton.textContent = 'Ingresar';
  }
});

$('btn-salir').addEventListener('click', () => {
  sesion.borrar();
  location.hash = '';
  mostrarLogin();
});

// Si cualquier petición responde 401 (token vencido o inválido) se vuelve al login
onSesionExpirada(() => {
  sesion.borrar();
  mostrarLogin('Tu sesión expiró. Inicia sesión de nuevo.');
});

// ---------- Aplicación ----------

function entrar() {
  const { usuario } = sesionActual();
  $('nombre-usuario').textContent = `${usuario.nombre} · ${usuario.rol}`;
  pantallaLogin.hidden = true;
  pantallaApp.hidden = false;
  pintarMenu();
  navegar();
}

function pintarMenu() {
  $('menu').innerHTML = SECCIONES.map((s) =>
    s.separador
      ? `<div class="separador">${esc(s.separador)}</div>`
      : `<a href="#/${s.id}" data-id="${s.id}">${esc(s.titulo)}</a>`,
  ).join('');
}

// Muestra la sección indicada en la URL (#/rutas -> sección "rutas")
let navegacionActual = 0;
let vistaVisible = null;
async function navegar() {
  if (!sesionActual()) return mostrarLogin();

  const id = location.hash.replace(/^#\/?/, '').split('/')[0] || 'inicio';
  const seccion = SECCIONES.find((s) => s.id === id) ?? SECCIONES[0];

  document.querySelectorAll('#menu a').forEach((a) => {
    a.classList.toggle('activo', a.dataset.id === seccion.id);
  });
  $('titulo-seccion').textContent = seccion.titulo;
  document.title = `${seccion.titulo} · EASYBUS`;

  const miNavegacion = ++navegacionActual;
  // Avisar a la vista anterior que se va (ej. para liberar su mapa)
  try {
    vistaVisible?.alSalir?.();
  } catch {
    /* ignorar */
  }
  vistaVisible = null;
  contenido.innerHTML = '<div class="cargando">Cargando…</div>';

  if (!seccion.vista) {
    contenido.innerHTML = `
      <div class="tarjeta pronto">
        <strong>${esc(seccion.titulo)}</strong>
        Esta sección se construye en la siguiente parte del panel.
      </div>`;
    return;
  }

  try {
    const nodo = document.createElement('div');
    await seccion.vista.render(nodo);
    // Si el usuario cambió de sección mientras cargaba, no pintar la vista vieja
    if (miNavegacion !== navegacionActual) return;
    contenido.replaceChildren(nodo);
    vistaVisible = seccion.vista;
    // Ya está en pantalla: aquí los mapas pueden medir su tamaño
    seccion.vista.alMostrar?.();
  } catch (error) {
    if (miNavegacion !== navegacionActual) return;
    if (error.status === 401) return; // ya se mostró el login
    contenido.innerHTML = `<div class="mensaje-error">${esc(error.message)}</div>`;
    toast(error.message, 'error');
  }
}

window.addEventListener('hashchange', navegar);

// Al cargar la página: si ya hay sesión guardada se entra directo
if (sesionActual()) entrar();
else mostrarLogin();
