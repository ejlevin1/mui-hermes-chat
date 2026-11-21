import * as api from "./index";
test("exports the release version", () => { expect(api.MUI_HERMES_CHAT_VERSION).toBe("0.1.1"); });
test("exports the contract section 5 runtime names", () => {
  for (const n of ["parseChatEvents", "CHAT_EVENTS_CONTRACT", "runTurn", "sendApproval", "startOver", "fetchHistoryPage",
    "ChatHttpError", "initials", "avatarColor", "ToolFamily", "hermesChatAdapter", "HermesChat", "ParticipantAvatar",
    "ToolRow", "ToolStepGroup", "ToolDetailDrawer", "SessionInfoDrawer", "ChatComposer", "Approval"]) {
    expect((api as Record<string, unknown>)[n], n).toBeDefined();
  }
  expect(api.CHAT_EVENTS_CONTRACT).toBe("hermes-chat-events/2");
});
