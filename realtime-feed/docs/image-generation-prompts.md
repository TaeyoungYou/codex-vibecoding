# 방명록 이미지 3종 생성 문서

작성일: 2026-10-14
상태: 이미지 1·2의 웹앱 중심 v2 생성·검수 완료(2026-10-14).

`imagegen` 스킬로 아래 세 이미지를 각각 생성하기 위한 문서다.
사용자가 요청한 용도는 히어로 배경, 메모를 남기는 장면, 최종 포트폴리오 이미지다.
구체적인 장면·사진 스타일·비율·파일명은 작성자 제안이며 변경할 수 있다.

## 공통 방향

[DESIGN.md](../DESIGN.md)의 흑백·라이트 방향을 참고한다.
흰색·옅은 중립 회색·검은 UI, 실제 콘텐츠 카드와 작성 모달을 중심으로 표현한다.
페이지용 제목과 설명은 추가하지 않고 참조 화면 속 실제 문구는 유지한다.
사용자는 첫 종이 배경·종이 메모 장면이 웹앱과의 연결이 약하다고 지적했다.
현재 프롬프트는 온라인 방명록의 실제 화면을 보여주도록 수정했다.
[첫 프롬프트와 결과 기록](image-generation-prompts-v1.md)은 이력으로 보존한다.

히어로 배경의 준비는 이미지 자산 제안이다.
기존 중앙 단일 열 피드의 구조와 디자인 기준은 이 문서로 변경하지 않는다.

- 방식: 내장 `image_gen` 도구. 이미지별로 별도 호출해 총 3종을 만든다.
- 배경: 세 이미지 모두 불투명 배경을 사용한다.
- 제외: 워터마크, 기기 브랜드 로고, 과한 장식, 네온·유채색 강조.
- 경로: 생성 후 선택한 결과를 프로젝트의 `output/imagegen/`에 복사한다.
- 기존 파일이 있다면 덮어쓰지 않고 `-v2`처럼 새 이름으로 저장한다.
- 비율은 구도 요청이며 정확한 픽셀 크기를 보장하는 도구 인자는 아니다.

| 번호 | 이미지 | 제안 비율 | 최종 파일명 |
| --- | --- | --- | --- |
| 1 | 히어로 배경 | 가로 16:9 | `hero-background-v2.png` |
| 2 | 메모를 남기는 장면 | 가로 4:3 | `leaving-a-note-v2.png` |
| 3 | 최종 포트폴리오 | 가로 16:9 | `portfolio-guestbook.png` |

## 1. 히어로 배경

### 히어로의 용도와 장면

방명록을 소개하는 히어로 영역의 배경으로 사용할 이미지다.
실제 앱의 글·이미지·그림 게시물 카드가 밝은 디지털 공간에 배치된 모습이다.
카드의 아바타·닉네임·내용 구조를 유지하고 중앙에는 제목용 여백을 둔다.
실제 앱에서 캡처한 카드 3개를 내용 참조로 사용한다.

- Image 1: [글 카드][card-text-reference].
- Image 2: [이미지 카드][card-image-reference].
- Image 3: [그림 카드][card-drawing-reference].

### 히어로 생성 프롬프트

```text
Use case: stylized-concept
Asset type: background illustration for an online guestbook hero
Primary request: express this specific web app through three actual
  guestbook UI cards for text, an attached image, and a hand-drawn sketch.
Input images: Image 1: actual text-entry card; Image 2: actual image card;
  Image 3: actual drawing card; all are screen-content references.
Scene/backdrop: a clean white-to-light-gray digital space.
Subject: three screenshot-derived web interface cards, not paper notes;
  visible avatar, nickname, timestamp, and the original content area.
Style/medium: polished high-fidelity UI composition with subtle depth,
  rounded rectangular surfaces, fine borders, and gentle soft shadows.
Composition/framing: intended 16:9 landscape; distribute the three cards
  around the outer sides and preserve generous clean central space;
  the text card, landscape illustration, and flower sketch stay visible;
  keep cards mostly front-facing with only slight perspective.
Lighting/mood: bright, quiet, welcoming, restrained visual depth.
Color palette: white, neutral gray, dark interface text;
  retain the original landscape and flower colors from the screenshots.
Text: preserve visible source content; add no new headings or captions.
Constraints: opaque background; preserve the real card hierarchy,
  avatar, nickname, timestamp, content, and rounded border treatment;
  no fabricated controls, browser frame, device, logo, or watermark.
Avoid: paper texture, stationery, pens, hands, unrelated abstract shapes,
  fake UI, neon, dramatic shadows, busy center, extreme perspective.
```

