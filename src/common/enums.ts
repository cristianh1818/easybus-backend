// Valores permitidos que se repiten en varias tablas.
// En PostgreSQL se guardan como tipos ENUM, así la BD rechaza valores inválidos.

export enum Rol {
  PASAJERO = 'pasajero',
  ADMINISTRADOR = 'administrador',
}

export enum EstadoRuta {
  ACTIVA = 'activa',
  INACTIVA = 'inactiva',
}

// Modo de transporte: la fase 1 es fluvial (Businú); la fase 2 agrega buses
// en las mismas tablas, sin crear tablas paralelas.
export enum ModoTransporte {
  FLUVIAL = 'fluvial',
  BUS = 'bus',
}

// Tipo de punto de parada. La tabla se llama "embarcaderos" (decisión de nombres en español),
// pero en la fase 2 también guardará paradas de bus.
export enum TipoEmbarcadero {
  EMBARCADERO = 'embarcadero',
  PARADA_BUS = 'parada_bus',
}

// Orilla del río Sinú donde está el embarcadero
export enum Margen {
  IZQUIERDA = 'izquierda',
  DERECHA = 'derecha',
}

// ACTIVO: en servicio · CERRADO_TEMPORAL: sigue en las rutas pero hoy no opera
// · INACTIVO: dado de baja (no se puede asignar a rutas)
export enum EstadoEmbarcadero {
  ACTIVO = 'activo',
  CERRADO_TEMPORAL = 'cerrado_temporal',
  INACTIVO = 'inactivo',
}

export enum Sentido {
  IDA = 'ida',
  VUELTA = 'vuelta',
}

export enum TipoDia {
  LABORAL = 'laboral',
  SABADO = 'sabado',
  DOMINGO_FESTIVO = 'domingo_festivo',
}

export enum TipoReporte {
  RUTA = 'ruta',
  EMBARCADERO = 'embarcadero',
  HORARIO = 'horario',
  OTRO = 'otro',
}

export enum EstadoReporte {
  PENDIENTE = 'pendiente',
  EN_REVISION = 'en_revision',
  RESUELTO = 'resuelto',
  DESCARTADO = 'descartado',
}

// Avisos de servicio: el orden de la lista es también su prioridad al mostrarlos
export enum TipoAviso {
  SUSPENDIDO = 'suspendido',
  RETRASO = 'retraso',
  CAMBIO_HORARIO = 'cambio_horario',
  INFORMATIVO = 'informativo',
}

export enum MotivoAviso {
  NIVEL_RIO = 'nivel_rio',
  CLIMA = 'clima',
  MANTENIMIENTO = 'mantenimiento',
  OTRO = 'otro',
}

// Calculado a partir de las fechas, no se guarda
export enum VigenciaAviso {
  PROGRAMADO = 'programado', // aún no empieza
  VIGENTE = 'vigente',
  VENCIDO = 'vencido',
}

export enum AccionAuditoria {
  CREAR = 'crear',
  ACTUALIZAR = 'actualizar',
  ELIMINAR = 'eliminar',
}
