import type { Core } from '@strapi/types';
import { getService } from './utils';

interface AuditLogsConfig {
  enabled: boolean;
  excludeContentTypes?: string[];
}

export default async ({ strapi }: { strapi: Core.Strapi }) => {
  strapi.log.info('🔍 Audit Logs Plugin - Bootstrap phase');
  strapi.log.info('🔍 Audit Logs Plugin - Routes registered');

  const auditLogService = getService('audit-log');

  // Setup document middleware to intercept content operations
  strapi.documents.use(async (context, next) => {
    const { action, contentType, uid } = context;

    // Only log create, update, and delete operations
    if (!['create', 'update', 'delete'].includes(action)) {
      return next();
    }

    // Check if audit logging is enabled
    const config = strapi.config.get('plugin.audit-logs', { enabled: true }) as AuditLogsConfig;
    if (config.enabled === false) {
      return next();
    }

    // Check if this content type is excluded
    const excludedContentTypes = config.excludeContentTypes || [];
    if (excludedContentTypes.includes(uid)) {
      return next();
    }

    // Get the result of the operation
    const result = await next();

    // Log the operation
    try {
      // Extract record ID from result
      let recordId = 'unknown';
      if (typeof result === 'object' && result !== null && !Array.isArray(result)) {
        recordId = String((result as any).id || (result as any).documentId || 'unknown');
      }

      // Extract user info from context (if available)
      const contextWithState = context as any;
      const userId = contextWithState.state?.user?.id;
      const userEmail = contextWithState.state?.user?.email;
      const userAgent = contextWithState.request?.headers?.['user-agent'];
      const ipAddress = contextWithState.request?.ip;
      const locale = contextWithState.locale;

      await auditLogService.logOperation({
        action,
        contentType: uid,
        contentTypeName: contentType.info.displayName || contentType.info.singularName,
        recordId,
        userId,
        userEmail,
        timestamp: new Date(),
        changes: await auditLogService.getChanges(context, result, action),
        metadata: {
          userAgent,
          ipAddress,
          locale,
        },
      });
    } catch (error) {
      // Log error but don't fail the operation
      strapi.log.error('Failed to create audit log:', error);
    }

    return result;
  });
};
