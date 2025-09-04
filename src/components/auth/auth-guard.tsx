'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getCurrentUserProfile, onAuthStateChange } from '@/lib/session';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requiredRole?: 'admin' | 'manager' | 'user';
}

export function AuthGuard({ children, fallback, requiredRole }: AuthGuardProps) {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let authListener: any;

    const checkAuth = async () => {
      try {
        const userProfile = await getCurrentUserProfile();

        if (userProfile) {
          // Check role requirements
          if (requiredRole && userProfile.profile?.role !== requiredRole && userProfile.profile?.role !== 'admin') {
            console.warn(`Access denied: Required role ${requiredRole}, user has ${userProfile.profile?.role}`);
            router.push('/unauthorized');
            return;
          }

          setUser(userProfile);
        } else {
          // Not authenticated, redirect to login
          router.push('/login');
          return;
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/login');
        return;
      } finally {
        setIsLoading(false);
      }
    };

    // Initial check
    checkAuth();

    // Listen for auth changes
    authListener = onAuthStateChange(async (authUser) => {
      if (authUser) {
        const userProfile = await getCurrentUserProfile();
        setUser(userProfile);
      } else {
        setUser(null);
        if (pathname !== '/login') {
          router.push('/login');
        }
      }
    });

    return () => {
      if (authListener) {
        authListener();
      }
    };
  }, [router, pathname, requiredRole]);

  if (isLoading) {
    return (
      fallback || (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      )
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  return <>{children}</>;
}

// Admin-only guard
export function AdminGuard({ children, fallback }: Omit<AuthGuardProps, 'requiredRole'>) {
  return (
    <AuthGuard requiredRole="admin" fallback={fallback}>
      {children}
    </AuthGuard>
  );
}

// Manager or Admin guard
export function ManagerGuard({ children, fallback }: Omit<AuthGuardProps, 'requiredRole'>) {
  return (
    <AuthGuard requiredRole="manager" fallback={fallback}>
      <AdminGuard fallback={fallback}>
        {children}
      </AdminGuard>
    </AuthGuard>
  );
}