### 히어로 검수 기준

- 실제 앱의 글·이미지·그림 게시물이라는 점이 바로 드러난다.
- 중앙에 제목을 놓을 공간이 있고 카드가 그 영역을 가리지 않는다.
- 참조 카드의 주요 내용이 유지되고 가짜 버튼·새 제목·로고가 없다.

최종 저장 경로: `output/imagegen/hero-background-v2.png`.

## 2. 메모를 남기는 장면

### 메모 장면의 용도와 구성

방명록에 한마디를 남기는 경험을 소개할 이미지다.
사용자가 노트북에서 실제 방명록의 작성 모달에 인사를 입력하는 순간을 담는다.
손과 키보드, 화면의 메시지 입력·이미지 추가·그림 그리기·저장 동작이 보이게 한다.
실제 작성 모달의 캡처를 화면 내용 참조로 사용한다.
Image 1은 [작성 모달 캡처][composer-reference]이며,
샘플 닉네임과 입력 문장은 현재 탭의 초안으로만 준비하고 게시하지 않았다.

### 메모 장면 생성 프롬프트

```text
Use case: photorealistic-natural
Asset type: lifestyle image of leaving a note in this guestbook web app
Primary request: a person typing a greeting into the actual guestbook
  composer on an unbranded laptop; the online action must be unmistakable.
Input images: Image 1: actual app screenshot with its open composer;
  use it as the laptop screen content, not merely as a style reference.
Scene/backdrop: a simple light neutral desk without decorative props.
Subject: one laptop and naturally posed hands typing on its keyboard;
  screen shows the supplied composer over the dimmed guestbook feed.
Style/medium: photorealistic candid editorial photography.
Composition/framing: intended 4:3 landscape, close three-quarter view;
  screen occupies the main upper area and hands are in the foreground;
  readable screen with a mild angle, no visible face.
Lighting/mood: soft natural daylight, quiet and approachable.
Color palette: white and neutral gray interface, dark keyboard;
  realistic skin tones with restrained saturation.
Materials/textures: natural skin, matte laptop body, subtle desk texture.
Text: preserve the actual Korean composer labels and the entered line
  "오늘도 좋은 하루 보내세요." from Image 1; add no other captions.
Constraints: opaque background; anatomically plausible fingers;
  preserve the modal title, message field, image and drawing actions,
  cancel and submit buttons, and the source screen hierarchy;
  no redesigned UI, extra devices, logos, watermark, or success message.
Avoid: paper notes, pens, floating UI, distorted Korean text, fake login,
  extra fingers, duplicated hands, strong screen glare, unrelated props.
```

### 메모 장면 검수 기준

- 화면에 실제 작성 모달이 보여 웹앱에 인사를 입력하는 장면으로 읽힌다.
- 손가락·키보드 조작이 자연스럽고 얼굴·소품이 시선을 빼앗지 않는다.
- 입력 문장·주요 버튼이 참조 화면과 일치하고 새로운 UI를 만들지 않았다.

최종 저장 경로: `output/imagegen/leaving-a-note-v2.png`.

## 3. 최종 포트폴리오를 위한 이미지

### 포트폴리오의 용도와 장면

포트폴리오의 프로젝트 대표 이미지로 사용할 목업이다.
밝은 중립 배경에 로고 없는 노트북 한 대를 두고,
화면에는 실제 방명록의 중앙 피드를 담아 완성된 결과를 보여준다.
기기의 정면에 가까운 구도로 화면 내용을 충분히 크게 보이게 한다.

### 생성 전에 준비할 참조 이미지

