<p align="center">
  <img src="docs/img/logo-easybus-cuadrado.png" alt="EASYBUS" width="160" />
</p>

# EASYBUS — Backend (API REST)

Backend de **EASYBUS**, plataforma para consultar y gestionar la información del transporte público
**fluvial Businú** sobre el río Sinú, en Montería (Córdoba).

Proyecto de la asignatura *Infraestructura y diseño* — Ingeniería de Sistemas, Universidad de Córdoba.
Autores: Cristian Herrera Méndez y Kevin Vega Machado.

📄 Documento de infraestructura y requerimientos:
[docs/EASYBUS-infraestructura-y-requerimientos.docx](docs/EASYBUS-infraestructura-y-requerimientos.docx)

> ⚠️ **Los datos de ejemplo NO son oficiales.** Nombres, coordenadas, recorridos y horarios de los
> embarcaderos y rutas son aproximados, se crearon para la demostración y están marcados con
> `esOficial: false`. Deben validarse en campo antes de usarse con usuarios reales.

---

## 1. Tecnologías

| Capa | Tecnología |
|---|---|
| Lenguaje | TypeScript (modo estricto) |
| Framework | NestJS 12 sobre Node.js 24 |
| Base de datos | PostgreSQL 17 + PostGIS 3.5 (en Docker) |
| Acceso a datos | TypeORM 1.x |
| Autenticación | JWT (Passport) + contraseñas con hash bcrypt |
| Validación | class-validator / class-transformer (DTOs) |
| Documentación | Swagger / OpenAPI en `/api/docs` |
| Seguridad extra | Límite de peticiones (@nestjs/throttler), CORS |
| Pruebas | Vitest + Supertest |

## 2. Requisitos

- Node.js 20 o superior (probado con 24) y npm
- Docker Desktop encendido

## 3. Puesta en marcha (Windows / PowerShell)

```powershell
# 1. Instalar dependencias
npm install

# 2. Crear el archivo de configuración (luego cambia las claves)
Copy-Item .env.example .env

# 3. Levantar PostgreSQL + PostGIS
docker compose up -d --wait

# 4. Cargar los datos de ejemplo (2 rutas, 6 embarcaderos, horarios y festivos 2026)
npm run seed:reset

# 5. Arrancar la API en modo desarrollo (se recarga sola al guardar cambios)
npm run start:dev
```

- **Panel de administración: <http://localhost:3000/panel>**
- API: <http://localhost:3000/api/v1>
- Swagger: <http://localhost:3000/api/docs>
- Salud: <http://localhost:3000/api/v1/health>

**Administrador inicial** (se crea solo al arrancar, valores del `.env`):

| Correo | Contraseña |
|---|---|
| `admin@easybus.co` | `Admin123*` |

## 4. Comandos útiles

| Comando | Qué hace |
|---|---|
| `npm run start:dev` | Arranca la API y la reinicia al guardar cambios |
| `npm run seed` | (Re)carga rutas, embarcaderos, horarios y festivos de ejemplo |
| `npm run seed:reset` | Borra reportes, auditoría y todas las rutas/embarcaderos no oficiales, y recarga los de ejemplo (demo limpia) |
| `npm run migration:show` | Ver qué migraciones están aplicadas (`[X]`) y cuáles faltan (`[ ]`) |
| `npm run migration:run` | Aplicar las migraciones pendientes (la API también lo hace sola al arrancar) |
| `npm run migration:revert` | Deshacer la última migración aplicada |
| `npm run migration:generate -- src/database/migrations/NombreDelCambio` | Crear una migración comparando las entidades con la base |
| `npm run migration:check` | Verificar que la base coincide exactamente con las entidades (sin cambios pendientes) |
| `npm test` | Pruebas unitarias (cálculo de próxima salida y tipo de día) |
| `npm run test:e2e` | Prueba de integración del endpoint `/health` (requiere la BD) |
| `docker compose ps` | Ver si la base de datos está corriendo |
| `docker compose stop` | Apagar la base de datos (conserva los datos) |
| `docker compose down -v` | Apagar y **borrar** todos los datos de la base |
| `docker exec easybus-db psql -U easybus -d easybus -c "\dt public.*"` | Ver las tablas |

## 5. Estructura del proyecto

