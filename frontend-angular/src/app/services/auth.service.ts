import { Injectable, signal, computed } from "@angular/core"
import { Router } from "@angular/router"
import Keycloak from "keycloak-js"

@Injectable({ providedIn: "root" })
export class AuthService {
  private keycloak: Keycloak | null = null
  private accessToken = signal<string | null>(null)
  isAuthenticated = computed(() => this.accessToken() !== null)

  constructor(private router: Router) {
    this.init()
  }

  private async init() {
    this.keycloak = new Keycloak({
      url: "http://localhost:8080",
      realm: "conference",
      clientId: "public",
    })

    const authenticated = await this.keycloak.init({
      onLoad: "check-sso",
      pkceMethod: "S256",
    })

    if (authenticated && this.keycloak.token) {
      this.accessToken.set(this.keycloak.token)
      this.startTokenRefresh()
      this.router.navigate(["/dashboard"])
    }
  }

  private startTokenRefresh() {
    setInterval(async () => {
      if (!this.keycloak) return
      const refreshed = await this.keycloak.updateToken(30)
      if (refreshed && this.keycloak.token) {
        this.accessToken.set(this.keycloak.token)
      }
    }, 30000)
  }

  login() {
    this.keycloak?.login()
  }

  logout() {
    this.accessToken.set(null)
    this.keycloak?.logout({ redirectUri: window.location.origin })
  }

  getToken(): string | null {
    return this.accessToken()
  }

  getUserName(): string {
    if (!this.keycloak?.tokenParsed) return "User"
    return (this.keycloak.tokenParsed as Record<string, string>)["preferred_username"] ?? "User"
  }
}
