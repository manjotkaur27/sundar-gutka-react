export const checkUpdateStyles = (theme) => ({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.c.surface,
  },
  header: {
    fontSize: 20,
    marginBottom: 5,
    backgroundColor: theme.c.surface,
  },
  status: {
    marginTop: 20,
    fontSize: 18,
  },
  mainWrapper: {
    backgroundColor: theme.c.surface,
  },
});

export const baniDBAboutStyles = (theme) => ({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: theme.c.surface,
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  listItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  bulletPoint: {
    fontSize: 16,
    lineHeight: 24,
    marginRight: 10,
    color: theme.c.textPrimary,
  },
  listText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    color: theme.c.textPrimary,
  },
});
