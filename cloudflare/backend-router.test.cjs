'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { createBackendRouter } = require('./backend-router.js');

const cloudflare = { id: 'cloudflare', url: 'https://test.workers.dev' };
const render = { id: 'render', url: 'https://test.onrender.com' };

test('consults the preferred endpoint first in either direction', async () => {
  for (const [primary, standby] of [[cloudflare, render], [render, cloudflare]]) {
    const seen = [];
    const route = createBackendRouter({
      primary,
      standby,
      probe: async endpoint => { seen.push(endpoint.id); return true; }
    });
    assert.equal(await route.select(), primary.url);
    assert.deepEqual(seen, [primary.id]);
  }
});

test('simultaneous opens share one decision and the selected standby is sticky', async () => {
  const seen = [];
  const route = createBackendRouter({
    primary: render,
    standby: cloudflare,
    probe: async endpoint => { seen.push(endpoint.id); return endpoint === cloudflare; }
  });
  assert.deepEqual(await Promise.all([route.select(), route.select()]), [cloudflare.url, cloudflare.url]);
  assert.equal(await route.select(), cloudflare.url);
  assert.deepEqual(seen, ['render', 'cloudflare']);
  assert.equal(route.pinInvite(new URL('https://example.org/?room=ABCD')).search,
    '?room=ABCD&backend=cloudflare');
});

test('an invitation stays on its configured backend even if it differs from the preferred provider', async () => {
  const route = createBackendRouter({
    primary: cloudflare,
    standby: render,
    pin: 'render',
    probe: async () => assert.fail('Pinned invitations should use their assigned backend directly')
  });
  assert.equal(await route.select(), render.url);
});

test('a failed attempt can be retried without changing room routing', async () => {
  let available = false;
  const route = createBackendRouter({
    primary: cloudflare,
    standby: render,
    pin: 'unknown',
    probe: async endpoint => available && endpoint === render
  });
  assert.equal(await route.select(), null);
  available = true;
  assert.equal(await route.select(), render.url);
});
