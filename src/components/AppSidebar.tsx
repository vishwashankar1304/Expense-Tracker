import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LayoutDashboard, BarChart3, FileText, User, LogOut, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';

const links = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/charts', icon: BarChart3, label: 'Charts' },
  { to: '/reports', icon: FileText, label: 'Reports' },
  { to: '/profile', icon: User, label: 'Profile' },
];

const AppSidebar = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card p-4 gap-2">
      <div className="flex items-center gap-2 px-3 py-4 mb-4">
        <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
          <Wallet className="w-5 h-5 text-primary-foreground" />
        </div>
        <span className="font-bold text-lg text-foreground">ExpenseTracker</span>
      </div>
      <nav className="flex flex-col gap-1 flex-1">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive ? 'bg-primary/10 text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`
            }
          >
            <Icon className="w-5 h-5" />
            {label}
          </NavLink>
        ))}
      </nav>
      <Button variant="ghost" className="justify-start gap-3 text-muted-foreground mt-auto" onClick={handleLogout}>
        <LogOut className="w-5 h-5" />
        Logout
      </Button>
    </aside>
  );
};

export default AppSidebar;
