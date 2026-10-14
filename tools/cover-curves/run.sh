#!/bin/sh
# Text template -> build -> measure -> curves -> final SchoolLive.astro -> build
set -e
C=$(dirname "$0"); C=$(cd "$C" && pwd); SITE=$(cd "$C/../../site" && pwd)
cp "$C/SchoolLive.text.astro" $SITE/src/components/SchoolLive.astro
(cd $SITE && npx -y pnpm@11.19.0 build >/dev/null)
node "$C/measure.mjs" "$C"
python3 "$C/build.py" "$C"
node "$C/apply.mjs" "$C"
python3 "$C/make.py" "$C"
(cd $SITE && npx -y pnpm@11.19.0 build >/dev/null)
echo done
