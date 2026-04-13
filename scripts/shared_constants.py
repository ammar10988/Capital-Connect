"""
Shared constants and helpers for all Capital Connect scrapers.
Import with PYTHONPATH set to repo root:
  from scripts.shared_constants import SECTOR_NAMES, CITY_CANONICAL, ...
"""
from __future__ import annotations

SECTOR_NAMES: dict[str, list[str]] = {
    "AI":            ["artificial intelligence", "ai startup", "ai-powered",
                      "ai platform", "generative ai", "llm", "large language model",
                      "machine learning startup", "deep learning", "ai agent"],
    "SaaS":          ["saas", "software as a service", "b2b saas", "enterprise saas",
                      "cloud software", "devtools", "developer tools", "api platform",
                      "no-code", "low-code", "workflow automation"],
    "Fintech":       ["fintech", "payments", "digital payments", "lending", "neobank",
                      "digital banking", "wealthtech", "bnpl", "buy now pay later",
                      "upi", "credit platform", "financial services", "remittance",
                      "insurtech", "insurance technology", "digital insurance"],
    "Healthtech":    ["healthtech", "health tech", "digital health", "telemedicine",
                      "telehealth", "healthcare platform", "medical technology",
                      "health startup", "wellness app", "mental health", "diagnostics",
                      "medtech", "hospital management", "health monitoring"],
    "Deeptech":      ["deeptech", "deep tech", "semiconductor", "quantum computing",
                      "nanotechnology", "computer vision", "neural network",
                      "edge computing", "hardware startup", "robotics startup",
                      "industrial robots", "autonomous robots", "drone startup"],
    "EV":            ["electric vehicle", "ev startup", "ev charging",
                      "electric mobility", "electric scooter", "electric bike",
                      "ev battery", "charging station", "electric two-wheeler"],
    "Cleantech":     ["cleantech", "clean technology", "clean energy",
                      "renewable energy", "solar", "wind energy", "hydrogen",
                      "energy storage", "green hydrogen", "sustainable energy"],
    "Climate":       ["climate tech", "climate startup", "carbon credits",
                      "carbon offset", "net zero", "sustainability startup",
                      "esg", "carbon neutral", "carbon capture", "decarbonization"],
    "Edtech":        ["edtech", "ed-tech", "education technology", "online learning",
                      "e-learning", "upskilling", "reskilling", "learning platform",
                      "skill development", "lms", "coding bootcamp", "test prep"],
    "Agritech":      ["agritech", "agri-tech", "agriculture technology",
                      "farming startup", "crop management", "precision farming",
                      "smart farming", "kisan", "farm management", "agri platform"],
    "Ecommerce":     ["ecommerce", "e-commerce", "retail", "marketplace", "d2c",
                      "direct to consumer", "quick commerce", "q-commerce",
                      "consumer brand", "consumer startup", "subscription box"],
    "Logistics":     ["logistics startup", "supply chain", "last mile delivery",
                      "freight startup", "fleet management", "warehouse tech",
                      "cold chain", "shipping startup", "courier startup",
                      "reverse logistics", "cross border logistics"],
    "Biotech":       ["biotech", "biotechnology", "life sciences", "genomics",
                      "drug discovery", "pharmaceutical startup", "biopharma",
                      "clinical research", "synthetic biology", "cell therapy"],
    "Blockchain":    ["blockchain", "cryptocurrency", "crypto startup", "defi",
                      "decentralized finance", "nft", "smart contracts", "ethereum",
                      "solana", "blockchain platform", "digital assets", "web3"],
    "Cybersecurity": ["cybersecurity", "cyber security", "information security",
                      "data security", "network security", "cloud security",
                      "threat detection", "zero trust", "security startup"],
    "Proptech":      ["proptech", "real estate tech", "real estate startup",
                      "property technology", "real estate platform", "commercial real estate"],
    "Traveltech":    ["traveltech", "travel tech", "travel startup", "travel platform",
                      "visa processing", "flight booking", "hotel tech", "tourism tech"],
    "HRtech":        ["hrtech", "hr tech", "human resources technology", "workforce",
                      "talent management", "payroll startup", "recruitment platform"],
    "Legaltech":     ["legaltech", "legal tech", "legal startup", "legal platform",
                      "law tech", "contract management"],
    "FoodTech":      ["foodtech", "food tech", "food technology", "cloud kitchen",
                      "food delivery", "restaurant tech", "alternative protein",
                      "food startup", "ghost kitchen", "meal kit"],
    "Gaming":        ["gaming startup", "game studio", "mobile gaming", "online gaming",
                      "esports", "gaming platform", "fantasy sports", "real money gaming"],
    "Defence":       ["defence startup", "defense startup", "defence tech",
                      "military technology", "aerospace defence", "drone defence",
                      "surveillance", "border security"],
    "AdTech":        ["adtech", "ad tech", "advertising technology", "digital advertising",
                      "programmatic advertising", "marketing technology", "martech"],
    "B2B":           ["b2b startup", "business to business", "b2b platform",
                      "enterprise solution", "b2b marketplace", "procurement platform"],
}

