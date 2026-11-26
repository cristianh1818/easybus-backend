# Exporta la base local de EASYBUS (contenedor easybus-db) y la carpeta uploads,
# y los sube a la VM con scp. Después, en la VM: bash deploy/restaurar-datos.sh
#
# Uso (PowerShell, desde la carpeta easybus-backend):
#   powershell -ExecutionPolicy Bypass -File deploy\exportar-datos.ps1
#   powershell -ExecutionPolicy Bypass -File deploy\exportar-datos.ps1 -NoSubir   # solo exportar
#
# Solo LEE la base local (pg_dump): no cambia ningún dato.
param(
  [string]$Servidor = 'azureuser@easybus-unicordoba.northcentralus.cloudapp.azure.com',
  [string]$Clave = "$env:USERPROFILE\.ssh\easybus-vm_key.pem",
  [string]$Contenedor = 'easybus-db',
  [switch]$NoSubir
)
$ErrorActionPreference = 'Stop'
$raiz = Split-Path -Parent $PSScriptRoot
Set-Location $raiz

# Lee DB_NAME y DB_USER del .env local
$envVars = @{}
Get-Content (Join-Path $raiz '.env') | ForEach-Object {
  if ($_ -match '^\s*([A-Z_]+)\s*=\s*(.*)$') { $envVars[$Matches[1]] = $Matches[2].Trim() }
}
$db = $envVars['DB_NAME']; $usuario = $envVars['DB_USER']
if (-not $db -or -not $usuario) { throw 'Faltan DB_NAME o DB_USER en el .env' }

$salida = Join-Path $raiz 'backups\migracion'
New-Item -ItemType Directory -Force $salida | Out-Null
$dump = Join-Path $salida 'easybus.dump'
$fotos = Join-Path $salida 'uploads.tgz'

Write-Host "1/3 Exportando la base '$db' del contenedor $Contenedor..."
# Se guarda dentro del contenedor y se copia con docker cp: pasar datos binarios
# por la tubería de PowerShell 5.1 los corrompe.
docker exec $Contenedor pg_dump -U $usuario -d $db -Fc --no-owner --no-acl -f /tmp/easybus.dump
if ($LASTEXITCODE -ne 0) { throw 'pg_dump falló. ¿Está encendido Docker Desktop y el contenedor easybus-db?' }
docker cp "${Contenedor}:/tmp/easybus.dump" $dump
if ($LASTEXITCODE -ne 0) { throw 'docker cp falló' }
docker exec $Contenedor rm -f /tmp/easybus.dump | Out-Null

Write-Host '2/3 Empaquetando la carpeta uploads (fotos)...'
if (-not (Test-Path (Join-Path $raiz 'uploads'))) { New-Item -ItemType Directory (Join-Path $raiz 'uploads') | Out-Null }
tar.exe -czf $fotos -C $raiz uploads
if ($LASTEXITCODE -ne 0) { throw 'tar falló' }

Get-Item $dump, $fotos | Format-Table Name, @{ n = 'KB'; e = { [math]::Round($_.Length / 1KB) } } -AutoSize

if ($NoSubir) {
  Write-Host "Listo (sin subir). Archivos en $salida"
  exit 0
}

Write-Host "3/3 Subiendo a ${Servidor}:~/migracion/ ..."
ssh -i $Clave $Servidor 'mkdir -p ~/migracion'
if ($LASTEXITCODE -ne 0) { throw 'No se pudo conectar por SSH (revisa la clave y el servidor)' }
scp -i $Clave $dump $fotos "${Servidor}:~/migracion/"
if ($LASTEXITCODE -ne 0) { throw 'scp falló' }
Write-Host 'Listo. Ahora en la VM: cd /opt/easybus && bash deploy/restaurar-datos.sh'
