"""
Capital Connect — Funding Events Scraper
=========================================
Reads the same 8 India-focused RSS feeds as the news scraper, filters for
funding articles, extracts structured fields, and upserts into the
Supabase `funding_rounds` table.

TABLE NAME: funding_rounds (confirmed correct — FundingTrackerPage.tsx queries this table)

Actual DB columns (verified by querying Supabase):
    company_name   text        required
    sector         text?
    stage          text?       derived from round_type (Early/Growth/Late)
    country        text        default "India"
    location       text?       canonical city name
    description    text?       article summary
    amount_usd     integer?    converted to USD
    round_type     text?       Seed / Series A / etc.
    lead_investor  text?
    co_investors   text[]      default []
    valuation_usd  integer?    null (not extractable from RSS)
    announced_at   date        YYYY-MM-DD
    source_url     text        required, unique constraint key
    source_name    text        required

Usage:
    python scraper.py

Required env vars:
    SUPABASE_URL
    SUPABASE_SERVICE_ROLE_KEY

-- DB SETUP: Run in Supabase Studio once
-- ALTER TABLE funding_rounds
--   ADD CONSTRAINT IF NOT EXISTS funding_rounds_source_url_key
--   UNIQUE (source_url);
-- This provides DB-level dedup protection.

-- CLEANUP: Run in Supabase Studio immediately
-- DELETE FROM funding_rounds
-- WHERE company_name IN ('Startups','BESI','Peak XV Partners',
--                        'Mumbai','Supertails')
--    OR company_name ILIKE '%http%'
--    OR LOWER(company_name) IN ('startups','startup','funding');
-- This removes corrupted rows including any unrealistic amount rows.
"""

import os
import re
import sys
import time
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

import feedparser
import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from supabase import create_client, Client

from scripts.shared_constants import (
    INVALID_COMPANY_NAMES,
    extract_sector_shared,
    extract_city_shared,
)

from dotenv import load_dotenv
import os

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# ── Bootstrap ─────────────────────────────────────────────────────────────────
load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-7s  %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%SZ",
)
log = logging.getLogger("funding_scraper")

SUPABASE_URL              = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    log.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# ── RSS feeds ──────────────────────────────────────────────────────────────────
RSS_FEEDS = [
    {"url": "https://yourstory.com/feed",                                                                    "name": "YourStory"},
    {"url": "https://inc42.com/feed/",                                                                       "name": "Inc42"},
    {"url": "https://economictimes.indiatimes.com/small-biz/startups/rssfeeds/13357270.cms",                 "name": "Economic Times"},
    {"url": "https://vccircle.com/feed",                                                                     "name": "VCCircle"},
    {"url": "https://entrackr.com/feed",                                                                     "name": "Entrackr"},
    {"url": "https://livemint.com/rss/startup",                                                              "name": "Livemint"},
    {"url": "https://www.business-standard.com/rss/home_page_top_stories.rss",                              "name": "Business Standard"},
    {"url": "https://news.google.com/rss/search?q=india+startup+funding&hl=en-IN&gl=IN&ceid=IN:en",         "name": "Google News"},
]

# ── Funding keyword filter ─────────────────────────────────────────────────────
FUNDING_KEYWORDS = [
    "raised", "raises", "funding", "funded", "round", "investment",
    "crore", "million", "billion", "series a", "series b",
    "series c", "pre-seed", "pre-series", "secures", "secured",
    "closes", "closed", "valuation", "venture", "backed", "bags",
]

# ── Round type map — order matters: longer/specific before shorter/generic ────
# Note: bare "seed" removed to prevent false matches on "seed money", "seeded" etc.
ROUND_KEYWORDS: dict[str, list[str]] = {
    "Pre-Seed": ["pre-seed", "pre seed", "angel round"],
    "Seed":     ["seed round", "seed funding", "seed stage", "seed-stage"],
    "Series A": ["series a"],
    "Series B": ["series b"],
    "Series C": ["series c"],
    "Series D": ["series d"],
    "Series E": ["series e"],
    "Series F": ["series f"],
    "Series G": ["series g"],
    "Series H": ["series h"],
    "Bridge":   ["bridge round", "bridge funding"],
    "Pre-IPO":  ["pre-ipo", "pre ipo"],
    "Post-IPO": ["post-ipo", "post ipo follow-on"],
    "Grant":    ["grant"],
}

# INR → USD conversion
_INR_PER_USD = 84.0

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (compatible; CapitalConnectBot/1.0; "
        "+https://capitalconnect.in)"
    )
}

