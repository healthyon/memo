# 🔥 Firebase 설정 가이드

## 현재 문제
`auth/unauthorized-domain` 오류 발생 - Google 로그인이 차단됨

## 해결 방법

### 1. Firebase Console 접속
- https://console.firebase.google.com 접속
- 프로젝트 선택: `memoleodk`

### 2. Authentication 설정
1. **좌측 메뉴** → Authentication → Settings
2. **Authorized domains** 탭 클릭
3. **Add domain** 버튼 클릭
4. 다음 도메인들 추가:
   ```
   localhost
   127.0.0.1
   file://
   ```

### 3. 웹 앱 설정 확인
1. **프로젝트 설정** → 일반 탭
2. **웹 앱** 섹션 확인
3. 도메인이 올바르게 설정되어 있는지 확인

## 권장 사용 방법

### 방법 1: 로컬 서버 사용 (가장 권장)
```bash
# 메모장 폴더에서 start-server.bat 실행
start-server.bat

# 브라우저에서 접속
http://localhost:8000
```

### 방법 2: GitHub Pages 배포
1. GitHub 저장소 생성
2. 파일들 업로드  
3. Settings → Pages에서 배포
4. Firebase Console에서 GitHub Pages 도메인 추가

### 방법 3: Firebase Hosting 사용
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

## 테스트 방법
1. 서버 실행 후 http://localhost:8000 접속
2. Google 로그인 버튼 클릭
3. 팝업이 정상적으로 열리는지 확인
4. 로그인 완료 후 메모장 화면 진입 확인

## 추가 참고사항
- `file://` 프로토콜은 웹 기능이 제한됨
- HTTPS가 권장됨 (프로덕션 환경)
- 로컬 개발시 localhost 사용 필수