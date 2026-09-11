# UI clarity and map orders

## Problems addressed

The previous sidebar placed unit commands after realm, story and victory cards. Small, translucent buttons blended into dark panels; mobile utility buttons hid their text. Unit equipment and eleven recruitment requirements competed with immediate actions. A map click only selected, with the subsequent movement button often below the visible panel.

## Implemented behavior

- Command-first sidebar, with a separate Realm overview and persistent Story/council and Army/styles shortcuts. Selecting a tile or next unit returns to Commands.
- Larger control text and 44-pixel minimum button height, stronger filled surfaces/borders, clear mint movement buttons, red attack confirmation and gold active-panel/end-turn controls. Disabled controls retain readable text and requirements.
- Equipment and veteran requirements are expandable. Available recruits come first; unavailable units and their requirements form a separate disclosure. Unit-specific guard/training details appear when inspecting that unit's own tile, rather than burying a separately selected city's actions.
- Persistent on-map order card: destination coordinates, movement instruction or damage/retaliation preview, and an explicit Move here / Confirm attack button. Single clicks inspect without spending actions. Double-clicking/double-tapping the same reachable, empty destination moves the selected friendly unit using the existing authoritative command and autosave.
- Double clicks never attack, move onto occupied tiles, reveal fog or bypass movement/turn limits. Mouse drag, out-and-back drag, pinch, cancelled touch, wheel zoom, camera-button changes and long press invalidate activation. Activation history resets after state changes. The second tap must hit the same tile nearby within 450 ms; the explicit button remains an alternative with no timing requirement.
- Thicker, unlit tactical outlines remain readable over terrain. Marker materials are cached instead of allocating them on every selection; exported world assets and gameplay rules are unchanged.
- Phone toolbars keep Next unit, Research and Export GLB text labels. Story exposition and reference rules fold away so council decisions start sooner. Dialogs have visible Close text, an accessible heading, scrolling and keyboard-operable disclosures.

## Review and verification

Review corrected misleading post-movement gunship messaging, preserved veteran-training availability when prerequisites change, prevented summary-focused keyboard shortcuts from accidentally ending a turn, and made a new island reopen Commands even if the previous view was Realm overview.

Tests cover gesture classification, real-canvas single/double clicks, touch double taps, fog rejection, enemy attack confirmation, drag safety, spent-movement rejection, autosave/reload, panel switching, keyboard disclosures, visible recruitment, 44-pixel phone controls and 320/390-pixel overflow checks. The existing combat, progression, story, faction, asset fallback and Blender-export browser regressions also remain in the release gate.

Automated viewport checks and inspected desktop/mobile captures support this release; they do not claim a full accessibility audit or usability testing with players. Double-tap timing varies by device, so the explicit Move here button and keyboard tile navigator remain supported alternatives.

Final local gates: **87 rules/asset/input tests and 29 browser tests passed**, and the production build completed. The existing large Three.js bundle warning remains advisory. A fully charted story map still uses 85 instance batches, 154 draw calls and 474,439 triangles; this UI revision does not increase its rendered scene geometry.
