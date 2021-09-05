# AdQuick Code Challenge

![adquickdemo](./assets/aq-demo.gif)

## Quickstart

1) install system requirements (homebrew):
```
brew --cask install docker
brew --cask install postbird (testing only)
```
2) install node packages
```
cd aq-challenge
npm install
```
3) start db and app
```
npm run clean (optional, only if db needs to be reset)
npm run pg
npm run start
```
> NOTE: first time might take a second because it will need to pull Postgres docker image if not present already locally

4) open app and have fun
```
open http://localhost:3030
```

## Requirements: 

### Billboard Voting
This challenge is to build a web app that allows users to vote on billboards.

Here's an outline of what your application should do:

- Your app should ingest this csv as seed data. It contains a list billboards with accompanying images.
- Users should be able to sign up & login (feel free to keep auth simple, we don't care to test your Devise installation skills).
- The user should see a list of billboards in rank order along with their photos, names, score, and a way to vote the billboard up or down.
- Voting should happen through ajax.
- After voting, the user should see a success message.
- Billboards should be ranked according to a basic time-decay algorithm
- The user should be able to change their vote. They should only be able to assign 1 vote per board.
- The app should look and feel good, as if it were made for real users. It should be responsive.
- We expect the challenge to take about 3 hours. If you get past about 3.5 hours, please commit what you have finished so far and submit it.
- The application should have a README that explains clearly how to set it up and run it. Do us a favor and make setup easy!
- Note: all code should be written with reasonable performance in mind.



## Technologies Used:

### Languages:
- JS
- HTML
- EJS
- CSS
- SQL

### Database
- Postgresql

### Packages:

#### Backend (NPM)
- csv-parser
- jsonwebtoken
- postgres
- express
- ejs
- axios
- envalid
- cookie-parser
- fs
- dotenv

#### Frontend (CSS/JS)
- bootstrap
- jquery
- shajs
- glightbox

### Meta (homebrew on MacOSX)
- Docker 
- postbird (for testing)


## Test

### Read/Modify CSV Data
csv data used in app is stored in `/tests/data.csv`
```
// simple read csv 
node ./tests/csv.js
```
