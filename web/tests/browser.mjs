import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { makeFixture, installWallet } from "./fixture.mjs";
const root = fileURLToPath(new URL("../../", import.meta.url));
const output = path.join(root, "docs/frontend");
await mkdir(path.join(output, "screenshots"), { recursive: true });
const mime = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".png": "image/png",
  ".woff2": "font/woff2",
};
const prefix = "/gateway/squeeklings/";
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://test.invalid");
    if (!url.pathname.startsWith(prefix)) throw Error("Unknown path");
    const relative =
      decodeURIComponent(url.pathname.slice(prefix.length)) || "index.html";
    if (relative.includes("..")) throw Error("Unsafe path");
    const file = path.join(root, "dist", relative);
    const data = await readFile(file);
    res.writeHead(200, {
      "content-type": mime[path.extname(file)] ?? "application/octet-stream",
    });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const url = `http://127.0.0.1:${server.address().port}${prefix}`;
const browser = await chromium.launch({
  headless: true,
  ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH
    ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH }
    : {}),
  args: ["--no-sandbox"],
});
const checks = [],
  contexts = [];
let lastPage;
async function check(name, fn) {
  if (
    process.env.BROWSER_ONLY &&
    !name.toLowerCase().includes(process.env.BROWSER_ONLY.toLowerCase())
  )
    return;
  const started = Date.now();
  try {
    await fn();
    checks.push({ name, passed: true, durationMs: Date.now() - started });
    console.log("PASS", name);
  } catch (error) {
    checks.push({
      name,
      passed: false,
      message: error.message,
      durationMs: Date.now() - started,
    });
    console.error("FAIL", name, error.message);
    throw error;
  }
}
async function waitFor(fn, label, timeout = 15000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (await fn()) return;
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
  throw Error(`Timed out: ${label}`);
}
async function setup({
  wallet = true,
  width = 390,
  mobile = false,
  eipOnly = false,
} = {}) {
  const fixture = await makeFixture(root),
    context = await browser.newContext({
      viewport: { width, height: 844 },
      reducedMotion: "reduce",
      ...(mobile
        ? {
            userAgent:
              "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1",
            isMobile: true,
            hasTouch: true,
          }
        : {}),
    });
  contexts.push(context);
  const page = await context.newPage();
  lastPage = page;
  const errors = [],
    missing = [];
  page.on("requestfailed", (request) =>
    console.log("Failed request:", request.url(), request.failure()?.errorText),
  );
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (response) => {
    if (response.url().startsWith(url) && response.status() >= 400)
      missing.push(response.url());
  });
  await page.route("**/*", async (route) => {
    if (route.request().url().startsWith(url)) return route.continue();
    if (
      fixture.failFirstRpc &&
      route.request().url().startsWith(fixture.manifest.network.rpcUrls[0])
    ) {
      fixture.failedFirstRpc = (fixture.failedFirstRpc ?? 0) + 1;
      return route.fulfill({
        status: 503,
        body: "Fixture provider unavailable",
      });
    }
    if (route.request().url().includes("api.squeekchain.com")) {
      if (fixture.wheel === "OFFLINE") return route.abort();
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          generatedAt: new Date().toISOString(),
          measurement: {
            observedAt: new Date().toISOString(),
            freshness: fixture.wheel === "STALE" ? "stale" : "online",
            staleAfterSeconds: 120,
            coreStatus: fixture.wheel === "ACTIVE" ? "ACTIVE" : "IDLE",
            rpmMilli: fixture.wheel === "ACTIVE" ? 12000 : 0,
          },
        }),
      });
    }
    const data = route.request().postDataJSON();
    if (data) {
      const result = Array.isArray(data)
        ? await Promise.all(data.map((q) => fixture.rpc(q)))
        : await fixture.rpc(data);
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(result),
      });
    }
    return route.abort();
  });
  if (wallet) await installWallet(page, fixture, !eipOnly);
  return { fixture, context, page, errors, missing };
}
async function loaded(page, hash = "") {
  await page.goto(url + hash);
  await page
    .getByRole("heading", { name: "Meet your Squeekling.", exact: true })
    .waitFor({ timeout: 15000 })
    .catch(() => {});
  await waitFor(
    async () => !(await page.getByText("Opening the burrow…").count()),
    "bootstrap",
  );
}
async function connect(page) {
  await page
    .getByRole("button", { name: "Connect wallet", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Test Burrow Wallet", exact: true })
    .click();
  await waitFor(
    async () => !(await page.locator("dialog[open]").count()),
    "connect closes dialog",
  );
}
async function noOverflow(page) {
  assert.ok(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
    `Overflow at ${(await page.viewportSize()).width}`,
  );
}
try {
  const main = await setup();
  const { page, fixture } = main;
  await check(
    "Static gateway subpath loads manifest, both ABI arrays, local fonts and artwork",
    async () => {
      await loaded(page);
      await page.getByText("1 / 88,888", { exact: true }).waitFor();
      assert.deepEqual(main.errors, []);
      assert.deepEqual(main.missing, []);
      assert.ok(
        await page.evaluate(() =>
          document.fonts.check('16px "Nunito Variable"'),
        ),
      );
    },
  );
  await check(
    "390 first screen contains product, wallet and hatch action",
    async () => {
      await page.getByRole("button", { name: "Hatch a Squeekling" }).waitFor();
      for (const locator of [
        page.getByRole("heading", { name: "Meet your Squeekling." }),
        page.getByRole("button", { name: "Hatch a Squeekling" }),
        page.getByRole("button", { name: "Connect wallet", exact: true }),
      ]) {
        const b = await locator.boundingBox();
        assert.ok(b && b.y >= 0 && b.y + b.height <= 844, JSON.stringify(b));
      }
      await noOverflow(page);
      await page.screenshot({
        path: path.join(output, "screenshots/hatchery-390.png"),
        fullPage: true,
      });
    },
  );
  await check(
    "EIP-6963 named wallet, native dialog keyboard close and focus return",
    async () => {
      const button = page.getByRole("button", {
        name: "Connect wallet",
        exact: true,
      });
      await button.focus();
      await page.keyboard.press("Enter");
      await page.getByRole("dialog").waitFor();
      assert.equal(
        await page
          .getByRole("button", { name: "Browser wallet", exact: true })
          .count(),
        0,
      );
      await page.keyboard.press("Escape");
      assert.equal(await page.locator("dialog[open]").count(), 0);
      assert.equal(
        await button.evaluate((e) => e === document.activeElement),
        true,
      );
    },
  );
  await check(
    "Unknown chain is added with exact handoff parameters, then switched",
    async () => {
      fixture.chainId = 1;
      fixture.knownChain = false;
      await connect(page);
      await waitFor(
        () => fixture.chainId === fixture.manifest.chainId,
        "switch chain",
      );
      const requests = fixture.calls.filter((c) => c.wallet);
      assert.ok(
        requests.some((c) => c.wallet === "wallet_switchEthereumChain"),
      );
      assert.deepEqual(
        requests.find((c) => c.wallet === "wallet_addEthereumChain")?.params,
        [fixture.manifest.walletAddChain],
      );
    },
  );
  await check(
    "Hatch simulates, sends no value, locks duplicate submissions and follows receipt token ID",
    async () => {
      const before = fixture.sent.length;
      await page
        .getByRole("button", { name: "Hatch a Squeekling" })
        .evaluate((button) => {
          button.click();
          button.click();
        });
      await page.waitForURL("**/#/pet/2", { timeout: 20000 });
      await page
        .getByRole("heading", { name: "Squeekling #2", exact: true })
        .waitFor();
      assert.equal(fixture.sent.length, before + 1);
      assert.equal(fixture.sent.at(-1).functionName, "hatch");
      assert.ok(
        !fixture.sent.at(-1).value || BigInt(fixture.sent.at(-1).value) === 0n,
      );
      assert.ok(fixture.calls.some((c) => c.method === "eth_call"));
    },
  );
  await check(
    "Live pet state, actual route times and owner inventory controls",
    async () => {
      await page.getByText("6 rounds · 1 hr", { exact: true }).waitFor();
      await page.screenshot({
        path: path.join(output, "screenshots/pet-390.png"),
        fullPage: true,
      });
      assert.ok(
        await page
          .getByRole("meter", { name: "Pity toward rare guarantee" })
          .count(),
      );
      await page
        .getByRole("button", { name: "Equip Moon Pebble", exact: true })
        .click();
      await page
        .getByText("Equip Moon Pebble confirmed.", { exact: true })
        .waitFor();
      assert.equal(fixture.sent.at(-1).functionName, "equip");
      await page
        .getByRole("button", { name: "Unequip hand", exact: true })
        .click();
      await page
        .getByText("Unequip hand confirmed.", { exact: true })
        .waitFor();
      assert.equal(fixture.pets.get(2n).display.equipped[2], 0);
    },
  );
  await check(
    "Expedition embark, Away, Waiting for settlement and Ready states",
    async () => {
      await page.getByRole("radio", { name: /Meadow Trail/ }).check();
      await page
        .getByRole("button", { name: "Take the Meadow Trail", exact: true })
        .click();
      await page
        .getByText("Take the Meadow Trail confirmed.", { exact: true })
        .waitFor();
      assert.equal(fixture.pets.get(2n).trip.route, 1);
      await page.getByText("Away", { exact: true }).waitFor();
      assert.equal(
        await page
          .getByRole("button", { name: "Return home & collect capsule" })
          .isDisabled(),
        true,
      );
      fixture.genesis -= 100000n;
      await page.reload();
      await page.getByText("Waiting for settlement", { exact: true }).waitFor();
      fixture.settled = fixture.pets.get(2n).trip.endRound;
      await page.reload();
      await page.getByText("Ready", { exact: true }).waitFor();
    },
  );
  await check(
    "Return receipt reveals real fixture item and rarity; no predicted capsule is shown",
    async () => {
      await page
        .getByRole("button", { name: "Return home & collect capsule" })
        .click();
      await page
        .getByRole("dialog", { name: "A little something, for you." })
        .waitFor();
      assert.equal(
        await page
          .getByRole("dialog")
          .getByRole("heading", { name: "Wishing Star", exact: true })
          .count(),
        0,
      );
      await page
        .getByRole("button", { name: "Open Seed Capsule", exact: true })
        .click();
      await page
        .getByRole("dialog")
        .getByRole("heading", { name: "Wishing Star", exact: true })
        .waitFor();
      await page.getByText("Legendary · Dream", { exact: true }).waitFor();
      await page.screenshot({
        path: path.join(output, "screenshots/capsule-390.png"),
      });
      await page
        .getByRole("button", { name: "Back to the burrow", exact: true })
        .click();
      assert.equal(fixture.pets.get(2n).display.pity, 0);
    },
  );
  await check(
    "Wallet rejection and simulation failure preserve state and allow retry",
    async () => {
      fixture.rejectWallet = true;
      await page
        .getByRole("button", { name: "Take the Burrow Loop", exact: true })
        .click();
      await page.getByText(/Request declined in your wallet/).waitFor();
      assert.equal(fixture.pets.get(2n).trip.away, false);
      fixture.rejectWallet = false;
      fixture.failSimulation = true;
      const before = fixture.sent.length;
      await page
        .getByRole("button", { name: "Take the Burrow Loop", exact: true })
        .click();
      await page
        .getByText(/Signal lost. Your pet and inventory are safe/)
        .waitFor();
      assert.equal(fixture.sent.length, before);
      fixture.failSimulation = false;
    },
  );
  await check(
    "Wrong network visibly blocks all primary write controls",
    async () => {
      fixture.chainId = 1;
      await page.evaluate(() => window.testWallet.emit("chainChanged", "0x1"));
      await page
        .getByRole("button", { name: "Switch to Sepolia", exact: true })
        .waitFor();
      assert.equal(
        await page
          .getByRole("button", { name: "Take the Burrow Loop", exact: true })
          .isDisabled(),
        true,
      );
      await page
        .getByRole("button", { name: "Switch to Sepolia", exact: true })
        .click();
      await waitFor(
        () => fixture.chainId === fixture.manifest.chainId,
        "switch back",
      );
    },
  );
  await check(
    "Recipient validation and safe NFT transfer preserve explicit ownership",
    async () => {
      await page.getByText("Ownership & transfer", { exact: true }).click();
      await page
        .getByRole("button", { name: "Transfer pet", exact: true })
        .click();
      await page
        .getByText("Enter a valid, nonzero Ethereum address.", { exact: true })
        .waitFor();
      await page
        .getByLabel("Receiving wallet or single-pet approval address")
        .fill(fixture.recipient);
      await page
        .getByRole("button", { name: "Transfer pet", exact: true })
        .click();
      await page
        .getByText("Transfer pet confirmed.", { exact: true })
        .waitFor();
      assert.equal(
        fixture.pets.get(2n).owner.toLowerCase(),
        fixture.recipient.toLowerCase(),
      );
      assert.equal(
        await page
          .getByRole("button", { name: "Take the Burrow Loop", exact: true })
          .isDisabled(),
        true,
      );
    },
  );
  await check(
    "Meadow works disconnected, uses logs and Multicall3, and honors reduced motion",
    async () => {
      const details = await setup({ wallet: false, width: 1440 });
      details.fixture.wheel = "ACTIVE";
      await details.page.goto(url + "#/meadow");
      await details.page
        .getByText("1 of up to 150 pets", { exact: true })
        .waitFor();
      await details.page
        .getByText("Wheel turning · 12.0 rpm", { exact: true })
        .waitFor();
      assert.equal(
        await details.page.getByRole("img", { name: /Pixel Meadow/ }).count(),
        1,
      );
      assert.ok(details.fixture.calls.some((c) => c.method === "eth_getLogs"));
      await details.page.screenshot({
        path: path.join(output, "screenshots/meadow-1440.png"),
        fullPage: true,
      });
      assert.ok(
        await details.page
          .getByRole("button", { name: "Reduced motion on", exact: true })
          .isDisabled(),
      );
      await noOverflow(details.page);
    },
  );
  await check(
    "Phone wallet picker contains four open-in links and Coinbase Smart Wallet",
    async () => {
      const phone = await setup({ wallet: false, mobile: true });
      await loaded(phone.page);
      await phone.page
        .getByRole("button", { name: "Connect wallet", exact: true })
        .click();
      for (const name of ["MetaMask", "Coinbase Wallet", "Rabby", "Phantom"])
        await phone.page
          .getByRole("link", { name: `Open in ${name}`, exact: true })
          .waitFor();
      await phone.page
        .getByRole("button", { name: "Coinbase Smart Wallet", exact: true })
        .waitFor();
      await noOverflow(phone.page);
      await phone.page.screenshot({
        path: path.join(output, "screenshots/wallet-390.png"),
      });
      const known = await setup({ mobile: true, eipOnly: true });
      await loaded(known.page);
      assert.equal(await known.page.evaluate(() => !!window.ethereum), false);
      await connect(known.page);
      assert.equal(known.fixture.connected, true);
    },
  );
  await check(
    "320, 390, 760 and 1440 reflow with full addresses, menus and rules",
    async () => {
      for (const width of [320, 390, 760, 1440]) {
        await page.setViewportSize({ width, height: 844 });
        await page.goto(url + "#/how");
        await page
          .getByRole("heading", {
            name: "What is live, and where",
            exact: true,
          })
          .waitFor();
        await noOverflow(page);
        assert.ok(
          (await page.locator(".address").allTextContents()).some(
            (v) =>
              v.includes(fixture.game.address.slice(0, 8)) ||
              v.toLowerCase().includes(fixture.game.address.toLowerCase()),
          ),
        );
        await page.locator(".account-menu summary").click();
        await noOverflow(page);
        await page.locator(".account-menu summary").click();
      }
      await page.setViewportSize({ width: 390, height: 844 });
    },
  );
  await check(
    "Keyboard focus is visible and 200% text enlargement reflows",
    async () => {
      await page.goto(url);
      await page
        .getByRole("heading", { name: "Meet your Squeekling." })
        .waitFor();
      await page.keyboard.press("Tab");
      const focused = await page.evaluate(() => {
        const s = getComputedStyle(document.activeElement);
        return { outline: s.outlineStyle, width: parseFloat(s.outlineWidth) };
      });
      assert.notEqual(focused.outline, "none");
      assert.ok(focused.width >= 2);
      await page.screenshot({
        path: path.join(output, "screenshots/focus-390.png"),
      });
      await page.evaluate(
        () => (document.documentElement.style.fontSize = "200%"),
      );
      await noOverflow(page);
      await page.evaluate(() => (document.documentElement.style.fontSize = ""));
    },
  );
  await check(
    "Axe accessibility scan on Hatchery, pet page, Meadow and rules",
    async () => {
      for (const hash of ["#/", "#/pet/1", "#/meadow", "#/how"]) {
        await page.goto(url + hash);
        await page.locator("main h1").waitFor();
        await page.waitForTimeout(300);
        const results = await new AxeBuilder({ page }).analyze();
        assert.deepEqual(
          results.violations.map((v) => ({
            id: v.id,
            impact: v.impact,
            nodes: v.nodes.map((n) => n.target),
          })),
          [],
          hash,
        );
      }
    },
  );
  await check(
    "Offline RPC fails safely without raw request data and keeps the main action visible",
    async () => {
      const offline = await setup({ wallet: false });
      offline.fixture.failRpc = true;
      await loaded(offline.page);
      await offline.page
        .getByText("Game reads are unavailable. Your pet is safe.")
        .waitFor({ timeout: 30000 });
      assert.equal(
        await offline.page
          .getByText(/Request body:|Version: viem|eth_getBlockByNumber/)
          .count(),
        0,
      );
      const b = await offline.page
        .getByRole("button", { name: "Hatch a Squeekling" })
        .boundingBox();
      assert.ok(b.y + b.height < 844);
      await noOverflow(offline.page);
    },
  );

  await check(
    "Fresh eligibility and supply cap disable hatch, including a wallet that transferred away its pet",
    async () => {
      const x = await setup();
      x.fixture.hasHatched = true;
      x.fixture.pets.clear();
      await loaded(x.page);
      await connect(x.page);
      await x.page
        .getByRole("link", { name: "Visit My Burrow", exact: true })
        .waitFor();
      assert.equal(
        await x.page
          .getByRole("button", { name: "Hatch a Squeekling" })
          .count(),
        0,
      );
      x.fixture.hasHatched = false;
      x.fixture.supply = 88888n;
      await x.page.reload();
      await x.page.getByText("88,888 / 88,888", { exact: true }).waitFor();
      assert.equal(
        await x.page
          .getByRole("button", { name: "Hatch a Squeekling" })
          .isDisabled(),
        true,
      );
    },
  );
  await check(
    "Missing deployed code disables writes before the wallet is asked to sign",
    async () => {
      const x = await setup();
      x.fixture.missingCode = true;
      await loaded(x.page);
      await connect(x.page);
      await x.page.getByText(/Contract code is missing/).waitFor();
      assert.equal(
        await x.page
          .getByRole("button", { name: "Hatch a Squeekling" })
          .isDisabled(),
        true,
      );
      assert.equal(x.fixture.sent.length, 0);
    },
  );
  await check(
    "Core signal loss keeps unknown settlement unknown and an older epoch is still returnable",
    async () => {
      const x = await setup();
      const pet = x.fixture.pets.get(1n);
      pet.trip = {
        away: true,
        startRound: 100n,
        endRound: 136n,
        route: 2,
        epoch: 1n,
      };
      pet.display.away = true;
      x.fixture.signalLost = true;
      await x.page.goto(url + "#/pet/1");
      await x.page.getByText("Signal lost", { exact: true }).waitFor();
      assert.equal(
        await x.page
          .getByRole("button", { name: "Return home & collect capsule" })
          .isDisabled(),
        true,
      );
      x.fixture.epoch = 2n;
      await x.page.reload();
      await x.page
        .getByText("Ready · Lost in the Fog", { exact: true })
        .waitFor();
      await connect(x.page);
      assert.equal(
        await x.page
          .getByRole("button", { name: "Return home & collect capsule" })
          .isDisabled(),
        false,
      );
    },
  );
  await check(
    "RPC fallback recovers when the first configured public endpoint fails",
    async () => {
      const x = await setup({ wallet: false });
      x.fixture.failFirstRpc = true;
      await loaded(x.page);
      await x.page.getByText("1 / 88,888", { exact: true }).waitFor();
      assert.ok(x.fixture.failedFirstRpc > 0);
    },
  );
  await check(
    "Confirmed single-pet approvals can be granted and explicitly revoked",
    async () => {
      const x = await setup();
      await loaded(x.page);
      await connect(x.page);
      await x.page.goto(url + "#/pet/1");
      await x.page
        .getByRole("heading", { name: "Squeekling #1", exact: true })
        .waitFor();
      await x.page.getByText("Ownership & transfer", { exact: true }).click();
      await x.page
        .getByLabel("Receiving wallet or single-pet approval address")
        .fill(x.fixture.recipient);
      await x.page
        .getByRole("button", {
          name: "Approve this pet’s transfer",
          exact: true,
        })
        .click();
      await x.page
        .getByText("Approve pet transfer confirmed.", { exact: true })
        .waitFor();
      assert.equal(
        x.fixture.pets.get(1n).approved.toLowerCase(),
        x.fixture.recipient.toLowerCase(),
      );
      await x.page
        .getByRole("button", {
          name: "Revoke single-pet approval",
          exact: true,
        })
        .click();
      await x.page
        .getByText("Revoke single-pet approval confirmed.", { exact: true })
        .waitFor();
      assert.equal(BigInt(x.fixture.pets.get(1n).approved), 0n);
    },
  );
  await check(
    "Operator permission requires acknowledgment and can be granted and revoked",
    async () => {
      const x = await setup();
      await loaded(x.page);
      await connect(x.page);
      await x.page.goto(url + "#/pet/1");
      await x.page
        .getByRole("heading", { name: "Squeekling #1", exact: true })
        .waitFor();
      await x.page.getByText("Ownership & transfer", { exact: true }).click();
      await x.page
        .getByText("Manage access to all pets", { exact: true })
        .click();
      await x.page
        .getByLabel("Operator address", { exact: true })
        .fill(x.fixture.recipient);
      await x.page
        .getByRole("button", { name: "Save operator access", exact: true })
        .click();
      await x.page
        .getByText(
          "Enter your confirmation that this operator can move all your pets.",
          { exact: true },
        )
        .waitFor();
      await x.page
        .getByLabel("Allow this operator to transfer all my pets")
        .check();
      await x.page
        .getByLabel(
          "I understand this changes access to every pet in this wallet.",
        )
        .check();
      await x.page
        .getByRole("button", { name: "Save operator access", exact: true })
        .click();
      await x.page
        .getByText("Grant operator access confirmed.", { exact: true })
        .waitFor();
      assert.equal(
        x.fixture.operatorApprovals.has(x.fixture.recipient.toLowerCase()),
        true,
      );
      await x.page
        .getByLabel("Allow this operator to transfer all my pets")
        .uncheck();
      await x.page
        .getByRole("button", { name: "Save operator access", exact: true })
        .click();
      await x.page
        .getByText("Revoke operator access confirmed.", { exact: true })
        .waitFor();
      assert.equal(x.fixture.operatorApprovals.size, 0);
    },
  );
  await check(
    "Connected administrator can validate and replace the read-only core",
    async () => {
      const x = await setup();
      x.fixture.account = x.fixture.admin;
      await loaded(x.page);
      await connect(x.page);
      await x.page.goto(url + "#/how");
      await x.page
        .getByRole("heading", {
          name: "Administrator · core connection",
          exact: true,
        })
        .waitFor();
      await x.page
        .getByLabel("New SqueekCore V3 address")
        .fill(x.fixture.recipient);
      await x.page
        .getByLabel("I understand all active trips will become Fog trips.")
        .check();
      await x.page
        .getByRole("button", { name: "Replace SqueekCore", exact: true })
        .click();
      await x.page
        .getByText("Replace SqueekCore confirmed.", { exact: true })
        .waitFor();
      assert.equal(
        x.fixture.core.toLowerCase(),
        x.fixture.recipient.toLowerCase(),
      );
      assert.equal(x.fixture.epoch, 2n);
    },
  );
  await check(
    "Very large contract ages and inventory counts wrap at 320 and 390 without clipping",
    async () => {
      const x = await setup();
      const p = x.fixture.pets.get(1n);
      p.display.ageBlocks = 2n ** 255n;
      p.inventory[0] = 2n ** 255n;
      await x.page.goto(url + "#/pet/1");
      await x.page
        .getByRole("heading", { name: "Squeekling #1", exact: true })
        .waitFor();
      for (const width of [320, 390]) {
        await x.page.setViewportSize({ width, height: 844 });
        await noOverflow(x.page);
      }
      assert.ok(
        (await x.page.locator("body").innerText()).includes(String(2n ** 255n)),
      );
    },
  );
  await check(
    "My Burrow opens a single owned pet with SVG, pity and routes",
    async () => {
      await page.goto(url + "#/burrow");
      await page
        .getByRole("heading", { name: "Squeekling #1", exact: true })
        .waitFor();
      await page
        .getByRole("img", {
          name: "On-chain artwork for Squeekling #1",
          exact: true,
        })
        .waitFor();
      assert.equal(
        await page
          .getByRole("meter", { name: "Pity toward rare guarantee" })
          .count(),
        1,
      );
      assert.equal(await page.getByRole("radio").count(), 3);
    },
  );
  await check(
    "No unhandled JavaScript exceptions or missing local production resources",
    async () => {
      assert.deepEqual(main.errors, []);
      assert.deepEqual(main.missing, []);
    },
  );
} catch (error) {
  if (lastPage)
    await lastPage
      .screenshot({
        path: path.join(root, "test/scratch/browser-failure.png"),
        fullPage: true,
      })
      .catch(() => {});
  process.exitCode = 1;
} finally {
  await writeFile(
    path.join(output, "browser-results.json"),
    JSON.stringify(
      {
        engine: "Chromium headless shell",
        target: "production dist at a gateway subpath",
        mode: "mock wallet and RPC; no broadcasts",
        checks,
      },
      null,
      2,
    ) + "\n",
  );
  for (const context of contexts) await context.close();
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
