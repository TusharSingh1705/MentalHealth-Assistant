// Shared in-memory store for fallback mode when MongoDB is offline
const memUsers = [];
let memConversations = [];
const memMessages = [];

module.exports = {
  memUsers,
  getMemConversations: () => memConversations,
  setMemConversations: (convs) => { memConversations = convs; },
  memMessages
};
