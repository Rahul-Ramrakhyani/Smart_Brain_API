const express = require('express');
const bodyParser= require('body-parser');
const bcrypt = require('bcrypt-nodejs');
const cors = require('cors');
const knex = require('knex');
const image = require('./controllers/image');

const db = knex({
	client: 'pg',
	connection: {
	host : '127.0.0.1',
	user : 'postgres',
	password : 'test',
	database : 'smart-brain'
  }
});

const app = express();

app.use(cors());
app.use(bodyParser.json());

app.get('/', (req, res)=> { res.send('it is working!') })

app.post('/signin', (req, res)=>{
	const { email, password } = req.body;
	if (!email || !password){
	return res.status(400).json('incorrect form submission');
	}
	db.select('email', 'hash').from('login')
	.where('email', '=', email)
	.then(data => {
		const isValid = bcrypt.compareSync(password, data[0].hash);
		if(isValid) {
		return db.select('*').from('users')
		.where('email', '=', email)
		.then(user =>{
		 res.json(user[0])
		})
		.catch(err => res.status(400).json('unable to get user'))
		}else{
		res.status(400).json('wrong credentials')
		}
	})
	.catch(err => res.status(400).json('wrong credentials'))
})

app.post('/register', (req, res)=> {
	const{email, password, name} =req.body;
	if (!email || !name || !password){
	return res.status(400).json('incorrect form submission');
	}
	var hash = bcrypt.hashSync(password);
	db.transaction(trx =>{
		trx.insert({
			hash: hash,
			email: email
		})
	.into('login')
	.returning('email')
	.then(loginEmail =>{
	return trx('users')
		.returning('*')
		.insert({
		email: loginEmail[0],
		name: name,
		joined: new Date()
		})
		.then(user => {
		   res.json(user[0]);	
		})
	  })
	.then(trx.commit)
	.catch(trx.rollback)
	})
	.catch(err => res.status(400).json(err))	
})

app.get('/profile/:id', (req, res)=> {
	const { id } =req.params;
	db.select('*').from('users').where({id})
	.then(user => {
	if(user.length) {
	res.json(user[0])
	} else {
	res.status(400).json('Not Found')
	}
	})
	.catch(err => res.status(400).json('error getting user'))
})

app.put('/image', (req, res) => { image.handleImage(req, res, db)})

app.post('/imageurl', (req, res) => { image.handleApiCall(req, res)})
app.listen(process.env.PORT || 3000, () => {
	console.log(`app is running on port ${process.env.PORT}`);
});
