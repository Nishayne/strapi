import type { Core } from '@strapi/types';

export default async ({ strapi }: { strapi: Core.Strapi }) => {
  strapi.log.info('🔍 Audit Logs Plugin - Register phase');

  // Register permissions for audit logs
  // Note: Content types are auto-registered from the contentTypes export
  // Permissions can be registered here if needed
};
