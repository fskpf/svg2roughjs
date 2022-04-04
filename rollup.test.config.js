import pkg from './package.json'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'

const es = {
  input: 'out-tsc/index.js',
  output: [
    {
      file: 'test/lib/' + pkg.module.replace('.min', ''),
      format: 'es',
      name: 'svg2roughjs',
      sourcemap: false,
      plugins: []
    }
  ],
  plugins: [nodeResolve(), commonjs()]
}

export default [es]