```
easybus-backend/
├── docs/                   Documento de requerimientos y logos (img/)
├── panel/                  Panel visual de pruebas servido en /panel (ver sección 9)
├── src/                    Código del backend (detalle abajo)
├── test/                   Pruebas de integración (e2e)
├── docker-compose.yml      Base de datos PostgreSQL + PostGIS
├── .env.example            Plantilla de variables de entorno (copiar como .env)
└── package.json, tsconfig*.json, nest-cli.json, vitest.config*.ts   Configuración
```

```
src/
├── main.ts                 Arranque: prefijo /api/v1, validación, CORS, Swagger
├── app.module.ts           Módulo raíz: configuración, conexión a BD, límite de peticiones
├── common/                 Enums, formato uniforme de errores, validadores y utilidades
├── database/               Conexión para el CLI de TypeORM y migraciones versionadas
├── auth/                   Login/registro, JWT, guards de rol, decorador @Auth()
├── usuarios/               Usuarios y favoritos; crea el administrador inicial
├── embarcaderos/           CRUD de embarcaderos (puntos geográficos) y consultas públicas
├── embarcaciones/          Flota: embarcaciones con capacidad y estado
├── avisos/                 Avisos de servicio (suspensiones, retrasos…)
├── rutas/                  Rutas, sentidos (ida/vuelta), trazado y secuencia de embarcaderos
├── horarios/               Horarios por sentido y tipo de día; días festivos
├── reportes/               Reportes de error de los usuarios y su gestión
├── auditoria/              Registro de cambios administrativos
├── admin/                  Resumen con cifras para el panel
├── publico/                Consultas del pasajero y cálculo de la próxima salida
├── health/                 Endpoint de salud para monitoreo
└── seed/                   Datos de ejemplo NO oficiales y script de carga
```

Cada módulo sigue el mismo patrón:
**DTO** (qué datos se aceptan) → **Controller** (URL y permisos) → **Service** (reglas de negocio y auditoría) → **Entity** (tabla).

## 6. Modelo de datos

```
usuarios ──< favoritos >── rutas
                             │ 1
                             ▼ 2 (ida / vuelta)
                        ruta_sentidos ── trazado (LineString, SRID 4326)
                         │          │
                         ▼          ▼
            ruta_embarcaderos     horarios (tipo_dia, hora_salida)
                (orden)  │
                         ▼
                   embarcaderos ── ubicacion (Point, SRID 4326)

dias_festivos     reportes (→ usuario, ruta, embarcadero)     auditoria (→ usuario)
```

- Claves primarias UUID; geometrías WGS 84 (SRID 4326) con índice espacial GiST.
- El trazado, la secuencia y los horarios pertenecen al **sentido**, no a la ruta.
- Borrar una ruta borra en cascada sus sentidos, secuencias y horarios; un embarcadero asignado
  a una ruta no se puede borrar.

### Embarcaderos y tiempos de la secuencia

- **Embarcaderos**: `tipo` (embarcadero / parada de bus, para la fase 2), `margen` del río, `estado`
  (`activo`, `cerrado_temporal`, `inactivo`; reemplazó al antiguo `activo` sí/no), accesibilidad
  (`tiene_rampa`, `tiene_techo`, `tiene_iluminacion`: sí / no / sin dato) y `foto_url`.
  Un embarcadero `inactivo` no se puede asignar a rutas; uno `cerrado_temporal` sí sigue en ellas.
- **Rutas**: `modo` (`fluvial` en la fase 1; `bus` en la fase 2).
- **Secuencia** (`ruta_embarcaderos`): `minutos_desde_origen` (minutos desde el zarpe en el primer
  embarcadero, que siempre es 0) y `tiempo_estimado` (sí = calculado; no = tiempo real registrado).
  Hora estimada de paso por un embarcadero = hora de salida + minutos_desde_origen.

**Regla de estimación (regla B):** 10 minutos por km. Cada tramo entre embarcaderos consecutivos
mide lo **mayor** entre la distancia a lo largo del trazado (`ST_LineLocatePoint` + `ST_LineSubstring`
+ `ST_Length` sobre geography) y la distancia en línea recta, para que un trazado que no pasa por un
embarcadero no produzca tramos más cortos que la línea recta. Sin trazado se usa la línea recta.
Los estimados se recalculan solos al guardar la secuencia o el trazado; los tiempos reales no se tocan
y las estimaciones siguientes parten de ellos. El panel marca con ⚠️ los embarcaderos a más de
**150 m** del trazado y los tiempos menores que el del embarcadero anterior.
Código: `src/rutas/tiempos-estimados.ts`.

