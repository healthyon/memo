// Firebase와 Firestore 관련 변수
let db = null;
let auth = null;
let currentUser = null;
let unsubscribeListener = null;
let isOnline = navigator.onLine;
let syncQueue = [];

// 성능 최적화를 위한 전역 변수
let notes = [];
let currentNoteId = null;
let saveTimeout = null;
const AUTOSAVE_DELAY = 100; // 100ms로 더 단축
let isFirstLoad = true;
let renderQueue = [];
let isRendering = false;

// 사용자별 컬렉션 경로 생성
function getNotesCollectionPath() {
    if (currentUser) {
        return `users/${currentUser.uid}/notes`;
    }
    return 'notes'; // 기본 경로 (오프라인 모드용)
}

// 선택 모드 관련 변수
let isSelectionMode = false;
let selectedNotes = new Set();

// DOM 요소 캐싱
const elements = {
    authScreen: null,
    mainApp: null,
    googleAuthBtn: null,
    anonymousAuthBtn: null,
    googleAuthLoading: null,
    anonymousAuthLoading: null,
    userMenuBtn: null,
    userMenu: null,
    userAvatar: null,
    userName: null,
    userEmail: null,
    logoutBtn: null,
    notesGrid: null,
    modalOverlay: null,
    noteTextarea: null,
    newNoteBtn: null,
    closeModalBtn: null,
    deleteNoteBtn: null,
    selectModeBtn: null,
    selectionHeader: null,
    cancelSelectionBtn: null,
    selectAllBtn: null,
    deleteSelectedBtn: null,
    selectedCount: null
};

// 빠른 DOM 준비를 위한 DOMContentLoaded
document.addEventListener('DOMContentLoaded', fastInitializeApp);

// 빠른 초기화 (순서 최적화)
async function fastInitializeApp() {
    console.log('🚀 앱 초기화 시작');
    
    // DOM 요소 캐싱
    cacheElements();
    
    // 이벤트 리스너 등록
    setupEventListeners();
    
    // 세션 백업 확인 (즉시 로그인 가능성 체크)
    const hasSessionBackup = checkSessionBackup();
    
    // 세션 백업이 없으면 로그인 화면 표시
    if (!hasSessionBackup) {
        showAuthScreen();
    }
    
    // Firebase 즉시 로드 (지연 없이)
    try {
        console.log('🔥 Firebase 로딩 시작...');
        await loadFirebase();
        console.log('✅ Firebase 로딩 완료');
        
        console.log('🔐 인증 처리 시작...');
        await handleInitialAuth();
        console.log('✅ 인증 처리 완료');
    } catch (error) {
        console.error('❌ 초기화 오류:', error);
        showAuthScreen();
    }
}

// PWA 관련 변수
let deferredPrompt;
let installButton;

// PWA 서비스 워커 등록
if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            const registration = await navigator.serviceWorker.register('/memo/sw.js', {
                scope: '/memo/'
            });
            console.log('서비스 워커 등록 성공:', registration.scope);
            
            // 업데이트 확인
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                if (newWorker) {
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            console.log('새 버전 사용 가능');
                            showUpdateAvailable();
                        }
                    });
                }
            });
        } catch (error) {
            console.log('서비스 워커 등록 실패:', error);
        }
    });
}

// PWA 설치 프롬프트 처리
window.addEventListener('beforeinstallprompt', (e) => {
    console.log('PWA 설치 프롬프트 감지됨');
    e.preventDefault(); // 기본 브라우저 설치 프롬프트 방지
    deferredPrompt = e;
    showInstallButton();
});

// PWA 설치 완료 감지
window.addEventListener('appinstalled', () => {
    console.log('PWA 설치 완료');
    hideInstallButton();
    showInstallSuccess();
    deferredPrompt = null;
});

