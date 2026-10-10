import fs from 'node:fs';
import path from 'node:path';
import { ROOT, PROJECT_REF, loadAuthConfiguration } from '../server/config.js';
import { verifySecretFile } from '../server/secret-file.js';

export function saveAuthConfiguration(key) {
  const file = path.join(ROOT, '.env.server.local');
  verifySecretFile(file);
  if (!fs.existsSync(file)) throw new Error('SERVER_ENV_REQUIRED');
  const values = {
    CALENDAR_SUPABASE_URL: `https://${PROJECT_REF}.supabase.co`,
    CALENDAR_SUPABASE_PUBLISHABLE_KEY: key.trim(),
    CALENDAR_TURNSTILE_SITE_KEY: '0x4AAAAAAFQ0QgN6p9EFSCKh',
  };
  loadAuthConfiguration(values);
  const existing = fs.readFileSync(file, 'utf8').split(/\r?\n/)
    .filter((line) => !/^CALENDAR_(?:SUPABASE_URL|SUPABASE_PUBLISHABLE_KEY|TURNSTILE_SITE_KEY)=/.test(line));
  // Write the same protected file; replacement/rename could change Windows ACLs.
  fs.writeFileSync(file, `${existing.join('\n').trimEnd()}\n${Object.entries(values).map(([name, value]) => `${name}=${value}`).join('\n')}\n`);
  verifySecretFile(file);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.join(ROOT, 'scripts', 'configure-auth.js')) {
  let key = '';
  for await (const chunk of process.stdin) key += chunk;
  try { saveAuthConfiguration(key); console.log('Auth 설정 저장 완료: DB 설정·파일 접근 권한을 유지했습니다.'); }
  catch { console.error('Auth 설정 저장 실패: publishable key·서버 설정·파일 ACL을 확인하세요.'); process.exitCode = 1; }
}
