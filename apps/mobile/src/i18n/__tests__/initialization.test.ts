jest.mock('../../utils/haptics', () => ({
  __esModule: true,
  default: { selection: jest.fn() },
}));
jest.mock('../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

async function load(preference: string | null, device = 'en') {
  jest.resetModules();
  // Use the same mocked platform instances that the newly imported initializer sees.
  const storageModule = require('@react-native-async-storage/async-storage');
  const storage = storageModule.default ?? storageModule;
  const localize = require('react-native-localize');
  storage.getItem.mockResolvedValue(preference);
  localize.getLocales.mockReturnValue([{ languageCode: device }]);
  global.__DEV__ = false;
  const module = require('../index');
  if (!module.default.isInitialized)
    await new Promise<void>((resolve) =>
      module.default.on('initialized', () => resolve())
    );
  return { ...module, storage };
}

describe('real i18next mobile initialization', () => {
  it('uses the saved language before the device locale', async () => {
    const app = await load('fr', 'es');
    expect(app.default.t('common.save')).toBe('Sauvegarder');
    expect(app.getCurrentLanguage()).toBe('fr');
  });
  it('uses a supported device locale without a saved preference', async () => {
    const app = await load(null, 'es');
    expect(app.default.t('common.save')).toBe('Guardar');
  });
  it('falls back to English for unsupported device locales', async () => {
    const app = await load(null, 'de');
    expect(app.default.t('common.save')).toBe('Save');
  });
  it('switches real translation resources and persists the choice', async () => {
    const app = await load(null);
    for (const [language, text] of [
      ['es', 'Guardar'],
      ['fr', 'Sauvegarder'],
      ['en', 'Save'],
    ]) {
      await app.changeLanguage(language);
      expect(app.default.t('common.save')).toBe(text);
      expect(app.storage.setItem).toHaveBeenCalledWith(
        'user_language_preference',
        language
      );
    }
  });
  it('retains interpolation, pluralization and legitimate nesting', async () => {
    const app = await load(null);
    app.default.addResourceBundle('en', 'regression', {
      greet: 'Hello {{name}}',
      count_one: '{{count}} job',
      count_other: '{{count}} jobs',
      nested: '$t(common.save)',
    });
    expect(app.default.t('regression:greet', { name: 'Alex' })).toBe(
      'Hello Alex'
    );
    expect(app.default.t('regression:count', { count: 2 })).toBe('2 jobs');
    expect(app.default.t('regression:nested')).toBe('Save');
  });
});
