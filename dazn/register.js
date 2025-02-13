const puppeteer = require("puppeteer");
const path      = require("path");
const fs        = require("fs");
const yaml      = require("js-yaml");

const userDataDir = path.join(__dirname, "user_data");

const doesUserDataDirExist = (dir) => fs.existsSync(dir);
const wait                 = (seconds) => new Promise((resolve) => setTimeout(resolve, seconds * 1000));

const registerUser = async () => {
    console.log("\nLaunching Puppeteer...");

    const browser = await puppeteer.launch({
        headless: false,
        userDataDir
    });

    let config;

    try {
        console.log("Loading config.yaml...");
        config = yaml.load(fs.readFileSync("config.yaml", "utf8"));
    } catch (error) {
        console.error("Error loading config.yaml:", error.message);
        await browser.close();
        return;
    }

    const [page] = await browser.pages();
    console.log("Navigating to login page...");
    await page.goto(config.login.url);

    // Accept cookies
    console.log("Checking for cookie banner...");
    const banner = await page.waitForSelector("#onetrust-accept-btn-handler");
    await wait(2);
    await banner.click();
    console.log("Cookies accepted.");
    await wait(2);

    // Insert email
    console.log("Entering email...");
    await page.waitForSelector("#email");
    await page.type("#email", config.login.username);
    await wait(2);

    // Insert password
    console.log("Entering password...");
    await page.waitForSelector("#password");
    await page.type("#password", config.login.password);
    await wait(2);

    // Submit form
    console.log("Submitting login form...");
    await page.waitForSelector("button[type=submit]");
    await page.click("button[type=submit]");
    await wait(5);

    console.log("Successfully logged in.");
    await browser.close();
};

const main = async () => {
    console.log("\nChecking user session...");

    if (doesUserDataDirExist(userDataDir)) {
        console.log("Already logged in.");
        console.log("Remove 'user_data' to generate a new profile.");
    } else {
        await registerUser();
    }
};

main();
