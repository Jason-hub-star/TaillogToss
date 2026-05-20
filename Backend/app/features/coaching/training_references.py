"""
Condensed training reference retrieval for AI coaching prompts.
Parity: AI-001, UI-TRAINING-PERSONALIZATION-001

The catalog mirrors the published frontend curriculum IDs, but keeps only
small planning cues so the model adapts from intake instead of copying lessons.
"""
from __future__ import annotations

from dataclasses import dataclass
from copy import deepcopy
from typing import Any


@dataclass(frozen=True)
class TrainingReference:
    curriculum_id: str
    title: str
    target_behaviors: tuple[str, ...]
    plan_a: str
    plan_b: str
    plan_c: str
    core_steps: tuple[str, ...]
    caution: str


TRAINING_REFERENCE_CATALOG: tuple[TrainingReference, ...] = (
    TrainingReference(
        curriculum_id="separation_anxiety",
        title="분리불안 완화",
        target_behaviors=("separation", "anxiety"),
        plan_a="문/외출 단서 둔감화와 초단기 이탈 성공 경험 만들기",
        plan_b="노즈워크, 매트, 안전구역을 먼저 안정 신호로 연결하기",
        plan_c="실패 빈도가 높으면 이탈 시간을 초 단위로 낮추고 영상 로그로 기준 재설정",
        core_steps=(
            "문 손잡이 만지기처럼 약한 외출 단서부터 보상한다",
            "짖기 전 시간 이하로 1-5초 이탈 후 조용히 재결합한다",
            "귀가 흥분이 커지면 인사 루틴을 낮은 에너지로 고정한다",
        ),
        caution="울음, 짖음, 문 긁기, 공황 신호가 나오면 바로 이전 단계로 낮춘다",
    ),
    TrainingReference(
        curriculum_id="reactivity_management",
        title="반응성 관리",
        target_behaviors=("barking", "reactivity"),
        plan_a="트리거를 보는 순간 보상하는 LAT와 거리 조절",
        plan_b="시야 차단, 백색소음, 매트 스테이션으로 환경 관리 먼저 적용",
        plan_c="짖음이 반복되면 노출 강도를 낮추고 산책 동선을 더 넓은 거리로 바꾼다",
        core_steps=(
            "트리거를 알아차리지만 짖지 않는 거리를 찾는다",
            "쳐다봄 직후 보호자에게 돌아보면 표시어와 보상을 준다",
            "회복 시간이 짧아질 때만 거리나 소리 강도를 올린다",
        ),
        caution="강제 접근, 리드줄 교정, 놀라게 하는 소리 노출을 피한다",
    ),
    TrainingReference(
        curriculum_id="fear_desensitization",
        title="공포·소리·핸들링 둔감화",
        target_behaviors=("anxiety", "barking", "reactivity"),
        plan_a="최저 강도의 자극을 짧게 제시하고 고가치 보상으로 재연합",
        plan_b="협조 케어와 시작 버튼 행동으로 선택권을 준다",
        plan_c="회피가 커지면 자극을 실제 도구 대신 모형, 거리, 무음 단계로 낮춘다",
        core_steps=(
            "소리 파일은 들릴 듯 말 듯한 볼륨에서 1-2초만 재생한다",
            "가위/클리퍼는 몸에 대기 전 보기, 냄새 맡기, 소리 듣기 순서로 나눈다",
            "강아지가 턱 올리기나 멈춤 신호를 선택할 수 있게 한다",
        ),
        caution="얼어붙음, 으르렁, 회피, 발버둥은 중단 신호로 본다",
    ),
    TrainingReference(
        curriculum_id="impulse_control",
        title="충동 조절·자원 보호 예방",
        target_behaviors=("destructive", "resource_guarding", "jumping"),
        plan_a="기다려, 교환, 대체행동 보상으로 예측 가능한 규칙 만들기",
        plan_b="식사·장난감 공간을 분리하고 갈등 전 관리 루틴을 둔다",
        plan_c="경직, 으르렁이 있으면 회수 훈련을 중단하고 거리 보상으로 낮춘다",
        core_steps=(
            "물건을 빼앗기보다 더 좋은 보상과 교환한다",
            "흥분 점프는 네 발이 바닥에 있을 때만 접근과 보상을 준다",
            "식사 전후 보호자 접근은 충분한 거리에서 간식 추가로 재연합한다",
        ),
        caution="밥그릇이나 물건을 힘으로 빼앗지 않는다",
    ),
    TrainingReference(
        curriculum_id="leash_manners",
        title="산책 매너",
        target_behaviors=("leash_pulling",),
        plan_a="느슨한 리드줄 순간을 표시하고 이동 보상으로 강화",
        plan_b="U턴, 핸드타깃, 패턴게임으로 흥분을 낮춘다",
        plan_c="당김이 심하면 짧은 성공 구간과 조용한 동선으로 재시작한다",
        core_steps=(
            "하네스와 고정 리드줄로 시작한다",
            "줄이 느슨해지는 순간 표시어 후 앞으로 이동한다",
            "당김이 생기면 멈춤보다 방향 전환으로 성공 구간을 만든다",
        ),
        caution="목줄 당김 교정이나 급격한 리드 충격을 쓰지 않는다",
    ),
    TrainingReference(
        curriculum_id="basic_obedience",
        title="기본 예절·퍼피 루틴",
        target_behaviors=("jumping", "other"),
        plan_a="짧고 자주 성공하는 기본 신호와 생활 루틴 만들기",
        plan_b="배변·휴식·놀이 예측 가능성을 높여 과흥분을 줄인다",
        plan_c="실패가 늘면 환경 범위를 좁히고 보상 간격을 촘촘히 한다",
        core_steps=(
            "앉아, 기다려, 내려가를 실제 생활 상황에 연결한다",
            "배변 성공 직후 조용한 칭찬과 보상을 준다",
            "방문객 전에는 매트나 장난감으로 먼저 에너지를 낮춘다",
        ),
        caution="어린 강아지는 긴 세션보다 1-3분 반복 세션이 안전하다",
    ),
    TrainingReference(
        curriculum_id="socialization",
        title="사회화·낯선 대상 적응",
        target_behaviors=("aggression", "reactivity", "anxiety"),
        plan_a="안전거리에서 관찰 후 보상하며 선택적 접근을 허용",
        plan_b="평행 산책, 시야 차단, 퇴로 확보로 부담을 낮춘다",
        plan_c="공격 신호가 있으면 직접 접촉을 중단하고 전문가 평가로 전환",
        core_steps=(
            "낯선 사람이나 개를 바로 만나게 하지 않는다",
            "쳐다보고 다시 보호자를 볼 때 보상한다",
            "두 번째 방문처럼 익숙함이 생기는 패턴을 기록한다",
        ),
        caution="강제 인사, 안아 들고 접근, 도망 경로 차단을 피한다",
    ),
)

