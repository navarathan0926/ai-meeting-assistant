'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { registerUser, loginUser } from '@/lib/api/auth';
import { RegisterPayload, LoginPayload } from '@/types/auth';
import { useAuthContext } from '@/providers/AuthProvider';

// ─── useRegister ──────────────────────────────────────────────────────────────

export function useRegister() {
  const { login } = useAuthContext();
  const router = useRouter();

  return useMutation({
    mutationFn: (payload: RegisterPayload) => registerUser(payload),
    onSuccess: (data) => {
      login(data.accessToken, data.user);
      router.push('/');
    },
  });
}

// ─── useLogin ─────────────────────────────────────────────────────────────────

export function useLogin() {
  const { login } = useAuthContext();
  const router = useRouter();

  return useMutation({
    mutationFn: (payload: LoginPayload) => loginUser(payload),
    onSuccess: (data) => {
      login(data.accessToken, data.user);
      router.push('/');
    },
  });
}
