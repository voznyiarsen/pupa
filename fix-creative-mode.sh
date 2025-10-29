#!/bin/bash
# Mineflayer devs for some fuckass reason have this line 
# assert(slot >= 0 && slot <= 44)
# run even though minecraft 1.9+ has dual wielding, meaning it should be 
# assert(slot >= 0 && slot <= 45) 
# for 1.9+ and 
# assert(slot >= 0 && slot <= 44)
# for 1.8 and below
# TLDR: FIX YOUR FUCKING SLOTS DEVS, please

FOLDER="./node_modules"

find "$FOLDER" \( -name "*.js" -o -name "*.ts" \) -type f -exec grep -l "assert(slot >= 0 && slot <= 44)" {} \; | while read -r file; do
    sed -i 's/assert(slot >= 0 \&\& slot <= 44)/assert(slot >= 0 \&\& slot <= 45);/' "$file"
    echo "Updated $file"
done