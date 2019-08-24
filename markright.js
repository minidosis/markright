
// TODO: Añadir posición en lin:col a los errores!

const DEFAULT_CONTROL_CHARACTER = '@'
const DELIMITERS = "{}[]<>" // Tienen que estar por parejas!
const TAB_WIDTH = 2;

const openDelimiters = [...DELIMITERS].filter((_, i) => i % 2 == 0).join('')
const closeDelimFor = ch => DELIMITERS[DELIMITERS.indexOf(ch) + 1]

const error = msg => { throw new Error(msg) }

const allSpaces = str => str.match(/^\s*$/)

const parseIndentation = str => {
  let [_, space, line] = str.match(/^(\s*)(.*)$/)
  if (space.length % 2 == 1) {
    error(`Indentation is not a multiple of TAB_WIDTH (= ${TAB_WIDTH}): '${str}'`)
  }
  return { level: space.length / 2, line }
}

const getFullLineCommand = line => {
  const m = line.match(/^@([a-z]+)(\((.*)\))?$/)
  return m ? { id: m[1], args: m[3] } : null
}

class Parser {
  constructor(commandFuncs, controlChar = DEFAULT_CONTROL_CHARACTER) {
    this.commandFuncs = commandFuncs
    this.controlChar = controlChar
  }

  addToParent(x, level) {
    const parent = this.stack[level]
    if (parent.children === undefined) {
      parent.children = []
    }
    if (x === null && parent.children.length == 0) {
      return // Do not add null at the beginning
    }
    parent.children.push(x)
  }

  parseInlineCommand(text, i, closeDelim) {
    let cmd = { cmd: '', inline: true }
    const stopAt = " @()" + DELIMITERS
    while (i < text.length && stopAt.indexOf(text[i]) == -1) {
      cmd.cmd += text[i++]
    }
    if (text[i] == '(') {
      cmd.args = []
      let arg = ''
      while (text[++i] != ')') {
        if (i >= text.length) {
          error(`End of string while parsing args`)
        }
        if (text[i] == ',') {
          cmd.args.push(arg.trim())
          arg = ''
        } else {
          arg += text[i]
        }
      }
      cmd.args.push(arg.trim())
      i++
    }
    let end = i
    if (text.indexOf(closeDelim, i) != i && DELIMITERS.indexOf(text[i]) != -1) {
      const delimChar = text[i];
      if (openDelimiters.indexOf(delimChar) == -1) {
        error(`Delimiter '${delimChar}' not allowed`)
      }
      cmd.delim = { open: delimChar }
      i++
      while (text[i] == delimChar) {
        cmd.delim.open += text[i++]
      }
      cmd.delim.close = closeDelimFor(delimChar).repeat(cmd.delim.open.length)
      let result = this.parseLine(text.slice(i), cmd.delim.close)
      cmd.children = (Array.isArray(result.elems) ? result.elems : [result.elems])
      i += result.end
      if (text.indexOf(cmd.delim.close, i) != i) {
        error(`Close delimiter for '${cmd.delim.open}' not found`)
      }
      end = i + cmd.delim.close.length
    }
    return { cmd, end }
  }

  parseLine(text, closeDelim) {
    let elems = []
    let curr = ''
    let i = 0
    while (i < text.length) {
      if (text[i] == this.controlChar &&
        (text[i + 1] == this.controlChar || i == text.length - 1 || text.indexOf(closeDelim, i + 1) == i + 1)) {
        curr += this.controlChar
        i += 2
      }
      else if (text.indexOf(closeDelim, i) == i) {
        break
      }
      else if (text[i] == this.controlChar) {
        if (curr) elems.push(curr), curr = ''
        let { cmd, end } = this.parseInlineCommand(text, i + 1, closeDelim)
        elems.push(cmd)
        i = end
      }
      else {
        curr += text[i]
        i++
      }
    }
    if (curr) elems.push(curr)
    if (elems.length == 1) elems = elems[0]
    return { elems, end: i }
  }

