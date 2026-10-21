[CmdletBinding()]
param(
    [string] $OutputZip,
    [switch] $IncludeLocalUploads
)

$ErrorActionPreference = 'Stop'

function Assert-CommandAvailable {
    param([Parameter(Mandatory = $true)][string] $Name)

    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command '$Name' was not found. Install it or add it to PATH, then retry."
    }
}

function Invoke-NativeCommand {
    param(
        [Parameter(Mandatory = $true)][string] $Name,
        [Parameter(Mandatory = $true)][string[]] $Arguments,
        [Parameter(Mandatory = $true)][string] $Description
    )

    & $Name @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "$Description failed with exit code $LASTEXITCODE."
    }
}

function Invoke-Robocopy {
    param([Parameter(Mandatory = $true)][string[]] $Arguments)

    & robocopy @Arguments
    # Robocopy uses exit codes 0-7 for success states; 8+ indicates a failure.
    if ($LASTEXITCODE -ge 8) {
        throw "File staging failed: robocopy exited with code $LASTEXITCODE."
    }
}

Assert-CommandAvailable -Name 'php'
Assert-CommandAvailable -Name 'composer'
Assert-CommandAvailable -Name 'npm'
Assert-CommandAvailable -Name 'robocopy'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
if ([string]::IsNullOrWhiteSpace($OutputZip)) {
    $OutputZip = Join-Path $repoRoot 'dist\secureview-hostinger-release.zip'
} elseif (-not [System.IO.Path]::IsPathRooted($OutputZip)) {
    $OutputZip = Join-Path $repoRoot $OutputZip
}

$outputDirectory = Split-Path -Parent $OutputZip
New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null

# Build assets in the working tree, but do not replace the developer's vendor/
# folder with a production-only dependency installation.
Push-Location $repoRoot
try {
    Invoke-NativeCommand -Name 'npm' -Arguments @('ci') -Description 'npm ci'
    Invoke-NativeCommand -Name 'npm' -Arguments @('run', 'build') -Description 'Vite production build'
} finally {
    Pop-Location
}

$stagingRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("secureview-hostinger-" + [guid]::NewGuid().ToString('N'))
$appRoot = Join-Path $stagingRoot 'secureview_app'
$webRoot = Join-Path $stagingRoot 'public_html'

