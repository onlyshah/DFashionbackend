# Securely run Postgres seeder
# Prompts for Postgres password locally (secure string), sets it for the child process,
# runs the Node seeder, then clears the variable.

Write-Host "🔐 Postgres seeder runner"

$pgUser = Read-Host "Postgres user (default: postgres)" -AsSecureString:$false
if ([string]::IsNullOrWhiteSpace($pgUser)) { $pgUser = 'postgres' }

$secure = Read-Host "Enter Postgres password" -AsSecureString
$ptr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
$pwd = [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
[System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)

try {
    Write-Host "⚡ Running seeder with user: $pgUser"
    $env:PGUSER = $pgUser
    $env:PGPASSWORD = $pwd

    # Ensure working directory is repository backend
    Push-Location -Path (Split-Path -Path $MyInvocation.MyCommand.Path -Parent) | Out-Null
    # Move to project root (assumes script is in scripts/)
    Set-Location ..

    Write-Host "📁 Current directory: $(Get-Location)"
    Write-Host "🚀 Starting Postgres bootstrap seeder..."
    node scripts/seedPostgresBootstrap.js
} finally {
    # Clear sensitive data
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    Remove-Item Env:PGUSER -ErrorAction SilentlyContinue
    if ($pwd) { $pwd = $null }
    Write-Host "🔒 Seeder run finished. Password cleared from environment."
    Pop-Location | Out-Null
}
