// Vista "Horarios": elegir ruta, sentido y tipo de día; ver las horas como chips,
// agregar o quitar una, o reemplazar la lista completa (con generador "cada N minutos").

import { get, post, put, del } from '../api.js';
import { esc, toast, mostrarError, conCarga, TEXTOS } from '../ui.js';

// Se recuerda la selección al cambiar de sección y volver
const seleccion = { rutaId: null, sentido: 'ida', tipoDia: 'laboral' };
let estado = null;

const TIPOS = ['laboral', 'sabado', 'domingo_festivo'];
const HORA = /\b([01]?\d|2[0-3]):([0-5]\d)\b/g;

export default {
  async render(contenedor) {
    const rutas = await get('/admin/rutas');
    estado = { c: contenedor, rutas, datos: null };

    if (rutas.length === 0) {
      contenedor.innerHTML = '<div class="tarjeta vacio">No hay rutas. Crea una en la sección Rutas.</div>';
      return;
    }
    if (!rutas.some((r) => r.id === seleccion.rutaId)) seleccion.rutaId = rutas[0].id;

    contenedor.innerHTML = `
      <section class="tarjeta">
        <div class="form-fila" style="grid-template-columns:2fr 1fr">
          <label>Ruta
            <select id="sel-ruta">
              ${rutas.map((r) => `<option value="${r.id}">${esc(r.codigo)} · ${esc(r.nombre)}${r.estado === 'inactiva' ? ' (inactiva)' : ''}</option>`).join('')}
            </select>
          </label>
          <label>Sentido
            <select id="sel-sentido">
              <option value="ida">Ida</option>
              <option value="vuelta">Vuelta</option>
            </select>
          </label>
        </div>
        <div style="margin-top:16px" class="pestanas" id="pestanas-tipo">
          ${TIPOS.map((t) => `<button type="button" data-tipo="${t}">${TEXTOS.tipoDia[t]}<span class="contador"></span></button>`).join('')}
        </div>
      </section>

      <div id="zona-horarios"></div>`;

    const c = contenedor;
    c.querySelector('#sel-ruta').value = seleccion.rutaId;
    c.querySelector('#sel-sentido').value = seleccion.sentido;
    c.querySelector('#sel-ruta').addEventListener('change', (e) => {
      seleccion.rutaId = e.target.value;
      cargar();
    });
    c.querySelector('#sel-sentido').addEventListener('change', (e) => {
      seleccion.sentido = e.target.value;
      cargar();
    });
    c.querySelector('#pestanas-tipo').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-tipo]');
      if (!b) return;
      seleccion.tipoDia = b.dataset.tipo;
      pintar();
    });

    await cargar();
  },
  alSalir() {
    estado = null;
  },
};

// Trae TODAS las horas del sentido (los tres tipos de día) y filtra en pantalla
async function cargar() {
  const zona = estado.c.querySelector('#zona-horarios');
  zona.innerHTML = '<div class="cargando">Cargando horarios…</div>';
  try {
    estado.datos = await get(`/admin/rutas/${seleccion.rutaId}/sentidos/${seleccion.sentido}/horarios`);
    pintar();
  } catch (error) {
    estado.datos = null;
    if (error.status === 404) {
      zona.innerHTML = `
        <div class="tarjeta vacio">
          Esta ruta todavía no tiene configurado el sentido <strong>${esc(seleccion.sentido)}</strong>.<br><br>
          <a class="btn btn-primario" href="#/rutas/${seleccion.rutaId}">Configurar la ruta</a>
        </div>`;
      pintarContadores();
    } else {
      zona.innerHTML = `<div class="mensaje-error">${esc(error.message)}</div>`;
    }
  }
}

function pintarContadores() {
  estado.c.querySelectorAll('#pestanas-tipo button').forEach((b) => {
    const n = estado.datos ? estado.datos.horarios.filter((h) => h.tipoDia === b.dataset.tipo).length : 0;
    b.classList.toggle('activa', b.dataset.tipo === seleccion.tipoDia);
    b.querySelector('.contador').textContent = estado.datos ? `(${n})` : '';
  });
}

