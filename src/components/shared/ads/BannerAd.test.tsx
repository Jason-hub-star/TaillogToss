import React from 'react';
import { act, render } from '@testing-library/react-native';
import { BannerAd } from './BannerAd';

let capturedInlineAdProps: { onAdImpression?: (details?: unknown) => void } | null = null;

jest.mock('@apps-in-toss/framework', () => ({
  InlineAd: (props: { onAdImpression?: (details?: unknown) => void }) => {
    capturedInlineAdProps = props;
    const { Text } = require('react-native');
    return <Text testID="inline-ad">inline-ad</Text>;
  },
}));

jest.mock('lib/ads/config', () => ({
  getAdGroupId: () => 'ait.v2.live.test-b1',
  isMockMode: () => false,
}));

jest.mock('lib/hooks/useBannerAd', () => ({
  useBannerAd: () => ({
    canShow: true,
    onAdRendered: jest.fn(),
    onAdImpression: jest.fn(),
    onAdClicked: jest.fn(),
    onNoFill: jest.fn(),
    onAdFailedToRender: jest.fn(),
  }),
}));

describe('BannerAd', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    capturedInlineAdProps = null;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('keeps the dashboard banner mounted after an impression when collapse is disabled', () => {
    const { getByTestId } = render(
      <BannerAd placement="B1" testID="dashboard-b1" collapseAfterImpression={false} />,
    );

    expect(getByTestId('dashboard-b1')).toBeTruthy();

    act(() => {
      capturedInlineAdProps?.onAdImpression?.({ source: 'test' });
      jest.advanceTimersByTime(1300);
    });

    expect(getByTestId('dashboard-b1')).toBeTruthy();
  });

  it('collapses after an impression by default for non-persistent placements', () => {
    const { queryByTestId } = render(<BannerAd placement="B3" testID="training-b3" />);

    expect(queryByTestId('training-b3')).toBeTruthy();

    act(() => {
      capturedInlineAdProps?.onAdImpression?.({ source: 'test' });
      jest.advanceTimersByTime(1300);
    });

    expect(queryByTestId('training-b3')).toBeNull();
  });
});
