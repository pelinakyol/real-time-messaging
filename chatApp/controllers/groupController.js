const Group = require("../models/Group");
const User = require("../models/newUser");
const Message = require("../models/Message");
const { sendSocketMessage } = require("../utils/socketUtils");

// Grupları listeleme fonksiyonu

const listGroups = async (req, res) => {
  try {
    const userId = res.locals.user._id;

    const groups = await Group.find({ members: userId })
      .select("name admin last_message")
      .populate("admin", "username");

    if (!groups || groups.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Üyesi olduğunuz grup bulunamadı." });
    }

    res.status(200).json({ success: true, groups });
  } catch (error) {
    console.error("Gruplar listelenirken hata oluştu:", error);
    res.status(500).json({
      success: false,
      message: "Gruplar listelenirken bir hata oluştu.",
    });
  }
};

// Grup oluşturma fonksiyonu
const createGroup = async (req, res) => {
  try {
    const { name, memberUsernames } = req.body;
    if (!name) {
      return res
        .status(400)
        .json({ success: false, message: "Grup adı eksik." });
    }
    if (!memberUsernames || !Array.isArray(memberUsernames)) {
      return res.status(400).json({
        success: false,
        message: "Kullanıcı listesi eksik veya hatalı.",
      });
    }

    const existingGroup = await Group.findOne({ name });
    if (existingGroup) {
      return res
        .status(400)
        .json({ success: false, message: "Bu isimde bir grup zaten mevcut." });
    }

    const userId = res.locals.user._id;
    const members = await User.find({ username: { $in: memberUsernames } });

    if (!members || members.length !== memberUsernames.length) {
      return res.status(400).json({
        success: false,
        message: "Bazı kullanıcı adları mevcut değil.",
      });
    }

    const memberIds = members.map((member) => member._id);

    const newGroup = new Group({
      name,
      admin: userId,
      members: [userId, ...memberIds],
    });

    await newGroup.save();
    res.status(201).json({ success: true, group: newGroup });
  } catch (error) {
    console.error("Grup oluşturulurken hata oluştu:", error);
    res.status(500).json({
      success: false,
      message: "Grup oluşturulurken bir hata oluştu.",
    });
  }
};

// Gruba üye ekleme fonksiyonu
const addMemberToGroup = async (req, res) => {
  try {
    const { groupId, newMemberUsername } = req.body;
    const group = await Group.findById(groupId);

    if (!group) {
      return res
        .status(404)
        .json({ success: false, message: "Grup bulunamadı." });
    }

    const newMember = await User.findOne({ username: newMemberUsername });
    if (!newMember) {
      return res
        .status(404)
        .json({ success: false, message: "Kullanıcı bulunamadı." });
    }

    if (!group.members.includes(newMember._id)) {
      group.members.push(newMember._id);
      await group.save();
      res
        .status(200)
        .json({ success: true, message: "Kullanıcı başarıyla gruba eklendi." });

      // Socket.IO ile gruba katılım bildirimini gönder
      const user = await User.findById(res.locals.user._id);
      // sendSocketMessage(newMember._id, {
      //   sender: user.username,
      //   message: `${group.name} grubuna katıldınız!`,
      //   group: group.name,
      // });
    } else {
      res
        .status(400)
        .json({ success: false, message: "Kullanıcı zaten grup üyesidir." });
    }
  } catch (error) {
    console.error("Gruba üye eklenirken hata oluştu:", error);
    res
      .status(500)
      .json({ success: false, message: "Üye eklenirken bir hata oluştu." });
  }
};

// Grubu terk etme fonksiyonu
const leaveGroup = async (req, res) => {
  try {
    const { groupId } = req.body;
    const userId = res.locals.user._id;

    const group = await Group.findById(groupId);

    if (!group) {
      return res
        .status(404)
        .json({ success: false, message: "Grup bulunamadı." });
    }

    if (group.members.includes(userId)) {
      group.members = group.members.filter(
        (memberId) => memberId.toString() !== userId.toString()
      );
      await group.save();

      res.status(200).json({ success: true, message: "Grubu terk ettiniz." });
    } else {
      res
        .status(400)
        .json({ success: false, message: "Bu grubun üyesi değilsiniz." });
    }
  } catch (error) {
    console.error("Grup terk edilirken hata oluştu:", error);
    res.status(500).json({
      success: false,
      message: "Grup terk edilirken bir hata oluştu.",
    });
  }
};

