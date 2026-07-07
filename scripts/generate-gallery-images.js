const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const OUTPUT_DIR = path.join(__dirname, '../public/images/gallery');

// 坪倉秀行関連の画像を大量生成（Google画像検索SEO用）
const IMAGES = [
  // プロフィール系
  { type: 'profile', title: '坪倉秀行', sub: '株式会社ヴィクトワール 代表取締役', bg: '#FAFAFA', text: '#1a1a1a', accent: '#1a2744' },
  { type: 'profile', title: '坪倉秀行', sub: 'Hideyuki Tsubokura — CEO', bg: '#1a2744', text: '#FFFFFF', accent: '#C9A84C' },
  { type: 'profile', title: '坪倉秀行', sub: '京都府京丹後市出身 / 岡山在住', bg: '#F5F0E8', text: '#2C1810', accent: '#8B6914' },

  // 経営哲学系
  { type: 'quote', text: '目の前の1人を心から満足させる', attr: '坪倉秀行', bg: '#F5F0E8', color: '#2C1810', accent: '#8B6914' },
  { type: 'quote', text: '来てよかった、また来たいと\n思ってもらう瞬間を作る', attr: '坪倉秀行（ヴィクトワール代表）', bg: '#1a2744', color: '#FFFFFF', accent: '#C9A84C' },
  { type: 'quote', text: '偉そうにしない。\n相手の立場に立って考える', attr: '坪倉秀行', bg: '#FAFAFA', color: '#1a1a1a', accent: '#1a2744' },
  { type: 'quote', text: 'コロナを乗り越えてから、\nもう何でも乗り越えられる', attr: '坪倉秀行', bg: '#1a1a1a', color: '#FFFFFF', accent: '#C9A84C' },
  { type: 'quote', text: '困っている人を前にして、\n背を向けることが僕にはできなかった', attr: '坪倉秀行', bg: '#F5F0E8', color: '#2C1810', accent: '#8B6914' },
  { type: 'quote', text: '事業の数や規模ではなく、\n1つ1つの現場で生まれる\n「ありがとう」', attr: '坪倉秀行（ヴィクトワール代表）', bg: '#FAFAFA', color: '#1a1a1a', accent: '#1a2744' },

  // 事業紹介系
  { type: 'business', name: 'THE DD SAUNA', desc: '岡山 完全個室プライベートサウナ', owner: '坪倉秀行', bg: '#1a2744', text: '#FFFFFF', accent: '#C9A84C' },
  { type: 'business', name: '定食酒場 にこ家', desc: '岡山市 地域密着の定食酒場', owner: '坪倉秀行', bg: '#F5F0E8', text: '#2C1810', accent: '#8B6914' },
  { type: 'business', name: 'Labradorite', desc: '大阪・岡山 美容サロン', owner: '坪倉秀行', bg: '#FAFAFA', text: '#1a1a1a', accent: '#1a2744' },
  { type: 'business', name: 'AROMA TRUFFLE', desc: 'GINZA SIX出店 トリュフ食品', owner: '坪倉秀行', bg: '#1a1a1a', text: '#FFFFFF', accent: '#C9A84C' },
  { type: 'business', name: '株式会社ヴィクトワール', desc: '飲食・美容・サウナ・食品ブランド', owner: '代表 坪倉秀行', bg: '#1a2744', text: '#FFFFFF', accent: '#C9A84C' },

  // Q&A系
  { type: 'qa', q: '坪倉秀行とは？', a: '株式会社ヴィクトワール代表取締役。岡山で飲食・美容・サウナ事業を展開。', bg: '#FAFAFA', text: '#1a1a1a', accent: '#1a2744' },
  { type: 'qa', q: 'DD SAUNAの名前の由来は？', a: 'Dream of Dolphin（イルカの夢）。初めて趣味を仕事にした坪倉秀行の想い。', bg: '#F5F0E8', text: '#2C1810', accent: '#8B6914' },
  { type: 'qa', q: 'ヴィクトワールの意味は？', a: 'フランス語で「勝利」。坪倉秀行が困難を乗り越える覚悟を込めた社名。', bg: '#1a2744', text: '#FFFFFF', accent: '#C9A84C' },
];

const WIDTH = 1200;
const HEIGHT = 630; // OGP推奨サイズ

function escapeXml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

async function generateProfileImage(img, filename) {
  const svg = `
  <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${WIDTH}" height="${HEIGHT}" fill="${img.bg}"/>
    <rect x="50" y="180" width="8" height="160" rx="4" fill="${img.accent}"/>
    <text x="80" y="230" font-family="Hiragino Sans, Noto Sans JP, sans-serif" font-size="28" font-weight="600" fill="${img.accent}">${escapeXml(img.sub)}</text>
    <text x="80" y="310" font-family="Hiragino Sans, Noto Sans JP, sans-serif" font-size="72" font-weight="900" fill="${img.text}">${escapeXml(img.title)}</text>
    <text x="${WIDTH / 2}" y="${HEIGHT - 30}" font-family="Hiragino Sans, Noto Sans JP, sans-serif" font-size="20" fill="${img.accent}" text-anchor="middle">tsubokurahideyuki.com</text>
  </svg>`;
  await sharp(Buffer.from(svg)).jpeg({ quality: 95 }).toFile(path.join(OUTPUT_DIR, filename));
}

