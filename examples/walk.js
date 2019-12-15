
const markright = require('../markright')

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

const report = x => () => console.log(x)

markright.parse(mrStr, {
  'main': (args, body) => {
    console.log('main')
    return markright.parse(body, {
      'c': report('c'),
      'author': report('author'),
      'something': report('something'),
      'title': (args, body) => {
        console.log('title(inner)')
        return markright.parse(body, {
          'c': report('c'),
          'b': report('b'),
        })
      }
    });
  },
  'title': report('title'),
  'jer': report('jer'),
})
