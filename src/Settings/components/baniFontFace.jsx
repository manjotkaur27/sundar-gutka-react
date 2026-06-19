import React, { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import STRINGS from "@common/localization";
import { setBaniFontFace } from "@common/actions";
import { constant, showInfoToast } from "@common";
import { BottomSheetComponent, ListItemComponent } from "./comon";
import { getBaniFontFaces } from "./comon/strings";

// Controls only the font used for the Bani (scripture) text inside the Reader's
// WebView — independent of FontFaceComponent, which drives Gurmukhi titles
// elsewhere in the app (Home, Bookmarks, Reader header, etc.).
const BaniFontFaceComponent = () => {
  const [isVisible, toggleVisible] = useState(false);
  const baniFontFace = useSelector((state) => state.baniFontFace);
  const prevBaniFontFaceRef = useRef(baniFontFace);

  // Same character-rendering warning FontFaceComponent shows for Baloo Paaji —
  // applies here too since it's the same font, just driving different text.
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
