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
    const a = ref(1)
    const value = ref('')

    function handleClick () {
      console.log('ok')
      a.value = a.value + 1
    }

    function handleClick2 () {
      value.value = 'Nihaoya'
    }

    return {
      a,
      value,
      handleClick,
      handleClick2
    }
  }
})
