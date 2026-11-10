// Vista "Pasajero": simula lo que verá la app móvil. Usa SOLO endpoints públicos
// (las peticiones van sin token): lista de rutas activas, detalle con mapa y próxima salida.

import { get } from '../api.js';
import { esc, toast, fechaHora, TEXTOS } from '../ui.js';
import { crearMapa, puntoNumerado, encuadrar, aLatLng, COLORES } from '../mapa.js';

// desde: id del embarcadero desde el que consulta el pasajero ('' = el primero del sentido)
const seleccion = { rutaId: null, sentido: 'ida', momento: '', desde: '' };

const sumarMinutos = (hhmm, min) => {
  const t = (Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5)) + min) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
};

// Franjas de aviso, en el orden en que llegan de la API (suspendidos primero)
function bannersAvisos(alertas) {
  return alertas
    .map(
      (a) => `
      <div class="banner-aviso ${a.type}">
        <strong>${a.type === 'suspendido' ? '⛔' : a.type === 'retraso' ? '⏱' : 'ⓘ'} ${esc(a.title)}</strong>
        <span>${esc(a.message)}</span>
        <span class="meta">${esc(TEXTOS.tipoAviso[a.type])} · ${esc(TEXTOS.motivoAviso[a.reason])}${
          a.until ? ` · hasta ${esc(fechaHora(a.until))}` : ''
        }</span>
      </div>`,
    )
    .join('');
}
let estado = null;
const publico = { publico: true };

export default {
  async render(c) {
    const rutas = await get('/rutas', publico);
    estado = { c, rutas, mapa: null, capas: [], detalle: null, temporizador: null };
    if (!rutas.some((r) => r.id === seleccion.rutaId)) seleccion.rutaId = rutas[0]?.id ?? null;

    c.innerHTML = `
      <p class="texto-suave" style="margin-top:0">
        Esta vista usa únicamente los endpoints públicos (sin token), como lo hará la app móvil del pasajero.
      </p>
      <div class="rejilla-mapa">
        <section class="tarjeta">
          <div id="mapa-pasajero" class="mapa" style="height:540px"></div>
          <div class="mapa-leyenda">
            <span style="--c:${COLORES.activo}">Embarcaderos en orden de recorrido</span>
            <span style="--c:${COLORES.trazado}">Línea continua: sentido elegido · punteada: sentido contrario</span>
          </div>
        </section>

        <div>
          <section class="tarjeta">
            <h3 class="tarjeta-titulo">Rutas activas</h3>
            <div class="lista-rutas" id="lista-rutas">
              ${
                rutas.length
                  ? rutas
                      .map(
                        (r) => `
                <button type="button" class="ruta-opcion" data-id="${r.id}" style="--c:${esc(r.color ?? COLORES.trazado)}">
                  <strong>${esc(r.codigo)} · ${esc(r.nombre)}</strong>
                  <span class="ayuda">${r.sentidos.map((s) => `${TEXTOS.sentido[s.sentido]} → ${esc(s.destino)}`).join(' · ')}</span>
                </button>`,
                      )
                      .join('')
                  : '<div class="vacio">No hay rutas activas.</div>'
              }
            </div>
          </section>

          <section class="tarjeta" id="tarjeta-salida" ${rutas.length ? '' : 'hidden'}>
            <div class="fila fila-entre" style="margin-bottom:14px">
              <div class="pestanas" id="pestanas-sentido">
                <button type="button" data-sentido="ida">Ida</button>
                <button type="button" data-sentido="vuelta">Vuelta</button>
              </div>
            </div>
            <label class="ayuda" style="font-weight:600;margin-bottom:10px">Desde el embarcadero
              <select id="sel-desde"></select>
            </label>
            <label class="ayuda" style="font-weight:600">Simular fecha y hora <span class="ayuda">(vacío = ahora)</span>
              <div class="fila">
                <input type="datetime-local" id="inp-momento" style="flex:1" />
                <button type="button" class="btn btn-secundario btn-chico" id="btn-ahora">Ahora</button>
              </div>
            </label>
            <div id="zona-avisos" style="margin-top:14px"></div>
            <div id="zona-proxima"></div>
            <div id="zona-horas" style="margin-top:14px"></div>
          </section>
        </div>
      </div>`;

    c.querySelector('#lista-rutas').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-id]');
      if (!b) return;
      seleccion.rutaId = b.dataset.id;
      seleccionarRuta();
    });
    c.querySelector('#pestanas-sentido').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-sentido]');
      if (!b) return;
      seleccion.sentido = b.dataset.sentido;
      pintarMapa();
      cargarProxima();
    });
    c.querySelector('#sel-desde').addEventListener('change', (e) => {
      seleccion.desde = e.target.value;
      pintarMapa();
      cargarProxima();
    });
    const inp = c.querySelector('#inp-momento');
    inp.value = seleccion.momento;
    inp.addEventListener('change', () => {
      seleccion.momento = inp.value;
      cargarProxima();
    });
    c.querySelector('#btn-ahora').addEventListener('click', () => {
      inp.value = seleccion.momento = '';
      cargarProxima();
    });

    // Con la hora real, la próxima salida se actualiza sola cada minuto
    estado.temporizador = setInterval(() => {
      if (!seleccion.momento && estado?.detalle) cargarProxima();
    }, 60_000);
  },

  alMostrar() {
    estado.mapa = crearMapa(estado.c.querySelector('#mapa-pasajero'));
    if (seleccion.rutaId) seleccionarRuta();
  },

  alSalir() {
    if (!estado) return;
    clearInterval(estado.temporizador);
    estado.mapa?.remove();
    estado = null;
  },
};

