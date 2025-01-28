const puppeteer     = require("puppeteer");
const path          = require("path");
const fs            = require("fs");

const config        = require("./config.json");

const { url, username, password } = config.login;
const userDataDir    = path.join(__dirname, "user_data");

const doesUserDataDirExist = (dir) => {
    return fs.existsSync(dir);
}

const wait = (s) => {
    return new Promise(resolve => setTimeout(resolve, s * 1000));
}

const registerUser = async () => {
    const browser = await puppeteer.launch({
        headless    : false,
        userDataDir : userDataDir
    });

    const [page] = await browser.pages();

    await page.goto(url);

    const banner = await page.waitForSelector("#onetrust-accept-btn-handler");
    await wait(5);
    await banner.click();

    await wait(5);

    /* Insert the email */
    await page.waitForSelector("#email");
    await page.type("#email", username);

    await wait(5);

    /* Insert the password */
    await page.waitForSelector("#password");
    await page.type("#password", password);

    await wait(5);

    await page.waitForSelector("button[type=submit]");
    await page.click("button[type=submit]");

    /* You should logged in */
    await wait(10);

    await browser.close();
}

const main = async () => {
    if (doesUserDataDirExist(userDataDir)) {
        console.log("Already logged in");
        console.log("Remove user_data to generate a new profile");
    } else {
        await registerUser();
        console.log("You logged in!");
    }
}

main();
