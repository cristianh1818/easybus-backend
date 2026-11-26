// Vista "Embarcaderos": tabla, formulario de crear/editar, eliminar y mapa.
// Al hacer clic en el mapa se llenan la latitud y la longitud del formulario.

import { get, post, patch, del } from '../api.js';
import { esc, toast, mostrarError, conCarga, TEXTOS } from '../ui.js';
import { crearMapa, punto, encuadrar, redondear, colorEstado, COLORES } from '../mapa.js';

let estado = null; // datos de la vista mientras está abierta

const CAMPOS_SI_NO = ['tieneRampa', 'tieneTecho', 'tieneIluminacion'];
const opciones = (textos) =>
  Object.entries(textos).map(([valor, texto]) => `<option value="${valor}">${esc(texto)}</option>`).join('');
const CLASE_ESTADO = { activo: 'ok', cerrado_temporal: 'aviso', inactivo: 'mal' };
const etiquetaEstado = (e) =>
  `<span class="etiqueta ${CLASE_ESTADO[e] ?? ''}">${esc(TEXTOS.estadoEmbarcadero[e] ?? e)}</span>`;

export default {
  async render(contenedor) {
    const lista = await get('/admin/embarcaderos');
    estado = { contenedor, lista, editandoId: null, mapa: null, capas: new Map(), marcaSeleccion: null };

    contenedor.innerHTML = `
      <div class="rejilla-mapa">
        <section class="tarjeta">
          <div class="fila fila-entre" style="margin-bottom:12px">
            <h3 class="tarjeta-titulo" style="margin:0">Mapa de embarcaderos</h3>
            <span class="ayuda">Haz clic en el río para ubicar un embarcadero</span>
          </div>
          <div id="mapa-embarcaderos" class="mapa mapa-click"></div>
          <div class="mapa-leyenda">
            <span style="--c:${COLORES.activo}">Activo</span>
            <span style="--c:${COLORES.cerrado}">Cerrado temporalmente</span>
            <span style="--c:${COLORES.inactivo}">Inactivo</span>
            <span style="--c:${COLORES.seleccion}">Posición del formulario</span>
          </div>
        </section>

        <section class="tarjeta">
          <form id="form-embarcadero" class="form" novalidate>
            <div class="form-titulo">
              <h3 class="tarjeta-titulo" id="titulo-form" style="margin:0">Nuevo embarcadero</h3>
              <button type="button" class="btn btn-secundario btn-chico" id="btn-nuevo" hidden>+ Nuevo</button>
            </div>
            <label>Nombre
              <input name="nombre" required maxlength="120" placeholder="Ej. Embarcadero Calle 30" />
            </label>
            <label>Referencia <span class="ayuda">(opcional)</span>
              <input name="referencia" maxlength="200" placeholder="Ej. Ronda del Sinú, frente a la Calle 30" />
            </label>
            <div class="form-fila">
              <label>Latitud
                <input name="latitud" type="number" step="any" required placeholder="8.7535" />
              </label>
              <label>Longitud
                <input name="longitud" type="number" step="any" required placeholder="-75.8851" />
              </label>
            </div>
            <div class="form-fila">
              <label>Estado
                <select name="estado">
                  ${opciones(TEXTOS.estadoEmbarcadero)}
                </select>
              </label>
              <label>Margen del río
                <select name="margen">
                  <option value="">Sin dato</option>
                  ${opciones(TEXTOS.margen)}
                </select>
              </label>
            </div>
            <div class="form-fila" style="grid-template-columns:1fr 1fr 1fr">
              ${['tieneRampa:Rampa', 'tieneTecho:Techo', 'tieneIluminacion:Iluminación']
                .map((x) => x.split(':'))
                .map(
                  ([campo, texto]) => `
                <label>${texto}
                  <select name="${campo}">
                    <option value="">Sin dato</option><option value="true">Sí</option><option value="false">No</option>
                  </select>
                </label>`,
                )
                .join('')}
            </div>
            <div class="form-fila">
              <label>Tipo
                <select name="tipo">${opciones(TEXTOS.tipoEmbarcadero)}</select>
              </label>
            </div>
            <fieldset class="campo-foto">
              <legend>Foto <span class="ayuda">(opcional · JPG, PNG o WEBP, máx. 5 MB)</span></legend>
              <div class="foto-contenido">
                <div class="foto-vista" id="foto-vista"></div>
                <div class="foto-acciones">
                  <input type="file" id="inp-foto" accept="image/jpeg,image/png,image/webp" hidden />
                  <button type="button" class="btn btn-secundario btn-chico" id="btn-subir-foto">📷 Subir foto</button>
                  <button type="button" class="btn btn-peligro btn-chico" id="btn-quitar-foto" hidden>Quitar foto</button>
                  <p class="ayuda" id="foto-estado"></p>
                </div>
              </div>
              <details id="det-foto-url">
                <summary class="ayuda">o pegar la URL de una foto</summary>
                <input name="fotoUrl" type="url" maxlength="500" placeholder="https://…" />
              </details>
            </fieldset>
            <label class="check"><input type="checkbox" name="esOficial" /> Dato oficial (verificado con el operador)</label>
            <div class="fila">
              <button type="submit" class="btn btn-primario" id="btn-guardar">Crear embarcadero</button>
              <button type="button" class="btn btn-secundario" id="btn-cancelar" hidden>Cancelar edición</button>
            </div>
          </form>
        </section>
      </div>

      <section class="tarjeta" style="margin-top:20px">
        <h3 class="tarjeta-titulo">Embarcaderos registrados (<span id="total-emb">0</span>)</h3>
        <div class="tabla-contenedor">
          <table class="tabla">
            <thead>
              <tr>
                <th>Nombre</th><th>Referencia</th><th>Latitud</th><th>Longitud</th>
                <th>Estado</th><th>Oficial</th><th></th>
              </tr>
            </thead>
            <tbody id="tbody-emb"></tbody>
          </table>
        </div>
      </section>`;

    const form = contenedor.querySelector('#form-embarcadero');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      guardar(form);
    });
    conectarFoto(form);
    contenedor.querySelector('#btn-cancelar').addEventListener('click', () => limpiarFormulario());
    contenedor.querySelector('#btn-nuevo').addEventListener('click', () => limpiarFormulario());

    // Si se escriben las coordenadas a mano, mover el marcador rojo
    for (const nombre of ['latitud', 'longitud']) {
      form[nombre].addEventListener('input', () => {
        const lat = parseFloat(form.latitud.value);
        const lng = parseFloat(form.longitud.value);
        if (Number.isFinite(lat) && Number.isFinite(lng)) marcarSeleccion([lat, lng], false);
      });
    }

    // Clic en la tabla: editar / eliminar / ver en mapa
    contenedor.querySelector('#tbody-emb').addEventListener('click', (e) => {
      const boton = e.target.closest('button[data-accion]');
      if (!boton) return;
      const emb = estado.lista.find((x) => x.id === boton.dataset.id);
      if (boton.dataset.accion === 'editar') editar(emb);
      if (boton.dataset.accion === 'eliminar') eliminar(emb, boton);
    });

    pintarTabla();
  },

  // El contenedor ya está en pantalla: crear el mapa
  alMostrar() {
    const elemento = estado.contenedor.querySelector('#mapa-embarcaderos');
    estado.mapa = crearMapa(elemento);
    estado.mapa.on('click', (e) => {
      const form = estado.contenedor.querySelector('#form-embarcadero');
      form.latitud.value = redondear(e.latlng.lat);
      form.longitud.value = redondear(e.latlng.lng);
      marcarSeleccion([e.latlng.lat, e.latlng.lng], false);
      if (!form.nombre.value) form.nombre.focus();
    });
    pintarMapa(true);
  },

  alSalir() {
    estado?.mapa?.remove();
    estado = null;
  },
};

