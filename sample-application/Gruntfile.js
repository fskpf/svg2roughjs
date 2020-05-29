module.exports = function(grunt) {
  grunt.loadNpmTasks('grunt-contrib-copy')

  grunt.registerTask(
    'update-svg2roughjs',
    'Copies the current local svg2roughjs content to the /node_modules/',
    ['copy:svg2roughjs']
  )

  grunt.initConfig({
    copy: {
      svg2roughjs: {
        files: [
          { src: '../index.js', dest: './node_modules/svg2roughjs/index.js' },
          { src: '../package.json', dest: './node_modules/svg2roughjs/package.json' },
          { src: '../README.md', dest: './node_modules/svg2roughjs/README.md' },
          { src: '../LICENSE.md', dest: './node_modules/svg2roughjs/LICENSE.md' }
        ]
      }
    }
  })
}
