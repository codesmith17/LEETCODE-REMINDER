require('dotenv').config();
const nodemailer = require('nodemailer');
const axios = require('axios');
const schedule = require('node-schedule');

const USERS = ['codesmith17', 'krishna170902', 'rashmantri']; // LeetCode usernames

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

        const solvedProblems = response.data.data.recentAcSubmissionList.map(q => q.titleSlug);
        console.log(`✅ ${username} solved:`, solvedProblems);
        return solvedProblems;
    } catch (error) {
        console.error(`❌ Error fetching solved problems for ${username}:`, error.message);
        return [];
    }
}

// Check if POTD is solved for all users and send a summary email
async function sendReminder() {
    console.log('🔍 Checking if POTD is solved...');
    const potd = await fetchLeetCodePOTD();
    if (!potd) {
        console.log('⚠️ Skipping email, could not fetch POTD.');
        return;
    }

    let emailBody = `Hey there!\n\n📌 Today's LeetCode Problem of the Day:\n\nTitle: ${potd.title}\nDifficulty: ${potd.difficulty}\nLink: ${potd.link}\n\n`;

    for (const user of USERS) {
        const solvedProblems = await fetchRecentAcceptedSubmissions(user);
        const isSolved = solvedProblems.includes(potd.titleSlug);

        console.log(`🔎 ${user} solved POTD?`, isSolved ? '✅ Yes' : '❌ No');

        emailBody += `👤 ${user}: ${isSolved ? '✅ Already Solved! 🎉' : '❌ Not Solved Yet! ⏳'}\n`;
    }

    emailBody += `\n🚀 Keep coding and have a great day!`;

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.EMAIL_USER, // Change if needed
        subject: `LeetCode POTD Status for ${new Date().toLocaleDateString()}`,
        text: emailBody
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

// Schedule jobs at 10 AM IST (4:30 AM UTC) and 10 PM IST (4:30 PM UTC)
schedule.scheduleJob('30 4 * * *', sendReminder);  // 10 AM IST
schedule.scheduleJob('30 16 * * *', sendReminder); // 10 PM IST

// Run once on script start
sendReminder();