// ---------- Pintar ----------

function pintarTabla() {
  const tbody = estado.contenedor.querySelector('#tbody-emb');
  estado.contenedor.querySelector('#total-emb').textContent = estado.lista.length;

  if (estado.lista.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="vacio">Aún no hay embarcaderos. Crea el primero desde el formulario.</td></tr>';
    return;
  }
  tbody.innerHTML = estado.lista
    .map(
      (e) => `
      <tr data-id="${e.id}" class="${e.id === estado.editandoId ? 'seleccionada' : ''}">
        <td><strong>${esc(e.nombre)}</strong></td>
        <td class="texto-suave">${esc(e.referencia ?? '—')}</td>
        <td class="num">${e.latitud.toFixed(5)}</td>
        <td class="num">${e.longitud.toFixed(5)}</td>
        <td>${etiquetaEstado(e.estado)}</td>
        <td>${e.esOficial ? '<span class="etiqueta ok">Sí</span>' : '<span class="etiqueta aviso">No oficial</span>'}</td>
        <td class="acciones">
          <button class="btn btn-secundario btn-chico" data-accion="editar" data-id="${e.id}">Editar</button>
          <button class="btn btn-peligro btn-chico" data-accion="eliminar" data-id="${e.id}">Eliminar</button>
        </td>
      </tr>`,
    )
    .join('');
}

