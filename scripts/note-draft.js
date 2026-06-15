#!/usr/bin/env node

/**
 * note 下書き保存モジュール
 * Playwrightでnoteにログインし、記事を下書き保存する
 */

const { chromium } = require('playwright');
const { createCanvas } = require('canvas');
const path = require('path');
const fs = require('fs');

// サムネイル画像を生成（白背景・黒文字・タイトル表示）
function generateThumbnail(title) {
  const width = 1280;
  const height = 670;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // 白背景
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // タイトルを描画
  ctx.fillStyle = '#111111';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // フォントサイズを自動調整（長いタイトルは小さく）
  let fontSize = 56;
  if (title.length > 25) fontSize = 48;
  if (title.length > 35) fontSize = 40;
  ctx.font = `bold ${fontSize}px "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif`;

  // テキストを折り返し
  const maxWidth = width - 160;
  const lines = [];
  let currentLine = '';
  for (const char of title) {
    const testLine = currentLine + char;
    if (ctx.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = char;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);

  const lineHeight = fontSize * 1.6;
  const startY = height / 2 - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((line, i) => {
    ctx.fillText(line, width / 2, startY + i * lineHeight);
  });

  // 下部に細いライン + 名前
  ctx.fillStyle = '#999999';
  ctx.font = '20px "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif';
  ctx.fillText('坪倉秀行 / tsubokurahideyuki.com', width / 2, height - 50);

  // 上下にアクセントライン
  ctx.fillStyle = '#dddddd';
  ctx.fillRect(width / 2 - 40, height - 80, 80, 1);

  const filePath = path.resolve(__dirname, '..', 'logs', `note-thumbnail-${Date.now()}.png`);
  fs.writeFileSync(filePath, canvas.toBuffer('image/png'));
  return filePath;
}

async function createNoteDraft(title, content, hashtags) {
  const email = process.env.NOTE_EMAIL;
  const password = process.env.NOTE_PASSWORD;

  if (!email || !password) {
    return { success: false, error: 'NOTE_EMAIL or NOTE_PASSWORD not set' };
  }

  const COOKIE_PATH = path.resolve(__dirname, '..', 'logs', 'note-auth.json');

  let browser;
  try {
    browser = await chromium.launch({ headless: true });

    // Cookie認証を優先、なければ通常ログイン
    const hasCookies = fs.existsSync(COOKIE_PATH);
    const contextOptions = {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };
    if (hasCookies) {
      contextOptions.storageState = COOKIE_PATH;
    }
    const context = await browser.newContext(contextOptions);
    const page = await context.newPage();
    page.setDefaultTimeout(60000);

    console.log('  note: ログイン中...');

    if (hasCookies) {
      // Cookieでログイン確認
      await page.goto('https://note.com/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      const url = page.url();
      if (url.includes('login')) {
        throw new Error('Cookie期限切れ: node scripts/note-setup.js を再実行してください');
      }
      console.log('  note: Cookieログイン成功');
    } else {
      // 通常ログイン
      await page.goto('https://note.com/login?redirectPath=%2F');
      await page.waitForLoadState('networkidle');

      const emailInput = page.locator('#email').first();
      await emailInput.fill(email);

      const passwordInput = page.locator('input[type="password"]').first();
      await passwordInput.fill(password);

      const loginButton = page.locator('button:has-text("ログイン")').first();
      await loginButton.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      const currentUrl = page.url();
      if (currentUrl.includes('login')) {
        throw new Error('ログイン失敗: node scripts/note-setup.js でCookieを取得してください');
      }
      console.log('  note: ログイン成功');

      // 成功したらCookieを保存（次回以降はCookie認証）
      const storageState = await context.storageState();
      fs.writeFileSync(COOKIE_PATH, JSON.stringify(storageState, null, 2));
    }

    // 4. 新規記事作成ページへ移動 → editor.note.com に遷移する
    await page.goto('https://note.com/notes/new');
    await page.waitForTimeout(5000); // SPAのリダイレクト完了を待つ

    const editorUrl = page.url();
    if (!editorUrl.includes('editor.note.com')) {
      throw new Error(`エディタページに遷移できませんでした: ${editorUrl}`);
    }

    // AIダイアログが表示された場合は閉じる
    const closeAiBtn = page.locator('button[aria-label="閉じる"]').first();
    if (await closeAiBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeAiBtn.click();
      await page.waitForTimeout(500);
    }

    // 5. サムネイル画像を生成・アップロード
    try {
      console.log('  note: サムネイル生成中...');
      const thumbnailPath = generateThumbnail(title);
      console.log(`  note: サムネイル → ${thumbnailPath}`);

      // アイキャッチ画像エリアにファイルをドラッグ&ドロップで設定
      const eyecatchArea = page.locator('[data-dragging]').first();
      if (await eyecatchArea.isVisible({ timeout: 3000 }).catch(() => false)) {
        // ファイルをDataTransferでドロップイベントとして送信
        const fileBuffer = fs.readFileSync(thumbnailPath);
        await eyecatchArea.evaluate(async (el, data) => {
          const blob = new Blob([new Uint8Array(data)], { type: 'image/png' });
          const file = new File([blob], 'thumbnail.png', { type: 'image/png' });
          const dt = new DataTransfer();
          dt.items.add(file);

          el.dispatchEvent(new DragEvent('dragenter', { dataTransfer: dt, bubbles: true }));
          el.dispatchEvent(new DragEvent('dragover', { dataTransfer: dt, bubbles: true }));
          el.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true }));
        }, Array.from(fileBuffer));
        await page.waitForTimeout(2000);
        // クロップモーダルが表示されたら「完了」ボタンをクリック
        const cropDoneBtn = page.locator('button:has-text("保存")').last();
        if (await cropDoneBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
          await cropDoneBtn.click();
          await page.waitForTimeout(3000);
        }
        console.log('  note: サムネイルアップロード完了');
      } else {
        console.log('  note: アイキャッチエリアが見つかりません（手動設定してください）');
      }
    } catch (e) {
      console.log(`  note: サムネイル設定スキップ — ${e.message}`);
    }

    // 6. タイトル入力
    console.log('  note: 記事入力中...');
    // タイトルフィールドは textarea[placeholder="記事タイトル"]
    const titleInput = page.locator('textarea[placeholder="記事タイトル"]').first();
    await titleInput.click();
    await titleInput.fill(title);

    // 6. 本文入力 — noteのエディタはProseMirror (contenteditable)
    // HTMLをプレーンテキストに変換してから入力
    const plainContent = content
      .replace(/<h2[^>]*>/gi, '\n\n')
      .replace(/<\/h2>/gi, '\n\n')
      .replace(/<h3[^>]*>/gi, '\n\n')
      .replace(/<\/h3>/gi, '\n\n')
      .replace(/<p[^>]*>/gi, '')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<strong[^>]*>/gi, '')
      .replace(/<\/strong>/gi, '')
      .replace(/<em[^>]*>/gi, '')
      .replace(/<\/em>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    // サイトバナーを本文末尾に追加
    const contentWithBanner = plainContent + '\n\n---\n\n' +
      '坪倉秀行 公式サイト: https://tsubokurahideyuki.com\n' +
      'X: https://x.com/hide_tsubokura\n' +
      'Instagram: https://www.instagram.com/hide_tsubo1981/';

    // ProseMirrorエディタ — クリップボード貼り付けで全文入力
    const bodyEditor = page.locator('.ProseMirror[contenteditable="true"]').first();
    await bodyEditor.click();
    await page.evaluate((text) => {
      const editor = document.querySelector('.ProseMirror[contenteditable="true"]');
      if (editor) {
        editor.focus();
        // DataTransferを使ってペーストイベントを発火
        const dt = new DataTransfer();
        dt.setData('text/plain', text);
        const pasteEvent = new ClipboardEvent('paste', {
          clipboardData: dt,
          bubbles: true,
          cancelable: true,
        });
        editor.dispatchEvent(pasteEvent);
      }
    }, contentWithBanner);
    await page.waitForTimeout(2000);

    // 7. ハッシュタグを入力
    if (hashtags && hashtags.length > 0) {
      try {
        console.log('  note: ハッシュタグ入力中...');
        // noteのハッシュタグ入力欄を探す
        const hashtagInput = page.locator('input[placeholder*="タグ"], input[placeholder*="ハッシュタグ"], [data-testid="hashtag-input"]').first();
        if (await hashtagInput.isVisible({ timeout: 3000 }).catch(() => false)) {
          for (const tag of hashtags) {
            await hashtagInput.fill(tag);
            await page.keyboard.press('Enter');
            await page.waitForTimeout(500);
          }
        } else {
          console.log('  note: ハッシュタグ入力欄が見つかりません（公開時に手動追加してください）');
        }
      } catch (e) {
        console.log(`  note: ハッシュタグ入力スキップ — ${e.message}`);
      }
    }

    // 8. 「下書き保存」ボタンをクリック
    const saveBtn = page.locator('button:has-text("下書き保存")').first();
    if (await saveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await saveBtn.click();
      await page.waitForTimeout(2000);
    } else {
      // 自動保存を待つ
      await page.waitForTimeout(3000);
    }

    // スクリーンショット保存
    const screenshotPath = path.resolve(__dirname, '..', 'logs', `note-draft-${new Date().toISOString().slice(0, 10)}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log(`  note: スクリーンショット保存 → ${screenshotPath}`);

    // URLが変わっていれば下書き保存されている
    const finalUrl = page.url();
    console.log(`  note: 下書き保存完了 (${finalUrl})`);

    return { success: true, url: finalUrl };
  } catch (e) {
    // デバッグ用スクリーンショット
    try {
      if (browser) {
        const pages = browser.contexts()[0]?.pages() || [];
        if (pages[0]) {
          const errPath = path.resolve(__dirname, '..', 'logs', `note-error-${Date.now()}.png`);
          await pages[0].screenshot({ path: errPath });
          console.log(`  note: エラースクリーンショット → ${errPath}`);
        }
      }
    } catch (_) {}
    return { success: false, error: e.message };
  } finally {
    if (browser) await browser.close();
  }
}

// テスト実行用
if (require.main === module) {
  require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
  if (!process.env.ANTHROPIC_API_KEY) {
    require('dotenv').config({ path: '/Users/akitoshi/Projects/note-automation/.env' });
  }

  const testTitle = '【テスト】坪倉秀行のテスト記事';
  const testContent = '<h2>テスト見出し</h2><p>これはテスト記事です。坪倉秀行が書いています。</p>';
  const testHashtags = ['坪倉秀行', '岡山', 'テスト'];

  createNoteDraft(testTitle, testContent, testHashtags).then((result) => {
    console.log('Result:', result);
    process.exit(result.success ? 0 : 1);
  });
}

module.exports = createNoteDraft;
