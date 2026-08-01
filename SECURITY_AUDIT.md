# Security Audit

Date: 2026-08-01  
Scope: Local source-code review and defensive remediation only. No external systems were attacked or probed.

## 1. Executive Summary

The application is a Next.js 16 / React 19 / TypeScript bookstore and admin dashboard backed by MongoDB/Mongoose, Cloudinary uploads, JWT cookie authentication, and client-side spreadsheet import.

The review found several high-impact issues: a hard-coded JWT fallback secret, admin API handlers that relied too heavily on `proxy.ts`, unsafe user-controlled regular expressions in MongoDB queries, insufficient file validation for uploads/imports, and dependency advisories in Next.js transitive packages and `xlsx`.

Applied fixes include strict JWT secret enforcement, shared request/security utilities, server-side auth checks on sensitive admin handlers, ObjectId validation, escaped and length-bounded regex filters, safer checkout totals and image handling, PDF and spreadsheet upload limits, stronger security headers, `.env.example`, and dependency patching/overrides. One dependency risk remains: `xlsx` has no npm-audit fix available, so usage has been bounded and should be replaced when feasible.

## 2. Findings Table

| ID | Severity | Vulnerability | Location | Status |
| -- | -------- | ------------- | -------- | ------ |
| F-001 | Critical | JWT fallback secret allowed predictable token signing | `lib/auth/token.ts`, `proxy.ts` | Fixed |
| F-002 | High | Admin API authorization depended on middleware/proxy only in several handlers | `app/api/admin/*` | Fixed |
| F-003 | High | NoSQL/Regex injection and ReDoS via unescaped query parameters | `app/api/books/route.ts`, `app/books/page.tsx`, admin search/bulk routes | Fixed |
| F-004 | High | Client-supplied checkout fields could influence shipping, currency, receipt URL, and quantities | `app/api/orders/checkout/route.ts` | Fixed |
| F-005 | Medium | Order tracking exposed more customer data than needed and used regex without escaping | `app/api/orders/track/route.ts` | Fixed |
| F-006 | High | Weak upload validation for images/PDF/import files | `lib/cloudinary/upload.ts`, `app/api/admin/books/extract-pdf/route.ts`, `components/admin/BooksImporter.tsx` | Fixed / mitigated |
| F-007 | Medium | Missing defense-in-depth security headers | `next.config.ts` | Fixed |
| F-008 | High | Vulnerable dependencies: Next.js transitive `postcss`/`sharp`, `xlsx` | `package.json`, `package-lock.json` | Partially fixed |
| F-009 | Medium | Missing safe environment template and broad env ignore pattern | `.env.example`, `.gitignore` | Fixed |

## 3. Detailed Findings

### F-001: Predictable JWT Secret

Severity: Critical  
Location: `lib/auth/token.ts`, `proxy.ts`  
Issue: Authentication used a hard-coded fallback secret if `JWT_SECRET` was absent.  
Impact: In a misconfigured deployment, forged admin cookies could be accepted.  
Fix: Removed the fallback, require `JWT_SECRET` to exist and be at least 32 characters, and restrict JWT verification to `HS256`.

### F-002: Admin Authorization Defense in Depth

Severity: High  
Location: `app/api/admin/categories/*`, `app/api/admin/shipping/*`, `app/api/admin/settings/route.ts`, `app/api/admin/orders/[id]/route.ts`, `app/api/admin/books/route.ts`, `app/api/admin/books/[id]/route.ts`  
Issue: Some handlers assumed `proxy.ts` would always protect `/api/admin/*`.  
Impact: Route matcher changes, framework proxy bypasses, or direct handler reuse could expose admin actions.  
Fix: Added `requireAdmin()` checks directly in sensitive handlers.

### F-003: User-Controlled Regex in MongoDB Queries

Severity: High  
Location: public books search, books page server component, admin books/orders/categories bulk/import routes.  
Issue: Search strings were passed directly into `$regex` / `RegExp`.  
Impact: ReDoS and query manipulation risk.  
Fix: Added `escapeRegex()`, input length limits, bounded pagination, enum allowlists, and ObjectId validation.

### F-004: Checkout Business Logic Hardening

Severity: High  
Location: `app/api/orders/checkout/route.ts`  
Issue: Checkout accepted broad client fields including quantity, currency, shipping, receipt URL, and item IDs with limited validation.  
Impact: Price/shipping manipulation, invalid IDs, oversized request bodies, unsafe image references.  
Fix: Totals remain server-calculated from DB prices, quantities are bounded, currency/payment methods are allowlisted, client shipping is ignored, receipt images are restricted to valid data images or Cloudinary URLs, and JSON body size/content type is enforced.

### F-005: Order Tracking Privacy

