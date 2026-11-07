import { StyleSheet } from 'react-native';
import { me } from '../../design-system/mint-editorial';
export const amendmentStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: me.surface },
  content: { padding: 16, paddingBottom: 40, gap: 16 },
  title: { fontSize: 24, color: me.ink, fontWeight: '700' },
  heading: { fontSize: 18, color: me.ink, fontWeight: '600' },
  text: { fontSize: 16, color: me.ink },
  error: { fontSize: 16, color: me.errFg },
  card: {
    borderWidth: 1,
    borderColor: me.line,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  section: { gap: 10 },
  input: {
    minHeight: 48,
    fontSize: 16,
    color: me.ink,
    borderWidth: 1,
    borderColor: me.line,
    padding: 12,
    borderRadius: 8,
  },
  button: {
    minHeight: 48,
    justifyContent: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: me.line,
    borderRadius: 8,
  },
});
