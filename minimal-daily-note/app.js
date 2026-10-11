const storageKey = "minimal-daily-note.entries.v1";
const moods = ["좋음", "보통", "힘듦"];
const form = document.querySelector("#diary-form");
const contentInput = document.querySelector("#diary-content");
const formStatus = document.querySelector("#form-status");
const saveButton = document.querySelector("#save-button");
const entryCount = document.querySelector("#entry-count");
const emptyState = document.querySelector("#empty-state");
const emptyTitle = document.querySelector("#empty-title");
const emptyDescription = document.querySelector("#empty-description");
const entryList = document.querySelector("#entry-list");

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

document.querySelector("#today-date").textContent = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
}).format(new Date());

let entries = [];

function showStatus(message, state = "") {
  formStatus.textContent = message;
  formStatus.dataset.state = state;
}

function isValidEntry(entry) {
  return entry &&
    typeof entry.content === "string" &&
    entry.content.trim() !== "" &&
    moods.includes(entry.mood) &&
    typeof entry.createdAt === "string" &&
    !Number.isNaN(Date.parse(entry.createdAt));
}

function renderEntries() {
  entryCount.textContent = `${entries.length}개의 기록`;
  emptyState.hidden = entries.length > 0;
  entryList.hidden = entries.length === 0;
  entryList.replaceChildren();

  const fragment = document.createDocumentFragment();

  for (const entry of entries) {
    const item = document.createElement("li");
    item.className = "entry-card";

    const meta = document.createElement("div");
    meta.className = "entry-card__meta";

    const date = document.createElement("time");
    date.className = "entry-card__date";
    date.dateTime = entry.createdAt;
    date.textContent = dateFormatter.format(new Date(entry.createdAt));

    const mood = document.createElement("span");
    mood.className = "entry-card__mood";
    mood.textContent = entry.mood;

    const content = document.createElement("p");
    content.className = "entry-card__content";
    content.textContent = entry.content;

    meta.append(date, mood);
    item.append(meta, content);
    fragment.append(item);
  }

  entryList.append(fragment);
}

try {
  const saved = localStorage.getItem(storageKey);
  if (saved !== null) {
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed) || !parsed.every(isValidEntry)) {
      throw new Error("Invalid diary data");
    }
    entries = parsed.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }
  renderEntries();
} catch {
  saveButton.disabled = true;
  entryCount.textContent = "기록을 불러올 수 없음";
  emptyTitle.textContent = "기록을 불러오지 못했어요.";
  emptyDescription.textContent = "브라우저 저장 공간을 확인해 주세요.";
  showStatus("저장된 일기를 읽을 수 없어 새 일기를 저장할 수 없습니다.", "error");
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const content = contentInput.value.trim();
  const mood = new FormData(form).get("mood");

  if (!moods.includes(mood)) {
    showStatus("오늘의 기분을 선택해 주세요.", "error");
    form.querySelector('input[name="mood"]').focus();
    return;
  }

  if (!content) {
    showStatus("일기 내용을 한 글자 이상 적어 주세요.", "error");
    contentInput.focus();
    return;
  }

  const nextEntries = [{ content, mood, createdAt: new Date().toISOString() }, ...entries];

  try {
    localStorage.setItem(storageKey, JSON.stringify(nextEntries));
  } catch {
    showStatus("저장하지 못했어요. 브라우저 저장 공간을 확인해 주세요.", "error");
    return;
  }

  entries = nextEntries;
  renderEntries();
  form.reset();
  showStatus("일기가 저장되었어요.");
  contentInput.focus();
});
