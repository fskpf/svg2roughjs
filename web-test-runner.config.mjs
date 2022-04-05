// import { playwrightLauncher } from '@web/test-runner-playwright';

import { rollupBundlePlugin } from '@web/dev-server-rollup'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'

const filteredLogs = ['Running in dev mode', 'lit-html is in dev mode', 'Lit is in dev mode']

// https://modern-web.dev/docs/test-runner/cli-and-configuration/
export default /** @type {import("@web/test-runner").TestRunnerConfig} */ ({
  /** Test files to run */
  files: ['test/runner/all.spec.js'],

  plugins: [
    // We need to use rollup here unfortunately, because esbuild in the open-wc test-runner
    // only works on esbuild's single file transform API that doesn't bundle dependencies
    // automatically. This does not work for the external dependencies here (e.g. rough,
    // units-css, etc.), which cannot be resolved then.
    //
    // So use rollup with a configuration that creates one big-fat bundle without external deps.
    rollupBundlePlugin({
      rollupConfig: {
        input: 'out-tsc/index.js',
        plugins: [nodeResolve(), commonjs()]
      }
    })
  ],

  coverage: false,

  /** Resolve bare module imports */
  nodeResolve: {
    exportConditions: ['browser', 'development']
  },

  rootDir: './',

  /** Filter out lit dev mode logs */
  filterBrowserLogs(log) {
    for (const arg of log.args) {
      if (typeof arg === 'string' && filteredLogs.some(l => arg.includes(l))) {
        return false
      }
    }
    return true
  }

  /** Compile JS for older browsers. Requires @web/dev-server-esbuild plugin */
  // esbuildTarget: 'auto',

  /** Amount of browsers to run concurrently */
  // concurrentBrowsers: 2,

  /** Amount of test files per browser to test concurrently */
  // concurrency: 1,

  /** Browsers to run tests on */
  // browsers: [
  //   playwrightLauncher({ product: 'chromium' }),
  //   playwrightLauncher({ product: 'firefox' }),
  //   playwrightLauncher({ product: 'webkit' }),
  // ],

  // See documentation for all available options
})
