const nock = require('nock');
const chai = require('chai');
const mongoose = require('mongoose');
const Favourite = require('models/favourite.model');
const {
    ensureCorrectError,
    createFavourite,
    mockValidateRequestWithApiKeyAndUserToken, mockValidateRequestWithApiKey,
} = require('../utils/helpers');
const { USERS } = require('../utils/test.constants');

const { getTestServer } = require('../utils/test-server');

chai.should();

let requester;

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

describe('Find collections by IDs', () => {
    beforeEach(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();

        await Favourite.deleteMany({}).exec();
    });

    it('Find favourite by id without authenticated user returns a 401 error', async () => {
        mockValidateRequestWithApiKey({});
        const favourite = await (new Favourite(createFavourite({ userId: USERS.USER.id }))).save();

        const response = await requester
            .get(`/api/v1/favourite/${favourite.id}`)
            .set('x-api-key', 'api-key-test');

        response.status.should.equal(401);
        ensureCorrectError(response.body, 'Unauthorized');
    });

    it('Find favourite by id being authenticated returns favourite data', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });
        const favourite = await (new Favourite(createFavourite({ userId: USERS.USER.id }))).save();

        const response = await requester
            .get(`/api/v1/favourite/${favourite._id.toString()}`)
            .set('Authorization', `Bearer abcd`)
            .set('x-api-key', 'api-key-test');

        response.status.should.equal(200);
        response.body.data.attributes.application.should.equal(favourite.application);
        response.body.data.attributes.resourceType.should.equal(favourite.resourceType);
        response.body.data.attributes.resourceId.should.equal(favourite.resourceId);
    });

    it('Find favourite by id containing a valid id that does not exist returns a 404', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });
        const fakeFavouriteId = mongoose.Types.ObjectId();

        const response = await requester
            .get(`/api/v1/favourite/${fakeFavouriteId}`)
            .set('Authorization', `Bearer abcd`)
            .set('x-api-key', 'api-key-test');

        response.status.should.equal(404);
        ensureCorrectError(response.body, 'Favourite not found');
    });

    afterEach(async () => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }

        await Favourite.deleteMany({}).exec();
    });
});
