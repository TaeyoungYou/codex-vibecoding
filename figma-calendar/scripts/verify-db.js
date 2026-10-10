import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { randomUUID } from 'node:crypto';
import { ConfigurationError, loadConfiguration, ROOT } from '../server/config.js';
import { verifySecretFile } from '../server/secret-file.js';
import { createRepository, verifyDatabase } from '../server/repository.js';

let client;
try {
  const file = path.join(ROOT, '.env.server.local');
  verifySecretFile(file);
  if (fs.existsSync(file)) process.loadEnvFile(file);
  client = new pg.Client(loadConfiguration());
  await client.connect();
  await verifyDatabase(client);
  await client.query('BEGIN');
  const repo = createRepository(client);
  const event = { id: randomUUID(), date: '2000-01-01', title: 'runtime-permission-test' };
  const added = await repo.add(event);
  const retried = await repo.add(event);
  if (added.id !== retried.id || !(await repo.list(event.date)).some((item) => item.id === event.id)) throw new Error('CRUD_CHECK');
  async function denied(query, expectedCode = '42501') {
    await client.query('SAVEPOINT permission_check');
    let blocked = false;
    try { await client.query(query); } catch (error) { blocked = error.code === expectedCode; }
    await client.query('ROLLBACK TO SAVEPOINT permission_check');
    if (!blocked) throw new Error('PRIVILEGE_CHECK');
  }
  await denied("UPDATE calendar_private.events SET title='forbidden'");
  await denied('DROP TABLE calendar_private.events');
  await denied('CREATE TABLE calendar_private.forbidden (id integer)');
  await denied('CREATE SCHEMA forbidden_calendar_check');
  await denied('SELECT id FROM auth.users');
  // Non-owner GRANT may report a warning, so inspect grant options directly as well.
  const { rows: [rights] } = await client.query("SELECT has_table_privilege(current_user,'calendar_private.events','SELECT WITH GRANT OPTION, INSERT WITH GRANT OPTION, DELETE WITH GRANT OPTION') AS can_grant");
  if (rights.can_grant) throw new Error('GRANT_CHECK');
  if (!(await repo.remove(event.date, event.id)) || await repo.remove(event.date, event.id)) throw new Error('DELETE_CHECK');
  await client.query('ROLLBACK');
  console.log('실제 전용 계정 검사 통과: CRUD·재시도 허용, UPDATE·DDL·권한 위임·auth.users 접근 거부. 테스트 데이터는 rollback했습니다.');
} catch (error) {
  console.error(error instanceof ConfigurationError ? error.message : '실제 DB 검사 실패: 전용 계정·TLS·권한·연결 상태를 확인하세요. 내부 오류와 자격 증명은 출력하지 않습니다.');
  process.exitCode = 1;
} finally { await client?.end().catch(() => {}); }
