#!/bin/sh
# Сборка с живым текстом -> замер слов -> кривые в site/src/data/curves -> обычная сборка
set -e
C=$(cd "$(dirname "$0")" && pwd); SITE=$(cd "$C/../../site" && pwd); TMP=$(mktemp -d)
(cd $SITE && CURVES_OFF=1 npx -y pnpm@11.19.0 build >/dev/null)
P=${1:-my-school}
case $P in home) R=/ ;; work) R=/work/ ;; *) R=/cases/$P/ ;; esac
node "$C/measure.cjs" $R $TMP/meas.json $P
python3 "$C/build.py" $TMP/meas.json $SITE/src/data/curves/$P.json
(cd $SITE && npx -y pnpm@11.19.0 build >/dev/null)
rm -rf $TMP
echo done
