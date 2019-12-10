
const fs = require('fs')

const assert = (expr, msg) => {
  if (!expr) {
    throw new Error(`assert failed: ${msg}`)
  }
}

const commandChar = '@'
const openDelimiters = '[{(<'
const closeDelimiters = ']})>'

const matchingDelimiter = (ch) => {
  const pos = openDelimiters.indexOf(ch)
  assert(pos !== -1, `No matching delimiter for '${ch}'`)
  return closeDelimiters[pos]
}

class Command {
  push(x) {
    if (this.body === undefined) {
      this.body = []
    }
    this.body.push(x)
  }
}

const allSpaces = line => {
  try {
    for (let i = 0; i < line.length; i++) {
      if (line[i] !== ' ') return false;
    }
  }
  catch (e) {
    console.log('catch!')
  }
  return true;
}

const emptyLine = line => line === '' || allSpaces(line)

const isOpenDelim = ch => openDelimiters.indexOf(ch) !== -1
const isCloseDelim = ch => closeDelimiters.indexOf(ch) !== -1
const isDelimiter = ch => ch === commandChar || ch === ' ' || isOpenDelim(ch) || isCloseDelim(ch)

const indentation = line => {
  let i = 0
  while (i < line.length && line[i] === ' ') {
    i++;
  }
  return i;
}

const parseLine = (line) => {

  const parseName = () => {
    let name = '';
    while (i < line.length && !isDelimiter(line[i])) {
      name += line[i]
      i++
    }
    return name
  }

  const parseArgs = () => {
    if (line[i] === '(') {
      i++
      args = []
      let curr = ''
      while (i < line.length) {
        if (line[i] === ')') {
          args.push(curr.trim())
          i++
          break;
        } else if (line[i] === ',') {
          args.push(curr.trim())
          curr = ''
        } else {
          curr += line[i]
        }
        i++
      }
      return args
    }
  }

  const parseBody = () => {
    const openCh = line[i]
    let width = 0
    if (!isOpenDelim(openCh)) {
      return {}
    }
    while (line[i] === openCh) {
      width++
      i++
    }
    const start = i
    const closeDelimStr = matchingDelimiter(openCh).repeat(width)
    let end = line.indexOf(closeDelimStr, start)
    if (end === -1) {
      throw new Error(`Expected '${closeDelimStr}`)
    }
    i = end + width
    return {
      body: line.slice(start, end),
      delim: openCh.repeat(width),
    }
  }

  let i = 0
  let result = []
  let text = ''
  while (i < line.length) {
    if (line[i] !== commandChar) {
      text += line[i]
      i++
    } else {
      i++
      if (line[i] === commandChar) {
        text += commandChar
        i++
      } else {
        if (text) {
          result.push(text)
          text = ''
        }
        const cmd = new Command()
        let name = parseName()
        let args = parseArgs()
        let { body, delim } = parseBody()
        if (name) cmd.name = name
        if (args) cmd.args = args
        if (body) {
          cmd.body = body
          cmd.delim = delim
        }
        result.push(cmd)
      }
    }
  }
  if (!allSpaces(text)) {
    result.push(text)
  }
  return result
}

const parse = (lines, funcMap) => {
  const result = []
  let command = null
  let pendingEmptyLine = false

  const execIfCommand = item => {
    let cmd = item
    if (Array.isArray(item) && item.length === 1) {
      cmd = item[0]
    }
    if (cmd !== null && cmd.constructor === Command) {
      const fn = funcMap && funcMap[cmd.name]
      if (fn !== undefined) {
        if (typeof fn !== 'function') {
          throw new Error(`Command '${cmd.name}' is not a function`)
        }
        return fn(cmd.args, cmd.body)
      } else {
        // If there is no registered command, we parse recursively...
        if (cmd.body) {
          switch (cmd.body.constructor) {
            case Array:
              cmd.body = parse(cmd.body, funcMap)
              break;
            case String:
              cmd.body = parseLine(cmd.body, funcMap)
              break;
          }
        }
        return cmd
      }
    }
    return item;
  }

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i]
    if (emptyLine(line)) {
      // We don't know now where this empty line should go.
      // We will know it when we see the indentation in the next line.
      pendingEmptyLine = true
      continue
    }
    const indent = indentation(line)
    if (indent > 0) {
      if (command === null) {
        result.push(parseLine(line).map(execIfCommand))
        // throw Error(`${i}:${indent}: wrong indentation`)
      } else {
        if (pendingEmptyLine) {
          command.push([])
          pendingEmptyLine = false
        }
        command.push(line.slice(2))
      }
      continue
    }
    if (pendingEmptyLine) {
      result.push([])
      pendingEmptyLine = false
    }
    if (line[0] !== commandChar) {
      command = null
      result.push(parseLine(line).map(execIfCommand))
      continue
    }
    command = null
    const items = parseLine(line)
    if (items.length === 1) {
      if (items[0].body === undefined) {
        command = items[0]
      }
      result.push(items)
    } else {
      result.push(items.map(execIfCommand))
    }
  }
  return result.map(execIfCommand)
}

const parseFile = (filename, funcMap) => {
  const lines = fs.readFileSync(filename).toString().split('\n')
  return parse(lines, funcMap)
}

module.exports = {
  parse,
  parseLine,
  parseFile,
  Command
}