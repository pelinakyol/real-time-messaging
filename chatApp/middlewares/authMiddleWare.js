// Updated authMiddleWare.js
const jwt = require("jsonwebtoken");
const User = require("../models/newUser");

const requireAuth = (req, res, next) => {
  const token = req.cookies.jwt;

  if (token) {
    jwt.verify(token, "Baton", async (err, decodedToken) => {
      if (err) {
        console.log("JWT verification error:", err.message);
        res.redirect("/login");
      } else {
        try {
          const user = await User.findById(decodedToken.id);
          res.locals.user = user;
          next();
        } catch (error) {
          console.log("User not found:", error);
          res.redirect("/login");
        }
      }
    });
  } else {
    res.redirect("/login");
  }
};

const checkUser = (req, res, next) => {
  const token = req.cookies.jwt;

  if (token) {
    jwt.verify(token, "Baton", async (err, decodedToken) => {
      if (err) {
        res.locals.user = null;
        next();
      } else {
        try {
          const user = await User.findById(decodedToken.id);
          res.locals.user = user || null;
        } catch {
          res.locals.user = null;
        }
        next();
      }
    });
  } else {
    res.locals.user = null;
    next();
  }
};

module.exports = { requireAuth, checkUser };


const userVar = (req,res,next)=>{

  if(res.locals.user!=null){

    res.render("chat2", { title: "Chat",loggedUser:res.locals.user });

  }

  next();

}


module.exports = { requireAuth, checkUser,userVar };