### Migraciones de base de datos

Las tablas **no se crean ni modifican solas** (`synchronize` está desactivado). Cada cambio del esquema
es una **migración versionada** en `src/database/migrations/`: un archivo con fecha que contiene el SQL
para aplicar el cambio (`up`) y para deshacerlo (`down`). Con `DB_MIGRATIONS_RUN=true` (por defecto)
la API aplica las pendientes al arrancar; con `false` solo se aplican con `npm run migration:run`
(útil mientras se escribe una migración nueva con `start:dev` abierto, y en producción). El registro
queda en la tabla `migraciones`.

Flujo para cambiar el modelo:
1. Modificar la entidad (`*.entity.ts`).
2. `npm run migration:generate -- src/database/migrations/DescripcionDelCambio` y **revisar el SQL generado**
   (si hay que convertir datos, se completa a mano).
3. `npm run migration:run` y `npm run migration:check` para confirmar que la base quedó igual al código.
4. Antes de cambios delicados, respaldo: `docker exec easybus-db pg_dump -U easybus -d easybus -Fc -f /tmp/r.dump`
   y `docker cp easybus-db:/tmp/r.dump backups/` (la carpeta `backups/` no se sube a Git).

La primera migración (`EsquemaInicial`) reproduce las 10 tablas originales. En la base de desarrollo
que ya existía se registró como aplicada con `migration:run --fake`, sin tocar los datos.

### Decisión de nombres: en español

La guía de arquitectura de EASYBUS propone nombres en inglés (`/stops`, `/service-alerts`, `vessels`),
pero indica adaptarse a la API existente sin renombrar a la fuerza. Se decidió **mantener el español**
en tablas, módulos y endpoints: `embarcaderos`, `rutas`, `horarios`, `avisos`, `/api/v1/embarcaderos`,
`/api/v1/avisos`. Se conservan en inglés solo los valores definidos por el documento de requerimientos
para la respuesta de próxima salida (`NEXT_DEPARTURE`, `WEEKDAY`…). La preparación para buses (fase 2)
se hace agregando campos de modo/tipo a estas mismas tablas, no creando tablas paralelas.

## 7. Endpoints (prefijo `/api/v1`)

### Públicos (sin iniciar sesión)

| Método | Ruta | Descripción | Req. |
|---|---|---|---|
| GET | `/rutas` | Rutas activas | RF-01 |
| GET | `/rutas/{id}` | Detalle con sentidos, trazado GeoJSON y embarcaderos en orden | RF-02/03/04 |
| GET | `/rutas/{id}/horarios?sentido=&tipoDia=` | Horarios por sentido y tipo de día | RF-05 |
| GET | `/rutas/{id}/proxima-salida?sentido=&desde=&momento=` | Próxima salida desde el origen o desde un embarcadero (America/Bogota), con avisos | RF-06 |
| GET | `/embarcaderos?tipo=` | Embarcaderos en servicio (activos y cerrados temporalmente) | — |
| GET | `/embarcaderos/{id}` | Detalle + rutas activas que lo atienden (parada N de M, minutos desde el origen) | RF-04 |
| GET | `/embarcaderos/cercanos?lat=&lng=&radio=&limite=` | Embarcaderos a menos de `radio` metros (50–5000, por defecto 500), del más cercano al más lejano | RF-09 |
| GET | `/avisos?rutaId=&embarcaderoId=` | Avisos de servicio vigentes, suspendidos primero | — |
| POST | `/reportes` | Reportar un error (token opcional) | RF-12 |
| POST | `/auth/login` · `/auth/register` | Iniciar sesión / crear cuenta de pasajero | RF-10/14 |
| GET | `/health` | Estado de la API y la base de datos | RNF-11 |

### Administrador (requieren token con rol `administrador`)

