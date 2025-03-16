// Socket.IO Bağlantısı
const socket = io();

// HTML Elementleri
const textBox = document.getElementById("text-box");
const typingBox = document.getElementById("typing");
const username = document.getElementById("only-username").innerText;
const friendsListContainer = document.getElementById("friends-list");
const infoName = document.getElementById("info-box");
const addButton = document.getElementById("add-friend-button");
const friendInput = document.getElementById("add-friend-text");
const display = document.getElementById("display");

const callName = document.querySelector(".call-name");
const callStatus = document.querySelector(".call-status");
const userCall = document.querySelector(".user-call");
const startCallButton = document.getElementById("ara");
const answerButton = document.getElementById("answerButton");
const finishCallButton = document.getElementById("rejectButton");
let modal = document.getElementById("callModal");
const aramayiSonlandir = document.getElementById('bitir')
const callCounter = document.getElementById("counter")

const loggedUser = username;

let activeFriend2 = "";
let activeChat = [];
let msgID = "";

let seconds = 0;
let minutes = 0;
let intervalId;

// Sayfa yüklendiğinde arkadaşları ve okunmamış mesajları listele
window.addEventListener("DOMContentLoaded", async () => {
  if (!username) {
    alert("Kullanıcı adı bulunamadı.");
    return;
  }
  socket.emit("register", username);
  await displayFriends();
  await fetchUnreadMessages();
});

// Arkadaş ekleme
addButton.addEventListener("click", async () => {
  const friendUsername = friendInput.value;

  if (friendUsername) {
    const response = await fetch("/find-friend", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username: friendUsername }),
    });

    const data = await response.json();

    if (data.success) {
      alert(`${friendUsername} arkadaş olarak eklendi`);
      const friendDiv = document.createElement("div");
      friendDiv.classList.add("user");
      friendDiv.textContent = friendUsername;
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
      friendsListContainer.innerHTML = "";
      data.friends.forEach((friend) => {
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

// Aktif sohbet açma ve okunmamış mesajları sıfırlama
async function openChat(friend) {
  startCallButton.style.display = "block";

  activeFriend2 = friend;
  infoName.innerHTML = `<p><b>${friend}</b></p>`;

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
      renderMessages(activeChat, friend);

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

// Okunmamış mesajları alma
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
      Object.entries(data.unreadMessages).forEach(([friend, count]) => {
        const notificationElement = document.getElementById(`notif-${friend}`);
        if (notificationElement) {
          notificationElement.textContent = count > 0 ? ` (${count})` : "";
        }
      });
    }
  } catch (error) {
    console.error("Okunmamış mesajlar alınırken hata oluştu:", error);
  }
}

// Mesajları görüntüleme
function renderMessages(messages, activeFriend) {
  display.innerHTML = "";

  messages.forEach((msg) => {
    const messageElement = document.createElement("div");
    messageElement.classList.add("message");

    const upperBox = document.createElement("div");
    upperBox.classList.add("upper-box");

    const messageButton = document.createElement("img");
    messageButton.classList.add("message-button");
    messageButton.src = "img/message-icon.png";

    messageElement.addEventListener("mouseover", function () {
      messageButton.style.display = "block";
    });

    messageElement.addEventListener("mouseout", function () {
      messageButton.style.display = "none";
    });

    messageButton.addEventListener("click", (event) => {
      msgID = msg._id;

      const contextMenu = document.getElementById("context-menu");
      const { clientX: mouseX, clientY: mouseY } = event;
      contextMenu.style.top = `${mouseY}px`;
      contextMenu.style.left = `${mouseX}px`;
      contextMenu.style.display = "flex";

      event.stopPropagation();

      document.addEventListener("click", (event) => {
        if (!contextMenu.contains(event.target)) {
          contextMenu.style.display = "none";
        }
      });
    });

    const user = document.createElement("div");
    user.classList.add("name");
    const content = document.createElement("div");
    content.classList.add("content");

    let timeOnly = "";

    if (msg.created_at == undefined) {
      timeOnly = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else {
      const isoDate = msg.created_at; // ISO formatındaki tarih
      timeOnly = new Date(isoDate).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    user.innerHTML = `<b>${msg.sender_id.username}:</b>`;
    content.innerHTML = `${msg.content}`;

    const lowerBox = document.createElement("div");
    lowerBox.classList.add("lower-box");

    const time = document.createElement("div");
    time.classList.add("time");

    time.innerHTML = timeOnly;

    lowerBox.appendChild(content);
    lowerBox.appendChild(time);

    upperBox.appendChild(user);
    upperBox.appendChild(messageButton);
    messageElement.appendChild(upperBox);
    messageElement.appendChild(lowerBox);
    display.appendChild(messageElement);
  });

  display.scrollTop = display.scrollHeight;
}

// Mesaj gönderme
document.getElementById("send-button").addEventListener("click", async (e) => {
  e.preventDefault();
  const messageContent = {
    content: textBox.value,
    recieverName: activeFriend2, // Gereksiz boşlukları trim edelim
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
      // Yeni mesajı mevcut aktif chate ekle
      activeChat.push({
        sender_id: { username: username },
        content: messageContent.content,
      });

      // Mesajları yeniden render et
      renderMessages(activeChat, activeFriend2);

      // Metin kutusunu temizle
      textBox.value = "";
    } else {
      console.error("Mesaj gönderim hatası:", data.error);
    }
  } catch (error) {
    console.error("Mesaj gönderim hatası:", error);
  }
});

// Gelen mesajları dinleme
socket.on(`chat${username}`, (message) => {
  // Yeni gelen mesajı mevcut aktif chate ekle
  activeChat.push(message);

  // Gelen mesajı anında ekrana yansıt
  if (message.sender_id.username == activeFriend2) {
    pushMessage(message);
  }
});

function pushMessage(message) {
  console.log(message);

  const display = document.getElementById("display");

  const messageElement = document.createElement("div");
  messageElement.classList.add("message");

  const upperBox = document.createElement("div");
  upperBox.classList.add("upper-box");

  const messageButton = document.createElement("img");
  messageButton.classList.add("message-button");

  messageButton.src = "img/message-icon.png";

  messageButton.addEventListener("click", (event) => {
    msgID = message.id;
    log(msgID);

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
      if (!contextMenu.contains(event.target)) {
        contextMenu.style.display = "none";
      }
    });
  });

  const user = document.createElement("div");
  user.classList.add("name");

  const content = document.createElement("div");
  content.classList.add("content");

  user.innerHTML = `<b>${message.sender_id.username}:</b>`;
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
}

