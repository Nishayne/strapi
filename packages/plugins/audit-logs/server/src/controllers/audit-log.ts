import type { Core } from '@strapi/types';
import { getService } from '../utils';

const controller: Core.Controller = {
  async find(ctx: any) {
    console.log('🔍 Audit Log Controller - find() called');
    const auditLogService = getService('audit-log');

    const { contentType, userId, action, startDate, endDate, page, pageSize, sort } = ctx.query;

    const params = {
      contentType,
      userId: userId ? parseInt(userId) : undefined,
      action,
      startDate,
      endDate,
      page: page ? parseInt(page) : 1,
      pageSize: pageSize ? parseInt(pageSize) : 25,
      sort: sort || 'timestamp:desc',
    };

    const { results, pagination } = await auditLogService.findMany(params);

    ctx.body = {
      data: results,
      meta: {
        pagination,
      },
    };
  },

  async findOne(ctx: any) {
    const auditLogService = getService('audit-log');
    const { id } = ctx.params;

    const auditLog = await auditLogService.findOne(parseInt(id));

    if (!auditLog) {
      return ctx.notFound('Audit log not found');
    }

    ctx.body = {
      data: auditLog,
    };
  },

  async getContentTypes(ctx: any) {
    const auditLogService = getService('audit-log');
    const contentTypes = await auditLogService.getContentTypes();

    ctx.body = {
      data: contentTypes,
    };
  },

  async getUsers(ctx: any) {
    const auditLogService = getService('audit-log');
    const users = await auditLogService.getUsers();

    ctx.body = {
      data: users,
    };
  },
};

export default controller;
