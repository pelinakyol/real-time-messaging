const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

// User Schema
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});


UserSchema.statics.checkUser = async function (username) {
  const user = await this.findOne({ username });
  return !!user; // Kullanıcı varsa true, yoksa false döner
};


UserSchema.statics.login = async function (username, password) {
  const user = await this.findOne({ username });

  if (user) {
    const auth = await bcrypt.compare(password, user.password);

    if (auth) {
      return user;
    } else {
      throw Error("Parola Hatalı");
    }
  } else {
    throw Error("Kullanıcı Yok");
  }
};

UserSchema.pre("save",async function (next){

  const salt = await bcrypt.genSalt();
  this.password = await bcrypt.hash(this.password,salt)
  next();

});

const User = mongoose.model("User", UserSchema);


module.exports = User;
