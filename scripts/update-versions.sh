#!/bin/bash
set -e

VERSION=$1

if [ -z "$VERSION" ]; then
    echo "Usage: $0 <version>"
    exit 1
fi

echo "Updating all version files to $VERSION"

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Update __version__.py
sed -i.bak "s/__version__ = '.*'/__version__ = '$VERSION'/" "$ROOT_DIR/__version__.py"
rm -f "$ROOT_DIR/__version__.py.bak"
echo "Updated __version__.py"

# Update frontend/package.json
cd "$ROOT_DIR/frontend"
npm version "$VERSION" --no-git-tag-version --allow-same-version 2>/dev/null || \
    sed -i.bak "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" package.json && rm -f package.json.bak
cd "$ROOT_DIR"
echo "Updated frontend/package.json"

# Update Helm Chart.yaml (both version and appVersion)
sed -i.bak "s/^version: .*/version: $VERSION/" "$ROOT_DIR/helm/bambubridge/Chart.yaml"
sed -i.bak "s/^appVersion: .*/appVersion: $VERSION/" "$ROOT_DIR/helm/bambubridge/Chart.yaml"
rm -f "$ROOT_DIR/helm/bambubridge/Chart.yaml.bak"
echo "Updated helm/bambubridge/Chart.yaml"

echo "All version files updated to $VERSION"
