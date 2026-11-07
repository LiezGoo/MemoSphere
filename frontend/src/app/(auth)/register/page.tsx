'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import AuthShell from '@/components/auth-shell';
import { authService, ApiError } from '@/services/api';

const registerSchema = z.object({ fullName: z.string().min(2, 'Tell us your name.'), email: z.string().email('Enter a valid email address.'), password: z.string().min(8, 'Use at least 8 characters.'), confirmPassword: z.string(), terms: z.literal(true, { error: 'Please accept the terms to continue.' }) }).refine((data) => data.password === data.confirmPassword, { message: 'Passwords do not match.', path: ['confirmPassword'] });
type RegisterValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) });
  const onSubmit = async (values: RegisterValues) => { try { await authService.register(values); window.location.assign('/login?registered=1'); } catch (error) { setError('root', { message: error instanceof ApiError ? error.message : 'Unable to create the account right now.' }); } };
  return <AuthShell eyebrow="Begin with intention" title="Create your personal space." description="Start preserving your memories, thoughts, and stories with Alaala." footer={<>Already have an account? <Link href="/login">Log in <ArrowRight size={14} /></Link></>}><form className="auth-form register-form" onSubmit={handleSubmit(onSubmit)} noValidate><label className="form-field"><span>Full name</span><input placeholder="Your name" autoComplete="name" {...register('fullName')} />{errors.fullName && <small className="field-error">{errors.fullName.message}</small>}</label><label className="form-field"><span>Email address</span><input type="email" placeholder="you@example.com" autoComplete="email" {...register('email')} />{errors.email && <small className="field-error">{errors.email.message}</small>}</label><label className="form-field password-field"><span>Password</span><div><input type={showPassword ? 'text' : 'password'} placeholder="At least 8 characters" autoComplete="new-password" {...register('password')} /><button type="button" className="password-toggle" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>{errors.password && <small className="field-error">{errors.password.message}</small>}<small className="field-help">Use a mix of letters, numbers, and symbols.</small></label><label className="form-field"><span>Confirm password</span><input type={showPassword ? 'text' : 'password'} placeholder="Repeat your password" autoComplete="new-password" {...register('confirmPassword')} />{errors.confirmPassword && <small className="field-error">{errors.confirmPassword.message}</small>}</label><label className="check-label terms-label"><input type="checkbox" {...register('terms')} /><span>I agree to the <button type="button" className="inline-link">Terms</button> and <button type="button" className="inline-link">Privacy Policy</button>.</span></label>{errors.terms && <small className="field-error">{errors.terms.message}</small>}{errors.root && <div className="auth-error" role="alert">{errors.root.message}</div>}<button className="auth-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creating account...' : 'Create my space'} {!isSubmitting && <ArrowRight size={17} />}</button></form></AuthShell>;
}