const bcrypt = require("bcrypt");
const prisma = require("../config/db");
const jwt = require("jsonwebtoken")
const dotenv =require("dotenv")
dotenv.config();


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
   try{
        const { email, password} = req.body;

        const existingUser = await prisma.user.findFirst({
          where:{
            email: email
          }
        });

        if(!existingUser){
          return res.status(404).json({
            message:"Invalid Email Or Password"
          })
        }

        const isMatch = await bcrypt.compare(
          password,
          existingUser.password
        )

        if(!isMatch){
          return res.status(401).json({
            message:"Wrong password"
          })
        }
        const payload = {
  userId: existingUser.id,
  name: existingUser.name,
  username: existingUser.username
};

        const token = jwt.sign(
          payload,
          process.env.JWT_SECRET,
          {
            expiresIn: "15m"
          }
        );
        res.cookie("token", token, {
          httpOnly: true,
          sameSite: "strict",
          maxAge: 15 * 60 * 1000
        });

        res.status(200).json({
          message: "Login successful"
        });
        




   }

   catch(error){
    console.log(error)
    return res.status(500).json({
      message:"internal Server Error"
    });

   }
}


   const logout = async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      sameSite: "strict"
    });

    return res.status(200).json({
      message: "Logout successful"
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Internal server error"
    });
  }
};


const getMe = async(req,res)=>{
   
}

module.exports = {
  register,
  login,
  logout,
  getMe
}