import { createClient } from 'microcms-js-sdk';
import type { MicroCMSListResponse, MicroCMSImage } from 'microcms-js-sdk';

// Support both Astro's import.meta.env and process.env (for tests)
const serviceDomain =
  (typeof import.meta !== 'undefined' && import.meta.env?.MICROCMS_SERVICE_DOMAIN) ||
  process.env.MICROCMS_SERVICE_DOMAIN ||
  '';
const apiKey =
  (typeof import.meta !== 'undefined' && import.meta.env?.MICROCMS_API_KEY) ||
  process.env.MICROCMS_API_KEY ||
  '';

const isConfigured = Boolean(serviceDomain && apiKey);

const client = isConfigured
  ? createClient({ serviceDomain, apiKey })
  : null;

export type Blog = {
  id: string;
  title: string;
  body: string;
  eyecatch?: MicroCMSImage;
  category?: string[];
  publishedAt: string;
};

export type Business = {
  id: string;
  name: string;
  description: string;
  image?: MicroCMSImage;
  url?: string;
};

export async function getBlogs(limit = 10, offset = 0) {
  if (!client) throw new Error('microCMS is not configured');
  return client.getList<Blog>({
    endpoint: 'blogs',
    queries: { limit, offset, orders: '-publishedAt' },
  });
}

export async function getBlogDetail(slug: string) {
  if (!client) throw new Error('microCMS is not configured');
  return client.getListDetail<Blog>({
    endpoint: 'blogs',
    contentId: slug,
  });
}

export async function getBusinessList() {
  if (!client) throw new Error('microCMS is not configured');
  return client.getList<Business>({
    endpoint: 'business',
  });
}
