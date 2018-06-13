const FullAtomic = {
  init(client) {
    return function(records, settings, indexName) {

//    // What records are already in the app?
//    const remoteIds = await getRemoteObjectIDs();

//    // Create a tmp copy of the prod index to add our changes
//    await copyIndexSync(indexProdName, indexTmpName);

//    // Update settings
//    await setSettingsSync(indexTmpName, defaultIndexSettings);

//    // Apply the diff between local and remote on the temp index
//    const diffBatch = buildDiffBatch(remoteIds, records, indexTmpName);
//    await runBatchSync(diffBatch, { uuid: 'diff' });

//    // Preparing a new manifest index
//    await clearIndexSync(indexManifestTmpName);
//    const manifestBatch = buildManifestBatch(records, indexManifestTmpName);
//    await runBatchSync(manifestBatch, { uuid: 'manifest' });

//    // Overwriting production indexes with temporary indexes
//    await pAll([
//      async () => {
//        await moveIndexSync(indexManifestTmpName, indexManifestName);
//        console.info('✔ Manifest overwritten');
//      },
//      async () => {
//        await moveIndexSync(indexTmpName, indexProdName);
//        console.info('✔ Production index overwritten');
//      },
//    ]);
//    console.info('✔ All Done');
    }
  },
};

export default FullAtomic;