// Mesaj silme
document.getElementById("delete").addEventListener("click", async () => {
  try {
    console.log("Silinmek istenen mesaj ID:", msgID);

    const response = await fetch("/delete-message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ msgID }),
    });

    const result = await response.json();

    if (result.success) {
      alert("Mesaj silindi.");
      activeChat = activeChat.filter((msg) => msg._id !== msgID);
      renderMessages(activeChat, activeFriend2);
    } else {
      alert(`Mesaj silinemedi: ${result.message}`);
    }
  } catch (err) {
    console.error("Mesaj silinirken hata oluştu:", err);
  }
});

async function printMessage(message) {
  const display = document.getElementById("display");

  const messageElement = document.createElement("div");
  messageElement.classList.add("message");

  const upperBox = document.createElement("div");
  upperBox.classList.add("upper-box");

  const messageButton = document.createElement("img");
  messageButton.classList.add("message-button");

  messageButton.src = "img/message-icon.png";

  messageButton.addEventListener("click", (event) => {
    msgID = message._id;
    log(msgID);

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

  if (activeFriend2 === message.sender) {
    display.appendChild(messageElement);
  }
  //display.appendChild(messageElement);
  display.scrollTop = display.scrollHeight;
}

// Okunmamış mesajlar için periyodik kontrol

//*------------------------------------------------------------------------------------------------------------

let localStream;
let peerConnection;
let isMicOpen = false;

const configuration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

startCallButton.addEventListener("click", async () => {
  if (activeFriend2 == "") {
    alert("Lütfen bir arkadaş seçin");
    return;
  } else {
    try {

      aramayiSonlandir.style.display = 'block'
      startCallButton.style.display = 'none';
      callName.innerText = activeFriend2;
      callStatus.innerText = "Aranıyor...";
      finishCallButton.style.display = "block"

      localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      isMicOpen = true;

      peerConnection = new RTCPeerConnection(configuration);

      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          const candidateSet = {
            recipient: activeFriend2,
            candidate: event.candidate,
          };
          

          socket.emit("ice-candidate", candidateSet);
        }
      };

      peerConnection.ontrack = (event) => {
        remoteAudio.srcObject = event.streams[0];
      };

      localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
      });

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      const offerSet = {
        user: loggedUser,
        recipient: activeFriend2,
        offer: offer,
      };

      socket.emit("offer", offerSet);

      

    } catch (error) {
      console.error("Mikrofon açma hatası:", error);
    }
  }
});

