#!/bin/bash -eu
# taken from https://github.com/uuidjs/uuid/blob/master/scripts/build.sh

# cd to the root dir
ROOT="$(pwd)"
cd "$ROOT" || exit 1

PATH="$(npm bin):$PATH"
DIR="$ROOT/dist"

# Clean up output dir
rm -rf "$DIR"
mkdir -p "$DIR"

# Transpile CommonJS versions of files
babel --env-name commonjs src --source-root src --out-dir "$DIR" --copy-files --quiet

# Transpile ESM versions of files for the browser
babel --env-name esmBrowser src --source-root src --out-dir "$DIR/esm-browser" --copy-files --quiet

# Transpile ESM versions of files for node
babel --env-name esmNode src --source-root src --out-dir "$DIR/esm-node" --copy-files --quiet

# UMD Build
mkdir "$DIR/umd"
rollup -c