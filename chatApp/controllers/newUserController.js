const User = require("../models/newUser");
const jwt = require("jsonwebtoken");

const signupUser = (req, res) => {
  const user = new User(req.body);

  user
    .save()
    .then((result) => {
      res.redirect("./login");
    })
    .catch((err) => {
      if (err.code === 11000) { // Benzersiz kısıtlamanın ihlal edilmesi
        res.render("signup", { title: "Kayıt Ol", error: "Bu kullanıcı adı veya e-posta zaten alınmış." });
      } else {
        console.log(err);
        res.render("signup", { title: "Kayıt Ol", error: "Kayıt sırasında bir hata oluştu." });
      }
    });
};

//*TOKEN SÜRESİ 1 gün
const maxAge = 24 * 60 * 60; 

const createToken = (id) => {
  return jwt.sign({ id }, "Baton", { expiresIn: maxAge });
};

const loginUser = async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.login(username, password);
    const token = createToken(user._id);
    res.cookie("jwt", token, { httpOnly: true, maxAge: maxAge * 1000 });
    res.redirect("/chat");
  } catch (err) {
    console.log(err);
  }
};

const logOutUser = (req, res) => {
  res.cookie("jwt", "", { maxAge: 1 });
  res.redirect("/");
};

module.exports = {
  loginUser,
  logOutUser,
  signupUser,
};
