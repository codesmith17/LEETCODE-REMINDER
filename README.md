# LeetCode Reminder (ntfy)

Sends LeetCode reminders to your phone using [ntfy](https://ntfy.sh/) (no email).

## What this project does

- Checks LeetCode Problem of the Day status for configured users.
- Sends a notification only when at least one user has not solved POTD.
- Runs an inactivity check and sends a notification when users are inactive.
- Uses GitHub Actions cron for scheduling (not in-script scheduling).
- Tracks `codesmith17` contest rating updates weekly.
- Sends contest status updates in the morning and evening.
- Sends one-hour-before contest reminders on weekends when applicable.

## Current POTD/inactivity users

- `codesmith17`
- `krishna170902`

## Contest/rating user

- `codesmith17`

## Tech stack

- Node.js
- Fetch API (built into Node.js 18+)
- ntfy push notifications
- QuickChart URL generation for rating graph previews

## Phone setup (ntfy)

1. Install the `ntfy` app on your phone.
2. Subscribe to your own private topic.
3. Keep notification permission enabled for the app.

## GitHub Actions setup

Create this repository secret:

- `NTFY_TOPIC`: your ntfy topic name

Workflow file: `.github/workflows/leetcode_reminder.yml`

- Runs reminder twice daily.
- Runs inactivity check once daily.
- Runs contest status checks twice daily.
- Runs contest one-hour checks hourly on weekends.
- Runs weekly rating change check once every Monday.

## Local setup

```bash
npm install
```

Set local environment variable before running commands.

## Run locally

Run POTD reminder check:

```bash
npm run reminder
```

Run inactivity check:

```bash
npm run inactivity
```

Run one-off test with inline env:

```bash
NTFY_TOPIC=<your_topic> npm run reminder
```

Run contest status check:

```bash
NTFY_TOPIC=<your_topic> npm run insights:contest-status
```

Run one-hour contest reminder check:

```bash
NTFY_TOPIC=<your_topic> npm run insights:contest-reminder
```

Run weekly rating change check:

```bash
NTFY_TOPIC=<your_topic> npm run insights:rating
```

## Notes

- If everyone solved POTD, no reminder is sent.
- If ntfy send fails, retry logic attempts multiple times.
- Topic names are public on `ntfy.sh`; use a unique hard-to-guess topic.
- Rating change notifications are gated to weekly checks to avoid spam.
