// Vista "Inicio": cifras generales (GET /admin/resumen) y estado del sistema (GET /health).

import { get } from '../api.js';
import { esc, fechaHora } from '../ui.js';

function cifra(valor, etiqueta, enlace, detalle = '', destacada = false) {
  return `
    <a class="cifra${destacada ? ' destacada' : ''}" href="${enlace}">
      <div class="cifra-valor">${esc(valor)}</div>
      <div class="cifra-etiqueta">${esc(etiqueta)}</div>
      ${detalle ? `<div class="cifra-detalle">${esc(detalle)}</div>` : ''}
    </a>`;
}

export default {
  async render(contenedor) {
    const [resumen, salud] = await Promise.all([
      get('/admin/resumen'),
      get('/health', { publico: true }).catch(() => ({ status: 'error', database: 'down' })),
    ]);

    const apiOk = salud.status === 'ok';
    const bdOk = salud.database === 'up';

    contenedor.innerHTML = `
      <div class="cifras">
        ${cifra(resumen.rutasActivas, 'Rutas activas', '#/rutas', `${resumen.rutas} rutas en total`)}
        ${cifra(resumen.embarcaderosActivos, 'Embarcaderos activos', '#/embarcaderos', `${resumen.embarcaderos} en total`)}
        ${cifra(resumen.embarcacionesOperativas, 'Embarcaciones operativas', '#/embarcaciones', `${resumen.embarcaciones} en total`)}
        ${cifra(resumen.horarios, 'Salidas programadas', '#/horarios', 'Todas las rutas, sentidos y tipos de día')}
        ${cifra(resumen.festivosProximos, 'Festivos próximos', '#/festivos', 'Aplican horario de domingo/festivo')}
        ${cifra(
          resumen.avisosVigentes,
          'Avisos vigentes',
          '#/avisos',
          resumen.suspensionesVigentes > 0
            ? `${resumen.suspensionesVigentes} suspensión(es) en curso`
            : 'Los ven los pasajeros ahora',
          resumen.suspensionesVigentes > 0,
        )}
        ${cifra(resumen.reportesPendientes, 'Reportes pendientes', '#/reportes', 'Enviados por usuarios', resumen.reportesPendientes > 0)}
        ${cifra(resumen.cambiosUltimos7Dias, 'Cambios en 7 días', '#/auditoria', 'Registrados en la auditoría')}
      </div>

      <div class="rejilla-2" style="margin-top:20px">
        <section class="tarjeta">
          <h3 class="tarjeta-titulo">Estado del sistema</h3>
          <ul class="estado-lista">
            <li><span><span class="punto ${apiOk ? 'ok' : 'mal'}"></span>API</span>
                <strong>${apiOk ? 'En línea' : 'Con problemas'}</strong></li>
            <li><span><span class="punto ${bdOk ? 'ok' : 'mal'}"></span>Base de datos PostgreSQL</span>
                <strong>${bdOk ? 'Conectada' : 'Sin conexión'}</strong></li>
            <li><span><span class="punto ${salud.postgis ? 'ok' : 'mal'}"></span>PostGIS</span>
                <strong>${esc(salud.postgis?.split(' ')[0] ?? '—')}</strong></li>
            <li><span>Consultado</span><span>${esc(fechaHora(salud.timestamp))}</span></li>
          </ul>
        </section>

        <section class="tarjeta">
          <h3 class="tarjeta-titulo">Accesos rápidos</h3>
          <div class="fila">
            <a class="btn btn-secundario" href="#/embarcaderos">Gestionar embarcaderos</a>
            <a class="btn btn-secundario" href="#/rutas">Gestionar rutas</a>
            <a class="btn btn-secundario" href="#/horarios">Cargar horarios</a>
            <a class="btn btn-secundario" href="#/pasajero">Ver como pasajero</a>
          </div>
          <p style="color:var(--texto-suave);margin:16px 0 0">
            Cada cambio hecho desde este panel queda registrado en la auditoría con el usuario,
            la fecha y los datos anteriores y nuevos.
          </p>
        </section>
      </div>
      <div class="fila" style="margin-top:20px">
        <button type="button" class="btn btn-secundario" id="btn-actualizar-inicio">Actualizar cifras</button>
      </div>`;

    contenedor.querySelector('#btn-actualizar-inicio').addEventListener('click', () => {
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
  },
};
