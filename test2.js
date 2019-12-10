
let testfile = process.argv[2]
if (testfile === undefined) {
  testfile = 'tests.mr'
}

const MR = require('./markright2')
const colors = require('colors');

const toArray = (x) => (Array.isArray(x) ? x : [x])
const toString = (x) => (Array.isArray(x) ? x.join('\n') : x)

const performTest = (title, input, output) => {
  const print = (x) => {
    switch (x.constructor) {
      case String:
        return x
      case Array:
        return `Line(${x.map(elem => print(elem)).join('')})`
      case MR.Command:
        let result = `@${x.name}`
        if (x.args) result += `(${x.args.join(',')})`
        if (x.body) {
          switch (x.body.constructor) {
          case Array:
            result += `\`${print(x.body.map(elem => print(elem)).join(''))}\``   
            break
          case String:
            result += `\`${print(x.body)}\``
            break
          default:
            throw new Error(`unknown body type!`)
          }
        }
        return result
      default:
        throw new Error(`Unexpected object of type ${x.constructor}`)
    }
  }
  try {
    const parsed = MR.parse(toArray(input))
    const actual = parsed.map(print).join('')
    const expected = toString(output)
    if (actual !== expected) {
      console.log(`Failed test "${title}": ${colors.brightYellow(input)}`)
      console.log(`${colors.green(`"${expected}"`)}`)
      console.log(`${colors.red(`"${actual}"`)}`)
      process.exit(1)
    }
  } catch (e) {
    console.error(`Test ${title} failed with error: ${e.toString()}`)
  }
}

MR.parseFile(testfile, {
  'test': (args, testBody) => {
    let input, output;
    MR.parse(testBody, {
      'input': (_, body) => input = body,
      'output': (_, body) => output = body,
    })
    performTest(args[0], input, output)
  }
})
