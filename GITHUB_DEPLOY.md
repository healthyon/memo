# 🚀 GitHub Pages 배포 가이드

## 1. GitHub 저장소 생성

### GitHub에서 새 저장소 생성
1. https://github.com 접속 후 로그인
2. **New repository** 클릭
3. 저장소 설정:
   ```
   Repository name: memo-app (또는 원하는 이름)
   Description: iOS 스타일 메모장 웹앱
   Public 선택
   Add a README file ✅
   ```
4. **Create repository** 클릭

## 2. 파일 업로드

### 방법 1: 웹 인터페이스 사용
1. **uploading an existing file** 클릭
2. 다음 파일들 드래그&드롭:
   ```
   index.html
   style.css
   script.js
   firestore.rules
   SECURITY.md
   ```
3. Commit message: `Initial commit - iOS style memo app`
4. **Commit changes** 클릭

### 방법 2: Git 명령어 사용 (터미널)
```bash
# 메모장 폴더에서 실행
git init
git add .
git commit -m "Initial commit - iOS style memo app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/memo-app.git
git push -u origin main
```

## 3. GitHub Pages 활성화

1. 저장소 페이지에서 **Settings** 탭 클릭
2. 좌측 메뉴에서 **Pages** 클릭
3. Source 설정:
   ```
   Source: Deploy from a branch
   Branch: main
   Folder: / (root)
   ```
4. **Save** 클릭
5. 배포 URL 확인: `https://YOUR_USERNAME.github.io/memo-app`

## 4. Firebase Console 도메인 승인

### Authentication 설정
1. https://console.firebase.google.com 접속
2. 프로젝트 선택: **memoleodk**
3. **Authentication** → **Settings** → **Authorized domains**
4. **Add domain** 클릭하여 다음 도메인들 추가:
   ```
   YOUR_USERNAME.github.io
   localhost
   127.0.0.1
   ```

### 실제 예시 (사용자명이 john123인 경우)
```
john123.github.io
```

## 5. 배포 후 테스트

### 접속 및 테스트
1. `https://YOUR_USERNAME.github.io/memo-app` 접속
2. Google 로그인 버튼 클릭
3. 팝업이 정상적으로 열리는지 확인
4. 로그인 완료 후 메모 작성 테스트
5. 다기기 동기화 테스트

## 6. 업데이트 방법

### 코드 수정 후 재배포
```bash
# 파일 수정 후
git add .
git commit -m "Update: 기능 개선"
git push
```

GitHub Pages는 자동으로 재배포됩니다 (1-2분 소요).

## 7. 커스텀 도메인 (선택사항)

### 본인 도메인 사용하려면
1. GitHub Pages Settings에서 Custom domain 설정
2. DNS 설정에서 CNAME 레코드 추가
3. Firebase Console에서 해당 도메인 승인

## 8. HTTPS 보안

GitHub Pages는 자동으로 HTTPS를 제공합니다:
- ✅ `https://YOUR_USERNAME.github.io/memo-app`
- ❌ `http://YOUR_USERNAME.github.io/memo-app`

## 🎯 중요 사항

### Firebase Console에서 반드시 추가해야 할 도메인
```
YOUR_USERNAME.github.io
```

### 배포 완료 후 확인사항
- [x] GitHub Pages 접속 가능
- [x] Google 로그인 정상 작동
- [x] 메모 작성/편집/삭제 기능
- [x] 다기기 동기화 테스트
- [x] 모바일 반응형 확인

배포 완료되면 URL을 알려주시면 추가 설정을 도와드리겠습니다! 🚀