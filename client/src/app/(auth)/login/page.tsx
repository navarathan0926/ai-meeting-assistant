'use client';

import { Suspense, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLogin } from '@/hooks/useAuth';
import { useAuthContext } from '@/providers/AuthProvider';
import { useAuthConfig } from '@/hooks/useAuthConfig';
import { exchangeOAuthCode } from '@/lib/api/auth';
import { getApiErrorCode, getUserFacingErrorMessage } from '@/lib/api/auth-errors';
import { getDefaultAppPath } from '@/lib/auth-routes';
import { GOOGLE_AUTH_URL } from '@/lib/auth-urls';
import { AUTH_ERROR_CODES, AuthLoginRedirectError } from '@/types/auth';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

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

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading, login, user } = useAuthContext();
  const { mutate: loginMutate, isPending, error } = useLogin();
  const { data: authConfig } = useAuthConfig();
  const [showPassword, setShowPassword] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [registrationDisabledMessage, setRegistrationDisabledMessage] =
    useState<string | null>(null);
  const [isExchangingCode, setIsExchangingCode] = useState(false);
  const [highlightGoogle, setHighlightGoogle] = useState(false);

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam === AuthLoginRedirectError.GOOGLE_AUTH_FAILED) {
      setOauthError('Google sign-in was cancelled or failed. Please try again.');
      window.history.replaceState(null, '', '/login');
      return;
    }

    if (errorParam === AuthLoginRedirectError.REGISTRATION_DISABLED) {
      setRegistrationDisabledMessage(
        'Public registration is disabled. Contact your organization admin for access.',
      );
      window.history.replaceState(null, '', '/login');
      return;
    }

    if (errorParam === AuthLoginRedirectError.ORGANIZATION_SUSPENDED) {
      setOauthError(
        'Your organization has been suspended. Contact platform support.',
      );
      window.history.replaceState(null, '', '/login');
      return;
    }

    if (errorParam === AuthLoginRedirectError.ORGANIZATION_REQUIRED) {
      setOauthError(
        'Your account is not assigned to an organization. Contact platform support.',
      );
      window.history.replaceState(null, '', '/login');
      return;
    }

    if (errorParam === AuthLoginRedirectError.USER_SUSPENDED) {
      setOauthError(
        'This account has been suspended. Contact your organization admin.',
      );
      window.history.replaceState(null, '', '/login');
      return;
    }

    const messageParam = searchParams.get('message');
    if (messageParam === AuthLoginRedirectError.REGISTRATION_DISABLED) {
      setRegistrationDisabledMessage(
        'Public registration is disabled. Contact your organization admin for access.',
      );
      window.history.replaceState(null, '', '/login');
    }

    const code = searchParams.get('code');
    if (!code) {
      return;
    }

    setIsExchangingCode(true);
    exchangeOAuthCode(code)
      .then((data) => {
        login(data);
        router.replace(getDefaultAppPath(data.user.role));
      })
      .catch(() => {
        setOauthError('Google sign-in failed. Please try again.');
        window.history.replaceState(null, '', '/login');
      })
      .finally(() => {
        setIsExchangingCode(false);
      });
  }, [searchParams, login, router]);

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      router.replace(getDefaultAppPath(user.role));
    }
  }, [isAuthenticated, isLoading, router, user]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data: LoginFormValues) => {
    setHighlightGoogle(false);
    loginMutate(data, {
      onError: (submitError) => {
        if (
          getApiErrorCode(submitError) === AUTH_ERROR_CODES.GOOGLE_AUTH_REQUIRED
        ) {
          setHighlightGoogle(true);
        }
      },
    });
  };

  const apiError =
    error ? getUserFacingErrorMessage(error, 'Login failed. Please try again.') : null;

  if (isExchangingCode) {
    return (
      <div className="auth-card flex flex-col items-center justify-center py-12">
        <span className="btn-spinner" />
        <p className="auth-subtitle mt-4">Completing Google sign-in...</p>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <div className="auth-logo">
        <span className="text-3xl">🎙️</span>
      </div>

      <h1 className="auth-title">Welcome back</h1>
      <p className="auth-subtitle">Sign in to your AI Meeting Assistant account</p>

      <a
        href={GOOGLE_AUTH_URL}
        className={`btn-google${highlightGoogle ? ' btn-google--highlight' : ''}`}
        id="btn-google-login"
      >
        <GoogleIcon />
        <span>Continue with Google</span>
      </a>

      <div className="auth-divider">
        <span>or</span>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="auth-form" id="login-form" noValidate>
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

        <div className="form-field">
          <label htmlFor="login-password" className="form-label">Password</label>
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

        {(oauthError || registrationDisabledMessage || apiError) && (
          <div className="alert-error" role="alert">
            {oauthError ?? registrationDisabledMessage ?? apiError}
          </div>
        )}

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

      {authConfig?.allowPublicSignup ? (
        <p className="auth-footer">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="auth-link">
            Create one
          </Link>
        </p>
      ) : null}
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
