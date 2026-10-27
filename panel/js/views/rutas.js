// Vista "Rutas" con dos modos:
//   #/rutas        -> lista de rutas + formulario de crear/editar + activar/desactivar
//   #/rutas/{id}   -> detalle: sentidos ida/vuelta, destino, secuencia de embarcaderos
//                     (subir/bajar) y trazado dibujado con clics en el mapa

import { get, post, patch, put, del } from '../api.js';
import { esc, toast, mostrarError, conCarga, TEXTOS } from '../ui.js';
import { crearMapa, punto, puntoNumerado, encuadrar, aLatLng, aLngLat, COLORES } from '../mapa.js';

let estado = null;
let ultimoSentido = 'ida'; // se recuerda al volver a abrir una ruta

const idDesdeHash = () => location.hash.replace(/^#\/?/, '').split('/')[1] || null;
const etiquetaEstado = (e) =>
  e === 'activa' ? '<span class="etiqueta ok">Activa</span>' : '<span class="etiqueta mal">Inactiva</span>';

export default {
  async render(contenedor) {
    estado = { c: contenedor, mapa: null };
    const id = idDesdeHash();
    if (id) await renderDetalle(id);
    else await renderLista();
  },
  alMostrar() {
    if (estado?.modo === 'detalle') iniciarMapa();
  },
  alSalir() {
    estado?.mapa?.remove();
    estado = null;
  },
};

// =====================================================================
//  MODO LISTA
// =====================================================================

async function renderLista() {
  estado.modo = 'lista';
  estado.rutas = await get('/admin/rutas');
  estado.editandoId = null;
  const { c } = estado;

  c.innerHTML = `
    <section class="tarjeta">
      <form id="form-ruta" class="form" novalidate>
        <div class="form-titulo">
          <h3 class="tarjeta-titulo" id="titulo-form-ruta" style="margin:0">Nueva ruta</h3>
        </div>
        <div class="form-fila">
          <label>Código <span class="ayuda">(único, ej. BS-3)</span>
            <input name="codigo" required maxlength="20" placeholder="BS-3" />
          </label>
          <label>Nombre
            <input name="nombre" required maxlength="120" placeholder="Ej. Norte – Centro" />
          </label>
        </div>
        <label>Descripción <span class="ayuda">(opcional)</span>
          <textarea name="descripcion" rows="2" placeholder="Recorrido, observaciones…"></textarea>
        </label>
        <div class="form-fila">
          <label>Color en el mapa
            <input name="color" type="color" value="#2a64b8" style="height:44px;padding:4px" />
          </label>
          <label>Estado
            <select name="estado">
              <option value="activa">Activa</option>
              <option value="inactiva">Inactiva</option>
            </select>
          </label>
        </div>
        <label class="check"><input type="checkbox" name="esOficial" /> Dato oficial (verificado con el operador)</label>
        <div class="fila">
          <button type="submit" class="btn btn-primario" id="btn-guardar-ruta">Crear ruta</button>
          <button type="button" class="btn btn-secundario" id="btn-cancelar-ruta" hidden>Cancelar edición</button>
        </div>
      </form>
    </section>

    <section class="tarjeta">
      <h3 class="tarjeta-titulo">Rutas registradas (${estado.rutas.length})</h3>
      <div class="tabla-contenedor">
        <table class="tabla">
          <thead><tr><th>Código</th><th>Nombre</th><th>Sentidos</th><th>Estado</th><th>Oficial</th><th></th></tr></thead>
          <tbody id="tbody-rutas"></tbody>
        </table>
      </div>
    </section>`;

  const form = c.querySelector('#form-ruta');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    guardarRuta(form);
  });
  c.querySelector('#btn-cancelar-ruta').addEventListener('click', () => limpiarFormRuta());
  c.querySelector('#tbody-rutas').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-accion]');
    if (!b) return;
    const ruta = estado.rutas.find((r) => r.id === b.dataset.id);
    if (b.dataset.accion === 'editar') editarRuta(ruta);
    if (b.dataset.accion === 'estado') cambiarEstado(ruta, b);
  });
  pintarTablaRutas();
}

