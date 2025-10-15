#!/bin/bash

# Librus Notifier Installation Script for macOS

set -e

echo "🚀 Installing Librus Notifier..."

# Get absolute path
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "📁 Project directory: $PROJECT_DIR"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install it first:"
    echo "   brew install node"
    exit 1
fi

NODE_PATH=$(which node)
echo "✅ Node.js found at: $NODE_PATH"

# Install dependencies
echo "📦 Installing npm dependencies..."
cd "$PROJECT_DIR"
npm install

# Create state and logs directories
echo "📂 Creating directories..."
mkdir -p state logs
touch state/.gitkeep logs/.gitkeep

# Prepare launchd plist
echo "⚙️  Configuring launchd..."
PLIST_SOURCE="$PROJECT_DIR/com.librus.notifier.plist"
PLIST_DEST="$HOME/Library/LaunchAgents/com.librus.notifier.plist"

# Replace placeholder paths in plist
sed "s|REPLACE_WITH_FULL_PATH|$PROJECT_DIR|g" "$PLIST_SOURCE" > "$PLIST_DEST.tmp"
sed "s|/usr/local/bin/node|$NODE_PATH|g" "$PLIST_DEST.tmp" > "$PLIST_DEST"
rm "$PLIST_DEST.tmp"

# Unload if already loaded
launchctl unload "$PLIST_DEST" 2>/dev/null || true

# Load the agent
echo "🔄 Loading launchd agent..."
launchctl load "$PLIST_DEST"

echo ""
echo "✅ Installation complete!"
echo ""
echo ""
echo "🔧 Management commands:"
echo "   Test run:          node $PROJECT_DIR/src/index.js"
echo "   Check status:      launchctl list | grep librus"
echo "   View logs:         tail -f $PROJECT_DIR/logs/info.log"
echo "   Uninstall:         launchctl unload $PLIST_DEST"
echo ""
echo "🎉 Notifier is now running! You'll receive alerts at scheduled times."