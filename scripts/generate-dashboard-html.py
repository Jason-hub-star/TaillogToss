#!/usr/bin/env python3
"""
TaillogToss Dashboard Generator
마크다운 문서 → dashboard-data.json + project-structure.json + index.html
"""

import re
import json
import subprocess
import argparse
from pathlib import Path
from datetime import datetime, date

# ─── 참조 딕셔너리 ────────────────────────────────────────────────────────────

PARITY_LABELS: dict[str, dict] = {
    "AUTH-001":         {"label": "인증",         "description": "Toss 로그인 + 세션 브릿지 + 가드"},
    "APP-001":          {"label": "앱셸",          "description": "23개 라우트 + 레이아웃 + 딥링크"},
    "UI-001":           {"label": "디자인",        "description": "TDS 컴포넌트 + 디자인 토큰 + 화면"},
    "LOG-001":          {"label": "행동기록",       "description": "ABC 로그 + 빠른기록 + 분석"},
    "AI-001":           {"label": "AI코칭",        "description": "코칭 6블록 + 피드백 + BE"},
    "IAP-001":          {"label": "인앱결제",       "description": "구독 + verify-iap + grant"},
    "MSG-001":          {"label": "알림",          "description": "Smart Message + 쿨다운 + noti_history"},
    "AD-001":           {"label": "광고",          "description": "Ads SDK 2.0 + R/B/I 슬롯"},
    "B2B-001":          {"label": "기관용",         "description": "B2B 운영 + 강아지 관리 + 리포트"},
    "B2B-002":          {"label": "기관설정",       "description": "센터정보 + 멤버관리 + 플랜"},
    "REG-001":          {"label": "등록",          "description": "법무 + 배포 + 약관"},
    "PRO-INTAKE-001":   {"label": "PRO유입",        "description": "PRO 구독 퍼널 + 상담지"},
    "UIUX-001":         {"label": "대시보드UX",     "description": "대시보드 empty-state + skeleton 안정화"},
    "UIUX-002":         {"label": "아카데미UX",     "description": "training academy AI 생성 느낌 UX 재설계"},
    "UIUX-003":         {"label": "커리큘럼",       "description": "curriculum 가시성 + 네비게이션 편의성"},
    "UIUX-004":         {"label": "온보딩",         "description": "survey parity with web baseline"},
    "UIUX-005":         {"label": "결과상세",       "description": "coaching result + training detail 완성도"},
    "UIUX-006":         {"label": "강아지프로필",    "description": "dog profile 실데이터 + dog switcher UX"},
    "AI-COACHING-ANALYTICS-001": {"label": "코칭분석", "description": "코칭 analytics 트래킹"},
    "UI-TRAINING-PERSONALIZATION-001": {"label": "개인화UX", "description": "훈련 개인화 UI"},
    "UI-TRAINING-DETAIL-001": {"label": "훈련상세UX", "description": "훈련 상세 화면 UI"},
    "MEMO-001":         {"label": "메모",          "description": "훈련 메모 기능"},
}

PRIORITY_DESCRIPTIONS: dict[str, str] = {
    "UIUX-001": "대시보드 분석/훈련 empty-state 및 skeleton 안정화",
    "UIUX-002": "training academy AI 생성 느낌 UX 재설계",
    "UIUX-003": "curriculum 가시성 및 네비게이션 편의성",
    "UIUX-004": "onboarding survey parity with web baseline",
    "UIUX-005": "coaching result and training detail completeness",
    "UIUX-006": "dog profile 실데이터 복원 + dog switcher UX",
}

STATUS_LABELS_KR: dict[str, str] = {
    "Done":        "✅ 완료",
    "QA":          "🔍 검토중",
    "In Progress": "🔄 진행중",
    "InProgress":  "🔄 진행중",
    "Hold":        "⏸ 대기",
    "Ready":       "📋 준비",
}

STATUS_LABELS_KANBAN: dict[str, str] = {
    "Done":        "✅ 완료",
    "QA":          "🔍 검토중",
    "In Progress": "🔄 진행중",
    "InProgress":  "🔄 진행중",
    "Hold":        "⏸ 대기",
    "Ready":       "📋 준비",
}

PRIORITY_LABELS_KR: dict[str, str] = {
    "P0": "🔴 긴급",
    "P1": "🟠 높음",
    "P2": "🔵 보통",
}

AUTO_LABELS_KR: dict[str, str] = {
    "READY":       "✅ 정상운영",
    "SUBTASK":     "📎 서브태스크",
    "MANUAL_ONLY": "🖱 수동전용",
    "STALE":       "⚠️ 점검필요",
    "STUCK":       "🔒 중단",
    "MISSING":     "❌ 미등록",
    "RUNNING":     "🔄 실행중",
}

