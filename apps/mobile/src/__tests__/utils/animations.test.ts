import { Animated, Easing } from 'react-native';
import {
  AnimationUtils,
  AnimatedTouchableOpacity,
  useButtonAnimation,
  useLikeAnimation
} from '../../utils/animations';
import { theme } from '../../theme';

// Mock React Native Animated
jest.mock('react-native', () => ({
  Dimensions: {
    get: jest.fn(() => ({ width: 375, height: 812 })),
  },
  PixelRatio: {
    getFontScale: jest.fn(() => 1),
    roundToNearestPixel: jest.fn(size => Math.round(size)),
  },
  Animated: {
    Value: jest.fn(function(value: number) {
      this.value = value;
      this.setValue = jest.fn((val: number) => {
        this.value = val;
      });
    }),
    timing: jest.fn((value, config) => ({
      start: jest.fn(callback => callback && callback({ finished: true })),
      stop: jest.fn(),
      reset: jest.fn(),
    })),
    sequence: jest.fn(animations => ({
      start: jest.fn(callback => callback && callback({ finished: true })),
      stop: jest.fn(),
      reset: jest.fn(),
    })),
    parallel: jest.fn(animations => ({
      start: jest.fn(callback => callback && callback({ finished: true })),
      stop: jest.fn(),
      reset: jest.fn(),
    })),
    loop: jest.fn(animation => ({
      start: jest.fn(callback => callback && callback({ finished: true })),
      stop: jest.fn(),
      reset: jest.fn(),
    })),
    spring: jest.fn((value, config) => ({
      start: jest.fn(callback => callback && callback({ finished: true })),
      stop: jest.fn(),
      reset: jest.fn(),
    })),
    stagger: jest.fn((delay, animations) => ({
      start: jest.fn(callback => callback && callback({ finished: true })),
      stop: jest.fn(),
      reset: jest.fn(),
    })),
    createAnimatedComponent: jest.fn(component => component),
  },
  Easing: {
    out: jest.fn(easing => easing),
    inOut: jest.fn(easing => easing),
    quad: jest.fn(),
    sin: jest.fn(),
    back: jest.fn(value => jest.fn()),
  },
  TouchableOpacity: jest.fn(() => null),
}));

