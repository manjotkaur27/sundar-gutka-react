/* eslint-env jest */
/**
 * Tests for the dashboard redesign Redux slices:
 *  - userProfile (local editable name)
 *  - dashboardLayout (section order + visibility, min-visible guard, self-heal)
 *  - todaysNitnem (selected bani set + per-day completion toggle)
 */

import * as actionTypes from "../common/actions/actionTypes";
import constant from "../common/constant";
import rootReducer from "../common/reducer";

// Dispatch plain action objects (not the action creators in actions/index.js,
// which import Firebase ESM modules that jest does not transform).
const actions = {
  setUserProfile: (value) => ({ type: actionTypes.SET_USER_PROFILE, value }),
  setDashboardLayout: (value) => ({ type: actionTypes.SET_DASHBOARD_LAYOUT, value }),
  resetDashboardLayout: () => ({ type: actionTypes.RESET_DASHBOARD_LAYOUT }),
  setNitnemBanis: (value) => ({ type: actionTypes.SET_NITNEM_BANIS, value }),
  toggleNitnemDone: (date, baniId) => ({
    type: actionTypes.TOGGLE_NITNEM_DONE,
    payload: { date, baniId },
  }),
  restoreNitnem: (value) => ({ type: actionTypes.RESTORE_NITNEM, value }),
};

const init = () => rootReducer(undefined, { type: "@@INIT" });

describe("Dashboard redesign reducers", () => {
  it("userProfile defaults to empty name and updates via setUserProfile", () => {
    const state0 = init();
    expect(state0.userProfile).toEqual({ name: "" });

    const state1 = rootReducer(state0, actions.setUserProfile({ name: "Harpreet Kaur" }));
    expect(state1.userProfile.name).toBe("Harpreet Kaur");
  });

  it("dashboardLayout defaults to the full ordered section list, nothing hidden", () => {
    const { dashboardLayout } = init();
    const sectionCount = Object.keys(constant.DASHBOARD_SECTIONS).length;
    expect(dashboardLayout.order).toHaveLength(sectionCount);
    expect(dashboardLayout.hidden).toEqual([]);
  });

  it("setDashboardLayout self-heals by appending newly added sections", () => {
    const state0 = init();
    // Simulate a persisted layout that predates some sections.
    const partial = { order: [constant.DASHBOARD_SECTIONS.STREAK], hidden: [] };
    const state1 = rootReducer(state0, actions.setDashboardLayout(partial));
    const sectionCount = Object.keys(constant.DASHBOARD_SECTIONS).length;
    expect(state1.dashboardLayout.order).toHaveLength(sectionCount);
    expect(state1.dashboardLayout.order[0]).toBe(constant.DASHBOARD_SECTIONS.STREAK);
  });

  it("resetDashboardLayout restores the default order", () => {
    const state0 = init();
    const hiddenLayout = { order: state0.dashboardLayout.order, hidden: ["streak"] };
    const state1 = rootReducer(state0, actions.setDashboardLayout(hiddenLayout));
    expect(state1.dashboardLayout.hidden).toEqual(["streak"]);

    const state2 = rootReducer(state1, actions.resetDashboardLayout());
    expect(state2.dashboardLayout.hidden).toEqual([]);
  });

  it("todaysNitnem defaults to the configured bani set", () => {
    const { todaysNitnem } = init();
    expect(todaysNitnem.selectedBaniIds).toEqual(constant.DEFAULT_NITNEM_BANI_IDS);
    expect(todaysNitnem.completed).toEqual({});
  });

  it("setNitnemBanis replaces the selected bani set", () => {
    const state0 = init();
    const state1 = rootReducer(state0, actions.setNitnemBanis([1, 2, 3]));
    expect(state1.todaysNitnem.selectedBaniIds).toEqual([1, 2, 3]);
  });

  it("restoreNitnem replaces the whole nitnem slice (cross-device restore)", () => {
    const state0 = init();
    const restored = { selectedBaniIds: [9, 5], completed: { "2026-06-11": [9] } };
    const state1 = rootReducer(state0, actions.restoreNitnem(restored));
    expect(state1.todaysNitnem.selectedBaniIds).toEqual([9, 5]);
    expect(state1.todaysNitnem.completed).toEqual({ "2026-06-11": [9] });
  });

  it("toggleNitnemDone adds then removes a bani for a given date", () => {
    const date = "2026-06-17";
    const state0 = init();
    const state1 = rootReducer(state0, actions.toggleNitnemDone(date, 2));
    expect(state1.todaysNitnem.completed[date]).toEqual([2]);

    const state2 = rootReducer(state1, actions.toggleNitnemDone(date, 2));
    expect(state2.todaysNitnem.completed[date]).toEqual([]);
  });
});
