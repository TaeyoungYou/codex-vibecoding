---
version: alpha
name: Realtime Guestbook
description: B안 중앙 단일 피드형 방명록의 흑백·라이트 디자인 시스템
colors:
  background: "#FFFFFF"
  foreground: "#171717"
  card: "#FFFFFF"
  card-foreground: "#171717"
  popover: "#FFFFFF"
  popover-foreground: "#171717"
  primary: "#171717"
  primary-foreground: "#FFFFFF"
  primary-hover: "#333333"
  primary-pressed: "#404040"
  secondary: "#F5F5F5"
  secondary-foreground: "#171717"
  accent: "#F5F5F5"
  accent-foreground: "#171717"
  muted: "#FAFAFA"
  muted-foreground: "#737373"
  text-body: "#525252"
  outline-variant: "#E5E5E5"
  outline: "#8A8A8A"
  destructive: "#B91C1C"
  destructive-foreground: "#FFFFFF"
  error-surface: "#FEF2F2"
  overlay: "rgb(0 0 0 / 0.33)"
typography:
  heading-desktop:
    fontFamily: &ui-font >-
      Inter, Pretendard, -apple-system, BlinkMacSystemFont,
      "Segoe UI", "Noto Sans KR", "Malgun Gothic", sans-serif
    fontSize: 28px
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: -0.03em
  heading-mobile:
    fontFamily: *ui-font
    fontSize: 24px
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: -0.03em
  dialog-title:
    fontFamily: *ui-font
    fontSize: 20px
    fontWeight: 600
    lineHeight: 1.4
  nickname:
    fontFamily: *ui-font
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1.5
  body:
    fontFamily: *ui-font
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.7
  input:
    fontFamily: *ui-font
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: *ui-font
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1.5
  caption:
    fontFamily: *ui-font
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.5
  description:
    fontFamily: *ui-font
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.6
rounded:
  control: 7px
  card: 10px
  dialog: 12px
  full: 9999px
spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 40px
  xxxl: 48px
components:
  page:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
  heading-desktop:
    textColor: "{colors.foreground}"
    typography: "{typography.heading-desktop}"
  heading-mobile:
    textColor: "{colors.foreground}"
    typography: "{typography.heading-mobile}"
  entry-card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    rounded: "{rounded.card}"
    padding: "{spacing.lg}"
  entry-body:
    backgroundColor: "{colors.card}"
    textColor: "{colors.text-body}"
    typography: "{typography.body}"
  entry-nickname:
    textColor: "{colors.card-foreground}"
    typography: "{typography.nickname}"
  entry-metadata:
    backgroundColor: "{colors.card}"
    textColor: "{colors.muted-foreground}"
    typography: "{typography.caption}"
  identity-avatar:
    rounded: "{rounded.full}"
    size: 36px
  popover:
    backgroundColor: "{colors.popover}"
    textColor: "{colors.popover-foreground}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    height: 44px
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.primary-foreground}"
  button-primary-pressed:
    backgroundColor: "{colors.primary-pressed}"
    textColor: "{colors.primary-foreground}"
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.secondary-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    height: 44px
  button-outline:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.control}"
    height: 44px
  button-outline-hover:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-foreground}"
  button-destructive:
    backgroundColor: "{colors.destructive}"
    textColor: "{colors.destructive-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    height: 44px
  input:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    typography: "{typography.input}"
    rounded: "{rounded.control}"
    height: 44px
  input-placeholder:
    backgroundColor: "{colors.background}"
    textColor: "{colors.muted-foreground}"
    typography: "{typography.input}"
  muted-status:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.muted-foreground}"
    typography: "{typography.description}"
  dialog:
    backgroundColor: "{colors.popover}"
    textColor: "{colors.popover-foreground}"
    rounded: "{rounded.dialog}"
    padding: "{spacing.lg}"
  dialog-title:
    textColor: "{colors.popover-foreground}"
    typography: "{typography.dialog-title}"
  error-alert:
    backgroundColor: "{colors.error-surface}"
    textColor: "{colors.destructive}"
  dialog-overlay:
    backgroundColor: "{colors.overlay}"
---

# 실시간 방명록 UI 디자인 가이드

작성일: 2026-10-11

기준: 기존에 선택한 **B · 중앙 피드형**, shadcn/ui 느낌의 흑백·라이트 스타일.

이 문서는 기존 시안을 실제 제품 UI로 구현하기 위한 시각·상호작용 명세다. 제품 기능·권한·입력 상한은 [PRD][prd]를 따른다. 작업
순서는 [구현 계획][implementation-plan]을 참고한다. 글자 크기·터치 영역·상태 표현처럼 여기서 구체화한 값은 기존 방향을
유지한 **구현용 설계자 기본값**이다.

## Overview

### 디자인 방향과 근거

방문자가 남긴 글·이미지·그림을 편하게 읽는 공간으로 만든다. 흰 바탕, 검은 주요 동작, 옅은 카드 경계, 넉넉한 여백을 사용한다. 시각적
강조는 콘텐츠와 현재 수행할 동작에 집중한다.