function pintar() {
  pintarContadores();
  if (!estado.datos) return;
  const horas = estado.datos.horarios.filter((h) => h.tipoDia === seleccion.tipoDia);
  const zona = estado.c.querySelector('#zona-horarios');

  zona.innerHTML = `
    <div class="rejilla-2" style="margin-top:20px">
      <section class="tarjeta">
        <h3 class="tarjeta-titulo">
          ${horas.length} salida(s) · ${TEXTOS.sentido[seleccion.sentido]} → ${esc(estado.datos.destino)} · ${TEXTOS.tipoDia[seleccion.tipoDia]}
        </h3>
        <div class="chips" id="chips">
          ${
            horas.length
              ? horas.map((h) => `<span class="chip">${h.horaSalida}<button type="button" data-id="${h.id}" data-hora="${h.horaSalida}" title="Quitar">✕</button></span>`).join('')
              : '<span class="texto-suave">No hay salidas para este tipo de día.</span>'
          }
        </div>
        <form id="form-una" class="fila" style="margin-top:18px">
          <label style="flex:1">Agregar una hora
            <input type="time" name="hora" step="60" required />
          </label>
          <button type="submit" class="btn btn-primario" style="align-self:end">Agregar</button>
        </form>
      </section>

      <section class="tarjeta">
        <h3 class="tarjeta-titulo">Reemplazar la lista completa</h3>
        <div class="form">
          <label>Horas <span class="ayuda">(separadas por coma, espacio o salto de línea)</span>
            <textarea id="txt-horas" rows="5">${horas.map((h) => h.horaSalida).join(', ')}</textarea>
          </label>
          <div class="ayuda">Generador rápido:</div>
          <div class="fila">
            <label>Desde <input type="time" id="gen-desde" value="05:30" /></label>
            <label>Hasta <input type="time" id="gen-hasta" value="19:00" /></label>
            <label>Cada (min) <input type="number" id="gen-cada" value="30" min="5" max="240" style="width:90px" /></label>
            <button type="button" class="btn btn-secundario" id="btn-generar" style="align-self:end">Generar</button>
          </div>
          <div class="fila">
            <button type="button" class="btn btn-primario" id="btn-reemplazar">Reemplazar lista</button>
          </div>
        </div>
      </section>
    </div>`;

  const ruta = () => `/admin/rutas/${seleccion.rutaId}/sentidos/${seleccion.sentido}/horarios`;

  zona.querySelector('#chips').addEventListener('click', async (e) => {
    const b = e.target.closest('button[data-id]');
    if (!b) return;
    try {
      await del(`/admin/horarios/${b.dataset.id}`);
      toast(`Salida de las ${b.dataset.hora} eliminada.`, 'exito');
      await cargar();
    } catch (error) {
      mostrarError(error);
    }
  });

  zona.querySelector('#form-una').addEventListener('submit', async (e) => {
    e.preventDefault();
    const hora = e.currentTarget.hora.value;
    if (!hora) return toast('Elige una hora.', 'error');
    try {
      await conCarga(e.currentTarget.querySelector('button'), () =>
        post(ruta(), { tipoDia: seleccion.tipoDia, horaSalida: hora }),
      );
      toast(`Salida de las ${hora} agregada.`, 'exito');
      await cargar();
    } catch (error) {
      mostrarError(error);
    }
  });

  zona.querySelector('#btn-generar').addEventListener('click', () => {
    const aMin = (h) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));
    const desde = zona.querySelector('#gen-desde').value;
    const hasta = zona.querySelector('#gen-hasta').value;
    const cada = Number(zona.querySelector('#gen-cada').value);
    if (!desde || !hasta || !(cada >= 5)) return toast('Revisa los valores del generador.', 'error');
    const lista = [];
    for (let m = aMin(desde); m <= aMin(hasta); m += cada) {
      lista.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
    }
    zona.querySelector('#txt-horas').value = lista.join(', ');
    toast(`Se generaron ${lista.length} horas. Revisa y presiona "Reemplazar lista".`);
  });

  zona.querySelector('#btn-reemplazar').addEventListener('click', async (e) => {
    const texto = zona.querySelector('#txt-horas').value;
    const horasNuevas = [...new Set([...texto.matchAll(HORA)].map((m) => `${m[1].padStart(2, '0')}:${m[2]}`))];
    const msg =
      `Se reemplazarán las ${horas.length} salida(s) de "${TEXTOS.tipoDia[seleccion.tipoDia]}" ` +
      `por ${horasNuevas.length} salida(s). ¿Continuar?`;
    if (!confirm(msg)) return;
    try {
      await conCarga(e.currentTarget, () => put(`${ruta()}/${seleccion.tipoDia}`, { horas: horasNuevas }));
      toast(`Lista reemplazada: ${horasNuevas.length} salida(s).`, 'exito');
      await cargar();
    } catch (error) {
      mostrarError(error);
    }
  });
}
