const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const sendToSlack = require("./sendToSlack");
// Function to check for new jobs
const checkForNewJobs = async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.96 Safari/537.36");
    await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });

    await page.goto("https://www.upwork.com/nx/search/jobs/", {
        waitUntil: "networkidle2",
    });

    const content = await page.content();
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
};

// Array to store previously seen job UIDs
let previousJobs = [];
let isFirstRun = true; // Flag to track if it’s the first run

// Function to monitor jobs
const monitorJobs = async () => {
    const newJobs = await checkForNewJobs();
    const previousJobUids = previousJobs.map((job) => job.uid);

    const foundNewJobs = newJobs.filter(
        (job) => !previousJobUids.includes(job.uid)
    );

    if (!isFirstRun && foundNewJobs.length > 0) {
        foundNewJobs.forEach(async (job) => {
            await sendToSlack(job);
        });
        return { newJobs: foundNewJobs.length };
    } else if (!isFirstRun) {
        console.log("No new jobs found");
    }

    // Log all jobs if it’s the first run for reference
    if (isFirstRun) {
        console.log("Initial run - jobs found:", newJobs.length);

    }

    // Update previous jobs array and reset isFirstRun flag
    previousJobs = newJobs;
    isFirstRun = false;
};

// Export the function to check for new jobs
module.exports = monitorJobs;