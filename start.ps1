param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("up","down")]
    [string]$Action
)

$rootDir = Get-Location
$pidsFile = Join-Path $rootDir ".pids"

function Start-ServiceFolder {
    param([string]$folderName, [string]$argumentList)
    $servicePath = Join-Path $rootDir $folderName

    Write-Host "---------------------------------------------"
    Write-Host "Entrando na pasta $folderName..."
    Set-Location $servicePath

    if (Test-Path "package.json") {
        Write-Host "Instalando dependencias..."
        npm install | Out-Null

        Write-Host "Gerando build..."
        npm run build | Out-Null

        Write-Host "Iniciando o servico $folderName..."
        $proc = Start-Process -FilePath "npm" `
                              -ArgumentList $argumentList `
                              -WorkingDirectory $servicePath `
                              -PassThru `
                              -NoNewWindow

        Add-Content $pidsFile "${folderName}:$($proc.Id)"
    } else {
        Write-Host "ATENCAO: Nenhum package.json encontrado em $servicePath - pulando..."
    }

    Set-Location $rootDir
}

function Stop-Services {
    Write-Host "---------------------------------------------"
    if (Test-Path $pidsFile) {
        Get-Content $pidsFile | ForEach-Object {
            $parts = $_ -split ":"
            $name = $parts[0]
            $pid = [int]$parts[1]
            if (Get-Process -Id $pid -ErrorAction SilentlyContinue) {
                Stop-Process -Id $pid -Force
            }
        }
        Remove-Item $pidsFile
    }

    $ports = @(4000,3000)
    foreach ($port in $ports) {
        $proc = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($proc) { 
            Stop-Process -Id $proc.OwningProcess -Force -ErrorAction SilentlyContinue 
        }
    }
}

switch ($Action) {
    "up" {
        if (Test-Path $pidsFile) { 
            Remove-Item $pidsFile 
        }
        Start-ServiceFolder -folderName "backend" -argumentList "start"
        Start-ServiceFolder -folderName "frontend" -argumentList "run dev"
    } 
    "down" {
        Stop-Services
    }
}