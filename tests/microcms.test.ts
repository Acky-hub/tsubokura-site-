import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('microcms-js-sdk', () => ({
  createClient: vi.fn(() => ({
    getList: vi.fn(),
    getListDetail: vi.fn(),
  })),
}));

describe('microcms client', () => {
  beforeEach(() => {
    vi.stubEnv('MICROCMS_SERVICE_DOMAIN', 'test-domain');
    vi.stubEnv('MICROCMS_API_KEY', 'test-key');
  });

  it('getBlogs returns blog list', async () => {
    const { createClient } = await import('microcms-js-sdk');
    const mockClient = (createClient as any).mock.results[0]?.value ?? {
      getList: vi.fn().mockResolvedValue({
        contents: [{ id: '1', title: 'Test', body: '<p>test</p>', publishedAt: '2026-01-01' }],
        totalCount: 1,
      }),
      getListDetail: vi.fn(),
    };
    (createClient as any).mockReturnValue(mockClient);

    vi.resetModules();
    const { getBlogs } = await import('../src/lib/microcms');
    const result = await getBlogs();

    expect(result.contents).toHaveLength(1);
    expect(result.contents[0].title).toBe('Test');
  });
});
