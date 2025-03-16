// Socket.IO ile bağlantı
const socket = io();

// Grup ID'si (HTML'den alıyoruz)
const groupId = document.getElementById("group-id")
  ? document.getElementById("group-id").value
  : "default-group";

// Grup sohbetine katıl
socket.emit("joinGroup", { username: "user1", groupName: groupId }); // Username ve grup adı verildi.

// Grupları listeleme
const showGroupsBtn = document.getElementById("showGroupsBtn");
const groupsList = document.getElementById("groupsList");

showGroupsBtn.addEventListener("click", () => {
  socket.emit("getGroups");
});

// Gruplar alındığında
socket.on("groupsList", (groups) => {
  groupsList.innerHTML = ""; // Grupları temizle
  groups.forEach((group) => {
    const groupButton = document.createElement("button");
    groupButton.textContent = group;
    groupButton.onclick = () => {
      groupId = group;
      socket.emit("joinGroup", { username: "user1", groupName: groupId });
    };
    groupsList.appendChild(groupButton);
  });
});

// Yeni mesaj gönderme işlemi
const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");

messageForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const message = messageInput.value;
  if (message.trim()) {
    // Mesajı backend'e gönder
    socket.emit("sendGroupMessage", {
      groupName: groupId,
      message: message,
    });
    messageInput.value = ""; // Mesaj inputunu temizle
  }
});

// Yeni mesaj geldiğinde
socket.on("new_message", (data) => {
  const messagesContainer = document.getElementById("messages");
  const newMessage = document.createElement("div");
  newMessage.classList.add("message");
  newMessage.innerHTML = `<strong>${data.sender}:</strong><p>${data.message}</p>`;
  messagesContainer.appendChild(newMessage);

  // Mesajlar kutusunun en altına kaydırma
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
});

// Hata durumunda bir işlem eklemek isterseniz
socket.on("error", (errorMessage) => {
  console.error("Mesaj alırken hata oluştu:", errorMessage);
});
