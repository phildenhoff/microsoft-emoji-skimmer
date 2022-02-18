#!/bin/zsh

# These are special cases where the unicode short code isn't
# actually a valid unicode character.
declare -A broken_emoji
broken_emoji[1F24A7]="1F4A7"
broken_emoji[1F6FE8]="1F6F8"

output_path="pngs"
for size in 64 128 256 512; do
  echo "Generating $size px images"
  mkdir -p $output_path/$size

  for f in originals/*/*.svg; do
    local fname=$f:t:r
    local print=false
    local emojishort=$(echo $fname | cut -d- -f2 | cut -d_ -f1)
    if [[ -v "broken_emoji[$emojishort]" ]]; then
      # For broken emojis, use the replacement
      emojishort=${broken_emoji[$emojishort]}
    fi
    local emoji=$(echo "\U000"$emojishort)
    rsvg-convert -h $size $f -o $output_path/$size/"$emoji"_$f:t:r.png
    if [ $? -ne 0 ]; then
      echo "Error saving last file $fname with emoji $f, saving without emoji"
      rsvg-convert -h $size $f -o $output_path/$size/$f:t:r.png
    fi
  done
done