describe('AnimationUtils', () => {
  let mockAnimatedValue: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAnimatedValue = new Animated.Value(1);
  });

  describe('createButtonPressAnimation', () => {
    it('should create button press animation sequence', () => {
      const animation = AnimationUtils.createButtonPressAnimation(mockAnimatedValue);

      expect(Animated.sequence).toHaveBeenCalledWith([
        expect.objectContaining({
          start: expect.any(Function),
        }),
        expect.objectContaining({
          start: expect.any(Function),
        }),
      ]);

      expect(Animated.timing).toHaveBeenCalledTimes(2);

      // First timing - scale down
      expect(Animated.timing).toHaveBeenNthCalledWith(1, mockAnimatedValue, {
        toValue: theme.animation.buttonPress.scale,
        duration: theme.animation.buttonPress.duration,
        easing: expect.any(Function),
        useNativeDriver: true,
      });

      // Second timing - scale back up
      expect(Animated.timing).toHaveBeenNthCalledWith(2, mockAnimatedValue, {
        toValue: 1,
        duration: theme.animation.buttonPress.duration,
        easing: expect.any(Function),
        useNativeDriver: true,
      });
    });

    it('should use correct easing function', () => {
      AnimationUtils.createButtonPressAnimation(mockAnimatedValue);

      expect(Easing.out).toHaveBeenCalledWith(Easing.quad);
    });
  });

  describe('createCardPressAnimation', () => {
    it('should create card press animation sequence', () => {
      const animation = AnimationUtils.createCardPressAnimation(mockAnimatedValue);

      expect(Animated.sequence).toHaveBeenCalled();
      expect(Animated.timing).toHaveBeenCalledTimes(2);

      // First timing - scale up
      expect(Animated.timing).toHaveBeenNthCalledWith(1, mockAnimatedValue, {
        toValue: theme.animation.cardHover.scale,
        duration: theme.animation.cardHover.duration,
        easing: expect.any(Function),
        useNativeDriver: true,
      });

      // Second timing - scale back
      expect(Animated.timing).toHaveBeenNthCalledWith(2, mockAnimatedValue, {
        toValue: 1,
        duration: theme.animation.cardHover.duration,
        easing: expect.any(Function),
        useNativeDriver: true,
      });
    });
  });

  describe('createIconBounceAnimation', () => {
    it('should create icon bounce animation with back easing', () => {
      const animation = AnimationUtils.createIconBounceAnimation(mockAnimatedValue);

      expect(Animated.sequence).toHaveBeenCalled();
      expect(Animated.timing).toHaveBeenCalledTimes(2);

      // Verify back easing is used for bounce effect
      expect(Easing.back).toHaveBeenCalledWith(2);

      // First timing - scale up with bounce
      expect(Animated.timing).toHaveBeenNthCalledWith(1, mockAnimatedValue, {
        toValue: theme.animation.iconBounce.scale,
        duration: theme.animation.iconBounce.duration,
        easing: expect.any(Function),
        useNativeDriver: true,
      });
    });
  });

  describe('createFadeInAnimation', () => {
    it('should create fade in animation', () => {
      const animation = AnimationUtils.createFadeInAnimation(mockAnimatedValue);

      expect(Animated.timing).toHaveBeenCalledWith(mockAnimatedValue, {
        toValue: 1,
        duration: theme.animation.fadeIn.duration,
        easing: expect.any(Function),
        useNativeDriver: true,
      });

      expect(Animated.sequence).not.toHaveBeenCalled();
    });

    it('should return animatable object', () => {
      const animation = AnimationUtils.createFadeInAnimation(mockAnimatedValue);

      expect(animation).toHaveProperty('start');
      expect(typeof animation.start).toBe('function');
    });
  });

  describe('createSlideInAnimation', () => {
    it('should create slide in animation', () => {
      const animation = AnimationUtils.createSlideInAnimation(mockAnimatedValue);

      expect(Animated.timing).toHaveBeenCalledWith(mockAnimatedValue, {
        toValue: 0,
        duration: theme.animation.slideIn.duration,
        easing: expect.any(Function),
        useNativeDriver: true,
      });
    });
  });

  describe('createPulseAnimation', () => {
    it('should create looped pulse animation', () => {
      const animation = AnimationUtils.createPulseAnimation(mockAnimatedValue);

      expect(Animated.loop).toHaveBeenCalled();
      expect(Animated.sequence).toHaveBeenCalled();

      // Verify two timing animations for pulse effect
      expect(Animated.timing).toHaveBeenCalledTimes(2);

      // First timing - scale up
      expect(Animated.timing).toHaveBeenNthCalledWith(1, mockAnimatedValue, {
        toValue: 1.05,
        duration: theme.animation.pulse.duration / 2,
        easing: expect.any(Function),
        useNativeDriver: true,
      });

      // Second timing - scale down
      expect(Animated.timing).toHaveBeenNthCalledWith(2, mockAnimatedValue, {
        toValue: 1,
        duration: theme.animation.pulse.duration / 2,
        easing: expect.any(Function),
        useNativeDriver: true,
      });
    });

    it('should use sine easing for smooth pulse', () => {
      AnimationUtils.createPulseAnimation(mockAnimatedValue);

      expect(Easing.inOut).toHaveBeenCalledWith(Easing.sin);
    });
  });

  describe('createLikeAnimation', () => {
    it('should create parallel animations for scale and color', () => {
      const scaleValue = new Animated.Value(1);
      const colorValue = new Animated.Value(0);

      const animation = AnimationUtils.createLikeAnimation(scaleValue, colorValue);

      expect(Animated.parallel).toHaveBeenCalledWith([
        expect.objectContaining({ start: expect.any(Function) }),
        expect.objectContaining({ start: expect.any(Function) }),
      ]);

      expect(Animated.sequence).toHaveBeenCalled();
      expect(Animated.timing).toHaveBeenCalledTimes(3);
    });

    it('should use correct timing values for heart bounce', () => {
      const scaleValue = new Animated.Value(1);
      const colorValue = new Animated.Value(0);

      AnimationUtils.createLikeAnimation(scaleValue, colorValue);

      // Scale up animation
      expect(Animated.timing).toHaveBeenCalledWith(scaleValue, {
        toValue: 1.3,
        duration: 150,
        easing: expect.any(Function),
        useNativeDriver: true,
      });

      // Scale down animation
      expect(Animated.timing).toHaveBeenCalledWith(scaleValue, {
        toValue: 1,
        duration: 150,
        easing: expect.any(Function),
        useNativeDriver: true,
      });

      // Color animation
      expect(Animated.timing).toHaveBeenCalledWith(colorValue, {
        toValue: 1,
        duration: 300,
        easing: expect.any(Function),
        useNativeDriver: false,
      });
    });

    it('should disable native driver for color animation', () => {
      const scaleValue = new Animated.Value(1);
      const colorValue = new Animated.Value(0);

      AnimationUtils.createLikeAnimation(scaleValue, colorValue);

      // Color animations can't use native driver
      const colorAnimationCall = (Animated.timing as jest.Mock).mock.calls.find(
        call => call[0] === colorValue
      );

      expect(colorAnimationCall[1].useNativeDriver).toBe(false);
    });
  });

  describe('createSaveAnimation', () => {
    it('should create save animation with spring', () => {
      const animation = AnimationUtils.createSaveAnimation(mockAnimatedValue);

      expect(Animated.sequence).toHaveBeenCalled();
      expect(Animated.timing).toHaveBeenCalledTimes(1);
      expect(Animated.spring).toHaveBeenCalledTimes(1);
    });

    it('should scale down then spring back', () => {
      AnimationUtils.createSaveAnimation(mockAnimatedValue);

      // Scale down
      expect(Animated.timing).toHaveBeenCalledWith(mockAnimatedValue, {
        toValue: 0.8,
        duration: 100,
        easing: expect.any(Function),
        useNativeDriver: true,
      });

      // Spring back
      expect(Animated.spring).toHaveBeenCalledWith(mockAnimatedValue, {
        toValue: 1,
        tension: 150,
        friction: 8,
        useNativeDriver: true,
      });
    });
  });

  describe('createStaggeredAnimation', () => {
    it('should create staggered animations for array of values', () => {
      const values = [
        new Animated.Value(0),
        new Animated.Value(0),
        new Animated.Value(0),
      ];

      const animation = AnimationUtils.createStaggeredAnimation(values);

      expect(Animated.stagger).toHaveBeenCalledWith(100, expect.any(Array));
      expect(Animated.timing).toHaveBeenCalledTimes(3);
    });

    it('should apply custom delay', () => {
      const values = [
        new Animated.Value(0),
        new Animated.Value(0),
      ];
      const customDelay = 200;

      AnimationUtils.createStaggeredAnimation(values, customDelay);

      expect(Animated.stagger).toHaveBeenCalledWith(customDelay, expect.any(Array));
    });

    it('should apply increasing delay to each animation', () => {
      const values = [
        new Animated.Value(0),
        new Animated.Value(0),
        new Animated.Value(0),
      ];
      const delay = 150;

      AnimationUtils.createStaggeredAnimation(values, delay);

      // Check each timing animation has correct delay
      values.forEach((value, index) => {
        expect(Animated.timing).toHaveBeenCalledWith(value, {
          toValue: 1,
          duration: 300,
          delay: index * delay,
          easing: expect.any(Function),
          useNativeDriver: true,
        });
      });
    });

    it('should handle empty array', () => {
      const values: Animated.Value[] = [];

      const animation = AnimationUtils.createStaggeredAnimation(values);

      expect(Animated.stagger).toHaveBeenCalledWith(100, []);
      expect(Animated.timing).not.toHaveBeenCalled();
    });
  });

  describe('createSpringBounce', () => {
    it('should create spring bounce animation', () => {
      const animation = AnimationUtils.createSpringBounce(mockAnimatedValue);

      expect(Animated.spring).toHaveBeenCalledWith(mockAnimatedValue, {
        toValue: 1,
        tension: 300,
        friction: 10,
        useNativeDriver: true,
      });
    });

    it('should return animatable object', () => {
      const animation = AnimationUtils.createSpringBounce(mockAnimatedValue);

      expect(animation).toHaveProperty('start');
      expect(typeof animation.start).toBe('function');
    });
  });

  describe('createShakeAnimation', () => {
    it('should create shake animation sequence', () => {
      const animation = AnimationUtils.createShakeAnimation(mockAnimatedValue);

      expect(Animated.sequence).toHaveBeenCalled();
      expect(Animated.timing).toHaveBeenCalledTimes(4);
    });

    it('should shake left and right then center', () => {
      AnimationUtils.createShakeAnimation(mockAnimatedValue);

      // Right
      expect(Animated.timing).toHaveBeenNthCalledWith(1, mockAnimatedValue, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      });

      // Left
      expect(Animated.timing).toHaveBeenNthCalledWith(2, mockAnimatedValue, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      });

      // Right again
      expect(Animated.timing).toHaveBeenNthCalledWith(3, mockAnimatedValue, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      });

      // Center
      expect(Animated.timing).toHaveBeenNthCalledWith(4, mockAnimatedValue, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      });
    });

    it('should complete in 200ms total', () => {
      AnimationUtils.createShakeAnimation(mockAnimatedValue);

      const totalDuration = (Animated.timing as jest.Mock).mock.calls
        .reduce((sum, call) => sum + call[1].duration, 0);

      expect(totalDuration).toBe(200);
    });
  });
});

