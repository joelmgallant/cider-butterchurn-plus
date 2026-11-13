#!/bin/sh
# Build and install Butterchurn+ into the local Cider 4 (macOS) plugins directory.
set -eu
PLUGINS="$HOME/Library/Application Support/sh.cider.genten/plugins"
TARGET="$PLUGINS/com.joelmgallant.butterchurn"
cd "$(dirname "$0")/.."
yarn build
mkdir -p "$TARGET"
cp dist/plugin.js dist/plugin.yml "$TARGET/"
echo "Installed to $TARGET — restart Cider to load it."
if [ -d "$PLUGINS/dev.booploops.butterchurn-visualizer" ]; then
  echo "WARNING: the original Butterchurn plugin is still installed; both will load."
fi
