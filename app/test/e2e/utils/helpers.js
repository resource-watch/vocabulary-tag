const mongoose = require('mongoose');
const config = require('config');
const nock = require('nock');
const { mockValidateRequest, mockCloudWatchLogRequest } = require('rw-api-microservice-node/dist/test-mocks');
const { USERS } = require('./test.constants');

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

const createFavourite = (additionalData = {}) => {
    const fakeResourceId = getUUID();
    return {
        resourceId: fakeResourceId,
        resourceType: additionalData.resourceType || 'dataset',
        ...additionalData,
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

const mockDatasetStructure = (id, extraData = {}) => ({
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
        layerRelevantProps: [],
        ...extraData
    }
});

const mockDataset = (id = undefined, extraData = {}) => {
    const idToUse = id || mongoose.Types.ObjectId();
    const responseData = mockDatasetStructure(idToUse, extraData);
    nock(process.env.GATEWAY_URL, {
        reqheaders: {
            'x-api-key': 'api-key-test',
        }
    }).get(`/v1/dataset/${idToUse}`).reply(200, { data: responseData });
    return responseData;
};

const mockFindDatasetById = (datasetIds, env = undefined, customResponseData = undefined) => {
    const ids = datasetIds || [mongoose.Types.ObjectId().toString()];
    const responseData = customResponseData || [mockDatasetStructure(ids[0])];
    const body = {
        ids,
    };
    if (env) {
        body.env = env;
    }

    nock(process.env.GATEWAY_URL, {
        reqheaders: {
            'x-api-key': 'api-key-test',
        }
    })
        .post('/v1/dataset/find-by-ids', body)
        .reply(200, { data: responseData });
};

const mockWidgetStructure = (id, extraData = {}) => ({
    id,
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
});

const mockWidget = (id = undefined, extraData = {}) => {
    const idToUse = id || mongoose.Types.ObjectId();
    const mockData = mockWidgetStructure(idToUse, extraData);
    nock(process.env.GATEWAY_URL, {
        reqheaders: {
            'x-api-key': 'api-key-test',
        }
    }).get(`/v1/widget/${idToUse}`).reply(200, { data: mockData });
    return mockData;
};

const mockFindWidgetById = (widgetIds, env = undefined, customResponseData = undefined) => {
    const ids = widgetIds || [mongoose.Types.ObjectId().toString()];
    const responseData = customResponseData || [mockWidgetStructure(ids[0])];
    const body = {
        ids,
    };
    if (env) {
        body.env = env;
    }

    nock(process.env.GATEWAY_URL, {
        reqheaders: {
            'x-api-key': 'api-key-test',
        }
    })
        .post('/v1/widget/find-by-ids', body)
        .reply(200, { data: responseData });
};

const mockLayerStructure = (id, extraData = {}) => ({
    id,
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
});

const mockLayer = (id = undefined, extraData = {}) => {
    const idToUse = id || mongoose.Types.ObjectId().toString();
    const mockData = mockLayerStructure(idToUse, extraData);
    nock(process.env.GATEWAY_URL, {
        reqheaders: {
            'x-api-key': 'api-key-test',
        }
    }).get(`/v1/layer/${idToUse}`).reply(200, { data: mockData });
    return mockData;
};

const mockFindLayerById = (layerIds, env = undefined, customResponseData = undefined) => {
    const ids = layerIds || [mongoose.Types.ObjectId().toString()];
    const responseData = customResponseData || [mockLayerStructure(ids[0])];
    const body = {
        ids,
    };
    if (env) {
        body.env = env;
    }

    nock(process.env.GATEWAY_URL, {
        reqheaders: {
            'x-api-key': 'api-key-test',
        }
    })
        .post('/v1/layer/find-by-ids', body)
        .reply(200, { data: responseData });
};

const mockPostGraphAssociation = (datasetId, mockSuccess = true) => {
    nock(process.env.GATEWAY_URL, {
        reqheaders: {
            'x-api-key': 'api-key-test',
        }
    })
        .post(`/v1/graph/dataset/${datasetId}/associate`)
        .reply(mockSuccess ? 200 : 404, { data: mockSuccess ? {} : { message: 'Resource XXXX not found.' } });

    if (!mockSuccess) {
        nock(process.env.GATEWAY_URL, {
            reqheaders: {
                'x-api-key': 'api-key-test',
            }
        })
            .post(`/v1/graph/dataset/${datasetId}`)
            .reply(200, { data: {} });

        nock(process.env.GATEWAY_URL, {
            reqheaders: {
                'x-api-key': 'api-key-test',
            }
        })
            .post(`/v1/graph/dataset/${datasetId}/associate`).reply(200, { data: {} });
    }
};

const mockPutGraphAssociation = (datasetId, mockSuccess = true) => {
    nock(process.env.GATEWAY_URL, {
        reqheaders: {
            'x-api-key': 'api-key-test',
        }
    })
        .put(`/v1/graph/dataset/${datasetId}/associate`)
        .reply(mockSuccess ? 200 : 404, { data: mockSuccess ? {} : { message: 'Resource XXXX not found.' } });

    if (!mockSuccess) {
        nock(process.env.GATEWAY_URL, {
            reqheaders: {
                'x-api-key': 'api-key-test',
            }
        })
            .post(`/v1/graph/dataset/${datasetId}`).reply(200, { data: {} });

        nock(process.env.GATEWAY_URL, {
            reqheaders: {
                'x-api-key': 'api-key-test',
            }
        })
            .put(`/v1/graph/dataset/${datasetId}/associate`).reply(200, { data: {} });
    }
};

const mockDeleteGraphAssociation = (datasetId, application = 'rw', mockSuccess = true) => {
    nock(process.env.GATEWAY_URL, {
        reqheaders: {
            'x-api-key': 'api-key-test',
        }
    })
        .delete(`/v1/graph/dataset/${datasetId}/associate?application=${application}`)
        .reply(mockSuccess ? 200 : 404, { data: mockSuccess ? {} : { message: 'Resource XXXX not found.' } });
};

const mockAddFavouriteResourceToGraph = (resourceType, resourceId, loggedUser) => {
    nock(process.env.GATEWAY_URL, {
        reqheaders: {
            'x-api-key': 'api-key-test',
        }
    })
        .post(`/v1/graph/favourite/${resourceType}/${resourceId}/${loggedUser.id}`,)
        .reply(200);
};

const mockDeleteFavouriteResourceFromGraph = (resourceType, resourceId, favouriteId) => {
    nock(process.env.GATEWAY_URL, {
        reqheaders: {
            'x-api-key': 'api-key-test',
        }
    })
        .delete(`/v1/graph/favourite/${resourceType}/${resourceId}/${favouriteId}`,)
        .reply(200);
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

const APPLICATION = {
    data: {
        type: 'applications',
        id: '649c4b204967792f3a4e52c9',
        attributes: {
            name: 'grouchy-armpit',
            organization: null,
            user: null,
            apiKeyValue: 'a1a9e4c3-bdff-4b6b-b5ff-7a60a0454e13',
            createdAt: '2023-06-28T15:00:48.149Z',
            updatedAt: '2023-06-28T15:00:48.149Z'
        }
    }
};

const mockValidateRequestWithApiKey = ({
    apiKey = 'api-key-test',
    application = APPLICATION
}) => {
    mockValidateRequest({
        gatewayUrl: process.env.GATEWAY_URL,
        microserviceToken: process.env.MICROSERVICE_TOKEN,
        application,
        apiKey
    });
    mockCloudWatchLogRequest({
        application,
        awsRegion: process.env.AWS_REGION,
        logGroupName: process.env.CLOUDWATCH_LOG_GROUP_NAME,
        logStreamName: config.get('service.name')
    });
};

const mockValidateRequestWithApiKeyAndUserToken = ({
    apiKey = 'api-key-test',
    token = 'abcd',
    application = APPLICATION,
    user = USERS.USER
}) => {
    mockValidateRequest({
        gatewayUrl: process.env.GATEWAY_URL,
        microserviceToken: process.env.MICROSERVICE_TOKEN,
        user,
        application,
        token,
        apiKey
    });
    mockCloudWatchLogRequest({
        user,
        application,
        awsRegion: process.env.AWS_REGION,
        logGroupName: process.env.CLOUDWATCH_LOG_GROUP_NAME,
        logStreamName: config.get('service.name')
    });
};

module.exports = {
    getUUID,
    assertOKResponse,
    assertUnauthorizedResponse,
    assertForbiddenResponse,
    createResource,
    createVocabulary,
    createCollection,
    createFavourite,
    mockDataset,
    mockDatasetStructure,
    mockFindDatasetById,
    mockFindLayerById,
    mockFindWidgetById,
    mockDeleteGraphAssociation,
    mockPostGraphAssociation,
    mockPutGraphAssociation,
    mockAddFavouriteResourceToGraph,
    mockDeleteFavouriteResourceFromGraph,
    mockLayer,
    mockWidget,
    mockValidateRequestWithApiKeyAndUserToken,
    mockValidateRequestWithApiKey,
    ensureCorrectError
};