function pintarTablaRutas() {
  const tbody = estado.c.querySelector('#tbody-rutas');
  if (estado.rutas.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="vacio">No hay rutas. Crea la primera con el formulario.</td></tr>';
    return;
  }
  tbody.innerHTML = estado.rutas
    .map((r) => {
      const sentidos = ['ida', 'vuelta']
        .map((s) => {
          const x = r.sentidos.find((y) => y.sentido === s);
          return `<div>${TEXTOS.sentido[s]}: ${x ? `→ ${esc(x.destino)}` : '<span class="texto-suave">sin configurar</span>'}</div>`;
        })
        .join('');
      return `
        <tr class="${r.id === estado.editandoId ? 'seleccionada' : ''}">
          <td><span class="swatch" style="background:${esc(r.color ?? '#999')}"></span><strong>${esc(r.codigo)}</strong></td>
          <td>${esc(r.nombre)}</td>
          <td style="font-size:.92rem">${sentidos}</td>
          <td>${etiquetaEstado(r.estado)}</td>
          <td>${r.esOficial ? '<span class="etiqueta ok">Sí</span>' : '<span class="etiqueta aviso">No oficial</span>'}</td>
          <td class="acciones">
            <a class="btn btn-primario btn-chico" href="#/rutas/${r.id}">Abrir</a>
            <button class="btn btn-secundario btn-chico" data-accion="editar" data-id="${r.id}">Editar</button>
            <button class="btn btn-secundario btn-chico" data-accion="estado" data-id="${r.id}">
              ${r.estado === 'activa' ? 'Desactivar' : 'Activar'}
            </button>
          </td>
        </tr>`;
    })
    .join('');
}

function editarRuta(r) {
  const form = estado.c.querySelector('#form-ruta');
  estado.editandoId = r.id;
  form.codigo.value = r.codigo;
  form.nombre.value = r.nombre;
  form.descripcion.value = r.descripcion ?? '';
  form.color.value = r.color ?? '#2a64b8';
  form.estado.value = r.estado;
  form.esOficial.checked = r.esOficial;
  estado.c.querySelector('#titulo-form-ruta').textContent = `Editar ruta ${r.codigo}`;
  estado.c.querySelector('#btn-guardar-ruta').textContent = 'Guardar cambios';
  estado.c.querySelector('#btn-cancelar-ruta').hidden = false;
  pintarTablaRutas();
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  form.nombre.focus();
}

function limpiarFormRuta() {
  const form = estado.c.querySelector('#form-ruta');
  form.reset();
  estado.editandoId = null;
  estado.c.querySelector('#titulo-form-ruta').textContent = 'Nueva ruta';
  estado.c.querySelector('#btn-guardar-ruta').textContent = 'Crear ruta';
  estado.c.querySelector('#btn-cancelar-ruta').hidden = true;
  pintarTablaRutas();
}

async function guardarRuta(form) {
  const datos = {
    codigo: form.codigo.value.trim(),
    nombre: form.nombre.value.trim(),
    descripcion: form.descripcion.value.trim() || undefined,
    color: form.color.value,
    estado: form.estado.value,
    esOficial: form.esOficial.checked,
  };
  if (!datos.codigo || !datos.nombre) return toast('Código y nombre son obligatorios.', 'error');

  try {
    await conCarga(estado.c.querySelector('#btn-guardar-ruta'), async () => {
      if (estado.editandoId) {
        const r = await patch(`/admin/rutas/${estado.editandoId}`, datos);
        toast(`Ruta ${r.codigo} actualizada.`, 'exito');
        estado.rutas = await get('/admin/rutas');
        limpiarFormRuta();
      } else {
        const r = await post('/admin/rutas', datos);
        toast(`Ruta ${r.codigo} creada. Ahora configura sus sentidos.`, 'exito');
        location.hash = `#/rutas/${r.id}`; // abrir el detalle para seguir configurándola
      }
    });
  } catch (error) {
    mostrarError(error);
  }
}

