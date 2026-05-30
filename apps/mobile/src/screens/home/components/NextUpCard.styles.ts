import { StyleSheet } from 'react-native';
import { me } from '../../../design-system/mint-editorial';

export const styles = StyleSheet.create({
  card: {
    backgroundColor: me.ink,
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    position: 'relative',
    overflow: 'hidden',
  },
  // Faint brand glow in the top-right corner per the design.
  glow: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: me.brand,
    opacity: 0.18,
  },
  inner: { position: 'relative' },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  pulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: me.brand,
    // RN can't render the design's soft-shadow halo cheaply; the brand
    // glow above plus the bright dot are read as "live" together.
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: me.brandSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },
  title: {
    fontFamily: me.font.display,
    fontSize: 24,
    lineHeight: 28,
    color: me.onBrand,
    letterSpacing: me.displayTracking,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(236,244,238,0.7)',
    marginBottom: 14,
  },
  actionRow: { flexDirection: 'row', gap: 8 },
  primaryBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 9999,
    backgroundColor: me.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnDone: { opacity: 0.7 },
  primaryBtnText: {
    color: me.onBrand,
    fontSize: 13,
    fontWeight: '600',
  },
  iconBtn: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 9999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