# ── Descriptor prefix stripping ────────────────────────────────────────────────
DESCRIPTOR_PREFIXES = [
    r"^(?:preventive\s+)?(?:\w+\s+){0,3}startup\s+",
    r"^(?:qsr|d2c|b2b|b2c|saas|ai|ev|fintech|healthtech|edtech)\s+(?:chain|platform|startup|company|firm|brand)\s+",
    r"^(?:real estate|travel|hr|legal|food|gaming|cloud|enterprise)\s+(?:tech\s+)?(?:startup|platform|company|firm)\s+",
    r"^(?:bengaluru|mumbai|delhi|hyderabad|pune|chennai)-based\s+",
    r"^(?:india|indian)-based\s+",
]


def clean_company_name(name: str) -> Optional[str]:
    if not name:
        return None
    for prefix_pat in DESCRIPTOR_PREFIXES:
        cleaned = re.sub(prefix_pat, "", name, flags=re.IGNORECASE).strip()
        if cleaned and cleaned != name:
            name = cleaned
    return name.strip().rstrip(".,") if name else None


# ── Helpers ────────────────────────────────────────────────────────────────────

def is_funding_article(title: str, summary: str) -> bool:
    text = (title + " " + summary).lower()
    return any(kw in text for kw in FUNDING_KEYWORDS)


def extract_company_name(title: str) -> Optional[str]:
    """
    Extracts company name using multiple strategies, then strips descriptor
    prefixes and validates against INVALID_COMPANY_NAMES.
    """
    funding_verbs = r"(?:raises?|raised|secures?|secured|closes?|closed|bags?|lands?|gets?|receives?|backed|funded|attracts?)"

    # Strategy 1: title starts with company name
    m = re.match(rf"^([A-Z][A-Za-z0-9][A-Za-z0-9\s\.\-&']*?)\s+{funding_verbs}\b", title.strip())
    if m:
        name = m.group(1).strip().rstrip(",.")
        if 1 <= len(name.split()) <= 6:
            name = clean_company_name(name) or name
            if name.lower() not in INVALID_COMPANY_NAMES:
                return name

    # Strategy 2: strip common news prefixes then try again
    cleaned = re.sub(
        r"^(?:Exclusive[:\-]|Breaking[:\-]|Funding Alert[:\-]|Report[:\-]|Watch[:\-])\s*",
        "", title.strip(), flags=re.IGNORECASE,
    )
    if cleaned != title.strip():
        m = re.match(rf"^([A-Z][A-Za-z0-9][A-Za-z0-9\s\.\-&']*?)\s+{funding_verbs}\b", cleaned)
        if m:
            name = m.group(1).strip().rstrip(",.")
            if 1 <= len(name.split()) <= 6:
                name = clean_company_name(name) or name
                if name.lower() not in INVALID_COMPANY_NAMES:
                    return name

    # Strategy 3: any capital phrase before funding verb
    m = re.search(rf"([A-Z][A-Za-z0-9][A-Za-z0-9\s\.\-&']*?)\s+{funding_verbs}\b", title)
    if m:
        name = m.group(1).strip().rstrip(",.")
        if 1 <= len(name.split()) <= 5:
            name = clean_company_name(name) or name
            if name.lower() not in INVALID_COMPANY_NAMES:
                return name

    # Strategy 4: possessive "Acme's $5M round"
    m = re.search(r"([A-Z][A-Za-z0-9][A-Za-z0-9\s\.\-&']*?)'s\s+(?:\$|₹|Rs|USD|INR|Series|Seed|Pre)", title)
    if m:
        name = m.group(1).strip()
        if 1 <= len(name.split()) <= 5:
            name = clean_company_name(name) or name
            if name.lower() not in INVALID_COMPANY_NAMES:
                return name

    return None


def extract_lead_investor(text: str) -> Optional[str]:
    patterns = [
        r"led by ([A-Z][A-Za-z0-9\s\.\-&]+?(?:Ventures|Capital|Partners|Fund|Investments|VC))\b",
        r"led by ([A-Z][A-Za-z0-9\s\.\-&]+?)(?:\s+and\b|\s+with\b|,|\.|$)",
        r"backed by ([A-Z][A-Za-z0-9\s\.\-&]+?(?:Ventures|Capital|Partners|Fund|Investments))\b",
        r"from ([A-Z][A-Za-z0-9\s\.\-&]+?(?:Ventures|Capital|Partners|Fund|Investments))\b",
        r"participation (?:from|of) ([A-Z][A-Za-z0-9\s\.\-&]+?(?:Ventures|Capital|Partners|Fund))\b",
    ]
    for pat in patterns:
        m = re.search(pat, text)
        if m:
            name = m.group(1).strip().rstrip(",.")
            if 1 <= len(name.split()) <= 7:
                return name
    return None


