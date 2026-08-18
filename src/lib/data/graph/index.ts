/**
 * 훈련 스킬 그래프 — tailtree taxonomy 에서 빌드된 번들 데이터
 *
 * 데이터는 `training-graph.json` 이고 **빌드 산출물**이다.
 * 직접 수정하지 말고 `node scripts/data/build-training-graph.mjs` 를 다시 돌린다.
 *
 * 왜 번들인가: 3차 수렴 P11 #2 — 서버에 두면 오프라인에서 아카데미가 빈 화면이 된다(감사 A4).
 * 왜 안전한가: P11 #6 — 빌드타임에 `how.authored === 'reviewed'` 로 걸러서 넣는다.
 *              런타임 게이트 코드가 없다. 미검수 콘텐츠는 애초에 번들에 없다(감사 A2).
 *
 * Parity: UIUX-002, UIUX-003
 */
import type { BehaviorType } from 'types/dog';

import raw from './training-graph.json';

/** 보호자 언어 축 — 앱 진입점. dom(트레이너 커리큘럼 축)과 직교한다. */
export interface Symptom {
  id: string;
  label: string;
}

/** 스킬 원자. `.sN` 스텝 노드는 how 카드 안에 접혀 있어 여기 없다. */
export interface GraphNode {
  id: string;
  label: string;
  type: string;
  /** 선행 깊이. 0 이 기초 */
  col: number;
  /** 'any' | 'puppy' | 'adolescent' */
  age?: string;
  /** 숙달 판정 기준 */
  mastery?: string;
  /** 보호자에게 물어볼 자가진단 문장 — 아는 기초를 건너뛰는 데 쓴다 */
  assessmentPrompt?: string;
  /** AKC Canine Good Citizen 항목 번호 */
  cgc?: number[];
  /** 근거 프레임워크 (Pryor · FearFree · Dunbar 등) */
  secondary?: string[];
}

/** 선행 엣지: f 를 익힌 뒤 t 로 간다 */
export interface GraphEdge {
  f: string;
  t: string;
}

/** 막힘 처방 — "이게 안 돼요" 에 대한 답과 되돌아갈 노드 */
export interface HowStuck {
  when: string;
  then: string;
  node?: string;
}

/** 실행 콘텐츠. `{{name}}` 은 강아지 이름으로 치환해서 렌더한다. */
export interface HowCard {
  oneline: string;
  steps: string[];
  stuck?: HowStuck[];
}

interface TrainingGraph {
  $source: { repo: string; commit: string; taxonomyVersion: string; filter: string; note: string };
  counts: {
    nodes: number;
    edges: number;
    how: number;
    symptoms: number;
    rejectedByFilter: number;
    symptomEntry: number;
    entryFromCorpus: number;
  };
  symptoms: Symptom[];
  nodes: GraphNode[];
  edges: GraphEdge[];
  how: Record<string, HowCard>;
  symptomIndex: Record<string, string[]>;
  /** 증상 → 대표 진입 노드. 14/17 은 tailtree 실코퍼스의 사람 판정에서 왔다. */
  symptomEntry: Record<string, string>;
  $entrySource: Record<string, string>;
}

const graph = raw as unknown as TrainingGraph;

export const GRAPH_SOURCE = graph.$source;
export const GRAPH_COUNTS = graph.counts;
export const SYMPTOMS: Symptom[] = graph.symptoms;
export const GRAPH_NODES: GraphNode[] = graph.nodes;
export const GRAPH_EDGES: GraphEdge[] = graph.edges;

const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));

/** 선행 인접: 노드 → 그 노드를 하려면 먼저 익혀야 할 것들 */
const prereqs = new Map<string, string[]>();
for (const e of graph.edges) {
  const list = prereqs.get(e.t);
  if (list) list.push(e.f);
  else prereqs.set(e.t, [e.f]);
}

/** 증상 → 그 증상으로 진입 가능한 노드들 */
const bySymptom = new Map<string, string[]>();
for (const [nodeId, syms] of Object.entries(graph.symptomIndex)) {
  for (const s of syms) {
    const list = bySymptom.get(s);
    if (list) list.push(nodeId);
    else bySymptom.set(s, [nodeId]);
  }
}

export function getNode(id: string): GraphNode | undefined {
  return nodeById.get(id);
}

export function getHow(id: string): HowCard | undefined {
  return graph.how[id];
}

export function getPrerequisites(id: string): string[] {
  return prereqs.get(id) ?? [];
}

export function getNodesForSymptom(symptomId: string): string[] {
  return bySymptom.get(symptomId) ?? [];
}

