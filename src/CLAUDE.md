# src/ — TaillogToss 프론트엔드 소스 루트

`tsconfig.json`의 `baseUrl: "src"` — 모든 import는 이 폴더 기준 절대경로 사용.

## 구조

```
_app.tsx              # Granite.registerApp 앱 컨테이너
router.gen.ts         # 자동 생성 (라우트 타입 선언, 수동 수정 금지)
pages/                # 실제 페이지 컴포넌트 (createRoute)
components/           # 3계층: tds-ext ← shared ← features
lib/                  # API, hooks, charts, guards, analytics, data, security
types/                # 도메인별 타입 (BE 미러)
stores/               # QueryClient, AuthContext, ActiveDogContext, OrgContext, SurveyContext
```

## 레이어 의존성 (MUST)

```
의존 방향 →

types  ←  lib  ←  components  ←  pages
              ←  stores      ←
```

| 레이어 | import 가능 | import 금지 |
|--------|------------|------------|
| `types/` | 없음 (순수 타입) | 모든 런타임 모듈 |
| `lib/` | `types/` | `components/`, `pages/`, `stores/` |
| `stores/` | `types/`, `lib/` | `components/`, `pages/` |
| `components/` | `types/`, `lib/`, `stores/` | `pages/` |
| `pages/` | 모두 가능 | — |

## 라우팅 2단계 구조

- `../pages/*.tsx` (루트) = thin re-export → `require.context`가 스캔
- `src/pages/*.tsx` = 실제 컴포넌트 (`createRoute()`)
- 새 화면 추가 시 양쪽 모두 생성 필요
