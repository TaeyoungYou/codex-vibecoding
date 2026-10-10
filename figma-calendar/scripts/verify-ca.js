import fs from 'node:fs';
import path from 'node:path';
import { X509Certificate } from 'node:crypto';
import { ROOT } from '../server/config.js';

try {
  const ca = new X509Certificate(fs.readFileSync(path.join(ROOT, '.certs/prod-ca-2021.crt')));
  if (!ca.ca || ca.fingerprint256 !== '80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA'
    || Date.now() >= Date.parse(ca.validTo) || Date.now() < Date.parse(ca.validFrom)) throw new Error();
  console.log('공식 Supabase 공개 CA의 지문과 유효 기간을 확인했습니다.');
} catch { console.error('공개 CA 인증서 검증 실패. 공식 Dashboard의 인증서와 출처를 확인하세요.'); process.exitCode = 1; }
