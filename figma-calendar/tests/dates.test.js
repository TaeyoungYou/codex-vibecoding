import { test, expect } from 'vitest';
import { localDate, toDateKey, parseDateKey, shiftMonth, getMonthCells } from '../client/src/dates.js';

test('월요일 시작의 실제 날짜 배열과 4·5·6주를 계산한다', () => {
  for (const [year, month, count] of [[2021, 1, 28], [2023, 4, 35], [2023, 9, 42]]) {
    const cells = getMonthCells(year, month);
    expect(cells).toHaveLength(count);
    expect(parseDateKey(cells[0].key).getDay()).toBe(1);
    expect(parseDateKey(cells.at(-1).key).getDay()).toBe(0);
  }
  expect(getMonthCells(2023, 4)[0].key).toBe('2023-05-01');
  expect(getMonthCells(2023, 4).at(-1).key).toBe('2023-06-04');
  expect(getMonthCells(2023, 5)[0]).toMatchObject({ key: '2023-05-29', isCurrentMonth: false });
});

test('윤년·평년·연도 경계와 UTC 변환 없는 날짜를 처리한다', () => {
  expect(getMonthCells(2024, 1).filter((cell) => cell.isCurrentMonth)).toHaveLength(29);
  expect(getMonthCells(2025, 1).filter((cell) => cell.isCurrentMonth)).toHaveLength(28);
  expect(shiftMonth(2026, 11, 1)).toEqual({ year: 2027, month: 0 });
  expect(shiftMonth(2026, 0, -1)).toEqual({ year: 2025, month: 11 });
  expect(toDateKey(localDate(42, 0, 1))).toBe('0042-01-01');
  expect(toDateKey(localDate(2026, 9, 7))).toBe('2026-10-07');
  for (const key of ['2025-02-29', '2026-13-01', '2026-10-00', '2026-2-1', '2026-04-31', '0000-01-01']) expect(parseDateKey(key)).toBeNull();
});
