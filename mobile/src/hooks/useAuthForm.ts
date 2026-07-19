import { useMemo, useState } from 'react';

export function useAuthForm(mode: 'login' | 'signup') {
  const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [name,setName]=useState(''); const [submitted,setSubmitted]=useState(false);
  const errors=useMemo(()=>({name: submitted && mode==='signup' && name.trim().length<2 ? 'Enter your name.' : undefined,email: submitted && !/^\S+@\S+\.\S+$/.test(email) ? 'Enter a valid email.' : undefined,password: submitted && password.length<8 ? 'Use at least 8 characters.' : undefined}),[email,mode,name,password,submitted]);
  const valid=!errors.name&&!errors.email&&!errors.password && /^\S+@\S+\.\S+$/.test(email) && password.length>=8 && (mode==='login'||name.trim().length>=2);
  return {email,setEmail,password,setPassword,name,setName,errors,submit:()=>{setSubmitted(true);return valid;}};
}

