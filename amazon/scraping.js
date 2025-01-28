const puppeteer     = require("puppeteer");
const path          = require("path");
const fs            = require("fs");
const puppeteerHar  = require("puppeteer-har");
const config        = require("./config.json");
const { spawn }     = require("child_process");

class Utils {
    static currentTime() {
        return new Date().toDateString();
    }

    static currentUnix() {
        return Date.now();
    }

    static awaiting(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    static makeOutputDir() {
        const now      = new Date();
        const dateStr  = now.toISOString().split("T")[0];
        const timeStr  = now.toTimeString().split(" ")[0].replace(/:/g, "-");
        const dirPath  = path.join(__dirname, `${dateStr}_${timeStr}`);

        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath);
        }

        return dirPath;
    }

    static cleanFiles(...files) {
        files.forEach(file => {
            if (fs.existsSync(file)) {
                fs.unlinkSync(file);
            }
        });
    }

    static checkCookies() {
        const userDataDir = path.join(__dirname, "user_data");

        if (!fs.existsSync(userDataDir)) {
            const currentTime = Utils.currentTime();
            console.log(`[${currentTime}] The 'user_data' directory does not exist.`);
            console.log(`[${currentTime}] Please run 'node register.js' to set up the user data.`);
            process.exit(1);
        }
    }
}

class Sniffer {
    constructor(outputPath) {
        this.outputPath     = outputPath;
        this.snifferProcess = null;
    }

    start() {
        const { bin, net, max } = config.sniffer;
        const cmd = [bin, "-i", net, "-s", max, "-w", this.outputPath];
        this.snifferProcess = spawn(cmd[0], cmd.slice(1));
    
        const currentTime = Utils.currentTime();
    
        this.snifferProcess.on("error", error => {
            console.error(`[${currentTime}] Error starting tshark process: ${error.message}`);
            console.error(`[${currentTime}] Error stack: ${error.stack}`);
            console.error(`[${currentTime}] Error code: ${error.code}`);
        });
    
        this.snifferProcess.on("exit", code => {
            const exitTime = Utils.currentTime();
    
            if (code === 0) {
                console.log(`[${exitTime}] Tshark process exited successfully.`);
            } else {
                console.error(`[${exitTime}] Tshark process exited with error code: ${code}`);
            }
        });
    }

    stop(signal = "SIGTERM") {
        if (this.snifferProcess && !this.snifferProcess.killed) {
            const currentTime = Utils.currentTime();
            console.log(`[${currentTime}] Stopping tshark process with PID: ${this.snifferProcess.pid}`);
            this.snifferProcess.kill(signal);

            this.snifferProcess.on("exit", (code, signal) => {
                const exitTime = Utils.currentTime();

                if (signal) {
                    console.log(`[${exitTime}] Tshark process was stopped by signal: ${signal}`);
                } else if (code !== 0) {
                    console.error(`[${exitTime}] Tshark process terminated with error code: ${code}`);
                } else {
                    console.log(`[${exitTime}] Tshark process stopped successfully.`);
                }
            });
        }
    }
}

class BrowserManager {
    constructor() {
        this.browser = null;
        this.page    = null;
    }

    async launch() {
        this.browser = await puppeteer.launch({
            headless      : false,
            userDataDir   : "./user_data",
            defaultViewport: null,
        });

        const pages = await this.browser.pages();
        this.page   = pages.length > 0 ? pages[0] : null;

        if (!this.page) {
            await this.browser.close();
            throw new Error("No page available in the browser");
        }
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
        }
    }

    async startHarLogging(outputPath) {
        const har = new puppeteerHar(this.page);
        await har.start({ path: outputPath });
        return har;
    }
}

class Experiment {
    constructor() {
        this.outputDir  = Utils.makeOutputDir();
        this.fastAwait  = (config.quantum * 1000);
        this.watchAwait = (config.quantum * 1000) * 60;
    }

    async run() {
        const repetitions = config.repetitions;
        const channels    = config.channels;

        for (let number = 0; number < repetitions; number++) {
            const currentTime = Utils.currentTime();
            console.log(`[${currentTime}] Running experiment ${number + 1}`);

            let logNetFile, logBotFile, logHarFile, sniffer, browserManager;

            try {
                logNetFile = path.join(this.outputDir, `log_net_complete-${number + 1}.pcap`);
                logBotFile = path.join(this.outputDir, `log_bot_complete-${number + 1}.csv`);
                logHarFile = path.join(this.outputDir, `log_har_complete-${number + 1}.har`);

                fs.appendFileSync(logBotFile, `event abs rel\n`);
                const originTime = Utils.currentUnix();
                fs.appendFileSync(logBotFile, `origin ${originTime} ${0}\n`);

                sniffer = new Sniffer(logNetFile);
                sniffer.start();
                const snifferStartTime = Utils.currentUnix();
                fs.appendFileSync(logBotFile, `sniffer-on ${snifferStartTime} ${snifferStartTime - originTime}\n`);

                browserManager = new BrowserManager();
                await browserManager.launch();
                const browserStartTime = Utils.currentUnix();
                fs.appendFileSync(logBotFile, `browser-on ${browserStartTime} ${browserStartTime - originTime}\n`);

                await Utils.awaiting(this.fastAwait);

                const harLogger = await browserManager.startHarLogging(logHarFile);
                await browserManager.page.goto(config.homepage);
                await Utils.awaiting(this.fastAwait);

                for (const channel of channels) {
                    
                    /* Select which kind of action start the playback */
                    if (channel["type"] == "url") {
                        await browserManager.page.goto(channel.link);
                    } else if (channel["type"] == "button") {
                        const buttonSelector = channel["selector"];
                    
                        await browserManager.page.evaluate(() => {
                            window.scrollBy(0, 300);
                        });
                    
                        await browserManager.page.waitForSelector(buttonSelector, { visible: true });
                    
                        const button = await browserManager.page.$(buttonSelector);
                    
                        if (button) {
                            await button.scrollIntoViewIfNeeded();
                            await button.click();
                        } else {
                            console.error("Button not found using the selector.");
                        }
                    }
                    
                    /* Playback */
                    const channelStartTime = Utils.currentUnix();
                    fs.appendFileSync(logBotFile, `${channel.name}-on ${channelStartTime} ${channelStartTime - originTime}\n`);
                    await Utils.awaiting(this.watchAwait);
                    const channelStopTime = Utils.currentUnix();
                    fs.appendFileSync(logBotFile, `${channel.name}-off ${channelStopTime} ${channelStopTime - originTime}\n`);
                    /* End of the playback */
                
                    await browserManager.page.goto(config.homepage);
                    await Utils.awaiting(this.fastAwait);
                }

                await harLogger.stop();
                await browserManager.close();
                const browserStopTime = Utils.currentUnix();
                fs.appendFileSync(logBotFile, `browser-off ${browserStopTime} ${browserStopTime - originTime}\n`);

                await Utils.awaiting(this.fastAwait * 3);
                sniffer.stop();
                const snifferStopTime = Utils.currentUnix();
                fs.appendFileSync(logBotFile, `sniffer-off ${snifferStopTime} ${snifferStopTime - originTime}\n`);

            } catch (error) {
                console.error(`Error during experiment ${number + 1}:`, error.message);

                if (browserManager) await browserManager.close();
                Utils.cleanFiles(logNetFile, logBotFile, logHarFile);
                if (sniffer) sniffer.stop();
            }
        }
    }
}

(async () => {
    Utils.checkCookies();
    const experiment = new Experiment();
    await experiment.run();
})();
