#!/bin/bash
# RTL-Terminal launcher for Linux
cd "$(dirname "$0")"
if ! command -v node &>/dev/null; then
  echo "[ERROR] Node.js not installed. Install: sudo apt install nodejs npm"
  exit 1
fi
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies (first run)..."
  npm install
  echo "OPTIONAL - for real bash shell: npm install node-pty"
fi
echo "Starting RTL-Terminal on http://localhost:3000 ..."
npm start
