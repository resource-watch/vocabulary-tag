const mongoose = require('mongoose');
const nock = require('nock');

const getUUID = () => Math.random().toString(36).substring(7);

const ensureCorrectError = (body, errMessage) => {
    body.should.have.property('errors').and.be.an('array');
    body.errors[0].should.have.property('detail').and.equal(errMessage);
};

const createVocabulary = (additionalData = {}) => {
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
        application: 'rw',
        ...additionalData
    };
};

const createCollection = (additionalData = {}) => {
    const uuid = getUUID();

    return {
        id: uuid,
        name: `Collection ${uuid}`,
        application: 'rw',
        ownerId: 'abcde',
        resources: [],
        ...additionalData
    };
};

const createResource = (app = 'rw', vocabularyCount = 1, type = 'dataset', id = null) => {
    const uuid = getUUID();
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
        id: id || uuid,
        dataset: uuid,
        type,
        vocabularies
    };
};

const mockDataset = (id = undefined, extraData = {}) => {
    const idToUse = id || mongoose.Types.ObjectId();
    const mockData = {
        id: idToUse,
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
            layerRelevantProps: [],
            ...extraData
        }
    };
    nock(process.env.GATEWAY_URL).get(`/v1/dataset/${idToUse}`).reply(200, { data: mockData });
    return mockData;
};

const mockWidget = (id = undefined, extraData = {}) => {
    const idToUse = id || mongoose.Types.ObjectId();
    const mockData = {
        id: idToUse,
        type: 'widget',
        attributes: {
            name: 'Projected Change in Number of Frost-Free Season Days - Higher Emissions (A2)',
            dataset: '14813f7c-a635-4ed0-802f-3f4395daedd4',
            slug: 'projected-change-in-number-of-days-over-35-u-s-midwest',
            userId: '58333dcfd9f39b189ca44c75',
            description: 'Projected increase in annual average temperatures by mid-century (2041-2070)...',
            source: null,
            sourceUrl: null,
            authors: null,
            application: [
                'prep'
            ],
            verified: false,
            default: false,
            protected: false,
            defaultEditableWidget: false,
            published: true,
            freeze: false,
            env: 'production',
            queryUrl: 'ftp://filsrv.cicsnc.org/tsu/nca3-data/Figure_18-2_files.tar.gz',
            widgetConfig: {
                type: 'map',
                layer_id: '901ce25e-7707-4f98-98f5-a824386253ea'
            },
            template: false,
            layerId: null,
            createdAt: '2016-09-15T15:48:38.688Z',
            updatedAt: '2017-03-21T12:39:21.826Z',
            ...extraData
        }
    };
    nock(process.env.GATEWAY_URL).get(`/v1/widget/${idToUse}`).reply(200, { data: mockData });
    return mockData;
};

const mockLayer = (id = undefined, extraData = {}) => {
    const idToUse = id || mongoose.Types.ObjectId();
    const mockData = {
        id: idToUse,
        type: 'layer',
        attributes: {
            name: 'Heating Degree Days - Divisional',
            slug: 'heating-degree-days-divisional',
            dataset: '6e05863a-061a-418e-9f2f-3e0eaec3f0df',
            description: '',
            application: [
                'prep'
            ],
            iso: [
                'USA'
            ],
            provider: 'arcgis',
            userId: 'legacy',
            default: true,
            protected: false,
            published: true,
            env: 'production',
            layerConfig: {
                type: 'dynamicMapLayer',
                body: {
                    url: 'https://gis.ncdc.noaa.gov/arcgis/rest/services/cdo/indices/MapServer',
                    layers: [
                        10
                    ],
                    useCors: false
                }
            },
            legendConfig: {
                type: 'choropleth',
                items: [
                    {
                        value: '< 300',
                        color: '#B6EDF0'
                    },
                    {
                        value: '300 - 600',
                        color: '#8AC6EB'
                    },
                    {
                        value: '600 - 900',
                        color: '#5CA3E6'
                    },
                    {
                        value: '900 - 1200',
                        color: '#2183E0'
                    },
                    {
                        value: '1200 - 1500',
                        color: '#2158C7'
                    },
                    {
                        value: '1500 - 1800',
                        color: '#1B31AB'
                    },
                    {
                        value: '> 1800',
                        color: '#0B0BF5'
                    }
                ]
            },
            interactionConfig: {},
            applicationConfig: {
                'config one': {
                    type: 'lorem',
                    from: {
                        data: 'table'
                    }
                }
            },
            staticImageConfig: {},
            createdAt: '2016-09-06T11:43:25.207Z',
            updatedAt: '2016-09-06T12:06:47.364Z',
            ...extraData
        }
    };
    nock(process.env.GATEWAY_URL).get(`/v1/layer/${idToUse}`).reply(200, { data: mockData });
    return mockData;
};

