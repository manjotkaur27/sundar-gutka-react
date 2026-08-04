import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setTheme } from "@common/actions";
import { ThemeIcon } from "@common/icons";
import { STRINGS } from "@common";
import SelectSheet from "./comon/SelectSheet";
import SettingsRow from "./comon/SettingsRow";
import { getTheme } from "./comon/strings";

const ThemeComponent = () => {
  const [isVisible, toggleVisible] = useState(false);
  const theme = useSelector((state) => state.theme);
  const dispatch = useDispatch();
  const THEMES = getTheme(STRINGS);
  const current = THEMES.find((t) => t.key === theme);

  return (
    <>
      {/* A themed vector, not the old `bgcoloricon.png`. The PNG was rendered
          with tinting turned OFF, so it kept one fixed colour in both themes
          while every other row's icon followed the theme — and being a raster
          asset it softened on high-density screens. */}
      <SettingsRow
        title={STRINGS.theme}
        value={current ? current.title : theme}
        IconComponent={ThemeIcon}
        onPress={() => toggleVisible(true)}
      />
      <SelectSheet
        visible={isVisible}
        title={STRINGS.theme}
        options={THEMES}
        value={theme}
        closeLabel={STRINGS.cancel}
        onClose={() => toggleVisible(false)}
        onSelect={(key) => {
          dispatch(setTheme(key));
          toggleVisible(false);
        }}
      />
    </>
  );
};

export default ThemeComponent;
