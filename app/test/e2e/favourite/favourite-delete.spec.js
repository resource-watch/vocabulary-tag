const nock = require('nock');
const chai = require('chai');
const mongoose = require('mongoose');
const Favourite = require('models/favourite.model');
const { USERS } = require('../utils/test.constants');
const {
    createFavourite,
    mockGetUserFromToken,
    ensureCorrectError,
    mockDeleteFavouriteResourceFromGraph
} = require('../utils/helpers');

const { getTestServer } = require('../utils/test-server');

chai.should();

let requester;

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

describe('Delete favourites', () => {
    beforeEach(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();

        await Favourite.deleteMany({}).exec();
    });

    it('Deleting a favourite while not being authenticated should return a 401', async () => {
        const favourite = await (new Favourite(createFavourite({ userId: USERS.USER.id }))).save();

        const response = await requester
            .delete(`/api/v1/favourite/${favourite._id}`);

        response.status.should.equal(401);
        ensureCorrectError(response.body, 'Unauthorized');
    });

    it('Deleting a favourite with valid id that does not exists while authenticated should return a 404', async () => {
        mockGetUserFromToken(USERS.USER);
        const fakeUUID = mongoose.Types.ObjectId();

        const response = await requester
            .delete(`/api/v1/favourite/${fakeUUID}`)
            .set('Authorization', `Bearer abcd`);

        response.status.should.equal(404);
        ensureCorrectError(response.body, 'Favourite not found');
    });

    it('Deleting a favourite as USER should return 200 and data from deleted fav', async () => {
        mockGetUserFromToken(USERS.ADMIN);
        const favourite = await (new Favourite(createFavourite({ userId: USERS.USER.id }))).save();
        mockDeleteFavouriteResourceFromGraph(favourite.resourceType, favourite.resourceId, favourite._id);

        const response = await requester
            .delete(`/api/v1/favourite/${favourite._id}`)
            .set('Authorization', `Bearer abcd`);

        response.status.should.equal(200);
        response.body.data.attributes.application.should.equal(favourite.application);
        response.body.data.attributes.resourceType.should.equal(favourite.resourceType);
        response.body.data.attributes.resourceId.should.equal(favourite.resourceId);
    });

    it('Deleting a favourite as ADMIN should return 200 and data from deleted fav', async () => {
        mockGetUserFromToken(USERS.ADMIN);
        const favourite = await (new Favourite(createFavourite({ userId: USERS.USER.id }))).save();
        mockDeleteFavouriteResourceFromGraph(favourite.resourceType, favourite.resourceId, favourite._id);

        const response = await requester
            .delete(`/api/v1/favourite/${favourite._id}`)
            .set('Authorization', `Bearer abcd`);

        response.status.should.equal(200);
        response.body.data.attributes.application.should.equal(favourite.application);
        response.body.data.attributes.resourceType.should.equal(favourite.resourceType);
        response.body.data.attributes.resourceId.should.equal(favourite.resourceId);
    });

    afterEach(async () => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }

        await Favourite.deleteMany({}).exec();
    });
});
