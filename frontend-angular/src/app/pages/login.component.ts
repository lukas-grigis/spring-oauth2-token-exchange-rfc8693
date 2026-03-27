import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="min-h-screen flex items-center justify-center relative overflow-hidden"
      style="background: radial-gradient(ellipse at 50% 120%, #4b0804 0%, #0d0d10 60%)"
    >
      <!-- Animated background fissures -->
      <div class="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          class="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-[120px] opacity-20"
          style="background: #ff3d2e; animation: pulse-glow 4s ease-in-out infinite"
        ></div>
        <div
          class="absolute bottom-1/4 right-1/3 w-64 h-64 rounded-full blur-[100px] opacity-15"
          style="background: #ed2010; animation: pulse-glow 6s ease-in-out infinite 1s"
        ></div>
        <div
          class="absolute top-1/2 right-1/4 w-48 h-48 rounded-full blur-[80px] opacity-10"
          style="background: #ffa097; animation: pulse-glow 5s ease-in-out infinite 2s"
        ></div>
      </div>

      <!-- Login card -->
      <div class="relative z-10 w-full max-w-sm mx-4" style="animation: fade-in-up 0.6s ease-out">
        <!-- Card -->
        <div
          class="rounded-2xl p-8 backdrop-blur-xl border border-obsidian-800/80"
          style="background: linear-gradient(135deg, rgba(26,26,30,0.95), rgba(13,13,16,0.98));"
        >
          <!-- Angular Shield SVG -->
          <div class="flex justify-center mb-8" style="animation: shield-float 3s ease-in-out infinite">
            <div class="relative">
              <svg width="72" height="80" viewBox="0 0 256 272" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M128 0L256 45.2V181.1C256 225.5 219 259.1 128 272C37 259.1 0 225.5 0 181.1V45.2L128 0Z"
                  fill="url(#shield-gradient)"
                  opacity="0.9"
                />
                <path
                  d="M128 30L230 66V178C230 213 199 241 128 252C57 241 26 213 26 178V66L128 30Z"
                  fill="#0d0d10"
                  opacity="0.7"
                />
                <path
                  d="M128 60L200 86V170C200 196 177 217 128 226C79 217 56 196 56 170V86L128 60Z"
                  fill="url(#shield-inner)"
                  opacity="0.5"
                />
                <defs>
                  <linearGradient id="shield-gradient" x1="128" y1="0" x2="128" y2="272" gradientUnits="userSpaceOnUse">
                    <stop stop-color="#ff6b5b" />
                    <stop offset="1" stop-color="#c81508" />
                  </linearGradient>
                  <linearGradient id="shield-inner" x1="128" y1="60" x2="128" y2="226" gradientUnits="userSpaceOnUse">
                    <stop stop-color="#ff3d2e" />
                    <stop offset="1" stop-color="#881912" />
                  </linearGradient>
                </defs>
              </svg>
              <!-- Glow behind shield -->
              <div
                class="absolute inset-0 -z-10 blur-2xl opacity-40"
                style="background: radial-gradient(circle, #ff3d2e, transparent 70%)"
              ></div>
            </div>
          </div>

          <!-- Title -->
          <h1 class="text-center text-2xl font-bold tracking-tight text-obsidian-50 mb-1">Token Exchange</h1>
          <p class="text-center text-sm text-obsidian-400 mb-1 font-mono">RFC 8693</p>
          <p class="text-center text-xs text-obsidian-500 mb-8">Angular Demo</p>

          <!-- Login button -->
          <button
            (click)="login()"
            class="w-full py-3.5 px-6 rounded-xl font-semibold text-white text-sm
                         transition-all duration-300 cursor-pointer
                         hover:shadow-[0_0_30px_rgba(255,61,46,0.3)] hover:scale-[1.02]
                         active:scale-[0.98]"
            style="background: linear-gradient(135deg, #ff3d2e, #c81508);
                         box-shadow: 0 4px 20px rgba(200,21,8,0.3), inset 0 1px 0 rgba(255,255,255,0.1)"
          >
            Login with Keycloak
          </button>

          <!-- Decorative line -->
          <div class="mt-8 flex items-center gap-3">
            <div class="flex-1 h-px bg-gradient-to-r from-transparent via-obsidian-700 to-transparent"></div>
            <span class="text-[10px] text-obsidian-600 font-mono uppercase tracking-widest">OAuth 2.0</span>
            <div class="flex-1 h-px bg-gradient-to-r from-transparent via-obsidian-700 to-transparent"></div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class LoginComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  async ngOnInit(): Promise<void> {
    if (!this.auth.isInitialized()) {
      await this.auth.init();
    }
    if (this.auth.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
    }
  }

  login(): void {
    this.auth.login();
  }
}
