const nock = require('nock');
const chai = require('chai');
const Resource = require('models/resource.model');
const Vocabulary = require('models/vocabulary.model');

const {
    assertOKResponse,
    mockValidateRequestWithApiKeyAndUserToken,
    createVocabulary,
    mockFindDatasetById,
    mockFindWidgetById,
    mockFindLayerById, mockValidateRequestWithApiKey
} = require('../utils/helpers');
const { USERS } = require('../utils/test.constants');

const { getTestServer } = require('../utils/test-server');

chai.should();

let requester;

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

describe('Find all resources for a vocabulary', () => {
    beforeEach(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();

        await Resource.deleteMany({}).exec();
        await Vocabulary.deleteMany({}).exec();
    });

    it('Finding all resources for a vocabulary without query params or being authenticated should return a 200 OK and a data array', async () => {
        mockValidateRequestWithApiKey({});
        const vocabularyOne = await (new Vocabulary(createVocabulary({ id: 'abcd' }))).save();
        await (new Vocabulary(createVocabulary({ id: 'efgh' }))).save();

        mockFindDatasetById([vocabularyOne.resources[0].id]);

        const response = await requester
            .get(`/api/v1/vocabulary/abcd`)
            .set('x-api-key', 'api-key-test')
            .send();

        assertOKResponse(response, 1);

        response.body.data[0].should.have.property('id').and.equal('abcd');
        response.body.data[0].should.have.property('type').and.equal('vocabulary');
        response.body.data[0].attributes.should.have.property('name').and.equal('abcd');
        response.body.data[0].attributes.should.have.property('application').and.equal('rw');
        response.body.data[0].attributes.should.have.property('resources').and.deep.equal(vocabularyOne.resources.toObject());
    });

    it('Finding all resources for a vocabulary without query params while being authenticated should return a 200 OK and a data array', async () => {
        const vocabularyOne = await (new Vocabulary(createVocabulary({ id: 'abcd' }))).save();
        await (new Vocabulary(createVocabulary({ id: 'efgh' }))).save();
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });

        mockFindDatasetById([vocabularyOne.resources[0].id]);

        const response = await requester
            .get(`/api/v1/vocabulary/abcd`)
            .set('Authorization', `Bearer abcd`)
            .set('x-api-key', 'api-key-test')
            .send();

        assertOKResponse(response, 1);

        response.body.data[0].should.have.property('id').and.equal('abcd');
        response.body.data[0].should.have.property('type').and.equal('vocabulary');
        response.body.data[0].attributes.should.have.property('name').and.equal('abcd');
        response.body.data[0].attributes.should.have.property('application').and.equal('rw');
        response.body.data[0].attributes.should.have.property('resources').and.deep.equal(vocabularyOne.resources.toObject());
    });

    it('Finding all resources for a vocabulary without auth and with a set of query params returns 200 OK and a data array', async () => {
        mockValidateRequestWithApiKey({});
        const vocabularyOne = await (new Vocabulary(createVocabulary({ id: 'abcd' }))).save();
        await (new Vocabulary(createVocabulary({ id: 'efgh' }))).save();

        mockFindDatasetById([vocabularyOne.resources[0].id]);

        const response = await requester
            .get(`/api/v1/vocabulary/abcd`)
            .set('x-api-key', 'api-key-test')
            .query({
                foo: 'bar'
            })
            .send();

        assertOKResponse(response, 1);

        response.body.data[0].should.have.property('id').and.equal('abcd');
        response.body.data[0].should.have.property('type').and.equal('vocabulary');
        response.body.data[0].attributes.should.have.property('name').and.equal('abcd');
        response.body.data[0].attributes.should.have.property('application').and.equal('rw');
        response.body.data[0].attributes.should.have.property('resources').and.deep.equal(vocabularyOne.resources.toObject());
    });

    it('Finding all resources for a vocabulary with query params while being authenticated should return a 200 OK and a data array', async () => {
        const vocabularyOne = await (new Vocabulary(createVocabulary({ id: 'abcd' }))).save();
        await (new Vocabulary(createVocabulary({ id: 'efgh' }))).save();
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });

        mockFindDatasetById([vocabularyOne.resources[0].id]);

        const response = await requester
            .get(`/api/v1/vocabulary/abcd`)
            .query({
                foo: 'bar'
            })
            .set('Authorization', `Bearer abcd`)
            .set('x-api-key', 'api-key-test')
            .send();

        assertOKResponse(response, 1);

        response.body.data[0].should.have.property('id').and.equal('abcd');
        response.body.data[0].should.have.property('type').and.equal('vocabulary');
        response.body.data[0].attributes.should.have.property('name').and.equal('abcd');
        response.body.data[0].attributes.should.have.property('application').and.equal('rw');
        response.body.data[0].attributes.should.have.property('resources').and.deep.equal(vocabularyOne.resources.toObject());
    });

    it('Finding all resources for a vocabulary with query params and env while being authenticated should return a 200 OK and data array with empty resources if none match the env filter', async () => {
        const vocabulary = await (new Vocabulary(createVocabulary({ id: 'abcd' }))).save();
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });

        mockFindDatasetById([vocabulary.resources[0].id], 'production', []);

        const response = await requester
            .get(`/api/v1/vocabulary/abcd`)
            .query({
                env: 'production'
            })
            .set('Authorization', `Bearer abcd`)
            .set('x-api-key', 'api-key-test')
            .send();

        assertOKResponse(response, 1);

        response.body.data[0].should.have.property('id').and.equal('abcd');
        response.body.data[0].should.have.property('type').and.equal('vocabulary');
        response.body.data[0].attributes.should.have.property('name').and.equal('abcd');
        response.body.data[0].attributes.should.have.property('application').and.equal('rw');
        response.body.data[0].attributes.should.have.property('resources').and.deep.equal([]);
    });

    it('Finding all resources for a vocabulary with query params and env while being authenticated should return a 200 OK and data array with resources if they match the env filter', async () => {
        const vocabulary = await (new Vocabulary(createVocabulary({ id: 'abcd' }))).save();
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });

        mockFindDatasetById([vocabulary.resources[0].id], 'production');

        const response = await requester
            .get(`/api/v1/vocabulary/abcd`)
            .query({
                env: 'production'
            })
            .set('Authorization', `Bearer abcd`)
            .set('x-api-key', 'api-key-test')
            .send();

        assertOKResponse(response, 1);

        response.body.data[0].should.have.property('id').and.equal('abcd');
        response.body.data[0].should.have.property('type').and.equal('vocabulary');
        response.body.data[0].attributes.should.have.property('name').and.equal('abcd');
        response.body.data[0].attributes.should.have.property('application').and.equal('rw');
        response.body.data[0].attributes.should.have.property('resources').and.deep.equal([
            {
                dataset: vocabulary.resources[0].id,
                id: vocabulary.resources[0].id,
                tags: [
                    'vector',
                    'table',
                    'global',
                    'gdp'
                ],
                type: 'dataset'
            }
        ]);
    });

    it('Finding all resources for a vocabulary with query params and env while being authenticated should return a 200 OK and data array with resources if they match the env filter - multiple types', async () => {
        const vocabulary = await (new Vocabulary(createVocabulary({
            id: 'abcd',
            resources: [
                {
                    id: 'datasetId',
                    dataset: 'datasetId',
                    type: 'dataset',
                    tags: [
                        'vector',
                        'table',
                        'global',
                        'gdp'
                    ]
                },
                {
                    id: 'widgetId',
                    dataset: 'datasetId',
                    type: 'widget',
                    tags: [
                        'vector',
                        'table',
                        'global',
                        'gdp'
                    ]
                },
                {
                    id: 'layerId',
                    dataset: 'datasetId',
                    type: 'layer',
                    tags: [
                        'vector',
                        'table',
                        'global',
                        'gdp'
                    ]
                }
            ]
        }))).save();

        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });

        mockFindDatasetById([vocabulary.resources[0].id], 'production');
        mockFindWidgetById([vocabulary.resources[1].id], 'production');
        mockFindLayerById([vocabulary.resources[2].id], 'production');

        const response = await requester
            .get(`/api/v1/vocabulary/abcd`)
            .query({
                env: 'production'
            })
            .set('Authorization', `Bearer abcd`)
            .set('x-api-key', 'api-key-test')
            .send();

        assertOKResponse(response, 1);

        response.body.data[0].should.have.property('id').and.equal('abcd');
        response.body.data[0].should.have.property('type').and.equal('vocabulary');
        response.body.data[0].attributes.should.have.property('name').and.equal('abcd');
        response.body.data[0].attributes.should.have.property('application').and.equal('rw');
        response.body.data[0].attributes.should.have.property('resources').and.deep.equal([
            {
                dataset: 'datasetId',
                id: 'datasetId',
                tags: [
                    'vector',
                    'table',
                    'global',
                    'gdp'
                ],
                type: 'dataset',
            },
            {
                dataset: 'datasetId',
                id: 'widgetId',
                tags: [
                    'vector',
                    'table',
                    'global',
                    'gdp',
                ],
                type: 'widget',
            },
            {
                dataset: 'datasetId',
                id: 'layerId',
                tags: [
                    'vector',
                    'table',
                    'global',
                    'gdp',
                ],
                type: 'layer',
            }
        ]);
    });

    it('Finding all resources for a vocabulary with query params and env while being authenticated should return a 200 OK and data array with resources if they match the env filter - multiple types, multiple envs', async () => {
        const vocabulary = await (new Vocabulary(createVocabulary({
            id: 'abcd',
            resources: [
                {
                    id: 'datasetId',
                    dataset: 'datasetId',
                    type: 'dataset',
                    tags: [
                        'vector',
                        'table',
                        'global',
                        'gdp'
                    ]
                },
                {
                    id: 'widgetId',
                    dataset: 'datasetId',
                    type: 'widget',
                    tags: [
                        'vector',
                        'table',
                        'global',
                        'gdp'
                    ]
                },
                {
                    id: 'layerId',
                    dataset: 'datasetId',
                    type: 'layer',
                    tags: [
                        'vector',
                        'table',
                        'global',
                        'gdp'
                    ]
                }
            ]
        }))).save();

        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });

        mockFindDatasetById([vocabulary.resources[0].id], 'production,potato');
        mockFindWidgetById([vocabulary.resources[1].id], 'production,potato');
        mockFindLayerById([vocabulary.resources[2].id], 'production,potato');

        const response = await requester
            .get(`/api/v1/vocabulary/abcd`)
            .query({
                env: 'production,potato'
            })
            .set('Authorization', `Bearer abcd`)
            .set('x-api-key', 'api-key-test')
            .send();

        assertOKResponse(response, 1);

        response.body.data[0].should.have.property('id').and.equal('abcd');
        response.body.data[0].should.have.property('type').and.equal('vocabulary');
        response.body.data[0].attributes.should.have.property('name').and.equal('abcd');
        response.body.data[0].attributes.should.have.property('application').and.equal('rw');
        response.body.data[0].attributes.should.have.property('resources').and.deep.equal([
            {
                dataset: 'datasetId',
                id: 'datasetId',
                tags: [
                    'vector',
                    'table',
                    'global',
                    'gdp'
                ],
                type: 'dataset',
            },
            {
                dataset: 'datasetId',
                id: 'widgetId',
                tags: [
                    'vector',
                    'table',
                    'global',
                    'gdp',
                ],
                type: 'widget',
            },
            {
                dataset: 'datasetId',
                id: 'layerId',
                tags: [
                    'vector',
                    'table',
                    'global',
                    'gdp',
                ],
                type: 'layer',
            }
        ]);
    });

    afterEach(async () => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }

        await Resource.deleteMany({}).exec();
        await Vocabulary.deleteMany({}).exec();
    });
});
