/**
 * Sparkline — tiny inline trend chart for the Finance hero.
 *
 * Draws a polyline over a list of revenue points; the line is in
 * `stroke` (defaults to a soft white-with-alpha to sit nicely on the
 * dark forest-mint hero), and the area underneath is filled with the
 * same colour at low alpha for the deck's washed-graph look.
 *
 * Self-handles edge cases: an empty list, a single-point list (renders
 * a flat baseline), and constant series (renders a flat line at the
 * middle of the box rather than collapsing to top/bottom).
 */
import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';

interface Props {
  data: readonly number[];
  width?: number;
  height?: number;
  stroke?: string;
  fillFrom?: string;
  fillTo?: string;
  strokeWidth?: number;
}

const SAMPLE_GRADIENT_ID = 'mintEditorialSparklineFill';

export const Sparkline: React.FC<Props> = ({
  data,
  width = 220,
  height = 56,
  stroke = 'rgba(255,255,255,0.85)',
  fillFrom = 'rgba(255,255,255,0.18)',
  fillTo = 'rgba(255,255,255,0)',
  strokeWidth = 2,
}) => {
  if (!data || data.length === 0) {
    return <View style={{ width, height }} />;
  }

  // For a single point or constant series, draw a flat midline.
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min;
  const yFor = (v: number): number => {
    if (range === 0) return height / 2;
    // Inverted Y — SVG origin is top-left, but the eye expects
    // higher values to render *higher* on the card.
    return height - ((v - min) / range) * (height - 4) - 2;
  };
  const xFor = (i: number): number => {
    if (data.length === 1) return width / 2;
    return (i / (data.length - 1)) * width;
  };

  const points = data.map((v, i) => `${xFor(i)},${yFor(v)}`).join(' ');
  const linePath = `M ${points.replace(/ /g, ' L ')}`;
  // Area path — close back along the bottom for the fill.
  const areaPath = `${linePath} L ${width},${height} L 0,${height} Z`;

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id={SAMPLE_GRADIENT_ID} x1='0' y1='0' x2='0' y2='1'>
          <Stop offset='0' stopColor={fillFrom} />
          <Stop offset='1' stopColor={fillTo} />
        </LinearGradient>
      </Defs>
      <Path d={areaPath} fill={`url(#${SAMPLE_GRADIENT_ID})`} />
      <Path
        d={linePath}
        stroke={stroke}
        strokeWidth={strokeWidth}
        fill='none'
        strokeLinejoin='round'
        strokeLinecap='round'
      />
    </Svg>
  );
};

export default Sparkline;
