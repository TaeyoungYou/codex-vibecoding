# Realtime Guestbook 홍보영상

Remotion 4.0.535로 제작한 30초·1920×1080·30fps 홍보영상이다.
지정된 PNG 3종, 로컬 Pretendard·Inter, 직접 합성한 음악과 효과음을 사용한다.
웹앱과 분리된 프로젝트이며 서비스 데이터나 배포 설정을 변경하지 않는다.

## 결과와 계획

- [제작 계획](../../docs/superpowers/plans/2026-10-14-realtime-guestbook-promo-video.md)
- 최종 MP4: `../../output/video/realtime-guestbook-promo.mp4`
- 포스터: `../../output/video/realtime-guestbook-promo-poster.png`
- 실제 검수 기록: `../../output/video/realtime-guestbook-promo-review.md`
- [자산 출처와 사용 권한](ASSET_LICENSES.md)

## 미리보기와 검사

Windows PowerShell, 이 폴더에서 실행한다.
Node.js 24, React 19.2.3, TypeScript 5.9.3을 사용했다.
Remotion 관련 패키지는 모두 4.0.535로 고정했다.

```powershell
npm.cmd ci
npm.cmd run dev
npm.cmd run typecheck
npm.cmd run format:check
```

Studio 주소는 `http://localhost:5188/RealtimeGuestbookPromo`다.
장면은 Scenes 폴더에 별도 Composition으로 등록돼 개별로 열 수 있다.
문구와 타임라인은 소스 JSX에서 직접 수정할 수 있다.

## 최종 출력

```powershell
npm.cmd run render
npm.cmd run poster
```

MP4는 H.264·AAC·yuv420p·CRF 16으로 출력한다.
기존 파일은 덮어쓰지 않는다. 새 출력은 기존 결과를 보존한 버전 이름으로 지정한다.
브라우저가 자동 준비되지 않으면 설치된 Chrome 경로를 인자로 전달할 수 있다.

```powershell
npm.cmd run render -- `
  '--browser-executable=C:/Program Files/Google/Chrome/Application/chrome.exe' `
  --concurrency=2
```

전환은 15프레임 디졸브 5개다. 장면의 실제 길이 합계 975에서
겹침 75프레임을 제외해 최종 영상은 900프레임으로 유지한다.
시작 시각은 0·120·300·450·600·750프레임이며 마지막 장면은 900에서 끝난다.
810~899프레임에는 방문 안내와 주소를 고정한다.

## 사운드 재생성

```powershell
python scripts/generate_audio.py
```

Python 표준 라이브러리로 96 BPM의 원본 전자 피아노 곡과 UI 효과음을 만든다.
외부 샘플이나 녹음 음원을 사용하지 않는다.
음악·클릭·종소리 원본과 30초 스테레오 마스터 WAV를 함께 보관한다.
효과음은 4.6·16.4·25.7초에 배치한다.

Windows에서 지연된 여러 Audio 트랙의 inline mixing에 EINVAL이 발생해,
음악과 효과음을 먼저 합친 연속 WAV 하나를 Remotion 타임라인에 배치했다.
Node 모듈을 수정하지 않고 재생 가능한 자산으로 해결했다.

## 파일 책임

- `src/Root.tsx`: 최종 영상과 장면별 Composition 등록.
- `src/PromoVideo.tsx`: 전환·장면 길이·사운드트랙 구성.
- `src/scenes/`: 여섯 장면의 이미지·문구·모션.
- `src/components/Frame.tsx`: 브랜드·공통 여백·타이포 입장.
- `src/theme.ts`: 로컬 폰트 로딩과 실제 앱 색상.
- `scripts/generate_audio.py`: 재현 가능한 원본 음악·효과음 합성.
- `scripts/verify_output.py`: 실제 파일 사양·전체 디코드·검수 프레임·신호 검사.

이미지는 비율을 유지하고 글과 사진·그림 카드는 원본 안의 영역만 보여준다.
타이핑·저장·실시간 도착 같은 새로운 UI 동작을 합성하지 않았다.
