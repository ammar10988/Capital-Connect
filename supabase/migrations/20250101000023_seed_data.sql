-- ============================================================
-- SECTORS (8 rows)
-- ============================================================
INSERT INTO public.sectors (name, color, total_deals, avg_deal_usd, total_funding_usd, active_investors, yoy_growth_pct, trend, top_investors) VALUES
  ('AI/ML',      '#6366f1', 142, 8500000,  1207000000, 89, 68.4, 'up',   ARRAY['Sequoia Capital India','Accel','Lightspeed','Matrix Partners','Blume Ventures']),
  ('FinTech',    '#10b981', 198, 12000000, 2376000000, 124, 42.1, 'up',  ARRAY['Tiger Global','Prosus','General Catalyst','Peak XV','QED Investors']),
  ('HealthTech', '#f59e0b', 87,  6200000,  539400000,  56, 31.7, 'up',   ARRAY['Lightspeed','Bessemer','Fundamentum','HealthQuad','Fireside Ventures']),
  ('SaaS',       '#3b82f6', 176, 9800000,  1724800000, 103, 28.9, 'up',  ARRAY['Accel','Sequoia Capital India','SaaS Ventures','Avataar Ventures','Matrix Partners']),
  ('CleanTech',  '#22c55e', 63,  15000000, 945000000,  41, 91.2, 'up',   ARRAY['Ecosystem Integrity Fund','Lightrock','Avaana Capital','Transition VC','ENGIE New Ventures']),
  ('EdTech',     '#ec4899', 54,  4500000,  243000000,  38, -12.3,'down', ARRAY['Learn Capital','Owl Ventures','Sequoia Capital India','Accel','Surge']),
  ('Web3',       '#8b5cf6', 39,  7200000,  280800000,  29, 15.6, 'flat', ARRAY['Multicoin Capital','Pantera Capital','Tiger Global','Coinbase Ventures','Polygon Ventures']),
  ('Consumer',   '#f97316', 112, 11000000, 1232000000, 78, 22.4, 'up',   ARRAY['Elevation Capital','Matrix Partners','Chiratae','Bessemer','Fireside Ventures'])
ON CONFLICT (name) DO UPDATE SET
  color              = EXCLUDED.color,
  total_deals        = EXCLUDED.total_deals,
  avg_deal_usd       = EXCLUDED.avg_deal_usd,
  total_funding_usd  = EXCLUDED.total_funding_usd,
  active_investors   = EXCLUDED.active_investors,
  yoy_growth_pct     = EXCLUDED.yoy_growth_pct,
  trend              = EXCLUDED.trend,
  top_investors      = EXCLUDED.top_investors,
  computed_at        = NOW();

-- ============================================================
-- SECTOR TREND DATA (35 rows: 7 months × 5 sectors, Jan–Jul 2025)
-- ============================================================
INSERT INTO public.sector_trend_data (sector, month, year, deal_count) VALUES
  -- AI/ML
  ('AI/ML', 'Jan', 2025, 18),
  ('AI/ML', 'Feb', 2025, 21),
  ('AI/ML', 'Mar', 2025, 19),
  ('AI/ML', 'Apr', 2025, 26),
  ('AI/ML', 'May', 2025, 31),
  ('AI/ML', 'Jun', 2025, 28),
  ('AI/ML', 'Jul', 2025, 34),
  -- FinTech
  ('FinTech', 'Jan', 2025, 24),
  ('FinTech', 'Feb', 2025, 27),
  ('FinTech', 'Mar', 2025, 22),
  ('FinTech', 'Apr', 2025, 30),
  ('FinTech', 'May', 2025, 33),
  ('FinTech', 'Jun', 2025, 29),
  ('FinTech', 'Jul', 2025, 36),
  -- HealthTech
  ('HealthTech', 'Jan', 2025, 9),
  ('HealthTech', 'Feb', 2025, 11),
  ('HealthTech', 'Mar', 2025, 10),
  ('HealthTech', 'Apr', 2025, 14),
  ('HealthTech', 'May', 2025, 13),
  ('HealthTech', 'Jun', 2025, 16),
  ('HealthTech', 'Jul', 2025, 18),
  -- SaaS
  ('SaaS', 'Jan', 2025, 20),
  ('SaaS', 'Feb', 2025, 23),
  ('SaaS', 'Mar', 2025, 21),
  ('SaaS', 'Apr', 2025, 25),
  ('SaaS', 'May', 2025, 28),
  ('SaaS', 'Jun', 2025, 27),
  ('SaaS', 'Jul', 2025, 32),
  -- CleanTech
  ('CleanTech', 'Jan', 2025, 6),
  ('CleanTech', 'Feb', 2025, 8),
  ('CleanTech', 'Mar', 2025, 7),
  ('CleanTech', 'Apr', 2025, 10),
  ('CleanTech', 'May', 2025, 12),
  ('CleanTech', 'Jun', 2025, 11),
  ('CleanTech', 'Jul', 2025, 14)
