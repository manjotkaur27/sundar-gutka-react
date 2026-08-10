import createPothiSyncQueue from "./syncQueue";

describe("createPothiSyncQueue", () => {
  it("runs a delete after an already-started source upload", async () => {
    const queue = createPothiSyncQueue();
    const calls = [];
    let finishUpload;
    const upload = new Promise((resolve) => {
      finishUpload = resolve;
    });

    const uploading = queue(async () => {
      calls.push("upload-start");
      await upload;
      calls.push("upload-end");
    });
    const deleting = queue(() => calls.push("delete"));

    await Promise.resolve();
    expect(calls).toEqual(["upload-start"]);

    finishUpload();
    await Promise.all([uploading, deleting]);
    expect(calls).toEqual(["upload-start", "upload-end", "delete"]);
  });

  it("continues with later mutations after a request fails", async () => {
    const queue = createPothiSyncQueue();
    const failure = new Error("network");
    const failed = queue(() => Promise.reject(failure));
    const succeeding = queue(() => "deleted");

    await expect(failed).rejects.toThrow("network");
    await expect(succeeding).resolves.toBe("deleted");
  });
});
