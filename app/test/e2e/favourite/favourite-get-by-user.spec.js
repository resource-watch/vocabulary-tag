const nock = require('nock');
const chai = require('chai');
const Favourite = require('models/favourite.model');
const { USERS } = require('../utils/test.constants');
const {
    ensureCorrectError,
    mockGetUserFromToken,
    createFavourite,
} = require('../utils/helpers');

const { getTestServer } = require('../utils/test-server');

chai.should();

let requester;

nock.disableNetConnect();
nock.enableNetConnect(process.env.HOST_IP);

describe('Find favourites by user', () => {
    beforeEach(async () => {
        if (process.env.NODE_ENV !== 'test') {
            throw Error(`Running the test suite with NODE_ENV ${process.env.NODE_ENV} may result in permanent data loss. Please use NODE_ENV=test.`);
        }

        requester = await getTestServer();

        await Favourite.deleteMany({}).exec();
    });

    it('Find favourites by userId without authenticated user returns a 401 error', async () => {
        await (new Favourite(createFavourite({ userId: USERS.USER.id }))).save();

        const response = await requester
            .post(`/api/v1/favourite/find-by-user`)
            .send({ userId: USERS.USER.id });

        response.status.should.equal(401);
        ensureCorrectError(response.body, 'Unauthorized');
    });

    it('Find favourites by userId being authenticated without userId in body returns a 400 error', async () => {
        mockGetUserFromToken(USERS.USER);
        await (new Favourite(createFavourite({ userId: USERS.USER.id }))).save();

        const response = await requester
            .post(`/api/v1/favourite/find-by-user`)
            .set('Authorization', `Bearer abcd`)
            .send({});

        response.status.should.equal(400);
        ensureCorrectError(response.body, 'Bad Request');
    });

    it('Find favourite by userId being authenticated and userId in body returns favourite data', async () => {
        mockGetUserFromToken(USERS.USER);
        const favouriteOne = await (new Favourite(createFavourite({ userId: USERS.USER.id }))).save();
        const favouriteTwo = await (new Favourite(createFavourite({ userId: USERS.USER.id, resourceType: 'widget' }))).save();
        const favouriteThree = await (new Favourite(createFavourite({ userId: USERS.USER.id, resourceType: 'layer' }))).save();

        const response = await requester
            .post(`/api/v1/favourite/find-by-user`)
            .set('Authorization', `Bearer abcd`)
            .send({ userId: USERS.USER.id });

        response.status.should.equal(200);
        response.body.should.have.property('data').with.lengthOf(3);

        response.body.data[0].id.should.equal(favouriteOne._id.toString());
        response.body.data[0].attributes.application.should.equal('rw');
        response.body.data[0].attributes.resourceType.should.equal(favouriteOne.resourceType);
        response.body.data[0].attributes.resourceId.should.equal(favouriteOne.resourceId);

        response.body.data[1].id.should.equal(favouriteTwo._id.toString());
        response.body.data[1].attributes.application.should.equal('rw');
        response.body.data[1].attributes.resourceType.should.equal(favouriteTwo.resourceType);
        response.body.data[1].attributes.resourceId.should.equal(favouriteTwo.resourceId);

        response.body.data[2].id.should.equal(favouriteThree._id.toString());
        response.body.data[2].attributes.application.should.equal('rw');
        response.body.data[2].attributes.resourceType.should.equal(favouriteThree.resourceType);
        response.body.data[2].attributes.resourceId.should.equal(favouriteThree.resourceId);
    });

    it('Find favourite by userId without any favourites returns empty list', async () => {
        mockGetUserFromToken(USERS.USER);

        const response = await requester
            .post(`/api/v1/favourite/find-by-user`)
            .set('Authorization', `Bearer abcd`)
            .send({ userId: USERS.USER.id });

        response.status.should.equal(200);
        response.body.should.have.property('data').with.lengthOf(0);
    });

    afterEach(async () => {
        if (!nock.isDone()) {
            throw new Error(`Not all nock interceptors were used: ${nock.pendingMocks()}`);
        }

        await Favourite.deleteMany({}).exec();
    });
});
