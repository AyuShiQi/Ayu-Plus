import { parse, render } from '../packages/ayu-core/dist/ayu-core.esm-browser.js'
import { createApp } from '../packages/ayu-core/dist/ayu-core.esm-browser.js'
// const AST = parse(`
//   <div>你好</div>
//   <div>你好</div>
// `, document.querySelector('#app'))

// render.render(AST, document.querySelector('#app'))
import { ref } from '../packages/ayu-core/dist/ayu-core.esm-browser.js'

createApp({
  el: '#app',
  setup () {
    const a = ref(0)
    return {
      a
    }
  }
})
