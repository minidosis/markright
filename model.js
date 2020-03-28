
class Item {
  addRaw(str) {
    if (this.rawChildren === undefined) {
      this.rawChildren = ''
    }
    this.rawChildren += str + '\n'
  }
  hasRawChildren() { return this.rawChildren !== undefined }
  add(str) { this.children = [...(this.children || []), str] }
  toJson() { throw new Error(`Item.toJson is abstract! (obj = ${JSON.stringify(this)})`) }
}

// TODO: Just use String...
class Text extends Item {
  constructor(text) {
    super()
    this.text = text
  }
  toJson() { return `"${this.text}"` }
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
  constructor(name, args, children) {
    super(name, args)
    if (children) this.children = children
  }
  toInlineCommand() {
    return new InlineCommand(this.name, this.args)
  }
}

class InlineCommand extends Command {
  constructor(name, args, rawChildren, delim) {
    super(name, args)
    if (rawChildren) this.rawChildren = rawChildren
    if (delim) this.delim = delim
  }
  toInlineCommand() { return this }
}

module.exports = {
  Item, Text, Block, Line, Command, BlockCommand, InlineCommand,
}