finishCallButton.addEventListener("click", () => {
  callStatus.textContent = 0 + ":"  +0;
  callStatus.display = "none";
    closeModal();
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }

  isMicOpen = false;
});

aramayiSonlandir.addEventListener('click',()=>{


  callName.innerText = "";
  callStatus.innerText = "";
  callStatus.textContent = 0 + ":" + 0;
  callStatus.style.display = "none";
  aramayiSonlandir.style.display = 'none';
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }

  isMicOpen = false;


})

socket.on('telefon-acildi',bool=>{

if(bool){


let intervalId = setInterval(function() {
    seconds++;
    
    if (seconds === 60) {
        seconds = 0;
        minutes++;
    }
    
    // Sayacı "MM:SS" formatında güncelle
    let displayMinutes = minutes < 10 ? '0' + minutes : minutes;
    let displaySeconds = seconds < 10 ? '0' + seconds : seconds;
    
    callStatus.textContent = displayMinutes + ":" + displaySeconds;
    
}, 1000);


}

})

socket.on("offer", async (offerSet) => {
  peerConnection = new RTCPeerConnection(configuration);

  const { user, recipient, offer } = offerSet;

 document.getElementById("callerName").innerText = user;

  modal.style.display = "block";


  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      const candidateSet = {
        recipient: activeFriend2,
        candidate: event.candidate,
      };

      socket.emit("ice-candidate", candidateSet);
    }
  };

  peerConnection.ontrack = (event) => {
    remoteAudio.srcObject = event.streams[0];
  };

  await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

  localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
  });

  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);

  const answerSet = { recipient: activeFriend2, answer: answer };


  //!TELEFONU AÇ
  answerButton.addEventListener("click", () => {
    
    aramayiSonlandir.style.display = 'block'
    startCallButton.style.display = 'none';
    callName.innerText = user;
    callName.style.display = 'block';

   socket.emit('telefon-acildi',{bool:true,user:user});


    closeModal();

    // Sayacı "MM:SS" formatında başlat
    callStatus.style.display = "block";   
    callStatus.textContent = 0 + ":" + 0;

    if (intervalId) {
        clearInterval(intervalId); // Önceki sayacı temizle
        seconds = 0;
        minutes = 0;
    }
    intervalId = setInterval(function() {
        seconds++;
        
        if (seconds === 60) {
            seconds = 0;
            minutes++;
        }
        
        // Sayacı "MM:SS" formatında güncelle
        let displayMinutes = minutes < 10 ? '0' + minutes : minutes;
        let displaySeconds = seconds < 10 ? '0' + seconds : seconds;
        
        callStatus.textContent = displayMinutes + ":" + displaySeconds;
        
    }, 1000); // 1 saniye arayla sayacı artır

    socket.emit("answer", answerSet);
    
  });
});

socket.on("answer", async (answer) => {
  await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
});

socket.on("ice-candidate", (candidate) => {
  peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
});


function closeModal() {
  modal.style.display = "none";
}

// Eğer kullanıcı modal dışına tıklarsa, modal'ı kapat
window.onclick = function(event) {
  if (event.target == modal) {
      closeModal();
  }
}