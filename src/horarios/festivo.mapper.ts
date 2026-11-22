import { DiaFestivo } from './entities/dia-festivo.entity.js';

// Respuesta pública: solo fecha y nombre, aunque la entidad crezca en el futuro
export function formatearFestivoPublico(
  f: Pick<DiaFestivo, 'fecha' | 'nombre'>,
) {
  return { fecha: f.fecha, nombre: f.nombre };
}
