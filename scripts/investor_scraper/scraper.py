"""
Capital Connect — Investor Data Scraper
========================================
Scrapes VC firm team / portfolio pages to extract investor profiles
and upserts into the Supabase `scraped_investors` table.

-- CLEANUP: Run in Supabase Studio immediately
-- Step 1: Delete IAN Group role strings stored as names
-- DELETE FROM scraped_investors
-- WHERE institution = 'IAN Group'
--   AND (name LIKE '%, %'
--        OR name ILIKE '%founder%'
--        OR name ILIKE '%chairman%'
--        OR name ILIKE '%director%'
--        OR name ILIKE '%ceo%'
--        OR name ILIKE '%coo%'
--        OR name ILIKE '%partner%'
--        OR name ILIKE '%managing%');
--
-- Step 2: Review and delete wrong Accel rows:
-- SELECT name, institution FROM scraped_investors
-- WHERE institution = 'Accel'
--   AND source_type = 'portfolio_page'
-- ORDER BY name;
-- Then delete names that are not real investor names.

Confirmed DB columns (scraped_investors):
    name                string   required
    institution         string?
    title               string?
    location            string?
    sectors             string[] required (default [])
    stages              string[] required (default [])
    check_min           string?
    check_max           string?
    funding_type        string?
    typical_equity      string?
    investment_thesis   string?
    portfolio_count     int?
    recent_investments  string[] required (default [])
    verified            bool     required
    response_rate       string?
    actively_investing  bool     required
    email               string?
    website             string?
    linkedin_url        string?
    source_url          string   required
    source_type         string   required  → "portfolio_page" (live) | "known_partners" (fallback)
    is_new              bool     required
    date_added          string   required
    updated_at          string   required
    created_at          auto

Usage:
    python scraper.py

Required env vars (same .env as news_scraper / funding_scraper):
    SUPABASE_URL
    SUPABASE_SERVICE_ROLE_KEY
"""

import asyncio
import os
import re
import sys
import time
import logging
from datetime import datetime, timezone
from typing import Optional

import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from supabase import create_client, Client


from dotenv import load_dotenv
import os

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")



# Playwright is optional — falls back gracefully if not installed
try:
    from playwright.async_api import async_playwright
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False

# ── Bootstrap ─────────────────────────────────────────────────────────────────
load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-7s  %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%SZ",
)
log = logging.getLogger("investor_scraper")

SUPABASE_URL              = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    log.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

TODAY = datetime.now(timezone.utc).isoformat()

# ── Request config ─────────────────────────────────────────────────────────────
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}
TIMEOUT   = 14
DELAY_SEC = 2  # polite crawl delay between requests

# ── Sector + Stage maps ────────────────────────────────────────────────────────
SECTOR_KEYWORDS: dict[str, list[str]] = {
    "Fintech":    ["fintech", "payments", "lending", "banking", "insurance",
                   "neobank", "wealthtech", "insurtech", "credit"],
    "HealthTech": ["health", "medical", "pharma", "biotech", "telemedicine",
                   "diagnostics", "wellness", "medtech"],
    "EdTech":     ["edtech", "education", "learning", "e-learning", "upskilling"],
    "AgriTech":   ["agri", "agriculture", "farming", "agritech", "rural", "crop"],
    "Ecommerce":  ["ecommerce", "e-commerce", "retail", "marketplace", "d2c", "dtc"],
    "SaaS":       ["saas", "software", "b2b", "enterprise", "cloud", "dev tools",
                   "developer", "api"],
    "AI/ML":      ["artificial intelligence", " ai ", "machine learning", "deep learning",
                   "llm", "genai", "generative", "computer vision"],
    "Logistics":  ["logistics", "supply chain", "delivery", "shipping", "warehouse",
                   "mobility", "transportation"],
    "Gaming":     ["gaming", "esports", "game studio", "metaverse", "web3"],
    "CleanTech":  ["cleantech", "solar", "ev ", "electric vehicle", "climate",
                   "green energy", "sustainability", "renewable"],
    "Consumer":   ["consumer", "d2c", "brand", "fmcg", "food", "beauty"],
    "DeepTech":   ["deeptech", "deep tech", "robotics", "drone", "space", "defense",
                   "semiconductor", "biotech"],
}

