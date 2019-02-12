const getUUID = () => Math.random().toString(36).substring(7);

const createVocabulary = (app = 'rw') => {
    const uuid = getUUID();
    const datasetUuid = getUUID();

    return {
        id: uuid,
        status: 'published',
        updatedAt: '2017-12-27T16:09:46.855Z',
        createdAt: '2017-12-27T16:09:46.855Z',
        userId: 'legacy',
        resources: [
            {
                id: datasetUuid,
                dataset: datasetUuid,
                type: 'dataset',
                tags: [
                    'vector',
                    'table',
                    'global',
                    'gdp'
                ]
            }
        ],
        application: app
    };
};

const createResource = (app = 'rw', vocabularyCount = 1) => {
    const uuid = getUUID();
    const datasetUuid = getUUID();
    const vocabularies = [];

    for (let i = 0; i < vocabularyCount; i += 1) {
        vocabularies.push({
            id: getUUID(),
            tags: [
                'daily',
                'near_real_time',
                'geospatial',
                'raster',
                'forest',
                'fire'
            ],
            application: app
        });
    }
    return {
        id: uuid,
        dataset: datasetUuid,
        type: 'dataset',
        vocabularies
    };
};

module.exports = {
    createVocabulary, createResource
};
