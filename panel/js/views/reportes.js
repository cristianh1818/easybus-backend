// Vista "Reportes": errores enviados por los usuarios. Filtro por estado,
// paginación y una ventana para cambiar el estado y dejar la respuesta del administrador.

import { get, patch } from '../api.js';
import { esc, toast, mostrarError, conCarga, fechaHora, modal, TEXTOS } from '../ui.js';

const filtro = { estado: '', pagina: 1 };
const LIMITE = 10;
const CLASE_ESTADO = { pendiente: 'aviso', en_revision: '', resuelto: 'ok', descartado: 'mal' };

export default {
  async render(c) {
    c.innerHTML = `
      <section class="tarjeta">
        <div class="fila fila-entre" style="margin-bottom:12px">
          <h3 class="tarjeta-titulo" style="margin:0">Reportes de usuarios</h3>
          <label class="fila" style="font-weight:500">Estado
            <select id="sel-estado">
              <option value="">Todos</option>
              ${Object.entries(TEXTOS.estadoReporte).map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}
            </select>
          </label>
        </div>
        <div class="tabla-contenedor">
          <table class="tabla">
            <thead><tr><th>Fecha</th><th>Tipo</th><th>Sobre</th><th>Descripción</th><th>Enviado por</th><th>Estado</th><th></th></tr></thead>
            <tbody id="tbody-reportes"></tbody>
          </table>
        </div>
        <div class="paginacion" id="paginacion"></div>
      </section>`;

    const sel = c.querySelector('#sel-estado');
    sel.value = filtro.estado;
    sel.addEventListener('change', () => {
      filtro.estado = sel.value;
      filtro.pagina = 1;
      cargar(c);
    });
    c.querySelector('#paginacion').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-pagina]');
      if (!b) return;
      filtro.pagina = Number(b.dataset.pagina);
      cargar(c);
    });
    c.querySelector('#tbody-reportes').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-id]');
      if (b) abrirGestion(c, c._datos.find((r) => r.id === b.dataset.id));
    });

    await cargar(c);
  },
};

async function cargar(c) {
  const qs = new URLSearchParams({ pagina: filtro.pagina, limite: LIMITE });
  if (filtro.estado) qs.set('estado', filtro.estado);
  const res = await get(`/admin/reportes?${qs}`);
  c._datos = res.datos;

  const tbody = c.querySelector('#tbody-reportes');
  tbody.innerHTML = res.datos.length
    ? res.datos
        .map((r) => {
          const sobre = [r.ruta ? `Ruta ${esc(r.ruta.codigo)}` : '', r.embarcadero ? esc(r.embarcadero.nombre) : '']
            .filter(Boolean)
            .join('<br>');
          return `
          <tr>
            <td style="white-space:nowrap">${esc(fechaHora(r.creadoEn))}</td>
            <td>${esc(TEXTOS.tipoReporte[r.tipo] ?? r.tipo)}</td>
            <td>${sobre || '<span class="texto-suave">—</span>'}</td>
            <td style="max-width:360px">${esc(r.descripcion)}</td>
            <td>${r.usuario ? esc(r.usuario.correo) : '<span class="texto-suave">Anónimo</span>'}</td>
            <td><span class="etiqueta ${CLASE_ESTADO[r.estado]}">${esc(TEXTOS.estadoReporte[r.estado])}</span></td>
            <td class="acciones"><button class="btn btn-secundario btn-chico" data-id="${r.id}">Gestionar</button></td>
          </tr>`;
        })
        .join('')
    : '<tr><td colspan="7" class="vacio">No hay reportes con ese filtro.</td></tr>';

  pintarPaginacion(c.querySelector('#paginacion'), res.total, res.pagina, res.limite);
}

export function pintarPaginacion(el, total, pagina, limite) {
  const paginas = Math.max(1, Math.ceil(total / limite));
  el.innerHTML = `
    <span>${total} registro(s) · página ${pagina} de ${paginas}</span>
    <button class="btn btn-secundario btn-chico" data-pagina="${pagina - 1}" ${pagina <= 1 ? 'disabled' : ''}>← Anterior</button>
    <button class="btn btn-secundario btn-chico" data-pagina="${pagina + 1}" ${pagina >= paginas ? 'disabled' : ''}>Siguiente →</button>`;
}

function abrirGestion(c, r) {
  const { el, cerrar } = modal(
    'Gestionar reporte',
    `
    <div class="form">
      <div>
        <div class="ayuda">${esc(fechaHora(r.creadoEn))} · ${esc(TEXTOS.tipoReporte[r.tipo])}
          ${r.ruta ? ` · Ruta ${esc(r.ruta.codigo)} ${esc(r.ruta.nombre)}` : ''}
          ${r.embarcadero ? ` · ${esc(r.embarcadero.nombre)}` : ''}</div>
        <p style="font-size:1.05rem;margin:8px 0 0">${esc(r.descripcion)}</p>
      </div>
      <label>Nuevo estado
        <select name="estado">
          ${Object.entries(TEXTOS.estadoReporte).map(([v, t]) => `<option value="${v}" ${v === r.estado ? 'selected' : ''}>${t}</option>`).join('')}
        </select>
      </label>
      <label>Respuesta del administrador <span class="ayuda">(opcional)</span>
        <textarea name="respuesta" rows="3" maxlength="1000" placeholder="Ej. Horario corregido el 28/10/2026">${esc(r.respuestaAdmin ?? '')}</textarea>
      </label>
      <div class="fila">
        <button type="button" class="btn btn-primario" id="btn-guardar-reporte">Guardar</button>
        <button type="button" class="btn btn-secundario" data-cerrar>Cancelar</button>
      </div>
    </div>`,
    { ancho: 620 },
  );

  el.querySelector('#btn-guardar-reporte').addEventListener('click', async (e) => {
    const estado = el.querySelector('[name=estado]').value;
    const respuestaAdmin = el.querySelector('[name=respuesta]').value.trim();
    try {
      await conCarga(e.currentTarget, () =>
        patch(`/admin/reportes/${r.id}`, { estado, ...(respuestaAdmin ? { respuestaAdmin } : {}) }),
      );
      toast(`Reporte marcado como "${TEXTOS.estadoReporte[estado]}".`, 'exito');
      cerrar();
      await cargar(c);
    } catch (error) {
      mostrarError(error);
    }
  });
}