STAGE_KEYWORDS: dict[str, list[str]] = {
    "Pre-Seed": ["pre-seed", "pre seed", "idea stage", "zero to one"],
    "Seed":     ["seed", "seed stage", "early stage", "seed fund", "angel"],
    "Series A": ["series a", "early growth"],
    "Series B": ["series b"],
    "Series C": ["series c", "late stage"],
    "Growth":   ["growth", "growth stage", "expansion", "scale-up"],
}

# ── Title tokens that indicate a role string, not a person's name ─────────────
TITLE_TOKENS = {
    "founder", "co-founder", "cofounder", "chairman", "chairperson",
    "ceo", "cto", "coo", "cfo", "md", "director", "president", "partner",
    "former", "ex", "past", "managing", "general", "executive",
    "vice", "senior", "principal", "associate", "analyst",
}

# ── Known VC firm metadata ─────────────────────────────────────────────────────
FIRM_META: dict[str, dict] = {
    "Accel": {
        "sectors": ["SaaS", "Consumer", "Fintech", "AI/ML"],
        "stages":  ["Seed", "Series A", "Series B"],
        "check_min": "$500K", "check_max": "$50M",
        "funding_type": "Equity",
        "investment_thesis": "Early-to-growth stage technology companies in India and SE Asia.",
        "location": "Bengaluru",
    },
    "Peak XV Partners": {
        "sectors": ["Consumer", "Fintech", "SaaS", "HealthTech"],
        "stages":  ["Seed", "Series A", "Series B", "Growth"],
        "check_min": "$1M", "check_max": "$100M",
        "funding_type": "Equity",
        "investment_thesis": "Partnering with founders from seed to growth across India and SE Asia.",
        "location": "Bengaluru",
    },
    "Elevation Capital": {
        "sectors": ["Consumer", "SaaS", "Fintech", "EdTech"],
        "stages":  ["Seed", "Series A", "Series B"],
        "check_min": "$1M", "check_max": "$75M",
        "funding_type": "Equity",
        "investment_thesis": "Investing in consumer internet and B2B software startups in India.",
        "location": "Gurugram",
    },
    "Nexus Venture Partners": {
        "sectors": ["SaaS", "Consumer", "Fintech", "DeepTech"],
        "stages":  ["Seed", "Series A"],
        "check_min": "$500K", "check_max": "$30M",
        "funding_type": "Equity",
        "investment_thesis": "Seed and Series A investments in technology startups in India and US.",
        "location": "Bengaluru",
    },
    "Blume Ventures": {
        "sectors": ["SaaS", "Fintech", "Consumer", "DeepTech"],
        "stages":  ["Pre-Seed", "Seed", "Series A"],
        "check_min": "$100K", "check_max": "$5M",
        "funding_type": "Equity",
        "investment_thesis": "India's leading pre-seed and seed fund backing technology founders.",
        "location": "Mumbai",
    },
    "Kalaari Capital": {
        "sectors": ["Consumer", "SaaS", "HealthTech", "Fintech"],
        "stages":  ["Seed", "Series A", "Series B"],
        "check_min": "$1M", "check_max": "$30M",
        "funding_type": "Equity",
        "investment_thesis": "Early-stage technology investing focused on Indian consumer and enterprise.",
        "location": "Bengaluru",
    },
    "Matrix Partners India": {
        "sectors": ["SaaS", "Fintech", "Consumer", "HealthTech"],
        "stages":  ["Seed", "Series A", "Series B"],
        "check_min": "$1M", "check_max": "$50M",
        "funding_type": "Equity",
        "investment_thesis": "Partnering with founders at seed and early growth stages in India.",
        "location": "Mumbai",
    },
    "IAN Group": {
        "sectors": ["Fintech", "HealthTech", "EdTech", "AgriTech", "SaaS"],
        "stages":  ["Pre-Seed", "Seed"],
        "check_min": "$50K", "check_max": "$1M",
        "funding_type": "Equity",
        "investment_thesis": "India's largest angel network investing in early-stage startups.",
        "location": "Delhi",
    },
    "Sequoia India": {
        "sectors": ["Consumer", "SaaS", "Fintech", "HealthTech"],
        "stages":  ["Seed", "Series A", "Series B", "Growth"],
        "check_min": "$1M", "check_max": "$100M",
        "funding_type": "Equity",
        "investment_thesis": "Helping founders build legendary companies in India and SE Asia.",
        "location": "Bengaluru",
    },
    "Lightspeed India": {
        "sectors": ["Consumer", "Fintech", "SaaS", "HealthTech"],
        "stages":  ["Seed", "Series A", "Series B"],
        "check_min": "$500K", "check_max": "$50M",
        "funding_type": "Equity",
        "investment_thesis": "Partnering with extraordinary founders at every stage.",
        "location": "Bengaluru",
    },
    "Chiratae Ventures": {
        "sectors": ["SaaS", "Consumer", "HealthTech", "Fintech"],
        "stages":  ["Seed", "Series A"],
        "check_min": "$500K", "check_max": "$20M",
        "funding_type": "Equity",
        "investment_thesis": "Early-stage investments in technology-led companies in India.",
        "location": "Bengaluru",
    },
    "India Quotient": {
        "sectors": ["Consumer", "Fintech", "EdTech", "AgriTech"],
        "stages":  ["Pre-Seed", "Seed"],
        "check_min": "$100K", "check_max": "$3M",
        "funding_type": "Equity",
        "investment_thesis": "Investing in startups for Bharat — the next billion Indian internet users.",
        "location": "Mumbai",
    },
    "3one4 Capital": {
        "sectors": ["SaaS", "DeepTech", "Consumer", "Fintech"],
        "stages":  ["Pre-Seed", "Seed", "Series A"],
        "check_min": "$250K", "check_max": "$10M",
        "funding_type": "Equity",
        "investment_thesis": "Partnering with founders of defensible, scalable technology companies.",
        "location": "Bengaluru",
    },
    "Stellaris Venture Partners": {
        "sectors": ["SaaS", "Fintech", "Consumer", "HealthTech"],
        "stages":  ["Seed", "Series A"],
        "check_min": "$500K", "check_max": "$10M",
        "funding_type": "Equity",
        "investment_thesis": "Seed-focused fund backing exceptional founders building India-first products.",
        "location": "Bengaluru",
    },
    "WaterBridge Ventures": {
        "sectors": ["Consumer", "SaaS", "AgriTech", "Ecommerce"],
        "stages":  ["Seed", "Series A"],
        "check_min": "$500K", "check_max": "$8M",
        "funding_type": "Equity",
        "investment_thesis": "Backing consumer-first and B2B startups targeting India's next 500M.",
        "location": "Mumbai",
    },
}

