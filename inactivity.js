const USERS = ['codesmith17', 'krishna170902'];
const NTFY_TOPIC = process.env.NTFY_TOPIC;

function toAsciiHeaderValue(value) {
    return String(value).replace(/[^\x20-\x7E]/g, '-');
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

async function sendNtfyNotification(title, message, tags = 'alarm_clock') {
    if (!NTFY_TOPIC) {
        throw new Error('Missing NTFY_TOPIC env variable.');
    }

    const url = `https://ntfy.sh/${NTFY_TOPIC}`;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    Title: toAsciiHeaderValue(title),
                    Tags: toAsciiHeaderValue(tags),
                    Priority: '4',
                    'Content-Type': 'text/plain; charset=utf-8'
                },
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

async function fetchRecentAcceptedSubmissions(username) {
    try {
        console.log(`📌 Fetching last 50 solved problems for user: ${username}...`);
        const responseData = await postJson('https://leetcode.com/graphql/', {
            query: `
                query recentAcSubmissions($username: String!, $limit: Int!) {
                    recentAcSubmissionList(username: $username, limit: $limit) {
                        titleSlug
                        timestamp
                    }
                }`,
            variables: { username, limit: 50 }
        });

        if (!responseData || !responseData.data || !responseData.data.recentAcSubmissionList) {
            console.warn(`⚠️ Invalid API response for ${username}:`, JSON.stringify(responseData, null, 2));
            return [];
        }

        console.log(`✅ Solved Problems API Response for ${username}:`, JSON.stringify(responseData.data.recentAcSubmissionList, null, 2));

        return responseData.data.recentAcSubmissionList;
    } catch (error) {
        console.error(`❌ Error fetching solved problems for ${username}:`, error.message);
        return [];
    }
}

async function checkInactiveUsers() {
    console.log('🔍 Checking for inactive users...');
    const now = new Date();
    const today530AM_IST = Math.floor(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0)).getTime() / 1000);

    let notificationBody = `Hey there!\n\n📢 कुछ लोग LeetCode पे सवाल नहीं बना रहे! \n\n`;

    const results = await Promise.all(USERS.map(user => fetchRecentAcceptedSubmissions(user)));

    let inactiveUsers = [];
    USERS.forEach((user, index) => {
        const solvedProblems = results[index];
        if (solvedProblems.length === 0) {
            // If no problems have been solved at all
            inactiveUsers.push({ user, days: "काफी समय" });
            notificationBody += `😡 भाई ${user}, पढ़ाई शुरू कर! बहुत दिनों से कुछ solve नहीं किया! 🔥\n`;
        } else {
            const lastSolvedTimestamp = Math.max(...solvedProblems.map(q => q.timestamp));
            const inactiveDays = Math.floor((today530AM_IST - lastSolvedTimestamp) / (24 * 60 * 60));

            if (inactiveDays > 0) {
                inactiveUsers.push({ user, days: inactiveDays });
                notificationBody += `😡 भाई ${user}, पढ़ाई शुरू कर! ${inactiveDays} दिन से कुछ solve नहीं किया! 🔥\n`;
            }
        }
    });

    if (inactiveUsers.length > 0) {
        notificationBody += `\n🚀 आज से coding शुरू कर वरना नाराज हो जाएंगे! 😤`;
        try {
            await sendNtfyNotification(
                'भाई पढ़ाई शुरू कर! 😡',
                notificationBody,
                'rotating_light,warning'
            );
            process.exit(0);
        } catch (error) {
            console.error('❌ Error sending inactivity notification:', error.message);
            process.exit(1);
        }
    } else {
        console.log('✅ सभी user active हैं! कोई issue नहीं।');
        process.exit(0);  // Exit if all users are active
    }
}


// Run the check once
checkInactiveUsers();
