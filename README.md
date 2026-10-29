# Chip spinner

<img src="chip-spinner.gif" height="96" alt="A dot-matrix CPU and GPU spinning in 3D">

Small 3D CPU and GPU icons, drawn as a grid of dots, that spin while work runs. I made them for LTT Folding Month, to mark the CPU and GPU work units on my [Folding@home](https://foldingathome.org/) dashboard. They are a sibling of my [helix spinner](https://github.com/zachvivier/helix-spinner).

It is one JavaScript file, with no dependencies and no build step.

## Use it

Add a canvas for each chip, then call `mountChips`:

```html
<canvas data-chip="cpu" role="img" aria-label="CPU"></canvas>
<canvas data-chip="gpu" role="img" aria-label="GPU"></canvas>

<script type="module">
  import { mountChips } from './chip-spinner.js';
  mountChips();
</script>
```

If you add canvases later, call `mountChips()` again. A canvas you remove from the page stops drawing by itself.

To see every option, serve this folder (for example with `python3 -m http.server`) and open [`index.html`](index.html). Browsers do not load JavaScript modules from a file opened straight from disk.

## Options

Set these as attributes on the canvas:

| Attribute | Default | Does |
|---|---|---|
| `data-chip` | (required) | `cpu` or `gpu` |
| `data-dot` | `1` | Space between dots, in CSS pixels. The CPU is 25 dots wide and the GPU 35, so `data-dot="2"` makes a 50 px CPU |
| `data-axis` | `right` | `right` rolls up through the top right. `left` rolls up through the top left |
| `data-duration` | `5200` CPU, `6400` GPU | Milliseconds for one full turn |
| `data-still` | (not set) | Holds the chip still in a three-quarter view |

The dots use the canvas's CSS `color`:

```css
canvas[data-chip="gpu"] { color: #65a7ff; }
```

To change an attribute after the first draw, call `mountChips()` again.

## How it works

- Each chip is a 3D model built from boxes. The CPU has a package, a heat spreader, and 28 gull-wing pins. The GPU has a board, heatsink fins, a shroud with two fans, a vented backplate, gold contacts, and a bracket.
- For every dot, the script sends a few parallel rays at the turning model and finds the face each ray hits first.
- That face is lit from the upper left. The light sets each dot's size and opacity, the way halftone print works.
- Dots that miss the model are not drawn, so the chip sits on any background.
- The GPU fans keep turning while the card spins.

With reduced motion on, every chip holds still in the three-quarter view.

## Cost

One frame of one chip takes about half a millisecond to work out on an Apple M-series Mac. Chips hidden with `display: none` are skipped.

## Browser support

It needs canvas 2D and JavaScript modules, which every current browser supports. I have tested it in Chromium and Safari.

## License

[MIT](LICENSE)
