import dts from 'rollup-plugin-dts'

export default {
  input: 'dist/index.js',
  output: {
    file: 'index.js',
    format: 'es',
    sourcemap: true,
    plugins: [dts()]
  }
}
