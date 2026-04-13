"""
Capital Connect — News Feed Scraper
====================================
Fetches articles from 8 India-focused RSS sources, auto-categorises them,
extracts sector tags, deduplicates by URL and title, and upserts into the
Supabase `news_articles` table. Runs every 6 hours via GitHub Actions.

Usage:
    python scraper.py

Required environment variables (see .env.example):
    SUPABASE_URL
    SUPABASE_SERVICE_ROLE_KEY
"""

import os
import re
import sys
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

import feedparser
import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from supabase import create_client, Client

from scripts.shared_constants import extract_sector_shared

# ---------------------------------------------------------------------------
# Bootstrap
# ---------------------------------------------------------------------------

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-7s  %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%SZ",
)
log = logging.getLogger("news_scraper")

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    log.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# ---------------------------------------------------------------------------
# RSS Feed sources — 4 dead feeds replaced with verified alternatives
# ---------------------------------------------------------------------------

RSS_SOURCES = [
    {"url": "https://yourstory.com/feed",                                                                    "source_name": "YourStory"},
    {"url": "https://inc42.com/feed/",                                                                       "source_name": "Inc42"},
    {"url": "https://economictimes.indiatimes.com/small-biz/startups/rssfeeds/13357270.cms",                 "source_name": "Economic Times"},
    {"url": "https://news.google.com/rss/search?q=india+startup+funding&hl=en-IN&gl=IN&ceid=IN:en",         "source_name": "Google News"},
    # Replacements for dead feeds (VCCircle, Entrackr, Livemint, Business Standard)
    {"url": "https://the-ken.com/feed/",                                                                     "source_name": "The Ken"},
    {"url": "https://www.livemint.com/rss/companies",                                                        "source_name": "Mint Startups"},
    {"url": "https://www.moneycontrol.com/rss/business.xml",                                                 "source_name": "Moneycontrol"},
    {"url": "https://www.thehindubusinessline.com/feeder/default.rss",                                       "source_name": "Hindu Business"},
]

# Publisher homepage URLs (used as source_url instead of raw feed URL)
PUBLISHER_HOMEPAGE = {
    "YourStory":      "https://yourstory.com",
    "Inc42":          "https://inc42.com",
    "Economic Times": "https://economictimes.indiatimes.com",
    "Google News":    "https://news.google.com",
    "The Ken":        "https://the-ken.com",
    "Mint Startups":  "https://www.livemint.com",
    "Moneycontrol":   "https://www.moneycontrol.com",
    "Hindu Business": "https://www.thehindubusinessline.com",
}

FEATURED_SOURCES = {"Inc42", "YourStory"}

# ---------------------------------------------------------------------------
# Category detection
# ---------------------------------------------------------------------------

CATEGORY_RULES: list[tuple[str, list[str]]] = [
    ("Funding",     ["raised", "funding", "round", "crore", "million", "investment",
                     "seed", "series a", "series b", "series c", "pre-seed",
                     "backed", "investors pour", "valuation"]),
    ("Acquisition", ["acquired", "acquisition", "merger", "acquires", "buys",
                     "takeover", "acqui-hire"]),
    ("IPO",         ["ipo", "listing", "public offering", "goes public",
                     "stock exchange", "market debut", "sebi filing"]),
    ("People",      ["appoints", "joins", "named", "promoted", "hires", "ceo",
                     "co-founder", "leadership", "stepping down", "resigns"]),
    ("Policy",      ["rbi", "sebi", "government", "regulation", "policy",
                     "ministry", "compliance", "mandate", "framework", "law"]),
    ("Technology",  ["ai", "saas", "fintech", "deeptech", "machine learning",
                     "artificial intelligence", "platform", "launch", "product",
                     "software", "api", "b2b"]),
]


def detect_category(text: str) -> str:
    """Return the first matching category or 'News' as fallback."""
    lower = text.lower()
    for category, keywords in CATEGORY_RULES:
        if any(kw in lower for kw in keywords):
            return category
    return "News"


# ---------------------------------------------------------------------------
# Sector tag extraction — uses shared score-based function
# ---------------------------------------------------------------------------

def extract_sector_tags(text: str) -> list[str]:
    """Return list with highest-scoring sector, or empty list."""
    sector = extract_sector_shared(text)
    return [sector] if sector else []


# ---------------------------------------------------------------------------
# Image extraction helpers
# ---------------------------------------------------------------------------

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (compatible; CapitalConnectBot/1.0; "
        "+https://capitalconnect.in)"
    )
}

# Sources where RSS provides no image data — fetch og:image from the article page.
OG_IMAGE_SOURCES = {"Google News"}


