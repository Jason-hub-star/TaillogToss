import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { IntensitySelector } from '../IntensitySelector';

describe('IntensitySelector', () => {
  it('renders every intensity level from 1 to 10', () => {
    const { getByText } = render(<IntensitySelector value={5} onChange={jest.fn()} />);

    for (let level = 1; level <= 10; level += 1) {
      expect(getByText(String(level))).toBeTruthy();
    }
  });

  it('emits the selected level', () => {
    const onChange = jest.fn();
    const { getByText } = render(<IntensitySelector value={5} onChange={onChange} />);

    fireEvent.press(getByText('10'));

    expect(onChange).toHaveBeenCalledWith(10);
  });
});
