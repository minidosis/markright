
const { assert, splitLines, allSpaces, emptyLine, indentation } = require('./utils')
const { Item, Text, Block, Line, Command, BlockCommand, InlineCommand } = require('./model')

// Delimiters

const commandChar = '@'
const openDelimiters = '[{(<'
const closeDelimiters = ']})>'
const allDelimiters = `${commandChar} ${openDelimiters}${closeDelimiters}`

const isOpenDelim = ch => openDelimiters.indexOf(ch) !== -1
const isDelimiter = ch => allDelimiters.indexOf(ch) !== -1

const matchingDelimiter = (delim) => {
  assert(delim[0].repeat(delim.length) === delim) // all the same char
  const pos = openDelimiters.indexOf(delim[0])
  assert(pos !== -1, `No matching delimiter for '${delim[0]}'`)
  return closeDelimiters[pos].repeat(delim.length)
}

// Parser

class Parser {
  constructor({ recur, funcMap }) {
    this.funcMap = funcMap
    this.recur = (recur ? true : false)
    this.execute = this.execute.bind(this)
    this.parseRawChildren = this.parseRawChildren.bind(this)
  }

  parseRawChildren(cmd) {
    if (cmd.hasRawChildren()) {
      const rawChildren = cmd.rawChildren
      if (cmd instanceof InlineCommand) {
        assert(typeof rawChildren === 'string')
        let item = this.parseLine(rawChildren, this.funcMap)
        if (item instanceof Line) {
          item.children = item.children.map(x => {
            return x instanceof Command ? this.parseRawChildren(x) : x
          })
          if (item.children.length === 1) {
            item = item.children[0]
          }
        }
        cmd.children = item
      }
      else if (cmd instanceof BlockCommand) {
        assert(typeof rawChildren === 'string')
        cmd.children = this.parse(rawChildren, this.funcMap)
      }
      else {
        assert(false, 'Not an InlineCommand or BlockCommand')
      }
      delete cmd.rawChildren // avoid reparsing
    }
    return cmd
  }

  getFunc(name) {
    const fn = this.funcMap && this.funcMap[name]
    if (fn === undefined) {
      return
    }
    if (typeof fn !== 'function') {
      throw new Error(`Command '${name}': not a function`)
    }
    return fn.bind(this.funcMap)
  }

  execute(item) {
    const executeCommand = (cmd) => {
      let fn = this.getFunc(cmd.name)
      if (fn === undefined) {
        fn = this.getFunc('__command__')
      }
      if (fn) {
        return fn(cmd)
      }
      // recursion implies that executing parses the rawChildren
      return (this.recur ? this.parseRawChildren(cmd) : cmd)
    }

    const executeText = (text) => {
      const fn = this.getFunc('__text__')
      return (fn ? fn(text) : text)
    }

    const executeLine = (line) => {
      if (line.isSingleCommand()) {
        return executeCommand(line.children[0])
      }
      line.executeAllCommands(executeCommand)
      const fn = this.getFunc('__line__')
      return (fn ? fn(line) : line)
    }

    const executeBlock = (block) => {
      const fn = this.getFunc('__block__')
      return (fn ? fn(block) : block)
    }

    switch (item.constructor) {
      case Text:
        return executeText(item)
      case Line:
        return executeLine(item)
      case Block:
        return executeBlock(item)
      case InlineCommand:
      case BlockCommand:
        return executeCommand(item)
      default:
        throw new Error(`execute: unexpected object of type ${item.constructor}`)
    }
  }

