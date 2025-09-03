param([switch]$NoStart)

# Importa a configuração
. "$PSScriptRoot\_config.ps1"

$ProjectRoot = $PSScriptRoot # O diretório onde os scripts estão
$ApplicationStartupFile = Join-Path $ProjectRoot "dist\main.js"

Write-Host "This script will REMOVE and RECREATE the service '$Global:ServiceName'." -ForegroundColor Red
$confirmation = Read-Host "Are you sure you want to continue? (y/n)"

if ($confirmation -ne 'y') {
    Write-Host "Operation cancelled."
    exit 0
}

# --- Determinação Dinâmica do Caminho do Node.js ---
Write-Host "Determining active Node.js path via NVM..."
# Verifica se a variável de ambiente NVM_SYMLINK existe
if (-not $env:NVM_SYMLINK) {
    Write-Host "ERROR: NVM_SYMLINK environment variable not found. Is nvm-windows installed and configured correctly?" -ForegroundColor Red
    exit 1
}

# Constrói o caminho completo para o executável do node
$NodeExecutablePath = Join-Path $env:NVM_SYMLINK "node.exe"

# Validação: Verifica se o arquivo node.exe realmente existe no caminho encontrado
if (-not (Test-Path $NodeExecutablePath -PathType Leaf)) {
    Write-Host "ERROR: Could not find node.exe at the expected path: $NodeExecutablePath" -ForegroundColor Red
    Write-Host "Please check your NVM installation."
    exit 1
}
Write-Host "Found active Node.js at: $NodeExecutablePath" -ForegroundColor Green
# --- Fim da Determinação do Caminho ---


Write-Host "Stopping service..."
nssm stop $Global:ServiceName | Out-Null

Write-Host "Removing service..."
nssm remove $Global:ServiceName confirm
if ($LASTEXITCODE -ne 0) {
    Write-Host "WARNING: Failed to remove service. It might not have existed. Continuing..." -ForegroundColor Yellow
}

Write-Host "Installing new service..."
# Usa a variável com o caminho dinâmico que acabamos de encontrar
nssm install $Global:ServiceName $NodeExecutablePath $ApplicationStartupFile
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to install the service with NSSM." -ForegroundColor Red
    exit 1
}

Write-Host "Setting service AppDirectory to project root..."
nssm set $Global:ServiceName AppDirectory $ProjectRoot
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to set AppDirectory for the service." -ForegroundColor Red
    exit 1
}

if (-not $NoStart.IsPresent) {
  Write-Host "Starting service..."
  nssm start $Global:ServiceName
  if ($LASTEXITCODE -ne 0) {
      Write-Host "ERROR: Failed to start the service." -ForegroundColor Red
      exit 1
  }
}
else {
    Write-Host "Service was created but NOT started as requested by the -NoStart flag." -ForegroundColor Cyan
    Write-Host "The service will be started by the deploy script."
}

Write-Host "Service '$Global:ServiceName' recreated successfully." -ForegroundColor Green