BEHAVIOR_TO_CURRICULUM: dict[str, tuple[str, ...]] = {
    "separation": ("separation_anxiety",),
    "barking": ("reactivity_management", "fear_desensitization"),
    "reactivity": ("reactivity_management", "socialization"),
    "anxiety": ("fear_desensitization", "separation_anxiety"),
    "resource_guarding": ("impulse_control",),
    "destructive": ("impulse_control",),
    "leash_pulling": ("leash_manners",),
    "jumping": ("basic_obedience", "impulse_control"),
    "aggression": ("socialization",),
    "other": ("basic_obedience",),
}

_CATALOG_BY_ID = {ref.curriculum_id: ref for ref in TRAINING_REFERENCE_CATALOG}

TOOL_LABELS: dict[str, str] = {
    "high-value treats": "좋아하는 간식",
    "treat pouch": "간식 파우치",
    "marker word": "표시어",
    "clicker": "클리커",
    "marker word/clicker": "표시어/클리커",
    "front-clip harness": "앞고리 하네스",
    "fixed leash": "고정 리드줄",
    "long line": "롱라인",
    "fixed leash/long line": "고정 리드줄/롱라인",
    "mat": "매트",
    "mat/bed": "매트/침대",
    "baby gate/pen": "안전문/펜스",
    "visual barrier": "시야 차단막",
    "white noise": "백색소음",
    "sound file": "소리 파일",
    "white noise/sound file": "백색소음/소리 파일",
    "lick mat/snuffle mat": "리킹매트/노즈워크 매트",
    "grooming dummy tools": "모형 미용 도구",
    "towel/non-slip mat": "수건/미끄럼 방지 매트",
    "video log": "영상 기록",
}

_KEYWORD_RULES: tuple[tuple[str, tuple[str, ...]], ...] = (
    ("separation", ("separation", "owner_leaves", "보호자", "이탈", "분리", "혼자", "외출", "문 앞", "문앞", "재결합")),
    ("resource_guarding", ("resource", "guarding", "자원", "밥그릇", "식사", "음식", "장난감")),
    ("barking", ("barking", "bark", "짖", "으르렁", "growl", "소리", "noise", "윗집", "초인종", "문 닫")),
    ("reactivity", ("reactivity", "reactive", "다른 개", "강아지", "산책", "돌진", "다가오", "하네스")),
    ("leash_pulling", ("leash_pulling", "pulling", "당김", "리드", "줄 당")),
    ("jumping", ("jumping", "jump", "점프", "뛰어오", "달려들", "흥분")),
    ("aggression", ("aggression", "bite", "biting", "공격", "물림", "문다")),
    ("destructive", ("destructive", "destruction", "파괴", "뜯", "물어뜯")),
    ("anxiety", ("anxiety", "fear", "fearful", "불안", "무서", "공포", "긴장", "회피", "얼어", "미용", "핸들링", "클리퍼", "가위")),
)


