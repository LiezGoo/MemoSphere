'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, Eye, EyeOff, Fingerprint } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import AuthShell from '@/components/auth-shell';
import { authService, ApiError } from '@/services/api';
import FaceCapture from '@/components/face-capture';

const loginSchema = z.object({ email: z.string().email('Enter a valid email address.'), password: z.string().min(8, 'Password must be at least 8 characters.'), remember: z.boolean().optional() });
type LoginValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [faceOpen, setFaceOpen] = useState(false);
  useEffect(() => setRegistered(new URLSearchParams(window.location.search).get('registered') === '1'), []);
  const { register, handleSubmit, setError, watch, formState: { errors, isSubmitting } } = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { remember: true } });
  const email = watch('email');
  const onSubmit = async (values: LoginValues) => { try { await authService.login(values); window.location.assign('/dashboard'); } catch (error) { setError('root', { message: error instanceof ApiError ? error.message : 'Unable to sign in right now.' }); } };

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Welcome back."
      description="Return to the memories and stories that matter to you."
      footer={
        <>
          Don&apos;t have an account? <Link href="/register">Create one <ArrowRight size={14} /></Link>
        </>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
        {registered && <div className="auth-success" role="status">Account created. You can now sign in.</div>}

        <label className="form-field">
          <span>Email address</span>
          <input type="email" placeholder="you@example.com" autoComplete="email" {...register('email')} />
          {errors.email && <small className="field-error">{errors.email.message}</small>}
        </label>

        <label className="form-field password-field">
          <span>Password</span>
          <div className="password-field-wrap">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              autoComplete="current-password"
              {...register('password')}
            />
            <button
              type="button"
              className="password-toggle"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword((value) => !value)}
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
          {errors.password && <small className="field-error">{errors.password.message}</small>}
        </label>

        <div className="auth-options">
          <label className="check-label">
            <input type="checkbox" {...register('remember')} />
            <span>Remember me</span>
          </label>
          <button type="button" className="text-button">Forgot password?</button>
        </div>

        {errors.root && <div className="auth-error" role="alert">{errors.root.message}</div>}

        <button className="auth-submit" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in...' : 'Continue to MemoSphere'}
          {!isSubmitting && <ArrowRight size={17} />}
        </button>

        <button
          className="button button-secondary face-login-button"
          type="button"
          disabled={!email || isSubmitting}
          onClick={() => setFaceOpen(true)}
        >
          <Fingerprint size={16} />
          <span>Continue with face</span>
        </button>
      </form>

      {faceOpen && <FaceCapture email={email} purpose="login" onClose={() => setFaceOpen(false)} onComplete={() => window.location.assign('/dashboard')} />}
    </AuthShell>
  );
}