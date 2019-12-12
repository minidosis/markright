
const fs = require('fs')

const assert = (expr, msg) => {
  if (!expr) {
    throw new Error(`assert failed: ${msg}`)
  }
}

const commandChar = '@'
const openDelimiters = '[{(<'
const closeDelimiters = ']})>'
const allDelimiters = `${commandChar} ${openDelimiters}${closeDelimiters}`

const matchingDelimiter = (delim) => {
  assert(delim[0].repeat(delim.length) === delim) // all the same char
  const pos = openDelimiters.indexOf(delim[0])
  assert(pos !== -1, `No matching delimiter for '${delim[0]}'`)
  return closeDelimiters[pos].repeat(delim.length)
}

const isOpenDelim = ch => openDelimiters.indexOf(ch) !== -1
const isDelimiter = ch => allDelimiters.indexOf(ch) !== -1

const allSpaces = line => line === ' '.repeat(line.length)
const emptyLine = line => line === '' || allSpaces(line)
const indentation = line => (emptyLine(line) ? 0 : [...line].findIndex(c => c !== ' '))

// Objects

class Item {
  addRaw(str) { this.rawChildren = [...(this.rawChildren || []), str] }
  hasRawChildren() { return Array.isArray(this.rawChildren) }
  add(str) { this.children = [...(this.children || []), str] }
  toJson() { throw new Error(`Item.toJson is abstract! (obj = ${JSON.stringify(this)})`) }
  toString() { throw new Error(`Item.toString is abstract! (obj = ${JSON.stringify(this)})`) }
}

class Text extends Item {
  constructor(text) {
    super()
    this.text = text
  }
  toJson() { return `"${this.text}"` }
  toString() { return this.text }
}

class _List extends Item {
  constructor(children) {
    super()
    if (children) this.children = children
  }
  toJson() {
    return `[${this.children ? this.children.map(x => x.toJson()).join(',') : ''}]`
  }
}

class Block extends _List { 
  toString() {
    return this.children.map(x => x.toString()).join('\n')
  }
}

class Line extends _List { // = List<InlineItem>
  add(item) { this.children = [...(this.children || []), item] }

  isSingle() { return this.children && this.children.length === 1 }
  isSingleCommand() { return this.isSingle() && this.children[0] instanceof Command }
  isSingleBlockCommand() { return this.isSingle() && this.children[0] instanceof BlockCommand }

  allCommandsToInlineCommands() {
    this.children = this.children.map(item => {
      return item instanceof Command ? item.toInlineCommand() : item
    })
  }

  executeAllCommands(execFunc) {
    if (this.children) {
      this.children = this.children.map(item => {
        return (item instanceof Command ? execFunc(item) : item)
      })
    }
  }
  toString() {
    return (this.children ? this.children.map(x => x.toString()).join('') : '')
  }
}

class Command extends Item {
  constructor(name, args) {
    super()
    if (name) this.name = name
    if (args) this.args = args
  }
  toJson() {
    let json = `{"cmd":"${this.name}"`
    if (this.args) json += `,"args":[${this.args.map(x => `"${x}"`).join(',')}]`
    if (this.delim) json += `,"delim":{"open":"${this.delim.open}","close":"${this.delim.close}"}`
    if (this.children) json += `,"children":${this.children.toJson()}`
    json += `}`
    return json
  }
}

class BlockCommand extends Command {
  toInlineCommand() {
    return new InlineCommand(this.name, this.args)
  }
  toString() {
    const toStringWithIndent = (item) => '  ' + item.toString()
    return `@${this.name}${this.args ? `(${this.args.join(',')})` : ''}\n` +
      (this.children ? this.children.toString() : '')
  }
}

