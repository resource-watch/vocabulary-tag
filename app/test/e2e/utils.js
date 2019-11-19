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

/**
 * Mocks the requests for validating a dataset.
 * Returns the id of the mock dataset.
 *
 * @param {Object} opts Options object
 * Should contain the nock instance and optionally an id to use as the mock dataset's id.
 *
 * @returns {String} The id of the mock dataset.
 */
const mockDataset = ({ nock, id = undefined }) => {
    // If id has not been provided, set it as the current timestamp
    const idToUse = id || new Date().getTime();
    nock(process.env.CT_URL)
        .get(`/v1/dataset/${idToUse}`)
        .reply(200, {
            data: {
                id,
                type: 'dataset',
                attributes: {
                    name: 'Uncontrolled Public-Use Airports -- U.S.',
                    slug: 'Uncontrolled-Public-Use-Airports-US_2',
                    type: null,
                    subtitle: null,
                    application: ['rw'],
                    dataPath: null,
                    attributesPath: null,
                    connectorType: 'rest',
                    provider: 'featureservice',
                    userId: '1a10d7c6e0a37126611fd7a7',
                    connectorUrl: 'https://services.arcgis.com/uDTUpUPbk8X8mXwl/arcgis/rest/services/Public_Schools_in_Onondaga_County/FeatureServer/0?f=json',
                    tableName: 'Public_Schools_in_Onondaga_County',
                    status: 'pending',
                    published: true,
                    overwrite: false,
                    verified: false,
                    blockchain: {},
                    mainDateField: null,
                    env: 'production',
                    geoInfo: false,
                    protected: false,
                    legend: {
                        date: [], region: [], country: [], nested: []
                    },
                    clonedHost: {},
                    errorMessage: null,
                    taskId: null,
                    updatedAt: '2018-11-05T15:25:53.321Z',
                    dataLastUpdated: null,
                    widgetRelevantProps: [],
                    layerRelevantProps: []
                }
            }
        });
    return idToUse;
};

module.exports = {
    createVocabulary, createResource, mockDataset
};
