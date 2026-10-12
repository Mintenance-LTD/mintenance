import React from 'react';
import { PanResponder, View } from 'react-native';
import { render, act, fireEvent } from '@testing-library/react-native';
import { SignatureCanvas } from '../ui/SignatureCanvas';

describe('SignatureCanvas', () => {
  it('preserves queued drawing updates after finger release', () => {
    let handlers: any;
    jest.spyOn(PanResponder, 'create').mockImplementation((config) => {
      handlers = config;
      return { panHandlers: {} };
    });
    const onSign = jest.fn();
    const screen = render(
      <SignatureCanvas onSign={onSign} onCancel={jest.fn()} />
    );
    const canvas = screen
      .UNSAFE_getAllByType(View)
      .find((view) => view.props.onLayout);
    fireEvent(canvas!, 'layout', {
      nativeEvent: { layout: { width: 300, height: 200 } },
    });
    const point = (x: number) => ({
      nativeEvent: { locationX: x, locationY: x },
    });
    act(() => {
      handlers.onPanResponderGrant(point(10));
      handlers.onPanResponderMove(point(20));
      handlers.onPanResponderMove(point(30));
      handlers.onPanResponderMove(point(40));
      handlers.onPanResponderRelease();
    });
    fireEvent.press(screen.getByText('Sign'));
    expect(onSign).toHaveBeenCalledWith(
      expect.stringContaining('M10.0 10.0 L20.0 20.0 L30.0 30.0 L40.0 40.0')
    );
    fireEvent.press(screen.getByText('Clear'));
    fireEvent.press(screen.getByText('Sign'));
    expect(onSign).toHaveBeenCalledTimes(1);
    jest.restoreAllMocks();
  });
});
