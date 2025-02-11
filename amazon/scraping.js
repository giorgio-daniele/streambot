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

    // Constructor
    constructor(outputPath) {
        this.outputPath     = outputPath;
        this.snifferProcess = null;
    }

    // Function to start
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

    // Function to stop
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

    // Constructor
    constructor() {
        this.browser = null;
        this.page    = null;
    }

    // Open a new instance of a browser
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

    // Close existing instance of a browser
    async close() {
        if (this.browser) {
            await this.browser.close();
        }
    }

    // Trace rebuffing
    async monitorVideoPlayback(file) {
        const videoContainer = await this.page.waitForSelector('div.player-ui[data-test-id="PLAYER_UI"]', {
            timeout: 20000
        });

        if (!videoContainer) {
            console.log("Debug: Video player container not found!");
            return;
        }

        // Get the video element
        const video = await this.page.waitForSelector('video', {
            timeout: 5000 
        });

        if (!video) {
            console.log("Debug: Video element not found!");
            return;
        }

        /* Monitor the status each second */
        const intervalId = setInterval(async () => {
            // Check the readyState of the video
            const state = await this.page.evaluate((video) => video.readyState, video);

            // Get the current timestamp
            const stamp = Utils.currentUnix();

            // Determine the playback status
            let status = 'dead'; 

            if (state === 4) {
                status = 'live';
            }

            // Write the status to a file
            fs.appendFileSync(file, `${stamp} ${status}\n`);

        }, 1000);

        // Return the interval ID to be cleared later
        return intervalId;
    }

    // Trace HTTP requests/responses
    async startHarLogging(outputPath) {
        const har = new puppeteerHar(this.page);
        await har.start({ path: outputPath });
        return har;
    }
}

const SECOND = 1000;
const MINUTE = SECOND * 60;

class Experiment {
    constructor() {
        this.outputDir  = Utils.makeOutputDir();
        this.fastAwait  = 5   * SECOND;       // 5 seconds
        this.watchAwait = 12  * MINUTE;       // 12 minutes
    }

    async run() {
        const repetitions = config.repetitions;
        const channels    = config.channels;

        for (let number = 0; number < repetitions; number++) {
            const currentTime = Utils.currentTime();
            console.log(`[${currentTime}] Running experiment ${number + 1}`);

            let logNetFile;
            let logBotFile;
            let logHarFile;
            let logRebFile;
            let sniffer;
            let browserManager;

            try {

                // File for logging events
                logBotFile = path.join(this.outputDir, `log_bot_complete-${number + 1}.csv`);   
                
                // File for logging packets
                logNetFile = path.join(this.outputDir, `log_net_complete-${number + 1}.pcap`);

                // File for logging HTTP requests and responses
                logHarFile = path.join(this.outputDir, `log_har_complete-${number + 1}.har`);
                
                // File for logging player status
                if (config.enableRebufferingTracing) {
                    logRebFile = path.join(this.outputDir, `log_reb_complete-${number + 1}.txt`);
                }

                fs.appendFileSync(logBotFile, `event abs rel\n`);

                // Define the origin of the experiment
                const originTime = Utils.currentUnix();
                fs.appendFileSync(logBotFile, `origin ${originTime} ${0}\n`);
                
                // Start the sniffer
                sniffer = new Sniffer(logNetFile);
                sniffer.start();
                const snifferStartTime = Utils.currentUnix();
                fs.appendFileSync(logBotFile, `sniffer-on ${snifferStartTime} ${snifferStartTime - originTime}\n`);

                // Start the browser
                browserManager = new BrowserManager();
                await browserManager.launch();
                const browserStartTime = Utils.currentUnix();
                fs.appendFileSync(logBotFile, `browser-on ${browserStartTime} ${browserStartTime - originTime}\n`);
                await Utils.awaiting(this.fastAwait);
                
                // Start the HTTP tracing
                const harLogger = await browserManager.startHarLogging(logHarFile);
                await browserManager.page.goto(config.homepage);
                await Utils.awaiting(this.fastAwait);

                for (const channel of channels) {
                    // Reach the homepage
                    await browserManager.page.goto(channel.link);
                    
                    // Start (if availble) the playback tracing)
                    let id;
                    if (config.enableRebufferingTracing) {
                        id = await browserManager.monitorVideoPlayback(logRebFile); 
                    }
                
                    // Playback
                    const channelStartTime = Utils.currentUnix();
                    fs.appendFileSync(logBotFile, `${channel.name}-on ${channelStartTime} ${channelStartTime - originTime}\n`);
                    await Utils.awaiting(this.watchAwait);
                    const channelStopTime = Utils.currentUnix();
                    fs.appendFileSync(logBotFile, `${channel.name}-off ${channelStopTime} ${channelStopTime - originTime}\n`);
                    
                    // Stop (if availble) the playback tracing)
                    if (config.enableRebufferingTracing) {
                        clearInterval(id);
                    }
                
                    // Exit the current channel and get the next
                    await browserManager.page.goto(config.homepage);
                    await Utils.awaiting(this.fastAwait);
                }
                
                // Stop the HTTP tracing
                await harLogger.stop();
                // Stop the browser
                await browserManager.close();
                const browserStopTime = Utils.currentUnix();
                fs.appendFileSync(logBotFile, `browser-off ${browserStopTime} ${browserStopTime - originTime}\n`);

                await Utils.awaiting(this.fastAwait * 3);
                // Stop the sniffer
                sniffer.stop();
                const snifferStopTime = Utils.currentUnix();
                fs.appendFileSync(logBotFile, `sniffer-off ${snifferStopTime} ${snifferStopTime - originTime}\n`);

            } catch (error) {
                console.error(`Error during experiment ${number + 1}:`, error.message);

                if (browserManager) await browserManager.close();
                Utils.cleanFiles(logNetFile, logBotFile, logHarFile, logRebFile);
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