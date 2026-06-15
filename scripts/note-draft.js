#!/usr/bin/env node

/**
 * note 下書き保存モジュール
 * Playwrightでnoteにログインし、記事を下書き保存する
 */

const { chromium } = require('playwright');
const path = require('path');

async function createNoteDraft(title, content, hashtags) {
  const email = process.env.NOTE_EMAIL;
  const password = process.env.NOTE_PASSWORD;

  if (!email || !password) {
    return { success: false, error: 'NOTE_EMAIL or NOTE_PASSWORD not set' };
  }

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();
    page.setDefaultTimeout(60000);

    // 1. ログインページへ移動
    console.log('  note: ログイン中...');
    await page.goto('https://note.com/login?redirectPath=%2F');
    await page.waitForLoadState('networkidle');

    // 2. メール・パスワードを入力（最初からフォームが表示されている）
    const emailInput = page.locator('#email').first();
    await emailInput.fill(email);

    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill(password);

    // 3. ログインボタンをクリック
    const loginButton = page.locator('button:has-text("ログイン")').first();
    await loginButton.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // ログイン成功確認
    const currentUrl = page.url();
    if (currentUrl.includes('login')) {
      throw new Error('ログイン失敗: ログインページのまま');
    }
    console.log('  note: ログイン成功');

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

    // 5. タイトル入力
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
