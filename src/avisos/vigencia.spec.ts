import { alcance, PRIORIDAD, puedeEliminarse, vigencia } from './vigencia.js';
import { TipoAviso, VigenciaAviso } from '../common/enums.js';

const t = (iso: string) => new Date(iso);

describe('vigencia', () => {
  const desde = t('2026-11-10T06:00:00-05:00');
  const hasta = t('2026-11-10T18:00:00-05:00');

  it('antes de empezar está programado', () => {
    expect(vigencia(desde, hasta, t('2026-11-10T05:59:00-05:00'))).toBe(VigenciaAviso.PROGRAMADO);
  });
  it('justo al empezar ya está vigente', () => {
    expect(vigencia(desde, hasta, desde)).toBe(VigenciaAviso.VIGENTE);
  });
  it('dentro del periodo está vigente', () => {
    expect(vigencia(desde, hasta, t('2026-11-10T12:00:00-05:00'))).toBe(VigenciaAviso.VIGENTE);
  });
  it('justo al terminar ya está vencido', () => {
    expect(vigencia(desde, hasta, hasta)).toBe(VigenciaAviso.VENCIDO);
  });
  it('sin fecha de fin sigue vigente indefinidamente', () => {
    expect(vigencia(desde, null, t('2027-06-01T00:00:00-05:00'))).toBe(VigenciaAviso.VIGENTE);
  });
});

describe('puedeEliminarse', () => {
  it('un aviso programado (nunca vigente) sí se puede eliminar', () => {
    expect(puedeEliminarse(VigenciaAviso.PROGRAMADO)).toBe(true);
  });
  it('uno vigente no: se debe cerrar', () => {
    expect(puedeEliminarse(VigenciaAviso.VIGENTE)).toBe(false);
  });
  it('uno vencido tampoco: ya es parte del historial', () => {
    expect(puedeEliminarse(VigenciaAviso.VENCIDO)).toBe(false);
  });
});

describe('alcance', () => {
  it('sin ruta ni embarcadero es general', () => expect(alcance(null, null)).toBe('general'));
  it('solo ruta', () => expect(alcance('r', null)).toBe('ruta'));
  it('solo embarcadero', () => expect(alcance(null, 'e')).toBe('embarcadero'));
  it('ruta y embarcadero', () => expect(alcance('r', 'e')).toBe('ruta_embarcadero'));
});

describe('prioridad', () => {
  it('una suspensión va antes que un retraso, y este antes que un aviso informativo', () => {
    expect(PRIORIDAD[TipoAviso.SUSPENDIDO]).toBeLessThan(PRIORIDAD[TipoAviso.RETRASO]);
    expect(PRIORIDAD[TipoAviso.RETRASO]).toBeLessThan(PRIORIDAD[TipoAviso.INFORMATIVO]);
  });
});
