# Quick setup script for multiple DataHive workers (PowerShell)
# This script helps you quickly create multiple worker configurations

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "DataHive Multi-Worker Setup Script" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Check if PM2 is installed
$pm2Installed = Get-Command pm2 -ErrorAction SilentlyContinue
if (-not $pm2Installed) {
    Write-Host "⚠️  PM2 is not installed. Installing now..." -ForegroundColor Yellow
    npm install -g pm2
    Write-Host "✅ PM2 installed successfully" -ForegroundColor Green
}

# Ask for JWT token
Write-Host "Please enter your DataHive JWT token:" -ForegroundColor Cyan
$JWT_TOKEN = Read-Host

if ([string]::IsNullOrWhiteSpace($JWT_TOKEN)) {
    Write-Host "❌ JWT token is required" -ForegroundColor Red
    exit 1
}

# Ask for number of workers
Write-Host ""
Write-Host "How many workers do you want to run? (1-10)" -ForegroundColor Cyan
$NUM_WORKERS = Read-Host

# Validate number
if (-not ($NUM_WORKERS -match '^\d+$') -or [int]$NUM_WORKERS -lt 1 -or [int]$NUM_WORKERS -gt 10) {
    Write-Host "❌ Please enter a number between 1 and 10" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Creating configuration for $NUM_WORKERS workers..." -ForegroundColor Yellow
Write-Host ""

# Create logs directory
New-Item -ItemType Directory -Force -Path "logs" | Out-Null

# Create .env files for each worker
for ($i = 1; $i -le [int]$NUM_WORKERS; $i++) {
    $DEVICE_ID = "worker-$env:COMPUTERNAME-$(Get-Date -Format 'yyyyMMddHHmmss')-$i"
    $JOB_INTERVAL = 60000 + (($i - 1) * 5000) # Stagger by 5 seconds
    
    $envContent = @"
# DataHive Worker $i Configuration
# Generated on $(Get-Date)

DATAHIVE_JWT=$JWT_TOKEN
DATAHIVE_DEVICE_ID=$DEVICE_ID

# Job processing configuration
DATAHIVE_JOB_INTERVAL=$JOB_INTERVAL
DATAHIVE_PING_INTERVAL=120000
DATAHIVE_RELOAD_AFTER_JOBS=0
DATAHIVE_ENABLE_PERFORMANCE_TRACKING=true
DATAHIVE_MAX_CONCURRENT_JOBS=1
DATAHIVE_TIMEOUT=60000
"@
    
    Set-Content -Path ".env.device$i" -Value $envContent
    Write-Host "✅ Created .env.device$i (Device ID: $DEVICE_ID)" -ForegroundColor Green
}

Write-Host ""
Write-Host "Creating PM2 ecosystem config..." -ForegroundColor Yellow

# Generate PM2 config
$configHeader = @"
module.exports = {
  apps: [
"@

$configApps = @()
for ($i = 1; $i -le [int]$NUM_WORKERS; $i++) {
    $comma = if ($i -eq [int]$NUM_WORKERS) { "" } else { "," }
    $configApps += @"
    {
      name: 'datahive-worker-$i',
      script: './datahive.js',
      env_file: '.env.device$i',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '700M',
      error_file: './logs/worker$i-error.log',
      out_file: './logs/worker$i-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }$comma
"@
}

$configFooter = @"
  ]
};
"@

$fullConfig = $configHeader + "`n" + ($configApps -join "`n") + "`n" + $configFooter
Set-Content -Path "ecosystem.config.js" -Value $fullConfig

Write-Host "✅ Created ecosystem.config.js" -ForegroundColor Green
Write-Host ""

# Ask if user wants to start workers
Write-Host "Configuration complete! Do you want to start the workers now? (y/n)" -ForegroundColor Cyan
$START_NOW = Read-Host

if ($START_NOW -eq "y" -or $START_NOW -eq "Y") {
    Write-Host ""
    Write-Host "Starting workers..." -ForegroundColor Yellow
    pm2 start ecosystem.config.js
    
    Write-Host ""
    Write-Host "✅ Workers started successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Useful commands:" -ForegroundColor Cyan
    Write-Host "  pm2 list          - View all workers"
    Write-Host "  pm2 logs          - View logs"
    Write-Host "  pm2 monit         - Monitor resources"
    Write-Host "  pm2 restart all   - Restart all workers"
    Write-Host "  pm2 stop all      - Stop all workers"
    Write-Host ""
    Write-Host "To enable auto-start on system reboot:" -ForegroundColor Cyan
    Write-Host "  pm2 startup"
    Write-Host "  pm2 save"
}
else {
    Write-Host ""
    Write-Host "To start the workers later, run:" -ForegroundColor Yellow
    Write-Host "  pm2 start ecosystem.config.js"
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Setup Complete! 🎉" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
