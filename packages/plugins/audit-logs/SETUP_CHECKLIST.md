# Audit Logs Plugin - Setup Checklist

## Quick Setup Steps

### 1. Rebuild the Plugin

```bash
cd /Users/niranjan/strapi
yarn build --scope=@strapi/plugin-audit-logs
```

### 2. Configure the Example App

Create or edit `/Users/niranjan/strapi/examples/empty/config/plugins.js`:

```javascript
module.exports = {
  'audit-logs': {
    enabled: true,
    resolve: './node_modules/@strapi/plugin-audit-logs',
  },
};
```

**OR** if using the monorepo directly (recommended for development):

```javascript
module.exports = ({ env }) => ({
  'audit-logs': {
    enabled: true,
  },
});
```

### 3. Link the Plugin (Monorepo Development)

Since we're in a monorepo, Strapi should automatically detect the plugin. But verify the plugin exists:

```bash
ls -la /Users/niranjan/strapi/packages/plugins/audit-logs/dist/
```

You should see compiled server files.

### 4. Restart Strapi

```bash
cd /Users/niranjan/strapi/examples/empty
# Kill current process if running
yarn develop
```

### 5. Check if Plugin Loaded

Look for these in the Strapi startup logs:

```
[INFO] Plugin "audit-logs" is being loaded
[INFO] Routes registered for plugin audit-logs
```

### 6. Test the Endpoint

The endpoint should be at `/audit-logs/admin/audit-logs` (admin route):

```bash
curl -X GET http://localhost:1337/audit-logs/admin/audit-logs \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Troubleshooting

### Plugin Not Found

If you get a 404, the plugin might not be loaded. Check:

1. **Plugin exists in node_modules or packages**:

   ```bash
   ls -la examples/empty/node_modules/@strapi/plugin-audit-logs
   # OR
   ls -la packages/plugins/audit-logs
   ```

2. **Plugin is built**:

   ```bash
   ls -la packages/plugins/audit-logs/dist/server/index.js
   ```

3. **Strapi can find the plugin**:
   Check `examples/empty/config/plugins.js` exists and has the configuration.

### Still Getting 404?

The issue might be that Strapi doesn't automatically load plugins from the monorepo. Try:

1. **Create a symlink** in the example app:

   ```bash
   cd examples/empty
   mkdir -p node_modules/@strapi
   ln -s ../../../packages/plugins/audit-logs node_modules/@strapi/plugin-audit-logs
   ```

2. **Or use the built-in plugin loading** by creating a `src/plugins` directory:

   ```bash
   cd examples/empty
   mkdir -p src/plugins
   ln -s ../../../packages/plugins/audit-logs src/plugins/audit-logs
   ```

   Then update `config/plugins.js`:

   ```javascript
   module.exports = {
     'audit-logs': {
       enabled: true,
     },
   };
   ```

### Database Not Created?

If the audit_logs table isn't created:

1. Check Strapi logs for migration errors
2. Try deleting `.tmp` directory and restarting:
   ```bash
   cd examples/empty
   rm -rf .tmp
   yarn develop
   ```

### Routes Not Registered?

If routes aren't working, check the server/src/routes/index.ts file is correctly structured.

## Verification Steps

1. **Check plugin is loaded**:

   - Look for audit-logs in startup logs
   - Check `http://localhost:1337/admin` → Settings → Plugins (may not show there if it's server-only)

2. **Check database**:

   ```bash
   # If using SQLite (default)
   cd examples/empty
   sqlite3 .tmp/data.db "SELECT name FROM sqlite_master WHERE type='table' AND name='audit_logs';"
   ```

3. **Create test content and check logs**:
   ```bash
   # Create content via admin panel or API
   # Then check audit logs
   curl -X GET http://localhost:1337/audit-logs/admin/audit-logs \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```