CURRENT_PRIORITY_IDS = ["UIUX-001", "UIUX-002", "UIUX-003", "UIUX-004", "UIUX-005", "UIUX-006"]

# ─── 유틸 ────────────────────────────────────────────────────────────────────

def relative_time(date_str: str) -> str:
    """'2026-05-14' → '5일 전'"""
    if not date_str:
        return ""
    try:
        target = datetime.strptime(date_str, "%Y-%m-%d").date()
        today = date.today()
        delta = (today - target).days
        if delta < 0:
            return f"{abs(delta)}일 후"
        elif delta == 0:
            return "오늘"
        elif delta == 1:
            return "어제"
        elif delta < 7:
            return f"{delta}일 전"
        elif delta < 30:
            return f"{delta // 7}주 전"
        else:
            return f"{delta // 30}개월 전"
    except Exception:
        return date_str


def parity_label(pid: str) -> str:
    return PARITY_LABELS.get(pid, {}).get("label", pid)


# ─── Markdown parsers ────────────────────────────────────────────────────────

def parse_md_table(text: str) -> list[dict]:
    lines = [l.strip() for l in text.splitlines()]
    table_lines = [l for l in lines if l.startswith("|")]
    if len(table_lines) < 3:
        return []
    headers = [h.strip() for h in table_lines[0].split("|")[1:-1]]
    rows = []
    for line in table_lines[2:]:
        cols = [c.strip() for c in line.split("|")[1:-1]]
        if len(cols) == len(headers):
            rows.append(dict(zip(headers, cols)))
    return rows


def parse_checklist_from_notes(notes_raw: str) -> dict:
    """마크다운 [x]/[ ] 체크박스 → 구조화된 checklist"""
    completed = re.findall(r'\[x\]\s*([^`\[\]\n]+?)(?=`|\[|$)', notes_raw)
    remaining = re.findall(r'\[\s\]\s*([^`\[\]\n]+?)(?=`|\[|$)', notes_raw)
    completed = [c.strip() for c in completed if c.strip()]
    remaining = [r.strip() for r in remaining if r.strip()]
    total = len(completed) + len(remaining)
    done_count = len(completed)
    return {
        "completed": completed,
        "remaining": remaining,
        "total": total,
        "done_count": done_count,
        "completion_pct": round(done_count * 100 / total) if total > 0 else 0,
    }


def parse_page_upgrade_board(path: Path) -> list[dict]:
    text = path.read_text(encoding="utf-8")
    rows = parse_md_table(text)
    pages = []
    for r in rows:
        parity_ids = [p.strip() for p in r.get("parity_ids", "").split(",") if p.strip() and p.strip() != "—"]
        support_skills = [s.strip().strip("`") for s in r.get("support_skills", "").split(",") if s.strip() and s.strip() != "—"]
        pages.append({
            "route": r.get("route", "").strip("`"),
            "label": r.get("label", ""),
            "group": r.get("group", ""),
            "priority": r.get("priority", ""),
            "status": r.get("status", ""),
            "owner": r.get("owner", ""),
            "parity_ids": parity_ids,
            "parity_labels": [{"id": pid, "label": parity_label(pid)} for pid in parity_ids],
            "page_skill": r.get("page_skill", "").strip("`").replace("—", ""),
            "support_skills": support_skills,
            "last_updated": r.get("last_updated", ""),
        })
    return pages


def parse_automation_health(path: Path) -> list[dict]:
    text = path.read_text(encoding="utf-8")
    rows = parse_md_table(text)
    status_map = {
        "✅ READY": "READY", "✅ SUBTASK": "SUBTASK",
        "⚠️ MANUAL_ONLY": "MANUAL_ONLY", "⚠️ STALE": "STALE",
        "❌ MISSING": "MISSING", "🔒 STUCK": "STUCK", "🔄 RUNNING": "RUNNING",
    }
    automations = []
    for r in rows:
        raw_status = r.get("상태", r.get("status", ""))
        normalized = status_map.get(raw_status, raw_status)
        automations.append({
            "name": r.get("자동화", r.get("name", "")),
            "schedule": r.get("스케줄", r.get("schedule", "")),
            "status": normalized,
            "status_label": AUTO_LABELS_KR.get(normalized, normalized),
            "lock": r.get("Lock", ""),
            "last_run": r.get("최신 실행", r.get("last_run", "")),
            "memo": r.get("메모", r.get("memo", "")),
        })
    return [a for a in automations if a["name"]]