async function cambiarEstado(r, boton) {
  const nuevo = r.estado === 'activa' ? 'inactiva' : 'activa';
  try {
    await conCarga(boton, () => patch(`/admin/rutas/${r.id}`, { estado: nuevo }));
    r.estado = nuevo;
    toast(`Ruta ${r.codigo} ${nuevo === 'activa' ? 'activada' : 'desactivada'}.`, 'exito');
    pintarTablaRutas();
  } catch (error) {
    mostrarError(error);
  }
}

// =====================================================================
//  MODO DETALLE
// =====================================================================

async function renderDetalle(id) {
  estado.modo = 'detalle';
  const [ruta, embarcaderos] = await Promise.all([get(`/admin/rutas/${id}`), get('/admin/embarcaderos')]);
  Object.assign(estado, { ruta, embarcaderos, sentido: ultimoSentido, capas: [] });
  cargarSentidoEnEstado();

  estado.c.innerHTML = `
    <section class="tarjeta" id="cabecera-ruta"></section>

    <div class="fila fila-entre" style="margin:20px 0 12px">
      <div class="pestanas" id="pestanas-sentido">
        <button type="button" data-sentido="ida">Ida</button>
        <button type="button" data-sentido="vuelta">Vuelta</button>
      </div>
      <span id="aviso-sin-guardar" class="sin-guardar" hidden>● Hay cambios sin guardar</span>
    </div>

    <div class="rejilla-mapa">
      <section class="tarjeta" id="tarjeta-trazado">
        <div class="fila fila-entre" style="margin-bottom:10px">
          <h3 class="tarjeta-titulo" style="margin:0">Trazado del recorrido</h3>
          <span class="ayuda" id="info-puntos"></span>
        </div>
        <div id="mapa-ruta" class="mapa mapa-click"></div>
        <div class="mapa-leyenda">
          <span style="--c:${COLORES.activo}">Embarcaderos del sentido (con su orden)</span>
          <span style="--c:${COLORES.inactivo}">Otros embarcaderos</span>
          <span style="--c:${COLORES.seleccion}">Puntos del trazado</span>
        </div>
        <p class="ayuda" style="margin:10px 0">Haz clic sobre el río para agregar puntos en el orden del recorrido.</p>
        <div class="fila">
          <button type="button" class="btn btn-secundario btn-chico" id="btn-deshacer">↶ Deshacer último punto</button>
          <button type="button" class="btn btn-secundario btn-chico" id="btn-limpiar">Limpiar</button>
          <button type="button" class="btn btn-secundario btn-chico" id="btn-seguir">Unir embarcaderos en orden</button>
          <button type="button" class="btn btn-primario btn-chico" id="btn-guardar-trazado">Guardar trazado</button>
        </div>
      </section>

      <div>
        <section class="tarjeta">
          <form id="form-sentido" class="form" novalidate>
            <h3 class="tarjeta-titulo" style="margin:0" id="titulo-sentido"></h3>
            <label>Destino <span class="ayuda">(hacia dónde va este sentido)</span>
              <input name="destino" maxlength="120" required placeholder="Ej. Embarcadero Centro" />
            </label>
            <div class="fila">
              <button type="submit" class="btn btn-primario" id="btn-guardar-sentido"></button>
              <button type="button" class="btn btn-peligro" id="btn-eliminar-sentido" hidden>Eliminar sentido</button>
            </div>
          </form>
        </section>

        <section class="tarjeta" id="tarjeta-secuencia">
          <h3 class="tarjeta-titulo">Embarcaderos en orden</h3>
          <ol class="lista-orden" id="lista-secuencia"></ol>
          <div class="fila" style="margin-bottom:12px">
            <select id="sel-agregar" style="flex:1;min-width:180px"></select>
            <button type="button" class="btn btn-secundario" id="btn-agregar">Agregar</button>
          </div>
          <div class="fila">
            <button type="button" class="btn btn-primario" id="btn-guardar-secuencia">Guardar orden</button>
            <button type="button" class="btn btn-secundario" id="btn-invertir">Copiar inverso del otro sentido</button>
          </div>
        </section>
      </div>
    </div>`;

  conectarEventosDetalle();
  pintarCabecera();
  pintarSentido();
}

