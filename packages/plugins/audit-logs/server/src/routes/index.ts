export default {
  admin: {
    type: 'admin',
    routes: [
      {
        method: 'GET',
        path: '/audit-logs',
        handler: 'audit-log.find',
        config: {
          policies: ['admin::isAuthenticatedAdmin'],
        },
      },
      {
        method: 'GET',
        path: '/audit-logs/content-types',
        handler: 'audit-log.getContentTypes',
        config: {
          policies: ['admin::isAuthenticatedAdmin'],
        },
      },
      {
        method: 'GET',
        path: '/audit-logs/users',
        handler: 'audit-log.getUsers',
        config: {
          policies: ['admin::isAuthenticatedAdmin'],
        },
      },
      {
        method: 'GET',
        path: '/audit-logs/:id',
        handler: 'audit-log.findOne',
        config: {
          policies: ['admin::isAuthenticatedAdmin'],
        },
      },
    ],
  },
};