# ── Well-known Indian VC partners (fallback / enrichment) ─────────────────────
KNOWN_PARTNERS: list[dict] = [
    # Accel
    {"name": "Prashanth Prakash",    "institution": "Accel",               "title": "Partner",              "linkedin_url": "https://www.linkedin.com/in/prashanth-prakash"},
    {"name": "Shekhar Kirani",       "institution": "Accel",               "title": "Partner",              "linkedin_url": ""},
    {"name": "Anand Daniel",         "institution": "Accel",               "title": "Partner",              "linkedin_url": ""},
    {"name": "Abhinav Chaturvedi",   "institution": "Accel",               "title": "Partner",              "linkedin_url": ""},
    # Peak XV
    {"name": "Shailendra Singh",     "institution": "Peak XV Partners",    "title": "Managing Director",    "linkedin_url": ""},
    {"name": "Rajan Anandan",        "institution": "Peak XV Partners",    "title": "Managing Director",    "linkedin_url": ""},
    {"name": "Mohit Bhatnagar",      "institution": "Peak XV Partners",    "title": "Managing Director",    "linkedin_url": ""},
    {"name": "GV Ravishankar",       "institution": "Peak XV Partners",    "title": "Managing Director",    "linkedin_url": ""},
    # Elevation Capital
    {"name": "Mridul Arora",         "institution": "Elevation Capital",   "title": "Managing Director",    "linkedin_url": ""},
    {"name": "Mayank Khanduja",      "institution": "Elevation Capital",   "title": "Partner",              "linkedin_url": ""},
    {"name": "Deepak Gaur",          "institution": "Elevation Capital",   "title": "Partner",              "linkedin_url": ""},
    # Blume Ventures
    {"name": "Karthik Reddy",        "institution": "Blume Ventures",      "title": "Co-founder",           "linkedin_url": ""},
    {"name": "Sanjay Nath",          "institution": "Blume Ventures",      "title": "Co-founder",           "linkedin_url": ""},
    {"name": "Sajith Pai",           "institution": "Blume Ventures",      "title": "Partner",              "linkedin_url": ""},
    # Nexus
    {"name": "Sandeep Singhal",      "institution": "Nexus Venture Partners", "title": "Co-founder",        "linkedin_url": ""},
    {"name": "Naren Gupta",          "institution": "Nexus Venture Partners", "title": "Co-founder",        "linkedin_url": ""},
    {"name": "Jishnu Bhattacharjee", "institution": "Nexus Venture Partners", "title": "Managing Director", "linkedin_url": ""},
    # Kalaari
    {"name": "Vani Kola",            "institution": "Kalaari Capital",     "title": "Managing Director",    "linkedin_url": ""},
    {"name": "Rajesh Raju",          "institution": "Kalaari Capital",     "title": "Managing Director",    "linkedin_url": ""},
    # Matrix Partners India
    {"name": "Avnish Bajaj",         "institution": "Matrix Partners India", "title": "Co-founder",         "linkedin_url": ""},
    {"name": "Vikram Vaidyanathan",  "institution": "Matrix Partners India", "title": "Managing Director",  "linkedin_url": ""},
    {"name": "Tarun Davda",          "institution": "Matrix Partners India", "title": "Managing Director",  "linkedin_url": ""},
    # Lightspeed India
    {"name": "Hemant Mohapatra",     "institution": "Lightspeed India",    "title": "Partner",              "linkedin_url": ""},
    {"name": "Bejul Somaia",         "institution": "Lightspeed India",    "title": "Partner",              "linkedin_url": ""},
    {"name": "Vaibhav Agrawal",      "institution": "Lightspeed India",    "title": "Partner",              "linkedin_url": ""},
    # Chiratae Ventures
    {"name": "TC Meenakshisundaram", "institution": "Chiratae Ventures",   "title": "Co-founder",           "linkedin_url": ""},
    {"name": "Sudhir Sethi",         "institution": "Chiratae Ventures",   "title": "Co-founder",           "linkedin_url": ""},
    # India Quotient
    {"name": "Anand Lunia",          "institution": "India Quotient",      "title": "Co-founder",           "linkedin_url": ""},
    {"name": "Madhukar Sinha",       "institution": "India Quotient",      "title": "Co-founder",           "linkedin_url": ""},
    # 3one4 Capital
    {"name": "Pranav Pai",           "institution": "3one4 Capital",       "title": "Co-founder",           "linkedin_url": ""},
    {"name": "Siddarth Pai",         "institution": "3one4 Capital",       "title": "Co-founder",           "linkedin_url": ""},
    # Stellaris Venture Partners
    {"name": "Ritesh Banglani",      "institution": "Stellaris Venture Partners", "title": "Partner",       "linkedin_url": ""},
    {"name": "Rahul Chowdhri",       "institution": "Stellaris Venture Partners", "title": "Partner",       "linkedin_url": ""},
    {"name": "Alok Goyal",           "institution": "Stellaris Venture Partners", "title": "Partner",       "linkedin_url": ""},
    # WaterBridge Ventures
    {"name": "Sasha Mirchandani",    "institution": "WaterBridge Ventures", "title": "Founder",             "linkedin_url": ""},
    # IAN Group
    {"name": "Padmaja Ruparel",      "institution": "IAN Group",           "title": "Co-founder",           "linkedin_url": ""},
    {"name": "Sunil Goyal",          "institution": "IAN Group",           "title": "CEO",                  "linkedin_url": ""},
]

