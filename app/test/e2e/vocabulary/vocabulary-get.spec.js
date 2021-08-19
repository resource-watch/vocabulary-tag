const nock = require('nock');
const chai = require('chai');
const Resource = require('models/resource.model');
const Vocabulary = require('models/vocabulary.model');

const {
    assertOKResponse, mockGetUserFromToken, createVocabulary
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

    it('Finding all resources for a vocabulary without query params or being authenticated should return a 200 OK and a data array', async () => {
        const vocabularyOne = await (new Vocabulary(createVocabulary({ id: 'abcd' }))).save();
        const vocabularyTwo = await (new Vocabulary(createVocabulary({ id: 'efgh' }))).save();

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

    it('Finding all resources for a vocabulary without query params while being authenticated should return a 200 OK and a data array', async () => {
        const vocabularyOne = await (new Vocabulary(createVocabulary({ id: 'abcd' }))).save();
        const vocabularyTwo = await (new Vocabulary(createVocabulary({ id: 'efgh' }))).save();
        mockGetUserFromToken(USERS.USER);

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

    it('Finding all resources for a vocabulary without auth and with a set of query params returns 200 OK and a data array', async () => {
        const vocabularyOne = await (new Vocabulary(createVocabulary({ id: 'abcd' }))).save();
        const vocabularyTwo = await (new Vocabulary(createVocabulary({ id: 'efgh' }))).save();
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

    it('Finding all resources for a vocabulary with query params while being authenticated should return a 200 OK and a data array', async () => {
        const vocabularyOne = await (new Vocabulary(createVocabulary({ id: 'abcd' }))).save();
        const vocabularyTwo = await (new Vocabulary(createVocabulary({ id: 'efgh' }))).save();
        mockGetUserFromToken(USERS.USER);

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

    it('Finding all resources for a vocabulary with query params and env while being authenticated should return a 200 OK and a data array with part of resources', async () => {
        const vocabularyOne = await (new Vocabulary(createVocabulary({ id: 'abcd' }))).save();
        await (new Vocabulary(createVocabulary({ id: 'efgh' }))).save();
        mockGetUserFromToken(USERS.USER);

        nock(process.env.GATEWAY_URL)
            .post('/v1/dataset/find-by-ids')
            .once()
            .reply(200, { data: [vocabularyOne.resources[0]] });

        nock(process.env.GATEWAY_URL)
            .post('/v1/dataset/find-by-ids')
            .once()
            .reply(200, { data: [] });

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

    it('Finding all resources for a vocabulary with query params and env while being authenticated should return a 200 OK and a data array with empty resources', async () => {
        await (new Vocabulary(createVocabulary({ id: 'abcd' }))).save();
        await (new Vocabulary(createVocabulary({ id: 'efgh' }))).save();
        mockGetUserFromToken(USERS.USER);

        nock(process.env.GATEWAY_URL)
            .post('/v1/dataset/find-by-ids')
            .once()
            .reply(200, { data: [] });

        nock(process.env.GATEWAY_URL)
            .post('/v1/dataset/find-by-ids')
            .once()
            .reply(200, { data: [] });

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

    afterEach(async () => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }

        await Resource.deleteMany({}).exec();
        await Vocabulary.deleteMany({}).exec();
    });
});
