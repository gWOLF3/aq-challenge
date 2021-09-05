require('dotenv').config()
const envalid = require('envalid')
const { str, port, bool } = envalid
const env = envalid.cleanEnv(process.env, {
  LISTEN_PORT: port(),
  CSV_PATH: str(),
  PGDATABASE: str(),
  PGHOST: str(),
  PGPORT: port(),
  PGUSER: str(),
  PGPASSWORD: str(),
  JWT_PRIVATE_KEY: str(),
})
var jwt = require('jsonwebtoken')
const express = require('express')
const axios = require('axios')
const cookieParser = require('cookie-parser')
const csv = require('csv-parser')
const fs = require('fs')
const postgres = require('postgres')

// express config
const app = express()
app.set('view engine', 'ejs')
app.use(cookieParser())
app.use(express.urlencoded())
app.use(express.json())
app.use(express.static('pages'))
app.use(express.static('assets'))


// database stuff
const sql = postgres(
  `postgres://${env.PGUSER}:${env.PGPASSWORD}@${env.PGHOST}:${env.PGPORT}/${env.PGDATABASE}`
)

const preparePGDB = async () => {
  await sql`
  CREATE TABLE IF NOT EXISTS users (
    userid SERIAL PRIMARY KEY, 
    email VARCHAR (255) UNIQUE NOT NULL, 
    password VARCHAR (64) NOT NULL,
    alias VARCHAR (40)
  )`

  await sql`
  CREATE TABLE IF NOT EXISTS boards (
    url VARCHAR (500) UNIQUE NOT NULL, 
    name VARCHAR (255) UNIQUE NOT NULL,
    total SMALLINT DEFAULT 0 NOT NULL
  )
  `

  await sql`
  CREATE TABLE IF NOT EXISTS votes (
    board VARCHAR (40) NOT NULL, 
    userid SERIAL NOT NULL,
    vote SMALLINT NOT NULL,
    UNIQUE (userid, board),
    FOREIGN KEY (userid) REFERENCES users(userid),
    FOREIGN KEY (board) REFERENCES boards(name)
  )
  `
  
}

// init csv data entry
const migrateData = async () => {
  await fs
    .createReadStream(env.CSV_PATH)
    .pipe(csv())
    .on('data', function (data) {
      try {
        if (data.image && data.name) {
          console.log('writing csv data:', data)
          sql`
            INSERT INTO boards (url, name)
            VALUES(${data.image}, ${data.name})
            `
        } else throw { issue: 'not enough data' }
      } catch (e) {
        console.error('trouble migrating csv item:', e)
      }
    })
    .on('end', function () {})
}



// db helpers
const registerUser = async (u) => {
  const [user] = await sql`
    INSERT INTO users (
      email,
      alias,
      password      
    ) VALUES (
      ${u.email},
      ${u.alias},
      ${u.password}
    )
  `
  return user
}
const loadInfo = async (email) => {
  const [user] = await sql`SELECT * FROM users WHERE email=${email}`
  return user
}
const loadBoards = async (u) => {
  const boards = await sql`SELECT name, url, total FROM boards`
  for (board of boards) {
    board.myvote = 0
    let count = 0
    if (board.name) {
      const votes = await sql`
          SELECT * FROM votes WHERE board=${board.name}
        `
      for (n of votes) {
        count += n.vote
        if (u && n.userid == u.userid) {
          board.myvote = n.vote
        }
      }
      board.total = count
    }
  }
  //simple order sort
  boards.sort((a,b) => (a.total < b.total) ? 1 : -1)
  console.log('sorted boards', boards)
  return boards
}

// logout of account and expire the login cookie
app.get('/logout', (req, res) => {
  let o = {}
  res.cookie('jwt', 'null', { expire: Date.now() })
  res.redirect('../')
})