| 유지할 결정 | 적용 방식 |
| --- | --- |
| B · 중앙 피드형 | 게시물을 한 열로 읽고, 작성·수정은 별도 모달에서 진행 |
| 흑백·라이트 | 흰 배경과 중립 회색 토큰. 주요 버튼은 검은 바탕·흰 글자 |
| shadcn/ui 느낌 | 단정한 라운드, 얇은 테두리, 단순한 입력 요소와 대화상자 |
| 콘텐츠 중심 | 본문 → 업로드 이미지 → 그림 순서. 사용자가 올린 콘텐츠의 색상은 그대로 유지 |
| 반응형 | 작은 화면에서도 같은 읽기 순서와 한 열 구조 유지 |

시안 소스는 `.superpowers/brainstorm/144-1791749620/content/`의
`layout-options-v2.html`, `prototype-v1.css`, `layout-options-v2.css`,
`layout-options-v2.js`다. B안은 JS의 `selectLayout('feed')`와 CSS의
`body[data-layout="feed"]`에 정의되어 있다. 원본 HTML의 작성 사이드바만 읽어 A안을 구현하지 않도록 한다. 이 임시
디렉터리는 Git에서 제외되므로, 구현에 필요한 기준은 이 문서에 정리한다.

`ui-ux-pro-max`에서 확인한 `Minimalism & Swiss Style`, 초점 표시, 드래그 대체 조작, shadcn
Dialog의 초점 관리 지침을 적용했다. 디자인 시스템 자동 추천의 마케팅형 Hero·Testimonials·CTA 구조, 파란색·보라색
강조, 새 폰트 조합은 기존 방명록에 맞지 않아 채택하지 않았다. 컬러와 배치의 근거는 기존 시안이다.

### 시안에서 제품으로 옮길 때의 보완

| 항목 | 기존 시안 | 구현용 기본값과 이유 |
| --- | --- | --- |
| 본문·입력 글자 | 주로 12~14px | 16px로 높여 모바일 읽기·입력 가독성 확보 |
| 시간·안내 문구 | 일부 9~11px, `#A3A3A3` | 13~14px, `#737373`로 정보 가독성 확보 |
| 조작 영역 | 버튼 38px, 아이콘 30~34px | 클릭·터치 영역 최소 44×44 CSS px로 확대 |
| 입력·Outline 버튼 경계 | 옅은 회색 | 조작 경계는 `#8A8A8A`, 카드 구분선은 기존 `#E5E5E5` |
| 카드 간격 | 14px | 16px로 통일. 카드 모서리 10px는 유지 |
| 임시 기능 | 프로토타입 전용 기능 | PRD의 피드·실제 연결 상태·작성 동작만 적용 |

프로토타입 전용 기능은 레이아웃 선택, 새 글 체험, 전체/내 글 탭, 예시 게시물이다.
필터 탭은 별도 요구사항으로 확정되지 않았다.

## Colors

### 색상과 토큰

값은 sRGB HEX 기준이다. 구현 시 동일한 색을 CSS 변수로 정의하고, shadcn의 의미 토큰과 Tailwind 유틸리티로 연결한다.
OKLCH로 변환할 경우에도 아래 색상과 대비를 보존한다. 의미 토큰 방식은 [shadcn/ui Theming][shadcn-theming]을
따른다.

| 토큰 | 값 | 사용처 |
| --- | --- | --- |
| `--background` | `#FFFFFF` | 페이지 배경 |
| `--foreground` | `#171717` | 제목·주요 정보 |
| `--card`, `--popover` | `#FFFFFF` | 게시물·메뉴·모달 |
| `--card-foreground`, `--popover-foreground` | `#171717` | 해당 표면 위 기본 글자 |
| `--primary` | `#171717` | 저장·작성·완료 버튼 |
| `--primary-foreground` | `#FFFFFF` | 주요 버튼 글자·아이콘 |
| `--primary-hover` | `#333333` | 주요 버튼 hover |
| `--primary-pressed` | `#404040` | 주요 버튼 눌림 |
| `--secondary`, `--accent` | `#F5F5F5` | 보조 배경·hover |
| `--secondary-foreground`, `--accent-foreground` | `#171717` | 보조 표면 위 글자 |
| `--muted` | `#FAFAFA` | 안내·첨부·상태 표면 |
| `--muted-foreground` | `#737373` | 시간·보조 문구·placeholder |
| `--text-body` | `#525252` | 게시물 본문·일반 설명 |
| `--border` | `#E5E5E5` | 카드·영역 구분선 |
| `--input` | `#8A8A8A` | 입력·Outline 버튼의 조작 경계 |
| `--ring` | `#171717` | 키보드 초점 표시 |
| `--destructive` | `#B91C1C` | 오류·삭제 확인의 위험 동작 |
| `--destructive-foreground` | `#FFFFFF` | 위험 버튼 위 글자 |
| `--error-surface` | `#FEF2F2` | 오류 안내 배경 |
| `--overlay` | `rgb(0 0 0 / 0.33)` | 대화상자 뒤 화면 가림 |

