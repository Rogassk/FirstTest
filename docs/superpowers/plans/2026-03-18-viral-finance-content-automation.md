# Viral Finance Content Automation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build 5 chained n8n workflows that automatically find viral finance trends, write and review scripts, generate AI avatar videos, and publish daily to TikTok, Instagram Reels, and YouTube Shorts.

**Architecture:** Five n8n workflows share state via Google Sheets (3 tabs: trends, scripts, videos). Each workflow runs on a staggered schedule, reads rows by `status` column, processes them, and updates status to trigger the next workflow. The Claude MCP is used to build each workflow node-by-node directly from this session.

**Tech Stack:** n8n (paid), Google Sheets, Anthropic Claude API (Haiku), D-ID API, YouTube Data API v3, Instagram Graph API, TikTok Content Posting API, Telegram Bot (notifications)

---

## Prerequisites Checklist (Do These First — Before Any Workflow)

These must be completed before building workflows. Some take days.

- [ ] Apply for **TikTok Content Posting API** access at https://developers.tiktok.com (HIGH RISK — can take 1–4 weeks, may be denied; start immediately)
- [ ] Create a **Facebook Business account** and link a new **Instagram Professional account** to it via Meta Business Suite
- [ ] Create a **Google Cloud project** at https://console.cloud.google.com — enable both **Google Sheets API** and **YouTube Data API v3** in the same project, set up an OAuth2 consent screen
- [ ] Sign up for **D-ID Basic plan** (~$5.99/month) at https://www.d-id.com — note your API key
- [ ] Get an **Anthropic API key** at https://console.anthropic.com
- [ ] Create a **Telegram bot** via @BotFather on Telegram — note the bot token and your chat ID (or prepare an SMTP email credential instead)
- [ ] Set your **n8n account timezone** in n8n Settings → General to your local timezone

---

## Task 1: Create Google Sheets Data Store

**Files:**
- Create: Google Sheets workbook named `Finance Content Pipeline`

- [ ] **Step 1: Create the workbook**

  Go to https://sheets.google.com and create a new spreadsheet named `Finance Content Pipeline`.

- [ ] **Step 2: Create the `trends` tab**

  Rename `Sheet1` to `trends`. Add these headers in row 1 (one per column, A through F):
  ```
  record_id | date | topic | source | engagement_score | status
  ```

- [ ] **Step 3: Create the `scripts` tab**

  Add a new sheet tab named `scripts`. Add headers in row 1 (A through K — 11 columns):
  ```
  record_id | date | topic | script_text | hook_score | virality_score | accuracy_score | avg_score | feedback | revision | status
  ```

- [ ] **Step 4: Create the `videos` tab**

  Add a new sheet tab named `videos`. Add headers in row 1 (A through J):
  ```
  record_id | date | topic | video_url | yt_url | ig_url | tt_url | status | error_notes
  ```

- [ ] **Step 5: Note the Spreadsheet ID**

  Copy the spreadsheet ID from the URL: `https://docs.google.com/spreadsheets/d/YOUR_SPREADSHEET_ID/edit`. Save it — every n8n workflow needs it.

- [ ] **Step 6: Test that the sheet is accessible**

  Verify you can open it and see all 3 tabs with correct headers.

---

## Task 2: Add All Credentials to n8n

**Where:** n8n → Settings → Credentials

- [ ] **Step 1: Add Google OAuth2 credential**

  In n8n Credentials, create a new `Google OAuth2` credential. Use the Client ID and Client Secret from your Google Cloud project. Scope must include:
  - `https://www.googleapis.com/auth/spreadsheets`
  - `https://www.googleapis.com/auth/youtube.upload`

  Name it: `Google Pipeline`

- [ ] **Step 2: Test Google credential**

  Create a temporary Google Sheets node in any workflow, point it at your spreadsheet, run it, confirm it reads the header row. Delete the test node.

