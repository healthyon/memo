@echo off
echo 메모장 로컬 서버 시작...
echo.
echo 브라우저에서 http://localhost:8000 으로 접속하세요
echo 종료하려면 Ctrl+C를 누르세요
echo.

cd /d "%~dp0"

REM Python이 설치되어 있는지 확인
python --version >nul 2>&1
if %errorlevel% == 0 (
    echo Python을 사용하여 서버 시작...
    python -m http.server 8000
) else (
    REM Node.js가 설치되어 있는지 확인
    node --version >nul 2>&1
    if %errorlevel% == 0 (
        echo Node.js를 사용하여 서버 시작...
        npx http-server -p 8000 -c-1
    ) else (
        echo.
        echo 오류: Python 또는 Node.js가 설치되어 있지 않습니다.
        echo.
        echo 설치 방법:
        echo 1. Python: https://www.python.org/downloads/
        echo 2. Node.js: https://nodejs.org/
        echo.
        pause
    )
)