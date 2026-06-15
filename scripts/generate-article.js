#!/usr/bin/env node

/**
 * 坪倉秀行ブログ記事 自動生成・投稿スクリプト
 *
 * Claude APIで記事を生成し、microCMSに投稿後、
 * Cloudflare Pagesの再ビルドをトリガーする。
 *
 * Usage: node scripts/generate-article.js
 * Env: ANTHROPIC_API_KEY, MICROCMS_SERVICE_DOMAIN, MICROCMS_API_KEY
 */

const https = require('https');
const fs = require('fs');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

// Also load note-automation .env for ANTHROPIC_API_KEY
if (!process.env.ANTHROPIC_API_KEY) {
  require('dotenv').config({ path: '/Users/akitoshi/Projects/note-automation/.env' });
}

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MICROCMS_SERVICE_DOMAIN = process.env.MICROCMS_SERVICE_DOMAIN;
const MICROCMS_API_KEY = process.env.MICROCMS_API_KEY;

if (!ANTHROPIC_API_KEY || !MICROCMS_SERVICE_DOMAIN || !MICROCMS_API_KEY) {
  console.error('Missing required environment variables');
  process.exit(1);
}

// 記事のジャンル（ローテーション）
const GENRES = [
  {
    category: '経営・ビジネス',
    topics: [
      '経営者として大切にしている3つのこと',
      '異業種を複数展開する理由と戦略',
      '20代で起業して学んだこと',
      '地方で事業を成功させるために必要なこと',
      'スタッフとの向き合い方——僕が大切にしているマネジメント',
      '失敗から学んだ最大の教訓',
      '岡山で起業するメリットとチャンス',
      '事業の多角化で見えてきた景色',
      '経営者の孤独とその乗り越え方',
      '利益よりも大切にしていること',
    ],
  },
  {
    category: '事業紹介',
    topics: [
      'にこ家のこだわり——なぜ「定食酒場」なのか',
      'DD SAUNAが目指す"究極のととのい"',
      'Labradoriteが大切にしている美容へのこだわり',
      'AROMA TRUFFLEと福岡進出の舞台裏',
      'にこ家の人気メニューとその誕生秘話',
      'DD SAUNAの各部屋の魅力を語る',
      'なぜ美容事業を始めたのか',
      'ヴィクトワールグループの未来構想',
      '飲食×美容×サウナ、シナジーの正体',
      '各事業で最も嬉しかったお客様の声',
    ],
  },
  {
    category: '地域・岡山',
    topics: [
      '僕が岡山を選んだ理由',
      '岡山の食文化がすごい——地元の魅力を再発見',
      '岡山のビジネス環境と可能性',
      '地方創生に本気で取り組む理由',
      '岡山のおすすめスポット——経営者目線で選ぶ5選',
      '岡山と福岡、二つの都市で事業を展開して感じること',
      '地方から全国へ——岡山発ブランドの可能性',
      '岡山の若者に伝えたいこと',
      '地元に根ざすということ',
      '岡山の四季と事業のリズム',
    ],
  },
  {
    category: 'ライフスタイル',
    topics: [
      '僕の一日のルーティン',
      '経営者のストレス解消法——サウナのすすめ',
      '読んでよかった本3選',
      '仕事とプライベートのバランス',
      '食へのこだわりが事業に生きている話',
      '健康管理と経営パフォーマンスの関係',
      '僕が影響を受けた人物',
      '30代をどう生きるか',
      '朝の時間の使い方',
      'オフの日の過ごし方',
    ],
  },
];

// 既存記事のタイトルを取得
async function getExistingTitles() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: `${MICROCMS_SERVICE_DOMAIN}.microcms.io`,
      path: '/api/v1/blogs?fields=title&limit=100',
      headers: { 'X-MICROCMS-API-KEY': MICROCMS_API_KEY },
    };
    https.get(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        const result = JSON.parse(data);
        resolve(result.contents.map((c) => c.title));
      });
    }).on('error', reject);
  });
}

// ジャンルとトピックをランダム選択（既存記事と被らないように）
function selectTopic(existingTitles) {
  const genre = GENRES[Math.floor(Math.random() * GENRES.length)];
  const availableTopics = genre.topics.filter(
    (t) => !existingTitles.some((existing) => existing.includes(t.slice(0, 10)))
  );
  const topics = availableTopics.length > 0 ? availableTopics : genre.topics;
  const topic = topics[Math.floor(Math.random() * topics.length)];
  return { category: genre.category, topic };
}

