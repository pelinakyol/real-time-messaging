const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const {
  requireAuth,
  checkUser,
  userVar,
} = require("./middlewares/authMiddleWare");
const http = require("http");
const { Server } = require("socket.io");
const newUserController = require("./controllers/newUserController");
const messageController = require("./controllers/messageController");
const friendController = require("./controllers/friendController");
const Group = require("./models/Group"); // Group model
const { setSocketIO, groupSockets } = require("./utils/socketUtils");
const groupController = require("./controllers/groupController");

const app = express();

const dbURL =
  "mongodb+srv://asd:123@nodejs-database.guyh4.mongodb.net/?retryWrites=true&w=majority&appName=nodejs-database";

mongoose
  .connect(dbURL)
  .then(() => console.log("Database bağlantısı başarılı"))
  .catch((err) => console.log("DATABASE BAĞLANTISI SAĞLANAMADI: " + err));

// Socket.IO ile HTTP sunucusu oluşturma
const server = http.createServer(app);
const io = new Server(server);

//!YENİ SOCKET AYARLARI

const userSockets = {}; // Kullanıcı adı -> socket.id eşleşmesini tutacak

io.on("connection", (socket) => {
  console.log("Kullanıcı bağlandı: " + socket.id);


  socket.on("start-call", (tab) => {
    console.log("start-call alındı:", tab);
    socket.broadcast.emit("start-call", tab);
});

socket.on('telefon-acildi',(func)=>{

  const {bool,user} = func;

  console.log("bool "+bool+" user "+user);
  

  const recipientSocketId = userSockets[user];

  io.to(recipientSocketId).emit('telefon-acildi',bool);

})

socket.on("offer", (offerSet) => {

  const { recipient, offer } = offerSet;

  const recipientSocketId = userSockets[recipient];

  console.log("offer buna geldi "+recipient);
  

    console.log("Teklif alındı.");
    io.to(recipientSocketId).emit("offer", offerSet);
});

socket.on("answer", (answerSet) => {

  const { recipient , answer } = answerSet;

  const recipientSocketId = userSockets[recipient];

    console.log("Yanıt alındı. "+recipient);
    socket.broadcast.emit("answer", answer);
});

socket.on("ice-candidate", (candidateSet) => {

  const { recipient, candidate } = candidateSet;

  const recipientSocketId = userSockets[recipient];

    console.log("ICE Adayı alındı.");
    io.to(recipientSocketId).emit("ice-candidate", candidate);
});
  // Kullanıcının adını oturumdan al ve socket ile eşleştir
  socket.on("register", (username) => {
    userSockets[username] = socket.id;
    console.log(`${username} socket ID ile eşleştirildi: ${socket.id}`);
  });

  // Kullanıcı bağlantıyı kapattığında socket eşleştirmesini kaldır
  socket.on("disconnect", () => {
    for (const [username, id] of Object.entries(userSockets)) {
      if (id === socket.id) {
        delete userSockets[username];
        console.log(`${username} bağlantıyı kesti.`);
        break;
      }
    }
  });

  // Özel mesajlaşma
  socket.on("private_message", (data) => {
    console.log("Özel mesaj alındı:", data);
    const { recipient, message } = data;
    console.log("Alıcı:", recipient);
    console.log("Mesaj:", message);
    const recipientSocketId = userSockets[recipient];
    console.log("Alıcı soket ID'si:", recipientSocketId);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit("private_message", {
        sender: data.sender,
        message,
      });
    } else {
      console.log("Alıcı şu anda çevrimdışı.");
    }
  });

  console.log("Kullanıcı bağlandı: " + socket.id);

  // Kullanıcı belirli bir gruba katıldığında
  socket.on("join_group", (groupId) => {
    if (!groupSockets[groupId]) {
      groupSockets[groupId] = [];
    }
    groupSockets[groupId].push(socket.id);
    console.log(`Kullanıcı ${socket.id} gruba katıldı: ${groupId}`);

    socket.emit("group_messages", []);
  });

  // Kullanıcı mesaj gönderdiğinde
  socket.on("send_group_message", (data) => {
    const { groupId, message, sender } = data;
    console.log(`Grup ${groupId} için mesaj gönderildi: ${message}`);

    if (groupSockets[groupId]) {
      groupSockets[groupId].forEach((socketId) => {
        io.to(socketId).emit("new_message", {
          sender,
          message,
          groupId,
          timestamp: new Date(),
        });
      });
    }
  });

  // Kullanıcı bağlantıyı kestiğinde
  socket.on("disconnect", () => {
    console.log("Kullanıcı bağlantıyı kesti: " + socket.id);

    for (const groupId in groupSockets) {
      groupSockets[groupId] = groupSockets[groupId].filter(
        (id) => id !== socket.id
      );
    }
  });
});

