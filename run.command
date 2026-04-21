#!/bin/bash
# Reach PWA - Fast Launcher
# This script starts the Reach logistics core server.

# Get the directory where the script is located
CDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$CDIR"

echo "------------------------------------------------"
echo "🚀 REACH PWA - STARTING LOGISTICS CORE"
echo "------------------------------------------------"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Dependencies missing. Running npm install..."
    npm install
fi

# Run the dev server
npm run dev