async function seleccionarRuta() {
  const { c } = estado;
  c.querySelectorAll('.ruta-opcion').forEach((b) => b.classList.toggle('activa', b.dataset.id === seleccion.rutaId));
  try {
    estado.detalle = await get(`/rutas/${seleccion.rutaId}`, publico);
    if (!estado.detalle.sentidos.some((s) => s.sentido === seleccion.sentido)) {
      seleccion.sentido = estado.detalle.sentidos[0]?.sentido ?? 'ida';
    }
    pintarMapa();
    await cargarProxima();
  } catch (error) {
    toast(error.message, 'error');
  }
}

function pintarMapa() {
  if (!estado?.mapa || !estado.detalle) return;
  const L = window.L;
  const d = estado.detalle;
  const color = d.color || COLORES.trazado;

  estado.c.querySelectorAll('#pestanas-sentido button').forEach((b) => {
    const s = d.sentidos.find((x) => x.sentido === b.dataset.sentido);
    b.classList.toggle('activa', b.dataset.sentido === seleccion.sentido);
    b.disabled = !s;
    b.innerHTML = `${TEXTOS.sentido[b.dataset.sentido]}<span class="contador">${s ? `→ ${esc(s.destino)}` : ''}</span>`;
  });

  estado.capas.forEach((x) => x.remove());
  estado.capas = [];

  // Sentido contrario: línea punteada y delgada
  for (const s of d.sentidos) {
    if (s.sentido === seleccion.sentido || !s.trazado) continue;
    estado.capas.push(
      L.polyline(s.trazado.coordinates.map(aLatLng), { color, weight: 3, opacity: 0.45, dashArray: '6 8' }).addTo(estado.mapa),
    );
  }

  const actual = d.sentidos.find((s) => s.sentido === seleccion.sentido);

  // Selector "desde": embarcaderos del sentido elegido (si el anterior no está, vuelve al origen)
  const embs = actual?.embarcaderos ?? [];
  if (!embs.some((e) => e.id === seleccion.desde)) seleccion.desde = '';
  const sel = estado.c.querySelector('#sel-desde');
  sel.innerHTML = embs
    .map(
      (e) =>
        `<option value="${e.orden === 1 ? '' : e.id}">${e.orden}. ${esc(e.nombre)}${
          e.orden === 1 ? ' (origen)' : ` · +${e.minutosDesdeOrigen} min`
        }</option>`,
    )
    .join('');
  sel.value = seleccion.desde;

  if (actual?.trazado) {
    estado.capas.push(
      L.polyline(actual.trazado.coordinates.map(aLatLng), { color, weight: 6, opacity: 0.9 })
        .bindTooltip(`${d.codigo} · ${TEXTOS.sentido[actual.sentido]} → ${actual.destino}`)
        .addTo(estado.mapa),
    );
  }
  for (const e of embs) {
    // El embarcadero desde el que se consulta se resalta en rojo
    const elegido = (seleccion.desde || embs[0]?.id) === e.id;
    const tiempo =
      e.orden === 1
        ? 'Origen del recorrido'
        : `+${e.minutosDesdeOrigen} min desde el origen (${e.tiempoEstimado ? 'estimado' : 'tiempo real'})`;
    estado.capas.push(
      puntoNumerado([e.latitud, e.longitud], e.orden, elegido ? COLORES.seleccion : COLORES.activo)
        .bindPopup(`<strong>${e.orden}. ${esc(e.nombre)}</strong><br>${esc(e.referencia ?? '')}<br><em>${tiempo}</em>`)
        .addTo(estado.mapa),
    );
  }
  encuadrar(estado.mapa, estado.capas);
}

