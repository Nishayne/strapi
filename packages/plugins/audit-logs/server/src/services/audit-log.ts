import type { Core } from '@strapi/types';
import { omit, isEqual } from 'lodash';

interface AuditLogEntry {
  action: 'create' | 'update' | 'delete';
  contentType: string;
  contentTypeName: string;
  recordId: string;
  userId?: number;
  userEmail?: string;
  timestamp: Date;
  changes?: any;
  metadata?: any;
}

interface ChangesData {
  before?: any;
  after?: any;
  fields?: string[];
}

class AuditLogService {
  private strapi: Core.Strapi;

  constructor(strapi: Core.Strapi) {
    this.strapi = strapi;
  }

  async logOperation(entry: AuditLogEntry) {
    return strapi.db.query('plugin::audit-logs.audit-log').create({
      data: entry,
    });
  }

  async getChanges(context: any, result: any, action: string): Promise<ChangesData> {
    const changes: ChangesData = {};

    switch (action) {
      case 'create':
        changes.after = this.sanitizeData(result);
        break;

      case 'update':
        // For updates, we need to get the before state
        // This is tricky because we don't have access to the original data
        // We'll log the new data and mark it as an update
        changes.after = this.sanitizeData(result);
        changes.fields = this.getChangedFields(context.params?.data, result);
        break;

      case 'delete':
        // For deletes, we log the deleted data
        changes.before = this.sanitizeData(result);
        break;
    }

    return changes;
  }

  private sanitizeData(data: any): any {
    if (!data) return null;

    // Remove sensitive fields and system fields
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'hash'];
    const systemFields = ['id', 'createdAt', 'updatedAt', 'publishedAt', 'createdBy', 'updatedBy'];

    const sanitized = omit(data, [...sensitiveFields, ...systemFields]);

    // Recursively sanitize nested objects
    if (typeof sanitized === 'object' && sanitized !== null) {
      Object.keys(sanitized).forEach((key) => {
        if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
          sanitized[key] = this.sanitizeData(sanitized[key]);
        }
      });
    }

    return sanitized;
  }

  private getChangedFields(newData: any, result: any): string[] {
    if (!newData || !result) return [];

    const changedFields: string[] = [];

    Object.keys(newData).forEach((key) => {
      if (!isEqual(newData[key], result[key])) {
        changedFields.push(key);
      }
    });

    return changedFields;
  }

  async findMany(params: any = {}) {
    const {
      contentType,
      userId,
      action,
      startDate,
      endDate,
      page = 1,
      pageSize = 25,
      sort = 'timestamp:desc',
      ...restParams
    } = params;

    const where: any = {};

    if (contentType) {
      where.contentType = contentType;
    }

    if (userId) {
      where.userId = userId;
    }

    if (action) {
      where.action = action;
    }

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) {
        where.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        where.timestamp.$lte = new Date(endDate);
      }
    }

    const results = await strapi.db.query('plugin::audit-logs.audit-log').findMany({
      where,
      ...restParams,
      offset: (page - 1) * pageSize,
      limit: pageSize,
      orderBy: { [sort.split(':')[0]]: sort.split(':')[1] || 'desc' },
    });

    const total = await strapi.db.query('plugin::audit-logs.audit-log').count({
      where,
    });

    return {
      results,
      pagination: {
        page,
        pageSize,
        pageCount: Math.ceil(total / pageSize),
        total,
      },
    };
  }

  async findOne(id: number) {
    return strapi.db.query('plugin::audit-logs.audit-log').findOne({
      where: { id },
    });
  }

  async getContentTypes() {
    const results = await strapi.db.query('plugin::audit-logs.audit-log').findMany({
      select: ['contentType', 'contentTypeName'],
    });

    // Manually deduplicate
    const unique = new Map();
    results.forEach((item: any) => {
      if (!unique.has(item.contentType)) {
        unique.set(item.contentType, {
          contentType: item.contentType,
          contentTypeName: item.contentTypeName,
        });
      }
    });

    return Array.from(unique.values());
  }

  async getUsers() {
    const results = await strapi.db.query('plugin::audit-logs.audit-log').findMany({
      select: ['userId', 'userEmail'],
      where: {
        userId: { $notNull: true },
      },
    });

    // Manually deduplicate
    const unique = new Map();
    results.forEach((item: any) => {
      if (item.userId && !unique.has(item.userId)) {
        unique.set(item.userId, {
          userId: item.userId,
          userEmail: item.userEmail,
        });
      }
    });

    return Array.from(unique.values());
  }
}

export default (strapi: Core.Strapi) => new AuditLogService(strapi);
