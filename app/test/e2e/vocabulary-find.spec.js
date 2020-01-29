const nock = require('nock');
const chai = require('chai');
const Resource = require('models/resource.model');
const Vocabulary = require('models/vocabulary.model');

const { assertOKResponse } = require('./utils/helpers');

const { getTestServer } = require('./utils/test-server');

chai.should();

let requester;

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

describe('Vocabulary find test suite', () => {
    beforeEach(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();

        await Resource.deleteMany().exec();
        await Vocabulary.deleteMany().exec();
    });

    it('Finding dataset vocabulary without auth returns 200 OK and a data array', async () => {
        assertOKResponse(await requester.get(`/api/v1/dataset/vocabulary/find`).send());
    });

    it('Finding widget vocabulary without auth returns 200 OK and a data array', async () => {
        assertOKResponse(await requester.get(`/api/v1/dataset/123/widget/vocabulary/find`).send());
    });

    it('Finding layer vocabulary without auth returns 200 OK and a data array', async () => {
        assertOKResponse(await requester.get(`/api/v1/dataset/123/layer/vocabulary/find`).send());
    });

    it('Finding all vocabulary without auth returns 200 OK and a data array', async () => {
        assertOKResponse(await requester.get(`/api/v1/vocabulary`).send());
    });

    afterEach(async () => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }

        await Resource.deleteMany().exec();
        await Vocabulary.deleteMany().exec();
    });
});
