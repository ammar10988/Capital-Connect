# -- CLEANUP: Run in Supabase Studio before next scraper run
# -- Step 1: Delete all stale rows (older than 7 days)
# -- DELETE FROM public.public_startups
# -- WHERE updated_at < NOW() - INTERVAL '7 days';
# --
# -- Step 2: Delete known dirty company names
# -- DELETE FROM public.public_startups
# -- WHERE company_name ILIKE '%startup%'
# --    OR company_name ILIKE '%platform%'
# --    OR company_name ILIKE '%chain%'
# --    OR company_name ILIKE '%processing%'
# --    OR company_name ILIKE '%procurement%'
# --    OR company_name ILIKE '%communications%'
# --    OR company_name = 'Belgium''s imec'
# --    OR company_name ILIKE '%http%';
# --
# -- Step 3: Verify cleanup
# -- SELECT company_name, funding_amount, announced_date
# -- FROM public_startups
# -- ORDER BY rank;
# --
# -- OPTIONAL: Create scraper run log table (run once in Supabase Studio)
# -- CREATE TABLE IF NOT EXISTS public.scraper_runs (
# --   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
# --   scraper_name TEXT NOT NULL,
# --   started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
# --   finished_at TIMESTAMPTZ,
# --   rows_inserted INTEGER DEFAULT 0,
# --   rows_deleted INTEGER DEFAULT 0,
# --   status TEXT DEFAULT 'running',
# --   error_message TEXT,
# --   feed_summary JSONB
# -- );
# -- ALTER TABLE public.scraper_runs ENABLE ROW LEVEL SECURITY;
# -- CREATE POLICY "Service role only"
# --   ON public.scraper_runs FOR ALL
# --   TO service_role USING (true);

from __future__ import annotations

import os
import re
import sys
import site
import time
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

# The repo root contains a supabase/ directory (Supabase project files:
# functions, migrations) that shadows the supabase pip package when
# PYTHONPATH includes the repo root. Fix: prepend site-packages so the
# installed package is found before the repo namespace package.
def _prioritise_site_packages() -> None:
    sp_dirs: list[str] = []
    try:
        sp_dirs.extend(site.getsitepackages())
    except AttributeError:
        pass
    try:
        sp_dirs.append(site.getusersitepackages())
    except AttributeError:
        pass
    for sp in reversed(sp_dirs):
        if sp in sys.path:
            sys.path.remove(sp)
        sys.path.insert(0, sp)

_prioritise_site_packages()

import feedparser
import requests
from bs4 import BeautifulSoup
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

if not SUPABASE_URL:
    raise EnvironmentError(
        "SUPABASE_URL is not set. "
        "Add it to GitHub Actions secrets or .env.local"
    )
if not SUPABASE_SERVICE_ROLE_KEY:
    raise EnvironmentError(
        "SUPABASE_SERVICE_ROLE_KEY is not set. "
        "Add it to GitHub Actions secrets or .env.local"
    )

