#!/usr/bin/env bash
set -euo pipefail

DEST="/var/www/spilklubben/"

sync() {
    rsync -a --delete dist/ "$DEST"
    echo "  → synced to $DEST"
}

echo "Starting watch build — will sync to $DEST on each rebuild."
echo ""

npx vite build --watch 2>&1 | while IFS= read -r line; do
    echo "$line"
    if [[ "$line" == *"built in"* ]]; then
        sync
    fi
done
