const mongoose = require('mongoose')
const colors = require('colors')


const connectDb = async () => {
    try{
        console.log("logging mongo uri",process.env.MONGO_URI)
        const conn = await mongoose.connect(process.env.MONGO_URI,{
        })
        console.log("Database connected successfully!".blue.bold)

    } catch(error){
        console.log(error)
        process.exit(1)
    }
}


module.exports = connectDb