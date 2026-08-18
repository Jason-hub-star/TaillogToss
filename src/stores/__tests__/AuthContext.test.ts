import { resolveEffectiveSessionRole } from '../authRole';

describe('resolveEffectiveSessionRole', () => {
  it('keeps B2C entry as user even when public role is B2B', () => {
    expect(
      resolveEffectiveSessionRole({
        sessionRole: 'user',
        preferredFlow: 'B2C',
        publicRole: 'org_owner',
      }),
    ).toBe('user');
  });

  it('restores B2B role from public user when B2B metadata is stale', () => {
    expect(
      resolveEffectiveSessionRole({
        sessionRole: 'user',
        preferredFlow: 'B2B',
        publicRole: 'org_owner',
      }),
    ).toBe('org_owner');
  });

  it('keeps B2B public role on cold restore without an explicit entry flow', () => {
    expect(
      resolveEffectiveSessionRole({
        sessionRole: 'user',
        preferredFlow: null,
        publicRole: 'trainer',
      }),
    ).toBe('trainer');
  });

  it('does not trust B2B session metadata when public role is not B2B', () => {
    expect(
      resolveEffectiveSessionRole({
        sessionRole: 'org_staff',
        preferredFlow: 'B2B',
        publicRole: 'user',
      }),
    ).toBe('user');
  });

  it('does not trust B2B session metadata when public role lookup is unavailable', () => {
    expect(
      resolveEffectiveSessionRole({
        sessionRole: 'trainer',
        preferredFlow: null,
        publicRole: null,
      }),
    ).toBe('user');
  });
});
