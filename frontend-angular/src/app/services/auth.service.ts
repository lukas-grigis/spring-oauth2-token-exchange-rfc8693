import { computed, Injectable, signal } from '@angular/core';
import Keycloak from 'keycloak-js';

export interface UserInfo {
  sub: string;
  preferred_username: string;
  given_name?: string;
  family_name?: string;
  email?: string;
  realm_access?: { roles: string[] };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly isInitialized = signal(false);
  readonly accessToken = signal<string | null>(null);
  readonly userInfo = signal<UserInfo | null>(null);
  readonly isAuthenticated = computed(() => !!this.accessToken());
  readonly roles = computed(() => this.userInfo()?.realm_access?.roles ?? []);
  readonly displayName = computed(() => {
    const info = this.userInfo();
    if (!info) return '';
    if (info.given_name && info.family_name) return `${info.given_name} ${info.family_name}`;
    return info.preferred_username ?? '';
  });
  readonly initials = computed(() => {
    const info = this.userInfo();
    if (!info) return '?';
    if (info.given_name && info.family_name) return `${info.given_name[0]}${info.family_name[0]}`;
    return (info.preferred_username ?? '?')[0].toUpperCase();
  });
  private readonly keycloak = new Keycloak({
    url: 'http://localhost/auth',
    realm: 'conference',
    clientId: 'public',
  });
  private refreshInterval: ReturnType<typeof setInterval> | null = null;

  async init(): Promise<boolean> {
    try {
      const authenticated = await this.keycloak.init({
        onLoad: 'check-sso',
        silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html',
        pkceMethod: 'S256',
        checkLoginIframe: true,
      });

      if (authenticated) {
        await this.updateTokenState();
        this.startTokenRefresh();
      }

      this.isInitialized.set(true);
      return authenticated;
    } catch (err) {
      console.error('Keycloak init failed:', err);
      this.isInitialized.set(true);
      return false;
    }
  }

  async login(): Promise<void> {
    await this.keycloak.login({ redirectUri: window.location.origin + '/dashboard' });
  }

  async logout(): Promise<void> {
    this.stopTokenRefresh();
    await this.keycloak.logout({ redirectUri: window.location.origin + '/login' });
  }

  private async updateTokenState(): Promise<void> {
    this.accessToken.set(this.keycloak.token ?? null);

    // Lightweight tokens may lack profile claims — load from userinfo endpoint
    if (this.keycloak.tokenParsed) {
      const parsed = this.keycloak.tokenParsed as UserInfo;
      if (!parsed.preferred_username) {
        try {
          const profile = await this.keycloak.loadUserProfile();
          this.userInfo.set({
            ...parsed,
            preferred_username: profile.username ?? parsed.sub,
            given_name: profile.firstName,
            family_name: profile.lastName,
            email: profile.email,
          });
          return;
        } catch {
          /* fall through to tokenParsed */
        }
      }
      this.userInfo.set(parsed);
    }
  }

  private startTokenRefresh(): void {
    this.refreshInterval = setInterval(async () => {
      try {
        const refreshed = await this.keycloak.updateToken(30);
        if (refreshed) await this.updateTokenState();
      } catch {
        console.warn('Token refresh failed, logging out');
        await this.logout();
      }
    }, 30_000);
  }

  private stopTokenRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }
}
