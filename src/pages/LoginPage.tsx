import { useAuth } from '@/contexts/AuthContext';
import { Sparkles, Wallet } from 'lucide-react';

export default function LoginPage() {
  const { signInWithGoogle, loading } = useAuth();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-8 text-center">
        {/* Logo area */}
        <div className="space-y-4">
          <div className="w-20 h-20 mx-auto rounded-2xl gradient-primary flex items-center justify-center">
            <Wallet size={36} className="text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Smart Kharcha</h1>
            <p className="text-sm text-muted-foreground mt-1">Your AI Finance Assistant</p>
          </div>
        </div>

        {/* Features */}
        <div className="space-y-3">
          {[
            'AI-powered expense tracking',
            'Voice & image receipt scanning',
            'Auto-backup to Google Drive',
            'Smart insights & budgets',
          ].map(f => (
            <div key={f} className="flex items-center gap-3 text-left">
              <Sparkles size={14} className="text-primary shrink-0" />
              <span className="text-sm text-secondary-foreground">{f}</span>
            </div>
          ))}
        </div>

        {/* Google Sign-In */}
        <button
          onClick={signInWithGoogle}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-foreground text-background font-semibold py-3.5 rounded-xl text-sm transition-transform active:scale-[0.98] disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Sign in with Google
        </button>

        <p className="text-xs text-muted-foreground">
          Your data stays private. Backed up only to your Google Drive.
        </p>
      </div>
    </div>
  );
}
