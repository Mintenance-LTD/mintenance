# PCI DSS v4.0 Compliance Checklist — Mintenance Platform

**Assessment Date**: 2026-02-27
**Assessor**: Security Expert Agent (Claude)
**PCI DSS Version**: v4.0
**Applicable SAQ**: SAQ-A-EP (card data handled via JavaScript redirect to Stripe hosted fields, with server-side processing)

**Legend**: ✅ Compliant | ⚠️ Partial | ❌ Non-compliant | ❓ Unknown

---

## Requirement 1: Install and Maintain Network Security Controls

| Sub-Req | Description | Status | Evidence |
|---------|-------------|--------|----------|
| 1.1 | Define and document security policies for network controls | ❓ | No policy documents in codebase |
| 1.2 | Network access controls restrict inbound/outbound traffic | ⚠️ | CORS configured (middleware.ts:180-254); WAF not visible in code |
| 1.3 | Prohibit direct public access to cardholder data environment | ✅ | Stripe handles card data; Supabase database not directly exposed |
| 1.4 | Network access controls for trusted/untrusted networks | ❓ | Infrastructure-level concern |
| 1.5 | Security controls on personal devices (BYOD) | ❓ | Policy concern |

**Overall**: ⚠️ PARTIAL — Code-level network controls (CORS, CSP) are in place. Infrastructure-level controls (WAF, firewall rules) are out-of-scope for code review.

---

## Requirement 2: Apply Secure Configurations to All System Components

| Sub-Req | Description | Status | Evidence |
|---------|-------------|--------|----------|
| 2.1 | Document and apply security configuration standards | ❓ | No hardening guide in repo |
| 2.2 | Set up system components to prevent misuse | ⚠️ | Multiple Stripe instances with inconsistent API versions (FINDING M-05) |
| 2.3 | Remove or disable unnecessary default accounts | ✅ | Supabase anon key properly scoped with RLS (334 tables) |
| 2.4 | Maintain inventory of system components | ❓ | No SBOM (Software Bill of Materials) in repo |
| 2.5 | Protect against all known vulnerabilities | ⚠️ | `minimatch` ReDoS (dev deps only); Stripe SDK 2024-04-10 (outdated, FINDING HIGH-2) |
| 2.6 | Shared hosting providers protect cardholder data | ✅ | Vercel + Supabase are PCI-compliant hosting providers |

**Overall**: ⚠️ PARTIAL — Default settings are reasonable but Stripe API version inconsistency and no hardening documentation.

---

## Requirement 3: Protect Stored Account Data

| Sub-Req | Description | Status | Evidence |
|---------|-------------|--------|----------|
| 3.1 | Processes and procedures for protecting stored data | ❓ | Policy concern |
| 3.2 | Do not retain sensitive authentication data after authorization | ❌ | Raw Stripe webhook events stored verbatim (FINDING MED-6); may contain customer data |
| 3.3 | Protect stored PAN; display only necessary digits | ✅ | No PAN stored; only last4, brand returned |
| 3.4 | Render PAN unreadable anywhere stored | ✅ | No PAN stored anywhere |
| 3.5 | Protect cryptographic keys for PAN protection | ❌ | `mfa_secret` stored unencrypted in `profiles` table (FINDING CRIT-1); `ENCRYPTION_MASTER_KEY` in `.env.local` not rotated (CRIT-1 credential issue) |
| 3.6 | Procedures for protecting encryption keys | ⚠️ | `ENCRYPTION_MASTER_KEY` in env vars; no key rotation mechanism visible |
| 3.7 | Key management procedures (generation, rotation, retirement) | ❌ | Several keys have `TODO: ROTATE` flags (CRIT-1); no rotation process |

**Overall**: ❌ NON-COMPLIANT — TOTP MFA secrets are plaintext in DB; raw webhook event data may contain cardholder data; key rotation is acknowledged as pending but not done.

---

## Requirement 4: Protect Cardholder Data With Strong Cryptography During Transmission

| Sub-Req | Description | Status | Evidence |
|---------|-------------|--------|----------|
| 4.1 | Processes and procedures for cryptography in transit | ✅ | HTTPS-only; HSTS enforced in production (next.config.js:344) |
| 4.2.1 | Strong cryptography for transmission of PAN | ✅ | All Stripe communication uses TLS 1.2+ (enforced by Stripe SDK) |
| 4.2.2 | Transmit PAN only over trusted networks | ✅ | Card data never traverses Mintenance network (Stripe Elements) |

**Overall**: ✅ COMPLIANT — TLS is properly enforced. Card data never touches Mintenance servers.

---

## Requirement 5: Protect All Systems and Networks from Malicious Software

| Sub-Req | Description | Status | Evidence |
|---------|-------------|--------|----------|
| 5.1 | Anti-malware policies | ❓ | Policy concern |
| 5.2 | Deploy anti-malware on all applicable systems | ❓ | Infrastructure concern |
| 5.3 | Anti-malware mechanisms are maintained | ❓ | Infrastructure concern |
| 5.4 | Phishing protection in place | ❓ | Not visible in code |

**Overall**: ❓ UNKNOWN — Beyond code scope (infrastructure/policy).

