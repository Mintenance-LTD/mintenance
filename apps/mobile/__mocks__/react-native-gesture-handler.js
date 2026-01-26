import React from 'react';

export const State = {
  UNDETERMINED: 0,
  FAILED: 1,
  BEGAN: 2,
  CANCELLED: 3,
  ACTIVE: 4,
  END: 5,
};

export const Directions = {
  RIGHT: 1,
  LEFT: 2,
  UP: 4,
  DOWN: 8,
};

const createMockComponent = (name) => {
  return React.forwardRef((props, ref) => {
    return React.createElement('View', { ...props, ref });
  });
};

export const BaseButton = createMockComponent('BaseButton');
export const BorderlessButton = createMockComponent('BorderlessButton');
export const RawButton = createMockComponent('RawButton');
export const RectButton = createMockComponent('RectButton');

export const FlatList = createMockComponent('FlatList');
export const ScrollView = createMockComponent('ScrollView');
export const Switch = createMockComponent('Switch');
export const TextInput = createMockComponent('TextInput');
export const DrawerLayout = createMockComponent('DrawerLayout');

export const NativeViewGestureHandler = createMockComponent('NativeViewGestureHandler');
export const TapGestureHandler = createMockComponent('TapGestureHandler');
export const LongPressGestureHandler = createMockComponent('LongPressGestureHandler');
export const PanGestureHandler = createMockComponent('PanGestureHandler');
export const PinchGestureHandler = createMockComponent('PinchGestureHandler');
export const RotationGestureHandler = createMockComponent('RotationGestureHandler');
export const FlingGestureHandler = createMockComponent('FlingGestureHandler');
export const ForceTouchGestureHandler = createMockComponent('ForceTouchGestureHandler');

export const GestureHandlerRootView = ({ children }) => children;
export const GestureDetector = ({ children }) => children;

export const gestureHandlerRootHOC = (Component) => Component;
export const TouchableOpacity = createMockComponent('TouchableOpacity');
export const TouchableHighlight = createMockComponent('TouchableHighlight');
export const TouchableWithoutFeedback = createMockComponent('TouchableWithoutFeedback');
export const TouchableNativeFeedback = createMockComponent('TouchableNativeFeedback');

export const Swipeable = createMockComponent('Swipeable');

export default {
  State,
  Directions,
  BaseButton,
  BorderlessButton,
  RawButton,
  RectButton,
  FlatList,
  ScrollView,
  Switch,
  TextInput,
  DrawerLayout,
  NativeViewGestureHandler,
  TapGestureHandler,
  LongPressGestureHandler,
  PanGestureHandler,
  PinchGestureHandler,
  RotationGestureHandler,
  FlingGestureHandler,
  ForceTouchGestureHandler,
  GestureHandlerRootView,
  GestureDetector,
  gestureHandlerRootHOC,
  TouchableOpacity,
  TouchableHighlight,
  TouchableWithoutFeedback,
  TouchableNativeFeedback,
  Swipeable,
};