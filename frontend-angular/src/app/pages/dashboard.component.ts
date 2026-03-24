import { Component, inject, OnInit, signal } from "@angular/core"
import { HttpClient } from "@angular/common/http"
import { AuthService } from "../services/auth.service"

interface Talk {
  id: string
  title: string
  speaker: string
  room: string
  timeSlot: string
  description: string
}

interface Registration {
  id: string
  talkId: string
  userId: string
  registeredAt: string
}

@Component({
  selector: "app-dashboard",
  standalone: true,
  template: `
    <div class="min-h-screen bg-zinc-50">
      <header class="border-b border-zinc-200 bg-white px-6 py-4">
        <div class="mx-auto flex max-w-4xl items-center justify-between">
          <h1 class="text-lg font-semibold text-zinc-900">Conference Portal</h1>
          <div class="flex items-center gap-4">
            <span class="text-sm text-zinc-600">{{ auth.getUserName() }}</span>
            <button
              (click)="auth.logout()"
              class="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main class="mx-auto max-w-4xl p-6">
        @if (loading()) {
          <p class="text-sm text-zinc-500">Loading...</p>
        } @else {
          <h2 class="mb-4 text-xl font-semibold text-zinc-900">Available Talks</h2>
          <div class="mb-8 grid gap-4">
            @for (talk of talks(); track talk.id) {
              <div class="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
                <div class="flex items-start justify-between gap-4">
                  <div>
                    <h3 class="font-medium text-zinc-900">{{ talk.title }}</h3>
                    <p class="mt-1 text-sm text-zinc-500">
                      {{ talk.speaker }} · {{ talk.room }} · {{ talk.timeSlot }}
                    </p>
                    <p class="mt-2 text-sm text-zinc-600">{{ talk.description }}</p>
                  </div>
                  <button
                    (click)="register(talk.id)"
                    [disabled]="isRegistered(talk.id)"
                    class="shrink-0 rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-40"
                  >
                    {{ isRegistered(talk.id) ? 'Registered' : 'Register' }}
                  </button>
                </div>
              </div>
            }
          </div>

          <h2 class="mb-4 text-xl font-semibold text-zinc-900">My Registrations</h2>
          @if (registrations().length === 0) {
            <p class="text-sm text-zinc-500">No registrations yet.</p>
          } @else {
            <div class="grid gap-3">
              @for (reg of registrations(); track reg.id) {
                <div class="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
                  <div>
                    <p class="font-medium text-zinc-900">{{ talkTitle(reg.talkId) }}</p>
                    <p class="text-xs text-zinc-500">Registered {{ reg.registeredAt | date:'medium' }}</p>
                  </div>
                  <button
                    (click)="cancel(reg.id)"
                    class="rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                  >
                    Cancel
                  </button>
                </div>
              }
            </div>
          }
        }
      </main>
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  private http = inject(HttpClient)
  auth = inject(AuthService)

  talks = signal<Talk[]>([])
  registrations = signal<Registration[]>([])
  loading = signal(true)

  ngOnInit() {
    this.loadData()
  }

  loadData() {
    this.http.get<Talk[]>("/schedule/talks").subscribe((t) => this.talks.set(t))
    this.http.get<Registration[]>("/registrations/mine").subscribe((r) => {
      this.registrations.set(r)
      this.loading.set(false)
    })
  }

  register(talkId: string) {
    this.http.post("/registrations", { talkId }).subscribe(() => this.loadData())
  }

  cancel(id: string) {
    this.http.delete(`/registrations/${id}`).subscribe(() => this.loadData())
  }

  isRegistered(talkId: string): boolean {
    return this.registrations().some((r) => r.talkId === talkId)
  }

  talkTitle(talkId: string): string {
    return this.talks().find((t) => t.id === talkId)?.title ?? talkId
  }
}
