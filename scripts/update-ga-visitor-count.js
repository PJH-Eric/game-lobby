const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const tokenUrl = 'https://oauth2.googleapis.com/token';
const apiScope = 'https://www.googleapis.com/auth/analytics.readonly';
const reportUrl = 'https://analyticsdata.googleapis.com/v1beta/properties';
const dateRange = { startDate: '2020-01-01', endDate: 'today' };
const gameIds = require('../config/games.json').games.map((game) => game.id);

function createAssertion(serviceAccount, nowSeconds = Math.floor(Date.now() / 1000)) {
  const header = {
    alg: 'RS256',
    typ: 'JWT',
    ...(serviceAccount.private_key_id ? { kid: serviceAccount.private_key_id } : {}),
  };
  const payload = {
    iss: serviceAccount.client_email,
    scope: apiScope,
    aud: serviceAccount.token_uri || tokenUrl,
    iat: nowSeconds,
    exp: nowSeconds + 3600,
  };
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const unsigned = `${encode(header)}.${encode(payload)}`;
  const signature = crypto.sign('RSA-SHA256', Buffer.from(unsigned), serviceAccount.private_key);

  return `${unsigned}.${signature.toString('base64url')}`;
}

function createReportRequest() {
  return {
    dateRanges: [dateRange],
    metrics: [{ name: 'totalUsers' }],
  };
}

// 全部遊戲共用同一個 GA4 資源；每開一局送一次 game_start（觀戰不送）。
function createPlaysReportRequest() {
  return {
    dateRanges: [dateRange],
    metrics: [{ name: 'eventCount' }],
    dimensionFilter: {
      filter: { fieldName: 'eventName', stringFilter: { matchType: 'EXACT', value: 'game_start' } },
    },
  };
}

function createGamePlaysReportRequest() {
  return {
    dateRanges: [dateRange],
    dimensions: [{ name: 'customEvent:game_id' }],
    metrics: [{ name: 'eventCount' }],
    dimensionFilter: {
      filter: { fieldName: 'eventName', stringFilter: { matchType: 'EXACT', value: 'game_start' } },
    },
    limit: 1000,
  };
}

function readCount(report, metric) {
  const count = Number(report.rows?.[0]?.metricValues?.[0]?.value || 0);
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new Error(`Google Analytics returned an invalid ${metric} value`);
  }
  return count;
}

function readGamePlayCounts(report) {
  const counts = Object.fromEntries(gameIds.map((gameId) => [gameId, 0]));
  for (const row of report.rows || []) {
    const gameId = row.dimensionValues?.[0]?.value;
    if (!Object.prototype.hasOwnProperty.call(counts, gameId)) continue;
    counts[gameId] = readCount({ rows: [{ metricValues: row.metricValues }] }, 'game_start eventCount');
  }
  return counts;
}

async function readJsonResponse(response, label) {
  if (!response.ok) {
    const details = await response.text();
    throw new Error(`${label} failed with HTTP ${response.status}: ${details}`);
  }

  return response.json();
}

async function getAnalyticsCounts({ propertyId, serviceAccount, fetchImpl = fetch, nowSeconds }) {
  const id = String(propertyId || '');
  if (!/^\d+$/.test(id)) throw new Error('GA_PROPERTY_ID must be the numeric GA4 property ID');
  if (!serviceAccount.client_email || !serviceAccount.private_key) {
    throw new Error('GA service account JSON must include client_email and private_key');
  }

  const assertion = createAssertion(serviceAccount, nowSeconds);
  const tokenResponse = await fetchImpl(serviceAccount.token_uri || tokenUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }).toString(),
  });
  const tokenData = await readJsonResponse(tokenResponse, 'Google OAuth token request');
  if (!tokenData.access_token) throw new Error('Google OAuth response did not include an access token');

  const runReport = async (body) => readJsonResponse(await fetchImpl(`${reportUrl}/${id}:runReport`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${tokenData.access_token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  }), 'Google Analytics Data API request');

  const users = readCount(await runReport(createReportRequest()), 'totalUsers');
  const plays = readCount(await runReport(createPlaysReportRequest()), 'game_start eventCount');
  return { users, plays };
}

async function getAnalyticsSnapshot({ propertyId, serviceAccount, fetchImpl = fetch, nowSeconds }) {
  const id = String(propertyId || '');
  if (!/^\d+$/.test(id)) throw new Error('GA_PROPERTY_ID must be the numeric GA4 property ID');
  if (!serviceAccount.client_email || !serviceAccount.private_key) {
    throw new Error('GA service account JSON must include client_email and private_key');
  }

  const assertion = createAssertion(serviceAccount, nowSeconds);
  const tokenResponse = await fetchImpl(serviceAccount.token_uri || tokenUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }).toString(),
  });
  const tokenData = await readJsonResponse(tokenResponse, 'Google OAuth token request');
  if (!tokenData.access_token) throw new Error('Google OAuth response did not include an access token');

  const runReport = async (body) => readJsonResponse(await fetchImpl(reportUrl + '/' + id + ':runReport', {
    method: 'POST',
    headers: {
      authorization: 'Bearer ' + tokenData.access_token,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  }), 'Google Analytics Data API request');

  const users = readCount(await runReport(createReportRequest()), 'totalUsers');
  const plays = readCount(await runReport(createPlaysReportRequest()), 'game_start eventCount');
  let gamePlays = null;
  try {
    gamePlays = readGamePlayCounts(await runReport(createGamePlaysReportRequest()));
  } catch (error) {
    console.warn('GA4 per-game counts skipped: ' + error.message);
  }
  return { users, plays, gamePlays };
}

async function main() {
  const propertyId = process.env.GA_PROPERTY_ID;
  const serviceAccountJson = process.env.GA_SERVICE_ACCOUNT_JSON;
  if (!propertyId || !serviceAccountJson) {
    console.log('GA4 counter skipped: configure GA_PROPERTY_ID and GA_SERVICE_ACCOUNT_JSON.');
    return;
  }

  const serviceAccount = JSON.parse(serviceAccountJson);
  const { users: count, plays, gamePlays } = await getAnalyticsSnapshot({ propertyId, serviceAccount });
  const output = {
    source: 'google-analytics',
    metric: 'totalUsers',
    count,
    plays: { metric: 'eventCount', eventName: 'game_start', count: plays },
    playsByGame: gamePlays ? {
      metric: 'eventCount',
      eventName: 'game_start',
      dimension: 'game_id',
      counts: gamePlays,
    } : null,
    dateRange,
    updatedAt: new Date().toISOString(),
  };
  const outputPath = path.join(root, 'dist', 'visitor-count.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  console.log(`GA4 cumulative unique visitors updated: ${count}; total plays: ${plays}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = {
  createAssertion,
  createReportRequest,
  createPlaysReportRequest,
  createGamePlaysReportRequest,
  getAnalyticsCounts,
  getAnalyticsSnapshot,
};
