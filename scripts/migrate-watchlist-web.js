#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const appPath = path.join(root, "src", "App.jsx");
const mainPath = path.join(root, "src", "main.jsx");
const indexPath = path.join(root, "index.html");
const packagePath = path.join(root, "package.json");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function ensureTextFile(filePath, content) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, content, "utf8");
  }
}

function patchApp() {
  if (!fs.existsSync(appPath)) {
    throw new Error(`Missing App file: ${appPath}`);
  }

  let app = fs.readFileSync(appPath, "utf8");

  app = app.replace(/icon:\s*`\/favicons\/\.png`,/g, 'icon: "/favicons/" + slug + ".png",');
  app = app.replace(/tool\.logo\s*\|\|\s*favicon\(tool\.url\)/g, "tool.icon");

  if (!app.includes("function fallbackToRemoteFavicon(event, url)")) {
    app = app.replace(
      /function favicon\(url\) \{[^\n]*\}\n/,
      (match) => `${match}function fallbackToRemoteFavicon(event, url) {\n  if (event.currentTarget.dataset.fallback === "1") return;\n  event.currentTarget.dataset.fallback = "1";\n  event.currentTarget.src = favicon(url);\n}\n`
    );
  }

  fs.writeFileSync(appPath, app, "utf8");
}

function patchPackageJson() {
  const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));

  pkg.scripts = {
    ...(pkg.scripts || {}),
    dev: "vite",
    build: "npm run fetch:favicons && vite build",
    preview: "vite preview",
    "fetch:favicons": "node scripts/fetch-favicons.js",
    "generate:readme": "node generate-readme.js",
    "validate:tools": "node scripts/validate-tools.js",
  };

  pkg.dependencies = {
    ...(pkg.dependencies || {}),
    "js-yaml": "^4.1.0",
    react: "^18.3.1",
    "react-dom": "^18.3.1",
  };

  pkg.devDependencies = {
    ...(pkg.devDependencies || {}),
    vite: "^5.4.21",
  };

  fs.writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
}

function main() {
  ensureDir(path.join(root, "src"));
  ensureDir(path.join(root, "public", "favicons"));

  ensureTextFile(
    indexPath,
    `<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>The AI SRE Watchlist</title>\n  </head>\n  <body>\n    <div id="root"></div>\n    <script type="module" src="/src/main.jsx"></script>\n  </body>\n</html>\n`
  );

  ensureTextFile(
    mainPath,
    `import React from "react";\nimport { createRoot } from "react-dom/client";\nimport App from "./App.jsx";\n\ncreateRoot(document.getElementById("root")).render(\n  <React.StrictMode>\n    <App />\n  </React.StrictMode>\n);\n`
  );

  ensureTextFile(path.join(root, "public", "favicons", ".gitkeep"), "");

  patchApp();
  patchPackageJson();

  console.log("Watchlist web migration patch applied.");
}

main();
