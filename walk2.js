
const MR = require('./markright2')

const mrStr = `
a @a2@b(1) @c(x,y){zz} @d @e ji ji @@

@main( a  , b: 3, c, d, e)
  @title{{{Blas @b blas @c<}{>}}}
  @author(a, b, c){alsdjflaksjdf laksjfd lakjdsf sdfkjsdlkfj sldk jf}
  @something
    @title2{blasblas} @@
    This @is some @other text

je je @bla(1, 2, 3){as} ji ji
@bli[[xx]]
@zz{{{{45}}}}
@tt<<{}{}>>

Some more text outside
@title(1,2,3)
  jer@jer{1}jer@jer<2>]]
`
const lines = mrStr.split('\n')
const result = MR.parse(lines, {
  main: (args, body) => {
    const main = {}
    MR.parse(body, {
      'title': (_, body) => main.title = body,
      'author': (_, body) => main.author = body,
      'something': (_, body) => main.something = MR.parse(body)
    })
    return main
  },
  title: (args, body) => {
    return `title(${args.join(', ')})\n  ${body}`
  },
  bla: (args, body) => `BLA[${args.join(':')}]`,
  bli: (args, body) => `------------${body}-------------`
})

console.log(result)