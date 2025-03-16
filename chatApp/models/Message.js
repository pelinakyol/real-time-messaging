const crypto = require("crypto");
const mongoose = require("mongoose");

const algorithm = "aes-256-cbc"; // Şifreleme algoritması
const password = "Baton"; // Anahtar türetmek için parola

const MessageSchema = new mongoose.Schema({
  sender_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  receiver_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  content: { 
    type: Object, // JSON formatında saklayacağımız için type Object olmalı
    required: true 
  },
  is_read: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
});

// Şifreleme işlemini `pre('save')` middleware'inde yapıyoruz
MessageSchema.pre("save", async function (next) {
  if (this.isModified("content")) {
    // Şifreleme işlemi
    const iv = crypto.randomBytes(16); // Rastgele IV oluştur
    const salt = crypto.randomBytes(16); // Rastgele Salt oluştur
    const key = crypto.scryptSync(password, salt, 32); // Paroladan anahtar türet
    const cipher = crypto.createCipheriv(algorithm, key, iv);

    let encrypted = cipher.update(this.content, "utf8", "hex");
    encrypted += cipher.final("hex");

    // Şifreli JSON formatını content'e kaydet
    this.content = {
      encryptedData: encrypted,
      iv: iv.toString("hex"),
      salt: salt.toString("hex"),
    };
  }
  next();
});

// Şifre çözme işlemi (model üzerine bir method ekliyoruz)
MessageSchema.methods.decryptContent = function () {
  const { encryptedData, iv, salt } = this.content; // Şifreli JSON formatını al
  const key = crypto.scryptSync(password, Buffer.from(salt, "hex"), 32); // Anahtarı türet
  const decipher = crypto.createDecipheriv(
    algorithm,
    key,
    Buffer.from(iv, "hex")
  );

  let decrypted = decipher.update(encryptedData, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted; // Çözülmüş mesajı döndür
};

const Message = mongoose.model("Message", MessageSchema);

module.exports = Message;