# ── Scrape targets ─────────────────────────────────────────────────────────────
SOURCES = [
    {"name": "Accel",                  "website": "https://www.accel.com",          "team_paths": ["/people", "/team"],                          "portfolio_url": "https://www.accel.com/portfolio"},
    {"name": "Peak XV Partners",       "website": "https://www.peakxv.com",         "team_paths": ["/people", "/team", "/about"],                "portfolio_url": "https://www.peakxv.com/companies"},
    {"name": "Elevation Capital",      "website": "https://elevationcapital.com",   "team_paths": ["/team", "/people", "/about"],                "portfolio_url": "https://elevationcapital.com/portfolio"},
    {"name": "Nexus Venture Partners", "website": "https://www.nexusvp.com",        "team_paths": ["/team", "/people", "/about"],                "portfolio_url": "https://www.nexusvp.com/portfolio"},
    {"name": "Blume Ventures",         "website": "https://blume.vc",               "team_paths": ["/team", "/people", "/about"],                "portfolio_url": "https://blume.vc/portfolio"},
    {"name": "Kalaari Capital",        "website": "https://www.kalaari.com",        "team_paths": ["/team", "/people", "/about"],                "portfolio_url": "https://www.kalaari.com/portfolio"},
    {"name": "Matrix Partners India",  "website": "https://www.matrixpartners.in",  "team_paths": ["/team", "/people", "/about", "/"],           "portfolio_url": "https://www.matrixpartners.in/portfolio"},
    {"name": "Lightspeed India",       "website": "https://lsvp.com",               "team_paths": ["/team", "/people"],                          "portfolio_url": "https://lsvp.com/portfolio"},
    {"name": "Chiratae Ventures",      "website": "https://chiratae.com",           "team_paths": ["/team", "/people", "/about"],                "portfolio_url": "https://chiratae.com/portfolio"},
    {"name": "India Quotient",         "website": "https://www.indiaquotient.in",   "team_paths": ["/team", "/about", "/people"],                "portfolio_url": "https://www.indiaquotient.in/portfolio"},
    {"name": "3one4 Capital",          "website": "https://3one4.com",              "team_paths": ["/team", "/people", "/about"],                "portfolio_url": "https://3one4.com/portfolio"},
    {"name": "Stellaris Venture Partners", "website": "https://stellarisvp.com",   "team_paths": ["/team", "/people", "/about"],                "portfolio_url": "https://stellarisvp.com/portfolio"},
    {"name": "WaterBridge Ventures",   "website": "https://www.waterbridge.vc",    "team_paths": ["/team", "/about", "/"],                      "portfolio_url": "https://www.waterbridge.vc/portfolio"},
    {"name": "IAN Group",              "website": "https://iangroup.vc",            "team_paths": ["/team", "/about", "/members", "/"],          "portfolio_url": "https://iangroup.vc"},
]

