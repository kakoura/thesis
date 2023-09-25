const express = require('express');
const path = require('path');
const app = express();
const pool=require('./db');
const port = 5000;
const fileUpload = require("express-fileupload");

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');


app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'styles')));
app.use(fileUpload());
app.use(express.json());



// Connect to the PostgreSQL database
pool.connect()
  .then(() => {
    // Set up a trigger to notify Python
    const triggerQuery =`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_trigger WHERE tgname = 'notify_python_trigger'
        ) THEN
          CREATE TRIGGER notify_python_trigger AFTER INSERT ON paintings FOR EACH ROW EXECUTE PROCEDURE notify_python();
        END IF;
      END $$;
    `;
    return pool.query(triggerQuery);
  })
  .catch((err) => {
    console.error('Error setting up the trigger:', err);
  });


app.get('/cropper.css', (req, res) => {
  res.sendFile(path.join(__dirname, 'node_modules', 'cropperjs', 'dist', 'cropper.min.css'));
});

// Serve the cropper.min.js file with the correct content type
app.get('/cropper.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'node_modules', 'cropperjs', 'dist', 'cropper.min.js'));
});


app.post('/api', async (req, res) => {
  try{ 
      //Access the uploaded file
      const file= req.files.croppedImage;

      const fileBuffer=file.data;
      const bytea=Buffer.from(fileBuffer).toString('base64');

      await pool.query(`Insert INTO "paintings" (name,file) VALUES ($1,$2)`,[file.name,bytea]);

      res.json({message:'File inserted into the database'});


  }catch(err){
    console.log(err);
    res.status(500).json({ message: 'Error occurred while processing the file' });
  }
});


app.get("/api", async(req,res)=>{
  try{
    const data=await pool.query(`SELECT * FROM "coins" ORDER BY id DESC LIMIT 5`)
    console.log(data);

    const coinsWithBase64=data.rows.map((coin)=>{
      const base64Data=Buffer.from(coin.coin_file).toString("base64");
      return {...coin,coin_file:base64Data};
    })
    

    res.json(coinsWithBase64);


    
  } catch (error){
    console.log("Error fetching coins data:",error);
    res.status(500).json({message:"Error fetching coins data"});
  }
});

app.get('/', (req, res) => {
  res.render('index');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});


/*https://purpose-code.com/fetch-api-send-data-from-front-end-to-back-end/*/