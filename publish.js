/**
 * SecureStash One-Click Internet Publisher
 * Builds the frontend, starts the backend, and creates an instant public HTTPS tunnel.
 */

const { spawn, execSync } = require("child_process");
const path = require("path");
const fs = require("fs");
const os = require("os");
const https = require("https");

function getLocalIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return null;
}

console.log("\n" + "=".repeat(65));
console.log("  🔐 SECURESTASH - ONE-CLICK INTERNET PUBLISHING");
console.log("=".repeat(65) + "\n");

// 1. Build client to ensure latest bundle is served
console.log("📦 Building latest frontend production bundle...");
try {
  execSync("npm --prefix SecureStash/client run build", { stdio: "inherit" });
  console.log("✓ Frontend build complete.\n");
} catch (err) {
  console.error("❌ Failed to build client:", err.message);
  process.exit(1);
}

// 2. Start the SecureStash backend server (port 5000)
console.log("🚀 Launching SecureStash server on port 5000...");
const serverProcess = spawn("node", ["SecureStash/server/server.js"], {
  stdio: ["inherit", "pipe", "pipe"],
  cwd: __dirname
});

serverProcess.stdout.on("data", (data) => {
  const text = data.toString();
  if (text.includes("SecureStash server running") || text.includes("MongoDB Connected")) {
    process.stdout.write(`  [Server] ${text.trim()}\n`);
  }
});

serverProcess.stderr.on("data", (data) => {
  process.stderr.write(`  [Server Error] ${data.toString()}`);
});

// Give the server 2 seconds to bind to port 5000
setTimeout(() => {
  console.log("\n🌐 Establishing direct public HTTPS tunnel (zero password prompts)...");

  // 3. Start SSH tunnel using native Windows OpenSSH to localhost.run
  const tunnelProcess = spawn(
    "ssh",
    ["-o", "StrictHostKeyChecking=no", "-R", "80:localhost:5000", "nokey@localhost.run"],
    { stdio: ["ignore", "pipe", "pipe"] }
  );

  let tunnelFound = false;

  const handleTunnelData = (data) => {
    const text = data.toString();
    const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.lhr\.life/);
    if (match && !tunnelFound) {
      tunnelFound = true;
      const publicUrl = match[0];
      const localIp = getLocalIp();

      console.log("\n" + "=".repeat(68));
      console.log("  🎉 SECURESTASH IS PUBLICLY ONLINE FOR ANYONE TO USE!");
      console.log("=".repeat(68));
      console.log(`\n  👉 PUBLIC URL (Mobile + Laptop + Friends Worldwide):`);
      console.log(`     \x1b[36m\x1b[1m${publicUrl}\x1b[0m  (No password or IP prompt needed!)`);

      if (localIp) {
        console.log(`\n  ⚡ FASTEST on Mobile / Tablet (Same Wi-Fi Network):`);
        console.log(`     \x1b[32m\x1b[1mhttp://${localIp}:5000\x1b[0m  (Instant 0.1s speed)`);
      }
      console.log(`\n  🏠 Laptop Localhost: \x1b[37mhttp://localhost:5000\x1b[0m\n`);
      console.log("  • Anyone on mobile or laptop worldwide can click and use immediately!");
      console.log("  • Strong authentication & private folders are fully active.");
      console.log("  • Press Ctrl+C in this terminal to stop the server anytime.\n");
      console.log("=".repeat(68) + "\n");
    }
  };

  tunnelProcess.stdout.on("data", handleTunnelData);
  tunnelProcess.stderr.on("data", handleTunnelData);

  tunnelProcess.on("close", (code) => {
    console.log(`\nTunnel closed (code ${code}).`);
    serverProcess.kill();
    process.exit(0);
  });

}, 2000);

// Graceful cleanup on Ctrl+C
process.on("SIGINT", () => {
  console.log("\nShutting down SecureStash and closing public tunnel...");
  serverProcess.kill();
  process.exit(0);
});
