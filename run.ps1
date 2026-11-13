param(
    [switch]$SkipInstall
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Join-Path $Root "backend"
$FrontendDir = Join-Path $Root "frontend"
$VenvDir = Join-Path $BackendDir ".venv"
$VenvPython = Join-Path $VenvDir "Scripts\python.exe"

function Resolve-Python {
    $python = Get-Command python -ErrorAction SilentlyContinue
    if ($python) {
        return @{ Executable = $python.Source; PrefixArgs = @() }
    }

    $launcher = Get-Command py -ErrorAction SilentlyContinue
    if ($launcher) {
        return @{ Executable = $launcher.Source; PrefixArgs = @("-3") }
    }

    $localPython = Get-ChildItem `
        -Path (Join-Path $env:LocalAppData "Programs\Python\Python*\python.exe") `
        -ErrorAction SilentlyContinue |
        Sort-Object FullName -Descending |
        Select-Object -First 1
    if ($localPython) {
        return @{ Executable = $localPython.FullName; PrefixArgs = @() }
    }

    throw "Python 3.10+ was not found. Install it from https://www.python.org/downloads/ and try again."
}

if (-not (Test-Path $VenvPython)) {
    $pythonCommand = Resolve-Python
    & $pythonCommand.Executable @($pythonCommand.PrefixArgs) -m venv $VenvDir
}

if (-not $SkipInstall) {
    & $VenvPython -m pip install --disable-pip-version-check -r (Join-Path $BackendDir "requirements.txt")
    Push-Location $FrontendDir
    try {
        npm install
    }
    finally {
        Pop-Location
    }
}

$backend = $null
$frontend = $null

try {
    $backend = Start-Process `
        -FilePath $VenvPython `
        -ArgumentList @("-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000", "--reload") `
        -WorkingDirectory $BackendDir `
        -NoNewWindow `
        -PassThru

    $frontend = Start-Process `
        -FilePath "npm.cmd" `
        -ArgumentList @("run", "dev", "--", "--host", "127.0.0.1") `
        -WorkingDirectory $FrontendDir `
        -NoNewWindow `
        -PassThru

    Write-Host ""
    Write-Host "Dashboard: http://127.0.0.1:5173"
    Write-Host "API:      http://127.0.0.1:8000/docs"
    Write-Host "Press Ctrl+C to stop."

    while (-not $backend.HasExited -and -not $frontend.HasExited) {
        Start-Sleep -Milliseconds 500
    }

    if ($backend.HasExited) {
        throw "Backend stopped with exit code $($backend.ExitCode)."
    }
    if ($frontend.HasExited) {
        throw "Frontend stopped with exit code $($frontend.ExitCode)."
    }
}
finally {
    if ($backend -and -not $backend.HasExited) {
        Stop-Process -Id $backend.Id -Force -ErrorAction SilentlyContinue
    }
    if ($frontend -and -not $frontend.HasExited) {
        Stop-Process -Id $frontend.Id -Force -ErrorAction SilentlyContinue
    }
}
