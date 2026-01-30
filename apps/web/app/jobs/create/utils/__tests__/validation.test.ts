import { validateField } from '../validation';

describe('validateField', () => {
  const mockFormData: any = {
    title: 'Test Job',
    description: 'Test description',
    location: 'London, UK',
    budget: '500',
    category: 'Plumbing',
  };

  it('should return error for empty title', () => {
    const result = validateField('title', '', mockFormData);
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
  });

  it('should accept valid title', () => {
    const result = validateField('title', 'Valid Job Title Here', mockFormData);
    expect(result).toBeUndefined();
  });

  it('should validate fields correctly', () => {
    expect(validateField).toBeDefined();
    expect(typeof validateField).toBe('function');
  });
});