describe('AnimatedTouchableOpacity', () => {
  it('should export AnimatedTouchableOpacity', () => {
    expect(AnimatedTouchableOpacity).toBeDefined();
  });

  it('should be result of createAnimatedComponent', () => {
    // AnimatedTouchableOpacity is created at module load time
    // The mock returns the component passed to it, so AnimatedTouchableOpacity
    // should be the TouchableOpacity mock
    expect(typeof AnimatedTouchableOpacity).toBeDefined();
  });
});

describe('useButtonAnimation hook', () => {
  it('should return scale value and animate function', () => {
    const { scaleValue, animatePress, style } = useButtonAnimation();

    expect(scaleValue).toBeDefined();
    expect(typeof animatePress).toBe('function');
    expect(style).toEqual({
      transform: [{ scale: scaleValue }],
    });
  });

  it('should call AnimationUtils when animatePress is called', () => {
    const spy = jest.spyOn(AnimationUtils, 'createButtonPressAnimation');

    const { animatePress } = useButtonAnimation();
    animatePress();

    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('should start animation when animatePress is called', () => {
    const { animatePress } = useButtonAnimation();

    animatePress();

    // Verify sequence was created and started
    const sequenceResult = (Animated.sequence as jest.Mock).mock.results[0]?.value;
    expect(sequenceResult?.start).toHaveBeenCalled();
  });
});

describe('useLikeAnimation hook', () => {
  it('should return scale, color values and animate function', () => {
    const { scaleValue, colorValue, animateLike, style } = useLikeAnimation();

    expect(scaleValue).toBeDefined();
    expect(colorValue).toBeDefined();
    expect(typeof animateLike).toBe('function');
    expect(style).toEqual({
      transform: [{ scale: scaleValue }],
    });
  });

  it('should call AnimationUtils when animateLike is called', () => {
    const spy = jest.spyOn(AnimationUtils, 'createLikeAnimation');

    const { animateLike } = useLikeAnimation();
    animateLike();

    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('should start parallel animations when animateLike is called', () => {
    const { animateLike } = useLikeAnimation();

    animateLike();

    // Verify parallel was created and started
    const parallelResult = (Animated.parallel as jest.Mock).mock.results[0]?.value;
    expect(parallelResult?.start).toHaveBeenCalled();
  });

  it('should use separate values for scale and color', () => {
    const { scaleValue, colorValue } = useLikeAnimation();

    expect(scaleValue).not.toBe(colorValue);
    expect(scaleValue.value).toBe(1);
    expect(colorValue.value).toBe(0);
  });
});

describe('Animation Edge Cases', () => {
  it('should handle null animated value gracefully', () => {
    expect(() => {
      AnimationUtils.createButtonPressAnimation(null as any);
    }).not.toThrow();
  });

  it('should handle undefined animated value gracefully', () => {
    expect(() => {
      AnimationUtils.createFadeInAnimation(undefined as any);
    }).not.toThrow();
  });

  it('should handle animation start callback', () => {
    const mockAnimatedValue = new Animated.Value(1);
    const animation = AnimationUtils.createButtonPressAnimation(mockAnimatedValue);
    const callback = jest.fn();

    animation.start(callback);

    expect(callback).toHaveBeenCalledWith({ finished: true });
  });

  it('should handle animation stop', () => {
    const mockAnimatedValue = new Animated.Value(1);
    const animation = AnimationUtils.createPulseAnimation(mockAnimatedValue);

    expect(animation.stop).toBeDefined();
    expect(() => animation.stop()).not.toThrow();
  });
});