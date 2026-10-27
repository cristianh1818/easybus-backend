// Copia "plana" de un objeto para guardarla en la auditoría (JSONB).
// Elimina métodos y referencias internas, deja solo los datos.
export function instantanea(obj: object): Record<string, unknown> {
  return JSON.parse(JSON.stringify(obj)) as Record<string, unknown>;
}
