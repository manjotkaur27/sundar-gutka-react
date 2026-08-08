import React, { useState, useEffect, useMemo } from "react";
import { Appearance } from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { appearanceFor } from "@theme/reader/resolve";
import PropTypes from "prop-types";
import { lightTheme, darkTheme } from "@theme";
import { setTheme } from "../actions";
import constant from "../constant";
import ThemeContext from "./ThemeContext";

const ThemeProvider = ({ children }) => {
  const dispatch = useDispatch();
  const themeMode = useSelector((state) => state.theme);
  const fontFace = useSelector((state) => state.fontFace);
  const [systemColorScheme, setSystemColorScheme] = useState(Appearance.getColorScheme());

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemColorScheme(colorScheme);
    });
    return () => subscription.remove();
  }, []);

  // Use useMemo to prevent infinite re-renders
  const theme = useMemo(() => {
    // A designed theme carries the appearance it is meant to be read in — Blue
    // pairs with dark, Puratan and Kesari with light — so picking one sets both
    // axes at once and the app can never end up dark-chromed around a cream
    // page. The pairing lives in the theme record, not here.
    const paired = appearanceFor(themeMode);
    if (paired) {
      return paired === "dark" ? darkTheme : lightTheme;
    }
    if (themeMode === constant.Default) {
      return systemColorScheme === "dark" ? darkTheme : lightTheme;
    }
    if (themeMode === constant.Dark) {
      return darkTheme;
    }
    return lightTheme;
  }, [themeMode, systemColorScheme]);

  const value = useMemo(
    () => ({ theme, fontFace, setThemeMode: (mode) => dispatch(setTheme(mode)) }),
    [theme, fontFace, dispatch]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

ThemeProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default ThemeProvider;
