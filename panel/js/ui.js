// Utilidades de interfaz compartidas por todas las vistas.

// Escapa texto antes de insertarlo como HTML (evita inyección de código).
export function esc(valor) {
  return String(valor ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

// Mensaje flotante en la esquina inferior derecha. tipo: 'exito' | 'error' | 'info'
export function toast(mensaje, tipo = 'info', duracionMs = 4500) {
  const caja = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = `toast ${tipo}`;
  el.textContent = mensaje;
  caja.appendChild(el);
  setTimeout(() => el.remove(), tipo === 'error' ? duracionMs + 2500 : duracionMs);
}

// Muestra el error de la API en un toast rojo (y lo devuelve por si se quiere usar)
export function mostrarError(error) {
  toast(error?.message ?? 'Ocurrió un error inesperado.', 'error');
  return error;
}

// Fecha y hora legibles en la zona horaria de Montería
const formatoFechaHora = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'America/Bogota',
  dateStyle: 'medium',
  timeStyle: 'short',
});
export const fechaHora = (iso) => (iso ? formatoFechaHora.format(new Date(iso)) : '—');

// Fecha "AAAA-MM-DD" -> "lunes, 2 de noviembre de 2026" (sin desfase de zona horaria)
const formatoFechaLarga = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'UTC',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
export const fechaLarga = (aaaammdd) => formatoFechaLarga.format(new Date(`${aaaammdd}T00:00:00Z`));

// Fecha ISO -> "AAAA-MM-DDTHH:MM" en hora de Montería, para un <input type="datetime-local">.
// La API interpreta una fecha sin zona como hora de Montería, así que el valor ida y vuelta es el mismo.
const partesBogota = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Bogota',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});
export function aInputLocal(iso) {
  if (!iso) return '';
  const p = Object.fromEntries(partesBogota.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

// Crea un elemento a partir de HTML
export function html(cadena) {
  const t = document.createElement('template');
  t.innerHTML = cadena.trim();
  return t.content.firstElementChild;
}

// Ventana modal. Devuelve { el, cerrar }. Se cierra con Escape, clic afuera o [data-cerrar].
export function modal(titulo, contenidoHtml, { ancho = 760 } = {}) {
  const fondo = html(`
    <div class="modal-fondo">
      <div class="modal" role="dialog" aria-modal="true" style="max-width:${ancho}px">
        <div class="modal-cabecera">
          <h3>${esc(titulo)}</h3>
          <button type="button" class="btn btn-secundario btn-chico" data-cerrar>Cerrar</button>
        </div>
        <div class="modal-cuerpo"></div>
      </div>
    </div>`);
  fondo.querySelector('.modal-cuerpo').innerHTML = contenidoHtml;
  const alTeclear = (e) => {
    if (e.key === 'Escape') cerrar();
  };
  function cerrar() {
    fondo.remove();
    document.removeEventListener('keydown', alTeclear);
  }
  fondo.addEventListener('click', (e) => {
    if (e.target === fondo || e.target.closest('[data-cerrar]')) cerrar();
  });
  document.addEventListener('keydown', alTeclear);
  document.body.appendChild(fondo);
  return { el: fondo.querySelector('.modal'), cerrar };
}

// Textos en español para los valores que devuelve la API
export const TEXTOS = {
  tipoDia: { laboral: 'Laboral (lun–vie)', sabado: 'Sábado', domingo_festivo: 'Domingo / festivo' },
  dayType: { WEEKDAY: 'Laboral', SATURDAY: 'Sábado', SUNDAY_HOLIDAY: 'Domingo / festivo' },
  dayTypeATipoDia: { WEEKDAY: 'laboral', SATURDAY: 'sabado', SUNDAY_HOLIDAY: 'domingo_festivo' },
  sentido: { ida: 'Ida', vuelta: 'Vuelta' },
  estadoEmbarcadero: { activo: 'Activo', cerrado_temporal: 'Cerrado temporalmente', inactivo: 'Inactivo' },
  tipoEmbarcadero: { embarcadero: 'Embarcadero', parada_bus: 'Parada de bus' },
  margen: { izquierda: 'Margen izquierda', derecha: 'Margen derecha' },
  modo: { fluvial: 'Fluvial', bus: 'Bus' },
  tipoAviso: { suspendido: 'Suspendido', retraso: 'Retraso', cambio_horario: 'Cambio de horario', informativo: 'Informativo' },
  motivoAviso: { nivel_rio: 'Nivel del río', clima: 'Clima', mantenimiento: 'Mantenimiento', otro: 'Otro' },
  vigenciaAviso: { programado: 'Programado', vigente: 'Vigente', vencido: 'Vencido' },
  estadoEmbarcacion: { operativa: 'Operativa', mantenimiento: 'En mantenimiento' },
  estadoReporte: { pendiente: 'Pendiente', en_revision: 'En revisión', resuelto: 'Resuelto', descartado: 'Descartado' },
  tipoReporte: { ruta: 'Ruta', embarcadero: 'Embarcadero', horario: 'Horario', otro: 'Otro' },
  accion: { crear: 'Crear', actualizar: 'Actualizar', eliminar: 'Eliminar' },
  entidad: {
    rutas: 'Rutas',
    ruta_sentidos: 'Sentidos de ruta',
    ruta_embarcaderos: 'Secuencia de embarcaderos',
    embarcaderos: 'Embarcaderos',
    horarios: 'Horarios',
    dias_festivos: 'Festivos',
    reportes: 'Reportes',
    avisos_servicio: 'Avisos de servicio',
    embarcaciones: 'Embarcaciones',
  },
};

// Deshabilita un botón mientras se ejecuta una acción asíncrona
export async function conCarga(boton, accion) {
  const textoOriginal = boton.textContent;
  boton.disabled = true;
  boton.textContent = 'Procesando…';
  try {
    return await accion();
  } finally {
    boton.disabled = false;
    boton.textContent = textoOriginal;
  }
}
