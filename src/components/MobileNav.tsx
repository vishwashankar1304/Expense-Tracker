import { NavLink } from 'react-router-dom';
import { LayoutDashboard, BarChart3, FileText, User } from 'lucide-react';

const links = [
  { to: '/', icon: LayoutDashboard, label: 'Home' },
  { to: '/charts', icon: BarChart3, label: 'Charts' },
  { to: '/reports', icon: FileText, label: 'Reports' },
  { to: '/profile', icon: User, label: 'Profile' },
];

const MobileNav = () => (
  <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border flex justify-around py-2 z-50">
    {links.map(({ to, icon: Icon, label }) => (
      <NavLink
        key={to}
        to={to}
        end={to === '/'}
        className={({ isActive }) =>
          `flex flex-col items-center gap-0.5 text-xs transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground'}`
        }
      >
        <Icon className="w-5 h-5" />
        {label}
      </NavLink>
    ))}
  </nav>
);

export default MobileNav;
