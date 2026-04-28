import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Wallet, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getSignupErrorMessage = (message: string) => {
  const normalized = message.toLowerCase();
  if (normalized.includes('user already registered') || normalized.includes('already been registered')) {
    return 'This email is already registered. Try signing in instead.';
  }
  if (normalized.includes('password')) {
    return 'Password is too weak. Use at least 6 characters.';
  }
  if (normalized.includes('invalid email')) {
    return 'Please enter a valid email address.';
  }
  return message;
};

const Signup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signUp, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const emailError = useMemo(() => {
    if (!email) return '';
    return EMAIL_REGEX.test(email) ? '' : 'Enter a valid email address.';
  }, [email]);

  const passwordError = useMemo(() => {
    if (!password) return '';
    return password.length >= 6 ? '' : 'Password must be at least 6 characters.';
  }, [password]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!EMAIL_REGEX.test(email)) {
      toast({
        title: 'Invalid email',
        description: 'Please enter a valid email address.',
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: 'Weak password',
        description: 'Password must be at least 6 characters long.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    const { error } = await signUp(email, password);
    setLoading(false);

    if (error) {
      toast({
        title: 'Signup failed',
        description: getSignupErrorMessage(error.message),
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Account created', description: 'Check your email to confirm your account, then sign in.' });
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary via-background to-background px-4 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md items-center">
      <Card className="w-full border-primary/20 shadow-lg animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Wallet className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Create account</CardTitle>
          <CardDescription>Start tracking your expenses today</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
              {emailError && <p className="text-xs text-expense">{emailError}</p>}
            </div>

            <div className="space-y-1">
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password (min 6 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {passwordError && <p className="text-xs text-expense">{passwordError}</p>}
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
      </div>
    </div>
  );
};

export default Signup;
