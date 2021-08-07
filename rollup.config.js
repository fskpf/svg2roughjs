import pkg from './package.json'
import { terser } from 'rollup-plugin-terser'
import dts from 'rollup-plugin-dts'

function matchSubmodules(externals) {
  return externals.map(e => new RegExp(`^${e}(?:[/\\\\]|$)`))
}

const externals = matchSubmodules([
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.peerDependencies || {}),
  ...Object.keys(pkg.optionalDependencies || {})
])

const es = {
  input: 'out-tsc/index.js',
  output: [
    {
      file: pkg.module.replace('.min', ''),
      format: 'es',
      name: 'svg2roughjs',
      sourcemap: true,
      plugins: []
    },
    {
      file: pkg.module,
      format: 'es',
      name: 'svg2roughjs',
      sourcemap: true,
      plugins: [terser({})]
    }
  ],
  external: externals,
  plugins: []
}

const typings = {
  input: 'out-tsc/index.d.ts',
  output: [{ file: 'dist/index.d.ts', format: 'es' }],
  plugins: [dts()]
}

export default [es, typings]