| Método | Ruta | Descripción | Req. |
|---|---|---|---|
| GET/POST | `/admin/embarcaderos` | Listar / crear | RF-16 |
| GET/PATCH/DELETE | `/admin/embarcaderos/{id}` | Ver / editar / eliminar | RF-16 |
| GET/POST | `/admin/rutas` | Listar / crear | RF-15 |
| GET/PATCH/DELETE | `/admin/rutas/{id}` | Ver / editar (activar-desactivar) / eliminar | RF-15 |
| PUT/DELETE | `/admin/rutas/{id}/sentidos/{ida\|vuelta}` | Crear-editar / eliminar sentido | RF-15 |
| PUT | `/admin/rutas/{id}/sentidos/{sentido}/trazado` | Registrar trazado GeoJSON | RF-17 |
| PUT | `/admin/rutas/{id}/sentidos/{sentido}/embarcaderos` | Asignar embarcaderos en orden | RF-16 |
| PATCH | `/admin/rutas/{id}/sentidos/{sentido}/embarcaderos/{embarcaderoId}` | Editar minutos desde el origen y si son estimados o reales | RF-16 |
| POST | `/admin/rutas/{id}/sentidos/{sentido}/tiempos/recalcular` | Recalcular los tiempos estimados | RF-16 |
| GET/POST | `/admin/rutas/{id}/sentidos/{sentido}/horarios` | Ver / agregar una hora | RF-18 |
| PUT | `/admin/rutas/{id}/sentidos/{sentido}/horarios/{tipoDia}` | Cargar todas las horas de un tipo de día | RF-18 |
| PATCH/DELETE | `/admin/horarios/{id}` | Editar / eliminar una hora | RF-18 |
| GET/POST | `/admin/festivos` · DELETE `/admin/festivos/{fecha}` | Gestionar festivos | RF-18 |
| GET | `/admin/reportes` · GET/PATCH `/admin/reportes/{id}` | Ver y gestionar reportes | RF-20 |
| GET/POST | `/admin/avisos` (`?vigencia=programado\|vigente\|vencido`) | Listar / publicar avisos de servicio | — |
| GET/PATCH/DELETE | `/admin/avisos/{id}` | Ver / editar / eliminar (solo si está programado) | — |
| POST | `/admin/avisos/{id}/cerrar` | Terminar ahora un aviso vigente | — |
| GET/POST | `/admin/embarcaciones` (`?estado=operativa\|mantenimiento`) | Listar / registrar embarcaciones | — |
| GET/PATCH/DELETE | `/admin/embarcaciones/{id}` | Ver / editar (p. ej. pasar a mantenimiento) / eliminar | — |
| GET | `/admin/auditoria` | Registro de cambios (quién, qué, cuándo, antes/después) | RF-21 |
| GET | `/admin/resumen` | Cifras generales | — |
| GET | `/admin/usuarios` | Usuarios registrados | — |

Los embarcaderos `inactivos` nunca aparecen en las consultas públicas. La búsqueda por cercanía usa
`ST_DWithin` y `ST_Distance` sobre `geography` (metros reales). **Privacidad (RNF-07):** en la beta la
ubicación GPS del usuario no se envía al servidor; `/embarcaderos/cercanos` está pensado para un punto
que el usuario busca o escribe (origen o destino). Para "cerca de mí", la app calcula la distancia en el
dispositivo con la lista de `/embarcaderos`.

### Avisos de servicio

Para el río son clave: si el Sinú crece o baja demasiado, el servicio se suspende. Tabla `avisos_servicio`:

- **Tipo** (también su prioridad al mostrarlos): `suspendido` → `retraso` → `cambio_horario` → `informativo`.
- **Motivo**: `nivel_rio`, `clima`, `mantenimiento`, `otro`. Título y mensaje para el pasajero.
- **Alcance**: sin ruta ni embarcadero = todo el servicio; solo ruta; solo embarcadero (afecta a todas
  las rutas que pasan por él); o ruta + embarcadero (ese embarcadero en esa ruta).
- **Vigencia**: de `vigente_desde` (incluido) a `vigente_hasta` (excluido; vacío = hasta que se cierre).
  Se calcula como `programado`, `vigente` o `vencido`. Las fechas sin zona horaria se toman como hora
  de Montería. **Cerrar** un aviso pone `vigente_hasta = ahora` y lo deja en el historial.
  **Eliminar** solo es posible si el aviso está programado (nunca estuvo vigente); si ya lo estuvo,
  la API responde 409 y pide cerrarlo, para no perder el historial de lo comunicado a los pasajeros.
- `GET /avisos?rutaId=` devuelve los generales, los de esa ruta y los de sus embarcaderos;
  `?embarcaderoId=` devuelve los generales, los de ese embarcadero y los de las rutas que lo atienden.