//!YENİ SOCKET AYARLARI

// Rotalar
app.set("view engine", "ejs");

app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

app.get("*", checkUser);

app.get("/api/groups", requireAuth, async (req, res) => {
  try {
    const groups = await Group.find(
      { members: res.locals.user._id },
      "name _id"
    );
    res.json({ success: true, groups });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Gruplar alınırken hata oluştu." });
  }
});

app.get("/", (req, res) => {
  //res.cookie("jwt", "", { maxAge: 1 });
  res.render("index2", {
    title: "Ana Sayfa",
  });
});

app.get("/chat", requireAuth, (req, res) => {
  res.render("chat2", { title: "Chat", loggedUser: res.locals.user });
});

app.get("/login", userVar, (req, res) => {
  res.render("login2", { title: "Giriş Yap" });
});

app.get("/logout", newUserController.logOutUser);

app.post("/login", newUserController.loginUser);

app.get("/signup", userVar, (req, res) => {
  res.render("signup2", { title: "Kayıt Ol" });
});

app.post("/signup", newUserController.signupUser);

function setIO() {
  return io;
}

messageController.setIO(setIO());
setSocketIO(setIO());

// Yeni rota: Mesaj gönderme
app.post("/send-message", requireAuth, messageController.chat);

//?-----------------------------------------------------------------------------------------------

app.post("/find-friend", requireAuth, friendController.findFriend);

app.post("/disp-friend", requireAuth, friendController.getFriends);

//?-----------------------------------------------------------------------------------------------

app.post("/get-chat", requireAuth, messageController.getChat);

app.post("/unread-messages", requireAuth, messageController.getUnreadMessages);

app.post("/mark-as-read", requireAuth, messageController.markAsRead);

app.post("/delete-message", requireAuth, messageController.deleteMessage);

// Grup işlemleri
app.get("/groupCreate", requireAuth, (req, res) =>
  res.render("groupCreate", { title: "Grup Oluştur" })
);

app.get("/group/details", requireAuth, groupController.getGroupDetails);

app.post("/group/add-user", requireAuth, groupController.addMemberToGroup);

app.post("/groupCreate", requireAuth, groupController.createGroup);

app.get("/groups", requireAuth, groupController.listGroups);

// app.post("/groupMessage", requireAuth, messageController.chat); // eski hali
app.post("/groupMessage", requireAuth, groupController.sendMessageToGroup); // yeni hali

app.post("/markAsRead", requireAuth, messageController.markAsRead);

// Grup sohbet sayfası
app.get(
  "/groups/:groupId/messages",
  requireAuth,
  groupController.groupMessages
);

// Mesaj gönderme
app.post("/groups/:groupId/send", requireAuth, async (req, res) => {
  const { groupId } = req.params;
  const { message } = req.body;
  const user = res.locals.user;

  try {
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).send("Grup bulunamadı");
    }

    group.messages.push({ sender: user.username, message });
    await group.save();

    // const groupSockets = req.app.locals.groupSockets[groupId] || [];
    // groupSockets.forEach((socketId) => {
    //   req.app.locals.io.to(socketId).emit("new_message", {
    //     sender: req.user.username,
    //     message,
    //     groupId,
    //     timestamp: new Date(),
    //   });
    // });
    // res.redirect(`/groups/${groupId}/messages`);
    res.status(200).json({ message: "Mesaj gönderildi" });
  } catch (err) {
    console.log(err);
    res.status(500).send("Mesaj gönderilemedi");
  }
});

//! 404 sayfası
app.use((req, res) => {
  res.status(404).render("404", { title: "Sayfa Bulunamadı" });
});

server.listen(3000, () => {
  console.log("3000 portundan dinleniyor");
});

module.exports = setIO();


