# Despliegue de EASYBUS en Azure (paso a paso)

Guía para poner la API, el panel y la base de datos en la VM de Azure, pensada para
alguien que lo hace por primera vez. Copia y pega los comandos **en orden**.

| Dato | Valor |
|---|---|
| VM | `easybus-vm` · Ubuntu 24.04 · Standard_B2als_v2 (2 vCPU, 4 GiB) · North Central US |
| IP estática | `135.232.198.103` |
| Nombre (host) | `easybus-unicordoba.northcentralus.cloudapp.azure.com` |
| Usuario SSH | `azureuser` |
| Clave SSH (en tu PC) | `C:\Users\HP\.ssh\easybus-vm_key.pem` |
| Puertos abiertos en Azure | 22 (SSH), 80 (HTTP), 443 (HTTPS) |
| Carpeta en la VM | `/opt/easybus` |

Cuando termines:

- API: `https://easybus-unicordoba.northcentralus.cloudapp.azure.com/api/v1`
- Panel: `https://easybus-unicordoba.northcentralus.cloudapp.azure.com/panel`
- Swagger (`/api/docs`) queda **apagado** en producción.

## Cómo queda armado

```
Internet ──80/443──► caddy ──► api (NestJS, :3000) ──► postgres + PostGIS
                     (HTTPS automático)                      ▲
                                                 respaldo (pg_dump diario, 7 días)
```

Son 4 contenedores definidos en [docker-compose.prod.yml](docker-compose.prod.yml), todos
con `restart: unless-stopped` (vuelven solos si la VM se reinicia). Solo Caddy publica
puertos; la base y la API no se ven desde Internet. Los datos viven en volúmenes de
Docker (`pgdata` para la base, `uploads` para las fotos), así que no se pierden al
actualizar o recrear los contenedores.

> **Dónde va cada comando.** `PS>` = PowerShell en tu computador.
> `$` = terminal de la VM (después de conectarte por SSH). No copies el `PS>` ni el `$`.

---

## 1. Conectarse a la VM por SSH

La primera vez, Windows exige que la clave solo la pueda leer tu usuario (si no, SSH
dice `UNPROTECTED PRIVATE KEY FILE`):

```powershell
PS> icacls "$env:USERPROFILE\.ssh\easybus-vm_key.pem" /inheritance:r
PS> icacls "$env:USERPROFILE\.ssh\easybus-vm_key.pem" /grant:r "$($env:USERNAME):(R)"
```

Conéctate (a la pregunta `Are you sure you want to continue connecting?` responde `yes`):

```powershell
PS> ssh -i "$env:USERPROFILE\.ssh\easybus-vm_key.pem" azureuser@easybus-unicordoba.northcentralus.cloudapp.azure.com
```

El indicador cambia a algo como `azureuser@easybus-vm:~$`. Para salir: `exit`.

## 2. Actualizar Ubuntu

```bash
$ sudo apt update && sudo apt upgrade -y
$ sudo apt install -y git curl ufw
```

Si al final dice que hace falta reiniciar: `sudo reboot`, espera 1 minuto y vuelve a
conectarte (paso 1).

## 3. Memoria de intercambio (swap) de 2 GB

La VM tiene 4 GiB. El swap evita que se quede sin memoria al construir la imagen.

```bash
$ sudo fallocate -l 2G /swapfile
$ sudo chmod 600 /swapfile
$ sudo mkswap /swapfile
$ sudo swapon /swapfile
$ echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
$ free -h        # la fila "Swap" debe decir 2.0Gi
```

## 4. Firewall (ufw)

**Primero** permite SSH; si activas ufw sin esto, te quedas por fuera de la VM.

```bash
$ sudo ufw allow OpenSSH
$ sudo ufw allow 80/tcp
$ sudo ufw allow 443/tcp
$ sudo ufw enable          # responde y
$ sudo ufw status          # debe listar 22, 80 y 443
```

> Ojo: Docker abre por su cuenta los puertos que publica un contenedor, sin pasar por
> ufw. Por eso en `docker-compose.prod.yml` solo Caddy publica puertos (80 y 443).

## 5. Instalar Docker

Script oficial de Docker (instala Docker Engine y `docker compose`):

```bash
$ curl -fsSL https://get.docker.com | sudo sh
$ sudo usermod -aG docker azureuser
$ exit
```

