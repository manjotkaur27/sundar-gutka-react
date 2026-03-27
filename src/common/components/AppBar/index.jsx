import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PropTypes from 'prop-types';
import { CustomText, useTheme } from '@common';

/**
 * A pure React Native AppBar that bypasses the native UINavigationBar,
 * avoiding the iOS 26 "Liquid Glass" circular button backgrounds that
 * appear when using react-navigation's native headerLeft/headerRight APIs.
 */
const AppBar = ({
  title,
  backgroundColor,
  titleColor,
  titleStyle,
  leftComponent,
  rightComponent,
}) => {
  const { top } = useSafeAreaInsets();
  const { theme } = useTheme();

  const bg = backgroundColor || theme.colors.primary;
  const tc = titleColor || theme.staticColors.WHITE_COLOR;

  return (
    <View style={[styles.container, { backgroundColor: bg, paddingTop: top }]}>
      <View style={styles.row}>
        <View style={styles.side}>{leftComponent}</View>
        <View style={styles.center}>
          <CustomText
            style={[styles.title, { color: tc }, titleStyle]}
            numberOfLines={1}
          >
            {title}
          </CustomText>
        </View>
        <View style={styles.side}>{rightComponent}</View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    paddingHorizontal: 8,
  },
  side: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
});

AppBar.defaultProps = {
  backgroundColor: null,
  titleColor: null,
  titleStyle: null,
  leftComponent: null,
  rightComponent: null,
};

AppBar.propTypes = {
  title: PropTypes.string.isRequired,
  backgroundColor: PropTypes.string,
  titleColor: PropTypes.string,
  titleStyle: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  leftComponent: PropTypes.node,
  rightComponent: PropTypes.node,
};

export default AppBar;
