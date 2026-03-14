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

async function sendNtfyNotification(title, message, tags = 'computer') {
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
                    Priority: '3',
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

async function fetchLeetCodePOTD() {
    try {
        console.log('📌 Fetching LeetCode POTD...');
        const responseData = await postJson('https://leetcode.com/graphql/', {
            query: `
                query questionOfToday {
                    activeDailyCodingChallengeQuestion {
                        date
                        link
                        question {
                            title
                            titleSlug
                            difficulty
                        }
                    }
                }`
        });

        console.log('✅ POTD API Response:', JSON.stringify(responseData, null, 2));

        const question = responseData.data.activeDailyCodingChallengeQuestion;
        return {
            date: question.date,
            title: question.question.title,
            titleSlug: question.question.titleSlug,
            link: `https://leetcode.com${question.link}`,
            difficulty: question.question.difficulty
        };
    } catch (error) {
        console.error('❌ Error fetching LeetCode POTD:', error.message);
        return null;
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

      // Correct IST Calculation
      const now = new Date();
      const today530AM_IST = Math.floor(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0)).getTime() / 1000);

      const recentSubmissions = responseData.data.recentAcSubmissionList;
      const questionSolvedToday = recentSubmissions.filter(q => q.timestamp >= today530AM_IST);

      return questionSolvedToday.map(q => q.titleSlug);
  } catch (error) {
      console.error(`❌ Error fetching solved problems for ${username}:`, error.message);
      return [];
  }
}



async function sendReminder() {
    console.log('🔍 Checking if POTD is solved...');
    const potd = await fetchLeetCodePOTD();
    if (!potd) {
        console.log('⚠️ Skipping notification, could not fetch POTD.');
        process.exit(1);
        return;
    }

    let notificationBody = `Hey there!\n\n📌 Today's LeetCode Problem of the Day:\n\nTitle: ${potd.title}\nDifficulty: ${potd.difficulty}\nLink: ${potd.link}\n\n`;

    const results = await Promise.all(USERS.map(user => fetchRecentAcceptedSubmissions(user)));
    const unsolvedUsers = [];
    USERS.forEach((user, index) => {
      const solvedProblemsToday = results[index];
      const isSolved = solvedProblemsToday.includes(potd.titleSlug);
      console.log(`🔎 ${user} solved POTD?`, isSolved ? '✅ Yes' : '❌ No');
      if (!isSolved) {
        unsolvedUsers.push(user);
        notificationBody += `👤 ${user}: ❌ Not Solved Yet! ⏳\n`;
      }
  });
  

    notificationBody += `\n🚀 Keep coding and have a great day!`;

    if (unsolvedUsers.length > 0) {
      try {
        await sendNtfyNotification(
          `LeetCode POTD Status (${new Date().toLocaleDateString()})`,
          notificationBody,
          'warning,computer'
        );
        process.exit(0);
      } catch (error) {
        console.error('❌ Error sending ntfy notification:', error.message);
        process.exit(1);
      }
    } else {
      console.log(`✅ All ${USERS.length} have already solved today's POTD. Cancelling notification sending procedure`);
      process.exit(0);
    }
}

// Run once; scheduling is handled by GitHub Actions cron.
sendReminder();
