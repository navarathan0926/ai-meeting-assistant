'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useRegister } from '@/hooks/useAuth';
import { useAuthContext } from '@/providers/AuthProvider';
import { useAuthConfig } from '@/hooks/useAuthConfig';
import { getApiErrorCode, getUserFacingErrorMessage } from '@/lib/api/auth-errors';
import { GOOGLE_AUTH_URL } from '@/lib/auth-urls';
import { getDefaultAppPath } from '@/lib/auth-routes';
import { AUTH_ERROR_CODES, AuthLoginRedirectError } from '@/types/auth';

// ─── Schema ───────────────────────────────────────────────────────────────────

const registerSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    email: z.string().email('Enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

// ─── Password strength ────────────────────────────────────────────────────────

function getStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: '', color: '' };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const map = [
    { label: 'Weak', color: '#ef4444' },
    { label: 'Fair', color: '#f97316' },
    { label: 'Good', color: '#eab308' },
    { label: 'Strong', color: '#39FF14' },
  ];
  const idx = Math.min(Math.floor((score / 5) * 4), 3);
  return { score, label: map[idx].label, color: map[idx].color };
}

// ─── Google Icon ──────────────────────────────────────────────────────────────

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

export default function RegisterPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuthContext();
  const { mutate: registerMutate, isPending, error } = useRegister();
  const {
    data: authConfig,
    isLoading: isConfigLoading,
    isError: isConfigError,
  } = useAuthConfig();
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [highlightGoogle, setHighlightGoogle] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      router.replace(getDefaultAppPath(user.role));
    }
  }, [isAuthenticated, isLoading, router, user]);

  useEffect(() => {
    if (isConfigLoading) {
      return;
    }

    if (isConfigError || !authConfig?.allowPublicSignup) {
      router.replace(
        `/login?message=${AuthLoginRedirectError.REGISTRATION_DISABLED}`,
      );
    }
  }, [authConfig, isConfigError, isConfigLoading, router]);

  const signupAllowed = authConfig?.allowPublicSignup === true;
  const showForm = !isConfigLoading && signupAllowed;

  const strength = getStrength(password);

  const onSubmit = (data: RegisterFormValues) => {
    setHighlightGoogle(false);
    registerMutate(
      { name: data.name, email: data.email, password: data.password },
      {
        onError: (submitError) => {
          if (
            getApiErrorCode(submitError) ===
            AUTH_ERROR_CODES.GOOGLE_ACCOUNT_EXISTS
          ) {
            setHighlightGoogle(true);
          }
        },
      },
    );
  };

  const apiError =
    error ? getUserFacingErrorMessage(error, 'Registration failed. Please try again.') : null;

  if (!showForm) {
    return (
      <div className="auth-card flex flex-col items-center justify-center py-12">
        <span className="btn-spinner" />
      </div>
    );
  }

  return (
    <div className="auth-card">
      {/* Logo */}
      <div className="auth-logo">
        <span className="text-3xl">🎙️</span>
      </div>

      <h1 className="auth-title">Create account</h1>
      <p className="auth-subtitle">Start transcribing your meetings with AI</p>

      {/* Google OAuth */}
      <a
        href={GOOGLE_AUTH_URL}
        className={`btn-google${highlightGoogle ? ' btn-google--highlight' : ''}`}
        id="btn-google-register"
      >
        <GoogleIcon />
        <span>Continue with Google</span>
      </a>

      {/* Divider */}
      <div className="auth-divider">
        <span>or</span>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="auth-form" id="register-form" noValidate>
        {/* Full Name */}
        <div className="form-field">
          <label htmlFor="reg-name" className="form-label">Full Name</label>
          <input
            id="reg-name"
            type="text"
            autoComplete="name"
            placeholder="Jane Smith"
            className={`form-input ${errors.name ? 'form-input--error' : ''}`}
            {...register('name')}
          />
          {errors.name && <p className="form-error">{errors.name.message}</p>}
        </div>

        {/* Email */}
        <div className="form-field">
          <label htmlFor="reg-email" className="form-label">Email</label>
          <input
            id="reg-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            className={`form-input ${errors.email ? 'form-input--error' : ''}`}
            {...register('email')}
          />
          {errors.email && <p className="form-error">{errors.email.message}</p>}
        </div>

        {/* Password */}
        <div className="form-field">
          <label htmlFor="reg-password" className="form-label">Password</label>
          <div className="input-wrapper">
            <input
              id="reg-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Min. 8 characters"
              className={`form-input ${errors.password ? 'form-input--error' : ''}`}
              {...register('password', {
                onChange: (e) => setPassword(e.target.value),
              })}
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
          {errors.password && <p className="form-error">{errors.password.message}</p>}

          {/* Password strength meter */}
          {password.length > 0 && (
            <div className="strength-meter" aria-label={`Password strength: ${strength.label}`}>
              <div className="strength-bars">
                {[1, 2, 3, 4].map((level) => (
                  <div
                    key={level}
                    className="strength-bar"
                    style={{
                      backgroundColor:
                        strength.score >= level * 1.25
                          ? strength.color
                          : 'rgba(255,255,255,0.1)',
                    }}
                  />
                ))}
              </div>
              <span className="strength-label" style={{ color: strength.color }}>
                {strength.label}
              </span>
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div className="form-field">
          <label htmlFor="reg-confirm" className="form-label">Confirm Password</label>
          <input
            id="reg-confirm"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            className={`form-input ${errors.confirmPassword ? 'form-input--error' : ''}`}
            {...register('confirmPassword')}
          />
          {errors.confirmPassword && (
            <p className="form-error">{errors.confirmPassword.message}</p>
          )}
        </div>

        {/* API Error */}
        {apiError && (
          <div className="alert-error" role="alert">{apiError}</div>
        )}

        {/* Submit */}
        <button
          id="btn-register-submit"
          type="submit"
          disabled={isPending}
          className="btn-primary"
        >
          {isPending ? <span className="btn-spinner" /> : (
            <>
              Create Account
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="ml-2">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </>
          )}
        </button>
      </form>

      {/* Footer link */}
      <p className="auth-footer">
        Already have an account?{' '}
        <Link href="/login" className="auth-link">
          Sign in
        </Link>
      </p>
    </div>
  );
}