const mockPostGraphAssociation = (datasetId, mockSuccess = true) => {
    nock(process.env.GATEWAY_URL)
        .post(`/v1/graph/dataset/${datasetId}/associate`)
        .reply(mockSuccess ? 200 : 404, { data: mockSuccess ? {} : { message: 'Resource XXXX not found.' } });

    if (!mockSuccess) {
        nock(process.env.GATEWAY_URL)
            .post(`/v1/graph/dataset/${datasetId}`)
            .reply(200, { data: {} });

        nock(process.env.GATEWAY_URL)
            .post(`/v1/graph/dataset/${datasetId}/associate`).reply(200, { data: {} });
    }
};

const mockPutGraphAssociation = (datasetId, mockSuccess = true) => {
    nock(process.env.GATEWAY_URL)
        .put(`/v1/graph/dataset/${datasetId}/associate`)
        .reply(mockSuccess ? 200 : 404, { data: mockSuccess ? {} : { message: 'Resource XXXX not found.' } });

    if (!mockSuccess) {
        nock(process.env.GATEWAY_URL)
            .post(`/v1/graph/dataset/${datasetId}`).reply(200, { data: {} });

        nock(process.env.GATEWAY_URL)
            .put(`/v1/graph/dataset/${datasetId}/associate`).reply(200, { data: {} });
    }
};

const mockDeleteGraphAssociation = (datasetId, application = 'rw', mockSuccess = true) => {
    nock(process.env.GATEWAY_URL)
        .delete(`/v1/graph/dataset/${datasetId}/associate?application=${application}`)
        .reply(mockSuccess ? 200 : 404, { data: mockSuccess ? {} : { message: 'Resource XXXX not found.' } });
};

const assertUnauthorizedResponse = (response) => {
    response.status.should.equal(401);
    response.body.should.have.property('errors').and.be.an('array');
    response.body.errors[0].should.have.property('detail').and.equal('Unauthorized');
};
const assertForbiddenResponse = (response) => {
    response.status.should.equal(403);
    response.body.should.have.property('errors').and.be.an('array');
    response.body.errors[0].should.have.property('detail').and.equal('Forbidden');
};

const assertOKResponse = (response, length = undefined) => {
    response.status.should.equal(200);
    response.body.should.have.property('data').and.be.an('array');
    if (length) {
        response.body.should.have.property('data').and.be.an('array').and.have.lengthOf(length);
    }
};

const mockGetUserFromToken = (userProfile) => {
    nock(process.env.GATEWAY_URL, { reqheaders: { authorization: 'Bearer abcd' } })
        .get('/auth/user/me')
        .reply(200, userProfile);
};

module.exports = {
    getUUID,
    assertOKResponse,
    assertUnauthorizedResponse,
    assertForbiddenResponse,
    createResource,
    createVocabulary,
    createCollection,
    mockDataset,
    mockDeleteGraphAssociation,
    mockPostGraphAssociation,
    mockPutGraphAssociation,
    mockLayer,
    mockWidget,
    mockGetUserFromToken,
    ensureCorrectError
};
