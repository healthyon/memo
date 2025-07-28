# 📝 iOS 스타일 메모장

> 빠르고 안전한 웹 기반 메모 애플리케이션

## ✨ 주요 기능

- 🎨 **iOS 스타일 UI/UX** - 아름다운 블러 효과와 애니메이션
- ⚡ **초고속 로딩** - 300ms 디바운싱으로 최적화된 성능
- 🔄 **실시간 동기화** - Firebase 기반 다기기 동기화
- 🔐 **강력한 보안** - 사용자별 데이터 분리 및 XSS 방지
- 📱 **완벽한 반응형** - 모바일/태블릿/데스크톱 최적화
- ✏️ **스마트 편집** - 실시간 자동 저장
- 🗂️ **멀티 선택** - 복수 메모 선택 및 일괄 삭제
- 🌐 **오프라인 지원** - 네트워크 끊김 시 로컬 저장

## 🚀 GitHub Pages 배포 가이드

### 1. 저장소 생성 및 업로드
```bash
# 새 저장소 생성 후
git clone https://github.com/YOUR_USERNAME/memo-app.git
cd memo-app

# 파일 복사 후
git add .
git commit -m "Initial commit - iOS style memo app"
git push
```

### 2. GitHub Pages 활성화
- Settings → Pages → Source: main branch
- 배포 URL: `https://YOUR_USERNAME.github.io/memo-app`

### 3. Firebase 도메인 승인 (중요!)
Firebase Console에서 다음 도메인 추가:
```
YOUR_USERNAME.github.io
localhost
127.0.0.1
```

## 🛡️ 보안 기능

- **Firebase Authentication** - Google 로그인 및 익명 인증
- **사용자별 데이터 분리** - 완전한 개인정보 보호
- **XSS 방지** - HTML 태그 자동 제거
- **데이터 검증** - 입력값 유효성 검사

## 📱 사용법

### Google 로그인 (권장)
- 모든 기기에서 메모 동기화
- 실시간 백업 및 복원

### 익명 로그인
- 빠른 시작 (개인정보 수집 없음)
- 해당 기기에서만 사용

## 🔧 기술 스택

- **Frontend**: Vanilla JavaScript, CSS3, HTML5
- **Backend**: Firebase Firestore
- **Authentication**: Firebase Auth
- **Hosting**: GitHub Pages

---

⭐ 이 프로젝트가 도움이 되었다면 별표를 눌러주세요!
