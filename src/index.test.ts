import * as api from "./index";
test("exports the release version", () => { expect(api.MUI_HERMES_CHAT_VERSION).toBe("0.5.0"); });
test("exports the contract section 5 runtime names", () => {
  for (const n of ["parseChatEvents", "CHAT_EVENTS_CONTRACT", "runTurn", "sendApproval", "startOver", "fetchHistoryPage",
    "ChatHttpError", "initials", "avatarColor", "ToolFamily", "hermesChatAdapter", "HermesChat", "ParticipantAvatar",
    "ToolRow", "ToolStepGroup", "ToolDetailDrawer", "SessionInfoDrawer", "ChatComposer", "Approval",
    "TRANSCRIPT_CONTRACT", "mergeTranscript", "maxSeq", "liveSource", "HermesTranscript", "defaultTranscriptLabels"]) {
    expect((api as Record<string, unknown>)[n], n).toBeDefined();
  }
  expect(api.CHAT_EVENTS_CONTRACT).toBe("hermes-chat-events/2");
});
test("exports the 0.4.0 transcript contract", () => { expect(api.TRANSCRIPT_CONTRACT).toBe("hermes-transcript/1"); });
test("exports the 0.5.0 system role type", () => {
  const role: api.Role = "system";
  expect(role).toBe("system");
});
