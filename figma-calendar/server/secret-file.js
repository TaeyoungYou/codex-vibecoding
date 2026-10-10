import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { ConfigurationError, ROOT } from './config.js';

export function verifySecretFile(file) {
  if (!fs.existsSync(file)) return;
  const stat = fs.lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 16384) throw new ConfigurationError('서버 설정 파일을 확인해 주세요. npm run setup으로 다시 저장하세요.');
  try {
    if (process.platform === 'win32') {
      execFileSync('powershell.exe', ['-NoProfile', '-Command',
        '$a = Get-Acl -LiteralPath .env.server.local; $u = [Security.Principal.WindowsIdentity]::GetCurrent().User.Value; $ok = @($u,"S-1-5-18","S-1-5-32-544"); if (-not $a.AreAccessRulesProtected) { exit 1 }; foreach ($r in $a.Access) { if ($r.AccessControlType -eq "Allow" -and $r.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value -notin $ok) { exit 1 } }'],
      { cwd: ROOT, stdio: 'pipe', windowsHide: true });
    } else if (stat.mode & 0o077) throw new Error('UNSAFE_FILE_MODE');
  } catch { throw new ConfigurationError('서버 설정 파일의 읽기 권한이 너무 넓습니다. npm run setup으로 접근 권한을 제한하세요.'); }
}
