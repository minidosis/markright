
const fs = require('fs')
const markright = require('./markright')

const filename = process.argv[2]

const mr = markright.parse(fs.readFileSync(filename).toString())
const str = markright.stringify(mr)
process.stdout.write(str)