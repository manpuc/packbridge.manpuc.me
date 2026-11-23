// shortcut: relies on locally installed Chrome/Edge (override via CHROME_PATH); switch to Playwright if CI-side generation is needed
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT_DIR, "public");

interface OgCopy {
	htmlLang: string;
	subtitle: string;
	dirJ2B: string;
	dirB2J: string;
	dropLabel: string;
	googleFont?: string;
}

const OG_COPY: Record<string, OgCopy> = {
	ja: {
		htmlLang: "ja",
		subtitle: "Minecraft リソースパック変換",
		dirJ2B: "Java → Bedrock",
		dirB2J: "Bedrock → Java",
		dropLabel: "ファイルをドロップ",
		googleFont: "Noto+Sans+JP:wght@600;700",
	},
	en: {
		htmlLang: "en",
		subtitle: "Minecraft Resource Pack Converter",
		dirJ2B: "Java → Bedrock",
		dirB2J: "Bedrock → Java",
		dropLabel: "Drop your pack here",
	},
	ko: {
		htmlLang: "ko",
		subtitle: "Minecraft 리소스 팩 변환기",
		dirJ2B: "Java → Bedrock",
		dirB2J: "Bedrock → Java",
		dropLabel: "파일을 드롭하세요",
		googleFont: "Noto+Sans+KR:wght@600;700",
	},
	zh: {
		htmlLang: "zh-CN",
		subtitle: "Minecraft 资源包转换器",
		dirJ2B: "Java → 基岩",
		dirB2J: "基岩 → Java",
		dropLabel: "拖放资源包文件",
		googleFont: "Noto+Sans+SC:wght@600;700",
	},
	tl: {
		htmlLang: "tl",
		subtitle: "Minecraft Resource Pack Converter",
		dirJ2B: "Java → Bedrock",
		dirB2J: "Bedrock → Java",
		dropLabel: "I-drop ang pack dito",
	},
	es: {
		htmlLang: "es",
		subtitle: "Convertidor de Resource Packs de Minecraft",
		dirJ2B: "Java → Bedrock",
		dirB2J: "Bedrock → Java",
		dropLabel: "Suelta tu paquete",
	},
	fr: {
		htmlLang: "fr",
		subtitle: "Convertisseur de packs Minecraft",
		dirJ2B: "Java → Bedrock",
		dirB2J: "Bedrock → Java",
		dropLabel: "Déposez votre pack",
	},
	de: {
		htmlLang: "de",
		subtitle: "Minecraft Resource-Pack-Konverter",
		dirJ2B: "Java → Bedrock",
		dirB2J: "Bedrock → Java",
		dropLabel: "Datei hier ablegen",
	},
};

function findBrowser(): string {
	const candidates = [
		process.env.CHROME_PATH,
		"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
		process.env.LOCALAPPDATA
			? path.join(process.env.LOCALAPPDATA, "Google\\Chrome\\Application\\chrome.exe")
			: undefined,
		"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
		"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
		"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
		"/usr/bin/google-chrome",
		"/usr/bin/chromium",
		"/usr/bin/chromium-browser",
	].filter((p): p is string => Boolean(p));

	for (const candidate of candidates) {
		if (fs.existsSync(candidate)) return candidate;
	}
	throw new Error("No Chrome or Edge binary found. Set CHROME_PATH to your browser executable.");
}