def extract_behavior_candidates(
    issues: list[str] | None,
    triggers: list[str] | None,
    onboarding_context: dict[str, Any] | None,
) -> list[str]:
    """Extract coarse behavior tags from issue strings and Pro intake text."""
    text = _collect_text(issues, triggers, onboarding_context)
    candidates: list[str] = []

    for behavior, keywords in _KEYWORD_RULES:
        if any(keyword.lower() in text for keyword in keywords):
            candidates.append(behavior)

    if not candidates:
        candidates.append("other")

    return _dedupe(candidates)


def retrieve_training_references(
    issues: list[str] | None,
    triggers: list[str] | None,
    onboarding_context: dict[str, Any] | None,
    limit: int = 3,
) -> list[TrainingReference]:
    """Return up to ``limit`` curriculum references relevant to the intake."""
    candidates = extract_behavior_candidates(issues, triggers, onboarding_context)
    curriculum_ids: list[str] = []

    for behavior in candidates:
        curriculum_ids.extend(BEHAVIOR_TO_CURRICULUM.get(behavior, ()))

    refs: list[TrainingReference] = []
    for curriculum_id in _dedupe(curriculum_ids):
        ref = _CATALOG_BY_ID.get(curriculum_id)
        if ref:
            refs.append(ref)
        if len(refs) >= limit:
            break

    return refs


def format_training_references_for_prompt(references: list[TrainingReference]) -> str:
    if not references:
        return ""

    lines = [
        "\nRetrieved Training References (do not copy; adapt and recombine from the intake):",
        "Use these as a small safety/reference library only. Do not copy steps verbatim.",
        "For action_plan.items[].reference_curriculum_ids and next_7_days.days[].reference_curriculum_ids, use only IDs listed here.",
    ]
    for ref in references:
        lines.extend(
            [
                f"- {ref.curriculum_id}: {ref.title}",
                f"  target_behaviors: {', '.join(ref.target_behaviors)}",
                f"  Plan A: {ref.plan_a}",
                f"  Plan B: {ref.plan_b}",
                f"  Plan C: {ref.plan_c}",
                f"  core_steps: {' / '.join(ref.core_steps[:3])}",
                f"  caution: {ref.caution}",
            ]
        )

    return "\n".join(lines) + "\n"


def sanitize_reference_curriculum_ids(
    blocks: dict[str, Any],
    references: list[TrainingReference],
) -> dict[str, Any]:
    """Keep model-provided reference IDs inside retrieved references.

    LLMs occasionally hallucinate a valid-looking curriculum ID. The prompt
    already forbids that; this runtime guard keeps persisted coaching results
    consistent with the retrieval set used for that generation.
    """
    allowed_ids = [ref.curriculum_id for ref in references]
    if not allowed_ids:
        return blocks

    cleaned = deepcopy(blocks)
    _sanitize_items(
        ((cleaned.get("action_plan") or {}).get("items") or []),
        allowed_ids,
    )
    _sanitize_items(
        ((cleaned.get("next_7_days") or {}).get("days") or []),
        allowed_ids,
    )
    return cleaned


def localize_user_visible_tools(blocks: dict[str, Any]) -> dict[str, Any]:
    """Normalize user-facing tool labels before persisting AI coaching blocks."""
    cleaned = deepcopy(blocks)
    _localize_item_tools(((cleaned.get("action_plan") or {}).get("items") or []))
    _localize_item_tools(((cleaned.get("next_7_days") or {}).get("days") or []))
    return cleaned


def _collect_text(
    issues: list[str] | None,
    triggers: list[str] | None,
    onboarding_context: dict[str, Any] | None,
) -> str:
    values: list[str] = []
    values.extend(issues or [])
    values.extend(triggers or [])
    _walk_text(onboarding_context, values)
    return " ".join(values).lower()


def _walk_text(value: Any, output: list[str]) -> None:
    if isinstance(value, str):
        output.append(value)
    elif isinstance(value, dict):
        for item in value.values():
            _walk_text(item, output)
    elif isinstance(value, list | tuple):
        for item in value:
            _walk_text(item, output)


def _dedupe(values: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        if value and value not in seen:
            seen.add(value)
            result.append(value)
    return result


def _sanitize_items(items: list[Any], allowed_ids: list[str]) -> None:
    for item in items:
        if not isinstance(item, dict):
            continue
        refs = item.get("reference_curriculum_ids")
        if isinstance(refs, list):
            sanitized = [ref for ref in refs if ref in allowed_ids]
        else:
            sanitized = []
        item["reference_curriculum_ids"] = sanitized or [allowed_ids[0]]


def _localize_item_tools(items: list[Any]) -> None:
    for item in items:
        if not isinstance(item, dict):
            continue
        tools = item.get("tools")
        if not isinstance(tools, list):
            continue
        localized: list[str] = []
        for tool in tools:
            if not isinstance(tool, str):
                continue
            label = TOOL_LABELS.get(tool.strip().lower(), tool)
            if label and label not in localized:
                localized.append(label)
        item["tools"] = localized
