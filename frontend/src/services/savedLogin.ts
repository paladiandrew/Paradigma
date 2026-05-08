const SAVED_LOGIN_KEY = 'paradigma_saved_login'
const SAVED_LOGIN_UNTIL_KEY = 'paradigma_saved_login_until'
const YEAR_MS = 365 * 24 * 60 * 60 * 1000

export function loadSavedLogin(): string {
  const until = localStorage.getItem(SAVED_LOGIN_UNTIL_KEY)
  if (!until || Number.isNaN(Number(until)) || Date.now() > Number(until)) {
    localStorage.removeItem(SAVED_LOGIN_KEY)
    localStorage.removeItem(SAVED_LOGIN_UNTIL_KEY)
    return ''
  }
  return localStorage.getItem(SAVED_LOGIN_KEY) || ''
}

export function persistSavedLogin(login: string): void {
  const t = login.trim()
  if (!t) {
    localStorage.removeItem(SAVED_LOGIN_KEY)
    localStorage.removeItem(SAVED_LOGIN_UNTIL_KEY)
    return
  }
  localStorage.setItem(SAVED_LOGIN_KEY, t)
  localStorage.setItem(SAVED_LOGIN_UNTIL_KEY, String(Date.now() + YEAR_MS))
}
