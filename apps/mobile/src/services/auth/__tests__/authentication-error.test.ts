import { authenticationError } from '../authentication-error';
describe('authentication errors', () => {
  it('preserves the confirmation code and gives the next step', () => {
    const error = authenticationError({
      code: 'email_not_confirmed',
      message: 'Email not confirmed',
    });
    expect(error.code).toBe('email_not_confirmed');
    expect(error.message).toMatch(/confirm your email/i);
    expect(error.message).not.toMatch(/database/i);
  });
  it('explains invalid credentials without exposing provider details', () => {
    expect(
      authenticationError({ code: 'invalid_credentials' }).message
    ).toMatch(/reset your password/i);
  });
  it('does not expose arbitrary server errors', () => {
    expect(
      authenticationError({ message: 'private SQL diagnostic' }).message
    ).not.toMatch(/SQL/);
  });
});