def parse_progress_checklist(path: Path) -> dict:
    text = path.read_text(encoding="utf-8")
    completion_match = re.search(r"종합 완성도.*?\*\*(\d+)%\*\*", text)
    completion = int(completion_match.group(1)) if completion_match else 0
    blockers = []
    in_blockers = False
    for line in text.splitlines():
        if "크리티컬 블로커" in line:
            in_blockers = True
        elif line.startswith("## ") and in_blockers:
            break
        if in_blockers:
            m = re.match(r"\s*- \[ \]\s+(.+)", line)
            if m:
                item = re.sub(r"[🔴🟠🟡✅]", "", m.group(1)).strip()
                item = re.sub(r"\*\*(.+?)\*\*", r"\1", item)
                item = item.split("—")[0].strip()
                blockers.append(item)
    return {"completion": completion, "active_blockers": blockers}


def parse_feature_parity(path: Path) -> list[dict]:
    if not path.exists():
        return []
    text = path.read_text(encoding="utf-8")
    rows = parse_md_table(text)
    features = []
    for r in rows:
        pid = r.get("Parity ID", r.get("parity_id", r.get("id", "")))
        notes_raw = r.get("Notes", r.get("notes", ""))
        info = PARITY_LABELS.get(pid, {"label": pid, "description": ""})
        checklist = parse_checklist_from_notes(notes_raw)
        features.append({
            "id": pid,
            "label": info["label"],
            "description": info["description"],
            "domain": r.get("Domain", r.get("domain", "")),
            "status": r.get("Status", r.get("status", "")),
            "test_scope": r.get("Test Scope", r.get("test_scope", "")),
            "risk": r.get("Risk", r.get("risk", "")),
            "checklist": checklist,
            "notes_raw": notes_raw,
        })
    return [f for f in features if f["id"]]


def get_git_last_modified(git_root: Path, file_path: Path) -> str:
    try:
        rel = file_path.relative_to(git_root)
        result = subprocess.run(
            ["git", "log", "-1", "--format=%cs", "--", str(rel)],
            cwd=str(git_root), capture_output=True, text=True, timeout=5
        )
        return result.stdout.strip() or ""
    except Exception:
        return ""


# ─── JSON generation ──────────────────────────────────────────────────────────

def build_dashboard_data(docs_root: Path, git_root: Path) -> dict:
    pages = parse_page_upgrade_board(docs_root / "status" / "PAGE-UPGRADE-BOARD.md")
    automations = parse_automation_health(docs_root / "status" / "AUTOMATION-HEALTH.md")
    progress = parse_progress_checklist(docs_root / "status" / "PROGRESS-CHECKLIST.md")
    features = parse_feature_parity(docs_root / "status" / "11-FEATURE-PARITY-MATRIX.md")
    status_counts: dict[str, int] = {}
    for p in pages:
        s = p["status"]
        status_counts[s] = status_counts.get(s, 0) + 1
    return {
        "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "summary": {
            "completion": progress["completion"],
            "total_routes": len(pages),
            "status_counts": status_counts,
            "active_blockers": progress["active_blockers"],
        },
        "pages": pages,
        "features": features,
        "automations": automations,
    }


