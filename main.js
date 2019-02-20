const puppeteer = require("puppeteer");
const fs = require("mz/fs");
const selectors = require("./selectors");

class ConfirmAcc {
  constructor() {
    this.login = "YOUR L";
    this.password = "YOUR P";
    this.cookies = null;
    this.code = null;
    this.page = null;
    this.page2 = null;
    this.email = null;
    this.emailPass = null;
    this.igCreds = null;
  }

  async init() {
    try {
      await this.readFile();
      for await (const doc of this.igCreds) {
        this.login = doc.login;
        this.password = doc.password;
        this.cookies = doc.cookie;
        await this.runBrowser();
        await this.openPage();
        await this.igLogin();
      }
    } catch (err) {
      throw new Error(err);
    }
  }

  async runBrowser() {
    const randWindowSizeW = parseInt(Math.random() * 80 + 1200, 10);
    const randWindowSizeH = parseInt(Math.random() * 80 + 800, 10);
    const options = {
      ignoreHTTPSErrors: false,
      headless: false,
      args: [
        "--no-first-run",
        `--window-size=${randWindowSizeW},${randWindowSizeH}`,
        "--proxy-server = 137.74.49.246:8080"
      ]
    };

    //console.log(options.args);
    this.browser = await puppeteer.launch(options).catch(async err => {
      Promise.reject(new Error(err));
    });
  }

  async openPage() {
    try {
      const pages = await this.browser.pages();
      this.page = await pages[0];
      await this.page.goto("https://www.instagram.com/accounts/login/");
    } catch (err) {
      throw new Error(err);
    }
  }

  async igLogin() {
    await this.page.waitForSelector("input").catch(err => {
      console.log(err);
      throw new Error(err);
    });

    await this.page.focus("input").catch(err => {
      console.log(err);
      throw new Error(err);
    });

    await this.page.keyboard.type(this.login).catch(err => {
      console.log(err);
      throw new Error(err);
    });

    await this.page.keyboard.press("Tab").catch(err => {
      throw new Error(err);
    });

    await this.page.keyboard.type(this.password).catch(err => {
      console.log(err);
      throw new Error(err);
    });

    await this.page.keyboard.press("Enter").catch(err => {
      throw new Error(err);
    });

    await this.page.waitFor(2000);

    if ((await this.page.url()) === "https://www.instagram.com/") {
      console.log(`Account ${this.login} already confirmed!`);
      this.cookies = await this.page.cookies();
      await this.writeFile();
      //await this.browser.close();
    } else {
      this.page.waitForSelector("div");

      // if ((await this.page.$("#choice_1")) !== null) {
      //   selectors.emailLabelIg = '.UuB0U';
      //   await this.page.keyboard.press("Tab");
      //   await this.page.keyboard.press("Tab");
      //
      //
      //   //await this.page.keyboard.press("Enter");
      // }

      await this.page.waitFor(4000);

      if (await this.page.$(selectors.emailLabelIg)) {
        const adress = await this.page.$(selectors.emailLabelIg);
        const adressText = await this.page.evaluate(
          adress => adress.textContent,
          adress
        );

        if (adressText.includes("Эл. адрес:")) {
          await this.page.keyboard.press("Tab").catch(err => {
            throw new Error(err);
          });

          await this.page.keyboard.press("Tab").catch(err => {
            throw new Error(err);
          });

          await this.page.waitFor(2000);

          await this.page.keyboard.press("Enter").catch(err => {
            throw new Error(err);
          });

          let res = adressText.split("Эл. адрес:")[1];
          let ress = res.split("@")[0].trim();

          console.log(`Email: ${await ress}`);

          if (await ress.match(/^s.*?t$/)) {
            this.email = "MAIL";
            this.emailPass = "PASS";

        }
      } else if ((await this.page.$("#phone_number")) !== null) {
        console.log(`Account ${await this.login} need mobile verification!`);
        await this.browser.close();
      }
    }
  }

  async gmailLogin() {
    try {
      this.page2 = await this.browser.newPage();
      await this.page2.goto("https://gmail.com");
      await this.page2.waitForSelector("input");
      await this.page2.waitFor(3000);
      await this.page2.keyboard.type(await this.email);
      await this.page2.keyboard.press("Tab");
      await this.page2.keyboard.press("Tab");
      await this.page2.keyboard.press("Tab");
      await this.page2.keyboard.press("Enter");
      await this.page2.waitFor(3000);
      await this.page2.waitForSelector("input");
      await this.page2.keyboard.type(await this.emailPass);
      await this.page2.keyboard.press("Tab");
      await this.page2.keyboard.press("Tab");
      await this.page2.keyboard.press("Enter");

      await this.checkInbox();
    } catch (err) {
      throw new Error(err);
    }
    console.log(`Logged in GMail. Account - ${this.email}`);
  }

  async checkInbox() {
    await new Promise(resolve => {
      const enterInterval = setInterval(async () => {
        const inbox = await this.page2.$(".bsU");
        const text = await this.page2.evaluate(
          inbox_ => inbox_.textContent,
          inbox
        );

        console.log(`Count msg: ${await text}`);

        if (parseInt(await text) === 201) {
          clearInterval(enterInterval);
          console.log("MSG IN INBOX, PIDOR");
          await this.getCode();
          resolve();
        }
      }, 2000);
    });
  }

  async getCode() {
    await this.page2.waitFor(2000);
    await this.page2.waitForSelector(selectors.emailCode).catch(err => {
      console.log(err);
      throw new Error(err);
    });

    const code = await this.page2.$(selectors.emailCode);
    const textCode = await this.page2.evaluate(
      code => code.textContent,
      await code
    );
    this.code = await textCode.match(/\d{6}/);
    console.log(`Code - ${await this.code}`);

    await this.page2.waitFor(3000);

    await this.confirmCode();
  }

  async confirmCode() {
    try {
      await this.page.bringToFront();
      await this.page.focus("input");
      const code = await this.code;
      await this.page.keyboard.type(await code);
      await this.page.keyboard.press("Enter");
      await this.page.waitForNavigation();
      console.log(`Account ${this.login} confirmed!`);
      this.cookies = await this.page.cookies();
      console.log("Cookies get, start recording file...");
      await this.writeFile();
      console.log("Recorded!");
    } catch (err) {
      console.log(err);
      throw new Error(err);
    }
  }

  async writeFile() {
    fs.appendFileSync(
      "accs.txt",
      `{login: '${
        this.login
      }', isBlocked : false, cookies: ${await JSON.stringify(
        await this.cookies
      )}},\r\n`
    );
  }

  async readFile() {
    this.igCreds = await JSON.parse(
      await fs.readFile("./blocked.json", "utf-8")
    );

    console.log(this.igCreds);
  }
}
const ConfirmAc = new ConfirmAcc();
ConfirmAc.init().catch(err => console.log(err));
