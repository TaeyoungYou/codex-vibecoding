# 방명록 이미지 3종 생성 문서

작성일: 2026-10-14
상태: 이미지 3종 생성·검수·저장 완료(2026-10-14).

`imagegen` 스킬로 아래 세 이미지를 각각 생성하기 위한 문서다.
사용자가 요청한 용도는 히어로 배경, 메모를 남기는 장면, 최종 포트폴리오 이미지다.
구체적인 장면·사진 스타일·비율·파일명은 작성자 제안이며 변경할 수 있다.

## 공통 방향

[DESIGN.md](../DESIGN.md)의 흑백·라이트 방향을 참고한다.
흰색·옅은 중립 회색·검은 잉크, 부드러운 자연광과 종이 질감으로 통일한다.
페이지 제목과 설명은 이미지에 넣지 않아 이후 배치와 수정이 쉽도록 한다.

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
| 1 | 히어로 배경 | 가로 16:9 | `hero-background.png` |
| 2 | 메모를 남기는 장면 | 가로 4:3 | `leaving-a-note.png` |
| 3 | 최종 포트폴리오 | 가로 16:9 | `portfolio-guestbook.png` |

## 1. 히어로 배경

### 히어로의 용도와 장면

방명록을 소개하는 히어로 영역의 배경으로 사용할 이미지다.
흰 종이를 가까이 촬영한 듯한 미세한 섬유 질감과 옅은 그림자를 표현한다.
제목이 올라갈 중앙은 밝고 조용하게 비워두고, 종이 가장자리는 주변에만 둔다.
참조 이미지 없이 새로 생성한다.

### 히어로 생성 프롬프트

```text
Use case: photorealistic-natural
Asset type: hero background for a minimal online guestbook
Primary request: a quiet white paper background suggesting a place
  where visitors can leave a short personal note.
Scene/backdrop: white paper on a pale neutral surface.
Subject: subtle paper fibers and faint shadows near the outer edges.
Style/medium: photorealistic macro paper photography, restrained detail.
Composition/framing: wide landscape, intended 16:9 framing;
  generous clean central negative space for a heading added later;
  any visible paper edges remain near the perimeter.
Lighting/mood: soft diffused daylight, bright, calm, welcoming.
Color palette: white and very light neutral gray, no colored tint.
Materials/textures: fine matte paper grain, soft natural shadows.
Text: none.
Constraints: opaque background; low contrast behind future page copy;
  no people, devices, stationery, lettering, logos, or watermark.
Avoid: dark center, strong folds, busy patterns, heavy vignettes,
  dramatic lighting, glossy surfaces, colorful gradients.
```

### 히어로 검수 기준

- 중앙에 제목을 놓을 공간이 충분하고 질감이 글자와 경쟁하지 않는다.
- 좁게 잘라도 강한 그림자나 종이 경계가 중앙을 가리지 않는다.
- 생성된 글자·로고·워터마크가 없다.

최종 저장 경로: `output/imagegen/hero-background.png`.

## 2. 메모를 남기는 장면

### 메모 장면의 용도와 구성

방명록에 한마디를 남기는 경험을 소개할 이미지다.
밝은 책상 위에서 손이 검은 펜으로 작은 종이 메모를 쓰기 시작하는 순간을 담는다.
종이와 펜은 온라인 방명록의 경험을 표현하는 비유이며 실제 앱 화면은 넣지 않는다.
참조 이미지 없이 새로 생성한다.

### 메모 장면 생성 프롬프트

```text
Use case: photorealistic-natural
Asset type: editorial image illustrating leaving a personal note
Primary request: a close view of a hand beginning to write a short
  note with a black pen on a small sheet of white paper.
Scene/backdrop: a simple pale neutral desk with no extra props.
Subject: one naturally posed writing hand, a black pen, white paper;
  the pen tip touches the paper as the first small ink stroke is made.
Style/medium: photorealistic candid editorial photography.
Composition/framing: gentle overhead angle, intended 4:3 landscape;
  the hand, pen tip, and paper form the focal area;
  relaxed margins keep the action clear when cropped.
Lighting/mood: soft daylight, quiet and approachable, unposed feel.
Color palette: white, neutral gray, black ink;
  natural skin tones with restrained saturation.
Materials/textures: realistic skin, matte paper fibers, subtle desk grain.
Text: no readable words; show only the first short ink stroke.
Constraints: opaque background; anatomically plausible fingers;
  realistic pen grip and contact with the paper;
  no visible face, device screens, logos, or watermark.
Avoid: extra fingers, duplicated hands, floating pen, decorative props,
  invented lettering, staged office stock-photo styling, harsh shadows.
```

### 메모 장면 검수 기준

- 펜 끝이 종이에 닿아 있고 메모를 쓰는 동작이 자연스럽다.
- 손가락 수·관절·펜을 잡는 모양에 이상이 없다.
- 읽을 수 없는 가짜 문장이나 장식 소품이 장면을 흐리지 않는다.

최종 저장 경로: `output/imagegen/leaving-a-note.png`.

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

1. 이 문서의 각 프롬프트로 1번과 2번을 별도로 생성한다.
2. 실제 방명록 화면을 캡처하고 3번의 참조 조건을 확인한다.
3. 참조 캡처와 3번 프롬프트를 함께 전달해 포트폴리오 이미지를 생성한다.
4. 각 결과를 열어 검수하고, 문제가 있으면 한 번에 한 항목씩 수정한다.
5. 선택한 이미지 3종을 위 프로젝트 경로에 복사한다.
6. 아래 표에 실제 파일명·검수 결과와 사용한 최종 프롬프트 변경을 기록한다.

생성 도구의 기본 저장 위치와 프로젝트의 최종 저장 경로는 다르다.
최종 결과는 생성 후 복사하며 앱에 적용하는 작업은 별도로 진행한다.

| 이미지 | 생성 상태 | 실제 저장 파일 | 검수 결과 |
| --- | --- | --- | --- |
| 히어로 배경 | 생성 완료 | [파일][hero-image] | 시각 검사 통과 |
| 메모를 남기는 장면 | 생성 완료 | [파일][note-image] | 시각 검사 통과 |
| 최종 포트폴리오 | 생성 완료 | [파일][portfolio-image] | 시각 검사 통과 |

### 실제 생성 결과

2026-10-14 내장 `image_gen` 도구를 이미지별로 한 번씩 호출했다.
최종 프롬프트는 위 세 코드 블록과 동일하며 추가 수정·재생성은 없었다.
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

[hero-image]: ../output/imagegen/hero-background.png
[note-image]: ../output/imagegen/leaving-a-note.png
[portfolio-image]: ../output/imagegen/portfolio-guestbook.png
[screen-reference]: ../output/imagegen/references/guestbook-screen.png
