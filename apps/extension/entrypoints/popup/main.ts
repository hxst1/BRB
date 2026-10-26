import { browser } from "wxt/browser";
import { brand } from "@repo/brand";
import { mountSite } from "@/lib/frame";

document.title = brand.name;
document.querySelector(".splash")!.textContent = brand.name;
void mountSite(document.body);
void browser.runtime.sendMessage("refresh-badge").catch(() => undefined);
