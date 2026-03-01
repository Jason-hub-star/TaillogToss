Section-ID: toss_journey-00
Auto-Enrich: false
Last-Reviewed: 2026-03-01
Primary-Sources: internal

---
name: toss_journey
description: TaillogToss 사용자 여정 — 6개 여정 플로우, 신규 6개+보강 4개 화면 와이어프레임, 상태 전환, 인게이지먼트 훅.
---

# TaillogToss 사용자 여정 와이어프레임

화면 간 전환 흐름(사용자 여정)과 신규 6개 화면 와이어프레임을 정의한다.
개별 화면의 기본 와이어프레임은 `/toss_wireframes`, TDS 컴포넌트 상세는 `/toss_apps` 참조.

## 11. 사용자 여정 와이어프레임 (User Journey Wireframes)

Section 9의 개별 화면 와이어프레임을 보완하여, **화면 간 전환 흐름(사용자 여정)**과 **누락 화면 6개**를 정의한다.

---

### 11.0 설계 원칙

1. **Hook Model**: Trigger → Action → Variable Reward → Investment (매 화면 전환에 적용)
2. **Aha Moment < 3분**: 설문 완료 → AI 분석 결과까지 138초 (Cold Start 여정 A 기준)
3. **Sticky Loop**: Quick Log 30초 → 트렌드 뱃지 갱신 (Daily Loop 여정 B 기준)
4. **Progressive Disclosure**: 무료 티저(Skeleton 블러) → 보상형 광고 1회 잠금 해제 → PRO 전환
5. **Toss Native**: TDS 전용 컴포넌트, 바텀시트 중심 UX, 키보드 입력 최소화

---

