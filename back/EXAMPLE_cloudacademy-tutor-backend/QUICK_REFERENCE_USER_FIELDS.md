# Quick Reference: User Identification & Fields

## The Short Version

### How Users Are Identified
- **Source:** JWT token from Cognito
- **Extraction:** `event.requestContext.authorizer.claims`
- **Identifier:** Either `email` or `cognito:username` (depends on handler)

### User ID by Handler
| Handler | User ID | Example |
|---------|---------|---------|
| tutor-handler | email | `user@example.com` |
| progress-handler | email | `user@example.com` |
| admin-handler | cognito:username | `Google_111137626603562904354` |
| sections-handler | cognito:username | `Google_111137626603562904354` |
| upload-handler | cognito:username | `Google_111137626603562904354` |

### Why Two Different Approaches?
- Admin handlers need `cognito:username` to call `cognito.admin_list_groups_for_user()`
- Tutor/progress handlers use `email` for simpler tracking
- This is an inconsistency worth unifying in the future

## User Fields Used vs Available

### Currently Used (3 fields)
1. **email** - From JWT claim
2. **cognito:username** - From JWT claim  
3. **sourceIp** - From request context (for anonymous users)

### Available But Unused (9 fields)
- name, picture, given_name, family_name
- phone_number, phone_number_verified
- email_verified, locale, updated_at

## Data Stored by Table

### UserProgress
```
PK: USER#{email}
SK: COURSE#{course_id}

Data:
- user_id (email)
- current_section, started_at, last_activity
- checkpoints_completed (with score, passed, attempts)
- total_checkpoints, checkpoints_passed
- hints_used (per section)
```

### TutorSessions
```
PK: SESSION#{session_id}
SK: TIMESTAMP#{timestamp}
TTL: 30 days

Data:
- user_id (email or anon_IP)
- course_id, section_id
- message_type (question|checkpoint|hint)
- user_message, assistant_response
- timestamp
```

### UserUsage
```
PK: user_id (email or anon_IP)
SK: period (TOTAL | YYYY-MM-DD | YYYY-MM-DD-HH)
TTL: 7 days

Data:
- count (total requests)
- question_count, checkpoint_count, hint_count
- last_request
```

## Rate Limiting by User Type

| Type | Identifier | Daily Limit | Hourly Limit | Checkpoints | Hints |
|------|------------|------------|-------------|------------|-------|
| Anonymous | anon_{ip} | 1 | 1 | 0 | 0 |
| Authenticated | email | 50 | 10 | 20/day | 15/day |
| Premium | email | 200 | 50 | 100/day | 50/day |

## Code Locations

1. **Extract email** → tutor-handler/lambda_function.py:106
2. **Extract cognito:username** → admin-handler/lambda_function.py:99
3. **Check admin groups** → admin-handler/lambda_function.py:134
4. **Save session** → tutor-handler/utils/dynamodb_client.py:116
5. **Update progress** → tutor-handler/utils/dynamodb_client.py:213
6. **Rate limiting** → tutor-handler/utils/rate_limiter.py:57

## What to Remember

1. **Tutor handlers use EMAIL** for user identification
2. **Admin handlers use COGNITO:USERNAME** for group verification
3. **Only 3 user fields are actually used** (email, username, sourceIp)
4. **9 fields available** but not currently used (name, picture, etc.)
5. **Inconsistency exists** between handlers - could be unified
6. **Anonymous users identified by** `anon_{sourceIp}`
7. **Rate limits are strict** for anonymous (1 total)
8. **Session data expires** after 30 days
9. **Usage data expires** after 7 days (except TOTAL)

## Recommendations

1. Create a `UserProfile` table to centralize user metadata
2. Unify identification to use one approach (email preferred)
3. Add optional fields: name, picture, locale
4. Track user analytics: courses started, checkpoints passed, etc.
5. Document this inconsistency clearly in code comments
