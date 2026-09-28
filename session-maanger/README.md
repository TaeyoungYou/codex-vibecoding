# Codex Session Manager

Windows와 macOS에서 로컬 Codex 세션을 살펴보고, 선택한 대화를 터미널에서 이어 쓰는 데스크톱 앱입니다.

## 기능

- `~/.codex/sessions` 아래의 JSONL 세션을 날짜별 하위 폴더까지 읽습니다.
- 첫 사용자 메시지를 제목으로 표시하고, Codex 답변과 프로젝트 경로를 미리 보여줍니다.
- 검색, 마우스 선택, ↑/↓ 이동, Enter로 세션 재개가 가능합니다.
- 선택한 세션의 사용자 메시지와 Codex 답변을 모두 보거나 따로 걸러볼 수 있습니다.
- 세션 ID를 복사하고 F5로 목록을 새로고침할 수 있습니다.
- `CODEX_HOME` 환경 변수가 설정되어 있으면 해당 폴더의 `sessions`를 사용합니다.

## 실행

Node.js와 [Codex CLI](https://learn.chatgpt.com/docs/codex/cli)가 설치되어 있어야 합니다. Codex CLI에 로그인한 계정의 세션 폴더를 읽습니다.

```bash
cd session-maanger
npm install
npm start
```

Windows PowerShell에서 `.ps1` 실행이 차단되면 `npm.cmd install`, `npm.cmd start`를 사용하세요.

## 설치 파일 만들기

Windows에서:

```powershell
npm.cmd run build:win
```

macOS에서:

```bash
npm run build:mac
```

결과물은 `dist` 폴더에 생성됩니다. Windows는 설치 프로그램과 휴대용 실행 파일, macOS는 Intel과 Apple Silicon에서 실행되는 범용 DMG와 ZIP을 생성합니다. macOS 설치 파일은 macOS 컴퓨터에서 빌드해야 합니다. 배포용 코드 서명은 별도로 설정해야 합니다.

GitHub 저장소의 **Actions → Build Codex Session Manager → Run workflow**를 실행하면 Windows와 macOS 실행 파일을 각각 아티팩트로 받을 수 있습니다.

## 사용법

1. 앱을 열면 세션 목록이 최근 활동 순서로 표시됩니다.
2. 세션을 클릭하거나 ↑/↓ 키로 이동해 대화를 확인합니다.
3. **이 세션 이어서 사용**을 클릭하거나 Enter를 눌러 터미널에서 `codex resume SESSION_ID`를 실행합니다.

Windows에서는 `codex.cmd`를 찾아 Windows Terminal의 새 Command Prompt 창에서 실행합니다. Windows Terminal이 없으면 Command Prompt 창을 직접 엽니다. macOS에서는 Terminal.app에서 실행합니다. 저장 당시 작업 폴더가 없으면 홈 폴더에서 세션을 열고 앱에 안내를 표시합니다. `codex resume`의 작업 폴더 선택 동작은 Codex CLI 설정에 따릅니다.

## 테스트

```bash
npm test
```

세션 파일은 로컬에서만 읽으며 앱은 별도의 서버를 사용하지 않습니다.
