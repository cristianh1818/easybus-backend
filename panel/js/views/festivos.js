// Vista "Festivos": lista por año, agregar y quitar.
// Un festivo hace que ese día se use el horario de domingo/festivo.

import { get, post, del } from '../api.js';
import { esc, toast, mostrarError, conCarga, fechaLarga } from '../ui.js';

let anioElegido = null;

const anioActualBogota = () =>
  Number(new Intl.DateTimeFormat('en', { timeZone: 'America/Bogota', year: 'numeric' }).format(new Date()));

export default {
  async render(c) {
    const actual = anioActualBogota();
    anioElegido ??= actual;

    c.innerHTML = `
      <div class="rejilla-2">
        <section class="tarjeta">
          <div class="fila fila-entre" style="margin-bottom:12px">
            <h3 class="tarjeta-titulo" style="margin:0">Festivos registrados</h3>
            <select id="sel-anio">
              ${[actual - 1, actual, actual + 1].map((a) => `<option value="${a}">${a}</option>`).join('')}
            </select>
          </div>
          <div class="tabla-contenedor">
            <table class="tabla">
              <thead><tr><th>Fecha</th><th>Nombre</th><th></th></tr></thead>
              <tbody id="tbody-festivos"></tbody>
            </table>
          </div>
        </section>

        <section class="tarjeta">
          <form id="form-festivo" class="form">
            <h3 class="tarjeta-titulo" style="margin:0">Agregar festivo</h3>
            <label>Fecha <input type="date" name="fecha" required /></label>
            <label>Nombre <input name="nombre" required maxlength="120" placeholder="Ej. Día de la Independencia" /></label>
            <div><button type="submit" class="btn btn-primario">Agregar festivo</button></div>
            <p class="ayuda" style="margin:0">
              Ese día la próxima salida se calcula con el horario de <strong>domingo/festivo</strong>.
            </p>
          </form>
        </section>
      </div>`;

    const sel = c.querySelector('#sel-anio');
    sel.value = anioElegido;
    sel.addEventListener('change', () => {
      anioElegido = Number(sel.value);
      cargar(c);
    });

    c.querySelector('#form-festivo').addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      const datos = { fecha: form.fecha.value, nombre: form.nombre.value.trim() };
      if (!datos.fecha || !datos.nombre) return toast('Fecha y nombre son obligatorios.', 'error');
      try {
        await conCarga(form.querySelector('button'), () => post('/admin/festivos', datos));
        toast(`Festivo "${datos.nombre}" agregado.`, 'exito');
        form.reset();
        anioElegido = Number(datos.fecha.slice(0, 4));
        if ([...sel.options].some((o) => Number(o.value) === anioElegido)) sel.value = anioElegido;
        await cargar(c);
      } catch (error) {
        mostrarError(error);
      }
    });

    c.querySelector('#tbody-festivos').addEventListener('click', async (e) => {
      const b = e.target.closest('button[data-fecha]');
      if (!b || !confirm(`¿Quitar el festivo del ${fechaLarga(b.dataset.fecha)}?`)) return;
      try {
        await conCarga(b, () => del(`/admin/festivos/${b.dataset.fecha}`));
        toast('Festivo eliminado.', 'exito');
        await cargar(c);
      } catch (error) {
        mostrarError(error);
      }
    });

    await cargar(c);
  },
};

async function cargar(c) {
  const tbody = c.querySelector('#tbody-festivos');
  const lista = await get(`/admin/festivos?anio=${anioElegido}`);
  tbody.innerHTML = lista.length
    ? lista
        .map(
          (f) => `
        <tr>
          <td style="text-transform:capitalize">${esc(fechaLarga(f.fecha))}</td>
          <td>${esc(f.nombre)}</td>
          <td class="acciones"><button class="btn btn-peligro btn-chico" data-fecha="${f.fecha}">Quitar</button></td>
        </tr>`,
        )
        .join('')
    : `<tr><td colspan="3" class="vacio">No hay festivos registrados en ${anioElegido}.</td></tr>`;
}
