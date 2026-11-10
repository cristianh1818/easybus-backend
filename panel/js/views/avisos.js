// Vista "Avisos de servicio": publicar, editar, cerrar y eliminar avisos
// (suspensiones por nivel del río, retrasos, cambios de horario, informativos).
// Reglas de la API: "Cerrar" solo para vigentes; "Eliminar" solo para programados.

import { get, post, patch, del } from '../api.js';
import { esc, toast, mostrarError, conCarga, fechaHora, aInputLocal, TEXTOS } from '../ui.js';
import { pintarPaginacion } from './reportes.js';

const filtro = { vigencia: 'vigente', tipo: '', pagina: 1 };
const LIMITE = 10;
const CLASE_VIGENCIA = { vigente: 'ok', programado: 'aviso', vencido: '' };
let estado = null;

const opciones = (textos, vacio) =>
  (vacio ? `<option value="">${esc(vacio)}</option>` : '') +
  Object.entries(textos).map(([v, t]) => `<option value="${v}">${esc(t)}</option>`).join('');

export default {
  async render(c) {
    const [rutas, embarcaderos] = await Promise.all([get('/admin/rutas'), get('/admin/embarcaderos')]);
    estado = { c, rutas, embarcaderos, editandoId: null, datos: [] };

    c.innerHTML = `
      <section class="tarjeta">
        <form id="form-aviso" class="form" novalidate>
          <div class="form-titulo">
            <h3 class="tarjeta-titulo" id="titulo-form-aviso" style="margin:0">Publicar aviso</h3>
          </div>
          <div class="form-fila">
            <label>Tipo
              <select name="tipo">${opciones(TEXTOS.tipoAviso)}</select>
            </label>
            <label>Motivo
              <select name="motivo">${opciones(TEXTOS.motivoAviso)}</select>
            </label>
          </div>
          <label>Título <span class="ayuda">(lo primero que verá el pasajero)</span>
            <input name="titulo" maxlength="120" placeholder="Ej. Servicio suspendido por creciente del río" />
          </label>
          <label>Mensaje
            <textarea name="mensaje" rows="2" maxlength="1000" placeholder="Ej. Por el nivel alto del río Sinú no hay zarpes hasta nuevo aviso."></textarea>
          </label>
          <div class="form-fila">
            <label>Ruta afectada
              <select name="rutaId">
                <option value="">Todas (aviso general)</option>
                ${rutas.map((r) => `<option value="${r.id}">${esc(r.codigo)} · ${esc(r.nombre)}</option>`).join('')}
              </select>
            </label>
            <label>Embarcadero afectado
              <select name="embarcaderoId"></select>
            </label>
          </div>
          <div class="form-fila">
            <label>Vigente desde <span class="ayuda">(hora de Montería; vacío = ahora)</span>
              <input name="vigenteDesde" type="datetime-local" />
            </label>
            <label>Vigente hasta <span class="ayuda">(vacío = hasta cerrarlo)</span>
              <input name="vigenteHasta" type="datetime-local" />
            </label>
          </div>
          <p class="ayuda" id="resumen-alcance" style="margin:0"></p>
          <div class="fila">
            <button type="submit" class="btn btn-primario" id="btn-guardar-aviso">Publicar aviso</button>
            <button type="button" class="btn btn-secundario" id="btn-cancelar-aviso" hidden>Cancelar edición</button>
          </div>
        </form>
      </section>

      <section class="tarjeta">
        <div class="fila fila-entre" style="margin-bottom:12px">
          <h3 class="tarjeta-titulo" style="margin:0">Avisos</h3>
          <div class="fila">
            <select id="sel-vigencia">${opciones(TEXTOS.vigenciaAviso, 'Todos')}</select>
            <select id="sel-tipo">${opciones(TEXTOS.tipoAviso, 'Todos los tipos')}</select>
          </div>
        </div>
        <div class="tabla-contenedor">
          <table class="tabla">
            <thead><tr><th>Tipo</th><th>Aviso</th><th>Afecta a</th><th>Vigencia</th><th>Estado</th><th></th></tr></thead>
            <tbody id="tbody-avisos"></tbody>
          </table>
        </div>
        <div class="paginacion" id="paginacion"></div>
      </section>`;

    const form = c.querySelector('#form-aviso');
    form.rutaId.addEventListener('change', () => cargarEmbarcaderosDeRuta(form));
    form.embarcaderoId.addEventListener('change', () => pintarResumenAlcance(form));
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      guardar(form);
    });
    c.querySelector('#btn-cancelar-aviso').addEventListener('click', () => limpiar(form));

    for (const campo of ['vigencia', 'tipo']) {
      const sel = c.querySelector(`#sel-${campo}`);
      sel.value = filtro[campo];
      sel.addEventListener('change', () => {
        filtro[campo] = sel.value;
        filtro.pagina = 1;
        cargar();
      });
    }
    c.querySelector('#paginacion').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-pagina]');
      if (!b) return;
      filtro.pagina = Number(b.dataset.pagina);
      cargar();
    });
    c.querySelector('#tbody-avisos').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-accion]');
      if (!b) return;
      const aviso = estado.datos.find((a) => a.id === b.dataset.id);
      if (b.dataset.accion === 'editar') editar(form, aviso);
      if (b.dataset.accion === 'cerrar') cerrar(aviso, b);
      if (b.dataset.accion === 'eliminar') eliminar(aviso, b);
    });

    await cargarEmbarcaderosDeRuta(form);
    await cargar();
  },
  alSalir() {
    estado = null;
  },
};

