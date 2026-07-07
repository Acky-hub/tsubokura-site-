const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const OUTPUT_DIR = path.join(__dirname, '../public/images');
const WIDTH = 1200;
const HEIGHT = 630;

function escapeXml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

const OGP_PAGES = [
  {
    filename: 'ogp-about.jpg',
    title: '坪倉秀行 プロフィール',
    sub: '株式会社ヴィクトワール代表取締役',
    bg: '#1a2744',
    text: '#FFFFFF',
    accent: '#C9A84C',
  },
  {
    filename: 'ogp-gallery.jpg',
    title: '坪倉秀行 ギャラリー',
    sub: '経営哲学・事業紹介',
    bg: '#1a1a1a',
    text: '#FFFFFF',
    accent: '#C9A84C',
  },
  {
    filename: 'ogp-contact.jpg',
    title: '坪倉秀行 お問い合わせ',
    sub: '株式会社ヴィクトワール',
    bg: '#F5F0E8',
    text: '#2C1810',
    accent: '#8B6914',
  },
];

async function generateOgpImage(page) {
  const svg = `
  <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${WIDTH}" height="${HEIGHT}" fill="${page.bg}"/>
    <!-- 装飾ライン -->
    <rect x="50" y="50" width="${WIDTH - 100}" height="2" fill="${page.accent}" opacity="0.4"/>
    <rect x="50" y="${HEIGHT - 52}" width="${WIDTH - 100}" height="2" fill="${page.accent}" opacity="0.4"/>
    <!-- 左アクセントバー -->
    <rect x="80" y="200" width="6" height="140" rx="3" fill="${page.accent}"/>
    <!-- サブタイトル -->
    <text x="110" y="240" font-family="Hiragino Sans, Noto Sans JP, sans-serif" font-size="26" font-weight="600" fill="${page.accent}">${escapeXml(page.sub)}</text>
    <!-- メインタイトル -->
    <text x="110" y="320" font-family="Hiragino Mincho ProN, Noto Serif JP, serif" font-size="64" font-weight="700" fill="${page.text}">${escapeXml(page.title)}</text>
    <!-- ドメイン -->
    <text x="${WIDTH / 2}" y="${HEIGHT - 80}" font-family="Hiragino Sans, Noto Sans JP, sans-serif" font-size="20" fill="${page.accent}" text-anchor="middle" opacity="0.7">tsubokurahideyuki.com</text>
  </svg>`;

  const outputPath = path.join(OUTPUT_DIR, page.filename);
  await sharp(Buffer.from(svg)).jpeg({ quality: 95 }).toFile(outputPath);
  console.log(`生成完了: ${page.filename}`);
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  for (const page of OGP_PAGES) {
    await generateOgpImage(page);
  }

  console.log(`\n完了: ${OGP_PAGES.length}枚のOGP画像を生成 → ${OUTPUT_DIR}`);
}

main().catch(console.error);