- [ ] **Step 3: Add Anthropic API credential**

  In n8n Credentials, create a new `HTTP Header Auth` credential:
  - Name: `Anthropic`
  - Header Name: `x-api-key`
  - Header Value: your Anthropic API key

  Also create a second header for the required API version — use a `Header Auth` with name `anthropic-version` and value `2023-06-01`. (In practice, combine both headers using n8n's HTTP Request node custom headers.)

- [ ] **Step 4: Test Anthropic credential**

  Create a temporary HTTP Request node. Set method POST, URL `https://api.anthropic.com/v1/messages`, headers:
  - `x-api-key`: your key
  - `anthropic-version`: `2023-06-01`
  - `content-type`: `application/json`

  Body:
  ```json
  {
    "model": "claude-haiku-4-5",
    "max_tokens": 10,
    "messages": [{"role": "user", "content": "Say hi"}]
  }
  ```
  Run it. Expect a 200 response with `{"content": [{"text": "Hi..."}]}`. Delete the test node.

- [ ] **Step 5: Add D-ID API credential and presenter URL**

  Create an `HTTP Header Auth` credential:
  - Name: `D-ID`
  - Header Name: `Authorization`
  - Header Value: `Basic YOUR_DID_API_KEY_BASE64`

  > D-ID uses HTTP Basic auth. Encode `your-email:your-api-key` in Base64 and use that as the value after `Basic `.

  Then choose your avatar presenter — two options:
  - **Option A (easiest):** Call `GET https://api.d-id.com/clips/presenters` with your D-ID auth header. Pick a presenter from the response (e.g., `amy-jcwCkr1grs`). Note the `id` field — this is your `presenter_id`.
  - **Option B:** Upload a photo of a custom avatar to any public URL (e.g., Cloudinary free tier) and use that URL as `source_url`.

  In n8n, create a `Global Variable` (Settings → Variables) named `DID_PRESENTER` and set it to your chosen presenter ID or image URL. All workflows reference it via `{{ $vars.DID_PRESENTER }}`.

- [ ] **Step 6: Add Instagram credential**

  Create a `Facebook Graph API OAuth2` credential in n8n using your Meta app credentials. Name it `Instagram Pipeline`.

- [ ] **Step 7: Add Telegram credential (or SMTP)**

  Create a `Telegram API` credential with your bot token. Name it `Notifications`. Note your personal Telegram chat ID (send `/start` to your bot and call `https://api.telegram.org/botYOUR_TOKEN/getUpdates` to find it).

---

## Task 3: Workflow 1 — Trend Scout

**What it does:** Runs at 6am daily. Fetches trending finance topics from Google Trends RSS and Reddit RSS. Writes top 3 to the `trends` Sheets tab.

- [ ] **Step 1: Create the workflow**

  In n8n, create a new workflow named `1 - Trend Scout`.

- [ ] **Step 2: Add Schedule Trigger**

  Add a `Schedule Trigger` node. Set it to run at `6:00 AM` daily (Cron: `0 6 * * *`). This is the workflow entry point.

- [ ] **Step 3: Add Google Trends RSS fetch**

  Add an `HTTP Request` node connected to the trigger. Configure:
  - Method: `GET`
  - URL: `https://trends.google.com/trends/trendingsearches/daily/rss?geo=US`
  - Response Format: `String`

  Name the node `Fetch Google Trends`.

- [ ] **Step 4: Add Reddit RSS fetch (3 subreddits)**

  Add 3 parallel `HTTP Request` nodes (one per subreddit), all connected to the trigger:
  - `https://www.reddit.com/r/personalfinance/top.rss?t=day`
  - `https://www.reddit.com/r/investing/top.rss?t=day`
  - `https://www.reddit.com/r/financialindependence/top.rss?t=day`

  Set Response Format: `String` on each. Name them `Reddit r/personalfinance`, `Reddit r/investing`, `Reddit r/financialindependence`.

- [ ] **Step 5: Add Merge node**

  Add a `Merge` node set to `Append` mode. Connect all 4 RSS HTTP Request nodes into it.

- [ ] **Step 6: Add Code node to parse and rank**

  Add a `Code` node after Merge. Set language to `JavaScript`. Paste this:

  ```javascript
  const items = $input.all();
  const topics = [];

  for (const item of items) {
    const body = item.json.data || '';
    // Extract <title> tags from RSS XML
    const titles = [...body.matchAll(/<title><!\[CDATA\[(.*?)\]\]><\/title>/g)]
      .map(m => m[1])
      .filter(t => !t.includes('Reddit') && !t.includes('Google') && t.length > 5);

    titles.forEach((title, i) => {
      topics.push({
        topic: title,
        source: item.json.url || 'rss',
        engagement_score: 100 - i  // higher = earlier in feed = more engagement
      });
    });
  }

  // Deduplicate by topic text
  const seen = new Set();
  const unique = topics.filter(t => {
    if (seen.has(t.topic)) return false;
    seen.add(t.topic);
    return true;
  });

  // Filter for finance relevance (basic keyword check)
  const financeKeywords = ['money', 'invest', 'finance', 'stock', 'income', 'budget', 'debt', 'savings', 'crypto', 'retire', 'wealth', 'tax', 'earn', 'profit'];
  const relevant = unique.filter(t =>
    financeKeywords.some(kw => t.topic.toLowerCase().includes(kw))
  );

  // Sort by engagement and take top 3
  const top3 = (relevant.length >= 3 ? relevant : unique)
    .sort((a, b) => b.engagement_score - a.engagement_score)
    .slice(0, 3);

  return top3.map(t => ({ json: t }));
  ```

  Name it `Parse & Rank Topics`.

- [ ] **Step 7: Add Code node to generate UUIDs and format rows**

  Add another `Code` node:

  ```javascript
  const items = $input.all();
  const today = new Date().toISOString().split('T')[0];

  return items.map(item => ({
    json: {
      record_id: Math.random().toString(36).substr(2, 9) + Date.now().toString(36),
      date: today,
      topic: item.json.topic,
      source: item.json.source,
      engagement_score: item.json.engagement_score,
      status: 'new'
    }
  }));
  ```

  Name it `Format Rows`.

- [ ] **Step 8: Add Google Sheets Append node**

  Add a `Google Sheets` node set to `Append or Update` → `Append` mode:
  - Credential: `Google Pipeline`
  - Spreadsheet ID: your spreadsheet ID
  - Sheet Name: `trends`
  - Columns: map each field (`record_id`, `date`, `topic`, `source`, `engagement_score`, `status`) to the corresponding column

  Name it `Write to Trends Tab`.

- [ ] **Step 9: Test with manual trigger**

  Click `Test Workflow`. Check the Google Sheet `trends` tab. You should see 3 new rows with `status: new`.

  If rows appear — workflow is working. If not, check the `Parse & Rank Topics` node output and adjust the RSS parsing regex if needed (RSS formats vary).

- [ ] **Step 10: Activate the workflow**

  Toggle the workflow to `Active`. It will now run daily at 6am.

- [ ] **Step 11: Commit**

  Export the workflow as JSON from n8n (workflow menu → Download). Save to the repo:
  ```
  docs/superpowers/workflows/workflow-1-trend-scout.json
  ```
  ```bash
  git add docs/superpowers/workflows/workflow-1-trend-scout.json
  git commit -m "feat: add Trend Scout workflow (n8n workflow 1)"
  ```

---

## Task 4: Workflow 2 — Script Writer

**What it does:** Polls every 30 minutes. Mode A: picks up new trends and writes first scripts. Mode B: picks up draft scripts with revision > 0 and rewrites using critic feedback.

- [ ] **Step 1: Create the workflow**

  Create a new workflow named `2 - Script Writer`.

- [ ] **Step 2: Add Schedule Trigger**

  Add a `Schedule Trigger` node. Cron: `0,30 * * * *` (runs at :00 and :30 every hour).

- [ ] **Step 3: Read trends tab for Mode A (new topics)**

  Add a `Google Sheets` node set to `Read Rows`:
  - Sheet: `trends`
  - Filter: Column `status` = `new`

  Name it `Read New Trends`.

- [ ] **Step 4: Read scripts tab for Mode B (revision topics)**

  Add a second `Google Sheets` node set to `Read Rows`:
  - Sheet: `scripts`
  - Filter: Column `status` = `draft`

  Then immediately add a `Code` node to filter for revision > 0 (n8n Sheets filters don't support numeric comparison):
  ```javascript
  return $input.all().filter(i => parseInt(i.json.revision || 0) > 0);
  ```

  Name it `Read Revision Scripts`.

- [ ] **Step 5: Add Merge node**

  Merge both read nodes with `Append` mode. Connect to a `Code` node that tags each item with its mode:

  ```javascript
  return $input.all().map(item => ({
    json: {
      ...item.json,
      _mode: item.json.script_text ? 'revision' : 'new_topic'
    }
  }));
  ```

  Name it `Tag Mode`.

- [ ] **Step 6: Add IF node to skip if no work**

  Add an `IF` node: condition = items count > 0. Connect the `false` branch to a `NoOp` node to end gracefully when there's nothing to process.

- [ ] **Step 7: Add HTTP Request node for Claude API — script generation**

  Add an `HTTP Request` node after the IF true branch:
  - Method: `POST`
  - URL: `https://api.anthropic.com/v1/messages`
  - Headers:
    - `x-api-key`: `{{ $credentials.anthropic_key }}`  *(use n8n expression with your stored credential value)*
    - `anthropic-version`: `2023-06-01`
    - `content-type`: `application/json`
  - Body (JSON):

  ```json
  {
    "model": "claude-haiku-4-5",
    "max_tokens": 400,
    "messages": [
      {
        "role": "user",
        "content": "={{ $json._mode === 'revision' ? 'You are rewriting a finance video script based on critic feedback. Original script: ' + $json.script_text + '\n\nCritic feedback: ' + $json.feedback + '\n\nRewrite the script improving the weak areas. Keep it under 150 words.' : 'Write a 55-second finance video script about: ' + $json.topic + '\n\nFormat:\nHOOK (0-3s): A scroll-stopping question or shocking financial stat\nVALUE (3-45s): 3 punchy, specific, actionable tips - simple language, no jargon\nCTA (45-55s): Follow for a daily money tip. Not financial advice.\n\nMax 150 words total. Be specific and surprising.' }}"
      }
    ]
  }
  ```

  Name it `Claude - Write Script`.

- [ ] **Step 8: Add Code node to extract script text**

  ```javascript
  const items = $input.all();
  return items.map(item => ({
    json: {
      ...item.json,
      script_text: item.json.content[0].text
    }
  }));
  ```

  Name it `Extract Script`.

- [ ] **Step 9: Add Google Sheets node — append new script row (Mode A)**

  Add an `IF` node to split Mode A vs Mode B (condition: `_mode === 'new_topic'`).

  **Mode A branch:** Add a `Google Sheets` Append node to `scripts` tab with fields:
  - `record_id` = `{{ $json.record_id }}`
  - `date` = `{{ $json.date }}`
  - `topic` = `{{ $json.topic }}`
  - `script_text` = `{{ $json.script_text }}`
  - `revision` = `0`
  - `status` = `draft`

  Then add a `Google Sheets` Update node to `trends` tab:
  - Find row where `record_id` = `{{ $json.record_id }}`
  - Update `status` = `scripted`

- [ ] **Step 10: Add Google Sheets node — update existing script row (Mode B)**

  **Mode B branch:** Add a `Google Sheets` Update node to `scripts` tab:
  - Find row where `record_id` = `{{ $json.record_id }}`
  - Update: `script_text` = `{{ $json.script_text }}`, `revision` = `{{ parseInt($json.revision) + 1 }}`, `status` = `draft`

- [ ] **Step 11: Test Mode A**

  Manually add a test row to the `trends` tab with `status: new` and any topic. Click `Test Workflow`. Verify a new row appears in the `scripts` tab with `status: draft` and the trend row updates to `scripted`.

- [ ] **Step 12: Test Mode B**

  Manually add a row to the `scripts` tab with `status: draft`, `revision: 1`, and some `feedback` text. Run the workflow. Verify the script_text is updated and revision increments to 2.

- [ ] **Step 13: Activate and commit**

  Toggle workflow to Active. Export JSON to `docs/superpowers/workflows/workflow-2-script-writer.json`.
  ```bash
  git add docs/superpowers/workflows/workflow-2-script-writer.json
  git commit -m "feat: add Script Writer workflow (n8n workflow 2)"
  ```

---

## Task 5: Workflow 3 — Script Critic

**What it does:** Polls at :10 and :40. Reads draft scripts, scores them via Claude, approves if avg ≥ 7.0, or loops back for rewrite (up to 3 revisions) before flagging for manual review.

- [ ] **Step 1: Create the workflow**

  Create a new workflow named `3 - Script Critic`.

- [ ] **Step 2: Add Schedule Trigger**

  Cron: `10,40 * * * *` (runs at :10 and :40 every hour).

- [ ] **Step 3: Read draft scripts from Sheets**

  Add a `Google Sheets` Read node:
  - Sheet: `scripts`
  - Filter: `status` = `draft`

  Name it `Read Draft Scripts`.

- [ ] **Step 4: Add IF node to skip if nothing to process**

  If no rows returned, end gracefully with NoOp.

- [ ] **Step 5: Add Claude API call — critic scoring**

  Add an `HTTP Request` node:
  - Method: POST
  - URL: `https://api.anthropic.com/v1/messages`
  - Headers: same as before (`x-api-key`, `anthropic-version`, `content-type`)
  - Body:

  ```json
  {
    "model": "claude-haiku-4-5",
    "max_tokens": 200,
    "messages": [
      {
        "role": "user",
        "content": "={{ 'Score this finance video script on 3 dimensions (1-10 each). Reply ONLY with valid JSON, no other text.\n\nScript:\n' + $json.script_text + '\n\nJSON format:\n{\"hook_score\": 7, \"virality_score\": 8, \"accuracy_score\": 9, \"feedback\": \"Brief improvement note if any score is below 7, else empty string\"}' }}"
      }
    ]
  }
  ```

  Name it `Claude - Critic`.

- [ ] **Step 6: Add Code node to parse scores**

  ```javascript
  const items = $input.all();
  return items.map(item => {
    const responseText = item.json.content[0].text;
    let scores;
    try {
      scores = JSON.parse(responseText);
    } catch (e) {
      // Fallback if Claude adds extra text
      const match = responseText.match(/\{[\s\S]*\}/);
      scores = match ? JSON.parse(match[0]) : { hook_score: 5, virality_score: 5, accuracy_score: 5, feedback: 'Parse error' };
    }
    const avg = ((scores.hook_score + scores.virality_score + scores.accuracy_score) / 3).toFixed(2);
    return {
      json: {
        ...item.json,
        hook_score: scores.hook_score,
        virality_score: scores.virality_score,
        accuracy_score: scores.accuracy_score,
        avg_score: parseFloat(avg),
        feedback: scores.feedback || ''
      }
    };
  });
  ```

  Name it `Parse Scores`.

- [ ] **Step 7: Add IF node — approved?**

  Condition: `avg_score >= 7`

  **True branch (approved):** Add Google Sheets Update node:
  - Find row where `record_id` = `{{ $json.record_id }}`
  - Update: `hook_score`, `virality_score`, `accuracy_score`, `avg_score`, `status` = `approved`

  **False branch:** Proceed to next IF node.

- [ ] **Step 8: Add IF node — max revisions reached?**

  Condition: `parseInt({{ $json.revision }}) >= 3`

  **True branch (needs-review):** Add Google Sheets Update node:
  - Update `status` = `needs-review`, all scores, feedback

  Then add a `Telegram` node:
  - Chat ID: your chat ID
  - Message: `⚠️ Script needs manual review after 3 revisions.\n\nTopic: {{ $json.topic }}\nAvg score: {{ $json.avg_score }}\nFeedback: {{ $json.feedback }}`

  **False branch (request revision):** Add Google Sheets Update node:
  - Update: all scores, `feedback` = `{{ $json.feedback }}`, `status` = `draft`
  - **Do NOT increment `revision` here.** Revision is incremented by Workflow 2 (Mode B) when it actually rewrites the script. Workflow 3 only writes feedback and resets status — Workflow 2 owns the counter.

- [ ] **Step 9: Test the approval path**

  Add a test row to `scripts` tab with a strong script and `status: draft`, `revision: 0`. Run workflow. Verify status updates to `approved` and scores are written.

- [ ] **Step 10: Test the revision path**

  Add a test row with a weak script and `status: draft`. Run workflow. Verify status stays `draft` and feedback is written.

- [ ] **Step 11: Activate and commit**

  Toggle to Active. Export to `docs/superpowers/workflows/workflow-3-script-critic.json`.
  ```bash
  git add docs/superpowers/workflows/workflow-3-script-critic.json
  git commit -m "feat: add Script Critic workflow (n8n workflow 3)"
  ```

---

## Task 6: Workflow 4 — Video Producer

**What it does:** Polls at :20 and :50. Picks up approved scripts, sends to D-ID to render an AI avatar video, polls until done, writes video URL to Sheets.

- [ ] **Step 1: Create the workflow**

  Create a new workflow named `4 - Video Producer`.

- [ ] **Step 2: Add Schedule Trigger**

  Cron: `20,50 * * * *` (runs at :20 and :50 every hour).

- [ ] **Step 3: Read approved scripts**

  Add a `Google Sheets` Read node:
  - Sheet: `scripts`, Filter: `status` = `approved`

  Name it `Read Approved Scripts`.

- [ ] **Step 4: Add IF node to skip if nothing to process**

  If no rows, end with NoOp.

- [ ] **Step 5: Add HTTP Request — D-ID create video**

  Add an `HTTP Request` node:
  - Method: `POST`
  - URL: `https://api.d-id.com/talks`
  - Headers:
    - `Authorization`: `Basic YOUR_BASE64_ENCODED_KEY`
    - `Content-Type`: `application/json`
  - Body:

  ```json
  {
    "source_url": "={{ $vars.DID_PRESENTER }}",
    "script": {
      "type": "text",
      "input": "={{ $json.script_text }}",
      "provider": {
        "type": "microsoft",
        "voice_id": "en-US-JennyNeural"
      }
    },
    "config": {
      "fluent": true,
      "result_format": "mp4"
    }
  }
  ```

  > **Note:** `source_url` is a publicly accessible image URL of your chosen avatar/presenter. Upload a photo to any public hosting or use D-ID's built-in presenter IDs from their presenter library API. Get your presenter ID from: `GET https://api.d-id.com/clips/presenters`.

  Name it `D-ID Create Video`.

- [ ] **Step 6: Add Code node to store talk ID**

  ```javascript
  return $input.all().map(item => ({
    json: {
      ...item.json,
      did_talk_id: item.json.id
    }
  }));
  ```

- [ ] **Step 7: Add Loop node to poll D-ID status**

  Use an n8n `Loop Over Items` + `Wait` node pattern for polling:

  Add a `Code` node that initializes a poll counter:
  ```javascript
  return $input.all().map(item => ({
    json: { ...item.json, poll_count: 0, video_ready: false }
  }));
  ```

  Add an `HTTP Request` node to check status:
  - Method: `GET`
  - URL: `https://api.d-id.com/talks/{{ $json.did_talk_id }}`
  - Headers: same Authorization header

  Name it `D-ID Poll Status`.

  Add a `Wait` node set to `30 seconds` before polling.

  Add an `IF` node:
  - Condition A: `status === 'done'` → proceed to write URL
  - Condition B: `poll_count >= 20` OR `status === 'error'` → go to error path
  - Default: increment `poll_count` and loop back to the Wait node

  > **n8n Loop Pattern:** Use a `Code` node to increment `poll_count` and a `Merge` node in `Wait for All` mode to create the loop. Alternatively, use n8n's built-in `Loop Over Items` node.

- [ ] **Step 8: Success path — write to videos tab**

  Add a `Code` node to extract the video URL:
  ```javascript
  return $input.all().map(item => ({
    json: {
      ...item.json,
      video_url: item.json.result_url
    }
  }));
  ```

  Add a `Google Sheets` Append node to `videos` tab:
  - `record_id`, `date`, `topic`, `video_url`, `status` = `ready`

  Add a `Google Sheets` Update node to `scripts` tab:
  - Find by `record_id`, update `status` = `produced`

- [ ] **Step 9: Error path — log and notify**

  Add a `Google Sheets` Append node to `videos` tab:
  - `record_id`, `date`, `topic`, `video_url` = ``, `status` = `failed`, `error_notes` = `D-ID render failed or timed out`

  Add a `Telegram` node:
  - Message: `❌ Video production failed.\nTopic: {{ $json.topic }}\nReason: D-ID render failed or timed out after 10 minutes.`

- [ ] **Step 10: Test with a real approved script**

  Manually set a test script row to `status: approved`. Run the workflow. D-ID will take 1–5 minutes to render. Verify the video URL appears in the `videos` tab with `status: ready`.

  Open the video URL in a browser and confirm the avatar video plays correctly.

- [ ] **Step 11: Activate and commit**

  Toggle to Active. Export to `docs/superpowers/workflows/workflow-4-video-producer.json`.
  ```bash
  git add docs/superpowers/workflows/workflow-4-video-producer.json
  git commit -m "feat: add Video Producer workflow (n8n workflow 4)"
  ```

---

## Task 7: Workflow 5 — Publisher

**What it does:** Polls at :05 and :35. Downloads the rendered video, generates a YouTube title, builds captions, publishes to all 3 platforms, logs results, sends daily summary.

- [ ] **Step 1: Create the workflow**

  Create a new workflow named `5 - Publisher`.

- [ ] **Step 2: Add Schedule Trigger**

  Cron: `5,35 * * * *` (runs at :05 and :35 every hour).

- [ ] **Step 3: Read ready videos from Sheets**

  Add a `Google Sheets` Read node:
  - Sheet: `videos`, Filter: `status` = `ready`

  Name it `Read Ready Videos`.

- [ ] **Step 4: Add IF node to skip if nothing to process**

  No rows → NoOp end.

- [ ] **Step 5: Download video from D-ID URL**

  Add an `HTTP Request` node:
  - Method: `GET`
  - URL: `{{ $json.video_url }}`
  - Response Format: `File`

  Name it `Download Video`. This loads the MP4 into n8n's binary data buffer.

- [ ] **Step 6: Generate YouTube title via Claude**

  Add an `HTTP Request` node:
  - Method: POST, URL: `https://api.anthropic.com/v1/messages`
  - Body:

  ```json
  {
    "model": "claude-haiku-4-5",
    "max_tokens": 30,
    "messages": [
      {
        "role": "user",
        "content": "={{ 'Generate a single YouTube Shorts title (max 60 characters, no quotes) for a finance video about: ' + $json.topic + '. Make it punchy and curiosity-driven.' }}"
      }
    ]
  }
  ```

  Add a `Code` node to extract the title:
  ```javascript
  return $input.all().map(item => ({
    json: {
      ...item.json,
      yt_title: item.json.content[0].text.trim().replace(/^["']|["']$/g, '').slice(0, 60)
    }
  }));
  ```

- [ ] **Step 7: Build shared caption**

  Add a `Code` node:
  ```javascript
  return $input.all().map(item => {
    // Extract hook line (first sentence) from script_text
    const hook = item.json.script_text
      ? item.json.script_text.split('\n').find(l => l.includes('HOOK:') || l.trim().length > 10)?.replace('HOOK:', '').trim() || item.json.topic
      : item.json.topic;

    const caption = `${hook}\n\n#finance #investing #moneytips #passiveincome #financialfreedom #shorts\n\nNot financial advice. For entertainment purposes only.`;

    return { json: { ...item.json, caption } };
  });
  ```

- [ ] **Step 8: Upload to YouTube Shorts**

  Add an `HTTP Request` node:
  - Method: `POST`
  - URL: `https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status`
  - Authentication: `Generic Credential Type` → OAuth2, use `Google Pipeline` credential
  - Body Type: `Multipart Form Data`
    - Field `snippet`: JSON string `{"title":"{{ $json.yt_title }}","description":"{{ $json.caption }}","categoryId":"22","tags":["finance","investing","shorts","moneytips"]}`
    - Field `status`: JSON string `{"privacyStatus":"public","selfDeclaredMadeForKids":false}`
    - Field `video`: Binary data from the Download Video node

  Name it `Upload to YouTube`.

  Add a `Code` node to extract the YouTube video ID:
  ```javascript
  return $input.all().map(item => ({
    json: {
      ...item.json,
      yt_url: `https://youtube.com/shorts/${item.json.id}`
    }
  }));
  ```

- [ ] **Step 9: Upload to Instagram Reels**

  Instagram Reels upload is a two-step process via the Graph API:

  **Step 9a — Create container:**
  Add an `HTTP Request` node:
  - Method: `POST`
  - URL: `https://graph.facebook.com/v19.0/YOUR_IG_USER_ID/media`
  - Body (form data):
    - `media_type`: `REELS`
    - `video_url`: `{{ $json.video_url }}` (D-ID URL — must be publicly accessible)
    - `caption`: `{{ $json.caption }}`
    - `access_token`: your Instagram page access token

  **Step 9b — Store container ID and wait:**

  Add a `Code` node immediately after the container creation response to save the ID:
  ```javascript
  return $input.all().map(item => ({
    json: { ...item.json, ig_container_id: item.json.id }
  }));
  ```

  Then add a `Wait` node (30 seconds — Instagram needs time to process the video).

  **Step 9c — Publish container:**
  Add an `HTTP Request` node:
  - Method: `POST`
  - URL: `https://graph.facebook.com/v19.0/YOUR_IG_USER_ID/media_publish`
  - Body: `creation_id={{ $json.ig_container_id }}` + `access_token`

  Add a `Code` node:
  ```javascript
  return $input.all().map(item => ({
    json: { ...item.json, ig_url: `https://www.instagram.com/p/${item.json.id}` }
  }));
  ```

- [ ] **Step 10: Upload to TikTok (skip gracefully if not approved)**

  Add an `IF` node first:
  - Condition: check if TikTok credential is configured (use a boolean variable set in n8n settings)
  - **False branch:** Set `tt_url` = `skipped` and continue

  **True branch:** Add an `HTTP Request` node:
  - Method: `POST`
  - URL: `https://open.tiktokapis.com/v2/post/publish/video/init/`
  - Headers: `Authorization: Bearer YOUR_TIKTOK_ACCESS_TOKEN`
  - Body:
  ```json
  {
    "post_info": {
      "title": "={{ $json.caption.split('\\n')[0] }}",
      "privacy_level": "PUBLIC_TO_EVERYONE",
      "disable_duet": false,
      "disable_comment": false,
      "disable_stitch": false
    },
    "source_info": {
      "source": "FILE_UPLOAD",
      "video_size": 0,
      "chunk_size": 0,
      "total_chunk_count": 1
    }
  }
  ```

  > TikTok file upload requires a chunked upload flow. Follow TikTok's Content Posting API docs for the full flow once access is approved.

