Diagram-ID: arch-06
Owner: ops
Last-Verified: 2026-03-02
Parity-IDs: APP-001, REG-001, MSG-001
Source-of-Truth:
- .claude/automations/code-doc-align.prompt.md
- .claude/automations/docs-nightly-organizer.prompt.md
- docs/status/AUTOMATION-HEALTH.md
- docs/status/NIGHTLY-RUN-LOG.md
Update-Trigger:
- automation schedule/lock/artifact changes

# 06. Runtime, Deploy, and Observability

```mermaid
graph LR
  DEV[Dev session]
  DAILY[docs/daily/MM-DD/page-*.md]
  BOARD[PAGE-UPGRADE-BOARD.md]

  A1[code-doc-align\n03:30 KST]
  A2[docs-nightly-organizer\n22:00 KST]
  MON[automation-health-monitor\n09:30 KST]

  REP1[INTEGRITY-REPORT.md]
  REP2[NIGHTLY-RUN-LOG.md]
  REP3[AUTOMATION-HEALTH.md]
  HIST[AUTOMATION-HEALTH-HISTORY.ndjson]

  DEV --> DAILY --> A1
  A1 --> BOARD
  A1 --> REP1

  DAILY --> A2
  A2 --> REP2

  MON --> REP3
  MON --> HIST

  BOARD --> MON
  REP1 --> MON
  REP2 --> MON
```

## Operational Rule
- If automation reports stale/missing artifacts, treat documentation as stale until re-synced.