---

## Requirement 6: Develop and Maintain Secure Systems and Applications

| Sub-Req | Description | Status | Evidence |
|---------|-------------|--------|----------|
| 6.1 | Security vulnerability management process | ⚠️ | `npm audit` run; no automated SAST/DAST in CI visible |
| 6.2 | Bespoke/custom software must follow secure development practices | ⚠️ | TypeScript strict mode; Zod validation; but broken security controls (CRIT-2, CRIT-3, CRIT-4) |
| 6.3.1 | Identify and manage vulnerabilities in software components | ⚠️ | `npm audit` available; `minimatch` ReDoS not yet patched |
| 6.3.2 | Maintain software inventory | ❓ | `package.json` tracks dependencies but no SBOM |
| 6.3.3 | Apply security patches | ❌ | Stripe SDK version `2024-04-10` is outdated (FINDING HIGH-2) |
| 6.4.1 | Protect public-facing web applications against common attacks | ❌ | CSP `unsafe-inline` in enforcement (FINDING HIGH-3/MED-4); broken fraud detection logic |
| 6.4.2 | Automated technical solution to detect web-based attacks | ⚠️ | Anomaly detection implemented but with logic bugs (CRIT-3) |
| 6.4.3 | All payment page scripts managed, integrity protected | ❌ | No SRI (Subresource Integrity) hashes for Stripe.js; `unsafe-inline` in CSP |
| 6.5 | Security training and awareness for developers | ❓ | Policy concern |

**Overall**: ❌ NON-COMPLIANT — SRI missing for Stripe.js; CSP has `unsafe-inline`; security control logic bugs; outdated Stripe version.

---

## Requirement 7: Restrict Access to System Components and Cardholder Data by Business Need to Know

| Sub-Req | Description | Status | Evidence |
|---------|-------------|--------|----------|
| 7.1 | Access control processes | ⚠️ | RBAC partially implemented via `withApiHandler(roles:[...])` |
| 7.2.1 | Verify access is granted based on job function and least privilege | ⚠️ | `release-escrow` route has no role restriction at gateway (FINDING HIGH-4) |
| 7.2.2 | Default access denied | ✅ | `withApiHandler` rejects unauthenticated requests |
| 7.2.3 | Manage user access to privileged data | ❌ | Role sourced from client-writable `user_metadata` in Supabase auth path (FINDING HIGH-9) |
| 7.3 | Access control system in place | ⚠️ | Custom JWT + Supabase auth; role verification inconsistent |

**Overall**: ⚠️ PARTIAL — Access control exists but has gaps (no role gate on release-escrow, client-writable role source).

---

## Requirement 8: Identify Users and Authenticate Access to System Components

| Sub-Req | Description | Status | Evidence |
|---------|-------------|--------|----------|
| 8.1 | Authentication policies | ❓ | Policy concern |
| 8.2.1 | Assign unique ID to all users | ✅ | Supabase UUIDs per user |
| 8.2.2 | Group/shared accounts not used for admin functions | ❓ | Unknown |
| 8.2.3 | Manage user authentication changes | ⚠️ | Password reset flow exists; no forced re-auth on role change |
| 8.2.8 | Sessions inactive more than 15 minutes require re-authentication | ❌ | `ENFORCE_SESSION_TIMEOUTS=false` in dev/staging; 30-minute idle (not 15) (FINDING HIGH-5) |
| 8.3.2 | MFA for all non-console admin access | ✅ | MFA enforced for high-value operations; but logic bugs (CRIT-2, CRIT-3) |
| 8.3.4 | Invalid authentication attempts locked out | ⚠️ | Rate limiting in place; no explicit account lockout visible |
| 8.3.9 | MFA systems must prevent replay attacks | ❌ | TOTP codes can be reused within 90-second window (FINDING HIGH-7) |
| 8.4 | Passwords/passphrases meet complexity requirements | ⚠️ | `REDACTED` database password acknowledged as weak (CRIT-1) |
| 8.6 | System/application accounts managed | ⚠️ | Service role key has full DB access; rotation pending |

**Overall**: ❌ NON-COMPLIANT — TOTP replay attack possible; session timeout configured at 30 min (PCI requires 15); credentials known weak but not rotated; MFA logic bugs.

---

## Requirement 9: Restrict Physical Access to Cardholder Data

| Sub-Req | Description | Status | Evidence |
|---------|-------------|--------|----------|
| 9.1-9.5 | Physical access controls, media protection | ❓ | Infrastructure/physical concern; cloud-hosted |

**Overall**: ❓ UNKNOWN — Cloud-hosted on Vercel + Supabase (which have their own PCI compliance); physical controls are delegated to hosting providers.

---

## Requirement 10: Log and Monitor All Access to System Components and Cardholder Data

