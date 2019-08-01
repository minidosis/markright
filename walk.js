
const markright = require('./markright')

const mrStr = `
@main
  @title{{{Blas @b blas @c<}{>}}}
  @author(a, b, c){alsdjflaksjdf laksjfd lakjdsf sdfkjsdlkfj sldk jf}
  @something
    @title2{blasblas}
    This @is some @other text

Some more text outside
@title(1,2,3){jer@jer{1}jer@jer<2>]]}
`

const mr = markright.parse(mrStr)

class Walker extends markright.Walker {
  $null()     { console.log('null') }
  $text(text) { console.log(text) }

  $line(elems) {
    console.log('$line', elems)
    this.$walk(elems)
  }

  $command(x) {
    console.log('command', x)
  }

  main({ children }) {
    console.log('main')
    this.$walk(children)
  }

  author({ args, children }) {
    console.log('author', args)
    this.$walk(children)
  }

  title({ children }) {
    console.log('STACK', this.stack)
    if (this.$in('main', 'author')) {
      console.log('[main author] title')
    } else if (this.$in('main')) {
      console.log('[main] title')
    } else {
      console.log('title')
    }
  }
}


// const w = new Walker()
// w.$walk(mr)

const s = new markright.Stringifier(process.stdout)
s.$walk(mr)
