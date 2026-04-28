import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import {
  Bell,
  KeyRound,
  LogOut,
  Mail,
  Moon,
  Settings,
  Sun,
  Trash2,
  User,
  UserCircle2,
} from 'lucide-react';

const THEME_STORAGE_KEY = 'savvy-theme';
const SETTINGS_STORAGE_KEY = 'savvy-notification-settings';

type NotificationSettings = {
  emailNotifications: boolean;
  expenseAlerts: boolean;
};

const Profile = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [username, setUsername] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    emailNotifications: true,
    expenseAlerts: true,
  });
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  useEffect(() => {
    const metadataUsername = user?.user_metadata?.username;
    setUsername(typeof metadataUsername === 'string' && metadataUsername.trim() ? metadataUsername : user?.email?.split('@')[0] || '');
  }, [user]);

  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    const shouldUseDark = savedTheme === 'dark';

    setIsDarkMode(shouldUseDark);
    document.documentElement.classList.toggle('dark', shouldUseDark);
  }, []);

  useEffect(() => {
    const savedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!savedSettings) return;

    try {
      const parsedSettings = JSON.parse(savedSettings) as NotificationSettings;
      setNotificationSettings({
        emailNotifications: Boolean(parsedSettings.emailNotifications),
        expenseAlerts: Boolean(parsedSettings.expenseAlerts),
      });
    } catch {
      setNotificationSettings({
        emailNotifications: true,
        expenseAlerts: true,
      });
    }
  }, []);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const handleProfileUpdate = async () => {
    const trimmedUsername = username.trim();

    if (trimmedUsername.length < 2) {
      toast({
        title: 'Username is too short',
        description: 'Please use at least 2 characters for your username.',
        variant: 'destructive',
      });
      return;
    }

    setIsUpdatingProfile(true);

    const { error } = await supabase.auth.updateUser({
      data: { username: trimmedUsername },
    });

    setIsUpdatingProfile(false);

    if (error) {
      toast({
        title: 'Profile update failed',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Profile updated',
      description: 'Your username has been saved successfully.',
    });
  };

  const handlePasswordChange = async () => {
    if (!user?.email) return;

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: 'Missing fields',
        description: 'Please complete all password fields.',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: 'Weak password',
        description: 'New password must be at least 8 characters long.',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Password mismatch',
        description: 'New password and confirm password do not match.',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword === currentPassword) {
      toast({
        title: 'Choose a different password',
        description: 'Your new password should be different from your current password.',
        variant: 'destructive',
      });
      return;
    }

    setIsChangingPassword(true);

    const { error: reAuthError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (reAuthError) {
      setIsChangingPassword(false);
      toast({
        title: 'Current password is incorrect',
        description: 'Please check your current password and try again.',
        variant: 'destructive',
      });
      return;
    }

    const { error: updatePasswordError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    setIsChangingPassword(false);

    if (updatePasswordError) {
      toast({
        title: 'Password update failed',
        description: updatePasswordError.message,
        variant: 'destructive',
      });
      return;
    }

    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');

    toast({
      title: 'Password changed',
      description: 'Your password has been updated successfully.',
    });
  };

  const handleThemeToggle = (checked: boolean) => {
    setIsDarkMode(checked);
    document.documentElement.classList.toggle('dark', checked);
    localStorage.setItem(THEME_STORAGE_KEY, checked ? 'dark' : 'light');
  };

  const handleNotificationToggle = (key: keyof NotificationSettings, value: boolean) => {
    const nextSettings = {
      ...notificationSettings,
      [key]: value,
    };

    setNotificationSettings(nextSettings);
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(nextSettings));
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    setIsDeletingAccount(true);

    const { error: deleteTransactionsError } = await supabase
      .from('transactions')
      .delete()
      .eq('user_id', user.id);

    if (deleteTransactionsError) {
      setIsDeletingAccount(false);
      toast({
        title: 'Could not delete account',
        description: deleteTransactionsError.message,
        variant: 'destructive',
      });
      return;
    }

    const { error: deleteAccountError } = await supabase.functions.invoke('delete-account');

    setIsDeletingAccount(false);

    if (deleteAccountError) {
      toast({
        title: 'Account data removed',
        description:
          'Transactions were deleted, but full account deletion requires a backend delete-account function.',
        variant: 'destructive',
      });
      return;
    }

    await signOut();
    navigate('/signup');

    toast({
      title: 'Account deleted',
      description: 'Your account has been removed successfully.',
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Profile Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your account, security preferences, and app experience.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><User className="h-5 w-5 text-primary" /> User Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /> Email</Label>
            <Input id="email" value={user?.email || ''} disabled readOnly />
          </div>

          <div className="space-y-2">
            <Label htmlFor="username" className="flex items-center gap-2"><UserCircle2 className="h-4 w-4 text-muted-foreground" /> Username</Label>
            <Input
              id="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Enter your username"
              maxLength={40}
            />
          </div>

          <Button onClick={handleProfileUpdate} disabled={isUpdatingProfile} className="w-full sm:w-auto">
            {isUpdatingProfile ? 'Updating...' : 'Update Profile'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-primary" /> Password Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                placeholder="Enter current password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="Enter new password"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Confirm new password"
            />
          </div>

          <Button onClick={handlePasswordChange} disabled={isChangingPassword} className="w-full sm:w-auto">
            {isChangingPassword ? 'Changing Password...' : 'Change Password'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5 text-primary" /> Theme Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4 rounded-lg border bg-secondary/30 p-4">
            <div>
              <p className="font-medium text-foreground">Light / Dark Mode</p>
              <p className="text-sm text-muted-foreground">Use light mode by default, or switch when needed.</p>
            </div>
            <div className="flex items-center gap-2">
              <Sun className="h-4 w-4 text-muted-foreground" />
              <Switch checked={isDarkMode} onCheckedChange={handleThemeToggle} aria-label="Toggle dark mode" />
              <Moon className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5 text-primary" /> Notification Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border bg-secondary/30 p-4">
            <div>
              <p className="font-medium text-foreground">Email Notifications</p>
              <p className="text-sm text-muted-foreground">Receive updates and account activity in your inbox.</p>
            </div>
            <Switch
              checked={notificationSettings.emailNotifications}
              onCheckedChange={(checked) => handleNotificationToggle('emailNotifications', checked)}
              aria-label="Toggle email notifications"
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border bg-secondary/30 p-4">
            <div>
              <p className="font-medium text-foreground">Expense Alerts</p>
              <p className="text-sm text-muted-foreground">Get notified about unusual or high-value spending.</p>
            </div>
            <Switch
              checked={notificationSettings.expenseAlerts}
              onCheckedChange={(checked) => handleNotificationToggle('expenseAlerts', checked)}
              aria-label="Toggle expense alerts"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive"><Trash2 className="h-5 w-5" /> Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">Permanently remove your account and personal data. This action cannot be undone.</p>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isDeletingAccount} className="w-full sm:w-auto">
                {isDeletingAccount ? 'Deleting Account...' : 'Delete Account'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove your data. Please confirm if you want to continue.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={handleDeleteAccount}
                >
                  Yes, Delete Account
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      <Button variant="destructive" className="w-full gap-2" onClick={handleLogout}>
        <LogOut className="h-4 w-4" /> Logout
      </Button>
    </div>
  );
};

export default Profile;
