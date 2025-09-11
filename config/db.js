const mongoose = require('mongoose')
const colors = require('colors')


const connectDb = async () => {
    try{
        const conn = await mongoose.connect(process.env.MONGO_URI,{
        })
        console.log("Database connected successfully!".blue.bold)

    } catch(error){
        console.log(error)
        process.exit(1)
    }
}


module.exports = connectDb