function pintarMapa(encuadrarTodo = false) {
  if (!estado?.mapa) return;
  for (const capa of estado.capas.values()) capa.remove();
  estado.capas.clear();

  for (const e of estado.lista) {
    const capa = punto([e.latitud, e.longitud], {
      color: colorEstado(e.estado),
      radio: e.id === estado.editandoId ? 11 : 8,
    })
      .bindTooltip(esc(e.nombre))
      .bindPopup(`<strong>${esc(e.nombre)}</strong><br>${esc(e.referencia ?? '')}`)
      .on('click', (ev) => {
        window.L.DomEvent.stopPropagation(ev); // que no cuente como clic para ubicar
        editar(e);
      })
      .addTo(estado.mapa);
    estado.capas.set(e.id, capa);
  }
  if (encuadrarTodo) encuadrar(estado.mapa, [...estado.capas.values()]);
}

// Marcador rojo con la posición que está en el formulario
function marcarSeleccion(latlng, centrar) {
  if (!estado?.mapa) return;
  estado.marcaSeleccion?.remove();
  estado.marcaSeleccion = punto(latlng, { color: COLORES.seleccion, radio: 9 }).addTo(estado.mapa);
  if (centrar) estado.mapa.setView(latlng, Math.max(estado.mapa.getZoom(), 15));
}

// ---------- Foto ----------
// Editando un embarcadero, "Subir foto" y "Quitar foto" se aplican de inmediato
// (la API necesita su id). En uno nuevo, la foto elegida se sube justo después de crearlo.

const TIPOS_FOTO = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FOTO = 5 * 1024 * 1024;
const esFotoSubida = (url) => typeof url === 'string' && url.startsWith('/uploads/');

const subirFoto = (id, archivo) => {
  const datos = new FormData();
  datos.append('foto', archivo);
  return post(`/admin/embarcaderos/${id}/foto`, datos);
};

function conectarFoto(form) {
  const c = estado.contenedor;
  const inp = c.querySelector('#inp-foto');
  c.querySelector('#btn-subir-foto').addEventListener('click', () => inp.click());

  inp.addEventListener('change', async () => {
    const archivo = inp.files[0];
    inp.value = ''; // permite volver a elegir el mismo archivo
    if (!archivo) return;
    if (!TIPOS_FOTO.includes(archivo.type)) return toast('La foto debe ser JPG, PNG o WEBP.', 'error');
    if (archivo.size > MAX_FOTO) return toast('La foto supera el máximo de 5 MB.', 'error');

    if (!estado.editandoId) {
      estado.foto.pendiente = archivo;
      return pintarFoto();
    }
    try {
      const actualizado = await conCarga(c.querySelector('#btn-subir-foto'), () =>
        subirFoto(estado.editandoId, archivo),
      );
      reemplazarEnLista(actualizado);
      mostrarFoto(actualizado.fotoUrl);
      toast('Foto subida (reducida a 1280 px, en WEBP y sin datos de ubicación).', 'exito');
    } catch (error) {
      mostrarError(error);
    }
  });

  c.querySelector('#btn-quitar-foto').addEventListener('click', async (e) => {
    if (estado.foto.pendiente) {
      estado.foto.pendiente = null;
      return pintarFoto();
    }
    if (!confirm('¿Quitar la foto de este embarcadero?')) return;
    try {
      const actualizado = await conCarga(e.currentTarget, () =>
        del(`/admin/embarcaderos/${estado.editandoId}/foto`),
      );
      reemplazarEnLista(actualizado);
      mostrarFoto(null);
      toast('Foto quitada.', 'exito');
    } catch (error) {
      mostrarError(error);
    }
  });

  // Vista previa de la URL pegada
  form.fotoUrl.addEventListener('change', () => pintarFoto());
  mostrarFoto(null);
}