// ---------- Formulario ----------

// Con una ruta elegida, solo se ofrecen sus embarcaderos (la API exige que el embarcadero esté en la ruta)
async function cargarEmbarcaderosDeRuta(form, seleccionado = '') {
  const rutaId = form.rutaId.value;
  let lista = estado.embarcaderos.filter((e) => e.estado !== 'inactivo');
  if (rutaId) {
    try {
      const detalle = await get(`/admin/rutas/${rutaId}`);
      const ids = new Set(detalle.sentidos.flatMap((s) => s.embarcaderos.map((e) => e.id)));
      lista = lista.filter((e) => ids.has(e.id));
    } catch (error) {
      mostrarError(error);
    }
  }
  form.embarcaderoId.innerHTML =
    `<option value="">${rutaId ? 'Toda la ruta' : 'Ninguno'}</option>` +
    lista.map((e) => `<option value="${e.id}">${esc(e.nombre)}</option>`).join('');
  form.embarcaderoId.value = lista.some((e) => e.id === seleccionado) ? seleccionado : '';
  pintarResumenAlcance(form);
}

function pintarResumenAlcance(form) {
  const ruta = estado.rutas.find((r) => r.id === form.rutaId.value);
  const emb = estado.embarcaderos.find((e) => e.id === form.embarcaderoId.value);
  const texto = ruta && emb
    ? `Afectará solo al ${emb.nombre} dentro de la ruta ${ruta.codigo}.`
    : ruta
      ? `Afectará a toda la ruta ${ruta.codigo}.`
      : emb
        ? `Afectará al ${emb.nombre} en todas las rutas que pasan por él.`
        : 'Aviso general: afectará a todo el servicio.';
  estado.c.querySelector('#resumen-alcance').textContent = texto;
}