# ── Helpers ────────────────────────────────────────────────────────────────────

async def _fetch_with_playwright(url: str) -> str:
    """Fetch JS-rendered page content using Playwright headless Chromium."""
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        await page.goto(url, wait_until="networkidle", timeout=30000)
        content = await page.content()
        await browser.close()
        return content


def fetch(url: str) -> Optional[BeautifulSoup]:
    """GET a URL and return BeautifulSoup, or None on any error."""
    try:
        resp = requests.get(url, headers=HEADERS, timeout=TIMEOUT, allow_redirects=True)
        resp.raise_for_status()
        ct = resp.headers.get("content-type", "")
        if "html" not in ct and len(resp.text) < 200:
            return None
        soup = BeautifulSoup(resp.text, "lxml")
        body_text = soup.get_text(separator=" ", strip=True)
        if len(body_text) < 300:
            log.debug("  Page appears JS-rendered (< 300 chars of body text): %s", url)
            return None
        return soup
    except requests.HTTPError as e:
        log.debug("  HTTP %s for %s", e.response.status_code, url)
        return None
    except Exception as e:
        log.debug("  Fetch failed for %s: %s", url, e)
        return None


def fetch_page_content(url: str) -> Optional[BeautifulSoup]:
    """
    Try plain requests first. If the page appears JS-rendered (< 300 chars),
    fall back to Playwright if available.
    """
    soup = fetch(url)
    if soup is not None:
        return soup

    if not PLAYWRIGHT_AVAILABLE:
        return None

    try:
        log.info("    Trying Playwright fallback for %s", url)
        html = asyncio.run(_fetch_with_playwright(url))
        soup = BeautifulSoup(html, "lxml")
        body_text = soup.get_text(separator=" ", strip=True)
        if len(body_text) < 300:
            return None
        return soup
    except Exception as e:
        log.error("    Playwright fetch failed for %s: %s", url, e)
        return None


