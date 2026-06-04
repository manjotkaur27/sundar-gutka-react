import React, { useRef } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  navigationRef,
  stopTrace,
  resetTrace,
  startPerformanceTrace,
  logError,
  constant,
} from "@common";
import AboutScreen from "../AboutScreen";
import Bookmarks from "../Bookmarks";
import ManageDownloads from "../ManageDownloads";
import { trackScreenView } from "../common/firebase/analytics";
import DatabaseUpdateScreen from "../DatabaseUpdate";
import DashboardScreen from "../DashboardScreen";
import EditBaniOrder from "../EditBaniOrder";
import FolderScreen from "../FolderScreen";
import HomeScreen from "../HomeScreen";
import ReaderScreen from "../ReaderScreen";
import Settings from "../Settings";
import SevaScreen from "../SevaScreen";
import ReminderOptions from "../Settings/components/reminders/ReminderOptions";
import BottomNavigation from "../common/components/BottomNavigation";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Custom tab bar that uses the refactored context-aware BottomNavigation component
const CustomTabBar = (props) => {
  const { state, navigation, descriptors } = props;
  const currentRoute = state.routes[state.index];
  const activeKey = currentRoute.name;
  const currentOptions = descriptors[currentRoute.key]?.options;
  const isHidden = currentOptions?.tabBarStyle?.display === "none";

  if (isHidden) return null;

  return (
    <BottomNavigation
      activeKey={activeKey}
      context="home"
      visible={true}
      navigation={navigation}
    />
  );
};

// Main tab navigator for Home, Dashboard, Seva, Settings
const MainTabs = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
      }}
      backBehavior="none"
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Seva" component={SevaScreen} />
      <Tab.Screen name="Settings" component={Settings} />
    </Tab.Navigator>
  );
};

const Navigation = () => {
  const routeNameRef = useRef();
  const trace = useRef(null);

  const handlingStateChange = async (state) => {
    try {
      if (trace.current) {
        await stopTrace(trace.current);
        trace.current = resetTrace();
      }
      const currentRouteName = state.routes[state.index].name;
      trace.current = await startPerformanceTrace(currentRouteName);
    } catch (error) {
      // Silently fail - performance monitoring should never crash the app
      logError(
        new Error(
          `Performance trace failed for route: ${
            state.routes[state.index]?.name || "unknown"
          } - ${error?.message || "Unknown error"}`
        )
      );
      trace.current = resetTrace();
    }
  };

  const handleStateChange = async (state) => {
    await handlingStateChange(state);
    const previousRouteName = routeNameRef.current;
    const currentRouteName = navigationRef.current.getCurrentRoute().name;
    const currentRoute = navigationRef.current.getCurrentRoute();
    if (previousRouteName !== currentRouteName) {
      await trackScreenView(
        currentRouteName,
        currentRoute?.params?.key,
        currentRoute?.params?.params?.title
      );
    }
    routeNameRef.current = currentRouteName;
  };

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => {
        routeNameRef.current = navigationRef.current.getCurrentRoute().name;
      }}
      onStateChange={async (state) => {
        await handleStateChange(state);
      }}
    >
      <Stack.Navigator
        screenOptions={{
          headerShown: true,
          headerTitleAlign: "center",
        }}
      >
        {/* Main tabs - no animation between tabs */}
        <Stack.Screen
          name="MainTabs"
          component={MainTabs}
          options={{
            headerShown: false,
            animation: "none",
          }}
        />
        {/* Stack screens - these push with animation */}
        <Stack.Screen
          name="Reader"
          component={ReaderScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen name="About" component={AboutScreen} />
        <Stack.Screen name="FolderScreen" component={FolderScreen} />
        <Stack.Screen
          options={{ headerShown: false }}
          name="EditBaniOrder"
          component={EditBaniOrder}
        />
        <Stack.Screen name="Bookmarks" component={Bookmarks} />
        <Stack.Screen name="ReminderOptions" component={ReminderOptions} />
        <Stack.Screen name="DatabaseUpdate" component={DatabaseUpdateScreen} />
        <Stack.Screen
          name="ManageDownloads"
          component={ManageDownloads}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Settings"
          component={Settings}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default Navigation;
