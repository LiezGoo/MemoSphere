import AuthProvider from '@/components/auth-provider';
import AppLayout from '@/components/app-layout';

export default function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <AuthProvider><AppLayout>{children}</AppLayout></AuthProvider>;
}
