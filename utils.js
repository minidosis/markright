
const assert = (expr, msg) => {
  if (!expr) {
    throw new Error(`assert failed: ${msg}`)
  }
}

const splitLines = (str) => {
  let lines = str.split('\n')
  if (str[str.length-1] === '\n') {
    lines = lines.slice(0, lines.length-1)
  }
  return lines
}

const allSpaces = line => line === ' '.repeat(line.length)
const emptyLine = line => line === '' || allSpaces(line)
const indentation = line => (emptyLine(line) ? 0 : [...line].findIndex(c => c !== ' '))

module.exports = {
  assert, splitLines, allSpaces, emptyLine, indentation
}