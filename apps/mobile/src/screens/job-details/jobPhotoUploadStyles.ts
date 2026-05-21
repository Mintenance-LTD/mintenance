/**
 * JobPhotoUploadScreen — Mint Editorial styles.
 * Paper background, serif inline header, brand-fill upload CTA.
 */
import { StyleSheet } from 'react-native';
import { me } from '../../design-system/mint-editorial';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: me.bg,
  },
  topNav: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: me.bg2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Legacy header keys retained for backwards compat with any reader.
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerText: {
    flex: 1,
    marginLeft: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: me.ink,
  },
  headerSubtitle: {
    fontSize: 13,
    color: me.ink2,
    marginTop: 2,
  },
  screenHeader: {
    paddingHorizontal: 20,
    marginTop: 6,
    marginBottom: 18,
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
    fontSize: 30,
    color: me.ink,
    letterSpacing: me.displayTracking,
  },
  sub: {
    fontSize: 14,
    color: me.ink3,
    marginTop: 6,
    lineHeight: 19,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: me.surface,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    marginBottom: 20,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: me.line2,
    ...me.shadow.card,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: me.ink2,
    lineHeight: 19,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  photoItem: {
    width: '47%',
    aspectRatio: 1,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: me.bg2,
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 14,
  },
  uploadedBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 14,
  },
  addPhotoButton: {
    width: '47%',
    aspectRatio: 1,
    borderRadius: 14,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: me.line,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: me.surface,
  },
  addPhotoText: {
    fontSize: 12,
    fontWeight: '700',
    color: me.ink2,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  photoCount: {
    marginTop: 16,
    fontSize: 12,
    color: me.ink3,
    textAlign: 'center',
    fontWeight: '600',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: me.surface,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: me.line,
    ...me.shadow.pop,
  },
  uploadButton: {
    backgroundColor: me.brand,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 54,
  },
  uploadButtonDisabled: {
    opacity: 0.55,
  },
  uploadButtonText: {
    color: me.onBrand,
    fontSize: 15,
    fontWeight: '700',
  },
  uploadProgressContainer: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  progressBarTrack: {
    width: '80%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 4,
    backgroundColor: me.onBrand,
    borderRadius: 2,
  },
});
