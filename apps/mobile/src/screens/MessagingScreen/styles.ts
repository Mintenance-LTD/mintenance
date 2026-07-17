import { StyleSheet } from 'react-native';
import { me } from '../../design-system/mint-editorial';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: me.bg2,
  },
  responsiveContainer: {
    flex: 1,
  },
  keyboardContainer: {
    flex: 1,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
  },

  // Typing indicator
  typingRow: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: me.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    borderBottomLeftRadius: 6,
    gap: 8,
  },
  typingDots: {
    flexDirection: 'row',
    gap: 3,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: me.ink3,
  },
  dot1: {
    opacity: 0.4,
  },
  dot2: {
    opacity: 0.6,
  },
  dot3: {
    opacity: 0.8,
  },
  typingName: {
    fontSize: 12,
    color: me.ink3,
    fontStyle: 'italic',
  },

  videoCallOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 1000,
    backgroundColor: me.bg2,
  },

  // Quick Quote Modal
  quoteOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  quoteCard: {
    backgroundColor: me.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 36,
    ...me.shadow.pop,
  },
  quoteHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: me.line,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 16,
  },
  quoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  quoteIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: me.bg2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quoteTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: me.ink,
    letterSpacing: -0.3,
  },
  quoteSubtitle: {
    fontSize: 13,
    color: me.ink2,
    marginTop: 1,
  },
  quoteCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: me.bg2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quoteJobPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: me.bg2,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginBottom: 18,
  },
  quoteJobText: {
    fontSize: 13,
    color: me.ink2,
    fontWeight: '500',
  },
  quoteLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: me.ink2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  quoteAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: me.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: me.line,
  },
  quoteCurrency: {
    fontSize: 24,
    fontWeight: '700',
    color: me.ink,
    marginRight: 4,
  },
  quoteAmountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: me.ink,
    paddingVertical: 14,
  },
  quoteDescInput: {
    backgroundColor: me.surface,
    borderRadius: 16,
    padding: 14,
    fontSize: 15,
    color: me.ink,
    borderWidth: 1,
    borderColor: me.line,
    minHeight: 80,
    marginBottom: 20,
  },
  quoteActions: {
    flexDirection: 'row',
    gap: 10,
  },
  quoteFullBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 28,
    backgroundColor: me.surface,
    borderWidth: 1.5,
    borderColor: me.line,
  },
  quoteFullBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: me.ink,
  },
  quoteSendBtn: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 28,
    backgroundColor: me.brand,
  },
  quoteSendBtnDisabled: {
    opacity: 0.4,
  },
  quoteSendBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: me.onBrand,
  },
});
