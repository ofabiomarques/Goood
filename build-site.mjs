import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const rootDir = process.cwd();
const workDir = path.join(rootDir, "work");
const outputDir = path.join(rootDir, "outputs", "Site Good");

const pages = [
  { slug: "", source: "home.html", route: "/" },
  { slug: "about", source: "about.html", route: "/about/" },
  { slug: "services", source: "services.html", route: "/services/" },
  { slug: "contact", source: "contact.html", route: "/contact/" },
];

const downloaded = new Map();
const textExtensions = new Set([".html", ".mjs", ".js", ".css", ".json", ".svg", ".txt"]);
const badgeCopy = "Create a free website with Framer, the website builder loved by startups, designers and agencies.";

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function collectUrls(html) {
  return [
    ...new Set(
      html.match(/https:\/\/(?:framerusercontent\.com|framer\.com|app\.framerstatic\.com)\/[^"'`()<>\\\s]+/g) ||
        [],
    ),
  ];
}

function toAssetPath(rawUrl) {
  const url = new URL(rawUrl.replaceAll("&amp;", "&"));
  const hostPart = url.hostname.replaceAll(".", "-");
  const ext = path.extname(url.pathname) || ".bin";
  const stem = path.basename(url.pathname, ext) || "asset";
  const digest = crypto
    .createHash("md5")
    .update(`${url.pathname}${url.search}`)
    .digest("hex")
    .slice(0, 10);

  let folder = "misc";
  if (url.hostname === "framerusercontent.com") {
    const first = url.pathname.split("/").filter(Boolean)[0];
    folder = first || "usercontent";
  } else if (url.hostname === "framer.com") {
    folder = "external";
  }

  return `/assets/${folder}/${hostPart}-${stem}-${digest}${ext}`;
}

async function downloadAsset(rawUrl) {
  const decodedUrl = rawUrl.replaceAll("&amp;", "&");
  if (downloaded.has(decodedUrl)) return downloaded.get(decodedUrl);

  const localPath = toAssetPath(decodedUrl);
  const absolutePath = path.join(outputDir, localPath);

  await fs.mkdir(path.dirname(absolutePath), { recursive: true });

  const response = await fetch(decodedUrl);
  if (!response.ok) {
    throw new Error(`Failed to download ${decodedUrl}: ${response.status}`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(absolutePath, bytes);
  downloaded.set(decodedUrl, localPath);
  return localPath;
}

async function localizeHtml(html) {
  let localized = html;
  const urls = collectUrls(html);

  for (const rawUrl of urls) {
    const localPath = await downloadAsset(rawUrl);
    localized = localized.replace(new RegExp(escapeRegExp(rawUrl), "g"), localPath);
  }

  return localized;
}

async function localizeTextFile(filePath) {
  const ext = path.extname(filePath);
  if (!textExtensions.has(ext)) return false;

  const absolute = path.join(outputDir, filePath);
  const original = await fs.readFile(absolute, "utf8");
  const urls = collectUrls(original);

  let next = original;
  for (const rawUrl of urls) {
    const localPath = await downloadAsset(rawUrl);
    next = next.replace(new RegExp(escapeRegExp(rawUrl), "g"), localPath);
  }

  next = next.replace(new RegExp(escapeRegExp(badgeCopy), "g"), "");
  next = next.replace(/Create a free website with Framer[^"'<>]*agencies\./g, "");
  next = next.replace(
    /\(function\(\)\{J&&l\(\(\)=>\{v\(document\.getElementById\(`__framer-badge-container`\),y\(m,\{\},y\(g\(\(\)=>import\(`\.\/PX9hIOIVM\.[^`]+\.mjs`\)\)\)\)\)\}\)\}\)\(\)/g,
    "void 0",
  );

  if (next !== original) {
    await fs.writeFile(absolute, next);
    return true;
  }

  return false;
}

async function walkFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(absolute)));
    } else {
      files.push(absolute);
    }
  }

  return files;
}

async function localizeNestedReferences() {
  for (let pass = 0; pass < 10; pass += 1) {
    const files = await walkFiles(outputDir);
    let changed = false;

    for (const absolute of files) {
      const relative = path.relative(outputDir, absolute);
      const didChange = await localizeTextFile(relative);
      changed = changed || didChange;
    }

    if (!changed) break;
  }
}

function patchHtml(html, route) {
  let patched = html;

  patched = patched.replace(
    /<script>try\{if\(localStorage\.getItem\("__framer_force_showing_editorbar_since"\)\)\{const n=document\.createElement\("link"\);n\.rel="modulepreload";n\.href="[^"]+";document\.head\.appendChild\(n\)\}\}catch\(e\)\{\}<\/script>\s*/gi,
    "",
  );
  patched = patched.replace(
    /<link rel="modulepreload"[^>]+href="[^"]*framer\.com\/edit\/init\.mjs"[^>]*>\s*/gi,
    "",
  );
  patched = patched.replace(/<div id="__framer-badge-container">[\s\S]*?<\/body>/gi, "</body>");
  patched = patched.replace(/href="\.\//g, 'href="/');
  patched = patched.replace(/href="\/about"/g, 'href="/about/"');
  patched = patched.replace(/href="\/services"/g, 'href="/services/"');
  patched = patched.replace(/href="\/contact"/g, 'href="/contact/"');
  patched = patched.replace(/href="\/?"/g, 'href="/"');
  patched = patched.replace(/href="\.\/about"/g, 'href="/about/"');
  patched = patched.replace(/href="\.\/services"/g, 'href="/services/"');
  patched = patched.replace(/href="\.\/contact"/g, 'href="/contact/"');
  patched = patched.replace(/href="\.\/"/g, 'href="/"');
  patched = patched.replace(/<meta name="generator"[^>]*>\s*/gi, "");
  patched = patched.replace(/<link rel="canonical"[^>]*>\s*/gi, "");
  patched = patched.replace(/<meta property="og:url"[^>]*>\s*/gi, "");
  patched = patched.replace(
    "</head>",
    `<style>
      #__framer-badge-container { display: none !important; }
      html { scroll-behavior: smooth; }
    </style></head>`,
  );

  if (route !== "/") {
    patched = patched.replace(/href="\//g, 'href="/');
  }

  return patched;
}

async function buildPage(page) {
  const sourcePath = path.join(workDir, page.source);
  const rawHtml = await fs.readFile(sourcePath, "utf8");
  const localized = await localizeHtml(rawHtml);
  const patched = patchHtml(localized, page.route);
  const pageDir = page.slug ? path.join(outputDir, page.slug) : outputDir;

  await fs.mkdir(pageDir, { recursive: true });
  await fs.writeFile(path.join(pageDir, "index.html"), patched);
}

async function writeMetaFiles() {
  await fs.writeFile(
    path.join(outputDir, "vercel.json"),
    `${JSON.stringify({ trailingSlash: true }, null, 2)}\n`,
  );
}

await fs.rm(outputDir, { recursive: true, force: true });
await fs.mkdir(outputDir, { recursive: true });

for (const page of pages) {
  await buildPage(page);
}

await localizeNestedReferences();
await writeMetaFiles();
