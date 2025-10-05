const mongoose=require('mongoose')

const contenstantSchema=mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true
    },
    phone:{
        type:String,
        required:true
    },
    video:{
        type:String,
        required:true
    },
    code:{
        type:String
    },
    totalVotes:{
        type:Number
    }
})

const contenstantModel=mongoose.model('contenstant',contenstantSchema)

module.exports=contenstantModel