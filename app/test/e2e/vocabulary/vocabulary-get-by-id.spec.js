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
        const vocabularyOne = await (new Vocabulary(createVocabulary({ id: 'abcd' }))).save();
        await (new Vocabulary(createVocabulary({ id: 'efgh' }))).save();

        const response = await requester
            .get(`/api/v1/vocabulary/abcd`)
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
        mockGetUserFromToken(USERS.USER);

        const response = await requester
            .get(`/api/v1/vocabulary/abcd`)
            .set('Authorization', `Bearer abcd`)
            .send();

        assertOKResponse(response, 1);

        response.body.data[0].should.have.property('id').and.equal('abcd');
        response.body.data[0].should.have.property('type').and.equal('vocabulary');
        response.body.data[0].attributes.should.have.property('name').and.equal('abcd');
        response.body.data[0].attributes.should.have.property('application').and.equal('rw');
        response.body.data[0].attributes.should.have.property('resources').and.deep.equal(vocabularyOne.resources.toObject());
    });

    it('Finding all resources for a vocabulary without auth and with a set of query params returns 200 OK and a data array', async () => {
        const vocabularyOne = await (new Vocabulary(createVocabulary({ id: 'abcd' }))).save();
        await (new Vocabulary(createVocabulary({ id: 'efgh' }))).save();
        const response = await requester
            .get(`/api/v1/vocabulary/abcd`)
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
        mockGetUserFromToken(USERS.USER);

        const response = await requester
            .get(`/api/v1/vocabulary/abcd`)
            .query({
                foo: 'bar'
            })
            .set('Authorization', `Bearer abcd`)
            .send();

        assertOKResponse(response, 1);

        response.body.data[0].should.have.property('id').and.equal('abcd');
        response.body.data[0].should.have.property('type').and.equal('vocabulary');
        response.body.data[0].attributes.should.have.property('name').and.equal('abcd');
        response.body.data[0].attributes.should.have.property('application').and.equal('rw');
        response.body.data[0].attributes.should.have.property('resources').and.deep.equal(vocabularyOne.resources.toObject());
    });

    afterEach(async () => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }

        await Resource.deleteMany({}).exec();
        await Vocabulary.deleteMany({}).exec();
    });
});
