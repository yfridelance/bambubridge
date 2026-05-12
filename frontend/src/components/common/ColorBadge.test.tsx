import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ColorBadge } from "./ColorBadge";

describe("ColorBadge", () => {
  it("renders a dashed placeholder when color is empty", () => {
    const { container } = render(<ColorBadge color="" />);
    const div = container.firstChild as HTMLElement;
    expect(div.style.border).toContain("dashed");
    expect(div.style.backgroundColor).toBe("");
  });

  it("renders a single solid color with leading #", () => {
    const { container } = render(<ColorBadge color="ff0000" />);
    const div = container.firstChild as HTMLElement;
    expect(div.style.backgroundColor).toBe("rgb(255, 0, 0)");
  });

  it("keeps the leading # if already present", () => {
    const { container } = render(<ColorBadge color="#00ff00" />);
    const div = container.firstChild as HTMLElement;
    expect(div.style.backgroundColor).toBe("rgb(0, 255, 0)");
  });

  it("renders a gradient for multi-color spools", () => {
    const { container } = render(<ColorBadge color={["ff0000", "0000ff"]} />);
    const div = container.firstChild as HTMLElement;
    expect(div.style.background).toContain("linear-gradient");
    expect(div.style.background).toContain("#ff0000");
    expect(div.style.background).toContain("#0000ff");
  });

  it("respects the size prop", () => {
    const { container } = render(<ColorBadge color="ff0000" size={32} />);
    const div = container.firstChild as HTMLElement;
    expect(div.style.width).toBe("32px");
    expect(div.style.height).toBe("32px");
  });
});
