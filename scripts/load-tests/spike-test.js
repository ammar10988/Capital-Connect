import http from 'k6/http';
import { check, fail, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5173';
const SUPABASE_URL = __ENV.SUPABASE_URL;
const SUPABASE_ANON_KEY = __ENV.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  fail('Missing required env vars: SUPABASE_URL and SUPABASE_ANON_KEY.');
}

const LIST_FOUNDERS_URL = `${SUPABASE_URL}/functions/v1/list-founders`;

export const options = {
  scenarios: {
    sudden_spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 200 },
        { duration: '20s', target: 200 },
        { duration: '10s', target: 0 },
      ],
      gracefulRampDown: '5s',
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
    'Spike Test Summary',
    `Base URL: ${BASE_URL}`,
    `Founder list endpoint: ${LIST_FOUNDERS_URL}`,
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
  const responses = http.batch([
    ['GET', `${BASE_URL}/`, null, { tags: { endpoint: 'home' } }],
    ['GET', `${BASE_URL}/pricing`, null, { tags: { endpoint: 'pricing' } }],
    [
      'POST',
      LIST_FOUNDERS_URL,
      JSON.stringify({ sector: 'all', founderType: 'all', search: '', limit: 12 }),
      { headers: sharedHeaders(), tags: { endpoint: 'list-founders' } },
    ],
  ]);

  check(responses[0], {
    'home page status is 200': (r) => r.status === 200,
  });

  check(responses[1], {
    'pricing page status is 200': (r) => r.status === 200,
  });

  check(responses[2], {
    'list founders status is 200': (r) => r.status === 200,
    'list founders returns founders array': (r) => Array.isArray(r.json('founders')),
  });

  sleep(1);
}
