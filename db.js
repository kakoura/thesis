const {Pool}=require('pg');

const pool = new Pool({
  user: "postgres",
  password: "evaggelatos1",
  host: "localhost",
  port: 5432,
  database: "PaintingsCoinsDB",
});

module.exports=pool;