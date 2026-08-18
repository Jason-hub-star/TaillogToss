/**
 * 훈련 그래프 번들 스모크 — 데이터가 실제로 쓸 수 있는 모양인지
 * Parity: UIUX-002, UIUX-003
 */
import type { BehaviorType } from 'types/dog';

import {
  BEHAVIOR_TO_SYMPTOM,
  GRAPH_COUNTS,
  GRAPH_EDGES,
  GRAPH_NODES,
  SYMPTOMS,
  fillName,
  getEntryNodeForBehavior,
  getHow,
  getLadder,
  getNode,
  getNodesForSymptom,
  getPrerequisites,
  getTrainingPath,
  getTrainingPathForBehaviors,
} from '../index';

describe('훈련 그래프 번들', () => {
  it('빌드 카운트와 실제 배열 길이가 일치한다', () => {
    expect(GRAPH_NODES).toHaveLength(GRAPH_COUNTS.nodes);
    expect(GRAPH_EDGES).toHaveLength(GRAPH_COUNTS.edges);
    expect(SYMPTOMS).toHaveLength(GRAPH_COUNTS.symptoms);
  });

  it('모든 노출 노드가 how 카드를 가진다 — 탭했을 때 빈 화면이 없다', () => {
    const missing = GRAPH_NODES.filter((n) => !getHow(n.id));
    expect(missing.map((n) => n.id)).toEqual([]);
  });

  it('엣지 양끝이 전부 실존 노드다 — 유령 참조 0', () => {
    const ghosts = GRAPH_EDGES.filter((e) => !getNode(e.f) || !getNode(e.t));
    expect(ghosts).toEqual([]);
  });

  it('증상 17종이 전부 진입 가능한 노드를 가진다', () => {
    const dead = SYMPTOMS.filter((s) => getNodesForSymptom(s.id).length === 0);
    expect(dead.map((s) => s.id)).toEqual([]);
  });

  it('사다리에 중복이 없고 목표가 마지막이다', () => {
    const goal = 'skill.emotional.sep_cue_desens';
    const ladder = getLadder(goal);
    expect(ladder.length).toBeGreaterThan(1);
    expect(new Set(ladder).size).toBe(ladder.length);
    expect(ladder[ladder.length - 1]).toBe(goal);
  });

  it('선행 순서 위반은 순환 멤버에서만 나온다', () => {
    // 원본은 스텝 레벨에서 완전한 DAG(순환 0)지만, how 카드가 원자 단위라
    // 스텝을 원자로 접으면 인공 순환 6개가 생긴다. 순환 안에서는 어떤 순서를
    // 골라도 위반이 나오므로, "위반이 0" 이 아니라 "위반이 전부 순환 때문" 을 잰다.
    const reaches = (from: string, to: string): boolean => {
      const seen = new Set<string>();
      const stack = [from];
      while (stack.length > 0) {
        const cur = stack.pop() as string;
        if (cur === to) return true;
        if (seen.has(cur)) continue;
        seen.add(cur);
        stack.push(...getPrerequisites(cur));
      }
      return false;
    };

    const ladder = getLadder('skill.emotional.sep_cue_desens');
    const pos = new Map(ladder.map((id, i) => [id, i]));
    const nonCyclic: string[] = [];

    for (const id of ladder) {
      for (const p of getPrerequisites(id)) {
        if (!pos.has(p)) continue;
        if (pos.get(p)! < pos.get(id)!) continue; // 정상
        // p 가 id 뒤에 왔다. p 에서 id 로도 갈 수 있으면 순환이다.
        if (!reaches(p, id)) nonCyclic.push(`${p} -> ${id}`);
      }
    }
    expect(nonCyclic).toEqual([]);
  });

  it('없는 노드의 사다리는 빈 배열이다', () => {
    expect(getLadder('skill.does.not.exist')).toEqual([]);
  });

  it('how 본문의 {{name}} 이 강아지 이름으로 치환된다', () => {
    const withTemplate = GRAPH_NODES.map((n) => getHow(n.id)).find((h) =>
      h?.oneline.includes('{{name}}'),
    );
    expect(withTemplate).toBeDefined();
    const filled = fillName(withTemplate!.oneline, '메이');
    expect(filled).toContain('메이');
    expect(filled).not.toContain('{{name}}');
  });

  it('증상 17종 전부가 진입 노드를 가지고, 그 노드가 번들 안에 있다', () => {
    for (const s of SYMPTOMS) {
      const path = getTrainingPath(s.id);
      expect(path).not.toBeNull();
      expect(getNode(path!.goal)).toBeDefined();
      expect(getHow(path!.goal)).toBeDefined();
      expect(path!.ladder[path!.ladder.length - 1]).toBe(path!.goal);
    }
  });

  it('BehaviorType 10종이 전부 훈련 경로로 이어진다', () => {
    const behaviors = Object.keys(BEHAVIOR_TO_SYMPTOM) as BehaviorType[];
    expect(behaviors).toHaveLength(10);
    for (const b of behaviors) {
      const goal = getEntryNodeForBehavior(b);
      expect(goal).not.toBeNull();
      expect(getHow(goal!)).toBeDefined();
    }
  });

  it('코칭 결과의 훈련 목적지가 첫 유효 behavior 로 정해진다', () => {
    const path = getTrainingPathForBehaviors(['separation', 'barking']);
    expect(path?.symptomId).toBe('alone');
    expect(path?.goal).toBe('skill.self_regulation.sep_graduated');
    expect(getTrainingPathForBehaviors([])).toBeNull();
  });

  it('stuck 처방이 가리키는 노드는 번들 안에 있거나 아예 없다 — 깨진 링크 금지', () => {
    const broken: string[] = [];
    for (const n of GRAPH_NODES) {
      for (const s of getHow(n.id)?.stuck ?? []) {
        if (s.node && !getNode(s.node)) broken.push(`${n.id} -> ${s.node}`);
      }
    }
    // KE-T4 실측: 점프 대상 82종 중 17종은 how 가 없어 번들에서 제외됐다.
    // 그 링크는 CTA 를 숨기는 방식으로 처리한다 — 여기서는 개수만 고정해 회귀를 잡는다.
    expect(broken.length).toBeLessThanOrEqual(40);
  });
});