function reemplazarEnLista(emb) {
  estado.lista = estado.lista.map((x) => (x.id === emb.id ? emb : x));
}

// Carga en el formulario la foto guardada del embarcadero (o ninguna)
function mostrarFoto(fotoUrl) {
  const form = estado.contenedor.querySelector('#form-embarcadero');
  const pegada = fotoUrl && !esFotoSubida(fotoUrl) ? fotoUrl : '';
  if (estado.foto?.objetoUrl) URL.revokeObjectURL(estado.foto.objetoUrl);
  estado.foto = { guardada: fotoUrl ?? null, pendiente: null, urlInicial: pegada };
  form.fotoUrl.value = pegada;
  estado.contenedor.querySelector('#det-foto-url').open = !!pegada;
  pintarFoto();
}

function pintarFoto() {
  const c = estado.contenedor;
  const vista = c.querySelector('#foto-vista');
  const { guardada, pendiente } = estado.foto;
  const pegada = c.querySelector('#form-embarcadero').fotoUrl.value.trim();

  if (estado.foto.objetoUrl) URL.revokeObjectURL(estado.foto.objetoUrl);
  estado.foto.objetoUrl = pendiente ? URL.createObjectURL(pendiente) : null;
  const src = estado.foto.objetoUrl ?? (pegada || (esFotoSubida(guardada) ? guardada : null));

  vista.replaceChildren();
  if (src) {
    const img = document.createElement('img');
    img.alt = 'Vista previa de la foto';
    img.src = src;
    img.onerror = () => vista.replaceChildren(Object.assign(document.createElement('span'), { textContent: 'No se pudo cargar' }));
    vista.append(img);
  } else {
    vista.append(Object.assign(document.createElement('span'), { textContent: 'Sin foto' }));
  }

  const hayFoto = !!(pendiente || guardada);
  c.querySelector('#btn-quitar-foto').hidden = !(pendiente || (estado.editandoId && guardada));
  c.querySelector('#btn-subir-foto').textContent = hayFoto ? '📷 Cambiar foto' : '📷 Subir foto';
  c.querySelector('#foto-estado').textContent = pendiente
    ? `${pendiente.name} · se subirá al crear el embarcadero`
    : esFotoSubida(guardada)
      ? 'Foto subida a EASYBUS'
      : '';
}

// ---------- Acciones ----------

function editar(emb) {
  const form = estado.contenedor.querySelector('#form-embarcadero');
  estado.editandoId = emb.id;
  form.nombre.value = emb.nombre;
  form.referencia.value = emb.referencia ?? '';
  form.latitud.value = emb.latitud;
  form.longitud.value = emb.longitud;
  form.estado.value = emb.estado;
  form.tipo.value = emb.tipo;
  form.margen.value = emb.margen ?? '';
  for (const campo of CAMPOS_SI_NO) form[campo].value = emb[campo] === null ? '' : String(emb[campo]);
  form.esOficial.checked = emb.esOficial;
  mostrarFoto(emb.fotoUrl);

  estado.contenedor.querySelector('#titulo-form').textContent = `Editar: ${emb.nombre}`;
  estado.contenedor.querySelector('#btn-guardar').textContent = 'Guardar cambios';
  estado.contenedor.querySelector('#btn-cancelar').hidden = false;
  estado.contenedor.querySelector('#btn-nuevo').hidden = false;

  marcarSeleccion([emb.latitud, emb.longitud], true);
  pintarTabla();
  pintarMapa();
  form.nombre.focus();
}

