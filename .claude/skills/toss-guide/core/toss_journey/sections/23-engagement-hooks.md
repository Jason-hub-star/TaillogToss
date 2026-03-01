Section-ID: toss_journey-23
Auto-Enrich: true
Last-Reviewed: 2026-03-01
Primary-Sources: internal

### 11.6 인게이지먼트 훅 & 전환 포인트

#### Hook Model 4단계 구현

| 단계 | 구현 | 화면 |
|------|------|------|
| **Trigger** (외부/내부) | Smart Message 푸시, 스트릭 알림, 행동 급증 알림 | notification → dashboard |
| **Action** (최소 행동) | 빠른 탭 원탭 기록 (2초), 서브옵션 포함 5초 | quick-log |
| **Variable Reward** | AI 코칭 결과 변화, 스트릭 뱃지 갱신, 트렌드 차트 변동 | dashboard, coaching-result |
| **Investment** (자산 축적) | 기록 데이터 축적, 훈련 진행률, 커스텀 프리셋 | quick-log, training-detail |

#### 보상형 광고 업셀 퍼널 (토스 Ads SDK 2.0 Rewarded)

배너/전면 광고 없음. **보상형 광고만** 사용.

| ID | 터치포인트 | 화면 | CTA 텍스트 | 보상 |
|----|-----------|------|-----------|------|
| R1 | 설문 결과 상세 리포트 | survey-result | "광고 보고 전체 분석 보기" | 상세 리포트 1회 잠금 해제 |
| R2 | 오늘의 AI 코칭 | dashboard | "광고 보고 코칭 열기" | 오늘의 코칭 1회 열기 |
| R3 | 심층 행동 분석 | coaching-result | "광고 보고 오늘의 코칭 열기" | 심층 분석 1회 열기 |

**광고 SDK**: 토스 Ads SDK 2.0 Rewarded 우선. AdMob 폴백은 토스 SDK 공식 지원 범위에서만 허용(미지원 시 무광고 폴백). 테스트 ID: `ait-ad-test-rewarded-id`
**전환 심리**: "매번 광고 보기 귀찮다 → 구독하자" → 자연스러운 PRO 전환

#### Conversion Points (7개)

| ID | 트리거 | 위치 | 전환 대상 |
|----|--------|------|----------|
| C1 | 설문 완료 후 Skeleton 노출 | survey-result | PRO 또는 광고(R1) |
| C2 | AI 코칭 잠금 | dashboard | PRO 또는 광고(R2) |
| C3 | 심층 분석 잠금 | coaching-result | PRO 또는 광고(R3) |
| C4 | PDF 리포트 탭 | coaching-result | PRO (구독 전용) |
| C5 | 훈련 커리큘럼 잠금 미션 | training-academy | PRO |
| C6 | 토큰 소진 | (어디서든) | 토큰팩 구매 또는 PRO |
| C7 | 광고 3회+ 시청 후 | (어디서든) | PRO ("광고 없이 이용하세요") |

#### Retention Mechanics (6개)

| 메커니즘 | 설명 | 화면 | 타이밍 |
|---------|------|------|--------|
| **Streak** | "🔥 N일 연속 기록 중!" 뱃지 | dashboard | 기록 저장 시 즉시 갱신 |
| **포인트** | Toss Points 연동 (프로모션 API) | dashboard | 주간 목표 달성 시 |
| **급증 알림** | "오늘 짖음이 평소의 2배!" | Smart Message → dashboard | 일일 집계 후 |
| **훈련 리마인더** | "오늘의 훈련: 산책 Day 3" | Smart Message → training-detail | 설정 시간 |
| **비활성 재참여** | "뽀삐가 기다리고 있어요" | Smart Message → dashboard | 3일 미접속 |
| **진행 축하** | "첫 번째 훈련 과정 완료!" | Toast + 뱃지 | 마일스톤 달성 |

#### 탭 네비게이션 구조

| 모드 | 탭 구성 | 활성화 조건 |
|------|--------|-----------|
| B2C (일반 사용자) | [기록] [분석] [훈련] | 기본 |
| B2B (트레이너/관리자) | [기록] [분석] [훈련] [운영] | `role IN ('trainer', 'org_owner', 'org_staff')` |

---

