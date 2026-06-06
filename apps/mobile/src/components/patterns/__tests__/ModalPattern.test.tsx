import React from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  Platform,
  LayoutAnimation,
} from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { Modal } from '../ModalPattern';

// Typed compound accessors (sub-components are attached at runtime).
const M = Modal as unknown as {
  Trigger: React.ComponentType<any>;
  Content: React.ComponentType<any>;
  Header: React.ComponentType<any>;
  Title: React.ComponentType<any>;
  Close: React.ComponentType<any>;
};

describe('ModalPattern', () => {
  afterEach(() => {
    // restore Platform.OS between tests
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
    jest.restoreAllMocks();
  });

  it('attaches all compound sub-components to Modal', () => {
    expect(Modal).toBeDefined();
    expect(M.Trigger).toBeDefined();
    expect(M.Content).toBeDefined();
    expect(M.Header).toBeDefined();
    expect(M.Title).toBeDefined();
    expect(M.Close).toBeDefined();
    expect(Modal.displayName).toBe('Modal');
  });

  it('starts closed by default: Content renders null', () => {
    const { queryByText, queryByTestId } = render(
      <Modal testID='modal'>
        <M.Content testID='content'>
          <Text>Body</Text>
        </M.Content>
      </Modal>
    );
    expect(queryByText('Body')).toBeNull();
    expect(queryByTestId('content')).toBeNull();
  });

  it('respects defaultOpen=true: Content renders immediately', () => {
    const { getByText, getByTestId } = render(
      <Modal defaultOpen>
        <M.Content testID='content'>
          <Text>Body</Text>
        </M.Content>
      </Modal>
    );
    expect(getByText('Body')).toBeTruthy();
    expect(getByTestId('content')).toBeTruthy();
  });

  it('Trigger toggles open and fires onOpenChange (open path, iOS LayoutAnimation)', () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
    const layoutSpy = jest.spyOn(LayoutAnimation, 'easeInEaseOut');
    const onOpenChange = jest.fn();
    const { getByTestId, queryByText } = render(
      <Modal onOpenChange={onOpenChange}>
        <M.Trigger testID='trigger'>
          <Text>Open</Text>
        </M.Trigger>
        <M.Content>
          <Text>Body</Text>
        </M.Content>
      </Modal>
    );
    expect(queryByText('Body')).toBeNull();
    fireEvent.press(getByTestId('trigger'));
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(layoutSpy).toHaveBeenCalled();
    expect(queryByText('Body')).toBeTruthy();
  });

  it('Trigger toggles closed when already open (close path)', () => {
    const onOpenChange = jest.fn();
    const { getByTestId, queryByText } = render(
      <Modal defaultOpen onOpenChange={onOpenChange}>
        <M.Trigger testID='trigger'>
          <Text>Toggle</Text>
        </M.Trigger>
        <M.Content>
          <Text>Body</Text>
        </M.Content>
      </Modal>
    );
    expect(queryByText('Body')).toBeTruthy();
    fireEvent.press(getByTestId('trigger'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(queryByText('Body')).toBeNull();
  });

  it('close path fires LayoutAnimation on iOS (close iOS branch)', () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
    const layoutSpy = jest.spyOn(LayoutAnimation, 'easeInEaseOut');
    const { getByTestId } = render(
      <Modal defaultOpen>
        <M.Content>
          <Text>Body</Text>
          <M.Close testID='close'>
            <Text>X</Text>
          </M.Close>
        </M.Content>
      </Modal>
    );
    layoutSpy.mockClear();
    fireEvent.press(getByTestId('close'));
    expect(layoutSpy).toHaveBeenCalledTimes(1);
  });

  it('open/close do NOT call LayoutAnimation on non-iOS (android branch)', () => {
    Object.defineProperty(Platform, 'OS', {
      value: 'android',
      configurable: true,
    });
    const layoutSpy = jest.spyOn(LayoutAnimation, 'easeInEaseOut');
    const { getByTestId } = render(
      <Modal>
        <M.Trigger testID='trigger'>
          <Text>Open</Text>
        </M.Trigger>
        <M.Content>
          <Text>Body</Text>
        </M.Content>
      </Modal>
    );
    fireEvent.press(getByTestId('trigger'));
    expect(layoutSpy).not.toHaveBeenCalled();
  });

  it('close path does NOT call LayoutAnimation on android (close android branch)', () => {
    Object.defineProperty(Platform, 'OS', {
      value: 'android',
      configurable: true,
    });
    const layoutSpy = jest.spyOn(LayoutAnimation, 'easeInEaseOut');
    const { getByTestId, queryByText } = render(
      <Modal defaultOpen>
        <M.Content>
          <Text>Body</Text>
          <M.Close testID='close'>
            <Text>X</Text>
          </M.Close>
        </M.Content>
      </Modal>
    );
    layoutSpy.mockClear();
    fireEvent.press(getByTestId('close'));
    expect(layoutSpy).not.toHaveBeenCalled();
    expect(queryByText('Body')).toBeNull();
  });

  it('works without onOpenChange callback (optional-chain branch)', () => {
    const { getByTestId, queryByText } = render(
      <Modal>
        <M.Trigger testID='trigger'>
          <Text>Open</Text>
        </M.Trigger>
        <M.Content>
          <Text>Body</Text>
        </M.Content>
      </Modal>
    );
    expect(() => fireEvent.press(getByTestId('trigger'))).not.toThrow();
    expect(queryByText('Body')).toBeTruthy();
  });

  it('Trigger asChild clones child and wires onPress (valid element branch)', () => {
    const { getByTestId, queryByText } = render(
      <Modal>
        <M.Trigger asChild testID='child-trigger'>
          <TouchableOpacity>
            <Text>Custom</Text>
          </TouchableOpacity>
        </M.Trigger>
        <M.Content>
          <Text>Body</Text>
        </M.Content>
      </Modal>
    );
    // cloneElement injected the testID onto the child
    fireEvent.press(getByTestId('child-trigger'));
    expect(queryByText('Body')).toBeTruthy();
  });

  it('Trigger asChild with non-element child falls back to TouchableOpacity', () => {
    const { getByTestId, queryByText } = render(
      <Modal>
        <M.Trigger asChild testID='trigger'>
          plain text child
        </M.Trigger>
        <M.Content>
          <Text>Body</Text>
        </M.Content>
      </Modal>
    );
    // asChild=true but child is a string (not valid element) -> falls through to TouchableOpacity
    fireEvent.press(getByTestId('trigger'));
    expect(queryByText('Body')).toBeTruthy();
  });

  it('Trigger applies custom style on the fallback TouchableOpacity', () => {
    const { getByTestId } = render(
      <Modal>
        <M.Trigger testID='trigger' style={{ margin: 5 }}>
          <Text>Open</Text>
        </M.Trigger>
      </Modal>
    );
    expect(getByTestId('trigger')).toBeTruthy();
  });

  it('Content renders overlay by default and backdrop press closes (close callback)', () => {
    const onOpenChange = jest.fn();
    const { getByTestId, queryByText } = render(
      <Modal defaultOpen onOpenChange={onOpenChange}>
        <M.Content testID='content'>
          <Text>Body</Text>
        </M.Content>
      </Modal>
    );
    const overlay = getByTestId('content-overlay');
    expect(overlay).toBeTruthy();
    fireEvent.press(overlay);
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(queryByText('Body')).toBeNull();
  });

  it('Content with showOverlay=false renders no overlay', () => {
    const { queryByTestId, getByText } = render(
      <Modal defaultOpen>
        <M.Content testID='content' showOverlay={false}>
          <Text>Body</Text>
        </M.Content>
      </Modal>
    );
    expect(getByText('Body')).toBeTruthy();
    expect(queryByTestId('content-overlay')).toBeNull();
  });

  it('Content applies custom style and overlayStyle', () => {
    const { getByTestId } = render(
      <Modal defaultOpen>
        <M.Content
          testID='content'
          style={{ padding: 1 }}
          overlayStyle={{ opacity: 0.9 }}
        >
          <Text>Body</Text>
        </M.Content>
      </Modal>
    );
    expect(getByTestId('content')).toBeTruthy();
    expect(getByTestId('content-overlay')).toBeTruthy();
  });

  it('Header, Title, Close render their children', () => {
    const { getByText, getByTestId } = render(
      <Modal defaultOpen>
        <M.Content>
          <M.Header testID='header' style={{ marginTop: 1 }}>
            <M.Title testID='title' style={{ fontSize: 20 }}>
              My Title
            </M.Title>
          </M.Header>
          <M.Close testID='close' style={{ top: 1 }}>
            <Text>X</Text>
          </M.Close>
        </M.Content>
      </Modal>
    );
    expect(getByTestId('header')).toBeTruthy();
    expect(getByText('My Title')).toBeTruthy();
    expect(getByTestId('title')).toBeTruthy();
    expect(getByTestId('close')).toBeTruthy();
  });

  it('Close button press closes the modal (close callback)', () => {
    const onOpenChange = jest.fn();
    const { getByTestId, queryByText } = render(
      <Modal defaultOpen onOpenChange={onOpenChange}>
        <M.Content>
          <Text>Body</Text>
          <M.Close testID='close'>
            <Text>X</Text>
          </M.Close>
        </M.Content>
      </Modal>
    );
    expect(queryByText('Body')).toBeTruthy();
    fireEvent.press(getByTestId('close'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(queryByText('Body')).toBeNull();
  });

  it('Close asChild clones child and wires onPress (valid element branch)', () => {
    const { getByTestId, queryByText } = render(
      <Modal defaultOpen>
        <M.Content>
          <Text>Body</Text>
          <M.Close asChild testID='close-child'>
            <TouchableOpacity>
              <Text>Dismiss</Text>
            </TouchableOpacity>
          </M.Close>
        </M.Content>
      </Modal>
    );
    fireEvent.press(getByTestId('close-child'));
    expect(queryByText('Body')).toBeNull();
  });

  it('Close asChild with non-element child falls back to TouchableOpacity', () => {
    const { getByTestId, queryByText } = render(
      <Modal defaultOpen>
        <M.Content>
          <Text>Body</Text>
          <M.Close asChild testID='close'>
            just-a-string
          </M.Close>
        </M.Content>
      </Modal>
    );
    fireEvent.press(getByTestId('close'));
    expect(queryByText('Body')).toBeNull();
  });

  it('useModal throws when sub-component used outside Modal provider', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() =>
      render(
        <M.Trigger>
          <Text>Orphan</Text>
        </M.Trigger>
      )
    ).toThrow('Modal compound components must be used within Modal');
    spy.mockRestore();
  });
});