function renderHtml(copy: OgCopy, iconSvg: string): string {
	const uploadSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`;
	const chevronSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;

	return `<!doctype html>
<html lang="${copy.htmlLang}">
<head>
  <meta charset="UTF-8" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 1200px;
      height: 630px;
      overflow: hidden;
      background: #f2f2f7;
      font-family: "Inter", "Noto Sans JP", "Noto Sans KR", "Noto Sans SC", -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", "Hiragino Sans", "Yu Gothic UI", "Malgun Gothic", "Microsoft YaHei", sans-serif;
      -webkit-font-smoothing: antialiased;
      color: #111113;
    }
    .og-canvas {
      width: 1200px;
      height: 630px;
      position: relative;
      overflow: hidden;
      background: #f2f2f7;
    }
    .og-perimeter {
      position: absolute;
      inset: 0;
      box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.06);
      pointer-events: none;
    }
    .pb-icon {
      width: 84px;
      height: 84px;
      border-radius: 22%;
      overflow: hidden;
      flex-shrink: 0;
      box-shadow: 0 10px 24px rgba(0, 122, 255, 0.22);
    }
    .pb-icon svg {
      width: 100%;
      height: 100%;
      display: block;
    }
    .center-stage {
      position: absolute;
      left: 325px;
      top: 48px;
      width: 550px;
      height: 534px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      gap: 18px;
    }
    .title {
      font-size: 76px;
      font-weight: 800;
      letter-spacing: -0.03em;
      line-height: 1.02;
      color: #111113;
    }
    .subtitle {
      font-size: 27px;
      font-weight: 600;
      line-height: 1.32;
      color: #636369;
      max-width: 510px;
      text-wrap: balance;
    }
    .seg {
      margin-top: 8px;
      display: inline-flex;
      align-items: center;
      padding: 4px;
      background: #e4e4ea;
      border-radius: 14px;
      gap: 4px;
    }
    .seg-active {
      background: #ffffff;
      color: #111113;
      font-size: 18px;
      font-weight: 700;
      padding: 10px 20px;
      border-radius: 10px;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
    }
    .seg-idle {
      color: #636369;
      font-size: 18px;
      font-weight: 600;
      padding: 10px 18px;
      border-radius: 10px;
    }
    .wing-left {
      position: absolute;
      left: -36px;
      top: 126px;
      width: 292px;
      background: #ffffff;
      border-radius: 24px;
      padding: 20px;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.06);
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .wing-seg {
      display: flex;
      background: #f2f2f7;
      padding: 4px;
      border-radius: 12px;
      gap: 4px;
    }
    .wing-seg > span {
      flex: 1;
      text-align: center;
      font-size: 12px;
      font-weight: 700;
      padding: 7px 6px;
      border-radius: 8px;
      color: #636369;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .wing-seg > span.on {
      background: #ffffff;
      color: #111113;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    }
    .field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .field-label {
      font-size: 12px;
      font-weight: 600;
      color: #636369;
    }
    .select-box {
      background: #f2f2f7;
      border-radius: 10px;
      padding: 10px 14px;
      font-size: 14px;
      font-weight: 600;
      color: #111113;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .wing-right {
      position: absolute;
      right: -36px;
      top: 118px;
      width: 292px;
      background: #ffffff;
      border-radius: 24px;
      padding: 20px;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.06);
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .drop-box {
      border: 2px dashed rgba(0, 122, 255, 0.35);
      background: #f8faff;
      border-radius: 16px;
      padding: 22px 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      text-align: center;
    }
    .drop-icon {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      background: #e8f2ff;
      color: #007aff;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .switch-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 4px 2px;
      font-size: 14px;
      font-weight: 600;
      color: #111113;
    }
    .ios-switch {
      width: 42px;
      height: 24px;
      border-radius: 12px;
      background: #34c759;
      padding: 2px;
      display: flex;
      justify-content: flex-end;
    }
    .ios-knob {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #ffffff;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
    }
  </style>
</head>
<body>
  <div class="og-canvas">
    <div class="wing-left">
      <div class="wing-seg">
        <span class="on">${copy.dirJ2B}</span>
        <span>${copy.dirB2J}</span>
      </div>
      <div class="field">
        <span class="field-label">Java</span>
        <div class="select-box"><span>1.21.4</span>${chevronSvg}</div>
      </div>
      <div class="field">
        <span class="field-label">Bedrock</span>
        <div class="select-box"><span>1.21.50</span>${chevronSvg}</div>
      </div>
    </div>

    <div class="center-stage">
      <div class="pb-icon">${iconSvg}</div>
      <h1 class="title">PackBridge</h1>
      <p class="subtitle">${copy.subtitle}</p>
      <div class="seg">
        <span class="seg-active">${copy.dirJ2B}</span>
        <span class="seg-idle">${copy.dirB2J}</span>
      </div>
    </div>

    <div class="wing-right">
      <div class="drop-box">
        <div class="drop-icon">${uploadSvg}</div>
        <div style="font-size:14px;font-weight:700;color:#111113;">${copy.dropLabel}</div>
        <div style="font-size:12px;font-weight:600;color:#636369;">.zip / .mcpack</div>
      </div>
      <div class="switch-row">
        <span>Textures</span>
        <div class="ios-switch"><div class="ios-knob"></div></div>
      </div>
      <div class="switch-row">
        <span>Sounds</span>
        <div class="ios-switch"><div class="ios-knob"></div></div>
      </div>
    </div>
    <div class="og-perimeter"></div>
  </div>
</body>
</html>`;
}

function assertValidPng(filePath: string, expectedWidth: number, expectedHeight: number): number {
	const buf = fs.readFileSync(filePath);
	assert.ok(buf.length > 5000, `${filePath} is unexpectedly small (${buf.length} bytes)`);
	assert.equal(buf.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", `${filePath} is not a valid PNG`);
	assert.equal(buf.subarray(12, 16).toString("ascii"), "IHDR", `${filePath} missing IHDR chunk`);
	assert.equal(buf.readUInt32BE(16), expectedWidth, `${filePath} width mismatch`);
	assert.equal(buf.readUInt32BE(20), expectedHeight, `${filePath} height mismatch`);
	return buf.length;
}

async function main() {
	const browser = findBrowser();
	const iconSvg = fs.readFileSync(path.join(PUBLIC_DIR, "app-icon.svg"), "utf-8");
	const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "packbridge-og-"));

	const server = http.createServer((req, res) => {
		const url = new URL(req.url || "/", "http://127.0.0.1");
		const lang = url.searchParams.get("lang") || "en";
		const copy = OG_COPY[lang] || OG_COPY.en;
		res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
		res.end(renderHtml(copy, iconSvg));
	});

	try {
		await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
		const { port } = server.address() as AddressInfo;

		for (const lang of Object.keys(OG_COPY)) {
			const outPath = path.join(PUBLIC_DIR, `og-image-${lang}.png`);
			await execFileAsync(
				browser,
				[
					"--headless=new",
					"--disable-gpu",
					"--no-first-run",
					"--no-default-browser-check",
					"--disable-extensions",
					"--force-device-scale-factor=1",
					"--hide-scrollbars",
					"--window-size=1200,630",
					`--user-data-dir=${tmpDir}`,
					`--screenshot=${outPath}`,
					`http://127.0.0.1:${port}/?lang=${lang}`,
				],
				{ timeout: 30_000 },
			);

			const bytes = assertValidPng(outPath, 1200, 630);
			console.log(`Generated og-image-${lang}.png (1200x630, ${(bytes / 1024).toFixed(1)} KB)`);
		}
	} finally {
		server.close();
		fs.rmSync(tmpDir, { recursive: true, force: true });
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