def _og_image_from_url(url: str) -> Optional[str]:
    """
    Fetch the article page and extract og:image or twitter:image meta tag.
    Hard timeout of 3 s — returns None on any failure so scraping never stalls.
    For Google News URLs the redirect is followed automatically.
    """
    try:
        resp = requests.get(url, headers=_HEADERS, timeout=3, allow_redirects=True)
        if resp.status_code != 200:
            return None
        soup = BeautifulSoup(resp.text, "html.parser")
        for attr, name in [("property", "og:image"), ("name", "twitter:image")]:
            tag = soup.find("meta", {attr: name})
            if tag and tag.get("content"):
                img = tag["content"].strip()
                if img.startswith("http"):
                    return img
        return None
    except Exception:
        return None


def _image_from_entry(entry: feedparser.FeedParserDict) -> Optional[str]:
    """
    Try to extract an image URL from a feedparser entry.
    Priority: media:content → media:thumbnail → enclosure → content img tag.
    """
    # 1. media:content
    media_content = entry.get("media_content", [])
    if media_content:
        url = media_content[0].get("url", "")
        if url:
            return url

    # 2. media:thumbnail
    media_thumbnail = entry.get("media_thumbnail", [])
    if media_thumbnail:
        url = media_thumbnail[0].get("url", "")
        if url:
            return url

    # 3. enclosure
    for enc in entry.get("enclosures", []):
        if enc.get("type", "").startswith("image"):
            return enc.get("href") or enc.get("url")

    # 4. First <img> inside content/summary HTML
    for field in ("content", "summary"):
        raw = ""
        val = entry.get(field)
        if isinstance(val, list) and val:
            raw = val[0].get("value", "")
        elif isinstance(val, str):
            raw = val
        if raw:
            soup = BeautifulSoup(raw, "html.parser")
            img = soup.find("img")
            if img and img.get("src"):
                return img["src"]

    return None


def _clean_summary(raw: str, max_chars: int = 300) -> str:
    """Strip HTML tags and truncate to max_chars."""
    text = BeautifulSoup(raw, "html.parser").get_text(separator=" ")
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) > max_chars:
        text = text[:max_chars].rsplit(" ", 1)[0] + "…"
    return text


def _parse_datetime(entry: feedparser.FeedParserDict) -> Optional[str]:
    """Return ISO-8601 UTC string from feedparser entry, or None."""
    ts = entry.get("published_parsed") or entry.get("updated_parsed")
    if ts:
        try:
            dt = datetime(*ts[:6], tzinfo=timezone.utc)
            return dt.isoformat()
        except Exception:
            pass
    raw = entry.get("published") or entry.get("updated") or ""
    if raw:
        for fmt in (
            "%a, %d %b %Y %H:%M:%S %z",
            "%a, %d %b %Y %H:%M:%S GMT",
            "%Y-%m-%dT%H:%M:%S%z",
        ):
            try:
                dt = datetime.strptime(raw.strip(), fmt)
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                return dt.astimezone(timezone.utc).isoformat()
            except ValueError:
                continue
    return None


def _published_within_hours(entry: feedparser.FeedParserDict, hours: int) -> bool:
    """Return True if article was published within the last `hours` hours."""
    ts = entry.get("published_parsed") or entry.get("updated_parsed")
    if not ts:
        return False
    try:
        dt = datetime(*ts[:6], tzinfo=timezone.utc)
        return (datetime.now(timezone.utc) - dt).total_seconds() < hours * 3600
    except Exception:
        return False


# ---------------------------------------------------------------------------
# Per-feed fetch
# ---------------------------------------------------------------------------

def fetch_feed_with_retry(url: str, max_attempts: int = 3) -> feedparser.FeedParserDict:
    """Fetch and parse RSS feed with up to max_attempts retries."""
    import time
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
    # Last attempt — return whatever we got
    resp = requests.get(url, headers=_HEADERS, timeout=15, allow_redirects=True)
    resp.raise_for_status()
    return feedparser.parse(resp.text)


