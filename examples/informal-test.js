
const fs = require('fs')
const mr = require('../markright')

const obj1 = mr.parseFileRecur('informal-test.mr')
console.log(JSON.stringify(obj1, null, 2))
