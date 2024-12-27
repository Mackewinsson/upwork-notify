require("dotenv").config();

const { default: axios } = require("axios");

async function sendToSlack(item) {
  const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
  try {
    await axios.post(slackWebhookUrl, {
      text: `New item: ${item.title}\nLink: ${item.link}`,
    });
  } catch (error) {
    console.error("Error sending to Slack:", error);
  }
}

module.exports = sendToSlack;