  parseCommand(cmd, level) {
    const newobj = {
      cmd: cmd.id,
      args: (cmd.args ? cmd.args.split(',').map(x => x.trim()) : undefined)
    }
    if (level == this.stack.length - 1) {
      this.stack.push(newobj)
    } else {
      this.stack[level + 1] = newobj
      // this.stack.slice(level + 2)
    }
    return newobj
  }

  parse(input) {
    const lines = input.split('\n')
    this.stack = [{ children: [] }]
    let emptyLine = false
    for (let ln of lines) {
      if (allSpaces(ln)) {
        emptyLine = true
        continue
      }
      let { line, level } = parseIndentation(ln)
      const cmd = getFullLineCommand(line)
      if (level > this.stack.length - 1) {
        if (cmd) {
          error(`Indentation level too deep at: '${ln}'`)
        } else {
          // Accept text lines with excess indentation
          level = this.stack.length - 1
          line = ln.slice(2 * (this.stack.length - 1))
        }
      }
      let newobj = (cmd
        ? this.parseCommand(cmd, level)
        : this.parseLine(line).elems
      )
      if (emptyLine) this.addToParent(null, level)
      this.addToParent(newobj, level)
      emptyLine = false
    }
    return this.stack[0].children
  }
}

const _parser = new Parser();
const parse = str => {
  return _parser.parse(str)
}

class Walker {
  constructor() {
    this.stack = []
  }

  $invoke(fnName, x) {
    if (this[fnName]) {
      this[fnName](x)
      return true
    }
    return false
  }

  $in(...cmdNames) {
    let i = 0
    this.stack.forEach(c => {
      if (c == cmdNames[i]) i++
    })
    return i === cmdNames.length;
  }

  $line(elems) {
    elems.forEach(x => {
      if (x.cmd) {
        this.$invoke(x.cmd, x)
      } else {
        this.$invoke('$text', x)
      }
    })
  }

  $walkElem(x) {
    if (x === null) {
      this.$invoke('$null')
    }
    else if (x.cmd) {
      this.stack.push(x.cmd)
      if (!this.$invoke(x.cmd, x)) {
        this.$invoke('$command', x)
      }
      this.stack.pop()
    }
    else if (typeof x === 'string') {
      this.$invoke('$text', x)
    }
    else if (Array.isArray(x)) {
      this.stack.push('$line')
      this.$invoke('$line', x)
      this.stack.pop();
    }
  }

  $walk(mr) {
    if (mr) {
      if (Array.isArray(mr)) {
        mr.forEach(this.$walkElem.bind(this))
      } else {
        this.$walkElem(mr)
      }
    }
  }
}

class Stringifier extends Walker {
  constructor(output) {
    super()
    this.out = output
    this.level = 0
    this.beginl = true
    this.inline = []
  }

  $$endl() {
    if (!this.beginl) {
      this.out.write(`\n`)
      this.beginl = true
    }
  }

  $$inline() {
    return this.inline.length > 0 && 
           this.inline[this.inline.length-1]
  }
  $$pushInline(x) { this.inline.push(x) }
  $$popInline() { this.inline.pop() }

  $$break() {
    if (!(this.$in('$line') || this.$$inline())) {
      this.$$endl()
    }    
  }

  $$write(x) {
    if (this.beginl) {
      this.out.write(' '.repeat(this.level * 2))
    }
    this.out.write(x)
    this.beginl = false;
  }

  $null() {
    this.out.write('\n')
    this.beginl = true
  }

  $line(elems) {
    this.$walk(elems)
    this.$$break()
  }

  $text(text) {
    this.$$write(text)
    this.$$break()
  }

  $command(cmd) {
    const id = cmd.cmd;
    const args = (cmd.args ? `(${cmd.args.join(', ')})` : '')
    this.$$pushInline(cmd.inline)
    this.$$write('@' + id + args)
    if (this.$$inline() || this.$in('$line')) {
      if (cmd.children) {
        this.$$write(cmd.delim.open)
        this.$walk(cmd.children)
        this.$$write(cmd.delim.close)
      }
    }
    else {
      this.$$endl()
      if (cmd.children) {
        this.level++
        this.$walk(cmd.children)
        this.level--
      }
    }
    this.$$popInline()
    this.$$break()
  }
}

module.exports = {
  Parser,
  parse,
  Walker,
  Stringifier,
}