def extract_amount_usd(text: str) -> Optional[int]:
    patterns = [
        (r"\$\s?(\d+(?:\.\d+)?)\s?(?:million|mn|M)\b",     1e6,  1.0),
        (r"\$\s?(\d+(?:\.\d+)?)\s?(?:billion|bn|B)\b",     1e9,  1.0),
        (r"USD\s?(\d+(?:\.\d+)?)\s?(?:million|mn|M)\b",    1e6,  1.0),
        (r"USD\s?(\d+(?:\.\d+)?)\s?(?:billion|bn|B)\b",    1e9,  1.0),
        (r"₹\s?(\d+(?:\.\d+)?)\s?(?:crore|cr)\b",          1e7,  1.0 / _INR_PER_USD),
        (r"Rs\.?\s?(\d+(?:\.\d+)?)\s?(?:crore|cr)\b",      1e7,  1.0 / _INR_PER_USD),
        (r"INR\s?(\d+(?:\.\d+)?)\s?(?:crore|cr)\b",        1e7,  1.0 / _INR_PER_USD),
        (r"(\d+(?:\.\d+)?)\s?crore\b",                     1e7,  1.0 / _INR_PER_USD),
    ]
    for pat, multiplier, fx in patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            return int(float(m.group(1)) * multiplier * fx)
    return None


def extract_round_type(text: str) -> Optional[str]:
    lower = text.lower()
    for round_name, keywords in ROUND_KEYWORDS.items():
        if any(kw in lower for kw in keywords):
            return round_name
    return None


def derive_stage(round_type: Optional[str]) -> Optional[str]:
    if not round_type:
        return None
    rt = round_type.lower()
    if rt in ("pre-seed", "seed", "grant"):
        return "Early"
    if rt in ("series a", "series b", "bridge"):
        return "Growth"
    if rt in ("series c", "series d", "series e", "series f",
              "series g", "series h", "pre-ipo", "post-ipo"):
        return "Late"
    return None


def parse_date(entry) -> str:
    ts = getattr(entry, "published_parsed", None) or getattr(entry, "updated_parsed", None)
    if ts:
        try:
            return datetime(*ts[:6], tzinfo=timezone.utc).date().isoformat()
        except Exception:
            pass
    return datetime.now(timezone.utc).date().isoformat()


def fetch_article_text(url: str) -> str:
    """Fetch first 10 paragraphs for richer extraction. Fail silently."""
    try:
        resp = requests.get(url, timeout=8, headers=_HEADERS, allow_redirects=True)
        soup = BeautifulSoup(resp.text, "html.parser")
        return " ".join(p.get_text() for p in soup.find_all("p")[:10])
    except Exception:
        return ""


def clean_html(raw: str) -> str:
    text = BeautifulSoup(raw, "html.parser").get_text(separator=" ")
    return re.sub(r"\s+", " ", text).strip()


def truncate(text: str, max_chars: int = 400) -> str:
    if len(text) <= max_chars:
        return text
    return text[:max_chars].rsplit(" ", 1)[0] + "…"


def fetch_feed_with_retry(url: str, max_attempts: int = 3):
    for attempt in range(1, max_attempts + 1):
        try:
            resp = requests.get(url, headers=_HEADERS, timeout=15, allow_redirects=True)
            resp.raise_for_status()
            feed = feedparser.parse(resp.text)
            if feed.entries:
                return feed
            if attempt < max_attempts:
                time.sleep(5)
        except Exception as e:
            if attempt == max_attempts:
                raise
            log.warning("  Feed attempt %d failed for %s: %s. Retrying...", attempt, url, e)
            time.sleep(5)
    # Return last attempt result even if empty
    resp = requests.get(url, headers=_HEADERS, timeout=15, allow_redirects=True)
    return feedparser.parse(resp.text)


# ── Feed scraping ──────────────────────────────────────────────────────────────

