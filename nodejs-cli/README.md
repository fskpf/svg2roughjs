# CLI

Create sketchs of an SVG on the command-line with [Node.js](https://nodejs.org/)
and [Puppeteer](https://pptr.dev/).

## Usage

In `/nodejs-cli/`

```
> npm install
> node src/svg2roughjs ../test/complex/bpmn-diagram/test.svg -o ./test.svg
```

## CLI Parameters

Pass the SVG file that should be converted as first parameter.

Additionally, the following optional options are available:

| Parameter                        | Description                                | Default                                    |
| -------------------------------- | ------------------------------------------ | ------------------------------------------ |
| `-o`<br>`--output`               | Output path for the resulting sketch.      | `'./sketch.svg'`                           |
| `--roughConfig.ROUGHJS_PROPERTY` | see [svg2roughjs](../README.md#properties) | see [svg2roughjs](../README.md#properties) |
| `--fontFamily`                   | see [svg2roughjs](../README.md#properties) | see [svg2roughjs](../README.md#properties) |
| `--backgroundColor`              | see [svg2roughjs](../README.md#properties) | see [svg2roughjs](../README.md#properties) |
| `--randomize`                    | see [svg2roughjs](../README.md#properties) | see [svg2roughjs](../README.md#properties) |
| `--seed`                         | see [svg2roughjs](../README.md#properties) | see [svg2roughjs](../README.md#properties) |
| `--sketchPatterns`               | see [svg2roughjs](../README.md#properties) | see [svg2roughjs](../README.md#properties) |
| `--pencilFilter`                 | see [svg2roughjs](../README.md#properties) | see [svg2roughjs](../README.md#properties) |

For example:

```
node src/svg2roughjs ../test/complex/bpmn-diagram/test.svg -o ./test.svg --roughConfig.roughness 1.5 --roughConfig.bowing 2 --backgroundColor white --fontFamily null
```

## Credits

- [Puppeteer](https://pptr.dev/) - Headless browser for Node.js in which the conversion is done