Vuelve a conectarte (paso 1) para que el grupo `docker` aplique, y comprueba:

```bash
$ docker version
$ docker compose version
```

## 6. Descargar el código en /opt/easybus

```bash
$ sudo mkdir -p /opt/easybus
$ sudo chown azureuser:azureuser /opt/easybus
$ git clone -b entrega-final https://github.com/cristianh1818/easybus-backend.git /opt/easybus
$ cd /opt/easybus
```

- Se usa la rama `entrega-final`. Cuando se una a `main`, cambia con
  `git checkout main && git pull`.
- Si el repositorio es **privado**, `git clone` pedirá usuario y contraseña: el usuario
  es el de GitHub y la "contraseña" es un *token* (GitHub → Settings → Developer
  settings → Personal access tokens → Fine-grained, con permiso de solo lectura de
  **Contents** sobre este repositorio).

## 7. Crear el archivo .env

```bash
$ cd /opt/easybus
$ cp .env.production.example .env
$ openssl rand -hex 32      # copia el resultado: será JWT_SECRET
$ openssl rand -hex 24      # copia el resultado: será DB_PASSWORD
$ nano .env
```

En `nano` cambia **todos** los valores que dicen `CAMBIAR`:

- `DB_PASSWORD`: el segundo valor aleatorio.
- `JWT_SECRET`: el primer valor aleatorio.
- `ADMIN_PASSWORD`: una clave fuerte (solo se usa si la base no tiene administrador;
  si migras tu base en el paso 9, sigue valiendo la clave de tu administrador local).
- `EASYBUS_HOST` ya trae `easybus-unicordoba.northcentralus.cloudapp.azure.com`.

Guarda con `Ctrl+O`, `Enter`, y sal con `Ctrl+X`. Protege el archivo:

```bash
$ chmod 600 .env
```

> No cambies `DB_PASSWORD` después de levantar la base: PostgreSQL guarda la clave la
> primera vez que crea el volumen. Si necesitas cambiarla, pregúntalo antes.

## 8. Levantar EASYBUS

```bash
$ cd /opt/easybus
$ docker compose up -d --build
```

La primera vez tarda unos minutos (descarga imágenes y compila la API). Luego:

```bash
$ docker compose ps
```

Deben aparecer `postgres`, `api`, `caddy` y `respaldo` en estado `Up`; `postgres` y `api`
con `(healthy)` después de ~1 minuto. Caddy pide el certificado HTTPS a Let's Encrypt
en el primer minuto (ver `docker compose logs caddy`).

Gracias a `COMPOSE_FILE` en el `.env`, no hace falta escribir `-f docker-compose.prod.yml`.

En este punto la base está **vacía** (solo con las tablas y el administrador del `.env`).

## 9. Pasar tus datos locales a la VM

Copia tu base local (contenedor `easybus-db`, con rutas, embarcaderos, horarios,
festivos, auditoría…) y tus fotos (carpeta `uploads`).

**En tu computador** (Docker Desktop encendido), desde la carpeta del backend:

```powershell
PS> cd C:\Users\HP\Desktop\easybus-backend
PS> powershell -ExecutionPolicy Bypass -File deploy\exportar-datos.ps1
```

El script ([deploy/exportar-datos.ps1](deploy/exportar-datos.ps1)) solo **lee** tu base
local: crea `backups\migracion\easybus.dump` y `backups\migracion\uploads.tgz` y los
sube con `scp` a `~/migracion/` en la VM. (Con `-NoSubir` solo los crea.)

**En la VM:**

```bash
$ cd /opt/easybus
$ bash deploy/restaurar-datos.sh
```

Pregunta `¿Seguir? (si/no)`: escribe `si`. El script
([deploy/restaurar-datos.sh](deploy/restaurar-datos.sh)):

1. Detiene la API.
2. Guarda lo que había en `backups/antes_de_restaurar_<fecha>.dump`.
3. Reemplaza la base por la tuya.
4. Reemplaza las fotos por las tuyas.
5. Enciende todo y espera a que `/api/v1/health` responda `ok`.

Puedes repetirlo cuantas veces quieras (por ejemplo, el día antes de la demo, para
llevar los últimos cambios del panel local). **Ojo:** reemplaza todo lo que se haya
hecho en el panel de la VM.

