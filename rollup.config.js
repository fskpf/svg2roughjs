import dts from 'rollup-plugin-dts'

export default [
  {
    input: 'dist/index.js',
    output: {
      file: 'bundled/index.js',
      format: 'es',
      sourcemap: true
    },
    external: ['tinycolor2', 'svg-pathdata', 'roughjs/bin/rough']
  },
  {
    input: 'dist/index.d.ts',
    output: {
      file: 'bundled/index.d.ts'
    },
    plugins: [dts()]
  }
]
