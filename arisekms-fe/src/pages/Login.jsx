import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Input } from '@/components/ui/input.jsx';
import { SendaiFrame } from '@/components/SendaiFrame.jsx';
import { api, setTokens } from '@/api/client.js';

import logoUrl from '/arise-ph_logo.png';

export function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await api.post('/auth/login', { username, password });
      setTokens(res.data.data ?? res.data);
      navigate('/', { replace: true });
    } catch {
      setError('Invalid credentials.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center overflow-x-clip bg-background p-6">
      <SendaiFrame className="w-full max-w-sm">
      <Card className="relative z-10 w-full rounded-2xl">
        <CardHeader>
          <img src={logoUrl} alt="ARISE Philippines" className="h-10 w-auto self-start" />
          <CardTitle className="font-heading text-2xl font-black tracking-tight">Arise KMS</CardTitle>
          <CardDescription>Sign in to your workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <Input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            {error && <p className="text-sm text-[var(--sendai-crimson)]">{error}</p>}
            <Button className="w-full" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </CardContent>
      </Card>
      </SendaiFrame>
    </main>
  );
}
