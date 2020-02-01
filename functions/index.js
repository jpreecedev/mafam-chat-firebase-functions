"use strict";

require("promise-polyfill");

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const parseMessages = require("./parseMessages").parseMessages;

admin.initializeApp();

exports.sendChatMessageNotification = functions.database
  .ref("/chats/{chatUid}/messages")
  .onWrite((change, context) => {
    console.log("A write operation has happened.");

    let chatRef;

    return new Promise((resolve, reject) => {
      const chatUid = context.params.chatUid;

      // Get list of participants
      chatRef = admin.database().ref(`/chats/${chatUid}`);
      chatRef.on("value", async snapshot => {
        console.log("The snapshot change was triggered");

        const participants = snapshot.val().participants;
        const parsedMessages = parseMessages(change.after.val());
        const lastMessage = parsedMessages[parsedMessages.length - 1];

        const userRefs = Object.keys(participants)
          .filter(x => x !== lastMessage.sender)
          .map(participant =>
            admin
              .database()
              .ref(`/users/${participant}/notificationTokens`)
              .once("value")
          );
        const resolved = await Promise.all(userRefs);
        const tokens = resolved
          .map(r => {
            const val = r.val();
            if (!val) {
              return null;
            }

            const keys = Object.keys(r.val());
            if (keys && keys.length > 0) {
              return Object.keys(r.val())[0];
            }
            return null;
          })
          .filter(x => x !== null);

        const payload = {
          notification: {
            title: `New message from ${lastMessage.senderName}`,
            body: lastMessage.content,
            icon: lastMessage.avatar
          }
        };

        console.log("Sending notification", payload);
        console.log("Sending to ...", tokens);

        return admin
          .messaging()
          .sendToDevice(tokens, payload)
          .then(resolve)
          .catch(reject)
          .finally(() => chatRef.off("value"));
      });
    });
  });