def scrape_feed(feed_cfg: dict) -> list[dict]:
    feed_url  = feed_cfg["url"]
    feed_name = feed_cfg["name"]
    results: list[dict] = []

    log.info("  Fetching %-20s  %s", feed_name, feed_url)
    try:
        feed = fetch_feed_with_retry(feed_url)
    except Exception as e:
        log.warning("  [%s] Feed fetch failed: %s", feed_name, e)
        return results

    if feed.bozo and not feed.entries:
        log.warning("  [%s] Feed parse error: %s", feed_name, feed.bozo_exception)
        return results

    log.info("  [%s] %d entries in feed", feed_name, len(feed.entries))

    for entry in feed.entries:
        title   = clean_html(entry.get("title", "")).strip()
        summary = clean_html(entry.get("summary", "") or entry.get("description", ""))
        url     = (entry.get("link") or "").strip()

        if not title or not url:
            continue
        if not is_funding_article(title, summary):
            continue

        # Fetch article body for richer extraction; polite delay
        body = fetch_article_text(url)
        time.sleep(0.5)
        combined = f"{title} {summary} {body}"

        company_name = extract_company_name(title)
        if not company_name:
            log.debug("    Skipped (no company name): %.60s", title)
            continue

        lead_investor = extract_lead_investor(combined)
        amount_usd    = extract_amount_usd(combined)
        round_type    = extract_round_type(combined)
        sector        = extract_sector_shared(combined)
        location      = extract_city_shared(combined)
        stage         = derive_stage(round_type)
        announced_at  = parse_date(entry)
        description   = truncate(summary) if summary else None

        record = {
            "company_name":  company_name,
            "sector":        sector,
            "stage":         stage,
            "country":       "India",
            "location":      location,
            "description":   description,
            "amount_usd":    amount_usd,
            "round_type":    round_type,
            "lead_investor": lead_investor,
            "co_investors":  [],
            "announced_at":  announced_at,
            "source_url":    url,
            "source_name":   feed_name,
        }
        results.append(record)
        log.info(
            "    ✓ %-30s | %-10s | %s",
            company_name[:30],
            round_type or "—",
            f"${amount_usd:,}" if amount_usd else "—",
        )

    return results


# ── Supabase helpers ───────────────────────────────────────────────────────────

def insert_new(records: list[dict]) -> tuple[int, int]:
    """
    Dedup against existing source_urls in funding_rounds, then batch-insert
    only the truly new ones.
    """
    if not records:
        return 0, 0

    urls = [r["source_url"] for r in records]
    try:
        existing_res = (
            supabase
            .table("funding_rounds")
            .select("source_url")
            .in_("source_url", urls)
            .execute()
        )
        existing_urls = {row["source_url"] for row in (existing_res.data or [])}
    except Exception as e:
        log.error("  Failed to fetch existing records: %s", e)
        existing_urls = set()

    new_records = [r for r in records if r["source_url"] not in existing_urls]
    skipped = len(records) - len(new_records)

    if not new_records:
        return 0, skipped

    try:
        result = (
            supabase
            .table("funding_rounds")
            .insert(new_records)
            .execute()
        )
        inserted = len(result.data) if result.data else 0
        return inserted, skipped
    except Exception as e:
        log.error("  Supabase insert error: %s", e)
        return 0, skipped + len(new_records)


def delete_old_funding(days: int = 30) -> None:
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    try:
        res = (
            supabase
            .table("funding_rounds")
            .delete()
            .lt("announced_at", cutoff)
            .execute()
        )
        log.info(
            "Deleted %d funding rows older than %d days",
            len(res.data) if res.data else 0,
            days,
        )
    except Exception as e:
        log.error("  Cleanup error: %s", e)


# ── Main ───────────────────────────────────────────────────────────────────────

def main() -> None:
    log.info("=" * 60)
    log.info("Capital Connect — Funding Events Scraper")
    log.info("Started at %s", datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"))
    log.info("=" * 60)

    all_records: list[dict] = []
    sources_ok     = 0
    sources_failed = 0

    for feed_cfg in RSS_FEEDS:
        records = scrape_feed(feed_cfg)
        if records:
            sources_ok += 1
            all_records.extend(records)
        else:
            sources_failed += 1

    log.info("-" * 60)
    log.info("Funding articles collected : %d", len(all_records))

    # In-memory dedup by source_url
    seen: set[str] = set()
    unique: list[dict] = []
    for r in all_records:
        if r["source_url"] not in seen:
            seen.add(r["source_url"])
            unique.append(r)

    log.info("After URL dedup           : %d unique records", len(unique))

    inserted, skipped = insert_new(unique)

    # Cleanup old rows
    log.info("-" * 60)
    delete_old_funding(30)

    log.info("=" * 60)
    log.info(
        "Done — %d inserted, %d skipped (duplicates) | %d/%d sources ok",
        inserted, skipped, sources_ok, len(RSS_FEEDS),
    )
    log.info("=" * 60)

    if sources_ok == 0:
        log.error("All sources failed. Exiting with code 1.")
        sys.exit(1)


if __name__ == "__main__":
    main()
