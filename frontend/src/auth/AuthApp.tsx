import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { buildApiUrl } from '../config/api';

type AuthView = 'login' | 'signup' | 'signup-code' | 'forgot-email' | 'forgot-code' | 'reset-password';
type AppView = 'admin' | 'user';

interface AuthAppProps {
  onLoginSuccess: (view: AppView, token: string) => void;
}

const brandLabel = (
  <h1 className="text-center text-[2.2rem] font-black tracking-tight text-white">
    <span className="text-brand-orange">Cal</span>AI
  </h1>
);

const shellClasses =
  'w-full max-w-[360px] rounded-2xl border border-white/8 bg-[#1f1f1f] px-6 py-7 shadow-[0_20px_60px_rgba(0,0,0,0.45)]';

const inputClasses =
  'w-full rounded-md border border-transparent bg-[#2f2f2f] px-3 py-2.5 text-sm text-white outline-none transition focus:border-brand-orange/50 focus:bg-[#353535] placeholder:text-[#666]';

const labelClasses = 'mb-2 block text-[0.72rem] font-semibold text-brand-orange';
const authErrorMessages: Record<string, string> = {
  INVALID_CREDENTIALS: 'Email hoặc mật khẩu không đúng.',
  EMAIL_ALREADY_EXISTS: 'Email này đã được đăng ký.',
  EMAIL_NOT_VERIFIED: 'Tài khoản chưa xác minh. Vui lòng hoàn tất bước OTP đăng ký.',
  ACCOUNT_NOT_FOUND: 'Không tìm thấy tài khoản với email này.',
  INVALID_RESET_CODE: 'Mã xác nhận không đúng hoặc đã hết hạn.',
  INVALID_REGISTER_OTP: 'Mã OTP đăng ký không đúng hoặc đã hết hạn.',
  PASSWORD_MISMATCH: 'Mật khẩu xác nhận không khớp.',
  INVALID_USERNAME: 'Username phải có ít nhất 2 ký tự.',
};