| Sub-Req | Description | Status | Evidence |
|---------|-------------|--------|----------|
| 10.1 | Logging policies | ❓ | Policy concern |
| 10.2.1 | Audit logs capture all individual user access | ✅ | Structured logging via `logger.info/warn/error` on all payment operations |
| 10.2.2 | Privileged user actions logged | ✅ | Admin operations logged with `userId`, `escrowTransactionId` |
| 10.2.3 | Access to audit logs logged | ❓ | Not visible in code |
| 10.2.4 | Invalid logical access attempts | ✅ | Unauthorized access attempts logged (e.g., release-escrow line 185-193) |
| 10.2.5 | User authentication mechanism changes | ⚠️ | MFA changes logged; not all auth changes captured |
| 10.2.6 | Initialization/stop/pause of logs | ❓ | Infrastructure concern |
| 10.2.7 | Creation/deletion of system-level objects | ⚠️ | Payment objects logged; not all system objects |
| 10.3 | Protect audit logs from destruction/unauthorized modifications | ❓ | Infrastructure concern |
| 10.4 | Time synchronization for logs | ✅ | `new Date().toISOString()` used; server time assumed synchronized |
| 10.5 | Retain audit logs for at least 12 months | ❓ | Retention policy not visible in code (DB-level) |
| 10.6 | Log review and anomaly detection | ⚠️ | Anomaly detection implemented but with critical logic bugs (CRIT-3) |

**Overall**: ⚠️ PARTIAL — Good logging coverage but anomaly detection logic bugs undermine effectiveness; log retention policy unknown.

---

## Requirement 11: Test Security of Systems and Networks Regularly

| Sub-Req | Description | Status | Evidence |
|---------|-------------|--------|----------|
| 11.1 | Processes for security testing | ❓ | No pen test evidence in repo |
| 11.2 | Wireless access points scanned | ❓ | Cloud-hosted, N/A |
| 11.3 | Vulnerability scanning | ⚠️ | `npm audit` only; no automated SAST/DAST (FINDING CRIT-1 acknowledges known weak credentials) |
| 11.4 | Penetration testing at least annually | ❓ | No evidence |
| 11.5 | Change detection mechanisms | ❓ | Git version control only |
| 11.6 | Detect unauthorized changes to payment pages | ❌ | No SRI for Stripe.js; no CSP nonce enforcement (FINDING HIGH-3, HIGH-6) |

**Overall**: ❌ NON-COMPLIANT — SRI absent for Stripe.js payment script; no evidence of penetration testing; `unsafe-inline` CSP.

---

## Requirement 12: Support Information Security with Organizational Policies and Programs

| Sub-Req | Description | Status | Evidence |
|---------|-------------|--------|----------|
| 12.1 | Information security policy exists | ❓ | Not in codebase |
| 12.3 | Protect cryptographic keys and critical security parameters | ❌ | Live production keys in dev config with TODO-rotate flags (CRIT-1) |
| 12.6 | Security awareness program | ❓ | Policy concern |
| 12.10 | Incident response plan | ⚠️ | Reconciliation records on failure; but admin hold is non-functional (CRIT-4) |

**Overall**: ❌ NON-COMPLIANT — Known unrotated production credentials; admin hold security control non-functional.

---

## PCI DSS Compliance Summary Scorecard

| Requirement | Status | Priority |
|-------------|--------|----------|
| Req 1: Network Controls | ⚠️ Partial | LOW |
| Req 2: Secure Configurations | ⚠️ Partial | MEDIUM |
| Req 3: Stored Account Data Protection | ❌ Non-compliant | **CRITICAL** |
| Req 4: Encryption in Transit | ✅ Compliant | — |
| Req 5: Anti-malware | ❓ Unknown | N/A |
| Req 6: Secure Development | ❌ Non-compliant | **HIGH** |
| Req 7: Access Control | ⚠️ Partial | HIGH |
| Req 8: Authentication | ❌ Non-compliant | **HIGH** |
| Req 9: Physical Access | ❓ Unknown (cloud) | N/A |
| Req 10: Logging & Monitoring | ⚠️ Partial | MEDIUM |
| Req 11: Security Testing | ❌ Non-compliant | **HIGH** |
| Req 12: Policies | ❌ Non-compliant | **HIGH** |

### PCI DSS Level Assessment

Based on code analysis, the application processes live payment transactions via Stripe. As a Stripe user implementing Stripe.js/Elements:

- **Current estimated SAQ level**: SAQ-A-EP (JavaScript-based redirect + server-side integration)
- **Blockers to attestation**: Requirements 3, 6, 8, 11, 12 are non-compliant
- **Immediate blockers**: Unencrypted TOTP secrets, unrotated production credentials, admin hold non-functional, SRI absent, TOTP replay possible

### Critical Gaps to Address Before PCI Audit:

1. ❌ **Req 3.5**: Encrypt `mfa_secret` at rest
2. ❌ **Req 3.7**: Complete all TODO-ROTATE credential rotations
3. ❌ **Req 6.3.3**: Update Stripe SDK to latest version
4. ❌ **Req 6.4.3**: Add SRI hashes for Stripe.js
5. ❌ **Req 8.3.9**: Implement TOTP replay protection
6. ❌ **Req 8.2.8**: Enforce 15-minute session timeout (not 30 min)
7. ❌ **Req 11.6**: Enforce nonce-based CSP (remove unsafe-inline)
8. ❌ **Req 12.3**: Implement credential rotation process/schedule
