// Vista "Embarcaciones": registrar, editar (por ejemplo, pasar a mantenimiento) y eliminar
// las embarcaciones del Businú. Sin GPS en la beta: solo inventario y estado.

import { get, post, patch, del } from '../api.js';
import { esc, toast, mostrarError, conCarga, TEXTOS } from '../ui.js';

let estado = null;
const CLASE_ESTADO = { operativa: 'ok', mantenimiento: 'aviso' };

export default {
  async render(c) {
    estado = { c, lista: await get('/admin/embarcaciones'), editandoId: null };

    c.innerHTML = `
      <div class="rejilla-2">
        <section class="tarjeta">
          <form id="form-embarcacion" class="form" novalidate>
            <h3 class="tarjeta-titulo" id="titulo-form-emb" style="margin:0">Nueva embarcación</h3>
            <div class="form-fila">
              <label>Código <span class="ayuda">(único, ej. BN-01)</span>
                <input name="codigo" maxlength="20" placeholder="BN-01" />
              </label>
              <label>Capacidad <span class="ayuda">(pasajeros)</span>
                <input name="capacidad" type="number" min="1" max="500" step="1" placeholder="40" />
              </label>
            </div>
            <label>Nombre
              <input name="nombre" maxlength="120" placeholder="Ej. Businú I" />
            </label>
            <label>Estado
              <select name="estado">
                ${Object.entries(TEXTOS.estadoEmbarcacion).map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}
              </select>
            </label>
            <label>Observaciones <span class="ayuda">(opcional)</span>
              <textarea name="observaciones" rows="2" maxlength="1000" placeholder="Ej. Motor en revisión hasta el viernes"></textarea>
            </label>
            <label class="check"><input type="checkbox" name="esOficial" /> Dato oficial (verificado con el operador)</label>
            <div class="fila">
              <button type="submit" class="btn btn-primario" id="btn-guardar-emb">Registrar embarcación</button>
              <button type="button" class="btn btn-secundario" id="btn-cancelar-emb" hidden>Cancelar edición</button>
            </div>
          </form>
        </section>

        <section class="tarjeta">
          <h3 class="tarjeta-titulo">Flota</h3>
          <div class="cifras" id="cifras-flota"></div>
          <p class="ayuda" style="margin:14px 0 0">
            En la beta no hay rastreo GPS: este inventario sirve para saber qué embarcaciones están disponibles.
          </p>
        </section>
      </div>

      <section class="tarjeta" style="margin-top:20px">
        <h3 class="tarjeta-titulo">Embarcaciones registradas</h3>
        <div class="tabla-contenedor">
          <table class="tabla">
            <thead><tr><th>Código</th><th>Nombre</th><th>Capacidad</th><th>Estado</th><th>Observaciones</th><th>Oficial</th><th></th></tr></thead>
            <tbody id="tbody-emb"></tbody>
          </table>
        </div>
      </section>`;

    const form = c.querySelector('#form-embarcacion');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      guardar(form);
    });
    c.querySelector('#btn-cancelar-emb').addEventListener('click', () => limpiar(form));
    c.querySelector('#tbody-emb').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-accion]');
      if (!b) return;
      const emb = estado.lista.find((x) => x.id === b.dataset.id);
      if (b.dataset.accion === 'editar') editar(form, emb);
      if (b.dataset.accion === 'estado') cambiarEstado(emb, b);
      if (b.dataset.accion === 'eliminar') eliminar(emb, b);
    });
    pintar();
  },
  alSalir() {
    estado = null;
  },
};

