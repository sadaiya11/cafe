const fs = require('fs')
const path = require('path')
const products = require('./products')

const storePath = path.join(__dirname, 'store.json')
const initial = { users: [], orders: [], products }

function readStore() {
  if (!fs.existsSync(storePath)) fs.writeFileSync(storePath, JSON.stringify(initial, null, 2))
  return JSON.parse(fs.readFileSync(storePath, 'utf8'))
}
function writeStore(store) { fs.writeFileSync(storePath, JSON.stringify(store, null, 2)) }
module.exports = { readStore, writeStore }
