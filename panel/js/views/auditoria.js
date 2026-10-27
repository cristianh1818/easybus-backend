// Vista "Auditoría": historial de cambios administrativos con filtros y paginación.
// El botón "Ver cambios" muestra, campo por campo, los datos antes y después.

import { get } from '../api.js';
import { esc, fechaHora, modal, TEXTOS } from '../ui.js';
import { pintarPaginacion } from './reportes.js';

const filtro = { entidad: '', accion: '', pagina: 1 };
const LIMITE = 15;
const CLASE_ACCION = { crear: 'ok', actualizar: '', eliminar: 'mal' };

export default {
  async render(c) {
    c.innerHTML = `
      <section class="tarjeta">
        <div class="fila fila-entre" style="margin-bottom:12px">
          <h3 class="tarjeta-titulo" style="margin:0">Registro de cambios</h3>
          <div class="fila">
            <select id="sel-entidad">
              <option value="">Todas las entidades</option>
              ${Object.entries(TEXTOS.entidad).map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}
            </select>
            <select id="sel-accion">
              <option value="">Todas las acciones</option>
              ${Object.entries(TEXTOS.accion).map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="tabla-contenedor">
          <table class="tabla">
            <thead><tr><th>Fecha</th><th>Usuario</th><th>Entidad</th><th>Registro</th><th>Acción</th><th></th></tr></thead>
            <tbody id="tbody-auditoria"></tbody>
          </table>
        </div>
        <div class="paginacion" id="paginacion"></div>
      </section>`;

    for (const campo of ['entidad', 'accion']) {
      const sel = c.querySelector(`#sel-${campo}`);
      sel.value = filtro[campo];
      sel.addEventListener('change', () => {
        filtro[campo] = sel.value;
        filtro.pagina = 1;
        cargar(c);
      });
    }
    c.querySelector('#paginacion').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-pagina]');
      if (!b) return;
      filtro.pagina = Number(b.dataset.pagina);
      cargar(c);
    });
    c.querySelector('#tbody-auditoria').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-id]');
      if (b) verCambios(c._datos.find((a) => a.id === b.dataset.id));
    });

    await cargar(c);
  },
};

async function cargar(c) {
  const qs = new URLSearchParams({ pagina: filtro.pagina, limite: LIMITE });
  if (filtro.entidad) qs.set('entidad', filtro.entidad);
  if (filtro.accion) qs.set('accion', filtro.accion);
  const res = await get(`/admin/auditoria?${qs}`);
  c._datos = res.datos;

  c.querySelector('#tbody-auditoria').innerHTML = res.datos.length
    ? res.datos
        .map(
          (a) => `
        <tr>
          <td style="white-space:nowrap">${esc(fechaHora(a.creadoEn))}</td>
          <td>${a.usuario ? esc(a.usuario.nombre) + `<div class="ayuda">${esc(a.usuario.correo)}</div>` : '<span class="texto-suave">—</span>'}</td>
          <td>${esc(TEXTOS.entidad[a.entidad] ?? a.entidad)}</td>
          <td class="texto-suave" title="${esc(a.entidadId)}"><code>${esc(a.entidadId.slice(0, 8))}…</code></td>
          <td><span class="etiqueta ${CLASE_ACCION[a.accion]}">${esc(TEXTOS.accion[a.accion])}</span></td>
          <td class="acciones"><button class="btn btn-secundario btn-chico" data-id="${a.id}">Ver cambios</button></td>
        </tr>`,
        )
        .join('')
    : '<tr><td colspan="6" class="vacio">No hay cambios registrados con ese filtro.</td></tr>';

  pintarPaginacion(c.querySelector('#paginacion'), res.total, res.pagina, res.limite);
}

// Valor legible para la tabla de diferencias (los trazados largos se recortan)
function mostrarValor(v) {
  if (v === undefined) return '<span class="texto-suave">—</span>';
  const texto = typeof v === 'string' ? v : JSON.stringify(v);
  const corto = texto.length > 160 ? `${texto.slice(0, 160)}…` : texto;
  return `<code>${esc(corto)}</code>`;
}

function verCambios(a) {
  const antes = a.datosPrevios ?? {};
  const despues = a.datosNuevos ?? {};
  const claves = [...new Set([...Object.keys(antes), ...Object.keys(despues)])];
  const filas = claves
    .map((k) => ({ k, cambio: JSON.stringify(antes[k]) !== JSON.stringify(despues[k]) }))
    // Primero los campos que cambiaron
    .sort((x, y) => Number(y.cambio) - Number(x.cambio));

  const cambiados = filas.filter((f) => f.cambio).length;
  const resumen =
    a.accion === 'crear'
      ? 'Registro creado: no había datos anteriores.'
      : a.accion === 'eliminar'
        ? 'Registro eliminado: se guardó una copia de cómo estaba.'
        : `${cambiados} campo(s) modificado(s), resaltados en amarillo.`;

  modal(
    `${TEXTOS.accion[a.accion]} · ${TEXTOS.entidad[a.entidad] ?? a.entidad}`,
    `
    <p class="texto-suave" style="margin-top:0">
      ${esc(fechaHora(a.creadoEn))} · por <strong>${esc(a.usuario?.nombre ?? '—')}</strong>
      ${a.usuario ? `(${esc(a.usuario.correo)})` : ''}<br>
      Registro: <code>${esc(a.entidadId)}</code><br>${resumen}
    </p>
    <div class="tabla-contenedor">
      <table class="tabla diff">
        <thead><tr><th>Campo</th><th>Antes</th><th>Después</th></tr></thead>
        <tbody>
          ${filas
            .map(
              ({ k, cambio }) => `
            <tr class="${cambio && a.accion === 'actualizar' ? 'cambio' : ''}">
              <td><strong>${esc(k)}</strong></td>
              <td>${mostrarValor(antes[k])}</td>
              <td>${mostrarValor(despues[k])}</td>
            </tr>`,
            )
            .join('')}
        </tbody>
      </table>
    </div>
    <details style="margin-top:14px">
      <summary>Ver JSON completo</summary>
      <div class="rejilla-2" style="margin-top:8px">
        <div><strong>Antes</strong><pre class="json">${esc(JSON.stringify(a.datosPrevios, null, 2))}</pre></div>
        <div><strong>Después</strong><pre class="json">${esc(JSON.stringify(a.datosNuevos, null, 2))}</pre></div>
      </div>
    </details>`,
    { ancho: 960 },
  );
}