function pintar() {
  const { c, lista } = estado;
  const operativas = lista.filter((e) => e.estado === 'operativa');
  c.querySelector('#cifras-flota').innerHTML = `
    <div class="cifra"><div class="cifra-valor">${operativas.length}</div><div class="cifra-etiqueta">Operativas</div></div>
    <div class="cifra${lista.length - operativas.length > 0 ? ' destacada' : ''}"><div class="cifra-valor">${lista.length - operativas.length}</div><div class="cifra-etiqueta">En mantenimiento</div></div>
    <div class="cifra"><div class="cifra-valor">${operativas.reduce((s, e) => s + e.capacidad, 0)}</div><div class="cifra-etiqueta">Pasajeros disponibles</div></div>`;

  c.querySelector('#tbody-emb').innerHTML = lista.length
    ? lista
        .map(
          (e) => `
      <tr class="${e.id === estado.editandoId ? 'seleccionada' : ''}">
        <td><strong>${esc(e.codigo)}</strong></td>
        <td>${esc(e.nombre)}</td>
        <td class="num">${e.capacidad}</td>
        <td><span class="etiqueta ${CLASE_ESTADO[e.estado]}">${esc(TEXTOS.estadoEmbarcacion[e.estado])}</span></td>
        <td class="texto-suave" style="max-width:280px">${esc(e.observaciones ?? '—')}</td>
        <td>${e.esOficial ? '<span class="etiqueta ok">Sí</span>' : '<span class="etiqueta aviso">No oficial</span>'}</td>
        <td class="acciones">
          <button class="btn btn-secundario btn-chico" data-accion="editar" data-id="${e.id}">Editar</button>
          <button class="btn btn-secundario btn-chico" data-accion="estado" data-id="${e.id}">
            ${e.estado === 'operativa' ? 'A mantenimiento' : 'Marcar operativa'}
          </button>
          <button class="btn btn-peligro btn-chico" data-accion="eliminar" data-id="${e.id}">Eliminar</button>
        </td>
      </tr>`,
        )
        .join('')
    : '<tr><td colspan="7" class="vacio">Aún no hay embarcaciones registradas.</td></tr>';
}

function editar(form, e) {
  estado.editandoId = e.id;
  form.codigo.value = e.codigo;
  form.nombre.value = e.nombre;
  form.capacidad.value = e.capacidad;
  form.estado.value = e.estado;
  form.observaciones.value = e.observaciones ?? '';
  form.esOficial.checked = e.esOficial;
  estado.c.querySelector('#titulo-form-emb').textContent = `Editar ${e.codigo}`;
  estado.c.querySelector('#btn-guardar-emb').textContent = 'Guardar cambios';
  estado.c.querySelector('#btn-cancelar-emb').hidden = false;
  pintar();
  form.nombre.focus();
}

function limpiar(form) {
  form.reset();
  estado.editandoId = null;
  estado.c.querySelector('#titulo-form-emb').textContent = 'Nueva embarcación';
  estado.c.querySelector('#btn-guardar-emb').textContent = 'Registrar embarcación';
  estado.c.querySelector('#btn-cancelar-emb').hidden = true;
  pintar();
}

async function guardar(form) {
  const datos = {
    codigo: form.codigo.value.trim(),
    nombre: form.nombre.value.trim(),
    capacidad: Number(form.capacidad.value),
    estado: form.estado.value,
    observaciones: form.observaciones.value.trim() || null,
    esOficial: form.esOficial.checked,
  };
  try {
    await conCarga(estado.c.querySelector('#btn-guardar-emb'), async () => {
      if (estado.editandoId) {
        const e = await patch(`/admin/embarcaciones/${estado.editandoId}`, datos);
        toast(`Embarcación ${e.codigo} actualizada.`, 'exito');
      } else {
        const e = await post('/admin/embarcaciones', datos);
        toast(`Embarcación ${e.codigo} registrada.`, 'exito');
      }
    });
    estado.lista = await get('/admin/embarcaciones');
    limpiar(form);
  } catch (error) {
    // La API valida todo (código único, capacidad entera y positiva…) y responde en español
    mostrarError(error);
  }
}

async function cambiarEstado(e, boton) {
  const nuevo = e.estado === 'operativa' ? 'mantenimiento' : 'operativa';
  try {
    await conCarga(boton, () => patch(`/admin/embarcaciones/${e.id}`, { estado: nuevo }));
    e.estado = nuevo;
    toast(`${e.codigo}: ${TEXTOS.estadoEmbarcacion[nuevo].toLowerCase()}.`, 'exito');
    pintar();
  } catch (error) {
    mostrarError(error);
  }
}

async function eliminar(e, boton) {
  if (!confirm(`¿Eliminar la embarcación ${e.codigo} (${e.nombre})?\nQuedará registrado en la auditoría.`)) return;
  try {
    await conCarga(boton, () => del(`/admin/embarcaciones/${e.id}`));
    estado.lista = estado.lista.filter((x) => x.id !== e.id);
    if (estado.editandoId === e.id) limpiar(estado.c.querySelector('#form-embarcacion'));
    else pintar();
    toast(`Embarcación ${e.codigo} eliminada.`, 'exito');
  } catch (error) {
    mostrarError(error);
  }
}