class InlineCommand extends Command {
  constructor(name, args, rawChildren, delim) {
    super(name, args)
    if (rawChildren) this.rawChildren = rawChildren
    if (delim) this.delim = delim
  }
  toInlineCommand() { return this }
  toString() {
    let str = `@${this.name}${this.args ? `(${this.args.join(',')})` : ''}`
    if (this.delim) {
      str += `${this.delim.open}${this.children ? this.children.toString() : ''}${this.delim.close}`
    }
    return str
  }
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
      if (cmd instanceof InlineCommand) {
        assert(cmd.rawChildren.length === 1)
        assert(typeof cmd.rawChildren[0] === 'string')
        let item = this.parseLine(cmd.rawChildren[0], this.funcMap)
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
        assert(Array.isArray(cmd.rawChildren))
        assert(cmd.rawChildren.every(ln => typeof ln === 'string'))
        cmd.children = this.parse(cmd.rawChildren, this.funcMap)
      }
      else {
        assert(false, 'Not an InlineCommand or BlockCommand')
      }
      delete cmd.rawChildren // avoid reparsing
    }
    return cmd
  }

  execute(item) {
    const executeCommand = (cmd) => {
      const fn = this.funcMap && this.funcMap[cmd.name]
      if (fn === undefined) {
        if (this.recur) {
          // recursion implies that executing parses the rawChildren
          return this.parseRawChildren(cmd)
        }
        return cmd
      }
      if (typeof fn !== 'function') {
        throw new Error(`Command '${cmd.name}' is not a function`)
      }
      return fn(cmd.args, cmd.rawChildren)
    }

    switch (item.constructor) {
      case String:
        return item
      case Line:
        if (item.isSingleCommand()) {
          return executeCommand(item.children[0])
        }
        item.executeAllCommands(executeCommand)
        return item
      case InlineCommand:
      case BlockCommand:
        return executeCommand(item)
      default:
        throw new Error(`execute: unexpected object of type ${x.constructor}`)
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
        throw new Error(`Expected '${closeDelim}' in '${lineStr.slice(start)}'`)
      }
      i = end + width
      return {
        rawChild: [lineStr.slice(start, end)],
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
          line.add(new Text(acumText))
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
      line.add(new Text(acumText))
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

  parse(lines) {
    assert(lines, 'lines is null or undefined')
    assert(Array.isArray(lines), '"lines" must be an array')
    assert(lines.every(ln => typeof ln === 'string'), 'All lines are not strings')

    const itemList = []
    let blockCommand = null
    let pendingEmptyLine = false

    for (var line of lines) {
      if (emptyLine(line)) {
        // We don't know now where this empty line should go.
        // We will know when we see the indentation of the next line.
        if (pendingEmptyLine) {
          // But: to allow for empty lines at the end, we add any repeated empty
          //      lines at the end of the current command (only if there is already some content!)
          if (blockCommand !== null && blockCommand.hasRawChildren()) {
            blockCommand.addRaw('')
          } else {
            itemList.push(new Line())
          }
        }
        pendingEmptyLine = true
        continue
      }
      const ind = indentation(line)
      assert(ind % 2 == 0, 'Indentation must be an even number')
      if (ind > 0) {
        if (blockCommand === null) {
          itemList.push(this.parseLine(line))
        } else {
          if (pendingEmptyLine) {
            blockCommand.addRaw('')
            pendingEmptyLine = false
          }
          blockCommand.addRaw(line.slice(2))
        }
        continue
      }
      if (pendingEmptyLine) {
        itemList.push(new Line())
        pendingEmptyLine = false
      }
      // line does not start with a command
      if (line[0] !== commandChar) {
        blockCommand = null
        itemList.push(this.parseLine(line))
        continue
      }
      // line starts with a command
      blockCommand = null
      const item = this.parseLine(line)
      if (item instanceof BlockCommand) {
        blockCommand = item
      }
      itemList.push(item)
    }
    if (pendingEmptyLine) {
      itemList.push(new Line())
    }
    return new Block(itemList.map(this.execute))
  }
}

const parse = (lines, funcMap) => new Parser({ funcMap }).parse(lines)
const parseRecur = (lines, funcMap) => new Parser({ funcMap, recur: true }).parse(lines)

const _parseFile = parse => (filename, funcMap) => {
  const lines = fs.readFileSync(filename).toString().split('\n')
  return parse(lines, funcMap)
}

const parseFile = _parseFile(parse)
const parseFileRecur = _parseFile(parseRecur)

module.exports = {
  parse,
  parseRecur,
  parseFile,
  parseFileRecur,
  Item,
  Text,
  Line,
  Block,
  Command,
  BlockCommand,
  InlineCommand,
}
