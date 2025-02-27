/* Modules required for processing */
const puppeteer     = require("puppeteer");
const path          = require("path");
const fs            = require("fs");
const puppeteerHar  = require("puppeteer-har");
const yaml          = require('js-yaml');
const { spawn }     = require("child_process");

class Utils {
    static currentTime() {
        return new Date().toDateString();
    }

    static currentUnix() {
        return Date.now();
    }

    static awaiting(ms) {
        return new Promise(resolve => setTimeout(resolve, ms * 1000));
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

    // Constructor
    constructor(out, bin, net, max) {
        this.out = out;
        this.pid = null;
        this.bin = bin;
        this.net = net;
        this.max = max;
    }

    start() {

        // Generate the command and spawn the process
        const cmd = [this.bin, "-i", this.net, "-s", this.max, "-w", this.out];
        this.pid  = spawn(cmd[0], cmd.slice(1));
    
        const currentTime = Utils.currentTime();

        this.pid.on("error", error => {
            console.error(`[${currentTime}] Error starting tshark process: ${error.message}`);
            console.error(`[${currentTime}] Error stack: ${error.stack}`);
            console.error(`[${currentTime}] Error code: ${error.code}`);
        });
    
        this.pid.on("exit", code => {
            const exitTime = Utils.currentTime();
    
            if (code === 0) {
                console.log(`[${exitTime}] Tshark process exited successfully.`);
            } else {
                console.error(`[${exitTime}] Tshark process exited with error code: ${code}`);
            }
        });
    }


    stop(signal = "SIGTERM") {

        // Check if the process is still active
        if (this.pid && !this.pid.killed) {
            const currentTime = Utils.currentTime();
            console.log(`[${currentTime}] Stopping tshark process with PID: ${this.pid.pid}`);
            this.pid.kill(signal);

            this.pid.on("exit", (code, signal) => {
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

    // Constructor
    constructor(config) {
        this.agent    = config.agent
        this.browser  = null;
        this.page     = null;
    }

    // Open a new instance of a browser
    async launch() {
        this.browser = await puppeteer.launch({
            executablePath:  this.agent,
            headless       : false,
            userDataDir    : "./user_data",
            defaultViewport: null,
        });

        const pages = await this.browser.pages();
        this.page   = pages.length > 0 ? pages[0] : null;

        if (!this.page) {
            await this.browser.close();
            throw new Error("No page available in the browser");
        }

        // Print the browser version to check if it's Chrome or Chromium
        const browserVersion = await this.browser.version();
        console.log(`Using Browser: ${browserVersion}`);
    }

    // Close existing instance of a browser
    async close() {
        if (this.browser) {
            await this.browser.close();
        }
    }

    // Get the channel with a link
    async visitChannelLink(channel, config) {
        await this.page.goto(channel.link);
    }

    // Navigate with a buttton
    async visitChannelButton(channel, config) {

        await this.page.evaluate(() => {
            window.scrollBy(0, window.innerHeight);
        });
        await Utils.awaiting(config.timings.load);

        const selector = channel.link;
        await this.page.waitForSelector(selector);
        await this.page.evaluate((selector) => {
            document.querySelector(selector)?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, selector);
    
        await Utils.awaiting(config.timings.load);
        await this.page.click(selector);
    }

    // Navigate with a link
    async navigateLink(link) {
        await this.page.goto(link);
    }

    // Trace rebuffing
    // async monitorVideoPlayback(file) {
    //     const videoContainer = await this.page.waitForSelector('div.player-ui[data-test-id="PLAYER_UI"]', {
    //         timeout: 20000
    //     });

    //     if (!videoContainer) {
    //         console.log("Debug: Video player container not found!");
    //         return;
    //     }

    //     // Get the video element
    //     const video = await this.page.waitForSelector('video', {
    //         timeout: 5000 
    //     });

    //     if (!video) {
    //         console.log("Debug: Video element not found!");
    //         return;
    //     }

    //     /* Monitor the status each second */
    //     const intervalId = setInterval(async () => {
    //         // Check the readyState of the video
    //         const state = await this.page.evaluate((video) => video.readyState, video);

    //         // Get the current timestamp
    //         const stamp = Utils.currentUnix();

    //         // Determine the playback status
    //         let status = 'dead'; 

    //         if (state === 4) {
    //             status = 'live';
    //         }

    //         // Write the status to a file
    //         fs.appendFileSync(file, `${stamp} ${status}\n`);

    //     }, 1000);

    //     // Return the interval ID to be cleared later
    //     return intervalId;
    // }

    async startL7Tracing(outputPath) {
        const har = new puppeteerHar(this.page);
        await har.start({ path: outputPath });
        return har;
    }

    async stopL7Tracing(outputPath) {
        const har = new puppeteerHar(this.page);
        await har.start({ path: outputPath });
        return har;
    }
}

class Experiment {
    constructor() {
        this.outputDir  = Utils.makeOutputDir();
    }

    async run() {

        // Define variable for runtime
        let config;
        let sniffer;
        let browser;

        // Define
        let logNetFile;
        let logBotFile;
        let logHarFile;
        let logRebFile;

        try {
            config = yaml.load(fs.readFileSync('config.yaml', 'utf8'));
        } catch (error) {
            console.error(`Error loading config.yaml experiment:`, error.message);
        }

        for (let n = 0; n < config.repetitions; n++) {

            // Start of the experiment
            console.log(`[${Utils.currentTime()}] Running experiment ${n + 1}`);

            try {

                // Define the output files
                logBotFile = path.join(this.outputDir, `log_bot_complete-${n + 1}.csv`);  
                logNetFile = path.join(this.outputDir, `log_net_complete-${n + 1}.pcap`);
                logHarFile = path.join(this.outputDir, `log_har_complete-${n + 1}.har`);
                
                // // File for logging player status
                // if (config.enableRebufferingTracing) {
                //     logRebFile = path.join(this.outputDir, `log_reb_complete-${n + 1}.txt`);
                // }
                
                /*************************************** Define the oigin ********************************************************/
                fs.appendFileSync(logBotFile, `event abs rel\n`);
                const originTime = Utils.currentUnix();
                fs.appendFileSync(logBotFile, `origin ${originTime} ${0}\n`);
                
                /*************************************** Start the sniffer *******************************************************/
                sniffer = new Sniffer(logNetFile, config.sniffer.bin, config.sniffer.net, config.sniffer.max);
                sniffer.start();
                const snifferTs = Utils.currentUnix();
                fs.appendFileSync(logBotFile, `sniffer-on ${snifferTs} ${snifferTs - originTime}\n`);

                /*************************************** Start the browser *******************************************************/
                browser = new BrowserManager(config);
                await browser.launch();
                const browserTs = Utils.currentUnix();
                fs.appendFileSync(logBotFile, `browser-on ${browserTs} ${browserTs - originTime}\n`);
                await Utils.awaiting(config.timings.load);
                
                /*************************************** Start L7 tracing ********************************************************/
                const harLogger = await browser.startL7Tracing(logHarFile);
                await browser.page.goto(config.homepage);
                await Utils.awaiting(config.timings.load);

                /*************************************** Loop over channels ******************************************************/
                for (const channel of config.channels) {

                    if(channel.type == "url") {
                        await browser.visitChannelLink(channel, config)
                    }
                    
                    if (channel.type === "button") {
                        await browser.visitChannelButton(channel, config)
                    }
                                      
                    // // Start (if availble) the playback tracing)
                    // let id;
                    // if (config.enableRebufferingTracing) {
                    //     id = await browserManager.monitorVideoPlayback(logRebFile); 
                    // }
                    
                    /*************************************** Watch the channel ****************************************************/
                    const channelTs = Utils.currentUnix();
                    fs.appendFileSync(logBotFile, `${channel.name}-on ${channelTs} ${channelTs - originTime}\n`);

                    await Utils.awaiting(config.timings.play);

                    const channelTe = Utils.currentUnix();
                    fs.appendFileSync(logBotFile, `${channel.name}-off ${channelTe} ${channelTe - originTime}\n`);
                    
                    // // Stop (if availble) the playback tracing)
                    // if (config.enableRebufferingTracing) {
                    //     clearInterval(id);
                    // }
                
                    await browser.navigateLink(config.homepage);
                    await Utils.awaiting(config.timings.load);
                }
                
                /*************************************** Stop L7 tracing ********************************************************/
                await harLogger.stop();

                /*************************************** Stop the browser ********************************************************/
                await browser.close();
                const browserTe = Utils.currentUnix();
                fs.appendFileSync(logBotFile, `browser-off ${browserTe} ${browserTe - originTime}\n`);

                /*************************************** Stop the sniffer ********************************************************/
                await Utils.awaiting(config.timings.load * 3);
                sniffer.stop();
                const snifferTe = Utils.currentUnix();
                fs.appendFileSync(logBotFile, `sniffer-off ${snifferTe} ${snifferTe - originTime}\n`);

            } catch (error) {
                console.error(`Error during experiment ${n + 1}:`, error.message);

                if (browser) await browser.close();
                Utils.cleanFiles(logNetFile, logBotFile, logHarFile, logRebFile);
                if (sniffer) sniffer.stop();
            }
        }
    }
}



/* Main function */
(async () => {
    Utils.checkCookies();
    const experiment = new Experiment();
    await experiment.run();
})();
