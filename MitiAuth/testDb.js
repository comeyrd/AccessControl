var mysql = require('mysql2');

var con = mysql.createConnection({
  host: "127.0.0.1",
  user: "toto",
  password: "password"
});

con.connect(function(err) {
  if (err) throw err;
  console.log("Connected!");
});

con.query("CREATE DATABASE testData;",(err,result)=>{if(err)throw err;console.log('DatabaseCreadted')});

con.query("DROP DATABASE testData;",(err,result)=>{if(err)throw err;console.log('DatabaseCreated')});