try {
    New-Item -ItemType Directory -Path $appRoot -Force | Out-Null
    New-Item -ItemType Directory -Path $webRoot -Force | Out-Null

    $excludedDirectories = @(
        (Join-Path $repoRoot '.git'),
        (Join-Path $repoRoot 'node_modules'),
        (Join-Path $repoRoot 'vendor'),
        (Join-Path $repoRoot 'tests'),
        (Join-Path $repoRoot 'dist'),
        (Join-Path $repoRoot 'storage\logs'),
        (Join-Path $repoRoot 'storage\framework\cache'),
        (Join-Path $repoRoot 'storage\framework\sessions'),
        (Join-Path $repoRoot 'storage\framework\views'),
        (Join-Path $repoRoot 'storage\framework\testing'),
        (Join-Path $repoRoot 'storage\app\public'),
        (Join-Path $repoRoot 'public\storage')
    )

    $copyArguments = @(
        $repoRoot, $appRoot, '/E', '/COPY:DAT', '/R:2', '/W:1', '/NFL', '/NDL', '/NP',
        '/XD'
    ) + $excludedDirectories + @('/XF', '.env', '.env.backup', '.env.production', '.env.local', '.env.testing')
    Invoke-Robocopy -Arguments $copyArguments

    # Ensure no developer environment file was copied. Keep only the non-secret
    # sample file so the operator can create a new production .env separately.
    Get-ChildItem -Path $appRoot -Force -Filter '.env*' -ErrorAction SilentlyContinue |
        Remove-Item -Force -Recurse
    Copy-Item -Path (Join-Path $repoRoot '.env.example') -Destination (Join-Path $appRoot '.env.example') -Force

    # Remove cached PHP config/routes from a developer environment.
    $bootstrapCache = Join-Path $appRoot 'bootstrap\cache'
    if (Test-Path $bootstrapCache) {
        Get-ChildItem -Path $bootstrapCache -File -Filter '*.php' -ErrorAction SilentlyContinue |
            Remove-Item -Force
    }

    # Recreate runtime directories without copying local logs or cache/session data.
    foreach ($directory in @(
        'storage\logs',
        'storage\framework\cache\data',
        'storage\framework\sessions',
        'storage\framework\views',
        'storage\framework\testing',
        'bootstrap\cache'
    )) {
        New-Item -ItemType Directory -Path (Join-Path $appRoot $directory) -Force | Out-Null
    }

    if (Test-Path (Join-Path $appRoot 'storage\framework\maintenance.php')) {
        Remove-Item -Path (Join-Path $appRoot 'storage\framework\maintenance.php') -Force
    }

    Invoke-NativeCommand -Name 'composer' -Arguments @(
        'install',
        '--no-dev',
        '--prefer-dist',
        '--no-interaction',
        '--optimize-autoloader',
        "--working-dir=$appRoot"
    ) -Description 'Production Composer install in staging directory'

    # Copy only Laravel's public directory into the web root. The real app and
    # its environment file remain in a sibling private directory.
    Invoke-Robocopy -Arguments @(
        (Join-Path $appRoot 'public'), $webRoot, '/E', '/COPY:DAT', '/R:2', '/W:1', '/NFL', '/NDL', '/NP',
        '/XD', (Join-Path $appRoot 'public\storage')
    )

    $publicIndex = Join-Path $webRoot 'index.php'
    if (-not (Test-Path $publicIndex)) {
        throw 'The staged public/index.php was not found.'
    }

    $indexContent = Get-Content -Path $publicIndex -Raw
    $indexContent = $indexContent.Replace("__DIR__.'/../storage/framework/maintenance.php'", "__DIR__.'/../secureview_app/storage/framework/maintenance.php'")
    $indexContent = $indexContent.Replace("__DIR__.'/../vendor/autoload.php'", "__DIR__.'/../secureview_app/vendor/autoload.php'")
    $indexContent = $indexContent.Replace("__DIR__.'/../bootstrap/app.php'", "__DIR__.'/../secureview_app/bootstrap/app.php'")

    if ($indexContent.Contains("__DIR__.'/../vendor/autoload.php'") -or
        $indexContent.Contains("__DIR__.'/../bootstrap/app.php'")) {
        throw 'Could not update all Laravel paths in the staged public index.php.'
    }
    [System.IO.File]::WriteAllText(
        $publicIndex,
        $indexContent,
        [System.Text.UTF8Encoding]::new($false)
    )

    # Public catalog uploads are served from /storage, but scripts in this
    # directory must never be executable by the web server.
    $webStorage = Join-Path $webRoot 'storage'
    if (Test-Path $webStorage) {
        Remove-Item -Path $webStorage -Recurse -Force
    }
    New-Item -ItemType Directory -Path $webStorage -Force | Out-Null

    $sourcePublicUploads = Join-Path $repoRoot 'storage\app\public'
    if ($IncludeLocalUploads -and (Test-Path $sourcePublicUploads)) {
        Invoke-Robocopy -Arguments @(
            $sourcePublicUploads, $webStorage, '/E', '/COPY:DAT', '/R:2', '/W:1', '/NFL', '/NDL', '/NP'
        )
    }

    @'
Options -Indexes
<FilesMatch "\.(php[0-9]?|phtml|phar|cgi|pl|py|sh)$">
    Require all denied
</FilesMatch>
'@ | Set-Content -Path (Join-Path $webStorage '.htaccess') -Encoding ascii

    @'
SECUREVIEW HOSTINGER RELEASE

This archive contains two sibling folders:
- secureview_app: private Laravel application and production dependencies
- public_html: the web-accessible Laravel public files

Upload/extract both folders one level below the domain folder so they are siblings.
By default, this archive excludes locally uploaded catalog images. For the initial image
migration only, build the archive with -IncludeLocalUploads after confirming
storage/app/public contains only the public catalog images you want to publish.
For routine updates, do not use -IncludeLocalUploads and never delete or replace an
existing public_html/storage folder containing live uploads.
Merge the public_html contents into the domain's actual public_html directory; do not
create a nested public_html/public_html directory. Keep secureview_app outside the
web document root and do not copy its .env.example into a production .env unchanged.

Before go-live:
1. Create a fresh MySQL database backup and restore it to the intended destination.
2. Create secureview_app/.env using the deployment guide and the real Hostinger database,
   application URL, email, PayMongo, and path settings.
3. Set PUBLIC_STORAGE_PATH to the absolute path of public_html/storage.
4. Verify the production PHP version/extensions, writable storage and bootstrap/cache,
   migrations, HTTPS, mail, PayMongo test webhook, and scheduler cron.
5. Do not run migrate:fresh against any database that contains data you need.
6. If your plan does not provide SSH or a supported CLI command runner, do not expose an
   unauthenticated web route to run Artisan. Confirm a secure migration method with
   Hostinger or use a plan that supports SSH/CLI operations.

See docs/hostinger-deployment.md in the source repository for the full instructions.
'@ | Set-Content -Path (Join-Path $stagingRoot 'HOSTINGER-RELEASE-INSTRUCTIONS.txt') -Encoding utf8

    if (Test-Path $OutputZip) {
        Remove-Item -Path $OutputZip -Force
    }
    Compress-Archive -Path (Join-Path $stagingRoot '*') -DestinationPath $OutputZip -CompressionLevel Optimal

    Write-Host ''
    Write-Host 'Hostinger release archive created:' -ForegroundColor Green
    Write-Host $OutputZip
    Write-Host 'Review docs/hostinger-deployment.md before uploading, especially the private .env and public_html/storage paths.'
} finally {
    if (Test-Path $stagingRoot) {
        Remove-Item -Path $stagingRoot -Recurse -Force -ErrorAction SilentlyContinue
    }
}
