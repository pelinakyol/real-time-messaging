const socket = io();

const textBox = document.getElementById("text-box");
const typingBox = document.getElementById("typing");
const username = document.getElementById("only-username").innerText;

socket.on(`chat${username}`, (message) => {
  printMessage(message);
});

let msgID = "";

document.getElementById("delete").addEventListener("click", async () => {
  console.log("Silinmek istenen mesaj ID:", msgID);

  try {
    const response = await fetch("/delete-message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ msgID }),
    });

    const result = await response.json();

    if (result.success) {
      console.log("Mesaj başarıyla silindi:", result.message);
      alert("Mesaj silindi.");
      activeChat = activeChat.filter((msg) => msg._id !== msgID);
    } else {
      console.error("Hata:", result.message);
      alert(`Mesaj silinemedi: ${result.message}`);
    }
  } catch (err) {
    console.error("Mesaj silinirken hata oluştu:", err);
    alert("Mesaj silinirken bir hata oluştu.");
  }

  console.log(activeChat, activeFriend2);

  renderMessages(activeChat, activeFriend2);
});


function printMessage(message) {
  const display = document.getElementById("display");

  const messageElement = document.createElement("div");
  messageElement.classList.add("message");

  const upperBox = document.createElement("div");
  upperBox.classList.add("upper-box");

  const messageButton = document.createElement("img");
  messageButton.classList.add("message-button");

  messageButton.src = "img/message-icon.png";

  messageButton.addEventListener("click", (event) => {
    document.getElementById("delete").addEventListener("click", () => {
      console.log("sil");
    });

    const nameElement = upperBox.querySelector(".name");
    const nameText = nameElement.textContent.trim();

    const contentElement = upperBox.parentElement.querySelector(".content");
    const contentText = contentElement.textContent.trim(); // İçerik

    const contextMenu = document.getElementById("context-menu");

    const { clientX: mouseX, clientY: mouseY } = event;

    contextMenu.style.top = `${mouseY}px`;
    contextMenu.style.left = `${mouseX}px`;
    contextMenu.style.display = "flex";
    contextMenu.style.flexDirection = "column";

    event.stopPropagation();

    document.addEventListener("click", (event) => {
      // Eğer tıklanan yer menünün kendisi veya buton değilse kapat
      if (!contextMenu.contains(event.target)) {
        contextMenu.style.display = "none";
      }
    });
  });

  const user = document.createElement("div");
  user.classList.add("name");
  const content = document.createElement("div");
  content.classList.add("content");

  user.innerHTML = `<b>${message.sender}:</b>`;
  content.innerHTML = message.content;

  messageElement.addEventListener("mouseover", function () {
    messageButton.style.display = "block";
  });

  messageElement.addEventListener("mouseout", function () {
    messageButton.style.display = "none";
  });

  upperBox.appendChild(user);
  upperBox.appendChild(messageButton);
  messageElement.appendChild(upperBox);
  messageElement.appendChild(content);

  display.appendChild(messageElement);
  display.scrollTop = display.scrollHeight;
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!username) {
    alert("Kullanıcı adı bulunamadı.");
    return;
  }
  socket.emit("register", username);
});

document.getElementById("send-button").addEventListener("click", async (e) => {
  e.preventDefault();
  const messageContent = {
    content: document.getElementById("text-box").value,
    recieverName: document.getElementById("info-box").innerText,
  };
  if (messageContent.content.trim() === "") {
    alert("Boş mesaj gönderilemez.");
    return;
  }

  try {
    const response = await fetch("/send-message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: messageContent }),
    });

    const data = await response.json();
    if (data.success) {
      printMessage({
        sender: username,
        content: messageContent.content,
      });
      console.log("Mesaj başarıyla gönderildi");
      document.getElementById("text-box").value = ""; // Mesaj kutusunu temizle
    } else {
      console.error("Mesaj gönderim hatası:", data.error);
    }
  } catch (error) {
    console.error("Mesaj gönderim hatası:", error);
  }
});

// Gelen mesajları dinle
socket.on("private_message", (data) => {
  if (activeFriend == data.sender) {
    displayMessage(data.sender, data.message);
  } else {
    console.log("bildirim");
  }
});

// Mesajları görüntüleme
function displayMessage(sender, message) {
  const display = document.getElementById("display");
  const messageElement = document.createElement("div");
  messageElement.classList.add("message");

  const user = document.createElement("div");
  user.classList.add("name");
  const content = document.createElement("div");
  content.classList.add("content");

  user.innerHTML = `<b>${sender}:</b>`;
  content.innerHTML = message;

  messageElement.appendChild(user);
  messageElement.appendChild(content);

  display.appendChild(messageElement);
  display.scrollTop = display.scrollHeight; // Otomatik kaydırma
}
