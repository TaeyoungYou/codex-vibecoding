export const STORAGE_KEY = "figma-calendar.events.v1";

export class ScheduleDataError extends Error {
  constructor() {
    super("저장된 일정 데이터의 형식이 올바르지 않습니다.");
    this.name = "ScheduleDataError";
  }
}

// 정오의 로컬 날짜로 계산해 UTC 변환과 일광 절약 시간의 영향을 피한다.
export function localDate(year, month, day = 1) {
  const date = new Date(0);
  date.setFullYear(year, month, day);
  date.setHours(12, 0, 0, 0);
  return date;
}

export function toDateKey(date) {
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDateKey(key) {
  if (typeof key !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const [year, month, day] = key.split("-").map(Number);
  const date = localDate(year, month - 1, day);
  return toDateKey(date) === key ? date : null;
}

export function shiftMonth(year, month, direction) {
  const date = localDate(year, month + direction);
  return { year: date.getFullYear(), month: date.getMonth() };
}

export function getMonthCells(year, month) {
  const firstDay = localDate(year, month);
  const offset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = localDate(year, month + 1, 0).getDate();
  const cellCount = Math.ceil((offset + daysInMonth) / 7) * 7;
  return Array.from({ length: cellCount }, (_, index) => {
    const date = localDate(year, month, index - offset + 1);
    return {
      key: toDateKey(date),
      day: date.getDate(),
      isCurrentMonth: date.getMonth() === month && date.getFullYear() === year,
    };
  });
}

export function parseStoredEvents(raw) {
  const byDate = Object.create(null);
  if (raw === null) return byDate;

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new ScheduleDataError();
  }
  if (!data || data.version !== 1 || !data.byDate || typeof data.byDate !== "object" || Array.isArray(data.byDate)) {
    throw new ScheduleDataError();
  }

  const ids = new Set();
  for (const [key, events] of Object.entries(data.byDate)) {
    if (!parseDateKey(key) || !Array.isArray(events)) throw new ScheduleDataError();
    byDate[key] = events.map((event) => {
      if (!event || typeof event.id !== "string" || !event.id.trim() || ids.has(event.id)
        || typeof event.title !== "string" || !event.title.trim()) {
        throw new ScheduleDataError();
      }
      ids.add(event.id);
      return { id: event.id, title: event.title.trim() };
    });
  }
  return byDate;
}

export function createEventStore(storage) {
  let byDate = parseStoredEvents(storage.getItem(STORAGE_KEY));

  function commit(next) {
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, byDate: next }));
    byDate = next;
  }

  return {
    list(key) {
      return (byDate[key] ?? []).map((event) => ({ ...event }));
    },
    add(key, title) {
      if (!parseDateKey(key) || typeof title !== "string" || !title.trim()) {
        throw new TypeError("날짜와 일정 제목을 확인해 주세요.");
      }
      const event = { id: globalThis.crypto.randomUUID(), title: title.trim() };
      const next = Object.assign(Object.create(null), byDate);
      next[key] = [...(byDate[key] ?? []), event];
      commit(next);
      return event;
    },
    remove(key, id) {
      const events = byDate[key] ?? [];
      if (!events.some((event) => event.id === id)) return false;
      const next = Object.assign(Object.create(null), byDate);
      next[key] = events.filter((event) => event.id !== id);
      if (next[key].length === 0) delete next[key];
      commit(next);
      return true;
    },
  };
}

