@echo off
cd /d "%~dp0"
git add .
git commit -m "메모장 PWA 빠른 업데이트"
git push origin main
echo 업데이트 완료! https://healthyon.github.io/memo/
pause