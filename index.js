require('dotenv').config()
const envalid = require('envalid')
const { str, port, bool } = envalid
const env = envalid.cleanEnv(process.env, {
  LISTEN_PORT: port(),
})
const express = require('express')
const axios = require('axios')
const cookieParser = require('cookie-parser')
const fs = require('fs')

// express config
const app = express()
app.set('view engine', 'ejs')
app.use(cookieParser())
app.use(express.urlencoded())
app.use(express.json())
app.use(express.static('pages'))
app.use(express.static('assets'))


app.get('/', async (req, res) => {
  res.render('home')
})

const start = async () => {
  try {
    app.listen(env.LISTEN_PORT)
    console.log('app is running on', env.LISTEN_PORT)
  } catch (e) {
  }
}

start()
