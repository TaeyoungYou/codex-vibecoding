const api = window.sessionManager;
const state = { sessions: [], filtered: [], selectedId: null, detail: null, filter: 'all', request: 0 };
const $ = id => document.getElementById(id);
const dateFormatter = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
const shortDateFormatter = new Intl.DateTimeFormat('ko-KR', { month: 'short', day: 'numeric' });
let toastTimer;

function dateText(value, short = false) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return (short ? shortDateFormatter : dateFormatter).format(date);
}

function projectName(cwd) {
  return cwd?.split(/[\\/]/).filter(Boolean).pop() || '프로젝트 정보 없음';
}

function showToast(message, error = false) {
  const toast = $('toast');
  toast.textContent = message;
  toast.classList.toggle('error', error);
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 4500);
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function renderList() {
  const query = $('search-input').value.trim().toLocaleLowerCase();
  state.filtered = query ? state.sessions.filter(session => session.searchText.includes(query)) : state.sessions;
  $('session-count').textContent = state.sessions.length.toLocaleString('ko-KR');
  $('filtered-count').textContent = query ? `${state.filtered.length}개 결과` : `${state.sessions.length}개`;
  const list = $('session-list');
  list.replaceChildren();
  if (!state.filtered.length) {
    list.append(element('div', 'list-empty', query ? '검색 결과가 없습니다.\n다른 단어로 검색해 보세요.' : '저장된 세션이 없습니다.'));
    return;
  }
  const fragment = document.createDocumentFragment();
  for (const session of state.filtered) {
    const card = element('button', `session-card${session.id === state.selectedId ? ' selected' : ''}`);
    card.type = 'button';
    card.dataset.id = session.id;
    card.setAttribute('role', 'option');
    card.setAttribute('aria-selected', String(session.id === state.selectedId));
    const top = element('div', 'card-top');
    top.append(element('span', 'project-pill', `▦  ${projectName(session.cwd)}`), element('span', 'card-date', dateText(session.updatedAt, true)));
    card.append(top, element('div', 'card-title', session.title), element('div', 'card-preview', session.preview));
    const bottom = element('div', 'card-bottom');
    bottom.append(element('span', 'tiny-dot'), document.createTextNode(`${session.messageCount}개 메시지`));
    card.append(bottom);
    card.addEventListener('click', () => selectSession(session.id));
    card.addEventListener('dblclick', () => resumeSelected());
    fragment.append(card);
  }
  list.append(fragment);
}

function renderTranscript() {
  const container = $('transcript');
  container.replaceChildren();
  const messages = (state.detail?.messages || []).filter(message => state.filter === 'all' || message.role === state.filter);
  if (!messages.length) {
    container.append(element('div', 'transcript-empty', '표시할 메시지가 없습니다.'));
    return;
  }
  const fragment = document.createDocumentFragment();
  for (const message of messages) {
    const article = element('article', `message ${message.role}`);
    article.append(element('div', 'message-avatar', message.role === 'user' ? '나' : '✦'));
    const main = element('div', 'message-main');
    const meta = element('div', 'message-meta');
    meta.append(element('span', 'message-name', message.role === 'user' ? '나' : 'Codex'));
    if (message.role === 'assistant' && message.phase === 'commentary') meta.append(element('span', 'message-type', '진행 내용'));
    if (message.timestamp) meta.append(element('span', 'message-time', dateText(message.timestamp)));
    main.append(meta, element('div', 'message-body', message.text));
    article.append(main);
    fragment.append(article);
  }
  container.append(fragment);
}

function renderDetail() {
  const session = state.detail;
  $('empty-state').hidden = !!session;
  $('detail').hidden = !session;
  if (!session) return;
  $('detail-title').textContent = session.title;
  $('detail-preview').textContent = session.preview;
  $('detail-date').textContent = `마지막 활동 ${dateText(session.updatedAt)}`;
  $('detail-project').textContent = projectName(session.cwd);
  $('detail-cwd').textContent = session.cwd || '작업 폴더 정보 없음';
  $('detail-message-count').textContent = `${session.messageCount.toLocaleString('ko-KR')}개`;
  $('detail-id').textContent = session.id;
  $('detail-source').textContent = session.source ? `생성 위치: ${session.source}` : 'Codex 세션';
  renderTranscript();
}

