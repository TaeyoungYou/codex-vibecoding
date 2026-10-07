# 피그마 캘린더

HTML·CSS·JavaScript로 만든 월별 달력과 날짜별 일정 카드입니다. 날짜를 선택하면 아래 카드에서 제목을 입력해 일정을 추가하고 삭제할 수 있습니다.

## 실행

Node.js가 설치된 환경에서 이 폴더를 열고 실행합니다. 별도 패키지 설치는 필요하지 않습니다.

```powershell
node preview.cjs
```

브라우저에서 <http://127.0.0.1:4175/>를 엽니다. 종료하려면 실행한 터미널에서 Ctrl+C를 누릅니다. HTML을 직접 여는 대신 로컬 서버를 사용합니다.

## 일정 저장

일정은 브라우저의 `localStorage`에 저장됩니다. 같은 브라우저·주소·포트에서 다시 접속하면 일정을 불러옵니다. 다른 브라우저나 기기로 자동 동기화되지 않으며 브라우저 사이트 데이터를 지우면 저장된 일정도 지워집니다.

처음에는 현재 월만 표시합니다. 월 이동 시 날짜 선택을 해제하고 일정 카드를 숨깁니다. 저장된 일정은 유지합니다.

## 검증

```powershell
node --check app.js
node --test tests/app.test.mjs
```

## 디자인과 자산

- [2023년 5월 캘린더](https://www.figma.com/design/yn83buQHLtkqR23b73bOOP/Calendar---Auto-Layout--Community-?node-id=512-438)
- [2023년 6월 캘린더](https://www.figma.com/design/yn83buQHLtkqR23b73bOOP/Calendar---Auto-Layout--Community-?node-id=512-451)
- 화살표 SVG: 위 피그마 디자인의 원본 자산
- Inter 글꼴: [공식 Inter 저장소](https://github.com/rsms/inter), SIL Open Font License 1.1. 라이선스는 `assets/fonts/LICENSE.txt`에 포함되어 있습니다.

일정 카드는 달력의 색상과 글꼴, 여백, 카드 모서리를 이어받아 새로 설계했습니다.
