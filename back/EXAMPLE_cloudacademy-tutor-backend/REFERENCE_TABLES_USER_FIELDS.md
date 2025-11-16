# Reference Tables: Complete User Fields Overview

## Table 1: User Identification Methods by Handler

| Handler | Source Code Location | User ID Field | User ID Value | Fallback | Note |
|---------|---------------------|---------------|---------------|----------|------|
| tutor-handler | lambdas/tutor-handler/lambda_function.py:106 | email | user@example.com | anon_{IP} | Standard user |
| progress-handler | lambdas/progress-handler/lambda_function.py:82 | email | user@example.com | anon_{IP} | Standard user |
| admin-handler | lambdas/admin-handler/lambda_function.py:99 | cognito:username | Google_123456 | anon_{IP} | Needs groups API |
| sections-handler | lambdas/sections-handler/lambda_function.py:106 | cognito:username | Google_123456 | anon_{IP} | Needs groups API |
| upload-handler | lambdas/upload-handler/lambda_function.py:98 | cognito:username | Google_123456 | anon_{IP} | Needs groups API |
| courses-handler | lambdas/courses-handler/lambda_function.py | (not auth) | N/A | N/A | Public endpoint |

## Table 2: JWT Claims Available from Cognito

| Claim | Type | Example | Used By | Purpose |
|-------|------|---------|---------|---------|
| email | string | user@example.com | tutor, progress | User identification |
| cognito:username | string | Google_111137626603562904354 | admin, sections, upload | Group verification |
| sub | string | 12345-67890-abcdef | NONE | Subject ID (unused) |
| aud | string | client-id | API Gateway | Token audience (unused) |
| iss | string | https://cognito-idp... | API Gateway | Token issuer (unused) |
| name | string | John Doe | AVAILABLE | Full name (unused) |
| picture | string | https://... | AVAILABLE | Profile picture (unused) |
| given_name | string | John | AVAILABLE | First name (unused) |
| family_name | string | Doe | AVAILABLE | Last name (unused) |
| email_verified | boolean | true | AVAILABLE | Email verified (unused) |
| phone_number | string | +1234567890 | AVAILABLE | Phone (unused) |
| locale | string | en_US | AVAILABLE | Locale/language (unused) |
| updated_at | number | 1699000000 | AVAILABLE | Last update (unused) |

## Table 3: DynamoDB Tables & User Fields Stored

### UserProgress Table
```
Schema:
  PK: USER#{email}
  SK: COURSE#{course_id}
  
Fields Related to User:
  ├─ user_id (string) = email
  ├─ course_id (string)
  ├─ current_section (int)
  ├─ started_at (ISO timestamp)
  ├─ last_activity (ISO timestamp)
  ├─ checkpoints_completed (map)
  │  └─ '{section_id}': {
  │     ├─ score (Decimal)
  │     ├─ passed (bool)
  │     ├─ completed_at (ISO timestamp)
  │     └─ attempts (int)
  │  }
  ├─ total_checkpoints (int)
  ├─ checkpoints_passed (int)
  └─ hints_used (map)
     └─ '{section_id}': [1, 2, 3]

User Fields Stored: 1 (email as user_id)
Total Fields: 10
Size per Record: ~500 bytes to 2 KB
TTL: None (permanent)
```

### TutorSessions Table
```
Schema:
  PK: SESSION#{session_id}
  SK: TIMESTAMP#{ISO timestamp}
  
Fields Related to User:
  ├─ user_id (string) = email or anon_IP
  ├─ course_id (string)
  ├─ section_id (int)
  ├─ message_type (string) = question|checkpoint|hint
  ├─ user_message (string)
  ├─ assistant_response (string)
  ├─ timestamp (ISO timestamp)
  └─ ttl (int = Unix epoch)

User Fields Stored: 1 (email or anon_IP)
Total Fields: 8
Size per Record: ~1-5 KB (depends on messages)
TTL: 30 days (from creation)
Record Lifetime: ~30 days
```

