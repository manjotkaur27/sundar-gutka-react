import React from "react";
import { ActivityIndicator } from "react-native";
import useSsoActions from "@common/hooks/useSsoActions";
import useTokens from "@common/hooks/useTokens";
import { STRINGS } from "@common";
import SettingsRow from "./comon/SettingsRow";

// Khalis SSO account rows. Signed out this is a single "Sign In" row; signed in
// it becomes a non-interactive identity row (name + email) followed by a
// "Sign Out" row.
//
// Sign-out deliberately lives here and nowhere else — the Dashboard avatar only
// navigates here — so the app has exactly one destructive surface.
const Account = () => {
  const { c } = useTokens();
  const { status, user, busy, signIn, signOut } = useSsoActions();

  const spinner = busy ? <ActivityIndicator size="small" color={c.textSecondary} /> : undefined;

  if (status === "signedIn" && user) {
    const fullName = [user.firstname, user.lastname].filter(Boolean).join(" ");
    return (
      <>
        {/* No onPress: this row is the account itself, not a way to somewhere.
            SettingsRow only draws a chevron for rows that navigate. */}
        <SettingsRow
          title={fullName || STRINGS.USER}
          subtitle={user.email || undefined}
          icon="account-circle"
        />
        <SettingsRow
          title={STRINGS.SIGN_OUT}
          icon="logout"
          onPress={busy ? undefined : signOut}
          trailing={spinner}
          disabled={busy}
        />
      </>
    );
  }

  // "unknown" means the Keychain read is still in flight. It resolves in well
  // under a second, so the row renders in place but disabled rather than
  // popping in late and shifting the section.
  return (
    <SettingsRow
      title={STRINGS.SIGN_IN}
      icon="login"
      onPress={signIn}
      trailing={spinner}
      disabled={status === "unknown" || busy}
    />
  );
};

export default Account;
