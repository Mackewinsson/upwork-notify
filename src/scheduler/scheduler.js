const cron = require("node-cron");
const User = require("../db/models/user");
const monitorJobsForTask = require("../scrape/scrape"); // Your existing scraper logic

// Function to run periodic scraping
const startScraperScheduler = () => {
    cron.schedule("* * * * *", async () => {
        console.log("Running scheduled scraper...");

        try {
            const users = await User.find();

            for (const user of users) {
                for (const task of user.tasks) {
                    const now = new Date();

                    // Check if the task is ready to run
                    const timeSinceLastRun = task.lastRun
                        ? (now - new Date(task.lastRun)) / 1000 / 60 // in minutes
                        : Infinity;
                    if (timeSinceLastRun >= task.interval) {
                        console.log(`Running task for user: ${user.email}, task: ${task.url}`);
                        await monitorJobsForTask(user, task);

                        // Update lastRun timestamp
                        task.lastRun = now;
                    }
                }

                // Save user changes
                await user.save();
            }
        } catch (error) {
            console.error("Error running scraper:", error);
        }
    });

    console.log("Scraper scheduler started.");
};

module.exports = startScraperScheduler;