def build_project_structure(data: dict) -> dict:
    qa_pages = [p["route"] for p in data["pages"] if p["status"] == "QA"]
    done_pages = [p["route"] for p in data["pages"] if p["status"] == "Done"]

    # 양방향 cross-reference
    parity_to_pages: dict[str, list[str]] = {}
    pages_to_parity: dict[str, list[dict]] = {}
    for p in data["pages"]:
        route = p["route"]
        for pid in p["parity_ids"]:
            parity_to_pages.setdefault(pid, []).append(route)
            info = PARITY_LABELS.get(pid, {"label": pid, "description": ""})
            pages_to_parity.setdefault(route, []).append({
                "id": pid, "label": info["label"], "description": info["description"],
            })

    # current_priority 상세화
    current_priorities = [
        {
            "rank": i + 1,
            "id": pid,
            "label": PARITY_LABELS.get(pid, {}).get("label", pid),
            "goal": PRIORITY_DESCRIPTIONS.get(pid, ""),
        }
        for i, pid in enumerate(CURRENT_PRIORITY_IDS)
    ]

    return {
        "project": "TaillogToss",
        "description": "DogCoach Next.js PWA → Toss mini-app (React Native) migration",
        "last_update": data["generated_at"],
        "session_context": {
            "current_date": datetime.now().strftime("%Y-%m-%d"),
            "completion": f"{data['summary']['completion']}%",
            "active_blockers": data["summary"]["active_blockers"],
            "current_priorities": current_priorities,
            "qa_pages": qa_pages,
            "done_pages": done_pages,
        },
        "architecture": {
            "frontend": "React Native (@granite-js/react-native) + TDS RN 2.0.2",
            "backend": "FastAPI (Railway) + Supabase Edge Functions",
            "auth": "Toss Login → login-with-toss → Supabase Auth bridge",
            "payments": "Toss IAP (verify-iap-order)",
            "ads": "Toss Ads SDK 2.0",
            "state": "React + TanStack Query",
            "design_tokens": "src/styles/tokens.ts",
        },
        "status_summary": data["summary"]["status_counts"],
        "pages": [
            {
                "route": p["route"],
                "label": p["label"],
                "group": p["group"],
                "status": p["status"],
                "priority": p["priority"],
                "parity_ids": p["parity_ids"],
                "parity_labels": p["parity_labels"],
            }
            for p in data["pages"]
        ],
        "features": [
            {
                "id": f["id"],
                "label": f["label"],
                "description": f["description"],
                "domain": f["domain"],
                "status": f["status"],
                "risk": f["risk"],
                "checklist_summary": {
                    "done": f["checklist"]["done_count"],
                    "total": f["checklist"]["total"],
                    "pct": f["checklist"]["completion_pct"],
                    "remaining": f["checklist"]["remaining"],
                },
            }
            for f in data["features"]
        ],
        "cross_references": {
            "parity_to_pages": parity_to_pages,
            "pages_to_parity": pages_to_parity,
        },
        "automations": {
            a["name"]: {
                "schedule": a["schedule"],
                "status": a["status"],
                "status_label": a["status_label"],
                "last_run": a["last_run"],
            }
            for a in data["automations"]
        },
        "source_of_truth": {
            "page_board": "docs/status/PAGE-UPGRADE-BOARD.md",
            "feature_parity": "docs/status/11-FEATURE-PARITY-MATRIX.md",
            "progress": "docs/status/PROGRESS-CHECKLIST.md",
            "automation_health": "docs/status/AUTOMATION-HEALTH.md",
            "project_status": "docs/status/PROJECT-STATUS.md",
        },
    }


# ─── HTML generation ──────────────────────────────────────────────────────────

