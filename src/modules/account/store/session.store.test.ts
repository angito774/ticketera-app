import { beforeEach, describe, expect, it } from "vitest";

import { useSessionStore } from "@/modules/account/store/session.store";

const ana = { name: "Ana Quispe", email: "ana@correo.pe" };
const store = () => useSessionStore.getState();

beforeEach(() => {
  localStorage.clear();
  useSessionStore.setState({ user: null, registeredUsers: [] });
});

describe("session.store", () => {
  it("signs in and out", () => {
    store().signIn(ana);
    expect(store().user).toEqual(ana);
    store().signOut();
    expect(store().user).toBeNull();
  });

  it("signUp registers the user once and signs them in", () => {
    store().signUp(ana);
    store().signUp(ana);
    expect(store().user).toEqual(ana);
    expect(store().registeredUsers).toEqual([ana]);
  });

  it("keeps registered users after signing out", () => {
    store().signUp(ana);
    store().signOut();
    expect(store().registeredUsers).toEqual([ana]);
  });

  it("persists the session in localStorage", () => {
    store().signIn(ana);
    const saved = JSON.parse(localStorage.getItem("ticketera-session") ?? "{}");
    expect(saved.state.user).toEqual(ana);
  });
});