async function selectSession(id) {
  if (id === state.selectedId && state.detail) return;
  state.selectedId = id;
  renderList();
  const selectedCard = [...document.querySelectorAll('.session-card')].find(card => card.dataset.id === id);
  selectedCard?.scrollIntoView({ block: 'nearest' });
  const request = ++state.request;
  try {
    const detail = await api.detail(id);
    if (request !== state.request) return;
    state.detail = detail;
    renderDetail();
    document.querySelector('.content').scrollTop = 0;
  } catch (error) {
    if (request === state.request) showToast(error.message || '세션을 읽을 수 없습니다.', true);
  }
}

async function refresh() {
  $('refresh-button').classList.add('loading');
  try {
    const { directory, sessions } = await api.list();
    const unchanged = sessions.length === state.sessions.length && sessions.every((session, index) =>
      session.id === state.sessions[index].id && session.updatedAt === state.sessions[index].updatedAt && session.messageCount === state.sessions[index].messageCount);
    if (unchanged && state.detail) return;
    state.sessions = sessions;
    $('directory-status').textContent = directory;
    $('directory-status').title = directory;
    const selected = sessions.find(session => session.id === state.selectedId);
    state.detail = null;
    renderList();
    if (selected) await selectSession(selected.id);
    else if (state.filtered.length) await selectSession(state.filtered[0].id);
    else { state.selectedId = null; renderDetail(); }
  } catch (error) {
    $('directory-status').textContent = '세션을 읽지 못했습니다';
    showToast(error.message || '세션 목록을 불러오지 못했습니다.', true);
  } finally {
    $('refresh-button').classList.remove('loading');
  }
}

async function resumeSelected() {
  if (!state.selectedId) return;
  try {
    const result = await api.resume(state.selectedId);
    showToast(result.usedHomeDirectory ? '저장된 작업 폴더가 없어 홈 폴더에서 Codex를 열었습니다.' : '터미널에서 Codex 세션을 열었습니다.');
  } catch (error) {
    showToast(error.message || 'Codex를 실행하지 못했습니다.', true);
  }
}

function moveSelection(delta) {
  if (!state.filtered.length) return;
  const index = state.filtered.findIndex(session => session.id === state.selectedId);
  const next = Math.max(0, Math.min(state.filtered.length - 1, index + delta));
  selectSession(state.filtered[next].id);
}

$('refresh-button').addEventListener('click', refresh);
$('directory-button').addEventListener('click', async () => {
  try {
    const error = await api.openDirectory();
    if (error) showToast(error, true);
  } catch (error) { showToast(error.message || '세션 폴더를 열지 못했습니다.', true); }
});
$('resume-button').addEventListener('click', resumeSelected);
$('copy-button').addEventListener('click', async () => {
  if (!state.selectedId) return;
  try { await navigator.clipboard.writeText(state.selectedId); showToast('세션 ID를 복사했습니다.'); }
  catch { showToast('세션 ID를 복사하지 못했습니다.', true); }
});
$('search-input').addEventListener('input', () => {
  renderList();
  if (state.filtered.length && !state.filtered.some(session => session.id === state.selectedId)) selectSession(state.filtered[0].id);
  else if (!state.filtered.length) { state.selectedId = null; state.detail = null; renderDetail(); }
});
document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
  state.filter = button.dataset.filter;
  document.querySelectorAll('[data-filter]').forEach(item => item.classList.toggle('active', item === button));
  renderTranscript();
}));
document.addEventListener('keydown', event => {
  const typing = event.target === $('search-input');
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault(); $('search-input').focus(); $('search-input').select(); return;
  }
  if (event.key === 'F5') { event.preventDefault(); refresh(); return; }
  if (event.key === 'Escape' && typing) { $('search-input').blur(); return; }
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    if (!typing && event.target.closest?.('.segmented')) return;
    event.preventDefault(); moveSelection(event.key === 'ArrowDown' ? 1 : -1); return;
  }
  if (event.key === 'Enter' && !typing && (event.target === document.body || event.target.id === 'session-list' || event.target.classList.contains('session-card'))) {
    event.preventDefault(); resumeSelected();
  }
});

refresh();
setInterval(() => { if (!document.hidden) refresh(); }, 30000);
