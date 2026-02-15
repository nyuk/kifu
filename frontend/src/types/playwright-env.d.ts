declare module '@playwright/test' {
  export const test: any
  export const expect: any
  export const request: {
    newContext: (options?: any) => Promise<any>
  }
  export const devices: Record<string, any>
  export const defineConfig: (config: any) => any
}
