
const { parse } = require('../markright')

const splitLines = (str) => {
  if (typeof str !== 'string') {
    throw new Error(`splitLines splits strings: received ${JSON.stringify(str)}`)
  }
  let lines = str.split('\n')
  if (str[str.length-1] === '\n') {
    lines = lines.slice(0, lines.length-1)
  }
  return lines
}

const escape = (text) => {
  let result = ''
  for (let i = 0; i < text.length; i++) {
    switch (text[i]) {
      case '<': result += '&lt;'; break;
      case '>': result += '&gt;'; break;
      default: result += text[i]; break;
    }
  }
  return result
}

class HtmlFuncMap {

  minidosis = (args, children) => `<a href="${"id/" + args[0]}">${parse(children, this)}</a>`

  a = (args, children) => `<a href="${args[0]}">${parse(children, this)}</a>`

  _direct = tag => (_, children) => `<${tag}>${parse(children, this)}</${tag}>`

  b = this._direct('b')
  em = this._direct('em')
  h2 = this._direct('h2')

  olist = (_, rawChildren) => {
    let html = `<div class="enumerate">`
    let num = 1
    const children = splitLines(rawChildren)
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (child) {
        html += `<div class="item">
          <span class="num">${num}</span>
          <div class="content">${parse(child, this)}</div>
        </div>`
        num++
      }
    }
    html += `</div>`
    return html
  }

  ulist = (_, rawChildren) => {
    let html = `<div class="itemize">`
    const children = splitLines(rawChildren)
    for (let i = 0; i < children.length; i++) {
      child = children[i]
      if (child && typeof child === "object" && child.id == "row") {
        html += `<div class="item">
          <span class="bullet">&bull;</span>
          <div class="content">${parse(children, this)}</div>
        </div>`
      }
    }
    html += `</div>`
    return html
  }

  pre = (args, rawChildren) => {
    let [lang, _class] = args ? args : [];
    let html = ''
    html += `<div class="pre ${_class ? _class : ""}">`
    html += `<pre><code class="language-${lang}">`
    html += parse(rawChildren, {
      ...this,
      __block__: (children) => children,
      __text__: (text) => escape(text)
    })
    html += `</code></pre></div>`
    return html
  }

  code = (_, children) => `<span class="code">${parse(children, this)}</span>`
  img = (_, children) => `<img src="asset/${children}" />`

  box = (_, children) => `<span class="box">${parse(children, this)}</span>`

  header = (_, rawChildren) => {
    const children = splitLines(rawChildren)
    let html = `<thead><tr>`
    children.forEach(ch => {
      html += `<th>${ch.children[0]}</th>`
    })
    html += `</tr></thead>`
    return html
  }

  row = (_, children) => {
    let html = `<tr>`
    html += parse(children, {
      ...this,
      __block__: (children) => children,
      __line__: (children) => `<td>${children.join('')}</td>`,
    })
    html += `</tr>`
    return html
  }

  footnote = (args, children) => {
    const footnum = `<span class="footnote">${args[0]}</span>`
    if (children) {
      return `<div class="footnote">${footnum}${parse(children, this)}</div>`
    } else {
      return footnum
    }
  }

  table = (args, children) => {
    let align;
    if (args && args[0] === "left") {
      align = "left"
    }
    let html = `<div class="table">\n`
    html += `<table ${align ? `style="text-align: ${align}"` : ``}>`
    html += parse(children, this)
    html += `</table>\n</div>`
    return html
  }

  __text__ = (text) => text
  __line__ = (children) => children ? children.join('') : ''
  __block__ = (children) => children ? children.map(x => x ? `<p>${x}</p>` : '').join('\n'): ''

  __command__ = (cmd) => `<span class="error">Cmd <code>"${cmd.name}"</code> not found</span>`
}

const genHtml = (str) => parse(str, new HtmlFuncMap())

const html = genHtml(`
@h2{Que tal}

This is a @em{link} to @a(http://google.com){Google}

@pre(dart)
  que
  tal

@table(left)
  @row
    a b c @b{xxx}
  @row
    c d e

@olist
  a
  b
  c

`)

console.log(html)
