const nock = require('nock');
const chai = require('chai');
const Favourite = require('models/favourite.model');
const { USERS } = require('../utils/test.constants');
const {
    ensureCorrectError,
    mockValidateRequestWithApiKeyAndUserToken,
    mockAddFavouriteResourceToGraph,
    getUUID, mockValidateRequestWithApiKey,
} = require('../utils/helpers');

const { getTestServer } = require('../utils/test-server');

chai.should();

let requester;

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

describe('Create favourites', () => {
    beforeEach(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();

        await Favourite.deleteMany({}).exec();
    });

    it('Create a favourite without being authenticated should return a 401 error', async () => {
        mockValidateRequestWithApiKey({});
        const response = await requester
            .post(`/api/v1/collection`)
            .set('x-api-key', 'api-key-test')
            .send();

        response.status.should.equal(401);
        ensureCorrectError(response.body, 'Unauthorized');
    });

    it('Create a favourite for a dataset while being authenticated as a USER and the necessary body fields should return a 200 (happy case)', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });
        const mockDatasetId = getUUID();
        mockAddFavouriteResourceToGraph('dataset', mockDatasetId, USERS.USER);

        const response = await requester
            .post(`/api/v1/favourite`)
            .set('Authorization', `Bearer abcd`)
            .set('x-api-key', 'api-key-test')
            .send({
                application: 'rw',
                resourceType: 'dataset',
                resourceId: mockDatasetId,
            });

        response.status.should.equal(200);
        response.body.data.attributes.application.should.equal('rw');
        response.body.data.attributes.resourceType.should.equal('dataset');
        response.body.data.attributes.resourceId.should.equal(mockDatasetId);
    });

    it('Create a favourite for a layer while being authenticated as a USER and the necessary body fields should return a 200 (happy case)', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });
        const mockLayerId = getUUID();
        mockAddFavouriteResourceToGraph('layer', mockLayerId, USERS.USER);

        const response = await requester
            .post(`/api/v1/favourite`)
            .set('Authorization', `Bearer abcd`)
            .set('x-api-key', 'api-key-test')
            .send({
                application: 'rw',
                resourceType: 'layer',
                resourceId: mockLayerId,
            });

        response.status.should.equal(200);
        response.body.data.attributes.application.should.equal('rw');
        response.body.data.attributes.resourceType.should.equal('layer');
        response.body.data.attributes.resourceId.should.equal(mockLayerId);
    });

    it('Create a favourite for a widget while being authenticated as a USER and the necessary body fields should return a 200 (happy case)', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });
        const mockWidgetId = getUUID();
        mockAddFavouriteResourceToGraph('widget', mockWidgetId, USERS.USER);

        const response = await requester
            .post(`/api/v1/favourite`)
            .set('Authorization', `Bearer abcd`)
            .set('x-api-key', 'api-key-test')
            .send({
                application: 'rw',
                resourceType: 'widget',
                resourceId: mockWidgetId,
            });

        response.status.should.equal(200);
        response.body.data.attributes.application.should.equal('rw');
        response.body.data.attributes.resourceType.should.equal('widget');
        response.body.data.attributes.resourceId.should.equal(mockWidgetId);
    });

    it('Create a favourite with an invalid resourceType should return a 400', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });
        const mockWidgetId = getUUID();

        const response = await requester
            .post(`/api/v1/favourite`)
            .set('Authorization', `Bearer abcd`)
            .set('x-api-key', 'api-key-test')
            .send({
                application: 'rw',
                resourceType: 'potato',
                resourceId: mockWidgetId,
            });

        response.status.should.equal(400);
        ensureCorrectError(response.body, 'Favourite validation failed: resourceType: `potato` is not a valid enum value for path `resourceType`.');
    });

    afterEach(async () => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }

        await Favourite.deleteMany({}).exec();
    });
});
