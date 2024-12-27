const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const sendToSlack = require("./sendToSlack");

// Function to delay for a specified time
function delay(time) {
    return new Promise((resolve) => setTimeout(resolve, time));
}

// Function to scrape jobs from a given URL
const checkForNewJobs = async (url) => {
    const browser = await puppeteer.launch({
        headless: false, // Keep false for debugging; set true for production
    });

    try {
        const page = await browser.newPage();
        await delay(2000);
        await page.setUserAgent(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.96 Safari/537.36"
        );
        await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
        await delay(2000);
        await page.goto(url, {
            waitUntil: ["networkidle2", "domcontentloaded"],
        });

        const content = await page.content();
        await delay(2000);
        await browser.close();

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

        return jobs;
    } catch (error) {
        console.error("Error scraping jobs:", error);
        return [];
    }
};

// Monitor jobs for a specific user and task
const monitorJobsForTask = async (user, task) => {
    console.log(`Scraping for user: ${user.email}, task: ${task.url}`);

    const scrapedJobs = await checkForNewJobs(task.url);
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
};

module.exports = monitorJobsForTask;
