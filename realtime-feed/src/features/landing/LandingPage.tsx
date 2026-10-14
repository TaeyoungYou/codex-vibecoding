import { useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Asterisk,
  Check,
  ChevronDown,
  Image,
  Menu,
  MessageCircle,
  NotebookPen,
  PenLine,
  Radio,
  Sparkles,
  X,
} from "lucide-react";
import "./landing.css";

const modes = [
  {
    id: "text",
    label: "한 줄의 이야기",
    icon: MessageCircle,
    title: "거창한 이야기가 아니어도 좋아요.",
    description:
      "문득 떠오른 생각, 오늘의 기분, 가벼운 안부. 최대 1,000자 안에 당신의 이야기를 담아보세요.",
  },
  {
    id: "photo",
    label: "오늘의 한 장",
    icon: Image,
    title: "말 대신, 사진으로 전해요.",
    description:
      "산책길에 만난 풍경부터 소소한 일상까지. 사진을 최대 5장 함께 남길 수 있어요.",
  },
  {
    id: "drawing",
    label: "손끝의 작은 그림",
    icon: PenLine,
    title: "잘 그리지 않아도, 마음은 전해져요.",
    description:
      "마우스나 손가락으로 자유롭게 그려보세요. 내가 남긴 그림은 나중에 다시 열어 이어 그릴 수 있어요.",
  },
] as const;

const questions = [
  [
    "회원가입이 필요한가요?",
    "이메일이나 비밀번호 없이 닉네임만 정하면 인사를 남길 수 있어요. 둘러보기만 할 때는 닉네임도 필요하지 않아요.",
  ],
  [
    "내가 남긴 인사를 수정하거나 지울 수 있나요?",
    "네. 작성한 브라우저의 익명 세션이 유지되는 동안 내 인사를 수정하거나 삭제할 수 있어요. 브라우저의 사이트 데이터를 지우거나 다른 기기로 바꾸면 기존 인사의 변경 권한을 복구할 수 없어요.",
  ],
  [
    "누가 내 인사를 볼 수 있나요?",
    "방명록은 누구나 둘러볼 수 있는 공개 공간이에요. 글과 사진, 그림도 함께 공개되니 연락처나 개인적인 정보는 남기지 말아주세요.",
  ],
  [
    "글, 사진, 그림을 함께 남길 수 있나요?",
    "물론이에요. 글·사진·그림 중 하나만 선택하거나 자유롭게 조합할 수 있어요. 사진은 최대 5장, 직접 그린 그림은 인사마다 1개를 담을 수 있어요.",
  ],
];

function Brand() {
  return (
    <a className="Landing__Brand" href="/" aria-label="방명록 홈">
      <span className="Landing__BrandMark">
        <NotebookPen size={20} strokeWidth={1.7} aria-hidden="true" />
      </span>
      <span>
        방명록<span className="Landing__BrandEnglish">guestbook</span>
      </span>
    </a>
  );
}

function Flower({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 220 190"
      fill="none"
      aria-hidden="true"
    >
      <g
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M110 116c-3 19-3 36 1 59M110 149c-17-19-33-18-35-16 2 14 18 22 35 20M109 159c12-22 27-25 34-23-1 14-15 24-33 28" />
        <path
          d="M95 65c-29-28-50 9-27 25-30 15-8 50 16 32 0 35 39 32 37 3 27 21 49-13 27-29 35-8 18-48-9-32 9-32-32-43-36-12-12-23-36-3-26 14"
          fill="#fff"
        />
        <path
          d="M95 65c6-7 17-10 26-5 12 6 17 20 9 32-8 11-24 12-35 4-9-8-10-22 0-31Z"
          fill="#f3f0d6"
        />
        <path d="m100 77 1 2m17-3 1 2m-18 9c6 5 13 5 18-1M160 37l5-10m9 17 10-2M52 107l-9 5M60 45l-5-8" />
      </g>
    </svg>
  );
}

