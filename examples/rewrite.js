
const fs = require('fs')
const mr = require('../markright')
const filename = process.argv[2]
const content = fs.readFileSync(filename).toString()
const root = mr.parseRecur(content)
process.stdout.write(mr.stringify(root))
