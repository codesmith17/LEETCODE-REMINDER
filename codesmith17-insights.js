const NTFY_TOPIC = process.env.NTFY_TOPIC;
const MODE = process.env.MODE || 'contest-status';
const USERNAME = 'codesmith17';
const LEETCODE_GRAPHQL_URL = 'https://leetcode.com/graphql/';
const RATING_HEADLINES = [
    'LeetCode Pulse',
    'Rating Radar',
    'Contest Signal',
    'Rank Rhythm'
];
const STATUS_HEADLINES = [
    'Contest Scout',
    'Arena Watch',
    'Weekend Radar',
    'Battle Board'
];
const REMINDER_HEADLINES = [
    'Launch Alert',
    'Arena Countdown',
    'Contest Ignition',
    'Final Warmup Ping'
];
const TITLE_FONT_FAMILY = "'Georgia', 'Times New Roman', serif";
const META_FONT_FAMILY = "'Trebuchet MS', 'Verdana', sans-serif";
const AXIS_FONT_FAMILY = "'Courier New', 'Lucida Console', monospace";

function assertRequiredEnv() {
    if (!NTFY_TOPIC) {
        throw new Error('Missing NTFY_TOPIC env variable.');
    }
}

function toAsciiHeaderValue(value) {
    return String(value).replace(/[^\x20-\x7E]/g, '-');
}

function pickBySeed(items, seed) {
    const index = Math.abs(seed) % items.length;
    return items[index];
}

async function postJson(url, body) {
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
    }

    return response.json();
}

async function sendNtfyNotification(title, message, tags = 'chart_with_upwards_trend', options = {}) {
    const maxRetries = 3;
    const url = `https://ntfy.sh/${NTFY_TOPIC}`;
    const headers = {
        Title: toAsciiHeaderValue(title),
        Tags: toAsciiHeaderValue(tags),
        Priority: toAsciiHeaderValue(options.priority || '3'),
        'Content-Type': 'text/plain; charset=utf-8'
    };

    if (options.attachUrl) {
        headers.Attach = toAsciiHeaderValue(options.attachUrl);
    }

    for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: message
            });

            if (!response.ok) {
                throw new Error(`ntfy failed with status ${response.status}`);
            }

            console.log(`✅ ntfy notification sent (attempt ${attempt}).`);
            return;
        } catch (error) {
            console.warn(`⚠️ ntfy send failed on attempt ${attempt}: ${error.message}`);
            if (attempt === maxRetries) {
                throw error;
            }
            await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
        }
    }
}

async function fetchContestRankingHistory(username) {
    const query = `
        query userContestData($username: String!) {
            userContestRanking(username: $username) {
                rating
                globalRanking
                topPercentage
                attendedContestsCount
            }
            userContestRankingHistory(username: $username) {
                attended
                trendDirection
                rating
                ranking
                contest {
                    title
                    startTime
                }
            }
        }
    `;

    const response = await postJson(LEETCODE_GRAPHQL_URL, {
        query,
        variables: { username }
    });

    if (!response.data) {
        throw new Error('Invalid response for contest ranking history.');
    }

    return response.data;
}

async function fetchUpcomingContests() {
    const query = `
        query upcomingContests {
            allContests {
                title
                titleSlug
                startTime
                duration
            }
        }
    `;

    const response = await postJson(LEETCODE_GRAPHQL_URL, { query });

    if (!response.data || !response.data.allContests) {
        throw new Error('Invalid response for upcoming contests.');
    }

    const now = Math.floor(Date.now() / 1000);
    return response.data.allContests
        .filter((contest) => contest.startTime > now)
        .sort((a, b) => a.startTime - b.startTime);
}

function formatIstDateTime(unixSeconds) {
    return new Date(unixSeconds * 1000).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
}

