#!/usr/bin/env node

/**
 * note 認証セットアップ（初回 or reCAPTCHA発生時に実行）
 *
 * 使い方:
 *   node scripts/note-setup.js
 *
 * ブラウザが開きます。noteにログインしてください。
 * ログイン完了後、このターミナルでEnterを押すとCookieが保存されます。
 *
 * 保存先: logs/note-auth.json
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

const COOKIE_PATH = path.resolve(__dirname, '../logs/note-auth.json');

async function setup() {
  console.log('');
  console.log('=== note認証セットアップ ===');
  console.log('');
  console.log('ブラウザが開きます。noteにログインしてください。');
  console.log('ログイン完了後、このターミナルに戻ってEnterを押してください。');
  console.log('');

  const browser = await chromium.launch({
    headless: false,
    args: ['--window-size=1280,800'],
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'ja-JP',
    viewport: { width: 1280, height: 800 },
  });

  const page = await context.newPage();
  await page.goto('https://note.com/login');
  await page.waitForLoadState('domcontentloaded');

  // メール自動入力
  const email = process.env.NOTE_EMAIL;
  if (email) {
    try {
      await page.waitForSelector('#email', { timeout: 5000 });
      await page.fill('#email', email);
      console.log(`メールアドレス "${email}" を自動入力しました。`);
      console.log('パスワードを入力してログインしてください。');
    } catch (e) {
      console.log('メール自動入力をスキップ（手動で入力してください）');
    }
  }

  console.log('');
  console.log('ブラウザでログインが完了したら、Enterキーを押してください...');

  await new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false });
    rl.once('line', () => { rl.close(); resolve(); });
    process.stdin.once('end', resolve);
  });

  const storageState = await context.storageState();
  fs.mkdirSync(path.dirname(COOKIE_PATH), { recursive: true });
  fs.writeFileSync(COOKIE_PATH, JSON.stringify(storageState, null, 2));

  console.log('');
  console.log('✓ 認証情報を保存しました:', COOKIE_PATH);
  console.log('  Cookie数:', storageState.cookies.length);
  console.log('');
  console.log('次回から note-draft.js がCookieログインを使用します。');

  await browser.close();
}

setup().catch((e) => {
  console.error('エラー:', e.message);
  process.exit(1);
});
