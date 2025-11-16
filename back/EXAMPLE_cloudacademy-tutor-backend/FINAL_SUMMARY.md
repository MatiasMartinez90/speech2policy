# CloudAcademy Backend - User Identification & Fields: Complete Analysis

## Status: COMPLETED

Comprehensive analysis of user identification and user field management across all CloudAcademy backend Lambda handlers.

---

## Executive Summary

The CloudAcademy backend uses **AWS Cognito** for authentication and extracts user identity from JWT claims in two distinct ways:

1. **Tutor & Progress Handlers** → Use `email` claim
2. **Admin, Sections, Upload Handlers** → Use `cognito:username` claim

Only **3 user fields are currently used** (email, cognito:username, sourceIp), but **9 additional fields are available** from Cognito (name, picture, locale, etc.).

---

## Key Findings

### 1. User Identification

Three identifiers used across the system:

| Identifier | Format | Used By | Example |
|-----------|--------|---------|---------|
| email | string | tutor-handler, progress-handler | user@example.com |
| cognito:username | string | admin-handler, sections-handler, upload-handler | Google_111137626603562904354 |
| anon_{sourceIp} | string | all handlers (fallback) | anon_192.168.1.1 |

**Critical Inconsistency:** Different handlers use different identifiers for the same user!

### 2. User Fields Currently Used

Only 3 fields are actually used:
1. **email** - From JWT claim (primary identifier for most operations)
2. **cognito:username** - From JWT claim (required for Cognito API calls)
3. **sourceIp** - From request context (for anonymous user tracking)

### 3. User Fields Available But Not Used

9 fields are available in JWT but not used:
- name, picture, given_name, family_name
- phone_number, phone_number_verified
- email_verified, locale, updated_at

### 4. Data Storage by Table

**UserProgress (Permanent storage)**
- Stores: user_id (email), course_id, current_section, checkpoints, hints used
- Size: ~500 bytes to 2 KB per record
- TTL: None (permanent)

**TutorSessions (Conversation history)**
- Stores: user_id (email), messages, responses
- Size: ~1-5 KB per record
- TTL: 30 days (auto-deletes)

**UserUsage (Rate limiting)**
- Stores: user_id (email or anon_IP), usage counters
- Size: ~200 bytes per record
- TTL: 7 days (except TOTAL period)

### 5. Rate Limiting Configuration

| User Type | Daily Limit | Hourly Limit | Checkpoints | Hints |
|-----------|------------|-------------|------------|-------|
| Anonymous | 1 | 1 | 0 | 0 |
| Authenticated | 50 | 10 | 20 | 15 |
| Premium | 200 | 50 | 100 | 50 |

### 6. Code Locations

All user identification happens in 5 Lambda handlers:

```
/lambdas/
├── tutor-handler/lambda_function.py:94           extract_user_id() → email
├── progress-handler/lambda_function.py:70        extract_user_id() → email
├── admin-handler/lambda_function.py:88           extract_user_id() → cognito:username
├── sections-handler/lambda_function.py:95        extract_user_id() → cognito:username
└── upload-handler/lambda_function.py:87          extract_user_id() → cognito:username
```

---

## Generated Documentation (5 Files, 1,198 Lines)

### 1. USER_DOCS_INDEX.md (8.6 KB)
**Purpose:** Navigation guide to all documentation
**Use When:** You need to find which document to read
**Contains:** Quick navigation matrix, key findings, file locations

### 2. QUICK_REFERENCE_USER_FIELDS.md (3.5 KB)
**Purpose:** Fast lookup, high-level overview
**Use When:** You need a quick answer
**Contains:** Tables, code locations, key takeaways

### 3. USER_FIELDS_SUMMARY.txt (15 KB)
**Purpose:** Complete visual reference with diagrams
**Use When:** You want ASCII art diagrams and comprehensive overview
**Contains:** Flow diagrams, visual tables, detailed sections

### 4. USER_IDENTIFICATION_ANALYSIS.md (22 KB)
**Purpose:** Deep technical dive with explanations
**Use When:** You need to understand the "why"
**Contains:** Complete flows, code samples, detailed analysis

### 5. REFERENCE_TABLES_USER_FIELDS.md (11 KB)
**Purpose:** Precise technical specifications
**Use When:** You're implementing something specific
**Contains:** 10 comprehensive reference tables

---

## Critical Insights

### The Email vs Username Inconsistency

**Problem:** Different handlers identify the same user differently

