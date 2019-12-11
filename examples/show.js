
const fs = require('fs')
const markright = require('../markright')

const filename = process.argv[2]

const mr = markright.parse(fs.readFileSync(filename).toString())
process.stdout.write(JSON.stringify(mr, null, 2))