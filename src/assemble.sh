#!/bin/bash
cd "$(dirname "$0")"
FILES="p1_data.js p2_core.js p3_ai.js p4a_render.js p4b1.js p4b2.js p4b3.js p5_ui.js p5b_settings.js p7_modes.js p9_audio.js p9b_extras.js p10_account.js p6a_net.js p6b_game.js"
(cat p0_head.html; for f in $FILES; do cat $f; done; cat p8_tail.html) > PokeBrawl2.html
sed -n '/^<script>/,/^<\/script>/p' PokeBrawl2.html | sed '1d;$d' > game.js
node --check game.js && echo SYNTAX_OK