function formatIstShortDate(unixSeconds) {
    return new Date(unixSeconds * 1000).toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

function getIstDateKey(unixSeconds) {
    const date = new Date(unixSeconds * 1000);
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    return formatter.format(date);
}

function buildRatingChartConfig(history) {
    const lastEntries = history.slice(-16);
    const labels = lastEntries.map((entry) => formatIstShortDate(entry.contest.startTime));
    const ratings = lastEntries.map((entry) => Math.round(entry.rating));
    const pointColors = ratings.map((value, index) => (
        index === 0 || value >= ratings[index - 1] ? '#22c55e' : '#ef4444'
    ));
    const minRating = Math.min(...ratings);
    const maxRating = Math.max(...ratings);

    return {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: `${USERNAME} Rating`,
                data: ratings,
                borderColor: '#06b6d4',
                backgroundColor: 'rgba(56, 189, 248, 0.25)',
                borderWidth: 4,
                fill: true,
                tension: 0.35,
                pointRadius: 4,
                pointHoverRadius: 7,
                pointBorderWidth: 2,
                pointBackgroundColor: pointColors,
                pointBorderColor: '#0f172a',
                pointStyle: 'circle'
            }]
        },
        options: {
            backgroundColor: '#020617',
            layout: {
                padding: {
                    top: 18,
                    right: 22,
                    bottom: 14,
                    left: 14
                }
            },
            elements: {
                line: {
                    capBezierPoints: true
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    align: 'end',
                    labels: {
                        color: '#cbd5e1',
                        usePointStyle: true,
                        pointStyle: 'line',
                        boxWidth: 20,
                        boxHeight: 8,
                        padding: 18,
                        font: {
                            family: META_FONT_FAMILY,
                            size: 13,
                            weight: '600'
                        }
                    }
                },
                title: {
                    display: true,
                    text: `${USERNAME} • LeetCode Rating Journey`,
                    color: '#f8fafc',
                    padding: {
                        bottom: 2
                    },
                    font: {
                        family: TITLE_FONT_FAMILY,
                        size: 22,
                        weight: '700'
                    }
                },
                subtitle: {
                    display: true,
                    text: 'Last 16 attended contests',
                    color: '#94a3b8',
                    padding: {
                        bottom: 16
                    },
                    font: {
                        family: META_FONT_FAMILY,
                        size: 12
                    }
                },
                datalabels: {
                    display: false
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(148, 163, 184, 0.12)'
                    },
                    ticks: {
                        color: '#cbd5e1',
                        autoSkip: true,
                        maxTicksLimit: 8,
                        maxRotation: 60,
                        minRotation: 35,
                        padding: 8,
                        font: {
                            family: AXIS_FONT_FAMILY,
                            size: 11,
                            weight: '500'
                        }
                    },
                    title: {
                        display: true,
                        text: 'Contest date (IST)',
                        color: '#94a3b8',
                        padding: {
                            top: 10
                        },
                        font: {
                            family: META_FONT_FAMILY,
                            size: 12,
                            weight: '600'
                        }
                    }
                },
                y: {
                    min: Math.floor(minRating / 50) * 50 - 25,
                    max: Math.ceil(maxRating / 50) * 50 + 25,
                    grid: {
                        color: 'rgba(148, 163, 184, 0.16)'
                    },
                    ticks: {
                        color: '#cbd5e1',
                        padding: 10,
                        font: {
                            family: AXIS_FONT_FAMILY,
                            size: 11,
                            weight: '500'
                        }
                    },
                    title: {
                        display: true,
                        text: 'Rating',
                        color: '#94a3b8',
                        padding: {
                            bottom: 8
                        },
                        font: {
                            family: META_FONT_FAMILY,
                            size: 12,
                            weight: '600'
                        }
                    }
                }
            }
        }
    };
}

function buildRatingChartUrlFromConfig(chartConfig) {
    return `https://quickchart.io/chart?width=900&height=420&format=png&c=${encodeURIComponent(JSON.stringify(chartConfig))}`;
}

async function buildAttachedChartUrl(history) {
    const chartConfig = buildRatingChartConfig(history);
    const fallbackUrl = buildRatingChartUrlFromConfig(chartConfig);

    try {
        const response = await postJson('https://quickchart.io/chart/create', {
            width: 900,
            height: 420,
            format: 'png',
            chart: chartConfig
        });

        if (response && typeof response.url === 'string' && response.url.startsWith('http')) {
            return response.url;
        }
    } catch (error) {
        console.warn(`⚠️ Could not create short chart URL: ${error.message}`);
    }

    return fallbackUrl;
}