// Claude APIで記事生成
async function generateArticle(topic, category) {
  const prompt = `あなたは株式会社ヴィクトワール代表取締役の坪倉秀行として、ブログ記事を執筆してください。

## 坪倉秀行のプロフィール
- 岡山を拠点に事業を展開する経営者
- 運営事業：定食酒場にこ家（岡山）、Labradorite（美容サロン/大阪・岡山）、DD SAUNA（プライベートラグジュアリーサウナ/岡山）、AROMA TRUFFLE（トリュフグルメブランド/福岡）
- 株式会社ヴィクトワール代表取締役
- 一人称は「僕」
- 地域に根ざした事業を大切にしている
- 飲食・美容・ウェルネスの3領域で多角展開

## 記事のテーマ
カテゴリ: ${category}
テーマ: ${topic}

## 執筆ルール
- 坪倉秀行本人が書いている一人称「僕」のトーンで
- 自然体で親しみやすく、でも経営者としての知見が感じられる文章
- 1500〜2500文字程度
- 「坪倉秀行」というフルネームを記事中に2〜3回自然に入れる（SEO対策）
- HTML形式で出力（<h2>, <p>, <strong> 等を使用）
- <h1>は不要（タイトルは別途設定する）
- 具体的なエピソードや数字を交えて説得力を持たせる
- 最後に読者への呼びかけやメッセージで締める
- 絵文字は絶対に使用しないこと（文字化けの原因になるため）

## 出力形式
以下のJSON形式で出力してください。他のテキストは一切含めないでください。

{
  "title": "記事タイトル（30文字以内、坪倉秀行を含める）",
  "content": "<h2>見出し1</h2><p>本文...</p>..."
}`;

  const body = JSON.stringify({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            if (result.error) {
              reject(new Error(result.error.message));
              return;
            }
            const text = result.content[0].text;
            // Extract JSON from response
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
              reject(new Error('Failed to extract JSON from response'));
              return;
            }
            resolve(JSON.parse(jsonMatch[0]));
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// microCMSに記事を投稿
async function postToMicroCMS(article) {
  const body = JSON.stringify({
    title: article.title,
    content: article.content,
  });

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: `${MICROCMS_SERVICE_DOMAIN}.microcms.io`,
        path: '/api/v1/blogs',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-MICROCMS-API-KEY': MICROCMS_API_KEY,
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(JSON.parse(data));
          } else {
            reject(new Error(`microCMS API error: ${res.statusCode} ${data}`));
          }
        });
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// プラットフォーム別にリライト
async function rewriteForPlatform(article, platform) {
  const styleGuide = platform === 'note'
    ? 'です/ます調ベースのカジュアルなエッセイ調。noteの読者に合った親しみやすい書き方。見出しの言い回しも変える。'
    : 'だ/である調と話し言葉のミックス。段落を短く、テンポよく。アメブロの読者に合った読みやすい書き方。見出しの言い回しも変える。';

  const prompt = `以下のブログ記事を${platform}向けにリライトしてください。

## リライトルール
- ${styleGuide}
- 内容の趣旨は維持しつつ、文体・表現・見出しを大きく変える
- 機械的な言い換えではなく、別の人が同じテーマで書いたかのように
- 「坪倉秀行」のフルネームは2〜3回含める（SEO）
- 絵文字は絶対に使用しないこと（文字化けの原因になるため）
- HTML形式で出力（<h2>, <p>, <strong> 等を使用、<h1>は不要）

## 元記事
タイトル: ${article.title}
本文:
${article.content}

## 出力形式
以下のJSON形式で出力。他のテキストは含めないでください。

{
  "title": "リライト後のタイトル（30文字以内）",
  "content": "<h2>見出し</h2><p>本文...</p>...",
  "hashtags": ["坪倉秀行", "岡山", "起業", "経営者", "ヴィクトワール"]
}

hashtagsは記事内容に合った5〜8個のハッシュタグ。必ず「坪倉秀行」を含める。`;

  const body = JSON.stringify({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            if (result.error) {
              reject(new Error(result.error.message));
              return;
            }
            const text = result.content[0].text;
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
              reject(new Error('Failed to extract JSON from rewrite response'));
              return;
            }
            resolve(JSON.parse(jsonMatch[0]));
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// Cloudflare Pages再ビルドをトリガー（空コミットpush）
async function triggerRebuild() {
  const { execSync } = require('child_process');
  const cwd = require('path').resolve(__dirname, '..');
  try {
    execSync(
      'git commit --allow-empty -m "chore: auto-rebuild for new blog post" && git push origin main',
      { cwd, stdio: 'pipe' }
    );
    console.log('Cloudflare Pages rebuild triggered');
  } catch (e) {
    console.warn('Failed to trigger rebuild via git push:', e.message);
  }
}

// メイン処理
async function main() {
  console.log('=== 坪倉秀行ブログ 自動記事生成 ===');
  console.log(`日時: ${new Date().toLocaleString('ja-JP')}`);

  // 1. 既存記事を確認
  const existingTitles = await getExistingTitles();
  console.log(`既存記事数: ${existingTitles.length}`);

  // 2. トピック選択
  const { category, topic } = selectTopic(existingTitles);
  console.log(`カテゴリ: ${category}`);
  console.log(`テーマ: ${topic}`);

  // 3. 記事生成
  console.log('記事を生成中...');
  const article = await generateArticle(topic, category);
  console.log(`タイトル: ${article.title}`);
  console.log(`本文: ${article.content.length}文字`);

  // 4. microCMSに投稿
  console.log('microCMSに投稿中...');
  const result = await postToMicroCMS(article);
  console.log(`投稿完了: ID=${result.id}`);

  // 5. note・アメブロに下書き同期
  console.log('\n--- 下書き同期 ---');

  // note: 自動で下書き保存
  try {
    console.log('note用にリライト中...');
    const noteArticle = await rewriteForPlatform(article, 'note');
    console.log(`  note版タイトル: ${noteArticle.title}`);

    const createNoteDraft = require('./note-draft');
    const noteResult = await createNoteDraft(noteArticle.title, noteArticle.content, noteArticle.hashtags);
    if (noteResult.success) {
      console.log(`  note: 下書き保存成功 ✓`);
    } else {
      console.warn(`  note: 下書き保存失敗 — ${noteResult.error}`);
    }
  } catch (e) {
    console.warn(`  note: エラー — ${e.message}`);
  }

  // アメブロ: リライトしてファイル出力（手動コピペ用）
  try {
    console.log('アメブロ用にリライト中...');
    const amebloArticle = await rewriteForPlatform(article, 'ameblo');
    console.log(`  ameblo版タイトル: ${amebloArticle.title}`);

    const dateStr = new Date().toISOString().slice(0, 10);
    const outputPath = require('path').resolve(__dirname, '..', 'logs', `ameblo-post-${dateStr}.html`);
    const hashtagsHtml = (amebloArticle.hashtags || []).map(t => `#${t}`).join(' ');
    const bannerHtml = `<hr><p><strong>坪倉秀行 公式サイト</strong>: <a href="https://tsubokurahideyuki.com">https://tsubokurahideyuki.com</a><br>X: <a href="https://x.com/hide_tsubokura">@hide_tsubokura</a> / Instagram: <a href="https://www.instagram.com/hide_tsubo1981/">@hide_tsubo1981</a></p>`;
    const outputContent = `<!--
アメブロ投稿用（手動コピペ）
タイトル: ${amebloArticle.title}
ハッシュタグ: ${hashtagsHtml}
日時: ${new Date().toLocaleString('ja-JP')}
-->

<!-- ===== タイトル（コピー） ===== -->
${amebloArticle.title}

<!-- ===== 本文HTML（コピー） ===== -->
${amebloArticle.content}
${bannerHtml}

<!-- ===== ハッシュタグ（コピー） ===== -->
${hashtagsHtml}
`;
    fs.writeFileSync(outputPath, outputContent, 'utf-8');
    console.log(`  ameblo: 投稿用ファイル出力 → ${outputPath}`);
    console.log(`  ameblo: アメブロ管理画面で手動投稿してください`);
  } catch (e) {
    console.warn(`  ameblo: エラー — ${e.message}`);
  }

  console.log('--- 下書き同期完了 ---\n');

  // 6. 再ビルドトリガー
  await triggerRebuild();

  console.log('=== 完了 ===');
}

main().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});
