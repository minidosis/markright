
const fs = require('fs')
const mr = require('../markright')

const content = fs.readFileSync('informal-test.mr').toString()
const obj = mr.parseRecur(content)

console.log(obj.toJson())
console.log(JSON.stringify(JSON.parse(obj.toJson()), null, 2))
console.log(mr.stringify(obj))
