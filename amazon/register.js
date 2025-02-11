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

    /* Get the loing page */
    await page.goto(url);
    await wait(5);

    /* Insert the email */
    await page.waitForSelector("#ap_email");
    await page.type("#ap_email", username);
    await page.waitForSelector("#continue");
    await page.click("#continue");
    await wait(5);

    /* Insert the password */
    await page.waitForSelector("#ap_password");
    await page.type("#ap_password", password);
    await page.waitForSelector("#signInSubmit");
    await page.click("#signInSubmit");
    await wait(5);

    /* You should logged in */
    await wait(50);

    /* Close the browser */
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
