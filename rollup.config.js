import commonjs from '@rollup/plugin-commonjs'
import resolve from '@rollup/plugin-node-resolve'
import dts from 'rollup-plugin-dts'
import terser from '@rollup/plugin-terser'
import fs from 'fs'

const pkg = JSON.parse(fs.readFileSync('./package.json'))

function matchSubmodules(externals) {
  return externals.map(e => new RegExp(`^${e}(?:[/\\\\]|$)`))
}

const externalsUmd = matchSubmodules([
  ...Object.keys(pkg.peerDependencies || {}),
  ...Object.keys(pkg.optionalDependencies || {})
])
const externals = matchSubmodules([...Object.keys(pkg.dependencies || {}), ...externalsUmd])

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

const umd = {
  input: 'out-tsc/index.js',
  output: [
    {
      file: pkg.browser.replace('.es.min.', '.umd.'),
      format: 'umd',
      name: 'svg2roughjs',
      sourcemap: true,
      plugins: []
    },
    {
      file: pkg.browser.replace('.es.', '.umd.'),
      format: 'umd',
      name: 'svg2roughjs',
      sourcemap: true,
      plugins: [terser({})]
    }
  ],
  external: externalsUmd,
  plugins: [commonjs(), resolve()]
}

const typings = {
  input: 'out-tsc/index.d.ts',
  output: [{ file: 'dist/index.d.ts', format: 'es' }],
  plugins: [dts()]
}

export default [es, umd, typings]