async function cargarProxima() {
  if (!estado?.detalle) return;
  const zona = estado.c.querySelector('#zona-proxima');
  const zonaHoras = estado.c.querySelector('#zona-horas');
  const zonaAvisos = estado.c.querySelector('#zona-avisos');
  const qs = new URLSearchParams({ sentido: seleccion.sentido });
  if (seleccion.momento) qs.set('momento', seleccion.momento);
  if (seleccion.desde) qs.set('desde', seleccion.desde);

  let p;
  try {
    p = await get(`/rutas/${seleccion.rutaId}/proxima-salida?${qs}`, publico);
  } catch (error) {
    zonaAvisos.innerHTML = '';
    zona.innerHTML = `<div class="mensaje-error">${esc(error.message)}</div>`;
    zonaHoras.innerHTML = '';
    return;
  }
  if (!estado) return;

  // 1. Avisos primero, antes que cualquier horario. Si hay suspensión, la tarjeta grande ya la
  //    muestra: aquí van solo los demás avisos, para no repetirla.
  const suspendido = p.status === 'SUSPENDED';
  zonaAvisos.innerHTML = bannersAvisos((p.alerts ?? []).filter((a) => !(suspendido && a.type === 'suspendido')));

  const meta = `${TEXTOS.dayType[p.dayType]} · ${p.localDate} ${p.localTime} (hora de Montería)`;
  const parada = p.fromStop;
  const intermedio = parada && !parada.isOrigin;
  const titulo = `${TEXTOS.sentido[p.direction]} → ${esc(p.destination)}${intermedio ? ` · desde ${esc(parada.name)}` : ''}`;

  if (p.status === 'NEXT_DEPARTURE') {
    zona.innerHTML = `
      <div class="proxima">
        <div>${intermedio ? 'Próximo paso' : 'Próxima salida'} · ${titulo}</div>
        <div class="proxima-hora">${esc(p.departureTime)}</div>
        <div class="proxima-msg">${p.minutesRemaining === 0 ? (intermedio ? 'Pasa ahora' : 'Sale ahora') : `En ${p.minutesRemaining} min`}</div>
        ${intermedio ? `<div class="proxima-meta">Sale del origen a las ${esc(p.originDepartureTime)} · +${parada.minutesFromOrigin} min${parada.isEstimatedTime ? ' (estimado)' : ''}</div>` : ''}
        <div class="proxima-meta">${esc(meta)}</div>
      </div>`;
  } else if (p.status === 'SUSPENDED') {
    zona.innerHTML = `
      <div class="proxima suspendida">
        <div>${titulo}</div>
        <div class="proxima-msg" style="font-size:1.4rem;font-weight:700;margin:8px 0">⛔ ${esc(p.message)}</div>
        <div>${esc(p.detail ?? '')}</div>
        <div class="proxima-meta">Motivo: ${esc(TEXTOS.motivoAviso[p.reason] ?? p.reason)}${
          p.suspendedUntil ? ` · hasta ${esc(fechaHora(p.suspendedUntil))}` : ' · hasta nuevo aviso'
        }</div>
        <div class="proxima-meta">${esc(meta)}</div>
      </div>`;
  } else if (p.status === 'NO_MORE_DEPARTURES_TODAY') {
    const m = p.nextDayFirstDeparture;
    zona.innerHTML = `
      <div class="proxima sin-salidas">
        <div>${TEXTOS.sentido[p.direction]} → ${esc(p.destination)}</div>
        <div class="proxima-msg" style="font-size:1.4rem;font-weight:700;margin:8px 0">${esc(p.message)}</div>
        ${m ? `<div>Primera salida de mañana (${TEXTOS.dayType[m.dayType].toLowerCase()}): <strong>${esc(m.departureTime)}</strong></div>` : ''}
        <div class="proxima-meta">${esc(meta)}</div>
      </div>`;
  } else {
    zona.innerHTML = `
      <div class="proxima fuera">
        <div class="proxima-msg" style="font-size:1.4rem;font-weight:700">${esc(p.message)}</div>
        <div class="proxima-meta">${esc(meta)}</div>
      </div>`;
  }
  zona.insertAdjacentHTML('beforeend', `<div class="aviso-programado">ⓘ ${esc(p.notice)}</div>`);

  // Horas de hoy en el embarcadero elegido (salida del origen + minutos); las pasadas se atenúan
  const tipoDia = TEXTOS.dayTypeATipoDia[p.dayType];
  const desfase = parada?.minutesFromOrigin ?? 0;
  try {
    const h = await get(`/rutas/${seleccion.rutaId}/horarios?sentido=${seleccion.sentido}&tipoDia=${tipoDia}`, publico);
    zonaHoras.innerHTML = `
      <div class="ayuda" style="margin-bottom:8px">${
        intermedio ? `Pasos de hoy por ${esc(parada.name)}` : 'Salidas de hoy'
      } (${TEXTOS.tipoDia[tipoDia]})${suspendido ? ' · <strong>sin servicio mientras dure la suspensión</strong>' : ''}:</div>
      <div class="chips" style="${suspendido ? 'opacity:.4' : ''}">
        ${
          h.horarios.length
            ? h.horarios
                .map((x) => ({ ...x, horaSalida: sumarMinutos(x.horaSalida, desfase) }))
                .map((x) => {
                  const pasada = x.horaSalida < p.localTime;
                  const siguiente = p.status === 'NEXT_DEPARTURE' && x.horaSalida === p.departureTime;
                  const estilo = siguiente
                    ? 'background:var(--rio-800);color:#fff;border-color:var(--rio-800)'
                    : pasada
                      ? 'opacity:.45'
                      : '';
                  return `<span class="chip" style="padding-right:12px;${estilo}">${x.horaSalida}</span>`;
                })
                .join('')
            : '<span class="texto-suave">Sin salidas programadas.</span>'
        }
      </div>`;
  } catch {
    zonaHoras.innerHTML = '';
  }
}
