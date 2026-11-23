#!/usr/bin/env bash
# AKİS tüm testleri çalıştırır. Herhangi biri kalırsa çıkış kodu 1 olur.
#
# Kullanım:  bash tools/test.sh
set -u
cd "$(dirname "$0")/.."

fail=0
echo "### Hesaplama birim testleri ###"
node tools/birim-testleri.mjs || fail=1
node tools/rapor-workspace-testi.mjs || fail=1

echo
echo "### Rapor tutarlılık testi ###"
node tools/rapor-tutarlilik-testi.mjs || fail=1

echo
echo "### Sürüm tutarlılık testi ###"
node tools/surum-testi.mjs || fail=1

echo
echo "### Tasarım tutarlılık testi ###"
node tools/tasarim-testi.mjs || fail=1

echo
echo "### Veri şeması testi ###"
node tools/sema-testi.mjs || fail=1

echo
if [ "$fail" -eq 0 ]; then
  echo "== TÜM TESTLER GEÇTİ =="
else
  echo "== BAZI TESTLER KALDI =="
fi
exit "$fail"
