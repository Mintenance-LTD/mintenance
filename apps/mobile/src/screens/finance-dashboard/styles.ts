/**
 * FinanceDashboardScreen — styles split out to keep the screen file
 * under the 300-line MDC cap. Mint Editorial tokens only, no hex.
 */
import { StyleSheet } from 'react-native';
import { me } from '../../design-system/mint-editorial';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: me.bg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: -4,
    marginBottom: 4,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: me.bg2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenHeader: {
    marginTop: 6,
    marginBottom: 16,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: me.brand,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  headline: {
    fontFamily: me.font.display,
    fontSize: 32,
    color: me.ink,
    letterSpacing: me.displayTracking,
  },
  sub: {
    fontSize: 14,
    color: me.ink3,
    marginTop: 4,
  },
  contentBody: {
    marginTop: 18,
  },
  errorCard: {
    backgroundColor: me.surface,
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    marginTop: 16,
    borderWidth: 1,
    borderColor: me.line2,
  },
  errorIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: me.errBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: me.ink,
    marginBottom: 6,
  },
  errorMessage: {
    fontSize: 13,
    color: me.ink2,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 19,
  },
  retryButton: {
    backgroundColor: me.brand,
    borderRadius: 12,
    paddingHorizontal: 22,
    paddingVertical: 11,
  },
  retryText: {
    color: me.onBrand,
    fontSize: 14,
    fontWeight: '700',
  },
  bottomSpacer: {
    height: 20,
  },
});
