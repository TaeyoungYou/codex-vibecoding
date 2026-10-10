$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$taskProjectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$taskArchivePath = Join-Path $taskProjectRoot '.cache/postgresql-17.11-windows.zip'
$taskBinPath = Join-Path $taskProjectRoot '.tools/psql/bin'
$taskCertPath = Join-Path $taskProjectRoot '.certs/prod-ca-2021.crt'
$taskExpectedHash = '80379B2C04D51C30225532E0AE04509899141E9957ED096FE749D7FD9DF8F82F'
# Official EDB 17.11 archive linked by PostgreSQL's Windows download page.
$taskArchiveUrl = 'https://sbp.enterprisedb.com/getfile.jsp?fileid=1260616'
# Public CA URL confirmed in the official Supabase Studio custom-content.json.
$taskCertUrl = 'https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt'
New-Item -ItemType Directory -Path (Split-Path $taskArchivePath -Parent), $taskBinPath, (Split-Path $taskCertPath -Parent) -Force | Out-Null
if (-not (Test-Path -LiteralPath $taskArchivePath)) {
    Write-Host '공식 PostgreSQL 17.11 아카이브를 준비합니다 (약 382MB, 최초 1회).'
    & curl.exe --fail --silent --show-error --location --proto '=https' --tlsv1.2 --output $taskArchivePath $taskArchiveUrl
    if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL 다운로드 실패. 네트워크와 공식 다운로드 주소를 확인하세요.' }
}
if ((Get-FileHash -LiteralPath $taskArchivePath -Algorithm SHA256).Hash -ne $taskExpectedHash) { throw 'PostgreSQL 아카이브 SHA256이 다릅니다. 실행하지 않습니다. 공식 출처를 확인하세요.' }
Add-Type -AssemblyName System.IO.Compression.FileSystem
$taskZip = [IO.Compression.ZipFile]::OpenRead($taskArchivePath)
$taskClientFiles = @('psql.exe', 'libpq.dll', 'libssl-3-x64.dll', 'libcrypto-3-x64.dll', 'libintl-9.dll', 'libiconv-2.dll', 'zlib1.dll', 'libwinpthread-1.dll')
try {
    foreach ($taskName in $taskClientFiles) {
        $taskEntry = $taskZip.GetEntry("pgsql/bin/$taskName")
        if (-not $taskEntry -or $taskEntry.Length -gt 50000000) { throw '예상된 psql 파일을 확인하지 못했습니다.' }
        $taskDestination = [IO.Path]::GetFullPath((Join-Path $taskBinPath $taskName))
        if ([IO.Path]::GetDirectoryName($taskDestination) -ne [IO.Path]::GetFullPath($taskBinPath)) { throw '도구 경로가 프로젝트 범위를 벗어납니다.' }
        [IO.Compression.ZipFileExtensions]::ExtractToFile($taskEntry, $taskDestination, $true)
    }
} finally { $taskZip.Dispose() }
& curl.exe --fail --silent --show-error --location --proto '=https' --tlsv1.2 --output $taskCertPath $taskCertUrl
if ($LASTEXITCODE -ne 0) { throw 'Supabase 공개 CA 다운로드 실패.' }
& node (Join-Path $PSScriptRoot 'verify-ca.js')
if ($LASTEXITCODE -ne 0) { throw 'Supabase 공개 CA 검증 실패. 연결하지 않습니다.' }
& (Join-Path $taskBinPath 'psql.exe') --version
if ($LASTEXITCODE -ne 0) { throw 'psql 실행 실패. Windows 실행 라이브러리를 확인하세요.' }
Write-Host '프로젝트 내부에 psql 클라이언트와 공개 CA를 준비했습니다. 로컬 DB 서버·서비스·전역 PATH는 설치하지 않았습니다.'
Write-Host '이제 npm run setup:db를 실행하세요.'
