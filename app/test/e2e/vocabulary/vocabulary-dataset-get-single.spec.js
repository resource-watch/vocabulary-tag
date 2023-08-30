const nock = require('nock');
const chai = require('chai');
const Resource = require('models/resource.model');
const Vocabulary = require('models/vocabulary.model');

const { USERS } = require('../utils/test.constants');
const { assertOKResponse, createResource, mockValidateRequestWithApiKeyAndUserToken, mockValidateRequestWithApiKey } = require('../utils/helpers');
const { getTestServer } = require('../utils/test-server');

chai.should();

let requester;

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

describe('Get single dataset vocabulary', () => {
    beforeEach(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();

        await Resource.deleteMany({}).exec();
        await Vocabulary.deleteMany({}).exec();
    });

    it('Getting vocabulary-dataset relationships by id without any data in the DB should return an empty array', async () => {
        mockValidateRequestWithApiKey({});
        const response = await requester
            .get(`/api/v1/dataset/123/vocabulary/123`)
            .set('x-api-key', 'api-key-test')
            .send();

        assertOKResponse(response);
        response.body.data.should.be.an('array').and.length(0);
    });

    it('Getting vocabulary-dataset relationships by id returns 200 OK with the requested data', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });
        const resource = await (new Resource(createResource())).save();

        const response = await requester
            .get(`/api/v1/dataset/${resource.dataset}/vocabulary/${resource.vocabularies[0].id}`)
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

    it('Getting vocabulary-dataset relationships by id returns 200 OK with no data if the id does not match an existing vocabulary', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });
        const resource = await (new Resource(createResource())).save();

        const response = await requester
            .get(`/api/v1/dataset/${resource.dataset}/vocabulary/123`)
            .set('Authorization', `Bearer abcd`)
            .set('x-api-key', 'api-key-test')
            .send({});

        assertOKResponse(response);
        response.body.data.should.be.an('array').and.length(0);
    });

    it('Getting vocabulary-dataset relationships by id returns 200 OK with the requested data - multiple vocabulary', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });
        const resource = await (new Resource(createResource('rw', 4))).save();

        const response = await requester
            .get(`/api/v1/dataset/${resource.dataset}/vocabulary/${resource.vocabularies[0].id}`)
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

    afterEach(async () => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }

        await Resource.deleteMany({}).exec();
        await Vocabulary.deleteMany({}).exec();
    });
});