def build_html(data: dict) -> str:
    summary = data["summary"]
    pages = data["pages"]
    features = data["features"]
    automations = data["automations"]

    STATUS_COLOR = {
        "Done": "#4CAF50", "QA": "#FF9800",
        "In Progress": "#2196F3", "InProgress": "#2196F3",
        "Hold": "#9E9E9E", "Ready": "#BDBDBD",
    }
    RISK_COLOR = {"High": "#f44336", "Medium": "#FF9800", "Low": "#4CAF50"}
    PRIORITY_COLOR = {"P0": "#f44336", "P1": "#FF9800", "P2": "#2196F3"}
    AUTO_COLOR = {
        "READY": "#4CAF50", "SUBTASK": "#66BB6A",
        "MANUAL_ONLY": "#FF9800", "STALE": "#FF9800",
        "STUCK": "#f44336", "MISSING": "#f44336", "RUNNING": "#2196F3",
    }

    # ── 배지 헬퍼 ──
    def status_badge(status: str) -> str:
        kr = STATUS_LABELS_KR.get(status, status)
        color = STATUS_COLOR.get(status, "#9E9E9E")
        return f'<span class="badge" style="background:{color}" title="{status}">{kr}</span>'

    def priority_badge(priority: str) -> str:
        kr = PRIORITY_LABELS_KR.get(priority, priority)
        color = PRIORITY_COLOR.get(priority, "#9E9E9E")
        return f'<span class="badge" style="background:{color}" title="{priority}">{kr}</span>'

    def parity_tag_html(pid: str) -> str:
        info = PARITY_LABELS.get(pid, {"label": pid, "description": ""})
        desc = info["description"]
        lbl = info["label"]
        return f'<span class="parity-tag" title="{pid}: {desc}">{pid}<small>{lbl}</small></span>'

    def checklist_bar(checklist: dict) -> str:
        total = checklist.get("total", 0)
        if total == 0:
            return '<span class="notes-empty">체크리스트 없음</span>'
        done = checklist["done_count"]
        pct = checklist["completion_pct"]
        remaining = checklist.get("remaining", [])
        remaining_html = ""
        if remaining:
            items = "".join(f"<li>{r}</li>" for r in remaining[:3])
            more = f"<li>외 {len(remaining)-3}개...</li>" if len(remaining) > 3 else ""
            remaining_html = f'<ul class="remaining-list">{items}{more}</ul>'
        return (
            f'<div class="checklist-wrap">'
            f'<div class="prog-bar"><div class="prog-fill" style="width:{pct}%"></div></div>'
            f'<div class="prog-text">{done}/{total} 완료 ({pct}%)</div>'
            f'{remaining_html}'
            f'</div>'
        )

    # ── 칸반 ──
    groups: dict[str, list] = {}
    for p in pages:
        groups.setdefault(p["status"], []).append(p)

    def kanban_col(status: str) -> str:
        color = STATUS_COLOR.get(status, "#9E9E9E")
        label = STATUS_LABELS_KANBAN.get(status, status)
        items = groups.get(status, [])
        cards = ""
        for p in items:
            tags = "".join(parity_tag_html(pid) for pid in p["parity_ids"])
            rel = relative_time(p["last_updated"])
            is_p0 = p["priority"] == "P0"
            cards += (
                f'<div class="card {"p0-card" if is_p0 else ""}" data-group="{p["group"]}" data-route="{p["route"]}">'
                f'  <div class="card-route">{p["route"]}</div>'
                f'  <div class="card-label">{p["label"]}</div>'
                f'  <div class="card-meta">{priority_badge(p["priority"])}'
                f'    <span class="card-owner">{p["owner"]}</span></div>'
                f'  <div class="parity-tags">{tags}</div>'
                f'  <div class="card-date" title="{p["last_updated"]}">{rel}</div>'
                f'</div>'
            )
        empty = '<div class="empty-col">해당 없음</div>' if not items else ""
        return (
            f'<div class="kanban-col">'
            f'  <div class="kanban-header" style="border-top:3px solid {color}">'
            f'    {label} <span class="col-count">{len(items)}</span></div>'
            f'  {cards}{empty}'
            f'</div>'
        )

    kanban_html = "".join(kanban_col(s) for s in ["Done", "QA", "In Progress", "Ready", "Hold"])

    # ── Feature Parity 테이블 ──
    feature_rows = ""
    for f in features:
        risk_color = RISK_COLOR.get(f.get("risk", ""), "#9E9E9E")
        status_color = STATUS_COLOR.get(f.get("status", ""), "#9E9E9E")
        cl = f.get("checklist", {})
        feature_rows += (
            f'<tr>'
            f'  <td><strong>{f.get("id","")}</strong><br>'
            f'      <small class="feat-label">{f.get("label","")}</small>'
            f'      <div class="feat-desc">{f.get("description","")}</div></td>'
            f'  <td><small>{f.get("domain","")}</small></td>'
            f'  <td>{status_badge(f.get("status",""))}</td>'
            f'  <td><span class="badge" style="background:{risk_color}">{f.get("risk","")}</span></td>'
            f'  <td class="notes-cell">{checklist_bar(cl)}</td>'
            f'</tr>'
        )

    # ── Automations 테이블 ──
    auto_rows = ""
    for a in automations:
        color = AUTO_COLOR.get(a.get("status", ""), "#9E9E9E")
        kr_status = AUTO_LABELS_KR.get(a.get("status", ""), a.get("status", ""))
        auto_rows += (
            f'<tr>'
            f'  <td><strong>{a.get("name","")}</strong></td>'
            f'  <td><small>{a.get("schedule","")}</small></td>'
            f'  <td><span class="badge" style="background:{color}" title="{a.get("status","")}">{kr_status}</span></td>'
            f'  <td><small>{a.get("last_run","")}</small></td>'
            f'  <td class="memo-cell"><small>{a.get("memo","")}</small></td>'
            f'</tr>'
        )

    # ── 블로커 ──
    blockers_html = "".join(
        f'<li class="blocker-item">{b}</li>'
        for b in summary.get("active_blockers", [])
    )

    # ── 상태 바 ──
    total = summary["total_routes"]
    status_bars = ""
    for status, count in summary["status_counts"].items():
        color = STATUS_COLOR.get(status, "#9E9E9E")
        kr = STATUS_LABELS_KR.get(status, status)
        pct = round(count / total * 100) if total else 0
        status_bars += (
            f'<div class="stat-row">'
            f'  <span class="stat-label">{kr}</span>'
            f'  <div class="stat-bar-bg"><div class="stat-bar-fill" style="width:{pct}%;background:{color}"></div></div>'
            f'  <span class="stat-count">{count}</span>'
            f'</div>'
        )

    completion = summary["completion"]
    generated_at = data["generated_at"]

    return f"""<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>TaillogToss 현황판</title>
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans KR', sans-serif;
         background: #0f0f14; color: #e0e0e0; font-size: 14px; line-height: 1.5; }}

  /* ── 헤더 ── */
  .header {{ background: #1a1a2e; padding: 20px 32px; border-bottom: 1px solid #2a2a3e;
             display: flex; align-items: center; gap: 24px; flex-wrap: wrap; }}
  .header-title {{ font-size: 20px; font-weight: 700; color: #fff; }}
  .header-sub {{ color: #888; font-size: 12px; margin-top: 2px; }}
  .completion-ring {{ display: flex; align-items: center; gap: 12px; margin-left: auto; }}
  .completion-pct {{ font-size: 36px; font-weight: 800; color: #4CAF50; line-height: 1; }}
  .completion-label {{ font-size: 12px; color: #888; margin-top: 2px; }}
  .generated {{ font-size: 11px; color: #555; }}

  /* ── 탭 ── */
  .tabs {{ display: flex; background: #13131e; border-bottom: 1px solid #2a2a3e; padding: 0 32px; }}
  .tab {{ padding: 14px 20px; cursor: pointer; font-size: 13px; color: #888;
          border-bottom: 2px solid transparent; transition: all .2s; user-select: none; }}
  .tab:hover {{ color: #ccc; }}
  .tab.active {{ color: #fff; border-bottom-color: #5c6bc0; }}

  /* ── 콘텐츠 ── */
  .content {{ padding: 24px 32px; }}
  .panel {{ display: none; }}
  .panel.active {{ display: block; }}

  /* ── 요약 카드 ── */
  .summary-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(200px,1fr));
                   gap: 16px; margin-bottom: 24px; }}
  .summary-card {{ background: #1a1a2e; border-radius: 10px; padding: 18px; border: 1px solid #2a2a3e; }}
  .summary-card h4 {{ font-size: 11px; color: #888; letter-spacing: .06em; margin-bottom: 12px; }}
  .stat-row {{ display: flex; align-items: center; gap: 8px; margin-bottom: 7px; }}
  .stat-label {{ min-width: 80px; font-size: 12px; color: #bbb; }}
  .stat-bar-bg {{ flex: 1; height: 6px; background: #2a2a3e; border-radius: 3px; overflow: hidden; }}
  .stat-bar-fill {{ height: 100%; border-radius: 3px; }}
  .stat-count {{ font-size: 12px; color: #ccc; min-width: 22px; text-align: right; }}
  .big-num {{ font-size: 40px; font-weight: 800; color: #fff; line-height: 1; }}
  .big-sub {{ font-size: 12px; color: #888; margin-top: 6px; }}

  /* ── 블로커 ── */
  .blockers {{ background: #1f1215; border-radius: 10px; padding: 18px;
               border: 1px solid #3a2020; margin-bottom: 24px; }}
  .blockers h4 {{ font-size: 12px; color: #f44336; letter-spacing: .06em; margin-bottom: 10px; }}
  .blocker-item {{ padding: 7px 0; font-size: 13px; color: #ddd;
                   border-bottom: 1px solid #2a1a1a; list-style: none; }}
  .blocker-item::before {{ content: "⚠ "; color: #FF9800; }}
  .blocker-item:last-child {{ border-bottom: none; }}

  /* ── 필터 ── */
  .filters {{ display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; }}
  .filter-btn {{ padding: 6px 14px; border-radius: 20px; border: 1px solid #2a2a3e;
                 background: #1a1a2e; color: #888; cursor: pointer; font-size: 12px;
                 transition: all .15s; }}
  .filter-btn:hover {{ color: #ccc; border-color: #5c6bc0; }}
  .filter-btn.active {{ background: #5c6bc0; color: #fff; border-color: #5c6bc0; }}

  /* ── 칸반 ── */
  .kanban {{ display: flex; gap: 14px; overflow-x: auto; padding-bottom: 16px; align-items: flex-start; }}
  .kanban-col {{ min-width: 230px; flex: 1; }}
  .kanban-header {{ background: #1a1a2e; border-radius: 8px 8px 0 0; padding: 10px 14px;
                    font-size: 12px; font-weight: 700; color: #bbb;
                    display: flex; justify-content: space-between; align-items: center; }}
  .col-count {{ background: #2a2a3e; border-radius: 10px; padding: 1px 8px; font-size: 11px; }}
  .card {{ background: #1a1a2e; border: 1px solid #2a2a3e; border-radius: 0 0 6px 6px;
           padding: 12px; margin-bottom: 8px; transition: border-color .15s; }}
  .card:hover {{ border-color: #5c6bc0; }}
  .p0-card {{ border-left: 3px solid #f44336; }}
  .card-route {{ font-family: monospace; font-size: 10px; color: #666; margin-bottom: 4px; }}
  .card-label {{ font-size: 13px; font-weight: 600; color: #e8e8e8; margin-bottom: 8px; }}
  .card-meta {{ display: flex; align-items: center; gap: 6px; margin-bottom: 6px; flex-wrap: wrap; }}
  .card-owner {{ font-size: 11px; color: #666; }}
  .card-date {{ font-size: 10px; color: #555; margin-top: 4px; }}
  .parity-tags {{ display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }}
  .parity-tag {{ background: #22223a; color: #9c9ccc; border-radius: 5px; padding: 3px 7px;
                 font-size: 9px; font-family: monospace; cursor: default;
                 display: inline-flex; flex-direction: column; gap: 1px; }}
  .parity-tag small {{ font-size: 8px; color: #7777aa; font-family: sans-serif; }}
  .empty-col {{ padding: 24px 8px; text-align: center; color: #444; font-size: 12px; }}

  /* ── 배지 ── */
  .badge {{ display: inline-block; padding: 2px 9px; border-radius: 4px;
            font-size: 11px; font-weight: 600; color: #fff; white-space: nowrap; }}

  /* ── 테이블 ── */
  .table-wrap {{ background: #16161f; border-radius: 10px; overflow: hidden; border: 1px solid #2a2a3e; }}
  .data-table {{ width: 100%; border-collapse: collapse; }}
  .data-table th {{ background: #13131e; color: #888; font-size: 11px; letter-spacing: .05em;
                    padding: 11px 14px; text-align: left; border-bottom: 1px solid #2a2a3e; }}
  .data-table td {{ padding: 11px 14px; border-bottom: 1px solid #1e1e30;
                    font-size: 13px; vertical-align: top; }}
  .data-table tr:last-child td {{ border-bottom: none; }}
  .data-table tr:hover td {{ background: #1a1a2e; }}
  .feat-label {{ color: #9c9ccc; font-size: 11px; display: block; margin-top: 2px; }}
  .feat-desc {{ color: #666; font-size: 10px; margin-top: 3px; }}
  .notes-cell {{ min-width: 180px; }}
  .memo-cell {{ color: #777; max-width: 220px; }}

  /* ── 진행률 바 (체크리스트) ── */
  .checklist-wrap {{ }}
  .prog-bar {{ height: 5px; background: #2a2a3e; border-radius: 3px; overflow: hidden; margin-bottom: 4px; }}
  .prog-fill {{ height: 100%; background: #4CAF50; border-radius: 3px; }}
  .prog-text {{ font-size: 11px; color: #888; margin-bottom: 6px; }}
  .remaining-list {{ padding-left: 14px; }}
  .remaining-list li {{ font-size: 10px; color: #666; margin-bottom: 2px; line-height: 1.4; }}
  .notes-empty {{ font-size: 11px; color: #555; }}

  /* ── 반응형 ── */
  @media (max-width: 640px) {{
    .header {{ padding: 16px; }}
    .completion-ring {{ margin-left: 0; width: 100%; }}
    .content {{ padding: 14px; }}
    .kanban {{ flex-direction: column; }}
    .kanban-col {{ min-width: unset; }}
    .tabs {{ padding: 0 16px; }}
    .tab {{ padding: 12px 14px; font-size: 12px; }}
  }}
</style>
</head>
<body>

<div class="header">
  <div>
    <div class="header-title">🐾 TaillogToss 현황판</div>
    <div class="header-sub">DogCoach PWA → 토스 미니앱 전환 프로젝트</div>
  </div>
  <div class="completion-ring">
    <div>
      <div class="completion-pct">{completion}%</div>
      <div class="completion-label">전체 완성도</div>
    </div>
    <div class="generated">생성: {generated_at}</div>
  </div>
</div>

<div class="tabs">
  <div class="tab active" onclick="showTab('board', this)">📄 페이지 현황</div>
  <div class="tab" onclick="showTab('features', this)">✨ 기능 완성도</div>
  <div class="tab" onclick="showTab('automations', this)">⚙️ 자동화</div>
</div>

<div class="content">

  <!-- ── 페이지 현황 탭 ── -->
  <div id="panel-board" class="panel active">

    <div class="summary-grid">
      <div class="summary-card">
        <h4>📊 페이지 완성도</h4>
        {status_bars}
      </div>
      <div class="summary-card">
        <h4>📍 추적 페이지</h4>
        <div class="big-num">{total}</div>
        <div class="big-sub">개 페이지 관리중</div>
      </div>
    </div>

    {'<div class="blockers"><h4>🚨 현재 출시 차단 항목</h4><ul>' + blockers_html + '</ul></div>' if blockers_html else ''}

    <div class="filters" id="group-filters">
      <button class="filter-btn active" onclick="filterGroup('all',this)">전체</button>
      <button class="filter-btn" onclick="filterGroup('Onboarding',this)">온보딩</button>
      <button class="filter-btn" onclick="filterGroup('Main',this)">메인</button>
      <button class="filter-btn" onclick="filterGroup('Training',this)">훈련</button>
      <button class="filter-btn" onclick="filterGroup('Dog',this)">강아지</button>
      <button class="filter-btn" onclick="filterGroup('Settings',this)">설정</button>
      <button class="filter-btn" onclick="filterGroup('B2B',this)">B2B (기관용)</button>
    </div>

    <div class="kanban" id="kanban-board">
      {kanban_html}
    </div>
  </div>

  <!-- ── 기능 완성도 탭 ── -->
  <div id="panel-features" class="panel">
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>기능 코드</th><th>분류</th><th>상태</th><th>위험도</th><th>진행 상황</th>
          </tr>
        </thead>
        <tbody>
          {feature_rows or '<tr><td colspan="5" style="text-align:center;color:#555;padding:40px">기능 데이터를 불러올 수 없습니다</td></tr>'}
        </tbody>
      </table>
    </div>
  </div>

  <!-- ── 자동화 탭 ── -->
  <div id="panel-automations" class="panel">
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>자동화 이름</th><th>실행 일정</th><th>상태</th><th>최근 실행</th><th>메모</th>
          </tr>
        </thead>
        <tbody>
          {auto_rows or '<tr><td colspan="5" style="text-align:center;color:#555;padding:40px">자동화 데이터가 없습니다</td></tr>'}
        </tbody>
      </table>
    </div>
  </div>

</div>

<script>
function showTab(tab, el) {{
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById('panel-' + tab).classList.add('active');
  el.classList.add('active');
}}

function filterGroup(group, btn) {{
  document.querySelectorAll('#group-filters .filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const groupMap = {{
    'Onboarding': ['Onboarding'],
    'Main': ['Main'],
    'Training': ['Training'],
    'Dog': ['Dog'],
    'Settings': ['Settings'],
    'B2B': ['B2B'],
  }};
  document.querySelectorAll('.card').forEach(card => {{
    if (group === 'all') {{ card.style.display = ''; return; }}
    const g = card.dataset.group || '';
    card.style.display = (groupMap[group] || []).includes(g) ? '' : 'none';
  }});
}}
</script>

</body>
</html>"""


