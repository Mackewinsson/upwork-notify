require("dotenv").config();

const { default: axios } = require("axios");


async function sendToSlack(item, webhookUrl) {
  try {
    await axios.post(webhookUrl, {
      text: `New item: ${item.title}\nLink: ${item.link}`,
    });
  } catch (error) {
    console.error("Error sending to Slack:", error);
  }
}

module.exports = sendToSlack;
