#!/bin/zsh

output_path="pngs"
for size in 16 32 64 128 256 512; do
  echo "Generating $size"
  mkdir -p $output_path/$size

  for f in originals/*/*.svg; do
    local fname=$f:t:r
    local emojishort=$(echo $fname | cut -d- -f2 | cut -d_ -f1)
    local emoji=$(echo "\U000"$emojishort)
    rsvg-convert -h $size $f -o $output_path/$size/"$emoji"_$f:t:r.png
  done
done
