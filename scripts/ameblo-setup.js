#!/usr/bin/env node

/**
 * アメブロ 認証セットアップ（初回のみ実行）
 *
 * 使い方:
 *   node scripts/ameblo-setup.js
 *
 * ブラウザが開きます。アメブロにログインしてください。
 * ログイン完了後、このターミナルでEnterを押すとCookieが保存されます。
 *
 * 保存先: logs/ameblo-auth.json
 * 有効期限: 通常数週間〜数ヶ月（期限切れ時は再実行）
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

const COOKIE_PATH = path.resolve(__dirname, '../logs/ameblo-auth.json');

async function setup() {
  console.log('');
  console.log('=== アメブロ認証セットアップ ===');
  console.log('');
  console.log('ブラウザが開きます。以下の手順でログインしてください:');
  console.log('  1. アメーバIDまたはメールアドレスを入力');
  console.log('  2. パスワードを入力');
  console.log('  3. reCAPTCHAが表示された場合はチェックを入れる');
  console.log('  4. ログインボタンをクリック');
  console.log('  5. ログイン完了後、このターミナルに戻ってEnterを押す');
  console.log('');

  const browser = await chromium.launch({
    headless: false,
    args: ['--window-size=1280,800', '--no-sandbox'],
  });

  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'ja-JP',
    timezoneId: 'Asia/Tokyo',
    viewport: { width: 1280, height: 800 },
  });

  const page = await context.newPage();

  // ログインページを開く
  await page.goto('https://www.ameba.jp/auth/login');
  await page.waitForLoadState('domcontentloaded');

  // .envのIDを自動入力（パスワードは手動入力）
  const amebaId = process.env.AMEBLO_ID;
  if (amebaId) {
    try {
      await page.waitForSelector('#accountId', { timeout: 5000 });
      await page.fill('#accountId', amebaId);
      console.log(`アメーバID "${amebaId}" を自動入力しました。`);
      console.log('パスワードを入力してログインしてください。');
    } catch (e) {
      console.log('ID自動入力をスキップ（手動で入力してください）');
    }
  }

  console.log('');
  console.log('ブラウザでログインが完了したら、Enterキーを押してください...');

  // ユーザー入力を待つ
  await new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false,
    });
    rl.once('line', () => {
      rl.close();
      resolve();
    });
    // stdin が閉じられた場合もresolve
    process.stdin.once('end', resolve);
  });

  // 現在のURLとログイン状態を確認
  const currentUrl = page.url();
  console.log('');
  console.log('現在のURL:', currentUrl);

  const isLoggedIn =
    !currentUrl.includes('signin') &&
    !currentUrl.includes('/login') &&
    !currentUrl.includes('auth.user');

  if (!isLoggedIn) {
    console.log('');
    console.log('⚠ まだログインページにいる可能性があります。');
    console.log('  ログイン後に再度Enterを押してください。');
    console.log('  または Ctrl+C で終了して再試行してください。');
  }

  // Cookieを保存
  const storageState = await context.storageState();
  fs.mkdirSync(path.dirname(COOKIE_PATH), { recursive: true });
  fs.writeFileSync(COOKIE_PATH, JSON.stringify(storageState, null, 2));

  console.log('');
  console.log('✓ 認証情報を保存しました:', COOKIE_PATH);
  console.log('  Cookie数:', storageState.cookies.length);
  console.log('');
  console.log('次回から node scripts/ameblo-draft.js が使用できます。');

  await browser.close();
}

setup().catch((e) => {
  console.error('エラー:', e.message);
  process.exit(1);
});