붉은색은 기존 시안에도 있는 오류 표현을 의미 토큰으로 정리한 것이다. 평상시 화면은 흑백을 유지하며, 연결 상태는 글자와 아이콘으로 구분한다.
그림의 펜 색과 사용자가 올린 사진에는 UI 테마의 흑백 제한을 적용하지 않는다.

일반 텍스트는 배경 대비 4.5:1 이상을 목표로 한다. 특히 보조 글자를 더 연하게 만들지 않는다. `--border`는 장식적인 카드
구분용이며, 입력·선택·초점의 유일한 단서는 `--input` 또는 `--ring`을 사용한다. 기준은
[WCAG 텍스트 대비 설명][wcag-contrast]을 참고한다.

YAML의 `colors` 키는 CSS 토큰에서 `--`를 뺀 이름과 대응한다.
예외로 `--border`는 `outline-variant`, `--input`은 `outline`,
`--ring`은 `primary`에 대응한다. 이 별칭은 기존 색상을 바꾸지 않는다.
경계·초점·그림자·동작처럼 현재 스키마가 직접 지원하지 않는 속성은 본문에서 명세한다.

## Typography

### 타이포그래피와 아이콘

시안의 서체 우선순위를 유지한다.

```css
font-family: Inter, Pretendard, -apple-system, BlinkMacSystemFont,
  "Segoe UI", "Noto Sans KR", "Malgun Gothic", sans-serif;
```

설치·제공되지 않은 서체는 다음 시스템 서체로 대체한다. 외부 웹폰트 제공 방식은 구현자가 정하며, 폰트 로딩 전에도 본문을 읽을 수 있어야
한다.

| 역할 | 데스크톱 / 모바일 | 굵기 | 줄 높이 |
| --- | --- | --- | --- |
| 페이지 제목 | 28 / 24px | 650~700 | 1.4 |
| 영역·모달 제목 | 20 / 20px | 600 | 1.4 |
| 게시물 닉네임 | 14 / 14px | 600 | 1.5 |
| 게시물 본문·입력 | 16 / 16px | 400 | 본문 1.7, 입력 1.5 |
| 버튼·필드 레이블 | 14 / 14px | 500~600 | 1.5 |
| 시간·카운터·힌트 | 13 / 13px | 400 | 1.5 |
| 소개 설명·주요 안내 | 14 / 14px | 400 | 1.6 |

제목의 자간은 최대 `-0.03em`, 본문은 기본 자간을 사용한다. 긴 닉네임과 URL은 줄바꿈을 허용하고 본문 줄바꿈을 보존한다. 축소
가능한 flex/grid 자식과 `overflow-wrap: anywhere`로 넘침을 막는다. 오류·제한·버튼 레이블을 말줄임으로 감추지
않는다.

아이콘은 기존 SVG와 같은 선형 스타일을 사용한다. 구현용 기본 라이브러리는 Lucide이며, 한 화면에서 아이콘 계열을 혼합하지 않는다.
기본 18px, 조작 아이콘 20px, 선 굵기 약 1.7~2px다. 이미지·그림·더 보기·닫기·지우개·실행 취소·삭제·확인은 동일한 시각
규칙을 따른다. 글자 옆 장식 아이콘은 접근성 트리에서 숨기고, 아이콘 버튼에는 “이미지 제거”, “그림 창 닫기”처럼 동작 이름을 제공한다.

YAML의 글꼴 굵기는 위 허용 범위의 단일 기본값을 사용한다.
페이지 제목은 700, 버튼·필드 레이블은 600이다. 모바일 제목은 별도 토큰으로 정의한다.

## Layout

### 화면 구조와 반응형

읽기 순서는 헤더 → 소개 → 작성 시작 영역 → 피드 제목·정렬 안내 → 게시물 목록 → 더 보기 → 푸터다.

```text
헤더: 방명록                              연결 상태 · 닉네임

반가워요, 한마디 남겨주세요.
짧은 인사도, 좋아하는 이미지도, 방금 그린 낙서도 좋아요.

[ 무슨 이야기를 남길까요?                 이미지 · 그림 ]

남겨진 인사                                      최신순
[ 닉네임 · 시간                                  메뉴 ]
[ 본문                                                ]
[ 이미지                                              ]
[ 그림                                                ]

[ 다음 게시물 카드                                    ]
[ 더 보기                                             ]
```

이 구조도의 정렬·행 폭은 개념용이며, 실제 화면은 아래 치수를 사용한다.

| 영역 | 데스크톱·태블릿: 640px 이상 | 모바일: 640px 미만 |
| --- | --- | --- |
| 헤더 | 바깥 프레임 최대 1,120px, 좌우 28px, 상하 16px | 좌우 16px, 상하 12px. 메뉴·상태 줄바꿈 허용 |
| 소개·피드 프레임 | 776px 이하, 좌우 패딩 28px, 콘텐츠 최대 720px | 좌우 16px 제외. 항상 한 열 |
| 소개 여백 | 위 40px, 아래 24px | 위 28px, 아래 24px |
| 작성 시작 영역 | 내부 16px, 아래 피드까지 24px | 내부 12px. 이미지·그림 버튼이 안 맞으면 다음 행 |
| 카드 | 내부 24px, 카드 사이 16px | 내부 16px, 카드 사이 16px |
| 작성 모달 | 최대 너비 430px, 내부 24px | 화면 너비에서 24px 제외, 내부 16px |
| 닉네임·확인 모달 | 최대 너비 400px, 내부 24px | 화면 너비에서 24px 제외, 내부 16px |
| 그림 모달 | 최대 너비 960px, 내부 24px | 화면 너비에서 24px 제외, 내부 16px. 도구 모음 줄바꿈 |