// Copia en el estado el destino, la secuencia y el trazado del sentido elegido
function cargarSentidoEnEstado() {
  const s = estado.ruta.sentidos.find((x) => x.sentido === estado.sentido) ?? null;
  estado.sentidoActual = s;
  estado.secuencia = s ? s.embarcaderos.map((e) => e.id) : [];
  estado.puntos = s?.trazado ? s.trazado.coordinates.map((p) => [...p]) : [];
  estado.sucioSecuencia = false;
  estado.sucioTrazado = false;
}

function pintarCabecera() {
  const r = estado.ruta;
  estado.c.querySelector('#cabecera-ruta').innerHTML = `
    <div class="fila fila-entre">
      <div>
        <a href="#/rutas" class="ayuda">← Volver a rutas</a>
        <h3 style="font-size:1.4rem;margin-top:6px;color:var(--rio-800)">
          <span class="swatch" style="background:${esc(r.color ?? '#999')}"></span>${esc(r.codigo)} · ${esc(r.nombre)}
        </h3>
        <div class="fila" style="margin-top:6px">
          ${etiquetaEstado(r.estado)}
          ${r.esOficial ? '<span class="etiqueta ok">Oficial</span>' : '<span class="etiqueta aviso">No oficial</span>'}
        </div>
        ${r.descripcion ? `<p class="texto-suave" style="margin:10px 0 0">${esc(r.descripcion)}</p>` : ''}
      </div>
      <div class="fila">
        <button type="button" class="btn btn-secundario" id="btn-estado-ruta">${r.estado === 'activa' ? 'Desactivar' : 'Activar'}</button>
        <button type="button" class="btn btn-peligro" id="btn-eliminar-ruta">Eliminar ruta</button>
      </div>
    </div>`;

  estado.c.querySelector('#btn-estado-ruta').addEventListener('click', async (e) => {
    const nuevo = r.estado === 'activa' ? 'inactiva' : 'activa';
    try {
      await conCarga(e.currentTarget, () => patch(`/admin/rutas/${r.id}`, { estado: nuevo }));
      r.estado = nuevo;
      toast(`Ruta ${nuevo === 'activa' ? 'activada' : 'desactivada'}.`, 'exito');
      pintarCabecera();
    } catch (error) {
      mostrarError(error);
    }
  });
  estado.c.querySelector('#btn-eliminar-ruta').addEventListener('click', async (e) => {
    if (!confirm(`¿Eliminar la ruta ${r.codigo}?\nSe borrarán también sus sentidos, secuencias y horarios.`)) return;
    try {
      await conCarga(e.currentTarget, () => del(`/admin/rutas/${r.id}`));
      toast(`Ruta ${r.codigo} eliminada.`, 'exito');
      location.hash = '#/rutas';
    } catch (error) {
      mostrarError(error);
    }
  });
}

