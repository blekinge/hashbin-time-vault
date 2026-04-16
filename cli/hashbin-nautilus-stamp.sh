#!/bin/bash
# Nautilus script: right-click → Scripts → Hashbin Stamp
# Install: cp this file to ~/.local/share/nautilus/scripts/ && chmod +x it
# Requires: hashbin in PATH, zenity (standard on GNOME)

FILES="$NAUTILUS_SCRIPT_SELECTED_FILE_PATHS"

if [ -z "$FILES" ]; then
    zenity --error --text="No files selected." --title="Hashbin" 2>/dev/null
    exit 1
fi

OUTPUT=""
ERRORS=0

while IFS= read -r file; do
    [ -z "$file" ] && continue
    RESULT=$(hashbin stamp --include-name "$file" 2>&1)
    if [ $? -eq 0 ]; then
        OUTPUT="$OUTPUT\n✓ $(basename "$file")\n"
    else
        OUTPUT="$OUTPUT\n✗ $(basename "$file"): $RESULT\n"
        ERRORS=$((ERRORS + 1))
    fi
done <<< "$FILES"

if [ $ERRORS -eq 0 ]; then
    zenity --info --text="$OUTPUT" --title="Hashbin — Stamped" --no-wrap 2>/dev/null
else
    zenity --warning --text="$OUTPUT" --title="Hashbin — Errors" --no-wrap 2>/dev/null
fi