## 10. Verificar

Desde tu computador, en el navegador o en PowerShell:

```powershell
PS> curl.exe https://easybus-unicordoba.northcentralus.cloudapp.azure.com/api/v1/health
```

Debe responder `{"status":"ok","database":"up",...}`. Luego abre en el navegador:

- `https://easybus-unicordoba.northcentralus.cloudapp.azure.com/panel` → inicia sesión
  con tu administrador y revisa rutas, embarcaderos y fotos.
- `https://easybus-unicordoba.northcentralus.cloudapp.azure.com/api/v1/rutas` → JSON con BS-1.
- El candado del navegador debe mostrar un certificado válido (Let's Encrypt).

Para la app que apunte al servidor, ver `PROGRESO.md` del repo `easybus_app`
(compilar la APK con `--dart-define=API_BASE_URL=https://.../api/v1`).

---

## Día a día

### Actualizar a una versión nueva del código

```bash
$ cd /opt/easybus
$ git pull
$ docker compose up -d --build
$ docker image prune -f        # borra imágenes viejas para no llenar el disco
```

Las migraciones nuevas de la base se aplican solas al arrancar la API
(`DB_MIGRATIONS_RUN=true`). Los datos y las fotos no se tocan.

### Cambiar la clave del administrador

Después de migrar tu base, el administrador tiene la misma clave que en tu computador.
Cámbiala en la VM por una propia del servidor:

```bash
$ cd /opt/easybus
$ bash deploy/cambiar-clave-admin.sh
```

Pide el correo del administrador y la clave nueva dos veces (no se ve al escribir;
mínimo 12 caracteres). El script ([deploy/cambiar-clave-admin.sh](deploy/cambiar-clave-admin.sh))
calcula el hash dentro del contenedor de la API, con la misma librería (`bcryptjs`) y el
mismo costo que usa la API, y solo guarda el hash en la tabla `usuarios`. La clave no
queda en el historial de la terminal, ni en la lista de procesos, ni en los logs.

- Necesita la API encendida y actualizada: si dice "versión anterior", ejecuta antes
  `docker compose up -d --build`.
- Las sesiones abiertas siguen valiendo hasta que vence su token (1 hora).
- Si vuelves a ejecutar el paso 9 (restaurar tu base local), vuelve la clave de tu
  computador: repite este cambio.

### Ver logs (registros)

```bash
$ docker compose logs --tail 100 api        # últimas 100 líneas de la API
$ docker compose logs -f api                # en vivo (Ctrl+C para salir)
$ docker compose logs --tail 50 caddy       # certificado HTTPS y peticiones
$ docker compose logs respaldo              # respaldos diarios
```

Los logs de cada contenedor se limitan a 3 archivos de 10 MB.

### Reiniciar, detener, encender

```bash
$ docker compose restart api     # reiniciar solo la API
$ docker compose stop            # detener todo (los datos se conservan)
$ docker compose up -d           # encender todo
$ docker compose ps              # estado
```

> **Nunca** uses `docker compose down -v`: la `-v` borra los volúmenes, es decir, la
> base de datos y las fotos.

## Respaldos

El servicio `respaldo` ([deploy/respaldo.sh](deploy/respaldo.sh)) guarda cada día, a
partir de las 3:00 a. m. (hora de Colombia), en `/opt/easybus/backups/`:

- `easybus_AAAAMMDD.dump`: la base completa.
- `uploads_AAAAMMDD.tgz`: las fotos.

Se conservan los últimos 7 días (`DIAS_RESPALDO` en el `.env`).

> **Permisos de `backups/`.** Docker crea esa carpeta como `root` (la primera vez que
> arranca el servicio `respaldo`), así que `azureuser` puede leer los respaldos (y
> bajarlos con `scp`) pero no crear ni borrar archivos ahí. Los scripts no lo necesitan
> (escriben a través del contenedor), pero si quieres borrar o mover respaldos a mano,
> haz una vez:
>
> ```bash
> $ sudo chown -R azureuser:azureuser /opt/easybus/backups
> ```
>
> Los respaldos nuevos seguirán saliendo a nombre de `root`; repite el `chown` si
> necesitas borrar alguno.

Respaldo inmediato (por ejemplo, antes de una actualización):

```bash
$ docker compose exec respaldo sh /respaldo.sh ahora
$ ls -lh /opt/easybus/backups
```

Bajar los respaldos a tu computador (la VM podría borrarse; ten una copia fuera):

```powershell
PS> scp -i "$env:USERPROFILE\.ssh\easybus-vm_key.pem" "azureuser@easybus-unicordoba.northcentralus.cloudapp.azure.com:/opt/easybus/backups/*" C:\Users\HP\Desktop\respaldos-easybus\
```

(Crea antes la carpeta `respaldos-easybus`.)

Restaurar un respaldo de la propia VM: usa el mismo script del paso 9 con una carpeta
que tenga `easybus.dump` (y opcionalmente `uploads.tgz`):

```bash
$ mkdir -p ~/restaurar
$ cp /opt/easybus/backups/easybus_20261201.dump ~/restaurar/easybus.dump
$ cp /opt/easybus/backups/uploads_20261201.tgz ~/restaurar/uploads.tgz
$ bash deploy/restaurar-datos.sh ~/restaurar
```

## Costos: crédito de Azure, detener o reducir la VM

**Revisar cuánto llevas gastado:**

- Cuenta *Azure for Students*: <https://www.microsoftazuresponsorships.com/Balance>
  muestra el crédito restante.
- En el portal (<https://portal.azure.com>): busca **Administración de costos**
  (*Cost Management*) → **Análisis de costos**, filtrando por el grupo de recursos de
  `easybus-vm`.
- Recomendado: **Administración de costos → Presupuestos → Agregar**, con un monto
  pequeño y una alerta por correo al 50 % y al 80 %.

**Qué cobra Azure** (aproximado, confírmalo en la
[calculadora de precios](https://azure.microsoft.com/pricing/calculator/)):

- La VM B2als_v2 encendida: del orden de 0,04 USD por hora (≈ 27–30 USD al mes si está
  encendida las 24 horas). Solo se cobra mientras está **encendida**.
- El disco y la IP estática: unos pocos dólares al mes, se cobran **aunque la VM esté
  detenida**.

**Detener la VM cuando no se use** (no se pierde nada; la IP y el nombre se mantienen
porque la IP es estática):

- Portal → Máquinas virtuales → `easybus-vm` → **Detener**. Debe quedar en
  **Detenida (desasignada)**. Si dice solo "Detenida", sigue cobrando: usa el botón
  del portal, no `sudo shutdown` dentro de la VM.
- Para volver: **Iniciar**. EASYBUS arranca solo en 1–2 minutos (Docker se inicia con la
  VM y los contenedores tienen `restart: unless-stopped`).
- Apagado automático diario: `easybus-vm` → **Operaciones → Apagado automático**, por
  ejemplo a las 11:00 p. m. (hora de Colombia, UTC−5).

**Reducir el tamaño** (más barato, más lento): `easybus-vm` → **Tamaño** → por ejemplo
`Standard_B1ms` (1 vCPU, 2 GiB). La VM se reinicia. Con 2 GiB, el swap de 2 GB del
paso 3 es necesario y `docker compose up -d --build` tardará más. No bajes de 2 GiB.

**Borrar todo** (cuando el proyecto termine): primero baja los respaldos a tu
computador; después borra el **grupo de recursos** completo de la VM (borra VM, disco,
IP y red; no se puede deshacer).

## Problemas comunes

| Síntoma | Qué revisar |
|---|---|
| `ssh` dice `UNPROTECTED PRIVATE KEY FILE` | Paso 1 (`icacls`). |
| `ssh` no conecta (`timed out`) | ¿La VM está iniciada en el portal? ¿Puerto 22 abierto en Azure? |
| El navegador dice que el certificado no es válido | `docker compose logs caddy`. Puertos 80 y 443 abiertos en Azure y en ufw; `EASYBUS_HOST` bien escrito en el `.env`; luego `docker compose restart caddy`. |
| `502 Bad Gateway` | La API no está arriba: `docker compose ps` y `docker compose logs --tail 100 api`. |
| `api` en `unhealthy` | La API no llega a la base: revisa `DB_*` en el `.env` y `docker compose logs postgres`. |
| Error 429 (demasiadas peticiones) | Límite de 100 peticiones por minuto por IP; espera un minuto. |
| Se llena el disco | `df -h`; `docker image prune -f`; `docker system df`. |
