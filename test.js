
const fs = require('fs')
const MR = require('./markright')
const colors = require('colors');

const write = (...args) => process.stdout.write(...args)

const print = (x) => {
  switch (x.constructor) {
    case String:
      return x
    case Array:
      return `${x.map(print).join('')}`
    case MR.Line:
      return `Line(${x.children ? x.children.map(print).join('') : ''})`
    case MR.BlockCommand: {
      let result = `@${x.name}`
      if (x.args) result += `(${x.args.join(',')})`
      if (x.children) {
        result += `\`${print(x.children)}\``
      }
      return result
    }
    case MR.InlineCommand: {
      let result = `@${x.name}`
      if (x.args) result += `(${x.args.join(',')})`
      if (x.children) {
        result += `${x.delim.open}${print(x.children)}${x.delim.close}`
      }
      return result
    }
    default:
      throw new Error(`Unexpected object of type ${x.constructor}`)
  }
}

const performTest = (title, input, output) => {
  try {
    const parsed = MR.parseRecur(input)
    const actual = parsed.map(print).join('')
    const expected = output.join('\n')
    if (actual !== expected) {
      process.stdout.write('x')
      return [
        `Test "${title}" failed:\n${colors.brightYellow(input.join('\n'))}`,
        `${colors.green(`"${expected}"`)}`,
        `${colors.red(`"${actual}"`)}`,
        ``,
      ]
    } else {
      process.stdout.write('.')
    }
  } catch (e) {
    process.stdout.write('x')
    return [`Test "${title}" failed with exception:`, e.toString(), ``]
  }
}

const processTestFile = (testfile) => {
  let errors = []

  MR.parseFile(testfile, {
    'test': (args, testBody) => {
      const testName = args[0]
      let input, output;
      MR.parse(testBody, {
        'input': (_, rawChildren) => input = rawChildren,
        'output': (_, rawChildren) => output = rawChildren,
      })
      if (!input || !output) {
        throw new Error(`Error in test "${testName}": Input or output is empty!`)
      }
      const errs = performTest(testName, input, output)
      if (errs) errors.push(...errs)
    }
  })

  write('\n')
  if (errors.length > 0) {
    write(`\n${errors.join('\n')}\n`)
  }
}

// Process all files ending in '.mr' in the 'test' directory
fs.readdir('./tests', (err, files) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  const testfiles = files.filter(f => f.endsWith('.mr'))
  const maxLength = testfiles.reduce((mx, f) => Math.max(mx, f.length), 0)
  testfiles.forEach((testfile) => {
    write(`${testfile}${' '.repeat(maxLength + 1 - testfile.length)}`)
    processTestFile(`tests/${testfile}`)
  })
})

