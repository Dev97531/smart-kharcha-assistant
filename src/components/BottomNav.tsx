import { Home, Users, ArrowLeftRight, BarChart3, User } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

const tabs = [
  { path: '/', icon: Home, label: 'Home', match: (p: string) => p === '/' },
  { path: '/monthly', icon: BarChart3, label: 'Monthly', match: (p: string) => p.startsWith('/monthly') },
  { path: '/committee', icon: Users, label: 'Committee', match: (p: string) => p.startsWith('/committee') },
  { path: '/lending', icon: ArrowLeftRight, label: 'Lending', match: (p: string) => p.startsWith('/lending') },
  { path: '/profile', icon: User, label: 'Profile', match: (p: string) => p.startsWith('/profile') },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="bottom-nav">
      <div className="flex items-center justify-around max-w-lg mx-auto py-2">
        {tabs.map(({ path, icon: Icon, label, match }) => {
          const active = match(location.pathname);
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-colors ${
                active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
              <span className="text-[9px] font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