- [ ] **Step 11: Update videos tab with results**

  Add a `Google Sheets` Update node:
  - Find row where `record_id` = `{{ $json.record_id }}`
  - Update: `yt_url`, `ig_url`, `tt_url`, `status` = `published`

- [ ] **Step 12: Send daily summary notification**

  Add a `Telegram` node:
  - Message:
  ```
  ✅ Daily video published!

  Topic: {{ $json.topic }}
  Script score: {{ $json.avg_score }}/10

  📺 YouTube: {{ $json.yt_url }}
  📸 Instagram: {{ $json.ig_url }}
  🎵 TikTok: {{ $json.tt_url }}
  ```

- [ ] **Step 13: Test end-to-end**

  Set a test row in `videos` tab with `status: ready` and a real D-ID video URL (from Task 6 test). Run the workflow. Verify:
  - YouTube video is uploaded and URL is returned
  - Instagram Reel is published (check the account)
  - `videos` tab row updated to `published`
  - Telegram notification received

- [ ] **Step 14: Activate and commit**

  Toggle to Active. Export to `docs/superpowers/workflows/workflow-5-publisher.json`.
  ```bash
  git add docs/superpowers/workflows/workflow-5-publisher.json
  git commit -m "feat: add Publisher workflow (n8n workflow 5)"
  ```

