param([string]$PsqlPath = '', [string]$CaCertPath = '')
$ErrorActionPreference = 'Stop'
if (-not $PsqlPath) { $PsqlPath = Join-Path $PSScriptRoot '../.tools/psql/bin/psql.exe'; if (-not (Test-Path -LiteralPath $PsqlPath)) { $PsqlPath = 'psql' } }
if (-not $CaCertPath) { $CaCertPath = Join-Path $PSScriptRoot '../.certs/prod-ca-2021.crt'; if (-not (Test-Path -LiteralPath $CaCertPath)) { throw '신뢰할 Supabase 공개 CA가 없습니다. npm run setup:tools를 먼저 실행하세요.' } }
if (-not (Get-Command $PsqlPath -ErrorAction SilentlyContinue)) { throw 'PostgreSQL 17 이상의 psql을 설치하거나 -PsqlPath로 psql.exe 경로를 지정하세요. README의 초기 설정을 확인하세요.' }
# These variables exist only in this setup process. Neither password is an argument.
Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
$env:PGHOST = 'aws-1-ca-central-1.pooler.supabase.com'
$env:PGPORT = '5432'
$env:PGDATABASE = 'postgres'
$env:PGUSER = 'postgres.fnqefwbxqtanhnfpxrml'
$env:PGSSLMODE = 'verify-full'
$env:PGSSLROOTCERT = $CaCertPath
$env:PGPASSFILE = 'NUL'
$env:PGCONNECT_TIMEOUT = '15'
Write-Host '입력 순서 (모두 비표시 입력):'
Write-Host '1. Password: calendar-app 생성 때 설정한 기존 postgres DB 관리자 비밀번호.'
Write-Host '   Supabase 로그인 비밀번호나 지금 만들 새 전용 비밀번호를 입력하는 단계가 아닙니다.'
Write-Host '2. Enter new password: calendar_runtime의 새 전용 비밀번호 (8자 이상 영문·숫자·_·-).'
Write-Host '3. Enter it again: 같은 새 전용 비밀번호를 한 번 더 입력.'
Write-Host '4. DB 설정 성공 후 로컬 설정 프롬프트: 위에서 설정한 전용 비밀번호를 다시 입력.'
& $PsqlPath -X -W -v ON_ERROR_STOP=1 -c '\password calendar_runtime'
$taskPsqlExitCode = $LASTEXITCODE
if ($taskPsqlExitCode -ne 0) {
    Write-Host "`nDB 설정을 중단했습니다 (psql 종료 코드: $taskPsqlExitCode)." -ForegroundColor Red
    Write-Host '위 psql 오류가 password authentication failed for user "postgres"라면 기존 관리자 DB 비밀번호의 인증이 거부된 것입니다.'
    Write-Host '첫 Password:에는 calendar-app의 현재 관리자 DB 비밀번호를 입력하세요.'
    Write-Host '기존 비밀번호를 잊었다면 Dashboard의 Database > Settings에서 재설정하세요:'
    Write-Host 'https://supabase.com/dashboard/project/fnqefwbxqtanhnfpxrml/database/settings'
    Write-Host '재설정 직후에는 pooler의 이전 비밀번호 캐시 때문에 일시적으로 실패할 수 있습니다. 새 비밀번호로 다시 연결하세요.'
    Write-Host '다른 오류라면 바로 위 psql 오류를 확인하세요. 비밀번호를 공유하거나 TLS 검증을 끄지 마세요.'
    exit $taskPsqlExitCode
}
Remove-Item Env:PGUSER -ErrorAction SilentlyContinue
& (Join-Path $PSScriptRoot 'setup.ps1')
