const puppeteer = require("puppeteer");
const path      = require("path");
const fs        = require("fs");
const yaml      = require("js-yaml");

const userDataDir = path.join(__dirname, "user_data");

const doesUserDataDirExist = (dir) => fs.existsSync(dir);
const wait                 = (seconds) => new Promise((resolve) => setTimeout(resolve, seconds * 1000));

const registerUser = async () => {

    const timeout = 5;

    /* Load the configuration */
    let config;

    try {
        config = yaml.load(fs.readFileSync("config.yaml", "utf8"));
    } catch (error) {
        console.error("Error:", error.message);
        return;
    }

    /* Launch the browser with the configuration */

    const browser = await puppeteer.launch({
        executablePath: config.agent,
        headless:       false,
        userDataDir
    });


    /* Get the login page */

    await page.goto(config.login.url);
    await wait(timeout);

    /* Perform the login in the login page */

    const banner = await page.waitForSelector("#onetrust-accept-btn-handler");
    await wait(timeout);

    await banner.click();
    await wait(timeout);

    await page.waitForSelector("#email");
    await page.type("#email", config.login.username);
    await wait(timeout);

    await page.waitForSelector("#password");
    await page.type("#password", config.login.password);
    await wait(timeout);

    await page.waitForSelector("button[type=submit]");
    await page.click("button[type=submit]");
    await wait(timeout);

    /* Close the procedure */

    await browser.close();
    console.log("Login process completed.");
};

const main = async () => {

    /* Run the check if the user data already exists */

    if (doesUserDataDirExist(userDataDir)) {
        console.log("Already logged in.");
        console.log("Remove 'user_data' to generate a new profile.");
    } else {
        await registerUser();
        console.log("You are now logged in!");
    }
};

main();
