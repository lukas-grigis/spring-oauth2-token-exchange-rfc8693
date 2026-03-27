import { createContext, type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import Keycloak from 'keycloak-js';

export interface UserInfo {
  sub: string;
  preferred_username: string;
  given_name?: string;
  family_name?: string;
  email?: string;
  realm_access?: { roles: string[] };
}

export interface AuthContextValue {
  isInitialized: boolean;
  isAuthenticated: boolean;
  accessToken: string | null;
  userInfo: UserInfo | null;
  roles: string[];
  displayName: string;
  initials: string;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

const keycloak = new Keycloak({
  url: 'http://localhost/auth',
  realm: 'conference',
  clientId: 'public',
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

  const updateState = useCallback(async () => {
    setAccessToken(keycloak.token ?? null);
    if (keycloak.tokenParsed) {
      const parsed = keycloak.tokenParsed as UserInfo;
      if (!parsed.preferred_username) {
        try {
          const profile = await keycloak.loadUserProfile();
          setUserInfo({
            ...parsed,
            preferred_username: profile.username ?? parsed.sub,
            given_name: profile.firstName,
            family_name: profile.lastName,
            email: profile.email,
          });
          return;
        } catch {
          /* fall through */
        }
      }
      setUserInfo(parsed);
    }
  }, []);

  useEffect(() => {
    let refreshInterval: ReturnType<typeof setInterval>;

    keycloak
      .init({
        onLoad: 'check-sso',
        silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html',
        pkceMethod: 'S256',
        checkLoginIframe: true,
      })
      .then(async (authenticated) => {
        if (authenticated) {
          await updateState();
          refreshInterval = setInterval(async () => {
            try {
              const refreshed = await keycloak.updateToken(30);
              if (refreshed) await updateState();
            } catch {
              await keycloak.logout({ redirectUri: window.location.origin + '/login' });
            }
          }, 30_000);
        }
        setIsInitialized(true);
      })
      .catch(() => setIsInitialized(true));

    return () => clearInterval(refreshInterval);
  }, [updateState]);

  const login = useCallback(async () => {
    await keycloak.login({ redirectUri: window.location.origin + '/dashboard' });
  }, []);

  const logout = useCallback(async () => {
    await keycloak.logout({ redirectUri: window.location.origin + '/login' });
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const roles = userInfo?.realm_access?.roles ?? [];
    const displayName =
      userInfo?.given_name && userInfo?.family_name
        ? `${userInfo.given_name} ${userInfo.family_name}`
        : (userInfo?.preferred_username ?? '');
    const initials =
      userInfo?.given_name && userInfo?.family_name
        ? `${userInfo.given_name[0]}${userInfo.family_name[0]}`
        : (userInfo?.preferred_username ?? '?')[0].toUpperCase();

    return {
      isInitialized,
      isAuthenticated: !!accessToken,
      accessToken,
      userInfo,
      roles,
      displayName,
      initials,
      login,
      logout,
    };
  }, [isInitialized, accessToken, userInfo, login, logout]);

  return <AuthContext value={value}>{children}</AuthContext>;
}