CITY_CANONICAL: dict[str, list[str]] = {
    "Bengaluru":  ["bengaluru", "bangalore", "bengalore"],
    "Mumbai":     ["mumbai", "bombay", "navi mumbai"],
    "Delhi":      ["delhi", "new delhi", "ncr", "gurugram", "gurgaon",
                   "noida", "faridabad", "ghaziabad", "greater noida"],
    "Hyderabad":  ["hyderabad", "secunderabad", "cyberabad"],
    "Chennai":    ["chennai", "madras"],
    "Pune":       ["pune", "pimpri"],
    "Kolkata":    ["kolkata", "calcutta"],
    "Ahmedabad":  ["ahmedabad", "amdavad"],
    "Jaipur":     ["jaipur"],
    "Indore":     ["indore"],
    "Chandigarh": ["chandigarh"],
    "Kochi":      ["kochi", "cochin", "ernakulam"],
    "Surat":      ["surat"],
    "Nagpur":     ["nagpur"],
    "Lucknow":    ["lucknow"],
    "Bhopal":     ["bhopal"],
}

INVALID_COMPANY_NAMES: set[str] = {
    "indian startups", "indian startup", "startups", "startup", "indian",
    "india", "new", "the", "a", "an", "company", "companies", "firm", "firms",
    "funding", "investment", "venture", "capital", "tech startup",
    "tech startups", "fintech startup", "healthtech startup",
    "edtech startup", "saas startup", "mumbai", "delhi", "bengaluru",
    "bangalore", "hyderabad", "chennai", "pune", "startups raise",
    "belgium", "belgium's imec", "imec",
}


def extract_sector_shared(text: str) -> str | None:
    """Score-based sector extraction — returns highest scoring sector."""
    lower = text.lower()
    scores: dict[str, int] = {}
    for sector, kws in SECTOR_NAMES.items():
        score = sum(1 for k in kws if k in lower)
        if score > 0:
            scores[sector] = score
    return max(scores, key=lambda s: scores[s]) if scores else None


def extract_city_shared(text: str) -> str | None:
    """Returns canonical city name."""
    lower = text.lower()
    for city, aliases in CITY_CANONICAL.items():
        if any(a in lower for a in aliases):
            return city
    return None


def strip_html_shared(text: str) -> str:
    """Strip HTML tags and decode HTML entities."""
    import re
    from html import unescape
    if not text:
        return ""
    text = re.sub(r"<[^>]+>", " ", text)
    text = unescape(text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def add_retry(func, max_attempts: int = 3, delay: int = 5):
    """Retry wrapper for network calls."""
    import time
    import logging
    log = logging.getLogger(__name__)

    def wrapper(*args, **kwargs):
        for attempt in range(1, max_attempts + 1):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                if attempt == max_attempts:
                    raise
                log.warning(f"Attempt {attempt} failed: {e}. Retrying in {delay}s...")
                time.sleep(delay)

    return wrapper
