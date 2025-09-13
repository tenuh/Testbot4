
require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true});

const admins = process.env.ADMIN_IDS.split(',').map(id => parseInt(id));
const users = {};
const queue = [];

function isAdmin(userId) {
  return admins.includes(userId);
}

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const opts = {
    reply_markup: {
      inline_keyboard: [
        [{ text: "👨 Male", callback_data: "profile_male"}],
        [{ text: "👩 Female", callback_data: "profile_female"}],
        [{ text: "🌈 Other", callback_data: "profile_other"}],
        [{ text: "🔀 Random Chat", callback_data: "start_chat"}],
        [{ text: "⚖️ Moderate", callback_data: "moderate"}],
...(isAdmin(msg.from.id)? [[{ text: "🛡️ Admin Panel", callback_data: "admin_panel"}]]: [])
      ]
}
};
  bot.sendMessage(chatId, "Welcome! Choose your profile:", opts);
});

bot.on("callback_query", (query) => {
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const data = query.data;

  if (data.startsWith("profile_")) {
    const profile = data.split("_")[1];
    users[userId] = { profile};
    bot.sendMessage(chatId, `Profile set to ${profile}`);
}

  if (data === "start_chat") {
    if (queue.length && queue[0]!== userId) {
      const partnerId = queue.shift();
      users[userId].partner = partnerId;
      users[partnerId].partner = userId;
      bot.sendMessage(chatId, "🔗 Connected! Say hi.");
      bot.sendMessage(partnerId, "🔗 Connected! Say hi.");
} else {
      queue.push(userId);
      bot.sendMessage(chatId, "⏳ Waiting for a partner...");
}
}

  if (data === "moderate") {
    bot.sendMessage(chatId, "Moderation options:", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🚫 Report", callback_data: "report"}],
          [{ text: "❌ End Chat", callback_data: "end_chat"}]
        ]
}
});
}

  if (data === "report") {
    bot.sendMessage(chatId, "🚨 User reported.");
}

  if (data === "end_chat") {
    const partnerId = users[userId] && users[userId].partner;
    if (partnerId) {
      bot.sendMessage(partnerId, "❌ Chat ended.");
      users[userId].partner = null;
      users[partnerId].partner = null;
}
    bot.sendMessage(chatId, "✅ Chat ended.");
}

  if (data === "admin_panel" && isAdmin(userId)) {
    bot.sendMessage(chatId, "🛡️ Admin Panel:", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "📢 Broadcast", callback_data: "broadcast"}],
          [{ text: "👑 Promote User", callback_data: "promote"}],
          [{ text: "🗑️ Remove User", callback_data: "remove"}]
        ]
}
});
}

  if (data === "broadcast") {
    bot.sendMessage(chatId, "Send your broadcast message:");
    users[userId].awaitingBroadcast = true;
}

  if (data === "promote") {
    bot.sendMessage(chatId, "Send user ID to promote:");
    users[userId].awaitingPromote = true;
}

  if (data === "remove") {
    bot.sendMessage(chatId, "Send user ID to remove:");
    users[userId].awaitingRemove = true;
}
});

bot.on("message", (msg) => {
  const userId = msg.from.id;
  const partnerId = users[userId] && users[userId].partner;

  if (users[userId]?.awaitingBroadcast && isAdmin(userId)) {
    for (let id in users) {
      bot.sendMessage(id, `📢 Broadcast: ${msg.text}`);
}
    users[userId].awaitingBroadcast = false;
    return;
}

  if (users[userId]?.awaitingPromote && isAdmin(userId)) {
    const promoteId = parseInt(msg.text);
    if (!admins.includes(promoteId)) {
      admins.push(promoteId);
      bot.sendMessage(userId, `✅ User ${promoteId} promoted to admin.`);
}
    users[userId].awaitingPromote = false;
    return;
}

  if (users[userId]?.awaitingRemove && isAdmin(userId)) {
    const removeId = parseInt(msg.text);
    delete users[removeId];
    bot.sendMessage(userId, `🗑️ User ${removeId} removed.`);
    users[userId].awaitingRemove = false;
    return;
}

  if (partnerId && msg.text &&!msg.text.startsWith("/")) {
    bot.sendMessage(partnerId, msg.text);
}
});