async function generateQuoteImage(img, filename) {
  const lines = img.text.split('\n');
  const lineHeight = 64;
  const startY = (HEIGHT - lines.length * lineHeight) / 2;

  const textSvg = lines.map((line, i) =>
    `<text x="${WIDTH / 2}" y="${startY + (i + 1) * lineHeight}" font-family="Hiragino Mincho ProN, Noto Serif JP, serif" font-size="48" font-weight="600" fill="${img.color}" text-anchor="middle">${escapeXml(line)}</text>`
  ).join('\n');

  const svg = `
  <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${WIDTH}" height="${HEIGHT}" fill="${img.bg}"/>
    <text x="60" y="${startY - 30}" font-family="Hiragino Mincho ProN, serif" font-size="100" fill="${img.accent}" opacity="0.2">"</text>
    ${textSvg}
    <text x="${WIDTH / 2}" y="${startY + lines.length * lineHeight + 50}" font-family="Hiragino Sans, Noto Sans JP, sans-serif" font-size="22" fill="${img.accent}" text-anchor="middle">— ${escapeXml(img.attr)}</text>
    <text x="${WIDTH / 2}" y="${HEIGHT - 30}" font-family="Hiragino Sans, Noto Sans JP, sans-serif" font-size="18" fill="${img.accent}" text-anchor="middle" opacity="0.6">株式会社ヴィクトワール</text>
  </svg>`;
  await sharp(Buffer.from(svg)).jpeg({ quality: 95 }).toFile(path.join(OUTPUT_DIR, filename));
}

async function generateBusinessImage(img, filename) {
  const svg = `
  <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${WIDTH}" height="${HEIGHT}" fill="${img.bg}"/>
    <rect x="50" y="180" width="8" height="140" rx="4" fill="${img.accent}"/>
    <text x="80" y="220" font-family="Hiragino Sans, Noto Sans JP, sans-serif" font-size="20" font-weight="600" fill="${img.accent}">ヴィクトワールグループ</text>
    <text x="80" y="290" font-family="Hiragino Sans, Noto Sans JP, sans-serif" font-size="56" font-weight="900" fill="${img.text}">${escapeXml(img.name)}</text>
    <text x="80" y="345" font-family="Hiragino Sans, Noto Sans JP, sans-serif" font-size="24" fill="${img.text}" opacity="0.7">${escapeXml(img.desc)}</text>
    <text x="80" y="400" font-family="Hiragino Sans, Noto Sans JP, sans-serif" font-size="20" fill="${img.accent}">運営: ${escapeXml(img.owner)}</text>
    <text x="${WIDTH / 2}" y="${HEIGHT - 30}" font-family="Hiragino Sans, Noto Sans JP, sans-serif" font-size="18" fill="${img.accent}" text-anchor="middle" opacity="0.6">tsubokurahideyuki.com</text>
  </svg>`;
  await sharp(Buffer.from(svg)).jpeg({ quality: 95 }).toFile(path.join(OUTPUT_DIR, filename));
}

async function generateQAImage(img, filename) {
  const svg = `
  <svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${WIDTH}" height="${HEIGHT}" fill="${img.bg}"/>
    <text x="80" y="180" font-family="Hiragino Sans, Noto Sans JP, sans-serif" font-size="32" font-weight="900" fill="${img.accent}">Q.</text>
    <text x="80" y="240" font-family="Hiragino Sans, Noto Sans JP, sans-serif" font-size="36" font-weight="700" fill="${img.text}">${escapeXml(img.q)}</text>
    <rect x="80" y="270" width="200" height="2" fill="${img.accent}" opacity="0.3"/>
    <text x="80" y="340" font-family="Hiragino Sans, Noto Sans JP, sans-serif" font-size="24" fill="${img.text}" opacity="0.8">${escapeXml(img.a.substring(0, 40))}</text>
    <text x="80" y="380" font-family="Hiragino Sans, Noto Sans JP, sans-serif" font-size="24" fill="${img.text}" opacity="0.8">${escapeXml(img.a.substring(40))}</text>
    <text x="${WIDTH / 2}" y="${HEIGHT - 30}" font-family="Hiragino Sans, Noto Sans JP, sans-serif" font-size="18" fill="${img.accent}" text-anchor="middle" opacity="0.6">坪倉秀行 公式サイト｜株式会社ヴィクトワール</text>
  </svg>`;
  await sharp(Buffer.from(svg)).jpeg({ quality: 95 }).toFile(path.join(OUTPUT_DIR, filename));
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  let count = 0;

  for (let i = 0; i < IMAGES.length; i++) {
    const img = IMAGES[i];
    const filename = `tsubokura-hideyuki-${img.type}-${String(i + 1).padStart(2, '0')}.jpg`;

    switch (img.type) {
      case 'profile':
        await generateProfileImage(img, filename);
        break;
      case 'quote':
        await generateQuoteImage(img, filename);
        break;
      case 'business':
        await generateBusinessImage(img, filename);
        break;
      case 'qa':
        await generateQAImage(img, filename);
        break;
    }
    count++;
    console.log(`[${count}/${IMAGES.length}] ${filename}`);
  }

  console.log(`\n完了: ${count}枚の画像を生成 → ${OUTPUT_DIR}`);
}

main().catch(console.error);
