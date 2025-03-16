const socket = io();

const content = document.getElementById("content");
const form = document.querySelector(".text-box form");
const input = document.getElementById("text-box");
const username = document.getElementById("username");
const display = document.getElementById("display");
const afText = document.getElementById("add-friend-text");
const afButton = document.getElementById("add-friend-button");

// chat.js

afButton.addEventListener("click", () => {
  const friendUsername = afText.value;
  const currentUsername = username.innerText;

  if (friendUsername) {
    fetch("/add-friend", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ username: currentUsername, friendUsername })
    })
      .then(response => response.json())
      .then(data => {
        if (data.message) {
          console.log(data.message); // Arkadaşın başarılı bir şekilde eklendiği mesajı
        }
      })
      .catch(error => {
        console.error("Hata:", error);
      });
  }
});


// Sunucudan gelen mesajları dinle ve ekrana yazdır
socket.on("chat", (data) => {
  // Yeni bir chat mesajı bloğu oluştur
  const messageElement = document.createElement("div");
  messageElement.classList.add("chat");

  // Kullanıcı adını içeren div
  const nameElement = document.createElement("div");
  nameElement.classList.add("name");
  nameElement.innerHTML = `<b>${data.username}</b>`;

  // Mesaj içeriğini içeren div
  const messageContentElement = document.createElement("div");
  messageContentElement.classList.add("content");
  messageContentElement.textContent = "=>" + data.message;

  // Yeni öğeleri ana `messageElement` div içine ekle
  messageElement.appendChild(nameElement);
  messageElement.appendChild(messageContentElement);

  // Oluşturulan mesaj bloğunu içerik alanına ekle
  display.appendChild(messageElement);
});

// Form gönderildiğinde mesajı Socket.IO ile gönder
form.addEventListener("submit", (e) => {
  e.preventDefault(); // Formun varsayılan davranışını engelle

  const message = input.value; // Mesaj içeriğini al

  console.log("mesaj is " + input.value);

  // Mesaj boş değilse Socket.IO ile gönder
  if (message) {
    socket.emit("chat", { username: username.innerText, message: message });
    input.value = ""; // Giriş alanını temizle
  }
});
