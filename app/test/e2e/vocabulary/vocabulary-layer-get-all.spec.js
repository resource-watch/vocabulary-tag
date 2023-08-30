const nock = require('nock');
const chai = require('chai');
const Resource = require('models/resource.model');
const Vocabulary = require('models/vocabulary.model');

const { USERS } = require('../utils/test.constants');
const {
    assertOKResponse, createResource, getUUID, mockValidateRequestWithApiKeyAndUserToken, mockValidateRequestWithApiKey
} = require('../utils/helpers');
const { getTestServer } = require('../utils/test-server');

chai.should();

let requester;

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

describe('Get all layer vocabulary', () => {
    beforeEach(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();

        await Resource.deleteMany({}).exec();
        await Vocabulary.deleteMany({}).exec();
    });

    it('Getting vocabulary-layer relationships without any data in the DB should return an empty array', async () => {
        mockValidateRequestWithApiKey({});
        const response = await requester
            .get(`/api/v1/dataset/345/layer/123/vocabulary`)
            .set('x-api-key', 'api-key-test')
            .send();

        assertOKResponse(response);
        response.body.data.should.be.an('array').and.length(0);
    });

    it('Getting vocabulary-layer relationships returns 200 OK with the requested data - single vocabulary', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });
        const resource = await (new Resource(createResource('rw', 1, 'layer', getUUID()))).save();

        const response = await requester
            .get(`/api/v1/dataset/${resource.dataset}/layer/${resource.id}/vocabulary`)
            .set('Authorization', `Bearer abcd`)
            .set('x-api-key', 'api-key-test')
            .send({});

        assertOKResponse(response);
        response.body.data.should.be.an('array').and.length(1);
        const responseVocabulary = response.body.data[0];

        responseVocabulary.id.should.equal(resource.vocabularies[0].id);
        responseVocabulary.attributes.name.should.equal(resource.vocabularies[0].id);
        responseVocabulary.attributes.tags.should.be.an('array').and.have.same.members(resource.vocabularies[0].tags);
    });

    it('Getting vocabulary-layer relationships returns 200 OK with the requested data - multiple vocabulary', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });
        const resource = await (new Resource(createResource('rw', 4, 'layer', getUUID()))).save();

        const response = await requester
            .get(`/api/v1/dataset/${resource.dataset}/layer/${resource.id}/vocabulary`)
            .set('Authorization', `Bearer abcd`)
            .set('x-api-key', 'api-key-test')
            .send({});

        assertOKResponse(response);
        response.body.data.should.be.an('array').and.length(4);
        const responseVocabularies = response.body.data;

        responseVocabularies.forEach((responseVocabulary, index) => {
            responseVocabulary.id.should.equal(resource.vocabularies[index].id);
            responseVocabulary.attributes.name.should.equal(resource.vocabularies[index].id);
            responseVocabulary.attributes.tags.should.be.an('array').and.have.same.members(resource.vocabularies[index].tags);
        });
    });

    afterEach(async () => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }

        await Resource.deleteMany({}).exec();
        await Vocabulary.deleteMany({}).exec();
    });
});