# ─── Main ────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Generate TaillogToss HTML dashboard")
    parser.add_argument("--docs-root", default="./docs")
    parser.add_argument("--output-dir", default="./docs/html")
    parser.add_argument("--git-root", default=".")
    args = parser.parse_args()

    docs_root = Path(args.docs_root).resolve()
    output_dir = Path(args.output_dir).resolve()
    git_root = Path(args.git_root).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"📂 Docs: {docs_root}  →  📤 Out: {output_dir}")

    data = build_dashboard_data(docs_root, git_root)

    dashboard_json = output_dir / "dashboard-data.json"
    dashboard_json.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"✅ dashboard-data.json ({dashboard_json.stat().st_size // 1024}KB)")

    ps = build_project_structure(data)
    ps_json = output_dir / "project-structure.json"
    ps_json.write_text(json.dumps(ps, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"✅ project-structure.json ({ps_json.stat().st_size // 1024}KB)")

    html = build_html(data)
    html_file = output_dir / "index.html"
    html_file.write_text(html, encoding="utf-8")
    print(f"✅ index.html ({html_file.stat().st_size // 1024}KB)")

    f0 = data["features"][0] if data["features"] else {}
    cl = f0.get("checklist", {})
    print(f"\n🎯 {data['summary']['completion']}% 완성 | "
          f"{data['summary']['total_routes']}페이지 | "
          f"{len(data['features'])}기능 | "
          f"{len(data['automations'])}자동화 | "
          f"블로커 {len(data['summary']['active_blockers'])}건")
    if cl:
        print(f"   체크리스트 파싱 예시: {f0['id']} ({f0['label']}) → "
              f"{cl['done_count']}/{cl['total']} ({cl['completion_pct']}%)")


if __name__ == "__main__":
    main()
