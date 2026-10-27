// Vista "Pasajero": simula lo que verá la app móvil. Usa SOLO endpoints públicos
// (las peticiones van sin token): lista de rutas activas, detalle con mapa y próxima salida.

import { get } from '../api.js';
import { esc, toast, TEXTOS } from '../ui.js';
import { crearMapa, puntoNumerado, encuadrar, aLatLng, COLORES } from '../mapa.js';

const seleccion = { rutaId: null, sentido: 'ida', momento: '' };
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
            <label class="ayuda" style="font-weight:600">Simular fecha y hora <span class="ayuda">(vacío = ahora)</span>
              <div class="fila">
                <input type="datetime-local" id="inp-momento" style="flex:1" />
                <button type="button" class="btn btn-secundario btn-chico" id="btn-ahora">Ahora</button>
              </div>
            </label>
            <div id="zona-proxima" style="margin-top:14px"></div>
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
  if (actual?.trazado) {
    estado.capas.push(
      L.polyline(actual.trazado.coordinates.map(aLatLng), { color, weight: 6, opacity: 0.9 })
        .bindTooltip(`${d.codigo} · ${TEXTOS.sentido[actual.sentido]} → ${actual.destino}`)
        .addTo(estado.mapa),
    );
  }
  for (const e of actual?.embarcaderos ?? []) {
    estado.capas.push(
      puntoNumerado([e.latitud, e.longitud], e.orden, COLORES.activo)
        .bindPopup(`<strong>${e.orden}. ${esc(e.nombre)}</strong><br>${esc(e.referencia ?? '')}`)
        .addTo(estado.mapa),
    );
  }
  encuadrar(estado.mapa, estado.capas);
}

async function cargarProxima() {
  if (!estado?.detalle) return;
  const zona = estado.c.querySelector('#zona-proxima');
  const zonaHoras = estado.c.querySelector('#zona-horas');
  const qs = new URLSearchParams({ sentido: seleccion.sentido });
  if (seleccion.momento) qs.set('momento', seleccion.momento);

  let p;
  try {
    p = await get(`/rutas/${seleccion.rutaId}/proxima-salida?${qs}`, publico);
  } catch (error) {
    zona.innerHTML = `<div class="mensaje-error">${esc(error.message)}</div>`;
    zonaHoras.innerHTML = '';
    return;
  }
  if (!estado) return;

  const meta = `${TEXTOS.dayType[p.dayType]} · ${p.localDate} ${p.localTime} (hora de Montería)`;
  if (p.status === 'NEXT_DEPARTURE') {
    zona.innerHTML = `
      <div class="proxima">
        <div>Próxima salida · ${TEXTOS.sentido[p.direction]} → ${esc(p.destination)}</div>
        <div class="proxima-hora">${esc(p.departureTime)}</div>
        <div class="proxima-msg">${p.minutesRemaining === 0 ? 'Sale ahora' : `En ${p.minutesRemaining} min`}</div>
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

  // Horarios del tipo de día que aplica (las salidas ya pasadas se ven atenuadas)
  const tipoDia = TEXTOS.dayTypeATipoDia[p.dayType];
  try {
    const h = await get(`/rutas/${seleccion.rutaId}/horarios?sentido=${seleccion.sentido}&tipoDia=${tipoDia}`, publico);
    zonaHoras.innerHTML = `
      <div class="ayuda" style="margin-bottom:8px">Salidas de hoy (${TEXTOS.tipoDia[tipoDia]}):</div>
      <div class="chips">
        ${
          h.horarios.length
            ? h.horarios
                .map((x) => {
                  const pasada = x.horaSalida < p.localTime;
                  const siguiente = x.horaSalida === p.departureTime;
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
