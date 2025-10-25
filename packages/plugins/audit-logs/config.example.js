// Example configuration for audit-logs plugin
// Add this to your config/plugins.js file

module.exports = {
  'audit-logs': {
    enabled: true, // Enable or disable audit logging globally
    excludeContentTypes: [
      // 'api::article.article', // Exclude specific content types from logging
      // 'plugin::users-permissions.user', // Exclude user content type
    ],
  },
};