// 커스텀 설치 버튼 표시
function showInstallButton() {
    // 설치 버튼이 이미 있으면 무시
    if (installButton) return;
    
    installButton = document.createElement('button');
    installButton.className = 'pwa-install-btn';
    installButton.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7,10 12,15 17,10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        앱 설치
    `;
    
    installButton.addEventListener('click', handleInstallClick);
    
    // 헤더에 설치 버튼 추가
    const headerActions = document.querySelector('.header-actions');
    if (headerActions) {
        headerActions.insertBefore(installButton, headerActions.firstChild);
    }
}

// 설치 버튼 숨기기
function hideInstallButton() {
    if (installButton) {
        installButton.remove();
        installButton = null;
    }
}

// 설치 버튼 클릭 처리
async function handleInstallClick() {
    if (!deferredPrompt) return;
    
    console.log('PWA 설치 시작');
    
    // 설치 프롬프트 표시
    deferredPrompt.prompt();
    
    // 사용자 응답 대기
    const { outcome } = await deferredPrompt.userChoice;
    console.log('사용자 선택:', outcome);
    
    if (outcome === 'accepted') {
        console.log('사용자가 PWA 설치를 승인했습니다');
    } else {
        console.log('사용자가 PWA 설치를 거부했습니다');
    }
    
    deferredPrompt = null;
}

// 업데이트 알림 표시
function showUpdateAvailable() {
    const notification = document.createElement('div');
    notification.className = 'update-notification';
    notification.innerHTML = `
        <div class="update-content">
            <span>새 버전이 사용 가능합니다</span>
            <button onclick="window.location.reload()">새로고침</button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// 설치 완료 알림
function showInstallSuccess() {
    const notification = document.createElement('div');
    notification.className = 'install-success-notification';
    notification.innerHTML = `
        <div class="success-content">
            ✨ 메모장 앱이 성공적으로 설치되었습니다!
        </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// DOM 요소 캐싱 함수
function cacheElements() {
    elements.authScreen = document.getElementById('authScreen');
    elements.mainApp = document.getElementById('mainApp');
    elements.googleAuthBtn = document.getElementById('googleAuthBtn');
    elements.anonymousAuthBtn = document.getElementById('anonymousAuthBtn');
    elements.googleAuthLoading = document.getElementById('googleAuthLoading');
    elements.anonymousAuthLoading = document.getElementById('anonymousAuthLoading');
    elements.userMenuBtn = document.getElementById('userMenuBtn');
    elements.userMenu = document.getElementById('userMenu');
    elements.userAvatar = document.getElementById('userAvatar');
    elements.userName = document.getElementById('userName');
    elements.userEmail = document.getElementById('userEmail');
    elements.logoutBtn = document.getElementById('logoutBtn');
    elements.notesGrid = document.getElementById('notesGrid');
    elements.modalOverlay = document.getElementById('modalOverlay');
    elements.noteTextarea = document.getElementById('noteTextarea');
    elements.newNoteBtn = document.getElementById('newNoteBtn');
    elements.closeModalBtn = document.getElementById('closeModalBtn');
    elements.deleteNoteBtn = document.getElementById('deleteNoteBtn');
    elements.selectModeBtn = document.getElementById('selectModeBtn');
    elements.selectionHeader = document.getElementById('selectionHeader');
    elements.cancelSelectionBtn = document.getElementById('cancelSelectionBtn');
    elements.selectAllBtn = document.getElementById('selectAllBtn');
    elements.deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
    elements.selectedCount = document.getElementById('selectedCount');
    elements.authDescription = document.getElementById('authDescription');
    elements.autoLoginLoading = document.getElementById('autoLoginLoading');
}

// 즉시 로그인 화면 표시
function showAuthScreen() {
    if (elements.authScreen) {
        elements.authScreen.style.display = 'flex';
    }
    if (elements.mainApp) {
        elements.mainApp.style.display = 'none';
    }
}

// 인증된 사용자용 앱 초기화
async function initializeAuthenticatedApp() {
    console.log('메인 앱 초기화 시작');
    
    try {
        // 저장된 메모 로드 및 실시간 리스너 설정
        console.log('메모 로드 중...');
        await loadNotes();
        
        // 초기 렌더링
        console.log('메모 렌더링 중...');
        renderNotes();
        
        // 오프라인/온라인 상태 모니터링
        setupNetworkStatusListener();
        
        // 화면 전환
        console.log('메인 앱 화면으로 전환');
        showMainApp();
        
        console.log('메인 앱 초기화 완료');
    } catch (error) {
        console.error('메인 앱 초기화 오류:', error);
        showAuthScreen();
    }
}

// Firebase 로딩 함수 (개선된 버전)
async function loadFirebase() {
    if (window.firebaseApp && window.db && window.auth) {
        console.log('✅ Firebase 이미 초기화됨');
        db = window.db;
        auth = window.auth;
        return;
    }
    
    try {
        await window.loadFirebase();
        
        if (window.db && window.auth) {
            db = window.db;
            auth = window.auth;
            console.log('✅ Firebase 연결 성공');
        } else {
            throw new Error('Firebase 서비스 초기화 실패');
        }
    } catch (error) {
        console.error('❌ Firebase 연결 실패:', error);
        throw error;
    }
}

// 레거시 지원 함수
async function waitForFirebase() {
    return loadFirebase();
}

// 세션 백업 확인 (Firebase 로드 전에 빠른 확인)
function checkSessionBackup() {
    try {
        const sessionBackup = localStorage.getItem('memo_session_backup');
        if (sessionBackup) {
            const sessionInfo = JSON.parse(sessionBackup);
            const lastLogin = new Date(sessionInfo.lastLogin);
            const now = new Date();
            const timeDiff = now - lastLogin;
            
            // 7일 이내 로그인 기록이 있으면 세션 복원 가능성 표시
            if (timeDiff < 7 * 24 * 60 * 60 * 1000) {
                console.log('세션 백업 발견 - Firebase Auth 로드 중...');
                showAutoLoginLoading();
                return true;
            } else {
                // 오래된 세션 백업 삭제
                localStorage.removeItem('memo_session_backup');
            }
        }
    } catch (error) {
        console.warn('세션 백업 확인 실패:', error);
        localStorage.removeItem('memo_session_backup');
    }
    return false;
}

function setupEventListeners() {
    // 인증 버튼들
    elements.googleAuthBtn?.addEventListener('click', handleGoogleSignIn);
    elements.anonymousAuthBtn?.addEventListener('click', handleAnonymousSignIn);
    
    // 사용자 메뉴
    elements.userMenuBtn?.addEventListener('click', toggleUserMenu);
    elements.logoutBtn?.addEventListener('click', handleLogout);
    
    // 새 메모 버튼
    elements.newNoteBtn?.addEventListener('click', createNewNote);
    
    // 모달 닫기
    elements.closeModalBtn?.addEventListener('click', closeModal);
    elements.modalOverlay?.addEventListener('click', handleModalOverlayClick);
    
    // 메모 삭제
    elements.deleteNoteBtn?.addEventListener('click', deleteCurrentNote);
    
    // 실시간 저장을 위한 입력 이벤트
    elements.noteTextarea?.addEventListener('input', handleTextareaInput);
    
    // 선택 모드 관련 이벤트
    elements.selectModeBtn?.addEventListener('click', toggleSelectionMode);
    elements.cancelSelectionBtn?.addEventListener('click', exitSelectionMode);
    elements.selectAllBtn?.addEventListener('click', toggleSelectAll);
    elements.deleteSelectedBtn?.addEventListener('click', deleteSelectedNotes);
    
    // 키보드 단축키
    document.addEventListener('keydown', handleKeyboard);
    
    // 페이지 이탈 시 자동 저장
    window.addEventListener('beforeunload', saveCurrentNote);
    
    // 외부 클릭시 메뉴 닫기
    document.addEventListener('click', handleDocumentClick);
}

function setupNetworkStatusListener() {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
}

function handleOnline() {
    isOnline = true;
    console.log('온라인 상태로 변경');
    processSyncQueue();
}

function handleOffline() {
    isOnline = false;
    console.log('오프라인 상태로 변경');
}

function handleKeyboard(e) {
    // ESC로 모달 닫기
    if (e.key === 'Escape' && elements.modalOverlay.classList.contains('active')) {
        closeModal();
    }
    
    // Cmd/Ctrl + N으로 새 메모
    if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        createNewNote();
    }
}

function handleModalOverlayClick(e) {
    if (e.target === elements.modalOverlay) {
        closeModal();
    }
}

function handleTextareaInput() {
    // 디바운싱을 통한 성능 최적화
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        saveCurrentNote();
    }, AUTOSAVE_DELAY);
}

// === 인증 관련 함수들 ===

// 초기 인증 처리 (간소화 및 안정성 개선)
async function handleInitialAuth() {
    if (!auth) {
        console.log('❌ Firebase Auth 미초기화');
        showAuthScreen();
        return;
    }
    
    console.log('🔄 인증 상태 확인 시작...');
    
    try {
        // 리다이렉트 결과 확인
        const hadRedirectResult = await checkRedirectResult();
        
        // Auth 상태 리스너 설정 (가장 중요!)
        setupAuthStateListener();
        
        if (!hadRedirectResult) {
            // 현재 사용자 즉시 확인
            const user = auth.currentUser;
            if (user) {
                console.log('✅ 즉시 세션 복원:', user.email || '익명 사용자');
                handleUserLogin(user);
            } else {
                // onAuthStateChanged에서 처리될 것이므로 잠시 대기
                console.log('⏳ Auth 상태 변경 대기 중...');
                showAutoLoginLoading();
                
                // 3초 후에도 로그인되지 않으면 로그인 화면 표시
                setTimeout(() => {
                    if (!currentUser) {
                        console.log('❌ 세션 없음 - 로그인 화면 표시');
                        showAuthScreen();
                    }
                }, 3000);
            }
        }
    } catch (error) {
        console.error('인증 처리 오류:', error);
        showAuthScreen();
    }
}

// 리다이렉트 결과 확인
async function checkRedirectResult() {
    try {
        const { getRedirectResult } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
        const result = await getRedirectResult(auth);
        
        if (result) {
            // 리다이렉트 로그인 성공
            console.log('리다이렉트 로그인 성공:', result.user.email);
            isFirstLoad = false; // 로그인 성공시 플래그 해제
            return true;
        }
    } catch (error) {
        console.error('리다이렉트 결과 확인 오류:', error);
        if (error.code !== 'auth/no-redirect-result') {
            alert(`로그인 오류: ${error.message}`);
        }
    }
    return false;
}

// 인증 상태 리스너 설정 (개선된 버전)
function setupAuthStateListener() {
    if (!auth) {
        console.error('❌ Auth가 초기화되지 않음');
        return;
    }
    
    console.log('🔗 Auth 상태 리스너 설정 중...');
    
    // Firebase 모듈이 이미 로드되어 있는지 확인
    const useFirebaseModules = window.firebaseModules && window.firebaseModules.auth;
    
    if (useFirebaseModules) {
        // 이미 로드된 모듈 사용
        const { onAuthStateChanged } = window.firebaseModules.auth;
        const unsubscribe = onAuthStateChanged(auth, handleAuthStateChange);
        console.log('✅ Auth 상태 리스너 설정 완료');
        
        // 페이지 언로드 시 리스너 해제
        window.addEventListener('beforeunload', unsubscribe);
    } else {
        // 동적 import (fallback)
        import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js')
            .then(({ onAuthStateChanged }) => {
                const unsubscribe = onAuthStateChanged(auth, handleAuthStateChange);
                console.log('✅ Auth 상태 리스너 설정 완료 (동적 로드)');
                window.addEventListener('beforeunload', unsubscribe);
            })
            .catch(error => {
                console.error('❌ Auth 리스너 설정 실패:', error);
            });
    }
}

// 인증 상태 변경 핸들러 (완전히 개선된 버전)
function handleAuthStateChange(user) {
    console.log('🔄 Auth 상태 변경:', user ? `✅ 로그인됨 (${user.email || '익명 사용자'})` : '❌ 로그아웃됨');
    
    currentUser = user;
    
    if (user) {
        console.log('👤 사용자 정보:', {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            isAnonymous: user.isAnonymous,
            emailVerified: user.emailVerified
        });
        
        handleUserLogin(user);
    } else {
        handleUserLogout();
    }
}

// 사용자 로그인 처리 (공통 함수)
function handleUserLogin(user) {
    console.log('🔐 사용자 로그인 처리 시작');
    
    // 사용자 정보 업데이트
    updateUserInfo(user);
    
    // 세션 정보를 로컬스토리지에 백업 저장
    try {
        const sessionInfo = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            isAnonymous: user.isAnonymous,
            lastLogin: new Date().toISOString()
        };
        localStorage.setItem('memo_session_backup', JSON.stringify(sessionInfo));
        console.log('💾 세션 백업 저장 완료');
    } catch (error) {
        console.warn('⚠️ 세션 백업 저장 실패:', error);
    }
    
    // 메인 앱이 표시되어 있지 않다면 초기화
    if (elements.mainApp.style.display === 'none') {
        console.log('🚀 메인 앱 초기화 시작');
        initializeAuthenticatedApp();
    }
    
    isFirstLoad = false;
}

// 사용자 로그아웃 처리 (공통 함수)
function handleUserLogout() {
    console.log('🚪 사용자 로그아웃 처리');
    
    // 세션 백업 정보 삭제
    localStorage.removeItem('memo_session_backup');
    
    // Firestore 리스너 해제
    if (unsubscribeListener) {
        unsubscribeListener();
        unsubscribeListener = null;
    }
    
    // 데이터 초기화
    notes = [];
    currentNoteId = null;
    
    // 로그인 화면 표시
    showAuthScreen();
    isFirstLoad = true;
}

// Google 로그인 처리
async function handleGoogleSignIn() {
    console.log('Google 로그인 버튼 클릭됨');
    
    // Firebase가 로드되지 않았다면 먼저 로드
    if (!auth) {
        console.log('Firebase Auth 로딩 중...');
        setAuthButtonLoading('google', true);
        await waitForFirebase();
        
        if (!auth) {
            console.error('Firebase Auth 로드 실패');
            setAuthButtonLoading('google', false);
            return;
        }
    }
    
    // 첫 로드 플래그 해제 (사용자가 직접 로그인 시도)
    isFirstLoad = false;
    
    console.log('Google 로그인 시작');
    console.log('Firebase Auth 상태:', !!auth);
    console.log('현재 도메인:', window.location.hostname);
    
    setAuthButtonLoading('google', true);
    
    try {
        // Firebase 모듈이 이미 로드되어 있는지 확인
        let signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider;
        
        if (window.firebaseModules && window.firebaseModules.auth) {
            // 이미 로드된 모듈 사용
            ({ signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider } = window.firebaseModules.auth);
        } else {
            // 새로 import
            ({ signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js'));
        }
        
        const provider = new GoogleAuthProvider();
        provider.addScope('profile');
        provider.addScope('email');
        
        // 모바일 환경 체크
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        let result;
        if (isMobile) {
            // 모바일에서는 리다이렉트 방식 사용
            console.log('모바일 환경: 리다이렉트 방식 사용');
            await signInWithRedirect(auth, provider);
            return; // 리다이렉트되므로 여기서 종료
        } else {
            // 데스크톱에서는 팝업 방식 사용
            console.log('데스크톱 환경: 팝업 방식 사용');
            console.log('팝업 열기 시도...');
            result = await signInWithPopup(auth, provider);
            console.log('팝업 로그인 완료:', result);
        }
        
        if (result) {
            console.log('Google 로그인 성공:', result.user.email);
            console.log('사용자 정보:', result.user);
            setAuthButtonLoading('google', false);
            
            // 첫 로드 플래그 초기화 (중요!)
            isFirstLoad = false;
            
            // 명시적으로 사용자 정보 업데이트 및 앱 초기화
            currentUser = result.user;
            updateUserInfo(result.user);
            
            console.log('로그인 완료 - 메인 앱 초기화 시작');
            await initializeAuthenticatedApp();
        }
    } catch (error) {
        console.error('Google 로그인 오류:', error);
        setAuthButtonLoading('google', false);
        
        if (error.code === 'auth/popup-closed-by-user') {
            console.log('사용자가 팝업을 닫았습니다.');
            return;
        }
        
        if (error.code === 'auth/popup-blocked') {
            // 팝업이 차단된 경우 리다이렉트 방식으로 재시도
            console.log('팝업이 차단됨, 리다이렉트 방식으로 재시도');
            try {
                const { signInWithRedirect } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
                const provider = new GoogleAuthProvider();
                await signInWithRedirect(auth, provider);
                return;
            } catch (redirectError) {
                console.error('리다이렉트 로그인도 실패:', redirectError);
            }
        }
        
        // 기타 오류시 사용자에게 알림
        alert(`Google 로그인 오류: ${error.message}`);
        
        // 오류 시 익명 로그인으로 대체 제안
        if (confirm('Google 로그인에 실패했습니다. 익명으로 시작하시겠습니까?')) {
            handleAnonymousSignIn();
        }
    }
}

// 익명 로그인 처리
async function handleAnonymousSignIn() {
    console.log('익명 로그인 버튼 클릭됨');
    
    // Firebase가 로드되지 않았다면 먼저 로드
    if (!auth) {
        console.log('Firebase Auth 로딩 중...');
        setAuthButtonLoading('anonymous', true);
        await waitForFirebase();
        
        if (!auth) {
            console.error('Firebase Auth 로드 실패');
            setAuthButtonLoading('anonymous', false);
            return;
        }
    }
    
    // 첫 로드 플래그 해제 (사용자가 직접 로그인 시도)
    isFirstLoad = false;
    
    setAuthButtonLoading('anonymous', true);
    
    try {
        // Firebase 모듈이 이미 로드되어 있는지 확인
        let signInAnonymously;
        
        if (window.firebaseModules && window.firebaseModules.auth) {
            // 이미 로드된 모듈 사용
            ({ signInAnonymously } = window.firebaseModules.auth);
        } else {
            // 새로 import
            ({ signInAnonymously } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js'));
        }
        
        const result = await signInAnonymously(auth);
        console.log('익명 로그인 성공');
        
        // 첫 로드 플래그 초기화
        isFirstLoad = false;
        
        // 명시적으로 사용자 정보 업데이트 및 앱 초기화
        currentUser = result.user;
        updateUserInfo(result.user);
        
        console.log('익명 로그인 완료 - 메인 앱 초기화 시작');
        await initializeAuthenticatedApp();
    } catch (error) {
        console.error('익명 로그인 오류:', error);
        setAuthButtonLoading('anonymous', false);
        
        // 오류 시 로그인 화면 유지하고 알림 표시
        alert('로그인에 실패했습니다. 다시 시도해주세요.');
        showAuthScreen();
    }
}

// 로그아웃 처리
async function handleLogout() {
    if (!auth || !currentUser) return;
    
    try {
        const { signOut } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
        await signOut(auth);
        console.log('로그아웃 성공');
    } catch (error) {
        console.error('로그아웃 오류:', error);
    }
}

// 인증 버튼 로딩 상태 설정
function setAuthButtonLoading(type, loading) {
    const button = type === 'google' ? elements.googleAuthBtn : elements.anonymousAuthBtn;
    const loadingElement = type === 'google' ? elements.googleAuthLoading : elements.anonymousAuthLoading;
    
    if (!button) return;
    
    if (loading) {
        button.classList.add('loading');
        button.disabled = true;
    } else {
        button.classList.remove('loading');
        button.disabled = false;
    }
}

// 로그인 화면 표시
function showAuthScreen() {
    elements.authScreen.style.display = 'flex';
    elements.mainApp.style.display = 'none';
    
    // 모든 로그인 화면 요소들 복원
    const authButtons = document.querySelector('.auth-buttons');
    const authNotes = document.querySelector('.auth-notes');
    
    if (authButtons) authButtons.style.display = 'flex';
    if (authNotes) authNotes.style.display = 'block';
    if (elements.authDescription) elements.authDescription.style.display = 'block';
    if (elements.autoLoginLoading) elements.autoLoginLoading.style.display = 'none';
}

// 자동 로그인 로딩 표시
function showAutoLoginLoading() {
    elements.authScreen.style.display = 'flex';
    elements.mainApp.style.display = 'none';
    
    // 로그인 버튼들과 설명 숨기기
    const authButtons = document.querySelector('.auth-buttons');
    const authNotes = document.querySelector('.auth-notes');
    
    if (authButtons) authButtons.style.display = 'none';
    if (authNotes) authNotes.style.display = 'none';
    if (elements.authDescription) elements.authDescription.style.display = 'none';
    
    // 자동 로그인 로딩 표시
    if (elements.autoLoginLoading) {
        elements.autoLoginLoading.style.display = 'block';
    }
}

// 메인 앱 화면 표시
function showMainApp() {
    elements.authScreen.style.display = 'none';
    elements.mainApp.style.display = 'block';
    elements.mainApp.style.setProperty('display', 'block', 'important');
}

// 사용자 메뉴 토글
function toggleUserMenu() {
    if (elements.userMenu.classList.contains('active')) {
        elements.userMenu.classList.remove('active');
    } else {
        elements.userMenu.classList.add('active');
    }
}

// 문서 클릭시 메뉴 닫기
function handleDocumentClick(e) {
    if (!elements.userMenuBtn.contains(e.target) && !elements.userMenu.contains(e.target)) {
        elements.userMenu.classList.remove('active');
    }
}

// 사용자 정보 업데이트
function updateUserInfo(user) {
    if (!user) return;
    
    const isGoogleUser = user.providerData.some(provider => provider.providerId === 'google.com');
    
    if (isGoogleUser) {
        // Google 사용자
        elements.userName.textContent = user.displayName || '사용자';
        elements.userEmail.textContent = user.email || '';
        
        if (user.photoURL) {
            elements.userAvatar.innerHTML = `<img src="${user.photoURL}" alt="프로필" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
        } else {
            const initial = (user.displayName || user.email || 'U').charAt(0).toUpperCase();
            elements.userAvatar.textContent = initial;
        }
    } else {
        // 익명 사용자
        elements.userName.textContent = '익명 사용자';
        elements.userEmail.textContent = '이 기기에서만 사용';
        elements.userAvatar.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="3"/>
            <path d="m12 1v6m0 6v6"/>
        </svg>`;
    }
}

// Firebase에서 메모 로드 및 실시간 리스너 설정
async function loadNotes() {
    if (!db) {
        loadNotesFromLocalStorage();
        return;
    }

    try {
        const { collection, onSnapshot, orderBy, query } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        // 사용자별 컬렉션 경로 사용
        const collectionPath = getNotesCollectionPath();
        
        // 실시간 리스너 설정
        const notesQuery = query(collection(db, collectionPath), orderBy('updatedAt', 'desc'));
        
        unsubscribeListener = onSnapshot(notesQuery, (snapshot) => {
            notes = [];
            snapshot.forEach((doc) => {
                notes.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            // 로컬스토리지에도 백업 저장
            saveNotesToLocalStorage();
            renderNotes();
        }, (error) => {
            console.error('실시간 리스너 오류:', error);
            // Firebase 오류 시 로컬스토리지에서 로드
            loadNotesFromLocalStorage();
        });
        
    } catch (error) {
        console.error('Firebase 로드 오류:', error);
        loadNotesFromLocalStorage();
    }
}

// 로컬스토리지에서 메모 로드 (백업용)
function loadNotesFromLocalStorage() {
    try {
        const storageKey = currentUser ? `notepad_notes_${currentUser.uid}` : 'notepad_notes';
        const savedData = localStorage.getItem(storageKey);
        
        if (savedData) {
            // 암호화된 데이터 복호화 시도
            const decryptedData = decryptLocalData(savedData);
            if (decryptedData) {
                notes = decryptedData;
            } else {
                // 기존 평문 데이터와 호환성 유지
                notes = JSON.parse(savedData);
            }
        } else {
            notes = [];
        }
        
        // 데이터 유효성 검증
        notes = notes.filter(note => note && note.id && typeof note.content === 'string');
        
        // 날짜 순으로 정렬 (최신순)
        notes.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        renderNotes();
    } catch (error) {
        console.error('로컬스토리지 로드 오류:', error);
        notes = [];
        renderNotes();
    }
}

// 로컬스토리지에 메모 저장 (백업용)
function saveNotesToLocalStorage() {
    try {
        const storageKey = currentUser ? `notepad_notes_${currentUser.uid}` : 'notepad_notes';
        
        // 데이터 살균
        const sanitizedNotes = notes.map(note => sanitizeNoteData(note));
        
        // 데이터 암호화
        const encryptedData = encryptLocalData(sanitizedNotes);
        if (encryptedData) {
            localStorage.setItem(storageKey, encryptedData);
        } else {
            // 암호화 실패시 평문으로 저장
            localStorage.setItem(storageKey, JSON.stringify(sanitizedNotes));
        }
    } catch (error) {
        console.error('로컬스토리지 저장 오류:', error);
    }
}

// Firebase에 메모 저장
async function saveNoteToFirebase(note, operation = 'update') {
    if (!db || !isOnline) {
        // 오프라인 상태일 때 sync queue에 추가
        syncQueue.push({ note, operation });
        saveNotesToLocalStorage();
        return;
    }

    try {
        const { doc, setDoc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        // 사용자별 컬렉션 경로 사용
        const collectionPath = getNotesCollectionPath();
        
        if (operation === 'delete') {
            await deleteDoc(doc(db, collectionPath, note.id));
        } else {
            // 데이터 유효성 검증
            const sanitizedNote = sanitizeNoteData(note);
            await setDoc(doc(db, collectionPath, note.id), sanitizedNote);
        }
        
    } catch (error) {
        console.error('Firebase 저장 오류:', error);
        // 오류 시 sync queue에 추가
        syncQueue.push({ note, operation });
        saveNotesToLocalStorage();
    }
}

// 동기화 큐 처리
async function processSyncQueue() {
    if (!db || !isOnline || syncQueue.length === 0) return;

    const queueCopy = [...syncQueue];
    syncQueue = [];

    for (const item of queueCopy) {
        try {
            await saveNoteToFirebase(item.note, item.operation);
        } catch (error) {
            console.error('동기화 오류:', error);
            // 실패한 항목은 다시 큐에 추가
            syncQueue.push(item);
        }
    }
}

// 메모 목록 렌더링
function renderNotes() {
    // 렌더링 중복 방지
    if (isRendering) return;
    isRendering = true;
    
    requestAnimationFrame(() => {
        if (notes.length === 0) {
            elements.notesGrid.innerHTML = `
                <div class="empty-state">
                    <h3>아직 메모가 없어요</h3>
                    <p>+ 버튼을 눌러 첫 번째 메모를 작성해보세요</p>
                    ${!isOnline ? '<p style="color: #ff9500; margin-top: 8px;">📱 오프라인 모드</p>' : ''}
                </div>
            `;
            isRendering = false;
            return;
        }

    // DocumentFragment를 사용한 성능 최적화
    const fragment = document.createDocumentFragment();
    
    notes.forEach(note => {
        const noteCard = createNoteCard(note);
        fragment.appendChild(noteCard);
    });
    
        elements.notesGrid.innerHTML = '';
        elements.notesGrid.appendChild(fragment);
        isRendering = false;
    });
}

// 메모 카드 생성
function createNoteCard(note) {
    const card = document.createElement('div');
    card.className = 'note-card';
    card.dataset.noteId = note.id;
    
    const preview = note.content.substring(0, 150);
    const formattedDate = formatDate(note.updatedAt);
    const isSelected = selectedNotes.has(note.id);
    
    card.innerHTML = `
        ${isSelectionMode ? `
            <div class="note-checkbox-container">
                <input type="checkbox" class="note-checkbox" ${isSelected ? 'checked' : ''} 
                       data-note-id="${note.id}" onclick="event.stopPropagation()">
            </div>
        ` : ''}
        <div class="note-content">
            <div class="note-preview">${preview || '빈 메모'}</div>
            <div class="note-date">${formattedDate}</div>
        </div>
    `;
    
    // 선택 모드가 아닐 때만 메모 열기 이벤트 추가
    if (!isSelectionMode) {
        card.addEventListener('click', () => openNote(note.id));
    } else {
        // 선택 모드일 때는 체크박스 토글
        card.addEventListener('click', (e) => {
            if (e.target.type !== 'checkbox') {
                toggleNoteSelection(note.id);
            }
        });
        
        // 체크박스 직접 클릭 이벤트
        const checkbox = card.querySelector('.note-checkbox');
        if (checkbox) {
            checkbox.addEventListener('change', () => {
                toggleNoteSelection(note.id);
            });
        }
    }
    
    // 선택된 상태 스타일 적용
    if (isSelected) {
        card.classList.add('selected');
    }
    
    return card;
}

// 날짜 포맷팅
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) {
        return '방금 전';
    } else if (diffInSeconds < 3600) {
        return `${Math.floor(diffInSeconds / 60)}분 전`;
    } else if (diffInSeconds < 86400) {
        return `${Math.floor(diffInSeconds / 3600)}시간 전`;
    } else if (diffInSeconds < 604800) {
        return `${Math.floor(diffInSeconds / 86400)}일 전`;
    } else {
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }
}

// 새 메모 생성
function createNewNote() {
    const newNote = {
        id: generateId(),
        content: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    // 로컬 배열에 즉시 추가
    notes.unshift(newNote);
    
    // 즉시 모달 열기 (Firebase 저장은 백그라운드에서)
    openNote(newNote.id);
    
    // Firebase 저장은 백그라운드에서 처리
    setTimeout(() => {
        saveNoteToFirebase(newNote).catch(console.warn);
    }, 0);
}

// 메모 열기 (즉시 반응)
function openNote(noteId) {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    
    currentNoteId = noteId;
    elements.noteTextarea.value = note.content;
    elements.modalOverlay.classList.add('active');
    
    // 즉시 포커스 (애니메이션과 동시 진행)
    requestAnimationFrame(() => {
        elements.noteTextarea.focus();
        // 커서를 텍스트 끝으로 이동
        const contentLength = note.content.length;
        elements.noteTextarea.setSelectionRange(contentLength, contentLength);
    });
}

// 현재 메모 저장
async function saveCurrentNote() {
    if (!currentNoteId) return;
    
    const note = notes.find(n => n.id === currentNoteId);
    if (!note) return;
    
    const newContent = elements.noteTextarea.value;
    
    // 내용이 변경된 경우에만 저장
    if (note.content !== newContent) {
        note.content = newContent;
        note.updatedAt = new Date().toISOString();
        
        // 메모 순서 업데이트 (최신 메모를 맨 위로)
        const noteIndex = notes.findIndex(n => n.id === currentNoteId);
        if (noteIndex > 0) {
            const [updatedNote] = notes.splice(noteIndex, 1);
            notes.unshift(updatedNote);
        }
        
        // Firebase에 저장
        try {
            await saveNoteToFirebase(note);
            console.log('메모 저장 완료:', note.id);
        } catch (error) {
            console.error('메모 저장 오류:', error);
        }
        
        // Firebase 리스너가 없는 경우에만 직접 렌더링
        if (!db || !unsubscribeListener) {
            renderNotes();
        }
    }
}

// 모달 닫기
function closeModal() {
    saveCurrentNote();
    elements.modalOverlay.classList.remove('active');
    currentNoteId = null;
    
    // 메모리 정리
    elements.noteTextarea.value = '';
}

// 현재 메모 삭제
async function deleteCurrentNote() {
    if (!currentNoteId) return;
    
    if (confirm('이 메모를 삭제하시겠습니까?')) {
        const noteToDelete = notes.find(note => note.id === currentNoteId);
        console.log('삭제할 메모:', noteToDelete);
        
        if (!noteToDelete) {
            console.error('삭제할 메모를 찾을 수 없습니다:', currentNoteId);
            return;
        }
        
        // 로컬 배열에서 제거
        notes = notes.filter(note => note.id !== currentNoteId);
        
        // Firebase에서 삭제
        try {
            await saveNoteToFirebase(noteToDelete, 'delete');
            console.log('메모 삭제 완료:', noteToDelete.id);
        } catch (error) {
            console.error('메모 삭제 오류:', error);
            // 삭제 실패시 로컬 배열에 다시 추가
            notes.push(noteToDelete);
        }
        
        // Firebase 리스너가 없는 경우에만 직접 렌더링
        if (!db || !unsubscribeListener) {
            renderNotes();
        }
        
        closeModal();
    }
}

// 고유 ID 생성
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// 성능 최적화: RAF를 사용한 스크롤 이벤트 최적화
let ticking = false;

function requestTick() {
    if (!ticking) {
        requestAnimationFrame(updateScrollElements);
        ticking = true;
    }
}

function updateScrollElements() {
    // 스크롤 관련 업데이트 로직
    ticking = false;
}

// 터치 이벤트 최적화 (모바일)
if ('ontouchstart' in window) {
    document.body.style.touchAction = 'manipulation';
}

// 페이지 언로드 시 정리
window.addEventListener('beforeunload', () => {
    if (unsubscribeListener) {
        unsubscribeListener();
    }
});

// 앱 visibility 변경 시 동기화
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && isOnline) {
        processSyncQueue();
    }
});

// === 보안 및 데이터 유효성 검증 ===

// 메모 데이터 살균 및 검증
function sanitizeNoteData(note) {
    // XSS 방지를 위한 HTML 태그 제거
    const sanitizeString = (str) => {
        if (typeof str !== 'string') return '';
        return str
            .replace(/<script[^>]*>.*?<\/script>/gi, '') // 스크립트 태그 제거
            .replace(/<[^>]+>/g, '') // 모든 HTML 태그 제거
            .substring(0, 10000); // 최대 길이 제한
    };
    
    // 필수 필드 검증 및 살균
    return {
        id: note.id || generateId(),
        content: sanitizeString(note.content || ''),
        createdAt: note.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // 사용자 ID 추가 (추가 보안)
        userId: currentUser?.uid || 'anonymous'
    };
}

// 로컬스토리지 데이터 암호화 (간단한 난독화)
function encryptLocalData(data) {
    try {
        const jsonString = JSON.stringify(data);
        return btoa(encodeURIComponent(jsonString));
    } catch (error) {
        console.error('데이터 암호화 오류:', error);
        return null;
    }
}

// 로컬스토리지 데이터 복호화
function decryptLocalData(encryptedData) {
    try {
        const jsonString = decodeURIComponent(atob(encryptedData));
        return JSON.parse(jsonString);
    } catch (error) {
        console.error('데이터 복호화 오류:', error);
        return null;
    }
}

// === 선택 모드 관련 함수들 ===

// 선택 모드 토글
function toggleSelectionMode() {
    isSelectionMode = !isSelectionMode;
    selectedNotes.clear();
    
    if (isSelectionMode) {
        enterSelectionMode();
    } else {
        exitSelectionMode();
    }
}

// 선택 모드 진입
function enterSelectionMode() {
    isSelectionMode = true;
    document.body.classList.add('selection-mode');
    elements.selectionHeader.style.display = 'block';
    updateSelectionCount();
    renderNotes();
}

// 선택 모드 종료
function exitSelectionMode() {
    isSelectionMode = false;
    selectedNotes.clear();
    document.body.classList.remove('selection-mode');
    elements.selectionHeader.style.display = 'none';
    renderNotes();
}

// 메모 선택 토글
function toggleNoteSelection(noteId) {
    if (selectedNotes.has(noteId)) {
        selectedNotes.delete(noteId);
    } else {
        selectedNotes.add(noteId);
    }
    
    updateSelectionCount();
    updateNoteCardSelection(noteId);
}

// 메모 카드 선택 상태 업데이트
function updateNoteCardSelection(noteId) {
    const card = document.querySelector(`[data-note-id="${noteId}"]`);
    const checkbox = card?.querySelector('.note-checkbox');
    
    if (card && checkbox) {
        const isSelected = selectedNotes.has(noteId);
        checkbox.checked = isSelected;
        
        if (isSelected) {
            card.classList.add('selected');
        } else {
            card.classList.remove('selected');
        }
    }
}

// 전체 선택/해제 토글
function toggleSelectAll() {
    const allSelected = selectedNotes.size === notes.length;
    
    if (allSelected) {
        // 전체 해제
        selectedNotes.clear();
        elements.selectAllBtn.textContent = '전체선택';
    } else {
        // 전체 선택
        notes.forEach(note => selectedNotes.add(note.id));
        elements.selectAllBtn.textContent = '전체해제';
    }
    
    updateSelectionCount();
    renderNotes();
}

// 선택 개수 업데이트
function updateSelectionCount() {
    const count = selectedNotes.size;
    elements.selectedCount.textContent = count;
    
    // 전체선택 버튼 텍스트 업데이트
    if (count === notes.length && notes.length > 0) {
        elements.selectAllBtn.textContent = '전체해제';
    } else {
        elements.selectAllBtn.textContent = '전체선택';
    }
    
    // 삭제 버튼 활성화/비활성화
    elements.deleteSelectedBtn.disabled = count === 0;
}

// 선택된 메모들 삭제
async function deleteSelectedNotes() {
    const count = selectedNotes.size;
    
    if (count === 0) return;
    
    if (confirm(`선택된 ${count}개의 메모를 삭제하시겠습니까?`)) {
        const noteIdsToDelete = Array.from(selectedNotes);
        
        try {
            // 각 메모를 Firebase에서 삭제
            for (const noteId of noteIdsToDelete) {
                const noteToDelete = notes.find(note => note.id === noteId);
                if (noteToDelete) {
                    await saveNoteToFirebase(noteToDelete, 'delete');
                }
            }
            
            // 로컬 배열에서 제거
            notes = notes.filter(note => !selectedNotes.has(note.id));
            
            console.log(`${count}개 메모 삭제 완료`);
            
            // 선택 모드 종료
            exitSelectionMode();
            
            // Firebase 리스너가 없는 경우에만 직접 렌더링
            if (!db || !unsubscribeListener) {
                renderNotes();
            }
            
        } catch (error) {
            console.error('메모 삭제 오류:', error);
            alert('메모 삭제 중 오류가 발생했습니다.');
        }
    }
}