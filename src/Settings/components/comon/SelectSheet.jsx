import React from "react";
import { Icon } from "@rneui/themed";
import PropTypes from "prop-types";
import useTokens from "@common/hooks/useTokens";
import { Row, Sheet } from "../../../common/components/ui";

// The "pick one from a list" sheet, used by every Settings option that opens a
// chooser.
//
// Replaces three copies of the same thing — `bottomSheetComponent`,
// `transliteration` and `translation` each carried their own Modal, BlurView,
// orientation listener and option list. Two of them also duplicated this:
//
//   const { width, height } = Dimensions.get("window");
//   const [orientation, setOrientation] = useState(...);
//   useEffect(() => Dimensions.addEventListener("change", ...));
//
// which is a hand-rolled `useWindowDimensions`. The shared `Sheet` sizes itself
// from the live window, so the listener, the state and the PORTRAIT/LANDSCAPE
// width switching all go away.
//
// Options are rendered as `Row`s, so a long translated option label wraps and
// makes its row taller instead of being clipped — and the checkmark stays put
// because only the label column flexes.

const SelectSheet = ({
  visible,
  title,
  options,
  value = undefined,
  onSelect,
  onClose,
  closeLabel = undefined,
}) => {
  const { c, layout } = useTokens();

  return (
    <Sheet visible={visible} onClose={onClose} title={title} closeAccessibilityLabel={closeLabel}>
      {options.map((item) => {
        const selected = item.key === value;
        return (
          <Row
            key={item.key}
            title={item.title}
            onPress={() => onSelect(item.key)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            showDivider
            trailing={
              selected ? (
                <Icon name="check" type="material" size={layout.icon.md} color={c.accent} />
              ) : null
            }
          />
        );
      })}
    </Sheet>
  );
};

SelectSheet.propTypes = {
  visible: PropTypes.bool.isRequired,
  title: PropTypes.string.isRequired,
  options: PropTypes.arrayOf(PropTypes.shape({ key: PropTypes.string, title: PropTypes.string }))
    .isRequired,
  value: PropTypes.string,
  onSelect: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  closeLabel: PropTypes.string,
};

export default SelectSheet;