// login to account (receive cookie)
app.post('/login', async (req, res) => {
  let o = {}
  const email = req.body.email
  let userInfo
  try {
    userInfo = await loadInfo(email)
    if (userInfo.password === req.body.password) {
      const yourjwt = jwt.sign(
        {
          user_email: req.body.email,
        },
        env.JWT_PRIVATE_KEY,
        {
          expiresIn: 600000,
        }
      )
      res
        .cookie('jwt', yourjwt, {
          maxAge: 600000,
        })
        .redirect('../')
    } else {
      o.error = 'password invalid'
      res.status(420).render('login', o)
    }
  } catch (e) {
    console.error(`problem loading info for ${email}`, e)
    o.error = 'user not found'
    res.status(666).render('login', o)
  }
})

// vote
app.post('/vote', async (req, res) => {
  let o = {}
  if (req.cookies && req.cookies.jwt && req.cookies.jwt !== 'null') {
    try {
      const decodedJWT = await jwt.verify(req.cookies.jwt, env.JWT_PRIVATE_KEY)
      const info = await loadInfo(decodedJWT.user_email)
      if (req.body && req.body.board && req.body.vote) {
        try {
          const votes = await sql`
              INSERT INTO votes (userid, vote, board)
              VALUES(${info.userid}, ${req.body.vote}, ${req.body.board}) 
              ON CONFLICT (userid, board)
              DO UPDATE SET vote = EXCLUDED.vote;
            `
        } catch (e) {
          console.error('issue while voting', e)
        }
      }
    } catch (e) {
      console.error('issue while loading user info from jwt', e)
      o.error = 'session expired. please relogin.'
    }
  } else {
    console.log('request object', req.url)
  }
})

// create new account
app.post('/register', async (req, res) => {
  let o = {}
  const user = {
    email: req.body.email,
    password: req.body.password,
    alias: req.body.alias,
  }
  try {
    await registerUser(user)
    const yourjwt = jwt.sign(
      {
        user_email: req.body.email,
      },
      env.JWT_PRIVATE_KEY,
      {
        expiresIn: 600000,
      }
    )
    res.cookie('jwt', yourjwt, {
      maxAge: 600000,
    })
    res.status(200).redirect('../')
  } catch (e) {
    console.error(`problem registering user ${user.email}`, e)
  }
})

// get home page
app.get('/', async (req, res) => {
  let o = {}
  if (req.cookies && req.cookies.jwt && req.cookies.jwt !== 'null') {
    try {
      // verify that we signed the JWT
      const decodedJWT = await jwt.verify(req.cookies.jwt, env.JWT_PRIVATE_KEY)
      console.log('decoded JWT', decodedJWT)
      const r = await loadInfo(decodedJWT.user_email)
      console.log('loaded user info', r)
      o.boards = await loadBoards(r)
      console.log('loaded user board info', o.boards)
      o.email = decodedJWT.user_email
      o.alias = r.alias
      res.render('home', o)
    } catch (e) {
      console.log('issue while loading user info from jwt', e)
      o.error = 'session expired. please relogin.'
      res.render('login', o)
    }
  } else {
    // no valid JWT, redirect to login
    res.render('login', o)
  }
})

// login
app.get('/login', async (req, res) => {
  let o = {}
  if (req.cookies && req.cookies.jwt && req.cookies.jwt !== 'invalid') {
    try {
      const decodedJWT = await jwt.verify(req.cookies.jwt, env.JWT_PRIVATE_KEY)
      const r = await loadInfo(decodedJWT.user_email)
      res.redirect('../')
    } catch (e) {
      o.error = 'session expired. please relogin.'
      res.render('login', o)
    }
  } else {
    // redirect to login
    res.render('login', o)
  }
})

const start = async () => {
  try {
    await preparePGDB()
    await migrateData()
    app.listen(env.LISTEN_PORT)
    console.log('app is running on', env.LISTEN_PORT)
  } catch (e) {
    console.error('bubbled error', e)
    process.exit(420)
  }
}

start()
