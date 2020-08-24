import dts from 'rollup-plugin-dts'

export default [
  {
    input: 'dist/index.js',
    output: {
      file: 'index.js',
      format: 'es',
      sourcemap: true
    },
    external: ['tinycolor2', 'svg-pathdata', 'roughjs/bundled/rough.esm']
  },
  {
    input: 'dist/index.d.ts',
    output: {
      file: 'index.d.ts'
    },
    plugins: [dts()]
  }
]
