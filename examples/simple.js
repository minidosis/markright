
const markright = require('../markright')

const mr = `
@title
  hi there
  blas blis

This is @em<normal> text, with a @a(http://pauek.info){Link@x@y<>zzz}
and more on the @b{next} line, @yay @yay2

@done{it is done}
`

const obj = markright.parse(mr, {
  em: (_, children) => new markright.Text(`**${children}**`),
  done: (_, children) => markright.parse(`@parsedDone\n  new stuff @newcmd{${children}} and more\n`),
  yay: (_, children) => new markright.Text(`YAY`)
})
console.log(markright.stringify(obj))