  parseLine(lineStr) {

    const parseName = () => {
      let name = '';
      while (i < lineStr.length && !isDelimiter(lineStr[i])) {
        name += lineStr[i]
        i++
      }
      return name
    }

    const parseArgs = () => {
      if (lineStr[i] === '(') {
        i++
        let args = [], curr = ''
        while (i < lineStr.length) {
          if (lineStr[i] === ')') {
            args.push(curr.trim())
            i++
            break;
          } else if (lineStr[i] === ',') {
            args.push(curr.trim())
            curr = ''
          } else {
            curr += lineStr[i]
          }
          i++
        }
        return args
      }
    }

    const parseChild = () => {
      const openCh = lineStr[i]
      let width = 0
      if (!isOpenDelim(openCh)) {
        return {}
      }
      while (lineStr[i] === openCh) {
        width++
        i++
      }
      const start = i
      const openDelim = openCh.repeat(width)
      const closeDelim = matchingDelimiter(openDelim)
      let end = lineStr.indexOf(closeDelim, start)
      if (end === -1) {
        throw new Error(`Parsing line "${lineStr}":\nExpected '${closeDelim}' in '${lineStr.slice(start)}'`)
      }
      i = end + width
      return {
        rawChild: lineStr.slice(start, end),
        delim: {
          open: openDelim,
          close: closeDelim,
        },
      }
    }

    let i = 0
    let line = new Line()
    let acumText = ''
    while (i < lineStr.length) {
      if (lineStr.slice(i, i + 2) == commandChar.repeat(2)) {
        acumText += commandChar
        i += 2
      } else if (lineStr[i] !== commandChar) {
        acumText += lineStr[i]
        i++
      } else {
        i++
        if (acumText) {
          line.add(this.execute(new Text(acumText)))
          acumText = ''
        }
        const name = parseName()
        const args = parseArgs()
        const { rawChild, delim } = parseChild()
        if (rawChild) {
          line.add(new InlineCommand(name, args, rawChild, delim))
        } else {
          // We don't know yet if this is a block command or not, in fact.
          line.add(new BlockCommand(name, args))
        }
      }
    }
    if (!allSpaces(acumText)) {
      line.add(this.execute(new Text(acumText)))
    }
    // If we have a single command without children, return a BlockCommand
    if (line.isSingleBlockCommand()) {
      return line.children[0]
    } else {
      // Now we know that any BlockCommands are really InlineCommands
      line.allCommandsToInlineCommands()
      return line
    }
  }

  parse(str) {
    if (str === null || str === undefined) {
      throw new Error(`The text to parse is ${str}`)
    }
    if (typeof str !== 'string') {
      throw new Error(`The first argument of 'parse' must be a string (its ${JSON.stringify(str)})`)
    }
    const isBlock = str.indexOf('\n') !== -1
    const lines = splitLines(str)

    const itemList = []
    let blockCommand = null
    let pendingEmptyLine = false

    const push = (item) => itemList.push(this.execute(item))
    const pushEmptyLine = () => push(new Line())

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (emptyLine(line)) {
        // We don't know now where this empty line should go.
        // We will know when we see the indentation of the next line.
        if (pendingEmptyLine) {
          // But: to allow for empty lines at the end, we add any repeated empty
          //      lines at the end of the current command (only if there is already some content!)
          if (blockCommand !== null && blockCommand.hasRawChildren()) {
            blockCommand.addRaw('')
          } else {
            if (blockCommand) {
              push(blockCommand)
              blockCommand = null
            }
            pushEmptyLine()
          }
        }
        pendingEmptyLine = true
        continue
      }
      const ind = indentation(line)
      assert(ind % 2 == 0, `${i}: Indentation must be an even number`)
      if (ind > 0) {
        if (blockCommand === null) {
          push(this.parseLine(line))
        } else {
          if (pendingEmptyLine) {
            blockCommand.addRaw('')
            pendingEmptyLine = false
          }
          blockCommand.addRaw(line.slice(2))
        }
        continue
      }
      if (blockCommand) {
        push(blockCommand)
        blockCommand = null
      }
      if (pendingEmptyLine) {
        pushEmptyLine()
        pendingEmptyLine = false
      }
      // line does not start with a command
      if (line[0] !== commandChar) {
        blockCommand = null
        push(this.parseLine(line))
        continue
      }
      // line starts with a command
      if (blockCommand) {
        push(blockCommand)
        blockCommand = null
      }
      const item = this.parseLine(line)
      if (item instanceof BlockCommand) {
        blockCommand = item
      } else {
        push(item)
      }
    }
    if (blockCommand) {
      push(blockCommand)
    }
    if (pendingEmptyLine) {
      pushEmptyLine()
    }
    if (isBlock) {
      return this.execute(new Block(itemList))
    } else {
      if (itemList.length !== 1) {
        throw new Error('itemList should have one item')
      }
      return itemList[0]
    }
  }
}

const parse = (lines, funcMap) => new Parser({ funcMap }).parse(lines)
const parseRecur = (lines, funcMap) => new Parser({ funcMap, recur: true }).parse(lines)

const { stringify } = require('./stringify')

module.exports = {
  parse,
  parseRecur,
  stringify,
  Item,
  Text,
  Line,
  Block,
  Command,
  BlockCommand,
  InlineCommand,
}
