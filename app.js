require("dotenv").config();
const mongoose=require("mongoose");
const express=require("express");
const ejs=require("ejs");
const bodyParser=require("body-parser");
const passport=require("passport");
const passportLocalMongoose=require("passport-local-mongoose");
const session=require("express-session");
const findOrCreate = require('mongoose-findorcreate')
const GoogleStrategy = require('passport-google-oauth20').Strategy;



const app=express();
app.set("view engine","ejs");
app.use(bodyParser.urlencoded({
  extended:true
}));
app.use(express.static("public"));


app.use(session({
  secret:process.env.SECRET,
  resave:false,
  saveUninitialized:false
}));


app.use(passport.initialize());
app.use(passport.session());

// mongodb://localhost:27017/users
mongoose.connect("mongodb+srv://admin-saicharan:test123@cluster0-2xuxo.mongodb.net/users",{useNewUrlParser:true,useUnifiedTopology: true});
const userSchema=new mongoose.Schema({
  email:String,
  password:String,
  googleId:String,
  secret:[]

});
mongoose.set("useCreateIndex",true);
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
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
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/",function(req,res){
  res.render("home");
});


app.get("/login",function(req,res){
  res.render("login");
});


app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));



  app.get("/auth/google/secrets",
    passport.authenticate('google', { failureRedirect: "/login" }),
    function(req, res) {
      // Successful authentication, redirect home.
      res.redirect("/secrets");
    });

app.get("/register",function(req,res){
  res.render("register");
});
app.get("/secrets",function(req,res){
  if(req.isAuthenticated()){
    User.find({secret:{$ne:null}},function(err,foundSecrets){
      if(foundSecrets){
        console.log(foundSecrets);
        res.render("secrets",{userWithSecrets:foundSecrets});
      }
    });

  }else{
    res.redirect("/login");
  }
});
app.post("/register",function(req,res){
  User.register({username:req.body.username},req.body.password,function(err,user){
    if(err){
      console.log(err);
      res.redirect("/register");
    }else{
      passport.authenticate("local")(req,res,function(){
        res.redirect("/secrets");
      });
    }
  });
});
app.get("/logout",function(req,res){
  req.logout();
  res.redirect("/");
});
app.post("/login",function(req,res){
const user=new User({
  username:req.body.username,
  password:req.body.password
});
req.login(user,function(err){
  if(err){
      console.log(err);}else{
        passport.authenticate("local")(req,res,function(){
          res.redirect("/secrets");
      });

  }

});
});

app.get("/submit",function(req,res){
  if(req.isAuthenticated()){
    res.render("submit");
  }else{
    res.redirect("/login");
  }
});


app.post("/submit",function(req,res){
  if(req.isAuthenticated()){
    User.findById(req.user.id,function(err,foundId){
      if(err){
        console.log(err);
      }else{
        if(foundId){
          console.log(req.body.secret);
        foundId.secret.push(req.body.secret);
        foundId.save(function(err){
          if(!err){
              res.redirect("/secrets");
          }else{
            console.log(err);
          }
        });

        }
      }
    });
  }else{
    res.redirect("/login");
  }
});

app.listen(3000,function(req,res){
  console.log("server is up and running at port 3000");
});
