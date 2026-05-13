const { Client } = require('pg');
(async()=>{
  try{
    const client=new Client({host:'localhost',port:5432,user:'postgres',password:'1234',database:'dfashion'});
    await client.connect();
    const res=await client.query("SELECT column_name,data_type FROM information_schema.columns WHERE table_name='posts';");
    console.log(res.rows);
    const countRes = await client.query('SELECT count(*) FROM posts');
    console.log('post count', countRes.rows[0]);
    const sample = await client.query('SELECT * FROM posts LIMIT 3');
    console.log('sample rows', sample.rows);
    await client.end();
  }catch(e){console.error(e);}  
})();
