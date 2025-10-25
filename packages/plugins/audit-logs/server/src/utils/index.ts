import type { Core } from '@strapi/types';

const getService = (name: string) => {
  return strapi.plugin('audit-logs').service(name);
};

export { getService };
