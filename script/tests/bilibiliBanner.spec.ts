import { test } from "@playwright/test";
import fs from "fs";
import path from "path";
import https from "https";

// 下载工具函数
async function downloadImage(url: string, filename: string) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filename);
    const fullUrl = url.startsWith("//") ? "https:" + url : url;
    https
      .get(fullUrl, (response) => {
        response.pipe(file);
        file.on("finish", () => {
          file.close();
          resolve(true);
        });
      })
      .on("error", (err) => {
        fs.unlink(filename, () => reject(err));
      });
  });
}

test("bilibili anime banner download", async ({ page }) => {
  try {
    console.log("User :>> ", {
      TEST_USER: process.env.TEST_USER,
      TEST_PSD: process.env.TEST_PSD,
    });
    // 1. 打开 B站首页
    await page.goto("https://www.bilibili.com/");
    console.log("✅ 打开 B站首页");

    // 2. 点击导航栏【番剧】
    await page.waitForSelector('a:has-text("番剧")');

    // 监听新标签页
    const [newPage] = await Promise.all([
      page.waitForEvent("popup"), // 等待新窗口打开
      page.click('a:has-text("番剧")'), // 点击"番剧"
    ]);
    console.log("✅ 已点击番剧，等待页面加载...");

    // 3. 打开番剧索引
    await newPage.waitForSelector('a:has-text("番剧索引")');
    const [newPage2] = await Promise.all([
      newPage.waitForEvent("popup"), // 监听新标签页
      newPage.click('a:has-text("番剧索引")'), // 点击"番剧索引"
    ]);
    console.log("✅ 打开了索引");

    // 4. 等待横幅图片加载并获取
    await page.waitForSelector(".animated-banner img", {
      state: "attached",
      timeout: 60000,
    });

    // 抓取第一个图片的 src
    const firstImg = await page.$eval(
      ".animated-banner .layer img",
      (img: any) => img.getAttribute("src")
    );
    console.log("🎬 获取到图片链接:", firstImg);

    // 下载到本地
    if (firstImg) {
      // 在测试框架中，我们需要指定一个相对于当前测试文件的路径
      const savePath = path.resolve(__dirname, "../../first-banner.png");
      await downloadImage(firstImg, savePath);
      console.log("✅ 已下载图片到:", savePath);
    }
  } catch (err) {
    console.error("❌ 脚本执行出错:", err);
    // 在测试框架中，我们应该抛出错误让测试失败
    throw err;
  }
});
