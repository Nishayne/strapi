# Audit Logs Plugin - Testing Guide

This guide explains how to test the audit logs plugin endpoints and functionality.

## Table of Contents

- [Setup](#setup)
- [Unit Tests](#unit-tests)
- [Manual API Testing](#manual-api-testing)
- [Testing Workflow](#testing-workflow)
- [Endpoint Reference](#endpoint-reference)

## Setup

### 1. Build and Start Strapi

```bash
# From the Strapi root directory
cd /Users/niranjan/strapi

# Build the plugin (if not already built)
yarn build --scope=@strapi/plugin-audit-logs

# Navigate to an example app
cd examples/empty

# Configure the plugin (create config/plugins.js)
cat > config/plugins.js << 'EOF'
module.exports = {
  'audit-logs': {
    enabled: true,
    excludeContentTypes: [],
  },
};
EOF

# Start Strapi
yarn develop
```

### 2. Create Admin User

1. Navigate to `http://localhost:1337/admin`
2. Create your first admin user
3. Save the credentials for API testing

## Unit Tests

Run the unit tests from the root directory:

```bash
# Run all tests for the audit-logs plugin
yarn test:unit --testPathPattern=audit-logs

# Run tests in watch mode
yarn test:unit --testPathPattern=audit-logs --watch

# Run with coverage
yarn test:unit --testPathPattern=audit-logs --coverage
```

## Manual API Testing

### Step 1: Get Authentication Token

You need a JWT token to access the audit logs endpoints.

#### Option A: Via Admin Panel

1. Login to admin panel at `http://localhost:1337/admin`
2. Open browser DevTools → Network tab
3. Make any request
4. Find the Authorization header in the request
5. Copy the Bearer token

#### Option B: Via API

```bash
curl -X POST http://localhost:1337/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-admin@example.com",
    "password": "your-password"
  }'
```

Response will include:

```json
{
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": { ... }
  }
}
```

### Step 2: Test the Endpoints

Replace `YOUR_JWT_TOKEN` with your actual token in the examples below.

#### 1. Get All Audit Logs

```bash
curl -X GET http://localhost:1337/api/audit-logs \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response:**

```json
{
  "data": [
    {
      "id": 1,
      "action": "create",
      "contentType": "api::article.article",
      "contentTypeName": "Article",
      "documentId": "abc123",
      "userId": 1,
      "userEmail": "admin@example.com",
      "timestamp": "2024-01-15T10:30:00.000Z",
      "changes": {
        "after": { "title": "New Article", "content": "..." }
      },
      "metadata": {
        "userAgent": "Mozilla/5.0...",
        "ipAddress": "127.0.0.1"
      }
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "pageSize": 25,
      "pageCount": 1,
      "total": 10
    }
  }
}
```

#### 2. Filter by Content Type

```bash
curl -X GET "http://localhost:1337/api/audit-logs?contentType=api::article.article" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

#### 3. Filter by Action Type

```bash
curl -X GET "http://localhost:1337/api/audit-logs?action=create" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

#### 4. Filter by User

```bash
curl -X GET "http://localhost:1337/api/audit-logs?userId=1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

#### 5. Filter by Date Range

```bash
curl -X GET "http://localhost:1337/api/audit-logs?startDate=2024-01-01&endDate=2024-12-31" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

#### 6. Pagination and Sorting

```bash
curl -X GET "http://localhost:1337/api/audit-logs?page=2&pageSize=50&sort=timestamp:desc" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

#### 7. Combined Filters

```bash
curl -X GET "http://localhost:1337/api/audit-logs?contentType=api::article.article&action=update&startDate=2024-01-01&page=1&pageSize=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

#### 8. Get Single Audit Log

```bash
curl -X GET http://localhost:1337/api/audit-logs/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

#### 9. Get Available Content Types

```bash
curl -X GET http://localhost:1337/api/audit-logs/content-types \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response:**

```json
{
  "data": [
    {
      "contentType": "api::article.article",
      "contentTypeName": "Article"
    },
    {
      "contentType": "api::page.page",
      "contentTypeName": "Page"
    }
  ]
}
```

#### 10. Get Users with Audit Activity

```bash
curl -X GET http://localhost:1337/api/audit-logs/users \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response:**

```json
{
  "data": [
    {
      "userId": 1,
      "userEmail": "admin@example.com"
    },
    {
      "userId": 2,
      "userEmail": "editor@example.com"
    }
  ]
}
```

## Testing Workflow

### Complete End-to-End Test

1. **Start Strapi** with audit-logs plugin enabled
2. **Create some content** to generate audit logs:

   ```bash
   # Create an article via Content API
   curl -X POST http://localhost:1337/api/articles \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "data": {
         "title": "Test Article",
         "content": "This is a test article"
       }
     }'
   ```

3. **Update the content**:

   ```bash
   curl -X PUT http://localhost:1337/api/articles/1 \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "data": {
         "title": "Updated Test Article"
       }
     }'
   ```

4. **Check audit logs** to verify entries were created:

   ```bash
   curl -X GET http://localhost:1337/api/audit-logs \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
   ```

5. **Verify the audit logs** contain:
   - One entry with `action: "create"`
   - One entry with `action: "update"`
   - Both entries have correct `contentType`, `userId`, and `timestamp`
   - Update entry has `changes.fields` indicating what was changed

### Testing Permissions

1. **Create a new role** without audit-logs permissions:

   - Go to Settings → Roles
   - Create a new role (e.g., "Editor")
   - Do NOT grant "Read audit logs" permission

2. **Create a user** with that role

3. **Try to access audit logs** with that user's token:

   ```bash
   curl -X GET http://localhost:1337/api/audit-logs \
     -H "Authorization: Bearer EDITOR_JWT_TOKEN"
   ```

4. **Expected result**: 403 Forbidden error

5. **Grant permission** and try again:

   - Go to Settings → Roles → Editor
   - Under Plugins → Audit Logs, check "Read audit logs"
   - Save

6. **Try again** - should now succeed

### Testing Configuration

1. **Test with plugin disabled**:

   ```javascript
   // config/plugins.js
   module.exports = {
     'audit-logs': {
       enabled: false,
     },
   };
   ```

   - Restart Strapi
   - Create/update content
   - Verify no audit logs are created

2. **Test with content type exclusions**:
   ```javascript
   // config/plugins.js
   module.exports = {
     'audit-logs': {
       enabled: true,
       excludeContentTypes: ['api::article.article'],
     },
   };
   ```
   - Restart Strapi
   - Create an article (should NOT create audit log)
   - Create a page (should create audit log)
   - Verify only page operations are logged

## Endpoint Reference

| Method | Endpoint                        | Description                   | Auth Required |
| ------ | ------------------------------- | ----------------------------- | ------------- |
| GET    | `/api/audit-logs`               | Get paginated audit logs      | Yes           |
| GET    | `/api/audit-logs/:id`           | Get specific audit log        | Yes           |
| GET    | `/api/audit-logs/content-types` | Get content types with logs   | Yes           |
| GET    | `/api/audit-logs/users`         | Get users with audit activity | Yes           |

### Query Parameters for `/api/audit-logs`

| Parameter     | Type   | Description                                     | Example                |
| ------------- | ------ | ----------------------------------------------- | ---------------------- |
| `contentType` | string | Filter by content type UID                      | `api::article.article` |
| `userId`      | number | Filter by user ID                               | `1`                    |
| `action`      | string | Filter by action (`create`, `update`, `delete`) | `create`               |
| `startDate`   | string | Filter from date (ISO format)                   | `2024-01-01`           |
| `endDate`     | string | Filter to date (ISO format)                     | `2024-12-31`           |
| `page`        | number | Page number (default: 1)                        | `2`                    |
| `pageSize`    | number | Items per page (default: 25)                    | `50`                   |
| `sort`        | string | Sort order (default: `timestamp:desc`)          | `timestamp:asc`        |

## Troubleshooting

### Common Issues

1. **401 Unauthorized**

   - Check that you're including the Authorization header
   - Verify the token is valid and not expired
   - Try logging in again to get a fresh token

2. **403 Forbidden**

   - User doesn't have `plugin::audit-logs.read` permission
   - Check role permissions in admin panel

3. **No audit logs appearing**

   - Check if plugin is enabled in config
   - Verify content type is not in exclusion list
   - Check Strapi logs for errors

4. **Empty response**
   - No audit logs have been created yet
   - Create/update/delete some content first
   - Check filters aren't too restrictive

## Using Postman

For easier testing, you can use Postman:

1. **Create a new collection** "Audit Logs Tests"
2. **Set up environment variables**:
   - `baseUrl`: `http://localhost:1337`
   - `jwtToken`: Your JWT token
3. **Add requests** for each endpoint
4. **Use collection variables** for the Authorization header

Example Postman request:

```
GET {{baseUrl}}/api/audit-logs?contentType=api::article.article
Headers:
  Authorization: Bearer {{jwtToken}}
  Content-Type: application/json
```

## Automated Testing

For automated integration testing, see the example test file at:
`server/src/__tests__/integration/audit-logs-api.test.ts`

This file shows the expected structure of responses and can be adapted for full integration tests with a test Strapi instance.
