import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  TouchableOpacity,
  LayoutChangeEvent,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { me } from '../../design-system/mint-editorial';

/**
 * Lightweight SVG-based signature capture.
 *
 * 2026-05-27 audit-P0-4. The mobile contract-sign flow accepted a
 * tap-to-confirm Alert with no captured artifact, which is not
 * defensible evidence in a contract dispute. This component uses
 * PanResponder + react-native-svg to record stroke paths client-side
 * (no extra native dependency, no WebView), then serialises them to a
 * standalone inline SVG string the API can persist immutably.
 *
 * Design notes:
 *  - Each finger-down → finger-up generates one Path with an M start
 *    and zero or more L points. Multiple strokes are kept as separate
 *    Paths so the rendered signature looks identical to the on-canvas
 *    drawing.
 *  - The serialised SVG carries `viewBox` so downstream renderers
 *    scale it to any container. No PNG conversion needed.
 *  - Min stroke threshold (3 segments) avoids submitting an accidental
 *    tap as a valid signature.
 *  - The canvas dimensions are measured from layout so the serialised
 *    viewBox matches what the user actually drew.
 */

interface Props {
  /** Called when the user taps Sign and the signature is non-trivial. */
  onSign: (svg: string) => void;
  /** Called when the user cancels. */
  onCancel: () => void;
  /** Whether the parent is currently submitting (disables buttons). */
  submitting?: boolean;
  /** Label above the canvas. Defaults to "Sign here". */
  label?: string;
}

interface Stroke {
  path: string;
}

const STROKE_COLOR = me.ink;
const STROKE_WIDTH = 2.5;
const MIN_VALID_SEGMENTS = 3;

export function SignatureCanvas({
  onSign,
  onCancel,
  submitting = false,
  label = 'Sign here',
}: Props) {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  // Current in-progress stroke + total segments are held in refs so
  // PanResponder can mutate them 60×/sec without forcing extra
  // re-renders on every move. We do still call setStrokes once per
  // move so the SVG redraws.
  const activeStroke = useRef<string>('');
  const segmentCount = useRef<number>(0);
  // True while the current finger-down is still active. Used so
  // onPanResponderMove can decide whether to push a new stroke or
  // extend the last one.
  const strokeInProgress = useRef<boolean>(false);

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ w: width, h: height });
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        activeStroke.current = `M${locationX.toFixed(1)} ${locationY.toFixed(1)}`;
        strokeInProgress.current = true;
        // Push a fresh stroke onto the list — onPanResponderMove will
        // mutate this tail entry as the finger moves.
        setStrokes((prev) => [...prev, { path: activeStroke.current }]);
      },
      onPanResponderMove: (evt) => {
        if (!strokeInProgress.current) return;
        const { locationX, locationY } = evt.nativeEvent;
        activeStroke.current += ` L${locationX.toFixed(1)} ${locationY.toFixed(1)}`;
        segmentCount.current += 1;
        // Replace the tail entry with the updated path. New array
        // reference so React re-renders.
        setStrokes((prev) => {
          if (prev.length === 0) return prev;
          const next = prev.slice(0, -1);
          next.push({ path: activeStroke.current });
          return next;
        });
      },
      onPanResponderRelease: () => {
        strokeInProgress.current = false;
        activeStroke.current = '';
      },
      onPanResponderTerminate: () => {
        strokeInProgress.current = false;
        activeStroke.current = '';
      },
    })
  ).current;

  function handleClear() {
    setStrokes([]);
    segmentCount.current = 0;
  }

  function handleSign() {
    if (segmentCount.current < MIN_VALID_SEGMENTS || size.w === 0) return;
    const viewBox = `0 0 ${size.w.toFixed(0)} ${size.h.toFixed(0)}`;
    const paths = strokes
      .map(
        (s) =>
          `<path d="${escapeAttr(s.path)}" stroke="${STROKE_COLOR}" stroke-width="${STROKE_WIDTH}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
      )
      .join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${paths}</svg>`;
    onSign(svg);
  }

  const canSign = segmentCount.current >= MIN_VALID_SEGMENTS && !submitting;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      <View
        style={styles.canvas}
        onLayout={handleLayout}
        {...panResponder.panHandlers}
      >
        <Svg width='100%' height='100%' viewBox={`0 0 ${size.w} ${size.h}`}>
          {strokes.map((s, i) => (
            <Path
              key={i}
              d={s.path}
              stroke={STROKE_COLOR}
              strokeWidth={STROKE_WIDTH}
              fill='none'
              strokeLinecap='round'
              strokeLinejoin='round'
            />
          ))}
        </Svg>

        {strokes.length === 0 && (
          <View pointerEvents='none' style={styles.placeholder}>
            <Text style={styles.placeholderText}>Use your finger to sign</Text>
          </View>
        )}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          onPress={handleClear}
          disabled={submitting || strokes.length === 0}
          style={[
            styles.secondaryButton,
            (submitting || strokes.length === 0) && styles.disabled,
          ]}
        >
          <Text style={styles.secondaryButtonText}>Clear</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onCancel}
          disabled={submitting}
          style={[styles.secondaryButton, submitting && styles.disabled]}
        >
          <Text style={styles.secondaryButtonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSign}
          disabled={!canSign}
          style={[styles.primaryButton, !canSign && styles.disabled]}
        >
          <Text style={styles.primaryButtonText}>
            {submitting ? 'Signing…' : 'Sign'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function escapeAttr(s: string): string {
  return s.replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: me.surface,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: me.ink2,
  },
  canvas: {
    height: 200,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: me.line,
    borderRadius: 12,
    backgroundColor: me.surface,
    overflow: 'hidden',
  },
  placeholder: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: me.ink3,
    fontSize: 14,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  primaryButton: {
    backgroundColor: me.brand,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  primaryButtonText: {
    color: me.onBrand,
    fontWeight: '700',
    fontSize: 15,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: me.line,
  },
  secondaryButtonText: {
    color: me.ink2,
    fontWeight: '500',
    fontSize: 15,
  },
  disabled: {
    opacity: 0.4,
  },
});
