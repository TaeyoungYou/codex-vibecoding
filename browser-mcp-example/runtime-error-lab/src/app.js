const missions = [
  {
    id: "mission-copy",
    title: "버튼 문구를 더 명확하게 바꾸기",
    summary: "사용자가 다음 행동을 바로 이해하도록 버튼과 보조 문구를 정리합니다.",
    minutes: 10,
    level: "쉬움",
    completed: true,
  },
  {
    id: "mission-empty-state",
    title: "빈 상태 화면 추가하기",
    summary: "목록이 비어 있을 때 사용자가 무엇을 해야 하는지 알려주는 안내 화면을 만듭니다.",
    minutes: 20,
    level: "보통",
    completed: false,
  },
  {
    id: "mission-mobile",
    title: "모바일 폭에서 카드가 잘리지 않게 하기",
    summary: "좁은 화면에서 카드와 버튼이 겹치지 않는지 확인하고 CSS를 정리합니다.",
    minutes: 25,
    level: "보통",
    completed: false,
  },
];

const featuredQuest = missions.find((mission) => mission.id === "mission-copy");

function renderFeaturedQuest() {
  const title = document.querySelector("[data-featured-title]");
  const summary = document.querySelector("[data-featured-summary]");
  const minutes = document.querySelector("[data-featured-minutes]");
  const level = document.querySelector("[data-featured-level]");

  title.textContent = featuredQuest.title;
  summary.textContent = featuredQuest.summary;
  minutes.textContent = `${featuredQuest.minutes}분`;
  level.textContent = featuredQuest.level;
}

function renderMissionList() {
  const list = document.querySelector("[data-mission-list]");
  const total = document.querySelector("[data-total-count]");

  total.textContent = missions.length;
  list.innerHTML = missions
    .map(
      (mission) => `
        <article class="mission-card">
          <strong>${mission.title}</strong>
          <p>${mission.summary}</p>
          <span>${mission.completed ? "완료" : `${mission.minutes}분 미션`}</span>
        </article>
      `,
    )
    .join("");
}

function boot() {
  renderFeaturedQuest();
  renderMissionList();
}

boot();
