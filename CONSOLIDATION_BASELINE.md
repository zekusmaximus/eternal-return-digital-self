# Older prototype pre-consolidation baseline

Reviewed: July 13, 2026

Immutable tag: `pre-consolidation-2026-07-13`

Tagged commit: `a457a0128c279d215650b3bb2ac9c78d847a03c4`

## Role in consolidation

This repository is feature frozen and retained only as a reference for first-run onboarding, animated node guidance, Help, visual atmosphere, and potentially useful measured 3D rendering techniques. Narramorph is the sole active product implementation.

The duplicate Redux/domain/infrastructure architectures, current node reader/transformation stack, and checked-in build-output practice are not migration targets.

## Verified technical state

| Check | Result |
|---|---|
| `npm run build` | Passed |
| `npm run lint` | Failed with two `no-explicit-any` errors in `NodesInstanced.tsx` |
| Normal automated test script | Not present |

Additional baseline facts:

- The package install reported a Three/postprocessing peer-range conflict.
- The repository contains multiple historical implementation/fix reports and overlapping architectural layers.
- `dist/` is tracked despite being listed in `.gitignore`; release artifacts should be produced by CI in Narramorph rather than maintained as source.

## UX baseline

Strengths:

- Cinematic first-run introduction with a clear “Begin Exploration” action.
- Animated node demonstration and replayable Help entry.
- Distinct cosmic visual atmosphere and a responsive constellation canvas.

Risks observed in the reviewed path:

- 3D nodes are small, faintly labelled, and not exposed as semantic navigation controls.
- Selecting a node opened a reading view whose main content area appeared empty even though diagnostics said content was loaded.
- The first selected node displayed as “revisited” with two visits.
- Internal diagnostic state appeared in the accessibility tree.
- The primary reading experience lacks the test and accessibility confidence present in Narramorph.

## Issue disposition

GitHub reported no open issues on July 13, 2026. Future extraction work is tracked in Narramorph's consolidation backlog.

## Archive gate

This repository may be archived only after every older-prototype row in Narramorph's feature extraction matrix is migrated, rejected, or explicitly deferred; resulting onboarding/visual behavior passes accessibility, reduced-motion, mobile, performance, and fallback checks; provenance is complete; and the owner accepts the Phase 6 parity review.
