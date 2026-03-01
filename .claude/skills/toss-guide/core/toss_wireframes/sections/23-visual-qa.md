Section-ID: toss_wireframes-23
Auto-Enrich: true
Last-Reviewed: 2026-03-01
Primary-Sources: internal

## 비주얼 QA 체크리스트

화면별 UI 일관성 점검 시 아래 기준을 순서대로 적용한다.
DogCoach 원본(`C:\Users\gmdqn\DogCoach`) 대비 기능·시각 패리티를 확인한다.

### QA-1. 공통 점검 항목 (모든 화면)

| # | 항목 | 기준 | 체크 방법 |
|---|------|------|----------|
| 1 | **Navbar 뒤로가기** | 메인탭·로그인 제외 모든 화면에 ← 또는 × | 화면 상단 확인 |
| 2 | **Typography 토큰** | fontSize 하드코딩 없음 → TDS Typography 1~7 사용 | StyleSheet 검색 `fontSize:` |
| 3 | **Color 토큰** | 하드코딩 `#hex` 없음 → `colors.*` 사용 | StyleSheet 검색 `#` |
| 4 | **로딩 상태** | API 호출 화면에 Skeleton 또는 Loader | 네트워크 지연 시뮬레이션 |
| 5 | **빈 상태** | 데이터 0건 시 EmptyState (CTA 포함) | 빈 계정으로 진입 |
| 6 | **에러 상태** | 네트워크/서버 에러 시 ErrorState (재시도 버튼) | 오프라인 모드 |
| 7 | **터치 영역** | 인터랙티브 요소 44×44pt 이상 | 실기기 탭 테스트 |
| 8 | **UX 라이팅** | 해요체 + 능동형 + 긍정형 (`toss_apps` 11.5 참조) | 모든 텍스트 문구 검수 |
| 9 | **간격 일관성** | 섹션 간 24px, 요소 간 12~16px, 화면 좌우 패딩 20px | 개발자 도구 측정 |
| 10 | **BottomCTA 안전영역** | SafeAreaView 하단 패딩 확보 | 노치/홈바 기기 테스트 |

### QA-2. 레이아웃 패턴별 추가 점검

| 패턴 | 추가 점검 |
|------|----------|
| **A 목록형** | ScrollView 스크롤 인디케이터, 리스트 아이템 높이 일관, 마지막 아이템 하단 패딩 |
| **B 상세형** | AppBar 타이틀 truncate, ScrollView 콘텐츠 하단 여백 (BottomCTA 가림 방지) |
| **C 입력폼형** | KeyboardAvoidingView 동작, ProgressBar 스텝 정확도, 비활성 CTA 스타일 |
| **D 탭형** | Tab 선택 인디케이터, 탭 전환 시 스크롤 위치 초기화, 선택 탭 시각 구분 |
| **E 모달형** | BottomSheet 드래그 핸들, 딤 배경 터치 닫기, 최대 높이 제한 (화면 90%) |

### QA-3. 화면별 중점 점검

| 화면 | 중점 항목 |
|------|----------|
| login | 로고 중앙 정렬, CTA 하단 고정, 약관 링크 터치 영역 |
| welcome | Lottie 재생/정지, 단일 카드 중앙 배치, "90초" 강조 |
| survey (7단계) | ProgressBar 스텝 동기화, 스텝별 입력 컴포넌트 정렬, 뒤로가기 스텝 복원 |
| survey-result | Skeleton 블러 티저, AI 요약 블록 간격, 광고/기록 CTA 분리 |
| dashboard | Tab 3개(+B2B 운영) 전환, DogCard 멀티독 대응, 기록 0건 EmptyState |
| quick-log | SegmentedControl 빠른/상세 전환, 칩 8개 wrap 정렬, Accordion 애니메이션 |
| analysis | BarChart 반응형, 주간/월간/전체 탭 데이터 연동, 빈 차트 상태 |
| coaching-result | 6블록 순서·간격, SpeechBubble 감정별 스타일, PRO 잠금 블러 |
| training-academy | GridList 2열 카드, ProgressBar 진도율, 빈 커리큘럼 상태 |
| training-detail | 체크리스트 체크 애니메이션, 메모 TextField 키보드, 완료 시 Badge |
| dog-profile | 프로필 이미지 Asset, Switch 토글 즉시 반영, Accordion 섹션 |
| dog-switcher | 현재 선택 Badge 표시, 추가 버튼 하단 고정, 스크롤 시 선택 유지 |
| dog-add | survey 축소 3필드 정렬, 유효성 검증 에러 메시지, CTA 비활성 상태 |
| settings | Switch 즉시 반영, 로그아웃 Dialog 확인, 버전 정보 하단 |
| subscription | 플랜 비교 TableRow 정렬, 현재 플랜 Badge, IAP 버튼 로딩 |
| notification | 체크박스 3개 정렬, Lottie 벨 애니메이션, 허용/나중에 CTA |
| ops-today | FlatList 무한스크롤, 프리셋 모달, 멤버 역할 Badge |
