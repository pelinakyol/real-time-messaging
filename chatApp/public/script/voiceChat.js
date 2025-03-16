const socket = io();
let localStream;
let peerConnection;
let isMicOpen = false;

let seconds = 0;
let minutes = 0;
let intervalId;

const configuration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

const startCallButton = document.querySelector(".ara");
const cevaplaButonu = document.querySelector(".cevapla");
const finishCallButton = document.querySelector(".reddet");

startCallButton.addEventListener("click", async () => {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    isMicOpen = true;

    peerConnection = new RTCPeerConnection(configuration);

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", event.candidate);
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

    socket.emit("offer", offer);

    // Sayacı "MM:SS" formatında başlat
        
    document.getElementById("counter").textContent = 0 + ":" + 0;

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
        
        document.getElementById("counter").textContent = displayMinutes + ":" + displaySeconds;
        
    }, 1000); // 1 saniye arayla sayacı artır

  } catch (error) {
    console.error("Mikrofon açma hatası:", error);
  }
});

finishCallButton.addEventListener("click", () => {

  document.getElementById("counter").textContent = 0 + ":" + 0;

  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }

  isMicOpen = false;
});

socket.on("offer", async (offer) => {
  peerConnection = new RTCPeerConnection(configuration);

  console.log("teklif geldi");

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("ice-candidate", event.candidate);
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

  socket.emit("answer", answer);
});

socket.on("answer", async (answer) => {
  await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
});

socket.on("ice-candidate", (candidate) => {
  peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
});