### UserUsage Table
```
Schema:
  PK: user_id (string) = email or anon_IP
  SK: period (string) = TOTAL | YYYY-MM-DD | YYYY-MM-DD-HH
  
Fields Related to User:
  ├─ user_id (string) = email or anon_IP
  ├─ period (string) = tracking period
  ├─ count (int) = total requests
  ├─ question_count (int) = /api/tutor/ask calls
  ├─ checkpoint_count (int) = /api/tutor/validate calls
  ├─ hint_count (int) = /api/tutor/hint calls
  ├─ last_request (ISO timestamp)
  └─ ttl (int = Unix epoch)

User Fields Stored: 1 (email or anon_IP)
Total Fields per Period: 8
Records per User: 3+ (TOTAL + daily + hourly)
TTL: 7 days (except TOTAL period)
Record Lifetime: 1 hour to 7 days
```

## Table 4: Rate Limiting Configuration by User Type

### Anonymous Users
```
Identifier: anon_{sourceIp}
Example: anon_192.168.1.1

Limits:
  Total Requests:        1 (BLOCKED after first)
  Daily Requests:        1
  Hourly Requests:       1
  Checkpoints/Day:       0 (BLOCKED)
  Hints/Day:             0 (BLOCKED)
  
Storage in UserUsage:
  Keys: anon_192.168.1.1 | TOTAL
        anon_192.168.1.1 | YYYY-MM-DD
        anon_192.168.1.1 | YYYY-MM-DD-HH
```

### Authenticated Users (Default)
```
Identifier: email
Example: user@example.com

Limits:
  Total Requests:        Unlimited
  Daily Requests:        50
  Hourly Requests:       10
  Checkpoints/Day:       20
  Hints/Day:             15
  
Storage in UserUsage:
  Keys: user@example.com | TOTAL
        user@example.com | YYYY-MM-DD
        user@example.com | YYYY-MM-DD-HH
```

### Premium Users (Future)
```
Identifier: email (with Premium group in Cognito)
Example: user@example.com (in "Premium" group)

Limits:
  Total Requests:        Unlimited
  Daily Requests:        200
  Hourly Requests:       50
  Checkpoints/Day:       100
  Hints/Day:             50
  
Note: Detection not yet implemented (TODO in rate_limiter.py:193)
Storage in UserUsage:
  Keys: user@example.com | TOTAL
        user@example.com | YYYY-MM-DD
        user@example.com | YYYY-MM-DD-HH
```

## Table 5: User Information by Operation Type

| Operation | Endpoint | Method | User ID Type | Tables Used | Data Stored |
|-----------|----------|--------|--------------|-------------|-------------|
| Ask Question | /api/tutor/ask | POST | email | UserProgress, TutorSessions, UserUsage | Question + response |
| Validate Checkpoint | /api/tutor/validate | POST | email | UserProgress, UserUsage | Score + feedback |
| Get Hints | /api/tutor/hint | GET | email | UserProgress, UserUsage | Hint level |
| View Progress | /api/tutor/progress | GET | email | UserProgress | Progress data |
| Create Course | /api/admin/courses | POST | cognito:username | CourseCatalog | Course metadata |
| Update Course | /api/admin/courses/{id} | PUT | cognito:username | CourseCatalog | Course changes |
| Delete Course | /api/admin/courses/{id} | DELETE | cognito:username | CourseCatalog | None |
| Create Section | /api/admin/sections | POST | cognito:username | CourseCatalog | Section data |
| Update Section | /api/admin/sections/{id} | PUT | cognito:username | CourseCatalog | Section changes |
| Delete Section | /api/admin/sections/{id} | DELETE | cognito:username | CourseCatalog | None |
| Upload Image | /api/admin/upload | POST | cognito:username | S3 | Image file |

## Table 6: Code Extraction Points

| Component | Location | Code | Extracts |
|-----------|----------|------|----------|
| Tutor Handler | lambdas/tutor-handler/lambda_function.py:94-118 | extract_user_id() | email from claims |
| Progress Handler | lambdas/progress-handler/lambda_function.py:70-94 | extract_user_id() | email from claims |
| Admin Handler | lambdas/admin-handler/lambda_function.py:88-116 | extract_user_id() | cognito:username from claims |
| Sections Handler | lambdas/sections-handler/lambda_function.py:95-123 | extract_user_id() | cognito:username from claims |
| Upload Handler | lambdas/upload-handler/lambda_function.py:87-114 | extract_user_id() | cognito:username from claims |
| Admin Handler | lambdas/admin-handler/lambda_function.py:119-150 | is_admin() | groups from Cognito API |
| DynamoDB Client | lambdas/tutor-handler/utils/dynamodb_client.py:116-159 | save_session_message() | stores user_id |
| DynamoDB Client | lambdas/tutor-handler/utils/dynamodb_client.py:213-292 | update_checkpoint_progress() | stores user_id |
| Rate Limiter | lambdas/tutor-handler/utils/rate_limiter.py:57-177 | check_and_increment() | uses user_id for limits |

