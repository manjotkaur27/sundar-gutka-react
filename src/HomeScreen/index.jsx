import React, { useEffect, useMemo, useState } from "react";
import { View, InteractionManager } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { paletteFor } from "@theme/screenPalettes";
import PropTypes from "prop-types";
import useTheme from "@common/context";
import usePothiSync from "@common/hooks/usePothiSync";
import useThemedStyles from "@common/hooks/useThemedStyles";
import {
  actions,
  BaniLengthSelector,
  constant,
  useKeepAwake,
  BaniList,
  validateBaniOrder,
  StatusBarComponent,
  SafeArea,
  STRINGS,
  allowTracking,
} from "@common";
import { setBaniOrder } from "../common/actions";
import { SegmentedTabs } from "../common/components/ui";
import CreatePothiSheet from "../Pothi/components/CreatePothiSheet";
import usePothiActions from "../Pothi/hooks/usePothiActions";
import PothiList from "../Pothi/PothiList";
import { getLanguages } from "../Settings/components/comon/strings";
import BaniHeader from "./components/BaniHeader";
import { useBaniLength, useBaniList, useDatabaseUpdateCheck } from "./hooks";
import createStyles from "./styles";

// The two lists this screen switches between. Folders is not the default: the
// bani list is what the app opens on and what most sessions want.
const TAB_BANIS = "banis";
const TAB_FOLDERS = "folders";

const HomeScreen = React.memo(({ navigation }) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { navigate } = navigation;
  const { baniListData } = useBaniList();
  const language = useSelector((state) => state.language);
  const baniOrder = useSelector((state) => state.baniOrder);
  const fontFace = useSelector((state) => state.fontFace);
  const isStatistics = useSelector((state) => state.isStatistics);
  const [tab, setTab] = useState(TAB_BANIS);
  // Shared with the standalone My Pothis screen, so the two entry points into
  // the same list cannot drift apart.
  const { openPothi, onPinLimit, creating, openCreate, closeCreate, onCreated } =
    usePothiActions(navigate);
  useDatabaseUpdateCheck();
  // Seeds the two default pothis and keeps My Pothi in step with the account.
  usePothiSync();

  useKeepAwake();
  const { baniLengthSelector } = useBaniLength();
  const dispatch = useDispatch();

  useEffect(() => {
    navigation.setOptions({
      tabBarStyle: baniLengthSelector ? { display: "none" } : undefined,
    });
  }, [baniLengthSelector, navigation]);

  useEffect(() => {
    // Deferred past the first interactive frame: setAnalyticsCollectionEnabled()
    // is the app's first Firebase Analytics call, which can trigger Play
    // Services' Analytics "dynamite" module to load over a synchronous Binder
    // call. Running it on HomeScreen's very first mount — the highest-contention
    // moment of cold start — risked blocking the main thread long enough to ANR.
    const task = InteractionManager.runAfterInteractions(() => {
      allowTracking(isStatistics);
    });
    return () => task.cancel();
  }, [isStatistics]);

  useEffect(() => {
    const validLanguages = getLanguages(STRINGS);
    const validLanguageKeys = validLanguages.map((lang) => lang.key);
    const isLanguageValid = language && validLanguageKeys.includes(language);

    if (!language || !isLanguageValid) {
      dispatch(actions.setLanguage("DEFAULT"));
    }
  }, [language]);

  // The app UI (Home/Bookmarks lists, Reader header/title) is fixed to Baloo
  // Paaji — there is no longer a Font Face setting. The only font control left
  // ("Bani Font") drives just the Reader scripture text via `baniFontFace`.
  // Reset any previously-persisted non-Baloo value here on the entry screen.
  useEffect(() => {
    if (fontFace !== constant.BALOO_PAAJI) {
      dispatch(actions.setFontFace(constant.BALOO_PAAJI));
    }
  }, [fontFace]);

  useEffect(() => {
    const order = validateBaniOrder(baniOrder);
    dispatch(setBaniOrder(order));
  }, []);

  // With My Pothi ON, `baniRows` filters the folders out and every row here is
  // a bani. With it OFF the bundled folders are back in this list, so opening
  // one has to reach FolderScreen again — the branch this screen carried before
  // the Folders tab took the folders over.
  const onPress = (row) => {
    const bani = row.item;
    dispatch(actions.toggleAudio(false));
    if (bani.folder) {
      navigate(constant.FOLDERSCREEN, {
        key: `Folder-${bani.gurmukhi}`,
        // No `pothiId`: a bundled folder is not editable. `titleVariant`
        // defaults to the GurbaniAkhar face, which is what these ASCII names
        // need — see FolderScreen.
        params: { data: bani.folder, title: bani.gurmukhi },
      });
      return;
    }
    navigate(constant.READER, {
      key: `Reader-${bani.id}`,
      params: {
        id: bani.id,
        title: bani.gurmukhi,
        titleUni: bani.gurmukhiUni,
      },
    });
  };

  // With My Pothi on, All Banis lists banis only: the bundled folders (Amrit
  // Bani, Bhagat Bani and the rest) are rendered by the Folders tab, so listing
  // them here as well showed the same four rows twice on one screen. With it
  // off there is no Folders tab, so they belong here — see POTHI_ENABLED.
  //
  // Filtered at the render, NOT in `baniListData` itself: `systemPothis` builds
  // the Folders tab from these very rows, so dropping them upstream would empty
  // the tab this change exists to defer to.
  const baniRows = useMemo(
    () => (constant.POTHI_ENABLED ? baniListData.filter((bani) => !bani.folder) : baniListData),
    [baniListData]
  );

  // One list and no tab bar with the feature off, so Home looks exactly as it
  // did before My Pothi: the bundled folders sit among the banis.
  const showPothis = constant.POTHI_ENABLED && tab === TAB_FOLDERS;

  // The bani list keeps its own ground on every surface of this screen, so no
  // strip of the semantic background shows above or behind the header.
  const baniGround = paletteFor("baniList", theme).surface;

  return baniLengthSelector ? (
    <BaniLengthSelector />
  ) : (
    <SafeArea backgroundColor={baniGround} edges={["bottom", "left", "right"]}>
      <StatusBarComponent backgroundColor={baniGround} />
      <View style={[{ backgroundColor: baniGround }, styles.container]}>
        <BaniHeader navigate={navigate} />
        {constant.POTHI_ENABLED && (
          <SegmentedTabs
            tabs={[
              { key: TAB_BANIS, label: STRINGS.ALL_BANIS },
              { key: TAB_FOLDERS, label: STRINGS.POTHIS_TAB },
            ]}
            value={tab}
            onChange={setTab}
            style={styles.tabs}
          />
        )}
        {showPothis ? (
          <PothiList
            baniListData={baniListData}
            onOpenPothi={openPothi}
            onCreatePress={openCreate}
            onPinLimit={onPinLimit}
          />
        ) : (
          <BaniList data={baniRows} onPress={onPress} />
        )}
      </View>
      <CreatePothiSheet
        visible={creating}
        onClose={closeCreate}
        onCreated={onCreated}
        baniListData={baniListData}
      />
    </SafeArea>
  );
});

HomeScreen.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func.isRequired,
    setOptions: PropTypes.func.isRequired,
  }).isRequired,
};

export default HomeScreen;
