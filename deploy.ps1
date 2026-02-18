$ErrorActionPreference = "Stop"

Write-Host "Starting Fly.io Deployment..." -ForegroundColor Cyan

# 1. Check for Fly CLI
if (-not (Get-Command fly -ErrorAction SilentlyContinue)) {
    Write-Error "Error: 'fly' command not found. Please install Fly CLI first: https://fly.io/docs/hands-on/install-flyctl/"
    exit 1
}

# 2. Configuration
$AppName = "family-budget-ydko-01"
$Org = "personal" # Default org
$Region = "nrt"   # Tokyo

# 3. Create App (Ignore error if already exists)
Write-Host "Creating App '$AppName'..."
try {
    fly apps create $AppName --org $Org
} catch {
    Write-Warning "App '$AppName' might already exist or creation failed. Proceeding to deploy..."
}

# 4. Deploy
Write-Host "Deploying to Fly.io..."
$EnvVars = @(
    "VITE_SUPABASE_URL=https://kzqtvqccaixjxwfklntu.supabase.co",
    "VITE_SUPABASE_ANON_KEY=sb_publishable_2EnRsPd5avunyncTVCEufA_yMLCv20P"
)

# Construct build args string
$BuildArgs = $EnvVars | ForEach-Object { "--build-arg $_" }

# Execute deploy
# Note: Splatting args or direct string interpolation
$DeployCmd = "fly deploy $BuildArgs"
Invoke-Expression $DeployCmd

if ($LASTEXITCODE -eq 0) {
    Write-Host "Deployment Successful!" -ForegroundColor Green
    Write-Host "Your app should be live at: https://$AppName.fly.dev"
} else {
    Write-Error "Deployment Failed."
}
