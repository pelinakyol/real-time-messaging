document
  .getElementById("groupCreateButton")
  .addEventListener("click", async (event) => {
    event.preventDefault();

    const groupName = document.getElementById("name").value.trim();
    const membersInput = document
      .getElementById("memberUsernames")
      .value.trim();
    const members = membersInput
      ? membersInput
          .split(",")
          .map((m) => m.trim())
          .filter((m) => m)
      : [];

    // Grup adı ve üyeler kontrolü
    if (!groupName || members.length === 0) {
      alert("Grup adı ve üyeler boş bırakılamaz.");
      return;
    }

    try {
      const response = await fetch("/groupCreate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: groupName, // Grup adı
          memberUsernames: members, // "members" yerine "memberUsernames"
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert("Grup başarıyla oluşturuldu!");
        window.location.href = "/chat"; // Grup oluşturulduktan sonra yönlendirme
      } else {
        alert(
          "Grup oluşturulurken hata: " +
            (result.message || "Bilinmeyen bir hata.")
        );
      }
    } catch (error) {
      console.error("Grup oluşturulurken hata:", error);
      alert("Bir hata oluştu, lütfen tekrar deneyin.");
    }
  });
