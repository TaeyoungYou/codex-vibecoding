// 정오의 로컬 날짜로 계산해 UTC 변환과 일광 절약 시간의 영향을 피한다.
export function localDate(year, month, day = 1) {
  const date = new Date(0);
  date.setFullYear(year, month, day);
  date.setHours(12, 0, 0, 0);
  return date;
}

export function toDateKey(date) {
  return `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function parseDateKey(key) {
  if (typeof key !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const [year, month, day] = key.split('-').map(Number);
  if (year < 1 || year > 9999) return null;
  const date = localDate(year, month - 1, day);
  return toDateKey(date) === key ? date : null;
}

export function shiftMonth(year, month, direction) {
  const date = localDate(year, month + direction);
  return { year: date.getFullYear(), month: date.getMonth() };
}

export function getMonthCells(year, month) {
  const offset = (localDate(year, month).getDay() + 6) % 7;
  const days = localDate(year, month + 1, 0).getDate();
  return Array.from({ length: Math.ceil((offset + days) / 7) * 7 }, (_, index) => {
    const date = localDate(year, month, index - offset + 1);
    return { key: toDateKey(date), day: date.getDate(), isCurrentMonth: date.getMonth() === month && date.getFullYear() === year };
  });
}
