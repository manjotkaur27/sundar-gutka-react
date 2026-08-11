import React from "react";

import { fireEvent, render, screen } from "@testing-library/react-native";

import { createPothi } from "../common/pothi/model";

import PothiRow, { shabadCountLabel } from "./components/PothiRow";
import PothiShabadRow from "./components/PothiShabadRow";

// The row is where the two sources meet: a user pothi is renameable, pinnable
// and reorderable; a Sundar Gutka folder is none of those and must not offer
// the affordances. These assert the withheld controls rather than that it
// renders, because an offered-but-dead pin is the failure that matters.

jest.mock("../common/context/ThemeContext", () => ({
  useTheme: () => ({ theme: require("@theme/lightTheme").default }),
}));

jest.mock("react-redux", () => ({
  useSelector: (fn) => fn({ fontFace: "BalooPaaji2-Regular" }),
  useDispatch: () => jest.fn(),
}));

// `useBaniTitle` pulls in anvaad-js (via common/utils), which touches `self` and
// cannot load under jest. Stubbed with the same rule it implements for the
// Unicode face these tests run in; the hook's own logic is not what they cover.
jest.mock("@common/hooks/useBaniTitle", () => ({
  __esModule: true,
  default: () => ({
    titleFor: (bani) => bani?.gurmukhiUni || bani?.gurmukhi || "",
    titleFontFamily: "BalooPaaji2-Regular",
    isTransliteration: false,
  }),
}));

// The icons barrel is only PARTLY initialised under jest: several of its
// modules import `{ constant } from "@common"`, and `@common` transitively
// pulls the barrel back in, so the circular require leaves later exports
// (ChevronDownIcon, PinIcon…) undefined. Stubbed here — these tests are about
// which controls the row offers, not the SVG paths.
jest.mock("@common/icons", () => ({
  ArrowRightIcon: () => null,
  ChevronDownIcon: () => null,
  ChevronRight: () => null,
  CloseIcon: () => null,
  FolderIcon: () => null,
  PinIcon: () => null,
}));

// `theme/type.js` reads the font names from here, so the mock has to keep
// `constant` real — stubbing it leaves every type role with an undefined face.
jest.mock("@common", () => ({
  constant: jest.requireActual("../common/constant").default,
  STRINGS: {
    POTHI_SHABAD_COUNT: "{count} shabads",
    POTHI_SHABAD_COUNT_ONE: "1 shabad",
    POTHI_DEFAULT_FOLDERS: "Default Folders",
    POTHI_OPEN: "Open Pothi",
    POTHI_PIN: "Pin",
    POTHI_UNPIN: "Unpin",
    POTHI_EMPTY_CONTENTS: "This pothi is empty",
    POTHI_REMOVE_BANI: "Remove from pothi",
    formatString: (t, params) => String(t).replace(/\{(\w+)\}/g, (_, k) => params[k]),
  },
  convertToUnicode: (value) => `CONVERTED(${value})`,
}));

const row = (over = {}) => ({
  id: "p1",
  name: "Morning",
  titleUni: null,
  count: 2,
  system: false,
  pinned: false,
  baniIds: [1, 2],
  ...over,
});

const renderRow = (props = {}) =>
  render(
    <PothiRow
      pothi={row(props.pothi)}
      onOpen={props.onOpen ?? jest.fn()}
      onTogglePin={props.onTogglePin}
      onLongPress={props.onLongPress}
    />
  );

describe("shabadCountLabel", () => {
  it("uses a dedicated singular rather than stripping an s", () => {
    expect(shabadCountLabel(1)).toBe("1 shabad");
    expect(shabadCountLabel(0)).toBe("0 shabads");
    expect(shabadCountLabel(7)).toBe("7 shabads");
  });
});

