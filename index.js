require('dotenv').config();
const nodemailer = require('nodemailer');
const axios = require('axios');
const schedule = require('node-schedule');

const USERS = ['codesmith17', 'krishna170902', 'rashmantri'];

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

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

      // Correct IST Calculation
      const now = new Date();
      const today530AM_IST = Math.floor(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0)).getTime() / 1000);

      const recentSubmissions = response.data.data.recentAcSubmissionList;
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
        console.log('⚠️ Skipping email, could not fetch POTD.');
        process.exit(1);
        return;
    }

    let emailBody = `Hey there!\n\n📌 Today's LeetCode Problem of the Day:\n\nTitle: ${potd.title}\nDifficulty: ${potd.difficulty}\nLink: ${potd.link}\n\n`;

    const results = await Promise.all(USERS.map(user => fetchRecentAcceptedSubmissions(user)));
    let numberOfDone = 0;
    USERS.forEach((user, index) => {
      const solvedProblemsToday = results[index];
      const isSolved = solvedProblemsToday.includes(potd.titleSlug);
      console.log(`🔎 ${user} solved POTD?`, isSolved ? '✅ Yes' : '❌ No');
      if(isSolved === true) {
        numberOfDone++;
      }
      emailBody += `👤 ${user}: ${isSolved ? '✅ Already Solved! 🎉' : '❌ Not Solved Yet! ⏳'}\n`;
  });
  

    emailBody += `\n🚀 Keep coding and have a great day!`;
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.SEND_EMAIL_USER.replace(/\s+/g, ''), // Remove spaces and keep as string
      subject: `LeetCode POTD Status for ${new Date().toLocaleDateString()}`,
      text: emailBody
  };
  
    if(numberOfDone < USERS.length) {
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('❌ Error sending email:', error.message);
            process.exit(1);
        } else {
            console.log('✅ Email sent successfully:', info.response);
            process.exit(0);
        }
      });
    } else {
      console.log(`✅ All ${USERS.length} have already solved today's POTD. Cancelling email sending procedure`);
      process.exit(0);
    }
}

// Schedule jobs at 10 AM IST (4:30 AM UTC) and 10 PM IST (4:30 PM UTC)
schedule.scheduleJob('30 4 * * *', sendReminder);  // 10 AM IST
schedule.scheduleJob('30 16 * * *', sendReminder); // 10 PM IST

async function checkInactiveUsers() {
    console.log('🔍 Checking for inactive users...');
    const now = new Date();
    const yesterday530AM_IST = Math.floor(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 3, 0, 0, 0)).getTime() / 1000);

    let emailBody = `Hey there!\n\n📢 कुछ लोग LeetCode पे सवाल नहीं बना रहे! \n\n`;

    const results = await Promise.all(USERS.map(user => fetchRecentAcceptedSubmissions(user)));

    let inactiveUsers = [];
    USERS.forEach((user, index) => {
        const solvedProblems = results[index];
        const lastSolvedTimestamp = solvedProblems.length > 0 ? Math.max(...solvedProblems.map(q => q.timestamp)) : 0;

        if (lastSolvedTimestamp < yesterday530AM_IST) {
            inactiveUsers.push(user);
            emailBody += `😡 भाई ${user}, पढ़ाई शुरू कर! 3 दिन से कुछ solve नहीं किया! 🔥\n`;
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
        });
    } else {
        console.log('✅ सभी user active हैं! कोई issue नहीं।');
    }
}

// Schedule job at 12 AM IST (6:30 PM UTC)
schedule.scheduleJob('30 18 * * *', checkInactiveUsers);


// Run once on script start
sendReminder();
