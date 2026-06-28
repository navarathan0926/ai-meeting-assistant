'use client';

import { Suspense, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLogin } from '@/hooks/useAuth';
import { useAuthContext } from '@/providers/AuthProvider';
import { setToken } from '@/lib/auth';

// ─── Schema ───────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

// ─── Google Icon ─────────────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
      <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.962L3.964 6.294C4.672 4.169 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading, login } = useAuthContext();
  const { mutate: loginMutate, isPending, error } = useLogin();
  const [showPassword, setShowPassword] = useState(false);

  // Handle Google OAuth callback token in query param
  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      // Fetch user info and log in
      import('@/lib/axios').then(({ default: apiClient }) => {
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        apiClient.get<{ data: { id: string; email: string; name: string; provider: string } }>('/auth/me').then((res) => {
          login(token, res.data.data);
          router.replace('/');
        });
      });
    }
  }, [searchParams, login, router]);

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/');
    }
  }, [isAuthenticated, isLoading, router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data: LoginFormValues) => {
    loginMutate(data);
  };

  const apiError =
    error && (error as any).response?.data?.message
      ? (error as any).response.data.message
      : error
      ? 'Login failed. Please try again.'
      : null;

  const GOOGLE_AUTH_URL = `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/auth/google`;

  return (
    <div className="auth-card">
      {/* Logo */}
      <div className="auth-logo">
        <span className="text-3xl">🎙️</span>
      </div>

      <h1 className="auth-title">Welcome back</h1>
      <p className="auth-subtitle">Sign in to your AI Meeting Assistant account</p>

      {/* Google OAuth */}
      <a href={GOOGLE_AUTH_URL} className="btn-google" id="btn-google-login">
        <GoogleIcon />
        <span>Continue with Google</span>
      </a>

      {/* Divider */}
      <div className="auth-divider">
        <span>or</span>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="auth-form" id="login-form" noValidate>
        {/* Email */}
        <div className="form-field">
          <label htmlFor="login-email" className="form-label">Email</label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            className={`form-input ${errors.email ? 'form-input--error' : ''}`}
            {...register('email')}
          />
          {errors.email && (
            <p className="form-error">{errors.email.message}</p>
          )}
        </div>

        {/* Password */}
        <div className="form-field">
          <div className="form-label-row">
            <label htmlFor="login-password" className="form-label">Password</label>
            <button type="button" className="forgot-link" tabIndex={-1}>
              Forgot password?
            </button>
          </div>
          <div className="input-wrapper">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              className={`form-input ${errors.password ? 'form-input--error' : ''}`}
              {...register('password')}
            />
            <button
              type="button"
              className="input-eye"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>
          {errors.password && (
            <p className="form-error">{errors.password.message}</p>
          )}
        </div>

        {/* API Error */}
        {apiError && (
          <div className="alert-error" role="alert">{apiError}</div>
        )}

        {/* Submit */}
        <button
          id="btn-login-submit"
          type="submit"
          disabled={isPending}
          className="btn-primary"
        >
          {isPending ? (
            <span className="btn-spinner" />
          ) : (
            'Sign in'
          )}
        </button>
      </form>

      {/* Footer link */}
      <p className="auth-footer">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="auth-link">
          Create one
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="auth-card flex flex-col items-center justify-center py-12">
        <span className="btn-spinner" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