function conectarEventosDetalle() {
  const { c } = estado;

  c.querySelector('#pestanas-sentido').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-sentido]');
    if (!b || b.dataset.sentido === estado.sentido) return;
    if ((estado.sucioSecuencia || estado.sucioTrazado) && !confirm('Hay cambios sin guardar. ¿Descartarlos?')) return;
    estado.sentido = ultimoSentido = b.dataset.sentido;
    cargarSentidoEnEstado();
    pintarSentido();
    encuadrarSentido();
  });

  // --- Destino del sentido ---
  c.querySelector('#form-sentido').addEventListener('submit', async (e) => {
    e.preventDefault();
    const destino = e.currentTarget.destino.value.trim();
    if (!destino) return toast('Escribe el destino del sentido.', 'error');
    try {
      const s = await conCarga(c.querySelector('#btn-guardar-sentido'), () =>
        put(`/admin/rutas/${estado.ruta.id}/sentidos/${estado.sentido}`, { destino }),
      );
      actualizarSentidoEnRuta(s);
      toast(`Sentido ${TEXTOS.sentido[estado.sentido].toLowerCase()} guardado.`, 'exito');
      const sucios = { s: estado.sucioSecuencia, t: estado.sucioTrazado };
      estado.sentidoActual = s;
      Object.assign(estado, { sucioSecuencia: sucios.s, sucioTrazado: sucios.t });
      pintarSentido();
    } catch (error) {
      mostrarError(error);
    }
  });

  c.querySelector('#btn-eliminar-sentido').addEventListener('click', async (e) => {
    if (!confirm(`¿Eliminar el sentido ${estado.sentido}? Se borrarán su secuencia, trazado y horarios.`)) return;
    try {
      await conCarga(e.currentTarget, () => del(`/admin/rutas/${estado.ruta.id}/sentidos/${estado.sentido}`));
      estado.ruta.sentidos = estado.ruta.sentidos.filter((s) => s.sentido !== estado.sentido);
      cargarSentidoEnEstado();
      pintarSentido();
      toast('Sentido eliminado.', 'exito');
    } catch (error) {
      mostrarError(error);
    }
  });

  // --- Secuencia de embarcaderos ---
  c.querySelector('#lista-secuencia').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-mover]');
    if (!b) return;
    const i = Number(b.dataset.i);
    const seq = estado.secuencia;
    if (b.dataset.mover === 'subir' && i > 0) [seq[i - 1], seq[i]] = [seq[i], seq[i - 1]];
    if (b.dataset.mover === 'bajar' && i < seq.length - 1) [seq[i + 1], seq[i]] = [seq[i], seq[i + 1]];
    if (b.dataset.mover === 'quitar') seq.splice(i, 1);
    estado.sucioSecuencia = true;
    pintarSecuencia();
    pintarMapaSentido();
  });

  c.querySelector('#btn-agregar').addEventListener('click', () => {
    const id = c.querySelector('#sel-agregar').value;
    if (!id) return;
    estado.secuencia.push(id);
    estado.sucioSecuencia = true;
    pintarSecuencia();
    pintarMapaSentido();
  });

  c.querySelector('#btn-invertir').addEventListener('click', () => {
    const otro = estado.sentido === 'ida' ? 'vuelta' : 'ida';
    const s = estado.ruta.sentidos.find((x) => x.sentido === otro);
    if (!s || s.embarcaderos.length === 0) return toast(`El sentido ${otro} no tiene embarcaderos asignados.`, 'error');
    estado.secuencia = s.embarcaderos.map((e) => e.id).reverse();
    if (s.trazado && estado.puntos.length === 0) {
      estado.puntos = s.trazado.coordinates.map((p) => [...p]).reverse();
      estado.sucioTrazado = true;
    }
    estado.sucioSecuencia = true;
    pintarSecuencia();
    pintarMapaSentido();
    toast(`Se copió el orden inverso del sentido ${otro}. Recuerda guardar.`);
  });

  c.querySelector('#btn-guardar-secuencia').addEventListener('click', async (e) => {
    try {
      const s = await conCarga(e.currentTarget, () =>
        put(`/admin/rutas/${estado.ruta.id}/sentidos/${estado.sentido}/embarcaderos`, {
          embarcaderoIds: estado.secuencia,
        }),
      );
      actualizarSentidoEnRuta(s);
      estado.sucioSecuencia = false;
      pintarSentido();
      toast('Orden de embarcaderos guardado.', 'exito');
    } catch (error) {
      mostrarError(error);
    }
  });

  // --- Trazado ---
  c.querySelector('#btn-deshacer').addEventListener('click', () => {
    if (estado.puntos.pop()) {
      estado.sucioTrazado = true;
      pintarMapaSentido();
    }
  });
  c.querySelector('#btn-limpiar').addEventListener('click', () => {
    if (estado.puntos.length && confirm('¿Borrar todos los puntos del trazado?')) {
      estado.puntos = [];
      estado.sucioTrazado = true;
      pintarMapaSentido();
    }
  });
  c.querySelector('#btn-seguir').addEventListener('click', () => {
    const pts = estado.secuencia.map((id) => estado.embarcaderos.find((e) => e.id === id)).filter(Boolean);
    if (pts.length < 2) return toast('Asigna al menos 2 embarcaderos para unirlos.', 'error');
    estado.puntos = pts.map((e) => [e.longitud, e.latitud]);
    estado.sucioTrazado = true;
    pintarMapaSentido();
    toast('Trazado generado uniendo los embarcaderos. Puedes ajustarlo y luego guardarlo.');
  });
  c.querySelector('#btn-guardar-trazado').addEventListener('click', async (e) => {
    if (estado.puntos.length < 2) return toast('El trazado necesita al menos 2 puntos.', 'error');
    try {
      const s = await conCarga(e.currentTarget, () =>
        put(`/admin/rutas/${estado.ruta.id}/sentidos/${estado.sentido}/trazado`, {
          type: 'LineString',
          coordinates: estado.puntos,
        }),
      );
      actualizarSentidoEnRuta(s);
      estado.sucioTrazado = false;
      pintarSentido();
      toast(`Trazado guardado (${estado.puntos.length} puntos) como GeoJSON LineString.`, 'exito');
    } catch (error) {
      mostrarError(error);
    }
  });
}

