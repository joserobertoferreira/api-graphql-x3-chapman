# --- Config ---
$ServiceName = "apiGraphqlX3"

# --- Script Start ---
Write-Host "Starting API deployment: $ServiceName" -ForegroundColor Yellow

cd $PSScriptRoot

# 1. Pulls the latest changes from the Git repository
Write-Host "1. Pulling changes from Git..."
git pull origin main
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to execute 'git pull'." -ForegroundColor Red
    exit 1
}

# 2. Activate the correct version of Node.js by reading the .nvmrc
Write-Host "2. Enabling the project's Node.js version..."
nvm use 22.14.0
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to execute 'nvm use'. Check if the version in .nvmrc is installed." -ForegroundColor Red
    exit 1
}
Write-Host "Active Node.js version: $(node -v)" -ForegroundColor Green

# 3. Install/update npm dependencies
Write-Host "3. Installing dependencies (npm install)..."
npm install --production
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to execute 'npm install'." -ForegroundColor Red
    exit 1
}

# 4. Generate Prisma client
Write-Host "4. Generate Prisma client..."
npx prisma generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to execute 'npx prisma generate'." -ForegroundColor Red
    exit 1
}

# 5. Build the application
Write-Host "5. Compiling the application (npm run build)..."
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to execute 'npm run build'." -ForegroundColor Red
    exit 1
}

# 6. Restart Windows service via NSSM
Write-Host "6. Restarting the service '$ServiceName'..."
nssm restart $ServiceName
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to restart the service with NSSM." -ForegroundColor Red
    exit 1
}

Write-Host "Deployment completed successfully!" -ForegroundColor Green
