# Viral Finance Content Automation System — Design Spec

**Date:** 2026-03-18
**Status:** Approved

---

## Overview

A fully automated multi-agent content pipeline that monitors viral finance trends, generates AI avatar videos, and publishes them daily to TikTok, Instagram Reels, and YouTube Shorts — with the goal of growing monetizable social media accounts.

---

## Context & Constraints

- **Niche:** Finance & Wealth (money tips, investing, passive income)
- **Video format:** AI avatar talking head (D-ID)
- **Platforms:** TikTok, Instagram Reels, YouTube Shorts
- **Budget:** ~$50–100/month total (n8n paid account already owned)
- **Technical level:** Familiar with n8n; not a developer
- **Implementation:** Built entirely in n8n via Claude MCP integration
- **Data store:** Google Sheets (free, no database needed)
- **Posting cadence:** 1 video per day, ~25 days/month (D-ID Basic plan limit)
- **Timezone:** All schedules use user's local timezone — must be configured explicitly in n8n account settings before running

---

## Prerequisites & Hard Blockers

> Address these before starting implementation — they can take days or weeks.

| Item | Action Required | Risk |
|---|---|---|
| **TikTok Content Posting API** | Apply for developer access at developers.tiktok.com. App review required before posting is allowed — can take 1–4 weeks with no guarantee of approval. | **High — could block TikTok launch entirely** |
| **Instagram Graph API** | Requires a Facebook Business account + Instagram Professional account linked in Meta Business Suite. | Medium — straightforward but takes time to set up |
| **YouTube Data API v3** | Enable via Google Cloud Console. Requires OAuth2 consent screen verification for publishing. | Low — usually approved quickly |
| **D-ID account** | Basic plan: $5.99/month, 25 video credits. Supports 25 days of daily posting (not 30). Either accept 25-day cadence or upgrade to Pro plan (~$25/month for 100 videos). | Low |

---

## Architecture

Five n8n workflows chained via Google Sheets as shared state. Each workflow uses a **scheduled trigger + IF filter node** (not native row-change detection) to read rows by status column value.

```
[Trend Scout]     → Sheets (trends tab, status: new)
      ↓ (Workflow 2 polls on schedule + filters status=new)
[Script Writer]   → Sheets (scripts tab, status: draft)
      ↓ (Workflow 3 polls on schedule + filters status=draft)
[Script Critic]   → Sheets (scripts tab, status: approved | needs-review)
      ↓ (Workflow 4 polls on schedule + filters status=approved)
[Video Producer]  → Sheets (videos tab, status: ready)
      ↓ (Workflow 5 polls on schedule + filters status=ready)
[Publisher]       → TikTok + Instagram + YouTube Shorts + notification
```

**Chaining mechanism:** Each workflow runs on a schedule (every 30–60 minutes), reads Sheets for rows matching its expected input status, processes them, and updates the status. The Critic's revision loop works by resetting a script row's status back to `draft` with a `feedback` column populated — Workflow 2 picks it up on its next poll cycle.

---

## Google Sheets Structure

All tabs share a `record_id` UUID column (generated at row creation) used as the primary key for all cross-workflow row updates.

### `trends` tab
| Column | Description |
|---|---|
| record_id | UUID, generated at row creation |
| date | YYYY-MM-DD |
| topic | Trending topic title |
| source | google_trends / reddit |
| engagement_score | Numeric ranking signal |
| status | `new` → `scripted` |

### `scripts` tab
| Column | Description |
|---|---|
| record_id | UUID (same as parent trend row) |
| date | YYYY-MM-DD |
| topic | Topic title |
| script_text | Full script (hook + value + CTA) |
| hook_score | 1–10 from critic |
| virality_score | 1–10 from critic |
| accuracy_score | 1–10 from critic |
| avg_score | Average of three scores |
| feedback | Critic's rewrite notes (if revision needed) |
| revision | Integer, starts at 0 |
| status | `draft` → `approved` / `needs-review` → `produced` |