시안의 776px은 피드 프레임의 패딩을 포함한 값이며, PRD의 약 720px은 실제 콘텐츠 폭이다. 넓은 화면에서도 카드 열을 늘리거나 작성
사이드바를 추가하지 않는다. 소개의 작은 선형 낙서 장식은 기존 SVG를 사용할 수 있으나 모바일 공간이 부족하면 숨긴다.

모든 모달의 최대 높이는 가용 뷰포트에서 위아래 12px 여백을 제외한 값이다. 제목·본문·하단 동작 영역으로 나누고 필요한 본문 영역을 세로
스크롤한다. 모바일 키보드가 열려도 포커스된 입력과 저장·완료 버튼까지 스크롤할 수 있어야 한다. 하단 동작 영역을 고정한다면 같은 높이의 본문
여백을 확보한다. 화면 가장자리와 기기 안전 영역도 함께 고려한다.

### 간격

| 종류 | 기본값 | 적용 |
| --- | --- | --- |
| 간격 단계 | 4, 8, 12, 16, 24, 32, 40, 48px | 요소 내부 → 요소 간 → 영역 간 순으로 증가 |

YAML의 카드·모달 패딩은 데스크톱 기본값이다. 모바일에서는 위 표의 16px을 적용한다.
버튼·입력의 44px 높이는 최소 높이 기준이며, 여러 줄 레이블이나 확대 시 높이 증가를 허용한다.

## Elevation & Depth

### 경계·그림자·초점

| 종류 | 기본값 | 적용 |
| --- | --- | --- |
| 카드 경계 | 1px, `--border` | 그림자는 기본적으로 사용하지 않음 |
| 팝오버 그림자 | `0 4px 16px rgb(0 0 0 / 0.08)` | 게시물 메뉴 |
| 모달 그림자 | `0 20px 80px rgb(0 0 0 / 0.13)` | 기존 시안의 떠 있는 창 표현 |
| 초점 링 | 2px, `--ring`, offset 2px | 표면과 구분되는 `focus-visible` 표시 |

레이어는 기본 0 → 메뉴 20 → 모달 overlay 40 → 모달 50 → 자식 overlay 60 → 자식 모달 70 → 단순 알림 80
순서를 기본값으로 한다. 토스트는 비대화형 알림이며 주요 조작·오류 복구를 대체하지 않는다.

## Shapes

### 모서리와 아바타

| 종류 | 기본값 | 적용 |
| --- | --- | --- |
| 컨트롤 라운드 | 7px | 버튼·입력 |
| 카드 라운드 | 10px | 작성 시작 영역·게시물 |
| 모달 라운드 | 12px | 작성·닉네임·확인·그림 창 |
| 아바타 | 원형, 기본 36px | 닉네임 첫 글자. 조작 버튼의 터치 영역과 구분 |

## Components

### 헤더와 작성 시작 영역

헤더에는 “방명록”, 실제 연결 상태, 본인 닉네임 메뉴를 둔다. 닉네임 미설정 상태의 작성 동작은 먼저 닉네임 창으로 연결한다. 읽기에는 인증
설정 완료를 요구하지 않는다. 닉네임 메뉴는 이름 변경을 제공하며 로그아웃·계정 복구 항목을 추가하지 않는다.

작성 시작 영역 전체를 가짜 입력 필드로 만들지 않고, “무슨 이야기를 남길까요?” 버튼과 이미지·그림 버튼을 각각 제공한다. 어느 동작으로
열었는지에 따라 작성 창의 해당 요소로 연결한다. 모바일에서도 빠른 동작의 클릭 영역은 줄이지 않는다.

### 게시물 카드

카드는 닉네임·작성 시간·수정 표시·본인 메뉴를 먼저 보여주고, 존재하는 콘텐츠만 이어서 보여준다. 닉네임은 작성 당시 표시 이름이며, 아바타와
닉네임이 소유권·운영자 인증 배지처럼 보이지 않게 한다. 작성 시간은 읽기 쉬운 상대 시간 또는 일시를 사용하되 정확한 일시도 확인 가능하게
한다.

이미지는 1장이면 한 열, 2~5장이면 두 열의 미리보기를 사용한다. 320px에서도 두 열이 맞도록 자식의 최소 폭을 제한한다. 미리보기는
`object-fit: contain`으로 내용을 잘라내지 않으며, 단일 이미지 표시 높이는 데스크톱 최대 360px·모바일 최대 320px로
제한할 수 있다. 그림 미리보기는 별도 블록으로 두고 기본 표시 높이는 220px·모바일 190px 이내에서 비율을 보존한다. 미디어를 누르면
크게 볼 수 있다.

