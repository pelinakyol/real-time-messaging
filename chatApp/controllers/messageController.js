const Message = require("../models/Message");
const User = require("../models/newUser");

let io;

function setIO(ioInstance) {
  io = ioInstance;
}

async function saveMessage(content, senderName, recieverName) {
  try {
    const ID = await getID(senderName, recieverName);

    const message = new Message({
      sender_id: ID.sender,
      receiver_id: ID.reciever,
      content: content,
    });

    const savedMessage = await message.save();
    return savedMessage._id; // Mesajın MongoDB'deki ID'sini döndürüyoruz
  } catch (error) {
    console.error("Mesaj kaydedilirken bir hata oluştu:", error);
    throw error;
  }
}

async function getID(senderName, recieverName) {
  const sender = await User.findOne({ username: senderName });
  const reciever = await User.findOne({ username: recieverName });

  if (!sender || !reciever) {
    throw new Error("Gönderici veya alıcı bulunamadı.");
  }

  return { sender: sender._id, reciever: reciever._id };
}

const chat = async (req, res) => {
  try {
    const savedMessageId = await saveMessage(
      req.body.message.content,
      res.locals.user.username,
      req.body.message.recieverName
    );

    const message = {
      id: savedMessageId, // MongoDB ID'si
      sender_id: { username: res.locals.user.username },
      content: req.body.message.content,
      timestamp: new Date(),
    };

    io.emit("chat" + req.body.message.recieverName, message);

    res.status(200).send({ success: true, message });
  } catch (error) {
    console.error("Mesaj gönderilirken bir hata oluştu:", error);
    res.status(500).send({ success: false, message: "Mesaj gönderilemedi." });
  }
};

const deleteMessage = async (req, res) => {
  try {
    const { msgID } = req.body; // Gelen msgID'yi al
    const userID = res.locals.user._id; // Oturum açmış kullanıcının ID'si (auth middleware'den geliyor)

    // Mesajı bul
    const message = await Message.findById(msgID);

    if (!message) {
      return res.status(404).json({ success: false, message: "Mesaj bulunamadı." });
    }

    // Mesaj sahibini kontrol et
    if (message.sender_id.toString() !== userID.toString()) {
      return res
        .status(403)
        .json({ success: false, message: "Bu mesajı silmeye yetkiniz yok." });
    }

    // Mesajı sil
    await Message.findByIdAndDelete(msgID);

    return res.status(200).json({ success: true, message: "Mesaj başarıyla silindi." });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ success: false, message: "Mesaj silinirken bir hata oluştu." });
  }
};

const getChat = async (req, res) => {
  try {
    const ID = await getID(res.locals.user.username, req.body.senderName);

    const messages = await Message.find({
      $or: [
        { sender_id: ID.sender, receiver_id: ID.reciever },
        { sender_id: ID.reciever, receiver_id: ID.sender },
      ],
    })
      .sort({ created_at: 1 })
      .select("content sender_id receiver_id created_at")
      .populate("sender_id", "username -_id")
      .populate("receiver_id", "username -_id");

    // Şifrelenmiş mesajları çöz
    const decryptedMessages = messages.map((msg) => ({
      ...msg._doc,
      content: msg.decryptContent(), // content'i çözüyoruz
    }));

    res.status(200).json({ success: true, message: decryptedMessages });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: "MESAJ HATASI" });
  }
};


const markAsRead = async (req, res) => {
  const username = req.body.senderName;

  try {
    const receiver = res.locals.user; // Şu anda oturum açmış kullanıcı
    const sender = await User.findOne({ username });

    if (!sender) {
      return res
        .status(404)
        .json({ success: false, message: "Gönderen kullanıcı bulunamadı." });
    }

    const result = await Message.updateMany(
      { sender_id: sender._id, receiver_id: receiver._id, is_read: false },
      { $set: { is_read: true } }
    );

    res.status(200).json({
      success: true,
      message: "Mesajlar okunmuş olarak işaretlendi.",
      updatedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Mesajlar işlenirken bir hata oluştu:", error);
    res.status(500).json({ success: false, message: "Sunucu hatası." });
  }
};

const getUnreadMessages = async (req, res) => {
  try {
    const userId = res.locals.user._id;

    const unreadMessages = await Message.aggregate([
      {
        $match: {
          receiver_id: userId, // Alıcı olan kullanıcı
          is_read: false, // Okunmamış mesajlar
        },
      },
      {
        $group: {
          _id: "$sender_id", // Gönderen kullanıcıya göre grupla
          unreadCount: { $sum: 1 }, // Her kullanıcı için mesaj sayısını topla
        },
      },
    ]);

    const result = unreadMessages.reduce((acc, item) => {
      acc[item._id] = item.unreadCount; // Kullanıcı ID'sine göre sayıyı ekle
      return acc;
    }, {});

    res.json({
      success: true,
      unreadMessages: result, // { "sender1_id": 5, "sender2_id": 2, ... }
    });
  } catch (error) {
    console.error("Okunmamış mesajlar alınırken hata oluştu:", error);
    res.status(500).json({
      success: false,
      message: "Okunmamış mesajlar alınırken bir hata oluştu.",
    });
  }
};

module.exports = { setIO, chat, getChat, getUnreadMessages, markAsRead, deleteMessage };
