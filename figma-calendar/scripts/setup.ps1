$ErrorActionPreference = 'Stop'
$taskProjectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$taskProjectRef = 'fnqefwbxqtanhnfpxrml'
$taskConfigPath = Join-Path $taskProjectRoot '.env.server.local'
$taskCaPath = Join-Path $taskProjectRoot '.certs/prod-ca-2021.crt'
if (-not (Test-Path -LiteralPath $taskCaPath)) { throw 'npm run setup:tools로 확인된 공개 CA 인증서를 먼저 준비하세요.' }
Write-Host 'calendar-app의 Connect > Session pooler에서 Host를 복사하세요.'
$taskDbHost = 'aws-1-ca-central-1.pooler.supabase.com'
Write-Host "확인된 Host: $taskDbHost"
if ($taskDbHost -notmatch '^aws-\d+-[a-z0-9-]+\.pooler\.supabase\.com$') { throw '올바른 session pooler Host가 필요합니다.' }
Write-Host '관리 계정 비밀번호가 아닌 calendar_runtime의 전용 비밀번호를 입력하세요.'
Write-Host '계정 비밀번호는 먼저 PostgreSQL psql의 \password calendar_runtime으로 설정해야 합니다.'
$taskPassword = Read-Host 'calendar_runtime 비밀번호 (입력은 표시되지 않습니다)' -AsSecureString
$taskBstr = [IntPtr]::Zero
try {
    $taskBstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($taskPassword)
    $taskPlainPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($taskBstr)
    if ($taskPlainPassword.Length -lt 8 -or $taskPlainPassword -notmatch '^[A-Za-z0-9_-]+$') { throw '8자 이상의 영문·숫자·_·- 비밀번호를 사용하세요.' }
    if (-not (Test-Path -LiteralPath $taskConfigPath)) { [IO.File]::WriteAllText($taskConfigPath, '', [Text.UTF8Encoding]::new($false)) }
    if ((Get-Item -LiteralPath $taskConfigPath).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw '링크 형태의 설정 파일은 사용할 수 없습니다.' }
    $taskAuthLines = [IO.File]::ReadAllLines($taskConfigPath) | Where-Object { $_ -match '^CALENDAR_(SUPABASE_URL|SUPABASE_PUBLISHABLE_KEY|TURNSTILE_SITE_KEY)=' }
    # Remove inherited access before writing any credential. Windows chmod is insufficient.
    $taskIdentity = [Security.Principal.WindowsIdentity]::GetCurrent().User
    $taskAcl = [Security.AccessControl.FileSecurity]::new()
    $taskAcl.SetOwner($taskIdentity)
    $taskAcl.SetAccessRuleProtection($true, $false)
    $taskAcl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new($taskIdentity, 'FullControl', 'Allow'))
    $taskAcl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new([Security.Principal.SecurityIdentifier]::new('S-1-5-18'), 'FullControl', 'Allow'))
    $taskAcl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new([Security.Principal.SecurityIdentifier]::new('S-1-5-32-544'), 'FullControl', 'Allow'))
    Set-Acl -LiteralPath $taskConfigPath -AclObject $taskAcl
    $taskConfig = "CALENDAR_DB_HOST=$taskDbHost`nCALENDAR_DB_PORT=5432`nCALENDAR_DB_USER=calendar_runtime.$taskProjectRef`nCALENDAR_DB_PASSWORD=$taskPlainPassword`nCALENDAR_DB_CA_CERT_PATH=.certs/prod-ca-2021.crt`n"
    if ($taskAuthLines) { $taskConfig += ($taskAuthLines -join "`n") + "`n" }
    [IO.File]::WriteAllText($taskConfigPath, $taskConfig, [Text.UTF8Encoding]::new($false))
    Write-Host '서버 전용 설정을 저장하고 파일 접근 권한을 제한했습니다. 비밀번호는 출력하지 않았습니다.'
} finally {
    if ($taskBstr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($taskBstr) }
    $taskPlainPassword = $null
    $taskConfig = $null
    $taskPassword.Dispose()
}
