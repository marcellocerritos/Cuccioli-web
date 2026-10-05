interface D1Result<T = unknown> { results: T[]; success: boolean; meta: Record<string, unknown>; }
interface D1PreparedStatement { bind(...values: unknown[]): D1PreparedStatement; first<T = Record<string, unknown>>(column?: string): Promise<T | null>; all<T = Record<string, unknown>>(): Promise<D1Result<T>>; run<T = Record<string, unknown>>(): Promise<D1Result<T>>; raw<T = unknown[]>(): Promise<T[]>; }
interface D1Database { prepare(query: string): D1PreparedStatement; batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>; exec(query: string): Promise<unknown>; }
interface Fetcher { fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>; }
interface R2Bucket { put(key: string, value: ArrayBuffer | Blob | ReadableStream, options?: { httpMetadata?: { contentType?: string } }): Promise<unknown>; get(key: string): Promise<{ body: ReadableStream; httpMetadata?: { contentType?: string } } | null>; }
declare module "cloudflare:workers" { export const env: { DB: D1Database; BUCKET: R2Bucket; ASSETS: Fetcher; [key: string]: unknown }; }