- Todo cambio queda en la auditoría (`avisos_servicio`). La app debe pedirlos al abrirse y mostrarlos
  antes que cualquier horario. En el paso siguiente la próxima salida responderá `SUSPENDED` cuando
  haya una suspensión vigente.

### Cálculo de la próxima salida (sección 8.3 del documento)

1. Se toma la hora actual en **America/Bogota**.
2. Tipo de día: **festivo o domingo** → `domingo_festivo`; **sábado** → `sabado`; otro → `laboral`.
3. Orden de decisión del `status`:
   1. Ruta inactiva → `OUT_OF_SERVICE`.
   2. Aviso **suspendido** vigente para el servicio, la ruta o el embarcadero → `SUSPENDED`, con
      `reason` (motivo), `message`, `detail` y `suspendedUntil`.
   3. Embarcadero cerrado temporalmente → `OUT_OF_SERVICE`.
   4. `NEXT_DEPARTURE` (hora y minutos restantes) o `NO_MORE_DEPARTURES_TODAY` (con la primera de mañana).
4. **Desde un embarcadero** (`desde=<id>`): hora de paso = salida del origen + `minutos_desde_origen`.
   La respuesta trae `departureTime` (en ese embarcadero), `originDepartureTime` y `fromStop`. Se tiene en
   cuenta la medianoche: una salida de 23:50 con 30 min de recorrido pasa a las 00:20 (`crossesMidnight`),
   y a las 00:05 el próximo paso puede venir de una salida del día anterior.
5. `alerts` trae siempre los avisos vigentes que afectan a la ruta o al embarcadero consultado, y
   `GET /rutas/{id}` incluye `avisos` al inicio para mostrarlos antes que los horarios.
6. La respuesta siempre aclara que es una **estimación según el horario programado**.

El parámetro opcional `momento` (ej. `2026-11-02T07:10`) simula otra fecha/hora; los avisos también se
evalúan en ese momento.

### Embarcaciones

Tabla `embarcaciones`: `codigo` único (se guarda en mayúsculas, ej. `BN-01`), `nombre`, `capacidad`
(pasajeros, entero mayor que 0), `estado` (`operativa` / `mantenimiento`), `tipo` (`embarcacion`; `bus`
en la fase 2), `observaciones` y `es_oficial`. Sin GPS en la beta: es el inventario de la flota. Todo
cambio queda en la auditoría.

### Formato uniforme de errores

Toda respuesta de error tiene la misma forma:

```json
{ "statusCode": 409, "code": "CODIGO_DUPLICADO", "message": "Ya existe una embarcación con el código BN-01" }
```

- `statusCode`: código HTTP. `message`: texto en español para mostrar al usuario.
- `code`: código interno estable para que la app y el panel decidan qué hacer sin leer el texto.
- En validaciones (400) se agrega `errores`: la lista de problemas, uno por campo.
- Los mensajes que NestJS, Passport o class-validator generan en inglés se traducen.
- En un error 500 no se revelan detalles internos (se registran solo en la consola del servidor).

| code | HTTP | Cuándo |
|---|---|---|
| `DATOS_INVALIDOS` | 400 | Validación de datos (trae `errores`) |
| `FORMATO_INVALIDO` / `FECHA_INVALIDA` | 400 | Formato rechazado por PostgreSQL |
| `EMBARCADERO_FUERA_DE_RUTA` | 400 | `desde=` con un embarcadero que no está en ese sentido |
| `NO_AUTENTICADO` | 401 | Falta el token o venció |
| `CREDENCIALES_INVALIDAS` | 401 | Correo o contraseña incorrectos |
| `SIN_PERMISO` | 403 | El rol no permite la acción |
| `NO_ENCONTRADO` | 404 | Registro o dirección inexistente |
| `CONFLICTO` | 409 | Conflicto genérico |
| `CODIGO_DUPLICADO` / `CORREO_REGISTRADO` / `HORARIO_DUPLICADO` / `FESTIVO_DUPLICADO` / `REGISTRO_DUPLICADO` | 409 | Ya existe |
| `EMBARCADERO_EN_USO` / `REGISTRO_EN_USO` | 409 | No se puede borrar porque otros datos lo usan |
| `AVISO_NO_ELIMINABLE` / `AVISO_VENCIDO` / `AVISO_NO_INICIADO` | 409 | Reglas de los avisos |
| `DEMASIADAS_PETICIONES` | 429 | Límite de peticiones superado |
| `ERROR_INTERNO` | 500 | Error inesperado |

