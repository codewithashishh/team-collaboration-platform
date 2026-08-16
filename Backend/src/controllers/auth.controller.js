const bcrypt = require("bcrypt");
const prisma = require("../config/db");


const register = async(req,res)=>{
  try{
     const {
    name,
    username,
    email,
    password
   } = req.body;
    if (!name || !username || !email || !password) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }


   const existingUser = await prisma.user.findFirst({
    where:{
      OR:[
      {email: email},
      {username:username}
    ]}
   });

   if(existingUser){
    return res.status(409).json({message:"User already exists"})
   }
   
   
    const hashedPassword = await bcrypt.hash(password,10);
    
    await prisma.user.create({
      data:{email,
      username,
      name,
      password: hashedPassword}
    })

    return res.json({
  "message": "User registered successfully"
});
  
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

   

const login = async(req,res)=>{
   
}

const logout = async(req,res)=>{
   
}

const getMe = async(req,res)=>{
   
}

module.exports = {
  register,
  login,
  logout,
  getMe
}