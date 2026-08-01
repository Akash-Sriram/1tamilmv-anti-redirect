# 1TamilMV Anti-Redirect & Adblocker (Master Nullifier)

A robust, low-level Tampermonkey/Violentmonkey userscript designed to bypass aggressive redirect patterns, popunders, and popup advertisements on 1TamilMV mirror domains.

## Features
- **EventListener Filtering**: Intercepts and blocks suspicious click, touch, and mouse event listeners targeting popup redirection.
- **Node Insertion Blocking**: Inspects dynamic script elements before insertion and blocks those injected by third-party ad networks.
- **Window.open Hijack Protection**: Blocks `about:blank` window-open tricks used by ad-scripts to bypass pop-up blockers, and propagates protections to new window frames automatically.
- **Content Security Policy (CSP)**: Dynamically injects Content Security Policies to block unwanted external connections and third-party iframe behaviors.

## Installation / Auto-Updates

Install the userscript directly via this link to enable auto-updates:
[Install Userscript](https://raw.githubusercontent.com/Akash-Sriram/1tamilmv-anti-redirect/main/1tamilmv_adblocker.user.js)