ON CONFLICT (sector, month, year) DO UPDATE SET
  deal_count  = EXCLUDED.deal_count,
  computed_at = NOW();

-- ============================================================
-- FUNDING ROUNDS (15 rows)
-- ============================================================
INSERT INTO public.funding_rounds
  (company_name, sector, stage, country, location, description, amount_usd, round_type, lead_investor, co_investors, valuation_usd, announced_at, source_name, source_url)
VALUES
  (
    'Zepto', 'Consumer', 'Growth', 'India', 'Mumbai',
    'Quick-commerce grocery delivery platform expanding to 100 cities.',
    350000000, 'Series F', 'General Catalyst',
    ARRAY['Lightspeed','StepStone Group','Avenir Growth','Lachy Groom'],
    3600000000, '2025-01-14', 'TechCrunch',
    'https://techcrunch.com/2025/01/14/zepto-series-f'
  ),
  (
    'Meesho', 'Consumer', 'Growth', 'India', 'Bengaluru',
    'Social commerce platform for tier-2 and tier-3 India entrepreneurs.',
    275000000, 'Series G', 'Fidelity Management',
    ARRAY['SoftBank','Prosus','Meta','CPPIB'],
    4700000000, '2025-01-28', 'Economic Times',
    'https://economictimes.com/meesho-series-g-2025'
  ),
  (
    'Groww', 'FinTech', 'Growth', 'India', 'Bengaluru',
    'Retail investment platform enabling stock and mutual fund investments.',
    200000000, 'Series F', 'Tiger Global',
    ARRAY['Sequoia Capital India','Ribbit Capital','YC Continuity'],
    3000000000, '2025-02-05', 'Mint',
    'https://livemint.com/groww-series-f-2025'
  ),
  (
    'PhysicsWallah', 'EdTech', 'Growth', 'India', 'Noida',
    'Affordable online education platform for JEE and NEET aspirants.',
    210000000, 'Series B', 'GSV Ventures',
    ARRAY['Westbridge Capital','WestCap Group'],
    2800000000, '2025-02-18', 'Inc42',
    'https://inc42.com/physicswallah-series-b-2025'
  ),
  (
    'Zetwerk', 'SaaS', 'Series E', 'India', 'Bengaluru',
    'B2B manufacturing marketplace connecting buyers with factories.',
    120000000, 'Series E', 'Avenir Growth Capital',
    ARRAY['Lightspeed','Greenoaks Capital','Sequoia Capital India'],
    2700000000, '2025-02-27', 'YourStory',
    'https://yourstory.com/zetwerk-series-e-2025'
  ),
  (
    'Krutrim', 'AI/ML', 'Seed', 'India', 'Bengaluru',
    'India-first AI compute and LLM platform by Bhavish Aggarwal.',
    50000000, 'Seed', 'Lightspeed Venture Partners',
    ARRAY['Ola Founder Bhavish Aggarwal'],
    1000000000, '2025-01-10', 'TechCrunch',
    'https://techcrunch.com/2025/01/10/krutrim-unicorn'
  ),
  (
    'Ola Electric', 'CleanTech', 'IPO', 'India', 'Bengaluru',
    'Electric two-wheeler manufacturer and energy infrastructure provider.',
    734000000, 'Post-IPO Follow-on', 'SoftBank Vision Fund',
    ARRAY['Tiger Global','Matrix Partners'],
    4500000000, '2025-03-04', 'Bloomberg',
    'https://bloomberg.com/ola-electric-2025'
  ),
  (
    'Rapido', 'Consumer', 'Series E', 'India', 'Bengaluru',
    'Bike taxi and auto ride-hailing platform across 100+ Indian cities.',
    200000000, 'Series E', 'WestBridge Capital',
    ARRAY['Swiggy','Shell Ventures','TVS Motor'],
    1100000000, '2025-03-11', 'Economic Times',
    'https://economictimes.com/rapido-series-e-2025'
  ),
  (
    'Perfios', 'FinTech', 'Series D', 'India', 'Bengaluru',
    'Real-time financial data analytics and credit underwriting SaaS platform.',
    80000000, 'Series D', 'Teachers Venture Growth',
    ARRAY['Bessemer Venture Partners','Warburg Pincus'],
    900000000, '2025-01-21', 'VCCircle',
    'https://vccircle.com/perfios-series-d-2025'
  ),
  (
    'Jupiter Money', 'FinTech', 'Series C', 'India', 'Mumbai',
    'Neo-banking platform targeting millennials with smart money management tools.',
    45000000, 'Series C', 'Tiger Global',
    ARRAY['QED Investors','Matrix Partners'],
    600000000, '2025-02-10', 'Inc42',
    'https://inc42.com/jupiter-money-2025'
  ),
  (
    'Innovaccer', 'HealthTech', 'Series F', 'India', 'Noida',
    'Healthcare data platform enabling interoperability for US health systems.',
    150000000, 'Series F', 'General Atlantic',
    ARRAY['B Capital Group','Westbridge Capital','Tiger Global'],
    3200000000, '2025-01-30', 'Forbes',
    'https://forbes.com/innovaccer-series-f-2025'
  ),
  (
    'Credgenics', 'FinTech', 'Series B', 'India', 'Bengaluru',
    'AI-powered debt resolution and collections intelligence platform for lenders.',
    50000000, 'Series B', 'Westbridge Capital',
    ARRAY['Accel','Beenext','Tanglin Venture Partners'],
    350000000, '2025-02-20', 'YourStory',
    'https://yourstory.com/credgenics-series-b-2025'
  ),
  (
    'Sarvam AI', 'AI/ML', 'Series A', 'India', 'Bengaluru',
    'Foundational AI models and voice AI infrastructure for Indian languages.',
    41000000, 'Series A', 'Peak XV Partners',
    ARRAY['Lightspeed India','Khosla Ventures'],
    250000000, '2025-03-01', 'TechCrunch',
    'https://techcrunch.com/sarvam-ai-series-a-2025'
  ),
  (
    'Euler Motors', 'CleanTech', 'Series C', 'India', 'New Delhi',
    'Electric commercial vehicles for last-mile delivery logistics fleets.',
    60000000, 'Series C', 'British International Investment',
    ARRAY['Nuvama','Blume Ventures','Bharat Forge'],
    400000000, '2025-02-14', 'Mint',
    'https://livemint.com/euler-motors-series-c-2025'
  ),
  (
    'Exotel', 'SaaS', 'Series D', 'India', 'Bengaluru',
    'Customer engagement platform providing cloud telephony and omni-channel CX.',
    40000000, 'Series D', 'Steadview Capital',
    ARRAY['Blume Ventures','Stakeboat Capital'],
    320000000, '2025-03-07', 'Economic Times',
    'https://economictimes.com/exotel-series-d-2025'
  );

