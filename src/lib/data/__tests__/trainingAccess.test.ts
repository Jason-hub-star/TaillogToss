import { CURRICULUMS } from 'lib/data/published/runtime';
import {
  getLockedCurriculumPreview,
  isCurriculumLockedForUser,
  isFreeCurriculumForUser,
} from '../trainingAccess';

describe('trainingAccess', () => {
  const beginner = CURRICULUMS.find((c) => c.difficulty === 'beginner');
  const proCurriculum = CURRICULUMS.find((c) => c.access === 'pro');

  it('treats beginner curriculum as free for non-Pro users', () => {
    expect(beginner).toBeDefined();
    expect(isFreeCurriculumForUser(beginner!)).toBe(true);
    expect(isCurriculumLockedForUser(beginner!, false)).toBe(false);
  });

  it('keeps non-beginner Pro curriculum locked but previewable for free users', () => {
    expect(proCurriculum).toBeDefined();
    expect(isCurriculumLockedForUser(proCurriculum!, false)).toBe(true);

    const preview = getLockedCurriculumPreview(proCurriculum!);
    expect(preview.firstDay?.day_number).toBe(1);
    expect(preview.previewSteps.length).toBeGreaterThan(0);
    expect(preview.previewSteps.length).toBeLessThan(proCurriculum!.days[0]!.steps.length);
  });
});
