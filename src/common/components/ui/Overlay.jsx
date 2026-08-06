import React from "react";
import { Modal } from "react-native";
import PropTypes from "prop-types";

// The ONE place the app configures a modal window.
//
// Every overlay — sheets, dialogs, the day detail, the label prompt — renders
// through this. A lint rule forbids `<Modal>` anywhere else, because the window
// configuration is not a per-screen decision and getting it wrong is invisible
// until it is on a device:
//
// **Both translucency flags, always.** Under Android's edge-to-edge enforcement
// a Modal only spans the whole display when `statusBarTranslucent` AND
// `navigationBarTranslucent` are set. With the status-bar flag alone the window
// stops above the navigation bar and the scrim leaves an undimmed strip; worse,
// the window is inset while `useWindowDimensions` still reports the full
// display, so anything measured against the screen overflows its own window.
// Six of the app's eight modals were missing the navigation flag.
//
// **`onShow` is forwarded** so an entrance animation can start when the window
// actually exists. A Modal is a separate native window and its children are not
// attached during the commit that renders it, so a native-driven animation
// started in an effect targets a view that is not there yet and is silently
// dropped — the sheet then never leaves its off-screen start position and all
// the user sees is the scrim.
//
// `transparent` is not a prop: an overlay that is not transparent cannot show a
// scrim, and every overlay in this app has one.
const Overlay = ({
  visible = true,
  onRequestClose = undefined,
  onShow = undefined,
  animationType = "none",
  children = null,
  testID = undefined,
}) => (
  <Modal
    visible={visible}
    transparent
    animationType={animationType}
    onRequestClose={onRequestClose}
    onShow={onShow}
    statusBarTranslucent
    navigationBarTranslucent
    testID={testID}
  >
    {children}
  </Modal>
);

Overlay.propTypes = {
  visible: PropTypes.bool,
  /** Android back / system dismiss. */
  onRequestClose: PropTypes.func,
  /** Fires once the window is on screen — start entrance animations here. */
  onShow: PropTypes.func,
  /** "none" when the content drives its own animation, "fade" otherwise. */
  animationType: PropTypes.oneOf(["none", "fade", "slide"]),
  children: PropTypes.node,
  testID: PropTypes.string,
};

export default Overlay;