export default function AuthApp({ onLoginSuccess }: AuthAppProps) {
  const [view, setView] = useState<AuthView>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [signupCode, setSignupCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const resetSensitiveFields = () => {
    setPassword('');
    setConfirmPassword('');
    setVerificationCode('');
    setSignupCode('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setError('');
    setInfo('');
  };

  const resetSignupFields = () => {
    setEmail('');
    setUsername('');
    setPassword('');
    setConfirmPassword('');
  };

  const goTo = (nextView: AuthView) => {
    resetSensitiveFields();
    if (nextView === 'login') {
      setUsername('');
      setEmail('');
    }
    setView(nextView);
  };

  const submitJson = async <T,>(path: string, payload: Record<string, unknown>): Promise<T> => {
    const response = await fetch(buildApiUrl(`/auth${path}`), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const contentType = response.headers.get('content-type') || '';
    const result = contentType.includes('application/json')
      ? await response.json()
      : { message: (await response.text()) || 'REQUEST_FAILED' };
    if (!response.ok) {
      throw new Error(result.message || 'Request failed');
    }

    return result as T;
  };

  const getFriendlyError = (message: string) => authErrorMessages[message] || message;

  const renderPasswordField = (
    label: string,
    value: string,
    onChange: (value: string) => void,
    placeholder: string,
    shown: boolean,
    onToggle: () => void
  ) => (
    <div>
      <label className={labelClasses}>{label}</label>
      <div className="relative">
        <input
          type={shown ? 'text' : 'password'}
          value={value}
          onChange={event => onChange(event.target.value)}
          placeholder={placeholder}
          className={`${inputClasses} pr-10`}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute inset-y-0 right-3 flex items-center text-[#8a8a8a] transition hover:text-white"
          aria-label={shown ? 'Hide password' : 'Show password'}
        >
          {shown ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#050505] px-4 py-10">
      <div className={shellClasses}>
        {brandLabel}

        <div className="my-5 border-t border-white/8" />

        {view === 'login' && (
          <form
            className="space-y-4"
            onSubmit={async event => {
              event.preventDefault();
              setError('');
              setInfo('');
              setIsSubmitting(true);

              try {
                const result = await submitJson<{ data: { role: AppView; token: string } }>('/login', { email, password });
                onLoginSuccess(result.data.role === 'admin' ? 'admin' : 'user', result.data.token);
              } catch (submitError) {
                setError(getFriendlyError(submitError instanceof Error ? submitError.message : 'Login failed'));
              } finally {
                setIsSubmitting(false);
              }
            }}
          >
            <div>
              <label className={labelClasses}>Email</label>
              <input
                type="email"
                value={email}
                onChange={event => setEmail(event.target.value)}
                placeholder="Enter email"
                className={inputClasses}
              />
            </div>

            {renderPasswordField(
              'Password',
              password,
              setPassword,
              'Enter password',
              showPassword,
              () => setShowPassword(value => !value)
            )}

            <button
              type="button"
              onClick={() => goTo('forgot-email')}
              className="text-[0.72rem] text-brand-orange transition hover:text-[#ffb08d]"
            >
              Forgot password?
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 w-full rounded-full bg-brand-orange px-4 py-2.5 text-sm font-bold text-[#1d1d1d] transition hover:bg-[#ff9d72]"
            >
              {isSubmitting ? 'Logging in...' : 'Login'}
            </button>

            <p className="pt-1 text-center text-[0.74rem] text-[#d7d7d7]">
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={() => goTo('signup')}
                className="font-medium text-brand-orange transition hover:text-[#ffb08d]"
              >
                Sign up
              </button>
            </p>
          </form>
        )}

        {view === 'signup' && (
          <form
            className="space-y-4"
            onSubmit={async event => {
              event.preventDefault();
              if (password !== confirmPassword) {
                setError('PASSWORD_MISMATCH');
                return;
              }
              if (!username.trim() || username.trim().length < 2) {
                setError('Username phải có ít nhất 2 ký tự.');
                return;
              }

              setError('');
              setInfo('');
              setIsSubmitting(true);

              try {
                const result = await submitJson<{ data: { previewCode?: string; emailSent?: boolean } }>('/register/request-otp', { email, password, username: username.trim() });
                setInfo(
                  result.data.emailSent
                    ? 'OTP đăng ký đã được gửi tới Gmail của bạn.'
                    : `Demo register OTP: ${result.data.previewCode}`
                );
                setView('signup-code');
              } catch (submitError) {
                setError(getFriendlyError(submitError instanceof Error ? submitError.message : 'Register failed'));
              } finally {
                setIsSubmitting(false);
              }
            }}
          >
            <div>
              <label className={labelClasses}>Email</label>
              <input
                type="email"
                value={email}
                onChange={event => setEmail(event.target.value)}
                placeholder="Enter email"
                className={inputClasses}
              />
            </div>

            <div>
              <label className={labelClasses}>Username</label>
              <input
                type="text"
                value={username}
                onChange={event => setUsername(event.target.value)}
                placeholder="Enter your display name"
                className={inputClasses}
              />
            </div>

            {renderPasswordField(
              'Password',
              password,
              setPassword,
              'Enter password',
              showPassword,
              () => setShowPassword(value => !value)
            )}

            {renderPasswordField(
              'Confirm password',
              confirmPassword,
              setConfirmPassword,
              'Re-enter password',
              showConfirmPassword,
              () => setShowConfirmPassword(value => !value)
            )}

            <div className="my-5 border-t border-white/8" />

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-full bg-brand-orange px-4 py-2.5 text-sm font-bold text-[#1d1d1d] transition hover:bg-[#ff9d72]"
            >
              {isSubmitting ? 'Signing up...' : 'Sign up'}
            </button>

            <p className="text-center text-[0.74rem] text-[#d7d7d7]">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => goTo('login')}
                className="font-medium text-brand-orange transition hover:text-[#ffb08d]"
              >
                Sign in
              </button>
            </p>
          </form>
        )}

        {view === 'signup-code' && (
          <form
            className="space-y-4"
            onSubmit={async event => {
              event.preventDefault();
              setError('');
              setInfo('');
              setIsSubmitting(true);

              try {
                await submitJson('/register/verify-otp', { email, code: signupCode });
                setInfo('Register successful. You can sign in now.');
                setView('login');
              } catch (submitError) {
                setError(getFriendlyError(submitError instanceof Error ? submitError.message : 'OTP verification failed'));
              } finally {
                setIsSubmitting(false);
              }
            }}
          >
            <div>
              <label className={labelClasses}>Enter the confirmation code</label>
              <input
                type="text"
                value={signupCode}
                onChange={event => setSignupCode(event.target.value)}
                placeholder="Enter the OTP sent during sign up"
                className={inputClasses}
              />
            </div>

            <button
              type="button"
              onClick={async () => {
                setError('');
                setInfo('');
                setIsSubmitting(true);

                try {
                  const result = await submitJson<{ data: { previewCode?: string; emailSent?: boolean } }>('/register/request-otp', { email, password, username });
                  setInfo(
                    result.data.emailSent
                      ? 'OTP đăng ký đã được gửi lại tới Gmail của bạn.'
                      : `Demo register OTP: ${result.data.previewCode}`
                  );
                } catch (submitError) {
                  setError(getFriendlyError(submitError instanceof Error ? submitError.message : 'Failed to resend OTP'));
                } finally {
                  setIsSubmitting(false);
                }
              }}
              className="text-[0.72rem] text-brand-orange transition hover:text-[#ffb08d]"
            >
              Resend code
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-full bg-brand-orange px-4 py-2.5 text-sm font-bold text-[#1d1d1d] transition hover:bg-[#ff9d72]"
            >
              {isSubmitting ? 'Verifying...' : 'Verify & Create Account'}
            </button>

            <p className="text-center text-[0.74rem] text-[#d7d7d7]">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => goTo('login')}
                className="font-medium text-brand-orange transition hover:text-[#ffb08d]"
              >
                Sign in
              </button>
            </p>
          </form>
        )}

        {view === 'forgot-email' && (
          <form
            className="space-y-5"
            onSubmit={async event => {
              event.preventDefault();
              setError('');
              setInfo('');
              setIsSubmitting(true);

              try {
                const result = await submitJson<{ data: { previewCode?: string; emailSent?: boolean } }>('/forgot-password', { email });
                setInfo(
                  result.data.emailSent
                    ? 'Mã xác nhận đã được gửi tới Gmail của bạn.'
                    : `Demo confirmation code: ${result.data.previewCode}`
                );
                setView('forgot-code');
              } catch (submitError) {
                setError(getFriendlyError(submitError instanceof Error ? submitError.message : 'Failed to send code'));
              } finally {
                setIsSubmitting(false);
              }
            }}
          >
            <div>
              <label className={labelClasses}>Email</label>
              <input
                type="email"
                value={email}
                onChange={event => setEmail(event.target.value)}
                placeholder="Enter email"
                className={inputClasses}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-full bg-brand-orange px-4 py-2.5 text-sm font-bold text-[#1d1d1d] transition hover:bg-[#ff9d72]"
            >
              {isSubmitting ? 'Sending...' : 'Send confirmation code'}
            </button>
          </form>
        )}

        {view === 'forgot-code' && (
          <form
            className="space-y-4"
            onSubmit={async event => {
              event.preventDefault();
              setError('');
              setInfo('');
              setIsSubmitting(true);

              try {
                await submitJson('/verify-reset-code', { email, code: verificationCode });
                setView('reset-password');
              } catch (submitError) {
                setError(getFriendlyError(submitError instanceof Error ? submitError.message : 'Invalid code'));
              } finally {
                setIsSubmitting(false);
              }
            }}
          >
            <div>
              <label className={labelClasses}>Enter the confirmation code</label>
              <input
                type="text"
                value={verificationCode}
                onChange={event => setVerificationCode(event.target.value)}
                placeholder="Enter the code just sent to your email"
                className={inputClasses}
              />
            </div>

            <button
              type="button"
              onClick={() => setVerificationCode('')}
              className="text-[0.72rem] text-brand-orange transition hover:text-[#ffb08d]"
            >
              Resend code
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-full bg-brand-orange px-4 py-2.5 text-sm font-bold text-[#1d1d1d] transition hover:bg-[#ff9d72]"
            >
              {isSubmitting ? 'Checking...' : 'OK'}
            </button>
          </form>
        )}

        {view === 'reset-password' && (
          <form
            className="space-y-4"
            onSubmit={async event => {
              event.preventDefault();
              if (password !== confirmPassword) {
                setError('PASSWORD_MISMATCH');
                return;
              }

              setError('');
              setInfo('');
              setIsSubmitting(true);

              try {
                await submitJson('/reset-password', {
                  email,
                  code: verificationCode,
                  newPassword: password,
                });
                setInfo('Password reset successful. Sign in with your new password.');
                goTo('login');
              } catch (submitError) {
                setError(getFriendlyError(submitError instanceof Error ? submitError.message : 'Reset failed'));
              } finally {
                setIsSubmitting(false);
              }
            }}
          >
            {renderPasswordField(
              'Reset Password',
              password,
              setPassword,
              'Enter password',
              showPassword,
              () => setShowPassword(value => !value)
            )}

            {renderPasswordField(
              'Confirm password',
              confirmPassword,
              setConfirmPassword,
              'Re-enter password',
              showConfirmPassword,
              () => setShowConfirmPassword(value => !value)
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-full bg-brand-orange px-4 py-2.5 text-sm font-bold text-[#1d1d1d] transition hover:bg-[#ff9d72]"
            >
              {isSubmitting ? 'Updating...' : 'OK'}
            </button>
          </form>
        )}

        {(error || info) && (
          <div className="mt-4 space-y-2">
            {error && <p className="text-center text-[0.72rem] text-red-400">{error}</p>}
            {info && <p className="text-center text-[0.72rem] text-brand-orange">{info}</p>}
            {view === 'login' && (
              <p className="text-center text-[0.68rem] text-white/40">
                Default admin: admin@calai.local / Admin123! | Demo user: user@calai.local / User123!
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
