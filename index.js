
// TODO: Permitir una directiva que cambie el CONTROL_CHARACTER
const CONTROL_CHARACTER = '@'

class Parser {
  constructor(input, commandFuncs) {
    this.input = input
    this.commandFuncs = commandFuncs
    this.pos = 0
    this.lin = this.col = 1
  }

  error(msg) { throw new Error(msg) }

  ok() { return this.pos < this.input.length }
  curr() { return this.input[this.pos] }
  at(str) { return this.input.slice(this.pos, this.pos + str.length) === str }

  notAtSpace() { return this.ok() && !/\s/.test(this.curr()) }

  next(n = 1) {
    for (let i = 0; i < n; i++) {
      if (!this.ok()) {
        return false
      }
      if (this.curr() == '\n') {
        this.lin++
        this.col = 1
      } else {
        this.col++
      }
      this.pos++
    }
  }

  expect(str) {
    if (!this.ok() || !this.at(str)) {
      this.error(`Expected '${str}'`);
    }
    this.next(str.length)
  }

  parseIdent() {
    let start = this.pos
    while (this.ok() && /[a-zA-Z0-9_]/.test(this.curr())) {
      this.next()
    }
    return this.input.slice(start, this.pos)
  }

  parseArgs() {
    this.expect('(')
    let start = this.pos
    let end = this.input.indexOf(')', start)
    if (end === -1) {
      this.error(`Parse error: missing closing parenthesis`)
    }
    let args = this.input.slice(start, end).split(',').map(x => x.trim()).filter(x => x.length > 0)
    this.pos = end
    this.expect(')')
    return args
  }

  parseOpenDelimiter() {
    const D = "{}[]<>"
    const opD = [...D].filter((_, i) => i % 2 == 0).join('')

    const isOpenDelim = ch => opD.indexOf(ch) !== -1
    const makeInverseDelim = str => [...str].reverse().map(x => D[D.indexOf(x) + 1]).join('')

    let delim = ''
    while (isOpenDelim(this.curr())) {
      delim += this.curr()
      this.next()
    }
    return (delim.length === 0 ? null : {
      open: delim,
      close: makeInverseDelim(delim),
    })
  }

  parseCommand() {
    this.expect(CONTROL_CHARACTER)
    let result = {}
    result.id = this.parseIdent()
    if (this.at('(')) {
      let args = this.parseArgs()
      if (args.length > 0) {
        result.args = args
      }
    }
    let delim = this.parseOpenDelimiter();
    if (delim) {
      let children = this.parse(delim.close)
      this.expect(delim.close)
      if (children.length > 0) {
        result.children = children
      }
    }
    return result
  }

  parse(closeDelim) {
    let result = []
    let text = '';
    let newline = false;

    const lastIsCommand = () => {
      const i = result.length - 1;
      return i >= 0 && result[i] !== null && typeof result[i] === 'object';
    }

    const addPendingText = () => {
      if (text.length > 0) {
        result.push(text)
      }
      text = '';
    }

    // TODO: Quitar líneas vacías del principio y del final

    while (this.ok()) {
      if (closeDelim && this.at(closeDelim)) {
        break
      }
      if (this.at(CONTROL_CHARACTER + CONTROL_CHARACTER)) {
        text += CONTROL_CHARACTER
        this.next(2)
      }
      else if (this.at(CONTROL_CHARACTER)) {
        addPendingText()
        let cmd = this.parseCommand()
        if (this.commandFuncs && cmd.id in this.commandFuncs) {
          cmd = this.commandFuncs[cmd.id](cmd)
        }
        result.push(cmd)
        newline = false
      }
      else if (this.at('\n')) {
        text += '\n'
        this.next()
        const allSpaces = /^\s*$/.test(text)
        if (allSpaces && newline) {
          result.push(null)
          text = ''
        } else {
          addPendingText()
        }
        newline = true;
        if (this.notAtSpace() && lastIsCommand()) {
          // Meter un espacio entre un comando a final de línea y el texto que le sigue
          text += ' '
        }
      } else {
        text += this.curr()
        this.next()
      }
    }
    addPendingText()
    return result
  }
}

const parse = (str, commandFuncs) => {
  try {
    const parser = new Parser(str, commandFuncs);
    return parser.parse()
  } catch (e) {
    console.log("Error parsing markright:", e)
    return { error: e }
  }
}

const walk = (markright, dispatcher) => {
  const invoke = (node, id, base) => {
    id = (id === '' ? '__empty__' : id)
    if (dispatcher.has(id)) {
      dispatcher.dispatch(id, node)
    } else if (dispatcher.has(base)) {
      dispatcher.dispatch(base, node)
    } else if ('__error__' in dispatcher) {
      dispatcher.dispatch('__error__', node)
    } else {
      throw new Error(`markright.walk: no dispatcher available for ${id}`)
    }
  }
  return markright.map(node => {
    if (typeof node === 'string') {
      invoke(node, '__text__')
    } else if (node === null) {
      invoke(node, '__null__')
    } else if (typeof node === 'object') {
      invoke(node, node.id, '__command__')
    } else {
      throw new Error(`markright.walk: Unrecognized type of node (${node})`)
    }
  })
}

class Generator {
  constructor() {
    this.stack = []
    this.pos = -1
    this.push()
  }

  has(id) { return id in this }

  dispatch(id, node) {
    this.top.calling = id;
    this[id](node)
  }

  get context() { return this.stack.map(frame => frame.calling) }
  in(ctx) { return this.context.filter(x => x === ctx).length > 0 }

  push() {
    this.stack.push({
      doc: '',
      paragraph: '',
      inline: true,
      calling: null,
    })
    this.pos++
  }

  pop() {
    let result
    if (this.top.inline) {
      result = this.top.paragraph
    } else {
      if (this.top.paragraph.length > 0) {
        this.top.doc += this.finishParagraph(this.top.paragraph)
      }
      result = this.top.doc
    }
    this.stack.pop()
    this.pos--
    return result
  }

  get top() { return this.stack[this.pos] }
  get paragraph() { return this.top.paragraph }
  get doc() { return this.top.doc }

  add(str) {
    this.top.paragraph += str
  }

  __text__(text) {
    this.add(text)
  }

  finishParagraph(paragraph) { return paragraph + '\n' }

  __null__() {
    this.top.inline = false
    if (this.top.paragraph) {
      // FIXME? 
      // We can redefine finishParagraph to process the paragraph in some 
      // way before adding it to the document...
      this.top.doc += this.finishParagraph(this.top.paragraph)
    }
    this.top.paragraph = ''
  }

  __command__(node) {
    this.add(`@error{Command "${node.id}" not found}`)
  }

  generate(markright) {
    this.push()
    walk(markright, this)
    return this.pop()
  }
}

module.exports = {
  parse,
  Generator,
}