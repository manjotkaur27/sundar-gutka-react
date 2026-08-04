import React from "react";
import { Linking } from "react-native";
import { STRINGS } from "@common";
import { buildQgivUrl } from "../../services/sevaConfig";
import SettingsRow from "./comon/SettingsRow";

// Leads to the same Qgiv donation form the Seva screen hands off to (its in-app
// give link is hidden on this branch). No amount/frequency context here, so we
// open the base form via the shared builder rather than hardcoding the URL.
const Donate = () => (
  <SettingsRow
    title={STRINGS.donate}
    icon="volunteer-activism"
    onPress={() => Linking.openURL(buildQgivUrl({}))}
  />
);

export default Donate;
