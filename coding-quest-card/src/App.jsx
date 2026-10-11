import { useState, useSyncExternalStore } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { quests } from './data/quests.js';

function subscribeToLocation(callback) {
  window.addEventListener('popstate', callback);
  return () => window.removeEventListener('popstate', callback);
}

function getQuestId() {
  const id = new URL(window.location.href).searchParams.get('quest');
  return quests.some((quest) => quest.id === id) ? id : quests[0].id;
}

function selectQuest(event, id) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  if (getQuestId() === id) return;
  const url = new URL(window.location.href);
  url.searchParams.set('quest', id);
  window.history.pushState(null, '', url);
  window.dispatchEvent(new window.Event('popstate'));
}

function Icon({ name, className = '' }) {
  const paths = {
    arrow: 'M5 12h14m-6-6 6 6-6 6',
    external: 'M7 17 17 7M7 7h10v10',
    play: 'm9 5 10 7-10 7V5Z',
    code: 'm8 7-5 5 5 5m8-10 5 5-5 5m-3-13-2 16',
    reset: 'M3 10a9 9 0 1 1 2 8M3 4v6h6',
    copy: 'M8 8h12v12H8V8ZM4 15H2V2h13v2',
  };
  return <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}

function QuestDetail({ quest, index }) {
  const [replay, setReplay] = useState(0);
  const [copyStatus, setCopyStatus] = useState('');
  const reduceMotion = useReducedMotion();
  const Demo = quest.Demo;

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(quest.code);
      setCopyStatus('코드를 복사했어요.');
    } catch {
      setCopyStatus('복사할 수 없어요. 코드를 직접 선택해주세요.');
    }
  }

  return (
    <motion.article className="quest-detail" aria-labelledby="quest-title" initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <div className="quest-detail__eyebrow"><span className="quest-detail__number">QUEST 0{index + 1}</span><span>{quest.label}</span></div>
      <h2 id="quest-title" className="quest-detail__title">{quest.title}</h2>
      <p className="quest-detail__description">{quest.description}</p>
      <div className="quest-detail__apis" aria-label="이 퀘스트의 API">{quest.apis.map((api) => <code key={api} className="quest-detail__api">{api}</code>)}</div>

      <section className="preview" aria-labelledby="preview-heading">
        <div className="preview__header">
          <h3 id="preview-heading" className="preview__title"><Icon name="play" /> 직접 움직여 보기</h3>
          <button className="preview__reset" onClick={() => setReplay(replay + 1)}><Icon name="reset" /> 다시 실행</button>
        </div>
        <Demo key={replay} />
        <div className="preview__footer"><span className="preview__dot" aria-hidden="true" /> LIVE PREVIEW <span>학습용으로 작성한 고정 예제</span></div>
      </section>

      <section className="learning-note" aria-labelledby="learning-heading">
        <div className="learning-note__heading"><span className="learning-note__marker" aria-hidden="true">↳</span><h3 id="learning-heading">이번 퀘스트에서 배울 것</h3></div>
        <p className="learning-note__goal">{quest.goal}</p>
        <ul className="learning-note__list">{quest.notes.map((note) => <li key={note}>{note}</li>)}</ul>
      </section>

      <section className="code-view" aria-labelledby="code-heading">
        <div className="code-view__header"><h3 id="code-heading"><Icon name="code" /> 실행 중인 예제 코드</h3><button className="code-view__copy" onClick={copyCode}><Icon name="copy" /> 코드 복사</button></div>
        <pre className="code-view__content" tabIndex={0} aria-label="React 예제 코드"><code>{quest.code}</code></pre>
        <div className="code-view__footer"><span>React / JSX · motion/react</span><span role="status">{copyStatus || '레이아웃과 색상은 공통 CSS를 사용합니다.'}</span></div>
      </section>

      <div className="quest-detail__next-step"><div><span className="quest-detail__small-label">내 프로젝트에 적용하기</span><p>{quest.challenge}</p></div><a className="quest-detail__docs" href={quest.docs} target="_blank" rel="noreferrer">공식 문서 읽기 <Icon name="external" /></a></div>
    </motion.article>
  );
}

export default function App() {
  const questId = useSyncExternalStore(subscribeToLocation, getQuestId);
  const index = quests.findIndex((quest) => quest.id === questId);
  const quest = quests[index];

  return (
    <div className="app">
      <a className="app__skip" href="#quest-content">학습 내용으로 이동</a>
      <header className="app-header">
        <a className="app-header__brand" href="./" aria-label="Motion Lab 처음으로"><span className="app-header__logo" aria-hidden="true">M</span><span>Motion<span className="app-header__brand-light"> Lab</span></span></a>
        <a className="app-header__reference" href="https://motion.dev/docs/react" target="_blank" rel="noreferrer">Motion for React <span className="app-header__version">v14.0.0</span><Icon name="external" /></a>
      </header>

      <section className="intro" aria-labelledby="app-title">
        <p className="intro__eyebrow"><span aria-hidden="true" /> LEARN BY MAKING</p>
        <h1 id="app-title" className="intro__title">오늘의 코딩 퀘스트<span className="intro__title-dot">.</span></h1>
        <p className="intro__description">작은 움직임을 이해하고, 내 프로젝트에 더해보세요.<br />Motion for React를 위한 다섯 가지 실습 노트.</p>
        <span className="intro__badge">학습용 예제 모음</span>
      </section>

      <div className="workspace">
        <aside className="quest-nav">
          <div className="quest-nav__heading"><h2>학습 퀘스트</h2><span>05</span></div>
          <nav className="quest-nav__list" aria-label="학습 퀘스트">
            {quests.map((item, itemIndex) => (
              <a key={item.id} href={'?quest=' + item.id} onClick={(event) => selectQuest(event, item.id)} aria-current={item.id === questId ? 'page' : undefined} className={'quest-nav__item' + (item.id === questId ? ' quest-nav__item--active' : '')}>
                <span className="quest-nav__index">0{itemIndex + 1}</span><span className="quest-nav__text"><strong>{item.shortTitle}</strong><span>{item.label}</span></span><Icon name="arrow" className="quest-nav__arrow" />
              </a>
            ))}
          </nav>
          <div className="quest-nav__note"><span className="quest-nav__note-symbol" aria-hidden="true">✳</span><p>먼저 동작을 살펴보세요.<br />코드가 조금 더 쉬워집니다.</p><span>보기 → 실험하기 → 적용하기</span></div>
        </aside>
        <main id="quest-content" className="workspace__content" tabIndex={-1}><QuestDetail key={questId} quest={quest} index={index} /></main>
      </div>
      <footer className="app-footer"><span>Motion Lab · 오늘의 코딩 퀘스트</span><span>내 속도로 배우는 작은 움직임.</span></footer>
    </div>
  );
}
