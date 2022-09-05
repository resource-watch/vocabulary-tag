const nock = require('nock');
const chai = require('chai');
const Resource = require('models/resource.model');
const Vocabulary = require('models/vocabulary.model');

const {
    assertOKResponse,
    mockGetUserFromToken,
    createVocabulary,
    mockFindDatasetById,
    mockFindWidgetById,
    mockFindLayerById,
    mockDatasetStructure
} = require('../utils/helpers');
const { USERS } = require('../utils/test.constants');

const { getTestServer } = require('../utils/test-server');

chai.should();

let requester;

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

describe('Find all resources for all vocabularies', () => {
    beforeEach(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();

        await Resource.deleteMany({}).exec();
        await Vocabulary.deleteMany({}).exec();
    });

    it('Finding all resources for all vocabularies without query params or being authenticated should return a 200 OK and a data array', async () => {
        const vocabularyOne = await (new Vocabulary(createVocabulary({ id: 'abcd' }))).save();
        const vocabularyTwo = await (new Vocabulary(createVocabulary({ id: 'efgh' }))).save();

        mockFindDatasetById(
            [vocabularyOne.resources[0].id, vocabularyTwo.resources[0].id],
            undefined,
            [
                mockDatasetStructure(vocabularyOne.resources[0].id),
                mockDatasetStructure(vocabularyTwo.resources[0].id)
            ]
        );

        const response = await requester
            .get(`/api/v1/vocabulary`)
            .send();

        assertOKResponse(response, 2);

        response.body.data[0].should.have.property('id').and.equal('abcd');
        response.body.data[0].should.have.property('type').and.equal('vocabulary');
        response.body.data[0].attributes.should.have.property('name').and.equal('abcd');
        response.body.data[0].attributes.should.have.property('application').and.equal('rw');
        response.body.data[0].attributes.should.have.property('resources').and.deep.equal(vocabularyOne.resources.toObject());

        response.body.data[1].should.have.property('id').and.equal('efgh');
        response.body.data[1].should.have.property('type').and.equal('vocabulary');
        response.body.data[1].attributes.should.have.property('name').and.equal('efgh');
        response.body.data[1].attributes.should.have.property('application').and.equal('rw');
        response.body.data[1].attributes.should.have.property('resources').and.deep.equal(vocabularyTwo.resources.toObject());
    });

    it('Finding all resources for all vocabularies without query params while being authenticated should return a 200 OK and a data array', async () => {
        const vocabularyOne = await (new Vocabulary(createVocabulary({ id: 'abcd' }))).save();
        const vocabularyTwo = await (new Vocabulary(createVocabulary({ id: 'efgh' }))).save();
        mockGetUserFromToken(USERS.USER);

        mockFindDatasetById(
            [vocabularyOne.resources[0].id, vocabularyTwo.resources[0].id],
            undefined,
            [
                mockDatasetStructure(vocabularyOne.resources[0].id),
                mockDatasetStructure(vocabularyTwo.resources[0].id)
            ]
        );

        const response = await requester
            .get(`/api/v1/vocabulary`)
            .set('Authorization', `Bearer abcd`)
            .send();

        assertOKResponse(response, 2);

        response.body.data[0].should.have.property('id').and.equal('abcd');
        response.body.data[0].should.have.property('type').and.equal('vocabulary');
        response.body.data[0].attributes.should.have.property('name').and.equal('abcd');
        response.body.data[0].attributes.should.have.property('application').and.equal('rw');
        response.body.data[0].attributes.should.have.property('resources').and.deep.equal(vocabularyOne.resources.toObject());

        response.body.data[1].should.have.property('id').and.equal('efgh');
        response.body.data[1].should.have.property('type').and.equal('vocabulary');
        response.body.data[1].attributes.should.have.property('name').and.equal('efgh');
        response.body.data[1].attributes.should.have.property('application').and.equal('rw');
        response.body.data[1].attributes.should.have.property('resources').and.deep.equal(vocabularyTwo.resources.toObject());
    });

    it('Finding all resources for all vocabularies without auth and with a set of query params returns 200 OK and a data array', async () => {
        const vocabularyOne = await (new Vocabulary(createVocabulary({ id: 'abcd' }))).save();
        const vocabularyTwo = await (new Vocabulary(createVocabulary({ id: 'efgh' }))).save();

        mockFindDatasetById(
            [vocabularyOne.resources[0].id, vocabularyTwo.resources[0].id],
            undefined,
            [
                mockDatasetStructure(vocabularyOne.resources[0].id),
                mockDatasetStructure(vocabularyTwo.resources[0].id)
            ]
        );

        const response = await requester
            .get(`/api/v1/vocabulary`)
            .query({
                foo: 'bar'
            })
            .send();

        assertOKResponse(response, 2);

        response.body.data[0].should.have.property('id').and.equal('abcd');
        response.body.data[0].should.have.property('type').and.equal('vocabulary');
        response.body.data[0].attributes.should.have.property('name').and.equal('abcd');
        response.body.data[0].attributes.should.have.property('application').and.equal('rw');
        response.body.data[0].attributes.should.have.property('resources').and.deep.equal(vocabularyOne.resources.toObject());

        response.body.data[1].should.have.property('id').and.equal('efgh');
        response.body.data[1].should.have.property('type').and.equal('vocabulary');
        response.body.data[1].attributes.should.have.property('name').and.equal('efgh');
        response.body.data[1].attributes.should.have.property('application').and.equal('rw');
        response.body.data[1].attributes.should.have.property('resources').and.deep.equal(vocabularyTwo.resources.toObject());
    });

    it('Finding all resources for all vocabularies with query params while being authenticated should return a 200 OK and a data array', async () => {
        const vocabularyOne = await (new Vocabulary(createVocabulary({ id: 'abcd' }))).save();
        const vocabularyTwo = await (new Vocabulary(createVocabulary({ id: 'efgh' }))).save();
        mockGetUserFromToken(USERS.USER);

        mockFindDatasetById(
            [vocabularyOne.resources[0].id, vocabularyTwo.resources[0].id],
            undefined,
            [
                mockDatasetStructure(vocabularyOne.resources[0].id),
                mockDatasetStructure(vocabularyTwo.resources[0].id)
            ]
        );
        const response = await requester
            .get(`/api/v1/vocabulary`)
            .query({
                foo: 'bar'
            })
            .set('Authorization', `Bearer abcd`)
            .send();

        assertOKResponse(response, 2);

        response.body.data[0].should.have.property('id').and.equal('abcd');
        response.body.data[0].should.have.property('type').and.equal('vocabulary');
        response.body.data[0].attributes.should.have.property('name').and.equal('abcd');
        response.body.data[0].attributes.should.have.property('application').and.equal('rw');
        response.body.data[0].attributes.should.have.property('resources').and.deep.equal(vocabularyOne.resources.toObject());

        response.body.data[1].should.have.property('id').and.equal('efgh');
        response.body.data[1].should.have.property('type').and.equal('vocabulary');
        response.body.data[1].attributes.should.have.property('name').and.equal('efgh');
        response.body.data[1].attributes.should.have.property('application').and.equal('rw');
        response.body.data[1].attributes.should.have.property('resources').and.deep.equal(vocabularyTwo.resources.toObject());
    });

    it('Finding all resources for all vocabularies with query params and env while being authenticated should return a 200 OK and a data array with part of resources', async () => {
        const vocabularyOne = await (new Vocabulary(createVocabulary({ id: 'abcd' }))).save();
        const vocabularyTwo = await (new Vocabulary(createVocabulary({ id: 'efgh' }))).save();
        mockGetUserFromToken(USERS.USER);

        mockFindDatasetById([vocabularyOne.resources[0].id, vocabularyTwo.resources[0].id], 'production');

        const response = await requester
            .get(`/api/v1/vocabulary`)
            .query({
                env: 'production'
            })
            .set('Authorization', `Bearer abcd`)
            .send();

        assertOKResponse(response, 2);

        response.body.data[0].should.have.property('id').and.equal('abcd');
        response.body.data[0].should.have.property('type').and.equal('vocabulary');
        response.body.data[0].attributes.should.have.property('name').and.equal('abcd');
        response.body.data[0].attributes.should.have.property('application').and.equal('rw');
        response.body.data[0].attributes.should.have.property('resources').and.deep.equal(vocabularyOne.resources.toObject());

        response.body.data[1].should.have.property('id').and.equal('efgh');
        response.body.data[1].should.have.property('type').and.equal('vocabulary');
        response.body.data[1].attributes.should.have.property('name').and.equal('efgh');
        response.body.data[1].attributes.should.have.property('application').and.equal('rw');
        response.body.data[1].attributes.should.have.property('resources').and.deep.equal([]);
    });

    it('Finding all resources for all vocabularies with query params and env while being authenticated should return a 200 OK and a data array with empty resources', async () => {
        const vocabularyOne = await (new Vocabulary(createVocabulary({ id: 'abcd' }))).save();
        const vocabularyTwo = await (new Vocabulary(createVocabulary({ id: 'efgh' }))).save();
        mockGetUserFromToken(USERS.USER);

        mockFindDatasetById([vocabularyOne.resources[0].id, vocabularyTwo.resources[0].id], 'production', []);

        const response = await requester
            .get(`/api/v1/vocabulary`)
            .query({
                env: 'production'
            })
            .set('Authorization', `Bearer abcd`)
            .send();

        assertOKResponse(response, 2);

        response.body.data[0].should.have.property('id').and.equal('abcd');
        response.body.data[0].should.have.property('type').and.equal('vocabulary');
        response.body.data[0].attributes.should.have.property('name').and.equal('abcd');
        response.body.data[0].attributes.should.have.property('application').and.equal('rw');
        response.body.data[0].attributes.should.have.property('resources').and.deep.equal([]);

        response.body.data[1].should.have.property('id').and.equal('efgh');
        response.body.data[1].should.have.property('type').and.equal('vocabulary');
        response.body.data[1].attributes.should.have.property('name').and.equal('efgh');
        response.body.data[1].attributes.should.have.property('application').and.equal('rw');
        response.body.data[1].attributes.should.have.property('resources').and.deep.equal([]);
    });

    it('Finding all resources for all vocabularies with query params and env while being authenticated should return a 200 OK and data array with resources if they match the env filter - multiple types', async () => {
        const vocabularyOne = await (new Vocabulary(createVocabulary({
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
        const vocabularyTwo = await (new Vocabulary(createVocabulary({ id: 'efgh' }))).save();

        mockGetUserFromToken(USERS.USER);

        mockFindDatasetById([vocabularyOne.resources[0].id, vocabularyTwo.resources[0].id], 'production');
        mockFindWidgetById([vocabularyOne.resources[1].id], 'production');
        mockFindLayerById([vocabularyOne.resources[2].id], 'production');

        const response = await requester
            .get(`/api/v1/vocabulary`)
            .query({
                env: 'production'
            })
            .set('Authorization', `Bearer abcd`)
            .send();

        assertOKResponse(response, 2);

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

    it('Finding all resources for all vocabularies with query params and env while being authenticated should return a 200 OK and data array with resources if they match the env filter - multiple types, multiple envs', async () => {
        const vocabularyOne = await (new Vocabulary(createVocabulary({
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
        const vocabularyTwo = await (new Vocabulary(createVocabulary({ id: 'efgh' }))).save();

        mockGetUserFromToken(USERS.USER);

        mockFindDatasetById([vocabularyOne.resources[0].id, vocabularyTwo.resources[0].id], 'production,potato');
        mockFindWidgetById([vocabularyOne.resources[1].id], 'production,potato');
        mockFindLayerById([vocabularyOne.resources[2].id], 'production,potato');

        const response = await requester
            .get(`/api/v1/vocabulary`)
            .query({
                env: 'production,potato'
            })
            .set('Authorization', `Bearer abcd`)
            .send();

        assertOKResponse(response, 2);

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

    it('Finding all resources for all vocabularies from userId without being authenticated should return a 200 OK and a data array', async () => {
        const vocabularyOne = await (new Vocabulary(createVocabulary({ id: 'abcd', userId: 'zzzz' }))).save();
        await (new Vocabulary(createVocabulary({ id: 'efgh', userId: 'yyyy' }))).save();
        const vocabularyTwo = await (new Vocabulary(createVocabulary({ id: 'jklm', userId: 'zzzz' }))).save();

        mockFindDatasetById(
            [vocabularyOne.resources[0].id, vocabularyTwo.resources[0].id],
            undefined,
            [
                mockDatasetStructure(vocabularyOne.resources[0].id),
                mockDatasetStructure(vocabularyTwo.resources[0].id)
            ]
        );

        const response = await requester
            .get(`/api/v1/vocabulary`)
            .query({ userId: 'zzzz' })
            .send();

        assertOKResponse(response, 2);

        response.body.data[0].should.have.property('id').and.equal('abcd');
        response.body.data[0].should.have.property('type').and.equal('vocabulary');
        response.body.data[0].attributes.should.have.property('name').and.equal('abcd');
        response.body.data[0].attributes.should.have.property('application').and.equal('rw');
        response.body.data[0].attributes.should.have.property('resources').and.deep.equal(vocabularyOne.resources.toObject());

        response.body.data[1].should.have.property('id').and.equal('jklm');
        response.body.data[1].should.have.property('type').and.equal('vocabulary');
        response.body.data[1].attributes.should.have.property('name').and.equal('jklm');
        response.body.data[1].attributes.should.have.property('application').and.equal('rw');
        response.body.data[1].attributes.should.have.property('resources').and.deep.equal(vocabularyTwo.resources.toObject());
    });

    it('Finding all resources for all vocabularies from userId while authenticated should return a 200 OK and a data array', async () => {
        const vocabularyOne = await (new Vocabulary(createVocabulary({ id: 'abcd', userId: 'zzzz' }))).save();
        await (new Vocabulary(createVocabulary({ id: 'efgh', userId: 'yyyy' }))).save();
        const vocabularyTwo = await (new Vocabulary(createVocabulary({ id: 'jklm', userId: 'zzzz' }))).save();
        mockGetUserFromToken(USERS.USER);

        mockFindDatasetById(
            [vocabularyOne.resources[0].id, vocabularyTwo.resources[0].id],
            undefined,
            [
                mockDatasetStructure(vocabularyOne.resources[0].id),
                mockDatasetStructure(vocabularyTwo.resources[0].id)
            ]
        );

        const response = await requester
            .get(`/api/v1/vocabulary`)
            .query({ userId: 'zzzz' })
            .set('Authorization', `Bearer abcd`)
            .send();

        assertOKResponse(response, 2);

        response.body.data[0].should.have.property('id').and.equal('abcd');
        response.body.data[0].should.have.property('type').and.equal('vocabulary');
        response.body.data[0].attributes.should.have.property('name').and.equal('abcd');
        response.body.data[0].attributes.should.have.property('application').and.equal('rw');
        response.body.data[0].attributes.should.have.property('resources').and.deep.equal(vocabularyOne.resources.toObject());

        response.body.data[1].should.have.property('id').and.equal('jklm');
        response.body.data[1].should.have.property('type').and.equal('vocabulary');
        response.body.data[1].attributes.should.have.property('name').and.equal('jklm');
        response.body.data[1].attributes.should.have.property('application').and.equal('rw');
        response.body.data[1].attributes.should.have.property('resources').and.deep.equal(vocabularyTwo.resources.toObject());
    });

    afterEach(async () => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }

        await Resource.deleteMany({}).exec();
        await Vocabulary.deleteMany({}).exec();
    });
});