function TextPreview({ hero = false }: { hero?: boolean }) {
  return (
    <article
      className={`Landing__Note Landing__Note--Text${hero ? " Landing__Note--HeroText" : ""}`}
    >
      <div className="Landing__NoteMeta">
        <span className="Landing__Avatar">느</span>
        <div>
          <strong>느긋한 오후</strong>
          <span>소개용 예시</span>
        </div>
        <MessageCircle size={17} aria-hidden="true" />
      </div>
      <p>
        별일 없는 하루도
        <br />
        가끔은 꽤 좋은 하루니까.
        <br />
        <span>오늘도 잘 지내고 있나요?</span>
      </p>
      <span className="Landing__NoteTag">작은 안부를 남겼어요</span>
    </article>
  );
}

function PhotoPreview({ hero = false }: { hero?: boolean }) {
  return (
    <article
      className={`Landing__Note Landing__Note--Photo${hero ? " Landing__Note--HeroPhoto" : ""}`}
    >
      <img
        src="/landing/forest.jpg"
        alt="햇살이 나뭇잎 사이로 스며드는 초록빛 숲"
        width="800"
        height="600"
        loading={hero ? "eager" : "lazy"}
      />
      <p>잠깐, 쉬어 가도 괜찮아.</p>
      <span>산책하는 사람 · 소개용 예시</span>
    </article>
  );
}

