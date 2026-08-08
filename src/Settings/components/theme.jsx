import React from "react";
import { useSelector } from "react-redux";
import { themeOptions } from "@settings/Themes/options";
import PropTypes from "prop-types";
import { ThemeIcon } from "@common/icons";
import { STRINGS } from "@common";
import SettingsRow from "./comon/SettingsRow";

// The app's ONE appearance control.
//
// It used to open a three-option sheet (Default / Light / Dark). It now pushes
// the theme grid, because the choice is no longer a single word — each option is
// a page you can look at, and the designed themes set the app's appearance and
// the reading surface together.
const ThemeComponent = ({ navigate }) => {
  const theme = useSelector((state) => state.theme);
  const current = themeOptions().find((option) => option.value === theme);

  return (
    <>
      {/* A themed vector, not the old `bgcoloricon.png`. The PNG was rendered
          with tinting turned OFF, so it kept one fixed colour in both themes
          while every other row's icon followed the theme — and being a raster
          asset it softened on high-density screens. */}
      <SettingsRow
        title={STRINGS.theme}
        // Falls back to the stored value so an id from a newer release still
        // shows something rather than an empty row.
        value={current ? STRINGS[current.labelKey] : theme}
        IconComponent={ThemeIcon}
        onPress={() => navigate("Themes")}
      />
    </>
  );
};

ThemeComponent.propTypes = { navigate: PropTypes.func.isRequired };

export default ThemeComponent;
