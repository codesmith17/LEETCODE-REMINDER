require('dotenv').config();
const nodemailer = require('nodemailer');
const axios = require('axios');
const schedule = require('node-schedule');

const USERS = ['codesmith17', 'krishna170902']; // List of usernames

// Configure nodemailer with environment variables
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

// Fetch the LeetCode Problem of the Day (POTD)
async function fetchLeetCodePOTD() {
    try {
        console.log('📌 Fetching LeetCode POTD...');
        const response = await axios.post('https://leetcode.com/graphql/', {
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

        console.log('✅ POTD API Response:', JSON.stringify(response.data, null, 2));

        const question = response.data.data.activeDailyCodingChallengeQuestion;
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

// Fetch last 50 accepted submissions for a user
async function fetchRecentAcceptedSubmissions(username) {
    try {
        console.log(`📌 Fetching last 50 solved problems for user: ${username}...`);
        const response = await axios.post('https://leetcode.com/graphql/', {
            query: `
                query recentAcSubmissions($username: String!, $limit: Int!) {
                    recentAcSubmissionList(username: $username, limit: $limit) {
                        titleSlug
                    }
                }`,
            variables: { username, limit: 50 }
        });

        console.log(`✅ Solved Problems API Response for ${username}:`, JSON.stringify(response.data, null, 2));

        if (!response.data.data.recentAcSubmissionList) {
            console.warn(`⚠️ User "${username}" not found or has no submissions.`);
            return [];
        }

        return response.data.data.recentAcSubmissionList.map(q => q.titleSlug);
    } catch (error) {
        console.error(`❌ Error fetching solved problems for ${username}:`, error.message);
        return [];
    }
}

// Check if both users solved POTD and send a single email
async function sendReminder() {
    console.log('🔍 Checking if POTD is solved for both users...');
    const potd = await fetchLeetCodePOTD();
    if (!potd) {
        console.log('⚠️ Skipping email, could not fetch POTD.');
        return;
    }

    let results = [];
    for (const user of USERS) {
        const solvedProblems = await fetchRecentAcceptedSubmissions(user);
        const isSolved = solvedProblems.includes(potd.titleSlug);
        results.push({ user, isSolved });
    }

    console.log(`📌 POTD: ${potd.title} (${potd.difficulty})`);
    console.log(`🔎 Solved Status:`, results);

    let message = `Hey there!\n\nToday's LeetCode Problem of the Day:\n\n📌 Title: ${potd.title}\n⚡ Difficulty: ${potd.difficulty}\n🔗 Link: ${potd.link}\n\n`;

    results.forEach(({ user, isSolved }) => {
        message += `👤 **${user}**: ${isSolved ? '✅ Already solved! Enjoy your rest! 😎' : '❌ Not solved yet! Time to grind! ⚡'}\n\n`;
    });

    message += `🚀 Keep coding and improving!`;

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.EMAIL_USER, // Change if needed
        subject: `LeetCode POTD Status for ${USERS.join(' & ')}`,
        text: message
    };

    console.log('📧 Sending email reminder...');
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('❌ Error sending email:', error.message);
        } else {
            console.log('✅ Email sent successfully:', info.response);
        }
    });
}
// Schedule at 10 AM IST (4:30 AM UTC)
schedule.scheduleJob('30 4 * * *', sendReminder);

// Schedule at 10 PM IST (4:30 PM UTC)
schedule.scheduleJob('30 16 * * *', sendReminder);

// Run once on script start
sendReminder();
