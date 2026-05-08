/// <reference types="vite/client" />

declare module 'js-cookie' {
  const Cookies: {
    get(name: string): string | undefined
    set(name: string, value: string, options?: Record<string, unknown>): void
    remove(name: string, options?: Record<string, unknown>): void
  }
  export default Cookies
}