---

## Task 8: Full End-to-End Test

**What it does:** Verify the entire pipeline runs automatically from trend detection through to published video.

- [ ] **Step 1: Clear test data**

  Delete all test rows from all 3 Sheets tabs. Start clean.

- [ ] **Step 2: Trigger Workflow 1 manually**

  In n8n, open Workflow 1 and click `Test Workflow`. Verify 3 rows appear in the `trends` tab with `status: new`.

- [ ] **Step 3: Trigger Workflow 2 manually**

  Open Workflow 2 and click `Test Workflow`. Verify:
  - 3 rows appear in `scripts` tab with `status: draft`
  - 3 trend rows updated to `status: scripted`

- [ ] **Step 4: Trigger Workflow 3 manually**

  Open Workflow 3 and click `Test Workflow`. Verify:
  - At least 1 script moves to `status: approved`
  - Scores are written (hook_score, virality_score, accuracy_score, avg_score)
  - Any script below 7.0 has feedback written

- [ ] **Step 5: Trigger Workflow 4 manually**

  Open Workflow 4 and click `Test Workflow`. D-ID will take 1–5 minutes. Verify:
  - A row appears in `videos` tab with `status: ready` and a valid video URL
  - The approved script row updates to `status: produced`

- [ ] **Step 6: Open the video URL and verify quality**

  Download or play the video URL from the `videos` tab. Confirm:
  - Avatar speaks the script clearly
  - Video is in portrait format (1080×1920)
  - Audio is clear

