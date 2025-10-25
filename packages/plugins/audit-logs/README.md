# Strapi Audit Logs Plugin

A comprehensive audit logging plugin for Strapi that automatically tracks all content changes performed through the Content API.

## Features

- **Automatic Logging**: Captures all create, update, and delete operations on content types
- **Rich Metadata**: Records user information, timestamps, content type details, and field changes
- **REST API**: Provides endpoints to retrieve, filter, and paginate audit logs
- **Access Control**: Role-based permissions to control who can access audit logs
- **Configurable**: Enable/disable logging globally and exclude specific content types
- **Data Sanitization**: Automatically removes sensitive fields from logged data

## Installation

This plugin is included as part of the Strapi core packages. No additional installation is required.

## Configuration

Add the following configuration to your `config/plugins.js` file:

```javascript
module.exports = {
  'audit-logs': {
    enabled: true, // Enable or disable audit logging globally
    excludeContentTypes: [
      // 'api::article.article', // Exclude specific content types from logging
      // 'plugin::users-permissions.user', // Exclude user content type
    ],
  },
};
```

### Configuration Options

- `enabled` (boolean): Enable or disable audit logging globally. Default: `true`
- `excludeContentTypes` (array): Array of content type UIDs to exclude from logging. Default: `[]`

## API Endpoints

The plugin provides the following REST API endpoints:

### Get Audit Logs

```http
GET /api/audit-logs
```

**Query Parameters:**

- `contentType` (string): Filter by content type UID
- `userId` (number): Filter by user ID
- `action` (string): Filter by action type (`create`, `update`, `delete`)
- `startDate` (string): Filter logs from this date (ISO format)
- `endDate` (string): Filter logs to this date (ISO format)
- `page` (number): Page number for pagination (default: 1)
- `pageSize` (number): Number of items per page (default: 25)
- `sort` (string): Sort order (default: `timestamp:desc`)

**Example:**

```http
GET /api/audit-logs?contentType=api::article.article&action=update&page=1&pageSize=10
```

### Get Single Audit Log

```http
GET /api/audit-logs/:id
```

### Get Available Content Types

```http
GET /api/audit-logs/content-types
```

Returns a list of all content types that have audit logs.

### Get Available Users

```http
GET /api/audit-logs/users
```

Returns a list of all users who have performed logged actions.

## Data Model

Each audit log entry contains the following fields:

```typescript
interface AuditLogEntry {
  id: number;
  action: 'create' | 'update' | 'delete';
  contentType: string; // Content type UID
  contentTypeName: string; // Human-readable content type name
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

## Permissions

The plugin registers a permission `plugin::audit-logs.read` that controls access to audit log endpoints. Users must have this permission to access audit logs.

To grant permissions:

1. Go to Settings → Users & Permissions Plugin → Roles
2. Select the role you want to modify
3. Under the "Plugins" section, find "Audit Logs"
4. Check the "Read audit logs" permission

## Architecture

### Integration Points

The plugin integrates with Strapi through several key mechanisms:

1. **Document Service Middleware**: Uses `strapi.documents.use()` to intercept all document operations
2. **Content Type Registration**: Registers a new content type for storing audit logs
3. **Permission System**: Integrates with Strapi's permission system for access control
4. **Configuration System**: Uses Strapi's configuration system for plugin settings

### Data Flow

1. **Content Operation**: User performs create/update/delete operation via Content API
2. **Middleware Interception**: Document service middleware intercepts the operation
3. **Configuration Check**: Plugin checks if logging is enabled and content type is not excluded
4. **Data Collection**: Plugin collects relevant data (user, content type, changes, metadata)
5. **Data Sanitization**: Sensitive fields are removed from the logged data
6. **Audit Log Creation**: New audit log entry is created in the database
7. **Response**: Original operation continues and returns result to user

### Security Considerations

- **Data Sanitization**: Sensitive fields (passwords, tokens, secrets) are automatically removed
- **Access Control**: Only users with proper permissions can access audit logs
- **Error Handling**: Audit logging failures don't affect the original operation
- **Performance**: Logging is asynchronous and doesn't block content operations

## Database Schema

The plugin creates a new table `audit_logs` with the following structure:

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
```

## Performance Considerations

- **Indexing**: The plugin automatically creates indexes on frequently queried fields
- **Pagination**: All list endpoints support pagination to handle large datasets
- **Selective Logging**: Content types can be excluded to reduce logging overhead
- **Async Processing**: Audit logging doesn't block the original operation

## Testing

For comprehensive testing instructions, including API endpoint testing and examples, see the [Testing Guide](./TESTING_GUIDE.md).

## Development

### Running Tests

The plugin includes unit tests to verify functionality. You can run the tests using the following commands:

#### From the Strapi Root Directory

```bash
# Run all unit tests for the audit-logs plugin
yarn jest --config packages/plugins/audit-logs/server/jest.config.js

# Run tests with coverage
yarn jest --config packages/plugins/audit-logs/server/jest.config.js --coverage

# Run tests in watch mode
yarn jest --config packages/plugins/audit-logs/server/jest.config.js --watch
```

#### From the Plugin Directory

```bash
# Navigate to the plugin directory
cd packages/plugins/audit-logs/server

# Run tests
yarn test:unit

# Run tests in watch mode
yarn test:unit:watch
```

#### Using Nx (Strapi's Build Tool)

```bash
# From the root directory
npx nx test:unit @strapi/plugin-audit-logs
```

### Before Running Tests

Make sure you have:

1. **Installed dependencies**:

```bash
# From the Strapi root directory
yarn install
```

2. **Built the necessary packages** (if required):

```bash
# From the Strapi root directory
yarn build
```

### Test Structure

The tests are located in `server/src/__tests__/` and cover:

- Audit log service functionality
- Data sanitization
- API endpoint behavior
- Permission checking

## Troubleshooting

### Common Issues

1. **Audit logs not being created**

   - Check if the plugin is enabled in configuration
   - Verify that the content type is not in the exclude list
   - Check Strapi logs for any errors

2. **Permission denied errors**

   - Ensure the user has the `plugin::audit-logs.read` permission
   - Check that the user is properly authenticated

3. **Performance issues**
   - Consider excluding high-frequency content types
   - Implement data retention policies
   - Monitor database performance

### Debug Mode

Enable debug logging by setting the log level to debug in your Strapi configuration:

```javascript
// config/server.js
module.exports = {
  // ... other config
  logger: {
    level: 'debug',
  },
};
```

## Contributing

This plugin is part of the Strapi core packages. For contributions, please follow the Strapi contribution guidelines.

## License

This plugin is licensed under the same license as Strapi. See the main LICENSE file for details.