function actualizarSentidoEnRuta(s) {
  const otros = estado.ruta.sentidos.filter((x) => x.sentido !== s.sentido);
  estado.ruta.sentidos = [...otros, s];
  estado.sentidoActual = s;
}

// Pinta todo lo que depende del sentido seleccionado
function pintarSentido() {
  const { c } = estado;
  const existe = !!estado.sentidoActual;
  const nombre = TEXTOS.sentido[estado.sentido];

  c.querySelectorAll('#pestanas-sentido button').forEach((b) => {
    const s = estado.ruta.sentidos.find((x) => x.sentido === b.dataset.sentido);
    b.classList.toggle('activa', b.dataset.sentido === estado.sentido);
    b.innerHTML = `${TEXTOS.sentido[b.dataset.sentido]}<span class="contador">${s ? `→ ${esc(s.destino)}` : '(sin crear)'}</span>`;
  });

  const form = c.querySelector('#form-sentido');
  form.destino.value = estado.sentidoActual?.destino ?? '';
  c.querySelector('#titulo-sentido').textContent = existe ? `Sentido ${nombre.toLowerCase()}` : `Crear sentido ${nombre.toLowerCase()}`;
  c.querySelector('#btn-guardar-sentido').textContent = existe ? 'Guardar destino' : 'Crear sentido';
  c.querySelector('#btn-eliminar-sentido').hidden = !existe;

  // Sin sentido creado no se puede asignar secuencia ni trazado
  c.querySelector('#tarjeta-secuencia').classList.toggle('bloqueado', !existe);
  c.querySelector('#tarjeta-trazado').querySelectorAll('button').forEach((b) => (b.disabled = !existe));
  c.querySelector('#mapa-ruta').classList.toggle('mapa-click', existe);

  pintarSecuencia();
  pintarMapaSentido();
}

