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

export enum AccionAuditoria {
  CREAR = 'crear',
  ACTUALIZAR = 'actualizar',
  ELIMINAR = 'eliminar',
}
