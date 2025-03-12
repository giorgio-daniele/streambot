const puppeteer = require("puppeteer");
const path      = require("path");
const fs   = require("fs");
const yaml = require("js-yaml");
const { time } = require("console");

const userDataDir = path.join(__dirname, "user_data");

const doesUserDataDirExist = (dir) => { 
    return fs.existsSync(dir); 
};

const wait = (seconds) => { 
    return new Promise((resolve) => setTimeout(resolve, seconds * 1000)); 
};

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

    const [page] = await browser.pages();

    /* Get the login page */

    await page.goto(config.login.url);
    await wait(timeout);

    /* Perform the login in the login page */

    await page.waitForSelector("#ap_email");
    await page.type("#ap_email", config.login.username);

    await page.waitForSelector("#continue");
    await page.click("#continue");
    await wait(timeout);

    await page.waitForSelector("#ap_password");
    await page.type("#ap_password", config.login.password);
    
    await page.waitForSelector("#signInSubmit");
    await page.click("#signInSubmit");
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
