// http://www.browsersync.io/docs/options/
module.exports = {
  files: ['build/*.{css,js}', 'demo/**/*.{html,css,js,json}'],
  watchEvents: ['add', 'change'],
  server: {
    baseDir: 'demo',
    directory: true
  },
  middleware: (req, res, next) => {
    if (req.url.includes('gsrsearch=morelike')) {
      req.url = '/ReadMoreResponse.json'
    }
    return next()
  }
}