def fetch_feed(source: dict) -> list[dict]:
    """
    Parse one RSS source and return a list of article dicts ready for Supabase.
    Never raises — logs errors and returns [].
    """
    url         = source["url"]
    source_name = source["source_name"]
    articles: list[dict] = []

    log.info("  Fetching %-20s  %s", source_name, url)

    try:
        feed = fetch_feed_with_retry(url)
    except Exception as exc:
        log.warning("  [%s] Fetch failed: %s", source_name, exc)
        return []

    if feed.bozo and not feed.entries:
        log.warning("  [%s] Feed parse error (bozo): %s", source_name, feed.bozo_exception)
        return []

    now_utc          = datetime.now(timezone.utc)
    cutoff_featured  = now_utc - timedelta(hours=24)
    publisher_url    = PUBLISHER_HOMEPAGE.get(source_name, url)

    for entry in feed.entries:
        title: str    = (entry.get("title") or "").strip()
        url_art: str  = (entry.get("link") or "").strip()

        if not title or not url_art:
            continue

        raw_summary = entry.get("summary") or entry.get("description") or ""
        summary     = _clean_summary(raw_summary) if raw_summary else None

        image_url    = _image_from_entry(entry)

        # Google News RSS has no image data — fetch og:image from the article page.
        if source_name in OG_IMAGE_SOURCES and not image_url:
            og = _og_image_from_url(url_art)
            if og:
                image_url = og

        published_at = _parse_datetime(entry)

        # Category and sectors from title + summary combined
        combined_text = f"{title} {summary or ''}"
        category      = detect_category(combined_text)
        sector_tags   = extract_sector_tags(combined_text)

        # is_featured: premium source + has image + published within 24 h
        is_featured = False
        if source_name in FEATURED_SOURCES and image_url and published_at:
            try:
                pub_dt = datetime.fromisoformat(published_at)
                if pub_dt.tzinfo is None:
                    pub_dt = pub_dt.replace(tzinfo=timezone.utc)
                if pub_dt >= cutoff_featured:
                    is_featured = True
            except ValueError:
                pass

        # is_hot: recent funding article with funding verb in title
        is_hot = (
            category == "Funding"
            and _published_within_hours(entry, 24)
            and any(kw in title.lower() for kw in
                    ["raises", "raised", "secures", "funding", "series"])
        )

        articles.append(
            {
                "title":       title,
                "url":         url_art,
                "summary":     summary,
                "image_url":   image_url,
                "source_name": source_name,
                "source_url":  publisher_url,  # publisher homepage, not raw feed URL
                "published_at": published_at,
                "fetched_at":  now_utc.isoformat(),
                "category":    category,
                "sector_tags": sector_tags,
                "is_featured": is_featured,
                "is_hot":      is_hot,
            }
        )

    log.info("  [%s] Parsed %d entries", source_name, len(articles))
    return articles


# ---------------------------------------------------------------------------
# Supabase helpers
# ---------------------------------------------------------------------------

def upsert_articles(articles: list[dict]) -> tuple[int, int]:
    """
    Upsert articles into news_articles, ignoring URL conflicts.
    Returns (inserted_count, skipped_count).
    """
    if not articles:
        return 0, 0

    try:
        result = (
            supabase.table("news_articles")
            .upsert(articles, on_conflict="url", ignore_duplicates=True)
            .execute()
        )
        inserted = len(result.data) if result.data else 0
        skipped  = len(articles) - inserted
        return inserted, skipped
    except Exception as exc:
        log.error("  Supabase upsert error: %s", exc)
        return 0, len(articles)


def delete_old_articles(days: int = 30) -> int:
    """Delete articles older than `days` days. Returns count deleted."""
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    try:
        result = (
            supabase.table("news_articles")
            .delete()
            .lt("published_at", cutoff)
            .execute()
        )
        return len(result.data) if result.data else 0
    except Exception as exc:
        log.error("  Failed to delete old articles: %s", exc)
        return 0


# ---------------------------------------------------------------------------
# Main pipeline
# ---------------------------------------------------------------------------

def run() -> None:
    log.info("=" * 60)
    log.info("Capital Connect — News Feed Scraper")
    log.info("Started at %s", datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"))
    log.info("=" * 60)

    total_fetched  = 0
    total_inserted = 0
    total_skipped  = 0
    sources_ok     = 0
    sources_failed = 0

    # In-memory dedup by URL and normalized title to prevent cross-source duplicates
    seen_urls:   set[str] = set()
    seen_titles: set[str] = set()
    all_articles: list[dict] = []

    for source in RSS_SOURCES:
        articles = fetch_feed(source)
        if articles:
            sources_ok += 1
            for article in articles:
                art_url   = article["url"]
                norm_title = re.sub(r"\s+", " ", article["title"].lower().strip())
                if art_url in seen_urls or norm_title in seen_titles:
                    log.debug("  Skipping cross-source duplicate: %.60s", article["title"])
                    continue
                seen_urls.add(art_url)
                seen_titles.add(norm_title)
                all_articles.append(article)
        else:
            sources_failed += 1

    total_fetched = len(all_articles)
    log.info("Total unique articles after cross-source dedup: %d", total_fetched)

    if all_articles:
        inserted, skipped = upsert_articles(all_articles)
        total_inserted = inserted
        total_skipped  = skipped
        log.info("  +%d new / %d duplicates", inserted, skipped)

    # Cleanup stale articles
    log.info("-" * 60)
    log.info("Running cleanup (articles older than 30 days)…")
    deleted = delete_old_articles(30)
    log.info("Deleted %d stale articles.", deleted)

    # Summary
    log.info("=" * 60)
    log.info(
        "Pipeline complete: %d new articles inserted from %d/%d sources "
        "(%d fetched total, %d duplicates skipped, %d deleted)",
        total_inserted,
        sources_ok,
        len(RSS_SOURCES),
        total_fetched,
        total_skipped,
        deleted,
    )
    if sources_failed:
        log.warning("%d source(s) failed — check logs above.", sources_failed)
    log.info("=" * 60)

    if sources_ok == 0:
        log.error("All sources failed. Exiting with code 1.")
        sys.exit(1)


if __name__ == "__main__":
    run()
