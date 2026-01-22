import environmentSecure from '../environment.secure';

describe('environment.secure', () => {
  it('exports the secure configuration object', () => {
    expect(environmentSecure).toBeDefined();
    expect(typeof environmentSecure.SUPABASE_URL).toBe('string');
    expect(typeof environmentSecure.SUPABASE_ANON_KEY).toBe('string');
  });
});
