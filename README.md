
#The ManHater Project

## The Man Hater Cave 
A self-contained pixel-art birthday game for Krutika.

## Play locally
Open `index.html` in a modern browser. To hear the reference MP3s reliably, serve the folder over HTTP (for example, run `python -m http.server` in `birthday-game` and open `http://localhost:8000`). No install, API keys, game engine, or paid services required. Optional Google Fonts fall back to system fonts offline.

The `birthday-game` directory can be hosted on any static HTML host. Keep `assets`, `audio.js`, `game.js`, `style.css`, and `index.html` together.

## Controls
Click or tap the buttons. Space/Enter also advance the current action when a button is not focused. Audio starts after Enter the Cave; Sound toggles it.

## Edit the story

`SCRIPT.txt` contains the complete dialogue, button prompts, stage directions, and ending in plain text. Edit it in any text editor and send it back for integration; the game does not load it automatically.

## Customize
Birthday wording and name: `index.html`. Dialogue, timings, and the 20-cut mechanic: `game.js`. Music and sound effects: `audio.js`. Layout and typography: `style.css`.

The corridor and doorway use the Rosebud reference images supplied by the user. The chamber is an edited version of their reference; characters and remaining assets were generated for this project. No Rosebud game code was copied. The dungeon music, impact sound, and reveal fanfare use the original MP3 clips publicly served by the user’s Rosebud game, copied with their authorization. Web Audio plays these locally; the original synth score remains a fallback if decoding fails.

## Verification
Automated full journeys checked slow and rapid cuts capped at 20, visible splatter gaps at cuts 13–14 and full coverage at 18, the uploaded dialogue, timed red-out, reveal, ending confetti, an enabled Spare Him button through its click handler, replay with cleared timers and audio, unavailable actions, and asset rendering. Checks passed with reference audio, fallback audio, and reduced motion. Desktop and phone browser playback and audio listening require a final user playthrough.