-- ============================================================
-- NEWS ARTICLES (20 rows)
-- ============================================================
INSERT INTO public.news_articles (title, summary, source_name, source_url, category, is_hot, published_at) VALUES
  (
    'India Startup Ecosystem Raises $12B in Q1 2025, AI Leads the Charge',
    'Indian startups raised a record $12 billion in the first quarter of 2025, with artificial intelligence and machine learning companies accounting for over 35% of total funding. The surge marks a 68% year-on-year increase, signalling renewed investor confidence after a challenging 2023.',
    'Economic Times', 'https://economictimes.com/india-startup-q1-2025', 'Funding', TRUE, '2025-04-02 09:00:00+05:30'
  ),
  (
    'SEBI Eases Angel Fund Regulations, Lowers Minimum Investment to ₹10 Lakh',
    'The Securities and Exchange Board of India has revised its framework for angel funds, reducing the minimum investment threshold from ₹25 lakh to ₹10 lakh and raising the maximum number of investors per scheme from 200 to 300. The move is expected to democratise early-stage investing.',
    'Mint', 'https://livemint.com/sebi-angel-fund-regulations-2025', 'Policy', FALSE, '2025-03-28 11:30:00+05:30'
  ),
  (
    'Zepto Hits ₹12,000 Crore ARR, Eyes IPO in Late 2025',
    'Quick-commerce unicorn Zepto has crossed an annualised revenue run rate of ₹12,000 crore and is actively preparing for a domestic IPO, targeting a listing window between October and December 2025. The company claims to have turned EBITDA positive across its top 10 cities.',
    'Inc42', 'https://inc42.com/zepto-ipo-2025', 'Funding', TRUE, '2025-03-22 08:15:00+05:30'
  ),
  (
    'Sarvam AI Launches Sarvam-2B: India''s Largest Open-Source Language Model',
    'Bengaluru-based Sarvam AI has released Sarvam-2B, a 2-billion parameter language model trained on 4 trillion tokens of multilingual Indian data covering 12 regional languages. The model outperforms GPT-3.5 on several Indic NLP benchmarks and is available under an Apache 2.0 licence.',
    'TechCrunch', 'https://techcrunch.com/sarvam-2b-launch', 'AI/ML', TRUE, '2025-03-18 14:00:00+05:30'
  ),
  (
    'Razorpay Crosses $1 Billion in Total Payment Volume Daily',
    'Payments infrastructure startup Razorpay has achieved a milestone of processing over $1 billion in total payment volume every day, cementing its position as India''s largest payment gateway. The company processes transactions for over 10 million businesses and is preparing for a dual-listing IPO.',
    'Forbes India', 'https://forbesindia.com/razorpay-tpv-milestone-2025', 'FinTech', FALSE, '2025-03-15 10:00:00+05:30'
  ),
  (
    'Ola Electric Expands to 500 Cities, Launches S1 Air at ₹79,999',
    'Ola Electric has expanded its retail network to 500 cities across India and unveiled its entry-level electric scooter, the S1 Air, priced at ₹79,999. The company targets selling 1 million units in FY26 amid rising competition from Ather Energy and TVS Motor.',
    'Business Standard', 'https://business-standard.com/ola-electric-500-cities-2025', 'CleanTech', FALSE, '2025-03-12 16:30:00+05:30'
  ),
  (
    'Peak XV Partners Closes $2.85B Fund, Largest India-Focused VC Fund Ever',
    'Peak XV Partners, formerly Sequoia Capital India, has closed its eighth India fund at $2.85 billion, making it the largest India-focused venture capital fund ever raised. The fund will invest across seed, growth, and late-stage rounds in India and Southeast Asia.',
    'VCCircle', 'https://vccircle.com/peak-xv-fund-2025', 'Funding', TRUE, '2025-03-08 09:45:00+05:30'
  ),
  (
    'Innovaccer Acquires US Health IT Firm Novu for $180M',
    'Healthcare data platform Innovaccer has acquired Novu, a US-based population health management software company, for $180 million in an all-cash deal. The acquisition will expand Innovaccer''s Total Addressable Market by adding payer-side analytics capabilities.',
    'Economic Times', 'https://economictimes.com/innovaccer-novu-acquisition-2025', 'HealthTech', FALSE, '2025-03-05 12:00:00+05:30'
  ),
  (
    'India Passes Digital Competition Act 2025: What It Means for Big Tech',
    'India''s Digital Competition Act 2025 has received presidential assent, introducing ex-ante regulations for Systemically Significant Digital Enterprises. Companies with revenues exceeding ₹4,000 crore from digital services must comply with new interoperability and data-sharing mandates.',
    'Mint', 'https://livemint.com/digital-competition-act-2025', 'Policy', TRUE, '2025-03-02 18:00:00+05:30'
  ),
  (
    'Accel India Promotes Anand Daniel to Partner, Strengthens SaaS Focus',
    'Accel India has promoted Anand Daniel to Partner, reflecting the firm''s deepened commitment to B2B SaaS investments. Daniel has led investments in Chargebee, Unacademy, and SpotDraft. Accel India manages over $3 billion across its India-focused funds.',
    'Inc42', 'https://inc42.com/accel-india-anand-daniel-partner-2025', 'General', FALSE, '2025-02-26 10:30:00+05:30'
  ),
  (
    'Groww Becomes India''s Largest Stock Broker by Active Clients',
    'Discount brokerage platform Groww has surpassed Zerodha to become India''s largest stock broker by active client count, reaching 12.7 million active investors on NSE. The platform attributes growth to its UPI-linked demat onboarding and simplified user experience.',
    'Business Standard', 'https://business-standard.com/groww-largest-broker-2025', 'FinTech', TRUE, '2025-02-22 09:00:00+05:30'
  ),
  (
    'CleanTech Funding in India Up 91% YoY as Carbon Credit Market Matures',
    'India''s clean technology sector attracted $945 million in venture funding in 2024, up 91% from the prior year. EV charging infrastructure, green hydrogen, and agri-solar collectively attracted 60% of total investment, driven by PLI scheme tailwinds and carbon credit monetisation.',
    'YourStory', 'https://yourstory.com/cleantech-funding-india-2025', 'CleanTech', FALSE, '2025-02-18 14:00:00+05:30'
  ),
  (
    'Krutrim Launches IndianGPT: A Multimodal AI Model for Bharat',
    'Krutrim, the AI venture founded by Ola''s Bhavish Aggarwal, has launched IndianGPT, a multimodal large language model supporting 22 scheduled Indian languages with voice, image, and document understanding capabilities. The model is positioned as a sovereign AI alternative for Indian enterprises.',
    'TechCrunch', 'https://techcrunch.com/krutrim-indiangpt-launch-2025', 'AI/ML', TRUE, '2025-02-14 11:00:00+05:30'
  ),
  (
    'RBI Issues New Guidelines for Lending Fintech Startups: Stricter KYC Norms',
    'The Reserve Bank of India has issued updated guidelines for digital lending platforms, mandating video KYC for loans above ₹50,000 and requiring explicit borrower consent for data sharing with third parties. The norms are effective from April 1, 2025.',
    'Mint', 'https://livemint.com/rbi-digital-lending-guidelines-2025', 'Policy', FALSE, '2025-02-10 16:00:00+05:30'
  ),
  (
    'Healthtech Startup Portea Medical Acquires Nightingales Elder Care for ₹420 Crore',
    'Home healthcare startup Portea Medical has acquired Nightingales Home Health Services, India''s largest geriatric home care network, for ₹420 crore. The merged entity will operate across 25 cities and serve 2 million patients annually.',
    'Economic Times', 'https://economictimes.com/portea-nightingales-acquisition-2025', 'HealthTech', FALSE, '2025-02-06 10:00:00+05:30'
  ),
  (
    'India Mints 8 New Unicorns in 6 Weeks, Total Count Reaches 125',
    'India''s unicorn tally has grown to 125 after eight startups achieved billion-dollar valuations in a six-week sprint spanning January and February 2025. The new entrants span AI, FinTech, D2C consumer, and logistics, reflecting broad-based investor optimism.',
    'Inc42', 'https://inc42.com/india-125-unicorns-2025', 'Funding', TRUE, '2025-02-03 08:00:00+05:30'
  ),
  (
    'Meesho Turns Profitable: Posts ₹64 Crore Net Profit in FY24',
    'Social commerce platform Meesho has reported a net profit of ₹64 crore in FY2023-24, its first-ever annual profit, on revenues of ₹7,615 crore. The company reduced its cash burn by 97% over two years through supply-chain rationalisation and advertising monetisation.',
    'Business Standard', 'https://business-standard.com/meesho-profitable-fy24-2025', 'Funding', FALSE, '2025-01-30 11:00:00+05:30'
  ),
  (
    'Union Budget 2025 Boosts Startup India Fund of Funds with ₹10,000 Crore',
    'The Union Budget 2025-26 has allocated an additional ₹10,000 crore to the Fund of Funds for Startups managed by SIDBI, doubling its corpus. The government also extended the tax holiday for DPIIT-recognised startups by three years to 2028.',
    'Economic Times', 'https://economictimes.com/budget-2025-startup-fof', 'Policy', TRUE, '2025-02-01 14:30:00+05:30'
  ),
  (
    'Web3 Gaming Startup Junglee Games Raises $30M to Expand to Middle East',
    'Real-money gaming and Web3 company Junglee Games has raised $30 million in a Series C round led by Multiples Alternate Asset Management. The funds will be used to expand operations into Saudi Arabia and the UAE, where online gaming regulations are becoming more favourable.',
    'YourStory', 'https://yourstory.com/junglee-games-series-c-2025', 'General', FALSE, '2025-01-25 09:30:00+05:30'
  ),
  (
    'Rapido Crosses 10 Million Daily Rides, Challenges Ola and Uber Duopoly',
    'Ride-hailing platform Rapido has achieved a milestone of 10 million daily rides across bike taxis, autos, and cabs, directly challenging the dominance of Ola and Uber in Tier-1 cities. The platform operates in 100+ cities and processes 80% of rides without surge pricing.',
    'Forbes India', 'https://forbesindia.com/rapido-10m-rides-2025', 'General', FALSE, '2025-01-20 10:00:00+05:30'
  )
