const cron = require("node-cron");
const User = require("../db/models/user");
const monitorJobsForTask = require("../scrape/scrape");

// Function to start the scraper scheduler
const startScraperScheduler = () => {
    // Run the scheduler every minute
    cron.schedule("* * * * *", async () => {
        console.log("Running scheduled scraper...");

        try {
            const users = await User.find(); // Fetch all users from the database

            for (const user of users) {
                for (const task of user.tasks) {
                    const now = new Date();

                    // Calculate time since lastRun
                    const timeSinceLastRun = task.lastRun
                        ? (now - new Date(task.lastRun)) / 1000 / 60 // Convert milliseconds to minutes
                        : Infinity; // If no lastRun, assume task is ready to run

                    console.log(
                        `User: ${user.email}, Task URL: ${task.url}, Interval: ${task.interval} mins, Time Since Last Run: ${timeSinceLastRun.toFixed(
                            2
                        )} mins`
                    );

                    // Check if the task is ready to run
                    if (timeSinceLastRun >= task.interval) {
                        console.log(`Executing task for user: ${user.email}, task: ${task.url}`);

                        // Run the scraper for this task
                        await monitorJobsForTask(user, task);

                        // Update the lastRun timestamp
                        task.lastRun = now;
                    }
                }

                // Save updated tasks for the user
                await user.save(); // Ensure lastRun is persisted
                console.log(`Tasks updated and saved for user: ${user.email}`);
            }
        } catch (error) {
            console.error("Error during scheduled scraping:", error);
        }
    });

    console.log("Scraper scheduler started (running every minute).");
};

module.exports = startScraperScheduler;