def clean(s: Optional[str]) -> str:
    if not s:
        return ""
    return re.sub(r"\s+", " ", s.strip())


def looks_like_name(text: str) -> bool:
    """
    Reject strings that are role descriptions, not person names.
    Accepts: 2-5 words, starts with capital, no commas, no title tokens.
    """
    if not text or len(text) < 3:
        return False
    # Reject role strings like "Founder, Luminous Invertors"
    if "," in text:
        return False
    words = text.split()
    if len(words) < 2 or len(words) > 5:
        return False
    if text.isupper():
        return False
    if any(c.isdigit() for c in text):
        return False
    if not text[0].isupper():
        return False
    # Reject if any word is a job title token
    if any(w.lower().rstrip(".-") in TITLE_TOKENS for w in words):
        return False
    skip = {
        "our team", "the team", "leadership team", "meet the", "our people",
        "portfolio companies", "our portfolio", "about us", "contact us",
        "read more", "learn more", "view portfolio", "all rights reserved",
        "privacy policy", "terms of service",
    }
    if text.lower() in skip:
        return False
    return True


def infer_sectors(text: str) -> list[str]:
    lower = text.lower()
    return [s for s, kws in SECTOR_KEYWORDS.items() if any(k in lower for k in kws)]


def infer_stages(text: str) -> list[str]:
    lower = text.lower()
    return [s for s, kws in STAGE_KEYWORDS.items() if any(k in lower for k in kws)]


