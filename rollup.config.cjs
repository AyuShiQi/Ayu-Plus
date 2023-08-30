// 通过rollup打包
const path = require('path')
const ts = require('rollup-plugin-typescript2')
const json = require('@rollup/plugin-json')
const reslovePlugin = require('@rollup/plugin-node-resolve') // 解析第三方插件

const packagesDir = path.resolve(__dirname, 'packages')

const packageDir = path.resolve(packagesDir, process.env.TARGET)

// console.log(packagesDir, packageDir, process.env.TARGET)
/**
 * 与当前打包目录作拼接
 * @param {*} p 相对路径
 * @returns 绝对路径
 */
const resolve = p => path.resolve(packageDir, p)

// 获取构建信息
const pkg = require(resolve(`package.json`))
const pkgOptions = pkg.buildOptions || {}
// console.log(pkgOptions)

// 打包包名
const name = path.basename(packageDir)

// 输出配置，解决不同模块化输出文件
const outputOptions = {
  "esm-bundler": {
    file: resolve(`dist/${name}.esm-bundler.js`),
    format: 'es'
  },
  "cjs": {
    file: resolve(`dist/${name}.cjs.js`),
    format: 'cjs'
  },
  "esm-browser": {
    file: resolve(`dist/${name}.esm-browser.js`),
    format: 'es'
  },
  "global": {
    file: resolve(`dist/${name}.global.js`),
    format: 'iife'
  }
}

function createConfig (format, output) {
  output.name = pkgOptions.name
  output.sourcemap = true
  // 导出rollup 配置
  return {
    input: resolve('src/index.ts'),
    output,
    plugins: [
      json(),
      ts({
        tsconfig: path.resolve(__dirname, 'tsconfig.json')
      }),
      reslovePlugin()
    ]
  }
}

exports.default = pkgOptions.formats.map(format => createConfig(format, outputOptions[format]))