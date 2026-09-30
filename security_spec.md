# Security Specification: Football United Zero-Trust RBAC

## 1. Data Invariants

1. **Authentication Requirement**: No database operation (read or write) is allowed for unauthenticated visitors (`request.auth == null`), with the default-deny root rule rejecting all undocumented paths.
2. **Safeguarding Data Isolation**: Under FA Youth Safeguarding regulations, raw player profiles, contacts, and personal information in `/players` and `/go_players_prod` are strictly restricted to authenticated Admins and Coaches. Standard Viewers/Parents cannot scrape the entire youth roster.
3. **Role Elevation Prevention**: Users cannot set or elevate their own role to `admin` or `org_admin` during registration or document update. Role changes can only be performed by existing Admins.
4. **Action-Scoped Coach Writes**: Coaches have write permissions scoped exclusively to match scores, attendance maps, and session attendee logs. They cannot delete matches, delete players, or alter organization settings.
5. **Parent/Viewer Zero-Write Boundary**: Parents/Viewers can inspect schedules and standings, but their write capability is strictly bounded to submitting or updating their own child's consent form (`/consent_forms`).
6. **Immutable Identification**: User IDs, document ownership (`submittedByUid`), and creation timestamps cannot be mutated after initial creation.
7. **Developer Mode Protection**: Branding/crest modifications (`/app_settings/profile_photo`) and APK distribution features are strictly guarded on the backend to verified Admin accounts (`edemadavid1@gmail.com` or role `admin`/`org_admin`).
8. **Account Approval Requirement**: New users are provisioned with `{ role: 'user', status: 'pending' }`. Unapproved users (`status == 'pending'`) are held at the pending approval screen and cannot access the main application dashboard. Only verified Admins can approve users by setting `status: 'approved'`. Regular users cannot modify their own `status` or `role`.

---

## 2. The "Dirty Dozen" Adversarial Payloads

Below are 12 penetration-testing payloads designed to test and prove the zero-trust boundaries:

### Payload 1: Unauthenticated Roster Scrape
- **Target**: `GET /players`
- **Context**: `request.auth == null`
- **Expected Outcome**: `PERMISSION_DENIED`
- **Attack Vector**: Public unauthenticated scraper attempting to access youth player names and dates of birth.

### Payload 2: Self-Assigned Admin Role on User Registration
- **Target**: `CREATE /users/hacker123`
- **Payload**: `{"role": "admin", "displayName": "Hacker", "email": "attacker@evil.com"}`
- **Context**: `request.auth.uid == "hacker123"`, `email != edemadavid1@gmail.com`
- **Expected Outcome**: `PERMISSION_DENIED`
- **Attack Vector**: Malicious user registers and sets their own role to `admin` or `org_admin`.

### Payload 3: Privilege Escalation via User Profile Update
- **Target**: `UPDATE /users/user456`
- **Payload**: `{"role": "org_admin"}`
- **Context**: `request.auth.uid == "user456"`, existing role `parent`
- **Expected Outcome**: `PERMISSION_DENIED`
- **Attack Vector**: A parent attempts to patch their own document to acquire org_admin privileges.

### Payload 4: Parent Altering Official Match Score
- **Target**: `UPDATE /matches/match_final`
- **Payload**: `{"home_score": 10, "away_score": 0}`
- **Context**: `request.auth.uid == "parent789"`, role `parent`
- **Expected Outcome**: `PERMISSION_DENIED`
- **Attack Vector**: Unauthorized parent attempting to tamper with tournament or league outcomes.

### Payload 5: Coach Deleting Player Profile
- **Target**: `DELETE /players/player_001`
- **Context**: `request.auth.uid == "coach1"`, role `coach`
- **Expected Outcome**: `PERMISSION_DENIED`
- **Attack Vector**: A coach attempting to delete official player safeguarding records.

### Payload 6: Coach Mutating Global League Configuration
- **Target**: `UPDATE /settings/league_config`
- **Payload**: `{"points_for_win": 10}`
- **Context**: `request.auth.uid == "coach1"`, role `coach`
- **Expected Outcome**: `PERMISSION_DENIED`
- **Attack Vector**: Non-admin altering league points and tournament rules.

### Payload 7: Shadow Field Injection on Session Update
- **Target**: `UPDATE /sessions/session_wk1`
- **Payload**: `{"attendance": {"p1": "present"}, "isAdminOverride": true, "organizationId": "stolen"}`
- **Context**: `request.auth.uid == "coach1"`, role `coach`
- **Expected Outcome**: `PERMISSION_DENIED`
- **Attack Vector**: Injecting unexpected administrative fields into session documents.

### Payload 8: Parent Tampering With Another User's Consent Form
- **Target**: `UPDATE /consent_forms/consent_other_child`
- **Payload**: `{"medicalConsent": false}`
- **Context**: `request.auth.uid == "parent_attacker"`, existing `submittedByUid == "parent_victim"`
- **Expected Outcome**: `PERMISSION_DENIED`
- **Attack Vector**: Modifying safeguarding data for another parent's registered youth player.

### Payload 9: Forged Parent Identity on Consent Submission
- **Target**: `CREATE /consent_forms/consent_spoofed`
- **Payload**: `{"submittedByUid": "victim_uid", "childName": "Johnny", "parentEmail": "victim@gmail.com"}`
- **Context**: `request.auth.uid == "attacker_uid"`
- **Expected Outcome**: `PERMISSION_DENIED`
- **Attack Vector**: Submitting consent under another user's UID to falsify safeguarding compliance.

### Payload 10: Unauthorized Crest / Branding Modification
- **Target**: `SET /app_settings/profile_photo`
- **Payload**: `{"officialAppLogo": "https://malicious.site/phish.png"}`
- **Context**: `request.auth.uid == "coach1"`, role `coach`
- **Expected Outcome**: `PERMISSION_DENIED`
- **Attack Vector**: Non-admin replacing global application logo.

### Payload 11: Direct Write to Closed Tournament Schedule
- **Target**: `CREATE /tournaments/fake_cup`
- **Payload**: `{"name": "Fake Cup", "status": "active"}`
- **Context**: `request.auth.uid == "coach1"`, role `coach`
- **Expected Outcome**: `PERMISSION_DENIED`
- **Attack Vector**: Coach creating unsanctioned tournaments.

### Payload 12: Root Wildcard Bypass Attempt
- **Target**: `GET /super_secret_audit_logs/log1`
- **Context**: `request.auth != null`
- **Expected Outcome**: `PERMISSION_DENIED`
- **Attack Vector**: Attempting to read arbitrary collections not explicitly declared in security rules.

### Payload 13: Self-Approval on Registration
- **Target**: `CREATE /users/attacker_uid`
- **Payload**: `{"status": "approved", "role": "admin", "email": "attacker@evil.com"}`
- **Context**: `request.auth.uid == "attacker_uid"`, `email != edemadavid1@gmail.com`
- **Expected Outcome**: `PERMISSION_DENIED`
- **Attack Vector**: A new registrant attempting to bypass administrator review by setting status to approved.

### Payload 14: Non-Admin Self-Approval via Document Update
- **Target**: `UPDATE /users/pending_user_uid`
- **Payload**: `{"status": "approved"}`
- **Context**: `request.auth.uid == "pending_user_uid"`
- **Expected Outcome**: `PERMISSION_DENIED`
- **Attack Vector**: A pending user attempting to approve their own account via direct Firestore REST / SDK mutation.
