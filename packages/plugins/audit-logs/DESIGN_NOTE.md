# Audit Logging System Design Document

## Overview

This document describes the design and implementation of the automated audit logging feature for Strapi. The system provides comprehensive tracking of all content changes performed through Strapi's Content API, with configurable options and role-based access control.

## Architecture Design

### High-Level Architecture

The audit logging system is implemented as a Strapi plugin that integrates seamlessly with the existing Strapi architecture. The system consists of several key components:

1. **Document Service Middleware**: Intercepts all content operations
2. **Audit Log Service**: Handles data collection, sanitization, and storage
3. **Content Type**: Defines the audit log data model
4. **REST API**: Provides endpoints for retrieving and filtering audit logs
5. **Permission System**: Controls access to audit log data
6. **Configuration System**: Manages plugin settings

### Integration Strategy

The plugin leverages Strapi's existing middleware system (`strapi.documents.use()`) to intercept document operations without modifying core Strapi functionality. This approach ensures:

- **Non-intrusive**: No changes to existing Strapi code
- **Maintainable**: Easy to update and maintain
- **Extensible**: Can be easily extended with additional features
- **Performant**: Minimal impact on existing operations

## Data Model Design

### Audit Log Schema

```typescript
interface AuditLogEntry {
  id: number;
  action: 'create' | 'update' | 'delete';
  contentType: string; // Content type UID (e.g., 'api::article.article')
  contentTypeName: string; // Human-readable name (e.g., 'Article')
  documentId: string; // ID of the affected document
  userId?: number; // ID of the user who performed the action
  userEmail?: string; // Email of the user who performed the action
  timestamp: Date; // When the action occurred
  changes?: {
    before?: any; // Data before the change (for updates/deletes)
    after?: any; // Data after the change (for creates/updates)
    fields?: string[]; // List of changed fields (for updates)
  };
  metadata?: {
    userAgent?: string; // User agent from the request
    ipAddress?: string; // IP address of the request
    locale?: string; // Locale of the content
  };
}
```

### Database Design

The audit logs are stored in a dedicated table with appropriate indexing for efficient querying:

```sql
CREATE TABLE audit_logs (
  id INTEGER PRIMARY KEY,
  action VARCHAR(255) NOT NULL,
  content_type VARCHAR(255) NOT NULL,
  content_type_name VARCHAR(255) NOT NULL,
  document_id VARCHAR(255) NOT NULL,
  user_id INTEGER,
  user_email VARCHAR(255),
  timestamp DATETIME NOT NULL,
  changes JSON,
  metadata JSON,
  created_at DATETIME,
  updated_at DATETIME
);

-- Indexes for efficient querying
CREATE INDEX idx_audit_logs_content_type ON audit_logs(content_type);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_document_id ON audit_logs(document_id);
```

## Implementation Details

### Middleware Integration

The core of the audit logging system is a document service middleware that intercepts all content operations:

```typescript
strapi.documents.use(async (context, next) => {
  const { action, contentType, uid } = context;
  
  // Only log create, update, and delete operations
  if (!['create', 'update', 'delete'].includes(action)) {
    return next();
  }
  
  // Check configuration
  const config = strapi.config.get('plugin.audit-logs', { enabled: true });
  if (config.enabled === false || config.excludeContentTypes?.includes(uid)) {
    return next();
  }
  
  // Execute the original operation
  const result = await next();
  
  // Log the operation
  await auditLogService.logOperation({
    action,
    contentType: uid,
    contentTypeName: contentType.info.displayName,
    documentId: result?.id || result?.documentId,
    userId: context.state?.user?.id,
    userEmail: context.state?.user?.email,
    timestamp: new Date(),
    changes: await auditLogService.getChanges(context, result, action),
    metadata: {
      userAgent: context.request?.headers?.['user-agent'],
      ipAddress: context.request?.ip,
      locale: context.locale,
    },
  });
  
  return result;
});
```

### Data Sanitization

To protect sensitive information, the system automatically sanitizes logged data:

```typescript
private sanitizeData(data: any): any {
  if (!data) return null;
  
  // Remove sensitive fields
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'hash'];
  const systemFields = ['id', 'createdAt', 'updatedAt', 'publishedAt', 'createdBy', 'updatedBy'];
  
  const sanitized = omit(data, [...sensitiveFields, ...systemFields]);
  
  // Recursively sanitize nested objects
  if (typeof sanitized === 'object' && sanitized !== null) {
    Object.keys(sanitized).forEach(key => {
      if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitizeData(sanitized[key]);
      }
    });
  }
  
  return sanitized;
}
```

### Change Detection

For update operations, the system attempts to detect which fields have changed:

```typescript
private getChangedFields(newData: any, result: any): string[] {
  if (!newData || !result) return [];
  
  const changedFields: string[] = [];
  
  Object.keys(newData).forEach(key => {
    if (!isEqual(newData[key], result[key])) {
      changedFields.push(key);
    }
  });
  
  return changedFields;
}
```