Código: `src/common/errores/` (función pura `formatearError`, con pruebas unitarias, y el filtro global).

## 8. Seguridad implementada

- Contraseñas con **bcrypt**; el hash nunca se devuelve en las respuestas.
- **JWT** de 1 hora; el rol se verifica en el servidor en cada petición (pasajero → 403 en `/admin`).
- Validación estricta de entradas: se rechazan campos desconocidos (no se puede enviar `"rol"` al registrarse).
- **Límite de peticiones**: 100/min por IP en general; 5/min en login y registro.
- Consultas parametrizadas (TypeORM) contra inyección SQL.
- **Auditoría** de cada cambio administrativo con usuario, fecha, valor anterior y nuevo.
- `.env` fuera del repositorio; `.env.example` como plantilla.

## 9. Panel visual de pruebas (`/panel`)

Interfaz web para ver y probar todo el backend sin Swagger. La sirve el mismo NestJS
(`@nestjs/serve-static`) en <http://localhost:3000/panel>; es HTML, CSS y JavaScript sin frameworks
y solo consume la API REST, igual que lo hará el panel Next.js definitivo.

| Sección | Qué permite |
|---|---|
| Inicio | Cifras de `/admin/resumen` y estado de API, base de datos y PostGIS |
| Embarcaderos | Tabla, crear/editar/eliminar; mapa OpenStreetMap donde un clic llena latitud y longitud |
| Rutas | Crear/editar/activar; en cada ruta: sentidos ida/vuelta, embarcaderos en orden (subir/bajar) y trazado dibujado con clics |
| Horarios | Por ruta, sentido y tipo de día: agregar/quitar una hora o reemplazar la lista (con generador "cada N min") |
| Festivos | Lista por año, agregar y quitar |
| Avisos de servicio | Publicar (tipo, motivo, ruta/embarcadero, vigencia), editar, cerrar (vigentes) y eliminar (programados); filtro por vigencia y tipo |
| Embarcaciones | Registrar, editar, pasar a mantenimiento / operativa y eliminar; cifras de la flota |
| Reportes | Filtro por estado y cambio de estado con respuesta del administrador |
| Auditoría | Historial con filtros; "Ver cambios" muestra campo por campo el antes y el después |
| Vista pasajero | Usa **solo** endpoints públicos: rutas activas, mapa con trazado, avisos antes que los horarios, próxima salida desde cualquier embarcadero y tarjeta de suspensión |

```
panel/
├── index.html            Login + estructura (menú, cabecera, aviso de datos no oficiales)
├── css/panel.css         Diseño (azul institucional #07295B)
├── img/                  Logos de EASYBUS
└── js/
    ├── app.js            Login, menú y navegación por #/seccion
    ├── api.js            fetch con token, sesión en sessionStorage, errores en español
    ├── ui.js             Utilidades: avisos, ventana modal, fechas, textos
    ├── mapa.js           Leaflet + OpenStreetMap (Leaflet se sirve local desde node_modules)
    └── views/            Una vista por sección del menú
```

- Solo entran usuarios con rol **administrador**; si el token vence (401) vuelve al login.
- Leaflet se sirve desde el propio servidor (`/panel/vendor/leaflet`); solo las imágenes del mapa
  vienen de internet (OpenStreetMap).

## 10. Pendiente para siguientes iteraciones

- Token de renovación (refresh) con rotación y `/auth/logout`.
- Importación CSV / GeoJSON (RF-19).
- Búsquedas por cercanía con PostGIS: embarcaderos cercanos y rutas por origen/destino (RF-07, RF-09).
- Favoritos del pasajero (RF-11) — la tabla ya existe.
- Asignar embarcaciones a horarios (qué embarcación hace cada salida), para mostrar capacidad o
  avisar cuando una embarcación pasa a mantenimiento y afecta salidas programadas.
- Validar datos reales con el operador del Businú.

---

## 11. Guion de la demo — Opción A: desde el panel (≈ 10 minutos, recomendada)

**Antes de empezar:** Docker Desktop abierto y luego

```powershell
docker compose up -d --wait
npm run seed:reset
npm run start:dev
```

