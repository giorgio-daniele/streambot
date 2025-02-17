const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");
const yaml = require("js-yaml");

const userDataDir = path.join(__dirname, "user_data");

const doesUserDataDirExist = (dir) => fs.existsSync(dir);
const wait = (seconds) => new Promise((resolve) => setTimeout(resolve, seconds * 1000));

const registerUser = async () => {
    console.log("\nLaunching Puppeteer...");
    const browser = await puppeteer.launch({
        executablePath: "/usr/bin/google-chrome",
        headless: false,
        userDataDir
    });

    const [page] = await browser.pages();

    let config;

    try {
        console.log("Loading config.yaml...");
        config = yaml.load(fs.readFileSync("config.yaml", "utf8"));
    } catch (error) {
        console.error("Error loading config.yaml:", error.message);
        await browser.close();
        return;
    }

    console.log("Navigating to login page...");
    await page.goto(config.login.url);
    await wait(5);

    console.log("Entering email...");
    await page.waitForSelector("#ap_email");
    await page.type("#ap_email", config.login.username);
    
    console.log("Clicking 'Continue' button...");
    await page.waitForSelector("#continue");
    await page.click("#continue");
    await wait(5);

    console.log("Entering password...");
    await page.waitForSelector("#ap_password");
    await page.type("#ap_password", config.login.password);
    
    console.log("Clicking 'Sign In' button...");
    await page.waitForSelector("#signInSubmit");
    await page.click("#signInSubmit");
    await wait(5);

    console.log("Waiting for login confirmation...");
    await wait(10);

    console.log("Closing browser...");
    await browser.close();
    console.log("Login process completed.");
};

const main = async () => {
    console.log("\nChecking user session...");

    if (doesUserDataDirExist(userDataDir)) {
        console.log("Already logged in.");
        console.log("Remove 'user_data' to generate a new profile.");
    } else {
        await registerUser();
        console.log("You are now logged in!");
    }
};

main();
