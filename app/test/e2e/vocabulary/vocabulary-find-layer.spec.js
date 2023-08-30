const nock = require('nock');
const chai = require('chai');
const Resource = require('models/resource.model');
const Vocabulary = require('models/vocabulary.model');

const { assertOKResponse, mockValidateRequestWithApiKeyAndUserToken, mockValidateRequestWithApiKey } = require('../utils/helpers');
const { USERS } = require('../utils/test.constants');

const { getTestServer } = require('../utils/test-server');

chai.should();

let requester;

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

describe('Find layers by vocabulary test suite', () => {
    beforeEach(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();

        await Resource.deleteMany({}).exec();
        await Vocabulary.deleteMany({}).exec();
    });

    it('Finding layer vocabulary without query params or being authenticated should return a 400 "Vocabulary and Tags are required in the queryParams" error', async () => {
        mockValidateRequestWithApiKey({});
        const response = await requester
            .get(`/api/v1/dataset/123/layer/vocabulary/find`)
            .set('x-api-key', 'api-key-test')
            .send();

        response.status.should.equal(400);
        response.body.should.have.property('errors').and.be.an('array');
        response.body.errors[0].should.have.property('detail').and.equal('Vocabulary and Tags are required in the queryParams');
    });

    it('Finding layer vocabulary without query params while being authenticated should return a 400 "Vocabulary and Tags are required in the queryParams" error', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });

        const response = await requester
            .get(`/api/v1/dataset/123/layer/vocabulary/find`)
            .set('Authorization', `Bearer abcd`)
            .set('x-api-key', 'api-key-test')
            .send();

        response.status.should.equal(400);
        response.body.should.have.property('errors').and.be.an('array');
        response.body.errors[0].should.have.property('detail').and.equal('Vocabulary and Tags are required in the queryParams');
    });

    it('Finding layer vocabulary without auth and with a set of query params returns 200 OK and a data array', async () => {
        mockValidateRequestWithApiKey({});
        assertOKResponse(await requester.get(`/api/v1/dataset/123/layer/vocabulary/find?foo=bar`)
            .set('x-api-key', 'api-key-test').send());
    });

    it('Finding layer vocabulary with query params while being authenticated should return a 200 OK and a data array', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });

        assertOKResponse(await requester
            .get(`/api/v1/dataset/123/layer/vocabulary/find?foo=bar`)
            .set('Authorization', `Bearer abcd`)
            .set('x-api-key', 'api-key-test')
            .send());
    });

    afterEach(async () => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }

        await Resource.deleteMany({}).exec();
        await Vocabulary.deleteMany({}).exec();
    });
});