Abrir **<http://localhost:3000/panel>** (y, en otra pestaña, <http://localhost:3000/api/docs> por si preguntan por la API).

**1. Contexto y acceso (1 min)**
1. Mostrar el aviso amarillo: los datos de ejemplo **no son oficiales**.
2. Intentar entrar con una clave errada → "Correo o contraseña incorrectos".
3. Entrar con `admin@easybus.co` / `Admin123*`.
   *(Opcional: un pasajero creado con `POST /auth/register` recibe "Acceso solo para administradores".)*

**2. Inicio (30 s)**
4. Cifras generales y estado del sistema (API, PostgreSQL, PostGIS).

**3. Vista pasajero — lo que verá la app (2 min)**
5. **Vista pasajero** → elegir **BS-1**: trazado sobre el río y embarcaderos numerados en orden.
   Cambiar a **Vuelta**: el orden se invierte.
6. Tarjeta de **próxima salida** con la hora real de Montería y el aviso de *horario programado*.
7. En "Simular fecha y hora":
   - `28/10/2026 07:10` → salida 07:30, en 20 min (laboral).
   - `02/11/2026 07:10` → **lunes festivo**: usa el horario de domingo/festivo (08:30).
   - `28/10/2026 21:00` → "No hay más salidas programadas hoy" y la primera de mañana.

**4. Administración (5 min)**
8. **Embarcaderos** → clic en el río para ubicar uno nuevo, nombre "Embarcadero Demo" → *Crear*.
   Probar latitud `200` → mensaje de error 400 en español.
9. **Rutas** → crear `BS-9` "Ruta Demo" (se abre su detalle). Repetir el código → error 409.
10. En el detalle, pestaña **Ida**: destino "Embarcadero Demo" → *Crear sentido*.
11. Agregar *Embarcadero Centro* y *Embarcadero Demo*, ordenarlos con ↑ ↓ → *Guardar orden*.
12. *Unir embarcaderos en orden* (o clics sobre el río) → *Guardar trazado* (GeoJSON LineString).
13. **Horarios** → ruta BS-9, Ida, *Laboral* → generador 06:00–18:00 cada 60 → *Reemplazar lista*;
    quitar una hora con ✕ y agregar otra.
14. **Vista pasajero** → aparece BS-9 con su próxima salida. Volver a **Rutas** → *Desactivar* BS-9
    → ya no aparece en la vista pasajero.
15. **Embarcaderos** → eliminar "Embarcadero Demo" → error 409: está asignado a una ruta (integridad).
16. **Festivos** → mostrar los de 2026; agregar uno y quitarlo.
17. **Reportes** → *Gestionar* el reporte de ejemplo → "Resuelto" con una respuesta.
18. **Auditoría** → todo lo hecho en la demo; *Ver cambios* muestra los campos antes y después.

**5. Cierre (1 min)**
19. Seguridad (bcrypt, JWT, roles en el servidor, límite de intentos), zona horaria America/Bogota,
    pruebas unitarias (`npm test`) y pendientes (sección 10).

Para repetir la demo desde cero: `npm run seed:reset`.

---

## 12. Guion de la demo — Opción B: desde Swagger

**Antes de empezar:** Docker Desktop abierto y luego

```powershell
docker compose up -d --wait
npm run seed:reset
npm run start:dev
```

Abrir **<http://localhost:3000/api/docs>**.

> En cada endpoint: clic para desplegar → **Try it out** → llenar datos → **Execute**.

### Parte 1 — Contexto y salud (1 min)

1. Explicar: EASYBUS para el Businú; embarcaderos en vez de paradas; cada ruta tiene ida y vuelta.
2. **Salud → `GET /health`** → muestra `status: ok`, base de datos `up` y versión de PostGIS.

### Parte 2 — Consultas públicas, sin iniciar sesión (2 min)

3. **Público · Rutas → `GET /rutas`** → las 2 rutas de ejemplo (BS-1 y BS-2). Señalar `esOficial: false`.
   **Copiar el `id` de BS-1** (se usa varias veces).
4. **`GET /rutas/{id}`** con ese id → sentidos ida y vuelta, `trazado` en GeoJSON (lo dibuja el mapa)
   y embarcaderos **en orden**: la vuelta es la ida al revés.
