@echo off
echo ========================================
echo   메모장 PWA 자동 업로드 스크립트
echo ========================================
echo.

cd /d "%~dp0"

echo [1단계] 변경된 파일 확인 중...
git status

echo.
echo [2단계] 모든 파일을 staging area에 추가 중...
git add .

echo.
echo [3단계] 커밋 생성 중...
set /p commit_msg="커밋 메시지를 입력하세요 (기본값: 메모장 PWA 업데이트): "
if "%commit_msg%"=="" set commit_msg=메모장 PWA 업데이트

git commit -m "%commit_msg%"

echo.
echo [4단계] GitHub에 업로드 중...
git push -u origin main

echo.
echo ========================================
echo   업로드 완료!
echo   PWA 확인: https://healthyon.github.io/memo/
echo ========================================
echo.
pause