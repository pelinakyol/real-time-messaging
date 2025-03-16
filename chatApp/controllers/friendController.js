const User = require("../models/newUser");
const Friendship = require("../models/FriendShip");

const findFriend = async (req, res) => {
  const { username } = req.body;

  try {
    const user = await User.findOne({ username });

    if (username === res.locals.user.username) {
      return res.json({
        success: false,
        message: "Kendinizi ekleyemezsiniz.",
      });
    } else if (user) {
      // Kullanıcı bulunduysa, doğrudan addFriend fonksiyonunu çağırıyoruz
      return addFriend(req, res); // Burada 'return' ekledik
    } else {
      return res.json({ success: false, message: "Kullanıcı bulunamadı." });
    }
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Bir hata oluştu." });
  }
};

//* Arkadaşlık ekleme fonksiyonu
const addFriend = async (req, res) => {
  const { username } = req.body;
  const loggedInUser = res.locals.user; // Şu anda giriş yapmış olan kullanıcı

  try {
    const userToAdd = await User.findOne({ username });

    const existingFriendship = await Friendship.findOne({
      $or: [
        { user_id_1: loggedInUser._id, user_id_2: userToAdd._id },
        { user_id_1: userToAdd._id, user_id_2: loggedInUser._id },
      ],
    });

    if (existingFriendship) {
      return res.json({
        success: false,
        message: "Bu kullanıcıyla zaten arkadaşsınız ya da istek gönderilmiş.",
      });
    }

    const newFriendship = new Friendship({
      user_id_1: loggedInUser._id,
      user_id_2: userToAdd._id,
      status: "pending",
    });

    await newFriendship.save();

    return res.json({
      success: true,
      message: `${username} ile arkadaşlık isteği gönderildi.`,
    });
  } catch (error) {
    console.error("Arkadaşlık isteği eklenirken hata:", error);
    return res
      .status(500)
      .json({ success: false, message: "Bir hata oluştu." });
  }
};

//* ARKADAŞLARI GÖRÜNTÜLE
const getFriends = async (req, res) => {
  const userId = res.locals.user._id; // Oturum açmış kullanıcının ID'si

  try {
    // Kullanıcının arkadaşlık ilişkilerini bul
    const friendships = await Friendship.find({
      $or: [{ user_id_1: userId }, { user_id_2: userId }],
    });

    // Arkadaşlarının ID'lerini bul
    const friendIds = friendships.map((friendship) =>
      friendship.user_id_1.toString() === userId.toString()
        ? friendship.user_id_2
        : friendship.user_id_1
    );

    // Arkadaşlarının kullanıcı adlarını al
    const friends = await User.find(
      { _id: { $in: friendIds } },
      { username: 1, _id: 0 } // Sadece kullanıcı adını al, ID'yi alma
    );

    // Kullanıcı adlarını JSON olarak döndür
    res.json({
      success: true,
      friends: friends.map((friend) => friend.username),
    });
  } catch (error) {
    console.error("Arkadaşlar alınırken hata:", error);
    res.status(500).json({ success: false, message: "Bir hata oluştu." });
  }
};

module.exports = {
  findFriend,
  getFriends,
};
