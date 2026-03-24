import { oidc } from "./oidc"
import { LoginPage } from "./LoginPage"
import { DashboardPage } from "./DashboardPage"

export function App() {
  if (!oidc.isUserLoggedIn) {
    return <LoginPage />
  }
  return <DashboardPage />
}
