# APEX RUSH

5명의 경쟁자와 3랩을 겨루는 브라우저 3D 레이싱 게임입니다.

## 바로 플레이

**[게임 시작하기](https://taeyoungyou.github.io/codex-vibecoding/)** — 설치나 계정 없이 브라우저에서 열립니다. 시작 화면의 **레이스 시작**을 누르세요.

최신 버전과 배포 파일은 [GitHub Releases](https://github.com/TaeyoungYou/codex-vibecoding/releases/latest)에서 확인할 수 있습니다. 일반 플레이에는 다운로드가 필요하지 않습니다.

## 조작

| 동작 | 키보드 | 터치 화면 |
| --- | --- | --- |
| 가속 | W 또는 ↑ | GO |
| 브레이크 / 후진 | S 또는 ↓ | BRAKE |
| 왼쪽 / 오른쪽 조향 | A / D 또는 ← / → | ← / → |
| 니트로 | 가속 중 Space | 가속 중 ⚡ |
| 일시정지 | P 또는 Esc | 오른쪽 위 Ⅱ |
| 트랙으로 복귀 | R | 오른쪽 위 ↺ |

차는 자동으로 길을 따라가지 않습니다. 코스를 벗어나면 감속하고, 도로에 돌아오면 이탈 전 속도로 복구됩니다. 경쟁 차량을 추월하면 순위가 바뀌며, 유효하게 주행한 구간만 랩에 반영됩니다.

자세한 플레이 방법은 [게임 가이드](PLAY_GUIDE.md)를 참조하세요. WebGL 2를 지원하는 최신 브라우저가 필요합니다.

<details>
<summary>개발자용 실행 및 빌드</summary>

저장소를 내려받은 뒤 저장소 루트에서 실행합니다.

```bash
cd racing-game
npm ci
npm run dev
```

`npm test`는 주행과 순위 테스트를, `npm run build`는 배포용 `dist/` 파일을 만듭니다. Windows PowerShell에서 `npm` 실행이 차단되면 `npm.cmd`를 사용하세요.

`main` 브랜치에 푸시하면 GitHub Actions가 테스트와 빌드를 거쳐 GitHub Pages에 배포합니다.

</details>
