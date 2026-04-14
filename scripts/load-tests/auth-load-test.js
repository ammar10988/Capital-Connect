import http from 'k6/http';
import { check, fail } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5173';
const SUPABASE_URL = __ENV.SUPABASE_URL;
const SUPABASE_ANON_KEY = __ENV.SUPABASE_ANON_KEY;
const LOGIN_EMAIL = __ENV.LOGIN_EMAIL;
const LOGIN_PASSWORD = __ENV.LOGIN_PASSWORD;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !LOGIN_EMAIL || !LOGIN_PASSWORD) {
  fail(
    'Missing required env vars: SUPABASE_URL, SUPABASE_ANON_KEY, LOGIN_EMAIL, LOGIN_PASSWORD.',
  );
}

const AUTH_GATEWAY_URL = `${SUPABASE_URL}/functions/v1/auth-gateway`;

export const options = {
  scenarios: {
    login_burst: {
      executor: 'constant-vus',
      vus: 50,
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
    'Auth Load Test Summary',
    `Target app: ${BASE_URL}`,
    `Auth gateway: ${AUTH_GATEWAY_URL}`,
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

export default function () {
  const payload = JSON.stringify({
    action: 'login',
    email: LOGIN_EMAIL,
    password: LOGIN_PASSWORD,
    redirectTo: `${BASE_URL}/auth/callback`,
  });

  const res = http.post(AUTH_GATEWAY_URL, payload, {
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    tags: { endpoint: 'auth-gateway-login' },
  });

  check(res, {
    'login status is 200': (r) => r.status === 200,
    'login response returns session tokens': (r) => {
      const body = r.json();
      return Boolean(body?.session?.access_token && body?.session?.refresh_token);
    },
  });
}