describe("PothiRow", () => {
  it("shows the title and the count", () => {
    renderRow();
    expect(screen.getByText("Morning")).toBeTruthy();
    expect(screen.getByText("2 shabads")).toBeTruthy();
  });

  it("never transliterates a USER pothi name", () => {
    // The localised default names ("Morning Nitnem") and anything the user types
    // are real text. Running the Gurmukhi transliterator over them produced
    // broken pseudo-Punjabi headings.
    renderRow({ pothi: { name: "Morning Nitnem", titleUni: null, system: false } });
    expect(screen.getByText("Morning Nitnem")).toBeTruthy();
  });

  it("prefers the Unicode title — the ASCII one is mojibake under Baloo", () => {
    renderRow({ pothi: { titleUni: "ਮੇਰੀ ਪੋਥੀ" } });
    expect(screen.getByText("ਮੇਰੀ ਪੋਥੀ")).toBeTruthy();
  });

  it("shows a bundled folder's count plainly — its section header names the source", () => {
    renderRow({ pothi: { system: true } });
    expect(screen.getByText("2 shabads")).toBeTruthy();
    expect(screen.queryByText(/Sundar Gutka/)).toBeNull();
  });

  it("withholds the pin from a bundled folder", () => {
    renderRow({ pothi: { system: true }, onTogglePin: jest.fn() });
    expect(screen.queryByLabelText("Pin")).toBeNull();
  });

  it("offers the pin on a user pothi, and reports the pinned state", () => {
    renderRow({ onTogglePin: jest.fn() });
    expect(screen.getByLabelText("Pin")).toBeTruthy();
    screen.rerender(
      <PothiRow pothi={row({ pinned: true })} onOpen={jest.fn()} onTogglePin={jest.fn()} />
    );
    expect(screen.getByLabelText("Unpin")).toBeTruthy();
  });

  // The row NAVIGATES rather than expanding. An accordion put a second,
  // differently styled list inside the first; the banis now open on their own
  // screen as an ordinary bani list.
  it("opens from the whole row, not just the chevron", () => {
    const onOpen = jest.fn();
    renderRow({ onOpen });
    fireEvent.press(screen.getByLabelText(/^Morning, 2 shabads/));
    expect(onOpen).toHaveBeenCalled();
  });

  it("tells a screen reader the row opens the pothi", () => {
    renderRow();
    expect(screen.getByLabelText("Morning, 2 shabads, Open Pothi")).toBeTruthy();
  });

  it("no longer renders its contents inline", () => {
    // The empty-contents line belonged to the accordion. An empty pothi still
    // shows its count; what it holds is the next screen's business.
    renderRow({ pothi: { count: 0, baniIds: [] } });
    expect(screen.queryByText("This pothi is empty")).toBeNull();
    expect(screen.getByText("0 shabads")).toBeTruthy();
  });

  it("puts no fixed height on the row — a long name must wrap", () => {
    // The row grows with its content and the OS text size; a fixed height is
    // the defect this guards.
    renderRow({ pothi: { name: "ਬਹੁਤ ਲੰਮਾ ਪੋਥੀ ਦਾ ਨਾਂ ".repeat(4) } });
    const styles = screen.getByLabelText(/ਬਹੁਤ/).props.style;
    const flat = Array.isArray(styles) ? Object.assign({}, ...styles.filter(Boolean)) : styles;
    expect(flat.height).toBeUndefined();
    expect(flat.minHeight).toBeGreaterThan(0);
  });
});

describe("PothiShabadRow", () => {
  const bani = { id: 4, gurmukhi: "jpujI swihb", gurmukhiUni: "ਜਪੁਜੀ ਸਾਹਿਬ" };

  it("renders the Unicode name under Baloo", () => {
    render(<PothiShabadRow bani={bani} onPress={jest.fn()} />);
    expect(screen.getByText("ਜਪੁਜੀ ਸਾਹਿਬ")).toBeTruthy();
  });

  it("offers remove only when the parent allows it", () => {
    render(<PothiShabadRow bani={bani} onPress={jest.fn()} />);
    expect(screen.queryByLabelText("Remove from pothi")).toBeNull();

    render(<PothiShabadRow bani={bani} onPress={jest.fn()} onRemove={jest.fn()} />);
    expect(screen.getByLabelText("Remove from pothi")).toBeTruthy();
  });

  it("opens the shabad when pressed", () => {
    const onPress = jest.fn();
    render(<PothiShabadRow bani={bani} onPress={onPress} />);
    fireEvent.press(screen.getByLabelText("ਜਪੁਜੀ ਸਾਹਿਬ"));
    expect(onPress).toHaveBeenCalled();
  });
});

describe("createPothi + row integration", () => {
  it("a freshly created pothi renders with its name and an empty count", () => {
    const fresh = createPothi({ name: "New" });
    renderRow({ pothi: { ...fresh, count: 0, system: false, pinned: false } });
    expect(screen.getByText("New")).toBeTruthy();
    expect(screen.getByText("0 shabads")).toBeTruthy();
  });
});
