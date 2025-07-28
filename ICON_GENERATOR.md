# 📱 PWA 아이콘 생성 가이드

## 필요한 아이콘 파일들

다음 크기의 PNG 아이콘들을 생성해야 합니다:

### 기본 아이콘들
- `icon-72.png` (72x72)
- `icon-96.png` (96x96)  
- `icon-128.png` (128x128)
- `icon-144.png` (144x144)
- `icon-152.png` (152x152)
- `icon-192.png` (192x192) ⭐ **핵심**
- `icon-384.png` (384x384)
- `icon-512.png` (512x512) ⭐ **핵심**

### 마스커블 아이콘들 (배경 포함)
- `icon-192-maskable.png` (192x192)
- `icon-512-maskable.png` (512x512)

### 스크린샷들 (선택)
- `screenshot-mobile.png` (390x844)
- `screenshot-desktop.png` (1280x800)

## 🎨 디자인 가이드라인

### 아이콘 디자인
- **색상**: 메인 `#007aff` (iOS 블루)
- **배경**: 흰색 또는 투명
- **모양**: 메모/노트 아이콘 (📝)
- **스타일**: iOS 라운드 코너

### 마스커블 아이콘
- **안전 영역**: 중앙 40% 영역에 중요 요소 배치
- **배경**: 색상 배경 필수 (투명 불가)
- **여백**: 충분한 패딩 포함

## 🚀 빠른 생성 방법

### 온라인 도구 사용
1. **PWA Icon Generator**: https://www.pwabuilder.com/imageGenerator
2. **Favicon.io**: https://favicon.io/favicon-converter/
3. **RealFaviconGenerator**: https://realfavicongenerator.net/

### 수동 생성 (Figma/Photoshop)
```
1. 512x512 마스터 아이콘 생성
2. 각 크기별로 리사이즈
3. PNG 포맷으로 저장
4. /memo/ 폴더에 업로드
```

## 📝 임시 아이콘 (개발용)

현재는 SVG 데이터 URI를 사용 중이므로, 
실제 PNG 파일이 없어도 PWA는 작동합니다.

하지만 최적의 사용자 경험을 위해서는 
실제 PNG 아이콘 파일들을 생성해야 합니다.

## ✅ 업로드 확인사항

모든 아이콘 파일이 업로드된 후:
1. https://healthyon.github.io/memo/icon-192.png 접속 가능
2. https://healthyon.github.io/memo/icon-512.png 접속 가능
3. 브라우저 개발자 도구에서 manifest.json 확인
4. PWA 설치 가능 여부 확인

---

**임시로는 아이콘 파일 없이도 PWA가 작동하지만, 
완전한 네이티브 앱 경험을 위해서는 실제 아이콘 파일들이 필요합니다.** 🎯