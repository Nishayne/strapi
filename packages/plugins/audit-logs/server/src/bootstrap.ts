import type { Core } from '@strapi/types';
import { getService } from './utils';

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
    const config = strapi.config.get('plugin.audit-logs', { enabled: true });
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
      await auditLogService.logOperation({
        action,
        contentType: uid,
        contentTypeName: contentType.info.displayName || contentType.info.singularName,
        recordId: String(result?.id || result?.documentId || 'unknown'),
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
    } catch (error) {
      // Log error but don't fail the operation
      strapi.log.error('Failed to create audit log:', error);
    }

    return result;
  });
};
