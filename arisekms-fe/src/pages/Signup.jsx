import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Checkbox } from '@/components/ui/checkbox.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { SendaiFrame } from '@/components/SendaiFrame.jsx';
import { api } from '@/api/client.js';

import logoUrl from '/arise-ph_logo.png';

function passwordChecks(password) {
  return [
    { label: 'At least 8 characters', pass: password.length >= 8 },
    { label: 'Upper & lower case', pass: /[a-z]/.test(password) && /[A-Z]/.test(password) },
    { label: 'A number', pass: /\d/.test(password) },
    { label: 'A symbol', pass: /[^A-Za-z0-9]/.test(password) },
  ];
}

function PasswordHealth({ password }) {
  if (!password) return null;
  const checks = passwordChecks(password);
  const score = checks.filter((c) => c.pass).length;
  const barColor =
    score <= 1
      ? 'bg-[var(--sendai-crimson)]'
      : score <= 3
        ? 'bg-[var(--sendai-orange)]'
        : 'bg-[var(--sendai-teal)]';
  return (
    <div className="space-y-2">
      <div className="flex gap-1" aria-hidden>
        {checks.map((c, i) => (
          <span
            key={c.label}
            className={`h-1 flex-1 rounded-full ${i < score ? barColor : 'bg-border'}`}
          />
        ))}
      </div>
      <ul className="grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
        {checks.map((c) => (
          <li key={c.label} className={c.pass ? 'text-[var(--sendai-teal)]' : 'text-muted-foreground'}>
            {c.pass ? '✓' : '○'} {c.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Signup() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!agreed) {
      setError('Please accept the Terms and Conditions to continue.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api.post('/auth/register', { name, username, email, password });
      navigate('/login', { replace: true });
    } catch (err) {
      setError(err?.response?.data?.error?.message ?? err?.response?.data?.message ?? 'Registration failed.');
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
              Create your ARISE PH KMS account
            </CardTitle>
            <CardDescription className="[@media(max-height:820px)]:hidden">Join your ARISE Philippines workspace.</CardDescription>
          </CardHeader>
          <CardContent className="pb-5">
            <form onSubmit={onSubmit} className="space-y-5 [@media(max-height:820px)]:space-y-3 [@media(max-height:820px)]:[&_input]:h-8">
              <div className="space-y-1.5">
                <Label htmlFor="signup-name">
                  Full name<span aria-hidden> *</span>
                </Label>
                <Input
                  id="signup-name"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  required
                  maxLength={100}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="signup-username">
                  Username<span aria-hidden> *</span>
                </Label>
                <Input
                  id="signup-username"
                  placeholder="Choose a username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                  maxLength={200}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="signup-email">
                  Email address<span aria-hidden> *</span>
                </Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  maxLength={100}
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="signup-password">
                    Password<span aria-hidden> *</span>
                  </Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Minimum 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                    minLength={6}
                    maxLength={100}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="signup-confirm-password">
                    Retype password<span aria-hidden> *</span>
                  </Label>
                  <Input
                    id="signup-confirm-password"
                    type="password"
                    placeholder="Repeat your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                    minLength={6}
                    maxLength={100}
                  />
                </div>
              </div>
              <PasswordHealth password={password} />
              {error && <p className="text-sm text-[var(--sendai-crimson)]">{error}</p>}
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <Checkbox
                  id="signup-tc"
                  aria-label="Agree to the Terms and Conditions"
                  checked={agreed}
                  onCheckedChange={(v) => setAgreed(v === true)}
                  className="mt-0.5"
                />
                <span>
                  I agree to the{' '}
                  <a
                    href="https://www.arise.ph/privacy-policy/"
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-foreground no-underline hover:no-underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Terms and Conditions
                  </a>
                  <span aria-hidden> *</span>
                </span>
              </div>
              <Button
                className="h-10 w-full bg-neutral-900 text-white hover:bg-neutral-800 [@media(max-height:820px)]:h-9"
                disabled={busy}
              >
                {busy ? 'Creating account…' : 'Create an account'}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link to="/login" className="font-medium text-foreground no-underline hover:no-underline">
                  Sign in
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
