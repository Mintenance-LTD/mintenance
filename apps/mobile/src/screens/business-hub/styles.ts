/**
 * BusinessHubScreen — styles split out to stay under the 300-line
 * per-file MDC cap. All values come from `me.*` tokens.
 */
import { StyleSheet } from 'react-native';
import { me } from '../../design-system/mint-editorial';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: me.bg,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 22,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: me.brand,
    textTransform: 'uppercase',
    letterSpacing: 1.6,
    marginBottom: 8,
  },
  headline: {
    fontFamily: me.font.display,
    fontSize: 32,
    color: me.ink,
    letterSpacing: me.displayTracking,
    marginBottom: 8,
  },
  sub: {
    fontSize: 14,
    color: me.ink2,
    lineHeight: 20,
    maxWidth: 300,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
  },
  toolCard: {
    width: '50%',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  toolCardInner: {
    backgroundColor: me.surface,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: me.line2,
    ...me.shadow.card,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  toolLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: me.ink,
    marginBottom: 2,
  },
  toolSubtitle: {
    fontSize: 12,
    color: me.ink3,
  },
});
