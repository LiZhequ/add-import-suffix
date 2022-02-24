#!/usr/bin/env node
const glob = require('glob')
const path = require('path')
const $ = require('gogocode')
const fs = require('fs')
const mri = require('mri')

const cwd = process.cwd()
const { pattern, aliasMap, suffixList } = resolveArgv()

glob(
  pattern,
  { cwd, ignore: 'node_modules/**', nodir: true },
  (err, filePaths) => {
    if (err) {
      console.error(err)
    } else {
      filePaths.forEach((filePath) => {
        try {
          processFile(filePath)
        } catch (e) {
          console.error(`process file ${filePath} error：`, e)
        }
      })
    }
  }
)

function resolveArgv() {
  const argv = process.argv.slice(2)
  const aliasMap = {}
  const {
    pattern = 'src/**/*.{vue,js}',
    alias = '@:src',
    suffix = '.vue',
  } = mri(argv)

  if (alias) {
    ;(Array.isArray(alias) ? alias : [alias]).forEach((item) => {
      const [key, value] = item.split(':')
      if (key && value) {
        aliasMap[key] = value
      }
    })
  }
  return {
    pattern,
    aliasMap,
    suffixList: Array.isArray(suffix) ? suffix : [suffix],
  }
}

function getAbsoluteImportPath(filePath, importPath) {
  let absoluteImportPath = ''
  for (const alias in aliasMap) {
    if (importPath.startsWith(alias + '/') || importPath === alias) {
      absoluteImportPath = path.join(
        path.resolve(cwd, aliasMap[alias]),
        importPath.replace(alias, '')
      )
      break
    }
  }

  return absoluteImportPath || path.resolve(path.dirname(filePath), importPath)
}

function getModifiedFilePath(originPath, absolutePath, suffix) {
  let modifiedFilePath = ''
  if (fs.existsSync(absolutePath + suffix)) {
    modifiedFilePath = originPath + suffix
  } else if (fs.existsSync(path.join(absolutePath, `index${suffix}`))) {
    modifiedFilePath = originPath + `/index${suffix}`
  }
  return modifiedFilePath
}

function processFile(filePath) {
  const ast =
    path.extname(filePath) === '.vue'
      ? $.loadFile(filePath, {
          parseOptions: {
            language: 'vue',
          },
        }).find('<script></script>')
      : $.loadFile(filePath)

  let flag = false

  const processAst = (codeTpl, importExpression = false) => {
    ast.find(codeTpl).each((item) => {
      const importPath = item.match[0][0].value

      for (const suffix of suffixList) {
        if (path.extname(importPath) !== suffix) {
          absoluteImportPath = getAbsoluteImportPath(filePath, importPath)
          const modifiedFilePath = getModifiedFilePath(
            importPath,
            absoluteImportPath,
            suffix
          )

          if (modifiedFilePath) {
            flag = true
            if (importExpression) {
              item.attr(
                'program.body.0.expression.arguments.0.value',
                modifiedFilePath
              )
            } else {
              item.attr('program.body.0.source.value', modifiedFilePath)
            }
            break
          }
        }
      }
    })
  }

  processAst(`import('$_$0')`, true)
  processAst(`import '$_$0'`)
  processAst(`import * as $_$1 from '$_$0'`)
  processAst(`import { $$$ } from '$_$0'`)
  processAst(`import $$$ from '$_$0'`)

  if (flag) {
    fs.writeFileSync(filePath, ast.root().generate())
    console.log(`process file ${filePath} successfully`)
  }
}
