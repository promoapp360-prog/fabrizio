import { describe, expect, it } from "vitest";
import { visibleCategoryIds, wouldCycle } from "../src/lib/category-tree";
const root = { id: "root", parentId: null, active: true };
const child = { id: "child", parentId: "root", active: true };
describe("menu category visibility", () => {
  it("includes active roots and descendants", () => expect(visibleCategoryIds([root, child])).toEqual(["root", "child"]));
  it("hides descendants of a hidden category", () => expect(visibleCategoryIds([{ ...root, active: false }, child])).toEqual([]));
  it("does not expose orphaned branches", () => expect(visibleCategoryIds([child])).toEqual([]));
  it("does not loop over corrupt hierarchies", () => expect(visibleCategoryIds([{ ...root, parentId: "child" }, child])).toEqual([]));
  it("rejects self-parenting and descendant-parenting", () => {
    expect(wouldCycle([root, child], "root", "root")).toBe(true);
    expect(wouldCycle([root, child], "root", "child")).toBe(true);
    expect(wouldCycle([root, child], "child", null)).toBe(false);
  });
});