async function runRatingWeeklyCheck() {
    console.log(`📈 Running weekly rating check for ${USERNAME}...`);
    const data = await fetchContestRankingHistory(USERNAME);
    const history = (data.userContestRankingHistory || []).filter((entry) => entry.attended);

    if (history.length < 2) {
        console.log('ℹ️ Not enough contest history to compute rating change.');
        return;
    }

    const latest = history[history.length - 1];
    const previous = history[history.length - 2];
    const ratingDelta = Math.round(latest.rating - previous.rating);
    const contestAgeDays = (Date.now() / 1000 - latest.contest.startTime) / (24 * 60 * 60);

    if (contestAgeDays > 8) {
        console.log('ℹ️ Latest contest is older than 8 days. Skipping weekly rating notification.');
        return;
    }

    if (ratingDelta === 0) {
        console.log('ℹ️ Rating unchanged in latest contest. Skipping notification.');
        return;
    }

    const arrow = ratingDelta > 0 ? '📈' : '📉';
    const deltaText = ratingDelta > 0 ? `+${ratingDelta}` : `${ratingDelta}`;
    const currentRating = Math.round(latest.rating);
    const maxRating = Math.round(Math.max(...history.map((entry) => entry.rating)));
    const minRating = Math.round(Math.min(...history.map((entry) => entry.rating)));
    const attended = data.userContestRanking?.attendedContestsCount ?? history.length;
    const graphUrl = await buildAttachedChartUrl(history);
    const styleSeed = latest.contest.startTime + currentRating + ratingDelta;
    const headline = pickBySeed(RATING_HEADLINES, styleSeed);
    const energyLine = ratingDelta > 0
        ? 'Momentum is up. Keep this streak alive.'
        : 'Small dip detected. Next contest can flip the trend.';

    const message = [
        `Rating update for ${USERNAME}`,
        '',
        `${arrow} Rating moved ${deltaText} in ${latest.contest.title}`,
        '',
        `Current  : ${currentRating}`,
        `Peak     : ${maxRating}`,
        `Floor    : ${minRating}`,
        `Attended : ${attended}`,
        `Updated  : ${formatIstDateTime(latest.contest.startTime)}`,
        '',
        energyLine,
        'Chart is attached with this notification.'
    ].join('\n');

    await sendNtfyNotification(
        `${headline} - ${USERNAME} ${deltaText}`,
        message,
        ratingDelta > 0 ? 'chart_with_upwards_trend,trophy,sparkles' : 'chart_with_downwards_trend,warning,rotating_light',
        {
            priority: ratingDelta > 0 ? '4' : '3',
            attachUrl: graphUrl
        }
    );
}

function getMinutesUntil(unixSeconds) {
    return Math.round((unixSeconds * 1000 - Date.now()) / 60000);
}

async function runContestStatusCheck() {
    console.log(`🏁 Running contest status check for ${USERNAME}...`);
    const contests = await fetchUpcomingContests();
    const now = Math.floor(Date.now() / 1000);
    const todayIst = getIstDateKey(now);
    const todaysContests = contests.filter((contest) => getIstDateKey(contest.startTime) === todayIst);
    const styleSeed = now + contests.length;
    const headline = pickBySeed(STATUS_HEADLINES, styleSeed);

    const nextContest = contests[0];
    const lines = [`Contest status for ${USERNAME}`];

    if (todaysContests.length > 0) {
        lines.push('', `✅ Contest today (${todaysContests.length})`);
        for (const contest of todaysContests.slice(0, 3)) {
            lines.push(`- ${contest.title} at ${formatIstDateTime(contest.startTime)}`);
        }
    } else {
        lines.push('', '❌ No contest today.');
    }

    if (nextContest) {
        const minutesLeft = getMinutesUntil(nextContest.startTime);
        lines.push('', `Next contest: ${nextContest.title}`);
        lines.push(`Starts at: ${formatIstDateTime(nextContest.startTime)}`);
        lines.push(`Starts in: ${Math.max(0, minutesLeft)} minutes`);
    } else {
        lines.push('', 'No upcoming contests found right now.');
    }

    await sendNtfyNotification(
        `${headline} - ${USERNAME}`,
        lines.join('\n'),
        todaysContests.length > 0 ? 'calendar,tada,rocket' : 'calendar,compass',
        {
            priority: todaysContests.length > 0 ? '4' : '2'
        }
    );
}

async function runContestOneHourReminder() {
    console.log(`⏰ Running 1-hour contest reminder check for ${USERNAME}...`);
    const contests = await fetchUpcomingContests();

    const contest = contests.find((item) => {
        const minutesLeft = getMinutesUntil(item.startTime);
        return minutesLeft >= 45 && minutesLeft <= 75;
    });

    if (!contest) {
        console.log('ℹ️ No contest starting in ~1 hour. No reminder sent.');
        return;
    }

    const minutesLeft = getMinutesUntil(contest.startTime);
    const styleSeed = contest.startTime + minutesLeft;
    const headline = pickBySeed(REMINDER_HEADLINES, styleSeed);
    const message = [
        `Contest reminder for ${USERNAME}`,
        '',
        '🚨 Contest reminder',
        `${contest.title} starts in about ${Math.max(0, minutesLeft)} minutes.`,
        `Start time (IST): ${formatIstDateTime(contest.startTime)}`,
        '',
        'All the best! 💪'
    ].join('\n');

    await sendNtfyNotification(
        `${headline} - starts soon`,
        message,
        'alarm_clock,rocket,tada',
        {
            priority: '5'
        }
    );
}

async function main() {
    assertRequiredEnv();

    if (MODE === 'rating-weekly') {
        await runRatingWeeklyCheck();
        return;
    }

    if (MODE === 'contest-reminder') {
        await runContestOneHourReminder();
        return;
    }

    if (MODE === 'contest-status') {
        await runContestStatusCheck();
        return;
    }

    throw new Error(`Unknown MODE: ${MODE}`);
}

main()
    .then(() => {
        process.exit(0);
    })
    .catch((error) => {
        console.error(`❌ ${MODE} failed:`, error.message);
        process.exit(1);
    });