파일의 실제 폭·높이 또는 비율로 이미지 영역을 미리 확보하고, 실패한 이미지는 빈 공간 대신 “이미지를 불러오지 못했어요”와 재시도를
표시한다. 확대 보기에는 닫기 버튼을 제공한다. 첨부 순서를 설명하는 대체 텍스트를 사용하되 검증하지 않은 이미지 내용을 자동으로 지어내지
않는다.

본인 카드의 메뉴는 “수정”, “삭제”를 제공한다. 메뉴는 키보드로 열고 선택할 수 있어야 한다. 카드 자체의 클릭이 편집·삭제를 수행하지
않는다.

### 버튼·입력·도움말

| 요소 | 기본 표현 | 상태 규칙 |
| --- | --- | --- |
| Primary | 검은 바탕·흰 글자, 높이 최소 44px | hover `#333333`, pressed `#404040` |
| Outline | 흰 바탕·검은 글자, `--input` 테두리 | hover `--accent`, 초점 링 별도 제공 |
| Ghost·아이콘 | 투명 바탕, 중립 글자·아이콘 | hover `--accent`, 클릭 영역 최소 44×44px |
| 위험 동작 | 삭제 확인 창의 위험 버튼에 `--destructive` | 메뉴의 “삭제”도 동작 이름과 구분 표시 제공 |
| 비활성 | 실제 `disabled`, 시각적 강조 감소 | 비활성 이유를 가까운 문구로 설명 |
| 처리 중 | 상태 글자와 필요 시 작은 진행 표시 | 중복 제출 방지. 처리 중 버튼 글자는 흐리게 만들지 않음 |
| Input·Textarea | 흰 바탕, 조작 경계, 항상 보이는 레이블 | 입력 글자 16px, focus 링, 오류 설명 연결 |

Primary의 hover·pressed 상태에서는 크기를 바꾸지 않는다.

닉네임에는 “닉네임”, 본문에는 “메시지 · 선택”처럼 레이블을 제공한다. 세 콘텐츠가 각각 선택 사항이라는 안내와 “최소 하나 필요” 규칙을
함께 표시한다. 입력 중 카운터는 갱신하되 화면 읽기 프로그램에 매 글자마다 알리지 않는다. 한글 조합 입력 중에는 확정 전 글자를 잘라내지
않는다.

### 작성·수정 모달

순서는 제목·닫기 → 작성자 정보 → 메시지 → 이미지 목록 → 그림 → 공개·용량 안내 → 오류/상태 → 취소·저장이다. 첨부 요소는 사용할
때 확장해 빈 편집 도구로 화면을 채우지 않는다. 본문은 최소 5줄 정도의 입력 영역을 제공한다.

이미지는 추가·교체·제거·앞으로 이동·뒤로 이동을 제공한다. 순서 변경은 드래그 없이도 버튼으로 가능해야 하며, 순서의 처음·끝에서 이동 불가
상태를 표시한다. 이는 [WCAG 드래그 대체 조작 지침][wcag-dragging]을 참고한 구현 기준이다.

그림에는 “그림 그리기” 또는 “다시 그리기”, “그림 제거”를 둔다. 저장한 그림을 다시 열 때 획 데이터를 불러오는 상태와 실패 상태를
표시하고, 실패를 빈 그림으로 대체하지 않는다.

저장 시작 후에는 “이미지 준비 중”, “업로드 중”, “저장 중”, “저장 결과 확인 중” 등 실제 확인 가능한 단계만 표시한다. 실제
진행률이 없다면 퍼센트를 만들지 않는다. 서버 저장 성공 후에만 창을 닫는다. 파일·본문·그림은 실패와 충돌 시 창 안에 유지한다.

### 그림 편집 모달

기준 캔버스는 900×600, 흰 바탕, 3:2다. 표시 크기는 가용 폭과 높이에 맞춰 축소하고 획 좌표·굵기는 기준 캔버스에 맞춰 복원한다.

도구 순서는 펜·지우개 → 색 → 굵기 → 실행 취소·전체 지우기다. 색은 시안의 검정 `#171717`, 빨강 `#E05252`, 노랑
`#D59E42`, 초록 `#5E8D72`, 파랑 `#5D82B5`, 보라 `#A18BB3`를 기본값으로 한다. 색 견본은 약 20px로
표시하되 조작 영역은 44px다. 선택은 체크·외곽선·선택 상태로도 표현한다. 색 이름, 펜·지우개 선택 상태, 굵기의 현재 값을 보조 기술에
제공한다.

모바일에서는 도구 그룹과 색 버튼을 여러 줄로 배치하고 굵기 조절은 충분한 폭을 확보한다. 캔버스 안에서만 터치 스크롤을 막고 밖에서는 정상
스크롤을 허용한다. 자유곡선 입력은 마우스·펜·터치로 제공하며, 도구 선택·실행 취소·취소·완료는 키보드로 조작 가능하게 한다.

