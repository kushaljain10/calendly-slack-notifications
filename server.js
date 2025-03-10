require("dotenv").config();
const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json()); // Parse JSON body

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
const PORT = process.env.PORT || 3000;

// Get allowed emails from env and parse them
const ALLOWED_EMAILS = (process.env.ALLOWED_EMAILS || "")
  .split(",")
  .map((email) => email.trim());

app.post("/webhook", async (req, res) => {
  try {
    const eventData = req.body;

    // Check if it's an invitee.created event
    if (eventData.event !== "invitee.created") {
      return res.status(200).send("Not an invitee.created event.");
    }

    // Check if the event membership's user email is in the allowed list
    const hostEmail =
      eventData.payload.scheduled_event.event_memberships[0].user_email;
    if (!ALLOWED_EMAILS.includes(hostEmail)) {
      return res.status(200).send("Host email not in allowed list.");
    }

    // Extract necessary details
    const { name, email, questions_and_answers, scheduled_event } =
      eventData.payload;
    const eventStartTime = scheduled_event.start_time;

    // Format Slack message
    let message = `📅 *New Calendly Invitee Created*\n`;
    message += `👤 *Name:* ${name || "N/A"}\n`;
    message += `📧 *Email:* ${email || "N/A"}\n`;
    message += `🕒 *Event Start Time:* ${eventStartTime}\n\n`;

    if (questions_and_answers.length > 0) {
      message += `💬 *Questions & Answers:*\n`;
      questions_and_answers.forEach((qa, index) => {
        message += `➖ *Q${index + 1}:* ${qa.question}\n`;
        message += `   *A:* ${qa.answer}\n`;
      });
    } else {
      message += "❌ No questions answered.";
    }

    // Send message to Slack
    await axios.post(SLACK_WEBHOOK_URL, { text: message });

    res.status(200).send("Slack notification sent.");
  } catch (error) {
    console.error("Error sending Slack message:", error);
    res.status(500).send("Internal Server Error.");
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Webhook server running on port ${PORT}`);
});
