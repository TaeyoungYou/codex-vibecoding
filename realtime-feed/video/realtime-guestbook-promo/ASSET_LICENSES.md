# 영상 자산 출처

최종 갱신일: 2026-10-14

## 지정 이미지

프로젝트에서 imagegen으로 생성하고 사용자가 영상에 사용하도록 지정한 PNG다.
원본은 보존하고 public/images/에 동일한 파일을 복사했다.
세부 생성 프롬프트와 참조는 [이미지 기록](../../docs/image-generation-prompts.md)에 있다.

- `hero-background-v2.png`: 방명록의 글·이미지·그림 카드.
- `leaving-a-note-v2.png`: 방명록 작성 모달을 사용하는 장면.
- `portfolio-guestbook.png`: 실제 샘플 피드를 담은 노트북 목업.

## 원본 음악·효과음

scripts/generate_audio.py로 이 프로젝트를 위해 직접 합성했다.
외부 녹음·음악·샘플·기존 멜로디를 가져오지 않았다.
원본 WAV와 생성 코드를 함께 보관해 템포·음색·효과음 시점을 수정할 수 있다.

- `gentle-connections.wav`: 96 BPM, 30초 원본 전자 피아노·패드.
- `soft-click.wav`: 원본 UI 클릭.
- `soft-bell.wav`: 원본 부드러운 종소리.
- `promo-soundtrack.wav`: 음악과 세 효과음 배치를 합친 48kHz 스테레오 마스터.

## 서체

원본 WOFF2를 변경하지 않고 공식 프로젝트의 배포 파일을 사용했다.
각 라이선스 파일을 public/fonts/에 함께 보관한다.

| 서체 | 버전 | 출처 | 라이선스 사본 |
| --- | --- | --- | --- |
| Pretendard Variable | 1.3.9 | [공식 프로젝트][pretendard] | `Pretendard-LICENSE.txt` |
| Inter Variable | 4.1 | [공식 프로젝트][inter] | `Inter-LICENSE.txt` |

두 서체는 SIL Open Font License 1.1로 배포된다.
상세 조건은 포함된 원본 라이선스 사본을 따른다.

[pretendard]: https://github.com/orioncactus/pretendard/tree/v1.3.9
[inter]: https://github.com/rsms/inter/tree/v4.1
