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
