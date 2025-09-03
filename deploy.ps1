param([switch]$SkipGitPull, [switch]$SkipBuild)

# --- Config ---
# Importa a configuração
. "$PSScriptRoot\_config.ps1"

# --- Script Start ---
Write-Host "Starting API deployment: $Global:ServiceName" -ForegroundColor Yellow

# Navega para o diretório do script para garantir que os caminhos estejam corretos
cd $PSScriptRoot

if (-not $SkipGitPull.IsPresent) {
    Write-Host "1. Git Operations Enabled" -ForegroundColor Cyan

    # Limpa o diretório de trabalho para evitar artefatos antigos
    Write-Host "   - Cleaning work directory (git clean)..."
    git clean -fdx
    if ($LASTEXITCODE -ne 0) {
        Write-Host "WARNING: 'git clean' failed. Continuing deployment, but old files might remain." -ForegroundColor Magenta
    }

    # Pulls the latest changes from the Git repository
    Write-Host "   - Pulling changes from Git..."
    git pull origin main
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to execute 'git pull'." -ForegroundColor Red
        exit 1
    }
}
else {
    Write-Host "1. Skipped Git operations as requested by the -SkipGitPull flag." -ForegroundColor Cyan
}

# 2. Activate the correct version of Node.js by reading the .nvmrc automatically
Write-Host "2. Enabling the project's Node.js version (from .nvmrc)..."

# Define o caminho para o arquivo .nvmrc
$nvmrcPath = Join-Path $PSScriptRoot ".nvmrc"

# Verifica se o arquivo .nvmrc existe
if (-not (Test-Path $nvmrcPath)) {
    Write-Host "ERROR: .nvmrc file not found in the project root." -ForegroundColor Red
    exit 1
}

# Lê a versão do Node.js do arquivo .nvmrc e remove espaços em branco extras
$nodeVersion = (Get-Content $nvmrcPath -Raw).Trim()

# Verifica se a versão lida não está vazia
if ([string]::IsNullOrWhiteSpace($nodeVersion)) {
    Write-Host "ERROR: .nvmrc file is empty." -ForegroundColor Red
    exit 1
}

Write-Host "   - Version specified in .nvmrc: $nodeVersion"

nvm use $nodeVersion
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to execute 'nvm use $nodeVersion'." -ForegroundColor Red
    Write-Host "   - Please ensure this version is installed by running: nvm install $nodeVersion"
    exit 1
}
Write-Host "Active Node.js version: $(node -v)" -ForegroundColor Green

# 3. Install ALL dependencies (including devDependencies needed for build)
Write-Host "3. Installing ALL dependencies (npm install)..."
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to execute 'npm install'." -ForegroundColor Red
    exit 1
}

# 4. Generate Prisma client
Write-Host "4. Generating Prisma client..."
npx prisma generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to execute 'npx prisma generate'." -ForegroundColor Red
    exit 1
}

# 5. Build the application
if (-not $SkipBuild.IsPresent) {
  Write-Host "5. Compiling the application (npm run build)..."
  npm run build
  if ($LASTEXITCODE -ne 0) {
      Write-Host "ERROR: Failed to execute 'npm run build'." -ForegroundColor Red
      exit 1
  }
}
else {
    Write-Host "5. Skipped build step as requested (using pre-compiled 'dist' folder)." -ForegroundColor Cyan
}

# 6. Prune devDependencies to keep the production folder clean
Write-Host "6. Removing development dependencies (npm prune)..."
npm prune --production
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to prune devDependencies." -ForegroundColor Red
    exit 1
}

# 7. Restart Windows service via NSSM
Write-Host "7. Restarting the service '$Global:ServiceName'..."
nssm restart $Global:ServiceName
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to restart the service with NSSM." -ForegroundColor Red
    exit 1
}

Write-Host "Deployment completed successfully!" -ForegroundColor Green
