export default async (ctx: any, next: () => Promise<void>) => {
  const { user } = ctx.state;

  if (!user) {
    return ctx.unauthorized('Authentication required');
  }

  // For now, allow any authenticated admin user
  // In production, you would check specific permissions here
  // const hasPermission = await strapi.admin.services.permission.engine.check({
  //   user,
  //   permission: 'plugin::audit-logs.read',
  // });

  // if (!hasPermission) {
  //   return ctx.forbidden('Insufficient permissions to access audit logs');
  // }

  await next();
};
