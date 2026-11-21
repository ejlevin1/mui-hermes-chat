import { MUI_HERMES_CHAT_VERSION } from "./index";
test("exports a version", () => { expect(MUI_HERMES_CHAT_VERSION).toMatch(/^\d+\.\d+\.\d+$/); });