“완료”는 게시물 초안에 그림을 반영한다. 서버 확정은 게시물의 저장 동작이다. “취소”는 그림 창을 열기 전의 초안으로 돌아간다. 실행
취소에는 지우개와 전체 지우기를 포함한다. 레이어·도형·텍스트·압력 감지·redo를 추가하지 않는다.

### 닉네임·삭제·미저장 변경 확인

닉네임 창은 “어떤 이름으로 남길까요?”, 2~16자 안내, 입력, “이 이름으로 시작하기”로 구성한다. 닫으면 공개 피드를 읽을 수 있다.
익명 계정 복구 제한을 짧게 안내하고 인증·프로필 저장 실패 시 입력을 유지한다.

삭제 확인은 “이 인사를 삭제할까요?”, “삭제한 게시물은 되돌릴 수 없어요. 첨부 파일 정리에는 시간이 걸릴 수 있어요.”, “취소”,
“삭제하기”를 사용한다. 즉시 파일까지 사라진다는 표현이나 실행 취소 버튼을 추가하지 않는다.

미저장 변경 확인은 “작성 중인 내용을 버릴까요?”, “계속 작성”, “버리기”로 구성한다. 최초 초점은 안전한 “계속 작성” 또는 “취소”
동작에 둔다.

### 상태와 문구

| 상태 | 화면 표현·문구 | 동작 |
| --- | --- | --- |
| 최초 조회 | 카드 형태의 정적인 skeleton과 “불러오는 중” | 오류·빈 피드와 구분 |
| 빈 피드 | “아직 남겨진 인사가 없어요.” + “첫 인사 남기기” | 작성 또는 닉네임 설정으로 연결 |
| 조회 실패 | “인사를 불러오지 못했어요.” + “다시 시도” | 이미 읽은 카드와 위치 유지 |
| 더 보기 중 | 기존 카드 아래 “더 불러오는 중” | 버튼 중복 실행 방지 |
| 연결 준비 | “연결 중” | 조회 성공만으로 연결 완료 표시하지 않음 |
| 연결 끊김 | “연결 끊김 · 화면이 최신 상태가 아닐 수 있어요.” | 입력 유지, 자동 제출 없음 |
| 복구 후 조회 실패 | “최신 내용을 확인하지 못했어요.” + “다시 시도” | 연결 복구와 최신성 확인을 구분 |
| 새 글 대기 | “새 글 N개 보기” | 아래를 읽는 중 자동 이동 없음. 버튼 동작 시 새 글 위치로 이동 |
| 입력 오류 | 문제 요소 아래 원인과 해결 방법 | 해당 입력과 연결. 제출 시 첫 오류 또는 오류 요약에 초점 |
| 저장 실패 | “저장하지 못했어요. 작성 중인 내용은 유지돼요.” | 창 유지, 재시도 가능 |
| 결과 미확인 | “저장 결과를 확인하지 못했어요.” | 초안 유지, 결과 확인 후 재시도. 성공·실패 단정 없음 |
| 버전 충돌 | “다른 창에서 수정된 내용이 있어요.” + “최신 내용 확인” | 초안 보존, 자동 덮어쓰기 없음 |
| 편집 중 삭제 | “이 게시물은 이미 삭제되었어요.” | 초안 유지. 새 글로 자동 전환하지 않음 |
| 그림 재편집 실패 | “그림 편집 데이터를 불러오지 못했어요.” | 미리보기와 기존 연결 보존, 재시도 제공 |
| 저장·삭제 성공 | “인사를 남겼어요.” / “수정했어요.” / “게시물을 삭제했어요.” | 실제 서버 확정 후 안내 |

성공 안내 토스트는 초점을 빼앗지 않는다.

새 글 버튼은 피드 상단 가까이에 두고 필요 시 해당 영역 안에서 sticky로 유지한다. 키보드 초점을 가리거나 모달 위에 뜨지 않게 한다.
연결·새 글 알림은 짧은 상태 영역에서 알리고 피드 전체를 매번 읽게 하지 않는다. 저장 오류는 자동으로 사라지는 토스트에만 남기지 않는다.

제한 안내에는 PRD의 값을 사용한다. 닉네임 2~16자, 메시지 최대 1,000자, 이미지 최대 5장·압축 후 장당 1 MiB·합계 5
MiB, 그림 1개다. 그림 미리보기 1 MiB와 획 데이터 512 KiB는 업로드 이미지 합계와 구분한다. 사용자에게는 문제가 된 항목과 수정
방법을 보여준다.

### 접근성·모달·움직임

웹 UI 기준으로 작성하며, native 앱의 pt·dp 수치를 CSS px 기준과 혼용하지 않는다. 44×44 CSS px은 이 프로젝트의
조작 영역 기본값이다.

- 키보드 읽기 순서를 화면 순서와 맞추고 본문으로 건너뛰는 링크를 제공한다. 브라우저 확대를 막지 않는다.
- Dialog에는 제목·설명을 연결하고 shadcn의 선택한 primitive가 제공하는 초점 제한·복귀를 활용한다. 직접 DOM 초점 제어로
  기본 동작을 중복 구현하지 않는다. [shadcn Dialog][shadcn-dialog]를 참고한다.
