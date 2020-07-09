//jshint esversion:6
require('dotenv').config()
//Requiring all the packages
const bodyParser=require("body-parser");
const express=require("express");
const mongoose=require("mongoose");
const ejs=require("ejs");
const encrypt=require("mongoose-encryption");
const md5=require("md5");
const bcrypt=require("bcrypt");
const session=require("express-session");
const passport=require("passport");
const passportLocalMongoose=require("passport-local-mongoose");
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
var findOrCreate = require('mongoose-findorcreate')

//Initializing express
const app=express();

app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

//Body Parser for accessing poosted data
app.use(bodyParser.urlencoded({extended: true}));

//Make a folder called public to pass required documents like styles.css
app.use(express.static("public"));

//Make a file called view for ejs to access
app.set('view engine','ejs');

mongoose.connect("mongodb://localhost:27017/userDB",{useNewUrlParser: true,useUnifiedTopology: true});

const userSchema=new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
const saltRounds=10;

const User=mongoose.model("User",userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, done) {
    console.log(profile);
       User.findOrCreate({ googleId: profile.id }, function (err, user) {
         return done(err, user);
       });
  }
));
app.get("/",function(req,res){
  res.render("home");
})

app.get("/auth/google",passport.authenticate("google",{scope:["profile"]}));

app.get("/register",function(req,res){
  res.render("register");
})

app.get("/auth/google/secrets",
  passport.authenticate('google', { failureRedirect: "/login" }),
  function(req, res) {
    res.redirect('/secrets');
  });

app.get("/login",function(req,res){
  res.render("login");
});

app.get("/secrets",function(req,res){
User.find({"secret" : {$ne: null}},function(err,foundUsers){
  if(err) console.log(err);
  else{
    if(foundUsers){
      res.render("secrets",{usersWithSecrets: foundUsers});
    }
  }
})
})

app.get("/logout",function(req,res){
  req.logout();
  res.redirect("/");
})

app.get("/submit",function(req,res){
  if(req.isAuthenticated()){
    res.render("submit");
  }else{
    res.redirect("/login");
  }

})

app.post("/submit",function(req,res){
  const submittedSecret=req.body.secret;

  User.findById(req.user.id,function(err,foundUser){
    if(err) console.log(err);
    else{
      if(foundUser){
        foundUser.secret=submittedSecret;
        foundUser.save(function(){
          res.redirect("/secrets")
        });
      }
    }
  })
})

app.post("/register",function(req,res){
  User.register({username:req.body.username}, req.body.password, function(err, user) {
  if (err) { console.log(err);
              res.redirect("/register")}
 else {
   passport.authenticate("local")(req,res,function(){
     res.redirect("/secrets")
   })
 }

});
//   bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
//     const newUser= new User({
//       email: req.body.username,
//       password: hash
//     });
//     newUser.save(function(err){
//       if(err) res.send(err)
//       else res.render("secrets");
//     });
// });

});

app.post("/login",function(req,res){
  const user = new User({
    username: req.body.username,
    password: req.body.password
  })
  req.login(user, function(err) {
  if (err) { console.log(err); res.redirect("/login")}
  else
  {  passport.authenticate("local")(req,res,function(){
     res.redirect("/secrets")
   })
}
});
//   const username=req.body.username;
//   const password=req.body.password;
//
//   User.findOne({email: username},function(err,foundUser){
//     if(err) res.send(err);
//     else{
//       if(foundUser){
//         bcrypt.compare(password, foundUser.password, function(err, result) {
//     // result == true
//     if(result===true) res.render("secrets");
// })}
//       else res.send("User not found");
//     }
//   });
});
//Listen on port 3000
app.listen(3000,function(){
  console.log("Server started successfully on port 3000");
})