def make_record(
    name: str,
    institution: str,
    title: str = "Partner",
    location: str = "India",
    sectors: Optional[list[str]] = None,
    stages: Optional[list[str]] = None,
    check_min: Optional[str] = None,
    check_max: Optional[str] = None,
    funding_type: Optional[str] = "Equity",
    investment_thesis: Optional[str] = None,
    website: str = "",
    linkedin_url: str = "",
    source_url: str = "",
    source_type: str = "portfolio_page",
) -> dict:
    """Build a complete scraped_investors row matching the DB schema."""
    return {
        "name":               name,
        "institution":        institution,
        "title":              title,
        "location":           location,
        "sectors":            sectors or [],
        "stages":             stages or [],
        "check_min":          check_min,
        "check_max":          check_max,
        "funding_type":       funding_type,
        "typical_equity":     None,
        "investment_thesis":  investment_thesis,
        "portfolio_count":    None,
        "recent_investments": [],
        "verified":           False,
        "response_rate":      None,
        "actively_investing": True,
        "email":              None,
        "website":            website,
        "linkedin_url":       linkedin_url,
        "source_url":         source_url,
        "source_type":        source_type,
        "is_new":             True,
        "date_added":         TODAY,
        "updated_at":         datetime.now(timezone.utc).isoformat(),
    }


# ── Per-source scraper ─────────────────────────────────────────────────────────

def scrape_source(source: dict) -> tuple[list[dict], bool]:
    """
    Try each team_path for the source. Parse whatever SSR content we get.
    Returns (records, had_live_scrape). Falls back to KNOWN_PARTNERS for this
    institution if no live data is found (source_type = "known_partners").
    """
    name     = source["name"]
    website  = source["website"]
    meta     = FIRM_META.get(name, {})
    f_sectors           = meta.get("sectors", [])
    f_stages            = meta.get("stages", [])
    f_check_min         = meta.get("check_min")
    f_check_max         = meta.get("check_max")
    f_funding_type      = meta.get("funding_type", "Equity")
    f_investment_thesis = meta.get("investment_thesis")
    f_location          = meta.get("location", "India")

    live_soup: Optional[BeautifulSoup] = None
    live_url  = ""

    for path in source.get("team_paths", []):
        url = website.rstrip("/") + path
        log.info("    Trying %s", url)
        soup = fetch_page_content(url)
        time.sleep(DELAY_SEC)
        if soup:
            live_soup = soup
            live_url  = url
            log.info("    Got content from %s", url)
            break

    records: list[dict] = []
    had_live_scrape = False

    if live_soup:
        selectors = [
            ".name", ".person-name", ".team-name", ".member-name", ".partner-name",
            "[class*='person'] h3", "[class*='team'] h3", "[class*='partner'] h3",
            "[class*='people'] h3", "[class*='member'] h3", "[class*='leader'] h3",
            "article h3", ".card h3", ".profile h3",
            "h3", "h4",
        ]
        found_tags: list = []
        for sel in selectors:
            found_tags = live_soup.select(sel)
            if found_tags:
                log.debug("    Selector '%s' returned %d tags", sel, len(found_tags))
                break

        seen_names: set[str] = set()
        page_text = live_soup.get_text()
        live_sectors = infer_sectors(page_text) or f_sectors
        live_stages  = infer_stages(page_text) or f_stages

        for tag in found_tags:
            raw = clean(tag.get_text())
            if not raw or raw in seen_names or not looks_like_name(raw):
                continue
            seen_names.add(raw)

            parent = tag.parent or tag
            title_tag = parent.find(
                class_=re.compile(r"title|role|position|designation|job", re.I)
            )
            title = clean(title_tag.get_text()) if title_tag else "Partner"

            li_tag = parent.find("a", href=re.compile(r"linkedin\.com/in/", re.I))
            linkedin = li_tag["href"] if li_tag else ""

            records.append(make_record(
                name=raw,
                institution=name,
                title=title or "Partner",
                location=f_location,
                sectors=live_sectors,
                stages=live_stages,
                check_min=f_check_min,
                check_max=f_check_max,
                funding_type=f_funding_type,
                investment_thesis=f_investment_thesis,
                website=website,
                linkedin_url=linkedin,
                source_url=live_url,
                source_type="portfolio_page",
            ))

        if records:
            had_live_scrape = True

    # Supplement / fallback with KNOWN_PARTNERS for this institution
    known = [p for p in KNOWN_PARTNERS if p["institution"] == name]
    known_names = {r["name"] for r in records}
    for p in known:
        if p["name"] in known_names:
            continue  # already captured live
        records.append(make_record(
            name=p["name"],
            institution=p["institution"],
            title=p.get("title", "Partner"),
            location=f_location,
            sectors=f_sectors,
            stages=f_stages,
            check_min=f_check_min,
            check_max=f_check_max,
            funding_type=f_funding_type,
            investment_thesis=f_investment_thesis,
            website=website,
            linkedin_url=p.get("linkedin_url", ""),
            source_url=source.get("portfolio_url", website),
            source_type="known_partners",  # distinguishes from live-scraped data
        ))

    # Last resort: insert a firm-level record so the institution shows up
    if not records:
        log.warning("  [%s] No individual names — inserting firm-level record", name)
        records.append(make_record(
            name=name,
            institution=name,
            title="Venture Capital Firm",
            location=f_location,
            sectors=f_sectors,
            stages=f_stages,
            check_min=f_check_min,
            check_max=f_check_max,
            funding_type=f_funding_type,
            investment_thesis=f_investment_thesis,
            website=website,
            source_url=source.get("portfolio_url", website),
            source_type="known_partners",
        ))

    log.info("  [%s] %d records ready (live=%s)", name, len(records), had_live_scrape)
    return records, had_live_scrape


