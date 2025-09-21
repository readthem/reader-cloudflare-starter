export type Env = {
  DB: D1Database
  R2: R2Bucket
  APP_ORIGIN: string
  AUTH_SECRET: string
  EMAIL_FROM?: string
}