실제 앱을 열어 흑백·라이트 테마의 피드 화면을 캡처한다.
피드의 제목·작성 시작 영역·게시물 카드가 보이는 구도를 고른다.
개인 정보가 없는 합성 예시 콘텐츠를 사용하고 실제 방문자 글을 임의로 변경하지 않는다.
운영 데이터 변경 없이 화면을 준비할 수 없다면 기존의 공개 사용 가능 화면을 선택한다.

- 참조 파일 제안: `output/imagegen/references/guestbook-screen.png`.
- 역할: Image 1은 노트북 화면에 넣을 실제 UI 콘텐츠 참조다.
- 캡처에는 주소 표시줄·개발자 도구·토큰·관리 화면이 포함되지 않게 한다.
- 생성 시 로컬 참조 이미지를 먼저 열어 확인하고 이미지 도구에 전달한다.
- 참조가 준비되기 전에는 아래 프롬프트로 가상의 앱 화면을 대신 만들지 않는다.

### 포트폴리오 생성 프롬프트

```text
Use case: product-mockup
Asset type: portfolio cover for the Realtime Guestbook web app
Primary request: a polished laptop presentation of the actual guestbook,
  using Image 1 as the screen-content reference.
Input images: Image 1: actual guestbook screenshot;
  use it for the laptop display content, not as a style-only reference.
Scene/backdrop: a clean white-to-light-gray studio surface and background.
Subject: one unbranded laptop displaying the supplied guestbook screen.
Style/medium: photorealistic product photography with restrained polish.
Composition/framing: intended 16:9 landscape, laptop centered;
  nearly front-facing screen with only a slight natural perspective;
  screen large enough to recognize the feed, with clean outer margins.
Lighting/mood: soft studio daylight, gentle contact shadow, bright and calm.
Color palette: white, neutral gray, dark device details;
  retain the original colors of content already present in Image 1.
Materials/textures: matte device body, realistic glass without glare
  obscuring the interface, softly textured neutral surface.
Text: preserve the visible Korean labels and content from Image 1;
  add no new headlines, captions, badges, or lettering.
Constraints: opaque background; preserve the source UI hierarchy,
  single-column feed, cards, spacing, controls, and light theme;
  do not redesign or invent interface elements;
  no device logo, watermark, browser chrome, or extra devices.
Avoid: distorted text, fabricated features, dashboard layouts,
  login forms, dark mode, extreme perspective, strong reflections,
  floating UI panels, neon lighting, decorative props.
```

### 포트폴리오 검수 기준

- 노트북 화면이 참조 캡처의 실제 피드 구성과 일치한다.
- 한글 문구·버튼·카드가 왜곡되거나 새 기능이 생기지 않았다.
- 제목이나 설명을 추후 배치할 여백이 있고 작은 썸네일에서도 앱이 보인다.
- 화면이 왜곡된 결과는 최종본으로 선택하지 않고 해당 부분을 수정한다.

최종 저장 경로: `output/imagegen/portfolio-guestbook.png`.

## 생성 순서와 완료 기록

1. 실제 앱에서 카드 3종과 작성 모달을 캡처해 참조 이미지를 준비한다.
2. 참조를 확인하고 1번과 2번 프롬프트에 각각 대응하는 이미지를 전달한다.
3. 3번을 새로 만들 때는 실제 피드 화면 참조와 포트폴리오 프롬프트를 사용한다.
4. 각 결과를 열어 검수하고, 문제가 있으면 한 번에 한 항목씩 수정한다.
5. 선택한 이미지 3종을 위 프로젝트 경로에 복사한다.
6. 아래 표에 실제 파일명·검수 결과와 사용한 최종 프롬프트 변경을 기록한다.

생성 도구의 기본 저장 위치와 프로젝트의 최종 저장 경로는 다르다.
최종 결과는 생성 후 복사하며 앱에 적용하는 작업은 별도로 진행한다.

