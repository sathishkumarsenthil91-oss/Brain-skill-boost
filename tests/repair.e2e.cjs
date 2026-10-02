/* Run against a local Vite server with two disposable authenticated test accounts.
 * TEST_EMAIL_A, TEST_EMAIL_B, TEST_PASSWORD are required; this does not touch other accounts.
 */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const url = process.env.TEST_URL || 'http://localhost:3000';
const emails = [process.env.TEST_EMAIL_A, process.env.TEST_EMAIL_B];
const password = process.env.TEST_PASSWORD;
if (emails.some(e => !e) || !password) throw new Error('Provide two disposable test accounts in TEST_EMAIL_A/B and TEST_PASSWORD.');
const report = [];
const pass = (test, details = {}) => { const result = { test, status: 'PASS', ...details }; report.push(result); console.log(JSON.stringify(result)); };

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const contexts = await Promise.all(emails.map(() => browser.newContext()));
    const pages = await Promise.all(contexts.map(c => c.newPage()));
    const errors = [];
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(url + '/#auth');
      await page.getByPlaceholder('student@university.edu').fill(emails[i]);
      await page.locator('input[type=password]').fill(password);
      await page.getByRole('button', { name: 'Sign In arrow_forward', exact: true }).click();
      await page.waitForFunction(() => document.body.innerText.includes('Explore All 14 Platform Modules'), { timeout: 25000 });
      await page.getByRole('button', { name: 'hub Connectivity', exact: true }).click();
      await page.getByRole('heading', { name: /Connectivity.*live/i }).waitFor();
      const setup = page.getByRole('button', { name: /Complete Setup & Enter Network/ });
      if (await setup.isVisible()) {
        await page.getByPlaceholder('@username').fill('@repair_oct1_' + (i ? 'b' : 'a'));
        await page.getByPlaceholder('Tell others what you are learning and building...').fill('Disposable integration verification profile.');
        await setup.click();
        await setup.waitFor({ state: 'hidden', timeout: 15000 });
      }
      const profile = await page.evaluate(async () => {
        const { supabase } = await import('/src/supabaseClient.js');
        const { data: { session } } = await supabase.auth.getSession();
        const { data, error } = await supabase.from('profiles').select('id,username,skills,interests,connectivity_setup_completed').eq('id', session.user.id).single();
        if (error) throw error;
        return data;
      });
      assert.equal(profile.connectivity_setup_completed, true);
      assert.ok(profile.username.startsWith('repair_oct1_'));
      assert.ok(profile.skills.length > 0 && profile.interests.length > 0);
      await page.reload();
      await page.getByRole('heading', { name: /Connectivity.*live/i }).waitFor();
      assert.equal(await page.getByRole('button', { name: /Complete Setup & Enter Network/ }).count(), 0);
      pass('profile saves under authenticated UUID and survives reload', { account: i + 1 });
    }

    // Receive via the actual service subscription while the other isolated browser sends.
    await pages[1].evaluate(async () => {
      const { connectivityService } = await import('/src/services/supabaseService.ts');
      window.__receivedRepairMessages = [];
      window.__stopRepairMessages = connectivityService.subscribeToRealtimeChat(
        JSON.parse(localStorage.getItem('industryskill_auth_user')),
        msg => window.__receivedRepairMessages.push(msg));
    });
    await pages[1].waitForFunction(async () => {
      const { supabase } = await import('/src/supabaseClient.js');
      return supabase.getChannels().some(c => c.topic.includes('network-chat-') && c.state === 'joined');
    });
    const message = 'Repair verification ' + Date.now();
    const sent = await pages[0].evaluate(async ({ email, message }) => {
      const { connectivityService, mapRowToNetworkUser } = await import('/src/services/supabaseService.ts');
      const { supabase } = await import('/src/supabaseClient.js');
      const { data, error } = await supabase.from('profiles').select('*').eq('email', email).single();
      if (error) throw error;
      const result = await connectivityService.sendMessage(mapRowToNetworkUser(data), message,
        JSON.parse(localStorage.getItem('industryskill_auth_user')));
      return result.newMsg;
    }, { email: emails[1], message });
    await pages[1].waitForFunction(id => window.__receivedRepairMessages.some(m => m.id === id), sent.id, { timeout: 12000 });
    pass('two-account message delivery through database Realtime');
    await pages[1].reload();
    await pages[1].getByRole('heading', { name: /Connectivity.*live/i }).waitFor();
    const restored = await pages[1].evaluate(async () => {
      const { connectivityService } = await import('/src/services/supabaseService.ts');
      return connectivityService.fetchConversations(JSON.parse(localStorage.getItem('industryskill_auth_user')));
    });
    assert.ok(restored.some(c => c.messages.some(m => m.id === sent.id)));
    pass('received chat survives page reload');

    const post = await pages[0].evaluate(async () => {
      const { connectivityService } = await import('/src/services/supabaseService.ts');
      return connectivityService.createPost(JSON.parse(localStorage.getItem('industryskill_auth_user')),
        { content: 'Disposable repair test post', codeSnippet: { language: 'typescript', code: 'const tested = true;' } });
    });
    const feed = await pages[1].evaluate(async id => {
      const { connectivityService } = await import('/src/services/supabaseService.ts');
      const user = JSON.parse(localStorage.getItem('industryskill_auth_user'));
      await connectivityService.toggleLike(id, user);
      await connectivityService.addComment(id, 'Disposable repair comment', user);
      return connectivityService.fetchPosts(user);
    }, post.id);
    const reloadedPost = feed.find(p => p.id === post.id);
    assert.ok(reloadedPost?.isLiked && reloadedPost.comments.some(c => c.content === 'Disposable repair comment'));
    assert.equal(reloadedPost.codeSnippet.code, 'const tested = true;');
    pass('posts, code, likes, and comments persist');

    const request = await pages[0].evaluate(async email => {
      const { connectivityService } = await import('/src/services/supabaseService.ts');
      const { supabase } = await import('/src/supabaseClient.js');
      const { data } = await supabase.from('profiles').select('id').eq('email', email).single();
      return connectivityService.requestLibraryAccess(data.id, JSON.parse(localStorage.getItem('industryskill_auth_user')));
    }, emails[1]);
    await pages[1].evaluate(async id => {
      const { connectivityService } = await import('/src/services/supabaseService.ts');
      await connectivityService.respondToAccessRequest(id, 'approved', JSON.parse(localStorage.getItem('industryskill_auth_user')));
    }, request.request.id);
    const requests = await pages[0].evaluate(async () => {
      const { connectivityService } = await import('/src/services/supabaseService.ts');
      return connectivityService.fetchAccessRequests(JSON.parse(localStorage.getItem('industryskill_auth_user')));
    });
    assert.equal(requests.find(r => r.id === request.request.id)?.status, 'approved');
    pass('library request reaches owner and approval persists');

    const views = ['dashboard','profile','skills','skill-gap','ai-recommendations','courses','industry-tools','certifications','opportunities','connectivity','webinars','nebula','assignments','safety','settings','roadmap'];
    for (const view of views) {
      const started = Date.now();
      await pages[0].evaluate(view => { location.hash = view; }, view);
      await pages[0].waitForFunction(() => !document.body.innerText.includes('Loading module...'));
      await pages[0].waitForTimeout(500);
      assert.ok((await pages[0].locator('body').innerText()).length > 200, view);
      assert.equal(await pages[0].locator('vite-error-overlay').count(), 0, view);
      pass('view renders: ' + view, { elapsedMs: Date.now() - started });
    }
    assert.deepEqual(errors, []);
    pass('no browser runtime errors across module navigation');
    await pages[0].setViewportSize({ width: 390, height: 844 });
    await pages[0].evaluate(() => { location.hash = 'nebula'; });
    await pages[0].waitForTimeout(500);
    const width = await pages[0].evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: innerWidth }));
    assert.ok(width.content <= width.viewport + 2, JSON.stringify(width));
    pass('AI chat fits mobile viewport');
    await pages[0].screenshot({ path: process.env.TEST_SCREENSHOT || '../chat-preview.png', fullPage: true });
  } finally {
    await browser.close();
    if (process.env.TEST_REPORT) fs.writeFileSync(process.env.TEST_REPORT, JSON.stringify(report, null, 2));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
