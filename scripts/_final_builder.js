const fs = require("fs");
const BT = String.fromCharCode(96);
const NL = String.fromCharCode(10);
const sd = "C:/Users/ADV07/Documents/jrclaw-system/scripts";
const tp = "C:/Users/ADV07/Documents/jrclaw-system/src/components/prazos/workspace/workspace-view.tsx";

// Load parts 1-4
let c = "";
for (let i = 1; i <= 4; i++) {
  const jp = sd + "/_ws_part" + i + ".json";
  if (fs.existsSync(jp)) c += JSON.parse(fs.readFileSync(jp, "utf-8"));
}
console.log("Parts 1-4:", c.length);

// REMAINING_B64 placeholder - will be replaced
const remaining = Buffer.from("PLACEHOLDER", "base64").toString("utf-8");
c += remaining;
fs.writeFileSync(tp, c, "utf-8");
console.log("Written", c.length, "chars");