import { validateAuthFields } from '../useAuthForm';

describe('validateAuthFields', () => {
  it('accepts a valid login without requiring a name', () => {
    expect(
      validateAuthFields(
        { email: 'creator@example.com', name: '', password: 'securepass' },
        'login',
      ),
    ).toEqual({ email: undefined, name: undefined, password: undefined });
  });

  it('requires a name when signing up', () => {
    expect(
      validateAuthFields(
        { email: 'creator@example.com', name: '', password: 'securepass' },
        'signup',
      ).name,
    ).toBe('Enter your name.');
  });

  it('rejects an invalid email and a short password', () => {
    const errors = validateAuthFields(
      { email: 'not-an-email', name: 'Arawa Creator', password: 'short' },
      'signup',
    );

    expect(errors.email).toBe('Enter a valid email.');
    expect(errors.password).toBe('Use at least 8 characters.');
  });
});
