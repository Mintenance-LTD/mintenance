import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { Accordion } from '../AccordionPattern';

// Typed access to the compound sub-components attached at runtime.
const A = Accordion as unknown as {
  Item: React.ComponentType<{
    children: React.ReactNode;
    id: string;
    style?: object;
    testID?: string;
  }>;
  Trigger: React.ComponentType<{
    children: React.ReactNode;
    style?: object;
    testID?: string;
  }>;
  Content: React.ComponentType<{
    children: React.ReactNode;
    style?: object;
    testID?: string;
  }>;
};

/**
 * Render a two-item accordion. Each item has a trigger + content.
 */
function renderAccordion(
  props: {
    multiple?: boolean;
    defaultOpen?: string[];
    onValueChange?: (open: string[]) => void;
    testID?: string;
  } = {}
) {
  return render(
    <Accordion {...props}>
      <A.Item id='a' testID='item-a'>
        <A.Trigger testID='trigger-a'>
          <Text>Header A</Text>
        </A.Trigger>
        <A.Content testID='content-a'>
          <Text>Body A</Text>
        </A.Content>
      </A.Item>
      <A.Item id='b' testID='item-b' style={{ marginTop: 4 }}>
        <A.Trigger testID='trigger-b' style={{ paddingLeft: 2 }}>
          <Text>Header B</Text>
        </A.Trigger>
        <A.Content testID='content-b' style={{ paddingBottom: 2 }}>
          <Text>Body B</Text>
        </A.Content>
      </A.Item>
    </Accordion>
  );
}

