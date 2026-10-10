import { ApiError } from './validation.js';

const COLUMNS = 'id, event_date::text AS date, title, created_at AS "createdAt"';

export async function verifyDatabase(pool) {
  const { rows: [role] } = await pool.query(`SELECT current_user AS name, rolsuper, rolcreatedb, rolcreaterole, rolreplication, rolbypassrls,
    EXISTS(SELECT 1 FROM pg_auth_members WHERE member = pg_roles.oid) AS memberships
    FROM pg_roles WHERE rolname = current_user`);
  if (!role || role.name !== 'calendar_runtime' || ['rolsuper', 'rolcreatedb', 'rolcreaterole', 'rolreplication', 'rolbypassrls', 'memberships'].some((key) => role[key])) {
    throw new Error('UNSAFE_ROLE');
  }
  const { rows: [access] } = await pool.query(`SELECT
    c.relrowsecurity AND c.relforcerowsecurity AND c.relowner <> (SELECT oid FROM pg_roles WHERE rolname = current_user) AS protected,
    has_table_privilege(current_user, c.oid, 'SELECT') AS can_read,
    has_table_privilege(current_user, c.oid, 'INSERT') AS can_add,
    has_table_privilege(current_user, c.oid, 'DELETE') AS can_remove,
    has_table_privilege(current_user, c.oid, 'UPDATE,TRUNCATE,REFERENCES,TRIGGER') AS excess,
    has_schema_privilege(current_user, 'calendar_private', 'CREATE') AS can_create
    FROM pg_class c WHERE c.oid = 'calendar_private.events'::regclass`);
  if (!access?.protected || !access.can_read || !access.can_add || !access.can_remove || access.excess || access.can_create) throw new Error('UNSAFE_GRANTS');
  await pool.query('SELECT id FROM calendar_private.events LIMIT 0');
}

export function createRepository(pool) {
  return {
    async list(date) {
      const { rows } = await pool.query(`SELECT ${COLUMNS} FROM calendar_private.events WHERE event_date = $1::date ORDER BY created_at, id`, [date]);
      return rows;
    },
    async add(event) {
      const result = await pool.query(`INSERT INTO calendar_private.events (id, event_date, title)
        VALUES ($1::uuid, $2::date, $3) ON CONFLICT (id) DO NOTHING RETURNING ${COLUMNS}`, [event.id, event.date, event.title]);
      if (result.rows.length) return result.rows[0];
      const { rows: [existing] } = await pool.query(`SELECT ${COLUMNS} FROM calendar_private.events WHERE id = $1::uuid`, [event.id]);
      if (existing?.date === event.date && existing.title === event.title) return existing;
      throw new ApiError(409, 'ID_CONFLICT', '저장 요청이 충돌했습니다. 날짜와 제목을 확인해 주세요.');
    },
    async remove(date, id) {
      const result = await pool.query('DELETE FROM calendar_private.events WHERE id = $1::uuid AND event_date = $2::date RETURNING id', [id, date]);
      if (result.rows.length) return true;
      const { rows } = await pool.query('SELECT id FROM calendar_private.events WHERE id = $1::uuid', [id]);
      if (rows.length) throw new ApiError(409, 'DATE_CONFLICT', '일정의 날짜가 변경되었습니다. 목록을 다시 불러와 주세요.');
      return false;
    },
  };
}
