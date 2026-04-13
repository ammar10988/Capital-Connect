# -- Run in Supabase Studio before re-seeding:
# -- UPDATE public.scraped_investors
# --   SET email = NULL
# --   WHERE email = '' OR email = 'null';

import csv
import os
import sys
from supabase import create_client, Client

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    print("ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

CSV_PATH = r"D:\Garage AI Workspace\capital-connect\1000_investors_enriched.csv"


def map_response_rate(score_str: str) -> str:
    try:
        score = float(score_str)
        if score >= 9:
            return "High"
        elif score >= 8:
            return "Medium"
        else:
            return "Low"
    except (ValueError, TypeError):
        return "Low"


def split_tags(value: str) -> list:
    return [s.strip() for s in value.split(",") if s.strip()]


def run():
    rows = []
    sample_emails = []
    with open(CSV_PATH, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        print(f"CSV columns: {reader.fieldnames}")

        for row in reader:
            name = row.get("Name", "").strip()
            if not name:
                continue

            email_val = (
                row.get("Email") or
                row.get("email") or
                row.get("Email Address") or
                row.get("EmailAddress") or
                row.get("e-mail") or
                row.get("E-Mail") or
                row.get("EMAIL") or ""
            ).strip()
            email = email_val if email_val and "@" in email_val and "." in email_val else None

            if len(sample_emails) < 5:
                sample_emails.append(email_val)

            rows.append({
                "name": name,
                "title": row.get("Role", "").strip() or None,
                "institution": row.get("Organization", "").strip() or None,
                "email": email,
                "linkedin_url": row.get("linkedin", "").strip() or None,
                "location": row.get("location", "").strip() or None,
                "sectors": split_tags(row.get("sectors", "")),
                "stages": split_tags(row.get("investment_stage", "")),
                "response_rate": map_response_rate(row.get("Score", "0")),
                "funding_type": "venture-capital",
                "actively_investing": True,
                "verified": False,
                "source_type": "manual_seed",
                "source_url": "internal_csv",
            })

    print(f"Sample email values from first 5 rows: {sample_emails}")

    # Deduplicate by name+institution (keeps last occurrence)
    seen = {}
    for r in rows:
        seen[(r["name"], r["institution"])] = r
    rows = list(seen.values())
    print(f"Parsed {len(rows)} unique investors. Upserting in batches of 100...")

    inserted = 0
    errors = 0
    batch_size = 100

    for i in range(0, len(rows), batch_size):
        batch = rows[i:i + batch_size]
        try:
            result = supabase.table("scraped_investors").upsert(
                batch,
                on_conflict="name,institution",
                ignore_duplicates=False
            ).execute()
            batch_inserted = len(result.data) if result.data else 0
            inserted += batch_inserted
            print(f"  Batch {i // batch_size + 1}: {batch_inserted} upserted")
        except Exception as e:
            print(f"  ERROR on batch {i // batch_size + 1}: {e}")
            errors += 1

    print(f"\nDone. {inserted} upserted, {errors} batch errors.")


if __name__ == "__main__":
    run()
