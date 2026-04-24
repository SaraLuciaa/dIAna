import { getEnv } from "./config/env.js";
import { createChatApp } from "./chatServer.js";

const app = createChatApp();
const { CHAT_API_PORT } = getEnv();

app.listen(CHAT_API_PORT, () => {
  console.log(`Chat API listening on http://localhost:${CHAT_API_PORT}`);
});