### `videos` tab
| Column | Description |
|---|---|
| record_id | UUID (same as parent script row) |
| date | YYYY-MM-DD |
| topic | Topic title |
| video_url | D-ID rendered video URL (expires ~24h — Publisher must run within this window) |
| yt_url | Published YouTube Shorts URL |
| ig_url | Published Instagram Reels URL |
| tt_url | Published TikTok URL |
| status | `ready` → `published` / `failed` |
| error_notes | Any platform-specific failure messages |

---

## Workflow Specifications

### Workflow 1: Trend Scout
**Trigger:** Daily schedule — 6:00 AM (user's local timezone)

**Steps:**
1. Fetch Google Trends RSS for keywords: `investing`, `passive income`, `money tips`, `financial freedom`, `stock market`
2. Fetch Reddit RSS feeds: `r/personalfinance`, `r/investing`, `r/financialindependence` (top posts, past 24h)
3. Merge results, deduplicate, rank by engagement signal
4. Generate a UUID (`record_id`) for each of the top 3 topics
5. Write top 3 rows to Sheets `trends` tab with `status: new`

---

### Workflow 2: Script Writer
**Trigger:** Schedule every 30 minutes (polls at :00 and :30 of each hour)
**Two modes — handled by IF/Switch node:**

**Mode A — New topic (first script):**
- Filter: `trends` tab rows where `status = new`
- Calls Claude API with fresh script prompt using topic
- Creates a new row in `scripts` tab with `revision = 0`, `status = draft`
- Updates the `trends` row (by `record_id`) to `status = scripted`

**Mode B — Revision pass:**
- Filter: `scripts` tab rows where `status = draft` and `revision > 0`
- Calls Claude API with revision prompt including original script + `feedback` column content
- Updates the existing `scripts` row in place (matched by `record_id`), increments `revision`
- Keeps `status = draft` so Workflow 3 re-processes it

**Script format (max 150 words):**
- **Hook** (0–3s): Scroll-stopping question or shocking stat
- **Value** (3–45s): 3 punchy, actionable tips — simple language
- **CTA** (45–55s): "Follow for a daily money tip. Not financial advice."

---

### Workflow 3: Script Critic
**Trigger:** Schedule every 30 minutes (polls at :10 and :40 of each hour — offset from Workflow 2 to reduce Sheets API concurrency)
**Filter:** IF node — only process rows from `scripts` tab where `status = draft`

**Steps:**
1. Read draft script row
2. Call Claude API (`claude-haiku-4-5`) with critic prompt — score on:
   - **Hook strength** (1–10): Does it stop scrolling in 3 seconds?
   - **Virality potential** (1–10): Shareable, relatable, surprising?
   - **Accuracy** (1–10): Sound financial information, not misleading?
3. Write scores + avg_score to the script row (matched by `record_id`)
4. **If avg ≥ 7.0:** Set status to `approved`
5. **If avg < 7.0 and revision < 3:** Write feedback to `feedback` column, increment `revision`, reset status to `draft` (triggers Workflow 2 on next poll)
6. **If avg < 7.0 and revision ≥ 3:** Set status to `needs-review`, send notification for manual review — no video produced today

---

### Workflow 4: Video Producer
**Trigger:** Schedule every 30 minutes (polls at :20 and :50 of each hour — offset from Workflows 2 and 3)
**Filter:** IF node — only process rows from `scripts` tab where `status = approved`

**Steps:**
1. Read approved script row
2. Call D-ID API — create talk video:
   - Avatar: configured presenter ID (set once in n8n credentials)
   - Script: approved script text
   - Voice: English, natural tone
   - Output: MP4, H.264, AAC audio, 1080×1920 (9:16 portrait — required for Reels and Shorts)
3. Poll D-ID status endpoint every 30 seconds, max 20 attempts (10 minutes total)
   - If status `done`: proceed
   - If 20 attempts exceeded or status `error`: log error in `videos` tab, send notification, stop
4. Write video URL to `videos` tab with `record_id`, set `status: ready`
5. Update `scripts` tab row (by `record_id`) status to `produced` (final terminal state for scripts)

> **Important:** D-ID video URLs expire within ~24 hours. Workflow 5 must run and download the video within this window. The schedule ensures this as long as Publisher runs the same day.

---

### Workflow 5: Publisher
**Trigger:** Schedule every 30 minutes (polls at :05 and :35 of each hour — offset from other workflows)
**Filter:** IF node — only process rows from `videos` tab where `status = ready`

**Steps:**
1. Download video from D-ID URL to n8n binary buffer
2. Call Claude API (`claude-haiku-4-5`) to generate a YouTube-specific title (one line, max 60 chars) from the topic — e.g., `"3 Money Habits That Changed My Life"`. This title is used for YouTube only.
3. Build shared caption (used for Instagram and TikTok — neither uses a separate title field):
   - First line: hook sentence from script
   - Hashtags: `#finance #investing #moneytips #passiveincome #financialfreedom #shorts`
   - Footer: `"Not financial advice. For entertainment purposes only."`
4. Upload to **YouTube Shorts** via YouTube Data API v3
   - Title: generated title (YouTube only)
   - Description: hook + hashtags + disclaimer
   - Category: 22 (People & Blogs)
5. Upload to **Instagram Reels** via Instagram Graph API
   - Caption: shared caption (hook + hashtags + disclaimer)
   - Video must meet: MP4, H.264, AAC, min 500×888px, 3–90 seconds (D-ID output at 1080×1920 satisfies this)
6. Upload to **TikTok** via TikTok Content Posting API *(only if API access approved — skip gracefully if not)*
   - Caption: shared caption (hook + hashtags + disclaimer)
7. Write all published URLs and final status to `videos` tab (by `record_id`)
8. Send daily summary notification (Telegram or email) with: topic, avg_score, script excerpt, published video links, any failures

---

## API Credentials Required

| Service | Auth Type | Notes |
|---|---|---|
| Anthropic (Claude) | API key | Used in Workflows 2, 3, 5. Model: `claude-haiku-4-5` |
| D-ID | API key | Basic plan ~$6/month, 25 videos |
| Google (Sheets + YouTube) | OAuth2 — **single Google Cloud project** | One OAuth2 credential in n8n covers both Sheets and YouTube; enable both APIs in the same Google Cloud Console project |
| Instagram Graph API | OAuth2 | Requires Meta Business account + Professional Instagram account |
| TikTok Content Posting API | OAuth2 | Requires approved developer app — see Prerequisites |
| Telegram Bot or SMTP | Bot token / SMTP credentials | For daily summary notifications |

---

## Error Handling

| Scenario | Handling |
|---|---|
| Script fails critic 3 times | Status → `needs-review`; notification sent; no video today |
| D-ID job exceeds 20 poll attempts | Log error in `videos` tab; notification sent; skip today |
| D-ID video URL expired before Publisher runs | Publisher catches download error; logs `failed`; notification sent |
| Platform upload fails (one platform) | Log failure in `videos` tab; other platforms still publish |
| Google Sheets rate limit hit | n8n built-in retry handles transient errors; stagger workflow poll schedules by 10 minutes to reduce concurrency |
| TikTok not yet approved | Publisher skips TikTok step gracefully; logs `skipped` |

---

## Estimated Monthly Costs

| Item | Cost |
|---|---|
| n8n paid plan | Already owned |
| Claude Haiku API (~5 calls/day × 25 days) | ~$2–3 |
| D-ID Basic plan (25 videos/month) | ~$6 |
| All platform APIs | Free |
| Google Sheets | Free |
| **Total extra** | **~$8–10/month** |

---

## Success Criteria

- System runs daily without manual intervention
- At least 1 video published per day across all available platforms
- Scripts consistently score ≥ 7.0 from critic agent
- All published content includes financial disclaimer
- Account growth visible within 30–60 days of consistent posting
- Monetization eligibility targets:
  - **YouTube Shorts:** 1,000 subscribers + 10 million Shorts views in 90 days (note: Shorts watch time does NOT count toward the standard 4,000-hour watch hour threshold — the Shorts-specific path applies)
  - **TikTok:** 10,000 followers + 100,000 views in 30 days (TikTok Creator Fund / Creator Marketplace)
  - **Instagram:** Varies — Reels monetization via Instagram Bonuses program (invite-only) or brand deals once account has traction
