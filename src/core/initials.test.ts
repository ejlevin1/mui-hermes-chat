import { avatarColor, initials } from "./initials";
import { ACCENTS } from "./types";

test.each([
  ["Ada LoveLace", "AL"],
  ["ada@x.me", "AD"],
  ["ada.lovelace@x.me", "AL"],
  ["card-chat", "CC"],
  ["hostbot", "HO"],
  ["  a  b  ", "AB"],
  ["Élodie Ñúñez", "ÉÑ"],
  ["", ""],
  ["!!!", ""],
  ["x", "X"],
])("initials(%j) -> %j", (input, want) => {
  expect(initials(input)).toBe(want);
});

test("avatarColor is stable and within ACCENTS", () => {
  for (const k of ["a", "card-chat", "hostbot", "", "Élodie"]) {
    expect(ACCENTS).toContain(avatarColor(k));
    expect(avatarColor(k)).toBe(avatarColor(k));
  }
});