## Table 7: User Field Completeness Matrix

| Field | Cognito Claim | JWT Included | API Uses | DB Stores | Notes |
|-------|---------------|--------------|----------|-----------|-------|
| Email | email | Yes | tutor, progress | UserProgress, TutorSessions, UserUsage | Primary identifier for users |
| Username | cognito:username | Yes | admin, sections, upload | None | Used only for group API calls |
| Source IP | requestContext | Yes | anonymous fallback | UserUsage (as anon_) | Backup identifier |
| Subject (sub) | sub | Yes | UNUSED | NONE | Unique Cognito ID not used |
| Name | name | Yes | UNUSED | NONE | Available but not stored |
| Picture | picture | Yes | UNUSED | NONE | Available but not stored |
| Phone | phone_number | Yes | UNUSED | NONE | Available but not stored |
| Locale | locale | Yes | UNUSED | NONE | Available but not stored |
| Email Verified | email_verified | Yes | UNUSED | NONE | Available but not stored |
| Groups | (API call) | N/A | admin verify | NONE | Fetched from Cognito API |

## Table 8: User Data Lifecycle

| Data Type | Created | Stored In | Expires | Notes |
|-----------|---------|-----------|---------|-------|
| User ID (email) | On Cognito signup | UserProgress, TutorSessions, UserUsage | Never | Primary identifier |
| User ID (username) | On Cognito signup | Never (transient) | N/A | Used only in function calls |
| Progress | First checkpoint attempt | UserProgress | Never | Accumulated over time |
| Session Messages | Each API call | TutorSessions | 30 days | Auto-expired by TTL |
| Usage Counters | First API call | UserUsage | 7 days | Auto-expired except TOTAL |
| User Groups | Added to Cognito | Never (fetched on demand) | N/A | Checked via API when needed |
| Anonymous Session | First request from IP | UserUsage | 7 days | Auto-expired |

## Table 9: Claims Extraction Flow

```
Event Structure:
  event.requestContext.authorizer.claims = {
    "email": "user@example.com",
    "cognito:username": "Google_123456",
    "sub": "12345-67890",
    "aud": "client-id",
    "iss": "https://cognito-idp...",
    ... (other standard OIDC claims)
  }

Extraction in Code:
  claims = event.get('requestContext', {}).get('authorizer', {}).get('claims', {})
  
  # Tutor handlers:
  user_id = claims.get('email')                    # "user@example.com"
  
  # Admin handlers:
  user_id = claims.get('cognito:username')         # "Google_123456"
  
  # Fallback for anonymous:
  source_ip = event.get('requestContext', {}).get('identity', {}).get('sourceIp')
  user_id = f"anon_{source_ip}"                    # "anon_192.168.1.1"
```

## Table 10: Fields NOT Currently Used (Future Enhancement Opportunities)

| Field | Type | Why Useful | Effort | Priority |
|-------|------|-----------|--------|----------|
| name | string | User display, profiles, emails | Low | Medium |
| picture | string | Avatar in UI, user profiles | Low | Medium |
| phone_number | string | Multi-factor auth, notifications | Medium | Low |
| email_verified | bool | Validate user contact | Low | Low |
| locale | string | Multi-language support | Medium | Low |
| updated_at | timestamp | Track profile changes | Low | Low |
| given_name | string | Personalization | Low | Low |
| family_name | string | Personalization | Low | Low |
| phone_verified | bool | Contact validation | Medium | Low |

---

**Generated:** 2025-11-06
**Backend Repository:** /Users/matiasmartinez/Documents/repos/cloudacademy-tutor-backend
**API Version:** v1.0
