(() => {
  "use strict";

  const STORAGE_KEY = "today-board-state-v1";
  const dateLabel = document.querySelector("#today-date");
  const focusInput = document.querySelector("#focus-input");
  const taskForm = document.querySelector("#task-form");
  const taskInput = document.querySelector("#task-input");
  const taskError = document.querySelector("#task-error");
  const taskList = document.querySelector("#task-list");
  const taskCount = document.querySelector("#task-count");
  const taskTemplate = document.querySelector("#task-template");
  const emptyState = document.querySelector("#empty-state");
  const saveStatus = document.querySelector("#save-status");
  const saveDot = document.querySelector("#save-dot");
  const storageMessage = document.querySelector("#storage-message");
  const actionMessage = document.querySelector("#action-message");

  function showStorageError(message) {
    saveStatus.textContent = "저장 상태를 확인해 주세요";
    saveDot.classList.add("has-error");
    storageMessage.textContent = message;
    storageMessage.hidden = false;
  }

  // 손상된 저장 데이터 때문에 보드 전체가 멈추지 않도록 구조도 확인합니다.
  function isValidState(value) {
    if (!value || typeof value.focus !== "string" || !Array.isArray(value.tasks)) {
      return false;
    }

    const ids = new Set();
    return value.tasks.every((task) => {
      if (!task || typeof task.id !== "string" || !task.id || ids.has(task.id) ||
          typeof task.text !== "string" || !task.text.trim() ||
          typeof task.completed !== "boolean") {
        return false;
      }
      ids.add(task.id);
      return true;
    });
  }

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (!isValidState(parsed)) {
          throw new Error("Invalid board data");
        }
        return parsed;
      }
    } catch {
      showStorageError("저장된 내용을 불러오지 못했어요. 지금도 보드를 사용할 수 있고, 내용을 바꾸면 다시 저장을 시도해요.");
    }
    return { focus: "", tasks: [] };
  }

  const state = loadState();

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      saveStatus.textContent = "자동으로 저장됐어요";
      saveDot.classList.remove("has-error");
      storageMessage.hidden = true;
      storageMessage.textContent = "";
    } catch {
      // 저장이 막혀도 현재 화면의 입력은 유지합니다.
      showStorageError("변경한 내용을 저장하지 못했어요. 새로고침하면 사라질 수 있으니, 필요한 내용을 따로 복사해 주세요.");
    }
  }

  function updateDate() {
    const now = new Date();
    dateLabel.textContent = new Intl.DateTimeFormat("ko-KR", {
      year: "numeric", month: "long", day: "numeric", weekday: "long",
    }).format(now);
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    dateLabel.dateTime = `${now.getFullYear()}-${month}-${day}`;
  }

  function updateListSummary() {
    emptyState.hidden = state.tasks.length > 0;
    taskCount.textContent = `${state.tasks.length}개`;
  }

  function createTaskElement(task) {
    const row = taskTemplate.content.firstElementChild.cloneNode(true);
    const checkbox = row.querySelector(".task-checkbox");
    const deleteButton = row.querySelector(".delete-button");

    // 사용자 입력은 HTML로 해석하지 않고 텍스트로 표시합니다.
    row.querySelector(".task-text").textContent = task.text;
    checkbox.checked = task.completed;
    row.classList.toggle("is-complete", task.completed);
    deleteButton.setAttribute("aria-label", `${task.text} 삭제`);

    checkbox.addEventListener("change", () => {
      task.completed = checkbox.checked;
      row.classList.toggle("is-complete", task.completed);
      saveState();
      actionMessage.textContent = task.completed ? "할 일을 완료했어요." : "할 일을 다시 진행 중으로 바꿨어요.";
    });

    deleteButton.addEventListener("click", () => {
      const nextRow = row.nextElementSibling || row.previousElementSibling;
      state.tasks = state.tasks.filter((item) => item.id !== task.id);
      row.remove();
      updateListSummary();
      saveState();
      actionMessage.textContent = `할 일을 삭제했어요. ${state.tasks.length}개가 남아 있어요.`;
      // 삭제한 버튼 대신 다음 항목이나 입력창으로 포커스를 옮깁니다.
      (nextRow?.querySelector(".task-checkbox") || taskInput).focus();
    });

    return row;
  }

  focusInput.value = state.focus;
  state.tasks.forEach((task) => taskList.append(createTaskElement(task)));
  updateDate();
  updateListSummary();

  focusInput.addEventListener("input", () => {
    state.focus = focusInput.value;
    saveState();
  });

  taskInput.addEventListener("input", () => {
    taskError.hidden = true;
    taskError.textContent = "";
    taskInput.removeAttribute("aria-invalid");
  });

  // 한글 조합을 확정하는 Enter가 할 일을 바로 등록하지 않게 합니다.
  taskInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && (event.isComposing || event.keyCode === 229)) {
      event.preventDefault();
    }
  });

  taskForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = taskInput.value.trim();
    if (!text) {
      taskError.textContent = "먼저 할 일을 적어 주세요. 작은 일도 좋아요.";
      taskError.hidden = false;
      taskInput.setAttribute("aria-invalid", "true");
      taskInput.focus();
      return;
    }

    const task = {
      id: typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      text,
      completed: false,
    };
    state.tasks.push(task);
    taskList.append(createTaskElement(task));
    updateListSummary();
    saveState();
    taskInput.value = "";
    taskError.hidden = true;
    taskError.textContent = "";
    taskInput.removeAttribute("aria-invalid");
    actionMessage.textContent = `할 일을 추가했어요. 모두 ${state.tasks.length}개예요.`;
    taskInput.focus();
  });

  // 날짜 표시만 갱신하고 목표와 목록은 날짜가 바뀌어도 보존합니다.
  window.setInterval(updateDate, 60_000);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) updateDate();
  });
})();
