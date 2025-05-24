const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
})

const sendInvitationEmail = async (to, fromUser, gameId) => {
  const link = `http://localhost:5000/join/${gameId}`
  const mailOptions = {
    from: `"Mr. White Game" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Game Invitation',
    html: `<p>${fromUser} invited you to a game!</p><p>Game ID: ${gameId}</p><a href="${link}">Join Game</a>`
  }
  await transporter.sendMail(mailOptions)
}

module.exports = { sendInvitationEmail }
