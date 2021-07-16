// eslint-disable-next-line no-undef
module.exports = function (grunt) {
  grunt.loadNpmTasks('grunt-shell')
  grunt.loadNpmTasks('grunt-contrib-copy')
  grunt.loadNpmTasks('grunt-contrib-watch')

  grunt.registerTask('build-svg2roughjs', ['shell:npmBuildSvg2roughjs'])

  grunt.registerTask(
    'update-svg2roughjs',
    'Copies the current local svg2roughjs content to the /node_modules/',
    ['copy:svg2roughjs']
  )

  grunt.initConfig({
    shell: {
      npmBuildSvg2roughjs: {
        command: 'npm run build-svg2roughjs'
      }
    },
    copy: {
      svg2roughjs: {
        files: [
          { src: '../bundled/index.js', dest: './node_modules/svg2roughjs/bundled/index.js' },
          {
            src: '../bundled/index.js.map',
            dest: './node_modules/svg2roughjs/bundled/index.js.map'
          },
          { src: '../bundled/index.d.ts', dest: './node_modules/svg2roughjs/bundled/index.d.ts' },
          { src: '../package.json', dest: './node_modules/svg2roughjs/package.json' },
          { src: '../README.md', dest: './node_modules/svg2roughjs/README.md' },
          { src: '../LICENSE.md', dest: './node_modules/svg2roughjs/LICENSE.md' }
        ]
      }
    },
    watch: {
      change: {
        files: ['../src/*'],
        tasks: ['build-svg2roughjs']
      },
      copy: {
        files: ['../bundled/*'],
        tasks: ['update-svg2roughjs']
      }
    }
  })
}
