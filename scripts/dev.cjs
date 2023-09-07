const fs = require('fs')

import('execa').then(({ execa }) => {
  const dirs = fs.readdirSync('packages').filter(p => {
    // 该文件是否为文件夹
    return fs.statSync(`packages/${p}`).isDirectory() && (p === 'dom-complier' || p === 'ayu-core')
  })
  
  console.log(dirs)
  
  /**
   * 打包文件
   * @param {*} target 目标文件 
   */
  async function build (target) {
    // 执行rollup配置，第二个参数为环境变量,第三个配置（将子进程信息输出在父包）
    await execa('rollup', ['-c', '--environment', `TARGET:${target}`], { stdio: 'inherit' })
  }
  
  // 全部文件并行打包
  /**
   * 并行运行文件
   * @param {*} dirs 文件夹 
   * @param {*} itemfn 运行函数 
   */
  async function runParallel (dirs, itemfn) {
    const result = []
    for (const item of dirs) {
      result.push(itemfn(item))
    }
    return Promise.all(result)
  }
  
  runParallel(dirs, build).then(() => {
    console.log('打包成功')
  })
})