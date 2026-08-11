import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setTheme } from "@common/actions";
import { ThemeIcon } from "@common/icons";
import { STRINGS } from "@common";
import SelectSheet from "./comon/SelectSheet";
import SettingsRow from "./comon/SettingsRow";
import { getTheme } from "./comon/strings";

// The app's ONE appearance control.
//
// Back to a three-option sheet (Default / Light / Dark), matching every other
// choice on this screen. The designed themes and the `Themes` grid screen are
// deliberately LEFT IN PLACE — registry, records, previews and route are all
// untouched — they are simply no longer reachable from Settings, so the app
// ships the three appearances while the rest stays ready to re-expose.
//
// Nothing migrates a stored value. A build that already selected a designed
// theme keeps rendering it; the row shows the raw id until the user picks one
// of the three, which is the honest thing to show for a theme this sheet
// cannot name.
const ThemeComponent = () => {
  const dispatch = useDispatch();
  const [isVisible, setIsVisible] = useState(false);
  const theme = useSelector((state) => state.theme);

  const options = getTheme(STRINGS);
  // Falls back to the stored value so a designed theme still shows something
  // rather than an empty row.
  const selectedTitle = options.find((option) => option.key === theme)?.title || theme;

  const handleSelection = (key) => {
    setIsVisible(false);
    dispatch(setTheme(key));
  };

  return (
    <>
      {/* A themed vector, not the old `bgcoloricon.png`. The PNG was rendered
          with tinting turned OFF, so it kept one fixed colour in both themes
          while every other row's icon followed the theme — and being a raster
          asset it softened on high-density screens. */}
      <SettingsRow
        title={STRINGS.theme}
        value={selectedTitle}
        IconComponent={ThemeIcon}
        onPress={() => setIsVisible(true)}
      />
      <SelectSheet
        visible={isVisible}
        title={STRINGS.theme}
        options={options}
        value={theme}
        onSelect={handleSelection}
        onClose={() => setIsVisible(false)}
        closeLabel={STRINGS.cancel}
      />
    </>
  );
};

export default ThemeComponent;
