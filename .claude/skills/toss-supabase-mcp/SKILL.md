---
name: toss-supabase-mcp
description: TaillogToss Supabase MCP 운영 스킬 — 마이그레이션, Edge 배포, 로그/키 점검, 안전한 실행 순서 표준화.
---

# Toss Supabase MCP Ops

Supabase MCP 작업을 안전한 순서로 수행하고, 변경 영향과 증적을 남기는 운영 스킬.

## 언제 사용하나
- 마이그레이션 적용/점검
- Edge Function 배포/호출 검증
- 프로젝트 키/URL/함수 상태 점검
- DB 브랜치 생성/병합 작업

## 기본 원칙
- DDL은 `apply_migration` 사용 (임의 SQL로 DDL 실행 지양)
- 프로덕션 영향 작업 전 상태 스냅샷 확보
- 배포 후에는 반드시 `호출 검증 + 로그 확인` 수행

## 표준 절차
1. Preflight
- `get_project_url`
- `get_publishable_keys`
- `list_edge_functions` 또는 `list_migrations`

2. 변경 수행
- DB: `apply_migration`
- Edge: `deploy_edge_function` (`verify_jwt` 정책 명시)

3. 사후 검증
- 함수: HTTP 스모크 호출(메서드/인증 정책 확인)
- 로그: `get_logs(service=\"edge-function\")`
- DB: 필요한 경우 테이블/정책 확인 SQL

4. 문서 동기화
- 변경 버전, 시간(KST), 증적(request id/status) 기록

## 자주 쓰는 점검 항목
- `verify_jwt`가 함수 용도와 일치하는가
- 공유 모듈 import 누락으로 bundling 실패하지 않는가
- 공개 함수(`verify_jwt=false`)는 최소 범위로 제한되었는가
- Edge 로그의 최신 버전이 기대 버전과 일치하는가

## 실패 대응
- 배포 실패: 누락 파일 추가 후 재배포
- 호출 실패: 인증 헤더/메서드/payload 스키마 확인
- 문서 불일치: `CLAUDE.md`를 단일 기준으로 재정렬
