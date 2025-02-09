require('dotenv').config();
const nodemailer = require('nodemailer');
const axios = require('axios');
const schedule = require('node-schedule');

const USERNAME = 'codesmith17'; // Change this to your LeetCode username

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

// Fetch last 50 accepted submissions
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
        console.log(`✅ Solved Problems:`, solvedProblems);
        return solvedProblems;
    } catch (error) {
        console.error(`❌ Error fetching solved problems for ${username}:`, error.message);
        return [];
    }
}

// Check if POTD is solved and send an email
async function sendReminder() {
    console.log('🔍 Checking if POTD is solved...');
    const potd = await fetchLeetCodePOTD();
    if (!potd) {
        console.log('⚠️ Skipping email, could not fetch POTD.');
        return;
    }

    const solvedProblems = await fetchRecentAcceptedSubmissions(USERNAME);
    const isSolved = solvedProblems.includes(potd.titleSlug);

    console.log(`📌 POTD: ${potd.title} (${potd.difficulty})`);
    console.log(`🔎 Is POTD solved?`, isSolved ? '✅ Yes' : '❌ No');

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.EMAIL_USER, // Change if needed
        subject: isSolved ? `✅ Hey, please rest!` : `⚡ Solve the LeetCode POTD fast!`,
        text: isSolved
            ? `Hey, great job!\n\nYou've already solved today's LeetCode Problem of the Day (${potd.title}).\nNo need to do it again. Enjoy your rest! 😎`
            : `Hey there!\n\nToday's LeetCode Problem of the Day:\n\n📌 Title: ${potd.title}\n⚡ Difficulty: ${potd.difficulty}\n🔗 Link: ${potd.link}\n\nSolve it before it's too late!\n\n🚀 Happy coding!`
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

// Schedule jobs at 10 AM and 10 PM
schedule.scheduleJob('0 10 * * *', sendReminder); // 10 AM
schedule.scheduleJob('0 22 * * *', sendReminder); // 10 PM

// Run once on script start
sendReminder();