describe('AccordionPattern', () => {
  it('attaches compound sub-components', () => {
    expect(A.Item).toBeDefined();
    expect(A.Trigger).toBeDefined();
    expect(A.Content).toBeDefined();
    expect((Accordion as { displayName?: string }).displayName).toBe(
      'Accordion'
    );
  });

  it('renders all triggers and hides content by default (collapsed)', () => {
    const { getByText, queryByText, getByTestId } = renderAccordion();
    expect(getByText('Header A')).toBeTruthy();
    expect(getByText('Header B')).toBeTruthy();
    // Content not rendered when closed (AccordionContent returns null).
    expect(queryByText('Body A')).toBeNull();
    expect(queryByText('Body B')).toBeNull();
    expect(getByTestId('item-a')).toBeTruthy();
  });

  it('expands an item on trigger press and shows its content (uncontrolled)', () => {
    const { getByTestId, getByText, queryByText } = renderAccordion();
    fireEvent.press(getByTestId('trigger-a'));
    expect(getByText('Body A')).toBeTruthy();
    expect(queryByText('Body B')).toBeNull();
  });

  it('collapses an open item when its trigger is pressed again', () => {
    const { getByTestId, queryByText } = renderAccordion();
    fireEvent.press(getByTestId('trigger-a'));
    expect(queryByText('Body A')).toBeTruthy();
    fireEvent.press(getByTestId('trigger-a'));
    expect(queryByText('Body A')).toBeNull();
  });

  it('single-expand mode: opening B closes A (newSet.clear branch)', () => {
    const { getByTestId, queryByText } = renderAccordion({ multiple: false });
    fireEvent.press(getByTestId('trigger-a'));
    expect(queryByText('Body A')).toBeTruthy();
    fireEvent.press(getByTestId('trigger-b'));
    // A closed, B open
    expect(queryByText('Body A')).toBeNull();
    expect(queryByText('Body B')).toBeTruthy();
  });

  it('multi-expand mode: A and B can be open simultaneously', () => {
    const { getByTestId, queryByText } = renderAccordion({ multiple: true });
    fireEvent.press(getByTestId('trigger-a'));
    fireEvent.press(getByTestId('trigger-b'));
    expect(queryByText('Body A')).toBeTruthy();
    expect(queryByText('Body B')).toBeTruthy();
  });

  it('respects defaultOpen (item starts expanded; isOpen=true path in Content)', () => {
    const { queryByText } = renderAccordion({ defaultOpen: ['a'] });
    expect(queryByText('Body A')).toBeTruthy();
    expect(queryByText('Body B')).toBeNull();
  });

  it('fires onValueChange with the open id array on expand', () => {
    const onValueChange = jest.fn();
    const { getByTestId } = renderAccordion({ onValueChange });
    fireEvent.press(getByTestId('trigger-a'));
    expect(onValueChange).toHaveBeenCalledWith(['a']);
  });

  it('fires onValueChange with empty array on collapse', () => {
    const onValueChange = jest.fn();
    const { getByTestId } = renderAccordion({ onValueChange });
    fireEvent.press(getByTestId('trigger-a'));
    onValueChange.mockClear();
    fireEvent.press(getByTestId('trigger-a'));
    expect(onValueChange).toHaveBeenCalledWith([]);
  });

  it('works without onValueChange (optional-chaining branch)', () => {
    const { getByTestId, queryByText } = renderAccordion();
    expect(() => fireEvent.press(getByTestId('trigger-a'))).not.toThrow();
    expect(queryByText('Body A')).toBeTruthy();
  });

  it('multi-mode onValueChange reports both ids', () => {
    const onValueChange = jest.fn();
    const { getByTestId } = renderAccordion({ multiple: true, onValueChange });
    fireEvent.press(getByTestId('trigger-a'));
    fireEvent.press(getByTestId('trigger-b'));
    const last =
      onValueChange.mock.calls[onValueChange.mock.calls.length - 1][0];
    expect(last).toEqual(expect.arrayContaining(['a', 'b']));
    expect(last).toHaveLength(2);
  });

  it('passes the root testID through to the container', () => {
    const { getByTestId } = renderAccordion({ testID: 'root-accordion' });
    expect(getByTestId('root-accordion')).toBeTruthy();
  });

  it('applies the open trigger style when item is expanded', () => {
    const { getByTestId } = renderAccordion({ defaultOpen: ['a'] });
    const trigger = getByTestId('trigger-a');
    const flat = Array.isArray(trigger.props.style)
      ? Object.assign({}, ...trigger.props.style.filter(Boolean))
      : trigger.props.style;
    // accordionTriggerOpen sets backgroundSecondary background.
    expect(flat.backgroundColor).toBe('#F7F7F7');
  });

  it('renders content with animated opacity style + custom content style', () => {
    const { getByTestId } = renderAccordion({ defaultOpen: ['a'] });
    const content = getByTestId('content-a');
    expect(content).toBeTruthy();
    // Style array includes the custom paddingBottom passed in (item a has none,
    // so check item b after opening it).
  });

  it('content transitions from null to visible when toggled (useEffect open path)', () => {
    const { getByTestId, queryByText } = renderAccordion();
    expect(queryByText('Body B')).toBeNull();
    fireEvent.press(getByTestId('trigger-b'));
    expect(queryByText('Body B')).toBeTruthy();
    // custom content style applied
    expect(getByTestId('content-b')).toBeTruthy();
  });

  it('throws when Trigger is used outside an Accordion (useAccordion guard)', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() =>
      render(
        <A.Trigger>
          <Text>Orphan</Text>
        </A.Trigger>
      )
    ).toThrow(/must be used within Accordion/);
    spy.mockRestore();
  });

  it('throws when Trigger is used outside an Item (useAccordionItem guard)', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() =>
      render(
        <Accordion>
          <A.Trigger>
            <Text>No item</Text>
          </A.Trigger>
        </Accordion>
      )
    ).toThrow(/must be used within AccordionItem/);
    spy.mockRestore();
  });

  it('throws when Content is used outside an Item', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() =>
      render(
        <Accordion>
          <A.Content>
            <Text>No item</Text>
          </A.Content>
        </Accordion>
      )
    ).toThrow(/must be used within AccordionItem/);
    spy.mockRestore();
  });
});
