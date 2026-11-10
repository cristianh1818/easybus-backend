import { AvisoServicio } from './entities/aviso-servicio.entity.js';
import { alcance, vigencia } from './vigencia.js';

export function formatearAviso(a: AvisoServicio, ahora: Date = new Date()) {
  return {
    id: a.id,
    tipo: a.tipo,
    motivo: a.motivo,
    titulo: a.titulo,
    mensaje: a.mensaje,
    alcance: alcance(a.rutaId, a.embarcaderoId),
    ruta: a.ruta ? { id: a.ruta.id, codigo: a.ruta.codigo, nombre: a.ruta.nombre } : null,
    embarcadero: a.embarcadero ? { id: a.embarcadero.id, nombre: a.embarcadero.nombre } : null,
    vigenteDesde: a.vigenteDesde,
    vigenteHasta: a.vigenteHasta,
    vigencia: vigencia(a.vigenteDesde, a.vigenteHasta, ahora),
    creadoEn: a.creadoEn,
    actualizadoEn: a.actualizadoEn,
  };
}
