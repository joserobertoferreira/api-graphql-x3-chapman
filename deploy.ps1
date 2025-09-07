param([switch]$SkipGitPull, [switch]$SkipBuild)

# --- Config ---
# Import configuration variables
. "$PSScriptRoot\_config.ps1"

# Script Start ---
Write-Host "Starting API deployment: $Global:ServiceName" -ForegroundColor Yellow

# Navigate to the script directory to ensure paths are correct
cd $PSScriptRoot

try {
    # Stop service (release files to update)
    Write-Host "1. Stopping the service '$Global:ServiceName'..." -ForegroundColor Cyan
    nssm stop $Global:ServiceName

    if (-not $SkipGitPull.IsPresent) {
        Write-Host "2. Git Operations Enabled" -ForegroundColor Cyan

        # Clear the working directory to avoid old artifacts
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
        }
    }
    else {
        Write-Host "2. Skipped Git operations as requested by the -SkipGitPull flag." -ForegroundColor Cyan
    }

    # Activate the correct version of Node.js by reading the .nvmrc automatically
    Write-Host "3. Enabling the project's Node.js version (from .nvmrc)..."

    # Define the path to the .nvmrc file
    $nvmrcPath = Join-Path $PSScriptRoot ".nvmrc"

    # Check if the .nvmrc file exists
    if (-not (Test-Path $nvmrcPath)) {
        Write-Host "ERROR: .nvmrc file not found in the project root." -ForegroundColor Red
    }

    # Read the Node.js version from the .nvmrc file and trim any extra whitespace
    $nodeVersion = (Get-Content $nvmrcPath -Raw).Trim()

    # Check if the read version is not empty
    if ([string]::IsNullOrWhiteSpace($nodeVersion)) {
        Write-Host "ERROR: .nvmrc file is empty." -ForegroundColor Red
    }

    Write-Host "   - Version specified in .nvmrc: $nodeVersion"

    nvm use $nodeVersion
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to execute 'nvm use $nodeVersion'." -ForegroundColor Red
        Write-Host "   - Please ensure this version is installed by running: nvm install $nodeVersion"
    }
    Write-Host "Active Node.js version: $(node -v)" -ForegroundColor Green

    # Install ALL dependencies (including devDependencies needed for build)
    Write-Host "4. Installing ALL dependencies (npm install)..."
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to execute 'npm install'." -ForegroundColor Red
    }

    # Generate Prisma client
    Write-Host "5. Generating Prisma client..."
    npx prisma generate
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to execute 'npx prisma generate'." -ForegroundColor Red
    }

    # Build the application
    if (-not $SkipBuild.IsPresent) {
      Write-Host "6. Compiling the application (npm run build)..."
      npm run build
      if ($LASTEXITCODE -ne 0) {
          Write-Host "ERROR: Failed to execute 'npm run build'." -ForegroundColor Red
      }
    }
    else {
        Write-Host "6. Skipped build step as requested (using pre-compiled 'dist' folder)." -ForegroundColor Cyan
    }

    # Prune devDependencies to keep the production folder clean
    Write-Host "7. Removing development dependencies (npm prune)..."
    npm prune --production
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to prune devDependencies." -ForegroundColor Red
    }
} catch {
    Write-Host "--------------------------------------------------------" -ForegroundColor Red
    Write-Host "ERROR: Deployment failed at one of the steps." -ForegroundColor Red
    Write-Host "Error message: $_" -ForegroundColor Red
    Write-Host "--------------------------------------------------------"
} finally {
    # Cleanup source files and ensure the service is started
    Write-Host "7. Cleaning up source and configuration files..." -ForegroundColor Cyan

    # Lista de arquivos e pastas a serem removidos
    $filesToRemove = @(
        ".editorconfig",
        "eslint.config.mjs",
        ".prettierrc.js",
        "tsconfig.build.json",
        "tsconfig.json",
        "README.md",
        "generate-headers.js",
        "nest-cli.json"
    )
    $foldersToRemove = @(
        "src",
        "test" # Se você tiver uma pasta de testes
    )

    foreach ($file in $filesToRemove) {
        if (Test-Path $file) {
            Write-Host "   - Removing file: $file"
            Remove-Item -Path $file -Force
        }
    }

    foreach ($folder in $foldersToRemove) {
        if (Test-Path $folder) {
            Write-Host "   - Removing folder: $folder"
            Remove-Item -Path $folder -Recurse -Force
        }
    }

    Write-Host "Cleanup complete." -ForegroundColor Green

    # Ensure the service is started even if an error occurred
    Write-Host "Ensuring the service '$Global:ServiceName' is started..." -ForegroundColor Cyan
    nssm restart $Global:ServiceName

    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to restart the service with NSSM." -ForegroundColor Red
    } else {
        Write-Host "Deployment completed successfully and the service '$Global:ServiceName' is running." -ForegroundColor Green
    }
}
