import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { ViewIcon, ViewOffIcon } from '@hugeicons/core-free-icons';

import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Checkbox } from '@/components/ui/checkbox.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Separator } from '@/components/ui/separator.jsx';
import { SendaiFrame } from '@/components/SendaiFrame.jsx';
import { api, setTokens } from '@/api/client.js';

import logoUrl from '/arise-ph_logo.png';

function GoogleLogo() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

function MicrosoftLogo() {
  return (
    <svg viewBox="0 0 23 23" className="size-4" aria-hidden>
      <rect x="1" y="1" width="10" height="10" fill="#f25022" />
      <rect x="12" y="1" width="10" height="10" fill="#7fba00" />
      <rect x="1" y="12" width="10" height="10" fill="#00a4ef" />
      <rect x="12" y="12" width="10" height="10" fill="#ffb900" />
    </svg>
  );
}

function AppleLogo() {
  return (
    <svg viewBox="0 0 384 512" className="size-4" aria-hidden fill="currentColor">
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
    </svg>
  );
}

const REMEMBER_KEY = 'arise-remembered-username';

export function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState(() => localStorage.getItem(REMEMBER_KEY) ?? '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => !!localStorage.getItem(REMEMBER_KEY));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await api.post('/auth/login', { username, password });
      if (rememberMe) localStorage.setItem(REMEMBER_KEY, username);
      else localStorage.removeItem(REMEMBER_KEY);
      setTokens(res.data.data ?? res.data);
      navigate('/', { replace: true });
    } catch {
      setError('Invalid credentials.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-y-auto p-4 sm:p-6">
      <img
        src="/arise-login-bg-hd.jpg"
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div aria-hidden className="absolute inset-0 bg-black/50" />
      <SendaiFrame slim className="relative z-10 my-auto w-full max-w-[340px] sm:max-w-[400px] lg:max-w-[450px]">
        <Card className="relative z-10 max-h-[calc(100dvh-3rem)] w-full overflow-y-auto rounded-2xl px-3 py-4 [@media(max-height:820px)]:py-2">
          <CardHeader className="items-center space-y-2 text-center">
            <img src={logoUrl} alt="ARISE Philippines" className="mx-auto h-9 w-auto sm:h-10 [@media(max-height:820px)]:h-8" />
            <CardTitle className="font-heading text-xl font-normal tracking-tight [@media(max-height:820px)]:text-lg">
              Sign in to ARISE PH KMS
            </CardTitle>
            <CardDescription className="[@media(max-height:820px)]:hidden">Sign in to your workspace.</CardDescription>
          </CardHeader>
          <CardContent className="pb-5">
            <form onSubmit={onSubmit} className="space-y-4 [@media(max-height:820px)]:space-y-3 [@media(max-height:820px)]:[&_input]:h-8">
              <div className="space-y-1.5">
                <Label htmlFor="login-username">
                  Username / Email<span aria-hidden> *</span>
                </Label>
                <Input
                  id="login-username"
                  placeholder="Enter your username or email"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="login-password">
                  Password<span aria-hidden> *</span>
                </Label>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <HugeiconsIcon icon={showPassword ? ViewOffIcon : ViewIcon} className="size-4" />
                  </button>
                </div>
              </div>
              {error && <p className="text-sm text-[var(--sendai-crimson)]">{error}</p>}
              <div className="flex items-center justify-between text-sm">
                <label className="flex cursor-pointer items-center gap-2 text-muted-foreground">
                  <Checkbox
                    checked={rememberMe}
                    onCheckedChange={(v) => setRememberMe(v === true)}
                  />
                  Remember Me
                </label>
                <button
                  type="button"
                  disabled
                  title="Password reset is not available yet"
                  className="cursor-not-allowed text-muted-foreground opacity-70"
                >
                  Forgot Password?
                </button>
              </div>
              <Button
                className="h-10 w-full bg-neutral-900 text-white hover:bg-neutral-800 [@media(max-height:820px)]:h-9"
                disabled={busy}
              >
                {busy ? 'Signing in…' : 'Sign in to ARISE PH KMS'}
              </Button>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <Separator className="flex-1" />
                <span>or</span>
                <Separator className="flex-1" />
              </div>
              <div className="flex flex-col gap-3 [@media(max-height:820px)]:gap-2">
                <div className="grid grid-cols-2 gap-3 [@media(max-height:820px)]:gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled
                    title="Google sign-in is not available yet"
                    className="h-10 w-full cursor-not-allowed [@media(max-height:820px)]:h-9"
                  >
                    <GoogleLogo />
                    Sign in with Google
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled
                    title="Apple sign-in is not available yet"
                    className="h-10 w-full cursor-not-allowed [@media(max-height:820px)]:h-9"
                  >
                    <AppleLogo />
                    Sign in with Apple
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  disabled
                  title="Microsoft sign-in is not available yet"
                  className="h-10 w-full cursor-not-allowed [@media(max-height:820px)]:h-9"
                >
                  <MicrosoftLogo />
                  Sign in with Microsoft
                </Button>
              </div>
              <p className="text-center text-sm text-muted-foreground">
                New on our platform?{' '}
                <Link to="/signup" className="font-medium text-foreground no-underline hover:no-underline">
                  Create an account
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </SendaiFrame>
      <div aria-hidden className="absolute inset-x-0 bottom-0 z-10 flex h-2">
        <span className="flex-1 bg-[var(--sendai-crimson)]" />
        <span className="flex-1 bg-[var(--sendai-plum)]" />
        <span className="flex-1 bg-[var(--sendai-orange)]" />
        <span className="flex-1 bg-[var(--sendai-teal)]" />
      </div>
      <img
        src={logoUrl}
        alt="ARISE Philippines"
        className="absolute bottom-4 left-4 z-10 h-12 w-auto brightness-0 invert drop-shadow sm:bottom-6 sm:left-6 sm:h-14 lg:h-[70px] [@media(max-height:700px)]:hidden"
      />
    </main>
  );
}
