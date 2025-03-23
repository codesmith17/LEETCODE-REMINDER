require('dotenv').config();
const nodemailer = require('nodemailer');
const axios = require('axios');

const USERS = ['codesmith17', 'krishna170902', 'rashmantri'];

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

async function fetchRecentAcceptedSubmissions(username) {
    try {
        console.log(`📌 Fetching last 50 solved problems for user: ${username}...`);
        const response = await axios.post('https://leetcode.com/graphql/', {
            query: `
                query recentAcSubmissions($username: String!, $limit: Int!) {
                    recentAcSubmissionList(username: $username, limit: $limit) {
                        titleSlug
                        timestamp
                    }
                }`,
            variables: { username, limit: 50 }
        });

        if (!response.data || !response.data.data || !response.data.data.recentAcSubmissionList) {
            console.warn(`⚠️ Invalid API response for ${username}:`, JSON.stringify(response.data, null, 2));
            return [];
        }

        console.log(`✅ Solved Problems API Response for ${username}:`, JSON.stringify(response.data.data.recentAcSubmissionList, null, 2));

        return response.data.data.recentAcSubmissionList;
    } catch (error) {
        console.error(`❌ Error fetching solved problems for ${username}:`, error.message);
        return [];
    }
}

async function checkInactiveUsers() {
    console.log('🔍 Checking for inactive users...');
    const now = new Date();
    const today530AM_IST = Math.floor(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0)).getTime() / 1000);

    let emailBody = `Hey there!\n\n📢 कुछ लोग LeetCode पे सवाल नहीं बना रहे! \n\n`;

    const results = await Promise.all(USERS.map(user => fetchRecentAcceptedSubmissions(user)));

    let inactiveUsers = [];
    USERS.forEach((user, index) => {
        const solvedProblems = results[index];
        if (solvedProblems.length === 0) {
            // If no problems have been solved at all
            inactiveUsers.push({ user, days: "काफी समय" });
            emailBody += `😡 भाई ${user}, पढ़ाई शुरू कर! बहुत दिनों से कुछ solve नहीं किया! 🔥\n`;
        } else {
            const lastSolvedTimestamp = Math.max(...solvedProblems.map(q => q.timestamp));
            const inactiveDays = Math.floor((today530AM_IST - lastSolvedTimestamp) / (24 * 60 * 60));

            if (inactiveDays > 0) {
                inactiveUsers.push({ user, days: inactiveDays });
                emailBody += `😡 भाई ${user}, पढ़ाई शुरू कर! ${inactiveDays} दिन से कुछ solve नहीं किया! 🔥\n`;
            }
        }
    });

    if (inactiveUsers.length > 0) {
        emailBody += `\n🚀 आज से coding शुरू कर वरना नाराज हो जाएंगे! 😤`;

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: process.env.SEND_EMAIL_USER.replace(/\s+/g, ''),
            subject: `भाई पढ़ाई शुरू कर! 😡`,
            text: emailBody
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('❌ Error sending inactivity email:', error.message);
            } else {
                console.log('✅ Inactivity email sent successfully:', info.response);
            }
            process.exit(0);  // Exit the script after email is sent
        });
    } else {
        console.log('✅ सभी user active हैं! कोई issue नहीं।');
        process.exit(0);  // Exit if all users are active
    }
}


// Run the check once
checkInactiveUsers();