Severity: Medium  
Location: `app/api/orders/track/route.ts`  
Issue: Tracking by order number returned customer phone and detailed address, and used an unescaped exact regex.  
Impact: PII exposure if an order number is guessed or shared.  
Fix: Escaped and validated order numbers, masked phone, and removed detailed address from the response.

### F-006: File Upload and Import Validation

Severity: High  
Location: `lib/cloudinary/upload.ts`, `app/api/admin/books/extract-pdf/route.ts`, `components/admin/BooksImporter.tsx`  
Issue: Base64 images/PDF/spreadsheets lacked strong type/size checks.  
Impact: DoS, unsafe upload types, and exposure to vulnerable parser behavior.  
Fix: Added image data URL validation, Cloudinary image format restrictions, PDF MIME/extension/magic byte checks and 10MB limit, spreadsheet extension/5MB/500-row limits.

### F-007: Security Headers

Severity: Medium  
Location: `next.config.ts`  
Issue: Headers only set frame controls and a minimal CSP.  
Impact: Weaker browser-side containment against XSS/clickjacking/content sniffing.  
Fix: Added CSP, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, COOP, and CORP. CSP keeps required allowances for Next.js, inline styles/scripts, data images, Cloudinary, and Gemini API.

### F-008: Dependency Vulnerabilities

Severity: High  
Location: `package.json`, `package-lock.json`  
Issue: `npm audit` reported high issues in Next.js transitive dependencies and `xlsx`.  
Impact: Framework-level auth/proxy/DoS/SSRF advisories and spreadsheet parser risk.  
Fix: Updated `next` and `eslint-config-next` to `16.2.12`, added npm overrides for patched `postcss` and `sharp`. Remaining: `xlsx` has no fix available in npm audit; import usage is now bounded, but replacement is recommended.

### F-009: Environment Hygiene

Severity: Medium  
Location: `.env.example`, `.gitignore`  
Issue: `.env.example` was missing and `.env*` ignored all env examples.  
Impact: Higher chance of copying real secrets into docs or deployments.  
Fix: Added `.env.example` with empty values and unignored it in `.gitignore`. Local `.env` was reviewed only by variable name and redacted metadata; values are not included here.

## 4. Files Changed

- `.env.example`: Added safe environment variable template with blank values.
- `.gitignore`: Allows tracking `.env.example` while keeping real `.env*` ignored.
- `lib/security/request.ts`: New shared validation/auth helpers.
- `lib/auth/token.ts`, `proxy.ts`: Removed fallback secret and hardened JWT verification.
- `next.config.ts`: Added browser security headers.
- `lib/cloudinary/upload.ts`: Restricted base64 image upload type and size.
- `app/api/orders/checkout/route.ts`, `app/api/orders/track/route.ts`: Hardened public order flows.
- `app/api/books/route.ts`, `app/books/page.tsx`: Hardened public filtering and pagination.
- `app/api/admin/**`: Added auth checks, ObjectId checks, body parsing limits, enum allowlists, escaped regex, and update validators where applicable.
- `components/admin/BooksImporter.tsx`: Added client-side import file limits.
- `package.json`, `package-lock.json`: Patched Next.js and transitive dependency overrides.
- `components/ui/ScrollReveal.tsx`, `lib/utils/pdfExtractor.ts`, `lib/utils/theme.ts`, `app/api/home/route.ts`: Small lint/typecheck fixes needed to verify the build.

## 5. Tests Performed

| Command | Result |
| ------- | ------ |
| `npm run lint` | Passed |
| `npm run type-check` | Passed |
| `npm run build` | Passed on Next.js 16.2.12 |
| `npm audit --json` | 1 high remains: `xlsx`, no fix available |
| Targeted `rg` scans | No fallback JWT secret; reviewed direct JSON parsing, regex, dangerous APIs, localStorage/cookie usage |

## 6. Remaining Risks

- `xlsx` remains vulnerable according to npm audit and has no fix available. Replace it with a maintained parser, move parsing to a sandboxed server worker, or accept only CSV if that meets business needs.
- Rotate all production secrets if there is any chance `.env` or Git history was exposed. Variables observed locally, values redacted: `MONGODB_URI`, `JWT_SECRET`, `NEXT_PUBLIC_APP_URL`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `GEMINI_API_KEY`.
- `NEXT_PUBLIC_APP_URL` is public by design; keep secrets out of any `NEXT_PUBLIC_*` variable.
- In-memory rate limiting is best-effort only. Use platform or Redis-backed rate limiting for production login, checkout, tracking, and imports.
- CSP includes `'unsafe-inline'` and `'unsafe-eval'` to avoid breaking the current Next.js/app behavior. Tighten with nonces/hashes after UI testing.
- Validate Vercel/domain settings, MongoDB Atlas network rules, Cloudinary upload presets, DNS, WAF, and backup permissions outside the codebase.
- Public order tracking still depends on order-number secrecy. Consider adding phone suffix verification.
- Some Arabic text in source files appears mojibake-encoded. This can hide review intent and should be normalized in a separate content-safe pass.

