const template = require('./template')
const config = require('./runner.config')
const fs = require('fs-extra')
const path = require('path')
const globby = require('globby')
const { runner } = require('mocha-headless-chrome')

/**
 * Generate templates and run tests
 */
const tests = []
const cwd = process.cwd()
const tmpDir = path.join(cwd, 'tmp', 'browser')
fs.ensureDirSync(tmpDir)
fs.copySync(path.join(cwd, 'test', 'browser', 'common.js'), path.join(tmpDir, 'common.js'))

/** Will run the runners in a series */
function runSerial(tasks) {
    var result = Promise.resolve()
    tasks.forEach(task => {
        result = result.then(result => task(), err => {
            console.error(err.message)
        })
    })
    return result
}

Object.entries(config).forEach(entry => {
    const test = entry[1]
    const paths = globby.sync(test.src)
    const templateString = template(paths, test.options.helpers, test.options.specs)
    fs.writeFileSync(path.join(cwd, test.options.outfile), templateString)
    tests.push(() => runner({
        file: 'http://localhost:8081/' + test.options.outfile,
        timeout: 2000,
        args: ['disable-web-security']
    }))
})

module.exports = () => runSerial(tests).then(() => {
    process.exit()
}, err => {
    console.error(err.message)
    process.exit()
})