function pintarSecuencia() {
  const { c } = estado;
  const porId = new Map(estado.embarcaderos.map((e) => [e.id, e]));
  const lista = c.querySelector('#lista-secuencia');
  const n = estado.secuencia.length;

  lista.innerHTML = n
    ? estado.secuencia
        .map((id, i) => {
          const e = porId.get(id);
          return `
          <li>
            <span class="orden">${i + 1}</span>
            <span class="nombre">${esc(e?.nombre ?? 'Embarcadero no encontrado')}
              ${e && !e.activo ? '<span class="etiqueta mal">inactivo</span>' : ''}</span>
            <span class="botones">
              <button type="button" class="btn-icono" data-mover="subir" data-i="${i}" title="Subir" ${i === 0 ? 'disabled' : ''}>↑</button>
              <button type="button" class="btn-icono" data-mover="bajar" data-i="${i}" title="Bajar" ${i === n - 1 ? 'disabled' : ''}>↓</button>
              <button type="button" class="btn-icono quitar" data-mover="quitar" data-i="${i}" title="Quitar">✕</button>
            </span>
          </li>`;
        })
        .join('')
    : '<li class="texto-suave" style="justify-content:center">Sin embarcaderos asignados</li>';

  const disponibles = estado.embarcaderos.filter((e) => e.activo && !estado.secuencia.includes(e.id));
  c.querySelector('#sel-agregar').innerHTML = disponibles.length
    ? disponibles.map((e) => `<option value="${e.id}">${esc(e.nombre)}</option>`).join('')
    : '<option value="">No hay más embarcaderos activos</option>';

  actualizarAvisoSinGuardar();
}

function actualizarAvisoSinGuardar() {
  if (!estado?.c) return;
  estado.c.querySelector('#aviso-sin-guardar').hidden = !(estado.sucioSecuencia || estado.sucioTrazado);
  estado.c.querySelector('#info-puntos').textContent = `${estado.puntos.length} punto(s)${estado.sucioTrazado ? ' · sin guardar' : ''}`;
}

// ---------- Mapa del detalle ----------

function iniciarMapa() {
  estado.mapa = crearMapa(estado.c.querySelector('#mapa-ruta'));
  estado.mapa.on('click', (e) => {
    if (!estado.sentidoActual) return toast('Primero crea el sentido con su destino.', 'error');
    estado.puntos.push(aLngLat(e.latlng));
    estado.sucioTrazado = true;
    pintarMapaSentido();
  });
  pintarMapaSentido();
  encuadrarSentido();
}

function pintarMapaSentido() {
  actualizarAvisoSinGuardar();
  if (!estado?.mapa) return;
  const L = window.L;
  estado.capas.forEach((c) => c.remove());
  estado.capas = [];

  // Embarcaderos que no están en la secuencia: grises y pequeños
  for (const e of estado.embarcaderos) {
    if (estado.secuencia.includes(e.id)) continue;
    estado.capas.push(
      punto([e.latitud, e.longitud], { color: COLORES.inactivo, radio: 6, relleno: 0.7, interactivo: false }).addTo(estado.mapa),
    );
  }

  // Línea del trazado y sus vértices
  const color = estado.ruta.color || COLORES.trazado;
  if (estado.puntos.length) {
    const latlngs = estado.puntos.map(aLatLng);
    estado.capas.push(L.polyline(latlngs, { color, weight: 5, opacity: 0.85, interactive: false }).addTo(estado.mapa));
    latlngs.forEach((ll, i) => {
      const ultimo = i === latlngs.length - 1;
      estado.capas.push(
        punto(ll, { color: COLORES.seleccion, radio: ultimo ? 6 : 4, interactivo: false }).addTo(estado.mapa),
      );
    });
  }

  // Embarcaderos de la secuencia, numerados
  estado.secuencia.forEach((id, i) => {
    const e = estado.embarcaderos.find((x) => x.id === id);
    if (e) {
      estado.capas.push(puntoNumerado([e.latitud, e.longitud], i + 1, COLORES.activo, false).addTo(estado.mapa));
    }
  });
}

function encuadrarSentido() {
  if (!estado?.mapa) return;
  const capas = estado.capas.filter((c) => c.getLatLng || c.getBounds);
  if (estado.puntos.length || estado.secuencia.length) encuadrar(estado.mapa, capas);
  else encuadrar(estado.mapa, capas, 14);
}
