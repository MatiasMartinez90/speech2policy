# User Identification & Fields Documentation Index

This directory contains comprehensive documentation about how CloudAcademy backend handles user identification and user data fields.

## Documents Overview

### 1. QUICK_REFERENCE_USER_FIELDS.md (3.5 KB)
**Best for:** Quick lookup, high-level overview, when you need answers fast

Contains:
- User ID by handler (quick table)
- Fields used vs available (summary)
- Data per table (simplified)
- Rate limiting by user type
- Code locations (quick reference)
- Key takeaways (bullet points)

**Read this if:** You need a quick answer and don't have time for deep details.

---

### 2. USER_FIELDS_SUMMARY.txt (15 KB)
**Best for:** Complete visual reference, ASCII art diagrams, comprehensive overview

Contains:
- How users are identified (flow diagram)
- User identifier by handler (detailed)
- User fields currently used (with examples)
- Optional fields not used
- User identification by operation type
- Data stored by table (detailed)
- Rate limiting configuration
- Key inconsistencies (highlighted)
- Complete user identification flow (diagram)
- Fields summary table
- Recommendations for future

**Read this if:** You want a complete but still visual reference.

---

### 3. USER_IDENTIFICATION_ANALYSIS.md (22 KB)
**Best for:** Deep dive, understanding context, implementation details

Contains:
- Complete authentication flow explanation
- Detailed extraction methods per handler
- All claims available from Cognito
- Complete UserProgress structure
- Complete TutorSessions structure
- Complete UserUsage structure
- Detailed rate limiting implementation
- Email vs cognito:username inconsistency analysis
- Per-operation identification breakdown
- Suggested UserProfile table schema
- Conclusions and recommendations

**Read this if:** You need to understand WHY things are done a certain way.

---

### 4. REFERENCE_TABLES_USER_FIELDS.md (11 KB)
**Best for:** Precise specifications, technical reference, implementation guide

Contains:
- Table 1: User identification methods by handler
- Table 2: JWT claims available from Cognito
- Table 3: DynamoDB tables & user fields stored
- Table 4: Rate limiting configuration by user type
- Table 5: User information by operation type
- Table 6: Code extraction points
- Table 7: User field completeness matrix
- Table 8: User data lifecycle
- Table 9: Claims extraction flow (diagram + code)
- Table 10: Fields NOT currently used

**Read this if:** You're implementing something and need exact specifications.

---

## Quick Navigation

### "How do I identify a user?"
1. First: Read **QUICK_REFERENCE_USER_FIELDS.md** section "User ID by Handler"
2. Then: Check **REFERENCE_TABLES_USER_FIELDS.md** Table 1
3. Deep dive: **USER_IDENTIFICATION_ANALYSIS.md** section "1. CÓMO IDENTIFICA USUARIOS"

### "What user data is stored where?"
1. First: **QUICK_REFERENCE_USER_FIELDS.md** section "Data Stored by Table"
2. Then: **USER_FIELDS_SUMMARY.txt** section "6. DATA STORED BY TABLE"
3. Complete: **REFERENCE_TABLES_USER_FIELDS.md** Table 3

### "What are the rate limits?"
1. First: **QUICK_REFERENCE_USER_FIELDS.md** section "Rate Limiting by User Type"
2. Complete: **USER_FIELDS_SUMMARY.txt** section "7. RATE LIMITING CONFIGURATION"
3. Implementation: **REFERENCE_TABLES_USER_FIELDS.md** Table 4

### "Why does admin handler use cognito:username instead of email?"
1. Read: **USER_IDENTIFICATION_ANALYSIS.md** section "7. DIFERENCIAS IMPORTANTES"
2. Or: **USER_FIELDS_SUMMARY.txt** section "8. KEY INCONSISTENCY"
3. Code: **REFERENCE_TABLES_USER_FIELDS.md** Table 6

### "What fields are available in the JWT?"
1. First: **REFERENCE_TABLES_USER_FIELDS.md** Table 2
2. Details: **USER_IDENTIFICATION_ANALYSIS.md** section "1.4 Claims Disponibles en Cognito"

### "What fields could I add in the future?"
1. Recommendations: **USER_IDENTIFICATION_ANALYSIS.md** section "10. CAMPOS ADICIONALES RECOMENDADOS"
2. Table: **REFERENCE_TABLES_USER_FIELDS.md** Table 10

---

## Key Findings Summary

### Three Identifiers Used
1. **email** - Primary for tutor/progress handlers (e.g., user@example.com)
2. **cognito:username** - For admin handlers (e.g., Google_111137626603562904354)
3. **anon_{IP}** - For unauthenticated users (e.g., anon_192.168.1.1)

