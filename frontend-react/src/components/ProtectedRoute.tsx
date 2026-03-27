import { Navigate } from 'react-router';
import { useAuth } from '../hooks/useAuth';
import type { ReactNode } from 'react';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isInitialized, isAuthenticated } = useAuth();

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0b0b0e' }}>
        <div
          className="w-6 h-6 border-2 border-reactor-500/30 border-t-reactor-400 rounded-full"
          style={{ animation: 'spin 0.7s linear infinite' }}
        />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
