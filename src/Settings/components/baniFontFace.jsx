import React, { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import STRINGS from "@common/localization";
import { setBaniFontFace } from "@common/actions";
import { constant, showInfoToast } from "@common";
import { BottomSheetComponent, ListItemComponent } from "./comon";
import { getBaniFontFaces } from "./comon/strings";

// The only user-facing font control. Drives the Bani (scripture) text inside the
// Reader's WebView via `baniFontFace`. The rest of the app UI (Home, Bookmarks,
// Reader header, etc.) is fixed to Baloo Paaji — see HomeScreen's fontFace reset.
const BaniFontFaceComponent = () => {
  const [isVisible, toggleVisible] = useState(false);
  const baniFontFace = useSelector((state) => state.baniFontFace);
  const prevBaniFontFaceRef = useRef(baniFontFace);

  // Baloo Paaji renders a limited Gurmukhi character set; warn when it's picked
  // for the Bani text so missing glyphs aren't a surprise.
  useEffect(() => {
    if (baniFontFace === constant.BALOO_PAAJI && prevBaniFontFaceRef.current !== constant.BALOO_PAAJI) {
      showInfoToast(STRINGS.baloo_paaji_warning);
    }
    prevBaniFontFaceRef.current = baniFontFace;
  }, [baniFontFace]);
  const fontFaceIcon = require("../../../images/fontfaceicon.png");
  const FONT_FACES = getBaniFontFaces(STRINGS);
  return (
    <>
      <ListItemComponent
        icon={fontFaceIcon.toString()}
        title={STRINGS.bani_font_face}
        value={baniFontFace}
        isAvatar
        actionConstant={FONT_FACES}
        onPressAction={() => toggleVisible(true)}
      />
      {isVisible && (
        <BottomSheetComponent
          isVisible={isVisible}
          action={setBaniFontFace}
          actionConstant={FONT_FACES}
          value={baniFontFace}
          toggleVisible={toggleVisible}
          title={STRINGS.bani_font_face}
        />
      )}
    </>
  );
};

export default BaniFontFaceComponent;
