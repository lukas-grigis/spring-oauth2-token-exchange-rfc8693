import { computed, readonly, ref } from 'vue';
import Keycloak from 'keycloak-js';

export interface UserInfo {
  sub: string;
  preferred_username: string;
  given_name?: string;
  family_name?: string;
  email?: string;
  realm_access?: { roles: string[] };
}

const keycloak = new Keycloak({
  url: 'http://localhost/auth',
  realm: 'conference',
  clientId: 'public',
});

const isInitialized = ref(false);
const accessToken = ref<string | null>(null);
const userInfo = ref<UserInfo | null>(null);
let refreshInterval: ReturnType<typeof setInterval> | null = null;

const isAuthenticated = computed(() => !!accessToken.value);
const roles = computed(() => userInfo.value?.realm_access?.roles ?? []);
const displayName = computed(() => {
  const u = userInfo.value;
  if (!u) return '';
  if (u.given_name && u.family_name) return `${u.given_name} ${u.family_name}`;
  return u.preferred_username ?? '';
});
const initials = computed(() => {
  const u = userInfo.value;
  if (!u) return '?';
  if (u.given_name && u.family_name) return `${u.given_name[0]}${u.family_name[0]}`;
  return (u.preferred_username ?? '?')[0].toUpperCase();
});

async function updateTokenState() {
  accessToken.value = keycloak.token ?? null;
  if (keycloak.tokenParsed) {
    const parsed = keycloak.tokenParsed as UserInfo;
    if (!parsed.preferred_username) {
      try {
        const profile = await keycloak.loadUserProfile();
        userInfo.value = {
          ...parsed,
          preferred_username: profile.username ?? parsed.sub,
          given_name: profile.firstName,
          family_name: profile.lastName,
          email: profile.email,
        };
        return;
      } catch {
        /* fall through */
      }
    }
    userInfo.value = parsed;
  }
}

function startTokenRefresh() {
  refreshInterval = setInterval(async () => {
    try {
      const refreshed = await keycloak.updateToken(30);
      if (refreshed) await updateTokenState();
    } catch {
      console.warn('Token refresh failed, logging out');
      await logout();
    }
  }, 30_000);
}

function stopTokenRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
}

async function init(): Promise<boolean> {
  try {
    const authenticated = await keycloak.init({
      onLoad: 'check-sso',
      silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html',
      pkceMethod: 'S256',
      checkLoginIframe: true,
    });
    if (authenticated) {
      await updateTokenState();
      startTokenRefresh();
    }
    isInitialized.value = true;
    return authenticated;
  } catch (err) {
    console.error('Keycloak init failed:', err);
    isInitialized.value = true;
    return false;
  }
}

async function login() {
  await keycloak.login({ redirectUri: window.location.origin + '/dashboard' });
}

async function logout() {
  stopTokenRefresh();
  await keycloak.logout({ redirectUri: window.location.origin + '/login' });
}

export function useAuth() {
  return {
    isInitialized: readonly(isInitialized),
    accessToken: readonly(accessToken),
    userInfo: readonly(userInfo),
    isAuthenticated,
    roles,
    displayName,
    initials,
    init,
    login,
    logout,
  };
}
