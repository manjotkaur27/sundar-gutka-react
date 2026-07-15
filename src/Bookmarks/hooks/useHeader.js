import { useEffect } from "react";

const useHeader = (navigation) => {
  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);
};
export default useHeader;
