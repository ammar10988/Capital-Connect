import http from 'k6/http';
import { check, fail } from 'k6';

const SUPABASE_URL = __ENV.SUPABASE_URL;
const SUPABASE_ANON_KEY = __ENV.SUPABASE_ANON_KEY;
const FOUNDER_PROFILE_ID = __ENV.FOUNDER_PROFILE_ID || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  fail('Missing required env vars: SUPABASE_URL and SUPABASE_ANON_KEY.');
}

const LIST_FOUNDERS_URL = `${SUPABASE_URL}/functions/v1/list-founders`;
const FOUNDER_PROFILE_URL = `${SUPABASE_URL}/functions/v1/get-founder-profile`;

export const options = {
  scenarios: {
    founder_api_mix: {
      executor: 'constant-vus',
      vus: 100,
      duration: '30s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
  },
};

function printThreshold(name, ok, details) {
  return `${ok ? 'PASS' : 'FAIL'} ${name}: ${details}`;
}

export function handleSummary(data) {
  const durationOk = data.metrics.http_req_duration.thresholds['p(95)<500'];
  const errorOk = data.metrics.http_req_failed.thresholds['rate<0.01'];

  const lines = [
    'API Load Test Summary',
    `Founder list endpoint: ${LIST_FOUNDERS_URL}`,
    `Founder profile endpoint: ${FOUNDER_PROFILE_URL}`,
    printThreshold(
      'http_req_duration p(95)<500ms',
      durationOk,
      `actual p95=${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms`,
    ),
    printThreshold(
      'http_req_failed rate<1%',
      errorOk,
      `actual rate=${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%`,
    ),
  ];

  return {
    stdout: `${lines.join('\n')}\n`,
  };
}

function sharedHeaders() {
  return {
    'Content-Type': 'application/json',
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  };
}

export default function () {
  const listResponse = http.post(
    LIST_FOUNDERS_URL,
    JSON.stringify({
      sector: 'all',
      founderType: 'all',
      search: '',
      limit: 24,
    }),
    {
      headers: sharedHeaders(),
      tags: { endpoint: 'list-founders' },
    },
  );

  check(listResponse, {
    'list founders status is 200': (r) => r.status === 200,
    'list founders returns founders array': (r) => Array.isArray(r.json('founders')),
  });

  const firstFounder = listResponse.status === 200 ? listResponse.json('founders.0') : null;
  const founderProfileId = FOUNDER_PROFILE_ID || firstFounder?.id;

  if (!founderProfileId) {
    fail('No founder profile ID available. Set FOUNDER_PROFILE_ID or ensure list-founders returns data.');
  }

  const profileResponse = http.post(
    FOUNDER_PROFILE_URL,
    JSON.stringify({ founderProfileId }),
    {
      headers: sharedHeaders(),
      tags: { endpoint: 'get-founder-profile' },
    },
  );

  check(profileResponse, {
    'founder profile status is 200': (r) => r.status === 200,
    'founder profile returns founder': (r) => Boolean(r.json('founder')),
  });
}
