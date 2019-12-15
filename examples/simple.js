
const markright = require('../markright')

const mr = `
@title
  hi there
  blas blis

This is @em<normal> text, with a @a(http://pauek.info){Link@x@y<>zzz}
and more on the @b{next} line, @yay @yay2

@done{true}
`

const obj = markright.parse(mr.split('\n'))
console.log(markright.stringify(obj))