## 7. Security Checklist

| Area | Status |
| ---- | ------ |
| Authentication/JWT/cookies | Fixed |
| Admin API authorization | Fixed |
| IDOR/BOLA for admin object IDs | Fixed for reviewed admin routes |
| Public query filtering / regex safety | Fixed |
| Mass assignment | Fixed for reviewed update/checkout paths |
| Checkout price and shipping logic | Fixed |
| Order tracking privacy | Fixed |
| Image upload validation | Fixed |
| PDF upload validation | Fixed |
| Spreadsheet import parser risk | Needs manual review |
| Security headers | Fixed |
| CORS | Safe: no open custom CORS found |
| CSRF | Needs manual review for cookie-auth state changes |
| Webhooks/payments | Not applicable: no Stripe/payment webhook found |
| Secrets in current `.env` | Needs manual review/rotation policy |
| `.env.example` and ignore rules | Fixed |
| Dependency audit | Needs manual review for `xlsx` |
| Git history secret scan | Needs manual review |
| Production infrastructure settings | Needs manual review |

## 8. Second Security Pass - 2026-08-01

### What Was Fixed

- Replaced vulnerable `xlsx` with `exceljs` for `.xlsx` imports and added a local CSV parser for `.csv`.
- Removed legacy `.xls` import support because `exceljs` does not reliably parse old binary Excel files in the browser. Users should export legacy spreadsheets as `.xlsx` or `.csv`.
- Added CSRF Origin/Host validation for cookie-authenticated state-changing requests.
- Added serverless-compatible rate limiting with Upstash Redis REST. Development/test fallback uses local memory only outside production. Production fails closed if Upstash variables are missing or unavailable.
- Applied rate limits to login, checkout, order tracking, admin imports/uploads, and sensitive admin mutations.
- Updated order tracking to require both order number and the last 4 digits of the customer phone number. Phone suffix comparison uses constant-time comparison.
- Rechecked admin route handlers: all reviewed `app/api/admin/**/route.ts` handlers now contain `requireAdmin()` inside the handler.
- Removed `'unsafe-eval'` from production CSP. It remains only for non-production builds.
- Added Vitest tests for CSRF, rate limiting, unauthenticated admin access, phone verification on tracking, checkout tampering, invalid image/PDF validation, and regex escaping.

### Remaining Items

- `gitleaks` was not installed locally, so the defensive secret scan used `rg` and `git log -G` fallback checks. For higher confidence, install and run Gitleaks in CI.
- No customer/user ownership model exists beyond admin auth and public order tracking. The IDOR control for public order tracking is now order number plus phone suffix. If user accounts are added later, add owner-scoped database queries.
- There are no account creation, password reset, email-sending, or payment webhook endpoints in the current codebase, so those rate-limit categories were not directly wired to a route.

### User-Visible Changes

- Order tracking now requires the order number and the last 4 digits of the phone number.
- Book import accepts `.xlsx` and `.csv`; old `.xls` files must be converted first.
- In production, requests may return `503 Rate limiting is not configured` until Upstash Redis variables are configured.

### New Environment Variables

```text
APP_ORIGIN=
ALLOWED_ORIGINS=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

`NEXT_PUBLIC_APP_URL` is still supported and used as an allowed origin source. Keep secrets out of any `NEXT_PUBLIC_*` variable.

### Vercel / Upstash Setup

1. Create an Upstash Redis database in the same region as the Vercel deployment when possible.
2. Copy the REST URL into `UPSTASH_REDIS_REST_URL`.
3. Copy the REST token into `UPSTASH_REDIS_REST_TOKEN`.
4. Set `APP_ORIGIN` to the canonical production origin, for example `https://example.com`.
5. Set `ALLOWED_ORIGINS` only if additional trusted origins are needed, comma-separated.
6. Redeploy and verify login, checkout, order tracking, and admin mutations.

### Secret Scan Results

- `gitleaks`: not installed.
- Current-file fallback scan found variable names only; values are redacted: `MONGODB_URI`, `JWT_SECRET`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `ADMIN_PASSWORD`, `GEMINI_API_KEY`, `UPSTASH_REDIS_REST_TOKEN`.
- Git history fallback scan found commits touching sensitive variable names or config-related files, but no secret values are printed here. Files included `README.md`, `seed.js`, `lib/auth/token.ts`, `lib/cloudinary/upload.ts`, `lib/db/dbConnect.ts`, and admin/API files. Rotate secrets if any historical exposure is suspected.

### Second Pass Tests

| Command | Result |
| ------- | ------ |
| `npm run lint` | Passed |
| `npm run type-check` | Passed |
| `npm test` | Passed, 8 tests |
| `npm run build` | Passed |
| `npm audit` | Passed, 0 vulnerabilities |