from scripts.shared_constants import (
    INVALID_COMPANY_NAMES,
    extract_sector_shared,
    extract_city_shared,
    strip_html_shared,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger(__name__)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
RETENTION_DAYS = 7

# INR → USD: 1 crore = 10,000,000 INR; at ₹84/USD ≈ $119,048 per crore
INR_TO_USD = 1.0 / 84.0

RSS_FEEDS = [
    {"url": "https://yourstory.com/feed",                                                                                          "name": "YourStory"},
    {"url": "https://inc42.com/feed/",                                                                                             "name": "Inc42"},
    {"url": "https://economictimes.indiatimes.com/small-biz/startups/rssfeeds/13357270.cms",                                       "name": "Economic Times"},
    {"url": "https://www.business-standard.com/rss/home_page_top_stories.rss",                                                     "name": "Business Standard"},
    {"url": "https://inc42.com/buzz/feed/",                                                                                        "name": "Inc42 Buzz"},
    {"url": "https://www.livemint.com/rss/companies",                                                                              "name": "Mint Companies"},
    {"url": "https://economictimes.indiatimes.com/tech/startups/rssfeeds/78570550.cms",                                            "name": "ET Startups"},
    {"url": "https://news.google.com/rss/search?q=india+startup+funding+raises+crore+million&hl=en-IN&gl=IN&ceid=IN:en",           "name": "Google News"},
]

FUNDING_KEYWORDS = [
    "raises", "raised", "funding", "secures", "secured",
    "series a", "series b", "series c", "series d",
    "seed round", "pre-seed", "crore", "million", "billion",
    "valuation", "investment", "backed", "led by",
    "closes round", "startup", "venture",
]

STAGE_MAP = {
    "Pre-Seed": [
        "pre-seed", "pre seed", "pre-series a", "angel round",
        "angel funding", "angel investment", "pre series a",
        "friends and family round",
    ],
    "Seed": [
        "seed round", "seed funding", "seed stage", "seed-stage",
        "seed investment", "seed capital", "raised seed",
        "closes seed", "secures seed",
    ],
    "Series A": [
        "series a", "series-a", "series a round", "series a funding",
        "series a investment", "series-a round", "series a capital",
    ],
    "Series B": [
        "series b", "series-b", "series b round", "series b funding",
        "series-b round",
    ],
    "Series C": [
        "series c", "series-c", "series c round", "series c funding",
    ],
    "Series D": [
        "series d", "series-d", "series d round",
    ],
    "Series E+": [
        "series e", "series f", "series g", "series h",
    ],
    "Growth": [
        "growth round", "growth stage", "growth funding",
        "late stage", "late-stage", "pre-ipo", "pre ipo",
        "growth capital", "expansion round",
    ],
    "Bridge": [
        "bridge round", "bridge funding", "bridge financing",
        "convertible note", "safe round",
    ],
}

# Geographic filter signals
NON_INDIA_SIGNALS = [
    'belgium', 'singapore', 'us-based', 'uk-based', 'china-based',
    'german', 'france', 'dutch', 'swedish', 'japanese', 'korean',
    'american startup', 'silicon valley', 'new york-based',
    'london-based', 'san francisco', 'boston-based', 'europe-based',
    'european startup', 'global hq', 'headquartered in us',
    'headquartered in uk', 'listed on nasdaq', 'listed on nyse',
    'listed on lse',
]

INDIA_SIGNALS = [
    'india', 'indian', 'bengaluru', 'bangalore', 'mumbai', 'delhi',
    'hyderabad', 'pune', 'chennai', 'kolkata', 'ahmedabad', 'jaipur',
    'noida', 'gurugram', 'gurgaon', 'ncr', 'iit', 'iim', 'sebi',
    'rbi', 'upi', 'bharat', 'crore', 'lakh', '₹', 'rs.', 'inr',
]

# Word sets for company name cleaning
CATEGORY_WORDS = {
    'ai', 'saas', 'b2b', 'b2c', 'd2c', 'ev', 'qsr',
    'hr', 'iot', 'api', 'erp', 'crm', 'sme', 'nbfc',
    'ngo', 'esg', 'spac', 'seo', 'edtech', 'fintech',
    'healthtech', 'deeptech', 'cleantech', 'agritech',
    'adtech', 'proptech', 'legaltech', 'insurtech',
    'foodtech', 'traveltech', 'martech', 'regtech',
    'spacetech', 'defencetech', 'deftech', 'autotech',
    'retailtech', 'wealthtech', 'gametech', 'mediatech',
    'accounting', 'healthcare', 'infra', 'electronics',
    'energy', 'space', 'defence', 'defense',
    'food', 'media', 'wealth', 'lending', 'insurance',
    'payment', 'payments', 'logistics', 'retail',
}

DESCRIPTOR_NOUNS = {
    'startup', 'company', 'platform', 'firm', 'brand',
    'chain', 'network', 'solution', 'solutions', 'service',
    'services', 'provider', 'venture', 'ventures',
    'technology', 'technologies', 'tech', 'group',
    'institute', 'institution', 'lab', 'labs',
    'farm', 'produce', 'dairy', 'conditioner', 'packaging',
    'commerce', 'marketplace', 'exchange', 'hub',
    'app', 'apps', 'software', 'hardware', 'device',
}

DESCRIPTOR_ADJECTIVES = {
    'new', 'indian', 'digital', 'smart', 'modern',
    'enterprise', 'consumer', 'cloud', 'mobile',
    'online', 'social', 'real', 'estate', 'based',
    'powered', 'driven', 'enabled', 'focused',
    'first', 'next', 'gen', 'next-gen', 'cutting',
    'edge', 'cutting-edge', 'early', 'stage',
    'early-stage', 'late', 'growth', 'global',
    'regional', 'domestic', 'local', 'leading',
    'innovative', 'disruptive', 'proprietary',
    'advanced', 'processing', 'procurement',
    'communications', 'communication', 'management',
    'business', 'sustainable', 'clean', 'clean-label',
    'quick', 'electric', 'vertical', 'horizontal',
    'alternative', 'preventive', 'precision',
    'air', 'label', 'multi', 'omni', 'full', 'stack',
    'full-stack', 'open', 'source', 'open-source',
}

ALL_DESCRIPTOR_WORDS = CATEGORY_WORDS | DESCRIPTOR_NOUNS | DESCRIPTOR_ADJECTIVES

KNOWN_INVESTORS = {
    'accel', 'sequoia', 'peak xv', 'lightspeed',
    'kalaari', 'blume', 'matrix', 'elevation',
    'nexus', 'chiratae', 'stellaris', 'waterbridge',
    'bessemer', 'tiger global', 'softbank', 'insight',
    'general catalyst', 'andreessen', 'kleiner',
    'benchmark', 'index ventures', 'balderton',
    'ifc', 'adb ventures', 'ycombinator', 'y combinator',
}


def clean_company_name(name: str) -> Optional[str]:
    """
    Strip any descriptor prefix from a company name.
    Uses a greedy approach — scans from the left and skips
    known descriptor words until it finds the actual company name.
    """
    if not name:
        return None

    name = name.strip().rstrip(".,")

    # Strip leading "[word]-based " prefix (e.g. "Bengaluru-based Razorpay")
    name = re.sub(r"^[A-Za-z]+-based\s+", "", name, flags=re.IGNORECASE).strip()

    # Strip leading "[word]-led " prefix (e.g. "AI-led lending platform Uncia")
    name = re.sub(r"^[A-Za-z]+-led\s+", "", name, flags=re.IGNORECASE).strip()

    words = name.split()
    if len(words) <= 1:
        return name

    # Find the index where the actual company name starts
    # by scanning from the left and skipping descriptor words
    start_idx = 0
    for i, word in enumerate(words):
        word_lower = word.lower().rstrip('.,')
        if word_lower in ALL_DESCRIPTOR_WORDS:
            start_idx = i + 1
        else:
            # First non-descriptor word — remaining words form company name
            remaining = words[i:]
            if len(remaining) >= 1:
                break

    if start_idx >= len(words):
        # All words were descriptors — return original
        return name

    cleaned = " ".join(words[start_idx:]).strip().rstrip(".,")

    if not cleaned or len(cleaned) < 2:
        return name

    if cleaned.lower() in ALL_DESCRIPTOR_WORDS:
        return name

    return cleaned


def is_indian_startup(title: str, combined: str) -> bool:
    """
    Returns True if the article is about an Indian startup.
    Returns False if there are clear non-India signals with no
    India signals to counter them.
    """
    lower = combined.lower()
    has_non_india = any(s in lower for s in NON_INDIA_SIGNALS)
    has_india = any(s in lower for s in INDIA_SIGNALS)
    if has_non_india and not has_india:
        return False
    return True


def is_funding_article(title: str, summary: str) -> bool:
    return any(kw in (title + " " + summary).lower() for kw in FUNDING_KEYWORDS)


def extract_company(title: str) -> Optional[str]:
    patterns = [
        r"^([A-Z][A-Za-z0-9\s\.\-&']+?)\s+(?:raises|raised|secures|secured|closes|bags|lands|gets|attracts)",
        r"^([A-Z][A-Za-z0-9\s\.\-&']+?),\s+(?:a|an)\s+\w+\s+(?:startup|company|platform|firm)",
        r"^([A-Z][A-Za-z0-9\s\.\-&']+?)\s+(?:announces|completes)\s+(?:funding|round|raise)",
        r"^([A-Z][A-Za-z0-9\s\.\-&']+?)\s+(?:has raised|has secured|has closed)",
        r"Startup\s+([A-Z][A-Za-z0-9\s\.\-&']+?)\s+(?:raises|secures|closes)",
        r"([A-Z][A-Za-z0-9\s\.\-&']+?)\s+raises\s+(?:Rs|₹|\$|USD)",
    ]
    for pat in patterns:
        m = re.match(pat, title.strip())
        if m:
            name = m.group(1).strip().rstrip(".,")
            if not name:
                continue
            if name.lower() in INVALID_COMPANY_NAMES:
                continue
            if len(name.split()) == 1 and len(name) <= 4:
                continue
            if any(x in name.lower() for x in ["href", "http", "www", "<", ">", "&amp"]):
                continue
            if 1 <= len(name.split()) <= 5 and len(name) <= 40:
                name = clean_company_name(name) or name
                if name.lower() not in INVALID_COMPANY_NAMES:
                    return name
    return None


def extract_amount(text: str):
    patterns = [
        (r"\$\s?(\d+(?:\.\d+)?)\s?(billion|bn|B)\b",       1_000_000_000,           "USD", "B"),
        (r"\$\s?(\d+(?:\.\d+)?)\s?(million|mn|M)\b",       1_000_000,               "USD", "M"),
        (r"USD\s?(\d+(?:\.\d+)?)\s?(million|mn|M)\b",      1_000_000,               "USD", "M"),
        (r"₹\s?(\d+(?:\.\d+)?)\s?(?:crore|cr)\b",          10_000_000 * INR_TO_USD, "INR", "Cr"),
        (r"Rs\.?\s?(\d+(?:\.\d+)?)\s?(?:crore|cr)\b",      10_000_000 * INR_TO_USD, "INR", "Cr"),
        (r"(\d+(?:\.\d+)?)\s?(?:crore|cr)\b",              10_000_000 * INR_TO_USD, "INR", "Cr"),
    ]
    for pat, mult, currency, suffix in patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            val = float(m.group(1))
            label = f"${val:.0f}{suffix}" if currency == "USD" else f"₹{val:.0f}Cr"
            return label, round(val * mult, 2), currency
    return None, None, None


def extract_stage(text: str) -> Optional[str]:
    lower = text.lower()
    for stage, kws in STAGE_MAP.items():
        if any(k in lower for k in kws):
            return stage
    return None


def extract_investor(text: str) -> Optional[str]:
    """
    Extract lead investor name from article text.
    Covers common Indian startup media attribution patterns.
    """
    patterns = [
        # Most common patterns
        r"led by ([A-Z][A-Za-z0-9\s\.\-&]+?)(?:\s+and\b|,|\.|$)",
        r"backed by ([A-Z][A-Za-z0-9\s\.\-&]+?)(?:\s+and\b|,|\.|$)",
        r"led by ([A-Z][A-Za-z0-9\s\.\-&]+?)\s+(?:fund|ventures|capital|partners|vc)\b",
        # "raised from X" patterns
        r"raised from ([A-Z][A-Za-z0-9\s\.\-&]+?)\s+(?:fund|ventures|capital|partners|vc)\b",
        r"raised (?:rs\.?|₹|inr|\$|usd)[\d\.]+ (?:crore|cr|million|mn|m|billion|bn|b) from ([A-Z][A-Za-z0-9\s\.\-&]+?)(?:\s+and\b|,|\.|$)",
        # "funding from X" patterns
        r"funding from ([A-Z][A-Za-z0-9\s\.\-&]+?)\s+(?:fund|ventures|capital|partners)\b",
        r"investment from ([A-Z][A-Za-z0-9\s\.\-&]+?)(?:\s+and\b|,|\.|$)",
        # "X led the round" patterns
        r"([A-Z][A-Za-z0-9\s\.\-&]+?)\s+(?:fund|ventures|capital|partners|vc)\s+led\b",
        r"([A-Z][A-Za-z0-9\s\.\-&]+?)\s+led the (?:round|funding|investment)\b",
        # "participation from X" patterns
        r"participation (?:from|of) ([A-Z][A-Za-z0-9\s\.\-&]+?)(?:\s+and\b|,|\.|$)",
        r"participation by ([A-Z][A-Za-z0-9\s\.\-&]+?)(?:\s+and\b|,|\.|$)",
        # "[X]-led round" pattern common in Indian media
        r"([A-Z][A-Za-z0-9\s\.\-&]+?)-led (?:round|funding|series)\b",
    ]
    for pat in patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            inv = m.group(1).strip().rstrip(",.")
            if len(inv.split()) > 7:
                continue
            inv_lower = inv.lower()
            if (any(ki in inv_lower for ki in KNOWN_INVESTORS)
                    or any(w in inv_lower for w in
                           ['ventures', 'capital', 'fund', 'partners',
                            'vc', 'investments', 'growth'])):
                return inv
            if 2 <= len(inv.split()) <= 4 and inv[0].isupper():
                return inv
    return None


def fetch_body(url: str) -> str:
    """
    Fetch article body text. Handles Google News redirects and
    cookie/consent walls gracefully.
    """
    try:
        resp = requests.get(
            url,
            timeout=8,
            headers=HEADERS,
            allow_redirects=True,
        )
        if len(resp.text) < 2000:
            return ""
        if any(w in resp.text.lower() for w in [
            'consent', 'cookie', 'gdpr', 'accept all',
            'i agree', 'before you continue'
        ]):
            return ""

        soup = BeautifulSoup(resp.text, "lxml")
        for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
            tag.decompose()

        paras = soup.find_all("p")
        body = " ".join(p.get_text() for p in paras[:15])

        if len(body.strip()) < 100:
            return ""

        return strip_html_shared(body)
    except Exception:
        return ""


def parse_date(entry) -> str:
    if hasattr(entry, "published_parsed") and entry.published_parsed:
        dt = datetime(*entry.published_parsed[:6], tzinfo=timezone.utc)
        return dt.date().isoformat()
    return datetime.now(timezone.utc).date().isoformat()


def build_signal(amount_usd, stage) -> tuple[str, bool]:
    if stage in ("Series A", "Series B", "Series C", "Series D", "Growth", "Series E+"):
        return "Hot Deal", True
    if amount_usd and amount_usd >= 10_000_000:
        return "Hot Deal", True
    if amount_usd and amount_usd >= 2_000_000:
        return "Strong Growth", True
    if stage == "Seed":
        return "Strong Growth", False
    return "Newly Listed", False


def fetch_feed_with_retry(url: str, max_attempts: int = 3):
    for attempt in range(1, max_attempts + 1):
        try:
            feed = feedparser.parse(url)
            if feed.entries:
                return feed
            if attempt < max_attempts:
                time.sleep(5)
        except Exception as e:
            if attempt == max_attempts:
                raise
            log.warning(f"Feed fetch attempt {attempt} failed for {url}: {e}. Retrying...")
            time.sleep(5)
    return feedparser.parse(url)


def scrape_feed(url: str, name: str) -> list[dict]:
    results = []
    try:
        feed = fetch_feed_with_retry(url)
        log.info(f"[{name}] {len(feed.entries)} entries")
    except Exception as e:
        log.error(f"[{name}] Failed: {e}")
        return results

    for entry in feed.entries:
        title   = entry.get("title", "")
        summary = entry.get("summary", "")
        link    = entry.get("link", "")
        if not is_funding_article(title, summary):
            continue

        body        = fetch_body(link)
        clean_title = strip_html_shared(title)
        company     = extract_company(clean_title)
        if not company:
            continue

        combined = f"{clean_title} {strip_html_shared(summary)} {body}"

        # Skip non-Indian startups
        if not is_indian_startup(clean_title, combined):
            log.debug(f"  Skipped (non-Indian): {clean_title[:60]}")
            continue

        amount_label, amount_usd, currency = extract_amount(combined)
        stage                  = extract_stage(combined)
        sector                 = extract_sector_shared(combined)
        city                   = extract_city_shared(combined)
        investor               = extract_investor(combined)
        signal, is_hot         = build_signal(amount_usd, stage)

        parts = [p for p in [sector, city] if p]
        results.append({
            "company_name":       company,
            "tagline":            " · ".join(parts) if parts else None,
            "sector":             sector,
            "city":               city,
            "country":            "India",
            "stage":              stage,
            "funding_amount":     amount_label,
            "funding_amount_usd": amount_usd,
            "funding_round":      stage,
            "currency":           currency,
            "investor_name":      investor,
            "description":        strip_html_shared(summary)[:400] if summary else None,
            "source_url":         link,
            "source_name":        name,
            "announced_date":     parse_date(entry),
            "is_hot":             is_hot,
            "trend_signal":       signal,
            "updated_at":         datetime.now(timezone.utc).isoformat(),
        })
        log.info(f"  + {company} | {sector or '?'} | {stage or '?'} | {amount_label or '?'}")

    return results


def assign_ranks(records: list[dict]) -> list[dict]:
    stage_score = {
        "Series E+": 7, "Series D": 6, "Growth": 5, "Series C": 5,
        "Series B": 4, "Series A": 3, "Seed": 2, "Pre-Seed": 1,
    }

    def score(r):
        return (
            1 if r.get("is_hot") else 0,
            r.get("funding_amount_usd") or 0,
            stage_score.get(r.get("stage") or "", 0),
            r.get("announced_date") or "",
        )

    sorted_recs = sorted(records, key=score, reverse=True)
    for i, r in enumerate(sorted_recs):
        r["rank"] = i + 1
    return sorted_recs


def upsert(records: list[dict]) -> tuple[int, int]:
    if not records:
        return 0, 0
    # In-memory dedup by company_name key — keep highest-funded record
    seen: dict[str, dict] = {}
    for r in records:
        key = r["company_name"].lower().strip()
        existing = seen.get(key)
        if not existing or (r.get("funding_amount_usd") or 0) > (existing.get("funding_amount_usd") or 0):
            seen[key] = r
    unique = list(seen.values())

    inserted = skipped = 0
    for i in range(0, len(unique), 50):
        batch = unique[i:i + 50]
        try:
            res = supabase.table("public_startups").upsert(
                batch, on_conflict="company_name", ignore_duplicates=False
            ).execute()
            inserted += len(res.data) if res.data else 0
        except Exception as e:
            log.error(f"Batch error: {e}")
            skipped += len(batch)
    return inserted, skipped


def delete_old() -> int:
    """
    Delete rows that are stale by EITHER condition:
    1. updated_at older than 7 days
    2. announced_date older than 7 days
    Returns total rows deleted.
    """
    cutoff_dt = datetime.now(timezone.utc) - timedelta(days=RETENTION_DAYS)
    cutoff = cutoff_dt.isoformat()
    cutoff_date = cutoff_dt.date().isoformat()
    total = 0
    try:
        res1 = supabase.table("public_startups") \
            .delete() \
            .lt("updated_at", cutoff) \
            .execute()
        deleted1 = len(res1.data) if res1.data else 0

        res2 = supabase.table("public_startups") \
            .delete() \
            .lt("announced_date", cutoff_date) \
            .execute()
        deleted2 = len(res2.data) if res2.data else 0

        total = deleted1 + deleted2
        log.info(
            f"Cleanup: deleted {deleted1} stale rows "
            f"+ {deleted2} old-article rows = {total} total"
        )
    except Exception as e:
        log.error(f"Cleanup error: {e}")
    return total


def get_count() -> int:
    try:
        return supabase.table("public_startups").select("id", count="exact").execute().count or 0
    except Exception:
        return 0


def reassign_ranks_globally() -> None:
    """
    After upsert, reassign rank values globally across ALL rows in
    public_startups to ensure no duplicates.
    Ranks by: is_hot DESC, funding_amount_usd DESC, announced_date DESC.
    """
    try:
        sql = """
        WITH ranked AS (
            SELECT id,
                   ROW_NUMBER() OVER (
                       ORDER BY is_hot DESC,
                                COALESCE(funding_amount_usd, 0) DESC,
                                announced_date DESC NULLS LAST
                   ) AS new_rank
            FROM public.public_startups
        )
        UPDATE public.public_startups ps
        SET rank = r.new_rank
        FROM ranked r
        WHERE ps.id = r.id;
        """
        supabase.rpc("exec_sql", {"sql": sql}).execute()
        log.info("Global rank reassignment complete")
    except Exception as e:
        # RPC may not exist — log and continue, not critical
        log.warning(f"Global rank reassignment skipped: {e}")


def log_run_to_db(
    started_at,
    rows_inserted: int,
    rows_deleted: int,
    status: str,
    error_message: Optional[str] = None,
    feed_summary=None,
) -> None:
    try:
        supabase.table("scraper_runs").insert({
            "scraper_name":  "public_data_scraper",
            "started_at":    started_at.isoformat(),
            "finished_at":   datetime.now(timezone.utc).isoformat(),
            "rows_inserted": rows_inserted,
            "rows_deleted":  rows_deleted,
            "status":        status,
            "error_message": error_message,
            "feed_summary":  feed_summary,
        }).execute()
    except Exception as e:
        # Never let logging failure crash the scraper
        log.warning(f"Could not log run to DB: {e}")


def main() -> None:
    log.info("=== Public Data Scraper starting ===")
    started_at = datetime.now(timezone.utc)
    total_inserted = 0
    total_deleted = 0

    # Step 1 — Clean stale data FIRST (before anything else)
    # This ensures the 7-day window is enforced even if the rest of the run fails
    log.info("Step 1: Cleaning stale rows older than 7 days...")
    total_deleted += delete_old()

    # Step 2 — Scrape feeds
    log.info("Step 2: Scraping RSS feeds...")
    all_records: list[dict] = []
    summary: list[str] = []

    for feed in RSS_FEEDS:
        try:
            recs = scrape_feed(feed["url"], feed["name"])
            all_records.extend(recs)
            summary.append(f"  ✓ {feed['name']}: {len(recs)} startups")
        except Exception as e:
            log.error(f"[{feed['name']}] Crashed: {e}")
            summary.append(f"  ✗ {feed['name']}: ERROR")
        time.sleep(1.5)

    log.info(f"Total extracted: {len(all_records)}")

    # Step 3 — Upsert new data
    log.info("Step 3: Upserting records...")
    if all_records:
        ranked = assign_ranks(all_records)
        inserted, skipped = upsert(ranked)
        total_inserted = inserted
        log.info(f"Upserted: {inserted} | Errors: {skipped}")
        reassign_ranks_globally()
    else:
        log.warning(f"No new articles. Keeping {get_count()} existing rows.")

    # Step 4 — Final cleanup pass
    log.info("Step 4: Final cleanup pass...")
    total_deleted += delete_old()

    for line in summary:
        log.info(line)

    final_count = get_count()
    log.info(f"Final count: {final_count}")

    log_run_to_db(
        started_at=started_at,
        rows_inserted=total_inserted,
        rows_deleted=total_deleted,
        status="success",
        feed_summary={f["name"]: s for f, s in zip(RSS_FEEDS, summary)},
    )


if __name__ == "__main__":
    main()
