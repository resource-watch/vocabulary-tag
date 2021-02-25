const nock = require('nock');
const chai = require('chai');
const Resource = require('models/resource.model');
const Vocabulary = require('models/vocabulary.model');

const { assertOKResponse, mockGetUserFromToken } = require('../utils/helpers');
const { USERS } = require('../utils/test.constants');

const { getTestServer } = require('../utils/test-server');

chai.should();

let requester;

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

describe('Find all resources by vocabulary test suite', () => {
    beforeEach(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();

        await Resource.deleteMany({}).exec();
        await Vocabulary.deleteMany({}).exec();
    });

    it('Finding all resources vocabulary without query params or being authenticated should return a 200 OK and a data array', async () => {
        assertOKResponse(await requester
            .get(`/api/v1/vocabulary`)
            .send());
    });

    it('Finding all resources vocabulary without query params while being authenticated should return a 200 OK and a data array', async () => {
        mockGetUserFromToken(USERS.USER);

        assertOKResponse(await requester
            .get(`/api/v1/vocabulary`)
            .set('Authorization', `Bearer abcd`)
            .send());
    });

    it('Finding all resources vocabulary without auth and with a set of query params returns 200 OK and a data array', async () => {
        assertOKResponse(await requester.get(`/api/v1/vocabulary?foo=bar`).send());
    });

    it('Finding all resources vocabulary with query params while being authenticated should return a 200 OK and a data array', async () => {
        mockGetUserFromToken(USERS.USER);

        assertOKResponse(await requester
            .get(`/api/v1/vocabulary?foo=bar`)
            .set('Authorization', `Bearer abcd`)
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