/**
 * goal 까지의 선행 사다리를 돌려준다 (기초 → 목표).
 *
 * **DFS 후위순회**를 쓴다. 이유가 둘 있다:
 *
 * 1. 최장경로 memo 방식은 조상 체인이 겹칠 때 같은 노드를 중복 삽입한다
 *    (KE-T1 패스 2 실측: `skill.mechanics.reward` 가 한 경로에 2회).
 * 2. 깊이 계산 후 정렬하는 방식은 **순환에서 순서가 뒤집힌다.**
 *    원본 그래프는 스텝 레벨에서 완전한 DAG(1412노드/1604엣지, 순환 0)지만,
 *    how 카드가 원자 단위라 스텝을 원자로 접는 순간 **인공 순환 6개**가 생긴다
 *    (`A.s5 -> B` 와 `B.s3 -> A` 가 둘 다 `A <-> B` 가 된다).
 *    `col` 필드는 시각화 좌표지 위상 깊이가 아니라 대안이 못 된다
 *    (167/207 노드에 값이 없고, 있는 것도 33/326 엣지가 순서를 어긴다).
 *
 * 후위순회는 back edge 를 `visited` 로 자연히 건너뛰므로, 비순환 구간의
 * 선행 순서는 정확하고 순환 내부만 진입 순서를 따른다.
 */
export function getLadder(goalId: string): string[] {
  if (!nodeById.has(goalId)) return [];

  const closure = new Set<string>([goalId]);
  const stack = [goalId];
  while (stack.length > 0) {
    const cur = stack.pop() as string;
    for (const p of getPrerequisites(cur)) {
      if (!closure.has(p)) {
        closure.add(p);
        stack.push(p);
      }
    }
  }

  const visited = new Set<string>();
  const order: string[] = [];
  const visit = (id: string): void => {
    if (visited.has(id)) return;
    visited.add(id);
    for (const p of getPrerequisites(id)) {
      if (closure.has(p)) visit(p);
    }
    order.push(id);
  };
  visit(goalId);

  return order;
}

/** how 본문의 `{{name}}` 을 강아지 이름으로 치환한다. */
export function fillName(text: string, dogName: string): string {
  return text.replace(/\{\{name\}\}/g, dogName);
}

// ── 진입 라우팅 ─────────────────────────────────────────────

/**
 * 기존 설문·코칭 축(`BehaviorType` 10종)을 tailtree 증상 축(17종)으로 잇는다.
 *
 * 두 축을 **교체가 아니라 공존**시킨다(3차 수렴 P11 #3). 설문·코칭·분석·알림이
 * 전부 `BehaviorType` 에 결박돼 있어 갈아끼우면 그 전부가 회귀한다.
 * 증상 17 은 신규 진입점(마킹·배변·핸들링·이동·기본신호·에너지·재주 7종)을 여는 쪽이다.
 */
export const BEHAVIOR_TO_SYMPTOM: Record<BehaviorType, string> = {
  separation: 'alone',
  anxiety: 'fearful',
  barking: 'barking',
  destructive: 'destructive',
  reactivity: 'dog_greeting',
  aggression: 'biting',
  resource_guarding: 'resource_guarding',
  leash_pulling: 'leash_pulling',
  jumping: 'jumping',
  other: 'cues',
};

/** 증상의 대표 진입 노드. 14/17 은 tailtree 실코퍼스의 사람 판정이 출처다. */
export function getEntryNodeForSymptom(symptomId: string): string | null {
  return graph.symptomEntry[symptomId] ?? null;
}

export function getEntryNodeForBehavior(behavior: BehaviorType): string | null {
  return getEntryNodeForSymptom(BEHAVIOR_TO_SYMPTOM[behavior]);
}

export interface TrainingPath {
  symptomId: string;
  /** 목표 노드 */
  goal: string;
  /** 기초 → 목표 순서의 원자 사다리 */
  ladder: string[];
}

/** 증상 하나에 대한 훈련 경로. 진입 노드가 없으면 null. */
export function getTrainingPath(symptomId: string): TrainingPath | null {
  const goal = getEntryNodeForSymptom(symptomId);
  if (!goal) return null;
  return { symptomId, goal, ladder: getLadder(goal) };
}

/**
 * 코칭 결과의 "관련 훈련 바로 시작하기" 목적지.
 *
 * 규칙 기반 코칭은 `reference_curriculum_ids` 를 채우지 않으므로(LLM 이 채우던 자리),
 * 앱이 번들 그래프로 직접 라우팅한다. 서버에 물어보지 않는다.
 */
export function getTrainingPathForBehaviors(behaviors: BehaviorType[]): TrainingPath | null {
  for (const b of behaviors) {
    const path = getTrainingPath(BEHAVIOR_TO_SYMPTOM[b]);
    if (path) return path;
  }
  return null;
}
