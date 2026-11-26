import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { SendaiFrame } from '@/components/SendaiFrame.jsx';
import { api } from '@/api/client.js';

import logoUrl from '/arise-ph_logo.png';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    setError('');
    try {
      await api.post('/auth/forgot-password', { email: email.trim() });
      // Deliberately the same for unknown addresses: the API answers 202
      // either way, so the screen must not imply the address exists.
      setSent(true);
    } catch (err) {
      const status = err?.response?.status;
      setError(
        status === 429
          ? 'Too many requests. Please try again in a few minutes.'
          : 'Could not send the link. Please try again.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-y-auto p-4 sm:p-6">
      <img src="/arise-login-bg-hd.jpg" alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
      <div aria-hidden className="absolute inset-0 bg-black/50" />
      <SendaiFrame slim className="relative z-10 my-auto w-full max-w-[340px] sm:max-w-[400px]">
        <Card className="relative z-10 w-full rounded-2xl px-3 py-4">
          <CardHeader className="items-center space-y-2 text-center">
            <img src={logoUrl} alt="ARISE Philippines" className="mx-auto h-9 w-auto" />
            <CardTitle className="font-heading text-xl font-normal tracking-tight">Forgot password</CardTitle>
            <CardDescription className="text-center">
              {sent
                ? 'If that address is registered, a reset link is on its way. It expires in 60 minutes.'
                : 'Enter the email on your account and we will send a reset link.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {sent ? (
              <p className="text-center text-sm text-rnoop<|place_holder_mm_span_0442|>">Nothing arrived? Check spam, then request another link.</p>
            ) : (
              <form onSubmit={submit} className="space-y-3" noValidate>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="h-10 w-full bg-neutral-900 text-white hover:bg-neutral-800" disabled={busy}>
                  {busy ? 'Sending…' : 'Send reset link'}
                </Button>
              </form>
            )}
            <p className="text-center text-sm">
              <Link to="/login" className="underline underline-offset-2">
                Back to sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </SendaiFrame>
    </main>
  );
}