### Only 3 User Fields Actually Used
1. email (from JWT claim)
2. cognito:username (from JWT claim)
3. sourceIp (from request context)

### 9 Additional Fields Available But Unused
name, picture, given_name, family_name, phone_number, phone_number_verified, email_verified, locale, updated_at

### Data Stored by Table
- **UserProgress:** user_id, course_id, progress metadata (permanent)
- **TutorSessions:** user_id, conversation data (30-day TTL)
- **UserUsage:** user_id, usage counters (7-day TTL, except TOTAL)

### Critical Inconsistency
- **tutor-handler & progress-handler** use `email` as user_id
- **admin-handler & sections-handler & upload-handler** use `cognito:username`
- Reason: Cognito's `admin_list_groups_for_user()` requires the username field

### Rate Limits by User Type
- **Anonymous:** 1 total request (blocked after first)
- **Authenticated:** 50/day, 10/hour, 20 checkpoints/day, 15 hints/day
- **Premium:** 200/day, 50/hour, 100 checkpoints/day, 50 hints/day (not yet implemented)

---

## File Locations

All Lambda handlers that extract user identity:

```
/lambdas/
├── tutor-handler/
│   ├── lambda_function.py          (extract_user_id at line 94)
│   ├── utils/
│   │   ├── dynamodb_client.py      (save_session_message at line 116)
│   │   └── rate_limiter.py         (check_and_increment at line 57)
│   └── validators/
├── progress-handler/
│   └── lambda_function.py           (extract_user_id at line 70)
├── admin-handler/
│   └── lambda_function.py           (extract_user_id at line 88, is_admin at line 119)
├── sections-handler/
│   └── lambda_function.py           (extract_user_id at line 95, is_admin at line 126)
└── upload-handler/
    └── lambda_function.py           (extract_user_id at line 87, is_admin at line 118)
```

---

## Implementation Notes

### For New Features Requiring User Data:
1. Check if existing fields in UserProgress suffice
2. If you need additional user info (name, picture, etc.):
   - Extract from JWT claims (easily available)
   - Consider creating UserProfile table for persistence
   - Update rate_limiter to support Premium tier detection

### For Adding User Fields:
1. Extract from JWT claims in extract_user_id()
2. Store in UserProgress if related to course progress
3. Store in new UserProfile if related to user metadata
4. Document the decision in code comments

### For Cross-Handler User Tracking:
1. Decide: use email (preferred) or cognito:username
2. Consider backwards compatibility
3. Plan migration if changing
4. Update all handlers consistently

---

## Recommendations for Future Improvements

1. **Create UserProfile Table**
   - Centralize user metadata
   - Store: email, name, picture, cognito_username, created_at, last_login
   - Update on each login

2. **Unify User Identification**
   - Use email consistently across all handlers
   - Keep cognito:username only for group API calls
   - Ensures consistency in DynamoDB

3. **Add Optional Fields**
   - name, picture (from Cognito)
   - Support multi-language (locale)
   - Track profile changes (updated_at)

4. **Implement Premium Tier**
   - Fetch group from Cognito in rate_limiter.py:193
   - Apply Premium limits to group members
   - Currently all authenticated users get "authenticated" limits

5. **User Analytics**
   - Add fields to UserProfile: total_courses_started, total_checkpoints_passed, etc.
   - Track last_login timestamp
   - Enable user engagement analysis

---

## Document Maintenance

**Last Updated:** 2025-11-06
**Scope:** CloudAcademy Backend - User Management System
**Coverage:** All 5 Lambda handlers
**Data Sources:**
- /lambdas/tutor-handler/lambda_function.py
- /lambdas/progress-handler/lambda_function.py
- /lambdas/admin-handler/lambda_function.py
- /lambdas/sections-handler/lambda_function.py
- /lambdas/upload-handler/lambda_function.py
- /lambdas/tutor-handler/utils/dynamodb_client.py
- /lambdas/tutor-handler/utils/rate_limiter.py

---

**How to Use These Documents:**
1. Start with QUICK_REFERENCE for orientation
2. Use REFERENCE_TABLES for implementation
3. Read USER_IDENTIFICATION_ANALYSIS for deep understanding
4. Consult USER_FIELDS_SUMMARY for visual diagrams

**Questions? Check:**
- Implementation details → USER_IDENTIFICATION_ANALYSIS.md
- Quick answers → QUICK_REFERENCE_USER_FIELDS.md
- Precise specs → REFERENCE_TABLES_USER_FIELDS.md
- Visual overview → USER_FIELDS_SUMMARY.txt
