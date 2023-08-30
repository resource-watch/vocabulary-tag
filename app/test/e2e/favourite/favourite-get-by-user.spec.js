const nock = require('nock');
const chai = require('chai');
const Favourite = require('models/favourite.model');
const { USERS } = require('../utils/test.constants');
const {
    ensureCorrectError,
    mockValidateRequestWithApiKeyAndUserToken,
    createFavourite, mockValidateRequestWithApiKey,
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
        mockValidateRequestWithApiKey({});
        await (new Favourite(createFavourite({ userId: USERS.USER.id }))).save();

        const response = await requester
            .post(`/api/v1/favourite/find-by-user`)
            .set('x-api-key', 'api-key-test')
            .send({ userId: USERS.USER.id });

        response.status.should.equal(401);
        ensureCorrectError(response.body, 'Unauthorized');
    });

    it('Find favourites by userId being authenticated without userId in body returns a 400 error', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });
        await (new Favourite(createFavourite({ userId: USERS.USER.id }))).save();

        const response = await requester
            .post(`/api/v1/favourite/find-by-user`)
            .set('Authorization', `Bearer abcd`)
            .set('x-api-key', 'api-key-test')
            .send({});

        response.status.should.equal(400);
        ensureCorrectError(response.body, 'Bad Request');
    });

    it('Find favourite by userId being authenticated and userId in body returns favourite data', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });
        const favouriteOne = await (new Favourite(createFavourite({ userId: USERS.USER.id }))).save();
        const favouriteTwo = await (new Favourite(createFavourite({
            userId: USERS.USER.id,
            resourceType: 'widget'
        }))).save();
        const favouriteThree = await (new Favourite(createFavourite({
            userId: USERS.USER.id,
            resourceType: 'layer'
        }))).save();

        const response = await requester
            .post(`/api/v1/favourite/find-by-user`)
            .set('Authorization', `Bearer abcd`)
            .set('x-api-key', 'api-key-test')
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

    it('Find favourite by userId being authenticated and userId in body but not app returns favourite data from rw app', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });
        const favouriteOne = await (new Favourite(createFavourite({ userId: USERS.USER.id }))).save();
        const favouriteTwo = await (new Favourite(createFavourite({
            userId: USERS.USER.id,
            resourceType: 'widget'
        }))).save();
        await (new Favourite(createFavourite({
            userId: USERS.USER.id,
            resourceType: 'layer',
            application: 'gfw'
        }))).save();

        const response = await requester
            .post(`/api/v1/favourite/find-by-user`)
            .set('Authorization', `Bearer abcd`)
            .set('x-api-key', 'api-key-test')
            .send({ userId: USERS.USER.id });

        response.status.should.equal(200);
        response.body.should.have.property('data').with.lengthOf(2);

        response.body.data[0].id.should.equal(favouriteOne._id.toString());
        response.body.data[0].attributes.application.should.equal('rw');
        response.body.data[0].attributes.resourceType.should.equal(favouriteOne.resourceType);
        response.body.data[0].attributes.resourceId.should.equal(favouriteOne.resourceId);

        response.body.data[1].id.should.equal(favouriteTwo._id.toString());
        response.body.data[1].attributes.application.should.equal('rw');
        response.body.data[1].attributes.resourceType.should.equal(favouriteTwo.resourceType);
        response.body.data[1].attributes.resourceId.should.equal(favouriteTwo.resourceId);
    });

    it('Find favourite by userId being authenticated and userId in body with app returns favourite data from included app', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });
        await (new Favourite(createFavourite({ userId: USERS.USER.id }))).save();
        await (new Favourite(createFavourite({ userId: USERS.USER.id, resourceType: 'widget' }))).save();
        const gfwFavourite = await (new Favourite(createFavourite({
            userId: USERS.USER.id,
            resourceType: 'layer',
            application: 'gfw'
        }))).save();

        const response = await requester
            .post(`/api/v1/favourite/find-by-user`)
            .set('Authorization', `Bearer abcd`)
            .set('x-api-key', 'api-key-test')
            .send({ userId: USERS.USER.id, application: 'gfw' });

        response.status.should.equal(200);
        response.body.should.have.property('data').with.lengthOf(1);

        response.body.data[0].id.should.equal(gfwFavourite._id.toString());
        response.body.data[0].attributes.application.should.equal('gfw');
        response.body.data[0].attributes.resourceType.should.equal(gfwFavourite.resourceType);
        response.body.data[0].attributes.resourceId.should.equal(gfwFavourite.resourceId);
    });

    it('Find favourite by userId being authenticated and userId and application with all returns favourite data from every app', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });
        const favouriteOne = await (new Favourite(createFavourite({ userId: USERS.USER.id }))).save();
        const favouriteTwo = await (new Favourite(createFavourite({
            userId: USERS.USER.id,
            resourceType: 'widget'
        }))).save();
        const favouriteThree = await (new Favourite(createFavourite({
            userId: USERS.USER.id,
            resourceType: 'layer',
            application: 'gfw'
        }))).save();

        const response = await requester
            .post(`/api/v1/favourite/find-by-user`)
            .set('Authorization', `Bearer abcd`)
            .set('x-api-key', 'api-key-test')
            .send({ userId: USERS.USER.id, application: 'all' });

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
        response.body.data[2].attributes.application.should.equal('gfw');
        response.body.data[2].attributes.resourceType.should.equal(favouriteThree.resourceType);
        response.body.data[2].attributes.resourceId.should.equal(favouriteThree.resourceId);
    });

    it('Find favourite by userId without any favourites returns empty list', async () => {
        mockValidateRequestWithApiKeyAndUserToken({ user: USERS.USER });

        const response = await requester
            .post(`/api/v1/favourite/find-by-user`)
            .set('Authorization', `Bearer abcd`)
            .set('x-api-key', 'api-key-test')
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
