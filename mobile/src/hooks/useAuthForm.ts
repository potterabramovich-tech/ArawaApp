import { useMemo, useState } from 'react';

export type AuthMode = 'login' | 'signup';

export interface AuthFields {
  email: string;
  name: string;
  password: string;
}

export interface AuthErrors {
  email?: string;
  name?: string;
  password?: string;
}

export function validateAuthFields(fields: AuthFields, mode: AuthMode): AuthErrors {
  return {
    name: mode === 'signup' && fields.name.trim().length < 2 ? 'Enter your name.' : undefined,
    email: !/^\S+@\S+\.\S+$/.test(fields.email) ? 'Enter a valid email.' : undefined,
    password: fields.password.length < 8 ? 'Use at least 8 characters.' : undefined,
  };
}

export function useAuthForm(mode: AuthMode) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const validation = useMemo(
    () => validateAuthFields({ email, name, password }, mode),
    [email, mode, name, password],
  );
  const errors = submitted ? validation : {};
  const valid = !validation.name && !validation.email && !validation.password;

  return {
    email,
    setEmail,
    password,
    setPassword,
    name,
    setName,
    errors,
    submit: () => {
      setSubmitted(true);
      return valid;
    },
  };
}