- tutor-handler & progress-handler: use `email`
- admin-handler, sections-handler, upload-handler: use `cognito:username`

**Reason:** Cognito's `admin_list_groups_for_user()` API requires the Username field, not email

**Impact:** Users have two different identifiers in the system - potential for tracking issues

**Recommendation:** Unify to use `email` everywhere, keep `cognito:username` only for group API calls

### Underutilized Fields

9 fields available from Cognito are never extracted:
- `name`, `picture`, `given_name`, `family_name` - User profile fields
- `phone_number`, `phone_number_verified` - Contact fields
- `email_verified`, `locale`, `updated_at` - Account fields

**Recommendation:** Create UserProfile table to store these for future features

### Anonymous Users

Unauthenticated users identified by source IP:
- Pattern: `anon_192.168.1.1`
- Rate limit: 1 total request (very restrictive)
- Cannot use tutor features (checkpoints, hints blocked)

**Issue:** Multiple users behind same corporate proxy get same ID

**Recommendation:** Use combination of IP + User-Agent or session token

---

## Recommendations for Improvement

### 1. Create UserProfile Table (High Priority)
```
PK: USER#{email}
SK: PROFILE

Fields:
- email, name, picture, cognito_username
- created_at, updated_at, last_login
- total_courses_started, total_checkpoints_passed
- user_type (anonymous|authenticated|premium)
```

### 2. Unify User Identification (High Priority)
- Use `email` as primary identifier everywhere
- Keep `cognito:username` only for admin group verification
- Migrate existing data for consistency

### 3. Implement Premium Tier Detection (Medium Priority)
- Currently not implemented (TODO at rate_limiter.py:193)
- Fetch user groups from Cognito
- Apply Premium limits to group members

### 4. Enrich User Profiles (Medium Priority)
- Extract and store: name, picture, locale
- Enable multi-language support
- Improve UI personalization

### 5. Track User Analytics (Low Priority)
- Total courses started, completed
- Checkpoints passed, hints used
- Last login timestamp
- Enable engagement analysis

---

## Statistics

| Metric | Value |
|--------|-------|
| Total Documentation Lines | 1,198 |
| Total Documentation Files | 5 |
| Total Size | ~58 KB |
| Lambdas Analyzed | 5 |
| User Fields Used | 3 |
| User Fields Available | 12 |
| Tables Affected | 3 |
| Code Locations Documented | 10+ |
| Issues Found | 1 critical |
| Recommendations | 5 |

---

## How to Use This Documentation

### For Quick Answers
1. Start with **USER_DOCS_INDEX.md** - Navigation guide
2. Use **QUICK_REFERENCE_USER_FIELDS.md** - Fast lookup

### For Implementation
1. Use **REFERENCE_TABLES_USER_FIELDS.md** - Exact specifications
2. Check code locations for implementation details

### For Understanding
1. Read **USER_IDENTIFICATION_ANALYSIS.md** - Complete deep dive
2. Review **USER_FIELDS_SUMMARY.txt** - Visual diagrams

### For Future Enhancements
1. See "Recommendations" section in **USER_IDENTIFICATION_ANALYSIS.md**
2. Check Table 10 in **REFERENCE_TABLES_USER_FIELDS.md** - Available fields

---

## Files Location

All documentation available at:
```
/Users/matiasmartinez/Documents/repos/cloudacademy-tutor-backend/
  ├── USER_DOCS_INDEX.md                    (navigation guide)
  ├── QUICK_REFERENCE_USER_FIELDS.md        (quick lookup)
  ├── USER_FIELDS_SUMMARY.txt               (visual overview)
  ├── USER_IDENTIFICATION_ANALYSIS.md       (deep dive)
  └── REFERENCE_TABLES_USER_FIELDS.md       (specifications)
```

---

## Conclusion

CloudAcademy backend has a **functional but inconsistent** user identification system. While it works well for the current use cases, the dual identifier approach (email vs cognito:username) creates potential for confusion and should be unified.

The system currently uses only 3 out of 12 available user fields. Creating a UserProfile table to store additional fields would enable future features like user profiles, multi-language support, and better personalization.

**Overall Assessment:** Implementation is solid, but architecture needs refinement for consistency and future scalability.

---

**Generated:** November 6, 2025
**Repository:** cloudacademy-tutor-backend
**Analysis Scope:** User identification, user fields, authentication flow
**Status:** Complete and documented
