import { useAuth } from '@/contexts/AuthContext';
import { Navigate, Outlet } from 'react-router-dom';
import AppSidebar from '@/components/AppSidebar';
import MobileNav from '@/components/MobileNav';

const AppLayout = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen flex bg-background">
      <AppSidebar />
      <main className="flex-1 p-4 md:p-8 overflow-auto pb-20 md:pb-8">
        <Outlet />
      </main>
      <MobileNav />
    </div>
  );
};
export default AppLayout;