# ── Supabase upsert ────────────────────────────────────────────────────────────

def upsert_batch(records: list[dict]) -> tuple[int, int]:
    """
    Upsert using (name, institution) unique constraint.
    ignore_duplicates=False so existing rows are updated with fresh data.
    """
    if not records:
        return 0, 0
    try:
        result = (
            supabase
            .table("scraped_investors")
            .upsert(records, on_conflict="name,institution", ignore_duplicates=False)
            .execute()
        )
        inserted = len(result.data) if result.data else 0
        skipped  = len(records) - inserted
        return inserted, skipped
    except Exception as e:
        log.error("  Supabase upsert error: %s", e)
        return 0, len(records)


# ── Main ───────────────────────────────────────────────────────────────────────

def main() -> None:
    log.info("=" * 60)
    log.info("Capital Connect — Investor Data Scraper")
    log.info("Started at %s", datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"))
    log.info("Sources: %d VC firms | Playwright: %s", len(SOURCES), PLAYWRIGHT_AVAILABLE)
    log.info("=" * 60)

    total_inserted  = 0
    total_skipped   = 0
    live_scrape_count = 0
    summary: list[str] = []

    for source in SOURCES:
        log.info("\nScraping: %s", source["name"])
        try:
            records, had_live = scrape_source(source)
            if had_live:
                live_scrape_count += 1
        except Exception as e:
            log.error("  [%s] Scraper crashed: %s", source["name"], e)
            summary.append(f"  ✗ {source['name']}: CRASHED — {e}")
            time.sleep(2)
            continue

        inserted, skipped = upsert_batch(records)
        total_inserted += inserted
        total_skipped  += skipped
        summary.append(
            f"  {'✓' if inserted > 0 else '○'} {source['name']}: "
            f"{inserted} upserted, {skipped} unchanged | live={had_live}"
        )
        time.sleep(2)  # polite delay between firms

    log.info("\n" + "=" * 60)
    log.info("Summary")
    log.info("=" * 60)
    for line in summary:
        log.info(line)
    log.info("=" * 60)
    log.info(
        "Total: %d upserted, %d unchanged | %d/%d sources had live scrape",
        total_inserted, total_skipped, live_scrape_count, len(SOURCES),
    )
    log.info("=" * 60)

    if live_scrape_count == 0:
        log.error(
            "::error::All %d live scrapes returned 0 results. "
            "Live scraping may be broken — Playwright or network issue.",
            len(SOURCES),
        )
        sys.exit(1)


if __name__ == "__main__":
    main()
