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
- **Posting cadence:** 1 video per day per platform

---

## Architecture

Five n8n workflows chained via Google Sheets as shared state:

```
[Trend Scout] → Sheets (trends tab)
                     ↓
              [Script Writer] → Sheets (scripts tab, status: draft)
                     ↓
              [Script Critic] → Sheets (scripts tab, status: approved | needs-review)
                     ↓
              [Video Producer] → Sheets (videos tab, video URL)
                     ↓
               [Publisher] → TikTok + Instagram + YouTube Shorts
                     ↓
               Notification (email or Telegram) with daily summary
```

---

## Workflow Specifications

### Workflow 1: Trend Scout
**Trigger:** Daily schedule — 6:00 AM

**Steps:**
1. Fetch Google Trends RSS for keywords: `investing`, `passive income`, `money tips`, `financial freedom`, `stock market`
2. Fetch Reddit RSS feeds: `r/personalfinance`, `r/investing`, `r/financialindependence` (top posts, past 24h)
3. Merge and rank by engagement signal (upvotes / trend velocity)
4. Write top 3 trending topics to Sheets `trends` tab with columns: `date`, `topic`, `source`, `engagement_score`, `status: new`

---

### Workflow 2: Script Writer
**Trigger:** New row added to Sheets `trends` tab with `status: new`

**Steps:**
1. Read the top-ranked trend topic for today
2. Call Claude API (model: `claude-haiku-4-5-20251001`) with script prompt:
   - **Hook** (0–3s): Scroll-stopping question or shocking stat related to the topic
   - **Value** (3–45s): 3 concise, actionable tips or the core insight — simple language, punchy sentences
   - **CTA** (45–55s): "Follow for a daily money tip"
   - Max 150 words total (fits ~55 second video)
3. Write draft script to Sheets `scripts` tab: `date`, `topic`, `script_text`, `status: draft`, `revision: 0`
4. Update trend row status to `scripted`

---

### Workflow 3: Script Critic
**Trigger:** New row added to Sheets `scripts` tab with `status: draft`

**Steps:**
1. Read the draft script
2. Call Claude API with critic prompt — score on three dimensions (1–10 each):
   - **Hook strength:** Does it stop scrolling in 3 seconds?
   - **Virality potential:** Is it shareable, relatable, surprising?
   - **Accuracy:** Is the financial advice sound and not misleading?
3. Calculate average score
4. **If avg ≥ 7.0:** Update script status to `approved`
5. **If avg < 7.0 and revision < 3:** Generate rewrite instructions, increment revision, trigger Script Writer again with feedback
6. **If avg < 7.0 and revision ≥ 3:** Update status to `needs-review`, send notification for manual review

---

### Workflow 4: Video Producer
**Trigger:** Row in Sheets `scripts` tab updated to `status: approved`

**Steps:**
1. Read approved script text
2. Call D-ID API — create talk video:
   - Avatar: configured presenter ID (set once in n8n credentials)
   - Script: approved script text
   - Voice: English, natural tone
3. Poll D-ID API every 30 seconds until video status is `done`
4. Write video URL to Sheets `videos` tab: `date`, `topic`, `video_url`, `status: ready`
5. Update script row status to `produced`

---

### Workflow 5: Publisher
**Trigger:** New row added to Sheets `videos` tab with `status: ready`

**Steps:**
1. Download video from D-ID URL to n8n binary buffer
2. Upload to **YouTube Shorts** via YouTube Data API v3
   - Title: generated from topic (Claude one-liner)
   - Description: script summary + hashtags
   - Tags: finance, investing, moneytips, passiveincome, shorts
3. Upload to **Instagram Reels** via Instagram Graph API
   - Caption: hook line + hashtags
4. Upload to **TikTok** via TikTok Content Posting API
   - Caption: hook line + hashtags
5. Write publish results (URLs, status) to Sheets `videos` tab
6. Send daily summary notification (email or Telegram) with: topic, script excerpt, video links

---

## Google Sheets Structure

| Tab | Columns |
|---|---|
| `trends` | date, topic, source, engagement_score, status |
| `scripts` | date, topic, script_text, scores, avg_score, revision, status |
| `videos` | date, topic, video_url, yt_url, ig_url, tt_url, status |

---

## API Credentials Required

| Service | Type | Notes |
|---|---|---|
| Anthropic (Claude) | API key | Use Haiku model for cost efficiency |
| D-ID | API key | Basic plan ~$6/month, 25 videos |
| Google Sheets | OAuth2 | Connect via n8n Google Sheets node |
| YouTube Data API | OAuth2 | Via Google Cloud Console |
| Instagram Graph API | OAuth2 | Requires Facebook Business account |
| TikTok Content Posting API | OAuth2 | Requires TikTok developer account |
| Telegram or Email | Bot token / SMTP | For daily summary notifications |

---

## Error Handling

- **Script fails critic 3 times:** Flagged as `needs-review` in Sheets + notification sent — no video produced that day
- **D-ID render fails:** Retry once after 5 minutes; if still failing, log error in Sheets + notification
- **Platform upload fails:** Log which platform(s) failed in Sheets; other platforms still publish
- **Trend fetch fails:** Fall back to previous day's unused trends if available; else skip and notify

---

## Estimated Monthly Costs

| Item | Cost |
|---|---|
| n8n paid plan | Already owned |
| Claude Haiku API (~60 calls/day × 30 days) | ~$3–5 |
| D-ID Basic (25 videos) | ~$6 |
| All platform APIs | Free |
| Google Sheets | Free |
| **Total extra** | **~$10–15/month** |

---

## Success Criteria

- System runs daily without manual intervention
- At least 1 video published per day across all 3 platforms
- Scripts consistently score ≥ 7.0 from critic agent
- Account growth visible within 30–60 days
- Monetization eligibility reached (YouTube: 1000 subs / 4000 watch hours; TikTok: 10k followers; Instagram: varies)