ON CONFLICT (source_url) DO NOTHING;

-- ============================================================
-- EVENTS (8 rows — dates from 2026-03-15 onwards)
-- ============================================================
INSERT INTO public.events
  (title, description, event_type, host, audience, sectors, location, is_virtual, meeting_url, starts_at, ends_at, time_label, total_spots, spots_left, registration_url, is_featured)
VALUES
  (
    'InvestLigence Demo Day — Spring 2026',
    'Top 20 curated startups from the InvestLigence platform pitch live to a room of 150+ active investors. Each startup gets 6 minutes to pitch and 4 minutes of Q&A. Sectors covered: AI/ML, FinTech, SaaS, HealthTech.',
    'Demo Day', 'InvestLigence', 'Both',
    ARRAY['AI/ML','FinTech','SaaS','HealthTech'],
    'The Leela Palace, Bengaluru', FALSE, NULL,
    '2026-03-15 09:00:00+05:30', '2026-03-15 18:00:00+05:30',
    'Sat, 15 Mar · 9:00 AM IST', 200, 43, 'https://investligence.app/events/demo-day-spring-2026', TRUE
  ),
  (
    'Office Hours with Sequoia Capital India — Series A Readiness',
    'An intimate session where Sequoia partners answer founder questions on what it takes to raise a Series A in 2026. Topics include revenue metrics, product-market fit signals, and term sheet negotiation.',
    'Office Hours', 'Sequoia Capital India', 'Founders',
    ARRAY['SaaS','AI/ML','Consumer'],
    'Virtual', TRUE, 'https://zoom.us/j/sequoia-office-hours-2026',
    '2026-03-18 16:00:00+05:30', '2026-03-18 18:00:00+05:30',
    'Tue, 18 Mar · 4:00 PM IST', 50, 12, 'https://investligence.app/events/sequoia-office-hours-mar26', TRUE
  ),
  (
    'AI for Bharat Hackathon 2026',
    'A 48-hour hackathon challenging developers, founders, and researchers to build AI solutions for India-specific problems in agriculture, vernacular content, rural healthcare, and government services. Prize pool of ₹25 lakh.',
    'Hackathon', 'NASSCOM & MeitY Startup Hub', 'Both',
    ARRAY['AI/ML','HealthTech','Consumer'],
    'IIT Delhi, New Delhi', FALSE, NULL,
    '2026-03-22 09:00:00+05:30', '2026-03-24 18:00:00+05:30',
    'Sun, 22 Mar – Tue, 24 Mar', 500, 187, 'https://investligence.app/events/ai-for-bharat-hackathon-2026', FALSE
  ),
  (
    'FinTech Founders & Funders Mixer — Mumbai',
    'An exclusive networking dinner bringing together 60 FinTech founders and 40 active FinTech investors in Mumbai. Hosted under Chatham House rules for candid conversations. Includes a panel on UPI 3.0 and credit infrastructure.',
    'Networking', 'Blume Ventures & QED Investors', 'Both',
    ARRAY['FinTech'],
    'Four Seasons Hotel, Mumbai', FALSE, NULL,
    '2026-03-25 18:30:00+05:30', '2026-03-25 22:00:00+05:30',
    'Wed, 25 Mar · 6:30 PM IST', 100, 22, 'https://investligence.app/events/fintech-mixer-mumbai-2026', FALSE
  ),
  (
    'CleanTech Investment Summit India 2026',
    'A full-day summit on the green economy featuring sessions on carbon markets, EV supply chains, green hydrogen economics, and ESG due diligence. Features 20 investor panels and a startup showcase with 15 CleanTech companies.',
    'Demo Day', 'Avaana Capital & Climate Collective', 'Both',
    ARRAY['CleanTech'],
    'Taj MG Road, Bengaluru', FALSE, NULL,
    '2026-04-03 08:30:00+05:30', '2026-04-03 19:00:00+05:30',
    'Fri, 3 Apr · 8:30 AM IST', 300, 91, 'https://investligence.app/events/cleantech-summit-2026', TRUE
  ),
  (
    'Fundraising Masterclass: From Pitch to Term Sheet',
    'A practical 3-hour online workshop by seasoned founders who have raised $10M+ rounds. Covers deck construction, investor outreach cadence, data room setup, and term sheet red flags. Includes live pitch feedback on submitted decks.',
    'Workshop', 'InvestLigence Academy', 'Founders',
    ARRAY['AI/ML','FinTech','SaaS','HealthTech','CleanTech'],
    'Virtual', TRUE, 'https://zoom.us/j/investligence-fundraising-masterclass',
    '2026-04-08 19:00:00+05:30', '2026-04-08 22:00:00+05:30',
    'Wed, 8 Apr · 7:00 PM IST', 150, 68, 'https://investligence.app/events/fundraising-masterclass-apr26', FALSE
  ),
  (
    'SaaS Nation India 2026 — Annual B2B SaaS Conference',
    'India''s premier B2B SaaS conference returns with 2,000+ attendees, 80 speakers, and a dedicated investor-startup matchmaking track. Keynotes from founders of Freshworks, Zoho, and Chargebee on building global SaaS from India.',
    'Webinar', 'SaaSBoomi', 'Both',
    ARRAY['SaaS'],
    'Chennai Trade Centre, Chennai', FALSE, NULL,
    '2026-04-17 09:00:00+05:30', '2026-04-18 18:00:00+05:30',
    'Thu, 17 Apr – Fri, 18 Apr', 2000, 412, 'https://investligence.app/events/saas-nation-india-2026', TRUE
  ),
  (
    'HealthTech Investors Roundtable — Q2 2026',
    'A closed-door roundtable for active HealthTech investors to discuss deal flow, regulatory developments in digital health, and co-investment opportunities. Hosted by HealthQuad and Bessemer Venture Partners.',
    'Office Hours', 'HealthQuad & Bessemer Venture Partners', 'Investors',
    ARRAY['HealthTech'],
    'Taj Palace, New Delhi', FALSE, NULL,
    '2026-04-22 14:00:00+05:30', '2026-04-22 17:30:00+05:30',
    'Wed, 22 Apr · 2:00 PM IST', 40, 8, 'https://investligence.app/events/healthtech-roundtable-q2-2026', FALSE
  );