function DrawingPreview({ hero = false }: { hero?: boolean }) {
  return (
    <article
      className={`Landing__Note Landing__Note--Drawing${hero ? " Landing__Note--HeroDrawing" : ""}`}
    >
      <div className="Landing__DrawingLabel">
        <PenLine size={14} aria-hidden="true" /> 마음 가는 대로, 쓱쓱
      </div>
      <Flower className="Landing__Flower" />
      <p>당신의 하루에 작은 꽃 하나.</p>
      <span>낙서쟁이 · 소개용 예시</span>
    </article>
  );
}

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [selected, setSelected] = useState(0);
  const mode = modes[selected];

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <div className="Landing">
      <a className="SkipLink" href="#landing-main">
        본문으로 건너뛰기
      </a>
      <header
        className="Landing__Header"
        onKeyDown={(event) => {
          if (event.key === "Escape" && menuOpen) {
            closeMenu();
            document
              .querySelector<HTMLButtonElement>(".Landing__MenuToggle")
              ?.focus();
          }
        }}
      >
        <div className="Landing__HeaderInner Landing__Container">
          <Brand />
          <nav className="Landing__DesktopNav" aria-label="주요 메뉴">
            <a href="#about">방명록 소개</a>
            <a href="#how-it-works">이용 방법</a>
            <a href="#questions">자주 묻는 질문</a>
          </nav>
          <a className="Landing__HeaderCta" href="/guestbook">
            방명록 가기 <ArrowUpRight size={16} aria-hidden="true" />
          </a>
          <button
            className="Landing__MenuToggle"
            type="button"
            aria-label={menuOpen ? "메뉴 닫기" : "메뉴 열기"}
            aria-expanded={menuOpen}
            aria-controls="landing-mobile-menu"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={23} /> : <Menu size={23} />}
          </button>
        </div>
        {menuOpen && (
          <nav
            id="landing-mobile-menu"
            className="Landing__MobileNav"
            aria-label="모바일 주요 메뉴"
          >
            <a href="#about" onClick={closeMenu}>
              방명록 소개
            </a>
            <a href="#how-it-works" onClick={closeMenu}>
              이용 방법
            </a>
            <a href="#questions" onClick={closeMenu}>
              자주 묻는 질문
            </a>
          </nav>
        )}
      </header>

      <main id="landing-main">
        <section
          className="Landing__Hero Landing__Container"
          aria-labelledby="hero-heading"
        >
          <div className="Landing__HeroCopy">
            <p className="Landing__Eyebrow">
              <Asterisk
                className="Landing__TinyStar"
                size={20}
                aria-hidden="true"
              />{" "}
              A LITTLE HELLO, A LITTLE CLOSER
            </p>
            <h1 id="hero-heading">
              작은 인사로,
              <br />
              가까워지는 우리<span className="Landing__Period">.</span>
            </h1>
            <p className="Landing__HeroDescription">
              한 줄의 이야기, 오늘의 사진, 손끝의 낙서까지.
              <br className="Landing__DesktopBreak" /> 당신다운 흔적을 남기고,
              서로의 하루를 만나보세요.
            </p>
            <div className="Landing__HeroActions">
              <a
                className="Landing__Button Landing__Button--Primary"
                href="/guestbook"
              >
                첫 인사 남기기 <ArrowUpRight size={19} aria-hidden="true" />
              </a>
              <a className="Landing__TextLink" href="#about">
                조금 더 알아보기 <ArrowDown size={15} aria-hidden="true" />
              </a>
            </div>
            <p className="Landing__HeroHint">
              <Check size={14} aria-hidden="true" /> 회원가입 없이, 닉네임
              하나면 충분해요
            </p>
          </div>
          <div
            className="Landing__HeroVisual"
            aria-label="글·사진·그림으로 남기는 인사의 예시"
          >
            <div className="Landing__VisualCaption">
              <span /> 서로 다른 하루가 만나는 곳
            </div>
            <Asterisk
              className="Landing__VisualSpark"
              size={50}
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <TextPreview hero />
            <PhotoPreview hero />
            <DrawingPreview hero />
            <span className="Landing__Handwritten" aria-hidden="true">
              반가워요, 당신!
            </span>
            <svg
              className="Landing__SketchArrow"
              viewBox="0 0 90 65"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M82 8C78 53 35 64 11 30m0 0 3 20M11 30l20 5"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="Landing__ExampleLabel">
              실제 게시물이 아닌 소개용 예시입니다
            </span>
          </div>
        </section>

        <div className="Landing__IntroStrip Landing__Container">
          <span>부담 없이 남기고, 반갑게 만나는 작은 공간</span>
          <div>
            <span>
              <MessageCircle size={16} aria-hidden="true" /> 글 한 줄
            </span>
            <span>
              <Image size={16} aria-hidden="true" /> 사진 한 장
            </span>
            <span>
              <PenLine size={16} aria-hidden="true" /> 그림 한 조각
            </span>
          </div>
        </div>

        <section
          className="Landing__About"
          id="about"
          aria-labelledby="about-heading"
        >
          <div className="Landing__Container Landing__AboutGrid">
            <div className="Landing__AboutCopy">
              <p className="Landing__Eyebrow">YOUR OWN WAY TO SAY HELLO</p>
              <h2 id="about-heading">
                인사에 정해진
                <br />
                모양은 없으니까.
              </h2>
              <p className="Landing__SectionDescription">
                말로, 사진으로, 때로는 그림으로.
                <br />
                가장 나다운 방법으로 마음을 전해요.
              </p>
              <div className="Landing__Modes" aria-label="인사 미리보기 선택">
                {modes.map((item, index) => (
                  <button
                    className={`Landing__Mode${index === selected ? " Landing__Mode--Active" : ""}`}
                    type="button"
                    aria-pressed={selected === index}
                    aria-controls="expression-preview"
                    key={item.id}
                    onClick={() => setSelected(index)}
                  >
                    <item.icon size={18} strokeWidth={1.6} aria-hidden="true" />
                    <span>{item.label}</span>
                    <ArrowRight size={17} aria-hidden="true" />
                  </button>
                ))}
              </div>
            </div>
            <div className="Landing__Expression" id="expression-preview">
              <div
                className={`Landing__ExpressionCanvas Landing__ExpressionCanvas--${mode.id}`}
              >
                <span className="Landing__PreviewLabel">
                  GUESTBOOK / {String(selected + 1).padStart(2, "0")}
                </span>
                <div className="Landing__PreviewNote" key={mode.id}>
                  {selected === 0 ? (
                    <TextPreview />
                  ) : selected === 1 ? (
                    <PhotoPreview />
                  ) : (
                    <DrawingPreview />
                  )}
                </div>
                <span className="Landing__CanvasFootnote">
                  여기에 당신의 이야기가 더해져요
                </span>
              </div>
              <div
                className="Landing__ExpressionDescription"
                aria-live="polite"
                aria-atomic="true"
              >
                <h3>{mode.title}</h3>
                <p>{mode.description}</p>
              </div>
            </div>
          </div>
        </section>

        <section
          className="Landing__How Landing__Container"
          id="how-it-works"
          aria-labelledby="how-heading"
        >
          <div className="Landing__SectionHeading">
            <div>
              <p className="Landing__Eyebrow">SMALL STEPS, WARM CONNECTIONS</p>
              <h2 id="how-heading">시작은 아주 가볍게.</h2>
            </div>
            <p>
              복잡한 준비는 내려두고,
              <br />
              반가운 마음만 가져오세요.
            </p>
          </div>
          <ol className="Landing__Steps">
            <li>
              <span className="Landing__StepNumber">
                01
                <span />
                <ArrowRight size={16} aria-hidden="true" />
              </span>
              <h3>불리고 싶은 이름으로</h3>
              <p>
                닉네임 하나면 준비 끝.
                <br />
                이메일도, 비밀번호도 필요 없어요.
              </p>
            </li>
            <li>
              <span className="Landing__StepNumber">
                02
                <span />
                <ArrowRight size={16} aria-hidden="true" />
              </span>
              <h3>당신다운 인사를 남겨요</h3>
              <p>
                글·사진·그림을 자유롭게 조합해요.
                <br />내 인사는 나중에 고칠 수도 있어요.
              </p>
            </li>
            <li>
              <span className="Landing__StepNumber">
                03
                <span />
                <Sparkles size={17} aria-hidden="true" />
              </span>
              <h3>서로의 하루를 만나요</h3>
              <p>
                누군가 남긴 새로운 인사를 읽으며
                <br />
                작은 연결의 순간을 느껴보세요.
              </p>
            </li>
          </ol>
          <div className="Landing__Realtime">
            <span className="Landing__RadioIcon">
              <Radio size={22} strokeWidth={1.5} aria-hidden="true" />
            </span>
            <div>
              <h3>인사는, 지금도 이어지고 있어요.</h3>
              <p>
                새로운 글과 수정 사항이 새로고침 없이 전해져요. 읽고 있던 자리와
                작성 중인 이야기는 그대로.
              </p>
            </div>
            <span className="Landing__RealtimeLabel">REALTIME CONNECTION</span>
          </div>
        </section>

        <section
          className="Landing__Faq Landing__Container"
          id="questions"
          aria-labelledby="faq-heading"
        >
          <div>
            <p className="Landing__Eyebrow">GOOD TO KNOW</p>
            <h2 id="faq-heading">
              조금 더<br />
              궁금한가요?
            </h2>
            <span className="Landing__FaqDoodle" aria-hidden="true">
              hello :)
            </span>
          </div>
          <div className="Landing__Questions">
            {questions.map(([question, answer]) => (
              <details className="Landing__Question" key={question}>
                <summary>
                  {question}
                  <ChevronDown size={19} aria-hidden="true" />
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="Landing__Closing" aria-labelledby="closing-heading">
          <div className="Landing__Container Landing__ClosingInner">
            <div>
              <p className="Landing__Eyebrow">
                EVERY HELLO LEAVES A LITTLE WARMTH
              </p>
              <h2 id="closing-heading">
                당신의 작은 인사가
                <br />
                누군가의 반가움이 되도록.
              </h2>
              <p>오늘의 이야기를 기다리고 있을게요.</p>
              <a
                className="Landing__Button Landing__Button--Light"
                href="/guestbook"
              >
                방명록에 인사 남기기{" "}
                <ArrowUpRight size={19} aria-hidden="true" />
              </a>
            </div>
            <Flower className="Landing__ClosingFlower" />
          </div>
        </section>
      </main>

      <footer className="Landing__Footer Landing__Container">
        <div>
          <Brand />
          <p>작은 인사, 오래 남는 온기.</p>
        </div>
        <div className="Landing__FooterLinks">
          <a href="/guestbook">
            방명록 둘러보기 <ArrowUpRight size={14} aria-hidden="true" />
          </a>
          <a
            href="https://github.com/TaeyoungYou/codex-vibecoding/tree/main/realtime-feed"
            target="_blank"
            rel="noreferrer"
          >
            GitHub <ArrowUpRight size={14} aria-hidden="true" />
          </a>
        </div>
        <span className="Landing__FooterNote">MADE FOR LITTLE CONNECTIONS</span>
      </footer>
    </div>
  );
}
