
const mr = require('../markright')

const obj = mr.parseFileRecur('informal-test.mr')
console.log(JSON.stringify(JSON.parse(obj.toJson()), null, 2))
console.log(obj.toString())