5. **`GET /rutas/{id}/proxima-salida`** con `sentido = ida`:
   - Sin `momento` → próxima salida real según la hora actual en Montería.
   - `momento = 2026-10-28T07:10` (miércoles) → `WEEKDAY`, salida 07:30, en 20 min.
   - `momento = 2026-11-02T07:10` (**lunes festivo**) → `SUNDAY_HOLIDAY`, salida 08:30.
     *"El sistema sabe que es festivo porque está registrado en la tabla de festivos."*
   - `momento = 2026-10-28T21:00` → `NO_MORE_DEPARTURES_TODAY` con la primera de mañana.
   - Señalar el aviso: *es horario programado, no ubicación real*.

### Parte 3 — Seguridad (1 min)

6. **Admin · Embarcaderos → `GET /admin/embarcaderos`** sin token → **401 Unauthorized**.
7. **Autenticación → `POST /auth/login`** (ya trae `admin@easybus.co` / `Admin123*`) → copiar `accessToken`.
8. Botón **Authorize** (arriba) → pegar el token → *Authorize* → *Close*.
   *(Opcional: registrar un pasajero con `POST /auth/register`, autorizarse con su token y mostrar
   que `/admin/...` responde **403 Forbidden**.)*

### Parte 4 — Funciones del administrador (5 min)

9. **Admin · Resumen → `GET /admin/resumen`** → cifras generales.
10. **Admin · Embarcaderos → `POST /admin/embarcaderos`**:
    ```json
    { "nombre": "Embarcadero Demo", "referencia": "Creado en la sustentación",
      "latitud": 8.7495, "longitud": -75.8836 }
    ```
    Copiar el `id`. Mostrar un error de validación cambiando `latitud` a `200` → **400** con mensaje en español.
11. **Admin · Rutas → `POST /admin/rutas`**:
    ```json
    { "codigo": "BS-9", "nombre": "Ruta Demo", "color": "#E53935" }
    ```
    Copiar el `id`. Repetir → **409**: el código ya existe.
12. **`PUT /admin/rutas/{id}/sentidos/{sentido}`** con `sentido = ida`:
    ```json
    { "destino": "Embarcadero Demo",
      "trazado": { "type": "LineString",
                   "coordinates": [[-75.883, 8.753], [-75.8833, 8.751], [-75.8836, 8.7495]] } }
    ```
13. **`PUT /admin/rutas/{id}/sentidos/{sentido}/embarcaderos`** (`ida`) — usar el id del Embarcadero
    Centro (de `GET /admin/embarcaderos`) y el del Embarcadero Demo:
    ```json
    { "embarcaderoIds": ["<id Embarcadero Centro>", "<id Embarcadero Demo>"] }
    ```
    → la respuesta muestra el **orden** 1 y 2.
14. **Admin · Horarios → `PUT /admin/rutas/{id}/sentidos/{sentido}/horarios/{tipoDia}`**
    (`ida`, `laboral`):
    ```json
    { "horas": ["06:00", "07:30", "12:00", "17:45"] }
    ```
    → las horas quedan ordenadas.
15. **`GET /rutas/{id}/proxima-salida`** (público) de la ruta demo, `sentido = ida`,
    `momento = 2026-10-28T07:00` → salida 07:30.
16. **`PATCH /admin/rutas/{id}`** → `{ "estado": "inactiva" }`, y repetir el paso 15 → `OUT_OF_SERVICE`.
    `GET /rutas` ya no la muestra.
17. **Admin · Embarcaderos → `DELETE /admin/embarcaderos/{id}`** del Embarcadero Demo → **409**:
    está asignado a una ruta (integridad).
18. **Admin · Reportes → `GET /admin/reportes`** → reporte de ejemplo; **`PATCH /admin/reportes/{id}`**:
    ```json
    { "estado": "resuelto", "respuestaAdmin": "Horario verificado" }
    ```
19. **Admin · Auditoría → `GET /admin/auditoria`** → todo lo hecho en la demo: quién, cuándo,
    qué acción y los datos **antes y después** de cada cambio.

### Parte 5 — Cierre (1 min)

20. Mencionar: contraseñas con bcrypt, roles verificados en el servidor, límite de intentos de login,
    zona horaria America/Bogota, pruebas unitarias (`npm test`) y lo pendiente (sección 10).

**Para repetir la demo desde cero:** `npm run seed:reset` (borra la ruta demo, reportes y auditoría
y vuelve a cargar los datos de ejemplo).