function limpiarFormulario() {
  const form = estado.contenedor.querySelector('#form-embarcadero');
  form.reset();
  estado.editandoId = null;
  estado.contenedor.querySelector('#titulo-form').textContent = 'Nuevo embarcadero';
  estado.contenedor.querySelector('#btn-guardar').textContent = 'Crear embarcadero';
  estado.contenedor.querySelector('#btn-cancelar').hidden = true;
  estado.contenedor.querySelector('#btn-nuevo').hidden = true;
  estado.marcaSeleccion?.remove();
  estado.marcaSeleccion = null;
  mostrarFoto(null);
  pintarTabla();
  pintarMapa();
}

async function guardar(form) {
  const nombre = form.nombre.value.trim();
  const latitud = parseFloat(form.latitud.value);
  const longitud = parseFloat(form.longitud.value);
  if (!nombre) return toast('Escribe el nombre del embarcadero.', 'error');
  if (!Number.isFinite(latitud) || !Number.isFinite(longitud)) {
    return toast('Indica la ubicación: haz clic en el mapa o escribe latitud y longitud.', 'error');
  }

  const datos = {
    nombre,
    referencia: form.referencia.value.trim() || undefined,
    latitud,
    longitud,
    estado: form.estado.value,
    tipo: form.tipo.value,
    margen: form.margen.value || null,
    esOficial: form.esOficial.checked,
  };
  // La URL pegada solo se envía si cambió (una foto subida no aparece en ese campo)
  const url = form.fotoUrl.value.trim();
  if (estado.editandoId ? url !== estado.foto.urlInicial : url && !estado.foto.pendiente) {
    datos.fotoUrl = url || null;
  }
  // Accesibilidad: "" = sin dato (null), "true"/"false" = sí/no
  for (const campo of CAMPOS_SI_NO) datos[campo] = form[campo].value === '' ? null : form[campo].value === 'true';

  const boton = estado.contenedor.querySelector('#btn-guardar');
  try {
    await conCarga(boton, async () => {
      if (estado.editandoId) {
        const actualizado = await patch(`/admin/embarcaderos/${estado.editandoId}`, datos);
        estado.lista = estado.lista.map((x) => (x.id === actualizado.id ? actualizado : x));
        toast(`Embarcadero "${actualizado.nombre}" actualizado.`, 'exito');
      } else {
        let creado = await post('/admin/embarcaderos', datos);
        // La foto elegida antes de crear se sube ahora que el embarcadero tiene id
        if (estado.foto.pendiente) {
          try {
            creado = await subirFoto(creado.id, estado.foto.pendiente);
          } catch (error) {
            mostrarError(error);
            toast('El embarcadero se creó, pero la foto no se pudo subir. Edítalo para intentarlo de nuevo.', 'error');
          }
        }
        estado.lista = [...estado.lista, creado].sort((a, b) => a.nombre.localeCompare(b.nombre));
        toast(`Embarcadero "${creado.nombre}" creado.`, 'exito');
      }
    });
    limpiarFormulario();
  } catch (error) {
    mostrarError(error);
  }
}

async function eliminar(emb, boton) {
  if (!confirm(`¿Eliminar el embarcadero "${emb.nombre}"?\nEsta acción queda registrada en la auditoría.`)) return;
  try {
    await conCarga(boton, () => del(`/admin/embarcaderos/${emb.id}`));
    estado.lista = estado.lista.filter((x) => x.id !== emb.id);
    if (estado.editandoId === emb.id) limpiarFormulario();
    else {
      pintarTabla();
      pintarMapa();
    }
    toast(`Embarcadero "${emb.nombre}" eliminado.`, 'exito');
  } catch (error) {
    // Ej. 409: está asignado a una ruta
    mostrarError(error);
  }
}
