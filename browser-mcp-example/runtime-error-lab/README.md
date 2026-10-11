# 10-4 런타임 에러 디버깅 실습 앱

이 폴더는 10-4 강의에서 Chrome DevTools MCP 디버깅을 보여주기 위한 의도적으로 깨진 정적 웹앱입니다.

## 실행 방법

```bash
cd course-materials/section-10/10-4-browser-verification-mcp/runtime-error-lab
python3 -m http.server 4174
```

브라우저에서 아래 주소를 엽니다.

```text
http://localhost:4174
```

## 의도한 증상

- 페이지는 열리지만 추천 미션 카드와 리스트가 정상 렌더링되지 않습니다.
- Chrome DevTools 콘솔에 런타임 에러가 발생합니다.
- 강의에서는 Codex에게 Chrome DevTools MCP를 사용해 콘솔 에러, 소스 파일, 원인 후보를 먼저 정리하게 합니다.

## 강사용 정답 메모

`src/app.js`의 `renderFeaturedQuest()`에서 존재하지 않는 `featuredMission` 변수를 사용하고 있습니다.

수정 방향:

```js
featuredMission
```

대신 아래 변수를 사용해야 합니다.

```js
featuredQuest
```

정답 파일은 `fixed-reference/app.fixed.js`에 있습니다. 수강생 실습 전에는 이 파일을 먼저 보여주지 마세요.
