import { parseDateKey } from '../client/src/dates.js';

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function validateDate(date) {
  if (!parseDateKey(date)) throw new ApiError(400, 'INVALID_DATE', '올바른 날짜를 선택해 주세요.');
  return date;
}

export function validateId(id) {
  if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throw new ApiError(400, 'INVALID_ID', '일정 ID를 확인해 주세요.');
  }
  return id.toLowerCase();
}

export function validateEvent(body) {
  if (!body || Array.isArray(body) || typeof body !== 'object'
    || Object.keys(body).length !== 3 || !['id', 'date', 'title'].every((key) => Object.hasOwn(body, key))) {
    throw new ApiError(400, 'INVALID_INPUT', '날짜와 일정 제목을 확인해 주세요.');
  }
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const containsControl = [...title].some((character) => {
    const point = character.codePointAt(0);
    return (point < 32 && ![9, 10, 13].includes(point)) || point === 127;
  });
  if (!title || [...title].length > 200 || containsControl) {
    throw new ApiError(400, 'INVALID_TITLE', '일정 제목을 1~200자로 입력해 주세요.');
  }
  return { id: validateId(body.id), date: validateDate(body.date), title };
}
