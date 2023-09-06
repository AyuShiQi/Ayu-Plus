import { parse } from '../packages/ayu-core/dist/ayu-core.esm-browser.js'

parse(`
  <div>你好</div>
  <div>你好</div>
`, document.querySelector('#app'))