- 작성 창 위에 그림·확인 창을 열면 최상위 창만 조작·초점 대상이 된다. Escape는 최상위 창에만 적용하고 부모 작성 창과 초안을 함께
  닫지 않는다. 자식 창을 닫으면 부모의 해당 시작 버튼으로 초점을 돌린다.
- 닫기 버튼·Escape·바깥 클릭은 같은 미저장 변경 규칙을 따른다. 저장 중에는 닫기를 막고 처리 상태를 안내한다. 삭제·버리기 확인은
  명시적인 버튼 선택으로 확정한다.
- 색만으로 오류·연결·도구 선택을 표현하지 않는다. 텍스트, 체크, 외곽선, 선택 상태를 함께 사용한다.
- 이미지 순서 변경에는 단일 클릭·키보드 대체 버튼을 둔다. 자유곡선 그리기는 경로 입력의 성격을 유지하고 나머지 편집 도구는 키보드로 접근할
  수 있게 한다.
- `prefers-reduced-motion`에서는 장식적인 이동·페이드·shimmer를 끄고 즉시 최종 상태를 표시한다. 기본
  skeleton도 반복 shimmer 없이 사용할 수 있다.

| 움직임 | 기본값 | 목적 |
| --- | --- | --- |
| 버튼 hover·pressed | 색·opacity 150ms | 조작 피드백. 위치·크기 변화 없음 |
| 메뉴 열기·닫기 | opacity 120ms | 가벼운 상태 전환 |
| 모달 열기·닫기 | opacity 160ms | 창의 등장·퇴장. 입력을 애니메이션 완료까지 막지 않음 |
| 새 카드 | opacity 최대 180ms | 이미 확보된 위치에서 표시. 목록 높이·전체 카드 이동 애니메이션 없음 |

### 구현 연결과 범위

| UI | shadcn 기준 구성 요소 |
| --- | --- |
| 작성 시작·주요 동작 | Button |
| 게시물 | Card 또는 의미 있는 article |
| 본인 메뉴·닉네임 메뉴 | DropdownMenu |
| 닉네임·작성·그림·확대 보기 | Dialog |
| 삭제·미저장 변경 확인 | AlertDialog |
| 입력·오류 | Input, Textarea, Label, Alert |
| 그림 도구 | Button, Slider, 선택 상태 |
| 조회·연결·성공 안내 | Skeleton, Badge, 상태/토스트 요소 |

프로젝트 스타일 이름은 다음과 같이 연결한다.

| UI | 스타일 이름 예시 |
| --- | --- |
| 작성 시작·주요 동작 | `Guestbook__ComposerTrigger` |
| 게시물 | `EntryCard`, `EntryCard__Header`, `EntryCard__Body` |
| 본인 메뉴·닉네임 메뉴 | `EntryCard__Menu`, `Guestbook__IdentityMenu` |
| 닉네임·작성·그림·확대 보기 | `EntryComposer`, `DrawingEditor`, `MediaViewer` |
| 삭제·미저장 변경 확인 | `EntryDeleteDialog`, `UnsavedChangesDialog` |
| 입력·오류 | `EntryComposer__Field`, `EntryComposer__Error` |
| 그림 도구 | `DrawingEditor__Toolbar`, `DrawingEditor__Tool--Selected` |
| 조회·연결·성공 안내 | `EntryFeed__Status`, `EntryFeed__NewEntries` |

CSS 클래스는 `Block__Element--Modifier` 형태의 BEM을 기본으로 하고 Tailwind의 의미 토큰 유틸리티를 함께
사용한다. React 컴포넌트 이름과 CSS 클래스는 각자의 역할에 맞게 정하되 같은 상태를 서로 다른 색·간격으로 표현하지 않는다. 실제
설치한 shadcn primitive와 버전에 맞춰 API를 확인한다.

이 문서의 소유권 표시는 PRD의 서버 권한을 UI에 반영하는 것이다. 프로토타입의 닉네임 비교·브라우저 로컬 예시 데이터·체험 이벤트를 실제
권한·저장·연결 상태로 사용하지 않는다.

## Do's and Don'ts

### 구현 범위

첫 버전에는 디자인 선택기, 다크 테마 전환, 관리자 화면, 검색·댓글·좋아요, 전체/내 글 필터, CAPTCHA, 계정 복구, 새 알림
서비스, 초안 자동 저장·브라우저 종료 후 복구를 추가하지 않는다. 본문·이미지·그림의 인수 조건은 PRD를 따른다.

### 구현 후 시각·상호작용 검증

다음 항목은 구현 후 확인할 기준이다. 이 문서 작성 시 실제 앱의 화면·브라우저·실기기 검증을 완료한 것으로 기록하지 않는다.