-- ============================================================
-- DISCOVERED INVESTORS (10 rows)
-- ============================================================
INSERT INTO public.discovered_investors
  (name, firm, investor_type, title, linkedin_url, sectors, stages, last_seen_deal, verified)
VALUES
  (
    'Shailendra Singh', 'Peak XV Partners', 'venture-capital',
    'Managing Director',
    'https://linkedin.com/in/shailendrasingh',
    ARRAY['Consumer','SaaS','FinTech'],
    ARRAY['Series A','Series B','Growth'],
    '{"company": "Meesho", "amount_usd": 275000000, "date": "2025-01-28"}'::jsonb,
    TRUE
  ),
  (
    'Prashanth Prakash', 'Accel India', 'venture-capital',
    'Partner',
    'https://linkedin.com/in/prashanthprakash',
    ARRAY['SaaS','FinTech','Consumer','AI/ML'],
    ARRAY['Seed','Series A','Series B'],
    '{"company": "Credgenics", "amount_usd": 50000000, "date": "2025-02-20"}'::jsonb,
    TRUE
  ),
  (
    'Bejul Somaia', 'Lightspeed Venture Partners', 'venture-capital',
    'Partner',
    'https://linkedin.com/in/bejulsomaia',
    ARRAY['Consumer','SaaS','AI/ML'],
    ARRAY['Series A','Series B','Series B+'],
    '{"company": "Krutrim", "amount_usd": 50000000, "date": "2025-01-10"}'::jsonb,
    TRUE
  ),
  (
    'Scott Shleifer', 'Tiger Global Management', 'venture-capital',
    'Founder & Managing Partner',
    'https://linkedin.com/in/scottshleifer',
    ARRAY['FinTech','Consumer','SaaS','EdTech'],
    ARRAY['Growth','Series B+'],
    '{"company": "Groww", "amount_usd": 200000000, "date": "2025-02-05"}'::jsonb,
    TRUE
  ),
  (
    'Karan Mohla', 'B Capital Group', 'venture-capital',
    'Partner',
    'https://linkedin.com/in/karanmohla',
    ARRAY['HealthTech','AI/ML','SaaS'],
    ARRAY['Series B','Series B+','Growth'],
    '{"company": "Innovaccer", "amount_usd": 150000000, "date": "2025-01-30"}'::jsonb,
    TRUE
  ),
  (
    'Rajan Anandan', 'Peak XV Partners', 'venture-capital',
    'Managing Director',
    'https://linkedin.com/in/rajananandan',
    ARRAY['AI/ML','Consumer','EdTech','SaaS'],
    ARRAY['Pre-Seed','Seed','Series A'],
    '{"company": "Sarvam AI", "amount_usd": 41000000, "date": "2025-03-01"}'::jsonb,
    TRUE
  ),
  (
    'Vani Kola', 'Kalaari Capital', 'venture-capital',
    'Managing Director',
    'https://linkedin.com/in/vanikola',
    ARRAY['SaaS','Consumer','HealthTech','AI/ML'],
    ARRAY['Seed','Series A','Series B'],
    '{"company": "DealShare", "amount_usd": 45000000, "date": "2024-11-15"}'::jsonb,
    TRUE
  ),
  (
    'Avnish Bajaj', 'Matrix Partners India', 'venture-capital',
    'Founder & Managing Director',
    'https://linkedin.com/in/avnishbajaj',
    ARRAY['Consumer','FinTech','SaaS','EdTech'],
    ARRAY['Seed','Series A','Series B'],
    '{"company": "Rapido", "amount_usd": 200000000, "date": "2025-03-11"}'::jsonb,
    TRUE
  ),
  (
    'Sanjay Nath', 'Blume Ventures', 'venture-capital',
    'Managing Partner',
    'https://linkedin.com/in/sanjaynath',
    ARRAY['SaaS','AI/ML','Consumer','CleanTech'],
    ARRAY['Pre-Seed','Seed','Series A'],
    '{"company": "Euler Motors", "amount_usd": 60000000, "date": "2025-02-14"}'::jsonb,
    TRUE
  ),
  (
    'Neeraj Arora', 'Neeraj Arora Capital', 'angel',
    'Founder & Angel Investor',
    'https://linkedin.com/in/neerajarora',
    ARRAY['Consumer','FinTech','Web3','AI/ML'],
    ARRAY['Pre-Seed','Seed'],
    '{"company": "Junglee Games", "amount_usd": 30000000, "date": "2025-01-25"}'::jsonb,
    FALSE
  )
ON CONFLICT (name, firm) DO UPDATE SET
  investor_type  = EXCLUDED.investor_type,
  title          = EXCLUDED.title,
  linkedin_url   = EXCLUDED.linkedin_url,
  sectors        = EXCLUDED.sectors,
  stages         = EXCLUDED.stages,
  last_seen_deal = EXCLUDED.last_seen_deal,
  verified       = EXCLUDED.verified;
