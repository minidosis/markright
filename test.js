
const fs = require('fs')
const MR = require('./markright')
const colors = require('colors');

const write = (...args) => process.stdout.write(...args)

const print = (x) => {
  switch (x.constructor) {
    case MR.Text:
      return `${x.text}`
    case MR.Block:
      return `Block(${x.children.map(print).join('')})`
    case MR.Line:
      return `Line(${x.children ? x.children.map(print).join('') : ''})`
    case MR.BlockCommand: {
      let result = `@${x.name}`
      if (x.args) result += `(${x.args.join(',')})`
      if (x.children) {
        result += `:${print(x.children)}`
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
      throw new Error(`Unexpected object of type -- ${x.constructor}`)
  }
}

const report = (title, input, fn) => {
  try {
    const { actual, expected } = fn()
    if (actual !== expected) {
      write('x')
      return [
        `Test "${title}" failed:\n${colors.brightYellow(input.join('\n'))}`,
        `${colors.green(`"${expected}"`)}`,
        `${colors.red(`"${actual}"`)}`,
        ``,
      ]
    } else {
      write('.')
    }
  } catch (e) {
    write('x')
    return [`Test "${title}" failed with exception:`, e.toString(), ``]
  }
}

const parseTest = (input, output) => ({
  actual: print(MR.parseRecur(input)),
  expected: output.join('\n'),
})

const jsonTest = (input, output) => ({
  actual: MR.parseRecur(input).toJson(),
  expected: output.join('\n'),
})

const testParser = (testFunc, errors) => (args, rawChildren) => {
  const testName = (args && args[0]) || ''
  let input, output;
  MR.parse(rawChildren, {
    'input': (_, rawChildren) => input = rawChildren,
    'output': (_, rawChildren) => output = rawChildren,
  })
  if (!input || !output) {
    throw new Error(`Error in test "${testName}": Input or output is empty!`)
  }
  const errs = report(testName, input, () => testFunc(input, output))
  if (errs) errors.push(...errs)
}

const runTest = (testfile) => {
  let errors = []
  MR.parseFile(testfile, {
    'parse-test': testParser(parseTest, errors),
    'json-test': testParser(jsonTest, errors),
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
    runTest(`tests/${testfile}`)
  })
})

