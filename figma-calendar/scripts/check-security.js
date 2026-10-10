import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { parseEnv } from 'node:util';
import { ROOT } from '../server/config.js';
import { verifySecretFile } from '../server/secret-file.js';

let failures = 0;
const secrets = [];
const envPath = path.join(ROOT, '.env.server.local');
if (fs.existsSync(envPath)) {
  const env = parseEnv(fs.readFileSync(envPath, 'utf8'));
  if (env.CALENDAR_DB_PASSWORD) secrets.push(env.CALENDAR_DB_PASSWORD);
  if (env.CALENDAR_SUPABASE_PUBLISHABLE_KEY) secrets.push(env.CALENDAR_SUPABASE_PUBLISHABLE_KEY);
  if (env.CALENDAR_SESSION_SECRET) secrets.push(env.CALENDAR_SESSION_SECRET);
  try { execFileSync('git', ['check-ignore', '--quiet', '--', envPath], { cwd: ROOT, stdio: 'pipe' }); }
  catch { console.error('FAIL: 서버 설정 파일의 Git 제외를 확인하세요.'); failures++; }
  try { verifySecretFile(envPath); }
  catch { console.error('FAIL: 서버 설정 파일의 읽기 권한을 확인하세요. npm run setup으로 저장하세요.'); failures++; }
}

function files(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? files(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
}

const roots = ['api', 'client', 'dist', 'server', 'scripts', 'tests', 'supabase', 'docs', 'memory-bank', 'artifacts'];
const targets = [...roots.flatMap((dir) => files(path.join(ROOT, dir))), ...['README.md', 'AGENTS.md', 'package.json', 'package-lock.json', 'vercel.json', '.vercelignore'].map((name) => path.join(ROOT, name))];
function credentialPattern(content) {
  if (/sb_(?:secret|publishable)_[A-Za-z0-9_-]{15,}/.test(content) || /postgres(?:ql)?:\/\/[^\s:@]+:[^\s@]{8,}@/.test(content)) return true;
  return [...content.matchAll(/\beyJ[A-Za-z0-9_-]+\.([A-Za-z0-9_-]+)\.[A-Za-z0-9_-]+/g)].some((match) => {
    try { return ['service_role', 'anon', 'authenticated'].includes(JSON.parse(Buffer.from(match[1], 'base64url')).role); }
    catch { return false; }
  });
}
for (const target of targets) {
  if (!fs.existsSync(target) || /\.(woff2|png|jpg|svg)$/i.test(target)) continue;
  const content = fs.readFileSync(target, 'utf8');
  const publicFile = target.startsWith(path.join(ROOT, 'client')) || target.startsWith(path.join(ROOT, 'dist'));
  if (secrets.some((secret) => content.includes(secret)) || credentialPattern(content)
    || (publicFile && /CALENDAR_DB_PASSWORD|CALENDAR_DB_HOST|VITE_.*(?:SECRET|PASSWORD|SERVICE_ROLE)/.test(content))) {
    console.error(`FAIL: 비밀 노출 가능성 (${path.relative(ROOT, target)}). 값은 출력하지 않습니다.`); failures++;
  }
  if (target.startsWith(path.join(ROOT, 'dist')) && target.endsWith('.map')) { console.error('FAIL: 공개 빌드에 소스맵이 있습니다.'); failures++; }
}

// Also check staged/working tracked diffs without printing their contents.
for (const args of [['diff', '--', '.'], ['diff', '--cached', '--', '.']]) {
  const diff = execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' });
  if (secrets.some((secret) => diff.includes(secret)) || credentialPattern(diff)) { console.error('FAIL: Git diff에서 비밀 노출 가능성이 있습니다.'); failures++; }
}
if (!fs.existsSync(path.join(ROOT, 'dist', 'index.html'))) console.log('NOTE: 빌드 산출물 검사는 npm run build 이후 수행하세요.');
if (!secrets.length) console.log('NOTE: 실제 서버 비밀번호가 아직 설정되지 않아 값 대조 검사는 미실행입니다.');
if (!failures) console.log('보안 검사 통과: 검사 대상에 자격 증명 노출 패턴과 공개 서버 설정이 없습니다.');
process.exitCode = failures ? 1 : 0;
