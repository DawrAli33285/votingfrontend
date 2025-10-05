const express=require('express')
const app=express();
const cors=require('cors')
const contenstantRoutes=require('./routes/contestant')
const connection=require('./connection/connection')

connection
app.use(cors())
app.use(express.json())
app.use(contenstantRoutes)




app.listen(5000,()=>{
    console.log("Listening to port 5000")
})