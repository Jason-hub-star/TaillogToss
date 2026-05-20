import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { OccurrenceSelector } from '../OccurrenceSelector';

describe('OccurrenceSelector', () => {
  it('renders easy frequency presets', () => {
    const { getByText } = render(
      <OccurrenceSelector value={{ count: 1, isMinimum: false }} onChange={jest.fn()} />,
    );

    expect(getByText('1회')).toBeTruthy();
    expect(getByText('2회')).toBeTruthy();
    expect(getByText('3회 이상')).toBeTruthy();
    expect(getByText('5회 이상')).toBeTruthy();
    expect(getByText('10회 이상')).toBeTruthy();
  });

  it('emits the selected minimum count', () => {
    const onChange = jest.fn();
    const { getByText } = render(
      <OccurrenceSelector value={{ count: 1, isMinimum: false }} onChange={onChange} />,
    );

    fireEvent.press(getByText('5회 이상'));

    expect(onChange).toHaveBeenCalledWith({ count: 5, isMinimum: true });
  });
});
