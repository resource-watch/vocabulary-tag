const nock = require('nock');
const chai = require('chai');
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

describe('Delete favourites by user id', () => {
    beforeEach(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();

        await Favourite.deleteMany({}).exec();
    });

    it('Deleting favourites by user while not being authenticated should return a 401', async () => {
        const response = await requester
            .delete(`/api/v1/favourite/by-user/${USERS.USER.id}`);

        response.status.should.equal(401);
        ensureCorrectError(response.body, 'Unauthorized');
    });

    it('Deleting favourites by user while not being logged as an ADMIN or as the same user that is being deleted should return a 403', async () => {
        mockGetUserFromToken(USERS.MANAGER);

        const response = await requester
            .delete(`/api/v1/favourite/by-user/${USERS.USER.id}`)
            .set('Authorization', `Bearer abcd`);

        response.status.should.equal(403);
        ensureCorrectError(response.body, 'Forbidden');
    });

    it('Deleting favourites by user as ADMIN should return 200 and all deleted favourites', async () => {
        mockGetUserFromToken(USERS.ADMIN);
        const favouriteOne = await (new Favourite(createFavourite({ userId: USERS.USER.id, application: 'rw', resourceType: 'layer' }))).save();
        const favouriteTwo = await (new Favourite(createFavourite({ userId: USERS.USER.id, application: 'gfw', resourceType: 'widget' }))).save();
        const favouriteByManager = await (new Favourite(createFavourite({ userId: USERS.MANAGER.id }))).save();
        const favouriteByAdmin = await (new Favourite(createFavourite({ userId: USERS.ADMIN.id }))).save();
        mockDeleteFavouriteResourceFromGraph(favouriteOne.resourceType, favouriteOne.resourceId, favouriteOne._id);
        mockDeleteFavouriteResourceFromGraph(favouriteTwo.resourceType, favouriteTwo.resourceId, favouriteTwo._id);

        const response = await requester
            .delete(`/api/v1/favourite/by-user/${USERS.USER.id}`)
            .set('Authorization', `Bearer abcd`);

        response.status.should.equal(200);
        response.body.data[0].attributes.application.should.equal(favouriteOne.application);
        response.body.data[0].attributes.resourceType.should.equal(favouriteOne.resourceType);
        response.body.data[0].attributes.resourceId.should.equal(favouriteOne.resourceId);
        response.body.data[1].attributes.application.should.equal(favouriteTwo.application);
        response.body.data[1].attributes.resourceType.should.equal(favouriteTwo.resourceType);
        response.body.data[1].attributes.resourceId.should.equal(favouriteTwo.resourceId);

        const findFavouritesByUser = await Favourite.find({ userId: { $eq: USERS.USER.id } }).exec();
        findFavouritesByUser.should.be.an('array').with.lengthOf(0);

        const findAllFavourites = await Favourite.find({}).exec();
        findAllFavourites.should.be.an('array').with.lengthOf(2);

        const favouriteResourceTypes = findAllFavourites.map((favourite) => favourite.resourceType);
        favouriteResourceTypes.should.contain(favouriteByManager.resourceType);
        favouriteResourceTypes.should.contain(favouriteByAdmin.resourceType);
    });

    it('Deleting favourites by user as the user themselves should return 200 and all deleted favourites', async () => {
        mockGetUserFromToken(USERS.USER);
        const favouriteOne = await (new Favourite(createFavourite({ userId: USERS.USER.id, application: 'rw', resourceType: 'layer' }))).save();
        const favouriteTwo = await (new Favourite(createFavourite({ userId: USERS.USER.id, application: 'gfw', resourceType: 'widget' }))).save();
        const favouriteByManager = await (new Favourite(createFavourite({ userId: USERS.MANAGER.id }))).save();
        const favouriteByAdmin = await (new Favourite(createFavourite({ userId: USERS.ADMIN.id }))).save();
        mockDeleteFavouriteResourceFromGraph(favouriteOne.resourceType, favouriteOne.resourceId, favouriteOne._id);
        mockDeleteFavouriteResourceFromGraph(favouriteTwo.resourceType, favouriteTwo.resourceId, favouriteTwo._id);

        const response = await requester
            .delete(`/api/v1/favourite/by-user/${USERS.USER.id}`)
            .set('Authorization', `Bearer abcd`);

        response.status.should.equal(200);
        response.body.data[0].attributes.application.should.equal(favouriteOne.application);
        response.body.data[0].attributes.resourceType.should.equal(favouriteOne.resourceType);
        response.body.data[0].attributes.resourceId.should.equal(favouriteOne.resourceId);
        response.body.data[1].attributes.application.should.equal(favouriteTwo.application);
        response.body.data[1].attributes.resourceType.should.equal(favouriteTwo.resourceType);
        response.body.data[1].attributes.resourceId.should.equal(favouriteTwo.resourceId);

        const findFavouritesByUser = await Favourite.find({ userId: { $eq: USERS.USER.id } }).exec();
        findFavouritesByUser.should.be.an('array').with.lengthOf(0);

        const findAllFavourites = await Favourite.find({}).exec();
        findAllFavourites.should.be.an('array').with.lengthOf(2);

        const favouriteResourceTypes = findAllFavourites.map((favourite) => favourite.resourceType);
        favouriteResourceTypes.should.contain(favouriteByManager.resourceType);
        favouriteResourceTypes.should.contain(favouriteByAdmin.resourceType);
    });

    afterEach(async () => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }

        await Favourite.deleteMany({}).exec();
    });
});
