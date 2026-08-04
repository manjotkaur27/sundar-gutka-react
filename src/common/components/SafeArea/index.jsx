import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import PropTypes from "prop-types";

const SafeArea = ({ children, backgroundColor, edges = [], flex = 1 }) => {
  return (
    <SafeAreaView style={[{ backgroundColor, flex }]} edges={edges}>
      {children}
    </SafeAreaView>
  );
};

SafeArea.propTypes = {
  children: PropTypes.node.isRequired,
  backgroundColor: PropTypes.string.isRequired,
  edges: PropTypes.arrayOf(PropTypes.oneOf(["top", "bottom", "left", "right"])),
  flex: PropTypes.number,
};

export default SafeArea;
