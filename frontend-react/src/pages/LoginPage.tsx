import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../hooks/useAuth';

export function LoginPage() {
  const { isAuthenticated, isInitialized, login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isInitialized && isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isInitialized, isAuthenticated, navigate]);

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at 50% 110%, #083344 0%, #0b0b0e 55%)' }}
    >
      {/* Ambient reactor glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-1/3 left-1/3 w-80 h-80 rounded-full blur-[100px] opacity-20"
          style={{ background: '#06b6d4', animation: 'reactor-glow 5s ease-in-out infinite' }}
        />
        <div
          className="absolute bottom-1/4 right-1/3 w-60 h-60 rounded-full blur-[90px] opacity-15"
          style={{ background: '#0891b2', animation: 'reactor-glow 7s ease-in-out infinite 1.5s' }}
        />
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-sm mx-4" style={{ animation: 'float-up 0.5s ease-out' }}>
        <div
          className="rounded-2xl p-8 border border-deep-800/70 backdrop-blur-xl"
          style={{ background: 'linear-gradient(160deg, rgba(23,24,29,0.95), rgba(11,11,14,0.98))' }}
        >
          {/* React Atom */}
          <div className="flex justify-center mb-8">
            <div className="relative w-[80px] h-[80px]">
              {/* Core */}
              <div
                className="absolute top-1/2 left-1/2 w-4 h-4 -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{
                  background: 'radial-gradient(circle, #67e8f9, #06b6d4)',
                  boxShadow: '0 0 20px rgba(6,182,212,0.6)',
                  animation: 'core-pulse 2s ease-in-out infinite',
                }}
              />
              {/* Orbital 1 */}
              <div className="absolute inset-0" style={{ animation: 'orbit-1 8s linear infinite' }}>
                <svg viewBox="0 0 80 80" className="w-full h-full" fill="none">
                  <ellipse cx="40" cy="40" rx="36" ry="14" stroke="url(#o1)" strokeWidth="1.2" opacity="0.6" />
                  <circle cx="76" cy="40" r="2.5" fill="#22d3ee" />
                  <defs>
                    <linearGradient id="o1" x1="4" y1="40" x2="76" y2="40">
                      <stop stopColor="#06b6d4" stopOpacity="0.2" />
                      <stop offset="0.5" stopColor="#22d3ee" />
                      <stop offset="1" stopColor="#06b6d4" stopOpacity="0.2" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              {/* Orbital 2 */}
              <div
                className="absolute inset-0"
                style={{ animation: 'orbit-2 8s linear infinite', transform: 'rotate(60deg)' }}
              >
                <svg viewBox="0 0 80 80" className="w-full h-full" fill="none">
                  <ellipse cx="40" cy="40" rx="36" ry="14" stroke="#0891b2" strokeWidth="1.2" opacity="0.5" />
                  <circle cx="76" cy="40" r="2.5" fill="#06b6d4" />
                </svg>
              </div>
              {/* Orbital 3 */}
              <div
                className="absolute inset-0"
                style={{ animation: 'orbit-3 8s linear infinite', transform: 'rotate(-60deg)' }}
              >
                <svg viewBox="0 0 80 80" className="w-full h-full" fill="none">
                  <ellipse cx="40" cy="40" rx="36" ry="14" stroke="#0e7490" strokeWidth="1.2" opacity="0.4" />
                  <circle cx="76" cy="40" r="2.5" fill="#0891b2" />
                </svg>
              </div>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-center text-2xl font-bold tracking-tight text-deep-50 mb-1">Token Exchange</h1>
          <p className="text-center text-sm text-deep-400 mb-1 font-mono">RFC 8693</p>
          <p className="text-center text-xs text-deep-500 mb-8">React Demo</p>

          {/* Login button */}
          <button
            onClick={() => login()}
            className="w-full py-3.5 px-6 rounded-xl font-semibold text-white text-sm cursor-pointer transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #06b6d4, #0e7490)',
              boxShadow: '0 4px 20px rgba(6,182,212,0.25), inset 0 1px 0 rgba(255,255,255,0.08)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 0 30px rgba(6,182,212,0.3)')}
            onMouseLeave={(e) =>
              (e.currentTarget.style.boxShadow =
                '0 4px 20px rgba(6,182,212,0.25), inset 0 1px 0 rgba(255,255,255,0.08)')
            }
          >
            Login with Keycloak
          </button>

          {/* Decorative */}
          <div className="mt-8 flex items-center gap-3">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-deep-700 to-transparent" />
            <span className="text-[10px] text-deep-600 font-mono uppercase tracking-widest">OAuth 2.0</span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-deep-700 to-transparent" />
          </div>
        </div>
      </div>
    </div>
  );
}
