// eslint-disable-next-line no-undef
module.exports = function (grunt) {
  grunt.loadNpmTasks('grunt-shell')
  grunt.loadNpmTasks('grunt-contrib-copy')
  grunt.loadNpmTasks('grunt-contrib-watch')

  grunt.registerTask('build-svg2roughjs', ['shell:npmBuildSvg2roughjs'])

  grunt.registerTask(
    'copy-svg2roughjs',
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
          {
            expand: true,
            src: '../dist/**',
            dest: './node_modules/svg2roughjs/dist/'
          },
          { src: '../README.md', dest: './node_modules/svg2roughjs/README.md' },
          { src: '../LICENSE.md', dest: './node_modules/svg2roughjs/LICENSE.md' },
          { src: '../package.json', dest: './node_modules/svg2roughjs/package.json' }
        ]
      }
    },
    watch: {
      change: {
        files: ['../src/**/*'],
        tasks: ['build-svg2roughjs']
      },
      update: {
        files: ['../dist/*'],
        tasks: ['copy-svg2roughjs']
      }
    }
  })
}
