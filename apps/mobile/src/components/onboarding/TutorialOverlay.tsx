/**
 * TutorialOverlay Component (React Native)
 * Mobile version of tutorial spotlight with element highlighting
 */

import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Rect, Defs, Mask } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  targetElement?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  position?: 'top' | 'bottom';
}

interface TutorialOverlayProps {
  visible: boolean;
  step: TutorialStep;
  stepIndex: number;
  totalSteps: number;
  onNext: () => void;
  onPrevious?: () => void;
  onSkip: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

export function TutorialOverlay({
  visible,
  step,
  stepIndex,
  totalSteps,
  onNext,
  onPrevious,
  onSkip,
  isFirstStep,
  isLastStep,
}: TutorialOverlayProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  const tooltipPosition = calculateTooltipPosition(step);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onSkip}
    >
      <SafeAreaView style={styles.container}>
        <Animated.View
          style={[
            styles.overlay,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          {/* Dark overlay with spotlight cutout */}
          {step.targetElement && (
            <View style={StyleSheet.absoluteFill}>
              <Svg height={height} width={width}>
                <Defs>
                  <Mask id="mask" x="0" y="0" height="100%" width="100%">
                    <Rect height="100%" width="100%" fill="#fff" />
                    <Rect
                      x={step.targetElement.x - 8}
                      y={step.targetElement.y - 8}
                      width={step.targetElement.width + 16}
                      height={step.targetElement.height + 16}
                      rx={12}
                      fill="#000"
                    />
                  </Mask>
                </Defs>
                <Rect
                  height="100%"
                  width="100%"
                  fill="rgba(0, 0, 0, 0.7)"
                  mask="url(#mask)"
                />
              </Svg>

              {/* Highlight ring */}
              <View
                style={[
                  styles.highlightRing,
                  {
                    top: step.targetElement.y - 8,
                    left: step.targetElement.x - 8,
                    width: step.targetElement.width + 16,
                    height: step.targetElement.height + 16,
                  },
                ]}
              />
            </View>
          )}

          {/* No spotlight - just dark overlay */}
          {!step.targetElement && (
            <View style={[StyleSheet.absoluteFill, styles.darkOverlay]} />
          )}

          {/* Tooltip */}
          <Animated.View
            style={[
              styles.tooltip,
              tooltipPosition,
              {
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            {/* Progress dots */}
            <View style={styles.progressContainer}>
              {Array.from({ length: totalSteps }).map((_, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.progressDot,
                    idx === stepIndex && styles.progressDotActive,
                    idx < stepIndex && styles.progressDotCompleted,
                  ]}
                />
              ))}
            </View>

            {/* Step counter */}
            <Text style={styles.stepCounter}>
              Step {stepIndex + 1} of {totalSteps}
            </Text>

            {/* Title */}
            <Text style={styles.title}>{step.title}</Text>

            {/* Description */}
            <Text style={styles.description}>{step.description}</Text>

            {/* Action buttons */}
            <View style={styles.buttonContainer}>
              {!isFirstStep && onPrevious && (
                <TouchableOpacity
                  onPress={onPrevious}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonText}>Back</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity onPress={onSkip} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Skip</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onNext}
                style={styles.primaryButton}
              >
                <Text style={styles.primaryButtonText}>
                  {isLastStep ? 'Finish' : 'Next'}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      </SafeAreaView>
    </Modal>
  );
}

function calculateTooltipPosition(step: TutorialStep) {
  if (!step.targetElement) {
    // Center the tooltip
    return {
      top: height / 2 - 150,
      left: 20,
      right: 20,
    };
  }

  const position = step.position || 'bottom';
  const spacing = 20;

  if (position === 'top') {
    return {
      bottom: height - step.targetElement.y + spacing,
      left: 20,
      right: 20,
    };
  } else {
    // bottom
    return {
      top: step.targetElement.y + step.targetElement.height + spacing,
      left: 20,
      right: 20,
    };
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    position: 'relative',
  },
  darkOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  highlightRing: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: '#0066CC',
    borderRadius: 12,
    shadowColor: '#0066CC',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  tooltip: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D1D5DB',
    marginRight: 8,
  },
  progressDotActive: {
    width: 24,
    backgroundColor: '#0066CC',
  },
  progressDotCompleted: {
    backgroundColor: '#0066CC',
  },
  stepCounter: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0066CC',
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#0066CC',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default TutorialOverlay;