- [ ] 1,440px·1,024px·768px에서 피드가 한 열이고 실제 콘텐츠 최대 폭이 약 720px다.
- [ ] 390px·375px·320px와 320×568에서 가로 넘침 없이 제목·긴 닉네임·버튼·첨부 목록을 읽고 조작할 수 있다.
- [ ] 모바일 가로 방향, 키보드 표시, 브라우저 확대에서도 저장·그림 완료·닫기 버튼에 도달할 수 있다.
- [ ] 주요·보조 글자, 오류, 입력·선택 경계, 초점 링의 실제 색 대비를 확인한다. 비활성 상태와 정상 상태를 구분한다.
- [ ] 글만·이미지만·그림만·혼합 게시물에서 불필요한 빈 섹션이 없고 이미지 비율·자리 확보가 유지된다.
- [ ] 닉네임·작성·그림·확인·확대 보기의 열기, Tab, Escape, 닫기, 부모·시작 버튼으로의 초점 복귀가 동작한다.
- [ ] 업로드 실패·저장 실패·결과 미확인·버전 충돌·편집 중 삭제에서 초안과 복구 동작이 보인다.
- [ ] 이미지 순서 변경과 그림 도구에 마우스 hover 이외의 조작 방법이 있다. 펜 실기기 검증 여부를 별도로 기록한다.
- [ ] 재연결 후 상태·새 글 버튼이 실제 데이터와 일치하고, 읽던 위치와 열린 작성 창을 유지한다.
- [ ] reduced-motion과 화면 읽기 프로그램에서 과도한 목록 재공지·초점 이동 없이 상태를 파악할 수 있다.
- [ ] 제품에 예시 게시물·체험 버튼·프로토타입 배너가 섞이지 않는다.

검증 결과는 환경·화면 폭·입력 방식·기대/실제 결과·통과/실패/미검증을 구분해 기록한다. PRD의 실제
배포·권한·저장·Realtime·Storage 검증과 함께 인수한다.

### 서비스 소개 랜딩페이지 (2026-10-14)

사용자의 랜딩페이지 추가 요청에 따라 `/`에 소개 화면을 두고,
기존 중앙 단일 열 피드는 `/guestbook`에서 제공한다.
흑백 라이트 테마·기본 폰트·초점 링을 이어받되 아래 값은 랜딩에 한정한다.

- 콘텐츠 최대 폭 1,160px, 데스크톱 바깥 여백 48px, 모바일 16~20px.
- 첫 화면 제목은 데스크톱 최대 59px, 모바일 34~49px, 자간 -0.065em이다.
- 섹션 제목은 데스크톱 40px, 모바일 30px를 기본으로 한다.
- 기본 배경은 `#FFFFFF`, 본문은 `#171717`, 설명은 `#737373`이다.
  미리보기 배경은 `#F7F7F5`, 마지막 행동 영역은 `#1C1C1C`를 사용한다.
- 숲 사진과 직접 작성한 꽃 SVG는 소개용이며 실제 게시물로 취급하지 않는다.
- 820px 이하에서 첫 화면은 한 열, 600px 이하에서 소개·절차·FAQ도 한 열이다.
- 표현 미리보기는 일반 버튼과 `aria-pressed`로 현재 선택을 표시한다.
  선택은 설명 영역에 정중하게 알리고, FAQ는 기본 `details` 요소를 사용한다.
- 모바일 메뉴는 펼침 상태와 Escape 닫기·버튼 초점 복귀를 지원한다.
- 전환 애니메이션은 `prefers-reduced-motion`에서 비활성화한다.

2026-10-15 FAQ 필터는 위 랜딩페이지 스타일을 이어받는다.

- FAQ 위에 전체·작성·첨부·권한 일반 버튼을 배치하며 기본 선택은 전체다.
- 그룹 이름과 `aria-pressed`로 선택 상태를 제공하고 초점을 임의로 이동하지 않는다.
- 선택 버튼은 검은 바탕·흰 글자, 나머지는 기존 중립색 경계와 본문 색을 사용한다.
- 버튼은 최소 44×44 CSS px, 간격은 최소 8px이며 좁은 화면에서 여러 줄로 배치한다.
- 초점 링을 유지하고 하나의 상태 안내로 선택 카테고리와 표시 질문 개수를 알린다.
- 질문은 기본 `details`·`summary`를 유지하며 필터링 후에도 펼침·접기 조작을 지원한다.

### 문서 형식 검증

이 문서는 [공식 DESIGN.md 명세][designmd-spec]의 YAML frontmatter와 Markdown 본문 구조를 따른다.
YAML은 기계 판독형 토큰을 정의하고, 본문은 적용 이유·반응형·동작·지원되지 않는 속성을 보완한다.

Windows PowerShell에서는 같은 CLI의 `designmd` 별칭으로 검사한다.

```powershell
npx.cmd --yes --package "@google/design.md@0.4.0" designmd lint DESIGN.md
```

[prd]: docs/superpowers/specs/2026-10-11-realtime-guestbook-design.md
[implementation-plan]: docs/superpowers/plans/2026-10-11-realtime-guestbook.md
[shadcn-theming]: https://ui.shadcn.com/docs/theming
[wcag-contrast]: https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
[wcag-dragging]: https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html
[shadcn-dialog]: https://ui.shadcn.com/docs/components/dialog
[designmd-spec]: https://github.com/google-labs-code/design.md/blob/main/docs/spec.md