| 이미지 | 생성 상태 | 실제 저장 파일 | 검수 결과 |
| --- | --- | --- | --- |
| 히어로 배경 | v2 생성 완료 | [파일][hero-image] | 시각 검사 통과 |
| 메모를 남기는 장면 | v2 생성 완료 | [파일][note-image] | 시각 검사 통과 |
| 최종 포트폴리오 | 생성 완료 | [파일][portfolio-image] | 시각 검사 통과 |

### 첫 생성 이력

2026-10-14 내장 `image_gen` 도구를 이미지별로 한 번씩 호출했다.
첫 프롬프트는 v1 기록 문서에 보존했다. 첫 생성 당시에는 재생성하지 않았다.
기본 생성 폴더의 원본을 보존하고 프로젝트에 최종 PNG 3개를 복사했다.

| 이미지 | 실제 크기 | 파일 용량 |
| --- | --- | --- |
| 히어로 배경 | 1672×941px | 2,218,843 bytes |
| 메모를 남기는 장면 | 1448×1086px | 2,047,347 bytes |
| 최종 포트폴리오 | 1672×940px | 1,359,689 bytes |

세 결과는 RGB PNG이며 불투명 배경이다.
히어로·포트폴리오는 약 16:9, 메모 장면은 4:3이다.

- 히어로: 밝은 중앙 여백·종이 질감·가장자리 그림자를 확인했다.
- 메모: 한 손의 자연스러운 펜 잡기·종이 접촉·짧은 잉크 획을 확인했다.
- 포트폴리오: 실제 화면의 제목·작성 영역·중앙 피드·주요 한글 문구를 대조했다.
  불필요한 기기 로고·새 기능·화면을 가리는 반사는 보이지 않았다.

포트폴리오는 [실제 화면 캡처][screen-reference]를 입력 참조로 사용했다.
현재 앱을 로컬 샘플 모드로 실행해 1440×900px 뷰포트를 캡처했다.
캡처 속 게시물은 앱의 합성 샘플이며 화면에 샘플 모드 표시를 유지했다.
운영 데이터나 앱 코드는 변경하지 않았다. 앱에 이미지 적용은 별도 작업이다.

### 사용자 피드백 반영 결과(v2)

첫 이미지 1·2는 종이와 펜의 비유여서 웹앱과의 관련성이 약하다는 피드백을 받았다.
2026-10-14 실제 웹앱 중심의 현재 1·2번 프롬프트로 각각 한 번씩 다시 생성했다.
이제 선택 파일은 아래 v2이며, 이전 PNG와 v1 프롬프트 기록은 보존한다.

| 이미지 | 실제 크기 | 파일 용량 |
| --- | --- | --- |
| 히어로 배경 v2 | 1672×941px | 1,408,595 bytes |
| 메모 장면 v2 | 1448×1086px | 1,761,101 bytes |

내장 image_gen 도구를 사용했다. 두 결과는 불투명 RGB PNG다.
프로젝트 복사본의 SHA-256이 생성 원본과 일치하는지 확인했다.

- 히어로: 실제 앱의 아바타·닉네임·글·풍경 이미지·꽃 그림 카드가 보인다.
  중앙 여백과 참조 카드의 주요 문구·콘텐츠를 시각적으로 대조했다.
- 작성 장면: 화면의 실제 작성 모달과 메시지·이미지·그림 동작이 보인다.
  입력 문장과 주요 버튼, 키보드 위 손의 형태를 확인했다.

카드 3종과 작성 모달의 참조 캡처는 실제 앱의 로컬 샘플 모드에서 준비했다.
이미지는 사용 장면을 표현하는 시각 자료이며 앱 기능 검증 기록과 구분한다.

[hero-image]: ../output/imagegen/hero-background-v2.png
[note-image]: ../output/imagegen/leaving-a-note-v2.png
[portfolio-image]: ../output/imagegen/portfolio-guestbook.png
[screen-reference]: ../output/imagegen/references/guestbook-screen.png
[card-text-reference]: ../output/imagegen/references/guestbook-card-text.png
[card-image-reference]: ../output/imagegen/references/guestbook-card-image.png
[card-drawing-reference]: ../output/imagegen/references/guestbook-card-drawing.png
[composer-reference]: ../output/imagegen/references/guestbook-composer.png
