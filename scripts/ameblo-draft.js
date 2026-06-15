#!/usr/bin/env node

/**
 * アメブロ 下書き保存モジュール
 * Playwrightでアメブロにログインし、記事を下書き保存する
 *
 * 前提:
 *   - 初回は `node scripts/ameblo-setup.js` で認証情報を保存すること
 *   - 認証情報は logs/ameblo-auth.json に保存される
 */

const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());

const path = require('path');
const fs = require('fs');

const COOKIE_PATH = path.resolve(__dirname, '../logs/ameblo-auth.json');

async function createAmebloDraft(title, content) {
  const amebaId = process.env.AMEBLO_ID;

  if (!amebaId) {
    return { success: false, error: 'AMEBLO_ID not set' };
  }

  if (!fs.existsSync(COOKIE_PATH)) {
    return {
      success: false,
      error: `認証ファイルが見つかりません: ${COOKIE_PATH}\n初回は "node scripts/ameblo-setup.js" を実行してください。`,
    };
  }

  let storageState;
  try {
    storageState = JSON.parse(fs.readFileSync(COOKIE_PATH, 'utf8'));
  } catch (e) {
    return { success: false, error: `認証ファイル読み込みエラー: ${e.message}` };
  }

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      locale: 'ja-JP',
      timezoneId: 'Asia/Tokyo',
      storageState: storageState,
    });
    const page = await context.newPage();
    page.setDefaultTimeout(60000);

    // 1. ブログ投稿ページへ移動（ログインチェック込み）
    console.log('  ameblo: ブログ投稿ページへ移動中...');
    await page.goto('https://blog.ameba.jp/ucs/entry/srventryinsertinput.do');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    const currentUrl = page.url();
    console.log(`  ameblo: URL: ${currentUrl}`);

    // セッション切れチェック
    if (currentUrl.includes('login') || currentUrl.includes('signin') || currentUrl.includes('auth')) {
      await browser.close();
      return {
        success: false,
        error: `セッションが切れています。"node scripts/ameblo-setup.js" で再ログインしてください。\nURL: ${currentUrl}`,
      };
    }

    // 旧エディタにリダイレクトされる場合もある
    console.log('  ameblo: エディタ確認中...');
    await page.screenshot({ path: `/tmp/ameblo-editor-${Date.now()}.png` });

    // 2. タイトル入力
    console.log('  ameblo: タイトル入力中...');
    const titleSelectors = [
      'input[name="title"]',
      '#entryTitle',
      'input[placeholder*="タイトル"]',
      'input[data-testid*="title"]',
    ];

    let titleFilled = false;
    for (const sel of titleSelectors) {
      try {
        const el = page.locator(sel).first();
        if (await el.isVisible({ timeout: 3000 })) {
          await el.fill(title);
          titleFilled = true;
          console.log(`  ameblo: タイトル入力成功 (${sel})`);
          break;
        }
      } catch (e) {
        // 次を試す
      }
    }

    if (!titleFilled) {
      await page.screenshot({ path: '/tmp/ameblo-no-title.png', fullPage: true });
      await browser.close();
      return { success: false, error: 'タイトル入力フィールドが見つかりません' };
    }

    // 3. 本文入力
    console.log('  ameblo: 本文入力中...');

    // HTMLモードに切り替え試み
    const htmlTabSelectors = [
      'button:has-text("HTML")',
      'a:has-text("HTML表示")',
      '[data-action="html"]',
      'button:has-text("テキスト")',
      '.editor-tab-html',
    ];
    for (const sel of htmlTabSelectors) {
      try {
        const el = page.locator(sel).first();
        if (await el.isVisible({ timeout: 2000 })) {
          await el.click();
          await page.waitForTimeout(1000);
          console.log(`  ameblo: HTMLモードに切り替え (${sel})`);
          break;
        }
      } catch (e) {
        // 次を試す
      }
    }

    // テキストエリアへの入力を試みる
    const bodySelectors = [
      'textarea[name="entry_text"]',
      'textarea#editor',
      '.cke_source',
      'textarea.entryBody',
      'textarea[data-testid*="body"]',
    ];

    let bodyFilled = false;
    for (const sel of bodySelectors) {
      try {
        const el = page.locator(sel).first();
        if (await el.isVisible({ timeout: 2000 })) {
          await el.fill(content);
          bodyFilled = true;
          console.log(`  ameblo: 本文入力成功 (${sel})`);
          break;
        }
      } catch (e) {
        // 次を試す
      }
    }

    if (!bodyFilled) {
      // CKEditorのiframeを試す
      const iframes = page.frames();
      for (const frame of iframes) {
        const frameUrl = frame.url();
        if (
          frameUrl.includes('cke') ||
          frameUrl.includes('editor') ||
          frame.name().includes('editor')
        ) {
          try {
            const body = frame.locator('body');
            if (await body.isVisible({ timeout: 2000 })) {
              await body.click();
              await page.evaluate((html) => {
                const iframes = document.querySelectorAll('iframe');
                for (const iframe of iframes) {
                  if (iframe.contentDocument && iframe.contentDocument.body) {
                    iframe.contentDocument.body.innerHTML = html;
                    return;
                  }
                }
              }, content);
              bodyFilled = true;
              console.log('  ameblo: CKEditorに本文入力成功');
              break;
            }
          } catch (e) {
            // 次を試す
          }
        }
      }
    }

    if (!bodyFilled) {
      await page.screenshot({ path: '/tmp/ameblo-no-body.png', fullPage: true });
      console.log('  ameblo: 警告: 本文入力フィールドが見つかりません（下書き保存は試みます）');
    }

    // 4. 下書き保存
    await page.waitForTimeout(1000);
    console.log('  ameblo: 下書き保存中...');

    const draftSelectors = [
      'button:has-text("下書き")',
      'input[value*="下書き"]',
      'a:has-text("下書き保存")',
      'button[data-testid*="draft"]',
      '.draft-save-button',
    ];

    let draftSaved = false;
    for (const sel of draftSelectors) {
      try {
        const el = page.locator(sel).first();
        if (await el.isVisible({ timeout: 3000 })) {
          await el.click();
          draftSaved = true;
          console.log(`  ameblo: 下書き保存ボタンクリック (${sel})`);
          break;
        }
      } catch (e) {
        // 次を試す
      }
    }

    if (!draftSaved) {
      await page.screenshot({ path: '/tmp/ameblo-no-draft-btn.png', fullPage: true });
      await browser.close();
      return { success: false, error: '下書き保存ボタンが見つかりません' };
    }

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // スクリーンショット保存
    const screenshotPath = path.resolve(
      __dirname,
      '..',
      'logs',
      `ameblo-draft-${new Date().toISOString().slice(0, 10)}.png`
    );
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log(`  ameblo: スクリーンショット保存 → ${screenshotPath}`);

    const finalUrl = page.url();
    console.log(`  ameblo: 下書き保存完了 (${finalUrl})`);

    return { success: true, url: finalUrl };
  } catch (e) {
    console.error('  ameblo: エラー:', e.message);
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

  createAmebloDraft(testTitle, testContent).then((result) => {
    console.log('Result:', result);
    process.exit(result.success ? 0 : 1);
  });
}

module.exports = createAmebloDraft;
