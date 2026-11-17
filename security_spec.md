# Security Specification & Red Team Test Plan (WardCare Schedule RBAC)

## 1. Data Invariants
1. **Top Admin & Bootstrapped Owner Authority**: Only the Top Admin (`admin@hospitals.gov.bh`, username `admin`), the bootstrapped project owner (`ghsmc208@gmail.com` with `email_verified == true`), or active UIDs registered in `/admins/{uid}` hold full administrative authority across `/admins`, `/wardUsers`, and all `/wardModules`.
2. **Hospital Domain Enforcement (`@hospitals.gov.bh`)**: Every user created in `/wardUsers/{accessId}` must use an email ending with `@hospitals.gov.bh` (except the runtime owner recovery bootstrap record `ghsmc208@gmail.com`).
3. **Authentication & UID Binding**: Google/OAuth users must have `email_verified == true`. `@hospitals.gov.bh` Email/Password users (`sign_in_provider == 'password'`) are bound to their `/wardUsers/{accessId}` record and cannot access records belonging to another UID once `uid` is bound.
4. **No Self-Privilege Escalation**: Non-admin authenticated users cannot create or modify `role`, `status`, `taskPermissions`, `inventoryPermissions`, or `allowedTaskIds` on any `/wardUsers/{accessId}` document. Non-admin updates on `/wardUsers/{accessId}` are strictly limited to binding their own `uid` when `existing().uid == ''` and `existing().email == callerEmail()`.
5. **No Self-Admin Promotion**: A user can create `/admins/{uid}` for themselves ONLY if an existing `/wardUsers/{accessId}` document authored by an Admin already assigns `role == 'admin'` and `status == 'active'` to their email.
6. **PII Isolation & Query Enforcement**: `/wardUsers/{accessId}` contains staff emails. `get` and `list` are strictly gated to `isAdmin()` or `resource.data.email == callerEmail()`. Blanket `list` is forbidden.
7. **Modular Task & Inventory Enforcement**: Every `/wardModules/{moduleId}` read and write enforces `status == 'active'` and verifies the specific `taskPermissions[moduleId]` or `inventoryPermissions[categoryId]` level (`view` for `get`; `edit` or `full` for `create`/`update`). `delete` on `/wardModules/{moduleId}` is Admin-only.
8. **Temporal Integrity & Strict Schema Keys**: Every write validates exact required and allowed keys (`hasAll` + `hasOnly`), string `.size()` bounds, regex IDs (`^[a-zA-Z0-9_\-]+$`), and server timestamps (`request.time`).

## 2. "Dirty Dozen" Adversarial Payloads (Must Return PERMISSION_DENIED)
1. Unauthenticated read of `/wardUsers/test_user` -> Denied (Master Gate).
2. Unverified email login attempting to spoof `ghsmc208@gmail.com` via password or unverified token -> Denied (`email_verified == true` required for owner/Google accounts).
3. Non-`@hospitals.gov.bh` staff account created in `/wardUsers` -> Denied (`isAllowedWardEmail()` rejects non-`@hospitals.gov.bh` domains).
4. Attacker creating a random `fake@hospitals.gov.bh` Email/Password account and reading `/wardModules/schedule` without an admin-created `/wardUsers` record -> Denied (`exists(accessDocPath)` fails).
5. Non-admin user creating `/wardUsers/attacker` with `role: 'admin'` -> Denied (`isAdmin()` required on create).
6. Non-admin staff updating their own `/wardUsers/{accessId}` to change `role` from `'staff'` to `'admin'` -> Denied (`affectedKeys().hasOnly(['uid', 'updatedAt'])`).
7. Non-admin staff updating their own `/wardUsers/{accessId}` to add `'edit'` to `taskPermissions` -> Denied (`affectedKeys()` guard).
8. Non-admin staff with `role: 'staff'` attempting to create `/admins/{uid}` -> Denied (Master Admin check fails).
9. Suspended user (`status: 'suspended'`) attempting `get` or `update` on `/wardModules/inv_store` -> Denied (`status == 'active'` check fails).
10. Staff with `'view'` permission on `inv_store` attempting `update` on `/wardModules/inv_store` -> Denied (`level in ['edit', 'full']` check fails).
11. Non-admin querying `collection(db, 'wardUsers')` without filtering to own email -> Denied (`allow list` requires `resource.data.email == callerEmail()` or `isAdmin()`).
12. Shadow/ghost field injection or spoofed `createdAt`/`updatedAt` timestamps on `/wardUsers` or `/wardModules` -> Denied (`keys().hasOnly(...)` & `request.time`).
