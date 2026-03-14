# LeetCode Reminder (ntfy)

Sends LeetCode reminders to your phone using [ntfy](https://ntfy.sh/) (no email).

## What this project does

- Checks LeetCode Problem of the Day status for configured users.
- Sends a notification only when at least one user has not solved POTD.
- Runs an inactivity check and sends a notification when users are inactive.
- Uses GitHub Actions cron for scheduling (not in-script scheduling).

## Current users

- `codesmith17`
- `krishna170902`

## Tech stack

- Node.js
- Fetch API (built into Node.js 18+)
- ntfy push notifications

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

## Notes

- If everyone solved POTD, no reminder is sent.
- If ntfy send fails, retry logic attempts multiple times.
- Topic names are public on `ntfy.sh`; use a unique hard-to-guess topic.
