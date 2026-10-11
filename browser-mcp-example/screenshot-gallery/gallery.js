const captures = [
  {
    siteName: "OpenAI Developers Codex",
    url: "https://developers.openai.com/codex",
    capturedAt: "2026-10-05",
    image: "./public/site-shots/openai-codex-2026-10-05-1365x768.png",
    note: "https://learn.chatgpt.com/docs로 이동한 Overview 첫 화면을 캡처했습니다.",
  },
  {
    siteName: "OpenAI Developers Codex CLI",
    url: "https://developers.openai.com/codex/cli",
    capturedAt: "2026-10-05",
    image: "./public/site-shots/openai-codex-cli-2026-10-05-1365x768.png",
    note: "ChatGPT Learn으로 이동한 Codex CLI 소개 페이지의 첫 화면을 캡처했습니다.",
  },
  {
    siteName: "OpenAI Developers Codex IDE Extension",
    url: "https://developers.openai.com/codex/ide",
    capturedAt: "2026-10-05",
    image: "./public/site-shots/openai-codex-ide-2026-10-05-1365x768.png",
    note: "ChatGPT Learn으로 이동한 Codex IDE 확장 소개 페이지의 첫 화면을 캡처했습니다.",
  },
];

function createCard(capture) {
  const card = document.createElement("article");
  card.className = "site-card";
  card.innerHTML = `
        <div class="site-card__image-frame"></div>
        <div class="site-card__body">
          <h2 class="site-card__title"></h2>
          <a class="site-card__url" target="_blank" rel="noopener noreferrer"></a>
          <p class="site-card__meta">
            <span class="site-card__date"></span>
            <span class="site-card__size"></span>
          </p>
          <p class="site-card__note"></p>
        </div>
  `;

  card.querySelector(".site-card__title").textContent = capture.siteName;
  const url = card.querySelector(".site-card__url");
  url.href = capture.url;
  url.textContent = capture.url;
  const meta = card.querySelector(".site-card__meta");
  const note = card.querySelector(".site-card__note");
  note.textContent = capture.note;

  function showFailure(reason) {
    const frame = document.createElement("div");
    frame.className = "site-card__image-frame site-card__image-frame--failed";
    const placeholder = document.createElement("p");
    placeholder.className = "site-card__placeholder";
    placeholder.textContent = "스크린샷을 표시할 수 없습니다.";
    frame.append(placeholder);
    card.querySelector(".site-card__image-frame").replaceWith(frame);
    meta.textContent = "캡처 실패";
    note.textContent = reason;
  }

  if (!capture.image || !capture.capturedAt) {
    showFailure(capture.note || "캡처한 이미지가 없습니다.");
    return card;
  }

  meta.querySelector(".site-card__date").textContent = `캡처 날짜 ${capture.capturedAt}`;
  meta.querySelector(".site-card__size").textContent = "1365×768";
  const frame = document.createElement("a");
  frame.className = "site-card__image-frame";
  frame.href = capture.url;
  frame.target = "_blank";
  frame.rel = "noopener noreferrer";
  const image = document.createElement("img");
  image.className = "site-card__image";
  image.alt = `${capture.siteName} 링크의 현재 첫 화면 스크린샷`;
  image.width = 1365;
  image.height = 768;
  image.addEventListener(
    "error",
    () => showFailure("저장된 스크린샷을 불러오지 못했습니다."),
    { once: true },
  );
  image.src = capture.image;
  frame.append(image);
  card.querySelector(".site-card__image-frame").replaceWith(frame);
  return card;
}

export function renderGallery(records = captures) {
  const gallery = document.querySelector("[data-gallery]");
  if (gallery) {
    gallery.replaceChildren(...records.map(createCard));
  }
}

renderGallery();
