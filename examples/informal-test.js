
const fs = require('fs')
const markright = require('../markright')

const obj1 = markright.parse(fs.readFileSync('informal-test.mr').toString())
// console.log(JSON.stringify(obj1, null, 2))
const str1 = markright.stringify(obj1)
console.log(str1)
const obj2 = markright.parse(str1)
console.log(markright.stringify(obj2))
