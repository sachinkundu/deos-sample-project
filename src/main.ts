import "./styles.css";
import { PackingListApp } from "./app";
import { PackingStorage } from "./storage";

const root = document.querySelector<HTMLElement>("#app");
if (!root) throw new Error("The application root is missing.");

new PackingListApp({
  root,
  storage: new PackingStorage(window.localStorage),
  cryptoSource: window.crypto,
  windowRef: window,
  confirmAction: (message) => window.confirm(message),
}).start();