## API Design

### REST Endpoints

The plugin provides a comprehensive REST API for accessing audit logs:

#### GET /api/audit-logs
Retrieves paginated audit logs with filtering options.

**Query Parameters:**
- `contentType`: Filter by content type UID
- `userId`: Filter by user ID
- `action`: Filter by action type
- `startDate`/`endDate`: Filter by date range
- `page`/`pageSize`: Pagination parameters
- `sort`: Sort order

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "action": "create",
      "contentType": "api::article.article",
      "contentTypeName": "Article",
      "documentId": "123",
      "userId": 1,
      "userEmail": "user@example.com",
      "timestamp": "2024-01-01T00:00:00.000Z",
      "changes": {
        "after": { "title": "New Article", "content": "..." }
      },
      "metadata": {
        "userAgent": "Mozilla/5.0...",
        "ipAddress": "192.168.1.1"
      }
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "pageSize": 25,
      "pageCount": 10,
      "total": 250
    }
  }
}
```

#### GET /api/audit-logs/:id
Retrieves a specific audit log entry.

#### GET /api/audit-logs/content-types
Returns available content types with audit logs.

#### GET /api/audit-logs/users
Returns users who have performed logged actions.

## Security Design

### Access Control

The plugin integrates with Strapi's permission system to control access:

1. **Permission Registration**: Registers `plugin::audit-logs.read` permission
2. **Policy Enforcement**: Uses middleware to check permissions on all endpoints
3. **Role-Based Access**: Permissions are tied to user roles

### Data Protection

1. **Sensitive Data Removal**: Automatically removes sensitive fields
2. **Error Handling**: Audit failures don't affect original operations
3. **Input Validation**: All API inputs are validated and sanitized

## Configuration Design

### Plugin Configuration

```javascript
module.exports = {
  'audit-logs': {
    enabled: true, // Global enable/disable
    excludeContentTypes: [ // Content types to exclude
      'plugin::users-permissions.user',
      'api::sensitive.sensitive'
    ],
  },
};
```

### Design Rationale

- **Enabled by Default**: Audit logging is enabled by default for security
- **Granular Control**: Can exclude specific content types
- **Simple Configuration**: Minimal configuration required

## Performance Considerations

### Optimization Strategies

1. **Asynchronous Logging**: Audit logging doesn't block original operations
2. **Efficient Indexing**: Database indexes on frequently queried fields
3. **Pagination**: All list endpoints support pagination
4. **Selective Logging**: Can exclude high-frequency content types

### Scalability

1. **Database Partitioning**: Can be partitioned by date for large datasets
2. **Data Retention**: Can implement retention policies
3. **Archival**: Can archive old logs to reduce active database size

## Error Handling

### Error Strategy

1. **Non-Blocking**: Audit failures don't affect content operations
2. **Logging**: Errors are logged for debugging
3. **Graceful Degradation**: System continues to work even if audit logging fails

### Error Types

1. **Configuration Errors**: Invalid plugin configuration
2. **Database Errors**: Issues with audit log storage
3. **Permission Errors**: Access denied to audit logs
4. **Validation Errors**: Invalid API parameters

## Testing Strategy

### Test Coverage

1. **Unit Tests**: Individual service methods
2. **Integration Tests**: Middleware integration
3. **API Tests**: REST endpoint functionality
4. **Permission Tests**: Access control verification

### Test Scenarios

1. **Content Operations**: Create, update, delete operations
2. **Configuration**: Enable/disable and exclusion settings
3. **Permissions**: Access control with different user roles
4. **Error Handling**: Various error conditions
5. **Performance**: Large dataset handling

## Future Enhancements

### Potential Improvements

1. **Real-time Notifications**: WebSocket notifications for audit events
2. **Advanced Filtering**: More sophisticated filtering options
3. **Data Export**: Export audit logs to various formats
4. **Analytics**: Built-in analytics and reporting
5. **Retention Policies**: Automatic data retention and cleanup
6. **Audit Log Compression**: Compress old logs to save space

### Extensibility

The plugin is designed to be easily extensible:

1. **Custom Fields**: Can add custom fields to audit logs
2. **Additional Metadata**: Can capture more request metadata
3. **Custom Actions**: Can log additional action types
4. **Integration Hooks**: Can integrate with external systems

## Conclusion

The audit logging system provides a comprehensive, secure, and performant solution for tracking content changes in Strapi. The design prioritizes:

- **Security**: Comprehensive access control and data protection
- **Performance**: Minimal impact on existing operations
- **Usability**: Simple configuration and intuitive API
- **Maintainability**: Clean, well-documented code
- **Extensibility**: Easy to extend and customize

The system successfully meets all requirements while maintaining compatibility with existing Strapi functionality and following best practices for plugin development.
