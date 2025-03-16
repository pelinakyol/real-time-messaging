const { Server } = require("socket.io");

let io;
const userSockets = {}; // Kullanıcı adı -> socket.id eşleşmesini tutar
const groupSockets = {}; // Grup adı -> [kullanıcı adları] eşleşmesini tutar

// Socket.IO'yu başlatmak için bir fonksiyon
function setSocketIO(server) {
  io = new Server(server);
}

// Kullanıcıyı soket ile ilişkilendir
function registerSocket(socket, username) {
  if (userSockets[username] && userSockets[username] !== socket.id) {
    console.log(`${username} başka bir socket ID ile zaten kayıtlı, güncelleniyor.`);
  }
  userSockets[username] = socket.id;
  console.log(`${username} socket ID ile eşleştirildi: ${socket.id}`);
}

// Bağlantı kesildiğinde socket eşleşmesini kaldır
function unregisterSocket(socket) {
  let username = null;
  for (const [user, id] of Object.entries(userSockets)) {
    if (id === socket.id) {
      username = user;
      delete userSockets[username];
      console.log(`${username} bağlantıyı kesti.`);
      break;
    }
  }

  // Bağlantı kesildiğinde grup üyeliklerinden de çıkar
  if (username) {
    for (const groupName in groupSockets) {
      const index = groupSockets[groupName].indexOf(username);
      if (index !== -1) {
        groupSockets[groupName].splice(index, 1);
        console.log(`${username} grup ${groupName} üyeliğinden çıkarıldı.`);
      }
    }
  }
}

// Grup oluşturma veya kullanıcı ekleme
function addToGroup(username, groupName) {
  if (!groupSockets[groupName]) {
    groupSockets[groupName] = [];
  }

  if (!groupSockets[groupName].includes(username)) {
    groupSockets[groupName].push(username);
    console.log(`${username}, ${groupName} grubuna eklendi.`);
  } else {
    console.log(`${username}, zaten ${groupName} grubunda.`);
  }
}

// Kullanıcının gruptan manuel çıkması
function leaveGroup(username, groupName) {
  if (groupSockets[groupName]) {
    const index = groupSockets[groupName].indexOf(username);
    if (index !== -1) {
      groupSockets[groupName].splice(index, 1);
      console.log(`${username} ${groupName} grubundan çıktı.`);
    } else {
      console.log(`${username}, ${groupName} grubunda değil.`);
    }
  } else {
    console.log(`Grup ${groupName} bulunamadı.`);
  }
}

// Grup mesajı gönderme
function sendGroupMessage(io, groupName, messageData) {
  const groupMembers = groupSockets[groupName];

  if (groupMembers && groupMembers.length > 0) {
    groupMembers.forEach((username) => {
      const socketId = userSockets[username];
      if (socketId) {
        // Mesajı grup üyelerine gönder
        io.to(socketId).emit("new_message", {
          sender: username,  // Gönderenin adı
          message: messageData.message, // Mesaj içeriği
          timestamp: messageData.timestamp // Zaman damgası
        });
      } else {
        console.log(`${username} şu anda çevrimdışı, mesaj gönderilemiyor.`);
      }
    });
  } else {
    console.log(`Grup ${groupName} bulunamadı veya grup boş.`);
  }
}

// Özel mesaj gönderme
function sendPrivateMessage(io, data) {
  const { recipient, message, sender } = data;
  const recipientSocketId = userSockets[recipient];

  if (recipientSocketId) {
    io.to(recipientSocketId).emit("private_message", {
      sender,
      message,
    });
  } else {
    console.log(`${recipient} şu anda çevrimdışı.`);
  }
}

// Mesaj okundu bildirimi
function markMessageAsRead(socket, data) {
  const { sender, recipient } = data;
  const senderSocketId = userSockets[sender];

  if (senderSocketId) {
    io.to(senderSocketId).emit("message_read", {
      recipient,
    });
    console.log(`${recipient} tarafından mesaj okundu bilgisi ${sender} gönderildi.`);
  }
}

// Grupları frontend'e göndermek için bir fonksiyon
function getGroups(socket) {
  socket.emit("groupsList", Object.keys(groupSockets));
}

// Socket bağlantısı sırasında yapılacak işlemler
function handleSocketEvents(socket) {
  console.log("Bir kullanıcı bağlandı:", socket.id);

  // Kullanıcı grupları talep ettiğinde
  socket.on("getGroups", () => {
    getGroups(socket);
  });

  // Kullanıcı sokete kaydolduğunda
  socket.on("register", (username) => {
    registerSocket(socket, username);
  });

  // Grup oluşturma veya kullanıcı ekleme
  socket.on("joinGroup", ({ username, groupName }) => {
    addToGroup(username, groupName);
    socket.join(groupName); // Kullanıcıyı gruba ekle
  });

  // Kullanıcı gruptan ayrıldığında
  socket.on("leaveGroup", ({ username, groupName }) => {
    leaveGroup(username, groupName);
    socket.leave(groupName); // Kullanıcıyı gruptan çıkar
  });

  // Grup mesajı gönderme
  socket.on("sendGroupMessage", ({ groupName, message }) => {
    const messageData = { sender: socket.id, message, timestamp: Date.now() };
    sendGroupMessage(io, groupName, messageData);
  });

  // Özel mesaj gönderme
  socket.on("sendPrivateMessage", (data) => {
    sendPrivateMessage(io, data);
  });

  // Mesaj okundu bildirimi
  socket.on("markAsRead", (data) => {
    markMessageAsRead(socket, data);
  });

  // Kullanıcı bağlantıyı kestiğinde
  socket.on("disconnect", () => {
    unregisterSocket(socket);
  });
}

// Socket.IO bağlantısını başlat
function initializeSocketIO(server) {
  io = new Server(server);
  io.on("connection", handleSocketEvents);
}

module.exports = {
  setSocketIO: initializeSocketIO,
  registerSocket,
  unregisterSocket,
  addToGroup,
  leaveGroup,
  sendPrivateMessage,
  sendGroupMessage,
  markMessageAsRead,
  getGroups,
  groupSockets, // `groupSockets` dışa aktarıldı
};
