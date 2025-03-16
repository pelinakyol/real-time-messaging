// Gerekli elemanları tanımlıyoruz
const friendsListContainer = document.getElementById("friends-list");
const infoName = document.getElementById("info-box"); // Bu kısmı ekledik
const addButton = document.getElementById("add-friend-button");
const friendInput = document.getElementById("add-friend-text");

// Sayfa yüklendiğinde arkadaşları ve okunmamış mesajları listele
window.addEventListener("DOMContentLoaded", async () => {
  await displayFriends();
  await fetchUnreadMessages();
});

// Arkadaş ekleme
addButton.addEventListener("click", async () => {
  const username = friendInput.value;

  if (username) {
    const response = await fetch("/find-friend", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username }),
    });

    const data = await response.json();

    if (data.success) {
      alert(`${username} arkadaş olarak eklendi`);

      const friendDiv = document.createElement("div");
      friendDiv.classList.add("user");
      friendDiv.textContent = username;
      friendsListContainer.appendChild(friendDiv);
    } else {
      alert(data.message);
    }
  } else {
    alert("Lütfen bir kullanıcı adı girin.");
  }
});

// Arkadaşları listeleme fonksiyonu
async function displayFriends() {
  try {
    const response = await fetch("/disp-friend", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (data.success) {
      friendsListContainer.innerHTML = ""; // Önceki arkadaşları temizle
      const friendsList = data.friends;

      friendsList.forEach((friend) => {
        const friendButton = document.createElement("button");
        friendButton.classList.add("user");
        friendButton.innerHTML = `<p><b>${friend}</b><span class="notification" id="notif-${friend}"></span></p>`;
        friendButton.onclick = () => openChat(friend);

        friendsListContainer.appendChild(friendButton);
      });
    } else {
      alert("Arkadaş listesi alınamadı.");
    }
  } catch (error) {
    console.error("Arkadaş listesi yüklenirken hata oluştu:", error);
    alert("Arkadaş listesi yüklenirken bir hata oluştu.");
  }
}

let activeFriend2 = "";
let activeChat = "";

// Aktif sohbet açma ve okunmamış mesajları sıfırlama
async function openChat(friend) {
  const activeFriend = friend; // Aktif arkadaş değişkenine atama
  activeFriend2 = friend;
  infoName.innerHTML = `<p><b>${friend}</b></p>`; // Sohbet edilen arkadaşın adını yazdır

  // Bildirimi sıfırla
  const notificationElement = document.getElementById(`notif-${friend}`);
  if (notificationElement) {
    notificationElement.textContent = "";
  }

  try {
    const response = await fetch("/get-chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ senderName: friend }),
    });

    const data = await response.json();

    if (data.success) {

      activeChat = data.message;
      renderMessages(data.message, activeFriend);

      // Okunmamış mesajları sıfırla
      await fetch("/mark-as-read", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ senderName: friend }),
      });
    } else {
      console.log("Hata: ", data.message);
    }
  } catch (err) {
    console.log("Bir şeyler ters gitti: ", err);
  }
}

async function fetchUnreadMessages() {
  try {
    const response = await fetch("/unread-messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (data.success) {
      const unreadCounts = data.unreadMessages; // { "friend1": 2, "friend2": 5, ... }
      for (const [friend, count] of Object.entries(unreadCounts)) {
        const notificationElement = document.getElementById(`notif-${friend}`);
        if (notificationElement) {
          notificationElement.textContent = count > 0 ? ` (${count})` : ""; // Bildirimi göster
        }
      }
    }
  } catch (error) {
    console.error("Okunmamış mesajlar alınırken hata oluştu:", error);
  }
}

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
    } else {
      console.error("Hata:", result.message);
      alert(`Mesaj silinemedi: ${result.message}`);
    }
  } catch (err) {
    console.error("Mesaj silinirken hata oluştu:", err);
    alert("Mesaj silinirken bir hata oluştu.");
  }
  

  activeChat = activeChat.filter((msg) => msg._id !== msgID); 


  console.log(activeChat, activeFriend2);
  

  renderMessages(activeChat, activeFriend2);

});


//?------------------------------------------------------------------------------------------------BURADYIZ
// Mesajları UI'ye yazdıran yardımcı fonksiyon
function renderMessages(messages, activeFriend) {
  const display = document.getElementById("display");
  display.innerHTML = ""; // Eski mesajları temizle

  messages.forEach((msg) => {



    if (
      msg.sender_id.username === activeFriend ||
      msg.receiver_id.username === activeFriend
    ) {
      const messageElement = document.createElement("div");
      messageElement.classList.add("message");

      const upperBox = document.createElement("div");
      upperBox.classList.add("upper-box");

      const messageButton = document.createElement("img");
      messageButton.classList.add("message-button");

      messageButton.src = "img/message-icon.png";

      messageButton.style.display = "none";

      messageElement.addEventListener("mouseover", function () {
        messageButton.style.display = "block";
      });

      messageElement.addEventListener("mouseout", function () {
        messageButton.style.display = "none";
      });

      messageButton.addEventListener("click", (event) => {

        msgID = msg._id;

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

      user.innerHTML = `<b>${msg.sender_id.username}:</b>`;
      content.innerHTML = `${msg.content}`;

      upperBox.appendChild(user);
      upperBox.appendChild(messageButton);

      messageElement.appendChild(upperBox);
      messageElement.appendChild(content);
      display.appendChild(messageElement);
    }
  });

  display.scrollTop = display.scrollHeight;
}

// Okunmamış mesajlar için periyodik kontrol
setInterval(fetchUnreadMessages, 5000); // 5 saniyede bir kontrol