function startCalendarApp() {
  const monthTitle = document.querySelector("#calendar-month");
  const dates = document.querySelector("#calendar-dates");
  const navigation = document.querySelector(".Calendar__Navigation");
  const schedule = document.querySelector("#schedule");
  const scheduleDate = document.querySelector("#schedule-date");
  const form = document.querySelector("#schedule-form");
  const titleInput = document.querySelector("#schedule-title");
  const addButton = form.querySelector("button[type='submit']");
  const list = document.querySelector("#schedule-list");
  const empty = document.querySelector("#schedule-empty");
  const formError = document.querySelector("#schedule-error");
  const storageError = document.querySelector("#storage-error");
  const status = document.querySelector("#app-status");
  const monthFormat = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });
  const dateFormat = new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "long" });
  const today = new Date();
  const state = { year: today.getFullYear(), month: today.getMonth(), selectedDate: null, store: null };

  try {
    state.store = createEventStore(window.localStorage);
  } catch (error) {
    storageError.textContent = error instanceof ScheduleDataError
      ? "저장된 일정 데이터의 형식에 문제가 있습니다. 데이터를 확인한 뒤 새로고침해 주세요."
      : "저장된 일정을 불러오지 못했습니다. 브라우저 저장소 설정을 확인한 뒤 새로고침해 주세요.";
    storageError.hidden = false;
  }

  function announce(message) {
    status.textContent = message;
  }

  function clearInput() {
    form.reset();
    formError.hidden = true;
    formError.textContent = "";
    titleInput.removeAttribute("aria-invalid");
  }

  function showError(message, invalid = false) {
    formError.textContent = message;
    formError.hidden = false;
    if (invalid) titleInput.setAttribute("aria-invalid", "true");
    else titleInput.removeAttribute("aria-invalid");
  }

  function renderCalendar() {
    monthTitle.textContent = monthFormat.format(localDate(state.year, state.month));
    const fragment = document.createDocumentFragment();
    for (const cell of getMonthCells(state.year, state.month)) {
      const element = document.createElement(cell.isCurrentMonth ? "button" : "span");
      element.className = "Calendar__Day";
      element.textContent = String(cell.day);
      if (cell.isCurrentMonth) {
        element.type = "button";
        element.dataset.date = cell.key;
        element.setAttribute("aria-label", dateFormat.format(parseDateKey(cell.key)));
        element.setAttribute("aria-pressed", String(cell.key === state.selectedDate));
        element.classList.toggle("Calendar__Day--Selected", cell.key === state.selectedDate);
      } else {
        element.classList.add("Calendar__Day--Outside");
        element.setAttribute("aria-hidden", "true");
      }
      fragment.append(element);
    }
    dates.replaceChildren(fragment);
  }

  function renderSchedule() {
    schedule.hidden = state.selectedDate === null;
    if (schedule.hidden) return;

    scheduleDate.textContent = dateFormat.format(parseDateKey(state.selectedDate));
    titleInput.disabled = state.store === null;
    addButton.disabled = state.store === null;
    const events = state.store?.list(state.selectedDate) ?? [];
    const fragment = document.createDocumentFragment();
    for (const event of events) {
      const item = document.createElement("li");
      item.className = "Schedule__Item";
      const title = document.createElement("span");
      title.className = "Schedule__Title";
      title.textContent = event.title;
      const button = document.createElement("button");
      button.className = "Schedule__DeleteButton";
      button.type = "button";
      button.dataset.eventId = event.id;
      button.textContent = "삭제";
      button.setAttribute("aria-label", `${event.title} 삭제`);
      item.append(title, button);
      fragment.append(item);
    }
    list.replaceChildren(fragment);
    empty.hidden = events.length > 0;
    empty.textContent = state.store ? "등록된 일정이 없습니다" : "일정을 불러오지 못했습니다";
  }

  navigation.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-direction]");
    if (!button || button.disabled) return;
    Object.assign(state, shiftMonth(state.year, state.month, Number(button.dataset.direction)));
    state.selectedDate = null;
    clearInput();
    renderCalendar();
    renderSchedule();
    announce(`${monthTitle.textContent} 달력`);
  });

  dates.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-date]");
    if (!button || button.dataset.date === state.selectedDate) return;
    state.selectedDate = button.dataset.date;
    for (const day of dates.querySelectorAll("button[data-date]")) {
      const selected = day.dataset.date === state.selectedDate;
      day.classList.toggle("Calendar__Day--Selected", selected);
      day.setAttribute("aria-pressed", String(selected));
    }
    clearInput();
    renderSchedule();
    const count = state.store?.list(state.selectedDate).length ?? 0;
    announce(state.store ? `${scheduleDate.textContent}, 일정 ${count}개` : `${scheduleDate.textContent}, 일정을 불러오지 못했습니다`);
  });

  titleInput.addEventListener("input", () => {
    formError.hidden = true;
    titleInput.removeAttribute("aria-invalid");
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!state.selectedDate || !state.store) return;
    const title = titleInput.value.trim();
    if (!title) {
      showError("일정 제목을 입력해 주세요", true);
      titleInput.focus();
      return;
    }
    try {
      state.store.add(state.selectedDate, title);
    } catch {
      showError("일정을 저장하지 못했습니다. 다시 시도해 주세요");
      return;
    }
    clearInput();
    renderSchedule();
    titleInput.focus();
    announce(`${title} 일정이 추가되었습니다`);
  });

  list.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-event-id]");
    if (!button || !state.selectedDate || !state.store) return;
    const buttons = [...list.querySelectorAll("button[data-event-id]")];
    const index = buttons.indexOf(button);
    const deleted = state.store.list(state.selectedDate).find((item) => item.id === button.dataset.eventId);
    try {
      state.store.remove(state.selectedDate, button.dataset.eventId);
    } catch {
      showError("일정을 삭제하지 못했습니다. 다시 시도해 주세요");
      return;
    }
    formError.hidden = true;
    titleInput.removeAttribute("aria-invalid");
    renderSchedule();
    const remaining = list.querySelectorAll("button[data-event-id]");
    (remaining[index] ?? remaining[index - 1] ?? titleInput).focus();
    announce(`${deleted.title} 일정이 삭제되었습니다`);
  });

  renderCalendar();
}

if (typeof document !== "undefined") startCalendarApp();
