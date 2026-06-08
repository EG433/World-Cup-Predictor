# Authentication Security Plan

This app should use a dedicated authentication provider or a hardened server-side auth library before real users sign up.

## Recommended approach

- Use a managed provider such as Supabase Auth, Clerk, Firebase Auth, or Auth.js with a secure database adapter.
- Never store raw passwords in application code, localStorage, sessionStorage, or plain database fields.
- If the app owns password hashing directly, use Argon2id with unique salts. If Argon2id is not available, use scrypt or bcrypt with a modern work factor.
- Store sessions in secure, HttpOnly, SameSite cookies. Do not store long-lived auth tokens in localStorage.
- Keep user profile data separate from auth credentials. Store username, supported team, and group memberships in app tables keyed by the auth user id.
- Add rate limiting for login, signup, password reset, and group password attempts.
- Require HTTPS in production.
- Add email verification and a safe password reset flow.
- Keep secrets in environment variables, never in client-side code or committed files.

## Current local prototype

The current development build stores accounts in `.data/users.json`, which is ignored by git. Passwords are not stored directly. The server stores a unique salt and a PBKDF2-HMAC-SHA256 password hash, then keeps login state in an HttpOnly SameSite cookie backed by `.data/sessions.json`.

This is acceptable for local prototyping, but a production app should move this to a real database and preferably a managed auth provider.

## Suggested data split

- Auth provider: username, password hash, verification status, session handling. Email can be added later for recovery and verification.
- `profiles` table: `user_id`, `username`, `supported_team_id`, display settings.
- `prediction_groups` table: group name, privacy setting, scoring mode, invite code, password hash if private.
- `group_members` table: group id, user id, role, joined date.
- `predictions` table: user id, group id, match picks, ranking picks, bracket picks, submission status.

## Notes for private group passwords

Private group passwords should be hashed like user passwords. The app should compare submitted passwords server-side and should never reveal whether a password exists through client-side code.
