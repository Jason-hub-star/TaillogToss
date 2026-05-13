# Automation Orchestration Plan

Last updated: 2026-05-13

## Default Orchestrators

| Orchestrator | Schedule | Runs | Why |
|---|---:|---|---|
| `taillog-morning-orchestrator` | daily 02:00 KST | drift guard, code-doc align, architecture sync, automation health | safe code/docs consistency checks |
| `taillog-ai-data-orchestrator` | daily 09:00 KST | synthetic coaching generation, Telegram coaching review | AI training material collection with owner review |
| `taillog-nightly-orchestrator` | daily 22:00 KST | docs nightly organizer | docs folder hygiene and weekly compaction |
| `taillog-weekly-orchestrator` | Friday 10:00 KST | training data maintenance, coaching fine-tune review | weekly quality review and readiness reporting |

## Standalone Subtasks

These prompts are not scheduled independently. They are called by orchestrators or run manually.

| Prompt | Default Mode | Owner |
|---|---|---|
| `code-doc-align.prompt.md` | morning TASK 2 | docs parity |
| `architecture-diagrams-sync.prompt.md` | morning TASK 3 | architecture docs |
| `automation-health-monitor.prompt.md` | morning TASK 4 | automation health |
| `daily-coaching-synthetic-gen.md` | AI data TASK 1 | synthetic AI coaching |
| `coaching-review-telegram-daily.md` | AI data TASK 2 | Telegram review loop |
| `docs-nightly-organizer.prompt.md` | nightly TASK 1 | docs hygiene |
| `training-data-maintenance.prompt.md` | weekly TASK 1 | curriculum quality report |
| `weekly-coaching-finetune-review.md` | weekly TASK 2 | fine-tuning readiness |

## Manual Only

| Prompt | Why Manual |
|---|---|
| `skills-web-enrichment-7day.prompt.md` | can alter training data publishing artifacts; run `DRY_RUN=true` first and only execute after owner approval |

## Removed From Default Runs

| Removed Task | Previous Location | Reason |
|---|---|---|
| `skills-web-enrichment-7day` | morning TASK 4 | too broad for daily unattended execution |
| `vision-labeling` | nightly TASK 1 | DB schema/storage/permission assumptions need separate design and dry-run proof |

## Safety Rules

- Do not schedule every prompt independently; schedule orchestrators only.
- AI data collection must not modify app curriculum automatically.
- Telegram review approval exports candidate JSON only.
- Rejected Telegram items become improvement feedback only when a `반려 코멘트:` message is linked.
- If multiple callbacks arrive for the same review item, process only the latest Telegram `update_id`.
