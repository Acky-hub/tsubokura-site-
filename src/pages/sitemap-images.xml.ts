import fs from 'node:fs';
import path from 'node:path';

const SITE = 'https://tsubokurahideyuki.com';
const GALLERY_URL = `${SITE}/gallery/`;

const CATEGORY_LABEL: Record<string, string> = {
  profile: 'プロフィール',
  quote: '経営哲学・語録',
  qa: 'Q&A',
  business: '事業紹介',
};

function categoryOf(file: string): string {
  for (const key of Object.keys(CATEGORY_LABEL)) {
    if (file.includes(`-${key}-`)) return key;
  }
  return 'business';
}

function dateOf(file: string): string {
  const m = file.match(/(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : '';
}

export function GET() {
  const dir = path.join(process.cwd(), 'public/images/gallery');
  let files: string[] = [];
  try {
    files = fs
      .readdirSync(dir)
      .filter((f) => /\.(jpg|png|webp)$/i.test(f))
      .sort();
  } catch {}

  const now = new Date().toISOString();
  const images = files
    .map((f) => {
      const label = CATEGORY_LABEL[categoryOf(f)];
      const d = dateOf(f);
      const caption = `坪倉秀行（株式会社ヴィクトワール代表取締役）${label}${d ? `（${d}）` : ''}`;
      return [
        '    <image:image>',
        `      <image:loc>${SITE}/images/gallery/${f}</image:loc>`,
        `      <image:title>坪倉秀行 ヴィクトワール ${label}</image:title>`,
        `      <image:caption>${caption}</image:caption>`,
        '    </image:image>',
      ].join('\n');
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>${GALLERY_URL}</loc>
    <lastmod>${now}</lastmod>
${images}
  </url>
</urlset>
`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