function editar(form, a) {
  estado.editandoId = a.id;
  form.tipo.value = a.tipo;
  form.motivo.value = a.motivo;
  form.titulo.value = a.titulo;
  form.mensaje.value = a.mensaje;
  form.rutaId.value = a.ruta?.id ?? '';
  form.vigenteDesde.value = aInputLocal(a.vigenteDesde);
  form.vigenteHasta.value = aInputLocal(a.vigenteHasta);
  cargarEmbarcaderosDeRuta(form, a.embarcadero?.id ?? '');
  estado.c.querySelector('#titulo-form-aviso').textContent = 'Editar aviso';
  estado.c.querySelector('#btn-guardar-aviso').textContent = 'Guardar cambios';
  estado.c.querySelector('#btn-cancelar-aviso').hidden = false;
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function limpiar(form) {
  form.reset();
  estado.editandoId = null;
  estado.c.querySelector('#titulo-form-aviso').textContent = 'Publicar aviso';
  estado.c.querySelector('#btn-guardar-aviso').textContent = 'Publicar aviso';
  estado.c.querySelector('#btn-cancelar-aviso').hidden = true;
  cargarEmbarcaderosDeRuta(form);
}

async function guardar(form) {
  const datos = {
    tipo: form.tipo.value,
    motivo: form.motivo.value,
    titulo: form.titulo.value.trim(),
    mensaje: form.mensaje.value.trim(),
    rutaId: form.rutaId.value || null,
    embarcaderoId: form.embarcaderoId.value || null,
    vigenteHasta: form.vigenteHasta.value || null,
  };
  // Al crear, "desde" vacío = ahora (lo decide la API); al editar se manda siempre
  if (form.vigenteDesde.value) datos.vigenteDesde = form.vigenteDesde.value;
  if (!datos.titulo || !datos.mensaje) return toast('Escribe el título y el mensaje del aviso.', 'error');

  try {
    await conCarga(estado.c.querySelector('#btn-guardar-aviso'), async () => {
      if (estado.editandoId) {
        await patch(`/admin/avisos/${estado.editandoId}`, datos);
        toast('Aviso actualizado.', 'exito');
      } else {
        const a = await post('/admin/avisos', datos);
        toast(a.vigencia === 'vigente' ? 'Aviso publicado: ya lo ven los pasajeros.' : 'Aviso programado.', 'exito');
      }
    });
    limpiar(form);
    await cargar();
  } catch (error) {
    mostrarError(error);
  }
}

// ---------- Lista ----------

async function cargar() {
  const qs = new URLSearchParams({ pagina: filtro.pagina, limite: LIMITE });
  if (filtro.vigencia) qs.set('vigencia', filtro.vigencia);
  if (filtro.tipo) qs.set('tipo', filtro.tipo);
  const res = await get(`/admin/avisos?${qs}`);
  if (!estado) return;
  estado.datos = res.datos;

  estado.c.querySelector('#tbody-avisos').innerHTML = res.datos.length
    ? res.datos.map(fila).join('')
    : `<tr><td colspan="6" class="vacio">No hay avisos${filtro.vigencia ? ` ${TEXTOS.vigenciaAviso[filtro.vigencia].toLowerCase()}s` : ''}.</td></tr>`;
  pintarPaginacion(estado.c.querySelector('#paginacion'), res.total, res.pagina, res.limite);
}

function fila(a) {
  const afecta =
    a.alcance === 'general'
      ? '<strong>Todo el servicio</strong>'
      : [a.ruta ? `Ruta ${esc(a.ruta.codigo)}` : '', a.embarcadero ? esc(a.embarcadero.nombre) : ''].filter(Boolean).join('<br>');
  return `
    <tr>
      <td><span class="etiqueta aviso-${a.tipo}">${esc(TEXTOS.tipoAviso[a.tipo])}</span>
          <div class="ayuda">${esc(TEXTOS.motivoAviso[a.motivo])}</div></td>
      <td style="max-width:340px"><strong>${esc(a.titulo)}</strong><div class="ayuda">${esc(a.mensaje)}</div></td>
      <td>${afecta}</td>
      <td style="white-space:nowrap;font-size:.9rem">
        Desde ${esc(fechaHora(a.vigenteDesde))}<br>
        ${a.vigenteHasta ? `Hasta ${esc(fechaHora(a.vigenteHasta))}` : '<span class="texto-suave">Hasta que se cierre</span>'}
      </td>
      <td><span class="etiqueta ${CLASE_VIGENCIA[a.vigencia]}">${esc(TEXTOS.vigenciaAviso[a.vigencia])}</span></td>
      <td class="acciones">
        ${a.vigencia !== 'vencido' ? `<button class="btn btn-secundario btn-chico" data-accion="editar" data-id="${a.id}">Editar</button>` : ''}
        ${a.vigencia === 'vigente' ? `<button class="btn btn-secundario btn-chico" data-accion="cerrar" data-id="${a.id}">Cerrar</button>` : ''}
        ${a.vigencia === 'programado' ? `<button class="btn btn-peligro btn-chico" data-accion="eliminar" data-id="${a.id}">Eliminar</button>` : ''}
      </td>
    </tr>`;
}

async function cerrar(a, boton) {
  if (!confirm(`¿Cerrar el aviso "${a.titulo}"?\nDejará de mostrarse a los pasajeros y quedará en el historial.`)) return;
  try {
    await conCarga(boton, () => post(`/admin/avisos/${a.id}/cerrar`));
    toast('Aviso cerrado.', 'exito');
    await cargar();
  } catch (error) {
    mostrarError(error);
  }
}

async function eliminar(a, boton) {
  if (!confirm(`¿Eliminar el aviso programado "${a.titulo}"?`)) return;
  try {
    await conCarga(boton, () => del(`/admin/avisos/${a.id}`));
    toast('Aviso eliminado.', 'exito');
    await cargar();
  } catch (error) {
    mostrarError(error);
  }
}
