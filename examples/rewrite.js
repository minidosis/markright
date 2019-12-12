
const mr = require('../markright')
const filename = process.argv[2]
const root = mr.parseFileRecur(filename)
process.stdout.write(mr.stringify(root))
