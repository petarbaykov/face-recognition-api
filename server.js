const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const bcrypt = require('bcrypt-nodejs');
const cors = require('cors');
app.use(bodyParser.json());

var knex = require('knex');

const database = knex({
	client:'pg',
	connection:{
		connectionString:process.env.DATABASE_URL,
		ssl:true
	}
});

app.use(cors());
app.get('/',(req,res) => {
	res.json(database.users);
});

app.post('/signin',(req,res) => {
	/*database.select('user_id','hash').from('login')
	.where('user_id')
	.then(data => {
		console.log(data);
	})*/
	
		database.select('*').from('users')
		.where('email','=',req.body.email)
		.then(user => {
			const the_user = user[0];
			return database.select('*').from('login')
			.where('user_id','=',the_user.id)
			.then(data => {
				const isValid = bcrypt.compareSync(req.body.password,data[0].hash);
				if(isValid){
					res.json(the_user);
				}else{
					res.status(400).json('wrong credentials')
				}
			})
			.catch(err => res.status(400).json('cannot get user'))
		})
		.catch(err => res.status(400).json('wrong credentials'));
	
	
});

app.post('/register',(req,res) => {
	const {email,password,name} = req.body;
	
	const hash = bcrypt.hashSync(password);
		database.transaction(trx => {
			trx.insert({
				email:email,
				name:name,
				joined:new Date()
			})
			.into('users')
			.returning('*')
			.then(user => {
				const the_user = user[0];
				return trx('login')
				.insert({
					hash:hash,
					user_id:the_user.id
				})
				.then(response => {
					res.json(the_user);
				});
				

			})
			.then(trx.commit)
			.catch(trx.rollback)
		})
		.catch(err => res.status(400).json(err));
});

app.get('/profile/:id',(req,res) => {
	const {id} = req.params;

	database.select('*').from('users').where({id})
	.then(user => {
		if(user.length){
			res.json(user[0])
		}else{
			res.status(400).json('Not found');
		}
		
	})
	.catch(err => res.status(400).json('error getting user'));

	/*if(!found){
		res.status(400).json('user not found');
	}*/
});

app.post('/image',(req,res) => {
	const {id} = req.body;
	
	database('users').where('id','=',id)
	.increment('entries',1)
	.returning('entries')
	.then(entries => {
		res.json(entries[0]);
	})
	.catch(err => res.status(400).json('unable to get entries'));
});

app.listen(3001,() => {

	console.log('app is running')
});

