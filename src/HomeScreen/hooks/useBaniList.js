import { useEffect, useState, useRef, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { logError, orderedBani, actions, logMessage, FallBack } from "@common";
import { getBaniList } from "@database";

const useBaniList = () => {
  const baniList = useSelector((state) => state.baniList);
  const baniOrder = useSelector((state) => state.baniOrder);
  const [baniListData, setBaniListData] = useState([]);
  const transliterationLanguage = useSelector((state) => state.transliterationLanguage);
  const prevLanguageRef = useRef(transliterationLanguage);
  // Ref so fetchBaniList can read latest baniList without being in its deps (prevents re-trigger loop)
  const baniListRef = useRef(baniList);
  useEffect(() => { baniListRef.current = baniList; }, [baniList]);
  const dispatch = useDispatch();

  const fetchBaniList = useCallback(async () => {
    logMessage("Fetching bani list");
    try {
      if (prevLanguageRef.current !== transliterationLanguage || baniListRef.current.length === 0) {
        const transliteratedList = await getBaniList(transliterationLanguage);
        const orderedData = orderedBani(transliteratedList, baniOrder, transliterationLanguage);
        dispatch(actions.setBaniList(orderedData));
        setBaniListData(orderedData);
      } else {
        setBaniListData(baniListRef.current);
      }
    } catch (error) {
      logError(error);
      FallBack();
    }
  }, [transliterationLanguage, baniOrder]);

  useEffect(() => {
    fetchBaniList();
    prevLanguageRef.current = transliterationLanguage;
  }, [transliterationLanguage, fetchBaniList]);
  return { baniListData, fetchBaniList };
};
export default useBaniList;
