import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { SendaiFrame } from '@/components/SendaiFrame.jsx';
import { api } from '@/api/client.js';

import logoUrl from '/arise-ph_logo.png';

// Serves both the reset link and the invite link: same form, different API
// route. `mode` comes from the route path rather than the token.
export function SetPassword({ mode = 'reset' }) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') ?? '';
  const isInvite = mode === 'invite';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (password.length < 6) {
      setError('Use at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('The two passwords do not match.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api.post(isInvite ? '/auth/accept-invite' : '/auth/reset-password', {
        token,
        password,
      });
      setDone(true);
    } catch (err) {
      // 400 covers unknown, expired, already-used and wrong-kind tokens; the
      // API does not distinguish them, so neither does this screen.
      setError(
        err?.response?.status === 400
          ? 'This link is invalid or has expired. Request a new one.'
          : 'Could not save the password. Please try again.',
      );
    } finally {
      setBusy(false);
    }
  }

  const missingToken = !token;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-y-auto p-4 sm:p-6">
      <img src="/arise-login-bg-hd.jpg" alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
      <div aria-hidden className="absolute inset-0 bg-black/50" />
      <SendaiFrame slim className="relative z-10 my-auto w-full max-w-[340px] sm:max-w-[400px]">
        <Card className="relative z-10 w-full rounded-2xl px-3 py-4">
          <CardHeader className="items-center space-y-2 text-center">
            <img src={logoUrl} alt="ARISE Philippines" className="mx-auto h-9 w-auto" />
            <CardTitle className="font-heading text-xl font-normal tracking-tight">
              {isInvite ? 'Set your password' : 'Choose a new password'}
            </CardTitle>
            <CardDescription className="text-center">
              {done
                ? 'Your password is saved. Sign in with it now.'
                : 'Pick something at least 6 characters long.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {missingToken ? (
              <p className="text-center text-sm text-muted-foreground">
                This link is missing its token. Ask for a new one.
              </p>
            ) : done ? (
              <Button className="h-10 w-full bg-neutral-900 text-white hover:bg-neutral-800" onClick={() => navigate('/login', { replace: true })}>
                Go to sign in
              </Button>
            ) : (
              <form onSubmit={submit} className="space-y-3" noValidate>
                <div className="space-y-1.5">
                  <Label htmlFor="password">New password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirm">Repeat password</Label>
                  <Input
                    id="confirm"
                    type="password"
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="h-10 w-full bg-neutral-900 text-white hover:bg-neutral-800" disabled={busy}>
                  {busy ? 'Saving…' : 'Save password'}
                </Button>
                {error && (
                  <p className="text-center text-sm">
                    <Link to="/forgot-password" className="underline underline-offset-2">
                      Request a new link
                    </Link>
                  </p>
                )}
              </form>
            )}
          </CardContent>
        </Card>
      </SendaiFrame>
    </main>
  );
}