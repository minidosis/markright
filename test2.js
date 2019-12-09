
const MR = require('./markright2')
const colors = require('colors');

const toArray = (x) => (Array.isArray(x) ? x : [x])
const toString = (x) => (Array.isArray(x) ? x.join('\n') : x)

const performTest = (input, output) => {
  const print = (x) => {
    if (x === null) {
      return '<null>'
    }
    switch (x.constructor) {
      case Array: 
        return `Line(${x.map(elem => print(elem)).join('')})`
      case String:
        return x
      case MR.Command:
        let result = `Cmd("${x.name}"`
        if (x.args) result += `,[${x.args.join(',')}]`
        if (x.body) result += `,${print(x.body)}`
        result += ")"
        return result
      default:
        throw new Error(`Unexpected object of type ${x.constructor}`)
    }
  }
  const actual = MR.parse(toArray(input)).map(print).join('')
  const expected = toString(output)
  if (actual !== expected) {
    console.log(`Failed test: ${colors.brightYellow(input)}`)
    console.log(`${colors.green(expected)}`)
    console.log(`${colors.red(actual)}`)
  }
}

const tests = MR.parseFile('./tests.mr', {
  'test': (args, testBody) => {
    let input, output;
    MR.parse(testBody, {
      'input': (_, body) => input = body,
      'output': (_, body) => output = body,
    })
    performTest(input, output)    
  }
})