// Gruba mesaj gönderme fonksiyonu
const sendMessageToGroup = async (req, res) => {
  try {
    const { groupId, message, sender } = req.body;
    const userId = res.locals.user._id;

    const user = await User.findById(userId);
    const group = await Group.findById(groupId);

    if (!user || !group) {
      return res
        .status(404)
        .json({ success: false, message: "Kullanıcı veya grup bulunamadı." });
    }

    if (!group.members.includes(user._id)) {
      return res
        .status(400)
        .json({ success: false, message: "Kullanıcı bu grubun üyesi değil." });
    }

    group.messages.push({ username: user.username, message });
    await group.save();

    // Grup üyelerine anında mesaj iletme (Socket.IO üzerinden)
    for (let memberId of group.members) {
      if (memberId.toString() !== user._id.toString()) {
        sendSocketMessage(memberId, {
          sender: user.username,
          message: message,
          group: group.name,
        });
      }
    }

    res
      .status(200)
      .json({ success: true, message: "Mesaj başarıyla gönderildi." });
  } catch (error) {
    console.error("Gruba mesaj gönderilirken hata oluştu:", error);
    res.status(500).json({
      success: false,
      message: "Mesaj gönderilirken bir hata oluştu.",
    });
  }
};

// Grup bilgisini güncelleme fonksiyonu
const updateGroupInfo = async (req, res) => {
  try {
    const { groupId, newName } = req.body;
    const group = await Group.findById(groupId);

    if (!group) {
      return res
        .status(404)
        .json({ success: false, message: "Grup bulunamadı." });
    }

    group.name = newName;
    await group.save();
    res
      .status(200)
      .json({ success: true, message: "Grup adı başarıyla güncellendi." });
  } catch (error) {
    console.error("Grup bilgileri güncellenirken hata oluştu:", error);
    res.status(500).json({
      success: false,
      message: "Grup bilgileri güncellenirken bir hata oluştu.",
    });
  }
};

// Grup detaylarını getirme fonksiyonu
const getGroupDetails = async (req, res) => {
  console.log("getGroupDetails fonksiyonu çalışıyor");
  try {
    const { groupId } = req.query;


    // Grubu detaylarıyla buluyoruz ve admin ile üyeleri populate ediyoruz.
    const group = await Group.findById(groupId)
      .populate("admin", "username email") // Admin bilgileri
      .populate("members", "username email"); // Üyelerin bilgileri

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Grup bulunamadı.",
      });
    }

    res.status(200).json({
      success: true,
      group: {
        id: group._id,
        name: group.name,
        admin: group.admin, // Admin bilgileri
        members: group.members, // Üyeler bilgileri
        createdAt: group.createdAt, // Oluşturulma tarihi
        updatedAt: group.updatedAt, // Güncellenme tarihi
        lastMessage: group.last_message || "Henüz mesaj yok", // Son mesaj (opsiyonel)
      },
    });
  } catch (error) {
    console.error("Grup detayları alınırken hata oluştu:", error);
    res.status(500).json({
      success: false,
      message: "Grup detayları alınırken bir hata oluştu.",
    });
  }
};

const groupMessages = async (req, res) => {
  const { groupId } = req.params;

  try {
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).send("Grup bulunamadı");
    }

    res.render("groupChat", { group });
  } catch (err) {
    console.log(err);
    res.status(500).send("Grup verisi alınamadı");
  }
};

module.exports = {
  createGroup,
  listGroups,
  addMemberToGroup,
  leaveGroup,
  sendMessageToGroup,
  updateGroupInfo,
  getGroupDetails,
  groupMessages,
};