- [ ] **Step 7: Trigger Workflow 5 manually**

  Open Workflow 5 and click `Test Workflow`. Verify:
  - YouTube Shorts video is uploaded (check your YouTube Studio)
  - Instagram Reel is published (check the account)
  - `videos` tab row updates to `published` with platform URLs
  - Telegram notification received

- [ ] **Step 8: Let the system run overnight automatically**

  Leave all 5 workflows active. Check the Sheets tabs the next morning. Verify the full pipeline ran automatically at 6am without intervention.

- [ ] **Step 9: Final commit**

  ```bash
  git add .
  git commit -m "feat: complete viral finance content automation pipeline - all 5 workflows active"
  git push origin claude/add-superpowers-marketplace-zzsdT
  ```

---

## Reference: Poll Schedule Summary

| Workflow | Runs at | Offset Purpose |
|---|---|---|
| 1 - Trend Scout | 6:00 AM daily | Seeds the day's topics |
| 2 - Script Writer | :00 and :30 every hour | Picks up new trends + revisions |
| 3 - Script Critic | :10 and :40 every hour | Reviews after Writer |
| 4 - Video Producer | :20 and :50 every hour | Renders after Critic approves |
| 5 - Publisher | :05 and :35 every hour | Publishes after Producer finishes |

## Reference: Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| Trends tab empty after Workflow 1 | RSS parse regex mismatch | Inspect raw RSS body in node output, adjust regex |
| Scripts all fail critic with low scores | Script prompt too vague | Tighten the Claude prompt with more specific finance examples |
| D-ID returns 401 | API key encoding wrong | Re-encode `email:apikey` in Base64, paste fresh into credential |
| Instagram upload fails | Video URL not publicly accessible after D-ID expires | Ensure Workflow 5 runs same day as Workflow 4 |
| YouTube returns 403 | OAuth scope missing | Re-authenticate Google credential with `youtube.upload` scope |
| TikTok step errors | API not approved yet | Set TikTok skip flag to true, revisit after approval |
