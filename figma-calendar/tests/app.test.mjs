import test from "node:test";
import assert from "node:assert/strict";
import {
  STORAGE_KEY, ScheduleDataError, localDate, toDateKey, parseDateKey,
  shiftMonth, getMonthCells, parseStoredEvents, createEventStore,
} from "../app.js";

function memoryStorage(initial = null) {
  return {
    value: initial,
    failWrites: false,
    writes: 0,
    getItem(key) {
      assert.equal(key, STORAGE_KEY);
      return this.value;
    },
    setItem(key, value) {
      assert.equal(key, STORAGE_KEY);
      if (this.failWrites) throw new Error("Storage full");
      this.value = value;
      this.writes += 1;
    },
  };
}

test("월요일 시작의 실제 날짜 배열과 4·5·6주를 계산한다", () => {
  for (const [year, month, count] of [[2021, 1, 28], [2023, 4, 35], [2023, 9, 42]]) {
    const cells = getMonthCells(year, month);
    assert.equal(cells.length, count);
    assert.equal(parseDateKey(cells[0].key).getDay(), 1);
    assert.equal(parseDateKey(cells.at(-1).key).getDay(), 0);
  }
  assert.equal(getMonthCells(2023, 4)[0].key, "2023-05-01");
  assert.equal(getMonthCells(2023, 4).at(-1).key, "2023-06-04");
  const june = getMonthCells(2023, 5);
  assert.equal(june[0].key, "2023-05-29");
  assert.equal(june[0].isCurrentMonth, false);
  assert.equal(june[3].key, "2023-06-01");
  assert.equal(june[3].isCurrentMonth, true);
});

test("윤년과 평년, 연도 경계, 100년 이전의 로컬 날짜를 처리한다", () => {
  assert.equal(getMonthCells(2024, 1).filter((cell) => cell.isCurrentMonth).length, 29);
  assert.equal(getMonthCells(2025, 1).filter((cell) => cell.isCurrentMonth).length, 28);
  assert.deepEqual(shiftMonth(2026, 11, 1), { year: 2027, month: 0 });
  assert.deepEqual(shiftMonth(2026, 0, -1), { year: 2025, month: 11 });
  assert.equal(toDateKey(localDate(42, 0, 1)), "0042-01-01");
  assert.equal(toDateKey(localDate(2026, 9, 7)), "2026-10-07");
  for (const key of ["2025-02-29", "2026-13-01", "2026-10-00", "2026-2-1", "2026-04-31"]) {
    assert.equal(parseDateKey(key), null);
  }
});

test("일정은 날짜별로 저장되고 새 저장소 인스턴스에서 복원된다", () => {
  const storage = memoryStorage();
  const store = createEventStore(storage);
  const first = store.add("2026-10-07", "  공부하기  ");
  const second = store.add("2026-10-07", "공부하기");
  store.add("2026-10-08", "운동하기");
  assert.notEqual(first.id, second.id);
  const restored = createEventStore(storage);
  assert.deepEqual(restored.list("2026-10-07").map((event) => event.title), ["공부하기", "공부하기"]);
  restored.remove("2026-10-07", first.id);
  assert.equal(restored.list("2026-10-07")[0].id, second.id);
  assert.equal(restored.list("2026-10-08")[0].title, "운동하기");
  restored.remove("2026-10-07", second.id);
  assert.deepEqual(restored.list("2026-10-07"), []);
  assert.equal(Object.hasOwn(JSON.parse(storage.value).byDate, "2026-10-07"), false);
});

test("추가·삭제 저장 실패 시 기존 목록과 저장값을 유지한다", () => {
  const storage = memoryStorage();
  const store = createEventStore(storage);
  const event = store.add("2026-10-07", "기존 일정");
  const saved = storage.value;
  storage.failWrites = true;
  assert.throws(() => store.add("2026-10-07", "새 일정"), /Storage full/);
  assert.throws(() => store.remove("2026-10-07", event.id), /Storage full/);
  assert.deepEqual(store.list("2026-10-07"), [event]);
  assert.equal(storage.value, saved);
  assert.equal(storage.writes, 1);
});

test("손상된 JSON, 잘못된 날짜·제목·ID·버전을 덮어쓰지 않는다", () => {
  const invalid = [
    "{broken", "null", "", JSON.stringify({ version: 2, byDate: {} }),
    JSON.stringify({ version: 1, byDate: [] }),
    JSON.stringify({ version: 1, byDate: { "2025-02-29": [] } }),
    JSON.stringify({ version: 1, byDate: { "2026-10-07": [{ id: "one", title: " " }] } }),
    JSON.stringify({ version: 1, byDate: { "2026-10-07": [{ id: "one", title: "A" }, { id: "one", title: "B" }] } }),
  ];
  for (const raw of invalid) {
    const storage = memoryStorage(raw);
    assert.throws(() => createEventStore(storage), ScheduleDataError);
    assert.equal(storage.value, raw);
    assert.equal(storage.writes, 0);
  }
  assert.deepEqual(Object.keys(parseStoredEvents(null)), []);
});

test("공백 제목을 거부하고 마크업 모양의 제목을 문자열로 보존한다", () => {
  const storage = memoryStorage();
  const store = createEventStore(storage);
  assert.throws(() => store.add("2026-10-07", "  "), TypeError);
  assert.equal(storage.writes, 0);
  const event = store.add("2026-10-07", '<img src="x" onerror="alert(1)">');
  assert.equal(createEventStore(storage).list("2026-10-07")[0].title, event.title);
  const returned = store.list("2026-10-07");
  returned[0].title = "외부 변경";
  assert.equal(store.list("2026-10-07")[0].title, event.title);
});
