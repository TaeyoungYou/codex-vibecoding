$ErrorActionPreference = 'Stop'
$taskConfigPath = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../.env.server.local'))
if (-not (Test-Path -LiteralPath $taskConfigPath)) { throw 'npm run setup:db로 DB 설정을 먼저 준비하세요.' }
Write-Host 'calendar-app의 Settings > API Keys에서 publishable key를 입력하세요. secret/service-role key는 사용하지 않습니다.'
$taskKey = Read-Host 'Publishable key (입력은 표시되지 않습니다)' -AsSecureString
$taskBstr = [IntPtr]::Zero
try {
    $taskBstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($taskKey)
    $taskPlainKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($taskBstr)
    if ($taskPlainKey -notmatch '^sb_publishable_[A-Za-z0-9_-]{15,}$') { throw 'calendar-app의 publishable key가 필요합니다.' }
    # The Node helper verifies the existing ACL and preserves all DB settings.
    $taskPlainKey | node (Join-Path $PSScriptRoot 'configure-auth.js')
    if ($LASTEXITCODE -ne 0) { throw 'Auth 설정 저장 실패: 서버 설정 파일과 읽기 권한을 확인하세요.' }
} finally {
    if ($taskBstr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($taskBstr) }
    $taskPlainKey = $null
    $taskKey.Dispose()
}
