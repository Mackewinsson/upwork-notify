const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const sendToSlack = require("./sendToSlack");

// Function to delay for a specified time
function delay(time) {
    return new Promise((resolve) => setTimeout(resolve, time));
}

// Function to scrape jobs with retry mechanism
const checkForNewJobs = async (url, maxRetries = 3) => {
    let browser;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            browser = await puppeteer.launch({
                headless: false, // Set to true for production
                args: ["--no-sandbox", "--disable-setuid-sandbox"], // Stability improvements
            });

            const page = await browser.newPage();
            await delay(2000);
            await page.setUserAgent(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.96 Safari/537.36"
            );
            await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
            await delay(2000);
            await page.goto(url, {
                waitUntil: ["networkidle2", "domcontentloaded"],
                timeout: 60000, // 60 seconds timeout
            });

            const content = await page.content();
            await delay(2000);

            const $ = cheerio.load(content);
            const jobs = [];

            $('article[data-ev-label="search_results_impression"]').each((i, el) => {
                const title = $(el)
                    .find('h2[class="h5 mb-0 mr-2 job-tile-title"] a')
                    .text()
                    .trim();
                const link = $(el)
                    .find('h2[class="h5 mb-0 mr-2 job-tile-title"] a')
                    .attr("href");
                const postedTime = $(el)
                    .find('small[data-test="job-pubilshed-date"] span:nth-child(2)')
                    .text()
                    .trim();
                const description = $(el)
                    .find('p[class="mb-0 text-body-sm"]')
                    .text()
                    .trim();
                const uid = $(el).attr("data-ev-job-uid");

                jobs.push({
                    uid,
                    title,
                    link: `https://www.upwork.com${link}`,
                    postedTime,
                    description,
                });
            });

            await browser.close();
            return jobs; // Return jobs if successful
        } catch (error) {
            console.error(`Attempt ${attempt} failed:`, error.message);

            if (attempt === maxRetries) {
                console.error("Max retries reached. Exiting.");
                throw error;
            }

            // Wait before retrying
            await delay(3000); // 3-second delay between retries
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    }
};

// Monitor jobs for a specific user and task
const monitorJobsForTask = async (user, task) => {
    console.log(`Scraping for user: ${user.email}, task: ${task.url}`);

    try {
        const scrapedJobs = await checkForNewJobs(task.url, 3); // Pass maxRetries to handle errors
        const notifiedUids = task.notifiedJobUids || [];

        // Find new jobs not yet notified
        const newJobs = scrapedJobs.filter((job) => !notifiedUids.includes(job.uid));

        for (const job of newJobs) {
            // Notify Slack
            await sendToSlack(job);

            // Add job UID to the notified list
            task.notifiedJobUids.push(job.uid);
        }

        console.log(`Sent ${newJobs.length} new jobs to Slack for user: ${user.email}`);
    } catch (error) {
        console.error(`Error monitoring jobs for task ${task.url}:`, error.message);
    }
};

module.exports = monitorJobsForTask;
